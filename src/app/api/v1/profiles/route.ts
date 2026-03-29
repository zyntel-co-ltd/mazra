import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api/auth";
import { corsHeaders, withCors } from "@/lib/api/cors";
import { createMazraDataReadClient } from "@/lib/api/data-client";
import { FREE_TIER_PROFILE_SLUG } from "@/lib/api/constants";
import { profileUuid } from "@/lib/generators/profiles";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logApiUsage } from "@/lib/api/usage-log";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const auth = await verifyApiKey(req.headers.get("authorization"));
  if (!auth) {
    return withCors(
      NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );
  }

  const rl = await checkRateLimit(auth.id, auth.tier);
  if (!rl.allowed) {
    return withCors(
      NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    );
  }

  try {
    const supabase = createMazraDataReadClient();
    let { data, error } = await supabase
      .from("hospital_profiles")
      .select("id, name, classification, tier, location_type")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    let rows = data ?? [];
    if (auth.tier === "free") {
      const allowedId = profileUuid(FREE_TIER_PROFILE_SLUG);
      rows = rows.filter((r) => r.id === allowedId);
    }

    const res = withCors(
      NextResponse.json({
        data: rows,
        meta: {
          count: rows.length,
          tier: auth.tier,
          limit: null,
          offset: null,
          profile_id: null,
          table: null,
          has_more: false,
          next_offset: null,
        },
      })
    );

    void logApiUsage({
      keyId: auth.id,
      route: "/api/v1/profiles",
      profileId: null,
      tableName: null,
      rowCount: rows.length,
      responseMs: Date.now() - t0,
    });

    res.headers.set("X-RateLimit-Limit", String(rl.limit));
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return withCors(NextResponse.json({ error: msg }, { status: 500 }));
  }
}
