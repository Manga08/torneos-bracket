import { Routes, Route } from 'react-router-dom';

import { AccountPage } from '@/features/auth/pages/Account/AccountPage';
import { LoginPage } from '@/features/auth/pages/LoginPage/LoginPage';
import { RegisterPage } from '@/features/auth/pages/Register/RegisterPage';
import { UserManagement } from '@/features/auth/pages/UserManagement/UserManagement';
import { TournamentDetail } from '@/features/tournaments/pages/AdminTournamentDetail/TournamentDetail';
import { CreateTournament } from '@/features/tournaments/pages/CreateTournament/CreateTournament';
import { Dashboard } from '@/features/tournaments/pages/Dashboard/Dashboard';
import { PublicTournamentView } from '@/features/tournaments/pages/PublicTournamentView/PublicTournamentView';

import { AppLayout } from '../layout';

import { ProtectedRoute } from './guards';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Rutas Públicas */}
        <Route path="/t/:slug" element={<PublicTournamentView />} />
        <Route
          index
          element={
            <div className="text-center py-32">
              <div className="inline-block p-2 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-primary mb-6 animate-fade-in">
                Gestión profesional de torneos
              </div>
              <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight bg-linear-to-b from-white to-white/50 bg-clip-text text-transparent animate-slide-up">
                TOURNAMENT
                <br />
                MAKER
              </h1>
              <p className="text-xl text-text-muted max-w-2xl mx-auto mb-10 animate-slide-up">
                Crea, gestiona y comparte brackets de torneos con una experiencia visual moderna y
                actualizaciones en tiempo real.
              </p>
              <div className="flex justify-center gap-4 animate-slide-up">
                <a href="/login" className="btn-primary text-lg px-8 py-3">
                  Comenzar ahora
                </a>
                <a href="#" className="btn-ghost text-lg px-8 py-3">
                  Ver demo
                </a>
              </div>
            </div>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route
          path="account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />

        {/* Rutas Admin */}
        <Route path="admin">
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="torneos/new"
            element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="torneos/:id"
            element={
              <ProtectedRoute>
                <TournamentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          {/* Más rutas admin aquí */}
        </Route>
        {/* Rutas Públicas de Torneos */}
        <Route path="torneos">
          <Route path=":id" element={<PublicTournamentView />} />
        </Route>
      </Route>
    </Routes>
  );
};
