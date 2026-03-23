import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { fmtRtime } from "./time-encoding";

export function generateOperationalAlertsForDay(opts: {
  facilityId: string;
  relativeDay: number;
  alertsPerWeek: number;
  equipmentDownFirst: boolean;
  rng: () => number;
}): Record<string, unknown>[] {
  const { facilityId, relativeDay, alertsPerWeek, equipmentDownFirst, rng } =
    opts;

  const dailyP = Math.min(0.95, (alertsPerWeek / 7) * 0.85);
  if (rng() > dailyP && !equipmentDownFirst) return [];

  const templates = [
    {
      alert_type: "tat_breach",
      title: "TAT breach — Clinical Chemistry",
      description:
        "Average TAT for Clinical Chemistry exceeded target during morning shift.",
      severity: "warning",
      source_modules: ["tat"],
      metadata: { section: "Clinical Chemistry" },
    },
    {
      alert_type: "equipment_offline",
      title: "Analyser attention required",
      description: "Equipment reported degraded performance; maintenance notified.",
      severity: "critical",
      source_modules: ["equipment", "tat"],
      metadata: {},
    },
    {
      alert_type: "qc_violation",
      title: "QC flag — review required",
      description: "Westgard rule triggered on routine QC.",
      severity: "warning",
      source_modules: ["qc"],
      metadata: {},
    },
  ] as const;

  const pick = templates[Math.floor(rng() * templates.length)]!;
  const hour = 8 + Math.floor(rng() * 8);
  const minute = Math.floor(rng() * 60);

  return [
    {
      id: deterministicUuid(`alr:${relativeDay}:${pick.alert_type}`),
      facility_id: facilityId,
      alert_type: pick.alert_type,
      title: pick.title,
      description: pick.description,
      severity: pick.severity,
      source_modules: [...pick.source_modules],
      metadata: { ...pick.metadata },
      mazra_generated: true,
      created_at: fmtRtime(relativeDay, hour * 60 + minute),
    },
  ];
}
