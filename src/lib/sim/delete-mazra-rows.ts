import type { SupabaseClient } from "@supabase/supabase-js";

/** Delete synthetic rows only (FK-safe order). */
const TABLES = [
  "qc_violations",
  "qc_runs",
  "temp_readings",
  "scan_events",
  "revenue_entries",
  "test_requests",
] as const;

export async function deleteMazraGeneratedForFacility(
  target: SupabaseClient,
  facilityId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const table of TABLES) {
    const { error } = await target
      .from(table)
      .delete()
      .eq("facility_id", facilityId)
      .eq("mazra_generated", true);
    if (error) {
      return { ok: false, error: `${table}: ${error.message}` };
    }
  }
  return { ok: true };
}
