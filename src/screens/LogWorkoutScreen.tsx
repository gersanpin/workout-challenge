import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoid } from '../components/KeyboardAvoid';
import { Button, Field, Muted, Screen, Title } from '../components/ui';
import { LogDateCalendar } from '../components/LogDateCalendar';
import { WeightPlateStack } from '../components/WeightPlateStack';
import { LOG_LOOKBACK_DAYS, REQUIRED_WORKOUT_DAYS } from '../constants/challenge';
import { borderWidth, colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import { getAllowedLogDates, getWeekStart, todayDateOnly } from '../lib/dates';
import {
  deleteWorkout,
  exerciseTypeLabel,
  logWorkout,
  pickWorkoutPhoto,
} from '../lib/workoutsApi';
import { EXERCISE_TYPES } from '../types';
import type { Workout } from '../types';

export function LogWorkoutScreen() {
  const { user, profile } = useAuth();
  const { myWorkouts, weekSummaryForDate, refresh } = useChallengeData();

  const today = todayDateOnly();
  const allowed = useMemo(
    () => getAllowedLogDates(today, LOG_LOOKBACK_DAYS),
    [today],
  );

  const [exerciseType, setExerciseType] = useState('gym');
  const [customType, setCustomType] = useState('');
  const [workoutDate, setWorkoutDate] = useState(
    allowed.isAllowed(today) ? today : allowed.minDate,
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const workoutCountsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of myWorkouts) {
      if (!w.photo_url?.trim()) continue;
      map[w.workout_date] = (map[w.workout_date] ?? 0) + 1;
    }
    return map;
  }, [myWorkouts]);

  const dayCount = workoutCountsByDate[workoutDate] ?? 0;

  const workoutsThisDay = useMemo(
    () =>
      myWorkouts
        .filter((w) => w.workout_date === workoutDate && w.photo_url?.trim())
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
    [myWorkouts, workoutDate],
  );

  // Progress for the week that owns the selected workout_date (not "today"'s week).
  const targetWeek = weekSummaryForDate(workoutDate);
  const weekPoints = targetWeek?.progressPoints ?? 0;
  const weekRemaining = Math.max(0, REQUIRED_WORKOUT_DAYS - weekPoints);
  const sameWeekAsToday = getWeekStart(workoutDate) === getWeekStart(today);

  const onDelete = (workout: Workout) => {
    if (!user) return;
    Alert.alert(
      '¿Quitar este entrenamiento?',
      'Si pusiste uno de más, se elimina el registro y su post en el chat. El progreso se recalcula.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteWorkout(workout.id, user.id);
                await refresh();
              } catch (e) {
                Alert.alert('Error', (e as Error).message);
              }
            })();
          },
        },
      ],
    );
  };

  const onPick = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickWorkoutPhoto(source);
      if (uri) setPhotoUri(uri);
    } catch (e) {
      Alert.alert('Se necesita permiso', (e as Error).message);
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    if (!photoUri) {
      Alert.alert('Foto requerida', 'La evidencia fotográfica es obligatoria.');
      return;
    }
    const type =
      exerciseType === 'other' && customType.trim()
        ? customType.trim()
        : exerciseType;

    setLoading(true);
    try {
      await logWorkout({
        userId: user.id,
        groupId: profile?.group_id ?? null,
        exerciseType: type,
        workoutDate,
        localPhotoUri: photoUri,
        displayName: profile?.display_name ?? 'Atleta',
      });
      setPhotoUri(null);
      await refresh();
      const nextCount = dayCount + 1;
      const willBeDouble = nextCount >= 2;
      Alert.alert(
        '¡Registrado!',
        willBeDouble
          ? 'Día doble: este día cuenta como 2 puntos hacia la meta de 5 (máx. un doble por semana).'
          : 'Entrenamiento guardado.',
      );
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <KeyboardAvoid>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Title>REGISTRAR</Title>
        <View style={styles.status}>
          <WeightPlateStack
            progressPoints={weekPoints}
            maxDays={REQUIRED_WORKOUT_DAYS}
            favorDays={targetWeek?.creditEarned ?? 0}
          />
          <Muted>
            {sameWeekAsToday ? 'Esta semana' : `Semana del ${getWeekStart(workoutDate)}`}
            {' · '}
            {weekRemaining} restantes · en {workoutDate}: {dayCount}
            {dayCount >= 2 ? ' · DÍA DOBLE' : ''}
          </Muted>
        </View>

        <Text style={styles.label}>EJERCICIO</Text>
        <View style={styles.chips}>
          {EXERCISE_TYPES.map((t) => {
            const selected = exerciseType === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setExerciseType(t.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {exerciseType === 'other' ? (
          <Field
            label="Tipo personalizado"
            value={customType}
            onChangeText={setCustomType}
            placeholder="Otro…"
          />
        ) : null}

        <Text style={styles.label}>FECHA</Text>
        <Pressable
          style={styles.dateBtn}
          onPress={() => setShowCalendar((v) => !v)}
        >
          <Text style={styles.dateText}>{workoutDate}</Text>
        </Pressable>
        {showCalendar ? (
          <LogDateCalendar
            value={workoutDate}
            lookbackDays={LOG_LOOKBACK_DAYS}
            isAllowed={allowed.isAllowed}
            workoutCountsByDate={workoutCountsByDate}
            onChange={(d) => {
              setWorkoutDate(d);
              setShowCalendar(false);
            }}
          />
        ) : null}

        {workoutsThisDay.length > 0 ? (
          <View style={styles.existing}>
            <Text style={styles.label}>
              REGISTROS DE ESTE DÍA ({workoutsThisDay.length})
            </Text>
            <Muted>Si metiste uno de más, quítalo aquí.</Muted>
            {workoutsThisDay.map((w, i) => (
              <View key={w.id} style={styles.existingRow}>
                <Image source={{ uri: w.photo_url }} style={styles.existingThumb} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.existingType}>
                    {workoutsThisDay.length > 1 ? `#${i + 1} · ` : ''}
                    {exerciseTypeLabel(w.exercise_type)}
                  </Text>
                  <Muted>
                    {new Date(w.created_at).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Muted>
                </View>
                <Pressable
                  onPress={() => onDelete(w)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>QUITAR</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>EVIDENCIA</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Muted>Sin foto</Muted>
          </View>
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button
              label="CÁMARA"
              variant="secondary"
              onPress={() => void onPick('camera')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="GALERÍA"
              variant="secondary"
              onPress={() => void onPick('library')}
            />
          </View>
        </View>

        <Button
          label="GUARDAR ENTRENAMIENTO"
          onPress={() => void onSubmit()}
          loading={loading}
        />
      </ScrollView>
      </KeyboardAvoid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  status: {
    backgroundColor: colors.bgElevated,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  chipTextSelected: { color: colors.black },
  dateBtn: {
    backgroundColor: colors.bgElevated,
    borderWidth: borderWidth.thick,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dateText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 24,
    letterSpacing: 1,
  },
  preview: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    height: 120,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  existing: {
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    padding: spacing.md,
  },
  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingTop: spacing.sm,
  },
  existingThumb: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
  },
  existingType: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    borderWidth: borderWidth.thick,
    borderColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.danger,
    fontSize: 14,
    letterSpacing: 1,
  },
});
