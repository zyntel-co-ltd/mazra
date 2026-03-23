import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { loadDataset } from "@/lib/sim/dataset-loader";
import { deleteMazraRowsForFacility } from "@/lib/sim/delete-mazra-rows";
import { isDatasetMode, MODE_CONFIGS } from "@/lib/sim/modes";
import type { DatasetMode } from "@/lib/sim/modes/types";
import { seedQualitativeQcConfigs } from "@/lib/sim/writers/qc-qualitative";

function targetClient() {
  const url = process.env.TARGET_SUPABASE_URL?.trim();
  const key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const facilityId = (body.get("facility_id") as string | null)?.trim();
  const mode = (body.get("mode") as string | null)?.trim();

  if (!facilityId || !mode || !isDatasetMode(mode) || !MODE_CONFIGS[mode as DatasetMode]) {
    return NextResponse.redirect(new URL("/admin?err=invalid_mode_params", req.url));
  }

  const targetDb = targetClient();
  if (!targetDb) {
    return NextResponse.redirect(
      new URL("/admin?err=missing_target_credentials", req.url)
    );
  }

  let mazraDb;
  try {
    mazraDb = createMazraAdminClient();
  } catch {
    return NextResponse.redirect(
      new URL("/admin?err=missing_mazra_credentials", req.url)
    );
  }

  const { data: cfgRow } = await mazraDb
    .from("sim_config")
    .select("dataset_date_offset_days")
    .eq("facility_id", facilityId)
    .maybeSingle();

  const dateOffsetDays = Number(cfgRow?.dataset_date_offset_days ?? 0) || 0;

  try {
    const del = await deleteMazraRowsForFacility(targetDb, facilityId);
    if (!del.ok) {
      return NextResponse.redirect(
        new URL(
          `/admin?err=${encodeURIComponent(del.error ?? "delete_failed")}`,
          req.url
        )
      );
    }

    await seedQualitativeQcConfigs(targetDb, facilityId);
    await loadDataset(mode, facilityId, targetDb, { dateOffsetDays });

    const { error: upErr } = await mazraDb
      .from("sim_config")
      .update({
        active_mode: mode,
        mode_switched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("facility_id", facilityId);

    if (upErr) {
      return NextResponse.redirect(
        new URL(`/admin?err=${encodeURIComponent(upErr.message)}`, req.url)
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      new URL(`/admin?err=${encodeURIComponent(msg)}`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/admin?switched=1", req.url));
}
