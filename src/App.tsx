import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/admin/Dashboard';
import { CreateTournament } from './pages/admin/CreateTournament';
import { TournamentDetail } from './pages/admin/TournamentDetail';
import { PublicTournamentView } from './pages/public/PublicTournamentView';
import { useAuthStore } from './store/authStore';

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthStore();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Rutas Públicas */}
          <Route path="/t/:slug" element={<PublicTournamentView />} />
          <Route index element={
            <div className="text-center py-32">
              <div className="inline-block p-2 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-primary mb-6 animate-fade-in">
                Gestión profesional de torneos
              </div>
              <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight bg-linear-to-b from-white to-white/50 bg-clip-text text-transparent animate-slide-up">
                TOURNAMENT<br />MAKER
              </h1>
              <p className="text-xl text-text-muted max-w-2xl mx-auto mb-10 animate-slide-up">
                Crea, gestiona y comparte brackets de torneos con una experiencia visual moderna y actualizaciones en tiempo real.
              </p>
              <div className="flex justify-center gap-4 animate-slide-up">
                <a href="/login" className="btn-primary text-lg px-8 py-3">Comenzar ahora</a>
                <a href="#" className="btn-ghost text-lg px-8 py-3">Ver demo</a>
              </div>
            </div>
          } />
          <Route path="login" element={<LoginPage />} />
          
          {/* Rutas Admin */}
          <Route path="admin">
            <Route path="dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="torneos/new" element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            } />
            <Route path="torneos/:id" element={
              <ProtectedRoute>
                <TournamentDetail />
              </ProtectedRoute>
            } />
            {/* Más rutas admin aquí */}
          </Route>
          {/* Rutas Públicas de Torneos */}
          <Route path="torneos">
            <Route path=":id" element={<PublicTournamentView />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
