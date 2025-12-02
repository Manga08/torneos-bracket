import { supabase } from '@/shared/api/supabaseClient';

export async function fetchPublicTournamentBySlug(slug: string) {
  return await supabase.from('tournaments').select('*').eq('slug', slug).single();
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
