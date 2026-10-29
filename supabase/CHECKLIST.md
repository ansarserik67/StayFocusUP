# Supabase project checklist — Stay Focused

Work top to bottom. Every box is a real, verifiable step; the code side of each
one links to the file that depends on it. The prose guide lives in
[../README.md](../README.md#supabase-setup-real-google-oauth--cloud-sync).

## 0. Before any of this

- [ ] App runs locally: `npm run dev` → `http://localhost:3100` shows the app in
      **local demo mode** (Google button disabled, everything else usable).
- [ ] `npm run db:verify` passes — `schema.sql` is applied to a local PostgreSQL
      instance and asserted (see [Verifying the schema locally](#verifying-the-schema-locally)).

## 1. Create the project

- [ ] Create a project at <https://supabase.com> (free tier is enough).
- [ ] Note **Project URL** and **anon public key**: *Project Settings → API*.
- [ ] Confirm **Database password** is stored somewhere safe (only needed for
      direct SQL access, never for the app).
- [ ] In **SQL editor**, paste [`schema.sql`](schema.sql) in full and run it.
- [ ] Run it a **second time** — it must succeed without changes (it is
      idempotent: `if not exists` / `drop policy if exists` everywhere).
- [ ] *Table editor* shows `profiles`, `workout_logs`, `tasks`, `daily_stats`,
      each with the shield icon (RLS enabled).

## 2. Database verification (paste into SQL editor)

- [ ] Four tables have RLS on:

```sql
select relname, relrowsecurity from pg_class
where relname in ('profiles','workout_logs','tasks','daily_stats');
-- all four must return t
```

- [ ] Each table has exactly one owner-only policy:

```sql
select tablename, policyname from pg_policies
where schemaname = 'public' order by tablename;
-- profiles: "profiles: owner only" (+ workout_logs, tasks, daily_stats)
```

- [ ] The profile trigger exists:

```sql
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```

- [ ] The `authenticated` role can actually read and write:

```sql
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'authenticated';
-- select, insert, update, delete on all four tables
```

## 3. Google as the sign-in provider

- [ ] In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
      create an **OAuth client ID** of type *Web application*.
- [ ] Authorized JavaScript origins: `http://localhost:3000` and the deployed origin.
- [ ] Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] Supabase **Authentication → Providers → Google**: enabled, client ID and secret pasted.
- [ ] Supabase **Authentication → URL Configuration**:
  - [ ] Site URL = `http://localhost:3000` (switch to production origin before launch).
  - [ ] Redirect URLs contain `http://localhost:3000/auth/callback`.
  - [ ] Redirect URLs contain `https://your-domain/auth/callback`.

## 4. Keys in the app

- [ ] `cp .env.example .env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- [ ] `.env.local` is untracked (never committed, never pasted in chat).
- [ ] Restart `npm run dev`; the sign-in card now shows **Continue with Google**.
- [ ] Only the **anon** key is used in the browser. No `service_role` key
      anywhere in this repository — it must never ship to a client.

## 5. End-to-end verification

- [ ] Sign in with Google on `localhost`; you land on `/dashboard` as a real user.
- [ ] *Table editor → profiles* contains a row for your `auth.users` id.
- [ ] Complete one workout; `workout_logs` gains a row and
      `profiles.time_left_seconds` grows by 1800.
- [ ] Finish a task; `daily_stats.tasks_done` increments for today.
- [ ] Open a second browser profile (or another machine), sign in with Google:
      budget, streak, energy, pet, tasks and workout history all appear
      (restored by `pullRemote` → `mergeRemote`).
- [ ] Change language to **KK** on device 2 → `profiles.language = 'kk'`;
      device 1 keeps running without crash.
- [ ] Sign out; `/dashboard` returns to the sign-in gate.

## 6. Row level security smoke test

- [ ] In the SQL editor, as a second user you must see **zero** rows of the
      first user (RLS is `auth.uid() = user_id` on every table):

```sql
-- simulate user A
set request.jwt.claim.sub = '<uuid-of-user-A>';
set role authenticated;
select count(*) from profiles;   -- 1 (own row only)
select count(*) from workout_logs;
reset role;
```

- [ ] Direct write to another user's row must be refused:

```sql
set request.jwt.claim.sub = '<uuid-of-user-A>';
set role authenticated;
update tasks set title = 'hacked' where user_id = '<uuid-of-user-B>';
-- 0 rows
reset role;
```

## 7. Before going to production

- [ ] Site URL and redirect URLs updated to the deployed origin.
- [ ] Google Cloud origins/redirects updated to the deployed origin.
- [ ] Apply `schema.sql` on the production project (same file, same order).
- [ ] Repeat section 5 against the production URL.

---

## Verifying the schema locally

No Docker or Supabase CLI is required. `npm run db:verify` boots an in-process
PostgreSQL (PGlite) with a Supabase-compatible `auth` stub — `auth.users`,
`auth.uid()` and the `anon` / `authenticated` / `service_role` roles — then
applies [`schema.sql`](schema.sql) exactly as written and asserts:

- every table, index, policy, grant, function and trigger exists;
- the file applies **twice** without error (idempotency);
- `on_auth_user_created` provisions a profile for a new auth user;
- the backfill creates profiles for users that predate the schema;
- `touch_updated_at` bumps `updated_at`;
- `authenticated` sees only its own rows and cannot touch another user's;
- the `language`, `theme` and `time_left_seconds` checks actually reject bad data.

It is a faithful Postgres, but it is **not** Supabase: GoTrue (real Google
OAuth), Storage, Realtime and Supabase's own API layer are out of scope. That
is what sections 3, 5 and 6 cover against a real project.