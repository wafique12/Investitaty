import { useMemo } from "react";

// ─── PORTFOLIO CARDS ───────────────────────────────────────────────────────────
// Groups active investments by their `type` field and renders a horizontal
// scrollable row of cards, each showing the portfolio's aggregate value.
// ──────────────────────────────────────────────────────────────────────────────

// Accent palette – one colour per portfolio type (cycles if more than 8)
const PALETTE = [
  { line: "#63cab7", glow: "rgba(99,202,183,0.12)", text: "#63cab7" },
  { line: "#7ec8e3", glow: "rgba(126,200,227,0.12)", text: "#7ec8e3" },
  { line: "#b8a9e8", glow: "rgba(184,169,232,0.12)", text: "#b8a9e8" },
  { line: "#f0c27a", glow: "rgba(240,194,122,0.12)", text: "#f0c27a" },
  { line: "#a8e6cf", glow: "rgba(168,230,207,0.12)", text: "#a8e6cf" },
  { line: "#e8a598", glow: "rgba(232,165,152,0.12)", text: "#e8a598" },
  { line: "#9fcfb2", glow: "rgba(159,207,178,0.12)", text: "#9fcfb2" },
  { line: "#c8b8e8", glow: "rgba(200,184,232,0.12)", text: "#c8b8e8" },
];

// Mini sparkline SVG drawn from the investement list (just count bars for now,
// can be wired to real price history later)
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      style={{
        height: "32px",
        display: "flex",
        alignItems: "flex-end",
        gap: "2px",
      }}
    >
      {[0.4, 0.6, 0.75, 0.55, 0.85, 0.7, 1.0].map((f, i) => (
        <div
          key={i}
          style={{
            width: "4px",
            height: `${Math.max(f * (pct / 100) * 32, 3)}px`,
            background: color,
            borderRadius: "2px",
            opacity: 0.5 + f * 0.5,
            transition: "height 0.6s ease",
          }}
        />
      ))}
    </div>
  );
}

function PortfolioCard({ type, investments, totalValue, allocationPct, colorSet, index }) {
  const count = investments.length;
  const dominantRisk = (() => {
    const freq = {};
    investments.forEach((inv) => {
      freq[inv.risk] = (freq[inv.risk] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  })();

  return (
    <div
      style={{
        minWidth: "200px",
        maxWidth: "220px",
        flexShrink: 0,
        padding: "20px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${colorSet.line}`,
        borderRadius: "0 12px 12px 0",
        cursor: "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        animation: `cardSlideIn 0.45s ease both`,
        animationDelay: `${index * 0.07}s`,
        boxShadow: `inset 0 0 0 0 ${colorSet.glow}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.3), inset 0 0 40px ${colorSet.glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `inset 0 0 0 0 ${colorSet.glow}`;
      }}
    >
      {/* Type label */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            color: colorSet.text,
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {type}
        </span>
        <span
          style={{
            background: `${colorSet.glow}`,
            border: `1px solid ${colorSet.line}33`,
            borderRadius: "100px",
            padding: "1px 7px",
            fontSize: "0.6rem",
            color: colorSet.text,
            fontFamily: "'Courier New', monospace",
            opacity: 0.8,
          }}
        >
          {count} asset{count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          color: "#eef4f0",
          fontSize: "1.25rem",
          fontWeight: "300",
          fontFamily: "'Georgia', serif",
          marginBottom: "4px",
          letterSpacing: "-0.01em",
        }}
      >
        ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      <div
        style={{
          color: "rgba(255,255,255,0.28)",
          fontSize: "0.65rem",
          fontFamily: "'Courier New', monospace",
          marginBottom: "14px",
        }}
      >
        {allocationPct.toFixed(1)}% of portfolio
      </div>

      {/* Mini bar chart */}
      <MiniBar value={allocationPct} max={100} color={colorSet.line} />

      {/* Risk badge */}
      <div style={{ marginTop: "10px" }}>
        <span
          style={{
            fontSize: "0.6rem",
            fontFamily: "'Courier New', monospace",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.08em",
          }}
        >
          Dominant risk: {dominantRisk}
        </span>
      </div>
    </div>
  );
}

export default function PortfolioCards({ db }) {
  const portfolios = useMemo(() => {
    if (!db) return [];

    const activeInvestments = (db.investments || []).filter(
      (inv) => inv.status !== "Closed"
    );

    // Group by type
    const groups = {};
    activeInvestments.forEach((inv) => {
      const key = inv.type || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    });

    // Calculate value per group
    const entries = Object.entries(groups).map(([type, investments]) => {
      const totalValue = investments.reduce((sum, inv) => {
        const qty = parseFloat(inv.quantity) || 0;
        const price = parseFloat(inv.currentPrice) || 0;
        return sum + qty * price;
      }, 0);
      return { type, investments, totalValue };
    });

    // Sort by value desc
    entries.sort((a, b) => b.totalValue - a.totalValue);

    // Calculate allocation %
    const grandTotal = entries.reduce((s, e) => s + e.totalValue, 0);
    return entries.map((e) => ({
      ...e,
      allocationPct: grandTotal > 0 ? (e.totalValue / grandTotal) * 100 : 0,
    }));
  }, [db]);

  if (portfolios.length === 0) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          border: "1px dashed rgba(99,202,183,0.12)",
          borderRadius: "12px",
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'Courier New', monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
        }}
      >
        No active investments yet. Add investments with quantity & price to see portfolio cards.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            color: "rgba(99,202,183,0.5)",
            fontSize: "0.62rem",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontFamily: "'Courier New', monospace",
          }}
        >
          Portfolios
        </span>
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "rgba(99,202,183,0.08)",
          }}
        />
        <span
          style={{
            color: "rgba(255,255,255,0.2)",
            fontSize: "0.62rem",
            fontFamily: "'Courier New', monospace",
          }}
        >
          ← scroll →
        </span>
      </div>

      {/* Scrollable row */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(99,202,183,0.2) transparent",
        }}
      >
        {portfolios.map((p, i) => (
          <PortfolioCard
            key={p.type}
            {...p}
            colorSet={PALETTE[i % PALETTE.length]}
            index={i}
          />
        ))}
      </div>
    </>
  );
}
