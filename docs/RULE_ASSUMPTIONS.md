# Challenge rules (v1) — confirmed

These rules are locked for v1 (confirmed by product owner).

## 1. Double-day credit minting

**Implemented:** Earn **1** banked credit when ALL of:

- `distinct_workout_days >= 5`
- `total_workouts >= 6`
- at least one calendar day has **2+** workouts

Max **1** credit per week even with multiple double days.

**Rejected alternative:** The brief’s `distinct_workout_days == 6` condition, which conflicts with “5 days + one double = 6th workout earns a credit.”

## 2. Credits: forward-only (not retroactive)

Weeks are processed in chronological order. A credit earned in week N can offset a miss in week N (only if you somehow have raw misses the same week — normally earning requires 5 days so raw misses are 0) or any **later** week.

A credit earned in week 10 **cannot** erase a miss already settled in week 3.

## 3. Missed days = shortfall from 5, not all rest days

`raw_missed_days = max(0, 5 - distinct_workout_days)`.

Hitting 5 days means **$0** that week, even though 2 calendar days had no workout.

## 4. Incomplete current week

Progress (`X/5 days`) is shown live, but missed-day fees are **not** charged until the week’s Sunday has been reached (`weekEnd <= today`).

## 5. Photo evidence

Workouts without a non-empty `photo_url` do not count.

## 6. Challenge window

Scoring starts at `CHALLENGE_START_DATE` (`src/constants/challenge.ts`), and not before a user’s `profiles.created_at` join date.
