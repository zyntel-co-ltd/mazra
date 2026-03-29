/** Row shapes aligned with `20260329103000_mazra_hospital_core_schema.sql` */

export type HospitalProfileRow = {
  id: string;
  name: string;
  classification: string;
  tier: string | null;
  bed_count: number | null;
  lab_sections: string[] | null;
  established_year: number | null;
  location_type: string | null;
};

export type LabSectionRow = {
  id: string;
  profile_id: string;
  name: string;
  is_active: boolean;
  expected_tat_minutes: number | null;
  staffing_level: string | null;
};

export type StaffRow = {
  id: string;
  profile_id: string;
  display_name: string;
  role: string;
  section_id: string | null;
  employment_start_date: string | null;
  shift_pattern: string | null;
};

export type PatientRow = {
  id: string;
  profile_id: string;
  display_name: string;
  name_source: string;
  date_of_birth: string | null;
  sex: string | null;
  blood_group: string | null;
  insurance_type: string;
  registration_date: string;
  is_active: boolean;
};

export type PatientVisitRow = {
  id: string;
  profile_id: string;
  patient_id: string;
  visit_date: string;
  visit_type: string;
  presenting_complaint_category: string | null;
  department: string | null;
  payment_method: string | null;
  discharge_date: string | null;
};

export type TestCatalogRow = {
  id: string;
  profile_id: string;
  section_id: string;
  test_name: string;
  loinc_code: string | null;
  standard_tat_minutes: number | null;
  price_ugx: string | null;
  requires_fasting: boolean;
  sample_type: string | null;
};

export type TestOrderRow = {
  id: string;
  profile_id: string;
  visit_id: string;
  patient_id: string;
  test_id: string;
  section_id: string;
  ordered_at: string;
  priority: string;
  ordering_clinician_id: string | null;
};

export type TestResultRow = {
  id: string;
  profile_id: string;
  order_id: string;
  test_id: string;
  result_value: string | null;
  result_numeric: string | null;
  result_unit: string | null;
  reference_range_low: string | null;
  reference_range_high: string | null;
  is_critical: boolean;
  status: string;
  resulted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
};

export type SampleChainRow = {
  id: string;
  profile_id: string;
  order_id: string;
  sample_type: string;
  sample_collected_at: string | null;
  sample_received_at: string | null;
  section_received_at: string | null;
  processing_started_at: string | null;
  result_ready_at: string | null;
  rejection_reason: string | null;
  is_rejected: boolean;
};

export type EquipmentRow = {
  id: string;
  profile_id: string;
  section_id: string | null;
  equipment_type: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  last_calibration_date: string | null;
  next_calibration_due: string | null;
  status: string;
  category: string | null;
};

export type EquipmentTelemetryRow = {
  id: string;
  profile_id: string;
  equipment_id: string;
  recorded_at: string;
  metric_name: string;
  metric_value: string | null;
  metric_unit: string | null;
  source: string;
  is_alert_threshold_breached: boolean;
};

export type RefrigeratorReadingRow = {
  id: string;
  profile_id: string;
  equipment_id: string;
  recorded_at: string;
  temperature_celsius: string;
  humidity_pct: string | null;
  door_open: boolean;
  alert_triggered: boolean;
  alert_type: string | null;
};

export type QcRunRow = {
  id: string;
  profile_id: string;
  equipment_id: string;
  section_id: string;
  run_date: string;
  run_type: string;
  material_lot_number: string | null;
  performed_by: string | null;
  result: string;
  westgard_rule_violated: string | null;
  corrective_action_taken: string | null;
};

export type MaintenanceEventRow = {
  id: string;
  profile_id: string;
  equipment_id: string;
  event_type: string;
  scheduled_date: string | null;
  actual_date: string | null;
  technician_type: string | null;
  downtime_hours: string | null;
  parts_replaced: string | null;
  cost_ugx: string | null;
  resolution_notes: string | null;
};

export type ReagentInventoryRow = {
  id: string;
  profile_id: string;
  section_id: string;
  item_name: string;
  item_type: string;
  lot_number: string | null;
  expiry_date: string | null;
  quantity_on_hand: string | null;
  unit: string | null;
  reorder_point: string | null;
  last_restocked_at: string | null;
  supplier: string | null;
};

export type AlertRow = {
  id: string;
  profile_id: string;
  source_type: string;
  source_id: string | null;
  alert_type: string;
  severity: string;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  message: string;
};

export type GeneratedDataset = {
  hospital_profiles: HospitalProfileRow[];
  lab_sections: LabSectionRow[];
  staff: StaffRow[];
  patients: PatientRow[];
  patient_visits: PatientVisitRow[];
  test_catalog: TestCatalogRow[];
  test_orders: TestOrderRow[];
  test_results: TestResultRow[];
  sample_chain: SampleChainRow[];
  equipment: EquipmentRow[];
  equipment_telemetry: EquipmentTelemetryRow[];
  refrigerator_readings: RefrigeratorReadingRow[];
  qc_runs: QcRunRow[];
  maintenance_events: MaintenanceEventRow[];
  reagent_inventory: ReagentInventoryRow[];
  alerts: AlertRow[];
};
