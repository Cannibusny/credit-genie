// Supabase client initialization
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, stubs } from "./config.js";
import { log } from "./logger.js";

// Admin client (service role key) — for creating users, bypassing RLS
let adminClient: SupabaseClient | null = null;

// Public client (anon key) — for client-side style auth operations
let publicClient: SupabaseClient | null = null;

if (!stubs.supabase && config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
  publicClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  log.info("Supabase public client initialized");
}

if (!stubs.supabase && config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY) {
  adminClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  log.info("Supabase admin client initialized");
}

export function getAdminClient(): SupabaseClient | null {
  return adminClient;
}

export function getPublicClient(): SupabaseClient | null {
  return publicClient;
}

export function isSupabaseConfigured(): boolean {
  return !stubs.supabase && adminClient !== null && publicClient !== null;
}
