# Cloudflare — `apps/mazra-web` deploy

## If “Deploy command” is **required** (Workers Git / advanced CI)

Use Wrangler from the app folder so `node_modules` from the build step is reused.

| Field | Value |
|--------|--------|
| **Build command** | `cd apps/mazra-web && npm install && npm run build` |
| **Deploy command** | `cd apps/mazra-web && npx wrangler pages deploy dist --project-name=mazra-web --commit-dirty=true` |
| **Version command** | *(leave empty)* — do **not** use `wrangler versions upload` for this static site |

`apps/mazra-web/wrangler.toml` sets `name = "mazra-web"` and `pages_build_output_dir = "dist"` (Wrangler 4 requires the latter). The **`--project-name`** must match **Workers & Pages** → your project **Name** exactly (create a Pages project named **`mazra-web`** if needed).

### API token (fixes `Authentication error [code: 10000]`)

`CLOUDFLARE_API_TOKEN` must be allowed to **manage Pages**, not only Workers.

Create a new token: **My Profile → API Tokens → Create Token → Create Custom Token**

Suggested permissions:

| Resource | Permission |
|----------|------------|
| **Account** → **Cloudflare Pages** | **Edit** |
| **Account** → **Account Settings** | **Read** (if Wrangler asks for account metadata) |

Also set **`CLOUDFLARE_ACCOUNT_ID`** to your account ID (right sidebar on any zone).

Avoid reusing a token that is **Workers-only**; Pages deploy calls `/accounts/.../pages/projects/...`.

---

## If you use **Cloudflare Pages** (Create → Pages → Connect Git)

Many setups only ask for **build command** + **output directory** — no separate deploy step:

| **Build output directory** | `apps/mazra-web/dist` |

Then you do **not** need Wrangler or `CLOUDFLARE_API_TOKEN` for deploy (Cloudflare publishes `dist` for you).

---

## Repo helpers

```bash
cd apps/mazra-web
npm run build
npm run pages:deploy   # wrangler pages deploy dist --project-name=mazra-web
```

## Local preview

```bash
cd apps/mazra-web
npm run build
npm run preview
```
