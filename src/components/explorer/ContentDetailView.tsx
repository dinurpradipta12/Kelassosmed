"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  Search,
  MessageSquare,
  Eye,
  Clock,
  Users,
  MoreHorizontal,
  Play,
  Edit3,
  Plus,
  RotateCcw,
  Send,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Globe,
  ChevronDown,
  Calendar,
  Download,
  Filter,
  Trash2,
  Check,
  Bell,
  X,
  BarChart3,
  Award,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  type ExplorerContentItem,
  type AssigneeLearner,
  type ContentVersionItem,
} from "@/lib/phase2-data";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { ModalDialog } from "@/components/ui/ModalDialog";

interface ContentDetailViewProps {
  item: ExplorerContentItem;
  onBackToExplorer: () => void;
  onOpenAssignModal: (item: ExplorerContentItem) => void;
  onEditContent?: (item: ExplorerContentItem) => void;
  onShowToast: (msg: string) => void;
}

type DetailTabId = "statistics" | "detail" | "issues" | "discussion";
type RightPanelTabId = "assignees" | "version";

const ISSUE_CATEGORIES_META = [
  { label: "Content Outdated", color: "#4F39F6" },
  { label: "Broken Link", color: "#0EA5E9" },
  { label: "Low Video / Audio Quality", color: "#F59E0B" },
  { label: "Confusing Instruction", color: "#EF4444" },
  { label: "Other", color: "#9CA3AF" },
];

const REMINDER_TEMPLATES = [
  {
    id: "running-out",
    title: "The course time is running out",
    badge: "Approaching Due Date",
    body: "Hi there! Just a friendly reminder that your assigned course in Ruang Sosmed 2.0 is approaching its due date in 48 hours. Let's finish the remaining chapters to claim your completion points!",
  },
  {
    id: "overdue",
    title: "Overdue course",
    badge: "Past Deadline",
    body: "Hello! We noticed that your assigned training module has passed its scheduled due date. Please prioritize completing the remaining chapters today or reach out to your mentor if you need help.",
  },
] as const;

export function ContentDetailView({
  item,
  onBackToExplorer,
  onOpenAssignModal,
  onEditContent,
  onShowToast,
}: ContentDetailViewProps) {
  const {
    discussionThreads: threads,
    reportedIssues: issues,
    assignees: allPlatformLearners,
    explorerItems,
    versions,
    postDiscussionMessage,
    toggleReportedIssueStatus,
    manageAssigneeAction,
    restoreContentVersion,
    getCourseCurriculum,
    courseCurriculums,
    courseSections,
    updateContentLanguage,
    cohortProjects,
    resolveUserAvatar,
    unassignLearnerFromContent,
  } = useRuangSosmedStore();

  // Hanya tampilkan peserta yang benar-benar di-assign ke materi ini
  const liveExplorerItem = React.useMemo(
    () =>
      explorerItems.find(
        (e) =>
          e.id === item.id ||
          e.title.trim().toLowerCase() === item.title.trim().toLowerCase()
      ) || item,
    [explorerItems, item]
  );

  const assignees = React.useMemo(() => {
    const rawAssigned = liveExplorerItem.assignedLearners || [];
    if (rawAssigned.length === 0) return [];
    const assignedSet = new Set(
      rawAssigned.map((n) => String(n || "").trim().toLowerCase()).filter(Boolean)
    );
    const hasCohortWide =
      assignedSet.has("all learners") ||
      assignedSet.has("batch oktober 2026") ||
      assignedSet.has("ruang sosmed class") ||
      assignedSet.has("creator growth lab");
    if (hasCohortWide) {
      return allPlatformLearners;
    }
    return allPlatformLearners.filter((a) =>
      assignedSet.has(a.name.trim().toLowerCase())
    );
  }, [liveExplorerItem, allPlatformLearners]);

  const [activeTab, setActiveTab] = useState<DetailTabId>("statistics");
  const [rightTab, setRightTab] = useState<RightPanelTabId>("assignees");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("All type issue");
  const [statsRange, setStatsRange] = useState<"Last 7 days" | "Last 30 days" | "All time">("Last 7 days");

  // Kurikulum aktual yang tersimpan untuk item ini
  const targetCurriculum =
    getCourseCurriculum(item.title) ||
    courseCurriculums?.[item.title.toLowerCase().trim()] ||
    [];

  const flatChapters = (targetCurriculum || [])
    .filter((sec) => !sec.hidden)
    .flatMap((sec) =>
      (sec.chapters || [])
        .filter((ch) => !ch.hidden)
        .map((ch) => ({
          ...ch,
          sectionTitle: sec.sectionTitle,
        }))
    );
  const totalChaptersCount = flatChapters.length;

  // Global statistics metrics across assignees
  const completedCount = assignees.filter(
    (a) =>
      a.completedChapters >=
      (totalChaptersCount > 0
        ? totalChaptersCount
        : a.totalChapters || 1)
  ).length;
  const inProgressCount = Math.max(0, assignees.length - completedCount);
  const totalAsg = Math.max(1, assignees.length);
  const inProgressPct =
    assignees.length === 0
      ? 0
      : Math.round((inProgressCount / totalAsg) * 100);
  const completedPct =
    assignees.length === 0
      ? 0
      : Math.round((completedCount / totalAsg) * 100);

  // Discussions filter & UI state
  const [discussionSearch, setDiscussionSearch] = useState("");
  const [chapterFilter, setChapterFilter] = useState("All Chapters");
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(
    "thread-1"
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Right Panel UI state
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeProgressFilter, setAssigneeProgressFilter] = useState<
    "all" | "completed" | "in-progress"
  >("all");
  const [openAssigneeMenuId, setOpenAssigneeMenuId] = useState<string | null>(
    null
  );

  // All Assignees Monitoring Modal + Bulk Action Bar + Due Date + Send Reminder (ref_09)
  const [allAssigneesModalOpen, setAllAssigneesModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([
    "asg-1",
    "asg-2",
    "asg-3",
  ]);
  const [customDueDates, setCustomDueDates] = useState<Record<string, string>>(
    {}
  );
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [bulkDueDateInput, setBulkDueDateInput] = useState("2026-11-15");
  const [bulkDueTimeInput, setBulkDueTimeInput] = useState("17:00");
  const [sendReminderModalOpen, setSendReminderModalOpen] = useState(false);
  const [selectedReminderTemplate, setSelectedReminderTemplate] = useState<
    "running-out" | "overdue"
  >("running-out");
  const [customReminderNote, setCustomReminderNote] = useState("");

  // Send a Message to Issue Reporter modal
  const [messageReporterTarget, setMessageReporterTarget] = useState<
    string | null
  >(null);
  const [reporterMessageText, setReporterMessageText] = useState("");

  const handleAddReply = (threadId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (replyDrafts[threadId] ?? "").trim();
    if (!text) return;

    postDiscussionMessage({
      threadId,
      chapterTitle: item.title,
      authorName: "Dinur M. Pradipta",
      authorRole: "Lead Mentor",
      authorInitials: "DP",
      avatarBg: "#FEF3C7",
      avatarText: "#92400E",
      message: text,
    });
    setReplyDrafts((prev) => ({ ...prev, [threadId]: "" }));
    onShowToast(
      "Reply posted and synced to Learner Classroom Discussion dock."
    );
  };

  const toggleIssueStatus = (id: string) => {
    toggleReportedIssueStatus(id);
  };

  const handleAssigneeAction = (
    learner: AssigneeLearner,
    action: "remind" | "reset" | "unassign"
  ) => {
    setOpenAssigneeMenuId(null);
    manageAssigneeAction(learner.id, action);
    if (action === "remind") {
      setSelectedAssigneeIds([learner.id]);
      setSendReminderModalOpen(true);
    } else if (action === "reset") {
      onShowToast(`Reset progress for ${learner.name} to 0/24 chapters.`);
    } else if (action === "unassign") {
      unassignLearnerFromContent(liveExplorerItem.title, {
        id: learner.id,
        name: learner.name,
      });
      onShowToast(
        `Akses ${learner.name} ke "${liveExplorerItem.title}" berhasil dicabut (Unassigned).`
      );
    }
  };

  const handleRestoreVersion = (ver: ContentVersionItem) => {
    restoreContentVersion(ver.id);
    onShowToast(`Restored content revision ${ver.versionTag}.`);
  };

  const toggleSelectAssignee = (id: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveBulkDueDate = () => {
    const nextMap = { ...customDueDates };
    selectedAssigneeIds.forEach((id) => {
      nextMap[id] = `${bulkDueDateInput} • ${bulkDueTimeInput}`;
    });
    setCustomDueDates(nextMap);
    setDueDatePopoverOpen(false);
    onShowToast(
      `Updated due date to ${bulkDueDateInput} (${bulkDueTimeInput}) for ${selectedAssigneeIds.length} learners.`
    );
  };

  const handleSendBulkReminder = () => {
    const tpl = REMINDER_TEMPLATES.find(
      (t) => t.id === selectedReminderTemplate
    );
    setSendReminderModalOpen(false);
    onShowToast(
      `Sent "${tpl?.title}" reminder to ${selectedAssigneeIds.length} learner(s).`
    );
  };

  // Filter diskusi & kendala agar hanya menampilkan milik course ini (tidak bocor dari course lain)
  const { courseThreads, courseIssues } = React.useMemo(() => {
    const currentTitleLower = liveExplorerItem.title.trim().toLowerCase();
    const otherCourseTitles = new Set(
      explorerItems
        .filter(
          (e) =>
            e.id !== liveExplorerItem.id &&
            e.title.trim().toLowerCase() !== currentTitleLower
        )
        .map((e) => e.title.trim().toLowerCase())
    );

    const curr =
      getCourseCurriculum(liveExplorerItem.title) || courseSections || [];
    const chapterTitles = new Set<string>();
    curr.forEach((sec) => {
      if (sec.sectionTitle?.trim())
        chapterTitles.add(sec.sectionTitle.trim().toLowerCase());
      (sec.chapters || []).forEach((ch) => {
        if (ch.title?.trim()) chapterTitles.add(ch.title.trim().toLowerCase());
      });
    });

    const belongsToThisCourse = (
      badgeOrChapter: string | undefined,
      titleText: string | undefined
    ) => {
      const badge = (badgeOrChapter || "").trim().toLowerCase();
      const title = (titleText || "").trim().toLowerCase();

      if (
        badge === currentTitleLower ||
        (currentTitleLower && title.includes(currentTitleLower))
      ) {
        return true;
      }

      if (badge && otherCourseTitles.has(badge)) {
        return false;
      }
      for (const other of otherCourseTitles) {
        if (other && title.includes(other)) {
          return false;
        }
      }

      if (badge && chapterTitles.has(badge)) return true;
      for (const ch of chapterTitles) {
        if (ch && title.includes(ch)) return true;
      }
      return false;
    };

    return {
      courseThreads: threads.filter((t) =>
        belongsToThisCourse(t.chapterBadge, t.title)
      ),
      courseIssues: issues.filter((i) =>
        belongsToThisCourse(i.chapter, i.title)
      ),
    };
  }, [
    threads,
    issues,
    liveExplorerItem.id,
    liveExplorerItem.title,
    explorerItems,
    getCourseCurriculum,
    courseSections,
  ]);

  const filteredThreads = courseThreads.filter((t) => {
    if (
      chapterFilter !== "All Chapters" &&
      !t.chapterBadge.startsWith(chapterFilter)
    ) {
      return false;
    }
    if (
      discussionSearch.trim() &&
      !t.title.toLowerCase().includes(discussionSearch.toLowerCase()) &&
      !t.chapterBadge.toLowerCase().includes(discussionSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredAssignees = assignees.filter((a) => {
    if (
      assigneeSearch.trim() &&
      !a.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    ) {
      return false;
    }
    if (
      assigneeProgressFilter === "completed" &&
      a.completedChapters < a.totalChapters
    ) {
      return false;
    }
    if (
      assigneeProgressFilter === "in-progress" &&
      a.completedChapters === a.totalChapters
    ) {
      return false;
    }
    return true;
  });

  const modalFilteredAssignees = assignees.filter(
    (a) =>
      !modalSearch.trim() ||
      a.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
      a.roleBadge.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Main Center Content Area */}
      <div className="flex-1 min-w-0 px-6 sm:px-8 pt-7 pb-16">
        {/* Breadcrumb Header */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-medium text-[#5E5E5E] mb-3"
        >
          <button
            type="button"
            onClick={onBackToExplorer}
            className="hover:text-[#4F39F6] transition-colors cursor-pointer"
          >
            Ruang Sosmed 2.0
          </button>
          <ChevronRight size={13} className="text-[#9CA3AF]" />
          <span className="font-semibold text-[#121215] truncate">
            {item.title}
          </span>
        </nav>

        {/* Title & Metadata Row */}
        <header className="pb-5 border-b border-[#EAECEF]">
          <h1 className="text-[24px] font-bold tracking-tight text-[#121215]">
            {item.title}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[#5E5E5E]">
            <ContentBadge type={item.type} size="sm" />
            <span className="text-[#D1D5DB]">•</span>
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 font-medium text-[#5E5E5E] hover:text-[#4F39F6] bg-transparent hover:bg-[#F8F9FB] px-2 py-0.5 rounded-md border border-transparent hover:border-[#EAECEF] transition-all cursor-pointer"
                title="Klik untuk mengubah bahasa materi/kursus"
              >
                <Globe size={13} className="text-[#4F39F6]" />
                <span>{item.language || "Bahasa Indonesia"}</span>
                <ChevronDown size={11} className="text-[#9CA3AF]" />
              </button>

              {langMenuOpen && (
                <div className="absolute left-0 top-7 z-30 w-44 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-xl p-1.5 space-y-0.5 text-left">
                  {["Bahasa Indonesia", "English", "Bahasa / English"].map(
                    (lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          updateContentLanguage(item.id, lang);
                          setLangMenuOpen(false);
                          onShowToast(`Bahasa kursus diubah ke "${lang}".`);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                          item.language === lang
                            ? "bg-[#4F39F6]/10 text-[#4F39F6] font-bold"
                            : "text-[#121215] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        <span>{lang}</span>
                        {item.language === lang && <Check size={12} />}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <span className="text-[#D1D5DB]">•</span>
            <span
              title="Cohort / Project pemilik materi ini"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F8F9FB] border border-[#EAECEF] font-medium text-[11px] text-[#5E5E5E]"
            >
              <span
                className="h-2 w-2 rounded-[3px] shrink-0"
                style={{
                  backgroundColor:
                    cohortProjects.find(
                      (c) =>
                        c.name.toLowerCase() ===
                        (
                          item.cohort ||
                          cohortProjects[0]?.name ||
                          "Ruang Sosmed Class"
                        ).toLowerCase()
                    )?.color || "#EC4899",
                }}
              />
              <span>
                {item.cohort ||
                  cohortProjects[0]?.name ||
                  "Ruang Sosmed Class"}
              </span>
            </span>
            <span className="text-[#D1D5DB]">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar size={13} className="text-[#9CA3AF]" />
              {item.editedDate}
            </span>
          </div>

          {/* 4 View Tabs: Statistics | Details Content | Report Issues | Discussion */}
          <div
            role="tablist"
            aria-label="Content management tabs"
            className="mt-6 flex items-center gap-2 border-b border-[#EAECEF] -mb-5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "statistics"}
              onClick={() => setActiveTab("statistics")}
              className={`relative inline-flex items-center gap-2 px-3.5 pb-3 pt-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "statistics"
                  ? "text-[#4F39F6]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <BarChart3 size={14} />
              <span>Statistics</span>
              {activeTab === "statistics" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4F39F6]" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "detail"}
              onClick={() => setActiveTab("detail")}
              className={`relative inline-flex items-center gap-2 px-3.5 pb-3 pt-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "detail"
                  ? "text-[#4F39F6]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <BookOpen size={14} />
              <span>Details Content</span>
              {activeTab === "detail" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4F39F6]" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "issues"}
              onClick={() => setActiveTab("issues")}
              className={`relative inline-flex items-center gap-2 px-3.5 pb-3 pt-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "issues"
                  ? "text-[#4F39F6]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <AlertCircle size={14} />
              <span>Report Issues</span>
              <span className="rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.2 text-[10px] font-bold text-[#EF4444]">
                {courseIssues.filter((i) => i.status === "Open").length}
              </span>
              {activeTab === "issues" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4F39F6]" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "discussion"}
              onClick={() => setActiveTab("discussion")}
              className={`relative inline-flex items-center gap-2 px-3.5 pb-3 pt-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "discussion"
                  ? "text-[#4F39F6]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <MessageSquare size={14} />
              <span>Discussion</span>
              <span className="rounded-md bg-[#4F39F6]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#4F39F6]">
                {courseThreads.length}
              </span>
              {activeTab === "discussion" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4F39F6]" />
              )}
            </button>
          </div>
        </header>

        {/* TAB 1: STATISTICS DASHBOARD (Tab Utama di Paling Depan) */}
        {activeTab === "statistics" && (
          <section aria-label="Course Statistics Dashboard" className="pt-6 space-y-6">
            {/* Top Dashboard Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                    <BarChart3 size={16} />
                  </span>
                  <h2 className="text-base font-bold text-[#121215]">
                    Course Statistics &amp; Learner Analytics
                  </h2>
                </div>
                <p className="text-xs text-[#5E5E5E] mt-1">
                  Pantau progres belajar, tingkat kelulusan, dan aktivitas peserta secara real-time untuk modul ini.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#5E5E5E] hidden sm:inline">
                    Rentang Waktu:
                  </span>
                  <select
                    aria-label="Filter rentang waktu statistik"
                    value={statsRange}
                    onChange={(e) =>
                      setStatsRange(
                        e.target.value as "Last 7 days" | "Last 30 days" | "All time"
                      )
                    }
                    className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-1.5 text-xs font-semibold text-[#121215] focus:outline-none focus:border-[#4F39F6] cursor-pointer"
                  >
                    <option value="Last 7 days">7 Hari Terakhir</option>
                    <option value="Last 30 days">30 Hari Terakhir</option>
                    <option value="All time">Semua Waktu</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setAllAssigneesModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:border-[#4F39F6] px-3.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                >
                  <Users size={13} className="text-[#4F39F6]" />
                  <span>Kelola Peserta ({assignees.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAssignModal(item)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>+ Assign Learners</span>
                </button>
              </div>
            </div>

            {/* 4 Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Assignees */}
              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-2">
                <div className="flex items-center justify-between text-[#5E5E5E]">
                  <span className="text-xs font-medium">Total Peserta Terdaftar</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                    <Users size={14} />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#121215]">
                    {assignees.length}
                  </span>
                  <span className="text-xs font-semibold text-[#5E5E5E]">Learners</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] font-medium pt-1 border-t border-[#EAECEF]/80">
                  <Activity size={12} />
                  <span>100% Aktif dalam cohort</span>
                </div>
              </div>

              {/* 2. In Progress */}
              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-2">
                <div className="flex items-center justify-between text-[#5E5E5E]">
                  <span className="text-xs font-medium">Sedang Berjalan</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/10 text-[#F59E0B]">
                    <Clock size={14} />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#121215]">
                    {inProgressCount}
                  </span>
                  <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold text-[#B45309]">
                    {inProgressPct}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#5E5E5E] font-medium pt-1 border-t border-[#EAECEF]/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                  <span>Aktif menyelesaikan modul</span>
                </div>
              </div>

              {/* 3. Completed */}
              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-2">
                <div className="flex items-center justify-between text-[#5E5E5E]">
                  <span className="text-xs font-medium">Selesai / Lulus</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10B981]/10 text-[#10B981]">
                    <CheckCircle2 size={14} />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#121215]">
                    {completedCount}
                  </span>
                  <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-bold text-[#059669]">
                    {completedPct}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#5E5E5E] font-medium pt-1 border-t border-[#EAECEF]/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  <span>Menyelesaikan semua chapter</span>
                </div>
              </div>

              {/* 4. Curriculum & Scope */}
              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-2">
                <div className="flex items-center justify-between text-[#5E5E5E]">
                  <span className="text-xs font-medium">Struktur &amp; Poin</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                    <Award size={14} />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#121215]">
                    {totalChaptersCount}
                  </span>
                  <span className="text-xs font-semibold text-[#5E5E5E]">Chapters</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#5E5E5E] font-medium pt-1 border-t border-[#EAECEF]/80">
                  <span>
                    +{flatChapters.reduce((sum, ch) => sum + (ch.points || 5), 0) || 100} pts total reward
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Analytics Row: Activity Line Chart (Left) & Funnel Drop-off (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7/12: Activity & Completion Chart */}
              <div className="lg:col-span-7 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#121215]">
                      Tren Pembelajaran &amp; Penyelesaian ({statsRange})
                    </h3>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                      Grafik komparasi peserta aktif belajar vs peserta yang telah menyelesaikan bab.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#5E5E5E]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                      In Progress ({inProgressCount})
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#5E5E5E]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
                      Completed ({completedCount})
                    </span>
                  </div>
                </div>

                {/* Responsive Line Chart with Grid & Subtle Gradient Area */}
                <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4">
                  <div className="relative h-48 sm:h-56 w-full">
                    <svg
                      viewBox="0 0 500 180"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="chart-amber-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="chart-cyan-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[30, 70, 110, 150].map((y) => (
                        <line
                          key={y}
                          x1={0}
                          y1={y}
                          x2={500}
                          y2={y}
                          stroke="#EAECEF"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                        />
                      ))}

                      {/* In Progress Area & Line (Amber) */}
                      <polygon
                        points="10,120 80,105 160,85 250,90 340,65 420,55 490,45 490,165 10,165"
                        fill="url(#chart-amber-grad)"
                      />
                      <path
                        d="M 10 120 C 80 105, 160 85, 250 90 C 340 65, 420 55, 490 45"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                      />
                      {[
                        { cx: 10, cy: 120 },
                        { cx: 80, cy: 105 },
                        { cx: 160, cy: 85 },
                        { cx: 250, cy: 90 },
                        { cx: 340, cy: 65 },
                        { cx: 420, cy: 55 },
                        { cx: 490, cy: 45 },
                      ].map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.cx}
                          cy={pt.cy}
                          r={i === 6 ? 4.5 : 3.5}
                          fill="#F59E0B"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      ))}

                      {/* Completed Area & Line (Cyan) */}
                      <polygon
                        points="10,155 80,145 160,135 250,130 340,115 420,95 490,80 490,165 10,165"
                        fill="url(#chart-cyan-grad)"
                      />
                      <path
                        d="M 10 155 C 80 145, 160 135, 250 130 C 340 115, 420 95, 490 80"
                        fill="none"
                        stroke="#0EA5E9"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                      />
                      {[
                        { cx: 10, cy: 155 },
                        { cx: 80, cy: 145 },
                        { cx: 160, cy: 135 },
                        { cx: 250, cy: 130 },
                        { cx: 340, cy: 115 },
                        { cx: 420, cy: 95 },
                        { cx: 490, cy: 80 },
                      ].map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.cx}
                          cy={pt.cy}
                          r={i === 6 ? 4.5 : 3.5}
                          fill="#0EA5E9"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      ))}
                    </svg>

                    {/* X-Axis labels */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-[#9CA3AF] pt-2">
                      <span>Day 1</span>
                      <span>Day 2</span>
                      <span>Day 3</span>
                      <span>Day 4</span>
                      <span>Day 5</span>
                      <span>Day 6</span>
                      <span className="font-bold text-[#4F39F6]">Hari Ini</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5/12: Curriculum Retention Funnel */}
              <div className="lg:col-span-5 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Chapter Completion Funnel
                  </h3>
                  <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                    Tingkat penyelesaian murid pada tiap chapter kursus.
                  </p>
                </div>

                {flatChapters.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#5E5E5E] border border-dashed border-[#EAECEF] rounded-lg">
                    Belum ada chapter terstruktur di kurikulum.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flatChapters.slice(0, 5).map((ch, idx) => {
                      const finishedThisChapterCount = assignees.filter(
                        (a) => a.completedChapters > idx
                      ).length;
                      const chPct =
                        assignees.length === 0
                          ? 0
                          : Math.round(
                              (finishedThisChapterCount / assignees.length) * 100
                            );

                      return (
                        <div
                          key={ch.id || idx}
                          className="rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF] space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#121215] truncate max-w-[200px]">
                              Chapter {idx + 1}: {ch.title}
                            </span>
                            <span className="font-bold text-[#4F39F6] shrink-0">
                              {chPct}% ({finishedThisChapterCount}/{assignees.length})
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#EAECEF] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#4F39F6] transition-all duration-300"
                              style={{ width: `${chPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Learner Progress Roster Table */}
            <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Detail Progres Peserta ({assignees.length})
                  </h3>
                  <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                    Daftar lengkap peserta, progres bab, status, dan tindakan reminder.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                    />
                    <input
                      type="search"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Cari nama peserta..."
                      className="rounded-lg bg-[#F8F9FB] pl-8 pr-3 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]">
                    {(
                      [
                        { id: "all", label: `Semua (${assignees.length})` },
                        { id: "in-progress", label: `In Progress (${inProgressCount})` },
                        { id: "completed", label: `Selesai (${completedCount})` },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAssigneeProgressFilter(f.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                          assigneeProgressFilter === f.id
                            ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                            : "text-[#5E5E5E] hover:text-[#121215]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              {filteredAssignees.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#EAECEF] rounded-xl space-y-1">
                  <p className="text-xs font-bold text-[#121215]">Tidak ada peserta yang cocok</p>
                  <p className="text-[11px] text-[#5E5E5E]">Coba ubah kata kunci pencarian atau filter status.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#EAECEF] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9FB] border-b border-[#EAECEF] text-[#5E5E5E] font-semibold text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Peserta</th>
                        <th className="px-4 py-3">Role / Badge</th>
                        <th className="px-4 py-3">Progres Chapter</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAECEF] bg-[#FFFFFF]">
                      {filteredAssignees.map((learner) => {
                        const effectiveTotal =
                          totalChaptersCount > 0
                            ? totalChaptersCount
                            : learner.totalChapters || 1;
                        const pct = Math.min(
                          100,
                          Math.round((learner.completedChapters / effectiveTotal) * 100)
                        );
                        const isCompleted = pct === 100;

                        return (
                          <tr key={learner.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {(() => {
                                  const learnerAvatar = resolveUserAvatar(
                                    learner.name,
                                    learner.id
                                  );
                                  if (learnerAvatar) {
                                    return (
                                      <img
                                        src={learnerAvatar}
                                        alt={learner.name}
                                        className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                                      />
                                    );
                                  }
                                  return (
                                    <span
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                      style={{
                                        backgroundColor: learner.avatarBg,
                                        color: learner.avatarText,
                                      }}
                                    >
                                      {learner.initials}
                                    </span>
                                  );
                                })()}
                                <div>
                                  <p className="font-bold text-[#121215]">{learner.name}</p>
                                  <p className="text-[10px] text-[#9CA3AF]">
                                    Ditugaskan: {learner.assignedDate || "Today"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block rounded bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold text-[#5E5E5E]">
                                {learner.roleBadge}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1 min-w-[140px] max-w-[200px]">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-medium text-[#5E5E5E]">
                                    {learner.completedChapters} dari {effectiveTotal} bab
                                  </span>
                                  <span className="font-bold text-[#121215]">{pct}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: isCompleted ? "#10B981" : "#4F39F6",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                                  <CheckCircle2 size={11} />
                                  Selesai
                                </span>
                              ) : pct > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                                  <Clock size={11} />
                                  In Progress
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[10px] font-medium text-[#5E5E5E]">
                                  Belum Mulai
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAssigneeAction(learner, "remind")}
                                  className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] px-2.5 py-1 text-xs font-semibold text-[#121215] transition-colors cursor-pointer"
                                >
                                  Kirim Reminder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAssigneeAction(learner, "reset")}
                                  className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] hover:bg-[#F8F9FB] px-2 py-1 text-xs font-semibold text-[#5E5E5E] transition-colors cursor-pointer"
                                  title="Reset progres ke 0"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Health & Feedback Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EF4444]/10 text-[#EF4444]">
                      <AlertCircle size={13} />
                    </span>
                    <h4 className="text-xs font-bold text-[#121215]">Laporan Kendala Murid</h4>
                  </div>
                  <p className="text-[11px] text-[#5E5E5E]">
                    {courseIssues.filter((i) => i.status === "Open").length} kendala terbuka butuh tindak lanjut.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("issues")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer shrink-0"
                >
                  <span>Lihat Laporan</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                      <MessageSquare size={13} />
                    </span>
                    <h4 className="text-xs font-bold text-[#121215]">Forum Diskusi Chapter</h4>
                  </div>
                  <p className="text-[11px] text-[#5E5E5E]">
                    {courseThreads.length} utas pertanyaan dari murid di ruang belajar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("discussion")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer shrink-0"
                >
                  <span>Buka Diskusi</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: DISCUSSION */}
        {activeTab === "discussion" && (
          <section aria-label="Chapter Discussions" className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="search"
                  value={discussionSearch}
                  onChange={(e) => setDiscussionSearch(e.target.value)}
                  placeholder="Search learner questions or chapters..."
                  className="w-full rounded-lg bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none shadow-[0_1px_2px_rgba(16,15,17,0.03)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter discussions by chapter"
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  className="rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
                >
                  <option>All Chapters</option>
                  <option>Chapter 1</option>
                  <option>Chapter 2</option>
                  <option>Chapter 3</option>
                </select>
              </div>
            </div>

            <div className="space-y-3.5">
              {filteredThreads.map((thread) => {
                const isExpanded = expandedThreadId === thread.id;

                return (
                  <article
                    key={thread.id}
                    className={`rounded-xl bg-[#FFFFFF] border transition-all shadow-[0_2px_8px_rgba(16,15,17,0.04)] ${
                      isExpanded
                        ? "border-[#4F39F6]/50"
                        : "border-[#EAECEF] hover:border-[#D1D5DB]"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedThreadId(isExpanded ? null : thread.id)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedThreadId(isExpanded ? null : thread.id);
                        }
                      }}
                      className="p-5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#4F46E5]">
                          {thread.chapterBadge}
                        </span>
                        <span className="text-[11px] font-medium text-[#9CA3AF]">
                          {thread.lastReplyLabel}
                        </span>
                      </div>

                      <h2 className="text-sm font-bold text-[#121215] mb-1.5">
                        {thread.title}
                      </h2>
                      <p className="text-xs text-[#5E5E5E] leading-relaxed">
                        {thread.excerpt}
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#EAECEF] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex -space-x-1.5">
                            {thread.participants.map((p, idx) => (
                              <span
                                key={`${thread.id}-p-${idx}`}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#FFFFFF] text-[10px] font-bold"
                                style={{
                                  backgroundColor: p.bg,
                                  color: p.text,
                                }}
                              >
                                {p.initials}
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] font-medium text-[#5E5E5E]">
                            Active participants
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-[#5E5E5E]">
                          <span className="inline-flex items-center gap-1 text-[#4F39F6] font-semibold">
                            <MessageSquare size={13} />
                            {thread.repliesCount} replies
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye size={13} className="text-[#9CA3AF]" />
                            {thread.viewsCount} views
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#EAECEF] bg-[#F8F9FB]/70 px-5 py-4 rounded-b-xl space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                          Discussion Replies ({thread.replies.length})
                        </p>

                        <div className="space-y-2.5">
                          {thread.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="rounded-lg bg-[#FFFFFF] p-3.5 border border-[#EAECEF]"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const repAvatar = resolveUserAvatar(
                                      reply.authorName
                                    );
                                    if (repAvatar) {
                                      return (
                                        <img
                                          src={repAvatar}
                                          alt={reply.authorName}
                                          className="h-6 w-6 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                                        />
                                      );
                                    }
                                    return (
                                      <span
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                                        style={{
                                          backgroundColor: reply.avatarBg,
                                          color: reply.avatarText,
                                        }}
                                      >
                                        {reply.authorInitials}
                                      </span>
                                    );
                                  })()}
                                  <span className="text-xs font-semibold text-[#121215]">
                                    {reply.authorName}
                                  </span>
                                  <span className="rounded bg-[#F8F9FB] border border-[#EAECEF] px-1.5 py-0.2 text-[10px] font-medium text-[#5E5E5E]">
                                    {reply.authorRole}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#9CA3AF]">
                                  {reply.timestamp}
                                </span>
                              </div>
                              <p className="text-xs text-[#121215] leading-relaxed pl-8">
                                {reply.message}
                              </p>
                            </div>
                          ))}
                        </div>

                        <form
                          onSubmit={(e) => handleAddReply(thread.id, e)}
                          className="pt-2 flex items-center gap-2"
                        >
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDE68A] text-[#92400E] text-[10px] font-bold">
                            DP
                          </span>
                          <input
                            type="text"
                            value={replyDrafts[thread.id] ?? ""}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [thread.id]: e.target.value,
                              }))
                            }
                            placeholder="Write a mentor reply to this thread..."
                            className="flex-1 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                          >
                            <Send size={12} />
                            <span>Reply</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 1: DETAILS CONTENT */}
        {activeTab === "detail" && (
          <section
            aria-label="Detail Content Preview"
            className="pt-6 space-y-4"
          >
            <div className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4F39F6]">
                    Curriculum Preview
                  </span>
                  <h2 className="text-base font-bold text-[#121215] mt-1">
                    {item.title} — {totalChaptersCount} Structured Chapter
                    {totalChaptersCount !== 1 ? "s" : ""}
                  </h2>
                  <p className="text-xs text-[#5E5E5E] mt-1 leading-relaxed max-w-2xl">
                    {item.description || "Belum ada deskripsi kursus."}
                  </p>
                </div>

                {onEditContent && (
                  <button
                    type="button"
                    onClick={() => onEditContent(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer self-start shrink-0"
                  >
                    <Edit3 size={13} />
                    <span>Edit Content</span>
                  </button>
                )}
              </div>

              {totalChaptersCount === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F9FB] p-8 text-center space-y-2">
                  <BookOpen size={28} className="mx-auto text-[#9CA3AF]" />
                  <h3 className="text-sm font-bold text-[#121215]">
                    Belum Ada Materi / Chapter
                  </h3>
                  <p className="text-xs text-[#5E5E5E] max-w-md mx-auto">
                    Kursus ini belum memiliki silabus atau chapter yang diterbitkan. Klik tombol di bawah untuk mulai menyusun materi di editor.
                  </p>
                  {onEditContent && (
                    <button
                      type="button"
                      onClick={() => onEditContent(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#4F39F6] border border-[#EAECEF] hover:bg-[#F8F9FB] shadow-xs cursor-pointer mt-2"
                    >
                      <Plus size={13} />
                      <span>Buka Editor Kursus</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#EAECEF] border border-[#EAECEF] rounded-xl overflow-hidden">
                  {flatChapters.map((chapter, idx) => {
                    const firstParagraph =
                      chapter.contentParagraphs &&
                      chapter.contentParagraphs.length > 0
                        ? chapter.contentParagraphs[0]
                        : chapter.calloutTip || "";

                    return (
                      <div
                        key={chapter.id || idx}
                        className="p-4 bg-[#FFFFFF] hover:bg-[#F8F9FB]/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {chapter.sectionTitle && (
                              <span className="text-[11px] font-semibold text-[#9CA3AF] shrink-0">
                                {chapter.sectionTitle} •
                              </span>
                            )}
                            <span className="text-xs font-bold text-[#121215] truncate">
                              Chapter {idx + 1}: {chapter.title}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-[#5E5E5E] shrink-0 bg-[#F8F9FB] px-2 py-0.5 rounded border border-[#EAECEF]">
                            {chapter.duration || "10 mins read"}{" "}
                            {chapter.points ? `• ${chapter.points} pts` : ""}
                          </span>
                        </div>
                        {firstParagraph && (
                          <p className="mt-1.5 text-xs text-[#5E5E5E] line-clamp-2">
                            {firstParagraph}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: REPORT ISSUES (Bar Chart Breakdown + All type issue filter + Send a Message — matches Image 4 Top-Left) */}
        {activeTab === "issues" && (
          <section
            aria-label="Learner Reported Issues"
            className="pt-6 space-y-5"
          >
            {/* Issue Categories Horizontal Bar Breakdown Card (matches Image 4 Top-Left) */}
            <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#121215]">
                    Report Issue ({courseIssues.length} Total Report
                    {courseIssues.length !== 1 ? "s" : ""})
                  </h2>
                  <p className="text-xs text-[#5E5E5E]">
                    Breakdown of content feedback submitted by learners across
                    chapters
                  </p>
                </div>

                {/* All type issue ⌄ Filter Dropdown (matches Image 4 Top-Left) */}
                <select
                  aria-label="Filter by issue type"
                  value={issueTypeFilter}
                  onChange={(e) => setIssueTypeFilter(e.target.value)}
                  className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6] px-3 py-1.5 text-xs font-semibold text-[#121215] focus:outline-none cursor-pointer"
                >
                  <option value="All type issue">All type issue</option>
                  {ISSUE_CATEGORIES_META.map((cat) => (
                    <option key={cat.label} value={cat.label}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                {ISSUE_CATEGORIES_META.map((cat, idx) => {
                  const catCount =
                    courseIssues.length === 0
                      ? 0
                      : courseIssues.filter((iss) =>
                          iss.category
                            ? iss.category === cat.label
                            : idx === 0
                        ).length;
                  const catPct =
                    courseIssues.length > 0
                      ? Math.round((catCount / courseIssues.length) * 100)
                      : 0;
                  return (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#121215]">
                          {cat.label}
                        </span>
                        <span className="font-bold text-[#5E5E5E] tabular-nums">
                          {catCount} report{catCount !== 1 ? "s" : ""} ({catPct}
                          %)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F8F9FB] overflow-hidden border border-[#EAECEF]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${catPct}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reported Issue Cards with [Send a Message] & [Mark Resolved] (ref_08) */}
            <div className="space-y-3">
              {(() => {
                const visibleIssues = courseIssues.filter(
                  (iss) =>
                    issueTypeFilter === "All type issue" ||
                    (iss.category || "Content Outdated") === issueTypeFilter
                );
                if (visibleIssues.length === 0) {
                  return (
                    <div className="rounded-xl bg-[#FFFFFF] p-8 border border-dashed border-[#EAECEF] text-center space-y-1.5">
                      <p className="text-xs font-bold text-[#121215]">
                        Belum Ada Laporan Kendala (0 Issues)
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        Laporan kendala yang dikirimkan oleh murid dari ruang belajar akan langsung tampil di sini secara real-time.
                      </p>
                    </div>
                  );
                }
                return visibleIssues.map((iss) => {
                  const isOpen = iss.status === "Open";
                  return (
                    <article
                      key={iss.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                              isOpen
                                ? "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                                : "bg-[#10B981]/10 border-[#10B981]/20 text-[#059669]"
                            }`}
                          >
                            {isOpen ? (
                              <AlertCircle size={11} />
                            ) : (
                              <CheckCircle2 size={11} />
                            )}
                            {iss.status}
                          </span>
                          <span className="rounded bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] font-semibold text-[#4F39F6]">
                            {iss.category || "Content Outdated"}
                          </span>
                          <span className="text-xs font-medium text-[#5E5E5E]">
                            {iss.chapter}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-[#121215]">
                          {iss.title}
                        </h3>
                        <p className="text-[11px] text-[#9CA3AF]">
                          Reported by{" "}
                          <strong className="text-[#5E5E5E]">
                            {iss.reporter}
                          </strong>{" "}
                          • {iss.reportedAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMessageReporterTarget(iss.reporter)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span>Send a Message</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleIssueStatus(iss.id)}
                          className="rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
                        >
                          {isOpen ? "Mark Resolved" : "Reopen Issue"}
                        </button>
                      </div>
                    </article>
                  );
                });
              })()}
            </div>
          </section>
        )}
      </div>

      {/* Right Docked Panel (320px width - Statistics, Assignees & Version History Card — matches Image 4 Top-Left & Bottom-Left) */}
      <aside
        aria-label="Statistics, Assignees and Version History Panel"
        className="w-full lg:w-[320px] shrink-0 bg-[#FFFFFF] border-t lg:border-t-0 lg:border-l border-[#EAECEF] flex flex-col justify-between lg:min-h-[calc(100vh-2.5rem)]"
      >
        <div className="p-4 flex-1 overflow-y-auto">
          <div
            role="tablist"
            aria-label="Assignees and Version tabs"
            className="grid grid-cols-2 gap-1 rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF] mb-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={rightTab === "assignees"}
              onClick={() => setRightTab("assignees")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                rightTab === "assignees"
                  ? "bg-[#FFFFFF] text-[#121215] shadow-2xs border border-[#EAECEF]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <Users size={12} />
              <span>Assignees ({assignees.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={rightTab === "version"}
              onClick={() => setRightTab("version")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                rightTab === "version"
                  ? "bg-[#FFFFFF] text-[#121215] shadow-2xs border border-[#EAECEF]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <Clock size={12} />
              <span>Version</span>
            </button>
          </div>

          {rightTab === "assignees" ? (
            <div className="space-y-3">
              {/* View All Assignees Monitoring Modal Trigger (ref_09) */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#5E5E5E]">
                  Assigned Learners
                </span>
                <button
                  type="button"
                  onClick={() => setAllAssigneesModalOpen(true)}
                  className="text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer"
                >
                  View All Assignees →
                </button>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                  />
                  <input
                    type="search"
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    placeholder="Search assignees..."
                    aria-label="Search assignees"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-8 pr-2.5 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: "all", label: `All (${assignees.length})` },
                      { id: "in-progress", label: "In Progress" },
                      { id: "completed", label: "Completed" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAssigneeProgressFilter(f.id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        assigneeProgressFilter === f.id
                          ? "bg-[#4F39F6]/10 text-[#4F39F6] font-semibold"
                          : "text-[#5E5E5E] hover:bg-[#F8F9FB]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {filteredAssignees.map((learner) => {
                  const effectiveTotalChapters =
                    totalChaptersCount > 0
                      ? totalChaptersCount
                      : learner.totalChapters || 1;
                  const pct = Math.min(
                    100,
                    Math.round(
                      (learner.completedChapters / effectiveTotalChapters) * 100
                    )
                  );
                  const menuOpen = openAssigneeMenuId === learner.id;

                  return (
                    <div
                      key={learner.id}
                      className="relative rounded-xl bg-[#F8F9FB]/60 p-3 border border-[#EAECEF] hover:bg-[#F8F9FB] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {(() => {
                            const learnerAvatar = resolveUserAvatar(
                              learner.name,
                              learner.id
                            );
                            if (learnerAvatar) {
                              return (
                                <img
                                  src={learnerAvatar}
                                  alt={learner.name}
                                  className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                                />
                              );
                            }
                            return (
                              <span
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                style={{
                                  backgroundColor: learner.avatarBg,
                                  color: learner.avatarText,
                                }}
                              >
                                {learner.initials}
                              </span>
                            );
                          })()}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#121215] truncate">
                              {learner.name}
                            </p>
                            <span className="inline-block rounded bg-[#FFFFFF] border border-[#EAECEF] px-1.5 py-0.2 text-[10px] font-medium text-[#5E5E5E] mt-0.5">
                              {learner.roleBadge}
                            </span>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAssigneeMenuId(
                                menuOpen ? null : learner.id
                              )
                            }
                            aria-label={`Manage assignee ${learner.name}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {menuOpen && (
                            <div
                              role="menu"
                              className="absolute right-0 top-7 w-36 rounded-xl bg-[#FFFFFF] p-1 border border-[#EAECEF] shadow-lg z-30"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssigneeAction(learner, "remind")
                                }
                                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                              >
                                Send Reminder
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssigneeAction(learner, "reset")
                                }
                                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                              >
                                Reset Progress
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssigneeAction(learner, "unassign")
                                }
                                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                              >
                                Unassign
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-medium text-[#5E5E5E]">
                            {learner.completedChapters} of{" "}
                            {effectiveTotalChapters} Chapter
                            {effectiveTotalChapters !== 1 ? "s" : ""}
                          </span>
                          <span className="font-semibold text-[#121215] tabular-nums">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct === 100 ? "#10B981" : "#4F39F6",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-[#5E5E5E]">
                Chronological revision log for{" "}
                <strong className="text-[#121215]">{item.title}</strong>
              </p>

              <div className="space-y-2.5">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`rounded-xl p-3 border transition-all ${
                      ver.isCurrent
                        ? "bg-[#4F39F6]/5 border-[#4F39F6]/30"
                        : "bg-[#F8F9FB]/70 border-[#EAECEF]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#121215]">
                          {ver.label}
                        </p>
                        <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                          By {ver.author}
                        </p>
                      </div>

                      {ver.isCurrent ? (
                        <span className="shrink-0 rounded-md bg-[#4F39F6] px-2 py-0.5 text-[10px] font-semibold text-white">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(ver)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-[#FFFFFF] px-2 py-1 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-[#5E5E5E] leading-relaxed">
                      {ver.notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sticky Actions */}
        <div className="sticky bottom-0 bg-[#FFFFFF] p-4 border-t border-[#EAECEF] space-y-2">
          <button
            type="button"
            onClick={() => setAllAssigneesModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:border-[#4F39F6] px-4 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
          >
            <Users size={13} className="text-[#4F39F6]" />
            <span>Monitor All Assignees ({assignees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAssignModal(item)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Assign Learners</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("detail");
                onShowToast(`Previewing "${item.title}".`);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              <Play size={12} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onEditContent) {
                  onEditContent(item);
                } else {
                  onShowToast(`Opened Studio Editor for "${item.title}".`);
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              <Edit3 size={12} />
              <span>Edit Content</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =================================================================
          ALL ASSIGNEES MONITORING MODAL + FLOATING BULK BAR (ref_09)
         ================================================================= */}
      <ModalDialog
        open={allAssigneesModalOpen}
        onClose={() => setAllAssigneesModalOpen(false)}
        titleId="all-assignees-modal-title"
        title="All Assignees"
        subtitle={`Monitor learner completion, edit due dates, and send reminders for "${item.title}"`}
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4 relative pb-14">
          {/* Top Controls: Search, Add Filter, Export CSV, Enroll Learner */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1 max-w-xs">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="search"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search learner..."
                  className="w-full rounded-lg bg-[#F8F9FB] pl-8 pr-3 py-1.5 text-xs text-[#121215] border border-[#EAECEF]"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  onShowToast("Filtered assignees by active status.")
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215] cursor-pointer"
              >
                <Filter size={12} />
                <span>Add Filter</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onShowToast("Exported All Assignees report to CSV.")
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <Download size={12} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllAssigneesModalOpen(false);
                  onOpenAssignModal(item);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                <Plus size={12} />
                <span>Enroll Learner</span>
              </button>
            </div>
          </div>

          {/* Assignees Table */}
          <div className="overflow-x-auto rounded-xl border border-[#EAECEF]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#EAECEF] text-[11px] font-semibold text-[#5E5E5E]">
                  <th className="py-2.5 px-3 w-9">
                    <input
                      type="checkbox"
                      checked={
                        selectedAssigneeIds.length ===
                          modalFilteredAssignees.length &&
                        modalFilteredAssignees.length > 0
                      }
                      onChange={(e) =>
                        setSelectedAssigneeIds(
                          e.target.checked
                            ? modalFilteredAssignees.map((a) => a.id)
                            : []
                        )
                      }
                      className="h-3.5 w-3.5 accent-[#4F39F6] rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Full name</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF] text-xs">
                {modalFilteredAssignees.map((learner, idx) => {
                  const effectiveTotalChapters =
                    totalChaptersCount > 0
                      ? totalChaptersCount
                      : learner.totalChapters || 1;
                  const pct = Math.min(
                    100,
                    Math.round(
                      (learner.completedChapters / effectiveTotalChapters) * 100
                    )
                  );
                  const checked = selectedAssigneeIds.includes(learner.id);
                  const dueDateStr =
                    customDueDates[learner.id] ||
                    (idx % 2 === 0 ? "28 Oct 2026" : "04 Nov 2026");

                  return (
                    <tr
                      key={learner.id}
                      className={
                        checked ? "bg-[#4F39F6]/5" : "hover:bg-[#F8F9FB]"
                      }
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectAssignee(learner.id)}
                          className="h-3.5 w-3.5 accent-[#4F39F6] rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const learnerAvatar = resolveUserAvatar(
                              learner.name,
                              learner.id
                            );
                            if (learnerAvatar) {
                              return (
                                <img
                                  src={learnerAvatar}
                                  alt={learner.name}
                                  className="h-7 w-7 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                                />
                              );
                            }
                            return (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                                style={{
                                  backgroundColor: learner.avatarBg,
                                  color: learner.avatarText,
                                }}
                              >
                                {learner.initials}
                              </span>
                            );
                          })()}
                          <div>
                            <p className="font-semibold text-[#121215]">
                              {learner.name}
                            </p>
                            <p className="text-[10px] text-[#9CA3AF]">
                              {learner.roleBadge}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#5E5E5E]">
                        12 Oct 2026
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#121215]">
                        {dueDateStr}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#EAECEF] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  pct === 100 ? "#10B981" : "#4F39F6",
                              }}
                            />
                          </div>
                          <span className="font-bold tabular-nums text-[#121215]">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssigneeIds([learner.id]);
                            setSendReminderModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] hover:border-[#4F39F6] hover:text-[#4F39F6] px-2.5 py-1 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                        >
                          <Bell size={11} />
                          <span>Send Reminder</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Edit Due Date Calendar & Time Picker Popover (ref_09) */}
          {dueDatePopoverOpen && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-80 rounded-2xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-2xl z-30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#121215]">
                  Edit Due Date ({selectedAssigneeIds.length} learners)
                </h4>
                <button
                  type="button"
                  onClick={() => setDueDatePopoverOpen(false)}
                  className="text-[#9CA3AF] hover:text-[#121215] cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5E5E5E] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={bulkDueDateInput}
                    onChange={(e) => setBulkDueDateInput(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5E5E5E] mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={bulkDueTimeInput}
                    onChange={(e) => setBulkDueTimeInput(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDueDatePopoverOpen(false)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkDueDate}
                  className="rounded-lg bg-[#4F39F6] px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                >
                  Apply Date
                </button>
              </div>
            </div>
          )}

          {/* Floating Dark Bulk Action Bar when learners are checked (ref_09) */}
          {selectedAssigneeIds.length > 0 && (
            <div className="fixed sm:absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl bg-[#121215] px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
              <span className="inline-flex items-center gap-1.5 text-[#A5B4FC]">
                <Check size={13} />
                {selectedAssigneeIds.length} learners
              </span>
              <span className="h-4 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => setDueDatePopoverOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 hover:text-[#A5B4FC] transition-colors cursor-pointer"
              >
                <Calendar size={13} />
                <span>Edit Due Date</span>
              </button>
              <span className="h-4 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => setSendReminderModalOpen(true)}
                className="inline-flex items-center gap-1.5 hover:text-[#A5B4FC] transition-colors cursor-pointer"
              >
                <Bell size={13} />
                <span>Send Reminder</span>
              </button>
              <span className="h-4 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => {
                  selectedAssigneeIds.forEach((id) => {
                    const l = (assignees || []).find((a) => a.id === id);
                    unassignLearnerFromContent(liveExplorerItem.title, {
                      id,
                      name: l?.name,
                    });
                    manageAssigneeAction(id, "unassign");
                  });
                  setSelectedAssigneeIds([]);
                  onShowToast(
                    `Akses ${selectedAssigneeIds.length} siswa ke "${item.title}" berhasil dicabut.`
                  );
                  setSelectedAssigneeIds([]);
                }}
                className="inline-flex items-center gap-1.5 text-[#FCA5A5] hover:text-[#EF4444] transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* =================================================================
          SEND REMINDER TEMPLATE MODAL (ref_09)
         ================================================================= */}
      <ModalDialog
        open={sendReminderModalOpen}
        onClose={() => setSendReminderModalOpen(false)}
        titleId="send-reminder-modal-title"
        title="Send Reminder"
        subtitle="Choose a reminder message template to notify selected learners"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          {/* Recipient Chips */}
          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1.5">
              Recipients ({selectedAssigneeIds.length})
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#F8F9FB] p-2.5 border border-[#EAECEF]">
              {assignees
                .filter((a) => selectedAssigneeIds.includes(a.id))
                .map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#FFFFFF] px-2.5 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  >
                    <span>{a.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAssignee(a.id)}
                      className="text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
            </div>
          </div>

          {/* Selectable Message Templates: "The course time is running out" vs "Overdue course" */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#121215]">
              Select Reminder Template
            </label>
            {REMINDER_TEMPLATES.map((tpl) => {
              const active = selectedReminderTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedReminderTemplate(tpl.id)}
                  className={`w-full rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                    active
                      ? "border-[#4F39F6] bg-[#4F39F6]/5 ring-2 ring-[#4F39F6]/20"
                      : "border-[#EAECEF] bg-[#FFFFFF] hover:bg-[#F8F9FB]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#121215]">
                      {tpl.title}
                    </span>
                    <span className="rounded bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold text-[#4F39F6]">
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                    {tpl.body}
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1">
              Additional Mentor Note (Optional)
            </label>
            <textarea
              rows={2}
              value={customReminderNote}
              onChange={(e) => setCustomReminderNote(e.target.value)}
              placeholder="Add a personalized note..."
              className="w-full rounded-lg bg-[#F8F9FB] p-2.5 text-xs text-[#121215] border border-[#EAECEF]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setSendReminderModalOpen(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendBulkReminder}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <Send size={12} />
              <span>Send Reminder</span>
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Send a Message to Issue Reporter Modal */}
      <ModalDialog
        open={Boolean(messageReporterTarget)}
        onClose={() => setMessageReporterTarget(null)}
        titleId="message-reporter-modal-title"
        title={`Send a Message to ${messageReporterTarget}`}
        subtitle="Follow up directly with the learner regarding their reported content issue"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            value={reporterMessageText}
            onChange={(e) => setReporterMessageText(e.target.value)}
            placeholder={`Hi ${messageReporterTarget}, thank you for flagging this chapter. We've updated the visual diagram...`}
            className="w-full rounded-lg bg-[#F8F9FB] p-3 text-xs text-[#121215] border border-[#EAECEF]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMessageReporterTarget(null)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onShowToast(
                  `Message sent to ${messageReporterTarget} via Learner Notification inbox.`
                );
                setReporterMessageText("");
                setMessageReporterTarget(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <Send size={12} />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
