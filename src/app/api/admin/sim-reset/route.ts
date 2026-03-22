import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteMazraGeneratedForFacility } from "@/lib/sim/delete-mazra-rows";
import { runGeneration } from "@/lib/sim/run-generation";

/**
 * HTML form POST from /admin — no Bearer (protect with Cloudflare Zero Trust / network).
 * Same behaviour as POST /api/sim/reset but accepts form fields.
 */
export async function POST(req: NextRequest) {
  const body = await req.formData();
  const facilityId = (body.get("facility_id") as string | null)?.trim();
  const seedDaysRaw = body.get("seed_days");
  const seedDaysParsed =
    typeof seedDaysRaw === "string" && seedDaysRaw.trim()
      ? Number(seedDaysRaw)
      : NaN;

  if (!facilityId) {
    return NextResponse.redirect(new URL("/admin?err=missing_facility", req.url));
  }

  const url = process.env.TARGET_SUPABASE_URL?.trim();
  const key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return NextResponse.redirect(
      new URL("/admin?err=missing_target_credentials", req.url)
    );
  }

  const target = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const del = await deleteMazraGeneratedForFacility(target, facilityId);
  if (!del.ok) {
    return NextResponse.redirect(
      new URL(
        `/admin?err=${encodeURIComponent(del.error ?? "delete_failed")}`,
        req.url
      )
    );
  }

  const days = Math.min(
    365,
    Math.max(
      1,
      Number.isFinite(seedDaysParsed)
        ? seedDaysParsed
        : Number(process.env.MAZRA_SEED_DAYS ?? "90")
    )
  );
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  await runGeneration({
    mode: "api",
    dates,
    facilityIdFilter: facilityId,
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
