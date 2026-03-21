import { NextRequest, NextResponse } from "next/server";
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
 * POST /api/sim/run — manual trigger
 * GET /api/sim/run — Vercel Cron (same Bearer secret)
 *
 * Body (POST optional): { "dates": ["2026-03-20"], "facilityId": "<uuid>" }
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
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

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runGeneration({ mode: "cron" });
  return NextResponse.json(result);
}
