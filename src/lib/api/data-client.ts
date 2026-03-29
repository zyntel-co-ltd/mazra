import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMazraSupabaseUrl } from "@/lib/mazra/env";
import { getDataReadSupabaseKey } from "./env";

/** Read client for hospital data — SELECT only in route handlers. */
export function createMazraDataReadClient(): SupabaseClient {
  const url = getMazraSupabaseUrl();
  const key = getDataReadSupabaseKey();
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_READ_ONLY_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
