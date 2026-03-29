import seedrandom from "seedrandom";
import { pickName } from "./data/animal-species";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type { PatientRow } from "./types";

const INS = ["cash", "nhis", "private_insurance", "employer_scheme", "unknown"] as const;

export function generatePatients(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  count: number
): PatientRow[] {
  const rng = seedrandom(`${profileUuid}:patients:${year}`);
  const out: PatientRow[] = [];
  for (let i = 0; i < count; i++) {
    const id = stableUuid(`${profile.profileId}:patient:${year}:${i}`);
    const sex = rng() < 0.48 ? "F" : rng() < 0.95 ? "M" : "unknown";
    const dobYear = 1955 + Math.floor(rng() * 45);
    const dobMonth = 1 + Math.floor(rng() * 12);
    const dobDay = 1 + Math.floor(rng() * 28);
    out.push({
      id,
      profile_id: profileUuid,
      display_name: pickName(rng),
      name_source: "synthetic",
      date_of_birth: `${dobYear}-${String(dobMonth).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`,
      sex,
      blood_group: ["A+", "B+", "O+", "AB+", "O-", "A-", "B-", "AB-"][Math.floor(rng() * 8)] ?? "O+",
      insurance_type: INS[Math.floor(rng() * INS.length)] ?? "unknown",
      registration_date: `${year}-01-01`,
      is_active: true,
    });
  }
  return out;
}
