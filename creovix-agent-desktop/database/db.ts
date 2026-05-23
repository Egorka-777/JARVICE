import Database from "@tauri-apps/plugin-sql";
import type { RunLog, Scenario, Step } from "../src/types";

let dbInstance: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await Database.load("sqlite:creovix.db");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data_file_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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

  dbInstance = db;
  return db;
}

export async function getDb(): Promise<Database> {
  return initDatabase();
}

function mapScenario(row: Record<string, unknown>): Scenario {
  return {
    id: Number(row.id),
    name: String(row.name),
    dataFilePath: String(row.data_file_path ?? row.dataFilePath ?? ""),
    createdAt: String(row.created_at ?? row.createdAt),
    updatedAt: String(row.updated_at ?? row.updatedAt),
  };
}

function mapStep(row: Record<string, unknown>): Step {
  return {
    id: Number(row.id),
    scenarioId: Number(row.scenario_id ?? row.scenarioId),
    orderIndex: Number(row.order_index ?? row.orderIndex),
    type: String(row.type),
    label: String(row.label),
    configJson: String(row.config_json ?? row.configJson),
    requiresConfirmation: Boolean(
      Number(row.requires_confirmation ?? row.requiresConfirmation ?? 0),
    ),
  };
}

function mapRunLog(row: Record<string, unknown>): RunLog {
  return {
    id: Number(row.id),
    scenarioId: Number(row.scenario_id ?? row.scenarioId),
    timestamp: String(row.timestamp),
    stepName: String(row.step_name ?? row.stepName),
    status: row.status as RunLog["status"],
    message: String(row.message),
    screenshotPath: row.screenshot_path
      ? String(row.screenshot_path)
      : row.screenshotPath
        ? String(row.screenshotPath)
        : undefined,
  };
}

export async function getAllScenarios(): Promise<Scenario[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT id, name, data_file_path, created_at, updated_at
     FROM scenarios ORDER BY updated_at DESC`,
  );
  return rows.map(mapScenario);
}

export async function getScenarioById(id: number): Promise<Scenario | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT id, name, data_file_path, created_at, updated_at
     FROM scenarios WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  return mapScenario(rows[0]);
}

export async function createScenario(
  name: string,
  dataFilePath: string,
): Promise<Scenario> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.select<{ id: number }[]>(
    `INSERT INTO scenarios (name, data_file_path, created_at, updated_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, dataFilePath, now, now],
  );
  const id = result[0].id;
  const created = await getScenarioById(id);
  if (!created) throw new Error("Failed to load created scenario");
  return created;
}

export async function updateScenario(
  id: number,
  name: string,
  dataFilePath: string,
): Promise<Scenario> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE scenarios SET name = $1, data_file_path = $2, updated_at = $3 WHERE id = $4`,
    [name, dataFilePath, now, id],
  );
  const updated = await getScenarioById(id);
  if (!updated) throw new Error("Scenario not found after update");
  return updated;
}

export async function deleteScenario(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM run_logs WHERE scenario_id = $1`, [id]);
  await db.execute(`DELETE FROM steps WHERE scenario_id = $1`, [id]);
  await db.execute(`DELETE FROM scenarios WHERE id = $1`, [id]);
}

export async function getStepsByScenarioId(scenarioId: number): Promise<Step[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT id, scenario_id, order_index, type, label, config_json, requires_confirmation
     FROM steps WHERE scenario_id = $1 ORDER BY order_index ASC`,
    [scenarioId],
  );
  return rows.map(mapStep);
}

export async function createStep(
  scenarioId: number,
  orderIndex: number,
  type: string,
  label: string,
  configJson: string,
  requiresConfirmation: boolean,
): Promise<Step> {
  const db = await getDb();
  const result = await db.select<{ id: number }[]>(
    `INSERT INTO steps (scenario_id, order_index, type, label, config_json, requires_confirmation)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      scenarioId,
      orderIndex,
      type,
      label,
      configJson,
      requiresConfirmation ? 1 : 0,
    ],
  );
  const steps = await getStepsByScenarioId(scenarioId);
  const step = steps.find((s) => s.id === result[0].id);
  if (!step) throw new Error("Failed to load created step");
  return step;
}

export async function deleteStep(stepId: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM steps WHERE id = $1`, [stepId]);
}

export async function deleteStepsByScenarioId(scenarioId: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM steps WHERE scenario_id = $1`, [scenarioId]);
}

export async function getRunLogsByScenarioId(
  scenarioId: number,
): Promise<RunLog[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT id, scenario_id, timestamp, step_name, status, message, screenshot_path
     FROM run_logs WHERE scenario_id = $1 ORDER BY timestamp ASC`,
    [scenarioId],
  );
  return rows.map(mapRunLog);
}

export async function createRunLog(
  scenarioId: number,
  stepName: string,
  status: RunLog["status"],
  message: string,
  screenshotPath?: string,
): Promise<RunLog> {
  const db = await getDb();
  const timestamp = new Date().toISOString();
  const result = await db.select<{ id: number }[]>(
    `INSERT INTO run_logs (scenario_id, timestamp, step_name, status, message, screenshot_path)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [scenarioId, timestamp, stepName, status, message, screenshotPath ?? null],
  );
  const logs = await getRunLogsByScenarioId(scenarioId);
  const log = logs.find((l) => l.id === result[0].id);
  if (!log) throw new Error("Failed to load created run log");
  return log;
}
