"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Users,
  Award,
  Library,
  ChevronDown,
  Play,
  PlayCircle,
  ShieldCheck,
  Zap,
  Lock,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { LandingBlock, PricingTierItem } from "@/types/landing";
import type { CheckoutItem } from "./PaymentCheckoutModal";
import {
  HeroBlockRenderer,
  BenefitsBlockRenderer,
  PaymentBlockRenderer,
  TextBlockRenderer,
  ImageBlockRenderer,
  VideoBlockRenderer,
  ClassBlockRenderer,
  CatalogBlockRenderer,
} from "./editor/renderers";

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
      const imageUrl = block.imageUrl ?? data.imageUrl;

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
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#121215] leading-[1.15]"
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
                      const el = document.getElementById("topics-section");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] px-5 py-3.5 text-xs sm:text-sm font-bold text-[#121215] border border-[#EAECEF] hover:border-[#D1D5DB] transition-all cursor-pointer"
                  >
                    <span>{secondaryLabel}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Visual Image Banner Mockup */}
            {imageUrl && (
              <div className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-[#EAECEF] to-[#FFFFFF] border border-[#EAECEF] shadow-[0_20px_50px_rgba(16,15,17,0.08)]">
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
            )}
          </div>
        </section>
      );
    }

    case "benefits":
      return (
        <section style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <BenefitsBlockRenderer block={block as any} />
          </div>
        </section>
      );

    case "payment":
      return (
        <section id="payment-section" style={customSectionStyle} className={`${paddingClass} bg-white border-b border-[#EAECEF]`}>
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
          className={`${paddingClass} bg-[#FFFFFF] border-b border-[#EAECEF]`}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((feat: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#F8F9FB] p-6 border border-[#EAECEF] hover:border-[#4F39F6]/40 hover:bg-[#FFFFFF] transition-all duration-200"
                >
                  <span
                    style={{ backgroundColor: `${accent}18`, color: accent }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                  >
                    {idx === 0 || feat.icon === "Sparkles" ? (
                      <Sparkles size={18} />
                    ) : idx === 1 || feat.icon === "Users" ? (
                      <Users size={18} />
                    ) : idx === 2 || feat.icon === "Award" ? (
                      <Award size={18} />
                    ) : (
                      <Library size={18} />
                    )}
                  </span>
                  <h3 className="text-sm font-bold text-[#121215] mb-1.5">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
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
          className={`${paddingClass} bg-[#F8F9FB] border-b border-[#EAECEF]`}
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
      return (
        <section
          id="pricing-section"
          style={customSectionStyle}
          className={`${paddingClass} bg-[#FFFFFF] border-b border-[#EAECEF]`}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
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

            <div className={`grid grid-cols-1 ${tiers.length === 3 ? "md:grid-cols-3" : tiers.length === 1 ? "max-w-md mx-auto" : "md:grid-cols-2"} gap-8 items-stretch`}>
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
          </div>
        </section>
      );

    case "testimonial":
      const reviews = Array.isArray(data.reviews) ? data.reviews : [];
      return (
        <section
          style={customSectionStyle}
          className={`${paddingClass} bg-[#F8F9FB] border-b border-[#EAECEF]`}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          style={customSectionStyle}
          className={`${paddingClass} bg-[#FFFFFF] border-b border-[#EAECEF]`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2
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

            <div className="space-y-4">
              {faqs.map((faq: any, idx: number) => (
                <details
                  key={idx}
                  className="group rounded-2xl bg-[#F8F9FB] border border-[#EAECEF] p-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-[#121215] text-xs sm:text-sm">
                    <span>{faq.question}</span>
                    <ChevronDown
                      size={16}
                      className="transition duration-200 group-open:rotate-180 text-[#5E5E5E]"
                    />
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
          className={`${paddingClass}`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {data.heading || "Mulai Langkah Karirmu Hari Ini"}
            </h2>
            <p className="text-xs sm:text-sm opacity-75 max-w-xl mx-auto leading-relaxed">
              {data.body || "Bergabung bersama komunitas pembelajar Ruang Sosmed 2.0."}
            </p>
            <div className="pt-2">
              <button
                type="button"
                style={{ backgroundColor: accent }}
                onClick={() => onActionClick?.("register")}
                className="inline-flex items-center gap-2 rounded-xl hover:opacity-95 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition-all cursor-pointer"
              >
                <span>{data.buttonLabel || "Daftar Akun Sekarang"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
