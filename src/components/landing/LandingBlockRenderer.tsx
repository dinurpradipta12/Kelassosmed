"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Users,
  Award,
  Library,
  ChevronDown,
  ShieldCheck,
  Zap,
  X,
  Layers,
  ChevronRight,
  KeyRound,
  BookOpen,
  MessageSquare,
  Bot,
  Gift,
  Clock,
  Compass,
  FolderOpen,
  FileText,
  GraduationCap,
} from "lucide-react";
import type { LandingBlock, PricingTierItem } from "@/types/landing";
import type { CheckoutItem } from "./PaymentCheckoutModal";
import {
  HeroBlockRenderer,
  BenefitsBlockRenderer,
  SystemShowcaseBlockRenderer,
  PaymentBlockRenderer,
  TextBlockRenderer,
  ImageBlockRenderer,
  VideoBlockRenderer,
  ClassBlockRenderer,
  CatalogBlockRenderer,
} from "./editor/renderers";
import { RumiMascotIllustration } from "@/components/learner/RumiEvolutionMascot";

const FEATURE_ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  Sparkles,
  Users,
  Award,
  Library,
  KeyRound,
  BookOpen,
  MessageSquare,
  Bot,
  Gift,
  Clock,
  ShieldCheck,
  Zap,
  Compass,
  FolderOpen,
  FileText,
  Star,
  GraduationCap,
};

const FALLBACK_FEATURE_ICONS = [Sparkles, Users, Award, Library] as const;

interface LandingBlockRendererProps {
  block: LandingBlock;
  onActionClick?: (actionType: string) => void;
  onSelectPackage?: (item: CheckoutItem | PricingTierItem) => void;
  primaryColor?: string;
  isEditing?: boolean;
}

export function LandingBlockRenderer({
  block,
  onActionClick,
  onSelectPackage,
  primaryColor = "#4F39F6",
  isEditing = false,
}: LandingBlockRendererProps) {
  const data = block.data || {};
  const styleCfg = block.style || {};
  const accent = styleCfg.accentColor || primaryColor;
  const paddingClass =
    styleCfg.paddingY === "sm"
      ? "py-8 sm:py-10"
      : styleCfg.paddingY === "lg"
      ? "py-20 sm:py-28"
      : "py-14 sm:py-20";
  const customSectionStyle: React.CSSProperties = {
    ...(styleCfg.bgColor ? { backgroundColor: styleCfg.bgColor } : {}),
    ...(styleCfg.textColor ? { color: styleCfg.textColor } : {}),
  };

  const [selectedCurriculum, setSelectedCurriculum] = useState<any | null>(null);
  const faqHeadingId = useId();
  const faqListRef = useRef<HTMLDivElement>(null);
  const [allFaqsOpen, setAllFaqsOpen] = useState(false);

  const syncAllFaqsOpenState = () => {
    const container = faqListRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLDetailsElement>(":scope > details")
    );
    setAllFaqsOpen(items.length > 0 && items.every((d) => d.open));
  };

  const handleToggleAllFaqs = () => {
    const container = faqListRef.current;
    if (!container) return;
    const nextOpen = !allFaqsOpen;
    for (const details of container.querySelectorAll<HTMLDetailsElement>(
      ":scope > details"
    )) {
      details.open = nextOpen;
    }
    setAllFaqsOpen(nextOpen);
  };

  useEffect(() => {
    if (!selectedCurriculum) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedCurriculum(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCurriculum]);

  switch (block.type) {
    case "hero": {
      const badgeText = block.badge || block.badgeText || data.badgeText;
      const eyebrow = block.eyebrow || data.eyebrow;
      const headline = block.headline || data.headline || "Judul Utama Landing Page";
      const body = block.subheadline || block.body || data.body || "Deskripsi produk dan penawaran Anda.";
      const buttonLabel = block.ctaText || block.buttonLabel || data.buttonLabel || "Mulai Sekarang";
      const secondaryLabel = block.secondaryButtonLabel ?? data.secondaryButtonLabel;
      const secondaryTargetId = data.secondaryTargetId || "flow-section";
      const imageUrl = block.imageUrl ?? data.imageUrl;
      const stats = Array.isArray(data.stats) ? data.stats : [];
      const showSystemPreview = Boolean(data.showSystemPreview) && !imageUrl;

      if (styleCfg.layoutVariant === "split") {
        return (
          <section
            style={customSectionStyle}
            className={`relative overflow-hidden ${paddingClass} border-b border-[#EAECEF] bg-white`}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <HeroBlockRenderer block={block as any} />
            </div>
          </section>
        );
      }

      return (
        <section
          style={customSectionStyle}
          className={`relative overflow-hidden ${paddingClass} border-b border-[#EAECEF] ${
            styleCfg.bgColor ? "" : "bg-gradient-to-b from-[#FFFFFF] via-[#F8F9FB] to-[#FFFFFF]"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto space-y-5">
              {badgeText && (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 px-3.5 py-1 text-xs font-bold text-[#059669]">
                  <span>{badgeText}</span>
                </div>
              )}

              {eyebrow && (
                <p
                  style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.75 } : undefined}
                  className="text-xs font-bold uppercase tracking-wider text-[#5E5E5E]"
                >
                  {eyebrow}
                </p>
              )}

              <h1
                style={styleCfg.textColor ? { color: styleCfg.textColor } : undefined}
                className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-[#121215] leading-[1.15]"
              >
                {headline}
              </h1>

              <p
                style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.8 } : undefined}
                className="text-sm sm:text-base text-[#5E5E5E] leading-relaxed max-w-2xl mx-auto"
              >
                {body}
              </p>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  style={{ backgroundColor: accent }}
                  onClick={() => onActionClick?.("register")}
                  className="inline-flex items-center gap-2 rounded-xl hover:opacity-95 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer"
                >
                  <span>{buttonLabel}</span>
                  <ArrowRight size={16} />
                </button>

                {secondaryLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      const el =
                        document.getElementById(secondaryTargetId) ||
                        document.getElementById("topics-section");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] px-5 py-3.5 text-xs sm:text-sm font-bold text-[#121215] border border-[#EAECEF] hover:border-[#D1D5DB] transition-all cursor-pointer"
                  >
                    <span>{secondaryLabel}</span>
                  </button>
                )}
              </div>
            </div>

            {/* System Stats Strip */}
            {stats.length > 0 && (
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
                {stats.map((st: any, sIdx: number) => (
                  <div
                    key={sIdx}
                    className="rounded-2xl bg-white border border-[#EAECEF] px-4 py-3 text-center shadow-2xs"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#5E5E5E]">
                      {st.label}
                    </div>
                    <div className="mt-0.5 text-xs sm:text-sm font-extrabold text-[#121215]">
                      {st.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Live Portal System Preview OR Uploaded Hero Image */}
            {imageUrl ? (
              <div className="mt-12 sm:mt-14 max-w-4xl mx-auto rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-[#EAECEF] to-[#FFFFFF] border border-[#EAECEF] shadow-[0_20px_50px_rgba(16,15,17,0.08)]">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#121215]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={data.imageAlt || "Hero Banner"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121215]/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            ) : (
              showSystemPreview && (
                <div className="mt-12 sm:mt-14 max-w-4xl mx-auto rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-[#EAECEF] to-[#FFFFFF] border border-[#EAECEF] shadow-[0_20px_50px_rgba(16,15,17,0.07)]">
                  <div className="rounded-2xl bg-white border border-[#EAECEF] p-4 sm:p-6 space-y-5">
                    {/* Top Mini Hero Bar inside Preview */}
                    <div className="rounded-2xl bg-gradient-to-r from-[#EEF2FF]/90 via-white to-[#ECFDF5]/60 border border-[#EAECEF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <RumiMascotIllustration
                          stage={4}
                          mood="happy"
                          sizeClass="h-14 w-14"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#EAECEF] px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              🌱 100% Full Organik
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                              Roadmap Siap Kerja
                            </span>
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-[#121215] truncate">
                            Belajar Terarah dari Nol hingga Siap Handle Brand
                          </div>
                          <p className="text-[11px] text-[#5E5E5E] leading-snug">
                            Kurikulum berjenjang, panduan Wiki SOP siap pakai, latihan praktik, dan diskusi langsung bersama Mentor.
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 sm:border-l sm:border-[#EAECEF] sm:pl-4 min-w-[190px] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#5E5E5E]">
                          <span>Roadmap Progres</span>
                          <span style={{ color: accent }}>3 Seri • 22 Modul</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#121215] truncate">
                          Fundamental → Workflow → Masterclass
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#EAECEF] overflow-hidden flex gap-0.5">
                          <div
                            className="h-full w-1/3 rounded-full"
                            style={{ backgroundColor: "#2563EB" }}
                          />
                          <div
                            className="h-full w-1/3 rounded-full"
                            style={{ backgroundColor: "#EA580C" }}
                          />
                          <div
                            className="h-full w-1/3 rounded-full"
                            style={{ backgroundColor: "#7C3AED" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3 Purpose-Focused Highlight Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
                          <BookOpen size={14} style={{ color: accent }} />
                          <span>Kurikulum Organik &amp; Wiki SOP</span>
                        </div>
                        <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                          Strategi konten organik, editorial calendar, SOP 30 hari handling akun, hingga template rate card.
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
                          <MessageSquare size={14} style={{ color: accent }} />
                          <span>Catatan, Kuis &amp; Diskusi Mentor</span>
                        </div>
                        <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                          Simpan catatan tiap bab, kerjakan kuis &amp; tugas praktik, dan dapatkan feedback langsung dari Mentor.
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
                          <Award size={14} style={{ color: accent }} />
                          <span>Rumi XP, Rewards &amp; Sertifikat HD</span>
                        </div>
                        <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                          Bangun kebiasaan belajar lewat evolusi Rumi, tukar Poin di Rewards Shop, dan raih Sertifikat HD.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      );
    }

    case "benefits":
      return (
        <section
          id="flow-section"
          style={customSectionStyle}
          className={`scroll-mt-20 ${paddingClass} bg-white border-b border-[#EAECEF]`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <BenefitsBlockRenderer block={block as any} accentColor={accent} />
          </div>
        </section>
      );

    case "system_showcase":
      return (
        <section
          id="ecosystem-section"
          style={customSectionStyle}
          className={`scroll-mt-20 rs-landing-deferred-section ${paddingClass} bg-[#F8F9FB] border-b border-[#EAECEF]`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SystemShowcaseBlockRenderer
              block={block as any}
              accentColor={accent}
              onActionClick={onActionClick}
            />
          </div>
        </section>
      );

    case "payment":
      return (
        <section id="payment-section" style={customSectionStyle} className={`scroll-mt-20 ${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <PaymentBlockRenderer block={block as any} />
          </div>
        </section>
      );

    case "text":
      return (
        <section style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <TextBlockRenderer block={block as any} />
          </div>
        </section>
      );

    case "image":
      return (
        <section style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ImageBlockRenderer block={block as any} />
          </div>
        </section>
      );

    case "video":
      return (
        <section style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <VideoBlockRenderer block={block as any} />
          </div>
        </section>
      );

    case "class":
      return (
        <section style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ClassBlockRenderer block={block as any} />
          </div>
        </section>
      );

    case "catalog":
      return (
        <section style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <CatalogBlockRenderer block={block as any} onSelectItem={onSelectPackage} />
          </div>
        </section>
      );

    case "features":
      const items = Array.isArray(data.items) ? data.items : [];
      return (
        <section
          id="features-section"
          style={customSectionStyle}
          className={`scroll-mt-20 ${paddingClass} bg-[#FFFFFF] border-b border-[#EAECEF]`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2
                style={styleCfg.textColor ? { color: styleCfg.textColor } : undefined}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]"
              >
                {data.heading || "Fitur Unggulan"}
              </h2>
              {data.subtitle && (
                <p
                  style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.75 } : undefined}
                  className="mt-2 text-xs sm:text-sm text-[#5E5E5E]"
                >
                  {data.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {items.map((feat: any, idx: number) => {
                const IconComponent =
                  (feat.icon && FEATURE_ICON_MAP[feat.icon]) ||
                  FALLBACK_FEATURE_ICONS[idx % FALLBACK_FEATURE_ICONS.length];
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#F8F9FB] p-6 border border-[#EAECEF] hover:border-[#4F39F6]/40 hover:bg-[#FFFFFF] transition-all duration-200"
                  >
                    <span
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                    >
                      <IconComponent size={18} />
                    </span>
                    <h3 className="text-sm font-bold text-[#121215] mb-1.5">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-[#5E5E5E] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );

    case "topics":
      const topics = Array.isArray(data.topics) ? data.topics : [];
      return (
        <section
          id="topics-section"
          style={customSectionStyle}
          className={`scroll-mt-20 rs-landing-deferred-section ${paddingClass} bg-[#F8F9FB] border-b border-[#EAECEF]`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Header Learning Center */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <div>
                <h2
                  style={styleCfg.textColor ? { color: styleCfg.textColor } : undefined}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]"
                >
                  {data.heading || "Learning Center"}
                </h2>
                <p
                  style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.75 } : undefined}
                  className="mt-1 text-xs sm:text-sm text-[#5E5E5E]"
                >
                  {data.subtitle || "Pilih kelas yang ingin kamu pelajari"}
                </p>
              </div>
              <div className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] px-3.5 py-1.5 text-xs font-semibold text-[#5E5E5E]">
                <Layers size={14} style={{ color: accent }} />
                <span>{topics.length} Kurikulum Tersedia</span>
              </div>
            </div>

            {/* 3 Cards Grid - Fundamental, Intermediate, Masterclass */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topics.map((t: any, idx: number) => {
                const hasModules = Array.isArray(t.modules) && t.modules.length > 0;

                // Color themes matching the user screenshot
                const headerBgStyle =
                  t.bannerTheme === "teal"
                    ? "bg-gradient-to-br from-[#146C75] via-[#1A7F8B] to-[#125A62]"
                    : t.bannerTheme === "coral"
                    ? "bg-gradient-to-br from-[#A85B53] via-[#BA6B63] to-[#8E4942]"
                    : t.bannerTheme === "purple"
                    ? "bg-gradient-to-br from-[#382B45] via-[#483758] to-[#2B2135]"
                    : "bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF]"; // Default Blue for Fundamental

                const tagPillColor =
                  t.tag === "INTERMEDIATE" || t.tag === "ADVANCE"
                    ? "bg-[#EA580C] text-white"
                    : t.tag === "MASTERCLASS"
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#3B82F6] text-white";

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasModules) {
                        setSelectedCurriculum(t);
                      }
                    }}
                    className={`group flex flex-col justify-between rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 ${
                      hasModules ? "cursor-pointer hover:border-[#4F39F6]/50" : ""
                    }`}
                  >
                    <div>
                      {/* Visual Header Banner */}
                      <div
                        className={`relative aspect-[16/11] p-4 flex flex-col justify-between text-white ${headerBgStyle}`}
                      >
                        {/* Top Bar inside banner */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${tagPillColor}`}
                          >
                            {t.tag}
                          </span>
                          <span className="text-[10px] font-bold text-white/80">
                            Ruang Sosmed
                          </span>
                        </div>

                        {/* Centered Banner Text */}
                        <div className="my-auto text-center px-1">
                          {t.eyebrow && (
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/70 mb-1">
                              {t.eyebrow}
                            </p>
                          )}
                          <h3 className="text-xs sm:text-sm font-extrabold uppercase leading-snug tracking-tight text-white drop-shadow-xs">
                            {t.bannerTitle || t.title}
                          </h3>
                          {t.bannerSubtitle && (
                            <p className="text-[9px] text-white/80 mt-1 italic line-clamp-1">
                              {t.bannerSubtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 pt-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] mb-1">
                          {t.category || t.tag}
                        </p>
                        <h4 className="text-sm font-bold text-[#121215] leading-snug mb-1.5 group-hover:text-[#4F39F6] transition-colors">
                          {t.title}
                        </h4>
                        <p className="text-xs text-[#5E5E5E] leading-relaxed line-clamp-3">
                          {t.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 pt-3 border-t border-[#EAECEF] bg-[#FAFAFA] flex items-center justify-between text-xs">
                      <span className="text-[#5E5E5E] font-medium text-[11px]">
                        {t.lessonsCount} lesson
                      </span>
                      {hasModules ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCurriculum(t);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                        >
                          <span>Buka Silabus</span>
                          <ChevronRight size={13} />
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#A1A1AA] italic">
                          Segera Hadir
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Curriculum Modal Drawer - Pure Syllabus List without Duration or Time Badges */}
          {selectedCurriculum && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="curriculum-modal-title"
              onClick={() => setSelectedCurriculum(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl max-h-[88vh] rounded-2xl bg-white shadow-2xl border border-[#EAECEF] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-[#EAECEF] bg-[#FAFAFC]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#2563EB]/10 text-[#2563EB] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                        {selectedCurriculum.category || "Kurikulum Kelas"}
                      </div>
                      <h3
                        id="curriculum-modal-title"
                        className="text-lg font-bold text-[#121215]"
                      >
                        {selectedCurriculum.title}
                      </h3>
                      <p className="text-xs text-[#5E5E5E] mt-0.5">
                        {selectedCurriculum.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCurriculum(null)}
                      aria-label="Tutup kurikulum"
                      className="rounded-lg p-1.5 text-[#5E5E5E] hover:bg-[#EAECEF] hover:text-[#121215] transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Modules List - Clean & pure syllabus list without duration badges */}
                <div className="p-4 overflow-y-auto space-y-2 flex-1">
                  {Array.isArray(selectedCurriculum.modules) &&
                    selectedCurriculum.modules.map((m: any, mIdx: number) => {
                      const modNum = String(m.number || mIdx + 1).padStart(2, "0");

                      return (
                        <div
                          key={mIdx}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EAECEF] bg-[#FFFFFF] hover:border-[#4F39F6]/40 hover:bg-[#F8F9FB] transition-all"
                        >
                          {/* Clean Number Badge */}
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1F3F9] text-[11px] font-bold text-[#121215] shrink-0">
                            {modNum}
                          </span>

                          {/* Module Title */}
                          <h5 className="text-xs font-semibold text-[#121215]">
                            {m.title}
                          </h5>
                        </div>
                      );
                    })}
                </div>

                {/* Modal Footer CTA */}
                <div className="p-4 border-t border-[#EAECEF] bg-[#FAFAFC] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#5E5E5E]">
                    Akses seluruh video &amp; materi dengan akun Ruang Sosmed.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCurriculum(null);
                      onActionClick?.("register");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    <span>Mulai Belajar</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      );

    case "pricing":
      const tiers = Array.isArray(data.tiers) ? data.tiers : [];
      const pricingFootnote = data.footnote;
      return (
        <section
          id="pricing-section"
          style={customSectionStyle}
          className={`scroll-mt-20 rs-landing-deferred-section ${paddingClass} bg-[#FFFFFF] border-b border-[#EAECEF]`}
        >
          <div className={`${tiers.length >= 3 ? "max-w-6xl" : "max-w-5xl"} mx-auto px-4 sm:px-6`}>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2
                style={styleCfg.textColor ? { color: styleCfg.textColor } : undefined}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]"
              >
                {data.heading || "Paket Keanggotaan"}
              </h2>
              {data.subtitle && (
                <p
                  style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.75 } : undefined}
                  className="mt-2 text-xs sm:text-sm text-[#5E5E5E]"
                >
                  {data.subtitle}
                </p>
              )}
            </div>

            <div className={`grid grid-cols-1 ${tiers.length === 3 ? "md:grid-cols-3" : tiers.length === 1 ? "max-w-md mx-auto" : "md:grid-cols-2"} gap-6 lg:gap-8 items-stretch`}>
              {tiers.map((tier: any, idx: number) => {
                const isHighlight = tier.highlighted;
                const handleTierClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const action =
                    tier.buttonAction ||
                    (isHighlight || (tier.price && !String(tier.price).includes("Rp 0") && String(tier.price).toLowerCase() !== "gratis")
                      ? "payment_modal"
                      : "register");

                  if (action === "payment_modal" && onSelectPackage) {
                    onSelectPackage(tier);
                  } else if (action === "scroll_payment") {
                    const el = document.getElementById("payment-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  } else if (action === "custom_link" && tier.customLink) {
                    window.open(tier.customLink, "_blank", "noopener,noreferrer");
                  } else if (onSelectPackage && action === "payment_modal") {
                    onSelectPackage(tier);
                  } else {
                    onActionClick?.(isHighlight ? "upgrade" : "register");
                  }
                };

                return (
                  <div
                    key={tier.id || idx}
                    style={
                      isHighlight
                        ? { borderColor: accent, boxShadow: `0 12px 36px ${accent}22` }
                        : undefined
                    }
                    className={`relative flex flex-col justify-between rounded-2xl p-7 border transition-all ${
                      isHighlight
                        ? "bg-[#FFFFFF] ring-2 ring-offset-1"
                        : "bg-[#F8F9FB] border-[#EAECEF]"
                    }`}
                  >
                    {tier.badge && (
                      <span
                        style={{ backgroundColor: accent }}
                        className="absolute -top-3 left-6 inline-flex rounded-full px-3 py-0.5 text-[10px] font-bold text-white shadow-xs"
                      >
                        {tier.badge}
                      </span>
                    )}

                    <div>
                      <h3 className="text-lg font-bold text-[#121215]">
                        {tier.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#5E5E5E]">
                        {tier.description}
                      </p>

                      <div className="mt-4 mb-6 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-[#121215]">
                          {tier.price}
                        </span>
                        <span className="text-xs text-[#5E5E5E]">
                          /{tier.period}
                        </span>
                      </div>

                      <ul className="space-y-2.5 text-xs text-[#121215]">
                        {Array.isArray(tier.features) &&
                          tier.features.map((f: string, fIdx: number) => (
                            <li key={fIdx} className="flex items-start gap-2">
                              <Check
                                size={14}
                                className="text-[#10B981] shrink-0 mt-0.5"
                              />
                              <span>{f}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="mt-8 pt-4">
                      <button
                        type="button"
                        onClick={handleTierClick}
                        style={
                          isHighlight
                            ? { backgroundColor: accent }
                            : undefined
                        }
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isHighlight
                            ? "hover:opacity-95 text-white shadow-md"
                            : "bg-[#FFFFFF] hover:bg-[#EAECEF] text-[#121215] border border-[#EAECEF]"
                        }`}
                      >
                        {tier.buttonLabel || "Pilih Paket"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {pricingFootnote && (
              <div className="mt-8 rounded-2xl bg-[#F8F9FB] border border-[#EAECEF] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5E5E5E]">
                <div className="flex items-start sm:items-center gap-2.5">
                  <KeyRound size={16} style={{ color: accent }} className="shrink-0 mt-0.5 sm:mt-0" />
                  <p className="leading-relaxed">{pricingFootnote}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onActionClick?.("login")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold shrink-0 hover:underline cursor-pointer"
                  style={{ color: accent }}
                >
                  <span>Redeem Kode / Login</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </section>
      );

    case "testimonial":
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      return (
        <section
          style={customSectionStyle}
          className={`rs-landing-deferred-section ${paddingClass} bg-[#F8F9FB] border-b border-[#EAECEF]`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2
                style={styleCfg.textColor ? { color: styleCfg.textColor } : undefined}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]"
              >
                {data.heading || "Cerita Alumni"}
              </h2>
              {data.subtitle && (
                <p
                  style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.75 } : undefined}
                  className="mt-2 text-xs sm:text-sm text-[#5E5E5E]"
                >
                  {data.subtitle}
                </p>
              )}
            </div>

            <div className={`grid grid-cols-1 ${reviews.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
              {reviews.map((rev: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-xs flex flex-col justify-between"
                >
                  <p className="text-xs sm:text-sm text-[#121215] leading-relaxed italic mb-6">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#121215]">
                        {rev.name}
                      </h4>
                      <p className="text-[11px] text-[#5E5E5E]">
                        {rev.role} • {rev.company}
                      </p>
                    </div>

                    <div className="flex text-[#F59E0B]">
                      {[...Array(rev.rating || 5)].map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          size={13}
                          fill="#F59E0B"
                          stroke="none"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "faq":
      const faqs = Array.isArray(data.faqs) ? data.faqs : [];
      return (
        <section
          id="faq-section"
          aria-labelledby={faqHeadingId}
          style={customSectionStyle}
          className={`scroll-mt-20 rs-landing-deferred-section ${paddingClass} bg-[#FFFFFF] border-b border-[#EAECEF]`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2
                id={faqHeadingId}
                style={styleCfg.textColor ? { color: styleCfg.textColor } : undefined}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]"
              >
                {data.heading || "Pertanyaan yang Sering Diajukan"}
              </h2>
              {data.subtitle && (
                <p
                  style={styleCfg.textColor ? { color: styleCfg.textColor, opacity: 0.75 } : undefined}
                  className="mt-2 text-xs sm:text-sm text-[#5E5E5E]"
                >
                  {data.subtitle}
                </p>
              )}
            </div>

            {faqs.length > 1 && (
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={handleToggleAllFaqs}
                  aria-expanded={allFaqsOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAECEF] bg-[#F8F9FB] hover:bg-[#EAECEF]/70 px-3 py-1.5 text-[11px] font-bold text-[#121215] transition-colors cursor-pointer"
                >
                  <span>{allFaqsOpen ? "Tutup Semua" : "Buka Semua"}</span>
                </button>
              </div>
            )}

            <div ref={faqListRef} className="space-y-3">
              {faqs.map((faq: any, idx: number) => (
                <details
                  key={idx}
                  onToggle={syncAllFaqsOpenState}
                  className="rs-faq-details group rounded-2xl bg-[#F8F9FB] border border-[#EAECEF] p-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-[#121215] text-xs sm:text-sm">
                    <ChevronDown
                      size={16}
                      className="shrink-0 transition duration-200 -rotate-90 group-open:rotate-0 text-[#5E5E5E]"
                    />
                    <span>{faq.question}</span>
                  </summary>
                  <p className="mt-3 text-xs text-[#5E5E5E] leading-relaxed pt-2 border-t border-[#EAECEF]">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );

    case "cta":
      return (
        <section
          style={{
            backgroundColor: styleCfg.bgColor || "#121215",
            color: styleCfg.textColor || "#FFFFFF",
          }}
          className={`rs-landing-deferred-section ${paddingClass}`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {data.heading || "Mulai Langkah Karirmu Hari Ini"}
            </h2>
            <p className="text-xs sm:text-sm opacity-75 max-w-xl mx-auto leading-relaxed">
              {data.body || "Bergabung bersama komunitas pembelajar Ruang Sosmed 2.0."}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                style={{ backgroundColor: accent }}
                onClick={() => onActionClick?.("register")}
                className="inline-flex items-center gap-2 rounded-xl hover:opacity-95 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all cursor-pointer"
              >
                <span>{data.buttonLabel || "Daftar Akun Sekarang"}</span>
                <ArrowRight size={16} />
              </button>

              {data.secondaryButtonLabel && (
                <button
                  type="button"
                  onClick={() => onActionClick?.("login")}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-3.5 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer"
                >
                  <span>{data.secondaryButtonLabel}</span>
                </button>
              )}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
