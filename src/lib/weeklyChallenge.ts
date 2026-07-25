/**
 * Weekly challenge calculation for Fortachones (pure, unit-testable).
 *
 * RULES (progress points — confirmed):
 *
 * 1. Weeks run Monday–Sunday.
 * 2. Progress points toward the weekly goal of 5:
 *      progress = distinct_workout_days + (has_double_day ? 1 : 0)
 *    - Each distinct day with ≥1 valid workout = +1
 *    - First calendar day with 2+ workouts adds +1 bonus (double day)
 *    - Extra double days the same week do NOT add another bonus
 *    - So 4 days + 1 double = 5/5 (week complete)
 * 3. Missed days (when closed) = max(0, 5 - progress_points)
 * 4. Excess when progress > 5 (typically 6/5 via double):
 *      - If user still has unpaid prior failed days → clear 1 prior failed day
 *      - Else → bank +1 "día a favor" (credit) for future weeks
 *    Max 1 excess per week (one double bonus).
 * 5. Banked credits spend against the current week's missed days when closed.
 * 6. Weeks stay open for WEEK_CLOSE_GRACE_DAYS after Sunday before fees lock.
 * 7. Only workouts with a non-empty photo_url count as valid evidence.
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
  isWeekClosed,
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
  /** Unpaid missed days accumulated from earlier closed weeks. */
  priorMissedDays?: number;
  /** When true, missed-day fees are applied; otherwise provisional. */
  isClosed: boolean;
}

/** Distinct days + at most one double-day bonus. */
export function calculateProgressPoints(
  distinctWorkoutDays: number,
  hasDoubleDay: boolean,
): number {
  return distinctWorkoutDays + (hasDoubleDay ? 1 : 0);
}

export function calculateWeekSummary(input: WeekInput): WeeklySummary {
  const {
    weekStart,
    bankedCreditsBefore,
    isClosed,
    priorMissedDays = 0,
  } = input;
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
  const progressPoints = calculateProgressPoints(
    distinctWorkoutDays,
    hasDoubleDay,
  );
  const excessPoints = Math.max(0, progressPoints - REQUIRED_WORKOUT_DAYS);

  // Excess: clear prior debt first, otherwise bank as "día a favor".
  let priorMissedDaysCleared = 0;
  let creditEarned = 0;
  if (excessPoints > 0) {
    if (priorMissedDays > 0) {
      priorMissedDaysCleared = Math.min(excessPoints, priorMissedDays);
    } else {
      creditEarned = excessPoints;
    }
  }

  const rawMissedDays = Math.max(0, REQUIRED_WORKOUT_DAYS - progressPoints);

  if (!isClosed) {
    // Open week: show live progress + provisional excess effects; no fees yet.
    return {
      weekStart,
      weekEnd,
      weekCloseDate,
      distinctWorkoutDays,
      totalWorkouts,
      hasDoubleDay,
      progressPoints,
      excessPoints,
      creditEarned,
      priorMissedDaysCleared,
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
    progressPoints,
    excessPoints,
    creditEarned,
    priorMissedDaysCleared,
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
    // Match logging grace: week stays open through the close date (not locked until the day after).
    const isClosed = isWeekClosed(weekStart, input.throughDate);
    const summary = calculateWeekSummary({
      weekStart,
      workouts: input.workouts,
      bankedCreditsBefore: banked,
      priorMissedDays: totalMissedDays,
      isClosed,
    });

    if (summary.priorMissedDaysCleared > 0) {
      totalMissedDays = Math.max(
        0,
        totalMissedDays - summary.priorMissedDaysCleared,
      );
      totalMoneyOwedMxn = Math.max(
        0,
        totalMoneyOwedMxn -
          summary.priorMissedDaysCleared * FEE_PER_MISSED_DAY_MXN,
      );
    }

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

export function daysRemainingToGoal(progressPoints: number): number {
  return Math.max(0, REQUIRED_WORKOUT_DAYS - progressPoints);
}

/** Week summary for the Monday–Sunday week that contains `dateStr`. */
export function findWeekSummaryForDate(
  weeks: WeeklySummary[],
  dateStr: string,
): WeeklySummary | null {
  const start = getWeekStart(dateStr);
  return weeks.find((w) => w.weekStart === start) ?? null;
}

/** Most recent prior week still open (grace), if any. */
export function findOpenPriorWeek(
  weeks: WeeklySummary[],
  today: string,
): WeeklySummary | null {
  const currentStart = getWeekStart(today);
  const prior = [...weeks]
    .filter((w) => w.weekStart < currentStart && !w.isClosed)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  return prior[0] ?? null;
}
