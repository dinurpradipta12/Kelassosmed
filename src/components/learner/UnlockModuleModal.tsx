"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
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
} from "lucide-react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import {
  useRuangSosmedStore,
  DEFAULT_LEARNER_PRO_CONFIG,
  buildUnlockItemKey,
  formatIdr,
  getActiveSessionUser,
} from "@/context/RuangSosmedStore";
import { supabase, STORAGE_BUCKETS } from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";

export interface UnlockModuleTarget {
  courseTitle: string;
  chapterId?: string | null;
  chapterTitle?: string;
  reason: string;
  maxModules?: number;
  canUnlockWithPoints: boolean;
  pointsCost: number;
  canBuyPerMaterial: boolean;
  priceIdr: number;
  initialCheckout?: boolean;
}

interface UnlockModuleModalProps {
  target: UnlockModuleTarget | null;
  onClose: () => void;
  onUnlockedChapter?: (chapterId?: string | null) => void;
  onOpenUpgradeToPro: () => void;
  onShowToast: (msg: string) => void;
}

export function UnlockModuleModal({
  target,
  onClose,
  onUnlockedChapter,
  onOpenUpgradeToPro,
  onShowToast,
}: UnlockModuleModalProps) {
  const {
    learnerPoints,
    learnerProConfig,
    unlockModuleWithPoints,
    submitProUpgradeRequest,
  } = useRuangSosmedStore();

  const cfg = {
    ...DEFAULT_LEARNER_PRO_CONFIG,
    ...(learnerProConfig || {}),
  };

  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bank">("qris");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [proofPreview, setProofPreview] = useState("");
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [submittingPoints, setSubmittingPoints] = useState(false);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      const activeUser = getActiveSessionUser();
      setShowCheckout(
        Boolean(
          target.initialCheckout &&
            target.canBuyPerMaterial &&
            target.priceIdr > 0
        )
      );
      setPaymentMethod("qris");
      setBuyerName(activeUser.name || "");
      setBuyerContact(activeUser.email || "");
      setProofPreview("");
      setErrorMsg(null);
      setCopiedAcc(false);
    }
  }, [target]);

  if (!target) return null;

  const displayTitle = target.chapterTitle || target.courseTitle;
  const enoughPoints = learnerPoints >= target.pointsCost;
  const activeQrisUrl = cfg.qrCodeUrl || "";

  const handlePointsUnlock = async () => {
    setErrorMsg(null);
    setSubmittingPoints(true);
    try {
      const res = await unlockModuleWithPoints({
        courseTitle: target.courseTitle,
        chapterId: target.chapterId,
        chapterTitle: target.chapterTitle,
        pointsCost: target.pointsCost,
      });
      if (!res.ok) {
        setErrorMsg(res.message);
        onShowToast(res.message);
        return;
      }
      onShowToast(res.message);
      const unlockedChapId = target.chapterId;
      onClose();
      onUnlockedChapter?.(unlockedChapId);
    } finally {
      setSubmittingPoints(false);
    }
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
        folderPath: `${uid}/item-unlock-proofs`,
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
      `Saya membayar buka materi satuan: *${displayTitle}* (Kelas: ${target.courseTitle})`,
      `Nominal: *${formatIdr(target.priceIdr)}*`,
      `Metode: *${paymentMethod === "qris" ? "Scan QRIS" : `Transfer ${cfg.bankName}`}*`,
      buyerName.trim() ? `Nama: ${buyerName.trim()}` : null,
      buyerContact.trim() ? `Email/WA: ${buyerContact.trim()}` : null,
      "Mohon aktifkan akses materi tersebut. Terima kasih!",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/${normalizedWa}?text=${encodeURIComponent(lines)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSubmitPerItemPurchase = async () => {
    if (!buyerName.trim() || !buyerContact.trim()) {
      setErrorMsg("Nama lengkap dan Email / No. WhatsApp wajib diisi.");
      return;
    }
    setErrorMsg(null);
    setSubmittingPurchase(true);
    try {
      const itemKey = buildUnlockItemKey(target.courseTitle, target.chapterId);
      const res = await submitProUpgradeRequest({
        packageId: "item-unlock",
        packageName: "Buka Materi Satuan",
        priceLabel: formatIdr(target.priceIdr),
        buyerName: buyerName.trim(),
        buyerContact: buyerContact.trim(),
        paymentMethod,
        proofUrl: proofPreview || undefined,
        billingCycle: "single_item",
        durationDays: 0,
        requestType: "item_unlock",
        targetItemKey: itemKey,
        targetItemTitle: `${target.courseTitle}${target.chapterTitle ? ` — ${target.chapterTitle}` : ""}`,
      });
      if (!res.ok) {
        setErrorMsg(res.error || "Gagal mengirim konfirmasi pembayaran.");
        return;
      }
      onShowToast(
        `⏳ Konfirmasi pembelian "${displayTitle}" (${formatIdr(target.priceIdr)}) terkirim! Admin akan segera memverifikasi.`
      );
      onClose();
    } finally {
      setSubmittingPurchase(false);
    }
  };

  return (
    <ModalDialog
      open={Boolean(target)}
      onClose={onClose}
      titleId="unlock-module-modal-title"
      title={`Buka Video / Materi PRO: ${displayTitle}`}
      subtitle={
        target.reason === "basic_limit_reached"
          ? `Paket Basic membuka maksimal ${target.maxModules || 6} modul awal per materi. Pilih cara di bawah untuk membuka video/materi ini.`
          : "Video ini khusus member berbayar. Pilih bayar satuan per video atau ambil paket PRO untuk membuka seluruh materi."
      }
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-3.5">
        {!showCheckout ? (
          <>
            {/* Option A: Unlock Instantly with Points */}
            {target.canUnlockWithPoints && target.pointsCost > 0 && (
              <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Coins size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        Buka Instan dengan Potong Poin
                      </p>
                      <p className="text-[11px] text-[#78350F] mt-0.5">
                        Biaya: <strong>{target.pointsCost} ★ pts</strong> • Saldo Anda:{" "}
                        <strong
                          className={
                            enoughPoints ? "text-emerald-700" : "text-rose-600"
                          }
                        >
                          {learnerPoints.toLocaleString()} pts
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!enoughPoints || submittingPoints}
                  onClick={() => void handlePointsUnlock()}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 text-xs font-bold text-[#121215] cursor-pointer transition-colors"
                >
                  <Coins size={13} />
                  <span>
                    {submittingPoints
                      ? "Membuka Modul..."
                      : enoughPoints
                      ? `Tukar ${target.pointsCost} Poin & Buka Sekarang`
                      : `Poin Kurang (Butuh ${target.pointsCost - learnerPoints} pts lagi)`}
                  </span>
                </button>
              </div>
            )}

            {/* Option B: Pay Per Material */}
            {target.canBuyPerMaterial && target.priceIdr > 0 && (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <QrCode size={16} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        Bayar per Video / Materi Ini Saja
                      </p>
                      <p className="text-[11px] text-emerald-900 mt-0.5">
                        Sekali bayar <strong>{formatIdr(target.priceIdr)}</strong> permanen untuk memutar video ini tanpa perlu berlangganan paket.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white cursor-pointer transition-colors"
                >
                  <span>Bayar per Video • {formatIdr(target.priceIdr)} (QRIS / Transfer)</span>
                </button>
              </div>
            )}

            {/* Option C: Upgrade to Pro Unlimited */}
            <div className="rounded-xl bg-[#EEF2FF]/70 border border-[#C7D2FE] p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4F39F6] text-white">
                  <Zap size={15} fill="currentColor" />
                </span>
                <div>
                  <p className="text-xs font-bold text-[#121215]">
                    Ambil Paket PRO (Akses Semua Materi)
                  </p>
                  <p className="text-[11px] text-[#475569] mt-0.5">
                    Buka 100% semua video &amp; modul PRO tanpa batas, plus Sertifikat HD &amp; Review 1-on-1 bersama Mentor.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgradeToPro();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer transition-colors"
              >
                <Zap size={13} fill="currentColor" />
                <span>Ambil Paket PRO (Trial 3/7 Hari &amp; Bulanan)</span>
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
              >
                ← Kembali ke pilihan buka materi
              </button>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                {formatIdr(target.priceIdr)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setPaymentMethod("qris")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold cursor-pointer ${
                  paymentMethod === "qris"
                    ? "bg-white text-[#4F39F6] shadow-2xs"
                    : "text-[#5E5E5E]"
                }`}
              >
                <QrCode size={14} />
                <span>Scan QRIS</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("bank")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold cursor-pointer ${
                  paymentMethod === "bank"
                    ? "bg-white text-[#4F39F6] shadow-2xs"
                    : "text-[#5E5E5E]"
                }`}
              >
                <Building2 size={14} />
                <span>Transfer Bank</span>
              </button>
            </div>

            {paymentMethod === "qris" ? (
              <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 text-center space-y-2">
                {activeQrisUrl ? (
                  <div className="inline-block rounded-xl bg-white p-3 border border-[#EAECEF]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeQrisUrl}
                      alt="QRIS"
                      className="h-44 w-44 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#5E5E5E]">
                    QRIS belum diunggah Admin — gunakan Transfer Bank di sebelah.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5E5E5E]">Bank</span>
                  <span className="font-bold">{cfg.bankName || "BCA / Mandiri"}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#5E5E5E]">Rekening</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold">{cfg.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(cfg.accountNumber);
                        } catch {}
                        setCopiedAcc(true);
                        setTimeout(() => setCopiedAcc(false), 1500);
                      }}
                      className="rounded border px-2 py-0.5 text-[10px] font-bold text-[#4F39F6] bg-white cursor-pointer"
                    >
                      {copiedAcc ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5E5E5E]">Atas Nama</span>
                  <span className="font-bold">{cfg.accountHolder}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="rounded-lg bg-white px-3 py-2 text-xs border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                />
                <input
                  type="text"
                  value={buyerContact}
                  onChange={(e) => setBuyerContact(e.target.value)}
                  placeholder="Email / No. WhatsApp"
                  className="rounded-lg bg-white px-3 py-2 text-xs border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold border border-[#EAECEF] cursor-pointer">
                  <Upload size={12} />
                  <span>{proofPreview ? "Bukti Terlampir ✓" : "Upload Bukti Bayar"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="hidden"
                  />
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#5E5E5E]">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  Verifikasi Admin
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleWhatsAppConfirm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 cursor-pointer"
              >
                <MessageCircle size={13} />
                <span>Konfirmasi WA</span>
              </button>
              <button
                type="button"
                disabled={submittingPurchase}
                onClick={() => void handleSubmitPerItemPurchase()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>
                  {submittingPurchase ? "Mengirim..." : "Kirim Konfirmasi Bayar"}
                </span>
              </button>
            </div>
          </div>
        )}

        {errorMsg && !showCheckout && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 flex items-center gap-2">
            <Lock size={12} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
