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
import { borderWidth, colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import { parseDateOnly, todayDateOnly } from '../lib/dates';

function daysBetween(from: string, to: string): number {
  const a = parseDateOnly(from).getTime();
  const b = parseDateOnly(to).getTime();
  return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1);
}

export function HomeScreen() {
  const { user } = useAuth();
  const {
    group,
    groupPot,
    myDaysDone,
    myEntry,
    myWeek,
    myOpenPriorWeek,
    myWorkouts,
    myTotals,
    leaderboard,
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
    const set = new Set(
      myWorkouts
        .filter((w) => w.photo_url?.trim())
        .map((w) => w.workout_date),
    );
    return set.size;
  }, [myWorkouts]);

  const failedDays = myTotals?.totalMissedDays ?? 0;
  const banked = myEntry?.bankedCredits ?? myTotals?.bankedCredits ?? 0;
  const favorThisWeek = myWeek?.creditEarned ?? 0;

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
        <Title>INICIO</Title>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.heroPhoto}>
          <Image
            source={
              group?.photo_url
                ? { uri: group.photo_url }
                : require('../../assets/fortachones-logo.png')
            }
            style={styles.photo}
            resizeMode="cover"
          />
          <Text style={styles.groupName}>
            {(group?.name ?? APP_NAME).toUpperCase()}
          </Text>
          <View style={styles.heroMeta}>
            {challengeHasStarted ? (
              <Muted>
                Inicio: {challengeStartedOn} · Guardadito: ${groupPot} MXN
              </Muted>
            ) : (
              <Text style={styles.pending}>
                RETO NO INICIADO — el admin debe tocar COMENZAR RETO en Chat
              </Text>
            )}
          </View>
        </View>

        <Card style={styles.weekCard}>
          <Text style={styles.label}>ESTA SEMANA</Text>
          <WeightPlateStack
            progressPoints={challengeHasStarted ? myDaysDone : 0}
            maxDays={REQUIRED_WORKOUT_DAYS}
            favorDays={challengeHasStarted ? favorThisWeek : 0}
          />
        </Card>

        {challengeHasStarted && myOpenPriorWeek ? (
          <Card style={styles.weekCard}>
            <Text style={styles.label}>SEMANA ANTERIOR (AÚN ABIERTA)</Text>
            <WeightPlateStack
              progressPoints={myOpenPriorWeek.progressPoints}
              maxDays={REQUIRED_WORKOUT_DAYS}
              favorDays={myOpenPriorWeek.creditEarned}
            />
            <Muted>
              Registros con fecha de esa semana (p. ej. domingo) cuentan aquí ·{' '}
              {myOpenPriorWeek.weekStart}
            </Muted>
          </Card>
        ) : null}

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
            label="Días a favor"
            value={String(banked)}
            color={colors.accent}
          />
        </View>

        <Card style={styles.leaderCard}>
          <Text style={styles.label}>LEADERBOARD</Text>
          <Text style={styles.potLine}>
            Guardadito del grupo: ${groupPot} MXN
          </Text>
          <Muted>
            Quién debe cuánto · ranking por días de ejercicio desde el inicio
          </Muted>

          {leaderboard.length === 0 ? (
            <Muted>Sin integrantes aún.</Muted>
          ) : (
            leaderboard.map((e, idx) => {
              const mine = e.profile.id === user?.id;
              return (
                <View
                  key={e.profile.id}
                  style={[styles.lbRow, mine && styles.lbRowMine]}
                >
                  <Text style={styles.lbRank}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbName}>
                      {e.profile.display_name}
                      {mine ? ' · TÚ' : ''}
                    </Text>
                    <Text style={styles.lbMeta}>
                      {e.totalWorkoutDays} días ejercicio · {e.bankedCredits} a
                      favor · {e.totalMissedDays} fallados
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.lbOwes,
                      e.totalMoneyOwedMxn > 0
                        ? styles.lbOwesBad
                        : styles.lbOwesOk,
                    ]}
                  >
                    ${e.totalMoneyOwedMxn}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
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
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: colors.white,
  },
  groupName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    letterSpacing: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  heroMeta: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
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
  leaderCard: { gap: spacing.sm },
  potLine: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: colors.text,
    letterSpacing: 1,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingVertical: spacing.sm,
  },
  lbRowMine: {
    backgroundColor: colors.accentSoft,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  lbRank: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.accent,
    fontSize: 22,
    width: 36,
  },
  lbName: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.text,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  lbMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  lbOwes: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
  },
  lbOwesBad: { color: colors.danger },
  lbOwesOk: { color: colors.accent },
  error: { color: colors.danger, fontFamily: 'Inter_400Regular' },
});
