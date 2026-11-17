"use client";

import React from "react";
import type { TextBlock } from "@/types/landing";

interface TextBlockRendererProps {
  block: TextBlock;
}

export function TextBlockRenderer({ block }: TextBlockRendererProps) {
  const heading = block.heading || block.title || (block.data && block.data.heading);
  const content = block.content || (block.data && (block.data.body || block.data.content)) || "Tuliskan penjelasan detail mengenai keunggulan, visi, atau latar belakang produk di sini.";
  const align = block.align || (block.data && block.data.align) || "left";

  const alignClass = align === "center" ? "text-center mx-auto" : align === "right" ? "text-right ml-auto" : "text-left";

  return (
    <div className={`py-6 sm:py-8 max-w-3xl ${alignClass}`}>
      {heading && (
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-3">
          {heading}
        </h2>
      )}
      <div className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line space-y-2">
        {content}
      </div>
    </div>
  );
}
