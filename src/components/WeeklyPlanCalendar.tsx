import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Muted } from './ui';
import { borderWidth, colors, spacing, typography } from '../constants/theme';
import type { DayPlan, WeeklyPlanContent } from '../types';

export function WeeklyPlanCalendar({ plan }: { plan: WeeklyPlanContent }) {
  const [selected, setSelected] = useState<DayPlan | null>(plan.days[0] ?? null);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {plan.days.map((d) => {
          const on = selected?.key === d.key;
          const rest = Boolean(d.workout.isRest);
          return (
            <Pressable
              key={d.key}
              onPress={() => setSelected(d)}
              style={[
                styles.dayBox,
                rest ? styles.dayBoxRest : styles.dayBoxWork,
                on && (rest ? styles.dayBoxRestOn : styles.dayBoxOn),
              ]}
            >
              <Text
                style={[
                  styles.dayShort,
                  rest && styles.dayShortRest,
                  on && styles.dayShortOn,
                ]}
              >
                {d.short}
              </Text>
              <Text
                style={[
                  styles.dayMin,
                  rest && styles.dayMinRest,
                  on && styles.dayShortOn,
                ]}
              >
                {rest ? 'DESC' : `${d.workout.durationMinutes}m`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.dayTitle}>{selected.label.toUpperCase()}</Text>

          <Text style={styles.section}>META / EJERCICIO</Text>
          <Text style={styles.workoutTitle}>
            {selected.workout.title}
            {!selected.workout.isRest
              ? ` · ${selected.workout.durationMinutes} min`
              : ''}
          </Text>
          {selected.workout.exercises.map((e, i) => (
            <Text key={`${e.name}-${i}`} style={styles.line}>
              • {e.name}
              {e.detail ? ` — ${e.detail}` : ''}
            </Text>
          ))}

          <Text style={[styles.section, { marginTop: spacing.md }]}>COMIDA</Text>
          <Text style={styles.line}>Desayuno: {selected.meals.breakfast}</Text>
          <Text style={styles.line}>Comida: {selected.meals.lunch}</Text>
          <Text style={styles.line}>Cena: {selected.meals.dinner}</Text>
          {selected.meals.snack ? (
            <Text style={styles.line}>Colación: {selected.meals.snack}</Text>
          ) : null}
        </View>
      ) : (
        <Muted>Toca un día</Muted>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: 4 },
  dayBox: {
    flex: 1,
    borderWidth: borderWidth.thick,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  dayBoxWork: {
    borderColor: colors.dayWorkoutBorder,
    backgroundColor: colors.dayWorkout,
  },
  dayBoxRest: {
    borderColor: colors.dayRestBorder,
    backgroundColor: colors.dayRest,
  },
  dayBoxOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  dayBoxRestOn: {
    borderColor: colors.textMuted,
    backgroundColor: '#25282A',
  },
  dayShort: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  dayShortRest: { color: colors.textMuted },
  dayShortOn: { color: colors.accent },
  dayMin: {
    fontFamily: 'Inter_500Medium',
    color: colors.accent,
    fontSize: 10,
  },
  dayMinRest: {
    color: colors.textDim,
  },
  detail: {
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
    padding: spacing.md,
    gap: 6,
  },
  dayTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 24,
    letterSpacing: 1,
  },
  section: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 16,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  workoutTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  line: {
    ...typography.body,
    color: colors.text,
    lineHeight: 21,
  },
});
