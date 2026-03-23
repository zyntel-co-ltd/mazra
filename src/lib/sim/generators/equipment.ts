import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { fmtRtime } from "./time-encoding";

const STAFF = [
  "Auma R.",
  "Nakato S.",
  "Omondi T.",
  "Zawadi M.",
  "Mwangi P.",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function generateEquipmentScansForDay(opts: {
  facilityId: string;
  relativeDay: number;
  equipmentPlaceholders: string[];
  equipmentDownFirst: boolean;
  scanCompliance: number;
  rng: () => number;
}): Record<string, unknown>[] {
  const {
    facilityId,
    relativeDay,
    equipmentPlaceholders,
    equipmentDownFirst,
    scanCompliance,
    rng,
  } = opts;

  const scans: Record<string, unknown>[] = [];

  for (let ei = 0; ei < equipmentPlaceholders.length; ei++) {
    const eqId = equipmentPlaceholders[ei]!;
    if (rng() > scanCompliance) continue;

    const scansThis = 1 + Math.floor(rng() * 2);
    for (let s = 0; s < scansThis; s++) {
      const hour = 7 + Math.floor(rng() * 13);
      const minute = Math.floor(rng() * 60);
      const mins = hour * 60 + minute;

      const down = equipmentDownFirst && ei === 0;
      const statusIndex = Math.floor(rng() * 10);
      const status_at_scan = down
        ? "offline"
        : statusIndex < 7
          ? "operational"
          : statusIndex < 9
            ? "maintenance"
            : "offline";

      scans.push({
        id: deterministicUuid(`scan:${relativeDay}:${ei}:${s}`),
        hospital_id: facilityId,
        facility_id: facilityId,
        equipment_id: eqId,
        scanned_by: STAFF[Math.floor(rng() * STAFF.length)] ?? "System",
        status_at_scan,
        location: null,
        notes: null,
        synced: true,
        created_at: fmtRtime(relativeDay, mins),
        mazra_generated: true,
      });
    }
  }

  return scans;
}

export function generateEquipmentSnapshotsForDay(opts: {
  facilityId: string;
  relativeDay: number;
  equipmentPlaceholders: string[];
  equipmentDownFirst: boolean;
}): Record<string, unknown>[] {
  const { facilityId, relativeDay, equipmentPlaceholders, equipmentDownFirst } =
    opts;

  return equipmentPlaceholders.map((eqId, ei) => {
    const down = equipmentDownFirst && ei === 0;
    return {
      id: deterministicUuid(`snap:${relativeDay}:${eqId}`),
      equipment_id: eqId,
      facility_id: facilityId,
      hospital_id: facilityId,
      status: down ? "offline" : "operational",
      snapshot_date: fmtRtime(relativeDay, 12 * 60),
      mazra_generated: true,
    };
  });
}
