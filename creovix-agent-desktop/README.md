# J.A.R.V.I.C.E

# Как запустить

1. Откройте PowerShell в папке проекта.
2. Выполните:

```powershell
cd creovix-agent-desktop
npm install
npm run tauri dev
```

3. Должно открыться desktop-окно **«J.A.R.V.I.C.E»**.

4. Первый тест:
   - нажмите **«Загрузить тест Bing»**;
   - нажмите **«Запустить»**;
   - дождитесь модального окна;
   - нажмите **«Продолжить»**;
   - откройте **«Лог»**;
   - проверьте, что в CSV поле `Status` стало `done`.

5. Сборка Windows (внутри exe уже упакованы Node + Playwright + Chromium):

```powershell
npm run tauri build
```

Готовые файлы также копируются в `d:\JARVICE\release\` — **JARVICE.exe** и **JARVICE-Setup.exe**. Для пользователя Node.js не нужен.

7. Не реализовано:
   - AI-агент;
   - AutoHotkey;
   - XLSX;
   - облако;
   - обход капчи;
   - автоплатежи;
   - хранение паролей.

---

## Pass 2 — Runner + logging

- `scripts/runner.js` — Playwright + `better-sqlite3` + `csv-parser`
- `src/services/runner.ts` — Tauri Shell spawn, confirm via stdin
- `ConfirmationProvider` — modal Continue / Stop
- `validateDangerousSteps()` before run
- CSV `Status` / `Comment` updated after each row

### Run from UI

1. `npm run tauri dev`
2. **Загрузить тест Bing** → **Запустить** → **Лог**
3. В модалке → **Продолжить** или **Остановить**

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

File: `sqlite:creovix.db` в каталоге `app_config_dir` (тот же путь, что `get_app_paths().dbPath` для runner).

Tables: `scenarios`, `steps`, `run_logs`.
