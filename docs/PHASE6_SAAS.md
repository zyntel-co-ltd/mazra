# Phase 6 — SaaS hooks (billing + landing)

## Flutterwave

- **Server:** `src/lib/billing/flutterwave.ts` uses Flutterwave **v3 REST** (`POST /v3/payments`, `GET /v3/transactions/:id/verify`) with **`FLW_SECRET_KEY`** only.
- **Routes:** `POST /api/billing/subscribe`, `GET /api/billing/confirm` (Flutterwave `redirect_url`).
- **Meta:** `client_id` and `plan` are attached to the payment; verify response is parsed to activate `mazra_clients`.

### Vercel env (production)

| Variable | Purpose |
|----------|---------|
| `FLW_SECRET_KEY` | Flutterwave dashboard — **secret** key |
| `MAZRA_APP_URL` | Mazra Next origin (confirm callback: `{origin}/api/billing/confirm`) |
| `MAZRA_PUBLIC_SITE_URL` | Optional. After payment, redirect users here (e.g. `https://mazra.dev`). Defaults to `MAZRA_APP_URL`. |
| `MAZRA_LANDING_ORIGIN` | CORS for `POST /api/billing/subscribe`: `https://mazra.dev` or comma-separated list, or `*` (avoid in prod if possible) |
| `MAZRA_BILLING_LOGO_URL` | Optional checkout logo URL |

`FLW_PUBLIC_KEY` is not required for Standard server-side initiate.

## Landing — `apps/mazra-web`

- Astro static site; subscribe form calls **`PUBLIC_MAZRA_API_URL/api/billing/subscribe`**.
- Cloudflare: **no Wrangler** — use **Pages** with build + output dir; see **`docs/CLOUDFLARE_PAGES_MAZRA_WEB.md`**.

## Supabase plan

Free tier is fine for early Mazra; move to Pro when you need PITR / production SLAs (same guidance as Kanta).

## Post-payment automation

`confirm` only sets **`mazra_clients.is_active = true`**. Seeding a new customer DB can be triggered manually (admin reset), a webhook, or a follow-up job — not automatic in this scaffold.
