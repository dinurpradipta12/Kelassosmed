// =============================================================================
// RUANG SOSMED 2.0 LMS — SUPABASE CONFIGURATION & KEY NORMALIZATION HELPERS
// File: src/lib/supabase/config.ts
// Guards against stale/retired Supabase project refs or mismatched anon keys
// across build-time vs runtime environments.
// =============================================================================

export const DEFAULT_SUPABASE_URL = "https://wdmfxlrdyqxnycbebwpv.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbWZ4bHJkeXF4bnljYmVid3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MDQ2MTUsImV4cCI6MjExMDk4MDYxNX0.W4EI9H2NtL3oxYDCWFXUnWqAFxqgsmUfJo5ptVXWCPQ";

export const RETIRED_SUPABASE_PROJECT_REFS = new Set<string>([
  "nigxfryaobokkvfefond",
]);

/**
 * Extracts `<ref>` from a `https://<ref>.supabase.co` URL, or `null` otherwise.
 */
export function extractSupabaseUrlRef(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const match = /^([a-z0-9-]+)\.supabase\.co$/i.exec(parsed.hostname);
    return match?.[1]?.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Safely decodes the middle JWT payload segment (`{ ref, role }`) without
 * verifying cryptographic signature, working in both browser and server runtimes.
 */
export function extractSupabaseJwtPayload(
  token: string
): { ref?: string; role?: string } | null {
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3 || !parts[1]) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    let jsonStr: string;
    if (typeof atob === "function") {
      jsonStr = atob(padded);
    } else if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;

    const result: { ref?: string; role?: string } = {};
    if (typeof parsed.ref === "string") {
      result.ref = parsed.ref.toLowerCase();
    }
    if (typeof parsed.role === "string") {
      result.role = parsed.role.toLowerCase();
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Returns true if the URL is non-empty, not a placeholder, and not on a retired project.
 */
export function isUsableSupabaseUrl(raw?: string | null): boolean {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed.includes("your-project-ref")) {
    return false;
  }
  const ref = extractSupabaseUrlRef(trimmed);
  if (ref && RETIRED_SUPABASE_PROJECT_REFS.has(ref)) {
    return false;
  }
  return true;
}

/**
 * Resolves the first usable Supabase base URL from candidates, falling back to DEFAULT_SUPABASE_URL.
 */
export function resolveActiveSupabaseUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (isUsableSupabaseUrl(candidate)) {
      return (candidate || "").trim().replace(/\/+$/, "");
    }
  }
  return DEFAULT_SUPABASE_URL;
}

/**
 * Validates that an anon key is non-placeholder, not from a retired project,
 * and matches the active Supabase project ref if both are inspectable.
 */
export function isUsableSupabaseAnonKey(
  raw: string | null | undefined,
  activeUrl: string
): boolean {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed.includes("placeholder")) {
    return false;
  }

  const payload = extractSupabaseJwtPayload(trimmed);
  if (payload?.ref) {
    if (RETIRED_SUPABASE_PROJECT_REFS.has(payload.ref)) {
      return false;
    }
    const activeRef = extractSupabaseUrlRef(activeUrl);
    if (activeRef && payload.ref !== activeRef) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves the matching Supabase anon key for `activeUrl`, falling back to
 * DEFAULT_SUPABASE_ANON_KEY when targeting the default project.
 */
export function resolveActiveSupabaseAnonKey(
  activeUrl: string,
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (isUsableSupabaseAnonKey(candidate, activeUrl)) {
      return (candidate || "").trim();
    }
  }

  const activeRef = extractSupabaseUrlRef(activeUrl);
  const defaultRef = extractSupabaseUrlRef(DEFAULT_SUPABASE_URL);
  if (
    activeUrl.replace(/\/+$/, "") === DEFAULT_SUPABASE_URL ||
    (activeRef && defaultRef && activeRef === defaultRef)
  ) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }

  return "";
}
