# Mazra

**Mazra** (مزرعة — “farm” / cultivated field) is a hospital **data simulation engine**: realistic, deterministic streams (TAT, revenue, equipment, cold chain, QC, staff) for demos, training, and testing. It targets the **same Postgres tables** Kanta reads — see `docs/MAZRA_PLAN.md`.

First deployment target: **Kanta demo** at `mazra.dev/kanta` (per product plan).

## Repo layout

| Path | Purpose |
|------|---------|
| `src/engine/` | TypeScript simulation modules (`generateDay` per domain) |
| `src/engine/rng.ts` | Seeded mulberry32 PRNG |
| `scripts/seed.ts` | CLI seeder (stub → DB writes in Phase 1) |
| `supabase/migrations/` | SQL for `sim_config`, `sim_generation_log` (run on **Kanta** Supabase) |
| `docs/MAZRA_PLAN.md` | Full plan exported from `MAZRA_PLAN.docx` |

## Commands

```bash
npm install
npm run dev      # http://localhost:3001
npm run build
npm run seed     # dry engine run (optional env for Supabase later)
```

## Related repo

- **Kanta** — `../kanta` — dashboard & API that consume generated data.

---

## Manual checklist: GitHub → deployment

Do these yourself (not automated here).

### 1. GitHub

1. Create a **new repository** (e.g. `zyntel-co-ltd/mazra`) if this folder is not yet on GitHub.
2. From `F:\zyntel\zyntel-co-ltd\mazra`:
   ```bash
   git init
   git add .
   git commit -m "chore: initial Mazra scaffold (engine + plan)"
   git branch -M main
   git remote add origin https://github.com/zyntel-co-ltd/mazra.git
   git push -u origin main
   ```
3. **Branch protection** (optional): require PR reviews on `main`.

### 2. Supabase (same project as Kanta)

1. Open your **Kanta** Supabase project.
2. Run migration `supabase/migrations/20260321120000_mazra_sim_tables.sql` (SQL editor or `supabase db push` if you link this repo’s config).
3. Insert a `sim_config` row for your **demo facility** once `facility_id` exists.
4. Later: Edge Function `mazra-daily` + `pg_cron` (plan §8) — not in this scaffold.

### 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → Import the **mazra** Git repo.
2. Framework: **Next.js**; root directory: repo root (or `mazra` if the monorepo root is higher).
3. **Environment variables** (Production + Preview as needed):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key)
   - Server-only secrets when you add APIs: `SUPABASE_SERVICE_ROLE_KEY`, etc.
4. Deploy. Attach **custom domain** (e.g. `sim.zyntel.net` or path under `mazra.dev` via DNS/Cloudflare as you prefer).
5. **Cloudflare Zero Trust** (plan): protect admin/reset routes when those exist — same pattern as Kanta admin.

### 4. DNS / Cloudflare

1. Point your hostname to Vercel (CNAME/A per Vercel docs).
2. If using **Cloudflare**: SSL “Full (strict)”, no double-proxy issues with Supabase auth redirects if you add Mazra URLs to Supabase allow list.

### 5. After first deploy

1. Open the Vercel URL → confirm the Mazra landing page loads.
2. Run `npm run seed` locally with service role when DB writers land; verify Kanta dashboards for the demo facility.

---

**Source plan:** `MAZRA_PLAN.docx` (Ntale N. Diini, Zyntel Limited, 21 Mar 2026).
