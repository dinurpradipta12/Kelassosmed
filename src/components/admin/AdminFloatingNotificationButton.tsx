"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  BellRing,
  CheckCheck,
  Crown,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  ArrowRight,
} from "lucide-react";
import {
  useRuangSosmedStore,
  type AdminActivityNotification,
} from "@/context/RuangSosmedStore";

interface AdminFloatingNotificationButtonProps {
  onNavigateLearners?: () => void;
}

const SEEN_POPUP_IDS_KEY = "ruang_sosmed_admin_seen_popup_ids_v1";
const NOTIF_MUTED_KEY = "ruang_sosmed_admin_notif_muted_v1";
const MAX_VISIBLE_POPUPS = 3;
const AUTO_DISMISS_MS = 8000;

declare global {
  interface Window {
    __ruangSosmedTestNotif?: {
      register: (name?: string, email?: string) => AdminActivityNotification;
      subscribePro: (
        name?: string,
        packageName?: string,
        priceLabel?: string,
        email?: string
      ) => AdminActivityNotification;
    };
  }
}

function readSeenPopupIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_POPUP_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeenPopupIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const list = Array.from(ids).slice(-100);
    window.localStorage.setItem(SEEN_POPUP_IDS_KEY, JSON.stringify(list));
  } catch {}
}

function formatRelativeTime(isoString: string): string {
  const ts = Date.parse(isoString);
  if (Number.isNaN(ts)) return "Baru saja";
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

function playSubtleNotifChime(eventType: AdminActivityNotification["eventType"]) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = eventType === "pro_subscribed" ? [659.25, 880, 1046.5] : [523.25, 659.25];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.055, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.24);
    });
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 600);
  } catch {}
}

/**
 * Floating Admin-only notification trigger, live event popups, and notification inbox.
 */
export function AdminFloatingNotificationButton({
  onNavigateLearners,
}: AdminFloatingNotificationButtonProps) {
  const {
    adminNotifications,
    pushAdminNotification,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    clearAdminNotifications,
  } = useRuangSosmedStore();

  const [mounted, setMounted] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<
    "all" | "user_registered" | "pro_subscribed"
  >("all");
  const [activePopups, setActivePopups] = useState<AdminActivityNotification[]>(
    []
  );
  const [isPopupPaused, setIsPopupPaused] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(NOTIF_MUTED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const inboxPanelRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const deferredPopupsRef = useRef<AdminActivityNotification[]>([]);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register Browser Console test helper (`window.__ruangSosmedTestNotif`) strictly in non-production builds
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      return;
    }
    window.__ruangSosmedTestNotif = {
      register: (name = "Dinur", email = "dinur.member@example.com") =>
        pushAdminNotification({
          eventType: "user_registered",
          userName: name,
          userEmail: email,
        }),
      subscribePro: (
        name = "Dinur",
        packageName = "Creator Academy Plan (PRO Bulanan)",
        priceLabel = "Rp 149.000 / bulan",
        email = "dinur.pro@example.com"
      ) =>
        pushAdminNotification({
          eventType: "pro_subscribed",
          userName: name,
          userEmail: email,
          packageName,
          priceLabel,
        }),
    };
    return () => {
      delete window.__ruangSosmedTestNotif;
    };
  }, [pushAdminNotification]);

  const toggleMuted = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(NOTIF_MUTED_KEY, String(next));
        } catch {}
      }
      return next;
    });
  };

  const showPopupCard = useCallback((notif: AdminActivityNotification) => {
    setActivePopups((prev) => {
      if (prev.some((p) => p.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, MAX_VISIBLE_POPUPS);
    });

    const announceText = `${notif.message} Actions available`;
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
      playSubtleNotifChime(notif.eventType);
    }
  }, []);

  const hasBlockingModal = () =>
    typeof document !== "undefined" &&
    Boolean(
      document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
    );

  const enqueueFloatingPopup = useCallback(
    (notif: AdminActivityNotification) => {
      if (!notif?.id) return;
      const seen = readSeenPopupIds();
      if (seen.has(notif.id)) return;
      seen.add(notif.id);
      writeSeenPopupIds(seen);

      // Defer popup until any open modal dialog is dismissed.
      if (hasBlockingModal()) {
        if (!deferredPopupsRef.current.some((d) => d.id === notif.id)) {
          deferredPopupsRef.current.push(notif);
        }
        return;
      }

      showPopupCard(notif);
    },
    [showPopupCard]
  );

  // Flush deferred popups as soon as an open modal dialog closes
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

  // Listen to live incoming notification events
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent<AdminActivityNotification>;
      if (custom.detail) {
        enqueueFloatingPopup(custom.detail);
      }
    };
    window.addEventListener("ruang_sosmed_admin_notif", handleEvent);
    return () => {
      window.removeEventListener("ruang_sosmed_admin_notif", handleEvent);
    };
  }, [enqueueFloatingPopup]);

  // Surface any ultra-fresh unread notification (< 30s old) received right around mount
  useEffect(() => {
    const fresh = (adminNotifications || []).filter((n) => {
      if (!n || n.read) return false;
      const createdMs = Date.parse(n.createdAt || "");
      return !Number.isNaN(createdMs) && Date.now() - createdMs <= 30_000;
    });
    fresh.forEach((n) => enqueueFloatingPopup(n));
  }, [adminNotifications, enqueueFloatingPopup]);

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

  // Sync native Top-Layer manual popover state with activePopups
  useEffect(() => {
    const el = popoverRef.current as
      | (HTMLDivElement & {
          showPopover?: () => void;
          hidePopover?: () => void;
        })
      | null;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      const shouldShow = activePopups.length > 0 && !inboxOpen;
      const isOpen = el.matches(":popover-open");
      if (shouldShow && !isOpen) {
        el.showPopover();
      } else if (!shouldShow && isOpen) {
        el.hidePopover?.();
      }
    } catch {}
  }, [activePopups.length, inboxOpen, mounted]);

  // Auto-dismiss oldest live popup after 8 seconds unless hovered/focused
  useEffect(() => {
    if (activePopups.length === 0 || isPopupPaused || inboxOpen) return;
    const oldest = activePopups[activePopups.length - 1];
    const timer = window.setTimeout(() => {
      dismissPopup(oldest.id);
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [activePopups, isPopupPaused, inboxOpen, dismissPopup]);

  // Close inbox dropdown on Escape or outside pointerdown
  useEffect(() => {
    if (!inboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInboxOpen(false);
        triggerBtnRef.current?.focus();
      }
    };
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        !inboxPanelRef.current?.contains(target) &&
        !triggerBtnRef.current?.contains(target)
      ) {
        setInboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [inboxOpen]);

  const unreadCount = useMemo(
    () => (adminNotifications || []).filter((n) => !n.read).length,
    [adminNotifications]
  );

  const filteredList = useMemo(() => {
    const list = adminNotifications || [];
    if (filterTab === "all") return list;
    return list.filter((n) => n.eventType === filterTab);
  }, [adminNotifications, filterTab]);

  return (
    <>
      {/* Top-Bar Docked Bell Trigger Button (Never overlaps page content or toolbars) */}
      <div className="relative shrink-0">
        {unreadCount > 0 && !inboxOpen && (
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
            setInboxOpen((prev) => !prev);
          }}
          aria-label={
            unreadCount > 0
              ? `Notifikasi Admin (${unreadCount} belum dibaca)`
              : "Notifikasi Admin"
          }
          aria-expanded={inboxOpen}
          aria-haspopup="dialog"
          title="Notifikasi Member Baru & Langganan PRO"
          className={`relative inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
            inboxOpen
              ? "bg-[#4F39F6] text-white border-[#4F39F6] shadow-2xs"
              : unreadCount > 0
              ? "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE] hover:bg-[#E0E7FF]"
              : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:bg-[#EAECEF]/70 hover:text-[#121215]"
          }`}
        >
          {unreadCount > 0 && !inboxOpen ? (
            <BellRing size={13} className="shrink-0 text-[#4F39F6]" />
          ) : (
            <Bell size={13} className="shrink-0" />
          )}

          {unreadCount > 0 && (
            <span className="inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold leading-none tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Hidden pre-populated live region fallback for screen readers */}
            <div aria-live="assertive" className="sr-only">
              {liveAnnouncement}
            </div>

            {/* Live Floating Popup Notifications (Top Layer manual popover directly below bell button) */}
            <div
              ref={popoverRef}
              role="region"
              aria-label="Notifikasi Aktivitas Admin"
              {...({ popover: "manual" } as Record<string, string>)}
              onMouseEnter={() => setIsPopupPaused(true)}
              onMouseLeave={() => setIsPopupPaused(false)}
              onFocusCapture={() => setIsPopupPaused(true)}
              onBlurCapture={(e) => {
                if (!popoverRef.current?.contains(e.relatedTarget as Node | null)) {
                  setIsPopupPaused(false);
                }
              }}
              className={`admin-notif-popover w-[min(360px,calc(100vw-2rem))] space-y-2.5 ${
                activePopups.length > 0 && !inboxOpen ? "is-open" : ""
              }`}
            >
        {activePopups.map((popup) => {
          const isProEvent = popup.eventType === "pro_subscribed";
          return (
            <article
              key={popup.id}
              className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_14px_38px_rgba(16,15,17,0.16)]"
            >
              {/* Top Gradient Accent Bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background: isProEvent
                    ? "linear-gradient(90deg, #F59E0B 0%, #EC4899 100%)"
                    : "linear-gradient(90deg, #4F39F6 0%, #10B981 100%)",
                }}
              />

              <div className="p-3.5 flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isProEvent
                      ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                      : "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE]"
                  }`}
                >
                  {isProEvent ? <Crown size={17} /> : <UserPlus size={17} />}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isProEvent
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#ECFDF5] text-[#059669]"
                        }`}
                      >
                        {isProEvent ? (
                          <>
                            <Zap size={10} fill="currentColor" />
                            <span>PRO Subscription</span>
                          </>
                        ) : (
                          <span>Member Baru</span>
                        )}
                      </span>
                      <p className="text-xs font-extrabold text-[#121215] mt-1">
                        {isProEvent ? "Yuhuu! ⚡" : "Say, Hi! 🎉"}
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

                  {isProEvent && popup.packageName && (
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
                      <span>{popup.packageName}</span>
                      {popup.priceLabel && (
                        <span className="text-[#B45309]">
                          • {popup.priceLabel}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-[#334155] leading-relaxed">
                    {popup.message}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] font-medium text-[#9CA3AF]">
                      {formatRelativeTime(popup.createdAt)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        markAdminNotificationRead(popup.id);
                        dismissPopup(popup.id);
                        onNavigateLearners?.();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                    >
                      <span>Lihat Member</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Dropdown Notification Inbox Panel */}
      {inboxOpen && (
        <div
          ref={inboxPanelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Riwayat Notifikasi Admin"
          className="fixed top-11 right-4 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_18px_48px_rgba(16,15,17,0.16)] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#EAECEF] flex items-center justify-between gap-2 bg-[#F8F9FB]">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing size={15} className="text-[#4F39F6] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xs font-extrabold text-[#121215] truncate">
                  Notifikasi Aktivitas Member
                </h2>
                <p className="text-[10px] text-[#64748B]">
                  Pendaftaran baru &amp; langganan Learner PRO
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleMuted}
                title={isMuted ? "Aktifkan suara notifikasi" : "Bisukan suara"}
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
                  onClick={markAllAdminNotificationsRead}
                  title="Tandai semua dibaca"
                  aria-label="Tandai semua dibaca"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#4F39F6] hover:bg-white cursor-pointer"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {(adminNotifications || []).length > 0 && (
                <button
                  type="button"
                  onClick={clearAdminNotifications}
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
                  setInboxOpen(false);
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
          <div className="px-3 py-2 border-b border-[#EAECEF] flex items-center gap-1.5 bg-white">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "user_registered", label: "Member Baru" },
                { id: "pro_subscribed", label: "Langganan PRO" },
              ] as const
            ).map((tab) => {
              const active = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
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
            {filteredList.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F9FB] border border-[#EAECEF] text-[#9CA3AF]">
                  <Users size={18} />
                </div>
                <p className="text-xs font-bold text-[#121215]">
                  Belum Ada Aktivitas Baru
                </p>
                <p className="text-[11px] text-[#64748B] max-w-[260px] mx-auto leading-relaxed">
                  Notifikasi otomatis muncul di sini saat ada member baru mendaftar atau mengambil paket Learner PRO.
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isProEvent = item.eventType === "pro_subscribed";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      markAdminNotificationRead(item.id);
                      setInboxOpen(false);
                      onNavigateLearners?.();
                    }}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      item.read
                        ? "bg-white hover:bg-[#F8F9FB]"
                        : "bg-[#EEF2FF]/35 hover:bg-[#EEF2FF]/60"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        isProEvent
                          ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                          : "bg-[#EEF2FF] text-[#4F39F6] border-[#C7D2FE]"
                      }`}
                    >
                      {isProEvent ? <Crown size={15} /> : <UserPlus size={15} />}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-[#121215] truncate">
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-[#4F39F6] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#475569] leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-[#9CA3AF]">
                        <span className="truncate">
                          {item.userEmail || item.userName}
                        </span>
                        <span className="shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
          </>,
          document.body
        )}
    </>
  );
}
