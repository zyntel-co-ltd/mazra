import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMazraServiceRoleKey, getMazraSupabaseUrl } from "./env";

/** Service-role client for Mazra's own Supabase project (RLS bypass). */
export function createMazraAdminClient(): SupabaseClient {
  const url = getMazraSupabaseUrl();
  const key = getMazraServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY for Mazra control plane"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
