import { NextRequest, NextResponse } from "next/server";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const facilityId = (body.get("facility_id") as string | null)?.trim();
  const scenarioId = (body.get("scenario_id") as string | null)?.trim();
  const action = (body.get("action") as string | null)?.trim();

  if (!facilityId || !scenarioId || !action) {
    return NextResponse.redirect(
      new URL("/admin?err=missing_fields", req.url)
    );
  }

  const db = createMazraAdminClient();

  const { data: config, error: loadErr } = await db
    .from("sim_config")
    .select("active_scenarios")
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.redirect(
      new URL(
        `/admin?err=${encodeURIComponent(loadErr.message)}`,
        req.url
      )
    );
  }

  if (!config) {
    return NextResponse.redirect(
      new URL("/admin?err=no_sim_config_for_facility", req.url)
    );
  }

  const raw = config.active_scenarios;
  const current: string[] = Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string")
    : [];

  const updated =
    action === "activate"
      ? [...new Set([...current, scenarioId])]
      : current.filter((s) => s !== scenarioId);

  const { error: upErr } = await db
    .from("sim_config")
    .update({
      active_scenarios: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("facility_id", facilityId);

  if (upErr) {
    return NextResponse.redirect(
      new URL(`/admin?err=${encodeURIComponent(upErr.message)}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/admin", req.url));
}
