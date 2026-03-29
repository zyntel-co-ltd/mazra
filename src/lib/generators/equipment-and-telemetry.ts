import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { EquipmentRow, EquipmentTelemetryRow, LabSectionRow } from "./types";

const TYPES = [
  "haematology_analyser",
  "chemistry_analyser",
  "coagulation_analyser",
  "centrifuge",
  "microbiology_incubator",
  "cold_chain_unit",
  "pcr_thermocycler",
  "microscope",
] as const;

const MAKERS = ["Sysmex", "Mindray", "Roche", "Abbott", "Thermo", "BioTek"];

export function generateEquipment(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  sections: LabSectionRow[]
): EquipmentRow[] {
  const rng = seedrandom(`${profileUuid}:equipment:${year}`);
  const out: EquipmentRow[] = [];
  for (let i = 0; i < profile.equipmentCount; i++) {
    const sec = sections[i % sections.length]!;
    const isFridge = i < profile.fridgeCount;
    out.push({
      id: stableUuid(`${profile.profileId}:equipment:${year}:${i}`),
      profile_id: profileUuid,
      section_id: sec.id,
      equipment_type: isFridge ? "cold_chain_unit" : TYPES[i % TYPES.length]!,
      manufacturer: MAKERS[i % MAKERS.length] ?? "Sysmex",
      model: `Model-${100 + i}`,
      serial_number: `SN-${profile.profileId}-${year}-${i}`,
      installation_date: `${2010 + Math.floor(rng() * 10)}-01-15`,
      last_calibration_date: `${year - 1}-06-01`,
      next_calibration_due: `${year + 1}-06-01`,
      status: "active",
      category: (["A", "B", "C"] as const)[i % 3] ?? "B",
    });
  }
  return out;
}

export function generateEquipmentTelemetry(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  equipment: EquipmentRow[],
  start: Date,
  end: Date
): EquipmentTelemetryRow[] {
  const rng = seedrandom(`${profileUuid}:equipment_telemetry:${year}`);
  const out: EquipmentTelemetryRow[] = [];
  const nonFridge = equipment.filter((e) => e.equipment_type !== "cold_chain_unit");
  const startMs = start.getTime();
  const endMs = end.getTime();
  const step = 4 * 60 * 60 * 1000; // 4h
  for (const eq of nonFridge) {
    for (let t = startMs; t <= endMs; t += step) {
      const recorded = new Date(t + Math.floor(rng() * 60) * 1000);
      out.push({
        id: stableUuid(`${eq.id}:tel:${recorded.toISOString()}`),
        profile_id: profileUuid,
        equipment_id: eq.id,
        recorded_at: recorded.toISOString(),
        metric_name: rng() < 0.5 ? "runtime_hours" : "samples_processed",
        metric_value: (rng() * 24).toFixed(4),
        metric_unit: rng() < 0.5 ? "h" : "count",
        source: "sensor",
        is_alert_threshold_breached: rng() < 0.001,
      });
    }
  }
  return out;
}
