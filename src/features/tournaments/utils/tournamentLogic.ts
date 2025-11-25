
import type { Match, Participant } from '../../../types/database';

export interface Standing {
  participantId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  draw: number;
  points: number;
  roundDiff: number;
  buchholz?: number; // For Swiss
}

export const calculateStandings = (participants: Participant[], matches: Match[]): Standing[] => {
  const stats: Record<string, Standing> = {};

  // Initialize
  participants.forEach(p => {
    stats[p.id] = {
      participantId: p.id,
      name: p.name,
      played: 0,
      won: 0,
      lost: 0,
      draw: 0,
      points: 0,
      roundDiff: 0,
      buchholz: 0
    };
  });

  // Calculate basic stats
  matches.forEach(match => {
    if (match.status !== 'completed') return;
    if (!match.participant_a_id || !match.participant_b_id) return;

    const pA = stats[match.participant_a_id];
    const pB = stats[match.participant_b_id];

    if (!pA || !pB) return;

    pA.played++;
    pB.played++;

    const scoreA = match.score_a ?? 0;
    const scoreB = match.score_b ?? 0;

    pA.roundDiff += (scoreA - scoreB);
    pB.roundDiff += (scoreB - scoreA);

    if (scoreA > scoreB) {
      pA.won++;
      pA.points += 3;
      pB.lost++;
    } else if (scoreB > scoreA) {
      pB.won++;
      pB.points += 3;
      pA.lost++;
    } else {
      pA.draw++;
      pB.draw++;
      pA.points += 1;
      pB.points += 1;
    }
  });

  // Calculate Buchholz (Sum of opponents' points) - Only relevant for Swiss usually, but harmless here
  // We need a second pass
  matches.forEach(match => {
    if (match.status !== 'completed') return;
    if (!match.participant_a_id || !match.participant_b_id) return;

    const pA = stats[match.participant_a_id];
    const pB = stats[match.participant_b_id];

    if (pA && pB) {
      // In a real Buchholz, we sum the TOTAL points of opponents.
      // Since we have the final points now (after first pass), we can add them.
      // Note: This is a simplified Buchholz.
      pA.buchholz = (pA.buchholz || 0) + pB.points;
      pB.buchholz = (pB.buchholz || 0) + pA.points;
    }
  });

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if ((b.buchholz || 0) !== (a.buchholz || 0)) return (b.buchholz || 0) - (a.buchholz || 0);
    return b.roundDiff - a.roundDiff;
  });
};

export const pairSwissRound = (
  participants: Participant[],
  allMatches: Match[],
  roundNumber: number
): { matchId: string, participantA: string, participantB: string }[] => {
  // 1. Get standings based on all previous matches
  const standings = calculateStandings(participants, allMatches);

  // 2. Filter out participants who already have a match in this round (if any - usually none when generating)
  // But actually we are generating pairings for a specific round.

  // 3. Pairing Logic (Simplified Dutch System)
  // - Sort by points
  // - Pair 1 vs 2, 3 vs 4...
  // - Check if they already played. If yes, swap with next.

  const pairings: { matchId: string, participantA: string, participantB: string }[] = [];

  // Helper to check if they played
  const hasPlayed = (p1Id: string, p2Id: string) => {
    return allMatches.some(m =>
      (m.participant_a_id === p1Id && m.participant_b_id === p2Id) ||
      (m.participant_a_id === p2Id && m.participant_b_id === p1Id)
    );
  };

  // We need to find the matches for this round to get their IDs
  const roundMatches = allMatches.filter(m => m.round_number === roundNumber);
  if (roundMatches.length === 0) return [];

  let matchIndex = 0;

  // Deep copy standings to manipulate list
  const pool = [...standings];

  while (pool.length >= 2 && matchIndex < roundMatches.length) {
    const p1 = pool.shift()!;

    // Find best opponent
    let opponentIndex = 0;
    let p2 = pool[opponentIndex];

    // Try to find someone they haven't played
    // Simple lookahead
    while (opponentIndex < pool.length) {
      p2 = pool[opponentIndex];
      if (!hasPlayed(p1.participantId, p2.participantId)) {
        break;
      }
      opponentIndex++;
    }

    // If we couldn't find a valid opponent, we just take the first one (fallback)
    // In a real system we would backtrack, but for this MVP we force pairing.
    if (opponentIndex >= pool.length) {
      opponentIndex = 0; // Reset to first available
      p2 = pool[0];
    }

    // Remove p2 from pool
    pool.splice(opponentIndex, 1);

    pairings.push({
      matchId: roundMatches[matchIndex].id,
      participantA: p1.participantId,
      participantB: p2.participantId
    });

    matchIndex++;
  }

  // Handle Bye if odd number (last one left) - Not handled here as matches are pre-generated even/odd

  return pairings;
};
