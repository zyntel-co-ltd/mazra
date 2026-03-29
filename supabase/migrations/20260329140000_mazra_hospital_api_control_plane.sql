-- Mazra Hospital — public API control plane (API keys + usage log)
-- RLS not enabled; access only via server-side service role.

CREATE TABLE public.mazra_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid,
  key_hash text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (
    tier IN ('free', 'starter', 'professional', 'research', 'enterprise')
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX idx_mazra_api_keys_key_hash ON public.mazra_api_keys (key_hash);
CREATE INDEX idx_mazra_api_keys_subscriber ON public.mazra_api_keys (subscriber_id);

CREATE TABLE public.mazra_api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.mazra_api_keys (id) ON DELETE CASCADE,
  route text NOT NULL,
  profile_id uuid,
  table_name text,
  row_count_returned int NOT NULL DEFAULT 0,
  requested_at timestamptz NOT NULL DEFAULT now(),
  response_ms int
);

CREATE INDEX idx_mazra_api_usage_key ON public.mazra_api_usage_log (key_id);
CREATE INDEX idx_mazra_api_usage_requested ON public.mazra_api_usage_log (requested_at DESC);

-- Column metadata for GET /api/v1/[profile]/schema — allowlisted tables only.
CREATE OR REPLACE FUNCTION public.mazra_api_column_metadata(p_table text)
RETURNS TABLE (column_name text, data_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table NOT IN (
    'hospital_profiles',
    'patients',
    'patient_visits',
    'lab_sections',
    'test_catalog',
    'test_orders',
    'test_results',
    'sample_chain',
    'equipment',
    'equipment_telemetry',
    'refrigerator_readings',
    'qc_runs',
    'maintenance_events',
    'reagent_inventory',
    'staff',
    'alerts'
  ) THEN
    RAISE EXCEPTION 'invalid table';
  END IF;

  RETURN QUERY
  SELECT c.column_name::text, c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table
  ORDER BY c.ordinal_position;
END;
$$;

REVOKE ALL ON FUNCTION public.mazra_api_column_metadata(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mazra_api_column_metadata(text) TO service_role;

INSERT INTO public.schema_version (version, description)
SELECT '20260329140000_mazra_hospital_api_control_plane',
       'Mazra Hospital API — mazra_api_keys, mazra_api_usage_log, mazra_api_column_metadata'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_version WHERE version = '20260329140000_mazra_hospital_api_control_plane'
);
