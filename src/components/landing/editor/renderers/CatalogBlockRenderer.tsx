"use client";

import React from "react";
import { ShoppingBag, ArrowRight, Image as ImageIcon } from "lucide-react";
import type { CatalogBlock } from "@/types/landing";

interface CatalogBlockRendererProps {
  block: CatalogBlock;
  onSelectItem?: (item: any) => void;
}

export function CatalogBlockRenderer({ block, onSelectItem }: CatalogBlockRendererProps) {
  const accent = block.style?.accentColor || "#0F172A";
  const sectionTitle = block.sectionTitle || block.title || (block.data && block.data.heading) || "Katalog Produk & Penawaran";
  const items = Array.isArray(block.items) && block.items.length > 0
    ? block.items
    : [
        {
          id: "item-1",
          title: "Template Dokumen Kerja & Rate Card SOP",
          price: "Rp 79.000",
          tag: "Digital Asset",
          description: "Format spreadsheet & SOP handling klien 30 hari pertama siap pakai.",
          imageUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=400&auto=format&fit=crop",
          ctaText: "Beli Template",
        },
        {
          id: "item-2",
          title: "Audit Akun & Review Portofolio 1-on-1",
          price: "Rp 199.000",
          tag: "Layanan Mentoring",
          description: "Sesi private 45 menit bedah portofolio dan feedback personal dari lead mentor.",
          imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=400&auto=format&fit=crop",
          ctaText: "Booking Sesi",
        },
      ];

  return (
    <div className="py-8 sm:py-12 border-t border-slate-100">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {sectionTitle}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Pilih paket dan produk digital penunjang karir Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((it, idx) => (
          <div
            key={it.id || idx}
            className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="aspect-16/9 bg-slate-200 relative overflow-hidden">
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={it.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    <ImageIcon size={24} />
                  </div>
                )}
                {it.tag && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-slate-800 shadow-xs">
                    {it.tag}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {it.title}
                </h3>
                {it.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {it.description}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Harga</span>
                <span className="text-sm font-extrabold text-slate-900">{it.price}</span>
              </div>
              <button
                type="button"
                style={{ backgroundColor: accent }}
                onClick={(e) => {
                  if (onSelectItem) {
                    e.stopPropagation();
                    onSelectItem({
                      name: it.title,
                      price: it.price,
                      badge: it.tag,
                      description: it.description,
                    });
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90 ${
                  onSelectItem ? "cursor-pointer" : "pointer-events-none"
                }`}
              >
                <span>{it.ctaText || "Detail"}</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
