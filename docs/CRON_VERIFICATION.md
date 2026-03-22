# Cron verification (Mazra)

## Real-time tick (every 15 minutes)

Vercel invokes **`GET /api/sim/tick`** on `*/15 * * * *` with the same Bearer secret pattern as `/api/sim/run`.

PowerShell:

```powershell
curl.exe -X GET "https://YOUR-MAZRA-VERCEL-URL.vercel.app/api/sim/tick" `
  -H "Authorization: Bearer YOUR_MAZRA_SIM_SECRET"
```

Expect JSON like `{ "tick", "time_zone", "patients", "temp_readings", "qc_runs", "qc_violations", "errors" }`.

Hospital hours / peaks use **`MAZRA_SIM_TIMEZONE`** (default `Africa/Kampala`). Slot length: **`MAZRA_TICK_MINUTES`** (default `15`).

## Manual test (do not wait until tomorrow)

PowerShell:

```powershell
curl.exe -X POST "https://YOUR-MAZRA-VERCEL-URL.vercel.app/api/sim/run" `
  -H "Authorization: Bearer YOUR_MAZRA_SIM_SECRET" `
  -H "Content-Type: application/json"
```

Then in **Mazra** Supabase SQL:

```sql
SELECT run_at, mode, rows_by_module, error, duration_ms
FROM sim_generation_log
ORDER BY run_at DESC
LIMIT 5;
```

If you see a row for the run you just triggered with non-zero `rows_by_module` (when target writes are enabled), the same auth path the cron uses is working.

## Daily cron check

After **00:05 UTC** (03:05 EAT), run the same `SELECT`. You want a new row with `mode = 'cron'`.

If `error` is set, copy the message and fix env / schema / target credentials.
