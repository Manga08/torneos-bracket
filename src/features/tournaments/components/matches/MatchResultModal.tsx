import { X, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';

import { AppButton } from '@/shared/components/ui/AppButton';
import type { Match, Participant } from '@/types/database';

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  participantA: Participant | undefined;
  participantB: Participant | undefined;
  onSave: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId: string | null,
  ) => Promise<void>;
}

export const MatchResultModal = ({
  isOpen,
  onClose,
  match,
  participantA,
  participantB,
  onSave,
}: MatchResultModalProps) => {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [loading, setLoading] = useState(false);

  const isValorant = document.body.classList.contains('theme-valorant');

  useEffect(() => {
    if (match) {
      setScoreA(match.score_a || 0);
      setScoreB(match.score_b || 0);
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      let winnerId: string | null = null;
      if (scoreA > scoreB) winnerId = match.participant_a_id;
      else if (scoreB > scoreA) winnerId = match.participant_b_id;

      await onSave(match.id, scoreA, scoreB, winnerId);
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="modal-content w-full max-w-md overflow-hidden">
        <div className="modal-header flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            Resultado del Partido
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center gap-4 mb-8">
            {/* Team A */}
            <div className="flex-1 text-center">
              <div
                className={`text-lg font-bold mb-2 truncate ${scoreA > scoreB ? 'text-primary' : 'text-white'}`}
              >
                {participantA?.name || 'TBD'}
              </div>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="input-score w-20 h-16 text-3xl font-bold text-center outline-none transition-all"
              />
            </div>

            <div className="text-text-muted font-bold text-xl">VS</div>

            {/* Team B */}
            <div className="flex-1 text-center">
              <div
                className={`text-lg font-bold mb-2 truncate ${scoreB > scoreA ? 'text-primary' : 'text-white'}`}
              >
                {participantB?.name || 'TBD'}
              </div>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="input-score w-20 h-16 text-3xl font-bold text-center outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <AppButton
              onClick={onClose}
              variant="ghost"
              className="flex-1"
              theme={isValorant ? 'valorant' : undefined}
            >
              Cancelar
            </AppButton>
            <AppButton
              onClick={handleSave}
              variant="primary"
              className="flex-1"
              isLoading={loading}
              theme={isValorant ? 'valorant' : undefined}
            >
              Guardar Resultado
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
};
