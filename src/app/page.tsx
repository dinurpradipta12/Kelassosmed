"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GlobalRoleSwitcher,
  type AppRoleMode,
  type AuthenticatedUser,
} from "@/components/navigation/GlobalRoleSwitcher";
import { AuthModal } from "@/components/auth/AuthModal";
import { PublicLandingView } from "@/components/landing/PublicLandingView";
import { UnderConstructionView } from "@/components/maintenance/UnderConstructionView";
import { LandingPageBuilder } from "@/components/landing/LandingPageBuilder";
import {
  INITIAL_LANDING_BLOCKS,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_PAYMENT_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  type LandingPageConfig,
} from "@/types/landing";
import {
  supabase,
  signOutUser,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  formatIndoDate,
  isProSubscriptionActive,
  isMissingSubDateColumnError,
} from "@/lib/subscription-utils";

let pageProfilesHasSubDateCols = true;

interface ActiveSubMeta {
  startedAt?: string | null;
  expiresAt?: string | null;
  packageName?: string | null;
  packageId?: string | null;
  billingCycle?: string | null;
}

function inferPaidTierKind(
  packageName?: string | null,
  packageId?: string | null
): "pro" | "basic" {
  const cleanId = String(packageId || "").trim().toLowerCase();
  const cleanName = String(packageName || "").trim().toLowerCase();
  if (cleanId === "pkg-basic" || cleanName.includes("basic")) {
    return "basic";
  }
  return "pro";
}

function buildWelcomeProSignature(params: {
  tierKind: "pro" | "basic";
  packageId?: string | null;
  planName?: string | null;
  billingCycle?: string | null;
  startedAt?: string | null;
  expiresAt?: string | null;
}): string {
  return [
    params.tierKind,
    params.packageId || params.planName || params.tierKind,
    params.billingCycle || "active",
    params.startedAt || "",
    params.expiresAt || "",
  ].join(":");
}
import {
  AdminLeftRail,
  type AdminNavId,
  type SecondaryNavLinkId,
} from "@/components/navigation/AdminLeftRail";
import { AdminHomeDashboard } from "@/components/dashboard/AdminHomeDashboard";
import {
  QuickCreateModal,
  GlobalSearchModal,
  UpgradePlanModal,
  GradeQuizModal,
  type ProVoucherRedeemResult,
} from "@/components/dashboard/StudioModals";
import { LearningContentExplorer } from "@/components/explorer/LearningContentExplorer";
import { ContentDetailView } from "@/components/explorer/ContentDetailView";
import { AssignLearnersModal } from "@/components/explorer/AssignLearnersModal";
import { CoursePageEditor } from "@/components/authoring/CoursePageEditor";
import { LearningPathBuilder } from "@/components/authoring/LearningPathBuilder";
import { WikiBuilder } from "@/components/authoring/WikiBuilder";
import { WikiArticleReader } from "@/components/wiki/WikiArticleReader";
import { ModularQuizBuilder } from "@/components/quiz/ModularQuizBuilder";
import { TrainerGradingCenter } from "@/components/quiz/TrainerGradingCenter";
import { LearnerPortalView } from "@/components/learner/LearnerPortalView";
import {
  WelcomeProModal,
  WELCOME_PRO_PREVIEW_EVENT,
  type WelcomeProModalData,
} from "@/components/learner/WelcomeProModal";
import { AdminAnalyticsScreen } from "@/components/admin/AdminAnalyticsScreen";
import { AdminLearnersDirectory } from "@/components/admin/AdminLearnersDirectory";
import { AdminMentorInbox } from "@/components/admin/AdminMentorInbox";
import { CertificateStudioScreen } from "@/components/certificate/CertificateStudioScreen";
import { AdminRewardsManager } from "@/components/admin/AdminRewardsManager";
import {
  AdminSettingsScreen,
} from "@/components/admin/AdminHistoryAndSettings";
import {
  UserProfileScreen,
} from "@/components/profile/UserProfileScreen";
import {
  RumiFloatingAssistant,
  type RumiQuickAction,
} from "@/components/assistant/RumiFloatingAssistant";
import type { RumiPageContextId } from "@/lib/rumi-assistant-guide";
import {
  type ContentType,
  type UngradedQuizItem,
} from "@/lib/design-tokens";
import {
  type ExplorerContentItem,
  type ExplorerItemType,
} from "@/lib/phase2-data";
import { type CourseSectionAccordion } from "@/lib/phase5-data";
import {
  normalizeCohortProjectName,
  RuangSosmedProvider,
  useRuangSosmedStore,
} from "@/context/RuangSosmedStore";
import {
  CheckCircle2,
  X,
  BookOpen,
  Library,
  Layout,
} from "lucide-react";

export type ActiveAuthoringMode =
  | {
      kind: "course-page";
      contentType: "Course" | "Page";
      title: string;
      folderName?: string;
      isNew?: boolean;
      draftSessionId?: string;
    }
  | { kind: "learning-path" }
  | { kind: "wiki"; title?: string; item?: ExplorerContentItem | null }
  | { kind: "quiz-builder"; title?: string }
  | { kind: "grading-center"; submissionTitle?: string }
  | null;

function RuangSosmedStudioInner() {
  const {
    explorerItems,
    cohortProjects,
    ungradedQuizzes: quizzes,
    reportedIssues,
    discussionThreads,
    adminNotifications,
    learnerIsPro,
    learnerAccess,
    learnerPackageId,
    learnerPackageName,
    learnerHasUsedTrial,
    adminPreviewTierOverride,
    setAdminPreviewTier,
    setLearnerProStatus,
    submitProUpgradeRequest,
    registerLearnerProfile,
    publishContentToStudioAndCatalog,
    duplicateExplorerItem,
    deleteExplorerItem,
    assignContentToLearners,
    quickGradeDashboardQuiz,
    resetGlobalStoreToDefaults,
    clearAllStoreData,
    getCourseCurriculum,
    maintenanceConfig,
  } = useRuangSosmedStore();

  const [roleMode, setRoleMode] = useState<AppRoleMode>("learner");
  const [activeNav, setActiveNav] = useState<AdminNavId>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(
          "ruang_sosmed_admin_active_nav_v1"
        ) as AdminNavId | null;
        if (saved) return saved;
      } catch {}
    }
    return "home";
  });
  const [activeSubNav, setActiveSubNav] =
    useState<SecondaryNavLinkId>(() => {
      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem(
            "ruang_sosmed_admin_active_sub_nav_v1"
          ) as SecondaryNavLinkId | null;
          if (saved) return saved;
        } catch {}
      }
      return "recents";
    });
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(true);
  const [activeProject, setActiveProject] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(
          "ruang_sosmed_admin_active_project_v1"
        );
        const normalized = normalizeCohortProjectName(saved);
        if (normalized) return normalized;
      } catch {}
    }
    return "Ruang Sosmed Class";
  });

  useEffect(() => {
    if (!Array.isArray(cohortProjects) || cohortProjects.length === 0) return;
    const normalizedCurrent = normalizeCohortProjectName(activeProject);
    const matching = cohortProjects.find(
      (c) => c.name.trim().toLowerCase() === normalizedCurrent.toLowerCase()
    );
    const targetName =
      matching?.name || cohortProjects[0]?.name || "Ruang Sosmed Class";
    if (targetName && targetName !== activeProject) {
      setActiveProject(targetName);
    }
  }, [cohortProjects, activeProject]);
  const [showProjectHub, setShowProjectHub] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(
          "ruang_sosmed_admin_show_project_hub_v1"
        );
        if (saved === "false") return false;
      } catch {}
    }
    return true;
  });

  // Phase 3 & Phase 4 Authoring & Grading Studio state (Persisted across refreshes)
  const [authoringMode, setAuthoringMode] =
    useState<ActiveAuthoringMode>(() => {
      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem(
            "ruang_sosmed_admin_authoring_mode_v1"
          );
          if (saved) return JSON.parse(saved);
        } catch {}
      }
      return null;
    });

  const [selectedContentDetailId, setSelectedContentDetailId] = useState<
    string | null
  >(() => {
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem(
          "ruang_sosmed_admin_content_detail_id_v1"
        );
      } catch {}
    }
    return null;
  });

  // Persist Admin Navigation & Studio states across refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_admin_active_project_v1",
          activeProject
        );
      } catch {}
    }
  }, [activeProject]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_admin_show_project_hub_v1",
          String(showProjectHub)
        );
      } catch {}
    }
  }, [showProjectHub]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_admin_active_sub_nav_v1",
          activeSubNav
        );
      } catch {}
    }
  }, [activeSubNav]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (authoringMode) {
          window.localStorage.setItem(
            "ruang_sosmed_admin_authoring_mode_v1",
            JSON.stringify(authoringMode)
          );
        } else {
          window.localStorage.removeItem(
            "ruang_sosmed_admin_authoring_mode_v1"
          );
        }
      } catch {}
    }
  }, [authoringMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (selectedContentDetailId) {
          window.localStorage.setItem(
            "ruang_sosmed_admin_content_detail_id_v1",
            selectedContentDetailId
          );
        } else {
          window.localStorage.removeItem(
            "ruang_sosmed_admin_content_detail_id_v1"
          );
        }
      } catch {}
    }
  }, [selectedContentDetailId]);

  const selectedContentDetail = selectedContentDetailId
    ? explorerItems.find((i) => i.id === selectedContentDetailId) ?? null
    : null;

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<ContentType>("Course");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalStep, setUpgradeModalStep] = useState<
    "overview" | "payment"
  >("overview");
  const [upgradePreselectedPackageId, setUpgradePreselectedPackageId] =
    useState<string | undefined>(undefined);
  const [upgradeInitialCycle, setUpgradeInitialCycle] = useState<
    "3d_trial" | "7d_trial" | "30d" | undefined
  >(undefined);
  const [gradingQuiz, setGradingQuiz] = useState<UngradedQuizItem | null>(null);
  const [assigningItem, setAssigningItem] =
    useState<ExplorerContentItem | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [welcomeProModalData, setWelcomeProModalData] =
    useState<WelcomeProModalData | null>(null);
  const [activeSubMeta, setActiveSubMeta] = useState<ActiveSubMeta | null>(
    null
  );
  const [adminProfileSubView, setAdminProfileSubView] = useState<
    "profile" | "manual-setup"
  >("profile");
  const [pendingProPaymentsCount, setPendingProPaymentsCount] = useState(0);

  const clearWelcomeProSeenForUser = useCallback(
    (user?: AuthenticatedUser | null) => {
      if (typeof window === "undefined" || !user) return;
      const userKey = (user.email || user.username || user.name || "")
        .trim()
        .toLowerCase();
      if (!userKey) return;
      try {
        window.localStorage.removeItem(`rs_welcome_pro_seen_v1::${userKey}`);
      } catch {}
    },
    []
  );

  const triggerWelcomeProIfUnseen = useCallback(
    (params: {
      user: AuthenticatedUser;
      packageId?: string | null;
      packageName?: string | null;
      billingCycle?: string | null;
      startedAt?: string | null;
      expiresAt?: string | null;
      tierKind?: "pro" | "basic";
    }) => {
      if (typeof window === "undefined") return;
      if (params.user.role === "admin") return;

      const userKey = (
        params.user.email ||
        params.user.username ||
        params.user.name ||
        "guest"
      )
        .trim()
        .toLowerCase();
      const resolvedTierKind =
        params.tierKind ||
        inferPaidTierKind(params.packageName, params.packageId);
      const resolvedPlanName =
        String(params.packageName || "").trim() ||
        (resolvedTierKind === "basic"
          ? "Basic"
          : "Ruang Sosmed Learning PRO");
      const tierSig = buildWelcomeProSignature({
        tierKind: resolvedTierKind,
        packageId: params.packageId,
        planName: resolvedPlanName,
        billingCycle: params.billingCycle,
        startedAt: params.startedAt,
        expiresAt: params.expiresAt,
      });
      const storageKey = `rs_welcome_pro_seen_v1::${userKey}`;

      try {
        const seenSig = window.localStorage.getItem(storageKey);
        if (seenSig === tierSig) return;
        window.localStorage.setItem(storageKey, tierSig);
      } catch {}

      setWelcomeProModalData({
        learnerName:
          params.user.name || params.user.username || "Learner",
        planName: resolvedPlanName,
        tierKind: resolvedTierKind,
        billingCycle: params.billingCycle ?? null,
        expiresAt: params.expiresAt ?? null,
        isPreview: false,
      });
    },
    []
  );

  const handleOpenAuth = (tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  // STRICT: Admin status derives ONLY from verified DB role (`public.profiles.role`)
  const isCurrentUserAdmin = currentUser?.role === "admin";

  // Auto-redirect if user is in admin studio without verified admin role
  useEffect(() => {
    if (roleMode === "admin" && !isCurrentUserAdmin && currentUser) {
      setRoleMode("learner");
      try {
        window.localStorage.setItem("ruang_sosmed_role_mode_v1", "learner");
      } catch {}
    }
  }, [roleMode, isCurrentUserAdmin, currentUser]);

  // Live pending PRO payments count for Admin Rumi Assistant reminder expression
  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      roleMode !== "admin" ||
      !isCurrentUserAdmin
    ) {
      setPendingProPaymentsCount(0);
      return;
    }
    let cancelled = false;
    supabase
      .from("pro_upgrade_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        if (!cancelled && typeof count === "number") {
          setPendingProPaymentsCount(count);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roleMode, isCurrentUserAdmin, activeNav, adminNotifications.length]);

  const handleRoleModeChange = (newMode: AppRoleMode) => {
    if (newMode === "admin" && !isCurrentUserAdmin) {
      triggerToast("Akun Anda berstatus Learner dan tidak memiliki hak akses Admin Studio.");
      return;
    }

    setRoleMode(newMode);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ruang_sosmed_role_mode_v1", newMode);
      } catch {}
    }
  };

  // Landing Page & Public View state (v5 3 curriculums: Fundamental -> Intermediate -> Masterclass)
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>({
    id: "landing-main",
    slug: "home",
    title: "Ruang Sosmed 2.0 — Official Platform",
    description:
      "Kelas fundamental untuk belajar strategi social media organik, konten, dan roadmap menjadi Social Media Specialist profesional.",
    headerImageUrl: "",
    headerConfig: DEFAULT_HEADER_CONFIG,
    paymentConfig: DEFAULT_PAYMENT_CONFIG,
    footerConfig: DEFAULT_FOOTER_CONFIG,
    theme: "violet",
    status: "published",
    blocks: INITIAL_LANDING_BLOCKS,
  });
  const [previewPublicLanding, setPreviewPublicLanding] = useState(false);

  const handleSaveLandingConfig = (newConfig: LandingPageConfig) => {
    setLandingConfig(newConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "ruang_sosmed_landing_config_v5",
          JSON.stringify(newConfig)
        );
      } catch {}
    }
  };

  // Sync latest landing page configuration from Supabase (when configured)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    const loadLandingFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("landing_pages")
          .select("*")
          .eq("slug", "home")
          .maybeSingle();

        if (cancelled || error || !data) return;

        if (Array.isArray(data.blocks) && data.blocks.length > 0) {
          setLandingConfig((prev) => {
            const merged: LandingPageConfig = {
              ...prev,
              id: data.id || prev.id,
              slug: data.slug || prev.slug,
              title: data.title || prev.title,
              description: data.description ?? prev.description,
              headerImageUrl: data.header_image_url ?? prev.headerImageUrl,
              headerConfig: data.header_config
                ? { ...DEFAULT_HEADER_CONFIG, ...data.header_config }
                : prev.headerConfig || DEFAULT_HEADER_CONFIG,
              paymentConfig: data.payment_config
                ? { ...DEFAULT_PAYMENT_CONFIG, ...data.payment_config }
                : prev.paymentConfig || DEFAULT_PAYMENT_CONFIG,
              footerConfig: data.footer_config
                ? { ...DEFAULT_FOOTER_CONFIG, ...data.footer_config }
                : prev.footerConfig || DEFAULT_FOOTER_CONFIG,
              theme: (data.theme as any) || prev.theme,
              status: (data.status as any) || prev.status,
              blocks: data.blocks,
            };
            try {
              window.localStorage.setItem(
                "ruang_sosmed_landing_config_v5",
                JSON.stringify(merged)
              );
            } catch {}
            return merged;
          });
        }
      } catch {
        // Ignore network / unmigrated table errors and keep local state
      }
    };

    loadLandingFromSupabase();
    return () => {
      cancelled = true;
    };
  }, []);

  // Non-intrusive toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSeq, setToastSeq] = useState(0);
  const deletedLogoutInFlightRef = useRef(false);

  const forceSignOutDeletedAccount = useCallback(async (reason?: string) => {
    if (deletedLogoutInFlightRef.current) return;
    deletedLogoutInFlightRef.current = true;
    try {
      window.localStorage.removeItem("ruang_sosmed_session_user_v1");
      window.localStorage.removeItem("ruang_sosmed_role_mode_v1");
    } catch {}
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setCurrentUser(null);
    setActiveSubMeta(null);
    setLearnerProStatus(false);
    setRoleMode("learner");
    setToastMessage(
      reason ||
        "Akun Anda telah dihapus oleh Admin. Silakan daftar akun baru untuk masuk kembali."
    );
    setToastSeq((s) => s + 1);
  }, [setLearnerProStatus]);

  // Verify live Supabase session & role before hydrating user/PRO state
  useEffect(() => {
    try {
      const cachedLanding = window.localStorage.getItem(
        "ruang_sosmed_landing_config_v5"
      );
      if (cachedLanding) {
        const parsedLanding = JSON.parse(cachedLanding);
        if (parsedLanding?.blocks?.length) {
          setLandingConfig(parsedLanding);
        }
      }
    } catch {}

    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(rawHash);
    const searchParams = new URLSearchParams(window.location.search);

    const authError =
      hashParams.get("error") || searchParams.get("error") || "";
    const authErrorCode =
      hashParams.get("error_code") || searchParams.get("error_code") || "";
    const authErrorDesc =
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      "";
    const callbackType =
      hashParams.get("type") || searchParams.get("type") || "";

    if (authError || authErrorCode) {
      window.history.replaceState(null, "", window.location.pathname);
      const isExpiredOrInvalid =
        authErrorCode === "otp_expired" ||
        authError === "access_denied" ||
        authErrorDesc.toLowerCase().includes("expired") ||
        authErrorDesc.toLowerCase().includes("invalid");
      setToastMessage(
        isExpiredOrInvalid
          ? "Link verifikasi email sudah kedaluwarsa atau sudah digunakan. Silakan masuk atau kirim ulang email verifikasi."
          : authErrorDesc ||
              "Verifikasi email gagal. Silakan coba masuk atau daftar ulang."
      );
      setAuthModalTab("login");
      setAuthModalOpen(true);
    }

    let hasPendingAuthCallback =
      !authError &&
      !authErrorCode &&
      (hashParams.has("access_token") ||
        searchParams.has("code") ||
        callbackType === "signup" ||
        callbackType === "email");
    const isSignupConfirm =
      callbackType === "signup" || callbackType === "email";

    const finalizeAuthCallback = () => {
      if (!hasPendingAuthCallback) return;
      hasPendingAuthCallback = false;
      if (isSignupConfirm) {
        setToastMessage(
          "Email berhasil dikonfirmasi! Selamat datang di Ruang Sosmed 2.0."
        );
      }
      if (
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=")
      ) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    const resolveUserWithDbRole = async (
      sessionUser: any
    ): Promise<{
      user: AuthenticatedUser;
      isPro: boolean;
      subMeta: ActiveSubMeta;
      profileExists: boolean;
      profileCheckError: boolean;
    }> => {
      const meta = sessionUser.user_metadata || {};
      const email = sessionUser.email || "";

      let dbRole: string | null = null;
      let dbFullName: string | null = null;
      let dbUsername: string | null = null;
      let dbAvatarUrl: string | null = null;
      let dbSubTier = "free";
      let dbProStartedAt: string | null = null;
      let dbProExpiresAt: string | null = null;
      let dbProPackageName: string | null = null;
      let dbProPackageId: string | null = null;
      let dbProBillingCycle: string | null = null;
      let profileExists = false;
      let profileCheckError = false;
      try {
        const fetchOwnProfile = async () => {
          if (pageProfilesHasSubDateCols) {
            const fullRes = await supabase
              .from("profiles")
              .select(
                "role, full_name, avatar_url, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, pro_package_id, pro_billing_cycle"
              )
              .eq("id", sessionUser.id)
              .maybeSingle();
            if (!fullRes.error) return fullRes;
            if (isMissingSubDateColumnError(fullRes.error)) {
              const midRes = await supabase
                .from("profiles")
                .select(
                  "role, full_name, avatar_url, subscription_tier, pro_expires_at"
                )
                .eq("id", sessionUser.id)
                .maybeSingle();
              if (!midRes.error) return midRes;
              if (isMissingSubDateColumnError(midRes.error)) {
                pageProfilesHasSubDateCols = false;
              }
            }
          }
          return supabase
            .from("profiles")
            .select("role, full_name, avatar_url, subscription_tier")
            .eq("id", sessionUser.id)
            .maybeSingle();
        };

        const [{ data: prof, error: profErr }, userProfRes] = await Promise.all([
          fetchOwnProfile(),
          email
            ? supabase
                .from("user_profiles")
                .select("username")
                .or(`user_id.eq.${sessionUser.id},email.ilike.${email}`)
                .limit(1)
            : Promise.resolve({ data: null }),
        ]);

        profileExists = Boolean(prof);
        profileCheckError = Boolean(profErr);

        const userProf =
          Array.isArray(userProfRes?.data) && userProfRes.data.length > 0
            ? userProfRes.data[0]
            : null;

        if (prof?.role) dbRole = String(prof.role).toLowerCase();
        if (prof?.full_name) dbFullName = prof.full_name;
        if (prof?.avatar_url) dbAvatarUrl = prof.avatar_url;
        if (prof?.subscription_tier) {
          dbSubTier = String(prof.subscription_tier).toLowerCase();
        }
        const profAny = prof as Record<string, unknown> | null | undefined;
        if (profAny?.pro_started_at) {
          dbProStartedAt = String(profAny.pro_started_at);
        }
        if (profAny?.pro_expires_at) {
          dbProExpiresAt = String(profAny.pro_expires_at);
        }
        if (profAny?.pro_package_name) {
          dbProPackageName = String(profAny.pro_package_name);
        }
        if (profAny?.pro_package_id) {
          dbProPackageId = String(profAny.pro_package_id);
        }
        if (profAny?.pro_billing_cycle) {
          dbProBillingCycle = String(profAny.pro_billing_cycle);
        }
        if (userProf?.username) dbUsername = userProf.username;
      } catch {
        profileCheckError = true;
      }

      const isUserAdmin = dbRole === "admin" || dbRole === "mentor";
      const role: "admin" | "learner" = isUserAdmin ? "admin" : "learner";
      const isPro = isUserAdmin || isProSubscriptionActive(dbSubTier, dbProExpiresAt);

      const resolvedName =
        dbFullName ||
        meta.full_name ||
        email.split("@")[0] ||
        "User";
      const derivedHandle =
        resolvedName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || undefined;
      const username = dbUsername || meta.username || derivedHandle;

      return {
        user: {
          name: resolvedName,
          email,
          role,
          username,
          avatarUrl: dbAvatarUrl || undefined,
        },
        isPro,
        subMeta: {
          startedAt: dbProStartedAt,
          expiresAt: dbProExpiresAt,
          packageName: dbProPackageName,
          packageId: dbProPackageId,
          billingCycle: dbProBillingCycle,
        },
        profileExists,
        profileCheckError,
      };
    };

    const isDeletedAuthErr = (err: unknown): boolean => {
      if (!err || typeof err !== "object") return false;
      const e = err as { status?: number; code?: string; message?: string };
      const msg = String(e.message || "").toLowerCase();
      const code = String(e.code || "").toLowerCase();
      return (
        e.status === 401 ||
        e.status === 403 ||
        code === "user_not_found" ||
        msg.includes("does not exist") ||
        msg.includes("user_not_found") ||
        msg.includes("user not found") ||
        msg.includes("sub claim") ||
        msg.includes("invalid jwt")
      );
    };

    const isDeletedProfileUser = (
      sessionUser: any,
      authedUser: AuthenticatedUser,
      profileExists: boolean,
      profileCheckError: boolean
    ): boolean => {
      if (profileCheckError || profileExists) return false;
      if (authedUser.role !== "learner") return false;
      const em = authedUser.email.toLowerCase();
      if (em.includes("dinur") || em === "admin@ruangsosmed.id") return false;
      const ageMs = sessionUser?.created_at
        ? Date.now() - Date.parse(String(sessionUser.created_at))
        : 999999;
      return ageMs > 15000;
    };

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const { error: liveUserErr } = await supabase.auth.getUser();
          if (isDeletedAuthErr(liveUserErr)) {
            await forceSignOutDeletedAccount();
            return;
          }

          const {
            user: authedUser,
            isPro,
            subMeta,
            profileExists,
            profileCheckError,
          } = await resolveUserWithDbRole(session.user);

          if (
            isDeletedProfileUser(
              session.user,
              authedUser,
              profileExists,
              profileCheckError
            )
          ) {
            await forceSignOutDeletedAccount();
            return;
          }

          deletedLogoutInFlightRef.current = false;
          setCurrentUser(authedUser);
          setActiveSubMeta(subMeta);
          setLearnerProStatus(isPro, authedUser);
          finalizeAuthCallback();
          try {
            window.localStorage.setItem(
              "ruang_sosmed_session_user_v1",
              JSON.stringify(authedUser)
            );
            const savedMode = window.localStorage.getItem("ruang_sosmed_role_mode_v1");
            if (authedUser.role === "admin") {
              setRoleMode(savedMode === "learner" ? "learner" : "admin");
            } else {
              setRoleMode("learner");
              window.localStorage.setItem("ruang_sosmed_role_mode_v1", "learner");
              registerLearnerProfile({
                name: authedUser.name,
                email: authedUser.email,
                role: authedUser.role,
              });
            }
          } catch {}
        } else {
          setCurrentUser(null);
          setActiveSubMeta(null);
          setLearnerProStatus(false);
          setRoleMode("learner");
          try {
            window.localStorage.removeItem("ruang_sosmed_session_user_v1");
            window.localStorage.removeItem("ruang_sosmed_role_mode_v1");
          } catch {}
        }
      })
      .finally(() => {
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const {
          user: authedUser,
          isPro,
          subMeta,
          profileExists,
          profileCheckError,
        } = await resolveUserWithDbRole(session.user);

        if (
          isDeletedProfileUser(
            session.user,
            authedUser,
            profileExists,
            profileCheckError
          )
        ) {
          await forceSignOutDeletedAccount();
          return;
        }

        deletedLogoutInFlightRef.current = false;
        setCurrentUser(authedUser);
        setActiveSubMeta(subMeta);
        setLearnerProStatus(isPro, authedUser);
        finalizeAuthCallback();
        if (authedUser.role !== "admin") {
          setRoleMode("learner");
          registerLearnerProfile({
            name: authedUser.name,
            email: authedUser.email,
            role: authedUser.role,
          });
        }
        try {
          window.localStorage.setItem(
            "ruang_sosmed_session_user_v1",
            JSON.stringify(authedUser)
          );
        } catch {}
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setActiveSubMeta(null);
        setLearnerProStatus(false);
        setRoleMode("learner");
        try {
          window.localStorage.removeItem("ruang_sosmed_session_user_v1");
          window.localStorage.removeItem("ruang_sosmed_role_mode_v1");
        } catch {}
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [forceSignOutDeletedAccount]);

  // Pengawas sesi aktif Learner: auto-logout seketika apabila akun dihapus oleh Admin
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser || currentUser.role !== "learner") {
      return;
    }
    const emailLower = currentUser.email.toLowerCase();
    if (emailLower.includes("dinur") || emailLower === "admin@ruangsosmed.id") {
      return;
    }

    let cancelled = false;
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const verifyLearnerStillActive = async () => {
      if (cancelled || deletedLogoutInFlightRef.current) return;
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const errObj = userErr as { status?: number; message?: string } | null;
        const msg = String(errObj?.message || "").toLowerCase();
        if (
          errObj &&
          (errObj.status === 401 ||
            errObj.status === 403 ||
            msg.includes("does not exist") ||
            msg.includes("user_not_found") ||
            msg.includes("sub claim") ||
            msg.includes("invalid jwt"))
        ) {
          await forceSignOutDeletedAccount();
          return;
        }
        const uid = userData?.user?.id;
        if (!uid) return;

        const createdAt = userData?.user?.created_at;
        const ageMs = createdAt
          ? Date.now() - Date.parse(String(createdAt))
          : 999999;
        const { data: profRow, error: profErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", uid)
          .maybeSingle();

        if (!profErr && !profRow && ageMs > 15000) {
          await forceSignOutDeletedAccount();
        }
      } catch {}
    };

    const handleAccountDeletedEvent = () => {
      void forceSignOutDeletedAccount();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void verifyLearnerStillActive();
      }
    };

    window.addEventListener("ruang_sosmed_account_deleted", handleAccountDeletedEvent);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void verifyLearnerStillActive();
      }
    }, 20_000);

    void supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (cancelled || !uid) return;
      activeChannel = supabase
        .channel(`learner-account-watch-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${uid}`,
          },
          () => {
            void forceSignOutDeletedAccount();
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("ruang_sosmed_account_deleted", handleAccountDeletedEvent);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [currentUser, forceSignOutDeletedAccount]);

  const handleLogout = async () => {
    try {
      window.localStorage.removeItem("ruang_sosmed_session_user_v1");
      window.localStorage.removeItem("ruang_sosmed_role_mode_v1");
    } catch {}
    await signOutUser();
    setCurrentUser(null);
    setLearnerProStatus(false);
    setRoleMode("learner");
    triggerToast("Berhasil keluar dari sesi akun.");
  };

  // Upgrade <input type="checkbox" switch> accessibility role safely under Turbopack
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !("switch" in HTMLInputElement.prototype)
    ) {
      document
        .querySelectorAll<HTMLInputElement>('input[type="checkbox"][switch]')
        .forEach((input) => {
          if (!input.hasAttribute("role")) {
            input.setAttribute("role", "switch");
          }
        });
    }
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl + K to toggle Global Search Modal, Esc to dismiss toast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setToastMessage(null);
        setSearchModalOpen(false);
        setCreateModalOpen(false);
        setUpgradeModalOpen(false);
        setAuthModalOpen(false);
        setGradingQuiz(null);
        setAssigningItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keep safe display fields in sync when user updates profile in UserProfileScreen (never override role from localStorage)
  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const raw = window.localStorage.getItem("ruang_sosmed_session_user_v1");
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.name) {
            setCurrentUser((prev) =>
              prev
                ? {
                    ...prev,
                    name: u.name,
                    avatarUrl: u.avatarUrl ?? prev.avatarUrl,
                    username: u.username ?? prev.username,
                  }
                : prev
            );
          }
        }
      } catch {}
    };
    window.addEventListener("ruang_sosmed_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("ruang_sosmed_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  // Event-driven cross-browser role & PRO subscription sync: Supabase Realtime + visibility/focus check (5s cooldown)
  useEffect(() => {
    if (!currentUser?.email) return;

    let cancelled = false;
    let lastCheckedAt = Date.now();
    let roleChannel: ReturnType<typeof supabase.channel> | null = null;

    const applyDbProfileSnapshot = (raw?: Record<string, unknown> | null) => {
      if (!raw || cancelled) return;

      let activeUser: AuthenticatedUser = currentUser;
      const rawRole = raw.role ? String(raw.role) : null;
      if (rawRole) {
        const dbRole = rawRole.toLowerCase();
        const nextRole: "admin" | "learner" =
          dbRole === "admin" || dbRole === "mentor" ? "admin" : "learner";

        if (currentUser.role !== nextRole) {
          const updated: AuthenticatedUser = {
            ...currentUser,
            role: nextRole,
          };
          activeUser = updated;
          setCurrentUser(updated);
          setRoleMode(nextRole);
          try {
            window.localStorage.setItem(
              "ruang_sosmed_session_user_v1",
              JSON.stringify(updated)
            );
            window.localStorage.setItem("ruang_sosmed_role_mode_v1", nextRole);
          } catch {}
          window.dispatchEvent(new Event("ruang_sosmed_role_mode_changed"));
          triggerToast(
            nextRole === "admin"
              ? "🎉 Hak akses Admin Studio telah disinkronkan dari database!"
              : "ℹ️ Status akun disinkronkan ke Siswa Learner dari database."
          );
        }
      }

      const subTier = raw.subscription_tier
        ? String(raw.subscription_tier).toLowerCase()
        : undefined;
      const startedAt = raw.pro_started_at ? String(raw.pro_started_at) : null;
      const expiresAt = raw.pro_expires_at ? String(raw.pro_expires_at) : null;
      const packageName = raw.pro_package_name
        ? String(raw.pro_package_name)
        : null;
      const packageId = raw.pro_package_id ? String(raw.pro_package_id) : null;
      const billingCycle = raw.pro_billing_cycle
        ? String(raw.pro_billing_cycle)
        : null;

      if (
        subTier !== undefined ||
        raw.pro_started_at !== undefined ||
        raw.pro_expires_at !== undefined ||
        raw.pro_package_name !== undefined ||
        raw.pro_package_id !== undefined ||
        raw.pro_billing_cycle !== undefined
      ) {
        const isUserAdmin = activeUser.role === "admin";
        const nextIsPro =
          isUserAdmin || isProSubscriptionActive(subTier, expiresAt);

        setActiveSubMeta({
          startedAt,
          expiresAt,
          packageName,
          packageId,
          billingCycle,
        });
        setLearnerProStatus(nextIsPro, activeUser);
        window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));

        if (!isUserAdmin) {
          if (!nextIsPro) {
            clearWelcomeProSeenForUser(activeUser);
          } else {
            triggerWelcomeProIfUnseen({
              user: activeUser,
              packageId,
              packageName,
              billingCycle,
              startedAt,
              expiresAt,
            });
          }
        }
      }
    };

    const checkOwnProfileOnce = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (Date.now() - lastCheckedAt < 5_000) return;
      lastCheckedAt = Date.now();
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (!uid || cancelled) return;

        let profData: Record<string, unknown> | null = null;
        if (pageProfilesHasSubDateCols) {
          const fullRes = await supabase
            .from("profiles")
            .select(
              "role, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, pro_package_id, pro_billing_cycle"
            )
            .eq("id", uid)
            .maybeSingle();
          if (!fullRes.error) {
            profData = (fullRes.data as Record<string, unknown> | null) ?? null;
          } else if (isMissingSubDateColumnError(fullRes.error)) {
            const midRes = await supabase
              .from("profiles")
              .select(
                "role, subscription_tier, pro_started_at, pro_expires_at, pro_package_name"
              )
              .eq("id", uid)
              .maybeSingle();
            if (!midRes.error) {
              profData =
                (midRes.data as Record<string, unknown> | null) ?? null;
            }
          }
        }
        if (!profData) {
          const fallbackRes = await supabase
            .from("profiles")
            .select("role, subscription_tier")
            .eq("id", uid)
            .maybeSingle();
          profData =
            (fallbackRes.data as Record<string, unknown> | null) ?? null;
        }
        applyDbProfileSnapshot(profData);
      } catch {}
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const uid = session?.user?.id;
        if (!uid || cancelled) return;
        roleChannel = supabase
          .channel(`profile-role-sync-${uid}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${uid}`,
            },
            (payload) => {
              applyDbProfileSnapshot(
                (payload.new as Record<string, unknown> | undefined) ?? null
              );
            }
          )
          .subscribe();
      })
      .catch(() => {});

    window.addEventListener("focus", checkOwnProfileOnce);
    document.addEventListener("visibilitychange", checkOwnProfileOnce);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", checkOwnProfileOnce);
      document.removeEventListener("visibilitychange", checkOwnProfileOnce);
      if (roleChannel) {
        void supabase.removeChannel(roleChannel);
      }
    };
  }, [
    currentUser,
    clearWelcomeProSeenForUser,
    triggerWelcomeProIfUnseen,
    setLearnerProStatus,
  ]);

  // Listen to immediate PRO activation event emitted by RuangSosmedStore sync
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser || isCurrentUserAdmin) {
      return;
    }
    const handleProActivatedEvent = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          learnerName?: string;
          learnerEmail?: string;
          planName?: string | null;
          packageId?: string | null;
          billingCycle?: string | null;
          startedAt?: string | null;
          expiresAt?: string | null;
        }>
      ).detail;
      if (!detail) return;
      const myEmail = (currentUser.email || "").trim().toLowerCase();
      const eventEmail = String(detail.learnerEmail || "").trim().toLowerCase();
      if (eventEmail && myEmail && eventEmail !== myEmail) return;

      const meta: ActiveSubMeta = {
        startedAt: detail.startedAt ?? null,
        expiresAt: detail.expiresAt ?? null,
        packageName: detail.planName ?? null,
        packageId: detail.packageId ?? null,
        billingCycle: detail.billingCycle ?? null,
      };
      setActiveSubMeta(meta);
      triggerWelcomeProIfUnseen({
        user: currentUser,
        packageId: meta.packageId,
        packageName: meta.packageName,
        billingCycle: meta.billingCycle,
        startedAt: meta.startedAt,
        expiresAt: meta.expiresAt,
      });
    };

    window.addEventListener("ruang_sosmed_pro_activated", handleProActivatedEvent);
    return () => {
      window.removeEventListener(
        "ruang_sosmed_pro_activated",
        handleProActivatedEvent
      );
    };
  }, [currentUser, isCurrentUserAdmin, triggerWelcomeProIfUnseen]);

  // Automatic celebratory Welcome PRO modal when a learner's account activates PRO / paid Basic
  useEffect(() => {
    if (typeof window === "undefined" || !authReady || !currentUser) {
      return;
    }
    if (isCurrentUserAdmin) {
      return;
    }
    if (!learnerIsPro || learnerAccess.tierKind === "free") {
      clearWelcomeProSeenForUser(currentUser);
      return;
    }
    if (roleMode !== "learner") {
      return;
    }

    triggerWelcomeProIfUnseen({
      user: currentUser,
      tierKind: learnerAccess.tierKind === "basic" ? "basic" : "pro",
      packageId: activeSubMeta?.packageId ?? learnerPackageId,
      packageName:
        activeSubMeta?.packageName ||
        learnerAccess.activePackage?.name ||
        learnerPackageName,
      billingCycle: activeSubMeta?.billingCycle ?? learnerAccess.billingCycle,
      startedAt: activeSubMeta?.startedAt ?? null,
      expiresAt: activeSubMeta?.expiresAt ?? null,
    });
  }, [
    authReady,
    currentUser,
    roleMode,
    learnerIsPro,
    learnerAccess.tierKind,
    learnerAccess.activePackage?.name,
    learnerAccess.billingCycle,
    learnerPackageId,
    learnerPackageName,
    activeSubMeta,
    isCurrentUserAdmin,
    adminPreviewTierOverride,
    clearWelcomeProSeenForUser,
    triggerWelcomeProIfUnseen,
  ]);

  // Browser Console test hook for previewing the Welcome PRO modal without altering DB
  useEffect(() => {
    if (typeof window === "undefined") return;

    const openPreview = (opts?: Partial<WelcomeProModalData>) => {
      const tierKind = opts?.tierKind === "basic" ? "basic" : "pro";
      setWelcomeProModalData({
        learnerName:
          opts?.learnerName ||
          currentUser?.name ||
          currentUser?.username ||
          "Dede",
        planName:
          opts?.planName ||
          (tierKind === "basic"
            ? "Creator Academy Basic"
            : "Ruang Sosmed Learning PRO"),
        tierKind,
        billingCycle: opts?.billingCycle ?? "30d",
        expiresAt: opts?.expiresAt ?? null,
        isPreview: opts?.isPreview ?? true,
      });
    };

    const handlePreviewEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<WelcomeProModalData> | undefined>;
      openPreview(customEvent.detail);
    };

    const win = window as unknown as Record<string, unknown>;
    win.testWelcomeProModal = (opts?: Partial<WelcomeProModalData>) => {
      openPreview(opts);
      return "🎉 Welcome PRO modal dibuka!";
    };
    win.resetWelcomeProSeen = () => {
      let cleared = 0;
      try {
        Object.keys(window.localStorage).forEach((k) => {
          if (k.startsWith("rs_welcome_pro_seen_v1::")) {
            window.localStorage.removeItem(k);
            cleared += 1;
          }
        });
      } catch {}
      return `Reset ${cleared} key status Welcome PRO.`;
    };

    window.addEventListener(WELCOME_PRO_PREVIEW_EVENT, handlePreviewEvent);
    return () => {
      window.removeEventListener(WELCOME_PRO_PREVIEW_EVENT, handlePreviewEvent);
      delete win.testWelcomeProModal;
      delete win.resetWelcomeProSeen;
    };
  }, [currentUser]);

  // Listen to cross-tab / live broadcast notifications & same-browser PRO subscription updates
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const bc = new BroadcastChannel("ruang_sosmed_channel");
      bc.onmessage = (event) => {
        if (event.data?.type === "INVITATION_BROADCAST") {
          triggerToast(
            `🔔 Undangan Baru: Anda diundang sebagai ${event.data.role} pada cohort "${event.data.cohort}"!`
          );
        } else if (
          event.data?.type === "SUBSCRIPTION_UPDATED" &&
          currentUser
        ) {
          const myEmail = (currentUser.email || "").trim().toLowerCase();
          const myName = (currentUser.name || "").trim().toLowerCase();
          const targetEmail = String(event.data.email || "")
            .trim()
            .toLowerCase();
          const targetName = String(event.data.name || "")
            .trim()
            .toLowerCase();
          const matched =
            (myEmail && targetEmail && myEmail === targetEmail) ||
            (!targetEmail && myName && targetName && myName === targetName);
          if (!matched) return;

          const isNextPro = event.data.tier === "PRO";
          const nextMeta: ActiveSubMeta = {
            startedAt: event.data.startedAt ?? null,
            expiresAt: event.data.expiresAt ?? null,
            packageName: event.data.packageName ?? null,
            packageId: event.data.packageId ?? null,
            billingCycle: event.data.billingCycle ?? null,
          };
          setActiveSubMeta(nextMeta);
          setLearnerProStatus(isNextPro, currentUser);
          window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));

          if (!isCurrentUserAdmin) {
            if (isNextPro) {
              triggerWelcomeProIfUnseen({
                user: currentUser,
                packageId: nextMeta.packageId,
                packageName: nextMeta.packageName,
                billingCycle: nextMeta.billingCycle,
                startedAt: nextMeta.startedAt,
                expiresAt: nextMeta.expiresAt,
              });
            } else {
              clearWelcomeProSeenForUser(currentUser);
            }
          }
        }
      };
      return () => {
        bc.close();
      };
    } catch {
      // Ignore
    }
  }, [
    currentUser,
    isCurrentUserAdmin,
    setLearnerProStatus,
    clearWelcomeProSeenForUser,
    triggerWelcomeProIfUnseen,
  ]);

  // Auto-dismiss toast notifications after 4.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage, toastSeq]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      authReady &&
      !currentUser &&
      new URLSearchParams(window.location.search).get("admin") === "1"
    ) {
      setAuthModalTab("login");
      setAuthModalOpen(true);
    }
  }, [authReady, currentUser]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setToastSeq((prev) => prev + 1);
  };

  // Automatically make Secondary Sidebar visible when "Learning Content" or "Archive" is selected, while preserving user's collapse/expand state across other screens
  const handleSelectNav = (id: AdminNavId) => {
    setActiveNav(id);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ruang_sosmed_admin_active_nav_v1", id);
      } catch {}
    }
    setAuthoringMode(null);
    if (id === "content") {
      setSecondarySidebarOpen(true);
      setSelectedContentDetailId(null);
      setShowProjectHub(true);
    } else if (id === "archive") {
      setActiveSubNav("archived");
      setSecondarySidebarOpen(true);
      setSelectedContentDetailId(null);
      setShowProjectHub(false);
    } else if (id === "profile") {
      setSecondarySidebarOpen(false);
      setSelectedContentDetailId(null);
    } else {
      setSelectedContentDetailId(null);
    }
  };

  const [activeFolderForCreation, setActiveFolderForCreation] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return (
          window.localStorage.getItem("ruang_sosmed_admin_current_folder_v1") ||
          null
        );
      } catch {}
    }
    return null;
  });

  // Trigger dedicated Phase 3 & Phase 4 builders when Course, Page, Quiz, Learning Path, or Wiki is selected
  const handleTriggerContentCreation = (
    defaultType: ExplorerItemType = "Course",
    targetFolder?: string
  ) => {
    setActiveFolderForCreation(targetFolder || null);
    if (targetFolder && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_admin_current_folder_v1",
          targetFolder
        );
        setShowProjectHub(false);
      } catch {}
    }
    if (defaultType === "Folder") {
      return;
    }
    if (defaultType === "Quiz") {
      setAuthoringMode({
        kind: "quiz-builder",
        title: targetFolder
          ? `${targetFolder} — Quiz Assessment`
          : "Social Media Analytics & Campaign Fundamentals",
      });
      return;
    }
    if (defaultType === "Learning Path") {
      setAuthoringMode({ kind: "learning-path" });
      return;
    }
    if (defaultType === "Wiki") {
      setAuthoringMode({
        kind: "wiki",
        title: targetFolder
          ? `${targetFolder} — SOP & Guidelines`
          : "Ruang Sosmed 2.0 Student Resource & SOP Directory",
      });
      return;
    }
    if (defaultType === "Course" || defaultType === "Page") {
      const draftSessionId = `draft-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      setAuthoringMode({
        kind: "course-page",
        contentType: defaultType,
        folderName: targetFolder || undefined,
        title: "",
        isNew: true,
        draftSessionId,
      });
      return;
    }
    setCreateModalType(defaultType as ContentType);
    setCreateModalOpen(true);
  };

  const handleEditExplorerItem = (item: ExplorerContentItem) => {
    if (item.type === "Quiz") {
      setAuthoringMode({ kind: "quiz-builder", title: item.title });
      return;
    }
    if (item.type === "Assignment") {
      setAuthoringMode({
        kind: "grading-center",
        submissionTitle: item.title,
      });
      return;
    }
    if (item.type === "Learning Path") {
      setAuthoringMode({ kind: "learning-path" });
      return;
    }
    if (item.type === "Wiki") {
      setAuthoringMode({ kind: "wiki", title: item.title, item });
      return;
    }
    if (item.folderName && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_admin_current_folder_v1",
          item.folderName
        );
      } catch {}
    }
    if (item.folderName) {
      setShowProjectHub(false);
    }
    if (item.type === "Course" || item.type === "Page") {
      setAuthoringMode({
        kind: "course-page",
        contentType: item.type,
        folderName: item.folderName,
        title: item.title,
        isNew: false,
        draftSessionId: item.id,
      });
      return;
    }
    triggerToast(`Opened Studio Editor for "${item.title}" (${item.type}).`);
  };

  // WORKFLOW 1: Content Creation -> Admin Explorer & Learner Portal Catalog Sync
  const handleCreatedContent = (
    type: ContentType,
    title: string,
    description?: string,
    urgency?: "Urgent" | "Not Urgent",
    sections?: CourseSectionAccordion[],
    folderNameOverride?: string
  ) => {
    const resolvedFolder =
      folderNameOverride || activeFolderForCreation || undefined;
    publishContentToStudioAndCatalog(
      type,
      title,
      description,
      urgency,
      sections,
      activeProject,
      resolvedFolder
    );
    triggerToast(
      resolvedFolder
        ? `Published ${type}: "${title}" di dalam folder "${resolvedFolder}"!`
        : `Published ${type}: "${title}" — ditambahkan ke cohort "${activeProject}"!`
    );
    setActiveFolderForCreation(null);
  };

  const handleDuplicateItem = (item: ExplorerContentItem) => {
    duplicateExplorerItem(item);
    triggerToast(`Duplicated "${item.title}".`);
  };

  const handleDeleteItem = (id: string) => {
    const target = explorerItems.find((i) => i.id === id);
    deleteExplorerItem(id);
    if (target) {
      triggerToast(`Deleted "${target.title}".`);
    }
  };

  const handleOpenFavoriteDetail = (title: string, _type: ExplorerItemType) => {
    setAuthoringMode(null);
    const existing = explorerItems.find(
      (i) => i.title.toLowerCase() === title.toLowerCase()
    );
    if (existing) {
      setSelectedContentDetailId(existing.id);
    } else if (explorerItems[0]) {
      setSelectedContentDetailId(explorerItems[0].id);
    }
  };

  const handleGradeSubmit = (
    quizId: string,
    score: number,
    feedback: string
  ) => {
    quickGradeDashboardQuiz(quizId, score, feedback);
    const target = quizzes.find((q) => q.id === quizId);
    if (target) {
      triggerToast(
        `Graded "${target.title}" for ${target.learner.name} (${score}%) — Certificate & Gauge updated!`
      );
    }
  };

  // WORKFLOW 2: Assigning Learners Flow -> Syncs to Learner's Assigned to You & My Learning (0% Not Started)
  const handleAssignSubmit = (
    assignedNames: string[],
    dueDate: string,
    batchMode: string
  ) => {
    if (assigningItem) {
      assignContentToLearners(assigningItem, assignedNames, dueDate, batchMode);
      if (typeof window !== "undefined") {
        try {
          assignedNames.forEach((targetName) => {
            const key = targetName.toLowerCase().trim();
            const existingRaw = window.localStorage.getItem(`ruang_sosmed_user_assignments_${key}`);
            const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];
            if (!existing.includes(assigningItem.id)) {
              existing.push(assigningItem.id);
            }
            window.localStorage.setItem(`ruang_sosmed_user_assignments_${key}`, JSON.stringify(existing));
          });
        } catch {}
      }
    }
  };

  // 1. Preview Landing Page Mode (from Admin Builder or Studio)
  if (previewPublicLanding) {
    return (
      <div className="relative">
        <div className="fixed top-3 right-4 z-50">
          <button
            type="button"
            onClick={() => setPreviewPublicLanding(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#121215] text-white px-4 py-2 text-xs font-bold shadow-2xl hover:bg-[#27272A] cursor-pointer"
          >
            <span>✕ Tutup Preview &amp; Kembali ke Builder</span>
          </button>
        </div>
        <PublicLandingView
          blocks={landingConfig.blocks}
          config={landingConfig}
          onOpenAuth={(tab) => {
            setPreviewPublicLanding(false);
            handleOpenAuth(tab || "login");
          }}
        />
      </div>
    );
  }

  // Wait until client auth check finishes so Landing Page never flashes/glitches on refresh
  if (!authReady) {
    return <div className="min-h-screen bg-[#F8F9FB]" />;
  }

  const welcomeProModalNode = (
    <WelcomeProModal
      open={Boolean(welcomeProModalData)}
      data={welcomeProModalData}
      onClose={() => setWelcomeProModalData(null)}
      onStartLearning={() => {
        setWelcomeProModalData(null);
        if (roleMode !== "learner") {
          setRoleMode("learner");
        }
      }}
    />
  );

  const toastBannerNode = toastMessage ? (
    <div
      key={toastSeq}
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 z-[70] rs-top-toast-banner flex items-center gap-2.5 max-w-[min(92vw,540px)] rounded-xl bg-[#121215] px-4 py-3 text-xs font-medium text-white shadow-[0_14px_36px_rgba(16,15,17,0.24)] border border-white/10"
    >
      <CheckCircle2 size={15} className="text-[#10B981] shrink-0" />
      <span>{toastMessage}</span>
      <button
        type="button"
        onClick={() => setToastMessage(null)}
        aria-label="Dismiss notification"
        className="ml-1 text-white/60 hover:text-white cursor-pointer"
      >
        <X size={13} />
      </button>
    </div>
  ) : null;

  // 2. Public Visitor & Under Construction Gate (When not logged in, or when Under Construction blocks non-Admin)
  if (
    !currentUser ||
    (maintenanceConfig?.enabled && !isCurrentUserAdmin)
  ) {
    return (
      <>
        {maintenanceConfig?.enabled ? (
          <UnderConstructionView
            config={maintenanceConfig}
            onOpenAdminLogin={() => handleOpenAuth("login")}
          />
        ) : (
          <PublicLandingView
            blocks={landingConfig.blocks}
            config={landingConfig}
            onOpenAuth={(tab) => handleOpenAuth(tab || "login")}
          />
        )}

        <AuthModal
          open={authModalOpen}
          initialTab={authModalTab}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setRoleMode(user.role);
            registerLearnerProfile({
              name: user.name,
              email: user.email,
              role: user.role,
            });
            try {
              window.localStorage.setItem(
                "ruang_sosmed_session_user_v1",
                JSON.stringify(user)
              );
              window.localStorage.setItem(
                "ruang_sosmed_role_mode_v1",
                user.role
              );
            } catch {}
          }}
          onShowToast={triggerToast}
        />

        {welcomeProModalNode}

        {toastBannerNode}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#121215]">
      {/* Global Role Switcher (Always visible for Admin/Mentor Studio users even when previewing Learner Portal) */}
      {(roleMode !== "learner" || isCurrentUserAdmin) && (
        <GlobalRoleSwitcher
          mode={roleMode}
          onChange={handleRoleModeChange}
          onOpenSearch={() => setSearchModalOpen(true)}
          sidebarOpen={secondarySidebarOpen && !authoringMode}
          onToggleSidebar={() => setSecondarySidebarOpen((prev) => !prev)}
          currentUser={currentUser}
          onOpenAuth={() => handleOpenAuth("login")}
          onLogout={handleLogout}
          onNavigateLearners={() => {
            handleRoleModeChange("admin");
            handleSelectNav("learners");
          }}
          leftOffsetClass={roleMode === "admin" ? "pl-0 md:pl-[56px]" : ""}
        />
      )}

      {roleMode === "learner" ? (
        <LearnerPortalView
          currentUser={currentUser}
          proExpiresAt={activeSubMeta?.expiresAt}
          onOpenUpgradeModal={() => {
            setUpgradePreselectedPackageId(undefined);
            setUpgradeInitialCycle(undefined);
            setUpgradeModalStep("overview");
            setUpgradeModalOpen(true);
          }}
          onStartUpgradePayment={(opts) => {
            setUpgradePreselectedPackageId(opts?.packageId);
            setUpgradeInitialCycle(opts?.billingCycle);
            setUpgradeModalStep("payment");
            setUpgradeModalOpen(true);
          }}
          onShowToast={triggerToast}
          onLogout={handleLogout}
        />
      ) : (
        <div className="flex min-h-[calc(100vh-2.5rem)]">
          {/* Admin Left Icon Rail (Fixed 56px width) + Contextual Secondary Sidebar (240px width) */}
          <AdminLeftRail
            activeNav={activeNav}
            onSelectNav={handleSelectNav}
            secondarySidebarOpen={
              secondarySidebarOpen && !authoringMode && !selectedContentDetail
            }
            onToggleSecondarySidebar={() =>
              setSecondarySidebarOpen((prev) => !prev)
            }
            onOpenSearchModal={() => setSearchModalOpen(true)}
            onOpenCreateModal={handleTriggerContentCreation}
            onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
            onShowToast={triggerToast}
            onOpenContentDetail={handleOpenFavoriteDetail}
            activeProject={activeProject}
            onSelectProject={(projectName) => {
              setActiveProject(projectName);
              setActiveSubNav("recents");
              setShowProjectHub(false);
              setSelectedContentDetailId(null);
              setAuthoringMode(null);
            }}
            activeSubNav={activeSubNav}
            showProjectHub={showProjectHub && activeNav === "content"}
            onOpenProjectHub={() => {
              setActiveNav("content");
              setActiveSubNav("recents");
              setShowProjectHub(true);
              setSelectedContentDetailId(null);
              setAuthoringMode(null);
              if (typeof window !== "undefined") {
                try {
                  window.localStorage.setItem(
                    "ruang_sosmed_admin_active_nav_v1",
                    "content"
                  );
                  window.localStorage.setItem(
                    "ruang_sosmed_admin_active_sub_nav_v1",
                    "recents"
                  );
                  window.localStorage.setItem(
                    "ruang_sosmed_admin_show_project_hub_v1",
                    "true"
                  );
                  window.localStorage.removeItem(
                    "ruang_sosmed_admin_current_folder_v1"
                  );
                } catch {}
              }
            }}
            onSelectSubNav={(subId) => {
              setActiveNav("content");
              if (typeof window !== "undefined") {
                try {
                  window.localStorage.setItem(
                    "ruang_sosmed_admin_active_nav_v1",
                    "content"
                  );
                  if (subId !== "recents") {
                    window.localStorage.removeItem(
                      "ruang_sosmed_admin_current_folder_v1"
                    );
                  }
                } catch {}
              }
              setActiveSubNav(subId);
              setShowProjectHub(false);
              setSelectedContentDetailId(null);
              setAuthoringMode(null);
            }}
            currentUser={currentUser}
            onOpenAuth={() => handleOpenAuth("login")}
          />

          {/* Main Workspace Canvas (#F8F9FB) */}
          <main
            className={`min-w-0 flex-1 pl-0 md:pl-[56px] transition-[padding] duration-150 ease-out ${
              (activeNav === "content" || activeNav === "archive") &&
              secondarySidebarOpen &&
              !authoringMode &&
              !selectedContentDetail
                ? "pb-32 md:pb-24"
                : "pb-20 md:pb-0"
            }`}
          >
            <div
              key={`${authoringMode?.kind || "none"}-${selectedContentDetail?.id || "list"}-${activeNav}-${activeSubNav}-${activeProject}-${showProjectHub ? "hub" : "proj"}`}
              className="page-transition-enter"
            >
            {/* PHASE 3 & PHASE 4 AUTHORING & GRADING STUDIO VIEWS */}
            {authoringMode?.kind === "quiz-builder" ? (
              <ModularQuizBuilder
                initialTitle={authoringMode.title}
                onBack={() => setAuthoringMode(null)}
                onPublishQuiz={(title) => {
                  handleCreatedContent("Quiz", title);
                  setAuthoringMode(null);
                  setActiveNav("content");
                  setSecondarySidebarOpen(true);
                }}
                onShowToast={triggerToast}
              />
            ) : authoringMode?.kind === "grading-center" ? (
              <TrainerGradingCenter
                initialSubmissionTitle={authoringMode.submissionTitle}
                onBack={() => {
                  setAuthoringMode(null);
                  setActiveNav("home");
                }}
                onShowToast={triggerToast}
              />
            ) : authoringMode?.kind === "course-page" ? (
              <CoursePageEditor
                key={authoringMode.draftSessionId || authoringMode.title || "course-editor"}
                initialTitle={authoringMode.title}
                contentType={authoringMode.contentType}
                isNew={Boolean(authoringMode.isNew)}
                draftSessionId={authoringMode.draftSessionId}
                folderName={authoringMode.folderName}
                initialSections={
                  authoringMode.isNew
                    ? undefined
                    : getCourseCurriculum(authoringMode.title) || undefined
                }
                onBack={() => {
                  const resolvedFolder =
                    authoringMode.folderName ||
                    activeFolderForCreation ||
                    explorerItems.find(
                      (i) =>
                        i.title.trim().toLowerCase() ===
                        (authoringMode.title || "").trim().toLowerCase()
                    )?.folderName;
                  if (resolvedFolder && typeof window !== "undefined") {
                    try {
                      window.localStorage.setItem(
                        "ruang_sosmed_admin_current_folder_v1",
                        resolvedFolder
                      );
                    } catch {}
                  }
                  setSelectedContentDetailId(null);
                  setShowProjectHub(false);
                  setAuthoringMode(null);
                }}
                onPublish={(title, type, sections, desc) => {
                  const resolvedFolder =
                    authoringMode.folderName ||
                    activeFolderForCreation ||
                    explorerItems.find(
                      (i) =>
                        i.title.trim().toLowerCase() ===
                        (authoringMode.title || title || "").trim().toLowerCase()
                    )?.folderName;
                  if (resolvedFolder && typeof window !== "undefined") {
                    try {
                      window.localStorage.setItem(
                        "ruang_sosmed_admin_current_folder_v1",
                        resolvedFolder
                      );
                    } catch {}
                  }
                  handleCreatedContent(
                    type,
                    title,
                    desc,
                    "Not Urgent",
                    sections,
                    resolvedFolder
                  );
                  setSelectedContentDetailId(null);
                  setShowProjectHub(false);
                  setAuthoringMode(null);
                  setActiveNav("content");
                  if (typeof window !== "undefined") {
                    try {
                      window.localStorage.setItem(
                        "ruang_sosmed_admin_active_nav_v1",
                        "content"
                      );
                    } catch {}
                  }
                  setSecondarySidebarOpen(true);
                }}
                onShowToast={triggerToast}
              />
            ) : authoringMode?.kind === "learning-path" ? (
              <LearningPathBuilder
                onBack={() => setAuthoringMode(null)}
                onPublishPath={(title, desc, urgency) => {
                  handleCreatedContent("Learning Path", title, desc, urgency);
                  setAuthoringMode(null);
                  setActiveNav("content");
                  setSecondarySidebarOpen(true);
                }}
                onShowToast={triggerToast}
              />
            ) : authoringMode?.kind === "wiki" ? (
              <WikiBuilder
                initialTitle={authoringMode.title}
                initialItem={authoringMode.item ?? null}
                onBack={() => setAuthoringMode(null)}
                onPublishWiki={(payload) => {
                  const targetFolder =
                    activeFolderForCreation ||
                    authoringMode.item?.folderName ||
                    undefined;
                  publishContentToStudioAndCatalog(
                    "Wiki",
                    payload.title,
                    payload.description,
                    "Not Urgent",
                    undefined,
                    activeProject,
                    targetFolder,
                    undefined,
                    undefined,
                    {
                      category: payload.category,
                      wikiSections: payload.sections,
                      wikiAttachments: payload.attachments,
                      wikiReadTime: payload.readTime,
                    }
                  );
                  triggerToast(
                    `Artikel Wiki "${payload.title}" dipublikasikan & tampil di Tab Wiki Admin serta Portal Siswa (Wiki & Catalog)!`
                  );
                  setActiveFolderForCreation(null);
                  setAuthoringMode(null);
                  setSelectedContentDetailId(null);
                  setActiveNav("content");
                  setActiveSubNav("wiki");
                  setShowProjectHub(false);
                  setSecondarySidebarOpen(true);
                }}
                onShowToast={triggerToast}
              />
            ) : activeNav === "content" || activeNav === "archive" ? (
              selectedContentDetail ? (
                selectedContentDetail.type === "Wiki" ? (
                  <WikiArticleReader
                    itemId={selectedContentDetail.id}
                    title={selectedContentDetail.title}
                    category={selectedContentDetail.category}
                    description={selectedContentDetail.description}
                    editedDate={selectedContentDetail.editedDate}
                    sections={selectedContentDetail.wikiSections}
                    attachments={selectedContentDetail.wikiAttachments}
                    readTime={selectedContentDetail.wikiReadTime}
                    isAdmin={true}
                    onBack={() => setSelectedContentDetailId(null)}
                    onEdit={() => {
                      const target = selectedContentDetail;
                      setSelectedContentDetailId(null);
                      handleEditExplorerItem(target);
                    }}
                    onAssign={() => setAssigningItem(selectedContentDetail)}
                    onDelete={() => {
                      handleDeleteItem(selectedContentDetail.id);
                      setSelectedContentDetailId(null);
                    }}
                    onShowToast={triggerToast}
                  />
                ) : (
                  <ContentDetailView
                    item={selectedContentDetail}
                    onBackToExplorer={() => setSelectedContentDetailId(null)}
                    onOpenAssignModal={(item) => setAssigningItem(item)}
                    onEditContent={handleEditExplorerItem}
                    onShowToast={triggerToast}
                  />
                )
              ) : (
                <LearningContentExplorer
                  items={explorerItems}
                  onSelectContentItem={(item) =>
                    setSelectedContentDetailId(item.id)
                  }
                  onEditContentItem={handleEditExplorerItem}
                  onCreateNewContent={handleTriggerContentCreation}
                  onDuplicateItem={handleDuplicateItem}
                  onDeleteItem={handleDeleteItem}
                  onOpenAssignModal={(item) => setAssigningItem(item)}
                  onShowToast={triggerToast}
                  activeProjectName={activeProject}
                  activeSubView={
                    activeNav === "archive" ? "archived" : activeSubNav
                  }
                  showProjectPicker={showProjectHub && activeNav === "content"}
                  onSelectProject={(projectName) => {
                    setActiveProject(projectName);
                    setActiveSubNav("recents");
                    setShowProjectHub(false);
                  }}
                  onBackToProjects={() => {
                    if (typeof window !== "undefined") {
                      try {
                        window.localStorage.removeItem(
                          "ruang_sosmed_admin_current_folder_v1"
                        );
                      } catch {}
                    }
                    setShowProjectHub(true);
                  }}
                />
              )
            ) : activeNav === "landing-builder" ? (
              <LandingPageBuilder
                initialConfig={landingConfig}
                onSave={handleSaveLandingConfig}
                onExit={() => setActiveNav("home")}
                onPreviewPublic={() => setPreviewPublicLanding(true)}
                onShowToast={triggerToast}
              />
            ) : activeNav === "analytics" ? (
              <AdminAnalyticsScreen
                onOpenGradingCenter={() =>
                  setAuthoringMode({ kind: "grading-center" })
                }
                onShowToast={triggerToast}
                onOpenCertificateStudio={() => setActiveNav("certificates")}
              />
            ) : activeNav === "learners" ? (
              <AdminLearnersDirectory
                currentUser={currentUser}
                onUpdateCurrentUserRole={(newRole) => {
                  if (currentUser) {
                    const updated: AuthenticatedUser = {
                      ...currentUser,
                      role: newRole === "Learner" ? "learner" : "admin",
                    };
                    setCurrentUser(updated);
                    try {
                      window.localStorage.setItem(
                        "ruang_sosmed_session_user_v1",
                        JSON.stringify(updated)
                      );
                    } catch {}
                    if (newRole === "Learner") {
                      setRoleMode("learner");
                      try {
                        window.localStorage.setItem("ruang_sosmed_role_mode_v1", "learner");
                      } catch {}
                    }
                  }
                }}
                onShowToast={triggerToast}
                onOpenCertificateStudio={() => setActiveNav("certificates")}
              />
            ) : activeNav === "inbox" ? (
              <AdminMentorInbox
                currentUser={currentUser}
                onShowToast={triggerToast}
              />
            ) : activeNav === "certificates" ? (
              <CertificateStudioScreen
                onShowToast={triggerToast}
                onExit={() => setActiveNav("learners")}
              />
            ) : activeNav === "rewards" ? (
              <AdminRewardsManager onShowToast={triggerToast} />
            ) : activeNav === "settings" ? (
              <AdminSettingsScreen onShowToast={triggerToast} />
            ) : activeNav === "profile" ? (
              <UserProfileScreen
                mode="admin"
                currentUser={currentUser}
                initialSubView={adminProfileSubView}
                onSubViewChange={(next) => {
                  if (next === "profile" || next === "manual-setup") {
                    setAdminProfileSubView(next);
                  }
                }}
                onBack={() => setActiveNav("learners")}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onShowToast={triggerToast}
              />
            ) : (
              /* Screen: Admin Dashboard (Home) */
              <AdminHomeDashboard
                currentUser={currentUser}
                quizzes={quizzes}
                onNavigateNav={handleSelectNav}
                onCreateContent={handleTriggerContentCreation}
                onEditContent={handleEditExplorerItem}
                onOpenContentDetail={handleOpenFavoriteDetail}
                onOpenFolder={(folderName) => {
                  try {
                    window.localStorage.setItem(
                      "ruang_sosmed_admin_current_folder_v1",
                      folderName
                    );
                  } catch {}
                  setShowProjectHub(false);
                  handleSelectNav("content");
                }}
                onGradeQuiz={(quiz) =>
                  setAuthoringMode({
                    kind: "grading-center",
                    submissionTitle: quiz.title,
                  })
                }
                onOpenGradingCenter={(title) =>
                  setAuthoringMode({
                    kind: "grading-center",
                    submissionTitle: title,
                  })
                }
                onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
                onShowToast={triggerToast}
              />
            )}
            </div>
          </main>

          {/* Rumi Floating Assistant (Admin Studio — hidden on Profile/Settings) */}
          {roleMode === "admin" &&
            isCurrentUserAdmin &&
            !authoringMode &&
            activeNav !== "profile" &&
            (() => {
            const adminUserKey =
              (
                currentUser?.email ||
                currentUser?.username ||
                currentUser?.name ||
                ""
              )
                .trim()
                .toLowerCase() || "guest";

            const openIssuesCount = (reportedIssues || []).filter(
              (iss) => String(iss.status || "").toLowerCase() !== "resolved"
            ).length;
            const unreadDiscussionsCount = (discussionThreads || []).filter(
              (t) => (t.replies || []).length === 0
            ).length;

            const adminContextId = `admin:${activeNav}` as RumiPageContextId;
            const adminQuickActions: RumiQuickAction[] = [
              {
                id: "admin-deck-home",
                label: "Overview",
                sublabel: "Dashboard",
                shortcutKey: "1",
                icon: "home",
                accent: "indigo",
                isActive: activeNav === "home",
                onClick: () => handleSelectNav("home"),
              },
              {
                id: "admin-deck-content",
                label: "Materi LMS",
                sublabel: "Kelola Kelas",
                shortcutKey: "2",
                icon: "content",
                accent: "sky",
                isActive: activeNav === "content",
                onClick: () => handleSelectNav("content"),
              },
              {
                id: "admin-deck-create",
                label: "Buat Materi",
                sublabel: "+ Course Baru",
                shortcutKey: "3",
                icon: "plus",
                accent: "emerald",
                onClick: () => {
                  setCreateModalType("Course");
                  setCreateModalOpen(true);
                },
              },
              {
                id: "admin-deck-learners",
                label: "Member",
                sublabel: "Direktori PRO",
                shortcutKey: "4",
                icon: "users",
                accent: "violet",
                badgeText:
                  pendingProPaymentsCount > 0
                    ? pendingProPaymentsCount
                    : undefined,
                isActive: activeNav === "learners",
                onClick: () => handleSelectNav("learners"),
              },
              {
                id: "admin-deck-inbox",
                label: "Inbox",
                sublabel: "Diskusi & Tugas",
                shortcutKey: "5",
                icon: "inbox",
                accent: "amber",
                badgeText:
                  unreadDiscussionsCount > 0
                    ? unreadDiscussionsCount
                    : undefined,
                isActive: activeNav === "inbox",
                onClick: () => handleSelectNav("inbox"),
              },
              {
                id: "admin-deck-settings",
                label: "Pengaturan",
                sublabel: "Kode & Bot",
                shortcutKey: "6",
                icon: "settings",
                accent: "rose",
                isActive: activeNav === "settings",
                onClick: () => handleSelectNav("settings"),
              },
            ];

            return (
              <RumiFloatingAssistant
                roleMode="admin"
                userKey={adminUserKey}
                pageContextId={adminContextId}
                hideAtTopOnHome={activeNav === "home"}
                adminAlerts={{
                  pendingPayments: pendingProPaymentsCount,
                  pendingGrading: (quizzes || []).length,
                  unreadDiscussions: unreadDiscussionsCount,
                  openIssues: openIssuesCount,
                }}
                quickActions={adminQuickActions}
                onOpenProfileRumiSettings={() => {
                  setAdminProfileSubView("manual-setup");
                  handleSelectNav("profile");
                }}
                onShowToast={triggerToast}
              />
            );
          })()}
        </div>
      )}

      {/* Interactive Modals */}
      <QuickCreateModal
        open={createModalOpen}
        initialType={createModalType}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreatedContent}
      />

      <GlobalSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectResult={(title) => {
          handleSelectNav("content");
          handleOpenFavoriteDetail(title, "Course");
        }}
      />

      <UpgradePlanModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        isProActive={learnerIsPro}
        hasUsedTrial={learnerHasUsedTrial}
        activePackageId={learnerPackageId || learnerAccess.activePackage?.id}
        activePackageName={learnerPackageName || learnerAccess.activePackage?.name}
        activeTierKind={learnerAccess.tierKind}
        preselectedPackageId={upgradePreselectedPackageId}
        initialBillingCycle={upgradeInitialCycle}
        canTestFreeToggle={isCurrentUserAdmin}
        previewTier={adminPreviewTierOverride}
        onSelectPreviewTier={(tier) => setAdminPreviewTier(tier)}
        initialStep={upgradeModalStep}
        defaultBuyerName={currentUser?.name || ""}
        defaultBuyerEmail={currentUser?.email || ""}
        onConfirmUpgrade={async (details) => {
          const res = await submitProUpgradeRequest({
            packageId: details?.packageId || "pkg-pro",
            packageName: details?.packageName || "Pro",
            priceLabel: details?.priceLabel
              ? `${details.priceLabel} ${details.periodLabel || ""}`.trim()
              : "Rp 150.000 / 30 hari",
            billingCycle: details?.billingCycle || "30d",
            durationDays:
              details?.durationDays ??
              (details?.billingCycle === "3d_trial"
                ? 3
                : details?.billingCycle === "7d_trial"
                ? 7
                : 30),
            buyerName: details?.buyerName || currentUser?.name || "Learner",
            buyerContact: details?.buyerEmail || currentUser?.email || "",
            paymentMethod: details?.paymentMethod || "qris",
            proofUrl: details?.proofUrl,
          });
          if (!res.ok) {
            triggerToast(res.error || "Gagal mengirim konfirmasi pembayaran.");
            return;
          }
          triggerToast(
            "⏳ Konfirmasi pembayaran terkirim! Admin akan memverifikasi pembayaran sebelum mengaktifkan Learner PRO."
          );
        }}
        onVoucherRedeemed={(res: ProVoucherRedeemResult) => {
          setActiveSubMeta({
            startedAt: res.startedAt,
            expiresAt: res.expiresAt,
            packageName: res.packageName,
            packageId: res.packageId,
            billingCycle: res.billingCycle,
          });
          setLearnerProStatus(true, currentUser);
          window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
          const unitLabel = res.durationUnit === "months" ? "bulan" : "hari";
          const expiryLabel = formatIndoDate(res.expiresAt || res.dueDate);
          triggerToast(
            `Kode "${res.code}" aktif! ${res.packageName} +${res.durationValue} ${unitLabel} (berlaku s/d ${expiryLabel}).`
          );
        }}
        onSwitchToFree={() => {
          if (!isCurrentUserAdmin) return;
          setLearnerProStatus(false, currentUser);
          triggerToast(
            "Mode preview dikembalikan ke Free Learner Tier."
          );
        }}
      />

      <GradeQuizModal
        quiz={gradingQuiz}
        onClose={() => setGradingQuiz(null)}
        onSubmitGrade={handleGradeSubmit}
      />

      <AssignLearnersModal
        open={Boolean(assigningItem)}
        contentTitle={
          assigningItem?.title ?? "Content Pillars & Audience Persona"
        }
        onClose={() => setAssigningItem(null)}
        onAssign={handleAssignSubmit}
      />

      <AuthModal
        open={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setRoleMode(user.role);
          try {
            window.localStorage.setItem(
              "ruang_sosmed_session_user_v1",
              JSON.stringify(user)
            );
            window.localStorage.setItem(
              "ruang_sosmed_role_mode_v1",
              user.role
            );
          } catch {}
        }}
        onShowToast={triggerToast}
      />

      {welcomeProModalNode}

      {/* Top-Center Toast Notification */}
      {toastBannerNode}
    </div>
  );
}

export default function RuangSosmedStudioPage() {
  return (
    <RuangSosmedProvider>
      <RuangSosmedStudioInner />
    </RuangSosmedProvider>
  );
}
