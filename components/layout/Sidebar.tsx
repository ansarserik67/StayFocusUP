"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Settings, Zap } from "lucide-react";

import { LogoMark } from "@/components/brand/Logo";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { NAV_ITEMS } from "@/components/layout/nav";
import { petMood } from "@/lib/types";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const { state } = useFocus();
  const mood = petMood(state.pet.happiness);
  const petName = state.pet.name || t("pet.defaultName");

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-line bg-surface/60 px-3 py-5 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="StayFocus">
          <LogoMark size={38} />
          <span className="leading-none">
            <span className="font-display block text-[16px] font-extrabold tracking-tight">
              StayFocus
            </span>
            <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
              scroll less · live more
            </span>
          </span>
        </Link>
      </div>

      <nav className="mt-7 flex flex-col gap-1" aria-label={t("nav.primary")}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="nav-item"
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 2} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-2xl border border-line bg-surface-2/50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute">
              {t("pet.title")}
            </span>
            <span className="chip !px-2 !py-0.5 !text-[10px]">
              {t(`pet.mood.${mood}`)}
            </span>
          </div>
          <Link href="/pet" className="mt-2 flex items-center gap-3 rounded-xl transition hover:opacity-90">
            <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-emerald/30 to-cyan/20">
              <span className="text-[20px]">🫧</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] ring-1 ring-line">
                {mood === "happy" ? "✨" : mood === "ok" ? "•" : "💤"}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-ink">{petName}</span>
              <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-mute">
                <span className="inline-flex items-center gap-0.5 text-amber">
                  <Flame size={11} /> {state.streak}
                </span>
                <span className="inline-flex items-center gap-0.5 text-emerald">
                  <Zap size={11} /> {state.energy}
                </span>
              </span>
            </span>
          </Link>
        </div>

        <Link
          href="/settings"
          data-active={pathname === "/settings"}
          className="nav-item !py-2.5"
        >
          <Settings size={17} />
          {t("nav.settings")}
        </Link>

        <p className="px-2 text-[10px] leading-relaxed text-ink-mute">
          {t("settings.version")} 1.0 · {t("settings.storage")}
        </p>
      </div>
    </aside>
  );
}
