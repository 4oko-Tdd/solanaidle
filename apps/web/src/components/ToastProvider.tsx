import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "info" | "warning" | "error";

interface Toast {
  id: number;
  message: string;
  icon?: ReactNode;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant, icon?: ReactNode) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  info: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
  warning: "border-neon-amber/30 bg-neon-amber/10 text-neon-amber",
  error: "border-neon-red/30 bg-neon-red/10 text-neon-red",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, variant: ToastVariant = "success", icon?: ReactNode) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant, icon }]);
    // Start exit animation after 2.5s, remove after 2.7s
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    }, 2500);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2700);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none max-w-sm w-full px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-mono backdrop-blur-xl ${
                VARIANT_STYLES[toast.variant]
              } ${toast.exiting ? "animate-toast-out" : "animate-toast-in"}`}
            >
              {toast.icon}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
