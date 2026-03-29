export type Classification =
  | "health_centre_iii"
  | "health_centre_iv"
  | "general_hospital"
  | "regional_referral"
  | "national_referral"
  | "reference_laboratory"
  | "research_institute";

export type Tier = "well_resourced" | "mid_tier" | "under_resourced";

export type LocationType = "urban" | "peri_urban" | "rural";

export type HospitalProfileConfig = {
  profileId: string;
  name: string;
  classification: Classification;
  tier: Tier | null;
  bedCount: number;
  labSectionNames: string[];
  establishedYear: number;
  locationType: LocationType;
  dailyPatientsMin: number;
  dailyPatientsMax: number;
  equipmentCount: number;
  fridgeCount: number;
  testCatalogSize: number;
  /** Rough QC coverage: 1 = daily on well-resourced, <1 gaps for under_resourced */
  qcDiscipline: number;
};
