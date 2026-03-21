import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client DB used to insert Kanta-shaped rows (e.g. test_requests).
 * Priority:
 * 1) TARGET_SUPABASE_URL + TARGET_SUPABASE_SERVICE_ROLE_KEY
 * 2) First active mazra_clients.target_db_url + TARGET_SUPABASE_SERVICE_ROLE_KEY (same key for that DB)
 */
export async function createTargetWriteClient(
  mazra: SupabaseClient
): Promise<SupabaseClient | null> {
  const envUrl = process.env.TARGET_SUPABASE_URL?.trim();
  const envKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (envUrl && envKey) {
    return createClient(envUrl, envKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const key = envKey;
  if (!key) return null;

  const { data, error } = await mazra
    .from("mazra_clients")
    .select("target_db_url")
    .eq("is_active", true)
    .not("target_db_url", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !data?.target_db_url?.trim()) return null;

  const url = data.target_db_url.trim();
  if (!url.startsWith("http")) {
    console.warn(
      "[mazra] target_db_url must be a Supabase HTTPS URL for the JS client; skipping target writes."
    );
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
