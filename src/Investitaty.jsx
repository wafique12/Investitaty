import { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  X, Trash2, Check, Edit3, MoreVertical, Zap, BookOpen,
  RefreshCw, ChevronDown, ChevronRight, Plus, Settings,
  TrendingUp, Wallet, DollarSign, BarChart2, Globe, LogOut,
  Cloud, Shield, Layers, Tag, FolderOpen, ArrowUpRight, PieChart as PieChartIcon,
  ArrowDownRight, Eye, EyeOff, AlertCircle, CheckCircle2,
  Menu, Search, Landmark, ListTree, CircleDollarSign,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const CLIENT_ID = "535223974831-1h74evq1hj8o493p66e6090h47ttrael.apps.googleusercontent.com";
const API_KEY = "AIzaSyDx1Oy9_0OwRa_CMKNL8wzxdfVOl5S3-gQ";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const DB_FILENAME = "investitaty_db.json";

// ─── New nested schema ────────────────────────────────────────────────────────
// portfolios[]  → investments[]  → transactions[]
// lookup categories stored in settings for dropdown menus
const INITIAL_SCHEMA = {
  settings: {
    portfolioTypes:   ["Real Estate", "Stocks", "Crypto", "Bonds", "Commodities", "ETF", "Private Equity"],
    riskLevels:       ["Low", "Medium", "High", "Speculative"],
    fundingSources:   ["Personal Savings", "Bank Loan", "Brokerage", "Exchange", "Partner Capital"],
    investmentStatuses: ["Active", "Paused", "Closed"],
    transactionStatuses: ["recorded", "scheduled", "cancelled"],
    transactionCategories: ["Rental Income", "Dividend", "Capital Gain", "Interest", "Maintenance", "Management Fee", "Tax", "Insurance", "Other"],
    currencies:       ["USD", "SAR", "AED", "EUR", "GBP"],
  },
  portfolios:   [],   // { id, name, type, currency, risk, notes, created_at, is_hidden }
  investments:  [],   // { id, portfolioId, name, quantity, purchasePrice, currentPrice, purchaseDate, risk, funding:[{source,amount}], notes, status, is_hidden, created_at }
  transactions: [],   // { id, investmentId, portfolioId, category, amount, date, type:"income"|"expense", notes, status:"recorded"|"scheduled"|"cancelled", is_hidden, created_at }
};

// ═══════════════════════════════════════════════════════════════════════════════
// i18n — Arabic / English
// ═══════════════════════════════════════════════════════════════════════════════
const TRANSLATIONS = {
  en: {
    appName: "INVESTATY",
    appTagline: "Professional Investment Manager",
    signIn: "Sign in with Google",
    connecting: "Connecting...",
    loadingApis: "Loading Google APIs...",
    privacyFirst: "Privacy-First",
    driveSynced: "Drive-Synced",
    privacyNote: "Your data is stored exclusively in your own Google Drive. We never see your investments. <br/> Developed and Owned by Wafiq Abdulrahman",
    loading: "LOADING YOUR PORTFOLIO...",
    synced: "SYNCED",
    syncing: "SYNCING...",
    signOut: "Sign Out",
    dashboard: "Dashboard",
    portfolios: "Portfolios",
    investments: "Investments",
    transactions: "Transactions",
    statistics: "Statistics",
    settings: "Settings",
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    totalPortfolioValue: "Total Portfolio Value",
    totalNetProfit: "Total Net Profit",
    totalIncome: "Total Income",
    capitalGains: "Capital Gains",
    activePositions: "active positions",
    dividendsCapital: "income + capital gains",
    unrealised: "unrealised",
    payments: "payments",
    portfolioOverview: "Portfolio Overview",
    portfolioList: "Portfolios",
    scrollHint: "← scroll →",
    noPortfolioData: "No portfolios yet. Create your first portfolio below.",
    assetAllocation: "Asset Allocation",
    upcomingCashFlow: "Upcoming Cash Flow",
    fundingPerformance: "Funding Performance",
    statisticsCenter: "Statistics Center",
    yearFilter: "Year Filter",
    allYears: "All Years",
    yearLabel: "Year",
    riskLevelLabel: "Risk Level",
    lowLabel: "Low",
    mediumLabel: "Medium",
    highLabel: "High",
    transactionStatusLabel: "Transaction Status",
    totalCapitalLabel: "Total Capital",
    grandTotalLabel: "Grand Total",
    totalLabel: "Total",
    investmentVolumeRiskMatrix: "Investment Volume vs Risk Matrix",
    annualProfitsByRiskLevel: "Annual Profits by Risk Level",
    totalInvestmentByFundingSource: "Total Investment by Funding Source",
    assetAllocationByPortfolio: "Asset Allocation (By Portfolio)",
    annualProfitsByStatus: "Annual Profits by Transaction Status",
    lossAnalysisMatrix: "Loss Analysis Matrix",
    assetAllocationOverview: "Asset Allocation Overview",
    centralizedCategoryAnalytics: "Centralized Item/Category Analytics",
    categoryNameLabel: "Category Name",
    breakdownByInvestment: "Breakdown by Investment",
    uncategorized: "Uncategorized",
    unassignedInvestment: "Unassigned Investment",
    noScheduled: "No scheduled transactions.",
    noFunding: "No funding records yet.",
    noAllocation: "No allocation data yet.",
    addPortfolio: "Add Portfolio",
    addInvestment: "Add Investment",
    addTransaction: "Add Transaction",
    name: "Name",
    type: "Type",
    risk: "Risk Level",
    currency: "Currency",
    notes: "Notes",
    source: "Funding Source",
    splitFunding: "Split Funding",
    addSplit: "Add Split",
    riskLow: "Low",
    riskMedium: "Medium",
    riskHigh: "High",
    riskSpeculative: "Speculative",
    investmentStatuses: "Investment Statuses",
    transactionStatuses: "Transaction Statuses",
    collapseSidebar: "Toggle sidebar",
    pinSidebar: "Pin sidebar",
    unpinSidebar: "Auto-hide sidebar",
    addInvestmentAction: "Add investment",
    addTransactionAction: "Add transaction",
    quantity: "Quantity",
    purchasePrice: "Purchase Price",
    currentPrice: "Current Price",
    purchaseDate: "Purchase Date",
    status: "Status",
    category: "Category",
    amount: "Amount",
    date: "Date",
    transactionType: "Type",
    income: "Income",
    expense: "Expense",
    scheduled: "Scheduled",
    recorded: "Recorded",
    cancelled: "Cancelled",
    active: "Active",
    paused: "Paused",
    closed: "Closed",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    archive: "Archive",
    markCollected: "Mark as Collected",
    markScheduled: "Mark as Scheduled",
    cancelItem: "Cancel",
    portfolio: "Portfolio",
    investment: "Investment",
    roi: "ROI %",
    principal: "Principal",
    currentValue: "Current Value",
    noRecords: "No records yet.",
    fundingBreakdown: "Funding Breakdown",
    transactionLedger: "Transaction Ledger",
    quickUpdatePrice: "Quick update price",
    archiveInvestment: "Archive Investment",
    settingsTitle: "Settings & Lookup Categories",
    settingsDesc: "Manage dropdown options used across all forms",
    portfolioTypes: "Portfolio Types",
    riskLevels: "Risk Levels",
    fundingSources: "Funding Sources",
    transactionCategories: "Transaction Categories",
    currencies: "Currencies",
    addItem: "Add",
    renameItem: "Rename item",
    noItemsYet: "No items yet",
    dataStorage: "Data stored in",
    language: "Language",
    selectPortfolio: "Select Portfolio",
    selectType: "Select type",
    selectRisk: "Select risk",
    selectSource: "Select source",
    selectCategory: "Select category",
    selectCurrency: "Select currency",
    selectStatus: "Select status",
    optional: "optional",
    positions: "Positions",
    allocation: "Allocation",
    totalValue: "Total Value",
    dominantRisk: "Risk",
    noInvestments: "No investments yet.",
    dueDate: "Due Date",
    authTimeout: "Sign-in timed out. Please try again.",
    authError: "Auth error",
    profileError: "Signed in but could not fetch profile. Check API key.",
    failedGIS: "Failed to load Google Identity Services.",
    failedGAPI: "Failed to load Google API.",
    failedDrive: "Failed to access Google Drive. Please try again.",
    syncFailed: "Sync failed. Changes may not be saved.",
    days: "d",
    overdue: "Overdue",
    today: "Today",
    deployed: "deployed",
  },
  ar: {
    appName: "إستثماراتي",
    appTagline: "مدير الاستثمار الاحترافي",
    signIn: "تسجيل الدخول بجوجل",
    connecting: "جارٍ الاتصال...",
    loadingApis: "تحميل واجهات Google...",
    privacyFirst: "خصوصية أولاً",
    driveSynced: "مزامنة Drive",
    privacyNote: "بياناتك محفوظة في Google Drive الخاص بك فقط. نحن لا نرى استثماراتك. <br/> مطور ومملوك بواسطة وفيق عبد الرحمن",
    loading: "جارٍ تحميل محفظتك...",
    synced: "تمت المزامنة",
    syncing: "جارٍ المزامنة...",
    signOut: "تسجيل الخروج",
    dashboard: "لوحة التحكم",
    portfolios: "المحافظ",
    investments: "الاستثمارات",
    transactions: "المعاملات",
    statistics: "الإحصائيات",
    settings: "الإعدادات",
    goodMorning: "صباح الخير",
    goodAfternoon: "مساء الخير",
    goodEvening: "طاب مساؤك",
    totalPortfolioValue: "إجمالي قيمة المحفظة",
    totalNetProfit: "صافي الربح الإجمالي",
    totalIncome: "إجمالي الدخل",
    capitalGains: "مكاسب رأس المال",
    activePositions: "مركز نشط",
    dividendsCapital: "دخل + مكاسب رأسمالية",
    unrealised: "غير محقق",
    payments: "دفعات",
    portfolioOverview: "نظرة عامة على المحفظة",
    portfolioList: "المحافظ",
    scrollHint: "← تمرير →",
    noPortfolioData: "لا توجد محافظ بعد. أنشئ محفظتك الأولى أدناه.",
    assetAllocation: "توزيع الأصول",
    upcomingCashFlow: "التدفق النقدي القادم",
    fundingPerformance: "أداء التمويل",
    statisticsCenter: "مركز الإحصائيات",
    yearFilter: "مرشح السنة",
    allYears: "كل السنوات",
    yearLabel: "السنة",
    riskLevelLabel: "مستوى المخاطرة",
    lowLabel: "منخفض",
    mediumLabel: "متوسط",
    highLabel: "مرتفع",
    transactionStatusLabel: "حالة المعاملة",
    totalCapitalLabel: "إجمالي رأس المال",
    grandTotalLabel: "الإجمالي الكلي",
    totalLabel: "الإجمالي",
    investmentVolumeRiskMatrix: "مصفوفة حجم الاستثمار مقابل المخاطرة",
    annualProfitsByRiskLevel: "الأرباح السنوية حسب المخاطرة",
    totalInvestmentByFundingSource: "إجمالي الاستثمار حسب مصدر التمويل",
    assetAllocationByPortfolio: "توزيع الأصول (حسب المحفظة)",
    annualProfitsByStatus: "الأرباح السنوية حسب حالة المعاملة",
    lossAnalysisMatrix: "مصفوفة تحليل الخسائر",
    assetAllocationOverview: "نظرة توزيع الأصول",
    centralizedCategoryAnalytics: "تحليلات العناصر/الفئات المركزية",
    categoryNameLabel: "اسم الفئة",
    breakdownByInvestment: "تفصيل حسب الاستثمار",
    uncategorized: "غير مصنف",
    unassignedInvestment: "استثمار غير محدد",
    noScheduled: "لا توجد معاملات مجدولة.",
    noFunding: "لا توجد سجلات تمويل بعد.",
    noAllocation: "لا توجد بيانات توزيع بعد.",
    addPortfolio: "إضافة محفظة",
    addInvestment: "إضافة استثمار",
    addTransaction: "إضافة معاملة",
    name: "الاسم",
    type: "النوع",
    risk: "مستوى المخاطرة",
    currency: "العملة",
    notes: "ملاحظات",
    source: "مصدر التمويل",
    splitFunding: "تقسيم التمويل",
    addSplit: "إضافة تقسيم",
    riskLow: "منخفض",
    riskMedium: "متوسط",
    riskHigh: "مرتفع",
    riskSpeculative: "مضاربي",
    investmentStatuses: "حالات الاستثمار",
    transactionStatuses: "حالات المعاملة",
    collapseSidebar: "تبديل الشريط الجانبي",
    pinSidebar: "تثبيت الشريط الجانبي",
    unpinSidebar: "إخفاء تلقائي للشريط الجانبي",
    addInvestmentAction: "إضافة استثمار",
    addTransactionAction: "إضافة معاملة",
    quantity: "الكمية",
    purchasePrice: "سعر الشراء",
    currentPrice: "السعر الحالي",
    purchaseDate: "تاريخ الشراء",
    status: "الحالة",
    category: "الفئة",
    amount: "المبلغ",
    date: "التاريخ",
    transactionType: "النوع",
    income: "دخل",
    expense: "مصروف",
    scheduled: "مجدول",
    recorded: "مسجل",
    cancelled: "ملغى",
    active: "نشط",
    paused: "موقوف",
    closed: "مغلق",
    save: "حفظ",
    cancel: "إلغاء",
    close: "إغلاق",
    edit: "تعديل",
    archive: "أرشفة",
    markCollected: "تحديد كمحصّل",
    markScheduled: "تحديد كمجدول",
    cancelItem: "إلغاء",
    portfolio: "المحفظة",
    investment: "الاستثمار",
    roi: "نسبة العائد %",
    principal: "رأس المال",
    currentValue: "القيمة الحالية",
    noRecords: "لا توجد سجلات بعد.",
    fundingBreakdown: "تفصيل التمويل",
    transactionLedger: "سجل المعاملات",
    quickUpdatePrice: "تحديث السعر سريعاً",
    archiveInvestment: "أرشفة الاستثمار",
    settingsTitle: "الإعدادات وفئات القوائم",
    settingsDesc: "إدارة خيارات القوائم المنسدلة المستخدمة في جميع النماذج",
    portfolioTypes: "أنواع المحافظ",
    riskLevels: "مستويات المخاطرة",
    fundingSources: "مصادر التمويل",
    transactionCategories: "فئات المعاملات",
    currencies: "العملات",
    addItem: "إضافة",
    renameItem: "إعادة تسمية العنصر",
    noItemsYet: "لا توجد عناصر بعد",
    dataStorage: "البيانات محفوظة في",
    language: "اللغة",
    selectPortfolio: "اختر المحفظة",
    selectType: "اختر النوع",
    selectRisk: "اختر المخاطرة",
    selectSource: "اختر المصدر",
    selectCategory: "اختر الفئة",
    selectCurrency: "اختر العملة",
    selectStatus: "اختر الحالة",
    optional: "اختياري",
    positions: "مراكز",
    allocation: "التخصيص",
    totalValue: "القيمة الإجمالية",
    dominantRisk: "المخاطرة",
    noInvestments: "لا توجد استثمارات بعد.",
    dueDate: "تاريخ الاستحقاق",
    authTimeout: "انتهت مهلة تسجيل الدخول. حاول مرة أخرى.",
    authError: "خطأ في المصادقة",
    profileError: "تم تسجيل الدخول لكن تعذّر جلب الملف الشخصي.",
    failedGIS: "فشل تحميل خدمات Google.",
    failedGAPI: "فشل تحميل Google API.",
    failedDrive: "فشل الوصول إلى Google Drive.",
    syncFailed: "فشلت المزامنة. ربما لم تُحفظ التغييرات.",
    days: "يوم",
    overdue: "متأخر",
    today: "اليوم",
    deployed: "مُودَع",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — Professional Wealth Management Theme
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  // Backgrounds
  bgApp:      "#f1f5f9",   // slate-100 — main content area
  bgSidebar:  "#0f172a",   // deep navy
  bgCard:     "#ffffff",
  bgCardHover:"#f8fafc",
  bgInput:    "#f8fafc",
  bgOverlay:  "rgba(15,23,42,0.75)",

  // Borders
  border:     "#e2e8f0",
  borderDark: "rgba(255,255,255,0.08)",

  // Text
  textPrimary:   "#0f172a",
  textSecondary: "#64748b",
  textMuted:     "#94a3b8",
  textSidebar:   "rgba(255,255,255,0.85)",
  textSidebarMuted:"rgba(255,255,255,0.45)",

  // Accent
  emerald:    "#10b981",
  emeraldDim: "#059669",
  emeraldBg:  "rgba(16,185,129,0.1)",
  emeraldBorder:"rgba(16,185,129,0.3)",

  // Semantic
  positive:   "#10b981",
  negative:   "#ef4444",
  warning:    "#f59e0b",
  info:       "#3b82f6",

  // Chart palette
  chart: ["#10b981","#3b82f6","#8b5cf6","#f59e0b","#ec4899","#06b6d4","#84cc16","#f97316"],

  // Typography
  fontSans:  "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  fontMono:  "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  fontAr:    "'Cairo', 'Noto Kufi Arabic', 'Segoe UI', sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════
const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE SERVICE (unchanged from Sprint 3)
// ═══════════════════════════════════════════════════════════════════════════════
async function findOrCreateDB(token) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DB_FILENAME}'+and+trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const fileId = searchData.files[0].id;
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await fileRes.json();
    // Migrate old schema if needed
    const migrated = migrateSchema(data);
    return { fileId, data: migrated };
  }
  const boundary = "investitaty_boundary";
  const metadata = JSON.stringify({ name: DB_FILENAME, mimeType: "application/json" });
  const body_content = JSON.stringify(INITIAL_SCHEMA);
  const multipart = [
    `--${boundary}`, "Content-Type: application/json; charset=UTF-8", "", metadata,
    `--${boundary}`, "Content-Type: application/json", "", body_content, `--${boundary}--`,
  ].join("\r\n");
  const createRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart }
  );
  const created = await createRes.json();
  return { fileId: created.id, data: INITIAL_SCHEMA };
}

// Migrate v1/v2/v3 flat schema → v4 nested schema
function migrateSchema(data) {
  const out = {
    settings: { ...INITIAL_SCHEMA.settings, ...(data.settings || {}) },
    portfolios:   data.portfolios   || [],
    investments:  [],
    transactions: [],
  };

  // Ensure all new settings keys exist
  for (const k of Object.keys(INITIAL_SCHEMA.settings)) {
    if (!out.settings[k]) out.settings[k] = INITIAL_SCHEMA.settings[k];
  }

  // Migrate old flat investments → new investments (no portfolioId = they become orphans in a "Migrated" portfolio)
  if (data.investments && data.investments.length > 0 && out.portfolios.length === 0) {
    const migratedPortfolio = {
      id: "migrated_" + Date.now(),
      name: "Migrated Portfolio",
      type: "Stocks",
      currency: "USD",
      risk: "Medium",
      notes: "Auto-migrated from previous version",
      created_at: new Date().toISOString(),
    };
    out.portfolios.push(migratedPortfolio);
    out.investments = data.investments.map(inv => ({
      ...inv,
      portfolioId: migratedPortfolio.id,
    }));
    // Migrate old dividends/funding → transactions
    const oldDivs = data.dividends || [];
    const oldFunding = data.funding || [];
    oldDivs.forEach(d => {
      out.transactions.push({
        id: d.id || Date.now() + Math.random(),
        investmentId: (out.investments.find(i => i.name === d.investmentName) || {}).id || null,
        portfolioId: migratedPortfolio.id,
        category: "Dividend",
        amount: d.amount,
        date: d.date,
        dueDate: d.dueDate,
        type: "income",
        notes: d.notes,
        status: d.status || "recorded",
        created_at: new Date().toISOString(),
      });
    });
    oldFunding.forEach(f => {
      out.transactions.push({
        id: f.id || Date.now() + Math.random(),
        investmentId: (out.investments.find(i => i.name === f.investmentName) || {}).id || null,
        portfolioId: migratedPortfolio.id,
        category: "Capital Gain",
        amount: f.amount,
        date: f.date,
        type: "income",
        notes: f.notes,
        status: "recorded",
        created_at: new Date().toISOString(),
      });
    });
  } else {
    out.investments = data.investments || [];
    out.transactions = data.transactions || data.dividends || [];
  }

  out.investments = (out.investments || []).map(inv => ({
    ...inv,
    risk: inv.risk || "Medium",
    funding: Array.isArray(inv.funding)
      ? inv.funding
      : (inv.source ? [{ source: inv.source, amount: "" }] : []),
    status: inv.status || out.settings.investmentStatuses?.[0] || "Active",
  }));
  out.transactions = (out.transactions || []).map(tx => ({
    ...tx,
    status: tx.status || out.settings.transactionStatuses?.[0] || "recorded",
  }));


  return out;
}

async function saveDB(token, fileId, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: blob }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HOOK (unchanged from Sprint 3 — battle-tested)
// ═══════════════════════════════════════════════════════════════════════════════
function useGoogleAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [gapiReady, setGapiReady] = useState(false);
  const tokenClientRef = useRef(null);
  const authTimeoutRef = useRef(null);

  useEffect(() => {
    let gisLoaded = false;
    let gapiLoaded = false;
    const trySetReady = () => { if (gisLoaded && gapiLoaded) setGapiReady(true); };

    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true; gisScript.defer = true;
    gisScript.onload = () => { gisLoaded = true; trySetReady(); };
    gisScript.onerror = () => setAuthError("Failed to load Google Identity Services.");
    document.head.appendChild(gisScript);

    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.async = true; gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load("client", async () => {
        try { await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [] }); } catch (_) {}
        gapiLoaded = true; trySetReady();
      });
    };
    gapiScript.onerror = () => setAuthError("Failed to load Google API.");
    document.head.appendChild(gapiScript);
    return () => { if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current); };
  }, []);

  const signIn = useCallback(() => {
    if (!gapiReady) return;
    setAuthLoading(true); setAuthError(null);
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      setAuthLoading(false);
      setAuthError("Sign-in timed out. Please try again.");
    }, 30000);
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: [SCOPES, "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"].join(" "),
        prompt: "",
        callback: async (response) => {
          if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
          if (response.error) { setAuthLoading(false); setAuthError(`Auth error: ${response.error}`); return; }
          const accessToken = response.access_token;
          try {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!userRes.ok) throw new Error(`userinfo ${userRes.status}`);
            const userInfo = await userRes.json();
            setUser(userInfo); setToken(accessToken);
          } catch (err) {
            setAuthError("Signed in but could not fetch profile. Check API key.");
            setToken(accessToken);
          } finally { setAuthLoading(false); }
        },
      });
    }
    tokenClientRef.current.requestAccessToken({ prompt: "" });
  }, [gapiReady]);

  const signOut = useCallback(() => {
    if (token) { try { window.google.accounts.oauth2.revoke(token); } catch(_) {} }
    setUser(null); setToken(null); setAuthError(null); tokenClientRef.current = null;
  }, [token]);

  return { user, token, authLoading, authError, gapiReady, signIn, signOut };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════
function AppProvider({ children }) {
  const auth = useGoogleAuth();
  const [db, setDb] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const saveTimerRef = useRef(null);

  const t = TRANSLATIONS[lang];
  const isRTL = lang === "ar";
  const font = isRTL ? T.fontAr : T.fontSans;

  useEffect(() => {
    if (!auth.token) return;
    setDbLoading(true);
    findOrCreateDB(auth.token)
      .then(({ fileId: fid, data }) => { setFileId(fid); setDb(data); setDbLoading(false); })
      .catch(() => { setSyncError("Failed to access Google Drive."); setDbLoading(false); });
  }, [auth.token]);

  const updateDb = useCallback((updater) => {
    setDb((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!auth.token || !fileId) return;
        setSyncing(true);
        try { await saveDB(auth.token, fileId, next); }
        catch { setSyncError("Sync failed."); }
        finally { setSyncing(false); }
      }, 800);
      return next;
    });
  }, [auth.token, fileId]);

  const softDelete = useCallback((collection, id) => {
    updateDb(prev => ({
      ...prev,
      [collection]: prev[collection].map(item => item.id === id ? { ...item, is_hidden: true } : item),
    }));
  }, [updateDb]);

  const patchItem = useCallback((collection, id, patch) => {
    updateDb(prev => ({
      ...prev,
      [collection]: prev[collection].map(item => item.id === id ? { ...item, ...patch } : item),
    }));
  }, [updateDb]);

  const addItem = useCallback((collection, item) => {
    const newItem = { ...item, id: Date.now() + "_" + Math.random().toString(36).slice(2), created_at: new Date().toISOString() };
    updateDb(prev => ({ ...prev, [collection]: [...prev[collection], newItem] }));
    return newItem;
  }, [updateDb]);

  const value = {
    ...auth, db, fileId, syncing, syncError, dbLoading,
    updateDb, softDelete, patchItem, addItem,
    lang, setLang, t, isRTL, font,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE FONTS LOADER
// ═══════════════════════════════════════════════════════════════════════════════
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cairo:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

function Chip({ children, color = T.emerald }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",padding:"2px 10px",
      borderRadius:"100px",fontSize:"0.7rem",fontWeight:500,
      background:`${color}15`,border:`1px solid ${color}35`,color,
      letterSpacing:"0.02em",
    }}>{children}</span>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", icon, disabled = false, style: extra = {} }) {
  const base = {
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px",
    borderRadius:"8px",fontWeight:500,cursor:disabled?"not-allowed":"pointer",
    transition:"all 0.15s",border:"none",opacity:disabled?0.5:1,
  };
  const sizes = { sm:{ padding:"5px 12px", fontSize:"0.78rem" }, md:{ padding:"8px 18px", fontSize:"0.85rem" }, lg:{ padding:"11px 24px", fontSize:"0.95rem" } };
  const variants = {
    primary:  { background:T.emerald,           color:"#fff",           boxShadow:"0 1px 3px rgba(16,185,129,0.3)" },
    secondary:{ background:T.bgCard,            color:T.textPrimary,    border:`1px solid ${T.border}`, boxShadow:"0 1px 2px rgba(0,0,0,0.05)" },
    ghost:    { background:"transparent",       color:T.textSecondary,  border:`1px solid ${T.border}` },
    danger:   { background:"rgba(239,68,68,0.08)", color:"#ef4444",     border:"1px solid rgba(239,68,68,0.2)" },
    sidebar:  { background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)", border:"1px solid rgba(255,255,255,0.12)" },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...extra }}
      onMouseEnter={e => { if(!disabled && variant==="primary") e.currentTarget.style.background=T.emeraldDim; if(!disabled && variant==="secondary") e.currentTarget.style.background=T.bgApp; }}
      onMouseLeave={e => { if(!disabled && variant==="primary") e.currentTarget.style.background=T.emerald; if(!disabled && variant==="secondary") e.currentTarget.style.background=T.bgCard; }}
    >
      {icon && icon}{children}
    </button>
  );
}

function Card({ children, style: extra = {}, onClick, hover = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"12px",
        boxShadow:hov?"0 8px 24px rgba(0,0,0,0.1)":"0 1px 3px rgba(0,0,0,0.06)",
        transition:"box-shadow 0.2s,transform 0.2s",
        transform:hov?"translateY(-2px)":"none",
        cursor:onClick?"pointer":"default",
        ...extra,
      }}
    >{children}</div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px" }}>
      <h3 style={{ margin:0,fontSize:"0.7rem",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textMuted }}>{title}</h3>
      {action}
    </div>
  );
}

// Form primitives
function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom:"14px" }}>
      <label style={{ display:"block",fontSize:"0.78rem",fontWeight:500,color:T.textSecondary,marginBottom:"5px" }}>
        {label}{required && <span style={{ color:T.negative,marginLeft:"3px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCss = (isRTL) => ({
  width:"100%",padding:"9px 12px",background:T.bgInput,
  border:`1px solid ${T.border}`,borderRadius:"8px",
  color:T.textPrimary,fontSize:"0.9rem",outline:"none",
  boxSizing:"border-box",transition:"border-color 0.15s",
  textAlign: isRTL ? "right" : "left",
  fontFamily: "inherit",
});

function Input({ value, onChange, type="text", placeholder, isRTL }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ ...inputCss(isRTL), borderColor: focused ? T.emerald : T.border }}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    />
  );
}

function Select({ value, onChange, options, placeholder, isRTL }) {
  const [focused, setFocused] = useState(false);
  return (
    <select value={value} onChange={onChange}
      style={{ ...inputCss(isRTL), borderColor:focused?T.emerald:T.border, cursor:"pointer" }}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

// Large modal overlay
function Modal({ title, children, onClose, maxWidth = "520px", badge }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:300,
      background:T.bgOverlay,backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",
      overflowY:"auto",
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"16px",
        width:"100%",maxWidth,boxShadow:"0 24px 80px rgba(0,0,0,0.2)",
        animation:"modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
        maxHeight:"92vh",display:"flex",flexDirection:"column",
      }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px",borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
            <h3 style={{ margin:0,fontSize:"1rem",fontWeight:600,color:T.textPrimary }}>{title}</h3>
            {badge}
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
            onMouseEnter={e=>e.currentTarget.style.background=T.bgApp}
            onMouseLeave={e=>e.currentTarget.style.background="none"}
          ><X size={18} /></button>
        </div>
        <div style={{ padding:"20px 22px",overflowY:"auto",flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── KPI number card ──────────────────────────────────────────────────────────
function KPICard({ label, value, sub, trend, accent = T.emerald, icon: Icon_ }) {
  const isPos = trend === undefined || trend >= 0;
  const fmtV = (v) => "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <Card style={{ padding:"20px",flex:1,minWidth:"160px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
        <span style={{ fontSize:"0.75rem",fontWeight:500,color:T.textSecondary }}>{label}</span>
        {Icon_ && (
          <div style={{ width:"34px",height:"34px",borderRadius:"8px",background:`${accent}15`,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Icon_ size={16} color={accent} />
          </div>
        )}
      </div>
      <div style={{ fontSize:"1.6rem",fontWeight:700,color:T.textPrimary,lineHeight:1,marginBottom:"8px" }}>{fmtV(value)}</div>
      <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
        {trend !== undefined && (
          <span style={{ display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"0.72rem",fontWeight:500,
            color:isPos?T.positive:T.negative,background:isPos?`${T.positive}12`:`${T.negative}12`,
            border:`1px solid ${isPos?T.positive:T.negative}25`,borderRadius:"4px",padding:"1px 6px" }}>
            {isPos ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
            ${Math.abs(trend).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </span>
        )}
        {sub && <span style={{ fontSize:"0.72rem",color:T.textMuted }}>{sub}</span>}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function LoginPage() {
  const { signIn, authLoading, gapiReady, authError, lang, setLang, t, isRTL, font } = useApp();
  return (
    <div dir={isRTL?"rtl":"ltr"} style={{
      minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:`linear-gradient(135deg, ${T.bgSidebar} 0%, #1e293b 50%, ${T.bgSidebar} 100%)`,
      fontFamily:font,padding:"20px",position:"relative",overflow:"hidden",
    }}>
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        @keyframes gridScroll { from{transform:translateY(0)} to{transform:translateY(60px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Subtle grid bg */}
      <div style={{ position:"absolute",inset:0,opacity:0.06,
        backgroundImage:`linear-gradient(${T.emerald} 1px,transparent 1px),linear-gradient(90deg,${T.emerald} 1px,transparent 1px)`,
        backgroundSize:"40px 40px",animation:"gridScroll 20s linear infinite" }} />
      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ width:"600px",height:"600px",background:`radial-gradient(circle,${T.emerald}12 0%,transparent 70%)`,borderRadius:"50%" }} />
      </div>

      {/* Language toggle */}
      <div style={{ position:"absolute",top:"20px",right:"20px",display:"flex",gap:"8px" }}>
        {["en","ar"].map(l => (
          <button key={l} onClick={()=>setLang(l)} style={{
            padding:"6px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"0.8rem",fontWeight:500,border:"none",
            background: lang===l ? T.emerald : "rgba(255,255,255,0.1)",
            color: lang===l ? "#fff" : "rgba(255,255,255,0.6)",
          }}>{l==="en"?"EN":"عر"}</button>
        ))}
      </div>

      {/* Card */}
      <div style={{ position:"relative",zIndex:1,textAlign:"center",maxWidth:"400px",width:"100%",animation:"fadeUp 0.4s ease both" }}>
        {/* Logo */}
        <div style={{ display:"flex",justifyContent:"center",marginBottom:"24px" }}>
          <div style={{ width:"68px",height:"68px",borderRadius:"18px",background:T.emeraldBg,border:`1.5px solid ${T.emeraldBorder}`,
            display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${T.emerald}20` }}>
            <TrendingUp size={32} color={T.emerald} />
          </div>
        </div>
        <h1 style={{ fontSize:"2rem",fontWeight:700,letterSpacing:isRTL?"0.02em":"0.12em",color:"#f8fafc",marginBottom:"6px" }}>
          {t.appName}
        </h1>
        <p style={{ fontSize:"0.85rem",letterSpacing:isRTL?"0.02em":"0.2em",textTransform:isRTL?"none":"uppercase",color:`${T.emerald}cc`,marginBottom:"36px" }}>
          {t.appTagline}
        </p>

        {/* Feature pills */}
        <div style={{ display:"flex",justifyContent:"center",gap:"10px",marginBottom:"28px",flexWrap:"wrap" }}>
          {[{icon:<Shield size={13}/>,label:t.privacyFirst},{icon:<Cloud size={13}/>,label:t.driveSynced}].map(({icon,label})=>(
            <div key={label} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"5px 14px",border:`1px solid rgba(255,255,255,0.15)`,borderRadius:"100px",color:"rgba(255,255,255,0.65)",fontSize:"0.78rem",background:"rgba(255,255,255,0.06)" }}>
              {icon}{label}
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <button onClick={signIn} disabled={!gapiReady||authLoading} style={{
          display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",
          width:"100%",padding:"13px 24px",borderRadius:"10px",border:"none",cursor:(!gapiReady||authLoading)?"not-allowed":"pointer",
          background:authLoading?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.08)",
          color:authLoading?"rgba(255,255,255,0.4)":"#fff",fontSize:"0.95rem",fontWeight:500,
          transition:"all 0.2s",boxShadow:authLoading?"none":"0 0 0 1px rgba(255,255,255,0.12)",
          fontFamily:font,
        }}
          onMouseEnter={e=>{ if(!authLoading&&gapiReady) e.currentTarget.style.background="rgba(255,255,255,0.14)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background=authLoading?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.08)"; }}
        >
          {authLoading
            ? <><div style={{ width:"16px",height:"16px",border:"2px solid rgba(255,255,255,0.2)",borderTopColor:"rgba(255,255,255,0.8)",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>{t.connecting}</>
            : <><GoogleIcon />{t.signIn}</>
          }
        </button>

        {!gapiReady && !authError && (
          <p style={{ marginTop:"12px",fontSize:"0.74rem",color:`${T.emerald}80` }}>{t.loadingApis}</p>
        )}
        {authError && (
          <div style={{ marginTop:"14px",padding:"10px 14px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"8px",color:"rgba(255,100,100,0.9)",fontSize:"0.76rem" }}>
            ⚠ {authError}
          </div>
        )}
        <p style={{ marginTop:"24px",fontSize:"0.72rem",lineHeight:1.7,color:"rgba(255,255,255,0.3)" }}>{t.privacyNote}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{width:18,height:18}} fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function LoadingScreen({ message }) {
  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bgSidebar,fontFamily:T.fontSans }}>
      <div style={{ width:"40px",height:"40px",border:`2px solid ${T.emerald}30`,borderTopColor:T.emerald,borderRadius:"50%",animation:"spin 0.9s linear infinite",marginBottom:"16px" }}/>
      <p style={{ color:`${T.emerald}99`,fontSize:"0.8rem",letterSpacing:"0.12em" }}>{message||"LOADING..."}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════
function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, pinned, setPinned }) {
  const { user, signOut, syncing, t, font, lang, setLang, isRTL } = useApp();

  const navItems = [
    { id:"dashboard",    label:t.dashboard,    icon:<BarChart2 size={17}/> },
    { id:"portfolios",   label:t.portfolios,   icon:<FolderOpen size={17}/> },
    { id:"investments",  label:t.investments,  icon:<Wallet size={17}/> },
    { id:"transactions", label:t.transactions, icon:<DollarSign size={17}/> },
    { id:"statistics",   label:t.statistics,   icon:<PieChartIcon size={17}/> },
    { id:"settings",     label:t.settings,     icon:<Settings size={17}/> },
  ];

  const showLabels = pinned || isOpen;

  const handleHamburger = () => {
    if (pinned) {
      setPinned(false);
      setIsOpen(false);
      return;
    }
    setPinned(true);
    setIsOpen(true);
  };

  return (
    <aside dir="ltr" style={{
      width:showLabels?"220px":"72px",minHeight:"100vh",background:T.bgSidebar,
      borderRight:"none",display:"flex",flexDirection:"column",flexShrink:0,
      fontFamily:font,transition:"width 0.2s ease",
    }} onMouseEnter={() => { if (!pinned) setIsOpen(true); }} onMouseLeave={() => { if (!pinned) setIsOpen(false); }}>
      <div style={{ padding:showLabels?"24px 20px 18px":"16px 10px",borderBottom:`1px solid ${T.borderDark}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:"10px",justifyContent:showLabels?"flex-start":"center" }}>
          <button onClick={handleHamburger} title={pinned?t.unpinSidebar:t.pinSidebar} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"28px", height:"28px", borderRadius:"6px", border:`1px solid ${T.borderDark}`, background:"transparent", color:T.textSidebar, cursor:"pointer", flexShrink:0 }}>
            <Menu size={14} />
          </button>
          <div style={{ width:"32px",height:"32px",borderRadius:"8px",background:T.emeraldBg,border:`1px solid ${T.emeraldBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <TrendingUp size={16} color={T.emerald} />
          </div>
          {showLabels && <span style={{ color:"#f1f5f9",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.08em" }}>INVESTATY</span>}
        </div>
        {showLabels && (
          <div style={{ display:"flex",alignItems:"center",gap:"6px",marginTop:"8px" }}>
            <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:syncing?"#f59e0b":T.emerald,transition:"background 0.3s" }}/>
            <span style={{ color:syncing?"#f59e0b90":`${T.emerald}80`,fontSize:"0.62rem",letterSpacing:"0.1em",textTransform:"uppercase" }}>
              {syncing ? t.syncing : t.synced}
            </span>
          </div>
        )}
      </div>

      <nav style={{ flex:1,padding:"10px 10px" }}>
        {navItems.map(({ id, label, icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); if (!pinned) setIsOpen(false); }} style={{
              display:"flex",alignItems:"center",gap:"10px",width:"100%",
              padding:"9px 12px",borderRadius:"8px",border:"none",
              background:active?T.emeraldBg:"transparent",
              color:active?T.emerald:T.textSidebarMuted,
              fontSize:"0.83rem",fontWeight:active?600:400,cursor:"pointer",
              textAlign:isRTL?"right":"left",transition:"all 0.15s",marginBottom:"2px",
              borderLeft:active?`2px solid ${T.emerald}`:"2px solid transparent",
              justifyContent:showLabels?"flex-start":"center",
            }}
            >
              {icon}{showLabels && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:"12px" }}>
        {showLabels && <div style={{ color:T.textSidebarMuted, fontSize:"0.7rem", marginBottom:"2px" }}>{pinned?t.unpinSidebar:t.pinSidebar}</div>}
      </div>

      {showLabels && (
        <div style={{ padding:"8px 12px 12px",borderTop:`1px solid ${T.borderDark}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px" }}>
            <Globe size={13} color={T.textSidebarMuted} />
            <span style={{ color:T.textSidebarMuted,fontSize:"0.7rem",letterSpacing:"0.06em",flex:1 }}>{t.language}</span>
            {["en","ar"].map(l=>(
              <button key={l} onClick={()=>setLang(l)} style={{ background:lang===l?"rgba(255,255,255,0.12)":"transparent",border:`1px solid ${T.borderDark}`,borderRadius:"6px",color:lang===l?"#fff":T.textSidebarMuted,padding:"3px 8px",fontSize:"0.68rem",cursor:"pointer" }}>{l.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px" }}>
            <div style={{ width:"26px",height:"26px",borderRadius:"50%",overflow:"hidden",background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.65rem" }}>
              {user?.picture ? <img src={user.picture} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : user?.name?.[0]}
            </div>
            <div style={{ overflow:"hidden",flex:1 }}>
              <div style={{ color:"rgba(255,255,255,0.75)",fontSize:"0.76rem",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.name}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ display:"flex",alignItems:"center",gap:"6px",width:"100%",padding:"7px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"7px",color:"rgba(255,100,100,0.8)",fontSize:"0.76rem",cursor:"pointer",fontFamily:font }}>
            <LogOut size={13}/>{t.signOut}
          </button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </aside>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// DATA HELPERS (pure functions, no hooks)
// ═══════════════════════════════════════════════════════════════════════════════
const visible = (arr) => (arr||[]).filter(i=>!i.is_hidden);
const inv_of_portfolio = (db, pid) => visible(db.investments).filter(i=>i.portfolioId===pid);
const tx_of_investment = (db, iid) => visible(db.transactions).filter(t=>t.investmentId===iid);
const tx_of_portfolio  = (db, pid) => visible(db.transactions).filter(t=>t.portfolioId===pid);
const curVal = (inv) => (parseFloat(inv.quantity)||0)*(parseFloat(inv.currentPrice)||0);
const costBasis = (inv) => (parseFloat(inv.quantity)||0)*(parseFloat(inv.purchasePrice)||0);
const roi = (inv) => { const c=costBasis(inv); return c>0?((curVal(inv)-c)/c)*100:0; };
const txIncome = (txs) => txs.filter(t=>t.type==="income").reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
const txExpense = (txs) => txs.filter(t=>t.type==="expense").reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
const currencySymbol = (currency="USD") => ({ USD:"$", EUR:"€", GBP:"£", SAR:"﷼", AED:"د.إ" }[currency] || currency);
const fmtMoney = (v, { compact=false, currency="USD" } = {}) => {
  const n = Number(v||0);
  const symbol = currencySymbol(currency);
  if (compact && n >= 1_000_000) return symbol + (n/1_000_000).toFixed(1)+"M";
  if (compact && n >= 1_000) return symbol + (n/1_000).toFixed(1)+"K";
  return symbol + n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
};
const portfolioCurrency = (db, portfolioId) => (visible(db?.portfolios||[]).find(p=>p.id===portfolioId)?.currency || "USD");
const riskColor = (risk) => {
  const r = String(risk||"").toLowerCase();
  if (r.includes("low") || r.includes("منخفض")) return T.positive;
  if (r.includes("high") || r.includes("مرتفع") || r.includes("spec")) return T.negative;
  return T.warning;
};
const statusColor = (status) => {
  const s = String(status||"").toLowerCase();
  if (s.includes("active") || s.includes("record") || s.includes("completed") || s.includes("نشط") || s.includes("مسجل")) return T.positive;
  if (s.includes("pending") || s.includes("schedule") || s.includes("paused") || s.includes("مجدول") || s.includes("معلق")) return T.warning;
  if (s.includes("cancel") || s.includes("closed") || s.includes("ملغ") || s.includes("مغلق")) return T.negative;
  return T.textMuted;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — KPI + Charts + Portfolio cards
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard() {
  const { db, t, isRTL, font } = useApp();
  if (!db) return null;

  const portfolios = visible(db.portfolios);
  const investments = visible(db.investments);
  const transactions = visible(db.transactions);

  const totalPortfolioValue = investments.reduce((s,i)=>s+curVal(i),0);
  const totalCost = investments.reduce((s,i)=>s+costBasis(i),0);
  const capitalGainsVal = totalPortfolioValue - totalCost;
  const totalIncome = txIncome(transactions);
  const totalExpense = txExpense(transactions);
  const netProfit = capitalGainsVal + totalIncome - totalExpense;

  const hour = new Date().getHours();
  const greeting = hour<12?t.goodMorning:hour<18?t.goodAfternoon:t.goodEvening;

  // Chart data: portfolio allocation
  const allocationData = portfolios.map(p=>{
    const pvInvs = inv_of_portfolio(db, p.id);
    return { name:p.name, value:pvInvs.reduce((s,i)=>s+curVal(i),0) };
  }).filter(d=>d.value>0);

  const totalAlloc = allocationData.reduce((s,d)=>s+d.value,0);
  const pieData = allocationData.map(d=>({ ...d, pct:totalAlloc>0?(d.value/totalAlloc)*100:0 }));

  // Upcoming: scheduled transactions sorted by dueDate
  const upcoming = transactions
    .filter(tx=>tx.status==="scheduled"&&tx.dueDate)
    .sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
    .slice(0,5);

  // Portfolio performance bar chart
  const perfData = portfolios.map(p=>{
    const pvInvs = inv_of_portfolio(db,p.id);
    const value = pvInvs.reduce((s,i)=>s+curVal(i),0);
    const cost  = pvInvs.reduce((s,i)=>s+costBasis(i),0);
    return { name:p.name.length>10?p.name.slice(0,10)+"…":p.name, value, cost, gain:value-cost };
  }).filter(d=>d.value>0);

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      {/* Page title */}
      <div style={{ marginBottom:"24px" }}>
        <div style={{ fontSize:"0.75rem",color:T.textMuted,marginBottom:"4px" }}>{greeting}</div>
        <h2 style={{ margin:0,fontSize:"1.5rem",fontWeight:700,color:T.textPrimary }}>{t.dashboard}</h2>
      </div>

      {/* KPI Row */}
      <SectionHeader title={t.portfolioOverview} />
      <div style={{ display:"flex",gap:"14px",flexWrap:"wrap",marginBottom:"28px" }}>
        <KPICard label={t.totalPortfolioValue} value={totalPortfolioValue} sub={`${investments.filter(i=>i.status!=="Closed").length} ${t.activePositions}`} accent={T.emerald} icon={Wallet} />
        <KPICard label={t.totalNetProfit} value={netProfit} sub={t.dividendsCapital} trend={netProfit} accent={netProfit>=0?T.positive:T.negative} icon={TrendingUp} />
        <KPICard label={t.totalIncome} value={totalIncome} sub={`${transactions.filter(tx=>tx.type==="income").length} ${t.payments}`} accent={T.info} icon={ArrowUpRight} />
        <KPICard label={t.capitalGains} value={capitalGainsVal} sub={t.unrealised} trend={capitalGainsVal} accent={capitalGainsVal>=0?T.positive:T.negative} icon={BarChart2} />
      </div>

      {/* Charts row */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px",marginBottom:"28px" }}>

        {/* Donut allocation */}
        <Card style={{ padding:"18px" }}>
          <SectionHeader title={t.assetAllocation} />
          {pieData.length === 0
            ? <EmptyState text={t.noAllocation} />
            : (
              <div style={{ display:"flex",alignItems:"center",height:"180px" }}>
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((_,i)=><Cell key={i} fill={T.chart[i%T.chart.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>[fmtMoney(v),"Value"]} contentStyle={{ background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.78rem" }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1,display:"flex",flexDirection:"column",gap:"6px" }}>
                  {pieData.map((d,i)=>(
                    <div key={d.name} style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                      <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:T.chart[i%T.chart.length],flexShrink:0 }}/>
                      <span style={{ fontSize:"0.7rem",color:T.textSecondary,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.name}</span>
                      <span style={{ fontSize:"0.68rem",color:T.textMuted }}>{d.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </Card>

        {/* Upcoming cash flow */}
        <Card style={{ padding:"18px" }}>
          <SectionHeader title={t.upcomingCashFlow} />
          {upcoming.length === 0
            ? <EmptyState text={t.noScheduled} />
            : (
              <div style={{ display:"flex",flexDirection:"column",gap:"0" }}>
                {upcoming.map((tx,i)=>{
                  const today = new Date();
                  const due = new Date(tx.dueDate);
                  const diff = Math.ceil((due-today)/(1000*60*60*24));
                  const badgeColor = diff<0?T.negative:diff<=7?T.warning:T.positive;
                  const badgeLabel = diff<0?t.overdue:diff===0?t.today:`${diff}${t.days}`;
                  const inv = (db.investments||[]).find(i=>i.id===tx.investmentId);
                  return (
                    <div key={tx.id||i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<upcoming.length-1?`1px solid ${T.border}`:"none" }}>
                      <div>
                        <div style={{ fontSize:"0.8rem",fontWeight:500,color:T.textPrimary,marginBottom:"1px" }}>{tx.category}</div>
                        <div style={{ fontSize:"0.7rem",color:T.textMuted }}>{inv?.name||"—"}</div>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                        <span style={{ fontSize:"0.85rem",fontWeight:600,color:T.positive }}>+{fmtMoney(tx.amount,{currency:portfolioCurrency(db, tx.portfolioId)})}</span>
                        <Chip color={badgeColor}>{badgeLabel}</Chip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>

        {/* Portfolio performance bar */}
        <Card style={{ padding:"18px" }}>
          <SectionHeader title={t.fundingPerformance} />
          {perfData.length === 0
            ? <EmptyState text={t.noFunding} />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={perfData} margin={{ top:0,right:0,bottom:0,left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize:10,fill:T.textMuted }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10,fill:T.textMuted }} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v)=>[fmtMoney(v)]} contentStyle={{ background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.78rem" }}/>
                  <Bar dataKey="value" name="Value" fill={T.emerald} radius={[4,4,0,0]} maxBarSize={32}/>
                  <Bar dataKey="cost" name="Cost" fill="#cbd5e1" radius={[4,4,0,0]} maxBarSize={32}/>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>
      </div>

      {/* Portfolio cards */}
      <SectionHeader title={t.portfolioList} />
      {portfolios.length === 0
        ? <EmptyState text={t.noPortfolioData} />
        : (
          <div style={{ display:"flex",gap:"14px",overflowX:"auto",paddingBottom:"8px",scrollbarWidth:"thin",scrollbarColor:`${T.border} transparent` }}>
            {portfolios.map((p,i)=>{
              const pvInvs = inv_of_portfolio(db,p.id);
              const pValue = pvInvs.reduce((s,inv)=>s+curVal(inv),0);
              const pCost  = pvInvs.reduce((s,inv)=>s+costBasis(inv),0);
              const pRoi   = pCost>0?((pValue-pCost)/pCost)*100:0;
              const color  = T.chart[i%T.chart.length];
              return (
                <Card key={p.id} hover style={{ minWidth:"195px",maxWidth:"220px",flexShrink:0,padding:"18px",borderTop:`3px solid ${color}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
                    <span style={{ fontSize:"0.7rem",fontWeight:600,color,textTransform:"uppercase",letterSpacing:"0.06em" }}>{p.type}</span>
                    <Chip color={color}>{pvInvs.length}</Chip>
                  </div>
                  <div style={{ fontSize:"1.3rem",fontWeight:700,color:T.textPrimary,marginBottom:"2px" }}>{fmtMoney(pValue,{compact:true,currency:p.currency||"USD"})}</div>
                  <div style={{ fontSize:"0.75rem",color:T.textMuted,marginBottom:"12px" }}>{p.name}</div>
                  <div style={{ height:"4px",background:T.bgApp,borderRadius:"100px",overflow:"hidden",marginBottom:"10px" }}>
                    <div style={{ height:"100%",width:`${totalAlloc>0?(pValue/totalAlloc)*100:0}%`,background:color,borderRadius:"100px",transition:"width 0.8s ease" }}/>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:"0.72rem",color:T.textMuted }}>{t.dominantRisk}: {p.risk}</span>
                    <span style={{ fontSize:"0.72rem",fontWeight:600,color:pRoi>=0?T.positive:T.negative }}>{pRoi>=0?"+":""}{pRoi.toFixed(1)}%</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding:"28px 20px",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:"10px",color:T.textMuted,fontSize:"0.8rem" }}>
      {text}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIOS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function PortfoliosTab({ onQuickAddInvestment }) {
  const { db, addItem, softDelete, patchItem, t, isRTL, font } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const EMPTY = { name:"",type:"",risk:"",currency:"USD",notes:"" };
  const [form, setForm] = useState(EMPTY);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const portfolios = visible(db?.portfolios||[]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editItem) { patchItem("portfolios",editItem.id,form); }
    else { addItem("portfolios",form); }
    setForm(EMPTY); setShowModal(false); setEditItem(null);
  };

  const openEdit = (p) => { setForm({name:p.name,type:p.type,risk:p.risk,currency:p.currency,notes:p.notes||""}); setEditItem(p); setShowModal(true); };

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
        <div>
          <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.portfolios}</h2>
          <div style={{ fontSize:"0.8rem",color:T.textMuted,marginTop:"2px" }}>{portfolios.length} {t.portfolios.toLowerCase()}</div>
        </div>
        <Btn icon={<Plus size={15}/>} onClick={()=>{setForm(EMPTY);setEditItem(null);setShowModal(true);}}>{t.addPortfolio}</Btn>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px" }}>
        {portfolios.map((p,i) => {
          const invs = inv_of_portfolio(db,p.id);
          const pValue = invs.reduce((s,i)=>s+curVal(i),0);
          const pCost  = invs.reduce((s,i)=>s+costBasis(i),0);
          const pTx    = tx_of_portfolio(db,p.id);
          const pIncome = txIncome(pTx);
          const pRoi   = pCost>0?((pValue-pCost)/pCost)*100:0;
          const color  = T.chart[i%T.chart.length];
          return (
            <Card key={p.id} style={{ overflow:"hidden" }}>
              <div style={{ height:"4px",background:`linear-gradient(90deg,${color},${color}80)` }}/>
              <div style={{ padding:"18px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px" }}>
                  <div>
                    <div style={{ fontSize:"1rem",fontWeight:600,color:T.textPrimary,marginBottom:"3px" }}>{p.name}</div>
                    <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
                      <Chip color={color}>{p.type}</Chip>
                      <Chip color={T.info}>{p.risk}</Chip>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:"4px" }}>
                    <button onClick={()=>openEdit(p)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bgApp} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <Edit3 size={14}/>
                    </button>
                    <button onClick={()=>onQuickAddInvestment?.(p.id)} title={t.addInvestmentAction} style={{ background:"none",border:"none",cursor:"pointer",color:T.emerald,padding:"4px",borderRadius:"6px",display:"flex" }}><Plus size={14}/></button>
                    <button onClick={()=>softDelete("portfolios",p.id)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                      onMouseEnter={e=>e.currentTarget.style.color=T.negative} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px" }}>
                  {[
                    { label:t.totalValue,  val:fmtMoney(pValue,{compact:true,currency:p.currency||"USD"}) },
                    { label:t.roi,         val:`${pRoi>=0?"+":""}${pRoi.toFixed(1)}%`, color:pRoi>=0?T.positive:T.negative },
                    { label:t.positions,   val:invs.length },
                    { label:t.totalIncome, val:fmtMoney(pIncome,{compact:true,currency:p.currency||"USD"}) },
                  ].map(m=>(
                    <div key={m.label} style={{ padding:"10px",background:T.bgApp,borderRadius:"8px" }}>
                      <div style={{ fontSize:"0.68rem",color:T.textMuted,marginBottom:"3px" }}>{m.label}</div>
                      <div style={{ fontSize:"0.95rem",fontWeight:600,color:m.color||T.textPrimary }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                {p.notes && <div style={{ fontSize:"0.75rem",color:T.textMuted,fontStyle:"italic" }}>{p.notes}</div>}
              </div>
            </Card>
          );
        })}
        {portfolios.length===0 && <EmptyState text={t.noPortfolioData}/>}
      </div>

      {showModal && (
        <Modal title={editItem?t.edit+" "+t.portfolio:t.addPortfolio} onClose={()=>{setShowModal(false);setEditItem(null);}}>
          <FormField label={t.name} required><Input value={form.name} onChange={e=>f("name")(e.target.value)} isRTL={isRTL} placeholder={t.name}/></FormField>
          <FormField label={t.type} required><Select value={form.type} onChange={e=>f("type")(e.target.value)} options={db?.settings?.portfolioTypes||[]} placeholder={t.selectType} isRTL={isRTL}/></FormField>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <FormField label={t.risk}><Select value={form.risk} onChange={e=>f("risk")(e.target.value)} options={db?.settings?.riskLevels||[]} placeholder={t.selectRisk} isRTL={isRTL}/></FormField>
            <FormField label={t.currency}><Select value={form.currency} onChange={e=>f("currency")(e.target.value)} options={db?.settings?.currencies||[]} placeholder={t.selectCurrency} isRTL={isRTL}/></FormField>
          </div>
          <FormField label={t.notes}><Input value={form.notes} onChange={e=>f("notes")(e.target.value)} isRTL={isRTL} placeholder={`(${t.optional})`}/></FormField>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"8px" }}>
            <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);}}>{t.cancel}</Btn>
            <Btn onClick={handleSave}>{t.save}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function InvestmentsTab({ onQuickAddTransaction, modalPrefill }) {
  const { db, addItem, softDelete, patchItem, t, isRTL, font } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const EMPTY = { portfolioId:"",name:"",quantity:"",purchasePrice:"",currentPrice:"",purchaseDate:"",risk:"",funding:[{source:"",amount:""}],status:"Active",notes:"" };
  const [form, setForm] = useState(EMPTY);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const portfolios = visible(db?.portfolios||[]);
  const investments = visible(db?.investments||[]);

  const handleSave = () => {
    if (!form.name.trim()||!form.portfolioId) return;
    const payload = { ...form, funding:(form.funding||[]).filter(r=>r.source||r.amount), source:undefined };
    if (editItem) { patchItem("investments",editItem.id,payload); }
    else { addItem("investments",payload); }
    setForm(EMPTY); setShowModal(false); setEditItem(null);
  };

  const openEdit = (inv) => {
    setForm({ portfolioId:inv.portfolioId,name:inv.name,quantity:inv.quantity||"",purchasePrice:inv.purchasePrice||"",
      currentPrice:inv.currentPrice||"",purchaseDate:inv.purchaseDate||"",risk:inv.risk||"",funding:(inv.funding&&inv.funding.length?inv.funding:[{source:inv.source||"",amount:""}]),status:inv.status||"Active",notes:inv.notes||"" });
    setEditItem(inv); setShowModal(true);
  };

  const updateFunding = (idx, key, value) => {
    setForm(prev => ({
      ...prev,
      funding: prev.funding.map((row, i) => i===idx ? { ...row, [key]: value } : row),
    }));
  };

  useEffect(() => {
    if (!modalPrefill) return;
    setForm({ ...EMPTY, ...modalPrefill, funding:[{source:"",amount:""}] });
    setEditItem(null);
    setShowModal(true);
  }, [modalPrefill]);

  const statusOpts = ((db?.settings?.investmentStatuses&&db.settings.investmentStatuses.length)?db.settings.investmentStatuses:["Active","Paused","Closed"]).map((v)=>({ value:v, label:v }));

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
        <div>
          <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.investments}</h2>
          <div style={{ fontSize:"0.8rem",color:T.textMuted,marginTop:"2px" }}>{investments.length} {t.investments.toLowerCase()}</div>
        </div>
        <Btn icon={<Plus size={15}/>} onClick={()=>{setForm(EMPTY);setEditItem(null);setShowModal(true);}}>{t.addInvestment}</Btn>
      </div>

      {/* Grouped by portfolio */}
      {portfolios.length === 0
        ? <EmptyState text={t.noPortfolioData}/>
        : portfolios.map(p => {
          const invs = inv_of_portfolio(db, p.id);
          if (invs.length === 0) return null;
          return (
            <div key={p.id} style={{ marginBottom:"24px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px" }}>
                <FolderOpen size={14} color={T.textMuted}/>
                <span style={{ fontSize:"0.75rem",fontWeight:600,color:T.textSecondary,textTransform:"uppercase",letterSpacing:"0.08em" }}>{p.name}</span>
                <span style={{ fontSize:"0.7rem",color:T.textMuted }}>· {invs.length} {t.investments.toLowerCase()}</span>
              </div>
              <Card style={{ overflow:"hidden" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"0.85rem" }}>
                  <thead>
                    <tr style={{ background:T.bgApp }}>
                      {[t.name,t.principal,t.currentValue,t.roi,t.currentPrice,t.risk,t.status,""].map((h,i)=>(
                        <th key={i} style={{ padding:"10px 14px",textAlign:isRTL&&i<7?"right":"left",fontSize:"0.7rem",fontWeight:600,color:T.textMuted,whiteSpace:"nowrap",borderBottom:`1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invs.map(inv=>{
                      const roiVal = roi(inv);
                      const cvVal  = curVal(inv);
                      const cbVal  = costBasis(inv);
                      const isExpanded = expandedRow === inv.id;
                      const txs = tx_of_investment(db, inv.id);
                      return (
                        <>
                          <tr key={inv.id}
                            style={{ borderBottom:`1px solid ${T.border}`,cursor:"pointer",transition:"background 0.12s" }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.bgApp}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                          >
                            <td style={{ padding:"12px 14px" }} onClick={()=>setExpandedRow(isExpanded?null:inv.id)}>
                              <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                                <ChevronRight size={13} color={T.textMuted} style={{ transform:isExpanded?"rotate(90deg)":"none",transition:"transform 0.2s",flexShrink:0 }}/>
                                <span style={{ fontWeight:500,color:T.textPrimary }}>{inv.name}</span>
                              </div>
                            </td>
                            <td style={{ padding:"12px 14px",color:T.textSecondary }}>{fmtMoney(cbVal,{currency:portfolioCurrency(db, inv.portfolioId)})}</td>
                            <td style={{ padding:"12px 14px",fontWeight:600,color:T.textPrimary }}>{fmtMoney(cvVal,{currency:portfolioCurrency(db, inv.portfolioId)})}</td>
                            <td style={{ padding:"12px 14px" }}>
                              <span style={{ fontWeight:600,color:roiVal>=0?T.positive:T.negative }}>{roiVal>=0?"+":""}{roiVal.toFixed(2)}%</span>
                            </td>
                            <td style={{ padding:"12px 14px" }} onClick={e=>e.stopPropagation()}>
                              {editingPrice===inv.id
                                ? <QuickPriceField inv={inv} onDone={()=>setEditingPrice(null)}/>
                                : (
                                  <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                                    <span style={{ color:T.textSecondary }}>{fmtMoney(inv.currentPrice||0,{currency:portfolioCurrency(db, inv.portfolioId)})}</span>
                                    <button onClick={()=>setEditingPrice(inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:T.emerald,padding:"2px",borderRadius:"4px",display:"flex" }} title={t.quickUpdatePrice}>
                                      <Zap size={12}/>
                                    </button>
                                  </div>
                                )
                              }
                            </td>
                            <td style={{ padding:"12px 14px" }}>
                              <Chip color={riskColor(inv.risk)}>{inv.risk || "—"}</Chip>
                            </td>
                            <td style={{ padding:"12px 14px" }}>
                              <Chip color={statusColor(inv.status)}>{inv.status}</Chip>
                            </td>
                            <td style={{ padding:"12px 10px",textAlign:"right" }} onClick={e=>e.stopPropagation()}>
                              <div style={{ display:"flex",gap:"4px",justifyContent:"flex-end" }}>
                                <button onClick={()=>openEdit(inv)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                                  onMouseEnter={e=>e.currentTarget.style.background=T.bgApp} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                                  <Edit3 size={13}/>
                                </button>
                                <button onClick={()=>onQuickAddTransaction?.(inv)} title={t.addTransactionAction} style={{ background:"none",border:"none",cursor:"pointer",color:T.emerald,padding:"4px",borderRadius:"6px",display:"flex" }}><Plus size={13}/></button>
                                <button onClick={()=>softDelete("investments",inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                                  onMouseEnter={e=>e.currentTarget.style.color=T.negative} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>
                                  <Trash2 size={13}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={inv.id+"_exp"}>
                              <td colSpan={8} style={{ padding:"0",background:T.bgApp }}>
                                <InvestmentDetailExpanded inv={inv} txs={txs} db={db}/>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          );
        })
      }

      {showModal && (
        <Modal title={editItem?t.edit+" "+t.investment:t.addInvestment} onClose={()=>{setShowModal(false);setEditItem(null);}}>
          <FormField label={t.portfolio} required>
            <Select value={form.portfolioId} onChange={e=>f("portfolioId")(e.target.value)}
              options={portfolios.map(p=>({value:p.id,label:p.name}))} placeholder={t.selectPortfolio} isRTL={isRTL}/>
          </FormField>
          <FormField label={t.name} required><Input value={form.name} onChange={e=>f("name")(e.target.value)} isRTL={isRTL}/></FormField>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <FormField label={t.quantity}><Input type="number" value={form.quantity} onChange={e=>f("quantity")(e.target.value)} isRTL={isRTL} placeholder="0"/></FormField>
            <FormField label={t.purchasePrice}><Input type="number" value={form.purchasePrice} onChange={e=>f("purchasePrice")(e.target.value)} isRTL={isRTL} placeholder="0.00"/></FormField>
            <FormField label={t.currentPrice}><Input type="number" value={form.currentPrice} onChange={e=>f("currentPrice")(e.target.value)} isRTL={isRTL} placeholder="0.00"/></FormField>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <FormField label={t.purchaseDate}><Input type="date" value={form.purchaseDate} onChange={e=>f("purchaseDate")(e.target.value)} isRTL={isRTL}/></FormField>
            <FormField label={t.risk}><Select value={form.risk} onChange={e=>f("risk")(e.target.value)} options={db?.settings?.riskLevels||[]} placeholder={t.selectRisk} isRTL={isRTL}/></FormField>
          </div>
          <FormField label={t.splitFunding}>
            <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
              {form.funding.map((row, idx)=>(
                <div key={idx} style={{ display:"grid",gridTemplateColumns:"1fr 140px 28px",gap:"8px",alignItems:"center" }}>
                  <Select value={row.source||""} onChange={e=>updateFunding(idx,"source",e.target.value)} options={db?.settings?.fundingSources||[]} placeholder={t.selectSource} isRTL={isRTL}/>
                  <Input type="number" value={row.amount||""} onChange={e=>updateFunding(idx,"amount",e.target.value)} isRTL={isRTL} placeholder="0.00"/>
                  {form.funding.length>1 && <button onClick={()=>setForm(prev=>({ ...prev, funding: prev.funding.filter((_,i)=>i!==idx) }))} style={{ border:"none",background:"none",color:T.negative,cursor:"pointer",display:"flex" }}><Trash2 size={13}/></button>}
                </div>
              ))}
              <Btn size="sm" variant="secondary" onClick={()=>setForm(prev=>({ ...prev, funding:[...prev.funding,{source:"",amount:""}] }))}>{t.addSplit}</Btn>
            </div>
          </FormField>
          <FormField label={t.status}><Select value={form.status} onChange={e=>f("status")(e.target.value)} options={statusOpts} isRTL={isRTL}/></FormField>
          <FormField label={t.notes}><Input value={form.notes} onChange={e=>f("notes")(e.target.value)} isRTL={isRTL} placeholder={`(${t.optional})`}/></FormField>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"8px" }}>
            <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);}}>{t.cancel}</Btn>
            <Btn onClick={handleSave}>{t.save}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function QuickPriceField({ inv }) {
  const { patchItem } = useApp();
  const [val, setVal] = useState(inv.currentPrice||"");
  const save = () => { if(val!=="") patchItem("investments",inv.id,{currentPrice:val}); };
  return (
    <div style={{ display:"flex",gap:"5px",alignItems:"center" }}>
      <input autoFocus type="number" value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") save(); }}
        style={{ width:"80px",padding:"4px 8px",background:T.bgInput,border:`1px solid ${T.emerald}`,borderRadius:"6px",color:T.textPrimary,fontSize:"0.82rem",outline:"none" }}
      />
      <button onClick={save} style={{ background:T.emeraldBg,border:"none",borderRadius:"5px",cursor:"pointer",color:T.emerald,padding:"4px",display:"flex" }}><Check size={12}/></button>
    </div>
  );
}

// Expanded row detail: funding breakdown + transaction ledger
function InvestmentDetailExpanded({ inv, txs, db }) {
  const { t, isRTL } = useApp();
  const income  = txIncome(txs);
  const expense = txExpense(txs);
  const currency = portfolioCurrency(db, inv.portfolioId);
  return (
    <div style={{ padding:"16px 24px",borderTop:`2px solid ${T.emerald}20` }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px" }}>
        {/* Metrics */}
        <div>
          <div style={{ fontSize:"0.7rem",fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"10px",display:"flex",alignItems:"center",gap:"5px" }}>
            <BookOpen size={11}/>{t.fundingBreakdown}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px" }}>
            {[
              { label:t.principal,    val:fmtMoney(costBasis(inv),{currency}) },
              { label:t.currentValue, val:fmtMoney(curVal(inv),{currency}) },
              { label:t.totalIncome,  val:fmtMoney(income,{currency}),  color:T.positive },
              { label:"Expenses",     val:fmtMoney(expense,{currency}), color:T.negative },
            ].map(m=>(
              <div key={m.label} style={{ padding:"8px 10px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"7px" }}>
                <div style={{ fontSize:"0.65rem",color:T.textMuted,marginBottom:"2px" }}>{m.label}</div>
                <div style={{ fontSize:"0.88rem",fontWeight:600,color:m.color||T.textPrimary }}>{m.val}</div>
              </div>
            ))}
          </div>
          {(inv.funding||[]).length > 0 && (
            <div style={{ marginTop:"8px",fontSize:"0.75rem",color:T.textSecondary }}>
              {t.source}: {(inv.funding||[]).map((item, idx)=><strong key={idx} style={{ marginInlineEnd:"10px" }}>{item.source || "—"}{item.amount ? ` (${fmtMoney(item.amount,{currency})})` : ""}</strong>)}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div>
          <div style={{ fontSize:"0.7rem",fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"10px",display:"flex",alignItems:"center",gap:"5px" }}>
            <DollarSign size={11}/>{t.transactionLedger}
          </div>
          {txs.length===0
            ? <EmptyState text={t.noRecords}/>
            : (
              <div style={{ maxHeight:"140px",overflowY:"auto",borderRadius:"8px",border:`1px solid ${T.border}` }}>
                {txs.slice(0,6).map((tx,i)=>(
                  <div key={tx.id||i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",borderBottom:i<txs.length-1?`1px solid ${T.border}`:"none",fontSize:"0.78rem" }}>
                    <div>
                      <span style={{ fontWeight:500,color:T.textPrimary }}>{tx.category}</span>
                      <span style={{ color:T.textMuted,marginLeft:"6px",fontSize:"0.7rem" }}>{tx.date}</span>
                    </div>
                    <span style={{ fontWeight:600,color:tx.type==="income"?T.positive:T.negative }}>
                      {tx.type==="income"?"+":"-"}{fmtMoney(tx.amount,{currency:portfolioCurrency(db, tx.portfolioId)})}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TransactionsTab({ modalPrefill }) {
  const { db, addItem, softDelete, patchItem, t, isRTL, font } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterPortfolio, setFilterPortfolio] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  const EMPTY = { portfolioId:"",investmentId:"",category:"",amount:"",date:"",dueDate:"",type:"income",status:"recorded",notes:"" };
  const [form, setForm] = useState(EMPTY);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const portfolios = visible(db?.portfolios||[]);
  const allTx = visible(db?.transactions||[]);
  const filtered = filterPortfolio ? allTx.filter(tx=>tx.portfolioId===filterPortfolio) : allTx;
  const sorted = [...filtered].sort((a,b)=>new Date(b.date||b.created_at||0)-new Date(a.date||a.created_at||0));

  const investmentsForPortfolio = form.portfolioId ? visible(db?.investments||[]).filter(i=>i.portfolioId===form.portfolioId) : [];

  const handleSave = () => {
    if (!form.amount||!form.portfolioId) return;
    if (editItem) { patchItem("transactions",editItem.id,form); }
    else { addItem("transactions",form); }
    setForm(EMPTY); setShowModal(false); setEditItem(null);
  };

  const openEdit = (tx) => {
    setForm({ portfolioId:tx.portfolioId||"",investmentId:tx.investmentId||"",category:tx.category||"",
      amount:tx.amount||"",date:tx.date||"",dueDate:tx.dueDate||"",type:tx.type||"income",status:tx.status||"recorded",notes:tx.notes||"" });
    setEditItem(tx); setShowModal(true);
  };

  const totalInc = txIncome(filtered);
  const totalExp = txExpense(filtered);

  const STATUS_COLORS = { recorded:T.positive, scheduled:T.warning, cancelled:T.negative };
  const typeOpts = [{value:"income",label:t.income},{value:"expense",label:t.expense}];
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(isRTL ? "ar" : "en-GB", { day:"2-digit", month:"2-digit", year:"numeric" }), [isRTL]);

  const formatShortDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return dateFormatter.format(parsed);
  };

  const isScheduledOrPending = (status) => {
    const normalized = String(status || "").toLowerCase();
    return normalized.includes("schedule") || normalized.includes("pending") || normalized.includes("مجد") || normalized.includes("انتظار") || normalized.includes("قيد");
  };
  const statusOpts = ((db?.settings?.transactionStatuses&&db.settings.transactionStatuses.length)?db.settings.transactionStatuses:["recorded","scheduled","cancelled"]).map(v=>({ value:v, label:v }));

  useEffect(() => {
    if (!modalPrefill) return;
    setForm({ ...EMPTY, ...modalPrefill });
    setEditItem(null);
    setShowModal(true);
  }, [modalPrefill]);

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
        <div>
          <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.transactions}</h2>
          <div style={{ fontSize:"0.8rem",color:T.textMuted,marginTop:"2px" }}>{sorted.length} records</div>
        </div>
        <Btn icon={<Plus size={15}/>} onClick={()=>{setForm(EMPTY);setEditItem(null);setShowModal(true);}}>{t.addTransaction}</Btn>
      </div>

      {/* Summary + filter */}
      <div style={{ display:"flex",gap:"12px",alignItems:"center",marginBottom:"20px",flexWrap:"wrap" }}>
        <div style={{ padding:"8px 16px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.82rem",fontWeight:500 }}>
          <span style={{ color:T.textMuted,marginRight:"6px" }}>{t.totalIncome}:</span>
          <span style={{ color:T.positive }}>+{fmtMoney(totalInc,{currency:"USD"})}</span>
        </div>
        <div style={{ padding:"8px 16px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.82rem",fontWeight:500 }}>
          <span style={{ color:T.textMuted,marginRight:"6px" }}>Expenses:</span>
          <span style={{ color:T.negative }}>-{fmtMoney(totalExp,{currency:"USD"})}</span>
        </div>
        <div style={{ marginLeft:"auto" }}>
          <Select value={filterPortfolio} onChange={e=>setFilterPortfolio(e.target.value)}
            options={[{value:"",label:"All Portfolios"},...portfolios.map(p=>({value:p.id,label:p.name}))]}
            isRTL={isRTL}/>
        </div>
      </div>

      <Card style={{ overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
        {sorted.length===0
          ? <div style={{ padding:"32px" }}><EmptyState text={t.noRecords}/></div>
          : (
            <table style={{ width:"100%",minWidth:"900px",borderCollapse:"collapse",fontSize:"0.85rem" }}>
              <thead>
                <tr style={{ background:T.bgApp }}>
                  {[t.date,t.dueDate,t.category,t.portfolio,t.investment,t.amount,t.transactionType,t.status,""].map((h,i)=>(
                    <th key={i} style={{ padding:"10px 14px",textAlign:isRTL?"right":"left",fontSize:"0.7rem",fontWeight:600,color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((tx,i)=>{
                  const ptf = portfolios.find(p=>p.id===tx.portfolioId);
                  const inv = visible(db?.investments||[]).find(inv=>inv.id===tx.investmentId);
                  return (
                    <tr key={tx.id||i} style={{ borderBottom:i<sorted.length-1?`1px solid ${T.border}`:"none",transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bgApp}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <td style={{ padding:"11px 14px",color:T.textSecondary }}>{tx.date||"—"}</td>
                      <td style={{ padding:"11px 14px",color:T.textSecondary }}>{isScheduledOrPending(tx.status) ? formatShortDate(tx.dueDate) : "—"}</td>
                      <td style={{ padding:"11px 14px",fontWeight:500,color:T.textPrimary }}>{tx.category||"—"}</td>
                      <td style={{ padding:"11px 14px",color:T.textSecondary }}>{ptf?.name||"—"}</td>
                      <td style={{ padding:"11px 14px",color:T.textSecondary }}>{inv?.name||"—"}</td>
                      <td style={{ padding:"11px 14px",fontWeight:600,color:tx.type==="income"?T.positive:T.negative }}>
                        {tx.type==="income"?"+":"-"}{fmtMoney(tx.amount,{currency:portfolioCurrency(db, tx.portfolioId)})}
                      </td>
                      <td style={{ padding:"11px 14px" }}><Chip color={tx.type==="income"?T.positive:T.negative}>{tx.type==="income"?t.income:t.expense}</Chip></td>
                      <td style={{ padding:"11px 14px" }}><Chip color={statusColor(tx.status)}>{tx.status}</Chip></td>
                      <td style={{ padding:"11px 10px",position:"relative" }} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:"flex",gap:"3px",justifyContent:"flex-end" }}>
                          <button onClick={()=>openEdit(tx)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"5px",display:"flex" }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.bgApp} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <Edit3 size={13}/>
                          </button>
                          <button onClick={()=>setOpenMenu(openMenu===tx.id?null:tx.id)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"5px",display:"flex",position:"relative" }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.bgApp} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                            <MoreVertical size={13}/>
                          </button>
                          {openMenu===tx.id && <TxActionMenu tx={tx} onClose={()=>setOpenMenu(null)}/>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
        </div>
      </Card>

      {showModal && (
        <Modal title={editItem?t.edit+" "+t.transactions:t.addTransaction} onClose={()=>{setShowModal(false);setEditItem(null);}}>
          <FormField label={t.portfolio} required>
            <Select value={form.portfolioId} onChange={e=>{f("portfolioId")(e.target.value);f("investmentId")("");}}
              options={portfolios.map(p=>({value:p.id,label:p.name}))} placeholder={t.selectPortfolio} isRTL={isRTL}/>
          </FormField>
          {investmentsForPortfolio.length > 0 && (
            <FormField label={t.investment}>
              <Select value={form.investmentId} onChange={e=>f("investmentId")(e.target.value)}
                options={[{value:"",label:`(${t.optional})`},...investmentsForPortfolio.map(i=>({value:i.id,label:i.name}))]}
                isRTL={isRTL}/>
            </FormField>
          )}
          <FormField label={t.category} required>
            <Select value={form.category} onChange={e=>f("category")(e.target.value)}
              options={db?.settings?.transactionCategories||[]} placeholder={t.selectCategory} isRTL={isRTL}/>
          </FormField>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <FormField label={t.transactionType}><Select value={form.type} onChange={e=>f("type")(e.target.value)} options={typeOpts} isRTL={isRTL}/></FormField>
            <FormField label={t.amount} required><Input type="number" value={form.amount} onChange={e=>f("amount")(e.target.value)} isRTL={isRTL} placeholder="0.00"/></FormField>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <FormField label={t.date}><Input type="date" value={form.date} onChange={e=>f("date")(e.target.value)} isRTL={isRTL}/></FormField>
            <FormField label={t.status}><Select value={form.status} onChange={e=>f("status")(e.target.value)} options={statusOpts} isRTL={isRTL}/></FormField>
          </div>
          {String(form.status||"" ).toLowerCase().includes("schedule") && (
            <FormField label={t.dueDate}><Input type="date" value={form.dueDate} onChange={e=>f("dueDate")(e.target.value)} isRTL={isRTL}/></FormField>
          )}
          <FormField label={t.notes}><Input value={form.notes} onChange={e=>f("notes")(e.target.value)} isRTL={isRTL} placeholder={`(${t.optional})`}/></FormField>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"8px" }}>
            <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);}}>{t.cancel}</Btn>
            <Btn onClick={handleSave}>{t.save}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TxActionMenu({ tx, onClose }) {
  const { patchItem, softDelete, t, db } = useApp();
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  }, [onClose]);
  const statuses = db?.settings?.transactionStatuses || ["recorded","scheduled","cancelled"];
  const doneStatus = statuses.find(s=>String(s).toLowerCase().includes("record")) || statuses[0];
  const queuedStatus = statuses.find(s=>String(s).toLowerCase().includes("schedule")) || statuses[1] || statuses[0];
  const actions = [
    { label:t.markCollected, icon:<Check size={13}/>, color:T.positive, show:tx.status!==doneStatus, action:()=>{ patchItem("transactions",tx.id,{status:doneStatus,collected_at:new Date().toISOString()}); onClose(); } },
    { label:t.markScheduled, icon:<RefreshCw size={13}/>, color:T.warning, show:tx.status===doneStatus, action:()=>{ patchItem("transactions",tx.id,{status:queuedStatus}); onClose(); } },
    { label:t.archive, icon:<Trash2 size={13}/>, color:T.negative, show:true, action:()=>{ softDelete("transactions",tx.id); onClose(); } },
  ].filter(a=>a.show);
  return (
    <div ref={ref} style={{ position:"absolute",right:0,top:"calc(100% + 4px)",zIndex:500,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"10px",minWidth:"170px",boxShadow:"0 8px 28px rgba(0,0,0,0.15)",overflow:"hidden" }}>
      {actions.map(a=>(
        <button key={a.label} onClick={a.action} style={{ display:"flex",alignItems:"center",gap:"8px",width:"100%",padding:"9px 14px",background:"none",border:"none",color:a.color,fontSize:"0.78rem",fontWeight:500,cursor:"pointer",textAlign:"left" }}
          onMouseEnter={e=>e.currentTarget.style.background=T.bgApp}
          onMouseLeave={e=>e.currentTarget.style.background="none"}
        >{a.icon}{a.label}</button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB — Lookup Categories
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const { db, updateDb, t, isRTL, font } = useApp();
  const [newItems, setNewItems] = useState({});
  const [editingItems, setEditingItems] = useState({});

  const sections = [
    { key:"portfolioTypes",        label:t.portfolioTypes,        icon:<FolderOpen size={15}/> },
    { key:"riskLevels",            label:t.riskLevels,            icon:<AlertCircle size={15}/> },
    { key:"fundingSources",        label:t.fundingSources,        icon:<Wallet size={15}/> },
    { key:"investmentStatuses",   label:t.investmentStatuses,   icon:<CheckCircle2 size={15}/> },
    { key:"transactionStatuses",  label:t.transactionStatuses,  icon:<Layers size={15}/> },
    { key:"transactionCategories", label:t.transactionCategories, icon:<Tag size={15}/> },
    { key:"currencies",            label:t.currencies,            icon:<DollarSign size={15}/> },
  ];

  const addItem = (key) => {
    const val = (newItems[key]||"").trim();
    if (!val) return;
    if ((db.settings[key]||[]).includes(val)) return;
    updateDb(prev=>({ ...prev, settings:{ ...prev.settings, [key]:[...(prev.settings[key]||[]),val] } }));
    setNewItems(p=>({...p,[key]:""}));
  };

  const removeItem = (key, idx) => {
    updateDb(prev=>({ ...prev, settings:{ ...prev.settings, [key]:prev.settings[key].filter((_,i)=>i!==idx) } }));
  };

  const startEditItem = (key, idx, value) => {
    setEditingItems((prev) => ({ ...prev, [`${key}-${idx}`]: value }));
  };

  const cancelEditItem = (key, idx) => {
    setEditingItems((prev) => {
      const next = { ...prev };
      delete next[`${key}-${idx}`];
      return next;
    });
  };

  const saveEditItem = (key, idx) => {
    const editKey = `${key}-${idx}`;
    const nextValue = (editingItems[editKey] || "").trim();
    if (!nextValue) return;

    updateDb((prev) => {
      const current = prev.settings[key] || [];
      if (current.some((item, itemIdx) => itemIdx !== idx && item === nextValue)) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          [key]: current.map((item, itemIdx) => itemIdx === idx ? nextValue : item),
        },
      };
    });

    cancelEditItem(key, idx);
  };

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ marginBottom:"24px" }}>
        <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.settingsTitle}</h2>
        <div style={{ fontSize:"0.82rem",color:T.textMuted,marginTop:"4px" }}>{t.settingsDesc}</div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px" }}>
        {sections.map(({ key, label, icon }) => (
          <Card key={key} style={{ padding:"18px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px" }}>
              <div style={{ width:"30px",height:"30px",borderRadius:"7px",background:T.emeraldBg,display:"flex",alignItems:"center",justifyContent:"center",color:T.emerald,flexShrink:0 }}>{icon}</div>
              <h4 style={{ margin:0,fontSize:"0.85rem",fontWeight:600,color:T.textPrimary }}>{label}</h4>
            </div>

            {/* Tags */}
            <div style={{ display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"12px",minHeight:"28px" }}>
              {(db?.settings?.[key]||[]).map((item,i)=>{
                const editKey = `${key}-${i}`;
                const isEditing = editingItems[editKey] !== undefined;
                return (
                  <span key={i} style={{
                    display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px",
                    background:T.bgApp,border:`1px solid ${isEditing ? T.emerald : T.border}`,borderRadius:"100px",
                    fontSize:"0.76rem",fontWeight:500,color:T.textSecondary,
                  }}>
                    {isEditing ? (
                      <input
                        value={editingItems[editKey]}
                        onChange={(e)=>setEditingItems((prev)=>({ ...prev, [editKey]:e.target.value }))}
                        onKeyDown={(e)=>{
                          if (e.key === "Enter") saveEditItem(key, i);
                          if (e.key === "Escape") cancelEditItem(key, i);
                        }}
                        autoFocus
                        style={{ width:"120px",maxWidth:"24vw",padding:"2px 6px",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:"6px",color:T.textPrimary,fontSize:"0.74rem",outline:"none",fontFamily:font }}
                        dir={isRTL?"rtl":"ltr"}
                        aria-label={t.renameItem}
                      />
                    ) : (
                      <>{item}</>
                    )}
                    {isEditing ? (
                      <>
                        <button onClick={()=>saveEditItem(key,i)} style={{ background:"none",border:"none",cursor:"pointer",color:T.positive,padding:"0",lineHeight:1,display:"flex",marginInlineStart:"2px" }}><Check size={11}/></button>
                        <button onClick={()=>cancelEditItem(key,i)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"0",lineHeight:1,display:"flex" }}><X size={11}/></button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>startEditItem(key,i,item)} title={t.edit} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"0",lineHeight:1,display:"flex",marginInlineStart:"2px" }}
                          onMouseEnter={e=>e.currentTarget.style.color=T.emerald}
                          onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}
                        ><Edit3 size={11}/></button>
                        <button onClick={()=>removeItem(key,i)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"0",lineHeight:1,display:"flex" }}
                          onMouseEnter={e=>e.currentTarget.style.color=T.negative}
                          onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}
                        ><X size={11}/></button>
                      </>
                    )}
                  </span>
                );
              })}
              {(db?.settings?.[key]||[]).length===0 && <span style={{ fontSize:"0.74rem",color:T.textMuted,fontStyle:"italic" }}>{t.noItemsYet}</span>}
            </div>

            {/* Add new */}
            <div style={{ display:"flex",gap:"6px" }}>
              <input value={newItems[key]||""} onChange={e=>setNewItems(p=>({...p,[key]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addItem(key)}
                placeholder={`${t.addItem} ${label}...`} dir={isRTL?"rtl":"ltr"}
                style={{ flex:1,padding:"7px 10px",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textPrimary,fontSize:"0.82rem",outline:"none",fontFamily:font }}
                onFocus={e=>e.currentTarget.style.borderColor=T.emerald}
                onBlur={e=>e.currentTarget.style.borderColor=T.border}
              />
              <button onClick={()=>addItem(key)} style={{ padding:"7px 12px",background:T.emerald,border:"none",borderRadius:"7px",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center" }}>
                <Plus size={14}/>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* DB info card */}
      <Card style={{ marginTop:"20px",padding:"16px 20px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
          <CheckCircle2 size={16} color={T.positive}/>
          <span style={{ fontSize:"0.82rem",color:T.textSecondary }}>
            {t.dataStorage}: <strong style={{ color:T.textPrimary }}>{DB_FILENAME}</strong> on your Google Drive
          </span>
        </div>
      </Card>
    </div>
  );
}

function AccordionSection({ title, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ padding:"0", overflow:"hidden", marginBottom:"14px", background:"#111c33", border:"1px solid rgba(148,163,184,0.24)" }}>
      <button onClick={()=>setOpen((v)=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(15,23,42,0.92)", border:"none", color:"#e2e8f0", padding:"13px 16px", cursor:"pointer", fontWeight:600, fontSize:"0.84rem" }}>
        <span style={{ display:"flex", alignItems:"center", gap:"8px" }}>{icon}{title}</span>
        <ChevronDown size={16} style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}/>
      </button>
      {open && <div style={{ padding:"14px" }}>{children}</div>}
    </Card>
  );
}

function SearchableMultiYearSelect({ options, selectedYears, onChange, t, font }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = options.filter((year) => String(year).toLowerCase().includes(query.toLowerCase()));
  const allSelected = selectedYears.length === 0;

  return (
    <div ref={ref} style={{ position:"relative", minWidth:"260px" }}>
      <button onClick={()=>setOpen((v)=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", padding:"9px 10px", border:"1px solid rgba(148,163,184,0.32)", borderRadius:"8px", background:"#111c33", color:"#e2e8f0", fontFamily:font, fontSize:"0.8rem", cursor:"pointer" }}>
        <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {allSelected ? t.allYears : selectedYears.join(", ")}
        </span>
        <ChevronDown size={14} style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, border:"1px solid rgba(148,163,184,0.3)", borderRadius:"10px", background:"#0b1220", zIndex:30, padding:"10px", boxShadow:"0 8px 30px rgba(2,6,23,0.6)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", border:"1px solid rgba(148,163,184,0.25)", borderRadius:"8px", padding:"6px 8px", marginBottom:"8px", color:"#94a3b8" }}>
            <Search size={14} />
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={t.yearFilter} style={{ flex:1, border:"none", outline:"none", background:"transparent", color:"#e2e8f0", fontSize:"0.78rem", fontFamily:font }} />
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 4px", color:"#e2e8f0", fontSize:"0.78rem", cursor:"pointer" }}>
            <input type="checkbox" checked={allSelected} onChange={()=>onChange([])} />
            {t.allYears}
          </label>
          <div style={{ maxHeight:"180px", overflowY:"auto", borderTop:"1px solid rgba(148,163,184,0.18)", marginTop:"6px", paddingTop:"6px" }}>
            {filtered.map((year) => {
              const key = String(year);
              const checked = selectedYears.includes(key);
              return (
                <label key={key} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 4px", color:"#cbd5e1", fontSize:"0.78rem", cursor:"pointer" }}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    onChange(checked ? selectedYears.filter((y)=>y!==key) : [...selectedYears, key]);
                  }} />
                  {key}
                </label>
              );
            })}
            {!filtered.length && <div style={{ color:"#64748b", fontSize:"0.75rem", padding:"8px 4px" }}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendList({ rows, currency = "USD" }) {
  return (
    <div style={{ display:"grid", gap:"8px", minWidth:"190px" }}>
      {rows.map((row) => (
        <div key={row.name} style={{ display:"grid", gridTemplateColumns:"14px 1fr auto", gap:"8px", alignItems:"center", fontSize:"0.76rem", color:"#cbd5e1" }}>
          <span style={{ width:"10px", height:"10px", borderRadius:"999px", background:row.color }} />
          <span>{row.name}</span>
          <span style={{ color:"#f8fafc", fontWeight:600 }}>{fmtMoney(row.value, { currency })} ({row.pct.toFixed(1)}%)</span>
        </div>
      ))}
    </div>
  );
}

function StatisticsMatrixTable({ title, headers, rows, currency = "USD" }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
        <thead>
          <tr style={{ background:"rgba(15,23,42,0.85)" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", fontWeight:700, textAlign:"start", whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal = row.isTotal;
            return (
              <tr key={row.key || idx} style={{ background:isTotal?"rgba(16,185,129,0.16)":(idx % 2 ? "rgba(148,163,184,0.07)" : "transparent") }}>
                {row.values.map((cell, ci) => (
                  <td key={`${row.key||idx}-${ci}`} style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:isTotal?"#f8fafc":"#cbd5e1", fontWeight:isTotal?700:500, whiteSpace:"nowrap" }}>
                    {typeof cell === "number" ? fmtMoney(cell, { currency }) : cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FundingSourceBreakdownTable({ rows, currency }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
        <thead>
          <tr style={{ background:"rgba(15,23,42,0.85)" }}>
            <th style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", textAlign:"start" }}><span style={{ display:"inline-flex", alignItems:"center", gap:"6px" }}><Landmark size={14}/>Source Name</span></th>
            <th style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", textAlign:"start" }}><span style={{ display:"inline-flex", alignItems:"center", gap:"6px" }}><CircleDollarSign size={14}/>Total Allocated Amount</span></th>
            <th style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", textAlign:"start" }}><span style={{ display:"inline-flex", alignItems:"center", gap:"6px" }}><ListTree size={14}/>Investments List</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.source} style={{ background:idx % 2 ? "rgba(148,163,184,0.07)" : "transparent" }}>
              <td style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:"#f8fafc", fontWeight:600 }}>{row.source}</td>
              <td style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:"#cbd5e1" }}>{fmtMoney(row.total, { currency })}</td>
              <td style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:"#cbd5e1" }}>
                {row.breakdown.map((item, i) => (
                  <div key={`${row.source}-${i}`} style={{ marginBottom:i===row.breakdown.length-1?0:4 }}>
                    {item.investment}: {fmtMoney(item.amount, { currency })}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatisticsTab() {
  const { db, t, isRTL, font } = useApp();
  const [selectedYears, setSelectedYears] = useState([]);

  const investments = visible(db?.investments || []);
  const transactions = visible(db?.transactions || []);
  const portfolios = visible(db?.portfolios || []);
  const allCurrencies = portfolios.map(p=>p.currency).filter(Boolean);
  const primaryCurrency = allCurrencies[0] || "USD";

  const toRiskBucket = (risk) => {
    const val = String(risk || "").toLowerCase();
    if (val.includes("low") || val.includes("منخفض")) return "low";
    if (val.includes("med") || val.includes("متوسط")) return "medium";
    if (val.includes("high") || val.includes("مرتفع")) return "high";
    return null;
  };

  const invById = new Map(investments.map((i) => [i.id, i]));
  const yearlyRows = [...new Set(transactions.map((tx) => new Date(tx.date || tx.created_at || Date.now()).getFullYear()))]
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);
  const visibleYears = selectedYears.length ? yearlyRows.filter((y) => selectedYears.includes(String(y))) : yearlyRows;

  const capitalByRisk = { low:0, medium:0, high:0 };
  investments.forEach((inv) => {
    const bucket = toRiskBucket(inv.risk);
    if (!bucket) return;
    capitalByRisk[bucket] += costBasis(inv);
  });

  const incomeByYearRisk = {};
  const lossByYearRisk = {};
  const incomeByYearStatus = {};
  const statuses = db?.settings?.transactionStatuses?.length ? db.settings.transactionStatuses : ["recorded", "scheduled", "cancelled"];

  transactions.forEach((tx) => {
    const year = new Date(tx.date || tx.created_at || Date.now()).getFullYear();
    if (!Number.isFinite(year)) return;
    const inv = invById.get(tx.investmentId);
    const risk = toRiskBucket(inv?.risk);
    incomeByYearRisk[year] = incomeByYearRisk[year] || { low:0, medium:0, high:0 };
    lossByYearRisk[year] = lossByYearRisk[year] || { low:0, medium:0, high:0 };
    incomeByYearStatus[year] = incomeByYearStatus[year] || Object.fromEntries(statuses.map((s)=>[s,0]));

    if (tx.type === "income" && tx.status !== "cancelled") {
      if (risk) incomeByYearRisk[year][risk] += (parseFloat(tx.amount) || 0);
      if (incomeByYearStatus[year][tx.status] === undefined) incomeByYearStatus[year][tx.status] = 0;
      incomeByYearStatus[year][tx.status] += (parseFloat(tx.amount) || 0);
    }

    if (tx.type === "expense" && tx.status !== "cancelled" && risk) {
      lossByYearRisk[year][risk] += (parseFloat(tx.amount) || 0);
    }
  });

  const capitalRows = [
    { key:"capital", values:[t.totalCapitalLabel, capitalByRisk.low, capitalByRisk.medium, capitalByRisk.high, capitalByRisk.low + capitalByRisk.medium + capitalByRisk.high] },
  ];

  const riskProfitRows = visibleYears.map((year) => {
    const row = incomeByYearRisk[year] || { low:0, medium:0, high:0 };
    return { key:`risk-profit-${year}`, values:[String(year), row.low, row.medium, row.high, row.low + row.medium + row.high] };
  });
  const riskProfitTotals = riskProfitRows.reduce((acc, row) => {
    acc[0] += row.values[1]; acc[1] += row.values[2]; acc[2] += row.values[3];
    return acc;
  }, [0, 0, 0]);
  riskProfitRows.push({ key:"risk-profit-total", isTotal:true, values:[t.totalLabel, riskProfitTotals[0], riskProfitTotals[1], riskProfitTotals[2], riskProfitTotals[0]+riskProfitTotals[1]+riskProfitTotals[2]] });

  const statusRows = visibleYears.map((year) => {
    const byStatus = incomeByYearStatus[year] || {};
    const values = statuses.map((s) => byStatus[s] || 0);
    return { key:`status-${year}`, values:[String(year), ...values, values.reduce((sum, n) => sum + n, 0)] };
  });
  const statusTotals = statuses.map((status, idx) => statusRows.reduce((sum, row) => sum + (row.values[idx + 1] || 0), 0));
  statusRows.push({ key:"status-total", isTotal:true, values:[t.totalLabel, ...statusTotals, statusTotals.reduce((sum, n) => sum + n, 0)] });

  const lossRows = visibleYears.map((year) => {
    const row = lossByYearRisk[year] || { low:0, medium:0, high:0 };
    return { key:`loss-${year}`, values:[String(year), row.low, row.medium, row.high, row.low + row.medium + row.high] };
  });
  const lossTotals = lossRows.reduce((acc, row) => {
    acc[0] += row.values[1]; acc[1] += row.values[2]; acc[2] += row.values[3];
    return acc;
  }, [0, 0, 0]);
  lossRows.push({ key:"loss-total", isTotal:true, values:[t.totalLabel, lossTotals[0], lossTotals[1], lossTotals[2], lossTotals[0]+lossTotals[1]+lossTotals[2]] });

  const fundingSourceUniverse = [...new Set([...(db?.settings?.fundingSources || []), ...investments.flatMap((inv) => (inv.funding || []).map((f) => f.source).filter(Boolean))])];
  const fundingRows = fundingSourceUniverse.map((source) => {
    const breakdown = [];
    let total = 0;
    investments.forEach((inv) => {
      const amount = (inv.funding || []).filter((f) => f.source === source).reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      if (amount > 0) {
        breakdown.push({ investment:inv.name || t.unassignedInvestment, amount });
        total += amount;
      }
    });
    if (!breakdown.length) breakdown.push({ investment:t.unassignedInvestment, amount:0 });
    return { source, total, breakdown };
  }).filter((row) => row.total > 0 || row.breakdown.length).sort((a,b)=>b.total-a.total);

  const fundingChartTotal = fundingRows.reduce((sum, row) => sum + row.total, 0);
  const fundingChartData = fundingRows.filter((row) => row.total > 0).map((row, idx) => ({ ...row, pct:fundingChartTotal ? (row.total / fundingChartTotal) * 100 : 0, color:T.chart[idx % T.chart.length], name:row.source, value:row.total }));

  const portfolioAllocationBase = portfolios.map((portfolio) => {
    const portfolioInvestments = investments.filter((investment) => investment.portfolioId === portfolio.id);
    const value = portfolioInvestments.reduce((sum, investment) => sum + curVal(investment), 0);
    return { name:portfolio.name, value };
  }).filter((row) => row.value > 0);
  const portfolioAllocationTotal = portfolioAllocationBase.reduce((sum, row) => sum + row.value, 0);
  const portfolioAllocationData = portfolioAllocationBase.map((row, idx) => ({
    ...row,
    pct:portfolioAllocationTotal ? (row.value / portfolioAllocationTotal) * 100 : 0,
    color:T.chart[idx % T.chart.length],
  }));

  const riskCapitalData = [
    { name:t.lowLabel, value:capitalByRisk.low, color:T.positive },
    { name:t.mediumLabel, value:capitalByRisk.medium, color:T.warning },
    { name:t.highLabel, value:capitalByRisk.high, color:T.negative },
  ].filter((row) => row.value > 0);
  const riskCapitalTotal = riskCapitalData.reduce((s,d)=>s+d.value,0);
  riskCapitalData.forEach((row) => { row.pct = riskCapitalTotal ? (row.value/riskCapitalTotal)*100 : 0; });

  const riskProfitByBucket = riskProfitTotals;
  const riskProfitChartData = [
    { name:t.lowLabel, value:riskProfitByBucket[0], color:T.positive },
    { name:t.mediumLabel, value:riskProfitByBucket[1], color:T.warning },
    { name:t.highLabel, value:riskProfitByBucket[2], color:T.negative },
  ].filter((row) => row.value > 0);
  const riskProfitTotal = riskProfitChartData.reduce((s,d)=>s+d.value,0);
  riskProfitChartData.forEach((row) => { row.pct = riskProfitTotal ? (row.value/riskProfitTotal)*100 : 0; });

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font, background:"#0f172a", borderRadius:"14px", padding:"16px" }}>
      <div style={{ marginBottom:"18px", display:"flex", justifyContent:"space-between", gap:"10px", alignItems:"flex-end", flexWrap:"wrap" }}>
        <div>
          <h2 style={{ margin:0, fontSize:"1.45rem", color:"#f8fafc" }}>{t.statistics}</h2>
          <div style={{ marginTop:"4px", fontSize:"0.82rem", color:"#94a3b8" }}>{t.statisticsCenter}</div>
        </div>
        <div>
          <label style={{ display:"block", marginBottom:"6px", fontSize:"0.74rem", color:"#94a3b8" }}>{t.yearFilter}</label>
          <SearchableMultiYearSelect options={yearlyRows} selectedYears={selectedYears} onChange={setSelectedYears} t={t} font={font} />
        </div>
      </div>

      <div style={{ display:"grid", gap:"14px", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", marginBottom:"16px" }}>
        <Card style={{ padding:"14px", background:"#111c33", border:"1px solid rgba(148,163,184,0.24)" }}>
          <h3 style={{ margin:"0 0 10px", color:"#f8fafc", fontSize:"0.88rem" }}>{t.investmentVolumeRiskMatrix}</h3>
          <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px", height:"220px" }}>
              {riskCapitalData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskCapitalData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78}>
                      {riskCapitalData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => fmtMoney(value, { currency:primaryCurrency })} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ display:"grid", placeItems:"center", height:"100%", color:"#64748b" }}>{t.noAllocation}</div>}
            </div>
            <LegendList rows={riskCapitalData} currency={primaryCurrency} />
          </div>
        </Card>

        <Card style={{ padding:"14px", background:"#111c33", border:"1px solid rgba(148,163,184,0.24)" }}>
          <h3 style={{ margin:"0 0 10px", color:"#f8fafc", fontSize:"0.88rem" }}>{t.annualProfitsByRiskLevel}</h3>
          <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px", height:"220px" }}>
              {riskProfitChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskProfitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill:"#94a3b8", fontSize:11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill:"#94a3b8", fontSize:11 }} />
                    <Tooltip formatter={(value) => fmtMoney(value, { currency:primaryCurrency })} />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {riskProfitChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ display:"grid", placeItems:"center", height:"100%", color:"#64748b" }}>{t.noAllocation}</div>}
            </div>
            <LegendList rows={riskProfitChartData} currency={primaryCurrency} />
          </div>
        </Card>

        <Card style={{ padding:"14px", background:"#111c33", border:"1px solid rgba(148,163,184,0.24)" }}>
          <h3 style={{ margin:"0 0 10px", color:"#f8fafc", fontSize:"0.88rem" }}>{t.totalInvestmentByFundingSource}</h3>
          <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px", height:"220px" }}>
              {fundingChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fundingChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78}>
                      {fundingChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => fmtMoney(value, { currency:primaryCurrency })} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ display:"grid", placeItems:"center", height:"100%", color:"#64748b" }}>{t.noFunding}</div>}
            </div>
            <LegendList rows={fundingChartData} currency={primaryCurrency} />
          </div>
        </Card>

        <Card style={{ padding:"14px", background:"#111c33", border:"1px solid rgba(148,163,184,0.24)" }}>
          <h3 style={{ margin:"0 0 10px", color:"#f8fafc", fontSize:"0.88rem" }}>{t.assetAllocationByPortfolio}</h3>
          <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px", height:"220px" }}>
              {portfolioAllocationData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolioAllocationData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78}>
                      {portfolioAllocationData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => fmtMoney(value, { currency:primaryCurrency })} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ display:"grid", placeItems:"center", height:"100%", color:"#64748b" }}>{t.noAllocation}</div>}
            </div>
            <LegendList rows={portfolioAllocationData} currency={primaryCurrency} />
          </div>
        </Card>
      </div>

      <AccordionSection title={t.investmentVolumeRiskMatrix} icon={<PieChartIcon size={14} color="#94a3b8" />}>
        <StatisticsMatrixTable
          currency={primaryCurrency}
          headers={[t.totalCapitalLabel, t.lowLabel, t.mediumLabel, t.highLabel, t.grandTotalLabel]}
          rows={capitalRows}
        />
      </AccordionSection>

      <AccordionSection title={t.annualProfitsByRiskLevel} icon={<BarChart2 size={14} color="#94a3b8" />}>
        <StatisticsMatrixTable
          currency={primaryCurrency}
          headers={[t.yearLabel, t.lowLabel, t.mediumLabel, t.highLabel, t.totalLabel]}
          rows={riskProfitRows}
        />
      </AccordionSection>

      <AccordionSection title={t.annualProfitsByStatus} icon={<Layers size={14} color="#94a3b8" />}>
        <StatisticsMatrixTable
          currency={primaryCurrency}
          headers={[t.yearLabel, ...statuses, t.totalLabel]}
          rows={statusRows}
        />
      </AccordionSection>

      <AccordionSection title={t.lossAnalysisMatrix} icon={<ArrowDownRight size={14} color="#94a3b8" />}>
        <StatisticsMatrixTable
          currency={primaryCurrency}
          headers={[t.yearLabel, t.lowLabel, t.mediumLabel, t.highLabel, t.totalLabel]}
          rows={lossRows}
        />
      </AccordionSection>

      <AccordionSection title="Funding Source Breakdown" icon={<Landmark size={14} color="#94a3b8" />}>
        <FundingSourceBreakdownTable rows={fundingRows} currency={primaryCurrency} />
      </AccordionSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function MainApp() {
  const { syncError, t, isRTL, font } = useApp();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [investmentPrefill, setInvestmentPrefill] = useState(null);
  const [transactionPrefill, setTransactionPrefill] = useState(null);

  useEffect(() => {
    setSidebarOpen(sidebarPinned);
  }, [sidebarPinned]);

  const quickAddInvestment = (portfolioId) => {
    setActiveTab("investments");
    setInvestmentPrefill({ portfolioId });
  };

  const quickAddTransaction = (inv) => {
    setActiveTab("transactions");
    setTransactionPrefill({ portfolioId: inv.portfolioId, investmentId: inv.id });
  };

  const tabs = {
    dashboard:    <Dashboard />,
    portfolios:   <PortfoliosTab onQuickAddInvestment={quickAddInvestment} />,
    investments:  <InvestmentsTab onQuickAddTransaction={quickAddTransaction} modalPrefill={investmentPrefill} />,
    transactions: <TransactionsTab modalPrefill={transactionPrefill} />,
    statistics:   <StatisticsTab />,
    settings:     <SettingsTab />,
  };

  return (
    <div style={{ display:"flex",minHeight:"100vh",background:T.bgApp,fontFamily:font }} dir={isRTL?"rtl":"ltr"}>
      <FontLoader/>
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        body { margin: 0; }
      `}</style>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} pinned={sidebarPinned} setPinned={setSidebarPinned}/>

      {!sidebarPinned && !sidebarOpen && (
        <div
          onMouseEnter={()=>setSidebarOpen(true)}
          style={{ position:"fixed", left:0, top:0, width:"14px", height:"100vh", zIndex:45 }}
        />
      )}

      <main style={{ flex:1,overflowY:"auto",padding:"32px 36px",maxWidth:"100%" }}>
        {syncError && (
          <div style={{ marginBottom:"16px",padding:"10px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"8px",color:T.negative,fontSize:"0.8rem",display:"flex",alignItems:"center",gap:"8px" }}>
            <AlertCircle size={14}/>{syncError}
          </div>
        )}
        {tabs[activeTab]}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <AppProvider>
      <AppContent/>
    </AppProvider>
  );
}

function AppContent() {
  const { user, token, dbLoading, db, t } = useApp();
  if (!user || !token) return <LoginPage/>;
  if (dbLoading || !db) return <LoadingScreen message={t?.loading||"LOADING..."}/>;
  return <MainApp/>;
}

import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
