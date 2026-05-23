import type { Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { applyTemplate, type CsvRow } from "./template.js";
import type { StepPayload } from "./types.js";
import { emit } from "./types.js";

export async function waitForResume(
  signalsDir: string,
  runId: string,
  timeoutMs = 600_000,
): Promise<"continue" | "stop"> {
  const signalPath = path.join(signalsDir, `${runId}.resume.json`);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(signalPath)) {
      const raw = fs.readFileSync(signalPath, "utf8").replace(/^\uFEFF/, "");
      fs.unlinkSync(signalPath);
      const parsed = JSON.parse(raw.trim()) as { action?: string };
      if (parsed.action === "stop") return "stop";
      return "continue";
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return "stop";
}

export async function executeStep(
  page: Page,
  step: StepPayload,
  row: CsvRow,
  ctx: {
    runId: string;
    rowId: string;
    signalsDir: string;
    screenshotsDir: string;
  },
): Promise<"ok" | "stop"> {
  const config = JSON.parse(step.configJson) as Record<string, unknown>;

  emit({
    event: "log",
    step_name: step.label,
    status: "running",
    message: `Executing ${step.type}`,
  });

  switch (step.type) {
    case "open_url": {
      const url = applyTemplate(String(config.urlTemplate ?? ""), row);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      emit({
        event: "log",
        step_name: step.label,
        status: "done",
        message: `Opened ${url}`,
      });
      return "ok";
    }
    case "fill_field": {
      const selector = String(config.selector ?? "");
      const value = applyTemplate(String(config.valueTemplate ?? ""), row);
      await page.waitForSelector(selector, { timeout: 15000 });
      await page.fill(selector, value);
      emit({
        event: "log",
        step_name: step.label,
        status: "done",
        message: `Filled ${selector}`,
      });
      return "ok";
    }
    case "click": {
      const selector = String(config.selector ?? "");
      const pressKey = config.pressKey ? String(config.pressKey) : "";
      if (pressKey) {
        await page.waitForSelector(selector, { timeout: 15000 });
        await page.press(selector, pressKey);
      } else {
        await page.click(selector);
      }
      emit({
        event: "log",
        step_name: step.label,
        status: "done",
        message: pressKey
          ? `Pressed ${pressKey} on ${selector}`
          : `Clicked ${selector}`,
      });
      return "ok";
    }
    case "wait": {
      const ms = Number(config.milliseconds ?? 1000);
      await page.waitForTimeout(ms);
      emit({
        event: "log",
        step_name: step.label,
        status: "done",
        message: `Waited ${ms}ms`,
      });
      return "ok";
    }
    case "confirm": {
      const message = applyTemplate(
        String(config.messageTemplate ?? "Confirm to continue"),
        row,
      );
      emit({
        event: "confirm",
        step_name: step.label,
        row_id: ctx.rowId,
        message,
      });
      const action = await waitForResume(ctx.signalsDir, ctx.runId);
      if (action === "stop") {
        emit({
          event: "log",
          step_name: step.label,
          status: "error",
          message: "Stopped by user at confirm step",
        });
        return "stop";
      }
      emit({
        event: "log",
        step_name: step.label,
        status: "done",
        message: "User continued",
      });
      return "ok";
    }
    case "write_status": {
      emit({
        event: "log",
        step_name: step.label,
        status: "done",
        message: `Status will be set to ${String(config.status ?? "done")}`,
      });
      return "ok";
    }
    default:
      throw new Error(`Unsupported step type: ${step.type}`);
  }
}

export async function captureErrorScreenshot(
  page: Page,
  screenshotsDir: string,
  runId: string,
  rowId: string,
  stepLabel: string,
): Promise<string> {
  const safe = stepLabel.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40);
  const file = path.join(
    screenshotsDir,
    `${runId}_${rowId}_${safe}_${Date.now()}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
  return file;
}
