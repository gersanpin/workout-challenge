import { supabase } from './supabase';
import { getWeekStart, todayDateOnly } from './dates';
import {
  ensureStructuredPlan,
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
    const structured = ensureStructuredPlan(
      data.plan_json ?? {
        goalSection: data.goal_section,
        foodSection: data.food_section,
      },
      profile,
    );
    // If legacy row without plan_json days, persist structured version once
    if (!data.plan_json?.days) {
      await saveWeeklyPlan(profile.id, weekStart, structured);
    }
    return { id: data.id, weekStart, ...structured };
  }

  const generated = generateWeeklyPlan(profile);
  if (!profile.goal_type || !profile.food_preference) {
    return { weekStart, ...generated };
  }

  await saveWeeklyPlan(profile.id, weekStart, generated);
  return { weekStart, ...generated };
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
      plan_json: plan,
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
