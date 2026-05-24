/**
 * Bundles Node.js, runner deps, and Playwright Chromium for release builds.
 * Output: src-tauri/binaries/node-*.exe + src-tauri/runtime-payload/
 */
import { execSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tauriDir = join(root, "src-tauri");
const payloadDir = join(tauriDir, "runtime-payload");
const browsersDir = join(payloadDir, "playwright-browsers");
const binariesDir = join(tauriDir, "binaries");
const sidecarPath = join(binariesDir, "node-x86_64-pc-windows-msvc.exe");

function resolveNodeExe() {
  const fromPath = execSync("where node", { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)[0]
    ?.trim();
  if (fromPath && existsSync(fromPath)) {
    return fromPath;
  }
  throw new Error(
    "Node.js не найден. Установите Node.js LTS, затем снова выполните npm run tauri build.",
  );
}

console.log("[prepare-runtime] Preparing bundled runner for Windows release…");

const runnerScript = join(payloadDir, "scripts", "runner.js");
const chromiumDir = join(browsersDir, "chromium-1223");
if (
  existsSync(sidecarPath) &&
  existsSync(runnerScript) &&
  existsSync(chromiumDir)
) {
  console.log("[prepare-runtime] Already prepared — skipping.");
  process.exit(0);
}

const nodeExe = resolveNodeExe();
rmSync(payloadDir, { recursive: true, force: true });
mkdirSync(join(payloadDir, "scripts"), { recursive: true });
mkdirSync(binariesDir, { recursive: true });

copyFileSync(nodeExe, sidecarPath);
cpSync(join(root, "scripts", "runner.js"), join(payloadDir, "scripts", "runner.js"));

writeFileSync(
  join(payloadDir, "package.json"),
  JSON.stringify(
    {
      name: "jarvice-runtime",
      private: true,
      type: "module",
      dependencies: {
        "better-sqlite3": "^11.7.0",
        "csv-parser": "^3.0.0",
        "csv-stringify": "^6.5.2",
        playwright: "^1.49.1",
      },
    },
    null,
    2,
  ),
);

console.log("[prepare-runtime] Installing runner dependencies…");
execSync("npm install --omit=dev --no-audit --no-fund", {
  cwd: payloadDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  },
});

mkdirSync(browsersDir, { recursive: true });
console.log("[prepare-runtime] Downloading Chromium for Playwright…");
execSync("npx playwright install chromium", {
  cwd: payloadDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browsersDir,
  },
});

console.log("[prepare-runtime] Done.");
console.log("  Sidecar:", sidecarPath);
console.log("  Runtime:", payloadDir);
