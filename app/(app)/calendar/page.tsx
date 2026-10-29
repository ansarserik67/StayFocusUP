"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Focus,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { MONTHS, WEEKDAYS, formatDate } from "@/lib/i18n";
import { dayKey } from "@/lib/state";
import { taskXp, type TaskKind } from "@/lib/types";

const KIND_META: Record<
  TaskKind,
  { icon: typeof Focus; className: string }
> = {
  focus: { icon: Focus, className: "bg-indigo/12 text-indigo" },
  task: { icon: ListChecks, className: "bg-cyan/12 text-cyan" },
  workout: { icon: Dumbbell, className: "bg-emerald/12 text-emerald" },
};

export default function CalendarPage() {
  const { t, lang } = useLang();
  const { tasks, addTask, toggleTask, deleteTask, today } = useFocus();
  const { push } = useToast();

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [kind, setKind] = useState<TaskKind>("focus");

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const first = new Date(cursor.year, cursor.month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells = useMemo(() => {
    const list: Array<{ key: string; day: number } | null> = [];
    for (let index = 0; index < lead; index += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push({ key: dayKey(new Date(cursor.year, cursor.month, day)), day });
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor.year, cursor.month, lead, daysInMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const list = map.get(task.date) ?? [];
      list.push(task);
      map.set(task.date, list);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(
    () =>
      (tasksByDay.get(selected) ?? [])
        .slice()
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
    [tasksByDay, selected],
  );

  const monthTaskCount = tasks.filter((task) => task.date.startsWith(monthPrefix)).length;
  const selectedMinutes = selectedTasks.reduce((sum, task) => sum + task.durationMin, 0);
  const doneThisMonth = tasks.filter((task) => task.date.startsWith(monthPrefix) && task.done).length;

  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => task.date >= today && !task.done)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 4),
    [tasks, today],
  );

  const openCreate = () => {
    setTitle("");
    setDate(selected);
    setTime("");
    setDuration(30);
    setKind("focus");
    setModalOpen(true);
  };

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    addTask({ title: clean, date, time, durationMin: duration, kind });
    setModalOpen(false);
    setSelected(date);
    setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 });
    push(t("cal.taskAdded", { date: formatDate(lang, date, { month: "short", day: "numeric" }) }), "success");
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald">
            {t("cal.title")}
          </p>
          <h1 className="text-page mt-1.5">{t("cal.subtitle")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip hidden sm:inline-flex">
            <CalendarDays size={12} className="text-cyan" />
            {doneThisMonth}/{monthTaskCount} {t("dash.tasksDone").toLowerCase()}
          </span>
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <Plus size={16} />
            {t("cal.addTask")}
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* month grid */}
        <section className="card p-4 sm:p-5">
          <header className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftMonth(-1)} className="btn-icon !h-8 !w-8" aria-label={t("cal.prevMonth")}>
                <ChevronLeft size={16} />
              </button>
              <h2 className="font-display min-w-[150px] text-center text-[15px] font-extrabold sm:min-w-[170px] sm:text-[17px]">
                {MONTHS[lang][cursor.month]} {cursor.year}
              </h2>
              <button type="button" onClick={() => shiftMonth(1)} className="btn-icon !h-8 !w-8" aria-label={t("cal.nextMonth")}>
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const current = new Date();
                setCursor({ year: current.getFullYear(), month: current.getMonth() });
                setSelected(dayKey(current));
              }}
              className="btn btn-ghost !min-h-[34px] !px-2.5 text-[11.5px]"
            >
              {t("cal.today")}
            </button>
          </header>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS[lang].short.map((day) => (
              <span key={day} className="pb-1 text-[10px] font-bold uppercase tracking-wide text-ink-mute">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) return <span key={`blank-${index}`} className="aspect-square rounded-lg" />;
              const dayTasks = tasksByDay.get(cell.key) ?? [];
              const done = dayTasks.filter((task) => task.done).length;
              const isToday = cell.key === today;
              const isSelected = cell.key === selected;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  aria-pressed={isSelected}
                  aria-label={formatDate(lang, cell.key, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[12.5px] transition ${
                    isSelected
                      ? "border-emerald/50 bg-emerald/12 font-bold text-ink"
                      : isToday
                        ? "border-cyan/40 bg-cyan/5 text-ink hover:border-cyan/60"
                        : "border-transparent text-ink-soft hover:border-line hover:bg-surface-2/60"
                  }`}
                >
                  <span className="mono">{cell.day}</span>
                  {dayTasks.length > 0 && (
                    <span className="mt-0.5 flex gap-0.5">
                      {dayTasks.slice(0, 3).map((task, dotIndex) => (
                        <span
                          key={dotIndex}
                          className={`h-1 w-1 rounded-full ${
                            task.done ? "bg-emerald" : "bg-amber"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                  {done > 0 && (
                    <span className="absolute right-1 top-1 text-emerald">
                      <Check size={9} strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-[10.5px] text-ink-mute lg:hidden">{t("cal.mobileHint")}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-ink-mute">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" /> {t("cal.upcoming")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> {t("cal.completed")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={12} /> {t("cal.focusHours")}: {selectedMinutes} {t("common.minutes")}
            </span>
          </div>
        </section>

        {/* selected day */}
        <div className="space-y-4">
          <section className="card p-4 sm:p-5">
            <header className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald">
                  {t("cal.selected")}
                </p>
                <h2 className="font-display mt-1 text-[17px] font-extrabold leading-tight">
                  {formatDate(lang, selected, { weekday: "long", day: "numeric", month: "long" })}
                </h2>
                <p className="mt-0.5 text-[11px] text-ink-mute">
                  {selectedTasks.length} {t("dash.tasksDone").toLowerCase()} · {selectedMinutes}{" "}
                  {t("common.minutes")}
                </p>
              </div>
              <button type="button" onClick={openCreate} className="btn-icon" aria-label={t("cal.addTask")}>
                <Plus size={16} />
              </button>
            </header>

            {selectedTasks.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                  <CalendarDays size={20} />
                </span>
                <p className="mt-3 text-[13px] font-semibold">{t("cal.emptyTitle")}</p>
                <p className="mt-1 max-w-[32ch] text-[11.5px] leading-relaxed text-ink-mute">
                  {t("cal.emptyText")}
                </p>
                <button type="button" onClick={openCreate} className="btn btn-secondary mt-3 !min-h-[36px] text-[12px]">
                  <Plus size={14} />
                  {t("cal.addTask")}
                </button>
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {selectedTasks.map((task) => {
                  const meta = KIND_META[task.kind];
                  const Icon = meta.icon;
                  return (
                    <li
                      key={task.id}
                      className={`group flex items-start gap-2.5 rounded-xl border p-2.5 transition ${
                        task.done ? "border-line/60 bg-surface-2/30" : "border-line bg-surface-2/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        aria-label={task.done ? t("cal.markUndone") : t("cal.markDone")}
                        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border transition ${
                          task.done
                            ? "border-emerald bg-emerald text-[#052019]"
                            : "border-line-strong text-transparent hover:border-emerald"
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-semibold ${task.done ? "text-ink-mute line-through" : "text-ink"}`}>
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-mute">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${meta.className}`}>
                            <Icon size={10} />
                            {t(`cal.kind.${task.kind}` as "cal.kind.focus")}
                          </span>
                          {task.time && <span className="mono">{task.time}</span>}
                          <span>{task.durationMin} {t("common.minutes")}</span>
                          <span className="text-emerald">+{taskXp(task.kind)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        aria-label={t("cal.deleteTask")}
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-ink-mute opacity-0 transition hover:bg-rose/10 hover:text-rose focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card p-4 sm:p-5">
            <h2 className="text-[13.5px] font-bold">{t("cal.upcoming")}</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-[11.5px] text-ink-mute">{t("cal.noTasks")}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {upcoming.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(task.date);
                        setCursor({
                          year: Number(task.date.slice(0, 4)),
                          month: Number(task.date.slice(5, 7)) - 1,
                        });
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium">{task.title}</span>
                        <span className="block text-[10px] text-ink-mute">
                          {formatDate(lang, task.date, { month: "short", day: "numeric" })}
                          {task.time ? ` · ${task.time}` : ""}
                        </span>
                      </span>
                      <span
                        className="h-1.5 w-1.5 flex-none rounded-full"
                        style={{
                          background:
                            task.kind === "focus"
                              ? "var(--indigo)"
                              : task.kind === "workout"
                                ? "var(--emerald)"
                                : "var(--cyan)",
                        }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="task-title" size="md">
        <h2 id="task-title" className="text-card">
          {t("cal.newTask")}
        </h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="field-label" htmlFor="task-title-input">
              {t("cal.taskTitle")}
            </label>
            <input
              id="task-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("cal.titlePlaceholder")}
              className="field-input"
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="task-date">
                {t("cal.date")}
              </label>
              <input
                id="task-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value || today)}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="task-time">
                {t("cal.time")} <span className="font-normal text-ink-mute">({t("common.optional")})</span>
              </label>
              <input
                id="task-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="field-input"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="task-duration">
                {t("cal.duration")}
              </label>
              <select
                id="task-duration"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="field-input"
              >
                {[15, 25, 30, 45, 60, 90, 120].map((value) => (
                  <option key={value} value={value}>
                    {value} {t("common.minutes")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="field-label">{t("cal.type")}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["focus", "task", "workout"] as TaskKind[]).map((item) => {
                  const Icon = KIND_META[item].icon;
                  const active = kind === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setKind(item)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition ${
                        active
                          ? "border-emerald/45 bg-emerald/10 text-ink"
                          : "border-line text-ink-soft hover:border-line-strong"
                      }`}
                    >
                      <Icon size={14} />
                      {t(`cal.kind.${item}` as "cal.kind.focus")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-emerald">
            <Check size={13} />
            {t("cal.reward", { xp: taskXp(kind) })}
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className="btn btn-primary flex-1"
          >
            <Plus size={15} />
            {t("cal.create")}
          </button>
          <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
            {t("common.cancel")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
