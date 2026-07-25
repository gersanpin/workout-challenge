import { supabase } from './supabase';
import { todayDateOnly } from './dates';

function randomInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function createGroup(userId: string, name = 'Fortachones') {
  const invite_code = randomInviteCode();
  const { data, error } = await supabase
    .from('challenge_groups')
    .insert({ name, invite_code, created_by: userId })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ group_id: data.id, is_admin: true, removed_at: null })
    .eq('id', userId);
  if (profileErr) throw new Error(profileErr.message);

  return data as {
    id: string;
    name: string;
    invite_code: string;
    challenge_started_on: string | null;
  };
}

export async function joinGroupWithCode(userId: string, code: string) {
  const normalized = code.trim().toUpperCase();
  const { data: group, error } = await supabase
    .from('challenge_groups')
    .select('*')
    .eq('invite_code', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!group) throw new Error('Código de invitación inválido.');

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ group_id: group.id, removed_at: null })
    .eq('id', userId);
  if (profileErr) throw new Error(profileErr.message);
  return group;
}

/** Admin soft-removes a member; their owed amount drops out of the active pot. */
export async function removeMember(adminId: string, memberId: string) {
  const { data: admin } = await supabase
    .from('profiles')
    .select('is_admin, group_id')
    .eq('id', adminId)
    .single();
  if (!admin?.is_admin) throw new Error('Solo admins pueden quitar miembros.');
  if (adminId === memberId) throw new Error('Los admins no pueden quitarse a sí mismos.');

  const { error } = await supabase
    .from('profiles')
    .update({ removed_at: new Date().toISOString(), group_id: null })
    .eq('id', memberId)
    .eq('group_id', admin.group_id);
  if (error) throw new Error(error.message);
}

export async function addGhostMember(
  adminId: string,
  displayName: string,
): Promise<void> {
  const { data: admin } = await supabase
    .from('profiles')
    .select('is_admin, group_id, display_name')
    .eq('id', adminId)
    .single();
  if (!admin?.is_admin || !admin.group_id) {
    throw new Error('Solo admins pueden administrar el grupo.');
  }

  await supabase.from('activity_events').insert({
    group_id: admin.group_id,
    user_id: adminId,
    event_type: 'system',
    title: `Invitación pendiente: ${displayName}`,
    body: `${admin.display_name} quiere agregar a “${displayName}”. Comparte el código de invitación para que se una con una cuenta real.`,
  });
}

/**
 * Admin starts the challenge for the whole group.
 * Sets challenge_started_on = today; everyone shares that start date.
 */
export async function startGroupChallenge(adminId: string): Promise<string> {
  const { data: admin } = await supabase
    .from('profiles')
    .select('is_admin, group_id, display_name')
    .eq('id', adminId)
    .single();
  if (!admin?.is_admin || !admin.group_id) {
    throw new Error('Solo un admin puede comenzar el reto.');
  }

  const { data: group } = await supabase
    .from('challenge_groups')
    .select('challenge_started_on, name')
    .eq('id', admin.group_id)
    .single();

  if (group?.challenge_started_on) {
    throw new Error(`El reto ya empezó el ${group.challenge_started_on}.`);
  }

  const start = todayDateOnly();
  const { error } = await supabase
    .from('challenge_groups')
    .update({ challenge_started_on: start })
    .eq('id', admin.group_id);
  if (error) throw new Error(error.message);

  await supabase.from('activity_events').insert({
    group_id: admin.group_id,
    user_id: adminId,
    event_type: 'system',
    title: '¡El reto Fortachones ha comenzado!',
    body: `${admin.display_name} dio el pistoletazo. Fecha de inicio para todo el grupo: ${start}.`,
  });

  await supabase.from('chat_messages').insert({
    group_id: admin.group_id,
    user_id: adminId,
    body: `🏁 COMENZAR RETO — ${admin.display_name} inició el reto para todos. Fecha de inicio: ${start}. ¡A entrenar!`,
    media_type: 'text',
  });

  return start;
}

export function inviteLink(inviteCode: string): string {
  return `fortachones://join/${inviteCode}`;
}
