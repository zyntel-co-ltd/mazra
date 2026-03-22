import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Daily equipment status rollup for analytics (one row per asset per UTC day).
 */
export async function generateEquipmentSnapshots(
  dateIso: string,
  targetDb: SupabaseClient,
  facilityId: string
): Promise<{ inserted: number; error?: string }> {
  const { data: equipment, error: eqErr } = await targetDb
    .from("equipment")
    .select("id, status")
    .eq("facility_id", facilityId);

  if (eqErr) return { inserted: 0, error: eqErr.message };
  if (!equipment?.length) return { inserted: 0 };

  const dayStart = `${dateIso}T00:00:00.000Z`;
  const dayEnd = `${dateIso}T23:59:59.999Z`;

  const { error: delErr } = await targetDb
    .from("equipment_snapshots")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .gte("snapshot_date", dayStart)
    .lte("snapshot_date", dayEnd);
  if (delErr) return { inserted: 0, error: delErr.message };

  const snapshotTs = `${dateIso}T12:00:00.000Z`;

  const snapshots = equipment.map((eq) => ({
    equipment_id: eq.id as string,
    facility_id: facilityId,
    hospital_id: facilityId,
    status: String(eq.status ?? "operational"),
    snapshot_date: snapshotTs,
    mazra_generated: true,
  }));

  const { error } = await targetDb.from("equipment_snapshots").insert(snapshots);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: snapshots.length };
}
