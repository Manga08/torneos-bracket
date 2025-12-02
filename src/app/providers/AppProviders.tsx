import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/useAuth';

const AuthBootstrapper = () => {
  const { checkSession } = useAuth();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return null;
};

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthBootstrapper />
      {children}
    </BrowserRouter>
  );
};
