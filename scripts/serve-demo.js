import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".gif": "image/gif",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/demo/index.html";
  const file = normalize(join(root, rel.replace(/^\//, "")));
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404); res.end("Not found"); return;
  }
  const body = readFileSync(file);
  res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
  res.end(body);
});

server.listen(port, () => {
  console.log(`forcepush-ghost demo: http://127.0.0.1:${port}/`);
});
