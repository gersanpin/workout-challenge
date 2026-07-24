import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, spacing } from '../constants/theme';
import {
  addDays,
  formatDateOnly,
  parseDateOnly,
  todayDateOnly,
} from '../lib/dates';

/**
 * Interactive calendar for log date: shows current month grid.
 * Only today and up to `lookbackDays` back are tappable; others disabled.
 */
export function LogDateCalendar({
  value,
  lookbackDays,
  isAllowed,
  onChange,
}: {
  value: string;
  lookbackDays: number;
  isAllowed: (date: string) => boolean;
  onChange: (date: string) => void;
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.month}>{monthLabel}</Text>
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
          return (
            <Pressable
              key={cell.date}
              disabled={!allowed}
              onPress={() => onChange(cell.date)}
              style={[
                styles.cell,
                styles.day,
                allowed && styles.dayAllowed,
                selected && styles.daySelected,
                !allowed && styles.dayDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.dayTextSelected,
                  !allowed && styles.dayTextDisabled,
                  isToday && !selected && styles.dayTextToday,
                ]}
              >
                {cell.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.quickRow}>
        {quick.map((d) => (
          <Pressable
            key={d}
            onPress={() => onChange(d)}
            style={[styles.quickChip, d === value && styles.quickChipOn]}
          >
            <Text
              style={[styles.quickText, d === value && styles.quickTextOn]}
            >
              {d === today ? 'HOY' : d.slice(8)}
            </Text>
          </Pressable>
        ))}
      </View>
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
  dayAllowed: {
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
  },
  daySelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    color: colors.text,
  },
  dayTextSelected: { color: colors.black },
  dayTextDisabled: { color: colors.textDim },
  dayTextToday: { color: colors.accent },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  quickChip: {
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  quickText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 14,
  },
  quickTextOn: { color: colors.accent },
});
