"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Compass,
  Crown,
  EyeOff,
  FolderOpen,
  Gift,
  Heart,
  HelpCircle,
  Home,
  Inbox,
  LayoutGrid,
  LineChart,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  VolumeX,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  RumiMascotIllustration,
  type RumiMascotMood,
} from "@/components/learner/RumiEvolutionMascot";
import {
  computeRumiLiveMood,
  getRumiPageGuide,
  type RumiAdminAlerts,
  type RumiPageContextId,
} from "@/lib/rumi-assistant-guide";
import {
  DEFAULT_RUMI_ASSISTANT_PREFS,
  RUMI_DELIVER_NOTIF_EVENT,
  RUMI_PREFS_EVENT,
  getRumiHideTransform,
  loadRumiAssistantPrefs,
  playRumiNotificationSound,
  playRumiPeekABooSound,
  saveRumiAssistantPrefs,
  type RumiAssistantPosition,
  type RumiAssistantPrefs,
  type RumiAssistantSize,
  type RumiDeliveredNotificationPayload,
} from "@/lib/rumi-assistant-prefs";
import type { RumiEvolutionStage, RumiXpProfileState } from "@/lib/rumi-xp";

export type RumiDeckIconName =
  | "home"
  | "learning"
  | "catalog"
  | "favorites"
  | "rewards"
  | "pro"
  | "content"
  | "users"
  | "inbox"
  | "analytics"
  | "settings"
  | "plus"
  | "search"
  | "sparkles";

export type RumiDeckAccent =
  | "indigo"
  | "sky"
  | "emerald"
  | "rose"
  | "amber"
  | "violet";

export interface RumiQuickAction {
  id: string;
  label: string;
  sublabel?: string;
  shortcutKey?: string;
  icon?: RumiDeckIconName;
  badgeText?: string | number;
  isActive?: boolean;
  accent?: RumiDeckAccent;
  onClick: () => void;
}

const DECK_ICON_MAP: Record<RumiDeckIconName, LucideIcon> = {
  home: Home,
  learning: BookOpen,
  catalog: Compass,
  favorites: Heart,
  rewards: Gift,
  pro: Crown,
  content: FolderOpen,
  users: Users,
  inbox: Inbox,
  analytics: LineChart,
  settings: Settings,
  plus: Plus,
  search: Search,
  sparkles: Sparkles,
};

interface RumiFloatingAssistantProps {
  roleMode: "learner" | "admin";
  userKey?: string | null;
  pageContextId: RumiPageContextId;
  pageSubtitle?: string | null;
  hideAtTopOnHome?: boolean;
  learnerStage?: RumiEvolutionStage;
  xpState?: RumiXpProfileState | null;
  proDaysRemaining?: number | null;
  adminAlerts?: RumiAdminAlerts;
  quickActions?: RumiQuickAction[];
  onOpenProfileRumiSettings?: () => void;
  onShowToast?: (msg: string) => void;
}

const LEARNER_SIZE_CLASSES: Record<RumiAssistantSize, string> = {
  sm: "w-20 h-20 sm:w-36 sm:h-36",
  md: "w-24 h-24 sm:w-48 sm:h-48",
  lg: "w-28 h-28 sm:w-56 sm:h-56",
};

const ADMIN_SIZE_CLASSES: Record<RumiAssistantSize, string> = {
  sm: "w-20 h-20 sm:w-28 sm:h-28",
  md: "w-24 h-24 sm:w-40 sm:h-40",
  lg: "w-28 h-28 sm:w-48 sm:h-48",
};

export function RumiFloatingAssistant({
  roleMode,
  userKey,
  pageContextId,
  pageSubtitle,
  hideAtTopOnHome = false,
  learnerStage = 1,
  xpState,
  proDaysRemaining,
  adminAlerts,
  quickActions = [],
  onOpenProfileRumiSettings,
  onShowToast,
}: RumiFloatingAssistantProps) {
  const [prefs, setPrefs] = useState<RumiAssistantPrefs>(
    DEFAULT_RUMI_ASSISTANT_PREFS
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHopping, setIsHopping] = useState(false);
  const [peekGreeting, setPeekGreeting] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [activeNotifBubble, setActiveNotifBubble] =
    useState<RumiDeliveredNotificationPayload | null>(null);
  const [forceRevealForNotif, setForceRevealForNotif] = useState(false);
  const [selectedFaqIndex, setSelectedFaqIndex] = useState<number | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"deck" | "qa" | "info">(
    "deck"
  );
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityStampRef = useRef<number>(0);
  const lastRevealAtRef = useRef<number>(0);

  // Sync per-user preferences from localStorage + listen for changes from Profile
  useEffect(() => {
    setPrefs(loadRumiAssistantPrefs(userKey));
    setPrefsLoaded(true);

    const handlePrefsChanged = () => {
      setPrefs(loadRumiAssistantPrefs(userKey));
    };
    window.addEventListener(RUMI_PREFS_EVENT, handlePrefsChanged);
    window.addEventListener("storage", handlePrefsChanged);
    return () => {
      window.removeEventListener(RUMI_PREFS_EVENT, handlePrefsChanged);
      window.removeEventListener("storage", handlePrefsChanged);
    };
  }, [userKey]);

  // Avoid duplicate Rumi at top of Home where Hero Rumi banner is already displayed
  useEffect(() => {
    if (!hideAtTopOnHome) {
      setScrolledPastHero(true);
      return;
    }
    const updateScroll = () => {
      setScrolledPastHero(window.scrollY > 220);
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, [hideAtTopOnHome]);

  const isVisibleOnPage = !hideAtTopOnHome || scrolledPastHero;

  // Close drawer cleanly when navigating away or if hero banner becomes visible again
  useEffect(() => {
    if (!isVisibleOnPage && isOpen) {
      setIsOpen(false);
    }
  }, [isVisibleOnPage, isOpen]);

  // Tactile Stream Deck keyboard shortcuts (press 1..6 while Rumi Deck modal is open)
  useEffect(() => {
    if (!isOpen || quickActions.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      const keyLower = e.key.toLowerCase();
      const matched = quickActions.find(
        (act) => act.shortcutKey?.toLowerCase() === keyLower
      );
      if (matched) {
        e.preventDefault();
        setIsOpen(false);
        matched.onClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, quickActions]);

  const guide = getRumiPageGuide(pageContextId, pageSubtitle);
  const liveMood = computeRumiLiveMood({
    roleMode,
    contextId: pageContextId,
    xpState,
    proDaysRemaining,
    adminAlerts,
  });

  const triggerHop = useCallback(() => {
    if (hopTimerRef.current) clearTimeout(hopTimerRef.current);
    setIsHopping(true);
    hopTimerRef.current = setTimeout(() => {
      setIsHopping(false);
    }, 560);
  }, []);

  // Show contextual or reminder speech bubble on page change & when Rumi enters view
  useEffect(() => {
    setSelectedFaqIndex(null);

    if (!prefsLoaded || !prefs.enabled || !isVisibleOnPage) {
      setBubbleMessage(null);
      return;
    }

    if (isHiding) {
      // Un-tuck briefly on meaningful page switch so user sees fresh page cue
      setIsHiding(false);
    }
    triggerHop();

    if (!prefs.autoBubble || isOpen) {
      return;
    }

    setBubbleMessage(liveMood.bubbleMessage || guide.defaultBubble);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleMessage(null);
    }, 4800);

    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [
    pageContextId,
    isVisibleOnPage,
    prefsLoaded,
    prefs.enabled,
    prefs.autoBubble,
    // Deliberately exclude isOpen / isHiding so toggling popover doesn't re-trigger auto bubble
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // Idle timer -> smooth Peek-a-Boo tuck to right screen edge
  useEffect(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (!prefsLoaded || !prefs.enabled || !prefs.autoHideOnIdle) {
      setIsHiding(false);
      return;
    }

    if (
      !isVisibleOnPage ||
      isOpen ||
      isHovered ||
      isHiding ||
      forceRevealForNotif
    ) {
      return;
    }

    const scheduleIdleHide = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setBubbleMessage(null);
        setIsHiding(true);
      }, prefs.idleHideSeconds * 1000);
    };

    scheduleIdleHide();

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityStampRef.current < 450) return;
      lastActivityStampRef.current = now;
      scheduleIdleHide();
    };

    window.addEventListener("pointermove", handleActivity, { passive: true });
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointermove", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [
    prefsLoaded,
    prefs.enabled,
    prefs.autoHideOnIdle,
    prefs.idleHideSeconds,
    isVisibleOnPage,
    isOpen,
    isHovered,
    isHiding,
    forceRevealForNotif,
  ]);

  // Register global Rumi Assistant mount state & deliver live notifications through Rumi
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { __rsRumiAssistantMounted?: boolean };
    if (!prefsLoaded || !prefs.enabled) {
      win.__rsRumiAssistantMounted = false;
      return;
    }
    win.__rsRumiAssistantMounted = true;
    return () => {
      win.__rsRumiAssistantMounted = false;
    };
  }, [prefsLoaded, prefs.enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleDeliveredNotif = (e: Event) => {
      const detail = (e as CustomEvent<RumiDeliveredNotificationPayload>)
        .detail;
      if (!detail || !prefsLoaded || !prefs.enabled || !prefs.notifyViaRumi) {
        return;
      }
      if (detail.role !== roleMode) {
        return;
      }

      setIsHiding(false);
      setBubbleMessage(null);
      setPeekGreeting(false);
      setForceRevealForNotif(true);
      setActiveNotifBubble(detail);
      triggerHop();

      if (!detail.muted) {
        const isCelebrate =
          detail.eventType === "pro_subscribed" ||
          detail.eventType === "pro_activated";
        playRumiNotificationSound(isCelebrate ? "celebrate" : "standard");
      }

      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      notifTimerRef.current = setTimeout(() => {
        setActiveNotifBubble(null);
        setForceRevealForNotif(false);
      }, 8000);
    };

    window.addEventListener(RUMI_DELIVER_NOTIF_EVENT, handleDeliveredNotif);
    return () => {
      window.removeEventListener(
        RUMI_DELIVER_NOTIF_EVENT,
        handleDeliveredNotif
      );
    };
  }, [prefsLoaded, prefs.enabled, prefs.notifyViaRumi, roleMode, triggerHop]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (hopTimerRef.current) clearTimeout(hopTimerRef.current);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, []);

  if (!prefsLoaded || !prefs.enabled) {
    return null;
  }

  const activeFaq =
    selectedFaqIndex !== null ? guide.faqs[selectedFaqIndex] || null : null;

  let displayMood: RumiMascotMood = liveMood.mood;
  if (isHiding) {
    displayMood = "peeking";
  } else if (activeNotifBubble) {
    const isCelebrate =
      activeNotifBubble.eventType === "pro_subscribed" ||
      activeNotifBubble.eventType === "pro_activated";
    displayMood = isCelebrate ? "excited" : "reminder";
  } else if (peekGreeting) {
    displayMood = "excited";
  } else if (activeFaq?.reactionMood) {
    displayMood = activeFaq.reactionMood;
  } else if (isOpen) {
    displayMood = "focused";
  } else if (isHovered && displayMood === "sleepy") {
    displayMood = "happy";
  }

  const revealFromHiding = () => {
    lastRevealAtRef.current = Date.now();
    setIsHiding(false);
    triggerHop();
    if (prefs.peekSoundEnabled) {
      playRumiPeekABooSound();
    }
    setPeekGreeting(true);
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => {
      setPeekGreeting(false);
    }, 1500);
  };

  const handleMouseEnterMascot = () => {
    setIsHovered(true);
    if (isHiding) {
      revealFromHiding();
    }
  };

  const handleMouseLeaveMascot = () => {
    setIsHovered(false);
  };

  const dismissActiveNotifBubble = () => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setActiveNotifBubble(null);
    setForceRevealForNotif(false);
  };

  const handleToggleOpen = () => {
    setBubbleMessage(null);
    dismissActiveNotifBubble();
    if (isHiding) {
      revealFromHiding();
      return;
    }
    if (Date.now() - lastRevealAtRef.current < 450) {
      return;
    }
    setIsOpen((prev) => {
      const next = !prev;
      if (next) setActiveModalTab("deck");
      return next;
    });
  };

  const handleManualTuckHide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(false);
    setBubbleMessage(null);
    dismissActiveNotifBubble();
    setPeekGreeting(false);
    setIsHovered(false);
    setIsHiding(true);
  };

  const handleMuteAutoBubble = () => {
    setBubbleMessage(null);
    saveRumiAssistantPrefs(userKey, { autoBubble: false });
    onShowToast?.(
      "Balon sapaan otomatis Rumi dibisukan. Bisa diaktifkan lagi di Pengaturan Profil."
    );
  };

  const sizeClass =
    roleMode === "learner"
      ? LEARNER_SIZE_CLASSES[prefs.size] || LEARNER_SIZE_CLASSES.md
      : ADMIN_SIZE_CLASSES[prefs.size] || ADMIN_SIZE_CLASSES.md;
  const mascotVariant = roleMode === "admin" ? "admin-superior" : "learner";
  const effectiveStage: RumiEvolutionStage =
    roleMode === "admin" ? 5 : learnerStage;

  const positionLayoutMap: Record<
    RumiAssistantPosition,
    {
      container: string;
      popover: string;
      bubble: string;
      standbyPad: string;
      tuckBtnPos: string;
    }
  > = {
    "bottom-right": {
      container: "right-0 bottom-20 md:bottom-5 flex-col items-end",
      popover: "mr-4 mb-3",
      bubble: "mr-4 mb-2 rounded-br-sm",
      standbyPad: "pr-4",
      tuckBtnPos: "-top-2 -left-1",
    },
    "top-right": {
      container: "right-0 top-16 flex-col-reverse items-end",
      popover: "mr-4 mt-3",
      bubble: "mr-4 mt-2 rounded-tr-sm",
      standbyPad: "pr-4",
      tuckBtnPos: "-bottom-1 -left-1",
    },
    "top-center": {
      container: "left-1/2 top-0 flex-col-reverse items-center",
      popover: "mx-2 mt-3",
      bubble: "mx-2 mt-2",
      standbyPad: "",
      tuckBtnPos: "-bottom-1 -right-1",
    },
    "top-left": {
      container: "left-0 top-16 flex-col-reverse items-start",
      popover: "ml-4 mt-3",
      bubble: "ml-4 mt-2 rounded-tl-sm",
      standbyPad: "pl-4",
      tuckBtnPos: "-bottom-1 -right-1",
    },
  };
  const layout =
    positionLayoutMap[prefs.position] || positionLayoutMap["bottom-right"];

  return (
    <div
      aria-live="polite"
      style={{
        transform:
          prefs.position === "top-center" ? "translateX(-50%)" : undefined,
      }}
      className={`fixed z-40 flex transition-opacity duration-300 ${layout.container} ${
        isVisibleOnPage
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Contextual Assistant Popover (Tabbed Stream Deck + Tanya + Info) */}
      {isOpen && (
        <section
          aria-label="Asisten Rumi"
          className={`rs-rumi-popover-in ${layout.popover} w-[min(372px,calc(100vw-2rem))] rounded-2xl border border-[#EAECEF] bg-[#FFFFFF] shadow-[0_20px_50px_rgba(16,15,17,0.18)] overflow-hidden`}
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between gap-2.5 border-b border-[#EAECEF] bg-[#F8F9FB] px-3.5 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0">
                <RumiMascotIllustration
                  stage={effectiveStage}
                  variant={mascotVariant}
                  mood={displayMood}
                  sizeClass="w-12 h-12"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#121215]">
                    {roleMode === "admin" ? "Superior Rumi" : "Rumi Assistant"}
                  </span>
                  <span className="rounded-full bg-[#EEF2FF] border border-[#4F39F6]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#4F39F6]">
                    {liveMood.statusLabel}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-[#5E5E5E] truncate mt-0.5">
                  {guide.pageTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleManualTuckHide}
                title="Sembunyikan Rumi di sisi layar (Ngintip)"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#EAECEF]/70 hover:text-[#121215] transition-colors cursor-pointer"
              >
                <EyeOff size={13} />
              </button>
              {onOpenProfileRumiSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenProfileRumiSettings();
                  }}
                  title="Pengaturan Rumi Assistant"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#EAECEF]/70 hover:text-[#4F39F6] transition-colors cursor-pointer"
                >
                  <Settings size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup panel Rumi"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#EAECEF]/70 hover:text-[#121215] transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Segmented Control Tabs: Deck (Pintasan) | Tanya (FAQ) | Info */}
          <div className="border-b border-[#EAECEF] bg-[#F8F9FB]/70 px-3 py-2">
            <div
              role="tablist"
              aria-label="Menu Rumi Assistant"
              className="grid grid-cols-3 gap-1 rounded-xl bg-[#EAECEF]/70 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeModalTab === "deck"}
                onClick={() => setActiveModalTab("deck")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  activeModalTab === "deck"
                    ? "bg-[#FFFFFF] text-[#121215] shadow-xs"
                    : "text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                <Zap
                  size={12}
                  className={
                    activeModalTab === "deck" ? "text-[#4F39F6]" : "text-[#5E5E5E]"
                  }
                />
                <span>Deck</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeModalTab === "qa"}
                onClick={() => setActiveModalTab("qa")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  activeModalTab === "qa"
                    ? "bg-[#FFFFFF] text-[#121215] shadow-xs"
                    : "text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                <HelpCircle
                  size={12}
                  className={
                    activeModalTab === "qa" ? "text-[#4F39F6]" : "text-[#5E5E5E]"
                  }
                />
                <span>Tanya</span>
                {guide.faqs.length > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0 text-[9px] font-extrabold ${
                      activeModalTab === "qa"
                        ? "bg-[#EEF2FF] text-[#4F39F6]"
                        : "bg-[#FFFFFF]/80 text-[#5E5E5E]"
                    }`}
                  >
                    {guide.faqs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeModalTab === "info"}
                onClick={() => setActiveModalTab("info")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  activeModalTab === "info"
                    ? "bg-[#FFFFFF] text-[#121215] shadow-xs"
                    : "text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                <Sparkles
                  size={12}
                  className={
                    activeModalTab === "info" ? "text-[#4F39F6]" : "text-[#5E5E5E]"
                  }
                />
                <span>Info</span>
              </button>
            </div>
          </div>

          {/* Tab Body */}
          <div className="max-h-[58vh] overflow-y-auto p-3.5">
            {activeModalTab === "deck" && (
              <div className="space-y-2.5">
                {quickActions.length > 0 ? (
                  <>
                    <div className="rs-rumi-deck-tray rounded-2xl p-2.5">
                      <div className="grid grid-cols-3 gap-2">
                        {quickActions.map((act) => {
                          const IconComp = act.icon
                            ? DECK_ICON_MAP[act.icon]
                            : LayoutGrid;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              data-accent={act.accent || "indigo"}
                              data-active={act.isActive ? "true" : "false"}
                              onClick={() => {
                                setIsOpen(false);
                                act.onClick();
                              }}
                              className="rs-rumi-deck-tile group relative flex flex-col items-start justify-between rounded-xl p-2.5 text-left transition-all duration-150 cursor-pointer active:scale-[0.96] min-h-[78px]"
                            >
                              <div className="flex w-full items-start justify-between gap-1">
                                <span className="rs-rumi-deck-icon flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105">
                                  <IconComp size={14} />
                                </span>

                                <div className="flex items-center gap-1">
                                  {act.badgeText !== undefined && (
                                    <span className="rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[9px] font-extrabold text-[#121215] leading-none">
                                      {act.badgeText}
                                    </span>
                                  )}
                                  {act.shortcutKey && (
                                    <kbd className="rs-rumi-deck-kbd rounded px-1 py-0.5 font-mono text-[9px] font-bold leading-none">
                                      {act.shortcutKey}
                                    </kbd>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 w-full min-w-0">
                                <p className="rs-rumi-deck-label truncate text-[11px] font-bold leading-tight">
                                  {act.label}
                                </p>
                                {act.sublabel && (
                                  <p className="rs-rumi-deck-sublabel truncate text-[9px] mt-0.5 leading-none">
                                    {act.sublabel}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-0.5 text-[10px] text-[#5E5E5E]">
                      <span>
                        Klik tombol atau tekan{" "}
                        <kbd className="rounded border border-[#EAECEF] bg-[#F8F9FB] px-1 py-0.5 font-mono text-[9px] font-bold text-[#121215]">
                          1
                        </kbd>
                        –
                        <kbd className="rounded border border-[#EAECEF] bg-[#F8F9FB] px-1 py-0.5 font-mono text-[9px] font-bold text-[#121215]">
                          {Math.min(quickActions.length, 9)}
                        </kbd>{" "}
                        untuk langsung pindah menu
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] p-4 text-center space-y-2">
                    <p className="text-xs font-semibold text-[#121215]">
                      Belum ada tombol pintasan di halaman ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModalTab("qa")}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                    >
                      <HelpCircle size={12} />
                      <span>Lihat Tanya Cepat</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeModalTab === "qa" && (
              <div className="space-y-2.5">
                {guide.faqs.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      {guide.faqs.map((faq, idx) => {
                        const selected = selectedFaqIndex === idx;
                        return (
                          <button
                            key={faq.question}
                            type="button"
                            onClick={() =>
                              setSelectedFaqIndex(selected ? null : idx)
                            }
                            className={`w-full rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                              selected
                                ? "border-[#4F39F6] bg-[#4F39F6] text-white shadow-2xs"
                                : "border-[#EAECEF] bg-[#F8F9FB] text-[#121215] hover:border-[#4F39F6]/50 hover:bg-[#FFFFFF]"
                            }`}
                          >
                            {faq.question}
                          </button>
                        );
                      })}
                    </div>

                    {activeFaq && (
                      <div className="rs-rumi-bubble-in rounded-xl border border-[#4F39F6]/25 bg-[#EEF2FF]/75 p-3 text-xs text-[#121215] space-y-1">
                        <p className="text-[11px] font-bold text-[#4F39F6] flex items-center gap-1">
                          <MessageCircle size={11} />
                          <span>Jawaban Rumi</span>
                        </p>
                        <p className="text-[11px] leading-relaxed text-[#121215]">
                          {activeFaq.answer}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] p-3 text-center text-[11px] text-[#5E5E5E]">
                    Belum ada daftar pertanyaan cepat di halaman ini.
                  </p>
                )}
              </div>
            )}

            {activeModalTab === "info" && (
              <div className="space-y-2.5">
                <p className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2.5 text-[11px] text-[#121215] leading-relaxed">
                  {guide.summary}
                </p>

                <div className="space-y-1.5">
                  {guide.features.map((feat) => (
                    <div
                      key={feat.title}
                      className="rounded-xl border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2"
                    >
                      <p className="text-[11px] font-bold text-[#121215] flex items-center gap-1.5">
                        <Sparkles size={11} className="text-[#4F39F6] shrink-0" />
                        <span>{feat.title}</span>
                      </p>
                      <p className="text-[10px] text-[#5E5E5E] mt-0.5 leading-snug">
                        {feat.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compact Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-[#EAECEF] bg-[#F8F9FB] px-3.5 py-2 text-[10px] text-[#5E5E5E]">
            <span>
              {prefs.autoHideOnIdle
                ? `Auto ngintip ${prefs.idleHideSeconds} dtk idle`
                : "Standby penuh"}
            </span>
            {onOpenProfileRumiSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenProfileRumiSettings();
                }}
                className="font-bold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Atur Rumi →
              </button>
            )}
          </div>
        </section>
      )}

      {/* Live Notification Delivered by Rumi (replaces default popup modal when notifyViaRumi is active) */}
      {!isOpen && !isHiding && activeNotifBubble && (
        <div
          role="status"
          className={`rs-rumi-bubble-in ${layout.bubble} w-[min(290px,calc(100vw-2rem))] rounded-2xl border border-[#4F39F6]/30 bg-[#FFFFFF] px-3.5 py-3 shadow-[0_14px_34px_rgba(79,57,246,0.18)]`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] border border-[#4F39F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                <Bell size={10} />
                <span>Notifikasi Baru</span>
              </span>
              <p className="text-xs font-bold text-[#121215] leading-snug">
                {activeNotifBubble.title}
              </p>
              <p className="text-[11px] font-medium text-[#5E5E5E] leading-relaxed break-words">
                {activeNotifBubble.message}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissActiveNotifBubble}
              aria-label="Tutup notifikasi Rumi"
              className="shrink-0 rounded p-0.5 text-[#9CA3AF] hover:bg-[#F8F9FB] hover:text-[#121215] cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Speech Bubble (Auto 4.8s on page enter / sleepy reminder / peek-a-boo) */}
      {!isOpen && !isHiding && !activeNotifBubble && (bubbleMessage || peekGreeting) && (
        <div
          role="status"
          className={`rs-rumi-bubble-in ${layout.bubble} max-w-[260px] rounded-2xl border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2.5 shadow-[0_10px_28px_rgba(16,15,17,0.14)]`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium text-[#121215] leading-snug">
              {peekGreeting ? "Yuhu! 👋 Butuh bantuan di sini?" : bubbleMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setBubbleMessage(null);
                setPeekGreeting(false);
              }}
              aria-label="Tutup sapaan Rumi"
              className="shrink-0 rounded p-0.5 text-[#9CA3AF] hover:bg-[#F8F9FB] hover:text-[#121215] cursor-pointer"
            >
              <X size={11} />
            </button>
          </div>
          {!peekGreeting && prefs.autoBubble && (
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-[#EAECEF]/70 pt-1">
              <button
                type="button"
                onClick={handleToggleOpen}
                className="text-[10px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Buka panduan →
              </button>
              <button
                type="button"
                onClick={handleMuteAutoBubble}
                title="Matikan sapaan otomatis"
                className="inline-flex items-center gap-0.5 text-[10px] text-[#9CA3AF] hover:text-[#5E5E5E] cursor-pointer"
              >
                <VolumeX size={10} />
                <span>Bisukan</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Mascot Trigger + Screen-Edge Peek-a-Boo Dock */}
      <div
        onMouseEnter={handleMouseEnterMascot}
        onMouseLeave={handleMouseLeaveMascot}
        style={{
          transform: getRumiHideTransform(
            prefs.position,
            isHiding,
            prefs.hideDepthPercent
          ),
        }}
        className={`group relative flex items-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform ${
          isHiding ? "" : layout.standbyPad
        }`}
      >
        {/* Subtle manual hide chip visible only on standby hover */}
        {!isHiding && !isOpen && isHovered && (
          <button
            type="button"
            onClick={handleManualTuckHide}
            title="Sembunyikan ke pinggir layar"
            className={`absolute ${layout.tuckBtnPos} z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[#EAECEF] bg-[#FFFFFF] text-[#5E5E5E] shadow-xs hover:text-[#121215] cursor-pointer`}
          >
            <EyeOff size={10} />
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleOpen}
          aria-expanded={isOpen}
          aria-label={
            isHiding
              ? "Rumi sedang ngintip — klik untuk memunculkan asisten"
              : isOpen
              ? "Tutup Rumi Assistant"
              : "Buka panduan halaman dengan Rumi Assistant"
          }
          className={`relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F39F6] cursor-pointer ${
            isHopping ? "rs-rumi-hop" : ""
          } ${isHiding ? "rs-rumi-peek-breathe" : ""}`}
        >
          <span
            className={
              !isHiding && roleMode === "learner" && effectiveStage <= 2
                ? "block scale-[1.22] -translate-y-1.5"
                : "block"
            }
          >
            <RumiMascotIllustration
              stage={effectiveStage}
              variant={mascotVariant}
              mood={displayMood}
              sizeClass={sizeClass}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
