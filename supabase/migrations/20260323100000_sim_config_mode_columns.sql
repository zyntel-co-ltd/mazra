-- Mazra control plane: dataset modes (v2 pre-built library)

ALTER TABLE public.sim_config
  ADD COLUMN IF NOT EXISTS active_mode text NOT NULL DEFAULT 'baseline';

ALTER TABLE public.sim_config
  ADD COLUMN IF NOT EXISTS mode_switched_at timestamptz;

ALTER TABLE public.sim_config
  ADD COLUMN IF NOT EXISTS dataset_date_offset_days integer NOT NULL DEFAULT 0;

ALTER TABLE public.sim_config
  ADD COLUMN IF NOT EXISTS last_tick_at timestamptz;

COMMENT ON COLUMN public.sim_config.active_mode IS 'Pre-built dataset mode key (baseline, high_volume, …)';
COMMENT ON COLUMN public.sim_config.dataset_date_offset_days IS 'Added to relative dataset days when loading into Kanta';
COMMENT ON COLUMN public.sim_config.last_tick_at IS 'Last successful /api/sim/tick for this facility';
