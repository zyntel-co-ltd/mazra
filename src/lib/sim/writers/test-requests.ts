import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayEvent } from "@/engine/types";

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
 * Insert TAT events into Kanta `test_requests` (service role bypasses RLS).
 */
export async function insertTestRequestsFromTatEvents(
  target: SupabaseClient,
  facilityId: string,
  events: DayEvent[]
): Promise<{ inserted: number; error?: string }> {
  const tat = events.filter((e) => e.module === "tat" && isTatPayload(e.payload));
  if (tat.length === 0) return { inserted: 0 };

  const rows = tat.map((e) => {
    const p = e.payload as TatPayload;
    return {
      facility_id: facilityId,
      patient_id: p.patient_id ?? null,
      lab_number: p.lab_number ?? null,
      test_name: p.test_name,
      section: p.section,
      priority: p.priority,
      requested_at: p.requested_at,
      received_at: p.received_at ?? null,
      resulted_at: p.resulted_at ?? null,
      status: p.status,
      mazra_generated: true,
    };
  });

  const { error } = await target.from("test_requests").insert(rows);
  if (error) {
    return { inserted: 0, error: error.message };
  }
  return { inserted: rows.length };
}
