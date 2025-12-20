import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useLeagueEditor } from './useLeagueEditor';
import { canMoveMatch } from './validation';

import type { MatchRow, ParticipantRow } from '@/features/tournaments/types';


const mockParticipants: ParticipantRow[] = [
  { id: 'p1', name: 'Team 1', tournament_id: 't1', seed: 1, created_at: '' },
  { id: 'p2', name: 'Team 2', tournament_id: 't1', seed: 2, created_at: '' },
  { id: 'p3', name: 'Team 3', tournament_id: 't1', seed: 3, created_at: '' },
  { id: 'p4', name: 'Team 4', tournament_id: 't1', seed: 4, created_at: '' },
];

const mockMatches: MatchRow[] = [
  {
    id: 'm1',
    tournament_id: 't1',
    round_number: 1,
    match_number: 1,
    participant_a_id: 'p1',
    participant_b_id: 'p2',
    status: 'pending',
    stage: 'league',
    created_at: '',
    score_a: 0,
    score_b: 0,
    winner_id: null,
    next_match_id: null,
    loser_match_id: null,
    metadata: {},
  },
  {
    id: 'm2',
    tournament_id: 't1',
    round_number: 1,
    match_number: 2,
    participant_a_id: 'p3',
    participant_b_id: 'p4',
    status: 'pending',
    stage: 'league',
    created_at: '',
    score_a: 0,
    score_b: 0,
    winner_id: null,
    next_match_id: null,
    loser_match_id: null,
    metadata: {},
  },
  {
    id: 'm3',
    tournament_id: 't1',
    round_number: 2,
    match_number: 1,
    participant_a_id: 'p1',
    participant_b_id: 'p3',
    status: 'pending',
    stage: 'league',
    created_at: '',
    score_a: 0,
    score_b: 0,
    winner_id: null,
    next_match_id: null,
    loser_match_id: null,
    metadata: {},
  },
];

describe('useLeagueEditor', () => {
  it('should group matches by round', () => {
    const { result } = renderHook(() => useLeagueEditor(mockMatches, mockParticipants));

    expect(result.current.rounds).toHaveLength(2);
    expect(result.current.rounds[0].roundNumber).toBe(1);
    expect(result.current.rounds[0].matches).toHaveLength(2);
    expect(result.current.rounds[1].roundNumber).toBe(2);
    expect(result.current.rounds[1].matches).toHaveLength(1);
  });

  it('should allow move to empty round', () => {
    const { result } = renderHook(() => useLeagueEditor(mockMatches, mockParticipants));

    // Move m1 to round 3 (new round)
    act(() => {
      result.current.moveMatch('m1', 3, 0);
    });

    const updatedM1 = result.current.matches.find((m) => m.id === 'm1');
    expect(updatedM1?.round_number).toBe(3);

    // Check rounds
    expect(result.current.rounds).toHaveLength(3); // 1, 2, 3
    const round3 = result.current.rounds.find((r) => r.roundNumber === 3);
    expect(round3?.matches).toHaveLength(1);
  });

  it('should track isDirty correctly', () => {
    const { result } = renderHook(() => useLeagueEditor(mockMatches, mockParticipants));

    // Initially not dirty
    expect(result.current.isDirty).toBe(false);

    // Move a match
    act(() => {
      result.current.moveMatch('m1', 3, 0);
    });

    // Now should be dirty
    expect(result.current.isDirty).toBe(true);
  });
});

describe('canMoveMatch validation', () => {
  it('should prevent duplicate participant in round', () => {
    // Try to move m3 (p1 vs p3) to round 1
    // Round 1 already has m1 (p1 vs p2) and m2 (p3 vs p4)
    // So p1 is busy in m1, and p3 is busy in m2.
    // Should fail.

    const m3 = mockMatches.find((m) => m.id === 'm3')!;
    const validation = canMoveMatch({
      movingMatchId: m3.id,
      movingAId: m3.participant_a_id,
      movingBId: m3.participant_b_id,
      sourceRoundNumber: m3.round_number,
      targetRoundNumber: 1,
      allMatches: mockMatches,
    });

    expect(validation.ok).toBe(false);
    expect(validation.reason).toMatch(/participante .* ya juega/i);
  });

  it('should prevent move when target round has conflicting participant', () => {
    // Move m2 (p3 vs p4) to round 2
    // Round 2 has m3 (p1 vs p3).
    // p3 is in m3. So moving m2 (which has p3) to round 2 should FAIL because p3 is already playing in round 2.

    const m2 = mockMatches.find((m) => m.id === 'm2')!;
    const validation = canMoveMatch({
      movingMatchId: m2.id,
      movingAId: m2.participant_a_id,
      movingBId: m2.participant_b_id,
      sourceRoundNumber: m2.round_number,
      targetRoundNumber: 2,
      allMatches: mockMatches,
    });

    expect(validation.ok).toBe(false);
  });

  it('should allow move when no conflict', () => {
    // Move m1 (p1 vs p2) to round 3 (empty round)
    const m1 = mockMatches.find((m) => m.id === 'm1')!;
    const validation = canMoveMatch({
      movingMatchId: m1.id,
      movingAId: m1.participant_a_id,
      movingBId: m1.participant_b_id,
      sourceRoundNumber: m1.round_number,
      targetRoundNumber: 3,
      allMatches: mockMatches,
    });

    expect(validation.ok).toBe(true);
  });

  it('should allow move to same round (reordering)', () => {
    // Move m1 within round 1 (same round)
    const m1 = mockMatches.find((m) => m.id === 'm1')!;
    const validation = canMoveMatch({
      movingMatchId: m1.id,
      movingAId: m1.participant_a_id,
      movingBId: m1.participant_b_id,
      sourceRoundNumber: m1.round_number,
      targetRoundNumber: 1, // same round
      allMatches: mockMatches,
    });

    expect(validation.ok).toBe(true);
  });

  it('should return conflicting match ids when conflict detected', () => {
    const m3 = mockMatches.find((m) => m.id === 'm3')!;
    const validation = canMoveMatch({
      movingMatchId: m3.id,
      movingAId: m3.participant_a_id,
      movingBId: m3.participant_b_id,
      sourceRoundNumber: m3.round_number,
      targetRoundNumber: 1,
      allMatches: mockMatches,
    });

    expect(validation.ok).toBe(false);
    expect(validation.conflictingMatchIds).toBeDefined();
    // m1 has p1, m2 has p3, both conflict with m3 (p1 vs p3)
    expect(validation.conflictingMatchIds).toContain('m1');
    expect(validation.conflictingMatchIds).toContain('m2');
  });
});
