import { ChevronDown, ChevronUp, Clock, CheckCircle, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateMatchScoreAndStatus } from '@/features/tournaments/api/matches.api';
import type { Match, Participant } from '@/types/database';

interface LeagueMatchListProps {
  matches: Match[];
  participants: Participant[];
  onMatchClick?: (match: Match) => void;
  canEdit?: boolean;
  onMatchUpdate?: () => void;
}

export const LeagueMatchList = ({
  matches,
  participants,
  onMatchClick,
  canEdit,
  onMatchUpdate,
}: LeagueMatchListProps) => {
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    scoreA: string;
    scoreB: string;
    status: 'pending' | 'live' | 'completed';
  }>({ scoreA: '', scoreB: '', status: 'pending' });

  const getParticipant = (id: string | null) => participants.find((p) => p.id === id);

  // Group matches by round
  const matchesByRound = matches.reduce(
    (acc, match) => {
      const round = match.round_number;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>,
  );

  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Initialize first round as expanded if no state
  if (sortedRounds.length > 0 && Object.keys(expandedRounds).length === 0) {
    // Find current round (first round with pending matches) or just the last round
    // For now, let's just expand the first round by default, or maybe all?
    // Let's expand the first round.
    // Actually, better logic: expand the first round that has pending matches, or the last round if all completed.
    // But for now, let's just expand the first one to avoid complexity in render.
    // We'll handle this in useEffect if we want it to be smart, but for now let's just leave it controlled by user or default all collapsed except first.
    // Actually, let's default all to collapsed except the current round.
    // We can do this lazily.
  }

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => ({
      ...prev,
      [round]: !prev[round],
    }));
  };

  const handleEditClick = (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMatchId(match.id);
    setEditForm({
      scoreA: match.score_a?.toString() ?? '0',
      scoreB: match.score_b?.toString() ?? '0',
      status: (match.status === 'active' ? 'live' : match.status) as
        | 'pending'
        | 'live'
        | 'completed',
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMatchId(null);
  };

  const handleSaveEdit = async (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();

    const scoreA = parseInt(editForm.scoreA);
    const scoreB = parseInt(editForm.scoreB);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      toast.error('Los marcadores deben ser números válidos y positivos');
      return;
    }

    if (!match.participant_a_id || !match.participant_b_id) {
      toast.error('No se puede completar un partido sin participantes');
      return;
    }

    let winnerId: string | null = null;
    if (editForm.status === 'completed') {
      if (scoreA > scoreB) winnerId = match.participant_a_id;
      else if (scoreB > scoreA) winnerId = match.participant_b_id;
    }

    try {
      const { error } = await updateMatchScoreAndStatus({
        matchId: match.id,
        scoreA,
        scoreB,
        status: editForm.status,
        winnerId,
      });

      if (error) throw error;

      toast.success('Partido actualizado');
      setEditingMatchId(null);
      onMatchUpdate?.();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating match:', error);
      toast.error('Error al actualizar el partido');
    }
  };

  return (
    <div className="space-y-4">
      {sortedRounds.map((round, index) => {
        const roundMatches = matchesByRound[round];
        const isExpanded = expandedRounds[round] ?? index === 0; // Default first round expanded
        const isCompleted = roundMatches.every((m) => m.status === 'completed');

        return (
          <div key={round} className="rounded-xl border border-white/10 bg-surface overflow-hidden">
            <button
              onClick={() => toggleRound(round)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Jornada {round}
                </h3>
                {isCompleted && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                    Completada
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp size={18} className="text-text-muted" />
              ) : (
                <ChevronDown size={18} className="text-text-muted" />
              )}
            </button>

            {isExpanded && (
              <div className="p-4 pt-0 grid gap-3 animate-in slide-in-from-top-2 duration-200">
                {roundMatches.map((match) => {
                  const pA = getParticipant(match.participant_a_id);
                  const pB = getParticipant(match.participant_b_id);
                  const matchIsCompleted = match.status === 'completed';
                  const isEditing = editingMatchId === match.id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => !isEditing && onMatchClick?.(match)}
                      className={`
                        relative overflow-hidden rounded-lg bg-background p-3 border border-white/5
                        transition-all group
                        ${!isEditing && onMatchClick ? 'cursor-pointer hover:border-primary/50' : ''}
                        ${isEditing ? 'border-primary ring-1 ring-primary' : ''}
                      `}
                    >
                      {/* Status Indicator Strip */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          matchIsCompleted ? 'bg-success' : 'bg-surface-highlight'
                        }`}
                      />

                      {isEditing ? (
                        // Editing Mode
                        <div className="flex flex-col gap-3 pl-2">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex-1 text-sm font-medium text-white truncate">
                              {pA?.name || 'TBD'}
                            </div>
                            <input
                              type="number"
                              value={editForm.scoreA}
                              onChange={(e) => setEditForm({ ...editForm, scoreA: e.target.value })}
                              className="w-12 bg-surface border border-white/10 rounded px-1 py-0.5 text-center text-white font-mono"
                              min="0"
                            />
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex-1 text-sm font-medium text-white truncate">
                              {pB?.name || 'TBD'}
                            </div>
                            <input
                              type="number"
                              value={editForm.scoreB}
                              onChange={(e) => setEditForm({ ...editForm, scoreB: e.target.value })}
                              className="w-12 bg-surface border border-white/10 rounded px-1 py-0.5 text-center text-white font-mono"
                              min="0"
                            />
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <select
                              value={editForm.status}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  status: e.target.value as 'pending' | 'live' | 'completed',
                                })
                              }
                              className="bg-surface text-xs text-white border border-white/10 rounded px-2 py-1"
                            >
                              <option value="pending">Pendiente</option>
                              <option value="live">En Vivo</option>
                              <option value="completed">Finalizado</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleCancelEdit(e)}
                                className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white transition-colors"
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                              <button
                                onClick={(e) => handleSaveEdit(match, e)}
                                className="p-1 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
                                title="Guardar"
                              >
                                <Save size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex justify-between items-center gap-4 pl-2">
                            {/* Participant A */}
                            <div className="flex-1 flex items-center gap-3 overflow-hidden">
                              <div
                                className={`font-medium truncate text-sm ${
                                  match.winner_id === match.participant_a_id
                                    ? 'text-primary font-bold'
                                    : 'text-white'
                                }`}
                              >
                                {pA?.name || <span className="text-text-muted italic">TBD</span>}
                              </div>
                              {matchIsCompleted && (
                                <span className="font-mono font-bold text-lg text-white">
                                  {match.score_a}
                                </span>
                              )}
                            </div>

                            {/* VS / Status */}
                            <div className="flex flex-col items-center justify-center w-8 shrink-0">
                              {matchIsCompleted ? (
                                <span className="text-[10px] font-bold text-text-muted">FT</span>
                              ) : (
                                <span className="text-[10px] font-bold text-text-muted">VS</span>
                              )}
                            </div>

                            {/* Participant B */}
                            <div className="flex-1 flex items-center justify-end gap-3 overflow-hidden">
                              {matchIsCompleted && (
                                <span className="font-mono font-bold text-lg text-white">
                                  {match.score_b}
                                </span>
                              )}
                              <div
                                className={`font-medium truncate text-right text-sm ${
                                  match.winner_id === match.participant_b_id
                                    ? 'text-primary font-bold'
                                    : 'text-white'
                                }`}
                              >
                                {pB?.name || <span className="text-text-muted italic">TBD</span>}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex justify-between items-center text-[10px] text-text-muted pl-2">
                            <div className="flex items-center gap-2">
                              <span>Match #{match.match_number}</span>
                              {matchIsCompleted ? (
                                <span className="flex items-center gap-1 text-success">
                                  <CheckCircle size={10} /> Finalizado
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> Pendiente
                                </span>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                onClick={(e) => handleEditClick(match, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-primary"
                                title="Editar resultado"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
