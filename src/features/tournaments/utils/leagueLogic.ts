import type { Participant, Match } from '@/types/database';

import type { LeagueConfig, LeagueMetricColumnSource } from '../types/league';

export interface LeagueRow {
  participantId: string;
  name: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  for: number;
  against: number;
  diff: number;
  rec: string; // "W-D-L"
  [key: string]: unknown; // For dynamic metrics
}

export const calculateLeagueTable = (
  participants: Participant[],
  matches: Match[],
  config?: LeagueConfig,
): LeagueRow[] => {
  // Initialize rows
  const table: Record<string, LeagueRow> = {};

  participants.forEach((p) => {
    table[p.id] = {
      participantId: p.id,
      name: p.name,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      points: 0,
      for: 0,
      against: 0,
      diff: 0,
      rec: '0-0-0',
    };
  });

  // Scoring rules
  const winPoints = config?.scoring?.win ?? 3;
  const drawPoints = config?.scoring?.draw ?? 1;
  const lossPoints = config?.scoring?.loss ?? 0;

  // Process matches
  matches.forEach((m) => {
    // Only completed matches with both participants
    if (
      m.status !== 'completed' ||
      !m.participant_a_id ||
      !m.participant_b_id ||
      m.score_a === null ||
      m.score_b === null
    ) {
      return;
    }

    const rowA = table[m.participant_a_id];
    const rowB = table[m.participant_b_id];

    if (!rowA || !rowB) return; // Should not happen if participants list is complete

    rowA.played += 1;
    rowB.played += 1;

    rowA.for += m.score_a;
    rowA.against += m.score_b;
    rowA.diff = rowA.for - rowA.against;

    rowB.for += m.score_b;
    rowB.against += m.score_a;
    rowB.diff = rowB.for - rowB.against;

    if (m.score_a > m.score_b) {
      // A wins
      rowA.won += 1;
      rowA.points += winPoints;
      rowB.lost += 1;
      rowB.points += lossPoints;
    } else if (m.score_b > m.score_a) {
      // B wins
      rowB.won += 1;
      rowB.points += winPoints;
      rowA.lost += 1;
      rowA.points += lossPoints;
    } else {
      // Draw
      rowA.draw += 1;
      rowA.points += drawPoints;
      rowB.draw += 1;
      rowB.points += drawPoints;
    }

    // --- Metrics Aggregation ---
    const metadata = (m.metadata as Record<string, unknown>) || {};
    const leagueMeta = (metadata.league as Record<string, unknown>) || {};
    const metrics = (leagueMeta.metrics as Record<string, unknown>) || {};

    if (config?.metricsSchema) {
      config.metricsSchema.forEach((metric) => {
        const metricValue = metrics[metric.id];
        if (!metricValue) return;

        if (metric.type === 'pair') {
          const pairValue = metricValue as { a: number; b: number };
          const valA = Number(pairValue.a) || 0;
          const valB = Number(pairValue.b) || 0;

          // Initialize if not exists
          if (rowA[`metric_${metric.id}_sum`] === undefined) rowA[`metric_${metric.id}_sum`] = 0;
          if (rowB[`metric_${metric.id}_sum`] === undefined) rowB[`metric_${metric.id}_sum`] = 0;
          if (rowA[`metric_${metric.id}_diff`] === undefined) rowA[`metric_${metric.id}_diff`] = 0;
          if (rowB[`metric_${metric.id}_diff`] === undefined) rowB[`metric_${metric.id}_diff`] = 0;

          // Sum
          (rowA[`metric_${metric.id}_sum`] as number) += valA;
          (rowB[`metric_${metric.id}_sum`] as number) += valB;

          // Diff (For - Against)
          (rowA[`metric_${metric.id}_diff`] as number) += valA - valB;
          (rowB[`metric_${metric.id}_diff`] as number) += valB - valA;
        }
      });
    }
  });

  // Finalize Aggregates (Avg)
  Object.values(table).forEach((row) => {
    row.rec = `${row.won}-${row.draw}-${row.lost}`;

    if (config?.metricsSchema) {
      config.metricsSchema.forEach((metric) => {
        if (metric.type === 'pair') {
          const sum = (row[`metric_${metric.id}_sum`] as number) || 0;
          const played = row.played || 1; // Avoid division by zero
          row[`metric_${metric.id}_avg`] = parseFloat((sum / played).toFixed(2));
        }
      });
    }
  });

  // Sort table
  const rows = Object.values(table);
  const tieBreakers = config?.tieBreakers || ['points', 'diff', 'for', 'name'];

  rows.sort((a, b) => {
    for (const criteria of tieBreakers) {
      let diff = 0;
      switch (criteria) {
        case 'points':
          diff = b.points - a.points; // Desc
          break;
        case 'diff':
          diff = b.diff - a.diff; // Desc
          break;
        case 'for':
          diff = b.for - a.for; // Desc
          break;
        case 'name':
          diff = a.name.localeCompare(b.name); // Asc
          break;
      }
      if (diff !== 0) return diff;
    }
    return 0;
  });

  // Map metric columns to row properties for display
  // This is done dynamically in the component, but we ensure data is available here.
  // The component will look for `metric_${metricId}_${agg}` or we can map it here if needed.
  // But since `LeagueRow` has index signature, we are good.

  return rows;
};

export const getMetricValue = (
  row: LeagueRow,
  source: LeagueMetricColumnSource,
): string | number => {
  const key = `metric_${source.metricId}_${source.agg}`;
  return (row[key] as string | number) ?? '-';
};
