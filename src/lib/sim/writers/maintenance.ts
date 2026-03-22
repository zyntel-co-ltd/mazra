import type { SupabaseClient } from "@supabase/supabase-js";

const INTERVAL_BY_CATEGORY: Record<string, number> = {
  A: 30,
  B: 60,
  C: 90,
};

/**
 * One maintenance_schedule row per equipment (Mazra-owned rows replaced each run).
 */
export async function seedMaintenanceSchedule(
  targetDb: SupabaseClient,
  facilityId: string,
  rng: () => number
): Promise<{ inserted: number; error?: string }> {
  const { data: equipment, error: eqErr } = await targetDb
    .from("equipment")
    .select("id, category")
    .eq("facility_id", facilityId)
    .neq("status", "retired");

  if (eqErr) return { inserted: 0, error: eqErr.message };
  if (!equipment?.length) return { inserted: 0 };

  const { error: delErr } = await targetDb
    .from("maintenance_schedule")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);
  if (delErr) return { inserted: 0, error: delErr.message };

  const now = new Date();

  const schedules = equipment.map((eq) => {
    const cat = String(eq.category ?? "B");
    const intervalDays = INTERVAL_BY_CATEGORY[cat] ?? 60;
    const lastMaintained = new Date(now);
    lastMaintained.setUTCDate(
      lastMaintained.getUTCDate() - Math.floor(rng() * intervalDays)
    );
    const nextDue = new Date(lastMaintained);
    nextDue.setUTCDate(nextDue.getUTCDate() + intervalDays);

    return {
      equipment_id: eq.id as string,
      facility_id: facilityId,
      interval_days: intervalDays,
      last_maintained_at: lastMaintained.toISOString(),
      next_due_at: nextDue.toISOString(),
      notes: "Scheduled preventive maintenance (Mazra)",
      mazra_generated: true,
    };
  });

  const { error } = await targetDb.from("maintenance_schedule").insert(schedules);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: schedules.length };
}
