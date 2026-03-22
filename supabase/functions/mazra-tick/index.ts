/**
 * Supabase Edge Function: proxies to Mazra Next.js `/api/sim/tick`.
 *
 * Secrets (Dashboard → Edge Functions → mazra-tick):
 *   MAZRA_APP_URL   — e.g. https://mazra.vercel.app (no trailing slash)
 *   MAZRA_SIM_SECRET — same as Vercel MAZRA_SIM_SECRET / CRON_SECRET
 *
 * Schedule via pg_cron + pg_net (see docs/SUPABASE_EDGE_TICK.md).
 */
Deno.serve(async () => {
  const base = Deno.env.get("MAZRA_APP_URL")?.replace(/\/$/, "");
  const secret = Deno.env.get("MAZRA_SIM_SECRET");

  if (!base || !secret) {
    return new Response(
      JSON.stringify({
        error: "missing_env",
        hint: "Set MAZRA_APP_URL and MAZRA_SIM_SECRET on this function",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const res = await fetch(`${base}/api/sim/tick`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  return new Response(
    JSON.stringify({
      upstream_status: res.status,
      mazra: body,
    }),
    {
      status: res.ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    }
  );
});
