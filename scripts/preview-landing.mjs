import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "../workers/download-tracker/src/index.js";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../workers/download-tracker/public");
const port = Number(process.env.PORT || 4173);

function memoryKv() {
  const store = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list() {
      return { keys: [...store.keys()].map((name) => ({ name })), list_complete: true };
    },
  };
}

const env = {
  DOWNLOADS: memoryKv(),
  ASSETS: {
    async fetch(request) {
      const name = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""));
      if (!name || name.includes("..")) return new Response("no", { status: 404 });
      const file = path.resolve(publicDir, name);
      if (!file.startsWith(publicDir + path.sep)) return new Response("no", { status: 404 });
      try {
        const buf = readFileSync(file);
        return new Response(buf);
      } catch {
        return new Response("missing", { status: 404 });
      }
    },
  },
};

const server = createServer(async (req, res) => {
  const host = `http://127.0.0.1:${port}`;
  const response = await handle(new Request(host + req.url, { method: req.method, headers: req.headers }), env);
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const buf = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, headers);
  res.end(buf);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`preview http://127.0.0.1:${port}/`);
});
