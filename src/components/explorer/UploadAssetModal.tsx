"use client";

import React, { useState, useRef } from "react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import {
  Upload,
  FileCode,
  FileText,
  Video,
  CheckCircle2,
  X,
  FileArchive,
} from "lucide-react";
import { type ContentType } from "@/lib/design-tokens";

interface UploadAssetModalProps {
  open: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  activeProjectName?: string;
}

export function UploadAssetModal({
  open,
  onClose,
  onShowToast,
  activeProjectName = "Ruang Sosmed Class",
}: UploadAssetModalProps) {
  const { publishContentToStudioAndCatalog, cohortProjects } =
    useRuangSosmedStore();

  const [assetType, setAssetType] = useState<"SCORM" | "PDF" | "Video">("SCORM");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [targetCohort, setTargetCohort] = useState(activeProjectName);
  const [category, setCategory] = useState("Social Media Strategy");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `Asset ${assetType} — ${selectedFile?.name || "Uploaded"}`;

    setIsUploading(true);
    setUploadProgress(40);

    setTimeout(() => {
      setUploadProgress(75);
    }, 300);

    setTimeout(() => {
      setUploadProgress(100);
      setIsUploading(false);

      // Publish into actual Studio & Catalog store as Course / Page
      const mappedType: ContentType = assetType === "SCORM" ? "Course" : "Page";
      publishContentToStudioAndCatalog(
        mappedType,
        finalTitle,
        `Diimpor dari berkas ${assetType} (${selectedFile?.name || "Asset"}). Ukuran: ${
          selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) + " MB" : "1.2 MB"
        }`,
        "Not Urgent",
        undefined,
        targetCohort
      );

      onShowToast(
        `Berhasil mengimpor berkas ${assetType}: "${finalTitle}" ke dalam cohort "${targetCohort}"!`
      );

      setSelectedFile(null);
      setTitle("");
      setUploadProgress(0);
      onClose();
    }, 700);
  };

  const acceptedExtensions =
    assetType === "SCORM"
      ? ".zip,.tar"
      : assetType === "PDF"
      ? ".pdf"
      : ".mp4,.mov,.webm";

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="upload-asset-modal-title"
      title="Upload Learning Asset"
      subtitle="Impor paket SCORM (1.2 / 2004), modul e-book PDF, atau video pembelajaran ke Ruang Sosmed Studio"
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept={acceptedExtensions}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 1. Asset Type Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-[#121215] mb-1.5">
            Jenis Berkas Pembelajaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "SCORM", label: "SCORM Package", ext: ".zip", icon: FileArchive },
              { id: "PDF", label: "PDF Document", ext: ".pdf", icon: FileText },
              { id: "Video", label: "Video Asset", ext: ".mp4", icon: Video },
            ].map((tab) => {
              const active = assetType === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAssetType(tab.id as any);
                    setSelectedFile(null);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    active
                      ? "bg-[#4F39F6]/5 border-[#4F39F6] text-[#4F39F6] font-bold ring-1 ring-[#4F39F6]"
                      : "bg-[#FFFFFF] border-[#EAECEF] text-[#5E5E5E] hover:bg-[#F8F9FB]"
                  }`}
                >
                  <Icon size={18} className={active ? "text-[#4F39F6]" : "text-[#9CA3AF]"} />
                  <span className="text-xs mt-1 font-bold">{tab.label}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{tab.ext}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Drag & Drop File Zone */}
        <div>
          <label className="block text-xs font-bold text-[#121215] mb-1.5">
            Pilih Berkas <span className="text-[#EF4444]">*</span>
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D1D5DB] hover:border-[#4F39F6] rounded-2xl p-6 text-center bg-[#F8F9FB] hover:bg-[#FFFFFF] transition-all cursor-pointer space-y-2"
          >
            <div className="h-10 w-10 rounded-full bg-[#FFFFFF] border border-[#EAECEF] text-[#4F39F6] flex items-center justify-center mx-auto shadow-2xs">
              <Upload size={18} />
            </div>
            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#121215]">{selectedFile.name}</p>
                <p className="text-[11px] text-[#059669] font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>
                    Berkas siap diunggah • {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-[#121215]">
                  Klik untuk memilih atau seret berkas ke sini
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  Mendukung berkas {acceptedExtensions} hingga maksimal 100 MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Content Title */}
        <div>
          <label className="block text-xs font-bold text-[#121215] mb-1.5">
            Judul Materi di Katalog
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Modul SCORM Strategi Carousel Viral 2026"
            className="w-full rounded-xl bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
          />
        </div>

        {/* 4. Target Cohort & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#121215] mb-1.5">
              Target Cohort / Project
            </label>
            <select
              value={targetCohort}
              onChange={(e) => setTargetCohort(e.target.value)}
              className="w-full rounded-xl bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
            >
              {(cohortProjects || []).map((cp) => (
                <option key={`${cp.id || "cohort"}-${cp.name}`} value={cp.name}>
                  {cp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#121215] mb-1.5">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
            >
              <option value="Social Media Strategy">Social Media Strategy</option>
              <option value="Content Creation">Content Creation</option>
              <option value="Instagram & Reels">Instagram &amp; Reels</option>
              <option value="Paid Ads & Performance">Paid Ads &amp; Performance</option>
            </select>
          </div>
        </div>

        {/* Progress Bar Simulation when uploading */}
        {isUploading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#4F39F6]">Mengunggah &amp; Memproses Berkas...</span>
              <span className="font-bold text-[#121215]">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
              <div
                className="h-full bg-[#4F39F6] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] border border-[#EAECEF] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] text-white px-5 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <span>Mengimpor ({uploadProgress}%)...</span>
            ) : (
              <>
                <Upload size={13} />
                <span>Impor ke Workspace</span>
              </>
            )}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
