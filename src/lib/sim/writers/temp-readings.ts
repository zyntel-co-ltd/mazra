import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";

export type FridgeUnitRow = {
  id: string;
  min_temp_celsius: number;
  max_temp_celsius: number;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * 15-minute slots (96/day) per refrigerator unit + breach rows from out-of-range streaks.
 */
export async function insertTempReadingsForFridges(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string,
  fridges: FridgeUnitRow[]
): Promise<{ inserted: number; breachesInserted: number; error?: string }> {
  if (fridges.length === 0) return { inserted: 0, breachesInserted: 0 };

  const rng = seededRng(`${seedString}:fridges:${dateIso}`);
  const dayOfWeek = new Date(`${dateIso}T12:00:00Z`).getUTCDay();
  const isTuesdayOrThursday = dayOfWeek === 2 || dayOfWeek === 4;

  const readings: {
    unit_id: string;
    facility_id: string;
    temp_celsius: number;
    recorded_at: string;
    mazra_generated: boolean;
  }[] = [];

  for (let i = 0; i < fridges.length; i++) {
    const fr = fridges[i]!;
    const unitId = fr.id;
    const minT = Number(fr.min_temp_celsius);
    const maxT = Number(fr.max_temp_celsius);
    const baseline = minT + (maxT - minT) * 0.4;

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
  if (error) return { inserted: 0, breachesInserted: 0, error: error.message };

  const breachRows: Record<string, unknown>[] = [];
  for (const fr of fridges) {
    const minT = Number(fr.min_temp_celsius);
    const maxT = Number(fr.max_temp_celsius);
    const unitReadings = readings.map((r) => ({
      unit_id: r.unit_id,
      temp_celsius: r.temp_celsius,
      recorded_at: r.recorded_at,
    }));
    let inBreach = false;
    let breachStart: string | null = null;
    let maxDev = 0;
    let breachIsHot = true;

    const sorted = unitReadings
      .filter((r) => r.unit_id === fr.id)
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );

    for (const reading of sorted) {
      const t = reading.temp_celsius;
      const tooCold = t < minT;
      const tooHot = t > maxT;
      const isBreach = tooCold || tooHot;

      if (isBreach) {
        const dev = tooHot ? t - maxT : minT - t;
        maxDev = Math.max(maxDev, dev);
        breachIsHot = tooHot;
        if (!inBreach) {
          inBreach = true;
          breachStart = reading.recorded_at;
        }
      } else if (inBreach && breachStart) {
        breachRows.push({
          unit_id: fr.id,
          facility_id: facilityId,
          breach_type: breachIsHot ? "too_hot" : "too_cold",
          started_at: breachStart,
          resolved_at: reading.recorded_at,
          max_deviation: Math.round(maxDev * 10) / 10,
          mazra_generated: true,
        });
        inBreach = false;
        breachStart = null;
        maxDev = 0;
      }
    }
  }

  let breachesInserted = 0;
  if (breachRows.length > 0) {
    const { error: bErr } = await target.from("temp_breaches").insert(breachRows);
    if (bErr) return { inserted: readings.length, breachesInserted: 0, error: bErr.message };
    breachesInserted = breachRows.length;
  }

  return { inserted: readings.length, breachesInserted };
}
