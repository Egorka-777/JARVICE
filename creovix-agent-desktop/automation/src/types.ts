export interface StepPayload {
  id: string;
  orderIndex: number;
  type: string;
  label: string;
  configJson: string;
  requiresConfirmation: boolean;
}

export interface RunPayload {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  dataFilePath: string;
  steps: StepPayload[];
  logsDir: string;
  screenshotsDir: string;
  signalsDir: string;
  aiSlot?: { enabled: boolean; note?: string };
}

export function emit(event: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}
