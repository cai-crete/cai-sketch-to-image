import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file. Authentication features will not work.'
    );
}

// Fallback to a valid URL format to prevent the app from crashing entirely
// if the user hasn't replaced the placeholder yet.
const finalUrl = supabaseUrl?.startsWith('http')
    ? supabaseUrl
    : 'https://placeholder.supabase.co';

export const supabase = createClient(
    finalUrl,
    supabaseAnonKey || 'placeholder-key'
);
