import { supabase } from './supabase';

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

  return data as { id: string; name: string; invite_code: string };
}

export async function joinGroupWithCode(userId: string, code: string) {
  const normalized = code.trim().toUpperCase();
  const { data: group, error } = await supabase
    .from('challenge_groups')
    .select('*')
    .eq('invite_code', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!group) throw new Error('Invalid invite code.');

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
  if (!admin?.is_admin) throw new Error('Only admins can remove members.');
  if (adminId === memberId) throw new Error('Admins cannot remove themselves.');

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
  // Ghosts need an auth user in real Supabase; for now we store a note activity.
  // Full ghost accounts require a service-role invite — surface clear messaging.
  const { data: admin } = await supabase
    .from('profiles')
    .select('is_admin, group_id, display_name')
    .eq('id', adminId)
    .single();
  if (!admin?.is_admin || !admin.group_id) {
    throw new Error('Only admins can manage the group.');
  }

  await supabase.from('activity_events').insert({
    group_id: admin.group_id,
    user_id: adminId,
    event_type: 'system',
    title: `Invite pending: ${displayName}`,
    body: `${admin.display_name} wants to add “${displayName}”. Share the invite code so they can join with a real account.`,
  });
}

export function inviteLink(inviteCode: string): string {
  return `fortachones://join/${inviteCode}`;
}
