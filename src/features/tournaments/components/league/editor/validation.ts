import type { MatchRow } from '@/features/tournaments/types';

export interface CanMoveMatchParams {
  movingMatchId: string;
  movingAId: string | null;
  movingBId: string | null;
  sourceRoundNumber: number;
  targetRoundNumber: number;
  allMatches: MatchRow[];
}

export interface CanMoveMatchResult {
  ok: boolean;
  reason?: string;
  conflictingMatchIds?: string[];
}

/**
 * Pure function to validate if a match can be moved to a target round.
 * Rules:
 * - Reordering within the same round is always allowed.
 * - When moving to a different round, check that neither participant A nor B
 *   already has a match in the target round (excluding the moving match itself).
 */
export function canMoveMatch(params: CanMoveMatchParams): CanMoveMatchResult {
  const {
    movingMatchId,
    movingAId,
    movingBId,
    sourceRoundNumber,
    targetRoundNumber,
    allMatches,
  } = params;

  // Reordering within the same round is always allowed
  if (sourceRoundNumber === targetRoundNumber) {
    return { ok: true };
  }

  // Get all matches in the target round, EXCLUDING the match being moved
  const targetRoundMatches = allMatches.filter(
    (m) => m.round_number === targetRoundNumber && m.id !== movingMatchId,
  );

  // Build a set of participants already playing in target round
  const participantsInTargetRound = new Set<string>();
  const participantToMatch = new Map<string, string[]>();

  for (const m of targetRoundMatches) {
    if (m.participant_a_id) {
      participantsInTargetRound.add(m.participant_a_id);
      const existing = participantToMatch.get(m.participant_a_id) || [];
      existing.push(m.id);
      participantToMatch.set(m.participant_a_id, existing);
    }
    if (m.participant_b_id) {
      participantsInTargetRound.add(m.participant_b_id);
      const existing = participantToMatch.get(m.participant_b_id) || [];
      existing.push(m.id);
      participantToMatch.set(m.participant_b_id, existing);
    }
  }

  // Check for conflicts
  const conflictingMatchIds: string[] = [];
  let reason: string | undefined;

  if (movingAId && participantsInTargetRound.has(movingAId)) {
    const matchIds = participantToMatch.get(movingAId) || [];
    conflictingMatchIds.push(...matchIds);
    reason = 'El participante A ya tiene partido en esta jornada.';
  }

  if (movingBId && participantsInTargetRound.has(movingBId)) {
    const matchIds = participantToMatch.get(movingBId) || [];
    // Avoid duplicates
    matchIds.forEach((id) => {
      if (!conflictingMatchIds.includes(id)) {
        conflictingMatchIds.push(id);
      }
    });
    if (!reason) {
      reason = 'El participante B ya tiene partido en esta jornada.';
    } else {
      reason = 'Ambos participantes ya tienen partido en esta jornada.';
    }
  }

  if (conflictingMatchIds.length > 0) {
    return { ok: false, reason, conflictingMatchIds };
  }

  return { ok: true };
}

/**
 * Get conflict info for a specific target round while dragging.
 * Used for highlighting.
 */
export function getConflictInfo(
  movingMatch: MatchRow,
  targetRoundNumber: number,
  allMatches: MatchRow[],
): CanMoveMatchResult {
  return canMoveMatch({
    movingMatchId: movingMatch.id,
    movingAId: movingMatch.participant_a_id,
    movingBId: movingMatch.participant_b_id,
    sourceRoundNumber: movingMatch.round_number,
    targetRoundNumber,
    allMatches,
  });
}

// ============================================================
// SWAP LOGIC - Fase 10.2 "Modo Inteligente"
// ============================================================

export interface SwapPlan {
  movingMatchId: string;
  movingMatchToRound: number;
  conflictingMatchId: string;
  conflictingMatchToRound: number;
}

export interface CanSwapResult {
  ok: boolean;
  reason?: string;
  swapPlan?: SwapPlan;
}

export interface CanSwapParams {
  movingMatchId: string;
  targetRoundNumber: number;
  conflictingMatchId: string;
  allMatches: MatchRow[];
}

/**
 * Find the primary conflicting match when trying to move a match to a target round.
 * Returns the first conflicting match ID, or null if no conflict.
 */
export function findPrimaryConflictingMatch(
  movingMatch: MatchRow,
  targetRoundNumber: number,
  allMatches: MatchRow[],
): string | null {
  const conflictInfo = getConflictInfo(movingMatch, targetRoundNumber, allMatches);
  if (conflictInfo.ok || !conflictInfo.conflictingMatchIds?.length) {
    return null;
  }
  // Return the first conflicting match as the "primary" candidate for swap
  return conflictInfo.conflictingMatchIds[0];
}

/**
 * Get all participant IDs from a match, filtering out nulls (BYEs).
 */
function getMatchParticipants(match: MatchRow): string[] {
  const participants: string[] = [];
  if (match.participant_a_id) participants.push(match.participant_a_id);
  if (match.participant_b_id) participants.push(match.participant_b_id);
  return participants;
}

/**
 * Check if a round would have duplicate participants after a hypothetical change.
 * Excludes specified match IDs from the check (they're being moved out).
 */
function wouldRoundHaveDuplicates(
  roundNumber: number,
  allMatches: MatchRow[],
  excludeMatchIds: string[],
  addParticipants: string[],
): { hasDuplicates: boolean; duplicateParticipant?: string } {
  // Get all participants currently in the round, excluding matches being moved
  const participantsInRound = new Set<string>();

  for (const match of allMatches) {
    if (match.round_number !== roundNumber) continue;
    if (excludeMatchIds.includes(match.id)) continue;

    if (match.participant_a_id) {
      if (participantsInRound.has(match.participant_a_id)) {
        return { hasDuplicates: true, duplicateParticipant: match.participant_a_id };
      }
      participantsInRound.add(match.participant_a_id);
    }
    if (match.participant_b_id) {
      if (participantsInRound.has(match.participant_b_id)) {
        return { hasDuplicates: true, duplicateParticipant: match.participant_b_id };
      }
      participantsInRound.add(match.participant_b_id);
    }
  }

  // Now check if adding new participants would cause duplicates
  for (const participantId of addParticipants) {
    if (participantsInRound.has(participantId)) {
      return { hasDuplicates: true, duplicateParticipant: participantId };
    }
    participantsInRound.add(participantId);
  }

  return { hasDuplicates: false };
}

/**
 * Determine if two matches can be swapped between their rounds.
 * 
 * The swap plan is:
 * - Move matchA (the one being dragged) to targetRound
 * - Move matchB (the conflicting one) to matchA's original round
 * 
 * This is valid only if, after the swap:
 * - The target round has no duplicate participants
 * - The source round (where matchB goes) has no duplicate participants
 */
export function canSwapMatches(params: CanSwapParams): CanSwapResult {
  const { movingMatchId, targetRoundNumber, conflictingMatchId, allMatches } = params;

  const movingMatch = allMatches.find((m) => m.id === movingMatchId);
  const conflictingMatch = allMatches.find((m) => m.id === conflictingMatchId);

  if (!movingMatch) {
    return { ok: false, reason: 'Partido a mover no encontrado.' };
  }

  if (!conflictingMatch) {
    return { ok: false, reason: 'Partido conflictivo no encontrado.' };
  }

  const sourceRoundNumber = movingMatch.round_number;

  // Same round - shouldn't happen, but handle it
  if (sourceRoundNumber === targetRoundNumber) {
    return { ok: false, reason: 'Los partidos están en la misma jornada.' };
  }

  // Get participants
  const movingParticipants = getMatchParticipants(movingMatch);
  const conflictingParticipants = getMatchParticipants(conflictingMatch);

  // After swap:
  // - targetRound will have: all current matches EXCEPT conflictingMatch, PLUS movingMatch
  // - sourceRound will have: all current matches EXCEPT movingMatch, PLUS conflictingMatch

  // Check target round after swap
  const targetRoundCheck = wouldRoundHaveDuplicates(
    targetRoundNumber,
    allMatches,
    [conflictingMatchId, movingMatchId], // Exclude both matches
    movingParticipants, // Add moving match participants
  );

  if (targetRoundCheck.hasDuplicates) {
    return {
      ok: false,
      reason: `El intercambio dejaría un participante duplicado en la jornada ${targetRoundNumber}.`,
    };
  }

  // Check source round after swap
  const sourceRoundCheck = wouldRoundHaveDuplicates(
    sourceRoundNumber,
    allMatches,
    [movingMatchId, conflictingMatchId], // Exclude both matches
    conflictingParticipants, // Add conflicting match participants
  );

  if (sourceRoundCheck.hasDuplicates) {
    return {
      ok: false,
      reason: `El intercambio dejaría un participante duplicado en la jornada ${sourceRoundNumber}.`,
    };
  }

  // Swap is valid!
  return {
    ok: true,
    swapPlan: {
      movingMatchId,
      movingMatchToRound: targetRoundNumber,
      conflictingMatchId,
      conflictingMatchToRound: sourceRoundNumber,
    },
  };
}

/**
 * Get detailed swap information for UI display.
 */
export interface SwapDisplayInfo {
  canSwap: boolean;
  reason?: string;
  swapPlan?: SwapPlan;
  movingMatchDisplay?: {
    participantA: string | null;
    participantB: string | null;
    fromRound: number;
    toRound: number;
  };
  conflictingMatchDisplay?: {
    participantA: string | null;
    participantB: string | null;
    fromRound: number;
    toRound: number;
  };
}

export function getSwapDisplayInfo(
  movingMatch: MatchRow,
  targetRoundNumber: number,
  allMatches: MatchRow[],
): SwapDisplayInfo {
  const conflictingMatchId = findPrimaryConflictingMatch(movingMatch, targetRoundNumber, allMatches);

  if (!conflictingMatchId) {
    return { canSwap: false, reason: 'No hay conflicto que resolver.' };
  }

  const conflictingMatch = allMatches.find((m) => m.id === conflictingMatchId);
  if (!conflictingMatch) {
    return { canSwap: false, reason: 'Partido conflictivo no encontrado.' };
  }

  const swapResult = canSwapMatches({
    movingMatchId: movingMatch.id,
    targetRoundNumber,
    conflictingMatchId,
    allMatches,
  });

  if (!swapResult.ok) {
    return { canSwap: false, reason: swapResult.reason };
  }

  return {
    canSwap: true,
    swapPlan: swapResult.swapPlan,
    movingMatchDisplay: {
      participantA: movingMatch.participant_a_id,
      participantB: movingMatch.participant_b_id,
      fromRound: movingMatch.round_number,
      toRound: targetRoundNumber,
    },
    conflictingMatchDisplay: {
      participantA: conflictingMatch.participant_a_id,
      participantB: conflictingMatch.participant_b_id,
      fromRound: conflictingMatch.round_number,
      toRound: movingMatch.round_number,
    },
  };
}
