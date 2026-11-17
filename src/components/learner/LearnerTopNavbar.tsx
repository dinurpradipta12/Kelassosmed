"use client";

import React, { useState } from "react";
import {
  Search,
  Bell,
  Star,
  CheckCheck,
  Home,
  BookOpen,
  Compass,
  Library,
  Heart,
  Zap,
  Lock,
  Sparkles,
  FileText,
  Download,
  X,
  RotateCcw,
  UserPlus,
  Check,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";

export type LearnerNavTabId =
  | "home"
  | "my-learning"
  | "catalog"
  | "wiki"
  | "favorites"
  | "profile";

interface LearnerTopNavbarProps {
  currentUser?: AuthenticatedUser | null;
  activeTab: LearnerNavTabId;
  onSelectTab: (tab: LearnerNavTabId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalPoints: number;
  onShowToast: (msg: string) => void;
  onOpenUpgradeModal?: () => void;
  onOpenRewardsModal?: () => void;
  onSwitchToAdmin?: () => void;
}

export function LearnerTopNavbar({
  currentUser,
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  totalPoints,
  onShowToast,
  onOpenUpgradeModal,
  onOpenRewardsModal,
  onSwitchToAdmin,
}: LearnerTopNavbarProps) {
  const {
    learnerNotifications,
    markAllNotificationsRead,
    acceptCollaboratorInvitation,
    learnerIsPro,
    certificateUnlocked,
    learnerAssignedItems,
    wikiResources,
    resolveUserAvatar,
  } = useRuangSosmedStore();
  const [notifOpen, setNotifOpen] = useState(false);

  // Search Command Palette Modal (⌘K)
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [aiQueryText, setAiQueryText] = useState("");

  React.useEffect(() => {
    if (!aiSearchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAiSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiSearchOpen]);

  const displayName =
    currentUser?.name === "Arunika Developer"
      ? "Dinur Pradipta"
      : currentUser?.name || currentUser?.username || "Learner";

  const [navbarAvatar, setNavbarAvatar] = useState<string | null>(null);
  const [navbarName, setNavbarName] = useState<string | null>(null);

  React.useEffect(() => {
    const syncNavProfile = () => {
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
          if (p.fullName && p.fullName !== "Arunika Developer") {
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
          if (s.name && s.name !== "Arunika Developer") {
            nextName = s.name;
          }
        }

        if (nextAvatar) setNavbarAvatar(nextAvatar);
        if (nextName) setNavbarName(nextName);
      } catch {}
    };
    syncNavProfile();
    window.addEventListener("ruang_sosmed_profile_updated", syncNavProfile);
    window.addEventListener("storage", syncNavProfile);
    return () => {
      window.removeEventListener("ruang_sosmed_profile_updated", syncNavProfile);
      window.removeEventListener("storage", syncNavProfile);
    };
  }, [currentUser?.role]);

  const effectiveDisplayName = navbarName || displayName;
  const effectiveAvatar =
    navbarAvatar ||
    currentUser?.avatarUrl ||
    resolveUserAvatar(
      currentUser?.email,
      effectiveDisplayName,
      currentUser?.name,
      currentUser?.username
    ) ||
    null;
  const effectiveInitials =
    effectiveDisplayName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "L";

  const uniqueNotifications = React.useMemo(() => {
    const seen = new Set<string>();
    const result: typeof learnerNotifications = [];
    for (const n of learnerNotifications) {
      if (n && n.id && !seen.has(n.id)) {
        seen.add(n.id);
        result.push(n);
      }
    }
    return result;
  }, [learnerNotifications]);

  const unreadCount = uniqueNotifications.filter((n) => n.unread).length;

  const navTabs: {
    id: LearnerNavTabId;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
  }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "my-learning", label: "My Learning", icon: BookOpen },
    { id: "catalog", label: "Catalog", icon: Compass },
    { id: "wiki", label: "Wiki", icon: Library },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#EAECEF] shadow-[0_1px_4px_rgba(16,15,17,0.03)]">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* LEFT: Full 'ruang sosmed 2.0' brand logo (with rs. icon badge) + Global Search Bar + Horizontal Nav Tabs */}
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onSelectTab("home")}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          >
            <img
              src="/logo1.png"
              alt="Ruang Sosmed 2.0"
              className="h-9 w-auto max-w-[160px] object-contain"
            />
          </button>

          {/* Global Search Bar + ✨ Ask AI Trigger (ref_17a/b/c) */}
          <div className="hidden md:flex relative w-44 lg:w-60 xl:w-72 shrink items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setAiSearchOpen(true)}
                placeholder="Search courses, paths, or wikis..."
                aria-label="Search courses, paths, or wikis"
                className="w-full rounded-lg bg-[#F8F9FB] pl-8 pr-11 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center rounded bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-semibold text-[#9CA3AF] border border-[#EAECEF]">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Horizontal Navigation Tabs */}
          <nav
            aria-label="Learner Portal Navigation"
            className="hidden lg:flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar"
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#4F39F6]/10 text-[#4F39F6]"
                      : "text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215]"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {(tab.id === "wiki" || tab.id === "favorites") &&
                    !learnerIsPro && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#FEF3C7] border border-[#F59E0B]/30 px-1 py-0.2 text-[9px] font-bold text-[#B45309]">
                        <Lock size={9} />
                        PRO
                      </span>
                    )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* RIGHT: Learner PRO Badge/Upgrade Button, Gamification Points Pill (⭐ 1,240 pts), Notification Bell Popover, Learner Profile */}
        <div className="flex items-center gap-2.5 shrink-0 z-10 bg-[#FFFFFF] pl-2">
          {onOpenUpgradeModal && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                learnerIsPro
                  ? "bg-[#ECFDF5] border-[#10B981]/35 text-[#059669] hover:bg-[#D1FAE5]"
                  : "bg-[#F59E0B] hover:bg-[#D97706] border-[#D97706] text-[#121215] shadow-[0_2px_6px_rgba(245,158,11,0.28)]"
              }`}
            >
              <Zap size={13} fill="currentColor" />
              <span>{learnerIsPro ? "PRO Member" : "Upgrade PRO"}</span>
            </button>
          )}

          {/* Gamification Points Pill (Clickable -> Opens Rewards Shop) */}
          <button
            type="button"
            onClick={onOpenRewardsModal}
            title="Klik untuk membuka Ruang Sosmed Rewards Shop (Tukar Poin Hadiah)"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B]/35 px-2.5 py-1 text-xs font-bold text-[#B45309] shadow-2xs transition-colors cursor-pointer"
          >
            <Star size={13} className="text-[#F59E0B]" fill="#F59E0B" />
            <span className="tabular-nums">
              {totalPoints.toLocaleString()} pts
            </span>
          </button>

          {/* Notification Bell Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Learner notifications"
              aria-expanded={notifOpen}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215] transition-colors cursor-pointer"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications Popover"
                className="absolute right-0 mt-2 w-88 rounded-xl bg-[#FFFFFF] p-3.5 border border-[#EAECEF] shadow-[0_12px_32px_rgba(16,15,17,0.12)] z-40"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#EAECEF]">
                  <span className="text-xs font-bold text-[#121215]">
                    Notifications ({unreadCount} unread)
                  </span>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                  >
                    <CheckCheck size={12} />
                    <span>Mark as read</span>
                  </button>
                </div>

                <div className="mt-2.5 space-y-3 max-h-80 overflow-y-auto">
                  {uniqueNotifications.length === 0 && !certificateUnlocked ? (
                    <div className="py-6 text-center text-xs text-[#9CA3AF]">
                      Belum ada notifikasi baru.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {uniqueNotifications.map((n, idx) => {
                        const isInvitation =
                          n.title.toLowerCase().includes("undangan") ||
                          n.title.toLowerCase().includes("kolaborasi") ||
                          n.title.toLowerCase().includes("resmi bergabung");

                        const isAccepted =
                          n.title.toLowerCase().includes("resmi bergabung") ||
                          n.body.toLowerCase().includes("resmi menjadi") ||
                          n.body.toLowerCase().includes("telah aktif bergabung");

                        return (
                          <div
                            key={`${n.id}-${idx}`}
                            onClick={markAllNotificationsRead}
                            className={`rounded-lg p-2.5 border text-left transition-colors cursor-pointer ${
                              n.unread
                                ? isInvitation
                                  ? "bg-[#EEF2FF] border-[#4F39F6]/40 shadow-xs"
                                  : "bg-[#4F39F6]/5 border-[#4F39F6]/20"
                                : isAccepted
                                ? "bg-[#ECFDF5] border-[#10B981]/30"
                                : "bg-[#F8F9FB] border-[#EAECEF]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isAccepted ? (
                                  <CheckCircle2
                                    size={13}
                                    className="text-[#10B981] shrink-0"
                                  />
                                ) : isInvitation ? (
                                  <UserPlus
                                    size={13}
                                    className="text-[#4F39F6] shrink-0"
                                  />
                                ) : null}
                                <p className="text-xs font-bold text-[#121215] truncate">
                                  {n.title}
                                </p>
                              </div>
                              <span className="text-[10px] text-[#9CA3AF] shrink-0">
                                {n.time}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#5E5E5E] leading-snug">
                              {n.body}
                            </p>

                            {isInvitation && (
                              <div className="mt-2.5 pt-2 border-t border-[#EAECEF] flex items-center justify-between">
                                {isAccepted && currentUser?.role === "admin" ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669]">
                                      <CheckCircle2 size={11} />
                                      Aktif sebagai Admin
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNotifOpen(false);
                                        if (onSwitchToAdmin) {
                                          onSwitchToAdmin();
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-[#059669] hover:bg-[#047857] px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-xs"
                                    >
                                      <span>Buka Admin Studio</span>
                                      <ArrowRight size={11} />
                                    </button>
                                  </>
                                ) : isAccepted ? (
                                  <span className="text-[10px] font-medium text-[#5E5E5E]">
                                    Peran Akun: Siswa Learner
                                  </span>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4F39F6]">
                                      {n.unread ? "• Menunggu Konfirmasi" : "✓ Telah Dilihat"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        acceptCollaboratorInvitation({
                                          email: currentUser?.email || "afterlance@gmail.com",
                                          role: "Admin",
                                          cohort: "Ruang Sosmed Class",
                                        });
                                        onShowToast(
                                          "🎉 Selamat! Anda telah resmi bergabung sebagai Admin pada Ruang Sosmed 2.0 Workspace!"
                                        );
                                        if (onSwitchToAdmin) {
                                          setTimeout(() => {
                                            setNotifOpen(false);
                                            onSwitchToAdmin();
                                          }, 400);
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-[#4F39F6] hover:bg-[#3E29D8] px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-xs"
                                    >
                                      <Check size={11} />
                                      <span>Terima Undangan</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {certificateUnlocked && (
                        <div className="rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#059669]">
                              🎉 E-Certificate Issued (+100 pts)
                            </span>
                            <span className="text-[10px] text-[#059669]">
                              Verified
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-[#FFFFFF] p-2 border border-[#EAECEF]">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-[#EF4444] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-[#121215] truncate">
                                  E-Certificate-Ruang-Sosmed.pdf
                                </p>
                                <p className="text-[10px] text-[#9CA3AF]">
                                  1.4 MB • Verified Credential
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onShowToast("Downloading E-Certificate PDF...")
                              }
                              className="p-1.5 rounded bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white text-[#121215] cursor-pointer"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Learner Profile Dynamic Info (Opens Individual Profile Page) */}
          <button
            type="button"
            onClick={() => onSelectTab("profile")}
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "bg-[#FEF3C7]/60 border-[#F59E0B]"
                : "bg-[#F8F9FB] border-[#EAECEF] hover:border-[#D1D5DB]"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDE68A] text-[#92400E] border border-[#F59E0B]/40 text-xs font-bold overflow-hidden">
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={effectiveDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                effectiveInitials
              )}
            </span>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#121215] leading-tight">
                {effectiveDisplayName}
              </p>
              <p className="text-[10px] text-[#5E5E5E] leading-tight">
                Social Media Specialist
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Sub-navigation strip */}
      <div className="flex lg:hidden items-center gap-1 overflow-x-auto px-4 py-2 border-t border-[#EAECEF] bg-[#F9FAFB]">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                isActive
                  ? "bg-[#4F39F6] text-white"
                  : "text-[#5E5E5E] hover:bg-[#FFFFFF]"
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Trenning AI Assist Search Command Palette Modal (ref_17a, ref_17b, ref_17c) */}
      {aiSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search Command Palette"
          onClick={() => setAiSearchOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-16 p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl overflow-hidden cursor-default"
          >
            {/* Search Input Top Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EAECEF]">
              <Search size={16} className="text-[#4F39F6] shrink-0" />
              <input
                type="text"
                value={aiQueryText}
                onChange={(e) => {
                  setAiQueryText(e.target.value);
                  onSearchChange(e.target.value);
                }}
                placeholder="Search courses, pages, or wikis..."
                className="flex-1 text-xs font-semibold text-[#121215] bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAiSearchOpen(false)}
                className="p-1 text-[#9CA3AF] hover:text-[#121215] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 bg-[#F9FAFB] border-b border-[#EAECEF] text-[11px]">
              {[
                "Sort by: Relevance",
                "All contents",
                "Created by: Anyone",
                "Date: Any time",
              ].map((pill) => (
                <span
                  key={pill}
                  className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 font-semibold text-[#5E5E5E] border border-[#EAECEF]"
                >
                  {pill}
                </span>
              ))}
            </div>

            {/* Categorized Search Results */}
            <div className="px-4 py-4 space-y-3 max-h-60 overflow-y-auto">
              {learnerAssignedItems.length === 0 && wikiResources.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF]">
                  Belum ada materi kursus, kuis, atau wiki yang tersedia.
                </div>
              ) : (
                <>
                  {learnerAssignedItems.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                        Courses &amp; Assessments
                      </p>
                      <div className="space-y-1">
                        {learnerAssignedItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSearchChange(item.title);
                              setAiSearchOpen(false);
                            }}
                            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            <div>
                              <p className="text-xs font-bold text-[#121215]">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-[#5E5E5E]">
                                {item.duration} • {item.progressPercent}% Done
                              </p>
                            </div>
                            <span className="rounded bg-[#F8F9FB] px-2 py-0.5 text-[10px] font-bold text-[#4F39F6] border border-[#EAECEF]">
                              {item.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {wikiResources.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                        Wiki Directory
                      </p>
                      {wikiResources.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            onSelectTab("wiki");
                            setAiSearchOpen(false);
                          }}
                          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#F8F9FB] cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-[#121215]">
                              {w.title}
                            </p>
                            <p className="text-[10px] text-[#5E5E5E]">
                              Wiki • {w.category}
                            </p>
                          </div>
                          <span className="rounded bg-[#F8F9FB] px-2 py-0.5 text-[10px] font-bold text-[#059669] border border-[#EAECEF]">
                            Wiki
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Keyboard Navigation Hints Bar (ref_17b) */}
            <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#EAECEF] flex items-center justify-between text-[11px] text-[#5E5E5E]">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="rounded bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-bold border border-[#EAECEF]">
                    ↑↓
                  </kbd>{" "}
                  to navigate
                </span>
                <span>
                  <kbd className="rounded bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-bold border border-[#EAECEF]">
                    ↵
                  </kbd>{" "}
                  to confirm
                </span>
                <span>
                  <kbd className="rounded bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-bold border border-[#EAECEF]">
                    esc
                  </kbd>{" "}
                  to close
                </span>
              </div>
              <span className="font-semibold text-[#5E5E5E]">
                Quick Search (⌘K)
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
