// =============================================================================
// RUANG SOSMED 2.0 LMS — TOOLS YOU NEED (LEARNER WEB APPS) TYPES & HELPERS
// File: src/types/webapp.ts
// =============================================================================

export type WebAppAccessMode = "free" | "pro" | "paid";

export type WebAppIconPreset =
  | "sparkles"
  | "chart"
  | "calendar"
  | "calculator"
  | "file"
  | "palette"
  | "video"
  | "globe"
  | "wand"
  | "rocket"
  | "bot"
  | "layers";

export interface LearnerWebApp {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string | null;
  iconUrl: string | null;
  iconPreset: WebAppIconPreset;
  accentColor: string;
  accessMode: WebAppAccessMode;
  priceIdr: number;
  pointsCost: number;
  isActive: boolean;
  sortOrder: number;
  hasAccess: boolean;
  isUnlocked: boolean;
  hasPendingRequest: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ALLOWED_ICON_PRESETS = new Set<WebAppIconPreset>([
  "sparkles",
  "chart",
  "calendar",
  "calculator",
  "file",
  "palette",
  "video",
  "globe",
  "wand",
  "rocket",
  "bot",
  "layers",
]);

export function buildWebAppUnlockKey(appId: string): string {
  return `webapp::${(appId || "").trim().toLowerCase()}`;
}

export function isSafeHttpUrl(url?: string | null): boolean {
  const raw = (url || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function mapRpcWebAppRow(row: Record<string, unknown>): LearnerWebApp {
  const rawMode = String(row.access_mode || "free").toLowerCase();
  const accessMode: WebAppAccessMode =
    rawMode === "pro" || rawMode === "paid" ? rawMode : "free";

  const rawPreset = String(row.icon_preset || "sparkles").toLowerCase() as WebAppIconPreset;
  const iconPreset: WebAppIconPreset = ALLOWED_ICON_PRESETS.has(rawPreset)
    ? rawPreset
    : "sparkles";

  const rawUrl = typeof row.url === "string" && row.url.trim() ? row.url.trim() : null;
  const hasAccess =
    typeof row.has_access === "boolean"
      ? row.has_access
      : Boolean(rawUrl);

  return {
    id: String(row.id || ""),
    name: String(row.name || "Web App"),
    description: String(row.description || ""),
    category: String(row.category || "Tools"),
    url: hasAccess ? rawUrl : null,
    iconUrl:
      typeof row.icon_url === "string" && row.icon_url.trim()
        ? row.icon_url.trim()
        : null,
    iconPreset,
    accentColor:
      typeof row.accent_color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(row.accent_color.trim())
        ? row.accent_color.trim()
        : "#4F39F6",
    accessMode,
    priceIdr: Math.max(0, Math.round(Number(row.price_idr) || 0)),
    pointsCost: Math.max(0, Math.round(Number(row.points_cost) || 0)),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order) || 0,
    hasAccess,
    isUnlocked: Boolean(row.is_unlocked),
    hasPendingRequest: Boolean(row.has_pending_request),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}
