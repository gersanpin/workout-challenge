/**
 * Weekly challenge calculation (pure, unit-testable).
 *
 * RULES (v1 — confirmed):
 *
 * 1. Weeks run Monday–Sunday.
 * 2. Missed days = shortfall from the 5 distinct-workout-day minimum:
 *      raw_missed_days = max(0, 5 - distinct_workout_days)
 *    Rest days beyond that (the 6th/7th calendar day without a workout) are NOT charged.
 * 3. Double-day / banked credit minting:
 *      Earn 1 credit when ALL of:
 *        - distinct_workout_days >= 5
 *        - total_workouts >= 6
 *        - at least one calendar day has 2+ workouts ("double day")
 *      Max 1 credit minted per week, even with multiple double days.
 * 4. Credits are applied forward-only via chronological week processing:
 *    a credit earned in week N can offset a missed day in week N or any later week,
 *    but cannot rewrite an earlier week that was already settled.
 * 5. Incomplete weeks show progress but do not charge fees until weekEnd <= today.
 * 6. Only workouts with a non-empty photo_url count as valid evidence.
 */

import {
  FEE_PER_MISSED_DAY_MXN,
  REQUIRED_WORKOUT_DAYS,
  type WeeklySummary,
  type Workout,
  type YearlyTotals,
} from '../types';
import {
  addDays,
  getWeekEnd,
  getWeekStart,
  listWeekStartsInRange,
  yearStartDate,
} from './dates';

export interface WorkoutLike {
  workout_date: string; // YYYY-MM-DD
  photo_url?: string | null;
}

export interface WeekInput {
  weekStart: string;
  workouts: WorkoutLike[];
  /** Banked credits available at the start of this week (before mint/use). */
  bankedCreditsBefore: number;
}

/**
 * Count valid workouts for a single week and derive that week's summary,
 * given the user's credit balance entering the week.
 */
export function calculateWeekSummary(input: WeekInput): WeeklySummary {
  const { weekStart, bankedCreditsBefore } = input;
  const weekEnd = getWeekEnd(weekStart);

  const valid = input.workouts.filter(
    (w) =>
      w.workout_date >= weekStart &&
      w.workout_date <= weekEnd &&
      Boolean(w.photo_url && w.photo_url.trim().length > 0),
  );

  const countsByDay = new Map<string, number>();
  for (const w of valid) {
    countsByDay.set(w.workout_date, (countsByDay.get(w.workout_date) ?? 0) + 1);
  }

  const distinctWorkoutDays = countsByDay.size;
  const totalWorkouts = valid.length;
  const hasDoubleDay = [...countsByDay.values()].some((n) => n >= 2);

  const creditEarned =
    distinctWorkoutDays >= REQUIRED_WORKOUT_DAYS &&
    totalWorkouts >= REQUIRED_WORKOUT_DAYS + 1 &&
    hasDoubleDay
      ? 1
      : 0;

  const rawMissedDays = Math.max(0, REQUIRED_WORKOUT_DAYS - distinctWorkoutDays);

  // Credits available to spend this week include any credit just earned this week.
  let available = bankedCreditsBefore + creditEarned;
  const creditsUsed = Math.min(rawMissedDays, available);
  available -= creditsUsed;

  const finalMissedDays = rawMissedDays - creditsUsed;
  const moneyOwedMxn = finalMissedDays * FEE_PER_MISSED_DAY_MXN;

  return {
    weekStart,
    weekEnd,
    distinctWorkoutDays,
    totalWorkouts,
    hasDoubleDay,
    creditEarned,
    rawMissedDays,
    creditsUsed,
    finalMissedDays,
    moneyOwedMxn,
    bankedCreditsAfterWeek: available,
  };
}

export interface YearCalculationInput {
  userId: string;
  workouts: WorkoutLike[];
  /** Calendar year to evaluate (e.g. 2026). */
  year: number;
  /** Last date to include (defaults to today conceptually — pass explicitly for tests). */
  throughDate: string;
  /** Optional starting credit balance before the year (default 0). */
  startingBankedCredits?: number;
  /**
   * First date that counts for scoring (challenge kickoff and/or user join date).
   * Defaults to Jan 1 of `year`.
   */
  fromDate?: string;
}

/**
 * Process every week from `fromDate` (or Jan 1) through `throughDate` in chronological order,
 * carrying banked credits forward. This is the source of truth for yearly totals.
 */
export function calculateYearTotals(input: YearCalculationInput): YearlyTotals {
  const starting = input.startingBankedCredits ?? 0;
  const from = input.fromDate ?? yearStartDate(input.year);
  const weekStarts = listWeekStartsInRange(from, input.throughDate);

  let banked = starting;
  const weeks: WeeklySummary[] = [];
  let totalMissedDays = 0;
  let totalMoneyOwedMxn = 0;

  for (const weekStart of weekStarts) {
    const summary = calculateWeekSummary({
      weekStart,
      workouts: input.workouts,
      bankedCreditsBefore: banked,
    });

    // Incomplete (current) weeks: show progress + allow minting credits, but do not
    // charge missed-day fees until the week has ended (Sunday < throughDate is done).
    const weekComplete = summary.weekEnd <= input.throughDate;
    const settled: WeeklySummary = weekComplete
      ? summary
      : {
          ...summary,
          // Keep credits earned available; do not spend credits on provisional misses.
          creditsUsed: 0,
          finalMissedDays: 0,
          moneyOwedMxn: 0,
          rawMissedDays: 0,
          bankedCreditsAfterWeek: banked + summary.creditEarned,
        };

    banked = settled.bankedCreditsAfterWeek;
    totalMissedDays += settled.finalMissedDays;
    totalMoneyOwedMxn += settled.moneyOwedMxn;
    weeks.push(settled);
  }

  return {
    userId: input.userId,
    bankedCredits: banked,
    totalMissedDays,
    totalMoneyOwedMxn,
    weeks,
  };
}

/** Convenience: group workouts by user then compute yearly totals for each. */
export function calculateLeaderboard(
  profiles: { id: string; created_at?: string }[],
  workouts: Pick<Workout, 'user_id' | 'workout_date' | 'photo_url'>[],
  year: number,
  throughDate: string,
  challengeStartDate?: string,
): Map<string, YearlyTotals> {
  const byUser = new Map<string, WorkoutLike[]>();
  for (const p of profiles) {
    byUser.set(p.id, []);
  }
  for (const w of workouts) {
    const list = byUser.get(w.user_id);
    if (list) {
      list.push(w);
    } else {
      byUser.set(w.user_id, [w]);
    }
  }

  const result = new Map<string, YearlyTotals>();
  for (const profile of profiles) {
    const userWorkouts = byUser.get(profile.id) ?? [];
    const joinDate = profile.created_at
      ? profile.created_at.slice(0, 10)
      : undefined;
    const candidates = [
      challengeStartDate,
      joinDate,
      yearStartDate(year),
    ].filter((d): d is string => Boolean(d));
    const fromDate = candidates.reduce((a, b) => (a > b ? a : b));

    result.set(
      profile.id,
      calculateYearTotals({
        userId: profile.id,
        workouts: userWorkouts,
        year,
        throughDate,
        fromDate,
      }),
    );
  }
  return result;
}

export function getCurrentWeekSummary(
  workouts: WorkoutLike[],
  bankedCreditsBeforeCurrentWeek: number,
  today: string,
): WeeklySummary {
  return calculateWeekSummary({
    weekStart: getWeekStart(today),
    workouts,
    bankedCreditsBefore: bankedCreditsBeforeCurrentWeek,
  });
}

/**
 * Credits available entering the current week = year totals after the previous week.
 * Equivalent to running year calc and reading the prior week's ending balance.
 */
export function getBankedCreditsBeforeWeek(
  workouts: WorkoutLike[],
  userId: string,
  year: number,
  weekStart: string,
  startingBankedCredits = 0,
): number {
  const from = yearStartDate(year);
  const firstWeek = getWeekStart(from);
  if (weekStart <= firstWeek) {
    return startingBankedCredits;
  }

  // Settle all weeks through the Sunday before this Monday.
  const priorThrough = addDays(weekStart, -1);
  if (priorThrough < from) {
    return startingBankedCredits;
  }

  return calculateYearTotals({
    userId,
    workouts,
    year,
    throughDate: priorThrough,
    startingBankedCredits,
  }).bankedCredits;
}
