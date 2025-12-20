import {
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertTriangle,
  Settings,
  Database,
  Shuffle,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LeagueScheduleEditorModal } from './editor/LeagueScheduleEditorModal';
import { LeagueMatchList } from './LeagueMatchList';
import { LeaguePodium } from './LeaguePodium';
import { LeagueStandingsTable } from './LeagueStandingsTable';
import { RestartTournamentDialog } from './RestartTournamentDialog';
import { LeagueColumnBuilder } from './settings/LeagueColumnBuilder';
import { LeagueMetricsSchemaBuilder } from './settings/LeagueMetricsSchemaBuilder';

import {
  createOrRegenerateLeagueSchedule,
  restartLeagueTournament,
} from '@/features/tournaments/api/league.api';
import {
  updateParticipantSeed,
  randomizeParticipantSeeds,
} from '@/features/tournaments/api/participants.api';
import { useLeagueStandings } from '@/features/tournaments/hooks/useLeagueStandings';
import type { LeagueConfig, LeagueMode } from '@/features/tournaments/types/league';
import { AppButton } from '@/shared/components/ui/AppButton';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import type { Match, Participant } from '@/types/database';

interface LeagueViewProps {
  matches: Match[];
  participants: Participant[];
  isLoading?: boolean;
  onMatchClick?: (match: Match) => void;
  canEdit?: boolean;
  onMatchUpdate?: () => void;
  tournamentId?: string;
  config?: LeagueConfig;
  onConfigUpdate?: () => void;
  status?: 'active' | 'completed' | 'draft';
  mode?: LeagueMode;
}

export const LeagueView = ({
  matches,
  participants,
  isLoading,
  onMatchClick,
  canEdit,
  onMatchUpdate,
  tournamentId,
  config,
  onConfigUpdate,
  status,
  mode = 'public',
}: LeagueViewProps) => {
  const standings = useLeagueStandings(participants, matches, config);
  const [isReordering, setIsReordering] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showColumnBuilder, setShowColumnBuilder] = useState(false);
  const [showMetricsBuilder, setShowMetricsBuilder] = useState(false);
  const [localParticipants, setLocalParticipants] = useState<Participant[]>([]);
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isSetup = mode === 'setup';

  const handleRandomizeSeeds = () => {
    if (!tournamentId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Randomizar Seeds',
      message: 'Esto cambiará el orden de los participantes y afectará el calendario. ¿Continuar?',
      onConfirm: async () => {
        try {
          await randomizeParticipantSeeds(tournamentId);
          toast.success('Seeds randomizados');
          onMatchUpdate?.();

          // Suggest regenerate
          setTimeout(() => {
            setConfirmDialog({
              isOpen: true,
              title: 'Regenerar Calendario',
              message: 'Seeds actualizados. ¿Quieres regenerar el calendario ahora?',
              onConfirm: async () => {
                try {
                  await createOrRegenerateLeagueSchedule({ tournamentId, regenerate: true });
                  toast.success('Calendario regenerado');
                  onMatchUpdate?.();
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error(e);
                  toast.error('Error al regenerar');
                }
              },
            });
          }, 500);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
          toast.error('Error al randomizar seeds');
        }
      },
    });
  };

  const handleStartReorder = () => {
    setLocalParticipants([...participants].sort((a, b) => (a.seed || 0) - (b.seed || 0)));
    setIsReordering(true);
  };

  const handleMoveParticipant = (index: number, direction: 'up' | 'down') => {
    const newParticipants = [...localParticipants];
    if (direction === 'up' && index > 0) {
      [newParticipants[index], newParticipants[index - 1]] = [
        newParticipants[index - 1],
        newParticipants[index],
      ];
    } else if (direction === 'down' && index < newParticipants.length - 1) {
      [newParticipants[index], newParticipants[index + 1]] = [
        newParticipants[index + 1],
        newParticipants[index],
      ];
    }
    setLocalParticipants(newParticipants);
  };

  const handleSaveOrder = async () => {
    try {
      // Update seeds in DB
      const updates = localParticipants.map((p, index) => updateParticipantSeed(p.id, index + 1));
      await Promise.all(updates);

      toast.success('Orden de participantes actualizado');
      setIsReordering(false);
      onMatchUpdate?.(); // Trigger refresh

      // Check if we should suggest regenerating schedule
      const hasCompletedMatches = matches.some((m) => m.status === 'completed');

      if (!hasCompletedMatches && tournamentId) {
        setConfirmDialog({
          isOpen: true,
          title: 'Regenerar Calendario',
          message:
            'Has cambiado el orden de los participantes. ¿Quieres regenerar el calendario para reflejar los nuevos seeds?',
          onConfirm: async () => {
            try {
              await createOrRegenerateLeagueSchedule({ tournamentId, regenerate: true });
              toast.success('Calendario regenerado');
              onMatchUpdate?.();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(e);
              toast.error('Error al regenerar calendario');
            }
          },
        });
      } else if (hasCompletedMatches) {
        toast.info('Nota: El calendario no se ha regenerado porque ya hay partidos jugados.');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving order:', error);
      toast.error('Error al guardar el orden');
    }
  };

  const handleRestartTournament = async (regenerateSchedule: boolean) => {
    if (!tournamentId) return;
    setIsRestarting(true);
    try {
      await restartLeagueTournament(tournamentId, { regenerateSchedule });
      toast.success(
        regenerateSchedule
          ? 'Torneo reiniciado y calendario regenerado'
          : 'Torneo reiniciado - resultados borrados',
      );
      setIsRestartDialogOpen(false);
      onMatchUpdate?.();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error restarting tournament:', error);
      toast.error('Error al reiniciar el torneo');
    } finally {
      setIsRestarting(false);
    }
  };

  const isRuntime = status === 'active' && mode !== 'public';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {status === 'completed' && config?.finalResults?.top3 && (
        <LeaguePodium winners={config.finalResults.top3} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          isDestructive={confirmDialog.isDestructive}
        />

        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white font-display tracking-tight">
              Clasificación
            </h2>
            <div className="flex gap-2">
              {canEdit && !isReordering && isSetup && (
                <>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMetricsBuilder(!showMetricsBuilder);
                      setShowColumnBuilder(false);
                    }}
                    className="text-xs"
                    title="Configurar Métricas"
                  >
                    <Database size={16} className="mr-1" />
                    Métricas
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowColumnBuilder(!showColumnBuilder);
                      setShowMetricsBuilder(false);
                    }}
                    className="text-xs"
                    title="Personalizar columnas"
                  >
                    <Settings size={16} className="mr-1" />
                    Columnas
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={handleRandomizeSeeds}
                    className="text-xs"
                    title="Randomizar Seeds"
                  >
                    <Shuffle size={16} className="mr-1" />
                    Randomizar
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditorOpen(true)}
                    className="text-xs"
                    title="Editar Calendario Manualmente"
                  >
                    <Calendar size={16} className="mr-1" />
                    Editar Calendario
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={handleStartReorder}
                    className="text-xs"
                  >
                    Reordenar Seeds
                  </AppButton>
                </>
              )}
            </div>
          </div>

          {showMetricsBuilder && canEdit && tournamentId && (
            <div className="mb-6">
              <LeagueMetricsSchemaBuilder
                tournamentId={tournamentId}
                schema={config?.metricsSchema || []}
                onUpdate={() => {
                  onConfigUpdate?.();
                }}
              />
            </div>
          )}

          {showColumnBuilder && canEdit && tournamentId && (
            <div className="mb-6">
              <LeagueColumnBuilder
                tournamentId={tournamentId}
                columns={config?.columns || []}
                metricsSchema={config?.metricsSchema}
                onUpdate={() => {
                  onConfigUpdate?.();
                  // Optional: close builder or keep open
                }}
              />
            </div>
          )}

          {isReordering ? (
            <div className="bg-surface rounded-xl border border-white/10 p-4 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 p-3 rounded-lg">
                <AlertTriangle size={16} />
                <span>Reordenar los seeds puede afectar los emparejamientos futuros.</span>
              </div>
              <div className="space-y-2">
                {localParticipants.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-background p-3 rounded-lg border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-text-muted w-6 text-center">{index + 1}</span>
                      <span className="font-medium text-white">{p.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveParticipant(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveParticipant(index, 'down')}
                        disabled={index === localParticipants.length - 1}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <AppButton variant="ghost" onClick={() => setIsReordering(false)}>
                  Cancelar
                </AppButton>
                <AppButton variant="primary" onClick={handleSaveOrder}>
                  Guardar Orden
                </AppButton>
              </div>
            </div>
          ) : (
            <LeagueStandingsTable
              standings={standings}
              participants={participants}
              columns={config?.columns}
              isLoading={isLoading}
              canEdit={canEdit}
              onManualValueUpdate={onMatchUpdate}
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white font-display tracking-tight">
              Resultados
            </h2>
            <div className="flex gap-2">
              {/* Setup: Regenerar calendario */}
              {canEdit && isSetup && tournamentId && (
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const hasCompleted = matches.some((m) => m.status === 'completed');
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Regenerar Calendario',
                      message: hasCompleted
                        ? '¡ADVERTENCIA! Hay partidos finalizados. Regenerar el calendario BORRARÁ todos los resultados y partidos existentes. ¿Estás seguro?'
                        : '¿Estás seguro de regenerar el calendario? Se borrarán los partidos actuales.',
                      isDestructive: hasCompleted,
                      onConfirm: async () => {
                        try {
                          await createOrRegenerateLeagueSchedule({
                            tournamentId,
                            regenerate: true,
                          });
                          toast.success('Calendario regenerado');
                          onMatchUpdate?.();
                        } catch (e) {
                          // eslint-disable-next-line no-console
                          console.error(e);
                          toast.error('Error al regenerar');
                        }
                      },
                    });
                  }}
                  title="Regenerar todo el calendario"
                >
                  <RefreshCw size={16} className="mr-1" />
                  Regenerar
                </AppButton>
              )}
              {/* Runtime: Reiniciar torneo */}
              {canEdit && isRuntime && tournamentId && (
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRestartDialogOpen(true)}
                  title="Reiniciar torneo (borrar resultados)"
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                >
                  <RotateCcw size={16} className="mr-1" />
                  Reiniciar Torneo
                </AppButton>
              )}
            </div>
          </div>
          <div className="bg-surface/50 rounded-xl p-1 border border-white/5">
            <LeagueMatchList
              matches={matches}
              participants={participants}
              onMatchClick={onMatchClick}
              canEdit={canEdit && !isSetup}
              onMatchUpdate={onMatchUpdate}
            />
          </div>
        </div>
      </div>

      {isSetup && tournamentId && (
        <LeagueScheduleEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          tournamentId={tournamentId}
          matches={matches}
          participants={participants}
          onSaveSuccess={onMatchUpdate}
        />
      )}

      {/* Restart Tournament Dialog */}
      <RestartTournamentDialog
        isOpen={isRestartDialogOpen}
        onClose={() => setIsRestartDialogOpen(false)}
        onConfirm={handleRestartTournament}
        isLoading={isRestarting}
      />
    </div>
  );
};
