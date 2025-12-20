import { describe, it, expect } from 'vitest';

import type { Match, Participant } from '@/types/database';

import { calculateLeagueTable } from './leagueLogic';

describe('calculateLeagueTable', () => {
  const participants: Participant[] = [
    { id: 'p1', name: 'Team A', tournament_id: 't1', created_at: '' },
    { id: 'p2', name: 'Team B', tournament_id: 't1', created_at: '' },
    { id: 'p3', name: 'Team C', tournament_id: 't1', created_at: '' },
  ];

  it('should return empty stats for no matches', () => {
    const table = calculateLeagueTable(participants, []);
    expect(table).toHaveLength(3);
    expect(table[0].played).toBe(0);
    expect(table[0].points).toBe(0);
  });

  it('should calculate points correctly for wins/draws/losses', () => {
    const matches: Match[] = [
      {
        id: 'm1',
        tournament_id: 't1',
        participant_a_id: 'p1',
        participant_b_id: 'p2',
        score_a: 2,
        score_b: 1,
        status: 'completed',
        match_number: 1,
        round_number: 1,
        created_at: '',
        stage: 'league',
        next_match_id: null,
        winner_id: 'p1',
      }, // p1 wins
      {
        id: 'm2',
        tournament_id: 't1',
        participant_a_id: 'p2',
        participant_b_id: 'p3',
        score_a: 1,
        score_b: 1,
        status: 'completed',
        match_number: 2,
        round_number: 1,
        created_at: '',
        stage: 'league',
        next_match_id: null,
        winner_id: null,
      }, // draw
    ];

    const table = calculateLeagueTable(participants, matches);
    const p1 = table.find((r) => r.participantId === 'p1');
    const p2 = table.find((r) => r.participantId === 'p2');
    const p3 = table.find((r) => r.participantId === 'p3');

    expect(p1?.points).toBe(3); // 1 win
    expect(p1?.won).toBe(1);
    expect(p1?.rec).toBe('1-0-0');

    expect(p2?.points).toBe(1); // 1 loss, 1 draw
    expect(p2?.won).toBe(0);
    expect(p2?.draw).toBe(1);
    expect(p2?.lost).toBe(1);
    expect(p2?.rec).toBe('0-1-1');

    expect(p3?.points).toBe(1); // 1 draw
    expect(p3?.draw).toBe(1);
  });

  it('should sort by points desc, then diff desc', () => {
    const matches: Match[] = [
      // p1 vs p2: p1 wins big (3-0)
      {
        id: 'm1',
        tournament_id: 't1',
        participant_a_id: 'p1',
        participant_b_id: 'p2',
        score_a: 3,
        score_b: 0,
        status: 'completed',
        match_number: 1,
        round_number: 1,
        created_at: '',
        stage: 'league',
        next_match_id: null,
        winner_id: 'p1',
      },
      // p3 vs p2: p3 wins small (1-0)
      {
        id: 'm2',
        tournament_id: 't1',
        participant_a_id: 'p3',
        participant_b_id: 'p2',
        score_a: 1,
        score_b: 0,
        status: 'completed',
        match_number: 2,
        round_number: 1,
        created_at: '',
        stage: 'league',
        next_match_id: null,
        winner_id: 'p3',
      },
    ];

    // p1: 3 pts, diff +3
    // p3: 3 pts, diff +1
    // p2: 0 pts, diff -4

    const table = calculateLeagueTable(participants, matches);
    expect(table[0].participantId).toBe('p1');
    expect(table[1].participantId).toBe('p3');
    expect(table[2].participantId).toBe('p2');
  });
});
