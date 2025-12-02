import { createClient } from '@supabase/supabase-js';

import { ENV } from '@/shared/config';

export const supabase = createClient(ENV.VITE_SUPABASE_URL, ENV.VITE_SUPABASE_ANON_KEY);
