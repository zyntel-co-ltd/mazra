import type { DatasetMode, ModeConfig } from "./types";

export const MODE_CONFIGS: Record<DatasetMode, ModeConfig> = {
  baseline: {
    label: "Normal",
    description:
      "A well-run 200-bed private hospital. TAT within targets ~85% of the time. Equipment mostly operational. QC stable. Revenue growing steadily.",
    color: "#0A7C4E",
    daily_min: 90,
    daily_max: 130,
    tat_breach_rate: 0.15,
    equipment_failure_interval_days: 21,
    qc_drift_analyte: null,
    cancellation_rate: 0.04,
    maintenance_compliance: 0.85,
    fridge_breach_frequency: "monthly",
    staff_efficiency: 1.0,
    alerts_per_week: 1,
  },

  high_volume: {
    label: "Busy",
    description:
      "End of quarter, insurance deadline week, referrals spiking. 180–220 patients/day. TAT under pressure but holding. Revenue surging.",
    color: "#0891B2",
    daily_min: 160,
    daily_max: 220,
    tat_breach_rate: 0.28,
    equipment_failure_interval_days: 14,
    qc_drift_analyte: null,
    cancellation_rate: 0.06,
    maintenance_compliance: 0.7,
    fridge_breach_frequency: "weekly",
    staff_efficiency: 0.85,
    alerts_per_week: 3,
  },

  critical_failure: {
    label: "Critical",
    description:
      "Three crises: Chemistry analyser down, Blood Bank fridge breaching, QC drifting. TAT catastrophic. Management escalating.",
    color: "#DC2626",
    daily_min: 80,
    daily_max: 120,
    tat_breach_rate: 0.65,
    equipment_failure_interval_days: 3,
    qc_drift_analyte: "Creatinine",
    cancellation_rate: 0.08,
    maintenance_compliance: 0.4,
    fridge_breach_frequency: "daily",
    staff_efficiency: 0.6,
    alerts_per_week: 8,
    equipment_down_windows: [
      { name: "Chemistry Analyser (Mindray BS-480)", start: 131, end: 135 },
    ],
    fridge_breach_events: [
      { unit: "Blood Bank Fridge A", day: 150, duration_hours: 3 },
    ],
  },

  understaffed: {
    label: "Difficult",
    description:
      "Chronic understaffing. Night shift TAT elevated. Microbiology short-staffed. Maintenance deferred. QC violations accumulating.",
    color: "#D97706",
    daily_min: 85,
    daily_max: 115,
    tat_breach_rate: 0.45,
    night_shift_tat_multiplier: 1.6,
    equipment_failure_interval_days: 30,
    qc_drift_analyte: "ALT",
    cancellation_rate: 0.05,
    maintenance_compliance: 0.35,
    fridge_breach_frequency: "biweekly",
    staff_efficiency: 0.65,
    alerts_per_week: 4,
    section_understaffed: "Microbiology",
  },

  poor_discipline: {
    label: "Lazy",
    description:
      "Sparse scans, high cancellations, unmatched tests, missing revenue/target rows — the hospital that needs Kanta most.",
    color: "#7C3AED",
    daily_min: 70,
    daily_max: 100,
    tat_breach_rate: 0.3,
    equipment_failure_interval_days: 45,
    qc_drift_analyte: null,
    cancellation_rate: 0.12,
    maintenance_compliance: 0.2,
    scan_compliance: 0.4,
    fridge_breach_frequency: "monthly",
    staff_efficiency: 0.75,
    alerts_per_week: 2,
    unmatched_test_rate: 0.15,
    targets_missing: true,
  },

  recovery: {
    label: "Recovery",
    description:
      "Was in crisis months ago; visibly improving. TAT, QC, maintenance and alerts trending toward normal.",
    color: "#0D2137",
    daily_min: 85,
    daily_max: 125,
    tat_breach_rate: 0.18,
    tat_breach_rate_start: 0.55,
    tat_breach_rate_end: 0.18,
    equipment_failure_interval_days: 60,
    qc_drift_analyte: null,
    cancellation_rate: 0.05,
    maintenance_compliance: 0.8,
    maintenance_compliance_start: 0.35,
    maintenance_compliance_end: 0.8,
    fridge_breach_frequency: "none",
    staff_efficiency: 0.9,
    staff_efficiency_start: 0.6,
    staff_efficiency_end: 0.9,
    alerts_per_week: 1,
    alerts_per_week_start: 7,
    alerts_per_week_end: 1,
    interpolate: true,
  },
};

export function isDatasetMode(s: string): s is DatasetMode {
  return s in MODE_CONFIGS;
}

export type { DatasetMode, ModeConfig };
