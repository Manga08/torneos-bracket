import { ArrowLeft, Trophy, Users, RotateCcw, Share2, Trash2 } from 'lucide-react';

import { AppButton } from '@/shared/components/ui/AppButton';

interface TournamentAdminHeaderProps {
  name: string;
  game: string;
  status: 'draft' | 'active' | 'completed';
  formatLabel: string;
  participantsCount: number;
  maxParticipants: number | string;
  themeId?: string;

  onBack: () => void;
  onUndo?: () => void;
  canUndo: boolean;
  onShare: () => void;
  onDelete: () => void;
  onStart: () => void;

  activeTab: 'setup' | 'bracket' | 'settings';
  onChangeTab: (tab: 'setup' | 'bracket' | 'settings') => void;
  canEdit?: boolean;
}

export const TournamentAdminHeader = ({
  name,
  game,
  status,
  formatLabel,
  participantsCount,
  maxParticipants,
  themeId,
  onBack,
  onUndo,
  canUndo,
  onShare,
  onDelete,
  onStart,
  activeTab,
  onChangeTab,
  canEdit = true,
}: TournamentAdminHeaderProps) => {
  const getGameBadgeStyle = (gameName: string) => {
    const lowerGame = gameName.toLowerCase();
    if (lowerGame.includes('valorant')) {
      return 'valorant-chip text-[#ff4655]! border-[#ff4655]/30!';
    }
    if (lowerGame.includes('fifa') || lowerGame.includes('fc 24') || lowerGame.includes('fc 25')) {
      return 'fifa-chip text-[#6fff38]! border-[#6fff38]/30!';
    }
    // Default theme (Blue)
    return 'bg-primary/10 text-primary border-primary/20 border';
  };

  return (
    <>
      {/* Header */}
      <div
        className={`relative mb-8 -mx-4 px-4 pt-4 pb-8 md:-mx-8 md:px-8 overflow-hidden ${themeId === 'valorant' ? '' : ''}`}
      >
        <div className="relative z-10">
          <AppButton
            onClick={onBack}
            variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
            theme={themeId}
            leftIcon={<ArrowLeft size={18} />}
            className="mb-4"
          >
            Volver
          </AppButton>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className={`text-4xl font-bold text-white tracking-tight drop-shadow-md ${themeId === 'valorant' ? 'valorant-text-shadow' : ''} ${themeId === 'fifa' ? 'fifa-text-glow' : ''}`}
                >
                  {name}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase border shadow-sm ${getGameBadgeStyle(game)}`}
                >
                  {game}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase border shadow-sm ${
                    status === 'active'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  } ${themeId === 'valorant' ? 'valorant-chip' : ''}`}
                >
                  {status}
                </span>
              </div>
              <p
                className={`flex items-center gap-2 font-medium drop-shadow-sm ${themeId === 'valorant' ? 'valorant-metadata' : 'text-text-muted'}`}
              >
                <Trophy size={16} />
                {formatLabel}
                <span className="mx-2">•</span>
                <Users size={16} /> {participantsCount} / {maxParticipants} Participantes
              </p>
            </div>

            <div className="flex gap-3">
              {canUndo && onUndo && (
                <AppButton
                  onClick={onUndo}
                  variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
                  theme={themeId}
                  leftIcon={<RotateCcw size={18} />}
                  className={
                    themeId === 'valorant'
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : 'text-yellow-400 hover:text-yellow-300'
                  }
                  title="Deshacer último cambio"
                >
                  <span className="hidden md:inline">Deshacer</span>
                </AppButton>
              )}

              <AppButton
                onClick={onShare}
                variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
                theme={themeId}
                leftIcon={<Share2 size={18} />}
                title="Copiar enlace público"
              >
                <span className="hidden md:inline">Compartir</span>
              </AppButton>

              {/* Delete Button (Always Visible for Admin) */}
              {canEdit && (
                <AppButton
                  onClick={onDelete}
                  variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
                  theme={themeId}
                  leftIcon={<Trash2 size={18} />}
                  className={
                    themeId === 'valorant'
                      ? 'hover:border-red-500 hover:bg-red-500/10'
                      : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  }
                  title="Eliminar Torneo"
                >
                  <span className="hidden md:inline">Borrar Torneo</span>
                </AppButton>
              )}

              {status === 'draft' && canEdit && (
                <AppButton
                  onClick={onStart}
                  variant="primary"
                  theme={themeId}
                  leftIcon={<Trophy size={18} />}
                >
                  Iniciar Torneo
                </AppButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`flex gap-6 border-b border-border mb-8 relative z-10 ${themeId === 'valorant' ? 'border-white/10' : ''}`}
      >
        {status === 'draft' && (
          <button
            onClick={() => onChangeTab('setup')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'setup'
                ? themeId === 'valorant'
                  ? 'valorant-tab-active'
                  : 'text-primary tab-active'
                : themeId === 'valorant'
                  ? 'valorant-tab-text'
                  : 'text-text-muted hover:text-white'
            }`}
          >
            Configuración
          </button>
        )}

        {status !== 'draft' && (
          <button
            onClick={() => onChangeTab('bracket')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'bracket'
                ? themeId === 'valorant'
                  ? 'valorant-tab-active'
                  : 'text-primary tab-active'
                : themeId === 'valorant'
                  ? 'valorant-tab-text'
                  : 'text-text-muted hover:text-white'
            }`}
          >
            Bracket
          </button>
        )}

        <button
          onClick={() => onChangeTab('settings')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'settings'
              ? themeId === 'valorant'
                ? 'valorant-tab-active'
                : 'text-primary tab-active'
              : themeId === 'valorant'
                ? 'valorant-tab-text'
                : 'text-text-muted hover:text-white'
          }`}
        >
          Ajustes
        </button>
      </div>
    </>
  );
};
