-- Run in the **Kanta** Supabase SQL editor **after** migration `20260321140000_mazra_generated_flags.sql`.
-- Nakasero facility/hospital id (must match hospitals table — use your real row or insert hospital first).

-- 1) Department (hospital_id + facility_id both required)
INSERT INTO public.departments (hospital_id, facility_id, name)
SELECT
  '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5',
  '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5',
  'Laboratory'
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments d
  WHERE d.facility_id = '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5' AND d.name = 'Laboratory'
);

-- 2) Equipment (qr_code required; category A/B/C)
INSERT INTO public.equipment (hospital_id, facility_id, name, category, status, department_id, qr_code)
SELECT
  '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5',
  '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5',
  t.name,
  t.category,
  'operational',
  (SELECT id FROM public.departments WHERE facility_id = '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5' LIMIT 1),
  'QR-' || upper(substring(gen_random_uuid()::text, 1, 12))
FROM unnest(
  ARRAY[
    'Haematology Analyser (Sysmex XN-450)',
    'Chemistry Analyser (Mindray BS-480)',
    'Centrifuge (Hettich EBA 280)',
    'Autoclave 23L',
    'Mindray Ventilator MV50',
    'Philips Ultrasound X7',
    'GE ECG Machine MAC 5500',
    'Pulse Oximeter Set (x4)',
    'Blood Gas Analyser (GEM Premier)',
    'Defibrillator (Philips HeartStart)',
    'Microscope (Olympus CX23)',
    'Blood Bank Refrigerator',
    'PCR Machine (Bio-Rad CFX96)',
    'Urine Analyser (Mindray UF-500i)',
    'Patient Monitor (Philips IntelliVue)'
  ],
  ARRAY['A','A','B','B','A','A','B','C','A','A','B','A','A','B','A']::text[]
) AS t(name, category);

-- 3) Refrigerator units
INSERT INTO public.refrigerator_units (facility_id, name, location, min_temp_celsius, max_temp_celsius, is_active)
VALUES
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Blood Bank Fridge A', 'Blood Bank', 2, 6, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Blood Bank Fridge B', 'Blood Bank', 2, 6, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Reagent Fridge 1', 'Lab Store', 2, 8, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Reagent Fridge 2', 'Lab Store', 2, 8, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Vaccine Fridge A', 'Pharmacy', 2, 8, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Vaccine Fridge B', 'Pharmacy', 2, 8, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Sample Storage 1', 'Laboratory', 2, 8, true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Sample Storage 2', 'Laboratory', 4, 10, true);

-- 4) QC materials (analyte names must match Mazra `qc-runs.ts` ANALYTES)
INSERT INTO public.qc_materials (facility_id, name, lot_number, level, analyte, target_mean, target_sd, units, is_active)
VALUES
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Creatinine Control L1', 'LOT2026A', 1, 'Creatinine', 88, 8, 'μmol/L', true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Glucose Control L1', 'LOT2026A', 1, 'Glucose', 5.2, 0.3, 'mmol/L', true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'Haemoglobin Control L1', 'LOT2026B', 1, 'Haemoglobin', 140, 5, 'g/L', true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'WBC Control L1', 'LOT2026B', 1, 'WBC', 7.2, 0.8, '10^9/L', true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'ALT Control L1', 'LOT2026C', 1, 'ALT', 35, 4, 'U/L', true),
  ('6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5', 'TSH Control L1', 'LOT2026C', 1, 'TSH', 2.1, 0.4, 'mIU/L', true);

-- 5) Optional: test_metadata rows improve revenue pricing (otherwise defaults apply)
-- INSERT INTO test_metadata (facility_id, test_name, section, price, tat_minutes) VALUES (...);
