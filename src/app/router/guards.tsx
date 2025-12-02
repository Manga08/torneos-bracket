import { Navigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/useAuth';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
