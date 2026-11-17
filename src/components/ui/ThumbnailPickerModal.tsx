"use client";

import React, { useState, useEffect } from "react";
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

  // Selected state pending confirmation
  const [pendingSelection, setPendingSelection] =
    useState<SelectedThumbnailValue>(() => {
      if (currentValue?.startsWith("/thumbnail/")) {
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
        value: RUANG_SOSMED_DEFAULT_THUMBNAILS[0]?.src || "/thumbnail/thumbnail1.png",
      };
    });

  // Simulated upload progress
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [unsplashSearch, setUnsplashSearch] = useState("");

  useEffect(() => {
    if (open && currentValue) {
      if (currentValue.startsWith("/thumbnail/")) {
        setPendingSelection({ type: "image", value: currentValue });
      } else if (currentValue.includes("gradient")) {
        setPendingSelection({ type: "gradient", value: currentValue });
      } else if (currentValue.startsWith("#")) {
        setPendingSelection({ type: "color", value: currentValue });
      }
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

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(47);
    setTimeout(() => {
      setUploadProgress(78);
      setTimeout(() => {
        setUploadProgress(100);
        // Fallback to one of the user's uploaded thumbnails
        const assignedThumb =
          RUANG_SOSMED_DEFAULT_THUMBNAILS[
            Math.floor(Math.random() * RUANG_SOSMED_DEFAULT_THUMBNAILS.length)
          ]?.src || "/thumbnail/thumbnail1.png";

        setPendingSelection({
          type: "image",
          value: assignedThumb,
          label: file.name,
        });

        setTimeout(() => {
          setUploadProgress(null);
          onShowToast?.("Berhasil mengunggah custom cover image.");
        }, 400);
      }, 350);
    }, 350);
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
              <label className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D1D5DB] hover:border-[#4F39F6] bg-[#F8F9FB] p-8 text-center transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSimulateUpload}
                />
                <Upload size={28} className="text-[#4F39F6] mb-2" />
                <p className="text-xs font-bold text-[#121215]">
                  Click to upload custom cover image
                </p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  Recommended size: 1200 × 360px (PNG, JPG, WebP up to 5MB)
                </p>
              </label>

              {uploadProgress !== null && (
                <div className="rounded-xl border border-[#EAECEF] bg-[#FFFFFF] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#121215]">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border-2 border-[#EAECEF] border-t-[#4F39F6] animate-spin" />
                      Uploading cover image...
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
