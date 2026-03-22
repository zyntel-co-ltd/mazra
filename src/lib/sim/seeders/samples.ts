import type { SupabaseClient } from "@supabase/supabase-js";

const SAMPLE_TYPES = ["Blood", "Urine", "Serum", "EDTA", "Swab"] as const;

/**
 * Phase 9 samples: racks + samples (matches Kanta lab_racks / lab_samples schema).
 * Deletes prior Mazra rows for the facility, then inserts 20 racks and ~40–90 samples each.
 */
export async function seedLabRacksAndSamples(
  targetDb: SupabaseClient,
  facilityId: string,
  rng: () => number
): Promise<{ racks: number; samples: number }> {
  const { error: delS } = await targetDb
    .from("lab_samples")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (delS) {
    throw new Error(`lab_samples delete: ${delS.message}`);
  }

  const { error: delR } = await targetDb
    .from("lab_racks")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (delR) {
    throw new Error(`lab_racks delete: ${delR.message}`);
  }

  const racksPayload = Array.from({ length: 20 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - Math.floor(rng() * 30));
    const rackDate = d.toISOString().slice(0, 10);
    const typeLabel =
      SAMPLE_TYPES[Math.floor(rng() * SAMPLE_TYPES.length)] ?? "Blood";
    return {
      facility_id: facilityId,
      rack_name: `RACK-${String(i + 1).padStart(3, "0")}`,
      rack_date: rackDate,
      rack_type: rng() > 0.15 ? ("normal" as const) : ("igra" as const),
      description: `Standard rack — ${typeLabel}`,
      mazra_generated: true,
    };
  });

  const { data: insertedRacks, error: rackError } = await targetDb
    .from("lab_racks")
    .insert(racksPayload)
    .select("id, rack_type");

  if (rackError) {
    throw new Error(`lab_racks seed failed: ${rackError.message}`);
  }

  const samples: Record<string, unknown>[] = [];
  let barcodeSeq = 0;

  for (const rack of insertedRacks ?? []) {
    const cap = rack.rack_type === "igra" ? 40 : 100;
    const sampleCount = Math.min(cap, 40 + Math.floor(rng() * 50));
    const positions = new Set<number>();
    while (positions.size < sampleCount) {
      positions.add(Math.floor(rng() * cap) + 1);
    }

    for (const pos of positions) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - Math.floor(rng() * 14));
      barcodeSeq += 1;
      const st =
        SAMPLE_TYPES[Math.floor(rng() * SAMPLE_TYPES.length)] ?? "Blood";
      samples.push({
        rack_id: rack.id as string,
        facility_id: facilityId,
        barcode: `BC${facilityId.slice(0, 8)}${barcodeSeq}${Math.floor(rng() * 10000)}`,
        patient_id: `PAT${Math.floor(rng() * 90000) + 10000}`,
        sample_type: st,
        position: pos,
        collection_date: d.toISOString().slice(0, 10),
        notes: rng() > 0.8 ? "Handle with care" : null,
        mazra_generated: true,
      });
    }
  }

  const batch = 500;
  for (let i = 0; i < samples.length; i += batch) {
    const { error } = await targetDb
      .from("lab_samples")
      .insert(samples.slice(i, i + batch));
    if (error) {
      throw new Error(`lab_samples seed failed: ${error.message}`);
    }
  }

  return { racks: racksPayload.length, samples: samples.length };
}
