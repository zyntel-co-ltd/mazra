# Mazra — Project Status

**Last updated:** 21 March 2026  
**Repo:** `mazra` (Zyntel) — hospital data simulation engine

---

## What This Project Is

**Mazra** generates realistic, **deterministic** hospital operational data for demos and testing. **Control plane** = Mazra Supabase (`sim_config`, `mazra_clients`, `sim_generation_log`). **Target** = customer Kanta Supabase; writers use the service role and set **`mazra_generated: true`** so **reset** only removes synthetic rows.

Product plan: `docs/MAZRA_PLAN.md`.

---

## Current State

**Status:** Phase 1 writers (core modules)  
**Phase:** TAT, revenue, equipment scans, fridge temps, QC runs → Kanta; reset + cron hooks

### Done

- [x] Engine + `generateDay()` (all domain stubs; TAT emits full payloads)
- [x] **Writers (Kanta)** — `test_requests`, `revenue_entries`, `scan_events`, `temp_readings`, `qc_runs` with `mazra_generated: true`
- [x] **`runGeneration()`** — orchestrates writers; `sim_generation_log.rows_by_module` reflects **insert counts**
- [x] **`MAZRA_FACILITY_ID`** env — filters `sim_config` (required when multiple facilities)
- [x] **`POST /api/sim/reset`** — delete synthetic rows (FK order) + re-seed `MAZRA_SEED_DAYS`
- [x] **`GET/POST /api/sim/run`** — GET for **Vercel Cron** (Bearer `MAZRA_SIM_SECRET` or `CRON_SECRET`)
- [x] **`GET/POST /api/sim/tick`** — real-time drip every **15 min** (Vercel cron `*/15 * * * *`); `runTick()` + `MAZRA_SIM_TIMEZONE` / `MAZRA_TICK_MINUTES`
- [x] **`vercel.json`** — crons: tick `*/15 * * * *`, daily batch `5 0 * * *` (Hobby = 2 crons max)
- [x] **Seed SQL docs** — `docs/seeds/nakasero_mazra_control_plane.sql`, `docs/seeds/nakasero_kanta_prerequisites.sql`
- [x] **Kanta migration (sibling repo)** — `kanta/supabase/migrations/20260321140000_mazra_generated_flags.sql`
- [x] **qc_violations** writer — `src/lib/sim/writers/qc-violations.ts` (after `qc_runs`; `rows_by_module.qc_violations`)
- [x] **Admin UI** — `/admin` (scenario toggles, run/reset); `/api/admin/*` form handlers (no Bearer — gate with Cloudflare Zero Trust); cron test notes: `docs/CRON_VERIFICATION.md`
- [x] **Supabase Edge `mazra-tick`** — `supabase/functions/mazra-tick`; deploy + pg_cron: `docs/SUPABASE_EDGE_TICK.md`
- [x] **Phase 6 scaffold** — Flutterwave REST billing (`/api/billing/subscribe`, `/api/billing/confirm`); landing `apps/mazra-web` (Astro); `docs/PHASE6_SAAS.md`

### Not done

- [ ] **SaaS hardening** — webhooks, automated seed-on-activate, Stripe/Flutterwave subscription renewals

---

## Stack & Architecture

| Layer | Technology | Notes |
|-------|------------|--------|
| App | Next.js 16 + TypeScript | Vercel |
| Control DB | Supabase | Mazra project |
| Target DB | Supabase | Kanta project; `TARGET_SUPABASE_*` + `MAZRA_WRITE_TO_TARGET=1` |

---

## Key env vars

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Mazra control plane |
| `TARGET_SUPABASE_URL`, `TARGET_SUPABASE_SERVICE_ROLE_KEY` | Kanta writes |
| `MAZRA_WRITE_TO_TARGET=1` | Enable inserts |
| `MAZRA_FACILITY_ID` | Single-facility runs / reset |
| `MAZRA_SEED_DAYS` | CLI seed + reset backfill depth |
| `MAZRA_SIM_SECRET` / `CRON_SECRET` | `/api/sim/run`, `/api/sim/reset` |

---

## Related Repos

| Repo | Role |
|------|------|
| **Kanta** (`../kanta`) | Target schema + `mazra_generated` migration |

---

*Mazra — Zyntel Limited*
