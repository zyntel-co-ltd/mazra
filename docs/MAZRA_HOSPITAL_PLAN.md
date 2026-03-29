# Mazra Hospital — Product Plan

**Version:** 1.0 (Mazra Hospital refactor)  
**Domain:** [mazra.dev](https://mazra.dev)  
**Stack:** Next.js 16, TypeScript, Supabase Postgres (Mazra-owned project only), Vercel, Commander.js CLI (`@zyntel/mazra`)

This document is the authoritative product specification for **Mazra Hospital**: a standalone synthetic hospital database. Read it before changing schema, APIs, or datasets.

---

## 1. What Mazra Hospital Is

**Mazra Hospital** is a standalone **synthetic hospital database product**. It is not a plugin into another product’s schema and does not write into consumer databases.

- **One Supabase project per deployment** holds the full fictional hospital: patients, visits, lab orders, results, equipment telemetry, cold chain, QC, inventory, staff, and operational alerts.
- **Consumers** (including Kanta and other Zyntel or third-party apps) connect as **clients**: REST API, and/or **read-only Postgres** (DSN), treating Mazra Hospital as a **data source**—like a read replica of a real LIMS/HMS, but entirely synthetic.
- **No `mazra_generated` flags**, no consumer-side migrations for Mazra data, and no coupling to another product’s table names.

The old Mazra architecture (control plane + writes into a separate “target” Supabase shaped like Kanta) is **retired**; see `REFACTOR.md`.

---

## 2. Hospital Classification System (Uganda MoH–aligned)

Facilities are classified for realism and for dataset parametrisation. Tiers map to Uganda’s health facility structure (community → national complexity).

| Code | Ugandan tier (plain language) | Typical lab scope |
|------|--------------------------------|-------------------|
| `health_centre_iii` | Health Centre III | Basic lab — essential tests, limited equipment |
| `health_centre_iv` | Health Centre IV | Broader lab — surgery support, fuller biochemistry |
| `general_hospital` | General Hospital (district) | District lab — multiple sections, moderate volume |
| `regional_referral` | Regional Referral Hospital | Specialist tests, higher throughput |
| `national_referral` | National Referral Hospital | Full complexity (Mulago-equivalent narrative) |
| `reference_laboratory` | National Reference Laboratory | Research-grade reference testing, external QC |
| `research_institute` | Research Institute | PCR, genomics, specialised protocols |

Each **hospital profile** in the database has a `classification` and a **resource tier** (`well_resourced` | `mid_tier` | `under_resourced`) to drive volumes, staffing, equipment mix, and TAT distributions.

---

## 3. Database Schema Design — Laboratory Module (Phase 1)

Phase 1 scopes the **laboratory** only: orders, results, samples, equipment, cold chain, QC, reagents, staff, and alerts. Other departments (radiology, pharmacy, inpatient wards as first-class modules) are out of scope for this phase.

**Design principles**

- All operational data is **profile-scoped** via `profile_id → hospital_profiles.id`.
- **Telemetry is generic:** `equipment_telemetry` uses `metric_name` + `metric_value` (+ optional `metric_unit`) so new sensor types do not require schema migrations.
- **Timestamps** are stored as `timestamptz` everywhere.
- **RLS** is intentionally **not** used on these tables for v1; access is enforced at **API gateway** and **read-only role** for Postgres consumers. (Future: optional RLS if multi-tenant on one cluster.)

**Equipment type (documentary enum for generators and UI)**

Examples: `haematology_analyser`, `chemistry_analyser`, `coagulation_analyser`, `microbiology_incubator`, `centrifuge`, `microscope`, `pcr_thermocycler`, `blood_gas_analyser`, `cold_chain_unit`, `biosafety_cabinet`, `pipetting_robot`, `other`.

**Core entities (summary)**

- `hospital_profiles` — root profile (name, classification, tier, bed count, lab sections list, geography).
- `patients`, `patient_visits` — synthetic identities; names are non-real or AI-labelled (see `name_source`).
- `lab_sections`, `test_catalog`, `test_orders`, `test_results`, `sample_chain` — LIMS-shaped workflow.
- `equipment`, `equipment_telemetry`, `refrigerator_readings` — assets and time-series.
- `qc_runs`, `maintenance_events`, `reagent_inventory` — quality and supply chain.
- `staff` — lab roles; `alerts` — cross-cutting operational signals.

Full DDL lives in Supabase migrations under `supabase/migrations/*_mazra_hospital_*.sql`.

---

## 4. Six Hospital Profiles (names and tier classifications)

Each profile is a row in `hospital_profiles` with a distinct `classification`. Names are fictional but culturally plausible for Uganda. A seventh classification (`research_institute`) exists in the schema for future profiles; v1 generators focus on these six.

| Profile name | Classification | Notes |
|--------------|----------------|--------|
| **Kapeeka HCIII Laboratory** | `health_centre_iii` | Community facility; small lab, essential panels |
| **Wobulenzi HCIV Laboratory** | `health_centre_iv` | Surgical and emergency support; fuller lab menu |
| **Masindi General Hospital Laboratory** | `general_hospital` | District hospital; steady outpatient + inpatient load |
| **Soroti Regional Referral Hospital Laboratory** | `regional_referral` | Specialist referrals; higher test mix |
| **Mulago National Referral Hospital Laboratory** | `national_referral` | Highest clinical complexity; national patterns |
| **Central Public Health Laboratories (CPHL)** | `reference_laboratory` | National reference testing; external QC |

Dataset generators (12-month, per profile) use these rows as the **single source of truth** for defaults and constraints.

---

## 5. Dataset Strategy (12-month, per profile)

- **Horizon:** **12 months** of contiguous synthetic data **per hospital profile**.
- **Determinism:** Seed derived from `profile_id` + profile metadata + global Mazra version string so runs are reproducible.
- **Separation:** Each profile’s data is isolated by `profile_id`; no cross-profile patient rows.
- **Volume:** Driven by `classification` + `tier` + `bed_count` (and optional scenario flags in future issues).
- **Outputs:** Bulk load via controlled jobs (no DB triggers that “generate” data inside Postgres).

---

## 6. Access Layer — REST API + Postgres (read-only)

- **REST:** Versioned HTTP API (e.g. `/api/v1/...`) for filtered queries, pagination, and API keys.
- **Postgres:** Read-only role and connection string for BI tools, notebooks, and ETL; **no write** from consumers by default.
- **Auth:** API keys / OAuth for SaaS tiers; connection credentials rotated from console.

---

## 7. Console Surface

Web console at `mazra.dev` (authenticated): create/manage API keys, view profiles, monitor usage, download connection docs, and manage billing (where applicable).

---

## 8. CLI Surface

NPM package **`@zyntel/mazra`** (Commander.js + TypeScript): authenticate, select profile, export slices, trigger local validation, and integrate CI for deterministic snapshots.

---

## 9. Data Consent and Real Hospital Data Improvement Strategy

Every hospital client onboarded to **Kanta** or any **Zyntel** product is asked for **explicit opt-in** consent for:

1. **Aggregate operational patterns** — never patient records — to improve Mazra Hospital synthetic datasets and realism.
2. **Future benchmarking** — participation in a client patterns benchmarking product (described at signup, separate terms when launched).

Consent is recorded per **policy acceptance** in the **`policy_acceptances`** table, aligned with the legal architecture in `zyntel-playbook/09-legal/`. No raw PHI leaves client systems; only aggregated, non-identifying statistics.

---

## 10. Revenue Model

| Tier | Price (USD/mo) | Includes |
|------|----------------|----------|
| **Free** | $0 | 1 profile, 30 days of data |
| **Starter** | $29 | All profiles, 12 months of history |
| **Professional** | $99 | Starter + CLI + bulk export + webhooks |
| **Research** | $249 | Professional + AI/ML commercial use licence for derived analytics on synthetic data |
| **Enterprise** | Custom | Private instance, SLA, custom retention |

---

## 11. Domain and Deployment

- **Primary domain:** `mazra.dev`
- **Hosting:** Vercel for the Next.js app and API routes.
- **Database:** Supabase Postgres **owned by Mazra** (not a consumer project).

---

## 12. What Was Replaced and Why

Previously, Mazra acted as a **Kanta-coupled injector**: a control-plane Supabase plus writers that inserted rows into **another** Supabase (Kanta-shaped) with `mazra_generated` markers and mode switching. That required **consumer migrations**, tight schema coupling, and operational confusion.

**Mazra Hospital** replaces that with a **single product database** and **clean integration boundaries**: consumers read via API/Postgres as they would any external data vendor. Legacy code paths are removed in favour of this model; see `REFACTOR.md` for the transition map.

---

*Zyntel Limited · Mazra Hospital*
