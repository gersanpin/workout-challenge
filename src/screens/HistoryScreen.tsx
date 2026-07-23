import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, EmptyState, Muted, Screen, Title } from '../components/ui';
import { borderWidth, colors, spacing, typography } from '../constants/theme';
import { useChallengeData } from '../hooks/useChallengeData';
import { formatWeekLabel } from '../lib/dates';
import type { WeeklySummary, Workout } from '../types';

function WeekRow({ week }: { week: WeeklySummary }) {
  return (
    <Card style={styles.weekCard}>
      <Text style={styles.weekTitle}>{formatWeekLabel(week.weekStart)}</Text>
      <Muted>
        Cierra {week.weekCloseDate}
        {week.isClosed ? ' · LOCKED' : ' · OPEN'}
      </Muted>
      <View style={styles.grid}>
        <Stat label="Días" value={`${week.distinctWorkoutDays}/5`} />
        <Stat label="Miss" value={String(week.finalMissedDays)} />
        <Stat
          label="Debes"
          value={`$${week.moneyOwedMxn}`}
          danger={week.moneyOwedMxn > 0}
        />
        <Stat label="Bank" value={String(week.bankedCreditsAfterWeek)} ok />
      </View>
    </Card>
  );
}

function Stat({
  label,
  value,
  danger,
  ok,
}: {
  label: string;
  value: string;
  danger?: boolean;
  ok?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          danger && { color: colors.danger },
          ok && { color: colors.accent },
        ]}
      >
        {value}
      </Text>
      <Muted>{label}</Muted>
    </View>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  return (
    <Card style={styles.workoutCard}>
      <Image source={{ uri: workout.photo_url }} style={styles.thumb} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.workoutTitle}>{workout.exercise_type}</Text>
        <Muted>{workout.workout_date}</Muted>
      </View>
    </Card>
  );
}

export function HistoryScreen() {
  const { myWorkouts, myTotals, loading, refresh } = useChallengeData();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const weeksNewestFirst = useMemo(
    () => [...(myTotals?.weeks ?? [])].reverse(),
    [myTotals?.weeks],
  );

  const workoutsNewestFirst = useMemo(
    () => [...myWorkouts].reverse(),
    [myWorkouts],
  );

  if (loading && !myTotals) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <FlatList
        data={workoutsNewestFirst}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>HISTORIAL</Title>
            <Card style={styles.totals}>
              <Text style={styles.totalsTitle}>YEAR TO DATE</Text>
              <View style={styles.grid}>
                <Stat
                  label="Missed"
                  value={String(myTotals?.totalMissedDays ?? 0)}
                />
                <Stat
                  label="Debes"
                  value={`$${myTotals?.totalMoneyOwedMxn ?? 0}`}
                  danger
                />
                <Stat
                  label="Banked"
                  value={String(myTotals?.bankedCredits ?? 0)}
                  ok
                />
                <Stat label="Logs" value={String(myWorkouts.length)} />
              </View>
            </Card>

            <Text style={styles.section}>SEMANAS</Text>
            <View style={{ gap: spacing.sm }}>
              {weeksNewestFirst.map((week) => (
                <WeekRow key={week.weekStart} week={week} />
              ))}
            </View>
            <Text style={styles.section}>TODOS LOS WORKOUTS</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <WorkoutRow workout={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.md }}>
            <EmptyState
              title="Sin workouts"
              body="Loguea una sesión — la foto de evidencia aparece aquí."
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  totals: { gap: spacing.sm },
  totalsTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 20,
    letterSpacing: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    width: '47%',
    backgroundColor: colors.bg,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
    padding: spacing.sm,
    gap: 2,
  },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 22,
  },
  section: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.textMuted,
    fontSize: 18,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  weekCard: { gap: spacing.sm },
  weekTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 18,
  },
  workoutCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  thumb: {
    width: 72,
    height: 72,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.thick,
    borderColor: colors.borderMuted,
  },
  workoutTitle: {
    ...typography.subtitle,
    color: colors.text,
    textTransform: 'capitalize',
  },
});
