/** Domain types shared by the reducer, providers and screens. */

export type ExerciseId = "pushup" | "squat" | "jumpingjack";
export type TaskKind = "focus" | "task" | "workout";
export type AmbientTrack = "off" | "lofi" | "rain";
export type RoutineStatus = "pending" | "submitted" | "verified" | "rejected";

export interface WorkoutLog {
  id: string;
  /** ISO timestamp. */
  at: string;
  day: string;
  exercise: ExerciseId;
  reps: number;
  durationSeconds: number;
  rewardSeconds: number;
  energy: number;
}

export interface Task {
  id: string;
  title: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Optional local start time, HH:mm. */
  time: string;
  durationMin: number;
  kind: TaskKind;
  done: boolean;
  createdAt: string;
}

export interface Routine {
  id: string;
  title: string;
  /** If true, the pet will only be fed after this routine is verified today. */
  required: boolean;
  /** Must attach a photo report to submit for verification. */
  needsPhoto: boolean;
  /** Reward energy granted when this routine becomes verified. */
  rewardEnergy: number;
  createdAt: string;
}

export interface RoutineLog {
  id: string;
  routineId: string;
  day: string;
  status: RoutineStatus;
  photoDataUrl: string | null;
  /** Perceptual hash of the accepted photo — used to reject reuse. */
  photoHash: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  /** Comma-separated reason codes when the automatic check rejected the photo. */
  note: string | null;
}

export interface DayStat {
  screenSeconds: number;
  workoutSeconds: number;
  reps: number;
  workouts: number;
  tasksDone: number;
}

export interface Session {
  startedAt: number;
  endsAt: number;
  budgetSeconds: number;
  /** Social app this session is charging, when it belongs to one. */
  app?: string;
}

export interface PetState {
  name: string;
  happiness: number;
  lastFedDay: string | null;
  /** Day when pet was last fed via verified routines. */
  fedViaRoutinesDay: string | null;
}

export interface SettingsState {
  grayscale: boolean;
  track: AmbientTrack;
  volume: number;
  notifications: boolean;
  quoteNotifications: boolean;
  /** How many motivational quotes land per day (0 turns them off). */
  quotesPerDay: number;
  breakReminders: boolean;
  /** Daily limit in minutes for a single social app id. */
  limits: Record<string, number>;
}

export interface FocusState {
  version: 3;
  /** Day that owns `timeLeftSeconds`. */
  day: string;
  timeLeftSeconds: number;
  session: Session | null;
  streak: number;
  bestStreak: number;
  lastStreakDay: string | null;
  energy: number;
  pet: PetState;
  workouts: WorkoutLog[];
  tasks: Task[];
  routines: Routine[];
  routineLogs: RoutineLog[];
  history: Record<string, DayStat>;
  /** Day that owns `appUsage`. */
  appDay: string;
  /** Seconds spent today inside each social app, keyed by app id. */
  appUsage: Record<string, number>;
  settings: SettingsState;
}

export type PetMood = "happy" | "ok" | "sad";

export const DAILY_SECONDS = 60 * 60;
/** Per-app daily limit used when the user has not chosen one yet. */
export const DEFAULT_APP_LIMIT_MINUTES = 20;
export const REWARD_SECONDS = 30 * 60;
export const WORKOUT_ENERGY = 20;
export const FEED_COST = 15;
export const FEED_HAPPINESS = 10;
export const PLAY_COST = 5;
export const PLAY_HAPPINESS = 6;
export const STORAGE_KEY = "stay-focused.state.v3";
export const AUTH_STORAGE_KEY = "stay-focused.user.v1";
export const THEME_KEY = "stay-focused.theme";
export const LANG_KEY = "stay-focused.lang";
export const HISTORY_LIMIT_DAYS = 120;

export const DEFAULT_ROUTINE_REWARD_ENERGY = 10;
export const ROUTINE_FEED_REWARD = 15;
export const ROUTINE_FEED_HAPPINESS = 12;

export function taskXp(kind: TaskKind): number {
  if (kind === "focus") return 12;
  if (kind === "workout") return 10;
  return 8;
}

export function emptyDayStat(): DayStat {
  return {
    screenSeconds: 0,
    workoutSeconds: 0,
    reps: 0,
    workouts: 0,
    tasksDone: 0,
  };
}

export function petMood(happiness: number): PetMood {
  if (happiness >= 70) return "happy";
  if (happiness >= 40) return "ok";
  return "sad";
}
