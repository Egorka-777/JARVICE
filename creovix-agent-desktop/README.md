# Creovix Agent Desktop

## Pass 2 — Runner + logging

- `scripts/runner.js` — Playwright + `better-sqlite3` + `csv-parser`
- `src/services/runner.ts` — Tauri Shell spawn, confirm via stdin
- `ConfirmationProvider` — modal Continue / Stop
- `validateDangerousSteps()` before run
- CSV `Status` / `Comment` updated after each row

### Run from UI

1. `npm run tauri dev`
2. **Load Bing test** → **Run** → open **Log**
3. On confirm modal → **Continue** or **Stop**

---

## Pass 1 — Application skeleton

Tauri 2 + React + TypeScript desktop app with SQLite (`@tauri-apps/plugin-sql`), scenario CRUD, and three UI screens.

### Structure

```
creovix-agent-desktop/
├── src/
│   ├── components/     StepEditor
│   ├── pages/          ScenariosPage, ScenarioEditorPage, RunLogPage
│   ├── hooks/          useDatabase, useScenario
│   ├── types/          Scenario, Step, RunLog
│   ├── utils/          variables, csv
│   └── services/       runService (stub for next pass)
├── database/
│   └── db.ts           SQLite init + CRUD
├── scripts/            Node helpers (csv-parser)
├── src-tauri/          Tauri shell (dialog + sql plugins only)
└── automation/         Playwright runner (later passes)
```

### Setup

```powershell
cd d:\JARVICE\creovix-agent-desktop
npm install
npm run tauri dev
```

Requires **Node 20+**, **Rust (rustup)**, and **WebView2** on Windows.

### Pass 1 features

- Create / edit / delete scenarios
- Attach CSV path (file picker + validation)
- Add / remove steps with type-specific fields
- Run log page with 2s auto-refresh
- **Run** button shows stub message (Playwright in pass 2+)

### Routes

| Path | Page |
|------|------|
| `/` | Scenarios list |
| `/new` | New scenario |
| `/scenario/:id` | Edit scenario |
| `/logs/:scenarioId` | Run log |

### Lint / format

```powershell
npm run lint
npm run format
```

### CSV columns

`ID`, `SiteUrl`, `LinkToInsert`, `TextToInsert`, `Quantity`, `Status`, `Comment`

Variables in templates: `%SiteUrl%`, `%LinkToInsert%`, etc. (`src/utils/variables.ts`).

### Database

File: `sqlite:creovix.db` (managed by Tauri SQL plugin, app data directory).

Tables: `scenarios`, `steps`, `run_logs`.
