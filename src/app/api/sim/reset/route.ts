import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteMazraGeneratedForFacility } from "@/lib/sim/delete-mazra-rows";
import { runGeneration } from "@/lib/sim/run-generation";

function authorize(req: NextRequest): boolean {
  const secret =
    process.env.MAZRA_SIM_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return Boolean(secret && token === secret);
}

/**
 * POST /api/sim/reset
 * Deletes all mazra_generated rows for MAZRA_FACILITY_ID (or body.facilityId), then re-seeds MAZRA_SEED_DAYS.
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    facilityId?: string;
    seedDays?: number;
  };

  const facilityId =
    body.facilityId?.trim() ||
    process.env.MAZRA_FACILITY_ID?.trim() ||
    "";

  if (!facilityId) {
    return NextResponse.json(
      { error: "missing_facility_id", hint: "Set MAZRA_FACILITY_ID or pass facilityId in body" },
      { status: 400 }
    );
  }

  const url = process.env.TARGET_SUPABASE_URL?.trim();
  const key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json(
      { error: "missing_target_credentials" },
      { status: 500 }
    );
  }

  const target = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const del = await deleteMazraGeneratedForFacility(target, facilityId);
  if (!del.ok) {
    return NextResponse.json({ error: del.error }, { status: 500 });
  }

  const days = Math.min(
    365,
    Math.max(1, body.seedDays ?? Number(process.env.MAZRA_SEED_DAYS ?? "90"))
  );
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const result = await runGeneration({
    mode: "api",
    dates,
    facilityIdFilter: facilityId,
  });

  return NextResponse.json({
    ok: true,
    facilityId,
    days,
    result,
  });
}
