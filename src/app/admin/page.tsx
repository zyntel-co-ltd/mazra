import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import type { SimConfigRow } from "@/lib/sim/sim-config";

const SCENARIOS = [
  {
    id: "analyser_breakdown",
    name: "Analyser breakdown",
    description: "Chemistry TAT spikes 10:00–14:00",
  },
  {
    id: "understaffed_haematology",
    name: "Understaffed haematology",
    description: "CBC TAT at 180% for 5 days",
  },
  {
    id: "fridge_failure",
    name: "Fridge failure",
    description: "Blood bank breach 3 hours",
  },
  {
    id: "month_end_surge",
    name: "Month-end surge",
    description: "Volume +25%, revenue spike",
  },
  {
    id: "audit_week",
    name: "Audit week",
    description: "Everything at 100% — best performance",
  },
  {
    id: "stable_normal",
    name: "Stable normal",
    description: "Reset to baseline",
  },
] as const;

function activeScenarioIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const errBanner = sp.err ? decodeURIComponent(sp.err) : null;

  const db = createMazraAdminClient();

  const { data: configs } = await db
    .from("sim_config")
    .select("*")
    .eq("sim_enabled", true);

  const { data: logs } = await db
    .from("sim_generation_log")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(14);

  const rows = (configs ?? []) as SimConfigRow[];

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: 900,
        margin: "40px auto",
        padding: "0 24px",
      }}
    >
      <h1 style={{ color: "#0D2137" }}>Mazra — Admin</h1>

      {errBanner ? (
        <p
          style={{
            padding: "12px 16px",
            background: "#fde8e8",
            color: "#A32D2D",
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          {errBanner}
        </p>
      ) : null}

      <h2>Active facilities</h2>
      {rows.map((c) => {
        const activeList = activeScenarioIds(c.active_scenarios);
        return (
          <div
            key={c.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <strong>{c.hospital_name}</strong> — {c.facility_id}
            <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
              Active scenarios:{" "}
              {activeList.length ? activeList.join(", ") : "none"}
            </div>

            <h4 style={{ marginBottom: 8 }}>Scenarios</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SCENARIOS.map((s) => {
                const active = activeList.includes(s.id);
                return (
                  <form key={s.id} action="/api/admin/scenario" method="POST">
                    <input type="hidden" name="facility_id" value={c.facility_id} />
                    <input type="hidden" name="scenario_id" value={s.id} />
                    <input
                      type="hidden"
                      name="action"
                      value={active ? "deactivate" : "activate"}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: `1px solid ${active ? "#0A7C4E" : "#ccc"}`,
                        background: active ? "#E6F4EE" : "#fff",
                        color: active ? "#0A7C4E" : "#333",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                      title={s.description}
                    >
                      {active ? "✓ " : ""}
                      {s.name}
                    </button>
                  </form>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <form action="/api/admin/sim-run" method="POST">
                <input type="hidden" name="facility_id" value={c.facility_id} />
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: "#0D2137",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Run today
                </button>
              </form>
              <form action="/api/admin/sim-reset" method="POST">
                <input type="hidden" name="facility_id" value={c.facility_id} />
                <input type="hidden" name="seed_days" value="90" />
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: "#A32D2D",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Reset 90 days
                </button>
              </form>
            </div>
          </div>
        );
      })}

      <h2>Generation log (last 14 runs)</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: "#0D2137", color: "#fff" }}>
            <th style={{ padding: "8px 12px", textAlign: "left" }}>Date</th>
            <th style={{ padding: "8px 12px", textAlign: "left" }}>Mode</th>
            <th style={{ padding: "8px 12px", textAlign: "left" }}>
              Rows by module
            </th>
            <th style={{ padding: "8px 12px", textAlign: "left" }}>Duration</th>
            <th style={{ padding: "8px 12px", textAlign: "left" }}>Error</th>
          </tr>
        </thead>
        <tbody>
          {(logs ?? []).map((log, i) => (
            <tr
              key={log.id as string}
              style={{ background: i % 2 === 0 ? "#fff" : "#f5f5f3" }}
            >
              <td style={{ padding: "8px 12px" }}>
                {new Date(log.run_at as string).toLocaleString("en-UG")}
              </td>
              <td style={{ padding: "8px 12px" }}>{log.mode as string}</td>
              <td
                style={{
                  padding: "8px 12px",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(log.rows_by_module)}
              </td>
              <td style={{ padding: "8px 12px" }}>{log.duration_ms as number}ms</td>
              <td style={{ padding: "8px 12px", color: "#A32D2D" }}>
                {(log.error as string | null) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 32, fontSize: 12, color: "#666" }}>
        Cron / API: use{" "}
        <code>POST /api/sim/run</code> with{" "}
        <code>Authorization: Bearer …</code> (see{" "}
        <code>docs/CRON_VERIFICATION.md</code>).
      </p>
    </main>
  );
}
