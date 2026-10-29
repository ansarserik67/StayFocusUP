/**
 * Applies supabase/schema.sql to a local PostgreSQL and asserts that every
 * object, trigger, policy and constraint it promises actually exists.
 *
 * There is no Docker or Supabase CLI dependency: PGlite is real PostgreSQL
 * (compiled to WASM) running in this process, and this script first builds the
 * small part of Supabase that schema.sql expects — the `auth` schema with
 * `auth.users`, `auth.uid()` and the API roles. Everything else, including the
 * file itself, is applied verbatim and checked.
 *
 *   npm run db:verify
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
// Supabase ships pgcrypto; PGlite ships it as an optional contrib extension.
// Registering it lets `create extension if not exists "pgcrypto"` resolve the
// same way it does on the hosted platform.
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = fileURLToPath(new URL("..", import.meta.url));
const schemaSql = readFileSync(`${root}supabase/schema.sql`, "utf8");

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EARLY_USER = "11111111-1111-4111-8111-111111111111";

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  ✗ ${name}`);
    console.log(`      ${error.message}`);
  }
}

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

const db = new PGlite({ extensions: { pgcrypto } });

/* -------------------------------------------------------------------------- */
/* Supabase bootstrap: what the hosted platform provides before schema.sql    */
/* -------------------------------------------------------------------------- */

await db.exec(`
  create schema if not exists auth;

  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  do $$
  begin
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin;
    end if;
  end $$;

  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to authenticated;

  -- A user that predates the schema: only the backfill block can give them a
  -- profile, because the trigger does not exist yet at this point.
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${EARLY_USER}', 'early@bird.test',
     '{"full_name": "Early Bird", "avatar_url": "https://example.com/e.png"}'::jsonb);
`);

console.log("supabase/schema.sql");

/* -------------------------------------------------------------------------- */
/* 1. The file applies, twice                                                 */
/* -------------------------------------------------------------------------- */

await check("schema.sql applies cleanly to a fresh database", async () => {
  await db.exec(schemaSql);
});

await check("schema.sql is idempotent (second run changes nothing)", async () => {
  await db.exec(schemaSql);
});

/* -------------------------------------------------------------------------- */
/* 2. Objects                                                                 */
/* -------------------------------------------------------------------------- */

async function count(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return Number(rows[0].n);
}

await check("all four tables exist", async () => {
  const n = await count(`
    select count(*)::int as n from information_schema.tables
    where table_schema = 'public'
      and table_name in ('profiles','workout_logs','tasks','daily_stats');
  `);
  ok(n === 4, `expected 4 tables, found ${n}`);
});

await check("row level security is enabled on every table", async () => {
  const n = await count(`
    select count(*)::int as n from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in ('profiles','workout_logs','tasks','daily_stats')
      and relrowsecurity;
  `);
  ok(n === 4, `expected 4 tables with RLS, found ${n}`);
});

await check("each table has exactly one owner-only policy", async () => {
  const { rows } = await db.query(`
    select tablename, policyname from pg_policies
    where schemaname = 'public' order by tablename;
  `);
  ok(rows.length === 4, `expected 4 policies, found ${rows.length}`);
  const expected = {
    profiles: "profiles: owner only",
    workout_logs: "workout_logs: owner only",
    tasks: "tasks: owner only",
    daily_stats: "daily_stats: owner only",
  };
  for (const row of rows) {
    ok(expected[row.tablename] === row.policyname,
      `unexpected policy ${row.tablename}.${row.policyname}`);
  }
});

await check("the three supporting indexes exist", async () => {
  const n = await count(`
    select count(*)::int as n from pg_indexes
    where schemaname = 'public'
      and indexname in ('workout_logs_user_day_idx','tasks_user_date_idx','daily_stats_user_day_idx');
  `);
  ok(n === 3, `expected 3 indexes, found ${n}`);
});

await check("handle_new_user and touch_updated_at exist", async () => {
  const n = await count(`
    select count(*)::int as n from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('handle_new_user','touch_updated_at');
  `);
  ok(n === 2, `expected 2 functions, found ${n}`);
});

await check("both triggers are registered", async () => {
  const n = await count(`
    select count(*)::int as n from pg_trigger
    where tgname in ('on_auth_user_created','profiles_touch_updated_at')
      and not tgisinternal;
  `);
  ok(n === 2, `expected 2 triggers, found ${n}`);
});

await check("authenticated can select, insert, update and delete all tables", async () => {
  const n = await count(`
    select count(*)::int as n from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
      and table_name in ('profiles','workout_logs','tasks','daily_stats')
      and privilege_type in ('SELECT','INSERT','UPDATE','DELETE');
  `);
  ok(n === 16, `expected 16 grants, found ${n}`);
});

/* -------------------------------------------------------------------------- */
/* 3. The user-provisioning path                                              */
/* -------------------------------------------------------------------------- */

await check("backfill creates a profile for a user that predates the schema", async () => {
  const { rows } = await db.query(
    "select email, full_name, avatar_url, language, theme from profiles where id = $1",
    [EARLY_USER],
  );
  ok(rows.length === 1, "profile row was not backfilled");
  ok(rows[0].full_name === "Early Bird", `full_name is ${rows[0].full_name}`);
  ok(rows[0].language === "en" && rows[0].theme === "dark", "defaults not applied");
});

await check("the trigger provisions a profile for a new Google user", async () => {
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'new@user.test', '{"full_name": "New User", "avatar_url": "https://example.com/n.png"}'::jsonb)`,
    [USER_A],
  );
  const { rows } = await db.query(
    "select email, full_name, time_left_seconds, streak, energy_points from profiles where id = $1",
    [USER_A],
  );
  ok(rows.length === 1, "trigger did not create a profile");
  ok(rows[0].full_name === "New User", `full_name is ${rows[0].full_name}`);
  ok(Number(rows[0].time_left_seconds) === 3600, "default budget is not 3600");
  ok(Number(rows[0].streak) === 0 && Number(rows[0].energy_points) === 30, "bad defaults");
});

await check("the trigger also fires for a metadata-less signup", async () => {
  await db.query(
    `insert into auth.users (id, email) values ($1, 'no.meta@test.dev')`,
    [USER_B],
  );
  const { rows } = await db.query(
    "select full_name from profiles where id = $1",
    [USER_B],
  );
  ok(rows.length === 1, "no profile for metadata-less user");
  ok(rows[0].full_name === "no.meta", `full_name is ${rows[0].full_name}`);
});

await check("touch_updated_at bumps updated_at on every profile write", async () => {
  await db.query(
    "update profiles set updated_at = '2000-01-01T00:00:00Z' where id = $1",
    [USER_A],
  );
  await db.query("update profiles set full_name = 'Renamed' where id = $1", [USER_A]);
  const { rows } = await db.query(
    "select full_name, updated_at > '2001-01-01T00:00:00Z'::timestamptz as bumped from profiles where id = $1",
    [USER_A],
  );
  ok(rows[0].full_name === "Renamed", "update was lost");
  ok(rows[0].bumped === true, "updated_at was not touched");
});

/* -------------------------------------------------------------------------- */
/* 4. Constraints                                                             */
/* -------------------------------------------------------------------------- */

await check("language is restricted to en / ru / kk", async () => {
  try {
    await db.query("update profiles set language = 'de' where id = $1", [USER_A]);
  } catch {
    return;
  }
  throw new Error("language check constraint did not reject 'de'");
});

await check("theme is restricted to dark / light", async () => {
  try {
    await db.query("update profiles set theme = 'neon' where id = $1", [USER_A]);
  } catch {
    return;
  }
  throw new Error("theme check constraint did not reject 'neon'");
});

await check("time_left_seconds must stay within 0..86400", async () => {
  try {
    await db.query("update profiles set time_left_seconds = 999999 where id = $1", [USER_A]);
  } catch {
    return;
  }
  throw new Error("range check rejected nothing");
});

await check("task kind is restricted to focus / task / workout", async () => {
  try {
    await db.query(
      `insert into tasks (user_id, title, date, kind)
       values ($1, 'Bad kind', current_date, 'laundry')`,
      [USER_A],
    );
  } catch {
    return;
  }
  throw new Error("kind check constraint did not reject 'laundry'");
});

/* -------------------------------------------------------------------------- */
/* 5. Row level security, as the `authenticated` role                         */
/* -------------------------------------------------------------------------- */

await check("seed rows for two users are accepted", async () => {
  await db.query(
    `insert into tasks (user_id, title, date, start_time, duration_minutes, kind)
     values ($1, 'A task', current_date, '10:00', 45, 'focus'),
            ($2, 'B task', current_date, '11:00', 30, 'task')`,
    [USER_A, USER_B],
  );
  await db.query(
    `insert into workout_logs (user_id, exercise, reps, duration_seconds, day)
     values ($1, 'pushup', 15, 180, current_date)`,
    [USER_A],
  );
});

async function asUser(userId) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
}

await check("RLS hides every other user's rows", async () => {
  await asUser(USER_A);
  const profiles = await count("select count(*)::int as n from profiles");
  const tasks = await count("select count(*)::int as n from tasks");
  const workouts = await count("select count(*)::int as n from workout_logs");
  await db.exec("reset role");
  ok(profiles === 1, `expected 1 visible profile, saw ${profiles}`);
  ok(tasks === 1, `expected 1 visible task, saw ${tasks}`);
  ok(workouts === 1, `expected 1 visible workout, saw ${workouts}`);
});

await check("cross-user UPDATE and DELETE leave the other user's data alone", async () => {
  await asUser(USER_A);
  await db.query(
    "update tasks set title = 'tampered' where user_id = $1",
    [USER_B],
  );
  await db.query("delete from workout_logs where user_id = $1", [USER_B]);
  await db.exec("reset role");

  const task = await db.query("select title from tasks where user_id = $1", [USER_B]);
  const workouts = await count(
    "select count(*)::int as n from workout_logs where user_id = $1",
    [USER_B],
  );
  ok(task.rows[0].title === "B task", `foreign task was renamed to ${task.rows[0].title}`);
  ok(workouts === 0, "a foreign workout row was deleted");
});

await check("inserting a row under another user_id is refused", async () => {
  await asUser(USER_A);
  let refused = false;
  try {
    await db.query(
      `insert into tasks (user_id, title, date) values ($1, 'Spoofed', current_date)`,
      [USER_B],
    );
  } catch {
    refused = true;
  }
  await db.exec("reset role");
  ok(refused, "with check policy allowed writing as another user");
});

await check("the owner can still write their own rows", async () => {
  await asUser(USER_A);
  await db.query(
    `insert into daily_stats (user_id, day, screen_seconds, workouts)
     values ($1, current_date, 600, 1)`,
    [USER_A],
  );
  await db.query(
    `update tasks set done = true where user_id = $1 and title = 'A task'`,
    [USER_A],
  );
  await db.exec("reset role");

  const stats = await count(
    "select count(*)::int as n from daily_stats where user_id = $1",
    [USER_A],
  );
  const done = await db.query(
    "select done from tasks where user_id = $1 and title = 'A task'",
    [USER_A],
  );
  ok(stats === 1, "own daily_stats row did not land");
  ok(done.rows[0]?.done === true, "own task update did not land");
});

await db.close();

console.log("");
if (failures.length > 0) {
  console.log(`${failures.length} check(s) failed, ${passed} passed`);
  process.exit(1);
}
console.log(`all ${passed} schema checks passed`);