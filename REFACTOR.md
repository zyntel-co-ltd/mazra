# Mazra → Mazra Hospital — Refactor Transition

**Purpose:** Onboard developers mid-refactor. The `mazra` repo is becoming **Mazra Hospital** (standalone synthetic hospital database). Git history is preserved; code is refactored forward.

---

## What the old architecture was

- **Kanta-coupled injector:** A Next.js app with a “control plane” Supabase (`sim_config`, `mazra_clients`, `sim_generation_log`, …) and **writers** that inserted synthetic rows into a **separate** Supabase database shaped like **Kanta** (`TARGET_SUPABASE_*`).
- **Tagging:** Rows were marked with `mazra_generated` (and similar) so they could be deleted without touching real client data.
- **APIs:** `/api/sim/run`, `/api/sim/tick`, `/api/sim/switch-mode`, `/api/admin/*` orchestrated generation and dataset loads into that target.
- **Artifacts:** `datasets/<mode>/` held gzip JSON built for Kanta’s schema; mode switching replaced consumer data for demos.

---

## What is replacing it

- **Single product database** on **Mazra’s own** Supabase project: full LIMS/HMS-shaped schema (lab module first), scoped by `hospital_profiles` / `profile_id`.
- **No writes into consumer databases** for synthetic hospital data; consumers use **REST** and/or **read-only Postgres**.
- **No `mazra_generated`** in the new model.
- **CLI** `@zyntel/mazra`, **console** on `mazra.dev`, **12-month datasets per profile**.

Authoritative spec: `docs/MAZRA_HOSPITAL_PLAN.md`.

---

## Order of work (recommended)

1. **Docs** — `docs/MAZRA_HOSPITAL_PLAN.md`, `PROJECT_STATUS.md`, `REFACTOR.md` (this file); legacy plan in `docs/MAZRA_PLAN_LEGACY.md` only.
2. **Schema** — Supabase migrations with `mazra_hospital_*` prefix; laboratory module first.
3. **Legacy removal** — Delete injector APIs, `src/lib/sim`, old datasets, old control-plane migrations; keep app shell and billing stubs if still needed.
4. **Access layer** — REST + read role, API keys, rate limits.
5. **Generators** — Deterministic 12-month loaders per profile.
6. **CLI & console** — Ship `@zyntel/mazra` and operator UI.

---

## Current repo state

After the **architecture reset** commit: legacy simulation and Kanta-target routes are removed. The Next.js app boots with a minimal surface; new work branches from `docs/MAZRA_HOSPITAL_PLAN.md`.
