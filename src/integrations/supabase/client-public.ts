// Public / cliente final Supabase browser client.
// Isolated from the empresário/admin session via a distinct storageKey so
// logging in on the site público does not leak into the painel admin and
// vice-versa. Same Supabase project as the admin client.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://iqnsyrybqmjbvlgpmzgv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbnN5cnlicW1qYnZsZ3Btemd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MTgyNTQsImV4cCI6MjA5ODA5NDI1NH0.4akpOOYT-nRANU2MhX3vbDXtMNh3OO-v5YPEGmibbzQ";

// Import the public client like this:
// import { supabasePublic } from "@/integrations/supabase/client-public";
export const supabasePublic = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
    storageKey: 'bisme-client-auth',
  },
});
