# Mazra marketing site (Astro)

Deploy to **Cloudflare** (Pages or Workers Git). Custom domain: **mazra.dev**.

## Setup

```bash
cd apps/mazra-web
cp .env.example .env
# set PUBLIC_MAZRA_API_URL to your Mazra Next app origin
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output: **`dist/`**.

## Cloudflare CI

See **`docs/CLOUDFLARE_PAGES_MAZRA_WEB.md`**.

- If the UI **requires a deploy command**, use:  
  `cd apps/mazra-web && npx wrangler pages deploy dist --project-name=mazra-web --commit-dirty=true`  
  (after the build step). Pages project name must be **`mazra-web`**. Set **`CLOUDFLARE_API_TOKEN`** (Pages **Edit**) + **`CLOUDFLARE_ACCOUNT_ID`**.
- If you use **Pages** with only build + output directory, you may not need Wrangler.

## Mazra API env (Vercel)

- `FLW_SECRET_KEY` — Flutterwave secret (Standard payments)
- `MAZRA_APP_URL` — Mazra app URL (used for `/api/billing/confirm` callback)
- `MAZRA_PUBLIC_SITE_URL` — optional; where users land after payment (usually `https://mazra.dev`)
- `MAZRA_LANDING_ORIGIN` — CORS for subscribe, e.g. `https://mazra.dev`

See `docs/PHASE6_SAAS.md` in the repo root.
