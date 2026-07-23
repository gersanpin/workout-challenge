import type { FoodPreference, GoalType, Profile } from '../types';

export interface CoachMessage {
  role: 'user' | 'assistant';
  body: string;
}

/**
 * Personal sports & nutrition coach.
 * Uses OpenAI if EXPO_PUBLIC_OPENAI_API_KEY is set; otherwise a strong local template coach.
 */
export async function askCoach(
  profile: Profile,
  history: CoachMessage[],
  userMessage: string,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (apiKey) {
    try {
      return await askOpenAI(apiKey, profile, history, userMessage);
    } catch (e) {
      console.warn('OpenAI coach failed, falling back', e);
    }
  }
  return localCoachReply(profile, userMessage);
}

async function askOpenAI(
  apiKey: string,
  profile: Profile,
  history: CoachMessage[],
  userMessage: string,
): Promise<string> {
  const system = buildSystemPrompt(profile);
  const messages = [
    { role: 'system', content: system },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.body })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || localCoachReply(profile, userMessage);
}

function buildSystemPrompt(profile: Profile): string {
  return [
    'You are Fortachones Coach — a practical sports & nutrition expert for a small friends workout challenge.',
    'Be concise, friendly, and specific. Prefer weekly plans and grocery-simple meals.',
    `Athlete: ${profile.display_name}`,
    profile.height_m ? `Height: ${profile.height_m} m` : '',
    profile.weight_kg ? `Weight: ${profile.weight_kg} kg` : '',
    profile.goal_type ? `Goal: ${profile.goal_type}` : '',
    profile.goal_exercise ? `Focus exercise: ${profile.goal_exercise}` : '',
    profile.food_preference ? `Food preference: ${profile.food_preference}` : '',
    'Units are metric (kg, meters). No medical claims.',
  ]
    .filter(Boolean)
    .join('\n');
}

function localCoachReply(profile: Profile, userMessage: string): string {
  const goal = profile.goal_type as GoalType | null;
  const food = (profile.food_preference as FoodPreference | null) ?? 'omnivore';
  const lower = userMessage.toLowerCase();

  if (lower.includes('diet') || lower.includes('meal') || goal === 'gain_weight') {
    return dietPlan(food, goal === 'lose_weight' ? 'cut' : 'surplus');
  }
  if (lower.includes('climb') || profile.goal_exercise?.toLowerCase().includes('climb')) {
    return climbingPlan();
  }
  if (goal === 'lose_weight' || lower.includes('routine') || lower.includes('workout')) {
    return fatLossRoutine();
  }
  if (goal === 'improve_exercise') {
    return improveExercisePlan(profile.goal_exercise || 'your sport');
  }

  return [
    `Hey ${profile.display_name}! I can build you a weekly workout, a longer 4-week plan, or a simple diet.`,
    '',
    'Try asking:',
    '• “Give me this week’s workouts”',
    '• “4-week plan to gain weight”',
    '• “Vegetarian meal ideas for cutting”',
    '• “Climbing finger + pull strength plan”',
    '',
    profile.goal_type
      ? `I see your goal is set to ${labelGoal(profile.goal_type)} — say the word and I’ll tailor it.`
      : 'Set your goal on your profile (gain / lose / improve) so I can tailor plans.',
  ].join('\n');
}

function labelGoal(g: GoalType): string {
  if (g === 'gain_weight') return 'gain weight';
  if (g === 'lose_weight') return 'lose weight';
  return 'improve at an exercise';
}

function dietPlan(food: FoodPreference, mode: 'surplus' | 'cut'): string {
  const kcal = mode === 'surplus' ? 'small calorie surplus' : 'modest deficit (~300–500 kcal)';
  const protein = mode === 'surplus' ? '1.6–2.2 g protein / kg' : '1.8–2.4 g protein / kg';

  const samples: Record<FoodPreference, string[]> = {
    omnivore: [
      'Breakfast: eggs + oats + fruit',
      'Lunch: chicken, rice, salad',
      'Dinner: fish or lean beef + potatoes + veggies',
      'Snack: Greek yogurt + nuts',
    ],
    vegetarian: [
      'Breakfast: Greek yogurt bowl + granola',
      'Lunch: lentil curry + rice',
      'Dinner: tofu stir-fry + quinoa',
      'Snack: cottage cheese or protein smoothie',
    ],
    vegan: [
      'Breakfast: tofu scramble + toast',
      'Lunch: chickpea bowl + tahini',
      'Dinner: tempeh + sweet potato + greens',
      'Snack: peanut butter banana smoothie + pea protein',
    ],
    carnivore: [
      'Breakfast: eggs + steak',
      'Lunch: ground beef patties',
      'Dinner: salmon or ribeye',
      'Snack: bone broth or leftover meat',
    ],
    pescatarian: [
      'Breakfast: eggs + fruit',
      'Lunch: tuna salad + potatoes',
      'Dinner: salmon + rice + broccoli',
      'Snack: skyr / Greek yogurt',
    ],
  };

  return [
    `### ${mode === 'surplus' ? 'Weight-gain' : 'Fat-loss'} diet (${food})`,
    `Aim for a ${kcal}. Hit ${protein}. Drink water. Keep it boring-consistent 80% of the time.`,
    '',
    'Sample day:',
    ...samples[food].map((s) => `• ${s}`),
    '',
    'Ask me for a full 7-day menu or grocery list if you want more detail.',
  ].join('\n');
}

function fatLossRoutine(): string {
  return [
    '### This week’s fat-loss routine (Fortachones-friendly)',
    'Do ≥5 training days. Keep sessions 35–55 min.',
    '',
    '• Day 1 — Full body strength (squat, push, hinge, row)',
    '• Day 2 — Zone-2 cardio 40 min (run/bike/row)',
    '• Day 3 — Upper push/pull + core',
    '• Day 4 — Intervals 20–25 min (or sports/padel/soccer)',
    '• Day 5 — Lower body + easy walk 20 min',
    '• Optional Day 6 — Double day: short mobility AM + sport PM (banks a credit)',
    '',
    'Ask for a 4-week progressive plan if you want the long game.',
  ].join('\n');
}

function climbingPlan(): string {
  return [
    '### Climbing-focused week',
    '• 2× hangboard or fingerboard (after warm-up, never cold)',
    '• 2× climbing sessions (limit projects; volume on easier grades)',
    '• 1× antagonist + pull strength (rows, push-ups, face pulls)',
    '• 1× zone-2 aerobic for recovery capacity',
    '• Optional double day: easy traverse + antagonist',
    '',
    'Sleep and skin care matter as much as finger strength. Want a 4-week peaking plan?',
  ].join('\n');
}

function improveExercisePlan(exercise: string): string {
  return [
    `### Improve at ${exercise} — weekly template`,
    `• 3× focused ${exercise} skill/practice sessions`,
    '• 2× supporting strength (posterior chain + core + scapular)',
    '• 1× easy aerobic recovery',
    '• Film one set weekly and review form',
    '',
    'Tell me your current level and equipment and I’ll sharpen this.',
  ].join('\n');
}
