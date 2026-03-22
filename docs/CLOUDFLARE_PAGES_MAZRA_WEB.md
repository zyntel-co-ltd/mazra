# Cloudflare — deploy `apps/mazra-web` **without Wrangler**

This repo does **not** use Wrangler for the marketing site. Use **Cloudflare Pages** (recommended) or your host’s native “build + publish `dist`” flow.

## Option A — Cloudflare Pages (recommended)

1. **Workers & Pages** → **Create** → **Pages** → Connect **`zyntel-co-ltd/mazra`**.
2. Configure:

| Setting | Value |
|--------|--------|
| **Root directory** | *(leave empty — repo root)* |
| **Build command** | `cd apps/mazra-web && npm install && npm run build` |
| **Build output directory** | `apps/mazra-web/dist` |

3. **Environment variables** (Pages → Settings → Variables):

   - `PUBLIC_MAZRA_API_URL` — e.g. `https://mazra-nine.vercel.app` (baked in at build time)

4. No **Deploy command**, no **Wrangler**, no `CLOUDFLARE_API_TOKEN` required for the default Pages Git integration (Cloudflare deploys the output directory for you).

## Option B — Workers “Git connected” UI (what you had)

If the product is **Workers** with a custom **Build** + **Deploy command**:

1. **Delete / clear** the **Deploy command** (do not run `wrangler pages deploy`).
2. **Clear** the **Version command** (`npx wrangler versions upload` is for Worker scripts, not a static Astro `dist/`).
3. Set the **static asset / output directory** in that UI to **`apps/mazra-web/dist`** (wording varies — look for “assets”, “output”, or “upload directory”).

If Cloudflare only runs a build step and no longer runs Wrangler, you avoid API token permission errors on `pages/projects/...`.

## Local preview

```bash
cd apps/mazra-web
npm run build
npm run preview
```
