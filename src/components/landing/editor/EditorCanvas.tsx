"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Plus,
  Layers,
  Palette,
  QrCode,
  Sparkles,
  LogIn,
  UserPlus,
  LayoutTemplate,
} from "lucide-react";
import type {
  LandingBlock,
  BlockType,
  LandingPageData,
  PricingTierItem,
} from "@/types/landing";
import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
} from "@/types/landing";
import { LandingBlockRenderer } from "../LandingBlockRenderer";
import type { CheckoutItem } from "../PaymentCheckoutModal";
import type { GlobalInspectorTab } from "./InspectorPanel";

interface EditorCanvasProps {
  pageData: LandingPageData;
  selectedBlockId: string | null;
  activeGlobalTab?: GlobalInspectorTab;
  onSelectBlock: (id: string | null) => void;
  onSelectGlobalSection?: (tab: GlobalInspectorTab) => void;
  onMoveBlock: (index: number, direction: "up" | "down") => void;
  onDuplicateBlock: (index: number) => void;
  onDeleteBlock: (id: string) => void;
  onDropBlockAt: (index: number, type: BlockType) => void;
  onReorderBlock?: (fromIndex: number, toIndex: number) => void;
  onTestPackagePayment?: (item: CheckoutItem | PricingTierItem) => void;
}

export function EditorCanvas({
  pageData,
  selectedBlockId,
  activeGlobalTab,
  onSelectBlock,
  onSelectGlobalSection,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onDropBlockAt,
  onTestPackagePayment,
}: EditorCanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const blocks = pageData.blocks || [];
  const headerCfg = {
    ...DEFAULT_HEADER_CONFIG,
    ...(pageData.headerConfig || {}),
  };
  const footerCfg = {
    ...DEFAULT_FOOTER_CONFIG,
    ...(pageData.footerConfig || {}),
  };
  const primaryColor = headerCfg.primaryButtonColor || "#4F39F6";

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const blockType = e.dataTransfer.getData(
      "application/x-landing-block-type"
    ) as BlockType;
    if (blockType) {
      onDropBlockAt(index, blockType);
    }
  };

  const isHeaderActive = !selectedBlockId && activeGlobalTab === "header";
  const isFooterActive = !selectedBlockId && activeGlobalTab === "theme";
  const isGeneralActive = !selectedBlockId && activeGlobalTab === "general";

  return (
    <main
      className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectBlock(null);
          onSelectGlobalSection?.("general");
        }
      }}
    >
      {/* Top Canvas Meta Strip */}
      <div className="max-w-5xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <LayoutTemplate size={12} className="text-indigo-600" />
            ARUNIKA LANDING PAGE
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[260px]">
            {pageData.title || "Ruang Sosmed 2.0"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onSelectBlock(null);
              onSelectGlobalSection?.("header");
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
              isHeaderActive
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <Sparkles size={11} />
            Edit Header
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectBlock(null);
              onSelectGlobalSection?.("payment");
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
              !selectedBlockId && activeGlobalTab === "payment"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <QrCode size={11} />
            QRIS &amp; Checkout
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectBlock(null);
              onSelectGlobalSection?.("theme");
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
              isFooterActive
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <Palette size={11} />
            Warna &amp; Footer
          </button>
        </div>
      </div>

      {/* Live Website Frame (1:1 parity with PublicLandingView) */}
      <div
        className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[88vh] flex flex-col justify-between transition-all"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectBlock(null);
            onSelectGlobalSection?.("general");
          }
        }}
      >
        {/* INTERACTIVE HEADER REGION (Announcement Bar + Navbar) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectBlock(null);
            onSelectGlobalSection?.("header");
          }}
          className={`group relative cursor-pointer transition-all ${
            isHeaderActive
              ? "ring-2 ring-inset ring-indigo-500"
              : "hover:ring-2 hover:ring-inset hover:ring-indigo-300"
          }`}
          title="Klik untuk edit Top Bar, Logo, Menu Navigasi, dan Warna Header"
        >
          {/* Floating badge */}
          <div
            className={`absolute top-2 right-3 z-30 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs transition-opacity pointer-events-none ${
              isHeaderActive
                ? "bg-indigo-600 text-white opacity-100"
                : "bg-slate-900/85 text-white opacity-0 group-hover:opacity-100"
            }`}
          >
            <Sparkles size={10} />
            <span>Header &amp; Navbar (Klik untuk edit)</span>
          </div>

          {/* 1. Announcement Bar */}
          {headerCfg.showAnnouncement !== false && (
            <div
              className="text-white text-[11px] py-2 px-4 text-center flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: headerCfg.announcementBgColor || "#121215",
              }}
            >
              <span
                className="inline-flex items-center gap-1.5 font-semibold"
                style={{
                  color: headerCfg.announcementBadgeColor || "#10B981",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor:
                      headerCfg.announcementBadgeColor || "#10B981",
                  }}
                />
                {headerCfg.announcementBadge || "Pendaftaran Batch Dibuka"}
              </span>
              {headerCfg.announcementText && (
                <>
                  <span className="text-white/60 hidden sm:inline">•</span>
                  <span className="text-white/80 hidden sm:inline truncate max-w-xl">
                    {headerCfg.announcementText}
                  </span>
                </>
              )}
            </div>
          )}

          {/* 2. Sticky Navbar Preview */}
          {headerCfg.showNavbar !== false && (
            <header
              className="border-b border-[#EAECEF] transition-colors"
              style={{
                backgroundColor: headerCfg.navbarBgColor || "#FFFFFF",
              }}
            >
              <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                {/* Brand */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={headerCfg.logoUrl || "/logo1.png"}
                    alt={headerCfg.brandTitle || "Logo"}
                    className="h-8 w-auto max-w-[140px] rounded-lg object-contain shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/favicon.png";
                    }}
                  />
                  {headerCfg.brandTitle && (
                    <span className="text-sm font-bold tracking-tight text-[#121215] truncate">
                      {headerCfg.brandTitle}
                    </span>
                  )}
                </div>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-[#5E5E5E]">
                  {(headerCfg.navLinks || []).map((link) => (
                    <span
                      key={link.id}
                      className="hover:text-[#121215] transition-colors whitespace-nowrap"
                    >
                      {link.label}
                    </span>
                  ))}
                </nav>

                {/* Auth Actions Preview */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#121215] bg-[#F3F4F6]">
                    <LogIn size={13} />
                    <span>{headerCfg.loginLabel || "Masuk"}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <UserPlus size={13} />
                    <span>{headerCfg.registerLabel || "Daftar Akun"}</span>
                  </span>
                </div>
              </div>
            </header>
          )}
        </div>

        {/* Optional Global Visual Hero Cover (if set in General Settings) */}
        {pageData.headerImageUrl && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(null);
              onSelectGlobalSection?.("general");
            }}
            className={`group relative cursor-pointer border-b border-slate-200 ${
              isGeneralActive ? "ring-2 ring-inset ring-indigo-500" : ""
            }`}
            title="Foto Header Global (klik untuk edit di tab Umum)"
          >
            <img
              src={pageData.headerImageUrl}
              alt={pageData.title || "Header Visual"}
              className="w-full h-44 sm:h-56 object-cover"
            />
            <span className="absolute bottom-2 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              Banner Header Global
            </span>
          </div>
        )}

        {/* MAIN BLOCKS CANVAS AREA */}
        <div className="flex-1 p-3 sm:p-5 space-y-3 bg-white">
          {blocks.length === 0 ? (
            <div
              onDragOver={(e) => handleDragOver(e, 0)}
              onDragLeave={(e) => handleDragLeave(e, 0)}
              onDrop={(e) => handleDrop(e, 0)}
              className={`p-14 text-center rounded-2xl border-2 border-dashed transition-all ${
                dragOverIndex === 0
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="h-12 w-12 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Layers size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-700">
                Canvas masih kosong
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tarik elemen dari panel sebelah kiri atau klik salah satu kartu
                blok untuk mulai menyusun landing page.
              </p>
            </div>
          ) : (
            blocks.map((block, index) => {
              const isSelected = block.id === selectedBlockId;
              const isFirst = index === 0;
              const isLast = index === blocks.length - 1;

              return (
                <React.Fragment key={block.id}>
                  {/* Drop indicator above block */}
                  <div
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={(e) => handleDragLeave(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`transition-all rounded-full ${
                      dragOverIndex === index
                        ? "h-9 bg-blue-100 border-2 border-dashed border-blue-500 flex items-center justify-center text-[11px] font-bold text-blue-600"
                        : "h-2 opacity-0 hover:opacity-100 hover:h-3"
                    }`}
                  >
                    {dragOverIndex === index &&
                      `Lepas blok di sini (Posisi ${index + 1})`}
                  </div>

                  {/* Interactive Block Wrapper */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBlock(block.id);
                    }}
                    className={`group relative rounded-2xl overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-2 shadow-sm"
                        : "hover:ring-1 hover:ring-slate-300"
                    }`}
                  >
                    {/* Selected Active Chip Indicator */}
                    {isSelected && (
                      <div className="absolute top-2.5 left-3 z-30 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs pointer-events-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        <span className="capitalize">
                          Sedang Diedit: {block.type}
                        </span>
                      </div>
                    )}

                    {/* Floating Action Buttons (Hover State & Active State) */}
                    <div
                      className={`absolute top-2.5 right-3 z-30 flex items-center gap-1 p-1 rounded-xl bg-white/95 backdrop-blur-xs border border-slate-200 shadow-sm transition-opacity ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => onMoveBlock(index, "up")}
                        title="Geser ke atas"
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      >
                        <ChevronUp size={14} />
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => onMoveBlock(index, "down")}
                        title="Geser ke bawah"
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      >
                        <ChevronDown size={14} />
                      </button>

                      <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

                      <button
                        type="button"
                        onClick={() => onDuplicateBlock(index)}
                        title="Duplikat blok"
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteBlock(block.id)}
                        title="Hapus blok"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Exact 1:1 Block Renderer */}
                    <LandingBlockRenderer
                      block={block}
                      isEditing={true}
                      primaryColor={primaryColor}
                      onSelectPackage={(item) => onTestPackagePayment?.(item)}
                      onActionClick={() => onSelectBlock(block.id)}
                    />
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Bottom Drop Zone Indicator */}
          {blocks.length > 0 && (
            <div
              onDragOver={(e) => handleDragOver(e, blocks.length)}
              onDragLeave={(e) => handleDragLeave(e, blocks.length)}
              onDrop={(e) => handleDrop(e, blocks.length)}
              className={`mt-4 p-4 rounded-xl border-2 border-dashed transition-all text-center ${
                dragOverIndex === blocks.length
                  ? "border-blue-500 bg-blue-50/50 text-blue-600 text-xs font-bold"
                  : "border-slate-200/80 hover:border-slate-300 text-slate-400 text-[11px]"
              }`}
            >
              {dragOverIndex === blocks.length ? (
                "Lepas untuk menambahkan blok di posisi paling bawah"
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Plus size={13} />
                  <span>
                    Tarik blok baru ke sini untuk menambah di bagian paling bawah
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* INTERACTIVE FOOTER REGION */}
        {footerCfg.showFooter !== false && (
          <footer
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(null);
              onSelectGlobalSection?.("theme");
            }}
            className={`group relative py-10 border-t border-white/10 cursor-pointer transition-all ${
              isFooterActive
                ? "ring-2 ring-inset ring-indigo-500"
                : "hover:ring-2 hover:ring-inset hover:ring-indigo-400"
            }`}
            style={{
              backgroundColor: footerCfg.bgColor || "#121215",
              color: footerCfg.textColor || "#FFFFFF",
            }}
            title="Klik untuk edit Footer & Tema Halaman"
          >
            <div
              className={`absolute top-2.5 right-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-opacity pointer-events-none ${
                isFooterActive
                  ? "bg-indigo-600 text-white opacity-100"
                  : "bg-white/15 text-white opacity-0 group-hover:opacity-100"
              }`}
            >
              <Palette size={10} />
              <span>Footer &amp; Tema (Klik untuk edit)</span>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-5 pb-6 border-b border-white/10 text-center md:text-left">
                <div className="flex items-center gap-2.5">
                  <img
                    src={
                      footerCfg.logoUrl || headerCfg.logoUrl || "/favicon.png"
                    }
                    alt={footerCfg.brandTitle || "Ruang Sosmed 2.0"}
                    className="h-8 w-8 rounded-lg object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/favicon.png";
                    }}
                  />
                  <span className="text-sm font-bold tracking-tight">
                    {footerCfg.brandTitle || "Ruang Sosmed 2.0"}
                  </span>
                </div>

                <p className="text-xs opacity-65 max-w-md">
                  {footerCfg.description ||
                    "Platform LMS & Social Media Studio terintegrasi untuk akselerasi kemampuan praktis digital marketing."}
                </p>

                <span className="inline-flex items-center gap-1 text-xs opacity-80">
                  Masuk Akun
                </span>
              </div>

              <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] opacity-50">
                <p>
                  © {new Date().getFullYear()}{" "}
                  {footerCfg.copyrightText ||
                    `${footerCfg.brandTitle || "Ruang Sosmed 2.0"}. All rights reserved.`}
                </p>
                <p>Built with Next.js &amp; Supabase</p>
              </div>
            </div>
          </footer>
        )}
      </div>
    </main>
  );
}
