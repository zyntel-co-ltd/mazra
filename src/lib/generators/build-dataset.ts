import seedrandom from "seedrandom";
import { stableUuid } from "./rng";
import { generateAlerts } from "./alerts";
import { generateEquipment, generateEquipmentTelemetry } from "./equipment-and-telemetry";
import { generateMaintenance } from "./maintenance";
import { generatePatients } from "./patients";
import { ALL_PROFILE_CONFIGS, profileUuid } from "./profiles";
import type { HospitalProfileConfig } from "./profiles/types";
import { generateQcRuns } from "./qc-runs";
import { generateReagentInventory } from "./reagents";
import { generateRefrigeratorReadings } from "./refrigerator";
import { generateStaff } from "./staff";
import type {
  GeneratedDataset,
  HospitalProfileRow,
  LabSectionRow,
} from "./types";
import {
  buildTestCatalog,
  generateVisitsOrdersAndResults,
} from "./visits-and-orders";

export type DateRange = { startDate: Date; endDate: Date };

function labSectionsForProfile(
  profile: HospitalProfileConfig,
  profileIdUuid: string,
  year: number
): LabSectionRow[] {
  const rng = seedrandom(`${profileIdUuid}:lab_sections:${year}`);
  return profile.labSectionNames.map((name, i) => ({
    id: stableUuid(`${profile.profileId}:section:${year}:${name}`),
    profile_id: profileIdUuid,
    name,
    is_active: true,
    expected_tat_minutes: 45 + Math.floor(rng() * 120),
    staffing_level: profile.tier === "under_resourced" ? "understaffed" : "full",
  }));
}

/**
 * Deterministic dataset for one profile + date range (default 12 months via caller).
 */
export function buildDatasetForProfile(
  profile: HospitalProfileConfig,
  range: DateRange
): GeneratedDataset {
  const year = range.startDate.getUTCFullYear();
  const pid = profileUuid(profile.profileId);
  const hospital_profiles: HospitalProfileRow[] = [
    {
      id: pid,
      name: profile.name,
      classification: profile.classification,
      tier: profile.tier,
      bed_count: profile.bedCount,
      lab_sections: profile.labSectionNames,
      established_year: profile.establishedYear,
      location_type: profile.locationType,
    },
  ];

  const lab_sections = labSectionsForProfile(profile, pid, year);
  const staffRows = generateStaff(profile, pid, year, lab_sections);
  const staffIds = staffRows.map((s) => s.id);

  const patientCount = Math.min(
    100_000,
    Math.max(4000, Math.ceil(profile.dailyPatientsMax * 420))
  );
  const patients = generatePatients(profile, pid, year, patientCount);

  const catalog = buildTestCatalog(profile, pid, year, lab_sections);

  const { visits, orders, results, chains } = generateVisitsOrdersAndResults({
    profile,
    profileUuid: pid,
    year,
    start: range.startDate,
    end: range.endDate,
    patients,
    catalog,
    sections: lab_sections,
    staffIds,
  });

  const equipment = generateEquipment(profile, pid, year, lab_sections);
  const equipment_telemetry = generateEquipmentTelemetry(
    profile,
    pid,
    year,
    equipment,
    range.startDate,
    range.endDate
  );
  const refrigerator_readings = generateRefrigeratorReadings(
    profile,
    pid,
    year,
    equipment,
    range.startDate,
    range.endDate
  );
  const qc_runs = generateQcRuns(
    profile,
    pid,
    year,
    equipment,
    lab_sections,
    staffRows,
    range.startDate,
    range.endDate
  );
  const maintenance_events = generateMaintenance(profile, pid, year, equipment);
  const reagent_inventory = generateReagentInventory(
    profile,
    pid,
    year,
    lab_sections
  );
  const alerts = generateAlerts(profile, pid, year, equipment);

  return {
    hospital_profiles,
    lab_sections,
    staff: staffRows,
    patients,
    patient_visits: visits,
    test_catalog: catalog,
    test_orders: orders,
    test_results: results,
    sample_chain: chains,
    equipment,
    equipment_telemetry,
    refrigerator_readings,
    qc_runs,
    maintenance_events,
    reagent_inventory,
    alerts,
  };
}

export function defaultTwelveMonthRange(year: number): DateRange {
  return {
    startDate: new Date(Date.UTC(year, 0, 1)),
    endDate: new Date(Date.UTC(year, 11, 31)),
  };
}

export function allProfiles(): HospitalProfileConfig[] {
  return ALL_PROFILE_CONFIGS;
}
