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

function playRoboticFormantFallback(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const syllables = [
    // "PEEK" (/i/)
    { offset: 0, dur: 0.13, fStart: 540, fEnd: 820, f1: 320, f2: 2250 },
    // "A" (/ə/)
    { offset: 0.15, dur: 0.09, fStart: 510, fEnd: 480, f1: 540, f2: 1380 },
    // "BOO!" (/u/)
    { offset: 0.26, dur: 0.26, fStart: 620, fEnd: 980, f1: 360, f2: 920 },
  ];

  syllables.forEach((s) => {
    const start = now + s.offset;
    const carrier = ctx.createOscillator();
    carrier.type = "sawtooth";
    carrier.frequency.setValueAtTime(s.fStart, start);
    carrier.frequency.exponentialRampToValueAtTime(s.fEnd, start + s.dur * 0.72);

    // Subtle robotic vocoder flutter
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(42, start);
    lfoGain.gain.setValueAtTime(18, start);
    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);

    const f1Filter = ctx.createBiquadFilter();
    f1Filter.type = "bandpass";
    f1Filter.frequency.setValueAtTime(s.f1, start);
    f1Filter.Q.setValueAtTime(6, start);

    const f2Filter = ctx.createBiquadFilter();
    f2Filter.type = "bandpass";
    f2Filter.frequency.setValueAtTime(s.f2, start);
    f2Filter.Q.setValueAtTime(7, start);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(0.11, start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);

    carrier.connect(f1Filter);
    carrier.connect(f2Filter);
    f1Filter.connect(amp);
    f2Filter.connect(amp);
    amp.connect(ctx.destination);

    lfo.start(start);
    carrier.start(start);
    lfo.stop(start + s.dur + 0.02);
    carrier.stop(start + s.dur + 0.02);
  });
}

/**
 * Cute robotic "Peek-a-boo!" voice + servo blip when Rumi pops out from hiding on hover.
 */
export function playRumiPeekABooSound(): void {
  if (typeof window === "undefined") return;
  const nowMs = Date.now();
  if (nowMs - lastPeekSoundAt < 700) return;
  lastPeekSoundAt = nowMs;

  const canSpeak =
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined";

  // Crisp mechanical robot servo chirp
  runWithRumiAudio((ctx) => {
    const now = ctx.currentTime;
    [680, 1080].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.055;
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.045);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.038, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.085);
    });

    if (!canSpeak) {
      playRoboticFormantFallback(ctx);
    }
  });

  if (canSpeak) {
    try {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      const utter = new SpeechSynthesisUtterance("Peek a boo!");
      utter.lang = "en-US";
      utter.pitch = 1.95; // High, playful cute robot pitch
      utter.rate = 1.32;
      utter.volume = 0.78;
      const voices = synth.getVoices?.() ?? [];
      const robotFriendlyVoice =
        voices.find((v) => /zarvox|trinoids|albert|fred/i.test(v.name)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en-us")) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en"));
      if (robotFriendlyVoice) {
        utter.voice = robotFriendlyVoice;
      }
      utter.onerror = () => {
        runWithRumiAudio((ctx) => playRoboticFormantFallback(ctx));
      };
      synth.speak(utter);
    } catch {
      runWithRumiAudio((ctx) => playRoboticFormantFallback(ctx));
    }
  }
}
