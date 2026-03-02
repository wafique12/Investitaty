const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const buildSupabaseError = (reason) => ({
  message: reason,
  name: 'SupabaseClientError',
});

const createFallbackQueryBuilder = (reason) => {
  const error = buildSupabaseError(reason);
  return {
    select() { return this; },
    order: async () => ({ data: [], error }),
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error }),
    insert: async () => ({ error }),
    update: () => ({ eq: async () => ({ error }) }),
  };
};

const createFallbackClient = (reason) => ({
  from: () => createFallbackQueryBuilder(reason),
});

let supabase = null;
let hasSupabaseClient = false;

if (!hasSupabaseConfig) {
  console.log('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Running with fallback mode.');
  supabase = createFallbackClient('Missing Supabase environment variables.');
} else if (typeof window !== 'undefined' && window?.supabase?.createClient) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    hasSupabaseClient = true;
  } catch (error) {
    console.log('[Supabase] Failed to initialize browser global client:', error);
    supabase = createFallbackClient('Failed to initialize Supabase browser global client.');
  }
} else {
  console.log('[Supabase] @supabase/supabase-js is unavailable in this environment. Running with fallback mode.');
  supabase = createFallbackClient('@supabase/supabase-js module is unavailable.');
}

export { supabase, hasSupabaseConfig, hasSupabaseClient };
