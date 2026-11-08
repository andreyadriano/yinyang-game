// Builds the folder the Worker serves as the game's website (dist/): the page, its stylesheet, the
// game code (src/) and the game files (assets/). Nothing else is copied: no tests, no server code,
// no node_modules. Run it with `npm run build:site` (the deploy and dev scripts do it for you).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Workers Free limits for static assets: 20,000 files per version, 25 MiB per file.
export const MAX_FILES = 20_000;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const INCLUDED = ["index.html", "main.css", "src", "assets"];
const IGNORED = new Set([".DS_Store", "Thumbs.db"]);

export function buildSite({ root = resolve(fileURLToPath(import.meta.url), "../.."), out = "dist" } = {}) {
  const dist = join(root, out);
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  for (const name of INCLUDED) {
    const from = join(root, name);
    if (!existsSync(from)) throw new Error(`Missing ${name}: is this the project folder?`);
    cpSync(from, join(dist, name), { recursive: true, filter: (path) => !IGNORED.has(path.split("/").pop()) });
  }

  const files = listFiles(dist);
  const tooBig = files.filter(({ size }) => size > MAX_FILE_BYTES);
  if (tooBig.length) throw new Error(`Files over 25 MiB (the Workers limit): ${tooBig.map((f) => f.path).join(", ")}`);
  if (files.length > MAX_FILES) throw new Error(`${files.length} files: over the limit of ${MAX_FILES}`);

  return { dist, files: files.length, bytes: files.reduce((sum, { size }) => sum + size, 0) };
}

function listFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path, base) : [{ path: relative(base, path), size: statSync(path).size }];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { dist, files, bytes } = buildSite();
  console.log(`Site built in ${dist}: ${files} files, ${(bytes / 1048576).toFixed(1)} MiB`);
}
