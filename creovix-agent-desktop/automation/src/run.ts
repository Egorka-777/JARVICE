import fs from "node:fs";
import readline from "node:readline";
import { chromium } from "playwright";
import {
  pendingRows,
  readCsv,
  updateRow,
  writeCsv,
} from "./csv.js";
import { validateSteps } from "./security.js";
import { captureErrorScreenshot, executeStep } from "./steps.js";
import type { RunPayload } from "./types.js";
import { emit } from "./types.js";

async function readPayload(): Promise<RunPayload> {
  const rl = readline.createInterface({ input: process.stdin });
  const lines: string[] = [];
  for await (const line of rl) {
    if (line.trim()) lines.push(line);
  }
  if (lines.length === 0) {
    throw new Error("No payload received on stdin");
  }
  return JSON.parse(lines.join("")) as RunPayload;
}

async function main(): Promise<void> {
  const payload = await readPayload();
  const errors = validateSteps(payload.steps);
  if (errors.length > 0) {
    emit({
      event: "finished",
      final_status: "error",
      message: errors.join("; "),
    });
    process.exit(1);
  }

  if (!fs.existsSync(payload.dataFilePath)) {
    emit({
      event: "finished",
      final_status: "error",
      message: `CSV not found: ${payload.dataFilePath}`,
    });
    process.exit(1);
  }

  const { headers, rows } = readCsv(payload.dataFilePath);
  const queue = pendingRows(rows);
  const sortedSteps = [...payload.steps].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  emit({
    event: "log",
    step_name: "Runner",
    status: "running",
    message: `Pending rows: ${queue.length}`,
  });

  let finalStatus = "done";
  let workingRows = [...rows];

  for (const row of queue) {
    const rowId = row.ID;
    emit({
      event: "log",
      step_name: "Row",
      status: "running",
      message: `Processing row ${rowId}`,
    });

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    let rowStatus = "done";
    let rowComment = "";

    try {
      for (const step of sortedSteps) {
        if (step.type === "write_status") {
          continue;
        }
        const result = await executeStep(page, step, row, {
          runId: payload.runId,
          rowId,
          signalsDir: payload.signalsDir,
          screenshotsDir: payload.screenshotsDir,
        });
        if (result === "stop") {
          rowStatus = "skipped";
          rowComment = "Stopped by user at confirm";
          break;
        }
      }

      if (rowStatus === "done") {
        const writeStep = sortedSteps.find((s) => s.type === "write_status");
        const statusValue = writeStep
          ? String(
              (JSON.parse(writeStep.configJson) as { status?: string }).status ??
                "done",
            )
          : "done";
        workingRows = updateRow(workingRows, rowId, {
          Status: statusValue,
          Comment: rowComment,
        });
        emit({
          event: "log",
          step_name: "write_status",
          status: "done",
          message: `Row ${rowId} -> ${statusValue}`,
        });
      } else {
        workingRows = updateRow(workingRows, rowId, {
          Status: "skipped",
          Comment: rowComment,
        });
      }
    } catch (error) {
      rowStatus = "error";
      const message = error instanceof Error ? error.message : String(error);
      rowComment = message;
      let screenshotPath: string | undefined;
      try {
        screenshotPath = await captureErrorScreenshot(
          page,
          payload.screenshotsDir,
          payload.runId,
          rowId,
          "error",
        );
      } catch {
        screenshotPath = undefined;
      }
      workingRows = updateRow(workingRows, rowId, {
        Status: "error",
        Comment: message,
      });
      emit({
        event: "log",
        step_name: "Row",
        status: "error",
        message,
        screenshot_path: screenshotPath,
      });
      finalStatus = "error";
    } finally {
      await browser.close();
    }

    writeCsv(payload.dataFilePath, headers, workingRows);
    rows.splice(0, rows.length, ...workingRows);

    if (rowStatus === "error") {
      break;
    }
  }

  emit({ event: "finished", final_status: finalStatus });
}

main().catch((error) => {
  emit({
    event: "finished",
    final_status: "error",
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
