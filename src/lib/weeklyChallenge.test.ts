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

describe('calculateWeekSummary', () => {
  const weekStart = '2026-01-05';

  it('charges for shortfall below 5 distinct days when closed', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: true,
      workouts: [w('2026-01-05'), w('2026-01-06'), w('2026-01-07')],
    });
    expect(summary.distinctWorkoutDays).toBe(3);
    expect(summary.rawMissedDays).toBe(2);
    expect(summary.finalMissedDays).toBe(2);
    expect(summary.moneyOwedMxn).toBe(200);
    expect(summary.weekCloseDate).toBe('2026-01-13');
  });

  it('does not charge while week is still open', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      isClosed: false,
      workouts: [w('2026-01-05')],
    });
    expect(summary.distinctWorkoutDays).toBe(1);
    expect(summary.finalMissedDays).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
    expect(summary.isClosed).toBe(false);
  });

  it('owes nothing when 5 distinct days are logged (no double)', () => {
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
    expect(summary.moneyOwedMxn).toBe(0);
    expect(summary.creditEarned).toBe(0);
  });

  it('mints 1 credit for 5 days + double (6 workouts)', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
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
    expect(summary.creditEarned).toBe(1);
    expect(summary.bankedCreditsAfterWeek).toBe(1);
  });

  it('does not mint credit without hitting 5 distinct days', () => {
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
    expect(summary.creditEarned).toBe(0);
    expect(summary.rawMissedDays).toBe(2);
  });

  it('mints at most 1 credit even with multiple double days', () => {
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
    expect(summary.creditEarned).toBe(1);
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
  });

  it('never lets banked credits go negative', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 1,
      isClosed: true,
      workouts: [w('2026-01-05')],
    });
    expect(summary.creditsUsed).toBe(1);
    expect(summary.finalMissedDays).toBe(3);
    expect(summary.bankedCreditsAfterWeek).toBe(0);
  });
});

describe('calculateYearTotals (grace close + forward credits)', () => {
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

    // Week B closes 2026-01-20 (Sun 18 + 2)
    const totals = calculateYearTotals({
      userId: 'u1',
      workouts,
      year: 2026,
      fromDate: '2026-01-05',
      throughDate: '2026-01-20',
    });

    const weekA = totals.weeks.find((x) => x.weekStart === '2026-01-05');
    const weekB = totals.weeks.find((x) => x.weekStart === '2026-01-12');

    expect(weekA?.creditEarned).toBe(1);
    expect(weekB?.rawMissedDays).toBe(1);
    expect(weekB?.creditsUsed).toBe(1);
    expect(totals.totalMoneyOwedMxn).toBe(0);
  });

  it('does not apply a later credit retroactively', () => {
    const workouts = [
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
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

    const weekA = totals.weeks.find((x) => x.weekStart === '2026-01-05');
    expect(weekA?.moneyOwedMxn).toBe(100);
    expect(totals.bankedCredits).toBe(1);
    expect(totals.totalMoneyOwedMxn).toBe(100);
  });

  it('keeps fees provisional until grace close date', () => {
    // Week A ends Jan 11, closes Jan 13. On Jan 12 still open.
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

  it('daysRemainingToGoal', () => {
    expect(daysRemainingToGoal(3)).toBe(2);
    expect(daysRemainingToGoal(5)).toBe(0);
  });
});

describe('dates', () => {
  it('week close is Sunday + 2 days', () => {
    expect(getWeekCloseDate('2026-01-05')).toBe('2026-01-13');
  });

  it('blocks closed-week dates in log window', () => {
    // Wednesday Jan 14: prior week closed Jan 13, so Jan 12 (Mon of new week) ok,
    // but lookback to Jan 12 only within 2 days... Jan 14 lookback = Jan 12-14.
    const { isAllowed } = getAllowedLogDates('2026-01-14', 2);
    expect(isAllowed('2026-01-14')).toBe(true);
    expect(isAllowed('2026-01-12')).toBe(true);
    expect(isAllowed('2026-01-11')).toBe(false); // outside lookback AND closed week
  });

  it('getWeekStart maps Sunday to Monday', () => {
    expect(getWeekStart('2026-01-11')).toBe('2026-01-05');
  });
});
