import { supabase } from '../../../shared/api/supabaseClient';
import type { Tournament, Participant, Match } from '../../../types/database';
import type { TournamentPermission } from '../types/permissions';
import type { PostgrestError } from '@supabase/supabase-js';

export async function fetchDashboardTournaments() {
  return await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function createTournament(payload: {
  name: string;
  slug: string;
  game: string;
  format: string;
  config: Record<string, unknown>;
  is_public: boolean;
  created_by: string;
  status: string;
}) {
  return await supabase
    .from('tournaments')
    .insert(payload)
    .select()
    .single();
}

export async function assignTournamentPermissions(payload: {
  user_id: string;
  tournament_id: string;
  can_edit: boolean;
}) {
  return await supabase
    .from('user_tournament_permissions')
    .insert(payload);
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
  return await supabase
    .from('user_tournament_permissions')
    .insert(payload)
    .select()
    .single();
}

export async function deleteTournamentPermission(permissionId: string) {
  return await supabase
    .from('user_tournament_permissions')
    .delete()
    .eq('id', permissionId);
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
  tournamentId: string
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

// --- New Functions for TournamentDetail ---

export async function fetchTournamentById(id: string) {
  return await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
}

export async function fetchTournamentParticipants(tournamentId: string) {
  return await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
}

export async function fetchTournamentMatches(tournamentId: string) {
  return await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });
}

export async function fetchMatchById(matchId: string) {
  return await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
}

export async function fetchMatchesByRound(tournamentId: string, roundNumber: number) {
  return await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber);
}

export async function fetchPendingGroupMatches(tournamentId: string) {
  return await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .ilike('stage', 'Group%') // Filter only group stages
    .eq('status', 'pending')
    .limit(1);
}

export async function addParticipant(participant: Partial<Participant>) {
  return await supabase
    .from('participants')
    .insert(participant)
    .select()
    .single();
}

export async function addParticipantsBulk(participants: Partial<Participant>[]) {
  return await supabase
    .from('participants')
    .insert(participants);
}

export async function updateParticipant(id: string, updates: Partial<Participant>) {
  return await supabase
    .from('participants')
    .update(updates)
    .eq('id', id);
}

export async function upsertParticipants(participants: Partial<Participant>[]) {
  return await supabase
    .from('participants')
    .upsert(participants);
}

export async function deleteParticipant(id: string) {
  return await supabase
    .from('participants')
    .delete()
    .eq('id', id);
}

export async function updateTournament(id: string, updates: Partial<Tournament>) {
  return await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id);
}

export async function insertMatches(matches: Partial<Match>[]) {
  return await supabase
    .from('matches')
    .insert(matches);
}

export async function updateMatch(id: string, updates: Partial<Match>) {
  return await supabase
    .from('matches')
    .update(updates)
    .eq('id', id);
}

export async function deleteTournamentFull(id: string) {
  // 1. Unlink next matches to avoid FK constraints if any self-referencing
  await supabase.from('matches').update({ next_match_id: null }).eq('tournament_id', id);

  // 2. Delete matches
  await supabase.from('matches').delete().eq('tournament_id', id);

  // 3. Delete participants
  await supabase.from('participants').delete().eq('tournament_id', id);

  // 4. Delete permissions
  await supabase.from('user_tournament_permissions').delete().eq('tournament_id', id);

  // 5. Delete tournament
  return await supabase.from('tournaments').delete().eq('id', id);
}

export function subscribeToTournamentChanges(
  tournamentId: string,
  onParticipantsChange: () => void,
  onMatchesChange: () => void
) {
  const channel = supabase
    .channel('tournament_detail')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${tournamentId}` },
      () => onParticipantsChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` },
      () => onMatchesChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMatches(tournamentId: string, onMatchesChange: () => void) {
  const channel = supabase
    .channel('tournament_matches')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` },
      () => onMatchesChange())
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// --- New Functions for PublicTournamentView ---

export async function fetchPublicTournamentBySlug(slug: string) {
  return await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .single();
}

export async function fetchPublicTournamentParticipants(tournamentId: string) {
  return await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true });
}

export async function fetchPublicTournamentMatches(tournamentId: string) {
  return await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });
}

export function subscribeToPublicTournament(
  tournamentId: string,
  onMatchesChange: () => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTournamentChange: (payload: any) => void
) {
  const matchChannel = supabase
    .channel('public_matches')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` },
      () => onMatchesChange())
    .subscribe();

  const tournamentChannel = supabase
    .channel('public_tournament')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` },
      (payload) => onTournamentChange(payload))
    .subscribe();

  return () => {
    supabase.removeChannel(matchChannel);
    supabase.removeChannel(tournamentChannel);
  };
}
