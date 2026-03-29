# Mazra (Mazra Hospital)

**Mazra** (مزرعة — “farm” / cultivated field) is evolving into **Mazra Hospital**: a standalone **synthetic hospital database** on Mazra’s own Supabase, with REST and read-only Postgres for consumers. The legacy Kanta-target injector has been removed; see `REFACTOR.md` and `docs/MAZRA_HOSPITAL_PLAN.md`.

**Living status:** `PROJECT_STATUS.md`.

## Repo layout

| Path | Purpose |
|------|---------|
| `docs/MAZRA_HOSPITAL_PLAN.md` | Authoritative product + schema notes |
| `supabase/migrations/*_mazra_hospital_*.sql` | Mazra Hospital laboratory schema |
| `src/app/api/health` | Liveness JSON |
| `src/app/api/billing/*` | Flutterwave checkout (stub — no legacy client table) |

## Commands

```bash
npm install
npm run dev      # http://localhost:3001
npm run build
```

## Related

- Historical plan (injector era): `docs/MAZRA_PLAN_LEGACY.md`
