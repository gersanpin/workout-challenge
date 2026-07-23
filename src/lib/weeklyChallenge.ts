/**
 * Weekly challenge calculation for Fortachones (pure, unit-testable).
 *
 * RULES (v1 — confirmed):
 *
 * 1. Weeks run Monday–Sunday.
 * 2. Missed days = shortfall from the 5 distinct-workout-day minimum:
 *      raw_missed_days = max(0, 5 - distinct_workout_days)
 * 3. Double-day / banked credit minting:
 *      Earn 1 credit when ALL of:
 *        - distinct_workout_days >= 5
 *        - total_workouts >= 6
 *        - at least one calendar day has 2+ workouts ("double day")
 *      Max 1 credit minted per week.
 * 4. Credits are applied forward-only via chronological week processing.
 * 5. Weeks stay open for WEEK_CLOSE_GRACE_DAYS after Sunday before fees lock.
 * 6. Only workouts with a non-empty photo_url count as valid evidence.
 */

import {
  FEE_PER_MISSED_DAY_MXN,
  REQUIRED_WORKOUT_DAYS,
} from '../constants/challenge';
import type { WeeklySummary, Workout, YearlyTotals } from '../types';
import {
  addDays,
  getWeekCloseDate,
  getWeekEnd,
  getWeekStart,
  listWeekStartsInRange,
  yearStartDate,
} from './dates';

export interface WorkoutLike {
  workout_date: string;
  photo_url?: string | null;
}

export interface WeekInput {
  weekStart: string;
  workouts: WorkoutLike[];
  bankedCreditsBefore: number;
  /** When true, missed-day fees are applied; otherwise provisional. */
  isClosed: boolean;
}

export function calculateWeekSummary(input: WeekInput): WeeklySummary {
  const { weekStart, bankedCreditsBefore, isClosed } = input;
  const weekEnd = getWeekEnd(weekStart);
  const weekCloseDate = getWeekCloseDate(weekStart);

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

  if (!isClosed) {
    // Open week: show progress + bank earned credits, but don't charge or spend yet.
    return {
      weekStart,
      weekEnd,
      weekCloseDate,
      distinctWorkoutDays,
      totalWorkouts,
      hasDoubleDay,
      creditEarned,
      rawMissedDays: 0,
      creditsUsed: 0,
      finalMissedDays: 0,
      moneyOwedMxn: 0,
      bankedCreditsAfterWeek: bankedCreditsBefore + creditEarned,
      isClosed: false,
    };
  }

  let available = bankedCreditsBefore + creditEarned;
  const creditsUsed = Math.min(rawMissedDays, available);
  available -= creditsUsed;

  const finalMissedDays = rawMissedDays - creditsUsed;
  const moneyOwedMxn = finalMissedDays * FEE_PER_MISSED_DAY_MXN;

  return {
    weekStart,
    weekEnd,
    weekCloseDate,
    distinctWorkoutDays,
    totalWorkouts,
    hasDoubleDay,
    creditEarned,
    rawMissedDays,
    creditsUsed,
    finalMissedDays,
    moneyOwedMxn,
    bankedCreditsAfterWeek: available,
    isClosed: true,
  };
}

export interface YearCalculationInput {
  userId: string;
  workouts: WorkoutLike[];
  year: number;
  throughDate: string;
  startingBankedCredits?: number;
  fromDate?: string;
}

export function calculateYearTotals(input: YearCalculationInput): YearlyTotals {
  const starting = input.startingBankedCredits ?? 0;
  const from = input.fromDate ?? yearStartDate(input.year);
  const weekStarts = listWeekStartsInRange(from, input.throughDate);

  let banked = starting;
  const weeks: WeeklySummary[] = [];
  let totalMissedDays = 0;
  let totalMoneyOwedMxn = 0;

  for (const weekStart of weekStarts) {
    const closeDate = getWeekCloseDate(weekStart);
    const isClosed = closeDate <= input.throughDate;
    const summary = calculateWeekSummary({
      weekStart,
      workouts: input.workouts,
      bankedCreditsBefore: banked,
      isClosed,
    });
    banked = summary.bankedCreditsAfterWeek;
    totalMissedDays += summary.finalMissedDays;
    totalMoneyOwedMxn += summary.moneyOwedMxn;
    weeks.push(summary);
  }

  return {
    userId: input.userId,
    bankedCredits: banked,
    totalMissedDays,
    totalMoneyOwedMxn,
    weeks,
  };
}

export function calculateLeaderboard(
  profiles: { id: string; created_at?: string; removed_at?: string | null }[],
  workouts: Pick<Workout, 'user_id' | 'workout_date' | 'photo_url'>[],
  year: number,
  throughDate: string,
  challengeStartDate?: string,
): Map<string, YearlyTotals> {
  const active = profiles.filter((p) => !p.removed_at);
  const byUser = new Map<string, WorkoutLike[]>();
  for (const p of active) {
    byUser.set(p.id, []);
  }
  for (const w of workouts) {
    const list = byUser.get(w.user_id);
    if (list) list.push(w);
  }

  const result = new Map<string, YearlyTotals>();
  for (const profile of active) {
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

export function getBankedCreditsBeforeWeek(
  workouts: WorkoutLike[],
  userId: string,
  year: number,
  weekStart: string,
  startingBankedCredits = 0,
  fromDate?: string,
): number {
  const from = fromDate ?? yearStartDate(year);
  const firstWeek = getWeekStart(from);
  if (weekStart <= firstWeek) {
    return startingBankedCredits;
  }

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
    fromDate: from,
  }).bankedCredits;
}

export function daysRemainingToGoal(distinctWorkoutDays: number): number {
  return Math.max(0, REQUIRED_WORKOUT_DAYS - distinctWorkoutDays);
}
