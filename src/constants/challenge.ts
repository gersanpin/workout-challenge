/**
 * Challenge calendar knobs for Fortachones.
 * Weeks: Mon–Sun. Grace: week stays open for WEEK_CLOSE_GRACE_DAYS after Sunday
 * so people in different timezones can still adjust recent days.
 *
 * Group start date lives on challenge_groups.challenge_started_on
 * (set when an admin taps COMENZAR RETO in Chat).
 */
export const CHALLENGE_YEAR = 2026;

/** Days after Sunday before a week locks (timezone / late-log buffer). */
export const WEEK_CLOSE_GRACE_DAYS = 2;

/** How far back (calendar days) a user may pick when logging. */
export const LOG_LOOKBACK_DAYS = 2;

export const APP_NAME = 'Fortachones';
export const FEE_PER_MISSED_DAY_MXN = 100;
export const REQUIRED_WORKOUT_DAYS = 5;
