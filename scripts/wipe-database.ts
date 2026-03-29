/**
 * ENG-118 — Delete all rows from Mazra Hospital tables (reverse FK order).
 */
import { createClient } from "@supabase/supabase-js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import "dotenv/config";

import { allProfiles } from "../src/lib/generators";
import { profileUuid } from "../src/lib/generators/profiles";

const REVERSE = [
  "alerts",
  "reagent_inventory",
  "maintenance_events",
  "qc_runs",
  "refrigerator_readings",
  "equipment_telemetry",
  "sample_chain",
  "test_results",
  "test_orders",
  "patient_visits",
  "patients",
  "equipment",
  "staff",
  "lab_sections",
  "hospital_profiles",
] as const;

function parseProfileFlag(): string | null {
  const i = process.argv.indexOf("--profile");
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

async function confirm(): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(
    "This will delete all data from all Mazra Hospital tables. Type CONFIRM to proceed: "
  );
  rl.close();
  return answer.trim() === "CONFIRM";
}

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (!(await confirm())) {
    console.log("Aborted.");
    process.exit(0);
  }

  const supabase = createClient(url, key);
  const single = parseProfileFlag();

  if (single) {
    const p = allProfiles().find((x) => x.profileId === single);
    if (!p) {
      console.error("Unknown profile id");
      process.exit(1);
    }
    const pid = profileUuid(p.profileId);
    console.log(`Wiping data for profile ${single} only (${pid})…`);
    await supabase.from("alerts").delete().eq("profile_id", pid);
    await supabase.from("reagent_inventory").delete().eq("profile_id", pid);
    await supabase.from("maintenance_events").delete().eq("profile_id", pid);
    await supabase.from("qc_runs").delete().eq("profile_id", pid);
    await supabase.from("refrigerator_readings").delete().eq("profile_id", pid);
    await supabase.from("equipment_telemetry").delete().eq("profile_id", pid);
    await supabase.from("sample_chain").delete().eq("profile_id", pid);
    await supabase.from("test_results").delete().eq("profile_id", pid);
    await supabase.from("test_orders").delete().eq("profile_id", pid);
    await supabase.from("patient_visits").delete().eq("profile_id", pid);
    await supabase.from("patients").delete().eq("profile_id", pid);
    await supabase.from("equipment").delete().eq("profile_id", pid);
    await supabase.from("staff").delete().eq("profile_id", pid);
    await supabase.from("lab_sections").delete().eq("profile_id", pid);
    await supabase.from("hospital_profiles").delete().eq("id", pid);
    console.log("Profile wipe complete.");
    return;
  }

  console.log("Full wipe — all profiles…");
  for (const table of REVERSE) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.error(`${table}:`, error.message);
    else console.log(`  cleared ${table}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
