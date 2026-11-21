"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  History,
  RotateCcw,
  Settings,
  ShieldCheck,
  Database,
  Award,
  CheckCircle2,
  Save,
  Zap,
  QrCode,
  Upload,
  Plus,
  Trash2,
  X,
  Search,
  ChevronRight,
  Sparkles,
  Copy,
  Star,
  Construction,
  Image as ImageIcon,
  Eye,
  LayoutGrid,
  Library,
  Heart,
  Home,
  BookOpen,
  Compass,
  Coins,
  Layers,
  Tag,
  Lock,
} from "lucide-react";
import {
  useRuangSosmedStore,
  DEFAULT_LEARNER_PRO_CONFIG,
  DEFAULT_MAINTENANCE_CONFIG,
  DEFAULT_LEARNER_PAGES_CONFIG,
  PACKAGE_FEATURE_DEFINITIONS,
  ALL_FALSE_ENTITLEMENTS,
  getNormalizedProPackages,
  createDefaultTierPackages,
  buildPackageBenefitLines,
  computeTrial7DaysPriceIdr,
  formatIdr,
  type LearnerProPlanConfig,
  type LearnerProPackageItem,
  type PackageFeatureKey,
  type ModuleAccessMode,
  type MaintenanceConfig,
  type LearnerPagesVisibilityConfig,
} from "@/context/RuangSosmedStore";
import { isSupabaseConfigured, STORAGE_BUCKETS } from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";

interface AdminHistoryScreenProps {
  onShowToast: (msg: string) => void;
}

export function AdminHistoryScreen({ onShowToast }: AdminHistoryScreenProps) {
  const { versions, restoreContentVersion, gradingSubmissions, reportedIssues } =
    useRuangSosmedStore();

  return (
    <div className="w-full px-4 sm:px-5 pt-5 pb-14 space-y-6">
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6] mb-1.5">
          <History size={12} />
          <span>Workspace Audit &amp; Version Snapshots</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#121215]">
          Activity History &amp; Content Version Log
        </h1>
        <p className="text-xs text-[#5E5E5E] mt-0.5">
          Review immutable curriculum snapshots, grading decisions, and issue
          resolutions across Ruang Sosmed 2.0.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Content Version Snapshots */}
        <section className="lg:col-span-7 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
          <h2 className="text-sm font-bold text-[#121215]">
            Published Content Version Snapshots ({versions.length})
          </h2>

          <div className="space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className={`rounded-xl p-4 border flex items-start justify-between gap-4 ${
                  ver.isCurrent
                    ? "bg-[#4F39F6]/5 border-[#4F39F6]/30"
                    : "bg-[#F8F9FB] border-[#EAECEF]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#FFFFFF] border border-[#EAECEF] px-2 py-0.5 text-xs font-bold text-[#4F39F6]">
                      {ver.versionTag}
                    </span>
                    <span className="text-xs font-bold text-[#121215]">
                      {ver.label}
                    </span>
                    {ver.isCurrent && (
                      <span className="rounded-md bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                        Active Version
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5E5E5E]">{ver.notes}</p>
                </div>

                {!ver.isCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      restoreContentVersion(ver.id);
                      onShowToast(`Restored workspace snapshot ${ver.versionTag}.`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#4F39F6] hover:text-white px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Right 5 Cols: Recent Grading & Issue Events */}
        <section className="lg:col-span-5 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
          <h2 className="text-sm font-bold text-[#121215]">
            Recent Grading &amp; Issue Audit Events
          </h2>

          <div className="space-y-2.5">
            {gradingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF] flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-bold text-[#121215]">{sub.title}</p>
                  <p className="text-[11px] text-[#5E5E5E]">
                    Learner: {sub.learner.name} • {sub.submittedAt}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    sub.status === "Passed"
                      ? "bg-[#10B981]/10 text-[#059669]"
                      : sub.status === "Revision Requested"
                      ? "bg-[#EF4444]/10 text-[#EF4444]"
                      : "bg-[#FEF3C7] text-[#B45309]"
                  }`}
                >
                  {sub.status}
                </span>
              </div>
            ))}

            {reportedIssues.slice(0, 3).map((iss) => (
              <div
                key={iss.id}
                className="rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF] flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-bold text-[#121215]">{iss.title}</p>
                  <p className="text-[11px] text-[#5E5E5E]">
                    Reported by {iss.reporter} • {iss.reportedAt}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    iss.status === "Resolved"
                      ? "bg-[#10B981]/10 text-[#059669]"
                      : "bg-[#EF4444]/10 text-[#EF4444]"
                  }`}
                >
                  {iss.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface AdminSettingsScreenProps {
  onShowToast: (msg: string) => void;
}

type SettingsSectionId =
  | "pro-packages"
  | "pro-modal-banner"
  | "pro-qris"
  | "learner-pages"
  | "under-construction"
  | "brand-certificate"
  | "database-sync";

function IosGroupedRow({
  label,
  hint,
  alignTop = false,
  children,
}: {
  label: string;
  hint?: string;
  alignTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-4 py-3 grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-4 ${
        alignTop ? "sm:items-start" : "sm:items-center"
      }`}
    >
      <div className="sm:col-span-4">
        <span className="block text-xs font-medium text-slate-800">
          {label}
        </span>
        {hint && (
          <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">
            {hint}
          </span>
        )}
      </div>
      <div className="sm:col-span-8">{children}</div>
    </div>
  );
}

const IOS_INPUT_CLASS =
  "w-full rounded-xl bg-slate-50/80 focus:bg-white px-3 py-2 text-xs text-slate-900 border border-slate-200/80 focus:border-[#4F39F6] focus:outline-none transition-colors";

export function AdminSettingsScreen({ onShowToast }: AdminSettingsScreenProps) {
  const {
    learnerProConfig,
    updateLearnerProConfig,
    maintenanceConfig,
    updateMaintenanceConfig,
    learnerPagesConfig,
    updateLearnerPagesConfig,
  } = useRuangSosmedStore();

  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("pro-packages");
  const [menuSearch, setMenuSearch] = useState("");

  const [workspaceName, setWorkspaceName] = useState("Ruang Sosmed 2.0");
  const [passMarkThreshold, setPassMarkThreshold] = useState(80);
  const [defaultCertificatePrefix, setDefaultCertificatePrefix] =
    useState("RS2-2026");
  const [mentorSignatory, setMentorSignatory] = useState(
    "Dinur M. Pradipta — Lead Mentor & Curriculum Director"
  );

  const [proDraft, setProDraft] = useState<LearnerProPlanConfig>(() => {
    const merged: LearnerProPlanConfig = {
      ...DEFAULT_LEARNER_PRO_CONFIG,
      ...(learnerProConfig || {}),
    };
    return {
      ...merged,
      packages: getNormalizedProPackages(merged),
    };
  });

  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    () =>
      getNormalizedProPackages(learnerProConfig)[0]?.id ||
      "pkg-creator-academy"
  );

  const [maintDraft, setMaintDraft] = useState<MaintenanceConfig>(() => ({
    ...DEFAULT_MAINTENANCE_CONFIG,
    ...(maintenanceConfig || {}),
  }));

  const [pagesDraft, setPagesDraft] = useState<LearnerPagesVisibilityConfig>(
    () => ({
      ...DEFAULT_LEARNER_PAGES_CONFIG,
      ...(learnerPagesConfig || {}),
    })
  );

  useEffect(() => {
    if (maintenanceConfig) {
      setMaintDraft({
        ...DEFAULT_MAINTENANCE_CONFIG,
        ...maintenanceConfig,
      });
    }
  }, [maintenanceConfig]);

  useEffect(() => {
    if (learnerPagesConfig) {
      setPagesDraft({
        ...DEFAULT_LEARNER_PAGES_CONFIG,
        ...learnerPagesConfig,
      });
    }
  }, [learnerPagesConfig]);

  const qrisFileInputRef = useRef<HTMLInputElement | null>(null);
  const maintFileInputRef = useRef<HTMLInputElement | null>(null);
  const pkgQrisInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (learnerProConfig) {
      const merged: LearnerProPlanConfig = {
        ...DEFAULT_LEARNER_PRO_CONFIG,
        ...learnerProConfig,
      };
      const pkgs = getNormalizedProPackages(merged);
      setProDraft({
        ...merged,
        packages: pkgs,
      });
      setSelectedPkgId((prevId) =>
        pkgs.some((p) => p.id === prevId)
          ? prevId
          : pkgs[0]?.id || "pkg-creator-academy"
      );
    }
  }, [learnerProConfig]);

  const packagesList = getNormalizedProPackages(proDraft);
  const selectedPkg =
    packagesList.find((p) => p.id === selectedPkgId) || packagesList[0];

  const syncPrimaryFields = (
    draft: LearnerProPlanConfig,
    pkgs: LearnerProPackageItem[]
  ): LearnerProPlanConfig => {
    const paidPkgs = pkgs.filter((p) => !p.isFreeTier && p.tierKind !== "free");
    const primary =
      paidPkgs.find((p) => p.highlighted) || paidPkgs[0] || pkgs[0];
    if (!primary) return { ...draft, packagesSchemaVersion: 2, packages: pkgs };
    return {
      ...draft,
      packagesSchemaVersion: 2,
      planName: primary.name,
      badgeText: primary.badge,
      priceLabel: primary.priceLabel,
      periodLabel: primary.periodLabel,
      planSummary: primary.description,
      ctaButtonLabel: primary.ctaButtonLabel,
      featuresHeading: primary.featuresHeading,
      features: primary.features,
      packages: pkgs,
    };
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const synced = syncPrimaryFields(proDraft, packagesList);
    setProDraft(synced);
    updateLearnerProConfig(synced);
    updateMaintenanceConfig(maintDraft);
    updateLearnerPagesConfig(pagesDraft);
    onShowToast(
      "Pengaturan paket (FREE / Basic / Pro), QRIS, Halaman Siswa, Under Construction (404) & studio berhasil disimpan."
    );
  };

  const handleMaintImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "maintenance",
        fileName: file.name,
        maxWidth: 1600,
        maxHeight: 1000,
        quality: 0.84,
      });
      setMaintDraft((prev) => ({ ...prev, customImageUrl: url }));
      onShowToast(
        "Desain 404 berhasil diunggah & dioptimasi. Klik Simpan Perubahan untuk menerapkan."
      );
    } catch {
      onShowToast("Gagal mengunggah gambar halaman pemeliharaan.");
    }
  };

  const updateSelectedPackage = (patch: Partial<LearnerProPackageItem>) => {
    if (!selectedPkg) return;
    setProDraft((prev) => {
      const currentPkgs = getNormalizedProPackages(prev);
      const nextPkgs = currentPkgs.map((p) => {
        if (p.id !== selectedPkg.id) return p;
        const merged: LearnerProPackageItem = { ...p, ...patch };
        if (
          patch.entitlements !== undefined ||
          patch.featureLabels !== undefined ||
          patch.extraBenefits !== undefined
        ) {
          merged.features = buildPackageBenefitLines(merged);
        }
        return merged;
      });
      return syncPrimaryFields(prev, nextPkgs);
    });
  };

  const handleTogglePkgEntitlement = (key: PackageFeatureKey) => {
    if (!selectedPkg) return;
    const currentEnt = {
      ...ALL_FALSE_ENTITLEMENTS,
      ...(selectedPkg.entitlements || {}),
    };
    const nextVal = !currentEnt[key];
    const nextEnt = { ...currentEnt, [key]: nextVal };
    const patch: Partial<LearnerProPackageItem> = { entitlements: nextEnt };
    if (key === "proContent") {
      if (nextVal && selectedPkg.moduleAccessMode === "free_only") {
        patch.moduleAccessMode = selectedPkg.isFreeTier ? "unlimited" : "limited";
      } else if (!nextVal) {
        patch.moduleAccessMode = "free_only";
      }
    }
    updateSelectedPackage(patch);
  };

  const handleReset3TierPresets = () => {
    const presets = createDefaultTierPackages();
    setProDraft((prev) => syncPrimaryFields(prev, presets));
    setSelectedPkgId(presets[1]?.id || presets[0]?.id || "pkg-basic");
    onShowToast(
      "Preset 3 paket (FREE, Basic, Pro) berhasil dipulihkan. Klik Simpan Perubahan untuk menerapkan."
    );
  };

  const handleSetPrimaryPackage = (pkgId: string) => {
    setProDraft((prev) => {
      const currentPkgs = getNormalizedProPackages(prev);
      const nextPkgs = currentPkgs.map((p) => ({
        ...p,
        highlighted: p.id === pkgId && !p.isFreeTier,
      }));
      return syncPrimaryFields(prev, nextPkgs);
    });
    onShowToast("Paket utama (default) diperbarui.");
  };

  const handleAddPackage = () => {
    const newId = `pkg-${Date.now()}`;
    const basePkg: LearnerProPackageItem = {
      id: newId,
      name: `Paket Custom ${packagesList.length}`,
      badge: "BEST VALUE",
      priceLabel: "Rp 199.000",
      periodLabel: "/ bulan",
      monthlyPriceIdr: 199000,
      enable7DayTrial: true,
      trial7DaysPriceIdr: null,
      tierKind: "custom",
      isFreeTier: false,
      description:
        "Akses penuh seluruh materi lanjutan, resource template, dan mentoring prioritas.",
      ctaButtonLabel: "Pilih Paket Ini",
      featuresHeading: "Fitur & Benefit Paket",
      entitlements: {
        proContent: true,
        downloads: true,
        wiki: true,
        certificate: true,
        assignments: true,
        discussion: true,
        notesFavorites: true,
      },
      featureLabels: {},
      extraBenefits: [],
      moduleAccessMode: "unlimited",
      maxModulesPerCourse: 999,
      allowPointsUnlock: false,
      defaultUnlockPointsCost: 50,
      allowPerItemPurchase: false,
      defaultUnlockPriceIdr: 15000,
      features: [],
      highlighted: false,
      qrCodeUrl: "",
    };
    basePkg.features = buildPackageBenefitLines(basePkg);
    setProDraft((prev) =>
      syncPrimaryFields(prev, [...getNormalizedProPackages(prev), basePkg])
    );
    setSelectedPkgId(newId);
    onShowToast(`Paket baru "${basePkg.name}" ditambahkan.`);
  };

  const handleDuplicatePackage = () => {
    if (!selectedPkg) return;
    const newId = `pkg-${Date.now()}`;
    const duplicated: LearnerProPackageItem = {
      ...selectedPkg,
      id: newId,
      name: `${selectedPkg.name} (Salinan)`,
      highlighted: false,
      isFreeTier: false,
      tierKind: selectedPkg.isFreeTier ? "custom" : selectedPkg.tierKind,
      features: [...(selectedPkg.features || [])],
      extraBenefits: [...(selectedPkg.extraBenefits || [])],
    };
    setProDraft((prev) =>
      syncPrimaryFields(prev, [...getNormalizedProPackages(prev), duplicated])
    );
    setSelectedPkgId(newId);
    onShowToast(`Paket "${selectedPkg.name}" berhasil diduplikasi.`);
  };

  const handleDeletePackage = (pkgId: string) => {
    const target = packagesList.find((p) => p.id === pkgId);
    if (target?.isFreeTier) {
      onShowToast("Paket dasar FREE tidak dapat dihapus karena dipakai member baru.");
      return;
    }
    const paidCount = packagesList.filter((p) => !p.isFreeTier).length;
    if (paidCount <= 1) {
      onShowToast("Minimal harus terdapat 1 paket berbayar aktif selain FREE.");
      return;
    }
    const remaining = packagesList.filter((p) => p.id !== pkgId);
    if (!remaining.some((p) => !p.isFreeTier && p.highlighted)) {
      const firstPaid = remaining.find((p) => !p.isFreeTier);
      if (firstPaid) firstPaid.highlighted = true;
    }
    setProDraft((prev) => syncPrimaryFields(prev, remaining));
    if (selectedPkgId === pkgId && remaining[0]) {
      setSelectedPkgId(remaining[0].id);
    }
    onShowToast("Paket dihapus dari daftar.");
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "qris",
        fileName: file.name,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.88,
      });
      setProDraft((prev) => ({
        ...prev,
        qrCodeUrl: url,
      }));
      onShowToast(
        "Gambar QRIS Global berhasil diunggah & dioptimasi. Klik Simpan Perubahan untuk menerapkan."
      );
    } catch {
      onShowToast("Gagal mengunggah gambar QRIS Global.");
    }
  };

  const handlePkgQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedPkg) return;
    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "qris",
        fileName: file.name,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.88,
      });
      updateSelectedPackage({ qrCodeUrl: url });
      onShowToast(
        `QRIS khusus untuk "${selectedPkg.name}" berhasil diunggah & dioptimasi.`
      );
    } catch {
      onShowToast("Gagal mengunggah gambar QRIS paket.");
    }
  };

  const handleUpdateExtraBenefitItem = (index: number, value: string) => {
    if (!selectedPkg) return;
    const next = [...(selectedPkg.extraBenefits || [])];
    next[index] = value;
    updateSelectedPackage({ extraBenefits: next });
  };

  const handleAddExtraBenefitItem = () => {
    if (!selectedPkg) return;
    updateSelectedPackage({
      extraBenefits: [
        ...(selectedPkg.extraBenefits || []),
        "Bonus eksklusif tambahan untuk member paket ini",
      ],
    });
  };

  const handleRemoveExtraBenefitItem = (index: number) => {
    if (!selectedPkg) return;
    updateSelectedPackage({
      extraBenefits: (selectedPkg.extraBenefits || []).filter(
        (_, i) => i !== index
      ),
    });
  };

  const menuGroups: {
    groupTitle: string;
    items: {
      id: SettingsSectionId;
      label: string;
      subtitle: string;
      detail: string;
      iconBg: string;
      icon: React.ComponentType<{ size?: number }>;
    }[];
  }[] = [
    {
      groupTitle: "Upgrade Learner PRO & Paket",
      items: [
        {
          id: "pro-packages",
          label: "Kelola Paket & Benefit",
          subtitle:
            "Tambah paket upgrade baru, atur harga, deskripsi, QRIS khusus, dan daftar benefit tiap paket.",
          detail: `${packagesList.length} paket`,
          iconBg: "bg-amber-500 text-white",
          icon: Zap,
        },
        {
          id: "pro-modal-banner",
          label: "Modal & Banner Siswa",
          subtitle:
            "Atur judul modal upgrade dan kartu penawaran PRO Pass di dashboard siswa.",
          detail: "Teks & Banner",
          iconBg: "bg-indigo-500 text-white",
          icon: Sparkles,
        },
        {
          id: "pro-qris",
          label: "QRIS & Rekening Bayar",
          subtitle:
            "Upload QRIS global, atur rekening bank alternatif, WhatsApp konfirmasi, dan instruksi bayar.",
          detail: proDraft.qrCodeUrl ? "Aktif" : "Upload QR",
          iconBg: "bg-emerald-500 text-white",
          icon: QrCode,
        },
      ],
    },
    {
      groupTitle: "Workspace & Sistem",
      items: [
        {
          id: "learner-pages",
          label: "Halaman & Menu Siswa",
          subtitle:
            "Aktifkan atau nonaktifkan halaman Wiki dan Favorites pada Portal Belajar Siswa.",
          detail:
            (pagesDraft.showWikiPage ? 1 : 0) +
              (pagesDraft.showFavoritesPage ? 1 : 0) ===
            0
              ? "Nonaktif"
              : `${
                  (pagesDraft.showWikiPage ? 1 : 0) +
                  (pagesDraft.showFavoritesPage ? 1 : 0)
                }/2 Aktif`,
          iconBg: "bg-violet-600 text-white",
          icon: LayoutGrid,
        },
        {
          id: "under-construction",
          label: "Web Under Construction (404)",
          subtitle:
            "Aktifkan halaman 404 sementara untuk pengunjung publik & upload desain manual.",
          detail: maintDraft.enabled ? "Aktif" : "Nonaktif",
          iconBg: maintDraft.enabled
            ? "bg-amber-500 text-white"
            : "bg-slate-400 text-white",
          icon: Construction,
        },
        {
          id: "brand-certificate",
          label: "Brand & Sertifikat",
          subtitle:
            "Atur nama brand aplikasi, prefix nomor sertifikat, nilai lulus, dan penanda tangan.",
          detail: defaultCertificatePrefix || "RS2-2026",
          iconBg: "bg-blue-500 text-white",
          icon: Award,
        },
        {
          id: "database-sync",
          label: "Database & Sinkronisasi",
          subtitle:
            "Pantau status koneksi Supabase, penyimpanan lokal, dan keamanan RLS.",
          detail: isSupabaseConfigured ? "Online" : "Lokal",
          iconBg: "bg-teal-600 text-white",
          icon: Database,
        },
      ],
    },
  ];

  const allItems = menuGroups.flatMap((g) => g.items);
  const currentMeta =
    allItems.find((i) => i.id === activeSection) || allItems[0];
  const CurrentSectionIcon = currentMeta.icon;

  const q = menuSearch.trim().toLowerCase();
  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !q ||
          item.label.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          group.groupTitle.toLowerCase().includes(q)
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="w-full px-4 sm:px-6 pt-5 pb-14">
      <form
        onSubmit={handleSaveAll}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* LEFT COLUMN (3 cols): Full-Width iOS-Style Settings Sidebar */}
        <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-16">
          <div className="space-y-3 px-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Pengaturan
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                <Settings size={11} />
                Studio
              </span>
            </div>

            {/* iOS Search Pill */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={menuSearch || ""}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Cari pengaturan..."
                className="w-full rounded-xl bg-slate-200/60 focus:bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-[#4F39F6] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 text-center text-xs text-slate-500">
              Tidak ada menu pengaturan yang cocok.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.groupTitle}
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeSection;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[#4F39F6] text-white"
                            : "bg-white text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isActive
                                ? "bg-white/20 text-white"
                                : item.iconBg
                            }`}
                          >
                            <Icon size={15} />
                          </span>
                          <span className="text-[13px] font-medium truncate">
                            {item.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[11px] font-medium truncate max-w-[90px] ${
                              isActive ? "text-indigo-100" : "text-slate-400"
                            }`}
                          >
                            {item.detail}
                          </span>
                          <ChevronRight
                            size={15}
                            className={
                              isActive ? "text-white/80" : "text-slate-300"
                            }
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* RIGHT COLUMN (9 cols): Full-Width Active Detail Panel */}
        <section className="lg:col-span-9 space-y-5">
          {/* Detail Top Header Card */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${currentMeta.iconBg}`}
              >
                <CurrentSectionIcon size={20} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {currentMeta.label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentMeta.subtitle}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Save size={13} />
              <span>Simpan Perubahan</span>
            </button>
          </div>

          {/* SECTION 1: KELOLA PAKET & BENEFIT */}
          {activeSection === "pro-packages" && selectedPkg && (() => {
            const activeEnt = {
              ...ALL_FALSE_ENTITLEMENTS,
              ...(selectedPkg.entitlements || {}),
            };
            const enabledFeatureCount = PACKAGE_FEATURE_DEFINITIONS.filter(
              (f) => activeEnt[f.key]
            ).length;
            const monthlyNumeric = Math.max(
              0,
              Number(selectedPkg.monthlyPriceIdr ?? 0)
            );
            const autoTrialPrice = computeTrial7DaysPriceIdr(
              monthlyNumeric,
              selectedPkg.trial7DaysPriceIdr
            );
            const modMode: ModuleAccessMode =
              selectedPkg.moduleAccessMode ||
              (selectedPkg.isFreeTier
                ? "free_only"
                : selectedPkg.tierKind === "basic"
                ? "limited"
                : "unlimited");

            return (
              <div className="space-y-5">
                {/* Bar Daftar Paket */}
                <div className="space-y-1.5">
                  <div className="px-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Daftar Paket Membership ({packagesList.length})
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReset3TierPresets}
                        className="inline-flex items-center gap-1 rounded-xl bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Reset Preset FREE / Basic / Pro</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDuplicatePackage}
                        className="inline-flex items-center gap-1 rounded-xl bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>Duplikat Paket</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPackage}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Tambah Paket Baru</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/80 p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {packagesList.map((pkg) => {
                      const isSelectedPkg = pkg.id === selectedPkg.id;
                      const pkgEnt = {
                        ...ALL_FALSE_ENTITLEMENTS,
                        ...(pkg.entitlements || {}),
                      };
                      const onCount = PACKAGE_FEATURE_DEFINITIONS.filter(
                        (f) => pkgEnt[f.key]
                      ).length;
                      const pkgTrialIdr = computeTrial7DaysPriceIdr(
                        Number(pkg.monthlyPriceIdr ?? 0),
                        pkg.trial7DaysPriceIdr
                      );
                      const modBadge =
                        pkg.moduleAccessMode === "unlimited"
                          ? "Unlimited Modul"
                          : pkg.moduleAccessMode === "limited"
                          ? `Maks. ${pkg.maxModulesPerCourse || 6} modul/materi`
                          : "Hanya Bab Gratis";

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPkgId(pkg.id)}
                          className={`group rounded-xl p-3.5 border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                            isSelectedPkg
                              ? "bg-indigo-50/70 border-[#4F39F6] ring-1 ring-[#4F39F6]"
                              : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {pkg.name || "Paket Tanpa Nama"}
                              </span>
                              {pkg.isFreeTier && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 shrink-0">
                                  Gratis Dasar
                                </span>
                              )}
                              {pkg.tierKind === "basic" && (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 shrink-0">
                                  Basic
                                </span>
                              )}
                              {pkg.highlighted && !pkg.isFreeTier && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                                  Utama
                                </span>
                              )}
                            </div>

                            <p className="text-sm font-extrabold text-[#4F39F6]">
                              {pkg.isFreeTier ? "Gratis" : pkg.priceLabel}{" "}
                              <span className="text-[11px] font-medium text-slate-500">
                                {pkg.isFreeTier ? "Selamanya" : pkg.periodLabel}
                              </span>
                            </p>

                            {!pkg.isFreeTier && pkg.enable7DayTrial !== false && pkgTrialIdr > 0 && (
                              <p className="text-[11px] font-semibold text-emerald-700">
                                Trial 7 hr (1×): {formatIdr(pkgTrialIdr)}
                              </p>
                            )}

                            <p className="text-[11px] text-slate-500">
                              {onCount}/7 fitur ON • {modBadge}
                            </p>
                          </div>

                          {!pkg.isFreeTier && packagesList.filter((p) => !p.isFreeTier).length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePackage(pkg.id);
                              }}
                              title="Hapus paket ini"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detail Paket Terpilih */}
                <div className="space-y-1.5">
                  <div className="px-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Detail Paket: {selectedPkg.name}
                    </p>
                    {!selectedPkg.isFreeTier && !selectedPkg.highlighted && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPackage(selectedPkg.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                      >
                        <Star size={12} />
                        <span>Jadikan Paket Utama (Default)</span>
                      </button>
                    )}
                  </div>

                  {selectedPkg.isFreeTier && (
                    <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 text-xs text-sky-900">
                      <strong>Paket Dasar FREE</strong> otomatis aktif untuk semua member baru sebelum berlangganan Basic atau Pro. Aktifkan/matikan fitur di bawah sesuai kebijakan FREE tier Anda.
                    </div>
                  )}

                  <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                    <IosGroupedRow label="Nama Paket">
                      <input
                        type="text"
                        value={selectedPkg.name || ""}
                        onChange={(e) =>
                          updateSelectedPackage({ name: e.target.value })
                        }
                        className={`${IOS_INPUT_CLASS} font-semibold`}
                      />
                    </IosGroupedRow>

                    {!selectedPkg.isFreeTier && (
                      <>
                        <IosGroupedRow
                          label="Harga Bulanan (30 Hari)"
                          hint="Masukkan angka dalam Rupiah; harga Trial 7 hari otomatis dihitung ~1/4 bulanan"
                          alignTop
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Rp</span>
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={monthlyNumeric}
                                onChange={(e) => {
                                  const nextVal = Math.max(
                                    0,
                                    Math.round(Number(e.target.value) || 0)
                                  );
                                  updateSelectedPackage({
                                    monthlyPriceIdr: nextVal,
                                    priceLabel: formatIdr(nextVal),
                                    periodLabel: selectedPkg.periodLabel || "/ bulan",
                                  });
                                }}
                                placeholder="150000"
                                className={`${IOS_INPUT_CLASS} font-bold max-w-[200px]`}
                              />
                              <span className="text-xs font-semibold text-slate-600">
                                ({formatIdr(monthlyNumeric)} / 30 hari)
                              </span>
                            </div>

                            {selectedPkg.enable7DayTrial !== false && (
                              <div className="rounded-xl bg-emerald-50 border border-emerald-200/90 px-3 py-2 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                                <span>
                                  ⚡ Harga Trial 7 Hari (1× pakai) menyesuaikan otomatis (~1/4 bulan):{" "}
                                  <strong className="text-emerald-700">
                                    {formatIdr(autoTrialPrice)} / 7 hari
                                  </strong>
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-700">
                                  Khusus member baru
                                </span>
                              </div>
                            )}
                          </div>
                        </IosGroupedRow>

                        <IosGroupedRow
                          label="Percobaan 7 Hari (1× Pakai)"
                          hint="Hanya muncul sekali untuk member baru; setelah dipakai pilihan aktif tinggal 30 hari"
                          alignTop
                        >
                          <div className="space-y-2.5">
                            <label className="inline-flex items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPkg.enable7DayTrial !== false}
                                onChange={(e) =>
                                  updateSelectedPackage({
                                    enable7DayTrial: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#4F39F6] focus:ring-[#4F39F6]"
                              />
                              <span className="text-xs font-semibold text-slate-800">
                                Aktifkan pilihan langganan Trial 7 Hari (1× pakai per akun)
                              </span>
                            </label>

                            {selectedPkg.enable7DayTrial !== false && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-slate-500">
                                  Override Harga 7 Hari (Opsional): Rp
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={
                                    selectedPkg.trial7DaysPriceIdr ?? ""
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value.trim();
                                    updateSelectedPackage({
                                      trial7DaysPriceIdr:
                                        raw === ""
                                          ? null
                                          : Math.max(0, Math.round(Number(raw) || 0)),
                                    });
                                  }}
                                  placeholder={`Auto (${formatIdr(computeTrial7DaysPriceIdr(monthlyNumeric, null))})`}
                                  className={`${IOS_INPUT_CLASS} max-w-[200px]`}
                                />
                              </div>
                            )}
                          </div>
                        </IosGroupedRow>
                      </>
                    )}

                    <IosGroupedRow label="Badge Paket">
                      <input
                        type="text"
                        value={selectedPkg.badge || ""}
                        onChange={(e) =>
                          updateSelectedPackage({ badge: e.target.value })
                        }
                        className={IOS_INPUT_CLASS}
                      />
                    </IosGroupedRow>

                    <IosGroupedRow label="Deskripsi / Keterangan Paket" alignTop>
                      <textarea
                        rows={2}
                        value={selectedPkg.description || ""}
                        onChange={(e) =>
                          updateSelectedPackage({ description: e.target.value })
                        }
                        className={IOS_INPUT_CLASS}
                      />
                    </IosGroupedRow>

                    <IosGroupedRow
                      label="Teks Tombol Pilih Paket"
                      hint="Teks tombol pada modal pilihan paket siswa"
                    >
                      <input
                        type="text"
                        value={selectedPkg.ctaButtonLabel || ""}
                        onChange={(e) =>
                          updateSelectedPackage({
                            ctaButtonLabel: e.target.value,
                          })
                        }
                        className={`${IOS_INPUT_CLASS} font-semibold`}
                      />
                    </IosGroupedRow>

                    {!selectedPkg.isFreeTier && (
                      <>
                        <IosGroupedRow
                          label="Paket Utama (Default)"
                          hint="Dipilih otomatis saat modal upgrade dibuka"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-600">
                              {selectedPkg.highlighted
                                ? "Ya, paket ini menjadi paket utama (Pro Pass)"
                                : "Bukan paket utama"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPackage(selectedPkg.id)}
                              disabled={selectedPkg.highlighted}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                                selectedPkg.highlighted
                                  ? "bg-amber-100 text-amber-800 cursor-default"
                                  : "bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 cursor-pointer"
                              }`}
                            >
                              {selectedPkg.highlighted
                                ? "Paket Utama Aktif"
                                : "Jadikan Utama"}
                            </button>
                          </div>
                        </IosGroupedRow>

                        <IosGroupedRow
                          label="QRIS Khusus Paket (Opsional)"
                          hint="Kosongkan untuk memakai QRIS Global"
                          alignTop
                        >
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              {selectedPkg.qrCodeUrl && (
                                <div className="relative inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={selectedPkg.qrCodeUrl}
                                    alt={`QRIS ${selectedPkg.name}`}
                                    className="h-20 w-20 object-contain rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSelectedPackage({ qrCodeUrl: "" })
                                    }
                                    title="Hapus QRIS khusus paket"
                                    className="absolute -top-2 -right-2 p-0.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-rose-600 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}

                              <input
                                key={`pkg-qris-${selectedPkg.id}`}
                                ref={pkgQrisInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePkgQrisUpload}
                                className="hidden"
                              />

                              <button
                                type="button"
                                onClick={() => pkgQrisInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                              >
                                <Upload size={12} />
                                <span>
                                  {selectedPkg.qrCodeUrl
                                    ? "Ganti QRIS Paket"
                                    : "Upload QRIS Paket"}
                                </span>
                              </button>
                            </div>

                            <input
                              type="text"
                              value={selectedPkg.qrCodeUrl || ""}
                              onChange={(e) =>
                                updateSelectedPackage({ qrCodeUrl: e.target.value })
                              }
                              placeholder="Atau URL QRIS khusus paket ini (kosong = pakai QRIS Global)"
                              className={IOS_INPUT_CLASS}
                            />
                          </div>
                        </IosGroupedRow>
                      </>
                    )}
                  </div>
                </div>

                {/* Aturan Akses Modul per Materi (Khusus Basic / Pembatasan Bab + Poin / Harga Satuan) */}
                <div className="space-y-1.5">
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Aturan Pembatasan Modul &amp; Cara Buka Lanjutan ({selectedPkg.name})
                  </p>
                  <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                    <IosGroupedRow
                      label="Mode Akses Modul"
                      hint="Misal Basic hanya buka 6 dari 10 modul per materi"
                      alignTop
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          {
                            id: "free_only" as ModuleAccessMode,
                            title: "Hanya Bab Gratis",
                            desc: "Modul PRO terkunci",
                            icon: Lock,
                          },
                          {
                            id: "limited" as ModuleAccessMode,
                            title: "Batasi Jumlah Modul",
                            desc: "Contoh: Maks 6 modul",
                            icon: Layers,
                          },
                          {
                            id: "unlimited" as ModuleAccessMode,
                            title: "Semua Modul Unlimited",
                            desc: "Tanpa batas modul",
                            icon: Zap,
                          },
                        ].map((opt) => {
                          const Icon = opt.icon;
                          const isSelectedMode = modMode === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                const patch: Partial<LearnerProPackageItem> = {
                                  moduleAccessMode: opt.id,
                                };
                                if (opt.id !== "free_only") {
                                  patch.entitlements = {
                                    ...activeEnt,
                                    proContent: true,
                                  };
                                  if (opt.id === "limited" && !selectedPkg.maxModulesPerCourse) {
                                    patch.maxModulesPerCourse = 6;
                                  }
                                }
                                updateSelectedPackage(patch);
                              }}
                              className={`flex items-start gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                                isSelectedMode
                                  ? "bg-indigo-50 border-[#4F39F6] text-[#4F39F6]"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <Icon size={14} className="mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-bold leading-tight">
                                  {opt.title}
                                </p>
                                <p className="text-[10px] opacity-80 mt-0.5">
                                  {opt.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </IosGroupedRow>

                    {modMode === "limited" && (
                      <IosGroupedRow
                        label="Maks. Modul Terbuka / Materi"
                        hint="Contoh: isi 6 agar dari 10 modul hanya modul 1–6 terbuka; modul 7–10 terkunci"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={selectedPkg.maxModulesPerCourse ?? 6}
                            onChange={(e) =>
                              updateSelectedPackage({
                                maxModulesPerCourse: Math.max(
                                  1,
                                  Math.round(Number(e.target.value) || 6)
                                ),
                              })
                            }
                            className={`${IOS_INPUT_CLASS} max-w-[120px] font-bold`}
                          />
                          <span className="text-xs text-slate-600">
                            modul pertama terbuka per kelas
                          </span>
                        </div>
                      </IosGroupedRow>
                    )}

                    {modMode !== "unlimited" && (
                      <>
                        <IosGroupedRow
                          label="Buka dengan Potong Poin"
                          hint="Siswa bisa menukar poin bintang untuk membuka modul terkunci"
                          alignTop
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(selectedPkg.allowPointsUnlock)}
                                onChange={(e) =>
                                  updateSelectedPackage({
                                    allowPointsUnlock: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#4F39F6]"
                              />
                              <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1">
                                <Coins size={13} className="text-amber-500" />
                                Izinkan Buka Modul Lanjutan Pakai Poin
                              </span>
                            </label>

                            {selectedPkg.allowPointsUnlock && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500">
                                  Biaya Default:
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={selectedPkg.defaultUnlockPointsCost ?? 50}
                                  onChange={(e) =>
                                    updateSelectedPackage({
                                      defaultUnlockPointsCost: Math.max(
                                        1,
                                        Math.round(Number(e.target.value) || 50)
                                      ),
                                    })
                                  }
                                  className={`${IOS_INPUT_CLASS} max-w-[95px] font-bold`}
                                />
                                <span className="text-xs font-bold text-amber-700">
                                  pts / modul
                                </span>
                              </div>
                            )}
                          </div>
                        </IosGroupedRow>

                        <IosGroupedRow
                          label="Bayar Harga per Materi"
                          hint="Siswa bisa membeli satuan modul/materi lanjutan tanpa upgrade paket penuh"
                          alignTop
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(selectedPkg.allowPerItemPurchase)}
                                onChange={(e) =>
                                  updateSelectedPackage({
                                    allowPerItemPurchase: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#4F39F6]"
                              />
                              <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1">
                                <Tag size={13} className="text-emerald-600" />
                                Izinkan Beli Satuan per Materi/Modul
                              </span>
                            </label>

                            {selectedPkg.allowPerItemPurchase && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500">
                                  Harga Default: Rp
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={selectedPkg.defaultUnlockPriceIdr ?? 15000}
                                  onChange={(e) =>
                                    updateSelectedPackage({
                                      defaultUnlockPriceIdr: Math.max(
                                        0,
                                        Math.round(Number(e.target.value) || 0)
                                      ),
                                    })
                                  }
                                  className={`${IOS_INPUT_CLASS} max-w-[130px] font-bold`}
                                />
                              </div>
                            )}
                          </div>
                        </IosGroupedRow>
                      </>
                    )}
                  </div>
                </div>

                {/* Matriks Fitur Aplikasi ON/OFF (7 Core Real App Capabilities) */}
                <div className="space-y-1.5">
                  <div className="px-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Fitur Aplikasi Aktif (ON / OFF) untuk &ldquo;{selectedPkg.name}&rdquo; ({enabledFeatureCount}/7 Aktif)
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedPackage({
                            entitlements: {
                              proContent: true,
                              downloads: true,
                              wiki: true,
                              certificate: true,
                              assignments: true,
                              discussion: true,
                              notesFavorites: true,
                            },
                            moduleAccessMode: "unlimited",
                          })
                        }
                        className="rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 cursor-pointer"
                      >
                        Nyalakan Semua (7/7)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedPackage({
                            entitlements: { ...ALL_FALSE_ENTITLEMENTS },
                            moduleAccessMode: "free_only",
                          })
                        }
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 cursor-pointer"
                      >
                        Matikan Semua (0/7)
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                    <IosGroupedRow label="Judul Daftar Benefit">
                      <input
                        type="text"
                        value={selectedPkg.featuresHeading || ""}
                        onChange={(e) =>
                          updateSelectedPackage({
                            featuresHeading: e.target.value,
                          })
                        }
                        className={IOS_INPUT_CLASS}
                      />
                    </IosGroupedRow>

                    {PACKAGE_FEATURE_DEFINITIONS.map((def, idx) => {
                      const isEnabled = Boolean(activeEnt[def.key]);
                      const customText =
                        selectedPkg.featureLabels?.[def.key] ??
                        def.defaultBenefitText;

                      return (
                        <div
                          key={`${selectedPkg.id}-ent-${def.key}`}
                          className={`px-4 py-3.5 transition-colors space-y-2 ${
                            isEnabled ? "bg-white" : "bg-slate-50/70"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                                  isEnabled
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-900">
                                    {def.label}
                                  </p>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                      isEnabled
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {isEnabled ? "ON" : "OFF"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {def.description}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              aria-label={`Toggle ${def.label}`}
                              onClick={() => handleTogglePkgEntitlement(def.key)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                                isEnabled ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  isEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="pl-9">
                            <input
                              type="text"
                              value={customText}
                              onChange={(e) =>
                                updateSelectedPackage({
                                  featureLabels: {
                                    ...(selectedPkg.featureLabels || {}),
                                    [def.key]: e.target.value,
                                  },
                                })
                              }
                              placeholder={def.defaultBenefitText}
                              className={`${IOS_INPUT_CLASS} text-[11px] ${
                                isEnabled ? "" : "opacity-60"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Benefit Bonus Tambahan (Opsional) */}
                    <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
                      <span className="text-xs font-medium text-slate-600">
                        Benefit Teks Bonus Tambahan ({(selectedPkg.extraBenefits || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddExtraBenefitItem}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Tambah Teks Bonus</span>
                      </button>
                    </div>

                    {(selectedPkg.extraBenefits || []).map((feat, idx) => (
                      <div
                        key={`${selectedPkg.id}-extra-${idx}`}
                        className="px-4 py-2.5 flex items-center gap-2.5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-[#4F39F6]">
                          +
                        </span>
                        <input
                          type="text"
                          value={feat || ""}
                          onChange={(e) =>
                            handleUpdateExtraBenefitItem(idx, e.target.value)
                          }
                          className={IOS_INPUT_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraBenefitItem(idx)}
                          title="Hapus teks bonus"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SECTION 2: PENGATURAN MODAL & BANNER */}
          {activeSection === "pro-modal-banner" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Header &amp; Footer Modal Upgrade
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  <IosGroupedRow label="Judul Modal">
                    <input
                      type="text"
                      value={proDraft.modalTitle || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          modalTitle: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Subjudul Modal">
                    <input
                      type="text"
                      value={proDraft.modalSubtitle || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          modalSubtitle: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Catatan Kaki Modal">
                    <input
                      type="text"
                      value={proDraft.footerNote || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          footerNote: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Kartu Penawaran Sidebar Siswa (PRO Pass)
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  <IosGroupedRow label="Badge Banner">
                    <input
                      type="text"
                      value={proDraft.bannerBadge || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          bannerBadge: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Judul Banner">
                    <input
                      type="text"
                      value={proDraft.bannerHeading || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          bannerHeading: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Periode Harga Banner">
                    <input
                      type="text"
                      value={proDraft.bannerPeriodLabel || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          bannerPeriodLabel: e.target.value,
                        }))
                      }
                      placeholder="/ bulan"
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Teks Tombol Banner">
                    <input
                      type="text"
                      value={proDraft.bannerCtaLabel || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          bannerCtaLabel: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Deskripsi Banner" alignTop>
                    <textarea
                      rows={3}
                      value={proDraft.bannerDescription || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          bannerDescription: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: QRIS & REKENING PEMBAYARAN */}
          {activeSection === "pro-qris" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Kode QRIS Pembayaran
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  <IosGroupedRow label="Gambar QR Code QRIS" alignTop hint="Ditampilkan saat siswa klik Upgrade PRO">
                    <div className="space-y-3">
                      {proDraft.qrCodeUrl ? (
                        <div className="relative inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proDraft.qrCodeUrl}
                            alt="QRIS Learner PRO"
                            className="h-44 w-44 object-contain rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setProDraft((p) => ({ ...p, qrCodeUrl: "" }))
                            }
                            title="Hapus gambar QRIS"
                            className="absolute -top-2 -right-2 p-1 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-rose-600 shadow-xs cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => qrisFileInputRef.current?.click()}
                          className="rounded-xl border-2 border-dashed border-slate-200 hover:border-[#4F39F6] bg-slate-50/70 p-5 text-center space-y-1.5 cursor-pointer transition-colors"
                        >
                          <QrCode size={24} className="mx-auto text-slate-400" />
                          <p className="text-xs font-semibold text-slate-700">
                            Belum ada gambar QRIS diunggah
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Klik untuk memilih file QRIS (PNG/JPG)
                          </p>
                        </div>
                      )}

                      <input
                        key="pro-qris-file-input"
                        ref={qrisFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleQrisUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => qrisFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>
                          {proDraft.qrCodeUrl
                            ? "Ganti Gambar QRIS"
                            : "Upload Gambar QRIS"}
                        </span>
                      </button>
                    </div>
                  </IosGroupedRow>

                  <IosGroupedRow label="URL Gambar QRIS" hint="Opsional jika memakai link eksternal">
                    <input
                      type="text"
                      value={proDraft.qrCodeUrl || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          qrCodeUrl: e.target.value,
                        }))
                      }
                      placeholder="https://..."
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Nama Merchant QRIS">
                    <input
                      type="text"
                      value={proDraft.merchantName || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          merchantName: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Rekening Bank &amp; Konfirmasi WhatsApp
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  <IosGroupedRow label="No. WhatsApp Konfirmasi" hint="Gunakan awalan 62...">
                    <input
                      type="text"
                      value={proDraft.whatsappNumber || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          whatsappNumber: e.target.value,
                        }))
                      }
                      placeholder="6281234567890"
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Nama Bank Alternatif">
                    <input
                      type="text"
                      value={proDraft.bankName || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({ ...p, bankName: e.target.value }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Nomor Rekening">
                    <input
                      type="text"
                      value={proDraft.accountNumber || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          accountNumber: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Atas Nama Rekening">
                    <input
                      type="text"
                      value={proDraft.accountHolder || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          accountHolder: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Instruksi Pembayaran" alignTop>
                    <textarea
                      rows={3}
                      value={proDraft.paymentInstructions || ""}
                      onChange={(e) =>
                        setProDraft((p) => ({
                          ...p,
                          paymentInstructions: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4A: HALAMAN & MENU SISWA (WIKI & FAVORITES CHECKBOXES) */}
          {activeSection === "learner-pages" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Visibilitas Halaman di Learner Portal
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  {/* Checkbox 1: Halaman Wiki */}
                  <label className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          pagesDraft.showWikiPage
                            ? "bg-violet-50 border-violet-200 text-violet-600"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}
                      >
                        <Library size={17} />
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            Aktifkan Halaman Wiki di Portal Siswa
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              pagesDraft.showWikiPage
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {pagesDraft.showWikiPage ? "Aktif" : "Disembunyikan"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Jika centang dimatikan, menu tab <strong>Wiki</strong>{" "}
                          dan seluruh artikel/direktori Wiki tidak akan muncul
                          sama sekali di halaman Learners (Home, My Learning,
                          Catalog, Folder, maupun Pencarian).
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 shrink-0 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pagesDraft.showWikiPage}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          const nextCfg = {
                            ...pagesDraft,
                            showWikiPage: nextVal,
                          };
                          setPagesDraft(nextCfg);
                          updateLearnerPagesConfig({ showWikiPage: nextVal });
                          onShowToast(
                            nextVal
                              ? "Halaman Wiki di Learner Portal diaktifkan."
                              : "Halaman & seluruh materi Wiki disembunyikan dari Learner Portal."
                          );
                        }}
                        aria-label="Aktifkan Halaman Wiki di Portal Siswa"
                        className="h-5 w-5 rounded border-slate-300 text-[#4F39F6] accent-[#4F39F6] cursor-pointer"
                      />
                    </div>
                  </label>

                  {/* Checkbox 2: Halaman Favorites */}
                  <label className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          pagesDraft.showFavoritesPage
                            ? "bg-pink-50 border-pink-200 text-pink-600"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}
                      >
                        <Heart size={17} />
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            Aktifkan Halaman Favorites di Portal Siswa
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              pagesDraft.showFavoritesPage
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {pagesDraft.showFavoritesPage
                              ? "Aktif"
                              : "Disembunyikan"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Jika centang dimatikan, menu tab{" "}
                          <strong>Favorites</strong> dan tombol hati simpan
                          favorit tidak akan muncul di seluruh halaman
                          Learners.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 shrink-0 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pagesDraft.showFavoritesPage}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          const nextCfg = {
                            ...pagesDraft,
                            showFavoritesPage: nextVal,
                          };
                          setPagesDraft(nextCfg);
                          updateLearnerPagesConfig({
                            showFavoritesPage: nextVal,
                          });
                          onShowToast(
                            nextVal
                              ? "Halaman Favorites di Learner Portal diaktifkan."
                              : "Halaman & tombol Favorites disembunyikan dari Learner Portal."
                          );
                        }}
                        aria-label="Aktifkan Halaman Favorites di Portal Siswa"
                        className="h-5 w-5 rounded border-slate-300 text-[#4F39F6] accent-[#4F39F6] cursor-pointer"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Live Preview Navbar Siswa */}
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye size={12} />
                  <span>Preview Menu Navigasi Portal Siswa</span>
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 p-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6]/10 px-3 py-1.5 text-xs font-semibold text-[#4F39F6]">
                    <Home size={13} />
                    <span>Home</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <BookOpen size={13} />
                    <span>My Learning</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <Compass size={13} />
                    <span>Catalog</span>
                  </span>
                  {pagesDraft.showWikiPage ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700">
                      <Library size={13} />
                      <span>Wiki</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-400 line-through">
                      Wiki (Tersembunyi)
                    </span>
                  )}
                  {pagesDraft.showFavoritesPage ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 border border-pink-200 px-3 py-1.5 text-xs font-semibold text-pink-700">
                      <Heart size={13} />
                      <span>Favorites</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-400 line-through">
                      Favorites (Tersembunyi)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4B: WEB UNDER CONSTRUCTION (404) */}
          {activeSection === "under-construction" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status Halaman Publik (404)
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  <IosGroupedRow
                    label="Mode Under Construction"
                    hint="Jika aktif, pengunjung publik yang membuka domain utama atau URL yang tidak ditemukan akan diarahkan ke halaman 404 / Under Construction."
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setMaintDraft((prev) => ({
                            ...prev,
                            enabled: !prev.enabled,
                          }))
                        }
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          maintDraft.enabled
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        <Construction size={14} />
                        <span>
                          {maintDraft.enabled
                            ? "Aktif (Pengunjung Lihat 404)"
                            : "Nonaktif (Landing Page Normal)"}
                        </span>
                      </button>

                      <span className="text-[11px] text-slate-400">
                        Admin bypass:{" "}
                        <code className="font-mono text-slate-600">
                          /?admin=1
                        </code>
                      </span>
                    </div>
                  </IosGroupedRow>

                  <IosGroupedRow
                    label="Mode Tampilan Desain"
                    hint="Pilih apakah desain gambar ditampilkan penuh satu layar atau di dalam kartu rapi dengan teks."
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMaintDraft((prev) => ({
                            ...prev,
                            displayMode: "card",
                          }))
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          maintDraft.displayMode === "card"
                            ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Card Tengah + Teks
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMaintDraft((prev) => ({
                            ...prev,
                            displayMode: "fullscreen",
                          }))
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          maintDraft.displayMode === "fullscreen"
                            ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Full Screen Gambar
                      </button>
                    </div>
                  </IosGroupedRow>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Upload Desain Manual (PNG, JPG, WEBP, SVG)
                </p>
                <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                  <IosGroupedRow
                    label="Upload File Desain"
                    hint="Unggah gambar desain 404 / Under Construction buatanmu sendiri."
                    alignTop
                  >
                    <div className="space-y-3">
                      <input
                        ref={maintFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleMaintImageUpload}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => maintFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#432ED8] px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Upload Gambar Desain</span>
                        </button>
                        {maintDraft.customImageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setMaintDraft((prev) => ({
                                ...prev,
                                customImageUrl: "",
                              }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Hapus Gambar</span>
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={maintDraft.customImageUrl}
                        onChange={(e) =>
                          setMaintDraft((prev) => ({
                            ...prev,
                            customImageUrl: e.target.value,
                          }))
                        }
                        placeholder="Atau tempel URL gambar desain (https://...)"
                        className={IOS_INPUT_CLASS}
                      />
                    </div>
                  </IosGroupedRow>

                  <IosGroupedRow label="Badge Header">
                    <input
                      type="text"
                      value={maintDraft.badgeText}
                      onChange={(e) =>
                        setMaintDraft((prev) => ({
                          ...prev,
                          badgeText: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Judul Utama">
                    <input
                      type="text"
                      value={maintDraft.title}
                      onChange={(e) =>
                        setMaintDraft((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>

                  <IosGroupedRow label="Deskripsi Singkat" alignTop>
                    <textarea
                      rows={3}
                      value={maintDraft.subtitle}
                      onChange={(e) =>
                        setMaintDraft((prev) => ({
                          ...prev,
                          subtitle: e.target.value,
                        }))
                      }
                      className={IOS_INPUT_CLASS}
                    />
                  </IosGroupedRow>
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye size={12} />
                  <span>Preview Tampilan Halaman 404</span>
                </p>
                <div className="rounded-2xl bg-slate-100 border border-slate-200/80 p-5 flex items-center justify-center">
                  {maintDraft.customImageUrl &&
                  maintDraft.displayMode === "fullscreen" ? (
                    <div className="w-full max-w-md rounded-xl overflow-hidden bg-[#0B0C10] border border-slate-300 shadow-sm">
                      <img
                        src={maintDraft.customImageUrl}
                        alt="Preview Fullscreen"
                        className="w-full max-h-60 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden text-center">
                      {maintDraft.customImageUrl ? (
                        <div className="bg-slate-50 border-b border-slate-100">
                          <img
                            src={maintDraft.customImageUrl}
                            alt="Preview Desain"
                            className="w-full max-h-48 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="pt-6 pb-2 flex flex-col items-center">
                          <div className="h-10 w-10 rounded-xl bg-[#4F39F6]/10 text-[#4F39F6] flex items-center justify-center mb-2">
                            <ImageIcon size={18} />
                          </div>
                          <span className="text-3xl font-black text-slate-900">
                            404
                          </span>
                        </div>
                      )}
                      <div className="p-5 space-y-1.5">
                        {maintDraft.badgeText && (
                          <span className="inline-block rounded-full bg-[#4F39F6]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                            {maintDraft.badgeText}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900">
                          {maintDraft.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {maintDraft.subtitle}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: BRAND & SERTIFIKAT */}
          {activeSection === "brand-certificate" && (
            <div className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Identitas Workspace &amp; Sertifikat
              </p>
              <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                <IosGroupedRow label="Application Brand Name">
                  <input
                    id="settings-workspace-name"
                    type="text"
                    value={workspaceName || ""}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className={IOS_INPUT_CLASS}
                  />
                </IosGroupedRow>

                <IosGroupedRow label="Credential ID Series Prefix">
                  <input
                    id="settings-cert-prefix"
                    type="text"
                    value={defaultCertificatePrefix || ""}
                    onChange={(e) =>
                      setDefaultCertificatePrefix(e.target.value)
                    }
                    className={IOS_INPUT_CLASS}
                  />
                </IosGroupedRow>

                <IosGroupedRow label="Default Quiz Pass Threshold (%)">
                  <input
                    id="settings-pass-threshold"
                    type="number"
                    min={50}
                    max={100}
                    value={passMarkThreshold ?? 80}
                    onChange={(e) =>
                      setPassMarkThreshold(Number(e.target.value))
                    }
                    className={IOS_INPUT_CLASS}
                  />
                </IosGroupedRow>

                <IosGroupedRow label="Authorized Mentor Signatory">
                  <input
                    id="settings-signatory"
                    type="text"
                    value={mentorSignatory || ""}
                    onChange={(e) => setMentorSignatory(e.target.value)}
                    className={IOS_INPUT_CLASS}
                  />
                </IosGroupedRow>
              </div>
            </div>
          )}

          {/* SECTION 6: DATABASE & SINKRONISASI */}
          {activeSection === "database-sync" && (
            <div className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status Koneksi &amp; Sinkronisasi
              </p>
              <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-700">
                    Status Koneksi Database
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 size={12} />
                    {isSupabaseConfigured
                      ? "Supabase Connected"
                      : "LocalStorage Persisted + Supabase Ready"}
                  </span>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-700">
                    Tabel Tersinkronisasi
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    contents, landing_pages, mentor_inbox_threads
                  </span>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-700">
                    Keamanan Row Level Security (RLS)
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F39F6]">
                    <ShieldCheck size={14} />
                    Policies Enabled
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
