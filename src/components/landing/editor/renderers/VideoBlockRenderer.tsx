"use client";

import React from "react";
import { Video, Play } from "lucide-react";
import type { VideoBlock } from "@/types/landing";

interface VideoBlockRendererProps {
  block: VideoBlock;
}

export function VideoBlockRenderer({ block }: VideoBlockRendererProps) {
  const videoUrl = block.videoUrl || (block.data && block.data.videoUrl) || "";
  const title = block.title || (block.data && block.data.title) || "Video Demo & Testimoni";
  const description = block.description || (block.data && block.data.description);

  // Helper to extract youtube ID
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="py-8 sm:py-10 max-w-4xl mx-auto border-t border-slate-100">
      <div className="text-center max-w-xl mx-auto mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p>
        )}
      </div>

      <div className="relative aspect-video rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : videoUrl.endsWith(".mp4") ? (
          <video controls className="w-full h-full object-contain">
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div className="text-center p-6 text-white space-y-3">
            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white backdrop-blur-xs">
              <Play size={24} className="ml-1" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/90">
                {videoUrl ? "Pratinjau Video URL" : "Placeholder Video Demo"}
              </p>
              <p className="text-[11px] text-white/60 mt-1 max-w-xs mx-auto">
                {videoUrl || "Masukkan tautan video YouTube atau MP4 di panel pengaturan sisi kanan."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
