export type TournamentStatus = 'draft' | 'active' | 'completed';

export type TournamentFormat =
  | 'single_elim'
  | 'double_elim'
  | 'swiss'
  | 'groups'
  | 'round_robin'
  | 'single_elimination'
  | 'double_elimination'
  | 'league';

export interface TournamentConfig {
  original_format?: string;
  participants_count?: number;
  has_third_place?: boolean;
  logo_url?: string;
  theme?: string;
  [key: string]: unknown;
}
