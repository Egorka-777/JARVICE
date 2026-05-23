import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { seedBingTestScenario } from "../../database/seed";
import { useScenario } from "../hooks/useScenario";
import { isRunnerActive, startScenarioRun } from "../services/runService";
import type { Scenario } from "../types";

export function ScenariosPage() {
  const navigate = useNavigate();
  const { ready, error: dbError, listScenarios } = useScenario();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!ready) return;
    try {
      setScenarios(await listScenarios());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ready, listScenarios]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRun = async (scenarioId: number) => {
    if (isRunnerActive()) {
      setError("Уже выполняется другой сценарий.");
      return;
    }
    setRunningId(scenarioId);
    setError(null);
    try {
      await startScenarioRun(scenarioId);
      navigate(`/logs/${scenarioId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunningId(null);
    }
  };

  const handleSeedBing = async () => {
    try {
      await seedBingTestScenario();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!ready) {
    return <p className="muted">Initializing database…</p>;
  }

  return (
    <div>
      <h2 className="page-title">Scenarios</h2>
      <div className="toolbar">
        <Link className="btn primary" to="/new">
          New Scenario
        </Link>
        <button type="button" onClick={() => void handleSeedBing()}>
          Load Bing test
        </button>
        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {(error || dbError) && (
        <div className="error-box">{error ?? dbError}</div>
      )}

      {scenarios.length === 0 ? (
        <p className="muted">
          No scenarios yet. Create one or load the Bing test scenario.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>CSV path</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td className="muted">{s.dataFilePath || "—"}</td>
                <td>{new Date(s.updatedAt).toLocaleString()}</td>
                <td>
                  <div className="toolbar" style={{ marginBottom: 0 }}>
                    <Link className="btn" to={`/scenario/${s.id}`}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="primary"
                      disabled={runningId === s.id}
                      onClick={() => void handleRun(s.id)}
                    >
                      {runningId === s.id ? "Starting…" : "Run"}
                    </button>
                    <Link className="btn" to={`/logs/${s.id}`}>
                      Log
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
