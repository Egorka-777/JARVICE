import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  registerConfirmationHandler,
  unregisterConfirmationHandler,
  type ConfirmAction,
} from "../services/confirmationBridge";

interface ConfirmationContextValue {
  showConfirmation: (
    message: string,
    onContinue: () => void,
    onStop: () => void,
  ) => void;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(
  null,
);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{
    message: string;
    resolve: (action: ConfirmAction) => void;
  } | null>(null);

  const showConfirmation = useCallback(
    (message: string, onContinue: () => void, onStop: () => void) => {
      setPending({
        message,
        resolve: (action) => {
          if (action === "continue") onContinue();
          else onStop();
        },
      });
    },
    [],
  );

  useEffect(() => {
    registerConfirmationHandler(
      (message) =>
        new Promise<ConfirmAction>((resolve) => {
          setPending({ message, resolve });
        }),
    );
    return () => unregisterConfirmationHandler();
  }, []);

  const value = useMemo(
    () => ({ showConfirmation }),
    [showConfirmation],
  );

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmModal
          message={pending.message}
          onContinue={() => {
            pending.resolve("continue");
            setPending(null);
          }}
          onStop={() => {
            pending.resolve("stop");
            setPending(null);
          }}
        />
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation(): ConfirmationContextValue {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) {
    throw new Error("useConfirmation must be used within ConfirmationProvider");
  }
  return ctx;
}
