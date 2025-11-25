import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { LogOut, User, Trophy } from 'lucide-react';

export const Navbar = () => {
  const { user, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();

  const isDashboardActive = location.pathname === '/admin/dashboard';
  const isUsersActive = location.pathname === '/admin/users';

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
      <div className="navbar-stripe hidden"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-linear-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight group-hover:text-primary transition-colors app-title">
                Tournament Maker
              </span>
            </Link>
            
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                {user && (
                  <Link
                    to="/admin/dashboard"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDashboardActive 
                        ? 'bg-surface-highlight text-white border border-border' 
                        : 'text-text-muted hover:text-white hover:bg-surface-highlight'
                    }`}
                  >
                    <Trophy size={16} />
                    Torneos
                  </Link>
                )}
                {user && isSuperAdmin && (
                  <Link
                    to="/admin/users"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isUsersActive
                        ? 'bg-surface-highlight text-white border border-border'
                        : 'text-text-muted hover:text-white hover:bg-surface-highlight'
                    }`}
                  >
                    <User size={16} />
                    Usuarios
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-text-muted bg-surface/50 px-3 py-1.5 rounded-full border border-border">
                  <User size={14} />
                  <span className="hidden sm:block">{user.email}</span>
                </div>
                
                <Link
                  to="/account"
                  className="text-text-muted hover:text-white transition-colors text-sm font-medium"
                >
                  Mi cuenta
                </Link>

                <button
                  onClick={() => signOut()}
                  className="text-text-muted hover:text-white transition-colors p-2 hover:bg-surface-highlight rounded-lg"
                  title="Cerrar sesión"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-2 px-4">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
