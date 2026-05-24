import { readTextFile } from "@tauri-apps/plugin-fs";
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

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function parseCsvContent(content: string): Record<string, string>[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  validateCsvColumns(headers);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

export async function readCsv(filePath: string): Promise<CsvRow[]> {
  const content = await readTextFile(filePath);
  const records = parseCsvContent(content);

  if (records.length === 0) {
    return [];
  }

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
