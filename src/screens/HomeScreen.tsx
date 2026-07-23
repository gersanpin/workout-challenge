import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Brand,
  Card,
  Display,
  EmptyState,
  Muted,
  Screen,
  Title,
} from '../components/ui';
import { WeightPlateStack } from '../components/WeightPlateStack';
import { APP_NAME } from '../constants/challenge';
import { colors, spacing, typography } from '../constants/theme';
import { useChallengeData } from '../hooks/useChallengeData';
import type { LeaderboardEntry } from '../types';

function MemberRow({
  entry,
  requiredDays,
}: {
  entry: LeaderboardEntry;
  requiredDays: number;
}) {
  const done = entry.currentWeek?.distinctWorkoutDays ?? 0;
  const remaining = Math.max(0, requiredDays - done);
  const owed = entry.totalMoneyOwedMxn;
  return (
    <Card style={styles.memberCard}>
      <View style={styles.memberTop}>
        <Text style={styles.name}>{entry.profile.display_name}</Text>
        <Text style={[styles.owed, owed > 0 ? styles.owedBad : styles.owedOk]}>
          ${owed}
        </Text>
      </View>
      <WeightPlateStack daysDone={done} maxDays={requiredDays} />
      <Muted>
        {remaining} restantes · banked {entry.bankedCredits}
      </Muted>
    </Card>
  );
}

export function HomeScreen() {
  const {
    leaderboard,
    groupPot,
    myDaysDone,
    myDaysRemaining,
    myEntry,
    requiredDays,
    loading,
    error,
    refresh,
  } = useChallengeData();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading && leaderboard.length === 0) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  const owed = myEntry?.totalMoneyOwedMxn ?? 0;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.profile.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Brand>{APP_NAME}</Brand>
            <Title>HOME</Title>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Card style={styles.meCard}>
              <Text style={styles.sectionLabel}>TU SEMANA</Text>
              <Display color={myDaysRemaining === 0 ? colors.accent : colors.text}>
                {myDaysDone}/{requiredDays}
              </Display>
              <Muted>{myDaysRemaining} días de workout restantes</Muted>
              <WeightPlateStack daysDone={myDaysDone} maxDays={requiredDays} />
              <View style={styles.rowBetween}>
                <Muted>Debes</Muted>
                <Text style={[styles.owed, owed > 0 ? styles.owedBad : styles.owedOk]}>
                  ${owed} MXN
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Muted>Créditos</Muted>
                <Text style={styles.credit}>{myEntry?.bankedCredits ?? 0}</Text>
              </View>
            </Card>

            <Card style={styles.potCard}>
              <Text style={styles.sectionLabel}>POZO DEL GRUPO</Text>
              <Display color={colors.danger}>${groupPot}</Display>
              <Muted>Premio de fin de año (solo informativo)</Muted>
            </Card>

            <Text style={styles.sectionLabel}>LA CREW</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
            <MemberRow entry={item} requiredDays={requiredDays} />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.md }}>
            <EmptyState
              title="Sin crew"
              body="Entra al Chat para crear o unirte a un grupo."
            />
          </View>
        }
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
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
  sectionLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    letterSpacing: 1.5,
    color: colors.textMuted,
  },
  meCard: { gap: spacing.sm },
  potCard: { gap: 4 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  owed: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    letterSpacing: 1,
  },
  owedBad: { color: colors.danger },
  owedOk: { color: colors.accent },
  credit: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.accent,
  },
  memberCard: { gap: spacing.sm },
  memberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
    textTransform: 'uppercase',
  },
  error: { color: colors.danger, fontFamily: 'Inter_400Regular' },
});
