"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  EyeOff,
  HelpCircle,
  MessageCircle,
  Settings,
  Sparkles,
  VolumeX,
  X,
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
  RUMI_PREFS_EVENT,
  loadRumiAssistantPrefs,
  saveRumiAssistantPrefs,
  type RumiAssistantPrefs,
  type RumiAssistantSize,
} from "@/lib/rumi-assistant-prefs";
import type { RumiEvolutionStage, RumiXpProfileState } from "@/lib/rumi-xp";

export interface RumiQuickAction {
  id: string;
  label: string;
  onClick: () => void;
}

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
  sm: "w-28 h-28 sm:w-36 sm:h-36",
  md: "w-36 h-36 sm:w-48 sm:h-48",
  lg: "w-44 h-44 sm:w-56 sm:h-56",
};

const ADMIN_SIZE_CLASSES: Record<RumiAssistantSize, string> = {
  sm: "w-24 h-24 sm:w-28 sm:h-28",
  md: "w-32 h-32 sm:w-40 sm:h-40",
  lg: "w-40 h-40 sm:w-48 sm:h-48",
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
  const [selectedFaqIndex, setSelectedFaqIndex] = useState<number | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityStampRef = useRef<number>(0);

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

    if (!isVisibleOnPage || isOpen || isHovered || isHiding) {
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
  ]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (hopTimerRef.current) clearTimeout(hopTimerRef.current);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
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
  } else if (peekGreeting) {
    displayMood = "excited";
  } else if (activeFaq?.reactionMood) {
    displayMood = activeFaq.reactionMood;
  } else if (isOpen) {
    displayMood = "focused";
  } else if (isHovered && displayMood === "sleepy") {
    displayMood = "happy";
  }

  const handleMouseEnterMascot = () => {
    setIsHovered(true);
    if (isHiding) {
      setIsHiding(false);
      triggerHop();
      setPeekGreeting(true);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => {
        setPeekGreeting(false);
      }, 1350);
    }
  };

  const handleMouseLeaveMascot = () => {
    setIsHovered(false);
  };

  const handleToggleOpen = () => {
    setBubbleMessage(null);
    if (isHiding) {
      setIsHiding(false);
      triggerHop();
      setIsOpen(true);
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleManualTuckHide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(false);
    setBubbleMessage(null);
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

  return (
    <div
      aria-live="polite"
      className={`fixed right-0 bottom-5 z-40 flex flex-col items-end transition-all duration-300 ${
        isVisibleOnPage
          ? "opacity-100 pointer-events-auto translate-y-0"
          : "opacity-0 pointer-events-none translate-y-4"
      }`}
    >
      {/* Contextual Assistant Popover */}
      {isOpen && (
        <section
          aria-label="Asisten Rumi"
          className="rs-rumi-popover-in mr-4 mb-3 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#EAECEF] bg-[#FFFFFF] shadow-[0_20px_50px_rgba(16,15,17,0.16)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5 border-b border-[#EAECEF] bg-[#F8F9FB] px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0">
                <RumiMascotIllustration
                  stage={effectiveStage}
                  variant={mascotVariant}
                  mood={displayMood}
                  sizeClass="w-16 h-16"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#121215]">
                    {roleMode === "admin" ? "Superior Rumi" : "Rumi Assistant"}
                  </span>
                  <span className="rounded-full bg-[#EEF2FF] border border-[#4F39F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                    {liveMood.statusLabel}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#5E5E5E] truncate mt-0.5">
                  {guide.pageTitle} • {guide.badge}
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
                <EyeOff size={14} />
              </button>
              {onOpenProfileRumiSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenProfileRumiSettings();
                  }}
                  title="Atur Waktu Idle & Ukuran Rumi"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#EAECEF]/70 hover:text-[#4F39F6] transition-colors cursor-pointer"
                >
                  <Settings size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup panduan Rumi"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#EAECEF]/70 hover:text-[#121215] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {/* Page Summary & Features */}
            <div className="space-y-2.5">
              <p className="text-xs text-[#121215] leading-relaxed">
                {guide.summary}
              </p>

              <div className="space-y-1.5">
                {guide.features.map((feat) => (
                  <div
                    key={feat.title}
                    className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2"
                  >
                    <p className="text-[11px] font-bold text-[#121215] flex items-center gap-1.5">
                      <Sparkles size={11} className="text-[#4F39F6] shrink-0" />
                      <span>{feat.title}</span>
                    </p>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5 leading-snug">
                      {feat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Instant Contextual Q&A Chips */}
            {guide.faqs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5E5E5E] flex items-center gap-1.5">
                  <HelpCircle size={12} className="text-[#4F39F6]" />
                  <span>Tanya Cepat di Halaman Ini</span>
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {guide.faqs.map((faq, idx) => {
                    const selected = selectedFaqIndex === idx;
                    return (
                      <button
                        key={faq.question}
                        type="button"
                        onClick={() =>
                          setSelectedFaqIndex(selected ? null : idx)
                        }
                        className={`rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                          selected
                            ? "border-[#4F39F6] bg-[#4F39F6] text-white shadow-2xs"
                            : "border-[#EAECEF] bg-[#FFFFFF] text-[#121215] hover:border-[#4F39F6]/50 hover:bg-[#F8F9FB]"
                        }`}
                      >
                        {faq.question}
                      </button>
                    );
                  })}
                </div>

                {activeFaq && (
                  <div className="rs-rumi-bubble-in rounded-xl border border-[#4F39F6]/25 bg-[#EEF2FF]/70 p-3 text-xs text-[#121215] space-y-1">
                    <p className="text-[11px] font-bold text-[#4F39F6] flex items-center gap-1">
                      <MessageCircle size={11} />
                      <span>Jawaban Rumi</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-[#121215]">
                      {activeFaq.answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Contextual Actions */}
            {quickActions.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-[#EAECEF]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5E5E5E]">
                  Pintasan Cepat
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickActions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        act.onClick();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#EAECEF] bg-[#FFFFFF] hover:border-[#4F39F6] hover:text-[#4F39F6] px-2.5 py-1.5 text-[11px] font-semibold text-[#121215] transition-colors cursor-pointer"
                    >
                      <span>{act.label}</span>
                      <ChevronRight size={11} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-[#EAECEF] bg-[#F8F9FB] px-4 py-2 text-[10px] text-[#5E5E5E]">
            <span>
              {prefs.autoHideOnIdle
                ? `Auto ngintip setelah ${prefs.idleHideSeconds} dtk idle`
                : "Standby penuh (auto ngintip nonaktif)"}
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
                Atur di Profil
              </button>
            )}
          </div>
        </section>
      )}

      {/* Speech Bubble (Auto 4.8s on page enter / sleepy reminder / peek-a-boo) */}
      {!isOpen && !isHiding && (bubbleMessage || peekGreeting) && (
        <div
          role="status"
          className="rs-rumi-bubble-in mr-4 mb-2 max-w-[260px] rounded-2xl rounded-br-sm border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2.5 shadow-[0_10px_28px_rgba(16,15,17,0.14)]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium text-[#121215] leading-snug">
              {peekGreeting ? "Peek-a-boo! 👋 Butuh bantuan di sini?" : bubbleMessage}
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

      {/* Floating Mascot Trigger + Right-Edge Peek-a-Boo Dock */}
      <div
        onMouseEnter={handleMouseEnterMascot}
        onMouseLeave={handleMouseLeaveMascot}
        className={`group relative flex items-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform ${
          isHiding
            ? "translate-x-[38%] -rotate-12 scale-[0.86]"
            : "pr-4 translate-x-0 rotate-0 scale-100"
        }`}
      >
        {/* Subtle manual hide chip visible only on standby hover */}
        {!isHiding && !isOpen && isHovered && (
          <button
            type="button"
            onClick={handleManualTuckHide}
            title="Sembunyikan ke pinggir layar"
            className="absolute -top-2 -left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[#EAECEF] bg-[#FFFFFF] text-[#5E5E5E] shadow-xs hover:text-[#121215] cursor-pointer"
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
              roleMode === "learner" && effectiveStage <= 2
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
