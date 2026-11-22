"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Upload,
  Search,
  Star,
  Award,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Mail,
  Zap,
  Plus,
  Edit3,
  Coins,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  Gift,
  Send,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCw,
  XCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import {
  useRuangSosmedStore,
  getNormalizedProPackages,
  computeTrial3DaysPriceIdr,
  computeTrial7DaysPriceIdr,
  formatIdr,
  isItemInSharedCohortProject,
  isTrialBillingCycle,
} from "@/context/RuangSosmedStore";
import { type ExplorerContentItem } from "@/lib/phase2-data";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { OfficialCertificateModal } from "@/components/certificate/OfficialCertificateModal";
import {
  AdminDirectoryInsightsModal,
  type InsightsProRequestRecord,
} from "@/components/admin/AdminDirectoryInsightsModal";
import {
  supabase,
  isSupabaseConfigured,
  getAuthRedirectUrl,
} from "@/lib/supabase/client";
import { deletePaymentProofFromStorage } from "@/lib/supabase/proof-cleanup";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";
import {
  addDaysToIsoDate,
  diffCalendarDays,
  formatIndoDate,
  getSubscriptionStatusInfo,
  getTodayIsoDate,
  isMissingSubDateColumnError,
  isMissingTierV2ColumnError,
  type SubscriptionStatusInfo,
} from "@/lib/subscription-utils";

let dirProfilesHasSubDateCols = true;
let dirProfilesHasTierV2Cols = true;
let dirProReqHasTierV2Cols = true;

interface AdminLearnersDirectoryProps {
  onShowToast: (msg: string) => void;
  onOpenCertificateStudio?: () => void;
  currentUser?: AuthenticatedUser | null;
  onUpdateCurrentUserRole?: (newRole: "Learner" | "Mentor" | "Admin") => void;
}

interface DirectoryMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  jobTitle: string;
  cohort: string;
  accessRole: "Learner" | "Mentor" | "Admin";
  assignedCount: number;
  completedChapters: number;
  totalChapters: number;
  avgQuizScore: number;
  points: number;
  credentialId: string;
  subscriptionTier?: "PRO" | "Free";
  proStartedAt?: string | null;
  proExpiresAt?: string | null;
  proPackageName?: string | null;
  proPackageId?: string | null;
  proBillingCycle?: string | null;
  hasUsedTrial?: boolean;
  trialUsedAt?: string | null;
  createdAt?: string | null;
  paymentMethod?: string | null;
}

const INITIAL_DIRECTORY_EXTRA: DirectoryMember[] = [
  {
    id: "dir-extra-1",
    name: "Dinur M. Pradipta",
    email: "dinurm.pradipta@gmail.com",
    initials: "DP",
    avatarBg: "#FEF3C7",
    avatarText: "#92400E",
    jobTitle: "Founder & Dev Admin",
    cohort: "Ruang Sosmed Class",
    accessRole: "Admin",
    assignedCount: 0,
    completedChapters: 0,
    totalChapters: 0,
    avgQuizScore: 0,
    points: 0,
    credentialId: "RS2-2026-0001",
  },
];

export function AdminLearnersDirectory({
  onShowToast,
  onOpenCertificateStudio,
  currentUser,
  onUpdateCurrentUserRole,
}: AdminLearnersDirectoryProps) {
  const {
    leaderboard,
    assignees,
    learnerAssignedItems,
    courseSections,
    learnerIsPro,
    learnerSubscriptions,
    learnerProConfig,
    toggleStudentProByAdmin,
    setStudentProTierLocal,
    cohortProjects,
    registerLearnerProfile,
    workspaceCollaborators,
    updateMemberAccessRole,
    explorerItems,
    courseCurriculums,
    claimedRewards,
    assignContentToLearners,
    resolveUserAvatar,
    resolveUserPoints,
    syncUserPointsBalance,
    learnerPoints,
    unassignLearnerFromContent,
  } = useRuangSosmedStore();

  const [cohortFilter, setCohortFilter] = useState("All Cohorts");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [subscriptionTab, setSubscriptionTab] = useState<
    "all" | "pro_active" | "expiring"
  >("all");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [supabaseMembers, setSupabaseMembers] = useState<DirectoryMember[]>([]);
  const [supabaseProMap, setSupabaseProMap] = useState<Record<string, "PRO" | "Free">>({});

  // Manual PRO Activation & Renewal Modal State
  const [renewModalMember, setRenewModalMember] = useState<DirectoryMember | null>(
    null
  );
  const [renewStartDate, setRenewStartDate] = useState<string>(getTodayIsoDate);
  const [renewDueDate, setRenewDueDate] = useState<string>(() =>
    addDaysToIsoDate(getTodayIsoDate(), 30)
  );
  const [renewPackageName, setRenewPackageName] = useState<string>("Pro");
  const [renewPackageId, setRenewPackageId] = useState<string>("pkg-pro");
  const [renewBillingCycle, setRenewBillingCycle] = useState<
    "3d_trial" | "7d_trial" | "30d"
  >("30d");
  const [isSavingRenewal, setIsSavingRenewal] = useState(false);
  const [quickExtendingEmail, setQuickExtendingEmail] = useState<string | null>(
    null
  );
  const [localSubOverrides, setLocalSubOverrides] = useState<
    Record<
      string,
      {
        subscriptionTier: "PRO" | "Free";
        proStartedAt: string | null;
        proExpiresAt: string | null;
        proPackageName: string | null;
        proPackageId?: string | null;
        proBillingCycle?: string | null;
        hasUsedTrial?: boolean;
      }
    >
  >({});

  // Manual Points Adjustment State
  const [adjustPointsTarget, setAdjustPointsTarget] = useState<DirectoryMember | null>(null);
  const [adjustPointsMode, setAdjustPointsMode] = useState<"add" | "set">("add");
  const [adjustPointsValue, setAdjustPointsValue] = useState<number>(100);
  const [adjustPointsReason, setAdjustPointsReason] = useState<string>("Bonus Keaktifan");
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);

  // Optimistic in-memory role state (synced to Supabase via admin_update_user_role RPC)
  const [optimisticRoles, setOptimisticRoles] = useState<
    Record<string, "Learner" | "Mentor" | "Admin">
  >({});
  const [invitedMembers, setInvitedMembers] = useState<DirectoryMember[]>(
    INITIAL_DIRECTORY_EXTRA
  );

  const [userEnrollmentsMap, setUserEnrollmentsMap] = useState<
    Record<
      string,
      { contentId: string; completedCount: number; progressPercent: number }[]
    >
  >({});

  // Ephemeral copy-once state for just-reset passwords (never persisted to DB or localStorage)
  const [ephemeralResetInfo, setEphemeralResetInfo] = useState<{
    email: string;
    password: string;
    updatedAt: string;
    updatedBy?: string;
  } | null>(null);

  const [pendingProRequests, setPendingProRequests] = useState<
    InsightsProRequestRecord[]
  >([]);
  const [allProRequests, setAllProRequests] = useState<
    InsightsProRequestRecord[]
  >([]);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [previewProofReq, setPreviewProofReq] =
    useState<InsightsProRequestRecord | null>(null);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  const courseSectionsRef = useRef(courseSections);
  courseSectionsRef.current = courseSections;
  const assignedCountRef = useRef(learnerAssignedItems.length);
  assignedCountRef.current = learnerAssignedItems.length;
  const lastDirFetchAtRef = useRef<number>(0);
  const [isRefreshingDir, setIsRefreshingDir] = useState(false);

  // Fetch registered learners & pending PRO upgrade requests (Event-driven + Realtime, zero 3s polling)
  const loadSupabaseDirectory = useCallback(async (showSpinner = false) => {
    if (!isSupabaseConfigured) return;
    if (showSpinner) setIsRefreshingDir(true);
    try {
      lastDirFetchAtRef.current = Date.now();

      const fetchProfilesWithFallback = async () => {
        if (dirProfilesHasSubDateCols && dirProfilesHasTierV2Cols) {
          const res = await supabase
            .from("profiles")
            .select(
              "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, pro_package_id, pro_billing_cycle, has_used_trial, trial_used_at, total_points, created_at"
            )
            .order("created_at", { ascending: false });
          if (!res.error) return res;
          if (isMissingTierV2ColumnError(res.error)) {
            dirProfilesHasTierV2Cols = false;
          } else if (isMissingSubDateColumnError(res.error)) {
            dirProfilesHasSubDateCols = false;
          } else {
            return res;
          }
        }
        if (dirProfilesHasSubDateCols) {
          const res = await supabase
            .from("profiles")
            .select(
              "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, total_points, created_at"
            )
            .order("created_at", { ascending: false });
          if (!res.error) return res;
          if (isMissingSubDateColumnError(res.error)) {
            dirProfilesHasSubDateCols = false;
          } else {
            return res;
          }
        }
        return supabase
          .from("profiles")
          .select(
            "id, full_name, email, avatar_url, role, job_title, subscription_tier, total_points, created_at"
          )
          .order("created_at", { ascending: false });
      };

      const fetchProRequestsWithFallback = async () => {
        if (dirProReqHasTierV2Cols) {
          const res = await supabase
            .from("pro_upgrade_requests")
            .select(
              "id, user_email, user_name, package_id, package_name, price_label, payment_method, buyer_contact, proof_url, status, billing_cycle, duration_days, request_type, target_item_key, target_item_title, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(200);
          if (!res.error) return res;
          if (isMissingTierV2ColumnError(res.error)) {
            dirProReqHasTierV2Cols = false;
          } else {
            return res;
          }
        }
        return supabase
          .from("pro_upgrade_requests")
          .select(
            "id, user_email, user_name, package_name, price_label, payment_method, buyer_contact, proof_url, status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(200);
      };

      const [
        profilesRes,
        userProfilesRes,
        userSubsRes,
        enrollmentsRes,
        submissionsRes,
        proReqRes,
      ] = await Promise.all([
        fetchProfilesWithFallback(),
        supabase
          .from("user_profiles")
          .select(
            "user_id, username, name, full_name, email, role, job_title, avatar_url, perks, updated_at"
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("user_subscriptions")
          .select("username, plan_tier, status, started_at, due_at, renewal_status, updated_at"),
        supabase
          .from("enrollments")
          .select("learner_id, content_id, completed_chapter_ids, progress_percent"),
        supabase
          .from("submissions")
          .select("learner_id, score_percent"),
        fetchProRequestsWithFallback(),
      ]);

      if (Array.isArray(proReqRes.data)) {
        const allReqs = proReqRes.data as typeof pendingProRequests;
        setAllProRequests(allReqs);
        setPendingProRequests(
          allReqs.filter(
            (r) => !r.status || String(r.status).toLowerCase() === "pending"
          )
        );
      }

      const subByUsername = new Map<string, any>();
      if (Array.isArray(userSubsRes?.data)) {
        userSubsRes.data.forEach((sub: any) => {
          if (!sub?.username) return;
          subByUsername.set(String(sub.username).toLowerCase().trim(), sub);
        });
      }

      const userProfByEmail = new Map<string, any>();
      const subByEmail = new Map<string, any>();
      if (Array.isArray(userProfilesRes.data)) {
        userProfilesRes.data.forEach((up: any) => {
          if (!up?.email) return;
          const eKey = String(up.email).toLowerCase().trim();
          if (!userProfByEmail.has(eKey)) {
            userProfByEmail.set(eKey, up);
          }
          if (up.username && !subByEmail.has(eKey)) {
            const matchedSub = subByUsername.get(
              String(up.username).toLowerCase().trim()
            );
            if (matchedSub) {
              subByEmail.set(eKey, matchedSub);
            }
          }
        });
      }

      const nextEnrollMap: Record<
        string,
        { contentId: string; completedCount: number; progressPercent: number }[]
      > = {};
      if (Array.isArray(enrollmentsRes.data)) {
        enrollmentsRes.data.forEach((row: any) => {
          if (!row?.learner_id || !row?.content_id) return;
          const list = nextEnrollMap[row.learner_id] || [];
          list.push({
            contentId: row.content_id,
            completedCount: Array.isArray(row.completed_chapter_ids)
              ? row.completed_chapter_ids.length
              : 0,
            progressPercent: Number(row.progress_percent || 0),
          });
          nextEnrollMap[row.learner_id] = list;
        });
      }
      setUserEnrollmentsMap(nextEnrollMap);

      const merged: DirectoryMember[] = [];
      const totalChCount = courseSectionsRef.current.flatMap((s) => s.chapters).length;
      const nextProMap: Record<string, "PRO" | "Free"> = {};

      if (Array.isArray(profilesRes.data)) {
        profilesRes.data.forEach((p: any, idx: number) => {
          if (!p.email) return;
          const emailLower = String(p.email).toLowerCase().trim();
          const upMatch = userProfByEmail.get(emailLower);
          const subMatch = subByEmail.get(emailLower);
          const isProProfile =
            String(p.subscription_tier || "").toLowerCase() === "pro" ||
            Boolean(upMatch?.perks?.is_pro) ||
            (String(subMatch?.plan_tier || "").toUpperCase() === "PRO" &&
              String(subMatch?.status || "aktif").toLowerCase() === "aktif");

          const name = p.full_name || p.email.split("@")[0];
          const tierVal: "PRO" | "Free" = isProProfile ? "PRO" : "Free";
          nextProMap[emailLower] = tierVal;
          if (name) {
            nextProMap[name] = tierVal;
            nextProMap[name.toLowerCase()] = tierVal;
          }

          const initials =
            name
              .split(" ")
              .filter(Boolean)
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "LN";

          const rawDbRole: "Admin" | "Mentor" | "Learner" =
            p.role === "admin"
              ? "Admin"
              : p.role === "mentor"
              ? "Mentor"
              : "Learner";

          const userEnrollments = Array.isArray(enrollmentsRes.data)
            ? enrollmentsRes.data.filter((e: any) => e.learner_id === p.id)
            : [];
          const userSubmissions = Array.isArray(submissionsRes.data)
            ? submissionsRes.data.filter((s: any) => s.learner_id === p.id)
            : [];

          let completedCh = 0;
          userEnrollments.forEach((e: any) => {
            if (Array.isArray(e.completed_chapter_ids)) {
              completedCh += e.completed_chapter_ids.length;
            }
          });

          let avgQuiz = 0;
          if (userSubmissions.length > 0) {
            const totalScore = userSubmissions.reduce(
              (acc: number, curr: any) =>
                acc + (Number(curr.score_percent) || 0),
              0
            );
            avgQuiz = Math.round(totalScore / userSubmissions.length);
          }

          const resolvedStartedAt =
            p.pro_started_at ??
            upMatch?.perks?.pro_started_at ??
            subMatch?.started_at ??
            (isProProfile ? p.created_at ?? null : null);
          const resolvedExpiresAt =
            p.pro_expires_at ??
            upMatch?.perks?.pro_expires_at ??
            subMatch?.due_at ??
            null;
          const resolvedPackageName =
            p.pro_package_name ??
            upMatch?.perks?.pro_package_name ??
            (isProProfile ? "Pro" : null);

          merged.push({
            id: p.id || `sb-prof-${idx}`,
            name,
            email: p.email,
            initials,
            avatarUrl:
              typeof p.avatar_url === "string" && p.avatar_url.trim()
                ? p.avatar_url.trim()
                : undefined,
            avatarBg: "#EEF2FF",
            avatarText: "#4F39F6",
            jobTitle: p.job_title || (rawDbRole === "Admin" ? "Admin Collaborator" : rawDbRole === "Mentor" ? "Mentor Collaborator" : "Social Media Specialist"),
            cohort: "Batch Oktober 2026",
            accessRole: rawDbRole,
            assignedCount: assignedCountRef.current,
            completedChapters: completedCh,
            totalChapters: totalChCount,
            avgQuizScore: avgQuiz,
            points: Math.max(0, Number(p.total_points ?? 0)),
            credentialId: `RS2-2026-850${idx + 1}`,
            subscriptionTier: tierVal,
            proStartedAt: resolvedStartedAt,
            proExpiresAt: resolvedExpiresAt,
            proPackageName: resolvedPackageName,
            proPackageId: p.pro_package_id ?? null,
            proBillingCycle: p.pro_billing_cycle ?? null,
            hasUsedTrial: Boolean(p.has_used_trial),
            trialUsedAt: p.trial_used_at ?? null,
            createdAt: p.created_at ?? null,
            paymentMethod: subMatch?.payment_method ?? null,
          });
        });
      }

      if (Array.isArray(userProfilesRes.data)) {
        userProfilesRes.data.forEach((up: any, idx: number) => {
          if (!up.email) return;
          const emailLower = String(up.email).toLowerCase().trim();
          const subMatch = up.username
            ? subByUsername.get(String(up.username).toLowerCase().trim())
            : undefined;
          const name = up.name || up.username || up.email.split("@")[0];
          const isProUp =
            Boolean(up.perks?.is_pro) ||
            (String(subMatch?.plan_tier || "").toUpperCase() === "PRO" &&
              String(subMatch?.status || "aktif").toLowerCase() === "aktif");
          const existingProf = merged.find(
            (m) => m.email.toLowerCase() === emailLower
          );
          const tierVal: "PRO" | "Free" = existingProf
            ? existingProf.subscriptionTier || (isProUp ? "PRO" : "Free")
            : isProUp
            ? "PRO"
            : "Free";

          nextProMap[name] = tierVal;
          nextProMap[name.toLowerCase()] = tierVal;
          nextProMap[emailLower] = tierVal;

          if (existingProf) {
            return;
          }

          const initials =
            name
              .split(" ")
              .filter(Boolean)
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "LN";

          const rawUpRole: "Admin" | "Mentor" | "Learner" =
            up.role === "admin"
              ? "Admin"
              : up.role === "mentor"
              ? "Mentor"
              : "Learner";

          merged.push({
            id: up.user_id || `sb-uprof-${up.username || idx}`,
            name,
            email: up.email,
            initials,
            avatarUrl:
              typeof up.avatar_url === "string" && up.avatar_url.trim()
                ? up.avatar_url.trim()
                : undefined,
            avatarBg: "#EEF2FF",
            avatarText: "#4F39F6",
            jobTitle: up.job_title || (rawUpRole === "Admin" ? "Admin Collaborator" : rawUpRole === "Mentor" ? "Mentor Collaborator" : "Social Media Specialist"),
            cohort: "Batch Oktober 2026",
            accessRole: rawUpRole,
            assignedCount: assignedCountRef.current,
            completedChapters: 0,
            totalChapters: totalChCount,
            avgQuizScore: 0,
            points: Math.max(
              0,
              Number(up.perks?.total_points ?? up.perks?.points ?? 0)
            ),
            credentialId: `RS2-2026-860${idx + 1}`,
            subscriptionTier: tierVal,
            proStartedAt: up.perks?.pro_started_at ?? subMatch?.started_at ?? null,
            proExpiresAt: up.perks?.pro_expires_at ?? subMatch?.due_at ?? null,
            proPackageName:
              up.perks?.pro_package_name ?? (isProUp ? "Learner PRO Monthly" : null),
            createdAt: up.updated_at ?? null,
            paymentMethod: subMatch?.payment_method ?? null,
          });
        });
      }

      setSupabaseProMap(nextProMap);
      setSupabaseMembers(merged);
      if (dirProfilesHasSubDateCols) {
        setLocalSubOverrides({});
      }
    } catch {
      // Ignore fetch errors
    } finally {
      if (showSpinner) setIsRefreshingDir(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    void loadSupabaseDirectory();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let idleDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dirChannel: ReturnType<typeof supabase.channel> | null = null;

    const scheduleRefresh = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadSupabaseDirectory();
      }, 1000);
    };

    const subscribeDirChannel = () => {
      if (dirChannel) return;
      if (typeof document !== "undefined" && document.hidden) return;
      dirChannel = supabase
        .channel("admin-learners-directory-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          scheduleRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_profiles" },
          scheduleRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_subscriptions" },
          scheduleRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pro_upgrade_requests" },
          scheduleRefresh
        )
        .subscribe();
    };

    const disconnectDirChannel = () => {
      if (dirChannel) {
        void supabase.removeChannel(dirChannel);
        dirChannel = null;
      }
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.hidden) {
        if (idleDisconnectTimer) clearTimeout(idleDisconnectTimer);
        idleDisconnectTimer = setTimeout(() => {
          if (typeof document !== "undefined" && document.hidden) {
            disconnectDirChannel();
          }
        }, 90_000);
        return;
      }
      if (idleDisconnectTimer) {
        clearTimeout(idleDisconnectTimer);
        idleDisconnectTimer = null;
      }
      subscribeDirChannel();
      if (Date.now() - lastDirFetchAtRef.current < 30_000) return;
      void loadSupabaseDirectory();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    subscribeDirChannel();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (idleDisconnectTimer) clearTimeout(idleDisconnectTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      disconnectDirChannel();
    };
  }, [loadSupabaseDirectory]);

  // Invite Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCohort, setInviteCohort] = useState("Batch Oktober 2026");
  const [inviteRole, setInviteRole] = useState<"Learner" | "Mentor" | "Admin">(
    "Learner"
  );

  // Available learning materials for initial assignment during student registration
  const availableMaterials: ExplorerContentItem[] = useMemo(() => {
    return (explorerItems || []).filter(
      (item: ExplorerContentItem) => item.type !== "Folder" && !item.isArchived
    );
  }, [explorerItems]);

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  const handleOpenInviteModal = () => {
    // Pre-select all available materials by default for convenience, admin can uncheck/customize
    setSelectedMaterialIds(availableMaterials.map((m: ExplorerContentItem) => m.id));
    setInviteModalOpen(true);
  };

  // Portfolio & Security Inspector Modal state
  const [inspectedMember, setInspectedMember] =
    useState<DirectoryMember | null>(null);
  const [profileTab, setProfileTab] = useState<
    "activity" | "assigned" | "security"
  >("activity");
  const [certificateMember, setCertificateMember] =
    useState<DirectoryMember | null>(null);

  // Admin Direct Password Reset states
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    setEphemeralResetInfo(null);
    setResetPasswordInput("");
  }, [inspectedMember?.id]);

  // List of materials assigned to the currently inspected member
  const memberAssignedItems = useMemo(() => {
    if (!inspectedMember) return [];
    const emailKey = (inspectedMember.email || "").toLowerCase().trim();
    const nameKey = (inspectedMember.name || "").toLowerCase().trim();
    const nameParts = nameKey.split(" ").filter(Boolean);
    const firstLast =
      nameParts.length >= 3
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
        : "";
    const cohortWildcards = new Set([
      "all learners",
      "batch oktober 2026",
      "ruang sosmed class",
      "creator growth lab",
      "specialist growth lab",
    ]);

    return (explorerItems || []).filter((exp: ExplorerContentItem) => {
      if (exp.type === "Folder") return false;
      if (
        inspectedMember.accessRole === "Learner" &&
        isItemInSharedCohortProject(exp, explorerItems || [], cohortProjects)
      ) {
        return true;
      }
      const parentFolder = exp.folderName
        ? (explorerItems || []).find(
            (f: ExplorerContentItem) =>
              f.type === "Folder" &&
              f.title.trim().toLowerCase() === exp.folderName!.trim().toLowerCase()
          )
        : undefined;
      const assignedList = [
        ...(Array.isArray(exp.assignedLearners) ? exp.assignedLearners : []),
        ...(Array.isArray(parentFolder?.assignedLearners)
          ? parentFolder.assignedLearners
          : []),
      ];
      if (assignedList.length === 0) return false;
      return assignedList.some((entry) => {
        const norm = String(entry || "").toLowerCase().trim();
        if (!norm) return false;
        if (cohortWildcards.has(norm)) return true;
        if (emailKey && norm === emailKey) return true;
        if (nameKey && norm === nameKey) return true;
        if (firstLast && norm === firstLast) return true;
        return false;
      });
    });
  }, [inspectedMember, explorerItems, cohortProjects]);

  const memberUnassignedMaterials = useMemo(() => {
    const assignedIds = new Set(memberAssignedItems.map((m) => m.id));
    return availableMaterials.filter((m) => !assignedIds.has(m.id));
  }, [availableMaterials, memberAssignedItems]);

  const memberClaimedRewards = useMemo(() => {
    if (!inspectedMember) return [];
    const emailKey = (inspectedMember.email || "").toLowerCase().trim();
    const nameKey = (inspectedMember.name || "").toLowerCase().trim();
    return (claimedRewards || []).filter((r) => {
      const rEmail = (r.claimedByEmail || "").toLowerCase().trim();
      const rName = (r.claimedByName || "").toLowerCase().trim();
      return (emailKey && rEmail === emailKey) || (nameKey && rName === nameKey);
    });
  }, [inspectedMember, claimedRewards]);

  const handleAssignMaterialToMember = (
    member: DirectoryMember,
    mat: ExplorerContentItem
  ) => {
    assignContentToLearners(
      mat,
      [member.name, member.email].filter(Boolean),
      "2026-12-31",
      "Individual"
    );
    onShowToast(`Materi "${mat.title}" berhasil ditambahkan ke ${member.name}.`);
  };

  const handleRevokeMemberAccess = (
    member: DirectoryMember,
    contentId: string,
    contentTitle: string
  ) => {
    unassignLearnerFromContent(contentTitle, {
      id: member.id,
      name: member.name,
      email: member.email,
    });
    // Also trigger Supabase unassign if configured
    if (isSupabaseConfigured && member.id && contentId) {
      import("@/lib/supabase/services").then(({ enrollmentsService }) => {
        enrollmentsService.unassignLearner(contentId, member.id).catch(() => {});
      });
    }
    onShowToast(`Akses ke "${contentTitle}" untuk ${member.name} berhasil dicabut & otomatis hilang dari halaman siswa.`);
  };

  const getMemberPasswordRecord = (member: DirectoryMember | null) => {
    if (!member || !ephemeralResetInfo) return null;
    const emailKey = (member.email || "").toLowerCase().trim();
    return ephemeralResetInfo.email === emailKey ? ephemeralResetInfo : null;
  };

  const handleGenerateResetPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let suffix = "";
    for (let i = 0; i < 8; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    setResetPasswordInput(`RS-${suffix}`);
    setShowResetPassword(true);
  };

  const handleCopyResetPassword = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPassword(true);
      onShowToast("Password baru berhasil disalin ke clipboard.");
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      onShowToast("Gagal menyalin password.");
    }
  };

  const handleAdminDirectPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedMember) return;
    const nextPassword = resetPasswordInput.trim();
    if (nextPassword.length < 6) {
      onShowToast("Password minimal harus 6 karakter.");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error("Koneksi database diperlukan untuk reset password.");
      }

      const { data: rpcOk, error: rpcErr } = await supabase.rpc(
        "admin_reset_user_password",
        {
          p_identifier: inspectedMember.email || inspectedMember.name,
          p_new_password: nextPassword,
        }
      );

      if (rpcErr || !rpcOk) {
        throw new Error(
          rpcErr?.message ||
            "Pastikan akun sudah terdaftar di Supabase Auth dan Anda login sebagai Admin."
        );
      }

      const emailKey = (inspectedMember.email || "").toLowerCase().trim();
      setEphemeralResetInfo({
        email: emailKey,
        password: nextPassword,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || "Admin",
      });

      onShowToast(
        `🔑 Password untuk ${inspectedMember.name} berhasil direset secara aman di Supabase Auth.`
      );
      setResetPasswordInput("");
    } catch (err: any) {
      onShowToast(`Gagal mereset password: ${err?.message || "Akses ditolak"}`);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSendSupabaseResetEmail = async () => {
    if (!inspectedMember?.email || !isSupabaseConfigured) return;
    setIsSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        inspectedMember.email,
        {
          redirectTo: getAuthRedirectUrl(),
        }
      );
      if (error) throw error;
      onShowToast(
        `📧 Link reset password dikirim ke email ${inspectedMember.email}.`
      );
    } catch (err: any) {
      onShowToast(
        `Tidak dapat mengirim email reset Supabase: ${err?.message || "Gunakan Reset Password Langsung di sebelah kiri."}`
      );
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const currentTargetPoints = adjustPointsTarget ? adjustPointsTarget.points : 0;
  const finalCalculatedPoints =
    adjustPointsMode === "add"
      ? Math.max(0, currentTargetPoints + (Number(adjustPointsValue) || 0))
      : Math.max(0, Number(adjustPointsValue) || 0);

  const handleSaveAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPointsTarget) return;

    setIsAdjustingPoints(true);
    const newPoints = finalCalculatedPoints;
    try {
      syncUserPointsBalance({
        id: adjustPointsTarget.id,
        email: adjustPointsTarget.email,
        name: adjustPointsTarget.name,
        newPoints,
      });

      // Update local Supabase directory state immediately
      setSupabaseMembers((prev) =>
        prev.map((m) =>
          m.email.toLowerCase() === adjustPointsTarget.email.toLowerCase() ||
          m.name.toLowerCase() === adjustPointsTarget.name.toLowerCase()
            ? { ...m, points: newPoints }
            : m
        )
      );

      // Also update inspected member if currently open
      if (
        inspectedMember &&
        (inspectedMember.email.toLowerCase() === adjustPointsTarget.email.toLowerCase() ||
          inspectedMember.name.toLowerCase() === adjustPointsTarget.name.toLowerCase())
      ) {
        setInspectedMember((prev) => (prev ? { ...prev, points: newPoints } : null));
      }

      // Simpan pending notification & dispatch event perayaan agar Learner Portal langsung memunculkan popup
      const diff =
        adjustPointsMode === "add"
          ? adjustPointsValue
          : Math.max(0, newPoints - currentTargetPoints);

      if (typeof window !== "undefined") {
        try {
          const targetKey = adjustPointsTarget.email.toLowerCase().trim();
          const pendingKey = `ruang_sosmed_pending_notif_${targetKey}`;
          const notifPayload = {
            id: `pts-award-${Date.now()}`,
            title: `⭐ +${diff.toLocaleString()} Poin Bintang Diterima!`,
            body: `Admin telah memberikan poin (Alasan: ${adjustPointsReason}). Total saldo Anda sekarang: ${newPoints.toLocaleString()} pts.`,
            addedPoints: diff,
            newTotal: newPoints,
            learnerEmail: adjustPointsTarget.email,
            learnerName: adjustPointsTarget.name,
            reason: adjustPointsReason,
            timestamp: Date.now(),
          };
          window.localStorage.setItem(pendingKey, JSON.stringify(notifPayload));

          // Also trigger general pending notif if learner is logged in
          const rawSess = window.localStorage.getItem("ruang_sosmed_session_user_v1");
          if (rawSess) {
            const parsedSess = JSON.parse(rawSess);
            if (
              parsedSess?.email &&
              parsedSess.email.toLowerCase().trim() === targetKey
            ) {
              window.localStorage.setItem(
                "ruang_sosmed_active_points_popup",
                JSON.stringify(notifPayload)
              );
            }
          }
        } catch {}

        window.dispatchEvent(
          new CustomEvent("ruang_sosmed_points_awarded", {
            detail: {
              addedPoints: diff,
              newTotal: newPoints,
              learnerEmail: adjustPointsTarget.email,
              learnerName: adjustPointsTarget.name,
              reason: adjustPointsReason,
            },
          })
        );
      }

      onShowToast(
        `⭐ Poin ${adjustPointsTarget.name} berhasil diatur ke ${newPoints.toLocaleString()} pts (${
          adjustPointsMode === "add"
            ? `${adjustPointsValue >= 0 ? "+" : ""}${adjustPointsValue}`
            : `Set ${newPoints}`
        }).`
      );
      setAdjustPointsTarget(null);
    } catch (err: any) {
      onShowToast(`Gagal menyimpan poin: ${err.message || "Error"}`);
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  // Build unified directory from Supabase profiles + live store assignees + invited members
  const totalCourseChapters = courseSections.flatMap((s) => s.chapters).length;

  const storeMembers: DirectoryMember[] = assignees.map((asg, idx) => {
    const lbMatch = leaderboard.find(
      (l) => l.name.toLowerCase() === asg.name.toLowerCase()
    );
    const sbMatch = supabaseMembers.find(
      (s) => s.name.toLowerCase() === asg.name.toLowerCase()
    );
    const slug = asg.name.toLowerCase().replace(/[^a-z0-9]/g, ".");
    return {
      id: asg.id,
      name: asg.name,
      email: sbMatch?.email ?? `${slug}@ruangsosmed.id`,
      initials: asg.initials,
      avatarBg: asg.avatarBg,
      avatarText: asg.avatarText,
      jobTitle: sbMatch?.jobTitle ?? lbMatch?.role ?? `${asg.roleBadge} Specialist`,
      cohort: sbMatch?.cohort ?? "Batch Oktober 2026",
      accessRole: optimisticRoles[asg.id] ?? "Learner",
      assignedCount: learnerAssignedItems.length,
      completedChapters: asg.completedChapters,
      totalChapters: totalCourseChapters,
      avgQuizScore: 0,
      points: lbMatch?.points ?? sbMatch?.points ?? 0,
      credentialId: `RS2-2026-849${idx + 2}`,
      subscriptionTier: sbMatch?.subscriptionTier,
      proStartedAt: sbMatch?.proStartedAt,
      proExpiresAt: sbMatch?.proExpiresAt,
      proPackageName: sbMatch?.proPackageName,
      proPackageId: sbMatch?.proPackageId,
      proBillingCycle: sbMatch?.proBillingCycle,
      hasUsedTrial: sbMatch?.hasUsedTrial,
      trialUsedAt: sbMatch?.trialUsedAt,
      createdAt: sbMatch?.createdAt,
      paymentMethod: sbMatch?.paymentMethod,
    };
  });

  const nonDuplicateSupabaseMembers = supabaseMembers.filter(
    (sb) =>
      !storeMembers.some(
        (sm) =>
          sm.email.toLowerCase() === sb.email.toLowerCase() ||
          sm.name.toLowerCase() === sb.name.toLowerCase()
      )
  );

  const collabDirectoryMembers: DirectoryMember[] = (
    workspaceCollaborators || []
  )
    .filter(
      (c) =>
        c.email.toLowerCase() !== "dinur@ruangsosmed.id" &&
        !storeMembers.some(
          (sm) => sm.name.toLowerCase() === c.name.toLowerCase()
        )
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      initials: c.initials,
      avatarBg: c.avatarBg,
      avatarText: c.avatarText,
      jobTitle: `${c.role} Collaborator`,
      cohort: c.cohort,
      accessRole: (c.role as "Admin" | "Mentor" | "Learner") || "Admin",
      assignedCount: learnerAssignedItems.length,
      completedChapters: 0,
      totalChapters: totalCourseChapters,
      avgQuizScore: 100,
      points: 0,
      credentialId: `RS2-COLLAB-${c.initials}`,
    }));

  // Gabungkan seluruh sumber data dan satukan (deduplicate & merge) akun yang memiliki email sama
  const rawList = [
    ...collabDirectoryMembers,
    ...nonDuplicateSupabaseMembers,
    ...storeMembers,
    ...invitedMembers,
  ];

  const mergedByEmail = new Map<string, DirectoryMember>();

  rawList.forEach((m) => {
    const key = (m.email || m.name).toLowerCase().trim();
    const existing = mergedByEmail.get(key);

    const mKey = (m.email || m.name || m.id).toLowerCase().trim();
    const mEmailKey = (m.email || "").toLowerCase().trim();
    const mNameKey = (m.name || "").toLowerCase().trim();
    const mOverride =
      optimisticRoles[mKey] ||
      optimisticRoles[mEmailKey] ||
      optimisticRoles[mNameKey] ||
      optimisticRoles[m.id];

    if (!existing) {
      const initialRole = mOverride || m.accessRole;
      const initialJob =
        m.email?.toLowerCase().includes("dinur")
          ? "Founder & Dev Admin"
          : initialRole === "Admin"
          ? "Admin Collaborator"
          : initialRole === "Mentor"
          ? "Mentor Collaborator"
          : m.jobTitle.includes("Collaborator")
          ? "Social Media Specialist"
          : m.jobTitle;

      mergedByEmail.set(key, {
        ...m,
        accessRole: initialRole,
        jobTitle: initialJob,
      });
      return;
    }

    // Explicit optimistic role update from current Admin action
    const existingOverride =
      optimisticRoles[key] ||
      optimisticRoles[existing.email?.toLowerCase().trim() || ""] ||
      optimisticRoles[existing.name?.toLowerCase().trim() || ""] ||
      optimisticRoles[existing.id];

    const activeOverride = mOverride || existingOverride;

    const rolePriority: Record<string, number> = { Admin: 3, Mentor: 2, Learner: 1 };
    const currentRole = mOverride ?? m.accessRole;
    const existingRole = existingOverride ?? existing.accessRole;
    const resolvedRole =
      activeOverride ||
      ((rolePriority[currentRole] || 1) >= (rolePriority[existingRole] || 1)
        ? currentRole
        : existingRole);

    const preferredName =
      m.name.trim().length >= existing.name.trim().length
        ? m.name.trim()
        : existing.name.trim();

    const preferredInitials =
      m.name.trim().length >= existing.name.trim().length
        ? m.initials
        : existing.initials;

    const preferredCohort =
      m.cohort !== "Batch Oktober 2026" ? m.cohort : existing.cohort;

    const resolvedJob =
      m.email?.toLowerCase().includes("dinur") || existing.email?.toLowerCase().includes("dinur")
        ? "Founder & Dev Admin"
        : resolvedRole === "Admin"
        ? "Admin Collaborator"
        : resolvedRole === "Mentor"
        ? "Mentor Collaborator"
        : "Social Media Specialist";

    const sbMatch = supabaseMembers.find(
      (s) =>
        s.email.toLowerCase() === key ||
        s.name.toLowerCase() === key
    );

    const actualAssignedCount = (explorerItems || []).filter((exp) => {
      if (exp.type === "Folder") return false;
      if (
        resolvedRole === "Learner" &&
        isItemInSharedCohortProject(exp, explorerItems || [], cohortProjects)
      ) {
        return true;
      }
      const parentFolder = exp.folderName
        ? (explorerItems || []).find(
            (f) =>
              f.type === "Folder" &&
              f.title.trim().toLowerCase() === exp.folderName!.trim().toLowerCase()
          )
        : undefined;
      const list = [
        ...(exp.assignedLearners || []),
        ...(parentFolder?.assignedLearners || []),
      ];
      if (list.length === 0) return false;
      return list.some((entry) => {
        const norm = String(entry || "").toLowerCase().trim();
        return (
          norm === "all learners" ||
          norm === "batch oktober 2026" ||
          norm === "ruang sosmed class" ||
          norm === "creator growth lab" ||
          norm === "specialist growth lab" ||
          (key && norm === key) ||
          (preferredName && norm === preferredName.toLowerCase()) ||
          (existing.email && norm === existing.email.toLowerCase())
        );
      });
    }).length;

    mergedByEmail.set(key, {
      ...existing,
      ...m,
      name: preferredName,
      initials: preferredInitials,
      assignedCount: actualAssignedCount,
      avatarUrl:
        resolveUserAvatar(m.email, existing.email, preferredName, m.id) ||
        sbMatch?.avatarUrl ||
        m.avatarUrl ||
        existing.avatarUrl,
      jobTitle: resolvedJob,
      accessRole: resolvedRole,
      cohort: preferredCohort,
      points: sbMatch ? sbMatch.points : Math.max(existing.points || 0, m.points || 0),
      completedChapters: sbMatch && sbMatch.completedChapters > 0
        ? sbMatch.completedChapters
        : Math.max(existing.completedChapters || 0, m.completedChapters || 0),
      avgQuizScore: sbMatch && sbMatch.avgQuizScore > 0
        ? sbMatch.avgQuizScore
        : Math.max(existing.avgQuizScore || 0, m.avgQuizScore || 0),
      subscriptionTier:
        sbMatch?.subscriptionTier ?? m.subscriptionTier ?? existing.subscriptionTier,
      proStartedAt:
        sbMatch?.proStartedAt ?? m.proStartedAt ?? existing.proStartedAt,
      proExpiresAt:
        sbMatch?.proExpiresAt ?? m.proExpiresAt ?? existing.proExpiresAt,
      proPackageName:
        sbMatch?.proPackageName ?? m.proPackageName ?? existing.proPackageName,
      proPackageId:
        sbMatch?.proPackageId ?? m.proPackageId ?? existing.proPackageId,
      proBillingCycle:
        sbMatch?.proBillingCycle ?? m.proBillingCycle ?? existing.proBillingCycle,
      hasUsedTrial: Boolean(
        sbMatch?.hasUsedTrial ?? m.hasUsedTrial ?? existing.hasUsedTrial
      ),
      trialUsedAt:
        sbMatch?.trialUsedAt ?? m.trialUsedAt ?? existing.trialUsedAt,
      createdAt:
        sbMatch?.createdAt ?? m.createdAt ?? existing.createdAt,
      paymentMethod:
        sbMatch?.paymentMethod ?? m.paymentMethod ?? existing.paymentMethod,
    });
  });

  const allDirectoryMembers = Array.from(mergedByEmail.values()).map((member) => {
    const emailLower = (member.email || "").toLowerCase().trim();
    const mappedPoints = resolveUserPoints(member.email, member.name, member.id);
    const currentEmailLower = (currentUser?.email || "").toLowerCase().trim();
    const currentNameLower = (currentUser?.name || "").toLowerCase().trim();
    const isCurrentSessionMember =
      (currentEmailLower && emailLower === currentEmailLower) ||
      (currentNameLower && member.name.toLowerCase().trim() === currentNameLower);
    const resolvedPoints =
      mappedPoints !== null
        ? mappedPoints
        : isCurrentSessionMember
        ? learnerPoints
        : member.points;

    const override = localSubOverrides[emailLower];
    return {
      ...member,
      points: resolvedPoints,
      ...(override
        ? {
            subscriptionTier: override.subscriptionTier,
            proStartedAt: override.proStartedAt,
            proExpiresAt: override.proExpiresAt,
            proPackageName: override.proPackageName,
            proPackageId: override.proPackageId ?? member.proPackageId,
            proBillingCycle: override.proBillingCycle ?? member.proBillingCycle,
            hasUsedTrial:
              typeof override.hasUsedTrial === "boolean"
                ? override.hasUsedTrial
                : member.hasUsedTrial,
          }
        : {}),
    };
  });

  const getMemberSubInfo = (
    member: DirectoryMember
  ): SubscriptionStatusInfo | null => {
    if (member.accessRole !== "Learner") return null;
    const emailKey = (member.email || "").toLowerCase().trim();
    const nameKey = (member.name || "").toLowerCase().trim();
    const explicitTier =
      member.subscriptionTier ??
      supabaseProMap[emailKey] ??
      supabaseProMap[member.name] ??
      supabaseProMap[nameKey] ??
      learnerSubscriptions?.[emailKey] ??
      learnerSubscriptions?.[member.name] ??
      learnerSubscriptions?.[nameKey] ??
      "Free";
    return getSubscriptionStatusInfo({
      isProTier: explicitTier === "PRO",
      startedAt: member.proStartedAt,
      expiresAt: member.proExpiresAt,
      warningDays: 7,
    });
  };

  const tabCounts = useMemo(() => {
    let proActive = 0;
    let expiringOrExpired = 0;
    let overdueCount = 0;
    allDirectoryMembers.forEach((m) => {
      if (m.accessRole !== "Learner") return;
      const emailKey = (m.email || "").toLowerCase().trim();
      const nameKey = (m.name || "").toLowerCase().trim();
      const tier =
        m.subscriptionTier ??
        supabaseProMap[emailKey] ??
        supabaseProMap[m.name] ??
        supabaseProMap[nameKey] ??
        learnerSubscriptions?.[emailKey] ??
        learnerSubscriptions?.[m.name] ??
        learnerSubscriptions?.[nameKey] ??
        "Free";
      const info = getSubscriptionStatusInfo({
        isProTier: tier === "PRO",
        startedAt: m.proStartedAt,
        expiresAt: m.proExpiresAt,
        warningDays: 7,
      });
      if (info.status === "active" || info.status === "expiring_soon") {
        proActive += 1;
      }
      if (info.status === "expiring_soon" || info.status === "expired") {
        expiringOrExpired += 1;
      }
      if (info.status === "expired") {
        overdueCount += 1;
      }
    });
    return {
      all: allDirectoryMembers.length,
      proActive,
      expiring: expiringOrExpired,
      overdue: overdueCount,
    };
  }, [allDirectoryMembers, supabaseProMap, learnerSubscriptions]);

  const filteredMembers = allDirectoryMembers
    .filter((m) => {
      if (subscriptionTab !== "all") {
        const subInfo = getMemberSubInfo(m);
        if (!subInfo) return false;
        if (
          subscriptionTab === "pro_active" &&
          subInfo.status !== "active" &&
          subInfo.status !== "expiring_soon"
        ) {
          return false;
        }
        if (
          subscriptionTab === "expiring" &&
          subInfo.status !== "expiring_soon" &&
          subInfo.status !== "expired"
        ) {
          return false;
        }
      }
      if (cohortFilter !== "All Cohorts" && m.cohort !== cohortFilter) {
        return false;
      }
      if (roleFilter !== "All Roles" && m.accessRole !== roleFilter) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.cohort.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (subscriptionTab !== "expiring") return 0;
      const da = getMemberSubInfo(a)?.daysRemaining ?? 9999;
      const db = getMemberSubInfo(b)?.daysRemaining ?? 9999;
      return da - db;
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [subscriptionTab, cohortFilter, roleFilter, searchQuery, pageSize]);

  const totalFilteredCount = filteredMembers.length;
  const effectivePageSize =
    pageSize > 0 ? pageSize : Math.max(1, totalFilteredCount);
  const totalPages = Math.max(
    1,
    Math.ceil(totalFilteredCount / effectivePageSize)
  );
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * effectivePageSize;
  const pageEndIndex = Math.min(
    totalFilteredCount,
    pageStartIndex + effectivePageSize
  );
  const paginatedMembers =
    pageSize > 0
      ? filteredMembers.slice(pageStartIndex, pageStartIndex + pageSize)
      : filteredMembers;

  const applyLocalSubscriptionUpdate = (
    member: { name: string; email: string; hasUsedTrial?: boolean },
    tier: "PRO" | "Free",
    startedAt: string | null,
    expiresAt: string | null,
    packageName: string | null,
    packageId?: string | null,
    billingCycle?: string | null,
    markTrialUsed?: boolean
  ) => {
    const emailLower = (member.email || "").toLowerCase().trim();
    const nameLower = (member.name || "").toLowerCase().trim();
    const nextUsedTrial = Boolean(
      markTrialUsed ||
        isTrialBillingCycle(billingCycle) ||
        member.hasUsedTrial
    );

    setLocalSubOverrides((prev) => ({
      ...prev,
      [emailLower]: {
        subscriptionTier: tier,
        proStartedAt: startedAt,
        proExpiresAt: expiresAt,
        proPackageName: packageName,
        ...(packageId !== undefined ? { proPackageId: packageId } : {}),
        ...(billingCycle !== undefined ? { proBillingCycle: billingCycle } : {}),
        hasUsedTrial: nextUsedTrial,
      },
    }));

    setSupabaseMembers((prev) =>
      prev.map((m) =>
        m.email.toLowerCase().trim() === emailLower
          ? {
              ...m,
              subscriptionTier: tier,
              proStartedAt: startedAt,
              proExpiresAt: expiresAt,
              proPackageName: packageName,
              ...(packageId !== undefined ? { proPackageId: packageId } : {}),
              ...(billingCycle !== undefined
                ? { proBillingCycle: billingCycle }
                : {}),
              hasUsedTrial: m.hasUsedTrial || nextUsedTrial,
            }
          : m
      )
    );

    setSupabaseProMap((prev) => ({
      ...prev,
      ...(emailLower ? { [emailLower]: tier } : {}),
      ...(member.name ? { [member.name]: tier } : {}),
      ...(nameLower ? { [nameLower]: tier } : {}),
    }));

    setStudentProTierLocal(member.name, member.email, tier);

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("ruang_sosmed_channel");
        bc.postMessage({
          type: "SUBSCRIPTION_UPDATED",
          email: emailLower,
          name: member.name,
          tier,
          startedAt,
          expiresAt,
          packageName,
          packageId: packageId ?? null,
          billingCycle: billingCycle ?? null,
        });
        bc.close();
      } catch {}
    }

    setInspectedMember((prev) =>
      prev && prev.email.toLowerCase().trim() === emailLower
        ? {
            ...prev,
            subscriptionTier: tier,
            proStartedAt: startedAt,
            proExpiresAt: expiresAt,
            proPackageName: packageName,
            ...(packageId !== undefined ? { proPackageId: packageId } : {}),
            ...(billingCycle !== undefined
              ? { proBillingCycle: billingCycle }
              : {}),
            hasUsedTrial: prev.hasUsedTrial || nextUsedTrial,
          }
        : prev
    );
  };

  const cleanupProofAndNotifyTelegram = async (params: {
    requestId: string;
    action: "approve" | "reject";
    proofUrl?: string | null;
    dueLabel?: string;
  }) => {
    if (params.proofUrl) {
      await deletePaymentProofFromStorage(supabase, params.proofUrl);
      await supabase
        .from("pro_upgrade_requests")
        .update({
          proof_url: null,
          proof_deleted_at: new Date().toISOString(),
        })
        .eq("id", params.requestId);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        await fetch("/api/telegram/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            eventType: "payment_resolved_web",
            requestId: params.requestId,
            action: params.action,
            proofUrl: params.proofUrl,
            dueLabel: params.dueLabel,
          }),
        });
      }
    } catch {}
  };

  const handleApprovePendingRequest = async (req: InsightsProRequestRecord) => {
    if (processingReqId) return;
    setProcessingReqId(req.id);
    try {
      const isItemUnlock = req.request_type === "item_unlock";
      const is3dTrialReq = req.billing_cycle === "3d_trial";
      const is7dTrialReq = req.billing_cycle === "7d_trial";
      const isTrialReq = is3dTrialReq || is7dTrialReq;
      const reqDurationDays =
        Number(req.duration_days) ||
        (is3dTrialReq ? 3 : is7dTrialReq ? 7 : 30);

      if (isItemUnlock && req.target_item_key) {
        const { error: grantErr } = await supabase.rpc(
          "admin_grant_unlocked_item",
          {
            p_target_email: req.user_email,
            p_item_key: req.target_item_key,
            p_course_title: req.target_item_title || req.package_name,
            p_chapter_id: null,
            p_request_id: req.id,
          }
        );
        if (grantErr) {
          const msg = String(grantErr.message || "").toLowerCase();
          if (
            grantErr.code === "PGRST202" ||
            msg.includes("admin_grant_unlocked_item")
          ) {
            await supabase
              .from("pro_upgrade_requests")
              .update({ status: "approved" })
              .eq("id", req.id);
            await cleanupProofAndNotifyTelegram({
              requestId: req.id,
              action: "approve",
              proofUrl: req.proof_url,
            });
            setPendingProRequests((prev) => prev.filter((r) => r.id !== req.id));
            setPreviewProofReq((prev) => (prev?.id === req.id ? null : prev));
            onShowToast(
              `⚠️ Jalankan SQL 017 agar unlock "${req.target_item_title || req.package_name}" untuk ${req.user_name} tercatat ke database.`
            );
            return;
          }
          onShowToast(`Gagal membuka akses materi: ${grantErr.message}`);
          return;
        }

        await cleanupProofAndNotifyTelegram({
          requestId: req.id,
          action: "approve",
          proofUrl: req.proof_url,
        });
        setPendingProRequests((prev) => prev.filter((r) => r.id !== req.id));
        setPreviewProofReq((prev) => (prev?.id === req.id ? null : prev));
        void loadSupabaseDirectory();
        onShowToast(
          req.proof_url
            ? `✅ Materi "${req.target_item_title || req.package_name}" dibuka untuk ${req.user_name} & bukti bayar otomatis dihapus dari server.`
            : `✅ Materi "${req.target_item_title || req.package_name}" resmi dibuka untuk ${req.user_name}.`
        );
        return;
      }

      const todayIso = getTodayIsoDate();
      const cycle = is3dTrialReq
        ? "3d_trial"
        : is7dTrialReq
        ? "7d_trial"
        : "30d";
      const dueIso = addDaysToIsoDate(todayIso, reqDurationDays);
      const dueLabel = formatIndoDate(dueIso);

      let { error } = await supabase.rpc("admin_set_learner_pro", {
        p_target_email: req.user_email,
        p_target_name: req.user_name,
        p_is_pro: true,
        p_package_name: req.package_name,
        p_request_id: req.id,
        p_started_at: todayIso,
        p_due_at: dueIso,
        p_duration_days: reqDurationDays,
        p_package_id: req.package_id || null,
        p_billing_cycle: cycle,
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (
          error.code === "PGRST202" ||
          msg.includes("p_package_id") ||
          msg.includes("p_billing_cycle") ||
          msg.includes("could not find the function")
        ) {
          const legacyRes = await supabase.rpc("admin_set_learner_pro", {
            p_target_email: req.user_email,
            p_target_name: req.user_name,
            p_is_pro: true,
            p_package_name: req.package_name,
            p_request_id: req.id,
          });
          error = legacyRes.error;
        }
      }

      if (error) {
        onShowToast(`Gagal mengaktifkan paket: ${error.message}`);
        return;
      }

      await cleanupProofAndNotifyTelegram({
        requestId: req.id,
        action: "approve",
        proofUrl: req.proof_url,
        dueLabel,
      });

      applyLocalSubscriptionUpdate(
        {
          name: req.user_name,
          email: req.user_email,
          hasUsedTrial: isTrialReq,
        },
        "PRO",
        todayIso,
        dueIso,
        req.package_name || "Pro",
        req.package_id || null,
        cycle,
        isTrialReq
      );
      setPendingProRequests((prev) => prev.filter((r) => r.id !== req.id));
      setPreviewProofReq((prev) => (prev?.id === req.id ? null : prev));
      void loadSupabaseDirectory();
      onShowToast(
        req.proof_url
          ? `✅ Pembayaran diverifikasi! ${req.user_name} aktif ${req.package_name} s/d ${dueLabel} & bukti bayar dihapus dari server.`
          : `✅ Pembayaran diverifikasi! ${req.user_name} resmi aktif ${req.package_name} s/d ${dueLabel}.`
      );
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectPendingRequest = async (req: InsightsProRequestRecord) => {
    if (processingReqId) return;
    setProcessingReqId(req.id);
    try {
      const isItemUnlock = req.request_type === "item_unlock";
      if (isItemUnlock) {
        const { error: rejErr } = await supabase
          .from("pro_upgrade_requests")
          .update({ status: "rejected" })
          .eq("id", req.id);
        if (rejErr) {
          onShowToast(`Gagal menolak permintaan: ${rejErr.message}`);
          return;
        }
      } else {
        const { error } = await supabase.rpc("admin_set_learner_pro", {
          p_target_email: req.user_email,
          p_target_name: req.user_name,
          p_is_pro: false,
          p_package_name: req.package_name,
          p_request_id: req.id,
        });
        if (error) {
          onShowToast(`Gagal menolak permintaan: ${error.message}`);
          return;
        }
      }

      await cleanupProofAndNotifyTelegram({
        requestId: req.id,
        action: "reject",
        proofUrl: req.proof_url,
      });

      setPendingProRequests((prev) => prev.filter((r) => r.id !== req.id));
      setPreviewProofReq((prev) => (prev?.id === req.id ? null : prev));
      onShowToast(
        req.proof_url
          ? `Permintaan ${req.user_name} ditolak & file bukti bayar otomatis dihapus dari server.`
          : `Permintaan ${req.package_name} untuk ${req.user_name} ditolak.`
      );
    } finally {
      setProcessingReqId(null);
    }
  };

  const openRenewModal = (member: DirectoryMember) => {
    const todayIso = getTodayIsoDate();
    const info = getMemberSubInfo(member);
    const hasActiveFutureDue =
      Boolean(info?.dueDateIso) &&
      (info?.status === "active" || info?.status === "expiring_soon") &&
      (info?.dueDateIso || "") >= todayIso;

    const initialStart =
      hasActiveFutureDue && info?.startedDateIso ? info.startedDateIso : todayIso;
    const initialDue = hasActiveFutureDue && info?.dueDateIso
      ? addDaysToIsoDate(info.dueDateIso, 30)
      : addDaysToIsoDate(todayIso, 30);

    const paidPkgs = getNormalizedProPackages(learnerProConfig).filter(
      (p) => p.tierKind !== "free"
    );
    const matchedPkg =
      paidPkgs.find(
        (p) =>
          (member.proPackageId && p.id === member.proPackageId) ||
          (member.proPackageName &&
            p.name.toLowerCase() === member.proPackageName.toLowerCase())
      ) ||
      paidPkgs.find((p) => p.highlighted || p.tierKind === "pro") ||
      paidPkgs[0];

    setRenewModalMember(member);
    setRenewStartDate(initialStart);
    setRenewDueDate(initialDue);
    setRenewPackageId(matchedPkg?.id || member.proPackageId || "pkg-pro");
    setRenewPackageName(member.proPackageName || matchedPkg?.name || "Pro");
    setRenewBillingCycle(
      member.proBillingCycle === "3d_trial"
        ? "3d_trial"
        : member.proBillingCycle === "7d_trial"
        ? "7d_trial"
        : "30d"
    );
  };

  const persistManualProDates = async (params: {
    member: DirectoryMember;
    startDateIso: string;
    dueDateIso: string;
    packageName: string;
    packageId?: string | null;
    billingCycle?: "3d_trial" | "7d_trial" | "30d";
  }) => {
    const cleanEmail = (params.member.email || "").trim().toLowerCase();
    const cleanName = (params.member.name || cleanEmail).trim();
    const pkg = params.packageName.trim() || "Pro";
    const pkgId = params.packageId || params.member.proPackageId || null;
    const durationDiff = diffCalendarDays(params.startDateIso, params.dueDateIso);
    const cycle: "3d_trial" | "7d_trial" | "30d" =
      params.billingCycle ||
      (durationDiff <= 4
        ? "3d_trial"
        : durationDiff <= 8
        ? "7d_trial"
        : "30d");

    if (!isSupabaseConfigured || !cleanEmail) {
      applyLocalSubscriptionUpdate(
        params.member,
        "PRO",
        params.startDateIso,
        params.dueDateIso,
        pkg,
        pkgId,
        cycle,
        isTrialBillingCycle(cycle)
      );
      return { ok: true, usedFallback: false };
    }

    let { data, error } = await supabase.rpc("admin_extend_learner_pro", {
      p_target_email: cleanEmail,
      p_target_name: cleanName,
      p_started_at: params.startDateIso,
      p_due_at: params.dueDateIso,
      p_package_name: pkg,
      p_package_id: pkgId,
      p_billing_cycle: cycle,
    });

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (
        error.code === "PGRST202" ||
        msg.includes("p_package_id") ||
        msg.includes("p_billing_cycle")
      ) {
        const legacyRes = await supabase.rpc("admin_extend_learner_pro", {
          p_target_email: cleanEmail,
          p_target_name: cleanName,
          p_started_at: params.startDateIso,
          p_due_at: params.dueDateIso,
          p_package_name: pkg,
        });
        data = legacyRes.data;
        error = legacyRes.error;
      }
    }

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      const missingRpc =
        error.code === "PGRST202" || msg.includes("admin_extend_learner_pro");
      if (missingRpc) {
        const { error: legacyErr } = await supabase.rpc(
          "admin_set_learner_pro",
          {
            p_target_email: cleanEmail,
            p_target_name: cleanName,
            p_is_pro: true,
            p_package_name: pkg,
          }
        );
        if (legacyErr) {
          throw new Error(legacyErr.message);
        }
        applyLocalSubscriptionUpdate(
          params.member,
          "PRO",
          params.startDateIso,
          params.dueDateIso,
          pkg,
          pkgId,
          cycle,
          isTrialBillingCycle(cycle)
        );
        return { ok: true, usedFallback: true };
      }
      throw new Error(error.message);
    }

    const returnedStart = (data as any)?.pro_started_at || params.startDateIso;
    const returnedDue = (data as any)?.pro_expires_at || params.dueDateIso;
    applyLocalSubscriptionUpdate(
      params.member,
      "PRO",
      returnedStart,
      returnedDue,
      pkg,
      pkgId,
      cycle,
      isTrialBillingCycle(cycle)
    );
    return { ok: true, usedFallback: false };
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewModalMember) return;
    if (renewDueDate < renewStartDate) {
      onShowToast(
        "Tanggal jatuh tempo tidak boleh lebih awal dari tanggal mulai berlangganan."
      );
      return;
    }

    setIsSavingRenewal(true);
    try {
      const target = renewModalMember;
      const result = await persistManualProDates({
        member: target,
        startDateIso: renewStartDate,
        dueDateIso: renewDueDate,
        packageName: renewPackageName,
        packageId: renewPackageId,
        billingCycle: renewBillingCycle,
      });

      setRenewModalMember(null);
      if (result.usedFallback) {
        onShowToast(
          `✅ Paket ${renewPackageName} untuk ${target.name} diaktifkan di tampilan (jalankan migrasi 017 SQL agar tersimpan permanen).`
        );
      } else {
        onShowToast(
          `⚡ Paket ${renewPackageName} untuk ${target.name} aktif s/d ${formatIndoDate(renewDueDate)}.`
        );
      }
    } catch (err: any) {
      onShowToast(
        `Gagal menyimpan langganan: ${err?.message || "Pastikan Anda login sebagai Admin."}`
      );
    } finally {
      setIsSavingRenewal(false);
    }
  };

  const handleQuickExtend30Days = async (member: DirectoryMember) => {
    const emailKey = (member.email || "").toLowerCase().trim();
    if (!emailKey) return;
    setQuickExtendingEmail(emailKey);
    try {
      const todayIso = getTodayIsoDate();
      const info = getMemberSubInfo(member);
      const isActiveFuture =
        Boolean(info?.dueDateIso) &&
        (info?.status === "active" || info?.status === "expiring_soon") &&
        (info?.dueDateIso || "") >= todayIso;
      const startIso =
        isActiveFuture && info?.startedDateIso ? info.startedDateIso : todayIso;
      const nextDueIso = addDaysToIsoDate(
        isActiveFuture && info?.dueDateIso ? info.dueDateIso : todayIso,
        30
      );

      const res = await persistManualProDates({
        member,
        startDateIso: startIso,
        dueDateIso: nextDueIso,
        packageName: member.proPackageName || "Pro",
        packageId: member.proPackageId || null,
        billingCycle: "30d",
      });

      if (res.usedFallback) {
        onShowToast(
          `✅ ${member.name} diperpanjang +30 hari (jalankan migrasi 017 SQL untuk simpan permanen).`
        );
      } else {
        onShowToast(
          `🔄 ${member.name} diperpanjang +30 hari (Jatuh tempo baru: ${formatIndoDate(nextDueIso)}).`
        );
      }
    } catch (err: any) {
      onShowToast(`Gagal perpanjangan cepat: ${err?.message || "Akses ditolak"}`);
    } finally {
      setQuickExtendingEmail(null);
    }
  };

  const handleRevokeToFree = async (member: DirectoryMember) => {
    setIsSavingRenewal(true);
    try {
      const cleanEmail = (member.email || "").trim().toLowerCase();
      if (isSupabaseConfigured && cleanEmail) {
        const { error } = await supabase.rpc("admin_set_learner_pro", {
          p_target_email: cleanEmail,
          p_target_name: member.name,
          p_is_pro: false,
          p_package_name: member.proPackageName || "Free",
        });
        if (error) {
          throw new Error(error.message);
        }
      }

      applyLocalSubscriptionUpdate(
        member,
        "Free",
        member.proStartedAt ?? null,
        null,
        null,
        null,
        null,
        member.hasUsedTrial
      );
      setRenewModalMember(null);
      onShowToast(`Status langganan ${member.name} dikembalikan ke Free Plan.`);
    } catch (err: any) {
      onShowToast(`Gagal mengubah ke Free: ${err?.message || "Akses ditolak"}`);
    } finally {
      setIsSavingRenewal(false);
    }
  };

  const handleRoleChange = async (
    member: DirectoryMember,
    nextRole: "Learner" | "Mentor" | "Admin"
  ) => {
    const key = (member.email || member.name || member.id).toLowerCase().trim();
    const emailKey = (member.email || "").toLowerCase().trim();
    const idKey = member.id;
    const nameKey = (member.name || "").toLowerCase().trim();

    // 1. Update local state optimistically before persisting via Supabase RPC
    setOptimisticRoles((prev) => ({
      ...prev,
      [key]: nextRole,
      [emailKey]: nextRole,
      [idKey]: nextRole,
      [nameKey]: nextRole,
    }));

    // 2. Notify parent app if current active user is changed
    const isTargetCurrentUser = Boolean(
      currentUser &&
        ((currentUser.email && emailKey && currentUser.email.toLowerCase().trim() === emailKey) ||
          (currentUser.name && nameKey && currentUser.name.toLowerCase().trim() === nameKey))
    );

    if (isTargetCurrentUser && onUpdateCurrentUserRole) {
      onUpdateCurrentUserRole(nextRole);
    }

    // 3. Persist strictly to Supabase via hardened admin_update_user_role RPC
    try {
      await updateMemberAccessRole(member.email || member.name || member.id, nextRole);
      onShowToast(
        `Peran akses ${member.name} diperbarui ke "${nextRole}" di Ruang Sosmed 2.0.`
      );
    } catch {
      onShowToast(`Gagal memperbarui peran ${member.name}. Pastikan Anda login sebagai Admin.`);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = inviteName.trim();
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedName || !trimmedEmail) return;

    const initials = trimmedName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newMember: DirectoryMember = {
      id: `invited-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      initials: initials || "RS",
      avatarBg: "#EEF2FF",
      avatarText: "#4F39F6",
      jobTitle: "Social Media Specialist",
      cohort: inviteCohort,
      accessRole: inviteRole,
      assignedCount: selectedMaterialIds.length,
      completedChapters: 0,
      totalChapters: totalCourseChapters,
      avgQuizScore: 0,
      points: 0,
      credentialId: `RS2-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    if (inviteRole === "Learner") {
      registerLearnerProfile({
        name: trimmedName,
        email: trimmedEmail,
        jobTitle: "Social Media Specialist",
      });
    }

    // Assign selected materials to this student
    if (selectedMaterialIds.length > 0) {
      selectedMaterialIds.forEach((matId) => {
        const mat = availableMaterials.find((m: ExplorerContentItem) => m.id === matId);
        if (mat) {
          assignContentToLearners(
            mat,
            [trimmedName, trimmedEmail],
            "2026-11-30",
            "Individual"
          );
        }
      });
    }

    // Persist assigned material IDs for this user
    try {
      if (typeof window !== "undefined") {
        const keyEmail = trimmedEmail.toLowerCase().trim();
        const keyName = trimmedName.toLowerCase().trim();
        const assignedJson = JSON.stringify(selectedMaterialIds);
        window.localStorage.setItem(`ruang_sosmed_user_assignments_${keyEmail}`, assignedJson);
        window.localStorage.setItem(`ruang_sosmed_user_assignments_${keyName}`, assignedJson);
        window.localStorage.setItem(`ruang_sosmed_user_cohort_${keyEmail}`, inviteCohort);
        window.localStorage.setItem(`ruang_sosmed_user_cohort_${keyName}`, inviteCohort);
      }
    } catch {}

    setInvitedMembers((prev) => [newMember, ...prev]);
    setInviteName("");
    setInviteEmail("");
    setInviteModalOpen(false);
    onShowToast(
      `Invited ${trimmedName} (${trimmedEmail}) to ${inviteCohort} dengan ${selectedMaterialIds.length} materi yang di-assign.`
    );
  };

  const handleCsvBatchImport = () => {
    const batchStudents: DirectoryMember[] = [
      {
        id: `csv-1-${Date.now()}`,
        name: "Alya Zahra",
        email: "alya.zahra@creatorlab.id",
        initials: "AZ",
        avatarBg: "#FDF2F8",
        avatarText: "#DB2777",
        jobTitle: "TikTok Growth Strategist",
        cohort: cohortProjects[0]?.name || "Ruang Sosmed Class",
        accessRole: "Learner",
        assignedCount: learnerAssignedItems.length,
        completedChapters: 0,
        totalChapters: totalCourseChapters,
        avgQuizScore: 0,
        points: 0,
        credentialId: "RS2-2026-9104",
      },
      {
        id: `csv-2-${Date.now()}`,
        name: "Reza Mahendra",
        email: "reza.mahendra@agency.id",
        initials: "RM",
        avatarBg: "#ECFDF5",
        avatarText: "#059669",
        jobTitle: "Paid Social Buyer",
        cohort: cohortProjects[1]?.name || cohortProjects[0]?.name || "Ruang Sosmed Class",
        accessRole: "Learner",
        assignedCount: learnerAssignedItems.length,
        completedChapters: 0,
        totalChapters: totalCourseChapters,
        avgQuizScore: 0,
        points: 0,
        credentialId: "RS2-2026-9105",
      },
    ];
    batchStudents.forEach((s) =>
      registerLearnerProfile({
        name: s.name,
        email: s.email,
        jobTitle: s.jobTitle,
      })
    );
    setInvitedMembers((prev) => [...batchStudents, ...prev]);
    setInviteModalOpen(false);
    onShowToast(
      "Imported 2 cohort learners from CSV into Ruang Sosmed 2.0 Directory."
    );
  };

  return (
    <div className="w-full px-4 sm:px-5 pt-5 pb-14 space-y-6">
      {/* Header Row */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6] mb-1.5">
            <Users size={12} />
            <span>Cohort &amp; Access Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121215]">
            Learners &amp; Cohort Directory
          </h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">
            Manage student cohorts, invite learners via email/CSV, inspect
            individual portfolios, and configure access roles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setInsightsModalOpen(true)}
            title="Buka Insight Grafik User, Langganan & Pemasukan Paket PRO"
            aria-label="Buka Insight Grafik User, Langganan & Pemasukan"
            className="relative inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] px-2.5 text-xs font-bold text-[#4F39F6] border border-[#C7D2FE] transition-colors cursor-pointer"
          >
            <BarChart3 size={14} className="shrink-0" />
            <span className="hidden sm:inline">Insight</span>
            {tabCounts.expiring > 0 && (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-[#F59E0B] ring-2 ring-white"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => void loadSupabaseDirectory(true)}
            disabled={isRefreshingDir}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer disabled:opacity-60"
            title="Muat ulang daftar akun & verifikasi PRO terbaru"
          >
            <RefreshCw
              size={14}
              className={`text-[#4F39F6] ${isRefreshingDir ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-[#4F39F6]" />
            <span>Import CSV Roster</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInviteModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.25)] transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            <span>+ Invite Student</span>
          </button>
        </div>
      </header>

      {/* Cohort Summary Strip (Compact Filter Bar) */}
      <section
        aria-label="Cohort Batches Overview"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-semibold text-[#5E5E5E] mr-1">
          Cohort:
        </span>
        {[
          {
            name: "All Cohorts",
            count: allDirectoryMembers.length,
            accent: "#4F39F6",
          },
          ...(cohortProjects || []).map((cp) => ({
            name: cp.name,
            count: allDirectoryMembers.filter(
              (m) => m.cohort?.toLowerCase() === cp.name.toLowerCase()
            ).length,
            accent: cp.color,
          })),
        ].map((batch) => {
          const isSelected = cohortFilter === batch.name;
          return (
            <button
              key={batch.name}
              type="button"
              onClick={() => setCohortFilter(batch.name)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#FFFFFF] border-[#4F39F6] text-[#4F39F6] shadow-2xs ring-1 ring-[#4F39F6]/30 font-bold"
                  : "bg-[#FFFFFF] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215] hover:border-[#D1D5DB]"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: batch.accent }}
              />
              <span>{batch.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected
                    ? "bg-[#EEF2FF] text-[#4F39F6]"
                    : "bg-[#F8F9FB] text-[#71717A] border border-[#EAECEF]"
                }`}
              >
                {batch.count}
              </span>
            </button>
          );
        })}
      </section>

      {/* Pending PRO Payment Verification Queue (Admin Approval) */}
      {pendingProRequests.length > 0 && (
        <section
          aria-label="Verifikasi Pembayaran Learner PRO"
          className="rounded-xl bg-[#FFFBEB] p-4 border border-[#F59E0B]/40 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
                <Zap size={13} className="text-[#F59E0B]" />
                <span>Verifikasi Pembayaran Learner PRO ({pendingProRequests.length})</span>
              </h2>
              <p className="text-[11px] text-[#78350F] mt-0.5">
                Periksa bukti pembayaran sebelum mengaktifkan akses PRO agar tidak ada aktivasi tanpa pembayaran.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {pendingProRequests.map((req) => {
              const isItemUnlock = req.request_type === "item_unlock";
              const is3dTrialReq = req.billing_cycle === "3d_trial";
              const is7dTrialReq = req.billing_cycle === "7d_trial";
              const isTrialReq = is3dTrialReq || is7dTrialReq;
              const reqDurationDays =
                Number(req.duration_days) ||
                (is3dTrialReq ? 3 : is7dTrialReq ? 7 : 30);

              return (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FFFFFF] px-3.5 py-2.5 border border-[#FDE68A]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-bold text-[#121215]">
                        {req.user_name}{" "}
                        <span className="font-normal text-[#5E5E5E]">
                          ({req.user_email})
                        </span>
                      </p>
                      {isItemUnlock ? (
                        <span className="inline-flex items-center rounded bg-[#EEF2FF] border border-[#C7D2FE] px-1.5 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                          Buka Materi Satuan
                        </span>
                      ) : is3dTrialReq ? (
                        <span className="inline-flex items-center rounded bg-[#FEF3C7] border border-[#F59E0B]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#92400E]">
                          Trial 3 Hari (1×)
                        </span>
                      ) : is7dTrialReq ? (
                        <span className="inline-flex items-center rounded bg-[#FEF3C7] border border-[#F59E0B]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#92400E]">
                          Trial 7 Hari (1×)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 text-[10px] font-bold text-[#059669]">
                          Paket {reqDurationDays} Hari
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5E5E5E]">
                      {isItemUnlock ? (
                        <>
                          Materi:{" "}
                          <strong className="text-[#121215]">
                            {req.target_item_title || req.package_name}
                          </strong>
                        </>
                      ) : (
                        <>
                          Paket:{" "}
                          <strong className="text-[#121215]">
                            {req.package_name}
                          </strong>
                        </>
                      )}{" "}
                      ({req.price_label}) • Metode: {req.payment_method}
                      {req.buyer_contact ? ` • WA: ${req.buyer_contact}` : ""}
                    </p>
                    {req.proof_url && req.proof_url.trim() && (
                      <button
                        type="button"
                        onClick={() => setPreviewProofReq(req)}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] px-2.5 py-1 text-[11px] font-bold text-[#4F39F6] transition-colors cursor-pointer"
                      >
                        <ImageIcon size={12} />
                        <span>Lihat Bukti Pembayaran</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={processingReqId === req.id}
                      onClick={() => void handleApprovePendingRequest(req)}
                      className="rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                    >
                      {processingReqId === req.id
                        ? "Memproses..."
                        : isItemUnlock
                        ? "Setujui & Buka Materi"
                        : is3dTrialReq
                        ? "Aktifkan Trial 3 Hari"
                        : is7dTrialReq
                        ? "Aktifkan Trial 7 Hari"
                        : "Setujui & Aktifkan"}
                    </button>
                    <button
                      type="button"
                      disabled={processingReqId === req.id}
                      onClick={() => void handleRejectPendingRequest(req)}
                      className="rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-[#DC2626] border border-[#FECACA] cursor-pointer"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Subscription Lifecycle Tabs + Filter & Search Toolbar + Responsive Learners Directory Table */}
      <section className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
        {(() => {
          const tabsConfig = [
            {
              key: "all" as const,
              id: "dir-sub-tab-all",
              label: "Semua Member",
              count: tabCounts.all,
              accent: "#4F39F6",
              badgeBg: "bg-[#EEF2FF] text-[#4F39F6]",
            },
            {
              key: "pro_active" as const,
              id: "dir-sub-tab-pro",
              label: "PRO Aktif",
              count: tabCounts.proActive,
              accent: "#10B981",
              badgeBg: "bg-[#ECFDF5] text-[#059669]",
            },
            {
              key: "expiring" as const,
              id: "dir-sub-tab-expiring",
              label: "Mau Habis / Jatuh Tempo",
              count: tabCounts.expiring,
              accent: tabCounts.overdue > 0 ? "#EF4444" : "#F59E0B",
              badgeBg:
                tabCounts.overdue > 0
                  ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                  : tabCounts.expiring > 0
                  ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                  : "bg-[#F8F9FB] text-[#64748B]",
            },
          ];
          const activeTabObj =
            tabsConfig.find((t) => t.key === subscriptionTab) || tabsConfig[0];

          const handleTabKeyDown = (
            e: React.KeyboardEvent<HTMLButtonElement>,
            idx: number
          ) => {
            let nextIdx: number | null = null;
            if (e.key === "ArrowRight") {
              nextIdx = (idx + 1) % tabsConfig.length;
            } else if (e.key === "ArrowLeft") {
              nextIdx = (idx - 1 + tabsConfig.length) % tabsConfig.length;
            } else if (e.key === "Home") {
              nextIdx = 0;
            } else if (e.key === "End") {
              nextIdx = tabsConfig.length - 1;
            }
            if (nextIdx !== null) {
              e.preventDefault();
              const nextTab = tabsConfig[nextIdx];
              setSubscriptionTab(nextTab.key);
              const targetEl = tabRefs.current[nextIdx];
              targetEl?.focus();
              targetEl?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }
          };

          return (
            <>
              <div className="border-b border-[#EAECEF] -mx-1 px-1">
                <div
                  role="tablist"
                  aria-label="Filter status langganan member"
                  className="directory-tablist"
                >
                  {tabsConfig.map((tab, idx) => {
                    const isSelected = subscriptionTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        ref={(el) => {
                          tabRefs.current[idx] = el;
                        }}
                        id={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={(e) => {
                          setSubscriptionTab(tab.key);
                          e.currentTarget.scrollIntoView({
                            block: "nearest",
                            inline: "nearest",
                          });
                        }}
                        onKeyDown={(e) => handleTabKeyDown(e, idx)}
                        style={
                          {
                            "--tab-accent": tab.accent,
                          } as React.CSSProperties
                        }
                        className={`directory-tab inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? "text-[#121215]"
                            : "text-[#5E5E5E] hover:text-[#121215]"
                        }`}
                      >
                        {tab.key === "expiring" && (
                          <AlertTriangle
                            size={13}
                            className={
                              tab.count > 0 ? "text-[#F59E0B]" : "text-[#9CA3AF]"
                            }
                          />
                        )}
                        {tab.key === "pro_active" && (
                          <Zap
                            size={13}
                            className={
                              isSelected ? "text-[#10B981]" : "text-[#9CA3AF]"
                            }
                          />
                        )}
                        {tab.key === "all" && (
                          <Users
                            size={13}
                            className={
                              isSelected ? "text-[#4F39F6]" : "text-[#9CA3AF]"
                            }
                          />
                        )}
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tab.badgeBg}`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                role="tabpanel"
                aria-labelledby={activeTabObj.id}
                className="space-y-4"
              >
                {subscriptionTab === "expiring" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFFBEB] px-4 py-3 border border-[#F59E0B]/30">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Clock
                        size={15}
                        className="text-[#B45309] shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#92400E]">
                          Monitoring Member Mau Habis (≤ 7 Hari) &amp; Jatuh Tempo
                        </p>
                        <p className="text-[11px] text-[#78350F] mt-0.5">
                          Diurutkan dari yang paling mendesak atau sudah lewat jatuh tempo. Gunakan tombol{" "}
                          <strong>+30 Hr</strong> atau <strong>Perpanjang</strong> untuk mengaktifkan kembali masa PRO secara manual.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student name, email, or cohort..."
                      aria-label="Search learners directory"
                      className="w-full rounded-lg bg-[#F8F9FB] pl-8 pr-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-[#5E5E5E]">
                      Access Role:
                    </span>
                    {(["All Roles", "Learner", "Mentor", "Admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          roleFilter === r
                            ? "bg-[#4F39F6] text-white"
                            : "bg-[#F8F9FB] text-[#5E5E5E] hover:text-[#121215] border border-[#EAECEF]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Responsive Table per modern-web-guidance */}
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Ruang Sosmed 2.0 Learners Directory"
                  className="table-wrapper"
                >
                  <table
                    style={
                      {
                        "--label-2": '"Cohort Batch"',
                        "--label-3": '"Langganan & Jatuh Tempo"',
                        "--label-4": '"Assigned Progress"',
                        "--label-5": '"Points & Quiz Avg"',
                        "--label-6": '"Access Role"',
                        "--label-7": '"Portfolio & Actions"',
                      } as React.CSSProperties
                    }
                  >
                    <thead>
                      <tr className="border-b border-[#EAECEF] bg-[#F8F9FB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        <th className="py-3 px-4 rounded-tl-lg">Student / Member</th>
                        <th className="py-3 px-4">Cohort Batch</th>
                        <th className="py-3 px-4">Langganan &amp; Jatuh Tempo</th>
                        <th className="py-3 px-4">Assigned Progress</th>
                        <th className="py-3 px-4">Points &amp; Quiz Avg</th>
                        <th className="py-3 px-4">Access Role</th>
                        <th className="py-3 px-4 text-right rounded-tr-lg">
                          Portfolio &amp; Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAECEF] text-xs">
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 px-4 text-center text-xs text-[#5E5E5E]"
                          >
                            <div className="space-y-2">
                              <p className="font-bold text-[#121215]">
                                {subscriptionTab === "expiring"
                                  ? "Tidak ada member PRO yang mendekati habis atau jatuh tempo saat ini."
                                  : subscriptionTab === "pro_active"
                                  ? "Belum ada member PRO aktif sesuai filter saat ini."
                                  : "No learners match your current search or cohort filter."}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSubscriptionTab("all");
                                  setCohortFilter("All Cohorts");
                                  setRoleFilter("All Roles");
                                  setSearchQuery("");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-3 py-1.5 text-xs font-semibold text-[#4F39F6] border border-[#EAECEF] cursor-pointer"
                              >
                                Reset Directory Filters
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedMembers.map((member) => {
                          const pct =
                            member.totalChapters > 0
                              ? Math.round(
                                  (member.completedChapters / member.totalChapters) * 100
                                )
                              : 0;
                          const subInfo = getMemberSubInfo(member);
                          const emailKey = (member.email || "").toLowerCase().trim();
                          const isQuickBusy = quickExtendingEmail === emailKey;

                          return (
                            <tr
                              key={member.id}
                              onClick={() => {
                                setInspectedMember(member);
                                setProfileTab("activity");
                                setResetPasswordInput("");
                                setShowResetPassword(false);
                              }}
                              title={`Klik baris untuk membuka profil, progress belajar, sisa koin & reset password ${member.name}`}
                              className="group transition-colors cursor-pointer"
                            >
                              <th
                                scope="row"
                                className="py-3.5 px-4 font-semibold text-[#121215] text-left transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const memberAvatar =
                                      resolveUserAvatar(member.email, member.name, member.id) ||
                                      member.avatarUrl;
                                    if (memberAvatar) {
                                      return (
                                        <img
                                          src={memberAvatar}
                                          alt={member.name}
                                          className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#E2E8F0]"
                                        />
                                      );
                                    }
                                    return (
                                      <span
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                        style={{
                                          backgroundColor: member.avatarBg,
                                          color: member.avatarText,
                                        }}
                                      >
                                        {member.initials}
                                      </span>
                                    );
                                  })()}
                                  <div>
                                    <p className="font-bold text-[#121215] group-hover:text-[#4F39F6] transition-colors">
                                      {member.name}
                                    </p>
                                    <p className="text-[11px] font-normal text-[#5E5E5E]">
                                      {member.email} • {member.jobTitle}
                                    </p>
                                  </div>
                                </div>
                              </th>

                              <td className="py-3.5 px-4 transition-colors">
                                <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#121215] whitespace-nowrap">
                                  {member.cohort}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 transition-colors">
                                {member.accessRole !== "Learner" ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] border border-[#4F39F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                                      <ShieldCheck size={10} />
                                      <span>Akses Staf</span>
                                    </span>
                                    <p className="text-[10px] text-[#64748B]">
                                      Tanpa jatuh tempo
                                    </p>
                                  </div>
                                ) : subInfo ? (
                                  <div className="space-y-1 min-w-[165px]">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                        subInfo.status === "expired"
                                          ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                                          : subInfo.status === "expiring_soon"
                                          ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                                          : subInfo.status === "active"
                                          ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                                          : "bg-[#F8F9FB] text-[#64748B] border-[#EAECEF]"
                                      }`}
                                    >
                                      {subInfo.status === "expired" ? (
                                        <AlertTriangle size={10} />
                                      ) : subInfo.status === "expiring_soon" ? (
                                        <Clock size={10} />
                                      ) : subInfo.status === "active" ? (
                                        <Zap size={10} fill="currentColor" />
                                      ) : null}
                                      <span>
                                        {subInfo.status !== "free" &&
                                        member.proPackageName
                                          ? `${member.proPackageName} • ${subInfo.badgeLabel}`
                                          : subInfo.badgeLabel}
                                      </span>
                                    </span>
                                    {member.hasUsedTrial && (
                                      <span className="ml-1 inline-flex items-center rounded bg-[#F8F9FB] border border-[#EAECEF] px-1.5 py-0.5 text-[9px] font-semibold text-[#64748B]">
                                        {member.proBillingCycle === "3d_trial" &&
                                        subInfo.status !== "free"
                                          ? "Sedang Trial 3H"
                                          : member.proBillingCycle === "7d_trial" &&
                                            subInfo.status !== "free"
                                          ? "Sedang Trial 7H"
                                          : "Trial 1× terpakai"}
                                      </span>
                                    )}
                                    {subInfo.status !== "free" ? (
                                      <div className="text-[10px] leading-tight space-y-0.5 text-[#5E5E5E] tabular-nums">
                                        <p>
                                          Mulai:{" "}
                                          <strong className="font-semibold text-[#121215]">
                                            {subInfo.startedLabel}
                                          </strong>
                                        </p>
                                        <p>
                                          Tempo:{" "}
                                          <strong
                                            className={`font-semibold ${
                                              subInfo.status === "expired"
                                                ? "text-[#DC2626]"
                                                : subInfo.status === "expiring_soon"
                                                ? "text-[#B45309]"
                                                : "text-[#121215]"
                                            }`}
                                          >
                                            {subInfo.dueLabel}
                                          </strong>
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-[#9CA3AF]">
                                        Belum berlangganan PRO
                                      </p>
                                    )}
                                  </div>
                                ) : null}
                              </td>

                              <td className="py-3.5 px-4 transition-colors">
                                <div className="flex items-center gap-2 min-w-[130px]">
                                  <div className="flex-1 h-2 rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-[#4F39F6]"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="font-semibold text-[#121215] tabular-nums whitespace-nowrap">
                                    {member.completedChapters}/{member.totalChapters} ({pct}
                                    %)
                                  </span>
                                </div>
                              </td>

                              <td
                                className="py-3.5 px-4 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdjustPointsTarget(member);
                                      setAdjustPointsMode("add");
                                      setAdjustPointsValue(100);
                                      setAdjustPointsReason("Bonus Keaktifan");
                                    }}
                                    title={`Klik untuk ubah / tambah koin manual untuk ${member.name}`}
                                    className="group/pts inline-flex items-center gap-1 font-bold text-[#B45309] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] border border-[#F59E0B]/30 hover:border-[#F59E0B]/60 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs"
                                  >
                                    <Star
                                      size={12}
                                      className="text-[#F59E0B]"
                                      fill="#F59E0B"
                                    />
                                    <span className="tabular-nums">{member.points.toLocaleString()}</span>
                                    <Edit3
                                      size={10}
                                      className="text-[#B45309] opacity-40 group-hover/pts:opacity-100 transition-opacity ml-0.5"
                                    />
                                  </button>
                                  <span className="text-[#9CA3AF]">•</span>
                                  <span className="font-semibold text-[#059669]">
                                    {member.avgQuizScore}% avg
                                  </span>
                                </div>
                              </td>

                              <td
                                className="py-3.5 px-4 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center gap-1.5">
                                  <Shield size={12} className="text-[#4F39F6]" />
                                  <select
                                    aria-label={`Access role for ${member.name}`}
                                    value={member.accessRole}
                                    onChange={(e) =>
                                      handleRoleChange(
                                        member,
                                        e.target.value as "Learner" | "Mentor" | "Admin"
                                      )
                                    }
                                    className="rounded-md bg-[#F8F9FB] px-2 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
                                  >
                                    <option value="Learner">Learner</option>
                                    <option value="Mentor">Mentor</option>
                                    <option value="Admin">Admin</option>
                                  </select>
                                </div>
                              </td>

                              <td
                                className="py-3.5 px-4 text-right transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  {member.accessRole === "Learner" && subInfo && (
                                    <>
                                      {(subInfo.status === "expiring_soon" ||
                                        subInfo.status === "expired") && (
                                        <button
                                          type="button"
                                          disabled={isQuickBusy}
                                          onClick={() => void handleQuickExtend30Days(member)}
                                          title={`Perpanjang langsung +30 hari untuk ${member.name}`}
                                          className="inline-flex items-center gap-1 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                                        >
                                          <RotateCw
                                            size={11}
                                            className={isQuickBusy ? "animate-spin" : ""}
                                          />
                                          <span>+30 Hr</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openRenewModal(member)}
                                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                                          subInfo.status === "expired"
                                            ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]"
                                            : subInfo.status === "expiring_soon"
                                            ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/40 hover:bg-[#FDE68A]"
                                            : subInfo.status === "active"
                                            ? "bg-[#FEF3C7]/70 text-[#B45309] border-[#F59E0B]/40 hover:bg-[#FEF3C7]"
                                            : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:border-[#F59E0B] hover:text-[#B45309]"
                                        }`}
                                      >
                                        <Calendar size={11} />
                                        <span>
                                          {subInfo.status === "expiring_soon" ||
                                          subInfo.status === "expired"
                                            ? "Perpanjang"
                                            : subInfo.status === "active"
                                            ? "Atur PRO"
                                            : "Aktifkan PRO"}
                                        </span>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectedMember(member);
                                      setProfileTab("activity");
                                      setResetPasswordInput("");
                                      setShowResetPassword(false);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-2.5 py-1.5 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    <span>Lihat Profil</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                {totalFilteredCount > 0 && (
                  <nav
                    aria-label="Navigasi halaman direktori member"
                    className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EAECEF] text-xs text-[#5E5E5E]"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="tabular-nums">
                        Menampilkan{" "}
                        <strong className="text-[#121215]">
                          {pageStartIndex + 1}–{pageEndIndex}
                        </strong>{" "}
                        dari{" "}
                        <strong className="text-[#121215]">
                          {totalFilteredCount}
                        </strong>{" "}
                        member
                      </span>

                      <select
                        aria-label="Jumlah baris per halaman"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="rounded-lg bg-[#F8F9FB] px-2.5 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
                      >
                        <option value={10}>10 / halaman</option>
                        <option value={25}>25 / halaman</option>
                        <option value={50}>50 / halaman</option>
                        <option value={100}>100 / halaman</option>
                        <option value={0}>Semua ({totalFilteredCount})</option>
                      </select>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safeCurrentPage <= 1}
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] disabled:opacity-45 px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={13} />
                          <span>Sebelumnya</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === totalPages ||
                              Math.abs(p - safeCurrentPage) <= 1
                          )
                          .reduce<Array<number | "ellipsis">>(
                            (acc, p, idx, arr) => {
                              if (idx > 0 && p - arr[idx - 1] > 1) {
                                acc.push("ellipsis");
                              }
                              acc.push(p);
                              return acc;
                            },
                            []
                          )
                          .map((item, idx) =>
                            item === "ellipsis" ? (
                              <span
                                key={`ellipsis-${idx}`}
                                className="px-1.5 text-[#9CA3AF]"
                              >
                                …
                              </span>
                            ) : (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setCurrentPage(item)}
                                aria-current={
                                  item === safeCurrentPage ? "page" : undefined
                                }
                                className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-bold border transition-colors cursor-pointer tabular-nums ${
                                  item === safeCurrentPage
                                    ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                                    : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:bg-[#F8F9FB] hover:text-[#121215]"
                                }`}
                              >
                                {item}
                              </button>
                            )
                          )}

                        <button
                          type="button"
                          disabled={safeCurrentPage >= totalPages}
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] disabled:opacity-45 px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span>Berikutnya</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </nav>
                )}
              </div>
            </>
          );
        })()}
      </section>

      {/* Modal 1: Invite Student via Email / CSV Upload */}
      <ModalDialog
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        titleId="invite-learner-modal-title"
        title="Invite Students to Ruang Sosmed 2.0"
        subtitle="Add an individual student by email or batch-import a cohort CSV roster."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-student-name"
              className="block text-xs font-semibold text-[#121215] mb-1"
            >
              Student Full Name
            </label>
            <input
              id="invite-student-name"
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g., Putri Maharani"
              className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="invite-student-email"
              className="block text-xs font-semibold text-[#121215] mb-1"
            >
              Email Address
            </label>
            <input
              id="invite-student-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="putri.maharani@brand.id"
              className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="invite-student-cohort"
                className="block text-xs font-semibold text-[#121215] mb-1"
              >
                Assign Cohort Batch
              </label>
              <select
                id="invite-student-cohort"
                value={inviteCohort}
                onChange={(e) => setInviteCohort(e.target.value)}
                className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
              >
                {(cohortProjects || []).map((cp) => (
                  <option
                    key={`${cp.id || "cohort"}-${cp.name}`}
                    value={cp.name}
                  >
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-student-role"
                className="block text-xs font-semibold text-[#121215] mb-1"
              >
                Access Role
              </label>
              <select
                id="invite-student-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(
                    e.target.value as "Learner" | "Mentor" | "Admin"
                  )
                }
                className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
              >
                <option value="Learner">Learner (Student Portal)</option>
                <option value="Mentor">Mentor (Authoring &amp; Grading)</option>
                <option value="Admin">Admin (Full Workspace)</option>
              </select>
            </div>
          </div>

          {/* Checklist: Assign Initial Learning Materials */}
          <div className="space-y-2 pt-2 border-t border-[#EAECEF]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#121215]">
                Pilih Materi Pembelajaran yang Boleh Dilihat Siswa
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMaterialIds(
                      availableMaterials.map((m: ExplorerContentItem) => m.id)
                    )
                  }
                  className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-[#D1D5DB]">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedMaterialIds([])}
                  className="text-[11px] font-semibold text-[#5E5E5E] hover:underline cursor-pointer"
                >
                  Batal Semua
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#5E5E5E]">
              Centang materi mana saja yang langsung dapat diakses dan dilihat oleh siswa saat pertama kali membuka aplikasi.
            </p>

            <div className="max-h-44 overflow-y-auto divide-y divide-[#EAECEF] rounded-lg border border-[#EAECEF] bg-[#FFFFFF]">
              {availableMaterials.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#5E5E5E]">
                  Belum ada konten pembelajaran yang dipublikasikan.
                </div>
              ) : (
                availableMaterials.map((mat: ExplorerContentItem) => {
                  const isChecked = selectedMaterialIds.includes(mat.id);
                  return (
                    <label
                      key={mat.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#F8F9FB] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedMaterialIds((prev) =>
                              prev.includes(mat.id)
                                ? prev.filter((id) => id !== mat.id)
                                : [...prev, mat.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-[#D1D5DB] text-[#4F39F6] focus:ring-[#4F39F6] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#121215] truncate">
                            {mat.title}
                          </p>
                          <p className="text-[10px] text-[#5E5E5E]">
                            {mat.type} • {mat.category}
                          </p>
                        </div>
                      </div>
                      <ContentBadge type={mat.type} size="sm" />
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#4F39F6] font-semibold">
                ✓ {selectedMaterialIds.length} dari {availableMaterials.length} materi dipilih untuk di-assign
              </span>
              {selectedMaterialIds.length === 0 && (
                <span className="text-[#EF4444] font-medium">
                  (Jika 0 materi, siswa belum bisa melihat kelas apa pun)
                </span>
              )}
            </div>
          </div>

          {/* CSV Quick Batch Import Box */}
          <div className="rounded-xl bg-[#F8F9FB] p-4 border border-dashed border-[#D1D5DB] flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#121215]">
                Have a Cohort CSV Roster?
              </p>
              <p className="text-[11px] text-[#5E5E5E]">
                Import columns: `full_name, email, cohort, role`
              </p>
            </div>
            <button
              type="button"
              onClick={handleCsvBatchImport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/50 px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
            >
              <Upload size={13} className="text-[#4F39F6]" />
              <span>Import Sample CSV (2 Students)</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Mail size={13} />
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal 2: Individual User Profile, Learning Progress, Coins & Password Reset */}
      <ModalDialog
        open={Boolean(inspectedMember)}
        onClose={() => {
          setInspectedMember(null);
          setResetPasswordInput("");
          setShowResetPassword(false);
        }}
        titleId="learner-portfolio-inspector-title"
        title={
          inspectedMember
            ? `Profil User — ${inspectedMember.name}`
            : "Profil User"
        }
        subtitle={
          inspectedMember
            ? `${inspectedMember.email} • ${inspectedMember.cohort} • Role: ${inspectedMember.accessRole}`
            : ""
        }
        maxWidthClass="max-w-3xl"
      >
        {inspectedMember && (() => {
          const activeMember =
            allDirectoryMembers.find(
              (m) =>
                m.email.toLowerCase() === inspectedMember.email.toLowerCase() ||
                m.id === inspectedMember.id
            ) || inspectedMember;
          const activeSubInfo = getMemberSubInfo(activeMember);
          const overallPct =
            activeMember.totalChapters > 0
              ? Math.min(
                  100,
                  Math.round(
                    (activeMember.completedChapters / activeMember.totalChapters) *
                      100
                  )
                )
              : 0;
          const totalCoinsSpent = memberClaimedRewards.reduce(
            (sum, item) => sum + (Number(item.pointsSpent) || 0),
            0
          );
          const pwRecord = getMemberPasswordRecord(activeMember);
          const memberEnrolls = userEnrollmentsMap[activeMember.id] || [];

          return (
            <div className="space-y-5">
              {/* Profile Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] px-4 py-3.5 border border-[#EAECEF]">
                <div className="flex items-center gap-3.5 min-w-0">
                  {(() => {
                    const inspectedAvatar =
                      resolveUserAvatar(
                        activeMember.email,
                        activeMember.name,
                        activeMember.id
                      ) || activeMember.avatarUrl;
                    if (inspectedAvatar) {
                      return (
                        <img
                          src={inspectedAvatar}
                          alt={activeMember.name}
                          className="h-12 w-12 shrink-0 rounded-full object-cover border border-[#E2E8F0]"
                        />
                      );
                    }
                    return (
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: activeMember.avatarBg,
                          color: activeMember.avatarText,
                        }}
                      >
                        {activeMember.initials}
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#121215] truncate">
                        {activeMember.name}
                      </p>
                      <span className="rounded-md bg-[#EEF2FF] border border-[#4F39F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                        {activeMember.accessRole}
                      </span>
                      {activeMember.accessRole !== "Learner" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/40 px-2 py-0.5 text-[10px] font-bold">
                          <Zap size={10} fill="currentColor" />
                          <span>Unlimited Staf</span>
                        </span>
                      ) : activeSubInfo ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            activeSubInfo.status === "expired"
                              ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                              : activeSubInfo.status === "expiring_soon"
                              ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                              : activeSubInfo.status === "active"
                              ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                              : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF]"
                          }`}
                        >
                          <Zap size={10} fill="currentColor" />
                          <span>{activeSubInfo.badgeLabel}</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#64748B] truncate mt-0.5">
                      {activeMember.email} • {activeMember.jobTitle} •{" "}
                      {activeMember.cohort}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeMember.accessRole === "Learner" && (
                    <button
                      type="button"
                      onClick={() => openRenewModal(activeMember)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                    >
                      <Calendar size={12} className="text-[#F59E0B]" />
                      <span>
                        {activeSubInfo?.status === "free"
                          ? "Aktifkan PRO"
                          : "Perpanjang / Atur PRO"}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setProfileTab("security")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    <KeyRound size={12} />
                    <span>Reset Password</span>
                  </button>
                </div>
              </div>

              {activeMember.accessRole === "Learner" && activeSubInfo && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] px-4 py-3 border border-[#EAECEF]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 min-w-[260px] text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                        Paket Langganan
                      </p>
                      <p className="font-bold text-[#121215] mt-0.5 truncate">
                        {activeMember.proPackageName ||
                          (activeSubInfo.status === "free"
                            ? "Free Tier"
                            : "Learner PRO Monthly")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                        Tgl Berlangganan
                      </p>
                      <p className="font-bold text-[#121215] mt-0.5 tabular-nums">
                        {activeSubInfo.status === "free"
                          ? "—"
                          : activeSubInfo.startedLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                        Jatuh Tempo
                      </p>
                      <p
                        className={`font-bold mt-0.5 tabular-nums ${
                          activeSubInfo.status === "expired"
                            ? "text-[#DC2626]"
                            : activeSubInfo.status === "expiring_soon"
                            ? "text-[#B45309]"
                            : "text-[#121215]"
                        }`}
                      >
                        {activeSubInfo.status === "free"
                          ? "—"
                          : activeSubInfo.dueLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                        Status Masa Aktif
                      </p>
                      <p
                        className={`font-bold mt-0.5 ${
                          activeSubInfo.status === "expired"
                            ? "text-[#DC2626]"
                            : activeSubInfo.status === "expiring_soon"
                            ? "text-[#B45309]"
                            : activeSubInfo.status === "active"
                            ? "text-[#059669]"
                            : "text-[#64748B]"
                        }`}
                      >
                        {activeSubInfo.badgeLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleQuickExtend30Days(activeMember)}
                      disabled={
                        quickExtendingEmail ===
                        (activeMember.email || "").toLowerCase().trim()
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <RotateCw size={12} />
                      <span>+30 Hari</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openRenewModal(activeMember)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                    >
                      <Calendar size={12} className="text-[#4F39F6]" />
                      <span>Atur Tanggal</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4 Summary Metric Cards: Sisa Koin, Progress Belajar, Skor Kuis, Status Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Remaining Coins */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                      <Coins size={11} className="text-[#F59E0B]" />
                      <span>Sisa Koin / Poin</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustPointsTarget(activeMember);
                        setAdjustPointsMode("add");
                        setAdjustPointsValue(100);
                        setAdjustPointsReason("Bonus Keaktifan");
                      }}
                      className="text-[10px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Edit3 size={10} />
                      <span>Ubah Saldo</span>
                    </button>
                  </div>
                  <p className="text-lg font-extrabold text-[#B45309] mt-1 flex items-center gap-1">
                    <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                    <span className="tabular-nums">
                      {activeMember.points.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold">Koin</span>
                  </p>
                  <p className="text-[11px] text-[#5E5E5E] mt-1">
                    Terpakai:{" "}
                    <span className="font-semibold">
                      {totalCoinsSpent.toLocaleString()} Koin
                    </span>{" "}
                    ({memberClaimedRewards.length} hadiah)
                  </p>
                </div>

                {/* 2. Learning Progress */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                    <BookOpen size={11} className="text-[#4F39F6]" />
                    <span>Progress Belajar</span>
                  </p>
                  <p className="text-lg font-extrabold text-[#121215] mt-1 tabular-nums">
                    {overallPct}%{" "}
                    <span className="text-xs font-semibold text-[#5E5E5E]">
                      ({activeMember.completedChapters}/
                      {activeMember.totalChapters} Bab)
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#4F39F6]"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#5E5E5E] mt-1">
                    {memberAssignedItems.length} Materi di-assign
                  </p>
                </div>

                {/* 3. Quiz Avg & Certificate */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                    Skor Kuis &amp; Sertifikat
                  </p>
                  <p className="text-lg font-extrabold text-[#10B981] mt-1">
                    {activeMember.avgQuizScore}%{" "}
                    <span className="text-xs font-semibold text-[#5E5E5E]">
                      Rata-rata
                    </span>
                  </p>
                  <p className="text-[11px] font-semibold text-[#4F39F6] mt-1 truncate">
                    ID: {activeMember.credentialId}
                  </p>
                </div>

                {/* 4. Password Security Status */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                    <ShieldCheck size={11} className="text-[#10B981]" />
                    <span>Keamanan Akun</span>
                  </p>
                  <p className="text-xs font-bold text-[#121215] mt-1.5">
                    {pwRecord
                      ? "Password Baru Aktif"
                      : "Terenkripsi (Supabase Auth)"}
                  </p>
                  <p className="text-[11px] text-[#5E5E5E] mt-0.5 truncate">
                    {pwRecord
                      ? `Direset ${new Date(pwRecord.updatedAt).toLocaleDateString("id-ID")}`
                      : "Password disimpan aman ter-hash"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setProfileTab("security")}
                    className="mt-1.5 text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                  >
                    Atur Password Baru &rarr;
                  </button>
                </div>
              </div>

              {/* 3-Tab Switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
                {(
                  [
                    { id: "activity", label: "Progress Belajar & Koin" },
                    {
                      id: "assigned",
                      label: `Kelola Materi (${memberAssignedItems.length})`,
                    },
                    { id: "security", label: "Reset Password" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileTab(tab.id)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      profileTab === tab.id
                        ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                        : "text-[#5E5E5E] hover:text-[#121215]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {profileTab === "activity" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Per-Course Learning Progress */}
                  <div className="md:col-span-7 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                        Progress Per Kelas ({memberAssignedItems.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setProfileTab("assigned")}
                        className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                      >
                        + Tambah / Cabut Materi
                      </button>
                    </div>

                    {memberAssignedItems.length === 0 ? (
                      <div className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] p-5 text-center space-y-2">
                        <p className="text-xs text-[#5E5E5E]">
                          Belum ada kelas/materi yang di-assign ke{" "}
                          <span className="font-semibold">{activeMember.name}</span>.
                        </p>
                        <button
                          type="button"
                          onClick={() => setProfileTab("assigned")}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Assign Materi Sekarang</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {memberAssignedItems.map((item) => {
                          const currSections =
                            courseCurriculums?.[item.title.trim().toLowerCase()] ||
                            [];
                          const totalCourseCh = currSections.reduce(
                            (acc, sec) => acc + (sec.chapters?.length || 0),
                            0
                          );
                          const enrollMatch = memberEnrolls.find(
                            (en) => en.contentId === item.id
                          );
                          const coursePct = enrollMatch
                            ? enrollMatch.progressPercent
                            : item.progressPercent || 0;
                          const completedChInCourse = enrollMatch
                            ? enrollMatch.completedCount
                            : Math.round((coursePct / 100) * totalCourseCh);

                          return (
                            <div
                              key={item.id}
                              className="rounded-lg bg-[#FFFFFF] p-3 border border-[#EAECEF] space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-[#121215] truncate">
                                  {item.title}
                                </span>
                                <span className="font-bold text-[#4F39F6] shrink-0 tabular-nums">
                                  {coursePct}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#4F39F6]"
                                  style={{ width: `${coursePct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-[#5E5E5E]">
                                <span>
                                  {item.folderName || item.cohort || item.category}
                                </span>
                                <span className="tabular-nums">
                                  {totalCourseCh > 0
                                    ? `${completedChInCourse}/${totalCourseCh} Bab selesai`
                                    : item.type}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Remaining Coins & Rewards History */}
                  <div className="md:col-span-5 rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215] flex items-center gap-1.5">
                        <Gift size={13} className="text-[#F59E0B]" />
                        <span>Koin &amp; Penukaran Hadiah</span>
                      </h3>
                    </div>

                    <div className="rounded-lg bg-[#FEF3C7]/40 border border-[#F59E0B]/30 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#B45309]">
                          Remaining Coins
                        </p>
                        <p className="text-base font-extrabold text-[#B45309] tabular-nums">
                          {activeMember.points.toLocaleString()} Koin
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustPointsTarget(activeMember);
                          setAdjustPointsMode("add");
                          setAdjustPointsValue(100);
                          setAdjustPointsReason("Bonus Keaktifan");
                        }}
                        className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-bold text-[#B45309] border border-[#F59E0B]/40 cursor-pointer"
                      >
                        + Atur Koin
                      </button>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {memberClaimedRewards.length === 0 ? (
                        <p className="text-xs text-[#5E5E5E] py-3 text-center">
                          Belum ada hadiah yang ditukarkan oleh user ini.
                        </p>
                      ) : (
                        memberClaimedRewards.map((rw) => (
                          <div
                            key={rw.id}
                            className="rounded-lg bg-[#F8F9FB] p-2.5 border border-[#EAECEF] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[#121215] truncate">
                                {rw.rewardTitle}
                              </p>
                              <p className="text-[10px] text-[#5E5E5E]">
                                {new Date(rw.claimedAt).toLocaleDateString("id-ID")} •{" "}
                                {rw.status}
                              </p>
                            </div>
                            <span className="shrink-0 font-bold text-[#EF4444] tabular-nums">
                              -{rw.pointsSpent} pts
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {profileTab === "assigned" && (
                /* Assigned Courses & Add/Revoke Access */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                        Materi yang Sudah Di-assign ({memberAssignedItems.length})
                      </h3>
                      <span className="text-[11px] text-[#5E5E5E]">
                        Klik &quot;Cabut Akses&quot; untuk menghapus hak akses
                      </span>
                    </div>

                    <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] bg-[#FFFFFF] max-h-48 overflow-y-auto">
                      {memberAssignedItems.length === 0 ? (
                        <div className="p-5 text-center text-xs text-[#5E5E5E]">
                          Belum ada materi pembelajaran yang di-assign untuk user ini.
                        </div>
                      ) : (
                        memberAssignedItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ContentBadge type={item.type} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#121215] truncate">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-[#5E5E5E]">
                                  {item.folderName || item.category} • {item.type}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRevokeMemberAccess(
                                  activeMember,
                                  item.id,
                                  item.title
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#EF4444] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5]/40 transition-colors cursor-pointer shrink-0"
                            >
                              <UserMinus size={12} />
                              <span>Cabut Akses</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {memberUnassignedMaterials.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                        Tambah Materi Baru untuk {activeMember.name}
                      </h3>
                      <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] bg-[#F8F9FB] max-h-40 overflow-y-auto">
                        {memberUnassignedMaterials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-2.5 px-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ContentBadge type={mat.type} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#121215] truncate">
                                  {mat.title}
                                </p>
                                <p className="text-[10px] text-[#5E5E5E] truncate">
                                  {mat.folderName || mat.cohort || mat.category}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleAssignMaterialToMember(activeMember, mat)
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer shrink-0"
                            >
                              <Plus size={12} />
                              <span>Assign</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {profileTab === "security" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Direct Admin Password Reset Form */}
                  <form
                    onSubmit={handleAdminDirectPasswordReset}
                    className="md:col-span-7 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215] flex items-center gap-1.5">
                          <KeyRound size={13} className="text-[#4F39F6]" />
                          <span>Reset Password Langsung oleh Admin</span>
                        </h3>
                        <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                          Atur password baru untuk{" "}
                          <span className="font-semibold text-[#121215]">
                            {activeMember.email}
                          </span>
                          . User dapat langsung login menggunakan password ini.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="admin-reset-password-input"
                        className="block text-xs font-semibold text-[#121215]"
                      >
                        Password Baru
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            id="admin-reset-password-input"
                            type={showResetPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={resetPasswordInput}
                            onChange={(e) => setResetPasswordInput(e.target.value)}
                            placeholder="Masukkan minimal 6 karakter..."
                            className="w-full rounded-lg bg-[#FFFFFF] px-3 py-2 pr-9 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
                            title={
                              showResetPassword
                                ? "Sembunyikan password"
                                : "Tampilkan password"
                            }
                          >
                            {showResetPassword ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerateResetPassword}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/50 px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer shrink-0"
                          title="Buat password acak otomatis"
                        >
                          <RefreshCw size={12} className="text-[#4F39F6]" />
                          <span>Generate</span>
                        </button>

                        {resetPasswordInput && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyResetPassword(resetPasswordInput)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/50 px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer shrink-0"
                            title="Salin password"
                          >
                            {copiedPassword ? (
                              <Check size={12} className="text-[#10B981]" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>Salin</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSavingPassword || !resetPasswordInput.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                      >
                        <KeyRound size={13} />
                        <span>
                          {isSavingPassword
                            ? "Menyimpan..."
                            : "Simpan Password Baru (Langsung Aktif)"}
                        </span>
                      </button>
                    </div>
                  </form>

                  {/* Current Reset Record & Optional Email Reset */}
                  <div className="md:col-span-5 rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                        Keamanan Password
                      </h3>
                      {pwRecord ? (
                        <div className="rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase text-[#059669]">
                              Salin Sekali (Sesi Aktif)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyResetPassword(pwRecord.password)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:underline cursor-pointer"
                            >
                              <Copy size={11} />
                              <span>Salin</span>
                            </button>
                          </div>
                          <p className="font-mono text-sm font-bold text-[#121215] select-all">
                            {pwRecord.password}
                          </p>
                          <p className="text-[10px] text-[#5E5E5E]">
                            Direset oleh {pwRecord.updatedBy || "Admin"} pada{" "}
                            {new Date(pwRecord.updatedAt).toLocaleString("id-ID")}. Akan hilang otomatis saat modal ditutup.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] p-3 text-xs text-[#5E5E5E]">
                          Password dikelola terenkripsi (bcrypt) di Supabase Auth dan tidak pernah disimpan atau diekspos dalam bentuk plaintext.
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#EAECEF] space-y-2">
                      <p className="text-[11px] text-[#5E5E5E]">
                        Alternatif: kirim link reset resmi ke email user via Supabase
                        Auth:
                      </p>
                      <button
                        type="button"
                        onClick={handleSendSupabaseResetEmail}
                        disabled={isSendingResetEmail}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                      >
                        <Send size={12} className="text-[#4F39F6]" />
                        <span>
                          {isSendingResetEmail
                            ? "Mengirim Email..."
                            : "Kirim Link Reset ke Email"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Portfolio Modal Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAECEF]">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                  <CheckCircle2 size={14} />
                  <span>Eligible for Official Ruang Sosmed 2.0 Certificate</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeMember;
                      setInspectedMember(null);
                      setCertificateMember(target);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    <Award size={14} />
                    <span>
                      🎓 View &amp; Download Certificate (
                      {activeMember.credentialId})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </ModalDialog>

      {/* Official Certificate Generator Modal for Selected Learner */}
      <OfficialCertificateModal
        open={Boolean(certificateMember)}
        onClose={() => setCertificateMember(null)}
        learnerName={certificateMember?.name}
        learnerRole={certificateMember?.jobTitle}
        credentialId={certificateMember?.credentialId}
        scoreLabel={`${
          certificateMember?.avgQuizScore ?? 92
        }% Mastery Score • ${certificateMember?.cohort ?? "Batch Oktober 2026"}`}
        onShowToast={onShowToast}
        onOpenStudio={onOpenCertificateStudio}
      />

      {/* Modal 3: Manual Points Adjustment Modal */}
      <ModalDialog
        open={Boolean(adjustPointsTarget)}
        onClose={() => setAdjustPointsTarget(null)}
        titleId="adjust-points-modal-title"
        title={
          adjustPointsTarget
            ? `Atur Poin Member: ${adjustPointsTarget.name}`
            : "Atur Poin Member"
        }
        subtitle={
          adjustPointsTarget
            ? `${adjustPointsTarget.email} • Saldo Saat Ini: ⭐ ${adjustPointsTarget.points.toLocaleString()} pts`
            : ""
        }
        maxWidthClass="max-w-md"
      >
        {adjustPointsTarget && (
          <form onSubmit={handleSaveAdjustPoints} className="space-y-4">
            {/* Member Info Card */}
            <div className="rounded-xl bg-[#F8FAFC] p-3 border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: adjustPointsTarget.avatarBg,
                    color: adjustPointsTarget.avatarText,
                  }}
                >
                  {adjustPointsTarget.initials}
                </span>
                <div>
                  <p className="text-xs font-bold text-[#121215]">
                    {adjustPointsTarget.name}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {adjustPointsTarget.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase">Saldo Saat Ini</p>
                <p className="text-sm font-extrabold text-[#B45309] flex items-center gap-1 justify-end">
                  <Star size={12} className="text-[#F59E0B]" fill="#F59E0B" />
                  {adjustPointsTarget.points.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Mode Switcher: Tambah Poin (+) vs Set Total (=) */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                Metode Pengaturan
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustPointsMode("add")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustPointsMode === "add"
                      ? "bg-white text-[#4F39F6] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  + Tambah Poin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustPointsMode("set");
                    setAdjustPointsValue(adjustPointsTarget.points);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustPointsMode === "set"
                      ? "bg-white text-[#4F39F6] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  = Atur Saldo Total
                </button>
              </div>
            </div>

            {/* Quick Presets (Only in "add" mode) */}
            {adjustPointsMode === "add" && (
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Pilihan Cepat (+pts)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[25, 50, 100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustPointsValue(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        adjustPointsValue === preset
                          ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                          : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#4F39F6] hover:text-[#4F39F6]"
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Value */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1">
                {adjustPointsMode === "add" ? "Jumlah Poin Ditambahkan" : "Total Saldo Poin Baru"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={adjustPointsMode === "add" ? -adjustPointsTarget.points : 0}
                  value={adjustPointsValue}
                  onChange={(e) => setAdjustPointsValue(Number(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#121215] border border-[#CBD5E1] focus:border-[#4F39F6] focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">
                  pts
                </span>
              </div>
            </div>

            {/* Reason / Note */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1">
                Alasan / Catatan Penyesuaian
              </label>
              <select
                value={adjustPointsReason}
                onChange={(e) => setAdjustPointsReason(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-xs font-medium text-[#121215] border border-[#CBD5E1] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
              >
                <option value="Bonus Keaktifan">Bonus Keaktifan Diskusi</option>
                <option value="Tugas Portofolio Terbaik">Tugas Portofolio Terbaik</option>
                <option value="Lulus Kuis Sempurna">Lulus Kuis Sempurna</option>
                <option value="Apresiasi Komunitas">Apresiasi Komunitas / Event</option>
                <option value="Penyesuaian Manual Admin">Penyesuaian Manual Admin</option>
                <option value="Koreksi Sistem">Koreksi Sistem</option>
              </select>
            </div>

            {/* Calculation Result Summary Card */}
            <div className="rounded-xl bg-[#FEF3C7]/40 border border-[#F59E0B]/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                  Hasil Perhitungan
                </p>
                <p className="text-xs text-[#78350F] mt-0.5">
                  {adjustPointsTarget.points.toLocaleString()} pts{" "}
                  {adjustPointsMode === "add"
                    ? `${adjustPointsValue >= 0 ? "+" : ""}${adjustPointsValue}`
                    : `→ ${finalCalculatedPoints}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                  Saldo Baru
                </p>
                <p className="text-base font-black text-[#B45309] flex items-center gap-1 justify-end">
                  <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                  {finalCalculatedPoints.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setAdjustPointsTarget(null)}
                disabled={isAdjustingPoints}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#121215] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isAdjustingPoints}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
              >
                <Star size={13} fill="currentColor" />
                <span>{isAdjustingPoints ? "Menyimpan..." : "Simpan & Sinkronkan"}</span>
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal 4: Manual PRO Activation & Subscription Renewal */}
      <ModalDialog
        open={Boolean(renewModalMember)}
        onClose={() => !isSavingRenewal && setRenewModalMember(null)}
        titleId="manual-pro-renewal-modal-title"
        title={
          renewModalMember
            ? `Atur & Perpanjang PRO — ${renewModalMember.name}`
            : "Atur Langganan PRO"
        }
        subtitle={
          renewModalMember
            ? `${renewModalMember.email} • Atur tanggal berlangganan, jatuh tempo, atau perpanjang manual`
            : ""
        }
        maxWidthClass="max-w-lg"
      >
        {renewModalMember && (() => {
          const todayIso = getTodayIsoDate();
          const currentSub = getMemberSubInfo(renewModalMember);
          const hasActiveFutureDue =
            Boolean(currentSub?.dueDateIso) &&
            (currentSub?.status === "active" ||
              currentSub?.status === "expiring_soon") &&
            (currentSub?.dueDateIso || "") >= todayIso;
          const basePresetAnchor =
            hasActiveFutureDue && currentSub?.dueDateIso
              ? currentSub.dueDateIso
              : renewStartDate || todayIso;
          const totalDurationDays =
            renewStartDate && renewDueDate
              ? Math.max(0, diffCalendarDays(renewStartDate, renewDueDate))
              : 0;

          return (
            <form onSubmit={handleSaveRenewal} className="space-y-4">
              {/* Current Subscription Summary */}
              <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    Status Saat Ini
                  </p>
                  <p className="text-xs font-bold text-[#121215] mt-0.5">
                    {currentSub?.badgeLabel || "Free Plan"}
                  </p>
                  {currentSub && currentSub.status !== "free" && (
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5 tabular-nums">
                      Mulai: {currentSub.startedLabel} • Tempo:{" "}
                      <strong className="text-[#121215]">{currentSub.dueLabel}</strong>
                    </p>
                  )}
                </div>
                {renewModalMember.proPackageName && (
                  <span className="rounded-md bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-bold text-[#4F39F6]">
                    {renewModalMember.proPackageName}
                  </span>
                )}
              </div>

              {/* Paid Package Selection */}
              {(() => {
                const paidPackages = getNormalizedProPackages(
                  learnerProConfig
                ).filter((p) => p.tierKind !== "free");
                if (paidPackages.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-[#121215] mb-1.5">
                      Pilih Paket Langganan (Basic / Pro)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {paidPackages.map((pkg) => {
                        const isChosen =
                          renewPackageId === pkg.id ||
                          renewPackageName.toLowerCase() ===
                            pkg.name.toLowerCase();
                        const monthlyIdr = Number(pkg.monthlyPriceIdr ?? 0);
                        const trial3Price = computeTrial3DaysPriceIdr(
                          monthlyIdr,
                          pkg.trial3DaysPriceIdr
                        );
                        const trialPrice = computeTrial7DaysPriceIdr(
                          monthlyIdr,
                          pkg.trial7DaysPriceIdr
                        );
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => {
                              setRenewPackageId(pkg.id);
                              setRenewPackageName(pkg.name);
                            }}
                            className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                              isChosen
                                ? "bg-[#EEF2FF] border-[#4F39F6] ring-1 ring-[#4F39F6]/25"
                                : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#4F39F6]/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-bold text-[#121215]">
                                {pkg.name}
                              </span>
                              <span className="text-[10px] font-bold text-[#4F39F6] tabular-nums">
                                {formatIdr(monthlyIdr)}/30h
                              </span>
                            </div>
                            <p className="text-[10px] text-[#64748B] mt-0.5">
                              {pkg.moduleAccessMode === "limited"
                                ? `Maks ${pkg.maxModulesPerCourse} modul/kursus • `
                                : "Semua modul penuh • "}
                              Trial 3h: {formatIdr(trial3Price)} • 7h:{" "}
                              {formatIdr(trialPrice)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Quick Extension Presets */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-[#121215]">
                    Pilihan Cepat Durasi
                  </p>
                  {renewModalMember.hasUsedTrial && (
                    <span className="inline-flex items-center rounded-full bg-[#FEF3C7] border border-[#F59E0B]/40 px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
                      Trial 1× sudah pernah dipakai akun ini
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] mb-2">
                  {hasActiveFutureDue && currentSub?.dueDateIso
                    ? `Ditambahkan otomatis dari jatuh tempo aktif (${formatIndoDate(
                        currentSub.dueDateIso
                      )}):`
                    : "Dihitung mulai dari Tanggal Berlangganan di bawah:"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    {
                      label: "+3 Hari (Trial 1×)",
                      days: 3,
                      cycle: "3d_trial" as const,
                    },
                    {
                      label: "+7 Hari (Trial 1×)",
                      days: 7,
                      cycle: "7d_trial" as const,
                    },
                    { label: "+30 Hari", days: 30, cycle: "30d" as const },
                    { label: "+90 Hari", days: 90, cycle: "30d" as const },
                    { label: "+1 Tahun", days: 365, cycle: "30d" as const },
                  ].map((preset) => {
                    const targetDue = addDaysToIsoDate(
                      basePresetAnchor,
                      preset.days
                    );
                    const isSelectedPreset = renewDueDate === targetDue;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          if (!hasActiveFutureDue && !renewStartDate) {
                            setRenewStartDate(todayIso);
                          }
                          setRenewDueDate(targetDue);
                          setRenewBillingCycle(preset.cycle);
                        }}
                        className={`rounded-lg px-2.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                          isSelectedPreset
                            ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                            : isTrialBillingCycle(preset.cycle) &&
                              renewModalMember.hasUsedTrial
                            ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                            : "bg-[#FFFFFF] text-[#121215] border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="renew-pro-start-date"
                    className="block text-xs font-semibold text-[#121215] mb-1"
                  >
                    Tanggal Berlangganan (Mulai)
                  </label>
                  <input
                    id="renew-pro-start-date"
                    type="date"
                    required
                    value={renewStartDate}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setRenewStartDate(nextStart);
                      if (nextStart && renewDueDate && renewDueDate < nextStart) {
                        setRenewDueDate(addDaysToIsoDate(nextStart, 30));
                      }
                    }}
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="renew-pro-due-date"
                    className="block text-xs font-semibold text-[#121215] mb-1"
                  >
                    Tanggal Jatuh Tempo
                  </label>
                  <input
                    id="renew-pro-due-date"
                    type="date"
                    required
                    min={renewStartDate || undefined}
                    value={renewDueDate}
                    onChange={(e) => setRenewDueDate(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Package Name */}
              <div>
                <label
                  htmlFor="renew-pro-package-name"
                  className="block text-xs font-semibold text-[#121215] mb-1"
                >
                  Nama Paket Aktif
                </label>
                <input
                  id="renew-pro-package-name"
                  type="text"
                  required
                  value={renewPackageName}
                  onChange={(e) => setRenewPackageName(e.target.value)}
                  placeholder="Contoh: Basic atau Pro"
                  className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                />
              </div>

              {/* Live Summary Preview */}
              <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#065F46]">
                  Periode Aktif: {formatIndoDate(renewStartDate)} →{" "}
                  {formatIndoDate(renewDueDate)}
                </span>
                <span className="font-bold text-[#059669] tabular-nums">
                  Total {totalDurationDays} Hari
                </span>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EAECEF]">
                {currentSub && currentSub.status !== "free" ? (
                  <button
                    type="button"
                    disabled={isSavingRenewal}
                    onClick={() => void handleRevokeToFree(renewModalMember)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] disabled:opacity-50 px-3 py-2 text-xs font-bold text-[#DC2626] border border-[#FECACA] cursor-pointer"
                  >
                    <XCircle size={13} />
                    <span>Cabut ke Free</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingRenewal}
                    onClick={() => setRenewModalMember(null)}
                    className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRenewal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>
                      {isSavingRenewal
                        ? "Menyimpan..."
                        : "Simpan & Aktifkan PRO"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          );
        })()}
      </ModalDialog>

      {/* Modal 4b: Lightbox Preview Bukti Pembayaran (Otomatis Terhapus Saat Disetujui / Ditolak) */}
      <ModalDialog
        open={Boolean(previewProofReq)}
        onClose={() => setPreviewProofReq(null)}
        titleId="proof-preview-modal-title"
        title={`Bukti Pembayaran — ${previewProofReq?.user_name || "Learner"}`}
        subtitle={
          previewProofReq
            ? `${previewProofReq.package_name} • ${previewProofReq.price_label} • ${previewProofReq.payment_method}`
            : undefined
        }
        maxWidthClass="max-w-lg"
      >
        {previewProofReq && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#121215]">
                  {previewProofReq.user_name}
                </span>
                <span className="font-semibold text-[#4F39F6]">
                  {previewProofReq.price_label}
                </span>
              </div>
              <p className="text-[11px] text-[#5E5E5E]">
                {previewProofReq.user_email}
                {previewProofReq.buyer_contact
                  ? ` • WA: ${previewProofReq.buyer_contact}`
                  : ""}
              </p>
              <p className="text-[11px] text-[#5E5E5E]">
                Paket/Materi:{" "}
                <strong className="text-[#121215]">
                  {previewProofReq.request_type === "item_unlock"
                    ? previewProofReq.target_item_title ||
                      previewProofReq.package_name
                    : previewProofReq.package_name}
                </strong>
                {previewProofReq.billing_cycle === "3d_trial"
                  ? " (Trial 3 Hari)"
                  : previewProofReq.billing_cycle === "7d_trial"
                  ? " (Trial 7 Hari)"
                  : previewProofReq.request_type === "item_unlock"
                  ? " (Buka Materi Satuan)"
                  : ` (${previewProofReq.duration_days || 30} Hari)`}
              </p>
            </div>

            {previewProofReq.proof_url ? (
              <div className="overflow-hidden rounded-xl border border-[#EAECEF] bg-[#F8FAFC] p-2 flex flex-col items-center justify-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewProofReq.proof_url}
                  alt={`Bukti pembayaran ${previewProofReq.user_name}`}
                  className="max-h-[58vh] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <p className="text-xs text-[#64748B] text-center py-6">
                Bukti pembayaran tidak tersedia.
              </p>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2 text-[11px] text-[#92400E]">
              <Trash2 size={14} className="shrink-0 mt-0.5 text-[#D97706]" />
              <span>
                Untuk menjaga kapasitas server tetap ringan, gambar bukti transfer ini akan{" "}
                <strong>otomatis dihapus permanen dari server &amp; database</strong>{" "}
                begitu Anda menekan tombol konfirmasi atau tolak.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setPreviewProofReq(null)}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={processingReqId === previewProofReq.id}
                onClick={() => void handleRejectPendingRequest(previewProofReq)}
                className="rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-[#DC2626] border border-[#FECACA] cursor-pointer"
              >
                Tolak &amp; Hapus Bukti
              </button>
              <button
                type="button"
                disabled={processingReqId === previewProofReq.id}
                onClick={() => void handleApprovePendingRequest(previewProofReq)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>
                  {processingReqId === previewProofReq.id
                    ? "Memproses..."
                    : "Konfirmasi & Hapus Bukti"}
                </span>
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Modal 5: Near-Fullscreen Executive Insights Dashboard */}
      <AdminDirectoryInsightsModal
        open={insightsModalOpen}
        onClose={() => setInsightsModalOpen(false)}
        members={allDirectoryMembers}
        getMemberSubInfo={getMemberSubInfo}
        proRequests={allProRequests}
        configuredPackages={getNormalizedProPackages(learnerProConfig).map((p) => ({
          id: p.id,
          name: p.name,
          priceLabel: p.priceLabel,
          periodLabel: p.periodLabel,
        }))}
        cohortNames={(cohortProjects || []).map((c) => c.name)}
        totalCoinsRedeemed={(claimedRewards || []).reduce(
          (sum, r) => sum + (Number(r.pointsSpent) || 0),
          0
        )}
        totalRewardsClaimedCount={(claimedRewards || []).length}
        onQuickExtend30Days={(member) => void handleQuickExtend30Days(member)}
        onOpenRenewModal={(member) => openRenewModal(member)}
        onInspectMember={(member) => {
          setInspectedMember(member);
          setProfileTab("activity");
          setResetPasswordInput("");
          setShowResetPassword(false);
        }}
        quickExtendingEmail={quickExtendingEmail}
      />
    </div>
  );
}
