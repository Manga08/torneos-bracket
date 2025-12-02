const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`Missing environment variable: ${key}`);
    }
    // In production we might want to throw or handle it differently,
    // but for now we'll return empty string to avoid crashing if not critical,
    // or throw if it is critical.
    // The requirement says "Valida en runtime (solo en dev) que las claves obligatorias existan; si faltan, lanza error claro."
    if (import.meta.env.DEV) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return value || '';
};

export const ENV = {
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  VITE_SUPER_ADMIN_EMAILS: import.meta.env.VITE_SUPER_ADMIN_EMAILS || '', // Optional or handled differently? Requirement says include it.
  VITE_AUTH_EMAIL_REDIRECT_URL: import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL || '',
  VITE_AUTH_RESET_PASSWORD_REDIRECT_URL:
    import.meta.env.VITE_AUTH_RESET_PASSWORD_REDIRECT_URL || '',

  // Helper to check if dev
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
