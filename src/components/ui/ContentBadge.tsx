"use client";

import React from "react";
import { Folder } from "lucide-react";
import { CONTENT_TYPE_CONFIGS, type ContentType } from "@/lib/design-tokens";
import { type ExplorerItemType } from "@/lib/phase2-data";

interface ContentBadgeProps {
  type: ExplorerItemType;
  size?: "sm" | "md";
  showLabel?: boolean;
  customLabel?: string;
}

export function ContentBadge({
  type,
  size = "sm",
  showLabel = true,
  customLabel,
}: ContentBadgeProps) {
  if (type === "Folder") {
    return (
      <span
        className={`rs-type-tint inline-flex items-center gap-1.5 rounded-md font-medium select-none ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        }`}
        style={{
          backgroundColor: "rgba(100, 116, 139, 0.10)",
          border: "1px solid rgba(100, 116, 139, 0.22)",
          color: "#475569",
        }}
      >
        <Folder
          className="shrink-0"
          size={size === "sm" ? 13 : 14}
          style={{ color: "#64748B" }}
          strokeWidth={2.2}
        />
        {showLabel && <span>{customLabel ?? "Folder"}</span>}
      </span>
    );
  }

  const config = CONTENT_TYPE_CONFIGS[type as ContentType];
  const Icon = config.icon;

  return (
    <span
      className={`rs-type-tint inline-flex items-center gap-1.5 rounded-md font-medium select-none ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        backgroundColor: config.bgTint,
        border: `1px solid ${config.borderTint}`,
        color: config.textTint,
      }}
    >
      <Icon
        className="shrink-0"
        size={size === "sm" ? 13 : 14}
        style={{ color: config.colorHex }}
        strokeWidth={2.2}
      />
      {showLabel && <span>{customLabel ?? config.type}</span>}
    </span>
  );
}

export function ContentIconBox({
  type,
  size = "md",
}: {
  type: ExplorerItemType;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "sm"
      ? "w-6 h-6 rounded-md"
      : size === "md"
      ? "w-7 h-7 rounded-md"
      : "w-9 h-9 rounded-lg";

  const iconSize = size === "sm" ? 13 : size === "md" ? 15 : 18;

  if (type === "Folder") {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${dimensions}`}
        style={{
          backgroundColor: "rgba(100, 116, 139, 0.10)",
          border: "1px solid rgba(100, 116, 139, 0.22)",
        }}
      >
        <Folder
          size={iconSize}
          style={{ color: "#64748B" }}
          strokeWidth={2.2}
        />
      </span>
    );
  }

  const config = CONTENT_TYPE_CONFIGS[type as ContentType];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${dimensions}`}
      style={{
        backgroundColor: config.bgTint,
        border: `1px solid ${config.borderTint}`,
      }}
    >
      <Icon
        size={iconSize}
        style={{ color: config.colorHex }}
        strokeWidth={2.2}
      />
    </span>
  );
}
