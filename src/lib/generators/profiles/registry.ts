import { stableUuid } from "../rng";
import type { HospitalProfileConfig } from "./types";

const BASE_SECTIONS = [
  "Haematology",
  "Biochemistry",
  "Microbiology",
  "Serology",
  "Parasitology",
  "Histology",
  "Blood Bank",
];

function sections(n: number): string[] {
  return BASE_SECTIONS.slice(0, n);
}

function uuid(slug: string): string {
  return stableUuid(`mazra-hospital-profile:${slug}`);
}

const raw: HospitalProfileConfig[] = [
  {
    profileId: "health-centre-iii",
    name: "Mazra Health Centre III",
    classification: "health_centre_iii",
    tier: "under_resourced",
    bedCount: 45,
    labSectionNames: sections(3),
    establishedYear: 2008,
    locationType: "rural",
    dailyPatientsMin: 20,
    dailyPatientsMax: 40,
    equipmentCount: 5,
    fridgeCount: 2,
    testCatalogSize: 28,
    qcDiscipline: 0.55,
  },
  {
    profileId: "health-centre-iv",
    name: "Mazra Health Centre IV",
    classification: "health_centre_iv",
    tier: "mid_tier",
    bedCount: 90,
    labSectionNames: sections(4),
    establishedYear: 2005,
    locationType: "peri_urban",
    dailyPatientsMin: 40,
    dailyPatientsMax: 80,
    equipmentCount: 10,
    fridgeCount: 3,
    testCatalogSize: 48,
    qcDiscipline: 0.72,
  },
  {
    profileId: "general-hospital",
    name: "Mazra General Hospital",
    classification: "general_hospital",
    tier: "mid_tier",
    bedCount: 220,
    labSectionNames: sections(5),
    establishedYear: 1998,
    locationType: "urban",
    dailyPatientsMin: 80,
    dailyPatientsMax: 150,
    equipmentCount: 18,
    fridgeCount: 5,
    testCatalogSize: 85,
    qcDiscipline: 0.85,
  },
  {
    profileId: "referral-hospital",
    name: "Mazra Referral Hospital",
    classification: "regional_referral",
    tier: "well_resourced",
    bedCount: 420,
    labSectionNames: sections(6),
    establishedYear: 1992,
    locationType: "urban",
    dailyPatientsMin: 150,
    dailyPatientsMax: 250,
    equipmentCount: 30,
    fridgeCount: 6,
    testCatalogSize: 130,
    qcDiscipline: 0.92,
  },
  {
    profileId: "national-referral",
    name: "Mazra National Referral Hospital",
    classification: "national_referral",
    tier: "well_resourced",
    bedCount: 800,
    labSectionNames: sections(7),
    establishedYear: 1962,
    locationType: "urban",
    dailyPatientsMin: 250,
    dailyPatientsMax: 400,
    equipmentCount: 45,
    fridgeCount: 8,
    testCatalogSize: 210,
    qcDiscipline: 0.98,
  },
  {
    profileId: "reference-laboratory",
    name: "Mazra Reference Laboratory",
    classification: "reference_laboratory",
    tier: "well_resourced",
    bedCount: 120,
    labSectionNames: sections(6),
    establishedYear: 2001,
    locationType: "urban",
    dailyPatientsMin: 150,
    dailyPatientsMax: 200,
    equipmentCount: 28,
    fridgeCount: 6,
    testCatalogSize: 220,
    qcDiscipline: 0.99,
  },
  {
    profileId: "research-institute",
    name: "Mazra Research Institute",
    classification: "research_institute",
    tier: "well_resourced",
    bedCount: 60,
    labSectionNames: sections(4),
    establishedYear: 2015,
    locationType: "urban",
    dailyPatientsMin: 50,
    dailyPatientsMax: 80,
    equipmentCount: 25,
    fridgeCount: 4,
    testCatalogSize: 95,
    qcDiscipline: 0.95,
  },
];

export const PROFILE_CONFIGS: Record<string, HospitalProfileConfig> =
  Object.fromEntries(raw.map((c) => [c.profileId, c]));

export const ALL_PROFILE_CONFIGS: HospitalProfileConfig[] = raw;

export function profileUuid(profileId: string): string {
  return uuid(profileId);
}
