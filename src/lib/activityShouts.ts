import { REQUIRED_WORKOUT_DAYS } from '../constants/challenge';
import type { LeaderboardEntry } from '../types';
import { supabase } from './supabase';

/**
 * Publica avisos en el feed cuando alguien completa la semana, banca un crédito
 * o cierra días fallados. Idempotente por título reciente.
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
      const title = `${name} llegó a ${REQUIRED_WORKOUT_DAYS}/${REQUIRED_WORKOUT_DAYS} esta semana`;
      if (!existing.has(title)) {
        await supabase.from('activity_events').insert({
          group_id: groupId,
          user_id: entry.profile.id,
          event_type: 'week_complete',
          title,
          body: week.hasDoubleDay ? '¡Día doble en la mezcla! 💪' : null,
        });
        existing.add(title);
      }
    }

    if (week.creditEarned > 0) {
      const title = `${name} acumuló un crédito de día extra`;
      if (!existing.has(title)) {
        await supabase.from('activity_events').insert({
          group_id: groupId,
          user_id: entry.profile.id,
          event_type: 'credit_banked',
          title,
          body: `Semana del ${week.weekStart}`,
        });
        existing.add(title);
      }
    }

    if (week.isClosed && week.finalMissedDays > 0) {
      const title = `${name} cerró ${week.finalMissedDays} día(s) fallado(s) · $${week.moneyOwedMxn} MXN`;
      if (!existing.has(title)) {
        await supabase.from('activity_events').insert({
          group_id: groupId,
          user_id: entry.profile.id,
          event_type: 'week_missed',
          title,
          body: `Semana cerrada el ${week.weekCloseDate}`,
        });
        existing.add(title);
      }
    }
  }
}
