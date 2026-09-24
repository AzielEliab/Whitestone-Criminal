# Whitestone Criminal

Ephemeral pro se criminal-procedure advisor. Session-only memory; wipe on close. Allowlisted court/public-defender/self-help research. Uploads only, no case exports, no third-party LLM APIs. Educational — not a lawyer, not legal advice.

Author: Aziel Eliab.

## What this copy does

Open `app/index.html` (or the unzipped download) in a browser.

- Pick a starting question. The page points at the court, public-defender, and self-help links in `app/logic.js`.
- Notes stay in that browser tab. Wipe notes clears them. Closing the tab clears them.
- A `.txt`, `.md`, or `.csv` file is shown on the page. It is not uploaded. There is no export.
- The page does not call a language-model API.

The links were checked on 2026-09-24. This copy does not add other sites, and it does not tell you what to file.

## Download tracker

The landing and counted zip live in `workers/download-tracker`. Nothing here is deployed from this repository.

Worker name: `whitestone-criminal-download-tracker`

Route to deploy after merge: `https://whitestone-criminal-download-tracker.vibelock.workers.dev`

`GET /download` returns `whitestone-criminal-standalone.zip` (HTTP 200) and counts that download for the repository, branch, and fork. There is no GitHub Release asset yet.

Build the zip from this repository:

```bash
npm run package
npm test
```

Local landing (does not deploy):

```bash
npm run preview
```

Then open `http://127.0.0.1:4173/`.
