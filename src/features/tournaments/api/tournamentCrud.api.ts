import { supabase } from '@/shared/api/supabaseClient';
import type { Tournament } from '@/types/database';

export async function fetchDashboardTournaments() {
  return await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
}

export async function fetchTournamentById(id: string) {
  return await supabase.from('tournaments').select('*').eq('id', id).single();
}

export async function updateTournament(id: string, updates: Partial<Tournament>) {
  return await supabase.from('tournaments').update(updates).eq('id', id);
}

export async function deleteTournamentFull(id: string) {
  // 1. Unlink next matches to avoid FK constraints if any self-referencing
  await supabase.from('matches').update({ next_match_id: null }).eq('tournament_id', id);

  // 2. Delete matches
  await supabase.from('matches').delete().eq('tournament_id', id);

  // 3. Delete participants
  await supabase.from('participants').delete().eq('tournament_id', id);

  // 4. Delete permissions
  await supabase.from('user_tournament_permissions').delete().eq('tournament_id', id);

  // 5. Delete tournament
  return await supabase.from('tournaments').delete().eq('id', id);
}

export async function createTournament(payload: {
  name: string;
  slug: string;
  game: string;
  format: string;
  config: Record<string, unknown>;
  is_public: boolean;
  created_by: string;
  status: string;
}) {
  return await supabase.from('tournaments').insert(payload).select().single();
}
