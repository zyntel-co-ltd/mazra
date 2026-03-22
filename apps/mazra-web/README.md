# Mazra marketing site (Astro)

Deploy to **Cloudflare Pages** (or any static host). Custom domain: **mazra.dev**.

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

## Cloudflare (no Wrangler)

Do **not** use `wrangler pages deploy` in CI. Connect the repo to **Cloudflare Pages** and let Cloudflare publish the build output after your build command finishes.

See **`docs/CLOUDFLARE_PAGES_MAZRA_WEB.md`** for exact settings.

If you previously used a **Workers** Git project with a custom **Deploy command**, **clear that field** (and usually **Version command** too) so only the build runs; then configure the static output path per Cloudflare’s UI for your product (**Pages** vs **Workers + static assets**).

## Mazra API env (Vercel)

- `FLW_SECRET_KEY` — Flutterwave secret (Standard payments)
- `MAZRA_APP_URL` — Mazra app URL (used for `/api/billing/confirm` callback)
- `MAZRA_PUBLIC_SITE_URL` — optional; where users land after payment (usually `https://mazra.dev`)
- `MAZRA_LANDING_ORIGIN` — CORS for subscribe, e.g. `https://mazra.dev` or `https://mazra.dev,https://preview.pages.dev`

See `docs/PHASE6_SAAS.md` in the repo root.
