import {
  calculateWeekSummary,
  calculateYearTotals,
  daysRemainingToGoal,
  getBankedCreditsBeforeWeek,
} from './weeklyChallenge';
import { getAllowedLogDates, getWeekCloseDate, getWeekStart } from './dates';

function w(date: string, photo = 'https://example.com/p.jpg') {
  return { workout_date: date, photo_url: photo };
}

describe('calculateWeekSummary (progress points)', () => {
  const weekStart = '2026-01-05';

  it('charges shortfall from progress points when closed', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [w('2026-01-05'), w('2026-01-06'), w('2026-01-07')],
    });
    expect(summary.distinctWorkoutDays).toBe(3);
    expect(summary.progressPoints).toBe(3);
    expect(summary.rawMissedDays).toBe(2);
    expect(summary.finalMissedDays).toBe(2);
    expect(summary.moneyOwedMxn).toBe(200);
  });

  it('does not charge while week is still open', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: false,
      workouts: [w('2026-01-05')],
    });
    expect(summary.progressPoints).toBe(1);
    expect(summary.finalMissedDays).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
  });

  it('counts double day as +1 progress (1 prior day + double → 3)', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: false,
      workouts: [w('2026-01-05'), w('2026-01-06'), w('2026-01-06')],
    });
    expect(summary.distinctWorkoutDays).toBe(2);
    expect(summary.hasDoubleDay).toBe(true);
    expect(summary.progressPoints).toBe(3);
  });

  it('completes week with 4 distinct days + one double (5 points)', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-08'),
      ],
    });
    expect(summary.progressPoints).toBe(5);
    expect(summary.rawMissedDays).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
    expect(summary.creditEarned).toBe(0);
  });

  it('5 days + double → 6 points; banks +1 when no prior debt', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      priorMissedDays: 0,
      isClosed: false,
      workouts: [
        w('2026-01-05'),
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-09'),
      ],
    });
    expect(summary.progressPoints).toBe(6);
    expect(summary.excessPoints).toBe(1);
    expect(summary.creditEarned).toBe(1);
    expect(summary.priorMissedDaysCleared).toBe(0);
    expect(summary.bankedCreditsAfterWeek).toBe(1);
  });

  it('excess clears prior failed day instead of banking credit', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      priorMissedDays: 2,
      isClosed: true,
      workouts: [
        w('2026-01-05'),
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-09'),
      ],
    });
    expect(summary.progressPoints).toBe(6);
    expect(summary.creditEarned).toBe(0);
    expect(summary.priorMissedDaysCleared).toBe(1);
  });

  it('second double day in same week does not add another bonus', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [
        w('2026-01-05'),
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-09'),
      ],
    });
    expect(summary.progressPoints).toBe(6); // 5 days + 1 bonus, not 7
    expect(summary.creditEarned).toBe(1);
  });

  it('5 distinct days without double → 5 points, no credit', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-09'),
      ],
    });
    expect(summary.progressPoints).toBe(5);
    expect(summary.creditEarned).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
  });

  it('does not mint credit without enough progress', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [
        w('2026-01-05'),
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
      ],
    });
    expect(summary.progressPoints).toBe(4); // 3 days + double
    expect(summary.creditEarned).toBe(0);
    expect(summary.rawMissedDays).toBe(1);
  });

  it('consumes banked credits when closed', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 2,
      isClosed: true,
      workouts: [w('2026-01-05'), w('2026-01-06'), w('2026-01-07')],
    });
    expect(summary.creditsUsed).toBe(2);
    expect(summary.finalMissedDays).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
  });

  it('ignores workouts without photo evidence', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [
        w('2026-01-05', ''),
        w('2026-01-07'),
        { workout_date: '2026-01-08', photo_url: null },
      ],
    });
    expect(summary.distinctWorkoutDays).toBe(1);
    expect(summary.progressPoints).toBe(1);
  });
});

describe('calculateYearTotals (excess vs prior debt)', () => {
  it('banks a credit then spends it after both weeks close', () => {
    const workouts = [
      w('2026-01-05'),
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
      w('2026-01-09'),
      w('2026-01-12'),
      w('2026-01-13'),
      w('2026-01-14'),
      w('2026-01-15'),
    ];

    const totals = calculateYearTotals({
      userId: 'u1',
      workouts,
      year: 2026,
      fromDate: '2026-01-05',
      throughDate: '2026-01-20',
    });

    const weekA = totals.weeks.find((x) => x.weekStart === '2026-01-05');
    const weekB = totals.weeks.find((x) => x.weekStart === '2026-01-12');

    expect(weekA?.progressPoints).toBe(6);
    expect(weekA?.creditEarned).toBe(1);
    expect(weekB?.rawMissedDays).toBe(1); // 4 progress points
    expect(weekB?.creditsUsed).toBe(1);
    expect(totals.totalMoneyOwedMxn).toBe(0);
  });

  it('excess clears a prior failed day instead of banking', () => {
    // Week A: only 1 day → 4 missed when closed
    // Week B: 5 days + double → excess clears 1 prior missed
    const workouts = [
      w('2026-01-05'),
      w('2026-01-12'),
      w('2026-01-12'),
      w('2026-01-13'),
      w('2026-01-14'),
      w('2026-01-15'),
      w('2026-01-16'),
    ];

    const totals = calculateYearTotals({
      userId: 'u1',
      workouts,
      year: 2026,
      fromDate: '2026-01-05',
      throughDate: '2026-01-20',
    });

    const weekB = totals.weeks.find((x) => x.weekStart === '2026-01-12');
    expect(weekB?.progressPoints).toBe(6);
    expect(weekB?.priorMissedDaysCleared).toBe(1);
    expect(weekB?.creditEarned).toBe(0);
    // Week A missed 4; week B clears 1 → 3 remaining unpaid from A
    expect(totals.totalMissedDays).toBe(3);
    expect(totals.totalMoneyOwedMxn).toBe(300);
    expect(totals.bankedCredits).toBe(0);
  });

  it('keeps fees provisional until grace close date', () => {
    const totals = calculateYearTotals({
      userId: 'u1',
      workouts: [w('2026-01-05')],
      year: 2026,
      fromDate: '2026-01-05',
      throughDate: '2026-01-12',
    });
    const weekA = totals.weeks.find((x) => x.weekStart === '2026-01-05');
    expect(weekA?.isClosed).toBe(false);
    expect(weekA?.moneyOwedMxn).toBe(0);
  });
});

describe('getBankedCreditsBeforeWeek / helpers', () => {
  it('returns prior week ending balance', () => {
    const workouts = [
      w('2026-01-05'),
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
      w('2026-01-09'),
    ];
    expect(
      getBankedCreditsBeforeWeek(workouts, 'u1', 2026, '2026-01-12', 0, '2026-01-05'),
    ).toBe(1);
  });

  it('daysRemainingToGoal uses progress points', () => {
    expect(daysRemainingToGoal(3)).toBe(2);
    expect(daysRemainingToGoal(5)).toBe(0);
    expect(daysRemainingToGoal(6)).toBe(0);
  });
});

describe('dates', () => {
  it('week close is Sunday + 2 days', () => {
    expect(getWeekCloseDate('2026-01-05')).toBe('2026-01-13');
  });

  it('blocks closed-week dates in log window', () => {
    const { isAllowed } = getAllowedLogDates('2026-01-14', 2);
    expect(isAllowed('2026-01-14')).toBe(true);
    expect(isAllowed('2026-01-12')).toBe(true);
    expect(isAllowed('2026-01-11')).toBe(false);
  });

  it('getWeekStart maps Sunday to Monday', () => {
    expect(getWeekStart('2026-01-11')).toBe('2026-01-05');
  });
});
