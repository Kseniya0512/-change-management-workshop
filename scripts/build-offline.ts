import { build } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
await build({ configFile: resolve("vite.offline.config.ts") });
let html = await readFile("dist-offline/offline.html", "utf8");
for (const match of [
  ...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g),
]) {
  const js = await readFile(resolve("dist-offline", match[1]), "utf8");
  html = html.replace(
    match[0],
    () =>
      `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
for (const match of [
  ...html.matchAll(
    /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g,
  ),
]) {
  const css = await readFile(resolve("dist-offline", match[1]), "utf8");
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
if (/<(?:script|link)\b[^>]*(?:src|href)="(?:\.\/)?assets\//.test(html))
  throw new Error("Сборка содержит внешние ресурсы");
await mkdir("docs", { recursive: true });
await writeFile("docs/index.html", html);
await writeFile("docs/.nojekyll", "");
console.log(
  `Автономная игра: docs/index.html (${Math.round(Buffer.byteLength(html) / 1024)} КБ). Один файл, без API/CDN.`,
);
