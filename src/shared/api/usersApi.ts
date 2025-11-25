import { supabase } from './supabaseClient';

export async function fetchUserByEmail(email: string) {
  return await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
}
