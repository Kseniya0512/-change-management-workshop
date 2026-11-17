export type Answer = string | string[];
export type Answers = Record<string, Answer>;
export type Role = "host" | "captain" | "curator" | "participant";
export interface Team {
  id: string;
  name: string;
  answers: Answers;
  versions: Record<string, number>;
  step: number;
  checked: number[];
}
export interface Member {
  id: string;
  name: string;
  role: Role;
  teamId: string | null;
  canEdit: boolean;
}
export interface Comment {
  id: string;
  teamId: string;
  author: string;
  role: Role;
  text: string;
  at: number;
}
export interface Room {
  id: string;
  title: string;
  teams: Team[];
  status: "waiting" | "running" | "paused" | "finished";
  remainingMs: number;
  endsAt: number | null;
  event: boolean;
  createdAt: number;
}
export interface Invite {
  teamId: string | null;
  role: Role;
  token: string;
}
export interface Snapshot {
  room: Room;
  me: Member;
  members: Member[];
  comments: Comment[];
  invites?: Invite[];
  serverNow: number;
  sequence: number;
}
