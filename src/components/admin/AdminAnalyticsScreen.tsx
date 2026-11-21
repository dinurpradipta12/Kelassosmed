"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FolderOpen,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { OfficialCertificateModal } from "@/components/certificate/OfficialCertificateModal";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  formatIndoDate,
  isMissingSubDateColumnError,
  isProSubscriptionActive,
} from "@/lib/subscription-utils";

interface AdminAnalyticsScreenProps {
  onOpenGradingCenter: () => void;
  onShowToast: (msg: string) => void;
  onOpenCertificateStudio?: () => void;
}

interface AnalyticsProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  job_title: string | null;
  subscription_tier: string | null;
  pro_expires_at?: string | null;
  pro_package_name?: string | null;
  total_points: number | null;
  created_at: string | null;
}

interface AnalyticsEnrollmentRow {
  id: string;
  learner_id: string;
  content_id: string;
  status: string | null;
  progress_percent: number | null;
  completed_chapter_ids: string[] | null;
  assigned_at: string | null;
  updated_at: string | null;
}

interface AnalyticsSubmissionRow {
  id: string;
  content_id: string;
  learner_id: string;
  answers_json: unknown;
  score_percent: number | null;
  grading_status: string | null;
  mentor_feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
}

interface AnalyticsContentRow {
  id: string;
  title: string | null;
  type: string | null;
  folder_name: string | null;
  status: string | null;
}

interface CompiledAnalyticsLearner {
  id: string;
  rank: number;
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  isPro: boolean;
  packageName?: string | null;
  points: number;
  folders: string[];
  cohortLabel: string;
  enrolledCoursesCount: number;
  completedChapters: number;
  totalChapters: number;
  completionPct: number;
  submissionsCount: number;
  avgQuizScore: number | null;
  certificateEligible: boolean;
  credentialId: string;
  createdAt?: string | null;
}

interface ParsedSubmissionAnswer {
  questionTitle: string;
  learnerResponse: string;
  maxPoints?: number;
  awardedPoints?: number;
}

let analyticsProfilesHasSubDateCols = true;

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildCredentialId(id: string, createdAt?: string | null): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : 2026;
  const safeYear = Number.isFinite(year) && year > 2020 ? year : 2026;
  const cleanSuffix = (id || "0001")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase()
    .padStart(4, "0");
  return `RS2-${safeYear}-${cleanSuffix}`;
}

function parseAnswersJson(raw: unknown): ParsedSubmissionAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === "object")
    )
    .map((entry, idx) => ({
      questionTitle:
        typeof entry.questionTitle === "string" && entry.questionTitle.trim()
          ? entry.questionTitle.trim()
          : typeof entry.prompt === "string" && entry.prompt.trim()
          ? entry.prompt.trim()
          : `Pertanyaan #${idx + 1}`,
      learnerResponse:
        typeof entry.learnerResponse === "string"
          ? entry.learnerResponse
          : typeof entry.answer === "string"
          ? entry.answer
          : typeof entry.response === "string"
          ? entry.response
          : JSON.stringify(entry),
      maxPoints:
        typeof entry.maxPoints === "number" ? entry.maxPoints : undefined,
      awardedPoints:
        typeof entry.awardedPoints === "number"
          ? entry.awardedPoints
          : undefined,
    }));
}

export function AdminAnalyticsScreen({
  onOpenGradingCenter,
  onShowToast,
  onOpenCertificateStudio,
}: AdminAnalyticsScreenProps) {
  const {
    leaderboard,
    assignees,
    explorerItems,
    courseCurriculums,
    cohortProjects,
    learnerSubscriptions,
    resolveUserAvatar,
    resolveUserPoints,
  } = useRuangSosmedStore();

  const [selectedCohort, setSelectedCohort] = useState("All Cohorts");
  const [chartTab, setChartTab] = useState<"courses" | "signups">("courses");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dbProfiles, setDbProfiles] = useState<AnalyticsProfileRow[]>([]);
  const [dbEnrollments, setDbEnrollments] = useState<AnalyticsEnrollmentRow[]>(
    []
  );
  const [dbSubmissions, setDbSubmissions] = useState<AnalyticsSubmissionRow[]>(
    []
  );
  const [dbContents, setDbContents] = useState<AnalyticsContentRow[]>([]);

  const [certPreviewLearner, setCertPreviewLearner] = useState<{
    name: string;
    role: string;
    credentialId: string;
    scoreLabel: string;
  } | null>(null);

  const [selectedSubmission, setSelectedSubmission] =
    useState<AnalyticsSubmissionRow | null>(null);

  const fetchLiveAnalytics = useCallback(async (showSpinner = false) => {
    if (!isSupabaseConfigured) return;
    if (showSpinner) setIsRefreshing(true);

    try {
      const fetchProfiles = async () => {
        if (analyticsProfilesHasSubDateCols) {
          const res = await supabase
            .from("profiles")
            .select(
              "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_expires_at, pro_package_name, total_points, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(300);
          if (!res.error) return res;
          if (isMissingSubDateColumnError(res.error)) {
            analyticsProfilesHasSubDateCols = false;
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
          .limit(300);
      };

      const [profilesRes, enrollRes, subRes, contentsRes] = await Promise.all([
        fetchProfiles(),
        supabase
          .from("enrollments")
          .select(
            "id, learner_id, content_id, status, progress_percent, completed_chapter_ids, assigned_at, updated_at"
          )
          .limit(1000),
        supabase
          .from("submissions")
          .select(
            "id, content_id, learner_id, answers_json, score_percent, grading_status, mentor_feedback, submitted_at, graded_at"
          )
          .order("submitted_at", { ascending: false })
          .limit(500),
        supabase
          .from("contents")
          .select("id, title, type, folder_name, status")
          .limit(500),
      ]);

      if (Array.isArray(profilesRes.data)) {
        setDbProfiles(profilesRes.data as AnalyticsProfileRow[]);
      }
      if (Array.isArray(enrollRes.data)) {
        setDbEnrollments(enrollRes.data as AnalyticsEnrollmentRow[]);
      }
      if (Array.isArray(subRes.data)) {
        setDbSubmissions(subRes.data as AnalyticsSubmissionRow[]);
      }
      if (Array.isArray(contentsRes.data)) {
        setDbContents(contentsRes.data as AnalyticsContentRow[]);
      }
    } catch {
      // Graceful fallback if offline
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveAnalytics(false);
    if (typeof window === "undefined") return;

    const handlePointsUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        newTotal?: number;
        learnerEmail?: string;
        learnerName?: string;
      }>).detail;
      if (detail && typeof detail.newTotal === "number") {
        const targetEmail = (detail.learnerEmail || "").trim().toLowerCase();
        const targetName = (detail.learnerName || "").trim().toLowerCase();
        setDbProfiles((prev) =>
          prev.map((p) => {
            const pEmail = (p.email || "").trim().toLowerCase();
            const pName = (p.full_name || "").trim().toLowerCase();
            if (
              (targetEmail && pEmail === targetEmail) ||
              (targetName && pName === targetName)
            ) {
              return { ...p, total_points: Math.max(0, detail.newTotal!) };
            }
            return p;
          })
        );
      }
      window.setTimeout(() => {
        void fetchLiveAnalytics(false);
      }, 450);
    };

    window.addEventListener("ruang_sosmed_points_awarded", handlePointsUpdated);
    let bc: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("ruang_sosmed_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "USER_POINTS_UPDATED") {
            void fetchLiveAnalytics(false);
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener(
        "ruang_sosmed_points_awarded",
        handlePointsUpdated
      );
      try {
        bc?.close();
      } catch {}
    };
  }, [fetchLiveAnalytics]);

  // Content Lookup Map (excluding __SYSTEM_% meta rows)
  const contentById = useMemo(() => {
    const map = new Map<string, AnalyticsContentRow>();
    dbContents.forEach((c) => {
      if (!c.id) return;
      if (String(c.title || "").startsWith("__SYSTEM_")) return;
      map.set(c.id, c);
    });
    return map;
  }, [dbContents]);

  const activeCatalogItems = useMemo(
    () =>
      (explorerItems || []).filter(
        (item) =>
          !item.isArchived &&
          item.type !== "Folder" &&
          !String(item.title || "").startsWith("__SYSTEM_")
      ),
    [explorerItems]
  );

  const getCourseChapterCountByTitle = useCallback(
    (title?: string | null): number => {
      if (!title) return 0;
      const key = title.trim().toLowerCase();
      const secs = courseCurriculums?.[key] ?? courseCurriculums?.[title];
      if (Array.isArray(secs) && secs.length > 0) {
        return secs.reduce((sum, s) => sum + (s.chapters?.length || 0), 0);
      }
      return 0;
    },
    [courseCurriculums]
  );

  // Deduplicated folder filter options from real contents & cohorts
  const cohortOptions = useMemo(() => {
    const set = new Set<string>();
    (cohortProjects || []).forEach((p) => {
      const n = (p.name || "").trim();
      if (n) set.add(n);
    });
    dbContents.forEach((c) => {
      if (String(c.title || "").startsWith("__SYSTEM_")) return;
      const fn = (c.folder_name || "").trim();
      if (fn) set.add(fn);
    });
    activeCatalogItems.forEach((item) => {
      const fn = (item.folderName || "").trim();
      if (fn) set.add(fn);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cohortProjects, dbContents, activeCatalogItems]);

  // Compile 100% Real Learners (live Supabase profiles authoritative, fallback to store only when offline/empty)
  const realLearners = useMemo<CompiledAnalyticsLearner[]>(() => {
    const nonAdminProfiles = dbProfiles.filter(
      (p) => String(p.role || "").trim().toLowerCase() !== "admin"
    );

    let rawList: Omit<CompiledAnalyticsLearner, "rank">[] = [];

    if (nonAdminProfiles.length > 0) {
      rawList = nonAdminProfiles.map((p) => {
        const name =
          (p.full_name || "").trim() ||
          (p.email || "").split("@")[0] ||
          "Learner";
        const emailLower = (p.email || "").trim().toLowerCase();
        const nameLower = name.toLowerCase();

        const storeSubOverride =
          learnerSubscriptions?.[name] ??
          learnerSubscriptions?.[nameLower] ??
          (emailLower ? learnerSubscriptions?.[emailLower] : undefined);

        const isPro =
          storeSubOverride !== undefined
            ? storeSubOverride === "PRO"
            : isProSubscriptionActive(p.subscription_tier, p.pro_expires_at);

        // Real points directly from Supabase `profiles.total_points` (0 stays 0)
        const points = Math.max(0, Number(p.total_points ?? 0));

        // Real avatar synced via Store + Supabase `profiles.avatar_url`
        const avatarUrl =
          resolveUserAvatar(name, p.email || undefined, p.id) ||
          (typeof p.avatar_url === "string" && p.avatar_url.trim()
            ? p.avatar_url.trim()
            : undefined);

        const lbMatch = leaderboard.find(
          (l) =>
            l.name.trim().toLowerCase() === nameLower ||
            (emailLower && l.name.trim().toLowerCase() === emailLower)
        );

        // Real enrollments & submissions joined by `learner_id`
        const userEnrollments = dbEnrollments.filter(
          (e) => e.learner_id === p.id
        );
        const userSubmissions = dbSubmissions.filter(
          (s) => s.learner_id === p.id
        );

        const folderSet = new Set<string>();
        let completedChapters = 0;
        let totalChapters = 0;

        userEnrollments.forEach((e) => {
          const content = contentById.get(e.content_id);
          const fName =
            (content?.folder_name || "").trim() ||
            (content?.title || "").trim();
          if (fName) folderSet.add(fName);

          const doneCount = Array.isArray(e.completed_chapter_ids)
            ? e.completed_chapter_ids.length
            : 0;
          completedChapters += doneCount;

          const curCount = getCourseChapterCountByTitle(content?.title);
          totalChapters += curCount > 0 ? curCount : doneCount;
        });

        // Also check store explorerItems `assignedLearners` for folder associations
        activeCatalogItems.forEach((item) => {
          const assigned = item.assignedLearners || [];
          const isMatch = assigned.some((a) => {
            const cleanA = a.trim().toLowerCase();
            return cleanA === nameLower || (emailLower && cleanA === emailLower);
          });
          if (isMatch && item.folderName?.trim()) {
            folderSet.add(item.folderName.trim());
          }
        });

        const folders = Array.from(folderSet);
        const cohortLabel =
          folders.length === 0
            ? "Belum ada kelas"
            : folders.length === 1
            ? folders[0]
            : `${folders[0]} (+${folders.length - 1})`;

        const completionPct =
          userEnrollments.length > 0
            ? Math.round(
                userEnrollments.reduce(
                  (sum, e) =>
                    sum +
                    Math.max(0, Math.min(100, Number(e.progress_percent || 0))),
                  0
                ) / userEnrollments.length
              )
            : 0;

        const validScores = userSubmissions
          .map((s) => Number(s.score_percent))
          .filter((n) => Number.isFinite(n));
        const avgQuizScore =
          validScores.length > 0
            ? Math.round(
                validScores.reduce((a, b) => a + b, 0) / validScores.length
              )
            : null;

        return {
          id: p.id,
          name,
          email: p.email || "",
          role: p.job_title || "Social Media Specialist",
          initials: getInitials(name),
          avatarUrl,
          avatarBg: lbMatch?.avatarBg || "#EEF2FF",
          avatarText: lbMatch?.avatarText || "#4F39F6",
          isPro,
          packageName: p.pro_package_name || null,
          points,
          folders,
          cohortLabel,
          enrolledCoursesCount: userEnrollments.length,
          completedChapters,
          totalChapters,
          completionPct,
          submissionsCount: userSubmissions.length,
          avgQuizScore,
          certificateEligible:
            userEnrollments.length > 0 && completionPct >= 100,
          credentialId: buildCredentialId(p.id, p.created_at),
          createdAt: p.created_at,
        };
      });
    } else if (leaderboard.length > 0) {
      // Offline / unconfigured fallback without hardcoded dummy scores/dates
      rawList = leaderboard.map((student, idx) => {
        const key = student.name.trim().toLowerCase();
        const matchedAssignee = assignees.find(
          (a) => a.name.trim().toLowerCase() === key
        );
        const completedCh = matchedAssignee?.completedChapters ?? 0;
        const totalCh = matchedAssignee?.totalChapters ?? 0;
        const completionPct =
          totalCh > 0
            ? Math.min(100, Math.round((completedCh / totalCh) * 100))
            : 0;
        const isPro =
          (learnerSubscriptions?.[student.name] ??
            learnerSubscriptions?.[key]) === "PRO";
        const points =
          resolveUserPoints(student.name) ??
          Math.max(0, Number(student.points ?? 0));

        const folders = Array.from(
          new Set(
            activeCatalogItems
              .filter(
                (i) =>
                  i.folderName &&
                  (i.assignedLearners || []).some(
                    (a) => a.trim().toLowerCase() === key
                  )
              )
              .map((i) => i.folderName!.trim())
          )
        );

        return {
          id: matchedAssignee?.id || `local-${idx}-${key}`,
          name: student.name,
          email: "",
          role: student.role || "Social Media Specialist",
          initials: student.initials || getInitials(student.name),
          avatarUrl: resolveUserAvatar(student.name) || undefined,
          avatarBg: student.avatarBg || "#EEF2FF",
          avatarText: student.avatarText || "#4F39F6",
          isPro,
          packageName: null,
          points,
          folders,
          cohortLabel: folders[0] || "Belum ada kelas",
          enrolledCoursesCount: folders.length,
          completedChapters: completedCh,
          totalChapters: totalCh,
          completionPct,
          submissionsCount: 0,
          avgQuizScore: null,
          certificateEligible: completionPct >= 100 && totalCh > 0,
          credentialId: buildCredentialId(`local${idx + 1}`, null),
          createdAt: null,
        };
      });
    }

    return rawList
      .sort(
        (a, b) =>
          b.completionPct - a.completionPct ||
          b.points - a.points ||
          a.name.localeCompare(b.name)
      )
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [
    dbProfiles,
    dbEnrollments,
    dbSubmissions,
    contentById,
    activeCatalogItems,
    getCourseChapterCountByTitle,
    leaderboard,
    assignees,
    learnerSubscriptions,
    resolveUserAvatar,
    resolveUserPoints,
  ]);

  const learnerById = useMemo(() => {
    const map = new Map<string, CompiledAnalyticsLearner>();
    realLearners.forEach((l) => map.set(l.id, l));
    return map;
  }, [realLearners]);

  // Cohort / Folder Filter Applied Consistently Across Tables & Charts
  const filteredLearners = useMemo(() => {
    if (selectedCohort === "All Cohorts") return realLearners;
    return realLearners
      .filter((l) =>
        l.folders.some(
          (f) => f.toLowerCase() === selectedCohort.toLowerCase()
        )
      )
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [realLearners, selectedCohort]);

  const filteredLearnerIds = useMemo(
    () => new Set(filteredLearners.map((l) => l.id)),
    [filteredLearners]
  );

  const filteredEnrollments = useMemo(() => {
    return dbEnrollments.filter((e) => {
      if (selectedCohort === "All Cohorts") return true;
      const content = contentById.get(e.content_id);
      const matchFolder =
        (content?.folder_name || "").trim().toLowerCase() ===
        selectedCohort.toLowerCase();
      return matchFolder || filteredLearnerIds.has(e.learner_id);
    });
  }, [dbEnrollments, selectedCohort, contentById, filteredLearnerIds]);

  const filteredSubmissions = useMemo(() => {
    return dbSubmissions.filter((s) => {
      if (selectedCohort === "All Cohorts") return true;
      const content = contentById.get(s.content_id);
      const matchFolder =
        (content?.folder_name || "").trim().toLowerCase() ===
        selectedCohort.toLowerCase();
      return matchFolder || filteredLearnerIds.has(s.learner_id);
    });
  }, [dbSubmissions, selectedCohort, contentById, filteredLearnerIds]);

  // KPI Summary Calculations (100% Real Data)
  const kpiStats = useMemo(() => {
    const totalLearners = filteredLearners.length;
    const proCount = filteredLearners.filter((l) => l.isPro).length;
    const freeCount = Math.max(0, totalLearners - proCount);
    const totalPoints = filteredLearners.reduce(
      (sum, l) => sum + (l.points || 0),
      0
    );
    const progressingCount = filteredLearners.filter(
      (l) => l.completedChapters > 0 || l.completionPct > 0
    ).length;

    const avgCompletionPct =
      totalLearners > 0
        ? Math.round(
            filteredLearners.reduce((sum, l) => sum + l.completionPct, 0) /
              totalLearners
          )
        : 0;

    const validSubmissionScores = filteredSubmissions
      .map((s) => Number(s.score_percent))
      .filter((n) => Number.isFinite(n));
    const avgQuizScore =
      validSubmissionScores.length > 0
        ? Math.round(
            validSubmissionScores.reduce((a, b) => a + b, 0) /
              validSubmissionScores.length
          )
        : null;

    const eligibleCertCount = filteredLearners.filter(
      (l) => l.certificateEligible
    ).length;

    return {
      totalLearners,
      proCount,
      freeCount,
      totalPoints,
      progressingCount,
      avgCompletionPct,
      avgQuizScore,
      eligibleCertCount,
    };
  }, [filteredLearners, filteredSubmissions]);

  // Chart 1A: Course Enrollment Progress Breakdown
  const courseProgressStats = useMemo(() => {
    const map = new Map<
      string,
      { contentId: string; title: string; count: number; totalPct: number }
    >();
    filteredEnrollments.forEach((e) => {
      const content = contentById.get(e.content_id);
      const title =
        (content?.title || "").trim() ||
        `Materi (${e.content_id.slice(0, 6)})`;
      const prev = map.get(e.content_id) || {
        contentId: e.content_id,
        title,
        count: 0,
        totalPct: 0,
      };
      prev.count += 1;
      prev.totalPct += Math.max(
        0,
        Math.min(100, Number(e.progress_percent || 0))
      );
      map.set(e.content_id, prev);
    });
    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        avgPct: entry.count > 0 ? Math.round(entry.totalPct / entry.count) : 0,
      }))
      .sort((a, b) => b.count - a.count || b.avgPct - a.avgPct)
      .slice(0, 6);
  }, [filteredEnrollments, contentById]);

  // Chart 1B: Real Monthly Member Signups
  const monthlySignups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number }
    >();
    filteredLearners.forEach((l) => {
      if (!l.createdAt) return;
      const dt = new Date(l.createdAt);
      if (Number.isNaN(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const label = new Intl.DateTimeFormat("id-ID", {
        month: "short",
        year: "2-digit",
      }).format(dt);
      const prev = map.get(key) || { key, label, count: 0 };
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6);
  }, [filteredLearners]);

  const maxSignupCount = useMemo(
    () => Math.max(1, ...monthlySignups.map((m) => m.count)),
    [monthlySignups]
  );

  // Chart 2: Real Quiz Score Distribution
  const scoreDistribution = useMemo(() => {
    const total = filteredSubmissions.length;
    const bands = [
      {
        band: "90% – 100% (Distinction)",
        count: 0,
        color: "#10B981",
      },
      {
        band: "80% – 89% (Lulus)",
        count: 0,
        color: "#4F39F6",
      },
      {
        band: "70% – 79% (Mendekati Batas)",
        count: 0,
        color: "#F59E0B",
      },
      {
        band: "< 70% (Perlu Remedial)",
        count: 0,
        color: "#EF4444",
      },
    ];
    filteredSubmissions.forEach((s) => {
      const score = Number(s.score_percent || 0);
      if (score >= 90) bands[0].count += 1;
      else if (score >= 80) bands[1].count += 1;
      else if (score >= 70) bands[2].count += 1;
      else bands[3].count += 1;
    });

    const passedCount = filteredSubmissions.filter(
      (s) =>
        String(s.grading_status || "").toLowerCase() === "passed" ||
        Number(s.score_percent || 0) >= 80
    ).length;

    return {
      total,
      passedCount,
      passRatePct: total > 0 ? Math.round((passedCount / total) * 100) : 0,
      bands: bands.map((b) => ({
        ...b,
        percentage: total > 0 ? Math.round((b.count / total) * 100) : 0,
      })),
    };
  }, [filteredSubmissions]);

  const handleExportCsvReport = () => {
    const headers = [
      "Rank",
      "Nama Learner",
      "Email",
      "Role / Pekerjaan",
      "Tier",
      "Program / Folder",
      "Bab Selesai",
      "Progress (%)",
      "Rata-rata Nilai Kuis (%)",
      "Mastery Points",
      "Status Sertifikat",
    ];

    const rows = filteredLearners.map((l) => [
      l.rank,
      `"${l.name}"`,
      `"${l.email}"`,
      `"${l.role}"`,
      l.isPro ? "PRO" : "Free",
      `"${l.cohortLabel}"`,
      `${l.completedChapters}/${l.totalChapters}`,
      `${l.completionPct}%`,
      l.avgQuizScore !== null ? `${l.avgQuizScore}%` : "Belum ada",
      l.points,
      l.certificateEligible ? `Eligible (${l.credentialId})` : "Belum tuntas",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ruang_sosmed_analytics_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast("Laporan analitik live berhasil diekspor ke CSV.");
  };

  return (
    <div className="rs-dashboard-container w-full px-4 sm:px-5 pt-5 pb-14 space-y-6">
      {/* Top Header Row */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6] mb-1.5">
            <BarChart3 size={12} />
            <span>Ruang Sosmed 2.0 • Live Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121215]">
            Learning Analytics &amp; Cohort Performance
          </h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">
            Seluruh metrik, foto profil, poin member, progres kelas, dan laporan kuis disinkronkan langsung dari database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter analytics berdasarkan folder atau kelas"
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="rounded-xl bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
          >
            <option value="All Cohorts">
              Semua Program ({realLearners.length} Member)
            </option>
            {cohortOptions.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void fetchLiveAnalytics(true)}
            disabled={isRefreshing}
            aria-label="Muat ulang data analitik"
            title="Muat ulang data live dari database"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] border border-[#EAECEF] text-[#475569] hover:text-[#4F39F6] transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={onOpenGradingCenter}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
          >
            <ClipboardCheck size={14} className="text-[#F97316]" />
            <span>Grading Center</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsvReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.25)] transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* 4 Real KPI Cards */}
      <section aria-label="Key Performance Indicators" className="rs-dash-kpi-grid">
        <div className="rounded-2xl bg-[#FFFFFF] p-4 sm:p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Rata-rata Progres Kelas
            </p>
            <p className="mt-1.5 text-2xl font-black text-[#121215] tabular-nums">
              {kpiStats.avgCompletionPct}%
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#059669] flex items-center gap-1 truncate">
              <TrendingUp size={12} className="shrink-0" />
              <span>
                {kpiStats.totalLearners > 0
                  ? `${kpiStats.progressingCount} dari ${kpiStats.totalLearners} member mulai belajar`
                  : "Belum ada member"}
              </span>
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
            <CheckCircle2 size={18} />
          </span>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF] p-4 sm:p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Rata-rata Nilai Kuis
            </p>
            <p className="mt-1.5 text-2xl font-black text-[#121215] tabular-nums">
              {kpiStats.avgQuizScore !== null ? `${kpiStats.avgQuizScore}%` : "—"}
            </p>
            <p className="mt-1 text-[11px] text-[#64748B] truncate tabular-nums">
              {filteredSubmissions.length > 0
                ? `${filteredSubmissions.length} submission dinilai`
                : "Belum ada submission kuis"}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F39F6]">
            <BarChart3 size={18} />
          </span>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF] p-4 sm:p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Member &amp; Poin Aktif
            </p>
            <p className="mt-1.5 text-2xl font-black text-[#121215] tabular-nums">
              {kpiStats.totalLearners}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#0284C7] truncate tabular-nums">
              {kpiStats.proCount} PRO • {kpiStats.freeCount} Free •{" "}
              {kpiStats.totalPoints.toLocaleString()} pts
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
            <Users size={18} />
          </span>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF] p-4 sm:p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#64748B]">
              Sertifikat Siap Terbit
            </p>
            <p className="mt-1.5 text-2xl font-black text-[#B45309] tabular-nums">
              {kpiStats.eligibleCertCount}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#D97706] truncate">
              {kpiStats.eligibleCertCount > 0
                ? "Member tuntas 100% materi"
                : "Belum ada member tuntas 100%"}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
            <Award size={18} />
          </span>
        </div>
      </section>

      {/* 2-Column Live Charts */}
      <section
        aria-label="Grafik Progres dan Nilai Live"
        className="rs-dash-charts-grid"
      >
        {/* Left Chart: Per-Course Progress OR Real Monthly Signups */}
        <article className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#EAECEF] rs-admin-card flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                {chartTab === "courses"
                  ? "Progres Belajar Per Materi 📚"
                  : "Pertumbuhan Member Terdaftar 📈"}
              </h2>
              <p className="text-[11px] text-[#64748B]">
                {chartTab === "courses"
                  ? `Data live enrollment pada filter ${
                      selectedCohort === "All Cohorts"
                        ? "Semua Program"
                        : selectedCohort
                    }`
                  : "Jumlah pendaftaran member nyata berdasarkan bulan bergabung"}
              </p>
            </div>
            <div
              role="group"
              aria-label="Pilih mode grafik kiri"
              className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]"
            >
              <button
                type="button"
                onClick={() => setChartTab("courses")}
                aria-pressed={chartTab === "courses"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  chartTab === "courses"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Per Materi
              </button>
              <button
                type="button"
                onClick={() => setChartTab("signups")}
                aria-pressed={chartTab === "signups"}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  chartTab === "signups"
                    ? "bg-[#4F39F6] text-white"
                    : "text-[#64748B] hover:text-[#121215]"
                }`}
              >
                Pendaftaran
              </button>
            </div>
          </div>

          {chartTab === "courses" ? (
            courseProgressStats.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1]">
                <FolderOpen size={24} className="text-[#9CA3AF] mb-2" />
                <p className="text-xs font-bold text-[#121215]">
                  Belum Ada Aktivitas Enrollment Kelas
                </p>
                <p className="text-[11px] text-[#64748B] mt-1 max-w-sm">
                  Progres per kursus akan terisi otomatis saat member mulai mengakses atau menyelesaikan bab kelas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseProgressStats.map((course) => (
                  <div
                    key={course.contentId}
                    className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] px-3.5 py-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold">
                      <span className="text-[#121215] truncate">
                        {course.title}
                      </span>
                      <span className="text-[#4F39F6] shrink-0 tabular-nums">
                        {course.avgPct}% • {course.count} peserta
                      </span>
                    </div>
                    <progress
                      value={course.avgPct}
                      max={100}
                      aria-label={`Rata-rata progres ${course.title}: ${course.avgPct}%`}
                      className="rs-progress-bar"
                      style={
                        {
                          "--bar-height": "7px",
                          "--progress-bar-fill": "#4F39F6",
                        } as React.CSSProperties
                      }
                    />
                  </div>
                ))}
              </div>
            )
          ) : monthlySignups.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1]">
              <Users size={24} className="text-[#9CA3AF] mb-2" />
              <p className="text-xs font-bold text-[#121215]">
                Belum Ada Data Tanggal Pendaftaran
              </p>
              <p className="text-[11px] text-[#64748B] mt-1">
                Grafik tren pendaftaran muncul otomatis setelah member terdaftar di Supabase.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div
                className="grid gap-3 items-end h-44 px-2 border-b border-[#EAECEF]"
                style={{
                  gridTemplateColumns: `repeat(${monthlySignups.length}, minmax(0, 1fr))`,
                }}
              >
                {monthlySignups.map((m) => {
                  const heightPct = Math.max(
                    18,
                    Math.round((m.count / maxSignupCount) * 100)
                  );
                  return (
                    <div
                      key={m.key}
                      className="flex flex-col items-center justify-end gap-1.5 h-full"
                    >
                      <span className="text-xs font-extrabold text-[#4F39F6] tabular-nums">
                        {m.count}
                      </span>
                      <div
                        className="w-full max-w-[42px] rounded-t-xl transition-all"
                        style={{
                          height: `${heightPct}%`,
                          background:
                            "linear-gradient(180deg, #4F39F6 0%, #6366F1 100%)",
                        }}
                        title={`${m.label}: ${m.count} member baru`}
                      />
                    </div>
                  );
                })}
              </div>
              <div
                className="grid gap-3 text-center"
                style={{
                  gridTemplateColumns: `repeat(${monthlySignups.length}, minmax(0, 1fr))`,
                }}
              >
                {monthlySignups.map((m) => (
                  <p
                    key={`lbl-${m.key}`}
                    className="text-[11px] font-semibold text-[#475569] truncate"
                  >
                    {m.label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Right Chart: Real Quiz Score Distribution */}
        <article className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#EAECEF] rs-admin-card flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#121215]">
              Distribusi Nilai Kuis &amp; Tugas 🎯
            </h2>
            <p className="text-[11px] text-[#64748B]">
              {scoreDistribution.total > 0
                ? `Berdasarkan ${scoreDistribution.total} submission nyata di database`
                : "Menunggu submission kuis atau tugas nyata dari learner"}
            </p>
          </div>

          {scoreDistribution.total === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1] my-auto">
              <ClipboardCheck size={24} className="text-[#9CA3AF] mb-2" />
              <p className="text-xs font-bold text-[#121215]">
                Belum Ada Submission Kuis / Tugas
              </p>
              <p className="text-[11px] text-[#64748B] mt-1 max-w-xs">
                Tidak ada angka dummy ditampilkan. Grafik ini otomatis terisi saat learner mengirim kuis atau tugas.
              </p>
            </div>
          ) : (
            <div className="space-y-3 my-auto">
              {scoreDistribution.bands.map((item) => (
                <div key={item.band} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121215]">
                      {item.band}
                    </span>
                    <span className="font-bold text-[#5E5E5E] tabular-nums">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <progress
                    value={item.percentage}
                    max={100}
                    aria-label={`${item.band}: ${item.count} submission`}
                    className="rs-progress-bar"
                    style={
                      {
                        "--bar-height": "8px",
                        "--progress-bar-fill": item.color,
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs">
            <span className="text-[#5E5E5E]">Rasio Kelulusan (≥ 80%)</span>
            <span className="font-bold text-[#10B981] tabular-nums">
              {scoreDistribution.total > 0
                ? `${scoreDistribution.passRatePct}% (${scoreDistribution.passedCount} / ${scoreDistribution.total})`
                : "0% (0 / 0)"}
            </span>
          </div>
        </article>
      </section>

      {/* Table 1: Real Most Active Learners & Certificate Eligibility */}
      <article className="rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 border border-[#EAECEF] rs-admin-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="most-active-learners-caption"
              className="text-base font-bold text-[#121215]"
            >
              Most Active Learners &amp; Certificate Eligibility
            </h2>
            <p className="text-xs text-[#5E5E5E]">
              Tersinkron real-time dengan foto profil, saldo poin, progres kelas, dan nilai kuis member di Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsvReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
          >
            <Download size={13} />
            <span>Download CSV</span>
          </button>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="most-active-learners-caption"
          className="table-wrapper"
        >
          <table
            style={
              {
                "--label-2": '"Program / Folder"',
                "--label-3": '"Progres Materi"',
                "--label-4": '"Nilai Kuis"',
                "--label-5": '"Mastery Points"',
                "--label-6": '"Sertifikat"',
              } as React.CSSProperties
            }
          >
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#F8F9FB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <th className="py-3 px-4 rounded-tl-lg">Learner</th>
                <th className="py-3 px-4">Program / Folder</th>
                <th className="py-3 px-4">Progres Materi</th>
                <th className="py-3 px-4">Nilai Kuis</th>
                <th className="py-3 px-4">Mastery Points</th>
                <th className="py-3 px-4 text-right rounded-tr-lg">
                  Official Certificate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-xs text-[#9CA3AF]"
                  >
                    Belum ada member terdaftar pada filter program ini.
                  </td>
                </tr>
              ) : (
                filteredLearners.map((learner) => (
                  <tr key={learner.id} className="transition-colors">
                    <th
                      scope="row"
                      className="py-3.5 px-4 font-semibold text-[#121215] text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-xs font-bold text-[#9CA3AF] tabular-nums">
                          #{learner.rank}
                        </span>
                        {learner.avatarUrl ? (
                          <img
                            src={learner.avatarUrl}
                            alt={learner.name}
                            className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                          />
                        ) : (
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: learner.avatarBg,
                              color: learner.avatarText,
                            }}
                          >
                            {learner.initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-[#121215] truncate">
                              {learner.name}
                            </p>
                            {learner.isPro && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-extrabold text-[#B45309] shrink-0">
                                <Zap size={9} fill="currentColor" />
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-normal text-[#5E5E5E] truncate">
                            {learner.role}
                          </p>
                        </div>
                      </div>
                    </th>

                    <td className="py-3.5 px-4 font-medium">
                      <span className="inline-flex items-center rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#121215]">
                        {learner.cohortLabel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-[140px]">
                        <progress
                          value={learner.completionPct}
                          max={100}
                          aria-label={`Progres ${learner.name}: ${learner.completionPct}%`}
                          className="rs-progress-bar flex-1"
                          style={
                            {
                              "--bar-height": "7px",
                              "--progress-bar-fill": "#10B981",
                            } as React.CSSProperties
                          }
                        />
                        <span className="font-bold text-[#121215] tabular-nums shrink-0">
                          {learner.completedChapters}/{learner.totalChapters} (
                          {learner.completionPct}%)
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {learner.avgQuizScore !== null ? (
                        <span className="rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 text-xs font-bold text-[#059669] tabular-nums">
                          {learner.avgQuizScore}%
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#9CA3AF]">
                          —
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 text-xs font-bold text-[#B45309] tabular-nums">
                        <Star
                          size={11}
                          className="text-[#F59E0B]"
                          fill="#F59E0B"
                        />
                        <span>{learner.points.toLocaleString()} pts</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setCertPreviewLearner({
                            name: learner.name,
                            role: learner.role,
                            credentialId: learner.credentialId,
                            scoreLabel: `${
                              learner.avgQuizScore !== null
                                ? `${learner.avgQuizScore}% Quiz Score`
                                : `${learner.completionPct}% Progres`
                            } • Rank #${learner.rank}`,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                          learner.certificateEligible
                            ? "bg-[#FEF3C7] hover:bg-[#FDE68A] border-[#F59E0B]/40 text-[#B45309]"
                            : "bg-[#F8F9FB] hover:bg-[#EEF2FF] border-[#EAECEF] text-[#475569] hover:text-[#4F39F6]"
                        }`}
                      >
                        <Award size={13} />
                        <span>
                          {learner.certificateEligible
                            ? `Siap Terbit (${learner.credentialId})`
                            : "Preview Sertifikat"}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Table 2: Real Quiz & Assignment Submissions Report (Zero Dummy Matrix) */}
      <article className="rounded-2xl bg-[#FFFFFF] p-5 sm:p-6 border border-[#EAECEF] rs-admin-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="live-submissions-report-caption"
              className="text-base font-bold text-[#121215]"
            >
              Laporan Submission Kuis &amp; Tugas (Live Database)
            </h2>
            <p className="text-xs text-[#5E5E5E]">
              Menampilkan kiriman jawaban nyata dari tabel{" "}
              <code className="font-mono text-[11px]">submissions</code> — tidak menggunakan data simulasi.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenGradingCenter}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F8F9FB] hover:bg-[#EEF2FF] border border-[#EAECEF] px-3 py-1.5 text-xs font-bold text-[#4F39F6] cursor-pointer"
          >
            <ClipboardCheck size={13} />
            <span>Buka Grading Center</span>
          </button>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="rounded-xl bg-[#F8F9FB] border border-dashed border-[#CBD5E1] p-6 text-center space-y-2">
            <ClipboardCheck size={24} className="mx-auto text-[#9CA3AF]" />
            <p className="text-xs font-bold text-[#121215]">
              Belum Ada Submission Kuis atau Tugas yang Masuk
            </p>
            <p className="text-[11px] text-[#64748B] max-w-md mx-auto">
              Saat learner mengerjakan kuis atau mengirim tugas di Portal Learner, detail jawaban, nilai, dan status evaluasinya otomatis muncul di tabel ini.
            </p>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="live-submissions-report-caption"
            className="table-wrapper"
          >
            <table
              style={
                {
                  "--label-2": '"Materi / Kuis"',
                  "--label-3": '"Tanggal"',
                  "--label-4": '"Status"',
                  "--label-5": '"Nilai"',
                  "--label-6": '"Detail"',
                } as React.CSSProperties
              }
            >
              <thead>
                <tr className="border-b border-[#EAECEF] bg-[#F8F9FB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <th className="py-3 px-4 rounded-tl-lg">Learner</th>
                  <th className="py-3 px-4">Materi / Kuis</th>
                  <th className="py-3 px-4">Tanggal Kirim</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Nilai</th>
                  <th className="py-3 px-4 text-right rounded-tr-lg">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF] text-xs">
                {filteredSubmissions.map((sub) => {
                  const learner = learnerById.get(sub.learner_id);
                  const content = contentById.get(sub.content_id);
                  const learnerName = learner?.name || "Member";
                  const statusLower = String(
                    sub.grading_status || "pending_review"
                  ).toLowerCase();
                  const statusLabel =
                    statusLower === "passed"
                      ? "Lulus"
                      : statusLower === "revision_requested"
                      ? "Revisi"
                      : "Menunggu Review";

                  return (
                    <tr key={sub.id} className="transition-colors">
                      <th
                        scope="row"
                        className="py-3 px-4 font-semibold text-[#121215] text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          {learner?.avatarUrl ? (
                            <img
                              src={learner.avatarUrl}
                              alt={learnerName}
                              className="h-7 w-7 rounded-full object-cover border border-[#EAECEF] shrink-0"
                            />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[10px] font-bold text-[#4F39F6]">
                              {learner?.initials || getInitials(learnerName)}
                            </span>
                          )}
                          <span className="truncate">{learnerName}</span>
                        </div>
                      </th>
                      <td className="py-3 px-4 font-semibold text-[#121215]">
                        {content?.title || "Kuis / Tugas"}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {sub.submitted_at
                          ? formatIndoDate(sub.submitted_at)
                          : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            statusLower === "passed"
                              ? "bg-[#ECFDF5] text-[#059669]"
                              : statusLower === "revision_requested"
                              ? "bg-[#FEF2F2] text-[#DC2626]"
                              : "bg-[#FEF3C7] text-[#B45309]"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-[#121215] tabular-nums">
                        {Number(sub.score_percent || 0)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] hover:bg-[#EEF2FF] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-bold text-[#4F39F6] cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Lihat Jawaban</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Real Submission Inspection Modal */}
      <ModalDialog
        open={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        titleId="live-submission-detail-title"
        title={
          selectedSubmission
            ? `Detail Submission — ${
                learnerById.get(selectedSubmission.learner_id)?.name || "Learner"
              }`
            : "Detail Submission"
        }
        subtitle={
          selectedSubmission
            ? `${
                contentById.get(selectedSubmission.content_id)?.title ||
                "Kuis / Tugas"
              } • Nilai: ${Number(selectedSubmission.score_percent || 0)}%`
            : undefined
        }
        maxWidthClass="max-w-2xl"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            {(() => {
              const answers = parseAnswersJson(selectedSubmission.answers_json);
              if (answers.length === 0) {
                return (
                  <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 text-xs text-[#64748B]">
                    Tidak ada rincian jawaban per soal yang tersimpan pada submission ini.
                  </div>
                );
              }
              return (
                <div className="space-y-2.5 max-h-[55vh] overflow-y-auto scrollable-region pr-1">
                  {answers.map((ans, idx) => (
                    <div
                      key={`sub-ans-${idx}`}
                      className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#121215]">
                          {idx + 1}. {ans.questionTitle}
                        </span>
                        {ans.maxPoints !== undefined && (
                          <span className="text-[11px] font-bold text-[#4F39F6] tabular-nums shrink-0">
                            {ans.awardedPoints ?? 0} / {ans.maxPoints} pts
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {ans.learnerResponse || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedSubmission.mentor_feedback && (
              <div className="rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] p-3.5 text-xs text-[#121215]">
                <p className="font-bold text-[#4F39F6] mb-0.5">
                  Catatan Mentor:
                </p>
                <p>{selectedSubmission.mentor_feedback}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmission(null);
                  onOpenGradingCenter();
                }}
                className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Buka Grading Center
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF] border border-[#EAECEF] px-4 py-2 text-xs font-bold text-[#121215] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Official Certificate Modal */}
      <OfficialCertificateModal
        open={Boolean(certPreviewLearner)}
        onClose={() => setCertPreviewLearner(null)}
        learnerName={certPreviewLearner?.name}
        learnerRole={certPreviewLearner?.role}
        credentialId={certPreviewLearner?.credentialId}
        scoreLabel={certPreviewLearner?.scoreLabel}
        onShowToast={onShowToast}
        onOpenStudio={onOpenCertificateStudio}
      />
    </div>
  );
}
