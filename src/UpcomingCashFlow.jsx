import { useMemo } from "react";

// ─── UPCOMING CASH FLOW ────────────────────────────────────────────────────────
// Filters dividends where status === "scheduled" and sorts by nearest dueDate.
// ──────────────────────────────────────────────────────────────────────────────

function DaysAway({ dueDate }) {
  const today = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  let color, label;
  if (diff < 0) {
    color = "rgba(224,112,112,0.8)";
    label = "Overdue";
  } else if (diff === 0) {
    color = "#f0c27a";
    label = "Today";
  } else if (diff <= 7) {
    color = "#f0c27a";
    label = `${diff}d`;
  } else if (diff <= 30) {
    color = "#63cab7";
    label = `${diff}d`;
  } else {
    color = "rgba(255,255,255,0.3)";
    label = `${diff}d`;
  }

  return (
    <span
      style={{
        fontSize: "0.65rem",
        fontFamily: "'Courier New', monospace",
        color,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        borderRadius: "4px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function UpcomingCashFlow({ db }) {
  const scheduled = useMemo(() => {
    if (!db) return [];
    return (db.dividends || [])
      .filter((d) => d.status === "scheduled" && d.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);
  }, [db]);

  if (scheduled.length === 0) {
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
        No scheduled dividends.
        <br />
        <span style={{ opacity: 0.6 }}>
          Set{" "}
          <code
            style={{
              background: "rgba(99,202,183,0.08)",
              padding: "0 4px",
              borderRadius: "3px",
              color: "rgba(99,202,183,0.6)",
            }}
          >
            status: "scheduled"
          </code>{" "}
          + dueDate.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {scheduled.map((d, i) => (
        <div
          key={d.id || i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom:
              i < scheduled.length - 1
                ? "1px solid rgba(255,255,255,0.04)"
                : "none",
            animation: `cashFlowIn 0.3s ease both`,
            animationDelay: `${i * 0.05}s`,
          }}
        >
          {/* Left: investment name + date */}
          <div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.78rem",
                fontFamily: "'Courier New', monospace",
                marginBottom: "2px",
              }}
            >
              {d.investmentName || "Unknown"}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.28)",
                fontSize: "0.65rem",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {d.dueDate}
            </div>
          </div>

          {/* Right: amount + days away */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                color: "#a8e6cf",
                fontSize: "0.85rem",
                fontFamily: "'Georgia', serif",
                fontWeight: "300",
              }}
            >
              +$
              {parseFloat(d.amount || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
            <DaysAway dueDate={d.dueDate} />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes cashFlowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
