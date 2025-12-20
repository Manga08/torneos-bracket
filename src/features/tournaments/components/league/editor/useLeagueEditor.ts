import { useState, useEffect, useCallback, useMemo } from 'react';

import { canMoveMatch, getConflictInfo, canSwapMatches, type CanMoveMatchResult, type SwapPlan } from './validation';

import type { MatchRow, ParticipantRow } from '@/features/tournaments/types';

export interface LeagueRound {
  roundNumber: number;
  matches: MatchRow[];
}

export interface MoveResult {
  success: boolean;
  error?: string;
}

export const useLeagueEditor = (initialMatches: MatchRow[], _participants: ParticipantRow[]) => {
  const [matches, setMatches] = useState<MatchRow[]>(() => {
    // Initialize with sorted matches
    return [...initialMatches].sort((a, b) => {
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return a.match_number - b.match_number;
    });
  });
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [hoverRoundNumber, setHoverRoundNumber] = useState<number | null>(null);

  // Re-sync when initialMatches change (modal reopened with new data)
  useEffect(() => {
    const sorted = [...initialMatches].sort((a, b) => {
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return a.match_number - b.match_number;
    });
    // Only update if actually different to avoid infinite loops
    const isSame =
      matches.length === sorted.length &&
      matches.every((m, i) => m.id === sorted[i].id && m.round_number === sorted[i].round_number);
    if (!isSame) {
      setMatches(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMatches]);

  // Compute rounds from matches (derived state, use useMemo instead of useEffect)
  const rounds = useMemo(() => {
    const grouped = new Map<number, MatchRow[]>();

    matches.forEach((match) => {
      const r = match.round_number;
      if (!grouped.has(r)) grouped.set(r, []);
      grouped.get(r)?.push(match);
    });

    return Array.from(grouped.entries())
      .map(([roundNumber, roundMatches]) => ({
        roundNumber,
        matches: roundMatches.sort((a, b) => a.match_number - b.match_number),
      }))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }, [matches]);

  // Check if there are unsaved changes
  const isDirty = useMemo(() => {
    if (matches.length !== initialMatches.length) return true;
    return matches.some((m) => {
      const initial = initialMatches.find((im) => im.id === m.id);
      if (!initial) return true;
      return (
        initial.round_number !== m.round_number || initial.match_number !== m.match_number
      );
    });
  }, [matches, initialMatches]);

  // Get conflict info for a specific match being dragged to a target round
  const getConflictForRound = useCallback(
    (draggedMatchId: string | null, targetRoundNumber: number): CanMoveMatchResult => {
      if (!draggedMatchId) return { ok: true };

      const draggedMatch = matches.find((m) => m.id === draggedMatchId);
      if (!draggedMatch) return { ok: true };

      // Calculate conflict directly for consistency
      return getConflictInfo(draggedMatch, targetRoundNumber, matches);
    },
    [matches],
  );

  // Current conflict info for the hovered round
  const currentConflict = useMemo(() => {
    if (!activeMatchId || hoverRoundNumber === null) return null;
    const result = getConflictForRound(activeMatchId, hoverRoundNumber);
    if (!result.ok) return result;
    return null;
  }, [activeMatchId, hoverRoundNumber, getConflictForRound]);

  const clearError = useCallback(() => {
    setInlineError(null);
  }, []);

  const setDragState = useCallback((matchId: string | null, roundNumber: number | null) => {
    setActiveMatchId(matchId);
    setHoverRoundNumber(roundNumber);
    if (matchId === null) {
      setInlineError(null);
    }
  }, []);

  const moveMatch = useCallback(
    (matchId: string, targetRoundNumber: number, newIndex: number): MoveResult => {
      const matchIndex = matches.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return { success: false, error: 'Partido no encontrado' };

      const match = matches[matchIndex];

      // Validate move using pure function
      const validation = canMoveMatch({
        movingMatchId: match.id,
        movingAId: match.participant_a_id,
        movingBId: match.participant_b_id,
        sourceRoundNumber: match.round_number,
        targetRoundNumber,
        allMatches: matches,
      });

      if (!validation.ok) {
        setInlineError(validation.reason || 'No se puede mover el partido aquí.');
        return { success: false, error: validation.reason };
      }

      // Clear any previous error
      setInlineError(null);

      // Perform the move
      setMatches((prev) => {
        const newMatches = prev.filter((m) => m.id !== matchId);
        const updatedMatch = { ...match, round_number: targetRoundNumber };

        // Get matches in target round (excluding the one we're moving)
        const targetRoundMatches = newMatches.filter(
          (m) => m.round_number === targetRoundNumber,
        );

        // Insert at the correct position
        const clampedIndex = Math.min(newIndex, targetRoundMatches.length);
        if (clampedIndex >= targetRoundMatches.length) {
          newMatches.push(updatedMatch);
        } else {
          const matchAtPos = targetRoundMatches[clampedIndex];
          const insertPos = newMatches.indexOf(matchAtPos);
          newMatches.splice(insertPos, 0, updatedMatch);
        }

        // Re-assign match_numbers for each round
        const byRound = new Map<number, MatchRow[]>();
        newMatches.forEach((m) => {
          if (!byRound.has(m.round_number)) byRound.set(m.round_number, []);
          byRound.get(m.round_number)?.push(m);
        });

        // Preserve the order in the array for each round and assign match_numbers
        const finalMatches: MatchRow[] = [];
        const allRounds = new Set(newMatches.map((m) => m.round_number));
        allRounds.add(targetRoundNumber);

        Array.from(allRounds)
          .sort((a, b) => a - b)
          .forEach((r) => {
            const roundMatches = newMatches.filter((m) => m.round_number === r);
            roundMatches.forEach((m, idx) => {
              m.match_number = idx + 1;
            });
            finalMatches.push(...roundMatches);
          });

        return finalMatches;
      });

      return { success: true };
    },
    [matches],
  );

  /**
   * Swap two matches between their rounds.
   * This is used when "Modo inteligente" is enabled to resolve conflicts.
   */
  const swapMatches = useCallback(
    (swapPlan: SwapPlan): MoveResult => {
      const { movingMatchId, movingMatchToRound, conflictingMatchId, conflictingMatchToRound } = swapPlan;

      const movingMatch = matches.find((m) => m.id === movingMatchId);
      const conflictingMatch = matches.find((m) => m.id === conflictingMatchId);

      if (!movingMatch || !conflictingMatch) {
        return { success: false, error: 'Partidos no encontrados para el intercambio.' };
      }

      // Validate swap is still valid
      const swapValidation = canSwapMatches({
        movingMatchId,
        targetRoundNumber: movingMatchToRound,
        conflictingMatchId,
        allMatches: matches,
      });

      if (!swapValidation.ok) {
        setInlineError(swapValidation.reason || 'El intercambio no es válido.');
        return { success: false, error: swapValidation.reason };
      }

      // Clear any previous error
      setInlineError(null);

      // Perform the swap
      setMatches((prev) => {
        const newMatches = prev.map((m) => {
          if (m.id === movingMatchId) {
            return { ...m, round_number: movingMatchToRound };
          }
          if (m.id === conflictingMatchId) {
            return { ...m, round_number: conflictingMatchToRound };
          }
          return m;
        });

        // Re-assign match_numbers for affected rounds
        const affectedRounds = new Set([movingMatchToRound, conflictingMatchToRound]);

        affectedRounds.forEach((roundNum) => {
          const roundMatches = newMatches.filter((m) => m.round_number === roundNum);
          roundMatches.forEach((m, idx) => {
            m.match_number = idx + 1;
          });
        });

        return newMatches;
      });

      return { success: true };
    },
    [matches],
  );

  return {
    matches,
    rounds,
    moveMatch,
    swapMatches,
    isDirty,
    inlineError,
    clearError,
    setDragState,
    activeMatchId,
    hoverRoundNumber,
    currentConflict,
  };
};
