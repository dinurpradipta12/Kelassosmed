"use client";

import React, { useState, useRef } from "react";
import {
  Award,
  Upload,
  RotateCcw,
  Download,
  Save,
  Check,
  Sparkles,
  ShieldCheck,
  Type,
  FileImage,
  Sliders,
  Eye,
  Trash2,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  Palette,
  ExternalLink,
  Layers,
  Grid,
  Info,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { STORAGE_BUCKETS } from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";
import {
  DEFAULT_CERTIFICATE_CONFIG,
  CERTIFICATE_PRESET_TEMPLATES,
  type CertificateDesignConfig,
} from "@/lib/certificate-tokens";
import { OfficialCertificateModal } from "./OfficialCertificateModal";

interface CertificateStudioScreenProps {
  onShowToast: (message: string) => void;
  onExit?: () => void;
}

export function CertificateStudioScreen({
  onShowToast,
  onExit,
}: CertificateStudioScreenProps) {
  const {
    certificateConfig,
    courseCertificateConfigs,
    updateCertificateConfig,
    explorerItems,
  } = useRuangSosmedStore();

  // List of actual courses from explorer for multi-certificate configuration
  const availableCourses = (explorerItems || []).filter(
    (item) => item.type !== "Folder"
  );

  // Course scope: "global" or specific course title
  const [selectedCourseScope, setSelectedCourseScope] =
    useState<string>("global");

  // Local draft state initialized with current selected scope
  const [draftConfig, setDraftConfig] = useState<CertificateDesignConfig>(
    () => certificateConfig || DEFAULT_CERTIFICATE_CONFIG
  );

  const [activeTab, setActiveTab] = useState<
    "template" | "typography" | "signatory" | "metadata"
  >("template");

  // Sub-tab for template: "preset" or "custom"
  const [templateSubTab, setTemplateSubTab] = useState<"preset" | "custom">(
    () =>
      draftConfig.templateId === "custom-upload" ||
      Boolean(draftConfig.customBackgroundUrl)
        ? "custom"
        : "preset"
  );

  // Safe print margin & alignment guides toggle
  const [showGuides, setShowGuides] = useState(false);
  const [isDraggingBg, setIsDraggingBg] = useState(false);

  // Sample student switcher for live visual testing
  const [sampleStudentIdx, setSampleStudentIdx] = useState<number>(0);
  const sampleStudents = [
    {
      name: "Allisha Fathya",
      role: "Social Media Specialist",
      course: "Fundamental Social Media Specialist",
      date: "27 Oktober 2026",
      id: "RS2-2026-8493",
      score: "98% Mastery Score • Top Cohort Distinction",
    },
    {
      name: "test12345",
      role: "Content Creator",
      course: "Mastering Instagram Carousel & Viral Hook Strategy",
      date: "28 Oktober 2026",
      id: "RS2-2026-8494",
      score: "90% Mastery Score • Distinction",
    },
    {
      name: "Dinur M. Pradipta",
      role: "Founder & Lead Creator",
      course: "Content Pillars & Audience Persona",
      date: "29 Oktober 2026",
      id: "RS2-2026-8495",
      score: "100% Mastery Score • Honor Graduate",
    },
  ];
  const activeSample = sampleStudents[sampleStudentIdx];

  // Modal preview state
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateDraft = (patch: Partial<CertificateDesignConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectCourseScope = (scope: string) => {
    setSelectedCourseScope(scope);
    if (scope === "global") {
      const globalCfg = certificateConfig || DEFAULT_CERTIFICATE_CONFIG;
      setDraftConfig(globalCfg);
      setTemplateSubTab(
        globalCfg.templateId === "custom-upload" ||
          Boolean(globalCfg.customBackgroundUrl)
          ? "custom"
          : "preset"
      );
    } else {
      const courseKey = scope.trim().toLowerCase();
      const courseOverride = courseCertificateConfigs?.[courseKey];
      const activeCfg =
        courseOverride || certificateConfig || DEFAULT_CERTIFICATE_CONFIG;
      setDraftConfig(activeCfg);
      setTemplateSubTab(
        activeCfg.templateId === "custom-upload" ||
          Boolean(activeCfg.customBackgroundUrl)
          ? "custom"
          : "preset"
      );
      // Auto-match student preview course name if possible
      const matchIdx = sampleStudents.findIndex(
        (s) => s.course.toLowerCase() === scope.toLowerCase()
      );
      if (matchIdx !== -1) {
        setSampleStudentIdx(matchIdx);
      }
    }
  };

  const handleSaveToGlobalStore = () => {
    updateCertificateConfig(draftConfig, selectedCourseScope);
    if (selectedCourseScope === "global") {
      onShowToast(
        "Desain sertifikat global berhasil disimpan ke Supabase & aktif untuk seluruh kelas!"
      );
    } else {
      onShowToast(
        `Desain sertifikat khusus kelas "${selectedCourseScope}" berhasil disimpan ke Supabase!`
      );
    }
  };

  const handleResetToDefault = () => {
    if (selectedCourseScope === "global") {
      setDraftConfig(DEFAULT_CERTIFICATE_CONFIG);
      updateCertificateConfig(DEFAULT_CERTIFICATE_CONFIG, "global");
      setTemplateSubTab("preset");
      onShowToast(
        "Pengaturan sertifikat global dikembalikan ke template default Ruang Sosmed."
      );
    } else {
      // Revert this course to inherit global
      const baseGlobal = certificateConfig || DEFAULT_CERTIFICATE_CONFIG;
      setDraftConfig(baseGlobal);
      updateCertificateConfig(baseGlobal, selectedCourseScope);
      setTemplateSubTab(
        baseGlobal.templateId === "custom-upload" ||
          Boolean(baseGlobal.customBackgroundUrl)
          ? "custom"
          : "preset"
      );
      onShowToast(
        `Kustomisasi sertifikat kelas "${selectedCourseScope}" direset ke default global.`
      );
    }
  };

  const processBgFile = async (file: File) => {
    if (!file) return;

    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|svg)$/i.test(file.name);

    if (!isImage) {
      onShowToast("Mohon unggah file gambar (PNG, JPG, WebP, atau SVG).");
      return;
    }

    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "certificates/bg",
        fileName: file.name,
        maxWidth: 1600,
        maxHeight: 1130,
        quality: 0.85,
      });
      handleUpdateDraft({
        templateId: "custom-upload",
        customBackgroundUrl: url,
        borderStyle: "none",
        showWatermarkSeal: false,
      });
      setTemplateSubTab("custom");
      onShowToast(
        "Desain sertifikat custom berhasil dioptimasi! Sesuaikan posisi nama di tab Teks & Posisi."
      );
    } catch {
      onShowToast("Gagal mengunggah gambar background sertifikat.");
    }
  };

  // Upload handler for custom background certificate (PNG/JPG/SVG)
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processBgFile(file);
    }
    // Reset value so re-selecting the same file or another file always triggers onChange
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBg(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBg(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBg(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBgFile(file);
    }
  };

  // Upload handler for custom signature (PNG transparent preserved)
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "certificates/signatures",
        fileName: file.name,
        maxWidth: 600,
        maxHeight: 240,
        preferPng: true,
      });
      handleUpdateDraft({
        signatureType: "image",
        customSignatureUrl: url,
      });
      onShowToast("Gambar tanda tangan berhasil diunggah & dioptimasi!");
    } catch {
      onShowToast("Gagal mengunggah gambar tanda tangan.");
    }
  };

  // Upload handler for custom logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const { url } = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "certificates/logos",
        fileName: file.name,
        maxWidth: 512,
        maxHeight: 512,
        preferPng: true,
      });
      handleUpdateDraft({
        showLogo: true,
        customLogoUrl: url,
      });
      onShowToast("Logo institusi berhasil diunggah & dioptimasi!");
    } catch {
      onShowToast("Gagal mengunggah logo institusi.");
    }
  };

  const isCenter = draftConfig.recipientNameAlign === "center";
  const nameFontClass =
    draftConfig.recipientNameFontFamily === "serif"
      ? "font-serif"
      : draftConfig.recipientNameFontFamily === "display"
      ? "font-black tracking-tight"
      : "font-extrabold";

  return (
    <div className="w-full min-h-screen bg-[#F8F9FB] px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header Row with Navigation & Actions */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#EAECEF] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5E5E5E]">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-1 hover:text-[#4F39F6] transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Admin</span>
              </button>
            )}
            <ChevronRight size={12} className="text-[#9CA3AF]" />
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2 py-0.5 text-[11px] font-bold text-[#4F39F6]">
              <Award size={12} />
              <span>Certificate Studio</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#121215]">
            Studio Desain &amp; Kustomisasi Sertifikat
          </h1>
          <p className="text-xs text-[#5E5E5E]">
            Unggah desain sertifikat Anda sendiri (Canva/Figma), sesuaikan teks nama dinamis, judul materi, tanggal, dan tanda tangan mentor secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] hover:text-[#EF4444] transition-colors cursor-pointer"
            title="Kembalikan semua pengaturan ke template default Ruang Sosmed"
          >
            <RotateCcw size={14} />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={() => setModalPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EEF2FF] hover:bg-[#E0E7FF] px-4 py-2 text-xs font-bold text-[#4F39F6] border border-[#C7D2FE] transition-colors cursor-pointer"
          >
            <Eye size={14} />
            <span>Preview Modal Pop-up</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToGlobalStore}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.3)] transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>Simpan Pengaturan Sertifikat</span>
          </button>
        </div>
      </header>

      {/* Target Class / Multi-Certificate Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EAECEF] shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F39F6]">
            <Award size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#121215]">
                Target Sertifikat Kelas:
              </span>
              <select
                aria-label="Pilih kelas untuk kustomisasi sertifikat"
                value={selectedCourseScope}
                onChange={(e) => handleSelectCourseScope(e.target.value)}
                className="rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-bold text-[#4F39F6] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
              >
                <option value="global">🌐 Global Default (Semua Kelas)</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.title}>
                    🎓 {c.title}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-[#5E5E5E] mt-0.5">
              {selectedCourseScope === "global"
                ? "Desain default ini digunakan otomatis oleh semua kelas yang belum memiliki desain sertifikat khusus."
                : `Desain sertifikat ini khusus diterapkan untuk siswa yang menyelesaikan kelas "${selectedCourseScope}".`}
            </p>
          </div>
        </div>

        {selectedCourseScope !== "global" && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#4F39F6] border border-[#C7D2FE]">
              <Sparkles size={12} />
              <span>Sertifikat Khusus Kelas</span>
            </span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs text-[#EF4444] hover:underline font-semibold cursor-pointer"
            >
              Reset ke Global
            </button>
          </div>
        )}
      </div>

      {/* Main Studio Grid: Left Control Panel + Right Live Interactive Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Control Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECEF] shadow-xs overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-[#EAECEF] bg-[#F8F9FB]/60 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("template")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "template"
                  ? "bg-white text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <Palette size={13} />
              <span>1. Template</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("typography")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "typography"
                  ? "bg-white text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <Type size={13} />
              <span>2. Teks &amp; Posisi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("signatory")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "signatory"
                  ? "bg-white text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <Sliders size={13} />
              <span>3. Tanda Tangan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("metadata")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "metadata"
                  ? "bg-white text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                  : "text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              <ShieldCheck size={13} />
              <span>4. Badge &amp; Logo</span>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* TAB 1: TEMPLATE & CUSTOM BACKGROUND UPLOAD */}
            {activeTab === "template" && (
              <div className="space-y-4">
                {/* Mode Selector Segmented Tabs */}
                <div className="flex items-center rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateSubTab("preset");
                      if (draftConfig.templateId === "custom-upload") {
                        handleUpdateDraft({
                          ...CERTIFICATE_PRESET_TEMPLATES[0].config,
                          templateId: "default-modern",
                          customBackgroundUrl: null,
                        });
                      }
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                      templateSubTab === "preset"
                        ? "bg-white text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                        : "text-[#5E5E5E] hover:text-[#121215]"
                    }`}
                  >
                    <Layers size={13} />
                    <span>Template Bawaan (4 Desain)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTemplateSubTab("custom");
                      handleUpdateDraft({
                        templateId: "custom-upload",
                        borderStyle: "none",
                        showWatermarkSeal: false,
                      });
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                      templateSubTab === "custom"
                        ? "bg-white text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                        : "text-[#5E5E5E] hover:text-[#121215]"
                    }`}
                  >
                    <Upload size={13} />
                    <span>Upload Kustom (Canva / Figma)</span>
                  </button>
                </div>

                {/* SubTab 1: Preset Templates Grid (Clean 2x2 without clutter) */}
                {templateSubTab === "preset" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#121215]">
                        Pilih Desain Resmi
                      </p>
                      <span className="text-[11px] text-[#5E5E5E]">
                        Teks nama otomatis berpusat
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CERTIFICATE_PRESET_TEMPLATES.filter(
                        (t) => t.id !== "custom-upload"
                      ).map((tmpl) => {
                        const isSelected =
                          draftConfig.templateId === tmpl.id &&
                          !draftConfig.customBackgroundUrl;

                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => {
                              handleUpdateDraft({
                                ...tmpl.config,
                                templateId: tmpl.id,
                                customBackgroundUrl: null,
                              });
                            }}
                            className={`group relative rounded-xl p-3 border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "bg-[#EEF2FF]/40 border-[#4F39F6] ring-2 ring-[#4F39F6]/20 shadow-xs"
                                : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#D1D5DB]"
                            }`}
                          >
                            <div>
                              <div
                                className="h-14 w-full rounded-lg mb-2.5 flex items-center justify-center relative overflow-hidden"
                                style={{ background: tmpl.thumbnailBg }}
                              >
                                <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#121215] shadow-2xs">
                                  {tmpl.category}
                                </span>
                                {isSelected && (
                                  <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4F39F6] text-white">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-[#121215]">
                                {tmpl.title}
                              </p>
                              <p className="text-[11px] text-[#5E5E5E] line-clamp-2 mt-0.5 leading-relaxed">
                                {tmpl.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SubTab 2: Dedicated Canva & Figma Custom Upload Studio */}
                {templateSubTab === "custom" && (
                  <div className="space-y-4">
                    {/* Active Upload Preview Card */}
                    {draftConfig.customBackgroundUrl ? (
                      <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF]/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F39F6] text-white">
                              <CheckCircle2 size={15} />
                            </span>
                            <div>
                              <p className="text-xs font-bold text-[#121215]">
                                Desain Kustom Aktif
                              </p>
                              <p className="text-[11px] text-[#5E5E5E]">
                                Background kustom Canva / Figma sedang digunakan.
                              </p>
                            </div>
                          </div>
                          <span className="rounded-md bg-[#4F39F6]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                            Landscape A4
                          </span>
                        </div>

                        {/* Thumbnail View */}
                        <div className="relative h-28 w-full rounded-lg overflow-hidden border border-[#D5D9E0] bg-white shadow-2xs">
                          <img
                            src={draftConfig.customBackgroundUrl}
                            alt="Custom Background"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/5" />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <input
                              type="file"
                              accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-20"
                              onChange={handleBgUpload}
                            />
                            <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-2 text-xs font-bold text-white transition-all shadow-xs pointer-events-none">
                              <Upload size={13} />
                              <span>Ganti File Gambar</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateDraft({
                                customBackgroundUrl: null,
                                templateId: "default-modern",
                              });
                              setTemplateSubTab("preset");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#EF4444] border border-[#EAECEF] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Clickable Dropzone Area with Direct Full-Cover Native File Input */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                          isDraggingBg
                            ? "border-[#4F39F6] bg-[#EEF2FF]/60 scale-[1.01]"
                            : "border-[#D1D5DB] bg-[#F8F9FB] hover:border-[#4F39F6] hover:bg-[#EEF2FF]/20"
                        }`}
                      >
                        {/* Transparent Native File Input - Direct OS Trigger On Click & Drag */}
                        <input
                          ref={bgFileInputRef}
                          type="file"
                          accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-30"
                          onChange={handleBgUpload}
                        />

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F39F6] mb-3 pointer-events-none">
                          <Upload size={20} />
                        </div>

                        <h4 className="text-sm font-bold text-[#121215] pointer-events-none">
                          Pilih atau Tarik File Gambar Sertifikat
                        </h4>
                        <p className="text-xs text-[#5E5E5E] mt-1 max-w-xs mx-auto leading-relaxed pointer-events-none">
                          Klik area ini untuk memilih file PNG, JPG, atau WebP dari komputer Anda.
                        </p>

                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white transition-all shadow-xs pointer-events-none">
                          <FileImage size={13} />
                          <span>Pilih File Gambar</span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#EAECEF] flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#5E5E5E] pointer-events-none">
                          <span className="rounded bg-white px-2 py-0.5 border border-[#EAECEF] font-semibold">
                            Format: PNG / JPG / WebP
                          </span>
                          <span className="rounded bg-white px-2 py-0.5 border border-[#EAECEF] font-semibold">
                            Resolusi Rekomendasi: 2000 × 1414 px
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quick Canva / Figma Guidance Note */}
                    <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 text-xs text-[#5E5E5E] space-y-1">
                      <p className="font-bold text-[#121215] flex items-center gap-1.5">
                        <Info size={13} className="text-[#4F39F6]" />
                        <span>Tips Desain Canva / Figma</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        1. Buat ukuran kanvas <strong>A4 Landscape</strong> (2000 × 1414 px).<br />
                        2. <strong>Kosongkan teks nama peserta</strong> pada desain Anda.<br />
                        3. Sistem Ruang Sosmed akan otomatis mencetak nama masing-masing siswa dan detail materi di atas garis nama.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TYPOGRAPHY, POSITIONING & DYNAMIC NAME BINDING */}
            {activeTab === "typography" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3 text-xs text-[#1E40AF] space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Dynamic Auto-Binding Aktif</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#1E3A8A]">
                    Nama siswa, judul materi kelas, tanggal, dan kode sertifikat akan otomatis menyesuaikan dengan data setiap siswa saat sertifikat dibuka atau diunduh.
                  </p>
                </div>

                {/* Recipient Name Controls */}
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-bold text-[#121215] flex items-center justify-between">
                    <span>Ukuran Font Nama Peserta</span>
                    <span className="text-[#4F39F6] tabular-nums font-mono">
                      {draftConfig.recipientNameFontSize}px
                    </span>
                  </label>
                  <input
                    type="range"
                    min={24}
                    max={52}
                    value={draftConfig.recipientNameFontSize}
                    onChange={(e) =>
                      handleUpdateDraft({
                        recipientNameFontSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#4F39F6] cursor-pointer"
                  />
                </div>

                {/* Recipient Name Vertical Offset (Penting agar pas dengan garis Canva) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#121215] flex items-center justify-between">
                    <span>Posisi Vertikal Nama (Offset Y)</span>
                    <span className="text-[#4F39F6] tabular-nums font-mono">
                      {draftConfig.recipientNameOffsetY > 0
                        ? `+${draftConfig.recipientNameOffsetY}px (Bawah)`
                        : draftConfig.recipientNameOffsetY < 0
                        ? `${draftConfig.recipientNameOffsetY}px (Atas)`
                        : "0px (Tengah)"}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    value={draftConfig.recipientNameOffsetY}
                    onChange={(e) =>
                      handleUpdateDraft({
                        recipientNameOffsetY: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#4F39F6] cursor-pointer"
                  />
                  <p className="text-[10px] text-[#5E5E5E]">
                    Gunakan slider ini jika desain Canva/Figma Anda memiliki garis nama dan Anda ingin teks jatuh tepat di atas garis.
                  </p>
                </div>

                {/* Font Family & Alignment */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#121215]">
                      Font Style
                    </label>
                    <select
                      value={draftConfig.recipientNameFontFamily}
                      onChange={(e) =>
                        handleUpdateDraft({
                          recipientNameFontFamily: e.target
                            .value as CertificateDesignConfig["recipientNameFontFamily"],
                        })
                      }
                      className="w-full rounded-lg bg-[#F8F9FB] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                    >
                      <option value="sans">Modern Sans-Serif</option>
                      <option value="serif">Classic Elegant Serif</option>
                      <option value="display">Bold Display</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#121215]">
                      Rata Teks
                    </label>
                    <div className="flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateDraft({ recipientNameAlign: "left" })
                        }
                        className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                          draftConfig.recipientNameAlign === "left"
                            ? "bg-white text-[#4F39F6] shadow-2xs"
                            : "text-[#5E5E5E]"
                        }`}
                      >
                        Kiri
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateDraft({ recipientNameAlign: "center" })
                        }
                        className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                          draftConfig.recipientNameAlign === "center"
                            ? "bg-white text-[#4F39F6] shadow-2xs"
                            : "text-[#5E5E5E]"
                        }`}
                      >
                        Tengah
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warna Teks Nama */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-[#121215]">
                    Warna Teks Nama
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draftConfig.recipientNameColor}
                      onChange={(e) =>
                        handleUpdateDraft({
                          recipientNameColor: e.target.value,
                        })
                      }
                      className="h-7 w-7 rounded cursor-pointer border border-[#EAECEF]"
                    />
                    <span className="text-xs font-mono text-[#5E5E5E]">
                      {draftConfig.recipientNameColor}
                    </span>
                  </div>
                </div>

                <div className="h-[1px] w-full bg-[#EAECEF]" />

                {/* Course Title & Eyebrow Inputs */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#121215]">
                      Teks Header / Eyebrow
                    </label>
                    <input
                      type="text"
                      value={draftConfig.headerEyebrow}
                      onChange={(e) =>
                        handleUpdateDraft({ headerEyebrow: e.target.value })
                      }
                      className="w-full rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#121215]">
                      Kalimat Pernyataan Kelulusan
                    </label>
                    <textarea
                      rows={2}
                      value={draftConfig.completionStatement}
                      onChange={(e) =>
                        handleUpdateDraft({ completionStatement: e.target.value })
                      }
                      className="w-full rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SIGNATORY, MENTOR & SIGNATURE */}
            {activeTab === "signatory" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Tanda Tangan &amp; Otoritas Sertifikat
                  </h3>
                  <p className="text-xs text-[#5E5E5E] mt-0.5">
                    Atur nama mentor, jabatan resmi, dan bentuk tanda tangan yang dicetak pada sertifikat.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#121215]">
                    Nama Penandatangan Resmi
                  </label>
                  <input
                    type="text"
                    value={draftConfig.signatoryName}
                    onChange={(e) =>
                      handleUpdateDraft({ signatoryName: e.target.value })
                    }
                    placeholder="Dinur M. Pradipta"
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#121215]">
                    Jabatan / Title Penandatangan
                  </label>
                  <input
                    type="text"
                    value={draftConfig.signatoryTitle}
                    onChange={(e) =>
                      handleUpdateDraft({ signatoryTitle: e.target.value })
                    }
                    placeholder="Lead Mentor & Curriculum Director, Ruang Sosmed 2.0"
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>

                {/* Signature Style Mode */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-[#121215]">
                    Format Tanda Tangan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateDraft({ signatureType: "script" })
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        draftConfig.signatureType === "script"
                          ? "bg-[#EEF2FF] border-[#4F39F6] text-[#4F39F6]"
                          : "bg-white border-[#EAECEF] text-[#5E5E5E]"
                      }`}
                    >
                      <p className="text-xs font-bold">Script Cursive</p>
                      <p className="text-[11px] font-serif italic mt-1">
                        {draftConfig.signatoryName}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateDraft({ signatureType: "image" });
                        if (!draftConfig.customSignatureUrl) {
                          sigFileInputRef.current?.click();
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        draftConfig.signatureType === "image"
                          ? "bg-[#EEF2FF] border-[#4F39F6] text-[#4F39F6]"
                          : "bg-white border-[#EAECEF] text-[#5E5E5E]"
                      }`}
                    >
                      <p className="text-xs font-bold">Upload Tanda Tangan PNG</p>
                      <p className="text-[10px] mt-1 text-[#5E5E5E]">
                        {draftConfig.customSignatureUrl ? "File aktif ✓" : "Pilih gambar transparan"}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Upload Signature Box */}
                {draftConfig.signatureType === "image" && (
                  <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F9FB] p-4 text-center space-y-2">
                    <input
                      ref={sigFileInputRef}
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={handleSignatureUpload}
                    />

                    {draftConfig.customSignatureUrl ? (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#EAECEF]">
                        <img
                          src={draftConfig.customSignatureUrl}
                          alt="Tanda Tangan"
                          className="h-8 w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateDraft({
                              customSignatureUrl: null,
                              signatureType: "script",
                            })
                          }
                          className="text-xs text-[#EF4444] hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#4F39F6] border border-[#EAECEF] shadow-2xs hover:bg-[#F8F9FB]"
                      >
                        <Upload size={13} />
                        <span>Upload File PNG Tanda Tangan</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: BADGES, LOGO & METADATA */}
            {activeTab === "metadata" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Logo, Seal Medali &amp; Kode Verifikasi
                  </h3>
                  <p className="text-xs text-[#5E5E5E] mt-0.5">
                    Aktifkan atau nonaktifkan elemen pelengkap kredensial pada sertifikat.
                  </p>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-1">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#EAECEF] bg-[#F8F9FB]/60 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        Tampilkan Logo Brand / Institusi
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        Menampilkan logo resmi di pojok kiri atas sertifikat.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftConfig.showLogo}
                      onChange={(e) =>
                        handleUpdateDraft({ showLogo: e.target.checked })
                      }
                      className="h-4 w-4 accent-[#4F39F6] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#EAECEF] bg-[#F8F9FB]/60 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        Tampilkan Badge Verified Credential
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        Badge hijau verifikasi dengan kode credential unik.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftConfig.showCredentialId}
                      onChange={(e) =>
                        handleUpdateDraft({ showCredentialId: e.target.checked })
                      }
                      className="h-4 w-4 accent-[#4F39F6] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#EAECEF] bg-[#F8F9FB]/60 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        Tampilkan Badge Nilai / Distinction
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        Label skor mastery (misal: 98% Mastery Score).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftConfig.showBadge}
                      onChange={(e) =>
                        handleUpdateDraft({ showBadge: e.target.checked })
                      }
                      className="h-4 w-4 accent-[#4F39F6] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#EAECEF] bg-[#F8F9FB]/60 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        Tampilkan Watermark Seal Medali
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        Embos watermark medali di pojok kanan bawah.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftConfig.showWatermarkSeal}
                      onChange={(e) =>
                        handleUpdateDraft({
                          showWatermarkSeal: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#4F39F6] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Visual WYSIWYG Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Studio Canvas Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAECEF] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#121215]">
                Simulasi Siswa:
              </span>
              <select
                aria-label="Pilih siswa untuk simulasi sertifikat"
                value={sampleStudentIdx}
                onChange={(e) => setSampleStudentIdx(Number(e.target.value))}
                className="rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-bold text-[#4F39F6] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
              >
                {sampleStudents.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    {s.name} ({s.course})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Guides Toggle */}
              <button
                type="button"
                onClick={() => setShowGuides(!showGuides)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                  showGuides
                    ? "bg-[#06B6D4]/10 border-[#06B6D4] text-[#0891B2]"
                    : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215]"
                }`}
                title="Tampilkan garis bantu batas aman margin cetak (15mm)"
              >
                <Grid size={13} />
                <span>{showGuides ? "Panduan: ON" : "Garis Panduan"}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
              >
                <Eye size={13} className="text-[#4F39F6]" />
                <span>Test Unduh HD</span>
              </button>
            </div>
          </div>

          {/* Studio Artboard Canvas Workspace (With Blueprint Dots & Paper Shadow) */}
          <div
            className="rounded-2xl border border-[#D5D9E0] bg-[#ECEEF2] p-3 sm:p-6 lg:p-8 flex items-center justify-center min-h-[520px] relative overflow-hidden shadow-inner"
            style={{
              backgroundImage: "radial-gradient(#9CA3AF 1.2px, transparent 1.2px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Resolution indicator tag */}
            <div className="absolute top-3 left-3 hidden sm:inline-flex items-center gap-1.5 rounded-md bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-[#5E5E5E] border border-[#D5D9E0] shadow-2xs z-30">
              <span>📐 A4 Landscape (297 × 210 mm)</span>
              <span>•</span>
              <span className="text-[#059669]">Siap Cetak HD</span>
            </div>

            {/* Interactive Live Certificate Paper Artboard */}
            <div className="relative w-full max-w-[760px] overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-black/5 flex flex-col justify-between">
              {/* Safe Margin Guide Overlay (When Toggled) */}
              {showGuides && (
                <div className="pointer-events-none absolute inset-3 sm:inset-5 border border-dashed border-[#06B6D4] rounded-lg z-30">
                  <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-[#0891B2] bg-white/95 px-1 rounded shadow-2xs">
                    Safe Margin 15mm
                  </span>
                </div>
              )}

              {/* Top Gradient Accent Ribbon */}
              {draftConfig.borderStyle === "modern-strip" &&
                !draftConfig.customBackgroundUrl && (
                  <div
                    className="h-2.5 w-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #4F39F6 0%, #6366F1 60%, #F59E0B 100%)",
                    }}
                  />
                )}

            <div
              className={`p-6 sm:p-10 space-y-7 relative min-h-[440px] flex flex-col justify-between ${
                draftConfig.borderStyle === "double-frame"
                  ? "border-2 border-[#D97706]/40 m-2 rounded-xl bg-white"
                  : ""
              }`}
              style={
                draftConfig.customBackgroundUrl
                  ? {
                      backgroundImage: `url(${draftConfig.customBackgroundUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {/* Watermark Seal */}
              {draftConfig.showWatermarkSeal && (
                <div
                  className="pointer-events-none absolute right-8 bottom-8"
                  style={{ opacity: draftConfig.sealOpacity || 0.06 }}
                >
                  <Award
                    size={160}
                    style={{
                      color: draftConfig.primaryAccentColor || "#4F39F6",
                    }}
                  />
                </div>
              )}

              {/* Header: Logo & Verified Badge */}
              <div className="flex items-center justify-between gap-4">
                {draftConfig.showLogo ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={draftConfig.customLogoUrl || "/logo1.png"}
                      alt="Ruang Sosmed 2.0"
                      className="h-9 w-auto max-w-[160px] object-contain"
                    />
                  </div>
                ) : (
                  <div />
                )}

                {draftConfig.showCredentialId && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-1 text-[11px] font-bold text-[#059669]">
                    <ShieldCheck size={13} />
                    <span>Verified • {activeSample.id}</span>
                  </div>
                )}
              </div>

              {/* Body: Recipient & Course Statement */}
              <div
                className={`space-y-3 pt-2 ${
                  isCenter ? "text-center" : "text-left"
                }`}
                style={{
                  transform: draftConfig.recipientNameOffsetY
                    ? `translateY(${draftConfig.recipientNameOffsetY}px)`
                    : undefined,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    color: draftConfig.primaryAccentColor || "#4F39F6",
                  }}
                >
                  {draftConfig.headerEyebrow}
                </p>
                <p className="text-xs text-[#5E5E5E]">
                  {draftConfig.headerIntro}
                </p>

                <div className="py-1">
                  <h3
                    className={`text-2xl sm:text-3xl tracking-tight ${nameFontClass} ${
                      !draftConfig.customBackgroundUrl &&
                      (!draftConfig.recipientNameColor ||
                        draftConfig.recipientNameColor.toUpperCase() === "#121215")
                        ? "text-[#121215]"
                        : ""
                    }`}
                    style={{
                      color:
                        !draftConfig.customBackgroundUrl &&
                        (!draftConfig.recipientNameColor ||
                          draftConfig.recipientNameColor.toUpperCase() === "#121215")
                          ? undefined
                          : draftConfig.recipientNameColor || "#121215",
                      fontSize: draftConfig.recipientNameFontSize
                        ? `${draftConfig.recipientNameFontSize}px`
                        : undefined,
                    }}
                  >
                    {activeSample.name}
                  </h3>
                  {draftConfig.showRole && (
                    <p
                      className={`text-xs font-semibold mt-1 ${
                        !draftConfig.customBackgroundUrl &&
                        (!draftConfig.recipientRoleColor ||
                          draftConfig.recipientRoleColor.toUpperCase() === "#5E5E5E")
                          ? "text-[#5E5E5E]"
                          : ""
                      }`}
                      style={{
                        color:
                          !draftConfig.customBackgroundUrl &&
                          (!draftConfig.recipientRoleColor ||
                            draftConfig.recipientRoleColor.toUpperCase() === "#5E5E5E")
                            ? undefined
                            : draftConfig.recipientRoleColor || "#5E5E5E",
                      }}
                    >
                      {activeSample.role}
                    </p>
                  )}
                </div>

                {!draftConfig.customBackgroundUrl && (
                  <div className="h-[1px] w-full bg-[#EAECEF]" />
                )}

                <p className="text-xs text-[#5E5E5E]">
                  {draftConfig.completionStatement}
                </p>

                <h4
                  className={`font-bold leading-snug ${
                    draftConfig.courseTitleAlign === "center"
                      ? "text-center"
                      : "text-left"
                  } ${
                    !draftConfig.customBackgroundUrl &&
                    (!draftConfig.courseTitleColor ||
                      draftConfig.courseTitleColor.toUpperCase() === "#121215")
                      ? "text-[#121215]"
                      : ""
                  }`}
                  style={{
                    color:
                      !draftConfig.customBackgroundUrl &&
                      (!draftConfig.courseTitleColor ||
                        draftConfig.courseTitleColor.toUpperCase() === "#121215")
                        ? undefined
                        : draftConfig.courseTitleColor || "#121215",
                    fontSize: draftConfig.courseTitleFontSize
                      ? `${draftConfig.courseTitleFontSize}px`
                      : "18px",
                  }}
                >
                  {activeSample.course}
                </h4>

                {draftConfig.showBadge && (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: draftConfig.badgeBgColor || "#FEF3C7",
                      color: draftConfig.badgeTextColor || "#B45309",
                      borderColor: `${draftConfig.badgeTextColor || "#F59E0B"}33`,
                    }}
                  >
                    <Sparkles size={12} />
                    <span>{activeSample.score}</span>
                  </div>
                )}
              </div>

              {/* Footer: Date, Credential ID, Signature */}
              <div className="pt-6 border-t border-[#EAECEF] grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  {draftConfig.showDate && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                        {draftConfig.dateLabel || "COMPLETION DATE"}
                      </p>
                      <p className="text-xs font-bold text-[#121215] mt-0.5">
                        {activeSample.date}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  {draftConfig.showCredentialId && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                        {draftConfig.credentialLabel || "UNIQUE CREDENTIAL ID"}
                      </p>
                      <code className="mt-0.5 inline-block rounded bg-[#F8F9FB] px-2 py-0.5 text-xs font-bold text-[#121215] border border-[#EAECEF]">
                        {activeSample.id}
                      </code>
                    </>
                  )}
                </div>

                <div className="sm:text-right">
                  {draftConfig.signatureType === "image" &&
                  draftConfig.customSignatureUrl ? (
                    <img
                      src={draftConfig.customSignatureUrl}
                      alt="Tanda Tangan"
                      className="h-9 w-auto object-contain sm:ml-auto mb-1"
                    />
                  ) : (
                    <p
                      className="font-serif italic text-lg font-bold tracking-wide"
                      style={{
                        color: draftConfig.signatureColor || "#4F39F6",
                      }}
                    >
                      {draftConfig.signatoryName || "Dinur M. Pradipta"}
                    </p>
                  )}
                  <div className="my-1 h-[1px] w-36 sm:ml-auto bg-[#EAECEF]" />
                  <p className="text-xs font-bold text-[#121215]">
                    {draftConfig.signatoryName || "Dinur M. Pradipta"}
                  </p>
                  <p className="text-[10px] text-[#5E5E5E]">
                    {draftConfig.signatoryTitle ||
                      "Lead Mentor & Curriculum Director, Ruang Sosmed 2.0"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Modal Preview */}
      <OfficialCertificateModal
        open={modalPreviewOpen}
        onClose={() => setModalPreviewOpen(false)}
        learnerName={activeSample.name}
        learnerRole={activeSample.role}
        courseTitle={activeSample.course}
        completionDate={activeSample.date}
        credentialId={activeSample.id}
        scoreLabel={activeSample.score}
        onShowToast={onShowToast}
        configOverride={draftConfig}
      />
    </div>
  );
}
