# Mazra — Start Here

**Last updated:** 2026-03-28  
**Product type:** Simulation engine — realistic Kanta-shaped hospital data  
**Status:** Active (v2 mode library + writers + tick)  
**Production URL:** Vercel (see `vercel.json` crons)  
**Repo:** github.com/zyntel-co-ltd/mazra  

---

## What This Product Is

**Mazra** generates deterministic synthetic hospital data for demos and testing. **Control plane:** Mazra Supabase (`sim_config`, clients, generation log). **Target:** customer Kanta Supabase; rows tagged `mazra_generated` for safe reset. **v2:** dataset modes under `datasets/<mode>/`, `switch-mode`, live **tick**.

---

## Current Build State

| Module | State | Notes |
|--------|-------|-------|
| `runGeneration` / writers | ✅ Live | TAT, revenue, equipment, QC, samples, telemetry, … |
| Dataset modes + `switch-mode` | ✅ Live | Bearer-protected API |
| Live tick (`/api/sim/tick`) | ✅ Live | Cron / Vercel |
| SaaS hardening | 📋 Planned | Webhooks, billing scaffold |

---

## What's In This Folder

| File | Contents |
|------|----------|
| `START_HERE.md` | This file |
| `stack.md` | Next.js, Supabase env, crons |
| `data-model.md` | Control + target DB overview |
| `features/app.md` | Feature blocks (expand) |
| `phase-log.md` | **Full legacy spec + checklist** — not for Claude |

---

## Cursor

- Read `features/app.md` before changing simulation code.
- Append new milestones to `phase-log.md`; do not rewrite old entries.
- **Target DB:** Kanta schema — coordinate with `../kanta`.

---

## Claude Project

Attach all files here **except `phase-log.md`**.
