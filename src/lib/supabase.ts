import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project specified by user
export const DEFAULT_SUPABASE_URL = 'https://wtjuyjhviqqaejmmelje.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_MjR3drlK4_8Em2qYcBgegw_wO69SxpH';

// Retrieve from Vite environment variables, localStorage or default project credentials
const getStoredConfig = () => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_anon_key') || '' : '';

  const url = localUrl || envUrl || DEFAULT_SUPABASE_URL;
  const key = localKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(url && key && url.startsWith('http') && !url.includes('your-project'));

  return { url, key, isConfigured };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): { client: SupabaseClient | null; isConfigured: boolean } => {
  const { url, key, isConfigured } = getStoredConfig();

  if (!isConfigured) {
    return { client: null, isConfigured: false };
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return { client: null, isConfigured: false };
    }
  }

  return { client: supabaseInstance, isConfigured: true };
};

export const updateSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('supabase_custom_url', url.trim());
    else localStorage.removeItem('supabase_custom_url');

    if (key) localStorage.setItem('supabase_custom_anon_key', key.trim());
    else localStorage.removeItem('supabase_custom_anon_key');

    supabaseInstance = null; // Reset singleton
  }
};

export const getSupabaseStatus = () => {
  const config = getStoredConfig();
  return {
    ...config,
    maskedUrl: config.url ? `${config.url.slice(0, 15)}...${config.url.slice(-12)}` : '',
    maskedKey: config.key ? `${config.key.slice(0, 14)}••••••••••${config.key.slice(-8)}` : '',
  };
};

