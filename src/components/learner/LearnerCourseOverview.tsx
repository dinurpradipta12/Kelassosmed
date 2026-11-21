"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Play,
  Star,
  Clock,
  Globe,
  Award,
  Mail,
  Check,
  Lock,
  BookOpen,
  HelpCircle,
  ClipboardCheck,
  Download,
  CheckCircle2,
  ArrowRight,
  Layers,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  type CourseSectionAccordion,
  type CourseChapterItem,
} from "@/lib/phase5-data";
import { ContentBadge } from "@/components/ui/ContentBadge";
import {
  useRuangSosmedStore,
  evaluateChapterAccess,
  formatIdr,
} from "@/context/RuangSosmedStore";
import { OfficialCertificateModal } from "@/components/certificate/OfficialCertificateModal";
import { ModalDialog } from "@/components/ui/ModalDialog";
import {
  UnlockModuleModal,
  type UnlockModuleTarget,
} from "@/components/learner/UnlockModuleModal";

interface LearnerCourseOverviewProps {
  courseTitle?: string;
  learnerName?: string;
  sections: CourseSectionAccordion[];
  isFavorite: boolean;
  showFavoriteButton?: boolean;
  onToggleFavorite: () => void;
  onBackToDashboard: () => void;
  onStartClassroom: (chapterId?: string) => void;
  onStartQuizRunner: () => void;
  onOpenUpgradeModal?: () => void;
  onShowToast: (msg: string) => void;
}

export function LearnerCourseOverview({
  courseTitle = "Social Media Strategy: 10 Principles To Boost Brand Engagement",
  learnerName = "Learner",
  sections,
  isFavorite,
  showFavoriteButton = true,
  onToggleFavorite,
  onBackToDashboard,
  onStartClassroom,
  onStartQuizRunner,
  onOpenUpgradeModal,
  onShowToast,
}: LearnerCourseOverviewProps) {
  const {
    certificateUnlocked,
    learnerIsPro,
    learnerAccess,
    learnerAssignedItems,
    explorerItems,
    rsLessonReviews,
    discussionThreads,
    postDiscussionMessage,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const [unlockModalTarget, setUnlockModalTarget] =
    useState<UnlockModuleTarget | null>(null);

  const leadMentorAvatar = resolveUserAvatar(
    "Dinur M. Pradipta",
    "Dinur Pradipta",
    "dinurm.pradipta@gmail.com",
    "admin@ruangsosmed.id",
    "@dinur"
  );

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [contactMentorOpen, setContactMentorOpen] = useState(false);
  const [mentorTopic, setMentorTopic] = useState("Tanya Materi");
  const [mentorMessage, setMentorMessage] = useState("");

  const courseThreads = React.useMemo(
    () =>
      (discussionThreads || []).filter(
        (t) =>
          t.chapterBadge.trim().toLowerCase() === courseTitle.trim().toLowerCase()
      ),
    [discussionThreads, courseTitle]
  );

  const courseMessages = React.useMemo(
    () => courseThreads.flatMap((t) => t.replies),
    [courseThreads]
  );

  const handleSendMentorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = mentorMessage.trim();
    if (!trimmed) return;
    const initials =
      learnerName
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "S";

    postDiscussionMessage({
      threadId: courseThreads[0]?.id,
      threadTitle: `[${mentorTopic}] ${courseTitle}`,
      chapterTitle: courseTitle,
      authorName: learnerName,
      authorRole: "Learner",
      authorInitials: initials,
      avatarBg: "#EEF2FF",
      avatarText: "#4F39F6",
      message: trimmed,
    });

    setMentorMessage("");
    onShowToast("Pesan berhasil dikirim ke Inbox Mentor.");
  };

  const matchedAssignedCourse = learnerAssignedItems.find(
    (i) => i.title.trim().toLowerCase() === courseTitle.trim().toLowerCase()
  );
  const matchedExplorerCourse = explorerItems.find(
    (i) => i.title.trim().toLowerCase() === courseTitle.trim().toLowerCase()
  );
  const liveDescription =
    matchedAssignedCourse?.description ||
    matchedExplorerCourse?.description ||
    `Materi pembelajaran ${courseTitle} yang disusun langkah demi langkah di Ruang Sosmed 2.0.`;
  const liveSkillTags =
    matchedAssignedCourse?.skillTags &&
    matchedAssignedCourse.skillTags.length > 0
      ? matchedAssignedCourse.skillTags
      : [matchedExplorerCourse?.category || "Social Media Strategy", "Course"];
  const livePointsReward = matchedAssignedCourse?.pointsReward ?? 100;
  const liveThumbnailUrl =
    matchedExplorerCourse?.thumbnailUrl ||
    matchedAssignedCourse?.thumbnailUrl ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem(
          `ruang_sosmed_thumb_${matchedExplorerCourse?.id}`
        ) ||
        window.localStorage.getItem(
          `ruang_sosmed_thumb_${courseTitle.trim().toLowerCase()}`
        )
      : null);

  // Filter sections & chapters visible to learners
  const visibleSections = React.useMemo(
    () =>
      sections
        .filter((s) => !s.hidden)
        .map((s) => ({
          ...s,
          chapters: s.chapters.filter((c) => !c.hidden),
        }))
        .filter((s) => s.chapters.length > 0),
    [sections]
  );

  const totalChapters = visibleSections.reduce(
    (sum, s) => sum + s.chapters.length,
    0
  );
  const completedChapters = visibleSections.reduce(
    (sum, s) => sum + s.chapters.filter((c) => c.completed).length,
    0
  );
  const progressPct =
    totalChapters > 0
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0;

  const liveDurationLabel =
    matchedAssignedCourse?.duration ||
    `${Math.max(15, totalChapters * 15)} Menit`;

  const reviewCount = rsLessonReviews?.length ?? 0;
  const avgRating =
    reviewCount > 0
      ? (
          rsLessonReviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
        ).toFixed(1)
      : null;

  const isFullyUnlocked =
    certificateUnlocked ||
    (totalChapters > 0 && completedChapters >= totalChapters);

  const flatVisibleChapters = React.useMemo(
    () => visibleSections.flatMap((s) => s.chapters),
    [visibleSections]
  );

  const courseIsPro = React.useMemo(() => {
    if (typeof matchedExplorerCourse?.isPro === "boolean") {
      return matchedExplorerCourse.isPro;
    }
    if (typeof matchedAssignedCourse?.isPro === "boolean") {
      return matchedAssignedCourse.isPro;
    }
    if (typeof window !== "undefined") {
      try {
        const key = courseTitle.toLowerCase().trim();
        const saved = window.localStorage.getItem(
          `ruang_sosmed_course_tier_${key}`
        );
        if (saved) return saved === "pro";
      } catch {}
    }
    return false;
  }, [courseTitle, matchedExplorerCourse?.isPro, matchedAssignedCourse?.isPro]);

  const getChapterAccess = (ch: CourseChapterItem) =>
    evaluateChapterAccess({
      courseTitle,
      courseIsPro,
      courseUnlockPointsCost:
        matchedExplorerCourse?.unlockPointsCost ??
        matchedAssignedCourse?.unlockPointsCost,
      courseUnlockPriceIdr:
        matchedExplorerCourse?.unlockPriceIdr ??
        matchedAssignedCourse?.unlockPriceIdr,
      flatVisibleChapters,
      chapter: ch,
      access: learnerAccess,
    });

  const handleChapterClick = (ch: CourseChapterItem) => {
    const chAccess = getChapterAccess(ch);
    if (!chAccess.unlocked) {
      if (
        chAccess.reason === "basic_limit_reached" ||
        chAccess.canUnlockWithPoints ||
        chAccess.canBuyPerMaterial
      ) {
        setUnlockModalTarget({
          courseTitle,
          chapterId: ch.id,
          chapterTitle: ch.title,
          reason: chAccess.reason,
          maxModules: chAccess.maxModules,
          canUnlockWithPoints: chAccess.canUnlockWithPoints,
          pointsCost: chAccess.pointsCost,
          canBuyPerMaterial: chAccess.canBuyPerMaterial,
          priceIdr: chAccess.priceIdr,
        });
        return;
      }
      onShowToast(
        ch.type === "Assignment"
          ? "🔒 Review Tugas Praktik 1-on-1 bersama Mentor tersedia di paket Pro."
          : "🔒 Bab Lanjutan ini terkunci. Pilih paket Basic atau Pro untuk membuka."
      );
      onOpenUpgradeModal?.();
      return;
    }
    if (ch.locked) {
      onShowToast("Selesaikan bab sebelumnya untuk membuka materi ini.");
      return;
    }
    if (ch.type === "Quiz") {
      onStartQuizRunner();
      return;
    }
    onStartClassroom(ch.id);
  };

  const handleOpenCertModal = () => {
    setCertModalOpen(true);
  };

  const primaryCtaLabel =
    totalChapters > 0 && completedChapters >= totalChapters
      ? "Ulangi Materi"
      : completedChapters > 0
      ? "Lanjutkan Belajar"
      : "Mulai Belajar";

  let runningChapterNumber = 0;

  return (
    <div className="w-full px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Compact & Clean Course Header */}
      <section
        aria-label="Course Header"
        className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-7 space-y-5"
      >
        {/* Top Navigation Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} />
            <span>Kembali ke My Learning</span>
          </button>

          {showFavoriteButton && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                isFavorite
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Star
                size={13}
                className={isFavorite ? "text-amber-500" : "text-slate-400"}
                fill={isFavorite ? "currentColor" : "none"}
              />
              <span>{isFavorite ? "Disimpan di Favorit" : "Simpan Favorit"}</span>
            </button>
          )}
        </div>

        {/* Main Header Body */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ContentBadge type="Course" size="md" />
              {liveSkillTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
              {courseTitle}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {liveDescription}
            </p>

            {/* Primary CTA + Compact Progress */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const firstOpen =
                    flatVisibleChapters.find(
                      (c) => !c.completed && !c.locked && getChapterAccess(c).unlocked
                    ) ||
                    flatVisibleChapters.find(
                      (c) => !c.locked && getChapterAccess(c).unlocked
                    );
                  if (firstOpen) {
                    onStartClassroom(firstOpen.id);
                  } else if (flatVisibleChapters[0]) {
                    handleChapterClick(flatVisibleChapters[0]);
                  } else {
                    onStartClassroom();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                <Play size={15} fill="currentColor" />
                <span>{primaryCtaLabel}</span>
              </button>

              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-32 sm:w-44 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  {completedChapters}/{totalChapters} bab ({progressPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Optional Clean Course Cover Thumbnail (Only if set) */}
          {liveThumbnailUrl && (
            <div className="lg:w-64 w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={liveThumbnailUrl}
                alt={courseTitle}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* 2. Main 2-Column Workspace: Curriculum First (Left 8) + Info & Certificate (Right 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 Cols): Daftar Materi & Kurikulum */}
        <section
          aria-label="Daftar Materi"
          className="lg:col-span-8 rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daftar Materi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {visibleSections.length} bagian • {totalChapters} bab • Estimasi{" "}
                {liveDurationLabel}
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums">
              {completedChapters}/{totalChapters} Selesai
            </span>
          </div>

          {visibleSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Belum ada modul atau bab yang tersedia saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSections.map((section) => {
                const sectionDoneCount = section.chapters.filter(
                  (c) => c.completed
                ).length;

                return (
                  <details
                    key={section.id}
                    open
                    className="group rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 cursor-pointer list-none select-none hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ChevronDown
                          size={15}
                          className="text-slate-500 shrink-0 transition-transform group-open:rotate-0 -rotate-90"
                        />
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {section.sectionTitle}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-500 shrink-0 tabular-nums">
                        {sectionDoneCount}/{section.chapters.length} bab
                      </span>
                    </summary>

                    <div className="divide-y divide-slate-100 bg-white">
                      {section.chapters.map((ch) => {
                        runningChapterNumber += 1;
                        const displayIndex = runningChapterNumber;
                        const TypeIcon =
                          ch.type === "Quiz"
                            ? HelpCircle
                            : ch.type === "Assignment"
                            ? ClipboardCheck
                            : BookOpen;
                        const chAccess = getChapterAccess(ch);
                        const chapterIsProFlag =
                          typeof ch.isPro === "boolean"
                            ? ch.isPro
                            : Boolean(courseIsPro) || ch.type === "Assignment";
                        const proLocked = !chAccess.unlocked;
                        const isLocked = ch.locked || proLocked;

                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => handleChapterClick(ch)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                              isLocked
                                ? "opacity-75 hover:bg-slate-50"
                                : "hover:bg-indigo-50/40"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {proLocked ? (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                  <Lock size={13} />
                                </span>
                              ) : ch.completed ? (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                  <Check size={14} strokeWidth={2.5} />
                                </span>
                              ) : ch.locked ? (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                  <Lock size={13} />
                                </span>
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[#4F39F6] text-xs font-bold">
                                  {displayIndex}
                                </span>
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {ch.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <TypeIcon size={11} />
                                    {ch.type}
                                  </span>
                                  <span>•</span>
                                  <span>{ch.duration}</span>
                                  <span>•</span>
                                  <span>+{ch.points} pts</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {chapterIsProFlag ? (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    chAccess.unlocked
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {chAccess.reason === "basic_included"
                                    ? "Basic"
                                    : chAccess.reason === "unlocked_individually"
                                    ? "Terbuka"
                                    : ch.type === "Assignment"
                                    ? "PRO 1-on-1"
                                    : "PRO"}
                                </span>
                              ) : (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Gratis
                                </span>
                              )}

                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                  proLocked
                                    ? "text-amber-700 bg-amber-50"
                                    : ch.locked
                                    ? "text-slate-400 bg-slate-100"
                                    : ch.completed
                                    ? "text-emerald-700 bg-emerald-50"
                                    : "text-[#4F39F6] bg-indigo-50"
                                }`}
                              >
                                <span>
                                  {proLocked
                                    ? chAccess.canUnlockWithPoints
                                      ? `Buka (${chAccess.pointsCost} pts)`
                                      : chAccess.canBuyPerMaterial
                                      ? formatIdr(chAccess.priceIdr)
                                      : "Upgrade"
                                    : ch.locked
                                    ? "Terkunci"
                                    : ch.type === "Quiz"
                                    ? "Mulai Quiz"
                                    : ch.completed
                                    ? "Ulangi"
                                    : "Buka"}
                                </span>
                                {!isLocked && <ArrowRight size={12} />}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (4 Cols): Ringkasan Kelas, Mentor & Sertifikat */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          {/* Card 1: Informasi Kelas & Mentor */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">
                Informasi Kelas
              </h2>
              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-3">
                  <Clock size={15} className="text-slate-400 shrink-0" />
                  <span>Estimasi belajar {liveDurationLabel}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Layers size={15} className="text-slate-400 shrink-0" />
                  <span>{totalChapters} Bab Materi</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star size={15} className="text-amber-500 shrink-0" />
                  <span>+{livePointsReward} Poin Penyelesaian</span>
                </li>
                <li className="flex items-center gap-3">
                  <Globe size={15} className="text-slate-400 shrink-0" />
                  <span>Bahasa Indonesia</span>
                </li>
                {avgRating && (
                  <li className="flex items-center gap-3">
                    <Award size={15} className="text-slate-400 shrink-0" />
                    <span>
                      Rating {avgRating}/5.0 ({reviewCount} ulasan)
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* Mentor */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Mentor Kelas
              </p>
              <div className="flex items-center gap-3">
                {leadMentorAvatar ? (
                  <img
                    src={leadMentorAvatar}
                    alt="Dinur M. Pradipta"
                    className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    DP
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    Dinur M. Pradipta
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Lead Mentor • Ruang Sosmed 2.0
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!learnerAccess.canDiscussion) {
                    onShowToast(
                      "🔒 Tanya Jawab & Diskusi dengan Mentor tidak aktif pada paket Anda. Upgrade ke Basic atau Pro untuk menggunakannya."
                    );
                    onOpenUpgradeModal?.();
                    return;
                  }
                  setContactMentorOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-[#4F39F6] hover:border-indigo-200 px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                {learnerAccess.canDiscussion ? <Mail size={13} /> : <Lock size={13} className="text-amber-600" />}
                <span>
                  {learnerAccess.canDiscussion ? "Hubungi Mentor" : "Hubungi Mentor (Upgrade)"}
                </span>
                {learnerAccess.canDiscussion && courseMessages.length > 0 && (
                  <span className="rounded-full bg-[#4F39F6] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {courseMessages.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Compact Certificate Card */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              isFullyUnlocked
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-white border-slate-200/90"
            }`}
          >
            <div className="flex items-center gap-2">
              {isFullyUnlocked ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <Award size={16} className="text-slate-500 shrink-0" />
              )}
              <h2 className="text-sm font-bold text-slate-900">
                Sertifikat Kelulusan
              </h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isFullyUnlocked
                ? "Selamat! Anda telah memenuhi syarat dan sertifikat resmi siap diunduh."
                : `Selesaikan seluruh ${totalChapters} bab materi (atau lulus penilaian mentor) untuk membuka sertifikat.`}
            </p>

            <button
              type="button"
              onClick={handleOpenCertModal}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                isFullyUnlocked && learnerAccess.canCertificate
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F39F6] border border-[#4F39F6]/25"
              }`}
            >
              {learnerAccess.canCertificate ? <Award size={13} /> : <Lock size={12} />}
              <span>
                {learnerAccess.canCertificate
                  ? "Lihat & Unduh Sertifikat"
                  : "Klaim Sertifikat (Pro)"}
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* Hubungi Mentor Direct Message Modal */}
      <ModalDialog
        open={contactMentorOpen}
        onClose={() => setContactMentorOpen(false)}
        titleId="contact-mentor-modal-title"
        title="Hubungi Mentor Kelas"
        subtitle={`Kelas: ${courseTitle}`}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          {/* Mentor Identity Strip */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="flex items-center gap-3 min-w-0">
              {leadMentorAvatar ? (
                <img
                  src={leadMentorAvatar}
                  alt="Dinur M. Pradipta"
                  className="h-9 w-9 shrink-0 rounded-full object-cover border border-indigo-200"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[#4F39F6] text-xs font-bold">
                  DP
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Dinur M. Pradipta
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Lead Mentor • Ruang Sosmed 2.0
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Masuk ke Inbox Mentor
            </span>
          </div>

          {/* Chat Conversation History */}
          <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-4 max-h-64 overflow-y-auto space-y-3">
            {courseMessages.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <MessageSquare
                  size={22}
                  className="mx-auto text-slate-300"
                />
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Belum ada percakapan. Silakan tulis pertanyaan atau konsultasi
                  Anda kepada Mentor di bawah ini.
                </p>
              </div>
            ) : (
              courseMessages.map((msg) => {
                const roleLower = (msg.authorRole || "").toLowerCase();
                const isMentorMsg =
                  roleLower.includes("mentor") || roleLower.includes("admin");
                const msgAvatar =
                  resolveUserAvatar(msg.authorName) ||
                  (isMentorMsg ? leadMentorAvatar : "");

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMentorMsg ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs space-y-1 ${
                        isMentorMsg
                          ? "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                          : "bg-[#4F39F6] text-white rounded-tr-xs"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 text-[10px] font-semibold ${
                          isMentorMsg ? "text-[#4F39F6]" : "text-indigo-100"
                        }`}
                      >
                        {msgAvatar ? (
                          <img
                            src={msgAvatar}
                            alt={msg.authorName}
                            className="h-5 w-5 rounded-full object-cover border border-white/40 shrink-0"
                          />
                        ) : (
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                            style={{
                              backgroundColor: isMentorMsg
                                ? "#EEF2FF"
                                : "rgba(255,255,255,0.2)",
                              color: isMentorMsg ? "#4F39F6" : "#FFFFFF",
                            }}
                          >
                            {msg.authorInitials || "U"}
                          </span>
                        )}
                        <span>{msg.authorName}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Topic & Message Form */}
          <form onSubmit={handleSendMentorMessage} className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-600">
                Topik Pesan
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Tanya Materi",
                  "Konsultasi Tugas / Praktik",
                  "Kendala Kelas",
                  "Lainnya",
                ].map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setMentorTopic(topic)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer ${
                      mentorTopic === topic
                        ? "bg-indigo-50 border-[#4F39F6] text-[#4F39F6]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                rows={3}
                value={mentorMessage}
                onChange={(e) => setMentorMessage(e.target.value)}
                placeholder="Tulis pertanyaan, link portofolio, atau kendala belajar Anda..."
                className="w-full rounded-xl bg-white p-3 text-xs text-slate-900 border border-slate-200 focus:border-[#4F39F6] focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactMentorOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={!mentorMessage.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                <Send size={13} />
                <span>Kirim Pesan ke Mentor</span>
              </button>
            </div>
          </form>
        </div>
      </ModalDialog>

      {/* Official Ruang Sosmed 2.0 Certificate Modal */}
      <OfficialCertificateModal
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        learnerName={learnerName}
        learnerRole="Social Media Specialist"
        courseTitle={courseTitle}
        credentialId="RS2-2026-8492"
        isLockedPro={!learnerAccess.canCertificate}
        onRequestUpgrade={onOpenUpgradeModal}
        onShowToast={onShowToast}
      />

      <UnlockModuleModal
        target={unlockModalTarget}
        onClose={() => setUnlockModalTarget(null)}
        onUnlockedChapter={(chId) => {
          if (chId) onStartClassroom(chId);
        }}
        onOpenUpgradeToPro={() => onOpenUpgradeModal?.()}
        onShowToast={onShowToast}
      />
    </div>
  );
}
