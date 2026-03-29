/** Laboratory + control tables exposed by REST v1 (ENG-114 + control plane). */
export const VALID_TABLES = [
  "hospital_profiles",
  "patients",
  "patient_visits",
  "lab_sections",
  "test_catalog",
  "test_orders",
  "test_results",
  "sample_chain",
  "equipment",
  "equipment_telemetry",
  "refrigerator_readings",
  "qc_runs",
  "maintenance_events",
  "reagent_inventory",
  "staff",
  "alerts",
] as const;

export type ValidTable = (typeof VALID_TABLES)[number];

export function isValidTable(name: string): name is ValidTable {
  return (VALID_TABLES as readonly string[]).includes(name);
}

/** Primary column used for `from` / `to` filters (ISO date strings). */
export const TABLE_DATE_COLUMN: Partial<Record<ValidTable, string>> = {
  patients: "registration_date",
  patient_visits: "visit_date",
  lab_sections: "id",
  test_catalog: "id",
  test_orders: "ordered_at",
  test_results: "resulted_at",
  sample_chain: "sample_collected_at",
  equipment: "installation_date",
  equipment_telemetry: "recorded_at",
  refrigerator_readings: "recorded_at",
  qc_runs: "run_date",
  maintenance_events: "actual_date",
  reagent_inventory: "last_restocked_at",
  staff: "employment_start_date",
  alerts: "triggered_at",
};

/** Free tier may only query this profile slug (ENG-120). */
export const FREE_TIER_PROFILE_SLUG = "health-centre-iii";

/** Max date range in days for free tier. */
export const FREE_TIER_MAX_RANGE_DAYS = 30;
