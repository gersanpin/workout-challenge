import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, EmptyState, Muted, Screen, Title } from '../components/ui';
import { colors, radii, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useChallengeData } from '../hooks/useChallengeData';
import { addWorkoutComment } from '../lib/workoutsApi';
import type { ActivityEvent, WorkoutComment, WorkoutWithProfile } from '../types';

type FeedRow =
  | { kind: 'workout'; data: WorkoutWithProfile }
  | { kind: 'activity'; data: ActivityEvent };

export function FeedScreen() {
  const { user } = useAuth();
  const { feed, comments, activity, loading, refresh } = useChallengeData();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const rows: FeedRow[] = useMemo(() => {
    const workoutRows: FeedRow[] = feed.map((w) => ({
      kind: 'workout',
      data: w,
    }));
    const activityRows: FeedRow[] = activity
      .filter((a) => a.event_type !== 'workout')
      .map((a) => ({ kind: 'activity', data: a }));

    return [...workoutRows, ...activityRows].sort((a, b) => {
      const at =
        a.kind === 'workout' ? a.data.created_at : a.data.created_at;
      const bt =
        b.kind === 'workout' ? b.data.created_at : b.data.created_at;
      return bt.localeCompare(at);
    });
  }, [feed, activity]);

  const commentsByWorkout = useMemo(() => {
    const map = new Map<string, WorkoutComment[]>();
    for (const c of comments) {
      const list = map.get(c.workout_id) ?? [];
      list.push(c);
      map.set(c.workout_id, list);
    }
    return map;
  }, [comments]);

  const onComment = async (workoutId: string) => {
    if (!user) return;
    const body = (drafts[workoutId] ?? '').trim();
    if (!body) return;
    setPosting(workoutId);
    try {
      await addWorkoutComment(workoutId, user.id, body);
      setDrafts((d) => ({ ...d, [workoutId]: '' }));
      await refresh();
    } finally {
      setPosting(null);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <FlatList
        data={rows}
        keyExtractor={(item) =>
          item.kind === 'workout' ? `w-${item.data.id}` : `a-${item.data.id}`
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>Feed</Title>
            <Muted>
              Workouts, comments, and group shouts — week complete, banked
              credits, missed days.
            </Muted>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'activity') {
            return (
              <Card style={styles.activityCard}>
                <Text style={styles.activityTitle}>{item.data.title}</Text>
                {item.data.body ? <Muted>{item.data.body}</Muted> : null}
              </Card>
            );
          }

          const w = item.data;
          const thread = commentsByWorkout.get(w.id) ?? [];
          return (
            <Card style={styles.post}>
              <Text style={styles.name}>
                {w.profiles?.display_name ?? 'Athlete'}
              </Text>
              <Muted>
                {w.workout_date} · {w.exercise_type}
              </Muted>
              <Image source={{ uri: w.photo_url }} style={styles.image} />
              <View style={styles.thread}>
                {thread.map((c) => (
                  <Text key={c.id} style={styles.comment}>
                    <Text style={styles.commentAuthor}>
                      {c.profiles?.display_name ?? 'Friend'}{' '}
                    </Text>
                    {c.body}
                  </Text>
                ))}
              </View>
              <View style={styles.commentRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment…"
                  placeholderTextColor={colors.textDim}
                  value={drafts[w.id] ?? ''}
                  onChangeText={(t) =>
                    setDrafts((d) => ({ ...d, [w.id]: t }))
                  }
                />
                <Button
                  label="Post"
                  onPress={() => void onComment(w.id)}
                  loading={posting === w.id}
                />
              </View>
            </Card>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: spacing.md }}>
            <EmptyState
              title="Quiet feed"
              body="Log a workout — it shows up here for the whole crew."
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
  list: { paddingBottom: spacing.xxl, gap: spacing.sm },
  post: {
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  activityCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.bgSoft,
    gap: 4,
  },
  activityTitle: { color: colors.navy, fontWeight: '700' },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  image: {
    width: '100%',
    height: 240,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  thread: { gap: 6 },
  comment: { color: colors.text, lineHeight: 20 },
  commentAuthor: { fontWeight: '700' },
  commentRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
