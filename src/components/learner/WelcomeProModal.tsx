"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Download,
  MessageSquare,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { RumiMascotIllustration } from "@/components/learner/RumiEvolutionMascot";
import { formatIndoDate, toIsoDateString } from "@/lib/subscription-utils";

export const WELCOME_PRO_PREVIEW_EVENT = "rs:welcome-pro-preview";

export interface WelcomeProModalData {
  learnerName?: string;
  planName?: string;
  tierKind?: "pro" | "basic";
  billingCycle?: string | null;
  expiresAt?: string | null;
  isPreview?: boolean;
}

interface WelcomeProModalProps {
  open: boolean;
  data: WelcomeProModalData | null;
  onClose: () => void;
  onStartLearning?: () => void;
}

let cachedSupportsDisplayTransition: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedSupportsDisplayTransition !== undefined) {
    return cachedSupportsDisplayTransition;
  }
  if (
    typeof window === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  cachedSupportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.CSS?.supports?.("overlay", "auto")) && canTransitionDisplay();
}

async function closeTopLayerDialog(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute("data-closing", "");
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    if (!dialog.hasAttribute("data-closing")) return;
    dialog.removeAttribute("data-closing");
  }

  if (dialog.open) {
    dialog.close();
  }
}

const CONFETTI_ACCENTS = [
  { top: "14%", left: "10%", color: "#FDE047", size: "w-2.5 h-2.5 rotate-12", delay: "40ms" },
  { top: "24%", left: "19%", color: "#34D399", size: "w-2 h-2 rounded-full", delay: "110ms" },
  { top: "18%", right: "14%", color: "#F472B6", size: "w-2.5 h-2.5 -rotate-12", delay: "80ms" },
  { top: "30%", right: "22%", color: "#38BDF8", size: "w-2 h-2 rounded-full", delay: "150ms" },
  { bottom: "18%", left: "16%", color: "#FBBF24", size: "w-1.5 h-3 rotate-45 rounded-xs", delay: "130ms" },
  { bottom: "20%", right: "17%", color: "#A7F3D0", size: "w-2 h-2 rotate-12 rounded-xs", delay: "180ms" },
];

export function WelcomeProModal({
  open,
  data,
  onClose,
  onStartLearning,
}: WelcomeProModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  const pendingActionRef = useRef<"close" | "start">("close");
  const onStartLearningRef = useRef(onStartLearning);

  useEffect(() => {
    onCloseRef.current = onClose;
    onStartLearningRef.current = onStartLearning;
  }, [onClose, onStartLearning]);

  const requestAnimatedClose = useCallback(
    (action: "close" | "start" = "close") => {
      const dialog = dialogRef.current;
      pendingActionRef.current = action;
      if (!dialog) {
        if (action === "start" && onStartLearningRef.current) {
          onStartLearningRef.current();
        } else {
          onCloseRef.current();
        }
        return;
      }
      if (!dialog.open) return;
      void closeTopLayerDialog(dialog);
    },
    []
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      pendingActionRef.current = "close";
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open && !dialog.hasAttribute("data-closing")) {
      void closeTopLayerDialog(dialog);
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      dialog.removeAttribute("data-closing");
      const action = pendingActionRef.current;
      pendingActionRef.current = "close";
      if (action === "start" && onStartLearningRef.current) {
        onStartLearningRef.current();
      } else {
        onCloseRef.current();
      }
    };

    const handleCancel = (event: Event) => {
      event.preventDefault();
      requestAnimatedClose("close");
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);

    let cleanupOutsideDismiss: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          requestAnimatedClose("close");
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupOutsideDismiss = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
      cleanupOutsideDismiss?.();
    };
  }, [requestAnimatedClose]);

  const tierKind = data?.tierKind === "basic" ? "basic" : "pro";
  const isBasic = tierKind === "basic";
  const learnerName = (data?.learnerName || "Learner").trim();
  const planName =
    (data?.planName || "").trim() ||
    (isBasic ? "Basic" : "Ruang Sosmed Learning PRO");

  const billingCycle = (data?.billingCycle || "").trim();
  const statusPill =
    billingCycle === "3d_trial"
      ? `✨ TRIAL ${isBasic ? "BASIC" : "PRO"} 3 HARI AKTIF`
      : billingCycle === "7d_trial"
      ? `✨ TRIAL ${isBasic ? "BASIC" : "PRO"} 7 HARI AKTIF`
      : isBasic
      ? "✨ PAKET BASIC AKTIF"
      : "✨ KEANGGOTAAN PRO AKTIF";

  const validExpiryIso = data?.expiresAt ? toIsoDateString(data.expiresAt) : null;
  const expiryText = validExpiryIso
    ? `Aktif hingga ${formatIndoDate(validExpiryIso)}`
    : billingCycle === "3d_trial"
    ? "Masa aktif Trial 3 Hari"
    : billingCycle === "7d_trial"
    ? "Masa aktif Trial 7 Hari"
    : billingCycle === "30d"
    ? "Masa aktif 30 Hari penuh"
    : "Akses Premium Aktif";

  const benefitCards = isBasic
    ? [
        {
          icon: Zap,
          iconBg: "bg-indigo-50 text-[#4F39F6]",
          title: "Modul Awal Terbuka",
          desc: "Hingga 6 modul awal terbuka di setiap kelas pilihan.",
        },
        {
          icon: Sparkles,
          iconBg: "bg-amber-50 text-amber-600",
          title: "Booster 1.5× XP Rumi",
          desc: "Bonus +15 XP & pertumbuhan Rumi 1.5× lebih cepat.",
        },
        {
          icon: Download,
          iconBg: "bg-emerald-50 text-emerald-600",
          title: "File & Wiki SOP",
          desc: "Download template materi dan akses Wiki Playbook.",
        },
        {
          icon: MessageSquare,
          iconBg: "bg-sky-50 text-sky-600",
          title: "Diskusi & Catatan",
          desc: "Tanya jawab mentor langsung di bab & catatan pribadi.",
        },
      ]
    : [
        {
          icon: Crown,
          iconBg: "bg-indigo-50 text-[#4F39F6]",
          title: "100% Semua Modul PRO",
          desc: "Seluruh kelas, video lanjutan & modul terbuka penuh.",
        },
        {
          icon: Sparkles,
          iconBg: "bg-amber-50 text-amber-600",
          title: "Booster 2× XP Rumi",
          desc: "Bonus +35 XP & kumpulkan 2× XP di tiap aktivitas.",
        },
        {
          icon: Award,
          iconBg: "bg-emerald-50 text-emerald-600",
          title: "Sertifikat HD & Resource",
          desc: "Klaim sertifikat resmi & download semua file/SOP Wiki.",
        },
        {
          icon: MessageSquare,
          iconBg: "bg-violet-50 text-violet-600",
          title: "Mentor 1-on-1 & Q&A",
          desc: "Review tugas praktik langsung dan diskusi bersama mentor.",
        },
      ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as any)}
      className="rs-welcome-pro-dialog m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-0 text-[#121215] border border-[#E2E8F0] shadow-[0_24px_60px_rgba(30,27,75,0.28)]"
    >
      {/* Royal Hero Header */}
      <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#1E1B4B] via-[#4F39F6] to-[#7C3AED] px-6 pt-7 pb-6 text-center text-white">
        {/* Decorative finite burst confetti accents */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />
          {CONFETTI_ACCENTS.map((piece, idx) => (
            <span
              key={idx}
              className={`rs-pro-confetti-piece absolute ${piece.size}`}
              style={{
                top: piece.top,
                left: piece.left,
                right: piece.right,
                bottom: piece.bottom,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => requestAnimatedClose("close")}
          aria-label="Tutup popup selamat datang PRO"
          className="absolute top-3.5 right-3.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white/90 hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-xs px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase text-amber-200 shadow-xs">
            {statusPill}
          </span>

          <div className="mt-3 relative flex items-center justify-center">
            <div
              className="absolute inset-2 rounded-full bg-amber-300/25 blur-xl"
              aria-hidden="true"
            />
            <RumiMascotIllustration
              stage={isBasic ? 3 : 4}
              paused={!open}
              sizeClass="w-24 h-24 sm:w-28 sm:h-28 relative"
            />
          </div>

          <h2
            id={titleId}
            className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug"
          >
            {isBasic
              ? "Welcome to Ruang Sosmed Learning Basic!"
              : "Welcome to Ruang Sosmed Learning PRO!"}
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm text-indigo-100/95 max-w-md leading-relaxed">
            Selamat <strong className="font-bold text-white">{learnerName}</strong>! Akun Anda kini resmi menggunakan paket{" "}
            <strong className="font-bold text-amber-200">{planName}</strong> ({expiryText}).
          </p>
        </div>
      </div>

      {/* Benefits Body */}
      <div className="p-5 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Benefit yang Sudah Aktif untuk Anda
          </p>
          {data?.isPreview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
              Mode Preview Tes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {benefitCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-2.5 rounded-2xl border border-slate-200/85 bg-slate-50/70 p-3"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#121215] leading-snug">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={() => requestAnimatedClose("start")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F39F6] to-[#6D28D9] hover:from-[#3B28CC] hover:to-[#5B21B6] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Mulai Belajar Sekarang</span>
          </button>
          <button
            type="button"
            onClick={() => requestAnimatedClose("close")}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </dialog>
  );
}
