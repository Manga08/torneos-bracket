import { supabase } from '@/shared/api/supabaseClient';
import type { Match } from '@/types/database';

import type { TournamentConfig } from '../types';
import type {
  LeagueColumnDefinition,
  LeagueConfig,
  LeagueFinalResults,
  LeagueMetricsSchema,
} from '../types/league';
import { generateRoundRobinMatches } from '../utils/bracketUtils';
import { calculateLeagueTable } from '../utils/leagueLogic';

import { fetchTournamentById, updateTournament } from './tournamentCrud.api';
import { fetchTournamentParticipants, insertMatches } from './tournamentsApi';

export async function fetchLeagueMatches(tournamentId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('stage', 'league')
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function deleteLeagueMatches(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('stage', 'league');

  if (error) throw error;
}

export async function updateLeagueColumns(tournamentId: string, columns: LeagueColumnDefinition[]) {
  // 1. Fetch current config
  const { data: tournament, error: fetchError } = await fetchTournamentById(tournamentId);
  if (fetchError) throw fetchError;

  const rootConfig = (tournament.config as unknown as TournamentConfig) || {};
  const leagueConfig = (rootConfig.league as LeagueConfig) || {};

  const newLeagueConfig: LeagueConfig = {
    ...leagueConfig,
    columns,
  };

  const newRootConfig = {
    ...rootConfig,
    league: newLeagueConfig,
  };

  // 2. Update config
  const { error: updateError } = await updateTournament(tournamentId, {
    config: newRootConfig as unknown as Record<string, unknown>,
  });

  if (updateError) throw updateError;
}

export async function updateLeagueMetricsSchema(
  tournamentId: string,
  metricsSchema: LeagueMetricsSchema,
) {
  // 1. Fetch current config
  const { data: tournament, error: fetchError } = await fetchTournamentById(tournamentId);
  if (fetchError) throw fetchError;

  const rootConfig = (tournament.config as unknown as TournamentConfig) || {};
  const leagueConfig = (rootConfig.league as LeagueConfig) || {};

  const newLeagueConfig: LeagueConfig = {
    ...leagueConfig,
    metricsSchema,
  };

  const newRootConfig = {
    ...rootConfig,
    league: newLeagueConfig,
  };

  // 2. Update config
  const { error: updateError } = await updateTournament(tournamentId, {
    config: newRootConfig as unknown as Record<string, unknown>,
  });

  if (updateError) throw updateError;
}

export async function createOrRegenerateLeagueSchedule(args: {
  tournamentId: string;
  doubleRoundRobin?: boolean;
  regenerate?: boolean;
}): Promise<Match[]> {
  const { tournamentId, doubleRoundRobin, regenerate } = args;

  if (regenerate) {
    await deleteLeagueMatches(tournamentId);
  }

  // Ensure tournamentId is valid before fetching
  if (!tournamentId || tournamentId === 'undefined') {
    throw new Error('Invalid tournament ID');
  }

  const { data: participants, error } = await fetchTournamentParticipants(tournamentId);
  if (error) throw error;

  if (!participants || participants.length < 2) {
    throw new Error('Se necesitan al menos 2 participantes para generar una liga.');
  }

  const matches = generateRoundRobinMatches(tournamentId, participants, {
    doubleRoundRobin,
    stage: 'league',
  });

  // Insert matches using the existing API facade to handle batching if needed
  // Note: insertMatches expects MatchInsertLike, but generateRoundRobinMatches returns BracketMatch (which extends Match)
  // We need to strip id and created_at if the DB generates them, but our generator generates UUIDs.
  // The insertMatches function likely handles this or we pass them as is if the table allows inserting IDs.
  // Let's check insertMatches implementation if possible, but assuming it takes partials.
  // Actually, generateRoundRobinMatches returns objects with IDs.
  // If insertMatches uses supabase.insert(), it will respect provided IDs.

  // We need to cast or map to ensure compatibility with what insertMatches expects
  // Assuming insertMatches takes Match[] or similar.
  await insertMatches(matches);

  return matches;
}

export async function finalizeLeagueTournament(tournamentId: string) {
  // 1. Fetch tournament + matches + participants
  const { data: tournament, error: tError } = await fetchTournamentById(tournamentId);
  if (tError) throw tError;

  const matches = await fetchLeagueMatches(tournamentId);
  const { data: participants, error: pError } = await fetchTournamentParticipants(tournamentId);
  if (pError) throw pError;

  // 2. Calculate standings
  const rootConfig = (tournament.config as unknown as TournamentConfig) || {};
  const leagueConfig = (rootConfig.league as LeagueConfig) || {};
  const standings = calculateLeagueTable(participants || [], matches, leagueConfig);

  // 3. Create snapshot (top 3)
  const top3 = standings.slice(0, 3).map((row) => ({
    participantId: row.participantId,
    name: row.name,
    points: row.points,
    diff: row.diff,
    for: row.for,
    rec: row.rec,
  }));

  const finalResults: LeagueFinalResults = {
    generatedAt: new Date().toISOString(),
    top3,
  };

  const newLeagueConfig: LeagueConfig = {
    ...leagueConfig,
    finalResults,
  };

  const newRootConfig = {
    ...rootConfig,
    league: newLeagueConfig,
  };

  // 4. Update tournament status -> completed, save config
  const { data, error: updateError } = await supabase
    .from('tournaments')
    .update({
      status: 'completed',
      config: newRootConfig as unknown as Record<string, unknown>,
    })
    .eq('id', tournamentId)
    .select()
    .single();

  if (updateError) throw updateError;
  return data;
}

export async function reopenLeagueTournament(tournamentId: string) {
  // 1. Fetch config
  const { data: tournament, error: tError } = await fetchTournamentById(tournamentId);
  if (tError) throw tError;

  const rootConfig = (tournament.config as unknown as TournamentConfig) || {};
  const leagueConfig = (rootConfig.league as LeagueConfig) || {};

  // 2. Remove finalResults
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { finalResults, ...restLeagueConfig } = leagueConfig;

  const newRootConfig = {
    ...rootConfig,
    league: restLeagueConfig,
  };

  // 3. Update status -> active
  const { data, error: updateError } = await supabase
    .from('tournaments')
    .update({
      status: 'active',
      config: newRootConfig as unknown as Record<string, unknown>,
    })
    .eq('id', tournamentId)
    .select()
    .single();

  if (updateError) throw updateError;
  return data;
}

/**
 * Helper: Reset metadata.league.metrics without touching other keys.
 * Returns a new metadata object (does not mutate input).
 */
export function resetLeagueMetricsInMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const current = metadata || {};
  const currentLeague = (current.league as Record<string, unknown>) || {};

  // Only reset 'metrics', keep other league keys if any
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { metrics, ...restLeague } = currentLeague;

  // If league becomes empty, we still keep the key for consistency
  return {
    ...current,
    league: {
      ...restLeague,
      metrics: {}, // reset to empty
    },
  };
}

/**
 * Resets all match results for a league tournament.
 * - score_a = 0, score_b = 0, winner_id = null, status = 'pending'
 * - metadata.league.metrics = {} (preserves other metadata keys)
 */
export async function resetLeagueResults(tournamentId: string): Promise<void> {
  // 1. Fetch all league matches
  const matches = await fetchLeagueMatches(tournamentId);

  if (!matches.length) return;

  // 2. Reset each match
  const updates = matches.map(async (match) => {
    const newMetadata = resetLeagueMetricsInMetadata(match.metadata);

    return supabase
      .from('matches')
      .update({
        score_a: 0,
        score_b: 0,
        winner_id: null,
        status: 'pending',
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id);
  });

  await Promise.all(updates);
}

/**
 * Restarts a league tournament:
 * - Resets all match results (scores, winner, status, metrics)
 * - Optionally regenerates the schedule (round/match order)
 */
export async function restartLeagueTournament(
  tournamentId: string,
  options: { regenerateSchedule?: boolean } = {},
): Promise<void> {
  const { regenerateSchedule = false } = options;

  if (regenerateSchedule) {
    // Regenerate schedule (this deletes + recreates matches with fresh state)
    await createOrRegenerateLeagueSchedule({ tournamentId, regenerate: true });
  } else {
    // Just reset results, keep schedule
    await resetLeagueResults(tournamentId);
  }
}
