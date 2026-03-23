import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { loadDataset } from "@/lib/sim/dataset-loader";
import { deleteMazraRowsForFacility } from "@/lib/sim/delete-mazra-rows";
import { isDatasetMode, MODE_CONFIGS } from "@/lib/sim/modes";
import type { DatasetMode } from "@/lib/sim/modes/types";
import { seedQualitativeQcConfigs } from "@/lib/sim/writers/qc-qualitative";

function bearerToken(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

/** Accept MAZRA_SIM_SECRET, CRON_SECRET, or NEXT_PUBLIC_MAZRA_SIM_SECRET (same value as client). */
function authorize(req: NextRequest): boolean {
  const token = bearerToken(req);
  if (!token) return false;
  const candidates = [
    process.env.MAZRA_SIM_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
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
 * POST JSON: { "mode": "baseline", "facilityId": "<uuid>" }
 * Bearer: MAZRA_SIM_SECRET, CRON_SECRET, or NEXT_PUBLIC_MAZRA_SIM_SECRET (must match).
 *
 * Success: `application/x-ndjson` stream — lines are JSON objects with `step`:
 * `deleting` | `loading` | `progress` | `done` | `error`
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    facilityId?: string;
  };

  const mode = body.mode?.trim();
  const facilityId = body.facilityId?.trim();
  if (!mode || !facilityId || !isDatasetMode(mode) || !MODE_CONFIGS[mode as DatasetMode]) {
    return NextResponse.json(
      { error: "invalid_mode_or_facility", mode, facilityId },
      { status: 400 }
    );
  }

  const targetDb = targetClient();
  if (!targetDb) {
    return NextResponse.json(
      { error: "missing_target_credentials" },
      { status: 500 }
    );
  }

  let mazraDb;
  try {
    mazraDb = createMazraAdminClient();
  } catch {
    return NextResponse.json(
      { error: "missing_mazra_control_credentials" },
      { status: 500 }
    );
  }

  const { data: cfgRow, error: cfgErr } = await mazraDb
    .from("sim_config")
    .select("dataset_date_offset_days")
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }

  const dateOffsetDays = Number(cfgRow?.dataset_date_offset_days ?? 0) || 0;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };

      try {
        send({ step: "deleting", message: "Clearing Mazra-tagged rows…" });

        const del = await deleteMazraRowsForFacility(targetDb, facilityId);
        if (!del.ok) {
          send({ step: "error", message: del.error ?? "delete_failed" });
          controller.close();
          return;
        }

        send({ step: "loading", message: `Loading ${mode} dataset…` });

        try {
          await seedQualitativeQcConfigs(targetDb, facilityId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          send({
            step: "error",
            message: `qualitative_qc_configs seed: ${msg}`,
          });
          controller.close();
          return;
        }

        const counts = await loadDataset(mode, facilityId, targetDb, {
          dateOffsetDays,
          onProgress: (table, loaded, total) => {
            send({ step: "progress", table, loaded, total });
          },
        });

        const { error: upErr } = await mazraDb
          .from("sim_config")
          .update({
            active_mode: mode,
            mode_switched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("facility_id", facilityId);

        if (upErr) {
          send({ step: "error", message: upErr.message });
          controller.close();
          return;
        }

        send({ step: "done", mode, facilityId, counts });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send({ step: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
