# Workers Git UI — when **Deploy command** is required

Cloudflare sometimes **requires** a non-empty deploy command. Use:

```bash
cd apps/mazra-web && npx wrangler pages deploy dist --project-name=mazra-web --commit-dirty=true
```

`--commit-dirty=true` silences the “uncommitted changes” warning in CI (build output is expected to be untracked).

**Prerequisites**

1. **Build** must run first (same pipeline):  
   `cd apps/mazra-web && npm install && npm run build`
2. **`CLOUDFLARE_API_TOKEN`** — custom token with **Account → Cloudflare Pages → Edit** (see `CLOUDFLARE_PAGES_MAZRA_WEB.md`).
3. **`CLOUDFLARE_ACCOUNT_ID`**
4. Cloudflare must have a **Pages** project whose **name** is **`mazra-web`** (error `8000007` = wrong or missing project name).

**Version command:** leave empty (not `wrangler versions upload` for this Astro static export).
