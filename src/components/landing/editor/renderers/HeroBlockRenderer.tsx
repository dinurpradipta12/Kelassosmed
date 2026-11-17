"use client";

import React from "react";
import { ArrowRight, Sparkles, Image as ImageIcon } from "lucide-react";
import type { HeroBlock } from "@/types/landing";

interface HeroBlockRendererProps {
  block: HeroBlock;
}

export function HeroBlockRenderer({ block }: HeroBlockRendererProps) {
  const badge = block.badge || block.badgeText || block.eyebrow || "PRODUK PILIHAN UNTUK ANDA";
  const headline = block.headline || block.title || "Tampilkan produk Anda dengan lebih meyakinkan";
  const subheadline = block.subheadline || block.body || "Jelaskan manfaat utama produk Anda dengan bahasa yang jelas dan persuasif untuk menarik minat calon pembeli.";
  const ctaText = block.ctaText || block.buttonLabel || "Beli Sekarang";
  const imageUrl = block.imageUrl || (block.data && block.data.imageUrl);

  return (
    <div className="py-6 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Kolom Kiri: Teks & CTA */}
        <div className="md:col-span-7 space-y-4">
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
              <Sparkles size={12} className="text-amber-500" />
              <span>{badge}</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.2]">
            {headline}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
            {subheadline}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href={block.ctaLink || "#"}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all pointer-events-none"
            >
              <span>{ctaText}</span>
              <ArrowRight size={15} />
            </a>
          </div>
        </div>

        {/* Kolom Kanan: Placeholder Visual / Foto Produk */}
        <div className="md:col-span-5">
          <div className="relative aspect-4/3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs flex items-center justify-center group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={headline}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-6 text-center space-y-2">
                <div className="h-12 w-12 rounded-xl bg-slate-200/80 text-slate-500 mx-auto flex items-center justify-center">
                  <ImageIcon size={22} />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Placeholder Foto Produk
                </p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                  Tambahkan URL gambar produk di panel pengaturan sebelah kanan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
