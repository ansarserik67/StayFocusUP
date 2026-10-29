"use client";

import { useMemo, useRef, useState } from "react";
import {
  Apple,
  Camera,
  Check,
  Circle,
  Flame,
  Gamepad2,
  Heart,
  ImagePlus,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  X,
  Zap,
} from "lucide-react";

import { WeeklyChart } from "@/components/charts/WeeklyChart";
import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { PetAvatar } from "@/components/pet/PetAvatar";
import { Modal } from "@/components/ui/Modal";
import { WEEKDAYS, formatDate, formatMinutes } from "@/lib/i18n";
import { addDays, lastDays, weekTotals } from "@/lib/state";
import { FEED_COST, PLAY_COST, petMood } from "@/lib/types";

export default function PetPage() {
  const {
    t,
    lang,
  } = useLang();
  const {
    state,
    feedPet,
    playPet,
    renamePet,
    today,
    addRoutine,
    removeRoutine,
    submitRoutinePhoto,
    verifyRoutine,
    rejectRoutine,
    feedPetByRoutines,
    routinesVerified,
    fedViaRoutinesToday,
    getRoutineLog,
  } = useFocus();
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const petName = state.pet.name || t("pet.defaultName");
  const mood = petMood(state.pet.happiness);
  const totals = useMemo(() => weekTotals(state, today), [state, today]);
  const history = useMemo(() => lastDays(state, 28, today), [state, today]);
  const lifetimeReps = state.workouts.reduce((sum, log) => sum + log.reps, 0);
  const lifetimeEarned = state.workouts.reduce((sum, log) => sum + log.rewardSeconds, 0);
  const level = Math.max(1, Math.floor((state.bestStreak + state.workouts.length) / 4) + 1);
  const fedToday = fedViaRoutinesToday || state.pet.lastFedDay === today;
  const leading = history[0]?.weekday ?? 0;
  const cells: Array<(typeof history)[number] | null> = [
    ...Array.from({ length: leading }, () => null),
    ...history,
  ];

  const heatColor = (reps: number, workouts: number, tasks: number) => {
    const score = reps / 15 + workouts + tasks / 2;
    if (score <= 0) return "var(--surface-2)";
    if (score < 1) return "color-mix(in srgb, var(--emerald) 30%, transparent)";
    if (score < 2.5) return "color-mix(in srgb, var(--emerald) 55%, transparent)";
    return "var(--emerald)";
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald">
            {t("pet.title")}
          </p>
          <h1 className="text-page mt-1.5">{t("pet.subtitle")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip !border-amber/30 !bg-amber/10 !text-amber">
            <Flame size={12} /> {t("dash.streakDays", { count: state.streak })}
          </span>
          <span className="chip">
            <Trophy size={12} className="text-indigo" /> {t("pet.level", { level })}
          </span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        {/* pet stage */}
        <section className="card ring-grad relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-cyan/10 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
              <Sparkles size={12} />
              {t(`pet.mood.${mood}`)}
            </span>

            <div className="relative mt-2">
              <PetAvatar happiness={state.pet.happiness} size={250} />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface/80 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                {t("pet.happiness")} {state.pet.happiness}%
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <h2 className="font-display text-[26px] font-extrabold">{petName}</h2>
              <button
                type="button"
                onClick={() => {
                  setDraftName(state.pet.name || t("pet.defaultName"));
                  setRenameOpen(true);
                }}
                className="btn-icon !h-8 !w-8"
                aria-label={t("pet.rename")}
              >
                <Pencil size={13} />
              </button>
            </div>

            <div className="mt-3 w-full max-w-[360px]">
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald to-cyan transition-[width] duration-500"
                  style={{ width: `${state.pet.happiness}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-ink-mute">
                <span>0</span>
                <span>{t("pet.happiness")}</span>
                <span>100</span>
              </div>
            </div>

            <div className="mt-5 grid w-full grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-surface-2/50 p-2.5">
                <p className="font-display text-[20px] font-extrabold leading-none">{state.energy}</p>
                <p className="mt-1 text-[10px] text-ink-mute">{t("pet.energy")}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/50 p-2.5">
                <p className="font-display text-[20px] font-extrabold leading-none">{state.streak}</p>
                <p className="mt-1 text-[10px] text-ink-mute">{t("pet.streak")}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/50 p-2.5">
                <p className="font-display text-[20px] font-extrabold leading-none">{state.bestStreak}</p>
                <p className="mt-1 text-[10px] text-ink-mute">{t("pet.best")}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {/* care */}
          <section className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-card">Дневные рутины</h2>
                <p className="mt-1 text-[11.5px] text-ink-mute">
                  Выполни рутины, сделай фотоотчёт, подтверди выполнение — только тогда можно покормить питомца.
                </p>
              </div>
              <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald">
                <Zap size={12} /> {state.energy}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={routineTitle}
                onChange={(e) => setRoutineTitle(e.target.value)}
                placeholder="Например: заправить кровать, сделать зарядку, почистить зубы"
                className="field-input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (!routineTitle.trim()) return;
                  addRoutine(routineTitle);
                  setRoutineTitle("");
                }}
                className="btn btn-primary"
              >
                <Plus size={16} /> Добавить
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {state.routines.length === 0 ? (
                <p className="text-[11.5px] text-ink-mute">Добавь свои дневные рутины. Для каждой нужно прикрепить фотоотчёт и подтвердить выполнение.</p>
              ) : (
                state.routines.map((routine) => {
                  const log = getRoutineLog(routine.id);
                  return (
                    <div
                      key={routine.id}
                      className="rounded-2xl border border-line bg-surface-2/40 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold">{routine.title}</p>
                          <p className="mt-0.5 text-[10.5px] text-ink-mute">
                            {log.status === "verified"
                              ? "Выполнено и подтверждено"
                              : log.status === "submitted"
                                ? "Фотоотчёт отправлен, нужно подтвердить"
                                : "Требуется фотоотчёт и подтверждение"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRoutine(routine.id)}
                          className="btn-icon !h-8 !w-8"
                          aria-label="Удалить рутину"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {log.status === "verified" ? (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald">
                          <ShieldCheck size={14} />
                          <span>Верифицировано — питомец готов к кормлению</span>
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                submitRoutinePhoto(routine.id, String(reader.result));
                                setPhotoOpen(routine.id);
                              };
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="btn btn-secondary"
                          >
                            <ImagePlus size={16} />
                            {log.photoDataUrl ? "Изменить фотоотчёт" : "Прикрепить фотоотчёт"}
                          </button>
                          {log.photoDataUrl ? (
                            <button
                              type="button"
                              onClick={() => setPhotoOpen(routine.id)}
                              className="btn btn-ghost"
                            >
                              <Camera size={16} /> Посмотреть фото
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => verifyRoutine(routine.id)}
                            disabled={routine.needsPhoto && !log.photoDataUrl}
                            className="btn btn-primary"
                          >
                            <Check size={16} /> Подтвердить выполнение
                          </button>
                          {log.status === "submitted" ? (
                            <button
                              type="button"
                              onClick={() => rejectRoutine(routine.id)}
                              className="btn btn-ghost"
                            >
                              <X size={16} /> Отклонить и пересдать
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-surface-2/40 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold">Кормление питомца по рутинам</p>
                  <p className="mt-0.5 text-[10.5px] text-ink-mute">
                    Питомец получит корм только когда все обязательные рутины за сегодня верифицированы.
                  </p>
                </div>
                <span className={`chip !py-0.5 !text-[10px] ${fedViaRoutinesToday ? "!border-emerald/30 !text-emerald" : ""}`}>
                  <Apple size={11} /> {fedViaRoutinesToday ? "Уже покормлен сегодня" : routinesVerified ? "Готово к кормлению" : "Нужно завершить рутины"}
                </span>
              </div>
              <button
                type="button"
                onClick={feedPetByRoutines}
                disabled={!routinesVerified || fedViaRoutinesToday}
                className="btn btn-primary mt-3 w-full"
              >
                <Apple size={17} />
                {fedViaRoutinesToday ? "Питомец покормлен по рутинам" : routinesVerified ? "Покормить питомца (+энергия и счастье)" : "Сначала выполни и подтверди все рутины"}
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={feedPet}
                disabled={state.energy < FEED_COST}
                className="group rounded-2xl border border-line bg-surface-2/40 p-3.5 text-left transition hover:border-emerald/40 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/12 text-emerald">
                  <Apple size={17} />
                </span>
                <p className="mt-2 text-[13px] font-semibold">Доп. корм за энергию</p>
                <p className="text-[10.5px] text-ink-mute">
                  {FEED_COST} {t("pet.energy")} · +10% {t("pet.happiness").toLowerCase()}
                </p>
              </button>

              <button
                type="button"
                onClick={playPet}
                disabled={state.energy < PLAY_COST}
                className="group rounded-2xl border border-line bg-surface-2/40 p-3.5 text-left transition hover:border-cyan/40 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/12 text-cyan">
                  <Gamepad2 size={17} />
                </span>
                <p className="mt-2 text-[13px] font-semibold">{t("pet.play")}</p>
                <p className="text-[10.5px] text-ink-mute">
                  {PLAY_COST} {t("pet.energy")} · +6% {t("pet.happiness").toLowerCase()}
                </p>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] text-ink-mute">
              <span className={`chip !py-0.5 !text-[10px] ${fedToday ? "!border-emerald/30 !text-emerald" : ""}`}>
                <Check size={11} /> {fedToday ? "Питомец покормлен сегодня" : "Корм по рутинам — приоритетный способ"}
              </span>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-mute">
              Чтобы питомец кушал — выполняй дневные рутины, прикрепляй фотоотчёт и подтверждай выполнение. Только после верификации всех обязательных рутин можно покормить его.
            </p>
          </section>

          {/* stats summary */}
          <section className="grid grid-cols-2 gap-2.5">
            {[
              {
                icon: Heart,
                label: t("pet.weekAvg"),
                value: `${Math.round(totals.screenSeconds / 7 / 60)} ${t("common.minutes")}`,
              },
              {
                icon: Trophy,
                label: t("pet.workoutsWeek"),
                value: `${totals.workouts}`,
              },
              {
                icon: Zap,
                label: t("pet.repsWeek"),
                value: `${totals.reps}`,
              },
              {
                icon: Flame,
                label: t("pet.totalTime"),
                value: `${Math.round(lifetimeEarned / 3600)} ${t("common.hours")}`,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="card p-3.5">
                <Icon size={15} className="text-emerald" />
                <p className="font-display mt-2 text-[19px] font-extrabold leading-none">{value}</p>
                <p className="mt-1 text-[10.5px] leading-tight text-ink-mute">{label}</p>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* chart */}
      <section className="card p-5 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-card">{t("pet.statsTitle")}</h2>
            <p className="mt-1 text-[12px] text-ink-mute">{t("pet.statsSub")}</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-mute">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan" />
              {t("pet.chart.screen")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald" />
              {t("pet.chart.exercise")}
            </span>
          </div>
        </header>
        <div className="mt-3">
          <WeeklyChart height={260} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">
          <div>
            <p className="font-display text-[17px] font-extrabold">{Math.round(totals.screenSeconds / 60)}</p>
            <p className="text-[10px] text-ink-mute">{t("pet.chart.screen")} · {t("common.minutes")}</p>
          </div>
          <div>
            <p className="font-display text-[17px] font-extrabold">{totals.workouts}</p>
            <p className="text-[10px] text-ink-mute">{t("pet.workoutsWeek")}</p>
          </div>
          <div>
            <p className="font-display text-[17px] font-extrabold">{lifetimeReps}</p>
            <p className="text-[10px] text-ink-mute">{t("pet.totalReps")}</p>
          </div>
          <div>
            <p className="font-display text-[17px] font-extrabold">{formatMinutes(lifetimeEarned)}</p>
            <p className="text-[10px] text-ink-mute">{t("pet.totalTime")}</p>
          </div>
        </div>
      </section>

      {/* heatmap */}
      <section className="card p-5 sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-card">{t("pet.heatmap")}</h2>
            <p className="mt-1 text-[12px] text-ink-mute">{t("pet.heatmapSub")}</p>
          </div>
          <span className="chip !text-[10px]">
            {state.streak} 🔥 {t("pet.streak").toLowerCase()}
          </span>
        </header>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          <div className="flex flex-col gap-1.5 pr-1 text-[9px] text-ink-mute">
            {[0, 2, 4].map((index) => (
              <span key={index} className="flex h-5 items-center">
                {WEEKDAYS[lang].short[index]}
              </span>
            ))}
          </div>
          <div
            className="grid flex-1 grid-flow-col grid-rows-7 gap-1.5"
            style={{ minWidth: 224 }}
          >
            {cells.map((point, index) =>
              point ? (
                <div
                  key={point.day}
                  title={`${formatDate(lang, point.day, { month: "short", day: "numeric" })} · ${point.reps} ${t("common.reps")} · ${point.tasksDone} ${t("dash.tasksDone").toLowerCase()}`}
                  className="h-5 w-full rounded-[5px] border border-line/60 transition hover:scale-110"
                  style={{ background: heatColor(point.reps, point.workouts, point.tasksDone) }}
                />
              ) : (
                <div key={`blank-${index}`} className="h-5 w-full" />
              ),
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-ink-mute">
          <span>{formatDate(lang, addDays(today, -27), { month: "short", day: "numeric" })}</span>
          <span>{t("common.today")}</span>
        </div>
      </section>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} size="sm" labelledBy="rename-title">
        <h2 id="rename-title" className="text-card">
          {t("pet.rename")}
        </h2>
        <label className="field-label mt-4" htmlFor="pet-name">
          {t("pet.namePlaceholder")}
        </label>
        <input
          id="pet-name"
          value={draftName}
          maxLength={24}
          onChange={(event) => setDraftName(event.target.value)}
          className="field-input"
          placeholder={t("pet.namePlaceholder")}
          autoFocus
        />
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              renamePet(draftName);
              setRenameOpen(false);
            }}
            className="btn btn-primary flex-1"
          >
            {t("common.save")}
          </button>
          <button type="button" onClick={() => setRenameOpen(false)} className="btn btn-secondary flex-1">
            {t("common.cancel")}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!photoOpen}
        onClose={() => setPhotoOpen(null)}
        size="lg"
        labelledBy="routine-photo-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="routine-photo-title" className="text-card">
            Фотоотчёт по рутине
          </h2>
          <button type="button" onClick={() => setPhotoOpen(null)} className="btn-icon">
            <X size={16} />
          </button>
        </div>
        {photoOpen ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
            <img
              src={getRoutineLog(photoOpen).photoDataUrl || ""}
              alt="Фотоотчёт по рутине"
              className="max-h-[70vh] w-full object-contain bg-surface-2"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
