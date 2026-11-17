"use client";

import React from "react";
import type { BenefitsBlock } from "@/types/landing";

interface BenefitsBlockRendererProps {
  block: BenefitsBlock;
}

export function BenefitsBlockRenderer({ block }: BenefitsBlockRendererProps) {
  const sectionTitle = block.sectionTitle || block.title || (block.data && block.data.heading) || "Kenapa memilih produk ini?";
  const items = Array.isArray(block.items) && block.items.length > 0 
    ? block.items 
    : (block.data && Array.isArray(block.data.items) 
      ? block.data.items.map((it: any, idx: number) => ({
          id: `item-${idx}`,
          number: idx + 1,
          title: it.title || `Manfaat ${idx + 1}`,
          description: it.description || "",
        }))
      : [
          {
            id: "1",
            number: 1,
            title: "Kualitas Premium Terjamin",
            description: "Dibuat dengan bahan dan material pilihan berstandar tinggi yang awet digunakan dalam jangka panjang.",
          },
          {
            id: "2",
            number: 2,
            title: "Pengiriman Super Cepat",
            description: "Pesanan diproses dalam 24 jam dan dikirim menggunakan kurir terpercaya langsung ke depan pintu Anda.",
          },
          {
            id: "3",
            number: 3,
            title: "Garansi 100% Kepuasan",
            description: "Jaminan uang kembali atau penggantian produk baru jika barang yang Anda terima tidak sesuai deskripsi.",
          },
        ]);

  return (
    <div className="py-8 sm:py-12 border-t border-slate-100">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {sectionTitle}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item, index) => {
          const num = item.number !== undefined ? item.number : index + 1;
          return (
            <div
              key={item.id || index}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
            >
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                {num}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
