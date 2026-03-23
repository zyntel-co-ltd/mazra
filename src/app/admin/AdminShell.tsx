"use client";

import { useEffect, useState } from "react";
import type { DatasetMode, ModeConfig } from "@/lib/sim/modes/types";
import type { SimConfigRow } from "@/lib/sim/sim-config";

const MODE_COLORS: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  baseline: {
    bg: "#f0faf6",
    border: "#0A7C4E",
    text: "#0A7C4E",
    dot: "#0A7C4E",
  },
  high_volume: {
    bg: "#f0f9ff",
    border: "#0891B2",
    text: "#0891B2",
    dot: "#0891B2",
  },
  critical_failure: {
    bg: "#fff5f5",
    border: "#DC2626",
    text: "#DC2626",
    dot: "#DC2626",
  },
  understaffed: {
    bg: "#fffbeb",
    border: "#D97706",
    text: "#D97706",
    dot: "#D97706",
  },
  poor_discipline: {
    bg: "#faf5ff",
    border: "#7C3AED",
    text: "#7C3AED",
    dot: "#7C3AED",
  },
  recovery: {
    bg: "#f0f4ff",
    border: "#0D2137",
    text: "#0D2137",
    dot: "#0D2137",
  },
};

type ModeMeta = { days?: number; counts?: Record<string, number> } | null;

interface GenerationLogRow {
  id: string;
  run_at: string;
  mode?: string | null;
  rows_by_module?: Record<string, number> | null;
  duration_ms?: number | null;
  error?: string | null;
}

interface Props {
  configs: SimConfigRow[];
  logs: GenerationLogRow[];
  modesWithMeta: { key: DatasetMode; cfg: ModeConfig; meta: ModeMeta }[];
  flash: Record<string, string>;
}

const simSecret =
  typeof process.env.NEXT_PUBLIC_MAZRA_SIM_SECRET === "string"
    ? process.env.NEXT_PUBLIC_MAZRA_SIM_SECRET
    : "";

export function AdminShell({ configs, logs, modesWithMeta, flash }: Props) {
  const [switching, setSwitching] = useState<DatasetMode | null>(null);
  const [progress, setProgress] = useState<{
    table: string;
    loaded: number;
    total: number;
  } | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    () => configs[0]?.facility_id ?? ""
  );

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cfg =
    configs.find((c) => c.facility_id === selectedFacilityId) ?? configs[0];

  async function handleSwitch(facilityId: string, mode: DatasetMode) {
    if (!simSecret.trim()) {
      window.alert(
        "Missing NEXT_PUBLIC_MAZRA_SIM_SECRET — set it in Vercel to match MAZRA_SIM_SECRET (admin is behind Zero Trust)."
      );
      return;
    }

    setSwitching(mode);
    setProgress(null);

    try {
      const res = await fetch("/api/sim/switch-mode", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${simSecret.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode, facilityId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg =
          typeof errJson === "object" && errJson && "error" in errJson
            ? String((errJson as { error: string }).error)
            : res.statusText;
        window.alert(`Switch failed: ${msg}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as {
              step?: string;
              table?: string;
              loaded?: number;
              total?: number;
              message?: string;
            };
            if (event.step === "progress" && event.table != null) {
              setProgress({
                table: event.table,
                loaded: Number(event.loaded ?? 0),
                total: Number(event.total ?? 0),
              });
            }
            if (event.step === "done") {
              window.location.reload();
              return;
            }
            if (event.step === "error") {
              window.alert(event.message ?? "Unknown error");
              return;
            }
          } catch {
            /* ignore partial JSON */
          }
        }
      }

      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim()) as { step?: string };
          if (event.step === "done") window.location.reload();
        } catch {
          /* noop */
        }
      }
    } finally {
      setSwitching(null);
      setProgress(null);
    }
  }

  const activeMode = (cfg?.active_mode ?? "baseline") as DatasetMode;
  const activeModeColors =
    MODE_COLORS[activeMode] ?? MODE_COLORS.baseline;
  const lastTickAt = cfg?.last_tick_at
    ? new Date(cfg.last_tick_at)
    : null;
  const tickAgoSeconds = lastTickAt
    ? Math.floor((tick - lastTickAt.getTime()) / 1000)
    : null;
  const switchedAt = cfg?.mode_switched_at
    ? new Date(cfg.mode_switched_at)
    : null;

  const flashErr = flash.err ? decodeURIComponent(flash.err) : null;
  const flashMsg =
    flash.switched === "1"
      ? "Mode switched successfully"
      : flash.reset === "1"
        ? "Data reset complete"
        : flashErr
          ? `Error: ${flashErr}`
          : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        color: "#e8edf5",
        fontFamily: '"DM Mono", "JetBrains Mono", "Fira Code", monospace',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mode-card {
          position: relative;
          border-radius: 12px;
          padding: 20px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          overflow: hidden;
        }
        .mode-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .mode-card.active { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }
        .mode-card.switching { opacity: 0.6; pointer-events: none; }

        .switch-btn {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: opacity 0.15s;
          margin-top: 14px;
        }
        .switch-btn:hover { opacity: 0.85; }
        .switch-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .log-row { transition: background 0.1s; }
        .log-row:hover { background: rgba(255,255,255,0.04) !important; }

        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .progress-bar-inner {
          transition: width 0.3s ease;
        }

        .flash-bar {
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {flashMsg ? (
        <div
          className="flash-bar"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: "12px 24px",
            background: flashErr ? "#7f1d1d" : "#064e3b",
            color: "#fff",
            fontSize: 13,
            textAlign: "center",
            fontFamily: '"DM Mono", monospace',
          }}
        >
          {flashMsg}
        </div>
      ) : null}

      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          height: 56,
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            MAZRA
          </span>
          <span style={{ color: "#0A7C4E", fontSize: 14 }}>مزرعة</span>
          <span
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 12,
              marginLeft: 4,
            }}
          >
            control panel
          </span>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <div
              className="pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  tickAgoSeconds !== null && tickAgoSeconds < 120
                    ? "#0A7C4E"
                    : "#666",
              }}
            />
            {tickAgoSeconds !== null
              ? `tick ${tickAgoSeconds}s ago`
              : "tick never"}
          </div>

          <a
            href="https://app.zyntel.net"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
              padding: "6px 12px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              letterSpacing: "0.04em",
            }}
          >
            VIEW KANTA →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>
        {configs.length > 1 ? (
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: 8,
              }}
            >
              FACILITY
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#e8edf5",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "8px 12px",
                fontFamily: "inherit",
                fontSize: 13,
                minWidth: 280,
              }}
            >
              {configs.map((c) => (
                <option key={c.facility_id} value={c.facility_id}>
                  {c.hospital_name} — {c.facility_id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {cfg ? (
          <div style={{ marginBottom: 48 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  ACTIVE FACILITY
                </div>
                <h1
                  style={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize: 32,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                  }}
                >
                  {cfg.hospital_name}
                </h1>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: '"DM Mono", monospace',
                  }}
                >
                  {cfg.facility_id}
                </div>
              </div>

              <div
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: `1px solid ${activeModeColors.border}40`,
                  background: `${activeModeColors.border}10`,
                  minWidth: 220,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  ACTIVE MODE
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: activeModeColors.dot,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: '"Syne", sans-serif',
                      fontWeight: 700,
                      fontSize: 18,
                      color: "#fff",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {modesWithMeta.find((m) => m.key === activeMode)?.cfg
                      .label ?? activeMode}
                  </span>
                </div>
                {switchedAt ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.25)",
                      marginTop: 8,
                    }}
                  >
                    switched {switchedAt.toLocaleString("en-UG")}
                  </div>
                ) : null}
              </div>
            </div>

            {switching || progress ? (
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: 8,
                  }}
                >
                  <span>Loading {switching} dataset…</span>
                  {progress ? (
                    <span>
                      {progress.table} — {progress.loaded}/{progress.total}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    height: 3,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="progress-bar-inner"
                    style={{
                      height: "100%",
                      background:
                        MODE_COLORS[switching ?? "baseline"]?.dot ?? "#0A7C4E",
                      width: progress
                        ? `${Math.round(
                            (progress.loaded / Math.max(progress.total, 1)) *
                              100
                          )}%`
                        : "15%",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              marginBottom: 48,
              fontSize: 14,
            }}
          >
            No enabled <code>sim_config</code> rows — add one in Mazra Supabase.
          </p>
        )}

        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
              marginBottom: 20,
            }}
          >
            DATASET MODES
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {modesWithMeta.map(({ key, cfg: modeCfg, meta }) => {
              const colors = MODE_COLORS[key] ?? MODE_COLORS.baseline;
              const isActive = key === activeMode;
              const isBuilt = meta !== null;
              const isSwitching = switching === key;
              const totalRows = meta?.counts
                ? Object.values(meta.counts).reduce((a, b) => a + b, 0)
                : 0;
              const breachDisplayPct = Math.round(
                (modeCfg.tat_breach_rate_end ?? modeCfg.tat_breach_rate) * 100
              );

              return (
                <div
                  key={key}
                  className={`mode-card${isActive ? " active" : ""}${isSwitching ? " switching" : ""}`}
                  style={{
                    borderColor: isActive ? `${colors.border}60` : undefined,
                    background: isActive ? `${colors.border}10` : undefined,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: isBuilt
                        ? colors.dot
                        : "rgba(255,255,255,0.08)",
                      borderRadius: "12px 12px 0 0",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: colors.dot,
                          opacity: isBuilt ? 1 : 0.3,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: '"Syne", sans-serif',
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#fff",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {modeCfg.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {isActive ? (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 20,
                            border: `1px solid ${colors.border}`,
                            color: colors.dot,
                            letterSpacing: "0.08em",
                          }}
                        >
                          ACTIVE
                        </span>
                      ) : null}
                      {isBuilt ? (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#0A7C4E",
                            letterSpacing: "0.04em",
                          }}
                        >
                          ✓ READY
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.2)",
                          }}
                        >
                          NOT BUILT
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.45)",
                      lineHeight: 1.6,
                      marginBottom: 14,
                    }}
                  >
                    {modeCfg.description}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      marginBottom: isActive || !isBuilt ? 0 : 4,
                    }}
                  >
                    {[
                      {
                        label: "patients/day",
                        value: isBuilt
                          ? `${modeCfg.daily_min}–${modeCfg.daily_max}`
                          : "—",
                      },
                      {
                        label: "breach rate",
                        value: isBuilt ? `${breachDisplayPct}%` : "—",
                      },
                      {
                        label: "total rows",
                        value: isBuilt ? totalRows.toLocaleString() : "—",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: 6,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: isBuilt ? "#fff" : "rgba(255,255,255,0.2)",
                          }}
                        >
                          {stat.value}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.25)",
                            marginTop: 2,
                          }}
                        >
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isActive && isBuilt && cfg ? (
                    <button
                      type="button"
                      className="switch-btn"
                      disabled={!!switching}
                      onClick={() => handleSwitch(cfg.facility_id, key)}
                      style={{ background: colors.dot, color: "#fff" }}
                    >
                      {isSwitching
                        ? "SWITCHING…"
                        : `SWITCH TO ${modeCfg.label.toUpperCase()}`}
                    </button>
                  ) : null}

                  {!isBuilt ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "rgba(255,255,255,0.2)",
                        fontFamily: '"DM Mono", monospace',
                      }}
                    >
                      npm run build:dataset -- {key} 180
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {cfg ? (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 48,
              flexWrap: "wrap",
            }}
          >
            <form action="/api/admin/sim-reset" method="POST">
              <input type="hidden" name="facility_id" value={cfg.facility_id} />
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#DC2626",
                  border: "1px solid #DC262640",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: '"DM Mono", monospace',
                  letterSpacing: "0.05em",
                }}
              >
                RESET CURRENT MODE
              </button>
            </form>

            <form action="/api/admin/sim-run" method="POST">
              <input type="hidden" name="facility_id" value={cfg.facility_id} />
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: '"DM Mono", monospace',
                  letterSpacing: "0.05em",
                }}
              >
                RUN TODAY (LEGACY)
              </button>
            </form>
          </div>
        ) : null}

        <div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
              marginBottom: 16,
            }}
          >
            GENERATION LOG
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 80px 1fr 80px 140px",
                padding: "10px 16px",
                background: "rgba(255,255,255,0.04)",
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.08em",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {["TIME", "MODE", "ROWS BY MODULE", "MS", "STATUS"].map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>

            {logs.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.2)",
                }}
              >
                No generation runs yet
              </div>
            ) : null}

            {logs.map((log, i) => {
              const hasError = Boolean(log.error);
              const modules = log.rows_by_module ?? {};
              const totalRows = Object.values(modules).reduce((a, b) => a + b, 0);

              return (
                <div
                  key={log.id}
                  className="log-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 80px 1fr 80px 140px",
                    padding: "12px 16px",
                    fontSize: 12,
                    borderBottom:
                      i < logs.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    background: hasError
                      ? "rgba(220,38,38,0.05)"
                      : "transparent",
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  >
                    {new Date(log.run_at).toLocaleString("en-UG", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div
                    style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  >
                    {log.mode ?? "—"}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
                  >
                    {Object.entries(modules)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => `${k}:${v}`)
                      .join("  ")}
                    {totalRows > 0 ? (
                      <span style={{ color: "#0A7C4E", marginLeft: 8 }}>
                        ({totalRows.toLocaleString()} total)
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  >
                    {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                  </div>
                  <div>
                    {hasError ? (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          background: "rgba(220,38,38,0.2)",
                          color: "#fca5a5",
                          borderRadius: 4,
                        }}
                        title={log.error ?? undefined}
                      >
                        ERROR
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          background: "rgba(10,124,78,0.2)",
                          color: "#6ee7b7",
                          borderRadius: 4,
                        }}
                      >
                        OK
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          <span>Mazra — Zyntel Limited · Kampala, Uganda</span>
          <span>mazra.dev</span>
        </div>
      </div>
    </div>
  );
}
