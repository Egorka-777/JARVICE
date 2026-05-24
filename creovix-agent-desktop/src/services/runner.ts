import { invoke } from "@tauri-apps/api/core";
import { Command, type Child } from "@tauri-apps/plugin-shell";
import { getStepsByScenarioId } from "../../database/db";
import { requestConfirmation } from "./confirmationBridge";
import { validateDangerousSteps } from "../utils/security";

interface AppPaths {
  projectRoot: string;
  dbPath: string;
  screenshotsDir: string;
  runnerScript: string;
  playwrightBrowsersPath: string;
  bundledRuntime: boolean;
}

interface RunnerMessage {
  type: string;
  message?: string;
  stepName?: string;
  status?: string;
  screenshotPath?: string | null;
  rowId?: string;
}

let activeChild: Child | null = null;
let stdoutBuffer = "";

function handleRunnerLine(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg: RunnerMessage;
  try {
    msg = JSON.parse(trimmed) as RunnerMessage;
  } catch {
    console.warn("[runner] non-json:", trimmed);
    return;
  }

  if (msg.type === "confirm" && msg.message) {
    void (async () => {
      try {
        const action = await requestConfirmation(msg.message!);
        if (activeChild) {
          await activeChild.write(`${action}\n`);
        }
      } catch (e) {
        console.error("[runner] confirmation failed", e);
        if (activeChild) {
          await activeChild.write("stop\n");
        }
      }
    })();
  }

  if (msg.type === "finished") {
    activeChild = null;
    stdoutBuffer = "";
  }
}

function appendStdout(chunk: string): void {
  stdoutBuffer += chunk;
  const lines = stdoutBuffer.split("\n");
  stdoutBuffer = lines.pop() ?? "";
  for (const line of lines) {
    handleRunnerLine(line);
  }
}

export function isRunnerActive(): boolean {
  return activeChild !== null;
}

export async function startRun(scenarioId: number): Promise<void> {
  if (activeChild) {
    throw new Error("Другой сценарий уже выполняется. Дождитесь завершения.");
  }

  const steps = await getStepsByScenarioId(scenarioId);
  const validationErrors = validateDangerousSteps(steps);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("\n"));
  }

  const paths = await invoke<AppPaths>("get_app_paths");

  if (!paths.runnerScript) {
    throw new Error("Runner script path is empty");
  }

  const spawnEnv: Record<string, string> = {
    CREOVIX_DB_PATH: paths.dbPath,
    CREOVIX_SCREENSHOTS_DIR: paths.screenshotsDir,
  };
  if (paths.playwrightBrowsersPath) {
    spawnEnv.PLAYWRIGHT_BROWSERS_PATH = paths.playwrightBrowsersPath;
  }

  const command = paths.bundledRuntime
    ? Command.sidecar("binaries/node", [paths.runnerScript, scenarioId.toString()], {
        cwd: paths.projectRoot,
        env: spawnEnv,
      })
    : Command.create("node-runner", [paths.runnerScript, scenarioId.toString()], {
        cwd: paths.projectRoot,
        env: spawnEnv,
      });

  command.stdout.on("data", (line) => {
    appendStdout(String(line));
  });

  command.stderr.on("data", (line) => {
    console.error("[runner stderr]", line);
  });

  command.on("close", () => {
    activeChild = null;
    stdoutBuffer = "";
  });

  activeChild = await command.spawn();
}

export async function sendRunnerCommand(
  action: "continue" | "stop",
): Promise<void> {
  if (!activeChild) {
    throw new Error("Runner is not active");
  }
  await activeChild.write(`${action}\n`);
}
