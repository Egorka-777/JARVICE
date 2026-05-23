export interface Scenario {
  id: number;
  name: string;
  dataFilePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: number;
  scenarioId: number;
  orderIndex: number;
  type: string;
  label: string;
  configJson: string;
  requiresConfirmation: boolean;
}

export type RunLogStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "waiting_confirmation";

export interface RunLog {
  id: number;
  scenarioId: number;
  timestamp: string;
  stepName: string;
  status: RunLogStatus;
  message: string;
  screenshotPath?: string;
}

export type StepType =
  | "open_url"
  | "fill_field"
  | "click"
  | "wait"
  | "confirm"
  | "write_status";

export const STEP_TYPES: StepType[] = [
  "open_url",
  "fill_field",
  "click",
  "wait",
  "confirm",
  "write_status",
];

export interface CsvRow {
  ID: string;
  SiteUrl: string;
  LinkToInsert: string;
  TextToInsert: string;
  Quantity: string;
  Status: string;
  Comment: string;
  [key: string]: string;
}
