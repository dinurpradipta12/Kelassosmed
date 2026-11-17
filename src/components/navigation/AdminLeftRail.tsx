"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  BarChart3,
  Folder,
  Users,
  Clock,
  Archive,
  Plus,
  Zap,
  HelpCircle,
  Settings,
  FolderOpen,
  Share2,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  Star,
  User,
  Layout,
  Gift,
  Pencil,
  Trash2,
  Check,
  X,
  Palette,
  Award,
  MessageSquare,
} from "lucide-react";
import { type ContentType } from "@/lib/design-tokens";
import { type ExplorerItemType } from "@/lib/phase2-data";
import { ContentIconBox } from "@/components/ui/ContentBadge";
import { type AuthenticatedUser } from "./GlobalRoleSwitcher";
import { MentorGuideModal } from "@/components/admin/MentorGuideModal";
import {
  useRuangSosmedStore,
  type CohortProjectItem,
} from "@/context/RuangSosmedStore";

export type AdminNavId =
  | "home"
  | "analytics"
  | "content"
  | "learners"
  | "inbox"
  | "certificates"
  | "rewards"
  | "history"
  | "archive"
  | "landing-builder"
  | "settings"
  | "profile";

export type SecondaryNavLinkId =
  | "recents"
  | "shared"
  | "archived"
  | "templates";

interface AdminLeftRailProps {
  activeNav: AdminNavId;
  onSelectNav: (id: AdminNavId) => void;
  secondarySidebarOpen: boolean;
  onToggleSecondarySidebar: () => void;
  onOpenSearchModal: () => void;
  onOpenCreateModal: (defaultType?: ContentType) => void;
  onOpenUpgradeModal: () => void;
  onShowToast: (message: string) => void;
  onOpenContentDetail?: (title: string, type: ExplorerItemType) => void;
  activeProject?: string;
  onSelectProject?: (projectName: string) => void;
  activeSubNav?: SecondaryNavLinkId;
  onSelectSubNav?: (subId: SecondaryNavLinkId) => void;
  currentUser?: AuthenticatedUser | null;
  onOpenAuth?: () => void;
}

interface RailTooltipButtonProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function RailIconButton({
  label,
  shortcut,
  active = false,
  onClick,
  children,
  className = "",
}: RailTooltipButtonProps) {
  return (
    <div className="relative group flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4F39F6] ${
          active
            ? "bg-[#4F39F6]/10 text-[#4F39F6]"
            : "text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215]"
        } ${className}`}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute -left-[10px] h-5 w-1 rounded-r-full bg-[#4F39F6]"
          />
        )}
        {children}
      </button>

      {/* Accessible hover/focus tooltip */}
      <div
        role="tooltip"
        className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-150 absolute left-[48px] z-50 flex items-center gap-2 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
      >
        <span>{label}</span>
        {shortcut && (
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-normal text-white/80">
            {shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
}

const PINNED_FAVORITES: {
  title: string;
  type: ExplorerItemType;
}[] = [];

export const COHORT_COLOR_PRESETS = [
  { label: "Pink", value: "#EC4899" },
  { label: "Indigo", value: "#4F39F6" },
  { label: "Emerald", value: "#10B981" },
  { label: "Sky Blue", value: "#0EA5E9" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Teal", value: "#14B8A6" },
];

export function AdminLeftRail({
  activeNav,
  onSelectNav,
  secondarySidebarOpen,
  onToggleSecondarySidebar,
  onOpenSearchModal,
  onOpenCreateModal,
  onOpenUpgradeModal,
  onShowToast,
  onOpenContentDetail,
  activeProject = "Ruang Sosmed Class",
  onSelectProject,
  activeSubNav: controlledSubNav,
  onSelectSubNav,
  currentUser,
  onOpenAuth,
}: AdminLeftRailProps) {
  const [localSubNav, setLocalSubNav] =
    useState<SecondaryNavLinkId>("recents");
  const activeSubNav = controlledSubNav ?? localSubNav;
  const setActiveSubNav = (subId: SecondaryNavLinkId) => {
    setLocalSubNav(subId);
    onSelectSubNav?.(subId);
  };
  const {
    cohortProjects,
    addCohortProject,
    updateCohortProject,
    deleteCohortProject,
    gradingSubmissions,
    explorerItems,
    discussionThreads,
    reportedIssues,
  } = useRuangSosmedStore();

  const awaitingReplyCount = (discussionThreads || []).filter((t) => {
    if (!t.replies || t.replies.length === 0) return false;
    const lastRole = (
      t.replies[t.replies.length - 1]?.authorRole || ""
    ).toLowerCase();
    return !lastRole.includes("mentor") && !lastRole.includes("admin");
  }).length;
  const openIssuesCount = (reportedIssues || []).filter(
    (i) => i.status === "Open"
  ).length;
  const unreadInboxCount = awaitingReplyCount + openIssuesCount;

  const activeP = (activeProject || "Ruang Sosmed Class").trim().toLowerCase();
  const primaryName = (
    cohortProjects[0]?.name || "Ruang Sosmed Class"
  ).trim().toLowerCase();
  const isActivePrimary =
    activeP === primaryName ||
    (activeP.includes("ruang sosmed") && primaryName.includes("ruang sosmed"));

  const projectScopedItems = (explorerItems || []).filter((item) => {
    const itemC = (item.cohort || "").trim().toLowerCase();
    if (itemC === activeP) return true;
    if (isActivePrimary && (!itemC || itemC.includes("ruang sosmed"))) {
      return true;
    }
    return false;
  });

  const recentCount = projectScopedItems.filter(
    (i) => i.type === "Folder" && !i.isArchived && !i.isTemplate
  ).length;
  const sharedCount = projectScopedItems.filter(
    (i) => Boolean(i.isShared) && !i.isArchived
  ).length;
  const archivedCount = projectScopedItems.filter((i) =>
    Boolean(i.isArchived)
  ).length;
  const templateCount = projectScopedItems.filter(
    (i) =>
      !i.isArchived &&
      (Boolean(i.isTemplate) || i.type === "Wiki" || i.type === "Page")
  ).length;

  const [createCohortModalOpen, setCreateCohortModalOpen] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortColor, setNewCohortColor] = useState("#4F39F6");

  const [editingCohort, setEditingCohort] = useState<CohortProjectItem | null>(null);
  const [editCohortName, setEditCohortName] = useState("");
  const [editCohortColor, setEditCohortColor] = useState("#EC4899");

  const [deletingCohort, setDeletingCohort] = useState<CohortProjectItem | null>(null);
  const [cohortMenuOpen, setCohortMenuOpen] = useState(false);
  const [favoritesMenuOpen, setFavoritesMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);

  // Close floating dock popovers on outside click or Escape
  useEffect(() => {
    if (!cohortMenuOpen && !favoritesMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setCohortMenuOpen(false);
        setFavoritesMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCohortMenuOpen(false);
        setFavoritesMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [cohortMenuOpen, favoritesMenuOpen]);

  // Close any cohort modal on Escape key press
  useEffect(() => {
    if (!createCohortModalOpen && !editingCohort && !deletingCohort) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setCreateCohortModalOpen(false);
        setEditingCohort(null);
        setDeletingCohort(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createCohortModalOpen, editingCohort, deletingCohort]);
  const [mentorGuideOpen, setMentorGuideOpen] = useState(false);

  // Dynamic sync for User Profile (Photo & Name)
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null);
  const [liveName, setLiveName] = useState<string | null>(null);

  useEffect(() => {
    const syncProfile = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("ruang_sosmed_profile_admin_v2");
        if (raw) {
          const p = JSON.parse(raw);
          if (typeof p.avatarUrl === "string") setLiveAvatar(p.avatarUrl || null);
          if (p.fullName) setLiveName(p.fullName);
        }
        const sessionRaw = window.localStorage.getItem(
          "ruang_sosmed_session_user_v1"
        );
        if (sessionRaw) {
          const s = JSON.parse(sessionRaw);
          if (typeof s.avatarUrl === "string") setLiveAvatar(s.avatarUrl || null);
          if (s.name) setLiveName(s.name);
        }
      } catch {}
    };
    syncProfile();
    window.addEventListener("ruang_sosmed_profile_updated", syncProfile);
    window.addEventListener("storage", syncProfile);
    return () => {
      window.removeEventListener("ruang_sosmed_profile_updated", syncProfile);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  const activeAvatarUrl = currentUser?.avatarUrl || liveAvatar || null;
  const activeDisplayName = currentUser?.name || liveName || "Dinur Pradipta";
  const activeInitials =
    activeDisplayName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DP";

  const getComputedCohortCount = (proj: CohortProjectItem) => {
    const pName = proj.name.trim().toLowerCase();
    const isPrimaryCohort =
      pName.includes("ruang sosmed") ||
      (cohortProjects?.[0]?.name &&
        pName === cohortProjects[0].name.toLowerCase());

    const count = (explorerItems || []).filter((item) => {
      if (item.type !== "Folder" || item.isArchived || item.isTemplate) {
        return false;
      }
      const itemCohort = (item.cohort || "").trim().toLowerCase();
      if (itemCohort === pName) return true;
      if (
        isPrimaryCohort &&
        (!itemCohort || itemCohort.includes("ruang sosmed"))
      ) {
        return true;
      }
      return false;
    }).length;

    return count;
  };

  const handleOpenCreateCohort = () => {
    setNewCohortName("");
    setNewCohortColor("#4F39F6");
    setCreateCohortModalOpen(true);
  };

  const handleConfirmCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCohortName.trim();
    if (!trimmed) return;
    addCohortProject(trimmed, newCohortColor);
    onShowToast(`Berhasil menambahkan project/cohort: "${trimmed}".`);
    setCreateCohortModalOpen(false);
    setNewCohortName("");
    onSelectProject?.(trimmed);
  };

  const handleOpenEditCohort = (cohort: CohortProjectItem) => {
    setEditingCohort(cohort);
    setEditCohortName(cohort.name);
    setEditCohortColor(cohort.color || "#EC4899");
  };

  const handleConfirmEditCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCohort) return;
    const trimmed = editCohortName.trim();
    if (!trimmed) return;
    const oldName = editingCohort.name;
    updateCohortProject(editingCohort.id, {
      name: trimmed,
      color: editCohortColor,
    });
    if (activeProject === oldName) {
      onSelectProject?.(trimmed);
    }
    onShowToast(`Berhasil memperbarui cohort: "${trimmed}".`);
    setEditingCohort(null);
  };

  const handleConfirmDeleteCohort = () => {
    if (!deletingCohort) return;
    const deletedName = deletingCohort.name;
    deleteCohortProject(deletingCohort.id);
    if (activeProject === deletedName) {
      const remaining = (cohortProjects || []).filter(
        (c) => c.id !== deletingCohort.id && c.name !== deletedName
      );
      onSelectProject?.(remaining[0]?.name || "Ruang Sosmed Class");
    }
    onShowToast(`Berhasil menghapus cohort: "${deletedName}".`);
    setDeletingCohort(null);
  };

  const navItems: {
    id: AdminNavId;
    label: string;
    shortcut?: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  }[] = [
    { id: "home", label: "Home (Admin Dashboard)", shortcut: "G H", icon: Home },
    { id: "analytics", label: "Analytics & Reports", icon: BarChart3 },
    {
      id: "content",
      label: "Learning Content",
      shortcut: "G C",
      icon: activeNav === "content" ? FolderOpen : Folder,
    },
    { id: "learners", label: "Learners Directory", icon: Users },
    { id: "inbox", label: "Inbox Pesan Siswa", shortcut: "G I", icon: MessageSquare },
    { id: "certificates", label: "Certificate Studio", icon: Award },
    { id: "rewards", label: "Rewards Shop Management", icon: Gift },
    { id: "landing-builder", label: "Landing Page Builder", icon: Layout },
    { id: "archive", label: "Archive", icon: Archive },
  ];

  const handleNavClick = (id: AdminNavId) => {
    onSelectNav(id);
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex select-none">
      {/* Primary Left Icon Rail (Fixed 56px width, #FFFFFF, right border #EAECEF) */}
      <aside
        aria-label="Admin primary navigation"
        className="relative flex w-[56px] flex-col items-center justify-between bg-[#FFFFFF] border-r border-[#EAECEF] py-3 z-20"
      >
          {/* Top: Official Brand Logo Mark */}
        <div className="relative flex w-full flex-col items-center">
          <button
            type="button"
            onClick={() => onSelectNav("home")}
            title="Ruang Sosmed 2.0 Studio"
            className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-[#FFFFFF] border border-[#EAECEF] hover:border-[#4F39F6] shadow-2xs transition-colors cursor-pointer p-0.5"
          >
            <img src="/favicon.png" alt="Ruang Sosmed" className="h-full w-full object-contain rounded-md" />
          </button>

          <div className="my-3 h-[1px] w-7 bg-[#EAECEF]" />

          {/* Main Nav Icons */}
          <nav aria-label="Main navigation" className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <RailIconButton
                  key={item.id}
                  label={item.label}
                  shortcut={item.shortcut}
                  active={isActive}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={18} strokeWidth={2} />
                  {item.id === "inbox" && unreadInboxCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white leading-none shadow-xs">
                      {unreadInboxCount > 9 ? "9+" : unreadInboxCount}
                    </span>
                  )}
                </RailIconButton>
              );
            })}
          </nav>
        </div>

        {/* Bottom Stack: Quick Create (+), Help, Settings, User Avatar (DP) */}
        <div className="flex flex-col items-center gap-2">
          {/* Purple square + button (Quick Create Content modal trigger) */}
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              onClick={() => onOpenCreateModal()}
              aria-label="Quick Create Content"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4F39F6] text-white hover:bg-[#3B28CC] shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
            <div
              role="tooltip"
              className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-[48px] z-50 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
            >
              Quick Create Content
            </div>
          </div>

          <div className="my-1 h-[1px] w-7 bg-[#EAECEF]" />

          {/* Help/Support Icon */}
          <RailIconButton
            label="Help & Documentation"
            onClick={() => setMentorGuideOpen(true)}
          >
            <HelpCircle size={17} strokeWidth={2} />
          </RailIconButton>

          {/* Settings Gear Icon */}
          <RailIconButton
            label="Workspace Settings"
            active={activeNav === "settings"}
            onClick={() => onSelectNav("settings")}
          >
            <Settings size={17} strokeWidth={2} />
          </RailIconButton>

          {/* User Avatar at the bottom of the left sidebar (Opens Individual Profile Page) */}
          <div className="relative group mt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => onSelectNav("profile")}
              aria-label={`User Profile: ${activeDisplayName}`}
              aria-current={activeNav === "profile" ? "page" : undefined}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold tracking-tight transition-all cursor-pointer overflow-hidden ${
                activeNav === "profile"
                  ? "border-[#D97706] ring-2 ring-[#F59E0B]/50 shadow-xs"
                  : "border-[#F59E0B]/40 hover:ring-2 hover:ring-[#F59E0B]/40"
              } ${activeAvatarUrl ? "bg-[#FFFFFF]" : "bg-[#FDE68A] text-[#92400E]"}`}
            >
              {activeNav === "profile" && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[12px] h-5 w-1 rounded-r-full bg-[#4F39F6] z-10"
                />
              )}
              {activeAvatarUrl ? (
                <img
                  src={activeAvatarUrl}
                  alt={activeDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                activeInitials
              )}
            </button>
            <div
              role="tooltip"
              className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute left-[48px] z-50 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
            >
              {activeDisplayName} •{" "}
              {currentUser?.role === "admin" ? "Super Admin (Profil)" : "Profil Saya"}
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Bottom-Center Dock for Learning Content (replaces Secondary Sidebar) */}
      {(activeNav === "content" || activeNav === "archive") && secondarySidebarOpen && (
        <div
          ref={dockRef}
          role="region"
          aria-label="Learning Content Floating Dock"
          className="fixed bottom-4 left-[calc(50%+28px)] -translate-x-1/2 z-40 max-w-[calc(100vw-80px)]"
        >
          <div className="relative flex items-center gap-1 rounded-2xl bg-white/95 backdrop-blur-md border border-[#EAECEF] px-2 py-1.5 shadow-[0_8px_30px_rgba(16,15,17,0.12)]">
            {/* 1. Cohort / Project Switcher Pill + Upward Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCohortMenuOpen((prev) => !prev);
                  setFavoritesMenuOpen(false);
                }}
                aria-expanded={cohortMenuOpen}
                title="Pilih atau kelola Project / Cohort"
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  cohortMenuOpen
                    ? "bg-[#F8F9FB] text-[#121215] border border-[#EAECEF]"
                    : "text-[#121215] hover:bg-[#F8F9FB] border border-transparent"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                  style={{
                    backgroundColor:
                      (cohortProjects || []).find((p) => p.name === activeProject)?.color ||
                      "#EC4899",
                  }}
                />
                <span className="max-w-[130px] truncate">{activeProject}</span>
                <ChevronUp
                  size={13}
                  className={`text-[#9CA3AF] transition-transform duration-150 ${
                    cohortMenuOpen ? "rotate-180 text-[#4F39F6]" : ""
                  }`}
                />
              </button>

              {cohortMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white border border-[#EAECEF] p-2 shadow-[0_12px_36px_rgba(16,15,17,0.14)] animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#EAECEF]/70 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      Projects / Cohorts
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCohortMenuOpen(false);
                        handleOpenCreateCohort();
                      }}
                      title="Tambah project atau cohort baru"
                      aria-label="Add project cohort"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#4F39F6] border border-transparent hover:border-[#EAECEF] cursor-pointer transition-colors"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  </div>

                  <ul className="max-h-56 overflow-y-auto space-y-0.5">
                    {(cohortProjects || []).map((proj) => {
                      const isSelected = activeProject === proj.name;
                      const count = getComputedCohortCount(proj);
                      return (
                        <li key={proj.id || proj.name} className="group/item relative">
                          <div
                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-all ${
                              isSelected
                                ? "bg-[#4F39F6]/8 font-semibold text-[#4F39F6]"
                                : "font-medium text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onSelectNav("content");
                                onSelectProject?.(proj.name);
                                setCohortMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer overflow-hidden"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-[3px] shrink-0"
                                style={{ backgroundColor: proj.color }}
                              />
                              <span className="truncate">{proj.name}</span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <span className="text-[10px] text-[#9CA3AF] font-medium group-hover/item:hidden">
                                {count}
                              </span>
                              <div className="hidden group-hover/item:flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCohortMenuOpen(false);
                                    handleOpenEditCohort(proj);
                                  }}
                                  title="Edit nama & warna cohort"
                                  className="p-1 rounded text-[#9CA3AF] hover:text-[#4F39F6] hover:bg-white transition-colors cursor-pointer"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCohortMenuOpen(false);
                                    setDeletingCohort(proj);
                                  }}
                                  title="Hapus cohort"
                                  className="p-1 rounded text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2]/50 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="h-5 w-[1px] bg-[#EAECEF] mx-0.5 shrink-0" />

            {/* 2. Compact View Filter Pills: Recents, Shared, Archived, Templates */}
            <nav aria-label="Content Views" className="flex items-center gap-1">
              {[
                {
                  id: "recents" as const,
                  label: "Recents",
                  icon: Clock,
                  badge: recentCount > 0 ? String(recentCount) : undefined,
                },
                {
                  id: "shared" as const,
                  label: "Shared",
                  icon: Share2,
                  badge: sharedCount > 0 ? String(sharedCount) : undefined,
                },
                {
                  id: "archived" as const,
                  label: "Archived",
                  icon: Archive,
                  badge: archivedCount > 0 ? String(archivedCount) : undefined,
                },
                {
                  id: "templates" as const,
                  label: "Templates",
                  icon: LayoutTemplate,
                  badge: templateCount > 0 ? String(templateCount) : undefined,
                },
              ].map((link) => {
                const Icon = link.icon;
                const active = activeSubNav === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => {
                      setActiveSubNav(link.id);
                      onSelectNav("content");
                      setCohortMenuOpen(false);
                      setFavoritesMenuOpen(false);
                    }}
                    title={link.label}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-[#4F39F6]/10 text-[#4F39F6] font-semibold border border-[#4F39F6]/20"
                        : "text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215] border border-transparent"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={active ? "text-[#4F39F6]" : "text-[#9CA3AF]"}
                    />
                    <span className="hidden sm:inline">{link.label}</span>
                    {link.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                          active
                            ? "bg-white text-[#4F39F6] border border-[#4F39F6]/20"
                            : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF]"
                        }`}
                      >
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="h-5 w-[1px] bg-[#EAECEF] mx-0.5 shrink-0" />

            {/* 3. Favorites Popover Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFavoritesMenuOpen((prev) => !prev);
                  setCohortMenuOpen(false);
                }}
                aria-expanded={favoritesMenuOpen}
                title="Favorites"
                aria-label="Favorites"
                className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all cursor-pointer ${
                  favoritesMenuOpen
                    ? "bg-[#4F39F6]/10 text-[#4F39F6] border border-[#4F39F6]/20"
                    : "text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215] border border-transparent"
                }`}
              >
                <Star size={14} />
              </button>

              {favoritesMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-60 rounded-2xl bg-white border border-[#EAECEF] p-2 shadow-[0_12px_36px_rgba(16,15,17,0.14)] animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-2 py-1.5 border-b border-[#EAECEF]/70 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      Favorites
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {PINNED_FAVORITES.length === 0 ? (
                      <li className="px-2 py-2 text-[11px] text-[#9CA3AF]">
                        Belum ada favorit tersemat.
                      </li>
                    ) : (
                      PINNED_FAVORITES.map((fav) => (
                        <li key={fav.title}>
                          <button
                            type="button"
                            onClick={() => {
                              setFavoritesMenuOpen(false);
                              onSelectNav("content");
                              if (onOpenContentDetail) {
                                onOpenContentDetail(fav.title, fav.type);
                              } else {
                                onShowToast(`Opened favorite: ${fav.title}`);
                              }
                            }}
                            className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-[#F8F9FB] transition-all cursor-pointer"
                          >
                            <ContentIconBox type={fav.type} size="sm" />
                            <span className="truncate text-xs font-medium text-[#121215]">
                              {fav.title}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Tambah Cohort Baru */}
      {createCohortModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setCreateCohortModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#EAECEF] cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                  <Plus size={16} strokeWidth={2.5} />
                </span>
                <h3 className="text-sm font-bold text-[#121215]">
                  Tambah Cohort / Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateCohortModalOpen(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#121215] hover:bg-[#F8F9FB] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateCohort} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Nama Cohort / Batch
                </label>
                <input
                  type="text"
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="Contoh: Batch November 2026..."
                  autoFocus
                  required
                  className="w-full rounded-xl bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-2">
                  Warna Label Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COHORT_COLOR_PRESETS.map((col) => {
                    const isSelected = newCohortColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setNewCohortColor(col.value)}
                        title={col.label}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-[#121215] scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.value }}
                      >
                        {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
                <button
                  type="button"
                  onClick={() => setCreateCohortModalOpen(false)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newCohortName.trim()}
                  className="rounded-xl bg-[#4F39F6] hover:bg-[#4332D6] disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                >
                  Tambah Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Cohort (Rename & Change Color) */}
      {editingCohort && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingCohort(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#EAECEF] cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                  <Pencil size={15} />
                </span>
                <h3 className="text-sm font-bold text-[#121215]">
                  Edit Cohort / Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCohort(null)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#121215] hover:bg-[#F8F9FB] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmEditCohort} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Nama Cohort / Batch
                </label>
                <input
                  type="text"
                  value={editCohortName}
                  onChange={(e) => setEditCohortName(e.target.value)}
                  autoFocus
                  required
                  className="w-full rounded-xl bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-2">
                  Warna Label Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COHORT_COLOR_PRESETS.map((col) => {
                    const isSelected = editCohortColor === col.value;
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setEditCohortColor(col.value)}
                        title={col.label}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-[#121215] scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.value }}
                      >
                        {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
                <button
                  type="button"
                  onClick={() => setEditingCohort(null)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!editCohortName.trim()}
                  className="rounded-xl bg-[#4F39F6] hover:bg-[#4332D6] disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Cohort Confirmation */}
      {deletingCohort && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeletingCohort(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#EAECEF] cursor-default"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200">
                <Trash2 size={20} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#121215]">
                  Hapus Cohort / Project
                </h3>
                <p className="text-xs text-[#5E5E5E] mt-0.5">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-xs text-[#5E5E5E] leading-relaxed">
              Apakah Anda yakin ingin menghapus cohort{" "}
              <strong className="text-[#121215] font-semibold">
                &ldquo;{deletingCohort.name}&rdquo;
              </strong>
              ? Data learner dan materi tetap aman di sistem.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCohort(null)}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCohort}
                className="rounded-xl bg-[#EF4444] hover:bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Guide & Support Documentation Modal */}
      <MentorGuideModal
        open={mentorGuideOpen}
        onClose={() => setMentorGuideOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
}
