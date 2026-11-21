export type SubscriptionLifecycleStatus =
  | "free"
  | "active"
  | "expiring_soon"
  | "expired";

export interface SubscriptionStatusInfo {
  status: SubscriptionLifecycleStatus;
  daysRemaining: number | null;
  startedDateIso: string | null;
  dueDateIso: string | null;
  startedLabel: string;
  dueLabel: string;
  badgeLabel: string;
  isEffectivelyPro: boolean;
}

const MS_PER_DAY = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Mengembalikan tanggal lokal hari ini dalam format `YYYY-MM-DD`.
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * Mengubah timestamp ISO atau string tanggal menjadi `YYYY-MM-DD` lokal.
 */
export function toIsoDateString(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(
    parsed.getDate()
  )}`;
}

/**
 * Menambahkan sejumlah hari kalender ke tanggal `YYYY-MM-DD`.
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const norm = toIsoDateString(isoDate) || getTodayIsoDate();
  const [y, m, d] = norm.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + Math.trunc(days)));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(
    utc.getUTCDate()
  )}`;
}

/**
 * Menghitung selisih hari kalender utuh (`toIso - fromIso`).
 */
export function diffCalendarDays(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/**
 * Memformat tanggal ke tampilan singkat Indonesia (misal: `19 Nov 2026`).
 */
export function formatIndoDate(value?: string | null): string {
  const iso = toIsoDateString(value);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(dateObj);
  } catch {
    return iso;
  }
}

/**
 * Memastikan status PRO masih aktif dan belum melewati tanggal jatuh tempo.
 */
export function isProSubscriptionActive(
  tier?: string | null,
  expiresAt?: string | null
): boolean {
  const normalizedTier = String(tier || "").trim().toLowerCase();
  if (normalizedTier !== "pro") return false;
  if (!expiresAt) return true;
  const dueIso = toIsoDateString(expiresAt);
  if (dueIso) {
    return dueIso >= getTodayIsoDate();
  }
  const parsedMs = Date.parse(expiresAt);
  return Number.isNaN(parsedMs) ? true : parsedMs >= Date.now();
}

/**
 * Menghitung status siklus langganan PRO learner (aktif, mendekati habis, atau jatuh tempo).
 */
export function getSubscriptionStatusInfo(params: {
  isProTier: boolean;
  startedAt?: string | null;
  expiresAt?: string | null;
  warningDays?: number;
}): SubscriptionStatusInfo {
  const warningDays = params.warningDays ?? 7;
  const startedDateIso = toIsoDateString(params.startedAt);
  const dueDateIso = toIsoDateString(params.expiresAt);
  const startedLabel = formatIndoDate(startedDateIso);
  const dueLabel = formatIndoDate(dueDateIso);

  if (!params.isProTier) {
    return {
      status: "free",
      daysRemaining: null,
      startedDateIso,
      dueDateIso,
      startedLabel,
      dueLabel,
      badgeLabel: "Free Plan",
      isEffectivelyPro: false,
    };
  }

  if (!dueDateIso) {
    return {
      status: "active",
      daysRemaining: null,
      startedDateIso,
      dueDateIso: null,
      startedLabel,
      dueLabel: "Tidak dibatasi",
      badgeLabel: "PRO Aktif",
      isEffectivelyPro: true,
    };
  }

  const todayIso = getTodayIsoDate();
  const daysRemaining = diffCalendarDays(todayIso, dueDateIso);

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      status: "expired",
      daysRemaining,
      startedDateIso,
      dueDateIso,
      startedLabel,
      dueLabel,
      badgeLabel: `Jatuh Tempo (${overdueDays} hr lalu)`,
      isEffectivelyPro: false,
    };
  }

  if (daysRemaining === 0) {
    return {
      status: "expiring_soon",
      daysRemaining: 0,
      startedDateIso,
      dueDateIso,
      startedLabel,
      dueLabel,
      badgeLabel: "Habis Hari Ini!",
      isEffectivelyPro: true,
    };
  }

  if (daysRemaining <= warningDays) {
    return {
      status: "expiring_soon",
      daysRemaining,
      startedDateIso,
      dueDateIso,
      startedLabel,
      dueLabel,
      badgeLabel: `Habis ${daysRemaining} hr lagi`,
      isEffectivelyPro: true,
    };
  }

  return {
    status: "active",
    daysRemaining,
    startedDateIso,
    dueDateIso,
    startedLabel,
    dueLabel,
    badgeLabel: `PRO Aktif • ${daysRemaining} hr`,
    isEffectivelyPro: true,
  };
}

/**
 * Mendeteksi error kolom belum tersedia sebelum migrasi 013 dijalankan di Supabase.
 */
export function isMissingSubDateColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  if (code === "42703" || code === "PGRST204") {
    return (
      msg.includes("pro_started_at") ||
      msg.includes("pro_expires_at") ||
      msg.includes("pro_package_name") ||
      details.includes("pro_started_at") ||
      details.includes("pro_expires_at") ||
      details.includes("pro_package_name") ||
      code === "42703" ||
      code === "PGRST204"
    );
  }
  return (
    msg.includes("pro_started_at") ||
    msg.includes("pro_expires_at") ||
    msg.includes("pro_package_name")
  );
}

/**
 * Mendeteksi error kolom paket/trial belum tersedia sebelum migrasi 017 dijalankan di Supabase.
 */
export function isMissingTierV2ColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  const matchesCol =
    msg.includes("has_used_trial") ||
    msg.includes("trial_used_at") ||
    msg.includes("pro_package_id") ||
    msg.includes("pro_billing_cycle") ||
    msg.includes("billing_cycle") ||
    msg.includes("duration_days") ||
    msg.includes("request_type") ||
    msg.includes("target_item_key") ||
    msg.includes("target_item_title") ||
    details.includes("has_used_trial") ||
    details.includes("pro_package_id") ||
    details.includes("pro_billing_cycle");
  if (matchesCol) return true;
  return code === "42703" || code === "PGRST204" || code === "42P01";
}
