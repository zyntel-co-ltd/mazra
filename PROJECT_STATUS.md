# Mazra — Project Status

**Last updated:** 21 March 2026  
**Repo:** `mazra` (Zyntel) — hospital data simulation engine

---

## What This Project Is

**Mazra** generates realistic, **deterministic** hospital operational data (TAT, revenue, equipment, cold chain, QC, staff) for demos, training, and testing. It is **separate from Kanta**: Mazra has its **own** Supabase (control plane). For each customer (e.g. Kanta), **`mazra_clients.target_db_url`** points at the database where synthetic rows are written (Kanta-shaped tables).

Product plan: `docs/MAZRA_PLAN.md` (from `MAZRA_PLAN.docx`).

---

## Current State

**Status:** Pre-MVP  
**Phase:** Phase 1 partial — control-plane logging + optional TAT writes to target Supabase

### Done

- [x] Next.js 16 app — landing page (`src/app/`), Tailwind 4
- [x] **Simulation engine** — `src/engine/`: mulberry32 RNG, `generateDay()`, domain stubs; **TAT** emits Kanta-shaped `test_requests` payloads
- [x] **Control plane integration** — `runGeneration()` reads `sim_config`, writes `sim_generation_log` (Mazra Supabase service role)
- [x] **CLI seeder** — `npm run seed` — backfills last `MAZRA_SEED_DAYS` (default 3) UTC days
- [x] **API** — `GET /api/health`, `POST /api/sim/run` (Bearer `MAZRA_SIM_SECRET` or `CRON_SECRET`)
- [x] **Optional target writes** — `MAZRA_WRITE_TO_TARGET=1` + `TARGET_SUPABASE_*` or `mazra_clients.target_db_url` + service role key → inserts into Kanta **`test_requests`** (skipped when using in-memory demo config with no `sim_config` rows)
- [x] **Supabase migration (Mazra project)** — `supabase/migrations/20260321120000_mazra_sim_tables.sql`
- [x] README, `.env.example`, `vercel.json`, `PROJECT_STATUS.md`

### In Progress

- [ ] Nothing actively in flight in-repo

### Planned (see MAZRA_PLAN)

- [ ] **Phase 1+** — Writers for revenue, equipment, fridge, QC, staff; `mazra_generated` flags + reset
- [ ] **Phase 2+** — Supabase Edge cron, admin UI, scenario modifiers, Cloudflare Zero Trust
- [ ] **Phase 6** — SaaS onboarding, Flutterwave, `mazra.dev` marketing site

---

## Stack & Architecture

| Layer | Technology | Notes |
|-------|------------|--------|
| App | Next.js 16 + TypeScript | Vercel (intended) |
| Control DB | Supabase PostgreSQL | **Mazra** project — config, clients, usage |
| Target DB | Customer Postgres (e.g. Supabase) | URL in `mazra_clients.target_db_url` |
| Engine | Pure TypeScript | Deterministic seeded PRNG |

---

## Environment Status

| Environment | URL / command | Status |
|-------------|----------------|--------|
| Local app | `http://localhost:3001` (`npm run dev`) | Working |
| Mazra Supabase | Run migration in **Mazra** project | Manual |
| Production | Not wired | Create Vercel project + env when ready |

---

## Key Files

| Path | Purpose |
|------|---------|
| `src/engine/` | RNG + domain generators + `generateDay` |
| `scripts/seed.ts` | CLI seeder → `runGeneration` |
| `src/lib/sim/run-generation.ts` | Orchestration: config load, log, optional target inserts |
| `src/app/api/sim/run/route.ts` | Secured HTTP trigger |
| `supabase/migrations/` | Control-plane DDL |
| `docs/MAZRA_PLAN.md` | Full product/implementation plan |

---

## Active Issues / Risks

| Item | Notes |
|------|--------|
| **Secrets** | `target_db_url` (or pooled URL + service role) is highly sensitive — encrypt at rest / use vault when building admin |
| **RLS** | Writers must use a role that can insert into client tables without breaking Kanta RLS expectations |
| **Idempotency** | Reset/re-seed strategy TBD (`mazra_generated` flags on client tables per plan) |

---

## Related Repos

| Repo | Role |
|------|------|
| **Kanta** (`../kanta`) | Consumes data Mazra writes when Kanta is a client |

---

*Mazra — Zyntel Limited*
