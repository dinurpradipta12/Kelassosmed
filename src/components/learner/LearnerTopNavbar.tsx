"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Bell,
  BellRing,
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
  Crown,
  MessageSquare,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useRuangSosmedStore,
  inferLearnerNotifEventType,
  extractNotificationContentTitle,
  isLearnerAssignedToContentTitle,
  doesLearnerOwnAnyMaterial,
} from "@/context/RuangSosmedStore";
import {
  type LearnerNotification,
  type LearnerNotificationEventType,
} from "@/lib/phase5-data";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";

const LEARNER_SEEN_POPUP_IDS_KEY = "ruang_sosmed_learner_seen_popup_ids_v1";
const LEARNER_NOTIF_MUTED_KEY = "ruang_sosmed_learner_notif_muted_v1";
const MAX_LEARNER_POPUPS = 3;
const LEARNER_AUTO_DISMISS_MS = 8000;

let sharedLearnerAudioCtx: AudioContext | null = null;

function getOrUnlockAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedLearnerAudioCtx || sharedLearnerAudioCtx.state === "closed") {
      sharedLearnerAudioCtx = new AudioCtx();
    }
    if (sharedLearnerAudioCtx.state === "suspended") {
      void sharedLearnerAudioCtx.resume().catch(() => {});
    }
    return sharedLearnerAudioCtx;
  } catch {
    return null;
  }
}

function playLearnerNotifChime(eventType: LearnerNotificationEventType): void {
  const ctx = getOrUnlockAudioContext();
  if (!ctx) return;

  const scheduleNotes = () => {
    try {
      const now = ctx.currentTime;
      const freqs =
        eventType === "pro_activated"
          ? [659.25, 880, 1046.5]
          : eventType === "material_added"
          ? [523.25, 659.25, 783.99]
          : [587.33, 880];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.085);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.085);
        gain.gain.exponentialRampToValueAtTime(
          0.06,
          now + idx * 0.085 + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + idx * 0.085 + 0.24
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.085);
        osc.stop(now + idx * 0.085 + 0.26);
      });
    } catch {}
  };

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(() => scheduleNotes())
      .catch(() => {});
  } else {
    scheduleNotes();
  }
}

function readLearnerSeenPopupIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LEARNER_SEEN_POPUP_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeLearnerSeenPopupIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const list = Array.from(ids).slice(-120);
    window.localStorage.setItem(LEARNER_SEEN_POPUP_IDS_KEY, JSON.stringify(list));
  } catch {}
}

function formatLearnerNotifTime(notif: LearnerNotification): string {
  if (!notif.createdAt) return notif.time || "Baru saja";
  const ts = Date.parse(notif.createdAt);
  if (Number.isNaN(ts)) return notif.time || "Baru saja";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return "Baru saja";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLearnerNotifCategoryMeta(eventType: LearnerNotificationEventType) {
  switch (eventType) {
    case "pro_activated":
      return {
        gradient: "linear-gradient(90deg, #F59E0B 0%, #EC4899 100%)",
        iconBg: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
        badgeClass: "bg-[#FEF3C7] text-[#92400E]",
        badgeLabel: "PRO Aktif",
        headline: "Yuhuu! ⚡ PRO Aktif",
        actionLabel: "Lihat Benefit PRO",
        Icon: Crown,
      };
    case "material_added":
      return {
        gradient: "linear-gradient(90deg, #4F39F6 0%, #10B981 100%)",
        iconBg: "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE]",
        badgeClass: "bg-[#ECFDF5] text-[#059669]",
        badgeLabel: "Materi Baru",
        headline: "Materi Baru! 📚",
        actionLabel: "Mulai Belajar",
        Icon: BookOpen,
      };
    case "mentor_reply":
      return {
        gradient: "linear-gradient(90deg, #6366F1 0%, #0EA5E9 100%)",
        iconBg: "bg-[#EFF6FF] text-[#0284C7] border-[#BAE6FD]",
        badgeClass: "bg-[#E0F2FE] text-[#0369A1]",
        badgeLabel: "Balasan Mentor",
        headline: "Balasan Baru! 💬",
        actionLabel: "Lihat Diskusi",
        Icon: MessageSquare,
      };
    default:
      return {
        gradient: "linear-gradient(90deg, #4F39F6 0%, #8B5CF6 100%)",
        iconBg: "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE]",
        badgeClass: "bg-[#EEF2FF] text-[#4F39F6]",
        badgeLabel: "Info Belajar",
        headline: "Pembaruan Akun ✨",
        actionLabel: "Buka Belajar",
        Icon: Sparkles,
      };
  }
}

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
    markLearnerNotificationRead,
    clearLearnerNotifications,
    learnerIsPro,
    learnerPagesConfig,
    certificateUnlocked,
    learnerAssignedItems,
    explorerItems,
    courseCurriculums,
    wikiResources,
    resolveUserAvatar,
  } = useRuangSosmedStore();
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<
    "all" | "pro_activated" | "material_added" | "mentor_reply"
  >("all");
  const [activePopups, setActivePopups] = useState<LearnerNotification[]>([]);
  const [isPopupPaused, setIsPopupPaused] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LEARNER_NOTIF_MUTED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const notifContainerRef = useRef<HTMLDivElement | null>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const deferredPopupsRef = useRef<LearnerNotification[]>([]);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  useEffect(() => {
    setMounted(true);
    const unlock = () => {
      getOrUnlockAudioContext();
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleMuted = () => {
    getOrUnlockAudioContext();
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LEARNER_NOTIF_MUTED_KEY, String(next));
        } catch {}
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (!notifOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
      }
    };
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [notifOpen]);

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
    currentUser?.name === "Arunika Developer" ||
    currentUser?.name?.trim().toLowerCase() === "arunika"
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

  const matchesCurrentLearner = useCallback(
    (n: LearnerNotification): boolean => {
      if (n?.targetLearner && currentUser?.role !== "admin") {
        const target = n.targetLearner.trim().toLowerCase();
        if (target) {
          const candidates = [
            currentUser?.email,
            currentUser?.name,
            currentUser?.username,
            effectiveDisplayName,
          ]
            .filter(Boolean)
            .map((s) => String(s).trim().toLowerCase());
          const isTargetMatch = candidates.some(
            (c) => c === target || target.includes(c) || c.includes(target)
          );
          if (!isTargetMatch) return false;
        }
      }

      const learnerIdentity = {
        email: currentUser?.email,
        name: effectiveDisplayName || currentUser?.name,
        username: currentUser?.username,
      };

      const contentTitle = extractNotificationContentTitle(n);
      if (contentTitle) {
        const hasAccess = isLearnerAssignedToContentTitle(
          contentTitle,
          explorerItems,
          learnerIdentity,
          courseCurriculums
        );
        if (!hasAccess) return false;
      }

      if (inferLearnerNotifEventType(n) === "material_added") {
        if (!doesLearnerOwnAnyMaterial(explorerItems, learnerIdentity)) {
          return false;
        }
      }

      return true;
    },
    [
      currentUser?.email,
      currentUser?.name,
      currentUser?.username,
      currentUser?.role,
      effectiveDisplayName,
      explorerItems,
      courseCurriculums,
    ]
  );

  const uniqueNotifications = useMemo(() => {
    const seen = new Set<string>();
    const result: LearnerNotification[] = [];
    for (const n of learnerNotifications) {
      if (n && n.id && !seen.has(n.id) && matchesCurrentLearner(n)) {
        seen.add(n.id);
        result.push({
          ...n,
          eventType: inferLearnerNotifEventType(n),
        });
      }
    }
    return result;
  }, [learnerNotifications, matchesCurrentLearner]);

  const unreadCount = uniqueNotifications.filter((n) => n.unread).length;

  const filteredNotifications = useMemo(() => {
    if (filterTab === "all") return uniqueNotifications;
    return uniqueNotifications.filter(
      (n) => inferLearnerNotifEventType(n) === filterTab
    );
  }, [uniqueNotifications, filterTab]);

  const showPopupCard = useCallback((notif: LearnerNotification) => {
    const evType = inferLearnerNotifEventType(notif);
    setActivePopups((prev) => {
      if (prev.some((p) => p.id === notif.id)) return prev;
      return [{ ...notif, eventType: evType }, ...prev].slice(
        0,
        MAX_LEARNER_POPUPS
      );
    });

    const announceText = `${notif.title}: ${notif.body}`;
    setLiveAnnouncement(announceText);
    if (typeof document !== "undefined") {
      const docWithNotify = document as unknown as {
        ariaNotify?: (text: string) => void;
      };
      if (typeof docWithNotify.ariaNotify === "function") {
        try {
          docWithNotify.ariaNotify(announceText);
        } catch {}
      }
    }

    if (!isMutedRef.current) {
      playLearnerNotifChime(evType);
    }
  }, []);

  const hasBlockingModal = () =>
    typeof document !== "undefined" &&
    Boolean(
      document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
    );

  const enqueueFloatingPopup = useCallback(
    (notif: LearnerNotification) => {
      if (!notif?.id || !matchesCurrentLearner(notif)) return;
      const seen = readLearnerSeenPopupIds();
      if (seen.has(notif.id)) return;
      seen.add(notif.id);
      writeLearnerSeenPopupIds(seen);

      if (hasBlockingModal()) {
        if (!deferredPopupsRef.current.some((d) => d.id === notif.id)) {
          deferredPopupsRef.current.push(notif);
        }
        return;
      }

      showPopupCard(notif);
    },
    [matchesCurrentLearner, showPopupCard]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      if (deferredPopupsRef.current.length === 0) return;
      if (hasBlockingModal()) return;
      const toFlush = deferredPopupsRef.current.splice(0);
      toFlush.forEach((n) => showPopupCard(n));
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-modal"],
    });
    return () => observer.disconnect();
  }, [showPopupCard]);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent<LearnerNotification>;
      if (custom.detail) {
        enqueueFloatingPopup(custom.detail);
      }
    };
    window.addEventListener("ruang_sosmed_learner_notif", handleEvent);
    return () => {
      window.removeEventListener("ruang_sosmed_learner_notif", handleEvent);
    };
  }, [enqueueFloatingPopup]);

  useEffect(() => {
    setActivePopups((prev) => {
      const next = prev.filter((p) => matchesCurrentLearner(p));
      return next.length === prev.length ? prev : next;
    });
  }, [matchesCurrentLearner]);

  useEffect(() => {
    const fresh = (learnerNotifications || []).filter((n) => {
      if (!n || !n.unread || !matchesCurrentLearner(n)) return false;
      const createdMs = n.createdAt ? Date.parse(n.createdAt) : NaN;
      return !Number.isNaN(createdMs) && Date.now() - createdMs <= 60_000;
    });
    fresh.forEach((n) => enqueueFloatingPopup(n));
  }, [learnerNotifications, enqueueFloatingPopup, matchesCurrentLearner]);

  const dismissPopup = useCallback((id: string) => {
    setActivePopups((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const remaining = prev.filter((p) => p.id !== id);
      const closingBtn = closeBtnRefs.current.get(id);
      const wasFocused =
        typeof document !== "undefined" &&
        closingBtn &&
        document.activeElement === closingBtn;

      if (wasFocused) {
        window.requestAnimationFrame(() => {
          const nextPopup = remaining[Math.min(idx, remaining.length - 1)];
          const nextClose = nextPopup
            ? closeBtnRefs.current.get(nextPopup.id)
            : null;
          if (nextClose) {
            nextClose.focus();
          } else {
            triggerBtnRef.current?.focus();
          }
        });
      }
      return remaining;
    });
  }, []);

  useEffect(() => {
    const el = popoverRef.current as
      | (HTMLDivElement & {
          showPopover?: () => void;
          hidePopover?: () => void;
        })
      | null;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      const shouldShow = activePopups.length > 0 && !notifOpen;
      const isOpen = el.matches(":popover-open");
      if (shouldShow && !isOpen) {
        el.showPopover();
      } else if (!shouldShow && isOpen) {
        el.hidePopover?.();
      }
    } catch {}
  }, [activePopups.length, notifOpen, mounted]);

  useEffect(() => {
    if (activePopups.length === 0 || isPopupPaused || notifOpen) return;
    const oldest = activePopups[activePopups.length - 1];
    const timer = window.setTimeout(() => {
      dismissPopup(oldest.id);
    }, LEARNER_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [activePopups, isPopupPaused, notifOpen, dismissPopup]);

  const handleNotifNavigate = useCallback(
    (notif: LearnerNotification) => {
      const evType = inferLearnerNotifEventType(notif);
      markLearnerNotificationRead(notif.id);
      dismissPopup(notif.id);
      setNotifOpen(false);
      if (evType === "pro_activated") {
        if (onOpenUpgradeModal) {
          onOpenUpgradeModal();
        } else {
          onSelectTab("home");
        }
      } else {
        onSelectTab("my-learning");
      }
    },
    [markLearnerNotificationRead, dismissPopup, onOpenUpgradeModal, onSelectTab]
  );

  const showWikiPage = learnerPagesConfig?.showWikiPage ?? true;
  const showFavoritesPage = learnerPagesConfig?.showFavoritesPage ?? true;

  const navTabs: {
    id: LearnerNavTabId;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
  }[] = (
    [
      { id: "home" as const, label: "Home", icon: Home },
      { id: "my-learning" as const, label: "My Learning", icon: BookOpen },
      { id: "catalog" as const, label: "Catalog", icon: Compass },
      ...(showWikiPage
        ? [{ id: "wiki" as const, label: "Wiki", icon: Library }]
        : []),
      ...(showFavoritesPage
        ? [{ id: "favorites" as const, label: "Favorites", icon: Heart }]
        : []),
    ]
  );

  const visibleSearchAssignedItems = showWikiPage
    ? learnerAssignedItems
    : learnerAssignedItems.filter((item) => item.type !== "Wiki");

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
                placeholder={
                  showWikiPage
                    ? "Search courses, paths, or wikis..."
                    : "Search courses or paths..."
                }
                aria-label={
                  showWikiPage
                    ? "Search courses, paths, or wikis"
                    : "Search courses or paths"
                }
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

          {/* Notification Bell Popover (Matching Admin Notification Experience + Sound Chimes) */}
          <div className="relative" ref={notifContainerRef}>
            {unreadCount > 0 && !notifOpen && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-0.5 rounded-lg bg-[#4F39F6]/20 animate-ping"
                style={{ animationDuration: "2.4s" }}
              />
            )}
            <button
              ref={triggerBtnRef}
              type="button"
              onClick={() => {
                getOrUnlockAudioContext();
                setNotifOpen((prev) => !prev);
              }}
              aria-label={
                unreadCount > 0
                  ? `Notifikasi Belajar (${unreadCount} belum dibaca)`
                  : "Notifikasi Belajar"
              }
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
              title="Notifikasi Status PRO, Materi Baru & Balasan Diskusi"
              className={`relative inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                notifOpen
                  ? "bg-[#4F39F6] text-white border-[#4F39F6] shadow-2xs"
                  : unreadCount > 0
                  ? "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE] hover:bg-[#E0E7FF]"
                  : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:bg-[#EAECEF]/70 hover:text-[#121215]"
              }`}
            >
              {unreadCount > 0 && !notifOpen ? (
                <BellRing size={14} className="shrink-0 text-[#4F39F6]" />
              ) : (
                <Bell size={14} className="shrink-0" />
              )}
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold leading-none tabular-nums">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-modal="false"
                aria-label="Riwayat Notifikasi Learner"
                className="absolute right-0 mt-2 w-[min(380px,calc(100vw-2rem))] rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_18px_48px_rgba(16,15,17,0.16)] overflow-hidden z-50"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#EAECEF] flex items-center justify-between gap-2 bg-[#F8F9FB]">
                  <div className="flex items-center gap-2 min-w-0">
                    <BellRing size={15} className="text-[#4F39F6] shrink-0" />
                    <div className="min-w-0">
                      <h2 className="text-xs font-extrabold text-[#121215] truncate">
                        Notifikasi Belajar &amp; Akun
                      </h2>
                      <p className="text-[10px] text-[#64748B]">
                        Status PRO, materi baru &amp; balasan diskusi mentor
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={toggleMuted}
                      title={
                        isMuted ? "Aktifkan suara notifikasi" : "Bisukan suara"
                      }
                      aria-label={
                        isMuted ? "Aktifkan suara notifikasi" : "Bisukan suara"
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-white hover:text-[#121215] cursor-pointer"
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        title="Tandai semua dibaca"
                        aria-label="Tandai semua dibaca"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4F39F6] hover:bg-white cursor-pointer"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    {uniqueNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearLearnerNotifications}
                        title="Hapus semua notifikasi"
                        aria-label="Hapus semua notifikasi"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white hover:text-[#EF4444] cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        triggerBtnRef.current?.focus();
                      }}
                      aria-label="Tutup panel notifikasi"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-white hover:text-[#121215] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-3 py-2 border-b border-[#EAECEF] flex items-center gap-1 bg-white overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: "all", label: "Semua" },
                      { id: "pro_activated", label: "PRO Aktif" },
                      { id: "material_added", label: "Materi Baru" },
                      { id: "mentor_reply", label: "Balasan Mentor" },
                    ] as const
                  ).map((tab) => {
                    const active = filterTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilterTab(tab.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          active
                            ? "bg-[#4F39F6] text-white"
                            : "bg-[#F8F9FB] text-[#5E5E5E] hover:text-[#121215]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable List */}
                <div className="max-h-[380px] overflow-y-auto overscroll-contain divide-y divide-[#F1F5F9]">
                  {filteredNotifications.length === 0 && !certificateUnlocked ? (
                    <div className="py-10 px-4 text-center space-y-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F9FB] border border-[#EAECEF] text-[#9CA3AF]">
                        <Bell size={18} />
                      </div>
                      <p className="text-xs font-bold text-[#121215]">
                        Belum Ada Notifikasi Baru
                      </p>
                      <p className="text-[11px] text-[#64748B] max-w-[260px] mx-auto leading-relaxed">
                        Notifikasi otomatis berbunyi &amp; muncul di sini saat PRO aktif, ada materi baru, atau mentor membalas diskusi Anda.
                      </p>
                    </div>
                  ) : (
                    <>
                      {filteredNotifications.map((n, idx) => {
                        const evType = inferLearnerNotifEventType(n);
                        const meta = getLearnerNotifCategoryMeta(evType);
                        const CategoryIcon = meta.Icon;
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
                            onClick={() => handleNotifNavigate(n)}
                            className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                              n.unread
                                ? "bg-[#EEF2FF]/35 hover:bg-[#EEF2FF]/60"
                                : isAccepted
                                ? "bg-[#ECFDF5]/50 hover:bg-[#ECFDF5]"
                                : "bg-white hover:bg-[#F8F9FB]"
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                                isAccepted
                                  ? "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]"
                                  : isInvitation
                                  ? "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE]"
                                  : meta.iconBg
                              }`}
                            >
                              {isAccepted ? (
                                <CheckCircle2 size={15} />
                              ) : isInvitation ? (
                                <UserPlus size={15} />
                              ) : (
                                <CategoryIcon size={15} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-extrabold text-[#121215] truncate">
                                  {n.title}
                                </span>
                                {n.unread && (
                                  <span className="h-2 w-2 rounded-full bg-[#4F39F6] shrink-0" />
                                )}
                              </div>

                              <p className="text-[11px] text-[#475569] leading-relaxed">
                                {n.body}
                              </p>

                              <div className="flex items-center justify-between gap-2 text-[10px] text-[#9CA3AF]">
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${meta.badgeClass}`}
                                >
                                  {meta.badgeLabel}
                                </span>
                                <span className="shrink-0">
                                  {formatLearnerNotifTime(n)}
                                </span>
                              </div>

                              {isInvitation && (
                                <div className="mt-2 pt-2 border-t border-[#EAECEF] flex items-center justify-between">
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
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4F39F6]">
                                      {n.unread ? "• Belum Dibaca" : "✓ Telah Dilihat"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {certificateUnlocked && filterTab === "all" && (
                        <div className="p-3 bg-[#ECFDF5]/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#059669]">
                              🎉 E-Certificate Issued (+100 pts)
                            </span>
                            <span className="text-[10px] font-bold text-[#059669]">
                              Verified
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-[#FFFFFF] p-2 border border-[#EAECEF]">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                size={14}
                                className="text-[#EF4444] shrink-0"
                              />
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {mounted &&
            typeof document !== "undefined" &&
            createPortal(
              <>
                <div aria-live="assertive" className="sr-only">
                  {liveAnnouncement}
                </div>

                {/* Live Floating Popup Notifications (Top Layer manual popover directly below bell button) */}
                <div
                  ref={popoverRef}
                  role="region"
                  aria-label="Notifikasi Aktivitas Learner"
                  {...({ popover: "manual" } as Record<string, string>)}
                  onMouseEnter={() => setIsPopupPaused(true)}
                  onMouseLeave={() => setIsPopupPaused(false)}
                  onFocusCapture={() => setIsPopupPaused(true)}
                  onBlurCapture={(e) => {
                    if (
                      !popoverRef.current?.contains(
                        e.relatedTarget as Node | null
                      )
                    ) {
                      setIsPopupPaused(false);
                    }
                  }}
                  className={`learner-notif-popover w-[min(360px,calc(100vw-2rem))] space-y-2.5 ${
                    activePopups.length > 0 && !notifOpen ? "is-open" : ""
                  }`}
                >
                  {activePopups.map((popup) => {
                    const evType = inferLearnerNotifEventType(popup);
                    const meta = getLearnerNotifCategoryMeta(evType);
                    const PopupIcon = meta.Icon;

                    return (
                      <article
                        key={popup.id}
                        className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_14px_38px_rgba(16,15,17,0.16)]"
                      >
                        <div
                          className="h-1.5 w-full"
                          style={{ background: meta.gradient }}
                        />

                        <div className="p-3.5 flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.iconBg}`}
                          >
                            <PopupIcon size={17} />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                                >
                                  {evType === "pro_activated" && (
                                    <Zap size={10} fill="currentColor" />
                                  )}
                                  <span>{meta.badgeLabel}</span>
                                </span>
                                <p className="text-xs font-extrabold text-[#121215] mt-1">
                                  {meta.headline}
                                </p>
                              </div>

                              <button
                                ref={(el) => {
                                  if (el) closeBtnRefs.current.set(popup.id, el);
                                  else closeBtnRefs.current.delete(popup.id);
                                }}
                                type="button"
                                onClick={() => dismissPopup(popup.id)}
                                aria-label="Tutup notifikasi"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F8F9FB] hover:text-[#121215] transition-colors cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>

                            <p className="text-[11px] font-bold text-[#121215]">
                              {popup.title}
                            </p>

                            <p className="text-xs text-[#334155] leading-relaxed line-clamp-3">
                              {popup.body}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="text-[10px] font-medium text-[#9CA3AF]">
                                {formatLearnerNotifTime(popup)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleNotifNavigate(popup)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                              >
                                <span>{meta.actionLabel}</span>
                                <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>,
              document.body
            )}

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
                placeholder={
                  showWikiPage
                    ? "Search courses, pages, or wikis..."
                    : "Search courses or pages..."
                }
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
              {visibleSearchAssignedItems.length === 0 &&
              (!showWikiPage || wikiResources.length === 0) ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF]">
                  Belum ada materi kursus atau kuis yang tersedia.
                </div>
              ) : (
                <>
                  {visibleSearchAssignedItems.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                        Courses &amp; Assessments
                      </p>
                      <div className="space-y-1">
                        {visibleSearchAssignedItems.map((item) => (
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

                  {showWikiPage && wikiResources.length > 0 && (
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
