"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, LogOut, Settings } from "lucide-react";

import { Avatar } from "@/components/layout/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { usePwa } from "@/components/pwa/PwaProvider";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { t } = useLang();
  const { canInstall, installed, install } = usePwa();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("header.account")}
        className="rounded-full transition hover:opacity-90"
      >
        <Avatar name={user.name} picture={user.picture} size={36} />
      </button>

      {open && (
        <div
          role="menu"
          className="glass animate-pop absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl p-1.5 shadow-lift"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[13.5px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11.5px] text-ink-mute">{user.email}</p>
            <span className="chip mt-2 !py-0.5 !text-[10px]">
              {user.mode === "google" ? t("settings.connected") : t("common.demoMode")}
            </span>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-soft transition hover:bg-surface-2 hover:text-ink"
          >
            <Settings size={15} />
            {t("settings.title")}
          </Link>

          {!installed && canInstall && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void install();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-ink-soft transition hover:bg-surface-2 hover:text-ink"
            >
              <Download size={15} />
              {t("header.install")}
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-rose transition hover:bg-rose/10"
          >
            <LogOut size={15} />
            {t("header.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
