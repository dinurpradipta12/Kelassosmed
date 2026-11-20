"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
  Play,
  Download,
  FileText,
  Check,
  Lock,
  MessageSquare,
  BookOpen,
  Send,
  Flag,
  Star,
  StickyNote,
  Zap,
  X,
  Search,
  PanelRightClose,
  PanelRightOpen,
  Image as ImageIcon,
} from "lucide-react";
import {
  type CourseSectionAccordion,
  type CourseChapterItem,
} from "@/lib/phase5-data";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { getYouTubeEmbedUrl } from "@/components/authoring/CoursePageEditor";

interface ActiveLearningClassroomProps {
  courseTitle: string;
  learnerName?: string;
  sections: CourseSectionAccordion[];
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
  onMarkChapterComplete: (chapterId: string, points: number) => void;
  onStartQuizRunner: () => void;
  onBackToOverview: () => void;
  onOpenUpgradeModal?: () => void;
  onShowToast: (msg: string) => void;
}

export function ActiveLearningClassroom({
  courseTitle,
  learnerName = "Learner",
  sections,
  activeChapterId,
  onSelectChapter,
  onMarkChapterComplete,
  onStartQuizRunner,
  onBackToOverview,
  onOpenUpgradeModal,
  onShowToast,
}: ActiveLearningClassroomProps) {
  const {
    discussionThreads,
    postDiscussionMessage,
    reportContentIssueFromLearner,
    rsLessons,
    rsLessonNotes,
    rsLessonReviews,
    saveRsLessonNote,
    submitRsLessonReview,
    learnerIsPro,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const [rightDockTab, setRightDockTab] = useState<
    "curriculum" | "discussion" | "file"
  >("curriculum");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [curriculumSearch, setCurriculumSearch] = useState("");
  const [discussionSearch, setDiscussionSearch] = useState("");
  const [discussionTopicInput, setDiscussionTopicInput] = useState("");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Optional bottom helper panels (closed by default so reading remains uncluttered)
  const [activeUtilityTab, setActiveUtilityTab] = useState<
    "notes" | "reviews" | null
  >(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueCategory, setIssueCategory] = useState("Content Clarity Issues");
  const [issueFollowUpConsent, setIssueFollowUpConsent] = useState(true);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewRecapModalOpen, setReviewRecapModalOpen] = useState(false);
  const [reviewFilterTab, setReviewFilterTab] = useState<
    "all" | "5" | "4" | "chapter"
  >("all");
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");

  // Course completion screen
  const [courseCompleteScreenOpen, setCourseCompleteScreenOpen] =
    useState(false);

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

  const flatChapters: CourseChapterItem[] = visibleSections.flatMap(
    (s) => s.chapters
  );
  const currentIndex = Math.max(
    0,
    flatChapters.findIndex((c) => c.id === activeChapterId)
  );
  const currentChapter: CourseChapterItem = flatChapters[currentIndex] ??
    flatChapters[0] ?? {
      id: "empty-ch",
      title: "Belum Ada Materi Aktif",
      duration: "0 menit",
      type: "Lesson",
      completed: false,
      locked: false,
      points: 0,
      videoTitle: "",
      videoDuration: "0 menit",
      contentParagraphs: [],
      calloutTip: "",
      attachments: [],
      hideVideoBlock: true,
      hideTextBlock: true,
      hideCallout: true,
      hideImageBlock: true,
      hideAttachmentBlock: true,
      hideEmbeddedBlock: true,
      hideDatabaseBlock: true,
    };

  const prevChapter = currentIndex > 0 ? flatChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < flatChapters.length - 1
      ? flatChapters[currentIndex + 1]
      : null;

  const totalCompleted = flatChapters.filter((c) => c.completed).length;
  const progressPct =
    flatChapters.length > 0
      ? Math.round((totalCompleted / flatChapters.length) * 100)
      : 0;

  const syncedComments = discussionThreads.flatMap((thread) =>
    thread.replies.map((rep) => ({
      id: rep.id,
      author: rep.authorName,
      role: rep.authorRole,
      initials: rep.authorInitials,
      bg: rep.avatarBg,
      text: rep.avatarText,
      time: rep.timestamp,
      body: rep.message,
      chapterTitle: thread.chapterBadge,
    }))
  );

  const courseIsPro = React.useMemo(() => {
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
  }, [courseTitle]);

  const allSanitizedReviews = React.useMemo(() => {
    const list = rsLessonReviews ?? [];
    const courseKeys = new Set<string>();
    if (courseTitle?.trim()) {
      courseKeys.add(courseTitle.trim().toLowerCase());
    }
    sections.forEach((sec) => {
      if (sec.sectionTitle?.trim()) {
        courseKeys.add(sec.sectionTitle.trim().toLowerCase());
      }
      (sec.chapters || []).forEach((ch) => {
        if (ch.id?.trim()) courseKeys.add(ch.id.trim().toLowerCase());
        if (ch.title?.trim()) courseKeys.add(ch.title.trim().toLowerCase());
      });
    });

    return list
      .filter((rev) => {
        if (!rev) return false;
        if (String(rev.id || "").startsWith("rev-seed-")) return false;
        if (
          ["Nisa Amelia", "Dimas Prakoso", "Siti Sarah"].includes(
            rev.reviewerName
          )
        ) {
          return false;
        }
        const lk = (rev.lessonKey || "").trim().toLowerCase();
        return Boolean(lk && courseKeys.has(lk));
      })
      .map((rev) => {
        const resolvedReviewer =
          rev.reviewerName === "Raka Pratama" ||
          rev.reviewerUsername === "raka.pratama" ||
          rev.feedback === "tes feedback"
            ? learnerName || "Learner"
            : rev.reviewerName;

        return {
          ...rev,
          reviewerName: resolvedReviewer,
        };
      });
  }, [rsLessonReviews, learnerName, courseTitle, sections]);

  const reviewStats = React.useMemo(() => {
    const total = allSanitizedReviews.length;
    if (total === 0) {
      return {
        average: "0.0",
        total: 0,
        counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
        pcts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      };
    }
    const sum = allSanitizedReviews.reduce(
      (acc, r) => acc + (r.rating || 5),
      0
    );
    const avg = (sum / total).toFixed(1);
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allSanitizedReviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    const pcts: Record<number, number> = {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };
    return { average: avg, total, counts, pcts };
  }, [allSanitizedReviews]);

  const filteredRecapReviews = React.useMemo(() => {
    return allSanitizedReviews.filter((rev) => {
      if (reviewFilterTab === "5" && rev.rating !== 5) return false;
      if (reviewFilterTab === "4" && rev.rating !== 4) return false;
      if (
        reviewFilterTab === "chapter" &&
        rev.lessonKey !== currentChapter.id &&
        rev.lessonKey !== currentChapter.title
      ) {
        return false;
      }
      if (reviewSearchQuery.trim()) {
        const q = reviewSearchQuery.toLowerCase();
        const matchesName = rev.reviewerName.toLowerCase().includes(q);
        const matchesFeedback = rev.feedback.toLowerCase().includes(q);
        return matchesName || matchesFeedback;
      }
      return true;
    });
  }, [allSanitizedReviews, reviewFilterTab, reviewSearchQuery, currentChapter]);

  const isChapterProOnly = (
    chapterIdOrItem: string | CourseChapterItem,
    type?: string
  ) => {
    const ch =
      typeof chapterIdOrItem === "string"
        ? flatChapters.find((c) => c.id === chapterIdOrItem)
        : chapterIdOrItem;
    if (ch && typeof ch.isPro === "boolean") return ch.isPro;
    if (courseIsPro) return true;
    return (ch?.type || type) === "Assignment";
  };

  const isChLocked = React.useCallback(
    (ch: CourseChapterItem | null) => {
      if (!ch) return false;
      const proOnly = isChapterProOnly(ch);
      const proLocked = proOnly && !learnerIsPro;
      return ch.locked || proLocked;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [learnerIsPro, flatChapters, courseIsPro]
  );

  // Automatically jump to first unlocked chapter if target is locked
  React.useEffect(() => {
    if (currentChapter && isChLocked(currentChapter)) {
      const firstUnlocked = flatChapters.find((c) => !isChLocked(c));
      if (firstUnlocked && firstUnlocked.id !== currentChapter.id) {
        onSelectChapter(firstUnlocked.id);
      }
    }
  }, [currentChapter, flatChapters, isChLocked, onSelectChapter]);

  // Resolve video URL from currentChapter or saved curriculum storage
  const resolvedVideoUrl = React.useMemo(() => {
    if (currentChapter.videoUrl && currentChapter.videoUrl.trim()) {
      return currentChapter.videoUrl.trim();
    }
    if (typeof window !== "undefined") {
      try {
        const key = courseTitle.toLowerCase().trim();
        if (currentChapter.id) {
          const scopedUrl = window.localStorage.getItem(
            `ruang_sosmed_video_url_${key}_${currentChapter.id}`
          );
          if (scopedUrl && scopedUrl.trim()) return scopedUrl.trim();

          const LEGACY_SHARED_CHAPTER_IDS = new Set([
            "ch-101",
            "ch-102",
            "ch-201",
            "ch-301",
          ]);
          if (!LEGACY_SHARED_CHAPTER_IDS.has(currentChapter.id)) {
            const chUrl = window.localStorage.getItem(
              `ruang_sosmed_video_url_${currentChapter.id}`
            );
            if (chUrl && chUrl.trim()) return chUrl.trim();
          }
        }
        const courseUrl = window.localStorage.getItem(
          `ruang_sosmed_video_url_${key}`
        );
        if (courseUrl && courseUrl.trim()) return courseUrl.trim();

        for (const storageKey of [
          `ruang_sosmed_editor_sections_${key}`,
          `ruang_sosmed_curriculum_${key}`,
        ]) {
          const raw = window.localStorage.getItem(storageKey);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const sec of parsed) {
              const found = (sec.chapters || []).find(
                (c: any) =>
                  c.id === currentChapter.id ||
                  c.title?.trim().toLowerCase() ===
                    currentChapter.title?.trim().toLowerCase()
              );
              if (
                found?.videoUrl &&
                typeof found.videoUrl === "string" &&
                found.videoUrl.trim()
              ) {
                return found.videoUrl.trim();
              }
            }
          }
        }
      } catch {}
    }
    return "";
  }, [currentChapter, courseTitle]);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(resolvedVideoUrl);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    const topicTrimmed = discussionTopicInput.trim();
    if (!trimmed && !topicTrimmed) return;
    const initials =
      learnerName
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "L";

    const finalMessage =
      topicTrimmed && trimmed
        ? `[${topicTrimmed}] ${trimmed}`
        : topicTrimmed || trimmed;

    postDiscussionMessage({
      chapterTitle: currentChapter.title,
      authorName: learnerName,
      authorRole: "Social Media Specialist",
      authorInitials: initials,
      avatarBg: "#EEF2FF",
      avatarText: "#4F39F6",
      message: finalMessage,
    });
    setDiscussionTopicInput("");
    setNewComment("");
    onShowToast("Pertanyaan terkirim ke diskusi bab.");
  };

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = issueDescription.trim();
    if (!trimmed) return;
    reportContentIssueFromLearner(currentChapter.title, trimmed, learnerName);
    setIssueDescription("");
    setReportModalOpen(false);
    onShowToast(
      "Kendala berhasil dilaporkan. Tim mentor akan segera menindaklanjuti."
    );
  };

  const certFileName = `E-Certificate_${learnerName.replace(/\s+/g, "_")}.pdf`;

  const matchedLinkedLesson = React.useMemo(() => {
    if (!rsLessons || rsLessons.length === 0) return null;
    return (
      rsLessons.find((l) => l.linkedChapterId === currentChapter.id) ?? null
    );
  }, [rsLessons, currentChapter.id]);

  const hasTextSection =
    !currentChapter.hideTextBlock &&
    (currentChapter.contentParagraphs?.length ?? 0) > 0;
  const hasCallout =
    !currentChapter.hideCallout && Boolean(currentChapter.calloutTip);
  const hasImageCaption =
    !currentChapter.hideImageBlock && Boolean(currentChapter.imageCaption);
  const hasAttachments =
    !currentChapter.hideAttachmentBlock &&
    ((currentChapter.attachments?.length ?? 0) > 0 ||
      Boolean(matchedLinkedLesson && matchedLinkedLesson.assets.length > 0));
  const hasEmbedded =
    !currentChapter.hideEmbeddedBlock &&
    Boolean(currentChapter.embeddedBlocks?.length);
  const hasDatabase =
    !currentChapter.hideDatabaseBlock &&
    Boolean(currentChapter.databaseRows?.length);

  // Clean Course Complete Screen
  if (courseCompleteScreenOpen) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-7 sm:p-8 text-center space-y-5 shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Check size={30} strokeWidth={2.5} />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Selamat, Semua Materi Selesai
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Anda telah menyelesaikan seluruh bab di{" "}
              <strong className="text-slate-900">{courseTitle}</strong>. Progres
              dan poin Anda telah tersimpan.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white font-bold text-[11px]">
                PDF
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {certFileName}
                </p>
                <p className="text-[11px] text-slate-500">Sertifikat Resmi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onShowToast(`Mengunduh "${certFileName}"...`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 border border-slate-200 cursor-pointer shrink-0"
            >
              <Download size={13} />
              <span>Unduh</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToOverview}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            <span>Kembali ke Daftar Materi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* LEFT / MAIN LEARNING AREA */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5">
        <div className="w-full max-w-[1440px] mx-auto space-y-4">
          {/* 1. Compact & Friendly Header Bar */}
          <header className="space-y-2 pb-3 border-b border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={onBackToOverview}
                  className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200/80 px-2.5 py-1 font-semibold text-slate-700 hover:text-[#4F39F6] transition-colors cursor-pointer"
                >
                  <ChevronLeft size={13} />
                  <span>Daftar Materi</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="font-medium text-slate-600 truncate max-w-[180px] sm:max-w-xs">
                  {courseTitle}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#4F39F6]/10 px-2 py-0.5 text-[11px] font-bold text-[#4F39F6]">
                  Bab {currentIndex + 1} / {flatChapters.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentChapter.completed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <Check size={12} strokeWidth={2.5} />
                    Selesai
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="hidden lg:inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  {sidebarCollapsed ? (
                    <>
                      <PanelRightOpen size={14} />
                      <span>Tampilkan Daftar Bab</span>
                    </>
                  ) : (
                    <>
                      <PanelRightClose size={14} />
                      <span>Sembunyikan Daftar Bab</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-0.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {currentChapter.title}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 shrink-0">
                <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-semibold text-slate-700">
                  {currentChapter.type}
                </span>
                <span>•</span>
                <span>{currentChapter.duration}</span>
                <span>•</span>
                <span className="font-semibold text-amber-600">
                  +{currentChapter.points} poin
                </span>
              </span>
            </div>
          </header>

          {/* 2. Unified Video Player & Immediate Action Card */}
          <div className="overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            {!currentChapter.hideVideoBlock && (
              <div className="bg-slate-950 w-full">
                {youtubeEmbedUrl ? (
                  <div className="w-full aspect-video">
                    <iframe
                      src={youtubeEmbedUrl}
                      title={currentChapter.videoTitle || currentChapter.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="h-56 sm:h-68 w-full flex flex-col items-center justify-center p-6 text-center text-white">
                      <button
                        type="button"
                        onClick={() => setVideoPlaying((p) => !p)}
                        aria-label={videoPlaying ? "Pause video" : "Play video"}
                        className="flex h-13 w-13 items-center justify-center rounded-full bg-[#4F39F6] hover:bg-[#3B28CC] text-white transition-transform hover:scale-105 cursor-pointer mb-3 shadow-lg"
                      >
                        <Play size={20} fill="currentColor" />
                      </button>
                      <p className="text-sm font-semibold max-w-md">
                        {currentChapter.videoTitle || currentChapter.title}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {videoPlaying
                          ? "Memutar video materi..."
                          : "Klik untuk memutar video materi"}{" "}
                        •{" "}
                        {currentChapter.videoDuration || currentChapter.duration}
                      </p>
                    </div>
                    <div className="bg-slate-900/95 px-4 py-2 flex items-center justify-between gap-3 text-[11px] text-slate-300">
                      <span className="tabular-nums">
                        {videoPlaying ? "03:18" : "00:00"}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#4F39F6] transition-all"
                          style={{ width: videoPlaying ? "42%" : "8%" }}
                        />
                      </div>
                      <span className="tabular-nums">
                        {currentChapter.duration}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Immediate Lesson Action Bar Directly Under Video */}
            <div
              className={`p-3.5 sm:px-4 sm:py-3 bg-white flex flex-wrap items-center justify-between gap-3 ${
                !currentChapter.hideVideoBlock ? "border-t border-slate-100" : ""
              }`}
            >
              {/* Left: Notes / Reviews / Report Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setActiveUtilityTab((t) => (t === "notes" ? null : "notes"))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                    activeUtilityTab === "notes"
                      ? "bg-[#4F39F6]/8 border-[#4F39F6] text-[#4F39F6]"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <StickyNote size={13} />
                  <span>Catatan</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveUtilityTab((t) =>
                      t === "reviews" ? null : "reviews"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                    activeUtilityTab === "reviews"
                      ? "bg-[#4F39F6]/8 border-[#4F39F6] text-[#4F39F6]"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Star size={13} className="text-amber-500" />
                  <span>Ulasan ({allSanitizedReviews.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Flag size={12} />
                  <span className="hidden sm:inline">Laporkan</span>
                </button>
              </div>

              {/* Right: Complete & Next Chapter Navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!prevChapter}
                  onClick={() => prevChapter && onSelectChapter(prevChapter.id)}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft size={13} />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onMarkChapterComplete(
                      currentChapter.id,
                      currentChapter.points
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    currentChapter.completed
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                  }`}
                >
                  <Check size={13} strokeWidth={2.5} />
                  <span>
                    {currentChapter.completed
                      ? `Selesai (+${currentChapter.points})`
                      : `Tandai Selesai (+${currentChapter.points} Poin)`}
                  </span>
                </button>

                {nextChapter ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isChapterProOnly(nextChapter) && !learnerIsPro) {
                        onShowToast(
                          "🔒 Bab Lanjutan (Advance Module) khusus member Learner PRO. Silakan upgrade ke PRO."
                        );
                        onOpenUpgradeModal?.();
                        return;
                      }
                      if (nextChapter.type === "Quiz") {
                        onStartQuizRunner();
                      } else {
                        onSelectChapter(nextChapter.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer transition-colors shadow-2xs"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentChapter.completed) {
                        onMarkChapterComplete(
                          currentChapter.id,
                          currentChapter.points
                        );
                      }
                      setCourseCompleteScreenOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer transition-colors shadow-2xs"
                  >
                    <Check size={13} strokeWidth={2.5} />
                    <span>Selesaikan Kelas</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Utility Panel Directly Below Player (Notes / Reviews) */}
          {activeUtilityTab === "notes" && (
            <div className="rounded-2xl bg-white p-5 border border-slate-200/90 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote size={15} className="text-[#4F39F6]" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Catatan Pribadi — {currentChapter.title}
                  </h3>
                </div>
                {learnerIsPro ? (
                  <span className="text-[11px] font-medium text-emerald-600">
                    Tersimpan otomatis
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    <Lock size={9} />
                    PRO
                  </span>
                )}
              </div>

              {learnerIsPro ? (
                <textarea
                  rows={4}
                  value={rsLessonNotes?.[currentChapter.id] ?? ""}
                  onChange={(e) =>
                    saveRsLessonNote(currentChapter.id, e.target.value)
                  }
                  placeholder="Tulis catatan atau poin penting dari materi ini..."
                  className="w-full rounded-xl bg-slate-50 p-3 text-xs text-slate-800 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none leading-relaxed"
                />
              ) : (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-amber-900">
                    Catatan pribadi per bab tersedia untuk member Learner PRO.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenUpgradeModal?.()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer shrink-0"
                  >
                    <Zap size={11} className="text-amber-400" fill="currentColor" />
                    <span>Upgrade PRO</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeUtilityTab === "reviews" && (
            <div className="rounded-2xl bg-white p-5 border border-slate-200/90 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star
                    size={15}
                    className="text-amber-500"
                    fill="currentColor"
                  />
                  <h3 className="text-xs font-bold text-slate-900">
                    Ulasan &amp; Rating Materi
                  </h3>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Beri ${star} bintang`}
                      className="p-0.5 cursor-pointer"
                    >
                      <Star
                        size={15}
                        className={
                          star <= reviewRating
                            ? "text-amber-500"
                            : "text-slate-300"
                        }
                        fill={star <= reviewRating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Tulis ulasan atau masukan Anda untuk materi ini..."
                  className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-900 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!reviewFeedback.trim()) return;
                    submitRsLessonReview({
                      lessonKey: currentChapter.id,
                      rating: reviewRating,
                      feedback: reviewFeedback.trim(),
                      reviewerName: learnerName,
                      reviewerUsername: learnerName
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "."),
                    });
                    setReviewFeedback("");
                    onShowToast(
                      `Terima kasih! Ulasan ${reviewRating}★ berhasil dikirim.`
                    );
                  }}
                  className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Kirim
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span>
                  Rata-rata {reviewStats.average} ★ dari{" "}
                  {allSanitizedReviews.length} ulasan
                </span>
                <button
                  type="button"
                  onClick={() => setReviewRecapModalOpen(true)}
                  className="font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                >
                  Lihat semua ulasan
                </button>
              </div>
            </div>
          )}

          {/* 3. Main Lesson Reading Card */}
          {(hasTextSection ||
            hasCallout ||
            hasImageCaption ||
            hasAttachments ||
            hasEmbedded ||
            hasDatabase) && (
            <article className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200/90 space-y-5">
              {hasTextSection && (
                <div className="space-y-4">
                  {currentChapter.contentParagraphs.map((para, idx) => (
                    <p
                      key={idx}
                      className="text-sm sm:text-[15px] text-slate-800 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {hasCallout && (
                <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-4 flex items-start gap-3">
                  <AlertCircle
                    size={17}
                    className="text-[#4F39F6] shrink-0 mt-0.5"
                  />
                  <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                    {currentChapter.calloutTip}
                  </p>
                </div>
              )}

              {hasImageCaption && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-600">
                  <ImageIcon
                    size={15}
                    className="text-slate-400 shrink-0 mt-0.5"
                  />
                  <span>{currentChapter.imageCaption}</span>
                </div>
              )}

              {hasEmbedded && currentChapter.embeddedBlocks && (
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tautan &amp; Referensi Materi
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentChapter.embeddedBlocks.map((blk) => (
                      <a
                        key={blk.id}
                        href={blk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 hover:border-[#4F39F6] transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="inline-block text-[10px] font-semibold text-[#4F39F6]">
                            {blk.provider}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {blk.title}
                          </p>
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {hasDatabase && currentChapter.databaseRows && (
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tabel Panduan Kerja
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <th className="py-2.5 px-3">Deliverable / Item</th>
                          <th className="py-2.5 px-3">Pillar</th>
                          <th className="py-2.5 px-3">Platform</th>
                          <th className="py-2.5 px-3">Target KPI</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentChapter.databaseRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {row.deliverable || row.name}
                            </td>
                            <td className="py-2.5 px-3 text-[#4F39F6] font-medium">
                              {row.pillar || row.category}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {row.platform || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">
                              {row.kpi || row.owner || "-"}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasAttachments && (
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Lampiran Materi
                    </h2>
                    {!learnerIsPro && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        <Lock size={10} />
                        Khusus PRO
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {currentChapter.attachments.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-200"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText
                            size={15}
                            className="text-slate-500 shrink-0"
                          />
                          <span className="text-xs font-medium text-slate-900 truncate">
                            {file.name}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {file.size}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!learnerIsPro) {
                              onShowToast(
                                `🔒 Download "${file.name}" khusus member Learner PRO. Silakan upgrade ke PRO.`
                              );
                              onOpenUpgradeModal?.();
                              return;
                            }
                            onShowToast(`Mengunduh "${file.name}"...`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-[#4F39F6] cursor-pointer shrink-0"
                        >
                          {learnerIsPro ? (
                            <Download size={12} />
                          ) : (
                            <Lock size={11} className="text-amber-600" />
                          )}
                          <span>{learnerIsPro ? "Unduh" : "PRO"}</span>
                        </button>
                      </div>
                    ))}

                    {matchedLinkedLesson &&
                      matchedLinkedLesson.assets.map((asset) =>
                        learnerIsPro ? (
                          <a
                            key={asset.assetKey}
                            href={asset.href}
                            download={`${asset.title}.${asset.type}`}
                            onClick={() =>
                              onShowToast(
                                `Mengunduh "${asset.title}" (${asset.type.toUpperCase()})...`
                              )
                            }
                            className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-200 hover:border-[#4F39F6] transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate capitalize">
                                {asset.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {asset.note}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold uppercase text-[#4F39F6] border border-slate-200 shrink-0">
                              <Download size={11} />
                              {asset.type}
                            </span>
                          </a>
                        ) : (
                          <button
                            key={asset.assetKey}
                            type="button"
                            onClick={() => {
                              onShowToast(
                                `🔒 Download asset "${asset.title}" khusus member Learner PRO.`
                              );
                              onOpenUpgradeModal?.();
                            }}
                            className="w-full flex items-center justify-between gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-200 hover:border-amber-300 text-left transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate capitalize">
                                {asset.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {asset.note}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 border border-amber-200 shrink-0">
                              <Lock size={10} />
                              PRO
                            </span>
                          </button>
                        )
                      )}
                  </div>
                </div>
              )}
            </article>
          )}

          {/* Closing Left Main Learning Container */}
        </div>
      </div>

      {/* RIGHT SIDEBAR: DAFTAR BAB, DISKUSI & LAMPIRAN */}
      {sidebarCollapsed ? (
        <aside
          aria-label="Collapsed Classroom Sidebar"
          className="hidden lg:flex w-14 bg-white border-l border-slate-200 flex-col items-center gap-3 p-2.5 shrink-0"
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            title="Tampilkan Daftar Bab"
            aria-label="Tampilkan Daftar Bab"
            className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-[#4F39F6] border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="h-px w-8 bg-slate-200" />

          <button
            type="button"
            onClick={() => {
              setRightDockTab("curriculum");
              setSidebarCollapsed(false);
            }}
            title="Materi"
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              rightDockTab === "curriculum"
                ? "bg-indigo-50 text-[#4F39F6]"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <BookOpen size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setRightDockTab("discussion");
              setSidebarCollapsed(false);
            }}
            title="Diskusi"
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              rightDockTab === "discussion"
                ? "bg-indigo-50 text-[#4F39F6]"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <MessageSquare size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setRightDockTab("file");
              setSidebarCollapsed(false);
            }}
            title="Lampiran"
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              rightDockTab === "file"
                ? "bg-indigo-50 text-[#4F39F6]"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <FileText size={16} />
          </button>
        </aside>
      ) : (
        <aside
          aria-label="Daftar Bab & Diskusi"
          className="w-full lg:w-[350px] xl:w-[370px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200/90 flex flex-col shrink-0 lg:sticky lg:top-0 lg:h-[calc(100vh-3.5rem)]"
        >
          {/* Fixed Top Sidebar Header (Progress + Tabs + Search) */}
          <div className="p-3.5 border-b border-slate-100 space-y-3 shrink-0 bg-white">
            {/* Compact Course Progress Header */}
            <div className="rounded-xl bg-slate-50/90 px-3 py-2.5 border border-slate-200/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  Progres Belajar
                </span>
                <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                  {totalCompleted}/{flatChapters.length} bab ({progressPct}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Sidebar Tabs */}
            <div
              role="tablist"
              className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={rightDockTab === "curriculum"}
                onClick={() => setRightDockTab("curriculum")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  rightDockTab === "curriculum"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen size={12} />
                <span>Materi ({flatChapters.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={rightDockTab === "discussion"}
                onClick={() => setRightDockTab("discussion")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  rightDockTab === "discussion"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare size={12} />
                <span>Diskusi ({syncedComments.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={rightDockTab === "file"}
                onClick={() => setRightDockTab("file")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  rightDockTab === "file"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText size={12} />
                <span>Lampiran</span>
              </button>
            </div>

            {rightDockTab === "curriculum" && (
              <div className="relative flex items-center">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 text-slate-400"
                />
                <input
                  type="text"
                  value={curriculumSearch}
                  onChange={(e) => setCurriculumSearch(e.target.value)}
                  placeholder="Cari judul bab..."
                  className="w-full rounded-xl bg-slate-50 pl-8 pr-7 py-2 text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200/80 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
                />
                {curriculumSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => setCurriculumSearch("")}
                    aria-label="Hapus pencarian bab"
                    className="absolute right-2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {/* TAB 1: DAFTAR BAB */}
            {rightDockTab === "curriculum" && (
              <div className="space-y-3">
                {visibleSections.map((sec) => {
                  const filteredChs = sec.chapters.filter(
                    (c) =>
                      !curriculumSearch.trim() ||
                      c.title
                        .toLowerCase()
                        .includes(curriculumSearch.toLowerCase())
                  );
                  if (filteredChs.length === 0) return null;
                  const sectionCompletedCount = filteredChs.filter(
                    (c) => c.completed
                  ).length;

                  return (
                    <details
                      key={sec.id}
                      open
                      className="group rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden"
                    >
                      <summary className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-100/70 text-[11px] font-bold text-slate-700 cursor-pointer list-none">
                        <span className="truncate">
                          {sec.shortTitle || sec.sectionTitle}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200/70 tabular-nums">
                            {sectionCompletedCount}/{filteredChs.length}
                          </span>
                          <ChevronDown
                            size={13}
                            className="text-slate-500 shrink-0 transition-transform group-open:rotate-0 -rotate-90"
                          />
                        </div>
                      </summary>
                      <div className="p-1.5 space-y-1 bg-white">
                        {filteredChs.map((ch) => {
                          const isActive = ch.id === currentChapter.id;
                          const proOnly = isChapterProOnly(ch);
                          const proLocked = proOnly && !learnerIsPro;
                          const globalIdx = flatChapters.findIndex(
                            (fc) => fc.id === ch.id
                          );
                          const globalNum = String(
                            (globalIdx >= 0 ? globalIdx : 0) + 1
                          ).padStart(2, "0");

                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => {
                                if (proLocked) {
                                  onShowToast(
                                    ch.type === "Assignment"
                                      ? "🔒 Review Tugas Praktik 1-on-1 bersama Mentor khusus member Learner PRO."
                                      : "🔒 Bab Lanjutan (Advance Module) khusus member Learner PRO. Silakan upgrade ke PRO."
                                  );
                                  onOpenUpgradeModal?.();
                                  return;
                                }
                                if (ch.locked) {
                                  onShowToast(
                                    "Selesaikan bab sebelumnya terlebih dahulu."
                                  );
                                  return;
                                }
                                if (ch.type === "Quiz") {
                                  onStartQuizRunner();
                                } else {
                                  onSelectChapter(ch.id);
                                }
                              }}
                              className={`w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all cursor-pointer ${
                                isActive
                                  ? "bg-[#4F39F6]/8 border border-[#4F39F6]/25 shadow-2xs"
                                  : proLocked
                                  ? "border border-transparent hover:bg-amber-50/60"
                                  : "border border-transparent hover:bg-slate-50"
                              }`}
                            >
                              {/* Step Number / Active Play / Completed / Lock Icon */}
                              <span
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
                                  proLocked
                                    ? "bg-amber-50 text-amber-600 border border-amber-200/70"
                                    : ch.completed
                                    ? "bg-emerald-500 text-white"
                                    : ch.locked
                                    ? "bg-slate-100 text-slate-400"
                                    : isActive
                                    ? "bg-[#4F39F6] text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {proLocked || ch.locked ? (
                                  <Lock size={11} />
                                ) : ch.completed ? (
                                  <Check size={12} strokeWidth={3} />
                                ) : isActive ? (
                                  <Play size={10} fill="currentColor" />
                                ) : (
                                  globalNum
                                )}
                              </span>

                              {/* Readable 2-line Title & Secondary Metadata Row */}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs leading-snug line-clamp-2 ${
                                    isActive
                                      ? "font-bold text-[#4F39F6]"
                                      : ch.completed
                                      ? "font-medium text-slate-700"
                                      : proLocked
                                      ? "font-medium text-slate-500"
                                      : "font-medium text-slate-800"
                                  }`}
                                >
                                  {ch.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                  <span>{ch.duration}</span>
                                  {isActive && (
                                    <span className="rounded bg-[#4F39F6]/10 px-1.5 py-0.2 font-semibold text-[#4F39F6]">
                                      Sedang diputar
                                    </span>
                                  )}
                                  {proOnly && (
                                    <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 font-semibold text-amber-800">
                                      PRO
                                    </span>
                                  )}
                                </div>
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

            {/* TAB 2: DISKUSI */}
            {rightDockTab === "discussion" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={discussionSearch}
                  onChange={(e) => setDiscussionSearch(e.target.value)}
                  placeholder="Cari diskusi..."
                  className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-900 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
                />

                <form
                  onSubmit={handlePostComment}
                  className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2"
                >
                  <input
                    type="text"
                    value={discussionTopicInput}
                    onChange={(e) => setDiscussionTopicInput(e.target.value)}
                    placeholder="Topik diskusi (opsional)"
                    className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 border border-slate-200 focus:border-[#4F39F6] focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tulis pertanyaan atau tanggapan..."
                    className="w-full rounded-lg bg-white p-2.5 text-xs text-slate-900 border border-slate-200 focus:border-[#4F39F6] focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      <Send size={11} />
                      <span>Kirim</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {syncedComments
                    .filter(
                      (c) =>
                        !discussionSearch.trim() ||
                        c.body
                          .toLowerCase()
                          .includes(discussionSearch.toLowerCase()) ||
                        c.author
                          .toLowerCase()
                          .includes(discussionSearch.toLowerCase())
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {(() => {
                              const commentAvatar = resolveUserAvatar(c.author);
                              if (commentAvatar) {
                                return (
                                  <img
                                    src={commentAvatar}
                                    alt={c.author}
                                    className="h-6 w-6 shrink-0 rounded-full object-cover border border-slate-200"
                                  />
                                );
                              }
                              return (
                                <span
                                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                  style={{ backgroundColor: c.bg, color: c.text }}
                                >
                                  {c.initials}
                                </span>
                              );
                            })()}
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {c.author}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {c.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {c.body}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 3: LAMPIRAN BAB SAAT INI */}
            {rightDockTab === "file" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-900">
                  Lampiran File Bab Ini
                </p>

                {currentChapter.attachments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                    Tidak ada lampiran file pada bab ini.
                  </div>
                ) : (
                  currentChapter.attachments.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                          <FileText size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {file.size}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!learnerIsPro) {
                            onShowToast(
                              `🔒 Download "${file.name}" khusus member Learner PRO.`
                            );
                            onOpenUpgradeModal?.();
                            return;
                          }
                          onShowToast(`Mengunduh "${file.name}" (${file.size})...`);
                        }}
                        title="Unduh File"
                        className="h-8 w-8 rounded-lg bg-white hover:border-[#4F39F6] border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
                      >
                        {learnerIsPro ? (
                          <Download size={14} />
                        ) : (
                          <Lock size={13} className="text-amber-600" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Report Issue Drawer */}
      {reportModalOpen && (
        <aside
          role="dialog"
          aria-label="Laporkan Kendala Materi"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white border-l border-slate-200 shadow-xl p-6 flex flex-col justify-between"
        >
          <form onSubmit={handleSubmitIssue} className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Laporkan Kendala
                </h2>
                <p className="text-xs text-slate-500 truncate max-w-[240px]">
                  Bab: {currentChapter.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-900">
                Kategori kendala
              </p>
              {[
                {
                  title: "Content Clarity Issues",
                  sub: "Penjelasan membingungkan atau butuh contoh tambahan",
                },
                {
                  title: "Visual Quality Issues",
                  sub: "Gambar buram, rusak, atau video sulit dilihat",
                },
                {
                  title: "Typographical and Language Errors",
                  sub: "Kesalahan penulisan atau tata bahasa",
                },
                {
                  title: "Technical Issues",
                  sub: "Video tidak terputar, tautan rusak, atau error quiz",
                },
                {
                  title: "Or others",
                  sub: "Masukan lain untuk tim pengajar",
                },
              ].map((cat) => (
                <label
                  key={cat.title}
                  onClick={() => setIssueCategory(cat.title)}
                  className={`flex items-start gap-2.5 rounded-xl p-3 border cursor-pointer transition-colors ${
                    issueCategory === cat.title
                      ? "bg-indigo-50/70 border-[#4F39F6]"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="issue-cat"
                    checked={issueCategory === cat.title}
                    onChange={() => setIssueCategory(cat.title)}
                    className="mt-0.5 accent-[#4F39F6]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {cat.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{cat.sub}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label
                htmlFor="issue-desc-textarea"
                className="block text-xs font-semibold text-slate-900 mb-1.5"
              >
                Detail kendala
              </label>
              <textarea
                id="issue-desc-textarea"
                rows={3}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Jelaskan kendala yang Anda temui..."
                className="w-full rounded-xl bg-slate-50 p-3 text-xs text-slate-900 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2 text-[11px] text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={issueFollowUpConsent}
                onChange={(e) => setIssueFollowUpConsent(e.target.checked)}
                className="mt-0.5 accent-[#4F39F6]"
              />
              <span>
                Beri tahu saya melalui email jika kendala sudah diperbarui.
              </span>
            </label>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Kirim Laporan
              </button>
            </div>
          </form>
        </aside>
      )}

      {/* Review & Feedback Recap Modal */}
      <ModalDialog
        open={reviewRecapModalOpen}
        onClose={() => setReviewRecapModalOpen(false)}
        titleId="review-recap-modal-title"
        title="Rekap Ulasan & Masukan Siswa"
        subtitle={`Kelas: ${courseTitle}`}
        maxWidthClass="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-3 text-center border-b md:border-b-0 md:border-r border-slate-200">
                <div className="text-3xl font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{reviewStats.average}</span>
                  <Star
                    size={24}
                    className="text-amber-500"
                    fill="currentColor"
                  />
                </div>
                <p className="text-xs font-medium text-slate-600 mt-1">
                  {reviewStats.total} ulasan
                </p>
              </div>

              <div className="md:col-span-8 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewStats.counts[star] || 0;
                  const pct = reviewStats.pcts[star] || 0;
                  return (
                    <div
                      key={star}
                      className="flex items-center gap-2.5 text-xs"
                    >
                      <span className="w-12 font-medium text-slate-600 flex items-center gap-1 shrink-0">
                        <span>{star}</span>
                        <Star
                          size={11}
                          className="text-amber-500"
                          fill="currentColor"
                        />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-[11px] font-medium text-slate-500 tabular-nums shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "all" as const, label: `Semua (${reviewStats.total})` },
                {
                  id: "5" as const,
                  label: `5★ (${reviewStats.counts[5] || 0})`,
                },
                {
                  id: "4" as const,
                  label: `4★ (${reviewStats.counts[4] || 0})`,
                },
                { id: "chapter" as const, label: "Bab Ini" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setReviewFilterTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    reviewFilterTab === t.id
                      ? "bg-[#4F39F6] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search
                size={13}
                className="absolute left-2.5 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={reviewSearchQuery}
                onChange={(e) => setReviewSearchQuery(e.target.value)}
                placeholder="Cari ulasan..."
                className="w-full rounded-lg bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {filteredRecapReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                Belum ada ulasan yang sesuai dengan filter.
              </div>
            ) : (
              filteredRecapReviews.map((rev) => {
                const initials =
                  rev.reviewerName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "SN";

                return (
                  <div
                    key={rev.id}
                    className="rounded-xl bg-white p-4 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const revAvatar = resolveUserAvatar(
                            rev.reviewerName,
                            rev.reviewerUsername
                          );
                          if (revAvatar) {
                            return (
                              <img
                                src={revAvatar}
                                alt={rev.reviewerName}
                                className="h-7 w-7 shrink-0 rounded-full object-cover border border-slate-200"
                              />
                            );
                          }
                          return (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-[#4F39F6] text-xs font-bold">
                              {initials}
                            </span>
                          );
                        })()}
                        <span className="text-xs font-semibold text-slate-900">
                          {rev.reviewerName}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-amber-600">
                        {"★".repeat(rev.rating)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-9">
                      &ldquo;{rev.feedback}&rdquo;
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
