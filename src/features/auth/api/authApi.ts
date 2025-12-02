import { supabase } from '@/shared/api/supabaseClient';
import { ENV } from '@/shared/config';

export async function signInWithEmailAndPassword(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailAndPassword(
  email: string,
  password: string,
  fullName?: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? null,
      },
      emailRedirectTo: ENV.VITE_AUTH_EMAIL_REDIRECT_URL,
    },
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[signUpWithEmailAndPassword] error', error);
    throw error;
  }

  return data;
}

export async function signOutUser() {
  return await supabase.auth.signOut();
}

// Actualiza el email del usuario actual (requiere sesión válida)
export async function updateCurrentUserEmail(newEmail: string) {
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[updateCurrentUserEmail] error', error);
    throw error;
  }

  return data;
}

// Actualiza la contraseña del usuario actual (requiere sesión válida)
export async function updateCurrentUserPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[updateCurrentUserPassword] error', error);
    throw error;
  }

  return data;
}

// Envía email de recuperación de contraseña a un email dado
export async function sendPasswordResetEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: ENV.VITE_AUTH_RESET_PASSWORD_REDIRECT_URL,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[sendPasswordResetEmail] error', error);
    throw error;
  }

  return data;
}

// Helper para actualizar el perfil del usuario autenticado
export async function updateCurrentUserProfile(update: { display_name?: string | null }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // eslint-disable-next-line no-console
    console.error('[updateCurrentUserProfile] no user', userError);
    throw userError ?? new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('id, email, display_name, role, created_at')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[updateCurrentUserProfile] error', error);
    throw error;
  }

  return data;
}
