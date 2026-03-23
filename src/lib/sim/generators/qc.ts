import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { fmtRtime } from "./time-encoding";

const ANALYTES = [
  "Creatinine",
  "Glucose",
  "Haemoglobin",
  "WBC",
  "ALT",
  "TSH",
] as const;

export function generateQcRunsForDay(opts: {
  facilityId: string;
  relativeDay: number;
  driftAnalyte: string | null;
  rng: () => number;
}): { runs: Record<string, unknown>[]; violations: Record<string, unknown>[] } {
  const { facilityId, relativeDay, driftAnalyte, rng } = opts;
  const runs: Record<string, unknown>[] = [];
  const violations: Record<string, unknown>[] = [];

  const slots = [8 * 60 + 15, 14 * 60 + 20];

  let runSeq = 0;
  for (const analyte of ANALYTES) {
    const matId = `pmat:${analyte}`;
    for (const slotMin of slots) {
      const drift = driftAnalyte === analyte;
      const zScore = drift
        ? 2.2 + rng() * 1.5
        : (rng() - 0.5) * 2.2;
      const mean = 100;
      const sd = 5;
      const value = mean + zScore * sd;
      const flags: string[] =
        Math.abs(zScore) >= 2 ? ["1-2s"] : [];

      const runId = deterministicUuid(
        `qc:${relativeDay}:${analyte}:${slotMin}`
      );

      runs.push({
        id: runId,
        facility_id: facilityId,
        material_id: matId,
        value: Math.round(value * 100) / 100,
        run_at: fmtRtime(relativeDay, slotMin),
        z_score: Math.round(zScore * 100) / 100,
        westgard_flags: flags,
        mazra_generated: true,
      });

      if (Math.abs(zScore) >= 2.5 || (drift && rng() > 0.4)) {
        violations.push({
          id: deterministicUuid(`qcv:${runId}`),
          run_id: runId,
          facility_id: facilityId,
          rule: Math.abs(zScore) >= 3 ? "1-3s" : "1-2s",
          detected_at: fmtRtime(relativeDay, slotMin + 5),
          resolved_at: null,
          notes: null,
          mazra_generated: true,
        });
      }
      runSeq += 1;
    }
  }

  return { runs, violations };
}
