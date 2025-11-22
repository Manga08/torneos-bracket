import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Tournament, Participant, Match } from '../../types/database';
import { Trophy, Users, Calendar, Maximize2, Minimize2, List, GitBranch } from 'lucide-react';
import { BracketView } from '../../components/BracketView';
import { MatchListView } from '../../components/MatchListView';
import { useBodyTheme } from '../../hooks/useBodyTheme';
import { AppButton } from '../../components/ui/AppButton';

interface TournamentConfig {
  theme?: string;
  logo_url?: string;
  has_third_place?: boolean;
  [key: string]: unknown;
}

export const PublicTournamentView = () => {
  const { slug } = useParams<{ slug: string }>();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket');

  // Apply theme
  const themeId = (tournament?.config as unknown as TournamentConfig)?.theme;
  useBodyTheme(themeId);

  useEffect(() => {
    const fetchTournament = async () => {
      if (!slug) return;
      try {
        // Fetch tournament by slug
        const { data: tourn, error: tournError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('slug', slug)
          .single();

        if (tournError) throw tournError;
        setTournament(tourn);

        // Fetch participants
        const { data: parts, error: partsError } = await supabase
          .from('participants')
          .select('*')
          .eq('tournament_id', tourn.id)
          .order('seed', { ascending: true });

        if (partsError) throw partsError;
        setParticipants(parts || []);

        // Fetch matches
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', tourn.id)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });

        if (matchError) throw matchError;
        setMatches(matchData || []);

      } catch (error) {
        console.error('Error fetching tournament:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [slug]);

  // Realtime subscriptions
  useEffect(() => {
    if (!tournament) return;

    const matchChannel = supabase
      .channel('public_matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournament.id}` }, 
          async () => {
            const { data } = await supabase
              .from('matches')
              .select('*')
              .eq('tournament_id', tournament.id)
              .order('round_number', { ascending: true })
              .order('match_number', { ascending: true });
            if (data) setMatches(data);
          })
      .subscribe();

    const tournamentChannel = supabase
      .channel('public_tournament')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tournament.id}` }, 
          (payload) => {
            setTournament(payload.new as Tournament);
          })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(tournamentChannel);
    };
  }, [tournament?.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-muted">Cargando torneo...</div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-red-400">Torneo no encontrado</div>;

  let tournamentFormat = tournament.format;
  try {
    const config = typeof tournament.config === 'string' ? JSON.parse(tournament.config) : tournament.config;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tournamentFormat = (config as any)?.original_format || tournament.format;
  } catch (e) {
    console.error('Error parsing format:', e);
  }

  return (
    <div className={`bg-background text-text-main transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-100 overflow-y-auto p-4 md:p-8 bg-background' 
        : 'min-h-screen p-4 md:p-8'
    }`}>
      <div className="max-w-7xl mx-auto relative">
        
        {/* View Toggle & Fullscreen */}
        <div className="absolute top-0 right-0 z-50 flex gap-2">
          <div className={`flex p-1 gap-1 ${themeId === 'valorant' ? '' : 'bg-white/5 rounded-lg border border-white/10'}`}>
            <AppButton
              onClick={() => setViewMode('bracket')}
              variant={viewMode === 'bracket' ? 'primary' : 'ghost'}
              theme={themeId}
              className="px-3"
              title="Vista de Bracket"
            >
              <GitBranch size={16} />
            </AppButton>
            <AppButton
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              theme={themeId}
              className="px-3"
              title="Vista de Lista"
            >
              <List size={16} />
            </AppButton>
          </div>

          <AppButton 
            onClick={toggleFullscreen}
            variant="secondary"
            theme={themeId}
            leftIcon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          >
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </AppButton>
        </div>

        {/* Header - Consistent Layout */}
        <div className={`relative mb-12 text-center pt-8 md:pt-0 -mx-4 px-4 pb-8 md:-mx-8 md:px-8 ${themeId === 'valorant' ? '' : ''}`}>
          
          <div className="relative z-10 flex flex-col items-center">
            {(tournament.config as unknown as TournamentConfig)?.logo_url && (
              <img 
                src={(tournament.config as unknown as TournamentConfig).logo_url as string} 
                alt="Logo" 
                className="w-24 h-24 object-contain mb-6 drop-shadow-lg"
              />
            )}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 border shadow-sm backdrop-blur-sm ${themeId === 'valorant' ? 'valorant-chip' : 'bg-primary/10 text-primary border-primary/20'}`}>
              <Trophy size={14} />
              {tournament.game.toUpperCase()}
            </div>
            <h1 className={`text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-lg font-display ${themeId === 'valorant' ? 'valorant-text-shadow' : ''}`}>{tournament.name}</h1>
            <div className={`flex justify-center items-center gap-6 font-medium drop-shadow-md ${themeId === 'valorant' ? 'valorant-metadata' : 'text-text-muted'}`}>
              <span className="flex items-center gap-2">
                <Users size={18} />
                {participants.length} Participantes
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={18} />
                {new Date(tournament.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bracket Area */}
        <div className={`${isFullscreen ? '' : 'glass-card p-6 md:p-8'}`}>
          {viewMode === 'bracket' ? (
            <BracketView 
              tournamentId={tournament.id} 
              participants={participants} 
              matches={matches}
              format={tournamentFormat} 
              hasThirdPlace={!!(tournament.config as unknown as TournamentConfig)?.has_third_place}
              onMatchClick={() => {}} // Read only
            />
          ) : (
            <MatchListView 
              matches={matches} 
              participants={participants} 
            />
          )}
        </div>
      </div>
    </div>
  );
};
