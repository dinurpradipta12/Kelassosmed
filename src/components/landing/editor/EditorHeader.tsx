"use client";

import React from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Save,
  Undo2,
  Redo2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface EditorHeaderProps {
  title?: string;
  status: "DRAFT" | "PUBLISHED" | "draft" | "published";
  isDirty?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  onExit: () => void;
  onToggleStatus: () => void;
  onDuplicatePage: () => void;
  onPreviewPublic: () => void;
  onSave: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function EditorHeader({
  status,
  isDirty = false,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  onExit,
  onToggleStatus,
  onDuplicatePage,
  onPreviewPublic,
  onSave,
  onUndo,
  onRedo,
}: EditorHeaderProps) {
  const isPublished = status.toUpperCase() === "PUBLISHED";

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* Kolom Kiri: Navigasi, Judul, Status & Subtitle Bantuan */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shrink-0"
          title="Kembali ke Dashboard Landing Page"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Landing Page</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 truncate">
              Editor Landing Page
            </h1>
            <button
              type="button"
              onClick={onToggleStatus}
              title="Klik untuk ubah status publikasi"
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                isPublished
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${isPublished ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </button>
            {isDirty && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <AlertCircle size={11} />
                <span>Belum disimpan</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate hidden lg:block">
            Tarik blok ke canvas, klik blok untuk mengedit, lalu simpan dan publikasikan.
          </p>
        </div>
      </div>

      {/* Kolom Kanan: Undo/Redo & Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Undo / Redo */}
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-xl mr-1">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>
          </div>
        )}

        {/* Secondary: Duplikat Page */}
        <button
          type="button"
          onClick={onDuplicatePage}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          title="Duplikat halaman ini sebagai template baru"
        >
          <Copy size={13} />
          <span className="hidden sm:inline">Duplikat Page</span>
        </button>

        {/* Secondary: Preview Publik */}
        <button
          type="button"
          onClick={onPreviewPublic}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          title="Pratinjau tampilan publik"
        >
          <ExternalLink size={13} />
          <span className="hidden sm:inline">Preview publik</span>
        </button>

        {/* Primary: Simpan Page */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={13} />
          )}
          <span>{isSaving ? "Menyimpan..." : "Simpan Page"}</span>
        </button>
      </div>
    </header>
  );
}
