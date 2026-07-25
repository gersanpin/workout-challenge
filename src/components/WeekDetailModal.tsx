import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Muted } from './ui';
import { borderWidth, colors, spacing, typography } from '../constants/theme';
import {
  addDays,
  formatWeekLabel,
  getWeekEnd,
  getWeekStart,
  isWeekClosed,
  parseDateOnly,
  todayDateOnly,
} from '../lib/dates';
import { exerciseTypeLabel } from '../lib/workoutsApi';
import type { Workout } from '../types';

const WEEKDAY_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const;
const WEEKDAY_LONG = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export interface WeekDayInfo {
  date: string;
  short: string;
  label: string;
  workouts: Workout[];
}

export function buildWeekDays(
  weekStart: string,
  workouts: Workout[],
): WeekDayInfo[] {
  const end = getWeekEnd(weekStart);
  const byDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    if (!w.photo_url?.trim()) continue;
    if (w.workout_date < weekStart || w.workout_date > end) continue;
    const list = byDate.get(w.workout_date) ?? [];
    list.push(w);
    byDate.set(w.workout_date, list);
  }

  return WEEKDAY_SHORT.map((short, i) => {
    const date = addDays(weekStart, i);
    const dayWorkouts = (byDate.get(date) ?? []).sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
    return {
      date,
      short,
      label: WEEKDAY_LONG[i],
      workouts: dayWorkouts,
    };
  });
}

export function WeekDetailModal({
  visible,
  title,
  weekStart,
  workouts,
  initialDate,
  onClose,
  onDeleteWorkout,
}: {
  visible: boolean;
  title: string;
  weekStart: string;
  workouts: Workout[];
  /** When set, scroll/highlight that day first. */
  initialDate?: string | null;
  onClose: () => void;
  /** If provided, own workouts in an open week can be removed. */
  onDeleteWorkout?: (workout: Workout) => void;
}) {
  const days = useMemo(
    () => buildWeekDays(weekStart, workouts),
    [weekStart, workouts],
  );
  const [focusDate, setFocusDate] = useState<string | null>(initialDate ?? null);
  const today = todayDateOnly();

  useEffect(() => {
    if (visible) setFocusDate(initialDate ?? null);
  }, [visible, initialDate]);

  const focus = focusDate
    ? days.find((d) => d.date === focusDate) ?? null
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Muted>{formatWeekLabel(weekStart)}</Muted>

          <View style={styles.dayRow}>
            {days.map((d) => {
              const n = d.workouts.length;
              const on = focusDate === d.date;
              return (
                <Pressable
                  key={d.date}
                  onPress={() => setFocusDate(d.date)}
                  style={[
                    styles.dayChip,
                    n === 0 && styles.dayNone,
                    n === 1 && styles.daySingle,
                    n >= 2 && styles.dayDouble,
                    on && styles.dayChipOn,
                  ]}
                >
                  <Text style={styles.dayChipShort}>{d.short}</Text>
                  <Text style={styles.dayChipNum}>{parseDateOnly(d.date).getDate()}</Text>
                  <Text style={styles.dayChipStatus}>
                    {n >= 2 ? '2×' : n === 1 ? '✓' : '—'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {focus ? (
              <DayDetail
                day={focus}
                today={today}
                onDeleteWorkout={onDeleteWorkout}
              />
            ) : (
              days.map((d) => (
                <DayDetail
                  key={d.date}
                  day={d}
                  compact
                  today={today}
                  onDeleteWorkout={onDeleteWorkout}
                />
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            {focus ? (
              <Button
                label="VER TODA LA SEMANA"
                variant="secondary"
                onPress={() => setFocusDate(null)}
              />
            ) : null}
            <Button label="CERRAR" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DayDetail({
  day,
  compact,
  today,
  onDeleteWorkout,
}: {
  day: WeekDayInfo;
  compact?: boolean;
  today: string;
  onDeleteWorkout?: (workout: Workout) => void;
}) {
  const n = day.workouts.length;
  const dateLabel = parseDateOnly(day.date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const canDeleteDay =
    Boolean(onDeleteWorkout) &&
    !isWeekClosed(getWeekStart(day.date), today);

  return (
    <View style={[styles.dayBlock, compact && styles.dayBlockCompact]}>
      <Text style={styles.dayHeading}>
        {day.label} · {dateLabel}
      </Text>
      {n === 0 ? (
        <Text style={styles.noWorkout}>Sin ejercicio</Text>
      ) : (
        <>
          <Text style={styles.statusLine}>
            {n >= 2 ? `DÍA DOBLE · ${n} registros` : 'Con ejercicio'}
          </Text>
          {day.workouts.map((w, i) => (
            <View key={w.id} style={styles.workoutRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.workoutType}>
                  {n >= 2 ? `#${i + 1} · ` : ''}
                  {exerciseTypeLabel(w.exercise_type)}
                </Text>
                <Muted>
                  {new Date(w.created_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Muted>
              </View>
              {w.photo_url ? (
                <Image source={{ uri: w.photo_url }} style={styles.thumb} />
              ) : null}
              {canDeleteDay ? (
                <Pressable
                  onPress={() => onDeleteWorkout?.(w)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>QUITAR</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/** Strip of Lun–Dom chips for Home week cards. */
export function WeekDayStrip({
  weekStart,
  workouts,
  onPressDay,
  onPressWeek,
}: {
  weekStart: string;
  workouts: Workout[];
  onPressDay: (date: string) => void;
  onPressWeek: () => void;
}) {
  const days = useMemo(
    () => buildWeekDays(weekStart, workouts),
    [weekStart, workouts],
  );
  const today = todayDateOnly();

  return (
    <View style={styles.stripWrap}>
      <Pressable onPress={onPressWeek} hitSlop={8}>
        <Text style={styles.stripHint}>Toca un día o la sección para ver detalle</Text>
      </Pressable>
      <View style={styles.dayRow}>
        {days.map((d) => {
          const n = d.workouts.length;
          const isToday = d.date === today;
          return (
            <Pressable
              key={d.date}
              onPress={() => onPressDay(d.date)}
              style={[
                styles.dayChip,
                n === 0 && styles.dayNone,
                n === 1 && styles.daySingle,
                n >= 2 && styles.dayDouble,
                isToday && styles.dayToday,
              ]}
            >
              <Text style={styles.dayChipShort}>{d.short}</Text>
              <Text style={styles.dayChipNum}>{parseDateOnly(d.date).getDate()}</Text>
              <Text style={styles.dayChipStatus}>
                {n >= 2 ? '2×' : n === 1 ? '✓' : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopWidth: borderWidth.thick,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '88%',
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 28,
    letterSpacing: 1,
  },
  dayRow: { flexDirection: 'row', gap: 4 },
  dayChip: {
    flex: 1,
    borderWidth: borderWidth.thick,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
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
  dayChipOn: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  dayToday: {
    borderColor: colors.text,
  },
  dayChipShort: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 11,
  },
  dayChipNum: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 16,
  },
  dayChipStatus: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 12,
  },
  body: { flexGrow: 0 },
  bodyContent: { gap: spacing.md, paddingBottom: spacing.md },
  dayBlock: {
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dayBlockCompact: {},
  dayHeading: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  noWorkout: {
    ...typography.body,
    color: colors.textDim,
  },
  statusLine: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 14,
    letterSpacing: 1,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingTop: spacing.sm,
  },
  workoutType: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  thumb: {
    width: 56,
    height: 56,
    backgroundColor: colors.surface,
  },
  deleteBtn: {
    borderWidth: borderWidth.thick,
    borderColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  deleteText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.danger,
    fontSize: 12,
    letterSpacing: 1,
  },
  footer: { gap: spacing.sm },
  stripWrap: { gap: spacing.sm },
  stripHint: {
    ...typography.caption,
    color: colors.textDim,
  },
});
