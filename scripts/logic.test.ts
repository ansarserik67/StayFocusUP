/**
 * Offline checks for the parts that must be exact: rep detection and the
 * state machine behind time, streaks, tasks and the pet.
 *
 *   npm run test:logic
 */
import assert from "node:assert/strict";

import {
  EXERCISES,
  RepCounter,
  angleBetween,
  evaluateFrame,
  syntheticFrame,
  type ExerciseId,
} from "../lib/workout/engine";
import {
  addDays,
  appLimitSeconds,
  appRemainingSeconds,
  appUsedSeconds,
  createInitialState,
  dayKey,
  focusReducer,
  mergeRemote,
  remainingSeconds,
  rollover,
  sanitizeState,
} from "../lib/state";
import { taskXp, type Task, type WorkoutLog } from "../lib/types";
import { translate, isLang, dailyQuote, formatDuration } from "../lib/i18n";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

function feed(counter: RepCounter, exercise: ExerciseId, joint: number, frames: number, options = {}) {
  let state = counter.push(evaluateFrame(exercise, syntheticFrame(exercise, joint, options)));
  for (let index = 0; index < frames; index += 1) {
    state = counter.push(evaluateFrame(exercise, syntheticFrame(exercise, joint, options)));
  }
  return state;
}

function feedJack(counter: RepCounter, spread: number, armsUp: boolean, frames: number) {
  let state = counter.push(
    evaluateFrame("jumpingjack", syntheticFrame("jumpingjack", 0, { spread, armsUp })),
  );
  for (let index = 0; index < frames; index += 1) {
    state = counter.push(
      evaluateFrame("jumpingjack", syntheticFrame("jumpingjack", 0, { spread, armsUp })),
    );
  }
  return state;
}

console.log("geometry");
test("angleBetween returns 90° and 180°", () => {
  const a = { x: 1, y: 0 };
  const b = { x: 0, y: 0 };
  const c = { x: 0, y: 1 };
  assert.ok(Math.abs(angleBetween(a, b, c) - 90) < 0.001);
  assert.ok(Math.abs(angleBetween({ x: -1, y: 0 }, b, a) - 180) < 0.001);
});

test("frames with missing landmarks are rejected as not visible", () => {
  const frame = evaluateFrame("pushup", null);
  assert.equal(frame, null);
  const invisible = syntheticFrame("pushup", 170).map((point) => ({ ...point, visibility: 0 }));
  const result = evaluateFrame("pushup", invisible);
  assert.equal(result?.visible, false);
  assert.deepEqual(result?.faults, ["notVisible"]);
});

console.log("push-ups");
test("counts full clean reps and stops at the target", () => {
  const counter = new RepCounter("pushup");
  feed(counter, "pushup", 175, 6);
  let state = counter.push(null);
  for (let rep = 0; rep < EXERCISES.pushup.requiredReps; rep += 1) {
    feed(counter, "pushup", 92, 14);
    state = feed(counter, "pushup", 172, 16);
  }
  assert.equal(state.reps, EXERCISES.pushup.requiredReps);
  assert.equal(state.rejected, 0);
  assert.equal(state.done, true);
});

test("rejects a rep with a sagging hip line", () => {
  const counter = new RepCounter("pushup");
  feed(counter, "pushup", 175, 6);
  feed(counter, "pushup", 170, 4, { sag: 0.08 });
  feed(counter, "pushup", 92, 16, { sag: 0.08 });
  const state = feed(counter, "pushup", 172, 18, { sag: 0.08 });
  assert.equal(state.reps, 0);
  assert.ok(state.rejected >= 1);
});

test("a half rep does not count", () => {
  const counter = new RepCounter("pushup");
  feed(counter, "pushup", 170, 4);
  const state = feed(counter, "pushup", 130, 20);
  assert.equal(state.reps, 0);
  assert.equal(state.phase, "top");
});

console.log("squats");
test("counts 20 squats to completion", () => {
  const counter = new RepCounter("squat");
  feed(counter, "squat", 175, 6);
  let state = counter.push(null);
  for (let rep = 0; rep < EXERCISES.squat.requiredReps; rep += 1) {
    feed(counter, "squat", 90, 14);
    state = feed(counter, "squat", 172, 16);
  }
  assert.equal(state.reps, 20);
  assert.equal(state.done, true);
});

console.log("jumping jacks");
test("requires feet open with arms overhead", () => {
  const counter = new RepCounter("jumpingjack");
  feedJack(counter, 0.05, false, 6);
  for (let rep = 0; rep < EXERCISES.jumpingjack.requiredReps; rep += 1) {
    feedJack(counter, 0.16, true, 10);
    feedJack(counter, 0.05, false, 10);
  }
  const state = counter.push(
    evaluateFrame("jumpingjack", syntheticFrame("jumpingjack", 0, { spread: 0.05 })),
  );
  assert.equal(state.reps, 20);
  assert.equal(state.done, true);
});

test("rejects jacks opened with arms down", () => {
  const counter = new RepCounter("jumpingjack");
  feedJack(counter, 0.05, false, 6);
  feedJack(counter, 0.16, false, 12);
  const state = feedJack(counter, 0.05, false, 12);
  assert.equal(state.reps, 0);
  assert.ok(state.rejected >= 1);
});

console.log("focus state");
test("session countdown is derived from the deadline", () => {
  let state = createInitialState("2026-10-24");
  const now = 1_000_000;
  state = focusReducer(state, {
    type: "startSession",
    startedAt: now,
    endsAt: now + 3_600_000,
    budgetSeconds: 3_600,
  });
  assert.equal(remainingSeconds(state, now), 3_600);
  assert.equal(remainingSeconds(state, now + 600_000), 3_000);
  assert.equal(remainingSeconds(state, now + 4_000_000), 0);
});

test("ending a session records screen time and remaining budget", () => {
  let state = createInitialState("2026-10-24");
  const now = 0;
  state = focusReducer(state, {
    type: "startSession",
    startedAt: now,
    endsAt: now + 3_600_000,
    budgetSeconds: 3_600,
  });
  state = focusReducer(state, {
    type: "endSession",
    today: "2026-10-24",
    consumedSeconds: 900,
  });
  assert.equal(state.timeLeftSeconds, 2_700);
  assert.equal(state.session, null);
  assert.equal(state.history["2026-10-24"].screenSeconds, 900);
});

test("a workout adds 30 minutes, energy, streak and history", () => {
  let state = createInitialState("2026-10-24");
  const log: WorkoutLog = {
    id: "w1",
    at: new Date().toISOString(),
    day: "2026-10-24",
    exercise: "pushup",
    reps: 15,
    durationSeconds: 90,
    rewardSeconds: 1_800,
    energy: 20,
  };
  state = focusReducer(state, { type: "completeWorkout", log, today: "2026-10-24" });
  assert.equal(state.timeLeftSeconds, 3_600 + 1_800);
  assert.equal(state.energy, 50);
  assert.equal(state.streak, 1);
  assert.equal(state.bestStreak, 1);
  assert.equal(state.history["2026-10-24"].reps, 15);
  assert.equal(state.history["2026-10-24"].workouts, 1);
  assert.equal(state.workouts[0].id, "w1");
});

test("tasks award and revoke their energy", () => {
  let state = createInitialState("2026-10-24");
  const task: Task = {
    id: "t1",
    title: "Deep work",
    date: "2026-10-24",
    time: "09:00",
    durationMin: 45,
    kind: "focus",
    done: false,
    createdAt: new Date().toISOString(),
  };
  state = focusReducer(state, { type: "addTask", task });
  state = focusReducer(state, { type: "toggleTask", id: "t1", today: "2026-10-24" });
  assert.equal(state.tasks[0].done, true);
  assert.equal(state.energy, 30 + taskXp("focus"));
  assert.equal(state.history["2026-10-24"].tasksDone, 1);
  state = focusReducer(state, { type: "toggleTask", id: "t1", today: "2026-10-24" });
  assert.equal(state.energy, 30);
  assert.equal(state.history["2026-10-24"].tasksDone, 0);
});

test("feeding costs energy and raises happiness", () => {
  let state = createInitialState("2026-10-24");
  const before = state.pet.happiness;
  state = focusReducer(state, {
    type: "feedPet",
    today: "2026-10-24",
    cost: 15,
    happiness: 10,
  });
  assert.equal(state.energy, 15);
  assert.equal(state.pet.happiness, Math.min(100, before + 10));
  assert.equal(state.pet.lastFedDay, "2026-10-24");
});

test("feeding is refused without energy", () => {
  let state = createInitialState("2026-10-24");
  state = { ...state, energy: 3 };
  const next = focusReducer(state, {
    type: "feedPet",
    today: "2026-10-24",
    cost: 15,
    happiness: 10,
  });
  assert.equal(next, state);
});

test("the streak survives one rollover and lapses after a missed day", () => {
  let state = createInitialState("2026-10-24");
  state = { ...state, streak: 4, bestStreak: 4, lastStreakDay: "2026-10-24" };
  const nextDay = rollover(state, "2026-10-25");
  assert.equal(nextDay.timeLeftSeconds, 3_600);
  assert.equal(nextDay.streak, 4);
  const afterMiss = rollover(nextDay, "2026-10-26");
  assert.equal(afterMiss.streak, 0);
  assert.ok(afterMiss.pet.happiness < nextDay.pet.happiness);
});

test("sanitizeState survives garbage and clamps values", () => {
  const dirty = {
    version: 2,
    day: "2026-10-24",
    timeLeftSeconds: 999_999,
    streak: -5,
    energy: "nope",
    pet: { happiness: 400, name: 12 },
    workouts: [{ id: 1 }],
    tasks: [{ id: "x", title: "ok", date: "not-a-date" }],
    history: { "2026-10-24": { screenSeconds: -100, reps: 3 } },
    settings: { grayscale: "yes", track: "metal", volume: 9 },
    session: { startedAt: "a", endsAt: "b" },
  };
  const state = sanitizeState(dirty, "2026-10-24");
  assert.equal(state.timeLeftSeconds, 86_400);
  assert.equal(state.streak, 0);
  assert.equal(state.energy, 30);
  assert.equal(state.pet.happiness, 100);
  assert.equal(state.pet.name, "");
  assert.equal(state.workouts.length, 0);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.history["2026-10-24"].screenSeconds, 0);
  assert.equal(state.settings.track, "off");
  assert.equal(state.settings.volume, 1);
  assert.equal(state.session, null);
});

test("dayKey uses the local calendar day", () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

console.log("per-app limits");

test("ending a session charges the app's own daily quota", () => {
  const today = dayKey();
  let state = createInitialState(today);
  state = focusReducer(state, {
    type: "startSession",
    startedAt: 1_000,
    endsAt: 61_000,
    budgetSeconds: 60,
    app: "instagram",
  });
  state = focusReducer(state, {
    type: "endSession",
    today,
    consumedSeconds: 45,
  });
  assert.equal(appUsedSeconds(state, "instagram"), 45);
  assert.equal(appUsedSeconds(state, "tiktok"), 0);
  assert.equal(state.timeLeftSeconds, 3_555);
  assert.equal(state.history[today].screenSeconds, 45);
});

test("the shared budget and the app quota are separate pots", () => {
  const today = dayKey();
  const base = createInitialState(today);
  const state = {
    ...base,
    timeLeftSeconds: 3_000,
    appDay: today,
    appUsage: { instagram: 1_740 },
    settings: { ...base.settings, limits: { instagram: 30 } },
  };
  assert.equal(appLimitSeconds(state, "instagram"), 1_800);
  assert.equal(appLimitSeconds(state, "reddit"), 1_200, "default limit is 20 min");
  assert.equal(appRemainingSeconds(state, "instagram", Date.now()), 60);
  assert.equal(appRemainingSeconds(state, "tiktok", Date.now()), 1_200);
  assert.equal(state.timeLeftSeconds, 3_000, "quota usage must not touch the shared budget");
});

test("while its session runs the app quota counts down live", () => {
  const today = dayKey();
  const started = Date.now();
  const base = createInitialState(today);
  const state = focusReducer(
    {
      ...base,
      settings: { ...base.settings, limits: { tiktok: 10 } },
    },
    {
    type: "startSession",
    startedAt: started,
    endsAt: started + 600_000,
    budgetSeconds: 600,
    app: "tiktok",
  });
  assert.equal(appRemainingSeconds(state, "tiktok", started + 120_000), 480);
  assert.equal(appRemainingSeconds(state, "instagram", started + 120_000), 1_200);
});

test("a new day clears yesterday's per-app usage", () => {
  const yesterday = "2026-10-28";
  const today = "2026-10-29";
  const state = rollover(
    {
      ...createInitialState(yesterday),
      day: yesterday,
      appDay: yesterday,
      appUsage: { instagram: 1_800 },
    },
    today,
  );
  assert.deepEqual(state.appUsage, {});
  assert.equal(state.appDay, today);
  assert.equal(appUsedSeconds(state, "instagram"), 0);
});

test("stored limits and usage are clamped on load", () => {
  const today = dayKey();
  const state = sanitizeState(
    {
      version: 2,
      day: today,
      appDay: today,
      appUsage: { instagram: -50, tiktok: 999_999, "bad key": 10 },
      settings: { limits: { instagram: 0, tiktok: 45.6, youtube: 9_999 } },
    },
    today,
  );
  assert.equal(state.appUsage.instagram, 0);
  assert.equal(state.appUsage.tiktok, 86_400);
  assert.equal(state.appUsage["bad key"], undefined);
  assert.equal(state.settings.limits.instagram, undefined, "zero is not a valid limit");
  assert.equal(state.settings.limits.tiktok, 46);
  assert.equal(state.settings.limits.youtube, 720);
  assert.equal(appLimitSeconds(state, "youtube"), 720 * 60);
});

console.log("remote sync");

test("an empty device is refilled from the cloud snapshot", () => {
  const today = dayKey();
  let local = createInitialState(today);
  local = {
    ...local,
    timeLeftSeconds: 0,
    streak: 3,
    bestStreak: 5,
    energy: 10,
    pet: { ...local.pet, happiness: 40 },
    history: {
      [today]: {
        screenSeconds: 600,
        workoutSeconds: 0,
        reps: 0,
        workouts: 0,
        tasksDone: 0,
      },
    },
  };

  const merged = mergeRemote(local, {
    profile: {
      budget_day: today,
      time_left_seconds: 1800,
      streak: 7,
      best_streak: 9,
      last_streak_day: today,
      energy_points: 55,
      pet_happiness: 60,
      pet_name: "Momo",
      language: "ru",
      theme: "dark",
      updated_at: "",
    },
    history: {
      [today]: {
        screenSeconds: 900,
        workoutSeconds: 300,
        reps: 15,
        workouts: 1,
        tasksDone: 2,
      },
      [addDays(today, -3)]: {
        screenSeconds: 1200,
        workoutSeconds: 240,
        reps: 20,
        workouts: 1,
        tasksDone: 1,
      },
    },
    workouts: [
      {
        id: "w1",
        at: `${today}T09:00:00.000Z`,
        day: today,
        exercise: "pushup",
        reps: 15,
        durationSeconds: 180,
        rewardSeconds: 1800,
        energy: 20,
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Deep work",
        date: today,
        time: "10:00",
        durationMin: 45,
        kind: "focus",
        done: true,
        createdAt: `${today}T08:00:00.000Z`,
      },
    ],
  }, today);

  assert.equal(merged.timeLeftSeconds, 1800);
  assert.equal(merged.streak, 7);
  assert.equal(merged.bestStreak, 9);
  assert.equal(merged.energy, 55);
  assert.equal(merged.pet.happiness, 60);
  assert.equal(merged.pet.name, "Momo");
  assert.equal(merged.workouts.length, 1);
  assert.equal(merged.tasks.length, 1);
  // per-field maximum, never a sum of the two devices
  assert.equal(merged.history[today].screenSeconds, 900);
  assert.equal(merged.history[today].workouts, 1);
  assert.equal(merged.history[addDays(today, -3)].reps, 20);
});

test("a stale budget row cannot resurrect yesterday's time", () => {
  const today = dayKey();
  const local = { ...createInitialState(today), timeLeftSeconds: 0 };
  const merged = mergeRemote(
    local,
    {
      profile: {
        budget_day: addDays(today, -1),
        time_left_seconds: 3600,
        streak: 4,
        best_streak: 4,
        last_streak_day: addDays(today, -1),
        energy_points: 5,
        pet_happiness: 50,
        pet_name: "",
        language: "en",
        theme: "dark",
        updated_at: "",
      },
      history: {},
      workouts: [],
      tasks: [],
    },
    today,
  );
  assert.equal(merged.timeLeftSeconds, 0);
  assert.equal(merged.streak, 4);
});

test("merge never lowers what the device already earned", () => {
  const today = dayKey();
  const local = {
    ...createInitialState(today),
    timeLeftSeconds: 2400,
    streak: 12,
    energy: 80,
  };
  const merged = mergeRemote(
    local,
    {
      profile: {
        budget_day: today,
        time_left_seconds: 300,
        streak: 2,
        best_streak: 2,
        last_streak_day: addDays(today, -4),
        energy_points: 5,
        pet_happiness: 10,
        pet_name: "",
        language: "en",
        theme: "dark",
        updated_at: "",
      },
      history: {},
      workouts: [],
      tasks: [],
    },
    today,
  );
  assert.equal(merged.timeLeftSeconds, 2400);
  assert.equal(merged.streak, 12);
  assert.equal(merged.energy, 80);
  // the later of the two devices' streak days survives
  assert.equal(merged.lastStreakDay, addDays(today, -4));
});

test("workouts and tasks are unioned by id without duplicates", () => {
  const today = dayKey();
  const log: WorkoutLog = {
    id: "w1",
    at: `${today}T09:00:00.000Z`,
    day: today,
    exercise: "squat",
    reps: 20,
    durationSeconds: 200,
    rewardSeconds: 1800,
    energy: 20,
  };
  const task: Task = {
    id: "t1",
    title: "Plank",
    date: today,
    time: "",
    durationMin: 10,
    kind: "workout",
    done: false,
    createdAt: `${today}T07:00:00.000Z`,
  };
  const local: ReturnType<typeof createInitialState> = {
    ...createInitialState(today),
    workouts: [log],
    tasks: [task],
  };
  const merged = focusReducer(local, {
    type: "mergeRemote",
    today,
    remote: {
      profile: null,
      history: {},
      workouts: [
        log,
        {
          id: "w2",
          at: `${today}T11:00:00.000Z`,
          day: today,
          exercise: "pushup",
          reps: 15,
          durationSeconds: 150,
          rewardSeconds: 1800,
          energy: 20,
        },
      ],
      tasks: [
        task,
        {
          id: "t2",
          title: "Stretch",
          date: today,
          time: "18:00",
          durationMin: 15,
          kind: "task",
          done: false,
          createdAt: `${today}T07:30:00.000Z`,
        },
      ],
    },
  });
  assert.equal(merged.workouts.length, 2);
  assert.deepEqual(
    merged.workouts.map((item) => item.id).sort(),
    ["w1", "w2"],
  );
  assert.equal(merged.tasks.length, 2);
  assert.equal(merged.tasks.filter((item) => item.id === "t1").length, 1);
});

console.log("i18n");
test("all three languages expose the same keys and interpolate", () => {
  for (const lang of ["en", "ru", "kk"] as const) {
    assert.ok(isLang(lang));
    assert.ok(translate(lang, "nav.dashboard").length > 0);
    assert.ok(translate(lang, "workout.progress", { done: 3, target: 15 }).includes("3"));
    assert.ok(dailyQuote(lang, "2026-10-24", 7).length > 0);
  }
});

test("duration formatting is stable", () => {
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(59), "00:59");
  assert.equal(formatDuration(600), "10:00");
  assert.equal(formatDuration(3_600), "1:00:00");
  assert.equal(formatDuration(-5), "00:00");
});

console.log(`\n${passed} checks passed.`);
