import React, { useEffect, useMemo, useState } from 'react';
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
  Display,
  Field,
  Muted,
  Screen,
  Title,
} from '../components/ui';
import { CHALLENGE_START_DATE } from '../constants/challenge';
import { borderWidth, colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import type { CoachMessage } from '../lib/coach';
import { parseDateOnly, todayDateOnly } from '../lib/dates';
import { supabase } from '../lib/supabase';
import {
  coachRevisePlan,
  type WeeklyPlanContent,
} from '../lib/weeklyPlan';
import {
  fetchOrCreateWeeklyPlan,
  regenerateWeeklyPlan,
  saveWeeklyPlan,
} from '../lib/weeklyPlanApi';
import {
  FOOD_OPTIONS,
  GOAL_OPTIONS,
  type FoodPreference,
  type GoalType,
} from '../types';
import type { ProfileStackParamList } from '../navigation/RootNavigator';

function daysBetween(from: string, to: string): number {
  const a = parseDateOnly(from).getTime();
  const b = parseDateOnly(to).getTime();
  return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1);
}

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const { myTotals, myWorkouts } = useChallengeData();

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

  const [plan, setPlan] = useState<WeeklyPlanContent | null>(null);
  const [planWeek, setPlanWeek] = useState('');
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInput, setCoachInput] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachThread, setCoachThread] = useState<CoachMessage[]>([]);

  const challengeDays = useMemo(
    () => daysBetween(CHALLENGE_START_DATE, todayDateOnly()),
    [],
  );

  const totalWorkoutDays = useMemo(() => {
    const set = new Set(myWorkouts.map((w) => w.workout_date));
    return set.size;
  }, [myWorkouts]);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
    if (profile?.height_m != null) setHeight(String(profile.height_m));
    if (profile?.weight_kg != null) setWeight(String(profile.weight_kg));
    setGoalType(profile?.goal_type ?? null);
    setGoalExercise(profile?.goal_exercise ?? '');
    setFood(profile?.food_preference ?? null);
  }, [profile]);

  useEffect(() => {
    if (!user || !profile) return;
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

      if (profile.goal_type && profile.food_preference) {
        const p = await fetchOrCreateWeeklyPlan(profile);
        setPlan({ goalSection: p.goalSection, foodSection: p.foodSection });
        setPlanWeek(p.weekStart);
      }
    })();
  }, [user, profile]);

  const onSave = async () => {
    setSaving(true);
    const height_m = height.trim() ? Number(height) : null;
    const weight_kg = weight.trim() ? Number(weight) : null;
    if (height_m != null && (!Number.isFinite(height_m) || height_m <= 0)) {
      setSaving(false);
      Alert.alert('Altura inválida', 'Usa metros, ej. 1.75');
      return;
    }
    if (weight_kg != null && (!Number.isFinite(weight_kg) || weight_kg <= 0)) {
      setSaving(false);
      Alert.alert('Peso inválido', 'Usa kg, ej. 78.5');
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
      const today = todayDateOnly();
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

    if (!err && profile && goalType && food) {
      const updated = {
        ...profile,
        goal_type: goalType,
        goal_exercise:
          goalType === 'improve_exercise' ? goalExercise.trim() : null,
        food_preference: food,
      };
      const regenerated = await regenerateWeeklyPlan(updated);
      setPlan({
        goalSection: regenerated.goalSection,
        foodSection: regenerated.foodSection,
      });
      setPlanWeek(regenerated.weekStart);
    }

    setSaving(false);
    if (err) Alert.alert('Error', err);
    else {
      await refreshProfile();
      Alert.alert('Guardado', 'Perfil y plan semanal actualizados.');
    }
  };

  const onAskCoach = async () => {
    if (!profile || !user || !coachInput.trim() || !plan) return;
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

    const { reply, plan: nextPlan } = await coachRevisePlan(
      profile,
      plan,
      coachThread,
      message,
    );
    setPlan(nextPlan);
    if (planWeek) {
      await saveWeeklyPlan(user.id, planWeek, nextPlan);
    }
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
            <Title>PERFIL</Title>
            <Muted>{user?.email}</Muted>

            <Card style={styles.card}>
              <Text style={styles.heading}>RETO</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Display>{challengeDays}</Display>
                  <Muted>días del reto</Muted>
                </View>
                <View style={styles.statBox}>
                  <Display color={colors.accent}>{totalWorkoutDays}</Display>
                  <Muted>días con ejercicio</Muted>
                </View>
              </View>
              <View style={styles.rowBetween}>
                <Muted>Debes YTD</Muted>
                <Text style={styles.value}>
                  ${myTotals?.totalMoneyOwedMxn ?? 0} MXN
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Muted>Banked</Muted>
                <Text style={styles.valueOk}>
                  {myTotals?.bankedCredits ?? 0}
                </Text>
              </View>
            </Card>

            <Card style={styles.card}>
              <Field
                label="Nombre"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Field
                label="Altura (m)"
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="1.75"
              />
              <Field
                label="Peso (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="78.5"
              />
              <Button
                label="GUARDAR PERFIL"
                onPress={() => void onSave()}
                loading={saving}
              />
            </Card>

            {weightHistory.length ? (
              <Card style={styles.card}>
                <Text style={styles.heading}>HISTORIAL DE PESO</Text>
                {weightHistory.map((w) => (
                  <View key={w.id} style={styles.rowBetween}>
                    <Muted>{w.recorded_on}</Muted>
                    <Text style={styles.value}>{w.weight_kg} kg</Text>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card style={styles.card}>
              <Text style={styles.heading}>METAS</Text>
              <View style={styles.chips}>
                {GOAL_OPTIONS.map((g) => {
                  const selected = goalType === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      onPress={() => setGoalType(g.value)}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text
                        style={[styles.chipText, selected && styles.chipTextOn]}
                      >
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {goalType === 'improve_exercise' ? (
                <Field
                  label="¿Qué ejercicio?"
                  value={goalExercise}
                  onChangeText={setGoalExercise}
                  placeholder="Climbing, padel…"
                />
              ) : null}

              <Text style={styles.subheading}>PREFERENCIA DE COMIDA</Text>
              <View style={styles.chips}>
                {FOOD_OPTIONS.map((f) => {
                  const selected = food === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      onPress={() => setFood(f.value)}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text
                        style={[styles.chipText, selected && styles.chipTextOn]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Muted>
                Al guardar meta + comida se genera el weekly plan automáticamente.
              </Muted>
            </Card>

            {plan ? (
              <Card style={styles.card}>
                <Text style={styles.heading}>WEEKLY PLAN</Text>
                <Muted>Semana {planWeek}</Muted>
                <Text style={styles.planTitle}>META</Text>
                <Text style={styles.planBody}>{plan.goalSection}</Text>
                <Text style={styles.planTitle}>COMIDA</Text>
                <Text style={styles.planBody}>{plan.foodSection}</Text>
              </Card>
            ) : null}

            <Card style={styles.card}>
              <Text style={styles.heading}>COACH</Text>
              <Muted>
                Habla con el coach para cambiar el weekly plan (“no me gusta
                esto”, “tengo estos ingredientes…”).
              </Muted>
              <Button
                label={coachOpen ? 'CERRAR COACH' : 'ABRIR COACH'}
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
                    placeholder="Ej. cámbame la cena del martes…"
                    placeholderTextColor={colors.textDim}
                    value={coachInput}
                    onChangeText={setCoachInput}
                    multiline
                  />
                  <Button
                    label="ENVIAR AL COACH"
                    onPress={() => void onAskCoach()}
                    loading={coachBusy}
                    disabled={!plan}
                  />
                </View>
              ) : null}
            </Card>

            <Button
              label="HISTORIAL COMPLETO"
              variant="secondary"
              onPress={() => navigation.navigate('History')}
            />
            <Button label="CERRAR SESIÓN" variant="danger" onPress={() => void signOut()} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  heading: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 22,
    letterSpacing: 1,
  },
  subheading: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 16,
    letterSpacing: 1,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: { flex: 1, gap: 4 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.danger,
    fontSize: 20,
  },
  valueOk: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bg,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: 'Inter_600SemiBold' },
  chipTextOn: { color: colors.black },
  planTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 18,
    letterSpacing: 1,
  },
  planBody: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  coachBox: { gap: spacing.sm },
  coachBubble: {
    padding: spacing.sm,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
  },
  coachUser: { backgroundColor: colors.accentSoft, alignSelf: 'flex-end' },
  coachAi: { backgroundColor: colors.bg, alignSelf: 'flex-start' },
  coachText: { ...typography.body, color: colors.text, lineHeight: 20 },
  coachInput: {
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    padding: spacing.sm,
    minHeight: 64,
    color: colors.text,
    backgroundColor: colors.bg,
    fontFamily: 'Inter_400Regular',
  },
});
