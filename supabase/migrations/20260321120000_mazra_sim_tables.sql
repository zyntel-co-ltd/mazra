-- Mazra control plane — run on the **Mazra** Supabase project (not Kanta).
-- facility_id is an opaque UUID (matches the facility in the *target* DB when writing to Kanta).
-- No FK to hospitals — Mazra is independent; writers use mazra_clients.target_db_url.

CREATE TABLE IF NOT EXISTS public.sim_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL,
  hospital_name text NOT NULL,
  bed_count integer NOT NULL DEFAULT 200,
  seed_string text NOT NULL DEFAULT 'default',
  active_scenarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sim_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_config_facility ON public.sim_config(facility_id);

CREATE TABLE IF NOT EXISTS public.sim_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid,
  run_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL,
  rows_by_module jsonb,
  error text,
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS idx_sim_generation_log_facility ON public.sim_generation_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_sim_generation_log_run_at ON public.sim_generation_log(run_at DESC);

CREATE TABLE IF NOT EXISTS public.mazra_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_email text NOT NULL,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  target_db_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mazra_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.mazra_clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  rows_generated integer NOT NULL DEFAULT 0,
  modules_active text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mazra_usage_client ON public.mazra_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_mazra_usage_date ON public.mazra_usage(date DESC);

COMMENT ON TABLE public.sim_config IS 'Mazra: simulation config per logical facility_id (no FK to target DB)';
COMMENT ON TABLE public.sim_generation_log IS 'Mazra: generation run audit';
COMMENT ON TABLE public.mazra_clients IS 'Mazra SaaS clients; target_db_url = connection string for generated data writes (e.g. Kanta Supabase)';
COMMENT ON TABLE public.mazra_usage IS 'Mazra: per-client daily usage for billing/analytics';
