// ─── Supabase Client ─────────────────────────────────────────
// Provides server-side and browser-side Supabase clients

import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (API routes, server components, server actions).
 * Uses the service-role key — full admin access, bypasses RLS.
 * Do NOT import in client components.
 */
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Browser-side Supabase client (client components).
 * Uses the anon key — subject to Row Level Security policies.
 */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
