import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
const context = {};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);
const api = context.WhitestoneCriminal;

test("allowlist is https court, defender, and self-help links only", () => {
  assert.ok(api.LINKS.length >= 8);
  for (const link of api.LINKS) {
    assert.equal(link.href.startsWith("https://"), true, link.href);
    assert.equal(api.isAllowlisted(link.href), true);
    assert.equal(link.href.includes("?"), false);
  }
  assert.equal(api.isAllowlisted("https://example.com/"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("XMLHttpRequest"), false);
});

test("every route points at allowlisted links", () => {
  for (const route of api.ROUTES) {
    const links = api.linksForRoute(route.id);
    assert.ok(links.length > 0, route.id);
    for (const link of links) assert.equal(api.isAllowlisted(link.href), true);
  }
});

test("wipe clears notes and returns the first question", () => {
  const noted = api.withNote(api.selectRoute(api.emptySession(), "rules"), "case 12");
  const cleared = api.wipe(noted);
  assert.equal(cleared.note, "");
  assert.equal(cleared.routeId, "lawyer");
  assert.equal(cleared.upload, null);
});

test("notes are capped and a binary file is refused", () => {
  const long = api.withNote(api.emptySession(), "a".repeat(9000));
  assert.equal(long.note.length, api.NOTE_LIMIT);
  const refused = api.readUpload({ name: "scan.pdf", type: "application/pdf", size: 20, text: "nope" });
  assert.equal(refused.ok, false);
  const huge = api.readUpload({ name: "notes.txt", type: "text/plain", size: api.UPLOAD_BYTES + 1, text: "" });
  assert.equal(huge.ok, false);
  const ok = api.readUpload({ name: "notes.txt", type: "text/plain", size: 5, text: "hello" });
  assert.equal(ok.ok, true);
  assert.equal(ok.upload.text, "hello");
  assert.match(ok.upload.message, /not uploaded/);
});

test("normalize drops a tampered route", () => {
  const session = api.normalizeSession({ note: "x", routeId: "https://evil.test", upload: { name: "a.txt", text: "hi" } });
  assert.equal(session.routeId, "lawyer");
  assert.equal(session.upload.text, "hi");
});
