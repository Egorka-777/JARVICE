export type ConfirmAction = "continue" | "stop";

let handler: ((message: string) => Promise<ConfirmAction>) | null = null;

export function registerConfirmationHandler(
  fn: (message: string) => Promise<ConfirmAction>,
): void {
  handler = fn;
}

export function unregisterConfirmationHandler(): void {
  handler = null;
}

export async function requestConfirmation(
  message: string,
): Promise<ConfirmAction> {
  if (!handler) {
    throw new Error("Confirmation UI is not ready");
  }
  return handler(message);
}
