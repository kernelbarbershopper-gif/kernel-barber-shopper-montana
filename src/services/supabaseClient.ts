import { createClient, User } from '@supabase/supabase-js';

// Read from Vite env only — no hardcoded fallbacks. Build fails loud if missing
// during `npm run build` (Vite validates import.meta.env at compile time).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check .env.example.');
}

export const supabase = createClient(supabaseUrl || 'https://invalid.supabase.co', supabaseAnonKey || 'invalid-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data?.subscription?.unsubscribe();
}

/**
 * Idempotent profile creation. Inserts a row in `public.profiles` keyed by user.id.
 * Safe to call multiple times for the same user (uses upsert with onConflict).
 */
export async function createUserDocument(user: User) {
  if (!user?.id) return;
  const displayName = (user.user_metadata?.full_name as string) || (user.email?.split('@')[0] ?? 'user');
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      display_name: displayName,
      role: 'user',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error && error.code !== 'PGRST116') {
    // eslint-disable-next-line no-console
    console.error('[supabase] createUserDocument error:', error.message);
  }
}
