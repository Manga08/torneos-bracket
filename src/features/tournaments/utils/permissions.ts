import type { Tournament } from '@/types/database';

import type { TournamentPermission } from '../types/permissions';

export interface CanEditTournamentParams {
  userId: string | null | undefined;
  isSuperAdmin: boolean;
  tournament: Tournament | null | undefined;
  permissions: TournamentPermission[] | null | undefined;
}

export function canEditTournament({
  userId,
  isSuperAdmin,
  tournament,
  permissions,
}: CanEditTournamentParams): boolean {
  if (!userId) return false;
  if (isSuperAdmin) return true;
  if (!tournament) return false;

  // Check if creator (checking both fields to be safe, though created_by is likely the one)
  if (tournament.created_by === userId) return true;
  if (tournament.user_id === userId) return true;

  // Check permissions
  if (permissions) {
    // We assume that if a permission row exists for this user and tournament, they can edit.
    // In the future we might check p.can_edit === true explicitly.
    const hasPermission = permissions.some(
      (p) => p.user_id === userId && p.tournament_id === tournament.id,
    );
    if (hasPermission) return true;
  }

  return false;
}
