"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDuration } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";
import {
  deleteRemoteTask,
  pullRemote,
  pushDailyStat,
  pushProfile,
  pushTasks,
  pushWorkout,
} from "@/lib/remote";
import {
  addDays,
  appRemainingSeconds,
  createInitialState,
  dayKey,
  earnedToday,
  focusReducer,
  getRoutineLog as getRoutineLogState,
  lastDays,
  remainingSeconds,
  sanitizeState,
  sessionConsumedSeconds,
  statFor,
  workoutsToday,
  type WeekPoint,
} from "@/lib/state";
import {
  DEFAULT_ROUTINE_REWARD_ENERGY,
  FEED_COST,
  FEED_HAPPINESS,
  HISTORY_LIMIT_DAYS,
  PLAY_COST,
  PLAY_HAPPINESS,
  STORAGE_KEY,
  taskXp,
  type ExerciseId,
  type FocusState,
  type Routine,
  type RoutineLog,
  type SettingsState,
  type Task,
  type TaskKind,
  type WorkoutLog,
} from "@/lib/types";
import { allRoutinesVerified } from "@/lib/state";
import { EXERCISES, type ExerciseId as EngineExerciseId } from "@/lib/workout/engine";

export interface SessionSummary {
  consumedSeconds: number;
  bufferMinutes: number;
  remainingSeconds: number;
  /** Social app the session belonged to, when there was one. */
  app?: string | null;
}

export interface WorkoutInput {
  exercise: ExerciseId;
  reps: number;
  durationSeconds: number;
}

export interface NewTaskInput {
  title: string;
  date: string;
  time: string;
  durationMin: number;
  kind: TaskKind;
}

type RemoteStatus = "off" | "syncing" | "synced" | "error";

interface FocusValue {
  state: FocusState;
  hydrated: boolean;
  today: string;
  now: number;
  remaining: number;
  locked: boolean;
  sessionActive: boolean;
  summary: SessionSummary | null;
  timeUp: boolean;
  dismissTimeUp: () => void;
  remoteStatus: RemoteStatus;
  week: WeekPoint[];
  todayScreenSeconds: number;
  earned: number;
  workoutsToday: number;
  tasks: Task[];
  todayTasks: Task[];
  startSession: (app?: string) => boolean;
  endSession: () => void;
  cancelSession: () => void;
  completeWorkout: (input: WorkoutInput) => number;
  addTask: (input: NewTaskInput) => Task;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addRoutine: (title: string, required?: boolean, needsPhoto?: boolean) => Routine;
  removeRoutine: (id: string) => void;
  submitRoutinePhoto: (
    routineId: string,
    photoDataUrl: string | null,
    check?: { ok: boolean; reasons: string[] },
    photoHash?: string | null,
  ) => void;
  verifyRoutine: (routineId: string) => void;
  rejectRoutine: (routineId: string) => void;
  feedPetByRoutines: () => boolean;
  routinesVerified: boolean;
  fedViaRoutinesToday: boolean;
  getRoutineLog: (routineId: string) => RoutineLog;
  feedPet: () => boolean;
  playPet: () => boolean;
  renamePet: (name: string) => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  resetData: () => void;
}

const FocusContext = createContext<FocusValue | null>(null);

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/**
 * Reads the persisted store exactly once, on the client. A browsing session
 * left behind by a reload is closed here and its elapsed time is recorded, so
 * a refresh can never keep the timer running in the background.
 */
function loadInitialState(): FocusState {
  const today = dayKey();
  if (typeof window === "undefined") return createInitialState(today);
  let loaded = createInitialState(today);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = sanitizeState(JSON.parse(raw), today);
  } catch {
    /* corrupted storage — start clean */
  }
  if (loaded.session) {
    const at = Date.now();
    return focusReducer(loaded, {
      type: "endSession",
      today,
      consumedSeconds: sessionConsumedSeconds(loaded, at),
    });
  }
  return loaded;
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const { theme } = useTheme();
  const { push } = useToast();

  const [state, dispatch] = useReducer(focusReducer, undefined, loadInitialState);
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  // Only a session that runs out earns the full-screen interrupt. A cold start
  // with an empty budget keeps the launcher visible (locked) so the user can
  // still see why it is closed and tap a card for the explainer.
  const [timeUp, setTimeUp] = useState(false);
  const [remoteResult, setRemoteResult] = useState<{
    userId: string;
    status: "synced" | "error";
  } | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const remoteUserId = user?.mode === "google" ? user.id : null;
  const remoteStatus: RemoteStatus = !remoteUserId
    ? "off"
    : remoteResult?.userId === remoteUserId
      ? remoteResult.status
      : "syncing";

  /* ---------------------------------------------------------------------- */
  /* Persistence                                                            */
  /* ---------------------------------------------------------------------- */

  // The exact string this tab last wrote. Every other tab compares against it
  // so two open tabs cannot bounce the same snapshot back and forth forever.
  const lastWrittenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const raw = JSON.stringify(state);
      if (lastWrittenRef.current === raw) return;
      lastWrittenRef.current = raw;
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      /* quota or private mode — the session still works in memory */
    }
  }, [state, hydrated]);

  // Adopt what another tab persisted — but never while a session is running
  // here, and never echo the value straight back (that would be a write loop).
  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue || event.newValue === lastWrittenRef.current) return;
      if (stateRef.current.session) return;
      try {
        lastWrittenRef.current = event.newValue;
        dispatch({ type: "hydrate", state: sanitizeState(JSON.parse(event.newValue), dayKey()) });
      } catch {
        /* a half-written value from another tab — ignore, this tab keeps its own */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  /* ---------------------------------------------------------------------- */
  /* Session lifecycle                                                      */
  /* ---------------------------------------------------------------------- */

  const finalizeSession = useCallback(
    (at: number) => {
      const current = stateRef.current;
      if (!current.session) return;
      const consumed = sessionConsumedSeconds(current, at);
      const left = Math.max(0, current.timeLeftSeconds - consumed);
      dispatch({
        type: "endSession",
        today: dayKey(new Date(at)),
        consumedSeconds: consumed,
      });
      setNow(at);
      setSummary({
        consumedSeconds: consumed,
        bufferMinutes: Math.max(1, Math.round(consumed / 60)),
        remainingSeconds: left,
        app: current.session.app ?? null,
      });
      if (left <= 0) {
        setTimeUp(true);
      }
      if (consumed >= 60) {
        push(
          t("toast.sessionEnded", { time: formatDuration(left) }),
          "info",
        );
      }
    },
    [push, t],
  );

  useEffect(() => {
    if (!state.session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.session]);

  /**
   * The deadline is authoritative.
   *
   * A throttled background interval can fire late (or not at all in a window
   * that is merely sitting beside the social site), so the session is not
   * closed by a tick count — a single timeout is armed for `endsAt` itself and
   * the elapsed time is recomputed from the wall clock when it fires.
   */
  useEffect(() => {
    const session = state.session;
    if (!session) return;
    const delay = session.endsAt - Date.now();
    if (delay <= 0) {
      finalizeSession(Date.now());
      return;
    }
    // setTimeout cannot hold more than ~24.8 days; a budget never comes close.
    if (delay > 2_000_000_000) return;
    const timer = window.setTimeout(() => finalizeSession(Date.now()), delay + 40);
    return () => window.clearTimeout(timer);
  }, [state.session, finalizeSession]);

  useEffect(() => {
    const onVisibility = () => {
      const at = Date.now();
      setNow(at);
      // Going away is expected: the user is inside the social site. Coming back
      // is what ends the session, however long the tab was hidden.
      if (document.visibilityState !== "visible") return;
      finalizeSession(at);
      const today = dayKey();
      if (stateRef.current.day !== today) dispatch({ type: "rollover", today });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [finalizeSession]);

  // A hard close must not leave a half-settled session behind: write the
  // charged state synchronously so the next load resumes from a clean budget.
  useEffect(() => {
    const onPageHide = () => {
      const current = stateRef.current;
      if (!current.session) return;
      const settled = focusReducer(current, {
        type: "endSession",
        today: dayKey(),
        consumedSeconds: sessionConsumedSeconds(current, Date.now()),
      });
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settled));
      } catch {
        /* nothing else we can do while the page is going away */
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const today = dayKey();
      if (stateRef.current.day === today) return;
      // Settle the running session against yesterday before the new day resets
      // the budget, otherwise the minutes spent would simply disappear.
      finalizeSession(Date.now());
      dispatch({ type: "rollover", today });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [finalizeSession]);

  /**
   * Starts a session for one social app. The budget it may spend is the
   * smaller of what is left today overall and what is left of that app's own
   * limit, so a finished Instagram quota cannot burn the shared budget.
   */
  const startSession = useCallback((app?: string) => {
    const current = stateRef.current;
    const at = Date.now();
    const global = remainingSeconds(current, at);
    const left = app
      ? Math.min(global, appRemainingSeconds(current, app, at))
      : global;
    if (left <= 0) {
      if (global <= 0) setTimeUp(true);
      return false;
    }
    dispatch({
      type: "startSession",
      startedAt: at,
      endsAt: at + left * 1000,
      budgetSeconds: left,
      ...(app ? { app } : {}),
    });
    setNow(at);
    setSummary(null);
    return true;
  }, []);

  const endSession = useCallback(() => {
    finalizeSession(Date.now());
  }, [finalizeSession]);

  /** Discard a session without charging time (the external tab never opened). */
  const cancelSession = useCallback(() => {
    dispatch({ type: "cancelSession" });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Rewards, tasks, pet                                                    */
  /* ---------------------------------------------------------------------- */

  const completeWorkout = useCallback(
    (input: WorkoutInput) => {
      const config = EXERCISES[input.exercise as EngineExerciseId];
      const today = dayKey();
      const log: WorkoutLog = {
        id: makeId(),
        at: new Date().toISOString(),
        day: today,
        exercise: input.exercise,
        reps: input.reps,
        durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
        rewardSeconds: config.rewardSeconds,
        energy: config.energy,
      };
      dispatch({ type: "completeWorkout", log, today });
      setTimeUp(false);
      push(t("toast.timeAdded"), "success");
      if (remoteUserId) {
        pushWorkout(remoteUserId, log).catch(() =>
          setRemoteResult({ userId: remoteUserId, status: "error" }),
        );
      }
      return config.rewardSeconds;
    },
    [push, remoteUserId, t],
  );

  const addTask = useCallback((input: NewTaskInput) => {
    const task: Task = {
      id: makeId(),
      title: input.title.trim().slice(0, 200) || "Focus",
      date: input.date,
      time: input.time,
      durationMin: Math.max(5, Math.min(480, Math.round(input.durationMin))),
      kind: input.kind,
      done: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "addTask", task });
    return task;
  }, []);

  const toggleTask = useCallback(
    (id: string) => {
      const task = stateRef.current.tasks.find((item) => item.id === id);
      if (!task) return;
      dispatch({ type: "toggleTask", id, today: dayKey() });
      if (!task.done) {
        push(t("toast.taskDone", { xp: taskXp(task.kind) }), "success");
      } else {
        push(t("toast.taskUndone"), "info");
      }
    },
    [push, t],
  );

  const deleteTask = useCallback(
    (id: string) => {
      dispatch({ type: "deleteTask", id });
      if (remoteUserId) {
        deleteRemoteTask(remoteUserId, id).catch(() =>
          setRemoteResult({ userId: remoteUserId, status: "error" }),
        );
      }
    },
    [remoteUserId],
  );

  const addRoutine = useCallback(
    (title: string, required = true, needsPhoto = true) => {
      const routine: Routine = {
        id: makeId(),
        title: title.trim().slice(0, 80) || "Рутина",
        required,
        needsPhoto,
        rewardEnergy: DEFAULT_ROUTINE_REWARD_ENERGY,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "addRoutine", routine });
      return routine;
    },
    [],
  );

  const removeRoutine = useCallback((id: string) => {
    dispatch({ type: "removeRoutine", id });
  }, []);

  const submitRoutinePhoto = useCallback(
    (
      routineId: string,
      photoDataUrl: string | null,
      check?: { ok: boolean; reasons: string[] },
      photoHash?: string | null,
    ) => {
      dispatch({
        type: "submitRoutinePhoto",
        routineId,
        today: dayKey(),
        photoDataUrl,
        check,
        photoHash,
      });
    },
    [],
  );

  const verifyRoutine = useCallback((routineId: string) => {
    dispatch({ type: "verifyRoutine", routineId, today: dayKey() });
    push(t("toast.taskDone", { xp: 0 }), "success");
  }, [push, t]);

  const rejectRoutine = useCallback((routineId: string) => {
    dispatch({ type: "rejectRoutine", routineId, today: dayKey() });
  }, []);

  const feedPetByRoutines = useCallback(() => {
    const current = stateRef.current;
    const name = current.pet.name || t("pet.defaultName");
    if (current.pet.fedViaRoutinesDay === dayKey()) {
      push(t("pet.feedAlready", { name }), "info");
      return false;
    }
    if (!allRoutinesVerified(current, dayKey())) {
      push(t("pet.needRoutines"), "error");
      return false;
    }
    dispatch({ type: "feedPetByRoutines", today: dayKey() });
    push(t("pet.feedDone", { name }), "success");
    return true;
  }, [push, t]);

  const getRoutineLog = useCallback(
    (routineId: string) => getRoutineLogState(stateRef.current, routineId, dayKey()),
    [],
  );

  const feedPet = useCallback(() => {
    const current = stateRef.current;
    if (current.energy < FEED_COST) {
      push(t("pet.noEnergy"), "error");
      return false;
    }
    dispatch({
      type: "feedPet",
      today: dayKey(),
      cost: FEED_COST,
      happiness: FEED_HAPPINESS,
    });
    push(t("pet.feedDone", { name: current.pet.name || t("pet.defaultName") }), "success");
    return true;
  }, [push, t]);

  const playPet = useCallback(() => {
    const current = stateRef.current;
    if (current.energy < PLAY_COST) {
      push(t("pet.noEnergy"), "error");
      return false;
    }
    dispatch({
      type: "playPet",
      today: dayKey(),
      cost: PLAY_COST,
      happiness: PLAY_HAPPINESS,
    });
    push(t("pet.playDone", { name: current.pet.name || t("pet.defaultName") }), "success");
    return true;
  }, [push, t]);

  const renamePet = useCallback((name: string) => {
    dispatch({ type: "renamePet", name });
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    dispatch({ type: "patchSettings", patch });
  }, []);

  const resetData = useCallback(() => {
    dispatch({ type: "reset", today: dayKey() });
    setSummary(null);
    setTimeUp(false);
    push(t("toast.dataReset"), "info");
  }, [push, t]);

  const dismissTimeUp = useCallback(() => setTimeUp(false), []);

  /* ---------------------------------------------------------------------- */
  /* Optional cloud mirror                                                  */
  /* ---------------------------------------------------------------------- */

  const pushTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated || !remoteUserId || !user) return;
    // Throttle, not debounce: the budget now rewrites state every second, and
    // a trailing debounce would be postponed forever and never sync at all.
    if (pushTimerRef.current !== null) return;
    const timer = window.setTimeout(() => {
      pushTimerRef.current = null;
      const current = stateRef.current;
      Promise.all([
        pushProfile(
          remoteUserId,
          user.email,
          user.name,
          user.picture ?? null,
          current,
          lang,
          theme,
        ),
        pushTasks(remoteUserId, current.tasks),
        pushDailyStat(remoteUserId, current.day, statFor(current, current.day)),
      ])
        .then(() => setRemoteResult({ userId: remoteUserId, status: "synced" }))
        .catch(() => setRemoteResult({ userId: remoteUserId, status: "error" }));
    }, 1600);
    pushTimerRef.current = timer;
  }, [state, hydrated, remoteUserId, user, lang, theme]);

  // One pull per sign-in: the account's profile, calendar, daily stats and
  // workout history are folded into the local store, then the usual push
  // effect writes the merged result back.
  const pulledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !remoteUserId) return;
    if (pulledRef.current === remoteUserId) return;
    pulledRef.current = remoteUserId;
    const today = dayKey();
    pullRemote(remoteUserId, addDays(today, -HISTORY_LIMIT_DAYS))
      .then((snapshot) => {
        dispatch({ type: "mergeRemote", remote: snapshot, today: dayKey() });
        setRemoteResult({ userId: remoteUserId, status: "synced" });
      })
      .catch(() => setRemoteResult({ userId: remoteUserId, status: "error" }));
  }, [hydrated, remoteUserId]);

  /* ---------------------------------------------------------------------- */
  /* Derived values                                                         */
  /* ---------------------------------------------------------------------- */

  const today = dayKey();
  const remaining = remainingSeconds(state, now);
  const sessionActive = state.session !== null;
  const week = useMemo(() => lastDays(state, 7, today), [state, today]);
  const todayTasks = useMemo(
    () =>
      state.tasks
        .filter((task) => task.date === today)
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
    [state.tasks, today],
  );
  const routinesVerified = useMemo(() => allRoutinesVerified(state, today), [state, today]);
  const fedViaRoutinesToday = state.pet.fedViaRoutinesDay === today;

  const value = useMemo<FocusValue>(
    () => ({
      state,
      hydrated,
      today,
      now,
      remaining,
      locked: remaining <= 0,
      sessionActive,
      summary,
      timeUp,
      dismissTimeUp,
      remoteStatus,
      week,
      todayScreenSeconds: statFor(state, today).screenSeconds,
      earned: earnedToday(state, today),
      workoutsToday: workoutsToday(state, today),
      tasks: state.tasks,
      todayTasks,
      startSession,
      endSession,
      cancelSession,
      completeWorkout,
      addTask,
      toggleTask,
      deleteTask,
      addRoutine,
      removeRoutine,
      submitRoutinePhoto,
      verifyRoutine,
      rejectRoutine,
      feedPetByRoutines,
      routinesVerified,
      fedViaRoutinesToday,
      getRoutineLog,
      feedPet,
      playPet,
      renamePet,
      updateSettings,
      resetData,
    }),
    [
      state,
      hydrated,
      today,
      now,
      remaining,
      sessionActive,
      summary,
      timeUp,
      dismissTimeUp,
      remoteStatus,
      week,
      todayTasks,
      routinesVerified,
      fedViaRoutinesToday,
      startSession,
      endSession,
      cancelSession,
      completeWorkout,
      addTask,
      toggleTask,
      deleteTask,
      addRoutine,
      removeRoutine,
      submitRoutinePhoto,
      verifyRoutine,
      rejectRoutine,
      feedPetByRoutines,
      getRoutineLog,
      feedPet,
      playPet,
      renamePet,
      updateSettings,
      resetData,
    ],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusValue {
  const context = useContext(FocusContext);
  if (!context) throw new Error("useFocus must be used inside <FocusProvider>");
  return context;
}
