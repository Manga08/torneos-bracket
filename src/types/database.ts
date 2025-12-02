export interface Participant {
  id: string;
  created_at: string;
  tournament_id: string;
  name: string;
  seed?: number;
  meta?: Record<string, unknown>;
}

export interface Match {
  id: string;
  created_at: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  stage: string;
  participant_a_id: string | null;
  participant_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
  status: 'pending' | 'active' | 'completed' | 'live';
  next_match_id: string | null;
  loser_next_match_id?: string | null;
  loser_match_id?: string | null;
  group_id?: string | null;
}

export interface Tournament {
  id: string;
  created_at: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'completed';
  format:
    | 'single_elim'
    | 'double_elim'
    | 'swiss'
    | 'groups'
    | 'round_robin'
    | 'single_elimination'
    | 'double_elimination';
  user_id: string;
  created_by: string;
  config: Record<string, unknown>;
  slug: string;
  game: string;
  is_public: boolean;
}

export interface Profile {
  id: string;
  username?: string;
  display_name?: string | null;
  email?: string;
  avatar_url?: string | null;
  updated_at?: string;
  role?: 'super_admin' | 'admin' | 'editor' | 'viewer' | null;
}
