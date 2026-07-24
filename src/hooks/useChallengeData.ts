import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHALLENGE_YEAR, REQUIRED_WORKOUT_DAYS } from '../constants/challenge';
import { useAuth } from '../context/AuthContext';
import { todayDateOnly } from '../lib/dates';
import { calculateLeaderboard, daysRemainingToGoal } from '../lib/weeklyChallenge';
import { publishWeekActivityShouts } from '../lib/activityShouts';
import { supabase } from '../lib/supabase';
import type {
  ActivityEvent,
  ChallengeGroup,
  LeaderboardEntry,
  Profile,
  Workout,
  WorkoutComment,
  WorkoutWithProfile,
  YearlyTotals,
} from '../types';

function emptyTotals(userId: string): YearlyTotals {
  return {
    userId,
    bankedCredits: 0,
    totalMissedDays: 0,
    totalMoneyOwedMxn: 0,
    weeks: [],
  };
}

export function useChallengeData() {
  const { user, profile, configured } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [feed, setFeed] = useState<WorkoutWithProfile[]>([]);
  const [comments, setComments] = useState<WorkoutComment[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [group, setGroup] = useState<ChallengeGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = CHALLENGE_YEAR;
  const throughDate = todayDateOnly();
  const challengeStartedOn = group?.challenge_started_on ?? null;
  const challengeHasStarted = Boolean(challengeStartedOn);

  const refresh = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    let groupData: ChallengeGroup | null = null;
    if (profile?.group_id) {
      const g = await supabase
        .from('challenge_groups')
        .select('*')
        .eq('id', profile.group_id)
        .maybeSingle();
      groupData = (g.data as ChallengeGroup) ?? null;
      setGroup(groupData);
    } else {
      setGroup(null);
    }

    const startDate = groupData?.challenge_started_on ?? null;

    const [profilesRes, workoutsRes, feedRes, activityRes] = await Promise.all([
      profile?.group_id
        ? supabase
            .from('profiles')
            .select('*')
            .eq('group_id', profile.group_id)
            .is('removed_at', null)
            .order('display_name')
        : supabase.from('profiles').select('*').eq('id', user?.id ?? ''),
      supabase
        .from('workouts')
        .select('*')
        // Always load recent rows for log/day-count UX. Scoring still scopes via
        // challengeStartedOn in calculateLeaderboard.
        .gte('workout_date', startDate ?? `${year}-01-01`)
        .lte('workout_date', throughDate)
        .order('workout_date', { ascending: true }),
      supabase
        .from('workouts')
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(40),
      profile?.group_id
        ? supabase
            .from('activity_events')
            .select('*, profiles(display_name, avatar_url)')
            .eq('group_id', profile.group_id)
            .order('created_at', { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesRes.error || workoutsRes.error || feedRes.error) {
      setError(
        profilesRes.error?.message ||
          workoutsRes.error?.message ||
          feedRes.error?.message ||
          'Error al cargar',
      );
      setLoading(false);
      return;
    }

    const profileRows = (profilesRes.data ?? []) as Profile[];
    const activeProfiles = profileRows.filter((p) => !p.removed_at);
    setProfiles(activeProfiles);

    const activeIds = new Set(activeProfiles.map((p) => p.id));
    const allWorkouts = (workoutsRes.data ?? []) as Workout[];
    const scopedWorkouts = profile?.group_id
      ? allWorkouts.filter((w) => activeIds.has(w.user_id))
      : allWorkouts.filter((w) => w.user_id === user?.id);
    setWorkouts(scopedWorkouts);

    const feedRows = ((feedRes.data ?? []) as WorkoutWithProfile[]).filter((w) =>
      profile?.group_id ? activeIds.has(w.user_id) : w.user_id === user?.id,
    );
    setFeed(feedRows);

    setActivity((activityRes.data ?? []) as ActivityEvent[]);

    if (feedRows.length) {
      const ids = feedRows.map((f) => f.id);
      const { data: commentRows } = await supabase
        .from('workout_comments')
        .select('*, profiles(display_name, avatar_url)')
        .in('workout_id', ids)
        .order('created_at', { ascending: true });
      setComments((commentRows ?? []) as WorkoutComment[]);
    } else {
      setComments([]);
    }

    if (profile?.group_id && activeProfiles.length && startDate) {
      const totals = calculateLeaderboard(
        activeProfiles,
        scopedWorkouts,
        year,
        throughDate,
        startDate,
      );
      const board = activeProfiles.map((p) => {
        const t = totals.get(p.id);
        const userWs = scopedWorkouts.filter((w) => w.user_id === p.id);
        const daySet = new Set(
          userWs
            .filter((w) => w.photo_url && w.photo_url.trim())
            .map((w) => w.workout_date),
        );
        return {
          profile: p,
          currentWeek: t?.weeks[t.weeks.length - 1] ?? null,
          bankedCredits: t?.bankedCredits ?? 0,
          totalMissedDays: t?.totalMissedDays ?? 0,
          totalMoneyOwedMxn: t?.totalMoneyOwedMxn ?? 0,
          totalWorkoutDays: daySet.size,
        };
      });
      void publishWeekActivityShouts({
        groupId: profile.group_id,
        leaderboard: board,
      }).catch(() => undefined);
    }

    setLoading(false);
  }, [configured, profile?.group_id, user?.id, throughDate, year]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    if (!challengeStartedOn) {
      return profiles.map((p) => ({
        profile: p,
        currentWeek: null,
        bankedCredits: 0,
        totalMissedDays: 0,
        totalMoneyOwedMxn: 0,
        totalWorkoutDays: 0,
      }));
    }
    const totals = calculateLeaderboard(
      profiles,
      workouts,
      year,
      throughDate,
      challengeStartedOn,
    );
    return profiles
      .map((p) => {
        const t = totals.get(p.id);
        const currentWeek = t?.weeks[t.weeks.length - 1] ?? null;
        const daySet = new Set(
          workouts
            .filter(
              (w) =>
                w.user_id === p.id &&
                w.photo_url &&
                w.photo_url.trim() &&
                w.workout_date >= challengeStartedOn,
            )
            .map((w) => w.workout_date),
        );
        return {
          profile: p,
          currentWeek,
          bankedCredits: t?.bankedCredits ?? 0,
          totalMissedDays: t?.totalMissedDays ?? 0,
          totalMoneyOwedMxn: t?.totalMoneyOwedMxn ?? 0,
          totalWorkoutDays: daySet.size,
        };
      })
      .sort((a, b) => {
        if (b.totalWorkoutDays !== a.totalWorkoutDays) {
          return b.totalWorkoutDays - a.totalWorkoutDays;
        }
        return a.totalMissedDays - b.totalMissedDays;
      });
  }, [profiles, workouts, year, throughDate, challengeStartedOn]);

  const groupPot = useMemo(
    () => leaderboard.reduce((s, e) => s + e.totalMoneyOwedMxn, 0),
    [leaderboard],
  );

  const myWorkouts = useMemo(
    () => (user ? workouts.filter((w) => w.user_id === user.id) : []),
    [workouts, user],
  );

  const myEntry = useMemo(
    () => leaderboard.find((e) => e.profile.id === user?.id) ?? null,
    [leaderboard, user?.id],
  );

  const myTotals = useMemo(() => {
    if (!user) return null;
    if (!challengeStartedOn) return emptyTotals(user.id);
    return (
      calculateLeaderboard(
        [{ id: user.id, created_at: profile?.created_at }],
        myWorkouts,
        year,
        throughDate,
        challengeStartedOn,
      ).get(user.id) ?? emptyTotals(user.id)
    );
  }, [
    user,
    profile?.created_at,
    myWorkouts,
    year,
    throughDate,
    challengeStartedOn,
  ]);

  const myWeek = myEntry?.currentWeek ?? null;
  const myDaysDone = myWeek?.progressPoints ?? 0;
  const myDaysRemaining = daysRemainingToGoal(myDaysDone);

  return {
    profiles,
    workouts,
    feed,
    comments,
    activity,
    group,
    challengeStartedOn,
    challengeHasStarted,
    leaderboard,
    groupPot,
    myWorkouts,
    myTotals,
    myEntry,
    myWeek,
    myDaysDone,
    myDaysRemaining,
    requiredDays: REQUIRED_WORKOUT_DAYS,
    loading,
    error,
    refresh,
    year,
    throughDate,
  };
}
