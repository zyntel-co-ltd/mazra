/**
 * CLI seeder — runs Mazra generation for the last N UTC days.
 *
 * Usage: npm run seed
 *
 * Loads `.env` then `.env.local` (override) from the mazra project root.
 *
 * Windows PowerShell (inline env — bash-style `VAR=1 cmd` does not work):
 *   $env:MAZRA_SEED_DAYS = "90"; npm run seed
 * Or: npm run seed:90
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

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
for (const name of [".env", ".env.local"] as const) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    loadEnv({ path: p, override: name === ".env.local" });
  }
}

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
