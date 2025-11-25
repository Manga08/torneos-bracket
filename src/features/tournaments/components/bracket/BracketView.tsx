import { useEffect, useState, useCallback } from 'react';
import type { Match, Participant } from '../../../../types/database';
import { supabase } from '../../../../shared/api/supabaseClient';
import { generateSingleEliminationMatches, generateDoubleEliminationMatches, generateSwissMatches, generateGroupStageMatches } from '../../utils/bracketUtils';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { StandingsTable } from '../participants/StandingsTable'; // Fix import path
import { Trash2 } from 'lucide-react';

interface BracketViewProps {
  tournamentId: string;
  participants: Participant[];
  matches?: Match[];
  isDraft?: boolean;
  format?: string;
  hasThirdPlace?: boolean;
  onSlotClick?: (seedIndex: number, participant?: Participant) => void;
  onParticipantMove?: (fromSeed: number, toSeed: number) => void;
  onMatchClick?: (match: Match) => void;
  onDeleteParticipant?: (participantId: string) => void;
}

const DraggableParticipant = ({ participant, seedIndex, isDraft, onDelete }: { participant: Participant, seedIndex: number, isDraft: boolean, onDelete?: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `participant-${participant.id}`,
    data: { participant, seedIndex },
    disabled: !isDraft
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  return (
    <motion.div 
      layoutId={isDraft ? `participant-${participant.id}` : undefined}
      ref={setNodeRef} 
      style={style} 
      className={`group flex items-center justify-between w-full pr-2 ${isDragging ? 'opacity-0' : ''}`}
    >
      <div 
        {...listeners} 
        {...attributes}
        className={`flex items-center gap-2 flex-1 min-w-0 ${isDraft ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      >
        <span className="text-xs text-text-muted w-4 shrink-0">{participant.seed}</span>
        <span className="font-medium truncate text-white">{participant.name}</span>
      </div>
      
      {isDraft && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(participant.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-all"
          title="Eliminar participante"
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  );
};

const DroppableSlot = ({ 
  seedIndex, 
  participant, 
  isDraft, 
  onClick, 
  children,
  isWinner,
  hasBorder
}: { 
  seedIndex: number, 
  participant?: Participant | null, 
  isDraft: boolean, 
  onClick?: () => void,
  children?: React.ReactNode,
  isWinner?: boolean,
  hasBorder?: boolean
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${seedIndex}`,
    data: { seedIndex, participant },
    disabled: !isDraft
  });

  return (
    <div 
      ref={setNodeRef}
      onClick={onClick}
      className={`
        flex justify-between items-center p-3 transition-colors min-h-12 relative bracket-node
        ${hasBorder ? 'border-b border-border' : ''}
        ${isWinner ? 'bg-primary/10' : ''}
        ${isDraft ? 'cursor-pointer hover:bg-white/5' : ''}
        ${isOver ? 'bg-primary/20 ring-2 ring-primary/50 ring-inset z-10' : ''}
      `}
    >
      {children}
    </div>
  );
};

const BracketConnectors = ({ prevMatches, nextMatches }: { prevMatches: Match[], nextMatches: Match[] }) => {
  return (
    <div className="w-16 flex flex-col shrink-0 h-full relative">
      {/* Spacer to match the header height of the sibling column (h-6 + mb-4) */}
      <div className="h-6 mb-4" />
      <div className="relative grow w-full">
        <svg 
          className="absolute inset-0 w-full h-full overflow-visible z-0 bracket-connector"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {prevMatches.map((match, i) => {
            if (!match.next_match_id) return null;
            
            // Find target index
            const targetIndex = nextMatches.findIndex(m => m.id === match.next_match_id);
            if (targetIndex === -1) return null;

            const startY = ((i + 0.5) / prevMatches.length) * 100;
            const endY = ((targetIndex + 0.5) / nextMatches.length) * 100;

            return (
              <path
                key={`connector-${match.id}`}
                d={`M 0 ${startY} C 50 ${startY}, 50 ${endY}, 100 ${endY}`}
                fill="none"
                stroke="var(--bracket-connector-color)"
                strokeWidth="var(--bracket-connector-width)"
                strokeOpacity="var(--bracket-connector-opacity)"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const BracketView = ({ 
  tournamentId, 
  participants, 
  matches: externalMatches,
  isDraft = false, 
  format = 'single_elim', 
  hasThirdPlace = false,
  onSlotClick, 
  onParticipantMove, 
  onMatchClick,
  onDeleteParticipant 
}: BracketViewProps) => {
  const [internalMatches, setInternalMatches] = useState<Match[]>([]);
  const matches = externalMatches || internalMatches;
  const [loading, setLoading] = useState(!isDraft && !externalMatches);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced distance for easier drag start
      },
    })
  );

  // Helper para calcular el índice de seed basado en el partido y slot
  const getSeedIndex = (match: Match, slot: 'A' | 'B') => {
    // Solo válido para la ronda 1 en modo draft para edición directa
    if (match.round_number !== 1) return -1;
    // match_number es 1-based
    return (match.match_number - 1) * 2 + (slot === 'A' ? 0 : 1);
  };

  const fetchMatches = useCallback(async () => {
    if (isDraft || externalMatches) return;
    
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      setInternalMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, isDraft, externalMatches]);

  useEffect(() => {
    if (!isDraft && !externalMatches) {
      fetchMatches();
      const channel = supabase
        .channel('bracket_view')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, 
            () => fetchMatches())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [tournamentId, fetchMatches, isDraft, externalMatches]);

  useEffect(() => {
    if (isDraft) {
      let virtualMatches: Match[] = [];
      if (format === 'double_elim') {
        virtualMatches = generateDoubleEliminationMatches(tournamentId, participants);
      } else if (format === 'swiss') {
        virtualMatches = generateSwissMatches(tournamentId, participants);
      } else if (format === 'groups') {
        virtualMatches = generateGroupStageMatches(tournamentId, participants);
      } else {
        virtualMatches = generateSingleEliminationMatches(tournamentId, participants, hasThirdPlace);
      }
      setInternalMatches(virtualMatches);
    }
  }, [isDraft, format, tournamentId, participants, hasThirdPlace]);

  const getParticipant = (id: string | null) => {
    if (!id) return null;
    return participants.find(p => p.id === id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const fromSeed = active.data.current?.seedIndex;
    const toSeed = over.data.current?.seedIndex;

    if (fromSeed !== undefined && toSeed !== undefined && fromSeed !== toSeed) {
      onParticipantMove?.(fromSeed, toSeed);
    }
  };

  const activeParticipant = activeId ? participants.find(p => `participant-${p.id}` === activeId) : null;

  if (loading) return <div className="text-center py-10 text-text-muted">Cargando bracket...</div>;

  // Group matches by stage and then by round
  const matchesByStage = matches.reduce((acc, match) => {
    const stage = match.stage || 'main';
    if (!acc[stage]) acc[stage] = {};
    if (!acc[stage][match.round_number]) acc[stage][match.round_number] = [];
    acc[stage][match.round_number].push(match);
    return acc;
  }, {} as Record<string, Record<number, Match[]>>);

  const renderBracketSection = (stage: string, title: string) => {
    // Merge 'final' into 'upper' for display if we are rendering 'upper'
    let stageRounds: Record<number, Match[]> = matchesByStage[stage] || {};
    
    if (stage === 'upper' && matchesByStage['final']) {
      // Clone to avoid mutating original
      stageRounds = { ...stageRounds };
      // Add final rounds to upper
      Object.entries(matchesByStage['final']).forEach(([round, matches]) => {
        stageRounds[Number(round)] = matches;
      });
    }

    const roundNumbers = Object.keys(stageRounds).map(Number).sort((a, b) => a - b);

    if (roundNumbers.length === 0) return null;

    return (
      <div className="mb-12">
        <h3 className="text-xl font-bold text-white mb-6 px-4 border-l-4 border-primary section-header flex items-center gap-2">{title}</h3>
        <div className="flex min-w-max px-4">
          {roundNumbers.map((roundNum, index) => (
            <div key={roundNum} className="flex">
              {index > 0 && (
                <BracketConnectors 
                  prevMatches={stageRounds[roundNumbers[index-1]]}
                  nextMatches={stageRounds[roundNum]}
                />
              )}
              <div className="flex flex-col justify-center min-w-60">
                <h3 className="text-center text-text-muted font-bold uppercase text-sm mb-4 h-6">
                  {stage === 'swiss' ? `Ronda ${roundNum}` : 
                   stage.startsWith('Group') ? `Partidos` :
                   (stage !== 'lower' && matchesByStage['final'] && matchesByStage['final'][roundNum]) ? 'Gran Final' : 
                   (stage === 'lower' && roundNum === roundNumbers[roundNumbers.length - 1]) ? 'Lower Final' :
                   `Ronda ${roundNum}`}
                </h3>
                
                <div className="flex flex-col justify-around grow">
                  {stageRounds[roundNum].map((match) => (
                    <div 
                      key={match.id || `virtual-${match.round_number}-${match.match_number}`} 
                      className="flex flex-col justify-center"
                      style={{ 
                        // Dynamic height for tree alignment
                        // Only apply for main/upper stages where tree structure is standard
                        height: (stage === 'main' || stage === 'upper' || stage === 'playoffs' || stage === 'lower') 
                          ? `${100 / stageRounds[roundNum].length}%` 
                          : undefined,
                        marginBottom: (stage === 'swiss' || stage.startsWith('Group')) ? '1rem' : undefined,
                        // Add min-height to ensure spacing
                        minHeight: (stage === 'main' || stage === 'upper' || stage === 'playoffs' || stage === 'lower') ? '8rem' : undefined
                      }}
                    >
                      <div 
                        onClick={() => !isDraft && onMatchClick?.(match)}
                        className={`
                        relative flex flex-col bg-surface border rounded-lg overflow-hidden transition-all bracket-node
                        ${match.status === 'live' ? 'border-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-border hover:border-white/20'}
                        ${isDraft ? 'opacity-100' : 'cursor-pointer hover:border-primary/50'}
                        w-full z-10
                      `}>
                      {/* Participante A */}
                      {isDraft && match.round_number === 1 && (stage === 'main' || stage === 'upper' || stage === 'swiss') ? (
                        <DroppableSlot
                          seedIndex={getSeedIndex(match, 'A')}
                          participant={getParticipant(match.participant_a_id)}
                          isDraft={isDraft}
                          onClick={() => onSlotClick?.(getSeedIndex(match, 'A'), getParticipant(match.participant_a_id) || undefined)}
                          isWinner={match.winner_id === match.participant_a_id && !!match.winner_id}
                          hasBorder
                        >
                          {match.participant_a_id && getParticipant(match.participant_a_id) ? (
                            <DraggableParticipant 
                              participant={getParticipant(match.participant_a_id)!} 
                              seedIndex={getSeedIndex(match, 'A')}
                              isDraft={isDraft}
                              onDelete={onDeleteParticipant}
                            />
                          ) : (
                            <div className="flex items-center gap-2 w-full text-text-muted italic">
                              <span className="text-xs text-text-muted w-4">{getSeedIndex(match, 'A') + 1}</span>
                              Vacío
                            </div>
                          )}
                        </DroppableSlot>
                      ) : (
                        <div className={`
                          flex justify-between items-center p-3 border-b border-border transition-colors
                          ${match.winner_id === match.participant_a_id && match.winner_id ? 'bg-primary/10' : ''}
                        `}>
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-text-muted w-4">
                              {match.participant_a_id ? getParticipant(match.participant_a_id)?.seed : '-'}
                            </span>
                            <span className={`font-medium truncate font-display tracking-wide ${match.winner_id === match.participant_a_id && match.winner_id ? 'text-primary' : 'text-white'}`}>
                              {getParticipant(match.participant_a_id)?.name || <span className="text-text-muted italic">Vacío</span>}
                            </span>
                          </div>
                          {!isDraft && <span className="font-mono font-bold text-white/80">{match.score_a}</span>}
                        </div>
                      )}

                      {/* Participante B */}
                      {isDraft && match.round_number === 1 && (stage === 'main' || stage === 'upper' || stage === 'swiss') ? (
                        <DroppableSlot
                          seedIndex={getSeedIndex(match, 'B')}
                          participant={getParticipant(match.participant_b_id)}
                          isDraft={isDraft}
                          onClick={() => onSlotClick?.(getSeedIndex(match, 'B'), getParticipant(match.participant_b_id) || undefined)}
                          isWinner={match.winner_id === match.participant_b_id && !!match.winner_id}
                        >
                          {match.participant_b_id && getParticipant(match.participant_b_id) ? (
                            <DraggableParticipant 
                              participant={getParticipant(match.participant_b_id)!} 
                              seedIndex={getSeedIndex(match, 'B')}
                              isDraft={isDraft}
                              onDelete={onDeleteParticipant}
                            />
                          ) : (
                            <div className="flex items-center gap-2 w-full text-text-muted italic">
                              <span className="text-xs text-text-muted w-4">{getSeedIndex(match, 'B') + 1}</span>
                              Vacío
                            </div>
                          )}
                        </DroppableSlot>
                      ) : (
                        <div className={`
                          flex justify-between items-center p-3 transition-colors
                          ${match.winner_id === match.participant_b_id && match.winner_id ? 'bg-primary/10' : ''}
                        `}>
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-text-muted w-4">
                              {match.participant_b_id ? getParticipant(match.participant_b_id)?.seed : '-'}
                            </span>
                            <span className={`font-medium truncate font-display tracking-wide ${match.winner_id === match.participant_b_id && match.winner_id ? 'text-primary' : 'text-white'}`}>
                              {getParticipant(match.participant_b_id)?.name || <span className="text-text-muted italic">Vacío</span>}
                            </span>
                          </div>
                          {!isDraft && <span className="font-mono font-bold text-white/80">{match.score_b}</span>}
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (matches.length === 0 && !loading) {
     return <div className="text-center py-10 text-text-muted">Esperando participantes...</div>;
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Standings Section */}
      {!isDraft && (format === 'groups' || format === 'swiss') && (
        <div className="mb-12 space-y-8">
           {format === 'swiss' && (
             <div>
               <h3 className="text-xl font-bold text-white mb-4">Tabla de Posiciones (Suizo)</h3>
               <StandingsTable participants={participants} matches={matches} />
             </div>
           )}
           {Object.keys(matchesByStage).filter(s => s.startsWith('Group')).sort().map(stage => {
             const stageMatches = Object.values(matchesByStage[stage]).flat() as Match[];
             const participantIds = new Set<string>();
             stageMatches.forEach(m => {
               if (m.participant_a_id) participantIds.add(m.participant_a_id);
               if (m.participant_b_id) participantIds.add(m.participant_b_id);
             });
             const groupParticipants = participants.filter(p => participantIds.has(p.id));
             
             return (
               <div key={stage}>
                 <h3 className="text-xl font-bold text-white mb-4">Tabla de Posiciones - {stage}</h3>
                 <StandingsTable participants={groupParticipants} matches={stageMatches} />
               </div>
             );
           })}
        </div>
      )}

      <div className="overflow-x-auto pb-8">
        {format === 'swiss' ? (
          renderBracketSection('swiss', 'Formato Suizo')
        ) : format === 'groups' ? (
          <>
            {/* Render each group */}
            {Object.keys(matchesByStage).filter(s => s.startsWith('Group')).sort().map(groupStage => 
              renderBracketSection(groupStage, groupStage)
            )}
            {renderBracketSection('playoffs', 'Playoffs')}
          </>
        ) : (
          <>
            {renderBracketSection('main', 'Bracket Principal')}
            {renderBracketSection('upper', 'Upper Bracket')}
            {renderBracketSection('lower', 'Lower Bracket')}
            {renderBracketSection('bronze', '3er Puesto')}
            {/* Final is merged into upper or main usually, but if it exists separately (e.g. single elim final round) */}
            {/* renderBracketSection('final', 'Gran Final') - Merged into upper logic */}
          </>
        )}
      </div>
      
      {createPortal(
        <DragOverlay>
          {activeParticipant ? (
            <div className="bg-surface border border-primary shadow-xl rounded p-3 flex items-center gap-2 w-60 cursor-grabbing">
              <span className="text-xs text-text-muted w-4">{activeParticipant.seed}</span>
              <span className="font-medium truncate text-white">{activeParticipant.name}</span>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};
