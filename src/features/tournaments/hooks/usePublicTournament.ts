import { useState, useEffect } from 'react';

import {
  fetchPublicTournamentBySlug,
  fetchPublicTournamentParticipants,
  fetchPublicTournamentMatches,
  subscribeToPublicTournament,
} from '../api/tournamentsApi';
import type { TournamentRow, ParticipantRow, MatchRow } from '../types';

export const usePublicTournament = (slug?: string) => {
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchTournament = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        // Fetch tournament by slug
        const { data: tourn, error: tournError } = await fetchPublicTournamentBySlug(slug);

        if (tournError) throw tournError;
        setTournament(tourn);

        // Fetch participants
        const { data: parts, error: partsError } = await fetchPublicTournamentParticipants(
          tourn.id,
        );

        if (partsError) throw partsError;
        setParticipants(parts || []);

        // Fetch matches
        const { data: matchData, error: matchError } = await fetchPublicTournamentMatches(tourn.id);

        if (matchError) throw matchError;
        setMatches(matchData || []);
        setError(null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching tournament:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [slug]);

  const tournamentId = tournament?.id;

  // Realtime subscriptions
  useEffect(() => {
    if (!tournamentId) return;

    const unsubscribe = subscribeToPublicTournament(
      tournamentId,
      async () => {
        const { data } = await fetchPublicTournamentMatches(tournamentId);
        if (data) setMatches(data);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        setTournament(payload.new as TournamentRow);
      },
      async () => {
        const { data } = await fetchPublicTournamentParticipants(tournamentId);
        if (data) setParticipants(data);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [tournamentId]);

  return {
    tournament,
    participants,
    matches,
    loading,
    error,
  };
};
