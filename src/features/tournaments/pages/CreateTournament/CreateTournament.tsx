import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Users, Gamepad2, Settings, Palette } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AVAILABLE_THEMES as THEMES } from '@/features/themes/config/themeRegistry';
import { useBodyTheme } from '@/features/themes/hooks/useBodyTheme';
import { useTournamentTheme } from '@/features/themes/hooks/useTournamentTheme';
import { AppButton } from '@/shared/components/ui/AppButton';
import { useAuthStore } from '@/shared/store/authStore';

import { createTournament, assignTournamentPermissions } from '../../api/tournamentsApi';

export const CreateTournament = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    game: 'valorant',
    format: 'single_elim',
    participants_count: 8,
    is_public: false,
    has_third_place: false,
    theme: 'default',
  });

  // Apply theme preview
  const { themeId } = useTournamentTheme({ themeIdFromTournament: formData.theme });
  useBodyTheme(themeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // eslint-disable-next-line no-console
    console.log('Intentando crear torneo con User ID:', user.id); // DEBUG

    setLoading(true);

    try {
      // 1. Crear el slug (url amigable)
      const slug =
        formData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') +
        '-' +
        Math.random().toString(36).substring(2, 7);

      // 2. Insertar torneo
      const dbFormat = formData.format === 'groups' ? 'single_elim' : formData.format;
      const config = {
        participants_count: formData.participants_count,
        ...(formData.format === 'groups' ? { original_format: 'groups' } : {}),
        has_third_place: formData.has_third_place,
        theme: formData.theme,
      };

      const { data: tournament, error: tournamentError } = await createTournament({
        name: formData.name,
        slug,
        game: formData.game,
        format: dbFormat,
        config,
        is_public: formData.is_public,
        created_by: user.id,
        status: 'draft',
      });

      if (tournamentError) throw tournamentError;

      // 3. Asignar permisos al creador
      const { error: permError } = await assignTournamentPermissions({
        user_id: user.id,
        tournament_id: tournament.id,
        can_edit: true,
      });

      if (permError) throw permError;

      // 4. Redirigir al editor
      navigate(`/admin/torneos/${tournament.id}`);
      toast.success('Torneo creado exitosamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating tournament:', error);
      const message = error instanceof Error ? error.message : 'Error al crear el torneo';

      if (message.includes('invalid input value for enum tournament_format')) {
        toast.error(
          'Tu BD aún no soporta formato Liga. Ejecuta el SQL docs/sql/league_migration.sql',
        );
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AppButton
        onClick={() => navigate('/admin/dashboard')}
        variant="ghost"
        theme={formData.theme}
        leftIcon={<ArrowLeft size={20} />}
        className="mb-6"
      >
        Volver al Dashboard
      </AppButton>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Crear Nuevo Torneo</h1>
            <p className="text-text-muted text-sm">
              Configura los detalles básicos de tu competición
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Nombre del Torneo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-modern"
              placeholder="Ej: Valorant Winter Cup 2025"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Juego */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2">
                <Gamepad2 size={16} /> Juego
              </label>
              <select
                value={formData.game}
                onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                className="input-modern appearance-none"
              >
                <option value="valorant">Valorant</option>
                <option value="fifa">FIFA / EA FC</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Formato */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2">
                <Settings size={16} /> Formato
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="input-modern appearance-none"
              >
                <option value="single_elim">Eliminación Directa</option>
                <option value="double_elim">Doble Eliminación</option>
                <option value="swiss">Suizo</option>
                <option value="groups">Fase de Grupos + Playoffs</option>
                <option value="league">Liga (Round Robin)</option>
              </select>
            </div>
          </div>

          {/* 3rd Place Option (Only for Single Elimination) */}
          {formData.format === 'single_elim' && (
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
              <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  name="has_third_place"
                  id="has_third_place"
                  checked={formData.has_third_place}
                  onChange={(e) => setFormData({ ...formData, has_third_place: e.target.checked })}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                />
                <label
                  htmlFor="has_third_place"
                  className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300"
                ></label>
              </div>
              <label
                htmlFor="has_third_place"
                className="text-sm text-gray-300 cursor-pointer select-none flex-1"
              >
                <span className="font-medium text-white block">
                  Incluir partido por el 3er Puesto
                </span>
                Genera automáticamente un partido entre los perdedores de las semifinales.
              </label>
            </div>
          )}

          {/* League Warning */}
          {formData.format === 'league' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
              <p className="font-bold mb-1">Formato Liga:</p>
              <p>Todos juegan contra todos. El ganador se decide por puntos.</p>
            </div>
          )}

          {/* Participantes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2">
              <Users size={16} /> Número de Participantes
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[4, 8, 16, 32].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setFormData({ ...formData, participants_count: count })}
                  className={`py-2 px-4 rounded-lg border transition-all ${
                    formData.participants_count === count
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              * Podrás añadir o quitar participantes manualmente después.
            </p>
          </div>

          {/* Visibilidad */}
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary bg-gray-700"
            />
            <label htmlFor="is_public" className="text-sm text-gray-300 cursor-pointer select-none">
              <span className="font-medium text-white block">Hacer público el torneo</span>
              Cualquiera con el enlace podrá ver el bracket y resultados.
            </label>
          </div>

          {/* Theme Selection */}
          <div className="p-6 bg-surface border border-border rounded-xl mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Palette size={20} className="text-primary" />
              Apariencia
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, theme: theme.id })}
                  className={`
                    relative group overflow-hidden rounded-xl border-2 text-left transition-all duration-300
                    ${
                      formData.theme === theme.id
                        ? 'border-primary bg-surface-highlight'
                        : 'border-border bg-surface hover:border-white/20'
                    }
                  `}
                >
                  <div className="p-4 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`font-bold text-lg ${formData.theme === theme.id ? 'text-primary' : 'text-white'}`}
                      >
                        {theme.name}
                      </span>
                      {formData.theme === theme.id && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded font-bold">
                          SELECCIONADO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted mb-4">{theme.description}</p>

                    {/* Mini Preview */}
                    <div
                      className="h-16 rounded-lg overflow-hidden relative border border-white/10"
                      style={{ background: theme.palette.background }}
                    >
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{ background: theme.palette.backgroundAlt }}
                      ></div>
                      <div
                        className="absolute top-2 left-2 right-2 h-2 rounded-full"
                        style={{ background: theme.palette.surface }}
                      ></div>
                      <div
                        className="absolute top-5 left-2 w-1/3 h-8 rounded"
                        style={{
                          background: theme.palette.surfaceAlt,
                          borderColor: theme.palette.accent,
                          borderWidth: theme.shapes.borderWidth,
                        }}
                      ></div>
                      <div
                        className="absolute top-5 right-2 w-1/2 h-4 rounded"
                        style={{ background: theme.palette.accent }}
                      ></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <AppButton
              type="submit"
              variant="primary"
              theme={formData.theme}
              fullWidth
              isLoading={loading}
              leftIcon={<Trophy size={18} />}
              className="py-3 text-lg"
            >
              Crear Torneo
            </AppButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
