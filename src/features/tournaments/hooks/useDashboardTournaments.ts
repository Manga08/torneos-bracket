import { useState, useEffect, useCallback } from 'react';

import { fetchDashboardTournaments } from '../api/tournamentsApi';
import type { TournamentRow } from '../types';

export const useDashboardTournaments = () => {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: apiError } = await fetchDashboardTournaments();

      if (apiError) throw apiError;
      setTournaments(data || []);
      setError(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching tournaments:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return {
    tournaments,
    loading,
    error,
    refetch: fetchTournaments,
  };
};
