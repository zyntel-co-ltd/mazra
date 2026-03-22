# Workers Git UI — when **Deploy command** is required

Cloudflare sometimes **requires** a non-empty deploy command. Use:

```bash
cd apps/mazra-web && npx wrangler pages deploy dist --project-name=mazra
```

**Prerequisites**

1. **Build** must run first (same pipeline):  
   `cd apps/mazra-web && npm install && npm run build`
2. **`CLOUDFLARE_API_TOKEN`** — custom token with **Account → Cloudflare Pages → Edit** (see `CLOUDFLARE_PAGES_MAZRA_WEB.md`).
3. **`CLOUDFLARE_ACCOUNT_ID`**
4. Project name **`mazra`** must match **Workers & Pages** → your project **Name**.

**Version command:** leave empty (not `wrangler versions upload` for this Astro static export).
