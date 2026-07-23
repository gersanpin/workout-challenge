export type ExerciseType =
  | 'running'
  | 'gym'
  | 'yoga'
  | 'sports'
  | 'cycling'
  | 'swimming'
  | 'climbing'
  | 'soccer'
  | 'padel'
  | 'other';

export type GoalType = 'gain_weight' | 'lose_weight' | 'improve_exercise';

export type FoodPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'carnivore'
  | 'pescatarian';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  height_m: number | null;
  weight_kg: number | null;
  goal_type: GoalType | null;
  goal_exercise: string | null;
  food_preference: FoodPreference | null;
  is_admin: boolean;
  group_id: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string;
  exercise_type: string;
  photo_url: string;
  media_type: 'photo' | 'video';
  created_at: string;
}

export interface WorkoutWithProfile extends Workout {
  profiles: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

export interface WorkoutComment {
  id: string;
  workout_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

export interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  body: string | null;
  media_url: string | null;
  media_type: 'text' | 'gif' | 'image' | 'link' | null;
  link_url: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

export interface ActivityEvent {
  id: string;
  group_id: string;
  user_id: string | null;
  event_type: 'workout' | 'week_complete' | 'credit_banked' | 'week_missed' | 'system';
  title: string;
  body: string | null;
  workout_id: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  recorded_on: string;
  created_at: string;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  weekCloseDate: string;
  distinctWorkoutDays: number;
  totalWorkouts: number;
  hasDoubleDay: boolean;
  creditEarned: number;
  rawMissedDays: number;
  creditsUsed: number;
  finalMissedDays: number;
  moneyOwedMxn: number;
  bankedCreditsAfterWeek: number;
  isClosed: boolean;
}

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
  { value: 'climbing', label: 'Climbing' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'padel', label: 'Padel' },
  { value: 'other', label: 'Other' },
];

export const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'gain_weight', label: 'Gain weight' },
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'improve_exercise', label: 'Improve at an exercise' },
];

export const FOOD_OPTIONS: { value: FoodPreference; label: string }[] = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'carnivore', label: 'Carnivore' },
  { value: 'pescatarian', label: 'Pescatarian' },
];
