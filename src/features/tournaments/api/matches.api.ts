import { supabase } from '@/shared/api/supabaseClient';
import type { Match } from '@/types/database';

export async function fetchTournamentMatches(tournamentId: string) {
  return await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });
}

export async function fetchMatchById(matchId: string) {
  return await supabase.from('matches').select('*').eq('id', matchId).single();
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

export async function insertMatches(matches: Partial<Match>[]) {
  return await supabase.from('matches').insert(matches);
}

export async function updateMatch(id: string, updates: Partial<Match>) {
  return await supabase.from('matches').update(updates).eq('id', id);
}
