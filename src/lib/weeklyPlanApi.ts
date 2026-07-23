import { supabase } from './supabase';
import { getWeekStart, todayDateOnly } from './dates';
import {
  generateWeeklyPlan,
  type WeeklyPlanContent,
} from './weeklyPlan';
import type { Profile } from '../types';

export async function fetchOrCreateWeeklyPlan(
  profile: Profile,
): Promise<WeeklyPlanContent & { id?: string; weekStart: string }> {
  const weekStart = getWeekStart(todayDateOnly());
  const { data } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', profile.id)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (data) {
    return {
      id: data.id,
      weekStart,
      goalSection: data.goal_section,
      foodSection: data.food_section,
    };
  }

  const generated = generateWeeklyPlan(profile);
  if (!profile.goal_type || !profile.food_preference) {
    return { weekStart, ...generated };
  }

  const { data: inserted } = await supabase
    .from('weekly_plans')
    .upsert(
      {
        user_id: profile.id,
        week_start: weekStart,
        goal_section: generated.goalSection,
        food_section: generated.foodSection,
      },
      { onConflict: 'user_id,week_start' },
    )
    .select('*')
    .maybeSingle();

  return {
    id: inserted?.id,
    weekStart,
    ...generated,
  };
}

export async function saveWeeklyPlan(
  userId: string,
  weekStart: string,
  plan: WeeklyPlanContent,
) {
  const { error } = await supabase.from('weekly_plans').upsert(
    {
      user_id: userId,
      week_start: weekStart,
      goal_section: plan.goalSection,
      food_section: plan.foodSection,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' },
  );
  if (error) throw new Error(error.message);
}

export async function regenerateWeeklyPlan(profile: Profile) {
  const weekStart = getWeekStart(todayDateOnly());
  const plan = generateWeeklyPlan(profile);
  await saveWeeklyPlan(profile.id, weekStart, plan);
  return { weekStart, ...plan };
}
