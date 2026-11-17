import { resolve } from "node:path";
import express from "express";
import { createApp } from "./app.ts";
const { app, close } = await createApp({
  dbPath: process.env.DATABASE_PATH ?? resolve("data/workshop.db"),
});
if (process.env.NODE_ENV === "production") {
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    next();
  });
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0", () =>
  console.log(`Воркшоп запущен на порту ${process.env.PORT ?? 3000}`),
);
for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => {
    server.closeAllConnections();
    server.close(async () => {
      await close();
      process.exit(0);
    });
  });
