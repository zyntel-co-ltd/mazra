/**
 * CLI seeder — runs Mazra generation for the last N UTC days.
 *
 * Usage: npm run seed
 *
 * Requires (control plane):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional (target / Kanta writes):
 *   MAZRA_WRITE_TO_TARGET=1
 *   TARGET_SUPABASE_URL + TARGET_SUPABASE_SERVICE_ROLE_KEY
 *   (or mazra_clients.target_db_url + TARGET_SUPABASE_SERVICE_ROLE_KEY)
 *
 * Env:
 *   MAZRA_SEED_DAYS=90  — default 3
 */

import { runGeneration } from "../src/lib/sim/run-generation";

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const days = Number(process.env.MAZRA_SEED_DAYS ?? "3");
  const dates = Array.from({ length: days }, (_, i) => isoDaysAgo(i));

  console.log(`Mazra seed: ${days} UTC day(s) →`, dates[0], "…", dates.at(-1));

  const result = await runGeneration({ mode: "seed", dates });

  console.log(JSON.stringify(result, null, 2));

  if (result.runsCompleted === 0 && result.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
