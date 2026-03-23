import { deterministicUuid } from "@/lib/sim/dataset-ids";
import type { FridgeBreachEvent } from "@/lib/sim/modes/types";
import { fmtRtime } from "./time-encoding";

function breachProb(
  freq: "none" | "monthly" | "biweekly" | "weekly" | "daily",
  rng: () => number
): boolean {
  switch (freq) {
    case "none":
      return false;
    case "monthly":
      return rng() < 1 / 30;
    case "biweekly":
      return rng() < 2 / 30;
    case "weekly":
      return rng() < 1 / 7;
    case "daily":
      return rng() > 0.15;
    default:
      return false;
  }
}

export function generateTempReadingsForDay(opts: {
  facilityId: string;
  relativeDay: number;
  fridgePlaceholders: string[];
  breachFrequency: "none" | "monthly" | "biweekly" | "weekly" | "daily";
  fridgeBreachEvents: FridgeBreachEvent[];
  dayIndex: number;
  rng: () => number;
}): { readings: Record<string, unknown>[]; breaches: Record<string, unknown>[] } {
  const {
    facilityId,
    relativeDay,
    fridgePlaceholders,
    breachFrequency,
    fridgeBreachEvents,
    dayIndex,
    rng,
  } = opts;

  const readings: Record<string, unknown>[] = [];
  const breaches: Record<string, unknown>[] = [];

  const forcedHot = breachProb(breachFrequency, rng);
  const scheduled = fridgeBreachEvents.filter((e) => e.day === dayIndex);

  for (let fi = 0; fi < fridgePlaceholders.length; fi++) {
    const unitId = fridgePlaceholders[fi]!;
    for (let h = 0; h < 24; h++) {
      const baseline = 4 + fi * 0.3;
      let temp = baseline + (rng() - 0.5) * 0.5;
      if (forcedHot && fi === 0 && h >= 11 && h <= 14) {
        temp += 3 + rng() * 2;
      }
      readings.push({
        id: deterministicUuid(`tmp:${relativeDay}:${fi}:${h}`),
        unit_id: unitId,
        facility_id: facilityId,
        temp_celsius: Math.round(temp * 10) / 10,
        recorded_at: fmtRtime(relativeDay, h * 60 + Math.floor(rng() * 45)),
        mazra_generated: true,
      });
    }
  }

  for (const ev of scheduled) {
    const fi = 0;
    const unitId = fridgePlaceholders[fi] ?? fridgePlaceholders[0]!;
    const startH = 10;
    const startM = startH * 60;
    const endM = startM + ev.duration_hours * 60;
    breaches.push({
      id: deterministicUuid(`tbr:${relativeDay}:${ev.unit}`),
      unit_id: unitId,
      facility_id: facilityId,
      breach_type: "too_hot",
      started_at: fmtRtime(relativeDay, startM),
      resolved_at: fmtRtime(relativeDay, endM),
      max_deviation: 3.5,
      mazra_generated: true,
    });
  }

  return { readings, breaches };
}
