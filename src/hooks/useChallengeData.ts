import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHALLENGE_START_DATE, CHALLENGE_YEAR } from '../constants/challenge';
import { supabase } from '../lib/supabase';
import { todayDateOnly } from '../lib/dates';
import { calculateLeaderboard } from '../lib/weeklyChallenge';
import type { LeaderboardEntry, Profile, Workout, WorkoutWithProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export function useChallengeData() {
  const { user, profile, configured } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [feed, setFeed] = useState<WorkoutWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = CHALLENGE_YEAR;
  const throughDate = todayDateOnly();

  const refresh = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    const [profilesRes, workoutsRes, feedRes] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase
        .from('workouts')
        .select('*')
        .gte('workout_date', CHALLENGE_START_DATE)
        .lte('workout_date', throughDate)
        .order('workout_date', { ascending: true }),
      supabase
        .from('workouts')
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    if (profilesRes.error || workoutsRes.error || feedRes.error) {
      setError(
        profilesRes.error?.message ||
          workoutsRes.error?.message ||
          feedRes.error?.message ||
          'Failed to load data',
      );
      setLoading(false);
      return;
    }

    setProfiles((profilesRes.data ?? []) as Profile[]);
    setWorkouts((workoutsRes.data ?? []) as Workout[]);
    setFeed((feedRes.data ?? []) as WorkoutWithProfile[]);
    setLoading(false);
  }, [configured, throughDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const totals = calculateLeaderboard(
      profiles,
      workouts,
      year,
      throughDate,
      CHALLENGE_START_DATE,
    );
    return profiles
      .map((p) => {
        const t = totals.get(p.id);
        const currentWeek = t?.weeks[t.weeks.length - 1] ?? null;
        return {
          profile: p,
          currentWeek,
          bankedCredits: t?.bankedCredits ?? 0,
          totalMissedDays: t?.totalMissedDays ?? 0,
          totalMoneyOwedMxn: t?.totalMoneyOwedMxn ?? 0,
        };
      })
      .sort((a, b) => {
        // Best first: fewer missed days, then more days done this week
        if (a.totalMissedDays !== b.totalMissedDays) {
          return a.totalMissedDays - b.totalMissedDays;
        }
        return (
          (b.currentWeek?.distinctWorkoutDays ?? 0) -
          (a.currentWeek?.distinctWorkoutDays ?? 0)
        );
      });
  }, [profiles, workouts, year, throughDate]);

  const myWorkouts = useMemo(
    () => (user ? workouts.filter((w) => w.user_id === user.id) : []),
    [workouts, user],
  );

  const myTotals = useMemo(() => {
    if (!user) return null;
    return (
      calculateLeaderboard(
        [{ id: user.id, created_at: profile?.created_at }],
        myWorkouts,
        year,
        throughDate,
        CHALLENGE_START_DATE,
      ).get(user.id) ?? null
    );
  }, [user, profile?.created_at, myWorkouts, year, throughDate]);

  return {
    profiles,
    workouts,
    feed,
    leaderboard,
    myWorkouts,
    myTotals,
    loading,
    error,
    refresh,
    year,
    throughDate,
  };
}
