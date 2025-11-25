import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Upload, FileText, Trophy, Shuffle } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { BracketView } from '../../components/bracket/BracketView';
import type { Tournament, Participant } from '../../../../types/database';

interface TournamentConfig {
  participants_count?: number;
  original_format?: string;
  has_third_place?: boolean;
  logo_url?: string;
  theme?: string;
  [key: string]: unknown;
}

export interface TournamentSetupSectionProps {
  tournament: Tournament;
  participants: Participant[];
  themeId?: string;
  
  // Form states
  newParticipantName: string;
  addingParticipant: boolean;
  selectedSlot: {seedIndex: number, participant?: Participant} | null;
  
  // Import states
  isImportModalOpen: boolean;
  importText: string;
  importing: boolean;
  
  // Callbacks
  onNewParticipantNameChange: (value: string) => void;
  onAddParticipant: (e?: React.FormEvent) => void;
  onSelectSlot: (slot: {seedIndex: number, participant?: Participant} | null) => void;
  
  onOpenImportModal: () => void;
  onCloseImportModal: () => void;
  onImportTextChange: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportParticipants: () => void;
  
  onUpdateConfig: (config: TournamentConfig) => void;
  onRandomizeSeeds: () => void;
  
  // Bracket View Callbacks
  onSlotClick: (seedIndex: number, participant?: Participant) => void;
  onParticipantMove: (fromSeed: number, toSeed: number) => void;
  onDeleteParticipant: (participantId: string) => void;
  
  // Edit permissions
  canEdit?: boolean;
}

export const TournamentSetupSection = ({
  tournament,
  participants,
  themeId,
  newParticipantName,
  addingParticipant,
  selectedSlot,
  isImportModalOpen,
  importText,
  importing,
  onNewParticipantNameChange,
  onAddParticipant,
  onSelectSlot,
  onOpenImportModal,
  onCloseImportModal,
  onImportTextChange,
  onFileUpload,
  onImportParticipants,
  onUpdateConfig,
  onRandomizeSeeds,
  onSlotClick,
  onParticipantMove,
  onDeleteParticipant,
  canEdit = true
}: TournamentSetupSectionProps) => {
  
  const tournamentFormat = ((tournament.config as unknown as TournamentConfig)?.original_format as Tournament['format']) || tournament.format;

  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Add Participant Form */}
      {canEdit && (
        <div className="mb-8">
          <div className="flex gap-4 items-start">
            <form onSubmit={onAddParticipant} className="relative flex-1">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-linear-to-r from-primary/50 to-purple-600/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur"></div>
                <div className="relative flex items-center bg-surface rounded-xl border border-border p-2 shadow-xl">
                  <div className="pl-4 text-text-muted">
                    <Users size={20} />
                  </div>
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => onNewParticipantNameChange(e.target.value)}
                    className="w-full bg-transparent border-none text-white placeholder:text-text-muted focus:ring-0 px-4 py-3 text-lg focus:outline-none"
                    placeholder={selectedSlot ? `Añadir en posición #${selectedSlot.seedIndex + 1}...` : "Nombre del participante..."}
                    autoFocus
                  />
                  
                  {selectedSlot && (
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20 mr-2 animate-fade-in">
                      <span>Slot #{selectedSlot.seedIndex + 1}</span>
                      <button type="button" onClick={() => onSelectSlot(null)} className="hover:text-white transition-colors"><X size={12} /></button>
                    </div>
                  )}

                  <AppButton
                    type="submit"
                    disabled={addingParticipant || !newParticipantName.trim()}
                    variant={themeId === 'valorant' ? 'secondary' : 'primary'}
                    theme={themeId}
                    isLoading={addingParticipant}
                    leftIcon={<Plus size={16} />}
                    className={themeId === 'valorant' ? 'bg-white/5 hover:bg-white/10 border-l border-white/10 rounded-none! h-full px-6' : ''}
                  >
                    Añadir
                  </AppButton>
                </div>
              </div>
            </form>
            
            <AppButton
              onClick={onOpenImportModal}
              variant="secondary"
              theme={themeId}
              className="h-16 min-w-[100px] flex-col gap-1"
              title="Importar lista"
            >
              <Upload size={18} />
              <span className="text-xs font-medium">Importar</span>
            </AppButton>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload size={20} className="text-primary" />
                  Importar Participantes
                </h3>
                <button onClick={onCloseImportModal} className="text-text-muted hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* File Upload Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Opción 1: Subir archivo (CSV/Excel)</label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors relative group">
                    <input 
                      type="file" 
                      accept=".csv,.txt" 
                      onChange={onFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileText size={32} className="mx-auto text-text-muted mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-sm text-white font-medium">Haz clic o arrastra un archivo aquí</p>
                    <p className="text-xs text-text-muted mt-1">Formatos soportados: .csv, .txt</p>
                  </div>
                  <p className="text-xs text-text-muted">
                    El archivo debe contener una lista de nombres, uno por fila. La primera columna se usará como nombre.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface px-2 text-text-muted">O pegar manualmente</span>
                  </div>
                </div>

                {/* Text Area Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Opción 2: Pegar lista</label>
                  <textarea
                    value={importText}
                    onChange={(e) => onImportTextChange(e.target.value)}
                    className="w-full h-32 bg-surface-dark border border-border rounded-lg p-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none font-mono text-sm"
                    placeholder="Jugador 1&#10;Jugador 2&#10;Jugador 3..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface-dark">
                <AppButton
                  onClick={onCloseImportModal}
                  variant="ghost"
                  theme={themeId}
                  size="sm"
                >
                  Cancelar
                </AppButton>
                <AppButton
                  onClick={onImportParticipants}
                  disabled={importing || !importText.trim()}
                  variant="primary"
                  theme={themeId}
                  size="sm"
                  isLoading={importing}
                  leftIcon={<Upload size={16} />}
                >
                  Importar Lista
                </AppButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Bracket Preview */}
      <div className="glass-card border-dashed border-border min-h-[300px] relative">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 px-4 gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-primary" /> 
            Vista Previa del Bracket
          </h3>
          
          <div className="flex flex-wrap items-center gap-6">
            {/* 3rd Place Toggle for Single Elimination */}
            {tournamentFormat === 'single_elim' && (
              <div className="flex items-center gap-3">
                <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                  <input
                    type="checkbox"
                    name="has_third_place_preview"
                    id="has_third_place_preview"
                    checked={(tournament.config as unknown as TournamentConfig)?.has_third_place || false}
                    onChange={(e) => {
                      const newConfig = { 
                        ...(typeof tournament.config === 'string' ? JSON.parse(tournament.config) : tournament.config),
                        has_third_place: e.target.checked 
                      };
                      onUpdateConfig(newConfig);
                    }}
                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                  />
                  <label 
                    htmlFor="has_third_place_preview" 
                    className="toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300"
                  ></label>
                </div>
                <label htmlFor="has_third_place_preview" className="text-sm text-text-muted cursor-pointer select-none hover:text-white transition-colors">
                  Incluir 3er Puesto
                </label>
              </div>
            )}

            <div className="h-4 w-px bg-surface-highlight hidden md:block"></div>

            <div className="text-xs text-text-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white/20"></span> 
              <span className="hidden sm:inline">Arrastra para mover</span>
            </div>
            
            {canEdit && (
              <AppButton 
                onClick={onRandomizeSeeds}
                variant="secondary"
                theme={themeId}
                size="sm"
                leftIcon={<Shuffle size={14} />}
              >
                <span className="hidden sm:inline">Aleatorizar</span>
              </AppButton>
            )}
          </div>
        </div>
        
        <div className="overflow-hidden pb-4">
          <BracketView 
            tournamentId={tournament.id} 
            participants={participants} 
            isDraft={true} 
            format={tournamentFormat}
            hasThirdPlace={!!(tournament.config as unknown as TournamentConfig)?.has_third_place}
            onSlotClick={onSlotClick}
            onParticipantMove={onParticipantMove}
            onDeleteParticipant={onDeleteParticipant}
          />
        </div>

        {/* Only show slot info if selected for adding */}
        {selectedSlot && !selectedSlot.participant && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-full shadow-xl p-2 flex items-center gap-2 z-10"
          >
            <span className="px-3 text-sm font-medium text-white">
              Añadiendo en Slot #{selectedSlot.seedIndex + 1}
            </span>
            <button 
              onClick={() => onSelectSlot(null)}
              className="p-1 text-text-muted hover:text-white rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
