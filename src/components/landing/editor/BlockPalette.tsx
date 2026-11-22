"use client";

import React from "react";
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Video,
  BookOpen,
  ShoppingBag,
  Star,
  CreditCard,
  GripVertical,
  Plus,
  Layers,
  DollarSign,
  MessageSquare,
  HelpCircle,
  Megaphone,
  Award,
  Palette,
} from "lucide-react";
import type { BlockType } from "@/types/landing";

interface BlockItemMeta {
  type: BlockType;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
}

const PRIMARY_LANDING_BLOCKS: BlockItemMeta[] = [
  {
    type: "hero",
    title: "Hero Banner",
    description: "Judul utama, visual & CTA",
    icon: Sparkles,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    type: "system_showcase",
    title: "Ekosistem & Alur",
    description: "Tab fitur, Rumi XP & Studio",
    icon: Layers,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    type: "features",
    title: "Keunggulan (Grid)",
    description: "4 kartu keunggulan roadmap",
    icon: Award,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    type: "topics",
    title: "Kurikulum & Silabus",
    description: "Daftar seri & modul belajar",
    icon: Layers,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    type: "pricing",
    title: "Paket Harga (QRIS)",
    description: "Per-paket + modal pembayaran",
    icon: DollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    type: "testimonial",
    title: "Testimoni Alumni",
    description: "Review & rating bintang",
    icon: MessageSquare,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    type: "faq",
    title: "FAQ Tanya Jawab",
    description: "Daftar pertanyaan accordion",
    icon: HelpCircle,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    type: "cta",
    title: "CTA Banner",
    description: "Ajakan daftar penutup",
    icon: Megaphone,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
  },
];

const PRODUCT_MEDIA_BLOCKS: BlockItemMeta[] = [
  {
    type: "text",
    title: "Teks",
    description: "Penjelasan & artikel produk",
    icon: FileText,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    type: "image",
    title: "Gambar",
    description: "Galeri foto atau banner",
    icon: ImageIcon,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    type: "video",
    title: "Video",
    description: "Video demo atau testimoni",
    icon: Video,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    type: "class",
    title: "Kelas",
    description: "Daftar kelas & jadwal",
    icon: BookOpen,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    type: "catalog",
    title: "Katalog Produk",
    description: "Daftar produk & harga",
    icon: ShoppingBag,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    type: "benefits",
    title: "Manfaat",
    description: "Keunggulan bernomor 1-3",
    icon: Star,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    type: "payment",
    title: "Pembayaran",
    description: "Rekening & QRIS langsung",
    icon: CreditCard,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
];

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
  onOpenGlobalSettings?: (tab?: "general" | "header" | "payment" | "theme") => void;
}

export function BlockPalette({ onAddBlock, onOpenGlobalSettings }: BlockPaletteProps) {
  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("application/x-landing-block-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const renderBlockCard = (item: BlockItemMeta) => {
    const Icon = item.icon;
    return (
      <div
        key={item.type}
        draggable
        onDragStart={(e) => handleDragStart(e, item.type)}
        onClick={() => onAddBlock(item.type)}
        className="group relative flex items-center justify-between p-2 rounded-xl border border-slate-200/90 bg-white hover:border-slate-400 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing hover:bg-slate-50/50"
        title={`Klik atau tarik untuk tambah ${item.title}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded-lg ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 border border-black/5`}
          >
            <Icon size={15} />
          </div>
          <div className="min-w-0 pr-1">
            <h3 className="text-xs font-bold text-slate-800 truncate leading-tight">
              {item.title}
            </h3>
            <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
              {item.description}
            </p>
          </div>
        </div>

        <div className="text-slate-300 group-hover:text-slate-500 shrink-0 pl-1 transition-colors">
          <GripVertical size={15} />
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4 overflow-y-auto shrink-0 select-none flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header Elemen */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ELEMEN
          </span>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            Tambah blok
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Tarik ke posisi yang diinginkan atau klik untuk menambah di bagian bawah.
          </p>
        </div>

        {/* Shortcut Pengaturan Global (Header, Warna, QRIS) */}
        {onOpenGlobalSettings && (
          <button
            type="button"
            onClick={() => onOpenGlobalSettings("header")}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-left transition-colors cursor-pointer shadow-2xs"
          >
            <Palette size={15} className="shrink-0 text-amber-300" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold truncate">
                Header, Warna &amp; QRIS
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                Edit navbar, tema &amp; rekening
              </div>
            </div>
          </button>
        )}

        {/* Group 1: Bagian Landing Utama */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block pt-1">
            Landing &amp; Kurikulum
          </span>
          <div className="space-y-1.5">
            {PRIMARY_LANDING_BLOCKS.map(renderBlockCard)}
          </div>
        </div>

        {/* Group 2: Elemen Produk & Media */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Elemen Produk &amp; Media
          </span>
          <div className="space-y-1.5">
            {PRODUCT_MEDIA_BLOCKS.map(renderBlockCard)}
          </div>
        </div>
      </div>

      {/* Footer Info Tips */}
      <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-slate-500 mb-1">
          <Plus size={12} />
          <span>Tips Editor</span>
        </div>
        <p className="leading-relaxed">
          Klik blok atau Header/Footer di canvas untuk mengatur isi &amp; warnanya.
        </p>
      </div>
    </aside>
  );
}
