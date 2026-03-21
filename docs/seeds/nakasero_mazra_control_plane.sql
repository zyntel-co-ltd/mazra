-- Run in the **Mazra** Supabase SQL editor (control plane).
-- Replace nothing if your facility_id differs.

INSERT INTO public.sim_config (
  facility_id,
  hospital_name,
  bed_count,
  seed_string,
  sim_enabled,
  active_scenarios,
  config_json
) VALUES (
  '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5',
  'Nakasero Hospital',
  200,
  'nakasero-2026',
  true,
  '[]'::jsonb,
  '{
    "sections": ["Haematology","Clinical Chemistry","Microbiology","Serology","Reference Lab","Endocrinology"],
    "daily_min": 80,
    "daily_max": 150,
    "equipment_count": 45,
    "fridge_count": 8,
    "qc_instruments": 6,
    "qc_analytes": 12,
    "staff_count": 25
  }'::jsonb
)
ON CONFLICT (facility_id) DO UPDATE SET
  hospital_name = EXCLUDED.hospital_name,
  bed_count = EXCLUDED.bed_count,
  seed_string = EXCLUDED.seed_string,
  sim_enabled = EXCLUDED.sim_enabled,
  active_scenarios = EXCLUDED.active_scenarios,
  config_json = EXCLUDED.config_json,
  updated_at = now();

INSERT INTO public.mazra_clients (
  company_name,
  contact_email,
  plan,
  is_active
) VALUES (
  'Zyntel — Kanta',
  'ntale@zyntel.net',
  'pro',
  true
);

-- Optional: point Mazra at Kanta DB URL for createTargetWriteClient fallback:
-- UPDATE public.mazra_clients SET target_db_url = 'https://YOUR_KANTA_REF.supabase.co' WHERE contact_email = 'ntale@zyntel.net';
