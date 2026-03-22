# Cloudflare Workers Git UI — stop using Wrangler here

If your project shows **Build command** + **Deploy command** + **Version command**:

## Do this

1. **Deploy command:** leave **empty** (remove `npx wrangler pages deploy ...`).
2. **Version command:** leave **empty** (remove `npx wrangler versions upload`).
3. **Build command:**  
   `cd apps/mazra-web && npm install && npm run build`
4. Point static hosting at **`apps/mazra-web/dist`** (exact field name depends on Workers vs Pages — see **`CLOUDFLARE_PAGES_MAZRA_WEB.md`**).

## Why

- Wrangler deploy needs a token with **Pages** permissions; misconfigured tokens cause `Authentication error [code: 10000]`.
- Astro output is plain static files; **Pages** (or Workers static assets) can publish `dist/` after build **without** Wrangler.

## Prefer Pages

For a static site, creating a **Cloudflare Pages** project linked to the same repo is usually simpler than a Worker with a manual deploy step.
