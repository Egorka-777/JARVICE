export type CsvRow = Record<string, string>;

export function applyTemplate(template: string, row: CsvRow): string {
  return template.replace(/%([A-Za-z0-9_]+)%/g, (_, key: string) => row[key] ?? "");
}
