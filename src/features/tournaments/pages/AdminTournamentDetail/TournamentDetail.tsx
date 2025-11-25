import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchTournamentById, 
  fetchTournamentParticipants, 
  fetchTournamentMatches,
  subscribeToTournamentChanges,
  subscribeToMatches,
  addParticipant,
  addParticipantsBulk,
  updateParticipant,
  upsertParticipants,
  deleteParticipant,
  updateTournament,
  insertMatches,
  updateMatch,
  fetchMatchById,
  fetchMatchesByRound,
  fetchPendingGroupMatches,
  deleteTournamentFull,
  fetchTournamentPermissions,
  addTournamentPermission,
  deleteTournamentPermission
} from '../../api/tournamentsApi';
import { fetchUserByEmail } from '../../../../shared/api/usersApi';
import { useAuthStore } from '../../../../store/authStore';
import type { Tournament, Participant, Match } from '../../../../types/database';
import type { TournamentPermission } from '../../types/permissions';
import { canEditTournament } from '../../utils/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSingleEliminationMatches, generateDoubleEliminationMatches, generateSwissMatches, generateGroupStageMatches } from '../../utils/bracketUtils';
import { BracketView } from '../../components/bracket/BracketView';
import { MatchResultModal } from '../../components/matches/MatchResultModal';
import { Toaster, toast } from 'sonner';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { calculateStandings, pairSwissRound } from '../../utils/tournamentLogic';
import { toPng } from 'html-to-image';
import { MatchListView } from '../../components/matches/MatchListView';
import { useBodyTheme } from '../../../../features/themes/hooks/useBodyTheme';
import { useTournamentTheme } from '../../../../features/themes/hooks/useTournamentTheme';
import { List, LayoutGrid, Trophy, Image as ImageIcon } from 'lucide-react';

import { AppButton } from '../../../../components/ui/AppButton';
import { TournamentAdminHeader } from '../../components/common/TournamentAdminHeader';
import { TournamentSettingsSection } from '../../components/settings/TournamentSettingsSection';
import { TournamentSetupSection } from '../../components/settings/TournamentSetupSection';

interface TournamentConfig {
  participants_count?: number;
  original_format?: string;
  has_third_place?: boolean;
  logo_url?: string;
  theme?: string;
  [key: string]: unknown;
}


interface UndoAction {
  type: 'MATCH_UPDATE';
  matchId: string;
  previousData: Match;
  relatedMatches: { id: string, data: Partial<Match> }[];
}

export const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'setup' | 'bracket' | 'settings'>('setup');
  
  // Permissions state
  const [permissions, setPermissions] = useState<TournamentPermission[] | null>(null);

  // Estado para nuevo participante
  const [newParticipantName, setNewParticipantName] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  
  // Estado para importación masiva
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  // Estado para gestión interactiva del bracket
  const [selectedSlot, setSelectedSlot] = useState<{seedIndex: number, participant?: Participant} | null>(null);

  // Estado para gestión de resultados
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [bracketRefreshKey, setBracketRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket');
  const [matches, setMatches] = useState<Match[]>([]); // Need matches state here for list view
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Load permissions
  useEffect(() => {
    if (!tournament?.id || !user?.id) return;

    let cancelled = false;

    fetchTournamentPermissions(tournament.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error fetching permissions:', error);
          setPermissions(null);
          return;
        }
        setPermissions(data ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [tournament?.id, user?.id]);

  const canEdit = canEditTournament({
    userId: user?.id,
    isSuperAdmin,
    tournament,
    permissions,
  });

  // Apply theme
  const { themeId } = useTournamentTheme({
    themeIdFromTournament: (tournament?.config as unknown as TournamentConfig)?.theme
  });
  useBodyTheme(themeId);

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    
    try {
      if (action.type === 'MATCH_UPDATE') {
        // Revert main match
        await updateMatch(action.matchId, {
          score_a: action.previousData.score_a,
          score_b: action.previousData.score_b,
          winner_id: action.previousData.winner_id,
          status: action.previousData.status,
          participant_a_id: action.previousData.participant_a_id,
          participant_b_id: action.previousData.participant_b_id
        });

        // Revert related matches
        for (const related of action.relatedMatches) {
           await updateMatch(related.id, {
             participant_a_id: related.data.participant_a_id,
             participant_b_id: related.data.participant_b_id,
           });
        }
      }
      
      setUndoStack(prev => prev.slice(0, -1));
      toast.success("Deshacer completado");
    } catch (e) {
      console.error(e);
      toast.error("Error al deshacer");
    }
  };
  
  // Ref para exportar imagen
  const bracketRef = useRef<HTMLDivElement>(null);

  // Efecto para cambiar automáticamente a la pestaña 'bracket' si el torneo está activo
  useEffect(() => {
    if (tournament?.status === 'active' || tournament?.status === 'completed') {
      setActiveTab('bracket');
    }
  }, [tournament?.status]);


  // Fetch matches for List View
  useEffect(() => {
    if (tournament?.status === 'active' || tournament?.status === 'completed') {
      const fetchMatches = async () => {
        const { data } = await fetchTournamentMatches(id!);
        
        if (data) setMatches(data);
      };
      
      fetchMatches();
      
      const unsubscribe = subscribeToMatches(id!, () => fetchMatches());
        
      return () => { unsubscribe(); };
    }
  }, [tournament?.status, id]);

  // Estado para diálogos de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchTournamentData = useCallback(async () => {
    try {
      const { data, error } = await fetchTournamentById(id!);
      
      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    try {
      const { data, error } = await fetchTournamentParticipants(id!);
      
      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTournamentData();
      fetchParticipants();
      
      // Suscripción a cambios en tiempo real
      const unsubscribe = subscribeToTournamentChanges(
        id,
        () => fetchParticipants(),
        () => setBracketRefreshKey(prev => prev + 1)
      );

      return () => {
        unsubscribe();
      };
    }
  }, [id, fetchTournamentData, fetchParticipants]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const names = lines
        .map(line => {
          const parts = line.split(/[,;]/);
          return parts[0].trim();
        })
        .filter(name => name && name.toLowerCase() !== 'nombre' && name.toLowerCase() !== 'name');

      if (names.length > 0) {
        setImportText(names.join('\n'));
        toast.success(`${names.length} nombres cargados del archivo`);
      } else {
        toast.error('No se encontraron nombres válidos en el archivo');
      }
    };
    reader.readAsText(file);
  };

  const handleImportParticipants = async () => {
    if (!importText.trim() || !id) return;
    setImporting(true);
    
    try {
      const names = importText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      if (names.length === 0) {
        toast.error('No se encontraron nombres válidos');
        setImporting(false);
        return;
      }

      // Get current max seed
      const usedSeeds = new Set(participants.map(p => p.seed));
      let nextSeed = 1;
      
      const newParticipants = [];
      
      for (const name of names) {
        while (usedSeeds.has(nextSeed)) {
          nextSeed++;
        }
        
        // Check duplicate in current list
        if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
           continue; // Skip duplicates
        }
        
        newParticipants.push({
          tournament_id: id,
          name: name,
          seed: nextSeed
        });
        
        usedSeeds.add(nextSeed);
      }
      
      if (newParticipants.length === 0) {
         toast.info('No hay participantes nuevos para importar');
         setImporting(false);
         setIsImportModalOpen(false);
         return;
      }

      const { error } = await addParticipantsBulk(newParticipants);
      if (error) throw error;
      
      toast.success(`${newParticipants.length} participantes importados`);
      setImportText('');
      setIsImportModalOpen(false);
      fetchParticipants();
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Error al importar participantes');
    } finally {
      setImporting(false);
    }
  };

  const handleExportImage = useCallback(async () => {
    if (bracketRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(bracketRef.current, { cacheBust: true, backgroundColor: '#111827' });
      const link = document.createElement('a');
      link.download = `bracket-${tournament?.slug || 'tournament'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Imagen descargada');
    } catch (err) {
      console.error('Error exporting image:', err);
      toast.error('Error al exportar imagen');
    }
  }, [bracketRef, tournament]);

  const handleAddParticipant = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newParticipantName.trim() || !id) return;

    // Validación de duplicados
    if (participants.some(p => p.name.toLowerCase() === newParticipantName.trim().toLowerCase())) {
      toast.error('Ya existe un participante con este nombre.');
      return;
    }

    setAddingParticipant(true);

    try {
      // Si hay un slot seleccionado y está vacío, usamos ese seed. Si no, el siguiente disponible.
      // Nota: La lógica actual de backend asigna seed automáticamente si no se envía, 
      // pero aquí queremos controlarlo.
      
      // Encontrar el primer seed disponible si no hay selección específica
      const usedSeeds = new Set(participants.map(p => p.seed));
      let targetSeed = 1;
      while (usedSeeds.has(targetSeed)) {
        targetSeed++;
      }

      // Si seleccionamos un slot vacío explícitamente, intentamos usar ese (seedIndex es 0-based)
      if (selectedSlot && !selectedSlot.participant) {
         targetSeed = selectedSlot.seedIndex + 1;
      }

      const { data, error } = await addParticipant({
          tournament_id: id,
          name: newParticipantName.trim(),
          seed: targetSeed
        });

      if (error) throw error;
      
      if (data) {
        setParticipants(prev => [...prev, data]);
        toast.success('Participante añadido correctamente');
      }
      
      setNewParticipantName('');
      setSelectedSlot(null); // Limpiar selección
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('Error al añadir participante');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleSwapSeeds = async (p1: Participant, p2: Participant) => {
    // Optimistic update
    const p1Seed = p1.seed;
    const p2Seed = p2.seed;
    
    const updatedParticipants = participants.map(p => {
      if (p.id === p1.id) return { ...p, seed: p2Seed };
      if (p.id === p2.id) return { ...p, seed: p1Seed };
      return p;
    });
    
    setParticipants(updatedParticipants);

    try {
      // Update DB
      const { error: e1 } = await updateParticipant(p1.id, { seed: p2Seed });
      if (e1) throw e1;
      const { error: e2 } = await updateParticipant(p2.id, { seed: p1Seed });
      if (e2) throw e2;
    } catch (error) {
      console.error('Error swapping seeds:', error);
      toast.error('Error al intercambiar posiciones');
      fetchParticipants(); // Revertir
    }
  };

  const handleMoveParticipant = async (participant: Participant, newSeed: number) => {
    // Optimistic update
    const updatedParticipants = participants.map(p => 
      p.id === participant.id ? { ...p, seed: newSeed } : p
    );
    setParticipants(updatedParticipants);

    try {
      const { error } = await updateParticipant(participant.id, { seed: newSeed });

      if (error) throw error;
    } catch (error) {
      console.error('Error moving participant:', error);
      toast.error('Error al mover participante');
      fetchParticipants(); // Revert
    }
  };

  const handleSlotClick = (seedIndex: number, participant?: Participant) => {
    // Si el slot ya tiene participante, no hacemos nada (la edición es por drag & drop)
    if (participant) {
      return;
    }

    // Si el slot está vacío, lo seleccionamos para añadir participante ahí
    if (selectedSlot?.seedIndex === seedIndex) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot({ seedIndex, participant: undefined });
    }
  };

  const handleParticipantMove = (fromSeed: number, toSeed: number) => {
    const fromSeed1Based = fromSeed + 1;
    const toSeed1Based = toSeed + 1;

    const p1 = participants.find(p => p.seed === fromSeed1Based);
    const p2 = participants.find(p => p.seed === toSeed1Based);

    if (p1) {
      if (p2) {
        handleSwapSeeds(p1, p2);
      } else {
        handleMoveParticipant(p1, toSeed1Based);
      }
    }
  };

  const handleRandomizeSeeds = async () => {
    if (participants.length < 2) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Aleatorizar Seeds',
      message: '¿Estás seguro de que quieres mezclar aleatoriamente las posiciones de todos los participantes? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        const shuffledParticipants = [...participants];
        // Fisher-Yates shuffle
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }

        // Assign new seeds 1..N based on new order
        const updatedParticipants = shuffledParticipants.map((p, index) => ({
          ...p,
          seed: index + 1
        }));

        setParticipants(updatedParticipants);

        try {
          const { error } = await upsertParticipants(updatedParticipants.map(p => ({
              id: p.id,
              tournament_id: id,
              name: p.name,
              seed: p.seed
            })));

          if (error) throw error;
          toast.success('Posiciones aleatorizadas');
        } catch (error) {
          console.error('Error randomizing seeds:', error);
          toast.error('Error al aleatorizar');
          fetchParticipants();
        }
      }
    });
  };

  const handleDeleteParticipant = async (participantId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Participante',
      message: '¿Estás seguro de eliminar este participante? Se eliminará del bracket.',
      isDestructive: true,
      onConfirm: async () => {
        const previousParticipants = [...participants];
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        setSelectedSlot(null);

        try {
          const { error } = await deleteParticipant(participantId);

          if (error) {
            setParticipants(previousParticipants);
            throw error;
          }
          toast.success('Participante eliminado');
        } catch (error) {
          console.error('Error deleting participant:', error);
          toast.error('Error al eliminar participante');
        }
      }
    });
  };

  const handleUpdateConfig = async (newConfig: TournamentConfig) => {
    if (!tournament || !id) return;
    
    setTournament({ ...tournament, config: newConfig });
    
    try {
      const { error } = await updateTournament(id, { config: newConfig });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Error al actualizar configuración');
    }
  };

  const handleStartTournament = async () => {
    if (!id) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Iniciar Torneo',
      message: '¿Estás seguro de iniciar el torneo? Se generará el bracket final y no podrás añadir más participantes.',
      onConfirm: async () => {
        try {
          if (!tournament) return;
          // 1. Generar estructura de partidos según formato
          let configObj = tournament.config;
          if (typeof configObj === 'string') {
            try {
              configObj = JSON.parse(configObj);
            } catch (e) {
              console.error('Error parsing config:', e);
              configObj = {};
            }
          }
          
          const format = (configObj as TournamentConfig)?.original_format || tournament.format;
          console.log('Generating matches for format:', format);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let matches: any[] = [];

          if (format === 'groups') {
            matches = generateGroupStageMatches(id, participants);
          } else if (format === 'double_elim') {
            matches = generateDoubleEliminationMatches(id, participants);
          } else if (format === 'swiss') {
            matches = generateSwissMatches(id, participants);
          } else {
            const hasThirdPlace = (configObj as TournamentConfig)?.has_third_place || false;
            matches = generateSingleEliminationMatches(id, participants, hasThirdPlace);
          }
      
      // 2. Insertar partidos en la base de datos
      const { error: matchesError } = await insertMatches(matches);

      if (matchesError) throw matchesError;

      // 3. Actualizar estado del torneo
      // 3. Actualizar estado del torneo
      const { error } = await updateTournament(id, { status: 'active' });

      if (error) throw error;
      
      // Actualizar estado local
      setTournament(prev => prev ? { ...prev, status: 'active' } : null);
      setActiveTab('bracket');
      toast.success('Torneo iniciado correctamente');
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast.error('Error al iniciar el torneo');
    }
      }
    });
  };

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setIsMatchModalOpen(true);
  };

  const advanceWinner = async (match: Match, winnerId: string) => {
    const loserId = match.participant_a_id === winnerId ? match.participant_b_id : match.participant_a_id;

    // 1. Advance Winner
    if (match.next_match_id) {
      const { data: nextMatch } = await fetchMatchById(match.next_match_id);
      if (nextMatch) {
        // Logic: Odd match number -> Slot A, Even match number -> Slot B
        const isSlotA = match.match_number % 2 !== 0;
        
        let updateData = {};
        
        // Special handling for Double Elimination
        if (nextMatch.stage === 'final') {
            // Grand Final Advancement
            if (match.stage === 'lower') {
                // Lower Final Winner -> Slot B (Bottom)
                updateData = { participant_b_id: winnerId };
            } else {
                // Upper Final Winner -> Slot A (Top)
                updateData = { participant_a_id: winnerId };
            }
        } else if (nextMatch.stage === 'lower') {
           // If advancing WITHIN Lower Bracket
           if (match.stage === 'lower') {
              // Check if it's a 1:1 mapping (Mixing Round) or 2:1 mapping (Elimination Round)
              // Odd Round Number (1, 3...) = 1:1 Mapping (Mixing Round) -> Go to Slot B
              // Even Round Number (2, 4...) = 2:1 Mapping (Elimination Round) -> Go to Slot A/B based on parity
              if (match.round_number % 2 !== 0) {
                 // 1:1 Mapping (e.g. Lower R1 -> Lower R2, Lower R3 -> Lower R4)
                 // In these rounds, the Lower Bracket winner usually takes Slot B (Bottom),
                 // while the Upper Bracket loser takes Slot A (Top).
                 updateData = { participant_b_id: winnerId };
              } else {
                 // 2:1 Mapping (e.g. Lower R2 -> Lower R3)
                 // Standard Odd->A, Even->B
                 updateData = isSlotA ? { participant_a_id: winnerId } : { participant_b_id: winnerId };
              }
           }
        } else {
           // Standard Single Elim / Upper Bracket logic
           updateData = isSlotA ? { participant_a_id: winnerId } : { participant_b_id: winnerId };
        }

        await updateMatch(match.next_match_id, updateData);
      }
    }

    // 2. Move Loser (Double Elimination)
    if (match.loser_match_id && loserId) {
      const { data: loserMatch } = await fetchMatchById(match.loser_match_id);
      if (loserMatch) {
        const isSlotA = match.match_number % 2 !== 0;
        let updateData = {};

        if (loserMatch.stage === 'bronze') {
           // 3rd Place Match Logic
           // Losers from Semi-Finals (Match 1 and 2) go to Slot A and B respectively
           updateData = isSlotA ? { participant_a_id: loserId } : { participant_b_id: loserId };
        } else if (loserMatch.round_number === 1) {
           // Lower Round 1: Empty slots, fill based on seed/match number
           updateData = isSlotA ? { participant_a_id: loserId } : { participant_b_id: loserId };
        } else {
           // Mixing Rounds (R2, R4, etc):
           // Upper Loser drops into Slot A (Top), meeting the Lower Winner in Slot B.
           updateData = { participant_a_id: loserId };
        }
        
        await updateMatch(match.loser_match_id, updateData);
      }
    }
  };

  const handleSaveResult = async (matchId: string, scoreA: number, scoreB: number, winnerId: string | null) => {
    try {
      // Capture state for Undo
      const { data: currentMatch } = await fetchMatchById(matchId);
      const relatedUpdates: { id: string, data: Partial<Match> }[] = [];
      
      if (currentMatch) {
        if (currentMatch.next_match_id) {
           const { data } = await fetchMatchById(currentMatch.next_match_id);
           if (data) relatedUpdates.push({ id: currentMatch.next_match_id, data });
        }
        if (currentMatch.loser_match_id) {
           const { data } = await fetchMatchById(currentMatch.loser_match_id);
           if (data) relatedUpdates.push({ id: currentMatch.loser_match_id, data });
        }
      }

      // 1. Update current match
      const { error } = await updateMatch(matchId, {
          score_a: scoreA,
          score_b: scoreB,
          winner_id: winnerId,
          status: 'completed'
        });

      if (error) throw error;

      // Push to Undo Stack
      if (currentMatch) {
        setUndoStack(prev => [...prev, {
          type: 'MATCH_UPDATE',
          matchId,
          previousData: currentMatch,
          relatedMatches: relatedUpdates
        }]);
      }

      // 2. Advance winner
      if (winnerId && selectedMatch) {
        await advanceWinner(selectedMatch, winnerId);
      }

      // 3. Check for Format Specific Logic (Swiss / Groups)
      if (tournament?.format === 'swiss' && selectedMatch) {
         // Check if all matches in this round are completed
         const currentRound = selectedMatch.round_number;
         const { data: roundMatches } = await fetchMatchesByRound(id!, currentRound);
         
         if (roundMatches && roundMatches.every(m => m.status === 'completed')) {
             // Round Complete! Generate next round pairings
             const nextRound = currentRound + 1;
             
             // Fetch ALL matches to calculate standings
             const { data: allMatches } = await fetchTournamentMatches(id!);
                
             if (allMatches) {
                 // We need to update the local state of matches to include the one just saved
                 // because the fetch might be slightly stale or we just want to be sure
                 const updatedAllMatches = allMatches.map(m => m.id === matchId ? { ...m, score_a: scoreA, score_b: scoreB, winner_id: winnerId, status: 'completed' } : m);
                 
                 const pairings = pairSwissRound(participants, updatedAllMatches, nextRound);
                 
                 if (pairings.length > 0) {
                     for (const pair of pairings) {
                         await updateMatch(pair.matchId, {
                             participant_a_id: pair.participantA,
                             participant_b_id: pair.participantB
                         });
                     }
                     toast.success(`Ronda ${nextRound} generada!`);
                 }
             }
         }
      } else if (tournament?.format === 'groups' && selectedMatch) {
          // Check if ALL group matches are completed
          // We can check if there are any pending matches in the group stage
          const { data: pendingGroupMatches } = await fetchPendingGroupMatches(id!);
            
          if (!pendingGroupMatches || pendingGroupMatches.length === 0) {
              // All group matches done! Advance to Playoffs
              // 1. Calculate Standings per Group
              const { data: allMatches } = await fetchTournamentMatches(id!);
              
              if (allMatches) {
                  // Group matches
                  const groupMatches = allMatches.filter(m => m.stage.startsWith('Group'));
                  // Get unique groups
                  const groups = [...new Set(groupMatches.map(m => m.stage))].sort();
                  
                  // Calculate standings for each group
                  const groupWinners: { group: string, winnerId: string, runnerUpId: string }[] = [];
                  
                  for (const group of groups) {
                      const gMatches = groupMatches.filter(m => m.stage === group);
                      // Get participants in this group
                      const pIds = new Set<string>();
                      gMatches.forEach(m => {
                          if (m.participant_a_id) pIds.add(m.participant_a_id);
                          if (m.participant_b_id) pIds.add(m.participant_b_id);
                      });
                      const gParticipants = participants.filter(p => pIds.has(p.id));
                      
                      const standings = calculateStandings(gParticipants, gMatches);
                      if (standings.length >= 2) {
                          groupWinners.push({
                              group,
                              winnerId: standings[0].participantId,
                              runnerUpId: standings[1].participantId
                          });
                      }
                  }
                  
                  // 2. Map to Playoffs (Simple Logic: A1 vs B2, B1 vs A2 etc)
                  // We need to find the playoff matches (stage = 'playoffs', round = 1)
                  const playoffMatches = allMatches.filter(m => m.stage === 'playoffs' && m.round_number === 1).sort((a, b) => a.match_number - b.match_number);
                  
                  if (playoffMatches.length > 0 && groupWinners.length > 0) {
                      // Logic: Match 1: A1 vs B2
                      // Match 2: B1 vs A2
                      // ...
                      // This depends on number of groups.
                      // If 2 groups (A, B):
                      // M1: A1 vs B2
                      // M2: B1 vs A2
                      
                      // If 4 groups (A, B, C, D):
                      // M1: A1 vs B2
                      // M2: C1 vs D2
                      // M3: B1 vs A2
                      // M4: D1 vs C2
                      
                      // Simplified mapping for now:
                      // Iterate matches and fill.
                      
                      const updates = [];
                      
                      // We assume playoffMatches are sorted by match_number
                      // We pair Group i Winner with Group i+1 Runner Up (circular)
                      
                      for (let i = 0; i < groupWinners.length; i++) {
                          const currentGroup = groupWinners[i];
                          const nextGroup = groupWinners[(i + 1) % groupWinners.length]; // Circular for opponent
                          
                          // We need to find a match for them.
                          // Let's say Match i*2 is Winner vs RunnerUp
                          // Actually, standard brackets are pre-seeded.
                          // Let's try: Match i: Group[i].Winner vs Group[i+1].RunnerUp
                          // Wait, if we have 2 groups, we have 2 matches in semis? No, 4 teams -> 2 matches.
                          // Group A: 1, 2. Group B: 1, 2.
                          // Semis: A1 vs B2, B1 vs A2.
                          
                          // If we have 2 groups, groupWinners.length is 2.
                          // We need 2 matches.
                          
                          // Match 0: A1 vs B2
                          // Match 1: B1 vs A2
                          
                          // Let's generalize:
                          // Match i: Group[i].Winner vs Group[(i+1)%N].RunnerUp
                          
                          const match = playoffMatches[i];
                          if (match) {
                              updates.push(
                                  updateMatch(match.id, {
                                      participant_a_id: currentGroup.winnerId,
                                      participant_b_id: nextGroup.runnerUpId
                                  })
                              );
                          }
                      }
                      
                      await Promise.all(updates);
                      toast.success('Playoffs generados!');
                  }
              }
          }
      }

      toast.success('Resultado guardado');
      setIsMatchModalOpen(false);
      setBracketRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error saving result:', error);
      toast.error('Error al guardar resultado');
    }
  };

  const handleAdvanceToPlayoffs = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Generar Playoffs',
      message: '¿Estás seguro? Se generará un bracket de eliminación simple con los 2 mejores de cada grupo. Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          // 1. Calculate Standings
          const { data: allMatches } = await fetchTournamentMatches(id!);
          if (!allMatches) return;

          const standings = calculateStandings(participants, allMatches);
          
          // 2. Select Top 2 from each group
          // Group participants by group
          const groups: Record<string, Participant[]> = {};
          participants.forEach(p => {
            const group = (p.meta as Record<string, unknown>)?.group || 'A';
            if (!groups[group as string]) groups[group as string] = [];
            groups[group as string].push(p);
          });

          const qualifiedParticipants: Participant[] = [];
          
          Object.keys(groups).sort().forEach(group => {
            const groupParticipants = groups[group];
            // Filter standings for this group
            const groupStandings = standings.filter(s => groupParticipants.some(p => p.id === s.participantId));
            // Take top 2
            const top2 = groupStandings.slice(0, 2);
            
            top2.forEach((s, index) => {
              const p = participants.find(p => p.id === s.participantId);
              if (p) {
                // Add metadata for seeding in playoffs if needed
                qualifiedParticipants.push({ ...p, seed: index + 1 }); // seed 1 = 1st, seed 2 = 2nd
              }
            });
          });

          if (qualifiedParticipants.length < 2) {
            toast.error('No hay suficientes participantes clasificados para playoffs');
            return;
          }

          // 3. Generate Single Elimination Bracket
          // We need to generate matches but with stage='playoffs'
          // generateSingleEliminationMatches returns matches with stage='main' usually.
          // We will modify them.
          
          // We need to pass qualifiedParticipants.
          // But the generator expects them to be seeded 1..N
          // We should re-seed them based on group performance logic (A1 vs B2 etc)
          // For now, let's just pass them and let the generator handle standard seeding (1 vs N, 2 vs N-1)
          // But we want A1 vs B2.
          // If we list them as [A1, B2, B1, A2]...
          // Standard seeding 4 players: 1 vs 4, 2 vs 3.
          // If we want A1 vs B2 (1 vs 4) and B1 vs A2 (3 vs 2).
          // So list: 1:A1, 2:A2, 3:B1, 4:B2.
          // 1 vs 4 -> A1 vs B2.
          // 2 vs 3 -> A2 vs B1.
          // This works for 2 groups.
          
          // Let's just sort qualifiedParticipants by some logic and pass to generator.
          // Simple approach: Just pass them.
          
          const playoffMatches = generateSingleEliminationMatches(id!, qualifiedParticipants);
          
          // Modify stage to 'playoffs'
          const playoffMatchesWithStage = playoffMatches.map(m => ({
            ...m,
            stage: 'playoffs',
            // Offset round numbers if needed? Or keep 1-based for playoffs?
            // Let's keep 1-based but UI needs to handle it.
            // BracketView groups by stage, so round 1 of playoffs is fine.
          }));

          // 4. Insert Matches
          const { error } = await insertMatches(playoffMatchesWithStage);
          if (error) throw error;

          toast.success('Playoffs generados correctamente');
          setBracketRefreshKey(prev => prev + 1);
          
          // Refresh matches list
          const { data: newMatches } = await fetchTournamentMatches(id!);
          if (newMatches) setMatches(newMatches);

        } catch (error) {
          console.error('Error generating playoffs:', error);
          toast.error('Error al generar playoffs');
        }
      }
    });
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/t/${tournament?.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace público copiado al portapapeles');
  };

  const handleAddCollaborator = async (email: string) => {
    if (!tournament) return;
    
    try {
      const { data: userProfile, error: userError } = await fetchUserByEmail(email);
      if (userError || !userProfile) {
        toast.error('Usuario no encontrado con ese email');
        return;
      }

      if (permissions?.some(p => p.user_id === userProfile.id)) {
        toast.error('Este usuario ya es colaborador');
        return;
      }

      const { error } = await addTournamentPermission({
        tournament_id: tournament.id,
        user_id: userProfile.id,
        can_edit: true
      });

      if (error) throw error;

      toast.success('Colaborador añadido');
      
      const { data: newPermissions } = await fetchTournamentPermissions(tournament.id);
      setPermissions(newPermissions || []);
      
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Error al añadir colaborador');
    }
  };

  const handleRemoveCollaborator = async (permissionId: string) => {
    try {
      const { error } = await deleteTournamentPermission(permissionId);
      if (error) throw error;
      
      toast.success('Colaborador eliminado');
      
      if (tournament) {
         const { data: newPermissions } = await fetchTournamentPermissions(tournament.id);
         setPermissions(newPermissions || []);
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Error al eliminar colaborador');
    }
  };

  const canManagePermissions = Boolean(
    tournament &&
    user &&
    (isSuperAdmin || tournament.created_by === user.id)
  );

  if (loading) return <div className="flex justify-center items-center min-h-[50vh] text-text-muted">Cargando torneo...</div>;
  if (!tournament) return <div className="text-center py-10 text-red-400">Torneo no encontrado</div>;

  let tournamentFormat = tournament.format;
  try {
    const config = typeof tournament.config === 'string' ? JSON.parse(tournament.config) : tournament.config;
    tournamentFormat = ((config as TournamentConfig)?.original_format as Tournament['format']) || tournament.format;
  } catch (e) {
    console.error('Error parsing format:', e);
  }

  return (
    <div className="animate-fade-in">
      <Toaster position="top-right" theme="dark" />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={confirmDialog.isDestructive}
      />

      <TournamentAdminHeader
        name={tournament.name}
        game={tournament.game}
        status={tournament.status}
        formatLabel={tournamentFormat === 'groups' ? 'Fase de Grupos + Playoffs' : 
                     tournamentFormat === 'double_elim' ? 'Doble Eliminación' : 
                     tournamentFormat === 'swiss' ? 'Suizo' : 
                     'Eliminación Simple'}
        participantsCount={participants.length}
        maxParticipants={(tournament.config as unknown as TournamentConfig)?.participants_count || '?'}
        themeId={themeId}
        onBack={() => navigate('/admin/dashboard')}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        onShare={handleCopyPublicLink}
        onDelete={() => {
          setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Torneo',
            message: '¿Estás seguro de que quieres eliminar este torneo permanentemente? Esta acción no se puede deshacer.',
            isDestructive: true,
            onConfirm: async () => {
              try {
                if (user?.id !== tournament.created_by) {
                  toast.error('No tienes permisos para eliminar este torneo');
                  return;
                }
                const { error } = await deleteTournamentFull(id!);
                if (error) throw error;
                toast.success('Torneo eliminado');
                navigate('/admin/dashboard');
              } catch (error) {
                console.error('Error deleting tournament:', error);
                toast.error('Error al eliminar el torneo');
              }
            }
          });
        }}
        onStart={handleStartTournament}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        canEdit={canEdit}
      />

      {/* Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'setup' && tournament.status === 'draft' && (
            <TournamentSetupSection
              tournament={tournament}
              participants={participants}
              themeId={themeId}
              newParticipantName={newParticipantName}
              addingParticipant={addingParticipant}
              selectedSlot={selectedSlot}
              isImportModalOpen={isImportModalOpen}
              importText={importText}
              importing={importing}
              onNewParticipantNameChange={setNewParticipantName}
              onAddParticipant={handleAddParticipant}
              onSelectSlot={setSelectedSlot}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onCloseImportModal={() => setIsImportModalOpen(false)}
              onImportTextChange={setImportText}
              onFileUpload={handleFileUpload}
              onImportParticipants={handleImportParticipants}
              onUpdateConfig={handleUpdateConfig}
              onRandomizeSeeds={handleRandomizeSeeds}
              onSlotClick={handleSlotClick}
              onParticipantMove={handleParticipantMove}
              onDeleteParticipant={handleDeleteParticipant}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'bracket' && (
            <motion.div
              key="bracket"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-8"
            >
              {tournament.status === 'draft' ? (
                <div className="text-center py-20 glass-card border-dashed border-border">
                  <Trophy size={48} className="mx-auto text-text-muted mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Bracket no generado</h3>
                  <p className="text-text-muted mb-6">
                    Añade participantes y pulsa "Iniciar Torneo" para generar el bracket.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-lg">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Trophy size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Bracket del Torneo</h3>
                          <p className="text-xs text-text-muted">Visualiza y gestiona los partidos</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* View Toggle */}
                        <div className={`flex p-1 gap-1 ${themeId === 'valorant' ? '' : 'bg-surface-dark rounded-lg border border-border'}`}>
                          <AppButton
                            onClick={() => setViewMode('bracket')}
                            variant={viewMode === 'bracket' ? 'primary' : 'ghost'}
                            theme={themeId}
                            className="px-3"
                            title="Vista de Bracket"
                          >
                            <LayoutGrid size={18} />
                          </AppButton>
                          <AppButton
                            onClick={() => setViewMode('list')}
                            variant={viewMode === 'list' ? 'primary' : 'ghost'}
                            theme={themeId}
                            className="px-3"
                            title="Vista de Lista"
                          >
                            <List size={18} />
                          </AppButton>
                        </div>

                        {/* Advance to Playoffs Button (Hybrid Format) */}
                        {tournament.format === 'groups' && matches.length > 0 && matches.every(m => m.status === 'completed') && !matches.some(m => m.stage === 'playoffs') && (
                          <AppButton
                            onClick={handleAdvanceToPlayoffs}
                            variant="primary"
                            theme={themeId}
                            leftIcon={<Trophy size={18} />}
                            title="Generar fase final"
                          >
                            <span className="hidden sm:inline">Generar Playoffs</span>
                          </AppButton>
                        )}

                        <AppButton
                          onClick={handleExportImage}
                          variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
                          theme={themeId}
                          leftIcon={<ImageIcon size={18} />}
                          title="Descargar imagen del bracket"
                        >
                          <span className="hidden sm:inline">Exportar</span>
                        </AppButton>
                      </div>
                   </div>
                   
                   {viewMode === 'bracket' ? (
                     <div ref={bracketRef} className="bg-surface-dark p-6 rounded-xl border border-border shadow-2xl overflow-hidden">
                        <BracketView 
                          key={bracketRefreshKey}
                          tournamentId={id!} 
                          participants={participants} 
                          format={tournamentFormat} 
                          hasThirdPlace={!!(tournament.config as unknown as TournamentConfig)?.has_third_place}
                          onMatchClick={handleMatchClick}
                        />
                     </div>
                   ) : (
                     <div className="bg-surface-dark p-6 rounded-xl border border-border shadow-2xl">
                        <MatchListView 
                          matches={matches}
                          participants={participants}
                          onMatchClick={handleMatchClick}
                        />
                     </div>
                   )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <TournamentSettingsSection
              tournament={tournament}
              themeId={themeId}
              onUpdateTournament={(updates) => setTournament({ ...tournament, ...updates })}
              onSaveSettings={async () => {
                try {
                  const { error } = await updateTournament(id!, {
                      name: tournament.name,
                      game: tournament.game,
                      is_public: tournament.is_public,
                      config: tournament.config
                    });
                  
                  if (error) throw error;
                  toast.success('Cambios guardados correctamente');
                } catch (error) {
                  console.error('Error updating tournament:', error);
                  toast.error('Error al guardar cambios');
                }
              }}
              onDeleteTournament={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Eliminar Torneo',
                  message: '¿Estás seguro de que quieres eliminar este torneo permanentemente? Esta acción no se puede deshacer.',
                  isDestructive: true,
                  onConfirm: async () => {
                    try {
                      if (user?.id !== tournament.created_by) {
                        toast.error('No tienes permisos para eliminar este torneo');
                        return;
                      }
                      const { error } = await deleteTournamentFull(id!);
                      if (error) throw error;
                      toast.success('Torneo eliminado');
                      navigate('/admin/dashboard');
                    } catch (error) {
                      console.error('Error deleting tournament:', error);
                      toast.error('Error al eliminar el torneo');
                    }
                  }
                });
              }}
              canEdit={canEdit}
              permissions={permissions || []}
              onAddCollaborator={handleAddCollaborator}
              onRemoveCollaborator={handleRemoveCollaborator}
              canManagePermissions={canManagePermissions}
            />
          )}
        </AnimatePresence>
      </div>

      <MatchResultModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        match={selectedMatch}
        participantA={participants.find(p => p.id === selectedMatch?.participant_a_id)}
        participantB={participants.find(p => p.id === selectedMatch?.participant_b_id)}
        onSave={handleSaveResult}
      />
    </div>
  );
};
