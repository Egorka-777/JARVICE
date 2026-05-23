interface ConfirmModalProps {
  message: string;
  onContinue: () => void;
  onStop: () => void;
}

export function ConfirmModal({ message, onContinue, onStop }: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Подтверждение шага</h2>
        <p>{message}</p>
        <p className="muted">
          Проверьте данные в браузере. Опасные действия не выполняются без
          подтверждения.
        </p>
        <div className="modal-actions">
          <button type="button" className="danger" onClick={onStop}>
            Stop
          </button>
          <button type="button" className="primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
