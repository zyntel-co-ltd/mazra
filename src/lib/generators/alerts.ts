import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { AlertRow, EquipmentRow } from "./types";

export function generateAlerts(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  equipment: EquipmentRow[]
): AlertRow[] {
  const rng = seedrandom(`${profileUuid}:alerts:${year}`);
  const out: AlertRow[] = [];
  const n = 20 + Math.floor(rng() * 40);
  for (let i = 0; i < n; i++) {
    const eq = equipment[Math.floor(rng() * equipment.length)]!;
    out.push({
      id: stableUuid(`${profile.profileId}:alert:${year}:${i}`),
      profile_id: profileUuid,
      source_type: "equipment",
      source_id: eq.id,
      alert_type: "threshold",
      severity: ["info", "warning", "critical"][Math.floor(rng() * 3)] ?? "warning",
      triggered_at: new Date(
        `${year}-${String(1 + Math.floor(rng() * 11)).padStart(2, "0")}-15T12:00:00Z`
      ).toISOString(),
      acknowledged_at:
        rng() < 0.5 ? new Date(`${year}-06-01T12:00:00Z`).toISOString() : null,
      resolved_at:
        rng() < 0.4 ? new Date(`${year}-06-02T12:00:00Z`).toISOString() : null,
      message: `Equipment alert for ${eq.equipment_type}`,
    });
  }
  return out;
}
