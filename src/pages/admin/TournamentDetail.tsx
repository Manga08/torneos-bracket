import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import type { Tournament, Participant, Match } from '../../types/database';
import { Users, Trophy, ArrowLeft, Plus, Trash2, Shuffle, X, Share2, Upload, Image as ImageIcon, FileText, RotateCcw, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSingleEliminationMatches, generateDoubleEliminationMatches, generateSwissMatches, generateGroupStageMatches } from '../../lib/bracketUtils';
import { BracketView } from '../../components/BracketView';
import { MatchResultModal } from '../../components/MatchResultModal';
import { Toaster, toast } from 'sonner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { calculateStandings, pairSwissRound } from '../../lib/tournamentLogic';
import { toPng } from 'html-to-image';
import { MatchListView } from '../../components/MatchListView';
import { List, LayoutGrid } from 'lucide-react';
import { THEMES, THEME_CONFIGS } from '../../lib/themes';
import { useBodyTheme } from '../../hooks/useBodyTheme';

import { AppButton } from '../../components/ui/AppButton';

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
  const { user } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'setup' | 'bracket' | 'settings'>('setup');
  
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

  // Apply theme
  const themeId = (tournament?.config as unknown as TournamentConfig)?.theme;
  useBodyTheme(themeId);

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    
    try {
      if (action.type === 'MATCH_UPDATE') {
        // Revert main match
        await supabase.from('matches').update({
          score_a: action.previousData.score_a,
          score_b: action.previousData.score_b,
          winner_id: action.previousData.winner_id,
          status: action.previousData.status,
          participant_a_id: action.previousData.participant_a_id,
          participant_b_id: action.previousData.participant_b_id
        }).eq('id', action.matchId);

        // Revert related matches
        for (const related of action.relatedMatches) {
           await supabase.from('matches').update({
             participant_a_id: related.data.participant_a_id,
             participant_b_id: related.data.participant_b_id,
           }).eq('id', related.id);
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
        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', id)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });
        
        if (data) setMatches(data);
      };
      
      fetchMatches();
      
      const channel = supabase
        .channel('tournament_matches')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, 
            () => fetchMatches())
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
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
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      
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
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true });
      
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
      const channel = supabase
        .channel('tournament_detail')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${id}` }, 
            () => fetchParticipants())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, 
            () => setBracketRefreshKey(prev => prev + 1))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
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

      const { error } = await supabase.from('participants').insert(newParticipants);
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

      const { data, error } = await supabase
        .from('participants')
        .insert({
          tournament_id: id,
          name: newParticipantName.trim(),
          seed: targetSeed
        })
        .select()
        .single();

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
      const { error: e1 } = await supabase.from('participants').update({ seed: p2Seed }).eq('id', p1.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('participants').update({ seed: p1Seed }).eq('id', p2.id);
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
      const { error } = await supabase
        .from('participants')
        .update({ seed: newSeed })
        .eq('id', participant.id);

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
          const { error } = await supabase
            .from('participants')
            .upsert(updatedParticipants.map(p => ({
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
          const { error } = await supabase
            .from('participants')
            .delete()
            .eq('id', participantId);

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
      const { error: matchesError } = await supabase
        .from('matches')
        .insert(matches);

      if (matchesError) throw matchesError;

      // 3. Actualizar estado del torneo
      // 3. Actualizar estado del torneo
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', id);

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
      const { data: nextMatch } = await supabase.from('matches').select('*').eq('id', match.next_match_id).single();
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

        await supabase.from('matches').update(updateData).eq('id', match.next_match_id);
      }
    }

    // 2. Move Loser (Double Elimination)
    if (match.loser_match_id && loserId) {
      const { data: loserMatch } = await supabase.from('matches').select('*').eq('id', match.loser_match_id).single();
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
        
        await supabase.from('matches').update(updateData).eq('id', match.loser_match_id);
      }
    }
  };

  const handleSaveResult = async (matchId: string, scoreA: number, scoreB: number, winnerId: string | null) => {
    try {
      // Capture state for Undo
      const { data: currentMatch } = await supabase.from('matches').select('*').eq('id', matchId).single();
      const relatedUpdates: { id: string, data: Partial<Match> }[] = [];
      
      if (currentMatch) {
        if (currentMatch.next_match_id) {
           const { data } = await supabase.from('matches').select('*').eq('id', currentMatch.next_match_id).single();
           if (data) relatedUpdates.push({ id: currentMatch.next_match_id, data });
        }
        if (currentMatch.loser_match_id) {
           const { data } = await supabase.from('matches').select('*').eq('id', currentMatch.loser_match_id).single();
           if (data) relatedUpdates.push({ id: currentMatch.loser_match_id, data });
        }
      }

      // 1. Update current match
      const { error } = await supabase
        .from('matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          winner_id: winnerId,
          status: 'completed'
        })
        .eq('id', matchId);

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
         const { data: roundMatches } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', id)
            .eq('round_number', currentRound);
         
         if (roundMatches && roundMatches.every(m => m.status === 'completed')) {
             // Round Complete! Generate next round pairings
             const nextRound = currentRound + 1;
             
             // Fetch ALL matches to calculate standings
             const { data: allMatches } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', id);
                
             if (allMatches) {
                 // We need to update the local state of matches to include the one just saved
                 // because the fetch might be slightly stale or we just want to be sure
                 const updatedAllMatches = allMatches.map(m => m.id === matchId ? { ...m, score_a: scoreA, score_b: scoreB, winner_id: winnerId, status: 'completed' } : m);
                 
                 const pairings = pairSwissRound(participants, updatedAllMatches, nextRound);
                 
                 if (pairings.length > 0) {
                     for (const pair of pairings) {
                         await supabase.from('matches').update({
                             participant_a_id: pair.participantA,
                             participant_b_id: pair.participantB
                         }).eq('id', pair.matchId);
                     }
                     toast.success(`Ronda ${nextRound} generada!`);
                 }
             }
         }
      } else if (tournament?.format === 'groups' && selectedMatch) {
          // Check if ALL group matches are completed
          // We can check if there are any pending matches in the group stage
          const { data: pendingGroupMatches } = await supabase
            .from('matches')
            .select('id')
            .eq('tournament_id', id)
            .ilike('stage', 'Group%') // Filter only group stages
            .eq('status', 'pending')
            .limit(1);
            
          if (!pendingGroupMatches || pendingGroupMatches.length === 0) {
              // All group matches done! Advance to Playoffs
              // 1. Calculate Standings per Group
              const { data: allMatches } = await supabase.from('matches').select('*').eq('tournament_id', id);
              
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
                                  supabase.from('matches').update({
                                      participant_a_id: currentGroup.winnerId,
                                      participant_b_id: nextGroup.runnerUpId
                                  }).eq('id', match.id)
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
          const { data: allMatches } = await supabase.from('matches').select('*').eq('tournament_id', id);
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
          const { error } = await supabase.from('matches').insert(playoffMatchesWithStage);
          if (error) throw error;

          toast.success('Playoffs generados correctamente');
          setBracketRefreshKey(prev => prev + 1);
          
          // Refresh matches list
          const { data: newMatches } = await supabase.from('matches').select('*').eq('tournament_id', id);
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

      {/* Header */}
      <div className={`relative mb-8 -mx-4 px-4 pt-4 pb-8 md:-mx-8 md:px-8 overflow-hidden ${themeId === 'valorant' ? '' : ''}`}>
        
        <div className="relative z-10">
          <Link to="/admin/dashboard">
            <AppButton 
              variant={themeId === 'valorant' ? 'secondary' : 'ghost'} 
              theme={themeId}
              leftIcon={<ArrowLeft size={18} />}
              className="mb-4"
            >
              Volver
            </AppButton>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className={`text-4xl font-bold text-white tracking-tight drop-shadow-md ${themeId === 'valorant' ? 'valorant-text-shadow' : ''}`}>{tournament.name}</h1>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border shadow-sm ${themeId === 'valorant' ? 'valorant-chip' : 'bg-surface-highlight text-text-muted border-border'}`}>
                  {tournament.game}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border shadow-sm ${
                  tournament.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  'bg-gray-500/10 text-gray-400 border-gray-500/20'
                } ${themeId === 'valorant' ? 'valorant-chip' : ''}`}>
                  {tournament.status}
                </span>
              </div>
              <p className={`flex items-center gap-2 font-medium drop-shadow-sm ${themeId === 'valorant' ? 'valorant-metadata' : 'text-text-muted'}`}>
                <Trophy size={16} /> 
                {tournamentFormat === 'groups' ? 'Fase de Grupos + Playoffs' : 
                 tournamentFormat === 'double_elim' ? 'Doble Eliminación' : 
                 tournamentFormat === 'swiss' ? 'Suizo' : 
                 'Eliminación Simple'}
                <span className="mx-2">•</span>
                <Users size={16} /> {participants.length} / {(tournament.config as unknown as TournamentConfig)?.participants_count || '?'} Participantes
              </p>
            </div>

            <div className="flex gap-3">
            {undoStack.length > 0 && (
              <AppButton
                onClick={handleUndo}
                variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
                theme={themeId}
                leftIcon={<RotateCcw size={18} />}
                className={themeId === 'valorant' ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-400 hover:text-yellow-300'}
                title="Deshacer último cambio"
              >
                <span className="hidden md:inline">Deshacer</span>
              </AppButton>
            )}

            <AppButton
              onClick={handleCopyPublicLink}
              variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
              theme={themeId}
              leftIcon={<Share2 size={18} />}
              title="Copiar enlace público"
            >
              <span className="hidden md:inline">Compartir</span>
            </AppButton>

            {/* Delete Button (Always Visible for Admin) */}
            <AppButton 
              onClick={() => {
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

                      // 0. Break circular references
                      await supabase.from('matches').update({ next_match_id: null }).eq('tournament_id', id);
                      
                      // 1. Delete matches
                      await supabase.from('matches').delete().eq('tournament_id', id);

                      // 2. Delete participants
                      await supabase.from('participants').delete().eq('tournament_id', id);

                      // 3. Delete permissions
                      await supabase.from('user_tournament_permissions').delete().eq('tournament_id', id);

                      // 4. Delete tournament
                      const { error } = await supabase.from('tournaments').delete().eq('id', id);
                      
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
              variant={themeId === 'valorant' ? 'secondary' : 'ghost'}
              theme={themeId}
              leftIcon={<Trash2 size={18} />}
              className={themeId === 'valorant' ? 'hover:border-red-500 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'}
              title="Eliminar Torneo"
            >
              <span className="hidden md:inline">Borrar Torneo</span>
            </AppButton>

            {tournament.status === 'draft' && (
              <AppButton 
                onClick={handleStartTournament}
                variant="primary"
                theme={themeId}
                leftIcon={<Trophy size={18} />}
              >
                Iniciar Torneo
              </AppButton>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-6 border-b border-border mb-8 relative z-10 ${themeId === 'valorant' ? 'border-white/10' : ''}`}>
        {tournament.status === 'draft' && (
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'setup' 
                ? (themeId === 'valorant' ? 'valorant-tab-active' : 'text-primary tab-active') 
                : (themeId === 'valorant' ? 'valorant-tab-text' : 'text-text-muted hover:text-white')
            }`}
          >
            Configuración
          </button>
        )}
        
        {tournament.status !== 'draft' && (
          <button
            onClick={() => setActiveTab('bracket')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'bracket' 
                ? (themeId === 'valorant' ? 'valorant-tab-active' : 'text-primary tab-active') 
                : (themeId === 'valorant' ? 'valorant-tab-text' : 'text-text-muted hover:text-white')
            }`}
          >
            Bracket
          </button>
        )}

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'settings' 
              ? (themeId === 'valorant' ? 'valorant-tab-active' : 'text-primary tab-active') 
              : (themeId === 'valorant' ? 'valorant-tab-text' : 'text-text-muted hover:text-white')
            }`}
        >
          Ajustes
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'setup' && tournament.status === 'draft' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Quick Add Bar */}
              <div className="mb-8">
                <div className="flex gap-4 items-start">
                  <form onSubmit={handleAddParticipant} className="relative flex-1">
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-linear-to-r from-primary/50 to-purple-600/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur"></div>
                      <div className="relative flex items-center bg-surface rounded-xl border border-border p-2 shadow-xl">
                        <div className="pl-4 text-text-muted">
                          <Users size={20} />
                        </div>
                        <input
                          type="text"
                          value={newParticipantName}
                          onChange={(e) => setNewParticipantName(e.target.value)}
                          className="w-full bg-transparent border-none text-white placeholder:text-text-muted focus:ring-0 px-4 py-3 text-lg focus:outline-none"
                          placeholder={selectedSlot ? `Añadir en posición #${selectedSlot.seedIndex + 1}...` : "Nombre del participante..."}
                          autoFocus
                        />
                        
                        {selectedSlot && (
                          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20 mr-2 animate-fade-in">
                            <span>Slot #{selectedSlot.seedIndex + 1}</span>
                            <button onClick={() => setSelectedSlot(null)} className="hover:text-white transition-colors"><X size={12} /></button>
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
                    onClick={() => setIsImportModalOpen(true)}
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
                        <button onClick={() => setIsImportModalOpen(false)} className="text-text-muted hover:text-white">
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
                              onChange={handleFileUpload}
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
                            onChange={(e) => setImportText(e.target.value)}
                            className="w-full h-32 bg-surface-dark border border-border rounded-lg p-3 text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none font-mono text-sm"
                            placeholder="Jugador 1&#10;Jugador 2&#10;Jugador 3..."
                          />
                        </div>
                      </div>

                      <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface-dark">
                        <AppButton
                          onClick={() => setIsImportModalOpen(false)}
                          variant="ghost"
                          theme={themeId}
                          size="sm"
                        >
                          Cancelar
                        </AppButton>
                        <AppButton
                          onClick={handleImportParticipants}
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
                            onChange={async (e) => {
                              const newConfig = { 
                                ...(typeof tournament.config === 'string' ? JSON.parse(tournament.config) : tournament.config),
                                has_third_place: e.target.checked 
                              };
                              setTournament({ ...tournament, config: newConfig });
                              await supabase.from('tournaments').update({ config: newConfig }).eq('id', id);
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
                    
                    <AppButton 
                      onClick={handleRandomizeSeeds}
                      variant="secondary"
                      theme={themeId}
                      size="sm"
                      leftIcon={<Shuffle size={14} />}
                    >
                      <span className="hidden sm:inline">Aleatorizar</span>
                    </AppButton>
                  </div>
                </div>
                
                <div className="overflow-hidden pb-4" ref={bracketRef}>
                  <BracketView 
                    tournamentId={id!} 
                    participants={participants} 
                    isDraft={true} 
                    format={tournamentFormat}
                    hasThirdPlace={!!(tournament.config as unknown as TournamentConfig)?.has_third_place}
                    onSlotClick={handleSlotClick}
                    onParticipantMove={handleParticipantMove}
                    onDeleteParticipant={handleDeleteParticipant}
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
                      onClick={() => setSelectedSlot(null)}
                      className="p-1 text-text-muted hover:text-white rounded-full transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
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
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card"
            >
              <h3 className="text-xl font-bold text-white mb-4">Configuración del Torneo</h3>
              <div className="space-y-6">
                {/* Edit Tournament Details */}
                <div className="p-6 bg-surface border border-border rounded-xl">
                  <h4 className="text-lg font-bold text-white mb-4">Detalles Generales</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">Nombre del Torneo</label>
                      <input
                        type="text"
                        value={tournament.name}
                        onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Juego / Categoría</label>
                        <select
                          value={tournament.game}
                          onChange={(e) => setTournament({ ...tournament, game: e.target.value as Tournament['game'] })}
                          className="input-modern"
                        >
                          <option value="valorant">Valorant</option>
                          <option value="fifa">FIFA</option>
                          <option value="lol">League of Legends</option>
                          <option value="csgo">CS:GO</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Visibilidad</label>
                        <select
                          value={tournament.is_public ? 'public' : 'private'}
                          onChange={(e) => setTournament({ ...tournament, is_public: e.target.value === 'public' })}
                          className="input-modern"
                        >
                          <option value="public">Público</option>
                          <option value="private">Privado</option>
                        </select>
                      </div>
                    </div>

                    {tournament.format === 'single_elim' && (
                      <div className="flex items-center gap-3 p-4 bg-surface-dark border border-border rounded-lg">
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            name="has_third_place_settings"
                            id="has_third_place_settings"
                            checked={!!(tournament.config as unknown as TournamentConfig)?.has_third_place}
                            onChange={(e) => {
                               const newConfig = { ...(tournament.config as unknown as TournamentConfig), has_third_place: e.target.checked };
                               setTournament({ ...tournament, config: newConfig });
                            }}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                          />
                          <label 
                            htmlFor="has_third_place_settings" 
                            className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300"
                          ></label>
                        </div>
                        <label htmlFor="has_third_place_settings" className="text-sm text-gray-300 cursor-pointer select-none flex-1">
                          <span className="font-medium text-white block">Incluir partido por el 3er Puesto</span>
                          Genera automáticamente un partido entre los perdedores de las semifinales.
                        </label>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">Logo URL</label>
                      <input
                        type="text"
                        value={(tournament.config as unknown as TournamentConfig)?.logo_url || ''}
                        onChange={(e) => {
                           const newConfig = { ...(tournament.config as unknown as TournamentConfig), logo_url: e.target.value };
                           setTournament({ ...tournament, config: newConfig });
                        }}
                        placeholder="https://example.com/logo.png"
                        className="input-modern"
                      />
                      <p className="text-xs text-text-muted mt-1">URL de la imagen del logo del torneo.</p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <AppButton
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('tournaments')
                              .update({
                                name: tournament.name,
                                game: tournament.game,
                                is_public: tournament.is_public,
                                config: tournament.config
                              })
                              .eq('id', id);
                            
                            if (error) throw error;
                            toast.success('Cambios guardados correctamente');
                          } catch (error) {
                            console.error('Error updating tournament:', error);
                            toast.error('Error al guardar cambios');
                          }
                        }}
                        variant="primary"
                        theme={themeId}
                      >
                        Guardar Cambios
                      </AppButton>
                    </div>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="p-6 bg-surface border border-border rounded-xl">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Palette size={20} className="text-primary" />
                    Apariencia y Tema
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                           const newConfig = { ...(tournament.config as unknown as TournamentConfig), theme: theme.id };
                           setTournament({ ...tournament, config: newConfig });
                        }}
                        className={`
                          relative group overflow-hidden rounded-xl border-2 text-left transition-all duration-300
                          ${(tournament.config as unknown as TournamentConfig)?.theme === theme.id 
                            ? 'border-primary bg-surface-highlight' 
                            : 'border-border bg-surface hover:border-white/20'}
                        `}
                      >
                        <div className="p-4 relative z-10">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`font-bold text-lg ${(tournament.config as unknown as TournamentConfig)?.theme === theme.id ? 'text-primary' : 'text-white'}`}>
                              {theme.name}
                            </span>
                            {(tournament.config as unknown as TournamentConfig)?.theme === theme.id && (
                              <span className="bg-primary text-white text-xs px-2 py-1 rounded font-bold">ACTIVO</span>
                            )}
                          </div>
                          <p className="text-sm text-text-muted mb-4">{theme.description}</p>
                          
                          {/* Mini Preview */}
                          <div className="h-24 rounded-lg overflow-hidden relative border border-white/10" style={{ background: theme.palette.background }}>
                             <div className="absolute inset-0 opacity-30" style={{ background: theme.palette.backgroundAlt }}></div>
                             <div className="absolute top-2 left-2 right-2 h-2 rounded-full" style={{ background: theme.palette.surface }}></div>
                             <div className="absolute top-6 left-2 w-1/3 h-16 rounded" style={{ background: theme.palette.surfaceAlt, borderColor: theme.palette.accent, borderWidth: theme.shapes.borderWidth }}></div>
                             <div className="absolute top-6 right-2 w-1/2 h-8 rounded" style={{ background: theme.palette.accent }}></div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
                  <h4 className="text-red-400 font-bold mb-2">Zona de Peligro</h4>
                  <p className="text-text-muted text-sm mb-4">
                    Eliminar el torneo borrará permanentemente todos los datos asociados, incluyendo participantes y partidos.
                  </p>
                  <AppButton 
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Eliminar Torneo',
                        message: '¿Estás seguro de que quieres eliminar este torneo permanentemente? Esta acción no se puede deshacer.',
                        isDestructive: true,
                        onConfirm: async () => {
                          try {
                            console.log('Starting deletion process for tournament:', id);
                            console.log('Current User:', user?.id);
                            console.log('Tournament Creator:', tournament.created_by);

                            if (user?.id !== tournament.created_by) {
                              console.error('Permission denied: User is not the creator');
                              toast.error('No tienes permisos para eliminar este torneo');
                              return;
                            }

                            // CHECK & RESTORE PERMISSIONS
                            // Use .maybeSingle() to avoid 406 error if multiple rows exist or 0 rows exist
                            const { data: permData } = await supabase
                              .from('user_tournament_permissions')
                              .select('*')
                              .eq('tournament_id', id)
                              .eq('user_id', user.id)
                              .maybeSingle();
                            
                            if (!permData) {
                              console.log('Permission row missing. Attempting to restore...');
                              
                              const { error: restoreError } = await supabase
                                .from('user_tournament_permissions')
                                .insert({
                                  tournament_id: id,
                                  user_id: user.id,
                                  can_edit: true
                                });
                              
                              if (restoreError) {
                                if (restoreError.code === '23505') { // Unique violation (already exists)
                                   console.log('Permissions already exist.');
                                } else if (restoreError.code === '23503') { // FK violation (tournament missing)
                                   console.log('Tournament missing, cannot restore permissions. Assuming deleted.');
                                   toast.success('Torneo eliminado');
                                   navigate('/admin/dashboard');
                                   return;
                                } else {
                                   console.error('Failed to restore permissions:', restoreError);
                                }
                              } else {
                                console.log('Permissions restored.');
                              }
                            }
                            
                            // 0. Break circular references in matches (next_match_id)
                            const { error: updateError, count: updateCount } = await supabase
                              .from('matches')
                              .update({ next_match_id: null })
                              .eq('tournament_id', id)
                              .select();
                            
                            console.log('Updated matches (break circular):', updateCount);

                            if (updateError) {
                              console.error('Error breaking circular refs:', updateError);
                              throw updateError;
                            }

                            // OPTIMISTIC DELETE: Try deleting tournament first (if CASCADE is on)
                            // If this works, we are done. If it fails, we continue with manual cleanup.
                            try {
                              const { error: cascadeError, count: cascadeCount } = await supabase
                                .from('tournaments')
                                .delete({ count: 'exact' })
                                .eq('id', id);

                              if (!cascadeError && cascadeCount && cascadeCount > 0) {
                                console.log('Tournament deleted via CASCADE:', cascadeCount);
                                toast.success('Torneo eliminado');
                                navigate('/admin/dashboard');
                                return;
                              }
                            } catch (e) {
                              console.log('Cascade delete failed, proceeding with manual cleanup', e);
                            }

                            // 1. Delete matches
                            await supabase.from('matches').delete().eq('tournament_id', id);

                            // 2. Delete participants
                            await supabase.from('participants').delete().eq('tournament_id', id);

                            // 3. Delete permissions
                            await supabase.from('user_tournament_permissions').delete().eq('tournament_id', id);

                            // 4. Delete tournament
                            const { error: deleteError } = await supabase
                              .from('tournaments')
                              .delete()
                              .eq('id', id);

                            if (deleteError) throw deleteError;

                            toast.success('Torneo eliminado correctamente');
                            navigate('/admin/dashboard');
                          } catch (error: any) {
                            console.error('Error deleting tournament:', error);
                            toast.error(error.message || 'Error al eliminar el torneo');
                          }
                        }
                      });
                    }}
                    variant="danger"
                    theme={themeId}
                    leftIcon={<Trash2 size={16} />}
                  >
                    Eliminar Torneo
                  </AppButton>
                </div>
              </div>
            </motion.div>
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
