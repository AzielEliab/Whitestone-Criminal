import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");
const publicDir = path.join(root, "workers", "download-tracker", "public");
const stage = path.join(root, ".package", "whitestone-criminal");
const zipPath = path.join(publicDir, "whitestone-criminal-standalone.zip");
const files = ["index.html", "styles.css", "logic.js", "app.js", "README.md"];

export async function packageRelease() {
  await rm(path.join(root, ".package"), { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  await mkdir(path.join(publicDir, "app"), { recursive: true });
  for (const name of files) {
    await cp(path.join(appDir, name), path.join(stage, name));
    await cp(path.join(appDir, name), path.join(publicDir, "app", name));
  }
  await rm(zipPath, { force: true });
  execFileSync("zip", ["-X", "-r", zipPath, "whitestone-criminal"], {
    cwd: path.join(root, ".package"),
    stdio: "inherit",
  });
  await rm(path.join(root, ".package"), { recursive: true, force: true });
  return zipPath;
}

if (import.meta.url === new URL(process.argv[1], "file:").href || process.argv[1]?.endsWith("package-release.mjs")) {
  const out = await packageRelease();
  console.log(out);
}
