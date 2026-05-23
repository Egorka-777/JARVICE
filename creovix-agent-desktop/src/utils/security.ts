import type { Step } from "../types";

const DANGEROUS_WORDS = [
  "pay",
  "order",
  "submit",
  "delete",
  "send",
  "confirm",
];

export function validateDangerousSteps(steps: Step[]): string[] {
  const errors: string[] = [];

  for (const step of steps) {
    if (step.type !== "click" && step.type !== "fill_field") {
      continue;
    }

    const config = step.configJson.toLowerCase();
    const haystack = `${step.label} ${config}`.toLowerCase();

    const hit = DANGEROUS_WORDS.some((word) => haystack.includes(word));
    if (hit && !step.requiresConfirmation) {
      errors.push(
        `Шаг «${step.label}»: обнаружено опасное слово в label/selector при requiresConfirmation=false`,
      );
    }
  }

  return errors;
}
