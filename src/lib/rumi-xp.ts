import type { PackageTierKind } from "@/lib/entitlements";

export type RumiEvolutionStage = 1 | 2 | 3 | 4 | 5;

export interface RumiLevelTier {
  level: RumiEvolutionStage;
  stage: RumiEvolutionStage;
  minXp: number;
  nextXp: number | null;
  formName: string;
  title: string;
  emoji: string;
  badge: string;
  tagline: string;
}

export const RUMI_LEVEL_TIERS: readonly RumiLevelTier[] = [
  {
    level: 1,
    stage: 1,
    minXp: 0,
    nextXp: 50,
    formName: "Baby Rumi",
    title: "Seed Creator",
    emoji: "🌱",
    badge: "Bayi Tunas",
    tagline:
      "Rumi kecil yang baru menetas dan siap belajar bareng kamu!",
  },
  {
    level: 2,
    stage: 2,
    minXp: 50,
    nextXp: 250,
    formName: "Junior Rumi",
    title: "Rising Strategist",
    emoji: "✨",
    badge: "Kreator Muda",
    tagline:
      "Rumi makin lincah dengan kacamata star-lens dan headset keren!",
  },
  {
    level: 3,
    stage: 3,
    minXp: 250,
    nextXp: 600,
    formName: "Teen Rumi",
    title: "Content Wizard",
    emoji: "🚀",
    badge: "Penyihir Konten",
    tagline:
      "Rumi tumbuh remaja dengan hoodie kreator & kartu hologram strategi!",
  },
  {
    level: 4,
    stage: 4,
    minXp: 600,
    nextXp: 1000,
    formName: "Pro Rumi",
    title: "Social Media Master",
    emoji: "👑",
    badge: "Master Strategi",
    tagline:
      "Rumi dewasa berjubah energi & mahkota emas, siap memimpin campaign!",
  },
  {
    level: 5,
    stage: 5,
    minXp: 1000,
    nextXp: null,
    formName: "Superior Rumi",
    title: "Agency Legend",
    emoji: "🏆",
    badge: "Wujud Superior",
    tagline:
      "Wujud tertinggi! Superior Rumi keramik kosmik indigo bersayap cahaya emas & mahkota berlian!",
  },
] as const;

export type XpActivityType =
  | "daily_login"
  | "streak_7"
  | "chapter_complete"
  | "course_complete"
  | "quiz_submit"
  | "lesson_note"
  | "lesson_review"
  | "reward_claim"
  | "tier_bonus_basic"
  | "tier_bonus_pro";

export interface XpActivityDefinition {
  type: XpActivityType;
  baseXp: number;
  label: string;
  description: string;
  appliesMultiplier: boolean;
}

export const XP_ACTIVITY_CONFIG: Record<XpActivityType, XpActivityDefinition> = {
  daily_login: {
    type: "daily_login",
    baseXp: 1,
    label: "Login Harian",
    description: "Otomatis didapat 1× per hari saat membuka portal",
    appliesMultiplier: true,
  },
  streak_7: {
    type: "streak_7",
    baseXp: 5,
    label: "Bonus Streak 7 Hari",
    description: "Konsisten login 7 hari berturut-turut",
    appliesMultiplier: true,
  },
  chapter_complete: {
    type: "chapter_complete",
    baseXp: 2,
    label: "Selesai 1 Bab Materi",
    description: "Menandai 1 bab/video pelajaran selesai",
    appliesMultiplier: true,
  },
  course_complete: {
    type: "course_complete",
    baseXp: 5,
    label: "Tuntas 1 Kelas (100%)",
    description: "Menyelesaikan seluruh bab dalam 1 kelas",
    appliesMultiplier: true,
  },
  quiz_submit: {
    type: "quiz_submit",
    baseXp: 4,
    label: "Submit Kuis / Tugas",
    description: "Mengumpulkan kuis atau tugas evaluasi mentor",
    appliesMultiplier: true,
  },
  lesson_note: {
    type: "lesson_note",
    baseXp: 2,
    label: "Tulis Catatan Belajar",
    description: "Menyimpan catatan pribadi pada sebuah bab",
    appliesMultiplier: true,
  },
  lesson_review: {
    type: "lesson_review",
    baseXp: 2,
    label: "Kirim Ulasan Kelas",
    description: "Memberikan rating & ulasan untuk materi",
    appliesMultiplier: true,
  },
  reward_claim: {
    type: "reward_claim",
    baseXp: 3,
    label: "Tukar Hadiah Poin",
    description: "Menukarkan Poin Bintang di Rewards Shop",
    appliesMultiplier: true,
  },
  tier_bonus_basic: {
    type: "tier_bonus_basic",
    baseXp: 15,
    label: "Bonus Aktivasi Paket Basic",
    description: "Bonus satu kali saat paket Basic aktif",
    appliesMultiplier: false,
  },
  tier_bonus_pro: {
    type: "tier_bonus_pro",
    baseXp: 35,
    label: "Bonus Aktivasi Paket PRO",
    description: "Bonus satu kali saat paket PRO aktif",
    appliesMultiplier: false,
  },
};

export function getTierXpMultiplier(tierKind: PackageTierKind): number {
  if (tierKind === "pro") return 2;
  if (tierKind === "basic" || tierKind === "custom") return 1.5;
  return 1;
}

export function computeAwardedXp(
  type: XpActivityType,
  tierKind: PackageTierKind
): { xp: number; baseXp: number; multiplier: number } {
  const def = XP_ACTIVITY_CONFIG[type];
  if (!def.appliesMultiplier) {
    return { xp: def.baseXp, baseXp: def.baseXp, multiplier: 1 };
  }
  const multiplier = getTierXpMultiplier(tierKind);
  return {
    xp: Math.ceil(def.baseXp * multiplier),
    baseXp: def.baseXp,
    multiplier,
  };
}

export interface RumiXpEvent {
  id: string;
  dedupeKey: string;
  type: XpActivityType;
  label: string;
  detail?: string;
  xp: number;
  baseXp: number;
  multiplier: number;
  createdAt: string;
}

export interface RumiXpProfileState {
  totalXp: number;
  loginStreak: number;
  lastLoginDate: string | null;
  claimedKeys: string[];
  events: RumiXpEvent[];
}

export const EMPTY_RUMI_XP_STATE: RumiXpProfileState = {
  totalXp: 0,
  loginStreak: 0,
  lastLoginDate: null,
  claimedKeys: [],
  events: [],
};

const MAX_XP_EVENTS_STORED = 50;
const XP_STORAGE_PREFIX = "ruang_sosmed_rumi_xp_v1_";
export const RUMI_XP_UPDATED_EVENT = "ruang_sosmed_xp_updated";

export function resolveXpUserKey(
  user?: {
    email?: string | null;
    username?: string | null;
    name?: string | null;
  } | null
): string {
  const raw =
    user?.email?.trim() ||
    user?.username?.trim() ||
    user?.name?.trim() ||
    "guest";
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, "_")
      .slice(0, 80) || "guest"
  );
}

/**
 * Compute local YYYY-MM-DD key. Call only inside client handlers / effects.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Compute yesterday's local YYYY-MM-DD key. Call only inside client handlers / effects.
 */
export function getYesterdayDateKey(base: Date = new Date()): string {
  const prev = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
  return getLocalDateKey(prev);
}

function getStorageKey(userKey: string): string {
  return `${XP_STORAGE_PREFIX}${userKey || "guest"}`;
}

export function loadRumiXpState(userKey: string): RumiXpProfileState {
  if (typeof window === "undefined") return EMPTY_RUMI_XP_STATE;
  try {
    const raw = window.localStorage.getItem(getStorageKey(userKey));
    if (!raw) return EMPTY_RUMI_XP_STATE;
    const parsed = JSON.parse(raw) as Partial<RumiXpProfileState> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY_RUMI_XP_STATE;
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    const claimedKeys = Array.isArray(parsed.claimedKeys)
      ? parsed.claimedKeys
      : events.map((e) => e.dedupeKey).filter(Boolean);
    return {
      totalXp:
        typeof parsed.totalXp === "number" && Number.isFinite(parsed.totalXp)
          ? Math.max(0, Math.round(parsed.totalXp))
          : 0,
      loginStreak:
        typeof parsed.loginStreak === "number" &&
        Number.isFinite(parsed.loginStreak)
          ? Math.max(0, Math.round(parsed.loginStreak))
          : 0,
      lastLoginDate:
        typeof parsed.lastLoginDate === "string" ? parsed.lastLoginDate : null,
      claimedKeys: Array.from(new Set(claimedKeys)),
      events: events.slice(0, MAX_XP_EVENTS_STORED),
    };
  } catch {
    return EMPTY_RUMI_XP_STATE;
  }
}

export function saveRumiXpState(
  userKey: string,
  state: RumiXpProfileState
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getStorageKey(userKey),
      JSON.stringify({
        ...state,
        events: state.events.slice(0, MAX_XP_EVENTS_STORED),
      })
    );
  } catch {}
}

export function resolveRumiLevelInfo(totalXp: number) {
  const safeXp = Math.max(0, Math.round(totalXp || 0));
  let current: RumiLevelTier = RUMI_LEVEL_TIERS[0];
  for (const tier of RUMI_LEVEL_TIERS) {
    if (safeXp >= tier.minXp) {
      current = tier;
    }
  }
  const nextTier =
    RUMI_LEVEL_TIERS.find((t) => t.level === current.level + 1) || null;
  const levelProgressPct =
    current.nextXp === null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((safeXp - current.minXp) / (current.nextXp - current.minXp)) *
                100
            )
          )
        );
  const xpToNext =
    current.nextXp === null ? 0 : Math.max(0, current.nextXp - safeXp);

  return {
    xp: safeXp,
    ...current,
    nextTier,
    levelProgressPct,
    xpToNext,
    isMax: current.nextXp === null,
  };
}

function dispatchXpUpdated(params: {
  userKey: string;
  state: RumiXpProfileState;
  xpAdded: number;
  evolved: boolean;
  nextLevel: RumiEvolutionStage;
  label?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(RUMI_XP_UPDATED_EVENT, { detail: params })
    );
  } catch {}
}

export interface AwardXpResult {
  awarded: boolean;
  xpAdded: number;
  prevLevel: RumiEvolutionStage;
  nextLevel: RumiEvolutionStage;
  evolved: boolean;
  state: RumiXpProfileState;
}

export function awardRumiXpEvent(params: {
  userKey: string;
  type: XpActivityType;
  dedupeKey: string;
  detail?: string;
  tierKind: PackageTierKind;
  silent?: boolean;
}): AwardXpResult {
  const { userKey, type, dedupeKey, detail, tierKind, silent } = params;
  const prev = loadRumiXpState(userKey);
  const prevInfo = resolveRumiLevelInfo(prev.totalXp);

  const alreadyClaimed =
    prev.claimedKeys.includes(dedupeKey) ||
    prev.events.some((e) => e.dedupeKey === dedupeKey);

  if (alreadyClaimed) {
    return {
      awarded: false,
      xpAdded: 0,
      prevLevel: prevInfo.level,
      nextLevel: prevInfo.level,
      evolved: false,
      state: prev,
    };
  }

  const def = XP_ACTIVITY_CONFIG[type];
  const { xp, baseXp, multiplier } = computeAwardedXp(type, tierKind);
  const nextTotal = prev.totalXp + xp;
  const nextInfo = resolveRumiLevelInfo(nextTotal);
  const evolved = nextInfo.level > prevInfo.level;

  const newEvent: RumiXpEvent = {
    id: `xp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dedupeKey,
    type,
    label: def.label,
    detail,
    xp,
    baseXp,
    multiplier,
    createdAt: new Date().toISOString(),
  };

  const nextState: RumiXpProfileState = {
    ...prev,
    totalXp: nextTotal,
    claimedKeys: [...prev.claimedKeys, dedupeKey],
    events: [newEvent, ...prev.events].slice(0, MAX_XP_EVENTS_STORED),
  };

  saveRumiXpState(userKey, nextState);
  if (!silent) {
    dispatchXpUpdated({
      userKey,
      state: nextState,
      xpAdded: xp,
      evolved,
      nextLevel: nextInfo.level,
      label: def.label,
    });
  }

  return {
    awarded: true,
    xpAdded: xp,
    prevLevel: prevInfo.level,
    nextLevel: nextInfo.level,
    evolved,
    state: nextState,
  };
}

export function claimDailyLoginXp(
  userKey: string,
  tierKind: PackageTierKind
): {
  awarded: boolean;
  streak: number;
  xpAdded: number;
  streakBonusXp: number;
  evolved: boolean;
  nextLevel: RumiEvolutionStage;
  state: RumiXpProfileState;
} {
  const prev = loadRumiXpState(userKey);
  const prevInfo = resolveRumiLevelInfo(prev.totalXp);
  const today = getLocalDateKey();

  if (prev.lastLoginDate === today) {
    return {
      awarded: false,
      streak: Math.max(1, prev.loginStreak),
      xpAdded: 0,
      streakBonusXp: 0,
      evolved: false,
      nextLevel: prevInfo.level,
      state: prev,
    };
  }

  const yesterday = getYesterdayDateKey();
  const nextStreak = prev.lastLoginDate === yesterday ? prev.loginStreak + 1 : 1;

  // Update streak metadata first so awardRumiXpEvent reads & preserves it
  const updatedStreakState: RumiXpProfileState = {
    ...prev,
    loginStreak: nextStreak,
    lastLoginDate: today,
  };
  saveRumiXpState(userKey, updatedStreakState);

  const loginRes = awardRumiXpEvent({
    userKey,
    type: "daily_login",
    dedupeKey: `daily_login:${today}`,
    detail: `Hari ke-${nextStreak}`,
    tierKind,
  });

  let streakBonusXp = 0;
  let finalState = loginRes.state;
  let finalLevel = loginRes.nextLevel;
  let evolved = loginRes.evolved;

  if (nextStreak > 0 && nextStreak % 7 === 0) {
    const bonusRes = awardRumiXpEvent({
      userKey,
      type: "streak_7",
      dedupeKey: `streak_7:${today}`,
      detail: `Streak ${nextStreak} hari berturut-turut!`,
      tierKind,
    });
    if (bonusRes.awarded) {
      streakBonusXp = bonusRes.xpAdded;
      finalState = bonusRes.state;
      finalLevel = bonusRes.nextLevel;
      evolved = evolved || bonusRes.evolved;
    }
  }

  return {
    awarded: loginRes.awarded,
    streak: nextStreak,
    xpAdded: loginRes.xpAdded + streakBonusXp,
    streakBonusXp,
    evolved,
    nextLevel: finalLevel,
    state: finalState,
  };
}
