"use client";

import React from "react";
import { Plus } from "lucide-react";
import {
  CONTENT_TYPES_LIST,
  CONTENT_TYPE_CONFIGS,
  type ContentType,
} from "@/lib/design-tokens";

interface QuickCreateStripProps {
  onCreateContent: (type: ContentType) => void;
}

export function QuickCreateStrip({ onCreateContent }: QuickCreateStripProps) {
  return (
    <section aria-label="Quick create learning content" className="mb-6">
      <div className="flex flex-wrap items-center gap-2.5">
        {CONTENT_TYPES_LIST.map((type) => {
          const config = CONTENT_TYPE_CONFIGS[type];
          const Icon = config.icon;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onCreateContent(type)}
              className="group inline-flex items-center gap-2.5 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:border-[#4F39F6]/40 hover:shadow-[0_4px_12px_rgba(79,57,246,0.08)] transition-all cursor-pointer"
            >
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: config.bgTint,
                  border: `1px solid ${config.borderTint}`,
                }}
              >
                <Icon
                  size={14}
                  style={{ color: config.colorHex }}
                  strokeWidth={2.2}
                />
              </span>
              <span>{type}</span>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded text-[#9CA3AF] group-hover:text-[#4F39F6] transition-colors">
                <Plus size={13} strokeWidth={2.4} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
