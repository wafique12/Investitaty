import { useMemo } from "react";

// ─── FUNDING PERFORMANCE ───────────────────────────────────────────────────────
// For each funding source, shows:
//   • Total capital deployed (sum of funding.amount for that source)
//   • Total profit attributable (dividends from investments funded by that source)
//   • A progress bar showing profit / capital ratio
// ──────────────────────────────────────────────────────────────────────────────

const SOURCE_COLORS = {
  Brokerage: "#63cab7",
  Bank: "#7ec8e3",
  Exchange: "#b8a9e8",
  Direct: "#f0c27a",
  _default: "#9fcfb2",
};

function ProgressBar({ pct, color, animated = true }) {
  return (
    <div
      style={{
        width: "100%",
        height: "5px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "100px",
        overflow: "hidden",
        marginTop: "6px",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(pct, 100)}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: "100px",
          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: `0 0 6px ${color}66`,
        }}
      />
    </div>
  );
}

export default function FundingPerformance({ db }) {
  const sources = useMemo(() => {
    if (!db) return [];

    // Capital per source
    const capital = {};
    (db.funding || []).forEach((f) => {
      const src = f.source || f.investmentName || "Unknown";
      capital[src] = (capital[src] || 0) + (parseFloat(f.amount) || 0);
    });

    // Build a lookup: investmentName → source (from funding records)
    const invSource = {};
    (db.funding || []).forEach((f) => {
      if (f.investmentName && f.source) {
        invSource[f.investmentName] = f.source;
      }
    });

    // Profit per source: attribute dividends by source
    const profit = {};
    (db.dividends || []).forEach((d) => {
      const src = invSource[d.investmentName] || d.source || "Unknown";
      profit[src] = (profit[src] || 0) + (parseFloat(d.amount) || 0);
    });

    // Merge and sort by capital
    const allSources = new Set([...Object.keys(capital), ...Object.keys(profit)]);

    return Array.from(allSources)
      .map((src) => ({
        source: src,
        capital: capital[src] || 0,
        profit: profit[src] || 0,
        roi: capital[src] > 0 ? ((profit[src] || 0) / capital[src]) * 100 : 0,
      }))
      .filter((s) => s.capital > 0)
      .sort((a, b) => b.capital - a.capital);
  }, [db]);

  if (sources.length === 0) {
    return (
      <div
        style={{
          padding: "28px 0",
          textAlign: "center",
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'Courier New', monospace",
          fontSize: "0.72rem",
          letterSpacing: "0.08em",
        }}
      >
        No funding records yet.
      </div>
    );
  }

  const maxCapital = Math.max(...sources.map((s) => s.capital));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {sources.map((s, i) => {
        const color = SOURCE_COLORS[s.source] || SOURCE_COLORS._default;
        const capitalPct = maxCapital > 0 ? (s.capital / maxCapital) * 100 : 0;

        return (
          <div
            key={s.source}
            style={{
              animation: `fundingIn 0.35s ease both`,
              animationDelay: `${i * 0.06}s`,
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: "0.75rem",
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.source}
                </span>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {/* Profit */}
                <span
                  style={{
                    color: s.profit > 0 ? "#a8e6cf" : "rgba(255,255,255,0.3)",
                    fontSize: "0.7rem",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  +$
                  {s.profit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>

                {/* ROI badge */}
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontFamily: "'Courier New', monospace",
                    color: s.roi > 0 ? "#63cab7" : "rgba(255,255,255,0.25)",
                    background:
                      s.roi > 0
                        ? "rgba(99,202,183,0.08)"
                        : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(99,202,183,0.15)",
                    borderRadius: "4px",
                    padding: "1px 5px",
                  }}
                >
                  {s.roi.toFixed(1)}% ROI
                </span>
              </div>
            </div>

            {/* Capital label + bar */}
            <div
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "0.63rem",
                fontFamily: "'Courier New', monospace",
                marginBottom: "3px",
              }}
            >
              $
              {s.capital.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              deployed
            </div>
            <ProgressBar pct={capitalPct} color={color} />
          </div>
        );
      })}

      <style>{`
        @keyframes fundingIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
