import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayEvent } from "@/engine/types";
import { seededRng } from "@/lib/sim/rng-writer";
import { tatMinutesForTest } from "@/lib/sim/seeders/test-metadata";

export interface TatPayload {
  test_name: string;
  section: string;
  priority: "stat" | "urgent" | "routine";
  status: "pending" | "received" | "in_progress" | "resulted" | "cancelled";
  requested_at: string;
  received_at?: string | null;
  resulted_at?: string | null;
  patient_id?: string | null;
  lab_number?: string | null;
}

export function isTatPayload(p: unknown): p is TatPayload {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return typeof o.test_name === "string" && typeof o.section === "string";
}

/**
 * By end of `dateIso` (UTC), decide if TAT has completed → LRIDS-friendly `resulted`.
 */
function finalizeTatForSimulationDay(
  p: TatPayload,
  dateIso: string
): Pick<TatPayload, "status" | "received_at" | "resulted_at"> {
  if (p.status === "resulted" && p.resulted_at) {
    return {
      status: p.status,
      received_at: p.received_at ?? null,
      resulted_at: p.resulted_at,
    };
  }

  const dayEndMs = new Date(`${dateIso}T23:59:59.999Z`).getTime();
  const recvMs = new Date(p.received_at ?? p.requested_at).getTime();
  const tatMin = tatMinutesForTest(p.test_name, p.priority);
  const doneMs = recvMs + tatMin * 60_000;

  if (doneMs <= dayEndMs) {
    return {
      status: "resulted",
      received_at: p.received_at ?? new Date(p.requested_at).toISOString(),
      resulted_at: new Date(doneMs).toISOString(),
    };
  }

  if (recvMs <= dayEndMs) {
    return {
      status: "in_progress",
      received_at: p.received_at ?? new Date(p.requested_at).toISOString(),
      resulted_at: null,
    };
  }

  return {
    status: p.status,
    received_at: p.received_at ?? null,
    resulted_at: p.resulted_at ?? null,
  };
}

type TatTargetRow = {
  section: string;
  test_name: string | null;
  target_minutes: number;
};

function resolveTatTargetMinutes(
  targets: TatTargetRow[],
  section: string,
  testName: string
): number {
  const exact = targets.find(
    (t) =>
      t.section === section &&
      t.test_name != null &&
      t.test_name.toLowerCase() === testName.trim().toLowerCase()
  );
  if (exact) return exact.target_minutes;
  const sectionRow = targets.find(
    (t) => t.section === section && (t.test_name == null || t.test_name === "")
  );
  return sectionRow?.target_minutes ?? 60;
}

/**
 * Force historical calendar days to `resulted` so LRIDS and TAT breach logic see completed tests.
 */
export async function applyHistoricalMazraTestResults(
  targetDb: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string
): Promise<void> {
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (dateIso >= todayUtc) return;

  const rng = seededRng(`${seedString}:tat-hist-result:${dateIso}`);
  const base = new Date(`${dateIso}T14:00:00.000Z`).getTime();
  const offset = Math.floor(rng() * 4 * 60 * 60 * 1000);
  const resultedAt = new Date(base + offset).toISOString();

  const dayEnd = new Date(`${dateIso}T12:00:00.000Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const nextDayStart = `${dayEnd.toISOString().slice(0, 10)}T00:00:00.000Z`;

  const { error } = await targetDb
    .from("test_requests")
    .update({
      status: "resulted",
      resulted_at: resultedAt,
    })
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .gte("requested_at", `${dateIso}T00:00:00.000Z`)
    .lt("requested_at", nextDayStart)
    .in("status", ["received", "in_progress"]);

  if (error) {
    throw new Error(`historical test_requests resulted update: ${error.message}`);
  }
}

/**
 * Insert TAT breach rows for requests whose actual turnaround exceeded `tat_targets`.
 */
export async function writeTatBreachesForRequestIds(
  targetDb: SupabaseClient,
  facilityId: string,
  requestIds: string[]
): Promise<number> {
  if (requestIds.length === 0) return 0;

  const { data: targets, error: tErr } = await targetDb
    .from("tat_targets")
    .select("section, test_name, target_minutes")
    .eq("facility_id", facilityId);

  if (tErr) {
    throw new Error(`tat_targets load: ${tErr.message}`);
  }

  const targetList = (targets ?? []) as TatTargetRow[];

  const { data: reqs, error: rErr } = await targetDb
    .from("test_requests")
    .select("id, section, test_name, received_at, resulted_at, status")
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .in("id", requestIds);

  if (rErr) {
    throw new Error(`test_requests reload for tat_breaches: ${rErr.message}`);
  }

  const breaches: Record<string, unknown>[] = [];

  for (const req of reqs ?? []) {
    if (req.status !== "resulted" || !req.resulted_at || !req.received_at) {
      continue;
    }
    const receivedAt = new Date(req.received_at as string);
    const resultedAt = new Date(req.resulted_at as string);
    const actualMinutes =
      (resultedAt.getTime() - receivedAt.getTime()) / 60_000;

    const testName = String(req.test_name ?? "");
    const targetMinutes = resolveTatTargetMinutes(
      targetList,
      String(req.section),
      testName
    );

    if (actualMinutes > targetMinutes) {
      breaches.push({
        request_id: req.id as string,
        facility_id: facilityId,
        breach_minutes: Math.round(actualMinutes - targetMinutes),
        target_minutes: targetMinutes,
        detected_at: req.resulted_at as string,
        mazra_generated: true,
      });
    }
  }

  const { error: delErr } = await targetDb
    .from("tat_breaches")
    .delete()
    .eq("mazra_generated", true)
    .in("request_id", requestIds);

  if (delErr) {
    throw new Error(`tat_breaches delete: ${delErr.message}`);
  }

  if (breaches.length === 0) return 0;

  const { error: insErr } = await targetDb.from("tat_breaches").insert(breaches);
  if (insErr) {
    throw new Error(`tat_breaches insert failed: ${insErr.message}`);
  }
  return breaches.length;
}

/**
 * Insert TAT events into Kanta `test_requests` (service role bypasses RLS).
 */
export async function insertTestRequestsFromTatEvents(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  events: DayEvent[]
): Promise<{ inserted: number; requestIds: string[]; error?: string }> {
  const tat = events.filter((e) => e.module === "tat" && isTatPayload(e.payload));
  if (tat.length === 0) return { inserted: 0, requestIds: [] };

  const rows = tat.map((e) => {
    const p = e.payload as TatPayload;
    const fin = finalizeTatForSimulationDay(p, dateIso);
    return {
      facility_id: facilityId,
      patient_id: p.patient_id ?? null,
      lab_number: p.lab_number ?? null,
      test_name: p.test_name,
      section: p.section,
      priority: p.priority,
      requested_at: p.requested_at,
      received_at: fin.received_at ?? null,
      resulted_at: fin.resulted_at ?? null,
      status: fin.status,
      mazra_generated: true,
    };
  });

  const { data, error } = await target
    .from("test_requests")
    .insert(rows)
    .select("id");

  if (error) {
    return { inserted: 0, requestIds: [], error: error.message };
  }

  const requestIds = (data ?? []).map((r) => r.id as string);
  return { inserted: rows.length, requestIds };
}
