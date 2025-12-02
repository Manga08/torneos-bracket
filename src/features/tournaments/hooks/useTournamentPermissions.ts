import { useState, useEffect, useCallback } from 'react';

import { fetchTournamentPermissions } from '../api/tournamentsApi';
import type { TournamentRow } from '../types';
import type { TournamentPermission } from '../types/permissions';
import { canEditTournament } from '../utils/permissions';

interface UseTournamentPermissionsProps {
  tournament: TournamentRow | null;
  userId?: string;
  isSuperAdmin: boolean;
}

export const useTournamentPermissions = ({
  tournament,
  userId,
  isSuperAdmin,
}: UseTournamentPermissionsProps) => {
  const [permissions, setPermissions] = useState<TournamentPermission[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadPermissions = useCallback(async () => {
    if (!tournament?.id || !userId) return;

    setLoading(true);
    try {
      const { data, error } = await fetchTournamentPermissions(tournament.id);
      if (error) throw error;
      setPermissions(data);
      setError(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading permissions:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tournament?.id, userId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const canEdit = canEditTournament({
    userId,
    isSuperAdmin,
    tournament,
    permissions,
  });
  const canManagePermissions = isSuperAdmin || tournament?.user_id === userId;

  return {
    permissions,
    canEdit,
    canManagePermissions,
    loading,
    error,
    refetch: loadPermissions,
  };
};
