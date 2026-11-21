"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Flame,
  FolderOpen,
  Gift,
  KeyRound,
  Layers,
  Lock,
  Play,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import type {
  CourseChapterItem,
  LearnerAssignedItem,
} from "@/lib/phase5-data";
import type { LeaderboardLearner } from "@/lib/design-tokens";
import type { RewardItem } from "@/lib/rewards-data";
import type {
  CourseCardAccessResult,
  PackageTierKind,
} from "@/lib/entitlements";
import { ContentBadge } from "@/components/ui/ContentBadge";
import {
  computeAwardedXp,
  resolveRumiLevelInfo,
  type RumiXpProfileState,
} from "@/lib/rumi-xp";
import {
  RumiEvolutionModal,
  RumiMascotIllustration,
} from "@/components/learner/RumiEvolutionMascot";

export interface LearnerHomeFolderItem {
  name: string;
  color: string;
  description: string;
  projectName: string;
  projectColor: string;
  courses: LearnerAssignedItem[];
  avgPct: number;
}

export interface LearnerHomeDashboardProps {
  learnerFirstName: string;
  learnerDisplayName: string;
  timeGreeting: string;
  activeTierLabel: string;
  activeTierKind: PackageTierKind;
  rumiXpState: RumiXpProfileState;
  learnerIsPro: boolean;
  isUnlimitedPro: boolean;
  canCertificate: boolean;
  certificateUnlocked: boolean;
  totalPoints: number;
  assignedItems: LearnerAssignedItem[];
  learnerFolders: LearnerHomeFolderItem[];
  publishedWikiCount: number;
  showWikiPage: boolean;
  leaderboard: LeaderboardLearner[];
  rewardsCatalog: RewardItem[];
  claimedRewardsCount: number;
  notesCount: number;
  reviewsCount: number;
  getCourseChapters: (courseTitle: string) => CourseChapterItem[];
  getCardAccessDecision: (item: LearnerAssignedItem) => CourseCardAccessResult;
  isProItem: (item: LearnerAssignedItem) => boolean;
  searchQuery: string;
  onClearSearch: () => void;
  folderCodeInput: string;
  onFolderCodeInputChange: (val: string) => void;
  onRedeemCodeSubmit: (e: React.FormEvent) => void;
  onOpenRedeemModal: () => void;
  onOpenCourse: (item: LearnerAssignedItem) => void;
  onContinueCourseDirectly: (item: LearnerAssignedItem) => void;
  onOpenFolderInCatalog: (folderName: string) => void;
  onNavigateTab: (tab: "my-learning" | "catalog" | "wiki") => void;
  onOpenCertificateModal: () => void;
  onOpenRewardsModal: () => void;
  onOpenUpgradeModal?: () => void;
}

const CHART_BAR_COLORS = [
  "#4F39F6",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
];

export function LearnerHomeDashboard({
  learnerFirstName,
  learnerDisplayName,
  timeGreeting,
  activeTierLabel,
  activeTierKind,
  rumiXpState,
  learnerIsPro,
  isUnlimitedPro,
  canCertificate,
  certificateUnlocked,
  totalPoints,
  assignedItems,
  learnerFolders,
  publishedWikiCount,
  showWikiPage,
  leaderboard,
  rewardsCatalog,
  claimedRewardsCount,
  notesCount,
  reviewsCount,
  getCourseChapters,
  getCardAccessDecision,
  isProItem,
  searchQuery,
  onClearSearch,
  folderCodeInput,
  onFolderCodeInputChange,
  onRedeemCodeSubmit,
  onOpenRedeemModal,
  onOpenCourse,
  onContinueCourseDirectly,
  onOpenFolderInCatalog,
  onNavigateTab,
  onOpenCertificateModal,
  onOpenRewardsModal,
  onOpenUpgradeModal,
}: LearnerHomeDashboardProps) {
  const [ringMode, setRingMode] = useState<"status" | "folder">("status");
  const [chartMode, setChartMode] = useState<"courses" | "skills">("courses");
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [mascotPaused, setMascotPaused] = useState(false);
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);

  // Exclude unfoldered zero-progress spam items from Home KPIs & charts whenever real folders exist
  const dashboardCourses = useMemo(() => {
    const folderedOrStarted = assignedItems.filter(
      (i) => Boolean(i.folderName?.trim()) || (i.progressPercent || 0) > 0
    );
    if (learnerFolders.length > 0 && folderedOrStarted.length > 0) {
      return folderedOrStarted;
    }
    return assignedItems;
  }, [assignedItems, learnerFolders.length]);

  const enrichedCourses = useMemo(() => {
    return dashboardCourses.map((course, idx) => {
      const chapters = getCourseChapters(course.title);
      const totalChapters = chapters.length;
      const completedChapters = chapters.filter((c) => c.completed).length;
      const progressPct =
        totalChapters > 0
          ? Math.round((completedChapters / totalChapters) * 100)
          : Math.min(100, Math.max(0, course.progressPercent || 0));
      const decision = getCardAccessDecision(course);
      const lockedByPro = !decision.unlocked;
      return {
        course,
        totalChapters,
        completedChapters,
        progressPct,
        lockedByPro,
        color: CHART_BAR_COLORS[idx % CHART_BAR_COLORS.length],
      };
    });
  }, [dashboardCourses, getCourseChapters, getCardAccessDecision]);

  const stats = useMemo(() => {
    const totalCourses = enrichedCourses.length;
    const totalChaptersAll = enrichedCourses.reduce(
      (sum, c) => sum + c.totalChapters,
      0
    );
    const completedChaptersAll = enrichedCourses.reduce(
      (sum, c) => sum + c.completedChapters,
      0
    );
    const completedCoursesCount = enrichedCourses.filter(
      (c) => c.progressPct >= 100
    ).length;
    const inProgressCoursesCount = enrichedCourses.filter(
      (c) => c.progressPct > 0 && c.progressPct < 100
    ).length;
    const notStartedCoursesCount = enrichedCourses.filter(
      (c) => c.progressPct === 0
    ).length;
    const lockedProCoursesCount = enrichedCourses.filter(
      (c) => c.lockedByPro
    ).length;

    const overallPct =
      totalChaptersAll > 0
        ? Math.round((completedChaptersAll / totalChaptersAll) * 100)
        : totalCourses > 0
        ? Math.round(
            enrichedCourses.reduce((sum, c) => sum + c.progressPct, 0) /
              totalCourses
          )
        : 0;

    return {
      totalCourses,
      totalChaptersAll,
      completedChaptersAll,
      completedCoursesCount,
      inProgressCoursesCount,
      notStartedCoursesCount,
      lockedProCoursesCount,
      overallPct,
    };
  }, [enrichedCourses]);

  // Primary "Lanjutkan Belajar" target: unlocked in-progress first, then unlocked not-started
  const primaryCourseEntry = useMemo(() => {
    return (
      enrichedCourses.find(
        (e) => !e.lockedByPro && e.progressPct > 0 && e.progressPct < 100
      ) ||
      enrichedCourses.find((e) => !e.lockedByPro && e.progressPct === 0) ||
      enrichedCourses[0] ||
      null
    );
  }, [enrichedCourses]);

  // Priority course list (max 3) for quick jump
  const priorityCourses = useMemo(() => {
    return [...enrichedCourses]
      .sort((a, b) => {
        const score = (e: typeof a) => {
          if (!e.lockedByPro && e.progressPct > 0 && e.progressPct < 100) return 0;
          if (!e.lockedByPro && e.progressPct === 0) return 1;
          if (!e.lockedByPro && e.progressPct >= 100) return 2;
          return 3;
        };
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return b.progressPct - a.progressPct;
      })
      .slice(0, 3);
  }, [enrichedCourses]);

  // Skill mastery aggregation
  const skillProgressList = useMemo(() => {
    const map = new Map<
      string,
      { skill: string; totalPct: number; count: number; color: string }
    >();
    enrichedCourses.forEach(({ course, progressPct }) => {
      const tags =
        course.skillTags && course.skillTags.length > 0
          ? course.skillTags
          : ["Social Media Strategy"];
      tags.forEach((rawTag) => {
        const tag = rawTag?.trim();
        if (!tag || ["Course", "Assignment", "Quiz", "Wiki", "Page", "Path"].includes(tag)) {
          return;
        }
        const key = tag.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.totalPct += progressPct;
          existing.count += 1;
        } else {
          map.set(key, {
            skill: tag,
            totalPct: progressPct,
            count: 1,
            color: CHART_BAR_COLORS[map.size % CHART_BAR_COLORS.length],
          });
        }
      });
    });
    if (map.size === 0 && enrichedCourses.length > 0) {
      map.set("social media mastery", {
        skill: "Social Media Mastery",
        totalPct: stats.overallPct * enrichedCourses.length,
        count: enrichedCourses.length,
        color: "#4F39F6",
      });
    }
    return Array.from(map.values())
      .slice(0, 5)
      .map((entry, idx) => ({
        ...entry,
        avgPct: Math.round(entry.totalPct / Math.max(1, entry.count)),
        color: CHART_BAR_COLORS[idx % CHART_BAR_COLORS.length],
      }));
  }, [enrichedCourses, stats.overallPct]);

  // Real Gamified Level & XP calculation backed by Rumi XP ledger
  const levelInfo = useMemo(
    () => resolveRumiLevelInfo(rumiXpState.totalXp),
    [rumiXpState.totalXp]
  );

  const chapterXpReward = computeAwardedXp("chapter_complete", activeTierKind).xp;
  const noteXpReward = computeAwardedXp("lesson_note", activeTierKind).xp;
  const courseXpReward = computeAwardedXp("course_complete", activeTierKind).xp;

  // Next reward target
  const nextReward = useMemo(() => {
    const active = (rewardsCatalog || [])
      .filter((r) => r.active)
      .sort((a, b) => a.pointsCost - b.pointsCost);
    if (active.length === 0) return null;
    const nextLocked = active.find((r) => r.pointsCost > totalPoints);
    return nextLocked || active[0];
  }, [rewardsCatalog, totalPoints]);

  // Top 3 leaderboard & current learner rank
  const leaderboardInfo = useMemo(() => {
    const sorted = [...(leaderboard || [])].sort((a, b) => b.points - a.points);
    const needle = learnerDisplayName.trim().toLowerCase();
    const idx = sorted.findIndex(
      (entry) => entry.name.trim().toLowerCase() === needle
    );
    const rank =
      idx >= 0
        ? idx + 1
        : sorted.filter((entry) => entry.points > totalPoints).length + 1;
    return {
      topThree: sorted.slice(0, 3),
      rank,
    };
  }, [leaderboard, learnerDisplayName, totalPoints]);

  // Cute speech bubble line reflecting Rumi evolution & next milestone
  const mascotQuote = useMemo(() => {
    if (stats.totalCourses === 0) {
      return `Halo! Aku ${levelInfo.formName} ${levelInfo.emoji} Masukkan kode kelas dari mentor agar kita bisa mulai kumpulkan XP & berevolusi!`;
    }
    if (levelInfo.stage === 5) {
      return `Wujud Superior tercapai! 🏆 Aku kini Superior Rumi berbekal ${levelInfo.xp} XP. Pertahankan dominasimu sebagai Agency Legend!`;
    }
    if (stats.overallPct >= 100) {
      return `Keren banget! Semua kelas selesai. Kumpulkan ${levelInfo.xpToNext} XP lagi biar aku berevolusi jadi ${levelInfo.nextTier?.formName}! ✨`;
    }
    if (stats.completedChaptersAll > 0) {
      return `Sekarang aku ${levelInfo.formName} (${levelInfo.title}). Butuh ${levelInfo.xpToNext} XP lagi untuk berevolusi ke ${levelInfo.nextTier?.formName}! 🚀`;
    }
    return `Aku ${levelInfo.formName} ${levelInfo.emoji} Selesaikan 1 bab (+${chapterXpReward} XP) atau login tiap hari (+${
      computeAwardedXp("daily_login", activeTierKind).xp
    } XP) biar aku makin dewasa!`;
  }, [
    stats.totalCourses,
    stats.overallPct,
    stats.completedChaptersAll,
    levelInfo,
    chapterXpReward,
    activeTierKind,
  ]);

  // Search filter across all assignedItems & learnerFolders when top navbar search is typed
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const matchedFolders = learnerFolders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.projectName.toLowerCase().includes(q)
    );
    const matchedCourses = assignedItems.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        (c.folderName || "").toLowerCase().includes(q) ||
        (c.skillTags || []).some((t) => t.toLowerCase().includes(q))
    );
    return { matchedFolders, matchedCourses };
  }, [searchQuery, assignedItems, learnerFolders]);

  // Missions checklist with real tier-adjusted XP rewards
  const missions = [
    {
      id: "first-chapter",
      label: "Selesaikan 1 bab pelajaran pertamamu",
      done: stats.completedChaptersAll >= 1,
      rewardHint: `+${chapterXpReward} XP`,
    },
    {
      id: "first-note",
      label: "Tulis 1 catatan belajar pribadi di kelas",
      done: notesCount >= 1,
      rewardHint: `+${noteXpReward} XP`,
    },
    {
      id: "hundred-pts",
      label: "Kumpulkan minimal 100 ★ Poin Bintang",
      done: totalPoints >= 100,
      rewardHint: "Buka Hadiah",
    },
    {
      id: "finish-course",
      label: "Tuntaskan 1 kelas hingga progres 100%",
      done: stats.completedCoursesCount >= 1,
      rewardHint: `+${courseXpReward} XP`,
    },
  ];
  const doneMissionsCount = missions.filter((m) => m.done).length;

  // Cute badges
  const cuteBadges = [
    {
      id: "starter",
      title: "Langkah Pertama",
      desc: "Mulai 1 bab",
      unlocked: stats.completedChaptersAll > 0 || stats.inProgressCoursesCount > 0,
      icon: Flame,
      activeStyle: "bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]",
    },
    {
      id: "hunter",
      title: "Pemburu Poin",
      desc: "100+ ★ poin",
      unlocked: totalPoints >= 100,
      icon: Star,
      activeStyle: "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]",
    },
    {
      id: "finisher",
      title: "Penakluk Kelas",
      desc: "1 kelas 100%",
      unlocked: stats.completedCoursesCount > 0,
      icon: Trophy,
      activeStyle: "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]",
    },
    {
      id: "certified",
      title: "Siap Sertifikat",
      desc: "Akses Sertifikat",
      unlocked: certificateUnlocked || (canCertificate && stats.completedCoursesCount > 0),
      icon: Award,
      activeStyle: "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F39F6]",
    },
  ];

  // Chart courses (max 6)
  const chartCourses = enrichedCourses.slice(0, 6);
  const activeHoveredCourse =
    chartCourses.find((c) => c.course.id === hoveredCourseId) ||
    chartCourses[0] ||
    null;

  return (
    <div className="rs-dashboard-container space-y-5">
      {/* Live Search Preview when searching from Top Navbar on Home */}
      {searchResults && (
        <section
          aria-label="Hasil Pencarian Cepat"
          className="rounded-2xl bg-[#FFFFFF] border border-[#4F39F6]/30 p-4 sm:p-5 shadow-[0_4px_16px_rgba(79,57,246,0.08)] space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F39F6]">
                <Search size={14} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  Hasil Pencarian &ldquo;{searchQuery.trim()}&rdquo;
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Ditemukan {searchResults.matchedFolders.length} folder &amp;{" "}
                  {searchResults.matchedCourses.length} materi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearSearch}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF] border border-[#EAECEF] px-2.5 py-1.5 text-xs font-semibold text-[#475569] cursor-pointer"
            >
              <X size={13} />
              <span>Reset Pencarian</span>
            </button>
          </div>

          {searchResults.matchedFolders.length === 0 &&
          searchResults.matchedCourses.length === 0 ? (
            <p className="text-xs text-[#5E5E5E] py-2">
              Belum ada folder atau kelas yang cocok. Coba kata kunci lain atau buka tab Katalog.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {searchResults.matchedFolders.slice(0, 3).map((folder) => (
                <button
                  key={`search-folder-${folder.name}`}
                  type="button"
                  onClick={() => onOpenFolderInCatalog(folder.name)}
                  className="flex items-center gap-2.5 rounded-xl bg-[#F8F9FB] hover:bg-[#EEF2FF]/60 border border-[#EAECEF] hover:border-[#4F39F6]/40 p-2.5 text-left cursor-pointer transition-colors"
                >
                  <FolderOpen size={16} className="text-[#4F39F6] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#121215] truncate">
                      {folder.name}
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      Folder • {folder.courses.length} materi ({folder.avgPct}%)
                    </p>
                  </div>
                  <ArrowRight size={13} className="text-[#94A3B8] shrink-0" />
                </button>
              ))}
              {searchResults.matchedCourses.slice(0, 6).map((course) => (
                <button
                  key={`search-course-${course.id}`}
                  type="button"
                  onClick={() => onOpenCourse(course)}
                  className="flex items-center gap-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EEF2FF]/50 border border-[#EAECEF] hover:border-[#4F39F6]/40 p-2.5 text-left cursor-pointer transition-colors"
                >
                  <BookOpen size={15} className="text-[#0EA5E9] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#121215] truncate">
                      {course.title}
                    </p>
                    <p className="text-[10px] text-[#64748B] truncate">
                      {course.folderName || course.type} • {course.progressPercent}%
                    </p>
                  </div>
                  <ArrowRight size={13} className="text-[#94A3B8] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 1. Playful Hero Welcome Card + Cute Mascot "Rumi" + XP Level Bar */}
      <section
        aria-label="Dashboard Belajar Ruang Sosmed"
        className="rs-hero-pastel relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(79,57,246,0.06)]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left Mascot + Greeting + Level Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
            <div className="flex items-center gap-3 sm:block shrink-0">
              <button
                type="button"
                onClick={() => setMascotPaused((p) => !p)}
                aria-label={
                  mascotPaused
                    ? `Putar animasi ${levelInfo.formName}`
                    : `Jeda animasi ${levelInfo.formName}`
                }
                title={
                  mascotPaused
                    ? `Klik ${levelInfo.formName} untuk memutar animasi`
                    : `Klik ${levelInfo.formName} untuk jeda animasi`
                }
                className="rs-rumi-trigger inline-flex items-center justify-center bg-transparent border-0 p-0 rounded-full hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F39F6] cursor-pointer"
              >
                <RumiMascotIllustration
                  stage={levelInfo.stage}
                  paused={mascotPaused}
                />
              </button>
              <div className="sm:hidden space-y-1">
                <button
                  type="button"
                  onClick={() => setEvolutionModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6] cursor-pointer"
                >
                  <span>{levelInfo.emoji}</span>
                  <span>
                    Lv.{levelInfo.level} • {levelInfo.formName}
                  </span>
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEvolutionModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/95 hover:bg-white border border-[#EAECEF] hover:border-[#4F39F6]/40 px-2.5 py-0.5 text-[11px] font-extrabold text-[#4F39F6] shadow-2xs transition-colors cursor-pointer"
                >
                  <span>{levelInfo.emoji}</span>
                  <span>
                    Lv.{levelInfo.level} • {levelInfo.formName}
                  </span>
                  <span className="text-[#64748B] font-semibold">
                    ({levelInfo.title})
                  </span>
                </button>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${
                    learnerIsPro
                      ? isUnlimitedPro
                        ? "bg-[#ECFDF5] border-[#10B981]/35 text-[#059669]"
                        : "bg-[#EEF2FF] border-[#4F39F6]/30 text-[#4F39F6]"
                      : "bg-white/95 border-[#EAECEF] text-[#475569]"
                  }`}
                >
                  <Zap
                    size={10}
                    fill="currentColor"
                    className={learnerIsPro ? "" : "text-[#F59E0B]"}
                  />
                  <span>Paket {activeTierLabel}</span>
                </span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#121215]">
                  {timeGreeting}, {learnerFirstName}! 👋
                </h1>
                <p className="mt-1 text-xs sm:text-[13px] font-medium text-[#475569] leading-relaxed max-w-2xl">
                  {mascotQuote}
                </p>
              </div>

              {/* XP Progress Bar + Evolution Modal Trigger */}
              <div className="max-w-lg space-y-1.5 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-[#4F39F6] tabular-nums">
                      {levelInfo.xp.toLocaleString()} XP Terkumpul
                    </span>
                    <button
                      type="button"
                      onClick={() => setEvolutionModalOpen(true)}
                      className="text-[10px] font-bold text-[#6D28D9] hover:text-[#4F39F6] underline cursor-pointer"
                    >
                      Lihat 5 Tahap Evolusi ✨
                    </button>
                  </div>
                  <span className="text-[#64748B] tabular-nums">
                    {levelInfo.nextXp === null
                      ? "Wujud Superior Tercapai! 🏆"
                      : `${levelInfo.xpToNext} XP lagi ke ${levelInfo.nextTier?.formName}`}
                  </span>
                </div>
                <progress
                  className="rs-progress-bar"
                  value={levelInfo.levelProgressPct}
                  max={100}
                  aria-label="Progress level XP belajar"
                  aria-valuetext={`${levelInfo.xp} XP, ${levelInfo.levelProgressPct}% menuju level berikutnya`}
                  style={
                    {
                      "--bar-height": "9px",
                      "--progress-bar-fill": "#4F39F6",
                      "--progress-bar-track": "rgba(255,255,255,0.85)",
                    } as React.CSSProperties
                  }
                />
              </div>

              {/* Action Buttons */}
              {stats.totalCourses > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {primaryCourseEntry && (
                    <button
                      type="button"
                      onClick={() =>
                        onContinueCourseDirectly(primaryCourseEntry.course)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_12px_rgba(79,57,246,0.28)] transition-all cursor-pointer"
                    >
                      <Play size={13} fill="currentColor" />
                      <span className="truncate max-w-[200px]">
                        {primaryCourseEntry.lockedByPro
                          ? `Buka ${primaryCourseEntry.course.title}`
                          : primaryCourseEntry.progressPct > 0
                          ? `Lanjut: ${primaryCourseEntry.course.title}`
                          : `Mulai: ${primaryCourseEntry.course.title}`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onOpenRedeemModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 hover:bg-white border border-[#EAECEF] px-3 py-2 text-xs font-bold text-[#121215] shadow-2xs transition-colors cursor-pointer"
                  >
                    <KeyRound size={13} className="text-[#4F39F6]" />
                    <span>Redeem Kode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateTab("catalog")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 hover:bg-white border border-[#EAECEF] px-3 py-2 text-xs font-semibold text-[#475569] hover:text-[#121215] transition-colors cursor-pointer"
                  >
                    <Compass size={13} className="text-[#0EA5E9]" />
                    <span>Buka Katalog</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={onRedeemCodeSubmit}
                  className="mt-2 max-w-md rounded-2xl bg-white/95 border border-[#EAECEF] p-3 space-y-2 shadow-xs"
                >
                  <label
                    htmlFor="home-redeem-code-input"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#121215]"
                  >
                    <KeyRound size={13} className="text-[#4F39F6]" />
                    <span>Masuk dengan Kode Materi / Folder</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="home-redeem-code-input"
                      type="text"
                      value={folderCodeInput}
                      onChange={(e) =>
                        onFolderCodeInputChange(e.target.value.toUpperCase())
                      }
                      placeholder="Mis. MBSM-B01 atau MBI-2026"
                      className="flex-1 min-w-0 rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#121215] placeholder:normal-case placeholder:font-normal placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-white focus:border-[#4F39F6] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!folderCodeInput.trim()}
                      className="shrink-0 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-white cursor-pointer transition-colors"
                    >
                      Masuk
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 Playful Learning KPI Indicator Cards */}
      <section aria-label="Indikator Belajar" className="rs-dash-kpi-grid">
        {/* KPI 1: Progres Belajar */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Progres Belajar
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#121215] tabular-nums">
              {stats.overallPct}%
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#4F39F6] tabular-nums">
              {stats.completedChaptersAll}/{Math.max(1, stats.totalChaptersAll)} bab tuntas
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F39F6]">
            <TrendingUp size={18} />
          </span>
        </div>

        {/* KPI 2: Kelas & Seri */}
        <button
          type="button"
          onClick={() => onNavigateTab("my-learning")}
          className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#0EA5E9]/45 p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Kelas &amp; Seri
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#121215] tabular-nums">
              {stats.totalCourses}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#0284C7] truncate">
              {learnerFolders.length} folder • {stats.completedCoursesCount} lulus
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
            <Layers size={18} />
          </span>
        </button>

        {/* KPI 3: Poin Bintang */}
        <button
          type="button"
          onClick={onOpenRewardsModal}
          className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#F59E0B]/50 p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Poin Bintang
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#B45309] tabular-nums">
              {totalPoints.toLocaleString()} ★
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#D97706] truncate">
              {nextReward
                ? totalPoints >= nextReward.pointsCost
                  ? "Siap tukar hadiah! 🎁"
                  : `Target ${nextReward.pointsCost} ★ hadiah`
                : `${claimedRewardsCount} hadiah ditukar`}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
            <Star size={18} fill="#F59E0B" />
          </span>
        </button>

        {/* KPI 4: Sertifikat & Rank */}
        <button
          type="button"
          onClick={onOpenCertificateModal}
          className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#10B981]/50 p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-semibold text-[#64748B]">
                Rank &amp; Sertifikat
              </p>
              {!canCertificate && (
                <span className="rounded bg-[#FEF3C7] px-1 py-0.2 text-[9px] font-bold text-[#92400E]">
                  PRO
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#059669] tabular-nums">
              #{leaderboardInfo.rank}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#10B981] truncate">
              {canCertificate
                ? certificateUnlocked
                  ? "Sertifikat aktif ✨"
                  : `${stats.completedCoursesCount} kelas siap klaim`
                : "Buka sertifikat resmi"}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
            {canCertificate ? <Award size={18} /> : <Lock size={17} />}
          </span>
        </button>
      </section>

      {/* 3. Visual Charts & Progress Ring Row */}
      <section aria-label="Grafik dan Indikator Progres" className="rs-dash-charts-grid">
        {/* Left Chart Card: Accessible Native Progress Ring + Status/Folder Breakdown */}
        <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                Ringkasan Progres Belajar 🎯
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Persentase ketuntasan bab dari seluruh kelasmu
              </p>
            </div>
            {learnerFolders.length > 0 && (
              <div
                role="group"
                aria-label="Mode rincian ringkasan progres"
                className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]"
              >
                <button
                  type="button"
                  onClick={() => setRingMode("status")}
                  aria-pressed={ringMode === "status"}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    ringMode === "status"
                      ? "bg-[#4F39F6] text-white"
                      : "text-[#64748B] hover:text-[#121215]"
                  }`}
                >
                  Status
                </button>
                <button
                  type="button"
                  onClick={() => setRingMode("folder")}
                  aria-pressed={ringMode === "folder"}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    ringMode === "folder"
                      ? "bg-[#4F39F6] text-white"
                      : "text-[#64748B] hover:text-[#121215]"
                  }`}
                >
                  Folder
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Native Accessible Progress Ring per modern-web-guidance (progress-ring) */}
            <div className="rs-progress-ring-wrapper shrink-0">
              <progress
                value={stats.overallPct}
                max={100}
                aria-label="Progres belajar keseluruhan"
                aria-valuetext={`${stats.overallPct}% selesai (${stats.completedChaptersAll} dari ${stats.totalChaptersAll} bab)`}
                className="rs-progress-ring"
                style={
                  {
                    "--value": stats.overallPct,
                    "--size": "148px",
                    "--thickness": "15px",
                  } as React.CSSProperties
                }
              />
              <div
                className="rs-progress-ring-content text-center"
                aria-hidden="true"
              >
                <p className="text-2xl font-black text-[#121215] tabular-nums leading-none">
                  {stats.overallPct}%
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  {stats.overallPct >= 100
                    ? "Tuntas! 🎉"
                    : stats.overallPct > 0
                    ? "Berjalan"
                    : "Siap Mulai"}
                </p>
              </div>
            </div>

            {/* Right Breakdown List */}
            <div className="w-full min-w-0 flex-1 space-y-2.5">
              {ringMode === "status" ? (
                <>
                  {[
                    {
                      label: "Kelas Tuntas",
                      count: stats.completedCoursesCount,
                      color: "#10B981",
                      bg: "bg-[#ECFDF5]",
                      text: "text-[#059669]",
                    },
                    {
                      label: "Sedang Dipelajari",
                      count: stats.inProgressCoursesCount,
                      color: "#4F39F6",
                      bg: "bg-[#EEF2FF]",
                      text: "text-[#4F39F6]",
                    },
                    {
                      label: "Belum Dimulai",
                      count: stats.notStartedCoursesCount,
                      color: "#94A3B8",
                      bg: "bg-[#F8FAFC]",
                      text: "text-[#475569]",
                    },
                  ].map((row) => {
                    const ratio =
                      stats.totalCourses > 0
                        ? Math.round((row.count / stats.totalCourses) * 100)
                        : 0;
                    return (
                      <div
                        key={row.label}
                        className={`rounded-xl ${row.bg} border border-[#EAECEF]/80 px-3 py-2 space-y-1`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[#121215]">{row.label}</span>
                          <span className={`${row.text} tabular-nums`}>
                            {row.count} kelas ({ratio}%)
                          </span>
                        </div>
                        <progress
                          value={ratio}
                          max={100}
                          aria-label={`${row.label}: ${row.count} kelas`}
                          className="rs-progress-bar"
                          style={
                            {
                              "--bar-height": "6px",
                              "--progress-bar-fill": row.color,
                              "--progress-bar-track": "#FFFFFF",
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    );
                  })}
                  {stats.lockedProCoursesCount > 0 && onOpenUpgradeModal && (
                    <button
                      type="button"
                      onClick={onOpenUpgradeModal}
                      className="w-full flex items-center justify-between rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] px-3 py-1.5 text-[11px] font-bold text-[#92400E] transition-colors cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Lock size={11} />
                        <span>
                          {stats.lockedProCoursesCount} materi PRO terkunci
                        </span>
                      </span>
                      <span className="underline">Buka Akses</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {learnerFolders.slice(0, 4).map((folder, idx) => (
                    <button
                      key={`ring-folder-${folder.name}`}
                      type="button"
                      onClick={() => onOpenFolderInCatalog(folder.name)}
                      className="w-full rounded-xl bg-[#F8F9FB] hover:bg-[#EEF2FF]/60 border border-[#EAECEF] px-3 py-2 text-left space-y-1 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 min-w-0 text-[#121215]">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                CHART_BAR_COLORS[idx % CHART_BAR_COLORS.length],
                            }}
                          />
                          <span className="truncate">{folder.name}</span>
                        </span>
                        <span className="text-[#4F39F6] tabular-nums shrink-0">
                          {folder.avgPct}%
                        </span>
                      </div>
                      <progress
                        value={folder.avgPct}
                        max={100}
                        aria-label={`Progres folder ${folder.name}`}
                        className="rs-progress-bar"
                        style={
                          {
                            "--bar-height": "6px",
                            "--progress-bar-fill":
                              CHART_BAR_COLORS[idx % CHART_BAR_COLORS.length],
                          } as React.CSSProperties
                        }
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Right Chart Card: Playful Interactive Bar Chart (Per Kelas / Topik Skill) */}
        <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                Grafik Aktivitas &amp; Penguasaan 📊
              </h2>
              <p className="text-[11px] text-[#64748B]">
                {chartMode === "courses"
                  ? "Klik atau arahkan ke batang kelas untuk melihat detail & masuk belajar"
                  : "Distribusi progres berdasarkan topik Social Media Specialist"}
              </p>
            </div>
            <div
              role="group"
              aria-label="Mode grafik belajar"
              className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]"
            >
              <button
                type="button"
                onClick={() => setChartMode("courses")}
                aria-pressed={chartMode === "courses"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  chartMode === "courses"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Per Kelas
              </button>
              <button
                type="button"
                onClick={() => setChartMode("skills")}
                aria-pressed={chartMode === "skills"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  chartMode === "skills"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Topik Skill
              </button>
            </div>
          </div>

          {chartMode === "courses" ? (
            chartCourses.length === 0 ? (
              <div className="rounded-2xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1] p-6 text-center space-y-1.5">
                <Sparkles size={20} className="mx-auto text-[#4F39F6]" />
                <p className="text-xs font-bold text-[#121215]">
                  Grafik menunggumu memulai kelas pertama!
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Begitu kode kelas dimasukkan, setiap kemajuan bab langsung muncul di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Interactive Inspector Pill */}
                {activeHoveredCourse && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: activeHoveredCourse.color }}
                      />
                      <span className="text-xs font-bold text-[#121215] truncate">
                        {activeHoveredCourse.course.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#4F39F6] tabular-nums shrink-0">
                      {activeHoveredCourse.completedChapters}/
                      {Math.max(1, activeHoveredCourse.totalChapters)} bab (
                      {activeHoveredCourse.progressPct}%)
                    </span>
                  </div>
                )}

                {/* Playful Vertical Capsule Bar Chart with SVG Dashed Guidelines */}
                <div className="relative pt-2">
                  <svg
                    viewBox="0 0 400 120"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-x-0 top-2 h-32 w-full"
                    aria-hidden="true"
                  >
                    {[12, 46, 80, 114].map((yPos) => (
                      <line
                        key={yPos}
                        x1="0"
                        y1={yPos}
                        x2="400"
                        y2={yPos}
                        stroke="#E2E8F0"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}
                  </svg>

                  <div
                    className="relative z-10 grid gap-2 sm:gap-3 items-end pt-2"
                    style={{
                      gridTemplateColumns: `repeat(${chartCourses.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {chartCourses.map((entry) => {
                      const barHeightPct =
                        entry.progressPct > 0
                          ? Math.max(18, entry.progressPct)
                          : 12;
                      const isEmpty = entry.progressPct === 0;
                      const isActive =
                        activeHoveredCourse?.course.id === entry.course.id;
                      return (
                        <button
                          key={`bar-${entry.course.id}`}
                          type="button"
                          onMouseEnter={() =>
                            setHoveredCourseId(entry.course.id)
                          }
                          onFocus={() => setHoveredCourseId(entry.course.id)}
                          onClick={() => onOpenCourse(entry.course)}
                          aria-label={`${entry.course.title}: ${entry.progressPct}% selesai`}
                          className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <div className="h-28 w-full flex flex-col items-center justify-end">
                            <span
                              className={`mb-1 text-[10px] font-extrabold tabular-nums transition-transform ${
                                isActive ? "scale-110" : ""
                              }`}
                              style={{
                                color: isEmpty ? "#94A3B8" : entry.color,
                              }}
                            >
                              {entry.progressPct}%
                            </span>
                            <div
                              className={`w-full max-w-[38px] rounded-xl transition-all duration-300 ${
                                isEmpty
                                  ? "border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] group-hover:border-[#4F39F6]/60"
                                  : "shadow-[0_4px_10px_rgba(16,15,17,0.08)] group-hover:brightness-105"
                              } ${isActive ? "ring-2 ring-offset-2 ring-[#4F39F6]/35" : ""}`}
                              style={{
                                height: `${barHeightPct}%`,
                                background: isEmpty
                                  ? undefined
                                  : `linear-gradient(180deg, ${entry.color} 0%, ${entry.color}CC 100%)`,
                              }}
                            />
                          </div>
                          <span className="w-full truncate text-center text-[10px] font-semibold text-[#475569] group-hover:text-[#4F39F6]">
                            {entry.course.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {stats.overallPct === 0 && (
                  <p className="rounded-xl bg-[#EEF2FF]/70 px-3 py-1.5 text-[11px] font-medium text-[#4F39F6] text-center">
                    Selesaikan bab pertamamu di salah satu kelas agar grafik batang mulai penuh! ✨
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="space-y-3 py-1">
              {skillProgressList.map((item) => (
                <div key={item.skill} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-[#121215] truncate">{item.skill}</span>
                    <span
                      className="tabular-nums shrink-0"
                      style={{ color: item.color }}
                    >
                      {item.avgPct}% • {item.count} kelas
                    </span>
                  </div>
                  <progress
                    value={item.avgPct}
                    max={100}
                    aria-label={`Penguasaan topik ${item.skill}: ${item.avgPct}%`}
                    className="rs-progress-bar"
                    style={
                      {
                        "--bar-height": "10px",
                        "--progress-bar-fill": item.color,
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* 4. Bottom Row: Folder Series & Priority Courses + Playful Missions, Badges & Reward Target */}
      <section aria-label="Seri Kelas dan Misi Belajar" className="rs-dash-bottom-grid">
        {/* Left: Folder Series + Priority Courses */}
        <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                Seri Folder &amp; Kelas Prioritas 📚
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Lompat langsung ke seri kelas favoritmu tanpa ribet
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showWikiPage && publishedWikiCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab("wiki")}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] px-2.5 py-1 text-[11px] font-bold text-[#6D28D9] cursor-pointer transition-colors"
                >
                  <BookOpen size={12} />
                  <span>Wiki ({publishedWikiCount})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateTab("my-learning")}
                className="text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Semua Kelas →
              </button>
            </div>
          </div>

          {/* Folder Quick-Jump Pills */}
          {learnerFolders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {learnerFolders.map((folder) => (
                <button
                  key={`dash-folder-${folder.name}`}
                  type="button"
                  onClick={() => onOpenFolderInCatalog(folder.name)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F8F9FB] hover:bg-[#EEF2FF]/80 border border-[#EAECEF] hover:border-[#4F39F6]/40 px-3 py-2 text-xs font-bold text-[#121215] transition-colors cursor-pointer"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white shrink-0"
                    style={{
                      backgroundColor: folder.projectColor || "#4F39F6",
                    }}
                  >
                    <FolderOpen size={13} />
                  </span>
                  <span className="truncate max-w-[160px]">{folder.name}</span>
                  <span className="rounded-full bg-white border border-[#EAECEF] px-2 py-0.5 text-[10px] font-extrabold text-[#4F39F6] tabular-nums">
                    {folder.courses.length} • {folder.avgPct}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Priority Course Cards */}
          {priorityCourses.length === 0 ? (
            <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-5 text-center space-y-2">
              <p className="text-xs font-semibold text-[#475569]">
                Belum ada kelas aktif di akunmu.
              </p>
              <button
                type="button"
                onClick={onOpenRedeemModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <KeyRound size={12} />
                <span>Masukkan Kode Akses</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {priorityCourses.map(
                ({
                  course,
                  totalChapters,
                  completedChapters,
                  progressPct,
                  lockedByPro,
                  color,
                }) => (
                  <div
                    key={`prio-${course.id}`}
                    onClick={() => onOpenCourse(course)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenCourse(course);
                      }
                    }}
                    className="group rounded-xl bg-[#F8F9FB]/80 hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6]/45 p-3.5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ContentBadge type={course.type} size="sm" />
                        {course.folderName && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                            <FolderOpen size={10} className="text-[#4F39F6]" />
                            <span className="truncate max-w-[140px]">
                              {course.folderName}
                            </span>
                          </span>
                        )}
                        {isProItem(course) && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              lockedByPro
                                ? "bg-[#FEF3C7] text-[#92400E]"
                                : "bg-[#ECFDF5] text-[#059669]"
                            }`}
                          >
                            {lockedByPro ? (
                              <Lock size={9} />
                            ) : (
                              <Zap size={9} fill="currentColor" />
                            )}
                            PRO
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#121215] group-hover:text-[#4F39F6] truncate">
                        {course.title}
                      </h3>

                      <div className="flex items-center gap-2.5">
                        <progress
                          value={lockedByPro ? 0 : progressPct}
                          max={100}
                          aria-label={`Progres ${course.title}`}
                          className="rs-progress-bar flex-1"
                          style={
                            {
                              "--bar-height": "6px",
                              "--progress-bar-fill":
                                progressPct >= 100 ? "#10B981" : color,
                            } as React.CSSProperties
                          }
                        />
                        <span className="text-[11px] font-bold text-[#475569] tabular-nums shrink-0">
                          {lockedByPro
                            ? "Terkunci"
                            : totalChapters > 0
                            ? `${completedChapters}/${totalChapters} bab (${progressPct}%)`
                            : `${progressPct}%`}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center justify-center gap-1 rounded-xl bg-[#4F39F6] group-hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-bold text-white transition-colors">
                      <span>
                        {lockedByPro
                          ? "Buka Akses"
                          : progressPct >= 100
                          ? "Ulas"
                          : progressPct > 0
                          ? "Lanjut"
                          : "Mulai"}
                      </span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </article>

        {/* Right: Playful Missions Checklist + Cute Badges + Reward & Mini Leaderboard */}
        <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
          {/* Missions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#121215]">
                Misi Belajar Seru ✨
              </h2>
              <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#4F39F6] tabular-nums">
                {doneMissionsCount}/{missions.length} Selesai
              </span>
            </div>

            <ul className="space-y-2">
              {missions.map((m) => (
                <li
                  key={m.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                    m.done
                      ? "bg-[#ECFDF5]/70 border-[#A7F3D0] text-[#065F46]"
                      : "bg-[#F8F9FB] border-[#EAECEF] text-[#1E293B]"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {m.done ? (
                      <CheckCircle2
                        size={15}
                        className="text-[#10B981] shrink-0"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full border-2 border-[#CBD5E1] bg-white shrink-0"
                      />
                    )}
                    <span
                      className={`truncate font-medium ${
                        m.done ? "line-through opacity-80" : ""
                      }`}
                    >
                      {m.label}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      m.done
                        ? "bg-[#10B981] text-white"
                        : "bg-white border border-[#EAECEF] text-[#64748B]"
                    }`}
                  >
                    {m.done ? "Tuntas" : m.rewardHint}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cute Badges 2x2 */}
          <div className="space-y-2 pt-2 border-t border-[#EAECEF]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Koleksi Lencana Lucu
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {cuteBadges.map((badge) => {
                const IconComp = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 transition-opacity ${
                      badge.unlocked
                        ? badge.activeStyle
                        : "bg-[#F8FAFC] border-[#EAECEF] text-[#94A3B8] opacity-75"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-2xs">
                      <IconComp size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold truncate">
                        {badge.title}
                      </p>
                      <p className="text-[10px] opacity-80 truncate">
                        {badge.unlocked ? "Terbuka ✓" : badge.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward Goal + Mini Top 3 Leaderboard */}
          {nextReward && (
            <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Gift size={15} className="text-[#D97706] shrink-0" />
                  <p className="text-xs font-bold text-[#92400E] truncate">
                    Target Hadiah: {nextReward.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenRewardsModal}
                  className="shrink-0 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] px-2.5 py-1 text-[10px] font-extrabold text-[#121215] cursor-pointer transition-colors"
                >
                  Tukar Hadiah
                </button>
              </div>
              <progress
                value={Math.min(nextReward.pointsCost, totalPoints)}
                max={Math.max(1, nextReward.pointsCost)}
                aria-label={`Progress poin menuju hadiah ${nextReward.title}`}
                className="rs-progress-bar"
                style={
                  {
                    "--bar-height": "7px",
                    "--progress-bar-fill": "#F59E0B",
                    "--progress-bar-track": "#FFFFFF",
                  } as React.CSSProperties
                }
              />
              <p className="text-[10px] font-semibold text-[#B45309] tabular-nums">
                {totalPoints >= nextReward.pointsCost
                  ? `Poinmu cukup (${totalPoints} / ${nextReward.pointsCost} ★)! Yuk klaim sekarang.`
                  : `${totalPoints} / ${nextReward.pointsCost} ★ • Kurang ${
                      nextReward.pointsCost - totalPoints
                    } poin lagi`}
              </p>
            </div>
          )}

          {leaderboardInfo.topThree.length > 0 && (
            <div className="pt-2 border-t border-[#EAECEF] space-y-1.5">
              <p className="text-[11px] font-bold text-[#64748B]">
                Papan Peringkat Teratas 🏅
              </p>
              <div className="flex flex-wrap gap-1.5">
                {leaderboardInfo.topThree.map((entry, idx) => {
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                  return (
                    <span
                      key={`lb-chip-${entry.rank}-${entry.name}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#121215]"
                    >
                      <span>{medal}</span>
                      <span className="truncate max-w-[105px]">
                        {entry.name}
                      </span>
                      <span className="font-bold text-[#B45309] tabular-nums">
                        {entry.points}★
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </section>

      {/* Interactive 5-Stage Evolution & XP Rules Modal */}
      <RumiEvolutionModal
        open={evolutionModalOpen}
        onClose={() => setEvolutionModalOpen(false)}
        xpState={rumiXpState}
        activeTierKind={activeTierKind}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />
    </div>
  );
}
