import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Participant, Match } from '@/types/database';

import { BracketView } from './BracketView';

// Mock Supabase
vi.mock('../../../../shared/api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('BracketView', () => {
  const participants: Participant[] = [
    { id: 'p1', name: 'Player 1', tournament_id: 't1', created_at: '', seed: 1 },
    { id: 'p2', name: 'Player 2', tournament_id: 't1', created_at: '', seed: 2 },
  ];

  const matches: Match[] = [
    {
      id: 'm1',
      tournament_id: 't1',
      round_number: 1,
      match_number: 1,
      stage: 'main',
      participant_a_id: 'p1',
      participant_b_id: 'p2',
      score_a: 0,
      score_b: 0,
      winner_id: null,
      status: 'pending',
      created_at: '',
      next_match_id: null,
    },
  ];

  it('renders bracket with matches', () => {
    render(
      <BracketView
        tournamentId="t1"
        participants={participants}
        matches={matches}
        isDraft={false}
      />,
    );

    // Check for participants
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();

    // Check for round label
    expect(screen.getByText(/Ronda 1/i)).toBeInTheDocument();
  });
});
