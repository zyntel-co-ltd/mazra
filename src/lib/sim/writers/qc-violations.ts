import type { SupabaseClient } from "@supabase/supabase-js";

function utcDayEndExclusive(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/**
 * For Mazra-inserted QC runs on `dateIso` (UTC) with non-empty westgard_flags,
 * insert matching qc_violations rows on the target (Kanta) DB.
 */
export async function writeQcViolations(
  targetDb: SupabaseClient,
  facilityId: string,
  dateIso: string
): Promise<number> {
  const dayStart = `${dateIso}T00:00:00.000Z`;
  const dayEndEx = utcDayEndExclusive(dateIso);

  const { data: runs, error } = await targetDb
    .from("qc_runs")
    .select("id, material_id, westgard_flags, run_at")
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .gte("run_at", dayStart)
    .lt("run_at", dayEndEx);

  if (error) {
    throw new Error(`qc_violations fetch failed: ${error.message}`);
  }

  const flaggedRuns = (runs ?? []).filter((run) => {
    const flags = run.westgard_flags;
    return Array.isArray(flags) && flags.length > 0;
  });

  if (flaggedRuns.length === 0) return 0;

  const violations = flaggedRuns.flatMap((run) => {
    const flags = (run.westgard_flags as string[]) ?? [];
    const detectedAt =
      typeof run.run_at === "string"
        ? run.run_at
        : `${dateIso}T08:00:00.000Z`;
    return flags.map((rule) => ({
      run_id: run.id,
      facility_id: facilityId,
      rule,
      detected_at: detectedAt,
      mazra_generated: true,
    }));
  });

  const { error: insertError } = await targetDb
    .from("qc_violations")
    .insert(violations);

  if (insertError) {
    throw new Error(`qc_violations insert failed: ${insertError.message}`);
  }

  return violations.length;
}
