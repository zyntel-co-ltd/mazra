# Mazra — Hospital Data Simulation Engine

**Project plan & implementation strategy**  
Version 1.0 · 21 March 2026 · Author: Ntale N. Diini · **Zyntel Limited** · Domain: `mazra.dev` · Status: Pre-build (approved for development)

> This file is a Markdown export of **MAZRA_PLAN.docx** for version control. Arabic name: مزرعة — “farm” / cultivated field.

---

## 1. What Mazra is

Mazra is a **standalone hospital data simulation engine**. It generates a continuous, realistic stream of operational hospital data: laboratory TAT, equipment tracking, revenue, refrigerator cold chain, quality control, and more.

It is a **product** (hosted service) that health-tech companies can connect to for demos, training, product development, and testing.

**First client:** **Kanta** — demo facility at `mazra.dev/kanta` is the first live deployment; infrastructure is reusable and productised from day one.

## 2. Problem solved

Real hospital data cannot be used in sales (privacy, legal). Synthetic tools often look fake. Kanta’s old approach (Python + static JSON) repeated data, covered only TAT, and needed manual resets.

## 3. Data streams (seven domains)

1. **Laboratory TAT** — patients/day, shifts, sections (Haematology, Chemistry, Micro, etc.), Nakasero meta, busy Mon/Fri, weekends lighter, month-end spike, deterministic incidents (understaffing rotation, analyser down, STAT delays).
2. **Revenue** — derived from TAT + prices; cancellations ~4%; payer mix; month-end spike.
3. **Equipment** — ~45 assets, categories A/B/C, scans, failures, overdue maintenance story.
4. **Refrigerators** — 8 units, 15‑min readings, thresholds, door-seal drift, historical breach narrative.
5. **Quantitative QC** — analysers, analytes, Westgard-style patterns (drift, R-4s).
6. **Qualitative QC** — RDTs, pass/fail, lot failures.
7. **Staff / ops** — named staff, shifts, audit logs, unmatched test names.

## 4. Scenario library

Named configs (analyser breakdown, understaffed haematology, fridge failure, month-end surge, new equipment, QC lot failure, audit week, night shift only, insurance dispute spike, stable normal) — activate in admin; next generation cycle applies modifiers.

## 5. Architecture

- **App:** Next.js in monorepo under `apps/sim` (this scaffold uses repo **`mazra/`** at the same level as `kanta/`).
- **Engine:** Pure TypeScript, `generateDay(date, config) → DayEvent[]`, **deterministic**; seeded PRNG (mulberry32).
- **Config:** `sim_config` row per facility in Supabase (scenarios, seed, hospital profile).
- **Pipeline:** Seeder (90-day backfill), **cron** (daily batch + optional 15‑min tick), **reset** endpoint (Zero Trust).
- **Dual modes:** (1) **`runGeneration`** — full UTC-day batch (`/api/sim/run`) for charts / 90‑day history; (2) **`runTick`** — `GET/POST /api/sim/tick` drip-feeds live-style rows (LRIDS `test_requests`, fridge `temp_readings`, QC at 08:00/14:00 **local** via `MAZRA_SIM_TIMEZONE`, default `Africa/Kampala`). Complements the nightly batch.
- **Destination:** **Same tables Kanta uses** — no parallel DB for Phase 1–5. Optional `mazra_generated` flags for safe reset (plan §7).

## 6. Implementation phases (summary)

| Phase | Focus |
|-------|--------|
| **1** | Engine core + seeder |
| **2** | Supabase writers + facility linking |
| **3** | Cron Edge Function |
| **4** | Admin UI + scenario activation |
| **5** | Scenario modifiers + QA |
| **6** | SaaS: multi-tenant clients, billing, `mazra.dev` marketing |

## 7. Database (Mazra-specific)

- **Mazra Supabase (control plane):** `sim_config`, `sim_generation_log`, `mazra_clients`, `mazra_usage` — see `supabase/migrations/`. `facility_id` has **no FK** to customer DBs; `mazra_clients.target_db_url` points at where to write (e.g. Kanta’s Postgres).
- **Client DB (e.g. Kanta):** generated rows land in existing Kanta-shaped tables; optional future `mazra_generated` flags for targeted reset.

## 8. Deployment (plan)

| Component | Where |
|-----------|--------|
| Next / admin | Vercel |
| Cron | Supabase Edge Function + pg_cron 00:01 EAT |
| Landing (Phase 6) | Cloudflare Pages / Astro |
| DB | Supabase (shared with Kanta) |

## 9. Realism principles

Culturally accurate (Ugandan names, UGX, East African structure), temporally coherent, systematically imperfect, deterministically reproducible, **invisible seams** (cross-module correlation).

## 10. Business model

Internal: Kanta demos. External: Starter / Pro / Enterprise SaaS ($99–$799/mo in plan).

**Implementation notes:** marketing site in **`apps/mazra-web`** (Astro); checkout via **`docs/PHASE6_SAAS.md`** (Flutterwave Standard + `mazra_clients`). Optional **5‑min tick** via Supabase Edge + pg_cron: **`docs/SUPABASE_EDGE_TICK.md`** (disable duplicate Vercel tick if used).

## 11. Reuse from Kanta / Zyntel

Nakasero meta CSV, `demo_client_agent.py` logic → TypeScript TAT, `westgard` / Kanta libs, Redis for reset rate limit, Cloudflare Zero Trust for admin.

## 12. Success criteria (excerpt)

- Seeder: 90 days, all streams, &lt; 3 min.
- Kanta dashboards fully populated for demo facility.
- Cron silent 7+ days.
- Reset &lt; 5 minutes.
- Blind test with lab manager.
- At least one scenario end-to-end (e.g. analyser breakdown).

---

**Mazra** · A Zyntel Limited product · Kampala, Uganda · ntale@zyntel.net
