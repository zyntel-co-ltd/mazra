import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";

/**
 * Monthly targets for tests volume, numbers module, and revenue — last 3 months + next month.
 */
export async function seedTargets(
  targetDb: SupabaseClient,
  facilityId: string,
  seedString: string
): Promise<number> {
  const rng = seededRng(`${seedString}:targets:monthly`);
  const today = new Date();
  let count = 0;

  for (let i = -3; i <= 1; i++) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1)
    );
    const periodStart = d.toISOString().slice(0, 10);

    const revenueRow = {
      facility_id: facilityId,
      period: "monthly" as const,
      period_start: periodStart,
      amount: 42000000 + Math.floor(rng() * 8000000),
      currency: "UGX",
      mazra_generated: true,
    };

    const testsTarget = 2400 + Math.floor(rng() * 400);

    const { error: rErr } = await targetDb
      .from("revenue_targets")
      .upsert(revenueRow, {
        onConflict: "facility_id,period,period_start",
      });
    if (rErr) throw new Error(`revenue_targets seed failed: ${rErr.message}`);
    count += 1;

    const { error: nErr } = await targetDb
      .from("numbers_targets")
      .upsert(
        {
          facility_id: facilityId,
          period: "monthly",
          period_start: periodStart,
          target: testsTarget,
          mazra_generated: true,
        },
        { onConflict: "facility_id,period,period_start" }
      );
    if (nErr) throw new Error(`numbers_targets seed failed: ${nErr.message}`);
    count += 1;

    const { error: tErr } = await targetDb
      .from("tests_targets")
      .upsert(
        {
          facility_id: facilityId,
          period: "monthly",
          period_start: periodStart,
          target: testsTarget,
          mazra_generated: true,
        },
        { onConflict: "facility_id,period,period_start" }
      );
    if (tErr) throw new Error(`tests_targets seed failed: ${tErr.message}`);
    count += 1;
  }

  return count;
}

const TAT_TARGET_ROWS: {
  section: string;
  test_name: string | null;
  target_minutes: number;
}[] = [
  { section: "Haematology", test_name: null, target_minutes: 45 },
  { section: "Clinical Chemistry", test_name: null, target_minutes: 60 },
  { section: "Microbiology", test_name: null, target_minutes: 4320 },
  { section: "Serology", test_name: null, target_minutes: 60 },
  { section: "Reference Lab", test_name: null, target_minutes: 17280 },
  { section: "Endocrinology", test_name: null, target_minutes: 90 },
  { section: "Haematology", test_name: "CBC", target_minutes: 45 },
  { section: "Clinical Chemistry", test_name: "Glucose", target_minutes: 30 },
  { section: "Serology", test_name: "HIV Rapid", target_minutes: 30 },
  {
    section: "Microbiology",
    test_name: "Culture & Sensitivity",
    target_minutes: 4320,
  },
];

/**
 * Replace Mazra-owned TAT targets for the facility (avoids expression-unique upsert issues).
 */
export async function seedTatTargets(
  targetDb: SupabaseClient,
  facilityId: string
): Promise<number> {
  const { error: delErr } = await targetDb
    .from("tat_targets")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (delErr) {
    throw new Error(`tat_targets delete: ${delErr.message}`);
  }

  const rows = TAT_TARGET_ROWS.map((t) => ({
    facility_id: facilityId,
    section: t.section,
    test_name: t.test_name,
    target_minutes: t.target_minutes,
    mazra_generated: true,
  }));

  const { error } = await targetDb.from("tat_targets").insert(rows);
  if (error) {
    throw new Error(`tat_targets seed failed: ${error.message}`);
  }
  return rows.length;
}
