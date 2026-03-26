import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { loadDataset } from "@/lib/sim/dataset-loader";
import { deleteMazraRowsForFacility } from "@/lib/sim/delete-mazra-rows";
import { isDatasetMode, MODE_CONFIGS } from "@/lib/sim/modes";
import type { DatasetMode } from "@/lib/sim/modes/types";
import { seedQualitativeQcConfigs } from "@/lib/sim/writers/qc-qualitative";
import { writeUnmatchedTests } from "@/lib/sim/writers/unmatched-tests";

function bearerToken(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

/** Accept MAZRA_SIM_SECRET, CRON_SECRET, or NEXT_PUBLIC_MAZRA_SIM_SECRET (same value as client). Headers only — never read body before authorize. */
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
 * Auth uses `Authorization` header only. Body is read exactly once after auth.
 *
 * Success: `application/x-ndjson` stream — lines are JSON objects with `step`:
 * `deleting` | `loading` | `progress` | `done` | `error`
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const o = body as { mode?: unknown; facilityId?: unknown };
  const mode = typeof o.mode === "string" ? o.mode.trim() : "";
  const facilityId =
    typeof o.facilityId === "string" ? o.facilityId.trim() : "";

  if (!mode || !facilityId || !isDatasetMode(mode) || !MODE_CONFIGS[mode]) {
    return NextResponse.json(
      { error: "invalid_mode_or_facility", mode: mode || null, facilityId: facilityId || null },
      { status: 400 }
    );
  }

  const modeTyped = mode as DatasetMode;

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

        send({ step: "loading", message: `Loading ${modeTyped} dataset…` });

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

        const counts = await loadDataset(modeTyped, facilityId, targetDb, {
          dateOffsetDays,
          onProgress: (table, loaded, total) => {
            send({ step: "progress", table, loaded, total });
          },
        });

        if (modeTyped === "poor_discipline") {
          try {
            const n = await writeUnmatchedTests(targetDb, facilityId);
            send({
              step: "progress",
              table: "unmatched_tests",
              loaded: n,
              total: n,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            send({ step: "error", message: `unmatched_tests: ${msg}` });
            controller.close();
            return;
          }
        }

        // After load completes, trigger Kanta anomaly baseline refresh (non-fatal).
        try {
          const appUrl = process.env.KANTA_APP_URL?.trim();
          const secret = process.env.KANTA_CRON_SECRET?.trim();
          if (appUrl && secret) {
            await fetch(`${appUrl.replace(/\/+$/, "")}/api/tat/anomalies`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ facilityId }),
            });
          }
        } catch (e) {
          console.warn("Anomaly baseline refresh failed:", e);
        }

        const { error: upErr } = await mazraDb
          .from("sim_config")
          .update({
            active_mode: modeTyped,
            mode_switched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("facility_id", facilityId);

        if (upErr) {
          send({ step: "error", message: upErr.message });
          controller.close();
          return;
        }

        send({ step: "done", mode: modeTyped, facilityId, counts });
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
