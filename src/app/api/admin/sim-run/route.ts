import { NextRequest, NextResponse } from "next/server";
import { runGeneration } from "@/lib/sim/run-generation";

/**
 * HTML form POST from /admin — no Bearer (protect with Cloudflare Zero Trust / network).
 * Runs generation for today's UTC date for one facility.
 */
export async function POST(req: NextRequest) {
  const body = await req.formData();
  const facilityId = (body.get("facility_id") as string | null)?.trim();
  if (!facilityId) {
    return NextResponse.redirect(new URL("/admin?err=missing_facility", req.url));
  }

  const today = new Date().toISOString().slice(0, 10);
  await runGeneration({
    mode: "api",
    dates: [today],
    facilityIdFilter: facilityId,
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
