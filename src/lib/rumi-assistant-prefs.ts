// =============================================================================
// RUANG SOSMED 2.0 LMS — RUMI FLOATING ASSISTANT PER-USER PREFERENCES
// File: src/lib/rumi-assistant-prefs.ts
// Persists per-user idle timeout, peek-a-boo hiding, size, bubbles, and
// Rumi-delivered notification mode + distinct Rumi notification sound.
// =============================================================================

export type RumiAssistantSize = "sm" | "md" | "lg";

export interface RumiAssistantPrefs {
  enabled: boolean;
  autoHideOnIdle: boolean;
  idleHideSeconds: number;
  autoBubble: boolean;
  notifyViaRumi: boolean;
  size: RumiAssistantSize;
}

export const DEFAULT_RUMI_ASSISTANT_PREFS: RumiAssistantPrefs = {
  enabled: true,
  autoHideOnIdle: true,
  idleHideSeconds: 20,
  autoBubble: true,
  notifyViaRumi: true,
  size: "md",
};

export const RUMI_PREFS_EVENT = "rs_rumi_assistant_prefs_changed";
export const RUMI_DELIVER_NOTIF_EVENT = "rs_rumi_deliver_notification";

export interface RumiDeliveredNotificationPayload {
  id: string;
  role: "learner" | "admin";
  title: string;
  message: string;
  eventType: string;
  createdAt?: string;
  muted?: boolean;
}

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
      notifyViaRumi:
        typeof parsed.notifyViaRumi === "boolean"
          ? parsed.notifyViaRumi
          : DEFAULT_RUMI_ASSISTANT_PREFS.notifyViaRumi,
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
    notifyViaRumi:
      typeof patch.notifyViaRumi === "boolean"
        ? patch.notifyViaRumi
        : current.notifyViaRumi,
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

export function isRumiNotificationModeActive(
  userKey?: string | null
): boolean {
  const prefs = loadRumiAssistantPrefs(userKey);
  return prefs.enabled && prefs.notifyViaRumi;
}

let sharedRumiAudioCtx: AudioContext | null = null;

/**
 * Distinct cheerful mascot chime for Rumi Assistant notifications
 * (bubbly triangle + sine arpeggio), intentionally distinct from the
 * default floating notification chime.
 */
export function playRumiNotificationSound(
  kind: "celebrate" | "standard" = "standard"
): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedRumiAudioCtx || sharedRumiAudioCtx.state === "closed") {
      sharedRumiAudioCtx = new AudioCtx();
    }
    const ctx = sharedRumiAudioCtx;

    const triggerChime = () => {
      try {
        const now = ctx.currentTime;
        const notes =
          kind === "celebrate"
            ? [739.99, 987.77, 1174.66, 1479.98] // F#5 -> B5 -> D6 -> F#6 sparkly mascot chirp
            : [783.99, 1046.5, 1318.51]; // G5 -> C6 -> E6 bouncy mascot pop

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.068;
          osc.type = idx % 2 === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq * 0.94, start);
          osc.frequency.exponentialRampToValueAtTime(freq, start + 0.032);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.065, start + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.19);
        });
      } catch {}
    };

    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => triggerChime())
        .catch(() => {});
    } else {
      triggerChime();
    }
  } catch {}
}
