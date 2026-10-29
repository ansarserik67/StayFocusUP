"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe2 } from "lucide-react";

import { useLang } from "@/components/i18n/LanguageProvider";
import { LANGS } from "@/lib/i18n";

export function LanguageMenu() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((item) => item.id === lang) ?? LANGS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="btn-icon !w-auto gap-1.5 px-2.5 text-[12px] font-bold"
      >
        <Globe2 size={16} />
        <span>{current.short}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="glass animate-pop absolute right-0 top-[calc(100%+8px)] z-50 w-40 overflow-hidden rounded-2xl p-1.5 shadow-lift"
        >
          {LANGS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === lang}
              onClick={() => {
                setLang(item.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition ${
                item.id === lang
                  ? "bg-emerald/12 font-semibold text-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span>{item.label}</span>
              {item.id === lang ? (
                <Check size={14} className="text-emerald" />
              ) : (
                <span className="text-[10px] font-bold text-ink-mute">{item.short}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
