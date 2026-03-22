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

Output: **`dist/`** — set as Pages output directory.

## Cloudflare Pages (Wrangler deploy)

Wrangler **must** know the Pages project name. Error `Must specify a project name` means the deploy step ran without it.

`wrangler.toml` → `name = "mazra"` must **match** the Workers/Pages project name in the Cloudflare dashboard (yours: **mazra**).

### Recommended CI commands (repo root)

| Step | Command |
|------|---------|
| Build | `cd apps/mazra-web && npm ci && npm run build` |
| Deploy | `cd apps/mazra-web && npm run pages:deploy` |

`pages:deploy` runs `wrangler pages deploy dist --project-name=mazra`. From repo root without `cd`:

```bash
npx wrangler pages deploy apps/mazra-web/dist --project-name=mazra
```

If your dashboard project name is different, change `wrangler.toml` + `package.json` → `pages:deploy` to match.

### CI secrets for Wrangler

Add **environment variables** (or Pages → Settings → Environment variables):

- `CLOUDFLARE_API_TOKEN` — API token with **Account → Cloudflare Pages → Edit** (and read account)
- `CLOUDFLARE_ACCOUNT_ID` — Dashboard → any domain → right sidebar **Account ID**

Without these, `wrangler pages deploy` cannot authenticate.

### Local deploy

```bash
cd apps/mazra-web
npm run build
npm run pages:deploy
```

## Mazra API env (Vercel)

- `FLW_SECRET_KEY` — Flutterwave secret (Standard payments)
- `MAZRA_APP_URL` — Mazra app URL (used for `/api/billing/confirm` callback)
- `MAZRA_PUBLIC_SITE_URL` — optional; where users land after payment (usually `https://mazra.dev`)
- `MAZRA_LANDING_ORIGIN` — CORS for subscribe, e.g. `https://mazra.dev` or `https://mazra.dev,https://preview.pages.dev`

See `docs/PHASE6_SAAS.md` in the repo root.
