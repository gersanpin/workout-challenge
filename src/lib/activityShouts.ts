import { REQUIRED_WORKOUT_DAYS } from '../constants/challenge';
import type { LeaderboardEntry } from '../types';
import { supabase } from './supabase';

/**
 * Post feed notifications when a member finishes the week, banks a credit,
 * or locks in missed days after the grace close. Idempotent enough for client use
 * (title-matched within recent events).
 */
export async function publishWeekActivityShouts(opts: {
  groupId: string;
  leaderboard: LeaderboardEntry[];
}): Promise<void> {
  const { groupId, leaderboard } = opts;

  const { data: recent } = await supabase
    .from('activity_events')
    .select('title')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(80);

  const existing = new Set((recent ?? []).map((r: { title: string }) => r.title));

  for (const entry of leaderboard) {
    const week = entry.currentWeek;
    if (!week) continue;
    const name = entry.profile.display_name;

    if (week.distinctWorkoutDays >= REQUIRED_WORKOUT_DAYS) {
      const title = `${name} hit ${REQUIRED_WORKOUT_DAYS}/${REQUIRED_WORKOUT_DAYS} this week`;
      if (!existing.has(title)) {
        await supabase.from('activity_events').insert({
          group_id: groupId,
          user_id: entry.profile.id,
          event_type: 'week_complete',
          title,
          body: week.hasDoubleDay ? 'Double day in the mix 💪' : null,
        });
        existing.add(title);
      }
    }

    if (week.creditEarned > 0) {
      const title = `${name} banked an extra-day credit`;
      if (!existing.has(title)) {
        await supabase.from('activity_events').insert({
          group_id: groupId,
          user_id: entry.profile.id,
          event_type: 'credit_banked',
          title,
          body: `Week of ${week.weekStart}`,
        });
        existing.add(title);
      }
    }

    if (week.isClosed && week.finalMissedDays > 0) {
      const title = `${name} locked ${week.finalMissedDays} missed day(s) · $${week.moneyOwedMxn} MXN`;
      if (!existing.has(title)) {
        await supabase.from('activity_events').insert({
          group_id: groupId,
          user_id: entry.profile.id,
          event_type: 'week_missed',
          title,
          body: `Week closed ${week.weekCloseDate}`,
        });
        existing.add(title);
      }
    }
  }
}
