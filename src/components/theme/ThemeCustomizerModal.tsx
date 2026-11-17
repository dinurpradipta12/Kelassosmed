"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

export type ThemePresetId =
  | "light"
  | "dark"
  | "warm"
  | "green"
  | "pink"
  | "purple"
  | "blue"
  | "custom";

export interface AppThemeConfig {
  presetId: ThemePresetId;
  mode: "light" | "dark";
  canvasBg: string;
  surfaceBg: string;
  surfaceSoftBg: string;
  surfaceMutedBg: string;
  surfaceHoverBg: string;
  borderColor: string;
  textColor: string;
  textSecondaryColor: string;
  textMutedColor: string;
  accentColor: string;
  buttonBg: string;
  customHue: number;
  customAccentHue: number;
  customButtonHue: number;
}

const THEME_STORAGE_KEY = "ruang_sosmed_theme_config_v1";
const THEME_EVENT_NAME = "ruang-sosmed-theme-updated";

export const THEME_PRESETS: Record<
  Exclude<ThemePresetId, "custom">,
  {
    label: string;
    subtitle: string;
    swatch: string;
    config: Omit<
      AppThemeConfig,
      "customHue" | "customAccentHue" | "customButtonHue"
    >;
  }
> = {
  light: {
    label: "Light Default",
    subtitle: "Bersih & minimalis",
    swatch: "#F8F9FB",
    config: {
      presetId: "light",
      mode: "light",
      canvasBg: "#F8F9FB",
      surfaceBg: "#FFFFFF",
      surfaceSoftBg: "#F9FAFB",
      surfaceMutedBg: "#F1F5F9",
      surfaceHoverBg: "#EEF2F6",
      borderColor: "#EAECEF",
      textColor: "#121215",
      textSecondaryColor: "#5E5E5E",
      textMutedColor: "#9CA3AF",
      accentColor: "#4F39F6",
      buttonBg: "#4F39F6",
    },
  },
  dark: {
    label: "Aura Dark",
    subtitle: "Gelap elegan & fokus",
    swatch: "#161B26",
    config: {
      presetId: "dark",
      mode: "dark",
      canvasBg: "#0E1117",
      surfaceBg: "#161B26",
      surfaceSoftBg: "#1B2230",
      surfaceMutedBg: "#21293A",
      surfaceHoverBg: "#263044",
      borderColor: "#2A3449",
      textColor: "#F1F5F9",
      textSecondaryColor: "#CBD5E1",
      textMutedColor: "#94A3B8",
      accentColor: "#60A5FA",
      buttonBg: "#3B82F6",
    },
  },
  warm: {
    label: "Warm Pastel",
    subtitle: "Krem & persik lembut",
    swatch: "#F5DFD0",
    config: {
      presetId: "warm",
      mode: "light",
      canvasBg: "#FAF3EC",
      surfaceBg: "#FFFDF9",
      surfaceSoftBg: "#F5ECE2",
      surfaceMutedBg: "#EFE2D4",
      surfaceHoverBg: "#EAE0D5",
      borderColor: "#E5D5C4",
      textColor: "#2B211B",
      textSecondaryColor: "#6B5649",
      textMutedColor: "#9C8577",
      accentColor: "#B86248",
      buttonBg: "#C76E53",
    },
  },
  green: {
    label: "Sage Green",
    subtitle: "Hijau sage pastel sejuk",
    swatch: "#D7EAE0",
    config: {
      presetId: "green",
      mode: "light",
      canvasBg: "#EFF6F2",
      surfaceBg: "#FAFCFB",
      surfaceSoftBg: "#E6F1EB",
      surfaceMutedBg: "#DBEADF",
      surfaceHoverBg: "#D4E4DA",
      borderColor: "#CCE0D4",
      textColor: "#17261F",
      textSecondaryColor: "#476356",
      textMutedColor: "#789588",
      accentColor: "#3D846B",
      buttonBg: "#448E73",
    },
  },
  pink: {
    label: "Blush Pink",
    subtitle: "Merah muda pastel halus",
    swatch: "#F3D9E4",
    config: {
      presetId: "pink",
      mode: "light",
      canvasBg: "#FAF1F5",
      surfaceBg: "#FFFBFD",
      surfaceSoftBg: "#F5E7EE",
      surfaceMutedBg: "#EEDCE5",
      surfaceHoverBg: "#E9D2DD",
      borderColor: "#E5CDD8",
      textColor: "#2C1822",
      textSecondaryColor: "#6D495A",
      textMutedColor: "#9E788A",
      accentColor: "#B85A82",
      buttonBg: "#C4638B",
    },
  },
  purple: {
    label: "Lavender",
    subtitle: "Ungu pastel tenang",
    swatch: "#E2DAF4",
    config: {
      presetId: "purple",
      mode: "light",
      canvasBg: "#F4F1FA",
      surfaceBg: "#FCFAFF",
      surfaceSoftBg: "#ECE7F7",
      surfaceMutedBg: "#E3DCF3",
      surfaceHoverBg: "#DCD4EF",
      borderColor: "#D8CEF0",
      textColor: "#201930",
      textSecondaryColor: "#584D70",
      textMutedColor: "#8A7FA3",
      accentColor: "#7358B8",
      buttonBg: "#7D62C2",
    },
  },
  blue: {
    label: "Powder Blue",
    subtitle: "Biru langit pastel lembut",
    swatch: "#D8E8F8",
    config: {
      presetId: "blue",
      mode: "light",
      canvasBg: "#EFF5FB",
      surfaceBg: "#FAFCFF",
      surfaceSoftBg: "#E6EFF9",
      surfaceMutedBg: "#DCE7F5",
      surfaceHoverBg: "#D3E0F1",
      borderColor: "#CCDEF3",
      textColor: "#162233",
      textSecondaryColor: "#485E78",
      textMutedColor: "#7C91AA",
      accentColor: "#4473B2",
      buttonBg: "#4B7CBE",
    },
  },
};

export const DEFAULT_THEME_CONFIG: AppThemeConfig = {
  ...THEME_PRESETS.light.config,
  customHue: 225,
  customAccentHue: 250,
  customButtonHue: 250,
};

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function getContrastTextColor(hex: string): "#FFFFFF" | "#121215" {
  const clean = (hex || "#4F39F6").replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  // Relative perceptual luminance (WCAG-style sRGB threshold)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#121215" : "#FFFFFF";
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || "#4F39F6").replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) || 79;
  const g = parseInt(full.slice(2, 4), 16) || 57;
  const b = parseInt(full.slice(4, 6), 16) || 246;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildCustomPaletteFromHues(
  baseMode: "light" | "dark",
  canvasHue: number,
  accentColor: string,
  buttonBg: string,
  customAccentHue: number,
  customButtonHue: number
): AppThemeConfig {
  if (baseMode === "dark") {
    return {
      presetId: "custom",
      mode: "dark",
      canvasBg: hslToHex(canvasHue, 24, 9),
      surfaceBg: hslToHex(canvasHue, 24, 13),
      surfaceSoftBg: hslToHex(canvasHue, 24, 16),
      surfaceMutedBg: hslToHex(canvasHue, 24, 20),
      surfaceHoverBg: hslToHex(canvasHue, 24, 23),
      borderColor: hslToHex(canvasHue, 22, 24),
      textColor: "#F1F5F9",
      textSecondaryColor: "#CBD5E1",
      textMutedColor: "#94A3B8",
      accentColor,
      buttonBg,
      customHue: canvasHue,
      customAccentHue,
      customButtonHue,
    };
  }

  return {
    presetId: "custom",
    mode: "light",
    canvasBg: hslToHex(canvasHue, 42, 95),
    surfaceBg: hslToHex(canvasHue, 45, 99),
    surfaceSoftBg: hslToHex(canvasHue, 36, 92),
    surfaceMutedBg: hslToHex(canvasHue, 34, 89),
    surfaceHoverBg: hslToHex(canvasHue, 34, 86),
    borderColor: hslToHex(canvasHue, 30, 84),
    textColor: hslToHex(canvasHue, 28, 14),
    textSecondaryColor: hslToHex(canvasHue, 18, 36),
    textMutedColor: hslToHex(canvasHue, 14, 54),
    accentColor,
    buttonBg,
    customHue: canvasHue,
    customAccentHue,
    customButtonHue,
  };
}

export function applyThemeToDocument(config: AppThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (config.presetId === "light") {
    root.removeAttribute("data-theme");
    root.removeAttribute("data-theme-active");
    root.removeAttribute("data-theme-mode");
    root.style.colorScheme = "light";
  } else {
    root.setAttribute("data-theme", config.mode);
    root.setAttribute("data-theme-active", "true");
    root.setAttribute("data-theme-mode", config.mode);
    root.style.colorScheme = config.mode;
  }

  const buttonText = getContrastTextColor(config.buttonBg);
  const accentText = getContrastTextColor(config.accentColor);

  root.style.setProperty("--theme-canvas", config.canvasBg);
  root.style.setProperty("--theme-surface", config.surfaceBg);
  root.style.setProperty("--theme-surface-soft", config.surfaceSoftBg);
  root.style.setProperty("--theme-surface-muted", config.surfaceMutedBg);
  root.style.setProperty("--theme-surface-hover", config.surfaceHoverBg);
  root.style.setProperty("--theme-border", config.borderColor);
  root.style.setProperty("--theme-text", config.textColor);
  root.style.setProperty("--theme-text-secondary", config.textSecondaryColor);
  root.style.setProperty("--theme-text-muted", config.textMutedColor);
  const isVeryLightAccentInDark =
    config.mode === "dark" && getContrastTextColor(config.accentColor) === "#121215";
  const resolvedAccentSoft = isVeryLightAccentInDark
    ? "rgba(59, 130, 246, 0.14)"
    : hexToRgba(config.accentColor, config.mode === "dark" ? 0.14 : 0.12);

  root.style.setProperty("--theme-accent", config.accentColor);
  root.style.setProperty("--theme-accent-soft", resolvedAccentSoft);
  root.style.setProperty("--theme-accent-contrast", accentText);
  root.style.setProperty("--theme-button-bg", config.buttonBg);
  root.style.setProperty("--theme-button-hover", hexToRgba(config.buttonBg, 0.88));
  root.style.setProperty("--theme-button-text", buttonText);

  root.style.setProperty("--bg-canvas", config.canvasBg);
  root.style.setProperty("--bg-card", config.surfaceBg);
  root.style.setProperty("--bg-secondary-sidebar", config.surfaceSoftBg);
  root.style.setProperty("--border-hairline", config.borderColor);
  root.style.setProperty("--text-primary", config.textColor);
  root.style.setProperty("--text-secondary", config.textSecondaryColor);
  root.style.setProperty("--text-muted", config.textMutedColor);
  root.style.setProperty("--color-primary", config.buttonBg);
}

export function loadSavedThemeConfig(): AppThemeConfig {
  if (typeof window === "undefined") return DEFAULT_THEME_CONFIG;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_CONFIG;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.presetId) {
      return {
        ...DEFAULT_THEME_CONFIG,
        ...parsed,
      };
    }
  } catch {}
  return DEFAULT_THEME_CONFIG;
}

interface ThemeCustomizerModalProps {
  open: boolean;
  committedConfig: AppThemeConfig;
  onSave: (config: AppThemeConfig) => void;
  onCancel: () => void;
}

const SOFT_PASTEL_ACCENTS = [
  "#4F39F6",
  "#3B82F6",
  "#448E73",
  "#C4638B",
  "#C76E53",
  "#7D62C2",
  "#5B8DEF",
  "#639A88",
];

export function ThemeCustomizerModal({
  open,
  committedConfig,
  onSave,
  onCancel,
}: ThemeCustomizerModalProps) {
  const [draft, setDraft] = useState<AppThemeConfig>(committedConfig);

  useEffect(() => {
    if (open) {
      setDraft(committedConfig);
    }
  }, [open, committedConfig]);

  const updateDraftAndPreview = (next: AppThemeConfig) => {
    setDraft(next);
    applyThemeToDocument(next);
  };

  const handleSelectPreset = (presetId: Exclude<ThemePresetId, "custom">) => {
    const preset = THEME_PRESETS[presetId];
    const next: AppThemeConfig = {
      ...draft,
      ...preset.config,
    };
    updateDraftAndPreview(next);
  };

  const handleOpenCustomTab = () => {
    if (draft.presetId === "custom") return;
    const accent = hslToHex(draft.customAccentHue, 58, draft.mode === "dark" ? 65 : 52);
    const btn = hslToHex(draft.customButtonHue, 58, draft.mode === "dark" ? 58 : 50);
    updateDraftAndPreview(
      buildCustomPaletteFromHues(
        draft.mode,
        draft.customHue,
        accent,
        btn,
        draft.customAccentHue,
        draft.customButtonHue
      )
    );
  };

  const buttonTextPreview = useMemo(
    () => getContrastTextColor(draft.buttonBg),
    [draft.buttonBg]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-customizer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden page-transition-enter"
        style={{
          backgroundColor: draft.surfaceBg,
          borderColor: draft.borderColor,
          color: draft.textColor,
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: draft.borderColor }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                backgroundColor: hexToRgba(draft.accentColor, 0.14),
                color: draft.accentColor,
              }}
            >
              <Palette size={18} />
            </span>
            <div>
              <h2
                id="theme-customizer-title"
                className="text-sm font-bold"
                style={{ color: draft.textColor }}
              >
                Tema &amp; Palet Tampilan
              </h2>
              <p
                className="text-[11px]"
                style={{ color: draft.textSecondaryColor }}
              >
                Tampilan langsung berubah sebagai pratinjau. Klik{" "}
                <strong>Simpan Tema</strong> untuk menerapkan permanen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup modal tema"
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer"
            style={{
              borderColor: draft.borderColor,
              backgroundColor: draft.surfaceSoftBg,
              color: draft.textSecondaryColor,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto scrollable-region">
          {/* 1. Preset Themes (Light, Aura Dark, 5 Soft Pastels, + Custom) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: draft.textSecondaryColor }}
              >
                Pilih Tema Soft Pastel &amp; Dark
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ color: draft.accentColor }}
              >
                Live Preview Aktif
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(
                Object.keys(THEME_PRESETS) as Exclude<ThemePresetId, "custom">[]
              ).map((id) => {
                const preset = THEME_PRESETS[id];
                const isSelected = draft.presetId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectPreset(id)}
                    className="group relative flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor: isSelected
                        ? hexToRgba(preset.config.accentColor, 0.12)
                        : draft.surfaceSoftBg,
                      borderColor: isSelected
                        ? preset.config.accentColor
                        : draft.borderColor,
                    }}
                  >
                    {/* Mini UI Swatch Preview */}
                    <div
                      className="h-10 w-full rounded-lg border p-1.5 flex items-center justify-between"
                      style={{
                        backgroundColor: preset.config.canvasBg,
                        borderColor: preset.config.borderColor,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="h-6 w-2 rounded-xs"
                          style={{ backgroundColor: preset.config.surfaceBg }}
                        />
                        <div className="space-y-1">
                          <span
                            className="block h-1.5 w-8 rounded-full"
                            style={{ backgroundColor: preset.config.textColor }}
                          />
                          <span
                            className="block h-1.5 w-5 rounded-full opacity-55"
                            style={{
                              backgroundColor: preset.config.textSecondaryColor,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="h-3.5 w-6 rounded-sm"
                        style={{ backgroundColor: preset.config.buttonBg }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <p
                          className="text-xs font-bold truncate"
                          style={{ color: draft.textColor }}
                        >
                          {preset.label}
                        </p>
                        <p
                          className="text-[10px] truncate"
                          style={{ color: draft.textMutedColor }}
                        >
                          {preset.subtitle}
                        </p>
                      </div>
                      {isSelected && (
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: preset.config.buttonBg,
                            color: getContrastTextColor(preset.config.buttonBg),
                          }}
                        >
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* 8th Tile: Custom Color Picker */}
              <button
                type="button"
                onClick={handleOpenCustomTab}
                className="group relative flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer"
                style={{
                  backgroundColor:
                    draft.presetId === "custom"
                      ? hexToRgba(draft.accentColor, 0.12)
                      : draft.surfaceSoftBg,
                  borderColor:
                    draft.presetId === "custom"
                      ? draft.accentColor
                      : draft.borderColor,
                }}
              >
                <div
                  className="h-10 w-full rounded-lg border flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #F5DFD0 0%, #D7EAE0 33%, #D8E8F8 66%, #E2DAF4 100%)",
                    borderColor: draft.borderColor,
                  }}
                >
                  <Sparkles size={16} className="text-[#121215]" />
                </div>

                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p
                      className="text-xs font-bold truncate"
                      style={{ color: draft.textColor }}
                    >
                      Custom Color
                    </p>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: draft.textMutedColor }}
                    >
                      Palet &amp; tombol bebas
                    </p>
                  </div>
                  {draft.presetId === "custom" && (
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: draft.buttonBg,
                        color: buttonTextPreview,
                      }}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* 2. Custom Color Sliders (Always accessible for Accent / Button customization, full canvas slider when Custom) */}
          <div
            className="rounded-xl border p-4 space-y-4"
            style={{
              backgroundColor: draft.surfaceSoftBg,
              borderColor: draft.borderColor,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className="text-xs font-bold"
                style={{ color: draft.textColor }}
              >
                Kustomisasi Palet Geser, Accent &amp; Warna Tombol
              </span>

              {/* Light Soft Pastel vs Dark Aura Base Mode Toggle */}
              <div
                className="inline-flex rounded-lg border p-0.5"
                style={{
                  backgroundColor: draft.surfaceBg,
                  borderColor: draft.borderColor,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    updateDraftAndPreview(
                      buildCustomPaletteFromHues(
                        "light",
                        draft.customHue,
                        draft.accentColor,
                        draft.buttonBg,
                        draft.customAccentHue,
                        draft.customButtonHue
                      )
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                  style={
                    draft.mode === "light"
                      ? {
                          backgroundColor: draft.buttonBg,
                          color: buttonTextPreview,
                        }
                      : { color: draft.textSecondaryColor }
                  }
                >
                  <Sun size={11} />
                  <span>Soft Pastel</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateDraftAndPreview(
                      buildCustomPaletteFromHues(
                        "dark",
                        draft.customHue,
                        draft.accentColor,
                        draft.buttonBg,
                        draft.customAccentHue,
                        draft.customButtonHue
                      )
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                  style={
                    draft.mode === "dark"
                      ? {
                          backgroundColor: draft.buttonBg,
                          color: buttonTextPreview,
                        }
                      : { color: draft.textSecondaryColor }
                  }
                >
                  <Moon size={11} />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Canvas Pastel Hue Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-semibold"
                  style={{ color: draft.textSecondaryColor }}
                >
                  Geser Warna Latar (Background Pastel / Dark Tint)
                </span>
                <span
                  className="font-mono text-[11px] px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: draft.surfaceBg,
                    borderColor: draft.borderColor,
                    color: draft.textColor,
                  }}
                >
                  {draft.canvasBg}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={draft.customHue}
                onChange={(e) => {
                  const hue = Number(e.target.value);
                  updateDraftAndPreview(
                    buildCustomPaletteFromHues(
                      draft.mode,
                      hue,
                      draft.accentColor,
                      draft.buttonBg,
                      draft.customAccentHue,
                      draft.customButtonHue
                    )
                  );
                }}
                aria-label="Geser hue background"
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background:
                    draft.mode === "dark"
                      ? "linear-gradient(to right, #1b1316, #1b1a13, #131b15, #131b1b, #131622, #1b1320, #1b1316)"
                      : "linear-gradient(to right, #f9ebec, #f9f4eb, #ecf7ee, #ebf7f7, #ecf1fa, #f6ecfa, #f9ebec)",
                }}
              />
            </div>

            {/* Accent Color Slider + Swatches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-semibold"
                  style={{ color: draft.textSecondaryColor }}
                >
                  Accent Color (Highlight, Badge &amp; Border Aktif)
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={draft.accentColor}
                    onChange={(e) =>
                      updateDraftAndPreview({
                        ...draft,
                        presetId: "custom",
                        accentColor: e.target.value.toUpperCase(),
                      })
                    }
                    className="h-6 w-7 rounded border cursor-pointer bg-transparent"
                    style={{ borderColor: draft.borderColor }}
                  />
                  <span
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: draft.surfaceBg,
                      borderColor: draft.borderColor,
                      color: draft.textColor,
                    }}
                  >
                    {draft.accentColor}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={draft.customAccentHue}
                onChange={(e) => {
                  const hue = Number(e.target.value);
                  const hex = hslToHex(
                    hue,
                    58,
                    draft.mode === "dark" ? 66 : 52
                  );
                  updateDraftAndPreview({
                    ...draft,
                    presetId: "custom",
                    customAccentHue: hue,
                    accentColor: hex,
                  });
                }}
                aria-label="Geser hue accent color"
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background:
                    "linear-gradient(to right, #e07a7a, #e0b97a, #7ac98f, #7ac5d8, #7a8de0, #be7ae0, #e07a9c)",
                }}
              />
            </div>

            {/* Button Color Slider + Swatches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-semibold"
                  style={{ color: draft.textSecondaryColor }}
                >
                  Button Color (Tombol Utama &amp; CTA)
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={draft.buttonBg}
                    onChange={(e) =>
                      updateDraftAndPreview({
                        ...draft,
                        presetId: "custom",
                        buttonBg: e.target.value.toUpperCase(),
                      })
                    }
                    className="h-6 w-7 rounded border cursor-pointer bg-transparent"
                    style={{ borderColor: draft.borderColor }}
                  />
                  <span
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: draft.surfaceBg,
                      borderColor: draft.borderColor,
                      color: draft.textColor,
                    }}
                  >
                    {draft.buttonBg}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={draft.customButtonHue}
                onChange={(e) => {
                  const hue = Number(e.target.value);
                  const hex = hslToHex(
                    hue,
                    58,
                    draft.mode === "dark" ? 58 : 48
                  );
                  updateDraftAndPreview({
                    ...draft,
                    presetId: "custom",
                    customButtonHue: hue,
                    buttonBg: hex,
                  });
                }}
                aria-label="Geser hue button color"
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background:
                    "linear-gradient(to right, #d96b6b, #d9a45b, #5bb87d, #5ba8c9, #5b74d9, #a45bd9, #d95b8f)",
                }}
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {SOFT_PASTEL_ACCENTS.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() =>
                      updateDraftAndPreview({
                        ...draft,
                        presetId: "custom",
                        accentColor: sw,
                        buttonBg: sw,
                      })
                    }
                    title={`Pakai ${sw} untuk Accent & Button`}
                    className="h-5 w-5 rounded-full border transition-transform hover:scale-110 cursor-pointer"
                    style={{
                      backgroundColor: sw,
                      borderColor:
                        draft.buttonBg === sw ? draft.textColor : "transparent",
                    }}
                  />
                ))}
                <span
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-2xs"
                  style={{
                    backgroundColor: draft.buttonBg,
                    color: buttonTextPreview,
                  }}
                >
                  <span>Contoh Tombol</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t"
          style={{
            backgroundColor: draft.surfaceSoftBg,
            borderColor: draft.borderColor,
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectPreset("light")}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: draft.surfaceBg,
              borderColor: draft.borderColor,
              color: draft.textSecondaryColor,
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: draft.surfaceBg,
                borderColor: draft.borderColor,
                color: draft.textSecondaryColor,
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-opacity hover:opacity-95 cursor-pointer"
              style={{
                backgroundColor: draft.buttonBg,
                color: buttonTextPreview,
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Simpan Tema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThemeSwitchDockButtonProps {
  tooltipOffsetClass?: string;
  sizeClass?: string;
}

export function ThemeSwitchDockButton({
  tooltipOffsetClass = "left-[44px]",
  sizeClass = "h-8 w-8",
}: ThemeSwitchDockButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [committedConfig, setCommittedConfig] = useState<AppThemeConfig>(
    DEFAULT_THEME_CONFIG
  );

  useEffect(() => {
    const saved = loadSavedThemeConfig();
    setCommittedConfig(saved);
    applyThemeToDocument(saved);

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<AppThemeConfig>).detail;
      if (detail) {
        setCommittedConfig(detail);
      } else {
        setCommittedConfig(loadSavedThemeConfig());
      }
    };
    window.addEventListener(THEME_EVENT_NAME, handleSync);
    return () => window.removeEventListener(THEME_EVENT_NAME, handleSync);
  }, []);

  const handleSave = (next: AppThemeConfig) => {
    setCommittedConfig(next);
    applyThemeToDocument(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent<AppThemeConfig>(THEME_EVENT_NAME, { detail: next })
        );
      } catch {}
    }
    setModalOpen(false);
  };

  const handleCancel = () => {
    applyThemeToDocument(committedConfig);
    setModalOpen(false);
  };

  const isDark = committedConfig.mode === "dark";

  return (
    <>
      <div className="relative group flex items-center justify-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Ganti Tema & Mode Tampilan"
          className={`relative flex ${sizeClass} items-center justify-center rounded-lg transition-colors cursor-pointer text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215]`}
        >
          {isDark ? (
            <Moon size={17} strokeWidth={2} />
          ) : committedConfig.presetId === "light" ? (
            <Sun size={17} strokeWidth={2} />
          ) : (
            <Palette size={17} strokeWidth={2} />
          )}
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white"
            style={{ backgroundColor: committedConfig.buttonBg }}
          />
        </button>

        <div
          role="tooltip"
          className={`pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 absolute ${tooltipOffsetClass} z-50 whitespace-nowrap rounded-md bg-[#121215] px-2.5 py-1.5 text-xs font-medium text-white shadow-md`}
        >
          Tema &amp; Mode Tampilan
        </div>
      </div>

      <ThemeCustomizerModal
        open={modalOpen}
        committedConfig={committedConfig}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </>
  );
}
