# Whitestone Criminal download tracker

Counts downloads of the zip built from this repository. Forks are identified by GitHub `owner/repo`. The key is `whitestone-criminal|owner|repo|branch|fork`.

Worker name: `whitestone-criminal-download-tracker`

Route a teammate deploys (this repository does not deploy it):

`https://whitestone-criminal-download-tracker.vibelock.workers.dev`

`GET /download` serves `whitestone-criminal-standalone.zip` from Worker assets with HTTP 200. It does not redirect to GitHub. There is no GitHub release asset. `GET /`, `GET /count`, and `GET /stats` do not serve the zip. `GET /count` and `GET /stats` do not increment the counter. `POST /event` lets a fork report a download.

KV binding name: `DOWNLOADS`. Namespace title to create: `WHITESTONE_CRIMINAL_DOWNLOADS`. The id is not in this repo. Create it on deploy and paste it into `wrangler.toml`.

The session pages are the same files as the zip, at `/app/index.html`.

No secrets belong in this directory.

Author: Aziel Eliab.

## Deploy (teammate, after merge)

```bash
cd workers/download-tracker
npx wrangler kv namespace create DOWNLOADS
# uncomment the kv_namespaces block in wrangler.toml and paste the id
npx wrangler deploy
```

## Verify without deploying

From the repository root:

```bash
npm test
```
