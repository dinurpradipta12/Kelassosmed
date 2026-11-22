"use client";

import React, { useRef, useState } from "react";
import {
  Palette,
  Trash2,
  ArrowLeft,
  Upload,
  Plus,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  LayoutTemplate,
  QrCode,
  Paintbrush,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import type {
  LandingPageData,
  LandingBlock,
  HeroBlock,
  BenefitsBlock,
  SystemShowcaseBlock,
  SystemShowcaseTabItem,
  PaymentBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  ClassBlock,
  CatalogBlock,
  BlockStyleConfig,
  LandingHeaderConfig,
  LandingPaymentConfig,
  LandingFooterConfig,
  PricingTierItem,
} from "@/types/landing";
import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_PAYMENT_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_SYSTEM_SHOWCASE_TABS,
} from "@/types/landing";
import { STORAGE_BUCKETS } from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";

export type GlobalInspectorTab = "general" | "header" | "payment" | "theme";

interface InspectorPanelProps {
  pageData: LandingPageData;
  selectedBlock: LandingBlock | null;
  globalTab: GlobalInspectorTab;
  onChangeGlobalTab: (tab: GlobalInspectorTab) => void;
  onUpdatePageData: (field: keyof LandingPageData, value: any) => void;
  onUpdateBlock: (updatedBlock: LandingBlock) => void;
  onDeleteBlock: (id: string) => void;
  onDeselectBlock: () => void;
  onLoadPreset?: (preset: "default" | "official") => void;
  onTestPaymentModal?: () => void;
}

const COLOR_SWATCHES = [
  "#FFFFFF",
  "#F8F9FB",
  "#F1F5F9",
  "#121215",
  "#4F39F6",
  "#2563EB",
  "#10B981",
  "#EA580C",
  "#7C3AED",
  "#EC4899",
];

export function InspectorPanel({
  pageData,
  selectedBlock,
  globalTab,
  onChangeGlobalTab,
  onUpdatePageData,
  onUpdateBlock,
  onDeleteBlock,
  onDeselectBlock,
  onLoadPreset,
  onTestPaymentModal,
}: InspectorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blockFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const globalQrisInputRef = useRef<HTMLInputElement>(null);
  const footerLogoInputRef = useRef<HTMLInputElement>(null);

  const [expandedTopicIdx, setExpandedTopicIdx] = useState<number | null>(0);
  const [expandedTierIdx, setExpandedTierIdx] = useState<number | null>(1);

  const headerCfg: LandingHeaderConfig = {
    ...DEFAULT_HEADER_CONFIG,
    ...(pageData.headerConfig || {}),
  };
  const paymentCfg: LandingPaymentConfig = {
    ...DEFAULT_PAYMENT_CONFIG,
    ...(pageData.paymentConfig || {}),
  };
  const footerCfg: LandingFooterConfig = {
    ...DEFAULT_FOOTER_CONFIG,
    ...(pageData.footerConfig || {}),
  };

  const updateHeaderCfg = (patch: Partial<LandingHeaderConfig>) => {
    onUpdatePageData("headerConfig", { ...headerCfg, ...patch });
  };

  const updatePaymentCfg = (patch: Partial<LandingPaymentConfig>) => {
    onUpdatePageData("paymentConfig", { ...paymentCfg, ...patch });
  };

  const updateFooterCfg = (patch: Partial<LandingFooterConfig>) => {
    onUpdatePageData("footerConfig", { ...footerCfg, ...patch });
  };

  // Helper for updating nested block field (updates both top-level and data record for compatibility)
  const handleFieldChange = (field: string, value: any) => {
    if (!selectedBlock) return;
    const updated: LandingBlock = {
      ...selectedBlock,
      [field]: value,
      data: {
        ...(selectedBlock.data || {}),
        [field]: value,
      },
    };
    onUpdateBlock(updated);
  };

  const handleStyleChange = (patch: Partial<BlockStyleConfig>) => {
    if (!selectedBlock) return;
    onUpdateBlock({
      ...selectedBlock,
      style: {
        ...(selectedBlock.style || {}),
        ...patch,
      },
    });
  };

  const handleImageFileRead = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (imageUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "landing",
        fileName: file.name,
        maxWidth: 1440,
        maxHeight: 900,
        quality: 0.82,
      });
      onResult(url);
    } catch {}
  };

  const renderBlockStyleEditor = () => {
    if (!selectedBlock) return null;
    const st = selectedBlock.style || {};

    return (
      <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Paintbrush size={13} className="text-indigo-600" />
            <span>Pengaturan Warna &amp; Tampilan</span>
          </span>
          {(st.bgColor || st.textColor || st.accentColor || st.paddingY) && (
            <button
              type="button"
              onClick={() =>
                onUpdateBlock({
                  ...selectedBlock,
                  style: {},
                })
              }
              className="text-[10px] font-semibold text-rose-500 hover:underline cursor-pointer"
            >
              Reset Warna
            </button>
          )}
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Warna Latar Section
          </label>
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {COLOR_SWATCHES.slice(0, 6).map((c) => (
              <button
                key={`bg-${c}`}
                type="button"
                onClick={() => handleStyleChange({ bgColor: c })}
                style={{ backgroundColor: c }}
                title={c}
                className={`h-5 w-5 rounded-full border cursor-pointer transition-transform ${
                  st.bgColor === c ? "ring-2 ring-indigo-600 scale-110" : "border-slate-300"
                }`}
              />
            ))}
            <input
              type="color"
              value={st.bgColor || "#FFFFFF"}
              onChange={(e) => handleStyleChange({ bgColor: e.target.value })}
              className="h-6 w-8 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
              title="Pilih warna kustom"
            />
          </div>
        </div>

        {/* Accent / Button Color */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Warna Aksen &amp; Tombol
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_SWATCHES.slice(4).map((c) => (
              <button
                key={`acc-${c}`}
                type="button"
                onClick={() => handleStyleChange({ accentColor: c })}
                style={{ backgroundColor: c }}
                title={c}
                className={`h-5 w-5 rounded-full border cursor-pointer transition-transform ${
                  st.accentColor === c ? "ring-2 ring-slate-900 scale-110" : "border-slate-300"
                }`}
              />
            ))}
            <input
              type="color"
              value={st.accentColor || "#4F39F6"}
              onChange={(e) => handleStyleChange({ accentColor: e.target.value })}
              className="h-6 w-8 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
              title="Pilih warna aksen kustom"
            />
          </div>
        </div>

        {/* Text Color */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Warna Teks
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={st.textColor || "#121215"}
                onChange={(e) => handleStyleChange({ textColor: e.target.value })}
                className="h-7 w-9 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
              />
              <input
                type="text"
                value={st.textColor || ""}
                onChange={(e) => handleStyleChange({ textColor: e.target.value })}
                placeholder="#121215"
                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-[11px] border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Jarak Vertikal
            </label>
            <select
              value={st.paddingY || "md"}
              onChange={(e) =>
                handleStyleChange({ paddingY: e.target.value as "sm" | "md" | "lg" })
              }
              className="w-full rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] border border-slate-200 focus:bg-white focus:outline-none"
            >
              <option value="sm">Rapat (Compact)</option>
              <option value="md">Standar (Normal)</option>
              <option value="lg">Lega (Spacious)</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 border-l border-slate-200 bg-white p-5 overflow-y-auto shrink-0 select-none h-full">
      {/* MODE 1: PENGATURAN BLOK TERPILIH */}
      {selectedBlock ? (
        <div key={`block-inspector-${selectedBlock.id}`} className="space-y-4">
          {/* Header Mode Pengaturan Blok */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={onDeselectBlock}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Pengaturan Halaman</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteBlock(selectedBlock.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Hapus blok ini"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PENGATURAN BLOK
              </span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mt-0.5">
                {selectedBlock.type}
              </h2>
            </div>
          </div>

          {/* 1. HERO BLOCK */}
          {selectedBlock.type === "hero" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gaya Tata Letak Hero
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: "centered", label: "Terpusat (LMS)" },
                    { id: "split", label: "2 Kolom (Produk)" },
                  ].map((v) => {
                    const active = (selectedBlock.style?.layoutVariant || "centered") === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() =>
                          handleStyleChange({ layoutVariant: v.id as "centered" | "split" })
                        }
                        className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Badge Pill Atas
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as HeroBlock).badge ??
                    (selectedBlock as HeroBlock).badgeText ??
                    selectedBlock.data?.badgeText ??
                    ""
                  }
                  onChange={(e) => {
                    handleFieldChange("badge", e.target.value);
                    handleFieldChange("badgeText", e.target.value);
                  }}
                  placeholder="🌱 100% Full Organik..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Eyebrow Sub-Label
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as HeroBlock).eyebrow ??
                    selectedBlock.data?.eyebrow ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("eyebrow", e.target.value)}
                  placeholder="Ruang Sosmed 2.0 • Kelas Fundamental"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Headline Besar
                </label>
                <textarea
                  rows={2}
                  value={
                    (selectedBlock as HeroBlock).headline ??
                    selectedBlock.data?.headline ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("headline", e.target.value)}
                  placeholder="Judul utama landing page..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subheadline / Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={
                    (selectedBlock as HeroBlock).subheadline ??
                    (selectedBlock as HeroBlock).body ??
                    selectedBlock.data?.body ??
                    ""
                  }
                  onChange={(e) => {
                    handleFieldChange("subheadline", e.target.value);
                    handleFieldChange("body", e.target.value);
                  }}
                  placeholder="Jelaskan manfaat utama..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tombol Utama
                  </label>
                  <input
                    type="text"
                    value={
                      (selectedBlock as HeroBlock).ctaText ??
                      (selectedBlock as HeroBlock).buttonLabel ??
                      selectedBlock.data?.buttonLabel ??
                      ""
                    }
                    onChange={(e) => {
                      handleFieldChange("ctaText", e.target.value);
                      handleFieldChange("buttonLabel", e.target.value);
                    }}
                    placeholder="Mulai Belajar"
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tombol Sekunder
                  </label>
                  <input
                    type="text"
                    value={
                      (selectedBlock as HeroBlock).secondaryButtonLabel ??
                      selectedBlock.data?.secondaryButtonLabel ??
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange("secondaryButtonLabel", e.target.value)
                    }
                    placeholder="Lihat Kurikulum"
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <span>Tampilkan Live Preview Portal 2.0 (jika tanpa foto)</span>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedBlock.data?.showSystemPreview)}
                    onChange={(e) =>
                      handleFieldChange("showSystemPreview", e.target.checked)
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gambar Banner / Produk Hero
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    key="hero-file-input"
                    ref={blockFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFileRead(e, (url) => handleFieldChange("imageUrl", url))
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => blockFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>Upload Foto</span>
                  </button>
                  {((selectedBlock as HeroBlock).imageUrl || selectedBlock.data?.imageUrl) && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange("imageUrl", "")}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={
                    (selectedBlock as HeroBlock).imageUrl ??
                    selectedBlock.data?.imageUrl ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("imageUrl", e.target.value)}
                  placeholder="https://... (URL Gambar)"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 2. FEATURES BLOCK (4-Grid Keunggulan Roadmap) */}
          {selectedBlock.type === "features" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian (Heading)
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  placeholder="Roadmap Terarah Menjadi..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul (Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={selectedBlock.data?.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Kartu Keunggulan ({(selectedBlock.data?.items || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(selectedBlock.data?.items)
                        ? selectedBlock.data.items
                        : [];
                      handleFieldChange("items", [
                        ...current,
                        {
                          title: `Keunggulan ${current.length + 1}`,
                          description: "Penjelasan keunggulan...",
                          icon: "Sparkles",
                        },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah</span>
                  </button>
                </div>

                {(selectedBlock.data?.items || []).map((feat: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        Kartu #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = [...(selectedBlock.data?.items || [])];
                          handleFieldChange(
                            "items",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={feat.title || ""}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.items || [])];
                        current[idx] = { ...current[idx], title: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="Judul Keunggulan"
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200 font-semibold"
                    />
                    <textarea
                      rows={2}
                      value={feat.description || ""}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.items || [])];
                        current[idx] = { ...current[idx], description: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="Deskripsi..."
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200"
                    />
                    <select
                      value={feat.icon || "Sparkles"}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.items || [])];
                        current[idx] = { ...current[idx], icon: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      className="w-full rounded-lg bg-white px-2 py-1 text-[11px] border border-slate-200"
                    >
                      <option value="Sparkles">Icon: Sparkles</option>
                      <option value="KeyRound">Icon: Kunci / Redeem Kode</option>
                      <option value="BookOpen">Icon: Buku / Ruang Kelas</option>
                      <option value="MessageSquare">Icon: Diskusi / Catatan</option>
                      <option value="Bot">Icon: Bot / Rumi Maskot</option>
                      <option value="Gift">Icon: Hadiah / Rewards</option>
                      <option value="Award">Icon: Award / Sertifikat</option>
                      <option value="Zap">Icon: Petir / Paket &amp; Trial</option>
                      <option value="Clock">Icon: Jam / Realtime</option>
                      <option value="ShieldCheck">Icon: Keamanan Akses</option>
                      <option value="Compass">Icon: Katalog / Eksplorasi</option>
                      <option value="FolderOpen">Icon: Folder Materi</option>
                      <option value="Users">Icon: Users / Tim</option>
                      <option value="Library">Icon: Library / Dokumen</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2B. SYSTEM SHOWCASE BLOCK (Tab Ekosistem & Alur 2.0) */}
          {selectedBlock.type === "system_showcase" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Eyebrow Label
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as SystemShowcaseBlock).eyebrow ??
                    selectedBlock.data?.eyebrow ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("eyebrow", e.target.value)}
                  placeholder="EKSPLORASI EKOSISTEM 2.0"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian (Heading)
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as SystemShowcaseBlock).heading ??
                    selectedBlock.data?.heading ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  placeholder="Lihat Cara Kerja Setiap Sistem..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul (Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={
                    (selectedBlock as SystemShowcaseBlock).subtitle ??
                    selectedBlock.data?.subtitle ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">
                  Tab Sistem (
                  {(
                    (selectedBlock as SystemShowcaseBlock).tabs ||
                    selectedBlock.data?.tabs ||
                    DEFAULT_SYSTEM_SHOWCASE_TABS
                  ).length}
                  )
                </span>
                {(
                  (selectedBlock as SystemShowcaseBlock).tabs ||
                  selectedBlock.data?.tabs ||
                  DEFAULT_SYSTEM_SHOWCASE_TABS
                ).map((tab: SystemShowcaseTabItem, tIdx: number) => {
                  const updateTab = (patch: Partial<SystemShowcaseTabItem>) => {
                    const baseTabs: SystemShowcaseTabItem[] = [
                      ...((selectedBlock as SystemShowcaseBlock).tabs ||
                        selectedBlock.data?.tabs ||
                        DEFAULT_SYSTEM_SHOWCASE_TABS),
                    ];
                    baseTabs[tIdx] = { ...baseTabs[tIdx], ...patch };
                    handleFieldChange("tabs", baseTabs);
                  };

                  return (
                    <div
                      key={tab.id || tIdx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={tab.tabLabel || ""}
                          onChange={(e) => updateTab({ tabLabel: e.target.value })}
                          placeholder="Label Tab"
                          className="w-full rounded-lg bg-white px-2 py-1.5 text-xs border border-slate-200 font-bold"
                        />
                        <input
                          type="text"
                          value={tab.badge || ""}
                          onChange={(e) => updateTab({ badge: e.target.value })}
                          placeholder="Badge"
                          className="w-full rounded-lg bg-white px-2 py-1.5 text-xs border border-slate-200"
                        />
                      </div>
                      <input
                        type="text"
                        value={tab.title || ""}
                        onChange={(e) => updateTab({ title: e.target.value })}
                        placeholder="Judul Panel"
                        className="w-full rounded-lg bg-white px-2 py-1.5 text-xs border border-slate-200 font-semibold"
                      />
                      <textarea
                        rows={2}
                        value={tab.subtitle || ""}
                        onChange={(e) => updateTab({ subtitle: e.target.value })}
                        placeholder="Deskripsi singkat..."
                        className="w-full rounded-lg bg-white px-2 py-1.5 text-xs border border-slate-200"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={tab.visualType || "learner_portal"}
                          onChange={(e) =>
                            updateTab({ visualType: e.target.value as any })
                          }
                          className="w-full rounded-lg bg-white px-2 py-1 text-[11px] border border-slate-200"
                        >
                          <option value="learner_portal">Visual: Portal Siswa</option>
                          <option value="rumi_evolution">Visual: Evolusi Rumi 1–5</option>
                          <option value="access_rewards">Visual: Akses &amp; Hadiah</option>
                          <option value="admin_studio">Visual: Admin Studio</option>
                        </select>
                        <input
                          type="text"
                          value={tab.ctaLabel || ""}
                          onChange={(e) => updateTab({ ctaLabel: e.target.value })}
                          placeholder="Teks Tombol CTA"
                          className="w-full rounded-lg bg-white px-2 py-1 text-[11px] border border-slate-200"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. TOPICS BLOCK (Kurikulum & Silabus) */}
          {selectedBlock.type === "topics" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Learning Center
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul
                </label>
                <textarea
                  rows={2}
                  value={selectedBlock.data?.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Seri Kurikulum ({(selectedBlock.data?.topics || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(selectedBlock.data?.topics)
                        ? selectedBlock.data.topics
                        : [];
                      const nextIdx = current.length;
                      handleFieldChange("topics", [
                        ...current,
                        {
                          id: `series-${Date.now()}`,
                          tag: "BARU",
                          eyebrow: "SERIES BARU",
                          bannerTitle: "JUDUL BANNER SERI BARU",
                          bannerSubtitle: "Deskripsi singkat banner",
                          bannerTheme: "blue",
                          category: "SERIES KURIKULUM",
                          title: `Kurikulum Baru ${nextIdx + 1}`,
                          description: "Deskripsi materi pembelajaran...",
                          lessonsCount: 1,
                          modules: [{ number: 1, title: "Modul 1 - Pengantar Materi" }],
                        },
                      ]);
                      setExpandedTopicIdx(nextIdx);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah Seri</span>
                  </button>
                </div>

                {(selectedBlock.data?.topics || []).map((topic: any, idx: number) => {
                  const isOpen = expandedTopicIdx === idx;
                  const updateTopic = (patch: Record<string, any>) => {
                    const current = [...(selectedBlock.data?.topics || [])];
                    current[idx] = { ...current[idx], ...patch };
                    handleFieldChange("topics", current);
                  };

                  return (
                    <div
                      key={topic.id || idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedTopicIdx(isOpen ? null : idx)}
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/70"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-indigo-600 block">
                            {topic.tag || `SERI #${idx + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {topic.title || "Tanpa Judul"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const current = [...(selectedBlock.data?.topics || [])];
                              handleFieldChange(
                                "topics",
                                current.filter((_, i) => i !== idx)
                              );
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-3 pt-2 border-t border-slate-200/70 space-y-2.5 bg-white">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Badge Tag
                              </label>
                              <input
                                type="text"
                                value={topic.tag || ""}
                                onChange={(e) => updateTopic({ tag: e.target.value })}
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Tema Banner
                              </label>
                              <select
                                value={topic.bannerTheme || "blue"}
                                onChange={(e) => updateTopic({ bannerTheme: e.target.value })}
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                              >
                                <option value="blue">Biru Klasik</option>
                                <option value="coral">Coral / Oranye</option>
                                <option value="purple">Ungu Masterclass</option>
                                <option value="teal">Teal Modern</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Judul Banner Cover
                            </label>
                            <input
                              type="text"
                              value={topic.bannerTitle || ""}
                              onChange={(e) => updateTopic({ bannerTitle: e.target.value })}
                              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Sub-teks Banner
                            </label>
                            <input
                              type="text"
                              value={topic.bannerSubtitle || ""}
                              onChange={(e) => updateTopic({ bannerSubtitle: e.target.value })}
                              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Judul Kartu Kelas
                            </label>
                            <input
                              type="text"
                              value={topic.title || ""}
                              onChange={(e) => updateTopic({ title: e.target.value })}
                              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200 font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Deskripsi Kelas
                            </label>
                            <textarea
                              rows={2}
                              value={topic.description || ""}
                              onChange={(e) => updateTopic({ description: e.target.value })}
                              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                            />
                          </div>

                          {/* Nested Modules Editor */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 uppercase">
                                Daftar Modul ({(topic.modules || []).length})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const mods = Array.isArray(topic.modules) ? topic.modules : [];
                                  const next = [
                                    ...mods,
                                    {
                                      number: mods.length + 1,
                                      title: `Modul ${mods.length + 1} - Materi Baru`,
                                    },
                                  ];
                                  updateTopic({ modules: next, lessonsCount: next.length });
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                + Modul
                              </button>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                              {(topic.modules || []).map((mod: any, mIdx: number) => (
                                <div key={mIdx} className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={mod.title || ""}
                                    onChange={(e) => {
                                      const mods = [...(topic.modules || [])];
                                      mods[mIdx] = { ...mods[mIdx], title: e.target.value };
                                      updateTopic({ modules: mods });
                                    }}
                                    className="flex-1 rounded bg-slate-50 px-2 py-1 text-[11px] border border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const mods = (topic.modules || []).filter(
                                        (_: any, i: number) => i !== mIdx
                                      );
                                      updateTopic({ modules: mods, lessonsCount: mods.length });
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. PRICING BLOCK (Per-Paket + Modal Pembayaran QRIS) */}
          {selectedBlock.type === "pricing" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian Harga
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  placeholder="Pilihan Akses Belajar"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul
                </label>
                <textarea
                  rows={2}
                  value={selectedBlock.data?.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Daftar Paket */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Paket ({(selectedBlock.data?.tiers || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current: PricingTierItem[] = Array.isArray(selectedBlock.data?.tiers)
                        ? selectedBlock.data.tiers
                        : [];
                      const nextIdx = current.length;
                      handleFieldChange("tiers", [
                        ...current,
                        {
                          id: `tier-${Date.now()}`,
                          name: `Paket VIP ${nextIdx + 1}`,
                          price: "Rp 299.000",
                          period: "sekali bayar",
                          badge: "Eksklusif",
                          description: "Akses penuh materi dan konsultasi.",
                          features: ["Semua materi utama", "Konsultasi mentor"],
                          buttonLabel: "Beli Paket Ini",
                          highlighted: true,
                          buttonAction: "payment_modal",
                        },
                      ]);
                      setExpandedTierIdx(nextIdx);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah Paket</span>
                  </button>
                </div>

                {(selectedBlock.data?.tiers || []).map((tier: PricingTierItem, idx: number) => {
                  const isOpen = expandedTierIdx === idx;
                  const updateTier = (patch: Partial<PricingTierItem>) => {
                    const current = [...(selectedBlock.data?.tiers || [])];
                    current[idx] = { ...current[idx], ...patch };
                    handleFieldChange("tiers", current);
                  };

                  return (
                    <div
                      key={tier.id || idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedTierIdx(isOpen ? null : idx)}
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/70"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {tier.name || `Paket #${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600">
                            {tier.price || "Rp 0"} •{" "}
                            {tier.buttonAction === "payment_modal"
                              ? "Popup QRIS"
                              : tier.buttonAction === "scroll_payment"
                              ? "Scroll Bayar"
                              : tier.buttonAction === "custom_link"
                              ? "Link Kustom"
                              : "Daftar Akun"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const current = [...(selectedBlock.data?.tiers || [])];
                              handleFieldChange(
                                "tiers",
                                current.filter((_, i) => i !== idx)
                              );
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-3 pt-2 border-t border-slate-200/70 space-y-2.5 bg-white">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Nama Paket
                              </label>
                              <input
                                type="text"
                                value={tier.name || ""}
                                onChange={(e) => updateTier({ name: e.target.value })}
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Badge Unggulan
                              </label>
                              <input
                                type="text"
                                value={tier.badge || ""}
                                onChange={(e) => updateTier({ badge: e.target.value })}
                                placeholder="Rekomendasi"
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Teks Harga
                              </label>
                              <input
                                type="text"
                                value={tier.price || ""}
                                onChange={(e) => updateTier({ price: e.target.value })}
                                placeholder="Rp 149.000"
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Periode
                              </label>
                              <input
                                type="text"
                                value={tier.period || ""}
                                onChange={(e) => updateTier({ period: e.target.value })}
                                placeholder="per bulan"
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Deskripsi Paket
                            </label>
                            <textarea
                              rows={2}
                              value={tier.description || ""}
                              onChange={(e) => updateTier({ description: e.target.value })}
                              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Teks Tombol
                              </label>
                              <input
                                type="text"
                                value={tier.buttonLabel || ""}
                                onChange={(e) => updateTier({ buttonLabel: e.target.value })}
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                Aksi Saat Diklik
                              </label>
                              <select
                                value={
                                  tier.buttonAction ||
                                  (tier.highlighted ? "payment_modal" : "register")
                                }
                                onChange={(e) =>
                                  updateTier({
                                    buttonAction: e.target.value as PricingTierItem["buttonAction"],
                                  })
                                }
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-[11px] border border-slate-200 font-semibold"
                              >
                                <option value="payment_modal">Popup Bayar / QRIS</option>
                                <option value="register">Daftar Akun</option>
                                <option value="scroll_payment">Scroll ke Pembayaran</option>
                                <option value="custom_link">Link Eksternal</option>
                              </select>
                            </div>
                          </div>

                          {tier.buttonAction === "custom_link" && (
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                URL Link Tujuan
                              </label>
                              <input
                                type="url"
                                value={tier.customLink || ""}
                                onChange={(e) => updateTier({ customLink: e.target.value })}
                                placeholder="https://..."
                                className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-200"
                              />
                            </div>
                          )}

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(tier.highlighted)}
                              onChange={(e) => updateTier({ highlighted: e.target.checked })}
                              className="rounded border-slate-300 accent-indigo-600"
                            />
                            <span>Tandai sebagai Paket Unggulan (Highlight)</span>
                          </label>

                          {/* Features Checklist Editor */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 uppercase">
                                Checklist Fitur ({(tier.features || []).length})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateTier({
                                    features: [...(tier.features || []), "Keuntungan baru"],
                                  })
                                }
                                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                + Fitur
                              </button>
                            </div>
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                              {(tier.features || []).map((f, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={f || ""}
                                    onChange={(e) => {
                                      const next = [...(tier.features || [])];
                                      next[fIdx] = e.target.value;
                                      updateTier({ features: next });
                                    }}
                                    className="flex-1 rounded bg-slate-50 px-2 py-1 text-[11px] border border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateTier({
                                        features: (tier.features || []).filter(
                                          (_, i) => i !== fIdx
                                        ),
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Optional custom QRIS URL per tier */}
                          <div className="pt-2 border-t border-slate-100">
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              URL QRIS Khusus Paket Ini (Opsional)
                            </label>
                            <input
                              type="url"
                              value={tier.qrCodeUrl || ""}
                              onChange={(e) => updateTier({ qrCodeUrl: e.target.value })}
                              placeholder="Kosongkan untuk pakai QRIS Global"
                              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-[11px] border border-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Kaki Paket / Info Redeem Kode (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={selectedBlock.data?.footnote || ""}
                  onChange={(e) => handleFieldChange("footnote", e.target.value)}
                  placeholder="Punya Kode Akses Folder atau Kode Voucher PRO? ..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 5. TESTIMONIAL BLOCK */}
          {selectedBlock.type === "testimonial" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Testimoni
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Ulasan ({(selectedBlock.data?.reviews || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(selectedBlock.data?.reviews)
                        ? selectedBlock.data.reviews
                        : [];
                      handleFieldChange("reviews", [
                        ...current,
                        {
                          name: "Alumni Baru",
                          role: "Social Media Specialist",
                          company: "Brand Partner",
                          comment: "Materinya sangat aplikatif dan mudah diikuti!",
                          rating: 5,
                        },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah</span>
                  </button>
                </div>

                {(selectedBlock.data?.reviews || []).map((rev: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        Testimoni #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = [...(selectedBlock.data?.reviews || [])];
                          handleFieldChange(
                            "reviews",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={rev.name || ""}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.reviews || [])];
                        current[idx] = { ...current[idx], name: e.target.value };
                        handleFieldChange("reviews", current);
                      }}
                      placeholder="Nama"
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200 font-semibold"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={rev.role || ""}
                        onChange={(e) => {
                          const current = [...(selectedBlock.data?.reviews || [])];
                          current[idx] = { ...current[idx], role: e.target.value };
                          handleFieldChange("reviews", current);
                        }}
                        placeholder="Profesi"
                        className="rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                      />
                      <input
                        type="text"
                        value={rev.company || ""}
                        onChange={(e) => {
                          const current = [...(selectedBlock.data?.reviews || [])];
                          current[idx] = { ...current[idx], company: e.target.value };
                          handleFieldChange("reviews", current);
                        }}
                        placeholder="Perusahaan"
                        className="rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={rev.comment || ""}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.reviews || [])];
                        current[idx] = { ...current[idx], comment: e.target.value };
                        handleFieldChange("reviews", current);
                      }}
                      placeholder="Komentar testimoni..."
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                    />
                    <select
                      value={rev.rating ?? 5}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.reviews || [])];
                        current[idx] = { ...current[idx], rating: Number(e.target.value) };
                        handleFieldChange("reviews", current);
                      }}
                      className="w-full rounded-lg bg-white px-2 py-1 text-[11px] border border-slate-200"
                    >
                      <option value={5}>★★★★★ (5 Bintang)</option>
                      <option value={4}>★★★★☆ (4 Bintang)</option>
                      <option value={3}>★★★☆☆ (3 Bintang)</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. FAQ BLOCK */}
          {selectedBlock.type === "faq" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian FAQ
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pertanyaan ({(selectedBlock.data?.faqs || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(selectedBlock.data?.faqs)
                        ? selectedBlock.data.faqs
                        : [];
                      handleFieldChange("faqs", [
                        ...current,
                        {
                          question: "Pertanyaan baru?",
                          answer: "Jawaban lengkap pertanyaan di sini.",
                        },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah FAQ</span>
                  </button>
                </div>

                {(selectedBlock.data?.faqs || []).map((faq: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        FAQ #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = [...(selectedBlock.data?.faqs || [])];
                          handleFieldChange(
                            "faqs",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={faq.question || ""}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.faqs || [])];
                        current[idx] = { ...current[idx], question: e.target.value };
                        handleFieldChange("faqs", current);
                      }}
                      placeholder="Pertanyaan"
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200 font-semibold"
                    />
                    <textarea
                      rows={2}
                      value={faq.answer || ""}
                      onChange={(e) => {
                        const current = [...(selectedBlock.data?.faqs || [])];
                        current[idx] = { ...current[idx], answer: e.target.value };
                        handleFieldChange("faqs", current);
                      }}
                      placeholder="Jawaban..."
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. CTA BLOCK */}
          {selectedBlock.type === "cta" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Ajakan (Heading)
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Isi Ajakan (Body)
                </label>
                <textarea
                  rows={3}
                  value={selectedBlock.data?.body || ""}
                  onChange={(e) => handleFieldChange("body", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teks Tombol CTA
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.buttonLabel || ""}
                  onChange={(e) => handleFieldChange("buttonLabel", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tombol Sekunder (Opsional)
                </label>
                <input
                  type="text"
                  value={selectedBlock.data?.secondaryButtonLabel || ""}
                  onChange={(e) =>
                    handleFieldChange("secondaryButtonLabel", e.target.value)
                  }
                  placeholder="Masuk & Redeem Kode"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 8. BENEFITS / ALUR FLOW BLOCK */}
          {selectedBlock.type === "benefits" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Eyebrow Label (Opsional)
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as BenefitsBlock).eyebrow ??
                    selectedBlock.data?.eyebrow ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("eyebrow", e.target.value)}
                  placeholder="ALUR & FLOW SISTEM"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian Manfaat / Alur
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as BenefitsBlock).sectionTitle ||
                    (selectedBlock as BenefitsBlock).title ||
                    ""
                  }
                  onChange={(e) => {
                    handleFieldChange("sectionTitle", e.target.value);
                    handleFieldChange("heading", e.target.value);
                  }}
                  placeholder="Kenapa memilih produk ini?"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-judul (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={
                    (selectedBlock as BenefitsBlock).subtitle ??
                    selectedBlock.data?.subtitle ??
                    ""
                  }
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  placeholder="Deskripsi ringkas alur atau manfaat..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Kartu Manfaat / Langkah
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = (selectedBlock as BenefitsBlock).items || [];
                      const newItem = {
                        id: `benefit-${Date.now()}`,
                        number: current.length + 1,
                        tag: "",
                        title: `Langkah ${current.length + 1}`,
                        description: "Deskripsi singkat langkah atau keunggulan.",
                      };
                      handleFieldChange("items", [...current, newItem]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah Item</span>
                  </button>
                </div>

                {((selectedBlock as BenefitsBlock).items || []).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = (selectedBlock as BenefitsBlock).items || [];
                          handleFieldChange(
                            "items",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Hapus item ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.tag || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as BenefitsBlock).items || [])];
                        current[idx] = { ...current[idx], tag: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="Label Tahap (opsional, mis: Onboarding)"
                      className="w-full rounded-lg bg-white px-2.5 py-1 text-[11px] border border-slate-200 text-slate-600 focus:outline-none"
                    />

                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as BenefitsBlock).items || [])];
                        current[idx] = { ...current[idx], title: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="Judul Keunggulan / Langkah"
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200 font-semibold text-slate-800 focus:outline-none"
                    />

                    <textarea
                      rows={2}
                      value={item.description || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as BenefitsBlock).items || [])];
                        current[idx] = { ...current[idx], description: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="Deskripsi keunggulan..."
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200 text-slate-600 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. PAYMENT BLOCK */}
          {selectedBlock.type === "payment" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian Pembayaran
                </label>
                <input
                  type="text"
                  value={
                    (selectedBlock as PaymentBlock).sectionTitle ||
                    (selectedBlock as PaymentBlock).title ||
                    ""
                  }
                  onChange={(e) => {
                    handleFieldChange("sectionTitle", e.target.value);
                    handleFieldChange("heading", e.target.value);
                  }}
                  placeholder="Informasi pembayaran"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Harga (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={(selectedBlock as PaymentBlock).price ?? 0}
                    onChange={(e) =>
                      handleFieldChange("price", Number(e.target.value) || 0)
                    }
                    className="w-full rounded-xl bg-slate-50 pl-9 pr-3 py-2 text-xs font-bold text-slate-800 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bank / Saluran Pembayaran
                </label>
                <input
                  type="text"
                  value={(selectedBlock as PaymentBlock).bankName || ""}
                  onChange={(e) => handleFieldChange("bankName", e.target.value)}
                  placeholder="BCA / Mandiri / QRIS"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Rekening
                  </label>
                  <input
                    type="text"
                    value={(selectedBlock as PaymentBlock).accountNumber || ""}
                    onChange={(e) =>
                      handleFieldChange("accountNumber", e.target.value)
                    }
                    placeholder="123-456-7890"
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Atas Nama
                  </label>
                  <input
                    type="text"
                    value={(selectedBlock as PaymentBlock).accountHolder || ""}
                    onChange={(e) =>
                      handleFieldChange("accountHolder", e.target.value)
                    }
                    placeholder="PT Ruang Sosmed"
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gambar QR Code / QRIS
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    key="payment-file-input"
                    ref={blockFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFileRead(e, (url) => handleFieldChange("qrCodeUrl", url))
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => blockFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>Upload QRIS</span>
                  </button>
                  {(selectedBlock as PaymentBlock).qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange("qrCodeUrl", "")}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={(selectedBlock as PaymentBlock).qrCodeUrl || ""}
                  onChange={(e) => handleFieldChange("qrCodeUrl", e.target.value)}
                  placeholder="https://... (URL QR Code)"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petunjuk Pembayaran
                </label>
                <textarea
                  rows={2}
                  value={(selectedBlock as PaymentBlock).paymentInstructions || ""}
                  onChange={(e) =>
                    handleFieldChange("paymentInstructions", e.target.value)
                  }
                  placeholder="Scan QRIS atau transfer melalui rekening..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* 10. TEXT BLOCK */}
          {selectedBlock.type === "text" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Teks (Opsional)
                </label>
                <input
                  type="text"
                  value={(selectedBlock as TextBlock).heading || ""}
                  onChange={(e) => handleFieldChange("heading", e.target.value)}
                  placeholder="Judul Paragraf"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Isi Teks / Penjelasan
                </label>
                <textarea
                  rows={6}
                  value={(selectedBlock as TextBlock).content || ""}
                  onChange={(e) => handleFieldChange("content", e.target.value)}
                  placeholder="Tuliskan penjelasan produk di sini..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perataan Teks
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { val: "left", label: "Kiri", icon: AlignLeft },
                    { val: "center", label: "Tengah", icon: AlignCenter },
                    { val: "right", label: "Kanan", icon: AlignRight },
                  ].map((al) => {
                    const Icon = al.icon;
                    const isActive = ((selectedBlock as TextBlock).align || "left") === al.val;
                    return (
                      <button
                        key={al.val}
                        type="button"
                        onClick={() => handleFieldChange("align", al.val)}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        <Icon size={12} />
                        <span>{al.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 11. IMAGE BLOCK */}
          {selectedBlock.type === "image" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto / Gambar
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    key="image-file-input"
                    ref={blockFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFileRead(e, (url) => handleFieldChange("imageUrl", url))
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => blockFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>Upload Gambar</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={(selectedBlock as ImageBlock).imageUrl || ""}
                  onChange={(e) => handleFieldChange("imageUrl", e.target.value)}
                  placeholder="https://... (URL Gambar)"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan (Caption)
                </label>
                <input
                  type="text"
                  value={(selectedBlock as ImageBlock).caption || ""}
                  onChange={(e) => handleFieldChange("caption", e.target.value)}
                  placeholder="Deskripsi foto..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rasio Aspek
                </label>
                <select
                  value={(selectedBlock as ImageBlock).aspectRatio || "video"}
                  onChange={(e) => handleFieldChange("aspectRatio", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="video">Lanskap 16:9 (Standard)</option>
                  <option value="square">Persegi 1:1</option>
                  <option value="wide">Lebar Banner 21:9</option>
                  <option value="auto">Ukuran Asli (Auto)</option>
                </select>
              </div>
            </div>
          )}

          {/* 12. VIDEO BLOCK */}
          {selectedBlock.type === "video" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautan Video (YouTube / MP4)
                </label>
                <input
                  type="url"
                  value={(selectedBlock as VideoBlock).videoUrl || ""}
                  onChange={(e) => handleFieldChange("videoUrl", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Video
                </label>
                <input
                  type="text"
                  value={(selectedBlock as VideoBlock).title || ""}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="Video Demo & Testimoni"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={(selectedBlock as VideoBlock).description || ""}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  placeholder="Penjelasan ringkas mengenai video..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* 13. CLASS BLOCK */}
          {selectedBlock.type === "class" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian Kelas
                </label>
                <input
                  type="text"
                  value={(selectedBlock as ClassBlock).sectionTitle || ""}
                  onChange={(e) => handleFieldChange("sectionTitle", e.target.value)}
                  placeholder="Daftar Kelas & Jadwal Belajar"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Kartu Kelas
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = (selectedBlock as ClassBlock).classes || [];
                      const newCls = {
                        id: `class-${Date.now()}`,
                        title: `Kelas Baru ${current.length + 1}`,
                        instructor: "Mentor Ahli",
                        schedule: "Sabtu & Minggu",
                        badge: "Live Interactive",
                        level: "Semua Level",
                        price: "Rp 99.000",
                      };
                      handleFieldChange("classes", [...current, newCls]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah Kelas</span>
                  </button>
                </div>

                {((selectedBlock as ClassBlock).classes || []).map((cls, idx) => (
                  <div
                    key={cls.id || idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        Kelas #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = (selectedBlock as ClassBlock).classes || [];
                          handleFieldChange(
                            "classes",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={cls.title || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as ClassBlock).classes || [])];
                        current[idx] = { ...current[idx], title: e.target.value };
                        handleFieldChange("classes", current);
                      }}
                      placeholder="Judul Kelas"
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200 font-semibold"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cls.instructor || ""}
                        onChange={(e) => {
                          const current = [...((selectedBlock as ClassBlock).classes || [])];
                          current[idx] = { ...current[idx], instructor: e.target.value };
                          handleFieldChange("classes", current);
                        }}
                        placeholder="Pemateri"
                        className="rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                      />
                      <input
                        type="text"
                        value={cls.price || ""}
                        onChange={(e) => {
                          const current = [...((selectedBlock as ClassBlock).classes || [])];
                          current[idx] = { ...current[idx], price: e.target.value };
                          handleFieldChange("classes", current);
                        }}
                        placeholder="Biaya (ex: Rp 149k)"
                        className="rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                      />
                    </div>
                    <input
                      type="text"
                      value={cls.schedule || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as ClassBlock).classes || [])];
                        current[idx] = { ...current[idx], schedule: e.target.value };
                        handleFieldChange("classes", current);
                      }}
                      placeholder="Jadwal (ex: Setiap Sabtu, 19:30 WIB)"
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 14. CATALOG BLOCK */}
          {selectedBlock.type === "catalog" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Bagian Katalog
                </label>
                <input
                  type="text"
                  value={(selectedBlock as CatalogBlock).sectionTitle || ""}
                  onChange={(e) => handleFieldChange("sectionTitle", e.target.value)}
                  placeholder="Katalog Produk & Penawaran"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Produk
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = (selectedBlock as CatalogBlock).items || [];
                      const newProd = {
                        id: `prod-${Date.now()}`,
                        title: `Produk Digital ${current.length + 1}`,
                        price: "Rp 50.000",
                        tag: "Baru",
                        description: "Deskripsi singkat produk...",
                        ctaText: "Beli",
                      };
                      handleFieldChange("items", [...current, newProd]);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah Produk</span>
                  </button>
                </div>

                {((selectedBlock as CatalogBlock).items || []).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        Produk #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = (selectedBlock as CatalogBlock).items || [];
                          handleFieldChange(
                            "items",
                            current.filter((_, i) => i !== idx)
                          );
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as CatalogBlock).items || [])];
                        current[idx] = { ...current[idx], title: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="Nama Produk"
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200 font-semibold"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.price || ""}
                        onChange={(e) => {
                          const current = [...((selectedBlock as CatalogBlock).items || [])];
                          current[idx] = { ...current[idx], price: e.target.value };
                          handleFieldChange("items", current);
                        }}
                        placeholder="Harga (Rp)"
                        className="rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                      />
                      <input
                        type="text"
                        value={item.tag || ""}
                        onChange={(e) => {
                          const current = [...((selectedBlock as CatalogBlock).items || [])];
                          current[idx] = { ...current[idx], tag: e.target.value };
                          handleFieldChange("items", current);
                        }}
                        placeholder="Tag (ex: Promo)"
                        className="rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                      />
                    </div>
                    <input
                      type="url"
                      value={item.imageUrl || ""}
                      onChange={(e) => {
                        const current = [...((selectedBlock as CatalogBlock).items || [])];
                        current[idx] = { ...current[idx], imageUrl: e.target.value };
                        handleFieldChange("items", current);
                      }}
                      placeholder="URL Foto Produk (https://...)"
                      className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Universal Block Color & Layout Style Controls */}
          {renderBlockStyleEditor()}
        </div>
      ) : (
        /* MODE 2: PENGATURAN GLOBAL HALAMAN (Umum, Header, QRIS, Warna & Footer) */
        <div key="global-page-inspector" className="space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PENGATURAN GLOBAL
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                Halaman &amp; Tampilan
              </h2>
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Palette size={16} />
            </div>
          </div>

          {/* 4 Sub-Tabs Pengaturan Global */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {[
              { id: "general", label: "Umum", icon: Settings },
              { id: "header", label: "Header", icon: LayoutTemplate },
              { id: "payment", label: "QRIS", icon: QrCode },
              { id: "theme", label: "Warna", icon: Paintbrush },
            ].map((t) => {
              const Icon = t.icon;
              const active = globalTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChangeGlobalTab(t.id as GlobalInspectorTab)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon size={12} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB 1: UMUM */}
          {globalTab === "general" && (
            <div key="tab-general" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul landing page
                </label>
                <input
                  type="text"
                  value={pageData.title || ""}
                  onChange={(e) => onUpdatePageData("title", e.target.value)}
                  placeholder="Produk Baru"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slug link publik
                </label>
                <input
                  type="text"
                  value={pageData.slug || ""}
                  onChange={(e) => onUpdatePageData("slug", e.target.value)}
                  placeholder="home"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none font-mono"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Link publik: <code className="text-slate-600">/c/{pageData.slug || "home"}</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi singkat (SEO Meta)
                </label>
                <textarea
                  rows={3}
                  value={pageData.description || ""}
                  onChange={(e) => onUpdatePageData("description", e.target.value)}
                  placeholder="Deskripsi singkat produk..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none resize-y"
                />
              </div>

              {/* Cover Visual */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">
                  Gambar Sampul / Meta Share
                </span>
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-3 text-center bg-slate-50/50 space-y-2">
                  {pageData.headerImageUrl ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pageData.headerImageUrl}
                        alt="Header Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdatePageData("headerImageUrl", "")}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <div className="py-1.5">
                      <ImageIcon size={18} className="text-slate-400 mx-auto mb-1" />
                      <p className="text-[11px] font-medium text-slate-600">
                        Belum ada gambar
                      </p>
                    </div>
                  )}

                  <input
                    key="global-header-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFileRead(e, (url) =>
                        onUpdatePageData("headerImageUrl", url)
                      )
                    }
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>Upload gambar</span>
                  </button>
                </div>

                <input
                  type="url"
                  value={pageData.headerImageUrl || ""}
                  onChange={(e) => onUpdatePageData("headerImageUrl", e.target.value)}
                  placeholder="https://... (URL Foto Header)"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {onLoadPreset && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Pilihan Template Halaman
                  </span>
                  <button
                    type="button"
                    onClick={() => onLoadPreset("official")}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-900">
                      🎓 Template Ruang Sosmed 2.0 (Full Sistem &amp; Alur)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Hero Live Preview, Alur 6 Langkah, Tab Ekosistem &amp; Rumi, 8 Fitur, 3 Kurikulum, Paket FREE/Basic/PRO, Testimoni, FAQ &amp; CTA.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoadPreset("default")}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-900">
                      ⚡ Template Produk Baru (3-Blok)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Hero produk, 3 manfaat, dan pembayaran langsung.
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: HEADER & NAVIGASI */}
          {globalTab === "header" && (
            <div key="tab-header" className="space-y-4">
              {/* Announcement Bar */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Top Announcement Bar
                  </span>
                  <input
                    type="checkbox"
                    checked={headerCfg.showAnnouncement ?? true}
                    onChange={(e) =>
                      updateHeaderCfg({ showAnnouncement: e.target.checked })
                    }
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                </div>

                {headerCfg.showAnnouncement !== false && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={headerCfg.announcementBadge || ""}
                      onChange={(e) =>
                        updateHeaderCfg({ announcementBadge: e.target.value })
                      }
                      placeholder="Pendaftaran Batch 2026 Dibuka"
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200 font-semibold"
                    />
                    <textarea
                      rows={2}
                      value={headerCfg.announcementText || ""}
                      onChange={(e) =>
                        updateHeaderCfg({ announcementText: e.target.value })
                      }
                      placeholder="Teks pengumuman..."
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Latar Bar
                        </label>
                        <input
                          type="color"
                          value={headerCfg.announcementBgColor || "#121215"}
                          onChange={(e) =>
                            updateHeaderCfg({ announcementBgColor: e.target.value })
                          }
                          className="h-7 w-full rounded border border-slate-200 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Warna Badge
                        </label>
                        <input
                          type="color"
                          value={headerCfg.announcementBadgeColor || "#10B981"}
                          onChange={(e) =>
                            updateHeaderCfg({ announcementBadgeColor: e.target.value })
                          }
                          className="h-7 w-full rounded border border-slate-200 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navbar Utama */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Navbar &amp; Logo Brand
                  </span>
                  <input
                    type="checkbox"
                    checked={headerCfg.showNavbar ?? true}
                    onChange={(e) => updateHeaderCfg({ showNavbar: e.target.checked })}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                </div>

                {headerCfg.showNavbar !== false && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Nama Brand
                      </label>
                      <input
                        type="text"
                        value={headerCfg.brandTitle || ""}
                        onChange={(e) =>
                          updateHeaderCfg({ brandTitle: e.target.value })
                        }
                        className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Logo Header
                      </label>
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          key="header-logo-file-input"
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageFileRead(e, (url) =>
                              updateHeaderCfg({ logoUrl: url })
                            )
                          }
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
                        >
                          <Upload size={11} />
                          <span>Upload Logo</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={headerCfg.logoUrl || ""}
                        onChange={(e) => updateHeaderCfg({ logoUrl: e.target.value })}
                        placeholder="/logo1.png atau https://..."
                        className="w-full rounded-lg bg-white px-2.5 py-1.5 text-[11px] border border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Tombol Masuk
                        </label>
                        <input
                          type="text"
                          value={headerCfg.loginLabel || ""}
                          onChange={(e) =>
                            updateHeaderCfg({ loginLabel: e.target.value })
                          }
                          className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Tombol Daftar
                        </label>
                        <input
                          type="text"
                          value={headerCfg.registerLabel || ""}
                          onChange={(e) =>
                            updateHeaderCfg({ registerLabel: e.target.value })
                          }
                          className="w-full rounded-lg bg-white px-2 py-1 text-xs border border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Latar Navbar
                        </label>
                        <input
                          type="color"
                          value={headerCfg.navbarBgColor || "#FFFFFF"}
                          onChange={(e) =>
                            updateHeaderCfg({ navbarBgColor: e.target.value })
                          }
                          className="h-7 w-full rounded border border-slate-200 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Warna Tombol CTA
                        </label>
                        <input
                          type="color"
                          value={headerCfg.primaryButtonColor || "#4F39F6"}
                          onChange={(e) =>
                            updateHeaderCfg({ primaryButtonColor: e.target.value })
                          }
                          className="h-7 w-full rounded border border-slate-200 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Menu Navigasi */}
                    <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                          Link Menu Navigasi
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const links = headerCfg.navLinks || [];
                            updateHeaderCfg({
                              navLinks: [
                                ...links,
                                {
                                  id: `nav-${Date.now()}`,
                                  label: "Menu Baru",
                                  href: "#pricing-section",
                                },
                              ],
                            });
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + Menu
                        </button>
                      </div>
                      {(headerCfg.navLinks || []).map((lnk, idx) => (
                        <div key={lnk.id || idx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={lnk.label || ""}
                            onChange={(e) => {
                              const links = [...(headerCfg.navLinks || [])];
                              links[idx] = { ...links[idx], label: e.target.value };
                              updateHeaderCfg({ navLinks: links });
                            }}
                            placeholder="Label"
                            className="w-1/2 rounded bg-white px-2 py-1 text-[11px] border border-slate-200"
                          />
                          <input
                            type="text"
                            value={lnk.href || ""}
                            onChange={(e) => {
                              const links = [...(headerCfg.navLinks || [])];
                              links[idx] = { ...links[idx], href: e.target.value };
                              updateHeaderCfg({ navLinks: links });
                            }}
                            placeholder="#section"
                            className="w-1/2 rounded bg-white px-2 py-1 text-[11px] border border-slate-200 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateHeaderCfg({
                                navLinks: (headerCfg.navLinks || []).filter(
                                  (_, i) => i !== idx
                                ),
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: PEMBAYARAN & QRIS POPUP MODAL */}
          {globalTab === "payment" && (
            <div key="tab-payment" className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-800 leading-relaxed">
                Pengaturan ini digunakan oleh <strong>Modal Popup Pembayaran QRIS</strong> saat pengunjung mengklik tombol paket harga atau katalog.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gambar QRIS Default
                </label>
                <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center bg-slate-50 space-y-2">
                  {paymentCfg.qrCodeUrl ? (
                    <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden border border-slate-200 bg-white p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentCfg.qrCodeUrl}
                        alt="QRIS"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="py-2 text-slate-400">
                      <QrCode size={28} className="mx-auto mb-1" />
                      <span className="text-[11px]">Belum ada gambar QRIS</span>
                    </div>
                  )}

                  <input
                    key="global-qris-file-input"
                    ref={globalQrisInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFileRead(e, (url) =>
                        updatePaymentCfg({ qrCodeUrl: url })
                      )
                    }
                    className="hidden"
                  />

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => globalQrisInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <Upload size={12} />
                      <span>Upload QRIS</span>
                    </button>
                    {paymentCfg.qrCodeUrl && (
                      <button
                        type="button"
                        onClick={() => updatePaymentCfg({ qrCodeUrl: "" })}
                        className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="url"
                  value={paymentCfg.qrCodeUrl || ""}
                  onChange={(e) => updatePaymentCfg({ qrCodeUrl: e.target.value })}
                  placeholder="https://... (URL Gambar QRIS)"
                  className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Merchant / Bisnis
                </label>
                <input
                  type="text"
                  value={paymentCfg.merchantName || ""}
                  onChange={(e) => updatePaymentCfg({ merchantName: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bank Transfer
                </label>
                <input
                  type="text"
                  value={paymentCfg.bankName || ""}
                  onChange={(e) => updatePaymentCfg({ bankName: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Rekening
                  </label>
                  <input
                    type="text"
                    value={paymentCfg.accountNumber || ""}
                    onChange={(e) =>
                      updatePaymentCfg({ accountNumber: e.target.value })
                    }
                    className="w-full rounded-xl bg-slate-50 px-2.5 py-2 text-xs border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Atas Nama
                  </label>
                  <input
                    type="text"
                    value={paymentCfg.accountHolder || ""}
                    onChange={(e) =>
                      updatePaymentCfg({ accountHolder: e.target.value })
                    }
                    className="w-full rounded-xl bg-slate-50 px-2.5 py-2 text-xs border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. WhatsApp Konfirmasi (628...)
                </label>
                <input
                  type="text"
                  value={paymentCfg.whatsappNumber || ""}
                  onChange={(e) =>
                    updatePaymentCfg({ whatsappNumber: e.target.value })
                  }
                  placeholder="6281234567890"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instruksi Pembayaran
                </label>
                <textarea
                  rows={2}
                  value={paymentCfg.paymentInstructions || ""}
                  onChange={(e) =>
                    updatePaymentCfg({ paymentInstructions: e.target.value })
                  }
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200 resize-y"
                />
              </div>

              {onTestPaymentModal && (
                <button
                  type="button"
                  onClick={onTestPaymentModal}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Preview Popup Pembayaran QRIS</span>
                </button>
              )}
            </div>
          )}

          {/* SUB-TAB 4: WARNA TEMA & FOOTER */}
          {globalTab === "theme" && (
            <div key="tab-theme" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Preset Tema Warna Halaman
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "violet", label: "Indigo Violet", color: "#4F39F6" },
                    { id: "navy", label: "Classic Navy", color: "#1E3A8A" },
                    { id: "emerald", label: "Emerald Agency", color: "#10B981" },
                    { id: "coral", label: "Vibrant Coral", color: "#EA580C" },
                  ].map((th) => {
                    const active = (pageData.theme || "violet") === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          onUpdatePageData("theme", th.id);
                          updateHeaderCfg({ primaryButtonColor: th.color });
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/40"
                          style={{ backgroundColor: th.color }}
                        />
                        <span className="truncate">{th.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pengaturan Footer */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pengaturan Footer
                  </span>
                  <input
                    type="checkbox"
                    checked={footerCfg.showFooter ?? true}
                    onChange={(e) => updateFooterCfg({ showFooter: e.target.checked })}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                </div>

                {footerCfg.showFooter !== false && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Nama Brand Footer
                      </label>
                      <input
                        type="text"
                        value={footerCfg.brandTitle || ""}
                        onChange={(e) =>
                          updateFooterCfg({ brandTitle: e.target.value })
                        }
                        className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Logo Footer
                      </label>
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          key="footer-logo-file-input"
                          ref={footerLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageFileRead(e, (url) =>
                              updateFooterCfg({ logoUrl: url })
                            )
                          }
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => footerLogoInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold cursor-pointer"
                        >
                          <Upload size={11} />
                          <span>Upload</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={footerCfg.logoUrl || ""}
                        onChange={(e) => updateFooterCfg({ logoUrl: e.target.value })}
                        className="w-full rounded-lg bg-white px-2 py-1 text-[11px] border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Deskripsi Singkat Footer
                      </label>
                      <textarea
                        rows={2}
                        value={footerCfg.description || ""}
                        onChange={(e) =>
                          updateFooterCfg({ description: e.target.value })
                        }
                        className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Teks Copyright
                      </label>
                      <input
                        type="text"
                        value={footerCfg.copyrightText || ""}
                        onChange={(e) =>
                          updateFooterCfg({ copyrightText: e.target.value })
                        }
                        className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Latar Footer
                        </label>
                        <input
                          type="color"
                          value={footerCfg.bgColor || "#121215"}
                          onChange={(e) => updateFooterCfg({ bgColor: e.target.value })}
                          className="h-7 w-full rounded border border-slate-200 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Warna Teks
                        </label>
                        <input
                          type="color"
                          value={footerCfg.textColor || "#FFFFFF"}
                          onChange={(e) =>
                            updateFooterCfg({ textColor: e.target.value })
                          }
                          className="h-7 w-full rounded border border-slate-200 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
