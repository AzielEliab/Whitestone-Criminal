import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function lin(channel) {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function lum(hex) {
  const h = hex.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const left = lum(a);
  const right = lum(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

function block(css, dark) {
  const media = css.split("@media (prefers-color-scheme: dark)")[1] || "";
  const source = dark ? media : css.split("@media (prefers-color-scheme: dark)")[0];
  const pick = (name) => {
    const match = source.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, name);
    return match[1];
  };
  return {
    bg: pick("bg"),
    ink: pick("ink"),
    muted: pick("muted"),
    btnBg: pick("btn-bg"),
    btnInk: pick("btn-ink"),
    focus: pick("focus"),
  };
}

for (const file of ["app/styles.css", "workers/download-tracker/src/home.js"]) {
  test(`WCAG AA contrast in ${file}`, () => {
    const css = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    assert.match(css, /prefers-color-scheme:\s*dark/);
    assert.match(css, /focus-visible|:focus/);
    for (const dark of [false, true]) {
      const tone = block(css, dark);
      assert.ok(contrast(tone.ink, tone.bg) >= 4.5, `ink ${tone.ink} on ${tone.bg}`);
      assert.ok(contrast(tone.muted, tone.bg) >= 4.5, `muted ${tone.muted} on ${tone.bg}`);
      assert.ok(contrast(tone.btnInk, tone.btnBg) >= 4.5, `button ${tone.btnInk} on ${tone.btnBg}`);
      assert.ok(contrast(tone.focus, tone.bg) >= 3, `focus ${tone.focus} on ${tone.bg}`);
    }
  });
}
