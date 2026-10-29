# StayFocus

> Scroll less. Live more.

A mobile-first, installable PWA that gives you **60 minutes of social feeds a
day** and makes you earn extra time with **camera-verified push-ups, squats and
jumping jacks**. Built with Next.js, MediaPipe pose tracking, Recharts and
optional Supabase (Google OAuth + cloud storage).

![Night mode](public/icons/icon-512.png)

## What is inside

| Area | Implementation |
| --- | --- |
| Theme | Night `#0F172A` + mint `#10B981` by default; day `#F8FAFC` with emerald/indigo. Header toggle, persisted, no flash on load. |
| Languages | English, Russian, Kazakh. Type-safe dictionaries; every string, quote, exercise cue and notification is translated. Persisted in the header selector. |
| Layout | Mobile bottom navigation, desktop sidebar. Five destinations: Dashboard, Social Hub, Workout AI, Pet & Stats, Calendar. Settings live in the header/avatar menu. |
| Auth | Supabase Google OAuth when keys are present. Without keys, a clearly labelled local demo mode keeps the whole app usable. |
| Social Hub | Instagram, TikTok, YouTube, X, Reddit, Facebook launcher cards. Checks the daily budget, opens the site in a new tab, runs the countdown while the app tab is hidden, blocks at zero, and catches the return via `visibilitychange`. |
| Workout AI | MediaPipe PoseLandmarker with local WASM/model (no CDN). Live skeleton overlay, rep counting for push-ups (elbow + body line), squats (knee depth) and jumping jacks (feet spread + arms overhead). Full set = **+30 minutes** and **+20 energy**. |
| Quit prevention | "Exit without workout" opens a 10-second breathing overlay (inhale/hold/exhale) with a localized quote, then asks whether to keep going or leave. |
| Pet & stats | SVG cyber-pet whose mood follows happiness. Feed/play with energy. Weekly screen time vs. exercise chart (Recharts), streak, 28-day consistency map, lifetime reps and earned time. |
| Calendar | Month grid, localized weekdays, task/focus/workout blocks, times and durations, completion rewards (+8/+12 energy), upcoming list, delete. |
| Notifications | Opt-in browser notifications: a daily quote after 09:00 and a 10-second micro-break reminder every 30 minutes of active use, with an in-app fallback. |
| PWA | Web manifest, generated PNG icons, service worker offline shell, runtime caching for the 19 MB pose model, install prompt in Settings. |
| Extras | Dopamine Detox grayscale mode, generative lo-fi/rain audio via Web Audio (no assets), offline page. |

## Run it

Requirements: Node.js 20.9+ (verified on Node 24) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run typecheck
npm run lint
npm run test:logic
npm run build
npm start
```

The camera needs `localhost` or HTTPS. On first load the app is in **local
demo mode** so every feature can be tried without any account or keys.

## Supabase setup (real Google OAuth + cloud sync)

Nothing in this section is required to try the app — without keys it runs in
local demo mode. Do it once to get real Google sign-in and a backup of your
progress.

### 1. Create the project

1. Create a project at [supabase.com](https://supabase.com) (free tier is
   enough). Note the **Project URL** and **anon public key** from
   *Project Settings → API*.
2. In Supabase **SQL editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql)
   in full. It creates `profiles`, `workout_logs`, `tasks` and `daily_stats`
   with indexes, RLS policies scoped to `auth.uid()`, grants for the
   `authenticated` role, and a trigger that provisions a profile for every new
   auth user (plus a backfill for existing ones). The file is idempotent —
   re-running it changes nothing.

### 2. Google as the sign-in provider

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
   create an **OAuth client ID** of type *Web application*.
   - Authorized JavaScript origins: `http://localhost:3000` and your app origin.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase **Authentication → Providers → Google**, enable it and paste the
   client ID and secret.
3. In Supabase **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (switch to your production origin later).
   - Redirect URLs: `http://localhost:3000/auth/callback` **and**
     `https://your-domain/auth/callback`.

### 3. Keys and verification

1. Copy `.env.example` to `.env.local` (never commit it) and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

2. Restart `npm run dev`. The sign-in card now shows **Continue with Google**
   instead of the disabled placeholder.
3. Verify the round trip: sign in with Google → complete a workout → copy the
   `profiles.time_left_seconds`, `workout_logs` and `daily_stats` rows in the
   Supabase table editor → open the app in a second browser profile and sign in
   there; the budget, streak, pet, tasks and workout history must appear.

Without these variables, the app never pretends Google worked: it exposes local
mode, and the Google button is disabled with an explanation.

### Verifying the schema before you paste it into Supabase

```bash
npm run db:verify
```

[scripts/verify-schema.mjs](scripts/verify-schema.mjs) boots a real PostgreSQL
(PGlite, WASM — no Docker or Supabase CLI required), builds the `auth` schema
Supabase normally provides (`auth.users`, `auth.uid()`, the API roles), applies
[`supabase/schema.sql`](supabase/schema.sql) twice and then asserts everything
the file promises: the four tables, RLS on each one, the owner-only policies,
the indexes, both functions and triggers, the 16 table grants, the profile
backfill, the new-user trigger, the CHECK constraints, and that `authenticated`
can neither read nor write another user's rows. 22 checks, exit code 1 on any
failure.

[CHECKLIST.md](supabase/CHECKLIST.md) is the companion to-do list for standing
up the hosted project from zero: project, Google OAuth, URLs, SQL, env vars and
the sign-in smoke test.

### What is synced

The local store is always the source of truth for the running app. When signed
in, changes are written through with a debounce to:

- `profiles` — language, theme, budget day, remaining seconds, streak, best
  streak, energy, pet name/happiness.
- `workout_logs` — every completed set.
- `tasks` — upserted on change, deleted remotely on delete.
- `daily_stats` — per-day screen time and movement.

On sign-in the account is also read back (`pullRemote` in [`lib/remote.ts`](lib/remote.ts)):
the profile snapshot, the last 120 days of `daily_stats`, up to 200 `workout_logs`
and the calendar are folded into the local store by `mergeRemote` in
[`lib/state.ts`](lib/state.ts), so a fresh device or cleared storage restores the
budget, streak, energy, pet and history. The merge is deliberately one-directional
in favour of the device: a field only ever moves **up**, remote rows never remove
local tasks or workouts, duplicates are unioned by id, history per day takes the
per-field maximum (never a sum), and a budget row from an older day is ignored.

**Security:** only the public anon key is used in the browser. RLS on every
table restricts access to `auth.uid()`, so a user can only read or write their
own rows — `pullRemote` additionally filters on `user_id` so the intent is
visible in the query. No service-role key exists in this project.

## Camera and privacy

- The pose model and WASM are served from `public/mediapipe/` (19 MB), so the
  workout does not depend on a CDN and works offline after the first load.
- Frames are processed in the tab with `detectForVideo`; nothing is uploaded or
  stored. Only rep counts and timestamps are saved.
- Pose detection runs only after the user picks a set and presses **Start
  camera**. Stopping the camera releases the tracks immediately.
- A rep counts only when the joint reaches the bottom threshold and returns past
  the top threshold without a form fault, using a smoothing filter to avoid
  jitter inventing reps. See [`lib/workout/engine.ts`](lib/workout/engine.ts).

## Honest limitations

- **Other tabs cannot be measured.** A web page has no API for another site's
  screen time. The budget runs while the StayFocus tab is hidden and stops
  when it becomes visible; it cannot know whether you are on Instagram or idle.
  A native app or browser extension would be required for true usage metering.
- **External sites cannot be restyled.** Dopamine Detox grays out StayFocus
  itself while a feed session is active; cross-origin pages cannot be filtered
  by a web app.
- **Daily quote notifications arrive while the app is open.** Real scheduled
  push messages require a server with Web Push/VAPID, which this client-only
  build deliberately avoids. Permission, the quote, and the 09:00 gate are real.
- **Streak and analytics start empty.** There is no seeded demo history — the
  charts fill from your own workouts and tasks.
- **Supabase sync is a merge, not a live replication.** State is pulled once
  per sign-in and pushed with a debounce, so two devices opened at the same
  moment converge on the larger value per field instead of true last-write-wins
  conflict resolution.

## Architecture

```
app/
  (app)/                 authenticated shell (FocusProvider + RequireAuth)
    dashboard/           budget hero, quick launcher, weekly chart, tasks
    social/              launcher grid, live session, blocked modal
    workout/             camera studio, exercise picker, recent sets
    pet/                 pet care, analytics, heatmap
    calendar/            month grid + task planner
    settings/            language, theme, notifications, audio, account, PWA
  auth/callback/         Supabase OAuth return
  offline/               offline fallback
  layout.tsx             fonts, providers, theme bootstrap
  manifest.ts            PWA manifest
components/
  focus/                 central reducer-backed provider
  breathe/               10-second breathing gate
  charts/                Recharts weekly chart
  ...                    layout, auth, social, pet, audio, pwa, ui
lib/
  state.ts               pure reducer, rollover, sanitizers, selectors
  types.ts               domain types and constants
  i18n/                  EN/RU/KK dictionaries + date helpers
  workout/engine.ts      pose geometry and rep state machines
  workout/pose.ts        lazy MediaPipe loader
  ambient.ts             generative Web Audio engine
  supabase.ts, remote.ts optional cloud auth/storage
  notifications.ts       permission + delivery helpers
scripts/
  logic.test.ts          19 checks for reps, state, i18n
  make-icons.mjs         dependency-free PNG icon generator
supabase/schema.sql      tables, RLS, trigger, grants
public/
  mediapipe/             local pose model + WASM
  icons/                 PWA icons
  sw.js                  service worker
```

## Verification

Run on the delivered build:

- `npm run typecheck` — 0 errors.
- `npm run lint` — 0 errors, 0 warnings.
- `npm run test:logic` — 19/19 checks: all three exercises, form rejection,
  session accounting, rewards, task energy, streak lapse, pet feeding, input
  sanitization and translations.
- `npm run build` — production build.
- Browser flows: local sign-in, theme/language switching, budget lock via stored
  state, task creation/completion, pet feeding, workout UI states and install
  metadata. See the delivery notes for exact results.

## Credits

Design and code generated for this project. Pose detection by
[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker),
charts by [Recharts](https://recharts.org), icons by
[Lucide](https://lucide.dev), auth/storage by [Supabase](https://supabase.com).
