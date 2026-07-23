import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Field, Muted, Screen, Title } from '../components/ui';
import { LOG_LOOKBACK_DAYS } from '../constants/challenge';
import { colors, radii, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import {
  formatDateOnly,
  getAllowedLogDates,
  parseDateOnly,
  todayDateOnly,
} from '../lib/dates';
import { logWorkout, pickWorkoutPhoto } from '../lib/workoutsApi';
import { EXERCISE_TYPES } from '../types';
import { REQUIRED_WORKOUT_DAYS } from '../constants/challenge';

export function LogWorkoutScreen() {
  const { user, profile } = useAuth();
  const { myWorkouts, myDaysDone, myDaysRemaining, refresh } =
    useChallengeData();

  const today = todayDateOnly();
  const allowed = useMemo(
    () => getAllowedLogDates(today, LOG_LOOKBACK_DAYS),
    [today],
  );

  const [exerciseType, setExerciseType] = useState('gym');
  const [customType, setCustomType] = useState('');
  const [workoutDate, setWorkoutDate] = useState(today);
  const [showPicker, setShowPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dayCount = useMemo(
    () => myWorkouts.filter((w) => w.workout_date === workoutDate).length,
    [myWorkouts, workoutDate],
  );

  const onPick = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickWorkoutPhoto(source);
      if (uri) setPhotoUri(uri);
    } catch (e) {
      Alert.alert('Permission needed', (e as Error).message);
    }
  };

  const onChangeDate = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selected) return;
    const next = formatDateOnly(selected);
    if (!allowed.isAllowed(next)) {
      Alert.alert(
        'Date not allowed',
        'Only today or up to 2 days back, and only weeks that are still open.',
      );
      return;
    }
    setWorkoutDate(next);
  };

  const onSubmit = async () => {
    if (!user) return;
    if (!photoUri) {
      Alert.alert('Photo required', 'Evidence photo is required.');
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
        displayName: profile?.display_name ?? 'Athlete',
      });
      setPhotoUri(null);
      await refresh();
      Alert.alert(
        'Logged!',
        dayCount + 1 >= 2
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
          Photo evidence is required and visible to the whole group. Video
          support is next (max ~30s / 25 MB).
        </Muted>

        <View style={styles.status}>
          <Text style={styles.statusTitle}>
            This week: {myDaysDone}/{REQUIRED_WORKOUT_DAYS} · {myDaysRemaining}{' '}
            remaining
          </Text>
          <Muted>
            Logs on {workoutDate}: {dayCount}
          </Muted>
        </View>

        <Text style={styles.label}>Exercise</Text>
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

        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>{workoutDate}</Text>
          <Muted>Today or up to 2 days back · open weeks only</Muted>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={parseDateOnly(workoutDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={parseDateOnly(allowed.minDate)}
            maximumDate={parseDateOnly(allowed.maxDate)}
            onChange={onChangeDate}
          />
        ) : null}
        {Platform.OS === 'ios' && showPicker ? (
          <Button
            label="Done"
            variant="secondary"
            onPress={() => setShowPicker(false)}
          />
        ) : null}

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
            <Button
              label="Camera"
              variant="secondary"
              onPress={() => void onPick('camera')}
            />
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
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  status: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  statusTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  chipTextSelected: { color: colors.white },
  dateBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  dateText: { color: colors.text, fontWeight: '700', fontSize: 16 },
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
  row: { flexDirection: 'row', gap: spacing.sm },
});
