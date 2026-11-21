"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Crown,
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
  onNavigateNav: (nav: AdminNavId) => void;
  onOpenGrading: () => void;
}

export function AdminRumiHeroBanner({
  currentUser,
  quizzesCount,
  onNavigateNav,
  onOpenGrading,
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

  const openIssuesCount = useMemo(
    () =>
      (reportedIssues || []).filter(
        (iss) => String(iss.status || "").toLowerCase() !== "resolved"
      ).length,
    [reportedIssues]
  );

  const proLearnersCount = useMemo(() => {
    return (assignees || []).filter((a) => {
      const nameKey = (a.name || "").trim().toLowerCase();
      return (
        learnerSubscriptions?.[a.name] === "PRO" ||
        (nameKey && learnerSubscriptions?.[nameKey] === "PRO")
      );
    }).length;
  }, [assignees, learnerSubscriptions]);

  const reviewCount = quizzesCount + openIssuesCount;

  const adminQuote = useMemo(() => {
    if (quizzesCount > 0 && openIssuesCount > 0) {
      return `Superior Admin Rumi siap mengawal! Ada ${quizzesCount} kuis menunggu penilaian & ${openIssuesCount} kendala materi perlu ditinjau.`;
    }
    if (quizzesCount > 0) {
      return `Superior Admin Rumi aktif! Ada ${quizzesCount} submission kuis/tugas yang siap Anda nilai hari ini.`;
    }
    if (openIssuesCount > 0) {
      return `Superior Admin Rumi memantau: ada ${openIssuesCount} laporan kendala dari learner yang menunggu respons mentor.`;
    }
    return `Superior Admin Rumi aktif pada level maksimal! ${explorerItems.length} materi & ${assignees.length} member (${proLearnersCount} PRO) berjalan mulus.`;
  }, [
    quizzesCount,
    openIssuesCount,
    explorerItems.length,
    assignees.length,
    proLearnersCount,
  ]);

  return (
    <>
      <header
        aria-label="Admin Studio Dashboard"
        className="mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
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
                className="rs-rumi-trigger inline-flex items-center justify-center bg-transparent border-0 p-0 rounded-full hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7] cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0284C7] to-[#4F39F6] border border-sky-300/60 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-2xs cursor-pointer"
                >
                  <Crown size={11} className="text-[#FDE047]" />
                  <span>MAX • Superior Admin Rumi</span>
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowcaseOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0284C7] to-[#4F39F6] hover:from-[#0369A1] hover:to-[#3B28CC] border border-sky-300/60 px-3 py-0.5 text-[11px] font-extrabold text-white shadow-xs transition-all cursor-pointer"
                >
                  <Crown size={11} className="text-[#FDE047]" />
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

          {/* Right: 3 Compact Studio Metric Quick Tiles */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0 lg:w-[340px]">
            <button
              type="button"
              onClick={() => onNavigateNav("content")}
              className="group rounded-2xl bg-white hover:bg-white border border-slate-200/85 hover:border-[#4F39F6]/40 p-3 text-left shadow-2xs transition-all cursor-pointer"
            >
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-[#4F39F6] mb-1.5">
                <BookOpen size={14} />
              </div>
              <p className="text-lg font-extrabold text-[#121215] leading-none">
                {explorerItems.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">
                Materi Aktif
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigateNav("learners")}
              className="group rounded-2xl bg-white hover:bg-white border border-slate-200/85 hover:border-emerald-400/50 p-3 text-left shadow-2xs transition-all cursor-pointer"
            >
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-1.5">
                <Users size={14} />
              </div>
              <p className="text-lg font-extrabold text-[#121215] leading-none">
                {assignees.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">
                Total Member
              </p>
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
              className="group rounded-2xl bg-white hover:bg-white border border-slate-200/85 hover:border-amber-400/60 p-3 text-left shadow-2xs transition-all cursor-pointer"
            >
              <div
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg mb-1.5 ${
                  reviewCount > 0
                    ? "bg-amber-50 text-amber-600"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <AlertCircle size={14} />
              </div>
              <p className="text-lg font-extrabold text-[#121215] leading-none">
                {reviewCount}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">
                Perlu Review
              </p>
            </button>
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
            <div className="rounded-2xl bg-gradient-to-br from-[#0284C7] via-[#0EA5E9] to-[#10B981] border border-sky-300/70 p-4 text-center text-white space-y-2.5 shadow-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/35 px-2.5 py-0.5 text-[10px] font-extrabold text-[#FEF08A]">
                <Crown size={10} /> KHUSUS ADMIN • MAX
              </span>
              <div className="flex justify-center">
                <RumiMascotIllustration
                  variant="admin-superior"
                  paused={!showcaseOpen}
                  sizeClass="w-28 h-28"
                />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Superior Admin Rumi
                </h3>
                <p className="text-[11px] text-emerald-100 font-semibold">
                  Royal Sapphire &amp; Emerald Sovereign
                </p>
              </div>
              <p className="text-[11px] text-sky-50 leading-relaxed">
                Armor Sapphire-Emas cerah, mahkota 5-puncak berpermata Emerald, sayap prisma kristal, jubah Royal Violet-Magenta, HUD biru kristal, &amp; tongkat komando.
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
