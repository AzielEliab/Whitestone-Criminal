import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { packageRelease } from "../../../scripts/package-release.mjs";
import { invariantHolds } from "../src/stats-shape.js";
import {
  DEFAULT_ASSET,
  DEFAULT_OWNER,
  DEFAULT_REPO,
  handle,
  kvKey,
  parseDims,
  PROJECT,
} from "../src/index.js";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const zipPath = await packageRelease();

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

function diskAssets() {
  return {
    async fetch(request) {
      const name = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""));
      if (!name || name.includes("..")) return new Response("no", { status: 404 });
      const file = path.resolve(publicDir, name);
      if (!file.startsWith(publicDir + path.sep) && file !== publicDir) return new Response("no", { status: 404 });
      try {
        const buf = readFileSync(file);
        return new Response(buf, { headers: { "Content-Length": String(buf.length) } });
      } catch {
        return new Response("missing", { status: 404 });
      }
    },
  };
}

function env() {
  return { DOWNLOADS: memoryKv(), ASSETS: diskAssets() };
}

function request(pathname, { method = "GET", headers = {}, body } = {}) {
  return new Request("https://tracker.test" + pathname, {
    method,
    headers: { "User-Agent": "Mozilla/5.0", ...headers },
    body,
  });
}

test("dimensions count forks and branches separately", () => {
  const main = parseDims(new URLSearchParams());
  assert.equal(main.fork, "0");
  assert.equal(kvKey(main), `${PROJECT}|${DEFAULT_OWNER}|${DEFAULT_REPO}|main|0`);
  const branch = parseDims(new URLSearchParams("branch=release"));
  assert.equal(kvKey(branch), `${PROJECT}|${DEFAULT_OWNER}|${DEFAULT_REPO}|release|0`);
  const fork = parseDims(new URLSearchParams("repo=Other/Whitestone-Criminal"));
  assert.equal(fork.fork, "1");
  assert.equal(fork.owner, "Other");
  assert.notEqual(kvKey(fork), kvKey(main));
});

test("download returns the built zip and counts once per GET", async () => {
  const bindings = env();
  const first = await handle(request("/download"), bindings);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("Content-Type"), "application/zip");
  assert.match(first.headers.get("Content-Disposition") || "", /whitestone-criminal-standalone\.zip/);
  const bytes = new Uint8Array(await first.arrayBuffer());
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  const head = await handle(request("/download", { method: "HEAD" }), bindings);
  assert.equal(head.status, 200);
  const missing = await handle(request("/download?asset=other.zip"), bindings);
  assert.equal(missing.status, 404);
  const count = await handle(request("/count"), bindings);
  const body = await count.json();
  assert.equal(body.downloads, 1);
  assert.equal(body.total, 1);
  assert.equal(invariantHolds(body), true);
  const again = await handle(request("/download?branch=dev&repo=Friend/Whitestone-Criminal"), bindings);
  assert.equal(again.status, 200);
  const statsRes = await handle(request("/stats"), bindings);
  const stats = await statsRes.json();
  assert.equal(stats.downloads, 2);
  assert.equal(stats.by_branch.main, 1);
  assert.equal(stats.by_branch.dev, 1);
  assert.equal(stats.by_fork["1"], 1);
  assert.equal(invariantHolds(stats), true);
  const quiet = await handle(request("/count"), bindings);
  const quietBody = await quiet.json();
  assert.equal(quietBody.downloads, 2);
});

test("unbound counter still serves the zip", async () => {
  const response = await handle(request("/download"), { ASSETS: diskAssets() });
  assert.equal(response.status, 200);
  const page = await handle(request("/"), { ASSETS: diskAssets() });
  const html = await page.text();
  assert.match(html, /DOWNLOADS counter/);
  assert.equal(html.includes("THIS IS NOT"), false);
  assert.equal(html.includes("softwareVersion"), false);
});

test("landing is one download step and names the real behavior", async () => {
  const page = await handle(request("/"), env());
  const html = await page.text();
  assert.match(html, /id="download" href="\/download"/);
  assert.match(html, /prefers-color-scheme:\s*dark/);
  assert.match(html, /Session-only memory/);
  assert.match(html, /focus-visible/);
  assert.equal(html.includes("v0."), false);
  assert.equal(html.includes("v1."), false);
});

test("fork event and app pages", async () => {
  const bindings = env();
  const event = await handle(
    request("/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ repo: "ForkOwner/Whitestone-Criminal", branch: "main", fork: "1" }),
    }),
    bindings,
  );
  assert.equal(event.status, 200);
  const stats = await (await handle(request("/stats"), bindings)).json();
  assert.equal(stats.by_repo["ForkOwner/Whitestone-Criminal"], 1);
  const app = await handle(request("/app/index.html"), bindings);
  assert.equal(app.status, 200);
  const html = await app.text();
  assert.match(html, /Wipe notes/);
  const logic = await (await handle(request("/app/logic.js"), bindings)).text();
  assert.match(logic, /https:\/\/www\.uscourts\.gov\//);
  const bad = await handle(request("/event", { method: "POST", body: "nope" }), bindings);
  assert.equal(bad.status, 400);
});

test("curl is counted as a bot and a browser as a human", async () => {
  const bindings = env();
  await handle(request("/download", { headers: { "User-Agent": "curl/8.0" } }), bindings);
  await handle(request("/download"), bindings);
  const body = await (await handle(request("/count"), bindings)).json();
  assert.equal(body.downloads, 2);
  assert.equal(body.downloads_human, 1);
  assert.equal(body.downloads_bot, 1);
  assert.equal(invariantHolds(body), true);
});

test("packaged zip is the app from this repo", () => {
  assert.equal(zipPath.endsWith(DEFAULT_ASSET), true);
  const html = readFileSync(path.join(publicDir, "app", "index.html"), "utf8");
  const logic = readFileSync(path.join(publicDir, "app", "logic.js"), "utf8");
  assert.match(html, /Whitestone Criminal/);
  assert.match(logic, /selfhelp\.courts\.ca\.gov/);
  assert.equal(logic.includes("fetch("), false);
});
