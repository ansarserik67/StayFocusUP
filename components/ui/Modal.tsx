"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { Portal } from "@/components/ui/Portal";

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  size = "md",
  dismissible = true,
  className = "",
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  labelledBy?: string;
  size?: "sm" | "md" | "lg" | "xl";
  dismissible?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-[420px]",
    md: "max-w-[540px]",
    lg: "max-w-[720px]",
    xl: "max-w-[960px]",
  } as const;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-[#04070f]/75 p-4 backdrop-blur-md"
      role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && dismissible) onClose?.();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={`card animate-rise relative my-auto w-full ${widths[size]} p-6 shadow-lift sm:p-7 ${className}`}
        >
          {dismissible && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-mute transition hover:bg-surface-2 hover:text-ink"
            >
              <X size={17} />
            </button>
          )}
          {children}
        </div>
      </div>
    </Portal>
  );
}
