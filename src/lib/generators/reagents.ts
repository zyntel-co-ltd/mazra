import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { LabSectionRow, ReagentInventoryRow } from "./types";

export function generateReagentInventory(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  sections: LabSectionRow[]
): ReagentInventoryRow[] {
  const rng = seedrandom(`${profileUuid}:reagents:${year}`);
  const out: ReagentInventoryRow[] = [];
  let k = 0;
  for (const sec of sections) {
    for (let r = 0; r < 6; r++) {
      out.push({
        id: stableUuid(`${profile.profileId}:reagent:${sec.id}:${r}`),
        profile_id: profileUuid,
        section_id: sec.id,
        item_name: `Reagent ${sec.name} ${r + 1}`,
        item_type: ["reagent", "consumable", "control_material", "calibrator"][Math.floor(rng() * 4)] ?? "reagent",
        lot_number: `R-${year}-${k++}`,
        expiry_date: `${year + 1}-12-31`,
        quantity_on_hand: (rng() * 200).toFixed(3),
        unit: "L",
        reorder_point: "20.000",
        last_restocked_at: new Date(`${year}-06-01T10:00:00Z`).toISOString(),
        supplier: "Zyntel MedSupply",
      });
    }
  }
  return out;
}
