import { useContext } from "react";

// ─── Dashboard.js ─────────────────────────────────────────────────────────────
// Main dashboard page. Consumes InvestitatyContext (AppContext) and composes
// the four Sprint-2 widget components. This file has NO Google Drive / auth
// logic — it only reads `db` from context and passes it down as props.
//
// Import tree:
//   Dashboard.js
//     ├── KPIHeader.jsx
//     ├── PortfolioCards.jsx
//     ├── AssetAllocationChart.jsx   ← uses recharts
//     ├── UpcomingCashFlow.jsx
//     └── FundingPerformance.jsx
// ─────────────────────────────────────────────────────────────────────────────

import KPIHeader from "./KPIHeader";
import PortfolioCards from "./PortfolioCards";
import AssetAllocationChart from "./AssetAllocationChart";
import UpcomingCashFlow from "./UpcomingCashFlow";
import FundingPerformance from "./FundingPerformance";

// ─── Shared panel wrapper ─────────────────────────────────────────────────────
function Panel({ title, children, style = {} }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(99,202,183,0.09)",
        borderRadius: "12px",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "14px 20px 12px",
          borderBottom: "1px solid rgba(99,202,183,0.07)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            color: "rgba(99,202,183,0.55)",
            fontSize: "0.62rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {title}
        </span>
      </div>

      {/* Panel body */}
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ db }) {
  if (!db) return null;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        animation: "dashboardFadeIn 0.35s ease both",
      }}
    >
      {/* ── Page heading ─────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            color: "rgba(255,255,255,0.22)",
            fontSize: "0.65rem",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          {greeting}
        </div>
        <h2
          style={{
            color: "#eef4f0",
            fontSize: "1.4rem",
            fontWeight: "300",
            letterSpacing: "0.06em",
            fontFamily: "'Georgia', 'Times New Roman', serif",
            margin: 0,
          }}
        >
          Dashboard
        </h2>
      </div>

      {/* ── KPI Header ───────────────────────────────────────────────────── */}
      <KPIHeader db={db} />

      {/* ── Portfolio Cards ──────────────────────────────────────────────── */}
      <PortfolioCards db={db} />

      {/* ── Quick Stats row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
        }}
      >
        {/* Asset Allocation */}
        <Panel title="Asset Allocation">
          <AssetAllocationChart db={db} />
        </Panel>

        {/* Upcoming Cash Flow */}
        <Panel title="Upcoming Cash Flow">
          <UpcomingCashFlow db={db} />
        </Panel>

        {/* Funding Performance */}
        <Panel title="Funding Performance">
          <FundingPerformance db={db} />
        </Panel>
      </div>

      <style>{`
        @keyframes dashboardFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (max-width: 900px) {
          .qs-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
