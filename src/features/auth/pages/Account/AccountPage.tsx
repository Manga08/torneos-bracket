import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  updateCurrentUserProfile,
  updateCurrentUserEmail,
  updateCurrentUserPassword,
} from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

export function AccountPage() {
  const { user, profile, loading, checkSession } = useAuth();
  const navigate = useNavigate();

  // Estado para perfil
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Estado para email
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Estado para password
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user && profile) {
      setDisplayName(profile.display_name || user.user_metadata?.full_name || '');
    }
  }, [user, profile, loading, navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await updateCurrentUserProfile({ display_name: displayName });
      await checkSession(); // Recargar sesión para actualizar el store
      setProfileSuccess('Perfil actualizado correctamente.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      setProfileError(err.message || 'Error al actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    if (!newEmail) {
      setEmailError('Ingresa un email válido.');
      setSavingEmail(false);
      return;
    }

    try {
      await updateCurrentUserEmail(newEmail);
      setEmailSuccess('Te hemos enviado un correo de confirmación al nuevo email.');
      setNewEmail('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      setEmailError(err.message || 'Error al actualizar el email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      setSavingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      setSavingPassword(false);
      return;
    }

    try {
      await updateCurrentUserPassword(newPassword);
      setPasswordSuccess('Contraseña actualizada correctamente.');
      setNewPassword('');
      setConfirmNewPassword('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      setPasswordError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex justify-center items-start pt-10 pb-20">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Mi Cuenta</h1>
          <p className="text-text-muted mt-2">Gestiona tu información personal y seguridad</p>
        </div>

        {/* Sección Perfil */}
        <div className="glass-card p-8 animate-fade-in">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            Información de Perfil
          </h2>

          {profileSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {profileError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Nombre a mostrar
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-modern"
                placeholder="Tu nombre"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingProfile} className="btn-primary px-6">
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>

        {/* Sección Email */}
        <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </span>
            Correo Electrónico
          </h2>

          {emailSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
              {emailSuccess}
            </div>
          )}
          {emailError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {emailError}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-text-muted mb-1.5">Email actual</label>
            <div className="p-3 bg-surface-highlight rounded-lg text-white border border-border">
              {user?.email}
            </div>
          </div>

          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Nuevo email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input-modern"
                placeholder="nuevo@email.com"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingEmail || !newEmail}
                className="btn-ghost border border-border hover:bg-surface-highlight px-6"
              >
                {savingEmail ? 'Enviando...' : 'Actualizar email'}
              </button>
            </div>
          </form>
        </div>

        {/* Sección Contraseña */}
        <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            Seguridad
          </h2>

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-modern"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="input-modern"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="btn-ghost border border-border hover:bg-surface-highlight px-6"
              >
                {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
