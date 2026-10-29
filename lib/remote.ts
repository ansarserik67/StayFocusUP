"use client";

/**
 * Supabase write-through helpers.
 *
 * The local store is always the source of truth for the running app; when a
 * real Supabase project is configured these calls mirror profile snapshots,
 * tasks and workout logs so a signed-in account keeps its history. All calls
 * are no-ops without a configured client, and failures never break offline use.
 */

import type { Lang } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { profileFromState, type RemoteProfile, type RemoteSnapshot } from "@/lib/state";
import type { DayStat, FocusState, Task, WorkoutLog } from "@/lib/types";

function client() {
  return getSupabase();
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXERCISES = new Set(["pushup", "squat", "jumpingjack"]);

function emptySnapshot(): RemoteSnapshot {
  return { profile: null, history: {}, workouts: [], tasks: [] };
}

export async function pushProfile(
  userId: string,
  email: string,
  fullName: string,
  avatarUrl: string | null,
  state: FocusState,
  lang: Lang,
  theme: "light" | "dark",
): Promise<void> {
  const supabase = client();
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      ...profileFromState(state, lang, theme),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function pushTasks(userId: string, tasks: Task[]): Promise<void> {
  const supabase = client();
  if (!supabase || tasks.length === 0) return;
  const { error } = await supabase.from("tasks").upsert(
    tasks.map((task) => ({
      id: task.id,
      user_id: userId,
      title: task.title,
      date: task.date,
      start_time: task.time || null,
      duration_minutes: task.durationMin,
      kind: task.kind,
      done: task.done,
      created_at: task.createdAt,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function deleteRemoteTask(userId: string, taskId: string): Promise<void> {
  const supabase = client();
  if (!supabase) return;
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId);
  if (error) throw error;
}

export async function pushWorkout(userId: string, log: WorkoutLog): Promise<void> {
  const supabase = client();
  if (!supabase) return;
  const { error } = await supabase.from("workout_logs").upsert(
    {
      id: log.id,
      user_id: userId,
      exercise: log.exercise,
      reps: log.reps,
      duration_seconds: log.durationSeconds,
      reward_seconds: log.rewardSeconds,
      energy: log.energy,
      performed_at: log.at,
      day: log.day,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function pushDailyStat(
  userId: string,
  day: string,
  stat: DayStat,
): Promise<void> {
  const supabase = client();
  if (!supabase) return;
  const { error } = await supabase.from("daily_stats").upsert(
    {
      user_id: userId,
      day,
      screen_seconds: stat.screenSeconds,
      workout_seconds: stat.workoutSeconds,
      reps: stat.reps,
      workouts: stat.workouts,
      tasks_done: stat.tasksDone,
    },
    { onConflict: "user_id,day" },
  );
  if (error) throw error;
}

interface TaskRow {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  kind: string;
  done: boolean;
  created_at: string;
}

export async function loadRemoteTasks(userId: string, since: string): Promise<Task[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,date,start_time,duration_minutes,kind,done,created_at")
    .eq("user_id", userId)
    .gte("date", since)
    .order("date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.start_time ?? "",
    durationMin: row.duration_minutes,
    kind: row.kind === "focus" || row.kind === "workout" ? row.kind : "task",
    done: row.done,
    createdAt: row.created_at,
  }));
}

interface ProfileRow {
  budget_day: string | null;
  time_left_seconds: number | null;
  streak: number | null;
  best_streak: number | null;
  last_streak_day: string | null;
  energy_points: number | null;
  pet_happiness: number | null;
  pet_name: string | null;
  language: string | null;
  theme: string | null;
  updated_at: string | null;
}

interface StatRow {
  day: string;
  screen_seconds: number | null;
  workout_seconds: number | null;
  reps: number | null;
  workouts: number | null;
  tasks_done: number | null;
}

interface WorkoutRow {
  id: string;
  day: string;
  exercise: string;
  reps: number | null;
  duration_seconds: number | null;
  reward_seconds: number | null;
  energy: number | null;
  performed_at: string | null;
}

function mapProfile(row: ProfileRow | null): RemoteProfile | null {
  if (!row || !row.budget_day || !DAY_PATTERN.test(row.budget_day)) return null;
  return {
    budget_day: row.budget_day,
    time_left_seconds: Math.max(0, Number(row.time_left_seconds) || 0),
    streak: Math.max(0, Number(row.streak) || 0),
    best_streak: Math.max(0, Number(row.best_streak) || 0),
    last_streak_day:
      row.last_streak_day && DAY_PATTERN.test(row.last_streak_day)
        ? row.last_streak_day
        : null,
    energy_points: Math.max(0, Number(row.energy_points) || 0),
    pet_happiness: Math.max(0, Math.min(100, Number(row.pet_happiness) || 0)),
    pet_name: typeof row.pet_name === "string" ? row.pet_name : "",
    language: row.language === "ru" || row.language === "kk" ? row.language : "en",
    theme: row.theme === "light" ? "light" : "dark",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

/**
 * Reads everything this account owns back from Supabase: the profile snapshot,
 * the calendar, the daily stats and the workout history. RLS scopes every row
 * to the signed-in user, and the extra `user_id` filter keeps that intent
 * explicit in the query itself.
 */
export async function pullRemote(
  userId: string,
  since: string,
): Promise<RemoteSnapshot> {
  const supabase = client();
  if (!supabase) return emptySnapshot();

  const [profileResult, statResult, workoutResult, tasks] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "budget_day,time_left_seconds,streak,best_streak,last_streak_day,energy_points,pet_happiness,pet_name,language,theme,updated_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("daily_stats")
      .select("day,screen_seconds,workout_seconds,reps,workouts,tasks_done")
      .eq("user_id", userId)
      .gte("day", since),
    supabase
      .from("workout_logs")
      .select("id,day,exercise,reps,duration_seconds,reward_seconds,energy,performed_at")
      .eq("user_id", userId)
      .gte("day", since)
      .order("performed_at", { ascending: false })
      .limit(200),
    loadRemoteTasks(userId, since),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (statResult.error) throw statResult.error;
  if (workoutResult.error) throw workoutResult.error;

  const history: Record<string, DayStat> = {};
  for (const row of (statResult.data ?? []) as StatRow[]) {
    if (!row?.day || !DAY_PATTERN.test(row.day)) continue;
    history[row.day] = {
      screenSeconds: Math.max(0, Number(row.screen_seconds) || 0),
      workoutSeconds: Math.max(0, Number(row.workout_seconds) || 0),
      reps: Math.max(0, Number(row.reps) || 0),
      workouts: Math.max(0, Number(row.workouts) || 0),
      tasksDone: Math.max(0, Number(row.tasks_done) || 0),
    };
  }

  const workouts = ((workoutResult.data ?? []) as WorkoutRow[])
    .filter(
      (row) =>
        row?.id &&
        DAY_PATTERN.test(row.day ?? "") &&
        EXERCISES.has(row.exercise),
    )
    .map(
      (row): WorkoutLog => ({
        id: row.id,
        at: typeof row.performed_at === "string" ? row.performed_at : `${row.day}T00:00:00.000Z`,
        day: row.day,
        exercise: row.exercise as WorkoutLog["exercise"],
        reps: Math.max(0, Number(row.reps) || 0),
        durationSeconds: Math.max(0, Number(row.duration_seconds) || 0),
        rewardSeconds: Math.max(0, Number(row.reward_seconds) || 0),
        energy: Math.max(0, Number(row.energy) || 0),
      }),
    );

  return {
    profile: mapProfile((profileResult.data ?? null) as ProfileRow | null),
    history,
    workouts,
    tasks,
  };
}
