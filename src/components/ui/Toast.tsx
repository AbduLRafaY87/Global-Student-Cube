"use client";

import { IconButton } from "@/components/ui/IconButton";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "info" | "error";

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  text: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }]);

      if (toast.tone === "info") {
        timers.current.set(
          id,
          window.setTimeout(() => {
            dismissToast(id);
          }, 6000),
        );
      }
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ul
        className="pointer-events-none fixed right-4 bottom-24 z-50 flex w-[min(100%-32px,360px)] flex-col gap-2 min-[900px]:bottom-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <li
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-[var(--radius-card)] border p-3 text-sm shadow-md ${
              toast.tone === "error"
                ? "border-critical bg-critical-bg text-critical"
                : "border-border bg-surface text-text"
            }`}
            onMouseEnter={() => {
              const timer = timers.current.get(toast.id);
              if (timer) {
                window.clearTimeout(timer);
                timers.current.delete(toast.id);
              }
            }}
            onFocus={() => {
              const timer = timers.current.get(toast.id);
              if (timer) {
                window.clearTimeout(timer);
                timers.current.delete(toast.id);
              }
            }}
          >
            <p className="flex-1">{toast.text}</p>
            <IconButton
              label="Dismiss notification"
              size="md"
              className="size-8"
              onClick={() => dismissToast(toast.id)}
            >
              <X className="size-4" aria-hidden />
            </IconButton>
          </li>
        ))}
      </ul>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToasts must be used within ToastProvider");
  }
  return value;
}
