import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';

import type { ThemeId } from '@/features/themes/types/themeTypes';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Switch } from '@/shared/components/ui/Switch';

interface RestartTournamentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (regenerateSchedule: boolean) => void;
  theme?: ThemeId;
  isLoading?: boolean;
}

export const RestartTournamentDialog = ({
  isOpen,
  onClose,
  onConfirm,
  theme,
  isLoading = false,
}: RestartTournamentDialogProps) => {
  const [regenerateSchedule, setRegenerateSchedule] = useState(false);

  const handleConfirm = () => {
    onConfirm(regenerateSchedule);
  };

  const handleClose = () => {
    if (!isLoading) {
      setRegenerateSchedule(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 100 }}
          />

          {/* Dialog */}
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 101 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-content w-full max-w-md p-6 pointer-events-auto m-4"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <RotateCcw size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Reiniciar Torneo</h3>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-text-muted hover:text-white transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Warning message */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200/90">
                  Esto borrará todos los resultados cargados (marcadores, ganadores y estadísticas
                  por partido).
                </p>
              </div>

              {/* Switch option */}
              <div className="mb-6 p-3 rounded-lg bg-surface-dark border border-white/5">
                <Switch
                  checked={regenerateSchedule}
                  onChange={setRegenerateSchedule}
                  label="También regenerar calendario"
                  helperText="Si activas esto, se reordenarán los partidos y jornadas según el generador."
                  disabled={isLoading}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <AppButton
                  onClick={handleClose}
                  variant="ghost"
                  size="sm"
                  theme={theme}
                  disabled={isLoading}
                >
                  Cancelar
                </AppButton>
                <AppButton
                  onClick={handleConfirm}
                  variant="danger"
                  size="sm"
                  theme={theme}
                  disabled={isLoading}
                  leftIcon={isLoading ? undefined : <RotateCcw size={16} />}
                >
                  {isLoading ? 'Reiniciando...' : 'Reiniciar'}
                </AppButton>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
