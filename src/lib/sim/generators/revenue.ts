import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { MAZRA_TEST_CATALOG } from "@/lib/sim/seeders/test-metadata";
import { fmtRday } from "./time-encoding";

function priceForTest(testName: string): number {
  const row = MAZRA_TEST_CATALOG.find(
    (t) => t.test_name.toLowerCase() === String(testName).trim().toLowerCase()
  );
  return row?.price ?? 15000;
}

/**
 * One revenue row per surviving test request (after cancellation filter).
 */
export function generateRevenueFromTat(
  requests: Record<string, unknown>[],
  facilityId: string,
  relativeDay: number,
  rng: () => number,
  cancellationRate: number
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let seq = 0;
  for (const req of requests) {
    if (rng() < cancellationRate) continue;
    const testName = String(req.test_name ?? "");
    const section = String(req.section ?? "");
    const lab = String(req.lab_number ?? `LAB${relativeDay}${seq}`);
    const variation = 0.95 + rng() * 0.1;
    const amount =
      Math.round(priceForTest(testName) * variation * 100) / 100;

    rows.push({
      id: deterministicUuid(`rev:${facilityId}:${relativeDay}:${seq}`),
      facility_id: facilityId,
      date: fmtRday(relativeDay),
      test_name: testName,
      section,
      amount,
      currency: "UGX",
      status: "completed",
      source_ref: "mazra_dataset",
      lab_number: lab,
      mazra_generated: true,
    });
    seq += 1;
  }
  return rows;
}
