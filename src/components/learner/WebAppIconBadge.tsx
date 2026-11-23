"use client";

import React from "react";
import {
  Sparkles,
  BarChart3,
  CalendarDays,
  Calculator,
  FileText,
  Palette,
  Video,
  Globe,
  Wand2,
  Rocket,
  Bot,
  Layers,
} from "lucide-react";
import type { WebAppIconPreset } from "@/types/webapp";

export const WEBAPP_ICON_OPTIONS: {
  id: WebAppIconPreset;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "sparkles", label: "AI / Sparkles", Icon: Sparkles },
  { id: "chart", label: "Analytics", Icon: BarChart3 },
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "calculator", label: "Calculator", Icon: Calculator },
  { id: "file", label: "Template", Icon: FileText },
  { id: "palette", label: "Design", Icon: Palette },
  { id: "video", label: "Video", Icon: Video },
  { id: "globe", label: "Web App", Icon: Globe },
  { id: "wand", label: "Generator", Icon: Wand2 },
  { id: "rocket", label: "Growth", Icon: Rocket },
  { id: "bot", label: "Assistant", Icon: Bot },
  { id: "layers", label: "Toolkit", Icon: Layers },
];

export const WEBAPP_ACCENT_COLORS = [
  "#4F39F6",
  "#0284C7",
  "#059669",
  "#D97706",
  "#E11D48",
  "#7C3AED",
] as const;

export function WebAppIconBadge({
  iconUrl,
  iconPreset,
  accentColor,
  name,
  size = "md",
}: {
  iconUrl?: string | null;
  iconPreset?: WebAppIconPreset;
  accentColor?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const cleanAccent =
    accentColor && /^#[0-9a-fA-F]{3,8}$/.test(accentColor.trim())
      ? accentColor.trim()
      : "#4F39F6";

  const presetEntry =
    WEBAPP_ICON_OPTIONS.find((item) => item.id === iconPreset) ||
    WEBAPP_ICON_OPTIONS[0];
  const IconComp = presetEntry.Icon;

  const boxSizeClass =
    size === "sm"
      ? "h-10 w-10 rounded-xl"
      : size === "lg"
      ? "h-14 w-14 rounded-2xl"
      : "h-13 w-13 rounded-2xl";

  const iconPx = size === "sm" ? 18 : size === "lg" ? 26 : 22;

  if (iconUrl && iconUrl.trim()) {
    return (
      <div
        className={`${boxSizeClass} shrink-0 overflow-hidden border border-[#EAECEF] bg-[#F8F9FB] flex items-center justify-center shadow-xs`}
      >
        <img
          src={iconUrl}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${boxSizeClass} shrink-0 flex items-center justify-center border shadow-xs`}
      style={{
        backgroundColor: `${cleanAccent}14`,
        borderColor: `${cleanAccent}33`,
        color: cleanAccent,
      }}
    >
      <IconComp size={iconPx} />
    </div>
  );
}
