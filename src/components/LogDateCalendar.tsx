import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, spacing } from '../constants/theme';
import {
  addDays,
  formatDateOnly,
  parseDateOnly,
  todayDateOnly,
} from '../lib/dates';

export type DayWorkoutStatus = 'none' | 'single' | 'double';

/**
 * Interactive calendar for log date: shows current month grid.
 * Only today and up to `lookbackDays` back are tappable; others disabled.
 * Colors: none/rest, single workout, double day (2+).
 */
export function LogDateCalendar({
  value,
  lookbackDays,
  isAllowed,
  onChange,
  workoutCountsByDate = {},
}: {
  value: string;
  lookbackDays: number;
  isAllowed: (date: string) => boolean;
  onChange: (date: string) => void;
  workoutCountsByDate?: Record<string, number>;
}) {
  const today = todayDateOnly();
  const anchor = parseDateOnly(today);

  const { cells, monthLabel } = useMemo(() => {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ date: string; day: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = formatDateOnly(new Date(year, month, d));
      cells.push({ date, day: d });
    }
    const label = first.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
    });
    return { cells, monthLabel: label.toUpperCase() };
  }, [today]);

  const quick = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i <= lookbackDays; i++) {
      const d = addDays(today, -i);
      if (isAllowed(d)) list.push(d);
    }
    return list;
  }, [today, lookbackDays, isAllowed]);

  const statusOf = (date: string): DayWorkoutStatus => {
    const n = workoutCountsByDate[date] ?? 0;
    if (n >= 2) return 'double';
    if (n === 1) return 'single';
    return 'none';
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.month}>{monthLabel}</Text>
      <View style={styles.legend}>
        <LegendDot color={colors.dayRestBorder} label="Sin ejercicio" />
        <LegendDot color={colors.dayWorkoutBorder} label="Ejercicio" />
        <LegendDot color={colors.dayDoubleBorder} label="Doble" />
      </View>
      <View style={styles.weekHead}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <Text key={d} style={styles.weekHeadText}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <View key={`e-${idx}`} style={styles.cell} />;
          }
          const allowed = isAllowed(cell.date);
          const selected = cell.date === value;
          const isToday = cell.date === today;
          const status = statusOf(cell.date);
          return (
            <Pressable
              key={cell.date}
              disabled={!allowed}
              onPress={() => onChange(cell.date)}
              style={[
                styles.cell,
                styles.day,
                status === 'none' && styles.dayNone,
                status === 'single' && styles.daySingle,
                status === 'double' && styles.dayDouble,
                allowed && styles.dayAllowed,
                selected && styles.daySelected,
                !allowed && styles.dayDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  status === 'single' && styles.dayTextSingle,
                  status === 'double' && styles.dayTextDouble,
                  selected && styles.dayTextSelected,
                  !allowed && styles.dayTextDisabled,
                  isToday && !selected && styles.dayTextToday,
                ]}
              >
                {cell.day}
              </Text>
              {status === 'double' ? (
                <Text style={styles.doubleMark}>2×</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.quickRow}>
        {quick.map((d) => {
          const status = statusOf(d);
          return (
            <Pressable
              key={d}
              onPress={() => onChange(d)}
              style={[
                styles.quickChip,
                status === 'single' && styles.quickSingle,
                status === 'double' && styles.quickDouble,
                d === value && styles.quickChipOn,
              ]}
            >
              <Text
                style={[
                  styles.quickText,
                  status === 'double' && styles.quickTextDouble,
                  d === value && styles.quickTextOn,
                ]}
              >
                {d === today ? 'HOY' : d.slice(8)}
                {status === 'double' ? ' 2×' : status === 'single' ? ' ✓' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  month: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 20,
    letterSpacing: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10 },
  legendText: {
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    fontSize: 11,
  },
  weekHead: { flexDirection: 'row' },
  weekHeadText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  day: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayNone: {
    backgroundColor: colors.dayRest,
    borderColor: colors.dayRestBorder,
  },
  daySingle: {
    backgroundColor: colors.dayWorkout,
    borderColor: colors.dayWorkoutBorder,
  },
  dayDouble: {
    backgroundColor: colors.dayDouble,
    borderColor: colors.dayDoubleBorder,
  },
  dayAllowed: {},
  daySelected: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: colors.text,
  },
  dayTextSingle: { color: colors.accent },
  dayTextDouble: { color: colors.dayDoubleBorder },
  dayTextSelected: { color: colors.text },
  dayTextDisabled: { color: colors.textDim },
  dayTextToday: { textDecorationLine: 'underline' },
  doubleMark: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 10,
    color: colors.dayDoubleBorder,
    marginTop: -2,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  quickChip: {
    borderWidth: borderWidth.thick,
    borderColor: colors.dayRestBorder,
    backgroundColor: colors.dayRest,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickSingle: {
    borderColor: colors.dayWorkoutBorder,
    backgroundColor: colors.dayWorkout,
  },
  quickDouble: {
    borderColor: colors.dayDoubleBorder,
    backgroundColor: colors.dayDouble,
  },
  quickChipOn: {
    borderColor: colors.accent,
  },
  quickText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 14,
  },
  quickTextDouble: { color: colors.dayDoubleBorder },
  quickTextOn: { color: colors.accent },
});
