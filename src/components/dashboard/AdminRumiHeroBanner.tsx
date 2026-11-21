"use client";

import React, { useMemo, useState } from "react";
import {
  Crown,
  Inbox,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";
import { type AdminNavId } from "@/components/navigation/AdminLeftRail";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { RumiMascotIllustration } from "@/components/learner/RumiEvolutionMascot";
import { ModalDialog } from "@/components/ui/ModalDialog";

interface AdminRumiHeroBannerProps {
  currentUser?: AuthenticatedUser | null;
  quizzesCount: number;
  activeMaterialsCount?: number;
  totalMembersCount?: number;
  proMembersCount?: number;
  pendingPaymentsCount?: number;
  openIssuesCount?: number;
  onNavigateNav: (nav: AdminNavId) => void;
  onOpenGrading: () => void;
  onCreateCourse?: () => void;
  onRefreshLive?: () => void;
  isRefreshingLive?: boolean;
}

export function AdminRumiHeroBanner({
  currentUser,
  quizzesCount,
  activeMaterialsCount,
  totalMembersCount,
  proMembersCount,
  pendingPaymentsCount = 0,
  openIssuesCount: openIssuesProp,
  onNavigateNav,
  onOpenGrading,
  onCreateCourse,
  onRefreshLive,
  isRefreshingLive = false,
}: AdminRumiHeroBannerProps) {
  const { explorerItems, assignees, reportedIssues, learnerSubscriptions } =
    useRuangSosmedStore();

  const [mascotPaused, setMascotPaused] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const firstName = currentUser?.name
    ? currentUser.name.split(" ")[0]
    : currentUser?.username || "Admin";

  const timeGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const storeOpenIssuesCount = useMemo(
    () =>
      (reportedIssues || []).filter(
        (iss) => String(iss.status || "").toLowerCase() !== "resolved"
      ).length,
    [reportedIssues]
  );

  const storeActiveMaterialsCount = useMemo(
    () =>
      (explorerItems || []).filter(
        (item) => !item.isArchived && item.type !== "Folder"
      ).length,
    [explorerItems]
  );

  const storeProLearnersCount = useMemo(() => {
    return (assignees || []).filter((a) => {
      const nameKey = (a.name || "").trim().toLowerCase();
      return (
        learnerSubscriptions?.[a.name] === "PRO" ||
        (nameKey && learnerSubscriptions?.[nameKey] === "PRO")
      );
    }).length;
  }, [assignees, learnerSubscriptions]);

  const openIssuesCount = openIssuesProp ?? storeOpenIssuesCount;
  const resolvedMaterialsCount =
    activeMaterialsCount ?? storeActiveMaterialsCount;
  const resolvedTotalMembers = totalMembersCount ?? assignees.length;
  const resolvedProMembers = proMembersCount ?? storeProLearnersCount;
  const reviewCount = quizzesCount + openIssuesCount;

  const adminQuote = useMemo(() => {
    if (pendingPaymentsCount > 0) {
      return `Superior Admin Rumi siap mengawal! Ada ${pendingPaymentsCount} konfirmasi pembayaran PRO menunggu persetujuan.`;
    }
    if (quizzesCount > 0 && openIssuesCount > 0) {
      return `Superior Admin Rumi siap mengawal! Ada ${quizzesCount} kuis menunggu penilaian & ${openIssuesCount} kendala materi perlu ditinjau.`;
    }
    if (quizzesCount > 0) {
      return `Superior Admin Rumi aktif! Ada ${quizzesCount} submission kuis/tugas yang siap Anda nilai hari ini.`;
    }
    if (openIssuesCount > 0) {
      return `Superior Admin Rumi memantau: ada ${openIssuesCount} laporan kendala dari learner yang menunggu respons mentor.`;
    }
    return `Superior Admin Rumi aktif pada level maksimal! ${resolvedMaterialsCount} materi aktif & ${resolvedTotalMembers} member (${resolvedProMembers} PRO) berjalan mulus.`;
  }, [
    pendingPaymentsCount,
    quizzesCount,
    openIssuesCount,
    resolvedMaterialsCount,
    resolvedTotalMembers,
    resolvedProMembers,
  ]);

  return (
    <>
      <header aria-label="Admin Studio Dashboard" className="mb-1">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Frameless Superior Admin Rumi Mascot + Executive Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
            <div className="flex items-center gap-3 sm:block shrink-0">
              <button
                type="button"
                onClick={() => setMascotPaused((p) => !p)}
                aria-label={
                  mascotPaused
                    ? "Putar animasi Superior Admin Rumi"
                    : "Jeda animasi Superior Admin Rumi"
                }
                title={
                  mascotPaused
                    ? "Klik Superior Admin Rumi untuk memutar animasi"
                    : "Klik Superior Admin Rumi untuk menjeda animasi"
                }
                className="rs-rumi-trigger inline-flex items-center justify-center bg-transparent border-0 p-0 rounded-full hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8] cursor-pointer"
              >
                <RumiMascotIllustration
                  variant="admin-superior"
                  paused={mascotPaused}
                  sizeClass="w-28 h-28 sm:w-32 sm:h-32"
                />
              </button>

              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowcaseOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1E3A8A] shadow-2xs cursor-pointer"
                >
                  <Crown size={11} className="text-[#D97706]" />
                  <span>MAX • Superior Admin Rumi</span>
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowcaseOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] px-3 py-0.5 text-[11px] font-extrabold text-[#1E3A8A] shadow-2xs transition-all cursor-pointer"
                >
                  <Crown size={11} className="text-[#D97706]" />
                  <span>MAX • Superior Admin Rumi</span>
                </button>

                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#10B981]/35 px-2.5 py-0.5 text-[11px] font-bold text-[#047857]">
                  <ShieldCheck size={11} className="text-[#10B981]" />
                  <span>Studio Sovereign • Eksklusif Admin</span>
                </span>
              </div>

              <div>
                <h1 className="text-[22px] sm:text-[24px] leading-tight font-bold tracking-tight text-[#121215]">
                  {timeGreeting}, {firstName} 👋
                </h1>
                <p className="text-xs sm:text-sm text-[#5E5E5E] mt-0.5">
                  Welcome back to Ruang Sosmed 2.0 Studio •{" "}
                  <span className="font-semibold text-[#4F39F6]">
                    {currentUser?.name || "Admin"} Workspace
                  </span>
                </p>
              </div>

              <p className="flex items-start gap-1.5 text-xs font-medium text-[#475569] leading-relaxed">
                <Sparkles
                  size={13}
                  className="text-[#0284C7] shrink-0 mt-0.5"
                />
                <span>{adminQuote}</span>
              </p>
            </div>
          </div>

          {/* Right: Crisp Quick Action Cluster */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onCreateCourse ? onCreateCourse() : onNavigateNav("content")
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_12px_rgba(79,57,246,0.28)] transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Buat Materi</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateNav("learners")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#EAECEF] hover:border-[#4F39F6]/40 px-3 py-2 text-xs font-bold text-[#121215] shadow-2xs transition-colors cursor-pointer"
            >
              <Users size={13} className="text-[#4F39F6]" />
              <span>Kelola Member</span>
              {pendingPaymentsCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-[#FEF3C7] border border-[#F59E0B]/40 px-1.5 py-0.5 text-[10px] font-extrabold text-[#B45309] tabular-nums leading-none">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (quizzesCount > 0) {
                  onOpenGrading();
                } else {
                  onNavigateNav("inbox");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#EAECEF] hover:border-[#4F39F6]/40 px-3 py-2 text-xs font-bold text-[#121215] shadow-2xs transition-colors cursor-pointer"
            >
              <Inbox size={13} className="text-[#0284C7]" />
              <span>Inbox</span>
              {reviewCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-[#FEF3C7] border border-[#F59E0B]/40 px-1.5 py-0.5 text-[10px] font-extrabold text-[#B45309] tabular-nums leading-none">
                  {reviewCount}
                </span>
              )}
            </button>

            {onRefreshLive && (
              <button
                type="button"
                onClick={onRefreshLive}
                disabled={isRefreshingLive}
                aria-label="Muat ulang data live dashboard"
                title="Muat ulang data live dari database"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#EAECEF] hover:border-[#4F39F6]/40 text-[#475569] hover:text-[#4F39F6] shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  size={13}
                  className={isRefreshingLive ? "animate-spin" : ""}
                />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Showcase Comparison Modal: Superior Admin Rumi vs Superior Learner Rumi */}
      <ModalDialog
        open={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
        titleId="admin-rumi-showcase-title"
        title="👑 Superior Admin Rumi — Eksklusif Studio"
        subtitle="Wujud spesial level MAX untuk Admin Studio (berbeda dari Superior Learner)"
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Superior Admin Card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#F8FAFC] via-[#EFF6FF] to-[#EEF2FF] border border-[#CBD5E1] p-4 text-center text-[#121215] space-y-2.5 shadow-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0369A1]">
                <Crown size={10} className="text-[#D97706]" /> KHUSUS ADMIN • MAX
              </span>
              <div className="flex justify-center">
                <RumiMascotIllustration
                  variant="admin-superior"
                  paused={!showcaseOpen}
                  sizeClass="w-28 h-28"
                />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#121215]">
                  Superior Admin Rumi
                </h3>
                <p className="text-[11px] text-[#0284C7] font-semibold">
                  Ceramic Pearl &amp; Glacial Sapphire
                </p>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                Bodi keramik pearl-putih glossy 3D, visor kaca sapphire dengan mata ice-cyan bercahaya, headphone titanium-champagne, sayap kristal mini, &amp; mahkota emas elegan.
              </p>
            </div>

            {/* Superior Learner Card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FFFBEB] border border-indigo-200/80 p-4 text-center text-[#121215] space-y-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-extrabold text-[#4F39F6]">
                🎓 KHUSUS LEARNER • LV.5
              </span>
              <div className="flex justify-center">
                <RumiMascotIllustration
                  stage={5}
                  paused={!showcaseOpen}
                  sizeClass="w-28 h-28"
                />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#121215]">
                  Superior Learner Rumi
                </h3>
                <p className="text-[11px] text-[#4F39F6] font-semibold">
                  Lv.5 Ascended Angelic (1000+ XP)
                </p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Dicapai siswa setelah mengumpulkan 1000+ XP dengan armor Indigo-Emas, sayap emas klasik, dan halo suci 3-puncak.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowcaseOpen(false)}
              className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </ModalDialog>
    </>
  );
}
