// =============================================================================
// RUANG SOSMED 2.0 LMS — RUMI FLOATING ASSISTANT PER-USER PREFERENCES
// File: src/lib/rumi-assistant-prefs.ts
// Persists per-user idle timeout, peek-a-boo hiding, size, bubbles, and
// Rumi-delivered notification mode + distinct Rumi notification sound.
// =============================================================================

export type RumiAssistantSize = "sm" | "md" | "lg";
export type RumiAssistantPosition =
  | "bottom-right"
  | "top-right"
  | "top-center"
  | "top-left";

export interface RumiAssistantPrefs {
  enabled: boolean;
  autoHideOnIdle: boolean;
  idleHideSeconds: number;
  autoBubble: boolean;
  notifyViaRumi: boolean;
  peekSoundEnabled: boolean;
  position: RumiAssistantPosition;
  hideDepthPercent: number;
  size: RumiAssistantSize;
}

export const DEFAULT_RUMI_ASSISTANT_PREFS: RumiAssistantPrefs = {
  enabled: true,
  autoHideOnIdle: true,
  idleHideSeconds: 20,
  autoBubble: true,
  notifyViaRumi: true,
  peekSoundEnabled: true,
  position: "bottom-right",
  hideDepthPercent: 48,
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

export function clampHideDepthPercent(value: number): number {
  const num = Math.trunc(Number(value));
  if (!Number.isFinite(num)) return DEFAULT_RUMI_ASSISTANT_PREFS.hideDepthPercent;
  return Math.max(20, Math.min(75, num));
}

export function normalizeRumiPosition(value: unknown): RumiAssistantPosition {
  if (
    value === "bottom-right" ||
    value === "top-right" ||
    value === "top-center" ||
    value === "top-left"
  ) {
    return value;
  }
  return DEFAULT_RUMI_ASSISTANT_PREFS.position;
}

export function getRumiHideTransform(
  position: RumiAssistantPosition,
  isHiding: boolean,
  hideDepthPercent: number
): string {
  if (!isHiding) {
    return position === "top-center"
      ? "translate3d(0, 8px, 0) rotate(0deg) scale(1)"
      : "translate3d(0, 0, 0) rotate(0deg) scale(1)";
  }
  const d = clampHideDepthPercent(hideDepthPercent);
  switch (position) {
    case "top-center":
      return `translate3d(0, -${d}%, 0) rotate(0deg) scale(0.84)`;
    case "top-left":
      return `translate3d(-${d}%, -4%, 0) rotate(18deg) scale(0.84)`;
    case "top-right":
      return `translate3d(${d}%, -4%, 0) rotate(-18deg) scale(0.84)`;
    case "bottom-right":
    default:
      return `translate3d(${d}%, 6%, 0) rotate(-18deg) scale(0.84)`;
  }
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
      peekSoundEnabled:
        typeof parsed.peekSoundEnabled === "boolean"
          ? parsed.peekSoundEnabled
          : DEFAULT_RUMI_ASSISTANT_PREFS.peekSoundEnabled,
      position: normalizeRumiPosition(parsed.position),
      hideDepthPercent:
        parsed.hideDepthPercent !== undefined
          ? clampHideDepthPercent(parsed.hideDepthPercent)
          : DEFAULT_RUMI_ASSISTANT_PREFS.hideDepthPercent,
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
    peekSoundEnabled:
      typeof patch.peekSoundEnabled === "boolean"
        ? patch.peekSoundEnabled
        : current.peekSoundEnabled,
    position:
      patch.position !== undefined
        ? normalizeRumiPosition(patch.position)
        : current.position,
    hideDepthPercent:
      patch.hideDepthPercent !== undefined
        ? clampHideDepthPercent(patch.hideDepthPercent)
        : current.hideDepthPercent,
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
let lastPeekSoundAt = 0;

function getRumiAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedRumiAudioCtx || sharedRumiAudioCtx.state === "closed") {
    sharedRumiAudioCtx = new AudioCtx();
  }
  return sharedRumiAudioCtx;
}

function runWithRumiAudio(fn: (ctx: AudioContext) => void): void {
  try {
    const ctx = getRumiAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => {
          try {
            fn(ctx);
          } catch {}
        })
        .catch(() => {});
    } else {
      fn(ctx);
    }
  } catch {}
}

/**
 * Distinct cheerful mascot chime for Rumi Assistant notifications
 * (bubbly triangle + sine arpeggio), intentionally distinct from the
 * default floating notification chime.
 */
export function playRumiNotificationSound(
  kind: "celebrate" | "standard" = "standard"
): void {
  runWithRumiAudio((ctx) => {
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
  });
}

/**
 * Cute tiny companion-robot "Yuhu!" chirp using warm sine + triangle glides
 * through a soft lowpass filter when Rumi pops out from hiding on hover.
 */
export function playRumiPeekABooSound(): void {
  if (typeof window === "undefined") return;
  const nowMs = Date.now();
  if (nowMs - lastPeekSoundAt < 700) return;
  lastPeekSoundAt = nowMs;

  runWithRumiAudio((ctx) => {
    const now = ctx.currentTime;

    // Warm lowpass master bus (2600 Hz) so all tones sound round, playful, and cute
    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = "lowpass";
    warmFilter.frequency.setValueAtTime(2600, now);
    warmFilter.Q.setValueAtTime(0.7, now);
    warmFilter.connect(ctx.destination);

    // Syllable 1: "Yu~" (0.00s - 0.125s) — soft glide 540Hz -> 740Hz -> 932Hz (Bb5)
    const syl1Start = now;
    const syl1End = now + 0.125;
    const s1Main = ctx.createOscillator();
    const s1Harmonic = ctx.createOscillator();
    const s1Gain = ctx.createGain();
    const s1HarmGain = ctx.createGain();

    s1Main.type = "triangle";
    s1Main.frequency.setValueAtTime(540, syl1Start);
    s1Main.frequency.exponentialRampToValueAtTime(740, syl1Start + 0.045);
    s1Main.frequency.exponentialRampToValueAtTime(932, syl1End - 0.01);

    s1Harmonic.type = "sine";
    s1Harmonic.frequency.setValueAtTime(1080, syl1Start);
    s1Harmonic.frequency.exponentialRampToValueAtTime(1480, syl1Start + 0.045);
    s1Harmonic.frequency.exponentialRampToValueAtTime(1864, syl1End - 0.01);
    s1HarmGain.gain.setValueAtTime(0.28, syl1Start);

    s1Gain.gain.setValueAtTime(0.0001, syl1Start);
    s1Gain.gain.exponentialRampToValueAtTime(0.095, syl1Start + 0.024);
    s1Gain.gain.exponentialRampToValueAtTime(0.07, syl1Start + 0.085);
    s1Gain.gain.exponentialRampToValueAtTime(0.0001, syl1End);

    s1Main.connect(s1Gain);
    s1Harmonic.connect(s1HarmGain);
    s1HarmGain.connect(s1Gain);
    s1Gain.connect(warmFilter);

    s1Main.start(syl1Start);
    s1Harmonic.start(syl1Start);
    s1Main.stop(syl1End + 0.015);
    s1Harmonic.stop(syl1End + 0.015);

    // Micro airy "H-" breath puff (0.125s - 0.15s) right before "Hu~!"
    try {
      const breathDur = 0.032;
      const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * breathDur));
      const noiseBuf = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const channel = noiseBuf.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        channel[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const breathFilter = ctx.createBiquadFilter();
      breathFilter.type = "bandpass";
      breathFilter.frequency.setValueAtTime(1750, syl1End);
      breathFilter.Q.setValueAtTime(1.4, syl1End);
      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.0001, syl1End);
      breathGain.gain.exponentialRampToValueAtTime(0.018, syl1End + 0.012);
      breathGain.gain.exponentialRampToValueAtTime(0.0001, syl1End + breathDur);

      noiseSrc.connect(breathFilter);
      breathFilter.connect(breathGain);
      breathGain.connect(warmFilter);
      noiseSrc.start(syl1End);
      noiseSrc.stop(syl1End + breathDur + 0.01);
    } catch {}

    // Syllable 2: "Hu~!" (0.15s - 0.38s) — cheerful jump 880Hz (A5) -> 1318.5Hz (E6) -> 1174.66Hz (D6)
    const syl2Start = now + 0.15;
    const syl2End = now + 0.38;
    const s2Main = ctx.createOscillator();
    const s2Sparkle = ctx.createOscillator();
    const s2VibLfo = ctx.createOscillator();
    const s2VibDepth = ctx.createGain();
    const s2Gain = ctx.createGain();
    const s2SparkleGain = ctx.createGain();

    s2Main.type = "sine";
    s2Main.frequency.setValueAtTime(880, syl2Start);
    s2Main.frequency.exponentialRampToValueAtTime(1318.5, syl2Start + 0.085);
    s2Main.frequency.exponentialRampToValueAtTime(1174.66, syl2End - 0.02);

    // Cute gentle 7 Hz vibrato (±14 Hz)
    s2VibLfo.type = "sine";
    s2VibLfo.frequency.setValueAtTime(7, syl2Start);
    s2VibDepth.gain.setValueAtTime(14, syl2Start);
    s2VibLfo.connect(s2VibDepth);
    s2VibDepth.connect(s2Main.frequency);

    s2Gain.gain.setValueAtTime(0.0001, syl2Start);
    s2Gain.gain.exponentialRampToValueAtTime(0.105, syl2Start + 0.028);
    s2Gain.gain.exponentialRampToValueAtTime(0.075, syl2Start + 0.14);
    s2Gain.gain.exponentialRampToValueAtTime(0.0001, syl2End);

    // Subtle sparkle bell overtone (2349 Hz)
    s2Sparkle.type = "sine";
    s2Sparkle.frequency.setValueAtTime(2349.32, syl2Start + 0.02);
    s2SparkleGain.gain.setValueAtTime(0.0001, syl2Start + 0.02);
    s2SparkleGain.gain.exponentialRampToValueAtTime(0.02, syl2Start + 0.055);
    s2SparkleGain.gain.exponentialRampToValueAtTime(0.0001, syl2End - 0.02);

    s2Main.connect(s2Gain);
    s2Gain.connect(warmFilter);
    s2Sparkle.connect(s2SparkleGain);
    s2SparkleGain.connect(ctx.destination);

    s2VibLfo.start(syl2Start);
    s2Main.start(syl2Start);
    s2Sparkle.start(syl2Start + 0.02);
    s2VibLfo.stop(syl2End + 0.015);
    s2Main.stop(syl2End + 0.015);
    s2Sparkle.stop(syl2End);
  });
}
