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
    'Eres Don Fortachón — el entrenador de Fortachones: experto práctico en deporte y nutrición para un reto entre amigos.',
    'Habla con garra de gym/lucha libre, pero sé conciso, útil y específico. Prefiere planes semanales y comidas simples de supermercado.',
    'Fírmate mentalmente como Don Fortachón. Responde siempre en español (México).',
    `Atleta: ${profile.display_name}`,
    profile.height_m ? `Altura: ${profile.height_m} m` : '',
    profile.weight_kg ? `Peso: ${profile.weight_kg} kg` : '',
    profile.goal_type ? `Meta: ${profile.goal_type}` : '',
    profile.goal_exercise ? `Ejercicio foco: ${profile.goal_exercise}` : '',
    profile.food_preference ? `Preferencia alimentaria: ${profile.food_preference}` : '',
    'Unidades métricas (kg, metros). Sin afirmaciones médicas.',
  ]
    .filter(Boolean)
    .join('\n');
}

function localCoachReply(profile: Profile, userMessage: string): string {
  const goal = profile.goal_type as GoalType | null;
  const food = (profile.food_preference as FoodPreference | null) ?? 'omnivore';
  const lower = userMessage.toLowerCase();

  if (
    lower.includes('dieta') ||
    lower.includes('comida') ||
    lower.includes('meal') ||
    goal === 'gain_weight'
  ) {
    return dietPlan(food, goal === 'lose_weight' ? 'cut' : 'surplus');
  }
  if (
    lower.includes('escal') ||
    lower.includes('climb') ||
    profile.goal_exercise?.toLowerCase().includes('escal') ||
    profile.goal_exercise?.toLowerCase().includes('climb')
  ) {
    return climbingPlan();
  }
  if (
    goal === 'lose_weight' ||
    lower.includes('rutina') ||
    lower.includes('entreno') ||
    lower.includes('workout')
  ) {
    return fatLossRoutine();
  }
  if (goal === 'improve_exercise') {
    return improveExercisePlan(profile.goal_exercise || 'tu deporte');
  }

  return [
    `¡Hola ${profile.display_name}! Puedo armarte una rutina semanal, un plan de 4 semanas o una dieta sencilla.`,
    '',
    'Prueba preguntar:',
    '• “Dame los entrenamientos de esta semana”',
    '• “Plan de 4 semanas para subir de peso”',
    '• “Ideas vegetarianas para bajar grasa”',
    '• “Plan de dedos y jalón para escalar”',
    '',
    profile.goal_type
      ? `Veo que tu meta es ${labelGoal(profile.goal_type)} — dime y lo adapto.`
      : 'Configura tu meta en el perfil (subir / bajar / mejorar) para planes a tu medida.',
  ].join('\n');
}

function labelGoal(g: GoalType): string {
  if (g === 'gain_weight') return 'subir de peso';
  if (g === 'lose_weight') return 'bajar de peso';
  return 'mejorar en un ejercicio';
}

function dietPlan(food: FoodPreference, mode: 'surplus' | 'cut'): string {
  const kcal =
    mode === 'surplus'
      ? 'superávit calórico moderado'
      : 'déficit moderado (~300–500 kcal)';
  const protein =
    mode === 'surplus' ? '1.6–2.2 g proteína / kg' : '1.8–2.4 g proteína / kg';

  const samples: Record<FoodPreference, string[]> = {
    omnivore: [
      'Desayuno: huevos + avena + fruta',
      'Comida: pollo, arroz, ensalada',
      'Cena: pescado o res magra + papas + verduras',
      'Colación: yogurt griego + nueces',
    ],
    vegetarian: [
      'Desayuno: bowl de yogurt griego + granola',
      'Comida: curry de lentejas + arroz',
      'Cena: salteado de tofu + quinoa',
      'Colación: requesón o batido de proteína',
    ],
    vegan: [
      'Desayuno: tofu revuelto + pan',
      'Comida: bowl de garbanzos + tahini',
      'Cena: tempeh + camote + verduras',
      'Colación: batido de plátano + mantequilla de cacahuate + proteína de chícharo',
    ],
    carnivore: [
      'Desayuno: huevos + bistec',
      'Comida: carne molida',
      'Cena: salmón o ribeye',
      'Colación: caldo de huesos o carne sobrante',
    ],
    pescatarian: [
      'Desayuno: huevos + fruta',
      'Comida: ensalada de atún + papas',
      'Cena: salmón + arroz + brócoli',
      'Colación: skyr / yogurt griego',
    ],
  };

  return [
    `### Dieta ${mode === 'surplus' ? 'para subir peso' : 'para bajar grasa'} (${food})`,
    `Apunta a un ${kcal}. Busca ${protein}. Toma agua. Manténlo simple el 80% del tiempo.`,
    '',
    'Día de ejemplo:',
    ...samples[food].map((s) => `• ${s}`),
    '',
    'Pídeme un menú de 7 días o lista de súper si quieres más detalle.',
  ].join('\n');
}

function fatLossRoutine(): string {
  return [
    '### Rutina de la semana para bajar grasa (estilo Fortachones)',
    'Haz ≥5 días de entreno. Sesiones de 35–55 min.',
    '',
    '• Día 1 — Fuerza cuerpo completo (sentadilla, empuje, bisagra, remo)',
    '• Día 2 — Cardio zona 2, 40 min (correr/bici/remo)',
    '• Día 3 — Tren superior empuje/jalón + core',
    '• Día 4 — Intervalos 20–25 min (o deporte/pádel/fútbol)',
    '• Día 5 — Pierna + caminata fácil 20 min',
    '• Día 6 opcional — Día doble: movilidad AM + deporte PM (acumula crédito)',
    '',
    'Pide un plan progresivo de 4 semanas si quieres el largo plazo.',
  ].join('\n');
}

function climbingPlan(): string {
  return [
    '### Semana enfocada en escalar',
    '• 2× hangboard o fingerboard (después de calentar, nunca en frío)',
    '• 2× sesiones de escalada (proyectos límite; volumen en grados fáciles)',
    '• 1× antagonistas + fuerza de jalón (remos, flexiones, face pulls)',
    '• 1× aeróbico zona 2 para recuperación',
    '• Día doble opcional: travesía fácil + antagonistas',
    '',
    'Dormir y cuidar la piel importan tanto como la fuerza de dedos. ¿Quieres un plan de 4 semanas para pico?',
  ].join('\n');
}

function improveExercisePlan(exercise: string): string {
  return [
    `### Mejorar en ${exercise} — plantilla semanal`,
    `• 3× sesiones de técnica / práctica de ${exercise}`,
    '• 2× fuerza de soporte (cadena posterior + core + escápulas)',
    '• 1× recuperación aeróbica suave',
    '• Graba una serie a la semana y revisa la forma',
    '',
    'Cuéntame tu nivel y equipo y lo afino.',
  ].join('\n');
}
