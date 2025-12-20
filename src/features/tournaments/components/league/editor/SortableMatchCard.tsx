import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { GripVertical, AlertCircle, ArrowLeftRight } from 'lucide-react';

import type { MatchRow, ParticipantRow } from '@/features/tournaments/types';

interface SortableMatchCardProps {
  match: MatchRow;
  participants: ParticipantRow[];
  theme?: string;
  isConflicting?: boolean;
  isOverlay?: boolean;
  isSwapCandidate?: boolean;
}

export const SortableMatchCard = ({
  match,
  participants,
  theme: _theme,
  isConflicting = false,
  isOverlay = false,
  isSwapCandidate = false,
}: SortableMatchCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: match.id,
    data: { type: 'Match', match },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const pA = participants.find((p) => p.id === match.participant_a_id);
  const pB = participants.find((p) => p.id === match.participant_b_id);

  const isBye = !match.participant_a_id || !match.participant_b_id;
  const isCompleted = match.status === 'completed';

  // Overlay card (being dragged)
  if (isOverlay) {
    return (
      <div
        className="bg-surface p-3 rounded-lg border-2 border-primary flex items-center gap-3 select-none shadow-2xl shadow-primary/20 scale-105 rotate-1"
        style={{ width: '260px' }}
      >
        <div className="text-primary">
          <GripVertical size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            <span className={clsx('text-sm truncate font-medium', !pA && 'text-text-muted italic')}>
              {pA?.name || 'BYE'}
            </span>
            <span className={clsx('text-sm truncate font-medium', !pB && 'text-text-muted italic')}>
              {pB?.name || 'BYE'}
            </span>
          </div>
        </div>
        {isCompleted && (
          <div className="text-yellow-500">
            <AlertCircle size={16} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-surface p-3 rounded-lg flex items-center gap-3 group select-none',
        // Smooth transitions
        'transition-all duration-500 ease-in-out',
        // Border
        (isConflicting || isSwapCandidate) ? 'border-2' : 'border',
        // Dragging state - ghost placeholder
        isDragging && 'opacity-30 scale-[0.97] border-dashed border-primary/60 bg-primary/10',
        // Drop target indicator
        isOver && !isDragging && 'ring-2 ring-emerald-400/60 bg-emerald-500/10',
        // Inactive states
        !isDragging && (isBye || isCompleted) && 'opacity-70',
        // Swap candidate highlighting - amber/yellow glow
        isSwapCandidate && [
          'border-amber-400 bg-amber-500/20',
          'ring-2 ring-amber-400/70',
          'shadow-[0_0_15px_rgba(251,191,36,0.4)]',
          'scale-[1.02]',
        ],
        // Conflict highlighting - very obvious red (only if not swap candidate)
        isConflicting && !isSwapCandidate && [
          'border-red-400 bg-red-500/20',
          'ring-2 ring-red-400/70',
          'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
        ],
        // Normal state
        !isDragging && !isConflicting && !isSwapCandidate && 'border-border hover:border-primary/40 hover:bg-surface-light/50',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={clsx(
          'transition-colors duration-150 cursor-grab active:cursor-grabbing',
          isDragging ? 'text-primary' : 'text-text-muted hover:text-white',
        )}
      >
        <GripVertical size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className={clsx('text-sm truncate font-medium', !pA && 'text-text-muted italic')}>
              {pA?.name || 'BYE'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={clsx('text-sm truncate font-medium', !pB && 'text-text-muted italic')}>
              {pB?.name || 'BYE'}
            </span>
          </div>
        </div>
      </div>

      {isSwapCandidate && (
        <div className="text-amber-400 animate-pulse" title="Intercambiar con este partido">
          <ArrowLeftRight size={18} />
        </div>
      )}

      {isCompleted && !isSwapCandidate && (
        <div className="text-yellow-500" title="Partido completado">
          <AlertCircle size={16} />
        </div>
      )}
    </div>
  );
};
