import type {
  DayMeals,
  DayPlan,
  DayWorkoutPlan,
  FoodPreference,
  GoalType,
  Profile,
  WeekdayKey,
  WeeklyPlanContent,
} from '../types';
import { WEEKDAY_ORDER } from '../types';
import { askCoach, type CoachMessage } from './coach';

export type { WeeklyPlanContent };
const LABELS: Record<WeekdayKey, { label: string; short: string }> = {
  mon: { label: 'Lunes', short: 'LUN' },
  tue: { label: 'Martes', short: 'MAR' },
  wed: { label: 'Miércoles', short: 'MIÉ' },
  thu: { label: 'Jueves', short: 'JUE' },
  fri: { label: 'Viernes', short: 'VIE' },
  sat: { label: 'Sábado', short: 'SÁB' },
  sun: { label: 'Domingo', short: 'DOM' },
};

function w(
  title: string,
  durationMinutes: number,
  exercises: { name: string; detail?: string }[],
  isRest = false,
): DayWorkoutPlan {
  return { title, durationMinutes, exercises, isRest };
}

function rest(): DayWorkoutPlan {
  return w(
    'Descanso',
    20,
    [
      {
        name: 'Caminata suave o estiramientos',
        detail: '15–20 min opcional',
      },
      {
        name: 'Hidratación y sueño',
        detail: 'Prioriza recuperación — no cuenta como día de ejercicio del reto',
      },
    ],
    true,
  );
}

export function generateWeeklyPlan(profile: Profile): WeeklyPlanContent {
  const goal = profile.goal_type as GoalType | null;
  const food = (profile.food_preference as FoodPreference | null) ?? 'omnivore';
  const exercise = profile.goal_exercise?.trim() || 'tu deporte';

  const workouts = buildWorkouts(goal, exercise);
  const meals = buildMealsWeek(food, goal);

  const days: DayPlan[] = WEEKDAY_ORDER.map((key, i) => ({
    key,
    label: LABELS[key].label,
    short: LABELS[key].short,
    workout: workouts[i],
    meals: meals[i],
  }));

  return {
    days,
    goalSection: days
      .map(
        (d) =>
          `${d.short} — ${d.workout.title} (${d.workout.durationMinutes} min)`,
      )
      .join('\n'),
    foodSection: days
      .map(
        (d) =>
          `${d.short}: D ${d.meals.breakfast} | C ${d.meals.lunch} | N ${d.meals.dinner}`,
      )
      .join('\n'),
  };
}

function buildWorkouts(
  goal: GoalType | null,
  exercise: string,
): DayWorkoutPlan[] {
  if (goal === 'lose_weight') {
    return [
      w('Cuerpo completo fuerza', 50, [
        { name: 'Sentadilla', detail: '4×8' },
        { name: 'Press banca o push-ups', detail: '4×8–12' },
        { name: 'Remo', detail: '4×10' },
        { name: 'Plancha', detail: '3×40s' },
      ]),
      w('Cardio zona 2', 40, [
        { name: 'Correr / bici / remo suave', detail: '40 min conversacional' },
      ]),
      w('Tren superior + core', 45, [
        { name: 'Press hombro', detail: '3×10' },
        { name: 'Dominadas o jalón', detail: '3×8' },
        { name: 'Face pulls', detail: '3×15' },
        { name: 'Dead bug', detail: '3×10/lado' },
      ]),
      w('Intervalos o deporte', 30, [
        { name: 'Intervalos 30/90', detail: '20–25 min' },
        { name: 'Enfriamiento caminata', detail: '5 min' },
      ]),
      w('Tren inferior + caminata', 45, [
        { name: 'Peso muerto rumano', detail: '3×10' },
        { name: 'Zancadas', detail: '3×10/pierna' },
        { name: 'Caminata', detail: '20 min' },
      ]),
      w('Día doble opcional', 35, [
        { name: 'AM: movilidad', detail: '15 min' },
        { name: 'PM: deporte o cardio corto', detail: '20 min' },
      ]),
      rest(),
    ];
  }

  if (goal === 'gain_weight') {
    return [
      w('Pierna pesada', 55, [
        { name: 'Sentadilla', detail: '5×5' },
        { name: 'Prensa', detail: '3×10' },
        { name: 'Curl femoral', detail: '3×12' },
      ]),
      w('Empuje', 50, [
        { name: 'Press banca', detail: '5×5' },
        { name: 'Press hombro', detail: '3×8' },
        { name: 'Fondos o press cerrado', detail: '3×10' },
      ]),
      w('Tirón', 50, [
        { name: 'Peso muerto', detail: '4×5' },
        { name: 'Remo barra', detail: '4×8' },
        { name: 'Dominadas', detail: '3×max' },
      ]),
      w('Cardio suave', 25, [
        { name: 'Caminata o bici fácil', detail: '25 min' },
      ]),
      w('Cuerpo completo hipertrofia', 55, [
        { name: 'Hack / goblet squat', detail: '3×10' },
        { name: 'Press inclinado', detail: '3×10' },
        { name: 'Remo mancuerna', detail: '3×12' },
        { name: 'Elevaciones laterales', detail: '3×15' },
      ]),
      w('Día doble opcional', 40, [
        { name: 'AM: brazos/core', detail: '20 min' },
        { name: 'PM: caminata', detail: '20 min' },
      ]),
      rest(),
    ];
  }

  if (goal === 'improve_exercise') {
    return [
      w(`Técnica ${exercise}`, 55, [
        { name: `Calentamiento específico ${exercise}`, detail: '8 min movilidad + 2 series vacías' },
        { name: `Bloque técnico ${exercise}`, detail: '6×3 @ RPE 6–7, descanso 2 min' },
        { name: 'Accesorios unilaterales', detail: '3×10/lado' },
        { name: 'Core anti-extensión', detail: '3×40s (dead bug o hollow)' },
      ]),
      w('Fuerza de soporte', 50, [
        { name: 'Sentadilla goblet o front squat', detail: '4×6' },
        { name: 'Press banca o push-up lastrado', detail: '4×8' },
        { name: 'Remo mancuerna', detail: '4×10/brazo' },
        { name: 'Face pulls', detail: '3×15' },
        { name: 'Movilidad hombros/cadera', detail: '8 min' },
      ]),
      w(`Sesión calidad ${exercise}`, 60, [
        { name: `Proyectos / intentos ${exercise}`, detail: '35 min calidad, no fallar a lo bruto' },
        { name: 'Volumen secundario fácil', detail: '4×8 @ RPE 5' },
        { name: 'Estiramiento dirigido', detail: '10 min' },
      ]),
      w('Recuperación activa', 35, [
        { name: 'Cardio zona 2 (caminata/bici)', detail: '20–25 min conversacional' },
        { name: 'Foam roll + movilidad', detail: '10 min' },
      ]),
      w(`${exercise} + antagonistas`, 55, [
        { name: `Bloque principal ${exercise}`, detail: '5×4 @ RPE 7' },
        { name: 'Antagonistas (opuesto al patrón)', detail: '3×12' },
        { name: 'Isométricos de estabilización', detail: '3×30s' },
      ]),
      w('Día doble corto', 40, [
        { name: 'AM: técnica ligera', detail: '20 min, solo forma' },
        { name: 'PM: movilidad o caminata', detail: '15–20 min' },
      ]),
      rest(),
    ];
  }

  return [
    w('Cuerpo completo fuerza', 50, [
      { name: 'Sentadilla o goblet squat', detail: '4×8' },
      { name: 'Press banca / push-ups', detail: '4×8–12' },
      { name: 'Remo barra o mancuerna', detail: '4×10' },
      { name: 'Plancha', detail: '3×40s' },
    ]),
    w('Cardio zona 2', 40, [
      { name: 'Correr, bici o remo suave', detail: '35–40 min ritmo conversacional' },
      { name: 'Estiramientos', detail: '5 min' },
    ]),
    w('Tren superior + core', 45, [
      { name: 'Press hombro mancuernas', detail: '3×10' },
      { name: 'Dominadas o jalón al pecho', detail: '3×8' },
      { name: 'Face pulls', detail: '3×15' },
      { name: 'Dead bug', detail: '3×10/lado' },
    ]),
    w('Intervalos o deporte', 35, [
      { name: 'Intervalos 30s duro / 90s fácil', detail: '20–25 min' },
      { name: 'Enfriamiento caminata', detail: '5–8 min' },
    ]),
    w('Tren inferior + caminata', 50, [
      { name: 'Peso muerto rumano', detail: '3×10' },
      { name: 'Zancadas caminando', detail: '3×10/pierna' },
      { name: 'Elevación de talones', detail: '3×15' },
      { name: 'Caminata', detail: '15–20 min' },
    ]),
    w('Día doble opcional', 40, [
      { name: 'AM: movilidad completa', detail: '15–20 min' },
      { name: 'PM: deporte o cardio corto', detail: '20 min' },
    ]),
    rest(),
  ];
}

function buildMealsWeek(
  food: FoodPreference,
  goal: GoalType | null,
): DayMeals[] {
  const mode =
    goal === 'lose_weight'
      ? 'cut'
      : goal === 'gain_weight'
        ? 'bulk'
        : 'maintain';

  const templates = mealTemplates(food, mode);
  // Rotate so each day is distinct
  return WEEKDAY_ORDER.map((_, i) => templates[i % templates.length]);
}

function mealTemplates(
  food: FoodPreference,
  mode: 'cut' | 'bulk' | 'maintain',
): DayMeals[] {
  const p =
    mode === 'bulk' ? 'porción grande' : mode === 'cut' ? 'porción controlada' : 'porción media';

  const byFood: Record<FoodPreference, DayMeals[]> = {
    omnivore: [
      {
        breakfast: `Huevos 3u + avena 60g + plátano (${p})`,
        lunch: `Pechuga 180g + arroz 120g seco + ensalada`,
        dinner: `Salmón 150g + papa 250g + brócoli`,
        snack: `Yogurt griego 200g + almendras 20g`,
      },
      {
        breakfast: `Tortilla de claras + pan integral 2 rebanadas + fruta`,
        lunch: `Carne molida 150g + pasta integral 90g + verduras`,
        dinner: `Pollo muslo 2u + quinoa 80g + ensalada`,
        snack: `Cottage 150g + manzana`,
      },
      {
        breakfast: `Avena overnight 70g + wheyina whey + berries`,
        lunch: `Atún 1 lata + arroz 100g + aguacate 1/2`,
        dinner: `Bistec 160g + camote 200g + espárragos`,
        snack: `Batido proteína + plátano`,
      },
      {
        breakfast: `Huevos revueltos + frijoles 100g + tortilla`,
        lunch: `Bowl pollo 170g + arroz + pico de gallo`,
        dinner: `Pescado blanco 180g + verduras al vapor + aceite oliva 1cd`,
        snack: `Yogurt + granola 30g`,
      },
      {
        breakfast: `Panqueques avena + huevo + maple light`,
        lunch: `Wrap pavo + queso + ensalada`,
        dinner: `Albóndigas res 150g + pasta 80g + salsa tomate`,
        snack: `Frutos secos 25g`,
      },
      {
        breakfast: `Smoothie: leche, avena, PB 1cd, plátano`,
        lunch: `Sushi bowl casero (arroz, salmón, pepino, edamame)`,
        dinner: `Tacos de pescado (3) + col + limón`,
        snack: `Queso panela 80g`,
      },
      {
        breakfast: `Huevos + tocino magro + tomate`,
        lunch: `Leftover bowl: arroz + proteína del día anterior`,
        dinner: `Pollo rostizado 1/4 + ensalada grande`,
        snack: `Fruta + yogurt`,
      },
    ],
    vegetarian: [
      {
        breakfast: `Yogurt griego 250g + granola 40g + miel`,
        lunch: `Lentejas 200g cocidas + arroz 100g + ensalada`,
        dinner: `Tofu firme 200g salteado + quinoa 80g`,
        snack: `Hummus 80g + zanahoria`,
      },
      {
        breakfast: `Avena 70g + leche + mantequilla de cacahuate 1cd`,
        lunch: `Bowl garbanzos 1.5 taza + tahini + verduras`,
        dinner: `Huevos 3 + papas + espinaca`,
        snack: `Cottage 150g`,
      },
      {
        breakfast: `Tofu scramble + tortilla`,
        lunch: `Pasta + pesto + queso + chícharos`,
        dinner: `Tempeh 150g + camote + ensalada`,
        snack: `Smoothie proteína vegetal`,
      },
      {
        breakfast: `Pan integral + aguacate + huevo`,
        lunch: `Curry de garbanzo + arroz basmati`,
        dinner: `Lasagna de verduras + ricotta`,
        snack: `Yogurt + nueces 15g`,
      },
      {
        breakfast: `Overnight oats + chia + berries`,
        lunch: `Burrito de frijoles + arroz + queso`,
        dinner: `Seitan o proteína veg 150g + noodles`,
        snack: `Fruta`,
      },
      {
        breakfast: `Smoothie yogurt + avena + cacao`,
        lunch: `Ensalada fuerte: quinoa, huevo, feta, verduras`,
        dinner: `Pizza casera masa thin + vegetales + mozzarella`,
        snack: `Edamame 1 taza`,
      },
      {
        breakfast: `Huevos + frijoles refritos + salsa`,
        lunch: `Sopa de lentejas + pan`,
        dinner: `Bowl tofu + arroz + kimchi`,
        snack: `Yogurt`,
      },
    ],
    vegan: [
      {
        breakfast: `Tofu scramble + pan integral`,
        lunch: `Bowl garbanzos + arroz + tahini`,
        dinner: `Tempeh 150g + camote + kale`,
        snack: `Smoothie: plátano + proteína pea + PB`,
      },
      {
        breakfast: `Avena 70g + leche vegetal + semillas`,
        lunch: `Lentejas + quinoa + verduras asadas`,
        dinner: `Stir-fry tofu 200g + noodles de arroz`,
        snack: `Hummus + verduras`,
      },
      {
        breakfast: `Overnight oats + chia + berries`,
        lunch: `Burrito frijoles negros + arroz + guacamole`,
        dinner: `Chili de lentejas + pan`,
        snack: `Frutos secos 25g`,
      },
      {
        breakfast: `Smoothie verde + proteína`,
        lunch: `Buddha bowl: tofu, edamame, arroz, col`,
        dinner: `Pasta + salsa lentejas + champiñones`,
        snack: `Manzana + PB`,
      },
      {
        breakfast: `Pan + aguacate + tomate + semillas`,
        lunch: `Sopa miso + edamame + arroz`,
        dinner: `Tacos de jackfruit o hongos (3)`,
        snack: `Yogurt coco + granola`,
      },
      {
        breakfast: `Pancakes avena + plátano (sin huevo)`,
        lunch: `Couscous + garbanzos + vegetales`,
        dinner: `Curry de garbanzo + arroz`,
        snack: `Barra proteína vegana`,
      },
      {
        breakfast: `Avena + cacao + plátano`,
        lunch: `Leftover curry bowl`,
        dinner: `Tempeh al horno + ensalada grande`,
        snack: `Fruta`,
      },
    ],
    carnivore: [
      {
        breakfast: `Huevos 4 + bistec 150g`,
        lunch: `Carne molida 250g`,
        dinner: `Salmón 200g o ribeye 200g`,
        snack: `Caldo de huesos`,
      },
      {
        breakfast: `Huevos + tocino`,
        lunch: `Pollo muslos 2–3`,
        dinner: `Arrachera 200g`,
        snack: `Hígado o leftover carne`,
      },
      {
        breakfast: `Omellete carne`,
        lunch: `Atún en aceite / sardinas`,
        dinner: `Costillas o brisket 200g`,
        snack: `Caldo`,
      },
      {
        breakfast: `Huevos + salchicha de res`,
        lunch: `Bistec 180g`,
        dinner: `Pescado graso 200g`,
        snack: `Carnitas magras 100g`,
      },
      {
        breakfast: `Huevos 3 + carne molida 120g`,
        lunch: `Pollo rostizado (piel opcional)`,
        dinner: `Ribeye 220g`,
        snack: `Caldo`,
      },
      {
        breakfast: `Tiras de bistec + huevos`,
        lunch: `Hamburguesas res 2 (sin pan)`,
        dinner: `Salmón 220g`,
        snack: `Leftover`,
      },
      {
        breakfast: `Huevos + tocino`,
        lunch: `Carne del día anterior`,
        dinner: `Corte a elección 200g`,
        snack: `Caldo`,
      },
    ],
    pescatarian: [
      {
        breakfast: `Huevos 3 + fruta`,
        lunch: `Atún 1 lata + papa 250g + ensalada`,
        dinner: `Salmón 160g + arroz 100g + brócoli`,
        snack: `Yogurt / skyr 200g`,
      },
      {
        breakfast: `Avena + whey + berries`,
        lunch: `Bowl camarón 150g + arroz + vegetales`,
        dinner: `Pescado blanco 180g + camote`,
        snack: `Cottage 150g`,
      },
      {
        breakfast: `Pan + huevo + aguacate`,
        lunch: `Sushi bowl (salmón, arroz, pepino)`,
        dinner: `Tacos de pescado (3)`,
        snack: `Yogurt`,
      },
      {
        breakfast: `Smoothie yogurt + avena`,
        lunch: `Sardinas + ensalada + papa`,
        dinner: `Salmón al horno + quinoa`,
        snack: `Fruta + almendras 15g`,
      },
      {
        breakfast: `Huevos + queso panela`,
        lunch: `Wrap atún + verduras`,
        dinner: `Camarones al ajillo 180g + arroz`,
        snack: `Skyr`,
      },
      {
        breakfast: `Avena overnight`,
        lunch: `Poké casero (atún/salmón)`,
        dinner: `Filete pescado + verduras`,
        snack: `Yogurt`,
      },
      {
        breakfast: `Huevos + fruta`,
        lunch: `Leftover pescado bowl`,
        dinner: `Salmón 150g + ensalada grande`,
        snack: `Cottage`,
      },
    ],
  };

  return byFood[food];
}

export function formatPlanForDisplay(plan: WeeklyPlanContent): string {
  return plan.days
    .map((d) => {
      const ex = d.workout.exercises
        .map((e) => `  - ${e.name}${e.detail ? ` (${e.detail})` : ''}`)
        .join('\n');
      return [
        `${d.label.toUpperCase()}`,
        `META: ${d.workout.title} · ${d.workout.durationMinutes} min`,
        ex,
        `COMIDA:`,
        `  Desayuno: ${d.meals.breakfast}`,
        `  Comida: ${d.meals.lunch}`,
        `  Cena: ${d.meals.dinner}`,
        d.meals.snack ? `  Colación: ${d.meals.snack}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

export function ensureStructuredPlan(
  raw: Partial<WeeklyPlanContent> | null | undefined,
  profile: Profile,
): WeeklyPlanContent {
  if (raw?.days && Array.isArray(raw.days) && raw.days.length === 7) {
    return {
      days: raw.days,
      goalSection: raw.goalSection ?? '',
      foodSection: raw.foodSection ?? '',
    };
  }
  return generateWeeklyPlan(profile);
}

/**
 * Patch weekly plan from a natural-language request without full regen.
 * Uses OpenAI when available; otherwise local heuristics.
 */
export async function coachRevisePlan(
  profile: Profile,
  current: WeeklyPlanContent,
  history: CoachMessage[],
  userMessage: string,
): Promise<{ reply: string; plan: WeeklyPlanContent }> {
  const contextMessage = [
    userMessage,
    '',
    'Eres Don Fortachón, el coach de Fortachones. Actualiza SOLO lo pedido del plan semanal (comida o ejercicio de días específicos).',
    'No regeneres la semana completa salvo que lo pidan.',
    'Plan actual:',
    formatPlanForDisplay(current),
    '',
    'Responde consejo breve, luego el JSON completo del plan entre marcadores:',
    '<<<PLAN_JSON>>>',
    '{ "days": [ ...7 días con key,label,short,workout,meals ] }',
    '<<<FIN>>>',
  ].join('\n');

  const reply = await askCoach(profile, history, contextMessage);
  const fromJson = parsePlanJsonFromReply(reply, current);
  const jsonChanged =
    JSON.stringify(fromJson.days) !== JSON.stringify(current.days);
  const patched = syncTextSections(
    jsonChanged ? fromJson : localHeuristicPatch(current, userMessage),
  );
  // Always return a fresh object so React re-renders the calendar.
  const nextPlan: WeeklyPlanContent = {
    days: patched.days.map((d) => ({
      ...d,
      workout: {
        ...d.workout,
        exercises: d.workout.exercises.map((e) => ({ ...e })),
      },
      meals: { ...d.meals },
    })),
    goalSection: patched.goalSection,
    foodSection: patched.foodSection,
  };
  const cleanReply = reply
    .replace(/<<<PLAN_JSON>>>[\s\S]*?<<<FIN>>>/g, '')
    .replace(/<<<PLAN>>>[\s\S]*?<<<FIN>>>/g, '')
    .trim();

  return {
    reply:
      cleanReply ||
      'Listo — actualicé el plan de esta semana según lo que pediste.',
    plan: nextPlan,
  };
}

export function parsePlanJsonFromReply(
  reply: string,
  fallback: WeeklyPlanContent,
): WeeklyPlanContent {
  const block = reply.match(/<<<PLAN_JSON>>>([\s\S]*?)<<<FIN>>>/);
  if (!block) return fallback;
  try {
    const json = JSON.parse(block[1].trim());
    if (json?.days?.length === 7) {
      return {
        days: json.days,
        goalSection: fallback.goalSection,
        foodSection: fallback.foodSection,
      };
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Offline-friendly patches for common Spanish requests. */
export function localHeuristicPatch(
  current: WeeklyPlanContent,
  userMessage: string,
): WeeklyPlanContent {
  const lower = userMessage.toLowerCase();
  const days = current.days.map((d) => ({
    ...d,
    workout: {
      ...d.workout,
      exercises: d.workout.exercises.map((e) => ({ ...e })),
    },
    meals: { ...d.meals },
  }));

  const dayIdx = detectDayIndex(lower);

  if (
    (lower.includes('comida') ||
      lower.includes('cena') ||
      lower.includes('desayuno') ||
      lower.includes('dieta') ||
      lower.includes('platillo') ||
      lower.includes('menú') ||
      lower.includes('menu') ||
      lower.includes('no me gusta') ||
      lower.includes('cambia') ||
      lower.includes('cámbiame') ||
      lower.includes('cambiame') ||
      lower.includes('otra cosa') ||
      lower.includes('sugiere') ||
      lower.includes('suger') ||
      lower.includes('ingrediente')) &&
    dayIdx != null
  ) {
    days[dayIdx].meals = swapMeal(days[dayIdx].meals, lower);
    return syncTextSections({ ...current, days });
  }

  if (
    (lower.includes('comida') ||
      lower.includes('cena') ||
      lower.includes('dieta') ||
      lower.includes('no me gusta') ||
      lower.includes('cambia') ||
      lower.includes('otra cosa') ||
      lower.includes('sugiere')) &&
    dayIdx == null
  ) {
    for (let i = 0; i < days.length; i++) {
      if (i % 2 === 0) days[i].meals = swapMeal(days[i].meals, lower);
    }
    return syncTextSections({ ...current, days });
  }

  if (
    (lower.includes('ejercicio') ||
      lower.includes('rutina') ||
      lower.includes('entreno') ||
      lower.includes('workout') ||
      lower.includes('cambia') ||
      lower.includes('cámbiame') ||
      lower.includes('cambiame') ||
      lower.includes('otra cosa') ||
      lower.includes('sugiere')) &&
    dayIdx != null
  ) {
    days[dayIdx].workout = {
      ...days[dayIdx].workout,
      title: `${days[dayIdx].workout.title} (ajustado)`,
      isRest: false,
      durationMinutes: Math.max(30, days[dayIdx].workout.durationMinutes || 40),
      exercises: [
        ...days[dayIdx].workout.exercises.slice(0, 2),
        {
          name: 'Bloque alternativo pedido',
          detail: '3×10 — según tu mensaje al coach',
        },
      ],
    };
    return syncTextSections({ ...current, days });
  }

  // Generic "cámbiame este día / no me gusta" without clear meal vs workout → tweak both for today-ish day or first training day
  if (
    lower.includes('no me gusta') ||
    lower.includes('cámbiame') ||
    lower.includes('cambiame') ||
    lower.includes('cambia este') ||
    lower.includes('otra cosa')
  ) {
    const idx = dayIdx ?? days.findIndex((d) => !d.workout.isRest);
    const target = idx >= 0 ? idx : 0;
    days[target].meals = swapMeal(days[target].meals, lower);
    if (!days[target].workout.isRest) {
      days[target].workout = {
        ...days[target].workout,
        title: `${days[target].workout.title} (ajustado)`,
        exercises: [
          ...days[target].workout.exercises.slice(0, 2),
          { name: 'Variación del coach', detail: '3×12' },
        ],
      };
    }
    return syncTextSections({ ...current, days });
  }

  return syncTextSections(current);
}

function detectDayIndex(lower: string): number | null {
  const map: [string[], number][] = [
    [['lunes', 'lun'], 0],
    [['martes', 'mar'], 1],
    [['miércoles', 'miercoles', 'mié', 'mie'], 2],
    [['jueves', 'jue'], 3],
    [['viernes', 'vie'], 4],
    [['sábado', 'sabado', 'sáb', 'sab'], 5],
    [['domingo', 'dom'], 6],
  ];
  for (const [keys, idx] of map) {
    if (keys.some((k) => lower.includes(k))) return idx;
  }
  return null;
}

function swapMeal(meals: DayMeals, lower: string): DayMeals {
  const altDinner =
    'Cena alternativa: omelette de claras + verduras salteadas + papa 200g';
  const altLunch =
    'Comida alternativa: bowl de arroz 100g + proteína 150g + ensalada';
  const withIngredients = lower.includes('ingrediente')
    ? `Con lo que tienes: saltea proteína + verdura + carbo disponible (${meals.lunch})`
    : null;

  if (lower.includes('cena')) {
    return { ...meals, dinner: withIngredients || altDinner };
  }
  if (lower.includes('desayuno')) {
    return {
      ...meals,
      breakfast: 'Desayuno alt: avena 60g + fruta + proteína',
    };
  }
  return {
    ...meals,
    lunch: withIngredients || altLunch,
    dinner: altDinner,
  };
}

function syncTextSections(plan: WeeklyPlanContent): WeeklyPlanContent {
  return {
    days: plan.days,
    goalSection: plan.days
      .map(
        (d) =>
          `${d.short} — ${d.workout.title} (${d.workout.durationMinutes} min)`,
      )
      .join('\n'),
    foodSection: plan.days
      .map((d) => `${d.short}: ${d.meals.lunch} / ${d.meals.dinner}`)
      .join('\n'),
  };
}
