import seedrandom from "seedrandom";
import { pickName } from "./data/animal-species";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { LabSectionRow, StaffRow } from "./types";

const ROLES = [
  "lab_director",
  "senior_technician",
  "technician",
  "receptionist",
  "cleaner",
  "biosafety_officer",
  "data_officer",
] as const;

export function generateStaff(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  sections: LabSectionRow[]
): StaffRow[] {
  const rng = seedrandom(`${profileUuid}:staff:${year}`);
  const n = 8 + Math.floor(rng() * 8);
  const out: StaffRow[] = [];
  for (let i = 0; i < n; i++) {
    const section = sections.length
      ? sections[Math.floor(rng() * sections.length)]
      : null;
    out.push({
      id: stableUuid(`${profile.profileId}:staff:${year}:${i}`),
      profile_id: profileUuid,
      display_name: pickName(rng),
      role: ROLES[Math.floor(rng() * ROLES.length)] ?? "technician",
      section_id: section?.id ?? null,
      employment_start_date: `${profile.establishedYear + Math.floor(rng() * 10)}-06-01`,
      shift_pattern: ["day", "night", "rotating"][Math.floor(rng() * 3)] ?? "day",
    });
  }
  return out;
}
