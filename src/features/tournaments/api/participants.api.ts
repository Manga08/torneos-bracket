import { supabase } from '@/shared/api/supabaseClient';
import type { Participant } from '@/types/database';

export async function fetchTournamentParticipants(tournamentId: string) {
  return await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
}

export async function addParticipant(participant: Partial<Participant>) {
  return await supabase.from('participants').insert(participant).select().single();
}

export async function addParticipantsBulk(participants: Partial<Participant>[]) {
  return await supabase.from('participants').insert(participants);
}

export async function updateParticipant(id: string, updates: Partial<Participant>) {
  return await supabase.from('participants').update(updates).eq('id', id);
}

export async function upsertParticipants(participants: Partial<Participant>[]) {
  return await supabase.from('participants').upsert(participants);
}

export async function deleteParticipant(id: string) {
  return await supabase.from('participants').delete().eq('id', id);
}
