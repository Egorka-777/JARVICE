/**
 * Node/Playwright scenario runner (Pass 2).
 * Usage: node scripts/runner.js <scenarioId>
 * Env: CREOVIX_DB_PATH, CREOVIX_SCREENSHOTS_DIR
 */
import Database from "better-sqlite3";
import { stringify } from "csv-stringify/sync";
import csv from "csv-parser";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const REQUIRED_COLUMNS = [
  "ID",
  "SiteUrl",
  "LinkToInsert",
  "TextToInsert",
  "Quantity",
  "Status",
  "Comment",
];

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function replaceVariables(template, row) {
  return String(template ?? "").replace(
    /%([A-Za-z0-9_]+)%/g,
    (_, key) => row[key] ?? "",
  );
}

function openDb() {
  const dbPath = process.env.CREOVIX_DB_PATH;
  if (!dbPath) {
    throw new Error("CREOVIX_DB_PATH is not set");
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data_file_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      config_json TEXT NOT NULL,
      requires_confirmation INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS run_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      step_name TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      screenshot_path TEXT,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );
  `);
  return db;
}

function loadScenario(db, scenarioId) {
  const scenario = db
    .prepare(
      `SELECT id, name, data_file_path AS dataFilePath
       FROM scenarios WHERE id = ?`,
    )
    .get(scenarioId);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }
  const steps = db
    .prepare(
      `SELECT id, scenario_id AS scenarioId, order_index AS orderIndex,
              type, label, config_json AS configJson,
              requires_confirmation AS requiresConfirmation
       FROM steps WHERE scenario_id = ? ORDER BY order_index ASC`,
    )
    .all(scenarioId)
    .map((s) => ({
      ...s,
      requiresConfirmation: Boolean(s.requiresConfirmation),
    }));
  return { scenario, steps };
}

function createRunLog(db, scenarioId, stepName, status, message, screenshotPath) {
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO run_logs (scenario_id, timestamp, step_name, status, message, screenshot_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(scenarioId, timestamp, stepName, status, message, screenshotPath ?? null);
  emit({
    type: "log",
    stepName,
    status,
    message,
    screenshotPath: screenshotPath ?? null,
    timestamp,
  });
}

function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function validateCsvColumns(rows) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      throw new Error(`CSV missing required column: ${col}`);
    }
  }
}

function writeCsvFile(filePath, rows) {
  const headers =
    rows.length > 0 ? Object.keys(rows[0]) : [...REQUIRED_COLUMNS];
  const output = stringify(rows, { header: true, columns: headers });
  fs.writeFileSync(filePath, output, "utf8");
}

function updateCsvRow(rows, rowId, patch) {
  return rows.map((row) => {
    if (String(row.ID) !== String(rowId)) return row;
    return { ...row, ...patch };
  });
}

function waitForUserCommand() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });
    rl.once("line", (line) => {
      rl.close();
      const cmd = line.trim().toLowerCase();
      if (cmd === "stop") resolve("stop");
      else resolve("continue");
    });
  });
}

async function captureErrorScreenshot(page, screenshotsDir, scenarioId, rowId) {
  const dir = path.join(screenshotsDir, String(scenarioId));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${rowId}-${randomUUID()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function executeStep(page, step, row, db, scenarioId, screenshotsDir) {
  const config = JSON.parse(step.configJson);
  const stepName = step.label || step.type;

  createRunLog(db, scenarioId, stepName, "running", `Executing ${step.type}`);

  switch (step.type) {
    case "open_url": {
      const url = replaceVariables(config.urlTemplate, row);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      createRunLog(db, scenarioId, stepName, "done", `Opened ${url}`);
      return "ok";
    }
    case "fill_field": {
      const selector = config.selector;
      const value = replaceVariables(config.valueTemplate, row);
      await page.waitForSelector(selector, { timeout: 15000 });
      await page.fill(selector, value);
      createRunLog(db, scenarioId, stepName, "done", `Filled ${selector}`);
      return "ok";
    }
    case "click": {
      const selector = config.selector;
      await page.waitForSelector(selector, { timeout: 15000 });
      if (config.pressKey) {
        await page.press(selector, config.pressKey);
        createRunLog(
          db,
          scenarioId,
          stepName,
          "done",
          `Pressed ${config.pressKey} on ${selector}`,
        );
      } else {
        await page.click(selector);
        createRunLog(db, scenarioId, stepName, "done", `Clicked ${selector}`);
      }
      return "ok";
    }
    case "wait": {
      const ms = Number(config.milliseconds ?? 1000);
      await page.waitForTimeout(ms);
      createRunLog(db, scenarioId, stepName, "done", `Waited ${ms}ms`);
      return "ok";
    }
    case "confirm": {
      const message = replaceVariables(
        config.messageTemplate ?? "Confirm to continue",
        row,
      );
      createRunLog(
        db,
        scenarioId,
        stepName,
        "waiting_confirmation",
        message,
      );
      emit({ type: "confirm", message, rowId: row.ID });

      const action = await waitForUserCommand();
      if (action === "stop") {
        createRunLog(
          db,
          scenarioId,
          stepName,
          "error",
          "Stopped by user at confirm",
        );
        return "stop";
      }
      createRunLog(db, scenarioId, stepName, "done", "User continued");
      return "ok";
    }
    case "write_status":
      return "ok";
    default:
      throw new Error(`Unsupported step type: ${step.type}`);
  }
}

export async function runScenario(scenarioId) {
  const db = openDb();
  const screenshotsDir =
    process.env.CREOVIX_SCREENSHOTS_DIR ??
    path.join(process.cwd(), "screenshots");

  const { scenario, steps } = loadScenario(db, scenarioId);
  if (!scenario.dataFilePath || !fs.existsSync(scenario.dataFilePath)) {
    throw new Error(`CSV file not found: ${scenario.dataFilePath}`);
  }
  if (steps.length === 0) {
    throw new Error("Scenario has no steps");
  }

  let rows = await readCsvFile(scenario.dataFilePath);
  validateCsvColumns(rows);
  const pending = rows.filter(
    (r) => String(r.Status ?? "").trim().toLowerCase() === "pending",
  );

  createRunLog(
    db,
    scenarioId,
    "Runner",
    "running",
    `Pending rows: ${pending.length}`,
  );

  const writeStatusStep = steps.find((s) => s.type === "write_status");
  const writeConfig = writeStatusStep
    ? JSON.parse(writeStatusStep.configJson)
    : { status: "done" };

  for (const row of pending) {
    const rowId = row.ID;
    createRunLog(
      db,
      scenarioId,
      "Row",
      "running",
      `Processing row ${rowId}`,
    );

    let browser;
    let page;
    let rowStopped = false;

    try {
      browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();
      page = await context.newPage();

      for (const step of steps) {
        if (step.type === "write_status") continue;
        const result = await executeStep(
          page,
          step,
          row,
          db,
          scenarioId,
          screenshotsDir,
        );
        if (result === "stop") {
          rowStopped = true;
          rows = updateCsvRow(rows, rowId, {
            Status: "skipped",
            Comment: "Stopped by user",
          });
          writeCsvFile(scenario.dataFilePath, rows);
          break;
        }
      }

      if (!rowStopped) {
        rows = updateCsvRow(rows, rowId, {
          Status: writeConfig.status ?? "done",
          Comment: "Выполнено",
        });
        writeCsvFile(scenario.dataFilePath, rows);
        createRunLog(
          db,
          scenarioId,
          writeStatusStep?.label ?? "write_status",
          "done",
          `Row ${rowId} -> ${writeConfig.status ?? "done"}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      let screenshotPath;
      try {
        if (page) {
          screenshotPath = await captureErrorScreenshot(
            page,
            screenshotsDir,
            scenarioId,
            rowId,
          );
        }
      } catch {
        screenshotPath = undefined;
      }
      rows = updateCsvRow(rows, rowId, {
        Status: "error",
        Comment: message,
      });
      writeCsvFile(scenario.dataFilePath, rows);
      createRunLog(
        db,
        scenarioId,
        "Row",
        "error",
        message,
        screenshotPath,
      );
      emit({ type: "finished", status: "error", message });
      db.close();
      process.exit(1);
    } finally {
      if (browser) await browser.close();
    }
  }

  createRunLog(db, scenarioId, "Runner", "done", "All pending rows processed");
  emit({ type: "finished", status: "done" });
  db.close();
}

const scenarioId = Number(process.argv[2]);
if (!scenarioId || Number.isNaN(scenarioId)) {
  console.error("Usage: node scripts/runner.js <scenarioId>");
  process.exit(1);
}

runScenario(scenarioId).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  emit({ type: "finished", status: "error", message });
  process.exit(1);
});
