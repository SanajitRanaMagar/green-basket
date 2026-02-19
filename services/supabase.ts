import { createClient } from '@supabase/supabase-js';

// Safely access environment variables to prevent crash if import.meta.env is undefined
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase Environment Variables are missing. The app will render a configuration error.');
}

// Initialize with fallbacks so the app doesn't crash immediately. 
// App.tsx will handle checking if these are valid and showing the setup guide.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);