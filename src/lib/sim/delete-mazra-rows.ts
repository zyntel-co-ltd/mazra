import type { SupabaseClient } from "@supabase/supabase-js";

/** Delete synthetic rows only (FK-safe order). */
const TABLES = [
  "qc_violations",
  "qualitative_qc_entries",
  "qc_results",
  "qc_runs",
  "tat_breaches",
  "temp_breaches",
  "temp_readings",
  "scan_events",
  "equipment_snapshots",
  "operational_alerts",
  "revenue_entries",
  "lab_samples",
  "lab_racks",
  "unmatched_tests",
  "equipment_telemetry_log",
  "test_requests",
  "maintenance_schedule",
  "qualitative_qc_configs",
  "test_metadata",
  "revenue_targets",
  "numbers_targets",
  "tests_targets",
  "tat_targets",
  "tat_anomaly_flags",
  "tat_anomaly_baselines",
  "weekly_summaries",
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

/** Alias for docs / external guides */
export const deleteMazraRowsForFacility = deleteMazraGeneratedForFacility;
