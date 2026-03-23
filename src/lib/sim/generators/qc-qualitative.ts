import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { fmtRday } from "./time-encoding";

const QUAL_TESTS = [
  "HIV Rapid",
  "Malaria RDT",
  "HCG (Pregnancy)",
  "HBsAg",
] as const;

export function generateQualitativeEntriesForDay(
  facilityId: string,
  relativeDay: number,
  rng: () => number
): Record<string, unknown>[] {
  return QUAL_TESTS.map((testName) => {
    const allPass = rng() > 0.05;
    return {
      id: deterministicUuid(`qual:${relativeDay}:${testName}`),
      facility_id: facilityId,
      config_id: `pqual:${testName}`,
      run_at: fmtRday(relativeDay),
      control_results: [
        {
          name: "Positive Control",
          expected: "Positive",
          actual: allPass ? "Positive" : "Negative",
          pass: allPass,
        },
        {
          name: "Negative Control",
          expected: "Negative",
          actual: allPass ? "Negative" : "Positive",
          pass: allPass,
        },
      ],
      overall_pass: allPass,
      corrective_action: allPass
        ? null
        : "Repeat test with new kit. Check lot expiry.",
      entered_by: "Auma R.",
      submitted: true,
      mazra_generated: true,
    };
  });
}
