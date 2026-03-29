import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { EquipmentRow, RefrigeratorReadingRow } from "./types";

/** 15-minute interval cold-chain readings for fridge equipment rows. */
export function generateRefrigeratorReadings(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  equipment: EquipmentRow[],
  start: Date,
  end: Date
): RefrigeratorReadingRow[] {
  const fridges = equipment.filter((e) => e.equipment_type === "cold_chain_unit");
  const rng = seedrandom(`${profileUuid}:fridge:${year}`);
  const out: RefrigeratorReadingRow[] = [];
  const step = 15 * 60 * 1000;
  const startMs = start.getTime();
  const endMs = end.getTime();
  const excursionChance = profile.tier === "under_resourced" ? 0.004 : 0.001;

  for (const fr of fridges) {
    for (let t = startMs; t <= endMs; t += step) {
      const base = 3.5 + rng() * 3.5;
      const excursion = rng() < excursionChance ? 4 + rng() * 6 : 0;
      const temp = base + excursion;
      const door = rng() < 0.02;
      out.push({
        id: stableUuid(`${fr.id}:fr:${t}`),
        profile_id: profileUuid,
        equipment_id: fr.id,
        recorded_at: new Date(t).toISOString(),
        temperature_celsius: temp.toFixed(2),
        humidity_pct: (45 + rng() * 20).toFixed(2),
        door_open: door,
        alert_triggered: temp > 8 || door,
        alert_type:
          temp > 8
            ? "temp_high"
            : door
              ? "door_open_extended"
              : null,
      });
    }
  }
  return out;
}
