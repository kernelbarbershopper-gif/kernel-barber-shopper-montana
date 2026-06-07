// Client-side env helpers. Use these everywhere instead of reading
// import.meta.env directly so we can swap to a runtime config later.
export const clientEnv = {
  SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
  ADMIN_EMAILS: ((import.meta as any).env?.VITE_ADMIN_EMAILS || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean),
  SENTRY_DSN: (import.meta as any).env?.VITE_SENTRY_DSN || '',
  BASE_URL: (import.meta as any).env?.VITE_BASE_URL || '',
};
