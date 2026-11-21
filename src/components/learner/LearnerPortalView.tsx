"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Star,
  Clock,
  Award,
  Download,
  ExternalLink,
  Library,
  Heart,
  CheckCircle2,
  Play,
  Zap,
  Lock,
  LayoutGrid,
  List as ListIcon,
  FileText,
  Sparkles,
  Flame,
  Trophy,
  X,
  Gift,
  Settings,
  KeyRound,
  Folder,
  FolderOpen,
  Minus,
  Plus,
  ArrowLeft,
  Search,
  ArrowUpDown,
  LogOut,
  BookOpen,
} from "lucide-react";
import {
  LearnerTopNavbar,
  type LearnerNavTabId,
} from "@/components/learner/LearnerTopNavbar";
import { LearnerCourseOverview } from "@/components/learner/LearnerCourseOverview";
import { ActiveLearningClassroom } from "@/components/learner/ActiveLearningClassroom";
import { LearnerQuizRunner } from "@/components/learner/LearnerQuizRunner";
import { UserProfileScreen } from "@/components/profile/UserProfileScreen";
import {
  type LearnerAssignedItem,
  type CourseChapterItem,
} from "@/lib/phase5-data";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { ThemeSwitchDockButton } from "@/components/theme/ThemeCustomizerModal";
import {
  useRuangSosmedStore,
  DEFAULT_LEARNER_PRO_CONFIG,
  evaluateChapterAccess,
  evaluateCourseCardAccess,
  computeTrial3DaysPriceIdr,
  computeTrial7DaysPriceIdr,
  formatIdr,
  getNormalizedProPackages,
} from "@/context/RuangSosmedStore";
import {
  UnlockModuleModal,
  type UnlockModuleTarget,
} from "@/components/learner/UnlockModuleModal";
import { ModalDialog } from "@/components/ui/ModalDialog";
import {
  OfficialCertificateModal,
  type LearnerCourseCertificateItem,
} from "@/components/certificate/OfficialCertificateModal";
import { LearnerRewardsModal } from "@/components/rewards/LearnerRewardsModal";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";
import {
  WikiArticleCard,
  WikiArticleReader,
  estimateWikiReadTime,
} from "@/components/wiki/WikiArticleReader";
import { LearnerHomeDashboard } from "@/components/learner/LearnerHomeDashboard";
import {
  EMPTY_RUMI_XP_STATE,
  RUMI_LEVEL_TIERS,
  RUMI_XP_UPDATED_EVENT,
  awardRumiXpEvent,
  claimDailyLoginXp,
  loadRumiXpState,
  resolveRumiLevelInfo,
  resolveXpUserKey,
  type RumiXpProfileState,
} from "@/lib/rumi-xp";
import {
  RumiFloatingAssistant,
  type RumiQuickAction,
} from "@/components/assistant/RumiFloatingAssistant";
import type { RumiPageContextId } from "@/lib/rumi-assistant-guide";
import { getSubscriptionStatusInfo } from "@/lib/subscription-utils";

interface LearnerPortalViewProps {
  currentUser?: AuthenticatedUser | null;
  proExpiresAt?: string | null;
  onOpenUpgradeModal?: () => void;
  onStartUpgradePayment?: (opts?: {
    packageId?: string;
    billingCycle?: "3d_trial" | "7d_trial" | "30d";
  }) => void;
  onShowToast: (msg: string) => void;
  onSwitchToAdmin?: () => void;
  onLogout?: () => void;
}

type LearnerScreenState =
  | { screen: "dashboard" }
  | { screen: "course-overview"; courseTitle: string }
  | { screen: "classroom"; courseTitle: string; chapterId: string }
  | { screen: "quiz-runner"; quizTitle: string }
  | { screen: "wiki-reader"; wikiIdOrTitle: string };

const ACTIVE_FEATURE_UPDATE = {
  id: "discussion_voicenote_v1",
  badge: "New",
  message: "Feature Discussion & Voice Note Q&A is now live inside every Course Chapter!",
  actionLabel: "Try in Classroom →",
};

const LEARNER_MAC_FOLDER_COLORS: Record<
  string,
  { backGrad: [string, string]; frontGrad: [string, string, string]; shadow: string }
> = {
  blue: {
    backGrad: ["#4A9BF5", "#1972DE"],
    frontGrad: ["#67B6FF", "#3F9BFF", "#0D68DF"],
    shadow: "#0B4086",
  },
  purple: {
    backGrad: ["#A855F7", "#7E22CE"],
    frontGrad: ["#C084FC", "#9333EA", "#6B21A8"],
    shadow: "#581C87",
  },
  pink: {
    backGrad: ["#F472B6", "#DB2777"],
    frontGrad: ["#F9A8D4", "#EC4899", "#BE185D"],
    shadow: "#9D174D",
  },
  red: {
    backGrad: ["#F87171", "#DC2626"],
    frontGrad: ["#FCA5A5", "#EF4444", "#B91C1C"],
    shadow: "#991B1B",
  },
  orange: {
    backGrad: ["#FB923C", "#EA580C"],
    frontGrad: ["#FDBA74", "#F97316", "#C2410C"],
    shadow: "#9A3412",
  },
  yellow: {
    backGrad: ["#FBBF24", "#D97706"],
    frontGrad: ["#FDE047", "#EAB308", "#B45309"],
    shadow: "#854D0E",
  },
  green: {
    backGrad: ["#34D399", "#059669"],
    frontGrad: ["#6EE7B7", "#10B981", "#047857"],
    shadow: "#065F46",
  },
  graphite: {
    backGrad: ["#94A3B8", "#475569"],
    frontGrad: ["#CBD5E1", "#64748B", "#334155"],
    shadow: "#1E293B",
  },
};

function resolveLearnerFolderColor(input?: string): string {
  if (!input) return "blue";
  const low = input.toLowerCase().trim();
  if (LEARNER_MAC_FOLDER_COLORS[low]) return low;
  if (low.includes("purple") || low.includes("9333ea") || low.includes("4f39f6"))
    return "purple";
  if (low.includes("pink") || low.includes("ec4899")) return "pink";
  if (low.includes("red") || low.includes("ef4444")) return "red";
  if (low.includes("orange") || low.includes("f97316")) return "orange";
  if (low.includes("yellow") || low.includes("eab308")) return "yellow";
  if (low.includes("green") || low.includes("10b981") || low.includes("059669"))
    return "green";
  if (low.includes("graphite") || low.includes("gray") || low.includes("64748b"))
    return "graphite";
  return "blue";
}

function LearnerMacFolderIcon({
  color = "blue",
  className = "w-16 h-14",
  style,
}: {
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const colorKey = resolveLearnerFolderColor(color);
  const palette =
    LEARNER_MAC_FOLDER_COLORS[colorKey] || LEARNER_MAC_FOLDER_COLORS.blue;
  const backId = `learnerFinderBack-${colorKey}`;
  const frontId = `learnerFinderFront-${colorKey}`;
  const shadowId = `learnerFinderShadow-${colorKey}`;

  return (
    <svg
      viewBox="0 0 96 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={backId}
          x1="48"
          y1="6"
          x2="48"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.backGrad[0]} />
          <stop offset="100%" stopColor={palette.backGrad[1]} />
        </linearGradient>
        <linearGradient
          id={frontId}
          x1="48"
          y1="18"
          x2="48"
          y2="74"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.frontGrad[0]} />
          <stop offset="14%" stopColor={palette.frontGrad[1]} />
          <stop offset="100%" stopColor={palette.frontGrad[2]} />
        </linearGradient>
        <linearGradient id="learnerFinderSheenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>
        <filter
          id={shadowId}
          x="-10%"
          y="-10%"
          width="120%"
          height="130%"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2.5"
            floodColor={palette.shadow}
            floodOpacity="0.32"
          />
        </filter>
      </defs>
      <path
        d="M8 14C8 9.58172 11.5817 6 16 6H34.5C38.0772 6 41.3411 8.24156 42.618 11.5708L44.882 17.4292C45.3076 18.539 46.3956 19.2857 47.588 19.2857H80C84.4183 19.2857 88 22.8674 88 27.2857V64C88 68.4183 84.4183 72 80 72H16C11.5817 72 8 68.4183 8 64V14Z"
        fill={`url(#${backId})`}
      />
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-2.5">
        <rect
          x="18"
          y="13"
          width="60"
          height="23"
          rx="3"
          fill="#E2E8F0"
          fillOpacity="0.9"
        />
        <rect
          x="14"
          y="17"
          width="68"
          height="24"
          rx="3"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
        <line
          x1="20"
          y1="22"
          x2="44"
          y2="22"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="27"
          x2="56"
          y2="27"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g className="origin-bottom transition-all duration-300 ease-out group-hover:scale-y-[0.84]">
        <path
          d="M5 26C5 21.5817 8.58172 18 13 18H83C87.4183 18 91 21.5817 91 26V66C91 70.4183 87.4183 74 83 74H13C8.58172 74 5 70.4183 5 66V26Z"
          fill={`url(#${frontId})`}
          filter={`url(#${shadowId})`}
        />
        <path
          d="M6.5 25.5C6.5 22.1863 9.18629 19.5 12.5 19.5H83.5C86.8137 19.5 89.5 22.1863 89.5 25.5V31C89.5 31 65 24 6.5 31V25.5Z"
          fill="url(#learnerFinderSheenGrad)"
        />
        <rect
          x="13"
          y="19"
          width="70"
          height="1"
          fill="#FFFFFF"
          fillOpacity="0.4"
        />
      </g>
    </svg>
  );
}

export function LearnerPortalView({
  currentUser,
  proExpiresAt,
  onOpenUpgradeModal,
  onStartUpgradePayment,
  onShowToast,
  onSwitchToAdmin,
  onLogout,
}: LearnerPortalViewProps) {
  const learnerDisplayName =
    currentUser?.name || currentUser?.username || "Learner";

  const {
    learnerPoints: totalPoints,
    learnerAssignedItems: rawAssignedItems,
    explorerItems,
    cohortProjects,
    courseSections,
    courseCurriculums,
    wikiResources,
    certificateUnlocked,
    learnerIsPro,
    learnerAccess,
    learnerHasUsedTrial,
    learnerProConfig,
    learnerPagesConfig,
    leaderboard,
    rewardsCatalog,
    claimedRewards,
    rsLessonNotes,
    rsLessonReviews,
    markLearnerChapterComplete,
    toggleLearnerItemFavorite,
    getCourseCurriculum,
    redeemFolderAccessCode,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const canWiki = learnerAccess.canWiki;
  const canNotesFavorites = learnerAccess.canNotesFavorites;
  const canDownloads = learnerAccess.canDownloads;
  const canCertificate = learnerAccess.canCertificate;
  const activeTierLabel =
    learnerAccess.activePackage?.name || (learnerIsPro ? "Pro" : "Free");

  const [folderCodeInput, setFolderCodeInput] = useState("");
  const [joinCodeModalOpen, setJoinCodeModalOpen] = useState(false);
  const [selectedFolderFilter, setSelectedFolderFilter] =
    useState<string>("All");
  const [selectedProjectFilter, setSelectedProjectFilter] =
    useState<string>(() => {
      if (typeof window !== "undefined") {
        try {
          return (
            window.localStorage.getItem(
              "ruang_sosmed_learner_project_filter_v1"
            ) || "All"
          );
        } catch {}
      }
      return "All";
    });
  const [activeLearnerFolder, setActiveLearnerFolder] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return (
          window.localStorage.getItem(
            "ruang_sosmed_learner_active_folder_v1"
          ) || null
        );
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_learner_project_filter_v1",
          selectedProjectFilter
        );
      } catch {}
    }
  }, [selectedProjectFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (activeLearnerFolder) {
          window.localStorage.setItem(
            "ruang_sosmed_learner_active_folder_v1",
            activeLearnerFolder
          );
        } else {
          window.localStorage.removeItem(
            "ruang_sosmed_learner_active_folder_v1"
          );
        }
      } catch {}
    }
  }, [activeLearnerFolder]);
  const [openingFolderName, setOpeningFolderName] = useState<string | null>(
    null
  );
  const [learnerCourseViewMode, setLearnerCourseViewMode] = useState<
    "grid" | "list"
  >("grid");
  const [learnerFolderSort, setLearnerFolderSort] = useState<
    "default" | "title" | "progress"
  >("default");
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [learnerFolderScale, setLearnerFolderScale] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = Number(
          window.localStorage.getItem("ruang_sosmed_learner_folder_scale_v1")
        );
        if (!Number.isNaN(saved) && saved >= 52 && saved <= 112) {
          return saved;
        }
      } catch {}
    }
    return 76;
  });
  const [unlockedFolderModal, setUnlockedFolderModal] = useState<{
    folderTitle: string;
    unlockedTitle?: string;
    unlockType?: "folder" | "content";
    courseCount: number;
    codeUsed: string;
  } | null>(null);

  const updateLearnerFolderScale = (next: number) => {
    const clamped = Math.min(140, Math.max(52, Math.round(next)));
    setLearnerFolderScale(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_learner_folder_scale_v1",
          String(clamped)
        );
      } catch {}
    }
  };

  const handleOpenLearnerFolder = (folderName: string) => {
    setFolderSearchQuery("");
    setOpeningFolderName(folderName);
    setTimeout(() => {
      setActiveLearnerFolder(folderName);
      setOpeningFolderName(null);
    }, 200);
  };

  const activeProCfg = {
    ...DEFAULT_LEARNER_PRO_CONFIG,
    ...(learnerProConfig || {}),
  };

  // Dynamic sync for Learner Profile (Photo & Name)
  const [learnerAvatar, setLearnerAvatar] = useState<string | null>(null);
  const [learnerProfileName, setLearnerProfileName] = useState<string | null>(null);

  // User context & role check
  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const userName = (learnerProfileName || currentUser?.name || "").toLowerCase().trim();
  const usernameLower = (currentUser?.username || "")
    .toLowerCase()
    .replace(/^@+/, "")
    .trim();

  // Get user assigned items from localStorage or store
  const userAssignedList = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      if (userEmail) {
        const raw = window.localStorage.getItem(`ruang_sosmed_user_assignments_${userEmail}`);
        if (raw) return JSON.parse(raw) as string[];
      }
      if (userName) {
        const raw = window.localStorage.getItem(`ruang_sosmed_user_assignments_${userName}`);
        if (raw) return JSON.parse(raw) as string[];
      }
    } catch {}
    return null;
  }, [userEmail, userName]);

  const matchesCurrentLearner = React.useCallback(
    (assignedListRaw: unknown) => {
      const assignedList = Array.isArray(assignedListRaw)
        ? assignedListRaw
        : [];
      if (assignedList.length === 0) return false;

      const nameParts = userName.split(" ").filter(Boolean);
      const userFirstLast =
        nameParts.length >= 3
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
          : "";

      const cohortKeys = new Set([
        "all learners",
        "batch oktober 2026",
        "ruang sosmed class",
        "creator growth lab",
      ]);

      return assignedList.some((learner) => {
        const l = String(learner || "").toLowerCase().trim();
        if (!l) return false;
        if (cohortKeys.has(l)) return true;
        if (userEmail && l === userEmail) return true;
        if (userName && l === userName) return true;
        if (userFirstLast && l === userFirstLast) return true;
        if (usernameLower && l === usernameLower) return true;
        return false;
      });
    },
    [userEmail, userName, usernameLower]
  );

  const sharedAllProjectKeys = React.useMemo(
    () =>
      new Set(
        (cohortProjects || [])
          .filter((p) => p.shareWithAllLearners)
          .map((p) => p.name.trim().toLowerCase())
          .filter(Boolean)
      ),
    [cohortProjects]
  );

  const isInSharedAllProject = React.useCallback(
    (cohort?: string | null) =>
      Boolean(cohort && sharedAllProjectKeys.has(cohort.trim().toLowerCase())),
    [sharedAllProjectKeys]
  );

  const assignedFolderItems = React.useMemo(
    () =>
      explorerItems.filter(
        (e) =>
          e.type === "Folder" &&
          !e.isArchived &&
          (matchesCurrentLearner(e.assignedLearners) ||
            isInSharedAllProject(e.cohort))
      ),
    [explorerItems, matchesCurrentLearner, isInSharedAllProject]
  );

  const assignedFolderNames = React.useMemo(
    () =>
      new Set(
        assignedFolderItems
          .map((f) => f.title?.trim().toLowerCase())
          .filter(Boolean) as string[]
      ),
    [assignedFolderItems]
  );

  const showWikiPage = learnerPagesConfig?.showWikiPage ?? true;
  const showFavoritesPage = learnerPagesConfig?.showFavoritesPage ?? true;

  // Pastikan daftar materi di Learner Portal menampilkan materi yang di-assign oleh Admin
  // (baik di-assign langsung, via Folder Series, maupun Project bertipe "Bagikan ke Semua Member")
  const assignedItems: LearnerAssignedItem[] = React.useMemo(() => {
    const validExplorer = explorerItems.filter(
      (e) =>
        e.type !== "Folder" &&
        !e.isArchived &&
        (showWikiPage || e.type !== "Wiki")
    );
    if (validExplorer.length === 0) return [];

    const filteredExplorer = validExplorer.filter((exp) => {
      if (matchesCurrentLearner(exp.assignedLearners)) {
        return true;
      }
      if (isInSharedAllProject(exp.cohort)) {
        return true;
      }
      const folderKey = (exp.folderName || "").trim().toLowerCase();
      return Boolean(folderKey && assignedFolderNames.has(folderKey));
    });

    if (filteredExplorer.length === 0) return [];

    return filteredExplorer.map((exp) => {
      const matched = rawAssignedItems.find(
        (a) => a.title.trim().toLowerCase() === exp.title.trim().toLowerCase()
      );
      const curr =
        getCourseCurriculum(exp.title) ||
        courseCurriculums?.[exp.title.trim().toLowerCase()];
      const visCh = Array.isArray(curr)
        ? curr
            .filter((s) => !s.hidden)
            .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden))
        : [];
      const pct =
        visCh.length > 0
          ? Math.round(
              (visCh.filter((c) => c.completed).length / visCh.length) * 100
            )
          : matched?.progressPercent ?? 0;

      const mappedType = exp.type === "Folder" ? "Course" : exp.type;

      return {
        id: matched?.id || exp.id,
        title: exp.title,
        type: mappedType,
        isPro: typeof exp.isPro === "boolean" ? exp.isPro : matched?.isPro,
        unlockPriceIdr: exp.unlockPriceIdr ?? matched?.unlockPriceIdr,
        unlockPointsCost: exp.unlockPointsCost ?? matched?.unlockPointsCost,
        cohort: exp.cohort || matched?.cohort,
        urgencyBadge:
          matched?.urgencyBadge ||
          (exp.urgency === "Urgent" ? "Urgent" : "Due in 3 days"),
        isUrgentRed: matched?.isUrgentRed ?? exp.urgency === "Urgent",
        progressPercent: pct,
        pointsReward: matched?.pointsReward ?? 100,
        duration:
          matched?.duration ||
          (visCh.length > 0
            ? `${Math.max(15, visCh.length * 15)} Mins`
            : exp.type === "Quiz"
            ? "15 Mins"
            : "45 Mins"),
        skillTags:
          matched?.skillTags && matched.skillTags.length > 0
            ? matched.skillTags
            : [exp.category || "Social Media Strategy", exp.type],
        description: exp.description || matched?.description || "",
        isFavorite: matched?.isFavorite ?? false,
        thumbnailUrl:
          exp.thumbnailUrl ||
          matched?.thumbnailUrl ||
          (typeof window !== "undefined"
            ? window.localStorage.getItem(`ruang_sosmed_thumb_${exp.id}`) ||
              window.localStorage.getItem(
                `ruang_sosmed_thumb_${exp.title.trim().toLowerCase()}`
              )
            : null) ||
          undefined,
        bannerGradient: exp.bannerGradient,
        bannerAccent: exp.bannerAccent,
        folderName: exp.folderName,
      };
    });
  }, [
    explorerItems,
    rawAssignedItems,
    courseCurriculums,
    getCourseCurriculum,
    matchesCurrentLearner,
    isInSharedAllProject,
    assignedFolderNames,
    showWikiPage,
  ]);

  // Published Notion-style Wiki & Playbook articles (hidden globally when showWikiPage is false)
  const publishedWikiArticles = React.useMemo(
    () =>
      showWikiPage
        ? explorerItems.filter((e) => e.type === "Wiki" && !e.isArchived)
        : [],
    [explorerItems, showWikiPage]
  );
  const [wikiCategoryFilter, setWikiCategoryFilter] = useState<string>("All");

  // Shared macOS Finder Folder Series grouping (accessible across Home, Catalog, and My Learning)
  const learnerFolders = React.useMemo(() => {
    const resolveProjectColor = (projName: string) => {
      const found = (cohortProjects || []).find(
        (p) => p.name.trim().toLowerCase() === projName.trim().toLowerCase()
      );
      return found?.color || "#4F39F6";
    };

    const folderGroupsMap = new Map<
      string,
      {
        name: string;
        color: string;
        description: string;
        projectName: string;
        projectColor: string;
        courses: LearnerAssignedItem[];
        avgPct: number;
      }
    >();

    assignedFolderItems.forEach((folderMeta) => {
      const fName = folderMeta.title?.trim();
      if (!fName) return;
      const fKey = fName.toLowerCase();
      const projName = folderMeta.cohort?.trim() || "Ruang Sosmed Class";
      if (!folderGroupsMap.has(fKey)) {
        folderGroupsMap.set(fKey, {
          name: fName,
          color: folderMeta.bannerAccent || "blue",
          description: folderMeta.description || "",
          projectName: projName,
          projectColor: resolveProjectColor(projName),
          courses: [],
          avgPct: 0,
        });
      }
    });

    assignedItems.forEach((course) => {
      const fName = course.folderName?.trim();
      if (!fName) return;
      const fKey = fName.toLowerCase();
      if (!folderGroupsMap.has(fKey)) {
        const folderMeta = explorerItems.find(
          (e) =>
            e.type === "Folder" && e.title.trim().toLowerCase() === fKey
        );
        const courseExp = explorerItems.find(
          (e) =>
            e.type !== "Folder" &&
            e.title.trim().toLowerCase() === course.title.trim().toLowerCase()
        );
        const projName =
          folderMeta?.cohort?.trim() ||
          courseExp?.cohort?.trim() ||
          "Ruang Sosmed Class";
        folderGroupsMap.set(fKey, {
          name: folderMeta?.title || fName,
          color: folderMeta?.bannerAccent || "blue",
          description: folderMeta?.description || "",
          projectName: projName,
          projectColor: resolveProjectColor(projName),
          courses: [],
          avgPct: 0,
        });
      }
      folderGroupsMap.get(fKey)!.courses.push(course);
    });

    return Array.from(folderGroupsMap.values()).map((grp) => ({
      ...grp,
      avgPct:
        grp.courses.length > 0
          ? Math.round(
              grp.courses.reduce(
                (sum, c) => sum + (c.progressPercent || 0),
                0
              ) / grp.courses.length
            )
          : 0,
    }));
  }, [assignedFolderItems, assignedItems, explorerItems, cohortProjects]);

  const availableProjects = React.useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    (cohortProjects || []).forEach((p) => {
      const clean = p.name?.trim();
      if (clean && !map.has(clean.toLowerCase())) {
        map.set(clean.toLowerCase(), {
          name: clean,
          color: p.color || "#4F39F6",
        });
      }
    });
    learnerFolders.forEach((f) => {
      const clean = f.projectName?.trim();
      if (clean && !map.has(clean.toLowerCase())) {
        map.set(clean.toLowerCase(), {
          name: clean,
          color: f.projectColor || "#4F39F6",
        });
      }
    });
    return Array.from(map.values());
  }, [cohortProjects, learnerFolders]);

  const activeFolderObj = React.useMemo(() => {
    if (!activeLearnerFolder) return null;
    const key = activeLearnerFolder.trim().toLowerCase();
    return (
      learnerFolders.find((f) => f.name.trim().toLowerCase() === key) || null
    );
  }, [activeLearnerFolder, learnerFolders]);

  const renderLearnerFinderControls = () => (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 shadow-2xs">
      <button
        type="button"
        onClick={() => updateLearnerFolderScale(learnerFolderScale - 12)}
        disabled={learnerFolderScale <= 52}
        title="Perkecil ukuran tampilan"
        aria-label="Perkecil ukuran tampilan"
        className="flex h-5 w-5 items-center justify-center rounded bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#4F39F6] hover:border-[#4F39F6]/40 disabled:opacity-40 cursor-pointer"
      >
        <Minus size={11} />
      </button>
      <input
        type="range"
        min={52}
        max={140}
        step={4}
        value={learnerFolderScale}
        onChange={(e) => updateLearnerFolderScale(Number(e.target.value))}
        aria-label="Atur ukuran folder & kartu"
        className="w-20 sm:w-24 h-1.5 accent-[#4F39F6] cursor-pointer"
      />
      <button
        type="button"
        onClick={() => updateLearnerFolderScale(learnerFolderScale + 12)}
        disabled={learnerFolderScale >= 140}
        title="Perbesar ukuran tampilan"
        aria-label="Perbesar ukuran tampilan"
        className="flex h-5 w-5 items-center justify-center rounded bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#4F39F6] hover:border-[#4F39F6]/40 disabled:opacity-40 cursor-pointer"
      >
        <Plus size={11} />
      </button>
      <button
        type="button"
        onClick={() => updateLearnerFolderScale(76)}
        title="Reset ukuran standar (100%)"
        className="ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] hover:bg-white hover:text-[#121215] tabular-nums cursor-pointer"
      >
        {Math.round((learnerFolderScale / 76) * 100)}%
      </button>
    </div>
  );

  const renderLearnerFolderTile = (
    folder: {
      name: string;
      color: string;
      description: string;
      projectName: string;
      projectColor: string;
      courses: LearnerAssignedItem[];
      avgPct: number;
    },
    compact?: boolean
  ) => {
    const isOpening = openingFolderName === folder.name;
    const iconSize = compact
      ? Math.max(48, Math.round(learnerFolderScale * 0.8))
      : learnerFolderScale;
    const tileWidth = compact
      ? Math.max(82, Math.round(iconSize * 1.42))
      : Math.round(iconSize * 1.45);
    return (
      <button
        key={folder.name}
        type="button"
        onClick={() => handleOpenLearnerFolder(folder.name)}
        style={{ width: `${tileWidth}px` }}
        title={folder.description || `Buka folder ${folder.name} (${folder.projectName})`}
        className={`group flex flex-col items-center justify-start p-2 rounded-xl transition-all duration-200 cursor-pointer text-center select-none ${
          isOpening ? "scale-110 opacity-30" : "hover:bg-[#F8FAFC]"
        }`}
      >
        <div className="relative pt-0.5 pb-1 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
          <LearnerMacFolderIcon
            color={folder.color}
            className="drop-shadow-[0_3px_8px_rgba(0,0,0,0.08)]"
            style={{
              width: `${iconSize}px`,
              height: `${Math.round(iconSize * 0.82)}px`,
            }}
          />
          <span
            title={`${folder.courses.length} materi`}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-bold shadow-md ring-2 ring-white"
          >
            {folder.courses.length}
          </span>
        </div>

        <p
          className={`mt-1 font-semibold text-[#1E293B] group-hover:text-[#4F39F6] line-clamp-2 leading-tight px-0.5 w-full break-words ${
            iconSize >= 104
              ? "text-xs"
              : iconSize <= 58
              ? "text-[10px]"
              : "text-[11px]"
          }`}
        >
          {folder.name}
        </p>

        <span
          title={`Project: ${folder.projectName}`}
          className="mt-1 inline-flex items-center gap-1 max-w-full rounded-full bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.5 text-[9px] font-semibold text-[#475569]"
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: folder.projectColor }}
          />
          <span className="truncate">{folder.projectName}</span>
        </span>

        <span className="mt-1 inline-flex items-center rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[9px] font-semibold text-[#475569] tabular-nums">
          {folder.avgPct}% selesai
        </span>
      </button>
    );
  };

  const [activeNavTab, setActiveNavTab] = useState<LearnerNavTabId>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(
          "ruang_sosmed_learner_active_tab_v1"
        ) as LearnerNavTabId | null;
        if (saved) return saved;
      } catch {}
    }
    return "home";
  });
  const [profileSubView, setProfileSubView] = useState<
    "profile" | "manual-setup"
  >("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFavorite, setCourseFavorite] = useState(true);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [unlockModalTarget, setUnlockModalTarget] =
    useState<UnlockModuleTarget | null>(null);

  // Celebration Popup when points are awarded by Admin
  const [awardedPointsPopup, setAwardedPointsPopup] = useState<{
    addedPoints: number;
    newTotal: number;
    reason?: string;
  } | null>(null);

  useEffect(() => {
    const handlePointsAwarded = (e: Event) => {
      const customEvent = e as CustomEvent<{
        addedPoints: number;
        newTotal: number;
        learnerEmail?: string;
        reason?: string;
      }>;
      if (customEvent.detail) {
        if (
          customEvent.detail.learnerEmail &&
          userEmail &&
          customEvent.detail.learnerEmail.toLowerCase() !== userEmail
        ) {
          return;
        }
        setAwardedPointsPopup({
          addedPoints: customEvent.detail.addedPoints,
          newTotal: customEvent.detail.newTotal,
          reason: customEvent.detail.reason,
        });
      }
    };

    // Check on mount for any pending notification targeted to this learner
    if (typeof window !== "undefined") {
      try {
        const targetKey = userEmail || userName;
        const pendingKey = `ruang_sosmed_pending_notif_${targetKey}`;
        const raw =
          (targetKey ? window.localStorage.getItem(pendingKey) : null) ||
          window.localStorage.getItem("ruang_sosmed_active_points_popup");

        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.addedPoints === "number") {
            setAwardedPointsPopup({
              addedPoints: parsed.addedPoints,
              newTotal: parsed.newTotal,
              reason: parsed.reason,
            });
            if (targetKey) window.localStorage.removeItem(pendingKey);
            window.localStorage.removeItem("ruang_sosmed_active_points_popup");
          }
        }
      } catch {}
    }

    window.addEventListener("ruang_sosmed_points_awarded", handlePointsAwarded);
    return () => {
      window.removeEventListener("ruang_sosmed_points_awarded", handlePointsAwarded);
    };
  }, [userEmail, userName]);

  // Right-side Learner PRO Push Promo Panel state + 5-minute recurring reminder while !learnerIsPro
  const [proPushOpen, setProPushOpen] = useState<boolean>(true);
  const [proPanelHiddenAttr, setProPanelHiddenAttr] = useState<boolean>(false);
  const [promoBillingCycle, setPromoBillingCycle] = useState<
    "3d_trial" | "7d_trial" | "30d" | null
  >(null);

  useEffect(() => {
    if (learnerIsPro) {
      setProPushOpen(false);
      return;
    }
    if (!proPushOpen) {
      // Muncul kembali setiap 5 menit (300.000 ms) selama user belum berstatus PRO
      const timerId = window.setTimeout(() => {
        setProPanelHiddenAttr(false);
        setProPushOpen(true);
      }, 5 * 60 * 1000);
      return () => window.clearTimeout(timerId);
    }
  }, [learnerIsPro, proPushOpen]);

  const showProPushPanel = !learnerIsPro && proPushOpen;

  // Dynamic sync for Learner Profile (Photo & Name)
  useEffect(() => {
    const syncLearner = () => {
      if (typeof window === "undefined") return;
      try {
        const primaryKey =
          currentUser?.role === "admin"
            ? "ruang_sosmed_profile_admin_v2"
            : "ruang_sosmed_profile_learner_v2";
        const secondaryKey =
          currentUser?.role === "admin"
            ? "ruang_sosmed_profile_learner_v2"
            : "ruang_sosmed_profile_admin_v2";

        let nextAvatar: string | null = null;
        let nextName: string | null = null;

        for (const k of [secondaryKey, primaryKey]) {
          const raw = window.localStorage.getItem(k);
          if (!raw) continue;
          const p = JSON.parse(raw);
          if (typeof p.avatarUrl === "string" && p.avatarUrl) {
            nextAvatar = p.avatarUrl;
          }
          if (
            p.fullName &&
            p.fullName !== "Arunika Developer" &&
            p.fullName.trim().toLowerCase() !== "arunika"
          ) {
            nextName = p.fullName;
          }
        }

        const sessionRaw = window.localStorage.getItem(
          "ruang_sosmed_session_user_v1"
        );
        if (sessionRaw) {
          const s = JSON.parse(sessionRaw);
          if (typeof s.avatarUrl === "string" && s.avatarUrl) {
            nextAvatar = s.avatarUrl;
          }
          if (
            s.name &&
            s.name !== "Arunika Developer" &&
            s.name.trim().toLowerCase() !== "arunika"
          ) {
            nextName = s.name;
          }
        }

        if (nextAvatar) setLearnerAvatar(nextAvatar);
        if (nextName) setLearnerProfileName(nextName);
      } catch {}
    };
    syncLearner();
    window.addEventListener("ruang_sosmed_profile_updated", syncLearner);
    window.addEventListener("storage", syncLearner);
    return () => {
      window.removeEventListener("ruang_sosmed_profile_updated", syncLearner);
      window.removeEventListener("storage", syncLearner);
    };
  }, [currentUser?.role]);

  const activeLearnerDisplayName =
    learnerProfileName ||
    (currentUser?.name === "Arunika Developer" ||
    currentUser?.name?.trim().toLowerCase() === "arunika"
      ? "Dinur Pradipta"
      : currentUser?.name) ||
    learnerDisplayName;
  const activeLearnerAvatar =
    learnerAvatar ||
    currentUser?.avatarUrl ||
    resolveUserAvatar(
      currentUser?.email,
      activeLearnerDisplayName,
      currentUser?.name,
      currentUser?.username
    ) ||
    null;
  const activeLearnerInitials =
    activeLearnerDisplayName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AR";
  const learnerFirstName =
    activeLearnerDisplayName.trim().split(/\s+/)[0] || "Learner";

  const [timeGreeting, setTimeGreeting] = useState("Selamat datang");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) {
      setTimeGreeting("Selamat pagi");
    } else if (hour < 15) {
      setTimeGreeting("Selamat siang");
    } else if (hour < 18) {
      setTimeGreeting("Selamat sore");
    } else {
      setTimeGreeting("Selamat malam");
    }
  }, []);

  // Real Rumi XP Ledger, Daily Login (+1 XP / Streak), Tier Bonus & Evolution Tracker
  const [rumiXpState, setRumiXpState] =
    useState<RumiXpProfileState>(EMPTY_RUMI_XP_STATE);
  const xpUserKey = React.useMemo(
    () =>
      resolveXpUserKey({
        email: currentUser?.email,
        username: currentUser?.username,
        name: activeLearnerDisplayName,
      }),
    [currentUser?.email, currentUser?.username, activeLearnerDisplayName]
  );

  // Claim Daily Login XP (+1 XP FREE / +2 XP PRO) + Tier Activation Bonus (+15 Basic / +35 PRO)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loginRes = claimDailyLoginXp(xpUserKey, learnerAccess.tierKind);
    if (loginRes.awarded) {
      onShowToast(
        loginRes.streakBonusXp > 0
          ? `🔥 Streak ${loginRes.streak} Hari! Login Harian + Bonus Streak total +${loginRes.xpAdded} XP untuk Rumi!`
          : `🌱 Login Harian otomatis! +${loginRes.xpAdded} XP untuk Rumi (Streak ${loginRes.streak} hari).`
      );
      if (loginRes.evolved) {
        const evolvedTier = RUMI_LEVEL_TIERS.find(
          (t) => t.level === loginRes.nextLevel
        );
        if (evolvedTier) {
          onShowToast(
            `${evolvedTier.emoji} Selamat! Rumi berevolusi ke Lv.${evolvedTier.level} • ${evolvedTier.formName}!`
          );
        }
      }
    }

    if (learnerAccess.tierKind === "basic") {
      const bonus = awardRumiXpEvent({
        userKey: xpUserKey,
        type: "tier_bonus_basic",
        dedupeKey: "tier_bonus:basic",
        detail: learnerAccess.activePackage?.name || "Paket Basic",
        tierKind: learnerAccess.tierKind,
      });
      if (bonus.awarded) {
        onShowToast(
          `⚡ Bonus Paket Basic! Rumi mendapat +${bonus.xpAdded} XP & Booster 1.5× XP aktif.`
        );
      }
    } else if (learnerAccess.tierKind === "pro") {
      const bonus = awardRumiXpEvent({
        userKey: xpUserKey,
        type: "tier_bonus_pro",
        dedupeKey: "tier_bonus:pro",
        detail: learnerAccess.activePackage?.name || "Paket PRO",
        tierKind: learnerAccess.tierKind,
      });
      if (bonus.awarded) {
        onShowToast(
          `⚡ Bonus Paket PRO! Rumi mendapat +${bonus.xpAdded} XP & Booster 2× XP aktif.`
        );
      }
    }

    setRumiXpState(loadRumiXpState(xpUserKey));

    const handleXpUpdated = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          userKey?: string;
          state?: RumiXpProfileState;
          evolved?: boolean;
          nextLevel?: number;
        }>
      ).detail;
      if (detail?.userKey && detail.userKey !== xpUserKey) return;
      if (detail?.state) {
        setRumiXpState(detail.state);
      } else {
        setRumiXpState(loadRumiXpState(xpUserKey));
      }
      if (detail?.evolved && detail.nextLevel) {
        const evolvedTier = RUMI_LEVEL_TIERS.find(
          (t) => t.level === detail.nextLevel
        );
        if (evolvedTier) {
          onShowToast(
            `${evolvedTier.emoji} Rumi naik ke Lv.${evolvedTier.level} • ${evolvedTier.formName}!`
          );
        }
      }
    };

    const handleStorage = () => {
      setRumiXpState(loadRumiXpState(xpUserKey));
    };

    window.addEventListener(RUMI_XP_UPDATED_EVENT, handleXpUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(RUMI_XP_UPDATED_EVENT, handleXpUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [
    xpUserKey,
    learnerAccess.tierKind,
    learnerAccess.activePackage?.name,
    onShowToast,
  ]);

  // Reconcile completed chapters (+2 XP/bab) & 100% completed courses (+5 XP/kelas) into Rumi XP ledger
  useEffect(() => {
    if (typeof window === "undefined" || assignedItems.length === 0) return;

    let changed = false;
    let evolvedToLevel: number | null = null;

    assignedItems.forEach((item) => {
      const secs =
        getCourseCurriculum(item.title) ||
        courseCurriculums?.[item.title.trim().toLowerCase()] ||
        [];
      const visibleChs = (secs || [])
        .filter((s) => !s.hidden)
        .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden));

      visibleChs.forEach((ch) => {
        if (!ch.completed) return;
        const chRes = awardRumiXpEvent({
          userKey: xpUserKey,
          type: "chapter_complete",
          dedupeKey: `chapter:${ch.id}`,
          detail: ch.title,
          tierKind: learnerAccess.tierKind,
          silent: true,
        });
        if (chRes.awarded) {
          changed = true;
          if (chRes.evolved) evolvedToLevel = chRes.nextLevel;
        }
      });

      const pct =
        visibleChs.length > 0
          ? Math.round(
              (visibleChs.filter((c) => c.completed).length / visibleChs.length) *
                100
            )
          : item.progressPercent || 0;

      if (pct >= 100) {
        const courseRes = awardRumiXpEvent({
          userKey: xpUserKey,
          type: "course_complete",
          dedupeKey: `course_complete:${item.title.trim().toLowerCase()}`,
          detail: item.title,
          tierKind: learnerAccess.tierKind,
          silent: true,
        });
        if (courseRes.awarded) {
          changed = true;
          if (courseRes.evolved) evolvedToLevel = courseRes.nextLevel;
          onShowToast(
            `🎓 Kelas "${item.title}" tuntas 100%! Rumi mendapat +${courseRes.xpAdded} XP!`
          );
        }
      }
    });

    if (changed) {
      setRumiXpState(loadRumiXpState(xpUserKey));
      if (evolvedToLevel) {
        const evolvedTier = RUMI_LEVEL_TIERS.find(
          (t) => t.level === evolvedToLevel
        );
        if (evolvedTier) {
          onShowToast(
            `${evolvedTier.emoji} Selamat! Rumi tumbuh menjadi ${evolvedTier.formName} (Lv.${evolvedTier.level})!`
          );
        }
      }
    }
  }, [
    xpUserKey,
    assignedItems,
    courseCurriculums,
    getCourseCurriculum,
    learnerAccess.tierKind,
    onShowToast,
  ]);

  // Trenning My Learning & Wiki State (ref_16, ref_16b, ref_23)
  const [myLearningStatusFilter, setMyLearningStatusFilter] = useState<
    "All Status" | "Not Started" | "In Progress" | "Completed"
  >("All Status");
  const [myLearningViewMode, setMyLearningViewMode] = useState<"grid" | "list">("list");
  const [wikiViewLayout, setWikiViewLayout] = useState<"trenning-2col" | "cards">("trenning-2col");

  // Feature Update Banner State: Muncul hanya bila ada update aktif & otomatis hilang dalam 3 menit
  const [featureBannerState, setFeatureBannerState] = useState<
    "visible" | "exiting" | "dismissed"
  >("dismissed");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `ruang_sosmed_banner_time_${ACTIVE_FEATURE_UPDATE.id}`;
    const dismissedKey = `ruang_sosmed_banner_dismissed_${ACTIVE_FEATURE_UPDATE.id}`;

    // Jika user sudah pernah menutup update ini secara manual, jangan tampilkan lagi
    if (window.localStorage.getItem(dismissedKey) === "true") {
      setFeatureBannerState("dismissed");
      return;
    }

    const THREE_MINUTES_MS = 3 * 60 * 1000; // 3 menit = 180.000 ms
    let startTime = parseInt(window.localStorage.getItem(storageKey) || "0", 10);

    // Inisialisasi timestamp saat pertama kali update dideteksi
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      try {
        window.localStorage.setItem(storageKey, startTime.toString());
      } catch {}
    }

    const elapsed = Date.now() - startTime;
    const remaining = THREE_MINUTES_MS - elapsed;

    if (remaining <= 0) {
      // Waktu 3 menit sudah habis sejak update dirilis
      setFeatureBannerState("dismissed");
      return;
    }

    // Tampilkan banner
    setFeatureBannerState("visible");

    // Otomatis hilangkan sendiri tepat saat batas 3 menit tercapai
    const autoDismissTimer = window.setTimeout(() => {
      setFeatureBannerState("exiting");
      window.setTimeout(() => {
        setFeatureBannerState("dismissed");
        try {
          window.localStorage.setItem(dismissedKey, "true");
        } catch {}
      }, 400);
    }, remaining);

    return () => window.clearTimeout(autoDismissTimer);
  }, []);

  // Auto-redeem folder or content access code if student entered it during registration
  useEffect(() => {
    if (typeof window === "undefined" || !explorerItems.length) return;
    let pendingCode = "";
    try {
      pendingCode =
        window.localStorage.getItem("ruang_sosmed_pending_folder_code") || "";
    } catch {}
    if (!pendingCode) return;

    const result = redeemFolderAccessCode(pendingCode, {
      name: learnerProfileName || currentUser?.name || "Learner",
      email: currentUser?.email,
      username: currentUser?.username,
    });
    if (result.success) {
      try {
        window.localStorage.removeItem("ruang_sosmed_pending_folder_code");
      } catch {}
      setUnlockedFolderModal({
        folderTitle: result.unlockedTitle || result.folderTitle || "Materi",
        unlockedTitle: result.unlockedTitle,
        unlockType: result.unlockType,
        courseCount: result.courseCount ?? 1,
        codeUsed: pendingCode,
      });
      if (result.folderTitle) {
        setActiveLearnerFolder(result.folderTitle);
      }
    } else {
      // Hapus setelah dicoba jika materi list sudah termuat agar tidak loop error
      try {
        window.localStorage.removeItem("ruang_sosmed_pending_folder_code");
      } catch {}
      onShowToast(result.message);
    }
  }, [
    explorerItems,
    currentUser?.email,
    currentUser?.name,
    currentUser?.username,
    learnerProfileName,
    redeemFolderAccessCode,
    onShowToast,
  ]);

  const handleRedeemCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = folderCodeInput.trim().toUpperCase().replace(/\s+/g, "-");
    if (!clean) return;
    const result = redeemFolderAccessCode(clean, {
      name: learnerProfileName || currentUser?.name || "Learner",
      email: currentUser?.email,
      username: currentUser?.username,
    });
    if (result.success) {
      setFolderCodeInput("");
      setJoinCodeModalOpen(false);
      setUnlockedFolderModal({
        folderTitle: result.unlockedTitle || result.folderTitle || "Materi",
        unlockedTitle: result.unlockedTitle,
        unlockType: result.unlockType,
        courseCount: result.courseCount ?? 1,
        codeUsed: clean,
      });
      if (result.folderTitle) {
        setActiveLearnerFolder(result.folderTitle);
      } else {
        setActiveLearnerFolder(null);
      }
      setSelectedFolderFilter("All");
    } else {
      onShowToast(result.message);
    }
  };

  const dismissFeatureBanner = () => {
    setFeatureBannerState("exiting");
    window.setTimeout(() => {
      setFeatureBannerState("dismissed");
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_banner_dismissed_${ACTIVE_FEATURE_UPDATE.id}`,
            "true"
          );
        } catch {}
      }
    }, 400);
  };

  const [screenState, setScreenState] = useState<LearnerScreenState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(
          "ruang_sosmed_learner_screen_v1"
        );
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { screen: "dashboard" };
  });

  // Persist active tab across page reloads
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_learner_active_tab_v1",
          activeNavTab
        );
      } catch {}
    }
  }, [activeNavTab]);

  // Persist screen state (course-overview, classroom, quiz-runner, dashboard) across page reloads
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_learner_screen_v1",
          JSON.stringify(screenState)
        );
      } catch {}
    }
  }, [screenState]);

  // Guard: jika halaman Wiki/Favorites dinonaktifkan oleh Admin, arahkan keluar dari halaman tersebut
  useEffect(() => {
    if (!showWikiPage && activeNavTab === "wiki") {
      setActiveNavTab("home");
    }
    if (!showWikiPage && screenState.screen === "wiki-reader") {
      setScreenState({ screen: "dashboard" });
    }
    if (!showFavoritesPage && activeNavTab === "favorites") {
      setActiveNavTab("home");
    }
  }, [showWikiPage, showFavoritesPage, activeNavTab, screenState.screen]);

  // Guard: jika halaman yang tersimpan adalah kelas yang belum/tidak di-assign ke user ini, kembalikan ke dashboard
  useEffect(() => {
    if (
      screenState.screen === "course-overview" ||
      screenState.screen === "classroom"
    ) {
      const stillAssigned = assignedItems.some(
        (a) =>
          a.title.trim().toLowerCase() ===
          screenState.courseTitle.trim().toLowerCase()
      );
      if (!stillAssigned && assignedItems.length > 0) {
        setScreenState({ screen: "dashboard" });
      }
    }
  }, [assignedItems, screenState]);

  const handleSelectNavTab = (
    tab: LearnerNavTabId,
    targetProfileSubView: "profile" | "manual-setup" = "profile"
  ) => {
    setActiveNavTab(tab);
    if (tab === "profile") {
      setProfileSubView(targetProfileSubView);
    }
    setActiveLearnerFolder(null);
    setFolderSearchQuery("");
    setScreenState({ screen: "dashboard" });
  };

  const isProItem = (item: LearnerAssignedItem) => {
    if (typeof item.isPro === "boolean") return item.isPro;
    if (typeof window !== "undefined") {
      try {
        const key = item.title.toLowerCase().trim();
        const saved = window.localStorage.getItem(
          `ruang_sosmed_course_tier_${key}`
        );
        if (saved) return saved === "pro";
      } catch {}
    }
    return item.type === "Assignment";
  };

  const getCardAccessDecision = (item: LearnerAssignedItem) =>
    evaluateCourseCardAccess({
      item: {
        title: item.title,
        type: item.type,
        isPro: isProItem(item),
        unlockPointsCost: item.unlockPointsCost,
        unlockPriceIdr: item.unlockPriceIdr,
      },
      access: learnerAccess,
    });

  const isChapterPlayable = (
    courseTitle: string,
    flatChs: CourseChapterItem[],
    ch: CourseChapterItem
  ) => {
    const exp = explorerItems.find(
      (e) =>
        e.type !== "Folder" &&
        e.title.trim().toLowerCase() === courseTitle.trim().toLowerCase()
    );
    return evaluateChapterAccess({
      courseTitle,
      courseIsPro: exp?.isPro,
      courseUnlockPointsCost: exp?.unlockPointsCost,
      courseUnlockPriceIdr: exp?.unlockPriceIdr,
      flatVisibleChapters: flatChs,
      chapter: ch,
      access: learnerAccess,
    }).unlocked;
  };

  const handleOpenAssignedCard = (item: LearnerAssignedItem) => {
    const decision = getCardAccessDecision(item);
    if (!decision.unlocked) {
      if (decision.canUnlockWithPoints || decision.canBuyPerMaterial) {
        setUnlockModalTarget({
          courseTitle: item.title,
          chapterId: null,
          chapterTitle: item.title,
          reason:
            decision.reason === "assignment_locked"
              ? "Tugas & Review Mentor terkunci pada paket aktif Anda."
              : "Materi berstatus PRO ini terkunci pada paket aktif Anda.",
          canUnlockWithPoints: decision.canUnlockWithPoints,
          pointsCost: decision.pointsCost,
          canBuyPerMaterial: decision.canBuyPerMaterial,
          priceIdr: decision.priceIdr,
        });
        return;
      }
      onShowToast(
        decision.reason === "wiki_locked"
          ? `🔒 "${item.title}" termasuk fitur Wiki & SOP yang terkunci di paket ${activeTierLabel}. Silakan upgrade paket.`
          : decision.reason === "assignment_locked"
          ? `🔒 "${item.title}" membutuhkan fitur Tugas & Review Mentor pada paket berbayar.`
          : `🔒 "${item.title}" termasuk materi PRO. Silakan upgrade paket untuk membuka akses.`
      );
      onOpenUpgradeModal?.();
      return;
    }
    if (item.type === "Quiz") {
      setScreenState({ screen: "quiz-runner", quizTitle: item.title });
      return;
    }
    if (item.type === "Wiki") {
      setScreenState({
        screen: "wiki-reader",
        wikiIdOrTitle: item.id || item.title,
      });
      return;
    }
    setScreenState({
      screen: "course-overview",
      courseTitle: item.title,
    });
  };

  const handleContinueCourseDirectly = (item: LearnerAssignedItem) => {
    const decision = getCardAccessDecision(item);
    if (!decision.unlocked || item.type === "Quiz" || item.type === "Wiki") {
      handleOpenAssignedCard(item);
      return;
    }
    const targetSecs =
      getCourseCurriculum(item.title) ||
      courseCurriculums?.[item.title.trim().toLowerCase()] ||
      courseSections;
    const flatChs = (targetSecs || [])
      .filter((s) => !s.hidden)
      .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden));
    const targetCh =
      flatChs.find(
        (c) =>
          !c.completed &&
          !c.locked &&
          isChapterPlayable(item.title, flatChs, c)
      ) ||
      flatChs.find(
        (c) => !c.locked && isChapterPlayable(item.title, flatChs, c)
      ) ||
      flatChs[0];
    setScreenState({
      screen: "classroom",
      courseTitle: item.title,
      chapterId: targetCh?.id || flatChs[0]?.id || "ch-101",
    });
  };

  const handleMarkChapterComplete = (chapterId: string, points: number) => {
    const newlyCompleted = markLearnerChapterComplete(chapterId, points);
    if (newlyCompleted) {
      onShowToast(
        `Chapter marked complete! Earned +${points} ⭐ pts & synced progress to Admin Assignees + Leaderboard.`
      );
    } else {
      onShowToast("Chapter is already marked complete.");
    }
  };

  const hasSelectedFolder =
    selectedFolderFilter === "All" ||
    assignedItems.some(
      (a) =>
        (a.folderName || "").trim().toLowerCase() ===
        selectedFolderFilter.trim().toLowerCase()
    );

  // Filter items by search query, status filter, and active navigation tab
  const displayedItems = assignedItems.filter((item) => {
    if (activeNavTab === "favorites" && !item.isFavorite) return false;
    if (activeNavTab === "my-learning") {
      if (
        myLearningStatusFilter === "Not Started" &&
        item.progressPercent > 0
      ) {
        return false;
      }
      if (
        myLearningStatusFilter === "In Progress" &&
        (item.progressPercent === 0 || item.progressPercent >= 100)
      ) {
        return false;
      }
      if (
        myLearningStatusFilter === "Completed" &&
        item.progressPercent < 100
      ) {
        return false;
      }
    }
    if (
      selectedFolderFilter !== "All" &&
      hasSelectedFolder &&
      (item.folderName || "").trim().toLowerCase() !==
        selectedFolderFilter.trim().toLowerCase()
    ) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.type.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const sortLearnerCourses = (items: LearnerAssignedItem[]) => {
    if (learnerFolderSort === "title") {
      return [...items].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (learnerFolderSort === "progress") {
      return [...items].sort(
        (a, b) => (b.progressPercent || 0) - (a.progressPercent || 0)
      );
    }
    return items;
  };

  const learnerCertificateCourses: LearnerCourseCertificateItem[] =
    React.useMemo(() => {
      const prefix = "RS2-2026";
      const mapped = assignedItems
        .filter((item) => item.type !== "Wiki")
        .map((item, idx) => {
        const curr =
          getCourseCurriculum(item.title) ||
          courseCurriculums?.[item.title.trim().toLowerCase()] ||
          [];
        const visCh = Array.isArray(curr)
          ? curr
              .filter((s) => !s.hidden)
              .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden))
          : [];
        const totalCh = visCh.length;
        const completedCh = visCh.filter((c) => c.completed).length;
        const pct =
          totalCh > 0
            ? Math.round((completedCh / totalCh) * 100)
            : item.progressPercent || 0;

        const hashNum = Array.from(item.title || "").reduce(
          (acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9000,
          1000 + idx * 17
        );
        const codeNum = String(1000 + (Math.abs(hashNum) % 9000));
        const credId = `${prefix}-${codeNum}`;

        return {
          id: item.id,
          title: item.title,
          folderName: item.folderName,
          progressPercent: pct,
          completedChapters: completedCh,
          totalChapters: totalCh,
          credentialId: credId,
          completionDate:
            pct >= 100
              ? "Selesai • Sertifikat Resmi"
              : pct > 0
              ? `Progres ${pct}% • Dalam Pengerjaan`
              : "Belum Dimulai (0%)",
          scoreLabel:
            pct >= 100
              ? `${completedCh}/${Math.max(1, totalCh)} Bab Selesai (100%) • Lulus`
              : pct > 0
              ? `Sedang Dijalani • ${completedCh}/${totalCh} Bab (${pct}%)`
              : `Belum Dimulai • 0/${totalCh} Bab (0%)`,
        };
      });

      return mapped.sort((a, b) => b.progressPercent - a.progressPercent);
    }, [assignedItems, courseCurriculums, getCourseCurriculum]);

  // Dynamically calculate overall progress on the active primary course (filtered by visible sections/chapters)
  const primaryCourseTitle = assignedItems[0]?.title || "";
  const primaryCourseSections = React.useMemo(() => {
    if (!primaryCourseTitle) return [];
    const raw =
      getCourseCurriculum(primaryCourseTitle) ||
      courseCurriculums?.[primaryCourseTitle.trim().toLowerCase()] ||
      courseSections;
    return (raw || [])
      .filter((s) => !s.hidden)
      .map((s) => ({
        ...s,
        chapters: (s.chapters || []).filter((c) => !c.hidden),
      }))
      .filter((s) => s.chapters.length > 0);
  }, [
    primaryCourseTitle,
    getCourseCurriculum,
    courseCurriculums,
    courseSections,
  ]);

  const flatChapters = primaryCourseSections.flatMap((s) => s.chapters);
  const doneChapters = flatChapters.filter((c) => c.completed).length;
  const activeCoursePct =
    flatChapters.length > 0
      ? Math.round((doneChapters / flatChapters.length) * 100)
      : 0;

  const renderCourseCoverMedia = (
    item: LearnerAssignedItem,
    containerClassName: string,
    children?: React.ReactNode
  ) => {
    const effectiveThumb =
      item.thumbnailUrl ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem(`ruang_sosmed_thumb_${item.id}`) ||
          window.localStorage.getItem(
            `ruang_sosmed_thumb_${item.title.trim().toLowerCase()}`
          )
        : null) ||
      undefined;

    const isImg =
      Boolean(effectiveThumb) &&
      (effectiveThumb!.startsWith("/") ||
        effectiveThumb!.startsWith("http") ||
        effectiveThumb!.startsWith("data:") ||
        effectiveThumb!.includes(".png") ||
        effectiveThumb!.includes(".jpg") ||
        effectiveThumb!.includes(".webp"));

    return (
      <div
        className={containerClassName}
        style={
          !effectiveThumb
            ? {
                background:
                  item.bannerGradient ||
                  "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)",
              }
            : !isImg
            ? { background: effectiveThumb }
            : undefined
        }
      >
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effectiveThumb}
            alt={item.title}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <svg
            viewBox="0 0 320 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            aria-hidden="true"
          >
            <circle
              cx="275"
              cy="24"
              r="46"
              fill={item.bannerAccent || "#4F39F6"}
              fillOpacity="0.12"
            />
            <circle
              cx="240"
              cy="98"
              r="34"
              fill={item.bannerAccent || "#4F39F6"}
              fillOpacity="0.08"
            />
            <rect
              x="96"
              y="22"
              width="128"
              height="84"
              rx="10"
              fill="#FFFFFF"
              fillOpacity="0.92"
              stroke={item.bannerAccent || "#4F39F6"}
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
            <rect
              x="110"
              y="36"
              width="48"
              height="8"
              rx="4"
              fill={item.bannerAccent || "#4F39F6"}
              fillOpacity="0.75"
            />
            <rect
              x="110"
              y="52"
              width="96"
              height="6"
              rx="3"
              fill="#CBD5E1"
            />
            <rect
              x="110"
              y="64"
              width="76"
              height="6"
              rx="3"
              fill="#E2E8F0"
            />
            <rect
              x="110"
              y="76"
              width="36"
              height="14"
              rx="4"
              fill={item.bannerAccent || "#4F39F6"}
              fillOpacity="0.18"
            />
          </svg>
        )}
        {children}
      </div>
    );
  };

  const renderProUpgradeCard = () => {
    const normalizedPkgs = getNormalizedProPackages(activeProCfg);
    const paidPkgs = normalizedPkgs.filter((p) => p.tierKind !== "free");
    const promoPkg =
      paidPkgs.find((p) => p.tierKind === "pro" || p.highlighted) ||
      paidPkgs[0];
    const canOffer3dTrial =
      !learnerHasUsedTrial && promoPkg?.enable3DayTrial !== false;
    const canOffer7dTrial =
      !learnerHasUsedTrial && promoPkg?.enable7DayTrial !== false;
    const canOfferTrial = canOffer3dTrial || canOffer7dTrial;
    const activePromoCycle: "3d_trial" | "7d_trial" | "30d" = learnerHasUsedTrial
      ? "30d"
      : promoBillingCycle === "3d_trial" && canOffer3dTrial
      ? "3d_trial"
      : promoBillingCycle === "7d_trial" && canOffer7dTrial
      ? "7d_trial"
      : promoBillingCycle === "30d"
      ? "30d"
      : canOffer3dTrial
      ? "3d_trial"
      : canOffer7dTrial
      ? "7d_trial"
      : "30d";
    const promoMonthlyIdr = Number(promoPkg?.monthlyPriceIdr ?? 150000);
    const promoPriceDisplay = promoPkg
      ? activePromoCycle === "3d_trial"
        ? formatIdr(
            computeTrial3DaysPriceIdr(
              promoMonthlyIdr,
              promoPkg.trial3DaysPriceIdr
            )
          )
        : activePromoCycle === "7d_trial"
        ? formatIdr(
            computeTrial7DaysPriceIdr(
              promoMonthlyIdr,
              promoPkg.trial7DaysPriceIdr
            )
          )
        : formatIdr(promoMonthlyIdr)
      : activeProCfg.priceLabel;
    const promoPeriodDisplay =
      activePromoCycle === "3d_trial"
        ? "/ 3 hari trial (1×)"
        : activePromoCycle === "7d_trial"
        ? "/ 7 hari trial (1×)"
        : promoPkg
        ? "/ 30 hari"
        : activeProCfg.bannerPeriodLabel;
    const promoFeatures =
      promoPkg?.features && promoPkg.features.length > 0
        ? promoPkg.features
        : activeProCfg.features || [];

    return (
      <div className="w-full overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_6px_24px_rgba(16,15,17,0.06)]">
        {/* Top Amber Gradient Header + Clean Full-Width Price Box */}
        <div
          className="p-4 relative space-y-3 pro-amber-gradient-header"
          style={{
            background:
              "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 48%, #F59E0B 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-[#92400E] shadow-2xs">
              <Zap size={11} className="text-[#D97706]" fill="currentColor" />
              <span>{activeProCfg.bannerBadge}</span>
            </span>

            <button
              type="button"
              onClick={() => setProPushOpen(false)}
              aria-label="Tutup penawaran Learner PRO"
              aria-expanded={showProPushPanel}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/85 hover:bg-white text-[#121215] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <X size={14} />
            </button>
          </div>

          <h2 className="text-[15px] font-extrabold text-[#121215] leading-snug">
            {activeProCfg.bannerHeading}
          </h2>

          {/* Single-Baseline Price Card + Quick Trial Cycle Switcher */}
          <div className="rounded-xl bg-white/95 px-3.5 py-2.5 border border-[#F59E0B]/30 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#92400E]">
                  {promoPkg?.name || "Learner Pass"} • Free / Basic / Pro
                </p>
                <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap">
                  <span className="text-lg font-black tracking-tight text-[#121215] tabular-nums">
                    {promoPriceDisplay}
                  </span>
                  <span className="text-[11px] font-semibold text-[#78350F]">
                    {promoPeriodDisplay}
                  </span>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-[#FEF3C7] border border-[#F59E0B]/35 px-2.5 py-1 text-[10px] font-bold text-[#92400E]">
                {activePromoCycle === "30d" ? "Bulanan" : "Trial 1×"}
              </span>
            </div>

            {canOfferTrial && (
              <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-[#FDE68A]/70">
                {canOffer3dTrial && (
                  <button
                    type="button"
                    onClick={() => setPromoBillingCycle("3d_trial")}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                      activePromoCycle === "3d_trial"
                        ? "bg-[#121215] text-white"
                        : "bg-[#FFFBEB] text-[#92400E] hover:bg-[#FEF3C7]"
                    }`}
                  >
                    3 Hari Trial
                  </button>
                )}
                {canOffer7dTrial && (
                  <button
                    type="button"
                    onClick={() => setPromoBillingCycle("7d_trial")}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                      activePromoCycle === "7d_trial"
                        ? "bg-[#121215] text-white"
                        : "bg-[#FFFBEB] text-[#92400E] hover:bg-[#FEF3C7]"
                    }`}
                  >
                    7 Hari Trial
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPromoBillingCycle("30d")}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                    activePromoCycle === "30d"
                      ? "bg-[#4F39F6] text-white"
                      : "bg-[#F8F9FB] text-[#5E5E5E] hover:bg-[#EAECEF]"
                  }`}
                >
                  30 Hari
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clean Checklist + Single Primary CTA Footer */}
        <div className="p-4 bg-[#FFFFFF] space-y-3.5">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {promoFeatures.length} Benefit Paket {promoPkg?.name || "Pro"}:
            </p>
            <ul className="divide-y divide-[#F1F5F9]">
              {promoFeatures.map((feature, idx) => (
                <li
                  key={`${idx}-${feature}`}
                  className="flex items-start gap-2 py-2 first:pt-0.5 last:pb-0.5 text-xs font-medium text-[#1E293B]"
                >
                  <CheckCircle2
                    size={14}
                    className="shrink-0 mt-0.5 text-[#10B981]"
                  />
                  <span className="leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Single Primary CTA */}
          <div className="pt-2 border-t border-[#EAECEF] space-y-2">
            <button
              type="button"
              onClick={() =>
                onStartUpgradePayment
                  ? onStartUpgradePayment({
                      packageId: promoPkg?.id,
                      billingCycle: activePromoCycle,
                    })
                  : onOpenUpgradeModal?.()
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] py-2.5 px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.28)] transition-all cursor-pointer"
            >
              <Zap size={13} className="text-[#FDE68A]" fill="currentColor" />
              <span>{activeProCfg.bannerCtaLabel || "Pilih Paket & Upgrade"}</span>
            </button>

            <p className="text-center text-[10px] font-medium text-[#64748B]">
              {canOfferTrial
                ? "Tersedia percobaan 3 / 7 hari (1× member baru) & paket 30 hari"
                : "Bandingkan fitur Free, Basic, dan Pro secara lengkap"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#121215]">
      {/* A. Learner Top Horizontal Navbar */}
      <LearnerTopNavbar
        currentUser={currentUser}
        activeTab={activeNavTab}
        onSelectTab={handleSelectNavTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalPoints={totalPoints}
        onOpenUpgradeModal={onOpenUpgradeModal}
        onOpenRewardsModal={() => setRewardsModalOpen(true)}
        onShowToast={onShowToast}
        onSwitchToAdmin={onSwitchToAdmin}
      />

      {/* Screen Router inside Learner Portal */}
      {screenState.screen === "course-overview" ? (
        <LearnerCourseOverview
          courseTitle={screenState.courseTitle}
          learnerName={learnerDisplayName}
          sections={
            getCourseCurriculum(screenState.courseTitle) || courseSections
          }
          isFavorite={courseFavorite}
          showFavoriteButton={showFavoritesPage}
          onToggleFavorite={() => {
            if (!canNotesFavorites) {
              onShowToast(
                `🔒 Fitur Simpan Favorit terkunci pada paket ${activeTierLabel}. Silakan upgrade paket.`
              );
              onOpenUpgradeModal?.();
              return;
            }
            setCourseFavorite((f) => !f);
            onShowToast(
              courseFavorite
                ? "Removed course from Favorites."
                : "Saved course to Favorites."
            );
          }}
          onBackToDashboard={() => setScreenState({ screen: "dashboard" })}
          onStartClassroom={(chapterId) => {
            const currentCourseSecs =
              getCourseCurriculum(screenState.courseTitle) || courseSections;
            const flatChs = (currentCourseSecs || [])
              .filter((s) => !s.hidden)
              .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden));

            let chosenId = chapterId;
            if (!chosenId) {
              const nextUncompleted = flatChs.find(
                (c) =>
                  !c.completed &&
                  !c.locked &&
                  isChapterPlayable(screenState.courseTitle, flatChs, c)
              );
              chosenId =
                nextUncompleted?.id ||
                flatChs.find(
                  (c) =>
                    !c.locked &&
                    isChapterPlayable(screenState.courseTitle, flatChs, c)
                )?.id ||
                flatChs[0]?.id ||
                "ch-101";
            }

            setScreenState({
              screen: "classroom",
              courseTitle: screenState.courseTitle,
              chapterId: chosenId,
            });
          }}
          onStartQuizRunner={() =>
            setScreenState({
              screen: "quiz-runner",
              quizTitle: "Social Media Analytics & Campaign Fundamentals",
            })
          }
          onOpenUpgradeModal={onOpenUpgradeModal}
          onShowToast={onShowToast}
        />
      ) : screenState.screen === "classroom" ? (
        <ActiveLearningClassroom
          courseTitle={screenState.courseTitle}
          learnerName={learnerDisplayName}
          sections={
            getCourseCurriculum(screenState.courseTitle) || courseSections
          }
          activeChapterId={screenState.chapterId}
          onSelectChapter={(chapterId) =>
            setScreenState({
              ...screenState,
              chapterId,
            })
          }
          onMarkChapterComplete={handleMarkChapterComplete}
          onStartQuizRunner={() =>
            setScreenState({
              screen: "quiz-runner",
              quizTitle: "Social Media Analytics & Campaign Fundamentals",
            })
          }
          onBackToOverview={() =>
            setScreenState({
              screen: "course-overview",
              courseTitle: screenState.courseTitle,
            })
          }
          onOpenUpgradeModal={onOpenUpgradeModal}
          onShowToast={onShowToast}
        />
      ) : screenState.screen === "quiz-runner" ? (
        <LearnerQuizRunner
          quizTitle={screenState.quizTitle}
          learnerName={learnerDisplayName}
          onExitQuiz={() => setScreenState({ screen: "dashboard" })}
          onShowToast={onShowToast}
        />
      ) : screenState.screen === "wiki-reader" ? (
        !canWiki ? (
          <div className="max-w-xl mx-auto my-12 rounded-2xl bg-[#FFFFFF] p-10 border border-[#EAECEF] shadow-[0_2px_10px_rgba(16,15,17,0.04)] text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#D97706]">
              <Lock size={22} />
            </div>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
                ⚡ Fitur Paket Berbayar
              </span>
              <h2 className="text-base font-bold text-[#121215]">
                Direktori Wiki &amp; SOP Terkunci di Paket {activeTierLabel}
              </h2>
              <p className="text-xs text-[#5E5E5E] leading-relaxed">
                Upgrade paket Anda untuk membaca panduan SOP, Playbook Agency, dan lampiran template resmi.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setScreenState({ screen: "dashboard" })}
                className="rounded-lg border border-[#EAECEF] bg-white px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => onOpenUpgradeModal?.()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#121215] hover:bg-[#27272A] px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                <Zap size={13} className="text-[#F59E0B]" fill="currentColor" />
                <span>Upgrade Paket</span>
              </button>
            </div>
          </div>
        ) : (
        (() => {
          const needle = screenState.wikiIdOrTitle.trim().toLowerCase();
          const matchedWiki =
            publishedWikiArticles.find(
              (w) =>
                w.id.toLowerCase() === needle ||
                w.title.trim().toLowerCase() === needle
            ) ||
            explorerItems.find(
              (e) =>
                e.type === "Wiki" &&
                (e.id.toLowerCase() === needle ||
                  e.title.trim().toLowerCase() === needle)
            );
          return (
            <WikiArticleReader
              itemId={matchedWiki?.id}
              title={matchedWiki?.title || screenState.wikiIdOrTitle}
              category={matchedWiki?.category}
              description={matchedWiki?.description}
              editedDate={matchedWiki?.editedDate}
              sections={matchedWiki?.wikiSections}
              attachments={matchedWiki?.wikiAttachments}
              readTime={matchedWiki?.wikiReadTime}
              isAdmin={false}
              onBack={() => setScreenState({ screen: "dashboard" })}
              onShowToast={onShowToast}
            />
          );
        })()
        )
      ) : activeNavTab === "profile" ? (
        <UserProfileScreen
          mode="learner"
          currentUser={currentUser}
          initialSubView={profileSubView}
          onSubViewChange={(next) => {
            if (next === "profile" || next === "manual-setup") {
              setProfileSubView(next);
            }
          }}
          onBack={() => handleSelectNavTab("home")}
          onUpdateUser={(updated) => {
            setLearnerProfileName(updated.name);
            if (updated.avatarUrl) setLearnerAvatar(updated.avatarUrl);
          }}
          onShowToast={onShowToast}
        />
      ) : (
        /* SCREEN 1: LEARNER DASHBOARD, MY LEARNING, CATALOG, WIKI & FAVORITES */
        <div className="w-full px-4 sm:px-6 py-6 pb-20 flex flex-col lg:flex-row items-start overflow-x-clip">
          <main
            key={`learner-tab-${activeNavTab}`}
            className="flex-1 min-w-0 w-full space-y-6 transition-all duration-380 ease-in-out page-transition-enter"
          >
          {/* Playful LMS Home Dashboard */}
          {activeNavTab === "home" && (
            <div className="space-y-4">
              {featureBannerState !== "dismissed" &&
                assignedItems.length > 0 &&
                courseSections.length > 0 && (
                  <div
                    className={`rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 px-4 py-2 flex flex-wrap items-center justify-between gap-2 transition-all duration-400 overflow-hidden ${
                      featureBannerState === "exiting"
                        ? "opacity-0 -translate-y-2 max-h-0 py-0 my-0 pointer-events-none"
                        : "opacity-100 translate-y-0 max-h-20"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-[#10B981] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {ACTIVE_FEATURE_UPDATE.badge}
                      </span>
                      <span className="font-bold text-[#065F46]">
                        {ACTIVE_FEATURE_UPDATE.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const primaryCourse =
                            assignedItems.find((a) => a.type === "Course") ||
                            assignedItems[0];
                          if (primaryCourse) {
                            handleContinueCourseDirectly(primaryCourse);
                          }
                        }}
                        className="text-xs font-bold text-[#059669] hover:underline cursor-pointer"
                      >
                        {ACTIVE_FEATURE_UPDATE.actionLabel}
                      </button>

                      <button
                        type="button"
                        onClick={dismissFeatureBanner}
                        title="Tutup banner pembaruan"
                        aria-label="Tutup banner pembaruan"
                        className="text-[#059669]/70 hover:text-[#065F46] p-1 rounded-md hover:bg-[#D1FAE5] transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

              <LearnerHomeDashboard
                learnerFirstName={learnerFirstName}
                learnerDisplayName={activeLearnerDisplayName}
                timeGreeting={timeGreeting}
                activeTierLabel={activeTierLabel}
                activeTierKind={learnerAccess.tierKind}
                rumiXpState={rumiXpState}
                learnerIsPro={learnerIsPro}
                isUnlimitedPro={learnerAccess.isUnlimitedPro}
                canCertificate={canCertificate}
                certificateUnlocked={certificateUnlocked}
                totalPoints={totalPoints}
                assignedItems={assignedItems}
                learnerFolders={learnerFolders}
                publishedWikiCount={publishedWikiArticles.length}
                showWikiPage={showWikiPage}
                leaderboard={leaderboard}
                rewardsCatalog={rewardsCatalog}
                claimedRewardsCount={(claimedRewards || []).length}
                notesCount={
                  Object.values(rsLessonNotes || {}).filter(
                    (v) => typeof v === "string" && v.trim().length > 0
                  ).length
                }
                reviewsCount={(rsLessonReviews || []).length}
                getCourseChapters={(courseTitle) => {
                  const raw =
                    getCourseCurriculum(courseTitle) ||
                    courseCurriculums?.[courseTitle.trim().toLowerCase()] ||
                    [];
                  return (raw || [])
                    .filter((s) => !s.hidden)
                    .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden));
                }}
                getCardAccessDecision={getCardAccessDecision}
                isProItem={isProItem}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery("")}
                folderCodeInput={folderCodeInput}
                onFolderCodeInputChange={setFolderCodeInput}
                onRedeemCodeSubmit={handleRedeemCodeSubmit}
                onOpenRedeemModal={() => setJoinCodeModalOpen(true)}
                onOpenCourse={handleOpenAssignedCard}
                onContinueCourseDirectly={handleContinueCourseDirectly}
                onOpenFolderInCatalog={(folderName) => {
                  setActiveNavTab("catalog");
                  setSelectedProjectFilter("All");
                  setSelectedFolderFilter("All");
                  setActiveLearnerFolder(folderName);
                }}
                onNavigateTab={(tab) => handleSelectNavTab(tab)}
                onOpenCertificateModal={() => setCertModalOpen(true)}
                onOpenRewardsModal={() => setRewardsModalOpen(true)}
                onOpenUpgradeModal={onOpenUpgradeModal}
              />
            </div>
          )}

          {/* WIKI TAB VIEW (Notion-Style Published Articles + Resource Cards Directory) */}
          {activeNavTab === "home" ? null : activeNavTab === "wiki" && showWikiPage ? (
            !canWiki ? (
              <section
                aria-label="Wiki Directory Locked"
                className="rounded-xl bg-[#FFFFFF] p-10 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] text-center space-y-4"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#D97706]">
                  <Lock size={22} />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
                    ⚡ Fitur Paket Berbayar
                  </span>
                  <h2 className="text-base font-bold text-[#121215]">
                    Direktori Wiki &amp; Playbook SOP Terkunci ({activeTierLabel})
                  </h2>
                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                    Upgrade ke paket dengan fitur Wiki aktif untuk membaca panduan praktis, SOP agency, dan template resmi Mentor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenUpgradeModal?.()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#121215] hover:bg-[#27272A] px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
                >
                  <Zap size={13} className="text-[#F59E0B]" fill="currentColor" />
                  <span>Lihat Paket &amp; Upgrade</span>
                </button>
              </section>
            ) : (
            (() => {
              const wikiCategoriesList = Array.from(
                new Set(
                  publishedWikiArticles
                    .map((w) => w.category || "Playbook & SOP")
                    .filter(Boolean)
                )
              );
              const filteredWikiArticles = publishedWikiArticles.filter((w) => {
                const cat = w.category || "Playbook & SOP";
                if (wikiCategoryFilter !== "All" && cat !== wikiCategoryFilter) {
                  return false;
                }
                if (searchQuery.trim()) {
                  const q = searchQuery.trim().toLowerCase();
                  const inTitle = w.title.toLowerCase().includes(q);
                  const inDesc = (w.description || "").toLowerCase().includes(q);
                  const inCat = cat.toLowerCase().includes(q);
                  if (!inTitle && !inDesc && !inCat) return false;
                }
                return true;
              });

              return (
                <section aria-label="Student Wiki Directory" className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2.5 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                          📘 Bacaan Artikel &amp; SOP Notion-Style
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#121215]">
                        Ruang Sosmed 2.0 Wiki &amp; Playbook Artikel
                      </h2>
                      <p className="text-xs text-[#5E5E5E]">
                        Kumpulan artikel panduan praktis, checklist SOP, dan lampiran template resmi dari Mentor (bukan kelas video — klik kartu untuk membaca langsung).
                      </p>
                    </div>
                  </div>

                  {/* Category Filter Pills for Wiki Articles */}
                  {wikiCategoriesList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {["All", ...wikiCategoriesList].map((cat) => {
                        const isActive = wikiCategoryFilter === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setWikiCategoryFilter(cat)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? "bg-[#6D28D9] text-white shadow-2xs"
                                : "bg-white text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215]"
                            }`}
                          >
                            {cat === "All" ? `Semua Artikel (${publishedWikiArticles.length})` : cat}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Published Wiki Articles Grid */}
                  {filteredWikiArticles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredWikiArticles.map((wiki) => (
                        <WikiArticleCard
                          key={wiki.id}
                          id={wiki.id}
                          title={wiki.title}
                          category={wiki.category}
                          description={wiki.description}
                          editedDate={wiki.editedDate}
                          folderName={wiki.folderName}
                          wikiSections={wiki.wikiSections}
                          wikiAttachments={wiki.wikiAttachments}
                          wikiReadTime={wiki.wikiReadTime}
                          isAdmin={false}
                          onOpen={() =>
                            setScreenState({
                              screen: "wiki-reader",
                              wikiIdOrTitle: wiki.id || wiki.title,
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : wikiResources.length === 0 ? (
                    <div className="rounded-2xl bg-[#FFFFFF] p-10 border border-[#EAECEF] text-center space-y-2">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9]">
                        <BookOpen size={20} />
                      </div>
                      <h3 className="text-sm font-bold text-[#121215]">
                        {searchQuery.trim()
                          ? `Tidak ada artikel Wiki yang cocok dengan "${searchQuery}"`
                          : "Belum Ada Artikel Wiki atau SOP yang Dipublikasikan"}
                      </h3>
                      <p className="text-xs text-[#5E5E5E] max-w-md mx-auto">
                        Artikel Wiki dan Playbook SOP yang dipublikasikan oleh Admin/Mentor akan langsung tampil di sini sebagai halaman bacaan bergaya Notion.
                      </p>
                    </div>
                  ) : null}

                  {/* Supporting Downloadable Resource Cards Section (only displayed when Mentor adds Resource Cards) */}
                  {wikiResources.length > 0 && (
                    <div className="pt-4 border-t border-[#EAECEF] space-y-4">
                      {!canDownloads && (
                        <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-[#92400E] flex items-center gap-1.5">
                              <Zap size={13} fill="currentColor" />
                              Unduh File Template &amp; Resource Khusus Paket Berbayar
                            </p>
                            <p className="text-xs text-[#B45309]">
                              Upgrade ke paket dengan akses Download aktif untuk mengunduh Kalender Konten Notion, 120 Hook Script, dan SOP Meta Ads resmi.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenUpgradeModal?.()}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#121215] hover:bg-[#27272A] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                          >
                            <Zap size={12} className="text-[#F59E0B]" fill="currentColor" />
                            <span>Upgrade Paket</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#5E5E5E]">
                          Direktori Asset &amp; Download Resource Cards ({wikiResources.length})
                        </span>
                        <div className="inline-flex rounded-lg bg-[#FFFFFF] p-1 border border-[#EAECEF]">
                          <button
                            type="button"
                            onClick={() => setWikiViewLayout("trenning-2col")}
                            className={`rounded-md px-2.5 py-1 text-xs font-bold cursor-pointer ${
                              wikiViewLayout === "trenning-2col"
                                ? "bg-[#4F39F6] text-white"
                                : "text-[#5E5E5E]"
                            }`}
                          >
                            2-Column Wiki View
                          </button>
                          <button
                            type="button"
                            onClick={() => setWikiViewLayout("cards")}
                            className={`rounded-md px-2.5 py-1 text-xs font-bold cursor-pointer ${
                              wikiViewLayout === "cards"
                                ? "bg-[#4F39F6] text-white"
                                : "text-[#5E5E5E]"
                            }`}
                          >
                            Resource Grid
                          </button>
                        </div>
                      </div>

                      {wikiViewLayout === "trenning-2col" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          <div className="lg:col-span-8 rounded-2xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-6">
                            <div className="border-b border-[#EAECEF] pb-4">
                              <span className="rounded-md bg-[#10B981]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">
                                Wiki • Design &amp; Social Media Playbook
                              </span>
                              <h3 className="text-xl font-bold text-[#121215] mt-2">
                                Resource Recommendation for Creators &amp; Strategists
                              </h3>
                              <p className="text-xs text-[#5E5E5E] mt-1">
                                Curated by Mentor • Official Resource Directory
                              </p>
                            </div>

                            <div className="space-y-4">
                              {wikiResources.map((card, idx) => (
                                <div key={card.id} className="space-y-1.5 border-b border-[#EAECEF] pb-4 last:border-b-0 last:pb-0">
                                  <h4 className="text-sm font-bold text-[#121215]">
                                    {idx + 1}. {card.title} ({card.category})
                                  </h4>
                                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                                    {card.description}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onShowToast(`Accessed Wiki resource: "${card.title}"`)
                                    }
                                    className="text-xs font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                                  >
                                    {card.actionLabel} →
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="lg:col-span-4 rounded-2xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4 h-fit">
                            <div>
                              <h3 className="text-sm font-bold text-[#121215]">
                                Attachment File ({wikiResources.length})
                              </h3>
                              <p className="text-[11px] text-[#5E5E5E]">
                                Official downloadable files attached to this Wiki
                              </p>
                            </div>

                            <div className="space-y-2.5">
                              {wikiResources.map((att) => (
                                <div
                                  key={`att-${att.id}`}
                                  className="rounded-xl bg-[#F8F9FB] p-3 border border-[#EAECEF] flex items-center justify-between gap-2.5"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold text-white"
                                      style={{ backgroundColor: att.iconAccent || "#4F39F6" }}
                                    >
                                      FILE
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#121215] truncate">
                                        {att.title}
                                      </p>
                                      <p className="text-[10px] text-[#9CA3AF]">
                                        {att.category}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onShowToast(`Downloading "${att.title}"...`)
                                    }
                                    className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#4F39F6] hover:text-white text-[#121215] border border-[#EAECEF] cursor-pointer shrink-0"
                                  >
                                    <Download size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {wikiResources.map((card) => (
                            <article
                              key={card.id}
                              className="flex flex-col justify-between rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                                      style={{
                                        backgroundColor: `${card.iconAccent}15`,
                                        color: card.iconAccent,
                                      }}
                                    >
                                      <Library size={16} />
                                    </span>
                                    <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-0.5 text-[11px] font-semibold text-[#5E5E5E]">
                                      {card.category}
                                    </span>
                                  </div>
                                  {!canDownloads && (
                                    <span className="inline-flex items-center gap-1 rounded bg-[#FEF3C7] border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
                                      <Lock size={10} />
                                      PRO
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-sm font-bold text-[#121215]">
                                  {card.title}
                                </h3>
                                <p className="mt-1.5 text-xs text-[#5E5E5E] leading-relaxed">
                                  {card.description}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-[#EAECEF]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!canDownloads) {
                                      onShowToast(
                                        `🔒 "${card.title}" membutuhkan fitur Download File pada paket Anda. Silakan upgrade paket.`
                                      );
                                      onOpenUpgradeModal?.();
                                      return;
                                    }
                                    onShowToast(`Accessed Wiki resource: "${card.title}"`);
                                  }}
                                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                                >
                                  {!canDownloads ? (
                                    <Lock size={13} className="text-[#D97706]" />
                                  ) : card.actionType === "download" ? (
                                    <Download size={13} />
                                  ) : (
                                    <ExternalLink size={13} />
                                  )}
                                  <span>
                                    {!canDownloads
                                      ? `Unlock ${card.actionLabel}`
                                      : card.actionLabel}
                                  </span>
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })()
            )
          ) : activeNavTab === "favorites" && showFavoritesPage && !canNotesFavorites ? (
            /* FAVORITES TAB LOCKED WHEN FREE TIER */
            <section
              aria-label="Learner PRO Favorites Lock"
              className="rounded-xl bg-[#FFFFFF] p-10 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] text-center space-y-4"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#D97706]">
                <Lock size={22} />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
                  ⚡ Learner PRO Feature
                </span>
                <h2 className="text-base font-bold text-[#121215]">
                  Simpan Favorit &amp; Catatan Pribadi Khusus Member PRO
                </h2>
                <p className="text-xs text-[#5E5E5E] leading-relaxed">
                  Upgrade ke Ruang Sosmed 2.0 Learner PRO untuk menyimpan kelas favorit, menulis catatan pribadi di setiap bab, dan mengakses seluruh modul lanjutan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenUpgradeModal?.()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#121215] hover:bg-[#27272A] px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                <Zap size={13} className="text-[#F59E0B]" fill="currentColor" />
                <span>Upgrade ke Learner PRO</span>
              </button>
            </section>
          ) : (
            /* ASSIGNED TO YOU / MY LEARNING / CATALOG / FAVORITES GRID */
            <section aria-label="Assigned to You Grid" className="space-y-5">
              {/* Dedicated My Learning View: Balanced 2-Column Layout (Left: Overview + Horizontal Folders + Visual Courses | Right: Profile + 2x2 Achievements + Integrated PRO Card) */}
              {activeNavTab === "my-learning" && (() => {
                const totalClasses = assignedItems.length;
                const completedClasses = assignedItems.filter(
                  (i) => i.progressPercent >= 100
                ).length;
                const inProgressClasses = assignedItems.filter(
                  (i) => i.progressPercent > 0 && i.progressPercent < 100
                ).length;
                const avgProgress =
                  totalClasses > 0
                    ? Math.round(
                        assignedItems.reduce(
                          (sum, i) => sum + (i.progressPercent || 0),
                          0
                        ) / totalClasses
                      )
                    : 0;

                const myLearningScopeItems = assignedItems.filter((item) => {
                  if (
                    activeFolderObj &&
                    (item.folderName || "").trim().toLowerCase() !==
                      activeFolderObj.name.trim().toLowerCase()
                  ) {
                    return false;
                  }
                  if (
                    searchQuery.trim() &&
                    !item.title
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) &&
                    !item.type
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  ) {
                    return false;
                  }
                  return true;
                });

                const statusCounts = {
                  "All Status": myLearningScopeItems.length,
                  "Not Started": myLearningScopeItems.filter(
                    (i) => i.progressPercent === 0
                  ).length,
                  "In Progress": myLearningScopeItems.filter(
                    (i) => i.progressPercent > 0 && i.progressPercent < 100
                  ).length,
                  Completed: myLearningScopeItems.filter(
                    (i) => i.progressPercent >= 100
                  ).length,
                };

                const achievementsList = [
                  {
                    id: "first-step",
                    title: "First Step",
                    desc: "Mulai belajar atau selesaikan 1 chapter",
                    unlocked:
                      doneChapters > 0 ||
                      inProgressClasses > 0 ||
                      completedClasses > 0,
                    icon: Flame,
                    color: "text-[#F97316] bg-[#FFF7ED] border-[#FED7AA]",
                  },
                  {
                    id: "point-hunter",
                    title: "Point Hunter",
                    desc: "Kumpulkan minimal 100 ★ pts",
                    unlocked: totalPoints >= 100,
                    icon: Star,
                    color: "text-[#B45309] bg-[#FEF3C7] border-[#FDE68A]",
                  },
                  {
                    id: "class-finisher",
                    title: "Class Finisher",
                    desc: "Selesaikan 1 kelas hingga 100%",
                    unlocked: completedClasses > 0,
                    icon: CheckCircle2,
                    color: "text-[#10B981] bg-[#ECFDF5] border-[#A7F3D0]",
                  },
                  {
                    id: "certified",
                    title: "Certified Learner",
                    desc: "Buka sertifikat resmi cohort",
                    unlocked: certificateUnlocked,
                    icon: Award,
                    color: "text-[#4F39F6] bg-[#EEF2FF] border-[#C7D2FE]",
                  },
                ];

                const baseMyLearning = activeFolderObj
                  ? displayedItems.filter(
                      (item) =>
                        (item.folderName || "").trim().toLowerCase() ===
                        activeFolderObj.name.trim().toLowerCase()
                    )
                  : displayedItems;
                const myLearningItems = sortLearnerCourses(baseMyLearning);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: Unified Header + Folders + Course Cards */}
                    <div className="lg:col-span-8 space-y-5 min-w-0">
                      {/* Card 1: Unified Header & Progress Overview */}
                      <section className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
                        <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
                          {activeFolderObj ? (
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveLearnerFolder(null);
                                    setFolderSearchQuery("");
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 border border-[#EAECEF] px-2.5 py-1 text-xs font-semibold text-[#475569] hover:text-[#121215] transition-colors cursor-pointer"
                                >
                                  <ArrowLeft size={13} />
                                  <span>Semua Folder</span>
                                </button>
                                <span className="text-xs text-[#CBD5E1]">/</span>
                                <div className="inline-flex items-center gap-1.5 min-w-0">
                                  <LearnerMacFolderIcon
                                    color={activeFolderObj.color}
                                    className="w-5 h-4 shrink-0"
                                  />
                                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#121215] truncate">
                                    {activeFolderObj.name}
                                  </h1>
                                </div>
                              </div>
                              {activeFolderObj.description && (
                                <p className="text-xs text-[#5E5E5E] line-clamp-1">
                                  {activeFolderObj.description}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <h1 className="text-xl font-bold tracking-tight text-[#121215]">
                                My Learning
                              </h1>
                              <p className="text-xs text-[#5E5E5E] mt-0.5">
                                Daftar kelas yang sedang Anda ikuti beserta progress belajar yang sedang berjalan.
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setJoinCodeModalOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#4F39F6]/20 px-3 py-1.5 text-xs font-bold text-[#4F39F6] transition-colors cursor-pointer"
                            >
                              <KeyRound size={12} />
                              <span>Redeem Kode Akses</span>
                            </button>
                            <span className="rounded-lg bg-[#4F39F6]/10 border border-[#4F39F6]/20 px-3 py-1.5 text-xs font-bold text-[#4F39F6] tabular-nums">
                              {myLearningItems.length} Kelas
                            </span>
                          </div>
                        </div>

                        {/* Overview Metric Strip */}
                        <div className="border-t border-[#EAECEF] pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]/80">
                            <p className="text-[11px] font-medium text-[#64748B]">
                              Total Kelas
                            </p>
                            <p className="text-base font-extrabold text-[#121215] tabular-nums mt-0.5">
                              {totalClasses} Kelas
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]/80">
                            <p className="text-[11px] font-medium text-[#64748B]">
                              Sedang Berjalan
                            </p>
                            <p className="text-base font-extrabold text-[#4F39F6] tabular-nums mt-0.5">
                              {inProgressClasses} Kelas
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]/80">
                            <p className="text-[11px] font-medium text-[#64748B]">
                              Selesai
                            </p>
                            <p className="text-base font-extrabold text-[#10B981] tabular-nums mt-0.5">
                              {completedClasses} Kelas
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]/80 flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-[#64748B]">
                                Progress
                              </span>
                              <span className="text-sm font-extrabold text-[#4F39F6] tabular-nums">
                                {avgProgress}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-white border border-[#EAECEF] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#4F39F6] transition-all duration-300"
                                style={{ width: `${avgProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Card 2: Proportional Horizontal Folder Series Grid */}
                      {!activeFolderObj &&
                        !searchQuery.trim() &&
                        learnerFolders.length > 0 && (
                          <section
                            aria-label="Folder Series"
                            className="rounded-2xl bg-[#FFFFFF] p-4 sm:p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-3.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#121215]">
                                <FolderOpen
                                  size={15}
                                  className="text-[#4F39F6]"
                                />
                                <span>
                                  Folder Series ({learnerFolders.length})
                                </span>
                              </span>
                              <span className="text-[11px] font-medium text-[#64748B]">
                                Pilih folder untuk fokus pada seri kelasnya
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {learnerFolders.map((folder) => {
                                const isOpening =
                                  openingFolderName === folder.name;
                                return (
                                  <button
                                    key={folder.name}
                                    type="button"
                                    onClick={() =>
                                      handleOpenLearnerFolder(folder.name)
                                    }
                                    title={
                                      folder.description ||
                                      `Buka folder ${folder.name} (${folder.projectName})`
                                    }
                                    className={`group flex items-center gap-3.5 rounded-xl bg-[#F8F9FB]/70 hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6]/45 p-3.5 text-left transition-all cursor-pointer shadow-2xs hover:shadow-[0_6px_18px_rgba(79,57,246,0.07)] ${
                                      isOpening ? "scale-[0.98] opacity-50" : ""
                                    }`}
                                  >
                                    <div className="relative flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAECEF] group-hover:bg-[#EEF2FF]/60 group-hover:border-[#4F39F6]/30 transition-colors">
                                      <LearnerMacFolderIcon
                                        color={folder.color}
                                        className="w-11 h-9 drop-shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform duration-200 group-hover:scale-105"
                                      />
                                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[#4F39F6] text-white text-[10px] font-bold shadow-xs ring-2 ring-white tabular-nums">
                                        {folder.courses.length}
                                      </span>
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-xs sm:text-sm font-bold text-[#121215] group-hover:text-[#4F39F6] line-clamp-1 leading-snug">
                                          {folder.name}
                                        </h3>
                                        <ArrowRight
                                          size={14}
                                          className="shrink-0 mt-0.5 text-[#9CA3AF] group-hover:text-[#4F39F6] group-hover:translate-x-0.5 transition-all"
                                        />
                                      </div>

                                      <span className="inline-flex items-center gap-1.5 max-w-full rounded-full bg-white border border-[#E2E8F0] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                                        <span
                                          className="h-1.5 w-1.5 rounded-full shrink-0"
                                          style={{
                                            backgroundColor:
                                              folder.projectColor,
                                          }}
                                        />
                                        <span className="truncate">
                                          {folder.projectName}
                                        </span>
                                      </span>

                                      <div className="flex items-center gap-2 pt-0.5">
                                        <div className="flex-1 h-1.5 rounded-full bg-[#EAECEF] overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                              width: `${folder.avgPct}%`,
                                              backgroundColor:
                                                folder.avgPct >= 100
                                                  ? "#10B981"
                                                  : "#4F39F6",
                                            }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-semibold text-[#64748B] tabular-nums shrink-0">
                                          {folder.avgPct}% selesai •{" "}
                                          {folder.courses.length} kelas
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        )}

                      {/* Filter Bar: Status Pills with Counts + List/Grid Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FFFFFF] px-4 py-3 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(
                            [
                              "All Status",
                              "Not Started",
                              "In Progress",
                              "Completed",
                            ] as const
                          ).map((st) => {
                            const active = myLearningStatusFilter === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setMyLearningStatusFilter(st)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                  active
                                    ? "bg-[#121215] text-white"
                                    : "bg-[#F8F9FB] text-[#5E5E5E] hover:text-[#121215]"
                                }`}
                              >
                                <span>{st}</span>
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                                    active
                                      ? "bg-white/15 text-white"
                                      : "bg-white text-[#64748B] border border-[#EAECEF]"
                                  }`}
                                >
                                  {statusCounts[st]}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div
                          role="group"
                          aria-label="Mode tampilan daftar kelas"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]"
                        >
                          <button
                            type="button"
                            onClick={() => setMyLearningViewMode("list")}
                            aria-pressed={myLearningViewMode === "list"}
                            title="Tampilan List"
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              myLearningViewMode === "list"
                                ? "bg-[#4F39F6] text-white shadow-2xs"
                                : "text-[#5E5E5E] hover:text-[#121215]"
                            }`}
                          >
                            <ListIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMyLearningViewMode("grid")}
                            aria-pressed={myLearningViewMode === "grid"}
                            title="Tampilan Grid"
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              myLearningViewMode === "grid"
                                ? "bg-[#4F39F6] text-white shadow-2xs"
                                : "text-[#5E5E5E] hover:text-[#121215]"
                            }`}
                          >
                            <LayoutGrid size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Class List / Grid */}
                      {myLearningItems.length === 0 ? (
                        <div className="rounded-2xl bg-[#FFFFFF] p-10 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] text-center space-y-3">
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F9FB] border border-[#EAECEF] text-[#9CA3AF]">
                            <Library size={20} />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-[#121215]">
                              {searchQuery.trim()
                                ? "Kelas Tidak Ditemukan"
                                : activeFolderObj
                                ? `Belum Ada Kelas Status "${myLearningStatusFilter}" di Folder Ini`
                                : `Belum Ada Kelas dengan Status "${myLearningStatusFilter}"`}
                            </h3>
                            <p className="text-xs text-[#5E5E5E] max-w-md mx-auto">
                              {searchQuery.trim()
                                ? `Tidak ada kelas yang cocok dengan kata kunci "${searchQuery}".`
                                : "Coba pilih filter status lain atau buka seluruh folder Anda."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setActiveLearnerFolder(null);
                              setMyLearningStatusFilter("All Status");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                          >
                            Tampilkan Semua Kelas
                          </button>
                        </div>
                      ) : myLearningViewMode === "list" ? (
                        <div className="space-y-3.5">
                          {myLearningItems.map((item) => {
                            const cardAccess = getCardAccessDecision(item);
                            const lockedByPro = !cardAccess.unlocked;
                            const pct = lockedByPro ? 0 : item.progressPercent;
                            const statusLabel =
                              pct >= 100
                                ? "Selesai"
                                : pct > 0
                                ? "Sedang Berjalan"
                                : "Belum Dimulai";
                            const statusStyle =
                              pct >= 100
                                ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                                : pct > 0
                                ? "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE]"
                                : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF]";

                            return (
                              <article
                                key={`ml-list-${item.id}`}
                                onClick={() => handleOpenAssignedCard(item)}
                                className="group rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:border-[#4F39F6]/45 hover:shadow-[0_6px_18px_rgba(79,57,246,0.06)] transition-all cursor-pointer"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                  {/* Left 16:10 Cover Thumbnail */}
                                  {renderCourseCoverMedia(
                                    item,
                                    "relative w-full sm:w-44 h-36 sm:h-28 shrink-0 rounded-xl overflow-hidden border border-[#EAECEF] bg-[#F8F9FB]",
                                    item.urgencyBadge ? (
                                      <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-[#121215]/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                                        <Clock size={10} />
                                        <span>{item.urgencyBadge}</span>
                                      </div>
                                    ) : null
                                  )}

                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <ContentBadge type={item.type} size="sm" />
                                      {item.folderName && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F39F6]">
                                          <Folder size={10} />
                                          <span className="truncate max-w-[180px]">
                                            {item.folderName}
                                          </span>
                                        </span>
                                      )}
                                      <span
                                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}
                                      >
                                        {statusLabel}
                                      </span>
                                      {lockedByPro && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
                                          <Lock size={10} /> PRO
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      <h3 className="text-sm font-bold text-[#121215] group-hover:text-[#4F39F6] transition-colors truncate">
                                        {item.title}
                                      </h3>
                                      <p className="text-xs text-[#5E5E5E] line-clamp-2 mt-0.5 leading-relaxed">
                                        {item.description}
                                      </p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="pt-1 space-y-1">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-semibold text-[#5E5E5E]">
                                          {item.duration} • +{item.pointsReward} pts
                                        </span>
                                        <span
                                          className={`font-bold tabular-nums ${
                                            pct >= 100
                                              ? "text-[#10B981]"
                                              : "text-[#4F39F6]"
                                          }`}
                                        >
                                          {pct}% Completed
                                        </span>
                                      </div>
                                      <div className="h-2 w-full rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-300"
                                          style={{
                                            width: `${pct}%`,
                                            backgroundColor:
                                              pct >= 100
                                                ? "#10B981"
                                                : "#4F39F6",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex sm:flex-col items-center sm:items-end justify-end shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAssignedCard(item);
                                      }}
                                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                                        pct >= 100
                                          ? "bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:bg-[#EAECEF]/60"
                                          : "bg-[#4F39F6] text-white hover:bg-[#3B28CC] shadow-xs"
                                      }`}
                                    >
                                      <span>
                                        {lockedByPro
                                          ? "Upgrade PRO"
                                          : pct >= 100
                                          ? "Ulas Kembali"
                                          : pct > 0
                                          ? "Lanjutkan"
                                          : "Mulai Belajar"}
                                      </span>
                                      <ArrowRight size={13} />
                                    </button>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {myLearningItems.map((item) => {
                            const cardAccess = getCardAccessDecision(item);
                            const lockedByPro = !cardAccess.unlocked;
                            const pct = lockedByPro ? 0 : item.progressPercent;
                            return (
                              <article
                                key={`ml-grid-${item.id}`}
                                onClick={() => handleOpenAssignedCard(item)}
                                className="group rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:border-[#4F39F6]/45 hover:shadow-[0_6px_18px_rgba(79,57,246,0.07)] overflow-hidden flex flex-col justify-between cursor-pointer transition-all"
                              >
                                <div>
                                  {renderCourseCoverMedia(
                                    item,
                                    "relative h-36 w-full overflow-hidden border-b border-[#EAECEF] bg-[#F8F9FB]",
                                    item.urgencyBadge ? (
                                      <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-[#121215]/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                                        <Clock size={10} />
                                        <span>{item.urgencyBadge}</span>
                                      </div>
                                    ) : null
                                  )}

                                  <div className="p-4 space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                        <ContentBadge
                                          type={item.type}
                                          size="sm"
                                        />
                                        {item.folderName && (
                                          <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F39F6] truncate max-w-[150px]">
                                            <Folder
                                              size={10}
                                              className="shrink-0"
                                            />
                                            <span className="truncate">
                                              {item.folderName}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        className={`text-xs font-bold tabular-nums shrink-0 ${
                                          pct >= 100
                                            ? "text-[#10B981]"
                                            : "text-[#4F39F6]"
                                        }`}
                                      >
                                        {pct}% Done
                                      </span>
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-[#121215] group-hover:text-[#4F39F6] transition-colors line-clamp-1">
                                        {item.title}
                                      </h3>
                                      <p className="text-xs text-[#5E5E5E] line-clamp-2 mt-1">
                                        {item.description}
                                      </p>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor:
                                            pct >= 100 ? "#10B981" : "#4F39F6",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="px-4 py-2.5 bg-[#F8F9FB] border-t border-[#EAECEF] flex items-center justify-between text-[11px]">
                                  <span className="text-[#5E5E5E] truncate">
                                    {item.duration} • +{item.pointsReward} pts
                                  </span>
                                  <span className="font-bold text-[#4F39F6] shrink-0 ml-2">
                                    {pct >= 100
                                      ? "Ulas →"
                                      : pct > 0
                                      ? "Lanjutkan →"
                                      : "Mulai →"}
                                  </span>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* RIGHT SIDEBAR: Unified Profile, Compact 2x2 Achievements & Integrated PRO Pass */}
                    <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-[88px] min-w-0">
                      {/* Card 1: Learner Profile */}
                      <section
                        aria-label="Learner Profile Summary"
                        className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-12 w-12 rounded-full overflow-hidden bg-[#4F39F6] text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {activeLearnerAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={activeLearnerAvatar}
                                alt={activeLearnerDisplayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              activeLearnerInitials
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-bold text-[#121215] truncate">
                              {activeLearnerDisplayName}
                            </h2>
                            <p className="text-xs text-[#5E5E5E] truncate">
                              {currentUser?.email || "Social Media Specialist"}
                            </p>
                            <div className="mt-1.5">
                              {learnerIsPro ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                    learnerAccess.isUnlimitedPro
                                      ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]"
                                      : "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F39F6]"
                                  }`}
                                >
                                  <Zap size={10} /> {activeTierLabel}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold text-[#5E5E5E]">
                                  {activeTierLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3-Column Quick Stats */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EAECEF]">
                          <div className="rounded-xl bg-[#F8F9FB] p-2.5 text-center border border-[#EAECEF]/70">
                            <p className="text-sm font-extrabold text-[#121215] tabular-nums">
                              {totalPoints.toLocaleString()}
                            </p>
                            <p className="text-[10px] font-medium text-[#5E5E5E]">
                              Poin ★
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#F8F9FB] p-2.5 text-center border border-[#EAECEF]/70">
                            <p className="text-sm font-extrabold text-[#4F39F6] tabular-nums">
                              {inProgressClasses}
                            </p>
                            <p className="text-[10px] font-medium text-[#5E5E5E]">
                              Berjalan
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#F8F9FB] p-2.5 text-center border border-[#EAECEF]/70">
                            <p className="text-sm font-extrabold text-[#10B981] tabular-nums">
                              {completedClasses}
                            </p>
                            <p className="text-[10px] font-medium text-[#5E5E5E]">
                              Selesai
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectNavTab("profile", "profile")
                            }
                            className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF]/60 border border-[#EAECEF] py-2 px-2.5 text-xs font-semibold text-[#121215] transition-colors cursor-pointer truncate"
                          >
                            Profil Lengkap
                          </button>
                          <button
                            type="button"
                            onClick={() => setCertModalOpen(true)}
                            className={`inline-flex items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                              canCertificate
                                ? "bg-[#10B981] hover:bg-[#059669] text-white"
                                : "bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F39F6] border border-[#4F39F6]/25"
                            }`}
                          >
                            {canCertificate ? (
                              <Award size={12} className="text-white shrink-0" />
                            ) : (
                              <Lock
                                size={11}
                                className="text-[#4F39F6] shrink-0"
                              />
                            )}
                            <span>Sertifikat</span>
                            {!canCertificate && (
                              <span className="inline-flex items-center rounded bg-[#FEF3C7] border border-[#F59E0B]/30 px-1 py-0.2 text-[9px] font-bold text-[#B45309]">
                                PRO
                              </span>
                            )}
                          </button>
                        </div>
                      </section>

                      {/* Card 2: Compact 2x2 Learning Achievements */}
                      <section
                        aria-label="Learning Achievements Summary"
                        className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
                              <Trophy size={14} />
                            </span>
                            <h3 className="text-sm font-bold text-[#121215]">
                              Achievement Belajar
                            </h3>
                          </div>
                          <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#4F39F6] tabular-nums">
                            {achievementsList.filter((a) => a.unlocked).length}/
                            {achievementsList.length}
                          </span>
                        </div>

                        {/* Overall Progress Summary */}
                        <div className="rounded-xl bg-[#F8F9FB] p-3 border border-[#EAECEF] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#5E5E5E]">
                              Rata-rata Progress Kelas
                            </span>
                            <span className="font-extrabold text-[#4F39F6] tabular-nums">
                              {avgProgress}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white border border-[#EAECEF] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#4F39F6] transition-all duration-300"
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[#5E5E5E]">
                            {doneChapters} chapter selesai •{" "}
                            {doneChapters > 0
                              ? `${Math.min(7, doneChapters)}-Day Streak 🔥`
                              : "Mulai belajar untuk bangun streak"}
                          </p>
                        </div>

                        {/* Compact 2x2 Milestone Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {achievementsList.map((ach) => {
                            const AchIcon = ach.icon;
                            return (
                              <div
                                key={ach.id}
                                className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                                  ach.unlocked
                                    ? "bg-white border-[#EAECEF] shadow-2xs"
                                    : "bg-[#F8F9FB]/70 border-dashed border-[#EAECEF] opacity-75"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                                      ach.unlocked
                                        ? ach.color
                                        : "bg-[#F8F9FB] text-[#9CA3AF] border-[#EAECEF]"
                                    }`}
                                  >
                                    <AchIcon size={14} />
                                  </span>
                                  {ach.unlocked ? (
                                    <span className="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[9px] font-bold text-[#059669]">
                                      Diraih
                                    </span>
                                  ) : (
                                    <Lock
                                      size={11}
                                      className="text-[#9CA3AF] shrink-0"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#121215] truncate">
                                    {ach.title}
                                  </p>
                                  <p className="text-[10px] text-[#5E5E5E] line-clamp-2 leading-tight mt-0.5">
                                    {ach.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* Card 3: Integrated Learner PRO Pass Card */}
                      {!learnerIsPro && showProPushPanel && renderProUpgradeCard()}
                    </aside>
                  </div>
                );
              })()}

              {(activeNavTab === "catalog" || activeNavTab === "favorites") && (() => {
                const isProjectFilterScope =
                  activeNavTab === "catalog" &&
                  selectedProjectFilter !== "All";

                const visibleFolders = isProjectFilterScope
                  ? learnerFolders.filter(
                      (f) =>
                        f.projectName.trim().toLowerCase() ===
                        selectedProjectFilter.trim().toLowerCase()
                    )
                  : learnerFolders;

                const getCourseProjectName = (course: LearnerAssignedItem) => {
                  const expMatch = explorerItems.find(
                    (e) =>
                      e.type !== "Folder" &&
                      e.title.trim().toLowerCase() ===
                        course.title.trim().toLowerCase()
                  );
                  if (expMatch?.cohort?.trim()) return expMatch.cohort.trim();
                  if (course.folderName?.trim()) {
                    const folderMatch = learnerFolders.find(
                      (f) =>
                        f.name.trim().toLowerCase() ===
                        course.folderName!.trim().toLowerCase()
                    );
                    if (folderMatch?.projectName) return folderMatch.projectName;
                  }
                  return "Ruang Sosmed Class";
                };

                const standaloneItems = displayedItems.filter(
                  (item) => !item.folderName?.trim()
                );

                const normalizedFolderSearch = folderSearchQuery
                  .trim()
                  .toLowerCase();
                const rawVisibleCourseCards = activeFolderObj
                  ? displayedItems.filter((item) => {
                      const inFolder =
                        (item.folderName || "").trim().toLowerCase() ===
                        activeFolderObj.name.trim().toLowerCase();
                      if (!inFolder) return false;
                      if (!normalizedFolderSearch) return true;
                      return (
                        item.title
                          .toLowerCase()
                          .includes(normalizedFolderSearch) ||
                        item.type
                          .toLowerCase()
                          .includes(normalizedFolderSearch) ||
                        item.description
                          .toLowerCase()
                          .includes(normalizedFolderSearch)
                      );
                    })
                  : searchQuery.trim() ||
                    activeNavTab === "favorites" ||
                    selectedFolderFilter !== "All"
                  ? displayedItems
                  : learnerFolders.length > 0
                  ? []
                  : standaloneItems;

                const baseVisibleCourseCards =
                  !activeFolderObj && isProjectFilterScope
                    ? rawVisibleCourseCards.filter(
                        (item) =>
                          getCourseProjectName(item).toLowerCase() ===
                          selectedProjectFilter.trim().toLowerCase()
                      )
                    : rawVisibleCourseCards;

                const visibleCourseCards = sortLearnerCourses(
                  baseVisibleCourseCards
                );

                const activeProjectObj = isProjectFilterScope
                  ? availableProjects.find(
                      (p) =>
                        p.name.trim().toLowerCase() ===
                        selectedProjectFilter.trim().toLowerCase()
                    ) || null
                  : null;

                const activeGridColsClass = activeFolderObj
                  ? learnerFolderScale >= 108
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3"
                    : learnerFolderScale <= 64
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

                const folderSortLabel =
                  learnerFolderSort === "title"
                    ? "A-Z"
                    : learnerFolderSort === "progress"
                    ? "Progress"
                    : "Urutan";

                return (
                <>
              {/* Section Header Bar (Compact & To the Point) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {activeFolderObj ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLearnerFolder(null);
                          setFolderSearchQuery("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#121215] transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Semua Folder</span>
                      </button>
                      <span className="text-xs text-[#CBD5E1]">/</span>
                      <div className="inline-flex items-center gap-2 flex-wrap">
                        <LearnerMacFolderIcon
                          color={activeFolderObj.color}
                          className="w-6 h-5"
                        />
                        <h2 className="text-base font-bold text-[#121215]">
                          {activeFolderObj.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: activeFolderObj.projectColor }}
                          />
                          <span>{activeFolderObj.projectName}</span>
                        </span>
                        <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                          {activeFolderObj.courses.length} materi •{" "}
                          {activeFolderObj.avgPct}%
                        </span>
                      </div>
                    </div>
                    {activeFolderObj.description && (
                      <p className="text-xs text-[#5E5E5E]">
                        {activeFolderObj.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#121215]">
                      {activeNavTab === "favorites"
                        ? "Favorit Tersimpan"
                        : activeNavTab === "catalog"
                        ? "Katalog Kelas Anda"
                        : "Folder & Materi Belajar"}
                    </h2>
                    <p className="text-xs text-[#5E5E5E]">
                      {activeNavTab === "favorites"
                        ? "Daftar materi dan wiki yang Anda tandai sebagai favorit."
                        : "Klik folder series untuk membuka seluruh materi belajar di dalamnya."}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {activeNavTab === "catalog" &&
                    !activeFolderObj &&
                    availableProjects.length > 0 && (
                      <label className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#EAECEF] px-2.5 py-1.5 text-xs font-semibold text-[#475569] shadow-2xs">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              activeProjectObj?.color || "#4F39F6",
                          }}
                        />
                        <span className="text-[11px] text-[#64748B]">
                          Project:
                        </span>
                        <select
                          aria-label="Filter berdasarkan Project"
                          value={selectedProjectFilter}
                          onChange={(e) =>
                            setSelectedProjectFilter(e.target.value)
                          }
                          className="bg-transparent text-xs font-bold text-[#121215] focus:outline-none cursor-pointer pr-1"
                        >
                          <option value="All">Semua Project</option>
                          {availableProjects.map((proj) => (
                            <option key={proj.name} value={proj.name}>
                              {proj.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                  {(learnerFolders.length > 0 || activeFolderObj) &&
                    renderLearnerFinderControls()}

                  {activeFolderObj && (
                    <>
                      <div className="relative w-40 sm:w-48">
                        <Search
                          size={12}
                          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                        />
                        <input
                          type="search"
                          value={folderSearchQuery}
                          onChange={(e) => setFolderSearchQuery(e.target.value)}
                          placeholder={`Cari di ${activeFolderObj.name}...`}
                          aria-label={`Cari materi di folder ${activeFolderObj.name}`}
                          className="w-full rounded-lg bg-white pl-7 pr-2.5 py-1.5 text-xs text-[#121215] placeholder:text-[#94A3B8] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setLearnerFolderSort((prev) =>
                            prev === "default"
                              ? "title"
                              : prev === "title"
                              ? "progress"
                              : "default"
                          )
                        }
                        title={`Urutkan materi: ${folderSortLabel}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#121215] cursor-pointer"
                      >
                        <ArrowUpDown size={12} />
                        <span>{folderSortLabel}</span>
                      </button>

                      <div
                        role="group"
                        aria-label="Mode tampilan isi folder"
                        className="inline-flex items-center rounded-lg bg-white p-0.5 border border-[#EAECEF]"
                      >
                        <button
                          type="button"
                          onClick={() => setLearnerCourseViewMode("grid")}
                          aria-pressed={learnerCourseViewMode === "grid"}
                          title="Tampilan Grid"
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
                            learnerCourseViewMode === "grid"
                              ? "bg-[#4F39F6] text-white"
                              : "text-[#5E5E5E] hover:text-[#121215]"
                          }`}
                        >
                          <LayoutGrid size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLearnerCourseViewMode("list")}
                          aria-pressed={learnerCourseViewMode === "list"}
                          title="Tampilan List"
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
                            learnerCourseViewMode === "list"
                              ? "bg-[#4F39F6] text-white"
                              : "text-[#5E5E5E] hover:text-[#121215]"
                          }`}
                        >
                          <ListIcon size={12} />
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setJoinCodeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#4F39F6]/20 px-3 py-1.5 text-xs font-bold text-[#4F39F6] transition-colors cursor-pointer"
                  >
                    <KeyRound size={12} />
                    <span>Redeem Kode Akses</span>
                  </button>
                </div>
              </div>

              {/* Finder Folder Grid (Read-Only untuk Siswa, Zoomable via Slider & Tombol) */}
              {!activeFolderObj &&
                !searchQuery.trim() &&
                activeNavTab !== "favorites" &&
                selectedFolderFilter === "All" &&
                visibleFolders.length > 0 && (
                  <div className="rounded-2xl bg-white border border-[#EAECEF] p-4 sm:p-5 shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#475569]">
                        <FolderOpen size={14} className="text-[#4F39F6]" />
                        <span>
                          Folder Series ({visibleFolders.length})
                          {isProjectFilterScope ? ` • ${selectedProjectFilter}` : ""}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        Klik folder untuk melihat materi di dalamnya
                      </span>
                    </div>

                    <div className="flex flex-wrap items-start gap-4 py-1">
                      {visibleFolders.map((folder) =>
                        renderLearnerFolderTile(folder)
                      )}
                    </div>
                  </div>
                )}

              {(() => {
                const shownWikiTitles = new Set(
                  visibleCourseCards
                    .filter((c) => c.type === "Wiki")
                    .map((c) => c.title.trim().toLowerCase())
                );
                const catalogWikiArticles =
                  activeNavTab === "catalog" && !activeFolderObj
                    ? publishedWikiArticles.filter((w) => {
                        if (shownWikiTitles.has(w.title.trim().toLowerCase())) {
                          return false;
                        }
                        if (isProjectFilterScope) {
                          const wProj = (w.cohort || "Ruang Sosmed Class")
                            .trim()
                            .toLowerCase();
                          if (wProj !== selectedProjectFilter.trim().toLowerCase()) {
                            return false;
                          }
                        }
                        if (searchQuery.trim()) {
                          const q = searchQuery.trim().toLowerCase();
                          if (
                            !w.title.toLowerCase().includes(q) &&
                            !(w.description || "").toLowerCase().includes(q) &&
                            !(w.category || "").toLowerCase().includes(q)
                          ) {
                            return false;
                          }
                        }
                        return true;
                      })
                    : [];

                return (
                  <>
              {assignedItems.length === 0 &&
              learnerFolders.length === 0 &&
              catalogWikiArticles.length === 0 ? (
                <div className="rounded-xl bg-[#FFFFFF] p-8 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] text-center space-y-2.5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F9FB] border border-[#EAECEF] text-[#9CA3AF]">
                    <Heart size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    {activeNavTab === "favorites"
                      ? "Belum Ada Materi Favorit"
                      : "Belum Ada Materi yang Di-assign untuk Anda"}
                  </h3>
                  <p className="text-xs text-[#5E5E5E] max-w-md mx-auto">
                    {activeNavTab === "favorites"
                      ? "Klik ikon hati pada kursus untuk menyimpannya ke Favorit."
                      : "Silakan masukkan Kode Akses Materi / Folder dari mentor atau tunggu materi kelas Anda diaktifkan."}
                  </p>
                </div>
              ) : visibleCourseCards.length === 0 &&
                catalogWikiArticles.length === 0 ? (
                activeFolderObj ||
                searchQuery.trim() ||
                folderSearchQuery.trim() ||
                activeNavTab === "favorites" ||
                (isProjectFilterScope && visibleFolders.length === 0) ? (
                  <div className="rounded-xl bg-[#FFFFFF] p-8 border border-[#EAECEF] text-center space-y-2.5">
                    <p className="text-xs font-semibold text-[#121215]">
                      {folderSearchQuery.trim() && activeFolderObj
                        ? `Tidak ada materi yang cocok dengan "${folderSearchQuery}" di folder ${activeFolderObj.name}.`
                        : searchQuery.trim()
                        ? `Tidak ada materi yang cocok dengan "${searchQuery}".`
                        : activeNavTab === "favorites"
                        ? "Belum ada materi favorit tersimpan."
                        : isProjectFilterScope && visibleFolders.length === 0
                        ? `Belum ada folder atau materi di project "${selectedProjectFilter}".`
                        : "Belum ada materi di dalam folder ini."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFolderSearchQuery("");
                        setSelectedProjectFilter("All");
                        if (!activeFolderObj || !folderSearchQuery.trim()) {
                          setActiveLearnerFolder(null);
                          setSelectedFolderFilter("All");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <span>
                        {folderSearchQuery.trim() && activeFolderObj
                          ? "Reset Pencarian Folder"
                          : isProjectFilterScope
                          ? "Tampilkan Semua Project"
                          : "Tampilkan Semua"}
                      </span>
                    </button>
                  </div>
                ) : null
              ) : (
                <>
                {visibleCourseCards.length > 0 && (
                <div className="space-y-3">
                  {activeFolderObj && learnerCourseViewMode === "list" ? (
                    <div className="space-y-2.5">
                      {visibleCourseCards.map((item) => {
                        if (item.type === "Wiki") {
                          const matchedWiki = explorerItems.find(
                            (e) =>
                              e.type === "Wiki" &&
                              (e.id === item.id ||
                                e.title.trim().toLowerCase() ===
                                  item.title.trim().toLowerCase())
                          );
                          const readTime = estimateWikiReadTime(
                            matchedWiki?.wikiSections,
                            matchedWiki?.wikiReadTime
                          );
                          return (
                            <article
                              key={`folder-list-${item.id}`}
                              onClick={() => handleOpenAssignedCard(item)}
                              className="group rounded-xl bg-white border border-[#EAECEF] p-3.5 shadow-[0_1px_4px_rgba(16,15,17,0.03)] hover:border-[#8B5CF6]/55 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                                    📖 Bacaan Wiki &amp; SOP
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B]">
                                    <Clock size={10} className="text-[#7C3AED]" />
                                    {readTime}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-[#121215] group-hover:text-[#6D28D9] truncate">
                                  {item.title}
                                </h3>
                                <p className="text-xs text-[#5E5E5E] line-clamp-1">
                                  {item.description}
                                </p>
                              </div>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-[#6D28D9] text-white px-3.5 py-1.5 text-xs font-bold shrink-0">
                                <span>Baca Artikel</span>
                                <ArrowRight size={12} />
                              </span>
                            </article>
                          );
                        }

                        const cardAccess = getCardAccessDecision(item);
                        const lockedByPro = !cardAccess.unlocked;
                        const pct = lockedByPro ? 0 : item.progressPercent;
                        return (
                          <article
                            key={`folder-list-${item.id}`}
                            onClick={() => handleOpenAssignedCard(item)}
                            className="group rounded-xl bg-white border border-[#EAECEF] p-3.5 shadow-[0_1px_4px_rgba(16,15,17,0.03)] hover:border-[#4F39F6]/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <ContentBadge type={item.type} size="sm" />
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B]">
                                  <Clock size={10} />
                                  {item.duration}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B45309]">
                                  <Star
                                    size={10}
                                    className="text-[#F59E0B]"
                                    fill="#F59E0B"
                                  />
                                  +{item.pointsReward} pts
                                </span>
                                {isProItem(item) && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
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
                                {item.title}
                              </h3>
                              <p className="text-xs text-[#5E5E5E] line-clamp-1">
                                {item.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="w-24 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span
                                    className={
                                      pct >= 100
                                        ? "text-[#10B981]"
                                        : "text-[#4F39F6]"
                                    }
                                  >
                                    {pct}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-[#EAECEF] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor:
                                        pct >= 100 ? "#10B981" : "#4F39F6",
                                    }}
                                  />
                                </div>
                              </div>

                              {showFavoritesPage && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canNotesFavorites) {
                                      onShowToast(
                                        `🔒 Simpan Favorit terkunci pada paket ${activeTierLabel}. Silakan upgrade paket.`
                                      );
                                      onOpenUpgradeModal?.();
                                      return;
                                    }
                                    toggleLearnerItemFavorite(item.id);
                                  }}
                                  aria-label={`Favorite ${item.title}`}
                                  className="p-1.5 rounded-lg bg-[#F8F9FB] hover:bg-white border border-[#EAECEF] text-[#9CA3AF] hover:text-[#EC4899] transition-colors cursor-pointer"
                                >
                                  <Heart
                                    size={13}
                                    className={
                                      item.isFavorite && canNotesFavorites
                                        ? "text-[#EC4899]"
                                        : ""
                                    }
                                    fill={
                                      item.isFavorite && canNotesFavorites
                                        ? "#EC4899"
                                        : "transparent"
                                    }
                                  />
                                </button>
                              )}

                              <span className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] text-white px-3 py-1.5 text-xs font-bold">
                                <span>
                                  {lockedByPro
                                    ? "Upgrade PRO"
                                    : pct >= 100
                                    ? "Ulas"
                                    : pct > 0
                                    ? "Lanjut"
                                    : "Mulai"}
                                </span>
                                <ArrowRight size={12} />
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                  <div className={`grid ${activeGridColsClass} gap-4`}>
                    {visibleCourseCards.map((item) => {
                    if (item.type === "Wiki") {
                      const matchedWiki = explorerItems.find(
                        (e) =>
                          e.type === "Wiki" &&
                          (e.id === item.id ||
                            e.title.trim().toLowerCase() ===
                              item.title.trim().toLowerCase())
                      );
                      return (
                        <WikiArticleCard
                          key={item.id}
                          id={matchedWiki?.id || item.id}
                          title={item.title}
                          category={matchedWiki?.category}
                          description={matchedWiki?.description || item.description}
                          editedDate={matchedWiki?.editedDate}
                          folderName={matchedWiki?.folderName || item.folderName}
                          wikiSections={matchedWiki?.wikiSections}
                          wikiAttachments={matchedWiki?.wikiAttachments}
                          wikiReadTime={matchedWiki?.wikiReadTime}
                          isAdmin={false}
                          onOpen={() => handleOpenAssignedCard(item)}
                        />
                      );
                    }

                    const cardAccess = getCardAccessDecision(item);
                    const lockedByPro = !cardAccess.unlocked;

                    return (
                      <article
                        key={item.id}
                        onClick={() => handleOpenAssignedCard(item)}
                        className="group flex flex-col justify-between overflow-hidden rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:border-[#4F39F6]/50 hover:shadow-[0_6px_20px_rgba(79,57,246,0.08)] transition-all cursor-pointer w-full"
                      >
                        <div>
                          {/* Top Cover Banner (Compact & Balanced Proportion) */}
                          {renderCourseCoverMedia(
                            item,
                            "relative h-36 sm:h-40 w-full overflow-hidden border-b border-[#EAECEF] bg-[#F8F9FB]",
                            <>
                              {/* Top-Left Urgency Badge on Banner */}
                              <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-[#121215]/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                                <Clock size={10} />
                                <span>{item.urgencyBadge}</span>
                              </div>

                              {/* Top-Right Favorite Heart on Banner */}
                              {showFavoritesPage && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canNotesFavorites) {
                                      onShowToast(
                                        `🔒 Simpan Favorit terkunci pada paket ${activeTierLabel}. Silakan upgrade paket.`
                                      );
                                      onOpenUpgradeModal?.();
                                      return;
                                    }
                                    toggleLearnerItemFavorite(item.id);
                                  }}
                                  aria-label={`Favorite ${item.title}`}
                                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/85 backdrop-blur-xs hover:bg-white text-[#9CA3AF] hover:text-[#EC4899] shadow-sm transition-all cursor-pointer z-10"
                                >
                                  <Heart
                                    size={14}
                                    className={
                                      item.isFavorite && canNotesFavorites
                                        ? "text-[#EC4899]"
                                        : ""
                                    }
                                    fill={
                                      item.isFavorite && canNotesFavorites
                                        ? "#EC4899"
                                        : "transparent"
                                    }
                                  />
                                </button>
                              )}
                            </>
                          )}

                          {/* Card Content Body */}
                          <div className="p-3.5 space-y-1.5">
                            {/* Type, Folder Series & PRO Badge */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <ContentBadge type={item.type} size="sm" />
                              {item.folderName && (
                                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-[#EEF2FF] text-[#4F39F6] border border-[#4F39F6]/20">
                                  <Folder size={9} />
                                  <span>{item.folderName}</span>
                                </span>
                              )}
                              {isProItem(item) && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${
                                    !lockedByPro
                                      ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#059669]"
                                      : "bg-[#FEF3C7] border-[#F59E0B]/40 text-[#92400E]"
                                  }`}
                                >
                                  {lockedByPro ? (
                                    <Lock size={9} />
                                  ) : (
                                    <Zap size={9} fill="currentColor" />
                                  )}
                                  <span>
                                    {item.type === "Assignment"
                                      ? "PRO • 1-on-1 Review"
                                      : "PRO Advance"}
                                  </span>
                                </span>
                              )}
                            </div>

                            <h3 className="text-xs sm:text-sm font-bold text-[#121215] group-hover:text-[#4F39F6] transition-colors line-clamp-1 leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-[#5E5E5E] line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>

                            {/* Skill Tags */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.skillTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-[#F8F9FB] border border-[#EAECEF] px-1.5 py-0.5 text-[10px] font-medium text-[#5E5E5E]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer: Progress Bar + Points Reward with Balanced Padding */}
                        <div className="px-3.5 py-3 border-t border-[#EAECEF] bg-[#F9FAFB]/60 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-[#5E5E5E]">
                              {lockedByPro ? (
                                <span className="inline-flex items-center gap-1 text-[#B45309] font-bold">
                                  <Lock size={11} />
                                  {cardAccess.canUnlockWithPoints ||
                                  cardAccess.canBuyPerMaterial
                                    ? "Buka dgn Poin / Upgrade"
                                    : "Locked • Upgrade Paket"}
                                </span>
                              ) : item.progressPercent === 100 ? (
                                <span className="inline-flex items-center gap-1 text-[#10B981] font-bold">
                                  <CheckCircle2 size={12} />
                                  Completed
                                </span>
                              ) : item.progressPercent === 0 ? (
                                "Not Started (0%)"
                              ) : (
                                `${item.progressPercent}% Progress`
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-[#B45309]">
                              <Star
                                size={11}
                                className="text-[#F59E0B]"
                                fill="#F59E0B"
                              />
                              +{item.pointsReward} pts
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#EAECEF] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${lockedByPro ? 0 : item.progressPercent}%`,
                                backgroundColor:
                                  item.progressPercent === 100
                                    ? "#10B981"
                                    : "#4F39F6",
                              }}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  </div>
                  )}
                </div>
                )}

                {catalogWikiArticles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                          📘 Bacaan Wiki &amp; Playbook SOP
                        </span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                          Artikel Bacaan &amp; Panduan ({catalogWikiArticles.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-[#64748B]">
                        Klik kartu untuk membaca artikel lengkap bergaya Notion
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {catalogWikiArticles.map((wiki) => (
                        <WikiArticleCard
                          key={`cat-wiki-${wiki.id}`}
                          id={wiki.id}
                          title={wiki.title}
                          category={wiki.category}
                          description={wiki.description}
                          editedDate={wiki.editedDate}
                          folderName={wiki.folderName}
                          wikiSections={wiki.wikiSections}
                          wikiAttachments={wiki.wikiAttachments}
                          wikiReadTime={wiki.wikiReadTime}
                          isAdmin={false}
                          onOpen={() =>
                            setScreenState({
                              screen: "wiki-reader",
                              wikiIdOrTitle: wiki.id || wiki.title,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
                </>
              )}
                  </>
                );
              })()}
                </>
                );
              })()}
            </section>
          )}

          {/* Modal: Redeem Kode Akses Materi / Folder */}
          <ModalDialog
            open={joinCodeModalOpen}
            onClose={() => setJoinCodeModalOpen(false)}
            titleId="join-folder-code-title"
            title="Redeem Kode Akses Materi / Folder"
            subtitle="Masukkan kode unik dari Admin / Mentor untuk langsung membuka materi spesifik atau seluruh isi folder secara otomatis."
            maxWidthClass="max-w-md"
          >
            <form onSubmit={handleRedeemCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Kode Akses Materi / Folder
                </label>
                <div className="relative flex items-center">
                  <KeyRound
                    size={15}
                    className="absolute left-3 text-[#4F39F6] pointer-events-none"
                  />
                  <input
                    type="text"
                    autoFocus
                    required
                    value={folderCodeInput}
                    onChange={(e) =>
                      setFolderCodeInput(e.target.value.toUpperCase())
                    }
                    placeholder="Contoh: MBSM-B01 atau MBI-2026"
                    className="w-full rounded-xl bg-[#F8F9FB] pl-9 pr-3 py-2.5 text-sm font-bold uppercase tracking-wider text-[#121215] placeholder:normal-case placeholder:font-normal placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-white focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
                <button
                  type="button"
                  onClick={() => setJoinCodeModalOpen(false)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!folderCodeInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <KeyRound size={13} />
                  <span>Gunakan Kode</span>
                </button>
              </div>
            </form>
          </ModalDialog>

          {/* Modal: Konfirmasi Berhasil Membuka Materi / Folder Series */}
          <ModalDialog
            open={Boolean(unlockedFolderModal)}
            onClose={() => setUnlockedFolderModal(null)}
            titleId="folder-unlocked-modal-title"
            title={
              unlockedFolderModal?.unlockType === "content"
                ? "🔓 Materi Berhasil Dibuka!"
                : "🔓 Folder Series Terbuka!"
            }
            subtitle="Akses kelas otomatis aktif di akun Anda"
            maxWidthClass="max-w-sm"
          >
            {unlockedFolderModal && (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5] border border-[#10B981]/30 text-[#10B981]">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#121215]">
                    {unlockedFolderModal.unlockType === "content"
                      ? `Materi “${unlockedFolderModal.unlockedTitle || unlockedFolderModal.folderTitle}”`
                      : `Folder “${unlockedFolderModal.folderTitle}”`}
                  </p>
                  <p className="text-xs text-[#5E5E5E] leading-relaxed">
                    {unlockedFolderModal.unlockType === "content" ? (
                      <>
                        Kode <strong>{unlockedFolderModal.codeUsed}</strong> berhasil diverifikasi! Materi ini otomatis ter-assign dan kini muncul di daftar belajar Anda.
                      </>
                    ) : (
                      <>
                        Kode <strong>{unlockedFolderModal.codeUsed}</strong> berhasil diverifikasi! Sebanyak{" "}
                        <strong>{unlockedFolderModal.courseCount} materi</strong> di folder ini kini muncul di daftar belajar Anda.
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUnlockedFolderModal(null)}
                  className="w-full rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
                >
                  Mulai Belajar Sekarang
                </button>
              </div>
            )}
          </ModalDialog>

          {/* Official Ruang Sosmed 2.0 Certificate Modal */}
          <OfficialCertificateModal
            open={certModalOpen}
            onClose={() => setCertModalOpen(false)}
            learnerName={learnerDisplayName}
            learnerRole="Social Media Specialist"
            courseTitle={
              assignedItems[0]?.title || "Ruang Sosmed 2.0 Track"
            }
            credentialId={
              learnerCertificateCourses[0]?.credentialId || "RS2-2026-8492"
            }
            courses={learnerCertificateCourses}
            isLockedPro={!canCertificate}
            onRequestUpgrade={onOpenUpgradeModal}
            onShowToast={onShowToast}
          />

          {/* Ruang Sosmed Rewards Shop Modal */}
          <LearnerRewardsModal
            open={rewardsModalOpen}
            onClose={() => setRewardsModalOpen(false)}
            learnerName={learnerDisplayName}
            learnerEmail={currentUser?.email}
            onShowToast={onShowToast}
          />

          {/* Unlock Module / Materi Satuan via Points or Purchase Modal */}
          <UnlockModuleModal
            target={unlockModalTarget}
            onClose={() => setUnlockModalTarget(null)}
            onUnlockedChapter={() => {
              const unlockedCourse = unlockModalTarget?.courseTitle;
              setUnlockModalTarget(null);
              if (unlockedCourse) {
                setScreenState({
                  screen: "course-overview",
                  courseTitle: unlockedCourse,
                });
              }
            }}
            onOpenUpgradeToPro={() => {
              setUnlockModalTarget(null);
              onOpenUpgradeModal?.();
            }}
            onShowToast={onShowToast}
          />

          {/* Celebration Popup when points are awarded by Admin */}
          <ModalDialog
            open={Boolean(awardedPointsPopup)}
            onClose={() => setAwardedPointsPopup(null)}
            titleId="points-awarded-popup-title"
            title="🎉 Poin Bintang Telah Diterima!"
            subtitle="Pemberian apresiasi poin dari Admin Studio"
            maxWidthClass="max-w-sm"
          >
            {awardedPointsPopup && (
              <div className="text-center py-2 px-1 space-y-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FEF3C7] border border-[#F59E0B]/30 shadow-md">
                  <Star size={44} className="text-[#F59E0B] animate-pulse" fill="#F59E0B" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20">
                    ✓ Poin Berhasil Masuk
                  </span>
                  <h3 className="text-2xl font-black text-[#121215] mt-2">
                    +{awardedPointsPopup.addedPoints.toLocaleString()} ★ Pts
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 max-w-xs mx-auto">
                    {awardedPointsPopup.reason
                      ? `Alasan: ${awardedPointsPopup.reason}`
                      : "Poin telah otomatis masuk ke dompet belajar Anda dan dapat ditukarkan di Rewards Shop."}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B]">Total Saldo Sekarang:</span>
                  <span className="text-base font-extrabold text-[#B45309] flex items-center gap-1">
                    <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                    {awardedPointsPopup.newTotal.toLocaleString()} pts
                  </span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAwardedPointsPopup(null);
                      setRewardsModalOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] border border-[#F59E0B]/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    🎁 Tukar Hadiah
                  </button>
                  <button
                    type="button"
                    onClick={() => setAwardedPointsPopup(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    Lanjut Belajar
                  </button>
                </div>
              </div>
            )}
          </ModalDialog>
          </main>

          {/* Right-Side Push Popup for Learner PRO Upgrade (Slides Right-to-Left Ease-In & Pushes Main Content, Slides Left-to-Right Ease-Out on Close / Tidak Tertarik, Re-appears every 5 mins while !learnerIsPro) */}
          {!learnerIsPro && activeNavTab !== "my-learning" && (
            <aside
              aria-label="Ruang Sosmed 2.0 Learner PRO Subscription"
              aria-hidden={!showProPushPanel}
              hidden={proPanelHiddenAttr && !showProPushPanel}
              onTransitionEnd={(e) => {
                if (
                  e.propertyName === "inline-size" &&
                  !showProPushPanel
                ) {
                  setProPanelHiddenAttr(true);
                }
              }}
              className={`pro-push-panel shrink-0 self-start lg:sticky lg:top-[88px] mt-6 lg:mt-0 ${
                showProPushPanel ? "is-open" : ""
              }`}
            >
              <div className="w-full lg:w-[320px]">
                {renderProUpgradeCard()}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Bottom-Left Sidebar Quick Profile & Settings Dock (Hidden on Profile/Settings to keep page unobstructed) */}
      {activeNavTab !== "profile" && (
        <aside
          aria-label="Learner Quick Profile & Settings Rail"
          className="fixed bottom-4 left-3 z-40 flex flex-col items-center gap-2 rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-2 shadow-[0_4px_16px_rgba(16,15,17,0.08)]"
        >
          <ThemeSwitchDockButton />

          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleSelectNavTab("profile", "manual-setup")}
              aria-label="Pengaturan Profil"
              aria-current={undefined}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215]"
            >
              <Settings size={17} strokeWidth={2} />
            </button>
            <div
              role="tooltip"
              className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-[44px] z-50 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
            >
              Pengaturan Profil
            </div>
          </div>

          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleSelectNavTab("profile", "profile")}
              aria-label={`Learner Profile: ${activeLearnerDisplayName}`}
              aria-current={undefined}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold tracking-tight transition-all cursor-pointer overflow-hidden border-[#F59E0B]/40 hover:ring-2 hover:ring-[#F59E0B]/40 ${
                activeLearnerAvatar ? "bg-[#FFFFFF]" : "bg-[#FDE68A] text-[#92400E]"
              }`}
            >
              {activeLearnerAvatar ? (
                <img
                  src={activeLearnerAvatar}
                  alt={activeLearnerDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                activeLearnerInitials
              )}
            </button>
            <div
              role="tooltip"
              className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-[44px] z-50 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
            >
              {activeLearnerDisplayName} • Buka Halaman Profil
            </div>
          </div>

          {onLogout && (
            <div className="relative group flex items-center justify-center pt-1.5 border-t border-[#EAECEF] w-full">
              <button
                type="button"
                onClick={onLogout}
                aria-label="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors cursor-pointer"
              >
                <LogOut size={16} strokeWidth={2} />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-[44px] z-50 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
              >
                Keluar (Logout)
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Rumi Floating Assistant (Hidden on Profile/Settings so it never covers profile settings) */}
      {activeNavTab !== "profile" && (() => {
        const rumiContextId: RumiPageContextId =
          screenState.screen === "course-overview"
            ? "learner:course-overview"
            : screenState.screen === "classroom"
            ? "learner:classroom"
            : screenState.screen === "quiz-runner"
            ? "learner:quiz-runner"
            : screenState.screen === "wiki-reader"
            ? "learner:wiki-reader"
            : activeNavTab === "my-learning"
            ? "learner:my-learning"
            : activeNavTab === "catalog"
            ? "learner:catalog"
            : activeNavTab === "wiki"
            ? "learner:wiki"
            : activeNavTab === "favorites"
            ? "learner:favorites"
            : "learner:home";

        const rumiSubtitle =
          screenState.screen === "course-overview" ||
          screenState.screen === "classroom"
            ? screenState.courseTitle
            : screenState.screen === "quiz-runner"
            ? screenState.quizTitle
            : screenState.screen === "wiki-reader"
            ? screenState.wikiIdOrTitle
            : undefined;

        const rumiLevelInfo = resolveRumiLevelInfo(rumiXpState.totalXp);
        const subStatusInfo = getSubscriptionStatusInfo({
          isProTier: learnerIsPro,
          expiresAt: proExpiresAt,
        });
        const learnerUserKey =
          (
            currentUser?.email ||
            currentUser?.username ||
            currentUser?.name ||
            ""
          )
            .trim()
            .toLowerCase() || "guest";

        const quickActions: RumiQuickAction[] = [
          {
            id: "deck-home",
            label: "Beranda",
            sublabel: "Ringkasan",
            shortcutKey: "1",
            icon: "home",
            accent: "indigo",
            isActive:
              screenState.screen === "dashboard" && activeNavTab === "home",
            onClick: () => handleSelectNavTab("home"),
          },
          {
            id: "deck-my-learning",
            label: "My Learning",
            sublabel: "Kelas Saya",
            shortcutKey: "2",
            icon: "learning",
            accent: "sky",
            isActive:
              screenState.screen === "dashboard" &&
              activeNavTab === "my-learning",
            onClick: () => handleSelectNavTab("my-learning"),
          },
          {
            id: "deck-catalog",
            label: "Katalog",
            sublabel: "Cari Kelas",
            shortcutKey: "3",
            icon: "catalog",
            accent: "emerald",
            isActive:
              screenState.screen === "dashboard" && activeNavTab === "catalog",
            onClick: () => handleSelectNavTab("catalog"),
          },
          {
            id: "deck-favorites",
            label: "Favorit",
            sublabel: "Tersimpan",
            shortcutKey: "4",
            icon: "favorites",
            accent: "rose",
            isActive:
              screenState.screen === "dashboard" &&
              activeNavTab === "favorites",
            onClick: () => handleSelectNavTab("favorites"),
          },
          {
            id: "deck-rewards",
            label: "Hadiah",
            sublabel: "Tukar Poin",
            shortcutKey: "5",
            icon: "rewards",
            accent: "amber",
            isActive: rewardsModalOpen,
            onClick: () => setRewardsModalOpen(true),
          },
          {
            id: "deck-pro",
            label: "Akses PRO",
            sublabel: learnerIsPro ? "Status PRO" : "Kode / Upgrade",
            shortcutKey: "6",
            icon: "pro",
            accent: "violet",
            onClick: () => {
              if (onOpenUpgradeModal) {
                onOpenUpgradeModal();
              } else {
                handleSelectNavTab("profile");
              }
            },
          },
        ];

        return (
          <RumiFloatingAssistant
            roleMode="learner"
            userKey={learnerUserKey}
            pageContextId={rumiContextId}
            pageSubtitle={rumiSubtitle}
            hideAtTopOnHome={
              screenState.screen === "dashboard" && activeNavTab === "home"
            }
            learnerStage={rumiLevelInfo.stage}
            xpState={rumiXpState}
            proDaysRemaining={subStatusInfo.daysRemaining}
            quickActions={quickActions}
            onOpenProfileRumiSettings={() =>
              handleSelectNavTab("profile", "manual-setup")
            }
            onShowToast={onShowToast}
          />
        );
      })()}
    </div>
  );
}
