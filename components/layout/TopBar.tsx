"use client";

import { usePathname } from "next/navigation";
import { CloudRain, Music2, PanelLeftOpen, VolumeX } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { NAV_ITEMS } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useToast } from "@/components/ui/ToastProvider";
import type { AmbientTrack } from "@/lib/types";
import { useRail } from "@/lib/use-rail";

function AudioQuickToggle() {
  const { state, updateSettings } = useFocus();
  const { t } = useLang();
  const { push } = useToast();
  const track = state.settings.track;
  const next: AmbientTrack = track === "off" ? "lofi" : track === "lofi" ? "rain" : "off";
  const Icon = track === "rain" ? CloudRain : track === "lofi" ? Music2 : VolumeX;
  const label =
    track === "rain" ? t("audio.rain") : track === "lofi" ? t("audio.lofi") : t("audio.off");

  return (
    <button
      type="button"
      onClick={() => {
        updateSettings({ track: next });
        push(
          next === "off"
            ? t("toast.soundOff")
            : `${t("audio.playing")}: ${next === "lofi" ? t("audio.lofi") : t("audio.rain")}`,
          "info",
        );
      }}
      className={`btn-icon !w-auto gap-1.5 px-3 text-[11.5px] font-semibold ${
        track !== "off" ? "!border-emerald/45 !text-emerald" : ""
      }`}
      aria-label={`${t("header.audio")}: ${label}`}
      title={label}
    >
      <Icon size={16} className={track !== "off" ? "animate-pulse" : ""} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const { t } = useLang();
  const { open: railOpen, toggle: toggleRail } = useRail();
  const current = NAV_ITEMS.find((item) => item.href === pathname);
  const title = current
    ? t(current.labelKey)
    : pathname === "/settings"
      ? t("settings.title")
      : t("app.name");

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-background/55 backdrop-blur-2xl">
      <div className="container-app flex h-[60px] items-center justify-between gap-2 sm:h-[66px] sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {!railOpen && (
            <button
              type="button"
              onClick={toggleRail}
              className="btn-icon hidden lg:inline-flex"
              aria-label="Показать боковую панель"
              title="Показать панель"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <div className="lg:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald">
              {t("app.tagline")}
            </p>
            <h1 className="font-display truncate text-[17px] font-bold">{title}</h1>
          </div>
        </div>

        {/* Phones: only what cannot be reached anywhere else. Everything else
            lives in Settings or on the dashboard widgets, so the row never
            overflows on a 360px screen. */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <AudioQuickToggle />
          </div>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <LanguageMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
