import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { EquipmentRow, LabSectionRow, QcRunRow, StaffRow } from "./types";

export function generateQcRuns(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  equipment: EquipmentRow[],
  sections: LabSectionRow[],
  staff: StaffRow[],
  start: Date,
  end: Date
): QcRunRow[] {
  const rng = seedrandom(`${profileUuid}:qc:${year}`);
  const out: QcRunRow[] = [];
  const techs = staff.filter((s) => s.role === "technician" || s.role === "senior_technician");
  const performer = techs[0]?.id ?? staff[0]?.id ?? null;

  const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  for (let ms = startMs; ms <= endMs; ms += 86400000) {
    const d = new Date(ms);
    if (rng() > profile.qcDiscipline) continue;
    const eq = equipment[Math.floor(rng() * equipment.length)]!;
    const sec = sections[Math.floor(rng() * sections.length)]!;
    out.push({
      id: stableUuid(`${profile.profileId}:qc:${ms}`),
      profile_id: profileUuid,
      equipment_id: eq.id,
      section_id: sec.id,
      run_date: new Date(ms + 10 * 3600 * 1000).toISOString(),
      run_type: ["daily", "weekly", "monthly"][Math.floor(rng() * 3)] ?? "daily",
      material_lot_number: `LOT-${Math.floor(rng() * 10000)}`,
      performed_by: performer,
      result: rng() < 0.02 ? "fail" : rng() < 0.05 ? "borderline" : "pass",
      westgard_rule_violated: rng() < 0.01 ? "1_2s" : null,
      corrective_action_taken: rng() < 0.01 ? "Repeat run" : null,
    });
  }
  return out;
}
