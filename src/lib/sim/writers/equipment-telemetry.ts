import type { SupabaseClient } from "@supabase/supabase-js";

type TatLikeRow = {
  section: string | null;
  requested_at: string | null;
  received_at: string | null;
  resulted_at: string | null;
};

function safeHour(iso: string | null, rng: () => number): number {
  if (!iso) return Math.floor(rng() * 14) + 7; // 07:00–20:00
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Math.floor(rng() * 14) + 7;
  return d.getUTCHours();
}

function tatMinutes(row: TatLikeRow): number {
  if (!row.received_at || !row.resulted_at) return 60;
  const a = new Date(row.received_at).getTime();
  const b = new Date(row.resulted_at).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 60;
  const m = (b - a) / 60_000;
  return Number.isFinite(m) && m > 0 ? m : 60;
}

export async function generateEquipmentTelemetry(opts: {
  dateIso: string;
  targetDb: SupabaseClient;
  facilityId: string;
  tatRows: TatLikeRow[];
  rng: () => number;
}): Promise<number> {
  const { dateIso, targetDb, facilityId, tatRows, rng } = opts;
  if (!tatRows.length) return 0;

  const bySection: Record<string, { tats: number[]; hours: number[] }> = {};

  for (const req of tatRows) {
    const section = req.section?.trim() || "Unknown";
    if (!bySection[section]) bySection[section] = { tats: [], hours: [] };
    bySection[section].tats.push(tatMinutes(req));
    bySection[section].hours.push(safeHour(req.requested_at, rng));
  }

  const recordDate = dateIso;
  const dayOfWeek = new Date(`${dateIso}T12:00:00.000Z`).getUTCDay();

  const telemetry = Object.entries(bySection).map(([section, data]) => {
    const avgTat =
      data.tats.reduce((a, b) => a + b, 0) / Math.max(1, data.tats.length);

    // Simple baseline: keeps values stable and interpretable in UI.
    const mean = 60;
    const sd = 15;
    const zScore = (avgTat - mean) / sd;

    const freq: Record<number, number> = {};
    for (const h of data.hours) freq[h] = (freq[h] ?? 0) + 1;
    const peakHour = Number(
      Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12
    );

    return {
      facility_id: facilityId,
      section,
      record_date: recordDate,
      avg_tat_minutes: Math.round(avgTat),
      z_score: Math.round(zScore * 100) / 100,
      sample_volume: data.tats.length,
      peak_hour: peakHour,
      day_of_week: dayOfWeek,
      days_to_failure: null,
      failure_type: null,
      mazra_generated: true,
    };
  });

  const { error } = await targetDb.from("equipment_telemetry_log").insert(telemetry);
  if (error) {
    throw new Error(`equipment_telemetry_log insert failed: ${error.message}`);
  }
  return telemetry.length;
}

