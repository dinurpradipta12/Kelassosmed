"use client";

import React from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ImageBlock } from "@/types/landing";

interface ImageBlockRendererProps {
  block: ImageBlock;
}

export function ImageBlockRenderer({ block }: ImageBlockRendererProps) {
  const imageUrl = block.imageUrl || (block.data && block.data.imageUrl);
  const caption = block.caption || (block.data && block.data.caption);
  const alt = block.alt || (block.data && block.data.alt) || "Gambar Produk";
  const aspectRatio = block.aspectRatio || (block.data && block.data.aspectRatio) || "video";

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "wide"
      ? "aspect-21/9"
      : aspectRatio === "auto"
      ? "h-auto"
      : "aspect-video";

  return (
    <div className="py-6 sm:py-8 max-w-4xl mx-auto">
      <div className={`relative w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs flex items-center justify-center ${aspectClass}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-slate-200/80 text-slate-500 mx-auto flex items-center justify-center">
              <ImageIcon size={22} />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Placeholder Banner / Galeri Foto
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Masukkan tautan URL foto atau upload gambar di panel pengaturan sisi kanan.
            </p>
          </div>
        )}
      </div>
      {caption && (
        <p className="mt-2 text-center text-xs text-slate-500 italic">
          {caption}
        </p>
      )}
    </div>
  );
}
