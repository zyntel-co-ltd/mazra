import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api/auth";
import { corsHeaders, withCors } from "@/lib/api/cors";
import { createMazraDataReadClient } from "@/lib/api/data-client";
import { isValidTable, VALID_TABLES } from "@/lib/api/constants";
import { resolveProfileIdParam } from "@/lib/api/profiles";
import {
  canAccessProfileSlug,
  validateFreeTierDateRange,
} from "@/lib/api/tier-policy";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logApiUsage } from "@/lib/api/usage-log";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ profile_id: string }> }
) {
  const t0 = Date.now();
  const { profile_id: profileParam } = await ctx.params;
  const auth = await verifyApiKey(req.headers.get("authorization"));
  if (!auth) {
    return withCors(
      NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 })
    );
  }

  const rl = await checkRateLimit(auth.id, auth.tier);
  if (!rl.allowed) {
    return withCors(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );
  }

  const resolved = resolveProfileIdParam(profileParam);
  if (!resolved.ok) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: 404 }));
  }

  if (!canAccessProfileSlug(auth.tier, resolved.slug)) {
    return withCors(
      NextResponse.json(
        { error: "Forbidden — upgrade to access this profile" },
        { status: 403 }
      )
    );
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const rangeCheck = validateFreeTierDateRange(auth.tier, from, to);
  if (!rangeCheck.ok) {
    return withCors(
      NextResponse.json({ error: rangeCheck.message }, { status: 403 })
    );
  }

  const table = req.nextUrl.searchParams.get("table");
  if (!table) {
    return withCors(
      NextResponse.json(
        {
          error: "Missing required query parameter: table",
          hint: "Example: /api/v1/health-centre-iii/schema?table=patients",
          valid_tables: [...VALID_TABLES],
        },
        { status: 400 }
      )
    );
  }
  if (!isValidTable(table)) {
    return withCors(
      NextResponse.json(
        {
          error: "Table not found",
          valid_tables: [...VALID_TABLES],
        },
        { status: 404 }
      )
    );
  }

  try {
    const supabase = createMazraDataReadClient();
    const { data, error } = await supabase.rpc("mazra_api_column_metadata", {
      p_table: table,
    });

    if (error) {
      return withCors(
        NextResponse.json(
          { error: error.message, valid_tables: [...VALID_TABLES] },
          { status: 404 }
        )
      );
    }

    const columns = (data ?? []).map(
      (row: { column_name: string; data_type: string }) => ({
        name: row.column_name,
        type: row.data_type,
      })
    );

    const res = withCors(
      NextResponse.json({
        data: columns,
        meta: {
          profile_id: resolved.slug,
          table,
          count: columns.length,
          limit: null,
          offset: null,
          tier: auth.tier,
          has_more: false,
          next_offset: null,
        },
      })
    );

    void logApiUsage({
      keyId: auth.id,
      route: "/api/v1/[profile_id]/schema",
      profileId: resolved.profileUuid,
      tableName: table,
      rowCount: columns.length,
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
