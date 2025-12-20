export interface LeagueScoringRules {
  win: number;
  draw: number;
  loss: number;
}

export type LeagueMode = 'setup' | 'runtime' | 'public';

export type LeagueTieBreaker = 'points' | 'diff' | 'for' | 'name';

export type LeagueColumnKind = 'built_in' | 'manual' | 'metric';

export type LeagueBuiltInSource =
  | 'position'
  | 'name'
  | 'played'
  | 'won'
  | 'draw'
  | 'lost'
  | 'points'
  | 'for'
  | 'against'
  | 'diff'
  | 'rec';

export interface LeagueMetricField {
  id: string;
  label: string;
  type: 'pair' | 'single';
  aLabel?: string;
  bLabel?: string;
}

export type LeagueMetricsSchema = LeagueMetricField[];

export interface LeagueMetricColumnSource {
  metricId: string;
  agg: 'sum' | 'avg' | 'diff';
  side?: 'a' | 'b';
}

export interface LeagueColumnDefinition {
  id: string;
  label: string;
  kind: LeagueColumnKind;
  source: LeagueBuiltInSource | string | LeagueMetricColumnSource; // manual: "leagueManual.<key>"
  visible?: boolean;
  width?: number; // opcional
  align?: 'left' | 'center' | 'right';
  editable?: boolean; // For manual columns
}

export interface LeagueSnapshotMember {
  participantId: string;
  name: string;
  points: number;
  diff: number;
  for: number;
  rec?: string;
  extras?: Record<string, unknown>;
}

export interface LeagueFinalResults {
  generatedAt: string;
  top3: LeagueSnapshotMember[];
}

export interface LeagueConfig {
  scoring?: LeagueScoringRules;
  tieBreakers?: LeagueTieBreaker[];
  columns?: LeagueColumnDefinition[];
  metricsSchema?: LeagueMetricsSchema;
  finalResults?: LeagueFinalResults;
}
