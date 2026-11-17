"use client";

import React, { useRef, useState } from "react";
import { Upload, X, ZoomIn, Check, Image as ImageIcon } from "lucide-react";
import { Button, Card } from "@/components/ui/SaasUI";

interface ImageUploadProps {
  label: string;
  value?: string;
  aspect?: "16:9" | "1:1";
  onChange: (pngDataUrl: string) => void;
  onClear?: () => void;
}

export function ImageUpload({
  label,
  value,
  aspect = "16:9",
  onChange,
  onClear,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setRawSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text)]">{label}</span>
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold text-[var(--danger-text)] hover:underline cursor-pointer"
          >
            Hapus Gambar
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {value ? (
        <div
          className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] ${
            aspect === "16:9" ? "aspect-video w-full" : "h-28 w-28 mx-auto rounded-full"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-xl bg-black/65 hover:bg-black/80 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xs cursor-pointer"
          >
            <Upload size={12} />
            <span>Ganti</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer ${
            aspect === "16:9" ? "aspect-video w-full" : "h-28 w-28 mx-auto rounded-full"
          }`}
        >
          <ImageIcon size={20} className="text-[var(--muted)]" />
          <span className="text-[11px] font-semibold text-[var(--muted)] text-center px-2">
            Upload {aspect === "16:9" ? "Cover (16:9)" : "Foto (1:1)"}
          </span>
        </button>
      )}

      {rawSrc && (
        <CropModal
          src={rawSrc}
          aspect={aspect}
          onCancel={() => setRawSrc(null)}
          onConfirm={(compressedPng) => {
            onChange(compressedPng);
            setRawSrc(null);
          }}
        />
      )}
    </div>
  );
}

interface CropModalProps {
  src: string;
  aspect: "16:9" | "1:1";
  onCancel: () => void;
  onConfirm: (pngDataUrl: string) => void;
}

export function CropModal({
  src,
  aspect,
  onCancel,
  onConfirm,
}: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const handleCompressAndSave = () => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const targetW = aspect === "16:9" ? 1280 : 512;
      const targetH = aspect === "16:9" ? 720 : 512;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, targetW, targetH);

      const scale =
        Math.max(targetW / img.width, targetH / img.height) * zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = (targetW - drawW) / 2 + (offsetX / 100) * targetW * 0.4;
      const dy = (targetH - drawH) / 2 + (offsetY / 100) * targetH * 0.4;

      ctx.drawImage(img, dx, dy, drawW, drawH);
      const pngDataUrl = canvas.toDataURL("image/png", 0.9);
      onConfirm(pngDataUrl);
    };
    img.src = src;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onCancel}
    >
      <Card
        padded
        className="w-full max-w-lg space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Preview &amp; Kompresi Gambar ({aspect})
            </h3>
            <p className="text-[11px] text-[var(--muted)]">
              Otomatis dikompres ke PNG via HTML5 Canvas.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className={`relative mx-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-black ${
            aspect === "16:9" ? "aspect-video w-full" : "h-56 w-56 rounded-full"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Crop Preview"
            className="h-full w-full object-cover transition-transform"
            style={{
              transform: `scale(${zoom}) translate(${offsetX * 0.4}%, ${offsetY * 0.4}%)`,
            }}
          />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <ZoomIn size={14} className="text-[var(--muted)] shrink-0" />
            <span className="text-xs font-medium text-[var(--muted)] w-14">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={2.4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--muted)] w-10">Geser X</span>
              <input
                type="range"
                min={-50}
                max={50}
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--muted)] w-10">Geser Y</span>
              <input
                type="range"
                min={-50}
                max={50}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCompressAndSave}>
            <Check size={14} />
            <span>Terapkan PNG</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
