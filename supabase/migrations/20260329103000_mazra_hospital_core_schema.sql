-- Mazra Hospital — Laboratory module core schema (Phase 1)
-- See docs/MAZRA_HOSPITAL_PLAN.md
-- RLS intentionally disabled; access enforced at API / connection layer.

-- ---------------------------------------------------------------------------
-- hospital_profiles (root — no profile_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.hospital_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  classification text NOT NULL CHECK (
    classification IN (
      'health_centre_iii',
      'health_centre_iv',
      'general_hospital',
      'regional_referral',
      'national_referral',
      'reference_laboratory',
      'research_institute'
    )
  ),
  tier text CHECK (tier IN ('well_resourced', 'mid_tier', 'under_resourced')),
  bed_count int,
  lab_sections text[],
  established_year int,
  location_type text CHECK (location_type IN ('urban', 'peri_urban', 'rural'))
);

CREATE INDEX idx_hospital_profiles_classification ON public.hospital_profiles (classification);

-- ---------------------------------------------------------------------------
-- lab_sections
-- ---------------------------------------------------------------------------
CREATE TABLE public.lab_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expected_tat_minutes int,
  staffing_level text CHECK (staffing_level IN ('full', 'partial', 'understaffed'))
);

CREATE INDEX idx_lab_sections_profile_id ON public.lab_sections (profile_id);

-- ---------------------------------------------------------------------------
-- staff (before test_orders — FK from ordering_clinician)
-- ---------------------------------------------------------------------------
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (
    role IN (
      'lab_director',
      'senior_technician',
      'technician',
      'receptionist',
      'cleaner',
      'biosafety_officer',
      'data_officer'
    )
  ),
  section_id uuid REFERENCES public.lab_sections (id) ON DELETE SET NULL,
  employment_start_date date,
  shift_pattern text CHECK (shift_pattern IN ('day', 'night', 'rotating'))
);

CREATE INDEX idx_staff_profile_id ON public.staff (profile_id);

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  name_source text NOT NULL DEFAULT 'synthetic' CHECK (name_source IN ('synthetic', 'ai_generated')),
  date_of_birth date,
  sex text CHECK (sex IN ('M', 'F', 'unknown')),
  blood_group text,
  insurance_type text NOT NULL DEFAULT 'unknown' CHECK (
    insurance_type IN ('cash', 'nhis', 'private_insurance', 'employer_scheme', 'unknown')
  ),
  registration_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_patients_profile_id ON public.patients (profile_id);

-- ---------------------------------------------------------------------------
-- patient_visits
-- ---------------------------------------------------------------------------
CREATE TABLE public.patient_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL,
  visit_type text NOT NULL CHECK (visit_type IN ('outpatient', 'inpatient', 'emergency')),
  presenting_complaint_category text,
  department text,
  payment_method text,
  discharge_date timestamptz
);

CREATE INDEX idx_patient_visits_profile_id ON public.patient_visits (profile_id);
CREATE INDEX idx_patient_visits_visit_date ON public.patient_visits (visit_date);

-- ---------------------------------------------------------------------------
-- test_catalog
-- ---------------------------------------------------------------------------
CREATE TABLE public.test_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.lab_sections (id) ON DELETE CASCADE,
  test_name text NOT NULL,
  loinc_code text,
  standard_tat_minutes int,
  price_ugx numeric(12, 2),
  requires_fasting boolean NOT NULL DEFAULT false,
  sample_type text CHECK (
    sample_type IN ('blood', 'urine', 'swab', 'stool', 'csf', 'tissue', 'sputum', 'other')
  )
);

CREATE INDEX idx_test_catalog_profile_id ON public.test_catalog (profile_id);

-- ---------------------------------------------------------------------------
-- test_orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.test_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES public.patient_visits (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.test_catalog (id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.lab_sections (id) ON DELETE CASCADE,
  ordered_at timestamptz NOT NULL,
  priority text NOT NULL CHECK (priority IN ('routine', 'urgent', 'stat')),
  ordering_clinician_id uuid REFERENCES public.staff (id) ON DELETE SET NULL
);

CREATE INDEX idx_test_orders_profile_id ON public.test_orders (profile_id);
CREATE INDEX idx_test_orders_ordered_at ON public.test_orders (ordered_at);

-- ---------------------------------------------------------------------------
-- test_results
-- ---------------------------------------------------------------------------
CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.test_orders (id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.test_catalog (id) ON DELETE CASCADE,
  result_value text,
  result_numeric numeric(18, 6),
  result_unit text,
  reference_range_low numeric(18, 6),
  reference_range_high numeric(18, 6),
  is_critical boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (
    status IN ('pending', 'resulted', 'verified', 'amended', 'cancelled')
  ),
  resulted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.staff (id) ON DELETE SET NULL
);

CREATE INDEX idx_test_results_profile_id ON public.test_results (profile_id);

-- ---------------------------------------------------------------------------
-- sample_chain
-- ---------------------------------------------------------------------------
CREATE TABLE public.sample_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.test_orders (id) ON DELETE CASCADE,
  sample_type text NOT NULL,
  sample_collected_at timestamptz,
  sample_received_at timestamptz,
  section_received_at timestamptz,
  processing_started_at timestamptz,
  result_ready_at timestamptz,
  rejection_reason text,
  is_rejected boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_sample_chain_profile_id ON public.sample_chain (profile_id);

-- ---------------------------------------------------------------------------
-- equipment
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.lab_sections (id) ON DELETE SET NULL,
  equipment_type text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  installation_date date,
  last_calibration_date date,
  next_calibration_due date,
  status text NOT NULL CHECK (status IN ('active', 'under_maintenance', 'decommissioned')),
  category text CHECK (category IN ('A', 'B', 'C'))
);

CREATE INDEX idx_equipment_profile_id ON public.equipment (profile_id);

-- ---------------------------------------------------------------------------
-- equipment_telemetry
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipment_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric(18, 6),
  metric_unit text,
  source text NOT NULL CHECK (source IN ('sensor', 'manual_entry')),
  is_alert_threshold_breached boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_equipment_telemetry_profile_id ON public.equipment_telemetry (profile_id);
CREATE INDEX idx_equipment_telemetry_recorded_at ON public.equipment_telemetry (recorded_at);

-- ---------------------------------------------------------------------------
-- refrigerator_readings
-- ---------------------------------------------------------------------------
CREATE TABLE public.refrigerator_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  temperature_celsius numeric(5, 2) NOT NULL,
  humidity_pct numeric(5, 2),
  door_open boolean NOT NULL DEFAULT false,
  alert_triggered boolean NOT NULL DEFAULT false,
  alert_type text CHECK (
    alert_type IN (
      'temp_high',
      'temp_low',
      'door_open_extended',
      'power_failure',
      'compressor_fault'
    )
  )
);

CREATE INDEX idx_refrigerator_readings_profile_id ON public.refrigerator_readings (profile_id);
CREATE INDEX idx_refrigerator_readings_recorded_at ON public.refrigerator_readings (recorded_at);

-- ---------------------------------------------------------------------------
-- qc_runs
-- ---------------------------------------------------------------------------
CREATE TABLE public.qc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.lab_sections (id) ON DELETE CASCADE,
  run_date timestamptz NOT NULL,
  run_type text NOT NULL CHECK (
    run_type IN ('daily', 'weekly', 'monthly', 'reagent_lot_change', 'post_maintenance')
  ),
  material_lot_number text,
  performed_by uuid REFERENCES public.staff (id) ON DELETE SET NULL,
  result text NOT NULL CHECK (result IN ('pass', 'fail', 'borderline')),
  westgard_rule_violated text,
  corrective_action_taken text
);

CREATE INDEX idx_qc_runs_profile_id ON public.qc_runs (profile_id);

-- ---------------------------------------------------------------------------
-- maintenance_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'scheduled_pm',
      'breakdown',
      'calibration',
      'software_update',
      'parts_replacement'
    )
  ),
  scheduled_date date,
  actual_date date,
  technician_type text CHECK (technician_type IN ('internal', 'vendor')),
  downtime_hours numeric(6, 2),
  parts_replaced text,
  cost_ugx numeric(12, 2),
  resolution_notes text
);

CREATE INDEX idx_maintenance_events_profile_id ON public.maintenance_events (profile_id);

-- ---------------------------------------------------------------------------
-- reagent_inventory
-- ---------------------------------------------------------------------------
CREATE TABLE public.reagent_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.lab_sections (id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (
    item_type IN ('reagent', 'consumable', 'control_material', 'calibrator')
  ),
  lot_number text,
  expiry_date date,
  quantity_on_hand numeric(12, 3),
  unit text,
  reorder_point numeric(12, 3),
  last_restocked_at timestamptz,
  supplier text
);

CREATE INDEX idx_reagent_inventory_profile_id ON public.reagent_inventory (profile_id);

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (
    source_type IN ('equipment', 'qc', 'cold_chain', 'inventory', 'tat')
  ),
  source_id uuid,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  triggered_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  message text NOT NULL
);

CREATE INDEX idx_alerts_profile_id ON public.alerts (profile_id);

-- ---------------------------------------------------------------------------
-- schema_version
-- ---------------------------------------------------------------------------
CREATE TABLE public.schema_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  description text
);

INSERT INTO public.schema_version (version, description)
VALUES (
  '20260329103000_mazra_hospital_core_schema',
  'Mazra Hospital laboratory module — initial tables'
);
