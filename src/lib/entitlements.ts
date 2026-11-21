export type PackageFeatureKey =
  | "proContent"
  | "downloads"
  | "wiki"
  | "certificate"
  | "assignments"
  | "discussion"
  | "notesFavorites";

export type PackageEntitlements = Record<PackageFeatureKey, boolean>;

export type PackageTierKind = "free" | "basic" | "pro" | "custom";

export type ModuleAccessMode = "free_only" | "limited" | "unlimited";

export type BillingCycle = "7d_trial" | "30d" | "single_item";

export interface PackageFeatureDefinition {
  key: PackageFeatureKey;
  label: string;
  shortLabel: string;
  description: string;
  defaultBenefitText: string;
}

export const PACKAGE_FEATURE_DEFINITIONS: PackageFeatureDefinition[] = [
  {
    key: "proContent",
    label: "Akses Kelas & Video Berbayar (PRO)",
    shortLabel: "Materi & Video PRO",
    description:
      "Membuka akses materi, video pelajaran, dan modul berlabel PRO sesuai batas modul paket.",
    defaultBenefitText:
      "Akses Kelas & Materi Lanjutan (Advance Courses & Section 2–3)",
  },
  {
    key: "downloads",
    label: "Download Lampiran, Template & Resource",
    shortLabel: "Download File & Template",
    description:
      "Mengizinkan unduh file PDF, Notion, ZIP, dan resource lampiran di dalam ruang belajar.",
    defaultBenefitText:
      "Download File Template & Resource Kelas (PDF, Notion, ZIP, Hook Sheet)",
  },
  {
    key: "wiki",
    label: "Direktori Wiki & SOP Agency",
    shortLabel: "Wiki & SOP",
    description:
      "Membuka tab Wiki, artikel Playbook Notion-style, dan resource SOP di Portal Siswa.",
    defaultBenefitText:
      "Direktori Wiki & SOP Agency (Kalender Konten, 120 Hook Script, SOP Meta Ads)",
  },
  {
    key: "certificate",
    label: "Klaim & Download Sertifikat Resmi HD",
    shortLabel: "Sertifikat HD",
    description:
      "Mengaktifkan tombol klaim serta unduh Sertifikat kelulusan resmi beresolusi tinggi.",
    defaultBenefitText:
      "Klaim & Download Sertifikat Resmi HD (Official Certificate PDF/PNG)",
  },
  {
    key: "assignments",
    label: "Review Tugas Praktik & Assignment Mentor",
    shortLabel: "Tugas & Review 1-on-1",
    description:
      "Membuka bab bertipe Assignment dan pengumpulan tugas praktik untuk dinilai mentor.",
    defaultBenefitText: "Review Tugas Praktik / Audit Akun 1-on-1 oleh Mentor",
  },
  {
    key: "discussion",
    label: "Tanya Jawab & Diskusi Bab dengan Mentor",
    shortLabel: "Diskusi & Q&A Mentor",
    description:
      "Mengizinkan siswa bertanya dan berdiskusi dengan mentor langsung di panel Diskusi kelas.",
    defaultBenefitText:
      "Tanya Jawab & Diskusi Bab langsung dengan Mentor (Chapter Q&A)",
  },
  {
    key: "notesFavorites",
    label: "Catatan Pribadi & Simpan Favorit",
    shortLabel: "Catatan & Favorit",
    description:
      "Mengaktifkan catatan pribadi per bab di kelas dan fitur simpan materi ke tab Favorites.",
    defaultBenefitText:
      "Fitur Catatan Pribadi & Simpan Favorit (Personal Lesson Notes & Favorites)",
  },
];

export const DEFAULT_LEARNER_PRO_FEATURES: string[] =
  PACKAGE_FEATURE_DEFINITIONS.map((f) => f.defaultBenefitText);

export const ALL_TRUE_ENTITLEMENTS: PackageEntitlements = {
  proContent: true,
  downloads: true,
  wiki: true,
  certificate: true,
  assignments: true,
  discussion: true,
  notesFavorites: true,
};

export const ALL_FALSE_ENTITLEMENTS: PackageEntitlements = {
  proContent: false,
  downloads: false,
  wiki: false,
  certificate: false,
  assignments: false,
  discussion: false,
  notesFavorites: false,
};

export interface LearnerProPackageItem {
  id: string;
  name: string;
  badge: string;
  priceLabel: string;
  periodLabel: string;
  description: string;
  ctaButtonLabel: string;
  featuresHeading: string;
  features: string[];
  highlighted?: boolean;
  qrCodeUrl?: string;
  tierKind?: PackageTierKind;
  isFreeTier?: boolean;
  monthlyPriceIdr?: number;
  enable7DayTrial?: boolean;
  trial7DaysPriceIdr?: number | null;
  entitlements?: Partial<PackageEntitlements>;
  featureLabels?: Partial<Record<PackageFeatureKey, string>>;
  extraBenefits?: string[];
  moduleAccessMode?: ModuleAccessMode;
  maxModulesPerCourse?: number;
  allowPointsUnlock?: boolean;
  defaultUnlockPointsCost?: number;
  allowPerItemPurchase?: boolean;
  defaultUnlockPriceIdr?: number;
}

export interface LearnerProPlanConfig {
  modalTitle: string;
  modalSubtitle: string;
  badgeText: string;
  planName: string;
  priceLabel: string;
  periodLabel: string;
  planSummary: string;
  featuresHeading: string;
  features: string[];
  footerNote: string;
  ctaButtonLabel: string;
  bannerBadge: string;
  bannerHeading: string;
  bannerDescription: string;
  bannerPeriodLabel: string;
  bannerCtaLabel: string;
  qrCodeUrl: string;
  merchantName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  whatsappNumber: string;
  paymentInstructions: string;
  packages?: LearnerProPackageItem[];
  packagesSchemaVersion?: number;
}

export interface LearnerUnlockedItemRecord {
  id?: string;
  itemKey: string;
  courseTitle: string;
  chapterId?: string | null;
  unlockMethod: "points" | "purchase" | "admin_grant";
  pointsSpent?: number;
  pricePaidIdr?: number;
  createdAt?: string;
}

export interface LearnerAccessState {
  activePackage: LearnerProPackageItem;
  tierKind: PackageTierKind;
  isFree: boolean;
  isBasic: boolean;
  isPro: boolean;
  isUnlimitedPro: boolean;
  entitlements: PackageEntitlements;
  canProContent: boolean;
  canDownloads: boolean;
  canWiki: boolean;
  canCertificate: boolean;
  canAssignments: boolean;
  canDiscussion: boolean;
  canNotesFavorites: boolean;
  canFavoritesPage: boolean;
  moduleAccessMode: ModuleAccessMode;
  maxModulesPerCourse: number;
  allowPointsUnlock: boolean;
  defaultUnlockPointsCost: number;
  allowPerItemPurchase: boolean;
  defaultUnlockPriceIdr: number;
  hasUsedTrial: boolean;
  billingCycle: string | null;
  unlockedItemKeys: Set<string>;
}

export interface ChapterAccessResult {
  unlocked: boolean;
  reason:
    | "free"
    | "unlocked_individually"
    | "basic_included"
    | "pro_unlimited"
    | "assignment_locked"
    | "basic_limit_reached"
    | "upgrade_required";
  chapterIndex: number;
  maxModules: number;
  canUnlockWithPoints: boolean;
  pointsCost: number;
  canBuyPerMaterial: boolean;
  priceIdr: number;
  requiredFeature?: PackageFeatureKey;
}

export interface CourseCardAccessResult {
  unlocked: boolean;
  reason: "ok" | "unlocked_individually" | "wiki_locked" | "assignment_locked" | "pro_locked";
  requiredFeature?: PackageFeatureKey;
  canUnlockWithPoints: boolean;
  pointsCost: number;
  canBuyPerMaterial: boolean;
  priceIdr: number;
}

export function buildUnlockItemKey(
  courseTitle: string,
  chapterId?: string | null
): string {
  const cleanCourse = (courseTitle || "").trim().toLowerCase();
  const cleanCh = (chapterId || "").trim();
  if (cleanCh) {
    return `chapter::${cleanCourse}::${cleanCh}`;
  }
  return `course::${cleanCourse}`;
}

export function formatIdr(amount: number): string {
  const safe = Math.max(0, Math.round(Number(amount) || 0));
  if (safe === 0) return "Gratis";
  return `Rp ${safe.toLocaleString("id-ID")}`;
}

export function parseIdrFromLabel(label?: string | null): number {
  const raw = String(label || "").trim();
  if (!raw) return 0;
  if (/gratis|free/i.test(raw) && !/\d/.test(raw)) return 0;
  const digitsOnly = raw.replace(/[^0-9]/g, "");
  if (!digitsOnly) return 0;
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function computeTrial7DaysPriceIdr(
  monthlyPriceIdr: number,
  manualOverride?: number | null
): number {
  if (
    typeof manualOverride === "number" &&
    Number.isFinite(manualOverride) &&
    manualOverride > 0
  ) {
    return Math.round(manualOverride);
  }
  const cleanMonthly = Math.max(0, Math.round(Number(monthlyPriceIdr) || 0));
  if (cleanMonthly <= 0) return 0;
  // ~1/4 of monthly price, rounded up cleanly to nearest Rp 1.000 (e.g. 150.000 -> 38.000)
  return Math.ceil(cleanMonthly / 4 / 1000) * 1000;
}

export function buildPackageBenefitLines(
  pkg: Partial<LearnerProPackageItem>
): string[] {
  const entitlements = {
    ...ALL_FALSE_ENTITLEMENTS,
    ...(pkg.entitlements || {}),
  };
  const labels = pkg.featureLabels || {};
  const lines: string[] = [];

  PACKAGE_FEATURE_DEFINITIONS.forEach((def) => {
    if (entitlements[def.key]) {
      const custom = labels[def.key]?.trim();
      lines.push(custom || def.defaultBenefitText);
    }
  });

  if (Array.isArray(pkg.extraBenefits)) {
    pkg.extraBenefits.forEach((b) => {
      const trimmed = String(b || "").trim();
      if (trimmed) lines.push(trimmed);
    });
  }

  return lines;
}

export function createDefaultTierPackages(): LearnerProPackageItem[] {
  const freePkg: LearnerProPackageItem = {
    id: "pkg-free",
    name: "FREE",
    badge: "PAKET DASAR GRATIS",
    priceLabel: "Gratis",
    periodLabel: "Selamanya",
    description:
      "Akses materi dan video gratis pengenalan sebelum upgrade. Admin dapat mengatur fitur ON/OFF paket FREE di Pengaturan.",
    ctaButtonLabel: "Paket Saat Ini",
    featuresHeading: "Fitur yang Aktif di Paket FREE",
    highlighted: false,
    qrCodeUrl: "",
    tierKind: "free",
    isFreeTier: true,
    monthlyPriceIdr: 0,
    enable7DayTrial: false,
    trial7DaysPriceIdr: null,
    entitlements: { ...ALL_FALSE_ENTITLEMENTS },
    featureLabels: {},
    extraBenefits: [],
    moduleAccessMode: "free_only",
    maxModulesPerCourse: 0,
    allowPointsUnlock: false,
    defaultUnlockPointsCost: 50,
    allowPerItemPurchase: false,
    defaultUnlockPriceIdr: 15000,
    features: [],
  };

  const basicEntitlements: PackageEntitlements = {
    proContent: true,
    downloads: true,
    wiki: true,
    certificate: false,
    assignments: false,
    discussion: true,
    notesFavorites: true,
  };

  const basicPkg: LearnerProPackageItem = {
    id: "pkg-basic",
    name: "Basic",
    badge: "BASIC ACCESS",
    priceLabel: "Rp 75.000",
    periodLabel: "/ bulan",
    description:
      "Membuka fitur tambahan plus maksimal 6 modul awal di tiap materi. Modul lanjutan bisa dibuka dengan potong Poin atau bayar per materi.",
    ctaButtonLabel: "Pilih Paket Basic",
    featuresHeading: "Fitur Termasuk di Paket Basic",
    highlighted: false,
    qrCodeUrl: "",
    tierKind: "basic",
    isFreeTier: false,
    monthlyPriceIdr: 75000,
    enable7DayTrial: true,
    trial7DaysPriceIdr: null,
    entitlements: basicEntitlements,
    featureLabels: {},
    extraBenefits: [
      "Buka maksimal 6 modul pertama pada setiap kelas (modul lanjutan via Poin atau beli satuan)",
    ],
    moduleAccessMode: "limited",
    maxModulesPerCourse: 6,
    allowPointsUnlock: true,
    defaultUnlockPointsCost: 50,
    allowPerItemPurchase: true,
    defaultUnlockPriceIdr: 15000,
    features: [],
  };
  basicPkg.features = buildPackageBenefitLines(basicPkg);

  const proPkg: LearnerProPackageItem = {
    id: "pkg-pro",
    name: "Pro",
    badge: "LEARNER PRO UNLIMITED",
    priceLabel: "Rp 150.000",
    periodLabel: "/ bulan",
    description:
      "Semua fitur FREE dan Basic ditambah akses penuh tanpa batas ke seluruh modul, Sertifikat HD, dan Review Tugas 1-on-1 bersama Mentor.",
    ctaButtonLabel: "Aktifkan Paket Pro",
    featuresHeading: "Semua 7 Fitur Premium Tanpa Batas",
    highlighted: true,
    qrCodeUrl: "",
    tierKind: "pro",
    isFreeTier: false,
    monthlyPriceIdr: 150000,
    enable7DayTrial: true,
    trial7DaysPriceIdr: null,
    entitlements: { ...ALL_TRUE_ENTITLEMENTS },
    featureLabels: {},
    extraBenefits: [
      "Seluruh modul & video lanjutan terbuka penuh 100% tanpa potongan poin",
    ],
    moduleAccessMode: "unlimited",
    maxModulesPerCourse: 999,
    allowPointsUnlock: false,
    defaultUnlockPointsCost: 0,
    allowPerItemPurchase: false,
    defaultUnlockPriceIdr: 0,
    features: [],
  };
  proPkg.features = buildPackageBenefitLines(proPkg);

  return [freePkg, basicPkg, proPkg];
}

export function normalizePackageItem(
  pkg: Partial<LearnerProPackageItem>,
  idx = 0
): LearnerProPackageItem {
  const lowerName = String(pkg.name || "").trim().toLowerCase();
  const lowerId = String(pkg.id || "").trim().toLowerCase();
  const isFree =
    Boolean(pkg.isFreeTier) ||
    pkg.tierKind === "free" ||
    lowerId === "pkg-free" ||
    lowerName === "free";

  const inferredTierKind: PackageTierKind = pkg.tierKind
    ? pkg.tierKind
    : isFree
    ? "free"
    : lowerId === "pkg-basic" || lowerName === "basic" || lowerName.includes("basic")
    ? "basic"
    : "pro";

  const defaultsForTier =
    inferredTierKind === "free"
      ? ALL_FALSE_ENTITLEMENTS
      : inferredTierKind === "basic"
      ? {
          proContent: true,
          downloads: true,
          wiki: true,
          certificate: false,
          assignments: false,
          discussion: true,
          notesFavorites: true,
        }
      : ALL_TRUE_ENTITLEMENTS;

  const entitlements: PackageEntitlements = {
    ...defaultsForTier,
    ...(pkg.entitlements || {}),
  };

  const parsedPrice = parseIdrFromLabel(pkg.priceLabel);
  const monthlyPriceIdr = isFree
    ? Math.max(0, Number(pkg.monthlyPriceIdr ?? parsedPrice ?? 0))
    : Math.max(
        0,
        Number(
          pkg.monthlyPriceIdr !== undefined
            ? pkg.monthlyPriceIdr
            : parsedPrice > 0
            ? parsedPrice
            : inferredTierKind === "basic"
            ? 75000
            : 150000
        )
      );

  const priceLabel = isFree
    ? monthlyPriceIdr > 0
      ? formatIdr(monthlyPriceIdr)
      : "Gratis"
    : monthlyPriceIdr > 0
    ? formatIdr(monthlyPriceIdr)
    : pkg.priceLabel || "Rp 150.000";

  const moduleAccessMode: ModuleAccessMode =
    pkg.moduleAccessMode ||
    (inferredTierKind === "free"
      ? entitlements.proContent
        ? "unlimited"
        : "free_only"
      : inferredTierKind === "basic"
      ? "limited"
      : "unlimited");

  const maxModulesPerCourse =
    typeof pkg.maxModulesPerCourse === "number" && pkg.maxModulesPerCourse >= 0
      ? pkg.maxModulesPerCourse
      : moduleAccessMode === "limited"
      ? 6
      : moduleAccessMode === "unlimited"
      ? 999
      : 0;

  const normalized: LearnerProPackageItem = {
    id: pkg.id || `pkg-${idx + 1}`,
    name:
      pkg.name ||
      (inferredTierKind === "free"
        ? "FREE"
        : inferredTierKind === "basic"
        ? "Basic"
        : "Pro"),
    badge:
      pkg.badge ||
      (inferredTierKind === "free"
        ? "PAKET DASAR GRATIS"
        : inferredTierKind === "basic"
        ? "BASIC ACCESS"
        : "LEARNER PRO MEMBERSHIP"),
    priceLabel,
    periodLabel:
      pkg.periodLabel || (isFree ? "Selamanya" : "/ bulan"),
    description: pkg.description || "",
    ctaButtonLabel:
      pkg.ctaButtonLabel ||
      (isFree ? "Paket Saat Ini" : `Pilih ${pkg.name || "Paket"}`),
    featuresHeading: pkg.featuresHeading || "Fitur & Benefit Paket",
    features: Array.isArray(pkg.features) ? pkg.features : [],
    highlighted: isFree ? false : Boolean(pkg.highlighted),
    qrCodeUrl: pkg.qrCodeUrl || "",
    tierKind: inferredTierKind,
    isFreeTier: isFree,
    monthlyPriceIdr,
    enable7DayTrial: isFree
      ? Boolean(pkg.enable7DayTrial)
      : pkg.enable7DayTrial !== undefined
      ? Boolean(pkg.enable7DayTrial)
      : true,
    trial7DaysPriceIdr:
      pkg.trial7DaysPriceIdr !== undefined ? pkg.trial7DaysPriceIdr : null,
    entitlements,
    featureLabels: pkg.featureLabels || {},
    extraBenefits: Array.isArray(pkg.extraBenefits) ? pkg.extraBenefits : [],
    moduleAccessMode,
    maxModulesPerCourse,
    allowPointsUnlock:
      pkg.allowPointsUnlock !== undefined
        ? Boolean(pkg.allowPointsUnlock)
        : moduleAccessMode === "limited",
    defaultUnlockPointsCost:
      typeof pkg.defaultUnlockPointsCost === "number"
        ? Math.max(0, pkg.defaultUnlockPointsCost)
        : 50,
    allowPerItemPurchase:
      pkg.allowPerItemPurchase !== undefined
        ? Boolean(pkg.allowPerItemPurchase)
        : moduleAccessMode === "limited",
    defaultUnlockPriceIdr:
      typeof pkg.defaultUnlockPriceIdr === "number"
        ? Math.max(0, pkg.defaultUnlockPriceIdr)
        : 15000,
  };

  if (normalized.features.length === 0 || pkg.entitlements !== undefined) {
    const derived = buildPackageBenefitLines(normalized);
    if (derived.length > 0 || isFree) {
      normalized.features = derived;
    }
  }

  return normalized;
}

export function normalizeProPackages(
  cfg?: Partial<LearnerProPlanConfig> | null
): LearnerProPackageItem[] {
  const defaults = createDefaultTierPackages();
  const rawList = Array.isArray(cfg?.packages) ? cfg.packages : [];

  if (rawList.length === 0) {
    // Legacy single-package config migration
    if (cfg && (cfg.planName || cfg.priceLabel)) {
      const legacyMonthly = parseIdrFromLabel(cfg.priceLabel) || 150000;
      const legacyPro = normalizePackageItem({
        id: "pkg-pro",
        name: cfg.planName || "Pro",
        badge: cfg.badgeText || "LEARNER PRO UNLIMITED",
        priceLabel: formatIdr(legacyMonthly),
        periodLabel: "/ bulan",
        description: cfg.planSummary || defaults[2].description,
        ctaButtonLabel: cfg.ctaButtonLabel || "Aktifkan Paket Pro",
        featuresHeading:
          cfg.featuresHeading || "Semua 7 Fitur Premium Tanpa Batas",
        highlighted: true,
        tierKind: "pro",
        monthlyPriceIdr: legacyMonthly,
        enable7DayTrial: true,
        entitlements: { ...ALL_TRUE_ENTITLEMENTS },
        moduleAccessMode: "unlimited",
      });
      return [defaults[0], defaults[1], legacyPro];
    }
    return defaults;
  }

  const schemaVer = Number(cfg?.packagesSchemaVersion || 0);
  if (schemaVer < 2) {
    // Migrate pre-v2 saved packages cleanly while preserving existing custom/Pro pricing & QRIS
    const hasFree = rawList.some(
      (p) =>
        Boolean(p.isFreeTier) ||
        p.tierKind === "free" ||
        String(p.name || "").trim().toLowerCase() === "free"
    );
    const hasBasic = rawList.some(
      (p) =>
        p.tierKind === "basic" ||
        String(p.name || "").trim().toLowerCase().includes("basic")
    );

    const migratedExisting = rawList.map((p, idx) =>
      normalizePackageItem(
        {
          ...p,
          tierKind:
            p.tierKind ||
            (String(p.name || "").trim().toLowerCase() === "free"
              ? "free"
              : String(p.name || "").trim().toLowerCase().includes("basic")
              ? "basic"
              : "pro"),
          entitlements: p.entitlements || ALL_TRUE_ENTITLEMENTS,
          moduleAccessMode: p.moduleAccessMode || "unlimited",
          enable7DayTrial: p.enable7DayTrial !== false,
        },
        idx
      )
    );

    const combined: LearnerProPackageItem[] = [
      ...(hasFree ? [] : [defaults[0]]),
      ...(hasBasic ? [] : [defaults[1]]),
      ...migratedExisting,
    ];
    if (!combined.some((p) => !p.isFreeTier && p.highlighted)) {
      const lastPaidIdx = combined.reduce(
        (acc, p, i) => (!p.isFreeTier ? i : acc),
        -1
      );
      if (lastPaidIdx >= 0) {
        combined[lastPaidIdx] = {
          ...combined[lastPaidIdx],
          highlighted: true,
        };
      }
    }
    return combined;
  }

  const normalized = rawList.map((p, idx) => normalizePackageItem(p, idx));
  const hasFree = normalized.some((p) => p.isFreeTier);
  const result = hasFree ? normalized : [defaults[0], ...normalized];
  if (!result.some((p) => !p.isFreeTier && p.highlighted)) {
    const firstPro =
      result.find((p) => !p.isFreeTier && p.tierKind === "pro") ||
      result.find((p) => !p.isFreeTier);
    if (firstPro) {
      firstPro.highlighted = true;
    }
  }
  return result;
}

export function resolveActiveLearnerPackage(params: {
  learnerIsPro: boolean;
  learnerPackageId?: string | null;
  learnerPackageName?: string | null;
  packages: LearnerProPackageItem[];
  isStaffSession?: boolean;
  previewTierOverride?: "auto" | "free" | "basic" | "pro";
}): LearnerProPackageItem {
  const {
    learnerIsPro,
    learnerPackageId,
    learnerPackageName,
    packages,
    isStaffSession = false,
    previewTierOverride = "auto",
  } = params;

  const list = packages.length > 0 ? packages : createDefaultTierPackages();
  const freePkg =
    list.find((p) => p.isFreeTier || p.tierKind === "free") ||
    createDefaultTierPackages()[0];
  const paidPkgs = list.filter((p) => !p.isFreeTier && p.tierKind !== "free");
  const defaultProPkg =
    paidPkgs.find((p) => p.highlighted && p.tierKind !== "basic") ||
    paidPkgs.find((p) => p.tierKind === "pro") ||
    paidPkgs.find((p) => p.highlighted) ||
    paidPkgs[paidPkgs.length - 1] ||
    freePkg;
  const basicPkg =
    paidPkgs.find((p) => p.tierKind === "basic") ||
    paidPkgs.find((p) => p.name.toLowerCase().includes("basic")) ||
    paidPkgs[0] ||
    defaultProPkg;

  if (isStaffSession && previewTierOverride !== "auto") {
    if (previewTierOverride === "free") return freePkg;
    if (previewTierOverride === "basic") return basicPkg;
    if (previewTierOverride === "pro") return defaultProPkg;
  }

  if (!learnerIsPro) {
    return freePkg;
  }

  const cleanId = String(learnerPackageId || "").trim().toLowerCase();
  if (cleanId) {
    const byId = paidPkgs.find((p) => p.id.toLowerCase() === cleanId);
    if (byId) return byId;
  }

  const rawName = String(learnerPackageName || "").trim().toLowerCase();
  if (rawName) {
    const exact = paidPkgs.find((p) => p.name.trim().toLowerCase() === rawName);
    if (exact) return exact;

    const stripped = rawName
      .replace(/\((?:trial|percobaan|7\s*hari|30\s*hari|1\s*bulan).*?\)/gi, "")
      .trim();
    if (stripped) {
      const byStripped = paidPkgs.find(
        (p) => p.name.trim().toLowerCase() === stripped
      );
      if (byStripped) return byStripped;
    }

    if (rawName.includes("basic")) {
      return basicPkg;
    }
    if (rawName.includes("free")) {
      return freePkg;
    }
  }

  return defaultProPkg;
}

export function resolveLearnerAccess(params: {
  learnerIsPro: boolean;
  learnerPackageId?: string | null;
  learnerPackageName?: string | null;
  learnerBillingCycle?: string | null;
  hasUsedTrial?: boolean;
  unlockedItems?: LearnerUnlockedItemRecord[];
  proConfig?: Partial<LearnerProPlanConfig> | null;
  showWikiPage?: boolean;
  showFavoritesPage?: boolean;
  isStaffSession?: boolean;
  previewTierOverride?: "auto" | "free" | "basic" | "pro";
}): LearnerAccessState {
  const packages = normalizeProPackages(params.proConfig);
  const effectiveIsPro =
    params.isStaffSession && params.previewTierOverride && params.previewTierOverride !== "auto"
      ? params.previewTierOverride !== "free"
      : params.learnerIsPro;

  const activePackage = resolveActiveLearnerPackage({
    learnerIsPro: effectiveIsPro,
    learnerPackageId: params.learnerPackageId,
    learnerPackageName: params.learnerPackageName,
    packages,
    isStaffSession: params.isStaffSession,
    previewTierOverride: params.previewTierOverride,
  });

  const tierKind: PackageTierKind = activePackage.isFreeTier
    ? "free"
    : activePackage.tierKind || "pro";
  const isFree = tierKind === "free";
  const isBasic = tierKind === "basic";
  const isPro = tierKind === "pro" || tierKind === "custom";

  const entitlements: PackageEntitlements = {
    ...ALL_FALSE_ENTITLEMENTS,
    ...(activePackage.entitlements || {}),
  };

  const showWikiGlobal = params.showWikiPage ?? true;
  const showFavoritesGlobal = params.showFavoritesPage ?? true;

  const moduleAccessMode: ModuleAccessMode =
    activePackage.moduleAccessMode ||
    (isFree
      ? entitlements.proContent
        ? "unlimited"
        : "free_only"
      : isBasic
      ? "limited"
      : "unlimited");

  const maxModulesPerCourse = Math.max(
    0,
    Number(
      activePackage.maxModulesPerCourse !== undefined
        ? activePackage.maxModulesPerCourse
        : moduleAccessMode === "limited"
        ? 6
        : moduleAccessMode === "unlimited"
        ? 999
        : 0
    )
  );

  const unlockedItemKeys = new Set<string>(
    (params.unlockedItems || [])
      .map((u) => String(u.itemKey || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return {
    activePackage,
    tierKind,
    isFree,
    isBasic,
    isPro,
    isUnlimitedPro:
      Boolean(entitlements.proContent) && moduleAccessMode === "unlimited",
    entitlements,
    canProContent: Boolean(entitlements.proContent),
    canDownloads: Boolean(entitlements.downloads),
    canWiki: showWikiGlobal && Boolean(entitlements.wiki),
    canCertificate: Boolean(entitlements.certificate),
    canAssignments: Boolean(entitlements.assignments),
    canDiscussion: Boolean(entitlements.discussion),
    canNotesFavorites: Boolean(entitlements.notesFavorites),
    canFavoritesPage:
      showFavoritesGlobal && Boolean(entitlements.notesFavorites),
    moduleAccessMode,
    maxModulesPerCourse,
    allowPointsUnlock: Boolean(activePackage.allowPointsUnlock),
    defaultUnlockPointsCost: Math.max(
      0,
      Number(activePackage.defaultUnlockPointsCost ?? 50)
    ),
    allowPerItemPurchase: Boolean(activePackage.allowPerItemPurchase),
    defaultUnlockPriceIdr: Math.max(
      0,
      Number(activePackage.defaultUnlockPriceIdr ?? 15000)
    ),
    hasUsedTrial: Boolean(params.hasUsedTrial),
    billingCycle: params.learnerBillingCycle || null,
    unlockedItemKeys,
  };
}

export function evaluateChapterAccess(params: {
  courseTitle: string;
  courseIsPro?: boolean;
  courseUnlockPointsCost?: number;
  courseUnlockPriceIdr?: number;
  flatVisibleChapters: Array<{
    id: string;
    type?: string;
    isPro?: boolean;
    unlockPointsCost?: number;
    unlockPriceIdr?: number;
  }>;
  chapter: {
    id: string;
    type?: string;
    isPro?: boolean;
    unlockPointsCost?: number;
    unlockPriceIdr?: number;
  };
  access: LearnerAccessState;
}): ChapterAccessResult {
  const {
    courseTitle,
    courseIsPro = false,
    courseUnlockPointsCost,
    courseUnlockPriceIdr,
    flatVisibleChapters,
    chapter,
    access,
  } = params;

  const chapterIndex = flatVisibleChapters.findIndex((c) => c.id === chapter.id);
  const maxModules = access.maxModulesPerCourse;
  const pointsCost = Math.max(
    0,
    Number(
      chapter.unlockPointsCost ??
        courseUnlockPointsCost ??
        access.defaultUnlockPointsCost ??
        50
    )
  );
  const priceIdr = Math.max(
    0,
    Number(
      chapter.unlockPriceIdr ??
        courseUnlockPriceIdr ??
        access.defaultUnlockPriceIdr ??
        15000
    )
  );

  const chapterKey = buildUnlockItemKey(courseTitle, chapter.id);
  const courseKey = buildUnlockItemKey(courseTitle, null);

  if (
    access.unlockedItemKeys.has(chapterKey) ||
    access.unlockedItemKeys.has(courseKey)
  ) {
    return {
      unlocked: true,
      reason: "unlocked_individually",
      chapterIndex,
      maxModules,
      canUnlockWithPoints: false,
      pointsCost,
      canBuyPerMaterial: false,
      priceIdr,
    };
  }

  if (chapter.type === "Assignment" && !access.canAssignments) {
    return {
      unlocked: false,
      reason: "assignment_locked",
      chapterIndex,
      maxModules,
      canUnlockWithPoints: access.allowPointsUnlock,
      pointsCost,
      canBuyPerMaterial: access.allowPerItemPurchase,
      priceIdr,
      requiredFeature: "assignments",
    };
  }

  const chapterIsProOnly =
    typeof chapter.isPro === "boolean" ? chapter.isPro : Boolean(courseIsPro);

  if (!chapterIsProOnly) {
    return {
      unlocked: true,
      reason: "free",
      chapterIndex,
      maxModules,
      canUnlockWithPoints: false,
      pointsCost,
      canBuyPerMaterial: false,
      priceIdr,
    };
  }

  if (access.canProContent) {
    if (
      access.moduleAccessMode === "unlimited" ||
      access.moduleAccessMode === "free_only"
    ) {
      return {
        unlocked: true,
        reason: "pro_unlimited",
        chapterIndex,
        maxModules,
        canUnlockWithPoints: false,
        pointsCost,
        canBuyPerMaterial: false,
        priceIdr,
      };
    }

    if (access.moduleAccessMode === "limited") {
      const cap = Math.max(1, maxModules || 6);
      if (chapterIndex >= 0 && chapterIndex < cap) {
        return {
          unlocked: true,
          reason: "basic_included",
          chapterIndex,
          maxModules: cap,
          canUnlockWithPoints: false,
          pointsCost,
          canBuyPerMaterial: false,
          priceIdr,
        };
      }
      return {
        unlocked: false,
        reason: "basic_limit_reached",
        chapterIndex,
        maxModules: cap,
        canUnlockWithPoints: access.allowPointsUnlock,
        pointsCost,
        canBuyPerMaterial: access.allowPerItemPurchase,
        priceIdr,
        requiredFeature: "proContent",
      };
    }
  }

  return {
    unlocked: false,
    reason: "upgrade_required",
    chapterIndex,
    maxModules,
    canUnlockWithPoints: access.allowPointsUnlock,
    pointsCost,
    canBuyPerMaterial: access.allowPerItemPurchase,
    priceIdr,
    requiredFeature: "proContent",
  };
}

export function evaluateCourseCardAccess(params: {
  item: {
    title: string;
    type: string;
    isPro?: boolean;
    unlockPointsCost?: number;
    unlockPriceIdr?: number;
  };
  access: LearnerAccessState;
}): CourseCardAccessResult {
  const { item, access } = params;
  const courseKey = buildUnlockItemKey(item.title, null);
  const pointsCost = Math.max(
    0,
    Number(item.unlockPointsCost ?? access.defaultUnlockPointsCost ?? 50)
  );
  const priceIdr = Math.max(
    0,
    Number(item.unlockPriceIdr ?? access.defaultUnlockPriceIdr ?? 15000)
  );

  if (access.unlockedItemKeys.has(courseKey)) {
    return {
      unlocked: true,
      reason: "unlocked_individually",
      canUnlockWithPoints: false,
      pointsCost,
      canBuyPerMaterial: false,
      priceIdr,
    };
  }

  if (item.type === "Wiki" && !access.canWiki) {
    return {
      unlocked: false,
      reason: "wiki_locked",
      requiredFeature: "wiki",
      canUnlockWithPoints: false,
      pointsCost,
      canBuyPerMaterial: false,
      priceIdr,
    };
  }

  if (item.type === "Assignment" && !access.canAssignments) {
    return {
      unlocked: false,
      reason: "assignment_locked",
      requiredFeature: "assignments",
      canUnlockWithPoints: access.allowPointsUnlock,
      pointsCost,
      canBuyPerMaterial: access.allowPerItemPurchase,
      priceIdr,
    };
  }

  if (item.isPro === true && !access.canProContent) {
    return {
      unlocked: false,
      reason: "pro_locked",
      requiredFeature: "proContent",
      canUnlockWithPoints: access.allowPointsUnlock,
      pointsCost,
      canBuyPerMaterial: access.allowPerItemPurchase,
      priceIdr,
    };
  }

  return {
    unlocked: true,
    reason: "ok",
    canUnlockWithPoints: false,
    pointsCost,
    canBuyPerMaterial: false,
    priceIdr,
  };
}
