"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Library,
  Download,
  ExternalLink,
  Clock,
  Search,
  CheckCircle2,
  Trash2,
  Upload,
  FolderOpen,
  MoreVertical,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  FileText,
  Film,
  Archive,
  Play,
  X,
} from "lucide-react";
import {
  WIKI_CATEGORIES,
  type WikiCategory,
  type WikiResourceCard,
} from "@/lib/phase3-data";
import {
  type ExplorerContentItem,
  type WikiAttachmentFile,
  type WikiDocumentSection,
} from "@/lib/phase2-data";
import {
  WikiArticleReader,
  estimateWikiReadTime,
  resolveLocalWikiDocument,
} from "@/components/wiki/WikiArticleReader";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { ContentBadge } from "@/components/ui/ContentBadge";

export interface WikiPublishPayload {
  title: string;
  category: string;
  description: string;
  sections: WikiDocumentSection[];
  attachments: WikiAttachmentFile[];
  readTime: string;
}

interface WikiBuilderProps {
  initialTitle?: string;
  initialItem?: ExplorerContentItem | null;
  onBack: () => void;
  onPublishWiki: (payload: WikiPublishPayload) => void;
  onShowToast: (msg: string) => void;
}

const WIKI_PILLAR_CATEGORIES = [
  "Social Media Specialist",
  "Content Strategist",
  "Personal Branding",
  "Tren & Algoritma Social Media",
  ...WIKI_CATEGORIES,
];

const INITIAL_WIKI_ATTACHMENTS: WikiAttachmentFile[] = [];

const INITIAL_SECTIONS: WikiDocumentSection[] = [
  {
    id: "sec-1",
    title: "Panduan & SOP Pembelajaran",
    content: "",
  },
];

export function WikiBuilder({
  initialTitle = "Dokumen Panduan & SOP Pembelajaran",
  initialItem = null,
  onBack,
  onPublishWiki,
  onShowToast,
}: WikiBuilderProps) {
  const {
    explorerItems,
    wikiResources: resources,
    addWikiResourceCard,
    deleteWikiResourceCard,
  } = useRuangSosmedStore();

  const existingWikiItem = useMemo(() => {
    if (initialItem && initialItem.type === "Wiki") return initialItem;
    const targetTitle = (initialItem?.title || initialTitle || "")
      .trim()
      .toLowerCase();
    if (!targetTitle) return null;
    return (
      explorerItems.find(
        (e) =>
          e.type === "Wiki" && e.title.trim().toLowerCase() === targetTitle
      ) || null
    );
  }, [initialItem, initialTitle, explorerItems]);

  const [wikiTitle, setWikiTitle] = useState(
    existingWikiItem?.title || initialTitle
  );
  const [wikiCategory, setWikiCategory] = useState<string>(
    existingWikiItem?.category && existingWikiItem.category !== "Folder"
      ? existingWikiItem.category
      : "Social Media Specialist"
  );
  const [wikiSummary, setWikiSummary] = useState<string>(
    existingWikiItem?.description || ""
  );
  const [viewMode, setViewMode] = useState<"document" | "directory">(
    "document"
  );
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | WikiCategory
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingResource, setAddingResource] = useState(false);

  // Trenning 2-Column Wiki Document + Attachment File state
  const [attachments, setAttachments] = useState<WikiAttachmentFile[]>(() => {
    if (
      existingWikiItem?.wikiAttachments &&
      existingWikiItem.wikiAttachments.length > 0
    ) {
      return existingWikiItem.wikiAttachments;
    }
    const localDoc = resolveLocalWikiDocument(
      existingWikiItem?.title || initialTitle
    );
    return localDoc?.attachments?.length
      ? localDoc.attachments
      : INITIAL_WIKI_ATTACHMENTS;
  });
  const [sections, setSections] = useState<WikiDocumentSection[]>(() => {
    if (
      existingWikiItem?.wikiSections &&
      existingWikiItem.wikiSections.length > 0
    ) {
      return existingWikiItem.wikiSections;
    }
    const localDoc = resolveLocalWikiDocument(
      existingWikiItem?.title || initialTitle
    );
    return localDoc?.sections?.length ? localDoc.sections : INITIAL_SECTIONS;
  });
  const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const hydratedKeyRef = React.useRef<string>("");

  useEffect(() => {
    const lookupTitle = existingWikiItem?.title || initialTitle || "";
    const hydrateKey = `${existingWikiItem?.id || ""}:${lookupTitle}`;
    if (!hydrateKey || hydratedKeyRef.current === hydrateKey) return;
    hydratedKeyRef.current = hydrateKey;

    const localDoc = resolveLocalWikiDocument(lookupTitle);
    if (existingWikiItem?.title) {
      setWikiTitle(existingWikiItem.title);
    }
    if (
      existingWikiItem?.category &&
      existingWikiItem.category !== "Folder"
    ) {
      setWikiCategory(existingWikiItem.category);
    } else if (localDoc?.category) {
      setWikiCategory(localDoc.category);
    }
    if (existingWikiItem?.description) {
      setWikiSummary(existingWikiItem.description);
    } else if (localDoc?.description) {
      setWikiSummary(localDoc.description);
    }
    if (existingWikiItem?.wikiSections?.length) {
      setSections(existingWikiItem.wikiSections);
      setActiveSectionId(existingWikiItem.wikiSections[0]?.id || "sec-1");
    } else if (localDoc?.sections?.length) {
      setSections(localDoc.sections);
      setActiveSectionId(localDoc.sections[0]?.id || "sec-1");
    }
    if (existingWikiItem?.wikiAttachments?.length) {
      setAttachments(existingWikiItem.wikiAttachments);
    } else if (localDoc?.attachments?.length) {
      setAttachments(localDoc.attachments);
    }
  }, [existingWikiItem, initialTitle]);

  const handlePublishClick = () => {
    const cleanTitle = wikiTitle.trim() || initialTitle || "Artikel Wiki Baru";
    const firstContentSnippet = sections
      .map((s) => (s.content || "").trim())
      .find(Boolean);
    const derivedDesc =
      wikiSummary.trim() ||
      (firstContentSnippet
        ? firstContentSnippet
            .replace(/\*\*|__|~~|<\/?u>/g, "")
            .replace(/\s+/g, " ")
            .slice(0, 180)
        : `Artikel bacaan Wiki & Playbook SOP: ${cleanTitle} (${sections.length} bagian pembahasan).`);

    const cleanAttachments = attachments.map((att) => ({
      ...att,
      uploadProgress: 100,
    }));
    const readTime = estimateWikiReadTime(sections);

    onPublishWiki({
      title: cleanTitle,
      category: wikiCategory,
      description: derivedDesc,
      sections,
      attachments: cleanAttachments,
      readTime,
    });
  };

  const insertWikiFormatting = (snippet: string, label: string) => {
    const targetId = activeSectionId || sections[0]?.id;
    if (!targetId) return;
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === targetId
          ? {
              ...sec,
              content: sec.content ? `${sec.content} ${snippet}` : snippet,
            }
          : sec
      )
    );
    onShowToast(`Applied ${label} formatting.`);
  };

  // New Resource Form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<WikiCategory>(
    "Content Calendar Templates"
  );
  const [newDesc, setNewDesc] = useState("");
  const [newActionType, setNewActionType] = useState<"download" | "external">(
    "download"
  );
  const [newActionLabel, setNewActionLabel] = useState(
    "Download Template (PDF / Notion)"
  );

  const handleAddSection = () => {
    const newId = `sec-${Date.now()}`;
    const newSec: WikiDocumentSection = {
      id: newId,
      title: `Bagian ${sections.length + 1}`,
      content: "",
    };
    setSections((prev) => [...prev, newSec]);
    onShowToast("Menambahkan bagian baru ke dokumen.");
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length <= 1) {
      onShowToast("Dokumen harus memiliki minimal 1 bagian.");
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
    onShowToast("Menghapus bagian dokumen.");
  };

  const handleUpdateSection = (
    id: string,
    patch: Partial<WikiDocumentSection>
  ) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const simulateFileUploadProgress = (
    itemsToUpload: {
      id: string;
      name: string;
      size: string;
      ext: WikiAttachmentFile["ext"];
      initialPct: number;
    }[]
  ) => {
    const newEntries: WikiAttachmentFile[] = itemsToUpload.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      ext: item.ext,
      uploadProgress: item.initialPct,
    }));

    setAttachments((prev) => [...newEntries, ...prev]);

    itemsToUpload.forEach((item, idx) => {
      const step1Delay = 450 + idx * 180;
      const step2Delay = 1100 + idx * 240;

      window.setTimeout(() => {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === item.id ? { ...a, uploadProgress: 70 } : a
          )
        );
      }, step1Delay);

      window.setTimeout(() => {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === item.id ? { ...a, uploadProgress: 100 } : a
          )
        );
      }, step2Delay);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const initialPcts = [70, 50, 50, 45];

    const items = filesArray.map((file, idx) => {
      const rawExt = file.name.split(".").pop()?.toLowerCase();
      const ext: WikiAttachmentFile["ext"] =
        rawExt === "pdf"
          ? "pdf"
          : rawExt === "zip"
          ? "zip"
          : rawExt === "mp4"
          ? "mp4"
          : rawExt === "fig"
          ? "fig"
          : "pdf";
      const sizeMb = file.size / (1024 * 1024);
      const sizeStr =
        sizeMb >= 1
          ? `${sizeMb.toFixed(1)}mb`
          : `${(file.size / 1024).toFixed(1)}kb`;
      return {
        id: `att-${Date.now()}-${idx}`,
        name: file.name,
        size: sizeStr,
        ext,
        initialPct: initialPcts[idx % initialPcts.length] ?? 45,
      };
    });

    simulateFileUploadProgress(items);
    onShowToast(
      `Mengunggah ${items.length} file lampiran (${items.map((i) => i.name).join(", ")})...`
    );
    e.target.value = "";
  };

  const handleDriveImport = () => {
    const batchChoice = window.prompt(
      "Masukkan nama file dari Google Drive (pisahkan dengan koma untuk unggah beberapa file sekaligus):",
      "The Shape of Design.pdf, Jobs to Be Done.pdf, Google_font_recommendation.zip, Spacing simple trick.mp4, Ant Design System.fig"
    );
    if (!batchChoice || !batchChoice.trim()) return;
    const names = batchChoice
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const defaultSizes = ["30mb", "12,4mb", "5.3mb", "124mb", "64,2mb"];
    const initialPcts = [70, 50, 65, 50, 45];

    const items = names.map((name, idx) => {
      const rawExt = name.split(".").pop()?.toLowerCase();
      const ext: WikiAttachmentFile["ext"] =
        rawExt === "pdf"
          ? "pdf"
          : rawExt === "zip"
          ? "zip"
          : rawExt === "mp4"
          ? "mp4"
          : rawExt === "fig"
          ? "fig"
          : "pdf";
      return {
        id: `att-${Date.now()}-${idx}`,
        name,
        size: defaultSizes[idx % defaultSizes.length] || "12.4mb",
        ext,
        initialPct: initialPcts[idx % initialPcts.length] ?? 45,
      };
    });

    simulateFileUploadProgress(items);
    onShowToast(`Mengimpor ${items.length} file dari Google Drive...`);
  };

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle =
      newTitle.trim() || "New Ruang Sosmed 2.0 Creator SOP Resource";
    const newCard: WikiResourceCard = {
      id: `wiki-${Date.now()}`,
      title: finalTitle,
      category: newCategory,
      description:
        newDesc.trim() ||
        "Curated playbook and standard operating procedure for Ruang Sosmed 2.0 cohorts.",
      actionType: newActionType,
      actionLabel:
        newActionLabel.trim() ||
        (newActionType === "download"
          ? "Download Resource"
          : "Open External Link ↗"),
      actionUrl: "#resource-link",
      lastUpdated: "Updated just now",
      iconAccent: "#8B5CF6",
    };

    addWikiResourceCard(newCard);
    setNewTitle("");
    setNewDesc("");
    setAddingResource(false);
    onShowToast(
      `Added "${finalTitle}" to Wiki Directory (synced with Learner Portal Wiki).`
    );
  };

  const handleDeleteResource = (id: string) => {
    deleteWikiResourceCard(id);
    onShowToast("Removed resource card from Wiki.");
  };

  const filteredResources = resources.filter((res) => {
    if (selectedCategory !== "All" && res.category !== selectedCategory) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !res.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !res.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-16">
      {/* Hidden File Input for Real Multi-File Upload */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Bar (Matches ref_15) */}
      <header className="sticky top-10 z-20 bg-[#FFFFFF] border-b border-[#EAECEF] px-6 py-3.5">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to workspace"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-[#9CA3AF] hidden sm:inline">
              Edited Just now
            </span>
            <span className="text-[#EAECEF] hidden sm:inline">|</span>
            <ContentBadge type="Wiki" size="sm" />
            <input
              type="text"
              value={wikiTitle}
              disabled={previewMode}
              onChange={(e) => setWikiTitle(e.target.value)}
              aria-label="Wiki Directory Title"
              className="min-w-0 flex-1 max-w-md rounded-lg bg-transparent px-2 py-1 text-sm font-bold text-[#121215] hover:bg-[#F8F9FB] focus:bg-[#FFFFFF] focus:border focus:border-[#4F39F6] focus:outline-none truncate"
            />
            <span
              title="All changes synced to cloud"
              className="hidden md:inline-flex items-center gap-1 rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] font-medium text-[#5E5E5E]"
            >
              <CheckCircle2 size={12} className="text-[#10B981]" />
              <span>Synced</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Collaborator Avatars (matches Image 2) */}
            <div className="hidden sm:flex items-center -space-x-1.5 mr-1">
              <span
                title="Dinur M. Pradipta"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FEF08A] text-[#854D0E] text-[10px] font-bold ring-2 ring-white"
              >
                DP
              </span>
              <button
                type="button"
                onClick={() =>
                  onShowToast("Invite collaborator link copied to clipboard.")
                }
                title="Add collaborator"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F8F9FB] hover:bg-[#EAECEF] text-[#5E5E5E] text-xs font-bold ring-2 ring-white border border-[#EAECEF] cursor-pointer"
              >
                +
              </button>
            </div>

            {/* View Mode Toggle: Trenning Document View vs Cards Directory */}
            <div className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setViewMode("document")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "document"
                    ? "bg-[#FFFFFF] text-[#121215] shadow-2xs"
                    : "text-[#5E5E5E]"
                }`}
              >
                Wiki Builder (2-Col)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("directory")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "directory"
                    ? "bg-[#FFFFFF] text-[#121215] shadow-2xs"
                    : "text-[#5E5E5E]"
                }`}
              >
                Resource Cards ({resources.length})
              </button>
            </div>

            {/* Preview Toggle Button (matches Image 2: ▷ Preview) */}
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

            <button
              type="button"
              onClick={handlePublishClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
            >
              <span>Publish</span>
            </button>
          </div>
        </div>
      </header>

      {viewMode === "document" && previewMode ? (
        <WikiArticleReader
          itemId={existingWikiItem?.id}
          title={wikiTitle.trim() || initialTitle}
          category={wikiCategory}
          description={wikiSummary}
          editedDate="Preview Draft"
          sections={sections}
          attachments={attachments}
          readTime={estimateWikiReadTime(sections)}
          isAdmin={false}
          onBack={() => setPreviewMode(false)}
          onShowToast={onShowToast}
        />
      ) : viewMode === "document" ? (
        /* ===============================================================
           EXACT TRENNING 2-COLUMN WIKI BUILDER LAYOUT (ref_15)
           Left: Rich Resource Listing Document | Right: Attachment File Panel
           =============================================================== */
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
          <div className="rounded-2xl bg-[#FFFFFF] p-6 sm:p-10 border border-[#EAECEF] shadow-[0_2px_12px_rgba(16,15,17,0.04)] grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Columns: Resource Listing Editor */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2.5 py-0.5 text-[11px] font-bold text-[#6D28D9]">
                    📘 Artikel Bacaan Wiki &amp; Playbook SOP (Notion-Style)
                  </span>
                  <span className="text-[11px] font-medium text-[#64748B]">
                    ⏱ {estimateWikiReadTime(sections)} • {sections.length} Bagian
                  </span>
                </div>

                <h1 className="text-2xl font-bold text-[#121215] tracking-tight">
                  {wikiTitle}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3">
                  <div>
                    <label
                      htmlFor="wiki-pillar-category"
                      className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1"
                    >
                      Kategori / Pilar Wiki
                    </label>
                    <select
                      id="wiki-pillar-category"
                      value={wikiCategory}
                      onChange={(e) => setWikiCategory(e.target.value)}
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                    >
                      {WIKI_PILLAR_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="wiki-short-summary"
                      className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1"
                    >
                      Ringkasan Singkat Artikel
                    </label>
                    <input
                      id="wiki-short-summary"
                      type="text"
                      value={wikiSummary}
                      onChange={(e) => setWikiSummary(e.target.value)}
                      placeholder="Ringkasan singkat isi panduan / SOP ini..."
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Formatting Toolbar: B I U S | List (ref_15) */}
              {!previewMode && (
                <div className="flex items-center gap-1 pb-3 border-b border-[#EAECEF] text-[#121215]">
                  <button
                    type="button"
                    onClick={() => insertWikiFormatting("**Bold**", "Bold")}
                    className="p-1.5 rounded hover:bg-[#F8F9FB] cursor-pointer"
                    title="Bold"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertWikiFormatting("*Italic*", "Italic")}
                    className="p-1.5 rounded hover:bg-[#F8F9FB] cursor-pointer"
                    title="Italic"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertWikiFormatting("<u>Underlined</u>", "Underline")
                    }
                    className="p-1.5 rounded hover:bg-[#F8F9FB] cursor-pointer"
                    title="Underline"
                  >
                    <Underline size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertWikiFormatting("~~Strikethrough~~", "Strikethrough")
                    }
                    className="p-1.5 rounded hover:bg-[#F8F9FB] cursor-pointer"
                    title="Strikethrough"
                  >
                    <Strikethrough size={14} />
                  </button>
                  <span className="h-4 w-px bg-[#EAECEF] mx-1" />
                  <button
                    type="button"
                    onClick={() =>
                      insertWikiFormatting("\n• Poin panduan baru", "Bullet List")
                    }
                    className="p-1.5 rounded hover:bg-[#F8F9FB] cursor-pointer"
                    title="Bullet List"
                  >
                    <List size={14} />
                  </button>
                </div>
              )}

              {/* Dynamic Sections Listing (No dummy data) */}
              <div className="space-y-4">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className="group relative rounded-xl border border-[#EAECEF] bg-[#FFFFFF] p-4 space-y-2 hover:border-[#4F39F6]/40 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        disabled={previewMode}
                        value={sec.title}
                        onFocus={() => setActiveSectionId(sec.id)}
                        onChange={(e) =>
                          handleUpdateSection(sec.id, { title: e.target.value })
                        }
                        placeholder="Judul Bagian..."
                        className="flex-1 font-bold text-sm text-[#121215] bg-transparent focus:outline-none focus:border-b focus:border-[#4F39F6]"
                      />
                      {!previewMode && sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.id)}
                          title="Hapus Bagian"
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#EF4444] transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      disabled={previewMode}
                      value={sec.content}
                      onFocus={() => setActiveSectionId(sec.id)}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, { content: e.target.value })
                      }
                      placeholder="Tuliskan catatan, standar operasional, link referensi, atau panduan materi di sini..."
                      className="w-full text-xs text-[#121215] leading-relaxed bg-transparent resize-y focus:outline-none placeholder:text-[#9CA3AF]"
                    />
                  </div>
                ))}

                {!previewMode && (
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#D1D5DB] hover:border-[#4F39F6] bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#4F39F6] transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>+ Tambah Bagian Dokumen</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Attachment File Panel (ref_15) */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#F8F9FB] p-5 border border-[#EAECEF] space-y-4">
                <h3 className="text-xs font-semibold text-[#9CA3AF]">
                  Attachment File
                </h3>

                {/* Upload a File & Import from Drive buttons */}
                <div className="space-y-2 pb-3 border-b border-[#EAECEF]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#121215] hover:bg-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    <Upload size={14} className="text-[#121215]" />
                    <span>Upload a File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDriveImport}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#121215] hover:bg-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    <FolderOpen size={14} className="text-[#121215]" />
                    <span>Import from Drive</span>
                  </button>
                </div>

                {/* Attachment File Cards (.pdf, .zip, .mp4, .fig) */}
                <div className="space-y-2.5">
                  {attachments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#EAECEF] bg-[#FFFFFF] p-6 text-center space-y-2">
                      <FolderOpen size={24} className="mx-auto text-[#9CA3AF]" />
                      <p className="text-xs font-semibold text-[#121215]">
                        Belum Ada File Lampiran
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        Unggah file atau import dari Drive untuk melampirkan aset ke wiki ini.
                      </p>
                    </div>
                  ) : (
                    attachments.map((att) => {
                      const isMenuOpen = openMenuId === att.id;
                      const isUploading =
                        typeof att.uploadProgress === "number" &&
                        att.uploadProgress < 100;
                      return (
                        <div
                          key={att.id}
                          className="relative overflow-hidden flex items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] p-3 border border-[#EAECEF] shadow-2xs transition-all"
                        >
                          {/* Simulated Bottom Upload Progress Bar (45% -> 70% -> 100%) */}
                          {isUploading && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#EAECEF]">
                              <div
                                className="h-full bg-[#4F39F6] transition-all duration-300"
                                style={{ width: `${att.uploadProgress}%` }}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-3 min-w-0">
                            {isUploading ? (
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F8F9FB] border border-[#EAECEF] text-[#5E5E5E]">
                                <FileText size={16} />
                              </span>
                            ) : (
                              <span
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${
                                  att.ext === "pdf"
                                    ? "bg-[#EF4444]"
                                    : att.ext === "zip"
                                    ? "bg-[#3B82F6]"
                                    : att.ext === "mp4"
                                    ? "bg-[#7C3AED]"
                                    : "bg-[#F97316] text-white"
                                }`}
                              >
                                {att.ext === "pdf" && <FileText size={16} />}
                                {att.ext === "zip" && <Archive size={16} />}
                                {att.ext === "mp4" && <Film size={16} />}
                                {att.ext === "fig" && <Library size={16} />}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#121215] truncate">
                                {att.name}
                              </p>
                              <p className="text-[11px] text-[#9CA3AF] mt-0.5 tabular-nums">
                                {isUploading
                                  ? `${att.size} - ${att.uploadProgress}%`
                                  : att.size}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isUploading && (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId(isMenuOpen ? null : att.id)
                                }
                                title="More options"
                                className="p-1 text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
                              >
                                <MoreVertical size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setAttachments((prev) =>
                                  prev.filter((a) => a.id !== att.id)
                                );
                                setOpenMenuId(null);
                                onShowToast(`Removed "${att.name}".`);
                              }}
                              title="Remove attachment"
                              className="p-1 text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {isMenuOpen && !isUploading && (
                            <div className="absolute right-3 top-11 z-20 w-36 rounded-xl bg-[#FFFFFF] p-1 border border-[#EAECEF] shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onShowToast(`Downloading "${att.name}"...`);
                                }}
                                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachments((prev) =>
                                    prev.filter((a) => a.id !== att.id)
                                  );
                                  setOpenMenuId(null);
                                  onShowToast(`Removed "${att.name}".`);
                                }}
                                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DIRECTORY CARDS VIEW */
        <div className="w-full px-4 sm:px-5 pt-5 space-y-6">
          <div className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B5CF6]">
                  Ruang Sosmed 2.0 Knowledge Base &amp; Resource Directory
                </span>
                <h1 className="text-xl font-bold text-[#121215] mt-0.5">
                  {wikiTitle}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search wiki resources..."
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAddingResource((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Card</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EAECEF]">
              {(["All", ...WIKI_CATEGORIES] as const).map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-[#8B5CF6] text-white shadow-2xs"
                        : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {addingResource && (
            <form
              onSubmit={handleAddResource}
              className="rounded-xl bg-[#FFFFFF] p-6 border border-[#8B5CF6]/40 space-y-4"
            >
              <h2 className="text-sm font-bold text-[#121215]">
                Add New Resource Card to Wiki
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Resource Title..."
                  className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
                />
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as WikiCategory)
                  }
                  className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                >
                  {WIKI_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Resource description..."
                className="w-full rounded-lg bg-[#F8F9FB] p-3 text-xs text-[#121215] border border-[#EAECEF]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingResource(false)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Save Resource Card
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredResources.map((card) => (
              <article
                key={card.id}
                className="group flex flex-col justify-between rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:border-[#8B5CF6]/50 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border"
                        style={{
                          backgroundColor: `${card.iconAccent}15`,
                          borderColor: `${card.iconAccent}35`,
                          color: card.iconAccent,
                        }}
                      >
                        <Library size={17} strokeWidth={2.2} />
                      </span>
                      <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#5E5E5E]">
                        {card.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteResource(card.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#EF4444] transition-opacity cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h2 className="text-sm font-bold text-[#121215] leading-snug">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-xs text-[#5E5E5E] leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#EAECEF] space-y-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onShowToast(`Downloading: "${card.title}"`)
                    }
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                  >
                    {card.actionType === "download" ? (
                      <Download size={13} />
                    ) : (
                      <ExternalLink size={13} />
                    )}
                    <span>{card.actionLabel}</span>
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      {card.lastUpdated}
                    </span>
                    <span>Ruang Sosmed 2.0 Wiki</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
