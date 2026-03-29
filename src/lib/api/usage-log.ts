import { createClient } from "@supabase/supabase-js";
import { getMazraSupabaseUrl } from "@/lib/mazra/env";

export async function logApiUsage(opts: {
  keyId: string;
  route: string;
  profileId: string | null;
  tableName: string | null;
  rowCount: number;
  responseMs: number;
}): Promise<void> {
  const url = getMazraSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await supabase.from("mazra_api_usage_log").insert({
    key_id: opts.keyId,
    route: opts.route,
    profile_id: opts.profileId,
    table_name: opts.tableName,
    row_count_returned: opts.rowCount,
    response_ms: opts.responseMs,
    requested_at: new Date().toISOString(),
  });
}
