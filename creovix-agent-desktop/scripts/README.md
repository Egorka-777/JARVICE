# Scripts

## `runner.js`

Playwright scenario executor (Pass 2).

```powershell
$env:CREOVIX_DB_PATH = "$env:LOCALAPPDATA\com.creovix.agent.desktop\creovix.db"
$env:CREOVIX_SCREENSHOTS_DIR = "$env:LOCALAPPDATA\com.creovix.agent.desktop\screenshots"
node scripts/runner.js <scenarioId>
```

On `confirm`, writes JSON to stdout and waits for `continue` or `stop` on stdin.

## `seed-bing-scenario.js`

Creates Bing test scenario in SQLite (requires `CREOVIX_DB_PATH`).

## `read-csv-node.mjs`

CSV read helper using `csv-parser` package.
