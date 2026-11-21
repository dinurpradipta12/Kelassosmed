// =============================================================================
// RUANG SOSMED 2.0 LMS — RUMI FLOATING ASSISTANT PER-USER PREFERENCES
// File: src/lib/rumi-assistant-prefs.ts
// Persists per-user idle timeout, peek-a-boo hiding, size, and speech bubbles.
// =============================================================================

export type RumiAssistantSize = "sm" | "md" | "lg";

export interface RumiAssistantPrefs {
  enabled: boolean;
  autoHideOnIdle: boolean;
  idleHideSeconds: number;
  autoBubble: boolean;
  size: RumiAssistantSize;
}

export const DEFAULT_RUMI_ASSISTANT_PREFS: RumiAssistantPrefs = {
  enabled: true,
  autoHideOnIdle: true,
  idleHideSeconds: 20,
  autoBubble: true,
  size: "md",
};

export const RUMI_PREFS_EVENT = "rs_rumi_assistant_prefs_changed";

const STORAGE_PREFIX = "rs_rumi_assistant_prefs_v1::";

function normalizeUserPrefKey(userKey?: string | null): string {
  const clean = String(userKey || "").trim().toLowerCase();
  return clean || "guest";
}

export function clampIdleSeconds(value: number): number {
  const num = Math.trunc(Number(value));
  if (!Number.isFinite(num)) return DEFAULT_RUMI_ASSISTANT_PREFS.idleHideSeconds;
  return Math.max(5, Math.min(300, num));
}

export function loadRumiAssistantPrefs(
  userKey?: string | null
): RumiAssistantPrefs {
  if (typeof window === "undefined") {
    return DEFAULT_RUMI_ASSISTANT_PREFS;
  }
  const key = `${STORAGE_PREFIX}${normalizeUserPrefKey(userKey)}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULT_RUMI_ASSISTANT_PREFS;
    const parsed = JSON.parse(raw) as Partial<RumiAssistantPrefs>;
    const size: RumiAssistantSize =
      parsed.size === "sm" || parsed.size === "lg" ? parsed.size : "md";
    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_RUMI_ASSISTANT_PREFS.enabled,
      autoHideOnIdle:
        typeof parsed.autoHideOnIdle === "boolean"
          ? parsed.autoHideOnIdle
          : DEFAULT_RUMI_ASSISTANT_PREFS.autoHideOnIdle,
      idleHideSeconds:
        parsed.idleHideSeconds !== undefined
          ? clampIdleSeconds(parsed.idleHideSeconds)
          : DEFAULT_RUMI_ASSISTANT_PREFS.idleHideSeconds,
      autoBubble:
        typeof parsed.autoBubble === "boolean"
          ? parsed.autoBubble
          : DEFAULT_RUMI_ASSISTANT_PREFS.autoBubble,
      size,
    };
  } catch {
    return DEFAULT_RUMI_ASSISTANT_PREFS;
  }
}

export function saveRumiAssistantPrefs(
  userKey: string | null | undefined,
  patch: Partial<RumiAssistantPrefs>
): RumiAssistantPrefs {
  const current = loadRumiAssistantPrefs(userKey);
  const next: RumiAssistantPrefs = {
    enabled:
      typeof patch.enabled === "boolean" ? patch.enabled : current.enabled,
    autoHideOnIdle:
      typeof patch.autoHideOnIdle === "boolean"
        ? patch.autoHideOnIdle
        : current.autoHideOnIdle,
    idleHideSeconds:
      patch.idleHideSeconds !== undefined
        ? clampIdleSeconds(patch.idleHideSeconds)
        : current.idleHideSeconds,
    autoBubble:
      typeof patch.autoBubble === "boolean"
        ? patch.autoBubble
        : current.autoBubble,
    size:
      patch.size === "sm" || patch.size === "md" || patch.size === "lg"
        ? patch.size
        : current.size,
  };

  if (typeof window !== "undefined") {
    const normKey = normalizeUserPrefKey(userKey);
    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${normKey}`,
        JSON.stringify(next)
      );
      window.dispatchEvent(
        new CustomEvent(RUMI_PREFS_EVENT, {
          detail: { userKey: normKey, prefs: next },
        })
      );
    } catch {}
  }

  return next;
}
