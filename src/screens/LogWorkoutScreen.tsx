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
import { colors, radii, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { todayDateOnly } from '../lib/dates';
import { logWorkout, pickWorkoutPhoto } from '../lib/workoutsApi';
import { EXERCISE_TYPES, REQUIRED_WORKOUT_DAYS } from '../types';
import { useChallengeData } from '../hooks/useChallengeData';

export function LogWorkoutScreen() {
  const { user } = useAuth();
  const { myWorkouts, myTotals, refresh } = useChallengeData();
  const [exerciseType, setExerciseType] = useState('gym');
  const [customType, setCustomType] = useState('');
  const [duration, setDuration] = useState('45');
  const [workoutDate, setWorkoutDate] = useState(todayDateOnly());
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const todayCount = useMemo(
    () => myWorkouts.filter((w) => w.workout_date === workoutDate).length,
    [myWorkouts, workoutDate],
  );

  const currentWeek = myTotals?.weeks[myTotals.weeks.length - 1];

  const onPick = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickWorkoutPhoto(source);
      if (uri) setPhotoUri(uri);
    } catch (e) {
      Alert.alert('Permission needed', (e as Error).message);
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Invalid duration', 'Enter duration in minutes.');
      return;
    }
    if (!photoUri) {
      Alert.alert(
        'Photo required',
        'A photo is required for a workout to count.',
      );
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workoutDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
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
        exerciseType: type,
        durationMinutes: minutes,
        workoutDate,
        localPhotoUri: photoUri,
      });
      setPhotoUri(null);
      setDuration('45');
      await refresh();
      Alert.alert(
        'Logged!',
        todayCount + 1 >= 2
          ? 'Second workout today — double-day progress saved.'
          : 'Workout saved with photo evidence.',
      );
    } catch (e) {
      Alert.alert('Could not log workout', (e as Error).message);
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
        <Title>Log workout</Title>
        <Muted>
          Photo evidence is required. You can log a second workout on the same
          day for the double-day credit (max useful once per week).
        </Muted>

        {currentWeek ? (
          <View style={styles.status}>
            <Text style={styles.statusTitle}>
              This week: {currentWeek.distinctWorkoutDays}/
              {REQUIRED_WORKOUT_DAYS} days
            </Text>
            <Muted>
              Workouts logged today ({workoutDate}): {todayCount}
              {currentWeek.hasDoubleDay ? ' · double day used' : ''}
              {myTotals ? ` · banked credits: ${myTotals.bankedCredits}` : ''}
            </Muted>
          </View>
        ) : null}

        <Text style={styles.label}>Exercise type</Text>
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
            label="Custom type"
            value={customType}
            onChangeText={setCustomType}
            placeholder="CrossFit, hiking…"
          />
        ) : null}

        <Field
          label="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />

        <Field
          label="Date (YYYY-MM-DD)"
          value={workoutDate}
          onChangeText={setWorkoutDate}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Evidence photo</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Muted>No photo selected</Muted>
          </View>
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button label="Camera" variant="secondary" onPress={() => void onPick('camera')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Library"
              variant="secondary"
              onPress={() => void onPick('library')}
            />
          </View>
        </View>

        <Button
          label="Save workout"
          onPress={() => void onSubmit()}
          loading={loading}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  status: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  statusTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.bg },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    height: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
