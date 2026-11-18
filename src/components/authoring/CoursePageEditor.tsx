"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Clock,
  Play,
  CheckCircle2,
  Plus,
  GripVertical,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  AlertCircle,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Video,
  Image as ImageIcon,
  Paperclip,
  Upload,
  ZoomIn,
  FileText,
  Download,
  Trash2,
  Pencil,
  X,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Palette,
  MoreHorizontal,
  Copy,
  MessageSquare,
  Globe,
  Table2,
  LayoutGrid,
  ChevronRight,
  Wand2,
  Eye,
  EyeOff,
  Zap,
  Lock,
  Check,
  Save,
} from "lucide-react";
import {
  INITIAL_EDITOR_SECTIONS,
  type EditorSection,
  type EditorChapter,
} from "@/lib/phase3-data";
import { INITIAL_VERSIONS, type ContentVersionItem } from "@/lib/phase2-data";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { type CourseSectionAccordion } from "@/lib/phase5-data";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { ThumbnailPickerModal } from "@/components/ui/ThumbnailPickerModal";
import { COLOR_AND_GRADIENT_PRESETS } from "@/lib/thumbnail-library";

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const raw = String(url).trim();
  if (!raw) return null;

  // 1. If iframe tag was pasted, extract src
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  const target = (iframeMatch ? iframeMatch[1] : raw).trim();

  // 2. Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(target)) {
    return target;
  }

  // 3. youtu.be/<id> or youtube.com/(embed|v|shorts|live)/<id>
  const directMatch = target.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i
  );
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  // 4. youtube.com/watch?v=<id> or query param v=<id>
  const watchMatch = target.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  // 5. Fallback for non-standard IDs (at least 6 chars)
  const fallbackShort = target.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (fallbackShort?.[1]) {
    return fallbackShort[1].split("?")[0].split("&")[0];
  }
  const fallbackWatch = target.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);
  if (fallbackWatch?.[1]) {
    return fallbackWatch[1];
  }
  const fallbackEmbed = target.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/i);
  if (fallbackEmbed?.[1]) {
    return fallbackEmbed[1].split("?")[0].split("&")[0];
  }

  return null;
}

export function getYouTubeEmbedUrl(url?: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function accordionToEditorSections(
  accordions: CourseSectionAccordion[]
): EditorSection[] {
  return accordions.map((sec, secIdx) => ({
    id: sec.id || `sec-${secIdx + 1}`,
    title: sec.sectionTitle,
    hidden: Boolean(sec.hidden),
    chapters: (sec.chapters || []).map((ch, chIdx) => ({
      id: ch.id || `ch-${secIdx + 1}-${chIdx + 1}`,
      title: ch.title,
      readingTime: ch.duration || "10 mins",
      points: `${ch.points || 10} pts`,
      bodyText: ch.contentParagraphs ? ch.contentParagraphs.join("\n\n") : "",
      calloutText: ch.calloutTip || "",
      videoMode: ch.videoMode || ("embed" as const),
      videoUrl: ch.videoUrl || "",
      videoFileName: ch.videoTitle || "",
      imageCaption: ch.imageCaption || "",
      imageZoomEnabled: Boolean(ch.imageZoomEnabled),
      attachments: (ch.attachments || []).map((a, aIdx) => ({
        id: `att-${aIdx}`,
        name: a.name,
        size: a.size || "1.0 MB",
        format: (a.name.endsWith(".zip")
          ? "ZIP"
          : a.name.endsWith(".pdf")
          ? "PDF"
          : "NOTION") as any,
      })),
      embeddedBlocks: ch.embeddedBlocks,
      databaseRows: ch.databaseRows,
      hidden: Boolean(ch.hidden),
      hideTextBlock: Boolean(ch.hideTextBlock),
      hideCallout: Boolean(ch.hideCallout),
      hideVideoBlock: Boolean(ch.hideVideoBlock),
      hideImageBlock: Boolean(ch.hideImageBlock),
      hideAttachmentBlock: Boolean(ch.hideAttachmentBlock),
      hideEmbeddedBlock: Boolean(ch.hideEmbeddedBlock),
      hideDatabaseBlock: Boolean(ch.hideDatabaseBlock),
      isPro: Boolean(ch.isPro),
    })),
  }));
}

export function editorSectionsToAccordion(
  sections: EditorSection[]
): CourseSectionAccordion[] {
  return sections.map((sec, secIdx) => ({
    id: sec.id || `csec-${secIdx + 1}`,
    sectionTitle: sec.title,
    shortTitle: sec.title.split(":")[0] || `Sec ${secIdx + 1}`,
    hidden: Boolean(sec.hidden),
    chapters: sec.chapters.map((ch, chIdx) => ({
      id: ch.id || `cch-${secIdx + 1}-${chIdx + 1}`,
      title: ch.title,
      type: "Lesson" as const,
      duration: ch.readingTime || "10 mins",
      completed: false,
      locked: false,
      points: parseInt(ch.points) || 10,
      videoTitle: ch.videoFileName || `${ch.title} Video Lesson`,
      videoDuration: ch.readingTime || "10:00",
      videoUrl: ch.videoUrl || "",
      videoMode: ch.videoMode || "embed",
      contentParagraphs: ch.bodyText
        ? ch.bodyText.split("\n\n").filter(Boolean)
        : ch.bodyText
        ? [ch.bodyText]
        : [],
      calloutTip: ch.calloutText || "",
      imageCaption: ch.imageCaption || "",
      imageZoomEnabled: Boolean(ch.imageZoomEnabled),
      attachments: (ch.attachments || []).map((a) => ({
        name: a.name,
        size: a.size,
      })),
      embeddedBlocks: ch.embeddedBlocks,
      databaseRows: ch.databaseRows,
      hidden: Boolean(ch.hidden),
      hideTextBlock: Boolean(ch.hideTextBlock),
      hideCallout: Boolean(ch.hideCallout),
      hideVideoBlock: Boolean(ch.hideVideoBlock),
      hideImageBlock: Boolean(ch.hideImageBlock),
      hideAttachmentBlock: Boolean(ch.hideAttachmentBlock),
      hideEmbeddedBlock: Boolean(ch.hideEmbeddedBlock),
      hideDatabaseBlock: Boolean(ch.hideDatabaseBlock),
      isPro: Boolean(ch.isPro),
    })),
  }));
}

function BlockVisibilityToggle({
  hidden,
  onToggle,
  blockLabel,
}: {
  hidden?: boolean;
  onToggle: () => void;
  blockLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        hidden
          ? `Tampilkan ${blockLabel} di halaman Learner`
          : `Sembunyikan ${blockLabel} dari halaman Learner`
      }
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
        hidden
          ? "bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEE2E2]"
          : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6]"
      }`}
    >
      {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      <span>{hidden ? "Hidden from Learners" : "Hide Section"}</span>
    </button>
  );
}

function createBlankEditorSections(seed: string): EditorSection[] {
  const cleanSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "") || String(Date.now());
  return [
    {
      id: `sec-${cleanSeed}-1`,
      title: "Section 1",
      hidden: false,
      chapters: [
        {
          id: `ch-${cleanSeed}-1`,
          title: "Chapter 1",
          readingTime: "10 mins",
          points: "10 pts",
          bodyText: "",
          calloutText: "",
          videoMode: "embed",
          videoUrl: "",
          videoFileName: "",
          imageCaption: "",
          imageZoomEnabled: false,
          attachments: [],
          embeddedBlocks: [],
          databaseRows: [],
        },
      ],
    },
  ];
}

interface CoursePageEditorProps {
  initialTitle?: string;
  contentType?: "Course" | "Page";
  isNew?: boolean;
  draftSessionId?: string;
  folderName?: string;
  initialSections?: CourseSectionAccordion[];
  onBack: () => void;
  onPublish: (
    title: string,
    type: "Course" | "Page",
    sections?: CourseSectionAccordion[],
    description?: string
  ) => void;
  onShowToast: (msg: string) => void;
}

export function CoursePageEditor({
  initialTitle = "",
  contentType = "Course",
  isNew = false,
  draftSessionId,
  folderName,
  initialSections,
  onBack,
  onPublish,
  onShowToast,
}: CoursePageEditorProps) {
  const {
    getCourseCurriculum,
    courseCurriculums,
    saveCourseCurriculumLive,
    explorerItems,
    updateContentLanguage,
    updateExplorerItemDetails,
  } = useRuangSosmedStore();
  const [docTitle, setDocTitle] = useState(() =>
    isNew ? initialTitle || "" : initialTitle
  );
  const savedTitleRef = useRef(isNew ? "" : initialTitle);

  const [sections, setSections] = useState<EditorSection[]>(() => {
    if (isNew) {
      const seed = draftSessionId || String(Date.now());
      if (typeof window !== "undefined" && draftSessionId) {
        try {
          const savedNewDraft = window.localStorage.getItem(
            `ruang_sosmed_editor_draft_${draftSessionId}`
          );
          if (savedNewDraft) {
            const parsed = JSON.parse(savedNewDraft);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {}
      }
      return createBlankEditorSections(seed);
    }

    // 1. Cek prop initialSections jika dikirim eksplisit
    if (initialSections && initialSections.length > 0) {
      return accordionToEditorSections(initialSections);
    }
    const key = initialTitle.toLowerCase().trim();
    if (typeof window !== "undefined" && key) {
      try {
        // 2. Cek apakah ada draft yang pernah diedit di editor untuk course ini
        const draft = window.localStorage.getItem(
          `ruang_sosmed_editor_sections_${key}`
        );
        if (draft) {
          const parsed = JSON.parse(draft);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }

        // 3. Cek kurikulum yang tersimpan di localStorage
        const published = window.localStorage.getItem(
          `ruang_sosmed_curriculum_${key}`
        );
        if (published) {
          const parsed = JSON.parse(published);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return accordionToEditorSections(parsed);
          }
        }
      } catch {}
    }
    // 4. Cek kurikulum di global store
    if (key && courseCurriculums && courseCurriculums[key]) {
      return accordionToEditorSections(courseCurriculums[key]);
    }
    // 5. Fallback blank (never pre-populate from another course)
    return isNew
      ? createBlankEditorSections(draftSessionId || String(Date.now()))
      : INITIAL_EDITOR_SECTIONS;
  });

  const [activeSectionId, setActiveSectionId] = useState(
    () => sections[0]?.id || "sec-1"
  );
  const [activeChapterId, setActiveChapterId] = useState(
    () => sections[0]?.chapters[0]?.id || "ch-101"
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versions, setVersions] = useState<ContentVersionItem[]>(() =>
    isNew ? [] : INITIAL_VERSIONS
  );
  const [lastSavedLabel, setLastSavedLabel] = useState(() =>
    isNew ? "Draft Baru (Mulai dari 0)" : "Saved in Ruang Sosmed 2.0"
  );
  const [courseIsPro, setCourseIsPro] = useState<boolean>(() => {
    if (isNew) return false;
    const key = initialTitle.toLowerCase().trim();
    if (typeof window !== "undefined" && key) {
      try {
        const saved = window.localStorage.getItem(
          `ruang_sosmed_course_tier_${key}`
        );
        if (saved) return saved === "pro";
      } catch {}
    }
    return false;
  });

  const currentExplorerItem = isNew
    ? undefined
    : explorerItems?.find(
        (it) =>
          it.title.trim().toLowerCase() ===
          savedTitleRef.current.trim().toLowerCase()
      );
  const isEditingExisting = !isNew && Boolean(currentExplorerItem);
  const [courseLang, setCourseLang] = useState<string>(() => {
    return currentExplorerItem?.language || "Bahasa Indonesia";
  });
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    if (currentExplorerItem?.language) {
      setCourseLang(currentExplorerItem.language);
    }
  }, [currentExplorerItem?.language]);

  // Auto-save draft ke localStorage saat sections berubah; isolasi draft baru per draftSessionId agar tidak bentrok dengan course sebelumnya
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNew) {
      if (draftSessionId) {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_editor_draft_${draftSessionId}`,
            JSON.stringify(sections)
          );
        } catch {}
      }
      return;
    }

    const activeSavedTitle = savedTitleRef.current?.trim();
    if (activeSavedTitle) {
      try {
        const key = activeSavedTitle.toLowerCase();
        window.localStorage.setItem(
          `ruang_sosmed_editor_sections_${key}`,
          JSON.stringify(sections)
        );
        if (isEditingExisting) {
          const mapped = editorSectionsToAccordion(sections);
          saveCourseCurriculumLive(activeSavedTitle, mapped);
        }
      } catch {}
    }
  }, [sections, isNew, draftSessionId, isEditingExisting, saveCourseCurriculumLive]);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "left"
  );
  const [zoomedDiagram, setZoomedDiagram] = useState(false);

  // Trenning Reference Enhancements: Inline AI, Color Popover, Block Menu, Slash & Embeds, Version Drawer Tabs
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiBriefInput, setAiBriefInput] = useState("");
  const [aiDraftPreview, setAiDraftPreview] = useState<{
    open: boolean;
    draftIndex: number;
    drafts: string[];
    actionLabel: string;
  }>({
    open: false,
    draftIndex: 0,
    drafts: [
      "A design system is a collection of reusable components, guided by clear standards, that can be assembled together to build any number of applications and high-converting social media assets consistently.",
      "Design systems act as a single source of truth for digital product and social creative teams—combining UI tokens, typography hierarchies, and modular templates to accelerate production by 3x.",
    ],
    actionLabel: "Improve writing",
  });
  const [toneSubmenuOpen, setToneSubmenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState("#121215");
  const [selectedBgHighlight, setSelectedBgHighlight] = useState("transparent");
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [chapterContextMenuId, setChapterContextMenuId] = useState<string | null>(null);
  const [introChapterId, setIntroChapterId] = useState<string>("ch-101");
  const [slashMenuTab, setSlashMenuTab] = useState<"none" | "block" | "media" | "embedded" | "paste">("none");
  const [embeddedBlocks, setEmbeddedBlocks] = useState<
    Array<{ id: string; provider: string; title: string; url: string; displayMode: "Thumbnail" | "Mention" | "Link" }>
  >([]);
  const [databaseViewMode, setDatabaseViewMode] = useState<"table" | "gallery">("table");
  const [databaseRows, setDatabaseRows] = useState<
    Array<{ id: string; name: string; category: string; status: string; owner: string }>
  >([]);
  const [drawerTab, setDrawerTab] = useState<"preview" | "update">("update");
  const [timelineSliderIndex, setTimelineSliderIndex] = useState(0);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [bannerPresetIdx, setBannerPresetIdx] = useState<number>(() => {
    if (!isNew && currentExplorerItem?.bannerGradient) {
      const idx = COLOR_AND_GRADIENT_PRESETS.findIndex(
        (c) => c.bg === currentExplorerItem.bannerGradient
      );
      if (idx >= 0) return COLOR_AND_GRADIENT_PRESETS[idx].idx;
    }
    return 0;
  });
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(() =>
    isNew ? null : currentExplorerItem?.thumbnailUrl || null
  );
  const [hasBanner, setHasBanner] = useState(() => !isNew);
  const [thumbnailPopoverOpen, setThumbnailPopoverOpen] = useState(false);
  const [thumbnailTab, setThumbnailTab] = useState<
    "gallery" | "upload" | "unsplash"
  >("gallery");
  const [pendingBannerPresetIdx, setPendingBannerPresetIdx] = useState(0);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<
    number | null
  >(null);
  const [draggedParaIdx, setDraggedParaIdx] = useState<number | null>(null);
  const [dragOverParaIdx, setDragOverParaIdx] = useState<number | null>(null);
  const [bannerOffsetY, setBannerOffsetY] = useState(50);
  const [repositioningBanner, setRepositioningBanner] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState<100 | 110>(100);

  useEffect(() => {
    if (!versionModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setVersionModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [versionModalOpen]);

  const handleSaveThumbnailChoice = (chosenIdx: number) => {
    setThumbnailPopoverOpen(false);
    setHasBanner(true);
    setBannerPresetIdx(chosenIdx);
    setBannerUploadProgress(47);
    window.setTimeout(() => {
      setBannerUploadProgress(78);
    }, 380);
    window.setTimeout(() => {
      setBannerUploadProgress(null);
      onShowToast("Cover thumbnail bab berhasil disimpan.");
    }, 820);
  };

  // Locate active section & chapter
  const currentSection =
    sections.find((s) => s.id === activeSectionId) ?? sections[0];
  const currentChapter =
    currentSection?.chapters.find((c) => c.id === activeChapterId) ??
    currentSection?.chapters[0];

  const handleSaveNewVersionSnapshot = React.useCallback(() => {
    const nextNum = versions.length + 1;
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const newVer: ContentVersionItem = {
      id: `ver-${Date.now()}`,
      versionTag: `v1.${nextNum}`,
      label: `Today, ${nowTime}`,
      author: "Dinur M. Pradipta",
      notes: `Snapshot bab "${currentChapter?.title || docTitle}"`,
      isCurrent: true,
    };
    setVersions((prev) => [
      newVer,
      ...prev.map((v) => ({ ...v, isCurrent: false })),
    ]);
    setTimelineSliderIndex(0);
    onShowToast(`Version snapshot ${newVer.versionTag} berhasil disimpan.`);
  }, [versions.length, currentChapter?.title, docTitle, onShowToast]);

  // Shortcut ⌘ + ⌥ + S / Ctrl + Alt + S untuk tambah ke version history saat mengedit (sesuai referensi gambar)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveNewVersionSnapshot();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveNewVersionSnapshot]);

  const handleGenerateAiDraft = (
    format: "Essay" | "Outline" | "Case Study" | "Article"
  ) => {
    const topic =
      aiBriefInput.trim() || currentChapter?.title || docTitle || "Materi Utama";
    const templates: Record<typeof format, string[]> = {
      Essay: [
        `# ${topic}\n\nPemahaman mendalam mengenai ${topic} sangat penting dalam membangun fondasi strategi yang efektif dan terukur. Dalam praktiknya, eksekusi yang konsisten harus selalu berangkat dari riset kebutuhan audiens serta standar kualitas visual dan pesan yang jelas.\n\nMelalui pendekatan sistematis, setiap komponen materi dapat dioptimalkan agar selaras dengan identitas brand sekaligus memberikan nilai tambah nyata bagi audiens sasaran.`,
        `# Esai Mendalam: ${topic}\n\nStrategi yang berhasil tidak hanya bergantung pada kreativitas semata, tetapi juga pada keselarasan antara estetika, fungsionalitas, dan kejelasan komunikasi. Ketika merancang ${topic}, pastikan setiap elemen mendukung tujuan utama pembelajaran dan mudah dipahami.`,
      ],
      Outline: [
        `# Kerangka Materi (Outline): ${topic}\n\n1. Pendahuluan & Konteks Utama\n   • Definisi dan ruang lingkup ${topic}\n   • Mengapa hal ini krusial bagi praktisi\n\n2. Kerangka Kerja & Standar Eksekusi\n   • Langkah persiapan dan riset awal\n   • Prinsip utama dalam penyusunan materi\n\n3. Evaluasi & Langkah Praktis\n   • Indikator keberhasilan utama (KPI)\n   • Checklist implementasi harian`,
        `# Struktur Pembelajaran: ${topic}\n\n• Bagian 1: Konsep Dasar & Prinsip Inti\n• Bagian 2: Alur Kerja & Standar Operasional\n• Bagian 3: Evaluasi Metrik & Optimasi Berkelanjutan`,
      ],
      "Case Study": [
        `# Studi Kasus: Implementasi ${topic}\n\n• Latar Belakang Tantangan:\nBanyak tim mengalami kendala konsistensi saat menerapkan ${topic} tanpa panduan terstandarisasi.\n\n• Solusi & Eksekusi:\nDengan menyusun sistem kerja modular dan parameter evaluasi mingguan, proses produksi menjadi jauh lebih terarah.\n\n• Hasil & Dampak:\nEfisiensi eksekusi meningkat signifikan dan pemahaman tim terhadap standar kualitas menjadi seragam.`,
        `# Bedah Kasus Nyata: ${topic}\n\n1. Situasi Awal: Kurangnya struktur dalam penerapan ${topic}.\n2. Tindakan Strategis: Penerapan framework 3 langkah secara bertahap.\n3. Kesimpulan Pembelajaran: Konsistensi struktur meningkatkan hasil akhir secara terukur.`,
      ],
      Article: [
        `# ${topic}\n\nMenyusun arah dan standar eksekusi untuk ${topic} memerlukan perhatian penuh terhadap detail serta perencanaan yang matang. Pada intinya, panduan ini berfungsi sebagai acuan utama yang mencerminkan tujuan, identitas, dan nilai yang ingin disampaikan kepada audiens.\n\nSelain itu, perpaduan antara tampilan yang menarik dan kejelasan fungsi menjadi kunci keberhasilan. Dengan memahami kebutuhan serta perilaku pengguna, setiap elemen yang disajikan dapat memberikan pengalaman belajar yang efektif dan berkesan.`,
        `# Panduan Praktis: ${topic}\n\nDalam lanskap digital yang berfokus pada pengguna, memahami preferensi dan perilaku audiens adalah prioritas utama. Artikel ini membahas cara menyelaraskan konsep ${topic} dengan kebutuhan praktis di lapangan secara terstruktur.`,
      ],
    };

    setAiDraftPreview({
      open: true,
      draftIndex: 0,
      drafts: templates[format],
      actionLabel: format,
    });
    setAiPromptOpen(false);
    onShowToast(`Draft "${format}" berhasil dibuat dengan AI.`);
  };

  const handleUpdateSectionTitle = (sectionId: string, newTitle: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
  };

  const handleToggleSectionHidden = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const nextHidden = !s.hidden;
        onShowToast(
          nextHidden
            ? `Section "${s.title}" disembunyikan dari halaman Learner.`
            : `Section "${s.title}" ditampilkan kembali di halaman Learner.`
        );
        return { ...s, hidden: nextHidden };
      })
    );
  };

  const handleToggleChapterHidden = (sectionId: string, chapterId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          chapters: s.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const nextHidden = !c.hidden;
            onShowToast(
              nextHidden
                ? `Chapter "${c.title}" disembunyikan dari halaman Learner.`
                : `Chapter "${c.title}" ditampilkan kembali di halaman Learner.`
            );
            return { ...c, hidden: nextHidden };
          }),
        };
      })
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      onShowToast("Minimal harus ada 1 section.");
      return;
    }
    const target = sections.find((s) => s.id === sectionId);
    const remaining = sections.filter((s) => s.id !== sectionId);
    setSections(remaining);
    if (activeSectionId === sectionId) {
      setActiveSectionId(remaining[0].id);
      setActiveChapterId(remaining[0].chapters[0]?.id || "");
    }
    onShowToast(`Deleted "${target?.title || "Section"}".`);
  };

  const handleUpdateChapterTitle = (
    sectionId: string,
    chapterId: string,
    newTitle: string
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              chapters: s.chapters.map((c) =>
                c.id === chapterId ? { ...c, title: newTitle } : c
              ),
            }
          : s
      )
    );
  };

  const handleDeleteChapter = (sectionId: string, chapterId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;

    if (sec.chapters.length <= 1) {
      if (sections.length > 1) {
        handleDeleteSection(sectionId);
        return;
      }
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: [
                  {
                    id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    title: "Untitled Chapter Lesson",
                    readingTime: "15 mins",
                    points: "10 pts",
                    bodyText: "",
                    calloutText: "",
                    videoMode: "embed",
                    videoUrl: "",
                    videoFileName: "",
                    imageCaption: "",
                    imageZoomEnabled: true,
                    attachments: [],
                  },
                ],
              }
            : s
        )
      );
      onShowToast("Chapter di-reset ke modul baru.");
      return;
    }

    const targetCh = sec.chapters.find((c) => c.id === chapterId);
    const nextChapters = sec.chapters.filter((c) => c.id !== chapterId);
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, chapters: nextChapters } : s
      )
    );
    if (activeChapterId === chapterId) {
      setActiveChapterId(nextChapters[0]?.id || "");
    }
    onShowToast(`Deleted "${targetCh?.title || "Chapter"}".`);
  };

  const updateCurrentChapter = (patch: Partial<EditorChapter>) => {
    setLastSavedLabel("Saving changes...");
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === currentSection.id
          ? {
              ...sec,
              chapters: sec.chapters.map((ch) =>
                ch.id === currentChapter.id ? { ...ch, ...patch } : ch
              ),
            }
          : sec
      )
    );
    setTimeout(() => {
      setLastSavedLabel("Saved in Ruang Sosmed 2.0");
    }, 350);
  };

  const handleAddSection = () => {
    const nextNum = sections.length + 1;
    const randSuffix = Math.random().toString(36).slice(2, 6);
    const newSecId = `sec-${Date.now()}-${randSuffix}`;
    const newChId = `ch-${Date.now()}-${randSuffix}`;
    const newSection: EditorSection = {
      id: newSecId,
      title: `Section ${nextNum}`,
      chapters: [
        {
          id: newChId,
          title: "Chapter 1",
          readingTime: "10 mins",
          points: "10 pts",
          bodyText: "",
          calloutText: "",
          videoMode: "embed",
          videoUrl: "",
          videoFileName: "",
          imageCaption: "",
          imageZoomEnabled: false,
          attachments: [],
        },
      ],
    };
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(newSecId);
    setActiveChapterId(newChId);
    onShowToast(`Ditambahkan "${newSection.title}".`);
  };

  const handleAddChapter = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    const chapterNum = (sec?.chapters.length || 0) + 1;
    const newChId = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newChapter: EditorChapter = {
      id: newChId,
      title: `Chapter ${chapterNum}`,
      readingTime: "10 mins",
      points: "10 pts",
      bodyText: "",
      calloutText: "",
      videoMode: "embed",
      videoUrl: "",
      videoFileName: "",
      imageCaption: "",
      imageZoomEnabled: false,
      attachments: [],
    };

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, chapters: [...s.chapters, newChapter] }
          : s
      )
    );
    setActiveSectionId(sectionId);
    setActiveChapterId(newChId);
    onShowToast(`Ditambahkan "${newChapter.title}".`);
  };

  const handleMoveChapter = (
    sectionId: string,
    index: number,
    direction: "up" | "down"
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sec.chapters.length) return sec;
        const nextChapters = [...sec.chapters];
        const [moved] = nextChapters.splice(index, 1);
        nextChapters.splice(targetIndex, 0, moved);
        return { ...sec, chapters: nextChapters };
      })
    );
  };

  const insertFormatSnippet = (snippet: string) => {
    if (!currentChapter) return;
    updateCurrentChapter({
      bodyText: `${currentChapter.bodyText}\n${snippet}`,
    });
  };

  const handleAddAttachment = () => {
    if (!currentChapter) return;
    const formats: ("PDF" | "NOTION" | "ZIP")[] = ["PDF", "NOTION", "ZIP"];
    const chosenFormat =
      formats[currentChapter.attachments.length % formats.length];
    const newAtt = {
      id: `att-${Date.now()}`,
      name: `Ruang_Sosmed_2.0_Resource_${
        currentChapter.attachments.length + 1
      }.${chosenFormat.toLowerCase()}`,
      size: "3.2 MB",
      format: chosenFormat,
    };
    updateCurrentChapter({
      attachments: [...currentChapter.attachments, newAtt],
    });
    onShowToast(`Attached "${newAtt.name}" to chapter.`);
  };

  const handleRemoveAttachment = (attId: string) => {
    if (!currentChapter) return;
    updateCurrentChapter({
      attachments: currentChapter.attachments.filter((a) => a.id !== attId),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      {/* 1. Top Bar: Back <, Auto-save indicator, Title input, Badge, [🕒 Version History], [▷ Preview], [Publish] */}
      <header className="sticky top-10 z-20 flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-3 border-b border-[#EAECEF]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to workspace"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>

          <ContentBadge type={contentType} size="sm" />

          {/* Switch Tingkat Akses Kursus (Free vs PRO) */}
          <button
            type="button"
            onClick={() => {
              const nextCoursePro = !courseIsPro;
              setCourseIsPro(nextCoursePro);
              if (typeof window !== "undefined") {
                try {
                  const key = docTitle.toLowerCase().trim();
                  window.localStorage.setItem(
                    `ruang_sosmed_course_tier_${key}`,
                    nextCoursePro ? "pro" : "free"
                  );
                } catch {}
              }
              onShowToast(
                nextCoursePro
                  ? `⭐ Kursus "${docTitle}" diatur sebagai Kursus Khusus Member PRO.`
                  : `🔓 Kursus "${docTitle}" diatur sebagai Kursus Terbuka (Free Access).`
              );
            }}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
              courseIsPro
                ? "bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/50 shadow-2xs hover:bg-[#FDE68A]"
                : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:bg-[#FFFFFF] hover:border-[#4F39F6] hover:text-[#4F39F6]"
            }`}
            title="Klik untuk beralih antara Kursus Free (Terbuka) dan Kursus Khusus PRO"
          >
            {courseIsPro ? (
              <>
                <Zap size={11} fill="currentColor" className="text-[#D97706]" />
                <span>Kursus PRO ⭐</span>
              </>
            ) : (
              <>
                <Lock size={11} className="text-[#9CA3AF]" />
                <span>Kursus Free</span>
              </>
            )}
          </button>

          {/* Bahasa Kursus */}
          <div className="relative hidden md:inline-flex items-center">
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#FFFFFF] px-2.5 py-1 text-xs font-semibold text-[#5E5E5E] hover:text-[#4F39F6] border border-[#EAECEF] hover:border-[#4F39F6] transition-all cursor-pointer"
              title="Pilih bahasa materi / kursus"
            >
              <Globe size={12} className="text-[#4F39F6]" />
              <span>{courseLang}</span>
              <ChevronDown size={11} className="text-[#9CA3AF]" />
            </button>

            {langMenuOpen && (
              <div className="absolute left-0 top-8 z-30 w-44 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-xl p-1.5 space-y-0.5 text-left">
                {["Bahasa Indonesia", "English", "Bahasa / English"].map(
                  (lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setCourseLang(lang);
                        updateContentLanguage(
                          currentExplorerItem?.id || docTitle,
                          lang
                        );
                        setLangMenuOpen(false);
                        onShowToast(`Bahasa kursus diatur ke "${lang}".`);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                        courseLang === lang
                          ? "bg-[#4F39F6]/10 text-[#4F39F6] font-bold"
                          : "text-[#121215] hover:bg-[#F8F9FB]"
                      }`}
                    >
                      <span>{lang}</span>
                      {courseLang === lang && <Check size={12} />}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="relative min-w-0 flex-1 max-w-md flex items-center">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => {
                setDocTitle(e.target.value);
                setLastSavedLabel("Belum disimpan");
              }}
              placeholder={
                isNew
                  ? "Ketik judul kursus / konten baru..."
                  : "Ketik judul kursus / konten..."
              }
              aria-label="Content Title"
              title="Klik untuk mengedit judul kursus"
              className="w-full rounded-lg bg-[#F8F9FB] hover:bg-[#FFFFFF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] px-2.5 pr-7 py-1 text-sm font-bold text-[#121215] focus:outline-none truncate transition-colors"
            />
            <Pencil
              size={12}
              className="pointer-events-none absolute right-2.5 text-[#9CA3AF]"
            />
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-medium text-[#5E5E5E]">
            <CheckCircle2 size={12} className="text-[#10B981]" />
            <span>{lastSavedLabel}</span>
          </span>
        </div>

        {/* Right Top Bar Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVersionDrawerOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <Clock size={13} className="text-[#5E5E5E]" />
            <span>Version History</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode((prev) => !prev)}
            aria-pressed={previewMode}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
              previewMode
                ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                : "bg-[#FFFFFF] border-[#EAECEF] text-[#121215] hover:bg-[#F8F9FB]"
            }`}
          >
            <Play size={12} />
            <span>{previewMode ? "Exit Preview" : "Preview"}</span>
          </button>

          {isEditingExisting ? (
            <button
              type="button"
              onClick={() => {
                const cleanTitle = docTitle.trim() || savedTitleRef.current;
                const mappedSections = editorSectionsToAccordion(sections);
                const selectedPreset =
                  COLOR_AND_GRADIENT_PRESETS.find(
                    (c) => c.idx === bannerPresetIdx
                  ) || COLOR_AND_GRADIENT_PRESETS[0];

                if (typeof window !== "undefined") {
                  try {
                    const key = cleanTitle.toLowerCase().trim();
                    window.localStorage.setItem(
                      `ruang_sosmed_curriculum_${key}`,
                      JSON.stringify(mappedSections)
                    );
                    window.localStorage.setItem(
                      `ruang_sosmed_editor_sections_${key}`,
                      JSON.stringify(sections)
                    );
                    window.localStorage.setItem(
                      `ruang_sosmed_course_tier_${key}`,
                      courseIsPro ? "pro" : "free"
                    );
                    for (const sec of mappedSections) {
                      for (const ch of sec.chapters) {
                        if (ch.videoUrl) {
                          window.localStorage.setItem(
                            `ruang_sosmed_video_url_${key}_${ch.id}`,
                            ch.videoUrl
                          );
                        }
                      }
                    }
                  } catch {}
                }

                updateExplorerItemDetails(
                  currentExplorerItem?.id || savedTitleRef.current,
                  {
                    title: cleanTitle,
                    thumbnailUrl: hasBanner ? bannerImageUrl || "" : "",
                    bannerGradient: hasBanner ? selectedPreset?.bg : undefined,
                    language: courseLang,
                    description: currentChapter?.bodyText?.slice(0, 200) || "",
                  }
                );
                saveCourseCurriculumLive(cleanTitle, mappedSections);
                savedTitleRef.current = cleanTitle;
                if (cleanTitle !== docTitle) setDocTitle(cleanTitle);

                setLastSavedLabel("Saved in Ruang Sosmed 2.0");
                onShowToast(
                  `Perubahan judul, cover & pengaturan "${cleanTitle}" berhasil disimpan.`
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
            >
              <Save size={13} />
              <span>Save</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const sameFolderCount =
                  explorerItems?.filter(
                    (i) =>
                      i.type !== "Folder" &&
                      (!folderName ||
                        (i.folderName || "").toLowerCase().trim() ===
                          folderName.toLowerCase().trim())
                  ).length || 0;
                const cleanTitle =
                  docTitle.trim() ||
                  `${folderName || "Course Baru"} #${sameFolderCount + 1}`;
                const mappedSections = editorSectionsToAccordion(sections);
                const selectedPreset =
                  COLOR_AND_GRADIENT_PRESETS.find(
                    (c) => c.idx === bannerPresetIdx
                  ) || COLOR_AND_GRADIENT_PRESETS[0];

                // Simpan permanen ke localStorage & Store untuk kursus ini
                if (typeof window !== "undefined") {
                  try {
                    const key = cleanTitle.toLowerCase().trim();
                    window.localStorage.setItem(
                      `ruang_sosmed_curriculum_${key}`,
                      JSON.stringify(mappedSections)
                    );
                    window.localStorage.setItem(
                      `ruang_sosmed_editor_sections_${key}`,
                      JSON.stringify(sections)
                    );
                    window.localStorage.setItem(
                      `ruang_sosmed_course_tier_${key}`,
                      courseIsPro ? "pro" : "free"
                    );
                    if (hasBanner && bannerImageUrl) {
                      window.localStorage.setItem(
                        `ruang_sosmed_thumb_${key}`,
                        bannerImageUrl
                      );
                    }
                    if (draftSessionId) {
                      window.localStorage.removeItem(
                        `ruang_sosmed_editor_draft_${draftSessionId}`
                      );
                    }
                    for (const sec of mappedSections) {
                      for (const ch of sec.chapters) {
                        if (ch.videoUrl) {
                          window.localStorage.setItem(
                            `ruang_sosmed_video_url_${key}_${ch.id}`,
                            ch.videoUrl
                          );
                        }
                      }
                    }
                  } catch {}
                }
                saveCourseCurriculumLive(cleanTitle, mappedSections);

                setLastSavedLabel("Published in Ruang Sosmed 2.0");
                onPublish(
                  cleanTitle,
                  contentType,
                  mappedSections,
                  currentChapter?.bodyText?.slice(0, 200) || ""
                );
                if (hasBanner && (bannerImageUrl || selectedPreset?.bg)) {
                  updateExplorerItemDetails(cleanTitle, {
                    thumbnailUrl: bannerImageUrl || "",
                    bannerGradient: selectedPreset?.bg,
                    language: courseLang,
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
            >
              <span>Publish</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Editor Body: Left Chapter Tree Sidebar (260px) + Center Rich-Text & Media Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 2. Left Chapter Tree Sidebar (260px) */}
        <aside
          aria-label="Course Sections and Chapters Tree"
          className="w-full lg:w-[260px] shrink-0 bg-[#F9FAFB] border-b lg:border-b-0 lg:border-r border-[#EAECEF] p-3.5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5E5E5E]">
                PAGES
              </h2>
              <button
                type="button"
                onClick={handleAddSection}
                className="text-xs font-bold text-[#4F39F6] hover:text-[#3B28CC] transition-colors cursor-pointer"
              >
                Add section
              </button>
            </div>

            {/* Course Sections with Collapsible Chapters */}
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] p-2.5 shadow-[0_1px_3px_rgba(16,15,17,0.03)]"
                >
                  {/* Section Header with Inline Rename & Delete controls */}
                  <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-[#121215] mb-1">
                    {editingSectionId === section.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          handleUpdateSectionTitle(section.id, e.target.value)
                        }
                        onBlur={() => setEditingSectionId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            setEditingSectionId(null);
                          }
                        }}
                        className="flex-1 rounded-md bg-[#F8F9FB] px-2 py-1 text-xs font-bold text-[#121215] border border-[#4F39F6] focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-1 min-w-0 flex-1 group/sec">
                        <span
                          onDoubleClick={() => setEditingSectionId(section.id)}
                          title="Klik ganda untuk edit nama Section"
                          className="truncate hover:text-[#4F39F6] transition-colors cursor-pointer"
                        >
                          {section.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSectionId(section.id)}
                          title="Rename Section"
                          className="opacity-0 group-hover/sec:opacity-100 p-0.5 text-[#9CA3AF] hover:text-[#4F39F6] rounded hover:bg-[#F8F9FB] transition-opacity cursor-pointer shrink-0"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSectionHidden(section.id)}
                        title={
                          section.hidden
                            ? "Section tersembunyi dari Learner (Klik untuk tampilkan)"
                            : "Sembunyikan Section dari Learner"
                        }
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          section.hidden
                            ? "text-[#EF4444] bg-[#EF4444]/10"
                            : "text-[#9CA3AF] hover:text-[#4F39F6] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        {section.hidden ? (
                          <EyeOff size={12} />
                        ) : (
                          <Eye size={12} />
                        )}
                      </button>
                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(section.id)}
                          title="Delete Section"
                          className="p-1 text-[#9CA3AF] hover:text-[#EF4444] rounded hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-header: N CHAPTERS + [+] button (matches ref Image 1 & 5) */}
                  <div className="flex items-center justify-between px-0.5 pb-2 mb-2 border-b border-[#EAECEF]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                      {section.chapters.length} CHAPTER
                      {section.chapters.length !== 1 ? "S" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddChapter(section.id)}
                      title="Add chapter to this section"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F8F9FB] hover:bg-[#4F39F6] text-[#5E5E5E] hover:text-white border border-[#EAECEF] transition-colors cursor-pointer"
                    >
                      <Plus size={11} strokeWidth={2.5} />
                    </button>
                  </div>

                  <ul className="space-y-1.5">
                    {section.chapters.map((ch, idx) => {
                      const isSelected = ch.id === currentChapter?.id;
                      const isEditing = editingChapterId === ch.id;
                      const isIntro = introChapterId === ch.id;

                      return (
                        <li
                          key={ch.id}
                          className={`group/ch rounded-xl p-2.5 text-xs border transition-all ${
                            isSelected
                              ? "bg-[#FFFFFF] border-[#4F39F6] shadow-[0_2px_8px_rgba(79,57,246,0.08)]"
                              : "bg-[#F8F9FB]/70 border-[#EAECEF] hover:bg-[#FFFFFF] hover:border-[#D1D5DB]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={ch.title}
                                onChange={(e) =>
                                  handleUpdateChapterTitle(
                                    section.id,
                                    ch.id,
                                    e.target.value
                                  )
                                }
                                onBlur={() => setEditingChapterId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") {
                                    setEditingChapterId(null);
                                  }
                                }}
                                className="w-full rounded bg-white px-2 py-0.5 text-xs font-semibold text-[#121215] border border-[#4F39F6] focus:outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSectionId(section.id);
                                  setActiveChapterId(ch.id);
                                }}
                                onDoubleClick={() => setEditingChapterId(ch.id)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                {/* Number Badge OR Presentation Intro Badge (matches Image 1 & 5) */}
                                <span
                                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                                    isIntro
                                      ? "bg-[#121215]/10 text-[#121215]"
                                      : isSelected
                                      ? "bg-[#4F39F6] text-white"
                                      : "bg-[#EAECEF] text-[#5E5E5E]"
                                  }`}
                                  title={
                                    isIntro
                                      ? "Introduction Chapter"
                                      : `Chapter ${idx + 1}`
                                  }
                                >
                                  {isIntro ? (
                                    <LayoutGrid size={11} />
                                  ) : (
                                    idx + 1
                                  )}
                                </span>

                                <span
                                  className={`truncate font-semibold ${
                                    ch.hidden
                                      ? "line-through text-[#9CA3AF]"
                                      : isSelected
                                      ? "text-[#121215]"
                                      : "text-[#5E5E5E]"
                                  }`}
                                  title="Klik ganda untuk rename"
                                >
                                  {ch.title}
                                </span>
                              </button>
                            )}

                            {/* Reorder & Context menu controls on hover */}
                            <div className="relative flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleChapterHidden(section.id, ch.id);
                                }}
                                title={
                                  ch.hidden
                                    ? "Show Chapter to Learners"
                                    : "Hide Chapter from Learners"
                                }
                                className={`p-0.5 rounded transition-colors cursor-pointer ${
                                  ch.hidden
                                    ? "inline-flex bg-[#FEF3C7] text-[#B45309]"
                                    : "hidden group-hover/ch:inline-flex text-[#9CA3AF] hover:text-[#121215] hover:bg-[#FFFFFF]"
                                }`}
                              >
                                {ch.hidden ? (
                                  <EyeOff size={11} />
                                ) : (
                                  <Eye size={11} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveChapter(section.id, idx, "up")
                                }
                                disabled={idx === 0}
                                title="Move chapter up"
                                className="hidden group-hover/ch:inline-flex p-0.5 rounded hover:bg-[#FFFFFF] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveChapter(section.id, idx, "down")
                                }
                                disabled={idx === section.chapters.length - 1}
                                title="Move chapter down"
                                className="hidden group-hover/ch:inline-flex p-0.5 rounded hover:bg-[#FFFFFF] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChapterContextMenuId((prev) =>
                                    prev === ch.id ? null : ch.id
                                  );
                                }}
                                title="Chapter actions"
                                className="p-0.5 rounded text-[#9CA3AF] hover:text-[#121215] hover:bg-[#FFFFFF] cursor-pointer"
                              >
                                <MoreHorizontal size={13} />
                              </button>

                              {chapterContextMenuId === ch.id && (
                                <div className="absolute right-0 top-6 z-30 w-44 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-xl p-1.5 text-left space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dupCh: EditorChapter = {
                                        ...ch,
                                        id: `ch-${Date.now()}`,
                                        title: `${ch.title} (Copy)`,
                                      };
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                chapters: [
                                                  ...s.chapters,
                                                  dupCh,
                                                ],
                                              }
                                            : s
                                        )
                                      );
                                      setChapterContextMenuId(null);
                                      onShowToast(`Duplicated "${ch.title}".`);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                                  >
                                    <Copy size={12} className="text-[#5E5E5E]" />
                                    <span>Duplicate</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIntroChapterId(ch.id);
                                      setChapterContextMenuId(null);
                                      onShowToast(
                                        `Set "${ch.title}" as Introduction.`
                                      );
                                    }}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                                  >
                                    <LayoutGrid
                                      size={12}
                                      className="text-[#10B981]"
                                    />
                                    <span>Set as Introduction</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingChapterId(ch.id);
                                      setChapterContextMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                                  >
                                    <Pencil
                                      size={12}
                                      className="text-[#4F39F6]"
                                    />
                                    <span>Rename Chapter</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleToggleChapterHidden(
                                        section.id,
                                        ch.id
                                      );
                                      setChapterContextMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                                  >
                                    {ch.hidden ? (
                                      <Eye
                                        size={12}
                                        className="text-[#10B981]"
                                      />
                                    ) : (
                                      <EyeOff
                                        size={12}
                                        className="text-[#F59E0B]"
                                      />
                                    )}
                                    <span>
                                      {ch.hidden
                                        ? "Show to Learners"
                                        : "Hide from Learners"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextPro = !ch.isPro;
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                chapters: s.chapters.map((c) =>
                                                  c.id === ch.id
                                                    ? { ...c, isPro: nextPro }
                                                    : c
                                                ),
                                              }
                                            : s
                                        )
                                      );
                                      setChapterContextMenuId(null);
                                      onShowToast(
                                        nextPro
                                          ? `🔒 "${ch.title}" diatur sebagai Khusus Member PRO.`
                                          : `🔓 "${ch.title}" diatur sebagai Gratis (Free Access).`
                                      );
                                    }}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                                  >
                                    <Zap
                                      size={12}
                                      className={
                                        ch.isPro
                                          ? "text-[#F59E0B]"
                                          : "text-[#9CA3AF]"
                                      }
                                    />
                                    <span>
                                      {ch.isPro
                                        ? "Ubah ke Gratis (Free)"
                                        : "Ubah ke Khusus PRO"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteChapter(section.id, ch.id);
                                      setChapterContextMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Chapter Card Bottom Row: Mini Block Counters + Collaborator Avatar & Badges (matches Image 1 & 5) */}
                          <div className="mt-2 flex items-center justify-between gap-2 pl-7">
                            <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                              <span className="inline-flex items-center gap-0.5">
                                <Play size={9} />
                                <span>{ch.videoUrl ? 1 : 0}</span>
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                <FileText size={9} />
                                <span>{ch.bodyText ? 1 : 0}</span>
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Paperclip size={9} />
                                <span>{ch.attachments.length}</span>
                              </span>
                              {ch.hidden && (
                                <span className="rounded bg-[#FEF3C7] px-1 py-0.2 text-[9px] font-bold text-[#B45309]">
                                  Hidden
                                                                </span>
                              )}
                              {ch.isPro && (
                                <span className="rounded bg-[#FEF3C7] border border-[#F59E0B]/40 px-1 py-0.2 text-[9px] font-bold text-[#92400E]">
                                  PRO
                                </span>
                              )}
                            </div>

                            <span
                              title="Edited by Mentor"
                              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FEF08A] text-[#854D0E] text-[8px] font-bold border border-white shadow-2xs"
                            >
                              DP
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleAddChapter(section.id)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6]/10 hover:text-[#4F39F6] py-1.5 text-[11px] font-semibold text-[#5E5E5E] border border-dashed border-[#EAECEF] transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Add Chapter</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* [+ Add Section] Button */}
          <div className="pt-4 mt-4 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={handleAddSection}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:border-[#4F39F6] hover:text-[#4F39F6] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] shadow-[0_1px_2px_rgba(16,15,17,0.03)] transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.4} />
              <span>Add Section</span>
            </button>
          </div>
        </aside>

        {/* 3. Center Rich-Text & Media Canvas */}
        <div className="relative flex-1 min-w-0 px-6 sm:px-10 py-6 overflow-y-auto">
          {/* Right Floating Action Rail: Zoom & Full Version History Modal (matches Image 1, 4 & 5) */}
          <div className="hidden xl:flex flex-col items-center gap-2 fixed right-5 top-28 z-20">
            <button
              type="button"
              onClick={() => {
                const nextZoom = canvasZoom === 100 ? 110 : 100;
                setCanvasZoom(nextZoom);
                onShowToast(`Canvas zoom diatur ke ${nextZoom}%.`);
              }}
              title="Zoom Canvas"
              className={`h-8 w-8 rounded-full border shadow-xs flex items-center justify-center transition-colors cursor-pointer ${
                canvasZoom === 110
                  ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                  : "bg-[#FFFFFF] text-[#121215] border-[#EAECEF] hover:border-[#4F39F6]"
              }`}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setVersionModalOpen(true)}
              title="Buka Interactive Version History & Timeline Scrubber"
              className="h-8 w-8 rounded-full bg-[#FFFFFF] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] shadow-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <Clock size={14} />
            </button>
          </div>

          {currentChapter && (
            <div
              className="w-full max-w-4xl mx-auto space-y-6 transition-transform origin-top"
              style={{
                transform: canvasZoom === 110 ? "scale(1.04)" : undefined,
              }}
            >
              {/* TOP ILLUSTRATED COVER BANNER + ADD / UPDATE THUMBNAIL POPOVER (Gallery / Upload / Unsplash + 47% -> 78% loading — matches Web 3) */}
              <div className="relative">
                {hasBanner ? (
                  <div
                    className="group/banner relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden border border-[#EAECEF] shadow-xs transition-all"
                    style={{
                      background: bannerImageUrl
                        ? "#121215"
                        : bannerPresetIdx === 0
                        ? "linear-gradient(120deg, #5EEAD4 0%, #FDE047 48%, #5EEAD4 100%)"
                        : bannerPresetIdx === 1
                        ? "linear-gradient(120deg, #C4B5FD 0%, #93C5FD 55%, #C4B5FD 100%)"
                        : bannerPresetIdx === 2
                        ? "linear-gradient(120deg, #FBCFE8 0%, #DDD6FE 50%, #A7F3D0 100%)"
                        : bannerPresetIdx === 3
                        ? "linear-gradient(120deg, #FDE047 0%, #FDBA74 50%, #F472B6 100%)"
                        : bannerPresetIdx === 4
                        ? "#34D399"
                        : bannerPresetIdx === 5
                        ? "#38BDF8"
                        : bannerPresetIdx === 6
                        ? "#6366F1"
                        : "#F43F5E",
                    }}
                  >
                    {bannerImageUrl ? (
                      <img
                        src={bannerImageUrl}
                        alt="Course banner cover"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
                        style={{
                          transform: `translateY(${(bannerOffsetY - 50) * 0.6}px)`,
                        }}
                      />
                    ) : (
                      /* Decorative Illustrated Vector Elements */
                      <div
                        className="absolute inset-0 flex items-center justify-center gap-6 pointer-events-none select-none transition-transform duration-200"
                        style={{
                          transform: `translateY(${(bannerOffsetY - 50) * 0.6}px)`,
                        }}
                      >
                        {bannerPresetIdx === 0 ? (
                          <>
                            <div className="hidden sm:flex flex-col gap-2">
                              <div className="w-28 h-12 rounded-lg bg-[#6366F1] border-2 border-[#1E1B4B] p-2 shadow-sm flex items-end gap-1">
                                <span className="h-3 w-4 bg-white/80 rounded-xs" />
                                <span className="h-6 w-4 bg-white/90 rounded-xs" />
                                <span className="h-4 w-4 bg-white/70 rounded-xs" />
                                <span className="h-7 w-4 bg-white rounded-xs" />
                              </div>
                              <div className="w-28 h-12 rounded-lg bg-[#818CF8] border-2 border-[#1E1B4B] p-2 shadow-sm flex items-center justify-around">
                                <span className="h-2 w-16 bg-white/90 rounded-full" />
                              </div>
                            </div>
                            <div className="w-28 h-36 rounded-xl bg-[#6366F1] border-2 border-[#1E1B4B] p-3 shadow-md flex flex-col items-center justify-between">
                              <div className="h-14 w-14 rounded-full border-4 border-white bg-[#34D399] flex items-center justify-center">
                                <div className="h-5 w-5 rounded-full bg-[#1E1B4B]" />
                              </div>
                              <div className="w-full space-y-1.5">
                                <div className="h-2 w-full rounded bg-[#1E1B4B]" />
                                <div className="h-2 w-3/4 rounded bg-[#1E1B4B]" />
                              </div>
                            </div>
                            <div className="w-32 h-36 rounded-xl bg-[#818CF8] border-2 border-[#1E1B4B] p-3 shadow-md space-y-2.5">
                              {[1, 2, 3].map((n) => (
                                <div key={n} className="flex items-center gap-2">
                                  <span className="h-4 w-4 rounded bg-[#34D399] border border-[#1E1B4B] shrink-0" />
                                  <div className="flex-1 space-y-1">
                                    <div className="h-1.5 w-full rounded bg-[#1E1B4B]" />
                                    <div className="h-1.5 w-2/3 rounded bg-[#1E1B4B]" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : bannerPresetIdx <= 3 ? (
                          <div className="flex items-center gap-6">
                            <div className="h-28 w-28 rounded-full bg-[#FDE68A] border-2 border-[#1E1B4B] p-3 flex flex-wrap gap-2 items-center justify-center shadow-md">
                              <span className="h-5 w-5 rounded-full bg-[#F97316]" />
                              <span className="h-5 w-5 rounded-full bg-[#3B82F6]" />
                              <span className="h-5 w-5 rounded-full bg-[#4F46E5]" />
                              <span className="h-5 w-5 rounded-full bg-[#FFFFFF]" />
                            </div>
                            <div className="w-44 h-28 rounded-xl bg-[#E0F2FE] border-2 border-[#1E1B4B] p-3 shadow-md space-y-2">
                              <div className="h-3 w-16 rounded bg-[#3B82F6]" />
                              <div className="h-12 w-full rounded bg-[#FDE047]/80" />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Reposition Slider Overlay when active */}
                    {repositioningBanner && !previewMode && (
                      <div className="absolute inset-x-4 top-3 z-20 flex items-center justify-between gap-3 rounded-xl bg-[#121215]/85 backdrop-blur-xs px-3.5 py-2 text-white">
                        <span className="text-[11px] font-semibold">
                          Geser posisi vertikal banner:
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={bannerOffsetY}
                          onChange={(e) =>
                            setBannerOffsetY(Number(e.target.value))
                          }
                          className="w-36 accent-[#4F39F6] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRepositioningBanner(false);
                            onShowToast("Posisi cover banner disimpan.");
                          }}
                          className="rounded-md bg-[#4F39F6] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {/* Bottom-Right Floating Controls or Loading Indicator (47% -> 78%) */}
                    {!previewMode && (
                      <div className="absolute right-3.5 bottom-3 z-10 flex items-center gap-2">
                        {bannerUploadProgress !== null ? (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-[#FFFFFF] px-3 py-1 text-[11px] font-bold text-[#121215] border border-[#EAECEF] shadow-sm tabular-nums">
                            <span className="h-3 w-3 rounded-full border-2 border-[#EAECEF] border-t-[#4F39F6] animate-spin" />
                            <span>{bannerUploadProgress}%</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingBannerPresetIdx(bannerPresetIdx);
                                setThumbnailPopoverOpen((prev) => !prev);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-2.5 py-1 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] shadow-sm transition-all cursor-pointer"
                            >
                              <ImageIcon size={12} className="text-[#121215]" />
                              <span>Update Thumbnail</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRepositioningBanner((prev) => !prev)
                              }
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border shadow-sm transition-all cursor-pointer ${
                                repositioningBanner
                                  ? "bg-[#121215] text-white border-[#121215]"
                                  : "bg-[#FFFFFF] hover:bg-[#F8F9FB] text-[#121215] border-[#EAECEF]"
                              }`}
                            >
                              <LayoutGrid size={12} />
                              <span>Reposition</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* When No Banner is Active: Show [🖼️ Add Thumbnail] Button in Top Right (matches Web 3 00:00-00:06) */
                  !previewMode && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingBannerPresetIdx(bannerPresetIdx);
                          setThumbnailPopoverOpen((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] shadow-2xs transition-colors cursor-pointer"
                      >
                        <ImageIcon size={13} className="text-[#5E5E5E]" />
                        <span>Add Thumbnail</span>
                      </button>
                    </div>
                  )
                )}

                {/* REUSABLE MODAL: Gallery (16 default thumbnails, colors, illustrations) / Upload / Unsplash */}
                <ThumbnailPickerModal
                  open={thumbnailPopoverOpen && !previewMode}
                  onClose={() => setThumbnailPopoverOpen(false)}
                  currentValue={bannerImageUrl || undefined}
                  onSelectThumbnail={(val) => {
                    setThumbnailPopoverOpen(false);
                    setHasBanner(true);
                    if (val.type === "image") {
                      setBannerImageUrl(val.value);
                    } else {
                      setBannerImageUrl(null);
                      const found = COLOR_AND_GRADIENT_PRESETS.findIndex(
                        (c) => c.bg === val.value
                      );
                      setBannerPresetIdx(
                        found >= 0 ? COLOR_AND_GRADIENT_PRESETS[found].idx : 0
                      );
                    }
                    if (isEditingExisting) {
                      setLastSavedLabel("Belum disimpan");
                    }
                    setBannerUploadProgress(47);
                    window.setTimeout(() => setBannerUploadProgress(78), 380);
                    window.setTimeout(() => {
                      setBannerUploadProgress(null);
                      onShowToast(
                        isEditingExisting
                          ? "Cover diperbarui. Klik Save di kanan atas untuk menyimpan permanen."
                          : "Cover thumbnail bab berhasil dipilih."
                      );
                    }, 820);
                  }}
                  onRemoveThumbnail={() => {
                    setHasBanner(false);
                    setBannerImageUrl(null);
                    setThumbnailPopoverOpen(false);
                    if (isEditingExisting) {
                      setLastSavedLabel("Belum disimpan");
                    }
                    onShowToast("Cover thumbnail bab dihapus.");
                  }}
                  onShowToast={onShowToast}
                />
              </div>

              {/* Chapter Title H1 Input + Reading Time (15 mins) + Points Value (10 pts) */}
              <div className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 group/sec-title">
                    <input
                      type="text"
                      value={currentSection.title}
                      disabled={previewMode}
                      onChange={(e) =>
                        handleUpdateSectionTitle(currentSection.id, e.target.value)
                      }
                      title="Edit Section Name"
                      aria-label="Section Name"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#4F39F6] bg-transparent hover:bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-transparent hover:border-[#EAECEF] focus:border-[#4F39F6] focus:bg-white focus:outline-none transition-all"
                    />
                    <Pencil
                      size={10}
                      className="text-[#4F39F6] opacity-0 group-hover/sec-title:opacity-100 transition-opacity"
                    />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] px-2.5 py-1 text-xs font-medium text-[#5E5E5E] border border-[#EAECEF]">
                      <span>Reading time:</span>
                      <input
                        type="text"
                        value={currentChapter.readingTime}
                        disabled={previewMode}
                        onChange={(e) =>
                          updateCurrentChapter({ readingTime: e.target.value })
                        }
                        aria-label="Estimated reading time"
                        className="w-16 bg-transparent font-semibold text-[#121215] focus:outline-none"
                      />
                    </label>

                    <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEF3C7]/60 px-2.5 py-1 text-xs font-medium text-[#92400E] border border-[#F59E0B]/30">
                      <span>Points:</span>
                      <input
                        type="text"
                        value={currentChapter.points}
                        disabled={previewMode}
                        onChange={(e) =>
                          updateCurrentChapter({ points: e.target.value })
                        }
                        aria-label="Chapter points value"
                        className="w-14 bg-transparent font-bold text-[#B45309] focus:outline-none"
                      />
                    </label>

                    {/* Switch Tingkat Akses Bab (Free vs PRO) */}
                    <button
                      type="button"
                      disabled={previewMode}
                      onClick={() => {
                        const nextPro = !currentChapter.isPro;
                        updateCurrentChapter({ isPro: nextPro });
                        onShowToast(
                          nextPro
                            ? `🔒 Bab "${currentChapter.title}" diatur sebagai Khusus Member PRO.`
                            : `🔓 Bab "${currentChapter.title}" diatur sebagai Gratis (Free Access).`
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                        currentChapter.isPro
                          ? "bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/50 shadow-2xs hover:bg-[#FDE68A]"
                          : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:bg-[#FFFFFF] hover:border-[#4F39F6] hover:text-[#4F39F6]"
                      }`}
                      title="Klik untuk mengubah akses bab ini antara Free dan Khusus Member PRO"
                    >
                      {currentChapter.isPro ? (
                        <>
                          <Zap
                            size={12}
                            fill="currentColor"
                            className="text-[#D97706]"
                          />
                          <span>Khusus PRO</span>
                        </>
                      ) : (
                        <>
                          <Lock size={12} className="text-[#9CA3AF]" />
                          <span>Gratis (Free)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Chapter Title H1 Input */}
                <div className="relative group/ch-title">
                  <input
                    type="text"
                    value={currentChapter.title}
                    disabled={previewMode}
                    onChange={(e) =>
                      updateCurrentChapter({ title: e.target.value })
                    }
                    placeholder="Enter Chapter H1 Title..."
                    aria-label="Chapter Title H1"
                    className="w-full text-2xl font-bold tracking-tight text-[#121215] bg-transparent border-b border-[#EAECEF] hover:border-[#4F39F6]/40 focus:border-[#4F39F6] pb-1.5 focus:outline-none transition-colors"
                  />
                  {!previewMode && (
                    <span className="text-[10px] text-[#9CA3AF] mt-1 block">
                      Ketik untuk mengganti judul chapter di sini atau klik ganda / pilih &quot;Rename Chapter&quot; di daftar samping.
                    </span>
                  )}
                </div>

                {/* INLINE AI PROMPT BAR + "Draft with AI" DROPDOWN (matches Image 1) */}
                {!previewMode && (
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2.5 rounded-xl bg-[#FFFFFF] px-3.5 py-2.5 border border-[#EAECEF] shadow-[0_2px_10px_rgba(16,15,17,0.04)] focus-within:border-[#4F39F6] focus-within:ring-2 focus-within:ring-[#4F39F6]/15 transition-all">
                      <Wand2 size={15} className="text-[#4F39F6] shrink-0" />
                      <input
                        type="text"
                        value={aiBriefInput}
                        onFocus={() => setAiPromptOpen(true)}
                        onChange={(e) => {
                          setAiBriefInput(e.target.value);
                          setAiPromptOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleGenerateAiDraft("Article");
                          } else if (e.key === "Escape") {
                            setAiPromptOpen(false);
                          }
                        }}
                        placeholder="Ask AI to generate suitable Essay, Outline, Case Study or an article from your brief."
                        className="flex-1 bg-transparent text-xs text-[#121215] placeholder:text-[#9CA3AF] focus:outline-none"
                      />
                      {aiPromptOpen && (
                        <button
                          type="button"
                          onClick={() => setAiPromptOpen(false)}
                          className="p-1 text-[#9CA3AF] hover:text-[#121215] cursor-pointer"
                          title="Tutup menu AI"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGenerateAiDraft("Article")}
                        title="Generate draft with AI (Enter)"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#121215] hover:bg-[#4F39F6] text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        ↵
                      </button>
                    </div>

                    {/* Dropdown Menu: Draft with AI -> Essay, Outline, Case Study, Article (matches Image 1) */}
                    {aiPromptOpen && (
                      <div className="absolute left-0 top-12 z-30 w-52 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-xl p-1.5 space-y-0.5">
                        <p className="px-2.5 py-1 text-[10px] font-semibold text-[#9CA3AF]">
                          Draft with AI
                        </p>
                        {(
                          [
                            { id: "Essay", icon: AlignLeft },
                            { id: "Outline", icon: List },
                            { id: "Case Study", icon: FileText },
                            { id: "Article", icon: Sparkles },
                          ] as const
                        ).map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleGenerateAiDraft(item.id)}
                              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] transition-colors cursor-pointer text-left"
                            >
                              <Icon size={13} className="text-[#5E5E5E]" />
                              <span>{item.id}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Generated Draft Preview Card */}
                    {aiDraftPreview.open && (
                      <div className="rounded-xl bg-[#EEF2FF]/60 border border-[#4F39F6]/30 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F39F6]">
                            <Sparkles size={13} />
                            <span>
                              AI Draft ({aiDraftPreview.actionLabel}) — Variasi{" "}
                              {aiDraftPreview.draftIndex + 1}/
                              {aiDraftPreview.drafts.length}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAiDraftPreview((prev) => ({
                                ...prev,
                                open: false,
                              }))
                            }
                            className="text-xs text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        <p className="text-xs text-[#121215] whitespace-pre-line leading-relaxed bg-[#FFFFFF] rounded-lg p-3 border border-[#EAECEF]">
                          {aiDraftPreview.drafts[aiDraftPreview.draftIndex]}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const draftText =
                                aiDraftPreview.drafts[
                                  aiDraftPreview.draftIndex
                                ];
                              updateCurrentChapter({
                                bodyText: currentChapter.bodyText
                                  ? `${currentChapter.bodyText}\n\n${draftText}`
                                  : draftText,
                              });
                              setAiDraftPreview((prev) => ({
                                ...prev,
                                open: false,
                              }));
                              onShowToast(
                                "Draft AI berhasil ditambahkan ke materi bab."
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            <Check size={12} />
                            <span>Insert into Chapter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAiDraftPreview((prev) => ({
                                ...prev,
                                draftIndex:
                                  (prev.draftIndex + 1) % prev.drafts.length,
                              }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            <span>Try Another Variation</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Formatting Toolbar */}
                {!previewMode && (
                  <div
                    role="toolbar"
                    aria-label="Manual text formatting toolbar"
                    className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F8F9FB] p-1.5 border border-[#EAECEF]"
                  >
                    {(["H1", "H2", "H3"] as const).map((heading) => (
                      <button
                        key={heading}
                        type="button"
                        onClick={() =>
                          insertFormatSnippet(`\n# ${heading} Subheading\n`)
                        }
                        className="rounded-md px-2 py-1 text-xs font-bold text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] transition-colors cursor-pointer"
                      >
                        {heading}
                      </button>
                    ))}
                    <span className="h-4 w-[1px] bg-[#EAECEF] mx-0.5" />

                    <button
                      type="button"
                      onClick={() => insertFormatSnippet("**Bold key point**")}
                      title="Bold"
                      aria-label="Bold"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatSnippet("*Italic emphasis*")}
                      title="Italic"
                      aria-label="Italic"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatSnippet("<u>Underlined</u>")}
                      title="Underline"
                      aria-label="Underline"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Underline size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatSnippet("~~Strikethrough~~")}
                      title="Strikethrough"
                      aria-label="Strikethrough"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Strikethrough size={14} />
                    </button>

                    <span className="h-4 w-[1px] bg-[#EAECEF] mx-0.5" />

                    <button
                      type="button"
                      onClick={() =>
                        insertFormatSnippet("`UTM_Source=Instagram_Reels`")
                      }
                      title="Code block"
                      aria-label="Code block"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Code size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertFormatSnippet(
                          '> "Content builds trust; consistency builds conversion."'
                        )
                      }
                      title="Quote"
                      aria-label="Quote"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Quote size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertFormatSnippet(
                          "• Hook in 1.5s\n• Value body\n• Save CTA"
                        )
                      }
                      title="Bullet list"
                      aria-label="Bullet list"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertFormatSnippet(
                          "1. Audit bio\n2. Map pillars\n3. Schedule batch"
                        )
                      }
                      title="Numbered list"
                      aria-label="Numbered list"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCurrentChapter({
                          calloutText: `${currentChapter.calloutText} (Updated)`,
                        })
                      }
                      title="Callout box"
                      aria-label="Callout box"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <AlertCircle size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertFormatSnippet(
                          "[Ruang Sosmed 2.0 Playbook](https://ruangsosmed.id)"
                        )
                      }
                      title="Insert Link"
                      aria-label="Insert Link"
                      className="p-1.5 rounded-md text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                    >
                      <Link2 size={14} />
                    </button>

                    <span className="h-4 w-[1px] bg-[#EAECEF] mx-0.5" />

                    <button
                      type="button"
                      onClick={() => setTextAlign("left")}
                      title="Align Left"
                      aria-label="Align Left"
                      className={`p-1.5 rounded-md cursor-pointer ${
                        textAlign === "left"
                          ? "bg-[#FFFFFF] text-[#4F39F6]"
                          : "text-[#5E5E5E] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      <AlignLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("center")}
                      title="Align Center"
                      aria-label="Align Center"
                      className={`p-1.5 rounded-md cursor-pointer ${
                        textAlign === "center"
                          ? "bg-[#FFFFFF] text-[#4F39F6]"
                          : "text-[#5E5E5E] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      <AlignCenter size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("right")}
                      title="Align Right"
                      aria-label="Align Right"
                      className={`p-1.5 rounded-md cursor-pointer ${
                        textAlign === "right"
                          ? "bg-[#FFFFFF] text-[#4F39F6]"
                          : "text-[#5E5E5E] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      <AlignRight size={14} />
                    </button>

                    <span className="h-4 w-[1px] bg-[#EAECEF] mx-0.5" />

                    {/* Text & Highlight Color Picker Trigger (ref_06) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setColorPickerOpen((prev) => !prev)}
                        title="Text & Background Color"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#121215] hover:bg-[#FFFFFF] border border-transparent hover:border-[#EAECEF] cursor-pointer"
                      >
                        <Palette size={13} style={{ color: selectedTextColor }} />
                        <span>A</span>
                        <ChevronDown size={11} className="text-[#9CA3AF]" />
                      </button>

                      {colorPickerOpen && (
                        <div className="absolute left-0 top-8 z-30 w-52 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-xl p-3 space-y-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                              Color
                            </p>
                            <div className="flex items-center gap-1.5">
                              {[
                                { label: "Default", hex: "#121215" },
                                { label: "Purple", hex: "#4F39F6" },
                                { label: "Blue", hex: "#0EA5E9" },
                                { label: "Emerald", hex: "#10B981" },
                                { label: "Amber", hex: "#D97706" },
                                { label: "Rose", hex: "#EF4444" },
                              ].map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTextColor(c.hex);
                                    setColorPickerOpen(false);
                                    onShowToast(`Applied ${c.label} text color.`);
                                  }}
                                  className="h-6 w-6 rounded-md border border-[#EAECEF] flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
                                  style={{ color: c.hex }}
                                >
                                  A
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                              Background Highlight
                            </p>
                            <div className="flex items-center gap-1.5">
                              {[
                                { label: "None", bg: "transparent" },
                                { label: "Soft Purple", bg: "#EEF2FF" },
                                { label: "Soft Blue", bg: "#E0F2FE" },
                                { label: "Soft Green", bg: "#DCFCE7" },
                                { label: "Soft Yellow", bg: "#FEF3C7" },
                                { label: "Soft Red", bg: "#FEE2E2" },
                              ].map((b) => (
                                <button
                                  key={b.label}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBgHighlight(b.bg);
                                    setColorPickerOpen(false);
                                    onShowToast(`Applied ${b.label} highlight.`);
                                  }}
                                  className="h-6 w-6 rounded-md border border-[#EAECEF] flex items-center justify-center text-[10px] font-bold text-[#121215] cursor-pointer hover:scale-105 transition-transform"
                                  style={{ backgroundColor: b.bg }}
                                >
                                  A
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Block Context Menu ⋮⋮ Trigger (ref_06b) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setBlockMenuOpen((prev) => !prev)}
                        title="Block options (⋮⋮)"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] cursor-pointer"
                      >
                        <GripVertical size={13} />
                        <span>Block Menu</span>
                      </button>

                      {blockMenuOpen && (
                        <div className="absolute right-0 top-8 z-30 w-56 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl p-1.5 text-left space-y-0.5">
                          {[
                            { label: "Mention (@user)", icon: MessageSquare, action: () => insertFormatSnippet(" @user ") },
                            { label: "Duplicate Block", icon: Copy, action: () => insertFormatSnippet(`\n${currentChapter.bodyText}`) },
                            { label: "Turn into Heading 2", icon: FileText, action: () => insertFormatSnippet("\n## Key Takeaway Section\n") },
                            { label: "Copy link to block", icon: Link2, action: () => onShowToast("Copied direct block link to clipboard.") },
                            { label: "Comment on block", icon: MessageSquare, action: () => onShowToast("Added inline review comment.") },
                            { label: "Color & Highlight", icon: Palette, action: () => setColorPickerOpen(true) },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  item.action();
                                  setBlockMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                              >
                                <Icon size={13} className="text-[#4F39F6]" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                          <div className="border-t border-[#EAECEF] my-1 pt-1 px-2.5 py-1 text-[10px] text-[#9CA3AF]">
                            Auto-saved in Ruang Sosmed 2.0
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rich Text Content Block: Separated into Draggable Paragraph Blocks (⋮⋮) to Swap Order (matches Web 4 00:20-00:23) */}
                {(!previewMode || !currentChapter.hideTextBlock) && (
                  <div className="group/block relative space-y-2.5 pt-2 border-t border-[#EAECEF]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#121215]">
                        Lesson Notes &amp; Rich Text Body (Drag{" "}
                        <code className="text-[#4F39F6]">⋮⋮</code> to Reorder
                        Paragraphs)
                      </span>
                      {!previewMode && (
                        <BlockVisibilityToggle
                          hidden={currentChapter.hideTextBlock}
                          blockLabel="Lesson Notes & Rich Text"
                          onToggle={() => {
                            const next = !currentChapter.hideTextBlock;
                            updateCurrentChapter({ hideTextBlock: next });
                            onShowToast(
                              next
                                ? "Lesson Notes & Rich Text disembunyikan dari halaman Learner."
                                : "Lesson Notes & Rich Text ditampilkan kembali ke Learner."
                            );
                          }}
                        />
                      )}
                    </div>

                    {currentChapter.hideTextBlock ? (
                      <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                        <span className="flex items-center gap-2 font-medium">
                          <EyeOff size={14} />
                          Bagian teks materi ini disembunyikan dan tidak terlihat di halaman Learner.
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCurrentChapter({ hideTextBlock: false })
                          }
                          className="font-bold underline cursor-pointer shrink-0"
                        >
                          Tampilkan
                        </button>
                      </div>
                    ) : (
                      (() => {
                        const rawParagraphs = (currentChapter.bodyText || "")
                          .split(/\n\n+/)
                          .filter((p, idx, arr) =>
                            arr.length === 1 ? true : p.trim().length > 0 || idx === arr.length - 1
                          );
                        const paraList =
                          rawParagraphs.length > 0 ? rawParagraphs : [""];

                        const updateParagraphAt = (idx: number, val: string) => {
                          const next = [...paraList];
                          next[idx] = val;
                          updateCurrentChapter({
                            bodyText: next.join("\n\n"),
                          });
                        };

                        const insertParagraphAfter = (idx: number) => {
                          const next = [...paraList];
                          next.splice(idx + 1, 0, "Paragraf baru...");
                          updateCurrentChapter({
                            bodyText: next.join("\n\n"),
                          });
                          onShowToast("Menambahkan blok paragraf baru.");
                        };

                        const removeParagraphAt = (idx: number) => {
                          if (paraList.length <= 1) {
                            updateCurrentChapter({ bodyText: "" });
                            return;
                          }
                          const next = paraList.filter((_, i) => i !== idx);
                          updateCurrentChapter({
                            bodyText: next.join("\n\n"),
                          });
                          onShowToast("Menghapus blok paragraf.");
                        };

                        const moveParagraph = (fromIdx: number, toIdx: number) => {
                          if (
                            fromIdx === toIdx ||
                            toIdx < 0 ||
                            toIdx >= paraList.length
                          ) {
                            return;
                          }
                          const next = [...paraList];
                          const [moved] = next.splice(fromIdx, 1);
                          next.splice(toIdx, 0, moved);
                          updateCurrentChapter({
                            bodyText: next.join("\n\n"),
                          });
                          onShowToast(
                            `Urutan paragraf #${fromIdx + 1} dipindahkan ke posisi #${toIdx + 1}.`
                          );
                        };

                        return (
                          <div className="space-y-2.5">
                            {paraList.map((paraText, pIdx) => {
                              const isDragged = draggedParaIdx === pIdx;
                              const isDragOver =
                                dragOverParaIdx === pIdx &&
                                draggedParaIdx !== null &&
                                draggedParaIdx !== pIdx;

                              return (
                                <div
                                  key={`para-blk-${pIdx}`}
                                  draggable={!previewMode}
                                  onDragStart={(e) => {
                                    setDraggedParaIdx(pIdx);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (dragOverParaIdx !== pIdx) {
                                      setDragOverParaIdx(pIdx);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverParaIdx === pIdx) {
                                      setDragOverParaIdx(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (
                                      draggedParaIdx !== null &&
                                      draggedParaIdx !== pIdx
                                    ) {
                                      moveParagraph(draggedParaIdx, pIdx);
                                    }
                                    setDraggedParaIdx(null);
                                    setDragOverParaIdx(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedParaIdx(null);
                                    setDragOverParaIdx(null);
                                  }}
                                  className={`group/para relative rounded-xl transition-all ${
                                    isDragged
                                      ? "opacity-45 ring-2 ring-[#4F39F6]"
                                      : isDragOver
                                      ? "border-t-2 border-t-[#4F39F6] pt-1"
                                      : ""
                                  }`}
                                >
                                  {/* Left Hover Handle (+ & Draggable ⋮⋮ Grip) per Paragraph Block */}
                                  {!previewMode && (
                                    <div className="hidden sm:flex items-center gap-0.5 absolute -left-14 top-2.5 opacity-40 group-hover/para:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          insertParagraphAfter(pIdx)
                                        }
                                        title="Tambah blok paragraf di bawah (+)"
                                        className="h-6 w-6 rounded-md hover:bg-[#F8F9FB] text-[#9CA3AF] hover:text-[#121215] flex items-center justify-center cursor-pointer"
                                      >
                                        <Plus size={13} />
                                      </button>
                                      <span
                                        title="Tarik ⋮⋮ untuk memindahkan posisi paragraf"
                                        className="h-6 w-6 rounded-md hover:bg-[#F8F9FB] text-[#9CA3AF] hover:text-[#4F39F6] flex items-center justify-center cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical size={13} />
                                      </span>
                                    </div>
                                  )}

                                  <div className="relative">
                                    <textarea
                                      rows={Math.max(
                                        2,
                                        Math.min(
                                          6,
                                          Math.ceil((paraText.length || 60) / 85)
                                        )
                                      )}
                                      disabled={previewMode}
                                      value={paraText}
                                      onChange={(e) =>
                                        updateParagraphAt(pIdx, e.target.value)
                                      }
                                      style={{
                                        textAlign,
                                        color: selectedTextColor,
                                        backgroundColor:
                                          selectedBgHighlight === "transparent"
                                            ? "#FFFFFF"
                                            : selectedBgHighlight,
                                      }}
                                      placeholder={
                                        pIdx === 0
                                          ? "Write something here..."
                                          : "Tulis isi paragraf..."
                                      }
                                      aria-label={`Paragraph block ${pIdx + 1}`}
                                      className="w-full rounded-lg bg-[#FFFFFF] p-3 pr-20 text-sm text-[#121215] leading-relaxed border border-[#EAECEF] hover:border-[#4F39F6]/40 focus:border-[#4F39F6] focus:outline-none transition-colors"
                                    />

                                    {/* Inline Quick Reorder / Delete Controls on Hover */}
                                    {!previewMode && (
                                      <div className="opacity-0 group-hover/para:opacity-100 transition-opacity absolute right-2 top-2 flex items-center gap-1 bg-[#FFFFFF]/90 backdrop-blur-xs rounded-md px-1 py-0.5 border border-[#EAECEF]">
                                        <button
                                          type="button"
                                          disabled={pIdx === 0}
                                          onClick={() =>
                                            moveParagraph(pIdx, pIdx - 1)
                                          }
                                          title="Pindah ke atas"
                                          className="p-1 text-[#5E5E5E] hover:text-[#4F39F6] disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowUp size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            pIdx === paraList.length - 1
                                          }
                                          onClick={() =>
                                            moveParagraph(pIdx, pIdx + 1)
                                          }
                                          title="Pindah ke bawah"
                                          className="p-1 text-[#5E5E5E] hover:text-[#4F39F6] disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowDown size={11} />
                                        </button>
                                        {paraList.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeParagraphAt(pIdx)
                                            }
                                            title="Hapus blok paragraf"
                                            className="p-1 text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {!previewMode && (
                              <button
                                type="button"
                                onClick={() =>
                                  insertParagraphAfter(paraList.length - 1)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6]/10 hover:text-[#4F39F6] px-3 py-1.5 text-[11px] font-semibold text-[#5E5E5E] border border-dashed border-[#EAECEF] transition-colors cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>Add Paragraph Block</span>
                              </button>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Slash Command Bar (/Block, /Media, Embedded, Paste URL Mode) (ref_07) */}
                {!previewMode && !currentChapter.hideTextBlock && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F8F9FB] px-3 py-2 border border-dashed border-[#D1D5DB]">
                      <span className="text-[11px] font-semibold text-[#5E5E5E]">
                        Type <code className="rounded bg-[#FFFFFF] px-1.5 py-0.5 text-[#4F39F6] font-mono border border-[#EAECEF]">/</code> to insert rich blocks or embed external tools:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            { id: "block", label: "/Block" },
                            { id: "media", label: "/Media" },
                            { id: "embedded", label: "/Embedded (Figma, Loom, Drive, Notion)" },
                            { id: "paste", label: "URL Paste Style" },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                              setSlashMenuTab((prev) =>
                                prev === tab.id ? "none" : tab.id
                              )
                            }
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                              slashMenuTab === tab.id
                                ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                                : "bg-[#FFFFFF] text-[#121215] border-[#EAECEF] hover:border-[#4F39F6]"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {slashMenuTab === "embedded" && (
                      <div className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-md p-3.5 space-y-2.5">
                        <p className="text-xs font-bold text-[#121215]">
                          Embed External Workspace Tool
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { name: "Figma", url: "https://www.figma.com/file/design-system" },
                            { name: "Loom", url: "https://www.loom.com/share/walkthrough" },
                            { name: "Google Drive", url: "https://drive.google.com/file/d/playbook" },
                            { name: "Notion", url: "https://www.notion.so/curriculum-wiki" },
                            { name: "Google Maps / PDF", url: "https://maps.google.com/ jakarta-studio" },
                          ].map((prov) => (
                            <button
                              key={prov.name}
                              type="button"
                              onClick={() => {
                                const nextBlocks = [
                                  ...(currentChapter.embeddedBlocks ?? embeddedBlocks),
                                  {
                                    id: `emb-${Date.now()}`,
                                    provider: prov.name,
                                    title: `${prov.name} Interactive Embed — ${currentChapter.title}`,
                                    url: prov.url,
                                    displayMode: "Thumbnail" as const,
                                  },
                                ];
                                setEmbeddedBlocks(nextBlocks);
                                updateCurrentChapter({ embeddedBlocks: nextBlocks });
                                setSlashMenuTab("none");
                                onShowToast(`Added ${prov.name} embed block.`);
                              }}
                              className="rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6]/10 hover:border-[#4F39F6] p-2.5 text-left border border-[#EAECEF] transition-all cursor-pointer"
                            >
                              <p className="text-xs font-bold text-[#121215]">
                                {prov.name}
                              </p>
                              <p className="text-[10px] text-[#9CA3AF] truncate">
                                Interactive frame
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {slashMenuTab === "paste" && (
                      <div className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-md p-3.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#121215]">
                          Paste URL Display Mode (Trenning Smart Link):
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(["Thumbnail", "Mention", "Link"] as const).map(
                            (mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                  const nextBlocks = (
                                    currentChapter.embeddedBlocks ?? embeddedBlocks
                                  ).map((b, i, arr) =>
                                    i === arr.length - 1
                                      ? { ...b, displayMode: mode }
                                      : b
                                  );
                                  setEmbeddedBlocks(nextBlocks);
                                  updateCurrentChapter({ embeddedBlocks: nextBlocks });
                                  setSlashMenuTab("none");
                                  onShowToast(
                                    `Set embedded URL display to "Paste as ${mode}".`
                                  );
                                }}
                                className="rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                              >
                                Paste as {mode}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Callout Box with Hide/Show Toggle */}
                {(!previewMode || !currentChapter.hideCallout) && (
                  <div className="space-y-2 pt-2 border-t border-[#EAECEF]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#121215]">
                        Callout / Key Tip Box
                      </span>
                      {!previewMode && (
                        <BlockVisibilityToggle
                          hidden={currentChapter.hideCallout}
                          blockLabel="Callout Box"
                          onToggle={() => {
                            const next = !currentChapter.hideCallout;
                            updateCurrentChapter({ hideCallout: next });
                            onShowToast(
                              next
                                ? "Callout Tip Box disembunyikan dari halaman Learner."
                                : "Callout Tip Box ditampilkan kembali ke Learner."
                            );
                          }}
                        />
                      )}
                    </div>

                    {currentChapter.hideCallout ? (
                      <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                        <span className="flex items-center gap-2 font-medium">
                          <EyeOff size={14} />
                          Callout Box disembunyikan dari halaman Learner.
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCurrentChapter({ hideCallout: false })
                          }
                          className="font-bold underline cursor-pointer shrink-0"
                        >
                          Tampilkan
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#4F39F6]/5 border border-[#4F39F6]/20 p-4 flex items-start gap-3">
                        <AlertCircle
                          size={16}
                          className="text-[#4F39F6] shrink-0 mt-0.5"
                        />
                        <input
                          type="text"
                          disabled={previewMode}
                          value={currentChapter.calloutText}
                          onChange={(e) =>
                            updateCurrentChapter({ calloutText: e.target.value })
                          }
                          placeholder="Tambahkan catatan penting atau tips khusus untuk murid..."
                          aria-label="Callout box text"
                          className="w-full bg-transparent text-xs font-semibold text-[#121215] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MEDIA INSERTION BLOCK 1: Video Block (Tabs: Upload Video File vs Embed Video URL) */}
              {(!previewMode || !currentChapter.hideVideoBlock) && (
                <section
                  aria-label="Video Insertion Block"
                  className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
                        <Video size={15} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#121215]">
                          Video Lesson Block
                        </h3>
                        <p className="text-[11px] text-[#9CA3AF]">
                          Upload MP4/MOV or embed YouTube, Vimeo, or Loom URL
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!currentChapter.hideVideoBlock && (
                        <div
                          role="tablist"
                          className="inline-flex rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]"
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={currentChapter.videoMode === "upload"}
                            onClick={() =>
                              updateCurrentChapter({ videoMode: "upload" })
                            }
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                              currentChapter.videoMode === "upload"
                                ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs border border-[#EAECEF]"
                                : "text-[#5E5E5E] hover:text-[#121215]"
                            }`}
                          >
                            Upload Video File
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={currentChapter.videoMode === "embed"}
                            onClick={() =>
                              updateCurrentChapter({ videoMode: "embed" })
                            }
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                              currentChapter.videoMode === "embed"
                                ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs border border-[#EAECEF]"
                                : "text-[#5E5E5E] hover:text-[#121215]"
                            }`}
                          >
                            Embed Video URL
                          </button>
                        </div>
                      )}

                      {!previewMode && (
                        <BlockVisibilityToggle
                          hidden={currentChapter.hideVideoBlock}
                          blockLabel="Video Lesson Block"
                          onToggle={() => {
                            const next = !currentChapter.hideVideoBlock;
                            updateCurrentChapter({ hideVideoBlock: next });
                            onShowToast(
                              next
                                ? "Video Lesson Block disembunyikan dari halaman Learner."
                                : "Video Lesson Block ditampilkan kembali ke Learner."
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {currentChapter.hideVideoBlock ? (
                    <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                      <span className="flex items-center gap-2 font-medium">
                        <EyeOff size={14} />
                        Video Lesson Block disembunyikan dan tidak terlihat di halaman Learner.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentChapter({ hideVideoBlock: false })
                        }
                        className="font-bold underline cursor-pointer shrink-0"
                      >
                        Tampilkan
                      </button>
                    </div>
                  ) : currentChapter.videoMode === "upload" ? (
                    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F9FB] p-6 text-center space-y-2">
                      <Upload size={22} className="mx-auto text-[#4F39F6]" />
                      <p className="text-xs font-semibold text-[#121215]">
                        Current File: {currentChapter.videoFileName || "Belum ada file"}
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        MP4, WebM or MOV (Max 2.0 GB • 1080p HD Streaming)
                      </p>
                      {!previewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentChapter({
                              videoFileName:
                                "ruang-sosmed-masterclass-updated-1080p.mp4",
                            });
                            onShowToast("Uploaded new HD lesson video.");
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
                        >
                          <Upload size={12} />
                          <span>Replace Video File</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!previewMode && (
                        <input
                          type="url"
                          value={currentChapter.videoUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentChapter({
                              videoUrl: val,
                              videoMode: "embed",
                            });
                            if (typeof window !== "undefined") {
                              try {
                                const key = docTitle.toLowerCase().trim();
                                if (key && currentChapter.id) {
                                  window.localStorage.setItem(
                                    `ruang_sosmed_video_url_${key}_${currentChapter.id}`,
                                    val
                                  );
                                }
                              } catch {}
                            }
                          }}
                          placeholder="Paste YouTube URL (e.g. https://youtu.be/cMpdNfPTKT0)..."
                          aria-label="Embed Video URL"
                          className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                        />
                      )}

                      {/* Clean Embedded Player Preview (Supports Live YouTube Embed) */}
                      {(() => {
                        const ytEmbed = getYouTubeEmbedUrl(
                          currentChapter.videoUrl
                        );
                        if (ytEmbed) {
                          return (
                            <div className="relative h-64 sm:h-80 w-full rounded-xl bg-[#121215] overflow-hidden border border-[#EAECEF]">
                              <iframe
                                src={ytEmbed}
                                title={`Video Player — ${currentChapter.title}`}
                                className="h-full w-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                        return (
                          <div className="relative h-48 w-full rounded-xl bg-[#121215] overflow-hidden flex flex-col items-center justify-center text-white p-4 border border-[#EAECEF]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F39F6] text-white shadow-lg mb-2">
                              <Play size={20} fill="currentColor" />
                            </div>
                            <p className="text-xs font-semibold">
                              Embedded Player Preview — {currentChapter.title}
                            </p>
                            <p className="text-[11px] text-white/60 mt-0.5 truncate max-w-md">
                              {currentChapter.videoUrl || "Belum ada URL video"}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </section>
              )}

              {/* MEDIA INSERTION BLOCK 2: Image / Diagram Block (with Caption & Zoom Toggle) */}
              {(!previewMode || !currentChapter.hideImageBlock) && (
                <section
                  aria-label="Image and Diagram Block"
                  className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                        <ImageIcon size={15} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#121215]">
                          Image / Diagram Block
                        </h3>
                        <p className="text-[11px] text-[#9CA3AF]">
                          High-resolution framework diagram with caption &amp;
                          learner zoom
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {!currentChapter.hideImageBlock && (
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#121215] cursor-pointer">
                          <ZoomIn size={14} className="text-[#5E5E5E]" />
                          <span>Allow Click-to-Zoom</span>
                          <input
                            type="checkbox"
                            {...({ switch: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                            checked={currentChapter.imageZoomEnabled}
                            onChange={(e) =>
                              updateCurrentChapter({
                                imageZoomEnabled: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-[#4F39F6] rounded cursor-pointer"
                          />
                        </label>
                      )}

                      {!previewMode && (
                        <BlockVisibilityToggle
                          hidden={currentChapter.hideImageBlock}
                          blockLabel="Image / Diagram Block"
                          onToggle={() => {
                            const next = !currentChapter.hideImageBlock;
                            updateCurrentChapter({ hideImageBlock: next });
                            onShowToast(
                              next
                                ? "Image / Diagram Block disembunyikan dari halaman Learner."
                                : "Image / Diagram Block ditampilkan kembali ke Learner."
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {currentChapter.hideImageBlock ? (
                    <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                      <span className="flex items-center gap-2 font-medium">
                        <EyeOff size={14} />
                        Image / Diagram Block disembunyikan dan tidak terlihat di halaman Learner.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentChapter({ hideImageBlock: false })
                        }
                        className="font-bold underline cursor-pointer shrink-0"
                      >
                        Tampilkan
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Diagram Canvas */}
                      <div
                        onClick={() => {
                          if (currentChapter.imageZoomEnabled) {
                            setZoomedDiagram((z) => !z);
                          }
                        }}
                        className={`rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-6 transition-all ${
                          currentChapter.imageZoomEnabled ? "cursor-zoom-in" : ""
                        } ${zoomedDiagram ? "scale-[1.02] ring-2 ring-[#4F39F6]" : ""}`}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                          {[
                            { label: "Educate", share: "40%", color: "#4F39F6" },
                            { label: "Inspire", share: "30%", color: "#0EA5E9" },
                            { label: "Social Proof", share: "20%", color: "#10B981" },
                            { label: "Convert", share: "10%", color: "#F59E0B" },
                          ].map((pillar) => (
                            <div
                              key={pillar.label}
                              className="rounded-lg bg-[#FFFFFF] p-3 border border-[#EAECEF]"
                            >
                              <span
                                className="text-lg font-bold block"
                                style={{ color: pillar.color }}
                              >
                                {pillar.share}
                              </span>
                              <span className="text-[11px] font-semibold text-[#121215]">
                                {pillar.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Image Caption Input */}
                      <input
                        type="text"
                        disabled={previewMode}
                        value={currentChapter.imageCaption}
                        onChange={(e) =>
                          updateCurrentChapter({ imageCaption: e.target.value })
                        }
                        placeholder="Add image or diagram caption..."
                        aria-label="Image caption"
                        className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#5E5E5E] italic border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                      />
                    </>
                  )}
                </section>
              )}

              {/* MEDIA INSERTION BLOCK 3: Attachment Block (Downloadable PDF/Notion/ZIP templates) */}
              {(!previewMode || !currentChapter.hideAttachmentBlock) && (
                <section
                  aria-label="Attachment Block"
                  className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#10B981]/10 text-[#10B981]">
                        <Paperclip size={15} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#121215]">
                          Downloadable Attachments (PDF / Notion / ZIP)
                        </h3>
                        <p className="text-[11px] text-[#9CA3AF]">
                          Templates and worksheets learners can download in this
                          chapter
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!previewMode && !currentChapter.hideAttachmentBlock && (
                        <button
                          type="button"
                          onClick={handleAddAttachment}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Upload Template</span>
                        </button>
                      )}

                      {!previewMode && (
                        <BlockVisibilityToggle
                          hidden={currentChapter.hideAttachmentBlock}
                          blockLabel="Downloadable Attachments"
                          onToggle={() => {
                            const next = !currentChapter.hideAttachmentBlock;
                            updateCurrentChapter({ hideAttachmentBlock: next });
                            onShowToast(
                              next
                                ? "Downloadable Attachments disembunyikan dari halaman Learner."
                                : "Downloadable Attachments ditampilkan kembali ke Learner."
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {currentChapter.hideAttachmentBlock ? (
                    <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                      <span className="flex items-center gap-2 font-medium">
                        <EyeOff size={14} />
                        Downloadable Attachments disembunyikan dan tidak terlihat di halaman Learner.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentChapter({ hideAttachmentBlock: false })
                        }
                        className="font-bold underline cursor-pointer shrink-0"
                      >
                        Tampilkan
                      </button>
                    </div>
                  ) : currentChapter.attachments.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF] py-2">
                      No downloadable templates attached to this chapter yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentChapter.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText
                              size={15}
                              className="text-[#4F39F6] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#121215] truncate">
                                {att.name}
                              </p>
                              <p className="text-[10px] text-[#9CA3AF]">
                                {att.format} Template • {att.size}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onShowToast(`Downloading "${att.name}"...`)
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </button>
                            {!previewMode && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.id)}
                                aria-label={`Remove ${att.name}`}
                                className="p-1 text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* MEDIA INSERTION BLOCK 4: Embedded Workspace Tools (Figma, Loom, Drive, Notion) (ref_07) */}
              {(!previewMode || !currentChapter.hideEmbeddedBlock) && (
                <section
                  aria-label="Embedded External Tools Block"
                  className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                        <Globe size={15} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#121215]">
                          Embedded Workspace Blocks (Figma / Loom / Drive / Notion)
                        </h3>
                        <p className="text-[11px] text-[#9CA3AF]">
                          Switch between Thumbnail, Mention, or Link display mode
                        </p>
                      </div>
                    </div>

                    {!previewMode && (
                      <BlockVisibilityToggle
                        hidden={currentChapter.hideEmbeddedBlock}
                        blockLabel="Embedded Workspace Blocks"
                        onToggle={() => {
                          const next = !currentChapter.hideEmbeddedBlock;
                          updateCurrentChapter({ hideEmbeddedBlock: next });
                          onShowToast(
                            next
                              ? "Embedded Workspace Blocks disembunyikan dari halaman Learner."
                              : "Embedded Workspace Blocks ditampilkan kembali ke Learner."
                          );
                        }}
                      />
                    )}
                  </div>

                  {currentChapter.hideEmbeddedBlock ? (
                    <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                      <span className="flex items-center gap-2 font-medium">
                        <EyeOff size={14} />
                        Embedded Workspace Blocks disembunyikan dan tidak terlihat di halaman Learner.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentChapter({ hideEmbeddedBlock: false })
                        }
                        className="font-bold underline cursor-pointer shrink-0"
                      >
                        Tampilkan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(currentChapter.embeddedBlocks ?? embeddedBlocks).map(
                        (emb) => (
                          <div
                            key={emb.id}
                            className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="rounded-lg bg-[#4F39F6] px-2.5 py-1 text-[10px] font-bold text-white shrink-0">
                                {emb.provider}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#121215] truncate">
                                  {emb.title}
                                </p>
                                <p className="text-[11px] text-[#5E5E5E] truncate">
                                  {emb.url} • Mode:{" "}
                                  <strong>Paste as {emb.displayMode}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(["Thumbnail", "Mention", "Link"] as const).map(
                                (mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                      const nextBlocks = (
                                        currentChapter.embeddedBlocks ??
                                        embeddedBlocks
                                      ).map((b) =>
                                        b.id === emb.id
                                          ? { ...b, displayMode: mode }
                                          : b
                                      );
                                      setEmbeddedBlocks(nextBlocks);
                                      updateCurrentChapter({
                                        embeddedBlocks: nextBlocks,
                                      });
                                    }}
                                    className={`rounded-md px-2 py-1 text-[10px] font-semibold border cursor-pointer ${
                                      emb.displayMode === mode
                                        ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                                        : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF]"
                                    }`}
                                  >
                                    {mode}
                                  </button>
                                )
                              )}
                              {!previewMode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextBlocks = (
                                      currentChapter.embeddedBlocks ??
                                      embeddedBlocks
                                    ).filter((b) => b.id !== emb.id);
                                    setEmbeddedBlocks(nextBlocks);
                                    updateCurrentChapter({
                                      embeddedBlocks: nextBlocks,
                                    });
                                    onShowToast(
                                      `Embedded block "${emb.title}" dihapus.`
                                    );
                                  }}
                                  aria-label={`Hapus ${emb.title}`}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer ml-1"
                                  title="Hapus embedded block ini"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* MEDIA INSERTION BLOCK 5: Notion-Style Interactive Database Table / Gallery Block (ref_07) */}
              {(!previewMode || !currentChapter.hideDatabaseBlock) && (
                <section
                  aria-label="Interactive Curriculum Database Block"
                  className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#D97706]">
                        <Table2 size={15} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#121215]">
                          Interactive Curriculum Database Block
                        </h3>
                        <p className="text-[11px] text-[#9CA3AF]">
                          Inline Notion-style Table &amp; Gallery views inside the lesson canvas
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {!currentChapter.hideDatabaseBlock && (
                        <>
                          <button
                            type="button"
                            onClick={() => setDatabaseViewMode("table")}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border cursor-pointer ${
                              databaseViewMode === "table"
                                ? "bg-[#121215] text-white border-[#121215]"
                                : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF]"
                            }`}
                          >
                            <Table2 size={12} />
                            <span>Table</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDatabaseViewMode("gallery")}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border cursor-pointer ${
                              databaseViewMode === "gallery"
                                ? "bg-[#121215] text-white border-[#121215]"
                                : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF]"
                            }`}
                          >
                            <LayoutGrid size={12} />
                            <span>Gallery</span>
                          </button>
                          {!previewMode && (
                            <button
                              type="button"
                              onClick={() => {
                                const curRows =
                                  currentChapter.databaseRows ?? databaseRows;
                                const nextRows = [
                                  ...curRows,
                                  {
                                    id: `db-${Date.now()}`,
                                    name: `Aset Modul Baru #${curRows.length + 1}`,
                                    category: "Content Asset",
                                    status: "Draft",
                                    owner: "Mentor",
                                  },
                                ];
                                setDatabaseRows(nextRows);
                                updateCurrentChapter({ databaseRows: nextRows });
                                onShowToast("Baris baru ditambahkan ke database.");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>New Row</span>
                            </button>
                          )}
                          {!previewMode &&
                            (currentChapter.databaseRows ?? databaseRows).length >
                              0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDatabaseRows([]);
                                  updateCurrentChapter({ databaseRows: [] });
                                  onShowToast(
                                    "Semua baris database telah dihapus."
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#FEE2E2] hover:bg-[#FCA5A5]/60 px-2.5 py-1 text-xs font-semibold text-[#DC2626] border border-[#FCA5A5]/60 transition-colors cursor-pointer"
                                title="Kosongkan seluruh baris di tabel ini"
                              >
                                <Trash2 size={12} />
                                <span>Hapus Semua</span>
                              </button>
                            )}
                        </>
                      )}

                      {!previewMode && (
                        <BlockVisibilityToggle
                          hidden={currentChapter.hideDatabaseBlock}
                          blockLabel="Curriculum Database Block"
                          onToggle={() => {
                            const next = !currentChapter.hideDatabaseBlock;
                            updateCurrentChapter({ hideDatabaseBlock: next });
                            onShowToast(
                              next
                                ? "Interactive Database Block disembunyikan dari halaman Learner."
                                : "Interactive Database Block ditampilkan kembali ke Learner."
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {currentChapter.hideDatabaseBlock ? (
                    <div className="rounded-xl border border-dashed border-[#FCA5A5] bg-[#FEF2F2]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs text-[#DC2626]">
                      <span className="flex items-center gap-2 font-medium">
                        <EyeOff size={14} />
                        Interactive Curriculum Database Block disembunyikan dan tidak terlihat di halaman Learner.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentChapter({ hideDatabaseBlock: false })
                        }
                        className="font-bold underline cursor-pointer shrink-0"
                      >
                        Tampilkan
                      </button>
                    </div>
                  ) : (currentChapter.databaseRows ?? databaseRows).length ===
                    0 ? (
                    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F9FB] p-6 text-center space-y-2">
                      <Table2 size={24} className="mx-auto text-[#9CA3AF]" />
                      <p className="text-xs font-semibold text-[#121215]">
                        Belum Ada Baris Data
                      </p>
                      <p className="text-[11px] text-[#5E5E5E] max-w-sm mx-auto">
                        Tabel database sedang kosong. Klik{" "}
                        <strong>+ New Row</strong> untuk menambahkan aset modul
                        baru, atau klik <strong>Hide Section</strong> jika tidak
                        digunakan.
                      </p>
                      {!previewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextRows = [
                              {
                                id: `db-${Date.now()}`,
                                name: "Aset Modul Baru #1",
                                category: "Content Asset",
                                status: "Draft",
                                owner: "Mentor",
                              },
                            ];
                            setDatabaseRows(nextRows);
                            updateCurrentChapter({ databaseRows: nextRows });
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Tambah Baris Baru</span>
                        </button>
                      )}
                    </div>
                  ) : databaseViewMode === "table" ? (
                    <div className="overflow-x-auto rounded-xl border border-[#EAECEF]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8F9FB] text-[#5E5E5E] border-b border-[#EAECEF]">
                            <th className="py-2.5 px-3 font-semibold">
                              Module Asset
                            </th>
                            <th className="py-2.5 px-3 font-semibold">
                              Category
                            </th>
                            <th className="py-2.5 px-3 font-semibold">
                              Status
                            </th>
                            <th className="py-2.5 px-3 font-semibold">
                              PIC / Reviewer
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAECEF]">
                          {(currentChapter.databaseRows ?? databaseRows).map(
                            (row) => (
                              <tr key={row.id} className="hover:bg-[#F8F9FB]">
                                <td className="py-2.5 px-3 font-semibold text-[#121215]">
                                  {row.name}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="rounded-md bg-[#4F39F6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#4F39F6]">
                                    {row.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="rounded-md bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
                                    {row.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[#5E5E5E]">
                                  {row.owner}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {!previewMode && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curRows =
                                          currentChapter.databaseRows ??
                                          databaseRows;
                                        const nextRows = curRows.filter(
                                          (r) => r.id !== row.id
                                        );
                                        setDatabaseRows(nextRows);
                                        updateCurrentChapter({
                                          databaseRows: nextRows,
                                        });
                                        onShowToast(
                                          `Baris "${row.name}" dihapus.`
                                        );
                                      }}
                                      aria-label={`Hapus ${row.name}`}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                                      title="Hapus baris ini"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(currentChapter.databaseRows ?? databaseRows).map(
                        (row) => (
                          <div
                            key={row.id}
                            className="relative rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-2 group/card"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-block rounded bg-[#4F39F6]/10 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                                {row.category}
                              </span>
                              {!previewMode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curRows =
                                      currentChapter.databaseRows ??
                                      databaseRows;
                                    const nextRows = curRows.filter(
                                      (r) => r.id !== row.id
                                    );
                                    setDatabaseRows(nextRows);
                                    updateCurrentChapter({
                                      databaseRows: nextRows,
                                    });
                                    onShowToast(
                                      `Kartu "${row.name}" dihapus.`
                                    );
                                  }}
                                  aria-label={`Hapus ${row.name}`}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                                  title="Hapus kartu ini"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                            <p className="text-xs font-bold text-[#121215]">
                              {row.name}
                            </p>
                            <p className="text-[11px] text-[#5E5E5E]">
                              Owner: {row.owner} • {row.status}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Version Timeline Slider when Version History is Open (ref_08) */}
      {versionDrawerOpen && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-[#121215] text-white px-5 py-3 shadow-2xl border border-white/10 flex items-center gap-4">
          <span className="text-xs font-bold text-[#10B981] shrink-0">
            Timeline Snapshot:
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, versions.length - 1)}
            value={timelineSliderIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setTimelineSliderIndex(idx);
              const picked = versions[idx];
              if (picked) {
                onShowToast(`Inspecting ${picked.label} (${picked.author})`);
              }
            }}
            className="w-40 accent-[#4F39F6] cursor-pointer"
          />
          <span className="text-xs font-semibold text-white/90">
            {versions[timelineSliderIndex]?.label ?? "Current Version"}
          </span>
        </div>
      )}

      {/* Slide-over Version History & Update Activity Drawer (ref_08) */}
      {versionDrawerOpen && (
        <aside
          aria-label="Editor Version History Drawer"
          className="fixed inset-y-0 right-0 z-40 w-85 bg-[#FFFFFF] border-l border-[#EAECEF] shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-150"
        >
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  History &amp; Activity
                </h2>
                <p className="text-[11px] text-[#9CA3AF]">
                  Preview snapshots or inspect block-level updates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVersionDrawerOpen(false)}
                aria-label="Close Version History drawer"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs: Preview | Update (ref_08) */}
            <div className="grid grid-cols-2 rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setDrawerTab("preview")}
                className={`rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  drawerTab === "preview"
                    ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                    : "text-[#5E5E5E]"
                }`}
              >
                Preview Snapshots
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("update")}
                className={`rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  drawerTab === "update"
                    ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                    : "text-[#5E5E5E]"
                }`}
              >
                Update Activity
              </button>
            </div>

            {drawerTab === "preview" ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-[#F8F9FB] px-3 py-2 border border-[#EAECEF]">
                  <span className="text-[11px] font-medium text-[#5E5E5E]">
                    Press <kbd className="rounded bg-white px-1 py-0.5 text-[10px] font-bold border border-[#EAECEF]">⌘ + ⌥ + S</kbd> to save snapshot
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVersionDrawerOpen(false);
                      setVersionModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                  >
                    Full View
                  </button>
                </div>
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`rounded-xl p-3 border ${
                      ver.isCurrent
                        ? "bg-[#4F39F6]/5 border-[#4F39F6]/30"
                        : "bg-[#F8F9FB] border-[#EAECEF]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#121215]">
                          {ver.label}
                        </p>
                        <p className="text-[10px] text-[#5E5E5E] mt-0.5">
                          {ver.author}
                        </p>
                      </div>
                      {ver.isCurrent ? (
                        <span className="rounded bg-[#4F39F6] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setVersions((prev) =>
                              prev.map((v) => ({
                                ...v,
                                isCurrent: v.id === ver.id,
                              }))
                            );
                            onShowToast(`Restored ${ver.versionTag}`);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#5E5E5E]">
                      {ver.notes}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    id: "upd-1",
                    user: "Dinur M. Pradipta",
                    avatar: "DP",
                    avatarBg: "#FEF08A",
                    avatarColor: "#854D0E",
                    time: "Just now",
                    chapterName: currentChapter?.title || docTitle,
                    actionType: "Add text",
                    detail:
                      currentChapter?.bodyText?.slice(0, 140) ||
                      "Updated chapter body text and learning notes.",
                  },
                  {
                    id: "upd-2",
                    user: "Dinur M. Pradipta",
                    avatar: "DP",
                    avatarBg: "#DDD6FE",
                    avatarColor: "#5B21B6",
                    time: "2 hours ago",
                    chapterName: currentChapter?.title || docTitle,
                    actionType: "Link Embed",
                    detail:
                      currentChapter?.videoUrl ||
                      "https://www.youtube.com/watch?v=cMpdNfPTKT0",
                    isEmbed: true,
                  },
                  {
                    id: "upd-3",
                    user: "Mentor Team",
                    avatar: "MT",
                    avatarBg: "#BFDBFE",
                    avatarColor: "#1E40AF",
                    time: "Yesterday, 14:20",
                    chapterName: sections[0]?.chapters[0]?.title || "Introduction",
                    actionType: "Add text",
                    detail:
                      "Structured chapter objectives, reading time estimation, and point rewards.",
                  },
                ].map((act) => (
                  <div
                    key={act.id}
                    className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
                          style={{
                            backgroundColor: act.avatarBg,
                            color: act.avatarColor,
                          }}
                        >
                          {act.avatar}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#121215] truncate">
                            {act.user}
                          </p>
                          <p className="text-[11px] text-[#5E5E5E] flex flex-wrap items-center gap-1 mt-0.5">
                            <span>Edited</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#121215]">
                              <FileText size={10} className="text-[#4F39F6]" />
                              <span className="truncate max-w-[110px]">
                                {act.chapterName}
                              </span>
                            </span>
                            <span>•</span>
                            <span className="text-[#4F39F6] font-semibold">
                              {act.actionType}
                            </span>
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {act.time}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onShowToast(`Activity detail: ${act.actionType} by ${act.user}`)
                        }
                        title="Activity info"
                        className="text-[#9CA3AF] hover:text-[#121215] p-0.5 cursor-pointer"
                      >
                        <AlertCircle size={13} />
                      </button>
                    </div>
                    <div className="text-[11px] text-[#121215] bg-[#FFFFFF] p-2.5 rounded-lg border border-[#EAECEF] leading-relaxed">
                      {act.isEmbed ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#EF4444] uppercase">
                            YouTube / Media Embed
                          </span>
                          <p className="text-[11px] text-[#4F39F6] underline truncate">
                            {act.detail}
                          </p>
                        </div>
                      ) : (
                        <p className="line-clamp-3">{act.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setVersionDrawerOpen(false)}
            className="w-full rounded-lg bg-[#F8F9FB] py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#EAECEF]/50 cursor-pointer"
          >
            Close Drawer
          </button>
        </aside>
      )}

      {/* FULL-SCREEN INTERACTIVE VERSION HISTORY MODAL (matches Image 4 Top-Right: History : X version + Timeline Scrubber + Inline Collaborator Highlight) */}
      {versionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Interactive Version History Modal"
          onClick={() => setVersionModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#121215]/60 backdrop-blur-xs p-4 sm:p-6 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col lg:flex-row w-full max-w-6xl h-[86vh] rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl overflow-hidden cursor-default"
          >
            {/* Left Snapshot Document Preview Area */}
            <div className="relative flex-1 flex flex-col bg-[#F8F9FB] overflow-y-auto p-6 sm:p-10">
              <div className="w-full max-w-3xl mx-auto rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-xs p-6 sm:p-8 space-y-5 flex-1">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EAECEF]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F39F6]">
                      Snapshot Preview •{" "}
                      {versions[timelineSliderIndex]?.versionTag ?? "v2.4"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#121215] mt-0.5">
                      {currentChapter?.title || docTitle}
                    </h2>
                  </div>
                  <span className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-xs font-semibold text-[#5E5E5E]">
                    {versions[timelineSliderIndex]?.label ?? "Current Version"}
                  </span>
                </div>

                {/* Snapshot Content with Collaborator Diff Highlight (matches Image 4 Top-Right) */}
                <div className="space-y-4 text-sm text-[#121215] leading-relaxed">
                  <p className="text-[#5E5E5E]">
                    {currentChapter?.bodyText ||
                      "Materi bab ini mencakup fondasi strategi konten dan eksekusi terstruktur untuk meningkatkan performa akun secara organik."}
                  </p>

                  {/* Highlighted Diff Block with Collaborator Name Tag */}
                  <div className="relative rounded-xl bg-[#FDF2F8] border border-[#F472B6]/50 p-4 pt-6">
                    <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-md bg-[#EC4899] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {versions[timelineSliderIndex]?.author ||
                        "Dinur M. Pradipta"}
                    </span>
                    <p className="text-xs sm:text-sm text-[#121215] leading-relaxed">
                      {versions[timelineSliderIndex]?.notes ||
                        "Penyesuaian struktur kurikulum, indikator poin kelulusan bab, serta penambahan referensi studi kasus terbaru."}
                    </p>
                  </div>

                  {currentChapter?.calloutText && (
                    <div className="rounded-xl bg-[#4F39F6]/5 border border-[#4F39F6]/20 p-3.5 text-xs font-medium text-[#121215]">
                      💡 {currentChapter.calloutText}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Interactive Timeline Scrubber Bar (matches Image 4 Top-Right) */}
              <div className="sticky bottom-0 mt-6 mx-auto w-full max-w-2xl rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-lg px-5 py-3 flex items-center gap-4">
                <span className="rounded-lg bg-[#121215] px-2.5 py-1 text-[11px] font-bold text-white shrink-0">
                  {versions[timelineSliderIndex]?.label?.includes(",")
                    ? versions[timelineSliderIndex]?.label.split(",")[1]?.trim()
                    : "2:05 PM"}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, versions.length - 1)}
                  value={timelineSliderIndex}
                  onChange={(e) =>
                    setTimelineSliderIndex(Number(e.target.value))
                  }
                  aria-label="Version timeline scrubber"
                  className="flex-1 accent-[#4F39F6] cursor-pointer"
                />
                <div className="flex items-center -space-x-1.5 shrink-0">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF08A] text-[#854D0E] text-[9px] font-bold ring-2 ring-white">
                    DP
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#DDD6FE] text-[#5B21B6] text-[9px] font-bold ring-2 ring-white">
                    MT
                  </span>
                </div>
              </div>
            </div>

            {/* Right Version History Sidebar (matches Image 4 Top-Right) */}
            <div className="w-full lg:w-85 shrink-0 bg-[#FFFFFF] border-t lg:border-t-0 lg:border-l border-[#EAECEF] flex flex-col justify-between p-5">
              <div className="space-y-4 overflow-y-auto">
                {/* Header: History : N version + [+] + [X] */}
                <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
                  <h3 className="text-sm font-bold text-[#121215]">
                    History :{" "}
                    <span className="text-[#5E5E5E] font-medium">
                      {versions.length} version
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSaveNewVersionSnapshot}
                      title="Save current state to Version History"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] text-[#121215] hover:text-white border border-[#EAECEF] transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVersionModalOpen(false)}
                      title="Close Version History"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Shortcut Callout Banner */}
                <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 text-center text-[11px] text-[#5E5E5E] leading-relaxed">
                  Press{" "}
                  <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#121215] border border-[#D1D5DB] shadow-2xs">
                    ⌘
                  </kbd>{" "}
                  +{" "}
                  <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#121215] border border-[#D1D5DB] shadow-2xs">
                    ⌥
                  </kbd>{" "}
                  +{" "}
                  <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#121215] border border-[#D1D5DB] shadow-2xs">
                    S
                  </kbd>{" "}
                  to add to version history while editing.
                </div>

                {/* Version List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] px-1">
                    Snapshots
                  </p>
                  {versions.map((ver, idx) => {
                    const isSelected = idx === timelineSliderIndex;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => setTimelineSliderIndex(idx)}
                        className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#4F39F6]/5 border-[#4F39F6] shadow-2xs"
                            : "bg-[#FFFFFF] border-[#EAECEF] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#121215]">
                            {ver.isCurrent ? "Current Version" : ver.versionTag}
                          </span>
                          <span className="text-[10px] font-semibold text-[#9CA3AF]">
                            {ver.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FEF08A] text-[#854D0E] text-[9px] font-bold">
                            DP
                          </span>
                          <span className="text-[11px] font-medium text-[#5E5E5E] truncate">
                            {ver.author}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions: [Cancel] & [Restore] */}
              <div className="pt-4 border-t border-[#EAECEF] grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setVersionModalOpen(false)}
                  className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF]/70 py-2.5 text-xs font-bold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const picked = versions[timelineSliderIndex];
                    if (picked) {
                      setVersions((prev) =>
                        prev.map((v, i) => ({
                          ...v,
                          isCurrent: i === timelineSliderIndex,
                        }))
                      );
                      onShowToast(
                        `Versi "${picked.versionTag} (${picked.label})" berhasil dipulihkan.`
                      );
                    }
                    setVersionModalOpen(false);
                  }}
                  className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] py-2.5 text-xs font-bold text-white shadow-[0_2px_6px_rgba(79,57,246,0.3)] transition-colors cursor-pointer"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
