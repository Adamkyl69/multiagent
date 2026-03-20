type ViteEnv = Record<string, string | undefined>;

const env = (import.meta as ImportMeta & { env: ViteEnv }).env;

export const API_BASE_URL = (env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? '';
export const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
