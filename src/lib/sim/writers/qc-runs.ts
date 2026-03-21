import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";

const ANALYTES = [
  { name: "Creatinine", mean: 88, sd: 8, unit: "μmol/L" },
  { name: "Glucose", mean: 5.2, sd: 0.3, unit: "mmol/L" },
  { name: "Haemoglobin", mean: 140, sd: 5, unit: "g/L" },
  { name: "WBC", mean: 7.2, sd: 0.8, unit: "10^9/L" },
  { name: "ALT", mean: 35, sd: 4, unit: "U/L" },
  { name: "TSH", mean: 2.1, sd: 0.4, unit: "mIU/L" },
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Two QC runs per day (08:00, 14:00) per analyte material.
 */
export async function insertQcRuns(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string,
  materialIds: Record<string, string>
): Promise<{ inserted: number; error?: string }> {
  const rng = seededRng(`${seedString}:qc:${dateIso}`);
  const dayOfWeek = new Date(`${dateIso}T12:00:00Z`).getUTCDay();
  const isFriday = dayOfWeek === 5;

  const startDate = new Date("2026-01-01T00:00:00Z");
  const currentDate = new Date(`${dateIso}T00:00:00Z`);
  const daysSinceStart = Math.max(
    0,
    Math.floor(
      (currentDate.getTime() - startDate.getTime()) / 86_400_000
    )
  );
  const creatinineDrift = Math.min(daysSinceStart * 0.05, 1.9);

  const runs: Record<string, unknown>[] = [];

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
      const westgardFlags: string[] = [];
      if (Math.abs(zScore) >= 2 && Math.abs(zScore) < 3) westgardFlags.push("1-2s");
      if (Math.abs(zScore) >= 3) westgardFlags.push("1-3s");

      const run_at = `${dateIso}T${pad2(hour)}:00:00.000Z`;

      runs.push({
        facility_id: facilityId,
        material_id: materialId,
        value: Math.round(value * 100) / 100,
        run_at,
        z_score: Math.round(zScore * 100) / 100,
        westgard_flags: westgardFlags,
        mazra_generated: true,
      });
    }
  }

  if (runs.length === 0) return { inserted: 0 };

  const { error } = await target.from("qc_runs").insert(runs);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: runs.length };
}
