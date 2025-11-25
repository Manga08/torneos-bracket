import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchProfiles, updateUserRole, updateUserProfile } from '../../api/usersApi';
import { sendPasswordResetEmail } from '../../api/authApi';
import type { Profile } from '../../api/usersApi';
import type { UserRole } from '../../types/authTypes';
import { UserTable } from '../../components/UserTable';
import { Search, Users, Shield, UserCheck } from 'lucide-react';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';

const AVAILABLE_ROLES: UserRole[] = ['super_admin', 'admin', 'editor', 'viewer'];

export function UserManagement() {
  const { user, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user || !isSuperAdmin) {
        navigate('/');
      }
    }
  }, [user, isSuperAdmin, loading, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    async function loadProfiles() {
      try {
        setLoadingList(true);
        setError(null);
        const data = await fetchProfiles({ search, page: 1, pageSize: 50 });
        setProfiles(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error cargando usuarios';
        setError(message);
      } finally {
        setLoadingList(false);
      }
    }

    loadProfiles();
  }, [search, isSuperAdmin]);

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const updated = await updateUserRole(profileId, newRole);
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? updated : p)),
      );
      setSuccessMessage('Rol actualizado correctamente.');
    } catch (err: unknown) {
      console.error('[handleRoleChange] error', err);
      const message = err instanceof Error ? err.message : 'Error actualizando rol';
      setError(message);
    }
  };

  const handleDisplayNameChange = async (profileId: string, newDisplayName: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const updated = await updateUserProfile(profileId, { display_name: newDisplayName });
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? updated : p)),
      );
      setSuccessMessage('Nombre actualizado correctamente.');
    } catch (err: unknown) {
      console.error('[handleDisplayNameChange] error', err);
      const message = err instanceof Error ? err.message : 'Error actualizando nombre';
      setError(message);
    }
  };

  const openResetDialog = (profileId: string, email: string) => {
    setUserToReset({ id: profileId, email });
    setResetDialogOpen(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!userToReset) return;

    try {
      setError(null);
      setSuccessMessage(null);
      await sendPasswordResetEmail(userToReset.email);
      setSuccessMessage(`Correo de recuperación enviado a ${userToReset.email}.`);
    } catch (err: unknown) {
      console.error('[handleSendPasswordReset] error', err);
      const message = err instanceof Error ? err.message : 'Error enviando correo de recuperación';
      setError(message);
    } finally {
      setResetDialogOpen(false);
      setUserToReset(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!isSuperAdmin) return null;

  // Stats calculation
  const totalUsers = profiles.length;
  const adminsCount = profiles.filter(p => p.role === 'admin' || p.role === 'super_admin').length;
  const viewersCount = profiles.filter(p => p.role === 'viewer').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gestión de Usuarios</h1>
        <p className="text-text-muted">Administra los roles y permisos de los usuarios de la plataforma.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/20 text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-text-muted text-sm">Total Usuarios</p>
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-text-muted text-sm">Administradores</p>
            <p className="text-2xl font-bold text-white">{adminsCount}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-text-muted text-sm">Viewers</p>
            <p className="text-2xl font-bold text-white">{viewersCount}</p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          {error}
        </div>
      )}

      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-white">Lista de Usuarios</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
            <input
              type="text"
              placeholder="Buscar por email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-modern !pl-10 w-full sm:w-80"
            />
          </div>
        </div>

        <UserTable
          profiles={profiles}
          availableRoles={AVAILABLE_ROLES}
          onRoleChange={handleRoleChange}
          onDisplayNameChange={handleDisplayNameChange}
          onSendPasswordReset={openResetDialog}
          loading={loadingList}
          error={null}
        />
      </div>

      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleConfirmPasswordReset}
        title="Enviar correo de recuperación"
        message={`¿Estás seguro de que deseas enviar un correo de recuperación de contraseña a ${userToReset?.email}? El usuario recibirá instrucciones para restablecer su acceso.`}
        confirmText="Enviar correo"
        cancelText="Cancelar"
      />
    </div>
  );
}
