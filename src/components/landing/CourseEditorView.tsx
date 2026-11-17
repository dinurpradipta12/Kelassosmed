"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Video,
  FileText,
  Bold,
  Italic,
  Heading2,
  List,
  AlignLeft,
  AlignCenter,
  Link2,
  Globe,
  AtSign,
  Briefcase,
  Paperclip,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Textarea,
  Badge,
} from "@/components/ui/SaasUI";
import { ImageUpload } from "@/components/landing/ImageCropModal";
import {
  type CourseBuilderItem,
  type MaterialItem,
  type AssetResource,
  type PostTestQuestion,
  type PostTestQuestionType,
  extractYouTubeVideoId,
} from "@/types/lms-builder";

const PRESET_CATEGORY_COLORS = [
  "#4F39F6",
  "#10B981",
  "#0EA5E9",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#EF4444",
];

interface CourseEditorViewProps {
  initialCourse: CourseBuilderItem;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSave: (course: CourseBuilderItem) => Promise<void> | void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export function CourseEditorView({
  initialCourse,
  theme,
  onToggleTheme,
  onSave,
  onBack,
  onShowToast,
}: CourseEditorViewProps) {
  const [course, setCourse] = useState<CourseBuilderItem>(initialCourse);
  const [isSaving, setIsSaving] = useState(false);

  // Category tag creator
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("#4F39F6");

  // Drag & Drop state for materials
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Supporting asset creator
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<AssetResource["type"]>("PDF");
  const [assetUrl, setAssetUrl] = useState("");

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...course,
        materials: course.materials.map((m, idx) => ({ ...m, order: idx })),
      });
      onShowToast("Perubahan kursus berhasil disimpan & disinkronkan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Categories
  const handleAddCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    setCourse((prev) => ({
      ...prev,
      categories: [...prev.categories, { label, color: newCatColor }],
    }));
    setNewCatLabel("");
  };

  const handleRemoveCategory = (idx: number) => {
    setCourse((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== idx),
    }));
  };

  // Materials
  const handleAddMaterial = (type: "video" | "text") => {
    const now = Date.now();
    const newMat: MaterialItem =
      type === "video"
        ? {
            id: `mat-${now}`,
            type: "video",
            title: "Materi Video Baru",
            youtubeUrl: "",
            duration: "08:30",
            notes: "",
            order: course.materials.length,
          }
        : {
            id: `mat-${now}`,
            type: "text",
            title: "Materi Bacaan Baru",
            content: "## Ringkasan Materi\n\nTuliskan poin-poin penting di sini...",
            notes: "",
            order: course.materials.length,
          };
    setCourse((prev) => ({ ...prev, materials: [...prev.materials, newMat] }));
  };

  const handleUpdateMaterial = (
    id: string,
    patch: Partial<MaterialItem>
  ) => {
    setCourse((prev) => ({
      ...prev,
      materials: prev.materials.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        if (
          patch.youtubeUrl !== undefined &&
          extractYouTubeVideoId(patch.youtubeUrl) &&
          !m.duration
        ) {
          next.duration = "12:00";
        }
        return next;
      }),
    }));
  };

  const handleDeleteMaterial = (id: string) => {
    setCourse((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }));
  };

  const handleDropMaterial = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const next = [...course.materials];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, moved);
    setCourse((prev) => ({ ...prev, materials: next }));
    setDraggedIdx(null);
  };

  const appendMarkdownToken = (matId: string, token: string) => {
    const mat = course.materials.find((m) => m.id === matId);
    if (!mat) return;
    const current = mat.content || "";
    handleUpdateMaterial(matId, { content: `${current}${current ? "\n" : ""}${token}` });
  };

  // Assets
  const handleAddAsset = () => {
    if (!assetName.trim() || !assetUrl.trim()) return;
    const newAsset: AssetResource = {
      id: `asset-${Date.now()}`,
      name: assetName.trim(),
      type: assetType,
      url: assetUrl.trim(),
    };
    setCourse((prev) => ({ ...prev, assets: [...prev.assets, newAsset] }));
    setAssetName("");
    setAssetUrl("");
  };

  const handleRemoveAsset = (id: string) => {
    setCourse((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id),
    }));
  };

  // Post-Test Questions (Recorded Class mode)
  const handleAddQuestion = (qType: PostTestQuestionType) => {
    const q: PostTestQuestion = {
      id: `q-${Date.now()}`,
      type: qType,
      question: "Pertanyaan baru...",
      options:
        qType === "multiple_choice"
          ? ["Opsi A", "Opsi B", "Opsi C", "Opsi D"]
          : qType === "true_false"
          ? ["Benar", "Salah"]
          : [],
      correctAnswer:
        qType === "multiple_choice"
          ? "Opsi A"
          : qType === "true_false"
          ? "Benar"
          : "",
      points: 20,
    };
    setCourse((prev) => ({
      ...prev,
      postTest: {
        ...prev.postTest,
        enabled: true,
        questions: [...prev.postTest.questions, q],
      },
    }));
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] transition-colors pb-16"
    >
      {/* Sticky Editor Header */}
      <header className="sticky top-10 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack}>
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[var(--text)] truncate max-w-[260px] sm:max-w-md">
                  {course.title || "Editor Kursus"}
                </h1>
                <Badge variant={course.published ? "success" : "default"}>
                  {course.published ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                ID: {course.id} • Short Link: /c/{course.shortCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleTheme}
              title="Toggle Light / Dark Mode"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span className="hidden sm:inline">
                {theme === "dark" ? "Light" : "Dark"}
              </span>
            </Button>

            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={course.published}
                onChange={(e) =>
                  setCourse((prev) => ({ ...prev, published: e.target.checked }))
                }
                className="accent-[var(--accent)]"
              />
              <span>Publish</span>
            </label>

            <a
              href={`/c/${course.shortCode}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Preview</span>
            </a>

            <Button
              variant="primary"
              size="md"
              onClick={handleSaveClick}
              disabled={isSaving}
            >
              <Save size={14} />
              <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2-Column Editor Body (2/3 Left, 1/3 Right Sticky) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 2/3: Main Course Information + Curriculum + Post-Test */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Informasi Utama */}
          <Card padded className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text)]">
                Informasi Utama
              </h2>
              <Badge variant="accent">
                {course.spaceType === "recorded_class"
                  ? "Recorded Class"
                  : "Product Tutorial"}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text)]">
                Judul Kursus
              </label>
              <Input
                value={course.title}
                onChange={(e) =>
                  setCourse((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Contoh: Fundamental Social Media Growth"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text)]">
                Deskripsi Singkat
              </label>
              <Textarea
                rows={3}
                value={course.description}
                onChange={(e) =>
                  setCourse((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Jelaskan manfaat dan materi utama kursus..."
              />
            </div>

            {/* Kategori Kursus */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-semibold text-[var(--text)]">
                Kategori Kursus
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {course.categories.map((cat, idx) => (
                  <span
                    key={`${cat.label}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                    style={{ backgroundColor: cat.color }}
                  >
                    <span>{cat.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(idx)}
                      className="hover:opacity-75 cursor-pointer"
                      aria-label={`Hapus kategori ${cat.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Nama kategori baru..."
                  className="max-w-[200px]"
                />
                <div className="flex items-center gap-1.5">
                  {PRESET_CATEGORY_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewCatColor(col)}
                      className={`h-6 w-6 rounded-lg cursor-pointer transition-transform ${
                        newCatColor === col
                          ? "ring-2 ring-offset-1 ring-[var(--text)] scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    title="Pilih warna kustom"
                    className="h-7 w-7 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={handleAddCategory}>
                  <Plus size={13} />
                  <span>Tambah Tag</span>
                </Button>
              </div>
            </div>

            {/* Gambar Cover 16:9 */}
            <ImageUpload
              label="Gambar Cover (16:9)"
              value={course.coverUrl}
              aspect="16:9"
              onChange={(png) =>
                setCourse((prev) => ({ ...prev, coverUrl: png }))
              }
              onClear={() =>
                setCourse((prev) => ({ ...prev, coverUrl: "" }))
              }
            />

            {/* Recorded Class Cover Options */}
            {course.spaceType === "recorded_class" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--muted)]">
                    Cover Position
                  </label>
                  <select
                    value={course.coverPosition}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        coverPosition: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text)] border border-[var(--border)]"
                  >
                    <option value="50% 50%">Center</option>
                    <option value="50% 0%">Top</option>
                    <option value="50% 100%">Bottom</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--muted)]">
                    Cover Zoom ({course.coverZoom}x)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={1.6}
                    step={0.05}
                    value={course.coverZoom}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        coverZoom: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[var(--accent)] mt-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--muted)]">
                    Cover Text Mode
                  </label>
                  <select
                    value={course.coverTextMode}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        coverTextMode:
                          e.target.value === "dark" ? "dark" : "light",
                      }))
                    }
                    className="w-full rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text)] border border-[var(--border)]"
                  >
                    <option value="light">Light Text</option>
                    <option value="dark">Dark Text</option>
                  </select>
                </div>
              </div>
            )}
          </Card>

          {/* 2. Kurikulum Materi (Drag & Drop) */}
          <Card padded className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">
                  Kurikulum Materi ({course.materials.length})
                </h2>
                <p className="text-[11px] text-[var(--muted)]">
                  Seret ikon grip untuk mengurutkan ulang materi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAddMaterial("video")}
                >
                  <Video size={13} />
                  <span>+ Video</span>
                </Button>
                <Button
                  variant="green"
                  size="sm"
                  onClick={() => handleAddMaterial("text")}
                >
                  <FileText size={13} />
                  <span>+ Teks</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {course.materials.map((mat, index) => {
                const ytValid = mat.youtubeUrl
                  ? Boolean(extractYouTubeVideoId(mat.youtubeUrl))
                  : false;

                return (
                  <div
                    key={mat.id}
                    draggable
                    onDragStart={() => setDraggedIdx(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropMaterial(index)}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="cursor-grab text-[var(--muted)] hover:text-[var(--text)]"
                          title="Drag untuk urutkan"
                        >
                          <GripVertical size={16} />
                        </span>
                        <Badge
                          variant={mat.type === "video" ? "accent" : "success"}
                        >
                          {mat.type === "video" ? "Video" : "Teks"} #{index + 1}
                        </Badge>
                        <Input
                          value={mat.title}
                          onChange={(e) =>
                            handleUpdateMaterial(mat.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder="Judul materi..."
                          className="font-semibold"
                        />
                      </div>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteMaterial(mat.id)}
                        title="Hapus materi"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    {mat.type === "video" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-9 space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--muted)] flex items-center justify-between">
                            <span>YouTube Link</span>
                            {ytValid && (
                              <span className="text-[var(--success-text)] flex items-center gap-1">
                                <CheckCircle2 size={11} /> Link YouTube valid
                              </span>
                            )}
                          </label>
                          <Input
                            value={mat.youtubeUrl || ""}
                            onChange={(e) =>
                              handleUpdateMaterial(mat.id, {
                                youtubeUrl: e.target.value,
                              })
                            }
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--muted)]">
                            Durasi
                          </label>
                          <Input
                            value={mat.duration || ""}
                            onChange={(e) =>
                              handleUpdateMaterial(mat.id, {
                                duration: e.target.value,
                              })
                            }
                            placeholder="10:00"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Rich Text / Markdown Formatting Toolbar */}
                        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(mat.id, "**teks tebal**")
                            }
                            title="Bold"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <Bold size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(mat.id, "*teks miring*")
                            }
                            title="Italic"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <Italic size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(mat.id, "## Subjudul")
                            }
                            title="Heading"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <Heading2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(mat.id, "- Poin daftar")
                            }
                            title="List"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <List size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(mat.id, '<div align="left">Teks rata kiri</div>')
                            }
                            title="Align Left"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <AlignLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(mat.id, '<div align="center">Teks rata tengah</div>')
                            }
                            title="Align Center"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <AlignCenter size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              appendMarkdownToken(
                                mat.id,
                                "[Judul Link](https://ruangsosmed.id)"
                              )
                            }
                            title="Link"
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text)] cursor-pointer"
                          >
                            <Link2 size={13} />
                          </button>
                        </div>
                        <Textarea
                          rows={5}
                          value={mat.content || ""}
                          onChange={(e) =>
                            handleUpdateMaterial(mat.id, {
                              content: e.target.value,
                            })
                          }
                          placeholder="Tulis materi dalam format Markdown atau teks biasa..."
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--muted)]">
                        Catatan / Deskripsi Materi (Opsional)
                      </label>
                      <Input
                        value={mat.notes || ""}
                        onChange={(e) =>
                          handleUpdateMaterial(mat.id, {
                            notes: e.target.value,
                          })
                        }
                        placeholder="Catatan tambahan untuk peserta..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 3. Post-Test / Quiz Builder (Recorded Class Mode) */}
          {course.spaceType === "recorded_class" && (
            <Card padded className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  <h2 className="text-sm font-bold text-[var(--text)]">
                    Pengaturan Kelas Rekaman &amp; Post-Test
                  </h2>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={course.overallFeedbackEnabled}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        overallFeedbackEnabled: e.target.checked,
                      }))
                    }
                    className="accent-[var(--accent)]"
                  />
                  <span>Aktifkan Feedback Kelas</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--muted)]">
                    Mode Post-Test
                  </label>
                  <select
                    value={course.postTestMode}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        postTestMode:
                          e.target.value === "per_material"
                            ? "per_material"
                            : "tab",
                      }))
                    }
                    className="w-full rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text)] border border-[var(--border)]"
                  >
                    <option value="tab">Tab Terpisah</option>
                    <option value="per_material">Per Materi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--muted)]">
                    Passing Score (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={course.postTest.passingScore}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        postTest: {
                          ...prev.postTest,
                          passingScore: Number(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--muted)]">
                    Max Attempts
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={course.postTest.maxAttempts}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        postTest: {
                          ...prev.postTest,
                          maxAttempts: Number(e.target.value) || 1,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddQuestion("multiple_choice")}
                >
                  <Plus size={12} /> Pilihan Ganda
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddQuestion("true_false")}
                >
                  <Plus size={12} /> Benar / Salah
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddQuestion("essay")}
                >
                  <Plus size={12} /> Esai
                </Button>
              </div>

              {course.postTest.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="accent">
                      <HelpCircle size={11} />
                      {q.type === "multiple_choice"
                        ? "Pilihan Ganda"
                        : q.type === "true_false"
                        ? "Benar/Salah"
                        : "Esai"}{" "}
                      #{qIdx + 1}
                    </Badge>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setCourse((prev) => ({
                          ...prev,
                          postTest: {
                            ...prev.postTest,
                            questions: prev.postTest.questions.filter(
                              (item) => item.id !== q.id
                            ),
                          },
                        }))
                      }
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <Input
                    value={q.question}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        postTest: {
                          ...prev.postTest,
                          questions: prev.postTest.questions.map((item) =>
                            item.id === q.id
                              ? { ...item, question: e.target.value }
                              : item
                          ),
                        },
                      }))
                    }
                    placeholder="Tulis pertanyaan..."
                  />
                  {q.type !== "essay" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === opt}
                            onChange={() =>
                              setCourse((prev) => ({
                                ...prev,
                                postTest: {
                                  ...prev.postTest,
                                  questions: prev.postTest.questions.map(
                                    (item) =>
                                      item.id === q.id
                                        ? { ...item, correctAnswer: opt }
                                        : item
                                  ),
                                },
                              }))
                            }
                            className="accent-[var(--accent)]"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCourse((prev) => ({
                                ...prev,
                                postTest: {
                                  ...prev.postTest,
                                  questions: prev.postTest.questions.map(
                                    (item) => {
                                      if (item.id !== q.id) return item;
                                      const nextOpts = item.options.map(
                                        (o, i) => (i === oIdx ? val : o)
                                      );
                                      return {
                                        ...item,
                                        options: nextOpts,
                                        correctAnswer:
                                          item.correctAnswer === opt
                                            ? val
                                            : item.correctAnswer,
                                      };
                                    }
                                  ),
                                },
                              }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* RIGHT 1/3 STICKY SIDEBAR: Info Mentor + Asset Pendukung */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* Info Mentor */}
          <Card padded className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text)] border-b border-[var(--border)] pb-3">
              Info Mentor
            </h2>

            <ImageUpload
              label="Foto Mentor (1:1)"
              value={course.mentor.avatarUrl}
              aspect="1:1"
              onChange={(png) =>
                setCourse((prev) => ({
                  ...prev,
                  mentor: { ...prev.mentor, avatarUrl: png },
                }))
              }
              onClear={() =>
                setCourse((prev) => ({
                  ...prev,
                  mentor: { ...prev.mentor, avatarUrl: "" },
                }))
              }
            />

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                  Nama Lengkap
                </label>
                <Input
                  value={course.mentor.name}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, name: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                  Role / Jabatan
                </label>
                <Input
                  value={course.mentor.role}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, role: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                  Bio Singkat
                </label>
                <Textarea
                  rows={3}
                  value={course.mentor.bio}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, bio: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <p className="text-[11px] font-semibold text-[var(--muted)]">
                Social Media &amp; Website
              </p>
              <div className="flex items-center gap-2">
                <AtSign size={14} className="text-[var(--muted)] shrink-0" />
                <Input
                  value={course.mentor.instagram || ""}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, instagram: e.target.value },
                    }))
                  }
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-[var(--muted)] shrink-0" />
                <Input
                  value={course.mentor.linkedin || ""}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, linkedin: e.target.value },
                    }))
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-[var(--muted)] shrink-0" />
                <Input
                  value={course.mentor.tiktok || ""}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, tiktok: e.target.value },
                    }))
                  }
                  placeholder="https://tiktok.com/@..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-[var(--muted)] shrink-0" />
                <Input
                  value={course.mentor.website || ""}
                  onChange={(e) =>
                    setCourse((prev) => ({
                      ...prev,
                      mentor: { ...prev.mentor, website: e.target.value },
                    }))
                  }
                  placeholder="https://website.com"
                />
              </div>
            </div>
          </Card>

          {/* Asset Pendukung */}
          <Card padded className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text)]">
                Asset Pendukung
              </h2>
              <Badge>{course.assets.length}</Badge>
            </div>

            <div className="space-y-2">
              {course.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={13} className="text-[var(--accent)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text)] truncate">
                        {asset.name}
                      </p>
                      <p className="text-[10px] text-[var(--muted)] truncate">
                        {asset.type} • {asset.url}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAsset(asset.id)}
                    className="p-1 rounded-lg text-[var(--danger-text)] hover:bg-[var(--danger-soft)] cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <Input
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Nama asset (mis. Template Notion)"
              />
              <div className="flex items-center gap-2">
                <select
                  value={assetType}
                  onChange={(e) =>
                    setAssetType(e.target.value as AssetResource["type"])
                  }
                  className="rounded-xl bg-[var(--surface-soft)] px-2.5 py-2 text-xs text-[var(--text)] border border-[var(--border)]"
                >
                  <option value="PDF">PDF</option>
                  <option value="Template">Template</option>
                  <option value="Link">Link</option>
                  <option value="File">File</option>
                </select>
                <Input
                  value={assetUrl}
                  onChange={(e) => setAssetUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleAddAsset}
              >
                <Plus size={13} />
                <span>Tambah Asset</span>
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
