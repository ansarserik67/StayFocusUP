"use client";

import { ArrowUpRight, Lock } from "lucide-react";

import { BrandIcon } from "@/components/social/BrandIcon";
import { useLang } from "@/components/i18n/LanguageProvider";
import { formatDuration } from "@/lib/i18n";
import type { SocialApp } from "@/lib/social";

export function AppCard({
  app,
  locked,
  limitHit = false,
  remaining,
  onOpen,
  compact = false,
}: {
  app: SocialApp;
  /** The shared daily budget is gone. */
  locked: boolean;
  /** Only this app's own daily quota is gone. */
  limitHit?: boolean;
  /** What is left for this app today. */
  remaining: number;
  onOpen: (app: SocialApp) => void;
  compact?: boolean;
}) {
  const { t } = useLang();
  const closed = locked || limitHit;

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      aria-label={`${app.name} — ${closed ? t("social.locked") : t("social.open")}`}
      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
        closed
          ? "border-line bg-surface-2/35"
          : "border-line bg-surface hover:-translate-y-1 hover:border-line-strong hover:shadow-lift"
      } ${compact ? "p-3.5" : "p-4"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex flex-none items-center justify-center rounded-[14px] text-white shadow-sm ${
            compact ? "h-10 w-10" : "h-11 w-11"
          }`}
          style={{ background: closed ? "var(--line-strong)" : app.tint }}
        >
          <BrandIcon id={app.id} size={compact ? 19 : 21} />
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${
            closed ? "text-ink-mute" : "text-ink-mute group-hover:text-emerald"
          }`}
        >
          {closed ? <Lock size={12} /> : <ArrowUpRight size={13} />}
          {!compact && (closed ? t("social.locked") : t("social.open"))}
        </span>
      </div>

      <p className={`mt-3 font-display font-bold leading-tight text-ink ${compact ? "text-[13.5px]" : "text-[15px]"}`}>
        {app.name}
      </p>
      <p className="mt-0.5 text-[11.5px] text-ink-mute">
        {limitHit ? t("social.limitReached") : locked ? t("social.noTimeChip") : app.tagline}
      </p>

      {!closed && (
        <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
          {t("social.timeLeftChip", { time: formatDuration(remaining) })}
        </span>
      )}

      {closed && (
        <span className="pointer-events-none absolute -bottom-6 -right-5 text-line-strong opacity-30">
          <Lock size={64} strokeWidth={1.4} />
        </span>
      )}
    </button>
  );
}
