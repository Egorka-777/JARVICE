import { useCallback, useEffect, useRef, useState } from "react";
import type Database from "@tauri-apps/plugin-sql";
import {
  createRunLog,
  createScenario,
  createStep,
  deleteScenario,
  deleteStep,
  deleteStepsByScenarioId,
  getAllScenarios,
  getDb,
  getRunLogsByScenarioId,
  getScenarioById,
  getStepsByScenarioId,
  initDatabase,
  updateScenario,
} from "../../database/db";

export function useDatabase() {
  const dbRef = useRef<Database | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void initDatabase()
      .then((db) => {
        if (cancelled) return;
        dbRef.current = db;
        setReady(true);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureReady = useCallback(() => {
    if (!ready) {
      throw new Error("Database is not ready");
    }
  }, [ready]);

  return {
    ready,
    error,
    dbRef,
    ensureReady,
    getDb,
    getAllScenarios,
    getScenarioById,
    createScenario,
    updateScenario,
    deleteScenario,
    getStepsByScenarioId,
    createStep,
    deleteStep,
    deleteStepsByScenarioId,
    getRunLogsByScenarioId,
    createRunLog,
  };
}
