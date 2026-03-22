# Cloudflare Pages — `apps/mazra-web`

## Fix: `Must specify a project name`

`npx wrangler pages deploy apps/mazra-web/dist` from the **repo root** does not load `apps/mazra-web/wrangler.toml`, so Wrangler does not know the project.

**Option A (recommended):** use the npm script (includes `--project-name`):

```bash
cd apps/mazra-web && npm run pages:deploy
```

**Option B:** from repo root:

```bash
npx wrangler pages deploy apps/mazra-web/dist --project-name=mazra-web
```

If your Cloudflare Pages project is not named `mazra-web`, change `package.json` → `pages:deploy` and `wrangler.toml` → `name` to match the dashboard.

Use the **exact** name shown in Cloudflare → **Workers & Pages** → your project.

## Example pipeline

```bash
cd apps/mazra-web && npm ci && npm run build
cd apps/mazra-web && npm run pages:deploy
```

## Auth in CI

Set:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

See `apps/mazra-web/README.md` for details.
