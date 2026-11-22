"use client";

import React from "react";
import type { BenefitsBlock } from "@/types/landing";

interface BenefitsBlockRendererProps {
  block: BenefitsBlock;
  accentColor?: string;
}

export function BenefitsBlockRenderer({
  block,
  accentColor = "#4F39F6",
}: BenefitsBlockRendererProps) {
  const data = block.data || {};
  const eyebrow = block.eyebrow || data.eyebrow;
  const sectionTitle =
    block.sectionTitle ||
    block.title ||
    data.heading ||
    "Alur Belajar & Keunggulan Utama";
  const subtitle = block.subtitle || data.subtitle;

  const items =
    Array.isArray(block.items) && block.items.length > 0
      ? block.items
      : Array.isArray(data.items) && data.items.length > 0
      ? data.items.map((it: any, idx: number) => ({
          id: it.id || `item-${idx}`,
          number: it.number ?? idx + 1,
          tag: it.tag,
          title: it.title || `Langkah ${idx + 1}`,
          description: it.description || "",
        }))
      : [
          {
            id: "1",
            number: 1,
            title: "Kualitas Premium Terjamin",
            description:
              "Dibuat dengan bahan dan material pilihan berstandar tinggi yang awet digunakan dalam jangka panjang.",
          },
          {
            id: "2",
            number: 2,
            title: "Pengiriman Super Cepat",
            description:
              "Pesanan diproses dalam 24 jam dan dikirim menggunakan kurir terpercaya langsung ke depan pintu Anda.",
          },
          {
            id: "3",
            number: 3,
            title: "Garansi 100% Kepuasan",
            description:
              "Jaminan uang kembali atau penggantian produk baru jika barang yang Anda terima tidak sesuai deskripsi.",
          },
        ];

  const gridColsClass =
    items.length === 2 || items.length === 4
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div>
      <div className="text-center max-w-2xl mx-auto mb-10">
        {eyebrow && (
          <p
            style={{ color: accentColor }}
            className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
          >
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]">
          {sectionTitle}
        </h2>
        {subtitle && (
          <p className="mt-2 text-xs sm:text-sm text-[#5E5E5E] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className={`grid ${gridColsClass} gap-5`}>
        {items.map((item: any, index: number) => {
          const rawNum = item.number !== undefined ? item.number : index + 1;
          const formattedNum = String(rawNum).padStart(2, "0");
          return (
            <div
              key={item.id || index}
              className="group p-6 rounded-2xl bg-[#F8F9FB] border border-[#EAECEF] hover:bg-white hover:border-[#D1D5DB] hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  style={{ backgroundColor: accentColor }}
                  className="h-8 px-2.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center justify-center shadow-2xs"
                >
                  LANGKAH {formattedNum}
                </div>
                {item.tag && (
                  <span className="inline-flex items-center rounded-full bg-white border border-[#EAECEF] px-2.5 py-0.5 text-[10px] font-bold text-[#5E5E5E]">
                    {item.tag}
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-[#121215] leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-[#5E5E5E] leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
