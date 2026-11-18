"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Check,
  Search,
  Sparkles,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import {
  RUANG_SOSMED_DEFAULT_THUMBNAILS,
  COLOR_AND_GRADIENT_PRESETS,
  SIMPLE_ILLUSTRATION_PRESETS,
  type DefaultThumbnailItem,
} from "@/lib/thumbnail-library";

export interface SelectedThumbnailValue {
  type: "image" | "gradient" | "color";
  value: string; // e.g. "/thumbnail/thumbnail1.png" or "linear-gradient(...)" or "#34D399"
  label?: string;
}

interface ThumbnailPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectThumbnail: (val: SelectedThumbnailValue) => void;
  currentValue?: string;
  onRemoveThumbnail?: () => void;
  onShowToast?: (msg: string) => void;
  title?: string;
}

const UNSPLASH_CURATED = [
  {
    id: "uns-1",
    label: "Creative Workspace",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "uns-2",
    label: "Digital Marketing Analytics",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "uns-3",
    label: "Social Media Strategy",
    url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "uns-4",
    label: "Content Creator Studio",
    url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "uns-5",
    label: "Team Collaboration",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "uns-6",
    label: "Modern Typography & Design",
    url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
  },
];

function resolveInitialSelection(currentValue?: string): SelectedThumbnailValue {
  if (
    currentValue?.startsWith("/") ||
    currentValue?.startsWith("http") ||
    currentValue?.startsWith("data:image/")
  ) {
    return { type: "image", value: currentValue };
  }
  if (currentValue?.includes("gradient")) {
    return { type: "gradient", value: currentValue };
  }
  if (currentValue?.startsWith("#")) {
    return { type: "color", value: currentValue };
  }
  return {
    type: "image",
    value:
      RUANG_SOSMED_DEFAULT_THUMBNAILS[0]?.src || "/thumbnail/thumbnail1.png",
  };
}

export function ThumbnailPickerModal({
  open,
  onClose,
  onSelectThumbnail,
  currentValue,
  onRemoveThumbnail,
  onShowToast,
  title = "Choose Thumbnail",
}: ThumbnailPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"gallery" | "upload" | "unsplash">(
    "gallery"
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Selected state pending confirmation
  const [pendingSelection, setPendingSelection] =
    useState<SelectedThumbnailValue>(() =>
      resolveInitialSelection(currentValue)
    );

  // Real upload preview & progress state
  const [uploadedPreview, setUploadedPreview] = useState<{
    dataUrl: string;
    fileName: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [unsplashSearch, setUnsplashSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setUploadError(null);
    setUploadProgress(null);
    if (currentValue) {
      setPendingSelection(resolveInitialSelection(currentValue));
      if (currentValue.startsWith("data:image/")) {
        setUploadedPreview({
          dataUrl: currentValue,
          fileName: "Cover Kustom Terpasang",
        });
      } else {
        setUploadedPreview(null);
      }
    } else {
      setUploadedPreview(null);
    }
  }, [open, currentValue]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const processUploadedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      const msg = "Format file harus berupa gambar (PNG, JPG, WebP).";
      setUploadError(msg);
      onShowToast?.(msg);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const msg = "Ukuran file maksimal 10MB.";
      setUploadError(msg);
      onShowToast?.(msg);
      return;
    }

    setUploadError(null);
    setUploadProgress(35);

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadProgress(null);
      const msg = "Gagal membaca file gambar. Silakan coba file lain.";
      setUploadError(msg);
      onShowToast?.(msg);
    };
    reader.onload = () => {
      const rawDataUrl =
        typeof reader.result === "string" ? reader.result : "";
      if (!rawDataUrl) {
        setUploadProgress(null);
        setUploadError("File gambar kosong atau rusak.");
        return;
      }

      setUploadProgress(70);
      const img = new window.Image();
      img.onerror = () => {
        // Fallback: gunakan hasil data URL langsung bila browser tidak merender canvas
        setUploadedPreview({ dataUrl: rawDataUrl, fileName: file.name });
        setPendingSelection({
          type: "image",
          value: rawDataUrl,
          label: file.name,
        });
        setUploadProgress(100);
        window.setTimeout(() => {
          setUploadProgress(null);
          onShowToast?.(
            `Preview cover "${file.name}" siap. Klik Save untuk menerapkan.`
          );
        }, 250);
      };
      img.onload = () => {
        let optimizedUrl = rawDataUrl;
        try {
          const maxW = 1280;
          const maxH = 720;
          let targetW = img.naturalWidth || img.width || maxW;
          let targetH = img.naturalHeight || img.height || maxH;
          if (targetW > maxW || targetH > maxH) {
            const ratio = Math.min(maxW / targetW, maxH / targetH);
            targetW = Math.max(1, Math.round(targetW * ratio));
            targetH = Math.max(1, Math.round(targetH * ratio));
          }
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            optimizedUrl = canvas.toDataURL("image/jpeg", 0.86);
          }
        } catch {
          optimizedUrl = rawDataUrl;
        }

        setUploadProgress(100);
        setUploadedPreview({ dataUrl: optimizedUrl, fileName: file.name });
        setPendingSelection({
          type: "image",
          value: optimizedUrl,
          label: file.name,
        });

        window.setTimeout(() => {
          setUploadProgress(null);
          onShowToast?.(
            `Preview cover "${file.name}" siap. Klik Save untuk menerapkan.`
          );
        }, 250);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    processUploadedFile(file);
  };

  const handleDropFile = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleSave = () => {
    onSelectThumbnail(pendingSelection);
    onShowToast?.("Thumbnail berhasil diperbarui.");
    onClose();
  };

  const handleRemove = () => {
    if (onRemoveThumbnail) {
      onRemoveThumbnail();
      onShowToast?.("Thumbnail dihapus.");
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header Tabs: Gallery | Upload | Unsplash */}
        <div className="flex items-center justify-between border-b border-[#EAECEF] px-5 pt-4 pb-2.5">
          <div className="flex items-center gap-6 text-xs font-bold">
            {(
              [
                { id: "gallery", label: "Gallery" },
                { id: "upload", label: "Upload" },
                { id: "unsplash", label: "Unsplash" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`pb-1.5 transition-colors cursor-pointer ${
                  activeTab === t.id
                    ? "text-[#4F39F6] border-b-2 border-[#4F39F6]"
                    : "text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-[#9CA3AF] hover:bg-[#F8F9FB] hover:text-[#121215] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "gallery" && (
            <div className="space-y-5">
              {/* SECTION 1: Ruang Sosmed Default Thumbnails (16 items from src/thumbnail) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#4F39F6]" />
                    Default Ruang Sosmed Thumbnails ({RUANG_SOSMED_DEFAULT_THUMBNAILS.length})
                  </p>
                  <span className="text-[10px] text-[#9CA3AF]">
                    src/thumbnail/
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
                  {RUANG_SOSMED_DEFAULT_THUMBNAILS.map((t) => {
                    const isSelected =
                      pendingSelection.type === "image" &&
                      pendingSelection.value === t.src;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setPendingSelection({
                            type: "image",
                            value: t.src,
                            label: t.title,
                          })
                        }
                        className={`group relative h-16 rounded-xl border-2 overflow-hidden transition-all cursor-pointer bg-[#F8F9FB] ${
                          isSelected
                            ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/25 shadow-sm scale-[1.02]"
                            : "border-[#EAECEF] hover:border-[#4F39F6]/50"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.src}
                          alt={t.title}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 text-left">
                          <p className="text-[9px] font-medium text-white truncate">
                            {t.title}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: Color and gradient */}
              <div className="space-y-2 pt-1 border-t border-[#EAECEF]">
                <p className="text-xs font-semibold text-[#5E5E5E]">
                  Color and gradient
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_AND_GRADIENT_PRESETS.map((sw) => {
                    const isSelected =
                      (pendingSelection.type === "color" ||
                        pendingSelection.type === "gradient") &&
                      pendingSelection.value === sw.bg;

                    return (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() =>
                          setPendingSelection({
                            type: sw.bg.includes("gradient")
                              ? "gradient"
                              : "color",
                            value: sw.bg,
                            label: sw.name,
                          })
                        }
                        className={`relative h-11 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/25 scale-[1.02]"
                            : "border-[#EAECEF] hover:border-[#4F39F6]/40"
                        }`}
                        style={{ background: sw.bg }}
                      >
                        {isSelected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: Simple illustration */}
              <div className="space-y-2 pt-1 border-t border-[#EAECEF]">
                <p className="text-xs font-semibold text-[#5E5E5E]">
                  Simple illustration
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {SIMPLE_ILLUSTRATION_PRESETS.map((ill) => {
                    const isSelected =
                      pendingSelection.value === ill.bg &&
                      pendingSelection.label === ill.label;

                    return (
                      <button
                        key={ill.id}
                        type="button"
                        onClick={() =>
                          setPendingSelection({
                            type: "gradient",
                            value: ill.bg,
                            label: ill.label,
                          })
                        }
                        className={`relative h-12 rounded-xl border-2 p-1.5 flex flex-col justify-end text-left overflow-hidden transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/25 scale-[1.02]"
                            : "border-[#EAECEF] hover:border-[#4F39F6]/40"
                        }`}
                        style={{ background: ill.bg }}
                      >
                        <span className="text-[9px] font-bold text-[#121215] truncate bg-white/80 rounded px-1 max-w-full">
                          {ill.label}
                        </span>
                        {isSelected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Futuristic buildings */}
              <div className="space-y-2 pt-1 border-t border-[#EAECEF]">
                <p className="text-xs font-semibold text-[#5E5E5E]">
                  Futuristic buildings
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((archIdx) => {
                    const bgPattern =
                      "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)";
                    const isSelected =
                      pendingSelection.value === bgPattern &&
                      pendingSelection.label === `Building ${archIdx + 1}`;

                    return (
                      <button
                        key={`arch-${archIdx}`}
                        type="button"
                        onClick={() =>
                          setPendingSelection({
                            type: "gradient",
                            value: bgPattern,
                            label: `Building ${archIdx + 1}`,
                          })
                        }
                        className={`relative h-11 rounded-xl border-2 p-1.5 flex items-end justify-center gap-1 transition-all cursor-pointer bg-[#E0F2FE] ${
                          isSelected
                            ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/25 scale-[1.02]"
                            : "border-[#EAECEF] hover:border-[#4F39F6]/40"
                        }`}
                      >
                        <span className="h-5 w-2 bg-[#38BDF8] rounded-t-xs" />
                        <span className="h-7 w-3 bg-[#0284C7] rounded-t-xs" />
                        <span className="h-4 w-2 bg-[#6366F1] rounded-t-xs" />
                        {isSelected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "upload" && (
            <div className="space-y-4">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                }}
                onDrop={handleDropFile}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-[#4F39F6] bg-[#EEF2FF]/60"
                    : "border-[#D1D5DB] hover:border-[#4F39F6] bg-[#F8F9FB]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <Upload size={26} className="text-[#4F39F6] mb-2" />
                <p className="text-xs font-bold text-[#121215]">
                  Klik atau seret gambar untuk upload cover
                </p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  Rekomendasi 1200 × 360px / 16:9 (PNG, JPG, WebP maks. 10MB)
                </p>
              </label>

              {uploadError && (
                <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-semibold text-[#DC2626]">
                  {uploadError}
                </div>
              )}

              {uploadProgress !== null && (
                <div className="rounded-xl border border-[#EAECEF] bg-[#FFFFFF] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#121215]">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-[#EAECEF] border-t-[#4F39F6] animate-spin" />
                      Memproses gambar cover...
                    </span>
                    <span className="tabular-nums text-[#4F39F6]">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#EAECEF] overflow-hidden">
                    <div
                      className="h-full bg-[#4F39F6] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadedPreview && (
                <div className="rounded-2xl border border-[#EAECEF] bg-[#FFFFFF] p-3 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ImageIcon size={13} className="text-[#4F39F6] shrink-0" />
                      <span className="text-xs font-bold text-[#121215] truncate">
                        Preview Cover: {uploadedPreview.fileName}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2 py-0.5 text-[10px] font-bold text-[#059669] shrink-0">
                      <Check size={10} strokeWidth={3} />
                      <span>Siap Disimpan</span>
                    </span>
                  </div>

                  <div className="relative h-44 w-full overflow-hidden rounded-xl border border-[#EAECEF] bg-[#F8F9FB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedPreview.dataUrl}
                      alt={`Preview Cover ${uploadedPreview.fileName}`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 border border-[#EAECEF] px-3 py-1.5 text-[11px] font-semibold text-[#121215] cursor-pointer transition-colors"
                    >
                      <Upload size={12} className="text-[#4F39F6]" />
                      <span>Ganti Gambar Lain</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPreview(null);
                        setPendingSelection(resolveInitialSelection(currentValue));
                      }}
                      className="text-[11px] font-semibold text-[#EF4444] hover:underline cursor-pointer"
                    >
                      Batal Upload
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "unsplash" && (
            <div className="space-y-3.5">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="text"
                  value={unsplashSearch}
                  onChange={(e) => setUnsplashSearch(e.target.value)}
                  placeholder="Search photos from Unsplash..."
                  className="w-full rounded-xl bg-[#F8F9FB] border border-[#EAECEF] pl-9 pr-3 py-2 text-xs text-[#121215] focus:outline-none focus:border-[#4F39F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {UNSPLASH_CURATED.filter((u) =>
                  unsplashSearch
                    ? u.label
                        .toLowerCase()
                        .includes(unsplashSearch.toLowerCase())
                    : true
                ).map((u) => {
                  const isSelected =
                    pendingSelection.type === "image" &&
                    pendingSelection.value === u.url;

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setPendingSelection({
                          type: "image",
                          value: u.url,
                          label: u.label,
                        })
                      }
                      className={`group relative h-24 rounded-xl border-2 overflow-hidden text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/25"
                          : "border-[#EAECEF] hover:border-[#4F39F6]/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.url}
                        alt={u.label}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <p className="text-[10px] font-semibold text-white truncate">
                          {u.label}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-xs">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Cover Live Preview Strip */}
        <div className="flex items-center gap-3 border-t border-[#EAECEF] bg-[#FFFFFF] px-5 py-2.5">
          <div
            className="h-11 w-20 shrink-0 overflow-hidden rounded-lg border border-[#EAECEF] bg-[#F8F9FB]"
            style={
              pendingSelection.type !== "image"
                ? { background: pendingSelection.value }
                : undefined
            }
          >
            {pendingSelection.type === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingSelection.value}
                alt="Preview cover terpilih"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Preview Cover Terpilih
            </p>
            <p className="text-xs font-semibold text-[#121215] truncate">
              {pendingSelection.label ||
                (pendingSelection.type === "image"
                  ? "Custom Cover Image"
                  : "Color / Gradient Cover")}
            </p>
          </div>
        </div>

        {/* Footer: Remove thumbnail (left) | Cancel | Save (right) */}
        <div className="flex items-center justify-between border-t border-[#EAECEF] px-5 py-3 bg-[#F8F9FB]">
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EF4444] hover:text-[#DC2626] cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Remove thumbnail</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#FFFFFF] border border-[#EAECEF] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-[#4F39F6] hover:bg-[#3E29D8] px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
