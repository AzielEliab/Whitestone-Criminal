/**
 * Landing page for Whitestone Criminal.
 * One primary Download. Counts are filled by the caller.
 * Author: Aziel Eliab.
 */

export const HOST = "https://whitestone-criminal-download-tracker.vibelock.workers.dev";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderHome({ downloads, breakdown, counterBound, hasPreview }) {
  const countLine = counterBound
    ? `Downloads counted: ${Number(downloads) || 0}`
    : "Download count is attached when this Worker is deployed with its DOWNLOADS counter.";
  const rows = (breakdown || [])
    .map(
      (row) =>
        `<li><code>${escapeHtml(row.owner)}/${escapeHtml(row.repo)}</code> branch <code>${escapeHtml(row.branch)}</code> fork=${escapeHtml(row.fork)} → ${Number(row.count) || 0}</li>`,
    )
    .join("");
  const breakdownHtml = rows || "<li>No counted downloads yet.</li>";
  const preview = hasPreview
    ? `<section aria-labelledby="preview-heading">
      <h2 id="preview-heading">Preview</h2>
      <img src="/preview.png" alt="Top of the Whitestone Criminal session page: a starting question, notes, and Wipe notes.">
    </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Whitestone Criminal</title>
  <meta name="description" content="Ephemeral pro se criminal-procedure advisor. Session-only memory; wipe on close. Allowlisted court, public-defender, and self-help research. Educational.">
  <meta name="author" content="Aziel Eliab">
  <link rel="canonical" href="${HOST}/">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f3ec;
      --ink: #1c1914;
      --muted: #4a453c;
      --btn-bg: #1e3a2f;
      --btn-ink: #f7f4ec;
      --line: #d9d2c5;
      --panel: #fffdf8;
      --focus: #0b57d0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: dark;
        --bg: #141311;
        --ink: #f4efe6;
        --muted: #d2c7b6;
        --btn-bg: #e6d3a1;
        --btn-ink: #1c1914;
        --line: #3a342c;
        --panel: #1c1b18;
        --focus: #9ec1ff;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--ink);
      font: 16px/1.5 system-ui, "Segoe UI", sans-serif;
    }
    a { color: var(--ink); }
    .skip {
      position: absolute;
      left: 0.75rem;
      top: 0.75rem;
      transform: translateY(-150%);
      background: var(--btn-bg);
      color: var(--btn-ink);
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
    }
    .skip:focus { transform: none; }
    .wrap { max-width: 52rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
    .hero h1 {
      font-size: clamp(2rem, 6vw, 3.25rem);
      line-height: 1.08;
      letter-spacing: -0.03em;
      margin: 0.15rem 0 0.6rem;
    }
    .kicker {
      margin: 0;
      color: var(--muted);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .lede { font-size: 1.15rem; margin: 0 0 1.1rem; max-width: 38rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      min-width: 12rem;
      padding: 0.85rem 1.5rem;
      border-radius: 999px;
      background: var(--btn-bg);
      color: var(--btn-ink);
      text-decoration: none;
      font-weight: 700;
      font-size: 1.125rem;
    }
    .count, .quiet, .feature, footer { color: var(--muted); }
    .count { margin: 0.75rem 0 0; }
    .same { margin: 0.35rem 0 0; }
    section {
      margin-top: 1.5rem;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 1rem 1rem 1.1rem;
    }
    h2 { font-size: 1.1rem; margin: 0 0 0.6rem; }
    ul { margin: 0; padding-left: 1.15rem; }
    li { margin: 0.35rem 0; }
    img {
      width: 100%;
      height: auto;
      max-height: 32rem;
      object-fit: cover;
      object-position: top;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--bg);
    }
    .open { margin: 0.8rem 0 0; }
    footer { margin-top: 1.25rem; font-size: 0.92rem; }
    a:focus-visible, .btn:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 3px;
    }
    @media (max-width: 640px) {
      .btn { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      * { scroll-behavior: auto; }
    }
  </style>
</head>
<body>
  <a class="skip" href="#download">Skip to download</a>
  <div class="wrap">
    <header class="hero">
      <p class="kicker">Aziel Eliab</p>
      <h1>Whitestone Criminal</h1>
      <p class="lede">Ephemeral pro se criminal-procedure advisor. Session-only memory; wipe on close.</p>
      <a class="btn" id="download" href="/download">Download</a>
      <p class="count">${escapeHtml(countLine)}</p>
      <p class="same">One zip for Linux, macOS, and Windows. Unzip it and open index.html.</p>
      <p class="open"><a href="/app/index.html">Open the same pages in this browser</a></p>
    </header>
    <section aria-labelledby="features-heading">
      <h2 id="features-heading">In this copy</h2>
      <ul>
        <li>Notes stay in the browser tab and clear when you wipe them or close the tab.</li>
        <li>Research links are the court, public-defender, and self-help pages shipped in the allowlist.</li>
        <li>A .txt, .md, or .csv file you choose is shown on the page. It is not uploaded and there is no export.</li>
        <li>No third-party language-model API.</li>
      </ul>
    </section>
    ${preview}
    <section aria-labelledby="counted-heading">
      <h2 id="counted-heading">Counted by repository</h2>
      <ul>${breakdownHtml}</ul>
      <p class="quiet">Each download is counted for the GitHub owner, repository, branch, and fork flag. Forks that use this download link are counted on their own row.</p>
    </section>
    <footer>
      <p>Aziel Eliab · <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache-2.0</a> · <a href="https://github.com/AzielEliab/Whitestone-Criminal">GitHub</a></p>
    </footer>
  </div>
</body>
</html>`;
}
