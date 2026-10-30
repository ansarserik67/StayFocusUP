/**
 * Pure state machinery for Stay Focused.
 *
 * Everything that decides how time, streaks, energy and the pet evolve lives
 * here so it can be exercised without a browser. The provider only persists
 * the result and derives the live countdown from `session`.
 */

import type { Lang } from "@/lib/i18n";
import {
  DAILY_SECONDS,
  DEFAULT_APP_LIMIT_MINUTES,
  DEFAULT_ROUTINE_REWARD_ENERGY,
  HISTORY_LIMIT_DAYS,
  ROUTINE_FEED_HAPPINESS,
  ROUTINE_FEED_REWARD,
  type AmbientTrack,
  type DayStat,
  type ExerciseId,
  type FocusState,
  type Routine,
  type RoutineLog,
  type RoutineStatus,
  type SettingsState,
  type Task,
  type TaskKind,
  type WorkoutLog,
  emptyDayStat,
  taskXp,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseDay(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function addDays(key: string, delta: number): string {
  const date = parseDay(key);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

/** Whole calendar days from `from` to `to`, independent of DST. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function isYesterday(day: string, today: string): boolean {
  return daysBetween(day, today) === 1;
}

/* -------------------------------------------------------------------------- */
/* Initial state                                                              */
/* -------------------------------------------------------------------------- */

export const DEFAULT_SETTINGS: SettingsState = {
  grayscale: false,
  track: "off",
  volume: 0.5,
  notifications: false,
  quoteNotifications: true,
  quotesPerDay: 1,
  breakReminders: true,
  limits: {},
};

export function createInitialState(today: string = dayKey()): FocusState {
  return {
    version: 3,
    day: today,
    timeLeftSeconds: DAILY_SECONDS,
    session: null,
    streak: 0,
    bestStreak: 0,
    lastStreakDay: null,
    energy: 30,
    pet: { name: "", happiness: 72, lastFedDay: null, fedViaRoutinesDay: null },
    workouts: [],
    tasks: [],
    routines: [],
    routineLogs: [],
    history: {},
    appDay: today,
    appUsage: {},
    settings: { ...DEFAULT_SETTINGS, limits: {} },
  };
}

/* -------------------------------------------------------------------------- */
/* Selectors                                                                  */
/* -------------------------------------------------------------------------- */

export function remainingSeconds(state: FocusState, now: number): number {
  if (!state.session) return Math.max(0, state.timeLeftSeconds);
  const raw = Math.ceil((state.session.endsAt - now) / 1000);
  return Math.max(0, Math.min(state.session.budgetSeconds, raw));
}

export function sessionConsumedSeconds(state: FocusState, now: number): number {
  if (!state.session) return 0;
  return Math.max(0, state.session.budgetSeconds - remainingSeconds(state, now));
}

/** Daily limit of a single social app, in seconds. */
export function appLimitSeconds(state: FocusState, app: string): number {
  const minutes = Number(state.settings.limits[app]);
  const safe =
    Number.isFinite(minutes) && minutes > 0
      ? Math.max(1, Math.min(720, Math.round(minutes)))
      : DEFAULT_APP_LIMIT_MINUTES;
  return safe * 60;
}

/** Seconds already spent inside a social app today. */
export function appUsedSeconds(state: FocusState, app: string): number {
  if (state.appDay !== state.day) return 0;
  return Math.max(0, state.appUsage[app] ?? 0);
}

/**
 * What is left of one app's own daily limit. While that app's session is
 * running the live countdown wins, so the number next to it counts down in
 * real time instead of jumping only when the session ends.
 */
export function appRemainingSeconds(
  state: FocusState,
  app: string,
  now: number,
): number {
  const left = Math.max(0, appLimitSeconds(state, app) - appUsedSeconds(state, app));
  if (state.session?.app === app) return Math.min(left, remainingSeconds(state, now));
  return left;
}

function recordAppUsage(
  state: FocusState,
  app: string,
  seconds: number,
  day: string,
): FocusState {
  if (seconds <= 0) return state;
  const fresh = state.appDay !== day;
  return {
    ...state,
    appDay: day,
    appUsage: fresh
      ? { [app]: seconds }
      : { ...state.appUsage, [app]: (state.appUsage[app] ?? 0) + seconds },
  };
}

export function statFor(state: FocusState, day: string): DayStat {
  return state.history[day] ?? emptyDayStat();
}

export interface WeekPoint extends DayStat {
  day: string;
  /** Monday-first index, 0..6. */
  weekday: number;
}

export function lastDays(state: FocusState, count = 7, today = dayKey()): WeekPoint[] {
  const points: WeekPoint[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const day = addDays(today, -index);
    const weekday = (parseDay(day).getDay() + 6) % 7;
    points.push({ day, weekday, ...statFor(state, day) });
  }
  return points;
}

export function weekTotals(state: FocusState, today = dayKey()) {
  const points = lastDays(state, 7, today);
  return points.reduce(
    (acc, point) => ({
      screenSeconds: acc.screenSeconds + point.screenSeconds,
      workoutSeconds: acc.workoutSeconds + point.workoutSeconds,
      reps: acc.reps + point.reps,
      workouts: acc.workouts + point.workouts,
      tasksDone: acc.tasksDone + point.tasksDone,
    }),
    emptyDayStat(),
  );
}

export function earnedToday(state: FocusState, today = dayKey()): number {
  return state.workouts
    .filter((log) => log.day === today)
    .reduce((sum, log) => sum + log.rewardSeconds, 0);
}

export function workoutsToday(state: FocusState, today = dayKey()): number {
  return state.workouts.filter((log) => log.day === today).length;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

function withHistory(
  state: FocusState,
  day: string,
  update: (stat: DayStat) => DayStat,
): FocusState {
  const current = statFor(state, day);
  return {
    ...state,
    history: { ...state.history, [day]: update({ ...current }) },
  };
}

function withActivity(state: FocusState, today: string): FocusState {
  if (state.lastStreakDay === today) return state;
  const continuing = state.lastStreakDay
    ? daysBetween(state.lastStreakDay, today) === 1
    : false;
  const streak = continuing ? state.streak + 1 : 1;
  return {
    ...state,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lastStreakDay: today,
  };
}

function pruneHistory(history: Record<string, DayStat>, today: string) {
  const entries = Object.entries(history).filter(
    ([day]) => daysBetween(day, today) <= HISTORY_LIMIT_DAYS,
  );
  return Object.fromEntries(entries);
}

function ensureRoutineLog(state: FocusState, routineId: string, today: string): RoutineLog {
  const existing = state.routineLogs.find(
    (log) => log.routineId === routineId && log.day === today,
  );
  if (existing) return existing;
  return {
    id: `${routineId}-${today}`,
    routineId,
    day: today,
    status: "pending",
    photoDataUrl: null,
    photoHash: null,
    submittedAt: null,
    verifiedAt: null,
    note: null,
  };
}

function upsertRoutineLog(
  logs: RoutineLog[],
  nextLog: RoutineLog,
): RoutineLog[] {
  const idx = logs.findIndex(
    (log) => log.routineId === nextLog.routineId && log.day === nextLog.day,
  );
  if (idx === -1) return [nextLog, ...logs].slice(0, 1000);
  const copy = [...logs];
  copy[idx] = nextLog;
  return copy;
}

export function getRoutineLog(
  state: FocusState,
  routineId: string,
  today: string,
): RoutineLog {
  const found = state.routineLogs.find(
    (log) => log.routineId === routineId && log.day === today,
  );
  if (found) return found;
  return ensureRoutineLog(state, routineId, today);
}

export function allRoutinesVerified(state: FocusState, today: string): boolean {
  // No routines configured means nothing was proven today, so the pet stays
  // hungry until the user adds at least one.
  if (state.routines.length === 0) return false;
  for (const routine of state.routines) {
    if (!routine.required) continue;
    const log = getRoutineLog(state, routine.id, today);
    if (log.status !== "verified") return false;
  }
  return true;
}

/** Starts a fresh daily budget and lets the streak lapse if a day was missed. */
export function rollover(state: FocusState, today: string): FocusState {
  if (state.day === today) return state;
  const gap = daysBetween(state.day, today);
  const streak =
    state.lastStreakDay && daysBetween(state.lastStreakDay, today) > 1
      ? 0
      : state.streak;
  const decay = Math.min(Math.max(gap, 1), 5) * 4;
  return {
    ...state,
    day: today,
    appDay: today,
    appUsage: {},
    timeLeftSeconds: DAILY_SECONDS,
    session: null,
    streak,
    pet: {
      ...state.pet,
      happiness: Math.max(10, state.pet.happiness - decay),
      fedViaRoutinesDay: null,
    },
    history: pruneHistory(state.history, today),
  };
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export type FocusAction =
  | { type: "hydrate"; state: FocusState }
  | { type: "rollover"; today: string }
  | {
      type: "startSession";
      startedAt: number;
      endsAt: number;
      budgetSeconds: number;
      app?: string;
    }
  | {
      type: "endSession";
      today: string;
      consumedSeconds: number;
    }
  | { type: "cancelSession" }
  | { type: "awardTime"; seconds: number }
  | { type: "completeWorkout"; log: WorkoutLog; today: string }
  | { type: "addTask"; task: Task }
  | { type: "toggleTask"; id: string; today: string }
  | { type: "deleteTask"; id: string }
  | { type: "addRoutine"; routine: Routine }
  | { type: "removeRoutine"; id: string }
  | {
      type: "submitRoutinePhoto";
      routineId: string;
      today: string;
      photoDataUrl: string | null;
      /** Result of the automatic photo check: a pass verifies the routine. */
      check?: { ok: boolean; reasons: string[] };
      /** Perceptual hash of the accepted frame. */
      photoHash?: string | null;
    }
  | { type: "verifyRoutine"; routineId: string; today: string }
  | { type: "rejectRoutine"; routineId: string; today: string }
  | { type: "feedPetByRoutines"; today: string }
  | { type: "feedPet"; today: string; cost: number; happiness: number }
  | { type: "playPet"; today: string; cost: number; happiness: number }
  | { type: "renamePet"; name: string }
  | { type: "patchSettings"; patch: Partial<SettingsState> }
  | { type: "mergeRemote"; remote: RemoteSnapshot; today: string }
  | { type: "reset"; today: string };

export function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "rollover":
      return rollover(state, action.today);

    case "startSession": {
      if (action.budgetSeconds <= 0) return state;
      // The shared budget keeps its own value for the whole session: what a
      // single app may spend is decided by the session, not by the pot.
      return {
        ...state,
        session: {
          startedAt: action.startedAt,
          endsAt: action.endsAt,
          budgetSeconds: action.budgetSeconds,
          ...(action.app ? { app: action.app } : {}),
        },
      };
    }

    case "endSession": {
      if (!state.session) return state;
      const consumed = Math.max(0, Math.min(state.session.budgetSeconds, action.consumedSeconds));
      const appId = state.session.app;
      const settled = {
        ...state,
        session: null,
        // The shared budget pays for what was actually used, however much of
        // the session budget was available.
        timeLeftSeconds: Math.max(0, state.timeLeftSeconds - consumed),
      };
      return withHistory(
        appId ? recordAppUsage(settled, appId, consumed, action.today) : settled,
        action.today,
        (stat) => ({ ...stat, screenSeconds: stat.screenSeconds + consumed }),
      );
    }

    case "cancelSession":
      return state.session ? { ...state, session: null } : state;


    case "awardTime": {
      if (action.seconds <= 0) return state;
      // Earned time lands in the shared pot and, while a session runs, also
      // extends that session so it can be spent right away.
      return {
        ...state,
        timeLeftSeconds: state.timeLeftSeconds + action.seconds,
        ...(state.session
          ? {
              session: {
                ...state.session,
                budgetSeconds: state.session.budgetSeconds + action.seconds,
                endsAt: state.session.endsAt + action.seconds * 1000,
              },
            }
          : {}),
      };
    }

    case "completeWorkout": {
      const log = action.log;
      const withStreak = withActivity(state, action.today);
      const next = withHistory(
        {
          ...withStreak,
          energy: withStreak.energy + log.energy,
          pet: {
            ...withStreak.pet,
            happiness: Math.min(100, withStreak.pet.happiness + 6),
          },
          workouts: [log, ...withStreak.workouts].slice(0, 200),
          timeLeftSeconds: withStreak.timeLeftSeconds + log.rewardSeconds,
          session: withStreak.session
            ? {
                ...withStreak.session,
                endsAt: withStreak.session.endsAt + log.rewardSeconds * 1000,
                budgetSeconds:
                  withStreak.session.budgetSeconds + log.rewardSeconds,
              }
            : null,
        },
        log.day,
        (stat) => ({
          ...stat,
          workoutSeconds: stat.workoutSeconds + log.durationSeconds,
          reps: stat.reps + log.reps,
          workouts: stat.workouts + 1,
        }),
      );
      return next;
    }

    case "addTask": {
      if (state.tasks.some((task) => task.id === action.task.id)) return state;
      return { ...state, tasks: [...state.tasks, action.task].slice(-500) };
    }

    case "toggleTask": {
      const task = state.tasks.find((item) => item.id === action.id);
      if (!task) return state;
      const done = !task.done;
      const xp = taskXp(task.kind);
      const tasks = state.tasks.map((item) =>
        item.id === action.id ? { ...item, done } : item,
      );
      const withStreak = done ? withActivity({ ...state, tasks }, action.today) : { ...state, tasks };
      return withHistory(
        {
          ...withStreak,
          energy: Math.max(0, withStreak.energy + (done ? xp : -xp)),
        },
        task.date,
        (stat) => ({
          ...stat,
          tasksDone: Math.max(0, stat.tasksDone + (done ? 1 : -1)),
        }),
      );
    }

    case "deleteTask":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };

    case "addRoutine": {
      if (state.routines.some((routine) => routine.id === action.routine.id)) return state;
      return { ...state, routines: [...state.routines, action.routine] };
    }

    case "removeRoutine":
      return {
        ...state,
        routines: state.routines.filter((routine) => routine.id !== action.id),
        routineLogs: state.routineLogs.filter((log) => log.routineId !== action.id),
      };

    case "submitRoutinePhoto": {
      const currentLog = getRoutineLog(state, action.routineId, action.today);
      const routine = state.routines.find((r) => r.id === action.routineId);
      const wasVerified = currentLog.status === "verified";
      const check = action.check;

      // With an automatic verdict a routine is verified the moment the photo
      // passes, and stays rejected (with the reasons kept) when it does not.
      const status: RoutineStatus = check
        ? check.ok && action.photoDataUrl
          ? "verified"
          : "rejected"
        : routine?.needsPhoto && !action.photoDataUrl
          ? "pending"
          : "submitted";

      const now = new Date().toISOString();
      const nextLog: RoutineLog = {
        ...currentLog,
        status,
        // A rejected frame is not worth the storage: only the verdict matters.
        photoDataUrl: status === "rejected" ? null : action.photoDataUrl,
        photoHash: status === "verified" ? action.photoHash ?? null : null,
        submittedAt: now,
        verifiedAt: status === "verified" ? now : null,
        note: check && !check.ok ? check.reasons.slice(0, 4).join(",") : null,
      };

      const reward =
        status === "verified" && !wasVerified
          ? routine?.rewardEnergy ?? DEFAULT_ROUTINE_REWARD_ENERGY
          : 0;

      return {
        ...state,
        energy: state.energy + reward,
        routineLogs: upsertRoutineLog(state.routineLogs, nextLog),
      };
    }

    case "verifyRoutine": {
      const currentLog = getRoutineLog(state, action.routineId, action.today);
      if (currentLog.status !== "submitted" && currentLog.status !== "pending") return state;
      const routine = state.routines.find((r) => r.id === action.routineId);
      const nextLog: RoutineLog = {
        ...currentLog,
        status: "verified",
        verifiedAt: new Date().toISOString(),
      };
      const reward = routine?.rewardEnergy ?? DEFAULT_ROUTINE_REWARD_ENERGY;
      return {
        ...state,
        energy: state.energy + reward,
        routineLogs: upsertRoutineLog(state.routineLogs, nextLog),
      };
    }

    case "rejectRoutine": {
      const currentLog = getRoutineLog(state, action.routineId, action.today);
      const nextLog: RoutineLog = {
        ...currentLog,
        status: "rejected",
        verifiedAt: null,
      };
      return { ...state, routineLogs: upsertRoutineLog(state.routineLogs, nextLog) };
    }

    case "feedPetByRoutines": {
      if (state.pet.fedViaRoutinesDay === action.today) return state;
      if (!allRoutinesVerified(state, action.today)) return state;
      return {
        ...state,
        energy: state.energy + ROUTINE_FEED_REWARD,
        pet: {
          ...state.pet,
          happiness: Math.min(100, state.pet.happiness + ROUTINE_FEED_HAPPINESS),
          lastFedDay: action.today,
          fedViaRoutinesDay: action.today,
        },
      };
    }

    case "feedPet": {
      if (state.energy < action.cost) return state;
      return {
        ...state,
        energy: state.energy - action.cost,
        pet: {
          ...state.pet,
          happiness: Math.min(100, state.pet.happiness + action.happiness),
          lastFedDay: action.today,
        },
      };
    }

    case "playPet": {
      if (state.energy < action.cost) return state;
      return {
        ...state,
        energy: state.energy - action.cost,
        pet: {
          ...state.pet,
          happiness: Math.min(100, state.pet.happiness + action.happiness),
        },
      };
    }

    case "renamePet": {
      const name = action.name.trim().slice(0, 24);
      return { ...state, pet: { ...state.pet, name } };
    }

    case "patchSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "mergeRemote":
      return mergeRemote(state, action.remote, action.today);

    case "reset":
      return createInitialState(action.today);

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function sanitizeTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  if (!isDayKey(raw.date)) return null;
  const kind: TaskKind =
    raw.kind === "focus" || raw.kind === "workout" ? raw.kind : "task";
  const time =
    typeof raw.time === "string" && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : "";
  return {
    id: raw.id.slice(0, 80),
    title: raw.title.trim().slice(0, 200) || "Focus",
    date: raw.date,
    time,
    durationMin: clampNumber(raw.durationMin, 5, 480, 30),
    kind,
    done: raw.done === true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
  };
}

const EXERCISES: ExerciseId[] = ["pushup", "squat", "jumpingjack"];

function sanitizeWorkout(value: unknown): WorkoutLog | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !isDayKey(raw.day)) return null;
  if (!EXERCISES.includes(raw.exercise as ExerciseId)) return null;
  return {
    id: raw.id.slice(0, 80),
    at: typeof raw.at === "string" ? raw.at : new Date().toISOString(),
    day: raw.day,
    exercise: raw.exercise as ExerciseId,
    reps: clampNumber(raw.reps, 0, 500, 0),
    durationSeconds: clampNumber(raw.durationSeconds, 0, 7200, 0),
    rewardSeconds: clampNumber(raw.rewardSeconds, 0, 7200, 0),
    energy: clampNumber(raw.energy, 0, 500, 0),
  };
}

function sanitizeStat(value: unknown): DayStat {
  if (!value || typeof value !== "object") return emptyDayStat();
  const raw = value as Record<string, unknown>;
  return {
    screenSeconds: clampNumber(raw.screenSeconds, 0, 86_400, 0),
    workoutSeconds: clampNumber(raw.workoutSeconds, 0, 86_400, 0),
    reps: clampNumber(raw.reps, 0, 10_000, 0),
    workouts: clampNumber(raw.workouts, 0, 100, 0),
    tasksDone: clampNumber(raw.tasksDone, 0, 100, 0),
  };
}

function sanitizeLimits(value: unknown): Record<string, number> {
  const limits: Record<string, number> = {};
  if (!value || typeof value !== "object") return limits;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const minutes = Number(raw);
    if (!/^\w{1,20}$/.test(key) || !Number.isFinite(minutes)) continue;
    const safe = Math.round(minutes);
    if (safe >= 1) limits[key] = Math.min(720, safe);
  }
  return limits;
}

function sanitizeAppUsage(value: unknown): Record<string, number> {
  const usage: Record<string, number> = {};
  if (!value || typeof value !== "object") return usage;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const seconds = Number(raw);
    if (!/^\w{1,20}$/.test(key) || !Number.isFinite(seconds)) continue;
    usage[key] = Math.max(0, Math.min(86_400, Math.round(seconds)));
  }
  return usage;
}

function sanitizeSettings(value: unknown): SettingsState {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const track: AmbientTrack =
    raw.track === "lofi" || raw.track === "rain" ? raw.track : "off";
  return {
    grayscale: raw.grayscale === true,
    track,
    volume: Math.max(0, Math.min(1, Number(raw.volume) || 0.5)),
    notifications: raw.notifications === true,
    quoteNotifications: raw.quoteNotifications !== false,
    quotesPerDay:
      raw.quotesPerDay === undefined
        ? DEFAULT_SETTINGS.quotesPerDay
        : clampNumber(raw.quotesPerDay, 0, 12, DEFAULT_SETTINGS.quotesPerDay),
    breakReminders: raw.breakReminders !== false,
    limits: sanitizeLimits(raw.limits),
  };
}

function sanitizeRoutine(value: unknown): Routine | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  return {
    id: raw.id.slice(0, 80),
    title: raw.title.trim().slice(0, 80) || "Routine",
    required: raw.required !== false,
    needsPhoto: raw.needsPhoto !== false,
    rewardEnergy: clampNumber(raw.rewardEnergy, 0, 100, DEFAULT_ROUTINE_REWARD_ENERGY),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
  };
}

function sanitizeRoutineLog(value: unknown): RoutineLog | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.routineId !== "string") return null;
  if (!isDayKey(raw.day)) return null;
  const status: RoutineStatus =
    raw.status === "submitted" || raw.status === "verified" || raw.status === "rejected"
      ? raw.status
      : "pending";
  return {
    id: raw.id.slice(0, 120),
    routineId: raw.routineId.slice(0, 80),
    day: raw.day,
    status,
    photoDataUrl: typeof raw.photoDataUrl === "string" ? raw.photoDataUrl.slice(0, 5_000_000) : null,
    photoHash: typeof raw.photoHash === "string" ? raw.photoHash.slice(0, 32) : null,
    submittedAt: typeof raw.submittedAt === "string" ? raw.submittedAt : null,
    verifiedAt: typeof raw.verifiedAt === "string" ? raw.verifiedAt : null,
    note: typeof raw.note === "string" ? raw.note.slice(0, 200) : null,
  };
}

/** Accepts anything from localStorage and returns a state safe to render. */
export function sanitizeState(value: unknown, today: string = dayKey()): FocusState {
  const initial = createInitialState(today);
  if (!value || typeof value !== "object") return initial;
  const raw = value as Record<string, unknown>;

  const history: Record<string, DayStat> = {};
  if (raw.history && typeof raw.history === "object") {
    for (const [key, stat] of Object.entries(raw.history as Record<string, unknown>)) {
      if (!isDayKey(key)) continue;
      if (daysBetween(key, today) > HISTORY_LIMIT_DAYS || daysBetween(key, today) < -1) {
        continue;
      }
      history[key] = sanitizeStat(stat);
    }
  }

  const tasks = Array.isArray(raw.tasks)
    ? (raw.tasks.map(sanitizeTask).filter(Boolean) as Task[]).slice(-500)
    : [];
  const workouts = Array.isArray(raw.workouts)
    ? (raw.workouts.map(sanitizeWorkout).filter(Boolean) as WorkoutLog[]).slice(0, 200)
    : [];
  const routines = Array.isArray(raw.routines)
    ? (raw.routines.map(sanitizeRoutine).filter(Boolean) as Routine[])
    : [];
  const routineLogs = Array.isArray(raw.routineLogs)
    ? (raw.routineLogs.map(sanitizeRoutineLog).filter(Boolean) as RoutineLog[]).slice(-2000)
    : [];

  const petRaw =
    raw.pet && typeof raw.pet === "object" ? (raw.pet as Record<string, unknown>) : {};
  const sessionRaw =
    raw.session && typeof raw.session === "object"
      ? (raw.session as Record<string, unknown>)
      : null;
  const sessionValid =
    sessionRaw &&
    Number.isFinite(Number(sessionRaw.endsAt)) &&
    Number.isFinite(Number(sessionRaw.startedAt)) &&
    Number(sessionRaw.endsAt) > Number(sessionRaw.startedAt);

  const storedDay = isDayKey(raw.day) ? raw.day : today;
  const lastStreakDay = isDayKey(raw.lastStreakDay) ? raw.lastStreakDay : null;

  return rollover(
    {
      version: 3,
      day: storedDay,
      timeLeftSeconds: clampNumber(raw.timeLeftSeconds, 0, 86_400, DAILY_SECONDS),
      session: sessionValid
        ? {
            startedAt: Number(sessionRaw.startedAt),
            endsAt: Number(sessionRaw.endsAt),
            budgetSeconds: clampNumber(
              sessionRaw.budgetSeconds,
              0,
              86_400,
              DAILY_SECONDS,
            ),
            ...(typeof sessionRaw.app === "string" ? { app: sessionRaw.app } : {}),
          }
        : null,
      streak: clampNumber(raw.streak, 0, 10_000, 0),
      bestStreak: clampNumber(raw.bestStreak, 0, 10_000, 0),
      lastStreakDay,
      energy: clampNumber(raw.energy, 0, 100_000, initial.energy),
      pet: {
        name: typeof petRaw.name === "string" ? petRaw.name.trim().slice(0, 24) : "",
        happiness: clampNumber(petRaw.happiness, 0, 100, initial.pet.happiness),
        lastFedDay: isDayKey(petRaw.lastFedDay) ? petRaw.lastFedDay : null,
        fedViaRoutinesDay: isDayKey(petRaw.fedViaRoutinesDay)
          ? petRaw.fedViaRoutinesDay
          : null,
      },
      workouts,
      tasks,
      routines,
      routineLogs,
      history,
      appDay: isDayKey(raw.appDay) ? raw.appDay : storedDay,
      appUsage: sanitizeAppUsage(raw.appUsage),
      settings: sanitizeSettings(raw.settings),
    },
    today,
  );
}

/** The profile fields mirrored to Supabase for cross-device continuity. */
export interface RemoteProfile {
  budget_day: string;
  time_left_seconds: number;
  streak: number;
  best_streak: number;
  last_streak_day: string | null;
  energy_points: number;
  pet_happiness: number;
  pet_name: string;
  language: Lang;
  theme: "dark" | "light";
  updated_at: string;
}

export function profileFromState(
  state: FocusState,
  lang: Lang,
  theme: "dark" | "light",
): RemoteProfile {
  return {
    budget_day: state.day,
    time_left_seconds: state.timeLeftSeconds,
    streak: state.streak,
    best_streak: state.bestStreak,
    last_streak_day: state.lastStreakDay,
    energy_points: state.energy,
    pet_happiness: state.pet.happiness,
    pet_name: state.pet.name,
    language: lang,
    theme,
    updated_at: new Date().toISOString(),
  };
}

/** Everything one account has stored in Supabase, read back on sign-in. */
export interface RemoteSnapshot {
  profile: RemoteProfile | null;
  history: Record<string, DayStat>;
  workouts: WorkoutLog[];
  tasks: Task[];
}

function laterDay(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  // daysBetween(a, b) is b - a, so a non-negative result means b is later.
  return daysBetween(a, b) >= 0 ? b : a;
}

function mergeStat(local: DayStat, remote: DayStat): DayStat {
  // Per-field maximum: two devices may both have recorded the same day, and
  // adding them together would inflate the chart.
  return {
    screenSeconds: Math.max(local.screenSeconds, remote.screenSeconds),
    workoutSeconds: Math.max(local.workoutSeconds, remote.workoutSeconds),
    reps: Math.max(local.reps, remote.reps),
    workouts: Math.max(local.workouts, remote.workouts),
    tasksDone: Math.max(local.tasksDone, remote.tasksDone),
  };
}

/**
 * Folds a Supabase snapshot into the local state on sign-in.
 *
 * The local store stays the source of truth: remote values only ever fill
 * gaps or raise a value, so a restored account can never lose progress the
 * device has already earned.
 */
export function mergeRemote(
  state: FocusState,
  remote: RemoteSnapshot,
  today: string = dayKey(),
): FocusState {
  const history: Record<string, DayStat> = { ...state.history };
  for (const [day, stat] of Object.entries(remote.history)) {
    const age = daysBetween(day, today);
    if (age > HISTORY_LIMIT_DAYS || age < -1) continue;
    history[day] = history[day] ? mergeStat(history[day], stat) : stat;
  }

  const localWorkoutIds = new Set(state.workouts.map((log) => log.id));
  const workouts = [...state.workouts]
    .concat(remote.workouts.filter((log) => !localWorkoutIds.has(log.id)))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 200);

  const localTaskIds = new Set(state.tasks.map((task) => task.id));
  const tasks = [...state.tasks, ...remote.tasks.filter((task) => !localTaskIds.has(task.id))]
    .slice(-500);

  const next: FocusState = { ...state, history, workouts, tasks };
  const profile = remote.profile;
  if (!profile) return next;

  const lastStreakDay = laterDay(next.lastStreakDay, profile.last_streak_day);
  const streak = Math.max(next.streak, clampNumber(profile.streak, 0, 10_000, 0));
  const bestStreak = Math.max(next.bestStreak, clampNumber(profile.best_streak, 0, 10_000, 0));

  return {
    ...next,
    // Only today's budget is adoptable; a stale row must not resurrect an old day.
    timeLeftSeconds:
      profile.budget_day === today
        ? Math.max(
            next.timeLeftSeconds,
            clampNumber(profile.time_left_seconds, 0, 86_400, 0),
          )
        : next.timeLeftSeconds,
    streak,
    bestStreak: Math.max(bestStreak, streak),
    lastStreakDay,
    energy: Math.max(next.energy, clampNumber(profile.energy_points, 0, 100_000, 0)),
    pet: {
      ...next.pet,
      name: next.pet.name || profile.pet_name.trim().slice(0, 24),
      happiness: Math.max(
        next.pet.happiness,
        clampNumber(profile.pet_happiness, 0, 100, 0),
      ),
    },
  };
}

export function exerciseLabelKey(id: ExerciseId):
  | "workout.ex.pushup"
  | "workout.ex.squat"
  | "workout.ex.jumpingjack" {
  if (id === "squat") return "workout.ex.squat";
  if (id === "jumpingjack") return "workout.ex.jumpingjack";
  return "workout.ex.pushup";
}
