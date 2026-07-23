import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Muted,
  ProgressBar,
  Screen,
  Title,
} from '../components/ui';
import { APP_NAME } from '../constants/challenge';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import {
  addGhostMember,
  createGroup,
  inviteLink,
  joinGroupWithCode,
  removeMember,
} from '../lib/groupApi';
import type { LeaderboardEntry } from '../types';

function MemberRow({
  entry,
  requiredDays,
  isAdmin,
  onRemove,
}: {
  entry: LeaderboardEntry;
  requiredDays: number;
  isAdmin: boolean;
  onRemove: () => void;
}) {
  const done = entry.currentWeek?.distinctWorkoutDays ?? 0;
  const remaining = Math.max(0, requiredDays - done);
  return (
    <Card style={styles.memberCard}>
      <View style={styles.memberTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {entry.profile.display_name}
            {entry.profile.is_admin ? ' · admin' : ''}
          </Text>
          <Muted>
            {done}/{requiredDays} done · {remaining} remaining · banked{' '}
            {entry.bankedCredits}
          </Muted>
        </View>
        <Text style={styles.owed}>${entry.totalMoneyOwedMxn}</Text>
      </View>
      <ProgressBar value={done} max={requiredDays} />
      {isAdmin && !entry.profile.is_admin ? (
        <Button label="Remove" variant="ghost" onPress={onRemove} />
      ) : null}
    </Card>
  );
}

export function HomeScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const {
    leaderboard,
    groupPot,
    myDaysDone,
    myDaysRemaining,
    myEntry,
    requiredDays,
    group,
    loading,
    error,
    refresh,
  } = useChallengeData();

  const [inviteCode, setInviteCode] = useState('');
  const [ghostName, setGhostName] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onCreateGroup = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await createGroup(user.id, APP_NAME);
      await refreshProfile();
      await refresh();
      Alert.alert('Group created', 'Share your invite code with the crew.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await joinGroupWithCode(user.id, inviteCode);
      await refreshProfile();
      await refresh();
      setInviteCode('');
    } catch (e) {
      Alert.alert('Could not join', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = (memberId: string, name: string) => {
    if (!user) return;
    Alert.alert(
      'Remove member?',
      `${name}'s owed amount will leave the group pot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeMember(user.id, memberId);
                await refresh();
              } catch (e) {
                Alert.alert('Error', (e as Error).message);
              }
            })();
          },
        },
      ],
    );
  };

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
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Title>Home</Title>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Card style={styles.meCard}>
              <Text style={styles.sectionLabel}>Your week</Text>
              <Text style={styles.bigStat}>
                {myDaysDone}/{requiredDays} days
              </Text>
              <Muted>{myDaysRemaining} remaining to hit the minimum</Muted>
              <ProgressBar value={myDaysDone} max={requiredDays} />
              <View style={styles.rowBetween}>
                <Muted>You owe</Muted>
                <Text style={styles.owed}>
                  ${myEntry?.totalMoneyOwedMxn ?? 0} MXN
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Muted>Banked credits</Muted>
                <Text style={styles.credit}>
                  {myEntry?.bankedCredits ?? 0}
                </Text>
              </View>
            </Card>

            <Card style={styles.potCard}>
              <Text style={styles.sectionLabel}>Group pot</Text>
              <Text style={styles.potAmount}>${groupPot} MXN</Text>
              <Muted>
                Year-end prize pool (informational — no in-app payments)
              </Muted>
            </Card>

            {!profile?.group_id ? (
              <Card style={{ gap: spacing.md }}>
                <Text style={styles.sectionLabel}>Join or create a group</Text>
                <Muted>
                  Admins create the group and share an invite code / link.
                  Members join with that code.
                </Muted>
                <Button
                  label="Create Fortachones group (become admin)"
                  onPress={() => void onCreateGroup()}
                  loading={busy}
                />
                <Field
                  label="Invite code"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  placeholder="ABCD1234"
                />
                <Button
                  label="Join with code"
                  variant="secondary"
                  onPress={() => void onJoin()}
                  loading={busy}
                />
              </Card>
            ) : (
              <Card style={{ gap: spacing.sm }}>
                <Text style={styles.sectionLabel}>Group</Text>
                <Muted>
                  {group?.name ?? APP_NAME} · code{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {group?.invite_code}
                  </Text>
                </Muted>
                <Muted>Link: {inviteLink(group?.invite_code ?? '')}</Muted>

                {profile.is_admin ? (
                  <>
                    <Field
                      label="Add made-up / pending member (admin)"
                      value={ghostName}
                      onChangeText={setGhostName}
                      placeholder="Nickname to invite"
                    />
                    <Button
                      label="Post invite note"
                      variant="secondary"
                      onPress={() => {
                        if (!user || !ghostName.trim()) return;
                        void addGhostMember(user.id, ghostName.trim())
                          .then(() => {
                            setGhostName('');
                            return refresh();
                          })
                          .catch((e) =>
                            Alert.alert('Error', (e as Error).message),
                          );
                      }}
                    />
                    <Muted>
                      Real joins still use the invite code. Removing a member
                      drops their owed total from the pot.
                    </Muted>
                  </>
                ) : (
                  <Muted>Only admins can add or remove members.</Muted>
                )}
              </Card>
            )}

            <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>
              Crew this week
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
            <MemberRow
              entry={item}
              requiredDays={requiredDays}
              isAdmin={Boolean(profile?.is_admin)}
              onRemove={() =>
                onRemove(item.profile.id, item.profile.display_name)
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.md }}>
            <EmptyState
              title="No crew yet"
              body="Create a group or join with an invite code."
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
  brand: { ...typography.brand, color: colors.accent, fontSize: 24 },
  sectionLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  meCard: { gap: spacing.sm },
  potCard: {
    gap: 4,
    backgroundColor: colors.bgSoft,
  },
  bigStat: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -1,
  },
  potAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accent,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  owed: { color: colors.warning, fontWeight: '800', fontSize: 18 },
  credit: { color: colors.accent, fontWeight: '800', fontSize: 18 },
  memberCard: { gap: spacing.sm },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { ...typography.subtitle, color: colors.text },
  error: { color: colors.danger },
});
