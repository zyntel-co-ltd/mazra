import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runTick } from "@/lib/sim/run-tick";

function authorize(req: NextRequest): boolean {
  const secret =
    process.env.MAZRA_SIM_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return Boolean(secret && token === secret);
}

function targetClient() {
  const url = process.env.TARGET_SUPABASE_URL?.trim();
  const key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * GET / POST /api/sim/tick — real-time drip (Vercel Cron uses GET).
 * Bearer: MAZRA_SIM_SECRET or CRON_SECRET.
 *
 * POST JSON (optional): { "facilityId": "<uuid>" }
 */
async function handleTick(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetDb = targetClient();
  if (!targetDb) {
    return NextResponse.json(
      { error: "missing_target_credentials" },
      { status: 500 }
    );
  }

  let facilityId = process.env.MAZRA_FACILITY_ID?.trim() ?? "";
  if (req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as {
      facilityId?: string | null;
    };
    if (body.facilityId?.trim()) {
      facilityId = body.facilityId.trim();
    }
  }

  if (!facilityId) {
    return NextResponse.json(
      {
        error: "missing_facility_id",
        hint: "Set MAZRA_FACILITY_ID or POST { facilityId }",
      },
      { status: 400 }
    );
  }

  const result = await runTick(targetDb, facilityId);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handleTick(req);
}

export async function POST(req: NextRequest) {
  return handleTick(req);
}
