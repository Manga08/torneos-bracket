import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  MeasuringStrategy,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Save, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { SortableMatchCard } from './SortableMatchCard';
import { SortableRoundColumn } from './SortableRoundColumn';
import { useLeagueEditor } from './useLeagueEditor';
import { 
  getConflictInfo, 
  findPrimaryConflictingMatch, 
  canSwapMatches,
  type SwapPlan,
} from './validation';

import type { ThemeId } from '@/features/themes/types/themeTypes';
import { updateLeagueSchedule } from '@/features/tournaments/api/matches.api';
import type { MatchRow, ParticipantRow } from '@/features/tournaments/types';
import { AppButton } from '@/shared/components/ui/AppButton';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';

interface LeagueScheduleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  matches: MatchRow[];
  participants: ParticipantRow[];
  theme?: string;
  onSaveSuccess?: () => void;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.3',
      },
    },
  }),
  duration: 400,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

export const LeagueScheduleEditorModal = ({
  isOpen,
  onClose,
  tournamentId: _tournamentId,
  matches: initialMatches,
  participants,
  theme,
  onSaveSuccess,
}: LeagueScheduleEditorModalProps) => {
  const {
    matches,
    rounds,
    moveMatch,
    swapMatches,
    isDirty,
    inlineError,
    clearError,
    setDragState,
  } = useLeagueEditor(initialMatches, participants);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Smart mode state
  const [smartModeEnabled, setSmartModeEnabled] = useState(false);
  
  // Swap dialog state
  const [pendingSwap, setPendingSwap] = useState<{
    swapPlan: SwapPlan;
    movingMatchDisplay: { nameA: string; nameB: string; fromRound: number; toRound: number };
    conflictingMatchDisplay: { nameA: string; nameB: string; fromRound: number; toRound: number };
  } | null>(null);

  // Helper to get participant name by ID
  const getParticipantName = useCallback((id: string | null): string => {
    if (!id) return 'BYE';
    const p = participants.find((p) => p.id === id);
    return p?.name || 'Desconocido';
  }, [participants]);

  // Calculate conflicts for all rounds based on the currently dragged match
  // Also calculate swap candidates when smart mode is enabled
  const { conflictsByRound, swapCandidateByRound } = useMemo(() => {
    const conflicts = new Map<number, { ok: boolean; conflictingMatchIds?: string[] }>();
    const swapCandidates = new Map<number, string | null>();
    
    if (!activeId) return { conflictsByRound: conflicts, swapCandidateByRound: swapCandidates };
    
    const activeMatch = matches.find((m) => m.id === activeId);
    if (!activeMatch) return { conflictsByRound: conflicts, swapCandidateByRound: swapCandidates };
    
    // Calculate conflict for each round
    for (const round of rounds) {
      const conflict = getConflictInfo(activeMatch, round.roundNumber, matches);
      conflicts.set(round.roundNumber, conflict);
      
      // If smart mode and there's a conflict, find swap candidate
      if (smartModeEnabled && !conflict.ok) {
        const candidateId = findPrimaryConflictingMatch(activeMatch, round.roundNumber, matches);
        if (candidateId) {
          // Check if swap would be valid
          const swapCheck = canSwapMatches({
            movingMatchId: activeMatch.id,
            targetRoundNumber: round.roundNumber,
            conflictingMatchId: candidateId,
            allMatches: matches,
          });
          swapCandidates.set(round.roundNumber, swapCheck.ok ? candidateId : null);
        }
      }
    }
    
    return { conflictsByRound: conflicts, swapCandidateByRound: swapCandidates };
  }, [activeId, matches, rounds, smartModeEnabled]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Measuring configuration for smooth drag experience
  const measuringConfig = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  if (!isOpen) return null;

  const handleDragStart = (event: DragStartEvent) => {
    const matchId = event.active.id as string;
    setActiveId(matchId);
    setDragState(matchId, null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDragState(activeId, null);
      return;
    }

    const overId = over.id as string;
    let roundNumber: number | null = null;

    if (overId.startsWith('round-')) {
      roundNumber = parseInt(overId.replace('round-', ''), 10);
    } else {
      const overMatch = matches.find((m) => m.id === overId);
      if (overMatch) {
        roundNumber = overMatch.round_number;
      }
    }

    setDragState(activeId, roundNumber);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragState(null, null);
    clearError();

    if (!over) return;

    const activeMatchId = active.id as string;
    const overId = over.id as string;
    const activeMatch = matches.find((m) => m.id === activeMatchId);
    
    if (!activeMatch) return;

    // Find target round
    let targetRoundNumber: number | undefined;
    let targetIndex: number = 0;

    if (overId.startsWith('round-')) {
      targetRoundNumber = parseInt(overId.replace('round-', ''), 10);
      const round = rounds.find((r) => r.roundNumber === targetRoundNumber);
      targetIndex = round ? round.matches.length : 0;
    } else {
      // Dropped on another match
      const overMatch = matches.find((m) => m.id === overId);
      if (overMatch) {
        targetRoundNumber = overMatch.round_number;
        const round = rounds.find((r) => r.roundNumber === targetRoundNumber);
        if (round) {
          const idx = round.matches.findIndex((m) => m.id === overId);
          targetIndex = idx;
        }
      }
    }

    if (targetRoundNumber === undefined) return;
    
    // Check if this is a same-round reorder (always allowed)
    if (activeMatch.round_number === targetRoundNumber) {
      const result = moveMatch(activeMatchId, targetRoundNumber, targetIndex);
      if (!result.success && result.error) {
        toast.error(result.error);
      }
      return;
    }

    // Check for conflicts
    const conflict = getConflictInfo(activeMatch, targetRoundNumber, matches);
    
    if (conflict.ok) {
      // No conflict, just move
      const result = moveMatch(activeMatchId, targetRoundNumber, targetIndex);
      if (!result.success && result.error) {
        toast.error(result.error);
      }
      return;
    }
    
    // There's a conflict
    if (!smartModeEnabled) {
      // Smart mode OFF - show error as usual
      toast.error(conflict.reason || 'No se puede mover el partido aquí.');
      return;
    }
    
    // Smart mode ON - try to propose a swap
    const conflictingMatchId = findPrimaryConflictingMatch(activeMatch, targetRoundNumber, matches);
    
    if (!conflictingMatchId) {
      toast.error(conflict.reason || 'No se puede mover el partido aquí.');
      return;
    }
    
    const conflictingMatch = matches.find((m) => m.id === conflictingMatchId);
    if (!conflictingMatch) {
      toast.error('Error al identificar el partido conflictivo.');
      return;
    }
    
    // Check if swap is possible
    const swapCheck = canSwapMatches({
      movingMatchId: activeMatchId,
      targetRoundNumber,
      conflictingMatchId,
      allMatches: matches,
    });
    
    if (!swapCheck.ok || !swapCheck.swapPlan) {
      toast.error(swapCheck.reason || 'No es posible intercambiar los partidos.');
      return;
    }
    
    // Show confirmation dialog for swap
    setPendingSwap({
      swapPlan: swapCheck.swapPlan,
      movingMatchDisplay: {
        nameA: getParticipantName(activeMatch.participant_a_id),
        nameB: getParticipantName(activeMatch.participant_b_id),
        fromRound: activeMatch.round_number,
        toRound: targetRoundNumber,
      },
      conflictingMatchDisplay: {
        nameA: getParticipantName(conflictingMatch.participant_a_id),
        nameB: getParticipantName(conflictingMatch.participant_b_id),
        fromRound: conflictingMatch.round_number,
        toRound: activeMatch.round_number,
      },
    });
  };
  
  // Handle swap confirmation
  const handleConfirmSwap = () => {
    if (!pendingSwap) return;
    
    const result = swapMatches(pendingSwap.swapPlan);
    if (result.success) {
      toast.success('Partidos intercambiados correctamente');
    } else {
      toast.error(result.error || 'Error al intercambiar los partidos');
    }
    
    setPendingSwap(null);
  };
  
  const handleCancelSwap = () => {
    setPendingSwap(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare updates
      // We need to send updates for ALL matches that changed round or match_number
      // But to be safe and simple, we can send updates for ALL matches, or diff them.
      // Let's diff against initialMatches.

      const updates = matches
        .filter((m) => {
          const initial = initialMatches.find((im) => im.id === m.id);
          if (!initial) return true; // Should not happen
          return initial.round_number !== m.round_number || initial.match_number !== m.match_number;
        })
        .map((m) => ({
          matchId: m.id,
          roundNumber: m.round_number,
          matchNumber: m.match_number,
        }));

      if (updates.length === 0) {
        toast.info('No hay cambios para guardar');
        onClose();
        return;
      }

      await updateLeagueSchedule(updates);
      toast.success('Calendario actualizado');
      onSaveSuccess?.();
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast.error('Error al guardar el calendario');
    } finally {
      setSaving(false);
    }
  };

  const activeMatch = activeId ? matches.find((m) => m.id === activeId) : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface-dark w-full max-w-[95vw] h-[90vh] rounded-xl border border-border flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Editor de Calendario
              <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                BETA
              </span>
              {isDirty && (
                <span className="text-xs font-normal text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  Sin guardar
                </span>
              )}
            </h2>
            <p className="text-sm text-text-muted">
              Arrastra los partidos para reorganizar las jornadas.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Smart Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={smartModeEnabled}
                  onChange={(e) => setSmartModeEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  w-10 h-5 rounded-full transition-colors duration-300
                  ${smartModeEnabled ? 'bg-primary' : 'bg-surface-dark border border-border'}
                `}>
                  <div className={`
                    w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-all duration-300
                    ${smartModeEnabled ? 'left-5' : 'left-0.5'}
                  `} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className={smartModeEnabled ? 'text-primary' : 'text-text-muted'} />
                <span className={`text-sm ${smartModeEnabled ? 'text-white' : 'text-text-muted'}`}>
                  Modo inteligente
                </span>
              </div>
            </label>
            
            <div className="hidden lg:flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded border border-yellow-500/20">
              <AlertTriangle size={14} />
              <span>Regenerar borrará cambios manuales</span>
            </div>
            <AppButton variant="ghost" onClick={onClose} disabled={saving} theme={theme}>
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              onClick={handleSave}
              disabled={saving || !isDirty}
              theme={theme}
              leftIcon={
                saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />
              }
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </AppButton>
          </div>
        </div>

        {/* Inline error banner */}
        {inlineError && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={16} />
            <span>{inlineError}</span>
          </div>
        )}

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#0f1219]">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            measuring={measuringConfig}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full min-w-max">
              {rounds.map((round) => {
                const conflict = conflictsByRound.get(round.roundNumber) ?? { ok: true };
                const swapCandidateId = swapCandidateByRound.get(round.roundNumber);
                return (
                  <SortableRoundColumn
                    key={round.roundNumber}
                    roundNumber={round.roundNumber}
                    matches={round.matches}
                    participants={participants}
                    theme={theme}
                    hasConflict={!conflict.ok}
                    conflictingMatchIds={conflict.conflictingMatchIds}
                    isDragging={!!activeId}
                    smartModeEnabled={smartModeEnabled}
                    swapCandidateId={swapCandidateId}
                  />
                );
              })}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeMatch ? (
                <SortableMatchCard
                  match={activeMatch}
                  participants={participants}
                  theme={theme}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
      
      {/* Swap Confirmation Dialog */}
      {pendingSwap && (
        <ConfirmDialog
          isOpen={!!pendingSwap}
          onClose={handleCancelSwap}
          onConfirm={handleConfirmSwap}
          title="Conflicto detectado"
          message={`
            Esta jornada ya tiene un partido con participantes en común.
            ¿Quieres intercambiar estos partidos?
            
            • ${pendingSwap.movingMatchDisplay.nameA} vs ${pendingSwap.movingMatchDisplay.nameB}
              (Jornada ${pendingSwap.movingMatchDisplay.fromRound} → ${pendingSwap.movingMatchDisplay.toRound})
            
            • ${pendingSwap.conflictingMatchDisplay.nameA} vs ${pendingSwap.conflictingMatchDisplay.nameB}
              (Jornada ${pendingSwap.conflictingMatchDisplay.fromRound} → ${pendingSwap.conflictingMatchDisplay.toRound})
          `}
          confirmText="Intercambiar"
          cancelText="Cancelar"
          theme={theme as ThemeId}
        />
      )}
    </div>,
    document.body,
  );
};
