-- Mazra Phase 1 — simulation metadata (same Supabase project as Kanta)
-- Apply after `hospitals` exists (Kanta migrations).

CREATE TABLE IF NOT EXISTS public.sim_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
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
  facility_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL,
  rows_by_module jsonb,
  error text,
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS idx_sim_generation_log_facility ON public.sim_generation_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_sim_generation_log_run_at ON public.sim_generation_log(run_at DESC);

COMMENT ON TABLE public.sim_config IS 'Mazra: per-facility simulation configuration';
COMMENT ON TABLE public.sim_generation_log IS 'Mazra: cron/seed/reset run audit';
