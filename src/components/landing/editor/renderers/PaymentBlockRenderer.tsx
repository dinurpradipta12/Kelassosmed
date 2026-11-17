"use client";

import React from "react";
import { QrCode, CreditCard, ShieldCheck } from "lucide-react";
import type { PaymentBlock } from "@/types/landing";

interface PaymentBlockRendererProps {
  block: PaymentBlock;
}

export function PaymentBlockRenderer({ block }: PaymentBlockRendererProps) {
  const sectionTitle = block.sectionTitle || block.title || (block.data && block.data.heading) || "Informasi pembayaran";
  const price = typeof block.price === "number" ? block.price : Number(block.price || (block.data && block.data.price) || 0);
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(isNaN(price) ? 0 : price);

  const qrCodeUrl = block.qrCodeUrl || (block.data && block.data.qrCodeUrl);
  const bankName = block.bankName || (block.data && block.data.bankName) || "BCA / Mandiri / QRIS";
  const accountNumber = block.accountNumber || (block.data && block.data.accountNumber) || "123-456-7890";
  const accountHolder = block.accountHolder || (block.data && block.data.accountHolder) || "PT Ruang Sosmed Indonesia";
  const instructions = block.paymentInstructions || "Scan kode QRIS di atas melalui m-Banking atau e-wallet pilihan Anda.";

  return (
    <div className="py-8 sm:py-12 border-t border-slate-100">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {sectionTitle}
        </h2>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
          <ShieldCheck size={13} />
          <span>Transaksi Aman &amp; Terverifikasi</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-6">
        {/* Nominal Price Display */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Pembayaran
            </span>
            <span className="text-2xl font-extrabold text-slate-900">
              {formattedPrice}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
            {bankName}
          </span>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-200 text-center space-y-3">
          {qrCodeUrl ? (
            <div className="h-44 w-44 rounded-lg overflow-hidden border border-slate-200 p-2 bg-white flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code Pembayaran"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-44 w-44 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
              <QrCode size={36} className="text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-600">
                Placeholder QR Code
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Upload QR Code dari pengaturan blok
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500 max-w-sm">
            {instructions}
          </p>
        </div>

        {/* Bank Account Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <CreditCard size={15} className="text-slate-500" />
            <span>Alternatif Transfer Bank</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <span className="text-slate-400 text-[11px] block">Nomor Rekening:</span>
              <span className="font-mono font-bold text-slate-800">{accountNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Atas Nama:</span>
              <span className="font-semibold text-slate-800">{accountHolder}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
