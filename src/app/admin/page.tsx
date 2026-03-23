import * as fs from "node:fs";
import * as path from "node:path";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { MODE_CONFIGS } from "@/lib/sim/modes";
import type { DatasetMode } from "@/lib/sim/modes/types";
import type { SimConfigRow } from "@/lib/sim/sim-config";
import { AdminShell } from "./AdminShell";

function getModeMetadata(mode: string): {
  days?: number;
  counts?: Record<string, number>;
} | null {
  try {
    const p = path.join(process.cwd(), "datasets", mode, "metadata.json");
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as {
      days?: number;
      counts?: Record<string, number>;
    };
  } catch {
    return null;
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const flash: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    flash[k] = Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  }

  const db = createMazraAdminClient();

  const [{ data: configs }, { data: logs }] = await Promise.all([
    db.from("sim_config").select("*").eq("sim_enabled", true),
    db
      .from("sim_generation_log")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(12),
  ]);

  const modesWithMeta = (
    Object.entries(MODE_CONFIGS) as [DatasetMode, (typeof MODE_CONFIGS)[DatasetMode]][]
  ).map(([key, cfg]) => ({
    key,
    cfg,
    meta: getModeMetadata(key),
  }));

  return (
    <AdminShell
      configs={(configs ?? []) as SimConfigRow[]}
      logs={logs ?? []}
      modesWithMeta={modesWithMeta}
      flash={flash}
    />
  );
}
