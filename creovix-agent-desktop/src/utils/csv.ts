import { readTextFile } from "@tauri-apps/plugin-fs";
import { parse } from "csv-parse/sync";
import type { CsvRow } from "../types";

export const REQUIRED_CSV_COLUMNS = [
  "ID",
  "SiteUrl",
  "LinkToInsert",
  "TextToInsert",
  "Quantity",
  "Status",
  "Comment",
] as const;

export function validateCsvColumns(headers: string[]): void {
  for (const col of REQUIRED_CSV_COLUMNS) {
    if (!headers.includes(col)) {
      throw new Error(`CSV missing required column: ${col}`);
    }
  }
}

export async function readCsv(filePath: string): Promise<CsvRow[]> {
  const content = await readTextFile(filePath);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    const headerLine = content.split(/\r?\n/)[0] ?? "";
    const headers = headerLine.split(",").map((h) => h.trim());
    validateCsvColumns(headers);
    return [];
  }

  const headers = Object.keys(records[0]);
  validateCsvColumns(headers);

  return records.map((row) => {
    const normalized: CsvRow = {
      ID: "",
      SiteUrl: "",
      LinkToInsert: "",
      TextToInsert: "",
      Quantity: "",
      Status: "",
      Comment: "",
    };
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = value;
    }
    return normalized;
  });
}

export function getPendingRows(rows: CsvRow[]): CsvRow[] {
  return rows.filter((r) => (r.Status ?? "").trim().toLowerCase() === "pending");
}
