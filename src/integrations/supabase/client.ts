// Admin/empresário Supabase browser client.
// Uses a distinct storageKey so the empresário session never shares
// localStorage with the cliente final session (see client-public.ts).
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://iqnsyrybqmjbvlgpmzgv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbnN5cnlicW1qYnZsZ3Btemd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MTgyNTQsImV4cCI6MjA5ODA5NDI1NH0.4akpOOYT-nRANU2MhX3vbDXtMNh3OO-v5YPEGmibbzQ";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
    storageKey: 'bisme-admin-auth',
  },
});
