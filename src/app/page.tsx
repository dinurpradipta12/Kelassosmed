"use client";

import React, { useEffect, useState } from "react";
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
  AdminLeftRail,
  type AdminNavId,
  type SecondaryNavLinkId,
} from "@/components/navigation/AdminLeftRail";
import { QuickCreateStrip } from "@/components/dashboard/QuickCreateStrip";
import { LeftColumnWidgets } from "@/components/dashboard/LeftColumnWidgets";
import { RightColumnWidgets } from "@/components/dashboard/RightColumnWidgets";
import {
  QuickCreateModal,
  GlobalSearchModal,
  UpgradePlanModal,
  GradeQuizModal,
} from "@/components/dashboard/StudioModals";
import { LearningContentExplorer } from "@/components/explorer/LearningContentExplorer";
import { ContentDetailView } from "@/components/explorer/ContentDetailView";
import { AssignLearnersModal } from "@/components/explorer/AssignLearnersModal";
import { CoursePageEditor } from "@/components/authoring/CoursePageEditor";
import { LearningPathBuilder } from "@/components/authoring/LearningPathBuilder";
import { WikiBuilder } from "@/components/authoring/WikiBuilder";
import { ModularQuizBuilder } from "@/components/quiz/ModularQuizBuilder";
import { TrainerGradingCenter } from "@/components/quiz/TrainerGradingCenter";
import { LearnerPortalView } from "@/components/learner/LearnerPortalView";
import { AdminAnalyticsScreen } from "@/components/admin/AdminAnalyticsScreen";
import { AdminLearnersDirectory } from "@/components/admin/AdminLearnersDirectory";
import { AdminMentorInbox } from "@/components/admin/AdminMentorInbox";
import { CertificateStudioScreen } from "@/components/certificate/CertificateStudioScreen";
import { AdminRewardsManager } from "@/components/admin/AdminRewardsManager";
import {
  AdminSettingsScreen,
} from "@/components/admin/AdminHistoryAndSettings";
import { UserProfileScreen } from "@/components/profile/UserProfileScreen";
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
    }
  | { kind: "learning-path" }
  | { kind: "wiki"; title?: string }
  | { kind: "quiz-builder"; title?: string }
  | { kind: "grading-center"; submissionTitle?: string }
  | null;

function RuangSosmedStudioInner() {
  const {
    explorerItems,
    ungradedQuizzes: quizzes,
    learnerIsPro,
    setLearnerProStatus,
    registerLearnerProfile,
    publishContentToStudioAndCatalog,
    duplicateExplorerItem,
    deleteExplorerItem,
    assignContentToLearners,
    quickGradeDashboardQuiz,
    resetGlobalStoreToDefaults,
    clearAllStoreData,
    getCourseCurriculum,
    workspaceCollaborators,
    maintenanceConfig,
  } = useRuangSosmedStore();

  const [roleMode, setRoleMode] = useState<AppRoleMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(
          "ruang_sosmed_role_mode_v1"
        ) as AppRoleMode | null;
        if (saved === "admin" || saved === "learner") return saved;
      } catch {}
    }
    return "learner";
  });
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
  const [activeProject, setActiveProject] = useState("Ruang Sosmed Class");
  const [showProjectHub, setShowProjectHub] = useState(true);

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
  const [gradingQuiz, setGradingQuiz] = useState<UngradedQuizItem | null>(null);
  const [assigningItem, setAssigningItem] =
    useState<ExplorerContentItem | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guestBypassStudio, setGuestBypassStudio] = useState(false);

  const handleOpenAuth = (tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const userName = (currentUser?.name || "").toLowerCase().trim();
  const userUsername = (currentUser?.username || "").toLowerCase().trim();

  // 1. Founder / Owner Dinur -> ALWAYS Admin
  const isFounderAdmin =
    userEmail.includes("dinur") ||
    userEmail === "admin@ruangsosmed.id" ||
    (userName.includes("dinur") && !userName.includes("allisha"));

  // 2. Check explicit role override from localStorage
  let localOverrideRole: string | null = null;
  if (typeof window !== "undefined") {
    try {
      if (userEmail) localOverrideRole = window.localStorage.getItem(`ruang_sosmed_role_override_${userEmail}`);
      if (!localOverrideRole && userName) localOverrideRole = window.localStorage.getItem(`ruang_sosmed_role_override_${userName}`);
      if (!localOverrideRole && userUsername) localOverrideRole = window.localStorage.getItem(`ruang_sosmed_role_override_${userUsername}`);

      if (!localOverrideRole && (userEmail.includes("afterlance") || userName.includes("allisha") || userUsername.includes("allisha"))) {
        localOverrideRole =
          window.localStorage.getItem("ruang_sosmed_role_override_afterlance@gmail.com") ||
          window.localStorage.getItem("ruang_sosmed_role_override_allisha fathya") ||
          window.localStorage.getItem("ruang_sosmed_role_override_allisha");
      }
    } catch {}
  }

  const matchedCollaborator = (workspaceCollaborators || []).find((c) => {
    const cEmail = (c.email || "").toLowerCase().trim();
    const cName = (c.name || "").toLowerCase().trim();
    if (userEmail && cEmail === userEmail) return true;
    if (userName && cName === userName) return true;
    if (userEmail && (cEmail.includes(userEmail) || userEmail.includes(cEmail))) return true;
    if (userName && (cName.includes(userName) || userName.includes(cName))) return true;
    return false;
  });

  let effectiveUserRole = "learner";
  if (isFounderAdmin) {
    effectiveUserRole = "admin";
  } else if (localOverrideRole) {
    effectiveUserRole = localOverrideRole.toLowerCase();
  } else if (matchedCollaborator) {
    effectiveUserRole = matchedCollaborator.role.toLowerCase();
  } else if (currentUser?.role) {
    effectiveUserRole = currentUser.role.toLowerCase();
  }

  const isCurrentUserAdmin = effectiveUserRole === "admin" || effectiveUserRole === "mentor";

  // Auto-redirect if user is in admin studio but their role was revoked/changed to learner
  useEffect(() => {
    if (roleMode === "admin" && !isCurrentUserAdmin && !guestBypassStudio && currentUser) {
      setRoleMode("learner");
      try {
        window.localStorage.setItem("ruang_sosmed_role_mode_v1", "learner");
      } catch {}
    }
  }, [roleMode, isCurrentUserAdmin, guestBypassStudio, currentUser]);

  const handleRoleModeChange = (newMode: AppRoleMode) => {
    if (newMode === "admin") {
      const allowed = isCurrentUserAdmin || guestBypassStudio;

      if (!allowed) {
        triggerToast("Akun Anda berstatus Learner dan tidak memiliki hak akses Admin Studio.");
        return;
      }
    }

    setRoleMode(newMode);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ruang_sosmed_role_mode_v1", newMode);
      } catch {}
    }
  };

  const handleSwitchToAdminFromLearner = () => {
    const upgradedUser: AuthenticatedUser = currentUser
      ? { ...currentUser, role: "admin" }
      : {
          name: "Allisha Fathya",
          email: "afterlance@gmail.com",
          role: "admin",
          username: "allisha",
        };

    setCurrentUser(upgradedUser);
    try {
      window.localStorage.setItem(
        "ruang_sosmed_session_user_v1",
        JSON.stringify(upgradedUser)
      );
      window.localStorage.setItem("ruang_sosmed_role_mode_v1", "admin");
      window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
    } catch {}

    setRoleMode("admin");
    triggerToast(
      `🚀 Beralih ke Admin Studio. Selamat datang, ${upgradedUser.name}!`
    );
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

  // Hydrate cached user session & landing config synchronously on client mount to prevent any landing page flash/glitch on refresh
  useEffect(() => {
    let restoredFromCache = false;
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

      const cachedUserRaw = window.localStorage.getItem(
        "ruang_sosmed_session_user_v1"
      );
      const cachedRoleMode = window.localStorage.getItem(
        "ruang_sosmed_role_mode_v1"
      ) as AppRoleMode | null;

      if (cachedUserRaw) {
        const parsedUser = JSON.parse(cachedUserRaw) as AuthenticatedUser;
        if (parsedUser && parsedUser.email) {
          const pEmail = (parsedUser.email || "").toLowerCase();
          const pName = (parsedUser.name || "").toLowerCase();
          const pUsername = (parsedUser.username || "").toLowerCase();
          if (pEmail.includes("afterlance") || pName.includes("allisha") || pUsername.includes("allisha")) {
            const explicitAdmin =
              window.localStorage.getItem(`ruang_sosmed_role_override_${pEmail}`) === "Admin" ||
              window.localStorage.getItem("ruang_sosmed_role_override_allisha") === "Admin" ||
              window.localStorage.getItem("ruang_sosmed_role_override_allisha fathya") === "Admin";
            if (!explicitAdmin) {
              parsedUser.role = "learner";
              try {
                window.localStorage.setItem("ruang_sosmed_session_user_v1", JSON.stringify(parsedUser));
                window.localStorage.setItem("ruang_sosmed_role_mode_v1", "learner");
              } catch {}
            }
          }

          // Merge edited profile (fullName & avatarUrl) if present in localStorage
          try {
            const profKey =
              parsedUser.role === "admin"
                ? "ruang_sosmed_profile_admin_v2"
                : "ruang_sosmed_profile_learner_v2";
            const profRaw = window.localStorage.getItem(profKey);
            if (profRaw) {
              const profData = JSON.parse(profRaw);
              if (profData?.fullName && profData.fullName !== "Arunika Developer") {
                parsedUser.name = profData.fullName;
                parsedUser.username =
                  profData.fullName
                    .split(" ")[0]
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "") || parsedUser.username;
              }
              if (typeof profData?.avatarUrl === "string" && profData.avatarUrl) {
                parsedUser.avatarUrl = profData.avatarUrl;
              }
              window.localStorage.setItem(
                "ruang_sosmed_session_user_v1",
                JSON.stringify(parsedUser)
              );
            }
          } catch {}

          restoredFromCache = true;
          setCurrentUser(parsedUser);
          setRoleMode(
            parsedUser.role === "admin" && cachedRoleMode
              ? cachedRoleMode
              : parsedUser.role
          );
          setAuthReady(true);
        }
      }
    } catch {}

    const resolveUserWithDbRole = async (
      sessionUser: any
    ): Promise<AuthenticatedUser> => {
      const meta = sessionUser.user_metadata || {};
      const email = sessionUser.email || "";

      let dbRole: string | null = null;
      let dbFullName: string | null = null;
      let dbUsername: string | null = null;
      let dbAvatarUrl: string | null = null;
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role, full_name, username, avatar_url")
          .or(`id.eq.${sessionUser.id},email.ilike.${email}`)
          .maybeSingle();

        if (prof?.role) {
          dbRole = prof.role.toLowerCase();
        }
        if (prof?.full_name) dbFullName = prof.full_name;
        if (prof?.username) dbUsername = prof.username;
        if (prof?.avatar_url) dbAvatarUrl = prof.avatar_url;
      } catch {}

      let cachedName: string | undefined;
      let cachedAvatar: string | undefined;
      let cachedUsername: string | undefined;
      if (typeof window !== "undefined") {
        try {
          const cachedSession = window.localStorage.getItem("ruang_sosmed_session_user_v1");
          if (cachedSession) {
            const parsed = JSON.parse(cachedSession);
            if (parsed?.email?.toLowerCase() === email.toLowerCase()) {
              if (parsed.name) cachedName = parsed.name;
              if (parsed.avatarUrl) cachedAvatar = parsed.avatarUrl;
              if (parsed.username && parsed.username !== "arunika") {
                cachedUsername = parsed.username;
              }
            }
          }
        } catch {}
      }

      const isUserAdmin =
        dbRole === "admin" ||
        dbRole === "mentor" ||
        meta.role === "admin" ||
        email.toLowerCase().includes("dinur") ||
        email.toLowerCase() === "admin@ruangsosmed.id";

      const role: "admin" | "learner" = isUserAdmin ? "admin" : "learner";

      let editedProfileName: string | undefined;
      let editedProfileAvatar: string | undefined;
      if (typeof window !== "undefined") {
        try {
          const profKey = isUserAdmin
            ? "ruang_sosmed_profile_admin_v2"
            : "ruang_sosmed_profile_learner_v2";
          const profRaw = window.localStorage.getItem(profKey);
          if (profRaw) {
            const profData = JSON.parse(profRaw);
            if (profData?.fullName && profData.fullName !== "Arunika Developer") {
              editedProfileName = profData.fullName;
            }
            if (typeof profData?.avatarUrl === "string" && profData.avatarUrl) {
              editedProfileAvatar = profData.avatarUrl;
            }
          }
        } catch {}
      }

      const resolvedName =
        editedProfileName ||
        dbFullName ||
        (cachedName && cachedName !== "Arunika Developer" ? cachedName : undefined) ||
        meta.full_name ||
        email.split("@")[0] ||
        "User";
      const derivedHandle =
        resolvedName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || undefined;
      const username =
        derivedHandle ||
        cachedUsername ||
        dbUsername ||
        (meta.username && meta.username !== "arunika" ? meta.username : undefined);

      return {
        name: resolvedName,
        email,
        role,
        username,
        avatarUrl: editedProfileAvatar || cachedAvatar || dbAvatarUrl || undefined,
      };
    };

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const authedUser = await resolveUserWithDbRole(session.user);
          setCurrentUser(authedUser);
          try {
            window.localStorage.setItem(
              "ruang_sosmed_session_user_v1",
              JSON.stringify(authedUser)
            );
          } catch {}
          if (!restoredFromCache) {
            setRoleMode(authedUser.role);
          }
        }
      })
      .finally(() => {
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authedUser = await resolveUserWithDbRole(session.user);
        setCurrentUser(authedUser);
        try {
          window.localStorage.setItem(
            "ruang_sosmed_session_user_v1",
            JSON.stringify(authedUser)
          );
        } catch {}
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        try {
          window.localStorage.removeItem("ruang_sosmed_session_user_v1");
          window.localStorage.removeItem("ruang_sosmed_role_mode_v1");
        } catch {}
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      window.localStorage.removeItem("ruang_sosmed_session_user_v1");
      window.localStorage.removeItem("ruang_sosmed_role_mode_v1");
    } catch {}
    await signOutUser();
    setCurrentUser(null);
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

  // Keep currentUser state in sync when user updates profile in UserProfileScreen
  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const raw = window.localStorage.getItem("ruang_sosmed_session_user_v1");
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.name) {
            setCurrentUser(u);
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

  // Live cross-browser sync: Periodically poll Supabase `profiles` to detect role updates made in other browsers
  useEffect(() => {
    if (!currentUser?.email) return;
    const interval = setInterval(async () => {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .ilike("email", currentUser.email)
          .maybeSingle();

        if (prof?.role) {
          const dbRole = prof.role.toLowerCase();
          const nextRole: "admin" | "learner" =
            dbRole === "admin" || dbRole === "mentor" ? "admin" : "learner";

          if (currentUser.role !== nextRole) {
            const updated: AuthenticatedUser = {
              ...currentUser,
              role: nextRole,
            };
            setCurrentUser(updated);
            setRoleMode(nextRole);
            try {
              window.localStorage.setItem(
                "ruang_sosmed_session_user_v1",
                JSON.stringify(updated)
              );
              window.localStorage.setItem(
                "ruang_sosmed_role_mode_v1",
                nextRole
              );
              window.localStorage.setItem(
                `ruang_sosmed_role_override_${currentUser.email.toLowerCase()}`,
                nextRole === "admin" ? "Admin" : "Learner"
              );
            } catch {}
            window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
            window.dispatchEvent(new Event("ruang_sosmed_role_mode_changed"));
            triggerToast(
              nextRole === "admin"
                ? "🎉 Hak akses Admin Studio telah disinkronkan dari database!"
                : "ℹ️ Status akun disinkronkan ke Siswa Learner dari database."
            );
          }
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Listen to cross-tab / live broadcast events (e.g. Collaborator Invitation & Role overrides)
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const bc = new BroadcastChannel("ruang_sosmed_channel");
      bc.onmessage = (event) => {
        if (event.data?.type === "INVITATION_BROADCAST") {
          triggerToast(
            `🔔 Undangan Baru: Anda diundang sebagai ${event.data.role} pada cohort "${event.data.cohort}"!`
          );
        } else if (event.data?.type === "ROLE_OVERRIDE_BROADCAST") {
          const { targetEmail, targetName, nextRole } = event.data;
          const curEmail = (currentUser?.email || "").toLowerCase().trim();
          const curName = (currentUser?.name || "").toLowerCase().trim();
          const tEmail = (targetEmail || "").toLowerCase().trim();
          const tName = (targetName || "").toLowerCase().trim();

          const isMatch =
            (tEmail && (tEmail === curEmail || curEmail.includes(tEmail) || tEmail.includes(curEmail))) ||
            (tName && (tName === curName || curName.includes(tName) || tName.includes(curName))) ||
            ((curName.includes("allisha") || curEmail.includes("afterlance")) &&
              (tName.includes("allisha") || tEmail.includes("afterlance")));

          if (isMatch && currentUser) {
            const newRole = nextRole === "Learner" ? "learner" : "admin";
            const updated: AuthenticatedUser = {
              ...currentUser,
              role: newRole,
            };
            setCurrentUser(updated);
            try {
              window.localStorage.setItem("ruang_sosmed_session_user_v1", JSON.stringify(updated));
              window.localStorage.setItem("ruang_sosmed_role_mode_v1", newRole);
            } catch {}
            window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
            window.dispatchEvent(new Event("ruang_sosmed_role_mode_changed"));
            triggerToast(
              newRole === "admin"
                ? "🎉 Hak akses Admin Studio telah aktif!"
                : "ℹ️ Status akun beralih ke Siswa Learner."
            );
          }
        }
      };
      return () => {
        bc.close();
      };
    } catch {
      // Ignore
    }
  }, [currentUser]);

  // Auto-dismiss toast notifications after 4.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
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

  const [activeFolderForCreation, setActiveFolderForCreation] = useState<string | null>(null);

  // Trigger dedicated Phase 3 & Phase 4 builders when Course, Page, Quiz, Learning Path, or Wiki is selected
  const handleTriggerContentCreation = (
    defaultType: ExplorerItemType = "Course",
    targetFolder?: string
  ) => {
    setActiveFolderForCreation(targetFolder || null);
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
      setAuthoringMode({
        kind: "course-page",
        contentType: defaultType,
        folderName: targetFolder || undefined,
        title:
          defaultType === "Course"
            ? targetFolder
              ? `${targetFolder} — Intensive Class`
              : "Mastering Instagram Carousel & Viral Hook Strategy"
            : targetFolder
            ? `${targetFolder} — Module Overview`
            : "Content Pillars & Audience Persona",
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
      setAuthoringMode({ kind: "wiki", title: item.title });
      return;
    }
    if (item.type === "Course" || item.type === "Page") {
      setAuthoringMode({
        kind: "course-page",
        contentType: item.type,
        title: item.title,
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

  // 2. Public Visitor Landing View (When NOT logged in)
  if (!currentUser && !guestBypassStudio) {
    const isAdminBypass =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("admin") === "1";

    return (
      <>
        {maintenanceConfig?.enabled && !isAdminBypass ? (
          <UnderConstructionView
            config={maintenanceConfig}
            onOpenAdminLogin={() => handleOpenAuth("login")}
          />
        ) : (
          <PublicLandingView
            blocks={landingConfig.blocks}
            config={landingConfig}
            onOpenAuth={(tab) => handleOpenAuth(tab || "login")}
            onEnterDevMode={() => setGuestBypassStudio(true)}
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
            if (user.role === "admin") {
              setLearnerProStatus(true);
            }
          }}
          onShowToast={triggerToast}
        />

        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-[#121215] px-4 py-3 text-xs font-medium text-white shadow-lg border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150"
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
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#121215]">
      {/* Global Role Switcher (Admin Workspace Bar; hidden in Student Learner Portal) */}
      {roleMode !== "learner" && (
        <GlobalRoleSwitcher
          mode={roleMode}
          onChange={handleRoleModeChange}
          onOpenSearch={() => setSearchModalOpen(true)}
          sidebarOpen={secondarySidebarOpen && !authoringMode}
          onToggleSidebar={() => setSecondarySidebarOpen((prev) => !prev)}
          currentUser={currentUser}
          onOpenAuth={() => handleOpenAuth("login")}
          onLogout={handleLogout}
          leftOffsetClass={roleMode === "admin" ? "pl-[56px]" : ""}
        />
      )}

      {roleMode === "learner" ? (
        <LearnerPortalView
          currentUser={currentUser}
          onOpenUpgradeModal={() => {
            setUpgradeModalStep("overview");
            setUpgradeModalOpen(true);
          }}
          onStartUpgradePayment={() => {
            setUpgradeModalStep("payment");
            setUpgradeModalOpen(true);
          }}
          onShowToast={triggerToast}
          onSwitchToAdmin={handleSwitchToAdminFromLearner}
          onLogout={handleLogout}
        />
      ) : (
        <div className="flex min-h-[calc(100vh-2.5rem)]">
          {/* Admin Left Icon Rail (Fixed 56px width) + Contextual Secondary Sidebar (240px width) */}
          <AdminLeftRail
            activeNav={activeNav}
            onSelectNav={handleSelectNav}
            secondarySidebarOpen={secondarySidebarOpen && !authoringMode}
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
              setShowProjectHub(false);
              setSelectedContentDetailId(null);
              setAuthoringMode(null);
            }}
            activeSubNav={activeSubNav}
            onSelectSubNav={(subId) => {
              setActiveSubNav(subId);
              setShowProjectHub(false);
              setSelectedContentDetailId(null);
            }}
            currentUser={currentUser}
            onOpenAuth={() => handleOpenAuth("login")}
          />

          {/* Main Workspace Canvas (#F8F9FB) */}
          <main
            className={`min-w-0 flex-1 pl-[56px] transition-[padding] duration-150 ease-out ${
              (activeNav === "content" || activeNav === "archive") &&
              secondarySidebarOpen &&
              !authoringMode
                ? "pb-24"
                : ""
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
                initialTitle={authoringMode.title}
                contentType={authoringMode.contentType}
                initialSections={
                  getCourseCurriculum(authoringMode.title) || undefined
                }
                onBack={() => setAuthoringMode(null)}
                onPublish={(title, type, sections, desc) => {
                  handleCreatedContent(
                    type,
                    title,
                    desc,
                    "Not Urgent",
                    sections,
                    authoringMode.folderName
                  );
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
                onBack={() => setAuthoringMode(null)}
                onPublishWiki={(title) => {
                  handleCreatedContent("Wiki", title);
                  setAuthoringMode(null);
                  setActiveNav("content");
                  setSecondarySidebarOpen(true);
                }}
                onShowToast={triggerToast}
              />
            ) : activeNav === "content" || activeNav === "archive" ? (
              selectedContentDetail ? (
                <ContentDetailView
                  item={selectedContentDetail}
                  onBackToExplorer={() => setSelectedContentDetailId(null)}
                  onOpenAssignModal={(item) => setAssigningItem(item)}
                  onEditContent={handleEditExplorerItem}
                  onShowToast={triggerToast}
                />
              ) : (
                <LearningContentExplorer
                  items={explorerItems}
                  onSelectContentItem={(item) =>
                    setSelectedContentDetailId(item.id)
                  }
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
                  onBackToProjects={() => setShowProjectHub(true)}
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
                onBack={() => setActiveNav("learners")}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onShowToast={triggerToast}
              />
            ) : (
              /* Screen: Admin Dashboard (Home) */
              <div className="w-full px-4 sm:px-5 pt-5 pb-12">
                {/* Greeting Header */}
                <header className="mb-6">
                  <div>
                    <h1 className="text-[24px] leading-tight font-bold tracking-tight text-[#121215]">
                      {(() => {
                        const hour = new Date().getHours();
                        const timeGreeting =
                          hour < 12
                            ? "Good morning"
                            : hour < 18
                            ? "Good afternoon"
                            : "Good evening";
                        const displayName =
                          currentUser?.name
                            ? currentUser.name.split(" ")[0]
                            : currentUser?.username || "Admin";
                        return `${timeGreeting}, ${displayName} 👋`;
                      })()}
                    </h1>
                    <p className="text-sm text-[#5E5E5E] mt-1">
                      Welcome back to Ruang Sosmed 2.0 Studio •{" "}
                      <span className="font-semibold text-[#4F39F6]">
                        {currentUser?.name || "Admin"} Workspace
                      </span>
                    </p>
                  </div>
                </header>

                {/* Quick Create Strip (Horizontal row of 6 clickable creation pills) */}
                <QuickCreateStrip
                  onCreateContent={handleTriggerContentCreation}
                />

                {/* Main Layout Grid (Left 8 Columns + Right 4 Columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left 8 Columns */}
                  <div className="lg:col-span-8">
                    <LeftColumnWidgets
                      quizzes={quizzes}
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
                      onShowToast={triggerToast}
                      currentUser={currentUser}
                    />
                  </div>

                  {/* Right 4 Columns */}
                  <div className="lg:col-span-4">
                    <RightColumnWidgets
                      onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
                      onShowToast={triggerToast}
                      currentUser={currentUser}
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
          </main>
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
        initialStep={upgradeModalStep}
        defaultBuyerName={currentUser?.name || ""}
        defaultBuyerEmail={currentUser?.email || ""}
        onConfirmUpgrade={() => {
          setLearnerProStatus(true, currentUser);
          triggerToast(
            "⚡ Konfirmasi pembayaran diterima! Status Learner PRO Anda kini aktif."
          );
        }}
        onSwitchToFree={() => {
          setLearnerProStatus(false, currentUser);
          triggerToast(
            "Status dikembalikan ke Free Learner Tier (fitur PRO kembali terkunci)."
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
          if (user.role === "admin") {
            setLearnerProStatus(true);
          }
        }}
        onShowToast={triggerToast}
      />

      {/* Subtle Bottom-Right Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-[#121215] px-4 py-3 text-xs font-medium text-white shadow-lg border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150"
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
      )}
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
