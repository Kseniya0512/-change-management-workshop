import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import type {
  Room,
  Member,
  Invite,
  Comment,
  Snapshot,
} from "../shared/types.ts";
export const secret = () => randomBytes(32).toString("base64url");
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class Store {
  db: DatabaseSync;
  private sequence = Date.now() * 1000;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS invites (token_hash TEXT PRIMARY KEY, token TEXT NOT NULL, room_id TEXT NOT NULL REFERENCES rooms(id), team_id TEXT, role TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), data TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, room_id TEXT NOT NULL REFERENCES rooms(id), team_id TEXT NOT NULL, data TEXT NOT NULL);
   CREATE INDEX IF NOT EXISTS comments_room ON comments(room_id);
   CREATE INDEX IF NOT EXISTS members_room ON members(room_id);`);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  room(id: string): Room | undefined {
    const row = this.db.prepare("SELECT data FROM rooms WHERE id=?").get(id) as
      { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }
  save(room: Room) {
    this.db
      .prepare(
        "INSERT INTO rooms VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(room.id, JSON.stringify(room));
  }
  member(id: string): Member | undefined {
    const row = this.db
      .prepare("SELECT data FROM members WHERE id=?")
      .get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }
  saveMember(roomId: string, m: Member) {
    this.db
      .prepare(
        "INSERT INTO members VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(m.id, roomId, JSON.stringify(m));
  }
  session(token: string) {
    return this.sessionByHash(hash(token));
  }
  sessionByHash(sessionHash: string) {
    return this.db
      .prepare(
        "SELECT s.member_id,m.room_id FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.hash=? AND s.expires>?",
      )
      .get(sessionHash, Date.now()) as
      { member_id: string; room_id: string } | undefined;
  }
  addSession(memberId: string) {
    const token = secret();
    this.db
      .prepare("INSERT INTO sessions VALUES (?,?,?)")
      .run(hash(token), memberId, Date.now() + 7 * 86400000);
    return token;
  }
  invite(roomId: string, teamId: string | null, role: Member["role"]): Invite {
    const token = secret();
    this.db
      .prepare("INSERT INTO invites VALUES (?,?,?,?,?)")
      .run(hash(token), token, roomId, teamId, role);
    return { token, teamId, role };
  }
  resolveInvite(token: string) {
    return this.db
      .prepare("SELECT room_id,team_id,role FROM invites WHERE token_hash=?")
      .get(hash(token)) as
      | { room_id: string; team_id: string | null; role: Member["role"] }
      | undefined;
  }
  snapshot(roomId: string, memberId: string): Snapshot {
    const room = this.room(roomId)!;
    const me = this.member(memberId)!;
    if (room.status === "running")
      room.remainingMs = Math.max(0, (room.endsAt ?? Date.now()) - Date.now());
    const members = (
      this.db
        .prepare("SELECT data FROM members WHERE room_id=?")
        .all(roomId) as { data: string }[]
    ).map((r) => JSON.parse(r.data) as Member);
    const comments = (
      this.db
        .prepare(
          "SELECT data FROM comments WHERE room_id=? ORDER BY rowid DESC LIMIT 500",
        )
        .all(roomId) as { data: string }[]
    )
      .reverse()
      .map((r) => JSON.parse(r.data) as Comment);
    const isHost = me.role === "host";
    return {
      room: {
        ...room,
        teams: room.teams.filter((t) => isHost || t.id === me.teamId),
      },
      me,
      members: members.filter((m) => isHost || m.teamId === me.teamId),
      comments: comments.filter((c) => isHost || c.teamId === me.teamId),
      serverNow: Date.now(),
      sequence: ++this.sequence,
      ...(isHost
        ? {
            invites: this.db
              .prepare(
                "SELECT token,team_id AS teamId,role FROM invites WHERE room_id=?",
              )
              .all(roomId) as unknown as Invite[],
          }
        : {}),
    };
  }
  close() {
    this.db.close();
  }
}
