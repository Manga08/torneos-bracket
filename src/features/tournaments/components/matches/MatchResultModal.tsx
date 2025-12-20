import { clsx } from 'clsx';
import { X, Trophy } from 'lucide-react';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';

import type { ThemeId } from '@/features/themes/types/themeTypes';
import type { LeagueMetricsSchema } from '@/features/tournaments/types/league';
import { AppButton } from '@/shared/components/ui/AppButton';
import type { Match, Participant } from '@/types/database';

interface MetricValue {
  a?: number;
  b?: number;
}

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  participantA: Participant | undefined;
  participantB: Participant | undefined;
  theme?: ThemeId;
  metricsSchema?: LeagueMetricsSchema;
  onSave: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId: string | null,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
}

const useAutoFitText = (
  ref: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList,
  minSize = 12,
  maxSize = 34,
) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const adjustFontSize = () => {
      let low = minSize;
      let high = maxSize;
      let bestSize = minSize;

      // Binary search for the best font size
      for (let i = 0; i < 10; i++) {
        const mid = Math.floor((low + high) / 2);
        element.style.fontSize = `${mid}px`;

        if (element.scrollHeight <= element.clientHeight) {
          bestSize = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      element.style.fontSize = `${bestSize}px`;
      element.style.setProperty('--team-name-size', `${bestSize}px`);
    };

    const observer = new ResizeObserver(adjustFontSize);
    observer.observe(element);
    // Also observe parent to trigger resize when container changes
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }

    adjustFontSize();

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, minSize, maxSize, ...deps]);
};

export const MatchResultModal = ({
  isOpen,
  onClose,
  match,
  participantA,
  participantB,
  theme,
  metricsSchema,
  onSave,
}: MatchResultModalProps) => {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [metrics, setMetrics] = useState<Record<string, MetricValue>>({});
  const [loading, setLoading] = useState(false);

  const homeNameRef = useRef<HTMLDivElement>(null);
  const awayNameRef = useRef<HTMLDivElement>(null);

  useAutoFitText(homeNameRef, [participantA?.name, isOpen]);
  useAutoFitText(awayNameRef, [participantB?.name, isOpen]);

  useEffect(() => {
    if (match) {
      setScoreA(match.score_a || 0);
      setScoreB(match.score_b || 0);

      const meta = (match.metadata as Record<string, unknown>) || {};
      const leagueMeta = (meta.league as Record<string, unknown>) || {};
      if (leagueMeta.metrics) {
        setMetrics(leagueMeta.metrics as Record<string, MetricValue>);
      } else {
        setMetrics({});
      }
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      let winnerId: string | null = null;
      if (scoreA > scoreB) winnerId = match.participant_a_id;
      else if (scoreB > scoreA) winnerId = match.participant_b_id;

      const metadata = {
        league: {
          metrics,
        },
      };

      await onSave(match.id, scoreA, scoreB, winnerId, metadata);
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMetricChange = (metricId: string, side: 'a' | 'b', value: string) => {
    setMetrics((prev) => ({
      ...prev,
      [metricId]: {
        ...(prev[metricId] || {}),
        [side]: parseInt(value) || 0,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4 animate-fade-in">
      <div
        className={clsx(
          'modal-content w-full max-w-lg md:max-w-3xl overflow-hidden match-result-modal',
          theme && `match-result-modal--${theme}`,
        )}
      >
        <div className="modal-header match-result-header flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            Resultado del Partido
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-8 max-h-[80vh] overflow-y-auto">
          <div className={clsx('match-scoreboard', theme && `match-scoreboard--${theme}`)}>
            <div className="match-scoreboard__names">
              <div
                ref={homeNameRef}
                className={clsx(
                  'match-scoreboard__name',
                  'match-scoreboard__name--home',
                  scoreA > scoreB && 'is-winner',
                )}
                title={participantA?.name || 'TBD'}
              >
                {participantA?.name || 'TBD'}
              </div>
              <div
                ref={awayNameRef}
                className={clsx(
                  'match-scoreboard__name',
                  'match-scoreboard__name--away',
                  scoreB > scoreA && 'is-winner',
                )}
                title={participantB?.name || 'TBD'}
              >
                {participantB?.name || 'TBD'}
              </div>
            </div>

            <div className="match-scoreboard__scores">
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className={clsx('match-scoreboard__score-input', scoreA > scoreB && 'is-winner')}
              />

              <div className="match-scoreboard__center">
                <span className="match-scoreboard__center-label">Marcador</span>
              </div>

              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className={clsx('match-scoreboard__score-input', scoreB > scoreA && 'is-winner')}
              />
            </div>
          </div>

          {/* Metrics Section */}
          {metricsSchema && metricsSchema.length > 0 && (
            <div className="space-y-4 border-t border-white/10 pt-4">
              <h4 className="text-sm font-bold text-white">Estadísticas Adicionales</h4>
              <div className="grid gap-4">
                {metricsSchema.map((metric) => (
                  <div
                    key={metric.id}
                    className="bg-surface-dark p-3 rounded-lg border border-white/5"
                  >
                    <div className="text-center text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                      {metric.label}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted w-4">{metric.aLabel || 'A'}</span>
                        <input
                          type="number"
                          value={metrics[metric.id]?.a || 0}
                          onChange={(e) => handleMetricChange(metric.id, 'a', e.target.value)}
                          className="w-16 bg-background border border-white/10 rounded px-2 py-1 text-center text-white font-mono text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={metrics[metric.id]?.b || 0}
                          onChange={(e) => handleMetricChange(metric.id, 'b', e.target.value)}
                          className="w-16 bg-background border border-white/10 rounded px-2 py-1 text-center text-white font-mono text-sm"
                        />
                        <span className="text-xs text-text-muted w-4 text-right">
                          {metric.bLabel || 'B'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <AppButton onClick={onClose} variant="ghost" className="flex-1" theme={theme}>
              Cancelar
            </AppButton>
            <AppButton
              onClick={handleSave}
              variant="primary"
              className="flex-1"
              isLoading={loading}
              theme={theme}
            >
              Guardar Resultado
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
};
