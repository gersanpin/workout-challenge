import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Brand,
  Card,
  Display,
  Muted,
  Screen,
  Title,
} from '../components/ui';
import { WeightPlateStack } from '../components/WeightPlateStack';
import { APP_NAME, REQUIRED_WORKOUT_DAYS } from '../constants/challenge';
import { borderWidth, colors, spacing } from '../constants/theme';
import { useChallengeData } from '../hooks/useChallengeData';
import { parseDateOnly, todayDateOnly } from '../lib/dates';

function daysBetween(from: string, to: string): number {
  const a = parseDateOnly(from).getTime();
  const b = parseDateOnly(to).getTime();
  return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1);
}

export function HomeScreen() {
  const {
    group,
    groupPot,
    myDaysDone,
    myEntry,
    myWorkouts,
    myTotals,
    challengeStartedOn,
    challengeHasStarted,
    loading,
    error,
    refresh,
  } = useChallengeData();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const challengeDays = useMemo(() => {
    if (!challengeStartedOn) return 0;
    return daysBetween(challengeStartedOn, todayDateOnly());
  }, [challengeStartedOn]);

  const totalWorkoutDays = useMemo(() => {
    const set = new Set(myWorkouts.map((w) => w.workout_date));
    return set.size;
  }, [myWorkouts]);

  const failedDays = myTotals?.totalMissedDays ?? 0;
  const banked = myEntry?.bankedCredits ?? myTotals?.bankedCredits ?? 0;

  if (loading && !myEntry && myWorkouts.length === 0) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
          />
        }
      >
        <Brand>{APP_NAME}</Brand>
        <Title>HOME</Title>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.heroPhoto}>
          <Image
            source={
              group?.photo_url
                ? { uri: group.photo_url }
                : require('../../assets/fortachones-logo.png')
            }
            style={styles.photo}
          />
          <Text style={styles.groupName}>
            {(group?.name ?? APP_NAME).toUpperCase()}
          </Text>
          {challengeHasStarted ? (
            <Muted>
              Inicio: {challengeStartedOn} · Pozo: ${groupPot} MXN
            </Muted>
          ) : (
            <Text style={styles.pending}>
              RETO NO INICIADO — el admin debe tocar COMENZAR RETO en Chat
            </Text>
          )}
        </View>

        <Card style={styles.weekCard}>
          <Text style={styles.label}>ESTA SEMANA</Text>
          <WeightPlateStack
            daysDone={challengeHasStarted ? myDaysDone : 0}
            maxDays={REQUIRED_WORKOUT_DAYS}
          />
        </Card>

        <View style={styles.statsGrid}>
          <Stat
            label="Días del reto"
            value={String(challengeDays)}
            color={colors.text}
          />
          <Stat
            label="Días de ejercicio"
            value={String(totalWorkoutDays)}
            color={colors.accent}
          />
          <Stat
            label="Días fallados"
            value={String(failedDays)}
            color={failedDays > 0 ? colors.danger : colors.accent}
          />
          <Stat
            label="Días acumulados"
            value={String(banked)}
            color={colors.accent}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card style={styles.statCard}>
      <Display color={color}>{value}</Display>
      <Muted>{label}</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  heroPhoto: {
    borderWidth: borderWidth.thick,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  photo: {
    width: '100%',
    height: 180,
    backgroundColor: colors.white,
    resizeMode: 'contain',
  },
  groupName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    letterSpacing: 1,
    color: colors.text,
  },
  pending: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.danger,
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  weekCard: { gap: spacing.sm },
  label: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    letterSpacing: 1.5,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    gap: 4,
  },
  error: { color: colors.danger, fontFamily: 'Inter_400Regular' },
});
