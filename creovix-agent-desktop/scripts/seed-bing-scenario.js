/**
 * Seeds Bing test scenario into SQLite (same DB as Tauri app).
 * Usage: CREOVIX_DB_PATH="..." node scripts/seed-bing-scenario.js
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.CREOVIX_DB_PATH;

if (!dbPath) {
  console.error("Set CREOVIX_DB_PATH to app data creovix.db");
  process.exit(1);
}

const sampleDir = path.join(path.dirname(dbPath), "sample-data");
fs.mkdirSync(sampleDir, { recursive: true });
const csvPath = path.join(sampleDir, "bing-test.csv");
const csvContent = `ID,SiteUrl,LinkToInsert,TextToInsert,Quantity,Status,Comment
1,https://www.bing.com,https://example.com/video-test,Проверка J.A.R.V.I.C.E,1,pending,
`;
fs.writeFileSync(csvPath, csvContent, "utf8");

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
    requires_confirmation INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS run_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    screenshot_path TEXT
  );
`);
const now = new Date().toISOString();

const existing = db
  .prepare(`SELECT id FROM scenarios WHERE name = 'Bing search test'`)
  .get();
if (existing) {
  console.log(JSON.stringify({ scenarioId: existing.id, csvPath }));
  db.close();
  process.exit(0);
}

const { lastInsertRowid: scenarioId } = db
  .prepare(
    `INSERT INTO scenarios (name, data_file_path, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
  )
  .run("Bing search test", csvPath, now, now);

const steps = [
  ["open_url", "Open Bing", '{"urlTemplate":"%SiteUrl%"}', 0],
  [
    "fill_field",
    "Fill search box",
    '{"selector":"textarea#sb_form_q, input[name=\\"q\\"]","valueTemplate":"%LinkToInsert% %TextToInsert%"}',
    0,
  ],
  [
    "confirm",
    "Confirm before submit",
    '{"messageTemplate":"Проверь поисковый запрос перед Enter: %LinkToInsert% %TextToInsert%"}',
    1,
  ],
  [
    "click",
    "Press Enter in search",
    '{"selector":"textarea#sb_form_q, input[name=\\"q\\"]","pressKey":"Enter"}',
    1,
  ],
  ["write_status", "Mark row done", '{"status":"done"}', 0],
];

const insert = db.prepare(
  `INSERT INTO steps (scenario_id, order_index, type, label, config_json, requires_confirmation)
   VALUES (?, ?, ?, ?, ?, ?)`,
);

steps.forEach(([type, label, configJson, requiresConfirmation], index) => {
  insert.run(scenarioId, index, type, label, configJson, requiresConfirmation);
});

db.close();
console.log(JSON.stringify({ scenarioId, csvPath }));
