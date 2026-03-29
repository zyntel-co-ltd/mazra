# Mazra Hospital — Start Here

**Last updated:** 2026-03-29  
**Product type:** Standalone synthetic hospital database (Mazra-owned Supabase, REST + read-only Postgres)  
**Status:** Architecture reset complete — legacy Kanta-target injector retired  
**Production URL:** `mazra.dev` (Vercel)  
**Repo:** github.com/zyntel-co-ltd/mazra  

---

## 1. What this product is

**Mazra Hospital** serves realistic, profile-scoped synthetic operational data (laboratory module first): patients, visits, orders, results, equipment telemetry, cold chain, QC, inventory, staff, alerts. Consumers integrate as **data clients**—not via migrations or flags in their own databases.

---

## 2. Current build state

| Module | State | Notes |
|--------|-------|-------|
| Legacy sim + target writers | **Retired** | Removed in Mazra Hospital v2 refactor |
| Laboratory DDL | In progress | `supabase/migrations/*_mazra_hospital_*.sql` |
| REST API / API keys | Planned | See `docs/MAZRA_HOSPITAL_PLAN.md` |
| 12-month generators per profile | Planned | ENG-116+ |
| Billing (Flutterwave) | Stub | No legacy `mazra_clients` coupling in app code |

**Stack:** Next.js 16, TypeScript, Vercel. **Database:** Mazra’s Supabase Postgres only (`NEXT_PUBLIC_SUPABASE_*` for client if needed; `SUPABASE_*` service role server-side). Do **not** use `TARGET_SUPABASE_*` as the primary integration pattern—that belonged to the retired injector.

---

## 3. What’s in this folder

| File | Contents |
|------|----------|
| `START_HERE.md` | This file |
| `stack.md` | Tooling notes (update as stack evolves) |
| `data-model.md` | High-level model (update for hospital schema) |
| `features/app.md` | Feature blocks |
| `phase-log.md` | Historical milestones — archival |

---

## 4. Cursor

- Read `docs/MAZRA_HOSPITAL_PLAN.md` before changing schema, APIs, or datasets.
- Append new milestones to `phase-log.md`; do not erase history.
- New SQL: prefix `mazra_hospital_` in migration filenames.

---

## 5. Claude Project

Attach `docs/MAZRA_HOSPITAL_PLAN.md`, `PROJECT_STATUS.md`, and `REFACTOR.md` for context.
