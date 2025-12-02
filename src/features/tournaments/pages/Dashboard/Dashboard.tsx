import { motion } from 'framer-motion';
import { Plus, Users, Trophy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useDashboardTournaments } from '../../hooks/useDashboardTournaments';
import type { TournamentConfig } from '../../types';

export const Dashboard = () => {
  const { tournaments, loading } = useDashboardTournaments();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mis Torneos</h1>
          <p className="text-text-muted mt-1">Gestiona tus competiciones activas</p>
        </div>
        <Link to="/admin/torneos/new" className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Nuevo Torneo
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-48 animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 glass-card border-dashed border-white/10"
        >
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-text-muted" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No hay torneos creados</h3>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            Comienza creando tu primer torneo para gestionar brackets, participantes y resultados.
          </p>
          <Link to="/admin/torneos/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={18} />
            Crear el primero
          </Link>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {tournaments.map((tournament) => (
            <motion.div key={tournament.id} variants={item}>
              <Link
                to={`/admin/torneos/${tournament.id}`}
                className="glass-card group block hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold px-2.5 py-1 bg-white/5 border border-white/10 rounded-md uppercase tracking-wider text-text-muted">
                    {tournament.game}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                      tournament.status === 'active'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : tournament.status === 'completed'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        tournament.status === 'active'
                          ? 'bg-green-400'
                          : tournament.status === 'completed'
                            ? 'bg-blue-400'
                            : 'bg-gray-400'
                      }`}
                    ></span>
                    {(() => {
                      const config =
                        typeof tournament.config === 'string'
                          ? JSON.parse(tournament.config)
                          : tournament.config;
                      const format =
                        (config as TournamentConfig)?.original_format || tournament.format;

                      return format === 'groups'
                        ? 'Fase de Grupos + Playoffs'
                        : format === 'single_elim'
                          ? 'Eliminación Directa'
                          : format === 'double_elim'
                            ? 'Doble Eliminación'
                            : format === 'swiss'
                              ? 'Suizo'
                              : format;
                    })()}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2 text-white group-hover:text-primary transition-colors">
                  {tournament.name}
                </h3>

                <div className="flex items-center gap-4 text-sm text-text-muted mt-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Users size={16} />
                    <span>
                      {(tournament.config as TournamentConfig)?.participants_count || 0}{' '}
                      Participantes
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs group-hover:translate-x-1 transition-transform">
                      Gestionar
                    </span>
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
