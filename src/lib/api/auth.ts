import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMazraSupabaseUrl } from "@/lib/mazra/env";

export type ApiKeyRecord = {
  id: string;
  subscriber_id: string | null;
  tier: "free" | "starter" | "professional" | "research" | "enterprise";
  is_active: boolean;
};

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function getControlClient(): SupabaseClient {
  const url = getMazraSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolve Bearer token to API key row. Returns null if missing/invalid/inactive.
 */
export async function verifyApiKey(
  authorizationHeader: string | null
): Promise<ApiKeyRecord | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }
  const raw = authorizationHeader.slice(7).trim();
  if (!raw) {
    return null;
  }
  const keyHash = hashApiKey(raw);
  const supabase = getControlClient();
  const { data, error } = await supabase
    .from("mazra_api_keys")
    .select("id, subscriber_id, tier, is_active")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return null;
  }

  await supabase
    .from("mazra_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id,
    subscriber_id: data.subscriber_id,
    tier: data.tier as ApiKeyRecord["tier"],
    is_active: data.is_active,
  };
}
