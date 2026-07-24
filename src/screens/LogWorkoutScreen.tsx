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
import { Button, Field, Muted, Screen, Title } from '../components/ui';
import { LogDateCalendar } from '../components/LogDateCalendar';
import { WeightPlateStack } from '../components/WeightPlateStack';
import { LOG_LOOKBACK_DAYS, REQUIRED_WORKOUT_DAYS } from '../constants/challenge';
import { borderWidth, colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import { getAllowedLogDates, todayDateOnly } from '../lib/dates';
import { logWorkout, pickWorkoutPhoto } from '../lib/workoutsApi';
import { EXERCISE_TYPES } from '../types';

export function LogWorkoutScreen() {
  const { user, profile } = useAuth();
  const { myWorkouts, myDaysDone, myDaysRemaining, myWeek, refresh } =
    useChallengeData();

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
      const weekWillHaveDouble = willBeDouble || Boolean(myWeek?.hasDoubleDay);
      const projectedDays = new Set([
        ...Object.keys(workoutCountsByDate).filter(
          (d) => (workoutCountsByDate[d] ?? 0) > 0,
        ),
        workoutDate,
      ]).size;
      // Approximate distinct days already counted this week via myWeek + this log
      const distinctAfter = Math.max(
        myWeek?.distinctWorkoutDays ?? 0,
        projectedDays,
      );
      const totalAfter = (myWeek?.totalWorkouts ?? 0) + 1;
      const creditReady =
        weekWillHaveDouble &&
        distinctAfter >= REQUIRED_WORKOUT_DAYS &&
        totalAfter >= REQUIRED_WORKOUT_DAYS + 1;

      Alert.alert(
        '¡Registrado!',
        willBeDouble
          ? creditReady
            ? 'Día doble marcado. Cumples la meta semanal — crédito bancado listo (máx. 1/semana).'
            : 'Día doble marcado. El crédito se banca al completar ≥5 días y ≥6 entrenamientos esta semana (máx. 1 crédito).'
          : 'Entrenamiento guardado.',
      );
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Title>REGISTRAR</Title>
        <View style={styles.status}>
          <WeightPlateStack
            daysDone={myDaysDone}
            maxDays={REQUIRED_WORKOUT_DAYS}
          />
          <Muted>
            {myDaysRemaining} restantes · registros en {workoutDate}: {dayCount}
            {dayCount >= 2 ? ' · DÍA DOBLE' : ''}
          </Muted>
          {myWeek?.hasDoubleDay ? (
            <Text style={styles.doubleBanner}>
              SEMANA CON DÍA DOBLE
              {myWeek.creditEarned > 0
                ? ` · +${myWeek.creditEarned} crédito`
                : ' · falta completar 5 días / 6 entrenos para el crédito'}
            </Text>
          ) : null}
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
  doubleBanner: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.dayDoubleBorder,
    fontSize: 14,
    letterSpacing: 0.5,
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
});
