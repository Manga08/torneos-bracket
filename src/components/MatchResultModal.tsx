import { useState, useEffect } from 'react';
import { X, Trophy, Save } from 'lucide-react';
import type { Match, Participant } from '../types/database';

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  participantA: Participant | undefined;
  participantB: Participant | undefined;
  onSave: (matchId: string, scoreA: number, scoreB: number, winnerId: string | null) => Promise<void>;
}

export const MatchResultModal = ({ isOpen, onClose, match, participantA, participantB, onSave }: MatchResultModalProps) => {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [loading, setLoading] = useState(false);

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
      
      // If scores are equal, we don't set a winner automatically unless it's a group stage where draws are allowed?
      // Usually brackets require a winner. For now, if tie, winnerId is null (or we could force user to pick).
      
      await onSave(match.id, scoreA, scoreB, winnerId);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-surface-highlight">
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
              <div className={`text-lg font-bold mb-2 truncate ${scoreA > scoreB ? 'text-primary' : 'text-white'}`}>
                {participantA?.name || 'TBD'}
              </div>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="w-20 h-16 text-3xl font-bold text-center bg-surface-dark border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="text-text-muted font-bold text-xl">VS</div>

            {/* Team B */}
            <div className="flex-1 text-center">
              <div className={`text-lg font-bold mb-2 truncate ${scoreB > scoreA ? 'text-primary' : 'text-white'}`}>
                {participantB?.name || 'TBD'}
              </div>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="w-20 h-16 text-3xl font-bold text-center bg-surface-dark border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg border border-border text-text-muted hover:bg-surface-highlight transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || (!match.participant_a_id || !match.participant_b_id)}
              className="flex-1 btn-primary py-3 px-4 flex justify-center items-center gap-2"
            >
              {loading ? 'Guardando...' : <><Save size={18} /> Guardar Resultado</>}
            </button>
          </div>
          {(!match.participant_a_id || !match.participant_b_id) && (
            <p className="text-xs text-center text-red-400 mt-4">
              No se puede definir resultado sin ambos participantes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
