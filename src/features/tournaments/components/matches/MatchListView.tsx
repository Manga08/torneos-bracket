import { Clock, CheckCircle } from 'lucide-react';

import type { Match, Participant } from '@/types/database';

interface MatchListViewProps {
  matches: Match[];
  participants: Participant[];
  onMatchClick?: (match: Match) => void;
}

export const MatchListView = ({ matches, participants, onMatchClick }: MatchListViewProps) => {
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

  return (
    <div className="space-y-8">
      {sortedRounds.map((round) => (
        <div key={round} className="space-y-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider px-2">
            Ronda {round}
          </h3>
          <div className="grid gap-3">
            {matchesByRound[round].map((match) => {
              const pA = getParticipant(match.participant_a_id);
              const pB = getParticipant(match.participant_b_id);
              const isCompleted = match.status === 'completed';

              return (
                <div
                  key={match.id}
                  onClick={() => onMatchClick?.(match)}
                  data-status={match.status}
                  className={`
                    match-list-item group
                    ${onMatchClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {/* Status Indicator */}
                  <div
                    className={`match-list-indicator ${isCompleted ? 'bg-success' : 'bg-surface-highlight'}`}
                  />

                  <div className="flex justify-between items-center gap-4 relative z-10">
                    {/* Participant A */}
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                      <div
                        className={`font-medium truncate font-display tracking-wide match-participant-name ${match.winner_id === match.participant_a_id ? 'match-winner' : ''}`}
                      >
                        {pA?.name || <span className="text-text-muted italic">TBD</span>}
                      </div>
                      {isCompleted && (
                        <span className="font-mono font-bold text-lg match-score">
                          {match.score_a}
                        </span>
                      )}
                    </div>

                    {/* VS / Status */}
                    <div className="flex flex-col items-center justify-center w-8 shrink-0">
                      {isCompleted ? (
                        <span className="text-xs font-bold match-vs">FT</span>
                      ) : (
                        <span className="text-xs font-bold match-vs">VS</span>
                      )}
                    </div>

                    {/* Participant B */}
                    <div className="flex-1 flex items-center justify-end gap-3 overflow-hidden">
                      {isCompleted && (
                        <span className="font-mono font-bold text-lg match-score">
                          {match.score_b}
                        </span>
                      )}
                      <div
                        className={`font-medium truncate text-right font-display tracking-wide match-participant-name ${match.winner_id === match.participant_b_id ? 'match-winner' : ''}`}
                      >
                        {pB?.name || <span className="text-text-muted italic">TBD</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-between items-center text-xs match-meta">
                    <span>Match #{match.match_number}</span>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 match-status-completed">
                        <CheckCircle size={10} /> Finalizado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 match-status-pending">
                        <Clock size={10} /> Pendiente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
