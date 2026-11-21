"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Edit3,
  Eye,
  Flag,
  FolderOpen,
  Gift,
  Globe,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import {
  CONTENT_TYPE_CONFIGS,
  CONTENT_TYPES_LIST,
  type ContentType,
  type TodoTask,
  type UngradedQuizItem,
} from "@/lib/design-tokens";
import {
  type ExplorerContentItem,
  type ExplorerItemType,
} from "@/lib/phase2-data";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";
import { type AdminNavId } from "@/components/navigation/AdminLeftRail";
import {
  formatIdr,
  parseIdrFromLabel,
  useRuangSosmedStore,
} from "@/context/RuangSosmedStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  formatIndoDate,
  getSubscriptionStatusInfo,
  isMissingSubDateColumnError,
  isMissingTierV2ColumnError,
  isProSubscriptionActive,
} from "@/lib/subscription-utils";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { AdminRumiHeroBanner } from "@/components/dashboard/AdminRumiHeroBanner";
import { QuickCreateStrip } from "@/components/dashboard/QuickCreateStrip";

export interface AdminHomeDashboardProps {
  currentUser?: AuthenticatedUser | null;
  quizzes: UngradedQuizItem[];
  onNavigateNav: (nav: AdminNavId) => void;
  onCreateContent: (type: ContentType) => void;
  onEditContent: (item: ExplorerContentItem) => void;
  onOpenContentDetail: (title: string, type: ExplorerItemType) => void;
  onOpenFolder: (folderName: string) => void;
  onGradeQuiz: (quiz: UngradedQuizItem) => void;
  onOpenGradingCenter: (title?: string) => void;
  onOpenUpgradeModal: () => void;
  onShowToast: (message: string) => void;
}

interface LiveProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  job_title: string | null;
  subscription_tier: string | null;
  pro_started_at?: string | null;
  pro_expires_at?: string | null;
  pro_package_name?: string | null;
  pro_billing_cycle?: string | null;
  total_points?: number | null;
  created_at?: string | null;
}

interface LiveProRequestRow {
  id: string;
  user_email: string | null;
  user_name: string | null;
  package_name: string | null;
  price_label: string | null;
  payment_method: string | null;
  status: string | null;
  created_at: string | null;
}

interface LiveEnrollmentRow {
  learner_id: string | null;
  content_id: string | null;
  progress_percent: number | null;
}

interface LiveSubmissionRow {
  learner_id: string | null;
  score_percent: number | null;
}

interface CompiledMemberSummary {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  initials: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  isPro: boolean;
  points: number;
  packageName?: string | null;
  subStatus: ReturnType<typeof getSubscriptionStatusInfo>;
}

const CHART_BAR_COLORS = [
  "#4F39F6",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
];

let dashProfilesHasSubDateCols = true;
let dashProfilesHasTierV2Cols = true;

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "RS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminHomeDashboard({
  currentUser,
  quizzes,
  onNavigateNav,
  onCreateContent,
  onEditContent,
  onOpenContentDetail,
  onOpenFolder,
  onGradeQuiz,
  onOpenGradingCenter,
  onOpenUpgradeModal,
  onShowToast,
}: AdminHomeDashboardProps) {
  const {
    explorerItems,
    courseCurriculums,
    courseSections,
    assignees,
    leaderboard,
    learnerSubscriptions,
    toggleStudentProByAdmin,
    discussionThreads,
    reportedIssues,
    gradingSubmissions,
    todos,
    setTodos,
    rsLessonReviews,
    rewardsCatalog,
    claimedRewards,
    cohortProjects,
    certificateConfig,
    maintenanceConfig,
    userPointsMap,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  // Interactive UI controls
  const [ringMode, setRingMode] = useState<"catalog" | "progress">("catalog");
  const [rightChartMode, setRightChartMode] = useState<"pro" | "folders">("pro");
  const [hoveredFolderName, setHoveredFolderName] = useState<string | null>(null);
  const [mentorTab, setMentorTab] = useState<"quiz" | "discussion" | "issues">(
    quizzes.length > 0
      ? "quiz"
      : reportedIssues.some((i) => String(i.status || "").toLowerCase() !== "resolved")
      ? "issues"
      : discussionThreads.length > 0
      ? "discussion"
      : "quiz"
  );
  const [proSearch, setProSearch] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedDue, setSelectedDue] = useState<"Today" | "Tomorrow">("Tomorrow");

  // Live Supabase + Telegram state
  const [liveProfiles, setLiveProfiles] = useState<LiveProfileRow[]>([]);
  const [liveProRequests, setLiveProRequests] = useState<LiveProRequestRow[]>([]);
  const [liveEnrollments, setLiveEnrollments] = useState<LiveEnrollmentRow[]>([]);
  const [liveSubmissions, setLiveSubmissions] = useState<LiveSubmissionRow[]>([]);
  const [telegramStatus, setTelegramStatus] = useState<
    "active" | "disabled" | "setup" | "unknown"
  >("unknown");
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const fetchLiveStudioSnapshot = useCallback(async (showSpinner = false) => {
    if (!isSupabaseConfigured) return;
    if (showSpinner) setIsRefreshingLive(true);

    try {
      const fetchProfilesWithFallback = async () => {
        if (dashProfilesHasSubDateCols && dashProfilesHasTierV2Cols) {
          const res = await supabase
            .from("profiles")
            .select(
              "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, pro_billing_cycle, total_points, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(200);
          if (!res.error) return res;
          if (isMissingTierV2ColumnError(res.error)) {
            dashProfilesHasTierV2Cols = false;
          } else if (isMissingSubDateColumnError(res.error)) {
            dashProfilesHasSubDateCols = false;
          } else {
            return res;
          }
        }
        if (dashProfilesHasSubDateCols) {
          const res = await supabase
            .from("profiles")
            .select(
              "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, total_points, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(200);
          if (!res.error) return res;
          if (isMissingSubDateColumnError(res.error)) {
            dashProfilesHasSubDateCols = false;
          } else {
            return res;
          }
        }
        return supabase
          .from("profiles")
          .select(
            "id, full_name, email, avatar_url, role, job_title, subscription_tier, total_points, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(200);
      };

      const [profilesRes, reqsRes, enrollRes, subRes, sessionRes] =
        await Promise.all([
          fetchProfilesWithFallback(),
          supabase
            .from("pro_upgrade_requests")
            .select(
              "id, user_email, user_name, package_name, price_label, payment_method, status, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("enrollments")
            .select("learner_id, content_id, progress_percent")
            .limit(500),
          supabase
            .from("submissions")
            .select("learner_id, score_percent")
            .limit(500),
          supabase.auth.getSession(),
        ]);

      if (Array.isArray(profilesRes.data)) {
        setLiveProfiles(profilesRes.data as LiveProfileRow[]);
      }
      if (Array.isArray(reqsRes.data)) {
        setLiveProRequests(reqsRes.data as LiveProRequestRow[]);
      }
      if (Array.isArray(enrollRes.data)) {
        setLiveEnrollments(enrollRes.data as LiveEnrollmentRow[]);
      }
      if (Array.isArray(subRes.data)) {
        setLiveSubmissions(subRes.data as LiveSubmissionRow[]);
      }

      const accessToken = sessionRes?.data?.session?.access_token;
      if (accessToken) {
        try {
          const tgRes = await fetch("/api/telegram/admin", {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (tgRes.ok) {
            const payload = (await tgRes.json()) as {
              config?: {
                enabled?: boolean;
                hasBotToken?: boolean;
                adminChatId?: string;
              };
            };
            const cfg = payload?.config;
            if (cfg) {
              if (!cfg.hasBotToken || !cfg.adminChatId?.trim()) {
                setTelegramStatus("setup");
              } else if (cfg.enabled) {
                setTelegramStatus("active");
              } else {
                setTelegramStatus("disabled");
              }
            }
          }
        } catch {
          // Ignore non-critical Telegram probe errors
        }
      }
    } catch {
      // Fall back gracefully to store data
    } finally {
      if (showSpinner) setIsRefreshingLive(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveStudioSnapshot(false);
  }, [fetchLiveStudioSnapshot]);

  // ---------------------------------------------------------------------------
  // Compiled Studio Data (Store + Supabase Live)
  // ---------------------------------------------------------------------------
  const activeCatalogItems = useMemo(
    () =>
      (explorerItems || []).filter(
        (item) => !item.isArchived && item.type !== "Folder"
      ),
    [explorerItems]
  );

  const archivedItemsCount = useMemo(
    () => (explorerItems || []).filter((item) => item.isArchived).length,
    [explorerItems]
  );

  const getItemChapterCount = useCallback(
    (item: ExplorerContentItem): number => {
      const titleKey = (item.title || "").trim().toLowerCase();
      const idKey = (item.id || "").trim().toLowerCase();
      const secs =
        courseCurriculums?.[titleKey] ??
        courseCurriculums?.[item.title] ??
        courseCurriculums?.[idKey] ??
        courseCurriculums?.[item.id];
      if (Array.isArray(secs) && secs.length > 0) {
        return secs.reduce((sum, s) => sum + (s.chapters?.length || 0), 0);
      }
      return 0;
    },
    [courseCurriculums]
  );

  const totalChaptersCount = useMemo(() => {
    const curriculumSum = Object.values(courseCurriculums || {}).reduce(
      (acc, secs) =>
        acc + (secs || []).reduce((sAcc, s) => sAcc + (s.chapters?.length || 0), 0),
      0
    );
    if (curriculumSum > 0) return curriculumSum;
    return (courseSections || []).reduce(
      (acc, s) => acc + (s.chapters?.length || 0),
      0
    );
  }, [courseCurriculums, courseSections]);

  const proCatalogItemsCount = useMemo(
    () => activeCatalogItems.filter((item) => Boolean(item.isPro)).length,
    [activeCatalogItems]
  );

  const foldersSummary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; color: string; proCount: number }
    >();

    const pickColor = (idx: number) =>
      CHART_BAR_COLORS[idx % CHART_BAR_COLORS.length];

    let colorIdx = 0;

    (cohortProjects || []).forEach((p) => {
      const clean = (p.name || "").trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: clean,
          count: 0,
          color: p.color || pickColor(colorIdx++),
          proCount: 0,
        });
      }
    });

    (explorerItems || [])
      .filter((i) => !i.isArchived && i.type === "Folder")
      .forEach((f) => {
        const clean = (f.title || "").trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            name: clean,
            count: 0,
            color: pickColor(colorIdx++),
            proCount: 0,
          });
        }
      });

    activeCatalogItems.forEach((item) => {
      const cleanFolder = (item.folderName || "").trim();
      if (!cleanFolder) return;
      const key = cleanFolder.toLowerCase();
      const existing = map.get(key) || {
        name: cleanFolder,
        count: 0,
        color: pickColor(colorIdx++),
        proCount: 0,
      };
      existing.count += 1;
      if (item.isPro) existing.proCount += 1;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [cohortProjects, explorerItems, activeCatalogItems]);

  const contentByType = useMemo(() => {
    const total = activeCatalogItems.length;
    return CONTENT_TYPES_LIST.map((type) => {
      const count = activeCatalogItems.filter((i) => i.type === type).length;
      const cfg = CONTENT_TYPE_CONFIGS[type];
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        type,
        count,
        pct,
        colorHex: cfg.colorHex,
        bgTint: cfg.bgTint,
        textTint: cfg.textTint,
      };
    }).sort((a, b) => b.count - a.count);
  }, [activeCatalogItems]);

  const compiledMembers = useMemo<CompiledMemberSummary[]>(() => {
    const nonAdminProfiles = liveProfiles.filter(
      (p) => String(p.role || "").trim().toLowerCase() !== "admin"
    );

    if (nonAdminProfiles.length > 0) {
      return nonAdminProfiles.map((p, idx) => {
        const name =
          (p.full_name || "").trim() ||
          (p.email || "").split("@")[0] ||
          "Learner";
        const emailLower = (p.email || "").trim().toLowerCase();
        const nameLower = name.toLowerCase();

        const storeOverride =
          learnerSubscriptions?.[name] ??
          learnerSubscriptions?.[nameLower] ??
          (emailLower ? learnerSubscriptions?.[emailLower] : undefined);

        const isProFromProfile = isProSubscriptionActive(
          p.subscription_tier,
          p.pro_expires_at
        );
        const rawIsPro =
          storeOverride !== undefined
            ? storeOverride === "PRO"
            : isProFromProfile;

        const subStatus = getSubscriptionStatusInfo({
          isProTier: rawIsPro,
          startedAt: p.pro_started_at ?? null,
          expiresAt: p.pro_expires_at ?? null,
          warningDays: 3,
        });

        const lbMatch = leaderboard.find(
          (l) =>
            l.name.trim().toLowerCase() === nameLower ||
            (emailLower && l.name.trim().toLowerCase() === emailLower)
        );

        const mappedPts =
          (emailLower ? userPointsMap?.[emailLower] : undefined) ??
          userPointsMap?.[nameLower] ??
          userPointsMap?.[name];
        const pts = Math.max(
          Number(p.total_points || 0),
          Number(mappedPts || 0),
          Number(lbMatch?.points || 0)
        );

        return {
          id: p.id || `prof-${idx}`,
          name,
          email: p.email || "",
          roleLabel: p.job_title || p.role || "Social Media Specialist",
          initials: getInitials(name),
          avatarUrl:
            resolveUserAvatar(name, p.email || undefined) ||
            p.avatar_url ||
            undefined,
          avatarBg: lbMatch?.avatarBg || "#EEF2FF",
          avatarText: lbMatch?.avatarText || "#4F39F6",
          isPro: storeOverride !== undefined ? storeOverride === "PRO" : subStatus.isEffectivelyPro,
          points: pts,
          packageName: p.pro_package_name || null,
          subStatus,
        };
      });
    }

    // Fallback to RuangSosmedStore leaderboard + assignees when offline / unauthenticated
    const seen = new Set<string>();
    const list: CompiledMemberSummary[] = [];

    leaderboard.forEach((student, idx) => {
      const key = student.name.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const isPro =
        (learnerSubscriptions?.[student.name] ??
          learnerSubscriptions?.[key]) === "PRO";
      const pts = Math.max(
        Number(student.points || 0),
        Number(userPointsMap?.[key] ?? userPointsMap?.[student.name] ?? 0)
      );
      list.push({
        id: `lb-${idx}-${key}`,
        name: student.name,
        email: "",
        roleLabel: student.role || "Social Media Specialist",
        initials: student.initials || getInitials(student.name),
        avatarUrl: resolveUserAvatar(student.name) || undefined,
        avatarBg: student.avatarBg || "#EEF2FF",
        avatarText: student.avatarText || "#4F39F6",
        isPro,
        points: pts,
        subStatus: getSubscriptionStatusInfo({ isProTier: isPro, warningDays: 3 }),
      });
    });

    assignees.forEach((a, idx) => {
      const key = (a.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const isPro =
        (learnerSubscriptions?.[a.name] ?? learnerSubscriptions?.[key]) === "PRO";
      const pts = Number(userPointsMap?.[key] ?? userPointsMap?.[a.name] ?? 0);
      list.push({
        id: a.id || `asg-${idx}`,
        name: a.name,
        email: "",
        roleLabel: a.roleBadge || "Learner",
        initials: a.initials || getInitials(a.name),
        avatarUrl: resolveUserAvatar(a.name) || undefined,
        avatarBg: a.avatarBg || "#EEF2FF",
        avatarText: a.avatarText || "#4F39F6",
        isPro,
        points: pts,
        subStatus: getSubscriptionStatusInfo({ isProTier: isPro, warningDays: 3 }),
      });
    });

    return list;
  }, [
    liveProfiles,
    leaderboard,
    assignees,
    learnerSubscriptions,
    userPointsMap,
    resolveUserAvatar,
  ]);

  const totalMembersCount = compiledMembers.length;
  const proMembersList = useMemo(
    () => compiledMembers.filter((m) => m.isPro),
    [compiledMembers]
  );
  const proMembersCount = proMembersList.length;
  const freeMembersCount = Math.max(0, totalMembersCount - proMembersCount);
  const proConversionPct =
    totalMembersCount > 0
      ? Math.round((proMembersCount / totalMembersCount) * 100)
      : 0;
  const expiringSoonMembers = useMemo(
    () =>
      compiledMembers.filter((m) => m.subStatus.status === "expiring_soon"),
    [compiledMembers]
  );
  const totalPointsDistributed = useMemo(
    () => compiledMembers.reduce((sum, m) => sum + (m.points || 0), 0),
    [compiledMembers]
  );

  // Payment requests from Supabase
  const pendingProRequests = useMemo(
    () =>
      liveProRequests.filter(
        (r) => !r.status || String(r.status).toLowerCase() === "pending"
      ),
    [liveProRequests]
  );
  const approvedProRequests = useMemo(
    () =>
      liveProRequests.filter(
        (r) => String(r.status || "").toLowerCase() === "approved"
      ),
    [liveProRequests]
  );
  const estimatedRevenueIdr = useMemo(
    () =>
      approvedProRequests.reduce(
        (sum, r) => sum + parseIdrFromLabel(r.price_label || ""),
        0
      ),
    [approvedProRequests]
  );

  // Real progress summary across enrollments / assignees
  const learningProgressStats = useMemo(() => {
    if (liveEnrollments.length > 0) {
      const completed = liveEnrollments.filter(
        (e) => Number(e.progress_percent || 0) >= 100
      ).length;
      const inProgress = liveEnrollments.filter(
        (e) =>
          Number(e.progress_percent || 0) > 0 &&
          Number(e.progress_percent || 0) < 100
      ).length;
      const notStarted = liveEnrollments.filter(
        (e) => Number(e.progress_percent || 0) <= 0
      ).length;
      const total = liveEnrollments.length;
      const avgCompletionPct = Math.round(
        liveEnrollments.reduce(
          (acc, e) => acc + Math.max(0, Math.min(100, Number(e.progress_percent || 0))),
          0
        ) / total
      );
      const validScores = liveSubmissions
        .map((s) => Number(s.score_percent))
        .filter((n) => Number.isFinite(n));
      const avgScore =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((a, b) => a + b, 0) / validScores.length
            )
          : null;
      return {
        totalRecords: total,
        completed,
        inProgress,
        notStarted,
        avgCompletionPct,
        avgScore,
        sourceLabel: "Live Enrollment DB",
      };
    }

    const total = assignees.length;
    const completed = assignees.filter(
      (a) => a.totalChapters > 0 && a.completedChapters >= a.totalChapters
    ).length;
    const inProgress = assignees.filter(
      (a) => a.completedChapters > 0 && a.completedChapters < a.totalChapters
    ).length;
    const notStarted = Math.max(0, total - completed - inProgress);
    const totalCh = assignees.reduce((s, a) => s + (a.totalChapters || 0), 0);
    const doneCh = assignees.reduce((s, a) => s + (a.completedChapters || 0), 0);
    const avgCompletionPct =
      totalCh > 0 ? Math.round((doneCh / totalCh) * 100) : 0;

    return {
      totalRecords: total,
      completed,
      inProgress,
      notStarted,
      avgCompletionPct,
      avgScore: null as number | null,
      sourceLabel: "Progres Member Studio",
    };
  }, [liveEnrollments, liveSubmissions, assignees]);

  // Action queues
  const openIssues = useMemo(
    () =>
      (reportedIssues || []).filter(
        (iss) => String(iss.status || "").toLowerCase() !== "resolved"
      ),
    [reportedIssues]
  );

  const pendingGradingCount = useMemo(() => {
    const storePending = (gradingSubmissions || []).filter(
      (s) => s.status === "Pending Evaluation"
    ).length;
    return Math.max(quizzes.length, storePending);
  }, [quizzes.length, gradingSubmissions]);

  const totalActionQueue =
    pendingProRequests.length + quizzes.length + openIssues.length;

  // Lesson Reviews
  const reviewStats = useMemo(() => {
    const list = rsLessonReviews || [];
    const count = list.length;
    const avg =
      count > 0
        ? Math.round(
            (list.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10
          ) / 10
        : 0;
    return {
      count,
      avg,
      latest: list.slice(0, 2),
    };
  }, [rsLessonReviews]);

  // Top learners sorted by points
  const topLearners = useMemo(
    () =>
      [...compiledMembers]
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
        .slice(0, 5),
    [compiledMembers]
  );

  // Filtered PRO access directory
  const filteredProMembers = useMemo(() => {
    const q = proSearch.trim().toLowerCase();
    if (!q) return compiledMembers;
    return compiledMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.roleLabel.toLowerCase().includes(q)
    );
  }, [compiledMembers, proSearch]);

  // Folder chart bars (top 6 folders)
  const chartFolders = useMemo(() => foldersSummary.slice(0, 6), [foldersSummary]);
  const maxFolderCount = useMemo(
    () => Math.max(1, ...chartFolders.map((f) => f.count)),
    [chartFolders]
  );
  const activeInspectedFolder = useMemo(
    () =>
      chartFolders.find((f) => f.name === hoveredFolderName) ||
      chartFolders[0] ||
      null,
    [chartFolders, hoveredFolderName]
  );

  // Recent active materials
  const featuredMaterials = useMemo(
    () => activeCatalogItems.slice(0, 4),
    [activeCatalogItems]
  );

  // Catalog Ring metric
  const catalogRingPct = useMemo(() => {
    if (ringMode === "progress") return learningProgressStats.avgCompletionPct;
    const totalAll = activeCatalogItems.length + archivedItemsCount;
    if (totalAll === 0) return 0;
    return Math.round((activeCatalogItems.length / totalAll) * 100);
  }, [
    ringMode,
    learningProgressStats.avgCompletionPct,
    activeCatalogItems.length,
    archivedItemsCount,
  ]);

  // To Do Handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    const newItem: TodoTask = {
      id: `todo-${Date.now()}`,
      title: trimmed,
      subtitle: "Ditambahkan dari Admin Studio Dashboard",
      dueLabel: selectedDue,
      priority: selectedDue === "Today" ? "high" : "medium",
      completed: false,
    };
    setTodos((prev) => [newItem, ...prev]);
    setNewTaskTitle("");
    onShowToast(`Tugas "${trimmed}" ditambahkan ke To Do List.`);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  const actionSubLabel = useMemo(() => {
    if (totalActionQueue === 0) return "Semua antrean tuntas ✨";
    const parts: string[] = [];
    if (pendingProRequests.length > 0)
      parts.push(`${pendingProRequests.length} bayar`);
    if (quizzes.length > 0) parts.push(`${quizzes.length} nilai`);
    if (openIssues.length > 0) parts.push(`${openIssues.length} kendala`);
    return parts.join(" • ");
  }, [
    totalActionQueue,
    pendingProRequests.length,
    quizzes.length,
    openIssues.length,
  ]);

  return (
    <div className="rs-dashboard-container w-full px-4 sm:px-5 pt-5 pb-12 space-y-5">
      {/* 1. Frameless Superior Admin Rumi Hero Header */}
      <AdminRumiHeroBanner
        currentUser={currentUser}
        quizzesCount={quizzes.length}
        activeMaterialsCount={activeCatalogItems.length}
        totalMembersCount={totalMembersCount}
        proMembersCount={proMembersCount}
        pendingPaymentsCount={pendingProRequests.length}
        openIssuesCount={openIssues.length}
        onNavigateNav={onNavigateNav}
        onOpenGrading={() => onOpenGradingCenter()}
        onCreateCourse={() => onCreateContent("Course")}
        onRefreshLive={() => void fetchLiveStudioSnapshot(true)}
        isRefreshingLive={isRefreshingLive}
      />

      {/* 2. Quick Create Strip */}
      <QuickCreateStrip onCreateContent={onCreateContent} />

      {/* 3. 4 Fresh Compiled Studio KPI Cards */}
      <section
        aria-label="Ringkasan Metrik Studio"
        className="rs-dash-kpi-grid"
      >
        {/* KPI 1: Member & PRO */}
        <button
          type="button"
          onClick={() => onNavigateNav("learners")}
          className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6]/45 p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-all cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Member &amp; PRO
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#121215] tabular-nums">
              {totalMembersCount}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#4F39F6] truncate tabular-nums">
              {proMembersCount} PRO ({proConversionPct}%) • {freeMembersCount} Free
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F39F6]">
            <Users size={18} />
          </span>
        </button>

        {/* KPI 2: Katalog & Materi Aktif */}
        <button
          type="button"
          onClick={() => onNavigateNav("content")}
          className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#0EA5E9]/45 p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-all cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Katalog Materi Aktif
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#121215] tabular-nums">
              {activeCatalogItems.length}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#0284C7] truncate tabular-nums">
              {foldersSummary.length} folder • {totalChaptersCount} bab •{" "}
              {proCatalogItemsCount} PRO
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
            <Layers size={18} />
          </span>
        </button>

        {/* KPI 3: Antrean & Perlu Aksi */}
        <button
          type="button"
          onClick={() => {
            if (pendingProRequests.length > 0) {
              onNavigateNav("learners");
            } else if (quizzes.length > 0) {
              onOpenGradingCenter();
            } else {
              onNavigateNav("inbox");
            }
          }}
          className={`rounded-2xl bg-[#FFFFFF] border p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-all cursor-pointer ${
            totalActionQueue > 0
              ? "border-[#F59E0B]/45 hover:border-[#F59E0B]"
              : "border-[#EAECEF] hover:border-[#10B981]/45"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Antrean &amp; Perlu Aksi
            </p>
            <p
              className={`mt-1 text-2xl font-black tracking-tight tabular-nums ${
                totalActionQueue > 0 ? "text-[#B45309]" : "text-[#059669]"
              }`}
            >
              {totalActionQueue}
            </p>
            <p
              className={`mt-1 text-[11px] font-medium truncate tabular-nums ${
                totalActionQueue > 0 ? "text-[#D97706]" : "text-[#10B981]"
              }`}
            >
              {actionSubLabel}
            </p>
          </div>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              totalActionQueue > 0
                ? "bg-[#FEF3C7] text-[#D97706]"
                : "bg-[#ECFDF5] text-[#10B981]"
            }`}
          >
            {totalActionQueue > 0 ? (
              <Clock size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
          </span>
        </button>

        {/* KPI 4: Engagement, Poin & Ulasan */}
        <button
          type="button"
          onClick={() => onNavigateNav("analytics")}
          className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#10B981]/50 p-4 shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex items-start justify-between gap-2 text-left transition-all cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Engagement &amp; Rating
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#059669] tabular-nums">
              {reviewStats.count > 0
                ? `${reviewStats.avg.toFixed(1)} ★`
                : `${totalPointsDistributed.toLocaleString()} ★`}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#10B981] truncate tabular-nums">
              {totalPointsDistributed.toLocaleString()} pts • {reviewStats.count}{" "}
              ulasan • {claimedRewards.length} hadiah
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
            {reviewStats.count > 0 ? (
              <Star size={18} fill="#10B981" />
            ) : (
              <TrendingUp size={18} />
            )}
          </span>
        </button>
      </section>

      {/* 4. Visual Charts & Live Subscription Row */}
      <section
        aria-label="Grafik Katalog dan Langganan"
        className="rs-dash-charts-grid"
      >
        {/* Left Chart Card: Distribusi Katalog & Progres Studio */}
        <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card flex flex-col justify-between gap-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                Distribusi Katalog &amp; Progres Studio 🎯
              </h2>
              <p className="text-[11px] text-[#64748B]">
                {ringMode === "catalog"
                  ? `Kompilasi ${activeCatalogItems.length} materi aktif lintas tipe & ${totalChaptersCount} bab`
                  : `${learningProgressStats.sourceLabel} • Ketuntasan belajar`}
              </p>
            </div>
            <div
              role="group"
              aria-label="Mode ringkasan studio"
              className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]"
            >
              <button
                type="button"
                onClick={() => setRingMode("catalog")}
                aria-pressed={ringMode === "catalog"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  ringMode === "catalog"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Katalog
              </button>
              <button
                type="button"
                onClick={() => setRingMode("progress")}
                aria-pressed={ringMode === "progress"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  ringMode === "progress"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Progres
              </button>
            </div>
          </header>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Native Accessible Circular Progress Ring */}
            <div className="rs-progress-ring-wrapper shrink-0">
              <progress
                value={catalogRingPct}
                max={100}
                aria-label={
                  ringMode === "catalog"
                    ? "Rasio materi aktif dalam katalog"
                    : "Rata-rata ketuntasan belajar"
                }
                aria-valuetext={
                  ringMode === "catalog"
                    ? `${activeCatalogItems.length} materi aktif (${catalogRingPct}%)`
                    : `${catalogRingPct}% rata-rata progres belajar`
                }
                className="rs-progress-ring"
                style={
                  {
                    "--value": catalogRingPct,
                    "--size": "144px",
                    "--thickness": "14px",
                    "--fill-color":
                      ringMode === "catalog" ? "#0EA5E9" : "#10B981",
                  } as React.CSSProperties
                }
              />
              <div
                className="rs-progress-ring-content text-center"
                aria-hidden="true"
              >
                <p className="text-2xl font-black text-[#121215] tabular-nums leading-none">
                  {ringMode === "catalog"
                    ? activeCatalogItems.length
                    : `${learningProgressStats.avgCompletionPct}%`}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  {ringMode === "catalog" ? "Materi Aktif" : "Avg Progres"}
                </p>
              </div>
            </div>

            {/* Right Breakdown Bars */}
            <div className="w-full min-w-0 flex-1 space-y-2.5">
              {ringMode === "catalog" ? (
                activeCatalogItems.length === 0 ? (
                  <div className="rounded-xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1] p-4 text-center space-y-2">
                    <p className="text-xs font-bold text-[#121215]">
                      Katalog materi masih kosong
                    </p>
                    <button
                      type="button"
                      onClick={() => onCreateContent("Course")}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Buat Course Pertama</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {contentByType
                      .filter((c) => c.count > 0)
                      .slice(0, 4)
                      .map((row) => (
                        <div
                          key={row.type}
                          className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF]/80 px-3 py-2 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-[#121215]">{row.type}</span>
                            <span
                              className="tabular-nums"
                              style={{ color: row.textTint }}
                            >
                              {row.count} item ({row.pct}%)
                            </span>
                          </div>
                          <progress
                            value={row.pct}
                            max={100}
                            aria-label={`${row.type}: ${row.count} materi`}
                            className="rs-progress-bar"
                            style={
                              {
                                "--bar-height": "6px",
                                "--progress-bar-fill": row.colorHex,
                                "--progress-bar-track": "#FFFFFF",
                              } as React.CSSProperties
                            }
                          />
                        </div>
                      ))}
                    {archivedItemsCount > 0 && (
                      <p className="text-[11px] text-[#64748B] px-1">
                        + {archivedItemsCount} item berada di arsip.
                      </p>
                    )}
                  </>
                )
              ) : (
                <>
                  {[
                    {
                      label: "Tuntas (100%)",
                      count: learningProgressStats.completed,
                      color: "#10B981",
                      bg: "bg-[#ECFDF5]",
                      text: "text-[#059669]",
                    },
                    {
                      label: "Sedang Berjalan",
                      count: learningProgressStats.inProgress,
                      color: "#4F39F6",
                      bg: "bg-[#EEF2FF]",
                      text: "text-[#4F39F6]",
                    },
                    {
                      label: "Belum Dimulai",
                      count: learningProgressStats.notStarted,
                      color: "#94A3B8",
                      bg: "bg-[#F8FAFC]",
                      text: "text-[#475569]",
                    },
                  ].map((row) => {
                    const ratio =
                      learningProgressStats.totalRecords > 0
                        ? Math.round(
                            (row.count / learningProgressStats.totalRecords) * 100
                          )
                        : 0;
                    return (
                      <div
                        key={row.label}
                        className={`rounded-xl ${row.bg} border border-[#EAECEF]/80 px-3 py-2 space-y-1`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-[#121215]">{row.label}</span>
                          <span className={`${row.text} tabular-nums`}>
                            {row.count} ({ratio}%)
                          </span>
                        </div>
                        <progress
                          value={ratio}
                          max={100}
                          aria-label={`${row.label}: ${row.count}`}
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
                  {learningProgressStats.avgScore !== null && (
                    <div className="flex items-center justify-between rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 text-[11px] font-bold text-[#4F39F6]">
                      <span>Rata-rata Nilai Kuis/Tugas</span>
                      <span className="tabular-nums">
                        {learningProgressStats.avgScore}/100
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => onNavigateNav("content")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer"
            >
              <span>Buka Content Explorer</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => onNavigateNav("analytics")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:text-[#121215] cursor-pointer"
            >
              <span>Analitik Lengkap</span>
              <ArrowRight size={13} />
            </button>
          </footer>
        </article>

        {/* Right Chart Card: Langganan PRO & Konfirmasi / Bar Chart Per Folder */}
        <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card flex flex-col justify-between gap-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                {rightChartMode === "pro"
                  ? "Langganan PRO & Pembayaran 💳"
                  : "Distribusi Materi Per Folder 📂"}
              </h2>
              <p className="text-[11px] text-[#64748B]">
                {rightChartMode === "pro"
                  ? "Konversi member PRO, pembayaran tertunda & masa aktif"
                  : "Klik batang folder untuk langsung membuka materi di dalamnya"}
              </p>
            </div>
            <div
              role="group"
              aria-label="Mode kartu kanan statistik"
              className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]"
            >
              <button
                type="button"
                onClick={() => setRightChartMode("pro")}
                aria-pressed={rightChartMode === "pro"}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  rightChartMode === "pro"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                <span>PRO &amp; Bayar</span>
                {pendingProRequests.length > 0 && (
                  <span className="rounded-full bg-[#FEF3C7] px-1.5 text-[10px] font-extrabold text-[#B45309] tabular-nums">
                    {pendingProRequests.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRightChartMode("folders")}
                aria-pressed={rightChartMode === "folders"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  rightChartMode === "folders"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Per Folder
              </button>
            </div>
          </header>

          {rightChartMode === "pro" ? (
            <div className="space-y-3.5">
              {/* Conversion Ratio Bar */}
              <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                  <span className="text-[#121215]">
                    Rasio Member PRO Aktif
                  </span>
                  <span className="text-[#B45309] tabular-nums">
                    {proMembersCount} dari {totalMembersCount} member (
                    {proConversionPct}%)
                  </span>
                </div>
                <progress
                  value={proConversionPct}
                  max={100}
                  aria-label="Rasio konversi member PRO"
                  className="rs-progress-bar"
                  style={
                    {
                      "--bar-height": "9px",
                      "--progress-bar-fill": "#F59E0B",
                      "--progress-bar-track": "#FFFFFF",
                    } as React.CSSProperties
                  }
                />
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-semibold">
                  <span className="rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 text-[#059669] tabular-nums">
                    Disetujui: {approvedProRequests.length}
                  </span>
                  {estimatedRevenueIdr > 0 && (
                    <span className="rounded-md bg-[#EEF2FF] border border-[#C7D2FE] px-2 py-0.5 text-[#4F39F6] tabular-nums">
                      Total: {formatIdr(estimatedRevenueIdr)}
                    </span>
                  )}
                  {expiringSoonMembers.length > 0 && (
                    <span className="rounded-md bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 text-[#B45309] tabular-nums">
                      Jatuh Tempo ≤3 hr: {expiringSoonMembers.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Pending Payment Queue OR Active PRO Preview */}
              {pendingProRequests.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#B45309]">
                    <span className="inline-flex items-center gap-1">
                      <CreditCard size={12} />
                      <span>
                        Antrean Konfirmasi Pembayaran ({pendingProRequests.length})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateNav("learners")}
                      className="text-[#4F39F6] hover:underline cursor-pointer"
                    >
                      Lihat semua →
                    </button>
                  </div>
                  {pendingProRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#121215] truncate">
                          {req.user_name || req.user_email || "Member"}
                        </p>
                        <p className="text-[11px] text-[#92400E] truncate">
                          {req.package_name || "Paket PRO"}
                          {req.price_label ? ` • ${req.price_label}` : ""}
                          {req.created_at
                            ? ` • ${formatIndoDate(req.created_at)}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateNav("learners")}
                        className="shrink-0 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                      >
                        Konfirmasi →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2 text-[11px] font-bold text-[#059669]">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span>
                        Semua konfirmasi pembayaran beres — 0 antrean pending
                      </span>
                    </span>
                  </div>

                  {proMembersList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {proMembersList.slice(0, 3).map((member) => (
                        <button
                          key={`active-pro-${member.id}`}
                          type="button"
                          onClick={() => onNavigateNav("learners")}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] px-2.5 py-1.5 text-left transition-colors cursor-pointer"
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="h-6 w-6 rounded-full object-cover border border-[#EAECEF]"
                            />
                          ) : (
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: member.avatarBg,
                                color: member.avatarText,
                              }}
                            >
                              {member.initials}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#121215] truncate max-w-[110px]">
                              {member.name}
                            </p>
                            <p className="text-[10px] font-semibold text-[#B45309] truncate max-w-[110px]">
                              {member.packageName || member.subStatus.badgeLabel}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : chartFolders.length === 0 ? (
            <div className="rounded-2xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1] p-6 text-center space-y-1.5">
              <Sparkles size={20} className="mx-auto text-[#4F39F6]" />
              <p className="text-xs font-bold text-[#121215]">
                Belum ada folder aktif
              </p>
              <p className="text-[11px] text-[#64748B]">
                Kelompokkan Course, Page, dan Quiz ke dalam folder di Content Explorer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeInspectedFolder && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: activeInspectedFolder.color }}
                    />
                    <span className="text-xs font-bold text-[#121215] truncate">
                      {activeInspectedFolder.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#4F39F6] tabular-nums shrink-0">
                    {activeInspectedFolder.count} materi •{" "}
                    {activeInspectedFolder.proCount} PRO
                  </span>
                </div>
              )}

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
                    gridTemplateColumns: `repeat(${chartFolders.length}, minmax(0, 1fr))`,
                  }}
                >
                  {chartFolders.map((folder) => {
                    const pct = Math.round((folder.count / maxFolderCount) * 100);
                    const barHeightPct =
                      folder.count > 0 ? Math.max(22, pct) : 12;
                    const isEmpty = folder.count === 0;
                    const isActive = activeInspectedFolder?.name === folder.name;
                    return (
                      <button
                        key={`folder-bar-${folder.name}`}
                        type="button"
                        onMouseEnter={() => setHoveredFolderName(folder.name)}
                        onFocus={() => setHoveredFolderName(folder.name)}
                        onClick={() => onOpenFolder(folder.name)}
                        aria-label={`Folder ${folder.name}: ${folder.count} materi`}
                        className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
                      >
                        <div className="h-28 w-full flex flex-col items-center justify-end">
                          <span
                            className={`mb-1 text-[10px] font-extrabold tabular-nums transition-transform ${
                              isActive ? "scale-110" : ""
                            }`}
                            style={{
                              color: isEmpty ? "#94A3B8" : folder.color,
                            }}
                          >
                            {folder.count}
                          </span>
                          <div
                            className={`w-full max-w-[38px] rounded-xl transition-all duration-300 ${
                              isEmpty
                                ? "border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC]"
                                : "shadow-[0_4px_10px_rgba(16,15,17,0.08)] group-hover:brightness-105"
                            } ${
                              isActive
                                ? "ring-2 ring-offset-2 ring-[#4F39F6]/35"
                                : ""
                            }`}
                            style={{
                              height: `${barHeightPct}%`,
                              background: isEmpty
                                ? undefined
                                : `linear-gradient(180deg, ${folder.color} 0%, ${folder.color}CC 100%)`,
                            }}
                          />
                        </div>
                        <span className="w-full truncate text-center text-[10px] font-semibold text-[#475569] group-hover:text-[#4F39F6]">
                          {folder.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => onNavigateNav("learners")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer"
            >
              <span>Kelola Langganan &amp; Direktori</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="text-[11px] font-bold text-[#B45309] hover:underline cursor-pointer"
            >
              Preview Paket ({foldersSummary.length} folder)
            </button>
          </footer>
        </article>
      </section>

      {/* 5. Main Operational Bento Grid (Left Ops + Right Leaderboard/PRO/Todo) */}
      <section
        aria-label="Operasional Studio dan Kontrol Cepat"
        className="rs-admin-bento-grid"
      >
        {/* Left Column */}
        <div className="space-y-5 min-w-0">
          {/* Card 1: Pusat Aksi Mentor (Kuis & Tugas / Diskusi / Kendala) */}
          <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  Pusat Aksi Mentor 📝
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Gabungan antrean penilaian, diskusi learner &amp; laporan kendala
                </p>
              </div>
              <div
                role="group"
                aria-label="Kategori pusat aksi mentor"
                className="inline-flex flex-wrap rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]"
              >
                {[
                  {
                    id: "quiz" as const,
                    label: "Kuis & Tugas",
                    count: quizzes.length,
                  },
                  {
                    id: "discussion" as const,
                    label: "Diskusi",
                    count: discussionThreads.length,
                  },
                  {
                    id: "issues" as const,
                    label: "Kendala",
                    count: openIssues.length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMentorTab(tab.id)}
                    aria-pressed={mentorTab === tab.id}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      mentorTab === tab.id
                        ? "bg-[#4F39F6] text-white"
                        : "text-[#64748B] hover:text-[#121215]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-extrabold tabular-nums ${
                        mentorTab === tab.id
                          ? "bg-white/20 text-white"
                          : tab.count > 0
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : "bg-[#EAECEF] text-[#64748B]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </header>

            {mentorTab === "quiz" && (
              <div className="space-y-2.5">
                {quizzes.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#ECFDF5]/70 border border-[#A7F3D0] p-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#10B981] text-white">
                        <CheckCircle2 size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#065F46]">
                          Semua kuis &amp; tugas sudah dinilai! 🎉
                        </p>
                        <p className="text-[11px] text-[#047857]">
                          {pendingGradingCount > 0
                            ? `${pendingGradingCount} riwayat submission di Grading Center`
                            : "Tidak ada antrean submission yang tertunda."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenGradingCenter()}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#A7F3D0] px-3 py-1.5 text-[11px] font-bold text-[#047857] cursor-pointer"
                    >
                      <ClipboardCheck size={13} />
                      <span>Buka Grading Center</span>
                    </button>
                  </div>
                ) : (
                  quizzes.slice(0, 4).map((quiz) => {
                    const learnerName = quiz.learner?.name || "Learner";
                    const learnerInitials =
                      quiz.learner?.initials || getInitials(learnerName);
                    const learnerAvatarBg = quiz.learner?.avatarBg || "#EEF2FF";
                    const learnerAvatarText =
                      quiz.learner?.avatarText || "#4F39F6";
                    const quizAvatar = resolveUserAvatar(learnerName);
                    return (
                      <div
                        key={quiz.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] px-3.5 py-2.5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {quizAvatar ? (
                            <img
                              src={quizAvatar}
                              alt={learnerName}
                              className="h-8 w-8 rounded-full object-cover border border-[#EAECEF] shrink-0"
                            />
                          ) : (
                            <span
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: learnerAvatarBg,
                                color: learnerAvatarText,
                              }}
                            >
                              {learnerInitials}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#121215] truncate">
                              {quiz.title}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {learnerName} • {quiz.questionsLabel}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onGradeQuiz(quiz)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer shrink-0"
                        >
                          <span>Nilai Sekarang</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {mentorTab === "discussion" && (
              <div className="space-y-2.5">
                {discussionThreads.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F39F6]">
                        <MessageSquare size={15} />
                      </span>
                      <p className="text-xs font-semibold text-[#475569]">
                        Belum ada thread diskusi dari learner saat ini.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateNav("inbox")}
                      className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] px-3 py-1.5 text-[11px] font-bold text-[#4F39F6] cursor-pointer"
                    >
                      Buka Inbox →
                    </button>
                  </div>
                ) : (
                  discussionThreads.slice(0, 4).map((thread) => (
                    <div
                      key={thread.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] px-3.5 py-2.5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-bold text-[#4F39F6] truncate max-w-[160px]">
                            {thread.chapterBadge}
                          </span>
                          <span className="text-[10px] font-medium text-[#64748B]">
                            {thread.repliesCount} balasan •{" "}
                            {thread.lastReplyLabel}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#121215] truncate">
                          {thread.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateNav("inbox")}
                        className="shrink-0 rounded-lg bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6] px-2.5 py-1.5 text-[11px] font-bold text-[#4F39F6] cursor-pointer"
                      >
                        Balas →
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {mentorTab === "issues" && (
              <div className="space-y-2.5">
                {reportedIssues.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#ECFDF5]/70 border border-[#A7F3D0] p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10B981] text-white">
                        <CheckCircle2 size={16} />
                      </span>
                      <p className="text-xs font-bold text-[#065F46]">
                        Tidak ada laporan kendala materi — semua berjalan lancar!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateNav("inbox")}
                      className="rounded-lg bg-[#FFFFFF] border border-[#A7F3D0] px-3 py-1.5 text-[11px] font-bold text-[#047857] cursor-pointer"
                    >
                      Buka Inbox →
                    </button>
                  </div>
                ) : (
                  reportedIssues.slice(0, 4).map((iss) => {
                    const isResolved =
                      String(iss.status || "").toLowerCase() === "resolved";
                    return (
                      <div
                        key={iss.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] px-3.5 py-2.5 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isResolved
                                  ? "bg-[#ECFDF5] text-[#059669]"
                                  : "bg-[#FEF2F2] text-[#DC2626]"
                              }`}
                            >
                              {!isResolved && <AlertTriangle size={10} />}
                              {isResolved ? "Selesai" : "Perlu Tindak"}
                            </span>
                            <span className="text-[10px] font-medium text-[#64748B] truncate">
                              {iss.reporter} • {iss.chapter}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#121215] truncate">
                            {iss.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigateNav("inbox")}
                          className="shrink-0 rounded-lg bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6] px-2.5 py-1.5 text-[11px] font-bold text-[#4F39F6] cursor-pointer"
                        >
                          Kelola →
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </article>

          {/* Card 2: Seri Folder & Materi Aktif Terbaru */}
          <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  Seri Folder &amp; Materi Terbaru 📚
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Lompat ke folder atau kelola langsung detail &amp; editor materi
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateNav("content")}
                className="text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Semua Materi →
              </button>
            </header>

            {foldersSummary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {foldersSummary.map((folder) => (
                  <button
                    key={`admin-folder-pill-${folder.name}`}
                    type="button"
                    onClick={() => onOpenFolder(folder.name)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F8F9FB] hover:bg-[#EEF2FF]/70 border border-[#EAECEF] hover:border-[#4F39F6]/40 px-3 py-1.5 text-xs font-bold text-[#121215] transition-colors cursor-pointer"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-white shrink-0"
                      style={{ backgroundColor: folder.color }}
                    >
                      <FolderOpen size={12} />
                    </span>
                    <span className="truncate max-w-[150px]">
                      {folder.name}
                    </span>
                    <span className="rounded-full bg-white border border-[#EAECEF] px-2 py-0.5 text-[10px] font-extrabold text-[#4F39F6] tabular-nums">
                      {folder.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {featuredMaterials.length === 0 ? (
              <div className="rounded-xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1] p-5 text-center space-y-2">
                <p className="text-xs font-semibold text-[#475569]">
                  Belum ada materi aktif di Studio.
                </p>
                <button
                  type="button"
                  onClick={() => onCreateContent("Course")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Buat Materi Baru</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {featuredMaterials.map((item) => {
                  const chaptersCount = getItemChapterCount(item);
                  return (
                    <article
                      key={item.id}
                      className="rounded-xl bg-[#F8F9FB]/85 hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6]/40 p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ContentBadge type={item.type} size="sm" />
                          {item.folderName && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                              <FolderOpen size={10} className="text-[#4F39F6]" />
                              <span className="truncate max-w-[140px]">
                                {item.folderName}
                              </span>
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              item.isPro
                                ? "bg-[#FEF3C7] text-[#B45309]"
                                : "bg-[#ECFDF5] text-[#059669]"
                            }`}
                          >
                            {item.isPro ? (
                              <>
                                <Zap size={9} fill="currentColor" />
                                <span>PRO</span>
                              </>
                            ) : (
                              <span>Gratis</span>
                            )}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[#121215] truncate">
                          {item.title}
                        </h3>

                        <p className="text-[11px] font-medium text-[#64748B]">
                          {chaptersCount > 0
                            ? `${chaptersCount} bab`
                            : item.category}
                          {item.editedLabel ? ` • ${item.editedLabel}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenContentDetail(item.title, item.type)
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EEF2FF] border border-[#EAECEF] hover:border-[#4F39F6]/40 px-2.5 py-1.5 text-[11px] font-bold text-[#121215] hover:text-[#4F39F6] transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditContent(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>

          {/* Card 3: Ulasan Learner & Status Sistem Studio */}
          <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Sub-section: Ulasan Learner Terbaru */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[#121215]">
                      Ulasan Learner ⭐
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Feedback materi terbaru dari kelas
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-0.5 text-[11px] font-extrabold text-[#B45309] tabular-nums">
                    <Star size={11} fill="#F59E0B" />
                    <span>
                      {reviewStats.count > 0
                        ? `${reviewStats.avg.toFixed(1)} (${reviewStats.count})`
                        : "0 ulasan"}
                    </span>
                  </span>
                </div>

                {reviewStats.latest.length === 0 ? (
                  <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 text-xs text-[#64748B]">
                    Belum ada ulasan materi dari learner.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewStats.latest.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#121215] truncate">
                            {rev.reviewerName}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#D97706] shrink-0 tabular-nums">
                            {"★".repeat(Math.max(1, Math.min(5, rev.rating)))}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] line-clamp-2">
                          {rev.feedback || "Memberikan rating kelas."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Sub-section: Status Sistem & Modul Studio */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-[#121215]">
                    Status Sistem &amp; Modul ⚡
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Ringkasan kesehatan integrasi &amp; fitur studio
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Telegram Bot */}
                  <button
                    type="button"
                    onClick={() => onNavigateNav("settings")}
                    className="rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#0EA5E9]/50 p-3 text-left transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0284C7]">
                        <Bot size={14} />
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          telegramStatus === "active"
                            ? "bg-[#ECFDF5] text-[#059669]"
                            : telegramStatus === "setup"
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#EAECEF] text-[#475569]"
                        }`}
                      >
                        {telegramStatus === "active"
                          ? "Aktif 2-Arah"
                          : telegramStatus === "setup"
                          ? "Perlu Setup"
                          : telegramStatus === "disabled"
                          ? "Nonaktif"
                          : "Pengaturan"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#121215]">
                      Bot Telegram
                    </p>
                  </button>

                  {/* Maintenance / Web Status */}
                  <button
                    type="button"
                    onClick={() => onNavigateNav("settings")}
                    className="rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6]/40 p-3 text-left transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F39F6]">
                        <Globe size={14} />
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          maintenanceConfig?.enabled
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#ECFDF5] text-[#059669]"
                        }`}
                      >
                        {maintenanceConfig?.enabled ? "Mode 404" : "Online"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#121215]">
                      Mode Website
                    </p>
                  </button>

                  {/* Rewards & Points */}
                  <button
                    type="button"
                    onClick={() => onNavigateNav("rewards")}
                    className="rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#F59E0B]/50 p-3 text-left transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
                        <Gift size={14} />
                      </span>
                      <span className="text-[10px] font-bold text-[#475569] tabular-nums">
                        {claimedRewards.length} klaim
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#121215]">
                      {rewardsCatalog.length} Hadiah Aktif
                    </p>
                  </button>

                  {/* Certificate Studio */}
                  <button
                    type="button"
                    onClick={() => onNavigateNav("certificates")}
                    className="rounded-xl bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#10B981]/50 p-3 text-left transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#10B981]">
                        <Award size={14} />
                      </span>
                      <span className="text-[10px] font-bold text-[#059669]">
                        Siap Cetak
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#121215] truncate">
                      {certificateConfig?.organizationName || "Sertifikat"}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Right Column */}
        <div className="space-y-5 min-w-0">
          {/* Right Card 1: Top Learner Leaderboard */}
          <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card space-y-3.5">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
                  <Trophy size={16} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#121215]">
                    Top Learner Leaderboard
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Perolehan poin tertinggi member
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateNav("analytics")}
                className="text-xs font-bold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Analitik →
              </button>
            </header>

            {topLearners.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#64748B]">
                Belum ada data leaderboard learner.
              </div>
            ) : (
              <div className="space-y-2">
                {topLearners.map((student, idx) => {
                  const medalStyle =
                    idx === 0
                      ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                      : idx === 1
                      ? "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]"
                      : idx === 2
                      ? "bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]"
                      : "bg-[#F8F9FB] text-[#64748B] border-[#EAECEF]";
                  return (
                    <div
                      key={`lb-row-${student.id}`}
                      className="flex items-center justify-between gap-2.5 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold tabular-nums ${medalStyle}`}
                        >
                          {idx + 1}
                        </span>
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="h-7 w-7 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                          />
                        ) : (
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: student.avatarBg,
                              color: student.avatarText,
                            }}
                          >
                            {student.initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#121215] truncate">
                              {student.name}
                            </p>
                            {student.isPro && (
                              <span className="rounded bg-[#FEF3C7] px-1 py-0.2 text-[9px] font-extrabold text-[#B45309] shrink-0">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#64748B] truncate">
                            {student.roleLabel}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#FEF3C7]/80 border border-[#FDE68A] px-2 py-0.5 text-[11px] font-extrabold text-[#B45309] tabular-nums shrink-0">
                        <Star size={10} fill="#F59E0B" />
                        <span>{student.points.toLocaleString()}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          {/* Right Card 2: Student PRO Membership Control */}
          <article className="overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] rs-admin-card">
            <div className="p-4 sm:p-5 border-b border-[#EAECEF] rs-admin-pro-wash pro-amber-gradient-header">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#B45309]">
                  <Zap size={10} fill="currentColor" />
                  <span>Kontrol Akses PRO</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateNav("learners")}
                  className="text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                >
                  Direktori ({proMembersCount} PRO) →
                </button>
              </div>
              <h2 className="text-sm font-bold text-[#121215]">
                Student PRO Membership Control
              </h2>
              <p className="mt-0.5 text-[11px] text-[#5E5E5E]">
                Aktifkan atau cabut akses PRO instan, langsung tersinkron ke Portal Learner.
              </p>
            </div>

            <div className="p-4 space-y-2.5">
              {compiledMembers.length > 4 && (
                <div className="relative flex items-center">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-3 text-[#9CA3AF]"
                  />
                  <input
                    type="search"
                    value={proSearch}
                    onChange={(e) => setProSearch(e.target.value)}
                    placeholder="Cari nama atau email member..."
                    aria-label="Cari member untuk kontrol PRO"
                    className="w-full rounded-xl bg-[#F8F9FB] pl-8 pr-3 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>
              )}

              {filteredProMembers.length === 0 ? (
                <div className="py-5 text-center text-xs text-[#64748B]">
                  {compiledMembers.length === 0
                    ? "Belum ada data learner terdaftar."
                    : "Member tidak ditemukan."}
                </div>
              ) : (
                <div className="max-h-[290px] overflow-y-auto scrollable-region space-y-2 pr-0.5">
                  {filteredProMembers.map((student) => (
                    <div
                      key={`pro-ctrl-${student.id}`}
                      className="flex items-center justify-between gap-2.5 rounded-xl bg-[#F8F9FB] px-3 py-2 border border-[#EAECEF]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="h-7 w-7 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                          />
                        ) : (
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: student.avatarBg,
                              color: student.avatarText,
                            }}
                          >
                            {student.initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#121215] truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-[#5E5E5E] truncate">
                            {student.isPro && student.subStatus.dueDateIso
                              ? `PRO s/d ${student.subStatus.dueLabel}`
                              : student.roleLabel}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          toggleStudentProByAdmin(student.name);
                          onShowToast(
                            `Mengubah ${student.name} ke ${
                              student.isPro ? "Free Tier" : "Learner PRO"
                            } (tersinkron ke Portal Learner).`
                          );
                        }}
                        aria-pressed={student.isPro}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                          student.isPro
                            ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/40 hover:bg-[#FDE68A]"
                            : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6]"
                        }`}
                      >
                        {student.isPro ? (
                          <>
                            <Zap size={11} fill="currentColor" />
                            <span>PRO Active</span>
                          </>
                        ) : (
                          <span>Free • Grant PRO</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>

          {/* Right Card 3: Studio To Do List */}
          <article className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-5 rs-admin-card">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  Studio To Do List ✅
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  {currentUser?.name
                    ? `Catatan & tugas ${currentUser.name.split(" ")[0]}`
                    : "Catatan tugas Admin Studio"}
                </p>
              </div>
              <span className="inline-flex items-center rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] font-bold text-[#475569] tabular-nums">
                {todos.filter((t) => !t.completed).length} tersisa
              </span>
            </div>

            <form onSubmit={handleAddTask} className="mb-3.5">
              <div className="relative flex items-center">
                <Plus
                  size={15}
                  className="pointer-events-none absolute left-3 text-[#9CA3AF]"
                />
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Tambah tugas studio baru..."
                  aria-label="Tambah tugas studio baru"
                  className="w-full rounded-xl bg-[#F8F9FB] pl-8 pr-20 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDue((d) => (d === "Today" ? "Tomorrow" : "Today"))
                  }
                  title="Ubah tenggat waktu default"
                  className="absolute right-1.5 rounded-lg bg-[#FFFFFF] px-2 py-1 text-[10px] font-bold text-[#475569] border border-[#EAECEF] hover:text-[#121215] cursor-pointer"
                >
                  {selectedDue}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {todos.length === 0 ? (
                <div className="py-5 text-center text-xs text-[#9CA3AF]">
                  Belum ada tugas to-do. Tambahkan catatan baru di atas.
                </div>
              ) : (
                todos.map((task) => {
                  const flagColor =
                    task.priority === "high"
                      ? "#EF4444"
                      : task.priority === "medium"
                      ? "#F59E0B"
                      : "#9CA3AF";

                  return (
                    <div
                      key={task.id}
                      className={`group flex items-start gap-2.5 rounded-xl p-3 border transition-all ${
                        task.completed
                          ? "bg-[#F8F9FB]/60 border-[#EAECEF]/70 opacity-70"
                          : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={`Tandai "${task.title}" ${
                          task.completed ? "belum selesai" : "selesai"
                        }`}
                        onClick={() => toggleTodo(task.id)}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                          task.completed
                            ? "bg-[#4F39F6] border-[#4F39F6] text-white"
                            : "border-[#D1D5DB] bg-[#FFFFFF] hover:border-[#4F39F6]"
                        }`}
                      >
                        {task.completed && <Check size={10} strokeWidth={3} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs font-bold leading-snug ${
                              task.completed
                                ? "line-through text-[#9CA3AF]"
                                : "text-[#121215]"
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Flag
                              size={12}
                              style={{ color: flagColor }}
                              fill={
                                task.priority === "high"
                                  ? flagColor
                                  : "transparent"
                              }
                              aria-label={`${task.priority} priority`}
                            />
                            <button
                              type="button"
                              onClick={() => removeTodo(task.id)}
                              aria-label={`Hapus tugas ${task.title}`}
                              className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#EF4444] transition-opacity cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#64748B] truncate">
                            {task.subtitle}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#EF4444] shrink-0">
                            <Calendar size={10} strokeWidth={2.2} />
                            <span>{task.dueLabel}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
