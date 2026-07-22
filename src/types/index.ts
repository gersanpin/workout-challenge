export type ExerciseType =
  | 'running'
  | 'gym'
  | 'yoga'
  | 'sports'
  | 'cycling'
  | 'swimming'
  | 'other';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string; // YYYY-MM-DD
  exercise_type: string;
  duration_minutes: number;
  photo_url: string;
  created_at: string;
}

export interface WorkoutWithProfile extends Workout {
  profiles: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

/** One week's computed summary for a single user. */
export interface WeeklySummary {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  distinctWorkoutDays: number;
  totalWorkouts: number;
  hasDoubleDay: boolean;
  creditEarned: number; // 0 or 1
  rawMissedDays: number;
  creditsUsed: number;
  finalMissedDays: number;
  moneyOwedMxn: number;
  bankedCreditsAfterWeek: number;
}

/** Running yearly totals for a user (after chronological credit processing). */
export interface YearlyTotals {
  userId: string;
  bankedCredits: number;
  totalMissedDays: number;
  totalMoneyOwedMxn: number;
  weeks: WeeklySummary[];
}

export interface LeaderboardEntry {
  profile: Profile;
  currentWeek: WeeklySummary | null;
  bankedCredits: number;
  totalMissedDays: number;
  totalMoneyOwedMxn: number;
}

export const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'gym', label: 'Gym' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'sports', label: 'Sports' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'other', label: 'Other' },
];

export const FEE_PER_MISSED_DAY_MXN = 100;
export const REQUIRED_WORKOUT_DAYS = 5;
