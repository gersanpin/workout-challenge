import type { FoodPreference, GoalType, Profile } from '../types';
import { askCoach, type CoachMessage } from './coach';

export interface WeeklyPlanContent {
  goalSection: string;
  foodSection: string;
}

export function generateWeeklyPlan(profile: Profile): WeeklyPlanContent {
  const goal = profile.goal_type as GoalType | null;
  const food = (profile.food_preference as FoodPreference | null) ?? 'omnivore';
  const exercise = profile.goal_exercise?.trim() || 'tu deporte';

  return {
    goalSection: buildGoalWeek(goal, exercise),
    foodSection: buildFoodWeek(food, goal),
  };
}

function buildGoalWeek(goal: GoalType | null, exercise: string): string {
  if (goal === 'lose_weight') {
    return [
      'LUN — Full body fuerza (sentadilla, press, remo)',
      'MAR — Cardio zona 2 40 min',
      'MIÉ — Upper push/pull + core',
      'JUE — Intervalos 20–25 min o deporte',
      'VIE — Lower + caminata 20 min',
      'SÁB (opcional) — Double day: movilidad AM + deporte PM',
      'DOM — Descanso activo',
    ].join('\n');
  }
  if (goal === 'gain_weight') {
    return [
      'LUN — Pierna pesada (sentadilla / prensa)',
      'MAR — Empuje (press banca / hombro)',
      'MIÉ — Tirón (peso muerto / remo / dominadas)',
      'JUE — Cardio suave 25 min o descanso',
      'VIE — Full body hipertrofia',
      'SÁB (opcional) — Double day para bankear crédito',
      'DOM — Descanso',
    ].join('\n');
  }
  if (goal === 'improve_exercise') {
    return [
      `LUN — Técnica / volumen de ${exercise}`,
      `MAR — Fuerza de soporte para ${exercise}`,
      `MIÉ — Sesión de ${exercise} (proyectos)`,
      'JUE — Cardio / recuperación activa',
      `VIE — ${exercise} + antagonistas`,
      'SÁB (opcional) — Double day corto',
      'DOM — Descanso',
    ].join('\n');
  }
  return [
    'LUN — Entrenamiento 1',
    'MAR — Entrenamiento 2',
    'MIÉ — Entrenamiento 3',
    'JUE — Entrenamiento 4',
    'VIE — Entrenamiento 5',
    'SÁB (opcional) — Double day',
    'DOM — Descanso',
    '',
    'Elige una meta en tu perfil para personalizar esto.',
  ].join('\n');
}

function buildFoodWeek(food: FoodPreference, goal: GoalType | null): string {
  const mode =
    goal === 'lose_weight' ? 'déficit suave' : goal === 'gain_weight' ? 'superávit' : 'mantenimiento';

  const menus: Record<FoodPreference, string[]> = {
    omnivore: [
      'Desayuno: huevos + avena + fruta',
      'Comida: pollo, arroz, ensalada',
      'Cena: pescado o res magra + papa + verduras',
      'Snack: yogurt griego + nueces',
    ],
    vegetarian: [
      'Desayuno: yogurt + granola',
      'Comida: curry de lentejas + arroz',
      'Cena: tofu salteado + quinoa',
      'Snack: smoothie proteico',
    ],
    vegan: [
      'Desayuno: tofu scramble + pan',
      'Comida: bowl de garbanzos + tahini',
      'Cena: tempeh + camote + verdes',
      'Snack: plátano + crema de cacahuate + proteína vegetal',
    ],
    carnivore: [
      'Desayuno: huevos + carne',
      'Comida: carne molida / bistec',
      'Cena: salmón o ribeye',
      'Snack: caldo de huesos',
    ],
    pescatarian: [
      'Desayuno: huevos + fruta',
      'Comida: atún + papa',
      'Cena: salmón + arroz + brócoli',
      'Snack: yogurt / skyr',
    ],
  };

  return [
    `Enfoque: ${mode} · preferencia ${food}`,
    'Plantilla diaria (repite / rota 7 días):',
    ...menus[food].map((l) => `• ${l}`),
    'Agua constante. Ajusta porciones según hambre y peso semanal.',
  ].join('\n');
}

export function formatPlanForDisplay(plan: WeeklyPlanContent): string {
  return `META\n${plan.goalSection}\n\nCOMIDA\n${plan.foodSection}`;
}

/** Ask coach and optionally return an updated weekly plan parsed from the reply. */
export async function coachRevisePlan(
  profile: Profile,
  current: WeeklyPlanContent,
  history: CoachMessage[],
  userMessage: string,
): Promise<{ reply: string; plan: WeeklyPlanContent }> {
  const contextMessage = [
    userMessage,
    '',
    '--- PLAN ACTUAL ---',
    formatPlanForDisplay(current),
    '---',
    'Si ajustas el plan, responde primero con el consejo y al final incluye exactamente:',
    '<<<PLAN>>>',
    'META',
    '...líneas del plan de ejercicio...',
    '',
    'COMIDA',
    '...líneas de la dieta...',
    '<<<FIN>>>',
  ].join('\n');

  const reply = await askCoach(profile, history, contextMessage);
  const parsed = parsePlanFromReply(reply, current);
  const cleanReply = reply.replace(/<<<PLAN>>>[\s\S]*?<<<FIN>>>/g, '').trim();

  return {
    reply: cleanReply || reply,
    plan: parsed,
  };
}

export function parsePlanFromReply(
  reply: string,
  fallback: WeeklyPlanContent,
): WeeklyPlanContent {
  const block = reply.match(/<<<PLAN>>>([\s\S]*?)<<<FIN>>>/);
  if (!block) return fallback;
  const body = block[1].trim();
  const metaMatch = body.match(/META\s*([\s\S]*?)(?:COMIDA|$)/i);
  const foodMatch = body.match(/COMIDA\s*([\s\S]*?)$/i);
  return {
    goalSection: metaMatch?.[1]?.trim() || fallback.goalSection,
    foodSection: foodMatch?.[1]?.trim() || fallback.foodSection,
  };
}
