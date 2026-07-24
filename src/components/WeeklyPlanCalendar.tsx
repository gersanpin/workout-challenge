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
          return (
            <Pressable
              key={d.key}
              onPress={() => setSelected(d)}
              style={[styles.dayBox, on && styles.dayBoxOn]}
            >
              <Text style={[styles.dayShort, on && styles.dayShortOn]}>
                {d.short}
              </Text>
              <Text style={[styles.dayMin, on && styles.dayShortOn]}>
                {d.workout.isRest ? 'REST' : `${d.workout.durationMinutes}m`}
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
            <Text style={styles.line}>Snack: {selected.meals.snack}</Text>
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
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  dayBoxOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  dayShort: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  dayShortOn: { color: colors.accent },
  dayMin: {
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    fontSize: 10,
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
