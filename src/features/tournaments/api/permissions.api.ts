import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/shared/api/supabaseClient';

import type { TournamentPermission } from '../types/permissions';

export async function assignTournamentPermissions(payload: {
  user_id: string;
  tournament_id: string;
  can_edit: boolean;
}) {
  return await supabase.from('user_tournament_permissions').insert(payload);
}

export async function fetchTournamentPermissions(tournamentId: string): Promise<{
  data: TournamentPermission[] | null;
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from('user_tournament_permissions')
    .select('*, profile:profiles(*)')
    .eq('tournament_id', tournamentId);

  // Map the result to match the type if necessary, though Supabase usually handles it if the shape matches.
  // The 'profile' alias in select matches the optional 'profile' in the interface.
  return { data: data as unknown as TournamentPermission[] | null, error };
}

export async function addTournamentPermission(payload: {
  tournament_id: string;
  user_id: string;
  can_edit: boolean;
}) {
  return await supabase.from('user_tournament_permissions').insert(payload).select().single();
}

export async function deleteTournamentPermission(permissionId: string) {
  return await supabase.from('user_tournament_permissions').delete().eq('id', permissionId);
}

export async function fetchUserTournamentPermissions(userId: string): Promise<{
  data: TournamentPermission[] | null;
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from('user_tournament_permissions')
    .select('*')
    .eq('user_id', userId);

  return { data: data as TournamentPermission[] | null, error };
}

export async function fetchUserTournamentPermissionForTournament(
  userId: string,
  tournamentId: string,
): Promise<{
  data: TournamentPermission | null;
  error: PostgrestError | null;
}> {
  const { data, error } = await supabase
    .from('user_tournament_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('tournament_id', tournamentId)
    .single();

  return { data: data as TournamentPermission | null, error };
}
