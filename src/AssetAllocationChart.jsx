import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── ASSET ALLOCATION DONUT CHART ─────────────────────────────────────────────
// Uses recharts PieChart in "donut" configuration.
// Groups active investments by type and shows % allocation.
// ──────────────────────────────────────────────────────────────────────────────

const COLORS = [
  "#63cab7", "#7ec8e3", "#b8a9e8", "#f0c27a",
  "#a8e6cf", "#e8a598", "#9fcfb2", "#c8b8e8",
];

// Custom tooltip
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div
        style={{
          background: "#0f1520",
          border: "1px solid rgba(99,202,183,0.25)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontFamily: "'Courier New', monospace",
          fontSize: "0.72rem",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ color: d.payload.fill, marginBottom: "3px", letterSpacing: "0.08em" }}>
          {d.name}
        </div>
        <div style={{ color: "#eef4f0" }}>
          ${d.payload.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
          {d.payload.pct.toFixed(1)}%
        </div>
      </div>
    );
  }
  return null;
}

// Custom legend
function CustomLegend({ data }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        justifyContent: "center",
        paddingLeft: "8px",
      }}
    >
      {data.map((entry, i) => (
        <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              background: COLORS[i % COLORS.length],
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.68rem",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.05em",
            }}
          >
            {entry.name}
          </span>
          <span
            style={{
              marginLeft: "auto",
              color: "rgba(255,255,255,0.35)",
              fontSize: "0.65rem",
              fontFamily: "'Courier New', monospace",
            }}
          >
            {entry.pct.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AssetAllocationChart({ db }) {
  const data = useMemo(() => {
    if (!db) return [];

    const active = (db.investments || []).filter((inv) => inv.status !== "Closed");

    const groups = {};
    active.forEach((inv) => {
      const key = inv.type || "Uncategorized";
      const val = (parseFloat(inv.quantity) || 0) * (parseFloat(inv.currentPrice) || 0);
      groups[key] = (groups[key] || 0) + val;
    });

    const total = Object.values(groups).reduce((s, v) => s + v, 0);

    return Object.entries(groups)
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [db]);

  // No data state
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'Courier New', monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
        }}
      >
        No allocation data yet.
        <br />
        <span style={{ opacity: 0.6 }}>Add quantity & current price to investments.</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", height: "200px" }}>
      {/* Donut */}
      <ResponsiveContainer width="55%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ flex: 1, paddingRight: "4px" }}>
        <CustomLegend data={data} />
      </div>
    </div>
  );
}
