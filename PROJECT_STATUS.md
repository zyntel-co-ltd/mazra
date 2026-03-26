# Mazra — Project Status

**Last updated:** 26 March 2026  
**Repo:** `mazra` (Zyntel) — hospital data simulation engine

---

## Repo map (high-signal)

Generated from a `repomix --no-files` snapshot (paths only). **No secrets or file contents** are included here.

### Top-level

```text
.cursor/
.github/
apps/
datasets/
docs/
scripts/
src/
supabase/
```

### Key entrypoints

```text
.env.example
next.config.ts
package.json
PROJECT_STATUS.md
datasets/README.md
docs/MAZRA_PLAN.md
```

## What This Project Is

**Mazra** generates realistic, **deterministic** hospital operational data for demos and testing. **Control plane** = Mazra Supabase (`sim_config`, `mazra_clients`, `sim_generation_log`). **Target** = customer Kanta Supabase; writers use the service role and set **`mazra_generated: true`** so **reset** only removes synthetic rows.

**v2 (current):** Six **pre-built dataset modes** (compressed JSON under `datasets/<mode>/`) can replace all synthetic Kanta data in one load; **live tick** continues and respects **`sim_config.active_mode`**.

Product plan: `docs/MAZRA_PLAN.md`. Dataset how-to: `datasets/README.md`.

---

## Current State

**Status:** v2 mode library + full Kanta parity writers + legacy day engine  
**Phase:** Switchable 180-day stories; admin mode cards; tick scales with active mode

### Done

#### Core engine & batch (legacy)

- [x] Engine + `generateDay()` (all domain stubs; TAT emits full payloads)
- [x] **`runGeneration()`** — orchestrates writers; `sim_generation_log.rows_by_module` reflects **insert counts**
- [x] **`MAZRA_FACILITY_ID`** env — filters `sim_config` (required when multiple facilities)
- [x] **`GET/POST /api/sim/run`** — GET for **Vercel Cron** (Bearer `MAZRA_SIM_SECRET` or `CRON_SECRET`)
- [x] **`POST /api/sim/reset`** (JSON API) — delete synthetic rows + **`runGeneration`** backfill (`MAZRA_SEED_DAYS`) — *legacy path*

#### Writers & seeders (Kanta-shaped)

- [x] **TAT / LRIDS** — `test_requests` with `finalizeTatForSimulationDay`, historical **`resulted`** sweep, **`tat_breaches`**, insert returns ids for breach linking
- [x] **Revenue** — `revenue_entries` from TAT payloads + **`test_metadata`** pricing
- [x] **Equipment** — `scan_events`; **`equipment_snapshots`** (analytics); **`maintenance_schedule`**
- [x] **Fridge** — `temp_readings` + **`temp_breaches`** detection
- [x] **QC** — `qc_runs`, **`qc_violations`**; **qualitative** `qualitative_qc_configs` + `qualitative_qc_entries`
- [x] **QC (quantitative UI)** — `qc_results` (Phase 11 table in Kanta; written by Mazra during `runGeneration`)
- [x] **Ops** — **`operational_alerts`**
- [x] **AI telemetry (Phase 10)** — `equipment_telemetry_log` written during `runGeneration` from the day’s TAT rows
- [x] **Unmatched tests (Phase 10/12)** — `unmatched_tests` upsert after dataset load for `poor_discipline` mode
- [x] **Targets** — monthly **`revenue_targets`**, **`numbers_targets`**, **`tests_targets`**; **`tat_targets`** (section + per-test)
- [x] **Samples (Phase 9)** — **`lab_racks`**, **`lab_samples`** (`seedLabRacksAndSamples`)
- [x] **Static seed** (once per facility in `runGeneration` when `MAZRA_WRITE_TO_TARGET=1`) — metadata, targets, TAT targets, maintenance, qualitative configs, racks/samples
- [x] **`deleteMazraGeneratedForFacility`** / alias **`deleteMazraRowsForFacility`** — FK-safe table order (incl. `tat_breaches`, `tat_targets`, lab tables)

#### Live tick

- [x] **`GET/POST /api/sim/tick`** — drip (default **15 min**); **`runTick()`** uses **`MAZRA_SIM_TIMEZONE`** / **`MAZRA_TICK_MINUTES`**
- [x] Tick reads **`sim_config.active_mode`** → **`MODE_CONFIGS`** (volume, scan compliance); updates **`last_tick_at`** when control-plane client is available
- [x] Stale **`test_requests`** promoted to **`resulted`** (`received` / `in_progress`, >2h)

#### v2 — Mode system & datasets

- [x] **`sim_config`** columns (Mazra migration `20260323100000_sim_config_mode_columns.sql`) — `active_mode`, `mode_switched_at`, `dataset_date_offset_days`, `last_tick_at`
- [x] **`src/lib/sim/modes/`** — `DatasetMode`, **`MODE_CONFIGS`** (baseline, high_volume, critical_failure, understaffed, poor_discipline, recovery), **`interpolate.ts`**
- [x] **`src/lib/sim/generators/`** — TAT (incl. **unmatched tests** for poor_discipline), revenue, equipment, fridges, QC, qualitative, alerts; **`RDAY:`** / **`RTIME:`** encoding
- [x] **`dataset-builder.ts`** + **`dataset-loader.ts`** — gzip tables, ID remap (`equip-placeholder-*`, `pmat:*`, `pqual:*`), date rebase; **skips monthly target tables** when `targets_missing`
- [x] **`scripts/build-dataset.ts`** — `npm run build:dataset -- <mode> [days]`; **`build:all-datasets`**
- [x] **`POST /api/sim/switch-mode`** — Bearer JSON `{ mode, facilityId }`; wipe → **`seedQualitativeQcConfigs`** → **`loadDataset`** → (optional) **Kanta TAT anomaly baseline refresh**
- [x] **`POST /api/admin/switch-mode`** + **`POST /api/admin/sim-reset`** — reload **current** (or chosen) mode dataset (**not** `runGeneration`)
- [x] **Admin `/admin`** — mode cards (built state from `datasets/<mode>/metadata.json`), switch / reset, **legacy “Run today”** still calls **`/api/admin/sim-run`**

#### Infra & docs

- [x] **`vercel.json`** — crons: tick `*/15 * * * *`, daily batch `5 0 * * *`
- [x] **Seed SQL docs** — `docs/seeds/*` incl. **`kanta_zyntel_hospital_rename.sql`**, Nakasero control plane / Kanta prerequisites
- [x] **Kanta (sibling repo)** — `mazra_generated` on extended tables (`20260321140000`, `20260322120000`, `20260322150000`, …)
- [x] **Supabase Edge `mazra-tick`** — `supabase/functions/mazra-tick`; `docs/SUPABASE_EDGE_TICK.md`
- [x] **Cron notes** — `docs/CRON_VERIFICATION.md`
- [x] **`.gitignore`** — `datasets/**/*.json` (keep `metadata.json` + `*.json.gz`)
- [x] **Phase 6 scaffold** — Flutterwave billing; `apps/mazra-web` (Astro); `docs/PHASE6_SAAS.md`

### Not done

- [ ] **Commit built datasets** — run `npm run build:all-datasets`, then `git add datasets/` (consider **Git LFS** for `*.json.gz` if size grows)
- [ ] **Align `/api/sim/reset`** with v2 — still uses **`runGeneration`**; use **`loadDataset(active_mode)`** if you want one behaviour everywhere
- [ ] **SaaS hardening** — webhooks, automated seed-on-activate, subscription renewals

---

## Stack & Architecture

| Layer | Technology | Notes |
|-------|------------|--------|
| App | Next.js 16 + TypeScript | Vercel |
| Control DB | Supabase | Mazra project |
| Target DB | Supabase | Kanta project; `TARGET_SUPABASE_*` + writers / loader |

---

## Key env vars

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Mazra control plane |
| `TARGET_SUPABASE_URL`, `TARGET_SUPABASE_SERVICE_ROLE_KEY` | Kanta writes / dataset load |
| `MAZRA_WRITE_TO_TARGET=1` | Enable **`runGeneration`** target inserts |
| `MAZRA_FACILITY_ID` | Single-facility tick / reset / switch |
| `MAZRA_SEED_DAYS` | CLI seed + **legacy** API reset backfill depth |
| `MAZRA_SIM_SECRET` / `CRON_SECRET` | `/api/sim/run`, `/api/sim/tick`, **`/api/sim/switch-mode`** |
| `MAZRA_DATASET_FACILITY_ID` | Optional; embedded in **`scripts/build-dataset.ts`** output |
| `MAZRA_SIM_TIMEZONE`, `MAZRA_TICK_MINUTES` | Tick behaviour |

---

## Related Repos

| Repo | Role |
|------|------|
| **Kanta** (`../kanta`) | Target schema + `mazra_generated` migrations |

---

*Mazra — Zyntel Limited*
