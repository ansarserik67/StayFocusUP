"use client";

import { useEffect, useState } from "react";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { BrandIcon } from "@/components/social/BrandIcon";
import { formatDuration } from "@/lib/i18n";
import { SOCIAL_APPS } from "@/lib/social";
import { appLimitSeconds, appRemainingSeconds } from "@/lib/state";

/** How long the "you spent this much" strip stays after a session stops. */
const FLASH_MS = 8_000;

/**
 * Sticks under the header so the countdown for the network you are in stays
 * visible.
 *
 * The clock belongs to the external site: while you are inside it StayFocus is
 * either hidden (tab) or visible beside it (separate window) — both keep this
 * bar running. Coming back stops the session, so the bar then holds the result
 * for a few seconds instead of vanishing without explanation.
 */
export function SessionBar() {
  const { state, now, remaining, sessionActive, summary, endSession } = useFocus();
  const { t } = useLang();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (sessionActive || !summary || summary.consumedSeconds < 1) return;
    // Both setState calls happen in timers, never in the effect body: show the
    // result right away, take it away again after a few seconds.
    const show = window.setTimeout(() => setFlash(true), 0);
    const hide = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [sessionActive, summary]);

  const liveId = sessionActive ? state.session?.app : undefined;
  const showFlash = !sessionActive && flash && Boolean(summary);
  const appId = liveId ?? (showFlash ? summary?.app : undefined);
  const app = appId ? SOCIAL_APPS.find((item) => item.id === appId) : undefined;
  if (!app) return null;

  const live = Boolean(liveId);
  const limit = appLimitSeconds(state, app.id);
  const left = appRemainingSeconds(state, app.id, now);
  const percent = limit > 0 ? Math.max(0, Math.min(1, left / limit)) : 0;

  return (
    <div
      className={`sticky top-[60px] z-40 border-b backdrop-blur-2xl sm:top-[66px] ${
        live ? "border-cyan/25 bg-cyan/12" : "border-line/70 bg-background/70"
      }`}
    >
      <div className="container-app flex h-[48px] items-center gap-2.5 sm:gap-3">
        <span
          className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-[9px] text-white"
          style={{ background: app.tint }}
        >
          <BrandIcon id={app.id} size={14} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-ink">
            {live
              ? t("social.sessionLive", { app: app.name })
              : t("social.sessionSpent", {
                  app: app.name,
                  time: formatDuration(summary?.consumedSeconds ?? 0),
                })}
          </p>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-cyan/20">
            <div
              className="h-full rounded-full bg-cyan transition-[width] duration-1000 ease-linear"
              style={{ width: `${(live ? percent : 1) * 100}%` }}
            />
          </div>
        </div>

        <span className="mono font-display flex-none text-[17px] font-bold text-cyan sm:text-[18px]">
          {live ? formatDuration(remaining) : formatDuration(summary?.remainingSeconds ?? 0)}
        </span>

        {live && (
          <button
            type="button"
            onClick={endSession}
            className="btn btn-secondary !min-h-[30px] flex-none px-2.5 text-[11.5px]"
          >
            <span className="hidden sm:inline">{t("social.endSession")}</span>
            <span className="sm:hidden">■</span>
          </button>
        )}
      </div>
    </div>
  );
}
