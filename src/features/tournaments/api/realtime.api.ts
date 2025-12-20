import { supabase } from '@/shared/api/supabaseClient';

export function subscribeToTournamentChanges(
  tournamentId: string,
  onParticipantsChange: () => void,
  onMatchesChange: () => void,
) {
  const channel = supabase
    .channel('tournament_detail')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onParticipantsChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onMatchesChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMatches(tournamentId: string, onMatchesChange: () => void) {
  const channel = supabase
    .channel('tournament_matches')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onMatchesChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPublicTournament(
  tournamentId: string,
  onMatchesChange: () => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTournamentChange: (payload: any) => void,
  onParticipantsChange?: () => void,
) {
  const matchChannel = supabase
    .channel('public_matches')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onMatchesChange(),
    )
    .subscribe();

  const tournamentChannel = supabase
    .channel('public_tournament')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` },
      (payload) => onTournamentChange(payload),
    )
    .subscribe();

  const participantsChannel = supabase
    .channel('public_participants')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      () => onParticipantsChange?.(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(matchChannel);
    supabase.removeChannel(tournamentChannel);
    supabase.removeChannel(participantsChannel);
  };
}
