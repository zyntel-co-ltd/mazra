import type { SupabaseClient } from "@supabase/supabase-js";

/** Nakasero-style catalog — prices UGX, TAT minutes */
export const MAZRA_TEST_CATALOG = [
  { test_name: "CBC", section: "Haematology", price: 25000, tat_minutes: 45 },
  { test_name: "ESR", section: "Haematology", price: 15000, tat_minutes: 60 },
  { test_name: "Blood Film", section: "Haematology", price: 20000, tat_minutes: 90 },
  { test_name: "LFT", section: "Clinical Chemistry", price: 59160, tat_minutes: 60 },
  { test_name: "RFT", section: "Clinical Chemistry", price: 45000, tat_minutes: 60 },
  { test_name: "Glucose", section: "Clinical Chemistry", price: 15000, tat_minutes: 30 },
  { test_name: "Lipid Profile", section: "Clinical Chemistry", price: 55000, tat_minutes: 60 },
  { test_name: "Electrolytes", section: "Clinical Chemistry", price: 45000, tat_minutes: 60 },
  {
    test_name: "Culture & Sensitivity",
    section: "Microbiology",
    price: 85000,
    tat_minutes: 4320,
  },
  { test_name: "Gram Stain", section: "Microbiology", price: 25000, tat_minutes: 120 },
  { test_name: "AFB Smear", section: "Microbiology", price: 30000, tat_minutes: 240 },
  { test_name: "HIV Rapid", section: "Serology", price: 15000, tat_minutes: 30 },
  { test_name: "HBsAg", section: "Serology", price: 25000, tat_minutes: 60 },
  { test_name: "VDRL", section: "Serology", price: 20000, tat_minutes: 60 },
  { test_name: "Widal Test", section: "Serology", price: 25000, tat_minutes: 60 },
  { test_name: "TSH", section: "Endocrinology", price: 85000, tat_minutes: 90 },
  { test_name: "T3", section: "Endocrinology", price: 75000, tat_minutes: 90 },
  { test_name: "T4", section: "Endocrinology", price: 75000, tat_minutes: 90 },
  { test_name: "AFP", section: "Clinical Chemistry", price: 84660, tat_minutes: 90 },
  { test_name: "PSA", section: "Clinical Chemistry", price: 75000, tat_minutes: 90 },
] as const;

export function tatMinutesForTest(
  testName: string,
  priority: "stat" | "urgent" | "routine"
): number {
  const row = MAZRA_TEST_CATALOG.find(
    (t) => t.test_name.toLowerCase() === testName.trim().toLowerCase()
  );
  if (row) return row.tat_minutes;
  if (priority === "stat") return 30;
  if (priority === "urgent") return 60;
  return 120;
}

/**
 * Replace Mazra-seeded catalog rows for facility, then insert fresh (avoids expression unique index issues).
 */
export async function seedTestMetadata(
  targetDb: SupabaseClient,
  facilityId: string
): Promise<number> {
  const { error: delErr } = await targetDb
    .from("test_metadata")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (delErr) {
    throw new Error(`test_metadata delete: ${delErr.message}`);
  }

  const rows = MAZRA_TEST_CATALOG.map((t) => ({
    facility_id: facilityId,
    test_name: t.test_name,
    section: t.section,
    price: t.price,
    tat_minutes: t.tat_minutes,
    is_default: true,
    mazra_generated: true,
  }));

  const { error } = await targetDb.from("test_metadata").insert(rows);
  if (error) throw new Error(`test_metadata seed failed: ${error.message}`);
  return rows.length;
}
