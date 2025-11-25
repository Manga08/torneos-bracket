import { supabase } from '../../../shared/api/supabaseClient';
import type { UserRole } from '../types/authTypes';

export interface Profile {
  id: string;
  email: string | null;
  display_name?: string | null;
  role: UserRole;
  created_at: string;
}

export interface FetchUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

// Lista paginada de usuarios, filtrable por email
export async function fetchProfiles(params: FetchUsersParams = {}): Promise<Profile[]> {
  const {
    search = '',
    page = 1,
    pageSize = 20,
  } = params;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select('id, email, display_name, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    // ajusta el campo al que realmente corresponda (email / display_name)
    query = query.ilike('email', `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchProfiles] error', error);
    throw error;
  }

  return data as Profile[];
}

export interface UpdateProfilePayload {
  display_name?: string | null;
  role?: UserRole;
}

export async function updateUserProfile(
  profileId: string,
  payload: UpdateProfilePayload,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', profileId)
    .select('id, email, display_name, role, created_at')
    .single();

  if (error) {
    console.error('[updateUserProfile] error', error);
    throw error;
  }

  return data as Profile;
}

export async function updateUserRole(profileId: string, role: UserRole): Promise<Profile> {
  return updateUserProfile(profileId, { role });
}
