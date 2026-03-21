import { NextRequest, NextResponse } from "next/server";
import { runGeneration } from "@/lib/sim/run-generation";

/**
 * POST /api/sim/run
 * Authorization: Bearer <MAZRA_SIM_SECRET>
 * Body (optional): { "dates": ["2026-03-20"], "facilityId": "<uuid>" }
 */
export async function POST(req: NextRequest) {
  const secret =
    process.env.MAZRA_SIM_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    dates?: string[];
    facilityId?: string | null;
  };

  const result = await runGeneration({
    mode: "api",
    dates: body.dates?.length ? body.dates : undefined,
    facilityIdFilter: body.facilityId ?? null,
  });

  return NextResponse.json(result);
}
