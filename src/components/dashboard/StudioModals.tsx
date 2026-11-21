"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Zap,
  CheckCircle2,
  ArrowRight,
  Award,
  QrCode,
  Building2,
  ChevronLeft,
  Copy,
  Check,
  Upload,
  MessageCircle,
  ShieldCheck,
  XCircle,
  Clock,
  Lock,
} from "lucide-react";
import {
  CONTENT_TYPES_LIST,
  CONTENT_TYPE_CONFIGS,
  type ContentType,
  type UngradedQuizItem,
} from "@/lib/design-tokens";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { ContentBadge, ContentIconBox } from "@/components/ui/ContentBadge";
import {
  useRuangSosmedStore,
  DEFAULT_LEARNER_PRO_CONFIG,
  PACKAGE_FEATURE_DEFINITIONS,
  ALL_FALSE_ENTITLEMENTS,
  getNormalizedProPackages,
  computeTrial3DaysPriceIdr,
  computeTrial7DaysPriceIdr,
  formatIdr,
  isTrialBillingCycle,
  parseIdrFromLabel,
  type LearnerProPackageItem,
  type PackageTierKind,
} from "@/context/RuangSosmedStore";
import { supabase, STORAGE_BUCKETS } from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";

interface QuickCreateModalProps {
  open: boolean;
  initialType: ContentType;
  onClose: () => void;
  onCreated: (type: ContentType, title: string) => void;
}

export function QuickCreateModal({
  open,
  initialType,
  onClose,
  onCreated,
}: QuickCreateModalProps) {
  const [selectedType, setSelectedType] = useState<ContentType>(initialType);
  const [title, setTitle] = useState("");
  const [cohort, setCohort] = useState("Batch 14 — Social Media Specialist");

  React.useEffect(() => {
    setSelectedType(initialType);
  }, [initialType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle =
      title.trim() || `Untitled ${selectedType} — Ruang Sosmed 2.0`;
    onCreated(selectedType, finalTitle);
    setTitle("");
    onClose();
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="quick-create-modal-title"
      title="Create Learning Content"
      subtitle="Publish a new curriculum item in Ruang Sosmed 2.0 Studio"
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#121215] mb-2">
            Select Content Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CONTENT_TYPES_LIST.map((type) => {
              const cfg = CONTENT_TYPE_CONFIGS[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-2.5 rounded-lg p-2.5 text-left border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#4F39F6]/5 border-[#4F39F6] ring-1 ring-[#4F39F6]"
                      : "bg-[#FFFFFF] border-[#EAECEF] hover:bg-[#F8F9FB]"
                  }`}
                >
                  <ContentIconBox type={type} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#121215] truncate">
                      {type}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">
                      {cfg.colorHex}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#5E5E5E]">
            {CONTENT_TYPE_CONFIGS[selectedType].description}
          </p>
        </div>

        <div>
          <label
            htmlFor="content-title-input"
            className="block text-xs font-semibold text-[#121215] mb-1.5"
          >
            {selectedType} Title
          </label>
          <input
            id="content-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g., Mastering TikTok Shop Ads & Creative Testing`}
            className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="content-cohort-select"
            className="block text-xs font-semibold text-[#121215] mb-1.5"
          >
            Target Cohort / Track
          </label>
          <select
            id="content-cohort-select"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
          >
            <option>Batch 14 — Social Media Specialist</option>
            <option>Batch 09 — Meta &amp; TikTok Performance Ads</option>
            <option>Creator Economy &amp; KOL Management Track</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <span>Create {selectedType}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectResult: (label: string) => void;
}

export function GlobalSearchModal({
  open,
  onClose,
  onSelectResult,
}: GlobalSearchModalProps) {
  const { explorerItems } = useRuangSosmedStore();
  const [query, setQuery] = useState("");

  const searchItems = explorerItems.map((item, idx) => ({
    id: item.id || `search-item-${idx}`,
    title: item.title,
    type: item.type,
    meta: `${item.statusLabel} • ${item.editedDate}`,
  }));

  const filtered = searchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="global-search-modal-title"
      title="Search Ruang Sosmed 2.0 Studio"
      subtitle="Find courses, pages, assignments, quizzes, learning paths, or learners"
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-3">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-[#9CA3AF]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or content type..."
            className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
          />
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-[#EAECEF] border border-[#EAECEF] rounded-lg">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#9CA3AF]">
              No matching content found in Ruang Sosmed 2.0.
            </p>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={`${item.id}-${item.title}-${idx}`}
                type="button"
                onClick={() => {
                  onSelectResult(item.title);
                  onClose();
                }}
                className="w-full flex items-center justify-between gap-3 p-2.5 text-left hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ContentIconBox type={item.type} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#121215] truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">
                      {item.meta}
                    </p>
                  </div>
                </div>
                <ContentBadge type={item.type} />
              </button>
            ))
          )}
        </div>
      </div>
    </ModalDialog>
  );
}

interface UpgradePlanModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmUpgrade: (details?: {
    packageId?: string;
    packageName: string;
    priceLabel: string;
    periodLabel: string;
    billingCycle?: "3d_trial" | "7d_trial" | "30d";
    durationDays?: number;
    buyerName?: string;
    buyerEmail?: string;
    paymentMethod?: "qris" | "bank";
    proofUrl?: string;
  }) => Promise<void> | void;
  isProActive?: boolean;
  hasUsedTrial?: boolean;
  activePackageId?: string | null;
  activePackageName?: string | null;
  activeTierKind?: PackageTierKind;
  preselectedPackageId?: string;
  canTestFreeToggle?: boolean;
  previewTier?: "auto" | "free" | "basic" | "pro";
  onSelectPreviewTier?: (tier: "auto" | "free" | "basic" | "pro") => void;
  onSwitchToFree?: () => void;
  initialStep?: "overview" | "payment";
  defaultBuyerName?: string;
  defaultBuyerEmail?: string;
}

export const LEARNER_PRO_FEATURES_LIST = DEFAULT_LEARNER_PRO_CONFIG.features;

export function UpgradePlanModal({
  open,
  onClose,
  onConfirmUpgrade,
  isProActive = false,
  hasUsedTrial = false,
  activePackageId = null,
  activePackageName = null,
  activeTierKind = "free",
  preselectedPackageId,
  canTestFreeToggle = false,
  previewTier = "auto",
  onSelectPreviewTier,
  onSwitchToFree,
  initialStep = "overview",
  defaultBuyerName = "",
  defaultBuyerEmail = "",
}: UpgradePlanModalProps) {
  const { learnerProConfig } = useRuangSosmedStore();
  const cfg = {
    ...DEFAULT_LEARNER_PRO_CONFIG,
    ...(learnerProConfig || {}),
  };

  const packages = getNormalizedProPackages(cfg);
  const paidPackages = packages.filter((p) => !p.isFreeTier && p.tierKind !== "free");
  const defaultPaidPkg =
    paidPackages.find((p) => p.highlighted) ||
    paidPackages[paidPackages.length - 1] ||
    packages[0];

  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    defaultPaidPkg?.id || "pkg-pro"
  );
  const [billingCycle, setBillingCycle] = useState<
    "3d_trial" | "7d_trial" | "30d"
  >("30d");
  const [step, setStep] = useState<"overview" | "payment">(initialStep);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bank">("qris");
  const [buyerName, setBuyerName] = useState(defaultBuyerName);
  const [buyerContact, setBuyerContact] = useState(defaultBuyerEmail);
  const [proofPreview, setProofPreview] = useState("");
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const selectedPkg: LearnerProPackageItem =
    packages.find((p) => p.id === selectedPackageId) || defaultPaidPkg;

  const activeQrisUrl = selectedPkg?.qrCodeUrl || cfg.qrCodeUrl || "";

  const anyHas3dTrial = paidPackages.some((p) => p.enable3DayTrial !== false);
  const anyHas7dTrial = paidPackages.some((p) => p.enable7DayTrial !== false);

  const effectiveCycle: "3d_trial" | "7d_trial" | "30d" =
    !hasUsedTrial && !selectedPkg?.isFreeTier
      ? billingCycle === "3d_trial" && selectedPkg?.enable3DayTrial !== false
        ? "3d_trial"
        : billingCycle === "7d_trial" && selectedPkg?.enable7DayTrial !== false
        ? "7d_trial"
        : "30d"
      : "30d";

  const computePackageCyclePricing = (
    pkg: LearnerProPackageItem,
    cycle: "3d_trial" | "7d_trial" | "30d"
  ) => {
    if (pkg.isFreeTier) {
      return {
        amountIdr: 0,
        priceText: "Gratis",
        periodText: "Selamanya",
        durationDays: 0,
      };
    }
    const monthlyIdr = Math.max(
      0,
      Number(pkg.monthlyPriceIdr ?? parseIdrFromLabel(pkg.priceLabel) ?? 150000)
    );
    if (cycle === "3d_trial" && !hasUsedTrial && pkg.enable3DayTrial !== false) {
      const trial3Idr = computeTrial3DaysPriceIdr(
        monthlyIdr,
        pkg.trial3DaysPriceIdr
      );
      return {
        amountIdr: trial3Idr,
        priceText: formatIdr(trial3Idr),
        periodText: "/ 3 hari (Trial 1×)",
        durationDays: 3,
      };
    }
    if (cycle === "7d_trial" && !hasUsedTrial && pkg.enable7DayTrial !== false) {
      const trialIdr = computeTrial7DaysPriceIdr(
        monthlyIdr,
        pkg.trial7DaysPriceIdr
      );
      return {
        amountIdr: trialIdr,
        priceText: formatIdr(trialIdr),
        periodText: "/ 7 hari (Trial 1×)",
        durationDays: 7,
      };
    }
    return {
      amountIdr: monthlyIdr,
      priceText: monthlyIdr > 0 ? formatIdr(monthlyIdr) : pkg.priceLabel,
      periodText: pkg.periodLabel || "/ 30 hari",
      durationDays: 30,
    };
  };

  const selectedPricing = computePackageCyclePricing(selectedPkg, effectiveCycle);

  useEffect(() => {
    if (open) {
      const freshPkgs = getNormalizedProPackages(cfg);
      const freshPaid = freshPkgs.filter((p) => !p.isFreeTier && p.tierKind !== "free");
      const targetPre =
        preselectedPackageId &&
        freshPkgs.some((p) => p.id === preselectedPackageId)
          ? preselectedPackageId
          : (freshPaid.find((p) => p.highlighted) ||
              freshPaid[freshPaid.length - 1] ||
              freshPkgs[0])?.id || "pkg-pro";
      setSelectedPackageId(targetPre);
      setBillingCycle((prev) => (hasUsedTrial ? "30d" : prev));
      setStep(isProActive && activeTierKind === "pro" ? "overview" : initialStep);
      setPaymentMethod("qris");
      setBuyerName(defaultBuyerName || "");
      setBuyerContact(defaultBuyerEmail || "");
      setProofPreview("");
      setFormError(null);
      setCopiedAcc(false);
    }
  }, [
    open,
    initialStep,
    isProActive,
    hasUsedTrial,
    activeTierKind,
    preselectedPackageId,
    defaultBuyerName,
    defaultBuyerEmail,
  ]);

  const handleCopyAccount = () => {
    if (!cfg.accountNumber) return;
    try {
      navigator.clipboard?.writeText(cfg.accountNumber);
    } catch {}
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 1800);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id || "proofs";
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.ATTACHMENTS,
        folderPath: `${uid}/pro-proofs`,
        fileName: file.name,
        maxWidth: 1000,
        maxHeight: 1400,
        quality: 0.8,
      });
      setProofPreview(url);
    } catch {}
  };

  const handleWhatsAppConfirm = () => {
    const rawWa = (cfg.whatsappNumber || "6281234567890").replace(/\D/g, "");
    const normalizedWa = rawWa.startsWith("0")
      ? `62${rawWa.slice(1)}`
      : rawWa || "6281234567890";

    const lines = [
      "Halo Admin Ruang Sosmed 2.0,",
      `Saya telah melakukan pembayaran paket *${selectedPkg.name}* (${selectedPkg.badge || cfg.badgeText})`,
      `Durasi: *${effectiveCycle === "7d_trial" ? "Percobaan 7 Hari (1×)" : "Langganan 30 Hari (1 Bulan)"}*`,
      `Nominal: *${selectedPricing.priceText} ${selectedPricing.periodText}*`,
      `Metode: *${paymentMethod === "qris" ? "Scan QRIS" : `Transfer ${cfg.bankName}`}*`,
      buyerName.trim() ? `Nama: ${buyerName.trim()}` : null,
      buyerContact.trim() ? `Email/WA: ${buyerContact.trim()}` : null,
      "Mohon aktivasi paket saya. Terima kasih!",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/${normalizedWa}?text=${encodeURIComponent(lines)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const modalTitleText =
    step === "payment"
      ? `Pembayaran Paket ${selectedPkg.name}`
      : isProActive
      ? `Membership Aktif: ${activePackageName || "PRO"}`
      : cfg.modalTitle;

  const modalSubtitleText =
    step === "payment"
      ? `Selesaikan pembayaran ${selectedPricing.priceText} ${selectedPricing.periodText} melalui QRIS atau transfer bank`
      : cfg.modalSubtitle;

  const modalWidth =
    step === "payment"
      ? "max-w-lg"
      : packages.length >= 3
      ? "max-w-4xl"
      : "max-w-2xl";

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="upgrade-plan-modal-title"
      title={modalTitleText}
      subtitle={modalSubtitleText}
      maxWidthClass={modalWidth}
    >
      {step === "payment" && !selectedPkg.isFreeTier ? (
        <div className="space-y-4">
          {/* Top Navigation & Bill Summary */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep("overview")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Ganti Paket / Lihat Perbandingan</span>
            </button>
            <div className="flex items-center gap-1.5">
              {effectiveCycle === "7d_trial" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Trial 7 Hari (1×)
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold text-[#92400E]">
                <Zap size={10} fill="currentColor" />
                {selectedPkg.name}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#92400E]">
                Total Pembayaran ({effectiveCycle === "7d_trial" ? "Trial 7 Hari" : "30 Hari / 1 Bulan"})
              </p>
              <p className="text-xl font-extrabold text-[#121215]">
                {selectedPricing.priceText}
                <span className="text-xs font-medium text-[#78350F] ml-1">
                  {selectedPricing.periodText}
                </span>
              </p>
            </div>
            <div className="text-right text-[11px] text-[#78350F]">
              <p className="font-bold">{selectedPkg.badge}</p>
              <p>
                {selectedPkg.moduleAccessMode === "limited"
                  ? `Maks. ${selectedPkg.maxModulesPerCourse || 6} modul/materi`
                  : "Semua modul unlimited"}
              </p>
            </div>
          </div>

          {/* Method Tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setPaymentMethod("qris")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                paymentMethod === "qris"
                  ? "bg-white text-[#4F39F6] shadow-2xs"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <QrCode size={14} />
              <span>Scan QRIS</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                paymentMethod === "bank"
                  ? "bg-white text-[#4F39F6] shadow-2xs"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <Building2 size={14} />
              <span>Transfer Bank</span>
            </button>
          </div>

          {/* Payment Method Body */}
          {paymentMethod === "qris" ? (
            <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 text-center space-y-3">
              {activeQrisUrl ? (
                <div className="inline-block rounded-2xl bg-white p-3.5 border border-[#EAECEF] shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeQrisUrl}
                    alt={`QRIS ${cfg.merchantName || "Ruang Sosmed 2.0"}`}
                    className="h-52 w-52 object-contain mx-auto rounded-lg"
                  />
                  <p className="mt-2 text-[11px] font-bold text-[#121215]">
                    {cfg.merchantName || "Ruang Sosmed 2.0"}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white p-6 space-y-2">
                  <QrCode size={32} className="mx-auto text-[#9CA3AF]" />
                  <p className="text-xs font-bold text-[#121215]">
                    QRIS Belum Diunggah oleh Admin
                  </p>
                  <p className="text-[11px] text-[#5E5E5E] max-w-xs mx-auto">
                    Admin dapat mengunggah gambar QRIS di halaman{" "}
                    <strong>Admin → Settings</strong>. Anda tetap bisa
                    menggunakan tab Transfer Bank.
                  </p>
                </div>
              )}
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                {cfg.paymentInstructions}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5E5E5E]">Bank Tujuan</span>
                <span className="font-bold text-[#121215]">
                  {cfg.bankName || "BCA / Mandiri"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#5E5E5E]">Nomor Rekening</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#121215]">
                    {cfg.accountNumber || "-"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-[#4F39F6] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
                  >
                    {copiedAcc ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedAcc ? "Disalin" : "Salin"}</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5E5E5E]">Atas Nama</span>
                <span className="font-bold text-[#121215]">
                  {cfg.accountHolder || "-"}
                </span>
              </div>
            </div>
          )}

          {/* Buyer Details & Optional Proof */}
          <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-2.5">
            <p className="text-[11px] font-bold text-[#121215]">
              Data Konfirmasi Pembayar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={buyerName || ""}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nama lengkap"
                className="rounded-lg bg-white px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
              />
              <input
                type="text"
                value={buyerContact || ""}
                onChange={(e) => setBuyerContact(e.target.value)}
                placeholder="Email / No. WhatsApp"
                className="rounded-lg bg-white px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer">
                <Upload size={12} />
                <span>
                  {proofPreview
                    ? "Bukti Pembayaran Terlampir ✓"
                    : "Upload Bukti Bayar (Opsional)"}
                </span>
                <input
                  key="upgrade-proof-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="hidden"
                />
              </label>

              <span className="inline-flex items-center gap-1 text-[10px] text-[#5E5E5E]">
                <ShieldCheck size={12} className="text-[#10B981]" />
                Verifikasi Pembayaran oleh Admin
              </span>
            </div>

            {formError && (
              <p className="text-[11px] font-semibold text-[#DC2626]">
                {formError}
              </p>
            )}
            <p className="text-[11px] text-[#5E5E5E]">
              Setelah konfirmasi dikirim, Admin akan memverifikasi pembayaran Anda sebelum mengaktifkan paket {selectedPkg.name}.
            </p>
          </div>

          {/* Payment Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleWhatsAppConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 px-3.5 py-2 text-xs font-bold text-[#059669] cursor-pointer"
            >
              <MessageCircle size={13} />
              <span>Konfirmasi via WhatsApp</span>
            </button>

            <button
              type="button"
              disabled={isSubmittingUpgrade || !buyerName.trim() || !buyerContact.trim()}
              onClick={async () => {
                if (!buyerName.trim() || !buyerContact.trim()) {
                  setFormError(
                    "Nama lengkap dan Email / No. WhatsApp wajib diisi untuk verifikasi."
                  );
                  return;
                }
                setFormError(null);
                setIsSubmittingUpgrade(true);
                try {
                  await onConfirmUpgrade({
                    packageId: selectedPkg.id,
                    packageName: selectedPkg.name,
                    priceLabel: selectedPricing.priceText,
                    periodLabel: selectedPricing.periodText,
                    billingCycle: effectiveCycle,
                    durationDays: selectedPricing.durationDays,
                    buyerName: buyerName.trim(),
                    buyerEmail: buyerContact.trim(),
                    paymentMethod,
                    proofUrl: proofPreview || undefined,
                  });
                  onClose();
                } finally {
                  setIsSubmittingUpgrade(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>
                {isSubmittingUpgrade
                  ? "Mengirim Konfirmasi..."
                  : "Kirim Konfirmasi Pembayaran"}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Duration / Billing Cycle Toggle: 3-Day / 7-Day 1x Trial vs 30-Day Monthly */}
          <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Clock size={14} className="text-[#4F39F6] shrink-0" />
              <div>
                <p className="font-bold text-[#121215]">
                  Pilih Durasi Langganan
                </p>
                <p className="text-[11px] text-[#5E5E5E]">
                  {hasUsedTrial
                    ? "Paket percobaan (1× pakai) sudah pernah digunakan — pilihan aktif hanya 30 hari."
                    : "Tersedia percobaan 3 hari / 7 hari (1× pakai member baru) atau paket bulanan 30 hari."}
                </p>
              </div>
            </div>

            {!hasUsedTrial && (anyHas3dTrial || anyHas7dTrial) ? (
              <div className="inline-flex flex-wrap rounded-xl bg-white p-1 border border-[#EAECEF] gap-1">
                {anyHas3dTrial && (
                  <button
                    type="button"
                    onClick={() => setBillingCycle("3d_trial")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      billingCycle === "3d_trial"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-[#5E5E5E] hover:text-[#121215]"
                    }`}
                  >
                    Trial 3 Hari (1×)
                  </button>
                )}
                {anyHas7dTrial && (
                  <button
                    type="button"
                    onClick={() => setBillingCycle("7d_trial")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      billingCycle === "7d_trial"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-[#5E5E5E] hover:text-[#121215]"
                    }`}
                  >
                    Trial 7 Hari (1×)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBillingCycle("30d")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    billingCycle === "30d"
                      ? "bg-[#4F39F6] text-white shadow-2xs"
                      : "text-[#5E5E5E] hover:text-[#121215]"
                  }`}
                >
                  30 Hari (1 Bulan)
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6]/10 border border-[#4F39F6]/25 px-3 py-1.5 text-xs font-bold text-[#4F39F6]">
                Langganan 30 Hari Aktif
              </span>
            )}
          </div>

          {/* Package Comparison Grid (FREE / Basic / Pro / Custom) */}
          <div
            className={`grid gap-3 ${
              packages.length >= 3
                ? "grid-cols-1 md:grid-cols-3"
                : packages.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {packages.map((pkg) => {
              const isSelected = pkg.id === selectedPkg.id;
              const isCurrentUserTier = pkg.isFreeTier
                ? !isProActive
                : isProActive &&
                  (activePackageId === pkg.id ||
                    (activePackageName &&
                      activePackageName.trim().toLowerCase() ===
                        pkg.name.trim().toLowerCase()) ||
                    activeTierKind === pkg.tierKind);
              const pricing = computePackageCyclePricing(pkg, effectiveCycle);
              const monthlyBase = Math.max(
                0,
                Number(pkg.monthlyPriceIdr ?? parseIdrFromLabel(pkg.priceLabel) ?? 0)
              );
              const pkgEnt = {
                ...ALL_FALSE_ENTITLEMENTS,
                ...(pkg.entitlements || {}),
              };

              return (
                <div
                  key={pkg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPackageId(pkg.id);
                    }
                  }}
                  className={`rounded-2xl p-4 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? pkg.tierKind === "pro"
                        ? "bg-[#FFFBEB]/60 border-[#F59E0B] ring-2 ring-[#F59E0B]/40 shadow-sm"
                        : "bg-[#EEF2FF]/50 border-[#4F39F6] ring-2 ring-[#4F39F6]/30 shadow-sm"
                      : "bg-white border-[#EAECEF] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            pkg.isFreeTier
                              ? "bg-slate-100 text-slate-700"
                              : pkg.tierKind === "basic"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {!pkg.isFreeTier && <Zap size={10} fill="currentColor" />}
                          {pkg.badge || pkg.name}
                        </span>
                        <h3 className="text-base font-extrabold text-[#121215] mt-1">
                          {pkg.name}
                        </h3>
                      </div>

                      {isCurrentUserTier ? (
                        <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                          Paket Aktif
                        </span>
                      ) : pkg.highlighted && !pkg.isFreeTier ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                          Terpopuler
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-[#121215]">
                          {pricing.priceText}
                        </span>
                        <span className="text-[11px] font-medium text-[#5E5E5E]">
                          {pricing.periodText}
                        </span>
                      </div>
                      {!pkg.isFreeTier &&
                        isTrialBillingCycle(effectiveCycle) &&
                        ((effectiveCycle === "3d_trial" &&
                          pkg.enable3DayTrial !== false) ||
                          (effectiveCycle === "7d_trial" &&
                            pkg.enable7DayTrial !== false)) &&
                        monthlyBase > 0 && (
                        <p className="text-[10px] text-[#5E5E5E] mt-0.5">
                          Lanjut bulan berikutnya: {formatIdr(monthlyBase)} / 30 hari
                        </p>
                      )}
                      <p className="text-[11px] text-[#5E5E5E] mt-1 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Module Rule Badge */}
                    <div className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1.5 text-[11px] font-semibold text-[#121215]">
                      {pkg.moduleAccessMode === "unlimited"
                        ? "✨ Semua modul & video terbuka penuh"
                        : pkg.moduleAccessMode === "limited"
                        ? `📚 Maks. ${pkg.maxModulesPerCourse || 6} modul/materi (${pkg.allowPointsUnlock ? "buka lanjutan pakai Poin" : ""}${pkg.allowPointsUnlock && pkg.allowPerItemPurchase ? " / " : ""}${pkg.allowPerItemPurchase ? "beli satuan" : ""})`
                        : "🔓 Hanya bab bertanda Gratis"}
                    </div>

                    {/* 7 Real Features ON/OFF Comparison */}
                    <ul className="space-y-1.5 text-[11px]">
                      {PACKAGE_FEATURE_DEFINITIONS.map((def) => {
                        const enabled = Boolean(pkgEnt[def.key]);
                        const displayLabel =
                          pkg.featureLabels?.[def.key]?.trim() || def.shortLabel;
                        return (
                          <li
                            key={`${pkg.id}-${def.key}`}
                            className={`flex items-start gap-2 ${
                              enabled
                                ? "text-[#121215] font-semibold"
                                : "text-[#9CA3AF] line-through"
                            }`}
                          >
                            {enabled ? (
                              <CheckCircle2
                                size={13}
                                className="text-emerald-600 shrink-0 mt-0.5"
                              />
                            ) : (
                              <XCircle
                                size={13}
                                className="text-slate-300 shrink-0 mt-0.5"
                              />
                            )}
                            <span>{displayLabel}</span>
                          </li>
                        );
                      })}
                      {(pkg.extraBenefits || []).map((ex, i) => (
                        <li
                          key={`${pkg.id}-ex-${i}`}
                          className="flex items-start gap-2 text-[#4F39F6] font-semibold"
                        >
                          <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EAECEF]">
                    {pkg.isFreeTier ? (
                      <div className="w-full rounded-lg bg-slate-100 py-1.5 text-center text-[11px] font-bold text-slate-600">
                        {isCurrentUserTier ? "Paket Dasar Aktif" : "Paket Gratis Dasar"}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPackageId(pkg.id);
                          setStep("payment");
                        }}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                          pkg.tierKind === "pro"
                            ? "bg-[#F59E0B] hover:bg-[#D97706] text-[#121215]"
                            : "bg-[#4F39F6] hover:bg-[#3B28CC] text-white"
                        }`}
                      >
                        <Zap size={12} fill="currentColor" />
                        <span>
                          {isCurrentUserTier
                            ? `Perpanjang ${pkg.name}`
                            : pkg.ctaButtonLabel || `Pilih ${pkg.name}`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EAECEF]">
            {canTestFreeToggle && onSelectPreviewTier ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#5E5E5E]">
                  Mode Preview Admin:
                </span>
                {(
                  [
                    { id: "auto", label: "Auto (Full)" },
                    { id: "free", label: "Test FREE" },
                    { id: "basic", label: "Test Basic" },
                    { id: "pro", label: "Test Pro" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onSelectPreviewTier(mode.id);
                      if (mode.id === "free") onSwitchToFree?.();
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                      previewTier === mode.id
                        ? "bg-[#121215] text-white border-[#121215]"
                        : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:bg-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-[#5E5E5E]">
                {cfg.footerNote}
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                Tutup
              </button>
              {!selectedPkg.isFreeTier && (
                <button
                  type="button"
                  onClick={() => setStep("payment")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] px-4 py-2 text-xs font-bold text-[#121215] shadow-[0_2px_8px_rgba(245,158,11,0.28)] cursor-pointer"
                >
                  <Zap size={13} fill="currentColor" />
                  <span>
                    Lanjut Bayar {selectedPkg.name} ({selectedPricing.priceText})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalDialog>
  );
}

interface GradeQuizModalProps {
  quiz: UngradedQuizItem | null;
  onClose: () => void;
  onSubmitGrade: (quizId: string, score: number, feedback: string) => void;
}

export function GradeQuizModal({
  quiz,
  onClose,
  onSubmitGrade,
}: GradeQuizModalProps) {
  const [score, setScore] = useState(92);
  const [feedback, setFeedback] = useState(
    "Strong campaign structure breakdown and clear CPA optimization rules."
  );

  if (!quiz) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitGrade(quiz.id, score, feedback);
    onClose();
  };

  return (
    <ModalDialog
      open={Boolean(quiz)}
      onClose={onClose}
      titleId="grade-quiz-modal-title"
      title={`Grade Quiz: ${quiz.title}`}
      subtitle={`Learner: ${quiz.learner.name} • ${quiz.questionsLabel}`}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF]">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: quiz.learner.avatarBg,
                color: quiz.learner.avatarText,
              }}
            >
              {quiz.learner.initials}
            </span>
            <div>
              <p className="text-xs font-semibold text-[#121215]">
                {quiz.learner.name}
              </p>
              <p className="text-[11px] text-[#5E5E5E]">{quiz.learner.role}</p>
            </div>
          </div>
          <ContentBadge type="Quiz" />
        </div>

        <div>
          <label
            htmlFor="quiz-score-input"
            className="block text-xs font-semibold text-[#121215] mb-1.5"
          >
            Final Score (0 – 100 pts)
          </label>
          <input
            id="quiz-score-input"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="quiz-feedback-input"
            className="block text-xs font-semibold text-[#121215] mb-1.5"
          >
            Mentor Feedback
          </label>
          <textarea
            id="quiz-feedback-input"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full rounded-lg bg-[#F8F9FB] p-3 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            <Award size={14} />
            <span>Submit Grade ({score}%)</span>
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
