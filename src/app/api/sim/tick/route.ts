import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { runTick } from "@/lib/sim/run-tick";

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;
  const candidates = [
    process.env.MAZRA_SIM_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
    process.env.KANTA_CRON_SECRET?.trim(),
    process.env.NEXT_PUBLIC_MAZRA_SIM_SECRET?.trim(),
  ].filter(Boolean) as string[];
  return candidates.includes(token);
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
 * Bearer: MAZRA_SIM_SECRET, CRON_SECRET, KANTA_CRON_SECRET, or NEXT_PUBLIC_MAZRA_SIM_SECRET.
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

  let mazraDb = null;
  try {
    mazraDb = createMazraAdminClient();
  } catch {
    mazraDb = null;
  }

  const result = await runTick(targetDb, facilityId, mazraDb);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handleTick(req);
}

export async function POST(req: NextRequest) {
  return handleTick(req);
}
