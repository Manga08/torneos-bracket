import { Loader2, Edit2, Check, X, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { AppButton } from '@/shared/components/ui/AppButton';

import type { Profile } from '../api/usersApi';
import type { UserRole } from '../types/authTypes';

interface UserTableProps {
  profiles: Profile[];
  availableRoles: UserRole[];
  onRoleChange: (profileId: string, newRole: UserRole) => void;
  onDisplayNameChange: (profileId: string, newDisplayName: string) => void;
  onSendPasswordReset: (profileId: string, email: string) => void;
  loading: boolean;
  error: string | null;
}

export const UserTable = ({
  profiles,
  availableRoles,
  onRoleChange,
  onDisplayNameChange,
  onSendPasswordReset,
  loading,
  error,
}: UserTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (profile: Profile) => {
    setEditingId(profile.id);
    setEditName(profile.display_name || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEditing = (profileId: string) => {
    if (editName.trim()) {
      onDisplayNameChange(profileId, editName.trim());
    }
    setEditingId(null);
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg text-center">
        {error}
      </div>
    );
  }

  if (profiles.length === 0) {
    return <div className="text-center py-12 text-text-muted">No se encontraron usuarios.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border text-text-muted text-sm">
            <th className="py-3 px-4 font-medium">Email</th>
            <th className="py-3 px-4 font-medium">Nombre</th>
            <th className="py-3 px-4 font-medium">Rol</th>
            <th className="py-3 px-4 font-medium">Fecha Registro</th>
            <th className="py-3 px-4 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {profiles.map((profile) => (
            <tr key={profile.id} className="hover:bg-surface-highlight/50 transition-colors">
              <td className="py-3 px-4 text-white">{profile.email || '-'}</td>
              <td className="py-3 px-4 text-text-muted">
                {editingId === profile.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-surface-dark border border-border rounded px-2 py-1 text-sm text-white focus:border-primary outline-none w-32"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing(profile.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <button
                      onClick={() => saveEditing(profile.id)}
                      className="text-emerald-400 hover:text-emerald-300 p-1"
                    >
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <span>{profile.display_name || '-'}</span>
                    <button
                      onClick={() => startEditing(profile)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary transition-all p-1"
                      title="Editar nombre"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                <select
                  value={profile.role || 'viewer'}
                  onChange={(e) => onRoleChange(profile.id, e.target.value as UserRole)}
                  className="bg-surface-dark border border-border rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-3 px-4 text-text-muted text-sm">
                {new Date(profile.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => profile.email && onSendPasswordReset(profile.id, profile.email)}
                  leftIcon={<KeyRound size={14} />}
                  className="text-text-muted hover:text-warning hover:bg-surface-highlight"
                >
                  Reset Pass
                </AppButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
