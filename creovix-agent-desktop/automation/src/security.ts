import type { StepPayload } from "./types.js";

const DANGEROUS = ["pay", "order", "submit", "delete", "send", "confirm"];

export function validateSteps(steps: StepPayload[]): string[] {
  const errors: string[] = [];
  for (const step of steps) {
    if (step.type === "confirm") continue;
    const hay = `${step.label} ${step.configJson}`.toLowerCase();
    const hit = DANGEROUS.some((w) => hay.includes(w));
    if (hit && !step.requiresConfirmation) {
      errors.push(
        `${step.label}: dangerous keyword without requiresConfirmation`,
      );
    }
  }
  return errors;
}
