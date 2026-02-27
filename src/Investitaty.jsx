import { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  X as LucideX, Trash2, Check, ExternalLink, Edit3,
  MoreVertical, Zap, BookOpen, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const CLIENT_ID = "535223974831-1h74evq1hj8o493p66e6090h47ttrael.apps.googleusercontent.com";
const API_KEY = "AIzaSyDx1Oy9_0OwRa_CMKNL8wzxdfVOl5S3-gQ";

//const SCOPES = "https://www.googleapis.com/auth/drive.file";
const SCOPES = "https://www.googleapis.com/auth/userinfo.profile";
const DB_FILENAME = "investitaty_db.json";

const INITIAL_SCHEMA = {
  settings: {
    types: ["Stocks", "ETF", "Real Estate", "Crypto", "Bonds", "Commodities"],
    risks: ["Low", "Medium", "High", "Speculative"],
    sources: ["Brokerage", "Bank", "Exchange", "Direct"],
  },
  investments: [],
  funding: [],
  dividends: [],
};

// ─── CONTEXT ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

function useApp() {
  return useContext(AppContext);
}

// ─── GOOGLE DRIVE SERVICE ──────────────────────────────────────────────────────
async function findOrCreateDB(token) {
  // Search for existing file
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DB_FILENAME}'+and+trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    const fileId = searchData.files[0].id;
    // Read existing file
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await fileRes.json();
    return { fileId, data };
  }

  // Create new file
  const boundary = "investitaty_boundary";
  const metadata = JSON.stringify({ name: DB_FILENAME, mimeType: "application/json" });
  const body_content = JSON.stringify(INITIAL_SCHEMA);

  const multipart = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    body_content,
    `--${boundary}--`,
  ].join("\r\n");

  const createRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    }
  );
  const created = await createRes.json();
  return { fileId: created.id, data: INITIAL_SCHEMA };
}

async function saveDB(token, fileId, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: blob,
    }
  );
}

// ─── AUTH HOOK ─────────────────────────────────────────────────────────────────
function useGoogleAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  // gapiReady tracks both scripts fully loaded
  const [gapiReady, setGapiReady] = useState(false);
  const tokenClientRef = useRef(null);
  const authTimeoutRef = useRef(null);

  useEffect(() => {
    let gisLoaded = false;
    let gapiLoaded = false;

    const trySetReady = () => {
      if (gisLoaded && gapiLoaded) setGapiReady(true);
    };

    // ── GIS script ──────────────────────────────────────────────────────
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => { gisLoaded = true; trySetReady(); };
    gisScript.onerror = () => setAuthError("Failed to load Google Identity Services.");
    document.head.appendChild(gisScript);

    // ── GAPI script ─────────────────────────────────────────────────────
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [] });
        } catch (_) {
          // Non-fatal — we only need Drive REST calls, not gapi discovery
        }
        gapiLoaded = true;
        trySetReady();
      });
    };
    gapiScript.onerror = () => setAuthError("Failed to load Google API.");
    document.head.appendChild(gapiScript);

    return () => {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  const signIn = useCallback(() => {
    console.log('start usecallback');
    if (!gapiReady) return;
    setAuthLoading(true);
    setAuthError(null);

    // Safety valve: if callback never fires within 30 s, unlock the button
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      setAuthLoading(false);
      setAuthError("Sign-in timed out. Please try again.");
    }, 30000);
console.log('tokenClientRef.current',tokenClientRef.current);
console.log("window.google?", window.google);
console.log("window.google?.accounts?", window.google?.accounts);
console.log("window.google?.accounts?.oauth2?", window.google?.accounts?.oauth2);
    // Build the token client once — reuse on subsequent clicks
    if (!tokenClientRef.current) {
      
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: [
          SCOPES,
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),

        // KEY FIX: Use empty string, NOT "consent".
        // "consent" forces the full OAuth screen every time and can silently
        // fail inside sandboxed iframes (deployed web apps). Empty string lets
        // Google choose — shows consent only when truly needed.
        prompt: "",
        
        callback: async (response) => {
          console.log("AUTH CALLBACK HIT", response);
          // Always clear the safety timeout first
          if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);

          if (response.error) {
            setAuthLoading(false);
            setAuthError(`Auth error: ${response.error}`);
            return;
          }

          const accessToken = response.access_token;

          // Fetch user info — wrapped in try/catch so a network blip
          // does NOT leave the button stuck on "Connecting..."
          try {
            const userRes = await fetch(
              "https://www.googleapis.com/oauth2/v3/userinfo",
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!userRes.ok) throw new Error(`userinfo ${userRes.status}`);
            const userInfo = await userRes.json();
            // Set token AFTER we have user info so AppContent transitions
            // atomically: both checks (user && token) become true together
            setUser(userInfo);
            setToken(accessToken);
          } catch (err) {
            setAuthError("Signed in but could not fetch profile. Check API key.");
            // Still set token so Drive sync can work even without profile
            setToken(accessToken);
          } finally {
            setAuthLoading(false);
          }
        },
      });
    }

    // Re-request token; prompt="" means no forced re-consent
    try {
  tokenClientRef.current.requestAccessToken();
  console.log("requestAccessToken called");
} catch (e) {
  console.log("requestAccessToken error", e);
}
  }, [gapiReady]);

  const signOut = useCallback(() => {
    if (token) {
      try { window.google.accounts.oauth2.revoke(token); } catch(_) {}
    }
    setUser(null);
    setToken(null);
    setAuthError(null);
    tokenClientRef.current = null; // force fresh client on next sign-in
  }, [token]);

  return { user, token, authLoading, authError, gapiReady, signIn, signOut };
}

// ─── APP PROVIDER ──────────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const auth = useGoogleAuth();
  const [db, setDb] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const saveTimerRef = useRef(null);

  // Load DB once we have a token
  useEffect(() => {
    if (!auth.token) return;
    setDbLoading(true);
    findOrCreateDB(auth.token)
      .then(({ fileId: fid, data }) => {
        setFileId(fid);
        setDb(data);
        setDbLoading(false);
      })
      .catch(() => {
        setSyncError("Failed to access Google Drive. Please try again.");
        setDbLoading(false);
      });
  }, [auth.token]);

  // Auto-save with debounce
  const updateDb = useCallback((updater) => {
    setDb((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!auth.token || !fileId) return;
        setSyncing(true);
        try {
          await saveDB(auth.token, fileId, next);
        } catch {
          setSyncError("Sync failed. Changes may not be saved.");
        } finally {
          setSyncing(false);
        }
      }, 800);
      return next;
    });
  }, [auth.token, fileId]);

  // ── Named CRUD helpers (Sprint 3) ──────────────────────────────────────────
  // All helpers call updateDb, which debounces the Drive PATCH automatically.

  /** Soft-delete: sets is_hidden=true so historical analytics stay intact */
  const softDelete = useCallback((collection, id) => {
    updateDb(prev => ({
      ...prev,
      [collection]: prev[collection].map(item =>
        item.id === id ? { ...item, is_hidden: true } : item
      ),
    }));
  }, [updateDb]);

  /** Quick-update a single field on any collection item */
  const patchItem = useCallback((collection, id, patch) => {
    updateDb(prev => ({
      ...prev,
      [collection]: prev[collection].map(item =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }, [updateDb]);

  /** Add item to any collection, auto-assigning id + timestamp */
  const addItem = useCallback((collection, item) => {
    updateDb(prev => ({
      ...prev,
      [collection]: [...prev[collection], { ...item, id: Date.now(), created_at: new Date().toISOString() }],
    }));
  }, [updateDb]);

  const value = {
    ...auth,
    db,
    fileId,
    syncing,
    syncError,
    dbLoading,
    updateDb,
    softDelete,
    patchItem,
    addItem,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = {
  Google: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Wallet: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path d="M16 3H4a2 2 0 0 0-2 2v2"/>
      <circle cx="18" cy="14" r="1" fill="currentColor"/>
    </svg>
  ),
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Cloud: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
};

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage() {
  const { signIn, authLoading, gapiReady, authError } = useApp();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #0a0e1a 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "linear-gradient(rgba(99,202,183,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,202,183,0.3) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        animation: "gridScroll 20s linear infinite",
      }} />

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(99,202,183,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      {/* Card */}
      <div className="relative z-10 text-center px-8" style={{ maxWidth: "420px", width: "100%" }}>
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <div style={{
            width: "64px", height: "64px",
            border: "1.5px solid rgba(99,202,183,0.6)",
            borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(99,202,183,0.08)",
            boxShadow: "0 0 30px rgba(99,202,183,0.15)",
          }}>
            <svg viewBox="0 0 32 32" fill="none" style={{ width: "36px" }}>
              <path d="M6 24 L14 14 L20 19 L26 9" stroke="#63cab7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="26" cy="9" r="2.5" fill="#63cab7"/>
            </svg>
          </div>
        </div>

        <h1 style={{
          fontSize: "2.2rem", fontWeight: "400", letterSpacing: "0.12em",
          color: "#e8f0ec", marginBottom: "4px",
          textShadow: "0 0 40px rgba(99,202,183,0.2)",
        }}>
          INVESTITATY
        </h1>

        <p style={{
          fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase",
          color: "rgba(99,202,183,0.7)", marginBottom: "48px",
          fontFamily: "'Courier New', monospace",
        }}>
          Personal Investment Manager
        </p>

        {/* Feature pills */}
        <div className="flex justify-center gap-3 mb-10 flex-wrap">
          {[
            { icon: <Icon.Shield />, label: "Privacy-First" },
            { icon: <Icon.Cloud />, label: "Drive-Synced" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px",
              border: "1px solid rgba(99,202,183,0.2)",
              borderRadius: "100px",
              color: "rgba(99,202,183,0.7)",
              fontSize: "0.72rem", letterSpacing: "0.1em",
              background: "rgba(99,202,183,0.04)",
              fontFamily: "'Courier New', monospace",
            }}>
              {icon} {label}
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <button
          onClick={signIn}
          disabled={!gapiReady || authLoading}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            width: "100%", padding: "14px 24px",
            background: authLoading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "10px",
            color: authLoading ? "rgba(255,255,255,0.4)" : "#fff",
            fontSize: "0.9rem", letterSpacing: "0.05em",
            cursor: (!gapiReady || authLoading) ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            fontFamily: "'Georgia', serif",
          }}
          onMouseEnter={e => {
            if (!authLoading && gapiReady) {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          }}
        >
          {authLoading ? (
            <>
              <div style={{
                width: "16px", height: "16px",
                border: "2px solid rgba(255,255,255,0.2)",
                borderTopColor: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              Connecting...
            </>
          ) : (
            <><Icon.Google /> Sign in with Google</>
          )}
        </button>

        {!gapiReady && !authError && (
          <p style={{ marginTop: "12px", fontSize: "0.7rem", color: "rgba(99,202,183,0.4)", fontFamily: "'Courier New', monospace" }}>
            Loading Google APIs...
          </p>
        )}

        {authError && (
          <div style={{
            marginTop: "14px", padding: "10px 14px",
            background: "rgba(224,112,112,0.08)", border: "1px solid rgba(224,112,112,0.25)",
            borderRadius: "8px", color: "rgba(255,140,140,0.9)",
            fontSize: "0.7rem", fontFamily: "'Courier New', monospace", lineHeight: 1.5,
            textAlign: "left",
          }}>
            ⚠ {authError}
          </div>
        )}

        <p style={{
          marginTop: "28px", fontSize: "0.7rem", lineHeight: "1.6",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'Courier New', monospace",
        }}>
          Your data is stored exclusively in your own<br />
          Google Drive. We never see your investments.
        </p>
      </div>

      <style>{`
        @keyframes gridScroll { from { transform: translateY(0); } to { transform: translateY(60px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── LOADING SCREEN ────────────────────────────────────────────────────────────
function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{
      background: "#0a0e1a", fontFamily: "'Courier New', monospace",
    }}>
      <div style={{
        width: "40px", height: "40px",
        border: "2px solid rgba(99,202,183,0.15)",
        borderTopColor: "#63cab7",
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
        marginBottom: "20px",
      }} />
      <p style={{ color: "rgba(99,202,183,0.6)", fontSize: "0.8rem", letterSpacing: "0.15em" }}>
        {message || "LOADING..."}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <Icon.TrendingUp /> },
  { id: "investments", label: "Investments", icon: <Icon.Wallet /> },
  { id: "funding", label: "Funding", icon: <Icon.DollarSign /> },
  { id: "dividends", label: "Dividends", icon: <Icon.DollarSign /> },
  { id: "settings", label: "Settings", icon: <Icon.Settings /> },
];

function Sidebar({ activeTab, setActiveTab }) {
  const { user, signOut, syncing } = useApp();

  return (
    <aside style={{
      width: "220px", minHeight: "100vh",
      background: "#080c16",
      borderRight: "1px solid rgba(99,202,183,0.1)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Courier New', monospace",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(99,202,183,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px", height: "28px",
            background: "rgba(99,202,183,0.1)",
            border: "1px solid rgba(99,202,183,0.3)",
            borderRadius: "7px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 16 16" fill="none" style={{ width: "16px" }}>
              <path d="M2 12 L6 7 L10 9.5 L13 4" stroke="#63cab7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ color: "#e8f0ec", fontSize: "0.85rem", letterSpacing: "0.12em", fontWeight: "600" }}>
            INVESTITATY
          </span>
        </div>
        {/* Sync status */}
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
          marginTop: "8px",
          color: syncing ? "rgba(255,200,80,0.7)" : "rgba(99,202,183,0.5)",
          fontSize: "0.62rem", letterSpacing: "0.1em",
        }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: syncing ? "rgba(255,200,80,0.8)" : "rgba(99,202,183,0.6)",
            animation: syncing ? "pulse 1s ease-in-out infinite" : "none",
          }} />
          {syncing ? "SYNCING..." : "SYNCED"}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              width: "100%", padding: "10px 12px",
              borderRadius: "8px", border: "none",
              background: activeTab === id ? "rgba(99,202,183,0.12)" : "transparent",
              color: activeTab === id ? "#63cab7" : "rgba(255,255,255,0.45)",
              fontSize: "0.78rem", letterSpacing: "0.08em",
              cursor: "pointer", textAlign: "left",
              borderLeft: activeTab === id ? "2px solid rgba(99,202,183,0.8)" : "2px solid transparent",
              transition: "all 0.15s",
              marginBottom: "2px",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(99,202,183,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          {user?.picture ? (
            <img src={user.picture} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(99,202,183,0.3)" }} />
          ) : (
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(99,202,183,0.15)", border: "1px solid rgba(99,202,183,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#63cab7", fontSize: "0.7rem" }}>{user?.name?.[0] || "?"}</span>
            </div>
          )}
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>{user?.name}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            width: "100%", padding: "7px 10px",
            background: "rgba(255,80,80,0.06)", border: "1px solid rgba(255,80,80,0.15)",
            borderRadius: "7px", color: "rgba(255,100,100,0.7)",
            fontSize: "0.72rem", letterSpacing: "0.08em", cursor: "pointer",
          }}
        >
          <Icon.LogOut /> Sign Out
        </button>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 — DASHBOARD COMPONENTS
// components/Dashboard/* inlined here for zero build-config friction.
// Auth/Drive logic above is untouched.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Shared palette ────────────────────────────────────────────────────────────
const CHART_COLORS = ["#63cab7","#7ec8e3","#b8a9e8","#f0c27a","#a8e6cf","#e8a598","#9fcfb2","#c8b8e8"];

// ─── KPI HEADER ────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, accent, index }) {
  const isPositive = trend >= 0;
  const fmt = (v) => "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div style={{
      flex: "1", minWidth: "170px", padding: "22px 22px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(99,202,183,0.1)",
      borderTop: `2px solid ${accent}`,
      borderRadius: "0 0 12px 12px",
      position: "relative", overflow: "hidden",
      animation: "kpiFadeIn 0.4s ease both",
      animationDelay: `${index * 0.08}s`,
    }}>
      <div style={{ position:"absolute",top:"-20px",right:"-20px",width:"80px",height:"80px",
        background:`radial-gradient(circle,${accent}18 0%,transparent 70%)`,borderRadius:"50%",pointerEvents:"none" }} />
      <div style={{ color:"rgba(255,255,255,0.38)",fontSize:"0.65rem",letterSpacing:"0.2em",textTransform:"uppercase",
        fontFamily:"'Courier New',monospace",marginBottom:"10px" }}>{label}</div>
      <div style={{ color:"#eef4f0",fontSize:"1.6rem",fontWeight:"300",fontFamily:"'Georgia',serif",
        lineHeight:1,marginBottom:"8px",letterSpacing:"-0.01em" }}>{fmt(value)}</div>
      <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
        {trend !== undefined && (
          <span style={{ fontSize:"0.66rem",fontFamily:"'Courier New',monospace",
            color:isPositive?"#63cab7":"#e07070",
            background:isPositive?"rgba(99,202,183,0.1)":"rgba(224,112,112,0.1)",
            border:`1px solid ${isPositive?"rgba(99,202,183,0.25)":"rgba(224,112,112,0.25)"}`,
            borderRadius:"4px",padding:"2px 6px" }}>
            {isPositive?"▲":"▼"} ${Math.abs(trend).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </span>
        )}
        {sub && <span style={{ color:"rgba(255,255,255,0.28)",fontSize:"0.66rem",fontFamily:"'Courier New',monospace" }}>{sub}</span>}
      </div>
    </div>
  );
}

function KPIHeader({ db }) {
  const kpis = useMemo(() => {
    if (!db) return { portfolioValue:0,capitalGains:0,dividendIncome:0,netProfit:0,activeCount:0 };
    const active = (db.investments||[]).filter(i=>i.status!=="Closed" && !i.is_hidden);
    const portfolioValue = active.reduce((s,i)=>(s+(parseFloat(i.quantity)||0)*(parseFloat(i.currentPrice)||0)),0);
    const totalCost = active.reduce((s,i)=>(s+(parseFloat(i.quantity)||0)*(parseFloat(i.purchasePrice)||0)),0);
    const capitalGains = portfolioValue - totalCost;
    const dividendIncome = (db.dividends||[]).filter(d=>!d.is_hidden).reduce((s,d)=>(s+(parseFloat(d.amount)||0)),0);
    return { portfolioValue, capitalGains, dividendIncome, netProfit: capitalGains + dividendIncome, activeCount: active.length };
  }, [db]);

  const cards = [
    { label:"Total Portfolio Value",  value:kpis.portfolioValue,  sub:`${kpis.activeCount} active positions`, trend:undefined,            accent:"#63cab7" },
    { label:"Total Net Profit",       value:kpis.netProfit,       sub:"dividends + capital gains",            trend:kpis.netProfit,       accent:kpis.netProfit>=0?"#a8e6cf":"#e07070" },
    { label:"Dividend Income",        value:kpis.dividendIncome,  sub:`${(db?.dividends||[]).length} payments`,trend:undefined,           accent:"#7ec8e3" },
    { label:"Capital Gains",          value:kpis.capitalGains,    sub:"unrealised",                           trend:kpis.capitalGains,    accent:kpis.capitalGains>=0?"#b8d4a8":"#e07070" },
  ];

  return (
    <>
      <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px" }}>
        <span style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.62rem",letterSpacing:"0.25em",textTransform:"uppercase",fontFamily:"'Courier New',monospace" }}>Portfolio Overview</span>
        <div style={{ flex:1,height:"1px",background:"rgba(99,202,183,0.08)" }} />
      </div>
      <div style={{ display:"flex",gap:"14px",flexWrap:"wrap" }}>
        {cards.map((c,i) => <KPICard key={c.label} {...c} index={i} />)}
      </div>
    </>
  );
}

// ─── PORTFOLIO CARDS ───────────────────────────────────────────────────────────
const PORTFOLIO_PALETTE = [
  {line:"#63cab7",glow:"rgba(99,202,183,0.12)"},{line:"#7ec8e3",glow:"rgba(126,200,227,0.12)"},
  {line:"#b8a9e8",glow:"rgba(184,169,232,0.12)"},{line:"#f0c27a",glow:"rgba(240,194,122,0.12)"},
  {line:"#a8e6cf",glow:"rgba(168,230,207,0.12)"},{line:"#e8a598",glow:"rgba(232,165,152,0.12)"},
];

function PortfolioCards({ db, onCardClick }) {
  const portfolios = useMemo(() => {
    if (!db) return [];
    const active = (db.investments||[]).filter(i=>i.status!=="Closed" && !i.is_hidden);
    const groups = {};
    active.forEach(inv => {
      const k = inv.type||"Uncategorized";
      if (!groups[k]) groups[k] = [];
      groups[k].push(inv);
    });
    const entries = Object.entries(groups).map(([type,investments]) => {
      const totalValue = investments.reduce((s,i)=>(s+(parseFloat(i.quantity)||0)*(parseFloat(i.currentPrice)||0)),0);
      return { type, investments, totalValue };
    }).sort((a,b)=>b.totalValue-a.totalValue);
    const grand = entries.reduce((s,e)=>s+e.totalValue,0);
    return entries.map(e=>({...e,allocationPct:grand>0?(e.totalValue/grand)*100:0}));
  }, [db]);

  if (!portfolios.length) return (
    <div style={{ padding:"28px",textAlign:"center",border:"1px dashed rgba(99,202,183,0.12)",borderRadius:"12px",
      color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.72rem",letterSpacing:"0.1em" }}>
      No portfolio data yet — add investments with quantity &amp; price.
    </div>
  );

  return (
    <>
      <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px" }}>
        <span style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.62rem",letterSpacing:"0.25em",textTransform:"uppercase",fontFamily:"'Courier New',monospace" }}>Portfolios</span>
        <div style={{ flex:1,height:"1px",background:"rgba(99,202,183,0.08)" }} />
        <span style={{ color:"rgba(255,255,255,0.2)",fontSize:"0.6rem",fontFamily:"'Courier New',monospace" }}>← scroll →</span>
      </div>
      <div style={{ display:"flex",gap:"12px",overflowX:"auto",paddingBottom:"8px",scrollbarWidth:"thin",scrollbarColor:"rgba(99,202,183,0.2) transparent" }}>
        {portfolios.map((p,i) => {
          const cs = PORTFOLIO_PALETTE[i % PORTFOLIO_PALETTE.length];
          const dominantRisk = (() => {
            const freq={};
            p.investments.forEach(inv=>{freq[inv.risk]=(freq[inv.risk]||0)+1;});
            return Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
          })();
          return (
            <div key={p.type} onClick={() => onCardClick && onCardClick(p)}
              style={{ minWidth:"195px",maxWidth:"215px",flexShrink:0,padding:"18px",
              background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",
              borderLeft:`3px solid ${cs.line}`,borderRadius:"0 12px 12px 0",cursor:"pointer",
              transition:"transform 0.2s,box-shadow 0.2s",
              animation:"cardSlideIn 0.45s ease both",animationDelay:`${i*0.07}s` }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.3)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
                <span style={{ color:cs.line,fontSize:"0.68rem",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"'Courier New',monospace" }}>{p.type}</span>
                <span style={{ background:cs.glow,border:`1px solid ${cs.line}33`,borderRadius:"100px",padding:"1px 7px",
                  fontSize:"0.6rem",color:cs.line,fontFamily:"'Courier New',monospace",opacity:0.85 }}>
                  {p.investments.length}
                </span>
              </div>
              <div style={{ color:"#eef4f0",fontSize:"1.2rem",fontWeight:"300",fontFamily:"'Georgia',serif",marginBottom:"4px" }}>
                ${p.totalValue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </div>
              <div style={{ color:"rgba(255,255,255,0.28)",fontSize:"0.63rem",fontFamily:"'Courier New',monospace",marginBottom:"12px" }}>
                {p.allocationPct.toFixed(1)}% of portfolio
              </div>
              {/* mini bar */}
              <div style={{ height:"4px",background:"rgba(255,255,255,0.06)",borderRadius:"100px",overflow:"hidden",marginBottom:"10px" }}>
                <div style={{ height:"100%",width:`${p.allocationPct}%`,background:`linear-gradient(90deg,${cs.line}88,${cs.line})`,borderRadius:"100px",transition:"width 0.8s ease" }} />
              </div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ color:"rgba(255,255,255,0.25)",fontSize:"0.6rem",fontFamily:"'Courier New',monospace" }}>Risk: {dominantRisk}</div>
                <ExternalLink size={11} color={cs.line} style={{opacity:0.5}} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── ASSET ALLOCATION CHART (recharts) ────────────────────────────────────────
function AllocationTooltip({ active, payload }) {
  if (active && payload?.length) {
    const d = payload[0];
    return (
      <div style={{ background:"#0f1520",border:"1px solid rgba(99,202,183,0.25)",borderRadius:"8px",
        padding:"10px 14px",fontFamily:"'Courier New',monospace",fontSize:"0.72rem",boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
        <div style={{ color:d.payload.fill,marginBottom:"3px",letterSpacing:"0.08em" }}>{d.name}</div>
        <div style={{ color:"#eef4f0" }}>${d.payload.value.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
        <div style={{ color:"rgba(255,255,255,0.4)",marginTop:"2px" }}>{d.payload.pct.toFixed(1)}%</div>
      </div>
    );
  }
  return null;
}

function AssetAllocationChart({ db }) {
  const data = useMemo(() => {
    if (!db) return [];
    const active = (db.investments||[]).filter(i=>i.status!=="Closed" && !i.is_hidden);
    const groups={};
    active.forEach(inv=>{
      const k=inv.type||"Uncategorized";
      const val=(parseFloat(inv.quantity)||0)*(parseFloat(inv.currentPrice)||0);
      groups[k]=(groups[k]||0)+val;
    });
    const total=Object.values(groups).reduce((s,v)=>s+v,0);
    return Object.entries(groups).map(([name,value])=>({name,value,pct:total>0?(value/total)*100:0}))
      .sort((a,b)=>b.value-a.value);
  }, [db]);

  if (!data.length) return (
    <div style={{ padding:"36px 0",textAlign:"center",color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.72rem" }}>
      No allocation data yet.
    </div>
  );

  return (
    <div style={{ display:"flex",alignItems:"center",height:"200px" }}>
      <ResponsiveContainer width="52%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<AllocationTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ flex:1,display:"flex",flexDirection:"column",gap:"7px",paddingLeft:"4px" }}>
        {data.map((d,i) => (
          <div key={d.name} style={{ display:"flex",alignItems:"center",gap:"7px" }}>
            <div style={{ width:"7px",height:"7px",borderRadius:"2px",background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0 }} />
            <span style={{ color:"rgba(255,255,255,0.55)",fontSize:"0.67rem",fontFamily:"'Courier New',monospace",letterSpacing:"0.04em",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.name}</span>
            <span style={{ color:"rgba(255,255,255,0.3)",fontSize:"0.63rem",fontFamily:"'Courier New',monospace" }}>{d.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UPCOMING CASH FLOW ───────────────────────────────────────────────────────
function UpcomingCashFlow({ db }) {
  const scheduled = useMemo(() => {
    if (!db) return [];
    return (db.dividends||[])
      .filter(d=>d.status==="scheduled" && d.dueDate)
      .sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
      .slice(0,6);
  }, [db]);

  if (!scheduled.length) return (
    <div style={{ padding:"24px 0",textAlign:"center",color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.7rem",letterSpacing:"0.06em",lineHeight:1.8 }}>
      No scheduled dividends.<br/>
      <span style={{ opacity:0.6 }}>Set <code style={{ background:"rgba(99,202,183,0.08)",padding:"0 4px",borderRadius:"3px",color:"rgba(99,202,183,0.6)" }}>status:"scheduled"</code> + dueDate.</span>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column" }}>
      {scheduled.map((d,i) => {
        const today = new Date();
        const due = new Date(d.dueDate);
        const diff = Math.ceil((due-today)/(1000*60*60*24));
        const badgeColor = diff<0?"rgba(224,112,112,0.8)":diff<=7?"#f0c27a":"#63cab7";
        const badgeLabel = diff<0?"Overdue":diff===0?"Today":`${diff}d`;
        return (
          <div key={d.id||i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"9px 0",borderBottom:i<scheduled.length-1?"1px solid rgba(255,255,255,0.04)":"none",
            animation:"cashFlowIn 0.3s ease both",animationDelay:`${i*0.05}s` }}>
            <div>
              <div style={{ color:"rgba(255,255,255,0.7)",fontSize:"0.76rem",fontFamily:"'Courier New',monospace",marginBottom:"2px" }}>{d.investmentName||"Unknown"}</div>
              <div style={{ color:"rgba(255,255,255,0.28)",fontSize:"0.63rem",fontFamily:"'Courier New',monospace" }}>{d.dueDate}</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
              <span style={{ color:"#a8e6cf",fontSize:"0.82rem",fontFamily:"'Georgia',serif",fontWeight:"300" }}>
                +${parseFloat(d.amount||0).toLocaleString("en-US",{minimumFractionDigits:2})}
              </span>
              <span style={{ fontSize:"0.63rem",fontFamily:"'Courier New',monospace",color:badgeColor,
                background:`${badgeColor}18`,border:`1px solid ${badgeColor}33`,borderRadius:"4px",padding:"2px 6px" }}>
                {badgeLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── FUNDING PERFORMANCE ──────────────────────────────────────────────────────
const SOURCE_COLORS_MAP = { Brokerage:"#63cab7",Bank:"#7ec8e3",Exchange:"#b8a9e8",Direct:"#f0c27a",_default:"#9fcfb2" };

function FundingPerformance({ db }) {
  const sources = useMemo(() => {
    if (!db) return [];
    const capital={};
    (db.funding||[]).forEach(f=>{const s=f.source||"Unknown";capital[s]=(capital[s]||0)+(parseFloat(f.amount)||0);});
    const invSource={};
    (db.funding||[]).forEach(f=>{if(f.investmentName&&f.source)invSource[f.investmentName]=f.source;});
    const profit={};
    (db.dividends||[]).forEach(d=>{const s=invSource[d.investmentName]||d.source||"Unknown";profit[s]=(profit[s]||0)+(parseFloat(d.amount)||0);});
    const all=new Set([...Object.keys(capital),...Object.keys(profit)]);
    return Array.from(all).map(src=>({source:src,capital:capital[src]||0,profit:profit[src]||0,
      roi:capital[src]>0?((profit[src]||0)/capital[src])*100:0}))
      .filter(s=>s.capital>0).sort((a,b)=>b.capital-a.capital);
  }, [db]);

  if (!sources.length) return (
    <div style={{ padding:"24px 0",textAlign:"center",color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.7rem" }}>
      No funding records yet.
    </div>
  );

  const maxCap = Math.max(...sources.map(s=>s.capital));
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"15px" }}>
      {sources.map((s,i) => {
        const color = SOURCE_COLORS_MAP[s.source]||SOURCE_COLORS_MAP._default;
        const pct = maxCap>0?(s.capital/maxCap)*100:0;
        return (
          <div key={s.source} style={{ animation:"fundingIn 0.35s ease both",animationDelay:`${i*0.06}s` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"5px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                <div style={{ width:"7px",height:"7px",borderRadius:"50%",background:color,flexShrink:0 }} />
                <span style={{ color:"rgba(255,255,255,0.65)",fontSize:"0.74rem",fontFamily:"'Courier New',monospace" }}>{s.source}</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                <span style={{ color:s.profit>0?"#a8e6cf":"rgba(255,255,255,0.3)",fontSize:"0.68rem",fontFamily:"'Courier New',monospace" }}>
                  +${s.profit.toLocaleString("en-US",{minimumFractionDigits:2})}
                </span>
                <span style={{ fontSize:"0.6rem",fontFamily:"'Courier New',monospace",
                  color:s.roi>0?"#63cab7":"rgba(255,255,255,0.25)",
                  background:s.roi>0?"rgba(99,202,183,0.08)":"rgba(255,255,255,0.04)",
                  border:"1px solid rgba(99,202,183,0.15)",borderRadius:"4px",padding:"1px 5px" }}>
                  {s.roi.toFixed(1)}% ROI
                </span>
              </div>
            </div>
            <div style={{ color:"rgba(255,255,255,0.22)",fontSize:"0.62rem",fontFamily:"'Courier New',monospace",marginBottom:"4px" }}>
              ${s.capital.toLocaleString("en-US",{minimumFractionDigits:2})} deployed
            </div>
            <div style={{ height:"4px",background:"rgba(255,255,255,0.06)",borderRadius:"100px",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${color}88,${color})`,
                borderRadius:"100px",transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)",boxShadow:`0 0 6px ${color}44` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DASHBOARD PANEL WRAPPER ──────────────────────────────────────────────────
function DashPanel({ title, children, style={} }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(99,202,183,0.09)",borderRadius:"12px",overflow:"hidden",...style }}>
      <div style={{ padding:"13px 20px 11px",borderBottom:"1px solid rgba(99,202,183,0.07)" }}>
        <span style={{ color:"rgba(99,202,183,0.52)",fontSize:"0.6rem",letterSpacing:"0.22em",textTransform:"uppercase",fontFamily:"'Courier New',monospace" }}>{title}</span>
      </div>
      <div style={{ padding:"18px 20px" }}>{children}</div>
    </div>
  );
}

// ─── DASHBOARD (main — consumes InvestitatyContext) ───────────────────────────
function Dashboard() {
  const { db } = useApp();
  const [activePortfolio, setActivePortfolio] = useState(null);
  if (!db) return null;

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"28px",animation:"dashboardFadeIn 0.35s ease both" }}>
      <style>{`
        @keyframes kpiFadeIn    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardSlideIn  { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes cashFlowIn   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fundingIn    { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes dashboardFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes s3ModalIn { from{opacity:0;transform:scale(0.96) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes s3SlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes s3PopIn   { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Page heading */}
      <div>
        <div style={{ color:"rgba(255,255,255,0.22)",fontSize:"0.63rem",fontFamily:"'Courier New',monospace",
          letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"4px" }}>{greeting}</div>
        <h2 style={{ color:"#eef4f0",fontSize:"1.4rem",fontWeight:"300",letterSpacing:"0.06em",
          fontFamily:"'Georgia',serif",margin:0 }}>Dashboard</h2>
      </div>

      {/* KPI Header */}
      <KPIHeader db={db} />

      {/* Portfolio Cards — clickable → opens PortfolioModal */}
      <PortfolioCards db={db} onCardClick={setActivePortfolio} />

      {/* Quick Stats — 3-col grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px" }}>
        <DashPanel title="Asset Allocation">
          <AssetAllocationChart db={db} />
        </DashPanel>
        <DashPanel title="Upcoming Cash Flow">
          <UpcomingCashFlow db={db} />
        </DashPanel>
        <DashPanel title="Funding Performance">
          <FundingPerformance db={db} />
        </DashPanel>
      </div>

      {/* Portfolio Modal (Sprint 3) */}
      {activePortfolio && (
        <PortfolioModal
          portfolio={activePortfolio}
          db={db}
          onClose={() => setActivePortfolio(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 — INTERACTION & DATA MANAGEMENT
// PortfolioModal → InvestmentDetailModal → CRUD helpers
// Auth/Drive logic untouched. All mutations flow through updateDb / patchItem / softDelete / addItem.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SHARED SPRINT-3 STYLES ────────────────────────────────────────────────────
const s3 = {
  overlay: {
    position:"fixed",inset:0,zIndex:200,
    background:"rgba(5,8,18,0.88)",backdropFilter:"blur(8px)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",
    overflowY:"auto",
  },
  panel: (maxW="860px") => ({
    background:"#0c1220",
    border:"1px solid rgba(99,202,183,0.18)",
    borderRadius:"16px",
    width:"100%",maxWidth:maxW,
    boxShadow:"0 32px 100px rgba(0,0,0,0.7)",
    animation:"s3ModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
    position:"relative",
  }),
  header: {
    display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"20px 24px",borderBottom:"1px solid rgba(99,202,183,0.08)",
  },
  body: { padding:"22px 24px" },
  th: { padding:"10px 14px",textAlign:"left",color:"rgba(99,202,183,0.55)",
    fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",
    fontFamily:"'Courier New',monospace",fontWeight:600,
    borderBottom:"1px solid rgba(99,202,183,0.08)",whiteSpace:"nowrap" },
  td: { padding:"11px 14px",color:"rgba(255,255,255,0.7)",
    fontSize:"0.78rem",fontFamily:"'Courier New',monospace",verticalAlign:"middle" },
  badge: (color="#63cab7") => ({
    display:"inline-block",padding:"2px 8px",borderRadius:"100px",
    fontSize:"0.6rem",fontFamily:"'Courier New',monospace",letterSpacing:"0.08em",
    background:`${color}18`,border:`1px solid ${color}44`,color,
  }),
  iconBtn: (color="rgba(255,255,255,0.35)") => ({
    background:"transparent",border:"none",cursor:"pointer",color,
    padding:"5px",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",
    transition:"background 0.15s,color 0.15s",
  }),
};

const STATUS_COLOR = {
  received:"#63cab7", scheduled:"#f0c27a", missed:"#e07070",
  Active:"#63cab7", Paused:"#f0c27a", Closed:"rgba(255,255,255,0.3)",
};

// ─── DIVIDEND ACTION MENU ─────────────────────────────────────────────────────
function DividendActionMenu({ dividend, onClose }) {
  const { patchItem, softDelete } = useApp();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const actions = [
    {
      label:"Mark as Collected",
      icon:<Check size={13} />,
      color:"#63cab7",
      show: dividend.status !== "received",
      action: () => { patchItem("dividends", dividend.id, { status:"received", collected_at: new Date().toISOString() }); onClose(); },
    },
    {
      label:"Mark as Scheduled",
      icon:<RefreshCw size={13} />,
      color:"#f0c27a",
      show: dividend.status === "received",
      action: () => { patchItem("dividends", dividend.id, { status:"scheduled" }); onClose(); },
    },
    {
      label:"Cancel / Remove",
      icon:<Trash2 size={13} />,
      color:"#e07070",
      show: true,
      action: () => { softDelete("dividends", dividend.id); onClose(); },
    },
  ].filter(a => a.show);

  return (
    <div ref={ref} style={{
      position:"absolute",right:0,top:"calc(100% + 4px)",zIndex:500,
      background:"#111827",border:"1px solid rgba(99,202,183,0.2)",
      borderRadius:"10px",minWidth:"180px",
      boxShadow:"0 12px 36px rgba(0,0,0,0.5)",
      overflow:"hidden",animation:"s3PopIn 0.15s ease both",
    }}>
      {actions.map(a => (
        <button key={a.label} onClick={a.action} style={{
          display:"flex",alignItems:"center",gap:"8px",
          width:"100%",padding:"10px 14px",
          background:"transparent",border:"none",
          color:a.color,fontSize:"0.74rem",fontFamily:"'Courier New',monospace",
          cursor:"pointer",textAlign:"left",letterSpacing:"0.04em",
          transition:"background 0.12s",
        }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
        >
          {a.icon} {a.label}
        </button>
      ))}
    </div>
  );
}

// ─── QUICK PRICE UPDATE ───────────────────────────────────────────────────────
function QuickPriceUpdate({ investment, onDone }) {
  const { patchItem } = useApp();
  const [val, setVal] = useState(investment.currentPrice || "");

  const save = () => {
    if (val === "") return;
    patchItem("investments", investment.id, { currentPrice: val });
    onDone();
  };

  return (
    <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
      <input
        autoFocus
        type="number"
        value={val}
        onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") save(); if(e.key==="Escape") onDone(); }}
        style={{
          width:"90px",padding:"4px 8px",
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(99,202,183,0.4)",
          borderRadius:"6px",color:"#eef4f0",fontSize:"0.78rem",fontFamily:"'Courier New',monospace",
          outline:"none",
        }}
      />
      <button onClick={save} style={{ ...s3.iconBtn("#63cab7"),background:"rgba(99,202,183,0.12)" }}>
        <Check size={12} />
      </button>
      <button onClick={onDone} style={s3.iconBtn("rgba(255,255,255,0.3)")}>
        <LucideX size={12} />
      </button>
    </div>
  );
}

// ─── INVESTMENT DETAIL VIEW (expanded row / sub-modal) ───────────────────────
function InvestmentDetailView({ investment, db, onClose }) {
  const { patchItem, softDelete } = useApp();

  const fundingSources = useMemo(() => {
    return (db.funding || [])
      .filter(f => !f.is_hidden && f.investmentName === investment.name);
  }, [db.funding, investment.name]);

  const dividendLedger = useMemo(() => {
    return (db.dividends || [])
      .filter(d => !d.is_hidden && d.investmentName === investment.name)
      .sort((a,b) => new Date(b.date||b.dueDate||0) - new Date(a.date||a.dueDate||0));
  }, [db.dividends, investment.name]);

  const [openMenu, setOpenMenu] = useState(null);

  const principal = fundingSources.reduce((s,f)=>(s+(parseFloat(f.amount)||0)),0);
  const qty = parseFloat(investment.quantity)||0;
  const curPrice = parseFloat(investment.currentPrice)||0;
  const buyPrice = parseFloat(investment.purchasePrice)||0;
  const curValue = qty * curPrice;
  const cost = qty * buyPrice;
  const roi = cost > 0 ? ((curValue - cost) / cost) * 100 : 0;

  return (
    <div style={{
      ...s3.panel("780px"),
      maxHeight:"90vh",display:"flex",flexDirection:"column",
    }}>
      {/* Header */}
      <div style={s3.header}>
        <div>
          <div style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.6rem",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"3px" }}>
            Investment Detail
          </div>
          <h3 style={{ color:"#eef4f0",margin:0,fontSize:"1.1rem",fontFamily:"'Georgia',serif",fontWeight:400 }}>
            {investment.name}
          </h3>
        </div>
        <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
          <span style={s3.badge(STATUS_COLOR[investment.status]||"#63cab7")}>{investment.status}</span>
          <button onClick={onClose} style={s3.iconBtn()}>
            <LucideX size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ ...s3.body, overflowY:"auto", display:"flex", flexDirection:"column", gap:"22px" }}>

        {/* Quick metrics strip */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px" }}>
          {[
            { label:"Current Value",  val:`$${curValue.toLocaleString("en-US",{minimumFractionDigits:2})}`,  color:"#eef4f0" },
            { label:"Principal",      val:`$${principal.toLocaleString("en-US",{minimumFractionDigits:2})}`, color:"#eef4f0" },
            { label:"ROI",            val:`${roi>=0?"+":""}${roi.toFixed(2)}%`,                              color:roi>=0?"#63cab7":"#e07070" },
            { label:"Qty × Price",    val:`${qty} × $${curPrice}`,                                          color:"rgba(255,255,255,0.5)" },
          ].map(m=>(
            <div key={m.label} style={{ padding:"12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(99,202,183,0.08)",borderRadius:"10px" }}>
              <div style={{ color:"rgba(255,255,255,0.35)",fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"6px" }}>{m.label}</div>
              <div style={{ color:m.color,fontSize:"1rem",fontFamily:"'Georgia',serif",fontWeight:300 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Funding Breakdown */}
        <div>
          <div style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px" }}>
            <BookOpen size={11} style={{opacity:0.7}} /> Funding Breakdown
          </div>
          {fundingSources.length === 0 ? (
            <div style={{ padding:"20px",textAlign:"center",border:"1px dashed rgba(99,202,183,0.1)",borderRadius:"8px",color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.7rem" }}>
              No funding records linked to this investment.
            </div>
          ) : (
            <div style={{ border:"1px solid rgba(99,202,183,0.08)",borderRadius:"10px",overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr><th style={s3.th}>Source</th><th style={s3.th}>Date</th><th style={s3.th}>Amount</th><th style={s3.th}>Notes</th></tr>
                </thead>
                <tbody>
                  {fundingSources.map((f,i)=>(
                    <tr key={f.id||i} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)",animation:"s3SlideIn 0.25s ease both",animationDelay:`${i*0.04}s` }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <td style={s3.td}><span style={s3.badge()}>{f.source||"—"}</span></td>
                      <td style={s3.td}>{f.date||"—"}</td>
                      <td style={{...s3.td,color:"#a8e6cf"}}>+${parseFloat(f.amount||0).toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                      <td style={{...s3.td,color:"rgba(255,255,255,0.35)"}}>{f.notes||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dividend Ledger */}
        <div>
          <div style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px" }}>
            <DollarIcon size={11} style={{opacity:0.7}} /> Dividend Ledger
          </div>
          {dividendLedger.length === 0 ? (
            <div style={{ padding:"20px",textAlign:"center",border:"1px dashed rgba(99,202,183,0.1)",borderRadius:"8px",color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.7rem" }}>
              No dividends recorded for this investment.
            </div>
          ) : (
            <div style={{ border:"1px solid rgba(99,202,183,0.08)",borderRadius:"10px",overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr><th style={s3.th}>Date</th><th style={s3.th}>Amount</th><th style={s3.th}>Status</th><th style={s3.th}>Due Date</th><th style={{...s3.th,width:"36px"}}></th></tr>
                </thead>
                <tbody>
                  {dividendLedger.map((d,i)=>(
                    <tr key={d.id||i} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)",position:"relative",animation:"s3SlideIn 0.25s ease both",animationDelay:`${i*0.04}s` }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <td style={s3.td}>{d.date||"—"}</td>
                      <td style={{...s3.td,color:"#a8e6cf"}}>+${parseFloat(d.amount||0).toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                      <td style={s3.td}><span style={s3.badge(STATUS_COLOR[d.status]||"#63cab7")}>{d.status||"—"}</span></td>
                      <td style={{...s3.td,color:"rgba(255,255,255,0.4)"}}>{d.dueDate||"—"}</td>
                      <td style={{ ...s3.td, position:"relative" }}>
                        <button
                          onClick={()=>setOpenMenu(openMenu===d.id?null:d.id)}
                          style={s3.iconBtn()}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >
                          <MoreVertical size={13} />
                        </button>
                        {openMenu===d.id && (
                          <DividendActionMenu dividend={d} onClose={()=>setOpenMenu(null)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Soft delete / close actions */}
        <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",paddingTop:"4px" }}>
          <button onClick={() => { softDelete("investments", investment.id); onClose(); }}
            style={{ ...s3.iconBtn("#e07070"),padding:"7px 14px",border:"1px solid rgba(224,112,112,0.25)",
              borderRadius:"8px",fontSize:"0.72rem",fontFamily:"'Courier New',monospace",gap:"5px",display:"flex",alignItems:"center" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(224,112,112,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <Trash2 size={13} /> Archive Investment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PORTFOLIO MODAL ──────────────────────────────────────────────────────────
// Opens when user clicks a Portfolio Card on the Dashboard.
// Shows a data grid of all investments in that portfolio type.
// Clicking a row drills into InvestmentDetailView.
function PortfolioModal({ portfolio, db, onClose }) {
  const { patchItem, addItem, db: liveDb } = useApp();
  const [selectedInv, setSelectedInv] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Always read live data so CRUD updates reflect immediately
  const investments = useMemo(() => {
    return ((liveDb || db).investments || [])
      .filter(inv => inv.type === portfolio.type && !inv.is_hidden);
  }, [liveDb, db, portfolio.type]);

  const cs = PORTFOLIO_PALETTE[0]; // colour for this type

  const fmtMoney = (v) => "$" + Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

  if (selectedInv) {
    return (
      <div style={s3.overlay} onClick={(e)=>{if(e.target===e.currentTarget){setSelectedInv(null);}}}>
        <InvestmentDetailView
          investment={(liveDb||db).investments.find(i=>i.id===selectedInv.id)||selectedInv}
          db={liveDb||db}
          onClose={()=>setSelectedInv(null)}
        />
      </div>
    );
  }

  return (
    <div style={s3.overlay} onClick={(e)=>{if(e.target===e.currentTarget) onClose();}}>
      <div style={s3.panel("900px")}>

        {/* Header */}
        <div style={s3.header}>
          <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
            <div style={{ width:"10px",height:"10px",borderRadius:"50%",background:"#63cab7",flexShrink:0 }} />
            <div>
              <div style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.6rem",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"2px" }}>Portfolio</div>
              <h3 style={{ color:"#eef4f0",margin:0,fontSize:"1.15rem",fontFamily:"'Georgia',serif",fontWeight:400,letterSpacing:"0.05em" }}>{portfolio.type}</h3>
            </div>
          </div>
          <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
            <button onClick={()=>setShowAddForm(!showAddForm)} style={{
              display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",
              background:"rgba(99,202,183,0.1)",border:"1px solid rgba(99,202,183,0.3)",
              borderRadius:"8px",color:"#63cab7",fontSize:"0.72rem",fontFamily:"'Courier New',monospace",cursor:"pointer",
            }}>
              <Edit3 size={12} /> Add Investment
            </button>
            <button onClick={onClose} style={s3.iconBtn()}>
              <LucideX size={16} />
            </button>
          </div>
        </div>

        <div style={{ ...s3.body, maxHeight:"78vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:"16px" }}>

          {/* Add Investment inline form */}
          {showAddForm && (
            <AddInvestmentInline
              type={portfolio.type}
              db={liveDb||db}
              onDone={()=>setShowAddForm(false)}
            />
          )}

          {/* Summary row */}
          <div style={{ display:"flex",gap:"12px",flexWrap:"wrap" }}>
            {[
              { label:"Positions",     val:investments.length },
              { label:"Total Value",   val:fmtMoney(investments.reduce((s,i)=>(s+(parseFloat(i.quantity)||0)*(parseFloat(i.currentPrice)||0)),0)) },
              { label:"Allocation",    val:`${portfolio.allocationPct?.toFixed(1)||"0.0"}%` },
            ].map(m=>(
              <div key={m.label} style={{ padding:"10px 16px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(99,202,183,0.07)",borderRadius:"8px",flex:1 }}>
                <div style={{ color:"rgba(255,255,255,0.3)",fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"4px" }}>{m.label}</div>
                <div style={{ color:"#eef4f0",fontSize:"1rem",fontFamily:"'Georgia',serif",fontWeight:300 }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Data Grid */}
          {investments.length === 0 ? (
            <div style={{ padding:"40px",textAlign:"center",border:"1px dashed rgba(99,202,183,0.1)",borderRadius:"10px",color:"rgba(255,255,255,0.2)",fontFamily:"'Courier New',monospace",fontSize:"0.75rem",letterSpacing:"0.1em" }}>
              No investments in this portfolio. Click "Add Investment" above.
            </div>
          ) : (
            <div style={{ border:"1px solid rgba(99,202,183,0.08)",borderRadius:"10px",overflow:"hidden" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={s3.th}>Name</th>
                    <th style={s3.th}>Principal ($)</th>
                    <th style={s3.th}>Current Value</th>
                    <th style={s3.th}>ROI %</th>
                    <th style={s3.th}>Current Price</th>
                    <th style={s3.th}>Status</th>
                    <th style={{...s3.th,width:"40px"}}></th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv, i) => {
                    const qty = parseFloat(inv.quantity)||0;
                    const cur = parseFloat(inv.currentPrice)||0;
                    const buy = parseFloat(inv.purchasePrice)||0;
                    const curVal = qty * cur;
                    const cost   = qty * buy;
                    const roi    = cost > 0 ? ((curVal - cost) / cost) * 100 : 0;
                    return (
                      <tr key={inv.id||i}
                        style={{ borderBottom:"1px solid rgba(255,255,255,0.03)",cursor:"pointer",animation:"s3SlideIn 0.25s ease both",animationDelay:`${i*0.04}s` }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(99,202,183,0.04)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        onClick={(e)=>{ if(e.target.closest(".no-row-click")) return; setSelectedInv(inv); }}
                      >
                        <td style={{...s3.td,fontWeight:500,color:"#eef4f0"}}>{inv.name}</td>
                        <td style={s3.td}>{fmtMoney(cost)}</td>
                        <td style={s3.td}>{fmtMoney(curVal)}</td>
                        <td style={s3.td}>
                          <span style={{ color:roi>=0?"#63cab7":"#e07070",fontWeight:500 }}>
                            {roi>=0?"+":""}{roi.toFixed(2)}%
                          </span>
                        </td>
                        <td style={s3.td} className="no-row-click">
                          {editingPrice===inv.id ? (
                            <QuickPriceUpdate investment={inv} onDone={()=>setEditingPrice(null)} />
                          ) : (
                            <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                              <span>{fmtMoney(cur)}</span>
                              <button
                                onClick={e=>{ e.stopPropagation(); setEditingPrice(inv.id); }}
                                style={{ ...s3.iconBtn("rgba(99,202,183,0.5)"),padding:"3px" }}
                                title="Quick update price"
                                onMouseEnter={e=>e.currentTarget.style.color="#63cab7"}
                                onMouseLeave={e=>e.currentTarget.style.color="rgba(99,202,183,0.5)"}
                              >
                                <Zap size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={s3.td}><span style={s3.badge(STATUS_COLOR[inv.status]||"#63cab7")}>{inv.status}</span></td>
                        <td style={s3.td} className="no-row-click">
                          <button
                            onClick={e=>{ e.stopPropagation(); if(window.confirm(`Archive "${inv.name}"? It will be hidden but kept for analytics.`)) { patchItem("investments",inv.id,{is_hidden:true}); } }}
                            style={s3.iconBtn("rgba(255,255,255,0.2)")}
                            onMouseEnter={e=>e.currentTarget.style.color="#e07070"}
                            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.2)"}
                            title="Archive (soft delete)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADD INVESTMENT INLINE FORM ───────────────────────────────────────────────
function AddInvestmentInline({ type, db, onDone }) {
  const { addItem } = useApp();
  const EMPTY = { name:"",risk:"",source:"",startDate:"",status:"Active",notes:"",quantity:"",purchasePrice:"",currentPrice:"" };
  const [form, setForm] = useState(EMPTY);
  const f = (k) => (v) => setForm(p=>({...p,[k]:v}));

  const save = () => {
    if (!form.name.trim()) return;
    addItem("investments", { ...form, type });
    setForm(EMPTY);
    onDone();
  };

  return (
    <div style={{ background:"rgba(99,202,183,0.04)",border:"1px solid rgba(99,202,183,0.15)",borderRadius:"12px",padding:"18px",animation:"s3SlideIn 0.2s ease both" }}>
      <div style={{ color:"rgba(99,202,183,0.6)",fontSize:"0.62rem",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"14px",display:"flex",alignItems:"center",gap:"6px" }}>
        <Edit3 size={11} /> New investment in {type}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"10px" }}>
        {[
          { label:"Name *",          key:"name",       type:"text",   placeholder:"e.g. AAPL" },
          { label:"Quantity",        key:"quantity",   type:"number", placeholder:"0" },
          { label:"Purchase Price $",key:"purchasePrice",type:"number",placeholder:"0.00" },
          { label:"Current Price $", key:"currentPrice",type:"number",placeholder:"0.00" },
          { label:"Start Date",      key:"startDate",  type:"date",   placeholder:"" },
        ].map(({label,key,type:t,placeholder})=>(
          <div key={key}>
            <div style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"5px" }}>{label}</div>
            <input type={t} value={form[key]} placeholder={placeholder}
              onChange={e=>f(key)(e.target.value)}
              style={{ width:"100%",padding:"8px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"7px",color:"#eef4f0",fontSize:"0.8rem",fontFamily:"'Courier New',monospace",outline:"none",boxSizing:"border-box" }} />
          </div>
        ))}
        <div>
          <div style={{ color:"rgba(99,202,183,0.5)",fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"'Courier New',monospace",marginBottom:"5px" }}>Risk</div>
          <select value={form.risk} onChange={e=>f("risk")(e.target.value)}
            style={{ width:"100%",padding:"8px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"7px",color:"#eef4f0",fontSize:"0.8rem",fontFamily:"'Courier New',monospace",outline:"none",boxSizing:"border-box" }}>
            <option value="">Select</option>
            {(db?.settings?.risks||[]).map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:"flex",gap:"8px",justifyContent:"flex-end" }}>
        <button onClick={onDone} style={{ ...s3.iconBtn("rgba(255,255,255,0.4)"),padding:"7px 16px",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"7px",fontSize:"0.72rem",fontFamily:"'Courier New',monospace" }}>Cancel</button>
        <button onClick={save} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"7px 16px",background:"rgba(99,202,183,0.14)",border:"1px solid rgba(99,202,183,0.4)",borderRadius:"7px",color:"#63cab7",fontSize:"0.72rem",fontFamily:"'Courier New',monospace",cursor:"pointer" }}>
          <Check size={12} /> Save Investment
        </button>
      </div>
    </div>
  );
}

// ─── TABLE ─────────────────────────────────────────────────────────────────────
function Table({ columns, rows, onDelete }) {
  if (rows.length === 0) {
    return (
      <div style={{
        padding: "32px", textAlign: "center",
        border: "1px dashed rgba(99,202,183,0.12)", borderRadius: "10px",
        color: "rgba(255,255,255,0.2)", fontFamily: "'Courier New', monospace", fontSize: "0.75rem", letterSpacing: "0.1em",
      }}>
        No records yet.
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto", border: "1px solid rgba(99,202,183,0.1)", borderRadius: "10px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Courier New', monospace", fontSize: "0.78rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(99,202,183,0.12)" }}>
            {columns.map(c => (
              <th key={c} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(99,202,183,0.6)", letterSpacing: "0.12em", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600" }}>{c}</th>
            ))}
            {onDelete && <th style={{ width: "40px" }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "11px 16px", color: "rgba(255,255,255,0.65)" }}>{cell}</td>
              ))}
              {onDelete && (
                <td style={{ padding: "8px 12px" }}>
                  <button onClick={() => onDelete(i)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,80,80,0.4)", padding: "4px" }}
                    onMouseEnter={e => e.currentTarget.style.color = "rgba(255,80,80,0.9)"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,80,80,0.4)"}
                  ><Icon.Trash /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{
        background: "#0f1520",
        border: "1px solid rgba(99,202,183,0.2)",
        borderRadius: "14px",
        padding: "28px", width: "100%", maxWidth: "440px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ color: "#e8f0ec", fontSize: "1rem", fontFamily: "'Georgia', serif", fontWeight: "400", letterSpacing: "0.06em" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}><Icon.X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── FORM FIELD ────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", color: "rgba(99,202,183,0.6)", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Courier New', monospace", marginBottom: "6px" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px", color: "#e8f0ec",
  fontSize: "0.85rem", fontFamily: "'Courier New', monospace",
  outline: "none", boxSizing: "border-box",
};

const selectStyle = { ...inputStyle };

function Btn({ children, onClick, variant = "primary", type = "button" }) {
  const styles = {
    primary: { background: "rgba(99,202,183,0.15)", border: "1px solid rgba(99,202,183,0.4)", color: "#63cab7" },
    danger: { background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,100,100,0.8)" },
    ghost: { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" },
  };
  return (
    <button type={type} onClick={onClick} style={{
      ...styles[variant],
      padding: "9px 18px", borderRadius: "8px",
      fontSize: "0.78rem", letterSpacing: "0.08em",
      cursor: "pointer", fontFamily: "'Courier New', monospace",
      transition: "all 0.15s",
    }}>
      {children}
    </button>
  );
}

// ─── INVESTMENTS TAB ───────────────────────────────────────────────────────────
function InvestmentsTab() {
  const { db, addItem, softDelete } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", risk: "", source: "", startDate: "", status: "Active", notes: "", quantity: "", purchasePrice: "", currentPrice: "" });

  const handleAdd = () => {
    if (!form.name) return;
    addItem("investments", form);
    setForm({ name: "", type: "", risk: "", source: "", startDate: "", status: "Active", notes: "", quantity: "", purchasePrice: "", currentPrice: "" });
    setShowModal(false);
  };

  // Soft delete — sets is_hidden=true, preserves historical data
  const handleDelete = (i) => {
    const inv = (db?.investments||[]).filter(x=>!x.is_hidden)[i];
    if (inv) softDelete("investments", inv.id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h2 style={{ color: "#e8f0ec", fontSize: "1.3rem", fontWeight: "400", letterSpacing: "0.08em", fontFamily: "'Georgia', serif", marginBottom: "4px" }}>Investments</h2>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontFamily: "'Courier New', monospace" }}>{db?.investments.length || 0} records</p>
        </div>
        <Btn onClick={() => setShowModal(true)}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Icon.Plus /> Add Investment</span></Btn>
      </div>

      <Table
        columns={["Name", "Type", "Risk", "Qty", "Purchase $", "Current $", "Status"]}
        rows={(db?.investments || []).filter(inv=>!inv.is_hidden).map(inv => [inv.name, inv.type, inv.risk, inv.quantity||"—", inv.purchasePrice||"—", inv.currentPrice||"—", inv.status])}
        onDelete={handleDelete}
      />

      {showModal && (
        <Modal title="New Investment" onClose={() => setShowModal(false)}>
          <Field label="Name">
            <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AAPL Stock" />
          </Field>
          <Field label="Type">
            <select style={selectStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="">Select type</option>
              {db?.settings.types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Risk">
            <select style={selectStyle} value={form.risk} onChange={e => setForm(p => ({ ...p, risk: e.target.value }))}>
              <option value="">Select risk</option>
              {db?.settings.risks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select style={selectStyle} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
              <option value="">Select source</option>
              {db?.settings.sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <Field label="Quantity">
              <input type="number" style={inputStyle} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Purchase $">
              <input type="number" style={inputStyle} value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Current $">
              <input type="number" style={inputStyle} value={form.currentPrice} onChange={e => setForm(p => ({ ...p, currentPrice: e.target.value }))} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Start Date">
            <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          </Field>
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {["Active", "Paused", "Closed"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes">
            <input style={inputStyle} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          </Field>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={handleAdd}>Save Investment</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── FUNDING TAB ───────────────────────────────────────────────────────────────
function FundingTab() {
  const { db, addItem, softDelete } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: "", amount: "", source: "", notes: "" });

  const investmentNames = (db?.investments || []).filter(i=>!i.is_hidden).map(i => i.name);

  const handleAdd = () => {
    if (!form.amount) return;
    addItem("funding", form);
    setForm({ date: "", amount: "", source: "", notes: "" });
    setShowModal(false);
  };

  const handleDelete = (i) => {
    const item = (db?.funding||[]).filter(x=>!x.is_hidden)[i];
    if(item) softDelete("funding", item.id);
  };

  const total = (db?.funding || []).filter(x=>!x.is_hidden).reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h2 style={{ color: "#e8f0ec", fontSize: "1.3rem", fontWeight: "400", letterSpacing: "0.08em", fontFamily: "'Georgia', serif", marginBottom: "4px" }}>Funding</h2>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontFamily: "'Courier New', monospace" }}>
            Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Btn onClick={() => setShowModal(true)}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Icon.Plus /> Add Funding</span></Btn>
      </div>

      <Table
        columns={["Date", "Amount ($)", "Investment", "Notes"]}
        rows={(db?.funding || []).filter(x=>!x.is_hidden).map(f => [f.date, f.amount, f.investmentName || "—", f.notes || "—"])}
        onDelete={handleDelete}
      />

      {showModal && (
        <Modal title="New Funding Entry" onClose={() => setShowModal(false)}>
          <Field label="Date">
            <input type="date" style={inputStyle} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </Field>
          <Field label="Amount ($)">
            <input type="number" style={inputStyle} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
          </Field>
          <Field label="Investment">
            <select style={selectStyle} value={form.investmentName} onChange={e => setForm(p => ({ ...p, investmentName: e.target.value }))}>
              <option value="">Select investment</option>
              {investmentNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select style={selectStyle} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
              <option value="">Select source</option>
              {db?.settings.sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes">
            <input style={inputStyle} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          </Field>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={handleAdd}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DIVIDENDS TAB ─────────────────────────────────────────────────────────────
function DividendsTab() {
  const { db, addItem, softDelete } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: "", amount: "", investmentName: "", notes: "", status: "received", dueDate: "" });

  const handleAdd = () => {
    if (!form.amount) return;
    addItem("dividends", form);
    setForm({ date: "", amount: "", investmentName: "", notes: "", status: "received", dueDate: "" });
    setShowModal(false);
  };

  const handleDelete = (i) => {
    const item = (db?.dividends||[]).filter(x=>!x.is_hidden)[i];
    if(item) softDelete("dividends", item.id);
  };

  const total = (db?.dividends || []).filter(x=>!x.is_hidden).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h2 style={{ color: "#e8f0ec", fontSize: "1.3rem", fontWeight: "400", letterSpacing: "0.08em", fontFamily: "'Georgia', serif", marginBottom: "4px" }}>Dividends</h2>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontFamily: "'Courier New', monospace" }}>
            Total received: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Btn onClick={() => setShowModal(true)}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Icon.Plus /> Add Dividend</span></Btn>
      </div>

      <Table
        columns={["Date", "Amount ($)", "Investment", "Notes"]}
        rows={(db?.dividends || []).filter(x=>!x.is_hidden).map(d => [d.date, d.amount, d.investmentName || "—", d.notes || "—"])}
        onDelete={handleDelete}
      />

      {showModal && (
        <Modal title="New Dividend Payment" onClose={() => setShowModal(false)}>
          <Field label="Date">
            <input type="date" style={inputStyle} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </Field>
          <Field label="Amount ($)">
            <input type="number" style={inputStyle} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
          </Field>
          <Field label="Investment">
            <select style={selectStyle} value={form.investmentName} onChange={e => setForm(p => ({ ...p, investmentName: e.target.value }))}>
              <option value="">Select investment</option>
              {(db?.investments || []).map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {["received", "scheduled", "missed"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {form.status === "scheduled" && (
            <Field label="Due Date">
              <input type="date" style={inputStyle} value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </Field>
          )}
          <Field label="Notes">
            <input style={inputStyle} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
          </Field>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={handleAdd}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const { db, updateDb } = useApp();
  const [newItem, setNewItem] = useState({ types: "", risks: "", sources: "" });

  const addItem = (key) => {
    const val = newItem[key].trim();
    if (!val) return;
    updateDb(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: [...prev.settings[key], val] },
    }));
    setNewItem(p => ({ ...p, [key]: "" }));
  };

  const removeItem = (key, idx) => {
    updateDb(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: prev.settings[key].filter((_, i) => i !== idx) },
    }));
  };

  const sections = [
    { key: "types", label: "Investment Types" },
    { key: "risks", label: "Risk Levels" },
    { key: "sources", label: "Funding Sources" },
  ];

  return (
    <div>
      <h2 style={{ color: "#e8f0ec", fontSize: "1.3rem", fontWeight: "400", letterSpacing: "0.08em", fontFamily: "'Georgia', serif", marginBottom: "6px" }}>Settings</h2>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontFamily: "'Courier New', monospace", marginBottom: "28px" }}>Customize your taxonomy</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
        {sections.map(({ key, label }) => (
          <div key={key} style={{
            padding: "20px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(99,202,183,0.1)",
            borderRadius: "12px",
          }}>
            <h3 style={{ color: "rgba(99,202,183,0.7)", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Courier New', monospace", marginBottom: "16px" }}>{label}</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {(db?.settings[key] || []).map((item, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px",
                  background: "rgba(99,202,183,0.08)", border: "1px solid rgba(99,202,183,0.2)",
                  borderRadius: "100px", color: "rgba(99,202,183,0.8)",
                  fontSize: "0.72rem", fontFamily: "'Courier New', monospace",
                }}>
                  {item}
                  <button onClick={() => removeItem(key, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(99,202,183,0.5)", padding: "0", lineHeight: "1", fontSize: "0.9rem" }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: "0.78rem" }}
                value={newItem[key]}
                onChange={e => setNewItem(p => ({ ...p, [key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addItem(key)}
                placeholder={`Add ${label.toLowerCase()}...`}
              />
              <Btn onClick={() => addItem(key)}><Icon.Plus /></Btn>
            </div>
          </div>
        ))}
      </div>

      {/* DB info */}
      <div style={{ marginTop: "28px", padding: "16px 20px", background: "rgba(99,202,183,0.03)", border: "1px solid rgba(99,202,183,0.08)", borderRadius: "10px" }}>
        <p style={{ color: "rgba(99,202,183,0.5)", fontSize: "0.7rem", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>
          📁 Data stored in: <strong style={{ color: "rgba(99,202,183,0.8)" }}>{DB_FILENAME}</strong> on your Google Drive
        </p>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
function MainApp() {
  const { syncError } = useApp();
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = {
    dashboard: <Dashboard />,
    investments: <InvestmentsTab />,
    funding: <FundingTab />,
    dividends: <DividendsTab />,
    settings: <SettingsTab />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0f1c" }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
        {syncError && (
          <div style={{
            marginBottom: "20px", padding: "10px 16px",
            background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)",
            borderRadius: "8px", color: "rgba(255,100,100,0.8)",
            fontSize: "0.75rem", fontFamily: "'Courier New', monospace",
            display: "flex", justifyContent: "space-between",
          }}>
            {syncError}
          </div>
        )}
        {tabs[activeTab]}
      </main>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { user, token, dbLoading, db } = useApp();

  if (!user || !token) return <LoginPage />;
  if (dbLoading || !db) return <LoadingScreen message="LOADING YOUR PORTFOLIO..." />;
  return <MainApp />;
}

// في آخر الملف خالص:
import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
