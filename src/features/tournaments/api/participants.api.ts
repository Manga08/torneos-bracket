import { supabase } from '@/shared/api/supabaseClient';
import { deepMerge } from '@/shared/utils/deepMerge';
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

export async function updateParticipantSeed(participantId: string, seed: number) {
  return await supabase
    .from('participants')
    .update({
      seed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId);
}

export async function updateParticipantLeagueManualValue(
  participantId: string,
  columnId: string,
  value: string | number,
) {
  // 1. Fetch current metadata
  const { data: participant, error: fetchError } = await supabase
    .from('participants')
    .select('metadata')
    .eq('id', participantId)
    .single();

  if (fetchError) throw fetchError;

  const currentMeta = (participant.metadata as Record<string, unknown>) || {};

  // 2. Update metadata using deepMerge
  const newMeta = deepMerge(currentMeta, {
    leagueManual: {
      [columnId]: value,
    },
  });

  return await supabase
    .from('participants')
    .update({
      metadata: newMeta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId);
}

export async function randomizeParticipantSeeds(tournamentId: string) {
  // 1. Fetch all participants
  const { data: participants, error } = await fetchTournamentParticipants(tournamentId);
  if (error) throw error;
  if (!participants || participants.length === 0) return;

  // 2. Shuffle using Fisher-Yates
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 3. Update seeds
  // Using Promise.all for safety.
  const promises = shuffled.map((p, index) =>
    supabase
      .from('participants')
      .update({ seed: index + 1, updated_at: new Date().toISOString() })
      .eq('id', p.id),
  );

  await Promise.all(promises);
}
