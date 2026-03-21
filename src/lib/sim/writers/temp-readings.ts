import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";

const FRIDGE_UNITS = [
  { min: 2, max: 6 },
  { min: 2, max: 6 },
  { min: 2, max: 8 },
  { min: 2, max: 8 },
  { min: 2, max: 8 },
  { min: 2, max: 8 },
  { min: 2, max: 8 },
  { min: 4, max: 10 },
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * 15-minute slots (96/day) per refrigerator unit.
 */
export async function insertTempReadingsForFridges(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string,
  fridgeUnitIds: string[]
): Promise<{ inserted: number; error?: string }> {
  if (fridgeUnitIds.length === 0) return { inserted: 0 };

  const rng = seededRng(`${seedString}:fridges:${dateIso}`);
  const dayOfWeek = new Date(`${dateIso}T12:00:00Z`).getUTCDay();
  const isTuesdayOrThursday = dayOfWeek === 2 || dayOfWeek === 4;

  const readings: Record<string, unknown>[] = [];

  for (let i = 0; i < fridgeUnitIds.length; i++) {
    const unit = FRIDGE_UNITS[i % FRIDGE_UNITS.length];
    const unitId = fridgeUnitIds[i];
    const baseline = unit.min + (unit.max - unit.min) * 0.4;

    for (let slot = 0; slot < 96; slot++) {
      const hour = Math.floor(slot / 4);
      const minute = (slot % 4) * 15;

      let temp = baseline + (rng() - 0.5) * 0.6;
      if (i === 0 && isTuesdayOrThursday && hour >= 11 && hour <= 14) {
        temp += 2.5 + rng() * 1.5;
      }

      const recorded_at = `${dateIso}T${pad2(hour)}:${pad2(minute)}:00.000Z`;

      readings.push({
        unit_id: unitId,
        facility_id: facilityId,
        temp_celsius: Math.round(temp * 10) / 10,
        recorded_at,
        mazra_generated: true,
      });
    }
  }

  const { error } = await target.from("temp_readings").insert(readings);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: readings.length };
}
