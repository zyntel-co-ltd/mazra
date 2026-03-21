/**
 * CLI seeder stub — Phase 1: validates engine + env; DB backfill in later tasks.
 *
 * Usage: npm run seed
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (optional for dry run)
 */

import { generateDay } from "../src/engine";
import type { SimFacilityConfig } from "../src/engine/types";

const demoConfig: SimFacilityConfig = {
  hospitalName: "Demo Hospital (Mazra)",
  bedCount: 200,
  seedString: "kanta-demo-v1",
  activeScenarios: ["stable_normal"],
  modifiers: {},
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const days = Number(process.env.MAZRA_SEED_DAYS ?? "3");
  console.log(`Mazra seed (stub): last ${days} day(s), config:`, demoConfig.hospitalName);

  for (let i = 0; i < days; i++) {
    const date = isoDaysAgo(i);
    const events = generateDay(date, demoConfig);
    console.log(`  ${date}: ${events.length} events (not written to DB yet)`);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(
      "\nTip: set SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL to wire Supabase writes in Phase 1."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
