# Squad Sweat — Workout Challenge Tracker

React Native (Expo) + Supabase app for a friends fitness accountability challenge.

## Challenge rules (implemented)

- Weeks run **Monday–Sunday**.
- Minimum **5 distinct workout days** per week.
- A **double workout day** (2+ workouts on one calendar day), together with ≥5 distinct days and ≥6 total workouts, mints **1 banked credit** (max once/week).
- Each shortfall day below 5 costs **$100 MXN**, unless a banked credit is consumed instead.
- Credits are applied **forward-only** via chronological week processing (a credit earned later cannot wipe an earlier unpaid week).
- Photo evidence is **required** for a workout to count.

> The original brief said `distinct_workout_days == 6` to mint a credit. That conflicts with “5 days + one double = 6th workout.” Implementation follows the narrative (5 days + double). Say if you want the stricter reading.

## Folder structure

```
├── App.tsx
├── app.json
├── supabase/
│   └── schema.sql          # profiles, workouts, weekly_summaries, storage RLS
├── src/
│   ├── components/         # shared UI
│   ├── constants/          # theme
│   ├── context/            # AuthProvider
│   ├── hooks/              # challenge data + leaderboard
│   ├── lib/
│   │   ├── dates.ts
│   │   ├── supabase.ts
│   │   ├── workoutsApi.ts  # camera/library + storage upload
│   │   ├── weeklyChallenge.ts       # pure weekly math
│   │   └── weeklyChallenge.test.ts  # unit tests
│   ├── navigation/         # bottom tabs
│   ├── screens/            # Home, Log, History, Profile, Auth
│   └── types/
```

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (creates tables, RLS, storage bucket).
3. Copy `.env.example` → `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Install & run:

```bash
npm install
npm start
```

5. Run unit tests for the weekly logic:

```bash
npm test
```

## Tabs

| Tab | Purpose |
| --- | --- |
| Home | Leaderboard + recent workout feed with photos |
| Log | Log workout (type, duration, date, required photo) |
| History | Personal weekly breakdown + all logs + YTD totals |
| Profile | Name, snapshot, sign out |

## Data model

- `profiles` — id, display_name, avatar_url
- `workouts` — user_id, workout_date, exercise_type, duration_minutes, photo_url
- `weekly_summaries` — optional cache (app computes live from workouts today)

Weekly/yearly money, missed days, and banked credits are derived in `src/lib/weeklyChallenge.ts`.
