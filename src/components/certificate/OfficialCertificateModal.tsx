"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Palette,
  Folder,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { DEFAULT_CERTIFICATE_CONFIG, type CertificateDesignConfig } from "@/lib/certificate-tokens";

export interface LearnerCourseCertificateItem {
  id: string;
  title: string;
  folderName?: string;
  progressPercent: number;
  completedChapters: number;
  totalChapters: number;
  credentialId: string;
  completionDate?: string;
  scoreLabel?: string;
}

export interface OfficialCertificateModalProps {
  open: boolean;
  onClose: () => void;
  learnerName?: string;
  learnerRole?: string;
  courseTitle?: string;
  completionDate?: string;
  credentialId?: string;
  scoreLabel?: string;
  courses?: LearnerCourseCertificateItem[];
  isLockedPro?: boolean;
  onRequestUpgrade?: () => void;
  onShowToast?: (msg: string) => void;
  onOpenStudio?: () => void;
  configOverride?: CertificateDesignConfig;
}

export function OfficialCertificateModal({
  open,
  onClose,
  learnerName = "Allisha Fathya",
  learnerRole = "Social Media Specialist",
  courseTitle = "Social Media Strategy: 10 Principles To Boost Brand Engagement",
  completionDate = "27 October 2026",
  credentialId = "RS2-2026-8493",
  scoreLabel = "94% Mastery Score • Top Cohort Distinction",
  courses,
  isLockedPro = false,
  onRequestUpgrade,
  onShowToast,
  onOpenStudio,
  configOverride,
}: OfficialCertificateModalProps) {
  const store = useRuangSosmedStore();
  const hasCoursesProp = Array.isArray(courses);
  const courseList = hasCoursesProp ? courses : [];

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    const firstCompleted = courseList.find((c) => c.progressPercent >= 100);
    return firstCompleted?.id || courseList[0]?.id || "";
  });

  useEffect(() => {
    if (!open || courseList.length === 0) return;
    const exists = courseList.some((c) => c.id === selectedCourseId);
    if (!exists) {
      const firstCompleted = courseList.find((c) => c.progressPercent >= 100);
      setSelectedCourseId(firstCompleted?.id || courseList[0]?.id || "");
    }
  }, [open, courseList, selectedCourseId]);

  const activeCourseItem =
    courseList.length > 0
      ? courseList.find((c) => c.id === selectedCourseId) || courseList[0]
      : null;

  const effectiveCourseTitle = activeCourseItem?.title || courseTitle;
  const effectiveCredentialId = activeCourseItem?.credentialId || credentialId;
  const effectiveCompletionDate =
    activeCourseItem?.completionDate || completionDate;
  const effectiveScoreLabel = activeCourseItem?.scoreLabel || scoreLabel;

  const courseKey = effectiveCourseTitle?.trim().toLowerCase();
  const courseSpecificCfg =
    courseKey && store?.courseCertificateConfigs?.[courseKey];
  const cfg =
    configOverride ||
    courseSpecificCfg ||
    store?.certificateConfig ||
    DEFAULT_CERTIFICATE_CONFIG;

  const [copiedId, setCopiedId] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);

  const handleBlockedByPro = () => {
    onShowToast?.(
      "🔒 Klaim & Download Sertifikat Resmi HD khusus member Learner PRO."
    );
    onClose();
    onRequestUpgrade?.();
  };

  const handleCopyCredentialId = () => {
    if (isLockedPro) {
      handleBlockedByPro();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(
          `https://ruangsosmed.id/verify/${effectiveCredentialId} (${learnerName})`
        )
        .catch(() => {});
    }
    setCopiedId(true);
    onShowToast?.(
      `Copied verification URL for Credential ${effectiveCredentialId} to clipboard.`
    );
    setTimeout(() => setCopiedId(false), 2000);
  };

  /**
   * Renders a crisp 2000x1400px HD certificate onto an offscreen HTML5 Canvas
   * and triggers a real `.png` file download in the browser.
   */
  const handleDownloadHighResPng = async () => {
    if (isLockedPro) {
      handleBlockedByPro();
      return;
    }
    setExportingPng(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 2000;
      canvas.height = 1400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Custom Background Image or Procedural Canvas Theme
      if (cfg.customBackgroundUrl) {
        await new Promise<void>((resolve) => {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, 2000, 1400);
            resolve();
          };
          bgImg.onerror = () => {
            // Fallback to white if image fails to load
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, 2000, 1400);
            resolve();
          };
          bgImg.src = cfg.customBackgroundUrl!;
        });
      } else {
        // Crisp Outer Canvas Background
        ctx.fillStyle = "#F8F9FB";
        ctx.fillRect(0, 0, 2000, 1400);

        // Inner White Certificate Card
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#EAECEF";
        ctx.lineWidth = 4;
        ctx.fillRect(70, 70, 1860, 1260);
        ctx.strokeRect(70, 70, 1860, 1260);

        // Border Styling based on template
        if (cfg.borderStyle === "modern-strip") {
          const topGrad = ctx.createLinearGradient(70, 70, 1930, 70);
          topGrad.addColorStop(0, cfg.primaryAccentColor || "#4F39F6");
          topGrad.addColorStop(0.65, "#6366F1");
          topGrad.addColorStop(1, "#F59E0B");
          ctx.fillStyle = topGrad;
          ctx.fillRect(70, 70, 1860, 16);
        } else if (cfg.borderStyle === "double-frame") {
          ctx.strokeStyle = cfg.primaryAccentColor || "#D97706";
          ctx.lineWidth = 6;
          ctx.strokeRect(95, 95, 1810, 1210);
          ctx.lineWidth = 2;
          ctx.strokeRect(110, 110, 1780, 1180);
        }

        // Inner Hairline Border
        ctx.strokeStyle = "#E0E7FF";
        ctx.lineWidth = 2;
        ctx.strokeRect(110, 110, 1780, 1180);

        // Brand Logo Mark if enabled
        if (cfg.showLogo) {
          ctx.fillStyle = cfg.primaryAccentColor || "#4F39F6";
          ctx.beginPath();
          ctx.roundRect(160, 165, 68, 68, 14);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 32px Inter, -apple-system, sans-serif";
          ctx.fillText("rs.", 177, 210);

          ctx.fillStyle = "#121215";
          ctx.font = "800 32px Inter, -apple-system, sans-serif";
          ctx.fillText("ruang sosmed", 248, 208);

          ctx.fillStyle = cfg.primaryAccentColor || "#4F39F6";
          ctx.fillText("2.0", 482, 208);
        }
      }

      // 2. Right-hand Credential Pill on Canvas
      if (cfg.showCredentialId) {
        ctx.fillStyle = "#F8F9FB";
        ctx.strokeStyle = "#EAECEF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1440, 160, 400, 60, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#059669";
        ctx.font = "bold 20px Inter, -apple-system, sans-serif";
        ctx.fillText(`Verified • ${effectiveCredentialId}`, 1470, 198);
      }

      // 3. Certificate Header Eyebrow & Intro
      const isCenter = cfg.recipientNameAlign === "center";
      const startX = isCenter ? 1000 : 160;
      ctx.textAlign = isCenter ? "center" : "left";

      ctx.fillStyle = cfg.primaryAccentColor || "#4F39F6";
      ctx.font = "bold 24px Inter, -apple-system, sans-serif";
      ctx.fillText(cfg.headerEyebrow || "OFFICIAL CERTIFICATE OF MASTERY", startX, 320);

      ctx.fillStyle = "#5E5E5E";
      ctx.font = "500 22px Inter, -apple-system, sans-serif";
      ctx.fillText(
        cfg.headerIntro ||
          "This is to certify that the following creator & digital marketing specialist",
        startX,
        370
      );

      // 4. Learner Full Name (Adjustable Offset & Font)
      const nameY = 480 + (cfg.recipientNameOffsetY * 2 || 0);
      ctx.fillStyle = cfg.recipientNameColor || "#121215";
      const fontFam =
        cfg.recipientNameFontFamily === "serif"
          ? "Georgia, serif"
          : cfg.recipientNameFontFamily === "display"
          ? "Impact, sans-serif"
          : "Inter, -apple-system, sans-serif";
      const fontPx = Math.round((cfg.recipientNameFontSize || 36) * 2.2);
      ctx.font = `800 ${fontPx}px ${fontFam}`;
      ctx.fillText(learnerName, startX, nameY);

      // Learner Role Subtitle
      if (cfg.showRole) {
        ctx.fillStyle = cfg.recipientRoleColor || "#5E5E5E";
        ctx.font = "600 26px Inter, -apple-system, sans-serif";
        ctx.fillText(learnerRole, startX, nameY + 50);
      }

      // Divider Line if not custom upload
      if (!cfg.customBackgroundUrl) {
        ctx.fillStyle = "#EAECEF";
        ctx.fillRect(160, nameY + 85, 1680, 2);
      }

      // 5. Course Completion Statement
      const courseY = nameY + 145 + (cfg.courseTitleOffsetY * 2 || 0);
      ctx.fillStyle = "#5E5E5E";
      ctx.font = "500 22px Inter, -apple-system, sans-serif";
      ctx.fillText(
        cfg.completionStatement ||
          "has successfully completed all curriculum modules, practical brand audits, and mastery assessments for:",
        startX,
        courseY
      );

      // Course Title
      ctx.fillStyle = cfg.courseTitleColor || "#121215";
      const coursePx = Math.round((cfg.courseTitleFontSize || 20) * 2);
      ctx.font = `bold ${coursePx}px Inter, -apple-system, sans-serif`;
      ctx.fillText(effectiveCourseTitle.slice(0, 68), startX, courseY + 60);
      if (effectiveCourseTitle.length > 68) {
        ctx.fillText(effectiveCourseTitle.slice(68), startX, courseY + 115);
      }

      // Distinction Badge
      if (cfg.showBadge) {
        const badgeY =
          courseY + (effectiveCourseTitle.length > 68 ? 160 : 105);
        ctx.fillStyle = cfg.badgeBgColor || "#FEF3C7";
        ctx.beginPath();
        if (isCenter) {
          ctx.roundRect(700, badgeY, 600, 50, 10);
        } else {
          ctx.roundRect(160, badgeY, 600, 50, 10);
        }
        ctx.fill();

        ctx.fillStyle = cfg.badgeTextColor || "#B45309";
        ctx.font = "bold 20px Inter, -apple-system, sans-serif";
        ctx.textAlign = isCenter ? "center" : "left";
        ctx.fillText(
          `★ ${effectiveScoreLabel || cfg.badgeText}`,
          isCenter ? 1000 : 190,
          badgeY + 33
        );
      }

      // 6. Footer Metadata: Completion Date, Credential ID & Signatures
      ctx.textAlign = "left";
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "bold 18px Inter, -apple-system, sans-serif";
      if (cfg.showDate) {
        ctx.fillText(cfg.dateLabel || "COMPLETION DATE", 160, 1160);
        ctx.fillStyle = "#121215";
        ctx.font = "bold 28px Inter, -apple-system, sans-serif";
        ctx.fillText(effectiveCompletionDate, 160, 1205);
      }

      if (cfg.showCredentialId) {
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "bold 18px Inter, -apple-system, sans-serif";
        ctx.fillText(cfg.credentialLabel || "UNIQUE CREDENTIAL ID", 640, 1160);
        ctx.fillStyle = "#121215";
        ctx.font = "bold 28px Inter, -apple-system, sans-serif";
        ctx.fillText(effectiveCredentialId, 640, 1205);
      }

      // Signatory Section (Right Side)
      ctx.textAlign = "right";
      const sigX = 1840;

      if (cfg.signatureType === "image" && cfg.customSignatureUrl) {
        await new Promise<void>((resolve) => {
          const sigImg = new Image();
          sigImg.crossOrigin = "anonymous";
          sigImg.onload = () => {
            ctx.drawImage(sigImg, sigX - 260, 1090, 260, 80);
            resolve();
          };
          sigImg.onerror = () => resolve();
          sigImg.src = cfg.customSignatureUrl!;
        });
      } else {
        ctx.fillStyle = cfg.signatureColor || "#4F39F6";
        ctx.font = "italic bold 42px Georgia, serif";
        ctx.fillText(cfg.signatoryName || "Dinur M. Pradipta", sigX, 1160);
      }

      ctx.fillStyle = "#EAECEF";
      ctx.fillRect(sigX - 440, 1180, 440, 2);

      ctx.fillStyle = "#121215";
      ctx.font = "bold 22px Inter, -apple-system, sans-serif";
      ctx.fillText(cfg.signatoryName || "Dinur M. Pradipta", sigX, 1215);

      ctx.fillStyle = "#5E5E5E";
      ctx.font = "500 18px Inter, -apple-system, sans-serif";
      ctx.fillText(cfg.signatoryTitle || "Lead Mentor & Curriculum Director, Ruang Sosmed 2.0", sigX, 1245);

      // Trigger PNG download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Ruang_Sosmed_2.0_Certificate_${effectiveCredentialId}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast?.(
        `Berhasil mengunduh Sertifikat HD PNG (${effectiveCredentialId}) resolusi 2000×1400.`
      );
    } finally {
      setExportingPng(false);
    }
  };

  const handlePrintPdf = () => {
    if (isLockedPro) {
      handleBlockedByPro();
      return;
    }
    onShowToast?.("Membuka dialog Cetak / Simpan sebagai PDF...");
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isCenter = cfg.recipientNameAlign === "center";
  const nameFontClass =
    cfg.recipientNameFontFamily === "serif"
      ? "font-serif"
      : cfg.recipientNameFontFamily === "display"
      ? "font-black tracking-tight"
      : "font-extrabold";

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="official-rs2-certificate-modal"
      title="Official Ruang Sosmed 2.0 Certificate"
      subtitle={
        hasCoursesProp
          ? courseList.length > 0
            ? `${courseList.length} kursus terdaftar • Aktif: ${effectiveCourseTitle} (${effectiveCredentialId})`
            : `Belum ada kursus yang dijalani untuk ${learnerName}`
          : `Credential ID: ${effectiveCredentialId} • Diterbitkan untuk ${learnerName}`
      }
      maxWidthClass="max-w-4xl"
    >
      {hasCoursesProp && courseList.length === 0 ? (
        <div className="rounded-2xl border border-[#EAECEF] bg-[#F8F9FB] p-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F39F6]">
            <Award size={22} />
          </div>
          <h3 className="text-sm font-bold text-[#121215]">
            Belum Ada Kursus yang Dijalani
          </h3>
          <p className="text-xs text-[#5E5E5E] max-w-md mx-auto leading-relaxed">
            Sertifikat masing-masing kursus akan otomatis muncul di halaman ini
            setelah Anda mengikuti kelas yang telah dibagikan oleh Mentor.
          </p>
        </div>
      ) : (
      <div className="space-y-5">
        {isLockedPro && (
          <div className="rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30">
                <Lock size={14} />
              </span>
              <div>
                <p className="text-xs font-bold text-[#92400E]">
                  🔒 Sertifikat Terkunci — Khusus Member Learner PRO
                </p>
                <p className="text-[11px] text-[#B45309] mt-0.5">
                  Anda dapat melihat daftar sertifikat setiap kursus di bawah, namun pengunduhan PNG HD, cetak PDF, dan klaim Credential ID terkunci hingga menjadi PRO Member.
                </p>
              </div>
            </div>
            {onRequestUpgrade && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestUpgrade();
                }}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] px-3.5 py-2 text-xs font-bold text-[#121215] shadow-xs transition-colors cursor-pointer"
              >
                <Zap size={12} fill="currentColor" />
                <span>Upgrade ke Learner PRO</span>
              </button>
            )}
          </div>
        )}

        {/* Multi-Course Selector Grid when opened from Student Dashboard */}
        {courseList.length > 0 && (
          <div className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <Award size={14} className="text-[#4F39F6]" />
                <span>Daftar Sertifikat Kursus ({courseList.length})</span>
              </p>
              <span className="text-[11px] text-[#64748B]">
                Pilih kursus untuk melihat &amp; mengunduh sertifikatnya
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-0.5">
              {courseList.map((c) => {
                const isSelected = c.id === activeCourseItem?.id;
                const isDone = c.progressPercent >= 100;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`text-left rounded-xl border p-3 transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-white border-[#4F39F6] ring-2 ring-[#4F39F6]/20 shadow-xs"
                        : "bg-white/80 hover:bg-white border-[#EAECEF] hover:border-[#4F39F6]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[#121215] line-clamp-2 leading-snug">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isLockedPro && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FEF3C7] border border-[#F59E0B]/35 px-1.5 py-0.5 text-[10px] font-bold text-[#B45309]">
                            <Lock size={9} />
                            PRO
                          </span>
                        )}
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] border border-[#10B981]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#059669]">
                            <CheckCircle2 size={10} />
                            Diraih
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-[#EEF2FF] border border-[#4F39F6]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#4F39F6] tabular-nums">
                            {c.progressPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#64748B]">
                      <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                        {c.folderName ? (
                          <>
                            <Folder size={10} className="text-[#4F39F6] shrink-0" />
                            <span className="truncate">{c.folderName}</span>
                          </>
                        ) : (
                          <span>
                            {c.completedChapters}/{c.totalChapters} bab
                          </span>
                        )}
                      </span>
                      <code className="font-semibold text-[#475569]">
                        {c.credentialId}
                      </code>
                    </div>

                    <div className="h-1 w-full rounded-full bg-[#EAECEF] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${c.progressPercent}%`,
                          backgroundColor: isDone ? "#10B981" : "#4F39F6",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Visual Certificate Card Preview */}
        <div
          className={`relative overflow-hidden rounded-xl border-2 transition-all ${
            cfg.borderStyle === "double-frame"
              ? "border-[#D97706]/40 p-2 bg-[#FFFBEB]"
              : "border-[#EAECEF] bg-[#FFFFFF]"
          } shadow-[0_8px_30px_rgba(16,15,17,0.06)]`}
        >
          {isLockedPro && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/35 backdrop-blur-[1.5px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FFFBEB]/95 border border-[#F59E0B]/50 px-4 py-2 text-xs font-bold text-[#92400E] shadow-md">
                <Lock size={13} className="text-[#D97706]" />
                <span>Terkunci • Khusus Member Learner PRO</span>
              </div>
            </div>
          )}
          {/* Top Gradient Ribbon if modern strip */}
          {cfg.borderStyle === "modern-strip" && !cfg.customBackgroundUrl && (
            <div
              className="h-2.5 w-full"
              style={{
                background:
                  "linear-gradient(90deg, #4F39F6 0%, #6366F1 60%, #F59E0B 100%)",
              }}
            />
          )}

          <div
            className={`p-6 sm:p-10 space-y-7 relative rounded-lg ${
              cfg.borderStyle === "double-frame" ? "border-2 border-[#D97706]/30 bg-[#FFFFFF]" : ""
            }`}
            style={
              cfg.customBackgroundUrl
                ? {
                    backgroundImage: `url(${cfg.customBackgroundUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {/* Subtle Corner Decorative Seal Watermark */}
            {cfg.showWatermarkSeal && (
              <div
                className="pointer-events-none absolute right-8 bottom-8"
                style={{ opacity: cfg.sealOpacity || 0.06 }}
              >
                <Award size={180} style={{ color: cfg.primaryAccentColor || "#4F39F6" }} />
              </div>
            )}

            {/* Top Header Row: Logo & Verified Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {cfg.showLogo ? (
                <div className="flex items-center gap-2.5">
                  <img
                    src={cfg.customLogoUrl || "/logo1.png"}
                    alt="Ruang Sosmed 2.0"
                    className="h-10 w-auto max-w-[180px] object-contain"
                  />
                </div>
              ) : (
                <div />
              )}

              {cfg.showCredentialId && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 px-3 py-1.5 text-xs font-bold text-[#059669]">
                  <ShieldCheck size={14} />
                  <span>Verified Credential • {effectiveCredentialId}</span>
                </div>
              )}
            </div>

            {/* Main Recipient & Course Section */}
            <div
              className={`space-y-3 pt-2 ${isCenter ? "text-center" : "text-left"}`}
              style={{
                transform: cfg.recipientNameOffsetY
                  ? `translateY(${cfg.recipientNameOffsetY}px)`
                  : undefined,
              }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: cfg.primaryAccentColor || "#4F39F6" }}
              >
                {cfg.headerEyebrow}
              </p>
              <p className="text-xs text-[#5E5E5E]">
                {cfg.headerIntro}
              </p>

              <div className="py-1">
                <h3
                  className={`text-2xl sm:text-4xl tracking-tight ${nameFontClass}`}
                  style={{
                    color: cfg.recipientNameColor || "#121215",
                    fontSize: cfg.recipientNameFontSize
                      ? `${cfg.recipientNameFontSize}px`
                      : undefined,
                  }}
                >
                  {learnerName}
                </h3>
                {cfg.showRole && (
                  <p
                    className="text-xs font-semibold mt-1"
                    style={{ color: cfg.recipientRoleColor || "#5E5E5E" }}
                  >
                    {learnerRole}
                  </p>
                )}
              </div>

              {!cfg.customBackgroundUrl && (
                <div className="h-[1px] w-full bg-[#EAECEF]" />
              )}

              <p className="text-xs text-[#5E5E5E] pt-1">
                {cfg.completionStatement}
              </p>

              <h4
                className={`font-bold leading-snug ${
                  cfg.courseTitleAlign === "center" ? "text-center" : "text-left"
                }`}
                style={{
                  color: cfg.courseTitleColor || "#121215",
                  fontSize: cfg.courseTitleFontSize
                    ? `${cfg.courseTitleFontSize}px`
                    : "18px",
                  transform: cfg.courseTitleOffsetY
                    ? `translateY(${cfg.courseTitleOffsetY}px)`
                    : undefined,
                }}
              >
                {effectiveCourseTitle}
              </h4>

              {cfg.showBadge && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: cfg.badgeBgColor || "#FEF3C7",
                    color: cfg.badgeTextColor || "#B45309",
                    borderColor: `${cfg.badgeTextColor || "#F59E0B"}33`,
                  }}
                >
                  <Sparkles size={13} />
                  <span>{effectiveScoreLabel || cfg.badgeText}</span>
                </div>
              )}
            </div>

            {/* Bottom 3-Column Metadata & Signature */}
            <div className="pt-6 border-t border-[#EAECEF] grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <div>
                {cfg.showDate && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                      {cfg.dateLabel || "Completion Date"}
                    </p>
                    <p className="text-xs font-bold text-[#121215] mt-1">
                      {effectiveCompletionDate}
                    </p>
                  </>
                )}
              </div>

              <div>
                {cfg.showCredentialId && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                      {cfg.credentialLabel || "Unique Credential ID"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-[#F8F9FB] px-2 py-0.5 text-xs font-bold text-[#121215] border border-[#EAECEF]">
                        {effectiveCredentialId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyCredentialId}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                      >
                        {copiedId ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId ? "Copied" : "Copy ID"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="sm:text-right">
                {cfg.signatureType === "image" && cfg.customSignatureUrl ? (
                  <img
                    src={cfg.customSignatureUrl}
                    alt="Signature"
                    className="h-10 w-auto object-contain sm:ml-auto mb-1"
                  />
                ) : (
                  <p
                    className="font-serif italic text-xl font-bold tracking-wide"
                    style={{ color: cfg.signatureColor || "#4F39F6" }}
                  >
                    {cfg.signatoryName || "Dinur M. Pradipta"}
                  </p>
                )}
                <div className="my-1 h-[1px] w-44 sm:ml-auto bg-[#EAECEF]" />
                <p className="text-xs font-bold text-[#121215]">
                  {cfg.signatoryName || "Dinur M. Pradipta"}
                </p>
                <p className="text-[10px] text-[#5E5E5E]">
                  {cfg.signatoryTitle || "Lead Mentor & Curriculum Director, Ruang Sosmed 2.0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-[#5E5E5E]">
              Shareable on LinkedIn (`{effectiveCredentialId}`)
            </p>
            {onOpenStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStudio();
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#EEF2FF] hover:bg-[#E0E7FF] px-2.5 py-1 text-[11px] font-bold text-[#4F39F6] border border-[#C7D2FE] transition-colors cursor-pointer"
              >
                <Palette size={12} />
                <span>Kustomisasi Desain di Studio Sertifikat &rarr;</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isLockedPro ? (
              <>
                <button
                  type="button"
                  onClick={handleBlockedByPro}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] px-4 py-2.5 text-xs font-semibold text-[#4F39F6] border border-[#4F39F6]/25 transition-colors cursor-pointer"
                >
                  <Lock size={13} />
                  <span>🔒 Unlock PDF / Print (PRO)</span>
                </button>

                <button
                  type="button"
                  onClick={handleBlockedByPro}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] px-5 py-2.5 text-xs font-bold text-[#121215] shadow-xs transition-all cursor-pointer"
                >
                  <Lock size={13} />
                  <span>🔒 Unlock Download HD PNG (PRO)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 px-4 py-2.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Save as PDF / Print</span>
                </button>

                <button
                  type="button"
                  disabled={exportingPng}
                  onClick={handleDownloadHighResPng}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-5 py-2.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>
                    {exportingPng
                      ? "Rendering HD PNG..."
                      : "Download High-Res PNG (2000×1400)"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      )}
    </ModalDialog>
  );
}
