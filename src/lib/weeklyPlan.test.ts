import { generateWeeklyPlan, localHeuristicPatch } from './weeklyPlan';
import type { Profile } from '../types';

const baseProfile: Profile = {
  id: 'u1',
  display_name: 'Test',
  avatar_url: null,
  height_m: 1.75,
  weight_kg: 80,
  age_years: 30,
  goal_type: 'lose_weight',
  goal_exercise: null,
  food_preference: 'omnivore',
  is_admin: false,
  group_id: null,
  removed_at: null,
  created_at: '2026-01-05T00:00:00Z',
  updated_at: '2026-01-05T00:00:00Z',
};

describe('generateWeeklyPlan', () => {
  it('returns 7 distinct day plans with workouts and meals', () => {
    const plan = generateWeeklyPlan(baseProfile);
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].label).toBe('Lunes');
    expect(plan.days[0].workout.exercises.length).toBeGreaterThan(0);
    expect(plan.days[0].meals.breakfast).toBeTruthy();
    // meals should vary across week
    const dinners = new Set(plan.days.map((d) => d.meals.dinner));
    expect(dinners.size).toBeGreaterThan(1);
  });
});

describe('localHeuristicPatch', () => {
  it('updates tuesday dinner without regenerating whole week', () => {
    const plan = generateWeeklyPlan(baseProfile);
    const beforeMon = plan.days[0].meals.dinner;
    const patched = localHeuristicPatch(plan, 'no me gusta la cena del martes');
    expect(patched.days[1].meals.dinner).not.toBe(plan.days[1].meals.dinner);
    expect(patched.days[0].meals.dinner).toBe(beforeMon);
  });

  it('converts rest day (sunday) into a training day when asked', () => {
    const plan = generateWeeklyPlan(baseProfile);
    expect(plan.days[6].workout.isRest).toBe(true);
    const patched = localHeuristicPatch(
      plan,
      'cambia el domingo, quiero entrenar en vez de descanso',
    );
    expect(patched.days[6].workout.isRest).toBe(false);
    expect(patched.days[6].workout.exercises.length).toBeGreaterThan(1);
    expect(patched.days[6].workout.durationMinutes).toBeGreaterThan(0);
  });

  it('marks a training day as rest when requested', () => {
    const plan = generateWeeklyPlan(baseProfile);
    expect(plan.days[0].workout.isRest).toBeFalsy();
    const patched = localHeuristicPatch(plan, 'pon descanso el lunes');
    expect(patched.days[0].workout.isRest).toBe(true);
    expect(patched.days[0].workout.title).toMatch(/descanso/i);
  });

  it('moves rest day to another weekday', () => {
    const plan = generateWeeklyPlan(baseProfile);
    const patched = localHeuristicPatch(
      plan,
      'pasa el descanso al miércoles',
    );
    expect(patched.days[6].workout.isRest).toBe(false);
    expect(patched.days[2].workout.isRest).toBe(true);
  });
});
