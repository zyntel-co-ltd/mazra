# Cloudflare Workers — Git build UI (`zyntel-co-ltd/mazra`)

Use these values so deploy matches project name **`mazra`** (General → Name).

## Build configuration

| Field | Value |
|--------|--------|
| **Root directory** | *(empty = repo root)* |
| **Build command** | `cd apps/mazra-web && npm install && npm run build` |
| **Deploy command** | `npx wrangler pages deploy apps/mazra-web/dist --project-name=mazra` |

Alternative deploy (uses repo script + same name):

```bash
cd apps/mazra-web && npm run pages:deploy
```

## Version command

`npx wrangler versions upload` is for **Workers** script bundles, not a static **Pages**-style `dist/` upload. If your build fails on that step, try **clearing** the Version command (leave empty) or use only **Build** + **Deploy** as Cloudflare documents for static assets.

## Variables and secrets

Keep:

- **`PUBLIC_MAZRA_API_URL`** = `https://mazra-nine.vercel.app` (or your live Mazra API) — Astro embeds this at build time.

Also add (required for Wrangler to authenticate):

| Name | Where to get it |
|------|------------------|
| **`CLOUDFLARE_API_TOKEN`** | API Tokens → custom token with **Account → Cloudflare Pages → Edit** (and read) |
| **`CLOUDFLARE_ACCOUNT_ID`** | Dashboard → any zone → right column **Account ID** |

## Build watch paths

`*` is fine for a monorepo that shares the repo; optional tighten to e.g. `apps/mazra-web/**` later.
