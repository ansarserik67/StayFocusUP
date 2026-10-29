"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Eye,
  Hourglass,
  Info,
  ScanFace,
  Sparkles,
  Timer,
} from "lucide-react";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { AppCard } from "@/components/social/AppCard";
import { BrandIcon } from "@/components/social/BrandIcon";
import { TimeBlockedModal } from "@/components/social/TimeBlockedModal";
import { Toggle } from "@/components/ui/Toggle";
import { formatDuration } from "@/lib/i18n";
import { useSocialLaunch } from "@/lib/use-social-launch";
import { appLimitSeconds, appRemainingSeconds, appUsedSeconds } from "@/lib/state";
import { SOCIAL_APPS } from "@/lib/social";
import { DAILY_SECONDS } from "@/lib/types";

export default function SocialPage() {
  const {
    state,
    now,
    remaining,
    earned,
    todayScreenSeconds,
    sessionActive,
    endSession,
    summary,
    updateSettings,
  } = useFocus();
  const { t } = useLang();
  const { launch, blocked, blockedAppName, closeBlocked } = useSocialLaunch();

  const locked = remaining <= 0;
  const percent = Math.max(0, Math.min(1, remaining / DAILY_SECONDS));

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald">
            {t("social.title")}
          </p>
          <h1 className="text-page mt-1.5">{t("social.subtitle")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.settings.grayscale && (
            <span className="chip !border-indigo/30 !bg-indigo/10 !text-indigo">
              <Eye size={12} />
              {t("social.detoxBadge")}
            </span>
          )}
          <span className={`chip ${locked ? "!border-rose/30 !bg-rose/10 !text-rose" : "!border-emerald/30 !bg-emerald/10 !text-emerald"}`}>
            <Clock3 size={12} />
            {formatDuration(remaining)} {t("social.remaining").toLowerCase()}
          </span>
        </div>
      </header>

      {/* session banner */}
      {sessionActive && (
        <div className="card !border-cyan/30 bg-cyan/5 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-cyan/15 text-cyan">
              <span className="absolute inset-0 animate-ping rounded-full bg-cyan/20" />
              <Timer size={18} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink">{t("social.sessionTitle")}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">{t("social.sessionText")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono font-display text-[20px] font-extrabold text-cyan">
              {formatDuration(remaining)}
            </span>
            <button type="button" onClick={endSession} className="btn btn-secondary !min-h-[38px] text-[12px]">
              {t("social.endSession")}
            </button>
          </div>
        </div>
      )}

      {summary && !sessionActive && (
        <div className="card flex flex-wrap items-center justify-between gap-2 p-3.5">
          <p className="flex items-center gap-2 text-[12.5px] text-ink-soft">
            <Hourglass size={15} className="text-amber" />
            {t("social.welcomeBack", {
              minutes: `${summary.bufferMinutes} ${t("common.minutes")}`,
            })}
          </p>
          <span className="chip !text-[10.5px]">
            {formatDuration(summary.remainingSeconds)} {t("social.remaining").toLowerCase()}
          </span>
        </div>
      )}

      {/* budget */}
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="eyebrow text-emerald">{t("social.budget")}</span>
            <p className="mono font-display mt-2 text-[44px] font-extrabold leading-none sm:text-[54px]">
              {formatDuration(remaining)}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-ink-mute">
              <span>
                {t("social.spentToday")}:{" "}
                <strong className="font-semibold text-ink-soft">
                  {formatDuration(todayScreenSeconds)}
                </strong>
              </span>
              <span>
                {t("dash.earnedToday")}:{" "}
                <strong className="font-semibold text-emerald">+{Math.round(earned / 60)} {t("common.minutes")}</strong>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/workout" className="btn btn-primary">
              <ScanFace size={16} />
              {t("dash.earnTime")}
            </Link>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event("stay-focused:break"))
              }
              className="btn btn-secondary"
            >
              {t("dash.breakCta")}
            </button>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${
                locked
                  ? "bg-gradient-to-r from-rose to-amber"
                  : "progress-shine"
              }`}
              style={{ width: `${percent * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-mute">
            <span>0</span>
            <span>{formatDuration(DAILY_SECONDS)}</span>
          </div>
        </div>

        {locked && (
          <p className="relative mt-4 flex items-start gap-2 rounded-xl border border-amber/25 bg-amber/8 p-3 text-[12px] leading-relaxed text-amber">
            <Hourglass size={15} className="mt-0.5 flex-none" />
            {t("dash.lockedHint")}
          </p>
        )}
      </section>

      {/* launchers */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-card">{t("social.unlockHint")}</h2>
            <p className="mt-1 text-[12px] text-ink-mute">{t("social.usesBudget")}</p>
          </div>
          <span className="hidden text-[11px] text-ink-mute sm:block">
            {SOCIAL_APPS.length} apps
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
          {SOCIAL_APPS.map((app) => {
            const left = appRemainingSeconds(state, app.id, now);
            return (
              <AppCard
                key={app.id}
                app={app}
                locked={locked}
                limitHit={!locked && left <= 0}
                remaining={left}
                onOpen={launch}
              />
            );
          })}
        </div>
      </section>

      {/* per-app daily quotas */}
      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-cyan/12 text-cyan">
            <Timer size={17} />
          </span>
          <div>
            <h3 className="text-[14px] font-bold">{t("social.limitsTitle")}</h3>
            <p className="mt-1 max-w-[54ch] text-[11.5px] leading-relaxed text-ink-mute">
              {t("social.limitsDesc")}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-line">
          {SOCIAL_APPS.map((app) => {
            const minutes = Math.round(appLimitSeconds(state, app.id) / 60);
            const options = Array.from(new Set([10, 15, 20, 30, 45, 60, 90, minutes])).sort(
              (a, b) => a - b,
            );
            return (
              <div
                key={app.id}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-white"
                    style={{ background: app.tint }}
                  >
                    <BrandIcon id={app.id} size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{app.name}</p>
                    <p className="text-[10.5px] text-ink-mute">
                      {formatDuration(appUsedSeconds(state, app.id))} / {minutes} {t("common.minutes")}
                    </p>
                  </div>
                </div>
                <select
                  aria-label={`${app.name} — ${t("social.limitsTitle")}`}
                  value={minutes}
                  onChange={(event) =>
                    updateSettings({
                      limits: {
                        ...state.settings.limits,
                        [app.id]: Number(event.target.value),
                      },
                    })
                  }
                  className="flex-none rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-ink"
                >
                  {options.map((value) => (
                    <option key={value} value={value}>
                      {value} {t("common.minutes")}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-indigo/12 text-indigo">
                <Eye size={17} />
              </span>
              <div>
                <h3 className="text-[14px] font-bold">{t("settings.detox")}</h3>
                <p className="mt-1 max-w-[42ch] text-[11.5px] leading-relaxed text-ink-mute">
                  {t("settings.detoxDesc")}
                </p>
              </div>
            </div>
            <Toggle
              checked={state.settings.grayscale}
              onChange={(value) => updateSettings({ grayscale: value })}
              label={t("settings.detox")}
            />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-amber/12 text-amber">
              <Info size={17} />
            </span>
            <div>
              <h3 className="text-[14px] font-bold">{t("social.budget")}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{t("social.note")}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/12 text-emerald">
            <Sparkles size={15} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold">{t("workout.streakNote")}</p>
            <p className="text-[11px] text-ink-mute">
              {t("workout.reward")} · {t("workout.claimEnergy", { energy: 20 })}
            </p>
          </div>
        </div>
        <Link href="/workout" className="btn btn-ghost !min-h-[38px] text-[12px]">
          {t("workout.again")}
          <ArrowRight size={14} />
        </Link>
      </section>

      <TimeBlockedModal open={blocked} onClose={closeBlocked} appName={blockedAppName} />
    </div>
  );
}
