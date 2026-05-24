/**
 * Copies portable app folder into d:\JARVICE\release\JARVICE-Portable
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, "..", "release", "JARVICE-Portable");
const buildDir = join(root, "src-tauri", "target", "release");

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

cpSync(
  join(buildDir, "creovix-agent-desktop.exe"),
  join(releaseDir, "JARVICE.exe"),
);

if (existsSync(join(buildDir, "node.exe"))) {
  cpSync(join(buildDir, "node.exe"), join(releaseDir, "node.exe"));
}

if (existsSync(join(buildDir, "runtime"))) {
  cpSync(join(buildDir, "runtime"), join(releaseDir, "runtime"), {
    recursive: true,
  });
}

cpSync(
  join(buildDir, "bundle", "nsis", "J.A.R.V.I.C.E_0.1.0_x64-setup.exe"),
  join(root, "..", "release", "JARVICE-Setup.exe"),
);

const staleRootExe = join(root, "..", "release", "JARVICE.exe");
if (existsSync(staleRootExe)) {
  rmSync(staleRootExe);
}

console.log("[package-release] Portable app:", releaseDir);
