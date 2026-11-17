"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  QrCode,
  CreditCard,
  Check,
  Copy,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Upload,
} from "lucide-react";
import type { LandingPaymentConfig, PricingTierItem } from "@/types/landing";

export interface CheckoutItem {
  name: string;
  price: string;
  period?: string;
  badge?: string;
  description?: string;
  features?: string[];
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

interface PaymentCheckoutModalProps {
  open: boolean;
  item: CheckoutItem | PricingTierItem | null;
  paymentConfig?: LandingPaymentConfig;
  isPreviewMode?: boolean;
  onClose: () => void;
  onProceedAuth?: (mode?: "login" | "register") => void;
}

export function PaymentCheckoutModal({
  open,
  item,
  paymentConfig,
  isPreviewMode = false,
  onClose,
  onProceedAuth,
}: PaymentCheckoutModalProps) {
  const [method, setMethod] = useState<"qris" | "bank">("qris");
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [proofUrl, setProofUrl] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const qrCodeUrl = item.qrCodeUrl || paymentConfig?.qrCodeUrl || "";
  const bankName = item.bankName || paymentConfig?.bankName || "BCA / Mandiri / QRIS";
  const accountNumber = item.accountNumber || paymentConfig?.accountNumber || "123-456-7890";
  const accountHolder = item.accountHolder || paymentConfig?.accountHolder || "PT Ruang Sosmed Indonesia";
  const merchantName = paymentConfig?.merchantName || "Ruang Sosmed 2.0";
  const whatsappNumber = (paymentConfig?.whatsappNumber || "6281234567890").replace(/\D/g, "");
  const instructions =
    paymentConfig?.paymentInstructions ||
    "Scan kode QRIS di atas melalui m-Banking atau e-wallet (GoPay, OVO, Dana, ShopeePay) Anda. Setelah pembayaran berhasil, kirim konfirmasi untuk aktivasi akses.";

  const handleCopyAccount = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(accountNumber).catch(() => {});
    }
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProofUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo Admin ${merchantName}, saya ingin konfirmasi pembayaran:\n` +
        `• Paket: ${item.name}\n` +
        `• Nominal: ${item.price}${item.period ? ` (${item.period})` : ""}\n` +
        `• Metode: ${method === "qris" ? "QRIS Instan" : `Transfer ${bankName}`}\n` +
        `• Nama: ${buyerName || "-"}\n` +
        `• Email: ${buyerEmail || "-"}\n` +
        `Mohon dibantu aktivasi aksesnya. Terima kasih!`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <QrCode size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="payment-modal-title" className="text-sm font-bold text-slate-900">
                  Pembayaran Paket &amp; Aktivasi Akses
                </h3>
                {isPreviewMode && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Preview Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {merchantName} • Selesaikan pembayaran melalui QRIS atau Transfer Bank
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal pembayaran"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Selected Package Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">
                  {item.name}
                </span>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <div className="sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Tagihan
              </span>
              <span className="text-xl font-black text-indigo-600">
                {item.price}
              </span>
              {item.period && (
                <span className="text-[11px] text-slate-500 ml-1">
                  /{item.period}
                </span>
              )}
            </div>
          </div>

          {/* Method Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setMethod("qris")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                method === "qris"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <QrCode size={14} />
              <span>Scan QRIS Instan</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("bank")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                method === "bank"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard size={14} />
              <span>Transfer Rekening Bank</span>
            </button>
          </div>

          {/* Payment Details Box */}
          {method === "qris" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col items-center text-center space-y-3">
              {qrCodeUrl ? (
                <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="QRIS Pembayaran"
                    className="h-52 w-52 object-contain"
                  />
                </div>
              ) : (
                <div className="h-48 w-48 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-4">
                  <QrCode size={42} className="text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    QRIS Belum Diunggah
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Atur gambar QRIS di Inspector &rarr; Tab Pembayaran/QRIS.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {["QRIS", "GoPay", "OVO", "DANA", "ShopeePay", "m-Banking"].map((w) => (
                  <span
                    key={w}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600"
                  >
                    {w}
                  </span>
                ))}
              </div>

              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                {instructions}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Bank / Kanal Transfer
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {bankName}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                  <ShieldCheck size={13} />
                  <span>Rekening Resmi</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                    Nomor Rekening
                  </span>
                  <span className="text-base font-mono font-extrabold text-slate-900">
                    {accountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedAcc ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-600">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">
                  Atas Nama Pemilik Rekening
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {accountHolder}
                </span>
              </div>
            </div>
          )}

          {/* Buyer Information & Optional Proof */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Data Konfirmasi Pembeli
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Email Akun / WhatsApp
                </label>
                <input
                  type="text"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full rounded-xl bg-white px-3 py-2 text-xs border border-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                <Upload size={13} />
                <span>{proofUrl ? "Bukti Transfer Terlampir ✓" : "Lampirkan Bukti Transfer (Opsional)"}</span>
                <input
                  key="checkout-proof-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="hidden"
                />
              </label>

              {proofUrl && (
                <button
                  type="button"
                  onClick={() => setProofUrl("")}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  Hapus Bukti
                </button>
              )}
            </div>
          </div>

          {submitted && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                Konfirmasi pembayaran diarahkan ke WhatsApp Admin. Anda juga dapat langsung mendaftar/masuk ke akun Anda.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onProceedAuth?.("register");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <span>Sudah punya akun / Daftar dulu</span>
            <ArrowRight size={13} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleConfirmWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle size={14} />
              <span>Konfirmasi via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
