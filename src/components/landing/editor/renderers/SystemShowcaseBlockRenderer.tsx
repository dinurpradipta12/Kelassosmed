"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  FolderOpen,
  Gift,
  KeyRound,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import type {
  SystemShowcaseBlock,
  SystemShowcaseTabItem,
  SystemShowcaseVisualType,
} from "@/types/landing";
import { DEFAULT_SYSTEM_SHOWCASE_TABS } from "@/types/landing";
import { RUMI_LEVEL_TIERS, type RumiEvolutionStage } from "@/lib/rumi-xp";
import { RumiMascotIllustration } from "@/components/learner/RumiEvolutionMascot";

interface SystemShowcaseBlockRendererProps {
  block: SystemShowcaseBlock;
  accentColor?: string;
  onActionClick?: (actionType: string) => void;
}

const STREAM_DECK_ITEMS = [
  { key: "1", label: "Beranda" },
  { key: "2", label: "My Learning" },
  { key: "3", label: "Katalog" },
  { key: "4", label: "Favorit" },
  { key: "5", label: "Hadiah" },
  { key: "6", label: "Akses PRO" },
];

function ShowcaseVisualPanel({
  visualType,
  accentColor,
}: {
  visualType: SystemShowcaseVisualType;
  accentColor: string;
}) {
  if (visualType === "rumi_evolution") {
    return (
      <div className="rounded-2xl border border-[#EAECEF] bg-gradient-to-br from-[#F8F9FF] via-white to-[#EEF2FF]/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
              5 Tahap Evolusi Rumi XP
            </span>
            <h4 className="text-sm font-bold text-[#121215]">
              Dari Baby Rumi 🌱 sampai Superior Rumi 🏆
            </h4>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shrink-0">
            <Sparkles size={11} />
            2× XP di PRO
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {RUMI_LEVEL_TIERS.map((tier) => {
            const isTop = tier.stage === 5;
            return (
              <div
                key={tier.level}
                className={`rounded-xl border p-2 text-center flex flex-col items-center justify-between transition-colors ${
                  isTop
                    ? "bg-gradient-to-b from-amber-50 via-white to-indigo-50/70 text-[#121215] border-amber-300 ring-1 ring-amber-200/80 shadow-xs"
                    : "bg-white text-[#121215] border-[#EAECEF]"
                }`}
              >
                <RumiMascotIllustration
                  stage={tier.stage as RumiEvolutionStage}
                  mood={tier.stage === 5 ? "excited" : "happy"}
                  sizeClass="h-11 w-11"
                />
                <div className="mt-1.5 space-y-0.5 w-full">
                  <div
                    className={`text-[9px] font-extrabold uppercase ${
                      isTop ? "text-amber-600" : "text-indigo-600"
                    }`}
                  >
                    Lv.{tier.level}
                  </div>
                  <div className="text-[10px] font-bold truncate">
                    {tier.formName.replace(" Rumi", "")}
                  </div>
                  <div className="text-[9px] text-[#5E5E5E]">
                    {tier.minXp} XP
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-white border border-[#EAECEF] text-[#121215] p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold flex items-center gap-1.5 text-[#121215]">
              <Bot size={14} className="text-indigo-600" />
              Rumi Floating Stream Deck
            </span>
            <span className="text-[10px] text-[#5E5E5E]">
              Pintasan tombol 1–6 &amp; FAQ
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STREAM_DECK_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-2 flex items-center gap-2"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700 shrink-0">
                  {item.key}
                </span>
                <span className="text-[11px] font-semibold text-[#121215] truncate">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visualType === "access_rewards") {
    return (
      <div className="rounded-2xl border border-[#EAECEF] bg-gradient-to-br from-emerald-50/50 via-white to-amber-50/40 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Akses, Poin Bintang &amp; Sertifikat
            </span>
            <h4 className="text-sm font-bold text-[#121215]">
              Banyak Cara Membuka Kelas &amp; Mengklaim Hadiah
            </h4>
          </div>
          <Ticket size={18} className="text-emerald-600 shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white border border-[#EAECEF] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
              <KeyRound size={14} className="text-indigo-600" />
              <span>Redeem Kode Folder</span>
            </div>
            <p className="text-[11px] text-[#5E5E5E]">
              Ketik kode seperti{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 font-bold text-amber-800">
                SICS-2026
              </code>{" "}
              untuk membuka seluruh materi batch.
            </p>
          </div>

          <div className="rounded-xl bg-white border border-[#EAECEF] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
              <Sparkles size={14} className="text-violet-600" />
              <span>Trial 3/7 Hari &amp; Voucher PRO</span>
            </div>
            <p className="text-[11px] text-[#5E5E5E]">
              Coba Basic/PRO lebih hemat via Trial atau aktifkan Kode Voucher
              PRO berjangka langsung di akunmu.
            </p>
          </div>

          <div className="rounded-xl bg-white border border-[#EAECEF] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
              <Gift size={14} className="text-amber-600" />
              <span>Rewards Shop &amp; Leaderboard</span>
            </div>
            <p className="text-[11px] text-[#5E5E5E]">
              Poin Bintang (★) bisa membuka bab lanjutan atau ditukar Template,
              E-Book, Voucher &amp; 1-on-1 Mentoring.
            </p>
          </div>

          <div className="rounded-xl bg-white border border-[#EAECEF] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#121215]">
              <Award size={14} className="text-emerald-600" />
              <span>Sertifikat HD &amp; QRIS Instan</span>
            </div>
            <p className="text-[11px] text-[#5E5E5E]">
              Checkout QRIS/Transfer cepat dengan konfirmasi praktis, plus
              Sertifikat HD otomatis saat lulus 100%.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (visualType === "admin_studio") {
    return (
      <div className="rounded-2xl border border-[#EAECEF] bg-[#121215] text-white p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
              Admin &amp; Mentor Studio
            </span>
            <h4 className="text-sm font-bold text-white">
              Semua Operasional Akademi dalam Satu Studio
            </h4>
          </div>
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <FolderOpen size={14} className="text-sky-400" />
              <span>Project Auto-Assign ON</span>
            </div>
            <p className="text-[11px] text-white/70">
              Folder berkode &amp; project publik langsung otomatis ter-assign
              ke tiap akun siswa baru via trigger Supabase.
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Layers size={14} className="text-amber-300" />
              <span>Builder Kuis 5 Tipe Soal</span>
            </div>
            <p className="text-[11px] text-white/70">
              Multiple Choice, Fill in Blank, Hotspot Image, Categorization,
              dan Open-Ended Essay dengan rubrik penilaian mentor.
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Users size={14} className="text-violet-300" />
              <span>Direktori Siswa &amp; Grading Inbox</span>
            </div>
            <p className="text-[11px] text-white/70">
              Pantau progres cohort, nilai tugas, kelola masa aktif PRO,
              voucher, dan keamanan sesi akun secara realtime.
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sparkles size={14} className="text-emerald-300" />
              <span>Visual Landing Page Builder</span>
            </div>
            <p className="text-[11px] text-white/70">
              Susun seluruh blok halaman depan, warna, kurikulum, harga, hingga
              QRIS langsung secara visual tanpa ubah kode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default: "learner_portal"
  return (
    <div className="rounded-2xl border border-[#EAECEF] bg-gradient-to-br from-[#F8F9FB] via-white to-[#EEF2FF]/60 p-4 sm:p-5 space-y-3.5">
      {/* Mini Header Snapshot */}
      <div className="rounded-xl bg-white border border-[#EAECEF] p-3.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <RumiMascotIllustration stage={2} mood="happy" sizeClass="h-11 w-11" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-indigo-600">
              Ruang Kelas Interaktif • 100% Full Organik
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[#121215] truncate">
              Kurikulum Berjenjang &amp; Wiki SOP Siap Pakai
            </div>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end shrink-0 text-right">
          <span
            style={{ color: accentColor }}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold"
          >
            <CheckCircle2 size={12} />
            <span>Progres Bab Terukur</span>
          </span>
          <span className="text-[10px] text-[#5E5E5E]">
            Fundamental → Masterclass
          </span>
        </div>
      </div>

      {/* Classroom Tools Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { icon: BookOpen, label: "Video HD Berjenjang" },
          { icon: Layers, label: "Wiki & SOP Agensi" },
          { icon: Sparkles, label: "Kuis & Tugas Praktik" },
          { icon: Star, label: "Catatan Pribadi per Bab" },
          { icon: MessageSquare, label: "Diskusi Q&A Mentor" },
          { icon: FolderOpen, label: "Unduh Template & Aset" },
        ].map((pill) => {
          const Icon = pill.icon;
          return (
            <div
              key={pill.label}
              className="rounded-xl bg-white border border-[#EAECEF] px-3 py-2.5 flex items-center gap-2 text-[11px] font-semibold text-[#121215]"
            >
              <Icon size={14} style={{ color: accentColor }} className="shrink-0" />
              <span className="truncate">{pill.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SystemShowcaseBlockRenderer({
  block,
  accentColor = "#4F39F6",
  onActionClick,
}: SystemShowcaseBlockRendererProps) {
  const data = block.data || {};
  const eyebrow =
    block.eyebrow || data.eyebrow || "EKSPLORASI EKOSISTEM 2.0";
  const heading =
    block.heading ||
    data.heading ||
    "Lihat Cara Kerja Setiap Fitur di Dalam Ruang Sosmed 2.0";
  const subtitle =
    block.subtitle ||
    data.subtitle ||
    "Klik tiap tab untuk melihat bagaimana Ruang Kelas, Evolusi Rumi, hingga sistem Paket, Poin & Sertifikat membantu proses belajarmu.";

  const tabs: SystemShowcaseTabItem[] =
    Array.isArray(block.tabs) && block.tabs.length > 0
      ? block.tabs
      : Array.isArray(data.tabs) && data.tabs.length > 0
      ? data.tabs
      : DEFAULT_SYSTEM_SHOWCASE_TABS;

  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = activeIndex < tabs.length ? activeIndex : 0;
  const instanceId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sync tab selection if browser Find-in-page matches hidden="until-found" panel content
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    panelRefs.current.forEach((panelEl, idx) => {
      if (!panelEl) return;
      const handleBeforeMatch = () => {
        setActiveIndex(idx);
      };
      panelEl.addEventListener("beforematch", handleBeforeMatch);
      cleanups.push(() =>
        panelEl.removeEventListener("beforematch", handleBeforeMatch)
      );
    });
    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [tabs.length]);

  const selectTab = (index: number, shouldFocus = false) => {
    setActiveIndex(index);
    const btn = tabRefs.current[index];
    if (btn) {
      btn.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (shouldFocus) {
        btn.focus();
      }
    }
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    if (tabs.length <= 1) return;
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = tabs.length - 1;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      selectTab(nextIdx, true);
    }
  };

  const handlePanelCta = (action?: SystemShowcaseTabItem["ctaAction"]) => {
    if (action === "scroll_pricing") {
      const target = document.getElementById("pricing-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    if (action === "login") {
      onActionClick?.("login");
      return;
    }
    onActionClick?.("register");
  };

  return (
    <div style={{ ["--rs-tab-accent" as any]: accentColor }}>
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        {eyebrow && (
          <p
            style={{ color: accentColor }}
            className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
          >
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121215]">
          {heading}
        </h2>
        {subtitle && (
          <p className="mt-2 text-xs sm:text-sm text-[#5E5E5E] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Single-row Accessible Tablist (non-wrapping with scroll + bottom indicator) */}
      <div className="border-b border-[#EAECEF]">
        <div
          role="tablist"
          aria-label={heading}
          {...({ focusgroup: "tablist nomemory" } as any)}
          className="rs-system-tablist gap-1 sm:gap-2 justify-start md:justify-center"
        >
          {tabs.map((tab, idx) => {
            const isSelected = idx === safeIndex;
            const tabId = `${instanceId}-tab-${idx}`;
            return (
              <button
                key={tab.id || idx}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                {...(isSelected ? ({ focusgroupstart: "" } as any) : {})}
                onClick={() => selectTab(idx, false)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                style={isSelected ? { color: accentColor } : undefined}
                className="rs-system-tab px-4 py-3 text-xs sm:text-sm font-semibold text-[#5E5E5E] hover:text-[#121215] transition-colors cursor-pointer whitespace-nowrap"
              >
                {tab.tabLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels — no padding/border/background on the tabpanel container itself */}
      <div className="mt-6">
        {tabs.map((tab, idx) => {
          const isSelected = idx === safeIndex;
          const tabId = `${instanceId}-tab-${idx}`;

          return (
            <div
              key={tab.id || idx}
              ref={(el) => {
                panelRefs.current[idx] = el;
              }}
              role="tabpanel"
              aria-labelledby={tabId}
              tabIndex={isSelected ? 0 : undefined}
              {...(!isSelected ? ({ hidden: "until-found" } as any) : {})}
            >
              <div className="rounded-3xl bg-white border border-[#EAECEF] p-5 sm:p-8 shadow-xs">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                  {/* Left: Copy + Highlights */}
                  <div className="lg:col-span-6 space-y-4">
                    <span
                      style={{
                        backgroundColor: `${accentColor}14`,
                        color: accentColor,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                    >
                      {tab.badge}
                    </span>

                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-[#121215] leading-snug">
                        {tab.title}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-[#5E5E5E] leading-relaxed">
                        {tab.subtitle}
                      </p>
                    </div>

                    <ul className="space-y-3 pt-1">
                      {(tab.highlights || []).map((hl, hIdx) => (
                        <li
                          key={hIdx}
                          className="flex items-start gap-2.5 text-xs"
                        >
                          <CheckCircle2
                            size={16}
                            style={{ color: accentColor }}
                            className="shrink-0 mt-0.5"
                          />
                          <div>
                            <div className="font-bold text-[#121215]">
                              {hl.title}
                            </div>
                            <p className="text-[#5E5E5E] leading-relaxed mt-0.5">
                              {hl.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {tab.ctaLabel && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handlePanelCta(tab.ctaAction)}
                          style={{ backgroundColor: accentColor }}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                        >
                          <span>{tab.ctaLabel}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Live System Snapshot */}
                  <div className="lg:col-span-6">
                    <ShowcaseVisualPanel
                      visualType={tab.visualType}
                      accentColor={accentColor}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
