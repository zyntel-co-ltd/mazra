import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api/auth";
import {
  TABLE_DATE_COLUMN,
  VALID_TABLES,
  isValidTable,
  type ValidTable,
} from "@/lib/api/constants";
import { corsHeaders, withCors } from "@/lib/api/cors";
import { createMazraDataReadClient } from "@/lib/api/data-client";
import { resolveProfileIdParam } from "@/lib/api/profiles";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  canAccessProfileSlug,
  sanitizeOrderColumn,
  validateFreeTierDateRange,
} from "@/lib/api/tier-policy";
import { logApiUsage } from "@/lib/api/usage-log";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ profile_id: string; table: string }> }
) {
  const t0 = Date.now();
  const { profile_id: profileParam, table: tableParam } = await ctx.params;

  const auth = await verifyApiKey(req.headers.get("authorization"));
  if (!auth) {
    return withCors(
      NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      )
    );
  }

  const rl = await checkRateLimit(auth.id, auth.tier);
  if (!rl.allowed) {
    return withCors(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );
  }

  if (!isValidTable(tableParam)) {
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

  const table = tableParam as ValidTable;
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

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const rangeCheck = validateFreeTierDateRange(auth.tier, from, to);
  if (!rangeCheck.ok) {
    return withCors(
      NextResponse.json({ error: rangeCheck.message }, { status: 403 })
    );
  }

  let limit = Number.parseInt(sp.get("limit") ?? "100", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  limit = Math.min(1000, limit);

  let offset = Number.parseInt(sp.get("offset") ?? "0", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  const orderRaw = sp.get("order_by") ?? "id";
  const orderBy = sanitizeOrderColumn(orderRaw) ?? "id";
  const orderAsc = (sp.get("order") ?? "asc").toLowerCase() !== "desc";

  try {
    const supabase = createMazraDataReadClient();
    const pid = resolved.profileUuid;

    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order(orderBy, { ascending: orderAsc });

    if (table === "hospital_profiles") {
      q = q.eq("id", pid);
    } else {
      q = q.eq("profile_id", pid);
    }

    const dateCol = TABLE_DATE_COLUMN[table];
    if (dateCol && from && to) {
      q = q.gte(dateCol, from).lte(dateCol, to);
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) {
      return withCors(
        NextResponse.json(
          { error: error.message, hint: "Check order_by column name" },
          { status: 400 }
        )
      );
    }

    const rows = data ?? [];
    const total = count ?? rows.length;
    const hasMore = offset + rows.length < total;
    const nextOffset = hasMore ? offset + limit : null;

    const res = withCors(
      NextResponse.json({
        data: rows,
        meta: {
          profile_id: resolved.slug,
          table,
          count: total,
          limit,
          offset,
          tier: auth.tier,
          has_more: hasMore,
          next_offset: nextOffset,
        },
      })
    );

    void logApiUsage({
      keyId: auth.id,
      route: `/api/v1/[profile_id]/[table]`,
      profileId: pid,
      tableName: table,
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
