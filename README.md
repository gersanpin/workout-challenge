# Fortachones

Expo (React Native + TypeScript) app for a friends fitness accountability challenge — workouts, banked credits, group pot, social feed, chat, and a personal sports/nutrition coach.

Formerly known as Squad Sweat.

## Challenge rules

- Weeks: **Monday–Sunday**, with a **+2 day grace** before the week locks (timezone buffer).
- Minimum **5 distinct workout days** / week.
- Optional **double day** banks **1 credit** (5+ days, 6+ workouts, one day with 2+ sessions).
- Missed shortfall days cost **$100 MXN** (credits apply forward-only).
- Photo evidence required (video planned: ~30s / 25 MB).

## Tabs

| Tab | Purpose |
| --- | --- |
| Home | Your week, pot, crew summary, admin group invite |
| Feed | Instagram-style workout posts + comments + activity shouts |
| Log | Exercise type, calendar date picker, required photo |
| Chat | Text, searchable GIFs, YouTube links |
| Profile | Height/weight history, goals, coach chat, history |

## Setup

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `.env.example` → `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
3. Optional: `EXPO_PUBLIC_GIPHY_API_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY`.
4. `npm install && npm start` · `npm test`

## Folder structure

```
src/
  screens/   Auth, Home, Feed, Log, Chat, Profile, History
  lib/       weeklyChallenge, dates, groupApi, coach, giphy, workoutsApi
  constants/ challenge + theme (minimal light spinach/navy)
supabase/schema.sql
assets/fortachones-logo.png
```
