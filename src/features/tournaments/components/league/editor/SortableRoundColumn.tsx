import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import { CheckCircle2, XCircle, ArrowLeftRight } from 'lucide-react';

import { SortableMatchCard } from './SortableMatchCard';

import type { MatchRow, ParticipantRow } from '@/features/tournaments/types';


interface SortableRoundColumnProps {
  roundNumber: number;
  matches: MatchRow[];
  participants: ParticipantRow[];
  theme?: string;
  hasConflict?: boolean;
  conflictingMatchIds?: string[];
  isDragging?: boolean;
  smartModeEnabled?: boolean;
  swapCandidateId?: string | null;
}

export const SortableRoundColumn = ({
  roundNumber,
  matches,
  participants,
  theme,
  hasConflict = false,
  conflictingMatchIds = [],
  isDragging = false,
  smartModeEnabled = false,
  swapCandidateId = null,
}: SortableRoundColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `round-${roundNumber}`,
    data: { type: 'Round', roundNumber },
  });

  const showDropIndicator = isDragging && isOver;
  // In smart mode, a conflict with a swap candidate shows as "swappable" instead of invalid
  const canSwap = smartModeEnabled && hasConflict && swapCandidateId;
  const showSwapIndicator = isOver && canSwap;
  // Only show as invalid if not in swap mode
  const isValidDrop = isOver && !hasConflict;
  const isInvalidDrop = isOver && hasConflict && !showSwapIndicator;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col min-w-[250px] w-[280px] rounded-xl p-3 h-full',
        // Smooth transition for all properties
        'transition-all duration-500 ease-in-out',
        // Border thickness - thicker when active
        isOver ? 'border-2' : 'border',
        // Base state
        !isOver && 'bg-surface-dark/50 border-white/10',
        // Valid drop target - bright green glow
        isValidDrop && [
          'bg-emerald-500/15 border-emerald-400',
          'shadow-[0_0_20px_rgba(52,211,153,0.3)]',
          'scale-[1.01]',
        ],
        // Swap mode - amber/yellow glow
        showSwapIndicator && [
          'bg-amber-500/15 border-amber-400',
          'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
          'scale-[1.01]',
        ],
        // Invalid drop target (conflict) - obvious red
        isInvalidDrop && [
          'bg-red-500/20 border-red-400',
          'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
        ],
        // Subtle highlight when dragging but not over this column
        isDragging && !isOver && 'border-white/20 bg-surface-dark/70',
      )}
    >
      {/* Header */}
      <div className={clsx(
        'flex items-center justify-between mb-3 px-1',
        'transition-all duration-500 ease-in-out',
        isValidDrop && 'text-emerald-400',
        showSwapIndicator && 'text-amber-400',
        isInvalidDrop && 'text-red-400',
      )}>
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-sm">Jornada {roundNumber}</h4>
          <div className={clsx(
            'transition-all duration-300',
            showDropIndicator ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          )}>
            {showSwapIndicator ? (
              <ArrowLeftRight size={16} className="text-amber-400" />
            ) : !hasConflict ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
          </div>
        </div>
        <span className={clsx(
          'text-xs px-2 py-0.5 rounded-full',
          'transition-all duration-500 ease-in-out',
          isValidDrop && 'bg-emerald-500/30 text-emerald-300',
          showSwapIndicator && 'bg-amber-500/30 text-amber-300',
          isInvalidDrop && 'bg-red-500/30 text-red-300',
          !isOver && 'bg-surface text-text-muted',
        )}>
          {matches.length}
        </span>
      </div>

      {/* Matches list */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
        <SortableContext items={matches.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {matches.map((match) => {
            const isSwapCandidate = showSwapIndicator && match.id === swapCandidateId;
            return (
              <SortableMatchCard
                key={match.id}
                match={match}
                participants={participants}
                theme={theme}
                isConflicting={isOver && conflictingMatchIds.includes(match.id)}
                isSwapCandidate={!!isSwapCandidate}
              />
            );
          })}
        </SortableContext>

        {/* Empty state / Drop zone indicator */}
        {matches.length === 0 && (
          <div 
            className={clsx(
              'flex-1 flex items-center justify-center text-sm font-medium border-2 border-dashed rounded-lg min-h-20',
              'transition-all duration-500 ease-in-out',
              isInvalidDrop && 'border-red-400 text-red-300 bg-red-500/10',
              isValidDrop && 'border-emerald-400 text-emerald-300 bg-emerald-500/10',
              !isOver && 'border-white/15 text-text-muted',
            )}
          >
            {isInvalidDrop ? '✕ Conflicto' : 
             isValidDrop ? '✓ Soltar aquí' : 'Sin partidos'}
          </div>
        )}

        {/* Drop indicator line at bottom when column has matches */}
        <div className={clsx(
          'h-1.5 rounded-full mx-2 transition-all duration-500 ease-in-out',
          isValidDrop && matches.length > 0 ? 'bg-emerald-400/70 opacity-100' : 'bg-transparent opacity-0',
        )} />
      </div>
    </div>
  );
};
