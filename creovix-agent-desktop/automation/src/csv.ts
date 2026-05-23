import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import fs from "node:fs";

export const REQUIRED_COLUMNS = [
  "ID",
  "SiteUrl",
  "LinkToInsert",
  "TextToInsert",
  "Quantity",
  "Status",
  "Comment",
] as const;

export type CsvRow = Record<string, string>;

export function readCsv(filePath: string): { headers: string[]; rows: CsvRow[] } {
  const raw = fs.readFileSync(filePath, "utf8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRow[];

  if (records.length === 0) {
    const headerLine = raw.split(/\r?\n/)[0] ?? "";
    const headers = headerLine.split(",").map((h) => h.trim());
    return { headers, rows: [] };
  }

  const headers = Object.keys(records[0]);
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      throw new Error(`CSV missing required column: ${col}`);
    }
  }
  return { headers, rows: records };
}

export function pendingRows(rows: CsvRow[]): CsvRow[] {
  return rows.filter((r) => (r.Status ?? "").trim().toLowerCase() === "pending");
}

export function writeCsv(filePath: string, headers: string[], rows: CsvRow[]): void {
  const output = stringify(rows, { header: true, columns: headers });
  fs.writeFileSync(filePath, output, "utf8");
}

export function updateRow(
  rows: CsvRow[],
  rowId: string,
  patch: Partial<CsvRow>,
): CsvRow[] {
  return rows.map((row) => {
    if (row.ID !== rowId) return row;
    const next: CsvRow = { ...row };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) next[key] = value;
    }
    return next;
  });
}
