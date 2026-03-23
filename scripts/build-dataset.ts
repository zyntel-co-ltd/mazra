/**
 * Build a compressed mode dataset into datasets/<mode>/
 *
 * Usage: npx tsx scripts/build-dataset.ts <mode> [days]
 */

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
for (const name of [".env", ".env.local"] as const) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    loadEnv({ path: p, override: name === ".env.local" });
  }
}

import { buildDataset } from "../src/lib/sim/dataset-builder";
import { isDatasetMode } from "../src/lib/sim/modes";
import type { DatasetMode } from "../src/lib/sim/modes/types";

async function main() {
  const modeArg = process.argv[2];
  const days = parseInt(process.argv[3] ?? "180", 10);

  if (!modeArg || !isDatasetMode(modeArg)) {
    console.error("Usage: npx tsx scripts/build-dataset.ts <mode> [days]");
    console.error(
      "Modes: baseline, high_volume, critical_failure, understaffed, poor_discipline, recovery"
    );
    process.exit(1);
  }

  const mode = modeArg as DatasetMode;
  const outDir = resolve(root, "datasets", mode);
  mkdirSync(outDir, { recursive: true });

  const facilityId =
    process.env.MAZRA_DATASET_FACILITY_ID?.trim() || "00000000-0000-4000-8000-000000000099";

  await buildDataset(mode, {
    facilityId,
    days: Number.isFinite(days) && days > 0 ? Math.min(days, 400) : 180,
    outputDir: outDir,
  });

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
