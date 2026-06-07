// Lightweight env validator for runtime. We avoid adding zod to keep the
// client bundle small; the server already validates via api/_lib/env.ts.
// Returns { valid, missing } so callers can decide how to handle.

const REQUIRED_CLIENT_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export function validateClientEnv(env: Record<string, string | undefined>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const key of REQUIRED_CLIENT_VARS) {
    if (!env[key] || env[key]!.length < 8) missing.push(key);
  }
  return { valid: missing.length === 0, missing };
}

// Run on module load in dev to surface config issues early.
if (import.meta.env.DEV) {
  const result = validateClientEnv(import.meta.env as any);
  if (!result.valid) {
    // eslint-disable-next-line no-console
    console.warn('[env] Missing or invalid client env vars:', result.missing);
  }
}
