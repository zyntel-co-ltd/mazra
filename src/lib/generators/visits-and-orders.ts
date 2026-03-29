import seedrandom from "seedrandom";
import { getSeasonalMultiplier } from "./seasonal";
import { stableUuid } from "./rng";
import type { HospitalProfileConfig } from "./profiles/types";
import type {
  PatientRow,
  PatientVisitRow,
  SampleChainRow,
  TestCatalogRow,
  TestOrderRow,
  TestResultRow,
  LabSectionRow,
} from "./types";

export function buildTestCatalog(
  profile: HospitalProfileConfig,
  profileUuid: string,
  year: number,
  sections: LabSectionRow[]
): TestCatalogRow[] {
  const rng = seedrandom(`${profileUuid}:test_catalog:${year}`);
  const sampleTypes = ["blood", "urine", "swab", "stool", "csf", "tissue", "sputum", "other"] as const;
  const out: TestCatalogRow[] = [];
  for (let i = 0; i < profile.testCatalogSize; i++) {
    const sec = sections[i % sections.length]!;
    out.push({
      id: stableUuid(`${profile.profileId}:test:${year}:${i}`),
      profile_id: profileUuid,
      section_id: sec.id,
      test_name: `Panel ${i + 1} — ${sec.name}`,
      loinc_code: `LP-${10000 + i}`,
      standard_tat_minutes: 30 + Math.floor(rng() * 240),
      price_ugx: (5000 + Math.floor(rng() * 200000)).toFixed(2),
      requires_fasting: rng() < 0.05,
      sample_type: sampleTypes[Math.floor(rng() * sampleTypes.length)] ?? "blood",
    });
  }
  return out;
}

export function generateVisitsOrdersAndResults(opts: {
  profile: HospitalProfileConfig;
  profileUuid: string;
  year: number;
  start: Date;
  end: Date;
  patients: PatientRow[];
  catalog: TestCatalogRow[];
  sections: LabSectionRow[];
  staffIds: string[];
}): {
  visits: PatientVisitRow[];
  orders: TestOrderRow[];
  results: TestResultRow[];
  chains: SampleChainRow[];
} {
  const { profile, profileUuid, year, patients, catalog, sections, staffIds } = opts;
  const rng = seedrandom(`${profileUuid}:visits:${year}`);
  const visits: PatientVisitRow[] = [];
  const orders: TestOrderRow[] = [];
  const results: TestResultRow[] = [];
  const chains: SampleChainRow[] = [];

  let pIdx = 0;
  const startMs = Date.UTC(opts.start.getUTCFullYear(), opts.start.getUTCMonth(), opts.start.getUTCDate());
  const endMs = Date.UTC(opts.end.getUTCFullYear(), opts.end.getUTCMonth(), opts.end.getUTCDate());
  for (let ms = startMs; ms <= endMs; ms += 86400000) {
    const d = new Date(ms);
    const mult = getSeasonalMultiplier(d);
    const lo = Math.floor(profile.dailyPatientsMin * mult);
    const hi = Math.floor(profile.dailyPatientsMax * mult);
    const daily = lo + Math.floor(rng() * (hi - lo + 1));
    for (let v = 0; v < daily; v++) {
      const patient = patients[pIdx % patients.length]!;
      pIdx++;
      const vid = stableUuid(`${profile.profileId}:visit:${d.toISOString()}${v}`);
      const visitDate = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8 + Math.floor(rng() * 8), Math.floor(rng() * 59), 0)
      );
      visits.push({
        id: vid,
        profile_id: profileUuid,
        patient_id: patient.id,
        visit_date: visitDate.toISOString(),
        visit_type: ["outpatient", "inpatient", "emergency"][Math.floor(rng() * 3)] ?? "outpatient",
        presenting_complaint_category: ["fever", "gi", "respiratory", "other"][Math.floor(rng() * 4)] ?? "fever",
        department: "Laboratory",
        payment_method: "cash",
        discharge_date: null,
      });

      const nTests = 1 + Math.floor(rng() * 4);
      for (let t = 0; t < nTests; t++) {
        const test = catalog[Math.floor(rng() * catalog.length)]!;
        const sec = sections.find((s) => s.id === test.section_id) ?? sections[0]!;
        const orderedAt = new Date(visitDate.getTime() + 15 * 60 * 1000 + Math.floor(rng() * 3600) * 1000);
        const oid = stableUuid(`${profile.profileId}:order:${vid}:${test.id}:${t}`);
        orders.push({
          id: oid,
          profile_id: profileUuid,
          visit_id: vid,
          patient_id: patient.id,
          test_id: test.id,
          section_id: sec.id,
          ordered_at: orderedAt.toISOString(),
          priority: ["routine", "urgent", "stat"][Math.floor(rng() * 3)] ?? "routine",
          ordering_clinician_id: staffIds.length ? staffIds[Math.floor(rng() * staffIds.length)]! : null,
        });

        const resulted = new Date(orderedAt.getTime() + (test.standard_tat_minutes ?? 60) * 60 * 1000);
        results.push({
          id: stableUuid(`${oid}:result`),
          profile_id: profileUuid,
          order_id: oid,
          test_id: test.id,
          result_value: "within range",
          result_numeric: (10 + rng() * 5).toFixed(4),
          result_unit: "g/L",
          reference_range_low: "12.000000",
          reference_range_high: "16.000000",
          is_critical: rng() < 0.002,
          status: "verified",
          resulted_at: resulted.toISOString(),
          verified_at: new Date(resulted.getTime() + 10 * 60 * 1000).toISOString(),
          verified_by: staffIds.length ? staffIds[Math.floor(rng() * staffIds.length)]! : null,
        });

        chains.push({
          id: stableUuid(`${oid}:chain`),
          profile_id: profileUuid,
          order_id: oid,
          sample_type: test.sample_type ?? "blood",
          sample_collected_at: orderedAt.toISOString(),
          sample_received_at: new Date(orderedAt.getTime() + 20 * 60 * 1000).toISOString(),
          section_received_at: new Date(orderedAt.getTime() + 35 * 60 * 1000).toISOString(),
          processing_started_at: new Date(orderedAt.getTime() + 40 * 60 * 1000).toISOString(),
          result_ready_at: resulted.toISOString(),
          rejection_reason: null,
          is_rejected: false,
        });
      }
    }
  }

  return { visits, orders, results, chains };
}
