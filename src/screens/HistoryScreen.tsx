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
import { colors, radii, spacing } from '../constants/theme';
import { useChallengeData } from '../hooks/useChallengeData';
import { formatWeekLabel } from '../lib/dates';
import type { WeeklySummary, Workout } from '../types';

function WeekRow({ week }: { week: WeeklySummary }) {
  return (
    <Card style={styles.weekCard}>
      <Text style={styles.weekTitle}>{formatWeekLabel(week.weekStart)}</Text>
      <Muted>
        Closes {week.weekCloseDate}
        {week.isClosed ? ' · locked' : ' · open'}
      </Muted>
      <View style={styles.grid}>
        <Stat label="Days" value={`${week.distinctWorkoutDays}/5`} />
        <Stat label="Missed" value={String(week.finalMissedDays)} />
        <Stat label="Owed" value={`$${week.moneyOwedMxn}`} accent={week.moneyOwedMxn > 0} />
        <Stat label="Bank" value={String(week.bankedCreditsAfterWeek)} />
      </View>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: colors.warning }]}>
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
            <Title>My history</Title>
            <Card style={styles.totals}>
              <Text style={styles.totalsTitle}>Year to date</Text>
              <View style={styles.grid}>
                <Stat
                  label="Missed"
                  value={String(myTotals?.totalMissedDays ?? 0)}
                />
                <Stat
                  label="Owed"
                  value={`$${myTotals?.totalMoneyOwedMxn ?? 0}`}
                  accent
                />
                <Stat
                  label="Banked"
                  value={String(myTotals?.bankedCredits ?? 0)}
                />
                <Stat label="Logs" value={String(myWorkouts.length)} />
              </View>
            </Card>

            <Text style={styles.section}>Weekly breakdown</Text>
            <View style={{ gap: spacing.sm }}>
              {weeksNewestFirst.map((week) => (
                <WeekRow key={week.weekStart} week={week} />
              ))}
            </View>
            <Text style={styles.section}>All workouts</Text>
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
              title="No workouts yet"
              body="Log a session — your evidence photo shows up here."
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
  totalsTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  statValue: { color: colors.accent, fontWeight: '800', fontSize: 18 },
  section: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginTop: spacing.sm,
  },
  weekCard: { gap: spacing.sm },
  weekTitle: { color: colors.text, fontWeight: '700' },
  workoutCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  workoutTitle: {
    color: colors.text,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
