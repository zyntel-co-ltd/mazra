import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";

const ANALYTES = [
  { name: "Creatinine", mean: 88, sd: 8 },
  { name: "Glucose", mean: 5.2, sd: 0.3 },
  { name: "Haemoglobin", mean: 140, sd: 5 },
  { name: "WBC", mean: 7.2, sd: 0.8 },
  { name: "ALT", mean: 35, sd: 4 },
  { name: "TSH", mean: 2.1, sd: 0.4 },
];

/**
 * Writes quantitative QC points used by Kanta Phase 11 UI (`qc_results`).
 * Keep this separate from `qc_runs` (which feeds `qc_violations`).
 */
export async function insertQcResultsQuantitative(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string,
  materialIds: Record<string, string>
): Promise<{ inserted: number; error?: string }> {
  const rng = seededRng(`${seedString}:qc-results:${dateIso}`);
  const dayOfWeek = new Date(`${dateIso}T12:00:00Z`).getUTCDay();
  const isFriday = dayOfWeek === 5;

  const startDate = new Date("2026-01-01T00:00:00Z");
  const currentDate = new Date(`${dateIso}T00:00:00Z`);
  const daysSinceStart = Math.max(
    0,
    Math.floor((currentDate.getTime() - startDate.getTime()) / 86_400_000)
  );
  const creatinineDrift = Math.min(daysSinceStart * 0.05, 1.9);

  const rows: Record<string, unknown>[] = [];

  for (const analyte of ANALYTES) {
    const materialId = materialIds[analyte.name];
    if (!materialId) continue;

    for (const hour of [8, 14]) {
      let zScore = (rng() - 0.5) * 2;

      if (analyte.name === "Creatinine") {
        zScore += creatinineDrift;
      }

      if (isFriday && analyte.name === "ALT" && hour === 14) {
        zScore = rng() > 0.5 ? 2.2 : -2.2;
      }

      const value = analyte.mean + zScore * analyte.sd;
      const ruleViolations: string[] = [];
      if (Math.abs(zScore) >= 2 && Math.abs(zScore) < 3)
        ruleViolations.push("1-2S");
      if (Math.abs(zScore) >= 3) ruleViolations.push("1-3S");

      rows.push({
        material_id: materialId,
        facility_id: facilityId,
        run_date: dateIso,
        value: Math.round(value * 100) / 100,
        z_score: Math.round(zScore * 100) / 100,
        rule_violations: ruleViolations,
        result_type: "quantitative",
        notes: null,
        operator: null,
        mazra_generated: true,
      });
    }
  }

  if (rows.length === 0) return { inserted: 0 };

  const { error } = await target.from("qc_results").insert(rows);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: rows.length };
}

