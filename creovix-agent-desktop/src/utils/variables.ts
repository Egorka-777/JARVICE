export function replaceVariables(
  template: string,
  row: Record<string, string>,
): string {
  return template.replace(/%([A-Za-z0-9_]+)%/g, (_, key: string) => row[key] ?? "");
}
