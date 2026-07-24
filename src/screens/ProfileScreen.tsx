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
import { WeeklyPlanCalendar } from '../components/WeeklyPlanCalendar';
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

function hasPersonalBasics(p: {
  height_m: number | null;
  weight_kg: number | null;
  age_years: number | null;
  goal_type: GoalType | null;
  food_preference: FoodPreference | null;
}): boolean {
  return Boolean(
    p.height_m &&
      p.weight_kg &&
      p.age_years &&
      p.goal_type &&
      p.food_preference,
  );
}

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const { myTotals, myWorkouts, challengeStartedOn } = useChallengeData();

  const [editingPersonal, setEditingPersonal] = useState(
    !profile || !hasPersonalBasics(profile),
  );
  const [name, setName] = useState(profile?.display_name ?? '');
  const [height, setHeight] = useState(
    profile?.height_m != null ? String(profile.height_m) : '',
  );
  const [weight, setWeight] = useState(
    profile?.weight_kg != null ? String(profile.weight_kg) : '',
  );
  const [age, setAge] = useState(
    profile?.age_years != null ? String(profile.age_years) : '',
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

  const [plan, setPlan] = useState<WeeklyPlanContent | null>(null);
  const [planWeek, setPlanWeek] = useState('');
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [coachInput, setCoachInput] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachThread, setCoachThread] = useState<CoachMessage[]>([]);

  const challengeDays = useMemo(() => {
    if (!challengeStartedOn) return 0;
    return daysBetween(challengeStartedOn, todayDateOnly());
  }, [challengeStartedOn]);
  const totalWorkoutDays = useMemo(() => {
    const set = new Set(myWorkouts.map((w) => w.workout_date));
    return set.size;
  }, [myWorkouts]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    if (profile.height_m != null) setHeight(String(profile.height_m));
    if (profile.weight_kg != null) setWeight(String(profile.weight_kg));
    if (profile.age_years != null) setAge(String(profile.age_years));
    setGoalType(profile.goal_type ?? null);
    setGoalExercise(profile.goal_exercise ?? '');
    setFood(profile.food_preference ?? null);
    setEditingPersonal(!hasPersonalBasics(profile));
  }, [profile]);

  useEffect(() => {
    if (!user || !profile) return;
    void (async () => {
      const { data: msgs } = await supabase
        .from('coach_messages')
        .select('role, body')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(40);
      setCoachThread((msgs as CoachMessage[]) ?? []);

      if (profile.goal_type && profile.food_preference) {
        const p = await fetchOrCreateWeeklyPlan(profile);
        setPlan({
          days: p.days,
          goalSection: p.goalSection,
          foodSection: p.foodSection,
        });
        setPlanWeek(p.weekStart);
      }
    })();
  }, [user, profile]);

  const onSavePersonal = async () => {
    setSaving(true);
    const height_m = height.trim() ? Number(height) : null;
    const weight_kg = weight.trim() ? Number(weight) : null;
    const age_years = age.trim() ? Number(age) : null;

    if (!height_m || height_m <= 0) {
      setSaving(false);
      Alert.alert('Altura', 'Usa metros, ej. 1.75');
      return;
    }
    if (!weight_kg || weight_kg <= 0) {
      setSaving(false);
      Alert.alert('Peso', 'Usa kg, ej. 78.5');
      return;
    }
    if (!age_years || age_years < 10 || age_years > 100) {
      setSaving(false);
      Alert.alert('Edad', 'Ingresa una edad válida');
      return;
    }
    if (!goalType || !food) {
      setSaving(false);
      Alert.alert('Meta y dieta', 'Elige meta y preferencia de comida');
      return;
    }
    if (goalType === 'improve_exercise' && !goalExercise.trim()) {
      setSaving(false);
      Alert.alert('Ejercicio', 'Especifica el ejercicio a mejorar');
      return;
    }

    const err = await updateProfile({
      display_name: name.trim() || 'Atleta',
      height_m,
      weight_kg,
      age_years,
      goal_type: goalType,
      goal_exercise:
        goalType === 'improve_exercise' ? goalExercise.trim() : null,
      food_preference: food,
    });

    if (!err && user) {
      const today = todayDateOnly();
      await supabase.from('weight_entries').insert({
        user_id: user.id,
        weight_kg,
        recorded_on: today,
      });

      const updated = {
        ...profile!,
        height_m,
        weight_kg,
        age_years,
        goal_type: goalType,
        goal_exercise:
          goalType === 'improve_exercise' ? goalExercise.trim() : null,
        food_preference: food,
      };
      const regenerated = await regenerateWeeklyPlan(updated);
      setPlan({
        days: regenerated.days,
        goalSection: regenerated.goalSection,
        foodSection: regenerated.foodSection,
      });
      setPlanWeek(regenerated.weekStart);
    }

    setSaving(false);
    if (err) Alert.alert('Error', err);
    else {
      await refreshProfile();
      setEditingPersonal(false);
      Alert.alert('Guardado', 'Datos y plan semanal listos.');
    }
  };

  const onAskCoach = async () => {
    if (!profile || !user || !coachInput.trim() || !plan) return;
    const message = coachInput.trim();
    setCoachInput('');
    setCoachBusy(true);
    const nextHistory = [
      ...coachThread,
      { role: 'user' as const, body: message },
    ];
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
    setPlan({
      days: nextPlan.days,
      goalSection: nextPlan.goalSection,
      foodSection: nextPlan.foodSection,
    });
    if (planWeek) await saveWeeklyPlan(user.id, planWeek, nextPlan);

    setCoachThread([...nextHistory, { role: 'assistant', body: reply }]);
    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'assistant',
      body: reply,
    });
    setCoachBusy(false);
  };

  const foodLabel =
    FOOD_OPTIONS.find((f) => f.value === profile?.food_preference)?.label ??
    '—';
  const goalLabel =
    GOAL_OPTIONS.find((g) => g.value === profile?.goal_type)?.label ?? '—';

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
                  <Muted>días ejercicio</Muted>
                </View>
              </View>
              <View style={styles.rowBetween}>
                <Muted>Fallados (año)</Muted>
                <Text style={styles.valueBad}>
                  {myTotals?.totalMissedDays ?? 0}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Muted>Acumulados</Muted>
                <Text style={styles.valueOk}>
                  {myTotals?.bankedCredits ?? 0}
                </Text>
              </View>
            </Card>

            {editingPersonal ? (
              <Card style={styles.card}>
                <Text style={styles.heading}>DATOS PERSONALES</Text>
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
                <Field
                  label="Edad"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="28"
                />

                <Text style={styles.subheading}>META</Text>
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
                          style={[
                            styles.chipText,
                            selected && styles.chipTextOn,
                          ]}
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
                    placeholder="Escalar, pádel…"
                  />
                ) : null}

                <Text style={styles.subheading}>DIETA</Text>
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
                          style={[
                            styles.chipText,
                            selected && styles.chipTextOn,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Button
                  label="GUARDAR"
                  onPress={() => void onSavePersonal()}
                  loading={saving}
                />
              </Card>
            ) : (
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.heading}>RESUMEN</Text>
                  <Pressable onPress={() => setEditingPersonal(true)}>
                    <Text style={styles.editLink}>EDITAR</Text>
                  </Pressable>
                </View>
                <Text style={styles.summaryLine}>
                  {profile?.display_name} · {profile?.age_years} años
                </Text>
                <Text style={styles.summaryLine}>
                  {profile?.height_m} m · {profile?.weight_kg} kg
                </Text>
                <Text style={styles.summaryLine}>
                  Meta: {goalLabel}
                  {profile?.goal_exercise ? ` (${profile.goal_exercise})` : ''}
                </Text>
                <Text style={styles.summaryLine}>Dieta: {foodLabel}</Text>
              </Card>
            )}

            {plan ? (
              <Card style={styles.card}>
                <Text style={styles.heading}>PLAN SEMANAL</Text>
                <Muted>Semana {planWeek} · se renueva cada lunes</Muted>
                <WeeklyPlanCalendar
                  key={`${planWeek}-${plan.goalSection.length}-${plan.foodSection.length}-${plan.days.map((d) => d.workout.title).join('|')}`}
                  plan={plan}
                />
              </Card>
            ) : null}

            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.heading}>DON FORTACHÓN</Text>
                <Pressable onPress={() => setCoachExpanded((e) => !e)}>
                  <Text style={styles.editLink}>
                    {coachExpanded ? 'MINIMIZAR' : 'EXPANDIR'}
                  </Text>
                </Pressable>
              </View>
              <Muted>
                Pídele a Don Fortachón cambios al plan: “cambia la cena del
                martes” o “tengo pollo y arroz, ¿qué preparo?”
              </Muted>

              {!coachExpanded ? (
                <View style={styles.coachMini}>
                  <Text style={styles.collapsedHint}>
                    {coachThread.length
                      ? `${coachThread.length} mensajes · expandir para ver historial`
                      : 'Chat minimizado — escríbele a Don Fortachón abajo'}
                  </Text>
                  <TextInput
                    style={styles.coachInput}
                    placeholder="Mensaje rápido a Don Fortachón…"
                    placeholderTextColor={colors.textDim}
                    value={coachInput}
                    onChangeText={setCoachInput}
                    multiline
                  />
                  <Button
                    label="ENVIAR"
                    onPress={() => void onAskCoach()}
                    loading={coachBusy}
                    disabled={!plan}
                  />
                </View>
              ) : (
                <View style={styles.coachBox}>
                  {coachThread.slice(-10).map((m, i) => (
                    <View
                      key={`${m.role}-${i}`}
                      style={[
                        styles.coachBubble,
                        m.role === 'user' ? styles.coachUser : styles.coachAi,
                      ]}
                    >
                      {m.role === 'assistant' ? (
                        <Text style={styles.coachName}>DON FORTACHÓN</Text>
                      ) : null}
                      <Text style={styles.coachText}>{m.body}</Text>
                    </View>
                  ))}
                  <TextInput
                    style={styles.coachInput}
                    placeholder="Modifica comida o rutina de esta semana…"
                    placeholderTextColor={colors.textDim}
                    value={coachInput}
                    onChangeText={setCoachInput}
                    multiline
                  />
                  <Button
                    label="ENVIAR A DON FORTACHÓN"
                    onPress={() => void onAskCoach()}
                    loading={coachBusy}
                    disabled={!plan}
                  />
                </View>
              )}
            </Card>

            <Button
              label="HISTORIAL COMPLETO"
              variant="secondary"
              onPress={() => navigation.navigate('History')}
            />
            <Button
              label="CERRAR SESIÓN"
              variant="danger"
              onPress={() => void signOut()}
            />
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
  valueBad: {
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
  editLink: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 16,
    letterSpacing: 1,
  },
  summaryLine: {
    ...typography.body,
    color: colors.text,
  },
  collapsedHint: {
    ...typography.caption,
    color: colors.textDim,
  },
  coachMini: { gap: spacing.sm },
  coachBox: { gap: spacing.sm },
  coachBubble: {
    padding: spacing.sm,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
  },
  coachUser: { backgroundColor: colors.accentSoft, alignSelf: 'flex-end' },
  coachAi: { backgroundColor: colors.bg, alignSelf: 'flex-start' },
  coachName: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1,
  },
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
