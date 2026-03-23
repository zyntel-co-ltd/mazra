import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { MAZRA_TEST_CATALOG } from "@/lib/sim/seeders/test-metadata";
import { fmtRtime } from "./time-encoding";

const SECTIONS = [
  "Haematology",
  "Clinical Chemistry",
  "Microbiology",
  "Serology",
] as const;

const TESTS_BY_SECTION: Record<(typeof SECTIONS)[number], string[]> = {
  Haematology: ["CBC", "ESR", "Blood Film", "Reticulocyte Count"],
  "Clinical Chemistry": [
    "LFT",
    "RFT",
    "Glucose",
    "Lipid Profile",
    "Electrolytes",
  ],
  Microbiology: ["Culture & Sensitivity", "Gram Stain", "AFB Smear"],
  Serology: ["HIV Rapid", "HBsAg", "VDRL", "Widal Test"],
};

const UNMATCHED_POOL = [
  "CXRAY",
  "RANDOM PANEL",
  "SPEC TEST 1",
  "BLOOD WORK",
  "PANEL A",
] as const;

const SECTION_TAT_TARGET: Record<string, number> = {
  Haematology: 45,
  "Clinical Chemistry": 60,
  Microbiology: 4320,
  Serology: 60,
  Endocrinology: 90,
};

function catalogTatMinutes(testName: string): number {
  const row = MAZRA_TEST_CATALOG.find(
    (t) => t.test_name.toLowerCase() === testName.trim().toLowerCase()
  );
  return row?.tat_minutes ?? 120;
}

export function generateTatEvents(opts: {
  mode: string;
  facilityId: string;
  relativeDay: number;
  patientCount: number;
  tatBreachRate: number;
  nightShiftMultiplier: number;
  sectionUnderstaffed?: string;
  unmatchedTestRate?: number;
  rng: () => number;
}): { requests: Record<string, unknown>[]; breaches: Record<string, unknown>[] } {
  const {
    mode,
    facilityId,
    relativeDay,
    patientCount,
    tatBreachRate,
    nightShiftMultiplier,
    sectionUnderstaffed,
    unmatchedTestRate,
    rng,
  } = opts;

  const requests: Record<string, unknown>[] = [];
  const breaches: Record<string, unknown>[] = [];

  for (let i = 0; i < patientCount; i++) {
    const section = SECTIONS[Math.floor(rng() * SECTIONS.length)]!;
    const unmatched =
      unmatchedTestRate != null && rng() < unmatchedTestRate;
    const testName = unmatched
      ? UNMATCHED_POOL[Math.floor(rng() * UNMATCHED_POOL.length)]!
      : TESTS_BY_SECTION[section][
          Math.floor(rng() * TESTS_BY_SECTION[section].length)
        ]!;

    const priority =
      rng() > 0.9 ? "stat" : rng() > 0.7 ? "urgent" : "routine";

    const dayStartMin = 7 * 60;
    const dayEndMin = 20 * 60;
    const requestedMin =
      dayStartMin + Math.floor(rng() * (dayEndMin - dayStartMin));
    const hour = Math.floor(requestedMin / 60);
    const shift =
      hour >= 8 && hour < 20 ? "Day Shift" : "Night Shift";

    let baseTat = unmatched ? 120 : catalogTatMinutes(testName);
    if (priority === "stat") baseTat *= 0.65;
    if (priority === "urgent") baseTat *= 0.85;

    const isNight = shift === "Night Shift";
    let effectiveTat = baseTat * (isNight ? nightShiftMultiplier : 1);
    if (sectionUnderstaffed && section === sectionUnderstaffed) {
      effectiveTat *= 1.5;
    }

    const willBreach = rng() < tatBreachRate;
    const turnaroundMin = willBreach
      ? effectiveTat * (1.2 + rng() * 0.8)
      : effectiveTat * (0.7 + rng() * 0.25);

    const receivedMin = requestedMin + Math.floor(rng() * 12);
    const resultedMin = receivedMin + turnaroundMin;

    const reqId = deterministicUuid(`req:${mode}:${relativeDay}:${i}`);

    requests.push({
      id: reqId,
      facility_id: facilityId,
      patient_id: `PAT${Math.floor(rng() * 90000) + 10000}`,
      lab_number: `LAB${relativeDay}${String(Math.floor(rng() * 9000) + 1000)}`,
      test_name: testName,
      section,
      priority,
      requested_at: fmtRtime(relativeDay, requestedMin),
      received_at: fmtRtime(relativeDay, receivedMin),
      resulted_at: fmtRtime(relativeDay, resultedMin),
      status: "resulted",
      shift,
      mazra_generated: true,
    });

    const targetMin =
      SECTION_TAT_TARGET[section] ??
      SECTION_TAT_TARGET["Clinical Chemistry"] ??
      60;
    if (turnaroundMin > targetMin) {
      breaches.push({
        id: deterministicUuid(`tbrk:${reqId}`),
        request_id: reqId,
        facility_id: facilityId,
        breach_minutes: Math.round(turnaroundMin - targetMin),
        target_minutes: targetMin,
        detected_at: fmtRtime(relativeDay, resultedMin),
        mazra_generated: true,
      });
    }
  }

  return { requests, breaches };
}
