import React, { useCallback } from 'react';
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
import { Card, EmptyState, Muted, ProgressBar, Screen, Title } from '../components/ui';
import { colors, radii, spacing, typography } from '../constants/theme';
import { useChallengeData } from '../hooks/useChallengeData';
import { formatWeekLabel } from '../lib/dates';
import { REQUIRED_WORKOUT_DAYS } from '../types';
import type { LeaderboardEntry, WorkoutWithProfile } from '../types';

function LeaderRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const days = entry.currentWeek?.distinctWorkoutDays ?? 0;
  const owed = entry.totalMoneyOwedMxn;
  return (
    <Card style={styles.leaderCard}>
      <View style={styles.leaderTop}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{entry.profile.display_name}</Text>
          <Text style={styles.weekProgress}>
            {days}/{REQUIRED_WORKOUT_DAYS} days this week
            {entry.currentWeek?.hasDoubleDay ? ' · double day' : ''}
          </Text>
        </View>
        <View style={styles.owedBlock}>
          <Text style={styles.owedValue}>${owed}</Text>
          <Muted>MXN owed</Muted>
        </View>
      </View>
      <ProgressBar value={days} max={REQUIRED_WORKOUT_DAYS} />
      <View style={styles.metaRow}>
        <Muted>Missed: {entry.totalMissedDays}</Muted>
        <Muted>Banked: {entry.bankedCredits}</Muted>
      </View>
    </Card>
  );
}

function FeedItem({ item }: { item: WorkoutWithProfile }) {
  return (
    <Card style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <Text style={styles.name}>
          {item.profiles?.display_name ?? 'Athlete'}
        </Text>
        <Muted>
          {item.workout_date} · {item.exercise_type} · {item.duration_minutes}m
        </Muted>
      </View>
      <Image source={{ uri: item.photo_url }} style={styles.feedImage} />
    </Card>
  );
}

export function HomeScreen() {
  const { leaderboard, feed, loading, error, refresh, myTotals } =
    useChallengeData();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const currentWeekLabel = myTotals?.weeks.length
    ? formatWeekLabel(myTotals.weeks[myTotals.weeks.length - 1].weekStart)
    : 'This week';

  if (loading && leaderboard.length === 0) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <FlatList
        data={feed}
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
            <Text style={styles.brand}>Squad Sweat</Text>
            <Title>Group board</Title>
            <Muted>{currentWeekLabel} · 5 days min · $100 MXN / miss</Muted>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.sectionLabel}>Leaderboard</Text>
            <View style={styles.leaderList}>
              {leaderboard.length === 0 ? (
                <EmptyState
                  title="No athletes yet"
                  body="Invite your friends to sign up, then start logging workouts."
                />
              ) : (
                leaderboard.map((entry, i) => (
                  <LeaderRow
                    key={entry.profile.id}
                    entry={entry}
                    rank={i + 1}
                  />
                ))
              )}
            </View>

            <View style={styles.prizeBanner}>
              <Text style={styles.prizeTitle}>Year-end group prize</Text>
              <Text style={styles.prizeBody}>
                Total pool:{' '}
                <Text style={styles.prizeAmount}>
                  $
                  {leaderboard.reduce((s, e) => s + e.totalMoneyOwedMxn, 0)} MXN
                </Text>{' '}
                (informational only — no in-app payments)
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Recent workouts</Text>
          </View>
        }
        renderItem={({ item }) => <FeedItem item={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.md }}>
            <EmptyState
              title="No workouts yet"
              body="Be the first to log a session with photo evidence."
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  brand: {
    ...typography.brand,
    color: colors.accent,
    fontSize: 22,
  },
  sectionLabel: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.md,
  },
  leaderList: { gap: spacing.sm },
  leaderCard: { gap: spacing.sm },
  leaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.accent, fontWeight: '800' },
  name: { ...typography.subtitle, color: colors.text },
  weekProgress: { color: colors.textMuted, fontSize: 13 },
  owedBlock: { alignItems: 'flex-end' },
  owedValue: {
    color: colors.warning,
    fontWeight: '800',
    fontSize: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prizeBanner: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    marginTop: spacing.sm,
  },
  prizeTitle: { color: colors.text, fontWeight: '700' },
  prizeBody: { color: colors.textMuted, lineHeight: 20 },
  prizeAmount: { color: colors.accent, fontWeight: '800' },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  feedCard: {
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  feedHeader: { gap: 2 },
  feedImage: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger },
});
