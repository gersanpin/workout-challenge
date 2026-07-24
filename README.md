# Fortachones

Expo app for a friends workout challenge — lucha libre gym aesthetic, unified chat/feed, banked credits, and a personal coach.

## Tabs
| Tab | Purpose |
| --- | --- |
| Home | Your week (weight-plate stack), pot, crew summary |
| Chat | Unified WhatsApp-style stream (workout photos + free text + GIFs). Group invite/remove lives here |
| Log | Exercise + calendar (today…−2 days) + required photo |
| Profile | Challenge days, workout days, goals, food pref, auto weekly plan (Meta + Comida), coach |

## Visual
Black `#0B0D0C` / cards `#17191A` / green `#2FA84F` / red `#C81E3A` / bone `#F2F0EA`. Bebas Neue + Inter. Square corners, thick borders, stacked weight plates for weekly progress.

## Setup
1. Run `supabase/schema.sql`
2. `.env` from `.env.example`
3. `npm install && npm start` · `npm test`

Pinned to **Expo SDK 54** (Expo Go App Store compatibility). Do not upgrade the SDK unless explicitly requested — see `AGENTS.md`.
