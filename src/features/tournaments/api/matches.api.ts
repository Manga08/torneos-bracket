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

export async function updateMatchScoreAndStatus(args: {
  matchId: string;
  scoreA: number;
  scoreB: number;
  status: 'pending' | 'live' | 'completed';
  winnerId: string | null;
}) {
  return await supabase
    .from('matches')
    .update({
      score_a: args.scoreA,
      score_b: args.scoreB,
      status: args.status,
      winner_id: args.winnerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.matchId);
}

export async function updateLeagueMatchMetrics(args: {
  matchId: string;
  metrics: Record<string, unknown>;
}) {
  // 1. Fetch current metadata
  const { data: match, error: fetchError } = await fetchMatchById(args.matchId);
  if (fetchError) throw fetchError;

  const currentMetadata = (match.metadata as Record<string, unknown>) || {};
  const currentLeague = (currentMetadata.league as Record<string, unknown>) || {};
  const currentMetrics = (currentLeague.metrics as Record<string, unknown>) || {};

  // 2. Merge metrics
  const newMetadata = {
    ...currentMetadata,
    league: {
      ...currentLeague,
      metrics: {
        ...currentMetrics,
        ...args.metrics,
      },
    },
  };

  // 3. Update match
  return await supabase
    .from('matches')
    .update({
      metadata: newMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.matchId);
}

export async function updateLeagueSchedule(
  updates: Array<{ matchId: string; roundNumber: number; matchNumber: number }>,
) {
  // Using Promise.all for batch updates since we have different values for each row
  const promises = updates.map((update) =>
    supabase
      .from('matches')
      .update({
        round_number: update.roundNumber,
        match_number: update.matchNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.matchId),
  );

  return await Promise.all(promises);
}
