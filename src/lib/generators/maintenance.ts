import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { EquipmentRow, MaintenanceEventRow } from "./types";

export function generateMaintenance(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  equipment: EquipmentRow[]
): MaintenanceEventRow[] {
  const rng = seedrandom(`${profileUuid}:maint:${year}`);
  const out: MaintenanceEventRow[] = [];
  let i = 0;
  for (const eq of equipment) {
    if (rng() > 0.4 && out.length > 0) continue;
    out.push({
      id: stableUuid(`${profile.profileId}:maint:${year}:${i++}`),
      profile_id: profileUuid,
      equipment_id: eq.id,
      event_type: ["scheduled_pm", "breakdown", "calibration"][Math.floor(rng() * 3)] ?? "scheduled_pm",
      scheduled_date: `${year}-03-15`,
      actual_date: `${year}-03-16`,
      technician_type: rng() < 0.6 ? "internal" : "vendor",
      downtime_hours: (rng() * 8).toFixed(2),
      parts_replaced: rng() < 0.3 ? "O-ring kit" : null,
      cost_ugx: (50000 + Math.floor(rng() * 500000)).toFixed(2),
      resolution_notes: "Completed",
    });
  }
  return out;
}
