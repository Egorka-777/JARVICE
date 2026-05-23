import type { StepDraft } from "../hooks/useScenario";
import { STEP_TYPES, type StepType } from "../types";

interface StepEditorProps {
  step: StepDraft;
  index: number;
  onChange: (patch: Partial<StepDraft>) => void;
  onRemove: () => void;
}

export function StepEditor({ step, index, onChange, onRemove }: StepEditorProps) {
  const type = step.type as StepType;

  return (
    <div className="card step-editor">
      <div className="step-row">
        <label>
          Название шага
          <input
            value={step.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
        <label>
          Тип
          <select
            value={step.type}
            onChange={(e) => onChange({ type: e.target.value })}
          >
            {STEP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="danger" onClick={onRemove}>
          Удалить шаг
        </button>
      </div>

      {type === "open_url" && (
        <label>
          Шаблон URL
          <input
            value={step.urlTemplate}
            onChange={(e) => onChange({ urlTemplate: e.target.value })}
            placeholder="%SiteUrl%"
          />
        </label>
      )}

      {type === "fill_field" && (
        <>
          <label>
            CSS-селектор / locator
            <input
              value={step.selector}
              onChange={(e) => onChange({ selector: e.target.value })}
            />
          </label>
          <label>
            Шаблон значения
            <input
              value={step.valueTemplate}
              onChange={(e) => onChange({ valueTemplate: e.target.value })}
              placeholder="%LinkToInsert% %TextToInsert%"
            />
          </label>
        </>
      )}

      {type === "click" && (
        <>
          <label>
            CSS-селектор / locator
            <input
              value={step.selector}
              onChange={(e) => onChange({ selector: e.target.value })}
            />
          </label>
          <label>
            Клавиша вместо клика, если нужна
            <input
              value={step.valueTemplate}
              onChange={(e) => onChange({ valueTemplate: e.target.value })}
              placeholder="Enter"
            />
          </label>
        </>
      )}

      {type === "wait" && (
        <label>
          Задержка, мс
          <input
            type="number"
            min={0}
            value={step.milliseconds}
            onChange={(e) =>
              onChange({ milliseconds: Number(e.target.value) || 0 })
            }
          />
        </label>
      )}

      {type === "confirm" && (
        <label>
          Текст подтверждения
          <textarea
            value={step.messageTemplate}
            onChange={(e) => onChange({ messageTemplate: e.target.value })}
          />
        </label>
      )}

      {type === "write_status" && (
        <label>
          Значение статуса
          <input
            value={step.status}
            onChange={(e) => onChange({ status: e.target.value })}
            placeholder="done"
          />
        </label>
      )}

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={step.requiresConfirmation}
          onChange={(e) => onChange({ requiresConfirmation: e.target.checked })}
        />
        Требует подтверждения, шаг #{index + 1}
      </label>
    </div>
  );
}
