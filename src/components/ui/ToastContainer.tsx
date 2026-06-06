import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Toast from "./Toast";
import type { ToastType } from "./Toast";

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (
    type: ToastType,
    message: string,
    description?: string,
    duration?: number,
  ) => void;
  /** Legacy compat: addToast(message, type) */
  addToast: (message: string, type: ToastType) => void;
  /** Legacy compat: showErrorToast(message) */
  showErrorToast: (message: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      message: string,
      description?: string,
      duration: number = 5000,
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastData = { id, type, message, description, duration };
      setToasts((prev) => [...prev, newToast]);
    },
    [],
  );

  const success = useCallback(
    (message: string, description?: string) => {
      showToast("success", message, description);
    },
    [showToast],
  );

  const error = useCallback(
    (message: string, description?: string) => {
      showToast("error", message, description, 7000); // Longer for errors
    },
    [showToast],
  );

  const info = useCallback(
    (message: string, description?: string) => {
      showToast("info", message, description);
    },
    [showToast],
  );

  const warning = useCallback(
    (message: string, description?: string) => {
      showToast("warning", message, description);
    },
    [showToast],
  );

  // Legacy compat shim: old API was addToast(message, type)
  const addToast = useCallback(
    (message: string, type: ToastType) => {
      showToast(type, message);
    },
    [showToast],
  );

  // Legacy compat shim: old API was showErrorToast(message)
  const showErrorToast = useCallback(
    (message: string) => {
      showToast("error", message);
    },
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        addToast,
        showErrorToast,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}

      {/* Toast Container */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none"
        style={{ top: "calc(var(--top-nav-height) + 12px)" }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
