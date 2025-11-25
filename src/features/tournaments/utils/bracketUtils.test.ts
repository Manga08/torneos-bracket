import { describe, it, expect } from 'vitest';
import { generateSingleEliminationMatches } from './bracketUtils';
import type { Participant } from '../../../types/database';

describe('bracketUtils', () => {
  const createParticipants = (count: number): Participant[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Participant ${i + 1}`,
      tournament_id: 'test-tournament',
      created_at: new Date().toISOString(),
      seed: i + 1
    }));
  };

  describe('generateSingleEliminationMatches', () => {
    it('should generate correct bracket for 8 participants (power of 2)', () => {
      const participants = createParticipants(8);
      const matches = generateSingleEliminationMatches('test-tournament', participants);

      // 8 participants -> 7 matches total (4 QF + 2 SF + 1 F)
      expect(matches).toHaveLength(7);

      // Round 1 (Quarterfinals) should have 4 matches
      const round1 = matches.filter(m => m.round_number === 1);
      expect(round1).toHaveLength(4);

      // Check seeds for Round 1
      // Match 1: Seed 1 vs Seed 8 (if standard seeding)
      // The implementation sorts participants by seed and fills slots.
      // Slot A: index 0 (Seed 1), Slot B: index 1 (Seed 2) -> Wait, let's check logic.
      // Logic in file:
      // sortedParticipants.forEach((participant, index) => {
      //   const matchIndex = Math.floor(index / 2);
      //   ...
      // });
      // This means Match 1 gets P1 and P2. Match 2 gets P3 and P4.
      // This is NOT standard seeding (1vs8, 2vs7), but it IS the current logic.
      // I must test the CURRENT logic as per instructions "No cambies la lógica de negocio".

      const match1 = round1.find(m => m.match_number === 1);
      expect(match1?.participant_a_id).toBe('p-1');
      expect(match1?.participant_b_id).toBe('p-2');
    });

    it('should handle non-power of 2 participants (e.g., 6)', () => {
      const participants = createParticipants(6);
      const matches = generateSingleEliminationMatches('test-tournament', participants);

      // 6 participants -> Next power of 2 is 8.
      // Total rounds = 3.
      // Matches generated: 4 (R1) + 2 (R2) + 1 (R3) = 7 matches structure.
      expect(matches).toHaveLength(7);

      const round1 = matches.filter(m => m.round_number === 1);
      expect(round1).toHaveLength(4);

      // With 6 participants:
      // Match 1: P1 vs P2
      // Match 2: P3 vs P4
      // Match 3: P5 vs P6
      // Match 4: Empty vs Empty (or similar) -> Wait, logic says:
      // sortedParticipants loop fills matches.
      // P1->M1-A, P2->M1-B
      // P3->M2-A, P4->M2-B
      // P5->M3-A, P6->M3-B
      // M4 is empty.

      // BYE handling logic:
      // "Si un partido de ronda 1 tiene solo un participante, ese participante pasa automáticamente"
      // In this case, M4 has NO participants.
      // M3 has two.
      // So no auto-wins in R1 for P1..P6.
      // Wait, if we have 6, we usually want Byes for top seeds.
      // But current logic fills sequentially.
      // So M4 is empty.

      const match3 = round1.find(m => m.match_number === 3);
      expect(match3?.participant_a_id).toBe('p-5');
      expect(match3?.participant_b_id).toBe('p-6');

      const match4 = round1.find(m => m.match_number === 4);
      expect(match4?.participant_a_id).toBeNull();
      expect(match4?.participant_b_id).toBeNull();
    });

    it('should generate third place match if requested', () => {
      const participants = createParticipants(4);
      const matches = generateSingleEliminationMatches('test-tournament', participants, true);

      // 4 participants -> 2 SF + 1 F = 3 matches standard.
      // + 1 Third Place match = 4 matches total.
      expect(matches).toHaveLength(4);

      const thirdPlaceMatch = matches.find(m => m.stage === 'bronze');
      expect(thirdPlaceMatch).toBeDefined();
      expect(thirdPlaceMatch?.round_number).toBe(2); // Same level as final
    });
  });
});
