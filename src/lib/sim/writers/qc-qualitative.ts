import type { SupabaseClient } from "@supabase/supabase-js";

const QUALITATIVE_TESTS = [
  { test_name: "HIV Rapid", controls: ["Positive Control", "Negative Control"] },
  { test_name: "Malaria RDT", controls: ["Positive Control", "Negative Control"] },
  { test_name: "HCG (Pregnancy)", controls: ["Positive Control", "Negative Control"] },
  { test_name: "HBsAg", controls: ["Positive Control", "Negative Control"] },
] as const;

export async function seedQualitativeQcConfigs(
  targetDb: SupabaseClient,
  facilityId: string
): Promise<number> {
  const { error: eDel } = await targetDb
    .from("qualitative_qc_entries")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (eDel) throw new Error(`qualitative_qc_entries delete: ${eDel.message}`);

  const { error: cDel } = await targetDb
    .from("qualitative_qc_configs")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (cDel) throw new Error(`qualitative_qc_configs delete: ${cDel.message}`);

  const configs = QUALITATIVE_TESTS.map((t) => ({
    facility_id: facilityId,
    test_name: t.test_name,
    result_type: "Positive / Negative",
    lot_number: "LOT2026A",
    manufacturer: "SD Bioline",
    frequency: "Daily",
    controls: t.controls.map((name) => ({
      name,
      expected: name.includes("Positive") ? "Positive" : "Negative",
    })),
    mazra_generated: true,
  }));

  const { error } = await targetDb.from("qualitative_qc_configs").insert(configs);
  if (error) throw new Error(`qualitative_qc_configs seed failed: ${error.message}`);
  return configs.length;
}

export async function generateQualitativeEntries(
  dateIso: string,
  targetDb: SupabaseClient,
  facilityId: string,
  rng: () => number
): Promise<{ inserted: number; error?: string }> {
  const { error: delErr } = await targetDb
    .from("qualitative_qc_entries")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .eq("run_at", dateIso);
  if (delErr) return { inserted: 0, error: delErr.message };

  const { data: configRows, error: loadErr } = await targetDb
    .from("qualitative_qc_configs")
    .select("id, controls")
    .eq("facility_id", facilityId);

  if (loadErr) return { inserted: 0, error: loadErr.message };
  if (!configRows?.length) return { inserted: 0 };

  const entries = configRows.map((config) => {
    const controls = (config.controls as { name?: string; expected?: string }[]) ?? [];
    const allPass = rng() > 0.05;

    return {
      facility_id: facilityId,
      config_id: config.id as string,
      run_at: dateIso,
      control_results: controls.map((c) => {
        const exp = String(c.expected ?? "");
        return {
          name: c.name,
          expected: exp,
          actual: allPass
            ? exp
            : exp === "Positive"
              ? "Negative"
              : "Positive",
          pass: allPass,
        };
      }),
      overall_pass: allPass,
      corrective_action: allPass
        ? null
        : "Repeat test with new kit. Check lot expiry.",
      entered_by: "Auma R.",
      submitted: true,
      mazra_generated: true,
    };
  });

  const { error } = await targetDb.from("qualitative_qc_entries").insert(entries);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: entries.length };
}
