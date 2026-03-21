# Mazra

**Mazra** (مزرعة — “farm” / cultivated field) is a hospital **data simulation engine**: realistic, deterministic streams (TAT, revenue, equipment, cold chain, QC, staff) for demos, training, and testing.

**Architecture:** Mazra uses its **own** Supabase (control plane: `sim_config`, `sim_generation_log`, `mazra_clients`, `mazra_usage`). `facility_id` is a UUID Mazra tracks — **no FK** to any customer `hospitals` table. For each client (e.g. Kanta), a row in **`mazra_clients`** stores **`target_db_url`** (that project’s Postgres/Supabase connection string); the engine connects there and writes into **that** database’s Kanta-shaped tables.

See `docs/MAZRA_PLAN.md` for the full product plan. **Living status:** `PROJECT_STATUS.md`.

## Repo layout

| Path | Purpose |
|------|---------|
| `src/engine/` | TypeScript simulation modules (`generateDay` per domain) |
| `src/engine/rng.ts` | Seeded mulberry32 PRNG |
| `scripts/seed.ts` | CLI seeder → `sim_generation_log` (+ optional Kanta `test_requests`) |
| `src/app/api/health` | Liveness JSON |
| `src/app/api/sim/run` | POST/GET + `Authorization: Bearer` (`MAZRA_SIM_SECRET` or `CRON_SECRET`) — Vercel Cron uses GET |
| `src/app/api/sim/reset` | POST — delete `mazra_generated` rows in Kanta, re-seed `MAZRA_SEED_DAYS` |
| `docs/seeds/` | SQL snippets: Nakasero `sim_config` / Kanta prerequisites |
| `supabase/migrations/` | SQL for Mazra control-plane tables (run on the **Mazra** Supabase project) |
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

### 2. Supabase (Mazra project)

1. Open your **Mazra** Supabase project (separate from Kanta).
2. Run `supabase/migrations/20260321120000_mazra_sim_tables.sql` (SQL editor or `supabase db push`).
3. Add **`mazra_clients`** rows (e.g. Kanta) with **`target_db_url`** pointing at the **Kanta** database where synthetic rows should be inserted.
4. Add **`sim_config`** rows with the **`facility_id`** UUID that exists in Kanta’s `hospitals` (or equivalent) — Mazra only stores that UUID; it does not enforce a foreign key.
5. Later: Edge Function `mazra-daily` + `pg_cron` (plan §8) — not in this scaffold.

### 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → Import the **mazra** Git repo.
2. Framework: **Next.js**; root directory: repo root (or `mazra` if the monorepo root is higher).
3. **Environment variables** (Production + Preview as needed):
   - **Mazra control DB:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Mazra’s own project)
   - Server-only: `SUPABASE_SERVICE_ROLE_KEY` (Mazra project) plus logic to read **`target_db_url`** and write to client DBs
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
