import { motion } from 'framer-motion';
import { Palette, Trash2 } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { AVAILABLE_THEMES as THEMES } from '../../../../features/themes/config/themeRegistry';
import type { Tournament } from '../../../../types/database';
import { TournamentCollaboratorsSection } from './TournamentCollaboratorsSection';
import type { TournamentPermission } from '../../types/permissions';

interface TournamentConfig {
  participants_count?: number;
  original_format?: string;
  has_third_place?: boolean;
  logo_url?: string;
  theme?: string;
  [key: string]: unknown;
}

export interface TournamentSettingsSectionProps {
  tournament: Tournament;
  themeId?: string;
  
  // Callbacks
  onUpdateTournament: (updates: Partial<Tournament>) => void;
  onSaveSettings: () => void;
  onDeleteTournament: () => void;
  canEdit?: boolean;

  // Collaborators
  permissions?: TournamentPermission[];
  canManagePermissions?: boolean;
  onAddCollaborator?: (email: string) => Promise<void>;
  onRemoveCollaborator?: (permissionId: string) => Promise<void>;
}

export const TournamentSettingsSection = ({
  tournament,
  themeId,
  onUpdateTournament,
  onSaveSettings,
  onDeleteTournament,
  canEdit = true,
  permissions,
  canManagePermissions = false,
  onAddCollaborator,
  onRemoveCollaborator
}: TournamentSettingsSectionProps) => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-card"
    >
      <h3 className="text-xl font-bold text-white mb-4">Configuración del Torneo</h3>
      <div className="space-y-6">
        {/* Edit Tournament Details */}
        <div className="p-6 bg-surface border border-border rounded-xl">
          <h4 className="text-lg font-bold text-white mb-4">Detalles Generales</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Nombre del Torneo</label>
              <input
                type="text"
                value={tournament.name}
                onChange={(e) => onUpdateTournament({ name: e.target.value })}
                className="input-modern"
                disabled={!canEdit}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Juego / Categoría</label>
                <select
                  value={tournament.game}
                  onChange={(e) => onUpdateTournament({ game: e.target.value as Tournament['game'] })}
                  className="input-modern"
                  disabled={!canEdit}
                >
                  <option value="valorant">Valorant</option>
                  <option value="fifa">FIFA</option>
                  <option value="lol">League of Legends</option>
                  <option value="csgo">CS:GO</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Visibilidad</label>
                <select
                  value={tournament.is_public ? 'public' : 'private'}
                  onChange={(e) => onUpdateTournament({ is_public: e.target.value === 'public' })}
                  className="input-modern"
                  disabled={!canEdit}
                >
                  <option value="public">Público</option>
                  <option value="private">Privado</option>
                </select>
              </div>
            </div>

            {tournament.format === 'single_elim' && (
              <div className="flex items-center gap-3 p-4 bg-surface-dark border border-border rounded-lg">
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    type="checkbox"
                    name="has_third_place_settings"
                    id="has_third_place_settings"
                    checked={!!(tournament.config as unknown as TournamentConfig)?.has_third_place}
                    onChange={(e) => {
                       const newConfig = { ...(tournament.config as unknown as TournamentConfig), has_third_place: e.target.checked };
                       onUpdateTournament({ config: newConfig });
                    }}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                    disabled={!canEdit}
                  />
                  <label 
                    htmlFor="has_third_place_settings" 
                    className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300"
                  ></label>
                </div>
                <label htmlFor="has_third_place_settings" className="text-sm text-gray-300 cursor-pointer select-none flex-1">
                  <span className="font-medium text-white block">Incluir partido por el 3er Puesto</span>
                  Genera automáticamente un partido entre los perdedores de las semifinales.
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Logo URL</label>
              <input
                type="text"
                value={(tournament.config as unknown as TournamentConfig)?.logo_url || ''}
                onChange={(e) => {
                   const newConfig = { ...(tournament.config as unknown as TournamentConfig), logo_url: e.target.value };
                   onUpdateTournament({ config: newConfig });
                }}
                placeholder="https://example.com/logo.png"
                className="input-modern"
                disabled={!canEdit}
              />
              <p className="text-xs text-text-muted mt-1">URL de la imagen del logo del torneo.</p>
            </div>

            <div className="flex justify-end pt-2">
              <AppButton
                onClick={onSaveSettings}
                variant="primary"
                theme={themeId}
                disabled={!canEdit}
              >
                Guardar Cambios
              </AppButton>
            </div>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="p-6 bg-surface border border-border rounded-xl">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Palette size={20} className="text-primary" />
            Apariencia y Tema
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                   if (!canEdit) return;
                   const newConfig = { ...(tournament.config as unknown as TournamentConfig), theme: theme.id };
                   onUpdateTournament({ config: newConfig });
                }}
                disabled={!canEdit}
                className={`
                  relative group overflow-hidden rounded-xl border-2 text-left transition-all duration-300
                  ${(tournament.config as unknown as TournamentConfig)?.theme === theme.id 
                    ? 'border-primary bg-surface-highlight' 
                    : 'border-border bg-surface hover:border-white/20'}
                  ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                <div className="p-4 relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-bold text-lg ${(tournament.config as unknown as TournamentConfig)?.theme === theme.id ? 'text-primary' : 'text-white'}`}>
                      {theme.name}
                    </span>
                    {(tournament.config as unknown as TournamentConfig)?.theme === theme.id && (
                      <span className="bg-primary text-white text-xs px-2 py-1 rounded font-bold">ACTIVO</span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted mb-4">{theme.description}</p>
                  
                  {/* Mini Preview */}
                  <div className="h-24 rounded-lg overflow-hidden relative border border-white/10" style={{ background: theme.palette.background }}>
                     <div className="absolute inset-0 opacity-30" style={{ background: theme.palette.backgroundAlt }}></div>
                     <div className="absolute top-2 left-2 right-2 h-2 rounded-full" style={{ background: theme.palette.surface }}></div>
                     <div className="absolute top-6 left-2 w-1/3 h-16 rounded" style={{ background: theme.palette.surfaceAlt, borderColor: theme.palette.accent, borderWidth: theme.shapes.borderWidth }}></div>
                     <div className="absolute top-6 right-2 w-1/2 h-8 rounded" style={{ background: theme.palette.accent }}></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Collaborators Section */}
        {permissions && onAddCollaborator && onRemoveCollaborator && (
          <TournamentCollaboratorsSection
            tournament={tournament}
            permissions={permissions}
            canManagePermissions={canManagePermissions}
            onAddCollaborator={onAddCollaborator}
            onRemoveCollaborator={onRemoveCollaborator}
            themeId={themeId}
          />
        )}

        <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
          <h4 className="text-red-400 font-bold mb-2">Zona de Peligro</h4>
          <p className="text-text-muted text-sm mb-4">
            Eliminar el torneo borrará permanentemente todos los datos asociados, incluyendo participantes y partidos.
          </p>
          <AppButton 
            onClick={onDeleteTournament}
            variant="danger"
            theme={themeId}
            leftIcon={<Trash2 size={16} />}
            disabled={!canEdit}
          >
            Eliminar Torneo
          </AppButton>
        </div>
      </div>
    </motion.div>
  );
};
