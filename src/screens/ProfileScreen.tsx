import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Field,
  Muted,
  Screen,
  Title,
} from '../components/ui';
import { colors, radii, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import { askCoach, type CoachMessage } from '../lib/coach';
import { supabase } from '../lib/supabase';
import {
  FOOD_OPTIONS,
  GOAL_OPTIONS,
  type FoodPreference,
  type GoalType,
} from '../types';
import type { ProfileStackParamList } from '../navigation/RootNavigator';

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const { myTotals } = useChallengeData();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [height, setHeight] = useState(
    profile?.height_m != null ? String(profile.height_m) : '',
  );
  const [weight, setWeight] = useState(
    profile?.weight_kg != null ? String(profile.weight_kg) : '',
  );
  const [goalType, setGoalType] = useState<GoalType | null>(
    profile?.goal_type ?? null,
  );
  const [goalExercise, setGoalExercise] = useState(
    profile?.goal_exercise ?? '',
  );
  const [food, setFood] = useState<FoodPreference | null>(
    profile?.food_preference ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [weightHistory, setWeightHistory] = useState<
    { id: string; weight_kg: number; recorded_on: string }[]
  >([]);

  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInput, setCoachInput] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachThread, setCoachThread] = useState<CoachMessage[]>([]);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
    if (profile?.height_m != null) setHeight(String(profile.height_m));
    if (profile?.weight_kg != null) setWeight(String(profile.weight_kg));
    setGoalType(profile?.goal_type ?? null);
    setGoalExercise(profile?.goal_exercise ?? '');
    setFood(profile?.food_preference ?? null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from('weight_entries')
        .select('id, weight_kg, recorded_on')
        .eq('user_id', user.id)
        .order('recorded_on', { ascending: false })
        .limit(12);
      setWeightHistory((data as typeof weightHistory) ?? []);

      const { data: msgs } = await supabase
        .from('coach_messages')
        .select('role, body')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(40);
      setCoachThread((msgs as CoachMessage[]) ?? []);
    })();
  }, [user]);

  const onSave = async () => {
    setSaving(true);
    const height_m = height.trim() ? Number(height) : null;
    const weight_kg = weight.trim() ? Number(weight) : null;
    if (height_m != null && (!Number.isFinite(height_m) || height_m <= 0)) {
      setSaving(false);
      Alert.alert('Invalid height', 'Use meters, e.g. 1.75');
      return;
    }
    if (weight_kg != null && (!Number.isFinite(weight_kg) || weight_kg <= 0)) {
      setSaving(false);
      Alert.alert('Invalid weight', 'Use kg, e.g. 78.5');
      return;
    }

    const err = await updateProfile({
      display_name: name.trim() || 'Athlete',
      height_m,
      weight_kg,
      goal_type: goalType,
      goal_exercise: goalType === 'improve_exercise' ? goalExercise.trim() : null,
      food_preference: food,
    });

    if (!err && user && weight_kg != null) {
      const last = weightHistory[0];
      const today = new Date().toISOString().slice(0, 10);
      const shouldLog =
        !last ||
        last.recorded_on.slice(0, 7) !== today.slice(0, 7) ||
        Number(last.weight_kg) !== weight_kg;
      if (shouldLog) {
        await supabase.from('weight_entries').insert({
          user_id: user.id,
          weight_kg,
          recorded_on: today,
        });
      }
    }

    setSaving(false);
    if (err) Alert.alert('Update failed', err);
    else {
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated.');
    }
  };

  const onAskCoach = async () => {
    if (!profile || !user || !coachInput.trim()) return;
    const message = coachInput.trim();
    setCoachInput('');
    setCoachBusy(true);
    const nextHistory = [...coachThread, { role: 'user' as const, body: message }];
    setCoachThread(nextHistory);
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'user',
      body: message,
    });

    const reply = await askCoach(profile, coachThread, message);
    setCoachThread([...nextHistory, { role: 'assistant', body: reply }]);
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'assistant',
      body: reply,
    });
    setCoachBusy(false);
  };

  return (
    <Screen>
      <FlatList
        data={[]}
        keyExtractor={() => 'x'}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            <Title>Profile</Title>
            <Muted>{user?.email}</Muted>

            <Card style={styles.card}>
              <Field
                label="Display name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Field
                label="Height (meters)"
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="1.75"
              />
              <Field
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="78.5"
              />
              <Muted>
                Weight history logs about monthly when you save a new value.
              </Muted>
              <Button label="Save profile" onPress={() => void onSave()} loading={saving} />
            </Card>

            {weightHistory.length ? (
              <Card style={styles.card}>
                <Text style={styles.heading}>Weight history</Text>
                {weightHistory.map((w) => (
                  <View key={w.id} style={styles.rowBetween}>
                    <Muted>{w.recorded_on}</Muted>
                    <Text style={styles.value}>{w.weight_kg} kg</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card style={styles.card}>
              <Text style={styles.heading}>Goal</Text>
              <View style={styles.chips}>
                {GOAL_OPTIONS.map((g) => {
                  const selected = goalType === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      onPress={() => setGoalType(g.value)}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {goalType === 'improve_exercise' ? (
                <Field
                  label="Which exercise?"
                  value={goalExercise}
                  onChangeText={setGoalExercise}
                  placeholder="Climbing, padel…"
                />
              ) : null}
              <Text style={styles.subheading}>Food preference</Text>
              <View style={styles.chips}>
                {FOOD_OPTIONS.map((f) => {
                  const selected = food === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      onPress={() => setFood(f.value)}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.heading}>Fortachones Coach</Text>
              <Muted>
                Personal sports & nutrition agent — weekly workouts, long-term
                plans, and diets tailored to your goal.
              </Muted>
              <Button
                label={coachOpen ? 'Hide coach' : 'Open coach chat'}
                variant="secondary"
                onPress={() => setCoachOpen((o) => !o)}
              />
              {coachOpen ? (
                <View style={styles.coachBox}>
                  {coachThread.slice(-8).map((m, i) => (
                    <View
                      key={`${m.role}-${i}`}
                      style={[
                        styles.coachBubble,
                        m.role === 'user' ? styles.coachUser : styles.coachAi,
                      ]}
                    >
                      <Text style={styles.coachText}>{m.body}</Text>
                    </View>
                  ))}
                  <TextInput
                    style={styles.coachInput}
                    placeholder="Ask for this week’s plan…"
                    placeholderTextColor={colors.textDim}
                    value={coachInput}
                    onChangeText={setCoachInput}
                    multiline
                  />
                  <Button
                    label="Send to coach"
                    onPress={() => void onAskCoach()}
                    loading={coachBusy}
                  />
                </View>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.heading}>Challenge snapshot</Text>
              <Row
                label="Banked credits"
                value={String(myTotals?.bankedCredits ?? 0)}
              />
              <Row
                label="Missed days (YTD)"
                value={String(myTotals?.totalMissedDays ?? 0)}
              />
              <Row
                label="Money owed (YTD)"
                value={`$${myTotals?.totalMoneyOwedMxn ?? 0} MXN`}
              />
              <Button
                label="Open full history"
                variant="secondary"
                onPress={() => navigation.navigate('History')}
              />
            </Card>

            <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
          </View>
        }
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Muted>{label}</Muted>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  heading: { color: colors.text, fontWeight: '700', fontSize: 16 },
  subheading: { color: colors.textMuted, fontWeight: '600' },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextOn: { color: colors.white },
  coachBox: { gap: spacing.sm },
  coachBubble: {
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coachUser: { backgroundColor: colors.accentSoft, alignSelf: 'flex-end' },
  coachAi: { backgroundColor: colors.bgElevated, alignSelf: 'flex-start' },
  coachText: { color: colors.text, lineHeight: 20 },
  coachInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: 64,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
