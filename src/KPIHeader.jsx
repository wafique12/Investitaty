import { useMemo } from "react";

// ─── KPI HEADER ────────────────────────────────────────────────────────────────
// Consumes db from InvestitatyContext (passed as prop to avoid coupling).
// Calculates:
//   • Total Portfolio Value = Σ (quantity * currentPrice) for active investments
//   • Total Net Profit = Σ dividends.amount + Σ (currentPrice - purchasePrice) * quantity
// ──────────────────────────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 2 }) {
  const formatted = Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

function KPICard({ label, value, sub, trend, accent, index }) {
  const isPositive = trend >= 0;
  return (
    <div
      style={{
        flex: "1",
        minWidth: "180px",
        padding: "22px 24px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(99,202,183,0.1)",
        borderTop: `2px solid ${accent}`,
        borderRadius: "0 0 12px 12px",
        position: "relative",
        overflow: "hidden",
        animation: `kpiFadeIn 0.4s ease both`,
        animationDelay: `${index * 0.08}s`,
      }}
    >
      {/* Subtle glow blob */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "80px",
          height: "80px",
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          color: "rgba(255,255,255,0.38)",
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "'Courier New', monospace",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#eef4f0",
          fontSize: "1.65rem",
          fontWeight: "300",
          fontFamily: "'Georgia', 'Times New Roman', serif",
          lineHeight: 1,
          marginBottom: "8px",
          letterSpacing: "-0.01em",
        }}
      >
        <AnimatedNumber value={value} prefix="$" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {trend !== undefined && (
          <span
            style={{
              fontSize: "0.68rem",
              fontFamily: "'Courier New', monospace",
              color: isPositive ? "#63cab7" : "#e07070",
              background: isPositive
                ? "rgba(99,202,183,0.1)"
                : "rgba(224,112,112,0.1)",
              border: `1px solid ${isPositive ? "rgba(99,202,183,0.25)" : "rgba(224,112,112,0.25)"}`,
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            {isPositive ? "▲" : "▼"} $
            {Math.abs(trend).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
        {sub && (
          <span
            style={{
              color: "rgba(255,255,255,0.28)",
              fontSize: "0.68rem",
              fontFamily: "'Courier New', monospace",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KPIHeader({ db }) {
  const kpis = useMemo(() => {
    if (!db) return { portfolioValue: 0, totalCost: 0, dividendIncome: 0, capitalGains: 0, netProfit: 0, activeCount: 0 };

    const activeInvestments = (db.investments || []).filter(
      (inv) => inv.status !== "Closed"
    );

    // Portfolio Value = Σ quantity * currentPrice (fields added by user)
    const portfolioValue = activeInvestments.reduce((sum, inv) => {
      const qty = parseFloat(inv.quantity) || 0;
      const price = parseFloat(inv.currentPrice) || 0;
      return sum + qty * price;
    }, 0);

    // Total cost basis = Σ quantity * purchasePrice
    const totalCost = activeInvestments.reduce((sum, inv) => {
      const qty = parseFloat(inv.quantity) || 0;
      const purchase = parseFloat(inv.purchasePrice) || 0;
      return sum + qty * purchase;
    }, 0);

    // Capital gains = portfolioValue - totalCost
    const capitalGains = portfolioValue - totalCost;

    // Dividend income = Σ all dividend amounts
    const dividendIncome = (db.dividends || []).reduce(
      (sum, d) => sum + (parseFloat(d.amount) || 0),
      0
    );

    // Net Profit = dividends + capital gains
    const netProfit = dividendIncome + capitalGains;

    return {
      portfolioValue,
      totalCost,
      dividendIncome,
      capitalGains,
      netProfit,
      activeCount: activeInvestments.length,
    };
  }, [db]);

  const cards = [
    {
      label: "Total Portfolio Value",
      value: kpis.portfolioValue,
      sub: `${kpis.activeCount} active positions`,
      trend: undefined,
      accent: "#63cab7",
    },
    {
      label: "Total Net Profit",
      value: kpis.netProfit,
      sub: "dividends + capital gains",
      trend: kpis.netProfit,
      accent: kpis.netProfit >= 0 ? "#a8e6cf" : "#e07070",
    },
    {
      label: "Dividend Income",
      value: kpis.dividendIncome,
      sub: `${(db?.dividends || []).length} payments`,
      trend: undefined,
      accent: "#7ec8e3",
    },
    {
      label: "Capital Gains",
      value: kpis.capitalGains,
      sub: "unrealised",
      trend: kpis.capitalGains,
      accent: kpis.capitalGains >= 0 ? "#b8d4a8" : "#e07070",
    },
  ];

  return (
    <>
      <style>{`
        @keyframes kpiFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
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
          Portfolio Overview
        </span>
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "rgba(99,202,183,0.08)",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
        {cards.map((card, i) => (
          <KPICard key={card.label} {...card} index={i} />
        ))}
      </div>
    </>
  );
}
