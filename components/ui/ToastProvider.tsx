"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X } from "lucide-react";

type Tone = "success" | "info" | "error";

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastValue {
  push: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message: string, tone: Tone = "success") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), 4200),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[180] flex flex-col items-center gap-2 px-4 sm:bottom-8 sm:left-auto sm:right-6 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-[92vw] items-center gap-2.5 rounded-2xl border px-4 py-3 text-[13.5px] font-medium shadow-lift backdrop-blur-xl sm:max-w-sm ${
              toast.tone === "error"
                ? "border-rose-400/40 bg-rose-950/80 text-rose-100"
                : toast.tone === "info"
                  ? "border-line-strong bg-surface/95 text-ink"
                  : "border-emerald/40 bg-surface/95 text-ink"
            }`}
            role="status"
          >
            {toast.tone === "success" ? (
              <CheckCircle2 size={17} className="flex-none text-emerald" />
            ) : (
              <Info size={17} className="flex-none text-cyan" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-full p-1 text-ink-mute transition hover:bg-surface-2 hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
