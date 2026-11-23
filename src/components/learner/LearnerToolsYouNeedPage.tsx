"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AppWindow,
  ExternalLink,
  Lock,
  Search,
  Coins,
  QrCode,
  Building2,
  Zap,
  CheckCircle2,
  Upload,
  MessageCircle,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { WebAppIconBadge } from "@/components/learner/WebAppIconBadge";
import {
  useRuangSosmedStore,
  DEFAULT_LEARNER_PRO_CONFIG,
  formatIdr,
  getActiveSessionUser,
} from "@/context/RuangSosmedStore";
import {
  supabase,
  isSupabaseConfigured,
  STORAGE_BUCKETS,
} from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";
import {
  buildWebAppUnlockKey,
  isSafeHttpUrl,
  mapRpcWebAppRow,
  type LearnerWebApp,
  type WebAppAccessMode,
} from "@/types/webapp";

interface LearnerToolsYouNeedPageProps {
  onOpenUpgradeModal?: () => void;
  onShowToast: (msg: string) => void;
  searchQuery?: string;
}

export function LearnerToolsYouNeedPage({
  onOpenUpgradeModal,
  onShowToast,
  searchQuery = "",
}: LearnerToolsYouNeedPageProps) {
  const {
    learnerPoints,
    learnerIsPro,
    learnerProConfig,
    learnerUnlockedItems,
    submitProUpgradeRequest,
    applyWebAppPointsUnlock,
  } = useRuangSosmedStore();

  const cfg = {
    ...DEFAULT_LEARNER_PRO_CONFIG,
    ...(learnerProConfig || {}),
  };

  const [apps, setApps] = useState<LearnerWebApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [accessFilter, setAccessFilter] = useState<"all" | WebAppAccessMode>(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Unlock Modal State (khusus mode `paid`)
  const [unlockTarget, setUnlockTarget] = useState<LearnerWebApp | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bank">("qris");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [proofPreview, setProofPreview] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [submittingPoints, setSubmittingPoints] = useState(false);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locallyPendingIds, setLocallyPendingIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const fetchWebApps = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_learner_web_apps");
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (
          error.code === "PGRST202" ||
          error.code === "42P01" ||
          msg.includes("get_learner_web_apps") ||
          msg.includes("learner_web_apps")
        ) {
          setMigrationMissing(true);
          setApps([]);
        }
        return;
      }

      setMigrationMissing(false);
      const list = Array.isArray(data)
        ? data.map((row) => mapRpcWebAppRow(row as Record<string, unknown>))
        : [];
      setApps(list.filter((item) => item.isActive));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWebApps();
  }, [fetchWebApps, learnerIsPro, learnerUnlockedItems.length]);

  const unlockedKeySet = useMemo(
    () => new Set((learnerUnlockedItems || []).map((u) => u.itemKey)),
    [learnerUnlockedItems]
  );

  const enrichedApps = useMemo(
    () =>
      apps.map((app) => {
        const itemKey = buildWebAppUnlockKey(app.id);
        const unlockedLocal = unlockedKeySet.has(itemKey);
        const hasPending =
          app.hasPendingRequest || locallyPendingIds.has(app.id);
        return {
          ...app,
          isUnlocked: app.isUnlocked || unlockedLocal,
          hasAccess:
            app.hasAccess ||
            app.accessMode === "free" ||
            (app.accessMode === "pro" && learnerIsPro) ||
            (app.accessMode === "paid" && unlockedLocal),
          hasPendingRequest: hasPending,
        };
      }),
    [apps, unlockedKeySet, locallyPendingIds, learnerIsPro]
  );

  const categories = useMemo(() => {
    const uniq = Array.from(
      new Set(
        enrichedApps.map((a) => a.category.trim()).filter(Boolean)
      )
    );
    return ["All", ...uniq];
  }, [enrichedApps]);

  const filteredApps = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return enrichedApps.filter((app) => {
      if (accessFilter !== "all" && app.accessMode !== accessFilter) {
        return false;
      }
      if (categoryFilter !== "All" && app.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const hay = `${app.name} ${app.description} ${app.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedApps, accessFilter, categoryFilter, localSearch]);

  const freeCount = useMemo(
    () => enrichedApps.filter((a) => a.accessMode === "free").length,
    [enrichedApps]
  );
  const openCount = useMemo(
    () => enrichedApps.filter((a) => a.hasAccess).length,
    [enrichedApps]
  );

  const openUnlockModal = (app: LearnerWebApp) => {
    const activeUser = getActiveSessionUser();
    setUnlockTarget(app);
    setShowCheckout(app.pointsCost <= 0 && app.priceIdr > 0);
    setPaymentMethod("qris");
    setBuyerName(activeUser.name || "");
    setBuyerContact(activeUser.email || "");
    setProofPreview("");
    setErrorMsg(null);
    setCopiedAcc(false);
  };

  const handleLaunchApp = (app: LearnerWebApp) => {
    if (!app.hasAccess) {
      if (app.accessMode === "pro") {
        onOpenUpgradeModal?.();
        return;
      }
      if (app.hasPendingRequest) {
        onShowToast(
          "Pembayaran untuk tool ini sedang menunggu verifikasi Admin / Telegram Bot."
        );
        return;
      }
      openUnlockModal(app);
      return;
    }

    if (!isSafeHttpUrl(app.url)) {
      onShowToast(
        "Link tool sedang diperbarui di server. Klik muat ulang lalu coba lagi."
      );
      void fetchWebApps();
      return;
    }

    window.open(app.url!, "_blank", "noopener,noreferrer");
  };

  const handlePointsUnlock = async () => {
    if (!unlockTarget || unlockTarget.pointsCost <= 0) return;
    setErrorMsg(null);
    setSubmittingPoints(true);

    try {
      const { data, error } = await supabase.rpc("unlock_web_app_with_points", {
        p_app_id: unlockTarget.id,
      });

      if (error || !data) {
        setErrorMsg(
          error?.message || "Gagal memproses penukaran poin. Coba lagi."
        );
        return;
      }

      const res = data as {
        ok?: boolean;
        error?: string;
        already_unlocked?: boolean;
        new_points?: number;
        url?: string;
      };

      if (!res.ok) {
        setErrorMsg(res.error || "Poin Anda belum mencukupi.");
        return;
      }

      const nextPoints =
        typeof res.new_points === "number"
          ? res.new_points
          : Math.max(0, learnerPoints - unlockTarget.pointsCost);

      applyWebAppPointsUnlock({
        appId: unlockTarget.id,
        appName: unlockTarget.name,
        pointsCost: res.already_unlocked ? 0 : unlockTarget.pointsCost,
        newPoints: nextPoints,
      });

      if (res.url && isSafeHttpUrl(res.url)) {
        setApps((prev) =>
          prev.map((item) =>
            item.id === unlockTarget.id
              ? { ...item, hasAccess: true, isUnlocked: true, url: res.url! }
              : item
          )
        );
      } else {
        void fetchWebApps();
      }

      onShowToast(
        res.already_unlocked
          ? `"${unlockTarget.name}" sudah terbuka di akun Anda.`
          : `Berhasil membuka "${unlockTarget.name}" (-${unlockTarget.pointsCost} ★ pts)!`
      );
      setUnlockTarget(null);
    } finally {
      setSubmittingPoints(false);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingProof(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id || "proofs";
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.ATTACHMENTS,
        folderPath: `${uid}/item-unlock-proofs`,
        fileName: file.name,
        maxWidth: 1000,
        maxHeight: 1400,
        quality: 0.8,
      });
      setProofPreview(url);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleWhatsAppConfirm = () => {
    if (!unlockTarget) return;
    const rawWa = (cfg.whatsappNumber || "6281234567890").replace(/\D/g, "");
    const normalizedWa = rawWa.startsWith("0")
      ? `62${rawWa.slice(1)}`
      : rawWa || "6281234567890";
    const lines = [
      "Halo Admin Ruang Sosmed 2.0,",
      `Saya membayar akses Tools You Need: *${unlockTarget.name}*`,
      `Nominal: *${formatIdr(unlockTarget.priceIdr)}*`,
      `Metode: *${
        paymentMethod === "qris" ? "Scan QRIS" : `Transfer ${cfg.bankName}`
      }*`,
      buyerName.trim() ? `Nama: ${buyerName.trim()}` : null,
      buyerContact.trim() ? `Email/WA: ${buyerContact.trim()}` : null,
      "Mohon aktifkan akses tool tersebut. Terima kasih!",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/${normalizedWa}?text=${encodeURIComponent(lines)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSubmitQrisPurchase = async () => {
    if (!unlockTarget) return;
    if (!buyerName.trim() || !buyerContact.trim()) {
      setErrorMsg("Nama lengkap dan Email / No. WhatsApp wajib diisi.");
      return;
    }

    setErrorMsg(null);
    setSubmittingPurchase(true);
    try {
      const res = await submitProUpgradeRequest({
        packageId: "webapp-unlock",
        packageName: "Tools You Need",
        priceLabel: formatIdr(unlockTarget.priceIdr),
        buyerName: buyerName.trim(),
        buyerContact: buyerContact.trim(),
        paymentMethod,
        proofUrl: proofPreview || undefined,
        billingCycle: "single_item",
        durationDays: 0,
        requestType: "item_unlock",
        targetItemKey: buildWebAppUnlockKey(unlockTarget.id),
        targetItemTitle: `Tools You Need: ${unlockTarget.name}`,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Gagal mengirim konfirmasi pembayaran.");
        return;
      }

      setLocallyPendingIds((prev) => new Set(prev).add(unlockTarget.id));
      onShowToast(
        `⏳ Konfirmasi pembelian "${unlockTarget.name}" (${formatIdr(
          unlockTarget.priceIdr
        )}) terkirim! Admin akan segera memverifikasi.`
      );
      setUnlockTarget(null);
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const activeQrisUrl = cfg.qrCodeUrl || "";
  const targetEnoughPoints = unlockTarget
    ? learnerPoints >= unlockTarget.pointsCost
    : false;

  return (
    <div className="space-y-5">
      {/* Header Overview Banner */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 sm:p-6 shadow-[0_2px_8px_rgba(16,15,17,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6]">
              <AppWindow size={12} />
              <span>Tools You Need</span>
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-[#121215]">
              Direktori Web App &amp; Tool Pendukung Belajar
            </h1>
            <p className="text-xs text-[#5E5E5E] leading-relaxed">
              Kumpulan web app siap pakai buatan Ruang Sosmed. Tool gratis &amp;
              terbuka akan langsung berjalan di tab browser baru tanpa
              membebani halaman portal belajar.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-[#5E5E5E]">
                Total Tools
              </p>
              <p className="text-base sm:text-lg font-bold text-[#121215] tabular-nums mt-0.5">
                {enrichedApps.length}
              </p>
            </div>
            <div className="rounded-xl bg-[#ECFDF5]/60 border border-[#A7F3D0] px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-[#047857]">Gratis</p>
              <p className="text-base sm:text-lg font-bold text-[#059669] tabular-nums mt-0.5">
                {freeCount}
              </p>
            </div>
            <div className="rounded-xl bg-[#EEF2FF]/70 border border-[#C7D2FE] px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-[#4F39F6]">Terbuka</p>
              <p className="text-base sm:text-lg font-bold text-[#4F39F6] tabular-nums mt-0.5">
                {openCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-3.5 space-y-3 shadow-[0_1px_4px_rgba(16,15,17,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "free", label: "Gratis" },
                { id: "pro", label: "Khusus PRO" },
                { id: "paid", label: "Berbayar (QRIS / Poin)" },
              ] as const
            ).map((pill) => {
              const active = accessFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setAccessFilter(pill.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[#4F39F6] text-white shadow-xs"
                      : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215]"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Cari nama atau kegunaan tool..."
                className="w-full rounded-xl bg-[#F8F9FB] pl-8 pr-3 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchWebApps()}
              disabled={loading}
              title="Muat ulang daftar Tools"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#EAECEF] bg-[#F8F9FB] text-[#5E5E5E] hover:text-[#4F39F6] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#F1F5F9]">
            <span className="text-[11px] font-semibold text-[#64748B] mr-1">
              Kategori:
            </span>
            {categories.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                    active
                      ? "bg-[#121215] text-white"
                      : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215]"
                  }`}
                >
                  {cat === "All" ? "Semua Kategori" : cat}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Content Area */}
      {loading && enrichedApps.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 animate-pulse space-y-3"
            >
              <div className="h-12 w-12 rounded-2xl bg-[#F1F5F9]" />
              <div className="h-4 w-2/3 rounded bg-[#F1F5F9]" />
              <div className="h-3 w-full rounded bg-[#F1F5F9]" />
              <div className="h-3 w-4/5 rounded bg-[#F1F5F9]" />
            </div>
          ))}
        </div>
      ) : migrationMissing ? (
        <section className="rounded-2xl bg-[#FFFFFF] border border-[#FDE68A] p-8 text-center space-y-2">
          <p className="text-sm font-bold text-[#121215]">
            Modul Tools You Need Siap Diaktifkan
          </p>
          <p className="text-xs text-[#5E5E5E] max-w-md mx-auto">
            Admin perlu menjalankan migrasi SQL{" "}
            <code className="font-mono font-semibold">
              028_learner_web_apps.sql
            </code>{" "}
            di Supabase SQL Editor terlebih dahulu, lalu menambahkan web app di
            Admin Studio.
          </p>
        </section>
      ) : filteredApps.length === 0 ? (
        <section className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-10 text-center space-y-2.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F39F6]">
            <AppWindow size={22} />
          </div>
          <h2 className="text-sm font-bold text-[#121215]">
            {enrichedApps.length === 0
              ? "Belum Ada Web App yang Diterbitkan"
              : "Tidak Ada Tool yang Cocok dengan Pencarian / Filter"}
          </h2>
          <p className="text-xs text-[#5E5E5E] max-w-md mx-auto">
            {enrichedApps.length === 0
              ? "Admin belum menambahkan link web app pendukung di halaman Tools You Need."
              : "Coba ubah filter akses atau hapus kata kunci pencarian untuk melihat seluruh daftar tool."}
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const accessLabel = app.hasAccess
              ? app.accessMode === "free"
                ? "Gratis"
                : "Terbuka"
              : app.hasPendingRequest
              ? "Menunggu Verifikasi"
              : app.accessMode === "pro"
              ? "Khusus PRO"
              : app.priceIdr > 0
              ? formatIdr(app.priceIdr)
              : `${app.pointsCost} ★ Poin`;

            const badgeClass = app.hasAccess
              ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]"
              : app.hasPendingRequest
              ? "bg-[#FEF3C7] border-[#FCD34D] text-[#B45309]"
              : app.accessMode === "pro"
              ? "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F39F6]"
              : "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]";

            let hostname = "";
            if (app.hasAccess && isSafeHttpUrl(app.url)) {
              try {
                hostname = new URL(app.url!).hostname.replace(/^www\./, "");
              } catch {}
            }

            return (
              <article
                key={app.id}
                className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] hover:border-[#C7D2FE] hover:shadow-[0_6px_20px_rgba(79,57,246,0.08)] transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <WebAppIconBadge
                      iconUrl={app.iconUrl}
                      iconPreset={app.iconPreset}
                      accentColor={app.accentColor}
                      name={app.name}
                    />
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${badgeClass}`}
                    >
                      {!app.hasAccess && app.accessMode !== "free" && (
                        <Lock size={10} />
                      )}
                      {app.hasAccess && <CheckCircle2 size={10} />}
                      <span>{accessLabel}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] font-semibold text-[#5E5E5E]">
                        {app.category || "Tools"}
                      </span>
                      {!app.hasAccess &&
                        app.accessMode === "paid" &&
                        app.pointsCost > 0 &&
                        app.priceIdr > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309]">
                            <Coins size={11} />
                            atau {app.pointsCost} ★ Poin
                          </span>
                        )}
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-[#121215] leading-snug">
                      {app.name}
                    </h2>

                    <p className="text-xs text-[#5E5E5E] leading-relaxed line-clamp-3">
                      {app.description ||
                        "Web app pendukung ekosistem belajar Ruang Sosmed 2.0."}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="truncate">
                      {app.hasAccess && hostname
                        ? hostname
                        : app.accessMode === "pro"
                        ? "Link aktif otomatis untuk member PRO"
                        : "Berbayar terpisah • Buka sekali selamanya"}
                    </span>
                  </div>

                  {app.hasAccess ? (
                    <button
                      type="button"
                      onClick={() => handleLaunchApp(app)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2.5 text-xs font-bold text-white cursor-pointer transition-colors"
                    >
                      <span>Buka di Tab Baru</span>
                      <ExternalLink size={13} />
                    </button>
                  ) : app.accessMode === "pro" ? (
                    <button
                      type="button"
                      onClick={() => handleLaunchApp(app)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#121215] hover:bg-[#27272A] px-4 py-2.5 text-xs font-bold text-white cursor-pointer transition-colors"
                    >
                      <Zap
                        size={13}
                        className="text-[#F59E0B]"
                        fill="currentColor"
                      />
                      <span>Upgrade ke PRO untuk Buka</span>
                    </button>
                  ) : app.hasPendingRequest ? (
                    <button
                      type="button"
                      onClick={() => handleLaunchApp(app)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FEF3C7] border border-[#FCD34D] px-4 py-2.5 text-xs font-bold text-[#92400E] cursor-pointer"
                    >
                      <Clock size={13} />
                      <span>Menunggu Verifikasi Admin...</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLaunchApp(app)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F8F9FB] hover:bg-[#EEF2FF] border border-[#EAECEF] hover:border-[#C7D2FE] px-4 py-2.5 text-xs font-bold text-[#121215] hover:text-[#4F39F6] cursor-pointer transition-colors"
                    >
                      <Sparkles size={13} className="text-[#4F39F6]" />
                      <span>
                        Buka Akses
                        {app.priceIdr > 0 ? ` • ${formatIdr(app.priceIdr)}` : ""}
                        {app.pointsCost > 0 ? ` / ${app.pointsCost} ★` : ""}
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Buka Akses Tool Berbayar Terpisah (Poin Bintang / QRIS) */}
      <ModalDialog
        open={Boolean(unlockTarget)}
        onClose={() => setUnlockTarget(null)}
        titleId="unlock-webapp-modal-title"
        title={
          unlockTarget ? `Buka Akses Tool: ${unlockTarget.name}` : "Buka Tool"
        }
        subtitle="Tool berbayar terpisah — setelah terbuka bisa langsung dipakai kapan saja di tab baru."
        maxWidthClass="max-w-lg"
      >
        {unlockTarget && (
          <div className="space-y-3.5">
            {!showCheckout ? (
              <>
                {unlockTarget.pointsCost > 0 && (
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <Coins size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#121215]">
                          Buka Instan dengan Tukar Poin Bintang
                        </p>
                        <p className="text-xs text-[#78350F] mt-0.5">
                          Biaya: <strong>{unlockTarget.pointsCost} ★ pts</strong>{" "}
                          • Saldo Anda:{" "}
                          <strong
                            className={
                              targetEnoughPoints
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }
                          >
                            {learnerPoints.toLocaleString()} pts
                          </strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!targetEnoughPoints || submittingPoints}
                      onClick={() => void handlePointsUnlock()}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 text-xs font-bold text-[#121215] cursor-pointer transition-colors"
                    >
                      <Coins size={13} />
                      <span>
                        {submittingPoints
                          ? "Membuka Akses Tool..."
                          : targetEnoughPoints
                          ? `Tukar ${unlockTarget.pointsCost} ★ Poin & Buka Sekarang`
                          : `Poin Kurang (Butuh ${
                              unlockTarget.pointsCost - learnerPoints
                            } pts lagi)`}
                      </span>
                    </button>
                  </div>
                )}

                {unlockTarget.priceIdr > 0 && (
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <QrCode size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#121215]">
                          Buka Akses via QRIS / Transfer
                        </p>
                        <p className="text-xs text-emerald-900 mt-0.5">
                          Sekali bayar{" "}
                          <strong>{formatIdr(unlockTarget.priceIdr)}</strong>{" "}
                          untuk membuka permanen &ldquo;{unlockTarget.name}&rdquo;.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCheckout(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white cursor-pointer transition-colors"
                    >
                      <span>
                        Bayar • {formatIdr(unlockTarget.priceIdr)} (QRIS /
                        Transfer)
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3.5">
                {unlockTarget.pointsCost > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="text-xs font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                  >
                    &larr; Kembali pilih Tukar Poin
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qris")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                      paymentMethod === "qris"
                        ? "bg-[#121215] text-white border-[#121215]"
                        : "bg-white text-[#5E5E5E] border-[#EAECEF]"
                    }`}
                  >
                    <QrCode size={14} />
                    <span>Scan QRIS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                      paymentMethod === "bank"
                        ? "bg-[#121215] text-white border-[#121215]"
                        : "bg-white text-[#5E5E5E] border-[#EAECEF]"
                    }`}
                  >
                    <Building2 size={14} />
                    <span>Transfer Bank</span>
                  </button>
                </div>

                {paymentMethod === "qris" ? (
                  <div className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] p-4 text-center space-y-2">
                    <p className="text-xs font-bold text-[#121215]">
                      Nominal: {formatIdr(unlockTarget.priceIdr)}
                    </p>
                    {activeQrisUrl ? (
                      <img
                        src={activeQrisUrl}
                        alt="QRIS Pembayaran"
                        className="mx-auto max-h-52 rounded-lg border border-[#EAECEF] bg-white p-1.5 object-contain"
                      />
                    ) : (
                      <p className="text-xs text-[#5E5E5E] py-4">
                        QRIS belum diunggah Admin. Gunakan opsi Transfer Bank di
                        sebelah atau hubungi WhatsApp Admin.
                      </p>
                    )}
                    <p className="text-xs text-[#5E5E5E]">
                      {cfg.merchantName || "Ruang Sosmed 2.0"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5E5E5E]">Bank Tujuan</span>
                      <span className="font-bold text-[#121215]">
                        {cfg.bankName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#5E5E5E]">Nomor Rekening</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(cfg.accountNumber);
                          setCopiedAcc(true);
                          setTimeout(() => setCopiedAcc(false), 1800);
                        }}
                        className="inline-flex items-center gap-1.5 font-mono font-bold text-[#4F39F6] cursor-pointer"
                      >
                        <span>{cfg.accountNumber}</span>
                        {copiedAcc ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5E5E5E]">Atas Nama</span>
                      <span className="font-bold text-[#121215]">
                        {cfg.accountHolder}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#121215]">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full rounded-xl border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#121215]">
                      Email Akun / No. WA
                    </label>
                    <input
                      type="text"
                      value={buyerContact}
                      onChange={(e) => setBuyerContact(e.target.value)}
                      placeholder="email@anda.com"
                      className="w-full rounded-xl border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#121215]">
                    Upload Bukti Transfer (Opsional, dihapus otomatis setelah
                    verifikasi)
                  </label>
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8F9FB] px-4 py-3 text-xs font-semibold text-[#4F39F6] hover:bg-[#EEF2FF] cursor-pointer">
                    <Upload size={14} />
                    <span>
                      {uploadingProof
                        ? "Mengunggah bukti..."
                        : proofPreview
                        ? "Bukti terunggah ✓ (Klik untuk ganti)"
                        : "Pilih Gambar Bukti Bayar"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleProofUpload(e)}
                      className="hidden"
                    />
                  </label>
                </div>

                {errorMsg && (
                  <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">
                    {errorMsg}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleWhatsAppConfirm}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EAECEF] bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2.5 text-xs font-semibold text-[#121215] cursor-pointer"
                  >
                    <MessageCircle size={13} className="text-emerald-600" />
                    <span>Info via WA</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingPurchase || uploadingProof}
                    onClick={() => void handleSubmitQrisPurchase()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>
                      {submittingPurchase
                        ? "Mengirim..."
                        : "Kirim Konfirmasi Pembayaran"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
