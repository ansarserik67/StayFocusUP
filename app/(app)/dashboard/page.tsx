"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Dumbbell,
  Flame,
  Leaf,
  Plus,
  ScanFace,
  Sparkles,
  Timer,
  Wind,
  Zap,
} from "lucide-react";

import { AudioControls } from "@/components/audio/AudioControls";
import { WeeklyChart } from "@/components/charts/WeeklyChart";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { PetAvatar } from "@/components/pet/PetAvatar";
import { AppCard } from "@/components/social/AppCard";
import { TimeBlockedModal } from "@/components/social/TimeBlockedModal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Toggle } from "@/components/ui/Toggle";
import { formatDate, formatDuration } from "@/lib/i18n";
import { useSocialLaunch } from "@/lib/use-social-launch";
import { DAILY_SECONDS, petMood, taskXp, type Task } from "@/lib/types";
import { SOCIAL_APPS } from "@/lib/social";
import { appRemainingSeconds } from "@/lib/state";

function greetingKey(hour: number) {
  if (hour < 5) return "dash.greeting.night" as const;
  if (hour < 12) return "dash.greeting.morning" as const;
  if (hour < 18) return "dash.greeting.afternoon" as const;
  if (hour < 23) return "dash.greeting.evening" as const;
  return "dash.greeting.night" as const;
}

/** Shared shell for every dashboard tile: frosted glass + hairline highlight. */
function Widget({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`card relative overflow-hidden ${padded ? "p-4 sm:p-5" : ""} ${className}`}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {children}
    </section>
  );
}

function WidgetHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-card truncate">{title}</h2>
        {sub && <p className="mt-1 text-[11.5px] leading-snug text-ink-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "cyan" | "amber" | "indigo";
}) {
  const toneClass = {
    emerald: "bg-emerald/12 text-emerald",
    cyan: "bg-cyan/12 text-cyan",
    amber: "bg-amber/12 text-amber",
    indigo: "bg-indigo/12 text-indigo",
  }[tone];

  return (
    <Widget className="card-hover">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-[13px] ${toneClass}`}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="font-display mono text-[20px] font-bold leading-none">{value}</p>
          <p className="mt-1 truncate text-[10.5px] font-medium text-ink-soft">{label}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-[10px] text-ink-mute">{hint}</p>
    </Widget>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { toggleTask } = useFocus();
  const { t } = useLang();

  return (
    <li className="group flex items-center gap-2.5 rounded-2xl px-1.5 py-2 transition hover:bg-surface-2/60">
      <button
        type="button"
        onClick={() => toggleTask(task.id)}
        aria-label={task.done ? t("cal.markUndone") : t("cal.markDone")}
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border transition ${
          task.done
            ? "border-emerald bg-emerald text-[#04150f]"
            : "border-line-strong text-transparent hover:border-emerald"
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-medium ${
            task.done ? "text-ink-mute line-through" : "text-ink"
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-mute">
          {task.time && <span className="mono">{task.time}</span>}
          <span>·</span>
          <span>
            {task.durationMin} {t("common.minutes")}
          </span>
          <span className="text-emerald">+{taskXp(task.kind)}</span>
        </p>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const {
    state,
    now,
    remaining,
    earned,
    workoutsToday,
    todayTasks,
    today,
    updateSettings,
    sessionActive,
    locked,
  } = useFocus();
  const { launch, blocked, blockedAppName, closeBlocked } = useSocialLaunch();

  const firstName = user?.name.split(/\s+/)[0] ?? "";
  const percent = Math.max(0, Math.min(1, remaining / DAILY_SECONDS));
  const completedTasks = todayTasks.filter((task) => task.done).length;
  const repsToday = state.workouts
    .filter((log) => log.day === today)
    .reduce((sum, log) => sum + log.reps, 0);
  const mood = petMood(state.pet.happiness);
  const petName = state.pet.name || t("pet.defaultName");

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="eyebrow text-emerald">{t("dash.subtitle")}</p>
          <h1 className="text-page mt-1.5 truncate">
            {t(greetingKey(new Date().getHours()))},{" "}
            <span className="text-grad">{firstName}</span>
          </h1>
          <p className="mt-1 text-[12px] text-ink-mute">
            {formatDate(lang, new Date(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip !border-amber/25 !bg-amber/10 !text-amber">
            <Flame size={11} />
            {t("dash.streakDays", { count: state.streak })}
          </span>
          <span className="chip">
            <Sparkles size={11} className="text-emerald" />
            {t(`pet.mood.${mood}`)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-12">
        {/* ---------------- timer hero ---------------- */}
        <Widget
          className="xl:col-span-8"
          padded={false}
        >
          <div className="relative grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:p-6">
            <span className="pointer-events-none absolute -left-16 -top-24 h-52 w-52 rounded-full bg-emerald/20 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-28 right-10 h-52 w-52 rounded-full bg-cyan/15 blur-3xl" />

            <div className="relative min-w-0">
              <span className="eyebrow flex items-center gap-2 text-emerald">
                <Timer size={12} />
                {t("dash.budgetTitle")}
              </span>

              <div className="mt-2 flex items-baseline gap-2">
                <p className="mono font-display text-[46px] font-bold leading-none tracking-[-0.04em] sm:text-[58px]">
                  {formatDuration(remaining)}
                </p>
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-soft">{t("dash.timeLeft")}</p>

              <div className="mt-4 h-1.5 w-full max-w-[420px] overflow-hidden rounded-full bg-surface-2">
                <div
                  className="progress-shine h-full rounded-full transition-[width] duration-700 ease-linear"
                  style={{ width: `${Math.max(percent * 100, remaining > 0 ? 2 : 0)}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="chip !border-emerald/25 !bg-emerald/10 !text-emerald">
                  +{Math.round(earned / 60)} {t("common.minutes")}{" "}
                  {t("dash.earnedToday").toLowerCase()}
                </span>
                {sessionActive && (
                  <span className="chip !border-cyan/25 !bg-cyan/10 !text-cyan">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
                    {t("dash.sessionActive")}
                  </span>
                )}
                {locked && (
                  <span className="chip !border-rose/25 !bg-rose/10 !text-rose">
                    {t("dash.lockedHint")}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/workout" className="btn btn-primary">
                  <ScanFace size={16} />
                  {t("dash.earnTime")}
                </Link>
                <Link href="/social" className="btn btn-secondary">
                  {t("dash.openHub")}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto hidden sm:block">
              <ProgressRing
                progress={percent}
                size={148}
                stroke={8}
                label={`${Math.round(percent * 100)}%`}
              >
                <span className="font-display mono text-[24px] font-bold leading-none">
                  {Math.round(percent * 100)}%
                </span>
                <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-ink-mute">
                  {t("social.remaining")}
                </span>
              </ProgressRing>
            </div>
          </div>
        </Widget>

        {/* ---------------- streak ---------------- */}
        <Widget className="xl:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-amber">{t("dash.streak")}</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display mono text-[38px] font-bold leading-none">
                  {state.streak}
                </span>
                <Flame size={13} className="text-amber/70" />
              </div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-amber/12 text-amber">
              <Flame size={20} />
            </span>
          </div>

          <div className="mt-4 flex items-end gap-1">
            {Array.from({ length: 7 }, (_, index) => {
              const filled = index < Math.min(7, state.streak);
              return (
                <span
                  key={index}
                  className={`h-8 flex-1 rounded-[6px] transition ${
                    filled
                      ? "bg-gradient-to-t from-amber/35 to-amber/80"
                      : "bg-surface-2"
                  }`}
                  style={{ opacity: filled ? 0.55 + index * 0.06 : 1 }}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-ink-mute">
            {t("pet.best")}: {state.bestStreak} · {t("dash.motivation")}
          </p>
        </Widget>

        {/* ---------------- stats ---------------- */}
        <div className="grid grid-cols-2 gap-3.5 xl:col-span-4 xl:grid-cols-1">
          <MiniStat
            icon={Zap}
            label={t("dash.energy")}
            value={`${state.energy}`}
            hint={t("pet.energyHint")}
            tone="emerald"
          />
          <MiniStat
            icon={Dumbbell}
            label={t("dash.workouts")}
            value={`${workoutsToday}`}
            hint="+30 min / set"
            tone="cyan"
          />
        </div>

        {/* ---------------- AI coach ---------------- */}
        <Widget className="xl:col-span-4">
          <div className="flex h-full flex-col">
            <WidgetHead
              title={t("workout.title")}
              sub={t("workout.subtitle")}
              action={
                <span className="chip !border-cyan/25 !bg-cyan/10 !text-cyan !text-[10px]">
                  AI
                </span>
              }
            />

            <div className="relative mt-3 flex flex-1 flex-col overflow-hidden rounded-[18px] border border-line/80 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(52,211,153,0.16),transparent_70%)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink">{t("workout.choose")}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-ink-mute">
                    {t("workout.chooseHint")}
                  </p>
                </div>
                <span className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full border border-emerald/30 bg-emerald/10 text-emerald">
                  <ScanFace size={22} />
                  <span className="absolute inset-0 animate-pulse-ring rounded-full border border-emerald/30" />
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[
                  { v: `${repsToday}`, l: t("common.reps") },
                  { v: `${workoutsToday}`, l: t("dash.workouts") },
                  { v: `${state.streak}`, l: t("pet.streak") },
                ].map((cell) => (
                  <div key={cell.l} className="min-w-0 rounded-[12px] border border-line/70 bg-surface-2/50 p-1.5">
                    <p className="font-display mono text-[15px] font-bold leading-none">{cell.v}</p>
                    <p className="mt-0.5 truncate text-[9px] text-ink-mute">{cell.l}</p>
                  </div>
                ))}
              </div>

              <Link href="/workout" className="btn btn-primary mt-3 w-full !min-h-[40px] text-[13px]">
                <ScanFace size={15} />
                {t("workout.startCamera")}
              </Link>
            </div>
          </div>
        </Widget>

        {/* ---------------- quick launch ---------------- */}
        <Widget className="xl:col-span-8">
          <WidgetHead
            title={t("dash.quickLaunch")}
            sub={t("social.unlockHint")}
            action={
              <Link
                href="/social"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald hover:underline"
              >
                {t("social.title")}
                <ArrowUpRight size={13} />
              </Link>
            }
          />
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {SOCIAL_APPS.slice(0, 3).map((app) => {
              const left = appRemainingSeconds(state, app.id, now);
              return (
                <AppCard
                  key={app.id}
                  app={app}
                  compact
                  locked={locked}
                  limitHit={!locked && left <= 0}
                  remaining={left}
                  onOpen={launch}
                />
              );
            })}
          </div>
        </Widget>

        {/* ---------------- pet ---------------- */}
        <Link href="/pet" className="xl:col-span-4">
          <Widget className="card-hover h-full">
            <WidgetHead
              title={t("dash.petTitle")}
              sub={t("pet.subtitle")}
              action={<span className="chip !text-[10px]">{t(`pet.mood.${mood}`)}</span>}
            />
            <div className="mt-2 flex items-center gap-3">
              <PetAvatar happiness={state.pet.happiness} size={96} />
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-[16px] font-bold">{petName}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald to-cyan transition-[width] duration-500"
                    style={{ width: `${state.pet.happiness}%` }}
                  />
                </div>
                <p className="mt-1 text-[10.5px] text-ink-mute">
                  {t("pet.happiness")} {state.pet.happiness}%
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald">
                  {t("dash.petCta")} <ArrowRight size={11} />
                </span>
              </div>
            </div>
          </Widget>
        </Link>

        {/* ---------------- weekly chart ---------------- */}
        <Widget className="sm:col-span-2 xl:col-span-8">
          <WidgetHead
            title={t("dash.weeklyTitle")}
            sub={t("dash.weeklySub")}
            action={
              <Link href="/pet" className="btn-icon !h-9 !w-9" aria-label={t("pet.statsTitle")}>
                <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="mt-3">
            <WeeklyChart height={200} />
          </div>
        </Widget>

        {/* ---------------- today plan ---------------- */}
        <Widget className="flex flex-col xl:col-span-4">
          <WidgetHead
            title={t("dash.todayTitle")}
            sub={`${t("cal.totalPlanned")}: ${todayTasks.length}`}
            action={
              <Link href="/calendar" className="btn-icon !h-9 !w-9" aria-label={t("dash.addTask")}>
                <Plus size={15} />
              </Link>
            }
          />

          {todayTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                <Leaf size={18} />
              </span>
              <p className="mt-2.5 max-w-[28ch] text-[12px] leading-relaxed text-ink-mute">
                {t("dash.todayEmpty")}
              </p>
              <Link href="/calendar" className="btn btn-secondary mt-3 !min-h-[36px] text-[12px]">
                <Plus size={13} />
                {t("dash.addTask")}
              </Link>
            </div>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {todayTasks.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[10.5px] text-ink-mute">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={12} className="text-indigo" />
              {completedTasks}/{todayTasks.length} {t("dash.tasksDone").toLowerCase()}
            </span>
            <Link href="/calendar" className="font-semibold text-emerald hover:underline">
              {t("nav.calendar")}
            </Link>
          </div>
        </Widget>

        {/* ---------------- wellbeing ---------------- */}
        <Widget className="xl:col-span-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[13px] bg-cyan/12 text-cyan">
              <Wind size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-semibold">{t("dash.breakTitle")}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
                {t("dash.breakText")}
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("stay-focused:break"))}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-cyan hover:underline"
              >
                {t("dash.breakCta")} <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </Widget>

        <Widget className="xl:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[13px] bg-indigo/12 text-indigo">
                <Sparkles size={16} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-semibold">{t("dash.detoxTitle")}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
                  {t("dash.detoxText")}
                </p>
              </div>
            </div>
            <Toggle
              checked={state.settings.grayscale}
              onChange={(value) => updateSettings({ grayscale: value })}
              label={t("dash.detoxTitle")}
            />
          </div>
        </Widget>

        <Widget className="xl:col-span-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[13px] bg-emerald/12 text-emerald">
              <Timer size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13.5px] font-semibold">{t("dash.audioTitle")}</h3>
              <p className="mb-3 mt-1 text-[11px] leading-relaxed text-ink-mute">
                {t("dash.audioText")}
              </p>
              <AudioControls compact />
            </div>
          </div>
        </Widget>
      </div>

      <TimeBlockedModal open={blocked} onClose={closeBlocked} appName={blockedAppName} />
    </div>
  );
}
