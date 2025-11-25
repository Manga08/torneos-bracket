import type { Profile } from '../../../types/database';

export interface TournamentPermission {
  id: string;
  created_at: string;
  user_id: string;
  tournament_id: string;
  can_edit: boolean;
  profile?: Profile;
}
