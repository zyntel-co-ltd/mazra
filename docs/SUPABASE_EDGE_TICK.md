# Supabase Edge Function — `mazra-tick`

Calls your deployed Mazra app **`POST /api/sim/tick`** with `MAZRA_SIM_SECRET`. Edge Functions + Supabase’s scheduler path are **free** on typical tiers; **pg_cron + pg_net** (database extensions) are used to hit the function on a schedule.

## 1. Enable extensions (Mazra Supabase project)

**Database → Extensions:** enable **`pg_cron`** and **`pg_net`**.

## 2. Deploy the function

From the `mazra` repo root:

```bash
npx supabase functions deploy mazra-tick --project-ref YOUR_PROJECT_REF
```

## 3. Function secrets

**Dashboard → Edge Functions → `mazra-tick` → Secrets:**

| Name | Example |
|------|---------|
| `MAZRA_APP_URL` | `https://your-mazra.vercel.app` |
| `MAZRA_SIM_SECRET` | Same value as Vercel `MAZRA_SIM_SECRET` (or `CRON_SECRET`) |

## 4. Schedule with pg_cron (every 5 minutes)

Replace placeholders:

- `YOUR_PROJECT_REF` — Supabase project ref (subdomain before `.supabase.co`)
- `YOUR_SUPABASE_ANON_KEY` — **Project Settings → API → anon public** key (JWT). Used because `verify_jwt = true` on the function.

```sql
SELECT cron.schedule(
  'mazra-tick-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mazra-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

To remove the job later:

```sql
SELECT cron.unschedule('mazra-tick-5min');
```

## 5. Match tick cadence in Mazra

Set **`MAZRA_TICK_MINUTES=5`** on Vercel (and locally) so QC window logic stays aligned with a 5-minute cron.

## 6. Avoid double ticks

If this schedule is active, **remove** the Vercel cron entry for `/api/sim/tick` in `vercel.json` (keep the daily `/api/sim/run` job), or you will insert twice as often.

## 7. Security note

The anon key in `pg_cron` is stored in the database (job definition). Restrict SQL access to trusted roles; for stricter setups consider **`verify_jwt = false`** on the function plus a shared secret header checked inside the function (custom `X-Mazra-Cron-Secret`), or invoke from an external scheduler with `MAZRA_SIM_SECRET` only.
