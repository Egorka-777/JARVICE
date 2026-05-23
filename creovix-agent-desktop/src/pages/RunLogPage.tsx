import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDatabase } from "../hooks/useDatabase";
import type { RunLog } from "../types";

export function RunLogPage() {
  const { scenarioId: scenarioIdParam } = useParams();
  const scenarioId = Number(scenarioIdParam);
  const { ready, getRunLogsByScenarioId, getScenarioById } = useDatabase();

  const [logs, setLogs] = useState<RunLog[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || Number.isNaN(scenarioId)) return;
    try {
      const scenario = await getScenarioById(scenarioId);
      setScenarioName(scenario?.name ?? `Scenario #${scenarioId}`);
      setLogs(await getRunLogsByScenarioId(scenarioId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ready, scenarioId, getRunLogsByScenarioId, getScenarioById]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ready || Number.isNaN(scenarioId)) return;
    const timer = window.setInterval(() => {
      void load();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [ready, scenarioId, load]);

  if (Number.isNaN(scenarioId)) {
    return <div className="error-box">Invalid scenario id in URL</div>;
  }

  if (!ready) {
    return <p className="muted">Initializing database…</p>;
  }

  return (
    <div>
      <h2 className="page-title">Run log — {scenarioName}</h2>
      <div className="toolbar">
        <Link className="btn" to="/">
          Scenarios
        </Link>
        <Link className="btn" to={`/scenario/${scenarioId}`}>
          Edit scenario
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <p className="muted">Auto-refresh every 2 seconds (newest at bottom)</p>

      {logs.length === 0 ? (
        <p className="muted">No log entries for this scenario yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Step</th>
              <th>Status</th>
              <th>Message</th>
              <th>Screenshot</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.stepName}</td>
                <td>
                  <span className={`status-badge ${log.status}`}>
                    {log.status}
                  </span>
                </td>
                <td>{log.message}</td>
                <td className="muted">{log.screenshotPath ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
