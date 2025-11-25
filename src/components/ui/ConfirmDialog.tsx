import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { AppButton } from './AppButton';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
}: ConfirmDialogProps) => {
  const isValorant = document.body.classList.contains('theme-valorant');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 100 }}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 101 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-content w-full max-w-md p-6 pointer-events-auto m-4"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'}`}>
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-text-muted mb-6 leading-relaxed">
                {message}
              </p>
              
              <div className="flex justify-end gap-3">
                <AppButton
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  theme={isValorant ? 'valorant' : undefined}
                >
                  {cancelText}
                </AppButton>
                <AppButton
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  variant={isDestructive ? 'danger' : 'primary'}
                  size="sm"
                  theme={isValorant ? 'valorant' : undefined}
                >
                  {confirmText}
                </AppButton>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
