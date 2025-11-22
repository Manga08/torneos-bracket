export type Role = 'admin' | 'editor';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  game: 'valorant' | 'fifa' | 'lol' | 'csgo' | 'other';
  format: 'single_elim' | 'double_elim' | 'swiss' | 'groups';
  config: Record<string, unknown>;
  is_public: boolean;
  status: 'draft' | 'active' | 'completed';
  created_by: string;
  created_at: string;
}

export interface Participant {
  id: string;
  tournament_id: string;
  name: string;
  seed: number | null;
  meta: Record<string, unknown>;
}

export interface Match {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  stage: string;
  participant_a_id: string | null;
  participant_b_id: string | null;
  score_a: number;
  score_b: number;
  winner_id: string | null;
  status: 'pending' | 'live' | 'completed';
  next_match_id: string | null;
  loser_match_id?: string | null;
}
