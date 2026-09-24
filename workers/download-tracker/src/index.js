/**
 * Whitestone Criminal download tracker.
 * Isolated counter. Serves the zip built from this repository.
 * Author: Aziel Eliab.
 *
 * GET  /            landing, counts a view
 * GET  /download    zip HTTP 200, counts a download
 * GET  /count       totals, does not count
 * GET  /stats       per owner/repo/branch/fork, does not count
 * POST /event       a fork reports a download
 */

import { classifyRequest, readBotManagement } from "./classify.js";
import { isolatedKeys, isReservedCounterKey, shapeCountBody } from "./stats-shape.js";
import { HOST, renderHome } from "./home.js";

export const PROJECT = "whitestone-criminal";
export const DEFAULT_ASSET = "whitestone-criminal-standalone.zip";
export const DEFAULT_OWNER = "AzielEliab";
export const DEFAULT_REPO = "Whitestone-Criminal";
export const DEFAULT_BRANCH = "main";
export const GITHUB_REPO = "https://github.com/AzielEliab/Whitestone-Criminal";

const KEYS = isolatedKeys(PROJECT);
const TOKEN = /^[A-Za-z0-9._-]{1,80}$/;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, User-Agent",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(),
    },
  });
}

function text(body, contentType, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(),
    },
  });
}

function cleanToken(value, fallback) {
  const token = String(value ?? "").trim();
  return TOKEN.test(token) ? token : fallback;
}

function splitOwnerRepo(value) {
  if (typeof value !== "string" || !value.includes("/")) return null;
  const [owner, repo] = value.split("/").filter(Boolean);
  if (!owner || !repo || value.split("/").length !== 2) return null;
  if (!TOKEN.test(owner) || !TOKEN.test(repo)) return null;
  return { owner, repo };
}

export function parseDims(src) {
  const get = (key) => {
    if (src == null) return null;
    if (typeof src.get === "function") {
      const value = src.get(key);
      return value == null || value === "" ? null : value;
    }
    const value = src[key];
    return value == null || value === "" ? null : value;
  };

  let owner = cleanToken(get("owner"), DEFAULT_OWNER);
  let repo = cleanToken(get("repo"), DEFAULT_REPO);
  const combined = splitOwnerRepo(get("repo"));
  if (combined) {
    owner = combined.owner;
    repo = combined.repo;
  }

  const branch = cleanToken(get("branch"), DEFAULT_BRANCH);
  const assetRaw = get("asset");
  const asset = assetRaw == null || assetRaw === "" || assetRaw === DEFAULT_ASSET ? DEFAULT_ASSET : "";

  const forkRaw = get("fork");
  let fork = "0";
  if (forkRaw === 1 || forkRaw === true || forkRaw === "1" || forkRaw === "true") {
    fork = "1";
  } else if (typeof forkRaw === "string" && forkRaw.includes("/")) {
    const split = splitOwnerRepo(forkRaw);
    if (split) {
      owner = split.owner;
      repo = split.repo;
      fork = "1";
    }
  } else if (forkRaw != null && forkRaw !== 0 && forkRaw !== false && forkRaw !== "0" && forkRaw !== "false") {
    fork = "1";
  }

  if (`${owner}/${repo}`.toLowerCase() !== `${DEFAULT_OWNER}/${DEFAULT_REPO}`.toLowerCase()) {
    fork = "1";
  }

  return { project: PROJECT, owner, repo, branch, fork, asset };
}

export function kvKey(dims) {
  return `${dims.project}|${dims.owner}|${dims.repo}|${dims.branch}|${dims.fork}`;
}

function hasKv(env) {
  return !!(env && env.DOWNLOADS && typeof env.DOWNLOADS.get === "function");
}

async function bump(env, key) {
  if (!hasKv(env)) return 0;
  const current = parseInt((await env.DOWNLOADS.get(key)) || "0", 10);
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await env.DOWNLOADS.put(key, String(next));
  return next;
}

async function readCount(env, key) {
  if (!hasKv(env)) return 0;
  const n = parseInt((await env.DOWNLOADS.get(key)) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function incrementDownload(env, dims, request) {
  await bump(env, kvKey(dims));
  const total = await bump(env, KEYS.total);
  const cls = classifyRequest(request);
  const splitKey = cls.bucket === "human" ? KEYS.downloads_human : KEYS.downloads_bot;
  await bump(env, splitKey);
  return total;
}

async function incrementViews(env, request) {
  const views = await bump(env, KEYS.views);
  const cls = classifyRequest(request);
  const splitKey = cls.bucket === "human" ? KEYS.views_human : KEYS.views_bot;
  await bump(env, splitKey);
  return views;
}

async function listKeys(env) {
  if (!hasKv(env) || typeof env.DOWNLOADS.list !== "function") return [];
  const keys = [];
  let cursor;
  do {
    const page = await env.DOWNLOADS.list(cursor ? { cursor } : {});
    keys.push(...(page.keys || []));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

export async function collectStats(env, request) {
  const keys = await listKeys(env);
  let summed = 0;
  const by_repo = {};
  const by_branch = {};
  const by_fork = { "0": 0, "1": 0 };
  const breakdown = [];

  for (const entry of keys) {
    const name = entry.name;
    if (isReservedCounterKey(name, PROJECT)) continue;
    const n = await readCount(env, name);
    if (n <= 0) continue;
    const parts = name.split("|");
    if (parts.length < 5 || parts[0] !== PROJECT) continue;
    const [, owner, repo, branch, fork] = parts;
    summed += n;
    const repoId = `${owner}/${repo}`;
    by_repo[repoId] = (by_repo[repoId] || 0) + n;
    by_branch[branch] = (by_branch[branch] || 0) + n;
    const forkFlag = fork === "1" ? "1" : "0";
    by_fork[forkFlag] = (by_fork[forkFlag] || 0) + n;
    breakdown.push({ project: PROJECT, owner, repo, branch, fork: forkFlag, count: n });
  }

  const totalDirect = await readCount(env, KEYS.total);
  const downloads = totalDirect > 0 ? totalDirect : summed;
  const views = await readCount(env, KEYS.views);
  const viewsHuman = await readCount(env, KEYS.views_human);
  const downloadsHuman = await readCount(env, KEYS.downloads_human);
  const botManagementAvailable = readBotManagement(request).available;
  return {
    ...shapeCountBody({
      project: PROJECT,
      views,
      downloads,
      total: downloads,
      views_human: viewsHuman,
      downloads_human: downloadsHuman,
      botManagementAvailable,
    }),
    by_repo,
    by_branch,
    by_fork,
    breakdown,
    counter: hasKv(env) ? "bound" : "unbound",
    note: "Forks identified by GitHub owner/repo. Key layout: project|owner|repo|branch|fork",
  };
}

async function assetResponse(env, request, name) {
  if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== "function") return null;
  const url = new URL("/" + name, request.url);
  const response = await env.ASSETS.fetch(new Request(url, { method: "GET" }));
  if (!response || !response.ok) return null;
  return response;
}

async function serveDownload(request, env, { head = false } = {}) {
  const asset = await assetResponse(env, request, DEFAULT_ASSET);
  if (!asset) {
    return json({ error: "asset not hosted", asset: DEFAULT_ASSET }, 404);
  }
  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", `attachment; filename="${DEFAULT_ASSET}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  const len = asset.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  if (head) return new Response(null, { status: 200, headers });
  return new Response(asset.body, { status: 200, headers });
}

function installScript() {
  return `#!/usr/bin/env bash
# Whitestone Criminal — counted zip from this Worker. Author: Aziel Eliab.
set -euo pipefail
HOST="${HOST}"
ASSET="${DEFAULT_ASSET}"
WORKDIR="\${WHITESTONE_CRIMINAL_HOME:-\$HOME/whitestone-criminal}"
mkdir -p "\$WORKDIR"
cd "\$WORKDIR"
curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"
unzip -o "\${ASSET}"
echo "Unzipped. Open index.html in whitestone-criminal/."
echo "Author: Aziel Eliab."
`;
}

function citeBody() {
  return {
    name: "Whitestone Criminal",
    author: "Aziel Eliab",
    license: "Apache-2.0",
    repository: GITHUB_REPO,
    download: `${HOST}/download`,
    description:
      "Ephemeral pro se criminal-procedure advisor. Session-only memory; wipe on close. Allowlisted court, public-defender, and self-help research. Educational.",
    note: "This repository does not publish a release version number.",
  };
}

function openapi(origin) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Whitestone Criminal download tracker",
      summary: "Counted download of the Whitestone Criminal zip and the session pages.",
      version: "unversioned",
      license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
      contact: { name: "Aziel Eliab", url: GITHUB_REPO },
    },
    servers: [{ url: origin }],
    paths: {
      "/": { get: { summary: "Landing page", responses: { "200": { description: "HTML" } } } },
      "/download": {
        get: {
          summary: "Counted zip download",
          parameters: [
            { name: "repo", in: "query", schema: { type: "string" } },
            { name: "branch", in: "query", schema: { type: "string" } },
            { name: "fork", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "application/zip" } },
        },
      },
      "/count": { get: { summary: "Totals. Does not increment.", responses: { "200": { description: "JSON" } } } },
      "/stats": { get: { summary: "Per repository, branch, and fork. Does not increment.", responses: { "200": { description: "JSON" } } } },
      "/event": { post: { summary: "Record a download from a fork.", responses: { "200": { description: "JSON" } } } },
      "/app/index.html": { get: { summary: "Session pages in the browser.", responses: { "200": { description: "HTML" } } } },
    },
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (path === "/" && request.method === "GET") {
    await incrementViews(env, request);
    const stats = await collectStats(env, request);
    const preview = await assetResponse(env, request, "preview.png");
    const html = renderHome({
      downloads: stats.downloads,
      breakdown: stats.breakdown,
      counterBound: stats.counter === "bound",
      hasPreview: !!preview,
    });
    return text(html, "text/html; charset=utf-8");
  }

  if ((path === "/download" || path === "/download/") && (request.method === "GET" || request.method === "HEAD")) {
    const dims = parseDims(url.searchParams);
    if (url.searchParams.get("asset") && url.searchParams.get("asset") !== DEFAULT_ASSET) {
      return json({ error: "unknown asset", asset: DEFAULT_ASSET }, 404);
    }
    const file = await serveDownload(request, env, { head: request.method === "HEAD" });
    if (file.status === 200 && request.method === "GET") {
      await incrementDownload(env, dims, request);
    }
    return file;
  }

  if (path === "/count" && request.method === "GET") {
    const stats = await collectStats(env, request);
    const count = { ...stats };
    for (const key of ["by_repo", "by_branch", "by_fork", "breakdown", "counter", "note"]) delete count[key];
    return json(count);
  }

  if (path === "/stats" && request.method === "GET") {
    return json(await collectStats(env, request));
  }

  if (path === "/event" && request.method === "POST") {
    const body = await readJson(request);
    if (!body || typeof body !== "object") return json({ error: "JSON body required" }, 400);
    const dims = parseDims(body);
    const total = await incrementDownload(env, dims, request);
    return json({ ok: true, total, ...dims });
  }

  if (path === "/install.sh" && request.method === "GET") {
    return text(installScript(), "text/x-shellscript; charset=utf-8");
  }

  if (path === "/cite.json" && request.method === "GET") return json(citeBody());
  if (path === "/openapi.json" && request.method === "GET") return json(openapi(url.origin));

  if (path === "/robots.txt" && request.method === "GET") {
    return text(`User-agent: *\nAllow: /\n`, "text/plain; charset=utf-8");
  }

  if (path === "/sitemap.xml" && request.method === "GET") {
    return text(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${HOST}/</loc></url>\n  <url><loc>${HOST}/app/index.html</loc></url>\n</urlset>\n`,
      "application/xml; charset=utf-8",
    );
  }

  if (path === "/llms.txt" && request.method === "GET") {
    return text(
      `# Whitestone Criminal\nAuthor: Aziel Eliab\nEducational session notes and allowlisted court, public-defender, and self-help links.\nDownload: ${HOST}/download\nPages: ${HOST}/ and ${HOST}/app/index.html\nCounts: ${HOST}/count and ${HOST}/stats\n`,
      "text/plain; charset=utf-8",
    );
  }

  if ((path === "/app" || path === "/app/") && request.method === "GET") {
    return new Response(null, { status: 302, headers: { Location: "/app/index.html", ...corsHeaders() } });
  }

  if (
    (path.startsWith("/app/") || path === "/preview.png" || path === "/favicon.svg") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    const name = path.slice(1);
    if (name.includes("..")) return json({ error: "not found" }, 404);
    const asset = await assetResponse(env, request, name);
    if (!asset) return json({ error: "not found", path }, 404);
    const headers = new Headers(asset.headers);
    for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
    if (!headers.get("Content-Type")) {
      if (name.endsWith(".html")) headers.set("Content-Type", "text/html; charset=utf-8");
      else if (name.endsWith(".js")) headers.set("Content-Type", "text/javascript; charset=utf-8");
      else if (name.endsWith(".css")) headers.set("Content-Type", "text/css; charset=utf-8");
      else if (name.endsWith(".svg")) headers.set("Content-Type", "image/svg+xml");
      else if (name.endsWith(".png")) headers.set("Content-Type", "image/png");
    }
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(asset.body, { status: 200, headers });
  }

  return json({ error: "not found", path }, 404);
}

export default {
  fetch(request, env) {
    return handle(request, env);
  },
};
