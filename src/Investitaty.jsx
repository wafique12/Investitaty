import { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  X, Trash2, Check, Edit3, MoreVertical, Zap, BookOpen,
  RefreshCw, ChevronDown, ChevronRight, Plus, Settings,
  TrendingUp, Wallet, DollarSign, BarChart2, Globe, LogOut,
  Cloud, Shield, Layers, Tag, FolderOpen, ArrowUpRight, PieChart as PieChartIcon,
  ArrowDownRight, Eye, EyeOff, AlertCircle, CheckCircle2,
  Menu, Search, Landmark, ListTree, CircleDollarSign, Lock, Unlock, Undo2, RotateCcw, CalendarClock, Info, Download,
} from "lucide-react";
import { supabase, hasSupabaseConfig, hasSupabaseClient } from "./lib/supabaseClient";
import BackupService from "./services/BackupService";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const CLIENT_ID = "535223974831-1h74evq1hj8o493p66e6090h47ttrael.apps.googleusercontent.com";
const API_KEY = "AIzaSyDx1Oy9_0OwRa_CMKNL8wzxdfVOl5S3-gQ";
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];
const DB_FILENAME = "investitaty_db.json";
const AUTH_STORAGE_KEY = "investitaty_auth_v1";
const AUTH_CONSENT_STORAGE_KEY = "investitaty_auth_consent_v1";
const AUTH_LOGIN_DAY_KEY = "investitaty_auth_login_day_v1";
const TAB_STORAGE_KEY = "investitaty_active_tab_v1";
const SESSION_EXPIRED_NOTICE_KEY = "investitaty_session_expired_notice_v1";
const POST_LOGIN_REDIRECT_TAB_KEY = "investitaty_post_login_redirect_tab_v1";
const PORTFOLIOS_COLLAPSE_STORAGE_KEY = "investitaty_portfolios_collapsed_v1";
const PORTFOLIOS_UI_STORAGE_KEY = "investitaty_portfolios_ui_v1";
const INVESTMENTS_COLLAPSE_STORAGE_KEY = "investitaty_investments_collapsed_v1";
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
const AUTH_DEBUG_PREFIX = "[AuthFlow]";
const OWNER_PROTECTED_EMAIL = "wafique22@gmail.com";
const ARCHIVED_FILTER = "__archived__";

const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return "Member";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// ─── New nested schema ────────────────────────────────────────────────────────
// portfolios[]  → investments[]  → transactions[]
// lookup categories stored in settings for dropdown menus
const INITIAL_SCHEMA = {
  settings: {
    portfolioTypes:   ["Real Estate", "Stocks", "Crypto", "Bonds", "Commodities", "ETF", "Private Equity"],
    riskLevels:       ["Low", "Medium", "High", "Speculative"],
    fundingSources:   ["Personal Savings", "Bank Loan", "Brokerage", "Exchange", "Partner Capital"],
    investmentMethods: ["Lump Sum", "DCA", "SIP", "Manual"],
    investmentStatuses: ["Active", "Paused", "Closed"],
    transactionStatuses: ["recorded", "scheduled", "cancelled"],
    transactionCategories: ["Rental Income", "Dividend", "Capital Gain", "Interest", "Maintenance", "Management Fee", "Tax", "Insurance", "Other"],
    currencies:       ["USD", "SAR", "AED", "EUR", "GBP"],
    baseCurrency: "USD",
    currencyRates: { USD: 1, SAR: 3.75, AED: 3.67, EUR: 0.92, GBP: 0.79 },
  },
  portfolios:   [],   // { id, name, type, currency, risk, status, color, notes, created_at, is_hidden }
  investments:  [],   // { id, portfolioId, name, quantity, purchasePrice, currentPrice, purchaseDate, startDate, endDate, investmentMethod, risk, funding:[{source,amount}], notes, status, is_hidden, created_at }
  transactions: [],   // { id, investmentId, portfolioId, category, amount, date, type:"income"|"expense", notes, status:"recorded"|"scheduled"|"cancelled", is_hidden, created_at }
};

// ═══════════════════════════════════════════════════════════════════════════════
// i18n — Arabic / English
// ═══════════════════════════════════════════════════════════════════════════════
const TRANSLATIONS = {
  en: {
    appName: "Investaty",
    appTagline: "Professional Investment Manager",
    signIn: "Sign in with Google",
    connecting: "Connecting...",
    loadingApis: "Loading Google APIs...",
    privacyFirst: "Privacy-First",
    driveSynced: "Drive-Synced",
    privacyNote: "Your data is stored exclusively in your own Google Drive. We never see your investments.",
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
    totalActivePrincipal: "Total Active Principal",
    totalAnnualIncomeYear: "Total Annual Income {year}",
    expectedAnnualIncomeYear: "Expected Annual Income {year}",
    totalIncome: "Total Income",
    incomeYearLabel: "Income {year}",
    collectedTransactions: "collected transactions",
    performanceVsPrincipal: "vs active principal",
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
    fundingSourcesDistribution: "Funding Sources Distribution",
    activeInvestments: "Active Investments",
    statisticsCenter: "Statistics Center",
    yearFilter: "Year Filter",
    allYears: "All Years",
    yearLabel: "Year",
    riskLevelLabel: "Risk Level",
    lowLabel: "Low",
    mediumLabel: "Medium",
    highLabel: "High",
    transactionStatusLabel: "Transaction Status",
    allPortfolios: "All Portfolios",
    totalCapitalLabel: "Total Capital",
    grandTotalLabel: "Grand Total",
    totalLabel: "Total",
    investmentVolumeRiskMatrix: "Investment Volume vs Risk Matrix",
    annualProfitsByRiskLevel: "Annual Profits by Risk Level",
    annualProfitsByStatus: "Annual Profits by Transaction Status",
    lossAnalysisMatrix: "Loss Analysis Matrix",
    assetAllocationOverview: "Asset Allocation Overview",
    centralizedCategoryAnalytics: "Centralized Item/Category Analytics",
    fundingSourceBreakdown: "Funding Sources Distribution",
    sourceName: "Source Name",
    totalAllocatedAmount: "Total Allocated Amount",
    investmentsList: "Investments List",
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
    filterByInvestment: "Filter by Investment",
    view: "View",
    returnLabel: "Back",
    smartBackToInvestments: "Return to Investments",
    viewTransactions: "View transactions",
    viewInvestmentsTooltip: "View Investments",
    viewDetails: "View details",
    editInModal: "Edit",
    deleteItem: "Delete",
    archivedFilter: "Archived",
    smartStatusLabel: "Smart Status",
    smartStatusUpcoming: "Upcoming",
    smartStatusLate: "Late",
    smartStatusDefaulted: "Defaulted",
    smartStatusEarly: "Early Payment",
    smartStatusSearchPlaceholder: "Filter by smart status",
    transactionDateRange: "Transaction Date Range",
    clearDateRange: "Clear",
    allLabel: "All",
    allStatuses: "All statuses",
    unarchive: "Unarchive",
    deleteCascadeWarning: "This will also delete all related investments and transactions. This action cannot be undone.",
    quantity: "Quantity",
    initialCapital: "Initial Capital",
    purchasePrice: "Purchase Price (Per Unit)",
    currentPrice: "Current Price (Per Unit)",
    totalInvestmentValue: "Total Investment Value",
    totalSplitAmount: "Total Split Amount",
    splitFundingMismatchError: "Split funding total must equal Total Investment Value.",
    transactionDateOutOfRange: "Transaction date must be within the investment start and end dates.",
    dueDateOutOfRange: "Due date must be within the investment start and end dates.",
    investmentRequiredForTransaction: "Please select an investment before saving the transaction.",
    requiredFieldsError: "Please fill in all required fields.",
    purchaseDate: "Purchase Date",
    startDate: "Start Date",
    endDate: "End Date",
    investmentMethod: "Investment Method",
    year: "Year",
    month: "Month",
    allMonths: "All Months",
    status: "Status",
    category: "Category",
    amount: "Amount",
    date: "Date",
    transactionType: "Type",
    income: "Income",
    expense: "Expense",
    scheduled: "Scheduled",
    recorded: "Recorded",
    deposited: "Deposited",
    collected: "Collected",
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
    archivePortfolio: "Archive Portfolio",
    settingsTitle: "Settings & Lookup Categories",
    settingsDesc: "Manage dropdown options used across all forms",
    portfolioTypes: "Portfolio Types",
    riskLevels: "Risk Levels",
    fundingSources: "Funding Sources",
    investmentMethods: "Investment Methods",
    transactionCategories: "Transaction Categories",
    currencies: "Currencies",
    usersPermissions: "Users & Permissions",
    usersPermissionsDesc: "Manage user access, account status, and role assignments.",
    searchUsersPlaceholder: "Search by full name or email...",
    showingResults: "Showing",
    ofLabel: "of",
    previous: "Previous",
    next: "Next",
    goToPage: "Go to Page",
    pageSize: "Page Size",
    allRecords: "All",
    exportToExcel: "Export to Excel",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    pageLabel: "Page",
    addItem: "Add",
    dataStorage: "Data stored in",
    language: "Language",
    selectPortfolio: "Select Portfolio",
    selectType: "Select type",
    selectRisk: "Select risk",
    selectSource: "Select source",
    selectCategory: "Select category",
    selectCurrency: "Select currency",
    selectStatus: "Select status",
    selectMethod: "Select method",
    selectInvestment: "Select investment",
    optional: "optional",
    positions: "Positions",
    allocation: "Allocation",
    totalValue: "Total Value",
    activeInvestmentValue: "Active Principal",
    usersName: "Name",
    usersEmail: "Email",
    usersLastLogin: "Last Login",
    usersRole: "Role",
    usersStatus: "Status",
    usersActions: "Actions",
    block: "Block",
    unblock: "Unblock",
    delete: "Delete",
    dominantRisk: "Risk",
    noInvestments: "No investments yet.",
    dueDate: "Due Date",
    authTimeout: "Sign-in timed out. Please try again.",
    authError: "Auth error",
    profileError: "Signed in but could not fetch profile. Check API key.",
    failedGIS: "Failed to load Google Identity Services.",
    failedGAPI: "Failed to load Google API.",
    drivePermissionRequired: "Please grant Google Drive access to enable reading and updating your investment files.",
    failedDrive: "Failed to access Google Drive. Please try again.",
    backupTitle: "Backup",
    backupInfo: "Last backup date",
    backupNow: "Backup Now",
    backupRestoreConfirm: "Restore this backup and replace your current data?",
    backupRestoreSuccess: "Backup restored successfully.",
    backupNoDate: "No backup yet",
    backupNoItems: "No backups available.",
    sessionExpiredSecurity: "Session expired for your security",
    syncFailed: "Sync failed. Changes may not be saved.",
    days: "d",
    overdue: "Overdue",
    today: "Today",
    deployed: "deployed",
    footerBranding: "© 2026 Investaty. Developed and Owned by Wafiq Abdulrahman. All rights reserved.",
    blockedTitle: "Account access blocked",
    blockedMessage: "Your account has been blocked by an administrator. You cannot access investment data until your account is unblocked.",
    accountBlockedLeader: "Access Denied. You do not have permission to use the application at this time. Please contact the administration.",
    permissionsVerifyFailed: "Unable to verify permissions at this time",
    accountInactiveAr: "عذراً، حسابك غير مفعل حالياً. يرجى التواصل مع إدارة التطبيق.",
    accountInactiveEn: "Your account is currently inactive. Please contact administration.",
  },
  ar: {
    appName: "Investaty",
    appTagline: "مدير الاستثمار الاحترافي",
    signIn: "تسجيل الدخول بجوجل",
    connecting: "جارٍ الاتصال...",
    loadingApis: "تحميل واجهات Google...",
    privacyFirst: "خصوصية أولاً",
    driveSynced: "مزامنة Drive",
    privacyNote: "بياناتك محفوظة في Google Drive الخاص بك فقط. نحن لا نرى استثماراتك.",
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
    totalActivePrincipal: "إجمالي أصل المبلغ النشط",
    totalAnnualIncomeYear: "إجمالي دخل السنة {year}",
    expectedAnnualIncomeYear: "إجمالي الدخل المتوقع {year}",
    totalIncome: "إجمالي الدخل",
    incomeYearLabel: "دخل عام {year}",
    collectedTransactions: "معاملات محصّلة",
    performanceVsPrincipal: "مقابل أصل المبلغ النشط",
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
    fundingSourcesDistribution: "توزيع مصادر التمويل",
    activeInvestments: "الاستثمارات النشطة",
    statisticsCenter: "مركز الإحصائيات",
    yearFilter: "مرشح السنة",
    allYears: "كل السنوات",
    yearLabel: "السنة",
    riskLevelLabel: "مستوى المخاطرة",
    lowLabel: "منخفض",
    mediumLabel: "متوسط",
    highLabel: "مرتفع",
    transactionStatusLabel: "حالة المعاملة",
    allPortfolios: "كل المحافظ",
    totalCapitalLabel: "إجمالي رأس المال",
    grandTotalLabel: "الإجمالي الكلي",
    totalLabel: "الإجمالي",
    investmentVolumeRiskMatrix: "مصفوفة حجم الاستثمار مقابل المخاطرة",
    annualProfitsByRiskLevel: "الأرباح السنوية حسب المخاطرة",
    annualProfitsByStatus: "الأرباح السنوية حسب حالة المعاملة",
    lossAnalysisMatrix: "مصفوفة تحليل الخسائر",
    assetAllocationOverview: "نظرة توزيع الأصول",
    centralizedCategoryAnalytics: "تحليلات العناصر/الفئات المركزية",
    fundingSourceBreakdown: "توزيع مصادر التمويل",
    sourceName: "اسم المصدر",
    totalAllocatedAmount: "إجمالي المبلغ المخصص",
    investmentsList: "قائمة الاستثمارات",
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
    filterByInvestment: "تصفية حسب الاستثمار",
    view: "عرض",
    returnLabel: "عودة",
    smartBackToInvestments: "العودة إلى الاستثمارات",
    viewTransactions: "عرض المعاملات",
    viewInvestmentsTooltip: "عرض الاستثمارات",
    viewDetails: "عرض التفاصيل",
    editInModal: "تعديل",
    deleteItem: "حذف",
    archivedFilter: "المؤرشفة",
    smartStatusLabel: "الحالة الذكية",
    smartStatusUpcoming: "قادمة",
    smartStatusLate: "متأخرة",
    smartStatusDefaulted: "متعثرة",
    smartStatusEarly: "سداد مبكر",
    smartStatusSearchPlaceholder: "تصفية حسب الحالة الذكية",
    transactionDateRange: "نطاق تاريخ المعاملة",
    clearDateRange: "مسح",
    allLabel: "الكل",
    allStatuses: "كل الحالات",
    unarchive: "إلغاء الأرشفة",
    deleteCascadeWarning: "سيؤدي هذا أيضًا إلى حذف جميع الاستثمارات والمعاملات المرتبطة. لا يمكن التراجع عن هذا الإجراء.",
    quantity: "الكمية",
    initialCapital: "رأس المال الابتدائي",
    purchasePrice: "سعر الشراء (لكل وحدة)",
    currentPrice: "السعر الحالي (لكل وحدة)",
    totalInvestmentValue: "إجمالي قيمة الاستثمار",
    totalSplitAmount: "إجمالي مبلغ التقسيم",
    splitFundingMismatchError: "يجب أن يساوي إجمالي التمويل المقسم إجمالي قيمة الاستثمار.",
    transactionDateOutOfRange: "يجب أن يكون تاريخ المعاملة ضمن تاريخ بداية ونهاية الاستثمار.",
    dueDateOutOfRange: "يجب أن يكون تاريخ الاستحقاق ضمن تاريخ بداية ونهاية الاستثمار.",
    investmentRequiredForTransaction: "يرجى اختيار استثمار قبل حفظ المعاملة.",
    requiredFieldsError: "يرجى تعبئة جميع الحقول المطلوبة.",
    purchaseDate: "تاريخ الشراء",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    investmentMethod: "طريقة الاستثمار",
    year: "السنة",
    month: "الشهر",
    allMonths: "كل الأشهر",
    status: "الحالة",
    category: "الفئة",
    amount: "المبلغ",
    date: "التاريخ",
    transactionType: "النوع",
    income: "دخل",
    expense: "مصروف",
    scheduled: "مجدول",
    recorded: "مسجل",
    deposited: "مودع",
    collected: "محصل",
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
    archivePortfolio: "أرشفة المحفظة",
    settingsTitle: "الإعدادات وفئات القوائم",
    settingsDesc: "إدارة خيارات القوائم المنسدلة المستخدمة في جميع النماذج",
    portfolioTypes: "أنواع المحافظ",
    riskLevels: "مستويات المخاطرة",
    fundingSources: "مصادر التمويل",
    investmentMethods: "طرق الاستثمار",
    transactionCategories: "فئات المعاملات",
    currencies: "العملات",
    usersPermissions: "المستخدمون والصلاحيات",
    usersPermissionsDesc: "إدارة وصول المستخدمين وحالة الحساب وتعيينات الأدوار.",
    searchUsersPlaceholder: "ابحث بالبريد الإلكتروني أو الاسم الكامل...",
    showingResults: "عرض",
    ofLabel: "من",
    previous: "السابق",
    next: "التالي",
    goToPage: "اذهب إلى الصفحة",
    pageSize: "حجم الصفحة",
    allRecords: "الكل",
    exportToExcel: "تصدير إلى Excel",
    expandAll: "فتح الكل",
    collapseAll: "طي الكل",
    pageLabel: "الصفحة",
    addItem: "إضافة",
    dataStorage: "البيانات محفوظة في",
    language: "اللغة",
    selectPortfolio: "اختر المحفظة",
    selectType: "اختر النوع",
    selectRisk: "اختر المخاطرة",
    selectSource: "اختر المصدر",
    selectCategory: "اختر الفئة",
    selectCurrency: "اختر العملة",
    selectStatus: "اختر الحالة",
    selectMethod: "اختر الطريقة",
    selectInvestment: "اختر الاستثمار",
    optional: "اختياري",
    positions: "مراكز",
    allocation: "التخصيص",
    totalValue: "القيمة الإجمالية",
    activeInvestmentValue: "اصل المبلغ النشط",
    usersName: "الاسم",
    usersEmail: "البريد الإلكتروني",
    usersLastLogin: "آخر تسجيل دخول",
    usersRole: "الدور",
    usersStatus: "الحالة",
    usersActions: "الإجراءات",
    block: "حظر",
    unblock: "إلغاء الحظر",
    delete: "حذف",
    dominantRisk: "المخاطرة",
    noInvestments: "لا توجد استثمارات بعد.",
    dueDate: "تاريخ الاستحقاق",
    authTimeout: "انتهت مهلة تسجيل الدخول. حاول مرة أخرى.",
    authError: "خطأ في المصادقة",
    profileError: "تم تسجيل الدخول لكن تعذّر جلب الملف الشخصي.",
    failedGIS: "فشل تحميل خدمات Google.",
    failedGAPI: "فشل تحميل Google API.",
    drivePermissionRequired: "يرجى منح صلاحية الوصول لـ Google Drive لتتمكن من قراءة وتحديث ملفات الاستثمارات الخاصة بك.",
    failedDrive: "فشل الوصول إلى Google Drive.",
    backupTitle: "النسخ الاحتياطي",
    backupInfo: "تاريخ آخر نسخة احتياطية",
    backupNow: "نسخ احتياطي الآن",
    backupRestoreConfirm: "هل تريد استعادة هذه النسخة واستبدال البيانات الحالية؟",
    backupRestoreSuccess: "تمت استعادة النسخة الاحتياطية بنجاح.",
    backupNoDate: "لا توجد نسخة احتياطية بعد",
    backupNoItems: "لا توجد نسخ احتياطية متاحة.",
    sessionExpiredSecurity: "انتهت الجلسة حفاظًا على أمانك",
    syncFailed: "فشلت المزامنة. ربما لم تُحفظ التغييرات.",
    days: "يوم",
    overdue: "متأخر",
    today: "اليوم",
    deployed: "مُودَع",
    footerBranding: "© 2026 Investaty. مطور ومملوك بواسطة وفيق عبد الرحمن. جميع الحقوق محفوظة.",
    blockedTitle: "تم حظر الوصول للحساب",
    blockedMessage: "تم حظر حسابك من قبل الإدارة. لا يمكنك الوصول إلى بيانات الاستثمار حتى يتم إلغاء الحظر.",
    accountBlockedLeader: "عذراً، لا تملك صلاحية الوصول حالياً. يرجى التواصل مع إدارة التطبيق للمزيد من المعلومات.",
    permissionsVerifyFailed: "غير قادر على التحقق من الصلاحيات حالياً",
    accountInactiveAr: "عذراً، حسابك غير مفعل حالياً. يرجى التواصل مع إدارة التطبيق.",
    accountInactiveEn: "Your account is currently inactive. Please contact administration.",
  },
};

const DEFAULT_USERS_CONFIG = {
  ownerEmail: OWNER_PROTECTED_EMAIL,
  roles: {
    Owner: { permissions: ["block_user", "unblock_user", "assign_role", "manage_everything"] },
    Supervisor: { permissions: ["block_user", "unblock_user"] },
    Admin: { permissions: ["block_user"] },
    Member: { permissions: [] },
  },
  users: [
    { email: OWNER_PROTECTED_EMAIL, role: "Owner", blocked: false },
  ],
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
  const searchRes = await apiFetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DB_FILENAME}'+and+trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const fileId = searchData.files[0].id;
    const fileRes = await apiFetch(
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
  const createRes = await apiFetch(
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
  if (!out.settings.baseCurrency) out.settings.baseCurrency = "USD";
  const existingRates = out.settings.currencyRates && typeof out.settings.currencyRates === "object" ? out.settings.currencyRates : {};
  out.settings.currencyRates = { ...INITIAL_SCHEMA.settings.currencyRates, ...existingRates };

  // Migrate old flat investments → new investments (no portfolioId = they become orphans in a "Migrated" portfolio)
  if (data.investments && data.investments.length > 0 && out.portfolios.length === 0) {
    const migratedPortfolio = {
      id: "migrated_" + Date.now(),
      name: "Migrated Portfolio",
      type: "Stocks",
      currency: "USD",
      risk: "Medium",
      status: out.settings.investmentStatuses?.[0] || "Active",
      color: T.chart[0],
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

  out.portfolios = (out.portfolios || []).map((p, idx) => ({
    ...p,
    status: p.status || out.settings.investmentStatuses?.[0] || "Active",
    color: p.color || T.chart[idx % T.chart.length],
  }));

  out.investments = (out.investments || []).map(inv => ({
    ...inv,
    risk: inv.risk || "Medium",
    startDate: inv.startDate || inv.purchaseDate || "",
    endDate: inv.endDate || "",
    investmentMethod: inv.investmentMethod || "",
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

let onUnauthorized = null;
let suppressUnauthorizedInterceptor = false;

function isAuthRoutePath() {
  const path = String(window?.location?.pathname || "").toLowerCase();
  return path === "/login" || path === "/auth-callback";
}

function setUnauthorizedInterceptor(handler) {
  onUnauthorized = typeof handler === "function" ? handler : null;
}

function setUnauthorizedInterceptorSuppressed(value) {
  suppressUnauthorizedInterceptor = Boolean(value);
}

async function apiFetch(input, init) {
  const res = await fetch(input, init);
  if (res.status === 401 && !suppressUnauthorizedInterceptor && !isAuthRoutePath()) {
    onUnauthorized?.();
  }
  return res;
}

async function saveDB(token, fileId, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const res = await apiFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: blob }
  );
  if (!res.ok) throw new Error(`saveDB ${res.status}`);
}

function isLocalStorageAvailable() {
  try {
    const key = "__investitaty_storage_probe__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

function decodeJwtPayload(token) {
  try {
    if (!token || !String(token).includes(".")) return null;
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch (_) {
    return null;
  }
}

function isTokenClearlyExpired(expiresAt) {
  if (!expiresAt) return false;
  const expiryMs = Number(expiresAt);
  if (!Number.isFinite(expiryMs)) return false;
  return expiryMs <= Date.now();
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HOOK (robust login tracing)
// ═══════════════════════════════════════════════════════════════════════════════
function useGoogleAuth(lang = "en") {
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user || null;
    } catch (_) {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.token || null;
    } catch (_) {
      return null;
    }
  });
  const [tokenExpiresAt, setTokenExpiresAt] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Number(parsed?.tokenExpiresAt || 0) || null;
    } catch (_) {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [gapiReady, setGapiReady] = useState(false);
  const [storageReady, setStorageReady] = useState(() => isLocalStorageAvailable());
  const tokenClientRef = useRef(null);
  const authTimeoutRef = useRef(null);
  const activeAttemptRef = useRef(0);
  const [hasGrantedConsent, setHasGrantedConsent] = useState(() => localStorage.getItem(AUTH_CONSENT_STORAGE_KEY) === "true");

  const authLog = useCallback((step, extra) => {
    if (extra !== undefined) console.log(`${AUTH_DEBUG_PREFIX} ${step}`, extra);
    else console.log(`${AUTH_DEBUG_PREFIX} ${step}`);
  }, []);

  useEffect(() => {
    const storageOK = isLocalStorageAvailable();
    setStorageReady(storageOK);
    authLog("Boot", { origin: window.location.origin, storageOK, lang });

    if (!storageOK) {
      const msg = "Local storage is blocked. Please enable storage/cookies and retry login.";
      setAuthError(msg);
      window.alert(msg);
    }

    if (!window.location.origin) return;
    authLog("Origin check", {
      currentOrigin: window.location.origin,
      advice: "Ensure this exact origin is configured in Google OAuth + Supabase SITE_URL / redirect allowlist.",
      accountChooserMode: "select_account + popup",
    });
  }, [authLog, lang]);

  useEffect(() => {
    setAuthInitialized(true);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      const loginDay = localStorage.getItem(AUTH_LOGIN_DAY_KEY);
      if (!raw || !loginDay) return;
      const today = new Date().toISOString().slice(0, 10);
      if (today !== loginDay) {
        authLog("Daily re-auth required", { loginDay, today });
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_LOGIN_DAY_KEY);
        localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
        setUser(null);
        setToken(null);
        setTokenExpiresAt(null);
      }
    } catch (error) {
      authLog("Daily re-auth check failed", error);
    }
  }, [authLog]);

  useEffect(() => {
    let gisLoaded = false;
    let gapiLoaded = false;
    const trySetReady = () => {
      if (gisLoaded && gapiLoaded) {
        authLog("Google APIs ready");
        setGapiReady(true);
      }
    };

    authLog("Loading GIS/GAPI scripts");
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true; gisScript.defer = true;
    gisScript.onload = () => { gisLoaded = true; authLog("GIS loaded"); trySetReady(); };
    gisScript.onerror = () => {
      authLog("GIS load failed");
      setAuthError("Failed to load Google Identity Services.");
    };
    document.head.appendChild(gisScript);

    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.async = true; gapiScript.defer = true;
    gapiScript.onload = () => {
      authLog("GAPI script loaded");
      window.gapi.load("client", async () => {
        try {
          await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [] });
          authLog("GAPI client initialized");
        } catch (error) {
          authLog("GAPI init warning", error);
        }
        gapiLoaded = true; trySetReady();
      });
    };
    gapiScript.onerror = () => {
      authLog("GAPI load failed");
      setAuthError("Failed to load Google API.");
    };
    document.head.appendChild(gapiScript);
    return () => { if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current); };
  }, [authLog]);

  const signIn = useCallback(() => {
    authLog("Sign-in requested", { gapiReady, storageReady, hasGrantedConsent });
    if (!storageReady) {
      const msg = "Local storage is blocked. Enable storage/cookies, then retry sign-in.";
      setAuthError(msg);
      window.alert(msg);
      return;
    }
    if (!gapiReady) {
      authLog("Sign-in aborted: APIs not ready");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setUnauthorizedInterceptorSuppressed(true);
    const attemptId = Date.now();
    activeAttemptRef.current = attemptId;

    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      if (activeAttemptRef.current !== attemptId) return;
      authLog("Sign-in timed out waiting for callback", { attemptId });
      setAuthLoading(false);
      setUnauthorizedInterceptorSuppressed(false);
      setAuthError("Sign-in timed out. Popup may be blocked or redirect origin is not allowed.");
    }, 30000);

    if (!tokenClientRef.current) {
      authLog("Initializing Google token client");
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: REQUIRED_SCOPES.join(" "),
        include_granted_scopes: true,
        callback: async (response) => {
          authLog("Token callback received", response);
          if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
          if (activeAttemptRef.current !== attemptId) {
            authLog("Ignoring stale callback", { attemptId, activeAttempt: activeAttemptRef.current });
            return;
          }

          if (response?.error) {
            authLog("Google callback error", response.error);
            if (response.error === "consent_required" || response.error === "interaction_required") {
              authLog("Retrying with consent prompt");
              tokenClientRef.current.requestAccessToken({ prompt: "select_account consent" });
              return;
            }
            setAuthLoading(false);
            setUnauthorizedInterceptorSuppressed(false);
            setAuthError(`Auth error: ${response.error}`);
            return;
          }

          if (!response?.access_token) {
            authLog("No access token in callback payload", response);
            setAuthLoading(false);
            setUnauthorizedInterceptorSuppressed(false);
            setAuthError("Google returned no session token. Please retry (popup/redirect may be blocked).");
            return;
          }

          const grantedAllScopes = window.google.accounts.oauth2.hasGrantedAllScopes(response, ...REQUIRED_SCOPES);
          authLog("Scope check", { grantedAllScopes });
          if (!grantedAllScopes) {
            setAuthLoading(false);
            setAuthError(translations.drivePermissionRequired);
            setUser(null);
            setToken(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_CONSENT_STORAGE_KEY);
            setHasGrantedConsent(false);
            setUnauthorizedInterceptorSuppressed(false);
            return;
          }

          localStorage.setItem(AUTH_CONSENT_STORAGE_KEY, "true");
          setHasGrantedConsent(true);
          const accessToken = response.access_token;
          const expiresInSec = Number(response.expires_in || 3600);
          const expiresAt = Date.now() + Math.max(0, expiresInSec - 30) * 1000;
          setTokenExpiresAt(expiresAt);

          try {
            authLog("Fetching user profile via OAuth userinfo endpoint");
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!userRes.ok) throw new Error(`userinfo ${userRes.status}`);
            const userInfo = await userRes.json();
            const normalizedUser = { ...userInfo, id: userInfo?.id || userInfo?.sub || null };
            authLog("User profile loaded", { id: normalizedUser?.id, email: normalizedUser?.email });
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: normalizedUser, token: accessToken, tokenExpiresAt: expiresAt }));
            localStorage.setItem(AUTH_LOGIN_DAY_KEY, new Date().toISOString().slice(0, 10));
            setUser(normalizedUser);
            setToken(accessToken);
          } catch (err) {
            authLog("User profile fetch failed; trying token payload fallback", err);
            const payload = decodeJwtPayload(response.id_token);
            if (payload?.sub || payload?.email) {
              const fallbackUser = {
                id: payload.sub || null,
                email: payload.email || null,
                name: payload.name || payload.given_name || "User",
                picture: payload.picture || null,
              };
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: fallbackUser, token: accessToken, tokenExpiresAt: expiresAt }));
              localStorage.setItem(AUTH_LOGIN_DAY_KEY, new Date().toISOString().slice(0, 10));
              setUser(fallbackUser);
              setToken(accessToken);
              authLog("Fallback profile created from id_token", fallbackUser);
            } else {
              setAuthError("Signed in but could not fetch profile. Check API key / redirect origin / popup policies.");
              setToken(accessToken);
            }
          } finally {
            authLog("Sign-in callback completed");
            setUnauthorizedInterceptorSuppressed(false);
            setAuthLoading(false);
          }
        },
      });
    }

    const prompt = hasGrantedConsent ? "select_account" : "select_account consent";
    authLog("Requesting access token (forced account chooser)", {
      prompt,
      display: "popup",
      attemptId,
      note: "Using Google account chooser flow to avoid legacy hanging OAuth route",
    });
    tokenClientRef.current.requestAccessToken({ prompt });
  }, [authLog, gapiReady, hasGrantedConsent, storageReady, translations.drivePermissionRequired]);

  const signOut = useCallback(() => {
    authLog("Sign-out requested", { hasToken: Boolean(token) });
    if (token) { try { window.google.accounts.oauth2.revoke(token); } catch(_) {} }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_CONSENT_STORAGE_KEY);
    localStorage.removeItem(AUTH_LOGIN_DAY_KEY);
    setHasGrantedConsent(false);
    setUnauthorizedInterceptorSuppressed(false);
    setUser(null); setToken(null); setTokenExpiresAt(null); setAuthError(null); tokenClientRef.current = null;
  }, [authLog, token]);

  useEffect(() => {
    if (user && token) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token, tokenExpiresAt }));
        authLog("Auth session persisted", { userId: user?.id, email: user?.email, tokenExpiresAt });
      } catch (error) {
        authLog("Auth session persistence failed", error);
        setAuthError("Unable to save session locally. Check browser storage/cookie permissions.");
      }
    }
  }, [user, token, tokenExpiresAt, authLog]);

  useEffect(() => {
    if (!user || !token) return;
    if (!isTokenClearlyExpired(tokenExpiresAt)) return;
    localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
    setUser(null);
    setToken(null);
    setTokenExpiresAt(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_LOGIN_DAY_KEY);
  }, [user, token, tokenExpiresAt]);

  return { user, token, tokenExpiresAt, authInitialized, authLoading, authError, gapiReady, signIn, signOut };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════
function AppProvider({ children }) {
  const [lang, setLang] = useState("en");
  const auth = useGoogleAuth(lang);
  const [usersConfig, setUsersConfig] = useState(DEFAULT_USERS_CONFIG);
  const [usersConfigReady, setUsersConfigReady] = useState(false);
  const [gatekeeperError, setGatekeeperError] = useState(null);
  const [userSyncDone, setUserSyncDone] = useState(false);
  const [db, setDb] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [supabaseSessionReady, setSupabaseSessionReady] = useState(!hasSupabaseClient);
  const [backupFiles, setBackupFiles] = useState([]);
  const [lastBackupAt, setLastBackupAt] = useState(() => BackupService.getStoredMeta()?.lastBackupAt || null);
  const [backupBusy, setBackupBusy] = useState(false);
  const inactivityTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  const clearLocalSessionState = useCallback((shouldSignOut = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setDb(null);
    setFileId(null);
    setSyncError(null);
    setDbLoading(false);
    setGatekeeperError(null);
    setUserSyncDone(false);
    setBackupFiles([]);
    if (shouldSignOut) auth.signOut();
  }, [auth]);

  const forceAutoLogout = useCallback((reason = "Unauthorized") => {
    if (!auth.authInitialized || auth.authLoading || isAuthRoutePath()) {
      console.log(`${AUTH_DEBUG_PREFIX} Skip auto-logout`, { reason, authInitialized: auth.authInitialized, authLoading: auth.authLoading, path: window.location.pathname });
      return;
    }
    localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
    clearLocalSessionState(true);
  }, [auth.authInitialized, auth.authLoading, clearLocalSessionState]);

  const ensureValidSession = useCallback(() => {
    if (!auth.authInitialized || auth.authLoading) {
      return false;
    }
    if (!auth.user?.id || !auth.token) {
      console.log(`${AUTH_DEBUG_PREFIX} Redirecting because token is null`, { hasUser: Boolean(auth.user?.id), hasToken: Boolean(auth.token) });
      forceAutoLogout("Missing token/user");
      return false;
    }
    if (isTokenClearlyExpired(auth.tokenExpiresAt)) {
      console.log(`${AUTH_DEBUG_PREFIX} Redirecting because token is expired`, { tokenExpiresAt: auth.tokenExpiresAt });
      forceAutoLogout("Expired token");
      return false;
    }
    return true;
  }, [auth.authInitialized, auth.authLoading, auth.user?.id, auth.token, auth.tokenExpiresAt, forceAutoLogout]);

  const fetchBackups = useCallback(async () => {
    if (!ensureValidSession() || !auth.token) return [];
    const folderId = await BackupService.findOrCreateBackupFolder(auth.token);
    const files = await BackupService.listBackups(auth.token, folderId);
    setBackupFiles(files.slice(0, BackupService.MAX_BACKUPS));
    const localMetaDate = BackupService.getStoredMeta()?.lastBackupAt || null;
    const driveLatest = files[0]?.createdTime || null;
    setLastBackupAt(localMetaDate || driveLatest);
    return files;
  }, [auth.token, ensureValidSession]);

  const triggerBackup = useCallback(async ({ isAuto = false } = {}) => {
    if (!ensureValidSession() || !auth.token || !db || backupBusy) return null;
    setBackupBusy(true);
    try {
      const result = await BackupService.createBackup(auth.token, db);
      setBackupFiles(result.backups || []);
      setLastBackupAt(result.lastBackupAt || new Date().toISOString());
      return result;
    } catch (error) {
      const label = isAuto ? "Auto backup failed" : "Backup failed";
      setSyncError(`${label}: ${error?.message || "Unknown error"}`);
      return null;
    } finally {
      setBackupBusy(false);
    }
  }, [auth.token, db, backupBusy, ensureValidSession]);

  const restoreBackup = useCallback(async (backup) => {
    if (!ensureValidSession() || !auth.token || !fileId || !backup?.id) return false;
    try {
      const snapshot = await BackupService.downloadBackup(auth.token, backup.id);
      const migrated = migrateSchema(snapshot);
      setDb(migrated);
      await saveDB(auth.token, fileId, migrated);
      return true;
    } catch (error) {
      setSyncError(`Restore failed: ${error?.message || "Unknown error"}`);
      return false;
    }
  }, [auth.token, fileId, ensureValidSession]);

  const t = TRANSLATIONS[lang];
  const isRTL = lang === "ar";
  const font = isRTL ? T.fontAr : T.fontSans;

  useEffect(() => {
    setUnauthorizedInterceptor(forceAutoLogout);
    BackupService.setUnauthorizedHandler(forceAutoLogout);
    return () => {
      setUnauthorizedInterceptor(null);
      BackupService.setUnauthorizedHandler(null);
    };
  }, [forceAutoLogout]);

  const buildUsersConfig = useCallback((rows = []) => {
    const normalizedRows = rows.map((row) => {
      const status = String(row?.status || "active").toLowerCase();
      return {
        ...row,
        name: row?.full_name || row?.name || null,
        role: normalizeRole(row?.role || "Member"),
        status,
        blocked: status === "blocked",
        lastLogin: row?.lastLogin || row?.last_login || null,
      };
    });
    return { ...DEFAULT_USERS_CONFIG, users: normalizedRows };
  }, []);

  const fetchUsersConfig = useCallback(async ({ requireRemote = false } = {}) => {
    if (!hasSupabaseClient) {
      const configError = new Error("Supabase client is not initialized.");
      console.log("[Supabase] fetchUsersConfig skipped:", configError.message);
      if (requireRemote) throw configError;
      setUsersConfig(DEFAULT_USERS_CONFIG);
      return DEFAULT_USERS_CONFIG;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("email, role, status, full_name, last_login")
        .order("email", { ascending: true });
      if (error) {
        console.log("[Supabase] fetchUsersConfig error:", error);
        if (requireRemote) throw error;
        setUsersConfig(DEFAULT_USERS_CONFIG);
        return DEFAULT_USERS_CONFIG;
      }
      const next = buildUsersConfig(data || []);
      setUsersConfig(next);
      return next;
    } catch (err) {
      console.log("[Supabase] fetchUsersConfig catch:", err);
      if (requireRemote) throw err;
      setUsersConfig(DEFAULT_USERS_CONFIG);
      return DEFAULT_USERS_CONFIG;
    }
  }, [buildUsersConfig]);

  useEffect(() => {
    fetchUsersConfig().finally(() => setUsersConfigReady(true));
  }, [fetchUsersConfig]);

  useEffect(() => {
    if (!usersConfigReady || !auth.user) return;
    const intervalId = setInterval(() => {
      fetchUsersConfig().catch(() => {});
    }, 10000);
    return () => clearInterval(intervalId);
  }, [usersConfigReady, auth.user, fetchUsersConfig]);

  const currentEmail = String(auth?.user?.email || "").toLowerCase();
  const ownerEmail = String(usersConfig?.ownerEmail || OWNER_PROTECTED_EMAIL).toLowerCase();
  const listedUser = (usersConfig?.users || []).find((u) => String(u.email || "").toLowerCase() === currentEmail) || null;
  const currentRole = normalizeRole(listedUser?.role || (currentEmail && currentEmail === ownerEmail ? "Owner" : "member"));
  const userStatus = String(listedUser?.status || (listedUser?.blocked ? "blocked" : "active")).toLowerCase();
  const isBlocked = currentEmail && currentEmail !== ownerEmail ? ["blocked", "paused", "deleted"].includes(userStatus) : false;
  const hasPermission = useCallback((permission) => {
    const rolePerms = usersConfig?.roles?.[currentRole]?.permissions || [];
    return rolePerms.includes("manage_everything") || rolePerms.includes(permission);
  }, [usersConfig, currentRole]);

  const manualSync = useCallback(async () => {
    if (!ensureValidSession() || !auth.token || isBlocked || !userSyncDone) return false;
    setSyncError(null);
    setSyncing(true);
    try {
      const { fileId: fid, data } = await findOrCreateDB(auth.token);
      setFileId(fid);
      setDb(data);
      try { await fetchBackups(); } catch (_) {}
      return true;
    } catch (error) {
      setSyncError(`Sync failed: ${error?.message || "Unknown error"}`);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [auth.token, isBlocked, userSyncDone, fetchBackups, ensureValidSession]);


  useEffect(() => {
    if (!usersConfigReady) return;
    if (!auth.user || !auth.token) {
      setUserSyncDone(false);
      return;
    }

    let isCancelled = false;
    const runGatekeeper = async () => {
      if (!hasSupabaseClient) {
        console.log("[Supabase] Gatekeeper skipped: Supabase client not initialized.");
        setGatekeeperError(t.permissionsVerifyFailed);
        setUserSyncDone(false);
        return;
      }

      const email = String(auth.user.email || "").toLowerCase();
      const protectedOwnerEmail = OWNER_PROTECTED_EMAIL.toLowerCase();
      const isOwner = email === protectedOwnerEmail;
      const now = new Date().toISOString();

      try {
        let existing = null;
        const { data: existingUser, error: existingUserError } = await supabase
          .from("users")
          .select("email, role, status, full_name, last_login")
          .eq("email", email)
          .maybeSingle();

        if (existingUserError) {
          console.log("[Supabase] Gatekeeper existing user error:", existingUserError);
          setGatekeeperError(t.permissionsVerifyFailed);
          auth.signOut();
          setUserSyncDone(false);
          return;
        }
        existing = existingUser;

        if (!existing) {
          const { error: insertError } = await supabase.from("users").insert({
            full_name: auth.user.name || String(email).split("@")[0],
            email,
            role: isOwner ? "Owner" : "Member",
            status: "active",
            last_login: now,
          });
          if (insertError) {
            console.log("[Supabase] Gatekeeper insert error:", insertError);
            setGatekeeperError(t.permissionsVerifyFailed);
            auth.signOut();
            setUserSyncDone(false);
            return;
          }
        } else {
          const status = String(existing.status || "active").toLowerCase();
          if (!isOwner && ["blocked", "paused", "deleted"].includes(status)) {
            setGatekeeperError(t.accountBlockedLeader);
            auth.signOut();
            setUserSyncDone(false);
            return;
          }

          const { error: updateError } = await supabase.from("users").update({
            full_name: auth.user.name || existing.full_name || String(email).split("@")[0],
            last_login: now,
          }).eq("email", email);

          if (updateError) {
            console.log("[Supabase] Gatekeeper update error:", updateError);
            setGatekeeperError(t.permissionsVerifyFailed);
            auth.signOut();
            setUserSyncDone(false);
            return;
          }
        }

        let freshConfig;
        try {
          freshConfig = await fetchUsersConfig({ requireRemote: true });
        } catch (error) {
          console.log("[Supabase] Gatekeeper refresh config error:", error);
          setGatekeeperError(t.permissionsVerifyFailed);
          auth.signOut();
          setUserSyncDone(false);
          return;
        }
        if (isCancelled) return;

        setUsersConfig(freshConfig);
        setGatekeeperError(null);
        setUserSyncDone(true);
      } catch (error) {
        console.log("[Supabase] Gatekeeper unexpected error:", error);
        setGatekeeperError(t.permissionsVerifyFailed);
        auth.signOut();
        setUserSyncDone(false);
      }
    };

    runGatekeeper();
    return () => { isCancelled = true; };
  }, [auth.user, auth.token, auth.signOut, fetchUsersConfig, usersConfigReady, t.accountBlockedLeader, t.permissionsVerifyFailed]);

  useEffect(() => {
    if (!auth.token || isBlocked || !userSyncDone) return;
    if (!ensureValidSession()) return;
    setDbLoading(true);
    findOrCreateDB(auth.token)
      .then(({ fileId: fid, data }) => { setFileId(fid); setDb(data); setDbLoading(false); })
      .catch(() => { setSyncError("Failed to access Google Drive."); setDbLoading(false); });
  }, [auth.token, isBlocked, userSyncDone, ensureValidSession]);

  useEffect(() => {
    if (!auth.token || !db || isBlocked || !userSyncDone) return;
    let cancelled = false;
    const run = async () => {
      try {
        const files = await fetchBackups();
        if (cancelled) return;
        const localMetaDate = BackupService.getStoredMeta()?.lastBackupAt || null;
        const mostRecent = localMetaDate || files?.[0]?.createdTime || null;
        if (BackupService.shouldAutoBackup(mostRecent)) {
          setTimeout(() => {
            if (!cancelled) triggerBackup({ isAuto: true });
          }, 0);
        }
      } catch (error) {
        if (!cancelled) setSyncError(`Backup list failed: ${error?.message || "Unknown error"}`);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [auth.token, db, isBlocked, userSyncDone, fetchBackups, triggerBackup]);

  useEffect(() => {
    if (!auth.user?.id || !auth.token) return;
    const onExpire = () => {
      localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
      clearLocalSessionState(true);
    };
    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(onExpire, INACTIVITY_TIMEOUT_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "click"];
    events.forEach((name) => window.addEventListener(name, resetTimer));
    resetTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach((name) => window.removeEventListener(name, resetTimer));
    };
  }, [auth.user?.id, auth.token, clearLocalSessionState]);

  useEffect(() => {
    if (!hasSupabaseClient || !supabase?.auth?.getSession) return;
    let mounted = true;
    supabase.auth.getSession()
      .catch(() => null)
      .finally(() => {
        if (mounted) setSupabaseSessionReady(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hasSupabaseClient || !supabase?.auth?.onAuthStateChange) return;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionExpired = Boolean(session?.expires_at && session.expires_at * 1000 <= Date.now());
      const shouldForceLogout = event === "SIGNED_OUT" || sessionExpired;
      console.log(`${AUTH_DEBUG_PREFIX} Supabase auth state changed`, {
        event,
        hasSession: Boolean(session),
        sessionExpired,
        supabaseSessionReady,
        authLoading: auth.authLoading,
      });
      if (!supabaseSessionReady || auth.authLoading || !shouldForceLogout) return;
      clearLocalSessionState(true);
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, [clearLocalSessionState, supabaseSessionReady, auth.authLoading]);

  useEffect(() => {
    if (!auth.user?.id || !auth.token) {
      clearLocalSessionState(false);
    }
  }, [auth.user?.id, auth.token, clearLocalSessionState]);

  const updateDb = useCallback((updater) => {
    setDb((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!ensureValidSession() || !auth.token || !fileId) return;
        setSyncing(true);
        try { await saveDB(auth.token, fileId, next); }
        catch { setSyncError("Sync failed."); }
        finally { setSyncing(false); }
      }, 800);
      return next;
    });
  }, [auth.token, fileId, ensureValidSession]);

  const archiveItem = useCallback((collection, id) => {
    updateDb(prev => {
      const next = { ...prev };
      if (collection === "portfolios") {
        const invIds = (prev.investments || []).filter(inv => inv.portfolioId === id).map(inv => inv.id);
        next.portfolios = (prev.portfolios || []).map(item => item.id === id ? { ...item, is_hidden: true } : item);
        next.investments = (prev.investments || []).map(item => item.portfolioId === id ? { ...item, is_hidden: true } : item);
        next.transactions = (prev.transactions || []).map(item => (item.portfolioId === id || invIds.includes(item.investmentId)) ? { ...item, is_hidden: true } : item);
        return next;
      }
      if (collection === "investments") {
        next.investments = (prev.investments || []).map(item => item.id === id ? { ...item, is_hidden: true } : item);
        next.transactions = (prev.transactions || []).map(item => item.investmentId === id ? { ...item, is_hidden: true } : item);
        return next;
      }
      next[collection] = (prev[collection] || []).map(item => item.id === id ? { ...item, is_hidden: true } : item);
      return next;
    });
  }, [updateDb]);

  const unarchiveItem = useCallback((collection, id) => {
    updateDb(prev => {
      const next = { ...prev };
      if (collection === "portfolios") {
        const invIds = (prev.investments || []).filter(inv => inv.portfolioId === id).map(inv => inv.id);
        next.portfolios = (prev.portfolios || []).map(item => item.id === id ? { ...item, is_hidden: false } : item);
        next.investments = (prev.investments || []).map(item => item.portfolioId === id ? { ...item, is_hidden: false } : item);
        next.transactions = (prev.transactions || []).map(item => (item.portfolioId === id || invIds.includes(item.investmentId)) ? { ...item, is_hidden: false } : item);
        return next;
      }
      if (collection === "investments") {
        next.investments = (prev.investments || []).map(item => item.id === id ? { ...item, is_hidden: false } : item);
        next.transactions = (prev.transactions || []).map(item => item.investmentId === id ? { ...item, is_hidden: false } : item);
        return next;
      }
      next[collection] = (prev[collection] || []).map(item => item.id === id ? { ...item, is_hidden: false } : item);
      return next;
    });
  }, [updateDb]);

  const hardDeleteItem = useCallback((collection, id) => {
    updateDb(prev => {
      const next = { ...prev };
      if (collection === "portfolios") {
        const invIds = (prev.investments || []).filter(inv => inv.portfolioId === id).map(inv => inv.id);
        next.portfolios = (prev.portfolios || []).filter(item => item.id !== id);
        next.investments = (prev.investments || []).filter(item => item.portfolioId !== id);
        next.transactions = (prev.transactions || []).filter(item => item.portfolioId !== id && !invIds.includes(item.investmentId));
        return next;
      }
      if (collection === "investments") {
        next.investments = (prev.investments || []).filter(item => item.id !== id);
        next.transactions = (prev.transactions || []).filter(item => item.investmentId !== id);
        return next;
      }
      next[collection] = (prev[collection] || []).filter(item => item.id !== id);
      return next;
    });
  }, [updateDb]);

  const softDelete = archiveItem;

  const patchItem = useCallback((collection, id, patch) => {
    updateDb(prev => {
      const next = {
        ...prev,
        [collection]: prev[collection].map(item => item.id === id ? { ...item, ...patch } : item),
      };
      if (collection === "portfolios") {
        const nextStatus = String(patch?.status || "").toLowerCase();
        if (["cancelled", "paused", "closed"].includes(nextStatus)) {
          next.investments = (prev.investments || []).map((inv) => inv.portfolioId === id ? { ...inv, status: patch.status } : inv);
        }
      }
      return next;
    });
  }, [updateDb]);

  const addItem = useCallback((collection, item) => {
    const newItem = { ...item, id: Date.now() + "_" + Math.random().toString(36).slice(2), created_at: new Date().toISOString() };
    updateDb(prev => ({ ...prev, [collection]: [...prev[collection], newItem] }));
    return newItem;
  }, [updateDb]);

  const updateUserEntry = useCallback(async (email, updater) => {
    if (!hasSupabaseClient) {
      console.log("[Supabase] updateUserEntry skipped: Supabase client not initialized.");
      return false;
    }

    const normalized = String(email || "").toLowerCase();
    const users = [...(usersConfig?.users || [])];
    const idx = users.findIndex((u) => String(u.email || "").toLowerCase() === normalized);
    if (idx < 0) return false;
    const nextUser = typeof updater === "function" ? updater(users[idx]) : { ...users[idx], ...updater };
    const nextStatus = String(nextUser?.status || "active").toLowerCase();
    const payload = {
      full_name: nextUser?.name || null,
      role: normalizeRole(nextUser?.role || "Member"),
      status: nextStatus,
      last_login: nextUser?.lastLogin || null,
    };

    try {
      const { error } = await supabase.from("users").update(payload).eq("email", normalized);
      if (error) {
        console.log("[Supabase] updateUserEntry error:", error);
        return false;
      }
      await fetchUsersConfig({ requireRemote: true });
      return true;
    } catch (error) {
      console.log("[Supabase] updateUserEntry catch:", error);
      return false;
    }
  }, [usersConfig, fetchUsersConfig]);

  const deleteUserEntry = useCallback(async (email) => {
    if (!hasSupabaseClient) {
      console.log("[Supabase] deleteUserEntry skipped: Supabase client not initialized.");
      return false;
    }

    const normalized = String(email || "").toLowerCase();
    try {
      const { error } = await supabase.from("users").delete().eq("email", normalized);
      if (error) {
        console.log("[Supabase] deleteUserEntry error:", error);
        return false;
      }
      await fetchUsersConfig({ requireRemote: true });
      return true;
    } catch (error) {
      console.log("[Supabase] deleteUserEntry catch:", error);
      return false;
    }
  }, [fetchUsersConfig]);

  const value = {
    ...auth, db, fileId, syncing, syncError, dbLoading,
    updateDb, softDelete, archiveItem, unarchiveItem, hardDeleteItem, patchItem, addItem,
    lang, setLang, t, isRTL, font,
    usersConfig, usersConfigReady, currentRole, isBlocked, hasPermission,
    updateUserEntry, deleteUserEntry, gatekeeperError, userSyncDone,
    backupFiles, lastBackupAt, backupBusy, triggerBackup, restoreBackup, fetchBackups, manualSync,
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
    secondary:{ background:"#e2e8f0",          color:"#0f172a",        border:`1px solid ${T.border}`, boxShadow:"0 1px 2px rgba(0,0,0,0.05)" },
    ghost:    { background:"transparent",       color:T.textSecondary,  border:`1px solid ${T.border}` },
    danger:   { background:"rgba(239,68,68,0.08)", color:"#ef4444",     border:"1px solid rgba(239,68,68,0.2)" },
    sidebar:  { background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)", border:"1px solid rgba(255,255,255,0.12)" },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...extra }}
      onMouseEnter={e => { if(!disabled && variant==="primary") e.currentTarget.style.background=T.emeraldDim; if(!disabled && variant==="secondary") e.currentTarget.style.background="#cbd5e1"; }}
      onMouseLeave={e => { if(!disabled && variant==="primary") e.currentTarget.style.background=T.emerald; if(!disabled && variant==="secondary") e.currentTarget.style.background="#e2e8f0"; }}
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

const filterBarCss = {
  display:"flex",
  alignItems:"center",
  gap:"12px",
  flexWrap:"wrap",
  marginBottom:"16px",
  padding:"12px",
  background:"#e2e8f0",
  border:"1px solid rgba(148,163,184,0.32)",
  borderRadius:"12px",
};

const filterInputCss = (isRTL) => ({
  ...inputCss(isRTL),
  flex:"1 1 180px",
  background:"#ffffff",
  border:"1px solid rgba(148,163,184,0.46)",
  minHeight:"38px",
  fontSize:"0.82rem",
  colorScheme:"light",
});

function DateRangeFilter({ startDate, endDate, onChange, onClear, isRTL, label, clearLabel, panelTop }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const displayValue = startDate && endDate
    ? `${startDate} → ${endDate}`
    : startDate
      ? `${startDate} → --`
      : endDate
        ? `-- → ${endDate}`
        : label;

  return (
    <div ref={wrapRef} style={{ position:"relative", width:"240px", maxWidth:"100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ ...filterInputCss(isRTL), width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", textAlign:isRTL?"right":"left" }}
      >
        <span style={{ color:(startDate || endDate) ? T.textPrimary : T.textMuted, fontSize:"0.82rem" }}>{displayValue}</span>
        <CalendarClock size={14} color={T.textMuted} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", zIndex:1000, width:"100%", maxWidth:"240px", background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"10px", boxShadow:"0 12px 28px rgba(15,23,42,0.14)", padding:"10px" }}>
          <div style={{ display:"grid", gap:"8px" }}>
            {panelTop}
            <>
              <input type="date" value={startDate} onChange={(e)=>onChange(e.target.value, endDate)} style={{ ...filterInputCss(isRTL), minHeight:"34px" }} />
              <input type="date" value={endDate} onChange={(e)=>onChange(startDate, e.target.value)} style={{ ...filterInputCss(isRTL), minHeight:"34px" }} />
            </>
            <button type="button" onClick={()=>{ onClear(); setOpen(false); }} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontSize:"0.78rem", color:T.textSecondary }}>{clearLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ value, onChange, type="text", placeholder, isRTL, readOnly = false, className = "", invalid = false, style: extraStyle = {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly} className={className}
      style={{ ...inputCss(isRTL), borderColor: invalid ? T.negative : (focused ? T.emerald : T.border), background: readOnly ? "#f1f5f9" : inputCss(isRTL).background, ...extraStyle }}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    />
  );
}

function Select({ value, onChange, options, placeholder, isRTL, style, disabled = false, invalid = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      style={{ ...inputCss(isRTL), borderColor: invalid ? T.negative : (focused?T.emerald:T.border), cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.7:1, ...style }}
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
function KPICard({ label, value, sub, trend, accent = T.emerald, icon: Icon_, currency = "USD", badge, valueDecimals = 3 }) {
  const isPos = trend === undefined || trend >= 0;
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
      <div style={{ fontSize:"1.6rem",fontWeight:700,color:T.textPrimary,lineHeight:1,marginBottom:"8px" }}>{fmtMoney(value, { currency, decimals:valueDecimals })}</div>
      <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
        {trend !== undefined && (
          <span style={{ display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"0.72rem",fontWeight:500,
            color:isPos?T.positive:T.negative,background:isPos?`${T.positive}12`:`${T.negative}12`,
            border:`1px solid ${isPos?T.positive:T.negative}25`,borderRadius:"4px",padding:"1px 6px" }}>
            {isPos ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
            {fmtMoney(Math.abs(trend), { currency, decimals:valueDecimals })}
          </span>
        )}
        {sub && <span style={{ fontSize:"0.72rem",color:T.textMuted }}>{sub}</span>}
        {badge && <span style={{ fontSize:"0.72rem",color:badge.color||T.textSecondary,fontWeight:600,whiteSpace:"nowrap" }}>{badge.text}</span>}
      </div>
    </Card>
  );
}

function BrandingFooter({ text, isDark = false }) {
  return (
    <footer style={{
      width:"100%",
      textAlign:"center",
      fontSize:"0.7rem",
      lineHeight:1.5,
      letterSpacing:"0.01em",
      color:isDark ? "rgba(241,245,249,0.58)" : "rgba(15,23,42,0.52)",
      padding:"8px 0",
      userSelect:"none",
    }}>
      {text}
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
// استيراد الإصدار من ملف package.json
import { version } from '../package.json'; 
function LoginPage() {
  const { signIn, authLoading, gapiReady, authError, gatekeeperError, lang, setLang, t, isRTL, font } = useApp();
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !hasSupabaseClient) {
      console.log("[Supabase] Login page loaded without a working Supabase client.");
    }
  }, []);


  useEffect(() => {
    if (localStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === "1") {
      setSessionExpiredNotice(true);
      localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
    }
  }, []);

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
          <img src="/images/logo.svg" alt="Investaty logo" style={{ width:"68px",height:"68px",borderRadius:"18px",boxShadow:`0 0 40px ${T.emerald}20` }} />
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
        {sessionExpiredNotice && (
          <div style={{ marginTop:"14px",padding:"10px 14px",background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.35)",borderRadius:"8px",color:"rgba(251,191,36,0.95)",fontSize:"0.76rem" }}>
            ⚠ {t.sessionExpiredSecurity}
          </div>
        )}
        {(authError || gatekeeperError || !hasSupabaseConfig || !hasSupabaseClient) && (
          <div style={{ marginTop:"14px",padding:"10px 14px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"8px",color:"rgba(255,100,100,0.9)",fontSize:"0.76rem" }}>
            ⚠ {authError || gatekeeperError || ((!hasSupabaseConfig || !hasSupabaseClient) ? t.permissionsVerifyFailed : "")}
          </div>
        )}
        <p style={{ marginTop:"24px",fontSize:"0.72rem",lineHeight:1.7,color:"rgba(255,255,255,0.3)" }}>{t.privacyNote}</p>
      </div>

      <div style={{ position:"absolute",left:"20px",right:"20px",bottom:"10px" }}>
        <BrandingFooter text={`${t.footerBranding} | v${version}`}  isDark />
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
  const { t, isRTL } = useApp();
  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bgSidebar,fontFamily:T.fontSans,padding:"24px" }}>
      <div style={{ width:"40px",height:"40px",border:`2px solid ${T.emerald}30`,borderTopColor:T.emerald,borderRadius:"50%",animation:"spin 0.9s linear infinite",marginBottom:"16px" }}/>
      <p style={{ color:`${T.emerald}99`,fontSize:"0.8rem",letterSpacing:"0.12em" }}>{message||"LOADING..."}</p>
      <div style={{ marginTop:"24px" }}><BrandingFooter text={t.footerBranding} isDark /></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════
function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, isMobile, mobileOpen, setMobileOpen }) {
  const { user, signOut, syncing, t, font, lang, setLang, hasPermission, currentRole, manualSync } = useApp();
  const canManageUsers = currentRole === "Owner" || hasPermission("assign_role") || hasPermission("block_user") || hasPermission("unblock_user");

  const navItems = [
    { id:"dashboard",    label:t.dashboard,    icon:<BarChart2 size={17}/> },
    { id:"portfolios",   label:t.portfolios,   icon:<FolderOpen size={17}/> },
    { id:"investments",  label:t.investments,  icon:<Wallet size={17}/> },
    { id:"transactions", label:t.transactions, icon:<DollarSign size={17}/> },
    { id:"statistics",   label:t.statistics,   icon:<PieChartIcon size={17}/> },
    ...(canManageUsers ? [{ id:"users", label:"Users & Permissions", icon:<Shield size={17}/> }] : []),
    { id:"settings",     label:t.settings,     icon:<Settings size={17}/> },
  ];

  const showLabels = isMobile ? true : isOpen;
  const handleHamburger = () => setIsOpen((prev) => !prev);

  const sidebarContent = (
    <>
      <div style={{ padding:showLabels?"24px 20px 18px":"16px 10px",borderBottom:`1px solid ${T.borderDark}` }}>
        <div style={{ display:"flex",alignItems:"center",gap:"10px",justifyContent:showLabels?"flex-start":"center" }}>
          {!isMobile && (
            <button onClick={handleHamburger} title={t.collapseSidebar} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"28px", height:"28px", borderRadius:"6px", border:`1px solid ${T.borderDark}`, background:"transparent", color:T.textSidebar, cursor:"pointer", flexShrink:0 }}>
              <Menu size={14} />
            </button>
          )}
          <img src="/images/logo.svg" alt="Investaty" style={{ width:"32px",height:"32px",borderRadius:"8px",flexShrink:0 }} />
          {showLabels && <span style={{ color:"#f1f5f9",fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.08em" }}>INVESTATY</span>}
        </div>
        {showLabels && (
          <div style={{ display:"flex",alignItems:"center",gap:"6px",marginTop:"8px" }}>
            <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:syncing?"#f59e0b":T.emerald,transition:"background 0.3s" }}/>
            <button onClick={manualSync} style={{ background:"none",border:"none",padding:0,cursor:"pointer",color:syncing?"#f59e0b90":`${T.emerald}80`,fontSize:"0.62rem",letterSpacing:"0.1em",textTransform:"uppercase",textDecoration:"underline" }}>
              {syncing ? t.syncing : t.synced}
            </button>
          </div>
        )}
      </div>

      <nav style={{ flex:1,padding:"10px 10px" }}>
        {navItems.map(({ id, label, icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); if (isMobile) setMobileOpen(false); }} style={{
              display:"flex",alignItems:"center",gap:"10px",width:"100%",
              padding:"9px 12px",borderRadius:"8px",border:"none",
              background:active?T.emeraldBg:"transparent",
              color:active?T.emerald:T.textSidebarMuted,
              fontSize:"0.83rem",fontWeight:active?600:400,cursor:"pointer",
              textAlign:"left",transition:"all 0.15s",marginBottom:"2px",
              borderLeft:active?`2px solid ${T.emerald}`:"2px solid transparent",
              justifyContent:showLabels?"flex-start":"center",
            }}
            >
              {icon}{showLabels && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

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
              <div style={{ color:"rgba(255,255,255,0.42)",fontSize:"0.62rem",fontWeight:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"2px" }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ display:"flex",alignItems:"center",gap:"6px",width:"100%",padding:"7px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"7px",color:"rgba(255,100,100,0.8)",fontSize:"0.76rem",cursor:"pointer",fontFamily:font }}>
            <LogOut size={13}/>{t.signOut}
          </button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && <div onClick={()=>setMobileOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:180 }} />}
        <aside dir="ltr" style={{ position:"fixed",left:0,top:0,bottom:0,zIndex:200,width:"260px",background:T.bgSidebar,transform:mobileOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.2s ease",display:"flex",flexDirection:"column" }}>
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside dir="ltr" style={{
      position:"fixed",
      left:0,
      top:0,
      width:showLabels?"220px":"72px",
      height:"100vh",
      background:T.bgSidebar,
      borderRight:"none",
      display:"flex",
      flexDirection:"column",
      flexShrink:0,
      zIndex:120,
      fontFamily:font,
      transition:"width 0.2s ease",
    }}>
      {sidebarContent}
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
const isCollectedTransaction = (tx) => {
  const status = String(tx?.status || "").toLowerCase();
  return status.includes("collect") || status.includes("record") || Boolean(tx?.collectedAt || tx?.collected_at);
};
const isDepositedTransaction = (tx) => {
  const status = String(tx?.status || "").toLowerCase();
  return status.includes("deposit") || status.includes("مودع") || Boolean(tx?.depositedAt || tx?.deposited_at);
};
const isScheduledTransaction = (tx) => {
  const status = String(tx?.status || "").toLowerCase();
  return status.includes("schedule") || status.includes("مجدول");
};
const txStatusDate = (tx) => {
  if (isCollectedTransaction(tx)) return tx?.collectedAt || tx?.collected_at || tx?.depositedAt || tx?.deposited_at || tx?.dueDate || tx?.date || tx?.created_at;
  if (isDepositedTransaction(tx)) return tx?.depositedAt || tx?.deposited_at || tx?.date || tx?.created_at;
  if (isScheduledTransaction(tx)) return tx?.dueDate || tx?.date || tx?.created_at;
  return tx?.date || tx?.created_at;
};
const txIncome = (txs) => txs.filter(t=>t.type==="income").reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
const txExpense = (txs) => txs.filter(t=>t.type==="expense").reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
const baseCurrencyCode = (db) => db?.settings?.baseCurrency || "USD";
const currencyRateFromUSD = (db, currency="USD") => {
  const parsed = Number(db?.settings?.currencyRates?.[currency]);
  if (!Number.isFinite(parsed) || parsed <= 0) return currency === "USD" ? 1 : 0;
  return parsed;
};
const convertCurrency = (db, amount, sourceCurrency="USD", targetCurrency="USD") => {
  const safeAmount = Number(amount) || 0;
  if (sourceCurrency === targetCurrency) return safeAmount;
  const sourceRate = currencyRateFromUSD(db, sourceCurrency);
  const targetRate = currencyRateFromUSD(db, targetCurrency);
  if (!sourceRate || !targetRate) return 0;
  const amountInUsd = safeAmount / sourceRate;
  return amountInUsd * targetRate;
};
const toBaseAmount = (db, amount, sourceCurrency="USD") => convertCurrency(db, amount, sourceCurrency, baseCurrencyCode(db));
const currencySymbol = (currency="USD") => ({ USD:"$", EUR:"€", GBP:"£", SAR:"﷼", AED:"د.إ" }[currency] || currency);
const fmtMoney = (v, { compact=false, currency="USD", decimals=3 } = {}) => {
  const n = Number(v||0);
  const symbol = currencySymbol(currency);
  return symbol + n.toLocaleString("en-US",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
};
const toDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};
const getSmartTxStatus = (tx) => {
  const due = toDateOnly(tx?.dueDate || tx?.due_date);
  const collected = toDateOnly(tx?.collectedAt || tx?.collected_at);
  if (!due) return null;
  if (collected && collected < due) return "early";
  if (isCollectedTransaction(tx)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due > today) return "upcoming";
  const diffDays = Math.floor((today - due) / 86400000);
  if (diffDays > 90) return "defaulted";
  return "late";
};
const smartStatusColor = (status) => {
  if (status === "early") return T.positive;
  if (status === "upcoming") return T.info;
  if (status === "late") return T.warning;
  if (status === "defaulted") return T.negative;
  return T.textMuted;
};
const portfolioCurrency = (db, portfolioId) => (visible(db?.portfolios||[]).find(p=>p.id===portfolioId)?.currency || "USD");
const isActiveInvestment = (inv) => String(inv?.status || "Active").toLowerCase() === "active";
const investmentValue = (inv) => (parseFloat(inv?.quantity) || 0) * (parseFloat(inv?.currentPrice) || 0);
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

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — KPI + Charts + Portfolio cards
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard() {
  const { db, t, isRTL, font } = useApp();
  const [sourceModal, setSourceModal] = useState(null);
  if (!db) return null;

  const portfolios = visible(db.portfolios);
  const investments = visible(db.investments);
  const transactions = visible(db.transactions);
  const baseCurrency = baseCurrencyCode(db);

  const activeInvestments = investments.filter(isActiveInvestment);
  const activePrincipal = activeInvestments
    .reduce((s,i)=>s+toBaseAmount(db, costBasis(i), portfolioCurrency(db, i.portfolioId)),0);
  const totalPortfolioValue = activeInvestments
    .reduce((s,i)=>s+toBaseAmount(db, investmentValue(i), portfolioCurrency(db, i.portfolioId)),0);
  const portfolioDeltaValue = totalPortfolioValue - activePrincipal;
  const portfolioDeltaPct = activePrincipal > 0 ? (portfolioDeltaValue / activePrincipal) * 100 : 0;

  const currentYear = new Date().getFullYear();
  const totalAnnualIncome = transactions
    .filter((tx) => {
      if (tx.type !== "income" || !isCollectedTransaction(tx)) return false;
      const dt = tx.collectedAt || tx.collected_at || tx.date || tx.created_at;
      if (!dt) return false;
      return new Date(dt).getFullYear() === currentYear;
    })
    .reduce((sum, tx)=>sum + toBaseAmount(db, parseFloat(tx.amount)||0, portfolioCurrency(db, tx.portfolioId)), 0);

  const currentYearIncomeTransactions = transactions.filter((tx) => {
    if (tx.type !== "income") return false;
    const expectedStatus = isCollectedTransaction(tx) || isDepositedTransaction(tx) || isScheduledTransaction(tx);
    if (!expectedStatus) return false;
    const dt = txStatusDate(tx);
    if (!dt) return false;
    return new Date(dt).getFullYear() === currentYear;
  });

  const expectedAnnualIncome = currentYearIncomeTransactions
    .filter((tx) => {
      const category = String(tx.category || "").toLowerCase();
      return category.includes("dividend") || category.includes("yield") || category.includes("توزيع") || category.includes("عائد");
    })
    .reduce((sum, tx) => sum + toBaseAmount(db, parseFloat(tx.amount) || 0, portfolioCurrency(db, tx.portfolioId)), 0);

  const expectedCapitalGains = currentYearIncomeTransactions
    .filter((tx) => {
      const category = String(tx.category || "").toLowerCase();
      return category.includes("capital gain") || category.includes("رأس") || category.includes("رأسمالي");
    })
    .reduce((sum, tx) => sum + toBaseAmount(db, parseFloat(tx.amount) || 0, portfolioCurrency(db, tx.portfolioId)), 0);

  const totalCollectedCount = transactions.filter((tx) => tx.type === "income" && isCollectedTransaction(tx)).length;

  const hour = new Date().getHours();
  const greeting = hour<12?t.goodMorning:hour<18?t.goodAfternoon:t.goodEvening;

  // Chart data: allocation by portfolio type/category
  const allocationByType = {};
  portfolios.forEach((portfolio) => {
    const typeKey = portfolio.type || t.unassignedType;
    const portfolioTotal = inv_of_portfolio(db, portfolio.id)
      .reduce((sum, inv) => sum + toBaseAmount(db, curVal(inv), portfolio.currency || "USD"), 0);
    if (portfolioTotal > 0) {
      allocationByType[typeKey] = (allocationByType[typeKey] || 0) + portfolioTotal;
    }
  });

  const allocationData = Object.entries(allocationByType)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalAlloc = allocationData.reduce((s,d)=>s+d.value,0);
  const pieData = allocationData.map(d=>({ ...d, pct:totalAlloc>0?(d.value/totalAlloc)*100:0 }));

  // Upcoming: scheduled transactions sorted by dueDate
  const upcoming = transactions
    .filter(tx=>tx.status==="scheduled"&&tx.dueDate)
    .sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))
    .slice(0,5);

  // Funding source distribution chart + modal dataset
  const fundingDistribution = [...new Set([...(db?.settings?.fundingSources || []), ...investments.flatMap((inv) => (inv.funding || []).map((f) => f.source).filter(Boolean))])]
    .map((source, idx) => {
      const activeInvestments = investments.filter((inv) => (inv.status || "Active") === "Active");
      const items = activeInvestments
        .map((inv) => {
          const amount = (inv.funding || [])
            .filter((f) => f.source === source)
            .reduce((sum, f) => sum + toBaseAmount(db, parseFloat(f.amount) || 0, portfolioCurrency(db, inv.portfolioId)), 0);
          return amount > 0 ? { id: inv.id, name: inv.name, amount: toBaseAmount(db, amount, portfolioCurrency(db, inv.portfolioId)), currency: baseCurrency } : null;
        })
        .filter(Boolean);
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      return {
        name: source,
        value: total,
        pct: 0,
        color: T.chart[idx % T.chart.length],
        investments: items,
      };
    })
    .filter((row) => row.value > 0);
  const totalFunding = fundingDistribution.reduce((sum, row) => sum + row.value, 0);
  fundingDistribution.forEach((row) => {
    row.pct = totalFunding ? (row.value / totalFunding) * 100 : 0;
  });

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
        <KPICard label={t.totalActivePrincipal} value={activePrincipal} valueDecimals={2} currency={baseCurrency} sub={`${activeInvestments.length} ${t.activePositions}`} accent={T.info} icon={Wallet} />
        <KPICard
          label={t.totalPortfolioValue}
          value={totalPortfolioValue}
          valueDecimals={2}
          currency={baseCurrency}
          sub={<span title={`${t.totalPortfolioValue}: ${fmtMoney(totalPortfolioValue, { currency:baseCurrency, decimals:2 })} | ${t.totalActivePrincipal}: ${fmtMoney(activePrincipal, { currency:baseCurrency, decimals:2 })}`}>{isRTL ? "ⓘ" : <Info size={12} style={{ verticalAlign:"middle" }} />}</span>}
          badge={{
            text:`${portfolioDeltaPct>=0?"+":""}${portfolioDeltaPct.toFixed(2)}% (${portfolioDeltaValue>=0?"+":""}${fmtMoney(portfolioDeltaValue,{currency:baseCurrency, decimals:2})})`,
            color:portfolioDeltaValue>=0?T.positive:T.negative,
          }}
          accent={portfolioDeltaValue>=0?T.positive:T.negative}
          icon={TrendingUp}
        />
        <KPICard
          label={t.totalAnnualIncomeYear.replace("{year}", isRTL ? currentYear.toLocaleString("ar-EG") : String(currentYear))}
          value={totalAnnualIncome}
          valueDecimals={2}
          currency={baseCurrency}
          sub={`${totalCollectedCount} ${t.collectedTransactions}`}
          accent={T.positive}
          icon={ArrowUpRight}
        />
        <KPICard
          label={t.expectedAnnualIncomeYear.replace("{year}", isRTL ? currentYear.toLocaleString("ar-EG") : String(currentYear))}
          value={expectedAnnualIncome}
          valueDecimals={2}
          currency={baseCurrency}
          sub={`${t.capitalGains}: ${fmtMoney(expectedCapitalGains, { currency:baseCurrency, decimals:2 })}`}
          accent={T.warning}
          icon={CalendarClock}
        />
        <KPICard label={t.totalIncome} value={transactions.filter(t=>t.type==="income").reduce((sum, tx)=>sum + toBaseAmount(db, parseFloat(tx.amount)||0, portfolioCurrency(db, tx.portfolioId)), 0)} valueDecimals={2} currency={baseCurrency} sub={`${transactions.filter(tx=>tx.type==="income").length} ${t.payments}`} accent={T.info} icon={Landmark} />
      </div>

      {/* Charts row */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 0.9fr 1.15fr",gap:"16px",marginBottom:"28px" }}>

        {/* Donut allocation */}
        <Card style={{ padding:"18px", maxHeight:"450px", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
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
                    <Tooltip formatter={(v)=>[fmtMoney(v, { currency:baseCurrency }),"Value"]} contentStyle={{ background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.78rem" }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1,display:"flex",flexDirection:"column",gap:"6px" }}>
                  {pieData.map((d,i)=>(
                    <div key={d.name} style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                      <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:T.chart[i%T.chart.length],flexShrink:0 }}/>
                      <span style={{ fontSize:"0.7rem",color:T.textSecondary,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.name}</span>
                      <span style={{ fontSize:"0.68rem",color:T.textMuted }}>{d.pct.toFixed(3)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </Card>

        {/* Upcoming cash flow */}
        <Card style={{ padding:"18px", maxHeight:"450px", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
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

        {/* Funding source distribution */}
        <Card style={{ padding:"18px", maxHeight:"450px", overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
          <SectionHeader title={t.fundingSourcesDistribution} />
          {fundingDistribution.length === 0
            ? <EmptyState text={t.noFunding} />
            : (
              <div style={{ display:"grid", gridTemplateColumns:"minmax(170px, 45%) minmax(200px, 1fr)", alignItems:"center", gap:"18px" }}>
                <div style={{ height:"190px", minWidth:0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fundingDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={72}
                        onClick={(_, idx) => setSourceModal(fundingDistribution[idx] || null)}
                      >
                        {fundingDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} style={{ cursor:"pointer" }} />)}
                      </Pie>
                      <Tooltip formatter={(value, _name, props) => [`${fmtMoney(value, { currency:baseCurrency })} · ${props?.payload?.pct?.toFixed(3) || 0}%`, props?.payload?.name || ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ minWidth:0 }}><LegendList rows={fundingDistribution} currency={baseCurrency} textColor="#0f172a" valueColor="#020617" /></div>
              </div>
            )
          }
        </Card>
      </div>

      {sourceModal && (
        <Modal title={`${sourceModal.name} · ${t.activeInvestments}`} onClose={() => setSourceModal(null)} maxWidth="560px">
          {sourceModal.investments.length ? (
            <div style={{ display:"grid", gap:"10px" }}>
              {sourceModal.investments.map((inv) => (
                <div key={inv.id} style={{ padding:"10px 12px", border:`1px solid ${T.border}`, borderRadius:"10px", background:"#ffffff" }}>
                  <div style={{ fontSize:"0.86rem", fontWeight:600, color:T.textPrimary }}>{inv.name}</div>
                  <div style={{ fontSize:"0.78rem", color:T.textSecondary }}>{fmtMoney(inv.amount, { currency:inv.currency || baseCurrency })}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={t.noInvestments} />
          )}
        </Modal>
      )}

      {/* Portfolio cards */}
      <SectionHeader title={t.portfolioList} />
      {portfolios.length === 0
        ? <EmptyState text={t.noPortfolioData} />
        : (
          <div style={{ display:"flex",gap:"14px",overflowX:"auto",paddingBottom:"8px",scrollbarWidth:"thin",scrollbarColor:`${T.border} transparent` }}>
            {portfolios.map((p,i)=>{
              const pvInvs = inv_of_portfolio(db,p.id);
              const pActiveInvs = pvInvs.filter(isActiveInvestment);
              const pValue = pActiveInvs.reduce((s,inv)=>s+investmentValue(inv),0);
              const pActivePrincipal = pActiveInvs.reduce((s,inv)=>s+costBasis(inv),0);
              const pRealizedIncome = tx_of_portfolio(db,p.id).filter((tx)=>tx.type==="income" && isCollectedTransaction(tx)).reduce((s,tx)=>s+(parseFloat(tx.amount)||0),0);
              const pRoi   = pActivePrincipal>0?(((pValue + pRealizedIncome)-pActivePrincipal)/pActivePrincipal)*100:0;
              const color  = p.color || T.chart[i%T.chart.length];
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
                    <span style={{ fontSize:"0.72rem",fontWeight:600,color:pRoi>=0?T.positive:T.negative }}>{pRoi>=0?"+":""}{pRoi.toFixed(3)}%</span>
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
function PortfoliosTab({ onQuickAddInvestment, onViewInvestments }) {

  const { db, addItem, archiveItem, unarchiveItem, hardDeleteItem, patchItem, t, isRTL, font } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedPortfolios, setCollapsedPortfolios] = useState({});
  const EMPTY = { name:"",type:"",initialCapital:"",risk:"",currency:"USD",status:"Active",color:T.chart[0],notes:"" };
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [invalidFields, setInvalidFields] = useState({});
  const f = k => v => setForm(p=>({...p,[k]:v}));

  useEffect(() => () => {
    setShowModal(false);
    setEditItem(null);
    setModalMode("create");
    setFilterStatus("");
    setSearchOpen(false);
    setSearchTerm("");
    setCollapsedPortfolios({});
    setForm(EMPTY);
    setFormError("");
    setInvalidFields({});
  }, []);

  const allPortfolios = db?.portfolios||[];
  const statusOpts = ((db?.settings?.investmentStatuses&&db.settings.investmentStatuses.length)?db.settings.investmentStatuses:["Active","Paused","Closed"]).map((v)=>({ value:v, label:v }));

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(PORTFOLIOS_COLLAPSE_STORAGE_KEY) || "{}");
    if (saved && typeof saved === "object") setCollapsedPortfolios(saved);
    const savedUi = JSON.parse(localStorage.getItem(PORTFOLIOS_UI_STORAGE_KEY) || "null");
    if (!savedUi || typeof savedUi !== "object") return;
    setFilterStatus(savedUi.filterStatus || "");
    setSearchTerm(savedUi.searchTerm || "");
    setSearchOpen(Boolean(savedUi.searchOpen || savedUi.searchTerm));
  }, []);

  useEffect(() => {
    setCollapsedPortfolios((prev) => {
      const next = { ...prev };
      (allPortfolios || []).forEach((portfolio) => {
        if (!Object.prototype.hasOwnProperty.call(next, portfolio.id)) next[portfolio.id] = true;
      });
      Object.keys(next).forEach((id) => {
        if (!(allPortfolios || []).some((portfolio) => portfolio.id === id)) delete next[id];
      });
      return next;
    });
  }, [allPortfolios]);

  useEffect(() => {
    localStorage.setItem(PORTFOLIOS_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedPortfolios));
  }, [collapsedPortfolios]);
  useEffect(() => {
    localStorage.setItem(PORTFOLIOS_UI_STORAGE_KEY, JSON.stringify({ filterStatus, searchTerm, searchOpen }));
  }, [filterStatus, searchTerm, searchOpen]);
  const portfolios = allPortfolios.filter((p) => {
    const matchesSearch = !searchTerm.trim() || String(p.name || "").toLowerCase().includes(searchTerm.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (!filterStatus) return !p.is_hidden;
    if (filterStatus === ARCHIVED_FILTER) return Boolean(p.is_hidden);
    return !p.is_hidden && p.status === filterStatus;
  });

  const handleSave = () => {
    const nextInvalid = {
      name: !form.name.trim(),
      type: !form.type,
      initialCapital: form.initialCapital === "" || Number.isNaN(Number(form.initialCapital)),
    };
    setInvalidFields(nextInvalid);
    if (Object.values(nextInvalid).some(Boolean)) {
      setFormError(t.requiredFieldsError);
      return;
    }
    setFormError("");
    if (editItem) { patchItem("portfolios",editItem.id,form); }
    else { addItem("portfolios",form); }
    setInvalidFields({});
    setForm(EMPTY); setShowModal(false); setEditItem(null); setModalMode("create");
  };

  const openView = (p) => { setForm({name:p.name,type:p.type,initialCapital:p.initialCapital||"",risk:p.risk,currency:p.currency,status:p.status||"Active",color:p.color||T.chart[0],notes:p.notes||""}); setEditItem(p); setModalMode("view"); setFormError(""); setInvalidFields({}); setShowModal(true); };

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px",gap:"10px",flexWrap:"wrap" }}>
        <div>
          <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.portfolios}</h2>
          <div style={{ fontSize:"0.8rem",color:T.textMuted,marginTop:"2px" }}>{allPortfolios.length} {t.portfolios.toLowerCase()}</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" }}>
          <Btn size="sm" variant="secondary" onClick={()=>setCollapsedPortfolios(Object.fromEntries(portfolios.map((p)=>[p.id,false])))}>{t.expandAll}</Btn>
          <Btn size="sm" variant="secondary" onClick={()=>setCollapsedPortfolios(Object.fromEntries(portfolios.map((p)=>[p.id,true])))}>{t.collapseAll}</Btn>
          <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
            <button title={t.searchUsersPlaceholder} onClick={()=>setSearchOpen((v)=>!v)} style={{ width:"34px",height:"34px",borderRadius:"8px",border:`1px solid ${T.border}`,background:T.bgCard,color:T.textSecondary,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center" }}>
              <Search size={15} />
            </button>
            {searchOpen && (
              <div style={{ width:"220px",maxWidth:"52vw" }}>
                <Input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} isRTL={isRTL} placeholder={t.searchUsersPlaceholder} />
              </div>
            )}
          </div>
          <Btn icon={<Plus size={15}/>} onClick={()=>{setForm(EMPTY);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});setShowModal(true);}}>{t.addPortfolio}</Btn>
        </div>
      </div>

      <div style={{ ...filterBarCss, justifyContent:isRTL?"flex-start":"flex-end" }}>
        <div style={{ width:"220px", maxWidth:"100%" }}>
          <Select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} options={[{ value:"", label:t.status }, ...statusOpts, { value:ARCHIVED_FILTER, label:t.archivedFilter }]} isRTL={isRTL} style={{ ...filterInputCss(isRTL), width:"100%", flex:"0 0 auto" }} />
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px",alignItems:"start" }}>
        {portfolios.map((p,i) => {
          const invs = inv_of_portfolio(db,p.id);
          const activePrincipal = invs.filter(isActiveInvestment).reduce((sum, inv) => sum + costBasis(inv), 0);
          const totalValue = invs.filter(isActiveInvestment).reduce((sum, inv)=>sum+curVal(inv),0);
          const pTx    = tx_of_portfolio(db,p.id);
          const pIncome = txIncome(pTx);
          const pRealizedIncome = txIncome(pTx.filter((tx)=>isCollectedTransaction(tx)));
          const currentYear = new Date().getFullYear();
          const pIncomeCurrentYear = txIncome(
            pTx.filter((tx) => {
              const dt = tx.date || tx.created_at;
              if (!dt) return false;
              const year = new Date(dt).getFullYear();
              return year === currentYear;
            })
          );
          const yearLabel = t.incomeYearLabel.replace("{year}", isRTL ? currentYear.toLocaleString("ar-EG") : String(currentYear));
          const pRoi   = activePrincipal>0?(((totalValue + pRealizedIncome)-activePrincipal)/activePrincipal)*100:0;
          const color  = p.color || T.chart[i%T.chart.length];
          const isCollapsed = Boolean(collapsedPortfolios[p.id]);
          return (
            <Card key={p.id} style={{ overflow:"hidden",height:"fit-content",alignSelf:"start" }}>
              <div style={{ height:"4px",background:`linear-gradient(90deg,${color},${color}80)` }}/>
              <div style={{ padding:isCollapsed?"10px 14px":"18px" }}>
                <div style={{ marginBottom:isCollapsed?"0":"12px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",marginBottom:"8px" }}>
                    <button
                      title={isCollapsed ? t.expandAll : t.collapseAll}
                      onClick={()=>setCollapsedPortfolios((prev)=>({ ...prev, [p.id]: !Boolean(prev[p.id]) }))}
                      style={{ display:"flex",alignItems:"center",gap:"7px",minWidth:0,background:"none",border:"none",padding:0,cursor:"pointer" }}
                    >
                      <FolderOpen size={14} color={T.textMuted}/>
                      <div style={{ fontSize:"1rem",fontWeight:600,color:T.textPrimary,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.name}</div>
                    </button>
                    <div style={{ display:"flex",gap:"4px",flexShrink:0 }}>
                      <button title={t.viewDetails} onClick={()=>openView(p)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                        onMouseEnter={e=>{e.currentTarget.style.background=T.bgApp; e.currentTarget.style.color=T.warning;}} onMouseLeave={e=>{e.currentTarget.style.background="none"; e.currentTarget.style.color=T.textMuted;}}>
                        <Eye size={14}/>
                      </button>
                      <button onClick={()=>onQuickAddInvestment?.(p.id)} title={t.addInvestmentAction} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color=T.emerald} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}><Plus size={14}/></button>
                      <button onClick={()=>onViewInvestments?.(p)} title={t.investments} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color=T.info} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}><ListTree size={14}/></button>
                      <button onClick={()=>p.is_hidden?unarchiveItem("portfolios",p.id):archiveItem("portfolios",p.id)} title={p.is_hidden ? t.unarchive : t.archivePortfolio} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color=T.warning} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>{p.is_hidden?<Eye size={14}/>:<EyeOff size={14}/>}</button>
                      <button title={t.deleteItem} onClick={()=>{ if(window.confirm(t.deleteCascadeWarning)) hardDeleteItem("portfolios",p.id); }} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                        onMouseEnter={e=>e.currentTarget.style.color=T.negative} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap",paddingLeft:isRTL?0:"21px",paddingRight:isRTL?"21px":0 }}>
                    <Chip color={color}>{p.type}</Chip>
                    <Chip color={T.info}>{p.risk}</Chip>
                    <Chip color={statusColor(p.status)}>{p.status || "—"}</Chip>
                  </div>
                </div>
                {!isCollapsed && (<><div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"10px",marginBottom:"14px" }}>                  <button
                    onClick={() => onViewInvestments?.(p, { status: "Active" })}
                    style={{ padding:"10px",background:T.bgApp,borderRadius:"8px",border:"none",cursor:"pointer",textAlign:isRTL?"right":"left" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="#e2e8f0"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=T.bgApp; }}
                  >
                    <div style={{ fontSize:"0.68rem",color:T.textMuted,marginBottom:"3px" }}>{t.activeInvestmentValue}</div>
                    <div style={{ fontSize:"0.95rem",fontWeight:600,color:T.info,textDecoration:"underline" }}>{fmtMoney(activePrincipal,{compact:true,currency:p.currency||"USD"})}</div>
                  </button>
                  {[
                    { label:t.totalValue,  val:fmtMoney(totalValue,{compact:true,currency:p.currency||"USD"}) },
                    {
                      label:t.roi,
                      val:`${pRoi>=0?"+":""}${pRoi.toFixed(3)}%`,
                      color:pRoi>=0?T.positive:T.negative,
                      roiValue: fmtMoney(Number.isFinite(totalValue + pRealizedIncome) ? (totalValue + pRealizedIncome) : 0,{compact:true,currency:p.currency||"USD"}),
                    },
                    { label:t.positions,   val:invs.length },
                    { label:yearLabel, val:fmtMoney(pIncomeCurrentYear,{compact:true,currency:p.currency||"USD"}) },
                    { label:t.totalIncome, val:fmtMoney(pIncome,{compact:true,currency:p.currency||"USD"}) },
                  ].map(m=>(
                    <div key={m.label} style={{ padding:"10px",background:T.bgApp,borderRadius:"8px" }}>
                      {m.label === t.roi ? (
                        <div style={{ display:"flex",flexDirection:"column",gap:"4px" }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px" }}>
                            <span style={{ fontSize:"0.68rem",color:T.textMuted }}>{t.roi}:</span>
                            <span style={{ fontSize:"0.95rem",fontWeight:600,color:m.color||T.textPrimary,whiteSpace:"nowrap" }}>{m.val}</span>
                          </div>
                          <div style={{ fontSize:"0.72rem",fontWeight:500,color:T.textMuted,whiteSpace:"nowrap",textAlign:isRTL?"right":"left" }}>{m.roiValue || fmtMoney(0,{compact:true,currency:p.currency||"USD"})}</div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize:"0.68rem",color:T.textMuted,marginBottom:"3px" }}>{m.label}</div>
                          <div style={{ fontSize:"0.95rem",fontWeight:600,color:m.color||T.textPrimary }}>{m.val}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {p.notes && <div style={{ fontSize:"0.75rem",color:T.textMuted,fontStyle:"italic",marginBottom:"10px" }}>{p.notes}</div>}
                </>) }
              </div>
            </Card>
          );
        })}
        {portfolios.length===0 && <EmptyState text={t.noPortfolioData}/>}
      </div>

      {showModal && (
        <Modal title={modalMode==="create"?t.addPortfolio:`${t.view} ${t.portfolio}`} onClose={()=>{setShowModal(false);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});}}>
          {modalMode === "view" ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"10px" }}>
              <ReadOnlyField label={t.name} value={form.name} />
              <ReadOnlyField label={t.type} value={form.type} />
              <ReadOnlyField label={t.initialCapital} value={form.initialCapital} />
              <ReadOnlyField label={t.risk} value={form.risk} />
              <ReadOnlyField label={t.currency} value={form.currency} />
              <ReadOnlyField label={t.status} value={form.status} />
              <ReadOnlyField label="Color" value={form.color} />
              <ReadOnlyField label={t.notes} value={form.notes} />
            </div>
          ) : (
            <>
              <FormField label={t.name} required><Input value={form.name} onChange={e=>{f("name")(e.target.value);setInvalidFields(prev=>({...prev,name:false}));}} invalid={invalidFields.name} isRTL={isRTL} placeholder={t.name}/></FormField>
              <FormField label={t.type} required><Select value={form.type} onChange={e=>{f("type")(e.target.value);setInvalidFields(prev=>({...prev,type:false}));}} invalid={invalidFields.type} options={db?.settings?.portfolioTypes||[]} placeholder={t.selectType} isRTL={isRTL}/></FormField>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
                <FormField label={t.initialCapital} required><Input type="number" value={form.initialCapital} onChange={e=>{f("initialCapital")(e.target.value);setInvalidFields(prev=>({...prev,initialCapital:false}));}} invalid={invalidFields.initialCapital} isRTL={isRTL} placeholder="0.00"/></FormField>
                <FormField label={t.risk}><Select value={form.risk} onChange={e=>f("risk")(e.target.value)} options={db?.settings?.riskLevels||[]} placeholder={t.selectRisk} isRTL={isRTL}/></FormField>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
                <FormField label={t.currency}><Select value={form.currency} onChange={e=>f("currency")(e.target.value)} options={db?.settings?.currencies||[]} placeholder={t.selectCurrency} isRTL={isRTL}/></FormField>
                <FormField label={t.status}><Select value={form.status} onChange={e=>f("status")(e.target.value)} options={statusOpts} isRTL={isRTL}/></FormField>
              </div>
              <FormField label="Color"><Input type="color" value={form.color} onChange={e=>f("color")(e.target.value)} isRTL={isRTL}/></FormField>
              <FormField label={t.notes}><Input value={form.notes} onChange={e=>f("notes")(e.target.value)} isRTL={isRTL} placeholder={`(${t.optional})`}/></FormField>
              {formError && <div style={{ color:T.negative, fontSize:"0.78rem", marginBottom:"10px" }}>{formError}</div>}
            </>
          )}
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"8px" }}>
            {modalMode==="view" && (<>
              <Btn onClick={()=>setModalMode("edit")}>{t.editInModal}</Btn>
              <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});}}>{t.returnLabel}</Btn>
            </>)}
            {modalMode==="edit" && (<>
              <Btn onClick={handleSave}>{t.save}</Btn>
              <Btn variant="secondary" onClick={()=>{ setForm({name:editItem.name,type:editItem.type,initialCapital:editItem.initialCapital||"",risk:editItem.risk,currency:editItem.currency,status:editItem.status||"Active",color:editItem.color||T.chart[0],notes:editItem.notes||""}); setFormError(""); setInvalidFields({}); setModalMode("view"); }}>{t.cancel}</Btn>
            </>)}
            {modalMode==="create" && (<>
              <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});}}>{t.cancel}</Btn>
              <Btn onClick={handleSave}>{t.save}</Btn>
            </>)}
          </div>
        </Modal>
      )}
    </div>
  );
}


function ReadOnlyField({ label, value }) {
  return (
    <div style={{ padding:"10px", border:`1px solid ${T.border}`, borderRadius:"10px", background:T.bgApp }}>
      <div style={{ fontSize:"0.72rem", color:T.textMuted, marginBottom:"6px", fontWeight:700 }}>{label}</div>
      <div style={{ fontSize:"0.86rem", color:T.textPrimary, wordBreak:"break-word" }}>{value || "—"}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function InvestmentsTab({ onQuickAddTransaction, onViewTransactions, modalPrefill, navigationFilter, onModalPrefillConsumed, showPortfolioBack = false, onPortfolioBack }) {

  const { db, addItem, archiveItem, unarchiveItem, hardDeleteItem, patchItem, t, isRTL, font } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [collapsedPortfolios, setCollapsedPortfolios] = useState({});
  const [modalMode, setModalMode] = useState("create");

  const EMPTY = useMemo(() => ({ portfolioId:"",name:"",quantity:"",purchasePrice:"",currentPrice:"",purchaseDate:"",startDate:"",endDate:"",investmentMethod:"",risk:"",funding:[{source:"",amount:""}],status:"Active",notes:"" }), []);
  const [form, setForm] = useState(EMPTY);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const portfolios = visible(db?.portfolios||[]);
  const investments = db?.investments||[];


  const handleSave = () => {
    const nextInvalid = {
      portfolioId: !form.portfolioId,
      name: !form.name.trim(),
      purchaseDate: !form.purchaseDate,
      startDate: !form.startDate,
      risk: !form.risk,
      status: !form.status,
      investmentMethod: !form.investmentMethod,
    };
    setInvalidFields(nextInvalid);
    if (Object.values(nextInvalid).some(Boolean)) {
      setFormError(t.requiredFieldsError);
      return;
    }
    if (Math.abs(splitFundingTotal - totalInvestmentValue) > 0.01) {
      setFormError(t.splitFundingMismatchError);
      return;
    }
    setFormError("");
    const payload = { ...form, funding:(form.funding||[]).filter(r=>r.source||r.amount), source:undefined };
    if (editItem) { patchItem("investments",editItem.id,payload); }
    else { addItem("investments",payload); }
    setInvalidFields({});
    setForm(EMPTY); closeModal();
  };

  const openView = (inv) => {
    setForm({ portfolioId:inv.portfolioId,name:inv.name,quantity:inv.quantity||"",purchasePrice:inv.purchasePrice||"",
      currentPrice:inv.currentPrice||"",purchaseDate:inv.purchaseDate||"",startDate:inv.startDate||"",endDate:inv.endDate||"",investmentMethod:inv.investmentMethod||"",risk:inv.risk||"",funding:(inv.funding&&inv.funding.length?inv.funding:[{source:inv.source||"",amount:""}]),status:inv.status||"Active",notes:inv.notes||"" });
    setEditItem(inv); setModalMode("view"); setShowModal(true);
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
    setModalMode("create");
    setFormError("");
    setInvalidFields({});
    setShowModal(true);
    onModalPrefillConsumed?.();
  }, [modalPrefill, onModalPrefillConsumed]);

  const statusOpts = ((db?.settings?.investmentStatuses&&db.settings.investmentStatuses.length)?db.settings.investmentStatuses:["Active","Paused","Closed"]).map((v)=>({ value:v, label:v }));
  const methodOpts = (db?.settings?.investmentMethods || []).map((v)=>({ value:v, label:v }));
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDateField, setFilterDateField] = useState("start");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPortfolio, setFilterPortfolio] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formError, setFormError] = useState("");
  const [invalidFields, setInvalidFields] = useState({});

  useEffect(() => () => {
    setShowModal(false);
    setEditItem(null);
    setEditingPrice(null);
    setExpandedRow(null);
    setCollapsedPortfolios({});
    setModalMode("create");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterDateField("start");
    setFilterStatus("");
    setFilterPortfolio("");
    setSearchOpen(false);
    setSearchTerm("");
    setForm(EMPTY);
    setFormError("");
    setInvalidFields({});
    localStorage.removeItem("investments_filters_v1");
  }, [EMPTY]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditItem(null);
    setModalMode("create");
    setForm(EMPTY);
    setFormError("");
    setInvalidFields({});
    onModalPrefillConsumed?.();
  }, [EMPTY, onModalPrefillConsumed]);

  const totalInvestmentValue = (Number(form.quantity)||0) * (Number(form.purchasePrice)||0);
  const splitFundingTotal = (form.funding||[]).reduce((sum, row) => sum + (parseFloat(row.amount)||0), 0);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("investments_filters_v1") || "null");
    if (!saved) return;
    setFilterStartDate(saved.filterStartDate || "");
    setFilterEndDate(saved.filterEndDate || "");
    setFilterDateField(saved.filterDateField || "start");
    setFilterStatus(saved.filterStatus || "");
    setFilterPortfolio(saved.filterPortfolio || "");
    setSearchTerm(saved.searchTerm || "");
    setSearchOpen(Boolean(saved.searchTerm));
  }, []);

  useEffect(() => {
    localStorage.setItem("investments_filters_v1", JSON.stringify({ filterStartDate, filterEndDate, filterDateField, filterStatus, filterPortfolio, searchTerm }));
  }, [filterStartDate, filterEndDate, filterDateField, filterStatus, filterPortfolio, searchTerm]);


  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(INVESTMENTS_COLLAPSE_STORAGE_KEY) || "{}");
    if (!saved || typeof saved !== "object") return;
    setCollapsedPortfolios(saved);
  }, []);

  useEffect(() => {
    setCollapsedPortfolios((prev) => {
      const next = { ...prev };
      (portfolios || []).forEach((portfolio) => {
        if (!Object.prototype.hasOwnProperty.call(next, portfolio.id)) next[portfolio.id] = false;
      });
      Object.keys(next).forEach((id) => {
        if (!(portfolios || []).some((portfolio) => portfolio.id === id)) delete next[id];
      });
      return next;
    });
  }, [portfolios]);

  useEffect(() => {
    localStorage.setItem(INVESTMENTS_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedPortfolios));
  }, [collapsedPortfolios]);

  useEffect(() => {
    if (!navigationFilter?.portfolioId) return;
    setFilterPortfolio(navigationFilter.portfolioId);
    if (navigationFilter?.status) setFilterStatus(navigationFilter.status);
  }, [navigationFilter]);
  const filteredInvestments = investments.filter((inv) => {
    const startRaw = inv.startDate || inv.purchaseDate || "";
    const endRaw = inv.endDate || "";
    const normalizedTitle = (inv.name || "").toLowerCase();
    const targetRaw = filterDateField === "end" ? endRaw : startRaw;
    const targetDate = toDateOnly(targetRaw);
    const fromDate = toDateOnly(filterStartDate);
    const toDate = toDateOnly(filterEndDate);
    const fromMatch = !fromDate || (targetDate && targetDate >= fromDate);
    const toMatch = !toDate || (targetDate && targetDate < toDate);
    const statusMatch = !filterStatus || (filterStatus === ARCHIVED_FILTER ? Boolean(inv.is_hidden) : (!inv.is_hidden && inv.status === filterStatus));
    const portfolioMatch = !filterPortfolio || inv.portfolioId === filterPortfolio;
    const searchMatch = !searchTerm.trim() || normalizedTitle.includes(searchTerm.toLowerCase().trim());
    return fromMatch && toMatch && statusMatch && portfolioMatch && searchMatch && (filterStatus===ARCHIVED_FILTER ? true : !inv.is_hidden);
  });

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px",gap:"12px",flexWrap:"wrap" }}>
        <div>
          <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.investments}</h2>
          <div style={{ fontSize:"0.8rem",color:T.textMuted,marginTop:"2px" }}>{filteredInvestments.length} {t.investments.toLowerCase()}</div>
          {showPortfolioBack && (
            <button
              type="button"
              onClick={onPortfolioBack}
              style={{ marginTop:"8px", background:"none", border:`1px solid ${T.border}`, borderRadius:"8px", cursor:"pointer", padding:"6px 10px", display:"inline-flex", alignItems:"center", gap:"6px", color:T.textSecondary, fontSize:"0.78rem", fontWeight:600 }}
            >
              <Undo2 size={14} /> رجوع
            </button>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:"10px", padding:"4px 6px", overflow:"hidden" }}>
            <button onClick={() => setSearchOpen((v) => { const next = !v; if (!next) setSearchTerm(""); return next; })} style={{ border:"none", background:"transparent", color:T.textSecondary, cursor:"pointer", display:"flex", padding:"4px" }}>
              <Search size={14} />
            </button>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder={isRTL ? "ابحث بالعنوان..." : "Search title..."}
              style={{
                width: searchOpen ? "180px" : "0px",
                opacity: searchOpen ? 1 : 0,
                transition: "all 0.25s ease",
                border: "none",
                outline: "none",
                background: "transparent",
                color: T.textPrimary,
                fontSize: "0.8rem",
                padding: searchOpen ? "4px" : "0",
                textAlign: isRTL ? "right" : "left",
              }}
            />
          </div>
          <Btn size="sm" variant="secondary" onClick={()=>setCollapsedPortfolios(Object.fromEntries(portfolios.map((p)=>[p.id,false])))}>{t.expandAll}</Btn>
          <Btn size="sm" variant="secondary" onClick={()=>setCollapsedPortfolios(Object.fromEntries(portfolios.map((p)=>[p.id,true])))}>{t.collapseAll}</Btn>
          <Btn icon={<Plus size={15}/>} onClick={()=>{
            const nextForm = filterPortfolio ? { ...EMPTY, portfolioId:filterPortfolio } : { ...EMPTY };
            setForm(nextForm);
            setEditItem(null);
            setModalMode("create");
            setShowModal(true);
            onModalPrefillConsumed?.();
          }}>{t.addInvestment}</Btn>
        </div>
      </div>


      <div style={{ ...filterBarCss, justifyContent:"flex-start" }}>
        <Select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} options={[{ value:"", label:t.investmentStatuses }, ...statusOpts, { value:ARCHIVED_FILTER, label:t.archivedFilter }]} isRTL={isRTL} style={{ ...filterInputCss(isRTL), flex:"0 0 auto", width:"fit-content", minWidth:"120px", maxWidth:"150px" }} />
        <SearchableSingleSelect
          options={portfolios.map((p)=>({ value:p.id, label:p.name }))}
          value={filterPortfolio}
          onChange={setFilterPortfolio}
          placeholder={t.allPortfolios}
          searchPlaceholder={t.allPortfolios}
          font={font}
          minWidth="220px"
          variant="lightFilter"
          isRTL={isRTL}
        />
        <div>
          <DateRangeFilter
            startDate={filterStartDate}
            endDate={filterEndDate}
            onChange={(start, end) => { setFilterStartDate(start); setFilterEndDate(end); }}
            onClear={() => { setFilterStartDate(""); setFilterEndDate(""); }}
            isRTL={isRTL}
            label={t.transactionDateRange}
            clearLabel={t.clearDateRange}
            panelTop={(
              <div style={{ display:"flex", alignItems:"center", gap:"14px", minHeight:"20px", justifyContent:isRTL?"flex-end":"flex-start" }}>
                <label style={{ display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"0.78rem", color:T.textSecondary }}>
                  <input type="radio" name="investments-date-field" value="start" checked={filterDateField === "start"} onChange={()=>setFilterDateField("start")} />
                  {t.startDate}
                </label>
                <label style={{ display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"0.78rem", color:T.textSecondary }}>
                  <input type="radio" name="investments-date-field" value="end" checked={filterDateField === "end"} onChange={()=>setFilterDateField("end")} />
                  {t.endDate}
                </label>
              </div>
            )}
          />
        </div>
      </div>

      {/* Grouped by portfolio */}
      {portfolios.length === 0
        ? <EmptyState text={t.noPortfolioData}/>
        : portfolios.map(p => {
          const invs = filteredInvestments.filter(i=>i.portfolioId===p.id);
          if (invs.length === 0) return null;
          return (
            <div key={p.id} style={{ marginBottom:"24px" }}>
              <button
                onClick={() => setCollapsedPortfolios(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                title={p.name}
                aria-expanded={!collapsedPortfolios[p.id]}
                style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px",background:"none",border:"none",padding:0,cursor:"pointer",width:"fit-content" }}
              >
                <ChevronRight size={14} color={T.textMuted} style={{ transform:collapsedPortfolios[p.id]?"none":"rotate(90deg)",transition:"transform 0.2s" }} />
                <FolderOpen size={14} color={T.textMuted}/>
                <span style={{ fontSize:"0.75rem",fontWeight:600,color:T.textSecondary,textTransform:"uppercase",letterSpacing:"0.08em" }}>{p.name}</span>
                <span style={{ fontSize:"0.7rem",color:T.textMuted }}>· {invs.length} {t.investments.toLowerCase()}</span>
              </button>
              {!collapsedPortfolios[p.id] && (
              <Card style={{ overflow:"hidden" }}>
                <div className="overflow-x-auto">
                <table style={{ width:"100%",minWidth:"980px",borderCollapse:"collapse",fontSize:"0.85rem" }}>
                  <thead>
                    <tr style={{ background:T.bgApp }}>
                      {[t.name,t.startDate,t.endDate,t.investmentMethod,t.principal,t.currentValue,t.roi,t.currentPrice,t.risk,t.status,""].map((h,i)=>(
                        <th key={i} style={{ padding:"10px 14px",textAlign:isRTL?"right":"left",fontSize:"0.7rem",fontWeight:600,color:T.textMuted,whiteSpace:"nowrap",borderBottom:`1px solid ${T.border}` }}>{h}</th>
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
                            <td style={{ padding:"12px 14px", textAlign:isRTL?"right":"left" }} onClick={()=>setExpandedRow(isExpanded?null:inv.id)}>
                              <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                                <ChevronRight size={13} color={T.textMuted} style={{ transform:isExpanded?"rotate(90deg)":"none",transition:"transform 0.2s",flexShrink:0 }}/>
                                <span style={{ fontWeight:500,color:T.textPrimary }}>{inv.name}</span>
                              </div>
                            </td>
                            <td style={{ padding:"12px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{inv.startDate || inv.purchaseDate || "—"}</td>
                            <td style={{ padding:"12px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{inv.endDate || "—"}</td>
                            <td style={{ padding:"12px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{inv.investmentMethod || "—"}</td>
                            <td style={{ padding:"12px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{fmtMoney(cbVal,{currency:portfolioCurrency(db, inv.portfolioId)})}</td>
                            <td style={{ padding:"12px 14px",fontWeight:600,color:T.textPrimary,textAlign:isRTL?"right":"left" }}>{fmtMoney(cvVal,{currency:portfolioCurrency(db, inv.portfolioId)})}</td>
                            <td style={{ padding:"12px 14px",textAlign:isRTL?"right":"left" }}>
                              <span style={{ fontWeight:600,color:roiVal>=0?T.positive:T.negative }}>{roiVal>=0?"+":""}{roiVal.toFixed(3)}%</span>
                            </td>
                            <td style={{ padding:"12px 14px",textAlign:isRTL?"right":"left" }} onClick={e=>e.stopPropagation()}>
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
                                <button title={t.viewDetails} onClick={()=>openView(inv)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                                  onMouseEnter={e=>{e.currentTarget.style.background=T.bgApp; e.currentTarget.style.color=T.info;}} onMouseLeave={e=>{e.currentTarget.style.background="none"; e.currentTarget.style.color=T.textMuted;}}>
                                  <Eye size={13}/>
                                </button>
                                <button title={t.addTransactionAction} onClick={()=>onQuickAddTransaction?.(inv)} style={{ background:"none",border:"none",cursor:"pointer",color:T.emerald,padding:"4px",borderRadius:"6px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color="#059669"} onMouseLeave={e=>e.currentTarget.style.color=T.emerald}><Plus size={13}/></button>
                                <button title={t.viewTransactions} onClick={()=>onViewTransactions?.(inv)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color=T.warning} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}><ListTree size={13}/></button>
                                <button title={inv.is_hidden ? t.unarchive : t.archiveInvestment} onClick={()=>inv.is_hidden?unarchiveItem("investments",inv.id):archiveItem("investments",inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color=T.warning} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>{inv.is_hidden?<Eye size={13}/>:<EyeOff size={13}/>}</button>
                                <button title={t.deleteItem} onClick={()=>{ if(window.confirm(t.deleteCascadeWarning)) hardDeleteItem("investments",inv.id); }} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"6px",display:"flex" }}
                                  onMouseEnter={e=>e.currentTarget.style.color=T.negative} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}>
                                  <Trash2 size={13}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={inv.id+"_exp"}>
                              <td colSpan={11} style={{ padding:"0",background:"transparent" }}>
                                <InvestmentDetailExpanded inv={inv} txs={txs} db={db}/>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </Card>
              )}
            </div>
          );
        })
      }

      {showModal && (
        <Modal title={modalMode==="create" ? t.addInvestment : `${t.view} ${t.investment}`} maxWidth="860px" onClose={closeModal}>
          {modalMode === "view" ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"10px" }}>
              <ReadOnlyField label={t.portfolio} value={portfolios.find((p)=>p.id===form.portfolioId)?.name} />
              <ReadOnlyField label={t.name} value={form.name} />
              <ReadOnlyField label={t.quantity} value={form.quantity} />
              <ReadOnlyField label={t.purchasePrice} value={form.purchasePrice} />
              <ReadOnlyField label={t.currentPrice} value={form.currentPrice} />
              <ReadOnlyField label="Balance" value={((Number(form.quantity)||0) * (Number(form.purchasePrice)||0)).toFixed(3)} />
              <ReadOnlyField label={t.purchaseDate} value={form.purchaseDate} />
              <ReadOnlyField label={t.startDate} value={form.startDate} />
              <ReadOnlyField label={t.endDate} value={form.endDate} />
              <ReadOnlyField label={t.investmentMethod} value={form.investmentMethod} />
              <ReadOnlyField label={t.risk} value={form.risk} />
              <ReadOnlyField label={t.status} value={form.status} />
              <ReadOnlyField label={t.splitFunding} value={(form.funding||[]).map((f)=>`${f.source||"—"}: ${f.amount||0}`).join(" | ")} />
              <ReadOnlyField label={t.notes} value={form.notes} />
              <ReadOnlyField label="Created At" value={editItem?.created_at} />
            </div>
          ) : (
            <div style={{ padding:"4px 2px" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FormField label={t.name} required><Input value={form.name} onChange={e=>{f("name")(e.target.value);setInvalidFields(prev=>({...prev,name:false}));}} invalid={invalidFields.name} isRTL={isRTL}/></FormField>
                <FormField label={t.portfolio} required>
                  <Select value={form.portfolioId} onChange={e=>{f("portfolioId")(e.target.value);setInvalidFields(prev=>({...prev,portfolioId:false}));}} invalid={invalidFields.portfolioId}
                    options={portfolios.map(p=>({value:p.id,label:p.name}))} placeholder={t.selectPortfolio} isRTL={isRTL}/>
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <FormField label={t.quantity}><Input type="number" value={form.quantity} onChange={e=>f("quantity")(e.target.value)} isRTL={isRTL} placeholder="0"/></FormField>
                <FormField label={t.purchasePrice}><Input type="number" value={form.purchasePrice} onChange={e=>f("purchasePrice")(e.target.value)} isRTL={isRTL} placeholder="0.00"/></FormField>
                <FormField label={t.totalInvestmentValue}><Input value={totalInvestmentValue.toFixed(3)} isRTL={isRTL} readOnly style={{ background:"#e2e8f0", color:T.textSecondary }}/></FormField>
                <FormField label={t.currentPrice}><Input type="number" value={form.currentPrice} onChange={e=>f("currentPrice")(e.target.value)} isRTL={isRTL} placeholder="0.00"/></FormField>
              </div>
              <FormField label={t.splitFunding}>
                <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                  {form.funding.map((row, idx)=>(
                    <div key={idx} style={{ display:"grid",gridTemplateColumns:"1fr 120px 24px",gap:"6px",alignItems:"center" }}>
                      <Select value={row.source||""} onChange={e=>updateFunding(idx,"source",e.target.value)} options={db?.settings?.fundingSources||[]} placeholder={t.selectSource} isRTL={isRTL}/>
                      <Input type="number" value={row.amount||""} onChange={e=>updateFunding(idx,"amount",e.target.value)} isRTL={isRTL} placeholder="0.00"/>
                      {form.funding.length>1 && <button onClick={()=>setForm(prev=>({ ...prev, funding: prev.funding.filter((_,i)=>i!==idx) }))} style={{ border:"none",background:"none",color:T.negative,cursor:"pointer",display:"flex",padding:0 }}><Trash2 size={12}/></button>}
                    </div>
                  ))}
                  <Btn size="sm" variant="secondary" onClick={()=>setForm(prev=>({ ...prev, funding:[...prev.funding,{source:"",amount:""}] }))}>{t.addSplit}</Btn>
                  <div style={{ padding:"8px", background:"#e2e8f0", borderRadius:"8px", color:T.textSecondary, fontSize:"0.8rem", fontWeight:600 }}>
                    {t.totalSplitAmount}: {splitFundingTotal.toFixed(3)}
                  </div>
                  {formError === t.splitFundingMismatchError && <div style={{ color:T.negative, fontSize:"0.78rem" }}>{formError}</div>}
                </div>
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <FormField label={t.purchaseDate} required><Input type="date" value={form.purchaseDate} onChange={e=>{f("purchaseDate")(e.target.value);setInvalidFields(prev=>({...prev,purchaseDate:false}));}} invalid={invalidFields.purchaseDate} isRTL={isRTL}/></FormField>
                <FormField label={t.startDate} required><Input type="date" value={form.startDate} onChange={e=>{f("startDate")(e.target.value);setInvalidFields(prev=>({...prev,startDate:false}));}} invalid={invalidFields.startDate} isRTL={isRTL}/></FormField>
                <FormField label={t.endDate}><Input type="date" value={form.endDate} onChange={e=>f("endDate")(e.target.value)} isRTL={isRTL}/></FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <FormField label={t.risk} required><Select value={form.risk} onChange={e=>{f("risk")(e.target.value);setInvalidFields(prev=>({...prev,risk:false}));}} invalid={invalidFields.risk} options={db?.settings?.riskLevels||[]} placeholder={t.selectRisk} isRTL={isRTL}/></FormField>
                <FormField label={t.status} required><Select value={form.status} onChange={e=>{f("status")(e.target.value);setInvalidFields(prev=>({...prev,status:false}));}} invalid={invalidFields.status} options={statusOpts} isRTL={isRTL}/></FormField>
                <FormField label={t.investmentMethod} required><Select value={form.investmentMethod} onChange={e=>{f("investmentMethod")(e.target.value);setInvalidFields(prev=>({...prev,investmentMethod:false}));}} invalid={invalidFields.investmentMethod} options={methodOpts} placeholder={t.selectMethod} isRTL={isRTL}/></FormField>
              </div>
             <FormField label={t.notes}><Input value={form.notes} onChange={e=>f("notes")(e.target.value)} isRTL={isRTL} placeholder={`(${t.optional})`}/></FormField>
            {formError && formError !== t.splitFundingMismatchError && <div style={{ color:T.negative, fontSize:"0.78rem", marginTop:"-6px", marginBottom:"10px" }}>{formError}</div>}
            </div>
          )}
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"8px" }}>
            {modalMode==="view" && (<>
              <Btn onClick={()=>setModalMode("edit")}>{t.editInModal}</Btn>
              <Btn variant="secondary" onClick={closeModal}>{t.returnLabel}</Btn>
            </>)}
            {modalMode==="edit" && (<>
              <Btn onClick={handleSave}>{t.save}</Btn>
              <Btn variant="secondary" onClick={()=>{ setForm({ portfolioId:editItem.portfolioId,name:editItem.name,quantity:editItem.quantity||"",purchasePrice:editItem.purchasePrice||"",currentPrice:editItem.currentPrice||"",purchaseDate:editItem.purchaseDate||"",startDate:editItem.startDate||"",endDate:editItem.endDate||"",investmentMethod:editItem.investmentMethod||"",risk:editItem.risk||"",funding:(editItem.funding&&editItem.funding.length?editItem.funding:[{source:editItem.source||"",amount:""}]),status:editItem.status||"Active",notes:editItem.notes||"" }); setFormError(""); setInvalidFields({}); setModalMode("view"); }}>{t.cancel}</Btn>
            </>)}
            {modalMode==="create" && (<>
              <Btn variant="secondary" onClick={closeModal}>{t.cancel}</Btn>
              <Btn onClick={handleSave}>{t.save}</Btn>
            </>)}
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
    <div style={{ padding:"16px 20px", background:"rgba(248,250,252,0.75)", borderTop:"1px solid rgba(148,163,184,0.22)" }}>
      <div className="invest-exp-grid" style={{ width:"100%", display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:"14px", alignItems:"start" }}>
        {/* Metrics */}
        <div>
          <div style={{ fontSize:"0.68rem",fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px",display:"flex",alignItems:"center",gap:"5px" }}>
            <BookOpen size={11}/>{t.fundingBreakdown}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px" }}>
            {[
              { label:t.principal,    val:fmtMoney(costBasis(inv),{currency}) },
              { label:t.currentValue, val:fmtMoney(curVal(inv),{currency}) },
              { label:t.totalIncome,  val:fmtMoney(income,{currency}),  color:T.positive },
              { label:"Expenses",     val:fmtMoney(expense,{currency}), color:T.negative },
            ].map(m=>(
              <div key={m.label} style={{ padding:"9px 10px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px" }}>
                <div style={{ fontSize:"0.62rem",color:T.textMuted,marginBottom:"3px" }}>{m.label}</div>
                <div style={{ fontSize:"0.82rem",fontWeight:600,color:m.color||T.textPrimary }}>{m.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <div style={{ fontSize:"0.68rem",fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px",display:"flex",alignItems:"center",gap:"5px" }}>
            <DollarSign size={11}/>{t.transactionLedger}
          </div>
          {txs.length===0
            ? <EmptyState text={t.noRecords}/>
            : (
              <div style={{ maxHeight:"160px",overflowY:"auto",borderRadius:"8px",border:`1px solid ${T.border}` }}>
                {txs.slice(0,6).map((tx,i)=>(
                  <div key={tx.id||i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",borderBottom:i<txs.length-1?`1px solid ${T.border}`:"none",fontSize:"0.74rem" }}>
                    <div>
                      <span style={{ fontWeight:500,color:T.textPrimary }}>{tx.category}</span>
                      <span style={{ color:T.textMuted,marginLeft:"5px",fontSize:"0.66rem" }}>{tx.date}</span>
                    </div>
                    <span style={{ fontWeight:600,color:tx.type==="income"?T.positive:T.negative, whiteSpace:"nowrap" }}>
                      {tx.type==="income"?"+":"-"}{fmtMoney(tx.amount,{currency:portfolioCurrency(db, tx.portfolioId)})}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Funding sources */}
        <div>
          <div style={{ fontSize:"0.68rem",fontWeight:600,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px" }}>
            {t.source}
          </div>
          {(inv.funding||[]).length === 0 ? (
            <EmptyState text={t.noRecords} />
          ) : (
            <div style={{ border:`1px solid ${T.border}`, borderRadius:"8px", overflow:"hidden" }}>
              {(inv.funding||[]).map((item, idx) => (
                <div key={idx} style={{ display:"flex",justifyContent:"space-between",gap:"8px",padding:"8px 10px",fontSize:"0.74rem",borderBottom:idx<(inv.funding||[]).length-1?`1px solid ${T.border}`:"none" }}>
                  <span style={{ color:T.textPrimary, fontWeight:500 }}>{item.source || "—"}</span>
                  <span style={{ color:T.textSecondary, whiteSpace:"nowrap" }}>{item.amount ? fmtMoney(item.amount,{currency}) : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TransactionsTab({ modalPrefill, navigationFilter, onSmartBack, showSmartBack }) {

  const { db, addItem, archiveItem, hardDeleteItem, patchItem, t, isRTL, font } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [filterPortfolio, setFilterPortfolio] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterInvestment, setFilterInvestment] = useState("");
  const [filterSmartStatus, setFilterSmartStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [formError, setFormError] = useState("");
  const [invalidFields, setInvalidFields] = useState({});
  const PAGE_SIZE_ALL = "all";
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState("1");

  const EMPTY = { portfolioId:"",investmentId:"",category:"",amount:"",date:"",dueDate:"",depositedAt:"",collectedAt:"",type:"income",status:"recorded",notes:"" };
  const [form, setForm] = useState(EMPTY);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const onPortfolioFilterChange = (nextPortfolioId) => {
    setFilterPortfolio(nextPortfolioId);
    setFilterInvestment("");
  };

  useEffect(() => () => {
    setShowModal(false);
    setEditItem(null);
    setModalMode("create");
    setFilterPortfolio("");
    setFilterStatus("");
    setFilterInvestment("");
    setFilterSmartStatus("");
    setFilterStartDate("");
    setFilterEndDate("");
    setOpenMenu(null);
    setForm(EMPTY);
    setFormError("");
    setInvalidFields({});
  }, []);

  const portfolios = visible(db?.portfolios||[]);
  const allInvestments = visible(db?.investments||[]);
  const investmentsForFilter = filterPortfolio
    ? allInvestments.filter((inv) => inv.portfolioId === filterPortfolio)
    : allInvestments;
  const smartStatusOptions = [
    { value:"upcoming", label:t.smartStatusUpcoming },
    { value:"late", label:t.smartStatusLate },
    { value:"defaulted", label:t.smartStatusDefaulted },
    { value:"early", label:t.smartStatusEarly },
  ];
  const smartStatusLabel = (status) => smartStatusOptions.find((item) => item.value === status)?.label || "—";
  const allTx = db?.transactions||[];
  const filtered = allTx.filter((tx) => {
    const portfolioMatch = !filterPortfolio || tx.portfolioId===filterPortfolio;
    const statusMatch = (() => {
      if (tx.is_hidden) return false;
      if (!filterStatus) return true;
      if (filterStatus === "scheduled") return isScheduledTransaction(tx);
      if (filterStatus === "deposited") return isDepositedTransaction(tx) && !isCollectedTransaction(tx);
      if (filterStatus === "collected") return isCollectedTransaction(tx);
      return tx.status === filterStatus;
    })();
    const investmentMatch = !filterInvestment || tx.investmentId===filterInvestment;
    const smartStatus = getSmartTxStatus(tx);
    const smartStatusMatch = !filterSmartStatus || smartStatus === filterSmartStatus;
    const contextDateValue = filterStatus === "collected"
      ? (tx.collectedAt || tx.collected_at)
      : filterStatus === "deposited"
        ? (tx.depositedAt || tx.deposited_at)
        : (tx.date || tx.created_at);
    const parsedTxDate = toDateOnly(contextDateValue);
    const parsedStartDate = toDateOnly(filterStartDate);
    const parsedEndDate = toDateOnly(filterEndDate);
    const startMatch = !parsedStartDate || (parsedTxDate && parsedTxDate >= parsedStartDate);
    const endMatch = !parsedEndDate || (parsedTxDate && parsedTxDate < parsedEndDate);
    return portfolioMatch && statusMatch && investmentMatch && smartStatusMatch && startMatch && endMatch;
  });
  const sorted = [...filtered].sort((a,b)=>new Date(b.date||b.created_at||0)-new Date(a.date||a.created_at||0));
  const totalRecords = sorted.length;
  const resolvedPageSize = pageSize === PAGE_SIZE_ALL ? Math.max(totalRecords, 1) : Number(pageSize) || 50;
  const totalPages = Math.max(1, Math.ceil(totalRecords / resolvedPageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedTransactions = pageSize === PAGE_SIZE_ALL
    ? sorted
    : sorted.slice((safePage - 1) * resolvedPageSize, safePage * resolvedPageSize);

  const investmentsForPortfolio = form.portfolioId ? visible(db?.investments||[]).filter(i=>i.portfolioId===form.portfolioId) : [];

  const handleExportToExcel = () => {
    if (!sorted.length) return;
    const rows = sorted.map((tx) => {
      const portfolioName = portfolios.find((p) => p.id === tx.portfolioId)?.name || "";
      const investmentName = allInvestments.find((inv) => inv.id === tx.investmentId)?.name || "";
      return {
        Date: tx.date || "",
        Category: tx.category || "",
        Portfolio: portfolioName,
        Investment: investmentName,
        Amount: tx.amount || 0,
        Type: tx.type || "",
        Status: tx.status || "",
        SmartStatus: getSmartTxStatus(tx) || "",
        DueDate: tx.dueDate || tx.due_date || "",
        DepositedAt: tx.depositedAt || tx.deposited_at || "",
        CollectedAt: tx.collectedAt || tx.collected_at || "",
        Notes: tx.notes || "",
      };
    });
    const headers = Object.keys(rows[0]);
    const escapeCSV = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCSV(row[header])).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    const nextInvalid = {
      portfolioId: !form.portfolioId,
      investmentId: !form.investmentId,
      category: !form.category,
      amount: !form.amount,
      date: !form.date,
    };
    setInvalidFields(nextInvalid);
    if (Object.values(nextInvalid).some(Boolean)) {
      setFormError(t.requiredFieldsError);
      return;
    }
    setFormError("");
    if (!form.investmentId) {
      setFormError(t.investmentRequiredForTransaction);
      return;
    }
    const selectedInvestment = allInvestments.find((inv) => inv.id === form.investmentId);
    if (selectedInvestment && form.date) {
      const start = selectedInvestment.startDate || selectedInvestment.purchaseDate || "";
      const end = selectedInvestment.endDate || "";
      if ((start && form.date < start) || (end && form.date > end)) {
        setFormError(t.transactionDateOutOfRange);
        return;
      }
    }
    if (selectedInvestment && form.dueDate) {
      const start = selectedInvestment.startDate || selectedInvestment.purchaseDate || "";
      const end = selectedInvestment.endDate || "";
      if ((start && form.dueDate < start) || (end && form.dueDate > end)) {
        setFormError(t.dueDateOutOfRange);
        return;
      }
    }
    const payload = {
      ...form,
      dueDate: form.dueDate || "",
      due_date: form.dueDate || "",
      depositedAt: form.depositedAt || "",
      deposited_at: form.depositedAt || "",
      collectedAt: form.collectedAt || "",
      collected_at: form.collectedAt || "",
    };

    if (editItem) { patchItem("transactions",editItem.id,payload); }
    else { addItem("transactions",payload); }
    setInvalidFields({});
    setForm(EMPTY); setShowModal(false); setEditItem(null); setModalMode("create");
  };

  const openView = (tx) => {
    setForm({ portfolioId:tx.portfolioId||"",investmentId:tx.investmentId||"",category:tx.category||"",
      amount:tx.amount||"",date:tx.date||"",dueDate:tx.dueDate||tx.due_date||"",depositedAt:tx.depositedAt||tx.deposited_at||"",collectedAt:tx.collectedAt||tx.collected_at||"",type:tx.type||"income",status:tx.status||"recorded",notes:tx.notes||"" });
    setEditItem(tx); setModalMode("view"); setFormError(""); setInvalidFields({}); setShowModal(true);
  };

  const totalInc = txIncome(filtered);
  const totalExp = txExpense(filtered);

  const typeOpts = [{value:"income",label:t.income},{value:"expense",label:t.expense}];
  const statusFilterOptions = [
    { value:"collected", label:t.collected },
    { value:"deposited", label:t.deposited },
    { value:"scheduled", label:t.scheduled },
  ];
  const statusOpts = ((db?.settings?.transactionStatuses&&db.settings.transactionStatuses.length)?db.settings.transactionStatuses:["recorded","scheduled","cancelled"]).map(v=>({ value:v, label:v }));

  const normalizedStatus = String(form.status || "").toLowerCase();
  const showDueDate = normalizedStatus.includes("schedule");
  const showDepositedAt = normalizedStatus.includes("deposit");
  const showCollectedAt = normalizedStatus.includes("collect");
  const formatDateDisplay = (value) => {
    if (!value) return "";
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
  };

  useEffect(() => {
    if (!modalPrefill) return;
    setForm({ ...EMPTY, ...modalPrefill });
    setEditItem(null);
    setModalMode("create");
    setFormError("");
    setInvalidFields({});
    setShowModal(true);
  }, [modalPrefill]);

  useEffect(() => {
    if (!navigationFilter?.investmentId) return;
    if (navigationFilter.portfolioId) setFilterPortfolio(navigationFilter.portfolioId);
    setFilterInvestment(navigationFilter.investmentId);
  }, [navigationFilter]);

  useEffect(() => {
    if (!filterInvestment) return;
    const stillValid = investmentsForFilter.some((inv) => inv.id === filterInvestment);
    if (!stillValid) setFilterInvestment("");
  }, [filterPortfolio, filterInvestment, investmentsForFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPortfolio, filterStatus, filterInvestment, filterSmartStatus, filterStartDate, filterEndDate, pageSize]);

  useEffect(() => {
    setGoToPageInput(String(safePage));
  }, [safePage]);

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",gap:"10px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
          <div>
          <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.transactions}</h2>
          <div style={{ fontSize:"0.8rem",color:T.textMuted,marginTop:"2px" }}>{totalRecords} records</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
        <Btn icon={<Download size={15}/>} onClick={handleExportToExcel}>{t.exportToExcel}</Btn>
        <Btn icon={<Plus size={15}/>} onClick={()=>{
          const selectedInvestment = allInvestments.find((inv) => inv.id === filterInvestment);
          const nextForm = selectedInvestment
            ? { ...EMPTY, portfolioId:selectedInvestment.portfolioId || "", investmentId:selectedInvestment.id || "" }
            : { ...EMPTY };
          setForm(nextForm);
          setEditItem(null);
          setModalMode("create");
          setFormError("");
          setShowModal(true);
        }}>{t.addTransaction}</Btn>
        </div>
      </div>

      {/* Summary + filter */}
      <div style={{ display:"flex",gap:"12px",alignItems:"center",marginBottom:"12px",flexWrap:"wrap" }}>
        <div style={{ padding:"8px 16px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.82rem",fontWeight:500 }}>
          <span style={{ color:T.textMuted,marginRight:"6px" }}>{t.totalIncome}:</span>
          <span style={{ color:T.positive }}>+{fmtMoney(totalInc,{currency:"USD"})}</span>
        </div>
        <div style={{ padding:"8px 16px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"0.82rem",fontWeight:500 }}>
          <span style={{ color:T.textMuted,marginRight:"6px" }}>Expenses:</span>
          <span style={{ color:T.negative }}>-{fmtMoney(totalExp,{currency:"USD"})}</span>
        </div>
      </div>
      <div style={{ ...filterBarCss, marginBottom:"20px" }}>
        <SearchableSingleSelect
          options={portfolios.map((p)=>({ value:p.id, label:p.name }))}
          value={filterPortfolio}
          onChange={onPortfolioFilterChange}
          placeholder={t.allPortfolios}
          searchPlaceholder={t.allPortfolios}
          font={font}
          minWidth="220px"
          variant="lightFilter"
          isRTL={isRTL}
        />
        <SearchableSingleSelect
          options={investmentsForFilter.map(i=>({ value:i.id, label:i.name }))}
          value={filterInvestment}
          onChange={setFilterInvestment}
          placeholder={t.filterByInvestment}
          searchPlaceholder={t.filterByInvestment}
          font={font}
          minWidth="220px"
          variant="lightFilter"
          isRTL={isRTL}
        />
        <SearchableSingleSelect
          options={smartStatusOptions}
          value={filterSmartStatus}
          onChange={setFilterSmartStatus}
          placeholder={t.smartStatusLabel}
          searchPlaceholder={t.smartStatusSearchPlaceholder}
          font={font}
          minWidth="220px"
          variant="lightFilter"
          isRTL={isRTL}
        />
        <SearchableSingleSelect
          options={statusFilterOptions}
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder={t.allStatuses}
          searchPlaceholder={t.transactionStatusLabel}
          font={font}
          minWidth="220px"
          variant="lightFilter"
          isRTL={isRTL}
        />
        <DateRangeFilter
          startDate={filterStartDate}
          endDate={filterEndDate}
          onChange={(start, end) => { setFilterStartDate(start); setFilterEndDate(end); }}
          onClear={() => { setFilterStartDate(""); setFilterEndDate(""); }}
          isRTL={isRTL}
          label={t.transactionDateRange}
          clearLabel={t.clearDateRange}
        />
      </div>

      <Card style={{ overflow:"visible" }}>
        {sorted.length===0
          ? <div style={{ padding:"32px" }}><EmptyState text={t.noRecords}/></div>
          : (
            <div className="overflow-x-auto">
            <table style={{ width:"100%",minWidth:"920px",borderCollapse:"collapse",fontSize:"0.85rem" }}>
              <thead>
                <tr style={{ background:T.bgApp }}>
                  {[t.date,t.category,t.portfolio,t.investment,t.amount,t.transactionType,t.status,t.smartStatusLabel,""].map((h,i)=>(
                    <th key={i} style={{ padding:"10px 14px",textAlign:isRTL?"right":"left",fontSize:"0.7rem",fontWeight:600,color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx,i)=>{
                  const txRowId = tx?.id ?? `tx-row-${i}`;
                  const ptf = portfolios.find(p=>p.id===tx.portfolioId);
                  const inv = visible(db?.investments||[]).find(inv=>inv.id===tx.investmentId);
                  const txSmartStatus = getSmartTxStatus(tx);
                  return (
                    <tr key={txRowId} style={{ borderBottom:i<paginatedTransactions.length-1?`1px solid ${T.border}`:"none",transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bgApp}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <td style={{ padding:"11px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{tx.date||"—"}</td>
                      <td style={{ padding:"11px 14px",fontWeight:500,color:T.textPrimary,textAlign:isRTL?"right":"left" }}>{tx.category||"—"}</td>
                      <td style={{ padding:"11px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{ptf?.name||"—"}</td>
                      <td style={{ padding:"11px 14px",color:T.textSecondary,textAlign:isRTL?"right":"left" }}>{inv?.name||"—"}</td>
                      <td style={{ padding:"11px 14px",fontWeight:600,color:tx.type==="income"?T.positive:T.negative,textAlign:isRTL?"right":"left" }}>
                        {tx.type==="income"?"+":"-"}{fmtMoney(tx.amount,{currency:portfolioCurrency(db, tx.portfolioId)})}
                      </td>
                      <td style={{ padding:"11px 14px",textAlign:isRTL?"right":"left" }}><Chip color={tx.type==="income"?T.positive:T.negative}>{tx.type==="income"?t.income:t.expense}</Chip></td>
                      <td style={{ padding:"11px 14px",textAlign:isRTL?"right":"left" }}><Chip color={statusColor(tx.status)}>{tx.status}</Chip></td>
                      <td style={{ padding:"11px 14px",textAlign:isRTL?"right":"left" }}>{txSmartStatus ? <Chip color={smartStatusColor(txSmartStatus)}>{smartStatusLabel(txSmartStatus)}</Chip> : "—"}</td>
                      <td style={{ padding:"11px 10px",position:"relative" }} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:"flex",gap:"3px",justifyContent:"flex-end" }}>
                          <button title={t.viewDetails} onClick={()=>openView(tx)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"5px",display:"flex" }} onMouseEnter={e=>e.currentTarget.style.color=T.info} onMouseLeave={e=>e.currentTarget.style.color=T.textMuted}><Eye size={13}/></button>
                          <button title={t.settings} onClick={()=>setOpenMenu(openMenu===txRowId?null:txRowId)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"4px",borderRadius:"5px",display:"flex",position:"relative" }}
                            onMouseEnter={e=>{e.currentTarget.style.background=T.bgApp; e.currentTarget.style.color=T.warning;}} onMouseLeave={e=>{e.currentTarget.style.background="none"; e.currentTarget.style.color=T.textMuted;}}>
                            <MoreVertical size={13}/>
                          </button>
                          {openMenu===txRowId && <TxActionMenu tx={tx} onClose={()=>setOpenMenu(null)}/>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )
        }
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap",padding:"14px 16px",borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
            <label style={{ fontSize:"0.8rem",color:T.textMuted }}>{t.pageSize}</label>
            <select
              value={pageSize}
              onChange={(e)=>setPageSize(e.target.value===PAGE_SIZE_ALL?PAGE_SIZE_ALL:Number(e.target.value))}
              style={{ border:`1px solid ${T.border}`,borderRadius:"8px",padding:"6px 8px",fontSize:"0.8rem",background:T.bgCard,color:T.textPrimary }}
            >
              {[20,50,100].map((size)=><option key={size} value={size}>{size}</option>)}
              <option value={PAGE_SIZE_ALL}>{t.allRecords}</option>
            </select>
            <span style={{ fontSize:"0.8rem",color:T.textMuted }}>{t.pageLabel} {safePage} / {totalPages}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" }}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1 || pageSize === PAGE_SIZE_ALL}
              style={{ border:`1px solid ${T.border}`,borderRadius:"8px",padding:"6px 10px",fontSize:"0.8rem",background:T.bgCard,color:T.textPrimary,cursor:(safePage <= 1 || pageSize === PAGE_SIZE_ALL)?"not-allowed":"pointer",opacity:(safePage <= 1 || pageSize === PAGE_SIZE_ALL)?0.5:1 }}
            >
              {t.previous}
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages || pageSize === PAGE_SIZE_ALL}
              style={{ border:`1px solid ${T.border}`,borderRadius:"8px",padding:"6px 10px",fontSize:"0.8rem",background:T.bgCard,color:T.textPrimary,cursor:(safePage >= totalPages || pageSize === PAGE_SIZE_ALL)?"not-allowed":"pointer",opacity:(safePage >= totalPages || pageSize === PAGE_SIZE_ALL)?0.5:1 }}
            >
              {t.next}
            </button>
            <label style={{ fontSize:"0.8rem",color:T.textMuted }}>{t.goToPage}</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goToPageInput}
              onChange={(e)=>setGoToPageInput(e.target.value)}
              onKeyDown={(e)=>{
                if (e.key !== "Enter") return;
                const nextPage = Number(goToPageInput);
                if (Number.isFinite(nextPage)) setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)));
              }}
              style={{ width:"84px",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"6px 8px",fontSize:"0.8rem",background:T.bgCard,color:T.textPrimary }}
              disabled={pageSize === PAGE_SIZE_ALL}
            />
          </div>
        </div>
      </Card>

      {showModal && (
        <Modal title={modalMode==="create"?t.addTransaction:`${t.view} ${t.transactions}`} onClose={()=>{setShowModal(false);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});}}>
          {modalMode === "view" ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"10px" }}>
              <ReadOnlyField label={t.transactionType} value={form.type} />
              <ReadOnlyField label={t.status} value={form.status} />
              <ReadOnlyField
                label={t.smartStatusLabel}
                value={(() => {
                  const popupSmartStatus = getSmartTxStatus(editItem || form);
                  return popupSmartStatus
                    ? <Chip color={smartStatusColor(popupSmartStatus)}>{smartStatusLabel(popupSmartStatus)}</Chip>
                    : "—";
                })()}
              />
              <ReadOnlyField label={t.amount} value={fmtMoney(Number(form.amount || 0), { currency:portfolioCurrency(db, form.portfolioId) })} />
              <ReadOnlyField label={t.portfolio} value={portfolios.find((p)=>p.id===form.portfolioId)?.name} />
              <ReadOnlyField label="Due Date" value={formatDateDisplay(form.dueDate || editItem?.due_date) || "Pending"} />
              <ReadOnlyField label="Deposited At" value={formatDateDisplay(form.depositedAt || editItem?.deposited_at) || "Pending"} />
              <ReadOnlyField label="Collected At" value={formatDateDisplay(form.collectedAt || editItem?.collected_at) || "Pending"} />
              <ReadOnlyField label={t.notes} value={form.notes} />
              <div style={{ gridColumn:"1 / -1", padding:"10px 12px", border:`1px solid ${T.border}`, borderRadius:"10px", background:T.bgApp }}>
                <div style={{ fontSize:"0.75rem", fontWeight:700, color:T.textSecondary, marginBottom:"8px" }}>Transaction Timeline</div>
                <div style={{ display:"grid", gap:"8px" }}>
                  {[
                    { label:"Scheduled", value: formatDateDisplay(form.dueDate || editItem?.due_date) || "" },
                    { label:"Deposited", value: formatDateDisplay(form.depositedAt || editItem?.deposited_at) || "" },
                    { label:"Collected", value: formatDateDisplay(form.collectedAt || editItem?.collected_at) || "" },
                  ].map((stage) => (
                    <div key={stage.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", fontSize:"0.8rem" }}>
                      <span style={{ color:T.textMuted }}>{stage.label}</span>
                      <span style={{ color:T.textPrimary, fontWeight: stage.value ? 700 : 500 }}>
                        {stage.value ? stage.value : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
          <FormField label={t.portfolio} required>
            <Select value={form.portfolioId} onChange={e=>{f("portfolioId")(e.target.value);f("investmentId")("");setInvalidFields(prev=>({...prev,portfolioId:false,investmentId:false}));}} invalid={invalidFields.portfolioId}
              options={portfolios.map(p=>({value:p.id,label:p.name}))} placeholder={t.selectPortfolio} isRTL={isRTL}/>
          </FormField>
          <FormField label={t.investment} required>
            <Select value={form.investmentId} onChange={e=>{f("investmentId")(e.target.value);setInvalidFields(prev=>({...prev,investmentId:false}));}} invalid={invalidFields.investmentId}
              options={[{value:"",label:`(${t.selectInvestment})`},...investmentsForPortfolio.map(i=>({value:i.id,label:i.name}))]}
              isRTL={isRTL}/>
          </FormField>
          <FormField label={t.category} required>
            <Select value={form.category} onChange={e=>{f("category")(e.target.value);setInvalidFields(prev=>({...prev,category:false}));}} invalid={invalidFields.category}
              options={db?.settings?.transactionCategories||[]} placeholder={t.selectCategory} isRTL={isRTL}/>
          </FormField>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <FormField label={t.transactionType}><Select value={form.type} onChange={e=>f("type")(e.target.value)} options={typeOpts} isRTL={isRTL}/></FormField>
            <FormField label={t.amount} required><Input type="number" value={form.amount} onChange={e=>{f("amount")(e.target.value);setInvalidFields(prev=>({...prev,amount:false}));}} invalid={invalidFields.amount} isRTL={isRTL} placeholder="0.00"/></FormField>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <FormField label={t.date} required><Input type="date" value={form.date} onChange={e=>{f("date")(e.target.value);setInvalidFields(prev=>({...prev,date:false}));}} invalid={invalidFields.date} isRTL={isRTL}/></FormField>
            <FormField label={t.status}><Select value={form.status} onChange={e=>f("status")(e.target.value)} options={statusOpts} isRTL={isRTL}/></FormField>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr",gap:"12px" }}>
            {showDueDate && <FormField label={t.dueDate}><Input type="date" value={form.dueDate} onChange={e=>f("dueDate")(e.target.value)} isRTL={isRTL}/></FormField>}
            {showDepositedAt && <FormField label="Deposited At"><Input type="date" value={form.depositedAt} onChange={e=>f("depositedAt")(e.target.value)} isRTL={isRTL}/></FormField>}
            {showCollectedAt && <FormField label="Collected At"><Input type="date" value={form.collectedAt} onChange={e=>f("collectedAt")(e.target.value)} isRTL={isRTL}/></FormField>}
          </div>
          <FormField label={t.notes}><Input value={form.notes} onChange={e=>f("notes")(e.target.value)} isRTL={isRTL} placeholder={`(${t.optional})`}/></FormField>
            </>
          )}
          {formError && <div style={{ color:T.negative, fontSize:"0.78rem", marginBottom:"10px" }}>{formError}</div>}
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"8px" }}>
            {modalMode==="view" && (<>
              <Btn onClick={()=>setModalMode("edit")}>{t.editInModal}</Btn>
              <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});}}>{t.returnLabel}</Btn>
            </>)}
            {modalMode==="edit" && (<>
              <Btn onClick={handleSave}>{t.save}</Btn>
              <Btn variant="secondary" onClick={()=>{ setForm({ portfolioId:editItem.portfolioId||"",investmentId:editItem.investmentId||"",category:editItem.category||"",amount:editItem.amount||"",date:editItem.date||"",dueDate:editItem.dueDate||editItem.due_date||"",depositedAt:editItem.depositedAt||editItem.deposited_at||"",collectedAt:editItem.collectedAt||editItem.collected_at||"",type:editItem.type||"income",status:editItem.status||"recorded",notes:editItem.notes||"" }); setFormError(""); setInvalidFields({}); setModalMode("view"); }}>{t.cancel}</Btn>
            </>)}
            {modalMode==="create" && (<>
              <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditItem(null);setModalMode("create");setFormError("");setInvalidFields({});}}>{t.cancel}</Btn>
              <Btn onClick={handleSave}>{t.save}</Btn>
            </>)}
          </div>
        </Modal>
      )}
    </div>
  );
}

function TxActionMenu({ tx, onClose }) {
  const { patchItem, archiveItem, unarchiveItem, hardDeleteItem, t, db, isRTL } = useApp();
  const ref = useRef(null);
  const txId = tx?.id;
  useEffect(() => {
    const h = e => { if(ref.current&&!ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  }, [onClose]);
  const statuses = db?.settings?.transactionStatuses || ["recorded","scheduled","cancelled"];
  const doneStatus = statuses.find(s=>String(s).toLowerCase().includes("record")) || statuses[0];
  const queuedStatus = statuses.find(s=>String(s).toLowerCase().includes("schedule")) || statuses[1] || statuses[0];
  const actions = [
    { label:t.markCollected, icon:<Check size={13}/>, color:T.positive, show:tx.status!==doneStatus, action:()=>{ if (!txId) return onClose(); patchItem("transactions",txId,{status:doneStatus,collected_at:new Date().toISOString(),collectedAt:new Date().toISOString()}); onClose(); } },
    { label:t.markScheduled, icon:<RefreshCw size={13}/>, color:T.warning, show:tx.status===doneStatus, action:()=>{ if (!txId) return onClose(); patchItem("transactions",txId,{status:queuedStatus}); onClose(); } },
    { label:tx.is_hidden ? t.unarchive : t.archive, icon:tx.is_hidden ? <Eye size={13}/> : <EyeOff size={13}/>, color:T.warning, show:true, action:()=>{ if (!txId) return onClose(); tx.is_hidden ? unarchiveItem("transactions",txId) : archiveItem("transactions",txId); onClose(); } },
    { label:t.deleteItem, icon:<Trash2 size={13}/>, color:T.negative, show:true, action:()=>{ if (!txId) return onClose(); if(window.confirm(t.deleteCascadeWarning)) hardDeleteItem("transactions",txId); onClose(); } },
  ].filter(a=>a.show);
  return (
    <div ref={ref} style={{ position:"absolute",right:0,top:"calc(100% + 4px)",zIndex:5000,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:"10px",minWidth:"170px",boxShadow:"0 8px 28px rgba(0,0,0,0.15)",overflow:"hidden" }}>
      {actions.map(a=>(
        <button key={a.label} onClick={a.action} style={{ display:"flex",alignItems:"center",gap:"8px",width:"100%",padding:"9px 14px",background:"none",border:"none",color:a.color,fontSize:"0.78rem",fontWeight:500,cursor:"pointer",textAlign:isRTL?"right":"left" }}
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
  const { db, updateDb, t, isRTL, font, backupFiles, lastBackupAt, backupBusy, triggerBackup, restoreBackup, fetchBackups } = useApp();
  const [newItems, setNewItems] = useState({});
  const [editingItems, setEditingItems] = useState({});
  const [currencyError, setCurrencyError] = useState("");
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [restoreCandidate, setRestoreCandidate] = useState(null);

  const sections = [
    { key:"portfolioTypes",        label:t.portfolioTypes,        icon:<FolderOpen size={15}/> },
    { key:"riskLevels",            label:t.riskLevels,            icon:<AlertCircle size={15}/> },
    { key:"fundingSources",        label:t.fundingSources,        icon:<Wallet size={15}/> },
    { key:"investmentMethods",    label:t.investmentMethods,    icon:<Landmark size={15}/> },
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

  const saveEditItem = (key, idx) => {
    const editKey = `${key}-${idx}`;
    const nextVal = (editingItems[editKey] || "").trim();
    if (!nextVal) return;
    if ((db?.settings?.[key] || []).some((item, i) => i !== idx && item === nextVal)) return;
    updateDb((prev) => {
      const list = [...(prev.settings[key] || [])];
      list[idx] = nextVal;
      return { ...prev, settings: { ...prev.settings, [key]: list } };
    });
    setEditingItems((prev) => {
      const out = { ...prev };
      delete out[editKey];
      return out;
    });
  };

  const baseCurrency = db?.settings?.baseCurrency || "USD";
  const currencyRates = db?.settings?.currencyRates || {};
  const setBaseCurrency = (value) => {
    updateDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        baseCurrency: value,
      },
    }));
  };
  const setCurrencyRate = (currency, value) => {
    updateDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        currencyRates: { ...(prev.settings.currencyRates || {}), [currency]: Number(value) || 0 },
      },
    }));
  };

  const renameCurrency = (idx) => {
    if (!editingCurrency || editingCurrency.index !== idx) return;
    const nextName = (editingCurrency.value || "").trim();
    if (!nextName) return;
    const current = (db?.settings?.currencies || [])[idx];
    if (!current) return;
    if ((db?.settings?.currencies || []).some((c, i) => i !== idx && c === nextName)) {
      setCurrencyError("Currency already exists.");
      return;
    }
    updateDb((prev) => {
      const list = [...(prev.settings.currencies || [])];
      list[idx] = nextName;
      const rates = { ...(prev.settings.currencyRates || {}) };
      const existingRate = rates[current] ?? 0;
      delete rates[current];
      rates[nextName] = existingRate;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          currencies: list,
          baseCurrency: prev.settings.baseCurrency === current ? nextName : prev.settings.baseCurrency,
          currencyRates: rates,
        },
      };
    });
    setEditingCurrency(null);
    setCurrencyError("");
  };

  const deleteCurrency = (currency) => {
    if (currency === baseCurrency) {
      setCurrencyError("Please assign another base currency before deleting this one.");
      return;
    }
    updateDb((prev) => {
      const list = (prev.settings.currencies || []).filter((c) => c !== currency);
      const rates = { ...(prev.settings.currencyRates || {}) };
      delete rates[currency];
      return { ...prev, settings: { ...prev.settings, currencies: list, currencyRates: rates } };
    });
    setCurrencyError("");
  };

  const handleManualBackup = async () => {
    await triggerBackup({ isAuto: false });
    await fetchBackups();
  };

  const confirmRestore = async () => {
    if (!restoreCandidate) return;
    const ok = await restoreBackup(restoreCandidate);
    if (ok) {
      setRestoreCandidate(null);
      window.alert(t.backupRestoreSuccess);
    }
  };

  const shownDate = lastBackupAt ? new Date(lastBackupAt).toLocaleString() : t.backupNoDate;

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ fontFamily:font }}>
      <div style={{ marginBottom:"24px" }}>
        <h2 style={{ margin:0,fontSize:"1.4rem",fontWeight:700,color:T.textPrimary }}>{t.settingsTitle}</h2>
        <div style={{ fontSize:"0.82rem",color:T.textMuted,marginTop:"4px" }}>{t.settingsDesc}</div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px" }}>
        {sections.map(({ key, label, icon }) => (
          <Card key={key} style={{ padding:"14px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px" }}>
              <div style={{ width:"28px",height:"28px",borderRadius:"7px",background:T.emeraldBg,display:"flex",alignItems:"center",justifyContent:"center",color:T.emerald,flexShrink:0 }}>{icon}</div>
              <h4 style={{ margin:0,fontSize:"0.82rem",fontWeight:600,color:T.textPrimary }}>{label}</h4>
            </div>

            {key === "currencies" ? (
              <>
                <div style={{ marginBottom:"10px" }}>
                  <Select value={baseCurrency} onChange={(e)=>setBaseCurrency(e.target.value)} options={(db?.settings?.currencies||[]).map((c)=>({ value:c, label:`Base · ${c}` }))} isRTL={isRTL} />
                </div>
                {currencyError && <div style={{ marginBottom:"8px", fontSize:"0.75rem", color:T.negative }}>{currencyError}</div>}
                <div style={{ display:"grid",gap:"8px",marginBottom:"12px" }}>
                  {(db?.settings?.currencies||[]).map((currency, i) => {
                    const isBase = currency === baseCurrency;
                    const isEditing = editingCurrency?.index === i;
                    return (
                      <div key={`${currency}-${i}`} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", padding:"8px 10px", border:`1px solid ${isBase ? T.emerald : T.border}`, borderRadius:"9px", background:isBase ? "rgba(16,185,129,0.12)" : "#f8fafc", color:T.textPrimary }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px", minWidth:0 }}>
                          {isEditing ? (
                            <input value={editingCurrency.value} onChange={(e)=>setEditingCurrency({ index:i, value:e.target.value })} style={{ width:"90px", padding:"4px 6px", background:T.bgInput, border:`1px solid ${T.border}`, borderRadius:"6px", color:T.textPrimary, fontSize:"0.75rem" }} />
                          ) : (
                            <span style={{ fontSize:"0.78rem", fontWeight:600, color:T.textPrimary }}>{currency}</span>
                          )}
                          {isBase && <span style={{ fontSize:"0.68rem", color:T.emerald, fontWeight:700, letterSpacing:"0.05em" }}>BASE</span>}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <span style={{ fontSize:"0.7rem", color:T.textMuted, fontWeight:600 }}>1 USD =</span>
                          <input type="number" min="0" step="0.0001" value={currencyRates[currency] ?? ""} onChange={(e)=>setCurrencyRate(currency, e.target.value)} style={{ width:"102px", padding:"5px 8px", background:T.bgInput, border:`1px solid ${T.border}`, borderRadius:"6px", color:T.textPrimary, fontSize:"0.76rem" }} />
                          {isEditing ? (
                            <>
                              <button onClick={()=>renameCurrency(i)} style={{ border:"none", background:"none", color:T.positive, cursor:"pointer", display:"flex" }}><Check size={13}/></button>
                              <button onClick={()=>setEditingCurrency(null)} style={{ border:"none", background:"none", color:T.textMuted, cursor:"pointer", display:"flex" }}><X size={13}/></button>
                            </>
                          ) : (
                            <button onClick={()=>{setEditingCurrency({ index:i, value:currency }); setCurrencyError("");}} style={{ border:"none", background:"none", color:T.textSecondary, cursor:"pointer", display:"flex" }}><Edit3 size={13}/></button>
                          )}
                          <button onClick={()=>deleteCurrency(currency)} style={{ border:"none", background:"none", color:T.negative, cursor:"pointer", display:"flex" }}><Trash2 size={13}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"12px",minHeight:"28px" }}>
                  {(db?.settings?.[key]||[]).map((item,i)=>{
                    const editKey = `${key}-${i}`;
                    const isEditing = Object.prototype.hasOwnProperty.call(editingItems, editKey);
                    return (
                      <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px", background:T.bgApp,border:`1px solid ${T.border}`,borderRadius:"100px", fontSize:"0.76rem",fontWeight:500,color:T.textSecondary }}>
                        {isEditing ? (
                          <input
                            value={editingItems[editKey]}
                            onChange={(e)=>setEditingItems((prev)=>({ ...prev, [editKey]:e.target.value }))}
                            onKeyDown={(e)=>e.key==="Enter"&&saveEditItem(key,i)}
                            style={{ width:"98px", padding:"3px 6px", border:`1px solid ${T.border}`, borderRadius:"6px", background:"#ffffff", color:T.textPrimary, fontSize:"0.72rem" }}
                          />
                        ) : item}
                        {isEditing ? (
                          <>
                            <button onClick={()=>saveEditItem(key,i)} style={{ background:"none",border:"none",cursor:"pointer",color:T.positive,padding:"0",lineHeight:1,display:"flex" }}><Check size={11}/></button>
                            <button onClick={()=>setEditingItems((prev)=>{ const out={...prev}; delete out[editKey]; return out; })} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"0",lineHeight:1,display:"flex" }}><X size={11}/></button>
                          </>
                        ) : (
                          <button onClick={()=>startEditItem(key,i,item)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textMuted,padding:"0",lineHeight:1,display:"flex" }}><Edit3 size={11}/></button>
                        )}
                        <button onClick={()=>removeItem(key,i)} style={{ background:"none",border:"none",cursor:"pointer",color:T.negative,padding:"0",lineHeight:1,display:"flex" }}><Trash2 size={11}/></button>
                      </span>
                    );
                  })}
                  {(db?.settings?.[key]||[]).length===0 && <span style={{ fontSize:"0.74rem",color:T.textMuted,fontStyle:"italic" }}>No items yet</span>}
                </div>
              </>
            )}

            <div style={{ display:"flex",gap:"6px" }}>
              <input value={newItems[key]||""} onChange={e=>setNewItems(p=>({...p,[key]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addItem(key)}
                placeholder={`Add ${label}...`} dir={isRTL?"rtl":"ltr"}
                style={{ flex:1,padding:"7px 10px",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textPrimary,fontSize:"0.82rem",outline:"none",fontFamily:font }}
              />
              <button onClick={()=>addItem(key)} style={{ padding:"7px 12px",background:T.emerald,border:"none",borderRadius:"7px",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center" }}>
                <Plus size={14}/>
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop:"20px",padding:"16px 20px",width:"min(100%, 360px)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",flexWrap:"wrap",marginBottom:"10px" }}>
          <div>
            <h4 style={{ margin:"0 0 4px",fontSize:"0.92rem",color:T.textPrimary }}>{t.backupTitle}</h4>
            <div style={{ fontSize:"0.78rem",color:T.textMuted }}>{t.backupInfo}: <strong style={{ color:T.textSecondary }}>{shownDate}</strong></div>
          </div>
          <Btn onClick={handleManualBackup} disabled={backupBusy} icon={<RefreshCw size={14} />}>{t.backupNow}</Btn>
        </div>
        <div style={{ display:"grid",gap:"8px" }}>
          {backupFiles.length === 0 && (
            <div style={{ fontSize:"0.8rem",color:T.textMuted }}>{t.backupNoItems}</div>
          )}
          {backupFiles.slice(0, 5).map((backup) => (
            <div key={backup.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:"8px",background:T.bgApp }}>
              <div style={{ display:"flex",flexDirection:"column",gap:"2px" }}>
                <span style={{ fontSize:"0.78rem",color:T.textPrimary,fontWeight:500 }}>{backup.name}</span>
                <span style={{ fontSize:"0.72rem",color:T.textMuted }}>{new Date(backup.createdTime).toLocaleString()}</span>
              </div>
              <button title="Restore" onClick={() => setRestoreCandidate(backup)} style={{ border:"none",background:"none",cursor:"pointer",color:T.emerald,display:"flex",padding:"3px" }}>
                <RotateCcw size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* DB info card */}
      <Card style={{ marginTop:"20px",padding:"16px 20px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
          <CheckCircle2 size={16} color={T.positive}/>
          <span style={{ fontSize:"0.82rem",color:T.textSecondary }}>
            {t.dataStorage}: <strong style={{ color:T.textPrimary }}>{DB_FILENAME}</strong> on your Google Drive
          </span>
        </div>
      </Card>

      {restoreCandidate && (
        <Modal title={t.backupTitle} onClose={() => setRestoreCandidate(null)} maxWidth="420px">
          <p style={{ margin:"0 0 16px",fontSize:"0.84rem",color:T.textSecondary }}>{t.backupRestoreConfirm}</p>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"8px" }}>
            <Btn variant="secondary" onClick={() => setRestoreCandidate(null)}>{t.cancel}</Btn>
            <Btn onClick={confirmRestore}>{t.save}</Btn>
          </div>
        </Modal>
      )}

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

function SearchableSingleSelect({ options, value, onChange, placeholder, searchPlaceholder, font, minWidth = "220px", variant = "dark", isRTL = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((opt) => String(opt.label ?? opt.value ?? "").toLowerCase().includes(normalizedQuery));
  const selected = options.find((opt) => (opt.value ?? opt) === value);

  const palette = (variant === "light" || variant === "lightFilter")
    ? {
      buttonBg: "#ffffff",
      buttonColor: T.textPrimary,
      buttonBorder: "1px solid rgba(148,163,184,0.46)",
      panelBg: "#ffffff",
      panelBorder: "1px solid rgba(148,163,184,0.3)",
      inputColor: T.textPrimary,
      muted: T.textSecondary,
      optionColor: T.textSecondary,
      selectedOptionColor: T.textPrimary,
      shadow: "0 8px 24px rgba(15,23,42,0.12)",
      divider: "1px solid rgba(148,163,184,0.18)",
      optionHoverBg: "rgba(15,23,42,0.05)",
    }
    : {
      buttonBg: "#111c33",
      buttonColor: "#e2e8f0",
      buttonBorder: "1px solid rgba(148,163,184,0.32)",
      panelBg: "#0b1220",
      panelBorder: "1px solid rgba(148,163,184,0.3)",
      inputColor: "#e2e8f0",
      muted: "#94a3b8",
      optionColor: "#cbd5e1",
      selectedOptionColor: "#f8fafc",
      shadow: "0 8px 30px rgba(2,6,23,0.6)",
      divider: "1px solid rgba(148,163,184,0.18)",
      optionHoverBg: "rgba(148,163,184,0.14)",
    };

  return (
    <div ref={ref} style={{ position:"relative", minWidth }}>
      <button type="button" onClick={()=>setOpen((v)=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", padding:"9px 10px", border:palette.buttonBorder, borderRadius:"8px", background:palette.buttonBg, color:palette.buttonColor, fontFamily:font, fontSize:"0.8rem", cursor:"pointer", minHeight:"38px" }}>
        <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", textAlign:isRTL?"right":"left", flex:1 }}>{selected?.label || placeholder}</span>
        <ChevronDown size={14} style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, border:palette.panelBorder, borderRadius:"10px", background:palette.panelBg, zIndex:30, padding:"10px", boxShadow:palette.shadow }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", border:"1px solid rgba(148,163,184,0.25)", borderRadius:"8px", padding:"6px 8px", marginBottom:"8px", color:palette.muted }}>
            <Search size={14} />
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={searchPlaceholder} style={{ flex:1, border:"none", outline:"none", background:"transparent", color:palette.inputColor, fontSize:"0.78rem", fontFamily:font, textAlign:isRTL?"right":"left" }} />
          </div>
          <div style={{ maxHeight:"200px", overflowY:"auto", borderTop:palette.divider, marginTop:"6px", paddingTop:"6px" }}>
            <button type="button" onClick={()=>{onChange(""); setOpen(false); setQuery("");}} style={{ width:"100%", textAlign:isRTL?"right":"left", border:"none", background:"transparent", color:palette.buttonColor, fontSize:"0.78rem", padding:"6px 4px", cursor:"pointer", borderRadius:"6px" }} onMouseEnter={(e)=>{e.currentTarget.style.background=palette.optionHoverBg;}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";}}>{placeholder}</button>
            {filtered.map((opt) => {
              const optionValue = opt.value ?? opt;
              const optionLabel = opt.label ?? opt;
              return (
                <button
                  key={optionValue}
                  type="button"
                  onClick={()=>{onChange(optionValue); setOpen(false); setQuery("");}}
                  style={{ width:"100%", textAlign:isRTL?"right":"left", border:"none", background:"transparent", color:optionValue===value?palette.selectedOptionColor:palette.optionColor, fontSize:"0.78rem", padding:"6px 4px", cursor:"pointer", fontWeight:optionValue===value?700:500, borderRadius:"6px" }}
                  onMouseEnter={(e)=>{e.currentTarget.style.background=palette.optionHoverBg;}}
                  onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";}}
                >
                  {optionLabel}
                </button>
              );
            })}
            {!filtered.length && <div style={{ color:"#64748b", fontSize:"0.75rem", padding:"8px 4px" }}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableMultiYearSelect({ options, selectedYears, onChange, t, font, isRTL = false }) {
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
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={t.yearFilter} style={{ flex:1, border:"none", outline:"none", background:"transparent", color:"#e2e8f0", fontSize:"0.78rem", fontFamily:font, textAlign:isRTL?"right":"left" }} />
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

function LegendList({ rows, currency = "USD", textColor = "#cbd5e1", valueColor = "#f8fafc" }) {
  return (
    <div style={{ display:"grid", gap:"8px", minWidth:"190px" }}>
      {rows.map((row) => (
        <div key={row.name} style={{ display:"grid", gridTemplateColumns:"14px 1fr auto", gap:"8px", alignItems:"center", fontSize:"0.76rem", color:textColor }}>
          <span style={{ width:"10px", height:"10px", borderRadius:"999px", background:row.color }} />
          <span>{row.name}</span>
          <span style={{ color:valueColor, fontWeight:600 }}>{fmtMoney(row.value, { currency })} ({row.pct.toFixed(3)}%)</span>
        </div>
      ))}
    </div>
  );
}

function StatisticsMatrixTable({ title, headers, rows, currency = "USD" }) {
  const { isRTL } = useApp();
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
        <thead>
          <tr style={{ background:"rgba(15,23,42,0.85)" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", fontWeight:700, textAlign:isRTL?"right":"left", whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal = row.isTotal;
            return (
              <tr key={row.key || idx} style={{ background:isTotal?"rgba(16,185,129,0.16)":(idx % 2 ? "rgba(148,163,184,0.07)" : "transparent") }}>
                {row.values.map((cell, ci) => (
                  <td key={`${row.key||idx}-${ci}`} style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:isTotal?"#f8fafc":"#cbd5e1", fontWeight:isTotal?700:500, whiteSpace:"nowrap", textAlign:isRTL?"right":"left" }}>
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

function FundingSourceBreakdownTable({ rows, currency, onOpenInvestments }) {
  const { isRTL, t } = useApp();
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
        <thead>
          <tr style={{ background:"rgba(15,23,42,0.85)" }}>
            <th style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", textAlign:isRTL?"right":"left" }}><span style={{ display:"inline-flex", alignItems:"center", gap:"6px" }}><Landmark size={14}/>{t.sourceName}</span></th>
            <th style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", textAlign:isRTL?"right":"left" }}><span style={{ display:"inline-flex", alignItems:"center", gap:"6px" }}><CircleDollarSign size={14}/>{t.totalAllocatedAmount}</span></th>
            <th style={{ padding:"10px 12px", borderBottom:"1px solid rgba(148,163,184,0.24)", color:"#94a3b8", textAlign:isRTL?"right":"left" }}><span style={{ display:"inline-flex", alignItems:"center", gap:"6px" }}><ListTree size={14}/>{t.investmentsList}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.source} style={{ background:idx % 2 ? "rgba(148,163,184,0.07)" : "transparent" }}>
              <td style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:"#f8fafc", fontWeight:600, textAlign:isRTL?"right":"left" }}>{row.source}</td>
              <td style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:"#cbd5e1", textAlign:isRTL?"right":"left" }}>{fmtMoney(row.total, { currency })}</td>
              <td style={{ padding:"10px 12px", borderTop:"1px solid rgba(148,163,184,0.16)", color:"#cbd5e1", textAlign:isRTL?"right":"left" }}>
                <button
                  type="button"
                  onClick={() => onOpenInvestments?.(row)}
                  style={{
                    background:"none",
                    border:"none",
                    padding:0,
                    color:"#7dd3fc",
                    cursor:"pointer",
                    fontSize:"0.8rem",
                    fontWeight:600,
                    textDecoration:"underline",
                  }}
                >
                  {`View ${row.breakdown?.length || 0} Investments`}
                </button>
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
  const [selectedInvestmentStatus, setSelectedInvestmentStatus] = useState("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [fundingInvestmentsModal, setFundingInvestmentsModal] = useState(null);

  const investments = visible(db?.investments || []);
  const transactions = visible(db?.transactions || []);
  const portfolios = visible(db?.portfolios || []);
  const primaryCurrency = baseCurrencyCode(db);
  const investmentStatuses = db?.settings?.investmentStatuses?.length ? db.settings.investmentStatuses : ["Active", "Paused", "Closed"];

  const filteredInvestments = investments.filter((inv) => {
    if (selectedInvestmentStatus && inv.status !== selectedInvestmentStatus) return false;
    if (selectedPortfolioId && inv.portfolioId !== selectedPortfolioId) return false;
    if (selectedInvestmentId && inv.id !== selectedInvestmentId) return false;
    return true;
  });
  const filteredInvestmentIds = new Set(filteredInvestments.map((inv) => inv.id));
  const filteredTransactions = transactions.filter((tx) => filteredInvestmentIds.has(tx.investmentId));

  const toRiskBucket = (risk) => {
    const val = String(risk || "").toLowerCase();
    if (val.includes("low") || val.includes("منخفض")) return "low";
    if (val.includes("med") || val.includes("متوسط")) return "medium";
    if (val.includes("high") || val.includes("مرتفع")) return "high";
    return null;
  };

  const invById = new Map(filteredInvestments.map((i) => [i.id, i]));
  const yearlyRows = [...new Set(filteredTransactions.map((tx) => new Date(tx.date || tx.created_at || Date.now()).getFullYear()))]
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);
  const visibleYears = selectedYears.length ? yearlyRows.filter((y) => selectedYears.includes(String(y))) : yearlyRows;

  const capitalByRisk = { low:0, medium:0, high:0 };
  filteredInvestments.forEach((inv) => {
    const bucket = toRiskBucket(inv.risk);
    if (!bucket) return;
    capitalByRisk[bucket] += toBaseAmount(db, costBasis(inv), portfolioCurrency(db, inv.portfolioId));
  });

  const incomeByYearRisk = {};
  const lossByYearRisk = {};
  const incomeByYearStatus = {};
  const statuses = db?.settings?.transactionStatuses?.length ? db.settings.transactionStatuses : ["recorded", "scheduled", "cancelled"];
  const statusAttributionDate = (tx) => {
    if (isCollectedTransaction(tx)) return tx.collectedAt || tx.collected_at || tx.date || tx.created_at;
    if (isDepositedTransaction(tx)) return tx.depositedAt || tx.deposited_at || tx.date || tx.created_at;
    return tx.date || tx.created_at;
  };

  filteredTransactions.forEach((tx) => {
    const year = new Date(tx.date || tx.created_at || Date.now()).getFullYear();
    const statusYear = new Date(statusAttributionDate(tx) || Date.now()).getFullYear();
    if (!Number.isFinite(year) || !Number.isFinite(statusYear)) return;
    const inv = invById.get(tx.investmentId);
    const risk = toRiskBucket(inv?.risk);
    incomeByYearRisk[year] = incomeByYearRisk[year] || { low:0, medium:0, high:0 };
    lossByYearRisk[year] = lossByYearRisk[year] || { low:0, medium:0, high:0 };
    incomeByYearStatus[statusYear] = incomeByYearStatus[statusYear] || Object.fromEntries(statuses.map((s)=>[s,0]));

    if (tx.type === "income" && tx.status !== "cancelled") {
      if (risk) incomeByYearRisk[year][risk] += toBaseAmount(db, parseFloat(tx.amount) || 0, portfolioCurrency(db, tx.portfolioId));
      if (incomeByYearStatus[statusYear][tx.status] === undefined) incomeByYearStatus[statusYear][tx.status] = 0;
      incomeByYearStatus[statusYear][tx.status] += toBaseAmount(db, parseFloat(tx.amount) || 0, portfolioCurrency(db, tx.portfolioId));
    }

    if (tx.type === "expense" && tx.status !== "cancelled" && risk) {
      lossByYearRisk[year][risk] += toBaseAmount(db, parseFloat(tx.amount) || 0, portfolioCurrency(db, tx.portfolioId));
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

  const statusVisibleYears = selectedYears.length
    ? Object.keys(incomeByYearStatus).map(Number).filter((y) => selectedYears.includes(String(y))).sort((a, b) => b - a)
    : Object.keys(incomeByYearStatus).map(Number).sort((a, b) => b - a);
  const statusRows = statusVisibleYears.map((year) => {
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

  const portfolioById = new Map(portfolios.map((portfolio) => [portfolio.id, portfolio]));
  const allocationByType = {};

  filteredInvestments.forEach((inv) => {
    const portfolio = portfolioById.get(inv.portfolioId);
    if (!portfolio) return;
    const typeKey = portfolio.type || t.unassignedType;
    const value = toBaseAmount(db, curVal(inv), portfolio.currency || "USD");
    if (value <= 0) return;
    allocationByType[typeKey] = (allocationByType[typeKey] || 0) + value;
  });

  const allocationData = Object.entries(allocationByType)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const allocationTotal = allocationData.reduce((sum, row) => sum + row.value, 0);
  const allocationChartData = allocationData.map((row, idx) => ({
    ...row,
    pct: allocationTotal ? (row.value / allocationTotal) * 100 : 0,
    color: T.chart[idx % T.chart.length],
  }));

  const fundingSourceUniverse = [...new Set([...(db?.settings?.fundingSources || []), ...filteredInvestments.flatMap((inv) => (inv.funding || []).map((f) => f.source).filter(Boolean))])];
  const fundingRows = fundingSourceUniverse.map((source) => {
    const breakdown = [];
    let total = 0;
    filteredInvestments.forEach((inv) => {
      const amount = (inv.funding || []).filter((f) => f.source === source).reduce((sum, f) => sum + toBaseAmount(db, parseFloat(f.amount) || 0, portfolioCurrency(db, inv.portfolioId)), 0);
      if (amount > 0) {
        breakdown.push({ investment:inv.name || t.unassignedInvestment, amount });
        total += amount;
      }
    });
    return { source, total, breakdown };
  }).filter((row) => row.total > 0).sort((a,b)=>b.total-a.total);

  const fundingChartTotal = fundingRows.reduce((sum, row) => sum + row.total, 0);
  const fundingChartData = fundingRows.filter((row) => row.total > 0).map((row, idx) => ({ ...row, pct:fundingChartTotal ? (row.total / fundingChartTotal) * 100 : 0, color:T.chart[idx % T.chart.length], name:row.source, value:row.total }));

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
        <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", flexWrap:"wrap" }}>
          <div>
            <label style={{ display:"block", marginBottom:"6px", fontSize:"0.74rem", color:"#94a3b8" }}>{t.yearFilter}</label>
            <SearchableMultiYearSelect options={yearlyRows} selectedYears={selectedYears} onChange={setSelectedYears} t={t} font={font} isRTL={isRTL} />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:"6px", fontSize:"0.74rem", color:"#94a3b8" }}>{t.investmentStatuses}</label>
            <SearchableSingleSelect
              options={investmentStatuses.map((status)=>({ value:status, label:status }))}
              value={selectedInvestmentStatus}
              onChange={setSelectedInvestmentStatus}
              placeholder={t.investmentStatuses}
              searchPlaceholder={t.searchUsersPlaceholder}
              font={font}
              minWidth="220px"
              variant="statsFilter"
              isRTL={isRTL}
            />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:"6px", fontSize:"0.74rem", color:"#94a3b8" }}>{t.portfolio}</label>
            <SearchableSingleSelect
              options={portfolios.map((portfolio)=>({ value:portfolio.id, label:portfolio.name }))}
              value={selectedPortfolioId}
              onChange={(next)=>{
                setSelectedPortfolioId(next);
                if (next && selectedInvestmentId) {
                  const selected = investments.find((inv) => inv.id === selectedInvestmentId);
                  if (selected && selected.portfolioId !== next) setSelectedInvestmentId("");
                }
              }}
              placeholder={t.allPortfolios}
              searchPlaceholder={t.allPortfolios}
              font={font}
              minWidth="220px"
              variant="statsFilter"
              isRTL={isRTL}
            />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:"6px", fontSize:"0.74rem", color:"#94a3b8" }}>{t.investment}</label>
            <SearchableSingleSelect
              options={investments
                .filter((inv) => !selectedPortfolioId || inv.portfolioId === selectedPortfolioId)
                .map((inv)=>({ value:inv.id, label:inv.name }))}
              value={selectedInvestmentId}
              onChange={setSelectedInvestmentId}
              placeholder={t.filterByInvestment}
              searchPlaceholder={t.filterByInvestment}
              font={font}
              minWidth="220px"
              variant="statsFilter"
              isRTL={isRTL}
            />
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gap:"14px", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", marginBottom:"16px" }}>
        <Card style={{ padding:"14px", background:"#111c33", border:"1px solid rgba(148,163,184,0.24)" }}>
          <h3 style={{ margin:"0 0 10px", color:"#f8fafc", fontSize:"0.88rem" }}>{t.assetAllocation}</h3>
          <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 180px", height:"220px" }}>
              {allocationChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocationChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78}>
                      {allocationChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => fmtMoney(value, { currency:primaryCurrency })} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ display:"grid", placeItems:"center", height:"100%", color:"#64748b" }}>{t.noAllocation}</div>}
            </div>
            <LegendList rows={allocationChartData} currency={primaryCurrency} textColor="#dbeafe" valueColor="#bfdbfe" />
          </div>
        </Card>

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
          <h3 style={{ margin:"0 0 10px", color:"#f8fafc", fontSize:"0.88rem" }}>{t.fundingSourcesDistribution}</h3>
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
            <LegendList rows={fundingChartData} currency={primaryCurrency} textColor="#dbeafe" valueColor="#bfdbfe" />
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

      <AccordionSection title={t.fundingSourceBreakdown} icon={<Landmark size={14} color="#94a3b8" />}>
        <FundingSourceBreakdownTable rows={fundingRows} currency={primaryCurrency} onOpenInvestments={setFundingInvestmentsModal} />
      </AccordionSection>

      {fundingInvestmentsModal && (
        <Modal
          title={`${fundingInvestmentsModal.source} Investments`}
          onClose={() => setFundingInvestmentsModal(null)}
          maxWidth="560px"
        >
          {(fundingInvestmentsModal.breakdown || []).length ? (
            <div style={{ display:"grid", gap:"8px" }}>
              {fundingInvestmentsModal.breakdown.map((item, idx) => (
                <div key={`${fundingInvestmentsModal.source}-${item.investment}-${idx}`} style={{ display:"flex", justifyContent:"space-between", gap:"8px", padding:"10px", border:"1px solid rgba(148,163,184,0.25)", borderRadius:"8px", background:"rgba(15,23,42,0.6)" }}>
                  <span style={{ color:"#e2e8f0", fontSize:"0.8rem", fontWeight:600 }}>{item.investment}</span>
                  <span style={{ color:"#bfdbfe", fontSize:"0.78rem" }}>{fmtMoney(item.amount, { currency:primaryCurrency })}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", gap:"8px", padding:"10px", border:"1px solid rgba(56,189,248,0.45)", borderRadius:"8px", background:"rgba(15,23,42,0.9)", fontWeight:700 }}>
                <span style={{ color:"#e2e8f0", fontSize:"0.82rem" }}>{t.totalLabel}</span>
                <span style={{ color:"#7dd3fc", fontSize:"0.8rem" }}>
                  {`${new Intl.NumberFormat("en-US", { minimumFractionDigits:3, maximumFractionDigits:3 }).format((fundingInvestmentsModal.breakdown || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0))} ${primaryCurrency}`}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState text={t.noInvestments} />
          )}
        </Modal>
      )}
    </div>
  );
}

function UserManagementTab() {
  const { usersConfig, updateUserEntry, deleteUserEntry, hasPermission, currentRole, isRTL, font, t } = useApp();
  const users = usersConfig?.users || [];
  const [updatingEmail, setUpdatingEmail] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const currentEmail = String(usersConfig?.ownerEmail || OWNER_PROTECTED_EMAIL).toLowerCase();

  const canDelete = currentRole === "Owner";
  const canAssignRole = currentRole === "Owner" || currentRole === "Supervisor" || hasPermission("assign_role");
  const canBlock = currentRole === "Owner" || currentRole === "Supervisor" || currentRole === "Admin" || hasPermission("block_user");

  const getRoleOptions = (entry) => {
    if (entry?.role === "Owner") return ["Owner"];
    if (currentRole === "Owner") return ["Supervisor", "Admin", "Member"];
    if (currentRole === "Supervisor") return ["Admin", "Member"];
    return [];
  };

  const handleToggleBlock = async (entry) => {
    const status = String(entry?.status || (entry?.blocked ? "blocked" : "active")).toLowerCase();
    const isOwnerRow = String(entry?.email || "").toLowerCase() === currentEmail || entry?.role === "Owner";
    if (isOwnerRow) return;

    if (status === "blocked") {
      if (!(currentRole === "Owner" || currentRole === "Supervisor")) return;
    } else if (!canBlock) {
      return;
    }

    const nextStatus = status === "blocked" ? "active" : "blocked";
    setUpdatingEmail(entry.email);
    try {
      await updateUserEntry(entry.email, { status: nextStatus, blocked: nextStatus === "blocked" });
    } catch (error) {
      console.log("[RBAC] handleToggleBlock error:", error);
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleRoleChange = async (entry, role) => {
    const isOwnerRow = String(entry?.email || "").toLowerCase() === currentEmail || entry?.role === "Owner";
    if (isOwnerRow || !getRoleOptions(entry).includes(role)) return;

    setUpdatingEmail(entry.email);
    try {
      await updateUserEntry(entry.email, { role });
    } catch (error) {
      console.log("[RBAC] handleRoleChange error:", error);
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleDelete = async (entry) => {
    const isOwnerRow = String(entry?.email || "").toLowerCase() === currentEmail || entry?.role === "Owner";
    if (!canDelete || isOwnerRow) return;

    setUpdatingEmail(entry.email);
    try {
      await deleteUserEntry(entry.email);
    } catch (error) {
      console.log("[RBAC] handleDelete error:", error);
    } finally {
      setUpdatingEmail(null);
    }
  };

  const formatName = (entry) => {
    if (entry?.name) return entry.name;
    const emailPrefix = String(entry?.email || "").split("@")[0] || "user";
    return emailPrefix.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((entry) => {
    if (!normalizedSearch) return true;
    const email = String(entry?.email || "").toLowerCase();
    const fullName = formatName(entry).toLowerCase();
    return email.includes(normalizedSearch) || fullName.includes(normalizedSearch);
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily:font }}>
      <div style={{ marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
        <div>
          <h2 style={{ margin:0, fontSize:"1.4rem", fontWeight:700, color:T.textPrimary }}>{t.usersPermissions}</h2>
          <p style={{ margin:"4px 0 0", color:T.textSecondary, fontSize:"0.82rem" }}>{t.usersPermissionsDesc}</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 overflow-hidden">
          <button onClick={() => setSearchOpen((v) => { const next = !v; if (!next) setSearchTerm(""); return next; })} style={{ border:"none", background:"transparent", color:T.textSecondary, cursor:"pointer", display:"flex", padding:"4px" }}>
            <Search size={14} />
          </button>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder={t.searchUsersPlaceholder}
            className={`bg-transparent text-sm outline-none transition-all duration-300 ease-in-out ${searchOpen ? "w-56 opacity-100 px-1" : "w-0 opacity-0 px-0"}`}
            style={{ color:T.textPrimary, textAlign:isRTL ? "right" : "left" }}
          />
        </div>
      </div>

      <Card style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:`1px solid ${T.border}` }}>
              <th style={{ textAlign:"left", padding:"12px 14px", color:T.textSecondary, fontWeight:600 }}>{t.usersName}</th>
              <th style={{ textAlign:"left", padding:"12px 14px", color:T.textSecondary, fontWeight:600 }}>{t.usersEmail}</th>
              <th style={{ textAlign:"left", padding:"12px 14px", color:T.textSecondary, fontWeight:600 }}>{t.usersLastLogin}</th>
              <th style={{ textAlign:"left", padding:"12px 14px", color:T.textSecondary, fontWeight:600 }}>{t.usersRole}</th>
              <th style={{ textAlign:"left", padding:"12px 14px", color:T.textSecondary, fontWeight:600 }}>{t.usersStatus}</th>
              <th style={{ textAlign:"left", padding:"12px 14px", color:T.textSecondary, fontWeight:600 }}>{t.usersActions}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((entry, index) => {
              const isOwner = String(entry?.email || "").toLowerCase() === currentEmail || entry.role === "Owner";
              const status = String(entry.status || (entry.blocked ? "blocked" : "active")).toLowerCase();
              const blocked = status === "blocked";
              const isUpdating = updatingEmail === entry.email;
              const canUnblock = currentRole === "Owner" || currentRole === "Supervisor";
              const canRowBlock = !isOwner && ((blocked && canUnblock) || (!blocked && canBlock));
              const rowRoleOptions = getRoleOptions(entry);
              const canRowAssignRole = !isOwner && canAssignRole && rowRoleOptions.length > 0;
              const statusColorMap = { active: T.positive, blocked: T.negative, paused: T.warning, deleted: "#475569" };

              return (
                <tr key={`${entry.email}-${index}`} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:"12px 14px", color:T.textPrimary, fontWeight:600 }}>{formatName(entry)}</td>
                  <td style={{ padding:"12px 14px", color:T.textSecondary }}>{entry.email}</td>
                  <td style={{ padding:"12px 14px", color:T.textSecondary }}>{entry.lastLogin || "—"}</td>
                  <td style={{ padding:"12px 14px", color:T.textPrimary }}>{entry.role || "Member"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <Chip color={statusColorMap[status] || T.textMuted}>{status[0]?.toUpperCase() + status.slice(1)}</Chip>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    {!isOwner && (
                      <div style={{ display:"flex", gap:"8px", flexWrap:"nowrap", alignItems:"center" }}>
                        <Select
                          value={entry.role || "Member"}
                          onChange={(e) => handleRoleChange(entry, e.target.value)}
                          options={rowRoleOptions.map((role) => ({ value:role, label:role }))}
                          isRTL={isRTL}
                          disabled={!canRowAssignRole || isUpdating}
                          style={{ minWidth:"112px" }}
                        />
                        <Btn
                          size="sm"
                          disabled={!canRowBlock || isUpdating}
                          onClick={() => handleToggleBlock(entry)}
                          icon={blocked ? <Unlock size={13} /> : <Lock size={13} />}
                          style={{
                            padding:"5px 10px",
                            background: blocked ? "#16a34a" : "#f97316",
                            color:"#ffffff",
                            border:"1px solid transparent",
                            whiteSpace:"nowrap",
                          }}
                        >
                          {blocked ? t.unblock : t.block}
                        </Btn>                        
                        {canDelete && (
                          <Btn
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleDelete(entry)}
                            icon={<Trash2 size={13} />}
                            style={{
                              padding:"5px 10px",
                              background:"#dc2626",
                              color:"#ffffff",
                              border:"1px solid transparent",
                              whiteSpace:"nowrap",
                            }}
                          >
                            {t.delete}
                          </Btn>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop:"12px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px", color:T.textSecondary, fontSize:"0.8rem" }}>
        <span>{t.showingResults} {filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredUsers.length)} {t.ofLabel} {filteredUsers.length}</span>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <Btn size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>{t.previous}</Btn>
          <span>{t.pageLabel} {safePage} / {totalPages}</span>
          <Btn size="sm" variant="secondary" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>{t.next}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function MainApp() {
  const { syncError, t, isRTL, font, hasPermission, currentRole } = useApp();
  const [sessionNotice, setSessionNotice] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(POST_LOGIN_REDIRECT_TAB_KEY) || localStorage.getItem(TAB_STORAGE_KEY) || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [investmentPrefill, setInvestmentPrefill] = useState(null);
  const [transactionPrefill, setTransactionPrefill] = useState(null);
  const [txNavigationFilter, setTxNavigationFilter] = useState(null);
  const [smartBackVisible, setSmartBackVisible] = useState(false);
  const [investmentNavigationFilter, setInvestmentNavigationFilter] = useState(null);
  const [showPortfolioBackInInvestments, setShowPortfolioBackInInvestments] = useState(false);
  const mainRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    localStorage.setItem(POST_LOGIN_REDIRECT_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (localStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === "1") {
      setSessionNotice(true);
      localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      const timer = setTimeout(() => setSessionNotice(false), 4500);
      return () => clearTimeout(timer);
    }
  }, []);

  const canManageUsers = currentRole === "Owner" || hasPermission("assign_role") || hasPermission("block_user") || hasPermission("unblock_user");

  useEffect(() => {
    if (!canManageUsers && activeTab === "users") setActiveTab("dashboard");
  }, [canManageUsers, activeTab]);

  useEffect(() => {
    if (activeTab !== "investments") {
      setInvestmentPrefill(null);
      setInvestmentNavigationFilter(null);
      setShowPortfolioBackInInvestments(false);
      sessionStorage.removeItem("investments_from_portfolio_link_v1");
    }
    if (activeTab !== "transactions") {
      setTransactionPrefill(null);
      setTxNavigationFilter(null);
      setSmartBackVisible(false);
    }
  }, [activeTab]);

  const quickAddInvestment = (portfolioId) => {
    setActiveTab("investments");
    setInvestmentPrefill({ portfolioId });
  };

  const goToInvestmentsForPortfolio = (portfolio, options = {}) => {
    setInvestmentNavigationFilter({ portfolioId: portfolio.id, status: options.status || "", fromPortfolioLink:true, stamp: Date.now() });
    sessionStorage.setItem("investments_from_portfolio_link_v1", "1");
    setShowPortfolioBackInInvestments(true);
    setActiveTab("investments");
  };

  const quickAddTransaction = (inv) => {
    setActiveTab("transactions");
    setTransactionPrefill({ portfolioId: inv.portfolioId, investmentId: inv.id });
  };

  const goToTransactionsForInvestment = (inv) => {
    localStorage.setItem("investments_scroll_top", String(mainRef.current?.scrollTop || 0));
    setTxNavigationFilter({ investmentId: inv.id, portfolioId: inv.portfolioId, stamp: Date.now() });
    setSmartBackVisible(true);
    setActiveTab("transactions");
  };

  const handleSmartBack = () => {
    setActiveTab("investments");
    const saved = Number(localStorage.getItem("investments_scroll_top") || "0");
    requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = saved;
    });
    setSmartBackVisible(false);
  };

  const handlePortfolioBackFromInvestments = () => {
    setActiveTab("portfolios");
    setShowPortfolioBackInInvestments(false);
    sessionStorage.removeItem("investments_from_portfolio_link_v1");
  };

  const tabs = {
    dashboard:    <Dashboard />,
    portfolios:   <PortfoliosTab onQuickAddInvestment={quickAddInvestment} onViewInvestments={goToInvestmentsForPortfolio} />,
    investments:  <InvestmentsTab onQuickAddTransaction={quickAddTransaction} onViewTransactions={goToTransactionsForInvestment} modalPrefill={investmentPrefill} navigationFilter={investmentNavigationFilter} onModalPrefillConsumed={() => setInvestmentPrefill(null)} showPortfolioBack={showPortfolioBackInInvestments || sessionStorage.getItem("investments_from_portfolio_link_v1") === "1"} onPortfolioBack={handlePortfolioBackFromInvestments} />,
    transactions: <TransactionsTab showSmartBack={smartBackVisible} onSmartBack={handleSmartBack} navigationFilter={txNavigationFilter} modalPrefill={transactionPrefill} />,
    statistics:   <StatisticsTab />,
    users:        canManageUsers ? <UserManagementTab /> : <Dashboard />,
    settings:     <SettingsTab />,
  };

  const desktopSidebarWidth = sidebarOpen ? 220 : 72;

  return (
    <div style={{ display:"flex",height:"100vh",background:T.bgApp,fontFamily:font,overflow:"hidden" }} dir={isRTL?"rtl":"ltr"}>
      <FontLoader/>
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        html, body, #root { height: 100%; }
        body { margin: 0; overflow: hidden; }
        @media (max-width: 1100px) {
          .invest-exp-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
        }
        @media (max-width: 760px) {
          .invest-exp-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isMobile={isMobile} mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      <main ref={mainRef} style={{
        flex:1,
        overflowY:"auto",
        height:"100vh",
        marginLeft:isMobile?0:`${desktopSidebarWidth}px`,
        padding:isMobile?"16px":"32px 36px",
        maxWidth:"100%",
        display:"flex",
        flexDirection:"column"
      }}>
        {isMobile && (
          <button onClick={()=>setMobileSidebarOpen(true)} className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-slate-700 bg-white px-3 py-2 text-sm" style={{ color:"#000" }}>
            <Menu size={15}/> Menu
          </button>
        )}
        {activeTab === "transactions" && smartBackVisible && (
          <div style={{ marginBottom:"12px" }}>
            <button title={t.smartBackToInvestments} onClick={handleSmartBack} style={{ background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",cursor:"pointer",padding:"6px",display:"inline-flex",alignItems:"center",gap:"4px",color:T.textSecondary }}><Undo2 size={15}/><span style={{ fontSize:"0.78rem",fontWeight:600 }}>{t.returnLabel}</span></button>
          </div>
        )}
        {sessionNotice && (
          <div style={{ marginBottom:"16px",padding:"10px 16px",background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.35)",borderRadius:"8px",color:T.warning,fontSize:"0.8rem",display:"flex",alignItems:"center",gap:"8px" }}>
            <AlertCircle size={14}/>{t.sessionExpiredSecurity}
          </div>
        )}
        {syncError && (
          <div style={{ marginBottom:"16px",padding:"10px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"8px",color:T.negative,fontSize:"0.8rem",display:"flex",alignItems:"center",gap:"8px" }}>
            <AlertCircle size={14}/>{syncError}
          </div>
        )}
        <div style={{ flex:1 }}>{tabs[activeTab]}</div>
        <BrandingFooter text={t.footerBranding} />
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
  const { user, token, authInitialized, authLoading, dbLoading, db, t, usersConfigReady, userSyncDone } = useApp();
  if (!authInitialized || authLoading) return <LoadingScreen message={t?.loading||"LOADING..."}/>;
  if (!user?.id || !token) return <LoginPage/>;
  if (!usersConfigReady || !userSyncDone) return <LoadingScreen message={t?.loading||"LOADING..."}/>;
  if (dbLoading || !db) return <LoadingScreen message={t?.loading||"LOADING..."}/>;
  return <MainApp/>;
}

import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
