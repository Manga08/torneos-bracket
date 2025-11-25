import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, Shield, Mail } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import type { Tournament } from '../../../../types/database';
import type { TournamentPermission } from '../../types/permissions';

interface TournamentCollaboratorsSectionProps {
  tournament: Tournament;
  permissions: TournamentPermission[];
  canManagePermissions: boolean;
  onAddCollaborator: (email: string) => Promise<void>;
  onRemoveCollaborator: (permissionId: string) => Promise<void>;
  themeId?: string;
}

export const TournamentCollaboratorsSection = ({
  permissions,
  canManagePermissions,
  onAddCollaborator,
  onRemoveCollaborator,
  themeId
}: TournamentCollaboratorsSectionProps) => {
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAdding(true);
    try {
      await onAddCollaborator(email.trim());
      setEmail('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setIsRemoving(id);
    try {
      await onRemoveCollaborator(id);
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="p-6 bg-surface border border-border rounded-xl mt-6">
      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Users size={20} className="text-primary" />
        Colaboradores
      </h4>
      
      <p className="text-sm text-text-muted mb-6">
        Los colaboradores tienen permisos para editar el torneo, gestionar participantes y actualizar resultados.
        Solo el creador del torneo puede gestionar esta lista.
      </p>

      {/* Add Collaborator Form */}
      {canManagePermissions && (
        <form onSubmit={handleAdd} className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-text-muted" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email del usuario..."
              className="w-full bg-surface-dark border border-border rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <AppButton
            type="submit"
            variant="primary"
            theme={themeId}
            disabled={!email.trim() || isAdding}
            isLoading={isAdding}
            leftIcon={<UserPlus size={16} />}
          >
            Añadir
          </AppButton>
        </form>
      )}

      {/* Collaborators List */}
      <div className="space-y-2">
        {permissions.length === 0 ? (
          <div className="text-center py-8 text-text-muted bg-surface-dark rounded-lg border border-border border-dashed">
            No hay colaboradores asignados.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {permissions.map((permission) => (
              <motion.div
                key={permission.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 bg-surface-dark rounded-lg border border-border group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Shield size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {permission.profile?.username || permission.profile?.email || 'Usuario desconocido'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {permission.profile?.email || 'Sin email visible'}
                    </p>
                  </div>
                </div>

                {canManagePermissions && (
                  <AppButton
                    onClick={() => handleRemove(permission.id)}
                    variant="ghost"
                    size="sm"
                    theme={themeId}
                    isLoading={isRemoving === permission.id}
                    className="text-text-muted hover:text-red-400 hover:bg-red-400/10"
                    title="Eliminar permiso"
                  >
                    <Trash2 size={16} />
                  </AppButton>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
