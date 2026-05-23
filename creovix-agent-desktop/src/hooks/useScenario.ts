import { useCallback, useState } from "react";
import type { Scenario, Step } from "../types";
import { useDatabase } from "./useDatabase";

export interface StepDraft {
  localKey: string;
  id?: number;
  orderIndex: number;
  type: string;
  label: string;
  selector: string;
  valueTemplate: string;
  milliseconds: number;
  messageTemplate: string;
  status: string;
  urlTemplate: string;
  requiresConfirmation: boolean;
}

export function buildConfigJson(draft: StepDraft): string {
  switch (draft.type) {
    case "open_url":
      return JSON.stringify({ urlTemplate: draft.urlTemplate });
    case "fill_field":
      return JSON.stringify({
        selector: draft.selector,
        valueTemplate: draft.valueTemplate,
      });
    case "click":
      return JSON.stringify({
        selector: draft.selector,
        pressKey: draft.valueTemplate || undefined,
      });
    case "wait":
      return JSON.stringify({ milliseconds: draft.milliseconds });
    case "confirm":
      return JSON.stringify({ messageTemplate: draft.messageTemplate });
    case "write_status":
      return JSON.stringify({ status: draft.status });
    default:
      return "{}";
  }
}

export function draftFromStep(step: Step): StepDraft {
  const config = JSON.parse(step.configJson) as Record<string, unknown>;
  return {
    localKey: `step-${step.id}`,
    id: step.id,
    orderIndex: step.orderIndex,
    type: step.type,
    label: step.label,
    selector: String(config.selector ?? ""),
    valueTemplate: String(
      config.valueTemplate ?? config.pressKey ?? "",
    ),
    milliseconds: Number(config.milliseconds ?? 1000),
    messageTemplate: String(config.messageTemplate ?? ""),
    status: String(config.status ?? "done"),
    urlTemplate: String(config.urlTemplate ?? "%SiteUrl%"),
    requiresConfirmation: step.requiresConfirmation,
  };
}

export function emptyStepDraft(orderIndex: number): StepDraft {
  return {
    localKey: `new-${crypto.randomUUID()}`,
    orderIndex,
    type: "open_url",
    label: "New step",
    selector: 'textarea#sb_form_q, input[name="q"]',
    valueTemplate: "%LinkToInsert% %TextToInsert%",
    milliseconds: 1000,
    messageTemplate:
      "Проверь данные перед продолжением: %SiteUrl% / %LinkToInsert%",
    status: "done",
    urlTemplate: "%SiteUrl%",
    requiresConfirmation: false,
  };
}

export function useScenario() {
  const db = useDatabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenario = useCallback(
    async (id: number) => {
      db.ensureReady();
      setLoading(true);
      setError(null);
      try {
        const scenario = await db.getScenarioById(id);
        if (!scenario) throw new Error("Scenario not found");
        const steps = await db.getStepsByScenarioId(id);
        return { scenario, steps };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [db],
  );

  const saveScenarioWithSteps = useCallback(
    async (
      scenarioData: { id?: number; name: string; dataFilePath: string },
      stepDrafts: StepDraft[],
    ): Promise<Scenario> => {
      db.ensureReady();
      setLoading(true);
      setError(null);
      try {
        let scenario: Scenario;
        if (scenarioData.id) {
          scenario = await db.updateScenario(
            scenarioData.id,
            scenarioData.name,
            scenarioData.dataFilePath,
          );
          await db.deleteStepsByScenarioId(scenario.id);
        } else {
          scenario = await db.createScenario(
            scenarioData.name,
            scenarioData.dataFilePath,
          );
        }

        for (let i = 0; i < stepDrafts.length; i++) {
          const draft = stepDrafts[i];
          await db.createStep(
            scenario.id,
            i,
            draft.type,
            draft.label,
            buildConfigJson({ ...draft, orderIndex: i }),
            draft.requiresConfirmation,
          );
        }

        return scenario;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [db],
  );

  const removeScenario = useCallback(
    async (id: number) => {
      db.ensureReady();
      await db.deleteScenario(id);
    },
    [db],
  );

  const listScenarios = useCallback(async () => {
    db.ensureReady();
    return db.getAllScenarios();
  }, [db]);

  return {
    ...db,
    loading,
    error,
    loadScenario,
    saveScenarioWithSteps,
    removeScenario,
    listScenarios,
  };
}
