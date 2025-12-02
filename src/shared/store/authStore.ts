import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { UserRole } from '@/features/auth/types/authTypes';
import { supabase } from '@/shared/api/supabaseClient';
import { ENV } from '@/shared/config';
import type { Profile } from '@/types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  isSuperAdmin: boolean;
  checkSession: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  role: null,
  isSuperAdmin: false,

  checkSession: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const userProfile = profile as Profile;
        const role = (userProfile?.role as UserRole) || null;

        // Calculate isSuperAdmin
        let isSuperAdmin = role === 'super_admin';

        // Check env var for super admin emails
        const superAdminEmails = ENV.VITE_SUPER_ADMIN_EMAILS.split(',') || [];
        if (
          session.user.email &&
          superAdminEmails
            .map((e: string) => e.trim().toLowerCase())
            .includes(session.user.email.toLowerCase())
        ) {
          isSuperAdmin = true;
        }

        set({
          user: session.user,
          profile: userProfile,
          loading: false,
          role,
          isSuperAdmin,
        });
      } else {
        set({
          user: null,
          profile: null,
          loading: false,
          role: null,
          isSuperAdmin: false,
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error checking session:', error);
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      role: null,
      isSuperAdmin: false,
    });
  },

  hasRole: (role: UserRole) => {
    const state = get();
    if (state.isSuperAdmin) return true;
    return state.role === role;
  },
}));
