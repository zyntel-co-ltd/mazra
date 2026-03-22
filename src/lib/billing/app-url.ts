/**
 * Public base URL for redirects (Flutterwave) and links.
 */
export function getMazraAppUrl(): string {
  const explicit = process.env.MAZRA_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3001";
}

/** After Flutterwave redirect — often the marketing site (mazra.dev), not the API host. */
export function getMazraPublicSiteUrl(): string {
  const u = process.env.MAZRA_PUBLIC_SITE_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return getMazraAppUrl();
}
