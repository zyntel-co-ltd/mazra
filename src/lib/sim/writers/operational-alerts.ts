import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sparse cross-module alerts for dashboard banner (deterministic from calendar date).
 */
export async function generateOperationalAlerts(
  dateIso: string,
  targetDb: SupabaseClient,
  facilityId: string
): Promise<{ inserted: number; error?: string }> {
  const d = new Date(`${dateIso}T12:00:00.000Z`);
  const dayNum = d.getUTCDate();
  const dayOfWeek = d.getUTCDay();

  const alerts: Record<string, unknown>[] = [];

  if (dayNum % 5 === 0) {
    alerts.push({
      facility_id: facilityId,
      alert_type: "tat_breach",
      title: "TAT breach — Clinical Chemistry",
      description:
        "Average TAT for Clinical Chemistry section exceeded target by 45 minutes during morning shift.",
      severity: "warning",
      source_modules: ["tat"],
      metadata: { section: "Clinical Chemistry", breach_minutes: 45 },
      mazra_generated: true,
      created_at: `${dateIso}T08:00:00.000Z`,
    });
  }

  if (dayNum % 14 === 0) {
    alerts.push({
      facility_id: facilityId,
      alert_type: "equipment_offline",
      title: "Chemistry Analyser offline",
      description:
        "Chemistry Analyser (Mindray BS-480) reported offline at 10:15. Maintenance team notified.",
      severity: "critical",
      source_modules: ["equipment", "tat"],
      metadata: { equipment_name: "Chemistry Analyser (Mindray BS-480)" },
      mazra_generated: true,
      created_at: `${dateIso}T08:15:00.000Z`,
    });
  }

  if (dayOfWeek === 5) {
    alerts.push({
      facility_id: facilityId,
      alert_type: "qc_violation",
      title: "Westgard R-4s violation — ALT",
      description:
        "ALT control on Chemistry Analyser 2 triggered R-4s rejection rule. QC run failed.",
      severity: "warning",
      source_modules: ["qc"],
      metadata: { analyte: "ALT", rule: "R-4s" },
      mazra_generated: true,
      created_at: `${dateIso}T14:00:00.000Z`,
    });
  }

  if (alerts.length === 0) return { inserted: 0 };

  const { error: delErr } = await targetDb
    .from("operational_alerts")
    .delete()
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .gte("created_at", `${dateIso}T00:00:00.000Z`)
    .lt("created_at", `${dateIso}T23:59:59.999Z`);
  if (delErr) return { inserted: 0, error: delErr.message };

  const { error } = await targetDb.from("operational_alerts").insert(alerts);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: alerts.length };
}
