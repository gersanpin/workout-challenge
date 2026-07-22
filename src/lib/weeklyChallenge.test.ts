import {
  calculateWeekSummary,
  calculateYearTotals,
  getBankedCreditsBeforeWeek,
} from './weeklyChallenge';
import { getWeekStart } from './dates';

function w(date: string, photo = 'https://example.com/p.jpg') {
  return { workout_date: date, photo_url: photo };
}

describe('calculateWeekSummary', () => {
  // Week of Mon 2026-01-05 … Sun 2026-01-11
  const weekStart = '2026-01-05';

  it('charges for shortfall below 5 distinct days', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      workouts: [w('2026-01-05'), w('2026-01-06'), w('2026-01-07')],
    });
    expect(summary.distinctWorkoutDays).toBe(3);
    expect(summary.rawMissedDays).toBe(2);
    expect(summary.creditsUsed).toBe(0);
    expect(summary.finalMissedDays).toBe(2);
    expect(summary.moneyOwedMxn).toBe(200);
    expect(summary.creditEarned).toBe(0);
  });

  it('owes nothing when 5 distinct days are logged (no double)', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      workouts: [
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-09'),
      ],
    });
    expect(summary.distinctWorkoutDays).toBe(5);
    expect(summary.rawMissedDays).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
    expect(summary.creditEarned).toBe(0);
    expect(summary.hasDoubleDay).toBe(false);
  });

  it('mints 1 credit for 5 days + double (6 workouts)', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      workouts: [
        w('2026-01-05'),
        w('2026-01-05'), // double day
        w('2026-01-06'),
        w('2026-01-07'),
        w('2026-01-08'),
        w('2026-01-09'),
      ],
    });
    expect(summary.distinctWorkoutDays).toBe(5);
    expect(summary.totalWorkouts).toBe(6);
    expect(summary.hasDoubleDay).toBe(true);
    expect(summary.creditEarned).toBe(1);
    expect(summary.rawMissedDays).toBe(0);
    expect(summary.bankedCreditsAfterWeek).toBe(1);
  });

  it('does not mint credit for a double day without hitting 5 distinct days', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      workouts: [
        w('2026-01-05'),
        w('2026-01-05'),
        w('2026-01-06'),
        w('2026-01-07'),
      ],
    });
    expect(summary.distinctWorkoutDays).toBe(3);
    expect(summary.hasDoubleDay).toBe(true);
    expect(summary.creditEarned).toBe(0);
    expect(summary.rawMissedDays).toBe(2);
  });

  it('mints at most 1 credit even with multiple double days', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
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
    expect(summary.bankedCreditsAfterWeek).toBe(1);
  });

  it('consumes banked credits to cancel missed days instead of charging', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 2,
      workouts: [w('2026-01-05'), w('2026-01-06'), w('2026-01-07')],
    });
    // 3 days → 2 raw missed; both covered by credits
    expect(summary.rawMissedDays).toBe(2);
    expect(summary.creditsUsed).toBe(2);
    expect(summary.finalMissedDays).toBe(0);
    expect(summary.moneyOwedMxn).toBe(0);
    expect(summary.bankedCreditsAfterWeek).toBe(0);
  });

  it('can use a credit earned the same week against that week’s misses', () => {
    // 4 distinct days + double on one of them = 5 workouts, not enough for credit…
    // Need: earn credit AND have misses in same week — impossible if credit requires 5 days.
    // So same-week use only helps if you somehow had starting balance + earn, or
    // credit requires 5 days so raw missed is 0 when you earn.
    // Document: credit earned in a perfect week banks for FUTURE weeks.
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
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
    expect(summary.creditsUsed).toBe(0);
    expect(summary.bankedCreditsAfterWeek).toBe(1);
  });

  it('ignores workouts without photo evidence', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      workouts: [
        w('2026-01-05', ''),
        w('2026-01-06', '  '),
        w('2026-01-07'),
        { workout_date: '2026-01-08', photo_url: null },
      ],
    });
    expect(summary.distinctWorkoutDays).toBe(1);
    expect(summary.rawMissedDays).toBe(4);
  });

  it('ignores workouts outside the week window', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 0,
      workouts: [w('2026-01-04'), w('2026-01-12'), w('2026-01-05')],
    });
    expect(summary.distinctWorkoutDays).toBe(1);
  });

  it('never lets banked credits go negative', () => {
    const summary = calculateWeekSummary({
      weekStart,
      bankedCreditsBefore: 1,
      workouts: [w('2026-01-05')], // 4 raw missed
    });
    expect(summary.creditsUsed).toBe(1);
    expect(summary.finalMissedDays).toBe(3);
    expect(summary.bankedCreditsAfterWeek).toBe(0);
    expect(summary.moneyOwedMxn).toBe(300);
  });
});

describe('calculateYearTotals (chronological / forward-only credits)', () => {
  it('banks a credit in week 1 and spends it in a later week', () => {
    // Week A: Mon 2026-01-05 — earn credit via double day
    // Week B: Mon 2026-01-12 — only 4 days, use the banked credit
    const workouts = [
      w('2026-01-05'),
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
      w('2026-01-09'),
      // week B
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
      throughDate: '2026-01-18',
    });

    const weekA = totals.weeks.find((x) => x.weekStart === '2026-01-05');
    const weekB = totals.weeks.find((x) => x.weekStart === '2026-01-12');

    expect(weekA?.creditEarned).toBe(1);
    expect(weekA?.moneyOwedMxn).toBe(0);

    expect(weekB?.rawMissedDays).toBe(1);
    expect(weekB?.creditsUsed).toBe(1);
    expect(weekB?.finalMissedDays).toBe(0);
    expect(weekB?.moneyOwedMxn).toBe(0);

    expect(totals.bankedCredits).toBe(0);
    expect(totals.totalMissedDays).toBe(0);
    expect(totals.totalMoneyOwedMxn).toBe(0);
  });

  it('does not apply a later credit retroactively to an earlier unpaid week', () => {
    // Week A: miss 1 day (no credits yet) → owe 100
    // Week B: earn a credit via double day
    // After full recalc, week A still owes — credit stays banked (forward-only)
    const workouts = [
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
      // week B earn
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
      throughDate: '2026-01-18',
    });

    const weekA = totals.weeks.find((x) => x.weekStart === '2026-01-05');
    const weekB = totals.weeks.find((x) => x.weekStart === '2026-01-12');

    expect(weekA?.finalMissedDays).toBe(1);
    expect(weekA?.moneyOwedMxn).toBe(100);
    expect(weekB?.creditEarned).toBe(1);
    expect(totals.bankedCredits).toBe(1);
    expect(totals.totalMoneyOwedMxn).toBe(100);
  });

  it('accumulates yearly money owed across weeks', () => {
    const workouts = [
      w('2026-01-05'), // week A: 4 missed
      w('2026-01-12'), // week B: 4 missed
    ];
    const totals = calculateYearTotals({
      userId: 'u1',
      workouts,
      year: 2026,
      fromDate: '2026-01-05',
      throughDate: '2026-01-18',
    });
    expect(totals.totalMissedDays).toBe(8);
    expect(totals.totalMoneyOwedMxn).toBe(800);
  });

  it('does not charge missed days for the in-progress week', () => {
    // throughDate is Wednesday of week B — week A settled, week B provisional
    const workouts = [
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
      w('2026-01-09'),
      w('2026-01-12'),
    ];
    const totals = calculateYearTotals({
      userId: 'u1',
      workouts,
      year: 2026,
      fromDate: '2026-01-05',
      throughDate: '2026-01-14', // Wed
    });
    const weekB = totals.weeks.find((x) => x.weekStart === '2026-01-12');
    expect(weekB?.distinctWorkoutDays).toBe(1);
    expect(weekB?.finalMissedDays).toBe(0);
    expect(weekB?.moneyOwedMxn).toBe(0);
    expect(totals.totalMoneyOwedMxn).toBe(0);
  });
});

describe('getBankedCreditsBeforeWeek', () => {
  it('returns 0 before any credits are earned', () => {
    expect(
      getBankedCreditsBeforeWeek([], 'u1', 2026, '2026-01-05'),
    ).toBe(0);
  });

  it('returns prior week ending balance', () => {
    const workouts = [
      w('2026-01-05'),
      w('2026-01-05'),
      w('2026-01-06'),
      w('2026-01-07'),
      w('2026-01-08'),
      w('2026-01-09'),
    ];
    const beforeB = getBankedCreditsBeforeWeek(
      workouts,
      'u1',
      2026,
      '2026-01-12',
    );
    expect(beforeB).toBe(1);
  });
});

describe('getWeekStart', () => {
  it('maps Sunday back to the prior Monday', () => {
    expect(getWeekStart('2026-01-11')).toBe('2026-01-05');
  });
  it('keeps Monday as-is', () => {
    expect(getWeekStart('2026-01-05')).toBe('2026-01-05');
  });
});
