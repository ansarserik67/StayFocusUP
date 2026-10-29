"use client";

import Link from "next/link";
import {
  ArrowRight,
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

function StatTile({
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
    <div className="card card-hover flex items-center gap-3.5 p-4">
      <span className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl ${toneClass}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[21px] font-extrabold leading-none">{value}</p>
        <p className="mt-1 truncate text-[11.5px] font-medium text-ink-soft">{label}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-ink-mute">{hint}</p>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { toggleTask } = useFocus();
  const { t } = useLang();

  return (
    <li className="group flex items-center gap-2.5 rounded-xl px-1.5 py-2 transition hover:bg-surface-2/60">
      <button
        type="button"
        onClick={() => toggleTask(task.id)}
        aria-label={task.done ? t("cal.markUndone") : t("cal.markDone")}
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border transition ${
          task.done
            ? "border-emerald bg-emerald text-[#052019]"
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
          <span>{task.durationMin} {t("common.minutes")}</span>
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
    updateSettings,
    sessionActive,
    locked,
  } = useFocus();
  const { launch, blocked, blockedAppName, closeBlocked } = useSocialLaunch();

  const firstName = user?.name.split(/\s+/)[0] ?? "";
  const percent = Math.max(0, Math.min(1, remaining / DAILY_SECONDS));
  const completedTasks = todayTasks.filter((task) => task.done).length;
  const mood = petMood(state.pet.happiness);
  const petName = state.pet.name || t("pet.defaultName");

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald">
            {t("dash.subtitle")}
          </p>
          <h1 className="text-page mt-1.5">
            {t(greetingKey(new Date().getHours()))},{" "}
            <span className="text-grad">{firstName}</span>
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-mute">
            {formatDate(lang, new Date(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip !border-amber/30 !bg-amber/10 !text-amber">
            <Flame size={12} />
            {t("dash.streakDays", { count: state.streak })}
          </span>
          <span className="chip">
            <Sparkles size={12} className="text-emerald" />
            {mood === "happy" ? t("pet.mood.happy") : mood === "ok" ? t("pet.mood.ok") : t("pet.mood.sad")}
          </span>
        </div>
      </header>

      {/* budget hero + stats */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card ring-grad relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />

          <div className="relative flex flex-col items-center gap-5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
            <div className="min-w-0">
              <span className="eyebrow flex items-center gap-2 text-emerald">
                <Timer size={13} />
                {t("dash.budgetTitle")}
              </span>
              <p className="mono font-display mt-2 text-[42px] font-extrabold leading-none tracking-tight sm:text-[50px]">
                {formatDuration(remaining)}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-soft">{t("dash.timeLeft")}</p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
                  +{Math.round(earned / 60)} {t("common.minutes")} {t("dash.earnedToday").toLowerCase()}
                </span>
                {sessionActive && (
                  <span className="chip !border-cyan/30 !bg-cyan/10 !text-cyan">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
                    {t("dash.sessionActive")}
                  </span>
                )}
                {locked && (
                  <span className="chip !border-rose/30 !bg-rose/10 !text-rose">
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

            <ProgressRing
              progress={percent}
              size={142}
              stroke={9}
              label={`${Math.round(percent * 100)}%`}
            >
              <span className="font-display text-[22px] font-extrabold leading-none">
                {Math.round(percent * 100)}%
              </span>
              <span className="mt-1 text-[9.5px] uppercase tracking-[0.14em] text-ink-mute">
                {t("social.remaining")}
              </span>
            </ProgressRing>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <StatTile
            icon={Flame}
            label={t("dash.streak")}
            value={`${state.streak}`}
            hint={t("pet.best") + `: ${state.bestStreak}`}
            tone="amber"
          />
          <StatTile
            icon={Zap}
            label={t("dash.energy")}
            value={`${state.energy}`}
            hint={t("pet.energyHint")}
            tone="emerald"
          />
          <StatTile
            icon={Dumbbell}
            label={t("dash.workouts")}
            value={`${workoutsToday}`}
            hint="+30 min / set"
            tone="cyan"
          />
          <StatTile
            icon={CheckCircle2}
            label={t("dash.tasksDone")}
            value={`${completedTasks}/${todayTasks.length}`}
            hint={t("common.today")}
            tone="indigo"
          />
        </div>
      </div>

      {/* chart + today */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-5 sm:p-6">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-card">{t("dash.weeklyTitle")}</h2>
              <p className="mt-1 text-[12px] text-ink-mute">{t("dash.weeklySub")}</p>
            </div>
            <Link href="/pet" className="btn-icon" aria-label={t("pet.statsTitle")}>
              <ArrowRight size={16} />
            </Link>
          </header>
          <div className="mt-3">
            <WeeklyChart height={210} />
          </div>
        </section>

        <section className="card flex flex-col p-5 sm:p-6">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-card">{t("dash.todayTitle")}</h2>
              <p className="mt-1 text-[12px] text-ink-mute">
                {t("cal.totalPlanned")}: {todayTasks.length}
              </p>
            </div>
            <Link href="/calendar" className="btn-icon" aria-label={t("dash.addTask")}>
              <Plus size={16} />
            </Link>
          </header>

          {todayTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                <Leaf size={20} />
              </span>
              <p className="mt-3 max-w-[30ch] text-[12.5px] leading-relaxed text-ink-mute">
                {t("dash.todayEmpty")}
              </p>
              <Link href="/calendar" className="btn btn-secondary mt-4 !min-h-[38px] text-[12px]">
                <Plus size={14} />
                {t("dash.addTask")}
              </Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-0.5">
              {todayTasks.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* quick launcher + pet + wellbeing */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="card p-5 sm:p-6 xl:col-span-2">
          <header className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-card">{t("dash.quickLaunch")}</h2>
              <p className="mt-1 text-[12px] text-ink-mute">{t("social.unlockHint")}</p>
            </div>
            <Link href="/social" className="text-[12px] font-semibold text-emerald hover:underline">
              {t("social.title")}
            </Link>
          </header>
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
        </section>

        <Link href="/pet" className="card card-hover relative overflow-hidden p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-card">{t("dash.petTitle")}</h2>
              <p className="mt-1 text-[12px] text-ink-mute">{t("pet.subtitle")}</p>
            </div>
            <span className="chip !text-[10px]">{t(`pet.mood.${mood}`)}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <PetAvatar happiness={state.pet.happiness} size={112} />
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-[17px] font-extrabold">{petName}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald to-cyan"
                  style={{ width: `${state.pet.happiness}%` }}
                />
              </div>
              <p className="mt-1 text-[10.5px] text-ink-mute">
                {t("pet.happiness")} {state.pet.happiness}%
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald">
                {t("dash.petCta")} <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-cyan/12 text-cyan">
              <Wind size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-bold">{t("dash.breakTitle")}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{t("dash.breakText")}</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("stay-focused:break"))}
                className="mt-2.5 text-[12px] font-semibold text-cyan hover:underline"
              >
                {t("dash.breakCta")} →
              </button>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-indigo/12 text-indigo">
                <Sparkles size={17} />
              </span>
              <div>
                <h3 className="text-[14px] font-bold">{t("dash.detoxTitle")}</h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">{t("dash.detoxText")}</p>
              </div>
            </div>
            <Toggle
              checked={state.settings.grayscale}
              onChange={(value) => updateSettings({ grayscale: value })}
              label={t("dash.detoxTitle")}
            />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-emerald/12 text-emerald">
              <Timer size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-bold">{t("dash.audioTitle")}</h3>
              <p className="mb-3 mt-1 text-[11.5px] leading-relaxed text-ink-mute">{t("dash.audioText")}</p>
              <AudioControls compact />
            </div>
          </div>
        </section>
      </div>

      <TimeBlockedModal open={blocked} onClose={closeBlocked} appName={blockedAppName} />
    </div>
  );
}
