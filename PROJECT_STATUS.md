# Mazra — Project Status

**Refactor: Mazra Hospital v2 — architecture reset on 2026-03-29**

The legacy Kanta-target simulation stack (injector APIs, `src/lib/sim`, mode datasets) is **retired**. The product direction is **Mazra Hospital**: a standalone synthetic hospital database on Mazra’s own Supabase, with REST + read-only Postgres for consumers. See `REFACTOR.md` and `docs/MAZRA_HOSPITAL_PLAN.md`.

---

## 1. What this product is

**Mazra Hospital** is a standalone **synthetic hospital database** (LIMS/HMS-shaped). It owns its schema and Supabase project; apps connect as clients via API and/or read-only DSN—no consumer-side migrations for Mazra data.

---

## 2. Current state

| Area | Status |
|------|--------|
| Legacy injector (`/api/sim/*`, `/api/admin/*`, `src/lib/sim`, `datasets/<mode>/`) | **Legacy — removed** (git history preserved) |
| Mazra Hospital schema (laboratory module) | Migrations under `supabase/migrations/*_mazra_hospital_*.sql` |
| REST API v1 (`/api/v1/*`) | **Live** — Bearer API key, tier limits, Upstash rate limits; control tables `mazra_api_keys`, `mazra_api_usage_log` |
| Dataset generators + CLI | Generators shipped; CLI follow-on |

**Stack (primary pattern):** Next.js 16 + TypeScript on Vercel; **Mazra-owned** Supabase (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` for server-side only). Environment variables that pointed at a separate “target” consumer database are **not** part of the new architecture.

---

## 3. Where to read next

| File | Purpose |
|------|---------|
| `PROJECT_STATUS/START_HERE.md` | Cursor onboarding + folder index |
| `docs/MAZRA_HOSPITAL_PLAN.md` | Authoritative product + schema notes |
| `REFACTOR.md` | Old vs new architecture and transition order |
| `docs/MAZRA_PLAN_LEGACY.md` | Historical plan only (pre–Mazra Hospital) |

Cursor: read `PROJECT_STATUS/START_HERE.md` and `docs/MAZRA_HOSPITAL_PLAN.md` before changing schema or APIs.
