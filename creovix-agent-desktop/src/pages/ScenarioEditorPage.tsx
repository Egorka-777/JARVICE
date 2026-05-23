import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StepEditor } from "../components/StepEditor";
import {
  draftFromStep,
  emptyStepDraft,
  useScenario,
  type StepDraft,
} from "../hooks/useScenario";
import { readCsv } from "../utils/csv";

export function ScenarioEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const scenarioId = id ? Number(id) : undefined;

  const { ready, loading, error, loadScenario, saveScenarioWithSteps } =
    useScenario();

  const [name, setName] = useState("");
  const [dataFilePath, setDataFilePath] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([emptyStepDraft(0)]);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || isNew || !scenarioId || Number.isNaN(scenarioId)) return;
    void loadScenario(scenarioId)
      .then(({ scenario, steps: loaded }) => {
        setName(scenario.name);
        setDataFilePath(scenario.dataFilePath);
        setSteps(
          loaded.length > 0
            ? loaded.map(draftFromStep)
            : [emptyStepDraft(0)],
        );
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : String(e)));
  }, [ready, isNew, scenarioId, loadScenario]);

  const pickCsv = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (selected && typeof selected === "string") {
      setDataFilePath(selected);
      try {
        const rows = await readCsv(selected);
        setCsvPreview(`CSV проверен: строк найдено — ${rows.length}`);
      } catch (e) {
        setCsvPreview(
          e instanceof Error ? e.message : "CSV не прошёл проверку",
        );
      }
    }
  };

  const updateStep = (localKey: string, patch: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((s) => (s.localKey === localKey ? { ...s, ...patch } : s)),
    );
  };

  const addStep = () => {
    setSteps((prev) => [...prev, emptyStepDraft(prev.length)]);
  };

  const removeStep = (localKey: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.localKey !== localKey)
        .map((s, i) => ({ ...s, orderIndex: i })),
    );
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      if (!name.trim()) {
        setSaveError("Укажите название сценария");
        return;
      }
      if (!dataFilePath.trim()) {
        setSaveError("Укажите путь к CSV-файлу");
        return;
      }
      await readCsv(dataFilePath);
      const saved = await saveScenarioWithSteps(
        { id: scenarioId, name: name.trim(), dataFilePath },
        steps,
      );
      navigate(`/scenario/${saved.id}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!ready) {
    return <p className="muted">Инициализация базы данных…</p>;
  }

  return (
    <div>
      <h2 className="page-title">
        {isNew ? "Новый сценарий" : `Редактирование #${id}`}
      </h2>
      <div className="toolbar">
        <Link className="btn" to="/">
          Назад
        </Link>
        <button
          type="button"
          className="primary"
          disabled={loading}
          onClick={() => void handleSave()}
        >
          {loading ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {(saveError || error) && (
        <div className="error-box">{saveError ?? error}</div>
      )}

      <div className="form-grid card">
        <label>
          Название
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Путь к CSV-файлу
          <div className="inline-field">
            <input
              value={dataFilePath}
              onChange={(e) => setDataFilePath(e.target.value)}
              placeholder="C:\data\rows.csv"
            />
            <button type="button" onClick={() => void pickCsv()}>
              Выбрать
            </button>
          </div>
        </label>
        {csvPreview && <p className="muted">{csvPreview}</p>}
      </div>

      <div className="toolbar">
        <h3>Шаги</h3>
        <button type="button" onClick={addStep}>
          Добавить шаг
        </button>
      </div>

      {steps.map((step, index) => (
        <StepEditor
          key={step.localKey}
          step={step}
          index={index}
          onChange={(patch) => updateStep(step.localKey, patch)}
          onRemove={() => removeStep(step.localKey)}
        />
      ))}
    </div>
  );
}
