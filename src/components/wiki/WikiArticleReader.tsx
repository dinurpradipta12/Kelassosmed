"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  Paperclip,
  Download,
  Edit3,
  Trash2,
  UserPlus,
  Archive,
  Film,
  Library,
  Check,
  Sparkles,
  ListOrdered,
  KeyRound,
  ChevronRight,
  User,
} from "lucide-react";
import {
  type WikiAttachmentFile,
  type WikiDocumentSection,
} from "@/lib/phase2-data";

export function estimateWikiReadTime(
  sections?: WikiDocumentSection[],
  fallback?: string
): string {
  const list = Array.isArray(sections) ? sections : [];
  const totalWords = list.reduce((sum, sec) => {
    const titleWords = (sec.title || "").trim().split(/\s+/).filter(Boolean).length;
    const bodyWords = (sec.content || "").trim().split(/\s+/).filter(Boolean).length;
    return sum + titleWords + bodyWords;
  }, 0);

  if (totalWords > 0) {
    const mins = Math.max(1, Math.ceil(totalWords / 180));
    return `${mins} menit baca`;
  }
  return fallback?.trim() || "3 menit baca";
}

export function resolveLocalWikiDocument(
  idOrTitle?: string | null
): {
  sections?: WikiDocumentSection[];
  attachments?: WikiAttachmentFile[];
  category?: string;
  readTime?: string;
  description?: string;
} | null {
  if (typeof window === "undefined" || !idOrTitle) return null;
  const key = idOrTitle.trim().toLowerCase();
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(`ruang_sosmed_wiki_doc_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Safely renders inline Notion/Markdown markers:
 * **bold**, _italic_, *italic*, <u>underline</u>, ~~strikethrough~~, `code`
 */
function renderInlineFormattedText(
  text: string,
  keyPrefix = "inline"
): React.ReactNode[] {
  if (!text) return [];
  const tokenRegex =
    /(\*\*[^*\n]+?\*\*|~~[^~\n]+?~~|<u>[\s\S]+?<\/u>|`[^`\n]+?`|_[^_\n]+?_|\*[^*\n]+?\*)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const k = `${keyPrefix}-${idx++}`;

    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      nodes.push(
        <strong key={k} className="font-bold text-[#121215]">
          {renderInlineFormattedText(token.slice(2, -2), `${k}-b`)}
        </strong>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~") && token.length > 4) {
      nodes.push(
        <del key={k} className="line-through text-[#9CA3AF]">
          {renderInlineFormattedText(token.slice(2, -2), `${k}-s`)}
        </del>
      );
    } else if (token.startsWith("<u>") && token.endsWith("</u>") && token.length > 7) {
      nodes.push(
        <span key={k} className="underline decoration-[#4F39F6]/60 underline-offset-4">
          {renderInlineFormattedText(token.slice(3, -4), `${k}-u`)}
        </span>
      );
    } else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      nodes.push(
        <code
          key={k}
          className="rounded bg-[#F1F5F9] border border-[#E2E8F0] px-1.5 py-0.5 font-mono text-[12px] text-[#4F39F6]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      ((token.startsWith("_") && token.endsWith("_")) ||
        (token.startsWith("*") && token.endsWith("*"))) &&
      token.length > 2
    ) {
      nodes.push(
        <em key={k} className="italic text-[#374151]">
          {renderInlineFormattedText(token.slice(1, -1), `${k}-i`)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export interface WikiArticleCardProps {
  id: string;
  title: string;
  category?: string;
  description?: string;
  editedDate?: string;
  folderName?: string;
  accessCode?: string;
  wikiSections?: WikiDocumentSection[];
  wikiAttachments?: WikiAttachmentFile[];
  wikiReadTime?: string;
  onOpen: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onCopyCode?: () => void;
}

export function WikiArticleCard({
  id,
  title,
  category,
  description,
  editedDate,
  folderName,
  accessCode,
  wikiSections,
  wikiAttachments,
  wikiReadTime,
  onOpen,
  isAdmin = false,
  onEdit,
  onDelete,
  onAssign,
  onCopyCode,
}: WikiArticleCardProps) {
  const localDoc = useMemo(
    () =>
      (!wikiSections || wikiSections.length === 0) &&
      typeof window !== "undefined"
        ? resolveLocalWikiDocument(title)
        : null,
    [title, wikiSections]
  );

  const effectiveSections =
    wikiSections && wikiSections.length > 0
      ? wikiSections
      : localDoc?.sections || [];
  const effectiveAttachments =
    wikiAttachments && wikiAttachments.length > 0
      ? wikiAttachments
      : localDoc?.attachments || [];
  const readTime = estimateWikiReadTime(
    effectiveSections,
    wikiReadTime || localDoc?.readTime
  );
  const displayCategory = category || localDoc?.category || "Playbook & SOP";
  const previewSections = effectiveSections.slice(0, 3);

  return (
    <article
      key={id}
      onClick={onOpen}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_2px_10px_rgba(16,15,17,0.04)] hover:border-[#8B5CF6]/55 hover:shadow-[0_10px_28px_rgba(139,92,246,0.10)] transition-all cursor-pointer"
    >
      {/* Top Notion-Style Document Header Strip */}
      <div>
        <div className="relative px-4 py-3.5 bg-gradient-to-r from-[#F5F3FF] via-[#F8FAFC] to-[#EEF2FF] border-b border-[#EAECEF] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[#DDD6FE] text-[#7C3AED] shadow-2xs">
              <BookOpen size={15} />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#8B5CF6]/12 border border-[#8B5CF6]/20 px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                📖 Bacaan Wiki &amp; SOP
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-[#EAECEF] px-2.5 py-0.5 text-[10px] font-semibold text-[#475569] shrink-0 shadow-2xs">
            <Clock size={10} className="text-[#7C3AED]" />
            <span>{readTime}</span>
          </span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold text-[#5E5E5E]">
              {displayCategory}
            </span>
            {folderName && (
              <span className="inline-flex items-center rounded-md bg-[#EEF2FF] border border-[#C7D2FE]/60 px-2 py-0.5 text-[10px] font-semibold text-[#4F39F6]">
                📁 {folderName}
              </span>
            )}
            {isAdmin && accessCode && onCopyCode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyCode();
                }}
                title={`Salin Kode Akses: ${accessCode}`}
                className="inline-flex items-center gap-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 cursor-pointer"
              >
                <KeyRound size={9} />
                <span>{accessCode}</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-[15px] font-bold text-[#121215] group-hover:text-[#6D28D9] transition-colors line-clamp-2 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-[#5E5E5E] line-clamp-2 leading-relaxed">
              {description?.trim() ||
                localDoc?.description ||
                "Panduan bacaan SOP praktis & playbook terstruktur bergaya Notion untuk Ruang Sosmed 2.0."}
            </p>
          </div>

          {/* Mini Notion Table of Contents Preview */}
          <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <ListOrdered size={11} className="text-[#7C3AED]" />
                Daftar Isi ({effectiveSections.length} Bagian)
              </span>
              {effectiveAttachments.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[#4F39F6]">
                  <Paperclip size={10} />
                  {effectiveAttachments.length} Lampiran
                </span>
              )}
            </div>

            {previewSections.length > 0 ? (
              <ul className="space-y-1">
                {previewSections.map((sec, sIdx) => (
                  <li
                    key={sec.id || sIdx}
                    className="flex items-center gap-1.5 text-[11px] text-[#374151] truncate"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]/70 shrink-0" />
                    <span className="truncate">{sec.title}</span>
                  </li>
                ))}
                {effectiveSections.length > 3 && (
                  <li className="text-[10px] font-semibold text-[#7C3AED] pl-3">
                    +{effectiveSections.length - 3} bagian pembahasan lainnya
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-[11px] text-[#94A3B8] italic">
                Klik untuk membaca artikel &amp; SOP lengkap
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-3 border-t border-[#EAECEF] bg-[#F9FAFB]/70 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9] group-hover:translate-x-0.5 transition-transform">
          <span>📖 Baca Artikel Wiki</span>
          <span>→</span>
        </span>

        {isAdmin ? (
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                title="Edit di Wiki Builder"
                className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-[#F5F3FF] border border-[#EAECEF] hover:border-[#8B5CF6]/40 px-2 py-1 text-[11px] font-semibold text-[#121215] hover:text-[#6D28D9] cursor-pointer transition-colors"
              >
                <Edit3 size={11} />
                <span>Edit</span>
              </button>
            )}
            {onAssign && (
              <button
                type="button"
                onClick={onAssign}
                title="Bagikan / Assign ke Siswa"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white hover:bg-[#EEF2FF] border border-[#EAECEF] text-[#5E5E5E] hover:text-[#4F39F6] cursor-pointer transition-colors"
              >
                <UserPlus size={12} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title="Hapus Wiki"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white hover:bg-[#FEF2F2] border border-[#EAECEF] text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-medium text-[#94A3B8]">
            {editedDate || "Playbook"}
          </span>
        )}
      </div>
    </article>
  );
}

export interface WikiArticleReaderProps {
  itemId?: string;
  title: string;
  category?: string;
  description?: string;
  editedDate?: string;
  sections?: WikiDocumentSection[];
  attachments?: WikiAttachmentFile[];
  readTime?: string;
  isAdmin?: boolean;
  onBack: () => void;
  onEdit?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
  onShowToast?: (msg: string) => void;
}

export function WikiArticleReader({
  itemId,
  title,
  category,
  description,
  editedDate,
  sections,
  attachments,
  readTime,
  isAdmin = false,
  onBack,
  onEdit,
  onAssign,
  onDelete,
  onShowToast,
}: WikiArticleReaderProps) {
  const localDoc = useMemo(
    () =>
      (!sections || sections.length === 0) && typeof window !== "undefined"
        ? resolveLocalWikiDocument(title)
        : null,
    [title, sections]
  );

  const effectiveSections: WikiDocumentSection[] = useMemo(() => {
    const raw =
      sections && sections.length > 0 ? sections : localDoc?.sections || [];
    if (raw.length > 0) return raw;
    return [
      {
        id: "overview",
        title: "Ringkasan & Panduan Utama",
        content:
          description?.trim() ||
          "Artikel Wiki & SOP ini telah dipublikasikan. Admin/Mentor dapat melengkapi bagian pembahasan detail melalui Wiki Builder (2-Col).",
      },
    ];
  }, [sections, localDoc?.sections, description]);

  const effectiveAttachments: WikiAttachmentFile[] = useMemo(() => {
    return attachments && attachments.length > 0
      ? attachments
      : localDoc?.attachments || [];
  }, [attachments, localDoc?.attachments]);

  const resolvedReadTime = estimateWikiReadTime(
    effectiveSections,
    readTime || localDoc?.readTime
  );
  const displayCategory = category || localDoc?.category || "Playbook & SOP";

  const [activeSecId, setActiveSecId] = useState<string>(
    effectiveSections[0]?.id || ""
  );

  const checklistStorageKey = `ruang_sosmed_wiki_checks_${(itemId || title || "wiki")
    .trim()
    .toLowerCase()}`;

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = window.localStorage.getItem(checklistStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    setActiveSecId(effectiveSections[0]?.id || "");
  }, [effectiveSections]);

  const toggleChecklistLine = (lineKey: string, initialChecked: boolean) => {
    setCheckedMap((prev) => {
      const current =
        typeof prev[lineKey] === "boolean" ? prev[lineKey] : initialChecked;
      const next = { ...prev, [lineKey]: !current };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(checklistStorageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleScrollToSection = (secId: string) => {
    setActiveSecId(secId);
    if (typeof document !== "undefined") {
      const el = document.getElementById(`wiki-sec-${secId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleDownloadAttachment = (att: WikiAttachmentFile) => {
    if (att.url && typeof window !== "undefined") {
      window.open(att.url, "_blank", "noopener,noreferrer");
    }
    onShowToast?.(`Mengunduh lampiran "${att.name}" (${att.size})...`);
  };

  const renderSectionBody = (secId: string, content: string) => {
    const clean = (content || "").trim();
    if (!clean) {
      return (
        <p className="text-xs italic text-[#9CA3AF]">
          Bagian ini belum memiliki isi tulisan.
        </p>
      );
    }

    const lines = clean.split(/\r?\n/);

    return (
      <div className="space-y-2 text-sm text-[#27272A] leading-relaxed">
        {lines.map((rawLine, lIdx) => {
          const line = rawLine.trim();
          if (!line) {
            return <div key={`${secId}-sp-${lIdx}`} className="h-1.5" />;
          }

          // 1. Checklist item: "• [ ] teks", "- [ ] teks", "[ ] teks", "[x] teks"
          const checkMatch = /^(?:[•\-*]\s*)?\[( |x|X)\]\s*(.+)$/.exec(line);
          if (checkMatch) {
            const initialChecked = checkMatch[1].toLowerCase() === "x";
            const itemText = checkMatch[2];
            const checkKey = `${secId}-${lIdx}`;
            const isChecked =
              typeof checkedMap[checkKey] === "boolean"
                ? checkedMap[checkKey]
                : initialChecked;

            return (
              <label
                key={checkKey}
                onClick={(e) => {
                  e.preventDefault();
                  toggleChecklistLine(checkKey, initialChecked);
                }}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 cursor-pointer transition-all ${
                  isChecked
                    ? "bg-[#ECFDF5]/60 border-[#A7F3D0] text-[#065F46]"
                    : "bg-[#F8FAFC] hover:bg-[#F5F3FF]/60 border-[#EAECEF]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? "bg-[#10B981] border-[#10B981] text-white"
                      : "bg-white border-[#CBD5E1]"
                  }`}
                >
                  {isChecked && <Check size={11} strokeWidth={3} />}
                </span>
                <span
                  className={`text-[13.5px] leading-relaxed ${
                    isChecked ? "line-through opacity-75" : ""
                  }`}
                >
                  {renderInlineFormattedText(itemText, checkKey)}
                </span>
              </label>
            );
          }

          // 2. Headings (### / ## / #)
          const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
          if (headingMatch) {
            const level = headingMatch[1].length;
            return (
              <h4
                key={`${secId}-h-${lIdx}`}
                className={`font-bold text-[#121215] pt-2 ${
                  level === 1 ? "text-base" : "text-[14.5px]"
                }`}
              >
                {renderInlineFormattedText(headingMatch[2], `${secId}-h-${lIdx}`)}
              </h4>
            );
          }

          // 3. Bullet list ("• ...", "- ...", "* ...")
          const bulletMatch = /^[•\-*]\s+(.+)$/.exec(line);
          if (bulletMatch) {
            return (
              <div
                key={`${secId}-b-${lIdx}`}
                className="flex items-start gap-2.5 pl-1"
              >
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
                <p className="text-[13.5px] leading-relaxed text-[#27272A]">
                  {renderInlineFormattedText(bulletMatch[1], `${secId}-b-${lIdx}`)}
                </p>
              </div>
            );
          }

          // 4. Numbered step ("1. ...", "2) ...")
          const numMatch = /^(\d+[.)])\s+(.+)$/.exec(line);
          if (numMatch) {
            return (
              <div
                key={`${secId}-n-${lIdx}`}
                className="flex items-start gap-2.5 pl-1"
              >
                <span className="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-md bg-[#F5F3FF] border border-[#DDD6FE] px-1 text-[11px] font-bold text-[#6D28D9] shrink-0">
                  {numMatch[1].replace(/[.)]$/, "")}
                </span>
                <p className="text-[13.5px] leading-relaxed text-[#27272A]">
                  {renderInlineFormattedText(numMatch[2], `${secId}-n-${lIdx}`)}
                </p>
              </div>
            );
          }

          // 5. Standard paragraph
          return (
            <p
              key={`${secId}-p-${lIdx}`}
              className="text-[13.5px] leading-relaxed text-[#27272A]"
            >
              {renderInlineFormattedText(line, `${secId}-p-${lIdx}`)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-20">
      {/* Top Sticky Notion-Style Action Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#EAECEF] px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 border border-[#EAECEF] px-3 py-1.5 text-xs font-semibold text-[#121215] transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Daftar Wiki</span>
            </button>

            <nav
              aria-label="Wiki breadcrumb"
              className="hidden md:flex items-center gap-1.5 text-xs text-[#64748B] min-w-0"
            >
              <span>Wiki &amp; Playbook</span>
              <ChevronRight size={13} className="shrink-0 text-[#CBD5E1]" />
              <span className="font-medium text-[#6D28D9] truncate max-w-[160px]">
                {displayCategory}
              </span>
              <ChevronRight size={13} className="shrink-0 text-[#CBD5E1]" />
              <span className="font-semibold text-[#121215] truncate max-w-[260px]">
                {title}
              </span>
            </nav>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Artikel di Wiki Builder</span>
                </button>
              )}
              {onAssign && (
                <button
                  type="button"
                  onClick={onAssign}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-[#F8F9FB] border border-[#EAECEF] px-3 py-1.5 text-xs font-semibold text-[#121215] transition-colors cursor-pointer"
                >
                  <UserPlus size={13} className="text-[#4F39F6]" />
                  <span>Bagikan / Assign</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-[#FEF2F2] border border-[#EAECEF] hover:border-[#FECACA] px-3 py-1.5 text-xs font-semibold text-[#EF4444] transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Notion-Style Reading Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Notion-Style Article Cover & Title Header */}
        <header className="overflow-hidden rounded-2xl bg-white border border-[#EAECEF] shadow-[0_2px_12px_rgba(16,15,17,0.04)]">
          <div className="h-24 sm:h-28 bg-gradient-to-r from-[#EDE9FE] via-[#EEF2FF] to-[#E0F2FE] relative">
            <div className="absolute -bottom-6 left-6 sm:left-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-[#DDD6FE] shadow-md text-2xl">
              📘
            </div>
          </div>

          <div className="pt-9 pb-6 px-6 sm:px-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2.5 py-0.5 text-[11px] font-bold text-[#6D28D9]">
                📘 Bacaan Wiki &amp; Playbook SOP
              </span>
              <span className="inline-flex items-center rounded-full bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                {displayCategory}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121215] tracking-tight leading-snug">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#121215]">
                <User size={13} className="text-[#7C3AED]" />
                Mentor Ruang Sosmed 2.0
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} className="text-[#7C3AED]" />
                {resolvedReadTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={13} className="text-[#4F39F6]" />
                {effectiveSections.length} Bagian Topik
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Paperclip size={13} className="text-[#0EA5E9]" />
                {effectiveAttachments.length} Lampiran
              </span>
              {editedDate && (
                <span>Diperbarui: {editedDate}</span>
              )}
            </div>
          </div>
        </header>

        {/* 2-Column Reading Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Columns: Notion Document Article Body */}
          <main className="lg:col-span-8 space-y-5 min-w-0">
            {description && description.trim() && (
              <div className="rounded-2xl bg-[#F5F3FF]/70 border border-[#DDD6FE] p-5 flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#7C3AED] border border-[#DDD6FE] shadow-2xs">
                  <Sparkles size={14} />
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D28D9]">
                    Ringkasan Playbook
                  </p>
                  <p className="text-xs sm:text-[13.5px] text-[#374151] leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white border border-[#EAECEF] shadow-[0_2px_10px_rgba(16,15,17,0.03)] divide-y divide-[#F1F5F9]">
              {effectiveSections.map((sec, idx) => (
                <section
                  key={sec.id || idx}
                  id={`wiki-sec-${sec.id}`}
                  className="p-6 sm:p-8 scroll-mt-20 space-y-3.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] text-xs font-extrabold text-[#6D28D9] shrink-0">
                      {idx + 1}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-[#121215] tracking-tight leading-snug">
                      {sec.title}
                    </h2>
                  </div>

                  <div className="pl-0 sm:pl-10">
                    {renderSectionBody(sec.id, sec.content)}
                  </div>
                </section>
              ))}
            </div>
          </main>

          {/* Right 4 Columns: Sticky Table of Contents + File Attachments */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            {/* Table of Contents */}
            <div className="rounded-2xl bg-white border border-[#EAECEF] p-5 shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Daftar Isi Artikel
                </h3>
                <span className="rounded-full bg-[#F5F3FF] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                  {effectiveSections.length} bagian
                </span>
              </div>

              <nav aria-label="Daftar Isi Wiki" className="space-y-1">
                {effectiveSections.map((sec, idx) => {
                  const isActive = activeSecId === sec.id;
                  return (
                    <button
                      key={sec.id || idx}
                      type="button"
                      onClick={() => handleScrollToSection(sec.id)}
                      className={`w-full flex items-start gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#F5F3FF] text-[#6D28D9] font-bold border border-[#DDD6FE]"
                          : "text-[#475569] hover:bg-[#F8F9FB] hover:text-[#121215] font-medium border border-transparent"
                      }`}
                    >
                      <span className="text-[11px] opacity-70 tabular-nums shrink-0 mt-0.5">
                        {idx + 1}.
                      </span>
                      <span className="line-clamp-2 leading-snug">{sec.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Attachment Files */}
            <div className="rounded-2xl bg-white border border-[#EAECEF] p-5 shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Attachment File ({effectiveAttachments.length})
                </h3>
              </div>

              {effectiveAttachments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#EAECEF] bg-[#F8F9FB] p-4 text-center space-y-1">
                  <Paperclip size={18} className="mx-auto text-[#9CA3AF]" />
                  <p className="text-[11px] font-medium text-[#64748B]">
                    Tidak ada file lampiran tambahan pada artikel ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {effectiveAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-2.5 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-2.5 hover:border-[#8B5CF6]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
                            att.ext === "pdf"
                              ? "bg-[#EF4444]"
                              : att.ext === "zip"
                              ? "bg-[#3B82F6]"
                              : att.ext === "mp4"
                              ? "bg-[#7C3AED]"
                              : "bg-[#F97316]"
                          }`}
                        >
                          {att.ext === "pdf" && <FileText size={14} />}
                          {att.ext === "zip" && <Archive size={14} />}
                          {att.ext === "mp4" && <Film size={14} />}
                          {att.ext === "fig" && <Library size={14} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#121215] truncate">
                            {att.name}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF]">
                            {att.size} • {att.ext.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        title={`Unduh ${att.name}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white hover:bg-[#4F39F6] text-[#121215] hover:text-white border border-[#EAECEF] transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
