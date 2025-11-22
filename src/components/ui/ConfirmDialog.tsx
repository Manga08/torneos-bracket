import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 pointer-events-auto m-4"
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
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-white transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isDestructive 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
