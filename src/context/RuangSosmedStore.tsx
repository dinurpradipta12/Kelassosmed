"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  TOP_LEARNERS_DATA,
  INITIAL_UNGRADED_QUIZZES,
  INITIAL_TODOS,
  CONTENT_STATUS_DATA,
  CONTENT_TYPE_CONFIGS,
  type ContentType,
  type LeaderboardLearner,
  type UngradedQuizItem,
  type TodoTask,
} from "@/lib/design-tokens";
import {
  INITIAL_EXPLORER_ITEMS,
  INITIAL_DISCUSSION_THREADS,
  INITIAL_REPORTED_ISSUES,
  INITIAL_ASSIGNEES,
  INITIAL_VERSIONS,
  INITIAL_WORKSPACE_COLLABORATORS,
  getDefaultFolderAccessCode,
  getItemAccessCode,
  type ExplorerContentItem,
  type ExplorerItemType,
  type WikiAttachmentFile,
  type WikiDocumentSection,
  type DiscussionThread,
  type ReportedIssueItem,
  type AssigneeLearner,
  type ContentVersionItem,
  type WorkspaceCollaborator,
} from "@/lib/phase2-data";
import {
  INITIAL_WIKI_RESOURCES,
  type WikiResourceCard,
} from "@/lib/phase3-data";
import {
  INITIAL_QUIZ_QUESTIONS,
  INITIAL_GRADING_SUBMISSIONS,
  type QuizQuestionItem,
  type GradingSubmissionItem,
} from "@/lib/phase4-data";
import {
  INITIAL_LEARNER_ASSIGNED_ITEMS,
  COURSE_OVERVIEW_SECTIONS,
  INITIAL_LEARNER_NOTIFICATIONS,
  extractVisibleChapters,
  summarizeCurriculumStats,
  type LearnerAssignedItem,
  type CourseSectionAccordion,
  type CourseChapterItem,
  type LearnerNotification,
  type LearnerNotificationEventType,
} from "@/lib/phase5-data";
import {
  RS_LEARNING_26_LESSONS_SEED,
  RS_LEARNING_26_REVIEWS_SEED,
  rsLearning26BridgeService,
  type RsLessonItem,
  type RsLessonReviewItem,
} from "@/lib/supabase/rs-learning-26-bridge";
import {
  type CertificateDesignConfig,
  DEFAULT_CERTIFICATE_CONFIG,
} from "@/lib/certificate-tokens";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  isProSubscriptionActive,
  isMissingSubDateColumnError,
  isMissingTierV2ColumnError,
} from "@/lib/subscription-utils";
import {
  INITIAL_REWARDS_CATALOG,
  type RewardItem,
  type ClaimedRewardRecord,
} from "@/lib/rewards-data";
import {
  ALL_FALSE_ENTITLEMENTS,
  ALL_TRUE_ENTITLEMENTS,
  DEFAULT_LEARNER_PRO_FEATURES,
  PACKAGE_FEATURE_DEFINITIONS,
  buildPackageBenefitLines,
  buildUnlockItemKey,
  computeTrial3DaysPriceIdr,
  computeTrial7DaysPriceIdr,
  createDefaultTierPackages,
  evaluateChapterAccess,
  evaluateCourseCardAccess,
  formatIdr,
  isTrialBillingCycle,
  normalizeProPackages,
  parseIdrFromLabel,
  resolveLearnerAccess,
  type BillingCycle,
  type ChapterAccessResult,
  type CourseCardAccessResult,
  type LearnerAccessState,
  type LearnerProPackageItem,
  type LearnerProPlanConfig,
  type LearnerUnlockedItemRecord,
  type ModuleAccessMode,
  type PackageEntitlements,
  type PackageFeatureKey,
  type PackageTierKind,
} from "@/lib/entitlements";
import {
  awardRumiXpEvent,
  getLocalDateKey,
  resolveXpUserKey,
} from "@/lib/rumi-xp";

export {
  ALL_FALSE_ENTITLEMENTS,
  ALL_TRUE_ENTITLEMENTS,
  DEFAULT_LEARNER_PRO_FEATURES,
  PACKAGE_FEATURE_DEFINITIONS,
  buildPackageBenefitLines,
  buildUnlockItemKey,
  computeTrial3DaysPriceIdr,
  computeTrial7DaysPriceIdr,
  createDefaultTierPackages,
  evaluateChapterAccess,
  evaluateCourseCardAccess,
  formatIdr,
  isTrialBillingCycle,
  parseIdrFromLabel,
  resolveLearnerAccess,
  type BillingCycle,
  type ChapterAccessResult,
  type CourseCardAccessResult,
  type LearnerAccessState,
  type LearnerProPackageItem,
  type LearnerProPlanConfig,
  type LearnerUnlockedItemRecord,
  type ModuleAccessMode,
  type PackageEntitlements,
  type PackageFeatureKey,
  type PackageTierKind,
};

let profilesHasSubDateCols = true;
let profilesHasTierV2Cols = true;

export interface ContentStatusSegment {
  label: string;
  percentage: number;
  color: string;
  count: number;
}

export interface CohortProjectItem {
  id: string;
  name: string;
  color: string;
  description?: string;
  count?: number;
  shareWithAllLearners?: boolean;
}

export interface MaintenanceConfig {
  enabled: boolean;
  badgeText: string;
  title: string;
  subtitle: string;
  customImageUrl: string;
  displayMode: "card" | "fullscreen";
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: true,
  badgeText: "404 • WEB UNDER CONSTRUCTION",
  title: "Ruang Sosmed Sedang Dalam Pengembangan",
  subtitle:
    "Halaman ini sementara ditutup untuk persiapan peluncuran. Silakan kembali lagi dalam waktu dekat.",
  customImageUrl: "/404.svg",
  displayMode: "card",
};

export interface LearnerPagesVisibilityConfig {
  showWikiPage: boolean;
  showFavoritesPage: boolean;
}

export const DEFAULT_LEARNER_PAGES_CONFIG: LearnerPagesVisibilityConfig = {
  showWikiPage: true,
  showFavoritesPage: true,
};

export const DEFAULT_LEARNER_PRO_CONFIG: LearnerProPlanConfig = {
  modalTitle: "Pilih Paket Membership Ruang Sosmed 2.0",
  modalSubtitle:
    "Bandingkan paket FREE, Basic, dan Pro. Tersedia uji coba 7 hari (1× pakai) atau langganan 30 hari.",
  badgeText: "LEARNER PRO UNLIMITED",
  planName: "Pro",
  priceLabel: "Rp 150.000",
  periodLabel: "/ bulan",
  planSummary:
    "Semua fitur FREE dan Basic ditambah akses penuh tanpa batas ke seluruh modul, Sertifikat HD, dan Review Tugas 1-on-1 bersama Mentor.",
  featuresHeading: "Semua 7 Fitur Premium Tanpa Batas",
  features: [...DEFAULT_LEARNER_PRO_FEATURES],
  footerNote: "Percobaan 7 hari berlaku 1× khusus member baru • Langganan fleksibel 30 hari",
  ctaButtonLabel: "Aktifkan Paket Pro",
  bannerBadge: "KHUSUS LEARNER • BASIC & PRO PASS",
  bannerHeading: "Upgrade Paket Belajar — Pilih Basic atau Pro Unlimited",
  bannerDescription:
    "Atur akses sesuai kebutuhan: mulai dari Paket FREE, Paket Basic (6 modul/materi + buka lanjutan pakai Poin), atau Paket Pro Unlimited semua fitur & modul.",
  bannerPeriodLabel: "/ bulan",
  bannerCtaLabel: "Lihat Pilihan Paket",
  qrCodeUrl: "",
  merchantName: "Ruang Sosmed 2.0",
  bankName: "BCA / Mandiri",
  accountNumber: "123-456-7890",
  accountHolder: "PT Ruang Sosmed Indonesia",
  whatsappNumber: "6281234567890",
  paymentInstructions:
    "Scan kode QRIS di atas melalui aplikasi m-Banking atau e-Wallet (GoPay, OVO, DANA, ShopeePay), lalu konfirmasi pembayaran Anda.",
  packagesSchemaVersion: 3,
  packages: createDefaultTierPackages(),
};

export const getNormalizedProPackages = normalizeProPackages;

export interface AdminActivityNotification {
  id: string;
  eventType: "user_registered" | "pro_subscribed";
  userName: string;
  userEmail?: string;
  packageName?: string;
  priceLabel?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

/** Build formatted admin activity notification payload for new member signup or PRO subscription. */
export function buildAdminActivityNotification(params: {
  eventType: "user_registered" | "pro_subscribed";
  userName: string;
  userEmail?: string;
  packageName?: string;
  priceLabel?: string;
  id?: string;
  createdAt?: string;
}): AdminActivityNotification {
  const cleanName = (params.userName || "").trim() || "Member Baru";
  const pkgLabel = (params.packageName || "").trim() || "Learner PRO Bulanan";
  const priceSuffix = params.priceLabel?.trim()
    ? ` (${params.priceLabel.trim()})`
    : "";

  const isRegister = params.eventType === "user_registered";
  return {
    id:
      params.id ||
      `adm-${params.eventType}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    eventType: params.eventType,
    userName: cleanName,
    userEmail: params.userEmail?.trim() || undefined,
    packageName: isRegister ? undefined : pkgLabel,
    priceLabel: isRegister ? undefined : params.priceLabel?.trim() || undefined,
    title: isRegister
      ? "Say, Hi! 🎉 Member Baru Bergabung"
      : "Yuhuu! ⚡ Langganan PRO Baru",
    message: isRegister
      ? `Say, Hi! ${cleanName} telah bergabung ke Ruang Sosmed 2.0. Yuk sambut member baru dan bantu mereka memulai perjalanan belajarnya!`
      : `Yuhuu! ${cleanName} telah berlangganan dan mengambil paket ${pkgLabel}${priceSuffix}. Akses fitur eksklusifnya sudah aktif dan siap digunakan!`,
    createdAt: params.createdAt || new Date().toISOString(),
    read: false,
  };
}

export const INITIAL_COHORT_PROJECTS: CohortProjectItem[] = [
  { id: "cohort-1", name: "Ruang Sosmed Class", color: "#EC4899", description: "Batch Utama Ruang Sosmed" },
  { id: "cohort-2", name: "Specialist Growth Lab", color: "#10B981", description: "Short-Form Video Track" },
];

interface PersistedGlobalState {
  // Admin Dashboard & Shared Metrics
  mostIssuedCount: number;
  leaderboard: LeaderboardLearner[];
  ungradedQuizzes: UngradedQuizItem[];
  todos: TodoTask[];
  contentStatusData: ContentStatusSegment[];
  totalContentsGaugeCount: number;

  // Phase 2 Explorer, Discussions, Issues, Assignees, Versions
  explorerItems: ExplorerContentItem[];
  discussionThreads: DiscussionThread[];
  reportedIssues: ReportedIssueItem[];
  assignees: AssigneeLearner[];
  versions: ContentVersionItem[];
  workspaceCollaborators: WorkspaceCollaborator[];

  // Phase 3 Wiki Resources
  wikiResources: WikiResourceCard[];

  // Phase 4 Quiz Questions & Grading Center Submissions
  quizQuestions: QuizQuestionItem[];
  gradingSubmissions: GradingSubmissionItem[];

  // Phase 5 Learner Portal State
  learnerPoints: number;
  learnerAssignedItems: LearnerAssignedItem[];
  courseSections: CourseSectionAccordion[];
  courseCurriculums: Record<string, CourseSectionAccordion[]>;
  learnerNotifications: LearnerNotification[];
  certificateUnlocked: boolean;

  // Ported from `rs-learning-26`: Lessons + Assets, Personal Lesson Notes, Lesson Reviews
  rsLessons: RsLessonItem[];
  rsLessonNotes: Record<string, string>; // key: lesson_key / chapter_id
  rsLessonReviews: RsLessonReviewItem[];

  // Learner Subscription / Premium Tier State (Learner-Only Subscription)
  learnerIsPro: boolean;
  learnerSubscriptions: Record<string, "PRO" | "Free">;
  learnerPackageId: string | null;
  learnerPackageName: string | null;
  learnerBillingCycle: "3d_trial" | "7d_trial" | "30d" | "custom" | null;
  learnerHasUsedTrial: boolean;
  learnerUnlockedItems: LearnerUnlockedItemRecord[];
  adminPreviewTierOverride: "auto" | "free" | "basic" | "pro";

  // Rewards Redemption Center (Rewards Catalog & Claim History)
  rewardsCatalog: RewardItem[];
  claimedRewards: ClaimedRewardRecord[];

  // Projects / Class Cohorts Management
  cohortProjects: CohortProjectItem[];

  // Certificate Studio Design Configuration (Global & Multi-Course Override)
  certificateConfig: CertificateDesignConfig;
  courseCertificateConfigs?: Record<string, CertificateDesignConfig>;

  // Learner PRO Upgrade Plan & QRIS Configuration (editable from Admin Settings)
  learnerProConfig: LearnerProPlanConfig;

  // Web Under Construction (404) Maintenance Mode & Custom Design
  maintenanceConfig: MaintenanceConfig;

  // Visibility toggles for Learner Portal pages (Wiki & Favorites)
  learnerPagesConfig: LearnerPagesVisibilityConfig;

  // Global Synchronized User Avatars & Points maps (keyed by lowercase email / name / username / id)
  userAvatars: Record<string, string>;
  userPointsMap: Record<string, number>;

  // Admin-only Real-time Activity Notifications (new member signups & PRO subscriptions)
  adminNotifications: AdminActivityNotification[];
}

const STORAGE_KEY = "ruang_sosmed_2_0_clean_store_v6";
const DELETED_THREADS_STORAGE_KEY = "ruang_sosmed_deleted_threads_v1";
const DELETED_REPLIES_STORAGE_KEY = "ruang_sosmed_deleted_replies_v1";
const DELETED_CONTENT_IDS_STORAGE_KEY = "ruang_sosmed_deleted_content_ids_v1";
const DELETED_CONTENT_TITLES_STORAGE_KEY = "ruang_sosmed_deleted_content_titles_v1";
const DELETED_COHORTS_STORAGE_KEY = "ruang_sosmed_deleted_cohorts_v1";
const COHORT_PROJECTS_TS_STORAGE_KEY = "ruang_sosmed_cohort_projects_ts_v1";
const CONTENT_TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readStoredTombstoneMap(storageKey: string): Map<string, number> {
  const result = new Map<string, number>();
  if (typeof window === "undefined") return result;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return result;
    const parsed = JSON.parse(raw);
    const now = Date.now();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      Object.entries(parsed).forEach(([k, v]) => {
        const cleanKey = k.trim().toLowerCase();
        const expiresAt = Number(v);
        if (cleanKey && Number.isFinite(expiresAt) && expiresAt > now) {
          result.set(cleanKey, expiresAt);
        }
      });
    }
  } catch {}
  return result;
}

function persistStoredTombstoneMap(
  storageKey: string,
  map: Map<string, number>
): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const obj: Record<string, number> = {};
    map.forEach((expiresAt, k) => {
      if (k && expiresAt > now) {
        obj[k] = expiresAt;
      } else {
        map.delete(k);
      }
    });
    window.localStorage.setItem(storageKey, JSON.stringify(obj));
  } catch {}
}

function isContentTitleTombstoned(
  titleKey: string,
  map: Map<string, number>
): boolean {
  const clean = titleKey.trim().toLowerCase();
  if (!clean) return false;
  const expiresAt = map.get(clean);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    map.delete(clean);
    return false;
  }
  return true;
}

function cleanupLocalStorageForContent(id: string, title: string): void {
  if (typeof window === "undefined") return;
  const key = (title || "").trim().toLowerCase();
  try {
    if (id) {
      window.localStorage.removeItem(`ruang_sosmed_thumb_${id}`);
    }
    if (key) {
      window.localStorage.removeItem(`ruang_sosmed_curriculum_${key}`);
      window.localStorage.removeItem(`ruang_sosmed_curriculum_ts_${key}`);
      window.localStorage.removeItem(`ruang_sosmed_editor_sections_${key}`);
      window.localStorage.removeItem(`ruang_sosmed_course_tier_${key}`);
      window.localStorage.removeItem(`ruang_sosmed_wiki_doc_${key}`);
      window.localStorage.removeItem(`ruang_sosmed_thumb_${key}`);
    }
  } catch {}
}

function readStoredIdSet(storageKey: string): Set<string> {
  const result = new Set<string>();
  if (typeof window === "undefined") return result;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return result;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((id) => {
        if (typeof id === "string" && id.trim()) {
          result.add(id.trim());
        }
      });
    }
  } catch {}
  return result;
}

function persistStoredIdSet(storageKey: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
  } catch {}
}

function filterDeletedDiscussionThreads(
  threads: DiscussionThread[],
  deletedThreadIds: Set<string>,
  deletedReplyIds: Set<string>
): DiscussionThread[] {
  return (threads || []).reduce<DiscussionThread[]>((acc, thread) => {
    if (
      !thread?.id ||
      deletedThreadIds.has(thread.id) ||
      thread.title === "__DELETED__" ||
      thread.excerpt === "__DELETED__"
    ) {
      return acc;
    }
    const originalReplies = Array.isArray(thread.replies) ? thread.replies : [];
    const remainingReplies = originalReplies.filter(
      (rep) => rep?.id && !deletedReplyIds.has(rep.id)
    );
    if (remainingReplies.length === 0) {
      return acc;
    }
    if (remainingReplies.length !== originalReplies.length) {
      const latestReply = remainingReplies[remainingReplies.length - 1];
      acc.push({
        ...thread,
        replies: remainingReplies,
        repliesCount: remainingReplies.length,
        excerpt: latestReply?.message || thread.excerpt,
      });
    } else {
      acc.push(thread);
    }
    return acc;
  }, []);
}

const LEGACY_DUMMY_TITLES = new Set([
  "social media strategy: 10 principles to boost brand engagement",
  "social media analytics & campaign fundamentals",
  "content pillars & audience persona playbook",
  "content pillars & audience persona",
  "mastering instagram carousel & viral hook strategy",
  "audit akun instagram & bio optimization sprint",
  "audit akun instagram & bio optimization capstone",
  "audit akun instagram & bio optimization",
  "quiz algoritma reels & tiktok retention",
  "full-stack social media specialist roadmap",
  "sop crisis management & community moderation",
  "batch oktober 2026 — creator assets",
  "ruang sosmed 2.0 student success & sop directory",
  "ruang sosmed 2.0 student resource & sop directory",
  "instagram reels retention & hook scriptwriting",
  "brand voice & crisis communication sop",
  "full-stack social media strategist",
  "120 viral hook templates (bahasa & english)",
  "quarterly content calendar & pillar tracker",
  "meta ads manager roas diagnostic sop",
]);

const LEGACY_GHOST_PARTIAL_TITLES = new Set([
  "mini bootcamp s",
  "mini bootcamp social media specialist b",
  "mini bootcamp social media specialist ba",
  "mini bootcamp social media specialist bat",
  "mini bootcamp social media specialist batc",
  "mini bootcamp social media specialist batch",
]);

const LEGACY_DUMMY_IDS = new Set([
  "lc-1",
  "lc-2",
  "lc-3",
  "lc-4",
  "lc-5",
  "lc-6",
  "item-1",
  "item-2",
  "item-3",
  "item-4",
  "item-5",
  "item-6",
  "item-7",
  "exp-1",
  "exp-2",
  "exp-3",
  "exp-4",
  "exp-5",
  "exp-6",
  "exp-7",
  "exp-8",
  "lc-sync-item-1",
  "lc-sync-item-2",
  "lc-sync-item-3",
  "lc-sync-item-4",
  "lc-sync-item-5",
  "lc-sync-item-6",
  "lc-sync-item-7",
]);

// ---------------------------------------------------------------------------
// Supabase `public.contents` sync helpers (sumber kebenaran lintas browser/akun)
// ---------------------------------------------------------------------------
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v?: string): boolean {
  return Boolean(v && UUID_RE.test(v));
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function toDbContentType(type: string): string {
  switch (type) {
    case "Course":
      return "course";
    case "Folder":
      return "folder";
    case "Quiz":
      return "quiz";
    case "Assignment":
      return "assignment";
    case "Learning Path":
      return "learning_path";
    case "Wiki":
      return "wiki";
    default:
      return "page";
  }
}

function fromDbContentType(t: string): ExplorerItemType {
  switch (t) {
    case "course":
      return "Course";
    case "folder":
      return "Folder";
    case "quiz":
      return "Quiz";
    case "assignment":
      return "Assignment";
    case "learning_path":
      return "Learning Path";
    case "wiki":
      return "Wiki";
    default:
      return "Page";
  }
}

function buildCompactChapterOutline(
  curriculum?: CourseSectionAccordion[] | null
): any[] {
  if (!Array.isArray(curriculum)) return [];
  return curriculum.map((sec) => ({
    id: sec.id,
    sectionTitle: sec.sectionTitle,
    shortTitle: sec.shortTitle,
    hidden: Boolean(sec.hidden),
    _outlineOnly: true,
    chapters: Array.isArray(sec.chapters)
      ? sec.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          type: ch.type,
          duration: ch.duration,
          completed: Boolean(ch.completed),
          locked: Boolean(ch.locked),
          points: ch.points,
          isPro: Boolean(ch.isPro),
          ...(ch.unlockPointsCost !== undefined
            ? { unlockPointsCost: ch.unlockPointsCost }
            : {}),
          ...(ch.unlockPriceIdr !== undefined
            ? { unlockPriceIdr: ch.unlockPriceIdr }
            : {}),
          hidden: Boolean(ch.hidden),
          videoUrl: ch.videoUrl ? ch.videoUrl : undefined,
        }))
      : [],
  }));
}

/** Upsert satu konten (+ kurikulumnya) ke Supabase. Mengembalikan UUID baris jika sukses. */
const inFlightPushTitles = new Set<string>();

async function pushContentToSupabase(
  item: ExplorerContentItem,
  curriculum?: CourseSectionAccordion[] | null
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const titleKey = item.title.trim().toLowerCase();
  if (!isUuid(item.id) && inFlightPushTitles.has(titleKey)) return null;
  inFlightPushTitles.add(titleKey);
  try {
    let dbId = isUuid(item.id) ? item.id : null;
    let preservedReviews: any[] = [];
    let preservedAssignedLearners: string[] = [];
    let preservedCurriculum: CourseSectionAccordion[] = [];
    const needsExistingCurriculum =
      item.type !== "Folder" &&
      (!Array.isArray(curriculum) ||
        curriculum.length === 0 ||
        curriculum.some((s: any) => s?._outlineOnly));

    if (!dbId) {
      // Cek apakah konten dengan title ini sudah tersimpan di Supabase
      const { data: existing } = await supabase
        .from("contents")
        .select(
          needsExistingCurriculum
            ? "id, settings_json"
            : ("id, reviews:settings_json->reviews, explorer_meta:settings_json->explorer_meta" as any)
        )
        .ilike("title", item.title.trim())
        .limit(1)
        .maybeSingle();
      if ((existing as any)?.id && isUuid((existing as any).id)) {
        dbId = (existing as any).id;
      } else {
        dbId = newUuid();
      }
      const reviewsArr =
        (existing as any)?.reviews ?? (existing as any)?.settings_json?.reviews;
      if (Array.isArray(reviewsArr)) {
        preservedReviews = reviewsArr;
      }
      const metaObj =
        (existing as any)?.explorer_meta ??
        (existing as any)?.settings_json?.explorer_meta;
      if (Array.isArray(metaObj?.assignedLearners)) {
        preservedAssignedLearners = metaObj.assignedLearners;
      }
      if (
        needsExistingCurriculum &&
        Array.isArray((existing as any)?.settings_json?.curriculum)
      ) {
        preservedCurriculum = (existing as any).settings_json.curriculum;
      }
    } else {
      const { data: existing } = await supabase
        .from("contents")
        .select(
          needsExistingCurriculum
            ? "settings_json"
            : ("reviews:settings_json->reviews, explorer_meta:settings_json->explorer_meta" as any)
        )
        .eq("id", dbId)
        .maybeSingle();
      const reviewsArr =
        (existing as any)?.reviews ?? (existing as any)?.settings_json?.reviews;
      if (Array.isArray(reviewsArr)) {
        preservedReviews = reviewsArr;
      }
      const metaObj =
        (existing as any)?.explorer_meta ??
        (existing as any)?.settings_json?.explorer_meta;
      if (Array.isArray(metaObj?.assignedLearners)) {
        preservedAssignedLearners = metaObj.assignedLearners;
      }
      if (
        needsExistingCurriculum &&
        Array.isArray((existing as any)?.settings_json?.curriculum)
      ) {
        preservedCurriculum = (existing as any).settings_json.curriculum;
      }
    }

    const effectiveCurriculum: CourseSectionAccordion[] =
      !needsExistingCurriculum && Array.isArray(curriculum)
        ? curriculum
        : preservedCurriculum.length > 0
        ? preservedCurriculum
        : Array.isArray(curriculum)
        ? curriculum
        : [];
    const resolvedAssignedLearners: string[] = Array.isArray(item.assignedLearners)
      ? item.assignedLearners
      : preservedAssignedLearners;

    const resolvedAccessCode = getItemAccessCode(item);
    const normalizedCohort =
      normalizeCohortProjectName(item.cohort) || "Ruang Sosmed Class";

    const upsertPayload: Record<string, any> = {
      id: dbId,
      type: toDbContentType(item.type),
      title: item.title,
      description: item.description || "",
      thumbnail_url: item.thumbnailUrl || null,
      folder_name: item.folderName || null,
      cohort: normalizedCohort,
      access_code: resolvedAccessCode,
      points_reward: 100,
      is_pro_only: Boolean(item.isPro),
      status: "published",
      urgency: item.urgency === "Urgent" ? "urgent" : "not_urgent",
      category_tags:
        item.type === "Folder"
          ? ["Folder", item.bannerAccent || "blue"]
          : [item.category || "Social Media Strategy", item.type],
      settings_json: {
        pass_mark: 80,
        pass_unit: "percent",
        max_attempts: 3,
        reviews: preservedReviews,
        curriculum: effectiveCurriculum,
        explorer_meta: {
          itemType: item.type,
          isFolder: item.type === "Folder",
          isPro: Boolean(item.isPro),
          ...(item.unlockPriceIdr !== undefined
            ? { unlockPriceIdr: item.unlockPriceIdr }
            : {}),
          ...(item.unlockPointsCost !== undefined
            ? { unlockPointsCost: item.unlockPointsCost }
            : {}),
          category: item.category,
          bannerGradient: item.bannerGradient,
          bannerAccent:
            item.bannerAccent || (item.type === "Folder" ? "blue" : undefined),
          bannerPattern: item.bannerPattern,
          language: item.language,
          cohort: normalizedCohort,
          thumbnailUrl: item.thumbnailUrl,
          folderName: item.folderName,
          accessCode: resolvedAccessCode,
          assignedLearners: resolvedAssignedLearners,
          assignedCount: resolvedAssignedLearners.length,
          chapterOutline: buildCompactChapterOutline(effectiveCurriculum),
          ...(item.wikiSections ? { wikiSections: item.wikiSections } : {}),
          ...(item.wikiAttachments
            ? { wikiAttachments: item.wikiAttachments }
            : {}),
          ...(item.wikiReadTime ? { wikiReadTime: item.wikiReadTime } : {}),
        },
      },
    };

    let { error } = await supabase
      .from("contents")
      .upsert(upsertPayload, { onConflict: "id" });

    // Fallback aman bila enum DB belum memiliki `'folder'` atau kolom `folder_name`/`access_code`/`cohort` belum dibuat
    if (error && upsertPayload.type === "folder") {
      const retryPayload: Record<string, any> = {
        ...upsertPayload,
        type: "page",
      };
      const retryRes = await supabase
        .from("contents")
        .upsert(retryPayload, { onConflict: "id" });
      error = retryRes.error;
      if (
        error &&
        (String(error.message || "").includes("folder_name") ||
          String(error.message || "").includes("access_code") ||
          String(error.message || "").includes("cohort"))
      ) {
        if (String(error.message || "").includes("folder_name")) {
          delete retryPayload.folder_name;
        }
        if (String(error.message || "").includes("access_code")) {
          delete retryPayload.access_code;
        }
        if (String(error.message || "").includes("cohort")) {
          delete retryPayload.cohort;
        }
        const retryNoCol = await supabase
          .from("contents")
          .upsert(retryPayload, { onConflict: "id" });
        error = retryNoCol.error;
      }
    } else if (
      error &&
      (String(error.message || "").includes("folder_name") ||
        String(error.message || "").includes("access_code") ||
        String(error.message || "").includes("cohort"))
    ) {
      const retryPayload: Record<string, any> = { ...upsertPayload };
      if (String(error.message || "").includes("folder_name")) {
        delete retryPayload.folder_name;
      }
      if (String(error.message || "").includes("access_code")) {
        delete retryPayload.access_code;
      }
      if (String(error.message || "").includes("cohort")) {
        delete retryPayload.cohort;
      }
      const retryNoCol = await supabase
        .from("contents")
        .upsert(retryPayload, { onConflict: "id" });
      error = retryNoCol.error;
    }

    if (error) {
      if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Gagal sync konten ke Supabase:", error.message);
      return null;
    }
    return dbId;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Gagal sync konten ke Supabase:", e);
    return null;
  } finally {
    inFlightPushTitles.delete(titleKey);
  }
}

async function getLatestSystemContentRow(
  title: string,
  selectColumns = "id"
): Promise<{ id?: string; settings_json?: any } | null> {
  const { data } = await supabase
    .from("contents")
    .select(selectColumns)
    .eq("title", title)
    .order("updated_at", { ascending: false })
    .limit(1);
  return Array.isArray(data) && data.length > 0 ? (data[0] as any) : null;
}

async function syncRewardsToSupabase(catalog: RewardItem[]): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const existing = await getLatestSystemContentRow("__SYSTEM_REWARDS_CATALOG__");

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: { rewards: catalog },
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_REWARDS_CATALOG__",
        type: "page",
        status: "published",
        description: "System storage for Rewards Catalog",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: { rewards: catalog },
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Failed to sync rewards to Supabase:", err);
  }
}

async function syncCertificateConfigToSupabase(
  globalConfig: CertificateDesignConfig,
  courseConfigs?: Record<string, CertificateDesignConfig>
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const existing = await getLatestSystemContentRow("__SYSTEM_CERTIFICATE_CONFIG__");

    const payload = {
      certificateConfig: globalConfig,
      courseCertificateConfigs: courseConfigs || {},
    };

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_CERTIFICATE_CONFIG__",
        type: "page",
        status: "published",
        description: "System storage for Certificate Configurations",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Failed to sync certificate config to Supabase:", err);
  }
}

async function syncLearnerProConfigToSupabase(
  config: LearnerProPlanConfig
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    // 1. Sinkronkan ke tabel khusus `public.learner_pro_settings` (jika migrasi 007 sudah dijalankan)
    await supabase.from("learner_pro_settings").upsert(
      {
        id: "default",
        price_label: config.priceLabel || "Rp 149.000",
        period_label: config.periodLabel || "/ month (or $14/mo)",
        qr_code_url: config.qrCodeUrl || "",
        merchant_name: config.merchantName || "Ruang Sosmed 2.0",
        bank_name: config.bankName || "BCA / Mandiri",
        account_number: config.accountNumber || "123-456-7890",
        account_holder: config.accountHolder || "PT Ruang Sosmed Indonesia",
        whatsapp_number: config.whatsappNumber || "6281234567890",
        packages: config.packages || [],
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    // Abaikan jika tabel learner_pro_settings belum dibuat, tetap fallback ke contents
  }

  try {
    // 2. Fallback sinkronisasi ke `__SYSTEM_LEARNER_PRO_CONFIG__` di `public.contents`
    const existing = await getLatestSystemContentRow("__SYSTEM_LEARNER_PRO_CONFIG__");

    const payload = { learnerProConfig: config };

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_LEARNER_PRO_CONFIG__",
        type: "page",
        status: "published",
        description: "System storage for Learner PRO & QRIS Upgrade Config",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RuangSosmed] Failed to sync learnerProConfig to Supabase:",
        err
      );
    }
  }
}

async function syncMaintenanceConfigToSupabase(config: MaintenanceConfig) {
  if (!isSupabaseConfigured) return;

  try {
    const existing = await getLatestSystemContentRow("__SYSTEM_MAINTENANCE_CONFIG__");

    const payload = { maintenanceConfig: config };

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_MAINTENANCE_CONFIG__",
        type: "page",
        status: "published",
        description: "System storage for Web Under Construction (404) Config",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RuangSosmed] Failed to sync maintenanceConfig to Supabase:",
        err
      );
    }
  }
}

async function syncLearnerPagesConfigToSupabase(
  config: LearnerPagesVisibilityConfig
) {
  if (!isSupabaseConfigured) return;

  try {
    const existing = await getLatestSystemContentRow(
      "__SYSTEM_LEARNER_PAGES_CONFIG__"
    );

    const payload = {
      learnerPagesConfig: config,
      updatedAt: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_LEARNER_PAGES_CONFIG__",
        type: "page",
        status: "published",
        description:
          "System storage for Learner Portal page visibility toggles (Wiki & Favorites)",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RuangSosmed] Failed to sync learnerPagesConfig to Supabase:",
        err
      );
    }
  }
}

async function syncCohortProjectsToSupabase(
  cohorts: CohortProjectItem[],
  deletedNames?: string[],
  updatedAtMs?: number
): Promise<void> {
  if (!isSupabaseConfigured || !Array.isArray(cohorts) || cohorts.length === 0) {
    return;
  }
  try {
    const existing = await getLatestSystemContentRow("__SYSTEM_COHORT_PROJECTS__");
    const nowMs =
      typeof updatedAtMs === "number" && Number.isFinite(updatedAtMs) && updatedAtMs > 0
        ? updatedAtMs
        : Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const payload = {
      cohortProjects: cohorts,
      ...(Array.isArray(deletedNames) && deletedNames.length > 0
        ? { deletedNames }
        : {}),
      updatedAt: nowIso,
      updatedAtMs: nowMs,
    };

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
          updated_at: nowIso,
        })
        .eq("title", "__SYSTEM_COHORT_PROJECTS__");
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_COHORT_PROJECTS__",
        type: "page",
        status: "published",
        description: "System storage for Workspace Cohort Projects",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        updated_at: nowIso,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Failed to sync cohortProjects to Supabase:", err);
  }
}

const ADMIN_NOTIFS_STORAGE_KEY = "ruang_sosmed_admin_notifications_v1";
const LEARNER_NOTIFS_STORAGE_KEY = "ruang_sosmed_learner_notifications_v1";

function readLocalTrialUsed(email?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return false;
  try {
    return (
      window.localStorage.getItem(`ruang_sosmed_trial_used_${cleanEmail}`) ===
      "true"
    );
  } catch {
    return false;
  }
}

function markLocalTrialUsed(email?: string | null): void {
  if (typeof window === "undefined") return;
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return;
  try {
    window.localStorage.setItem(
      `ruang_sosmed_trial_used_${cleanEmail}`,
      "true"
    );
  } catch {}
}

function readLocalUnlockedItems(
  email?: string | null
): LearnerUnlockedItemRecord[] {
  if (typeof window === "undefined") return [];
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return [];
  try {
    const raw = window.localStorage.getItem(
      `ruang_sosmed_unlocked_items_v1_${cleanEmail}`
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalUnlockedItems(
  email: string | null | undefined,
  items: LearnerUnlockedItemRecord[]
): void {
  if (typeof window === "undefined") return;
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return;
  try {
    window.localStorage.setItem(
      `ruang_sosmed_unlocked_items_v1_${cleanEmail}`,
      JSON.stringify(items)
    );
  } catch {}
}

function mergeUnlockedItems(
  remoteItems: LearnerUnlockedItemRecord[],
  localItems: LearnerUnlockedItemRecord[]
): LearnerUnlockedItemRecord[] {
  const byKey = new Map<string, LearnerUnlockedItemRecord>();
  [...localItems, ...remoteItems].forEach((item) => {
    const k = String(item?.itemKey || "").trim().toLowerCase();
    if (!k) return;
    byKey.set(k, { ...item, itemKey: k });
  });
  return Array.from(byKey.values());
}

export function inferLearnerNotifEventType(
  n: Partial<LearnerNotification>
): LearnerNotificationEventType {
  const titleLower = (n.title || "").toLowerCase();
  // Title patterns override stale/misclassified cached eventType in localStorage
  if (
    /materi|assignment|published|akses\s+(?:folder|materi)|modul|kurikulum/.test(
      titleLower
    )
  ) {
    return "material_added";
  }
  if (/\bpro\b|langganan|membership/.test(titleLower)) {
    return "pro_activated";
  }
  if (/balasan|diskusi|tanggapan/.test(titleLower)) {
    return "mentor_reply";
  }

  if (
    n.eventType === "pro_activated" ||
    n.eventType === "material_added" ||
    n.eventType === "mentor_reply" ||
    n.eventType === "general"
  ) {
    return n.eventType;
  }

  const haystack = `${titleLower} ${(n.body || "").toLowerCase()}`;
  if (/\bpro\b|langganan|membership/.test(haystack)) {
    return "pro_activated";
  }
  if (
    /materi|published|assigned|assignment|modul|kurikulum|kelas|course|quiz|wiki|kode akses|folder/.test(
      haystack
    )
  ) {
    return "material_added";
  }
  if (/balasan|diskusi|tanggapan|membalas/.test(haystack)) {
    return "mentor_reply";
  }
  return "general";
}

export function extractNotificationContentTitle(
  n: Partial<LearnerNotification>
): string | null {
  if (n.meta?.contentTitle?.trim()) return n.meta.contentTitle.trim();
  if (n.meta?.chapterTitle?.trim()) return n.meta.chapterTitle.trim();

  const title = (n.title || "").trim();
  const titleColonMatch =
    /^(?:📚\s*|💬\s*|📝\s*|🎓\s*)?(?:Materi\s+(?:Diperbarui|Baru\s+Tersedia|Baru\s+Ditugaskan)|New\s+Assignment|New\s+\w+\s+Published(?:\s+in\s+Catalog)?|Balasan\s+[^:]+):\s*(.+)$/i.exec(
      title
    );
  if (titleColonMatch?.[1]) {
    return titleColonMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  const unlockMatch = /🔓\s*Akses\s+(?:Folder|Materi)\s+"([^"]+)"/i.exec(title);
  if (unlockMatch?.[1]) {
    return unlockMatch[1].trim();
  }

  const body = (n.body || "").trim();
  const bodyQuoteMatch =
    /(?:pada\s+(?:kelas|materi)\s+|materi\s+(?:\w+\s+)?|folder\s+)"([^"]+)"/i.exec(
      body
    );
  if (bodyQuoteMatch?.[1]) {
    return bodyQuoteMatch[1].trim();
  }

  return null;
}

function matchesLearnerAssignedArray(
  assignedListRaw: unknown,
  learner: {
    email?: string | null;
    name?: string | null;
    username?: string | null;
  }
): boolean {
  const assignedList = Array.isArray(assignedListRaw) ? assignedListRaw : [];
  if (assignedList.length === 0) return false;

  const userEmail = (learner.email || "").toLowerCase().trim();
  const userName = (learner.name || "").toLowerCase().trim();
  const usernameLower = (learner.username || "")
    .toLowerCase()
    .replace(/^@+/, "")
    .trim();
  if (!userEmail && !userName && !usernameLower) return false;

  const nameParts = userName.split(" ").filter(Boolean);
  const userFirstLast =
    nameParts.length >= 3
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : "";

  const cohortKeys = new Set([
    "all learners",
    "batch oktober 2026",
    "ruang sosmed class",
    "creator growth lab",
  ]);

  return assignedList.some((entry) => {
    const l = String(entry || "").toLowerCase().trim();
    if (!l) return false;
    if (cohortKeys.has(l)) return true;
    if (userEmail && l === userEmail) return true;
    if (userName && l === userName) return true;
    if (userFirstLast && l === userFirstLast) return true;
    if (usernameLower && l === usernameLower) return true;
    return false;
  });
}

export function isLearnerAssignedToContentTitle(
  contentTitle: string,
  explorerItems: ExplorerContentItem[],
  learner: {
    email?: string | null;
    name?: string | null;
    username?: string | null;
  },
  courseCurriculums?: Record<string, CourseSectionAccordion[]>,
  cohortProjects?: CohortProjectItem[]
): boolean {
  const needle = (contentTitle || "").trim().toLowerCase();
  if (!needle) return false;
  if (!Array.isArray(explorerItems) || explorerItems.length === 0) {
    return false;
  }

  const sharedProjectNames = new Set(
    (cohortProjects || [])
      .filter((p) => p.shareWithAllLearners)
      .map((p) => (p.name || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const folderProjectMap = new Map<string, string>();
  explorerItems.forEach((e) => {
    if (e.type === "Folder" && e.title && e.cohort) {
      folderProjectMap.set(
        e.title.trim().toLowerCase(),
        e.cohort.trim().toLowerCase()
      );
    }
  });
  const isInSharedProject = (e: ExplorerContentItem): boolean => {
    if (sharedProjectNames.size === 0) return false;
    const itemProj = (e.cohort || "").trim().toLowerCase();
    if (itemProj && sharedProjectNames.has(itemProj)) return true;
    const fProj = e.folderName
      ? folderProjectMap.get(e.folderName.trim().toLowerCase())
      : undefined;
    return Boolean(fProj && sharedProjectNames.has(fProj));
  };

  const userEmail = (learner.email || "").toLowerCase().trim();
  const userName = (learner.name || "").toLowerCase().trim();
  const usernameLower = (learner.username || "")
    .toLowerCase()
    .replace(/^@+/, "")
    .trim();
  if (!userEmail && !userName && !usernameLower) return false;

  // Bangun himpunan nama folder yang di-assign ke learner
  const assignedFolderNames = new Set(
    explorerItems
      .filter(
        (e) =>
          e.type === "Folder" &&
          (isInSharedProject(e) ||
            matchesLearnerAssignedArray(e.assignedLearners, learner))
      )
      .map((f) => (f.title || "").trim().toLowerCase())
      .filter(Boolean)
  );

  // Resolusi judul target (bisa berupa judul Course/Folder/Content atau judul Chapter di kurikulum)
  let resolvedCourseTitle = needle;
  const directMatches = explorerItems.filter(
    (e) =>
      (e.title || "").trim().toLowerCase() === needle ||
      (e.id || "").trim().toLowerCase() === needle
  );

  if (directMatches.length === 0 && courseCurriculums) {
    for (const [courseKey, secs] of Object.entries(courseCurriculums)) {
      const hasChap = (secs || []).some(
        (s) =>
          (s.sectionTitle || "").trim().toLowerCase() === needle ||
          (s.chapters || []).some(
            (ch) => (ch.title || "").trim().toLowerCase() === needle
          )
      );
      if (hasChap) {
        resolvedCourseTitle = courseKey.trim().toLowerCase();
        break;
      }
    }
  }

  const candidateItems = explorerItems.filter(
    (e) =>
      (e.title || "").trim().toLowerCase() === resolvedCourseTitle ||
      (e.id || "").trim().toLowerCase() === resolvedCourseTitle
  );

  if (candidateItems.length > 0) {
    for (const item of candidateItems) {
      if (
        isInSharedProject(item) ||
        matchesLearnerAssignedArray(item.assignedLearners, learner)
      ) {
        return true;
      }
      const folderKey = (item.folderName || "").trim().toLowerCase();
      if (folderKey && assignedFolderNames.has(folderKey)) {
        return true;
      }
    }
  }

  // Fallback localStorage per-user assignment list (e.g. hasil redeem code terbaru)
  if (typeof window !== "undefined") {
    try {
      for (const tok of [userEmail, userName, usernameLower]) {
        if (!tok) continue;
        const raw = window.localStorage.getItem(
          `ruang_sosmed_user_assignments_${tok}`
        );
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            Array.isArray(parsed) &&
            parsed.some(
              (t) =>
                String(t || "").trim().toLowerCase() === resolvedCourseTitle ||
                String(t || "").trim().toLowerCase() === needle
            )
          ) {
            return true;
          }
        }
      }
    } catch {}
  }

  return false;
}

export function doesLearnerOwnAnyMaterial(
  explorerItems: ExplorerContentItem[],
  learner: {
    email?: string | null;
    name?: string | null;
    username?: string | null;
  },
  cohortProjects?: CohortProjectItem[]
): boolean {
  if (!Array.isArray(explorerItems) || explorerItems.length === 0) return false;
  const sharedProjectNames = new Set(
    (cohortProjects || [])
      .filter((p) => p.shareWithAllLearners)
      .map((p) => (p.name || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const folderProjectMap = new Map<string, string>();
  explorerItems.forEach((e) => {
    if (e.type === "Folder" && e.title && e.cohort) {
      folderProjectMap.set(
        e.title.trim().toLowerCase(),
        e.cohort.trim().toLowerCase()
      );
    }
  });
  const isInSharedProject = (e: ExplorerContentItem): boolean => {
    if (sharedProjectNames.size === 0) return false;
    const itemProj = (e.cohort || "").trim().toLowerCase();
    if (itemProj && sharedProjectNames.has(itemProj)) return true;
    const fProj = e.folderName
      ? folderProjectMap.get(e.folderName.trim().toLowerCase())
      : undefined;
    return Boolean(fProj && sharedProjectNames.has(fProj));
  };

  const assignedFolderNames = new Set(
    explorerItems
      .filter(
        (e) =>
          e.type === "Folder" &&
          (isInSharedProject(e) ||
            matchesLearnerAssignedArray(e.assignedLearners, learner))
      )
      .map((f) => (f.title || "").trim().toLowerCase())
      .filter(Boolean)
  );
  return explorerItems.some((e) => {
    if (e.type === "Folder") return false;
    if (
      isInSharedProject(e) ||
      matchesLearnerAssignedArray(e.assignedLearners, learner)
    ) {
      return true;
    }
    const fk = (e.folderName || "").trim().toLowerCase();
    return Boolean(fk && assignedFolderNames.has(fk));
  });
}

function normalizeLearnerNotification(
  raw: Partial<LearnerNotification> & { id?: string }
): LearnerNotification {
  const id =
    raw.id?.trim() ||
    `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: raw.title || "Notifikasi Ruang Sosmed",
    body: raw.body || "",
    time: raw.time || "Baru saja",
    unread: raw.unread ?? true,
    eventType: inferLearnerNotifEventType(raw),
    createdAt: raw.createdAt || new Date().toISOString(),
    targetLearner: raw.targetLearner,
    meta: raw.meta,
  };
}

function persistLearnerNotificationsLocal(list: LearnerNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LEARNER_NOTIFS_STORAGE_KEY,
      JSON.stringify(list.slice(0, 50))
    );
  } catch {}
}

function readLearnerNotificationsLocal(): LearnerNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEARNER_NOTIFS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => n && typeof n.id === "string")
      .map((n) => normalizeLearnerNotification(n))
      .slice(0, 50);
  } catch {
    return [];
  }
}

async function syncLearnerNotificationsToSupabase(
  notifications: LearnerNotification[]
): Promise<void> {
  if (!isSupabaseConfigured || !Array.isArray(notifications)) return;
  try {
    const trimmed = notifications.slice(0, 50);
    const existing = await getLatestSystemContentRow(
      "__SYSTEM_LEARNER_NOTIFICATIONS__"
    );
    const payload = {
      notifications: trimmed,
      updatedAt: new Date().toISOString(),
    };
    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_LEARNER_NOTIFICATIONS__",
        type: "page",
        status: "published",
        description: "System storage for Learner notifications",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch {
    // Ignore when non-staff session cannot write to __SYSTEM_* rows under RLS
  }
}

async function syncAdminNotificationsToSupabase(
  notifications: AdminActivityNotification[]
): Promise<void> {
  if (!isSupabaseConfigured || !Array.isArray(notifications)) return;
  try {
    const trimmed = notifications.slice(0, 50);
    const existing = await getLatestSystemContentRow(
      "__SYSTEM_ADMIN_NOTIFICATIONS__"
    );
    const payload = {
      notifications: trimmed,
      updatedAt: new Date().toISOString(),
    };
    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_ADMIN_NOTIFICATIONS__",
        type: "page",
        status: "published",
        description: "System storage for Admin activity notifications",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RuangSosmed] Failed to sync adminNotifications to Supabase:",
        err
      );
    }
  }
}

export function normalizeAvatarKeys(identifiers: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  username?: string | null;
}): string[] {
  const keys = new Set<string>();
  const addKey = (val?: string | null) => {
    const clean = (val || "").trim().toLowerCase();
    if (clean) keys.add(clean);
  };

  addKey(identifiers.id);
  if (identifiers.email) {
    addKey(identifiers.email);
  }
  if (identifiers.username) {
    const u = identifiers.username.trim().toLowerCase().replace(/^@+/, "");
    if (u) {
      keys.add(u);
      keys.add(`@${u}`);
    }
  }
  if (identifiers.name) {
    const cleanName = identifiers.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (cleanName) {
      keys.add(cleanName);
      // Also index First + Last name without middle initial (e.g., "Dinur M. Pradipta" -> "dinur pradipta")
      const parts = cleanName.split(" ").filter(Boolean);
      if (parts.length >= 3) {
        keys.add(`${parts[0]} ${parts[parts.length - 1]}`);
      }
    }
  }
  return Array.from(keys);
}

function lookupNormalizedRecordValue<T>(
  map: Record<string, T> | undefined,
  identifiers: (string | undefined | null)[]
): T | undefined {
  if (!map) return undefined;
  for (const rawId of identifiers) {
    if (!rawId) continue;
    const clean = rawId.trim().toLowerCase().replace(/\s+/g, " ");
    if (!clean) continue;
    if (clean in map && map[clean] !== undefined) return map[clean];
    const noAt = clean.replace(/^@+/, "");
    if (noAt in map && map[noAt] !== undefined) return map[noAt];
    if (`@${noAt}` in map && map[`@${noAt}`] !== undefined) {
      return map[`@${noAt}`];
    }
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 3) {
      const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
      if (firstLast in map && map[firstLast] !== undefined) {
        return map[firstLast];
      }
    }
  }
  return undefined;
}

async function persistUserPointsToSupabase(params: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  newPoints: number;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const cleanPoints = Math.max(0, Math.round(Number(params.newPoints) || 0));
  const cleanId = params.id?.trim() || undefined;
  const cleanEmail = params.email?.trim() || undefined;
  const cleanName = params.name?.trim() || undefined;
  const cleanUsername = params.username?.trim().replace(/^@+/, "") || undefined;

  if (typeof window !== "undefined") {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        const res = await fetch("/api/lms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: "sync_user_points",
            payload: {
              targetId: cleanId,
              targetEmail: cleanEmail,
              targetName: cleanName,
              targetUsername: cleanUsername,
              newPoints: cleanPoints,
            },
          }),
        });
        if (res.ok) {
          const parsed = await res.json().catch(() => null);
          if (parsed?.ok) return;
        }
      }
    } catch {}
  }

  try {
    let targetUuid = cleanId && isUuid(cleanId) ? cleanId : null;
    if (!targetUuid && cleanEmail) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", cleanEmail)
        .maybeSingle();
      targetUuid = prof?.id || null;
    }
    if (targetUuid) {
      await supabase.rpc("admin_adjust_learner_points", {
        p_target_id: targetUuid,
        p_new_points: cleanPoints,
      });
    }
  } catch {}
}

async function syncUserAvatarsToSupabase(
  userAvatars: Record<string, string>
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const existing = await getLatestSystemContentRow(
      "__SYSTEM_USER_AVATARS__",
      "id, settings_json"
    );

    const remoteMap =
      existing?.settings_json?.userAvatars &&
      typeof existing.settings_json.userAvatars === "object"
        ? (existing.settings_json.userAvatars as Record<string, string>)
        : {};

    const merged: Record<string, string> = { ...remoteMap };
    Object.entries(userAvatars).forEach(([k, v]) => {
      const cleanK = k.trim().toLowerCase();
      if (!cleanK) return;
      if (v && v.trim()) {
        merged[cleanK] = v.trim();
      } else {
        delete merged[cleanK];
      }
    });

    const payload = { userAvatars: merged };

    if (existing?.id) {
      await supabase
        .from("contents")
        .update({
          settings_json: payload,
          status: "published",
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contents").insert({
        id: newUuid(),
        title: "__SYSTEM_USER_AVATARS__",
        type: "page",
        status: "published",
        description: "System storage for cross-user synced profile avatars",
        urgency: "not_urgent",
        estimated_minutes: 0,
        points_reward: 0,
        settings_json: payload,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Failed to sync userAvatars to Supabase:", err);
  }
}

async function pushInboxThreadToSupabase(
  thread: DiscussionThread
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("mentor_inbox_threads").upsert(
      {
        id: thread.id,
        chapter_badge: thread.chapterBadge || "",
        title: thread.title || "",
        excerpt: thread.excerpt || "",
        replies_count: thread.repliesCount ?? thread.replies.length,
        views_count: thread.viewsCount ?? 1,
        last_reply_label: thread.lastReplyLabel || "Baru saja",
        participants: thread.participants || [],
        replies: thread.replies || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    // Ignore when migration 007 has not been applied yet
  }
}

async function deleteInboxThreadFromSupabase(
  threadId: string,
  replyId?: string
): Promise<void> {
  if (!isSupabaseConfigured || !threadId) return;

  if (typeof window !== "undefined") {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        await fetch("/api/lms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: "delete_discussion",
            payload: { threadId, replyId },
          }),
        });
      }
    } catch {}
  }

  const clientTombstoneAndDelete = async () => {
    try {
      await supabase
        .from("mentor_inbox_threads")
        .update({
          title: "__DELETED__",
          excerpt: "__DELETED__",
          replies: [],
          replies_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);
    } catch {}

    try {
      await supabase.rpc("admin_delete_discussion_thread", {
        p_thread_id: threadId,
        p_reply_id: replyId ?? null,
      });
    } catch {}

    await Promise.allSettled([
      supabase.from("mentor_inbox_threads").delete().eq("id", threadId),
      supabase.from("discussions").delete().eq("id", threadId),
      supabase.from("forum_threads").delete().eq("id", threadId),
    ]);
  };

  try {
    if (!replyId) {
      await clientTombstoneAndDelete();
      return;
    }

    const { data: row } = await supabase
      .from("mentor_inbox_threads")
      .select("id, replies")
      .eq("id", threadId)
      .maybeSingle();

    if (row) {
      const currentReplies = Array.isArray((row as any).replies)
        ? (row as any).replies
        : [];
      const filteredReplies = currentReplies.filter(
        (r: any) => String(r?.id || "") !== replyId
      );
      if (filteredReplies.length === 0) {
        await clientTombstoneAndDelete();
      } else {
        const lastReply = filteredReplies[filteredReplies.length - 1];
        await supabase
          .from("mentor_inbox_threads")
          .update({
            replies: filteredReplies,
            replies_count: filteredReplies.length,
            excerpt: String(lastReply?.message || ""),
            updated_at: new Date().toISOString(),
          })
          .eq("id", threadId);
      }
    }
  } catch {
    // Ignore when migration 007 has not been applied yet or offline
  }
}

async function pushReportedIssueToSupabase(
  issue: ReportedIssueItem
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("mentor_reported_issues").upsert(
      {
        id: issue.id,
        chapter: issue.chapter || "",
        title: issue.title || "",
        reporter: issue.reporter || "Learner",
        reported_at: issue.reportedAt || "Baru saja",
        status: issue.status || "Open",
        category: issue.category || "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    // Ignore when migration 007 has not been applied yet
  }
}

export function isGenericPlaceholderTitle(t?: string): boolean {
  if (!t) return true;
  const s = t.trim();
  return (
    /^Chapter\s+\d+$/i.test(s) ||
    /^Bab\s+\d+$/i.test(s) ||
    /^Modul\s+\d+$/i.test(s) ||
    /^Untitled/i.test(s) ||
    /^New Chapter/i.test(s) ||
    /^Pengenalan Materi$/i.test(s)
  );
}

/** Gabungkan kurikulum dari DB dengan progres lokal learner & editor (videoUrl, completed, locked, hidden, judul spesifik). */
function overlayLocalProgress(
  dbSecs: CourseSectionAccordion[],
  localSecs?: CourseSectionAccordion[] | null
): CourseSectionAccordion[] {
  if (!Array.isArray(localSecs) || localSecs.length === 0) return dbSecs;
  if (!Array.isArray(dbSecs) || dbSecs.length === 0) return localSecs;

  const localChById = new Map<string, CourseChapterItem>();
  const localChByTitle = new Map<string, CourseChapterItem>();
  const allLocalChapters: CourseChapterItem[] = [];

  for (const s of localSecs) {
    for (const c of s.chapters || []) {
      if (c.id) localChById.set(c.id, c);
      if (c.title) localChByTitle.set(c.title.trim().toLowerCase(), c);
      allLocalChapters.push(c);
    }
  }

  let chIdxCounter = 0;
  const mergedSections = dbSecs.map((s, sIdx) => {
    const localSec =
      localSecs.find(
        (ls) =>
          (ls.id && ls.id === s.id) ||
          (ls.sectionTitle &&
            s.sectionTitle &&
            ls.sectionTitle.trim().toLowerCase() ===
              s.sectionTitle.trim().toLowerCase())
      ) || localSecs[sIdx];

    const mergedChapters = (s.chapters || []).map((c, cIdx) => {
      const l =
        localChById.get(c.id) ||
        localChByTitle.get(c.title.trim().toLowerCase()) ||
        localSec?.chapters?.[cIdx] ||
        allLocalChapters[chIdxCounter];
      chIdxCounter++;

      if (!l) return c;

      // Judul: Bab spesifik selalu mengalahkan generic placeholder ("Chapter 3", "Bab 1", dll.)
      const resolvedTitle =
        !isGenericPlaceholderTitle(l.title) && isGenericPlaceholderTitle(c.title)
          ? l.title
          : !isGenericPlaceholderTitle(c.title) && isGenericPlaceholderTitle(l.title)
          ? c.title
          : l.title && l.title.length > c.title.length
          ? l.title
          : c.title || l.title || "Chapter Lesson";

      // Durasi: Durasi spesifik mengalahkan default ("10 mins", "10:00")
      const resolvedDuration =
        l.duration && l.duration !== "10 mins" && l.duration !== "10:00"
          ? l.duration
          : c.duration && c.duration !== "10 mins" && c.duration !== "10:00"
          ? c.duration
          : l.duration || c.duration || "10 mins";

      const resolvedPoints =
        l.points && l.points !== 10
          ? l.points
          : c.points && c.points !== 10
          ? c.points
          : l.points ?? c.points ?? 10;

      const resolvedVideoUrl =
        c.videoUrl && c.videoUrl.trim()
          ? c.videoUrl.trim()
          : l.videoUrl && l.videoUrl.trim()
          ? l.videoUrl.trim()
          : "";

      return {
        ...c,
        title: resolvedTitle,
        duration: resolvedDuration,
        points: resolvedPoints,
        videoUrl: resolvedVideoUrl,
        videoTitle: c.videoTitle || l.videoTitle || resolvedTitle,
        videoDuration: c.videoDuration || l.videoDuration || resolvedDuration,
        videoMode: c.videoMode || l.videoMode || "embed",
        isPro: c.isPro !== undefined ? c.isPro : (l.isPro ?? false),
        ...(l.unlockPointsCost !== undefined || c.unlockPointsCost !== undefined
          ? {
              unlockPointsCost:
                c.unlockPointsCost !== undefined
                  ? c.unlockPointsCost
                  : l.unlockPointsCost,
            }
          : {}),
        ...(l.unlockPriceIdr !== undefined || c.unlockPriceIdr !== undefined
          ? {
              unlockPriceIdr:
                c.unlockPriceIdr !== undefined
                  ? c.unlockPriceIdr
                  : l.unlockPriceIdr,
            }
          : {}),
        completed: l.completed ?? c.completed ?? false,
        locked: l.locked ?? c.locked ?? false,
        hidden: c.hidden !== undefined ? c.hidden : (l.hidden ?? false),
        hideVideoBlock:
          c.hideVideoBlock !== undefined
            ? c.hideVideoBlock
            : (l.hideVideoBlock ?? false),
        hideTextBlock:
          c.hideTextBlock !== undefined
            ? c.hideTextBlock
            : (l.hideTextBlock ?? false),
        hideCallout:
          c.hideCallout !== undefined
            ? c.hideCallout
            : (l.hideCallout ?? false),
        hideImageBlock:
          c.hideImageBlock !== undefined
            ? c.hideImageBlock
            : (l.hideImageBlock ?? false),
        hideAttachmentBlock:
          c.hideAttachmentBlock !== undefined
            ? c.hideAttachmentBlock
            : (l.hideAttachmentBlock ?? false),
        hideEmbeddedBlock:
          c.hideEmbeddedBlock !== undefined
            ? c.hideEmbeddedBlock
            : (l.hideEmbeddedBlock ?? false),
        hideDatabaseBlock:
          c.hideDatabaseBlock !== undefined
            ? c.hideDatabaseBlock
            : (l.hideDatabaseBlock ?? false),
        contentParagraphs:
          Array.isArray(l.contentParagraphs) && l.contentParagraphs.length > 0
            ? l.contentParagraphs
            : Array.isArray(c.contentParagraphs) && c.contentParagraphs.length > 0
            ? c.contentParagraphs
            : [],
        attachments:
          Array.isArray(l.attachments) && l.attachments.length > 0
            ? l.attachments
            : Array.isArray(c.attachments) && c.attachments.length > 0
            ? c.attachments
            : [],
      };
    });

    // Jika localSec memiliki bab tambahan yang belum ada di dbSec, sertakan bab tersebut
    if (localSec && Array.isArray(localSec.chapters)) {
      const dbChapterIds = new Set(s.chapters.map((ch) => ch.id));
      const dbChapterTitles = new Set(
        s.chapters.map((ch) => ch.title.trim().toLowerCase())
      );
      for (const extraCh of localSec.chapters) {
        if (
          !dbChapterIds.has(extraCh.id) &&
          !dbChapterTitles.has(extraCh.title.trim().toLowerCase()) &&
          mergedChapters.length < localSec.chapters.length
        ) {
          mergedChapters.push(extraCh);
        }
      }
    }

    return {
      ...s,
      hidden: s.hidden !== undefined ? s.hidden : (localSec?.hidden ?? false),
      chapters: mergedChapters,
    };
  });

  if (localSecs.length > dbSecs.length) {
    const existingSecIds = new Set(dbSecs.map((s) => s.id));
    for (const extraSec of localSecs.slice(dbSecs.length)) {
      if (!existingSecIds.has(extraSec.id)) {
        mergedSections.push({
          ...extraSec,
          hidden: Boolean(extraSec.hidden),
        });
      }
    }
  }

  return mergedSections;
}

function isLegacyDummyItem(item: {
  id?: string;
  title?: string;
  type?: string;
  folderName?: string;
}): boolean {
  if (!item) return true;
  if (item.id && LEGACY_DUMMY_IDS.has(item.id)) return true;
  const normalized = item.title?.trim().toLowerCase() || "";
  if (normalized && LEGACY_DUMMY_TITLES.has(normalized)) {
    return true;
  }
  const isFolder = item.type?.toLowerCase() === "folder";
  const hasFolder = Boolean(item.folderName?.trim());
  if (
    !isFolder &&
    !hasFolder &&
    normalized &&
    LEGACY_GHOST_PARTIAL_TITLES.has(normalized)
  ) {
    return true;
  }
  return false;
}

function isLegacyDummySections(sections?: CourseSectionAccordion[]): boolean {
  if (!Array.isArray(sections) || sections.length === 0) return false;
  return sections.some(
    (s) =>
      s.id === "csec-1" ||
      s.id === "csec-2" ||
      s.id === "csec-3" ||
      s.sectionTitle === "Section 1: Foundation & Brand Positioning"
  );
}

function deduplicateExplorerItems(
  items: ExplorerContentItem[]
): ExplorerContentItem[] {
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();
  const result: ExplorerContentItem[] = [];
  for (const item of items) {
    if (!item) continue;
    const titleKey = item.title ? item.title.trim().toLowerCase() : "";
    const idKey = item.id ? item.id.trim() : "";
    if (idKey && seenIds.has(idKey)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;
    if (idKey) seenIds.add(idKey);
    if (titleKey) seenTitles.add(titleKey);
    result.push(item);
  }
  return result;
}

export function normalizeCohortProjectName(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "ruang sosmed core") return "Ruang Sosmed Class";
  if (lower === "creator growth lab") return "Specialist Growth Lab";
  return trimmed;
}

/** Match an item's cohort to a target project name after alias normalization. */
export function doesItemMatchCohortProject(
  itemCohort?: string | null,
  projectName?: string | null
): boolean {
  const pNorm = normalizeCohortProjectName(projectName).toLowerCase();
  if (!pNorm) return false;
  const cNorm = normalizeCohortProjectName(itemCohort).toLowerCase();
  if (cNorm === pNorm) return true;
  if (pNorm.includes("ruang sosmed") && (!cNorm || cNorm.includes("ruang sosmed"))) {
    return true;
  }
  return false;
}

const CANONICAL_COHORT_ORDER: Record<string, number> = {
  "ruang sosmed class": 0,
  "specialist growth lab": 1,
  "mini bootcamp social media specialist": 2,
};

function dedupeCohortProjectIds(
  list: CohortProjectItem[]
): CohortProjectItem[] {
  const byName = new Map<string, CohortProjectItem & { _wasAlias: boolean; _order: number }>();

  list.forEach((c, idx) => {
    const rawTrimmed = (c.name || "").trim();
    const normalizedName = normalizeCohortProjectName(rawTrimmed);
    const nameKey = normalizedName.toLowerCase();
    if (!nameKey || nameKey === "meta ads bootcamp") return;

    const wasAlias = rawTrimmed.toLowerCase() !== nameKey;
    const existing = byName.get(nameKey);

    if (!existing) {
      byName.set(nameKey, {
        ...c,
        name: normalizedName,
        _wasAlias: wasAlias,
        _order: idx,
      });
    } else if (existing._wasAlias && !wasAlias) {
      // Prefer canonical non-alias entry (e.g., "Specialist Growth Lab" over legacy "Creator Growth Lab")
      byName.set(nameKey, {
        ...existing,
        ...c,
        name: normalizedName,
        _wasAlias: false,
        _order: existing._order,
      });
    }
  });

  const sorted = Array.from(byName.values()).sort((a, b) => {
    const rankA = CANONICAL_COHORT_ORDER[a.name.toLowerCase()] ?? 3;
    const rankB = CANONICAL_COHORT_ORDER[b.name.toLowerCase()] ?? 3;
    if (rankA !== rankB) return rankA - rankB;
    return a._order - b._order;
  });

  const usedIds = new Set<string>();
  return sorted.map(({ _wasAlias: _wa, _order: _o, ...c }, idx) => {
    const nameKey = c.name.toLowerCase();
    let nextId =
      (c.id || "").trim() || `cohort-${nameKey.replace(/[^a-z0-9]/g, "-")}`;
    if (usedIds.has(nextId)) {
      const slug = nameKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      nextId = slug ? `cohort-${slug}` : `cohort-item-${idx}`;
      let suffix = 2;
      while (usedIds.has(nextId)) {
        nextId = `${slug ? `cohort-${slug}` : "cohort-item"}-${suffix++}`;
      }
    }
    usedIds.add(nextId);
    return { ...c, id: nextId };
  });
}

function syncLearnerCatalogWithExplorer(
  explorerItems: ExplorerContentItem[],
  learnerItems: LearnerAssignedItem[],
  courseCurriculums?: Record<string, CourseSectionAccordion[]>
): LearnerAssignedItem[] {
  const cleanExplorer = deduplicateExplorerItems(
    explorerItems.filter((e) => !isLegacyDummyItem(e) && e.type !== "Folder")
  );
  return cleanExplorer.map((exp) => {
    const existing = learnerItems.find(
      (l) =>
        !isLegacyDummyItem(l) &&
        l.title.trim().toLowerCase() === exp.title.trim().toLowerCase()
    );
    const key = exp.title.trim().toLowerCase();
    const curr = courseCurriculums?.[key];
    const visibleChapters = extractVisibleChapters(curr);
    const computedPct =
      visibleChapters.length > 0
        ? Math.round(
            (visibleChapters.filter((c) => c.completed).length /
              visibleChapters.length) *
              100
          )
        : existing?.progressPercent ?? 0;

    const mappedType: ContentType =
      exp.type === "Folder" ? "Course" : exp.type;
    const stats = summarizeCurriculumStats(visibleChapters, {
      fallbackPoints: existing?.pointsReward ?? 15,
      fallbackDuration: existing?.duration,
      contentType: exp.type,
    });

    return {
      id: existing?.id || `lc-sync-${exp.id}`,
      title: exp.title,
      type: mappedType,
      urgencyBadge:
        existing?.urgencyBadge ||
        (exp.urgency === "Urgent" ? "Urgent" : "Due in 3 days"),
      isUrgentRed: existing?.isUrgentRed ?? exp.urgency === "Urgent",
      progressPercent: computedPct,
      pointsReward: stats.totalPoints,
      duration:
        visibleChapters.length > 0
          ? stats.durationLabel
          : existing?.duration || stats.durationLabel,
      skillTags:
        existing?.skillTags && existing.skillTags.length > 0
          ? existing.skillTags
          : [exp.category || "Social Media Strategy", exp.type],
      description: exp.description || existing?.description || "",
      isFavorite: existing?.isFavorite ?? false,
      isPro: typeof exp.isPro === "boolean" ? exp.isPro : existing?.isPro,
      ...(exp.unlockPriceIdr !== undefined || existing?.unlockPriceIdr !== undefined
        ? { unlockPriceIdr: exp.unlockPriceIdr ?? existing?.unlockPriceIdr }
        : {}),
      ...(exp.unlockPointsCost !== undefined || existing?.unlockPointsCost !== undefined
        ? { unlockPointsCost: exp.unlockPointsCost ?? existing?.unlockPointsCost }
        : {}),
      ...(exp.cohort || existing?.cohort ? { cohort: exp.cohort || existing?.cohort } : {}),
      thumbnailUrl: exp.thumbnailUrl || existing?.thumbnailUrl,
      bannerGradient: exp.bannerGradient || existing?.bannerGradient,
      bannerAccent: exp.bannerAccent || existing?.bannerAccent,
      bannerPattern: exp.bannerPattern,
    };
  });
}

export const DEMO_GLOBAL_STATE: PersistedGlobalState = {
  mostIssuedCount: 16,
  leaderboard: TOP_LEARNERS_DATA,
  ungradedQuizzes: INITIAL_UNGRADED_QUIZZES,
  todos: INITIAL_TODOS,
  contentStatusData: CONTENT_STATUS_DATA,
  totalContentsGaugeCount: 140,

  explorerItems: INITIAL_EXPLORER_ITEMS,
  discussionThreads: INITIAL_DISCUSSION_THREADS,
  reportedIssues: INITIAL_REPORTED_ISSUES,
  assignees: INITIAL_ASSIGNEES,
  versions: INITIAL_VERSIONS,
  workspaceCollaborators: INITIAL_WORKSPACE_COLLABORATORS,

  wikiResources: INITIAL_WIKI_RESOURCES,

  quizQuestions: INITIAL_QUIZ_QUESTIONS,
  gradingSubmissions: INITIAL_GRADING_SUBMISSIONS,

  learnerPoints: 1240,
  learnerAssignedItems: INITIAL_LEARNER_ASSIGNED_ITEMS,
  courseSections: COURSE_OVERVIEW_SECTIONS,
  courseCurriculums: {},
  learnerNotifications: INITIAL_LEARNER_NOTIFICATIONS,
  certificateUnlocked: false,

  rsLessons: RS_LEARNING_26_LESSONS_SEED,
  rsLessonNotes: {
    "cch-1":
      "Catatan Pribadi: Pastikan 3 detik pertama hook menyebutkan problem utama audiens dan janji hasil konkret di akhir video.",
    "cch-3":
      "Catatan Pribadi: Uji 2 variasi teks hook menggunakan fitur Trial Reels sebelum publish ke feed utama.",
  },
  rsLessonReviews: RS_LEARNING_26_REVIEWS_SEED,

  learnerIsPro: false,
  learnerSubscriptions: {
    "Raka Pratama": "Free",
    "Nadia Putri": "PRO",
    "Bima Sakti": "PRO",
    "Siti Sarah": "Free",
    "Dimas Anggara": "PRO",
    "Ayu Lestari": "Free",
  },
  learnerPackageId: null,
  learnerPackageName: null,
  learnerBillingCycle: null,
  learnerHasUsedTrial: false,
  learnerUnlockedItems: [],
  adminPreviewTierOverride: "auto",

  rewardsCatalog: INITIAL_REWARDS_CATALOG,
  claimedRewards: [],
  cohortProjects: INITIAL_COHORT_PROJECTS,
  certificateConfig: DEFAULT_CERTIFICATE_CONFIG,
  courseCertificateConfigs: {},
  learnerProConfig: DEFAULT_LEARNER_PRO_CONFIG,
  maintenanceConfig: DEFAULT_MAINTENANCE_CONFIG,
  learnerPagesConfig: DEFAULT_LEARNER_PAGES_CONFIG,
  userAvatars: {},
  userPointsMap: {},
  adminNotifications: [],
};

const DEFAULT_GLOBAL_STATE: PersistedGlobalState = {
  mostIssuedCount: 0,
  leaderboard: [],
  ungradedQuizzes: [],
  todos: [],
  contentStatusData: [
    { label: "Passed", percentage: 0, color: "#4F39F6", count: 0 },
    { label: "Failed", percentage: 0, color: "#EF4444", count: 0 },
    { label: "Overdue", percentage: 0, color: "#F59E0B", count: 0 },
    { label: "In Progress", percentage: 0, color: "#10B981", count: 0 },
    { label: "Not Started", percentage: 0, color: "#9CA3AF", count: 0 },
  ],
  totalContentsGaugeCount: 0,

  explorerItems: [],
  discussionThreads: [],
  reportedIssues: [],
  assignees: [],
  versions: [],
  workspaceCollaborators: INITIAL_WORKSPACE_COLLABORATORS,

  wikiResources: [],

  quizQuestions: [],
  gradingSubmissions: [],

  learnerPoints: 0,
  learnerAssignedItems: [],
  courseSections: [],
  courseCurriculums: {},
  learnerNotifications: [],
  certificateUnlocked: false,

  rsLessons: [],
  rsLessonNotes: {},
  rsLessonReviews: [],

  learnerIsPro: false,
  learnerSubscriptions: {},
  learnerPackageId: null,
  learnerPackageName: null,
  learnerBillingCycle: null,
  learnerHasUsedTrial: false,
  learnerUnlockedItems: [],
  adminPreviewTierOverride: "auto",

  rewardsCatalog: INITIAL_REWARDS_CATALOG,
  claimedRewards: [],
  cohortProjects: INITIAL_COHORT_PROJECTS,
  certificateConfig: DEFAULT_CERTIFICATE_CONFIG,
  courseCertificateConfigs: {},
  learnerProConfig: DEFAULT_LEARNER_PRO_CONFIG,
  maintenanceConfig: DEFAULT_MAINTENANCE_CONFIG,
  learnerPagesConfig: DEFAULT_LEARNER_PAGES_CONFIG,
  userAvatars: {},
  userPointsMap: {},
  adminNotifications: [],
};

interface RuangSosmedStoreContextValue extends PersistedGlobalState {
  // 1. Content Creation -> Explorer + Learner Catalog Sync
  publishContentToStudioAndCatalog: (
    type: ContentType | "Folder",
    title: string,
    description?: string,
    urgency?: "Urgent" | "Not Urgent",
    sections?: CourseSectionAccordion[],
    cohort?: string,
    folderName?: string,
    folderColor?: string,
    accessCode?: string,
    wikiMeta?: {
      category?: string;
      wikiSections?: WikiDocumentSection[];
      wikiAttachments?: WikiAttachmentFile[];
      wikiReadTime?: string;
    }
  ) => void;
  createFolder: (
    folderName: string,
    description?: string,
    cohort?: string,
    folderColor?: string,
    accessCode?: string
  ) => void;
  updateFolder: (
    folderId: string,
    oldTitle: string,
    newTitle: string,
    newDescription: string,
    folderColor?: string,
    accessCode?: string
  ) => void;
  moveToFolder: (itemId: string, folderName: string | null) => void;
  duplicateExplorerItem: (item: ExplorerContentItem) => void;
  deleteExplorerItem: (id: string) => void;
  toggleArchiveContent: (id: string) => void;
  toggleShareContent: (id: string) => void;
  updateExplorerItemThumbnail: (id: string, thumbnailUrl: string) => void;
  updateContentLanguage: (itemIdOrTitle: string, language: string) => void;
  updateExplorerItemDetails: (
    idOrTitle: string,
    patch: {
      title?: string;
      thumbnailUrl?: string;
      bannerGradient?: string;
      language?: string;
      description?: string;
      isPro?: boolean;
      unlockPriceIdr?: number;
      unlockPointsCost?: number;
      curriculum?: CourseSectionAccordion[];
    }
  ) => void;
  addWikiResourceCard: (card: WikiResourceCard) => void;
  deleteWikiResourceCard: (id: string) => void;

  // 2. Assigning Learners Flow -> Learner Assigned to You (0% Not Started) + Admin Assignees
  assignContentToLearners: (
    contentItem: ExplorerContentItem,
    learnerNames: string[],
    dueDate: string,
    batchMode: string
  ) => void;
  manageAssigneeAction: (
    learnerId: string,
    action: "remind" | "reset" | "unassign"
  ) => void;

  // 3. Active Learning & Progress Sync -> Chapter Complete -> Points + Assignee Bar + Leaderboard
  markLearnerChapterComplete: (
    chapterId: string,
    pointsReward: number
  ) => boolean;
  toggleLearnerItemFavorite: (itemId: string) => void;

  // 4. Quiz Submission -> Admin Ungraded Quiz Table + Grading Center -> Pass Unlocks Certificate & Gauge
  submitLearnerQuizOrAssignment: (payload: {
    title: string;
    submissionType: "Quiz" | "Assignment";
    openEndedAnswer: string;
    autoScorePct: number;
    learnerName?: string;
    learnerRole?: string;
  }) => void;
  evaluateSubmissionInGradingCenter: (
    submissionId: string,
    decision: "Passed" | "Revision Requested",
    updatedScores?: { id: string; awardedPoints: number }[],
    overallFeedback?: string
  ) => void;
  quickGradeDashboardQuiz: (
    quizId: string,
    score: number,
    feedback: string
  ) => void;

  // 5. Discussion & Issue Tracker Sync (Bidirectional between Classroom & Admin Content Detail)
  postDiscussionMessage: (payload: {
    threadId?: string;
    threadTitle?: string;
    chapterTitle: string;
    authorName: string;
    authorRole: string;
    authorInitials: string;
    avatarBg: string;
    avatarText: string;
    message: string;
  }) => void;
  deleteDiscussionThread: (threadId: string) => void;
  deleteDiscussionReply: (threadId: string, replyId: string) => void;
  reportContentIssueFromLearner: (
    chapterTitle: string,
    issueDescription: string,
    reporterName?: string
  ) => void;
  toggleReportedIssueStatus: (issueId: string) => void;

  // Admin To-Do & Version History helpers
  setTodos: React.Dispatch<React.SetStateAction<TodoTask[]>>;
  restoreContentVersion: (versionId: string) => void;
  markAllNotificationsRead: () => void;
  markLearnerNotificationRead: (id: string) => void;
  clearLearnerNotifications: () => void;
  addLearnerNotification: (notification: {
    id?: string;
    title: string;
    body: string;
    time?: string;
    unread?: boolean;
    eventType?: LearnerNotificationEventType;
    createdAt?: string;
    targetLearner?: string;
    meta?: LearnerNotification["meta"];
  }) => void;
  sendCollaboratorInvitation: (payload: {
    email: string;
    fullName?: string;
    role: "Mentor" | "Course Author" | "Admin";
    cohort: string;
    note?: string;
  }) => { success: boolean; message: string };
  acceptCollaboratorInvitation: (payload?: {
    email?: string;
    role?: "Admin" | "Mentor" | "Course Author";
    cohort?: string;
  }) => { success: boolean; role: string; cohort: string };
  removeWorkspaceCollaborator: (idOrEmail: string) => void;
  workspaceCollaborators: WorkspaceCollaborator[];
  resetGlobalStoreToDefaults: () => void;
  clearAllStoreData: () => void;

  // 6. Ported from `rs-learning-26`: Personal Lesson Notes & Lesson Reviews
  saveRsLessonNote: (chapterOrLessonKey: string, content: string) => void;
  submitRsLessonReview: (payload: {
    lessonKey: string;
    rating: number;
    feedback: string;
    reviewerName?: string;
    reviewerUsername?: string;
  }) => void;

  // 7. Learner-Only Subscription & Premium Access Controls (Synced between Learner & Admin)
  learnerAccess: LearnerAccessState;
  setAdminPreviewTier: (tier: "auto" | "free" | "basic" | "pro") => void;
  setLearnerProStatus: (
    isPro: boolean,
    user?: { name?: string; email?: string } | null
  ) => void;
  submitProUpgradeRequest: (params: {
    packageId?: string;
    packageName: string;
    priceLabel: string;
    buyerName?: string;
    buyerContact?: string;
    paymentMethod?: string;
    proofUrl?: string;
    billingCycle?: "3d_trial" | "7d_trial" | "30d" | "single_item";
    durationDays?: number;
    requestType?: "subscription" | "item_unlock";
    targetItemKey?: string;
    targetItemTitle?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  unlockModuleWithPoints: (params: {
    courseTitle: string;
    chapterId?: string | null;
    chapterTitle?: string;
    pointsCost: number;
  }) => Promise<{ ok: boolean; message: string; newPoints?: number }>;
  toggleStudentProByAdmin: (studentName: string, studentEmail?: string) => void;
  setStudentProTierLocal: (
    studentName: string,
    studentEmail: string | undefined,
    tier: "PRO" | "Free"
  ) => void;
  registerLearnerProfile: (profile: {
    name: string;
    email: string;
    role?: "admin" | "learner" | "mentor";
    points?: number;
    jobTitle?: string;
  }) => void;
  updateMemberAccessRole: (
    emailOrId: string,
    nextRole: "Learner" | "Mentor" | "Admin"
  ) => Promise<void>;

  // 8. Rewards Redemption System (CRUD by Admin, Redemption by Learner)
  createReward: (
    item: Omit<RewardItem, "id" | "createdAt" | "claimedCount">
  ) => void;
  updateReward: (id: string, patch: Partial<RewardItem>) => void;
  deleteReward: (id: string) => void;
  redeemReward: (
    rewardId: string,
    learnerName: string,
    learnerEmail?: string
  ) => { success: boolean; message: string; claimedItem?: ClaimedRewardRecord };

  // 9. Cohorts / Projects Management (CRUD & Color customization)
  addCohortProject: (
    name: string,
    color?: string,
    description?: string,
    shareWithAllLearners?: boolean
  ) => void;
  updateCohortProject: (
    idOrName: string,
    updates: {
      name?: string;
      color?: string;
      description?: string;
      shareWithAllLearners?: boolean;
    }
  ) => void;
  deleteCohortProject: (idOrName: string) => void;

  // 10. Multi-Course Curriculum Lookup & Live Sync
  getCourseCurriculum: (courseTitle: string) => CourseSectionAccordion[] | null;
  saveCourseCurriculumLive: (
    courseTitle: string,
    sections: CourseSectionAccordion[],
    options?: { immediate?: boolean }
  ) => void;

  // 11. Certificate Studio Design Customizer (Global & Per-Course Override)
  updateCertificateConfig: (
    patch: Partial<CertificateDesignConfig>,
    courseKey?: string
  ) => void;

  // 12. Learner PRO Upgrade Plan & QRIS Configuration (Admin Settings)
  updateLearnerProConfig: (patch: Partial<LearnerProPlanConfig>) => void;

  // 12b. Web Under Construction (404) Maintenance Mode Configuration (Admin Settings)
  updateMaintenanceConfig: (patch: Partial<MaintenanceConfig>) => void;

  // 12c. Learner Portal Pages Visibility Configuration (Wiki & Favorites)
  updateLearnerPagesConfig: (patch: Partial<LearnerPagesVisibilityConfig>) => void;

  // 13. Cross-User Avatar Synchronization Registry
  updateUserAvatarInStore: (
    avatarUrl: string,
    identifiers: {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      username?: string | null;
    }
  ) => void;
  resolveUserAvatar: (...identifiers: (string | undefined | null)[]) => string;
  resolveUserPoints: (
    ...identifiers: (string | undefined | null)[]
  ) => number | null;
  syncUserPointsBalance: (params: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    username?: string | null;
    newPoints: number;
  }) => number;

  // 14. Course & Folder Unassign / Disconnect Access Sync + Folder Access Code Redemption
  unassignLearnerFromContent: (
    contentIdOrTitle: string,
    learner:
      | {
          id?: string | null;
          name?: string | null;
          email?: string | null;
          username?: string | null;
        }
      | string
  ) => void;
  redeemFolderAccessCode: (
    code: string,
    learner: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      username?: string | null;
    }
  ) => {
    success: boolean;
    unlockType?: "folder" | "content";
    unlockedTitle?: string;
    folderTitle?: string;
    courseCount?: number;
    message: string;
  };
  updateContentAccessCode: (contentIdOrTitle: string, newCode: string) => void;

  // 15. Admin-Only Live Activity Notifications (New Member & PRO Subscriptions)
  pushAdminNotification: (params: {
    eventType: "user_registered" | "pro_subscribed";
    userName: string;
    userEmail?: string;
    packageName?: string;
    priceLabel?: string;
  }) => AdminActivityNotification;
  markAdminNotificationRead: (id: string) => void;
  markAllAdminNotificationsRead: () => void;
  clearAdminNotifications: () => void;
}

const RuangSosmedContext = createContext<RuangSosmedStoreContextValue | null>(
  null
);

export function getActiveSessionUser(): { name: string; username: string; email: string } {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("ruang_sosmed_session_user_v1");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) {
          return {
            name: u.name,
            username: u.username || u.name.toLowerCase().replace(/[^a-z0-9]/g, "."),
            email: u.email || "",
          };
        }
      }
    } catch {}
  }
  return {
    name: "Allisha",
    username: "allisha",
    email: "afterlance@gmail.com",
  };
}

export function RuangSosmedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] =
    useState<PersistedGlobalState>(DEFAULT_GLOBAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [isStaffDbSession, setIsStaffDbSession] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const learnerTierKindRef = useRef<PackageTierKind>("free");
  const curriculumPushTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const recentAvatarLocksRef = useRef<
    Map<string, { value: string; expiresAt: number }>
  >(new Map());
  const recentPointLocksRef = useRef<
    Map<string, { value: number; expiresAt: number }>
  >(new Map());
  const backfilledInitialPointsRef = useRef<boolean>(false);
  const recentAssignmentLocksRef = useRef<
    Map<string, { assignedLearners: string[]; expiresAt: number }>
  >(new Map());
  const deletedThreadIdsRef = useRef<Set<string>>(new Set());
  const deletedReplyIdsRef = useRef<Set<string>>(new Set());
  const deletedContentIdsRef = useRef<Set<string>>(new Set());
  const deletedContentTitlesRef = useRef<Map<string, number>>(new Map());
  const deletedCohortNamesRef = useRef<Set<string>>(new Set());
  const recentCohortMutationUntilRef = useRef<number>(0);
  const recentCurriculumMutationUntilRef = useRef<Map<string, number>>(new Map());
  const lastCohortMutationTsRef = useRef<number>(0);
  const lastRemoteCohortSyncSigRef = useRef<string>("");
  const recentLocalThreadPostsRef = useRef<Map<string, number>>(new Map());
  const recentLocalReplyPostsRef = useRef<Map<string, number>>(new Map());
  const knownAdminNotifIdsRef = useRef<Set<string>>(new Set());
  const adminNotifHydratedRef = useRef(false);
  const knownLearnerNotifIdsRef = useRef<Set<string>>(new Set());
  const learnerNotifHydratedRef = useRef(false);
  const prevSyncedProStatusRef = useRef<boolean | null>(null);
  const knownSyncedContentIdsRef = useRef<Set<string>>(new Set());
  const learnerContentSyncInitializedRef = useRef(false);
  const knownSyncedMentorReplyIdsRef = useRef<Set<string>>(new Set());
  const learnerReplySyncInitializedRef = useRef(false);
  const lastSyncAtRef = useRef<number>(0);
  const lastWatermarkRef = useRef<string>("");
  const syncInFlightRef = useRef<boolean>(false);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedContentsRowsRef = useRef<any[] | null>(null);
  const lastContentsWmKeyRef = useRef<string>("");
  const fetchedCurriculumTsRef = useRef<Record<string, string>>({});
  const inFlightCurriculumKeysRef = useRef<Set<string>>(new Set());
  const contentUpdatedAtRef = useRef<Record<string, string>>({});
  const isStaffSessionRef = useRef<boolean>(false);
  const realtimeControlRef = useRef<{
    connect: () => void;
    disconnect: () => void;
  } | null>(null);

  const loadCourseCurriculumOnDemand = useCallback(
    async (courseTitleOrId: string, expectedUpdatedAt?: string) => {
      if (!isSupabaseConfigured || !courseTitleOrId) return;
      const cleanArg = courseTitleOrId.trim();
      if (!cleanArg) return;
      const dedupKey = cleanArg.toLowerCase();
      if (inFlightCurriculumKeysRef.current.has(dedupKey)) return;
      inFlightCurriculumKeysRef.current.add(dedupKey);
      try {
        const query = isUuid(cleanArg)
          ? supabase
              .from("contents")
              .select("id, title, settings_json, updated_at")
              .eq("id", cleanArg)
              .maybeSingle()
          : supabase
              .from("contents")
              .select("id, title, settings_json, updated_at")
              .ilike("title", cleanArg)
              .limit(1)
              .maybeSingle();

        const { data, error } = await query;
        if (error || !data) return;

        const titleKey = String((data as any).title || cleanArg)
          .trim()
          .toLowerCase();
        const remoteUpdatedAt = String(
          (data as any).updated_at || expectedUpdatedAt || "loaded"
        );
        fetchedCurriculumTsRef.current[titleKey] = remoteUpdatedAt;
        fetchedCurriculumTsRef.current[dedupKey] = remoteUpdatedAt;
        contentUpdatedAtRef.current[titleKey] = remoteUpdatedAt;
        if ((data as any).id) {
          contentUpdatedAtRef.current[String((data as any).id)] = remoteUpdatedAt;
        }

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              `ruang_sosmed_curriculum_ts_${titleKey}`,
              remoteUpdatedAt
            );
          } catch {}
        }

        const remoteCurr = (data as any).settings_json?.curriculum;
        if (!Array.isArray(remoteCurr) || remoteCurr.length === 0) return;

        const inRecentCurrMutation =
          Date.now() <
          (recentCurriculumMutationUntilRef.current.get(titleKey) || 0);
        if (
          inRecentCurrMutation &&
          Array.isArray(stateRef.current.courseCurriculums?.[titleKey]) &&
          stateRef.current.courseCurriculums[titleKey].length > 0
        ) {
          return;
        }

        let localCurr: CourseSectionAccordion[] | null =
          stateRef.current.courseCurriculums?.[titleKey] || null;
        if (!localCurr && typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(
              `ruang_sosmed_curriculum_${titleKey}`
            );
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) localCurr = parsed;
            }
          } catch {}
        }

        const merged = overlayLocalProgress(remoteCurr, localCurr);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              `ruang_sosmed_curriculum_${titleKey}`,
              JSON.stringify(merged)
            );
          } catch {}
        }

        setState((prev) => {
          const prevStr = JSON.stringify(prev.courseCurriculums?.[titleKey] || []);
          if (prevStr === JSON.stringify(merged)) {
            return prev;
          }
          const firstKey = prev.explorerItems[0]?.title?.trim().toLowerCase() || "";
          const nextCurriculums = {
            ...(prev.courseCurriculums || {}),
            [titleKey]: merged,
          };
          const nextCatalog = syncLearnerCatalogWithExplorer(
            prev.explorerItems,
            prev.learnerAssignedItems,
            nextCurriculums
          );
          return {
            ...prev,
            courseCurriculums: nextCurriculums,
            learnerAssignedItems: nextCatalog,
            courseSections:
              titleKey === firstKey ||
              titleKey === "fundamental social media specialist"
                ? merged
                : prev.courseSections,
          };
        });
      } catch {
        // Ignore network errors on lazy curriculum load
      } finally {
        inFlightCurriculumKeysRef.current.delete(dedupKey);
      }
    },
    []
  );

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      deletedThreadIdsRef.current = readStoredIdSet(DELETED_THREADS_STORAGE_KEY);
      deletedReplyIdsRef.current = readStoredIdSet(DELETED_REPLIES_STORAGE_KEY);
      deletedContentIdsRef.current = readStoredIdSet(DELETED_CONTENT_IDS_STORAGE_KEY);
      deletedContentTitlesRef.current = readStoredTombstoneMap(
        DELETED_CONTENT_TITLES_STORAGE_KEY
      );
      deletedCohortNamesRef.current = readStoredIdSet(DELETED_COHORTS_STORAGE_KEY);
      try {
        const rawCohortTs = Number(
          window.localStorage.getItem(COHORT_PROJECTS_TS_STORAGE_KEY) || "0"
        );
        if (Number.isFinite(rawCohortTs) && rawCohortTs > 0) {
          lastCohortMutationTsRef.current = rawCohortTs;
        }
      } catch {}
      let parsed: Partial<PersistedGlobalState> | null = null;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        parsed = JSON.parse(raw);
      } else {
        // Fallback to previous storage version so user's created courses are preserved
        const v5 = window.localStorage.getItem("ruang_sosmed_2_0_clean_store_v5");
        const v4 = window.localStorage.getItem("ruang_sosmed_2_0_clean_store_v4");
        const v3 = window.localStorage.getItem("ruang_sosmed_2_0_clean_store_v3");
        const fallbackRaw = v5 || v4 || v3;
        if (fallbackRaw) {
          try {
            parsed = JSON.parse(fallbackRaw);
          } catch {}
        }
      }

      if (parsed) {
        // Bersihkan semua dummy data lama & konten yang sudah ditandai terhapus (tombstone)
        const rawExplorer = Array.isArray(parsed.explorerItems)
          ? parsed.explorerItems.filter((i) => {
              if (!i || isLegacyDummyItem(i)) return false;
              const tk = (i.title || "").trim().toLowerCase();
              if (!tk || String(i.title || "").startsWith("__DELETED__")) {
                return false;
              }
              if (i.id && deletedContentIdsRef.current.has(i.id)) return false;
              if (isContentTitleTombstoned(tk, deletedContentTitlesRef.current)) {
                return false;
              }
              return true;
            })
          : [];

        const rawExplorerTitleKeys = new Set(
          rawExplorer.map((e) => (e.title || "").trim().toLowerCase())
        );

        const rawAssigned = Array.isArray(parsed.learnerAssignedItems)
          ? parsed.learnerAssignedItems.filter((i) => {
              if (!i || isLegacyDummyItem(i)) return false;
              const tk = (i.title || "").trim().toLowerCase();
              if (!tk || String(i.title || "").startsWith("__DELETED__")) {
                return false;
              }
              if (i.id && deletedContentIdsRef.current.has(i.id)) return false;
              if (isContentTitleTombstoned(tk, deletedContentTitlesRef.current)) {
                return false;
              }
              return true;
            })
          : [];

        const mergedCurriculums: Record<string, CourseSectionAccordion[]> = {};
        if (
          parsed.courseCurriculums &&
          typeof parsed.courseCurriculums === "object"
        ) {
          Object.entries(parsed.courseCurriculums).forEach(([k, secs]) => {
            const cleanK = k.trim().toLowerCase();
            if (
              !LEGACY_DUMMY_TITLES.has(cleanK) &&
              !isContentTitleTombstoned(cleanK, deletedContentTitlesRef.current) &&
              Array.isArray(secs) &&
              !isLegacyDummySections(secs)
            ) {
              mergedCurriculums[cleanK] = secs;
            }
          });
        }

        // Muat kurikulum yang tersimpan di localStorage HANYA untuk course yang aktif di rawExplorer (jangan bangkitkan item yang sudah dihapus!)
        if (typeof window !== "undefined") {
          try {
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (
                k &&
                k.startsWith("ruang_sosmed_curriculum_") &&
                !k.startsWith("ruang_sosmed_curriculum_ts_")
              ) {
                const titleKey = k
                  .replace("ruang_sosmed_curriculum_", "")
                  .trim()
                  .toLowerCase();
                if (
                  titleKey &&
                  !LEGACY_DUMMY_TITLES.has(titleKey) &&
                  !isContentTitleTombstoned(
                    titleKey,
                    deletedContentTitlesRef.current
                  ) &&
                  rawExplorerTitleKeys.has(titleKey)
                ) {
                  const val = window.localStorage.getItem(k);
                  if (val) {
                    try {
                      const parsedSecs = JSON.parse(val);
                      if (
                        Array.isArray(parsedSecs) &&
                        !isLegacyDummySections(parsedSecs)
                      ) {
                        mergedCurriculums[titleKey] = parsedSecs;
                      }
                    } catch {}
                  }
                }
              }
            }
          } catch {}
        }

        rawExplorer.forEach((exp) => {
          const key = exp.title.trim().toLowerCase();
          if (!mergedCurriculums[key]) {
            const savedCurr = window.localStorage.getItem(
              `ruang_sosmed_curriculum_${key}`
            );
            if (savedCurr) {
              try {
                const parsedCurr = JSON.parse(savedCurr);
                if (
                  Array.isArray(parsedCurr) &&
                  !isLegacyDummySections(parsedCurr)
                ) {
                  mergedCurriculums[key] = parsedCurr;
                }
              } catch {}
            }
          }
        });

        const dedupedRawExplorer = deduplicateExplorerItems(rawExplorer).map(
          (item) => {
            const titleKey = item.title?.trim().toLowerCase() || "";
            const cachedThumb =
              typeof window !== "undefined"
                ? window.localStorage.getItem(`ruang_sosmed_thumb_${item.id}`) ||
                  window.localStorage.getItem(`ruang_sosmed_thumb_${titleKey}`)
                : null;
            let cachedWikiDoc: {
              sections?: WikiDocumentSection[];
              attachments?: WikiAttachmentFile[];
              readTime?: string;
              category?: string;
            } | null = null;
            if (item.type === "Wiki" && typeof window !== "undefined") {
              try {
                const rawWiki = window.localStorage.getItem(
                  `ruang_sosmed_wiki_doc_${titleKey}`
                );
                if (rawWiki) cachedWikiDoc = JSON.parse(rawWiki);
              } catch {}
            }
            return {
              ...item,
              category:
                item.type === "Wiki" &&
                cachedWikiDoc?.category &&
                (!item.category || item.category === "Social Media Strategy")
                  ? cachedWikiDoc.category
                  : item.category,
              wikiSections:
                item.wikiSections && item.wikiSections.length > 0
                  ? item.wikiSections
                  : cachedWikiDoc?.sections,
              wikiAttachments:
                item.wikiAttachments && item.wikiAttachments.length > 0
                  ? item.wikiAttachments
                  : cachedWikiDoc?.attachments,
              wikiReadTime: item.wikiReadTime || cachedWikiDoc?.readTime,
              thumbnailUrl: item.thumbnailUrl || cachedThumb || undefined,
              cohort:
                normalizeCohortProjectName(item.cohort) || "Ruang Sosmed Class",
            };
          }
        );

        const mergedAssigned = syncLearnerCatalogWithExplorer(
          dedupedRawExplorer,
          rawAssigned,
          mergedCurriculums
        );

        const firstCourseKey = dedupedRawExplorer[0]?.title?.trim().toLowerCase();
        const rawSections =
          Array.isArray(parsed.courseSections) &&
          !isLegacyDummySections(parsed.courseSections)
            ? parsed.courseSections
            : [];
        const mergedSections =
          (firstCourseKey && mergedCurriculums[firstCourseKey]) ||
          (dedupedRawExplorer.length > 0 ? rawSections : []);

        const rawCohorts = (() => {
          try {
            const cRaw = window.localStorage.getItem(
              "ruang_sosmed_cohort_projects_v1"
            );
            if (cRaw) {
              const cParsed = JSON.parse(cRaw);
              if (Array.isArray(cParsed) && cParsed.length > 0) {
                const filtered = cParsed.filter((c: CohortProjectItem) => {
                  const normKey = normalizeCohortProjectName(c?.name).toLowerCase();
                  return (
                    Boolean(normKey) &&
                    !deletedCohortNamesRef.current.has(normKey)
                  );
                });
                if (filtered.length > 0) return filtered;
              }
            }
          } catch {}
          const fromParsed =
            parsed.cohortProjects && parsed.cohortProjects.length > 0
              ? parsed.cohortProjects.filter((c: CohortProjectItem) => {
                  const normKey = normalizeCohortProjectName(c?.name).toLowerCase();
                  return (
                    Boolean(normKey) &&
                    !deletedCohortNamesRef.current.has(normKey)
                  );
                })
              : [];
          return fromParsed.length > 0 ? fromParsed : INITIAL_COHORT_PROJECTS;
        })();

        const mergedCohorts = dedupeCohortProjectIds(
          rawCohorts.filter(
            (c: CohortProjectItem) =>
              normalizeCohortProjectName(c.name).toLowerCase() !==
              "meta ads bootcamp"
          )
        );

        const savedRewardsCatalog = (() => {
          try {
            const rRaw = window.localStorage.getItem(
              "ruang_sosmed_rewards_catalog_v2"
            );
            if (rRaw) {
              const rParsed = JSON.parse(rRaw);
              if (Array.isArray(rParsed) && rParsed.length > 0) return rParsed;
            }
          } catch {}
          return Array.isArray(parsed.rewardsCatalog)
            ? parsed.rewardsCatalog.filter(
                (r) => !["rew-1", "rew-2", "rew-3", "rew-4"].includes(r.id)
              )
            : [];
        })();

        setState((prev) => ({
          ...prev,
          ...parsed,
          learnerIsPro: false,
          rewardsCatalog: savedRewardsCatalog,
          learnerAssignedItems: mergedAssigned,
          explorerItems: dedupedRawExplorer,
          courseSections: mergedSections,
          courseCurriculums: mergedCurriculums,
          cohortProjects: mergedCohorts,
          wikiResources: Array.isArray(parsed.wikiResources)
            ? parsed.wikiResources.filter(
                (w) => !w.id.startsWith("wiki-") || w.id.length > 8
              )
            : [],
          discussionThreads: Array.isArray(parsed.discussionThreads)
            ? filterDeletedDiscussionThreads(
                parsed.discussionThreads.filter(
                  (t) => !["thread-1", "thread-2", "thread-3"].includes(t.id)
                ),
                deletedThreadIdsRef.current,
                deletedReplyIdsRef.current
              )
            : [],
          reportedIssues: Array.isArray(parsed.reportedIssues)
            ? parsed.reportedIssues.filter(
                (iss) => !["iss-1", "iss-2", "iss-3"].includes(iss.id)
              )
            : [],
          ungradedQuizzes: Array.isArray(parsed.ungradedQuizzes)
            ? parsed.ungradedQuizzes.filter(
                (uq) => !["uq-1", "uq-2", "uq-3", "uq-4"].includes(uq.id)
              )
            : [],
          gradingSubmissions: Array.isArray(parsed.gradingSubmissions)
            ? parsed.gradingSubmissions.filter((s) => s.id !== "sub-1")
            : [],
          todos: Array.isArray(parsed.todos)
            ? parsed.todos.filter(
                (td) => !["todo-1", "todo-2", "todo-3"].includes(td.id)
              )
            : [],
          rsLessonReviews: (() => {
            const list = Array.isArray(parsed.rsLessonReviews)
              ? parsed.rsLessonReviews
              : [];

            const activeUser = getActiveSessionUser();

            return list
              .filter(
                (r: RsLessonReviewItem) =>
                  r &&
                  !String(r.id || "").startsWith("rev-seed-") &&
                  !["Nisa Amelia", "Dimas Prakoso", "Siti Sarah"].includes(
                    r.reviewerName
                  )
              )
              .map((r: RsLessonReviewItem) => {
              if (
                r.reviewerName === "Raka Pratama" ||
                r.reviewerUsername === "raka.pratama" ||
                r.feedback === "tes feedback"
              ) {
                return {
                  ...r,
                  reviewerName: activeUser.name,
                  reviewerUsername: activeUser.username,
                };
              }
              return r;
            });
          })(),
          learnerNotifications: (() => {
            const legacyExcluded = new Set([
              "notif-1",
              "notif-2",
              "notif-3",
              "notif-invite-allisha-active",
            ]);
            const rawFromParsed = Array.isArray(parsed.learnerNotifications)
              ? parsed.learnerNotifications.filter(
                  (n) => n && n.id && !legacyExcluded.has(n.id)
                )
              : [];
            const rawFromDedicatedKey = readLearnerNotificationsLocal();

            const dedupedMap = new Map<string, LearnerNotification>();
            [...rawFromDedicatedKey, ...rawFromParsed].forEach((n) => {
              if (!n || !n.id || legacyExcluded.has(n.id)) return;
              const existing = dedupedMap.get(n.id);
              const normalized = normalizeLearnerNotification(n);
              if (existing) {
                dedupedMap.set(n.id, {
                  ...existing,
                  unread: existing.unread && normalized.unread,
                });
              } else {
                dedupedMap.set(n.id, normalized);
              }
            });

            const mergedList = Array.from(dedupedMap.values())
              .sort((a, b) => {
                const ta = Date.parse(a.createdAt || "") || 0;
                const tb = Date.parse(b.createdAt || "") || 0;
                return tb - ta;
              })
              .slice(0, 50);

            mergedList.forEach((n) => knownLearnerNotifIdsRef.current.add(n.id));
            learnerNotifHydratedRef.current = true;
            return mergedList;
          })(),
          workspaceCollaborators:
            Array.isArray(parsed.workspaceCollaborators) &&
            parsed.workspaceCollaborators.length > 0
              ? parsed.workspaceCollaborators
              : INITIAL_WORKSPACE_COLLABORATORS,
          certificateConfig:
            parsed.certificateConfig ||
            (typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawCert = window.localStorage.getItem(
                      "ruang_sosmed_cert_config_v1"
                    );
                    return rawCert
                      ? JSON.parse(rawCert)
                      : DEFAULT_CERTIFICATE_CONFIG;
                  } catch {
                    return DEFAULT_CERTIFICATE_CONFIG;
                  }
                })()
              : DEFAULT_CERTIFICATE_CONFIG),
          courseCertificateConfigs:
            parsed.courseCertificateConfigs ||
            (typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawCourse = window.localStorage.getItem(
                      "ruang_sosmed_course_cert_configs_v1"
                    );
                    return rawCourse ? JSON.parse(rawCourse) : {};
                  } catch {
                    return {};
                  }
                })()
              : {}),
          learnerProConfig: {
            ...DEFAULT_LEARNER_PRO_CONFIG,
            ...(parsed.learnerProConfig || {}),
            ...(typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawPro = window.localStorage.getItem(
                      "ruang_sosmed_learner_pro_config_v1"
                    );
                    return rawPro ? JSON.parse(rawPro) : {};
                  } catch {
                    return {};
                  }
                })()
              : {}),
          },
          maintenanceConfig: {
            ...DEFAULT_MAINTENANCE_CONFIG,
            ...(parsed.maintenanceConfig || {}),
            ...(typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawMaint = window.localStorage.getItem(
                      "ruang_sosmed_maintenance_config_v1"
                    );
                    return rawMaint ? JSON.parse(rawMaint) : {};
                  } catch {
                    return {};
                  }
                })()
              : {}),
          },
          learnerPagesConfig: {
            ...DEFAULT_LEARNER_PAGES_CONFIG,
            ...(parsed.learnerPagesConfig || {}),
            ...(typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawPages = window.localStorage.getItem(
                      "ruang_sosmed_learner_pages_config_v1"
                    );
                    return rawPages ? JSON.parse(rawPages) : {};
                  } catch {
                    return {};
                  }
                })()
              : {}),
          },
          userAvatars: (() => {
            const merged: Record<string, string> = {
              ...(parsed.userAvatars || {}),
            };
            if (typeof window !== "undefined") {
              try {
                const rawAv = window.localStorage.getItem(
                  "ruang_sosmed_user_avatars_v1"
                );
                if (rawAv) {
                  Object.assign(merged, JSON.parse(rawAv));
                }
                const rawSession = window.localStorage.getItem(
                  "ruang_sosmed_session_user_v1"
                );
                if (rawSession) {
                  const s = JSON.parse(rawSession);
                  if (s?.avatarUrl && typeof s.avatarUrl === "string" && s.avatarUrl.trim()) {
                    normalizeAvatarKeys({
                      email: s.email,
                      name: s.name,
                      username: s.username,
                    }).forEach((k) => {
                      if (!merged[k]) merged[k] = s.avatarUrl.trim();
                    });
                  }
                }
              } catch {}
            }
            return merged;
          })(),
          userPointsMap: (() => {
            const merged: Record<string, number> = {
              ...(parsed.userPointsMap || {}),
            };
            if (typeof window !== "undefined") {
              try {
                const rawPts = window.localStorage.getItem(
                  "ruang_sosmed_user_points_map_v1"
                );
                if (rawPts) {
                  const parsedPts = JSON.parse(rawPts) as Record<string, unknown>;
                  Object.entries(parsedPts).forEach(([k, v]) => {
                    const num = Number(v);
                    if (k && Number.isFinite(num) && num >= 0) {
                      merged[k] = num;
                    }
                  });
                }
              } catch {}
            }
            return merged;
          })(),
          adminNotifications: [],
        }));
      } else {
        // Initial defaults
        setState((prev) => ({
          ...prev,
          learnerAssignedItems: INITIAL_LEARNER_ASSIGNED_ITEMS,
          explorerItems: INITIAL_EXPLORER_ITEMS,
          courseSections: COURSE_OVERVIEW_SECTIONS,
          courseCurriculums: {},
          cohortProjects: INITIAL_COHORT_PROJECTS,
          workspaceCollaborators: INITIAL_WORKSPACE_COLLABORATORS,
          learnerNotifications: (() => {
            const localNotifs = readLearnerNotificationsLocal();
            localNotifs.forEach((n) => knownLearnerNotifIdsRef.current.add(n.id));
            learnerNotifHydratedRef.current = true;
            return localNotifs;
          })(),
          certificateConfig:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawCert = window.localStorage.getItem(
                      "ruang_sosmed_cert_config_v1"
                    );
                    return rawCert
                      ? JSON.parse(rawCert)
                      : DEFAULT_CERTIFICATE_CONFIG;
                  } catch {
                    return DEFAULT_CERTIFICATE_CONFIG;
                  }
                })()
              : DEFAULT_CERTIFICATE_CONFIG,
          courseCertificateConfigs:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawCourse = window.localStorage.getItem(
                      "ruang_sosmed_course_cert_configs_v1"
                    );
                    return rawCourse ? JSON.parse(rawCourse) : {};
                  } catch {
                    return {};
                  }
                })()
              : {},
          learnerProConfig:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawPro = window.localStorage.getItem(
                      "ruang_sosmed_learner_pro_config_v1"
                    );
                    return rawPro
                      ? { ...DEFAULT_LEARNER_PRO_CONFIG, ...JSON.parse(rawPro) }
                      : DEFAULT_LEARNER_PRO_CONFIG;
                  } catch {
                    return DEFAULT_LEARNER_PRO_CONFIG;
                  }
                })()
              : DEFAULT_LEARNER_PRO_CONFIG,
          maintenanceConfig:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawMaint = window.localStorage.getItem(
                      "ruang_sosmed_maintenance_config_v1"
                    );
                    return rawMaint
                      ? { ...DEFAULT_MAINTENANCE_CONFIG, ...JSON.parse(rawMaint) }
                      : DEFAULT_MAINTENANCE_CONFIG;
                  } catch {
                    return DEFAULT_MAINTENANCE_CONFIG;
                  }
                })()
              : DEFAULT_MAINTENANCE_CONFIG,
          learnerPagesConfig:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawPages = window.localStorage.getItem(
                      "ruang_sosmed_learner_pages_config_v1"
                    );
                    return rawPages
                      ? { ...DEFAULT_LEARNER_PAGES_CONFIG, ...JSON.parse(rawPages) }
                      : DEFAULT_LEARNER_PAGES_CONFIG;
                  } catch {
                    return DEFAULT_LEARNER_PAGES_CONFIG;
                  }
                })()
              : DEFAULT_LEARNER_PAGES_CONFIG,
          userAvatars:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawAv = window.localStorage.getItem(
                      "ruang_sosmed_user_avatars_v1"
                    );
                    return rawAv ? JSON.parse(rawAv) : {};
                  } catch {
                    return {};
                  }
                })()
              : {},
          adminNotifications:
            typeof window !== "undefined"
              ? (() => {
                  try {
                    const rawAdm = window.localStorage.getItem(
                      ADMIN_NOTIFS_STORAGE_KEY
                    );
                    const parsedAdm = rawAdm ? JSON.parse(rawAdm) : [];
                    if (Array.isArray(parsedAdm)) {
                      parsedAdm.forEach((n: any) => {
                        if (n?.id) knownAdminNotifIdsRef.current.add(n.id);
                      });
                      adminNotifHydratedRef.current = true;
                      return parsedAdm.slice(0, 50);
                    }
                  } catch {}
                  adminNotifHydratedRef.current = true;
                  return [];
                })()
              : [],
        }));
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setHydrated(true);
    }

    // Listen to cross-tab storage updates so Admin <-> Learner tabs in the same browser sync immediately
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const nextParsed = JSON.parse(e.newValue) as Partial<PersistedGlobalState>;
          const delThreads = readStoredIdSet(DELETED_THREADS_STORAGE_KEY);
          const delReplies = readStoredIdSet(DELETED_REPLIES_STORAGE_KEY);
          deletedThreadIdsRef.current = delThreads;
          deletedReplyIdsRef.current = delReplies;
          setState((prev) => ({
            ...prev,
            ...nextParsed,
            discussionThreads: filterDeletedDiscussionThreads(
              nextParsed.discussionThreads ?? prev.discussionThreads ?? [],
              delThreads,
              delReplies
            ),
          }));
        } catch {
          // Ignore parse errors
        }
      } else if (e.key === "ruang_sosmed_learner_pages_config_v1" && e.newValue) {
        try {
          const parsedCfg = JSON.parse(e.newValue);
          setState((prev) => ({
            ...prev,
            learnerPagesConfig: {
              ...DEFAULT_LEARNER_PAGES_CONFIG,
              ...parsedCfg,
            },
          }));
        } catch {}
      } else if (
        (e.key === DELETED_THREADS_STORAGE_KEY ||
          e.key === DELETED_REPLIES_STORAGE_KEY) &&
        e.newValue
      ) {
        const delThreads = readStoredIdSet(DELETED_THREADS_STORAGE_KEY);
        const delReplies = readStoredIdSet(DELETED_REPLIES_STORAGE_KEY);
        deletedThreadIdsRef.current = delThreads;
        deletedReplyIdsRef.current = delReplies;
        setState((prev) => ({
          ...prev,
          discussionThreads: filterDeletedDiscussionThreads(
            prev.discussionThreads ?? [],
            delThreads,
            delReplies
          ),
        }));
      } else if (e.key === LEARNER_NOTIFS_STORAGE_KEY && e.newValue) {
        const nextList = readLearnerNotificationsLocal();
        const newlySeen: LearnerNotification[] = [];
        nextList.forEach((n) => {
          if (!knownLearnerNotifIdsRef.current.has(n.id)) {
            knownLearnerNotifIdsRef.current.add(n.id);
            if (n.unread) newlySeen.push(n);
          }
        });
        setState((prev) => ({
          ...prev,
          learnerNotifications: nextList,
        }));
        newlySeen.forEach((n) => {
          window.dispatchEvent(
            new CustomEvent("ruang_sosmed_learner_notif", { detail: n })
          );
        });
      }
    };
    window.addEventListener("storage", handleStorageSync);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("ruang_sosmed_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "REVIEW_SUBMITTED" && event.data.review) {
            const rev = event.data.review;
            setState((prev) => {
              const current = prev.rsLessonReviews ?? [];
              if (current.some((r) => r.id === rev.id)) return prev;
              return {
                ...prev,
                rsLessonReviews: [rev, ...current],
              };
            });
          } else if (
            event.data?.type === "AVATAR_UPDATED" &&
            event.data.userAvatars
          ) {
            const incoming = event.data.userAvatars as Record<string, string>;
            setState((prev) => {
              const merged = { ...(prev.userAvatars || {}) };
              Object.entries(incoming).forEach(([k, v]) => {
                if (v) merged[k] = v;
                else delete merged[k];
              });
              return {
                ...prev,
                userAvatars: merged,
              };
            });
          } else if (
            event.data?.type === "USER_POINTS_UPDATED" &&
            event.data.userPointsMap
          ) {
            const incoming = event.data.userPointsMap as Record<string, number>;
            const nextPointsVal = Number(event.data.newPoints);
            setState((prev) => {
              const merged = { ...(prev.userPointsMap || {}), ...incoming };
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_user_points_map_v1",
                  JSON.stringify(merged)
                );
              } catch {}
              const activeUser = getActiveSessionUser();
              const matchedSession =
                lookupNormalizedRecordValue(incoming, [
                  activeUser.email,
                  activeUser.name,
                  activeUser.username,
                ]) !== undefined;

              return {
                ...prev,
                userPointsMap: merged,
                learnerPoints:
                  matchedSession && Number.isFinite(nextPointsVal)
                    ? Math.max(0, nextPointsVal)
                    : prev.learnerPoints,
              };
            });
          } else if (
            event.data?.type === "ASSIGNMENT_UPDATED" &&
            event.data.contentTitle
          ) {
            const targetTitle = String(event.data.contentTitle)
              .trim()
              .toLowerCase();
            const targetId = String(event.data.contentId || "");
            const nextList = Array.isArray(event.data.assignedLearners)
              ? (event.data.assignedLearners as string[])
              : [];
            setState((prev) => ({
              ...prev,
              explorerItems: prev.explorerItems.map((exp) =>
                exp.id === targetId ||
                exp.title.trim().toLowerCase() === targetTitle
                  ? {
                      ...exp,
                      assignedLearners: nextList,
                      assignedCount: nextList.length,
                    }
                  : exp
              ),
            }));
          } else if (event.data?.type === "CONTENT_DELETED") {
            const delId = String(event.data.id || "").trim();
            const delTitleKey = String(event.data.titleKey || "")
              .trim()
              .toLowerCase();
            if (delId) {
              deletedContentIdsRef.current.add(delId);
              persistStoredIdSet(
                DELETED_CONTENT_IDS_STORAGE_KEY,
                deletedContentIdsRef.current
              );
            }
            if (delTitleKey) {
              deletedContentTitlesRef.current.set(
                delTitleKey,
                Date.now() + CONTENT_TOMBSTONE_TTL_MS
              );
              persistStoredTombstoneMap(
                DELETED_CONTENT_TITLES_STORAGE_KEY,
                deletedContentTitlesRef.current
              );
            }
            cachedContentsRowsRef.current = null;
            lastContentsWmKeyRef.current = "";
            lastWatermarkRef.current = "";
            cleanupLocalStorageForContent(delId, delTitleKey);

            setState((prev) => {
              const nextExplorer = prev.explorerItems.filter((item) => {
                if (delId && item.id === delId) return false;
                if (
                  delTitleKey &&
                  item.title.trim().toLowerCase() === delTitleKey
                ) {
                  return false;
                }
                return true;
              });
              const nextCurriculums = { ...(prev.courseCurriculums || {}) };
              if (delTitleKey) delete nextCurriculums[delTitleKey];
              const nextCatalog = syncLearnerCatalogWithExplorer(
                nextExplorer,
                prev.learnerAssignedItems.filter(
                  (l) =>
                    !delTitleKey ||
                    l.title.trim().toLowerCase() !== delTitleKey
                ),
                nextCurriculums
              );
              return {
                ...prev,
                explorerItems: nextExplorer,
                courseCurriculums: nextCurriculums,
                learnerAssignedItems: nextCatalog,
              };
            });
          } else if (
            event.data?.type === "LEARNER_PAGES_CONFIG_UPDATED" &&
            event.data.config
          ) {
            const incomingCfg = {
              ...DEFAULT_LEARNER_PAGES_CONFIG,
              ...event.data.config,
            } as LearnerPagesVisibilityConfig;
            try {
              window.localStorage.setItem(
                "ruang_sosmed_learner_pages_config_v1",
                JSON.stringify(incomingCfg)
              );
            } catch {}
            setState((prev) => ({
              ...prev,
              learnerPagesConfig: incomingCfg,
            }));
          } else if (
            event.data?.type === "ADMIN_NOTIFICATION_NEW" &&
            event.data.notification
          ) {
            const incoming = event.data
              .notification as AdminActivityNotification;
            if (incoming?.id) {
              knownAdminNotifIdsRef.current.add(incoming.id);
              setState((prev) => {
                const existing = prev.adminNotifications || [];
                if (existing.some((n) => n.id === incoming.id)) return prev;
                const nextList = [incoming, ...existing].slice(0, 50);
                try {
                  window.localStorage.setItem(
                    ADMIN_NOTIFS_STORAGE_KEY,
                    JSON.stringify(nextList)
                  );
                } catch {}
                return {
                  ...prev,
                  adminNotifications: nextList,
                };
              });
              window.dispatchEvent(
                new CustomEvent("ruang_sosmed_admin_notif", {
                  detail: incoming,
                })
              );
            }
          } else if (
            event.data?.type === "LEARNER_NOTIFICATION_NEW" &&
            event.data.notification
          ) {
            const incoming = normalizeLearnerNotification(
              event.data.notification as Partial<LearnerNotification>
            );
            if (incoming?.id) {
              const alreadyKnown = knownLearnerNotifIdsRef.current.has(
                incoming.id
              );
              knownLearnerNotifIdsRef.current.add(incoming.id);
              setState((prev) => {
                const existing = prev.learnerNotifications || [];
                if (existing.some((n) => n.id === incoming.id)) return prev;
                const nextList = [incoming, ...existing].slice(0, 50);
                persistLearnerNotificationsLocal(nextList);
                return {
                  ...prev,
                  learnerNotifications: nextList,
                };
              });
              if (!alreadyKnown) {
                window.dispatchEvent(
                  new CustomEvent("ruang_sosmed_learner_notif", {
                    detail: incoming,
                  })
                );
              }
            }
          } else if (
            event.data?.type === "DISCUSSION_DELETED" &&
            event.data.threadId
          ) {
            const delThreadId = String(event.data.threadId);
            const delReplyId = event.data.replyId
              ? String(event.data.replyId)
              : undefined;
            if (delReplyId) {
              deletedReplyIdsRef.current.add(delReplyId);
              persistStoredIdSet(
                DELETED_REPLIES_STORAGE_KEY,
                deletedReplyIdsRef.current
              );
              recentLocalReplyPostsRef.current.delete(delReplyId);
            } else {
              deletedThreadIdsRef.current.add(delThreadId);
              persistStoredIdSet(
                DELETED_THREADS_STORAGE_KEY,
                deletedThreadIdsRef.current
              );
              recentLocalThreadPostsRef.current.delete(delThreadId);
            }
            setState((prev) => ({
              ...prev,
              discussionThreads: filterDeletedDiscussionThreads(
                prev.discussionThreads ?? [],
                deletedThreadIdsRef.current,
                deletedReplyIdsRef.current
              ),
            }));
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener("storage", handleStorageSync);
      bc?.close();
    };
  }, []);

  // Sync registered learners & live PRO tier status from Supabase (`public.profiles` & `public.user_profiles`) into Store
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const syncRegisteredLearners = async (options?: { force?: boolean }) => {
      if (syncInFlightRef.current) return;
      if (!options?.force && typeof document !== "undefined" && document.hidden) {
        return;
      }

      syncInFlightRef.current = true;
      let latestWmSerialized = "";
      let wmContentsKey = "";
      try {
        if (!options?.force) {
          const { data: wmData, error: wmErr } = await supabase.rpc(
            "get_workspace_sync_watermark"
          );
          if (!wmErr && wmData !== null && wmData !== undefined) {
            latestWmSerialized = JSON.stringify(wmData);
            wmContentsKey = `${(wmData as any).contents_ts ?? ""}:${
              (wmData as any).contents_count ?? ""
            }`;
            if (
              latestWmSerialized !== "" &&
              latestWmSerialized === lastWatermarkRef.current
            ) {
              return;
            }
          } else if (Date.now() - lastSyncAtRef.current < 60_000) {
            return;
          }
        } else {
          const { data: wmData, error: wmErr } = await supabase.rpc(
            "get_workspace_sync_watermark"
          );
          if (!wmErr && wmData !== null && wmData !== undefined) {
            latestWmSerialized = JSON.stringify(wmData);
            wmContentsKey = `${(wmData as any).contents_ts ?? ""}:${
              (wmData as any).contents_count ?? ""
            }`;
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData?.session?.user || null;
        const authUserId = authUser?.id || null;

        let ownProfile: any = null;
        let isStaffSession = false;

        if (authUserId) {
          let ownProf: any = null;
          if (profilesHasSubDateCols && profilesHasTierV2Cols) {
            const v2Res = await supabase
              .from("profiles")
              .select(
                "id, role, full_name, email, avatar_url, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, pro_package_id, pro_billing_cycle, has_used_trial, trial_used_at, total_points, job_title"
              )
              .eq("id", authUserId)
              .maybeSingle();
            if (!v2Res.error) {
              ownProf = v2Res.data;
            } else if (isMissingTierV2ColumnError(v2Res.error)) {
              profilesHasTierV2Cols = false;
            } else if (isMissingSubDateColumnError(v2Res.error)) {
              profilesHasSubDateCols = false;
            } else {
              ownProf = v2Res.data;
            }
          }
          if (!ownProf && profilesHasSubDateCols) {
            const res = await supabase
              .from("profiles")
              .select(
                "id, role, full_name, email, avatar_url, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, total_points, job_title"
              )
              .eq("id", authUserId)
              .maybeSingle();
            if (!res.error) {
              ownProf = res.data;
            } else if (isMissingSubDateColumnError(res.error)) {
              profilesHasSubDateCols = false;
            } else {
              ownProf = res.data;
            }
          }
          if (!profilesHasSubDateCols) {
            const fallbackRes = await supabase
              .from("profiles")
              .select("id, role, full_name, email, avatar_url, subscription_tier, total_points, job_title")
              .eq("id", authUserId)
              .maybeSingle();
            ownProf = fallbackRes.data;
          }

          ownProfile = ownProf;
          const rawDbRole = String(ownProf?.role || "learner").toLowerCase();
          isStaffSession = rawDbRole === "admin" || rawDbRole === "mentor";
        }

        // Governance koneksi Realtime: hanya buka WebSocket permanen untuk Admin/Mentor
        isStaffSessionRef.current = isStaffSession;
        setIsStaffDbSession(isStaffSession);
        if (isStaffSession) {
          realtimeControlRef.current?.connect();
        } else {
          realtimeControlRef.current?.disconnect();
        }

        let contentsRes: { data: any[] | null; error: any };
        if (
          wmContentsKey &&
          wmContentsKey !== ":" &&
          wmContentsKey === lastContentsWmKeyRef.current &&
          Array.isArray(cachedContentsRowsRef.current)
        ) {
          contentsRes = { data: cachedContentsRowsRef.current, error: null };
        } else {
          const [sysRes, catRes] = await Promise.all([
            supabase
              .from("contents")
              .select("id, title, status, settings_json, created_at, updated_at")
              .like("title", "__SYSTEM_%")
              .order("created_at", { ascending: true }),
            supabase
              .from("contents")
              .select(
                "id, project_id, type, title, description, thumbnail_url, category_tags, urgency, estimated_minutes, points_reward, is_pro_only, status, author_id, folder_name, folder_id, access_code, cohort, sort_order, created_at, updated_at, explorer_meta:settings_json->explorer_meta, reviews:settings_json->reviews" as any
              )
              .in("status", ["published", "archived"])
              .not("title", "like", "__SYSTEM_%")
              .order("created_at", { ascending: true }),
          ]);

          if (!sysRes.error && !catRes.error && Array.isArray(catRes.data)) {
            const normalizedCatalog = (catRes.data as any[]).map((row) => ({
              ...row,
              __isLightweightRow: true,
              settings_json: row.settings_json || {
                explorer_meta: row.explorer_meta || {},
                reviews: Array.isArray(row.reviews) ? row.reviews : [],
                curriculum: Array.isArray(row.explorer_meta?.chapterOutline)
                  ? row.explorer_meta.chapterOutline
                  : [],
              },
            }));
            const combinedRows = [
              ...(Array.isArray(sysRes.data) ? sysRes.data : []),
              ...normalizedCatalog,
            ];
            contentsRes = { data: combinedRows, error: null };
            cachedContentsRowsRef.current = combinedRows;
            if (wmContentsKey && wmContentsKey !== ":") {
              lastContentsWmKeyRef.current = wmContentsKey;
            }
          } else {
            contentsRes = await supabase
              .from("contents")
              .select(
                "id, project_id, type, title, description, thumbnail_url, category_tags, urgency, estimated_minutes, points_reward, is_pro_only, status, settings_json, author_id, folder_name, folder_id, access_code, cohort, sort_order, created_at, updated_at"
              )
              .in("status", ["published", "archived"])
              .order("created_at", { ascending: true });
            if (!contentsRes.error && Array.isArray(contentsRes.data)) {
              cachedContentsRowsRef.current = contentsRes.data;
              if (wmContentsKey && wmContentsKey !== ":") {
                lastContentsWmKeyRef.current = wmContentsKey;
              }
            }
          }
        }

        let profilesRes: { data: any[] | null; error: any } = {
          data: ownProfile ? [ownProfile] : [],
          error: null,
        };
        let userProfilesRes: { data: any[] | null; error: any } = {
          data: [],
          error: null,
        };
        let inboxThreadsRes: { data: any[] | null; error: any } = {
          data: [],
          error: null,
        };
        let reportedIssuesRes: { data: any[] | null; error: any } = {
          data: [],
          error: null,
        };
        let learnerProSettingsRes: { data: any | null; error: any } = {
          data: null,
          error: null,
        };
        let remoteUnlockedItems: LearnerUnlockedItemRecord[] = [];
        let ownTrialRequestDetected = false;

        if (authUserId) {
          const [
            inboxRes,
            issuesRes,
            proSettingsRes,
            staffProfilesRes,
            staffUserProfilesRes,
            unlockedItemsRes,
            ownProReqsRes,
          ] = await Promise.all([
            supabase
              .from("mentor_inbox_threads")
              .select(
                "id, chapter_badge, title, excerpt, replies_count, views_count, last_reply_label, participants, replies, created_at, updated_at"
              )
              .order("updated_at", { ascending: false }),
            supabase
              .from("mentor_reported_issues")
              .select(
                "id, chapter, title, reporter, reported_at, status, category, created_at"
              )
              .order("created_at", { ascending: false }),
            supabase
              .from("learner_pro_settings")
              .select(
                "id, price_label, period_label, qr_code_url, merchant_name, bank_name, account_number, account_holder, whatsapp_number, packages, config, updated_at"
              )
              .eq("id", "default")
              .maybeSingle(),
            isStaffSession
              ? (async () => {
                  if (profilesHasSubDateCols && profilesHasTierV2Cols) {
                    const v2Res = await supabase
                      .from("profiles")
                      .select(
                        "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, pro_package_id, pro_billing_cycle, has_used_trial, trial_used_at, total_points, created_at"
                      );
                    if (!v2Res.error) return v2Res;
                    if (isMissingTierV2ColumnError(v2Res.error)) {
                      profilesHasTierV2Cols = false;
                    } else if (isMissingSubDateColumnError(v2Res.error)) {
                      profilesHasSubDateCols = false;
                    } else {
                      return v2Res;
                    }
                  }
                  if (profilesHasSubDateCols) {
                    const res = await supabase
                      .from("profiles")
                      .select(
                        "id, full_name, email, avatar_url, role, job_title, subscription_tier, pro_started_at, pro_expires_at, pro_package_name, total_points, created_at"
                      );
                    if (!res.error) return res;
                    if (isMissingSubDateColumnError(res.error)) {
                      profilesHasSubDateCols = false;
                    } else {
                      return res;
                    }
                  }
                  return supabase
                    .from("profiles")
                    .select(
                      "id, full_name, email, avatar_url, role, job_title, subscription_tier, total_points, created_at"
                    );
                })()
              : Promise.resolve({ data: ownProfile ? [ownProfile] : [], error: null }),
            isStaffSession
              ? supabase
                  .from("user_profiles")
                  .select(
                    "user_id, username, name, full_name, email, role, job_title, avatar_url, perks, updated_at"
                  )
              : supabase
                  .from("user_profiles")
                  .select(
                    "user_id, username, name, full_name, email, role, job_title, avatar_url, perks, updated_at"
                  )
                  .or(
                    `user_id.eq.${authUserId}${
                      authUser?.email ? `,email.ilike.${authUser.email}` : ""
                    }`
                  ),
            (async () => {
              try {
                const res = await supabase
                  .from("learner_unlocked_items")
                  .select(
                    "id, item_key, course_title, chapter_id, unlock_method, points_spent, price_paid_idr, created_at"
                  )
                  .eq("user_id", authUserId);
                return res;
              } catch {
                return { data: [], error: null };
              }
            })(),
            (async () => {
              try {
                const res = await supabase
                  .from("pro_upgrade_requests")
                  .select("id, package_name, price_label, status, created_at")
                  .eq("user_id", authUserId)
                  .in("status", ["pending", "approved"])
                  .limit(30);
                return res;
              } catch {
                return { data: [], error: null };
              }
            })(),
          ]);

          inboxThreadsRes = inboxRes;
          reportedIssuesRes = issuesRes;
          learnerProSettingsRes = proSettingsRes;
          profilesRes = staffProfilesRes;
          userProfilesRes = staffUserProfilesRes;
          if (!unlockedItemsRes?.error && Array.isArray(unlockedItemsRes?.data)) {
            remoteUnlockedItems = (unlockedItemsRes.data as any[]).map((row) => ({
              id: row.id,
              itemKey: row.item_key,
              courseTitle: row.course_title,
              chapterId: row.chapter_id || null,
              unlockMethod: row.unlock_method || "purchase",
              pointsSpent: Number(row.points_spent || 0),
              pricePaidIdr: Number(row.price_paid_idr || 0),
              createdAt: row.created_at,
            }));
          }
          if (!ownProReqsRes?.error && Array.isArray(ownProReqsRes?.data)) {
            ownTrialRequestDetected = (ownProReqsRes.data as any[]).some(
              (r) =>
                r.billing_cycle === "3d_trial" ||
                r.billing_cycle === "7d_trial" ||
                /3\s*hari|7\s*hari|trial|percobaan/i.test(
                  `${r.package_name || ""} ${r.price_label || ""}`
                )
            );
          }
        } else if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(ADMIN_NOTIFS_STORAGE_KEY);
          } catch {}
        }

        lastSyncAtRef.current = Date.now();
        if (latestWmSerialized) {
          lastWatermarkRef.current = latestWmSerialized;
        }

        const justPushedIds = new Set<string>();

        // 1) Admin/Mentor/Dev: dorong HANYA konten lokal baru (non-UUID) yang belum tersimpan ke Supabase & bukan item terhapus
        if (isStaffSession && !contentsRes.error) {
          const dbIds = new Set(
            (contentsRes.data || []).map((r: any) => String(r.id || ""))
          );
          const dbTitles = new Set(
            (contentsRes.data || []).map((r: any) =>
              String(r.title).trim().toLowerCase()
            )
          );
          const pending = stateRef.current.explorerItems
            .filter((i) => {
              if (!i || isLegacyDummyItem(i)) return false;
              const tk = (i.title || "").trim().toLowerCase();
              if (!tk || String(i.title || "").startsWith("__DELETED__")) {
                return false;
              }
              if (isUuid(i.id)) return false;
              if (deletedContentIdsRef.current.has(i.id)) return false;
              if (isContentTitleTombstoned(tk, deletedContentTitlesRef.current)) {
                return false;
              }
              return !dbIds.has(i.id) && !dbTitles.has(tk);
            })
            .sort((a, b) =>
              a.type === "Folder" && b.type !== "Folder"
                ? -1
                : a.type !== "Folder" && b.type === "Folder"
                ? 1
                : 0
            );
          for (const item of pending) {
            const key = item.title.trim().toLowerCase();
            const dbId = await pushContentToSupabase(
              item,
              stateRef.current.courseCurriculums?.[key] ?? null
            );
            if (dbId) {
              justPushedIds.add(dbId);
              if (dbId !== item.id) {
                setState((prev) => ({
                  ...prev,
                  explorerItems: prev.explorerItems.map((e) =>
                    e.id === item.id ? { ...e, id: dbId } : e
                  ),
                }));
              }
            }
          }
        }

        const combinedLearners: {
          id: string;
          name: string;
          email: string;
          role: string;
          jobTitle: string;
          points: number;
          avatarUrl?: string;
        }[] = [];

        const dbAvatarsFromTables: Record<string, string> = {};
        const dbPointsFromTables: Record<string, number> = {};
        const proMapFromDb: Record<string, "PRO" | "Free"> = {};
        const expiredProfileEmails = new Set<string>();
        const activeProEmailsFromProfiles = new Set<string>();

        if (Array.isArray(profilesRes.data)) {
          profilesRes.data.forEach((p: any) => {
            const rawAvatar =
              typeof p.avatar_url === "string" ? p.avatar_url.trim() : "";
            const pKeys = normalizeAvatarKeys({
              id: p.id,
              email: p.email,
              name: p.full_name || p.name,
              username: p.username,
            });
            if (rawAvatar) {
              pKeys.forEach((k) => {
                dbAvatarsFromTables[k] = rawAvatar;
              });
            }
            const pPointsVal = Math.max(0, Number(p.total_points || 0));
            pKeys.forEach((k) => {
              dbPointsFromTables[k] = pPointsVal;
            });
            if (p.email) {
              const pName = p.full_name || p.email.split("@")[0];
              const pEmailLower = String(p.email).toLowerCase().trim();
              const pRoleLower = String(p.role || "learner").toLowerCase();
              const pIsStaff = pRoleLower === "admin" || pRoleLower === "mentor";
              const pActivePro =
                pIsStaff ||
                isProSubscriptionActive(p.subscription_tier, p.pro_expires_at);
              const pExpired =
                !pIsStaff &&
                Boolean(p.pro_expires_at) &&
                !isProSubscriptionActive(p.subscription_tier, p.pro_expires_at);
              if (pExpired) {
                expiredProfileEmails.add(pEmailLower);
              }
              if (pActivePro) {
                activeProEmailsFromProfiles.add(pEmailLower);
              }
              const pTier: "PRO" | "Free" = pActivePro ? "PRO" : "Free";
              proMapFromDb[pEmailLower] = pTier;
              if (pName) {
                proMapFromDb[pName] = pTier;
                proMapFromDb[pName.toLowerCase()] = pTier;
              }

              combinedLearners.push({
                id: p.id || `prof-${p.email}`,
                name: pName,
                email: p.email,
                role: p.role || "learner",
                jobTitle: p.job_title || "Social Media Specialist",
                points: Number(p.total_points || 0),
                avatarUrl: rawAvatar || undefined,
              });
            }
          });
        }

        if (Array.isArray(userProfilesRes.data)) {
          userProfilesRes.data.forEach((up: any) => {
            const rawUpAvatar =
              typeof up.avatar_url === "string" ? up.avatar_url.trim() : "";
            if (rawUpAvatar) {
              normalizeAvatarKeys({
                id: up.user_id || up.id,
                email: up.email,
                name: up.full_name || up.name,
                username: up.username,
              }).forEach((k) => {
                dbAvatarsFromTables[k] = rawUpAvatar;
              });
            }
            const upEmailLower = String(up.email || "").toLowerCase().trim();
            const isExpiredProfile = upEmailLower
              ? expiredProfileEmails.has(upEmailLower)
              : false;
            const isActiveFromProfiles = upEmailLower
              ? activeProEmailsFromProfiles.has(upEmailLower)
              : false;
            const isProInDb =
              isActiveFromProfiles ||
              (!isExpiredProfile &&
                Boolean(up.perks?.is_pro) &&
                isProSubscriptionActive("pro", up.perks?.pro_expires_at));
            const tierValue: "PRO" | "Free" = isProInDb ? "PRO" : "Free";
            const resolvedName =
              up.full_name ||
              up.name ||
              up.username ||
              (up.email ? up.email.split("@")[0] : "");
            const upRawPts = Number(up.perks?.total_points ?? up.perks?.points ?? 0);
            const upCleanPts = Number.isFinite(upRawPts) ? Math.max(0, upRawPts) : 0;
            normalizeAvatarKeys({
              id: up.user_id || up.id,
              email: up.email,
              name: resolvedName,
              username: up.username,
            }).forEach((k) => {
              if (!(k in dbPointsFromTables)) {
                dbPointsFromTables[k] = upCleanPts;
              }
            });
            if (resolvedName) {
              proMapFromDb[resolvedName] = tierValue;
              proMapFromDb[resolvedName.toLowerCase()] = tierValue;
            }
            if (upEmailLower) {
              proMapFromDb[upEmailLower] = tierValue;
            }
            if (
              up.email &&
              !combinedLearners.some(
                (c) => c.email.toLowerCase() === up.email.toLowerCase()
              )
            ) {
              combinedLearners.push({
                id: `uprof-${up.username || up.email}`,
                name: resolvedName,
                email: up.email,
                role: up.role || "learner",
                jobTitle: up.job_title || "Social Media Specialist",
                points: upCleanPts,
                avatarUrl: rawUpAvatar || undefined,
              });
            }
          });
        }

        const learnerOnly = combinedLearners.filter(
          (u) =>
            u.role !== "admin" &&
            !u.email.toLowerCase().includes("dinur") &&
            u.email.toLowerCase() !== "admin@ruangsosmed.id"
        );

        setState((prev) => {
          const nextAssignees = [...prev.assignees];
          const nextLeaderboard = [...prev.leaderboard];
          const nextSubs: Record<string, "PRO" | "Free"> = {
            ...(prev.learnerSubscriptions ?? {}),
            ...proMapFromDb,
          };

          // Strictly derive active user's PRO tier and points ONLY from authenticated DB profile
          let activeUserPro = false;
          let activeUserPoints = 0;
          let activeUserPackageId: string | null = null;
          let activeUserPackageName: string | null = null;
          let activeUserBillingCycle:
            | "3d_trial"
            | "7d_trial"
            | "30d"
            | "custom"
            | null = null;
          let activeUserHasUsedTrial = false;
          const activeLearnerEmail = String(
            ownProfile?.email || authUser?.email || ""
          )
            .toLowerCase()
            .trim();
          const activeLearnerName = String(
            ownProfile?.full_name || authUser?.user_metadata?.full_name || ""
          ).trim();
          const mergedUnlockedForActiveUser = mergeUnlockedItems(
            remoteUnlockedItems,
            readLocalUnlockedItems(activeLearnerEmail)
          );
          if (mergedUnlockedForActiveUser.length > 0 && activeLearnerEmail) {
            persistLocalUnlockedItems(activeLearnerEmail, mergedUnlockedForActiveUser);
          }

          const activeUserKeys = normalizeAvatarKeys({
            id: ownProfile?.id || authUserId,
            email: activeLearnerEmail || getActiveSessionUser().email,
            name: activeLearnerName || getActiveSessionUser().name,
            username: getActiveSessionUser().username,
          });
          const activeLockMatch = (() => {
            const nowLockMs = Date.now();
            for (const k of activeUserKeys) {
              const lock = recentPointLocksRef.current.get(k);
              if (lock && lock.expiresAt > nowLockMs) {
                return lock.value;
              }
            }
            return null;
          })();

          if (authUserId && ownProfile) {
            const dbActivePts = Math.max(0, Number(ownProfile.total_points ?? 0));
            activeUserPoints =
              activeLockMatch !== null ? activeLockMatch : dbActivePts;
            const ownExplicitlyExpired =
              Boolean(ownProfile.pro_expires_at) &&
              !isProSubscriptionActive(
                ownProfile.subscription_tier,
                ownProfile.pro_expires_at
              );
            activeUserPro =
              isStaffSession ||
              isProSubscriptionActive(
                ownProfile.subscription_tier,
                ownProfile.pro_expires_at
              );

            const ownUpMatch = Array.isArray(userProfilesRes.data)
              ? userProfilesRes.data.find(
                  (up: any) =>
                    up.user_id === authUserId ||
                    (activeLearnerEmail &&
                      String(up.email || "").toLowerCase().trim() ===
                        activeLearnerEmail)
                )
              : null;

            if (
              !activeUserPro &&
              !ownExplicitlyExpired &&
              ownUpMatch
            ) {
              if (
                ownUpMatch?.perks?.is_pro &&
                isProSubscriptionActive("pro", ownUpMatch?.perks?.pro_expires_at)
              ) {
                activeUserPro = true;
              }
            }

            activeUserPackageId =
              ownProfile.pro_package_id ||
              ownUpMatch?.perks?.pro_package_id ||
              null;
            activeUserPackageName =
              ownProfile.pro_package_name ||
              ownUpMatch?.perks?.pro_package_name ||
              (activeUserPro ? "Pro" : null);
            const rawBillingCycle =
              ownProfile.pro_billing_cycle ||
              ownUpMatch?.perks?.pro_billing_cycle ||
              null;
            activeUserBillingCycle =
              rawBillingCycle === "3d_trial" ||
              rawBillingCycle === "7d_trial" ||
              rawBillingCycle === "30d" ||
              rawBillingCycle === "custom"
                ? rawBillingCycle
                : null;
            activeUserHasUsedTrial = Boolean(
              ownProfile.has_used_trial ||
                ownUpMatch?.perks?.has_used_trial ||
                isTrialBillingCycle(activeUserBillingCycle) ||
                ownTrialRequestDetected ||
                readLocalTrialUsed(activeLearnerEmail)
            );
            if (activeUserHasUsedTrial && activeLearnerEmail) {
              markLocalTrialUsed(activeLearnerEmail);
            }

            const ownTierLabel: "PRO" | "Free" = activeUserPro ? "PRO" : "Free";
            if (activeLearnerName) {
              nextSubs[activeLearnerName] = ownTierLabel;
              nextSubs[activeLearnerName.toLowerCase()] = ownTierLabel;
            }
            if (activeLearnerEmail) {
              nextSubs[activeLearnerEmail] = ownTierLabel;
            }
          }

          const activeLearnerIdentity = {
            email: activeLearnerEmail || getActiveSessionUser().email,
            name: activeLearnerName || getActiveSessionUser().name,
            username: getActiveSessionUser().username,
          };

          const pointsChanged = prev.learnerPoints !== activeUserPoints;
          let nextNotifications = (prev.learnerNotifications ?? []).map((n) =>
            normalizeLearnerNotification(n)
          );
          const freshlyArrivedLearnerNotifs: LearnerNotification[] = [];
          const enqueueSyncedLearnerNotif = (
            raw: Partial<LearnerNotification> & { title: string; body: string }
          ) => {
            const normalized = normalizeLearnerNotification(raw);
            if (
              !nextNotifications.some(
                (n) =>
                  n.id === normalized.id ||
                  (n.title === normalized.title && n.unread)
              )
            ) {
              nextNotifications = [normalized, ...nextNotifications].slice(
                0,
                50
              );
              if (
                !freshlyArrivedLearnerNotifs.some(
                  (f) => f.id === normalized.id
                )
              ) {
                freshlyArrivedLearnerNotifs.push(normalized);
              }
            }
          };

          if (pointsChanged && activeUserPoints > prev.learnerPoints) {
            const diff = activeUserPoints - prev.learnerPoints;
            const notifId = `pts-award-${Date.now()}-${activeUserPoints}`;
            const notifTitle = `⭐ +${diff} Poin Bintang Diterima!`;
            const notifBody = `Admin telah menambahkan ${diff} ★ pts ke akun Anda. Total saldo poin Anda sekarang ${activeUserPoints.toLocaleString()} pts.`;

            enqueueSyncedLearnerNotif({
              id: notifId,
              title: notifTitle,
              body: notifBody,
              time: "Baru saja",
              unread: true,
              eventType: "general",
            });

            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("ruang_sosmed_points_awarded", {
                  detail: {
                    addedPoints: diff,
                    newTotal: activeUserPoints,
                    learnerEmail: activeLearnerEmail,
                    learnerName: activeLearnerName || "Learner",
                  },
                })
              );
            }
          }

          if (authUserId && !isStaffSession && activeUserPro) {
            const tierStorageKey = activeLearnerEmail
              ? `ruang_sosmed_last_known_tier_${activeLearnerEmail}`
              : null;
            let lastStoredTier: string | null = null;
            if (tierStorageKey && typeof window !== "undefined") {
              try {
                lastStoredTier = window.localStorage.getItem(tierStorageKey);
              } catch {}
            }
            const flippedLive = prevSyncedProStatusRef.current === false;
            const flippedAcrossReload = lastStoredTier === "Free";
            if (flippedLive || flippedAcrossReload) {
              enqueueSyncedLearnerNotif({
                id: `notif-pro-active-${ownProfile?.id || activeLearnerEmail || "learner"}-${ownProfile?.pro_started_at || "now"}`,
                title: "⚡ Langganan Learner PRO Aktif!",
                body: `Selamat${activeLearnerName ? ` ${activeLearnerName}` : ""}! Akun Learner PRO Anda sekarang aktif. Semua modul lanjutan, template, dan sertifikat siap digunakan.`,
                time: "Baru saja",
                unread: true,
                eventType: "pro_activated",
                targetLearner:
                  activeLearnerEmail || activeLearnerName || undefined,
                meta: {
                  packageName: ownProfile?.pro_package_name || "Learner PRO",
                },
              });
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("ruang_sosmed_pro_activated", {
                    detail: {
                      learnerName: activeLearnerName || "Learner",
                      learnerEmail: activeLearnerEmail || "",
                      planName:
                        ownProfile?.pro_package_name ||
                        activeUserPackageName ||
                        "Ruang Sosmed Learning PRO",
                      packageId:
                        ownProfile?.pro_package_id || activeUserPackageId || null,
                      billingCycle:
                        ownProfile?.pro_billing_cycle ||
                        activeUserBillingCycle ||
                        null,
                      startedAt: ownProfile?.pro_started_at || null,
                      expiresAt: ownProfile?.pro_expires_at || null,
                    },
                  })
                );
              }
            }
            if (tierStorageKey && typeof window !== "undefined") {
              try {
                window.localStorage.setItem(tierStorageKey, "PRO");
              } catch {}
            }
          } else if (
            authUserId &&
            !isStaffSession &&
            !activeUserPro &&
            activeLearnerEmail &&
            typeof window !== "undefined"
          ) {
            try {
              const lowerEmail = activeLearnerEmail.toLowerCase().trim();
              window.localStorage.setItem(
                `ruang_sosmed_last_known_tier_${activeLearnerEmail}`,
                "Free"
              );
              window.localStorage.removeItem(
                `rs_welcome_pro_seen_v1::${lowerEmail}`
              );
            } catch {}
          }

          learnerOnly.forEach((lrn) => {
            const initials =
              lrn.name
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "LN";

            const lrnNameKey = lrn.name.trim().toLowerCase();
            const existingAsgIdx = nextAssignees.findIndex(
              (a) =>
                (lrn.id && a.id === lrn.id) ||
                a.name.trim().toLowerCase() === lrnNameKey
            );
            if (existingAsgIdx >= 0) {
              nextAssignees[existingAsgIdx] = {
                ...nextAssignees[existingAsgIdx],
                id: lrn.id || nextAssignees[existingAsgIdx].id,
                name: lrn.name,
                initials,
              };
            } else {
              nextAssignees.push({
                id: lrn.id,
                name: lrn.name,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
                roleBadge: "Social Media",
                completedChapters: 0,
                totalChapters: Math.max(
                  1,
                  prev.courseSections.flatMap((s) => s.chapters).length
                ),
                assignedDate: "Registered",
              });
            }

            const lrnKeys = normalizeAvatarKeys({
              id: lrn.id,
              email: lrn.email,
              name: lrn.name,
            });
            const nowLockCheckMs = Date.now();
            let lockedPts: number | null = null;
            for (const k of lrnKeys) {
              const lock = recentPointLocksRef.current.get(k);
              if (lock && lock.expiresAt > nowLockCheckMs) {
                lockedPts = lock.value;
                break;
              }
            }
            const authoritativePts =
              lockedPts !== null
                ? lockedPts
                : Math.max(0, Number(lrn.points ?? 0));

            const existingLbIdx = nextLeaderboard.findIndex(
              (l) => l.name.toLowerCase() === lrn.name.toLowerCase()
            );
            if (existingLbIdx >= 0) {
              nextLeaderboard[existingLbIdx] = {
                ...nextLeaderboard[existingLbIdx],
                role: lrn.jobTitle || nextLeaderboard[existingLbIdx].role,
                points: authoritativePts,
                initials,
              };
            } else {
              nextLeaderboard.push({
                rank: nextLeaderboard.length + 1,
                name: lrn.name,
                role: lrn.jobTitle,
                points: authoritativePts,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
              });
            }
          });

          const seenAsgIds = new Set<string>();
          const seenAsgNames = new Set<string>();
          const dedupedAssignees = nextAssignees.filter((a) => {
            const idKey = (a.id || "").trim();
            const nameKey = a.name.trim().toLowerCase();
            if (!nameKey || seenAsgNames.has(nameKey)) return false;
            if (idKey && seenAsgIds.has(idKey)) return false;
            if (idKey) seenAsgIds.add(idKey);
            seenAsgNames.add(nameKey);
            return true;
          });
          nextAssignees.splice(0, nextAssignees.length, ...dedupedAssignees);

          const sortedLb = nextLeaderboard
            .sort((a, b) => b.points - a.points)
            .map((l, idx) => ({ ...l, rank: idx + 1 }));

          // 2) Supabase `contents` (status published) = sumber kebenaran lintas browser & akun
          let nextExplorer = prev.explorerItems.filter(
            (i) => !isLegacyDummyItem(i)
          );
          const nextCurriculums: Record<string, CourseSectionAccordion[]> = {
            ...(prev.courseCurriculums || {}),
          };

          const pickLatestSystemRow = (sysTitle: string) => {
            if (!Array.isArray(contentsRes.data)) return null;
            const matches = (contentsRes.data as any[]).filter(
              (r) => r?.title === sysTitle
            );
            if (matches.length === 0) return null;
            matches.sort((a, b) => {
              const tA =
                Date.parse(
                  String(
                    a?.settings_json?.updatedAt ||
                      a?.updated_at ||
                      a?.created_at ||
                      ""
                  )
                ) || 0;
              const tB =
                Date.parse(
                  String(
                    b?.settings_json?.updatedAt ||
                      b?.updated_at ||
                      b?.created_at ||
                      ""
                  )
                ) || 0;
              return tA - tB;
            });
            return matches[matches.length - 1] || null;
          };

          // Ambil row __SYSTEM_REWARDS_CATALOG__ untuk sinkronisasi katalog hadiah lintas user
          const systemRewardsRow = pickLatestSystemRow(
            "__SYSTEM_REWARDS_CATALOG__"
          );
          let remoteRewards: RewardItem[] | null = null;
          if (Array.isArray(systemRewardsRow?.settings_json?.rewards)) {
            remoteRewards = systemRewardsRow.settings_json.rewards;
          }

          // Ambil row __SYSTEM_CERTIFICATE_CONFIG__ untuk sinkronisasi desain sertifikat (global & per-kursus)
          const systemCertRow = pickLatestSystemRow(
            "__SYSTEM_CERTIFICATE_CONFIG__"
          );
          let remoteCertConfig: CertificateDesignConfig | null = null;
          let remoteCourseCertConfigs: Record<string, CertificateDesignConfig> | null =
            null;
          if (systemCertRow?.settings_json?.certificateConfig) {
            remoteCertConfig = systemCertRow.settings_json.certificateConfig;
          }
          if (systemCertRow?.settings_json?.courseCertificateConfigs) {
            remoteCourseCertConfigs =
              systemCertRow.settings_json.courseCertificateConfigs;
          }

          // Ambil konfigurasi Learner PRO dari `public.learner_pro_settings` atau fallback `__SYSTEM_LEARNER_PRO_CONFIG__`
          const systemUserAvatarsRow = pickLatestSystemRow(
            "__SYSTEM_USER_AVATARS__"
          );
          const remoteSystemAvatars: Record<string, string> =
            systemUserAvatarsRow?.settings_json?.userAvatars &&
            typeof systemUserAvatarsRow.settings_json.userAvatars === "object"
              ? (systemUserAvatarsRow.settings_json.userAvatars as Record<
                  string,
                  string
                >)
              : {};

          const systemLearnerProRow = pickLatestSystemRow(
            "__SYSTEM_LEARNER_PRO_CONFIG__"
          );
          let remoteLearnerProConfig: LearnerProPlanConfig | null = null;
          if (
            !learnerProSettingsRes.error &&
            learnerProSettingsRes.data?.config &&
            typeof learnerProSettingsRes.data.config === "object"
          ) {
            const dbRow = learnerProSettingsRes.data as any;
            remoteLearnerProConfig = {
              ...DEFAULT_LEARNER_PRO_CONFIG,
              ...dbRow.config,
              priceLabel:
                dbRow.config.priceLabel ||
                dbRow.price_label ||
                DEFAULT_LEARNER_PRO_CONFIG.priceLabel,
              periodLabel:
                dbRow.config.periodLabel ||
                dbRow.period_label ||
                DEFAULT_LEARNER_PRO_CONFIG.periodLabel,
              qrCodeUrl: dbRow.config.qrCodeUrl ?? dbRow.qr_code_url ?? "",
              packages: Array.isArray(dbRow.packages) && dbRow.packages.length > 0
                ? dbRow.packages
                : dbRow.config.packages,
            };
          } else if (systemLearnerProRow?.settings_json?.learnerProConfig) {
            remoteLearnerProConfig = {
              ...DEFAULT_LEARNER_PRO_CONFIG,
              ...systemLearnerProRow.settings_json.learnerProConfig,
            };
          }

          const systemMaintenanceRow = pickLatestSystemRow(
            "__SYSTEM_MAINTENANCE_CONFIG__"
          );
          const remoteMaintenanceConfig: MaintenanceConfig | null =
            systemMaintenanceRow?.settings_json?.maintenanceConfig
              ? {
                  ...DEFAULT_MAINTENANCE_CONFIG,
                  ...systemMaintenanceRow.settings_json.maintenanceConfig,
                }
              : null;

          const systemLearnerPagesRow = pickLatestSystemRow(
            "__SYSTEM_LEARNER_PAGES_CONFIG__"
          );
          const remoteLearnerPagesConfig: LearnerPagesVisibilityConfig | null =
            systemLearnerPagesRow?.settings_json?.learnerPagesConfig
              ? {
                  ...DEFAULT_LEARNER_PAGES_CONFIG,
                  ...systemLearnerPagesRow.settings_json.learnerPagesConfig,
                }
              : null;

          const systemCohortProjectsRow = pickLatestSystemRow(
            "__SYSTEM_COHORT_PROJECTS__"
          );
          const remoteCohortProjects: CohortProjectItem[] | null = Array.isArray(
            systemCohortProjectsRow?.settings_json?.cohortProjects
          )
            ? systemCohortProjectsRow.settings_json.cohortProjects
            : null;
          const remoteCohortUpdatedAtMs = (() => {
            const explicitMs = Number(
              systemCohortProjectsRow?.settings_json?.updatedAtMs || 0
            );
            if (Number.isFinite(explicitMs) && explicitMs > 0) return explicitMs;
            const parsed = Date.parse(
              String(
                systemCohortProjectsRow?.settings_json?.updatedAt ||
                  systemCohortProjectsRow?.updated_at ||
                  systemCohortProjectsRow?.created_at ||
                  ""
              )
            );
            return Number.isFinite(parsed) ? parsed : 0;
          })();
          const remoteDeletedCohorts: string[] = Array.isArray(
            systemCohortProjectsRow?.settings_json?.deletedNames
          )
            ? systemCohortProjectsRow.settings_json.deletedNames
            : [];
          if (remoteDeletedCohorts.length > 0) {
            const activeRemoteKeys = new Set(
              (remoteCohortProjects || [])
                .map((c) => (c?.name || "").trim().toLowerCase())
                .filter(Boolean)
            );
            remoteDeletedCohorts.forEach((dn) => {
              const key = String(dn || "").trim().toLowerCase();
              if (key && !activeRemoteKeys.has(key)) {
                deletedCohortNamesRef.current.add(key);
              }
            });
            persistStoredIdSet(
              DELETED_COHORTS_STORAGE_KEY,
              deletedCohortNamesRef.current
            );
          }

          const systemAdminNotifsRow = pickLatestSystemRow(
            "__SYSTEM_ADMIN_NOTIFICATIONS__"
          );
          const remoteAdminNotifs: AdminActivityNotification[] = Array.isArray(
            systemAdminNotifsRow?.settings_json?.notifications
          )
            ? (systemAdminNotifsRow.settings_json
                .notifications as AdminActivityNotification[])
            : [];

          const systemLearnerNotifsRow = pickLatestSystemRow(
            "__SYSTEM_LEARNER_NOTIFICATIONS__"
          );
          const remoteLearnerNotifs: LearnerNotification[] = Array.isArray(
            systemLearnerNotifsRow?.settings_json?.notifications
          )
            ? (
                systemLearnerNotifsRow.settings_json
                  .notifications as Partial<LearnerNotification>[]
              ).map((n) => normalizeLearnerNotification(n))
            : [];

          const newlyObservedContentKeys: string[] = [];
          const newlyObservedReplyIds: string[] = [];

          if (!contentsRes.error && Array.isArray(contentsRes.data)) {
            const dbRows = (contentsRes.data as any[]).filter((r) => {
              if (!r || !r.title) return false;
              const rawTitle = String(r.title);
              if (
                rawTitle.startsWith("__SYSTEM_") ||
                rawTitle.startsWith("__DELETED__")
              ) {
                return false;
              }
              if (r.status === "draft") return false;
              if (r.id && deletedContentIdsRef.current.has(String(r.id))) {
                return false;
              }
              const tk = rawTitle.trim().toLowerCase();
              if (isContentTitleTombstoned(tk, deletedContentTitlesRef.current)) {
                return false;
              }
              const meta = r.settings_json?.explorer_meta || {};
              const isFolderRow =
                r.type === "folder" ||
                meta.isFolder === true ||
                meta.itemType === "Folder";
              const rowFolderName = String(
                r.folder_name || meta.folderName || ""
              ).trim();
              return !isLegacyDummyItem({
                id: r.id,
                title: r.title,
                type: isFolderRow ? "Folder" : r.type,
                folderName: rowFolderName,
              });
            });
            const dbIds = new Set(dbRows.map((r) => r.id));
            const dbTitles = new Set(
              dbRows.map((r) => String(r.title).trim().toLowerCase())
            );

            const dbExplorer: ExplorerContentItem[] = dbRows.map((r) => {
              const meta = r.settings_json?.explorer_meta || {};
              const isFolderRow =
                r.type === "folder" ||
                meta.isFolder === true ||
                meta.itemType === "Folder" ||
                (Array.isArray(r.category_tags) &&
                  r.category_tags.includes("Folder"));
              const type: ExplorerItemType = isFolderRow
                ? "Folder"
                : fromDbContentType(r.type);
              const isFolder = type === "Folder";
              const cfg = isFolder
                ? {
                    colorHex: "#4F39F6",
                    bgTint: "rgba(79, 57, 246, 0.10)",
                    borderTint: "rgba(79, 57, 246, 0.22)",
                    description: "Folder materi pembelajaran",
                  }
                : CONTENT_TYPE_CONFIGS[type as ContentType];
              const local = prev.explorerItems.find(
                (e) =>
                  e.id === r.id ||
                  e.title.trim().toLowerCase() ===
                    String(r.title).trim().toLowerCase()
              );
              const key = String(r.title).trim().toLowerCase();
              const rowUpdatedAt = String(r.updated_at || "");
              if (rowUpdatedAt) {
                contentUpdatedAtRef.current[key] = rowUpdatedAt;
                if (r.id) contentUpdatedAtRef.current[String(r.id)] = rowUpdatedAt;
              }
              const dbCurr = r.settings_json?.curriculum;
              const localCurr =
                prev.courseCurriculums?.[key] ||
                (typeof window !== "undefined"
                  ? (() => {
                      try {
                        const raw = window.localStorage.getItem(
                          `ruang_sosmed_curriculum_${key}`
                        );
                        return raw ? JSON.parse(raw) : null;
                      } catch {
                        return null;
                      }
                    })()
                  : null);
              const cachedCurrTs =
                fetchedCurriculumTsRef.current[key] ||
                (typeof window !== "undefined"
                  ? window.localStorage.getItem(
                      `ruang_sosmed_curriculum_ts_${key}`
                    )
                  : null);

              const cachedThumb =
                typeof window !== "undefined"
                  ? window.localStorage.getItem(`ruang_sosmed_thumb_${r.id}`) ||
                    window.localStorage.getItem(`ruang_sosmed_thumb_${key}`)
                  : null;

              const inRecentCurrMutation =
                Date.now() <
                (recentCurriculumMutationUntilRef.current.get(key) || 0);

              if (
                inRecentCurrMutation &&
                Array.isArray(prev.courseCurriculums?.[key]) &&
                prev.courseCurriculums[key].length > 0
              ) {
                nextCurriculums[key] = prev.courseCurriculums[key];
              } else if (Array.isArray(dbCurr) && dbCurr.length > 0) {
                const rawMerged = overlayLocalProgress(dbCurr, localCurr);
                const hasFreshLocalBody = Boolean(
                  r.__isLightweightRow &&
                    cachedCurrTs &&
                    rowUpdatedAt &&
                    cachedCurrTs === rowUpdatedAt &&
                    Array.isArray(localCurr) &&
                    localCurr.length > 0 &&
                    !localCurr.some((sec: any) => Boolean(sec?._outlineOnly))
                );
                const merged = hasFreshLocalBody
                  ? (rawMerged.map((sec: any) => {
                      if (!sec || !sec._outlineOnly) return sec;
                      const rest = { ...sec };
                      delete rest._outlineOnly;
                      return rest;
                    }) as CourseSectionAccordion[])
                  : rawMerged;
                nextCurriculums[key] = merged;

                if (r.__isLightweightRow) {
                  // Row katalog ringan hanya berisi outline bab; muat isi penuh secara lazy untuk course utama bila belum ter-cache atau ada pembaruan
                  const needsRefreshFromDb =
                    !isFolder &&
                    (!cachedCurrTs || (rowUpdatedAt && cachedCurrTs !== rowUpdatedAt));
                  const isPrimaryCourse =
                    key === "fundamental social media specialist" ||
                    dbRows.findIndex((itemRow) => itemRow?.type !== "folder") ===
                      dbRows.indexOf(r);
                  if (needsRefreshFromDb && isPrimaryCourse) {
                    void loadCourseCurriculumOnDemand(
                      r.id || r.title,
                      rowUpdatedAt
                    );
                  }
                } else {
                  if (typeof window !== "undefined" && rowUpdatedAt) {
                    try {
                      window.localStorage.setItem(
                        `ruang_sosmed_curriculum_ts_${key}`,
                        rowUpdatedAt
                      );
                      fetchedCurriculumTsRef.current[key] = rowUpdatedAt;
                    } catch {}
                  }
                  // Jika versi lokal memiliki judul bab nyata (bukan "Chapter 3") sedangkan DB masih generic placeholder, perbarui DB Supabase
                  const localHasSpecific = (localCurr || []).some((s: any) =>
                    (s.chapters || []).some(
                      (ch: any) => !isGenericPlaceholderTitle(ch.title)
                    )
                  );
                  const dbHasGeneric = dbCurr.some((s: any) =>
                    (s.chapters || []).some((ch: any) =>
                      isGenericPlaceholderTitle(ch.title)
                    )
                  );
                  if (localHasSpecific && dbHasGeneric && isStaffSession) {
                    const resolvedThumbForPush =
                      r.thumbnail_url ||
                      meta.thumbnailUrl ||
                      local?.thumbnailUrl ||
                      cachedThumb ||
                      undefined;
                    void pushContentToSupabase(
                      {
                        id: r.id,
                        title: r.title,
                        type,
                        category: meta.category,
                        bannerGradient: meta.bannerGradient,
                        bannerAccent: meta.bannerAccent,
                        bannerPattern: meta.bannerPattern,
                        language: meta.language,
                        description: r.description,
                        assignedCount: 0,
                        urgency: r.urgency === "urgent" ? "Urgent" : "Not Urgent",
                        editedLabel: "Published",
                        statusLabel: "Completed",
                        progressPercent: 0,
                        editedDate: "Today",
                        thumbnailUrl: resolvedThumbForPush,
                      },
                      merged
                    );
                  }
                }
              } else if (localCurr) {
                nextCurriculums[key] = localCurr;
              } else if (r.__isLightweightRow && !isFolder) {
                const isPrimaryCourse =
                  key === "fundamental social media specialist" ||
                  dbRows.findIndex((itemRow) => itemRow?.type !== "folder") ===
                    dbRows.indexOf(r);
                if (
                  isPrimaryCourse &&
                  (!cachedCurrTs || (rowUpdatedAt && cachedCurrTs !== rowUpdatedAt))
                ) {
                  void loadCourseCurriculumOnDemand(
                    r.id || r.title,
                    rowUpdatedAt
                  );
                }
              }

              const isArchived =
                r.status === "archived" ||
                meta.isArchived === true ||
                local?.isArchived === true;
              const isShared =
                r.is_shared === true ||
                meta.isShared === true ||
                local?.isShared === true;
              const isTemplate =
                r.is_template === true ||
                meta.isTemplate === true ||
                local?.isTemplate === true;

              const assignLock =
                recentAssignmentLocksRef.current.get(r.id) ||
                recentAssignmentLocksRef.current.get(key);
              const resolvedAssignedLearners: string[] =
                assignLock && assignLock.expiresAt > Date.now()
                  ? assignLock.assignedLearners
                  : Array.isArray(meta.assignedLearners)
                  ? meta.assignedLearners
                  : Array.isArray(local?.assignedLearners)
                  ? local.assignedLearners
                  : [];

              return {
                id: r.id,
                title: r.title,
                type,
                assignedCount: resolvedAssignedLearners.length,
                assignedLearners: resolvedAssignedLearners,
                category: isFolder
                  ? "Folder"
                  : meta.category ||
                    (Array.isArray(r.category_tags) && r.category_tags[0]) ||
                    "Social Media Strategy",
                urgency: r.urgency === "urgent" ? "Urgent" : "Not Urgent",
                editedLabel: isArchived
                  ? "Archived"
                  : (local?.editedLabel || "Published"),
                statusLabel: (isArchived
                  ? "Archived"
                  : (local?.statusLabel || "Completed")) as ExplorerContentItem["statusLabel"],
                progressPercent: local?.progressPercent ?? 0,
                language: meta.language || "Bahasa / English",
                editedDate: local?.editedDate || "Edited Recently",
                bannerGradient:
                  meta.bannerGradient ||
                  `linear-gradient(135deg, ${cfg.bgTint} 0%, #FFFFFF 100%)`,
                bannerAccent: isFolder
                  ? (Array.isArray(r.category_tags) && r.category_tags[1]) ||
                    meta.bannerAccent ||
                    local?.bannerAccent ||
                    "blue"
                  : meta.bannerAccent || cfg.colorHex,
                bannerPattern: meta.bannerPattern || "carousel",
                description: r.description || "",
                isPro:
                  typeof meta.isPro === "boolean"
                    ? meta.isPro
                    : typeof r.is_pro_only === "boolean"
                    ? r.is_pro_only
                    : local?.isPro,
                ...(meta.unlockPriceIdr !== undefined ||
                local?.unlockPriceIdr !== undefined
                  ? {
                      unlockPriceIdr:
                        meta.unlockPriceIdr ?? local?.unlockPriceIdr,
                    }
                  : {}),
                ...(meta.unlockPointsCost !== undefined ||
                local?.unlockPointsCost !== undefined
                  ? {
                      unlockPointsCost:
                        meta.unlockPointsCost ?? local?.unlockPointsCost,
                    }
                  : {}),
                cohort:
                  normalizeCohortProjectName(
                    r.cohort || meta.cohort || local?.cohort
                  ) || "Ruang Sosmed Class",
                thumbnailUrl:
                  r.thumbnail_url ||
                  meta.thumbnailUrl ||
                  local?.thumbnailUrl ||
                  cachedThumb ||
                  undefined,
                isArchived,
                isShared,
                isTemplate,
                folderName:
                  r.folder_name ||
                  meta.folderName ||
                  local?.folderName ||
                  undefined,
                folderId:
                  r.folder_id ||
                  meta.folderId ||
                  local?.folderId ||
                  undefined,
                accessCode: getItemAccessCode({
                  title: r.title,
                  type,
                  folderName:
                    r.folder_name || meta.folderName || local?.folderName,
                  id: r.id,
                  accessCode: r.access_code || meta.accessCode || local?.accessCode,
                }),
                ...(() => {
                  if (type !== "Wiki") return {};
                  let localWikiDoc: {
                    sections?: WikiDocumentSection[];
                    attachments?: WikiAttachmentFile[];
                    readTime?: string;
                  } | null = null;
                  if (typeof window !== "undefined") {
                    try {
                      const rawW = window.localStorage.getItem(
                        `ruang_sosmed_wiki_doc_${key}`
                      );
                      if (rawW) localWikiDoc = JSON.parse(rawW);
                    } catch {}
                  }
                  const resolvedSections = Array.isArray(meta.wikiSections)
                    ? meta.wikiSections
                    : local?.wikiSections || localWikiDoc?.sections;
                  const resolvedAttachments = Array.isArray(meta.wikiAttachments)
                    ? meta.wikiAttachments
                    : local?.wikiAttachments || localWikiDoc?.attachments;
                  const resolvedReadTime =
                    meta.wikiReadTime ||
                    local?.wikiReadTime ||
                    localWikiDoc?.readTime;
                  return {
                    ...(resolvedSections ? { wikiSections: resolvedSections } : {}),
                    ...(resolvedAttachments
                      ? { wikiAttachments: resolvedAttachments }
                      : {}),
                    ...(resolvedReadTime ? { wikiReadTime: resolvedReadTime } : {}),
                  };
                })(),
              };
            });

            // Item lokal yang belum pernah di-push (id non-UUID) tetap dipertahankan kecuali sudah dihapus;
            // item ber-UUID yang tidak ada lagi di DB berarti sudah dihapus admin.
            const localOnly = nextExplorer.filter((i) => {
              if (!i || !i.id) return false;
              const tk = (i.title || "").trim().toLowerCase();
              if (!tk || String(i.title || "").startsWith("__DELETED__")) {
                return false;
              }
              if (deletedContentIdsRef.current.has(i.id)) return false;
              if (isContentTitleTombstoned(tk, deletedContentTitlesRef.current)) {
                return false;
              }
              return (
                !dbIds.has(i.id) &&
                !dbTitles.has(tk) &&
                (!isUuid(i.id) || justPushedIds.has(i.id))
              );
            });
            nextExplorer = deduplicateExplorerItems([
              ...localOnly,
              ...dbExplorer,
            ]);
          } else {
            nextExplorer = deduplicateExplorerItems(nextExplorer);
          }

          // Sinkronkan & gabungkan Cohort Projects tanpa menimpa warna asli atau membangkitkan cohort yang sudah dihapus/diubah
          const cohortMap = new Map<string, CohortProjectItem>();
          const canonicalCohortRegistered = new Set<string>();
          const registerCohort = (
            candidate: Partial<CohortProjectItem> & { name?: string }
          ) => {
            const rawName = (candidate.name || "").trim();
            if (!rawName) return;
            const normalizedName = normalizeCohortProjectName(rawName);
            const cKey = normalizedName.toLowerCase();
            if (cKey === "meta ads bootcamp") return;
            if (deletedCohortNamesRef.current.has(cKey)) return;

            const isCanonicalName = rawName.toLowerCase() === cKey;
            const existing = cohortMap.get(cKey);
            if (!existing) {
              cohortMap.set(cKey, {
                id:
                  candidate.id ||
                  `cohort-${cKey.replace(/[^a-z0-9]/g, "-")}`,
                name: normalizedName,
                color: candidate.color || "#4F39F6",
                description: candidate.description || "Custom Cohort / Track",
                shareWithAllLearners: Boolean(candidate.shareWithAllLearners),
              });
              if (isCanonicalName) canonicalCohortRegistered.add(cKey);
            } else if (isCanonicalName && !canonicalCohortRegistered.has(cKey)) {
              cohortMap.set(cKey, {
                id: candidate.id || existing.id,
                name: normalizedName,
                color: candidate.color || existing.color,
                description: candidate.description || existing.description,
                shareWithAllLearners:
                  candidate.shareWithAllLearners !== undefined
                    ? Boolean(candidate.shareWithAllLearners)
                    : Boolean(existing.shareWithAllLearners),
              });
              canonicalCohortRegistered.add(cKey);
            }
          };

          const inRecentCohortMutation =
            Date.now() < recentCohortMutationUntilRef.current;
          const isLocalCohortNewer =
            inRecentCohortMutation ||
            (lastCohortMutationTsRef.current > 0 &&
              lastCohortMutationTsRef.current > remoteCohortUpdatedAtMs);

          if (isLocalCohortNewer && prev.cohortProjects?.length) {
            prev.cohortProjects.forEach(registerCohort);
          } else if (remoteCohortProjects && remoteCohortProjects.length > 0) {
            remoteCohortProjects.forEach(registerCohort);
          } else if (prev.cohortProjects && prev.cohortProjects.length > 0) {
            prev.cohortProjects.forEach(registerCohort);
          }

          nextExplorer.forEach((it) => {
            const rawC = (it.cohort || "").trim();
            if (!rawC) return;
            const normalizedC = normalizeCohortProjectName(rawC);
            const cKey = normalizedC.toLowerCase();
            if (
              cKey === "meta ads bootcamp" ||
              deletedCohortNamesRef.current.has(cKey) ||
              cohortMap.has(cKey)
            ) {
              return;
            }
            registerCohort({
              name: normalizedC,
              color: "#4F39F6",
              description: "Cohort / Program Pembelajaran",
            });
          });
          if (cohortMap.size === 0) {
            INITIAL_COHORT_PROJECTS.forEach(registerCohort);
          }

          const nextCohortProjects = dedupeCohortProjectIds(
            Array.from(cohortMap.values())
          );
          const cohortProjectsChanged =
            JSON.stringify(prev.cohortProjects || []) !==
            JSON.stringify(nextCohortProjects);

          if (cohortProjectsChanged && typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                "ruang_sosmed_cohort_projects_v1",
                JSON.stringify(nextCohortProjects)
              );
            } catch {}
          }

          if (isStaffSession && !contentsRes.error) {
            const remoteSerialized = JSON.stringify(remoteCohortProjects || []);
            const nextSerialized = JSON.stringify(nextCohortProjects);
            if (
              !remoteCohortProjects ||
              isLocalCohortNewer ||
              remoteSerialized !== nextSerialized
            ) {
              const deletedSnapshot = Array.from(deletedCohortNamesRef.current);
              const syncSig = JSON.stringify({
                cohorts: nextCohortProjects,
                deleted: deletedSnapshot,
              });
              const syncTs =
                isLocalCohortNewer && lastCohortMutationTsRef.current > 0
                  ? lastCohortMutationTsRef.current
                  : undefined;
              if (
                typeof window !== "undefined" &&
                syncSig !== lastRemoteCohortSyncSigRef.current
              ) {
                lastRemoteCohortSyncSigRef.current = syncSig;
                window.setTimeout(() => {
                  void syncCohortProjectsToSupabase(
                    nextCohortProjects,
                    deletedSnapshot,
                    syncTs
                  ).then(() => {
                    cachedContentsRowsRef.current = null;
                    lastContentsWmKeyRef.current = "";
                    lastWatermarkRef.current = "";
                  });
                }, 0);
              }
            }
          }

          // Deteksi penambahan materi baru dari server untuk notifikasi Learner (termasuk project shareWithAllLearners)
          if (!contentsRes.error && Array.isArray(contentsRes.data)) {
            nextExplorer.forEach((exp) => {
              if (!exp?.id) return;
              const titleKey = (exp.title || "").trim().toLowerCase();
              newlyObservedContentKeys.push(exp.id);
              if (titleKey) newlyObservedContentKeys.push(titleKey);

              if (
                learnerContentSyncInitializedRef.current &&
                exp.type !== "Folder" &&
                !exp.isArchived &&
                !knownSyncedContentIdsRef.current.has(exp.id) &&
                (!titleKey || !knownSyncedContentIdsRef.current.has(titleKey)) &&
                isLearnerAssignedToContentTitle(
                  exp.title,
                  nextExplorer,
                  activeLearnerIdentity,
                  nextCurriculums,
                  nextCohortProjects
                )
              ) {
                enqueueSyncedLearnerNotif({
                  id: `notif-mat-sync-${exp.id}`,
                  title: `📚 Materi Baru Tersedia: ${exp.title}`,
                  body: `Admin/Mentor telah menambahkan materi ${exp.type} "${exp.title}". Yuk cek di katalog atau My Learning!`,
                  time: "Baru saja",
                  unread: true,
                  eventType: "material_added",
                  meta: { contentTitle: exp.title },
                });
              }
            });
          }

          const nextCatalog = syncLearnerCatalogWithExplorer(
            nextExplorer,
            prev.learnerAssignedItems,
            nextCurriculums
          );

          const firstKey = nextExplorer[0]?.title?.trim().toLowerCase();

          // Hindari trigger re-render / flicker jika data sama persis dengan state sekarang
          const proChanged = prev.learnerIsPro !== activeUserPro;
          const packageIdChanged = prev.learnerPackageId !== activeUserPackageId;
          const packageNameChanged =
            prev.learnerPackageName !== activeUserPackageName;
          const billingCycleChanged =
            prev.learnerBillingCycle !== activeUserBillingCycle;
          const hasUsedTrialChanged =
            prev.learnerHasUsedTrial !== activeUserHasUsedTrial;
          const unlockedItemsChanged =
            JSON.stringify(prev.learnerUnlockedItems || []) !==
            JSON.stringify(mergedUnlockedForActiveUser);
          const subsChanged =
            JSON.stringify(prev.learnerSubscriptions) !==
            JSON.stringify(nextSubs);
          const assigneesChanged =
            prev.assignees.length !== nextAssignees.length ||
            prev.assignees.some(
              (a, idx) =>
                a.id !== nextAssignees[idx]?.id ||
                a.name !== nextAssignees[idx]?.name ||
                a.roleBadge !== nextAssignees[idx]?.roleBadge
            );
          const lbChanged =
            prev.leaderboard.length !== sortedLb.length ||
            prev.leaderboard.some(
              (l, idx) =>
                l.name !== sortedLb[idx]?.name ||
                l.points !== sortedLb[idx]?.points
            );

          const explorerChanged =
            prev.explorerItems.length !== nextExplorer.length ||
            prev.explorerItems.some((pi, idx) => {
              const ni = nextExplorer[idx];
              return (
                !ni ||
                pi.id !== ni.id ||
                pi.title !== ni.title ||
                pi.thumbnailUrl !== ni.thumbnailUrl ||
                pi.category !== ni.category ||
                pi.description !== ni.description ||
                pi.cohort !== ni.cohort ||
                pi.folderName !== ni.folderName ||
                pi.accessCode !== ni.accessCode ||
                pi.assignedCount !== ni.assignedCount ||
                pi.isPro !== ni.isPro ||
                pi.unlockPriceIdr !== ni.unlockPriceIdr ||
                pi.unlockPointsCost !== ni.unlockPointsCost ||
                pi.wikiReadTime !== ni.wikiReadTime ||
                JSON.stringify(pi.wikiSections || []) !==
                  JSON.stringify(ni.wikiSections || []) ||
                JSON.stringify(pi.wikiAttachments || []) !==
                  JSON.stringify(ni.wikiAttachments || []) ||
                JSON.stringify(pi.assignedLearners || []) !==
                  JSON.stringify(ni.assignedLearners || [])
              );
            });

          const catalogChanged =
            prev.learnerAssignedItems.length !== nextCatalog.length ||
            prev.learnerAssignedItems.some((pa, idx) => {
              const na = nextCatalog[idx];
              return (
                !na ||
                pa.id !== na.id ||
                pa.title !== na.title ||
                pa.thumbnailUrl !== na.thumbnailUrl ||
                pa.progressPercent !== na.progressPercent
              );
            });

          const curriculumsChanged =
            JSON.stringify(prev.courseCurriculums) !==
            JSON.stringify(nextCurriculums);

          // Jika ada pembaruan kurikulum materi, beri tahu learner HANYA jika learner memiliki akses ke materi tersebut
          if (
            curriculumsChanged &&
            prev.courseCurriculums &&
            Object.keys(prev.courseCurriculums).length > 0
          ) {
            const changedKey = Object.keys(nextCurriculums).find(
              (k) =>
                JSON.stringify(nextCurriculums[k]) !==
                JSON.stringify(prev.courseCurriculums?.[k])
            );
            if (changedKey) {
              const matchedItem = nextExplorer.find(
                (e) => e.title.toLowerCase().trim() === changedKey
              );
              const courseTitle = matchedItem?.title || changedKey;
              if (
                isLearnerAssignedToContentTitle(
                  courseTitle,
                  nextExplorer,
                  activeLearnerIdentity,
                  nextCurriculums,
                  nextCohortProjects
                )
              ) {
                const notifTitle = `📚 Materi Diperbarui: ${courseTitle}`;
                enqueueSyncedLearnerNotif({
                  id: `notif-curriculum-sync-${Date.now()}`,
                  title: notifTitle,
                  body: `Mentor telah memperbarui isi materi pada kelas "${courseTitle}". Silakan cek modul terbaru Anda.`,
                  time: "Baru saja",
                  unread: true,
                  eventType: "material_added",
                  meta: { contentTitle: courseTitle },
                });
              }
            }
          }

          // Sync workspaceCollaborators role from Supabase profiles
          let collabsChanged = false;
          let nextCollabs = prev.workspaceCollaborators;
          const remoteProfiles = profilesRes.data;
          if (Array.isArray(remoteProfiles)) {
            nextCollabs = prev.workspaceCollaborators.map((c) => {
              const match = remoteProfiles.find(
                (p: any) =>
                  (p.email && p.email.toLowerCase() === c.email.toLowerCase()) ||
                  (p.id && p.id === c.id)
              );
              if (match && match.role) {
                const targetRole =
                  match.role.toLowerCase() === "admin"
                    ? "Admin"
                    : match.role.toLowerCase() === "mentor"
                    ? "Mentor"
                    : "Learner";
                if (c.role !== targetRole) {
                  collabsChanged = true;
                  return { ...c, role: targetRole };
                }
              }
              return c;
            });
          }

          // Sync reviews from Supabase contents.settings_json.reviews
          const remoteReviews: RsLessonReviewItem[] = [];
          if (!contentsRes.error && Array.isArray(contentsRes.data)) {
            contentsRes.data.forEach((r: any) => {
              if (Array.isArray(r.settings_json?.reviews)) {
                remoteReviews.push(...r.settings_json.reviews);
              }
            });
          }

          let nextReviews = prev.rsLessonReviews ?? [];
          let reviewsChanged = false;
          if (remoteReviews.length > 0) {
            const activeUser = getActiveSessionUser();
            const existingIds = new Set(nextReviews.map((r) => r.id));
            const toAdd: RsLessonReviewItem[] = [];
            for (const r of remoteReviews) {
              if (
                String(r.id || "").startsWith("rev-seed-") ||
                ["Nisa Amelia", "Dimas Prakoso", "Siti Sarah"].includes(
                  r.reviewerName
                )
              ) {
                continue;
              }
              if (!existingIds.has(r.id)) {
                const resolvedReviewer =
                  r.reviewerName === "Raka Pratama" ||
                  r.reviewerUsername === "raka.pratama" ||
                  r.feedback === "tes feedback"
                    ? activeUser.name || "Learner"
                    : r.reviewerName;

                toAdd.push({
                  ...r,
                  reviewerName: resolvedReviewer,
                });
                existingIds.add(r.id);
              }
            }
            if (toAdd.length > 0) {
              reviewsChanged = true;
              nextReviews = [...toAdd, ...nextReviews];
            }
          }

          // 3) Sinkronisasi katalog hadiah dari Supabase
          let nextRewards = prev.rewardsCatalog ?? [];
          let rewardsChanged = false;

          if (
            remoteRewards &&
            Array.isArray(remoteRewards) &&
            remoteRewards.length > 0
          ) {
            if (
              JSON.stringify(prev.rewardsCatalog) !==
              JSON.stringify(remoteRewards)
            ) {
              nextRewards = remoteRewards;
              rewardsChanged = true;
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_rewards_catalog_v2",
                  JSON.stringify(remoteRewards)
                );
              } catch {}
            }
          } else if ((prev.rewardsCatalog ?? []).length > 0 && isStaffSession) {
            // Jika admin memiliki item lokal yang belum di DB, dorong ke Supabase
            void syncRewardsToSupabase(prev.rewardsCatalog);
            try {
              window.localStorage.setItem(
                "ruang_sosmed_rewards_catalog_v2",
                JSON.stringify(prev.rewardsCatalog)
              );
            } catch {}
          } else if (nextRewards.length === 0) {
            try {
              const localCached = window.localStorage.getItem(
                "ruang_sosmed_rewards_catalog_v2"
              );
              if (localCached) {
                const parsedCached = JSON.parse(localCached);
                if (Array.isArray(parsedCached) && parsedCached.length > 0) {
                  nextRewards = parsedCached;
                  rewardsChanged = true;
                }
              }
            } catch {}
          }

          // 4) Sinkronisasi Certificate Config (Global & Per-Course)
          let nextCertConfig = prev.certificateConfig;
          let nextCourseCertConfigs = prev.courseCertificateConfigs || {};
          let certChanged = false;

          if (remoteCertConfig) {
            if (
              JSON.stringify(prev.certificateConfig) !==
              JSON.stringify(remoteCertConfig)
            ) {
              nextCertConfig = remoteCertConfig;
              certChanged = true;
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_cert_config_v1",
                  JSON.stringify(remoteCertConfig)
                );
              } catch {}
            }
          } else if (isStaffSession && prev.certificateConfig) {
            void syncCertificateConfigToSupabase(
              prev.certificateConfig,
              prev.courseCertificateConfigs
            );
          }

          if (remoteCourseCertConfigs) {
            if (
              JSON.stringify(prev.courseCertificateConfigs || {}) !==
              JSON.stringify(remoteCourseCertConfigs)
            ) {
              nextCourseCertConfigs = remoteCourseCertConfigs;
              certChanged = true;
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_course_cert_configs_v1",
                  JSON.stringify(remoteCourseCertConfigs)
                );
              } catch {}
            }
          }

          // 4b) Sinkronisasi Pengaturan Learner PRO & QRIS
          let nextLearnerProConfig =
            prev.learnerProConfig || DEFAULT_LEARNER_PRO_CONFIG;
          let proConfigChanged = false;
          if (remoteLearnerProConfig) {
            if (
              JSON.stringify(prev.learnerProConfig) !==
              JSON.stringify(remoteLearnerProConfig)
            ) {
              nextLearnerProConfig = remoteLearnerProConfig;
              proConfigChanged = true;
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_learner_pro_config_v1",
                  JSON.stringify(remoteLearnerProConfig)
                );
              } catch {}
            }
          } else if (isStaffSession && prev.learnerProConfig) {
            void syncLearnerProConfigToSupabase(prev.learnerProConfig);
          }

          // 4c) Sinkronisasi Pengaturan Web Under Construction (404)
          let nextMaintenanceConfig =
            prev.maintenanceConfig || DEFAULT_MAINTENANCE_CONFIG;
          let maintenanceConfigChanged = false;
          if (remoteMaintenanceConfig) {
            if (
              JSON.stringify(prev.maintenanceConfig) !==
              JSON.stringify(remoteMaintenanceConfig)
            ) {
              nextMaintenanceConfig = remoteMaintenanceConfig;
              maintenanceConfigChanged = true;
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_maintenance_config_v1",
                  JSON.stringify(remoteMaintenanceConfig)
                );
              } catch {}
            }
          } else if (isStaffSession && prev.maintenanceConfig) {
            void syncMaintenanceConfigToSupabase(prev.maintenanceConfig);
          }

          // 4d) Sinkronisasi Visibilitas Halaman Siswa (Wiki & Favorites)
          let nextLearnerPagesConfig =
            prev.learnerPagesConfig || DEFAULT_LEARNER_PAGES_CONFIG;
          let learnerPagesConfigChanged = false;
          if (remoteLearnerPagesConfig) {
            if (
              JSON.stringify(prev.learnerPagesConfig) !==
              JSON.stringify(remoteLearnerPagesConfig)
            ) {
              nextLearnerPagesConfig = remoteLearnerPagesConfig;
              learnerPagesConfigChanged = true;
              try {
                window.localStorage.setItem(
                  "ruang_sosmed_learner_pages_config_v1",
                  JSON.stringify(remoteLearnerPagesConfig)
                );
              } catch {}
            }
          } else if (isStaffSession && prev.learnerPagesConfig) {
            void syncLearnerPagesConfigToSupabase(prev.learnerPagesConfig);
          }

          // 5) Sinkronisasi Inbox Pesan Mentor & Laporan Kendala dari Supabase
          let nextThreads = prev.discussionThreads ?? [];
          let threadsChanged = false;
          const threadsToPurgeRemotely: { threadId: string; replyId?: string }[] = [];
          const newTombstoneIds: string[] = [];
          const nowSyncMs = Date.now();
          for (const [tid, ts] of recentLocalThreadPostsRef.current.entries()) {
            if (nowSyncMs - ts > 20_000) recentLocalThreadPostsRef.current.delete(tid);
          }
          for (const [rid, ts] of recentLocalReplyPostsRef.current.entries()) {
            if (nowSyncMs - ts > 20_000) recentLocalReplyPostsRef.current.delete(rid);
          }

          if (
            authUserId &&
            !inboxThreadsRes.error &&
            Array.isArray(inboxThreadsRes.data)
          ) {
            const localById = new Map<string, DiscussionThread>();
            nextThreads.forEach((t) => {
              if (t?.id) localById.set(t.id, t);
            });

            const threadMap = new Map<string, DiscussionThread>();
            // Pertahankan sementara thread yang baru diposting lokal (<20 detik) sebelum masuk DB
            nextThreads.forEach((t) => {
              const postTs = recentLocalThreadPostsRef.current.get(t.id);
              if (
                t?.id &&
                postTs &&
                nowSyncMs - postTs <= 20_000 &&
                !deletedThreadIdsRef.current.has(t.id)
              ) {
                threadMap.set(t.id, t);
              }
            });

            (inboxThreadsRes.data as any[]).forEach((row) => {
              if (!row?.id) return;
              const isTombstonedRemote =
                row.title === "__DELETED__" ||
                row.excerpt === "__DELETED__" ||
                !Array.isArray(row.replies) ||
                row.replies.length === 0;

              if (deletedThreadIdsRef.current.has(row.id)) {
                if (row.title !== "__DELETED__") {
                  threadsToPurgeRemotely.push({ threadId: row.id });
                }
                return;
              }

              if (isTombstonedRemote) {
                newTombstoneIds.push(row.id);
                return;
              }

              const rawRemoteReplies = Array.isArray(row.replies)
                ? row.replies
                : [];
              const filteredRemoteReplies = rawRemoteReplies.filter((rr: any) => {
                if (!rr?.id) return false;
                const ridStr = String(rr.id);
                if (deletedReplyIdsRef.current.has(ridStr)) {
                  threadsToPurgeRemotely.push({
                    threadId: row.id,
                    replyId: ridStr,
                  });
                  return false;
                }
                return true;
              });
              if (
                rawRemoteReplies.length > 0 &&
                filteredRemoteReplies.length === 0
              ) {
                newTombstoneIds.push(row.id);
                return;
              }

              const remoteParticipants = Array.isArray(row.participants)
                ? row.participants
                : [];
              const localThread = localById.get(row.id);

              const mergedReplies = [...filteredRemoteReplies];
              const seenReplyIds = new Set(
                filteredRemoteReplies.map((r: any) => String(r.id))
              );
              if (localThread?.replies) {
                localThread.replies.forEach((lr) => {
                  const repTs = recentLocalReplyPostsRef.current.get(lr.id);
                  if (
                    lr?.id &&
                    repTs &&
                    nowSyncMs - repTs <= 20_000 &&
                    !deletedReplyIdsRef.current.has(lr.id) &&
                    !seenReplyIds.has(lr.id)
                  ) {
                    mergedReplies.push(lr);
                    seenReplyIds.add(lr.id);
                  }
                });
              }

              const lastReplyMsg =
                mergedReplies[mergedReplies.length - 1]?.message ||
                row.excerpt ||
                localThread?.excerpt ||
                "";

              threadMap.set(row.id, {
                id: row.id,
                chapterBadge:
                  row.chapter_badge || localThread?.chapterBadge || "",
                title: row.title || localThread?.title || "",
                excerpt: lastReplyMsg,
                repliesCount: mergedReplies.length,
                viewsCount: Number(
                  row.views_count ?? localThread?.viewsCount ?? 1
                ),
                lastReplyLabel:
                  row.last_reply_label ||
                  localThread?.lastReplyLabel ||
                  "Baru saja",
                participants:
                  remoteParticipants.length > 0
                    ? remoteParticipants
                    : localThread?.participants || [],
                replies: mergedReplies,
              });

              // Track & notify Learner when a new Admin/Mentor reply arrives remotely
              mergedReplies.forEach((rep: any) => {
                if (!rep?.id) return;
                const rid = String(rep.id);
                newlyObservedReplyIds.push(rid);
                const roleStr = String(rep.authorRole || "");
                const isStaffReply = /\b(mentor|admin|coach|instructor)\b/i.test(
                  roleStr
                );
                if (
                  learnerReplySyncInitializedRef.current &&
                  isStaffReply &&
                  !knownSyncedMentorReplyIdsRef.current.has(rid)
                ) {
                  const chapTitle =
                    row.chapter_badge || row.title || "Diskusi Materi";
                  const ownsDiscussedCourse = isLearnerAssignedToContentTitle(
                    chapTitle,
                    nextExplorer,
                    activeLearnerIdentity,
                    nextCurriculums
                  );
                  if (ownsDiscussedCourse) {
                    enqueueSyncedLearnerNotif({
                      id: `notif-reply-sync-${rid}`,
                      title: `💬 Balasan ${roleStr || "Mentor"}: ${chapTitle}`,
                      body: `${rep.authorName || "Mentor"} membalas diskusi: "${String(rep.message || "").slice(0, 140)}"`,
                      time: "Baru saja",
                      unread: true,
                      eventType: "mentor_reply",
                      meta: {
                        chapterTitle: chapTitle,
                        contentTitle: chapTitle,
                        mentorName: rep.authorName || "Mentor",
                      },
                    });
                  }
                }
              });
            });

            const candidateThreads = filterDeletedDiscussionThreads(
              Array.from(threadMap.values()),
              deletedThreadIdsRef.current,
              deletedReplyIdsRef.current
            );
            if (
              JSON.stringify(candidateThreads) !==
              JSON.stringify(prev.discussionThreads ?? [])
            ) {
              nextThreads = candidateThreads;
              threadsChanged = true;
            }
          } else {
            const cleanedLocalThreads = filterDeletedDiscussionThreads(
              nextThreads,
              deletedThreadIdsRef.current,
              deletedReplyIdsRef.current
            );
            if (
              JSON.stringify(cleanedLocalThreads) !==
              JSON.stringify(prev.discussionThreads ?? [])
            ) {
              nextThreads = cleanedLocalThreads;
              threadsChanged = true;
            }
          }

          let nextIssues = prev.reportedIssues ?? [];
          let issuesChanged = false;
          if (
            !reportedIssuesRes.error &&
            Array.isArray(reportedIssuesRes.data)
          ) {
            const issueMap = new Map<string, ReportedIssueItem>();
            nextIssues.forEach((iss) => issueMap.set(iss.id, iss));
            (reportedIssuesRes.data as any[]).forEach((row) => {
              if (!row?.id) return;
              issueMap.set(row.id, {
                id: row.id,
                chapter: row.chapter || "",
                title: row.title || "",
                reporter: row.reporter || "Learner",
                reportedAt: row.reported_at || "Baru saja",
                status: row.status === "Resolved" ? "Resolved" : "Open",
                category: row.category || undefined,
              });
            });
            const candidateIssues = Array.from(issueMap.values());
            if (
              JSON.stringify(candidateIssues) !==
              JSON.stringify(prev.reportedIssues ?? [])
            ) {
              nextIssues = candidateIssues;
              issuesChanged = true;
            }
          }

          // 6) Sinkronisasi Global User Avatars dari __SYSTEM_USER_AVATARS__, profiles.avatar_url, dan user_profiles.avatar_url
          const nextUserAvatars: Record<string, string> = {
            ...(prev.userAvatars || {}),
          };
          Object.entries(remoteSystemAvatars).forEach(([k, v]) => {
            const cleanK = k.trim().toLowerCase();
            if (!cleanK) return;
            if (v && v.trim()) {
              nextUserAvatars[cleanK] = v.trim();
            }
          });
          Object.entries(dbAvatarsFromTables).forEach(([k, v]) => {
            const cleanK = k.trim().toLowerCase();
            if (cleanK && v && v.trim()) {
              nextUserAvatars[cleanK] = v.trim();
            }
          });

          // Apply active short-lived local avatar overrides so just-updated/cleared avatars aren't reverted during DB propagation
          const nowMs = Date.now();
          recentAvatarLocksRef.current.forEach((lock, key) => {
            if (lock.expiresAt > nowMs) {
              if (lock.value) {
                nextUserAvatars[key] = lock.value;
              } else {
                delete nextUserAvatars[key];
              }
            } else {
              recentAvatarLocksRef.current.delete(key);
            }
          });

          const avatarsChanged =
            JSON.stringify(nextUserAvatars) !==
            JSON.stringify(prev.userAvatars || {});

          if (avatarsChanged && typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                "ruang_sosmed_user_avatars_v1",
                JSON.stringify(nextUserAvatars)
              );
            } catch {}
          }

          // 6b) Sinkronisasi Global User Points Map (profiles.total_points + user_profiles.perks.total_points + active session + locks)
          const nextUserPointsMap: Record<string, number> = {
            ...(prev.userPointsMap || {}),
          };
          Object.entries(dbPointsFromTables).forEach(([k, val]) => {
            if (k && Number.isFinite(val) && val >= 0) {
              nextUserPointsMap[k] = val;
            }
          });
          if (authUserId && ownProfile) {
            activeUserKeys.forEach((k) => {
              nextUserPointsMap[k] = activeUserPoints;
            });
          }
          recentPointLocksRef.current.forEach((lock, key) => {
            if (lock.expiresAt > nowMs) {
              nextUserPointsMap[key] = lock.value;
            } else {
              recentPointLocksRef.current.delete(key);
            }
          });

          const pointsMapChanged =
            JSON.stringify(nextUserPointsMap) !==
            JSON.stringify(prev.userPointsMap || {});

          if (pointsMapChanged && typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                "ruang_sosmed_user_points_map_v1",
                JSON.stringify(nextUserPointsMap)
              );
            } catch {}
          }

          // 7) Merge Admin Activity Notifications (__SYSTEM_ADMIN_NOTIFICATIONS__) STRICTLY for Staff sessions
          let nextAdminNotifications: AdminActivityNotification[] = [];
          const freshlyArrivedAdminNotifs: AdminActivityNotification[] = [];

          if (isStaffSession) {
            const localNotifMap = new Map<string, AdminActivityNotification>();
            (prev.adminNotifications || []).forEach((n) => {
              if (n && n.id) localNotifMap.set(n.id, n);
            });

            const mergedAdminNotifsMap = new Map<string, AdminActivityNotification>(
              localNotifMap
            );

            remoteAdminNotifs.forEach((rn) => {
              if (!rn || typeof rn.id !== "string") return;
              const existingLocal = localNotifMap.get(rn.id);
              const mergedItem: AdminActivityNotification = {
                ...rn,
                read: Boolean(existingLocal?.read || rn.read),
              };
              mergedAdminNotifsMap.set(rn.id, mergedItem);

              if (!knownAdminNotifIdsRef.current.has(rn.id)) {
                knownAdminNotifIdsRef.current.add(rn.id);
                const createdMs = Date.parse(rn.createdAt || "");
                const isVeryRecent =
                  !Number.isNaN(createdMs) && Date.now() - createdMs <= 60_000;
                if (adminNotifHydratedRef.current || isVeryRecent) {
                  freshlyArrivedAdminNotifs.push(mergedItem);
                }
              }
            });
            adminNotifHydratedRef.current = true;

            nextAdminNotifications = Array.from(mergedAdminNotifsMap.values())
              .sort((a, b) => {
                const ta = Date.parse(a.createdAt || "") || 0;
                const tb = Date.parse(b.createdAt || "") || 0;
                return tb - ta;
              })
              .slice(0, 50);
          } else {
            adminNotifHydratedRef.current = false;
          }

          const adminNotifsChanged =
            JSON.stringify(nextAdminNotifications) !==
            JSON.stringify(prev.adminNotifications || []);

          if (isStaffSession && adminNotifsChanged && typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                ADMIN_NOTIFS_STORAGE_KEY,
                JSON.stringify(nextAdminNotifications)
              );
            } catch {}
          }

          if (isStaffSession && freshlyArrivedAdminNotifs.length > 0 && typeof window !== "undefined") {
            window.setTimeout(() => {
              freshlyArrivedAdminNotifs.forEach((notif) => {
                window.dispatchEvent(
                  new CustomEvent("ruang_sosmed_admin_notif", { detail: notif })
                );
              });
            }, 0);
          }

          // Merge __SYSTEM_LEARNER_NOTIFICATIONS__ jika tersedia + persist + emit events
          if (remoteLearnerNotifs.length > 0) {
            const localLearnerNotifMap = new Map<string, LearnerNotification>();
            nextNotifications.forEach((n) => {
              if (n?.id) localLearnerNotifMap.set(n.id, n);
            });
            remoteLearnerNotifs.forEach((rn) => {
              if (!rn?.id) return;
              const contentTitle = extractNotificationContentTitle(rn);
              const assignedToContent = contentTitle
                ? isLearnerAssignedToContentTitle(
                    contentTitle,
                    nextExplorer,
                    activeLearnerIdentity,
                    nextCurriculums
                  )
                : true;
              const existingLocal = localLearnerNotifMap.get(rn.id);
              const merged = existingLocal
                ? { ...rn, unread: existingLocal.unread && rn.unread }
                : rn;
              localLearnerNotifMap.set(rn.id, merged);
              if (
                assignedToContent &&
                merged.unread &&
                !knownLearnerNotifIdsRef.current.has(rn.id) &&
                learnerNotifHydratedRef.current &&
                !freshlyArrivedLearnerNotifs.some((f) => f.id === rn.id)
              ) {
                freshlyArrivedLearnerNotifs.push(merged);
              }
            });
            nextNotifications = Array.from(localLearnerNotifMap.values())
              .sort((a, b) => {
                const ta = Date.parse(a.createdAt || "") || 0;
                const tb = Date.parse(b.createdAt || "") || 0;
                return tb - ta;
              })
              .slice(0, 50);
          }

          const learnerNotifsChanged =
            JSON.stringify(nextNotifications) !==
            JSON.stringify(prev.learnerNotifications || []);

          if (learnerNotifsChanged && typeof window !== "undefined") {
            persistLearnerNotificationsLocal(nextNotifications);
          }

          if (typeof window !== "undefined") {
            const capturedPro = activeUserPro;
            const capturedContentKeys = [...newlyObservedContentKeys];
            const capturedReplyIds = [...newlyObservedReplyIds];
            const capturedFreshLearner = [...freshlyArrivedLearnerNotifs];
            const capturedPurges = [...threadsToPurgeRemotely];
            const capturedTombstones = [...newTombstoneIds];
            window.setTimeout(() => {
              if (capturedTombstones.length > 0) {
                capturedTombstones.forEach((tid) =>
                  deletedThreadIdsRef.current.add(tid)
                );
                persistStoredIdSet(
                  DELETED_THREADS_STORAGE_KEY,
                  deletedThreadIdsRef.current
                );
              }
              if (capturedPurges.length > 0) {
                const seenPurgeKeys = new Set<string>();
                capturedPurges.forEach((p) => {
                  const key = `${p.threadId}:${p.replyId || ""}`;
                  if (seenPurgeKeys.has(key)) return;
                  seenPurgeKeys.add(key);
                  void deleteInboxThreadFromSupabase(p.threadId, p.replyId);
                });
              }
              prevSyncedProStatusRef.current = capturedPro;
              if (capturedContentKeys.length > 0) {
                capturedContentKeys.forEach((k) =>
                  knownSyncedContentIdsRef.current.add(k)
                );
                learnerContentSyncInitializedRef.current = true;
              }
              if (capturedReplyIds.length > 0) {
                capturedReplyIds.forEach((rid) =>
                  knownSyncedMentorReplyIdsRef.current.add(rid)
                );
                learnerReplySyncInitializedRef.current = true;
              }
              capturedFreshLearner.forEach((notif) => {
                if (!knownLearnerNotifIdsRef.current.has(notif.id)) {
                  knownLearnerNotifIdsRef.current.add(notif.id);
                  window.dispatchEvent(
                    new CustomEvent("ruang_sosmed_learner_notif", {
                      detail: notif,
                    })
                  );
                }
              });
            }, 0);
          }

          if (
            !proChanged &&
            !packageIdChanged &&
            !packageNameChanged &&
            !billingCycleChanged &&
            !hasUsedTrialChanged &&
            !unlockedItemsChanged &&
            !subsChanged &&
            !assigneesChanged &&
            !lbChanged &&
            !explorerChanged &&
            !cohortProjectsChanged &&
            !catalogChanged &&
            !curriculumsChanged &&
            !collabsChanged &&
            !reviewsChanged &&
            !pointsChanged &&
            !rewardsChanged &&
            !certChanged &&
            !proConfigChanged &&
            !maintenanceConfigChanged &&
            !learnerPagesConfigChanged &&
            !threadsChanged &&
            !issuesChanged &&
            !avatarsChanged &&
            !pointsMapChanged &&
            !adminNotifsChanged &&
            !learnerNotifsChanged
          ) {
            // Data tidak berubah: pertahankan referensi state sebelumnya agar tidak ada glitch / flicker cover
            return prev;
          }

          return {
            ...prev,
            adminNotifications: nextAdminNotifications,
            userAvatars: nextUserAvatars,
            userPointsMap: nextUserPointsMap,
            rewardsCatalog: nextRewards,
            certificateConfig: nextCertConfig,
            courseCertificateConfigs: nextCourseCertConfigs,
            learnerProConfig: nextLearnerProConfig,
            maintenanceConfig: nextMaintenanceConfig,
            learnerPagesConfig: nextLearnerPagesConfig,
            cohortProjects: nextCohortProjects,
            learnerPoints: activeUserPoints,
            learnerNotifications: nextNotifications,
            learnerIsPro: activeUserPro,
            learnerPackageId: activeUserPackageId,
            learnerPackageName: activeUserPackageName,
            learnerBillingCycle: activeUserBillingCycle,
            learnerHasUsedTrial: activeUserHasUsedTrial,
            learnerUnlockedItems: mergedUnlockedForActiveUser,
            learnerSubscriptions: nextSubs,
            assignees: nextAssignees,
            leaderboard: sortedLb,
            learnerAssignedItems: nextCatalog,
            explorerItems: nextExplorer,
            workspaceCollaborators: nextCollabs,
            courseCurriculums: nextCurriculums,
            rsLessonReviews: nextReviews,
            discussionThreads: nextThreads,
            reportedIssues: nextIssues,
            courseSections:
              nextExplorer.length === 0
                ? []
                : (firstKey && nextCurriculums[firstKey]) || prev.courseSections,
          };
        });
      } catch {
        // Ignore network errors
      } finally {
        syncInFlightRef.current = false;
      }
    };

    const scheduleRealtimeSync = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      realtimeDebounceRef.current = setTimeout(() => {
        void syncRegisteredLearners({ force: true });
      }, 1200);
    };

    void syncRegisteredLearners({ force: true });

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let idleDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectStaffRealtime = () => {
      if (!isStaffSessionRef.current) return;
      if (realtimeChannel) return;
      if (typeof document !== "undefined" && document.hidden) return;
      realtimeChannel = supabase
        .channel("realtime-user-profiles-pro")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_profiles" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "contents" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pro_upgrade_requests" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mentor_inbox_threads" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mentor_reported_issues" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "learner_pro_settings" },
          () => scheduleRealtimeSync()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "learner_unlocked_items" },
          () => scheduleRealtimeSync()
        )
        .subscribe();
    };

    const disconnectStaffRealtime = () => {
      if (realtimeChannel) {
        void supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    };

    realtimeControlRef.current = {
      connect: connectStaffRealtime,
      disconnect: disconnectStaffRealtime,
    };

    // Low-egress sync: WebSocket Realtime khusus Admin/Mentor + watermark check 90s saat tab aktif
    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void syncRegisteredLearners({ force: false });
    }, 90_000);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.hidden) {
        if (idleDisconnectTimer) clearTimeout(idleDisconnectTimer);
        idleDisconnectTimer = setTimeout(() => {
          if (typeof document !== "undefined" && document.hidden) {
            disconnectStaffRealtime();
          }
        }, 90_000);
        return;
      }
      if (idleDisconnectTimer) {
        clearTimeout(idleDisconnectTimer);
        idleDisconnectTimer = null;
      }
      if (isStaffSessionRef.current) {
        connectStaffRealtime();
      }
      if (Date.now() - lastSyncAtRef.current < 5_000) return;
      void syncRegisteredLearners({ force: true });
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    const handlePointsAwarded = () => {
      void syncRegisteredLearners({ force: true });
    };
    window.addEventListener("ruang_sosmed_points_awarded", handlePointsAwarded);
    window.addEventListener("ruang_sosmed_profile_updated", handlePointsAwarded);

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        lastWatermarkRef.current = "";
        void syncRegisteredLearners({ force: true });
      } else if (event === "SIGNED_OUT") {
        isStaffSessionRef.current = false;
        disconnectStaffRealtime();
        lastWatermarkRef.current = "";
        lastContentsWmKeyRef.current = "";
        cachedContentsRowsRef.current = null;
        void syncRegisteredLearners({ force: true });
      }
    });

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      if (idleDisconnectTimer) {
        clearTimeout(idleDisconnectTimer);
      }
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("ruang_sosmed_points_awarded", handlePointsAwarded);
      window.removeEventListener("ruang_sosmed_profile_updated", handlePointsAwarded);
      authSub.unsubscribe();
      disconnectStaffRealtime();
      realtimeControlRef.current = null;
    };
  }, []);

  // Persist to localStorage on every state update after hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, hydrated]);

  // Helper to recalculate semi-circle status gauge percentages
  const recalculateStatusGauge = (
    segments: ContentStatusSegment[],
    deltaPassed: number,
    deltaInProgress = 0,
    deltaNotStarted = 0
  ) => {
    const updatedCounts = segments.map((seg) => {
      if (seg.label === "Passed") {
        return { ...seg, count: Math.max(0, seg.count + deltaPassed) };
      }
      if (seg.label === "In Progress") {
        return { ...seg, count: Math.max(0, seg.count + deltaInProgress) };
      }
      if (seg.label === "Not Started") {
        return { ...seg, count: Math.max(0, seg.count + deltaNotStarted) };
      }
      return seg;
    });
    const total = updatedCounts.reduce((acc, s) => acc + s.count, 0) || 1;
    const withPercentages = updatedCounts.map((s) => ({
      ...s,
      percentage: Math.max(1, Math.round((s.count / total) * 100)),
    }));
    return { segments: withPercentages, total };
  };

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => {
      const nextList = prev.learnerNotifications.map((n) => ({
        ...n,
        unread: false,
      }));
      persistLearnerNotificationsLocal(nextList);
      void syncLearnerNotificationsToSupabase(nextList);
      return {
        ...prev,
        learnerNotifications: nextList,
      };
    });
  }, []);

  const markLearnerNotificationRead = useCallback((id: string) => {
    if (!id) return;
    setState((prev) => {
      const nextList = prev.learnerNotifications.map((n) =>
        n.id === id ? { ...n, unread: false } : n
      );
      persistLearnerNotificationsLocal(nextList);
      void syncLearnerNotificationsToSupabase(nextList);
      return {
        ...prev,
        learnerNotifications: nextList,
      };
    });
  }, []);

  const clearLearnerNotifications = useCallback(() => {
    persistLearnerNotificationsLocal([]);
    void syncLearnerNotificationsToSupabase([]);
    setState((prev) => ({
      ...prev,
      learnerNotifications: [],
    }));
  }, []);

  const addLearnerNotification = useCallback(
    (notification: {
      id?: string;
      title: string;
      body: string;
      time?: string;
      unread?: boolean;
      eventType?: LearnerNotificationEventType;
      createdAt?: string;
      targetLearner?: string;
      meta?: LearnerNotification["meta"];
    }) => {
      const notif = normalizeLearnerNotification(notification);
      knownLearnerNotifIdsRef.current.add(notif.id);
      learnerNotifHydratedRef.current = true;

      const currentList = (stateRef.current.learnerNotifications || []).map(
        (n) => normalizeLearnerNotification(n)
      );
      const deduped = [
        notif,
        ...currentList.filter((n) => n.id !== notif.id),
      ].slice(0, 50);

      setState((prev) => {
        const existing = prev.learnerNotifications || [];
        const nextList = [
          notif,
          ...existing.filter((n) => n.id !== notif.id),
        ].slice(0, 50);
        return {
          ...prev,
          learnerNotifications: nextList,
        };
      });

      persistLearnerNotificationsLocal(deduped);

      if (typeof window !== "undefined") {
        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "LEARNER_NOTIFICATION_NEW",
              notification: notif,
            });
            bc.close();
          } catch {}
        }

        window.dispatchEvent(
          new CustomEvent("ruang_sosmed_learner_notif", { detail: notif })
        );
      }

      void syncLearnerNotificationsToSupabase(deduped);
    },
    []
  );

  // WORKFLOW 1: Content Creation -> Admin Explorer + Learner Catalog Sync
  const publishContentToStudioAndCatalog = useCallback(
    (
      type: ContentType | "Folder",
      title: string,
      description?: string,
      urgency: "Urgent" | "Not Urgent" = "Not Urgent",
      sections?: CourseSectionAccordion[],
      cohort?: string,
      folderName?: string,
      folderColor?: string,
      accessCode?: string,
      wikiMeta?: {
        category?: string;
        wikiSections?: WikiDocumentSection[];
        wikiAttachments?: WikiAttachmentFile[];
        wikiReadTime?: string;
      }
    ) => {
      const isFolder = type === "Folder";
      const cfg = isFolder
        ? {
            colorHex: "#2563EB",
            bgTint: "rgba(37, 99, 235, 0.12)",
            borderTint: "rgba(37, 99, 235, 0.25)",
            description: description || "Folder materi dan kurikulum pembelajaran",
          }
        : CONTENT_TYPE_CONFIGS[type as ContentType];
      const finalDesc = description?.trim() || cfg.description;
      const nowId = Date.now();

      const titleKeyClean = title.trim().toLowerCase();
      if (titleKeyClean) {
        deletedContentTitlesRef.current.delete(titleKeyClean);
        persistStoredTombstoneMap(
          DELETED_CONTENT_TITLES_STORAGE_KEY,
          deletedContentTitlesRef.current
        );
      }
      cachedContentsRowsRef.current = null;
      lastContentsWmKeyRef.current = "";
      lastWatermarkRef.current = "";

      const existingSameTitle = stateRef.current.explorerItems.find(
        (e) => e.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      const effectiveFolderName = folderName || existingSameTitle?.folderName;
      const parentFolder =
        !isFolder && effectiveFolderName
          ? stateRef.current.explorerItems.find(
              (e) =>
                e.type === "Folder" &&
                e.title.trim().toLowerCase() ===
                  effectiveFolderName.trim().toLowerCase()
            )
          : undefined;
      const inheritedLearners: string[] = Array.from(
        new Set([
          ...(existingSameTitle?.assignedLearners || []),
          ...(parentFolder?.assignedLearners || []),
        ])
      );
      const candidateId =
        existingSameTitle?.id || (isFolder ? `folder-${nowId}` : `exp-${nowId}`);
      const normalizedAccessCode = getItemAccessCode({
        title,
        type,
        folderName: effectiveFolderName,
        id: candidateId,
        accessCode: accessCode?.trim() || existingSameTitle?.accessCode,
      });
      const savedLocalThumb =
        typeof window !== "undefined"
          ? window.localStorage.getItem(
              `ruang_sosmed_thumb_${title.trim().toLowerCase()}`
            )
          : null;
      const resolvedThumbnailUrl =
        savedLocalThumb || existingSameTitle?.thumbnailUrl || undefined;
      const resolvedWikiSections =
        wikiMeta?.wikiSections ?? existingSameTitle?.wikiSections;
      const resolvedWikiAttachments =
        wikiMeta?.wikiAttachments ?? existingSameTitle?.wikiAttachments;
      const resolvedWikiReadTime =
        wikiMeta?.wikiReadTime ?? existingSameTitle?.wikiReadTime;
      const resolvedCategory = isFolder
        ? "Folder"
        : wikiMeta?.category?.trim() ||
          (existingSameTitle?.category && existingSameTitle.category !== "Folder"
            ? existingSameTitle.category
            : "Social Media Strategy");

      const newExplorerItem: ExplorerContentItem = {
        id: candidateId,
        title,
        type,
        assignedCount: inheritedLearners.length,
        assignedLearners: inheritedLearners,
        category: resolvedCategory,
        urgency,
        editedLabel: "Published just now",
        statusLabel: "Completed",
        progressPercent: isFolder ? 0 : 100,
        language: "Bahasa / English",
        editedDate: "Edited Today",
        bannerGradient: isFolder
          ? "linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, #FFFFFF 100%)"
          : `linear-gradient(135deg, ${cfg.bgTint} 0%, #FFFFFF 100%)`,
        bannerAccent: isFolder
          ? folderColor || existingSameTitle?.bannerAccent || "blue"
          : cfg.colorHex,
        bannerPattern: "wiki",
        thumbnailUrl: resolvedThumbnailUrl,
        description: finalDesc,
        cohort: parentFolder?.cohort || cohort || existingSameTitle?.cohort,
        folderName: effectiveFolderName,
        accessCode: normalizedAccessCode,
        ...(type === "Wiki"
          ? {
              wikiSections: resolvedWikiSections,
              wikiAttachments: resolvedWikiAttachments,
              wikiReadTime: resolvedWikiReadTime,
            }
          : {}),
      };

      if (type === "Wiki" && typeof window !== "undefined" && resolvedWikiSections) {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_wiki_doc_${title.toLowerCase().trim()}`,
            JSON.stringify({
              sections: resolvedWikiSections,
              attachments: resolvedWikiAttachments || [],
              category: resolvedCategory,
              readTime: resolvedWikiReadTime,
              description: finalDesc,
            })
          );
        } catch {}
      }

      const publishCurriculumStats = summarizeCurriculumStats(
        extractVisibleChapters(
          sections || stateRef.current.courseCurriculums?.[title.trim().toLowerCase()]
        ),
        { fallbackPoints: 15, contentType: type }
      );

      const newCatalogItem: LearnerAssignedItem | null = isFolder
        ? null
        : {
            id: `lc-${nowId}`,
            title,
            type: type as ContentType,
            urgencyBadge: urgency === "Urgent" ? "Urgent" : "Due in 3 days",
            isUrgentRed: urgency === "Urgent",
            progressPercent: 0,
            pointsReward: publishCurriculumStats.totalPoints,
            duration: publishCurriculumStats.durationLabel,
            skillTags: [type, "Ruang Sosmed 2.0", "New Release"],
            thumbnailUrl: resolvedThumbnailUrl,
            description: finalDesc,
            isFavorite: false,
          };

      const newVersion: ContentVersionItem = {
        id: `ver-${nowId}`,
        versionTag: `v1.${state.versions.length + 1}`,
        label: `v1.${state.versions.length + 1} - Published by Mentor, Just now`,
        author: "Dinur M. Pradipta",
        notes: `Published "${title}" (${type}) to Learner Catalog.`,
        isCurrent: true,
      };

      // Persist to Supabase `contents` (status published + kurikulum di settings_json)
      // agar Learner di browser/akun lain langsung melihat konten ini.
      if (isSupabaseConfigured) {
        void (async () => {
          const dbId = await pushContentToSupabase(
            newExplorerItem,
            sections ?? null
          );
          if (dbId) {
            setState((prev) => ({
              ...prev,
              explorerItems: prev.explorerItems.map((e) =>
                e.id === newExplorerItem.id ? { ...e, id: dbId } : e
              ),
            }));
          } else {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "[RuangSosmed] Konten hanya tersimpan lokal. Pastikan akun admin login via Supabase dengan role admin/mentor."
              );
            }
          }
        })();
      }

      // Simpan kurikulum per course ke localStorage
      if (sections && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_curriculum_${title.toLowerCase().trim()}`,
            JSON.stringify(sections)
          );
        } catch {}
      }

      setState((prev) => {
        const gauge = recalculateStatusGauge(prev.contentStatusData, 1, 0, 0);
        const updatedCurriculums = {
          ...(prev.courseCurriculums || {}),
        };
        if (sections) {
          updatedCurriculums[title.toLowerCase().trim()] = sections;
        }

        const existingIdx = prev.explorerItems.findIndex(
          (i) => i.title.toLowerCase() === title.toLowerCase()
        );
        const nextExplorer =
          existingIdx >= 0
            ? prev.explorerItems.map((i, idx) =>
                idx === existingIdx ? newExplorerItem : i
              )
            : [...prev.explorerItems, newExplorerItem];

        const existingCatIdx = prev.learnerAssignedItems.findIndex(
          (i) => i.title.toLowerCase() === title.toLowerCase()
        );
        const nextCatalog = newCatalogItem
          ? existingCatIdx >= 0
            ? prev.learnerAssignedItems.map((i, idx) =>
                idx === existingCatIdx ? newCatalogItem : i
              )
            : [...prev.learnerAssignedItems, newCatalogItem]
          : prev.learnerAssignedItems;

        const courseKey = title.toLowerCase().trim();
        return {
          ...prev,
          courseSections:
            sections !== undefined &&
            courseKey === "fundamental social media specialist"
              ? sections
              : prev.courseSections,
          courseCurriculums: updatedCurriculums,
          explorerItems: deduplicateExplorerItems(nextExplorer),
          learnerAssignedItems: nextCatalog,
          versions: [
            newVersion,
            ...prev.versions.map((v) => ({ ...v, isCurrent: false })),
          ],
          contentStatusData: gauge.segments,
          totalContentsGaugeCount: gauge.total,
        };
      });

      if (!isFolder) {
        addLearnerNotification({
          id: `notif-mat-${nowId}`,
          eventType: "material_added",
          title: existingSameTitle
            ? `📚 Materi Diperbarui: ${title}`
            : `📚 Materi Baru Tersedia: ${title}`,
          body: `Admin/Mentor telah ${
            existingSameTitle ? "memperbarui" : "menambahkan"
          } materi ${type} "${title}" ke Ruang Sosmed 2.0. Yuk pelajari sekarang!`,
          time: "Baru saja",
          unread: true,
          meta: { contentTitle: title },
        });
      }
    },
    [state.versions.length, addLearnerNotification]
  );

  const createFolder = useCallback(
    (
      folderName: string,
      description?: string,
      cohort?: string,
      folderColor?: string,
      accessCode?: string
    ) => {
      publishContentToStudioAndCatalog(
        "Folder",
        folderName,
        description || "Folder materi dan kurikulum pembelajaran",
        "Not Urgent",
        undefined,
        cohort,
        undefined,
        folderColor || "blue",
        accessCode
      );
    },
    [publishContentToStudioAndCatalog]
  );

  const updateFolder = useCallback(
    (
      folderId: string,
      oldTitle: string,
      newTitle: string,
      newDescription: string,
      folderColor?: string,
      accessCode?: string
    ) => {
      const trimmedTitle = newTitle.trim();
      const trimmedDesc = newDescription.trim();
      if (!trimmedTitle) return;
      const existingFolder = stateRef.current.explorerItems.find(
        (i) => i.id === folderId
      );
      const nextAccessCode = (
        accessCode?.trim() ||
        existingFolder?.accessCode ||
        getDefaultFolderAccessCode(trimmedTitle)
      )
        .toUpperCase()
        .replace(/\s+/g, "-");

      setState((prev) => {
        const nextItems = prev.explorerItems.map((item) => {
          if (item.id === folderId) {
            return {
              ...item,
              title: trimmedTitle,
              description: trimmedDesc,
              bannerAccent: folderColor || item.bannerAccent || "blue",
              accessCode: nextAccessCode,
            };
          }
          if (
            item.folderName?.trim().toLowerCase() === oldTitle.trim().toLowerCase()
          ) {
            return {
              ...item,
              folderName: trimmedTitle,
            };
          }
          return item;
        });

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "ruang_sosmed_explorer_items_v2",
              JSON.stringify(nextItems)
            );
          }
        } catch {}

        return {
          ...prev,
          explorerItems: nextItems,
        };
      });

      if (isSupabaseConfigured) {
        void (async () => {
          try {
            const { data: existingRow } = await supabase
              .from("contents")
              .select("settings_json")
              .eq("id", folderId)
              .maybeSingle();

            const existingSettings = existingRow?.settings_json || {};
            const updatedMeta = {
              ...(existingSettings.explorer_meta || {}),
              bannerAccent: folderColor || "blue",
              accessCode: nextAccessCode,
            };

            await supabase
              .from("contents")
              .update({
                title: trimmedTitle,
                description: trimmedDesc,
                category_tags: ["Folder", folderColor || "blue"],
                settings_json: {
                  ...existingSettings,
                  explorer_meta: updatedMeta,
                },
              })
              .eq("id", folderId);

            await supabase
              .from("contents")
              .update({
                folder_name: trimmedTitle,
              })
              .eq("folder_name", oldTitle);
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "[RuangSosmed] Gagal sinkronisasi update folder ke Supabase:",
                err
              );
            }
          }
        })();
      }
    },
    []
  );

  const moveToFolder = useCallback(
    (itemId: string, targetFolder: string | null) => {
      const cleanFolder = targetFolder ? targetFolder.trim() : undefined;
      const targetItem = stateRef.current.explorerItems.find(
        (i) => i.id === itemId
      );
      const destFolder = cleanFolder
        ? stateRef.current.explorerItems.find(
            (i) =>
              i.type === "Folder" &&
              i.title.trim().toLowerCase() === cleanFolder.toLowerCase()
          )
        : undefined;
      const inheritedList = targetItem
        ? Array.from(
            new Set([
              ...(targetItem.assignedLearners || []),
              ...(destFolder?.assignedLearners || []),
            ])
          )
        : [];

      const updatedForPush = targetItem
        ? {
            ...targetItem,
            folderName: cleanFolder,
            cohort: destFolder?.cohort || targetItem.cohort,
            assignedLearners: inheritedList,
            assignedCount: inheritedList.length,
          }
        : null;

      setState((prev) => {
        const nextItems = prev.explorerItems.map((item) => {
          if (item.id !== itemId) return item;
          const nextLearners = Array.from(
            new Set([
              ...(item.assignedLearners || []),
              ...(destFolder?.assignedLearners || []),
            ])
          );
          return {
            ...item,
            folderName: cleanFolder,
            cohort: destFolder?.cohort || item.cohort,
            assignedLearners: nextLearners,
            assignedCount: nextLearners.length,
          };
        });
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "ruang_sosmed_explorer_items_v2",
              JSON.stringify(nextItems)
            );
          }
        } catch {}
        return {
          ...prev,
          explorerItems: nextItems,
        };
      });

      if (updatedForPush) {
        void pushContentToSupabase(
          updatedForPush,
          stateRef.current.courseCurriculums?.[
            updatedForPush.title.trim().toLowerCase()
          ] ?? null
        );
      }
    },
    []
  );

  const duplicateExplorerItem = useCallback((item: ExplorerContentItem) => {
    const nowId = Date.now();
    const copyTitle = `${item.title} (Copy)`;
    const copy: ExplorerContentItem = {
      ...item,
      id: `item-copy-${nowId}`,
      title: copyTitle,
      editedLabel: "Edited just now",
    };
    setState((prev) => {
      const nextExplorer = [copy, ...prev.explorerItems];
      const nextCatalog = syncLearnerCatalogWithExplorer(
        nextExplorer,
        prev.learnerAssignedItems,
        prev.courseCurriculums
      );
      return {
        ...prev,
        explorerItems: nextExplorer,
        learnerAssignedItems: nextCatalog,
      };
    });
  }, []);

  const deleteExplorerItem = useCallback((id: string) => {
    const targetForDb = stateRef.current.explorerItems.find((i) => i.id === id);
    const targetTitle = targetForDb?.title || "";
    const targetTitleKey = targetTitle.trim().toLowerCase();
    const targetType = targetForDb?.type;

    if (id) {
      deletedContentIdsRef.current.add(id);
      persistStoredIdSet(
        DELETED_CONTENT_IDS_STORAGE_KEY,
        deletedContentIdsRef.current
      );
    }
    if (targetTitleKey) {
      deletedContentTitlesRef.current.set(
        targetTitleKey,
        Date.now() + CONTENT_TOMBSTONE_TTL_MS
      );
      persistStoredTombstoneMap(
        DELETED_CONTENT_TITLES_STORAGE_KEY,
        deletedContentTitlesRef.current
      );
    }

    // Invalidate all sync caches immediately so stale rows cannot replay the deleted item
    cachedContentsRowsRef.current = null;
    lastContentsWmKeyRef.current = "";
    lastWatermarkRef.current = "";
    cleanupLocalStorageForContent(id, targetTitle);

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("ruang_sosmed_channel");
        bc.postMessage({
          type: "CONTENT_DELETED",
          id,
          titleKey: targetTitleKey,
          contentType: targetType,
        });
        bc.close();
      } catch {}
    }

    if (isSupabaseConfigured && targetForDb) {
      void (async () => {
        try {
          let serverDeleteOk = false;
          if (typeof window !== "undefined") {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              if (accessToken) {
                const res = await fetch("/api/lms", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    action: "delete_content",
                    payload: {
                      id: targetForDb.id,
                      title: targetForDb.title,
                      type: targetForDb.type,
                    },
                  }),
                });
                if (res.ok) {
                  const parsed = await res.json().catch(() => null);
                  if (parsed?.ok) serverDeleteOk = true;
                }
              }
            } catch {}
          }

          if (!serverDeleteOk || isUuid(targetForDb.id)) {
            const matchingIds = new Set<string>();
            if (isUuid(targetForDb.id)) {
              matchingIds.add(targetForDb.id);
            }
            if (targetTitle.trim() && !targetTitle.startsWith("__SYSTEM_")) {
              const escaped = targetTitle.trim().replace(/[\\%_]/g, "\\$&");
              const { data: dupRows } = await supabase
                .from("contents")
                .select("id, type, title")
                .ilike("title", `%${escaped}%`)
                .not("title", "like", "__SYSTEM_%");
              if (Array.isArray(dupRows)) {
                dupRows.forEach((row: any) => {
                  if (
                    row?.id &&
                    String(row.title || "").trim().toLowerCase() === targetTitleKey
                  ) {
                    matchingIds.add(String(row.id));
                  }
                });
              }
            }

            const nowIso = new Date().toISOString();
            for (const rowId of Array.from(matchingIds)) {
              deletedContentIdsRef.current.add(rowId);
              try {
                await supabase
                  .from("contents")
                  .update({
                    status: "draft",
                    title: `__DELETED__${rowId}`,
                    folder_name: null,
                    access_code: null,
                    updated_at: nowIso,
                  })
                  .eq("id", rowId);
              } catch {}
              await supabase.from("contents").delete().eq("id", rowId);
            }
            persistStoredIdSet(
              DELETED_CONTENT_IDS_STORAGE_KEY,
              deletedContentIdsRef.current
            );

            if (matchingIds.size === 0 && targetTitle.trim()) {
              await supabase
                .from("contents")
                .delete()
                .eq("title", targetTitle.trim());
            }
          }
        } catch {} finally {
          cachedContentsRowsRef.current = null;
          lastContentsWmKeyRef.current = "";
          lastWatermarkRef.current = "";
        }
      })();
    }

    setState((prev) => {
      const nextExplorer = prev.explorerItems.filter((i) => {
        if (i.id === id) return false;
        if (
          targetTitleKey &&
          i.title.trim().toLowerCase() === targetTitleKey &&
          (!targetType || i.type === targetType)
        ) {
          return false;
        }
        return true;
      });
      const nextCurriculums = { ...(prev.courseCurriculums || {}) };
      if (targetTitleKey) {
        delete nextCurriculums[targetTitleKey];
      }
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_explorer_items_v2",
            JSON.stringify(nextExplorer)
          );
        } catch {}
      }
      const nextCatalog = syncLearnerCatalogWithExplorer(
        nextExplorer,
        prev.learnerAssignedItems.filter(
          (l) =>
            !targetTitleKey ||
            l.title.trim().toLowerCase() !== targetTitleKey
        ),
        nextCurriculums
      );
      const firstRemainingKey = nextExplorer[0]?.title?.trim().toLowerCase();
      const nextSections =
        nextExplorer.length === 0
          ? []
          : (firstRemainingKey && nextCurriculums[firstRemainingKey]) ||
            prev.courseSections;

      return {
        ...prev,
        explorerItems: nextExplorer,
        learnerAssignedItems: nextCatalog,
        courseCurriculums: nextCurriculums,
        courseSections: nextSections,
      };
    });
  }, []);

  const toggleArchiveContent = useCallback((id: string) => {
    const target = stateRef.current.explorerItems.find((i) => i.id === id);
    if (!target) return;
    const nextArchived = !target.isArchived;

    if (isSupabaseConfigured) {
      void (async () => {
        try {
          const nextStatus = nextArchived ? "archived" : "published";
          let existingSettings: any = {};
          if (isUuid(target.id)) {
            const { data } = await supabase
              .from("contents")
              .select("settings_json")
              .eq("id", target.id)
              .maybeSingle();
            if (data?.settings_json) existingSettings = data.settings_json;
          }
          const updatedSettings = {
            ...existingSettings,
            explorer_meta: {
              ...(existingSettings.explorer_meta || {}),
              isArchived: nextArchived,
            },
          };
          if (isUuid(target.id)) {
            await supabase
              .from("contents")
              .update({
                status: nextStatus,
                settings_json: updatedSettings,
              })
              .eq("id", target.id);
          } else {
            await supabase
              .from("contents")
              .update({
                status: nextStatus,
                settings_json: updatedSettings,
              })
              .ilike("title", target.title.trim());
          }
        } catch (e) {
          if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Gagal update status arsip di Supabase:", e);
        }
      })();
    }

    setState((prev) => {
      const nextExplorer = prev.explorerItems.map((item) =>
        item.id === id
          ? {
              ...item,
              isArchived: nextArchived,
              editedLabel: nextArchived ? "Archived" : "Published",
              statusLabel: (nextArchived ? "Archived" : "Completed") as ExplorerContentItem["statusLabel"],
            }
          : item
      );
      return {
        ...prev,
        explorerItems: nextExplorer,
      };
    });
  }, []);

  const toggleShareContent = useCallback((id: string) => {
    const target = stateRef.current.explorerItems.find((i) => i.id === id);
    if (!target) return;
    const nextShared = !target.isShared;

    if (isSupabaseConfigured) {
      void (async () => {
        try {
          let existingSettings: any = {};
          if (isUuid(target.id)) {
            const { data } = await supabase
              .from("contents")
              .select("settings_json")
              .eq("id", target.id)
              .maybeSingle();
            if (data?.settings_json) existingSettings = data.settings_json;
          }
          const updatedSettings = {
            ...existingSettings,
            explorer_meta: {
              ...(existingSettings.explorer_meta || {}),
              isShared: nextShared,
            },
          };
          const updatePayload: Record<string, any> = {
            settings_json: updatedSettings,
          };
          if (isUuid(target.id)) {
            const res = await supabase
              .from("contents")
              .update({ ...updatePayload, is_shared: nextShared })
              .eq("id", target.id);
            if (res.error) {
              await supabase
                .from("contents")
                .update(updatePayload)
                .eq("id", target.id);
            }
          } else {
            const res = await supabase
              .from("contents")
              .update({ ...updatePayload, is_shared: nextShared })
              .ilike("title", target.title.trim());
            if (res.error) {
              await supabase
                .from("contents")
                .update(updatePayload)
                .ilike("title", target.title.trim());
            }
          }
        } catch (e) {
          if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Gagal update share status di Supabase:", e);
        }
      })();
    }

    setState((prev) => {
      const nextExplorer = prev.explorerItems.map((item) =>
        item.id === id ? { ...item, isShared: nextShared } : item
      );
      return {
        ...prev,
        explorerItems: nextExplorer,
      };
    });
  }, []);

  const updateExplorerItemThumbnail = useCallback(
    (id: string, thumbnailUrl: string) => {
      // 1. Immediately cache in localStorage
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`ruang_sosmed_thumb_${id}`, thumbnailUrl);
          const found = stateRef.current.explorerItems.find(
            (i) =>
              i.id === id ||
              i.title.trim().toLowerCase() === id.trim().toLowerCase()
          );
          if (found) {
            const k = found.title.trim().toLowerCase();
            window.localStorage.setItem(`ruang_sosmed_thumb_${k}`, thumbnailUrl);
          }
        } catch {
          // ignore
        }
      }

      // 2. Update React State in memory (both Admin Explorer and Learner Assigned Items)
      setState((prev) => {
        const nextExplorer = prev.explorerItems.map((item) =>
          item.id === id ||
          item.title.trim().toLowerCase() === id.trim().toLowerCase()
            ? { ...item, thumbnailUrl }
            : item
        );
        const nextCatalog = prev.learnerAssignedItems.map((item) =>
          item.id === id ||
          item.title.trim().toLowerCase() === id.trim().toLowerCase()
            ? { ...item, thumbnailUrl }
            : item
        );
        return {
          ...prev,
          explorerItems: nextExplorer,
          learnerAssignedItems: nextCatalog,
        };
      });

      // 3. Sinkronkan ke Supabase table contents (column thumbnail_url & explorer_meta)
      const target = stateRef.current.explorerItems.find(
        (i) =>
          i.id === id ||
          i.title.trim().toLowerCase() === id.trim().toLowerCase()
      );
      if (target) {
        const updated = { ...target, thumbnailUrl };
        const key = target.title.trim().toLowerCase();
        void pushContentToSupabase(
          updated,
          stateRef.current.courseCurriculums?.[key] ?? null
        ).then((dbId) => {
          if (dbId && dbId !== target.id) {
            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem(
                  `ruang_sosmed_thumb_${dbId}`,
                  thumbnailUrl
                );
              } catch {}
            }
            setState((prev) => ({
              ...prev,
              explorerItems: prev.explorerItems.map((e) =>
                e.id === target.id ? { ...e, id: dbId } : e
              ),
              learnerAssignedItems: prev.learnerAssignedItems.map((l) =>
                l.id === target.id ? { ...l, id: dbId } : l
              ),
            }));
          }
        });

        if (isSupabaseConfigured) {
          void (async () => {
            try {
              if (isUuid(target.id)) {
                await supabase
                  .from("contents")
                  .update({
                    thumbnail_url: thumbnailUrl || null,
                  })
                  .eq("id", target.id);
              } else {
                await supabase
                  .from("contents")
                  .update({
                    thumbnail_url: thumbnailUrl || null,
                  })
                  .ilike("title", target.title.trim());
              }
            } catch {
              // ignore
            }
          })();
        }
      }
    },
    []
  );

  const updateContentLanguage = useCallback(
    (itemIdOrTitle: string, language: string) => {
      setState((prev) => {
        const nextExplorer = prev.explorerItems.map((item) =>
          item.id === itemIdOrTitle ||
          item.title.trim().toLowerCase() ===
            itemIdOrTitle.trim().toLowerCase()
            ? { ...item, language }
            : item
        );
        return {
          ...prev,
          explorerItems: nextExplorer,
        };
      });

      // Sinkronkan ke Supabase settings_json.explorer_meta.language
      const target = stateRef.current.explorerItems.find(
        (i) =>
          i.id === itemIdOrTitle ||
          i.title.trim().toLowerCase() === itemIdOrTitle.trim().toLowerCase()
      );
      if (target) {
        const updated = { ...target, language };
        const key = target.title.trim().toLowerCase();
        void pushContentToSupabase(
          updated,
          stateRef.current.courseCurriculums?.[key] ?? null
        );
      }
    },
    []
  );

  const updateExplorerItemDetails = useCallback(
    (
      idOrTitle: string,
      patch: {
        title?: string;
        thumbnailUrl?: string;
        bannerGradient?: string;
        language?: string;
        description?: string;
        isPro?: boolean;
        unlockPriceIdr?: number;
        unlockPointsCost?: number;
        curriculum?: CourseSectionAccordion[];
      }
    ) => {
      const normalizedNeedle = idOrTitle.trim().toLowerCase();
      const target = stateRef.current.explorerItems.find(
        (i) =>
          i.id === idOrTitle ||
          i.title.trim().toLowerCase() === normalizedNeedle
      );
      if (!target) return;

      const oldKey = target.title.trim().toLowerCase();
      const nextTitle =
        patch.title && patch.title.trim() ? patch.title.trim() : target.title;
      const newKey = nextTitle.trim().toLowerCase();
      const isRenamed = oldKey !== newKey;

      const updatedItem: ExplorerContentItem = {
        ...target,
        title: nextTitle,
        ...(patch.thumbnailUrl !== undefined
          ? { thumbnailUrl: patch.thumbnailUrl || undefined }
          : {}),
        ...(patch.bannerGradient !== undefined
          ? { bannerGradient: patch.bannerGradient }
          : {}),
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
        ...(patch.isPro !== undefined ? { isPro: patch.isPro } : {}),
        ...(patch.unlockPriceIdr !== undefined
          ? { unlockPriceIdr: patch.unlockPriceIdr }
          : {}),
        ...(patch.unlockPointsCost !== undefined
          ? { unlockPointsCost: patch.unlockPointsCost }
          : {}),
      };

      if (patch.curriculum) {
        recentCurriculumMutationUntilRef.current.set(newKey, Date.now() + 15000);
        if (curriculumPushTimer.current) {
          clearTimeout(curriculumPushTimer.current);
          curriculumPushTimer.current = null;
        }
      }

      if (typeof window !== "undefined") {
        try {
          if (patch.thumbnailUrl !== undefined) {
            if (patch.thumbnailUrl) {
              window.localStorage.setItem(
                `ruang_sosmed_thumb_${target.id}`,
                patch.thumbnailUrl
              );
              window.localStorage.setItem(
                `ruang_sosmed_thumb_${newKey}`,
                patch.thumbnailUrl
              );
            } else {
              window.localStorage.removeItem(`ruang_sosmed_thumb_${target.id}`);
              window.localStorage.removeItem(`ruang_sosmed_thumb_${newKey}`);
            }
          }
          if (patch.isPro !== undefined) {
            window.localStorage.setItem(
              `ruang_sosmed_course_tier_${newKey}`,
              patch.isPro ? "pro" : "free"
            );
          }
          if (isRenamed) {
            for (const prefix of [
              "ruang_sosmed_curriculum_",
              "ruang_sosmed_editor_sections_",
              "ruang_sosmed_course_tier_",
              "ruang_sosmed_thumb_",
            ]) {
              const existingVal = window.localStorage.getItem(`${prefix}${oldKey}`);
              if (existingVal !== null) {
                window.localStorage.setItem(`${prefix}${newKey}`, existingVal);
                window.localStorage.removeItem(`${prefix}${oldKey}`);
              }
            }
          }
          if (patch.curriculum) {
            window.localStorage.setItem(
              `ruang_sosmed_curriculum_${newKey}`,
              JSON.stringify(patch.curriculum)
            );
          }
        } catch {}
      }

      setState((prev) => {
        const nextExplorer = prev.explorerItems.map((item) =>
          item.id === target.id ? updatedItem : item
        );
        let nextCurriculums = prev.courseCurriculums;
        if (patch.curriculum) {
          nextCurriculums = {
            ...(prev.courseCurriculums || {}),
            [newKey]: patch.curriculum,
          };
          if (isRenamed) delete nextCurriculums[oldKey];
        } else if (isRenamed && prev.courseCurriculums?.[oldKey]) {
          nextCurriculums = { ...prev.courseCurriculums };
          nextCurriculums[newKey] = nextCurriculums[oldKey];
          delete nextCurriculums[oldKey];
        }

        const mappedCatalog = prev.learnerAssignedItems.map((item) =>
          item.id === target.id ||
          item.title.trim().toLowerCase() === oldKey
            ? {
                ...item,
                title: nextTitle,
                ...(patch.thumbnailUrl !== undefined
                  ? { thumbnailUrl: patch.thumbnailUrl || undefined }
                  : {}),
                ...(patch.bannerGradient !== undefined
                  ? { bannerGradient: patch.bannerGradient }
                  : {}),
                ...(patch.description !== undefined
                  ? { description: patch.description }
                  : {}),
                ...(patch.isPro !== undefined ? { isPro: patch.isPro } : {}),
                ...(patch.unlockPriceIdr !== undefined
                  ? { unlockPriceIdr: patch.unlockPriceIdr }
                  : {}),
                ...(patch.unlockPointsCost !== undefined
                  ? { unlockPointsCost: patch.unlockPointsCost }
                  : {}),
              }
            : item
        );
        const nextCatalog = patch.curriculum
          ? syncLearnerCatalogWithExplorer(
              nextExplorer,
              mappedCatalog,
              nextCurriculums
            )
          : mappedCatalog;

        return {
          ...prev,
          explorerItems: nextExplorer,
          learnerAssignedItems: nextCatalog,
          courseCurriculums: nextCurriculums,
        };
      });

      cachedContentsRowsRef.current = null;
      lastContentsWmKeyRef.current = "";
      lastWatermarkRef.current = "";

      const currentCurr =
        patch.curriculum ??
        stateRef.current.courseCurriculums?.[newKey] ??
        stateRef.current.courseCurriculums?.[oldKey] ??
        null;
      void pushContentToSupabase(updatedItem, currentCurr).then(() => {
        cachedContentsRowsRef.current = null;
        lastContentsWmKeyRef.current = "";
        lastWatermarkRef.current = "";
      });
    },
    []
  );

  const addWikiResourceCard = useCallback((card: WikiResourceCard) => {
    setState((prev) => ({
      ...prev,
      wikiResources: [card, ...prev.wikiResources],
    }));
  }, []);

  const deleteWikiResourceCard = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      wikiResources: prev.wikiResources.filter((r) => r.id !== id),
    }));
  }, []);

  // WORKFLOW 2: Assigning Learners Flow -> Adds to Learner's Assigned to You at Not Started (0%)
  const assignContentToLearners = useCallback(
    (
      contentItem: ExplorerContentItem,
      learnerNames: string[],
      dueDate: string,
      _batchMode: string
    ) => {
      const nowId = Date.now();
      const validType: ContentType =
        contentItem.type === "Folder" ? "Course" : contentItem.type;
      const targetCourse =
        stateRef.current.explorerItems.find(
          (i) =>
            i.id === contentItem.id ||
            i.title.trim().toLowerCase() === contentItem.title.trim().toLowerCase()
        ) || contentItem;
      const isFolderAssign = targetCourse.type === "Folder";
      const folderTitleLower = targetCourse.title.trim().toLowerCase();

      const itemsToPush: ExplorerContentItem[] = [];
      const lockExpires = Date.now() + 15000;

      const updatedTargetList = Array.from(
        new Set([...(targetCourse.assignedLearners || []), ...learnerNames])
      );
      const updatedExplorerForPush: ExplorerContentItem = {
        ...targetCourse,
        assignedLearners: updatedTargetList,
        assignedCount: updatedTargetList.length,
      };
      itemsToPush.push(updatedExplorerForPush);

      if (isFolderAssign) {
        stateRef.current.explorerItems.forEach((child) => {
          if (
            child.type !== "Folder" &&
            child.folderName?.trim().toLowerCase() === folderTitleLower
          ) {
            const childNextList = Array.from(
              new Set([...(child.assignedLearners || []), ...learnerNames])
            );
            itemsToPush.push({
              ...child,
              assignedLearners: childNextList,
              assignedCount: childNextList.length,
            });
          }
        });
      }

      itemsToPush.forEach((itemCopy) => {
        const list = itemCopy.assignedLearners || [];
        recentAssignmentLocksRef.current.set(itemCopy.id, {
          assignedLearners: list,
          expiresAt: lockExpires,
        });
        recentAssignmentLocksRef.current.set(
          itemCopy.title.trim().toLowerCase(),
          {
            assignedLearners: list,
            expiresAt: lockExpires,
          }
        );
      });

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          itemsToPush.forEach((itemCopy) => {
            bc.postMessage({
              type: "ASSIGNMENT_UPDATED",
              contentId: itemCopy.id,
              contentTitle: itemCopy.title,
              assignedLearners: itemCopy.assignedLearners || [],
            });
          });
          bc.close();
        } catch {}
      }

      setState((prev) => {
        // Update Explorer assignedCount & assignedLearners (including folder child courses when assigning a Folder)
        const nextExplorer = prev.explorerItems.map((item) => {
          const isMatch =
            item.id === contentItem.id ||
            item.title.trim().toLowerCase() === folderTitleLower ||
            (isFolderAssign &&
              item.type !== "Folder" &&
              item.folderName?.trim().toLowerCase() === folderTitleLower);
          if (!isMatch) return item;
          const nextLearners = Array.from(
            new Set([...(item.assignedLearners || []), ...learnerNames])
          );
          return {
            ...item,
            assignedLearners: nextLearners,
            assignedCount: nextLearners.length,
          };
        });

        // Ensure item exists in Learner's Assigned to You list with 0% Not Started if newly assigned
        const existingIdx = prev.learnerAssignedItems.findIndex(
          (l) => l.title.toLowerCase() === contentItem.title.toLowerCase()
        );

        let nextLearnerItems = [...prev.learnerAssignedItems];
        const assignCurrStats = summarizeCurriculumStats(
          extractVisibleChapters(
            prev.courseCurriculums?.[contentItem.title.trim().toLowerCase()]
          ),
          { fallbackPoints: 15, contentType: validType }
        );
        const newAssignedCard: LearnerAssignedItem = {
          id: `lc-assigned-${nowId}`,
          title: contentItem.title,
          type: validType,
          urgencyBadge:
            contentItem.urgency === "Urgent" ? "Urgent" : "Due in 3 days",
          isUrgentRed: contentItem.urgency === "Urgent",
          progressPercent: 0, // Initial status: Not Started (0%)
          pointsReward: assignCurrStats.totalPoints,
          duration: assignCurrStats.durationLabel,
          skillTags: [contentItem.category, "Assigned by Mentor", `Due ${dueDate}`],
          description: contentItem.description,
          isFavorite: false,
        };

        if (existingIdx >= 0) {
          nextLearnerItems[existingIdx] = {
            ...nextLearnerItems[existingIdx],
            progressPercent: 0,
            urgencyBadge: "Urgent",
            isUrgentRed: true,
          };
          // Move to top of Assigned to You
          const [moved] = nextLearnerItems.splice(existingIdx, 1);
          nextLearnerItems = [moved, ...nextLearnerItems];
        } else {
          nextLearnerItems = [newAssignedCard, ...nextLearnerItems];
        }

        // Update Admin Assignees panel (add any new learner names or reset to 0/24 chapters)
        const nextAssignees = [...prev.assignees];
        learnerNames.forEach((name, idx) => {
          const found = nextAssignees.find(
            (a) => a.name.toLowerCase() === name.toLowerCase()
          );
          if (!found && !name.includes("Batch") && !name.includes("Bootcamp")) {
            const initials = name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            nextAssignees.unshift({
              id: `asg-${nowId}-${idx}`,
              name,
              initials,
              avatarBg: "#EEF2FF",
              avatarText: "#4F39F6",
              roleBadge: "Social Media",
              completedChapters: 0,
              totalChapters: 24,
              assignedDate: "Assigned Today",
            });
          }
        });

        const gauge = recalculateStatusGauge(prev.contentStatusData, 0, 0, 1);

        return {
          ...prev,
          explorerItems: nextExplorer,
          learnerAssignedItems: nextLearnerItems,
          assignees: nextAssignees,
          contentStatusData: gauge.segments,
          totalContentsGaugeCount: gauge.total,
        };
      });

      addLearnerNotification({
        id: `notif-assign-${nowId}`,
        eventType: "material_added",
        title: `📚 Materi Baru Ditugaskan: ${contentItem.title}`,
        body: `Admin/Mentor telah menugaskan materi "${contentItem.title}" kepada Anda (Tenggat: ${dueDate}).`,
        time: "Baru saja",
        unread: true,
        meta: { contentTitle: contentItem.title },
      });

      itemsToPush.forEach((pushedItem) => {
        void pushContentToSupabase(
          pushedItem,
          stateRef.current.courseCurriculums?.[
            pushedItem.title.trim().toLowerCase()
          ] ?? null
        );
      });
    },
    [addLearnerNotification]
  );

  const manageAssigneeAction = useCallback(
    (learnerId: string, action: "remind" | "reset" | "unassign") => {
      if (action === "remind") return;
      const targetLearner = stateRef.current.assignees.find(
        (a) => a.id === learnerId
      );
      const targetNameLower = targetLearner?.name.trim().toLowerCase() || "";
      const modifiedForPush: ExplorerContentItem[] = [];

      if (action === "unassign" && targetNameLower) {
        stateRef.current.explorerItems.forEach((item) => {
          const curList = item.assignedLearners || [];
          const nextList = curList.filter(
            (n) => n.trim().toLowerCase() !== targetNameLower
          );
          if (nextList.length !== curList.length) {
            modifiedForPush.push({
              ...item,
              assignedLearners: nextList,
              assignedCount: nextList.length,
            });
          }
        });
      }

      setState((prev) => {
        if (action === "reset") {
          return {
            ...prev,
            assignees: prev.assignees.map((a) =>
              a.id === learnerId ? { ...a, completedChapters: 0 } : a
            ),
          };
        }
        return {
          ...prev,
          assignees: prev.assignees.filter((a) => a.id !== learnerId),
          explorerItems: targetNameLower
            ? prev.explorerItems.map((item) => {
                const curList = item.assignedLearners || [];
                const nextList = curList.filter(
                  (n) => n.trim().toLowerCase() !== targetNameLower
                );
                if (nextList.length === curList.length) return item;
                return {
                  ...item,
                  assignedLearners: nextList,
                  assignedCount: nextList.length,
                };
              })
            : prev.explorerItems,
        };
      });

      modifiedForPush.forEach((updatedExp) => {
        const lockExpires = Date.now() + 15000;
        const listCopy = updatedExp.assignedLearners || [];
        recentAssignmentLocksRef.current.set(updatedExp.id, {
          assignedLearners: listCopy,
          expiresAt: lockExpires,
        });
        recentAssignmentLocksRef.current.set(
          updatedExp.title.trim().toLowerCase(),
          {
            assignedLearners: listCopy,
            expiresAt: lockExpires,
          }
        );
        void pushContentToSupabase(
          updatedExp,
          stateRef.current.courseCurriculums?.[
            updatedExp.title.trim().toLowerCase()
          ] ?? null
        );
      });
    },
    []
  );

  const unassignLearnerFromContent = useCallback(
    (
      contentIdOrTitle: string,
      learner:
        | {
            id?: string | null;
            name?: string | null;
            email?: string | null;
            username?: string | null;
          }
        | string
    ) => {
      const targetObj =
        typeof learner === "string"
          ? { name: learner, email: learner }
          : learner;

      const aliasSet = new Set<string>();
      const pushAlias = (val?: string | null) => {
        const clean = (val || "").trim().toLowerCase().replace(/\s+/g, " ");
        if (!clean) return;
        aliasSet.add(clean);
        aliasSet.add(clean.replace(/^@+/, ""));
        const parts = clean.split(" ").filter(Boolean);
        if (parts.length >= 3) {
          aliasSet.add(`${parts[0]} ${parts[parts.length - 1]}`);
        }
      };

      pushAlias(targetObj.id);
      pushAlias(targetObj.name);
      pushAlias(targetObj.email);
      pushAlias(targetObj.username);

      // Enrich alias lookup with matching assignees / leaderboard entry so name & email both get removed
      if (targetObj.id || targetObj.name) {
        const matchedAsg = stateRef.current.assignees.find(
          (a) =>
            (targetObj.id && a.id === targetObj.id) ||
            (targetObj.name &&
              a.name.trim().toLowerCase() ===
                targetObj.name.trim().toLowerCase())
        );
        if (matchedAsg) {
          pushAlias(matchedAsg.id);
          pushAlias(matchedAsg.name);
        }
      }

      if (aliasSet.size === 0) return;

      const targetKey = contentIdOrTitle.trim().toLowerCase();
      const applyAllCourses = targetKey === "*";
      const cohortWildcards = new Set([
        "all learners",
        "batch oktober 2026",
        "ruang sosmed class",
        "creator growth lab",
      ]);

      const modifiedForPush: ExplorerContentItem[] = [];
      const allOtherLearnerNames = Array.from(
        new Set(
          [
            ...stateRef.current.assignees.map((a) => a.name),
            ...stateRef.current.leaderboard.map((l) => l.name),
          ].filter((n) => n && !aliasSet.has(n.trim().toLowerCase()))
        )
      );

      const computeNextAssignedList = (curList: string[]) => {
        let hadWildcard = false;
        const remaining: string[] = [];
        curList.forEach((entry) => {
          const norm = String(entry || "").trim().toLowerCase();
          if (!norm) return;
          if (cohortWildcards.has(norm)) {
            hadWildcard = true;
            return;
          }
          if (!aliasSet.has(norm)) {
            remaining.push(entry);
          }
        });
        if (hadWildcard) {
          allOtherLearnerNames.forEach((otherName) => {
            if (
              !remaining.some(
                (r) => r.trim().toLowerCase() === otherName.trim().toLowerCase()
              )
            ) {
              remaining.push(otherName);
            }
          });
        }
        return remaining;
      };

      const lockExpires = Date.now() + 15000;

      const targetFolderMatch = stateRef.current.explorerItems.find(
        (item) =>
          item.type === "Folder" &&
          (item.id === contentIdOrTitle ||
            item.title.trim().toLowerCase() === targetKey)
      );

      stateRef.current.explorerItems.forEach((item) => {
        const isCourseMatch =
          applyAllCourses ||
          item.id === contentIdOrTitle ||
          item.title.trim().toLowerCase() === targetKey ||
          Boolean(
            targetFolderMatch &&
              item.type !== "Folder" &&
              item.folderName?.trim().toLowerCase() ===
                targetFolderMatch.title.trim().toLowerCase()
          );
        if (!isCourseMatch) return;

        const curList = item.assignedLearners || [];
        const nextList = computeNextAssignedList(curList);
        if (
          nextList.length !== curList.length ||
          nextList.some((x, idx) => x !== curList[idx])
        ) {
          const updatedItem: ExplorerContentItem = {
            ...item,
            assignedLearners: nextList,
            assignedCount: nextList.length,
          };
          modifiedForPush.push(updatedItem);
          recentAssignmentLocksRef.current.set(updatedItem.id, {
            assignedLearners: nextList,
            expiresAt: lockExpires,
          });
          recentAssignmentLocksRef.current.set(
            updatedItem.title.trim().toLowerCase(),
            {
              assignedLearners: nextList,
              expiresAt: lockExpires,
            }
          );
        }
      });

      // Clean legacy localStorage assignments for all matching aliases of this learner
      if (typeof window !== "undefined") {
        try {
          aliasSet.forEach((alias) => {
            const storageKey = `ruang_sosmed_user_assignments_${alias}`;
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return;
            if (applyAllCourses) {
              window.localStorage.setItem(storageKey, JSON.stringify([]));
            } else {
              const list: string[] = JSON.parse(raw);
              const nextList = list.filter((entry) => {
                const e = String(entry || "").trim().toLowerCase();
                if (e === targetKey) return false;
                return !modifiedForPush.some(
                  (m) =>
                    m.id.toLowerCase() === e ||
                    m.title.trim().toLowerCase() === e
                );
              });
              window.localStorage.setItem(storageKey, JSON.stringify(nextList));
            }
          });
          window.dispatchEvent(new Event("storage"));
        } catch {}
      }

      setState((prev) => ({
        ...prev,
        explorerItems: prev.explorerItems.map((item) => {
          const matched = modifiedForPush.find(
            (m) =>
              m.id === item.id ||
              m.title.trim().toLowerCase() === item.title.trim().toLowerCase()
          );
          return matched ? matched : item;
        }),
      }));

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          modifiedForPush.forEach((updatedExp) => {
            bc.postMessage({
              type: "ASSIGNMENT_UPDATED",
              contentId: updatedExp.id,
              contentTitle: updatedExp.title,
              assignedLearners: updatedExp.assignedLearners || [],
            });
          });
          bc.close();
        } catch {}
      }

      modifiedForPush.forEach((updatedExp) => {
        void pushContentToSupabase(
          updatedExp,
          stateRef.current.courseCurriculums?.[
            updatedExp.title.trim().toLowerCase()
          ] ?? null
        );
      });
    },
    []
  );

  const updateContentAccessCode = useCallback(
    (contentIdOrTitle: string, newCode: string) => {
      const needle = (contentIdOrTitle || "").trim().toLowerCase();
      if (!needle) return;
      const target = stateRef.current.explorerItems.find(
        (i) =>
          i.id.toLowerCase() === needle ||
          i.title.trim().toLowerCase() === needle
      );
      if (!target) return;

      const cleanCode = newCode.trim().toUpperCase().replace(/\s+/g, "-");
      const nextCode =
        cleanCode ||
        getItemAccessCode({
          title: target.title,
          type: target.type,
          folderName: target.folderName,
          id: target.id,
        });

      const updatedItem: ExplorerContentItem = {
        ...target,
        accessCode: nextCode,
      };

      setState((prev) => {
        const nextItems = prev.explorerItems.map((exp) =>
          exp.id === target.id ||
          exp.title.trim().toLowerCase() === target.title.trim().toLowerCase()
            ? { ...exp, accessCode: nextCode }
            : exp
        );
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "ruang_sosmed_explorer_items_v2",
              JSON.stringify(nextItems)
            );
          }
        } catch {}
        return {
          ...prev,
          explorerItems: nextItems,
        };
      });

      void pushContentToSupabase(
        updatedItem,
        stateRef.current.courseCurriculums?.[
          updatedItem.title.trim().toLowerCase()
        ] ?? null
      );
    },
    []
  );

  const redeemFolderAccessCode = useCallback(
    (
      code: string,
      learner: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        username?: string | null;
      }
    ): {
      success: boolean;
      unlockType?: "folder" | "content";
      unlockedTitle?: string;
      folderTitle?: string;
      courseCount?: number;
      message: string;
    } => {
      const cleanCode = (code || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-");
      if (!cleanCode) {
        return {
          success: false,
          message: "Masukkan kode akses terlebih dahulu.",
        };
      }

      const matchedFolder = stateRef.current.explorerItems.find((item) => {
        if (item.type !== "Folder" || item.isArchived) return false;
        return getItemAccessCode(item) === cleanCode;
      });

      const matchedContent = !matchedFolder
        ? stateRef.current.explorerItems.find((item) => {
            if (item.type === "Folder" || item.isArchived) return false;
            return getItemAccessCode(item) === cleanCode;
          })
        : undefined;

      if (!matchedFolder && !matchedContent) {
        return {
          success: false,
          message: `Kode akses "${cleanCode}" tidak ditemukan. Periksa kembali kode dari mentor Anda.`,
        };
      }

      const learnerTokens = Array.from(
        new Set(
          [learner.name, learner.email, learner.username]
            .map((v) => (v || "").trim())
            .filter(Boolean)
        )
      );
      if (learnerTokens.length === 0) {
        return {
          success: false,
          message: "Identitas akun siswa tidak ditemukan.",
        };
      }

      const targetItems: ExplorerContentItem[] = [];
      let childCourseCount = 0;

      if (matchedFolder) {
        const folderTitleLower = matchedFolder.title.trim().toLowerCase();
        const childCourses = stateRef.current.explorerItems.filter(
          (item) =>
            item.type !== "Folder" &&
            !item.isArchived &&
            item.folderName?.trim().toLowerCase() === folderTitleLower
        );
        childCourseCount = childCourses.length;
        targetItems.push(matchedFolder, ...childCourses);
      } else if (matchedContent) {
        childCourseCount = 1;
        targetItems.push(matchedContent);
      }

      const itemsToPush: ExplorerContentItem[] = [];
      const lockExpires = Date.now() + 15000;

      targetItems.forEach((entry) => {
        const existingMap = new Map<string, string>();
        [...(entry.assignedLearners || []), ...learnerTokens].forEach((val) => {
          const cleanVal = String(val || "").trim();
          if (!cleanVal) return;
          const k = cleanVal.toLowerCase();
          if (!existingMap.has(k)) existingMap.set(k, cleanVal);
        });
        const nextList = Array.from(existingMap.values());
        const updated: ExplorerContentItem = {
          ...entry,
          accessCode: getItemAccessCode(entry),
          assignedLearners: nextList,
          assignedCount: nextList.length,
        };
        itemsToPush.push(updated);
        recentAssignmentLocksRef.current.set(updated.id, {
          assignedLearners: nextList,
          expiresAt: lockExpires,
        });
        recentAssignmentLocksRef.current.set(
          updated.title.trim().toLowerCase(),
          {
            assignedLearners: nextList,
            expiresAt: lockExpires,
          }
        );
      });

      if (typeof window !== "undefined") {
        try {
          const unlockedNames = itemsToPush
            .filter((i) => i.type !== "Folder")
            .map((i) => i.title);
          learnerTokens.forEach((tok) => {
            const k = `ruang_sosmed_user_assignments_${tok.toLowerCase()}`;
            const rawExisting = window.localStorage.getItem(k);
            const prevArr: string[] = rawExisting
              ? JSON.parse(rawExisting)
              : [];
            const nextArr = Array.from(new Set([...prevArr, ...unlockedNames]));
            window.localStorage.setItem(k, JSON.stringify(nextArr));
          });
        } catch {}

        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            itemsToPush.forEach((updatedExp) => {
              bc.postMessage({
                type: "ASSIGNMENT_UPDATED",
                contentId: updatedExp.id,
                contentTitle: updatedExp.title,
                assignedLearners: updatedExp.assignedLearners || [],
              });
            });
            bc.close();
          } catch {}
        }
      }

      const primaryTitle = matchedFolder
        ? matchedFolder.title
        : matchedContent?.title || "Materi";

      setState((prev) => {
        const displayName = learner.name || learner.email || "Learner";
        const initials =
          displayName
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "LN";

        const nextAssignees = prev.assignees.some(
          (a) =>
            (learner.id && a.id === learner.id) ||
            a.name.trim().toLowerCase() === displayName.trim().toLowerCase()
        )
          ? prev.assignees
          : [
              {
                id: learner.id || `asg-code-${Date.now()}`,
                name: displayName,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
                roleBadge: matchedFolder ? "Folder Code" : "Content Code",
                completedChapters: 0,
                totalChapters: Math.max(
                  1,
                  prev.courseSections.flatMap((s) => s.chapters).length
                ),
                assignedDate: "Joined via Code",
              },
              ...prev.assignees,
            ];

        const nextExplorer = prev.explorerItems.map((exp) => {
          const updatedMatch = itemsToPush.find(
            (u) =>
              u.id === exp.id ||
              u.title.trim().toLowerCase() === exp.title.trim().toLowerCase()
          );
          return updatedMatch ? updatedMatch : exp;
        });

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "ruang_sosmed_explorer_items_v2",
              JSON.stringify(nextExplorer)
            );
          }
        } catch {}

        return {
          ...prev,
          assignees: nextAssignees,
          explorerItems: nextExplorer,
        };
      });

      addLearnerNotification({
        id: `notif-code-${Date.now()}`,
        eventType: "material_added",
        title: matchedFolder
          ? `🔓 Akses Folder "${primaryTitle}" Terbuka`
          : `🔓 Akses Materi "${primaryTitle}" Terbuka`,
        body: matchedFolder
          ? `Berhasil bergabung ke seri folder "${primaryTitle}" (${childCourseCount} materi) menggunakan kode ${cleanCode}.`
          : `Berhasil membuka akses materi "${primaryTitle}" secara otomatis menggunakan kode ${cleanCode}.`,
        time: "Baru saja",
        unread: true,
        targetLearner: learner.email || learner.name || undefined,
        meta: { contentTitle: primaryTitle },
      });

      if (isSupabaseConfigured && typeof window !== "undefined") {
        void (async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (accessToken) {
              const apiRes = await fetch("/api/lms", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  action: "redeem_access_code",
                  payload: {
                    code: cleanCode,
                    targetTitles: itemsToPush.map((i) => i.title),
                    learnerName: learner.name || "",
                    learnerEmail: learner.email || "",
                    learnerUsername: learner.username || "",
                  },
                }),
              });
              if (apiRes.ok) {
                const parsed = await apiRes.json().catch(() => null);
                if (parsed?.ok) return;
              }
            }
          } catch {}

          try {
            await supabase.rpc("redeem_access_code", {
              p_code: cleanCode,
              p_target_titles: itemsToPush.map((i) => i.title),
              p_learner_name: learner.name || learner.email || null,
            });
          } catch {}

          itemsToPush.forEach((pushedItem) => {
            void pushContentToSupabase(
              pushedItem,
              stateRef.current.courseCurriculums?.[
                pushedItem.title.trim().toLowerCase()
              ] ?? null
            );
          });
        })();
      }

      if (matchedFolder) {
        return {
          success: true,
          unlockType: "folder",
          unlockedTitle: matchedFolder.title,
          folderTitle: matchedFolder.title,
          courseCount: childCourseCount,
          message: `Berhasil masuk folder "${matchedFolder.title}" (${childCourseCount} materi terbuka)!`,
        };
      }

      return {
        success: true,
        unlockType: "content",
        unlockedTitle: matchedContent!.title,
        folderTitle: matchedContent?.folderName || undefined,
        courseCount: 1,
        message: `Berhasil membuka akses materi "${matchedContent!.title}"!`,
      };
    },
    [addLearnerNotification]
  );

  // WORKFLOW 3: Active Learning & Progress Sync
  const markLearnerChapterComplete = useCallback(
    (chapterId: string, pointsReward: number): boolean => {
      const allKnownChapters = [
        ...state.courseSections.flatMap((s) => s.chapters),
        ...Object.values(state.courseCurriculums || {}).flatMap((secs) =>
          (secs || []).flatMap((s) => s.chapters || [])
        ),
      ];
      const targetCh = allKnownChapters.find((c) => c.id === chapterId);
      const isNewlyCompleted = Boolean(targetCh && !targetCh.completed);

      if (!isNewlyCompleted) return false;

      setState((prev) => {
        const markSecs = (secs: CourseSectionAccordion[]) => {
          let unlockedNext = false;
          return secs.map((sec) => ({
            ...sec,
            chapters: (sec.chapters || []).map((ch) => {
              if (ch.id === chapterId && !ch.completed) {
                return { ...ch, completed: true };
              }
              if (ch.locked && !unlockedNext) {
                unlockedNext = true;
                return { ...ch, locked: false };
              }
              return ch;
            }),
          }));
        };

        const unlockedSections = markSecs(prev.courseSections);
        const nextCurriculums: Record<string, CourseSectionAccordion[]> = {};
        Object.entries(prev.courseCurriculums || {}).forEach(([k, secs]) => {
          const updated = markSecs(secs);
          nextCurriculums[k] = updated;
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                `ruang_sosmed_curriculum_${k}`,
                JSON.stringify(updated)
              );
            } catch {}
          }
        });

        // Get active session user name if available
        let activeUserName = "";
        try {
          const cached = window.localStorage.getItem(
            "ruang_sosmed_session_user_v1"
          );
          if (cached) {
            const parsedU = JSON.parse(cached);
            activeUserName = parsedU?.name || parsedU?.username || "";
          }
        } catch {}

        const nextAssignees = prev.assignees.map((a, idx) =>
          (activeUserName &&
            a.name.toLowerCase() === activeUserName.toLowerCase()) ||
          (!activeUserName && idx === 0)
            ? {
                ...a,
                completedChapters: Math.min(
                  a.totalChapters,
                  a.completedChapters + 1
                ),
              }
            : a
        );

        const nextLeaderboard = prev.leaderboard
          .map((l, idx) =>
            (activeUserName &&
              l.name.toLowerCase() === activeUserName.toLowerCase()) ||
            (!activeUserName && idx === 0)
              ? { ...l, points: l.points + pointsReward }
              : l
          )
          .sort((a, b) => b.points - a.points)
          .map((l, idx) => ({ ...l, rank: idx + 1 }));

        const nextAssignedItems = syncLearnerCatalogWithExplorer(
          prev.explorerItems,
          prev.learnerAssignedItems,
          nextCurriculums
        );

        const allCh = unlockedSections
          .filter((s) => !s.hidden)
          .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden));
        const doneCount = allCh.filter((c) => c.completed).length;
        const newCoursePct =
          allCh.length > 0 ? Math.round((doneCount / allCh.length) * 100) : 0;

        return {
          ...prev,
          courseSections: unlockedSections,
          courseCurriculums: nextCurriculums,
          learnerPoints: prev.learnerPoints + pointsReward,
          assignees: nextAssignees,
          leaderboard: nextLeaderboard,
          learnerAssignedItems: nextAssignedItems,
          certificateUnlocked:
            newCoursePct >= 100 ? true : prev.certificateUnlocked,
        };
      });

      const activeUser = getActiveSessionUser();
      const predictedNextPoints = Math.max(
        0,
        (stateRef.current.learnerPoints || 0) + pointsReward
      );
      const keys = normalizeAvatarKeys({
        email: activeUser.email,
        name: activeUser.name,
        username: activeUser.username,
      });
      if (keys.length > 0) {
        const expiresAt = Date.now() + 15000;
        const patch: Record<string, number> = {};
        keys.forEach((k) => {
          recentPointLocksRef.current.set(k, {
            value: predictedNextPoints,
            expiresAt,
          });
          patch[k] = predictedNextPoints;
        });
        const mergedPtsMap = {
          ...(stateRef.current.userPointsMap || {}),
          ...patch,
        };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              "ruang_sosmed_user_points_map_v1",
              JSON.stringify(mergedPtsMap)
            );
            if ("BroadcastChannel" in window) {
              const bc = new BroadcastChannel("ruang_sosmed_channel");
              bc.postMessage({
                type: "USER_POINTS_UPDATED",
                userPointsMap: patch,
                newPoints: predictedNextPoints,
              });
              bc.close();
            }
          } catch {}
        }
        setState((prev) => ({
          ...prev,
          userPointsMap: { ...(prev.userPointsMap || {}), ...patch },
        }));
        void persistUserPointsToSupabase({
          email: activeUser.email,
          name: activeUser.name,
          username: activeUser.username,
          newPoints: predictedNextPoints,
        });
      }

      awardRumiXpEvent({
        userKey: resolveXpUserKey(activeUser),
        type: "chapter_complete",
        dedupeKey: `chapter:${chapterId}`,
        detail: targetCh?.title,
        tierKind: learnerTierKindRef.current,
      });

      return true;
    },
    [state.courseSections]
  );

  const toggleLearnerItemFavorite = useCallback((itemId: string) => {
    setState((prev) => ({
      ...prev,
      learnerAssignedItems: prev.learnerAssignedItems.map((i) =>
        i.id === itemId ? { ...i, isFavorite: !i.isFavorite } : i
      ),
    }));
  }, []);

  // WORKFLOW 4: Quiz Submission -> Admin Ungraded Quiz Table & Grading Center -> Pass Unlocks Certificate & Gauge
  const submitLearnerQuizOrAssignment = useCallback(
    (payload: {
      title: string;
      submissionType: "Quiz" | "Assignment";
      openEndedAnswer: string;
      autoScorePct: number;
      learnerName?: string;
      learnerRole?: string;
    }) => {
      const activeUser = getActiveSessionUser();
      const resolvedName = payload.learnerName || activeUser.name;
      const initials =
        resolvedName
          .split(" ")
          .filter(Boolean)
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "LN";

      const nowId = Date.now();
      const newQuizRow: UngradedQuizItem = {
        id: `uq-${nowId}`,
        index: 1,
        title: payload.title,
        questionsLabel: "1 open ended + 4 objective",
        submittedAt: "Just now",
        graded: false,
        learner: {
          name: resolvedName,
          initials,
          avatarBg: "#EEF2FF",
          avatarText: "#4F39F6",
          role: payload.learnerRole || "Social Media Specialist",
        },
      };

      const newGradingSub: GradingSubmissionItem = {
        id: `sub-${nowId}`,
        submissionType: payload.submissionType,
        title: payload.title,
        submittedAt: "Submitted just now",
        status: "Pending Evaluation",
        learner: {
          name: resolvedName,
          role: payload.learnerRole || "Social Media Specialist",
          cohort: "Batch Oktober 2026",
          initials,
          avatarBg: "#EEF2FF",
          avatarText: "#4F39F6",
        },
        questionsAndAnswers: [
          {
            id: `qa-${nowId}`,
            questionTitle:
              "Q5 (Open-Ended Essay): Audit the Q4 Beauty Brand Meta Ads CPA Spike Scenario",
            maxPoints: 50,
            awardedPoints: Math.round((payload.autoScorePct / 100) * 50),
            learnerResponse: payload.openEndedAnswer,
            mentorRubric:
              "1. Distinguish 3s Thumbstop (41%) vs post-click CPA spike. 2. Propose mid-roll & landing page optimization.",
          },
        ],
        overallFeedback:
          "Submitted from Learner Portal Quiz Runner — awaiting final Mentor sign-off.",
      };

      setState((prev) => {
        const reindexedQuizzes = [
          newQuizRow,
          ...prev.ungradedQuizzes,
        ].map((q, idx) => ({ ...q, index: idx + 1 }));

        const nextAssigned = prev.learnerAssignedItems.map((item) =>
          item.title.toLowerCase() === payload.title.toLowerCase()
            ? { ...item, progressPercent: 100 }
            : item
        );

        return {
          ...prev,
          ungradedQuizzes: reindexedQuizzes,
          gradingSubmissions: [newGradingSub, ...prev.gradingSubmissions],
          learnerAssignedItems: nextAssigned,
          certificateUnlocked:
            payload.autoScorePct >= 80 ? true : prev.certificateUnlocked,
          learnerPoints:
            payload.autoScorePct >= 80
              ? prev.learnerPoints + 100
              : prev.learnerPoints,
          leaderboard:
            payload.autoScorePct >= 80
              ? prev.leaderboard.map((l) =>
                  l.name === resolvedName || l.name === "Raka Pratama"
                    ? { ...l, name: resolvedName, points: l.points + 100 }
                    : l
                )
              : prev.leaderboard,
        };
      });

      awardRumiXpEvent({
        userKey: resolveXpUserKey(activeUser),
        type: "quiz_submit",
        dedupeKey: `quiz:${payload.title.trim().toLowerCase()}:${getLocalDateKey()}`,
        detail: payload.title,
        tierKind: learnerTierKindRef.current,
      });

      if (typeof window !== "undefined" && isSupabaseConfigured) {
        void supabase.auth.getSession().then(({ data: sData }) => {
          const token = sData?.session?.access_token;
          if (!token) return;
          void fetch("/api/telegram/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              eventType: "quiz_submitted",
              quizTitle: payload.title,
              submissionType: payload.submissionType,
              scorePct: payload.autoScorePct,
            }),
          }).catch(() => {});
        });
      }
    },
    []
  );

  const evaluateSubmissionInGradingCenter = useCallback(
    (
      submissionId: string,
      decision: "Passed" | "Revision Requested",
      updatedScores?: { id: string; awardedPoints: number }[],
      overallFeedback?: string
    ) => {
      setState((prev) => {
        const targetSub = prev.gradingSubmissions.find(
          (s) => s.id === submissionId
        );
        if (!targetSub) return prev;

        const nextSubmissions = prev.gradingSubmissions.map((sub) => {
          if (sub.id !== submissionId) return sub;
          return {
            ...sub,
            status: decision,
            overallFeedback: overallFeedback ?? sub.overallFeedback,
            questionsAndAnswers: updatedScores
              ? sub.questionsAndAnswers.map((qa) => {
                  const match = updatedScores.find((u) => u.id === qa.id);
                  return match
                    ? { ...qa, awardedPoints: match.awardedPoints }
                    : qa;
                })
              : sub.questionsAndAnswers,
          };
        });

        const nextUngraded = prev.ungradedQuizzes.map((q) =>
          q.title.toLowerCase() === targetSub.title.toLowerCase() &&
          q.learner.name === targetSub.learner.name
            ? { ...q, graded: decision === "Passed" }
            : q
        );

        const isPassed = decision === "Passed";
        const gauge = isPassed
          ? recalculateStatusGauge(prev.contentStatusData, 1, -1, 0)
          : prev.contentStatusData;

        const nextLeaderboard = isPassed
          ? prev.leaderboard
              .map((l) =>
                l.name === targetSub.learner.name
                  ? { ...l, points: l.points + 20 }
                  : l
              )
              .sort((a, b) => b.points - a.points)
              .map((l, idx) => ({ ...l, rank: idx + 1 }))
          : prev.leaderboard;

        const activeUser = getActiveSessionUser();
        const isSessionLearner =
          targetSub.learner.name === activeUser.name ||
          targetSub.learner.name === "Raka Pratama";

        return {
          ...prev,
          gradingSubmissions: nextSubmissions,
          ungradedQuizzes: nextUngraded,
          certificateUnlocked: isPassed ? true : prev.certificateUnlocked,
          learnerPoints:
            isPassed && isSessionLearner
              ? prev.learnerPoints + 20
              : prev.learnerPoints,
          leaderboard: nextLeaderboard,
          contentStatusData: Array.isArray(gauge) ? gauge : gauge.segments,
          totalContentsGaugeCount: Array.isArray(gauge)
            ? prev.totalContentsGaugeCount
            : gauge.total,
          learnerNotifications: [
            {
              id: `notif-grade-${Date.now()}`,
              title: isPassed
                ? `Assessment Passed! Certificate Unlocked 🎓`
                : `Revision Requested on "${targetSub.title}"`,
              body: isPassed
                ? `Mentor marked "${targetSub.title}" as Passed (+20 ★ pts) and unlocked your Official Ruang Sosmed 2.0 Certificate.`
                : `Mentor requested a revision on "${targetSub.title}". Check feedback in My Learning.`,
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });
    },
    []
  );

  const quickGradeDashboardQuiz = useCallback(
    (quizId: string, score: number, feedback: string) => {
      setState((prev) => {
        const target = prev.ungradedQuizzes.find((q) => q.id === quizId);
        const nextQuizzes = prev.ungradedQuizzes.map((q) =>
          q.id === quizId ? { ...q, graded: true } : q
        );
        const gauge = recalculateStatusGauge(prev.contentStatusData, 1, -1, 0);

        const activeUser = getActiveSessionUser();
        const isSessionLearner =
          target?.learner.name === activeUser.name ||
          target?.learner.name === "Raka Pratama";

        return {
          ...prev,
          ungradedQuizzes: nextQuizzes,
          certificateUnlocked: score >= 80 ? true : prev.certificateUnlocked,
          learnerPoints:
            isSessionLearner
              ? prev.learnerPoints + 20
              : prev.learnerPoints,
          contentStatusData: gauge.segments,
          totalContentsGaugeCount: gauge.total,
          learnerNotifications: [
            {
              id: `notif-qg-${Date.now()}`,
              title: `Quiz Graded (${score}%): ${target?.title ?? "Quiz"}`,
              body: feedback,
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });
    },
    []
  );

  // WORKFLOW 5: Discussion & Issue Tracker Sync (Bidirectional)
  const postDiscussionMessage = useCallback(
    (payload: {
      threadId?: string;
      threadTitle?: string;
      chapterTitle: string;
      authorName: string;
      authorRole: string;
      authorInitials: string;
      avatarBg: string;
      avatarText: string;
      message: string;
    }) => {
      const nowId = Date.now();
      const newReply = {
        id: `rep-${nowId}`,
        authorName: payload.authorName,
        authorRole: payload.authorRole,
        authorInitials: payload.authorInitials,
        avatarBg: payload.avatarBg,
        avatarText: payload.avatarText,
        timestamp: "Baru saja",
        message: payload.message,
      };

      const normalizedChapter = payload.chapterTitle.trim().toLowerCase();
      const currentThreads = stateRef.current.discussionThreads ?? [];
      const currentIdx = currentThreads.findIndex((t) =>
        payload.threadId
          ? t.id === payload.threadId
          : t.chapterBadge.trim().toLowerCase() === normalizedChapter
      );

      let syncedThread: DiscussionThread;
      if (currentIdx >= 0) {
        const existing = currentThreads[currentIdx];
        const hasParticipant = existing.participants.some(
          (p) => p.initials === payload.authorInitials
        );
        syncedThread = {
          ...existing,
          excerpt: payload.message,
          repliesCount: existing.replies.length + 1,
          lastReplyLabel: "Baru saja",
          participants: hasParticipant
            ? existing.participants
            : [
                ...existing.participants,
                {
                  initials: payload.authorInitials,
                  bg: payload.avatarBg,
                  text: payload.avatarText,
                },
              ],
          replies: [...existing.replies, newReply],
        };
      } else {
        syncedThread = {
          id: payload.threadId || `thread-${nowId}`,
          chapterBadge: payload.chapterTitle,
          title: payload.threadTitle || `Konsultasi: ${payload.chapterTitle}`,
          excerpt: payload.message,
          repliesCount: 1,
          viewsCount: 1,
          lastReplyLabel: "Baru saja",
          participants: [
            {
              initials: payload.authorInitials,
              bg: payload.avatarBg,
              text: payload.avatarText,
            },
          ],
          replies: [newReply],
        };
      }

      const postTs = Date.now();
      recentLocalThreadPostsRef.current.set(syncedThread.id, postTs);
      recentLocalReplyPostsRef.current.set(newReply.id, postTs);
      if (deletedThreadIdsRef.current.delete(syncedThread.id)) {
        persistStoredIdSet(
          DELETED_THREADS_STORAGE_KEY,
          deletedThreadIdsRef.current
        );
      }

      setState((prev) => {
        const prevThreads = prev.discussionThreads ?? [];
        const existingIndex = prevThreads.findIndex((t) =>
          payload.threadId
            ? t.id === payload.threadId
            : t.chapterBadge.trim().toLowerCase() === normalizedChapter
        );

        if (existingIndex >= 0) {
          const nextThreads = prevThreads.map((t, idx) =>
            idx === existingIndex ? syncedThread : t
          );
          return {
            ...prev,
            discussionThreads: nextThreads,
          };
        }

        return {
          ...prev,
          discussionThreads: [syncedThread, ...prevThreads],
        };
      });

      void pushInboxThreadToSupabase(syncedThread);

      const isStaffAuthor = /\b(mentor|admin|coach|instructor)\b/i.test(
        payload.authorRole || ""
      );
      if (isStaffAuthor) {
        addLearnerNotification({
          id: `notif-reply-${nowId}`,
          eventType: "mentor_reply",
          title: `💬 Balasan ${payload.authorRole}: ${payload.chapterTitle}`,
          body: `${payload.authorName} membalas diskusi pada "${payload.chapterTitle}": "${payload.message}"`,
          time: "Baru saja",
          unread: true,
          meta: {
            chapterTitle: payload.chapterTitle,
            mentorName: payload.authorName,
          },
        });
      }
    },
    [addLearnerNotification]
  );

  const broadcastDiscussionDeleted = useCallback(
    (threadId: string, replyId?: string) => {
      if (typeof window === "undefined") return;
      if ("BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          bc.postMessage({ type: "DISCUSSION_DELETED", threadId, replyId });
          bc.close();
        } catch {}
      }
      window.dispatchEvent(
        new CustomEvent("ruang_sosmed_discussion_deleted", {
          detail: { threadId, replyId },
        })
      );
    },
    []
  );

  const deleteDiscussionThread = useCallback(
    (threadId: string) => {
      const cleanId = (threadId || "").trim();
      if (!cleanId) return;

      deletedThreadIdsRef.current.add(cleanId);
      persistStoredIdSet(
        DELETED_THREADS_STORAGE_KEY,
        deletedThreadIdsRef.current
      );
      recentLocalThreadPostsRef.current.delete(cleanId);

      setState((prev) => ({
        ...prev,
        discussionThreads: (prev.discussionThreads ?? []).filter(
          (t) => t.id !== cleanId
        ),
      }));

      broadcastDiscussionDeleted(cleanId);
      void deleteInboxThreadFromSupabase(cleanId);
    },
    [broadcastDiscussionDeleted]
  );

  const deleteDiscussionReply = useCallback(
    (threadId: string, replyId: string) => {
      const cleanThreadId = (threadId || "").trim();
      const cleanReplyId = (replyId || "").trim();
      if (!cleanThreadId || !cleanReplyId) return;

      const targetThread = (stateRef.current.discussionThreads ?? []).find(
        (t) => t.id === cleanThreadId
      );
      const remainingCount = targetThread
        ? targetThread.replies.filter((r) => r.id !== cleanReplyId).length
        : 0;

      deletedReplyIdsRef.current.add(cleanReplyId);
      persistStoredIdSet(
        DELETED_REPLIES_STORAGE_KEY,
        deletedReplyIdsRef.current
      );
      recentLocalReplyPostsRef.current.delete(cleanReplyId);

      if (targetThread && remainingCount === 0) {
        deleteDiscussionThread(cleanThreadId);
        return;
      }

      setState((prev) => ({
        ...prev,
        discussionThreads: filterDeletedDiscussionThreads(
          prev.discussionThreads ?? [],
          deletedThreadIdsRef.current,
          deletedReplyIdsRef.current
        ),
      }));

      broadcastDiscussionDeleted(cleanThreadId, cleanReplyId);
      void deleteInboxThreadFromSupabase(cleanThreadId, cleanReplyId);
    },
    [broadcastDiscussionDeleted, deleteDiscussionThread]
  );

  const reportContentIssueFromLearner = useCallback(
    (chapterTitle: string, issueDescription: string, reporterName?: string) => {
      const activeUser = getActiveSessionUser();
      const resolvedReporter = reporterName || activeUser.name;

      const newIssue: ReportedIssueItem = {
        id: `iss-${Date.now()}`,
        chapter: chapterTitle,
        title: issueDescription,
        reporter: resolvedReporter,
        reportedAt: "Baru saja (dari Ruang Belajar)",
        status: "Open",
      };

      setState((prev) => ({
        ...prev,
        mostIssuedCount: prev.mostIssuedCount + 1,
        reportedIssues: [newIssue, ...prev.reportedIssues],
      }));

      void pushReportedIssueToSupabase(newIssue);

      if (typeof window !== "undefined" && isSupabaseConfigured) {
        void supabase.auth.getSession().then(({ data: sData }) => {
          const token = sData?.session?.access_token;
          if (!token) return;
          void fetch("/api/telegram/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              eventType: "content_issue",
              chapterTitle,
              issueDescription,
            }),
          }).catch(() => {});
        });
      }
    },
    []
  );

  const toggleReportedIssueStatus = useCallback((issueId: string) => {
    const current = (stateRef.current.reportedIssues ?? []).find(
      (iss) => iss.id === issueId
    );
    const updatedIssue: ReportedIssueItem | null = current
      ? {
          ...current,
          status: current.status === "Open" ? "Resolved" : "Open",
        }
      : null;

    setState((prev) => ({
      ...prev,
      reportedIssues: prev.reportedIssues.map((iss) =>
        iss.id === issueId
          ? { ...iss, status: iss.status === "Open" ? "Resolved" : "Open" }
          : iss
      ),
    }));

    if (updatedIssue) {
      void pushReportedIssueToSupabase(updatedIssue);
    }
  }, []);

  const setTodos: React.Dispatch<React.SetStateAction<TodoTask[]>> =
    useCallback((updater) => {
      setState((prev) => ({
        ...prev,
        todos: typeof updater === "function" ? updater(prev.todos) : updater,
      }));
    }, []);

  const restoreContentVersion = useCallback((versionId: string) => {
    setState((prev) => ({
      ...prev,
      versions: prev.versions.map((v) => ({
        ...v,
        isCurrent: v.id === versionId,
      })),
    }));
  }, []);

  const sendCollaboratorInvitation = useCallback(
    (payload: {
      email: string;
      fullName?: string;
      role: "Mentor" | "Course Author" | "Admin";
      cohort: string;
      note?: string;
    }) => {
      const displayName = payload.fullName?.trim() || payload.email.split("@")[0];
      const notifTitle = `🤝 Undangan Kolaborasi: ${payload.role} (${payload.cohort})`;
      const notifBody = `Halo ${displayName}! Anda diundang bergabung sebagai ${payload.role} pada cohort "${payload.cohort}". ${
        payload.note ? `Pesan: "${payload.note}"` : "Silakan kelola konten dan akses Anda."
      }`;

      setState((prev) => {
        const initials = displayName
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "MB";

        const hasAssignee = prev.assignees.some(
          (a) => a.name.toLowerCase() === displayName.toLowerCase()
        );
        const nextAssignees = hasAssignee
          ? prev.assignees
          : [
              ...prev.assignees,
              {
                id: `asg-collab-${Date.now()}`,
                name: displayName,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
                roleBadge: payload.role,
                completedChapters: 0,
                totalChapters: Math.max(
                  1,
                  prev.courseSections.flatMap((s) => s.chapters).length
                ),
                assignedDate: "Baru saja",
              },
            ];

        const hasCollab = prev.workspaceCollaborators.some(
          (c) => c.email.toLowerCase() === payload.email.toLowerCase()
        );
        const nextCollabs = hasCollab
          ? prev.workspaceCollaborators.map((c) =>
              c.email.toLowerCase() === payload.email.toLowerCase()
                ? {
                    ...c,
                    role: payload.role,
                    cohort: payload.cohort,
                    status: "invited" as const,
                  }
                : c
            )
          : [
              ...prev.workspaceCollaborators,
              {
                id: `collab-${Date.now()}`,
                name: displayName,
                email: payload.email,
                initials,
                role: payload.role,
                cohort: payload.cohort,
                status: "invited" as const,
                avatarBg: "#FDF2F8",
                avatarText: "#DB2777",
                joinedAt: "Baru saja",
              },
            ];

        return {
          ...prev,
          assignees: nextAssignees,
          workspaceCollaborators: nextCollabs,
          learnerNotifications: [
            {
              id: `notif-invite-${Date.now()}`,
              title: notifTitle,
              body: notifBody,
              time: "Baru saja",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          bc.postMessage({
            type: "INVITATION_BROADCAST",
            title: notifTitle,
            body: notifBody,
            recipient: displayName,
            role: payload.role,
            cohort: payload.cohort,
          });
          setTimeout(() => bc.close(), 200);
        } catch {
          // Ignore
        }
      }

      return {
        success: true,
        message: `Undangan berhasil dikirim ke ${payload.email} sebagai ${payload.role} pada ${payload.cohort}.`,
      };
    },
    []
  );

  const acceptCollaboratorInvitation = useCallback(
    (payload?: {
      email?: string;
      role?: "Admin" | "Mentor" | "Course Author";
      cohort?: string;
    }) => {
      const targetEmail = (
        payload?.email || "afterlance@gmail.com"
      ).toLowerCase();
      const targetRole = payload?.role || "Admin";
      const targetCohort = payload?.cohort || "Ruang Sosmed Class";

      setState((prev) => {
        const existingIdx = prev.workspaceCollaborators.findIndex(
          (c) => c.email.toLowerCase() === targetEmail
        );
        let nextCollabs = [...prev.workspaceCollaborators];
        if (existingIdx >= 0) {
          nextCollabs[existingIdx] = {
            ...nextCollabs[existingIdx],
            status: "accepted",
            role: targetRole,
            cohort: targetCohort,
          };
        } else {
          nextCollabs.push({
            id: `collab-${Date.now()}`,
            name: "Allisha Fathya",
            email: targetEmail,
            initials: "AF",
            role: targetRole,
            cohort: targetCohort,
            status: "accepted",
            avatarBg: "#FDF2F8",
            avatarText: "#DB2777",
            joinedAt: "Hari ini",
          });
        }

        const nextNotifs = prev.learnerNotifications.map((n) => {
          if (
            n.title.toLowerCase().includes("undangan") ||
            n.id.includes("invite")
          ) {
            return {
              ...n,
              title: `🎉 Resmi Bergabung: ${targetRole} (${targetCohort})`,
              body: `Selamat Allisha Fathya! Anda telah aktif bergabung sebagai ${targetRole} pada workspace & cohort "${targetCohort}". Hak akses manajemen konten telah terbuka.`,
              unread: false,
            };
          }
          return n;
        });

        return {
          ...prev,
          workspaceCollaborators: nextCollabs,
          learnerNotifications: nextNotifs,
        };
      });

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          bc.postMessage({
            type: "COLLABORATOR_ACCEPTED",
            email: targetEmail,
            role: targetRole,
            cohort: targetCohort,
          });
          setTimeout(() => bc.close(), 200);
        } catch {}
      }

      return {
        success: true,
        role: targetRole,
        cohort: targetCohort,
      };
    },
    []
  );

  const removeWorkspaceCollaborator = useCallback(
    (idOrEmail: string) => {
      const cleanKey = (idOrEmail || "").trim().toLowerCase();
      const targetCollab = stateRef.current.workspaceCollaborators.find((c) => {
        const cId = (c.id || "").trim().toLowerCase();
        const cEmail = (c.email || "").trim().toLowerCase();
        return cId === cleanKey || cEmail === cleanKey;
      });

      if (targetCollab || cleanKey) {
        unassignLearnerFromContent("*", {
          id: targetCollab?.id || idOrEmail,
          name: targetCollab?.name,
          email: targetCollab?.email || (cleanKey.includes("@") ? idOrEmail : undefined),
        });
      }

      setState((prev) => {
        const target = prev.workspaceCollaborators.find((c) => {
          const cId = (c.id || "").trim().toLowerCase();
          const cEmail = (c.email || "").trim().toLowerCase();
          return cId === cleanKey || cEmail === cleanKey;
        });

        const nextCollabs = prev.workspaceCollaborators.filter((c) => {
          const cId = (c.id || "").trim().toLowerCase();
          const cEmail = (c.email || "").trim().toLowerCase();
          return cId !== cleanKey && cEmail !== cleanKey;
        });

        // Sinkronkan ke Supabase jika profil tersebut bukan admin owner
        if (isSupabaseConfigured && target?.email) {
          void (async () => {
            try {
              await supabase
                .from("user_profiles")
                .delete()
                .ilike("email", target.email.trim());
            } catch (e) {
              if (process.env.NODE_ENV !== "production") console.warn("[RuangSosmed] Gagal hapus member dari DB:", e);
            }
          })();
        }

        return {
          ...prev,
          workspaceCollaborators: nextCollabs,
        };
      });
    },
    [unassignLearnerFromContent]
  );

  const resetGlobalStoreToDefaults = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_GLOBAL_STATE));
    } catch {
      // Ignore
    }
    setState(DEMO_GLOBAL_STATE);
  }, []);

  const clearAllStoreData = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GLOBAL_STATE));
    } catch {
      // Ignore
    }
    setState(DEFAULT_GLOBAL_STATE);
  }, []);

  const saveRsLessonNote = useCallback(
    (chapterOrLessonKey: string, content: string) => {
      setState((prev) => ({
        ...prev,
        rsLessonNotes: {
          ...prev.rsLessonNotes,
          [chapterOrLessonKey]: content,
        },
      }));
      const activeUser = getActiveSessionUser();
      void rsLearning26BridgeService.saveLessonNote({
        username: activeUser.username,
        lessonKey: chapterOrLessonKey,
        content,
      });
      if (content.trim().length > 0) {
        awardRumiXpEvent({
          userKey: resolveXpUserKey(activeUser),
          type: "lesson_note",
          dedupeKey: `note:${chapterOrLessonKey}`,
          detail: chapterOrLessonKey,
          tierKind: learnerTierKindRef.current,
        });
      }
    },
    []
  );

  const submitRsLessonReview = useCallback(
    (payload: {
      lessonKey: string;
      rating: number;
      feedback: string;
      reviewerName?: string;
      reviewerUsername?: string;
    }) => {
      const activeUser = getActiveSessionUser();
      const resolvedName = payload.reviewerName || activeUser.name;
      const resolvedUsername = payload.reviewerUsername || activeUser.username;

      const newReview: RsLessonReviewItem = {
        id: `rev-${Date.now()}`,
        lessonKey: payload.lessonKey,
        reviewerName: resolvedName,
        reviewerUsername: resolvedUsername,
        rating: payload.rating,
        feedback: payload.feedback,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        rsLessonReviews: [newReview, ...(prev.rsLessonReviews ?? [])],
      }));

      awardRumiXpEvent({
        userKey: resolveXpUserKey({
          name: resolvedName,
          username: resolvedUsername,
          email: activeUser.email,
        }),
        type: "lesson_review",
        dedupeKey: `review:${payload.lessonKey}`,
        detail: payload.lessonKey,
        tierKind: learnerTierKindRef.current,
      });

      // Update Supabase contents.settings_json.reviews so all learners across all browsers & devices sync
      if (isSupabaseConfigured) {
        void (async () => {
          try {
            const { data: contents } = await supabase
              .from("contents")
              .select("id, settings_json")
              .eq("status", "published");

            if (Array.isArray(contents)) {
              for (const c of contents) {
                const currentSettings = c.settings_json || {};
                const existingReviews: RsLessonReviewItem[] = Array.isArray(
                  currentSettings.reviews
                )
                  ? currentSettings.reviews
                  : [];

                if (!existingReviews.some((r) => r.id === newReview.id)) {
                  await supabase
                    .from("contents")
                    .update({
                      settings_json: {
                        ...currentSettings,
                        reviews: [newReview, ...existingReviews],
                      },
                    })
                    .eq("id", c.id);
                }
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "[RuangSosmed] Failed to sync review to Supabase contents:",
                err
              );
            }
          }
        })();
      }

      // Broadcast review to all other tabs immediately
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          bc.postMessage({
            type: "REVIEW_SUBMITTED",
            review: newReview,
          });
        } catch {}
      }

      void rsLearning26BridgeService.submitLessonReview({
        lessonKey: payload.lessonKey,
        reviewerName: resolvedName,
        reviewerUsername: resolvedUsername,
        rating: payload.rating,
        feedback: payload.feedback,
      });
    },
    []
  );

  const persistProTierToSupabase = useCallback(
    async (
      isPro: boolean,
      studentName?: string,
      studentEmail?: string,
      packageName?: string
    ) => {
      if (!isSupabaseConfigured) return;
      try {
        let cleanEmail = (studentEmail || "").trim().toLowerCase();
        const cleanName = (studentName || "").trim();

        if (!cleanEmail && cleanName) {
          const { data: profMatches } = await supabase
            .from("profiles")
            .select("email")
            .ilike("full_name", cleanName)
            .limit(1);
          if (Array.isArray(profMatches) && profMatches[0]?.email) {
            cleanEmail = String(profMatches[0].email).trim().toLowerCase();
          } else {
            const { data: upMatches } = await supabase
              .from("user_profiles")
              .select("email")
              .ilike("name", cleanName)
              .limit(1);
            if (Array.isArray(upMatches) && upMatches[0]?.email) {
              cleanEmail = String(upMatches[0].email).trim().toLowerCase();
            }
          }
        }

        if (!cleanEmail) return;

        await supabase.rpc("admin_set_learner_pro", {
          p_target_email: cleanEmail,
          p_target_name: cleanName || cleanEmail,
          p_is_pro: isPro,
          p_package_name: packageName || "Learner PRO Monthly",
        });
      } catch {
        // Ignore network errors
      }
    },
    []
  );

  const submitProUpgradeRequest = useCallback(
    async (params: {
      packageId?: string;
      packageName: string;
      priceLabel: string;
      buyerName?: string;
      buyerContact?: string;
      paymentMethod?: string;
      proofUrl?: string;
      billingCycle?: "3d_trial" | "7d_trial" | "30d" | "single_item";
      durationDays?: number;
      requestType?: "subscription" | "item_unlock";
      targetItemKey?: string;
      targetItemTitle?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const cycle = params.billingCycle || "30d";
      const activeUserEmail = (getActiveSessionUser().email || "").trim().toLowerCase();
      if (
        isTrialBillingCycle(cycle) &&
        (stateRef.current.learnerHasUsedTrial || readLocalTrialUsed(activeUserEmail))
      ) {
        return {
          ok: false,
          error:
            "Paket percobaan (3 hari / 7 hari) hanya berlaku 1× untuk member baru dan sudah digunakan pada akun Anda.",
        };
      }
      if (!isSupabaseConfigured) {
        return {
          ok: false,
          error: "Koneksi database diperlukan untuk mengirim konfirmasi pembayaran.",
        };
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          return { ok: false, error: "Silakan login terlebih dahulu." };
        }

        const sessionEmail = String(sessionData.session.user.email || activeUserEmail).toLowerCase().trim();
        const duration =
          params.durationDays !== undefined
            ? params.durationDays
            : cycle === "3d_trial"
            ? 3
            : cycle === "7d_trial"
            ? 7
            : cycle === "single_item"
            ? 0
            : 30;
        const reqType =
          params.requestType ||
          (cycle === "single_item" ? "item_unlock" : "subscription");

        const { data: v2Data, error: v2Err } = await supabase.rpc(
          "submit_pro_upgrade_request",
          {
            p_user_name: (params.buyerName || "").trim() || "Learner",
            p_package_id: (params.packageId || "").trim() || "pkg-pro",
            p_package_name: params.packageName.trim() || "Pro",
            p_price_label: params.priceLabel.trim() || "Rp 150.000",
            p_payment_method:
              (params.paymentMethod || "").trim() || "QRIS / Transfer Manual",
            p_buyer_contact: (params.buyerContact || "").trim(),
            p_proof_url: params.proofUrl || null,
            p_billing_cycle: cycle,
            p_duration_days: duration,
            p_request_type: reqType,
            p_target_item_key: params.targetItemKey || null,
            p_target_item_title: params.targetItemTitle || null,
          }
        );

        let createdReqId: string | undefined =
          (v2Data as { id?: string } | null)?.id;
        let finalError = v2Err;
        if (finalError) {
          const msg = String(finalError.message || "").toLowerCase();
          const missingV2 =
            finalError.code === "PGRST202" ||
            msg.includes("could not find the function") ||
            msg.includes("p_billing_cycle");
          if (missingV2) {
            const fallbackPkgName =
              reqType === "item_unlock" && params.targetItemTitle
                ? `${params.packageName} • ${params.targetItemTitle}`
                : cycle === "3d_trial"
                ? `${params.packageName} (Trial 3 Hari)`
                : cycle === "7d_trial"
                ? `${params.packageName} (Trial 7 Hari)`
                : params.packageName.trim() || "Pro";
            const legacyRes = await supabase.rpc("submit_pro_upgrade_request", {
              p_user_name: (params.buyerName || "").trim() || "Learner",
              p_package_id: (params.packageId || "").trim() || "pkg-pro",
              p_package_name: fallbackPkgName,
              p_price_label: params.priceLabel.trim() || "Rp 150.000",
              p_payment_method:
                (params.paymentMethod || "").trim() || "QRIS / Transfer Manual",
              p_buyer_contact: (params.buyerContact || "").trim(),
              p_proof_url: params.proofUrl || null,
            });
            createdReqId =
              (legacyRes.data as { id?: string } | null)?.id || createdReqId;
            finalError = legacyRes.error;
          }
        }

        if (finalError) {
          return {
            ok: false,
            error: finalError.message || "Gagal mengirim konfirmasi pembayaran.",
          };
        }

        const accessToken = sessionData.session.access_token;
        if (accessToken) {
          void fetch("/api/telegram/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              eventType: "payment_request",
              requestId: createdReqId,
            }),
          }).catch(() => {});
        }

        if (isTrialBillingCycle(cycle)) {
          markLocalTrialUsed(sessionEmail);
        }

        setState((prev) => ({
          ...prev,
          learnerHasUsedTrial:
            prev.learnerHasUsedTrial || isTrialBillingCycle(cycle),
          learnerNotifications: [
            {
              id: `notif-pro-pending-${Date.now()}`,
              title:
                reqType === "item_unlock"
                  ? "⏳ Konfirmasi Buka Materi Satuan Terkirim"
                  : "⏳ Konfirmasi Pembayaran Paket Terkirim",
              body:
                reqType === "item_unlock"
                  ? `Permintaan buka "${params.targetItemTitle || params.packageName}" (${params.priceLabel}) sedang menunggu verifikasi Admin.`
                  : `Permintaan aktivasi paket "${params.packageName}" (${params.priceLabel}) sedang menunggu verifikasi Admin.`,
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        }));

        return { ok: true };
      } catch {
        return { ok: false, error: "Gagal mengirim konfirmasi pembayaran." };
      }
    },
    []
  );

  const unlockModuleWithPoints = useCallback(
    async (params: {
      courseTitle: string;
      chapterId?: string | null;
      chapterTitle?: string;
      pointsCost: number;
    }): Promise<{ ok: boolean; message: string; newPoints?: number }> => {
      const cost = Math.max(1, Math.round(Number(params.pointsCost) || 0));
      const currentPoints = Math.max(0, stateRef.current.learnerPoints || 0);
      if (currentPoints < cost) {
        return {
          ok: false,
          message: `Poin Anda tidak cukup. Butuh ${cost} pts (saldo saat ini: ${currentPoints} pts).`,
        };
      }

      const itemKey = buildUnlockItemKey(params.courseTitle, params.chapterId);
      const alreadyUnlocked = (stateRef.current.learnerUnlockedItems || []).some(
        (u) => u.itemKey === itemKey
      );
      if (alreadyUnlocked) {
        return {
          ok: true,
          message: "Materi ini sudah terbuka di akun Anda.",
          newPoints: currentPoints,
        };
      }

      const activeSess = getActiveSessionUser();
      const targetEmail = (activeSess.email || "").trim().toLowerCase();
      let newPoints = currentPoints - cost;

      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const { data: rpcRes, error: rpcErr } = await supabase.rpc(
              "unlock_module_with_points",
              {
                p_course_title: params.courseTitle,
                p_chapter_id: params.chapterId || null,
                p_points_cost: cost,
              }
            );
            if (!rpcErr && rpcRes) {
              if ((rpcRes as any).ok === false) {
                return {
                  ok: false,
                  message:
                    (rpcRes as any).error ||
                    "Gagal memotong poin untuk membuka materi.",
                };
              }
              if (typeof (rpcRes as any).new_points === "number") {
                newPoints = (rpcRes as any).new_points;
              }
            } else if (rpcErr) {
              const msg = String(rpcErr.message || "").toLowerCase();
              const missingRpc =
                rpcErr.code === "PGRST202" ||
                msg.includes("unlock_module_with_points");
              if (missingRpc) {
                const { data: redeemed } = await supabase.rpc(
                  "redeem_learner_points",
                  { p_points_cost: cost }
                );
                if (redeemed === false) {
                  return {
                    ok: false,
                    message: "Saldo poin di server tidak mencukupi.",
                  };
                }
                await persistUserPointsToSupabase({
                  email: targetEmail,
                  name: activeSess.name,
                  username: activeSess.username,
                  newPoints,
                });
              } else {
                return {
                  ok: false,
                  message: rpcErr.message || "Gagal membuka materi dengan poin.",
                };
              }
            }
          }
        } catch {
          return {
            ok: false,
            message: "Terjadi kesalahan jaringan saat membuka materi dengan poin.",
          };
        }
      }

      const newRecord: LearnerUnlockedItemRecord = {
        id: `unl-${Date.now()}`,
        itemKey,
        courseTitle: params.courseTitle,
        chapterId: params.chapterId || null,
        unlockMethod: "points",
        pointsSpent: cost,
        pricePaidIdr: 0,
        createdAt: new Date().toISOString(),
      };

      const pointKeys = normalizeAvatarKeys({
        email: targetEmail,
        name: activeSess.name,
        username: activeSess.username,
      });
      const expiresAt = Date.now() + 15_000;
      const ptsPatch: Record<string, number> = {};
      pointKeys.forEach((k) => {
        recentPointLocksRef.current.set(k, { value: newPoints, expiresAt });
        ptsPatch[k] = newPoints;
      });

      const mergedUnlocked = mergeUnlockedItems(
        [newRecord],
        stateRef.current.learnerUnlockedItems || []
      );
      if (targetEmail) {
        persistLocalUnlockedItems(targetEmail, mergedUnlocked);
      }

      const displayTarget = params.chapterTitle || params.courseTitle;
      setState((prev) => ({
        ...prev,
        learnerPoints: newPoints,
        userPointsMap: { ...(prev.userPointsMap || {}), ...ptsPatch },
        learnerUnlockedItems: mergedUnlocked,
        learnerNotifications: [
          {
            id: `notif-unlock-pts-${Date.now()}`,
            title: `🔓 Materi Terbuka: ${displayTarget}`,
            body: `Anda menukarkan ${cost} ★ pts untuk membuka "${displayTarget}". Sisa saldo: ${newPoints.toLocaleString()} pts.`,
            time: "Baru saja",
            unread: true,
            eventType: "material_added",
          },
          ...prev.learnerNotifications,
        ],
      }));

      return {
        ok: true,
        message: `Berhasil membuka "${displayTarget}" (-${cost} pts).`,
        newPoints,
      };
    },
    []
  );

  const setAdminPreviewTier = useCallback(
    (tier: "auto" | "free" | "basic" | "pro") => {
      setState((prev) => ({
        ...prev,
        adminPreviewTierOverride: tier,
        learnerIsPro:
          tier === "auto" ? prev.learnerIsPro : tier !== "free",
      }));
    },
    []
  );

  const setLearnerProStatus = useCallback(
    (isPro: boolean, user?: { name?: string; email?: string } | null) => {
      const targetName = user?.name?.trim() || "";
      const targetEmail = user?.email?.trim().toLowerCase() || "";

      setState((prev) => {
        const nextSubs: Record<string, "PRO" | "Free"> = {
          ...(prev.learnerSubscriptions ?? {}),
        };
        const tierLabel: "PRO" | "Free" = isPro ? "PRO" : "Free";
        if (targetName) {
          nextSubs[targetName] = tierLabel;
          nextSubs[targetName.toLowerCase()] = tierLabel;
        }
        if (targetEmail) {
          nextSubs[targetEmail] = tierLabel;
        }

        return {
          ...prev,
          learnerIsPro: isPro,
          learnerSubscriptions: nextSubs,
        };
      });
    },
    []
  );

  const toggleStudentProByAdmin = useCallback(
    (studentName: string, studentEmail?: string) => {
      const currentMapSnap = stateRef.current.learnerSubscriptions ?? {};
      const emailKeySnap = studentEmail?.trim().toLowerCase();
      const nameKeySnap = studentName.trim().toLowerCase();
      const currentTierSnap =
        (emailKeySnap ? currentMapSnap[emailKeySnap] : undefined) ??
        currentMapSnap[studentName] ??
        currentMapSnap[nameKeySnap] ??
        "Free";
      const nextTierSnap: "PRO" | "Free" =
        currentTierSnap === "PRO" ? "Free" : "PRO";

      setState((prev) => {
        const currentMap = prev.learnerSubscriptions ?? {};
        const emailKey = studentEmail?.trim().toLowerCase();
        const nameKeyLower = studentName.trim().toLowerCase();
        const currentTier =
          (emailKey ? currentMap[emailKey] : undefined) ??
          currentMap[studentName] ??
          currentMap[nameKeyLower] ??
          "Free";
        const nextTier: "PRO" | "Free" = currentTier === "PRO" ? "Free" : "PRO";
        const isNextPro = nextTier === "PRO";

        void persistProTierToSupabase(isNextPro, studentName, studentEmail);

        const nextMap: Record<string, "PRO" | "Free"> = {
          ...currentMap,
          [studentName]: nextTier,
          [nameKeyLower]: nextTier,
        };
        if (emailKey) {
          nextMap[emailKey] = nextTier;
        }

        return {
          ...prev,
          learnerSubscriptions: nextMap,
        };
      });

      if (nextTierSnap === "PRO") {
        addLearnerNotification({
          id: `notif-pro-admin-${Date.now()}-${nameKeySnap.replace(/[^a-z0-9]/g, "")}`,
          eventType: "pro_activated",
          targetLearner: studentEmail || studentName,
          title: "⚡ Langganan Learner PRO Aktif!",
          body: `Selamat ${studentName}! Akun Learner PRO Anda telah aktif. Seluruh modul lanjutan, template eksklusif, Wiki Agency, dan klaim sertifikat kini sudah terbuka.`,
          time: "Baru saja",
          unread: true,
          meta: { packageName: "Learner PRO" },
        });
      }
    },
    [persistProTierToSupabase, addLearnerNotification]
  );

  const setStudentProTierLocal = useCallback(
    (
      studentName: string,
      studentEmail: string | undefined,
      tier: "PRO" | "Free"
    ) => {
      const currentMapSnap = stateRef.current.learnerSubscriptions ?? {};
      const emailKeySnap = studentEmail?.trim().toLowerCase();
      const nameKeySnap = studentName.trim().toLowerCase();
      const prevTierSnap =
        (emailKeySnap ? currentMapSnap[emailKeySnap] : undefined) ??
        currentMapSnap[studentName] ??
        currentMapSnap[nameKeySnap] ??
        "Free";

      setState((prev) => {
        const currentMap = prev.learnerSubscriptions ?? {};
        const emailKey = studentEmail?.trim().toLowerCase();
        const nameKeyLower = studentName.trim().toLowerCase();
        const nextMap: Record<string, "PRO" | "Free"> = {
          ...currentMap,
          [studentName]: tier,
          [nameKeyLower]: tier,
        };
        if (emailKey) {
          nextMap[emailKey] = tier;
        }
        return {
          ...prev,
          learnerSubscriptions: nextMap,
        };
      });

      if (prevTierSnap !== "PRO" && tier === "PRO") {
        addLearnerNotification({
          id: `notif-pro-tier-${Date.now()}-${nameKeySnap.replace(/[^a-z0-9]/g, "")}`,
          eventType: "pro_activated",
          targetLearner: studentEmail || studentName,
          title: "⚡ Langganan Learner PRO Aktif!",
          body: `Selamat ${studentName}! Akun Learner PRO Anda sekarang aktif. Seluruh fitur eksklusif, template, dan sertifikat siap digunakan.`,
          time: "Baru saja",
          unread: true,
          meta: { packageName: "Learner PRO" },
        });
      }

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("ruang_sosmed_channel");
          bc.postMessage({
            type: "SUBSCRIPTION_UPDATED",
            email: emailKeySnap || "",
            name: studentName,
            tier,
          });
          bc.close();
        } catch {}
      }
    },
    [addLearnerNotification]
  );

  const registerLearnerProfile = useCallback(
    (profile: {
      name: string;
      email: string;
      role?: "admin" | "learner" | "mentor";
      points?: number;
      jobTitle?: string;
    }) => {
      if (
        profile.role === "admin" ||
        profile.email.toLowerCase().includes("dinur") ||
        profile.email.toLowerCase() === "admin@ruangsosmed.id"
      ) {
        return;
      }

      setState((prev) => {
        const initials =
          profile.name
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "LN";

        const nextAssignees = prev.assignees.some(
          (a) => a.name.toLowerCase() === profile.name.toLowerCase()
        )
          ? prev.assignees
          : [
              {
                id: `asg-reg-${Date.now()}`,
                name: profile.name,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
                roleBadge: "Social Media",
                completedChapters: 0,
                totalChapters: Math.max(
                  1,
                  prev.courseSections.flatMap((s) => s.chapters).length
                ),
                assignedDate: "Registered",
              },
              ...prev.assignees,
            ];

        const nextLeaderboard = prev.leaderboard.some(
          (l) => l.name.toLowerCase() === profile.name.toLowerCase()
        )
          ? prev.leaderboard
          : [
              ...prev.leaderboard,
              {
                rank: prev.leaderboard.length + 1,
                name: profile.name,
                role: profile.jobTitle || "Social Media Specialist",
                points: profile.points ?? 0,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
              },
            ]
              .sort((a, b) => b.points - a.points)
              .map((l, idx) => ({ ...l, rank: idx + 1 }));

        return {
          ...prev,
          assignees: nextAssignees,
          leaderboard: nextLeaderboard,
        };
      });
    },
    []
  );

  const updateMemberAccessRole = useCallback(
    async (
      emailOrId: string,
      nextRole: "Learner" | "Mentor" | "Admin"
    ): Promise<void> => {
      const cleanKey = emailOrId.toLowerCase().trim();

      // 1. Update store state (workspaceCollaborators & assignees)
      setState((prev) => {
        let matchedCollab = false;
        const nextCollabs = prev.workspaceCollaborators.map((c) => {
          const cEmail = (c.email || "").toLowerCase().trim();
          const cName = (c.name || "").toLowerCase().trim();
          if (
            cEmail === cleanKey ||
            cleanKey.includes(cEmail) ||
            c.id === emailOrId ||
            cName === cleanKey ||
            cleanKey.includes(cName) ||
            cName.includes(cleanKey)
          ) {
            matchedCollab = true;
            return {
              ...c,
              role: nextRole,
            };
          }
          return c;
        });

        if (!matchedCollab && (nextRole === "Admin" || nextRole === "Mentor")) {
          const matchedAssignee = prev.assignees.find(
            (a) =>
              a.id === emailOrId || a.name.toLowerCase().trim() === cleanKey
          );
          const displayName = matchedAssignee?.name || cleanKey.split("@")[0];
          const initials =
            displayName
              .split(" ")
              .filter(Boolean)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "MB";
          nextCollabs.push({
            id: `collab-${Date.now()}`,
            name: displayName,
            email: cleanKey.includes("@")
              ? cleanKey
              : `${cleanKey}@ruangsosmed.id`,
            initials,
            role: nextRole,
            cohort: "Ruang Sosmed Class",
            status: "accepted",
            avatarBg: nextRole === "Admin" ? "#FDF2F8" : "#EEF2FF",
            avatarText: nextRole === "Admin" ? "#DB2777" : "#4F39F6",
            joinedAt: "Baru saja",
          });
        }

        const nextAssignees = prev.assignees.map((a) => {
          if (a.id === emailOrId || a.name.toLowerCase().trim() === cleanKey) {
            return {
              ...a,
              roleBadge:
                nextRole === "Learner" ? "Social Media" : `${nextRole} Specialist`,
            };
          }
          return a;
        });

        return {
          ...prev,
          workspaceCollaborators: nextCollabs,
          assignees: nextAssignees,
        };
      });

      // 2. Persist strictly via hardened `admin_update_user_role` RPC
      if (isSupabaseConfigured) {
        try {
          const dbRole = nextRole.toLowerCase();
          let targetEmail = cleanKey;
          if (isUuid(emailOrId)) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", emailOrId)
              .maybeSingle();
            if (prof?.email) targetEmail = String(prof.email).toLowerCase().trim();
          }

          if (targetEmail.includes("@")) {
            await supabase.rpc("admin_update_user_role", {
              p_target_email: targetEmail,
              p_new_role: dbRole,
            });
          }
        } catch {
          // ignore network error
        }
      }
    },
    []
  );

  // 8. Rewards Redemption System (CRUD by Admin, Redemption by Learner)
  const createReward = useCallback(
    (item: Omit<RewardItem, "id" | "createdAt" | "claimedCount">) => {
      const newReward: RewardItem = {
        ...item,
        id: `rew-${Date.now()}`,
        claimedCount: 0,
        createdAt: new Date().toISOString(),
      };
      const nextCatalog = [newReward, ...(stateRef.current.rewardsCatalog ?? [])];
      try {
        window.localStorage.setItem(
          "ruang_sosmed_rewards_catalog_v2",
          JSON.stringify(nextCatalog)
        );
      } catch {}
      void syncRewardsToSupabase(nextCatalog);

      setState((prev) => ({
        ...prev,
        rewardsCatalog: [newReward, ...(prev.rewardsCatalog ?? [])],
      }));
    },
    []
  );

  const updateReward = useCallback((id: string, patch: Partial<RewardItem>) => {
    const nextCatalog = (stateRef.current.rewardsCatalog ?? []).map((r) =>
      r.id === id ? { ...r, ...patch } : r
    );
    try {
      window.localStorage.setItem(
        "ruang_sosmed_rewards_catalog_v2",
        JSON.stringify(nextCatalog)
      );
    } catch {}
    void syncRewardsToSupabase(nextCatalog);

    setState((prev) => ({
      ...prev,
      rewardsCatalog: (prev.rewardsCatalog ?? []).map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));
  }, []);

  const deleteReward = useCallback((id: string) => {
    const nextCatalog = (stateRef.current.rewardsCatalog ?? []).filter(
      (r) => r.id !== id
    );
    try {
      window.localStorage.setItem(
        "ruang_sosmed_rewards_catalog_v2",
        JSON.stringify(nextCatalog)
      );
    } catch {}
    void syncRewardsToSupabase(nextCatalog);

    setState((prev) => ({
      ...prev,
      rewardsCatalog: (prev.rewardsCatalog ?? []).filter((r) => r.id !== id),
    }));
  }, []);

  const redeemReward = useCallback(
    (
      rewardId: string,
      learnerName: string,
      learnerEmail?: string
    ): { success: boolean; message: string; claimedItem?: ClaimedRewardRecord } => {
      const reward = (state.rewardsCatalog ?? []).find((r) => r.id === rewardId);
      if (!reward) {
        return { success: false, message: "Hadiah tidak ditemukan." };
      }
      if (!reward.active) {
        return { success: false, message: "Hadiah ini sedang tidak aktif." };
      }
      if (reward.stock !== -1 && reward.stock <= 0) {
        return { success: false, message: "Maaf, stok hadiah ini sudah habis." };
      }
      if (state.learnerPoints < reward.pointsCost) {
        return {
          success: false,
          message: `Poin tidak mencukupi. Anda butuh ${reward.pointsCost} pts (saldo: ${state.learnerPoints} pts).`,
        };
      }

      const claimRecord: ClaimedRewardRecord = {
        id: `clm-${Date.now()}`,
        rewardId: reward.id,
        rewardTitle: reward.title,
        pointsSpent: reward.pointsCost,
        claimedAt: new Date().toISOString(),
        claimedByName: learnerName,
        claimedByEmail: learnerEmail || "",
        rewardValue: reward.rewardValue,
        category: reward.category,
        status: "Completed",
      };

      const newPoints = state.learnerPoints - reward.pointsCost;

      // Update Supabase profiles total_points atomically via hardened RPC + full points sync
      const activeSess = getActiveSessionUser();
      const claimEmail = learnerEmail || activeSess.email;
      const claimName = learnerName || activeSess.name;
      const claimKeys = normalizeAvatarKeys({
        email: claimEmail,
        name: claimName,
        username: activeSess.username,
      });
      const claimPatch: Record<string, number> = {};
      const expiresAt = Date.now() + 15000;
      claimKeys.forEach((k) => {
        recentPointLocksRef.current.set(k, { value: newPoints, expiresAt });
        claimPatch[k] = newPoints;
      });
      if (typeof window !== "undefined" && claimKeys.length > 0) {
        try {
          const nextPtsMap = {
            ...(stateRef.current.userPointsMap || {}),
            ...claimPatch,
          };
          window.localStorage.setItem(
            "ruang_sosmed_user_points_map_v1",
            JSON.stringify(nextPtsMap)
          );
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "USER_POINTS_UPDATED",
              userPointsMap: claimPatch,
              newPoints,
            });
            bc.close();
          }
        } catch {}
      }

      if (isSupabaseConfigured && reward.pointsCost > 0) {
        void (async () => {
          try {
            await supabase.rpc("redeem_learner_points", {
              p_points_cost: reward.pointsCost,
            });
          } catch {}
          await persistUserPointsToSupabase({
            email: claimEmail,
            name: claimName,
            username: activeSess.username,
            newPoints,
          });
        })();
      }

      const nextCatalog = (state.rewardsCatalog ?? []).map((r) => {
        if (r.id !== rewardId) return r;
        return {
          ...r,
          claimedCount: r.claimedCount + 1,
          stock: r.stock === -1 ? -1 : Math.max(0, r.stock - 1),
        };
      });

      try {
        window.localStorage.setItem(
          "ruang_sosmed_rewards_catalog_v2",
          JSON.stringify(nextCatalog)
        );
      } catch {}
      void syncRewardsToSupabase(nextCatalog);

      setState((prev) => {
        const nextLeaderboard = prev.leaderboard
          .map((l) =>
            l.name.toLowerCase() === learnerName.toLowerCase()
              ? { ...l, points: Math.max(0, l.points - reward.pointsCost) }
              : l
          )
          .sort((a, b) => b.points - a.points)
          .map((l, idx) => ({ ...l, rank: idx + 1 }));

        const notif: LearnerNotification = {
          id: `notif-reward-${Date.now()}`,
          title: `🎁 Hadiah Berhasil Ditukarkan: ${reward.title}`,
          body: `Anda telah menukarkan ${reward.pointsCost} ★ pts. Saldo poin Anda sekarang ${newPoints} pts. Akses hadiah Anda di tab Hadiah Saya.`,
          time: "Just now",
          unread: true,
        };

        return {
          ...prev,
          learnerPoints: newPoints,
          userPointsMap: { ...(prev.userPointsMap || {}), ...claimPatch },
          rewardsCatalog: nextCatalog,
          claimedRewards: [claimRecord, ...(prev.claimedRewards ?? [])],
          leaderboard: nextLeaderboard,
          learnerNotifications: [notif, ...prev.learnerNotifications],
        };
      });

      awardRumiXpEvent({
        userKey: resolveXpUserKey({
          email: claimEmail,
          name: claimName,
          username: activeSess.username,
        }),
        type: "reward_claim",
        dedupeKey: `reward:${reward.id}:${claimRecord.id}`,
        detail: reward.title,
        tierKind: learnerTierKindRef.current,
      });

      return {
        success: true,
        message: `Selamat! Anda berhasil menukarkan "${reward.title}" (-${reward.pointsCost} pts).`,
        claimedItem: claimRecord,
      };
    },
    [state.rewardsCatalog, state.learnerPoints]
  );

  // 9. Cohorts / Projects Management Handlers
  const findCohortTarget = (
    list: CohortProjectItem[],
    idOrName: string
  ): CohortProjectItem | undefined => {
    const needleLower = idOrName.trim().toLowerCase();
    const normalizedNeedleLower =
      normalizeCohortProjectName(idOrName).toLowerCase();
    return list.find((c) => {
      const cNameLower = c.name.trim().toLowerCase();
      const cNormLower = normalizeCohortProjectName(c.name).toLowerCase();
      return (
        c.id === idOrName ||
        cNameLower === needleLower ||
        (normalizedNeedleLower !== "" && cNormLower === normalizedNeedleLower)
      );
    });
  };

  const persistCohortProjects = useCallback(
    (nextCohorts: CohortProjectItem[]) => {
      const nowMs = Date.now();
      lastCohortMutationTsRef.current = nowMs;
      recentCohortMutationUntilRef.current = nowMs + 15000;
      const deletedSnapshot = Array.from(deletedCohortNamesRef.current);
      lastRemoteCohortSyncSigRef.current = JSON.stringify({
        cohorts: nextCohorts,
        deleted: deletedSnapshot,
      });

      if (Array.isArray(cachedContentsRowsRef.current)) {
        const nowIso = new Date(nowMs).toISOString();
        cachedContentsRowsRef.current = cachedContentsRowsRef.current.map(
          (row) =>
            row?.title === "__SYSTEM_COHORT_PROJECTS__"
              ? {
                  ...row,
                  updated_at: nowIso,
                  settings_json: {
                    ...(row.settings_json || {}),
                    cohortProjects: nextCohorts,
                    deletedNames: deletedSnapshot,
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                  },
                }
              : row
        );
      }
      lastContentsWmKeyRef.current = "";
      lastWatermarkRef.current = "";
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "ruang_sosmed_cohort_projects_v1",
            JSON.stringify(nextCohorts)
          );
          window.localStorage.setItem(
            COHORT_PROJECTS_TS_STORAGE_KEY,
            String(nowMs)
          );
        }
      } catch {}
      void syncCohortProjectsToSupabase(
        nextCohorts,
        deletedSnapshot,
        nowMs
      ).then(() => {
        cachedContentsRowsRef.current = null;
        lastContentsWmKeyRef.current = "";
        lastWatermarkRef.current = "";
      });
    },
    []
  );

  const addCohortProject = useCallback(
    (
      name: string,
      color = "#4F39F6",
      description?: string,
      shareWithAllLearners = false
    ) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const cleanKey = trimmed.toLowerCase();
      if (deletedCohortNamesRef.current.has(cleanKey)) {
        deletedCohortNamesRef.current.delete(cleanKey);
        persistStoredIdSet(
          DELETED_COHORTS_STORAGE_KEY,
          deletedCohortNamesRef.current
        );
      }
      const current = stateRef.current.cohortProjects || [];
      if (
        current.some((c) => c.name.toLowerCase() === cleanKey)
      ) {
        return;
      }
      const newCohort: CohortProjectItem = {
        id: `cohort-${Date.now()}`,
        name: trimmed,
        color,
        description: description || "Custom Cohort / Track",
        shareWithAllLearners: Boolean(shareWithAllLearners),
      };
      const nextCohorts = dedupeCohortProjectIds([...current, newCohort]);
      setState((prev) => ({
        ...prev,
        cohortProjects: nextCohorts,
      }));
      persistCohortProjects(nextCohorts);
    },
    [persistCohortProjects]
  );

  const updateCohortProject = useCallback(
    (
      idOrName: string,
      updates: {
        name?: string;
        color?: string;
        description?: string;
        shareWithAllLearners?: boolean;
      }
    ) => {
      const current = stateRef.current.cohortProjects || [];
      const target = findCohortTarget(current, idOrName);
      if (!target) return;

      const oldName = target.name.trim();
      const oldNameLower = oldName.toLowerCase();
      const nextName = updates.name?.trim() || oldName;
      const nextNameLower = nextName.toLowerCase();
      const isRenamed = oldNameLower !== nextNameLower;

      if (isRenamed) {
        deletedCohortNamesRef.current.add(oldNameLower);
        deletedCohortNamesRef.current.delete(nextNameLower);
        persistStoredIdSet(
          DELETED_COHORTS_STORAGE_KEY,
          deletedCohortNamesRef.current
        );
      }

      const nextCohorts = dedupeCohortProjectIds(
        current.map((c) => {
          if (c.id === target.id || c.name.trim().toLowerCase() === oldNameLower) {
            return {
              ...c,
              name: nextName,
              color: updates.color || c.color,
              description:
                updates.description !== undefined
                  ? updates.description
                  : c.description,
              shareWithAllLearners:
                updates.shareWithAllLearners !== undefined
                  ? Boolean(updates.shareWithAllLearners)
                  : c.shareWithAllLearners,
            };
          }
          return c;
        })
      );

      const affectedItems = isRenamed
        ? (stateRef.current.explorerItems || [])
            .filter(
              (it) =>
                normalizeCohortProjectName(it.cohort).toLowerCase() ===
                  oldNameLower ||
                (it.cohort || "").trim().toLowerCase() === oldNameLower
            )
            .map((it) => ({ ...it, cohort: nextName }))
        : [];

      setState((prev) => {
        const nextExplorer = isRenamed
          ? prev.explorerItems.map((it) =>
              normalizeCohortProjectName(it.cohort).toLowerCase() ===
                oldNameLower ||
              (it.cohort || "").trim().toLowerCase() === oldNameLower
                ? { ...it, cohort: nextName }
                : it
            )
          : prev.explorerItems;
        if (isRenamed && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              "ruang_sosmed_explorer_items_v2",
              JSON.stringify(nextExplorer)
            );
          } catch {}
        }
        return {
          ...prev,
          cohortProjects: nextCohorts,
          explorerItems: nextExplorer,
        };
      });
      persistCohortProjects(nextCohorts);

      if (isRenamed && isSupabaseConfigured) {
        void (async () => {
          try {
            await supabase
              .from("contents")
              .update({
                cohort: nextName,
                updated_at: new Date().toISOString(),
              })
              .ilike("cohort", oldName);
          } catch {}
          for (const item of affectedItems) {
            const key = item.title.trim().toLowerCase();
            await pushContentToSupabase(
              item,
              stateRef.current.courseCurriculums?.[key]
            );
          }
        })();
      }
    },
    [persistCohortProjects]
  );

  const deleteCohortProject = useCallback(
    (idOrName: string) => {
      const current = stateRef.current.cohortProjects || [];
      const target = findCohortTarget(current, idOrName);
      if (!target) return;

      const deletedName = target.name.trim();
      const deletedNameLower = deletedName.toLowerCase();
      deletedCohortNamesRef.current.add(deletedNameLower);
      persistStoredIdSet(
        DELETED_COHORTS_STORAGE_KEY,
        deletedCohortNamesRef.current
      );

      const filtered = current.filter(
        (c) =>
          c.id !== target.id &&
          c.name.trim().toLowerCase() !== deletedNameLower
      );
      const nextCohorts =
        filtered.length > 0 ? filtered : INITIAL_COHORT_PROJECTS;
      const fallbackCohort =
        nextCohorts[0]?.name || INITIAL_COHORT_PROJECTS[0].name;

      const affectedItems = (stateRef.current.explorerItems || [])
        .filter(
          (it) =>
            normalizeCohortProjectName(it.cohort).toLowerCase() ===
              deletedNameLower ||
            (it.cohort || "").trim().toLowerCase() === deletedNameLower
        )
        .map((it) => ({ ...it, cohort: fallbackCohort }));

      setState((prev) => {
        const nextExplorer = prev.explorerItems.map((it) =>
          normalizeCohortProjectName(it.cohort).toLowerCase() ===
            deletedNameLower ||
          (it.cohort || "").trim().toLowerCase() === deletedNameLower
            ? { ...it, cohort: fallbackCohort }
            : it
        );
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              "ruang_sosmed_explorer_items_v2",
              JSON.stringify(nextExplorer)
            );
          } catch {}
        }
        return {
          ...prev,
          cohortProjects: nextCohorts,
          explorerItems: nextExplorer,
        };
      });
      persistCohortProjects(nextCohorts);

      if (isSupabaseConfigured) {
        void (async () => {
          try {
            await supabase
              .from("contents")
              .update({
                cohort: fallbackCohort,
                updated_at: new Date().toISOString(),
              })
              .ilike("cohort", deletedName);
          } catch {}
          for (const item of affectedItems) {
            const key = item.title.trim().toLowerCase();
            await pushContentToSupabase(
              item,
              stateRef.current.courseCurriculums?.[key]
            );
          }
        })();
      }
    },
    [persistCohortProjects]
  );

  const getCourseCurriculum = useCallback(
    (courseTitle: string): CourseSectionAccordion[] | null => {
      const key = courseTitle.toLowerCase().trim();
      const inStore = state.courseCurriculums?.[key] || null;
      const expectedTs = contentUpdatedAtRef.current[key];
      const cachedTs =
        fetchedCurriculumTsRef.current[key] ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem(`ruang_sosmed_curriculum_ts_${key}`)
          : null);
      const isOutlineOnlyInStore = Boolean(
        Array.isArray(inStore) &&
          inStore.some((sec: any) => Boolean(sec?._outlineOnly))
      );

      if (
        isSupabaseConfigured &&
        key &&
        (isOutlineOnlyInStore || !inStore || (expectedTs && cachedTs !== expectedTs))
      ) {
        const matchedExp = stateRef.current.explorerItems.find(
          (e) => e.title?.trim().toLowerCase() === key && e.type !== "Folder"
        );
        if (matchedExp) {
          void loadCourseCurriculumOnDemand(
            matchedExp.id || courseTitle,
            expectedTs
          );
        }
      }

      let inLocal: CourseSectionAccordion[] | null = null;
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(
            `ruang_sosmed_curriculum_${key}`
          );
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) inLocal = parsed;
          }
          if (!inLocal) {
            const rawEd = window.localStorage.getItem(
              `ruang_sosmed_editor_sections_${key}`
            );
            if (rawEd) {
              const parsedEd = JSON.parse(rawEd);
              if (Array.isArray(parsedEd) && parsedEd.length > 0) {
                inLocal = parsedEd.map((sec: any, secIdx: number) => ({
                  id: sec.id || `csec-${secIdx + 1}`,
                  sectionTitle: sec.title,
                  shortTitle: sec.title.split(":")[0] || `Sec ${secIdx + 1}`,
                  hidden: Boolean(sec.hidden),
                  chapters: (sec.chapters || []).map(
                    (ch: any, chIdx: number) => ({
                      id: ch.id || `cch-${secIdx + 1}-${chIdx + 1}`,
                      title: ch.title,
                      type: "Lesson" as const,
                      duration: ch.readingTime || "10 mins",
                      completed: false,
                      locked: false,
                      points: parseInt(ch.points) || 10,
                      videoTitle:
                        ch.videoFileName || `${ch.title} Video Lesson`,
                      videoDuration: ch.readingTime || "10:00",
                      videoUrl: ch.videoUrl || "",
                      videoMode: ch.videoMode || "embed",
                      contentParagraphs: ch.bodyText
                        ? ch.bodyText.split("\n\n").filter(Boolean)
                        : [],
                      calloutTip: ch.calloutText || "",
                      attachments: ch.attachments || [],
                      isPro: Boolean(ch.isPro),
                      ...(ch.unlockPointsCost !== undefined
                        ? { unlockPointsCost: Number(ch.unlockPointsCost) }
                        : {}),
                      ...(ch.unlockPriceIdr !== undefined
                        ? { unlockPriceIdr: Number(ch.unlockPriceIdr) }
                        : {}),
                      hidden: Boolean(ch.hidden),
                    })
                  ),
                }));
              }
            }
          }
        } catch {}
      }

      if (inStore && inLocal) {
        return overlayLocalProgress(inStore, inLocal);
      }
      return inStore || inLocal || null;
    },
    [state.courseCurriculums, loadCourseCurriculumOnDemand]
  );

  const saveCourseCurriculumLive = useCallback(
    (
      courseTitle: string,
      sections: CourseSectionAccordion[],
      options?: { immediate?: boolean }
    ) => {
      const key = courseTitle.toLowerCase().trim();
      if (!key) return;
      recentCurriculumMutationUntilRef.current.set(key, Date.now() + 15000);

      if (Array.isArray(cachedContentsRowsRef.current)) {
        const outline = buildCompactChapterOutline(sections);
        cachedContentsRowsRef.current = cachedContentsRowsRef.current.map(
          (row) => {
            if (String(row?.title || "").trim().toLowerCase() !== key) return row;
            return {
              ...row,
              settings_json: {
                ...(row.settings_json || {}),
                curriculum: sections,
                explorer_meta: {
                  ...(row.settings_json?.explorer_meta || {}),
                  chapterOutline: outline,
                },
              },
            };
          }
        );
      }
      lastContentsWmKeyRef.current = "";
      lastWatermarkRef.current = "";

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_curriculum_${key}`,
            JSON.stringify(sections)
          );
        } catch {}
      }
      setState((prev) => {
        const nextCurriculums = {
          ...(prev.courseCurriculums || {}),
          [key]: sections,
        };
        const nextCatalog = syncLearnerCatalogWithExplorer(
          prev.explorerItems,
          prev.learnerAssignedItems,
          nextCurriculums
        );
        return {
          ...prev,
          courseSections:
            key === "fundamental social media specialist"
              ? sections
              : prev.courseSections,
          courseCurriculums: nextCurriculums,
          learnerAssignedItems: nextCatalog,
        };
      });

      addLearnerNotification({
        id: `notif-curriculum-live-${Date.now()}`,
        eventType: "material_added",
        title: `📚 Materi Diperbarui: ${courseTitle}`,
        body: `Mentor telah memperbarui isi materi pada kelas "${courseTitle}". Buka My Learning untuk mempelajari modul terbaru.`,
        time: "Baru saja",
        unread: true,
        meta: { contentTitle: courseTitle },
      });

      // Sinkronkan perubahan kurikulum (termasuk isPro, videoUrl & hide/show) ke Supabase
      const target = stateRef.current.explorerItems.find(
        (e) => e.title.trim().toLowerCase() === key
      );
      if (target) {
        if (curriculumPushTimer.current) {
          clearTimeout(curriculumPushTimer.current);
          curriculumPushTimer.current = null;
        }
        const runPush = () => {
          void pushContentToSupabase(target, sections).then((dbId) => {
            cachedContentsRowsRef.current = null;
            lastContentsWmKeyRef.current = "";
            lastWatermarkRef.current = "";
            if (dbId && dbId !== target.id) {
              setState((prev) => ({
                ...prev,
                explorerItems: prev.explorerItems.map((e) =>
                  e.id === target.id ? { ...e, id: dbId } : e
                ),
              }));
            }
          });
        };
        if (options?.immediate) {
          runPush();
        } else {
          curriculumPushTimer.current = setTimeout(runPush, 400);
        }
      }
    },
    [addLearnerNotification]
  );

  const updateCertificateConfig = useCallback(
    (patch: Partial<CertificateDesignConfig>, courseKey?: string) => {
      const cleanKey = courseKey?.trim().toLowerCase();
      const isCourseSpecific = Boolean(
        cleanKey && cleanKey !== "all" && cleanKey !== "global"
      );

      let nextGlobal = stateRef.current.certificateConfig;
      let nextCourseConfigs: Record<string, CertificateDesignConfig> = {
        ...(stateRef.current.courseCertificateConfigs || {}),
      };

      if (isCourseSpecific && cleanKey) {
        const base =
          nextCourseConfigs[cleanKey] ||
          stateRef.current.certificateConfig ||
          DEFAULT_CERTIFICATE_CONFIG;
        nextCourseConfigs[cleanKey] = {
          ...base,
          ...patch,
        };
      } else {
        nextGlobal = {
          ...stateRef.current.certificateConfig,
          ...patch,
        };
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_cert_config_v1",
            JSON.stringify(nextGlobal)
          );
          window.localStorage.setItem(
            "ruang_sosmed_course_cert_configs_v1",
            JSON.stringify(nextCourseConfigs)
          );
        } catch {}
      }

      void syncCertificateConfigToSupabase(nextGlobal, nextCourseConfigs);

      setState((prev) => ({
        ...prev,
        certificateConfig: nextGlobal,
        courseCertificateConfigs: nextCourseConfigs,
      }));
    },
    []
  );

  const updateLearnerProConfig = useCallback(
    (patch: Partial<LearnerProPlanConfig>) => {
      const nextConfig: LearnerProPlanConfig = {
        ...(stateRef.current.learnerProConfig || DEFAULT_LEARNER_PRO_CONFIG),
        ...patch,
      };

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_learner_pro_config_v1",
            JSON.stringify(nextConfig)
          );
        } catch {}
      }

      void syncLearnerProConfigToSupabase(nextConfig);

      setState((prev) => ({
        ...prev,
        learnerProConfig: nextConfig,
      }));
    },
    []
  );

  const updateMaintenanceConfig = useCallback(
    (patch: Partial<MaintenanceConfig>) => {
      const nextConfig: MaintenanceConfig = {
        ...(stateRef.current.maintenanceConfig || DEFAULT_MAINTENANCE_CONFIG),
        ...patch,
      };

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_maintenance_config_v1",
            JSON.stringify(nextConfig)
          );
        } catch {}
      }

      void syncMaintenanceConfigToSupabase(nextConfig);

      setState((prev) => ({
        ...prev,
        maintenanceConfig: nextConfig,
      }));
    },
    []
  );

  const updateLearnerPagesConfig = useCallback(
    (patch: Partial<LearnerPagesVisibilityConfig>) => {
      const nextConfig: LearnerPagesVisibilityConfig = {
        ...(stateRef.current.learnerPagesConfig || DEFAULT_LEARNER_PAGES_CONFIG),
        ...patch,
      };

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_learner_pages_config_v1",
            JSON.stringify(nextConfig)
          );
        } catch {}

        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "LEARNER_PAGES_CONFIG_UPDATED",
              config: nextConfig,
            });
            bc.close();
          } catch {}
        }
      }

      cachedContentsRowsRef.current = null;
      lastContentsWmKeyRef.current = "";
      lastWatermarkRef.current = "";
      void syncLearnerPagesConfigToSupabase(nextConfig);

      setState((prev) => ({
        ...prev,
        learnerPagesConfig: nextConfig,
      }));
    },
    []
  );

  const resolveUserAvatar = useCallback(
    (...identifiers: (string | undefined | null)[]): string => {
      const map = state.userAvatars || stateRef.current.userAvatars || {};
      return lookupNormalizedRecordValue(map, identifiers) || "";
    },
    [state.userAvatars]
  );

  const resolveUserPoints = useCallback(
    (...identifiers: (string | undefined | null)[]): number | null => {
      const map = state.userPointsMap || stateRef.current.userPointsMap || {};
      const val = lookupNormalizedRecordValue(map, identifiers);
      return typeof val === "number" && Number.isFinite(val) ? val : null;
    },
    [state.userPointsMap]
  );

  const syncUserPointsBalance = useCallback(
    (params: {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      username?: string | null;
      newPoints: number;
    }): number => {
      const cleanPoints = Math.max(0, Math.round(Number(params.newPoints) || 0));
      const keys = normalizeAvatarKeys(params);
      const patchForChannel: Record<string, number> = {};
      const expiresAt = Date.now() + 15000;
      keys.forEach((k) => {
        recentPointLocksRef.current.set(k, { value: cleanPoints, expiresAt });
        patchForChannel[k] = cleanPoints;
      });

      const mergedPtsMap: Record<string, number> = {
        ...(stateRef.current.userPointsMap || {}),
        ...patchForChannel,
      };

      if (typeof window !== "undefined" && keys.length > 0) {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_user_points_map_v1",
            JSON.stringify(mergedPtsMap)
          );
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "USER_POINTS_UPDATED",
              userPointsMap: patchForChannel,
              newPoints: cleanPoints,
            });
            bc.close();
          }
        } catch {}
      }

      const activeSess = getActiveSessionUser();
      const matchesSessionUser =
        lookupNormalizedRecordValue(patchForChannel, [
          activeSess.email,
          activeSess.name,
          activeSess.username,
        ]) !== undefined;

      setState((prev) => {
        const keySet = new Set(keys);
        const nextLeaderboard = (prev.leaderboard || [])
          .map((l) => {
            const lKey = (l.name || "").trim().toLowerCase();
            return lKey && keySet.has(lKey) ? { ...l, points: cleanPoints } : l;
          })
          .sort((a, b) => b.points - a.points)
          .map((l, idx) => ({ ...l, rank: idx + 1 }));

        return {
          ...prev,
          userPointsMap: mergedPtsMap,
          leaderboard: nextLeaderboard,
          learnerPoints: matchesSessionUser ? cleanPoints : prev.learnerPoints,
        };
      });

      void persistUserPointsToSupabase({
        id: params.id,
        email: params.email,
        name: params.name,
        username: params.username,
        newPoints: cleanPoints,
      });

      return cleanPoints;
    },
    []
  );

  const updateUserAvatarInStore = useCallback(
    (
      avatarUrl: string,
      identifiers: {
        id?: string | null;
        email?: string | null;
        name?: string | null;
        username?: string | null;
      }
    ) => {
      const cleanUrl = (avatarUrl || "").trim();
      const keys = normalizeAvatarKeys(identifiers);
      if (keys.length === 0) return;

      const expiresAt = Date.now() + 10000;
      const patchForChannel: Record<string, string> = {};
      keys.forEach((k) => {
        recentAvatarLocksRef.current.set(k, { value: cleanUrl, expiresAt });
        patchForChannel[k] = cleanUrl;
      });

      const mergedMap: Record<string, string> = {
        ...(stateRef.current.userAvatars || {}),
      };
      keys.forEach((k) => {
        if (cleanUrl) {
          mergedMap[k] = cleanUrl;
        } else {
          delete mergedMap[k];
        }
      });

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_user_avatars_v1",
            JSON.stringify(mergedMap)
          );
        } catch {}

        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "AVATAR_UPDATED",
              userAvatars: patchForChannel,
            });
            bc.close();
          } catch {}
        }
      }

      setState((prev) => ({
        ...prev,
        userAvatars: mergedMap,
      }));

      if (isSupabaseConfigured) {
        const dbVal = cleanUrl || null;
        const cleanEmail = identifiers.email?.trim();
        const cleanId = identifiers.id?.trim();
        const cleanUsername = identifiers.username
          ?.trim()
          .replace(/^@+/, "");

        if (cleanId && isUuid(cleanId)) {
          void supabase
            .from("profiles")
            .update({ avatar_url: dbVal })
            .eq("id", cleanId);
          void supabase
            .from("user_profiles")
            .update({ avatar_url: dbVal })
            .eq("user_id", cleanId);
        }
        if (cleanEmail) {
          void supabase
            .from("profiles")
            .update({ avatar_url: dbVal })
            .ilike("email", cleanEmail);
          void supabase
            .from("user_profiles")
            .update({ avatar_url: dbVal })
            .ilike("email", cleanEmail);
        }
        if (cleanUsername) {
          void supabase
            .from("user_profiles")
            .update({ avatar_url: dbVal })
            .ilike("username", cleanUsername);
        }
        void (async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const uid = sessionData?.session?.user?.id;
            if (!uid) return;
            const { data: prof } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", uid)
              .maybeSingle();
            if (prof?.role === "admin" || prof?.role === "mentor") {
              await syncUserAvatarsToSupabase(mergedMap);
            }
          } catch {}
        })();
      }
    },
    []
  );

  const pushAdminNotification = useCallback(
    (params: {
      eventType: "user_registered" | "pro_subscribed";
      userName: string;
      userEmail?: string;
      packageName?: string;
      priceLabel?: string;
    }): AdminActivityNotification => {
      const notif = buildAdminActivityNotification(params);
      knownAdminNotifIdsRef.current.add(notif.id);
      adminNotifHydratedRef.current = true;

      const currentList = stateRef.current.adminNotifications || [];
      const deduped = [
        notif,
        ...currentList.filter((n) => n.id !== notif.id),
      ].slice(0, 50);

      setState((prev) => ({
        ...prev,
        adminNotifications: [
          notif,
          ...(prev.adminNotifications || []).filter((n) => n.id !== notif.id),
        ].slice(0, 50),
      }));

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            ADMIN_NOTIFS_STORAGE_KEY,
            JSON.stringify(deduped)
          );
        } catch {}

        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "ADMIN_NOTIFICATION_NEW",
              notification: notif,
            });
            bc.close();
          } catch {}
        }

        window.dispatchEvent(
          new CustomEvent("ruang_sosmed_admin_notif", { detail: notif })
        );
      }

      void syncAdminNotificationsToSupabase(deduped);
      return notif;
    },
    []
  );

  const markAdminNotificationRead = useCallback((id: string) => {
    setState((prev) => {
      const nextList = (prev.adminNotifications || []).map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            ADMIN_NOTIFS_STORAGE_KEY,
            JSON.stringify(nextList)
          );
        } catch {}
      }
      void syncAdminNotificationsToSupabase(nextList);
      return {
        ...prev,
        adminNotifications: nextList,
      };
    });
  }, []);

  const markAllAdminNotificationsRead = useCallback(() => {
    setState((prev) => {
      const nextList = (prev.adminNotifications || []).map((n) => ({
        ...n,
        read: true,
      }));
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            ADMIN_NOTIFS_STORAGE_KEY,
            JSON.stringify(nextList)
          );
        } catch {}
      }
      void syncAdminNotificationsToSupabase(nextList);
      return {
        ...prev,
        adminNotifications: nextList,
      };
    });
  }, []);

  const clearAdminNotifications = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ADMIN_NOTIFS_STORAGE_KEY, JSON.stringify([]));
      } catch {}
    }
    void syncAdminNotificationsToSupabase([]);
    setState((prev) => ({
      ...prev,
      adminNotifications: [],
    }));
  }, []);

  const learnerAccess = useMemo(
    () =>
      resolveLearnerAccess({
        learnerIsPro: state.learnerIsPro,
        learnerPackageId: state.learnerPackageId,
        learnerPackageName: state.learnerPackageName,
        learnerBillingCycle: state.learnerBillingCycle,
        hasUsedTrial: state.learnerHasUsedTrial,
        unlockedItems: state.learnerUnlockedItems,
        proConfig: state.learnerProConfig,
        showWikiPage: state.learnerPagesConfig?.showWikiPage ?? true,
        showFavoritesPage: state.learnerPagesConfig?.showFavoritesPage ?? true,
        isStaffSession: isStaffDbSession,
        previewTierOverride: state.adminPreviewTierOverride,
      }),
    [
      state.learnerIsPro,
      state.learnerPackageId,
      state.learnerPackageName,
      state.learnerBillingCycle,
      state.learnerHasUsedTrial,
      state.learnerUnlockedItems,
      state.learnerProConfig,
      state.learnerPagesConfig,
      isStaffDbSession,
      state.adminPreviewTierOverride,
    ]
  );

  learnerTierKindRef.current = learnerAccess.tierKind;

  const value: RuangSosmedStoreContextValue = {
    ...state,
    learnerAccess,
    setAdminPreviewTier,
    unlockModuleWithPoints,
    publishContentToStudioAndCatalog,
    createFolder,
    updateFolder,
    moveToFolder,
    duplicateExplorerItem,
    deleteExplorerItem,
    toggleArchiveContent,
    toggleShareContent,
    updateExplorerItemThumbnail,
    updateContentLanguage,
    updateExplorerItemDetails,
    addWikiResourceCard,
    deleteWikiResourceCard,
    assignContentToLearners,
    manageAssigneeAction,
    markLearnerChapterComplete,
    toggleLearnerItemFavorite,
    submitLearnerQuizOrAssignment,
    evaluateSubmissionInGradingCenter,
    quickGradeDashboardQuiz,
    postDiscussionMessage,
    deleteDiscussionThread,
    deleteDiscussionReply,
    reportContentIssueFromLearner,
    toggleReportedIssueStatus,
    setTodos,
    restoreContentVersion,
    markAllNotificationsRead,
    markLearnerNotificationRead,
    clearLearnerNotifications,
    addLearnerNotification,
    sendCollaboratorInvitation,
    acceptCollaboratorInvitation,
    removeWorkspaceCollaborator,
    workspaceCollaborators: state.workspaceCollaborators,
    resetGlobalStoreToDefaults,
    clearAllStoreData,
    saveRsLessonNote,
    submitRsLessonReview,
    setLearnerProStatus,
    submitProUpgradeRequest,
    toggleStudentProByAdmin,
    setStudentProTierLocal,
    registerLearnerProfile,
    updateMemberAccessRole,
    createReward,
    updateReward,
    deleteReward,
    redeemReward,
    addCohortProject,
    updateCohortProject,
    deleteCohortProject,
    getCourseCurriculum,
    saveCourseCurriculumLive,
    updateCertificateConfig,
    updateLearnerProConfig,
    updateMaintenanceConfig,
    updateLearnerPagesConfig,
    updateUserAvatarInStore,
    resolveUserAvatar,
    resolveUserPoints,
    syncUserPointsBalance,
    unassignLearnerFromContent,
    redeemFolderAccessCode,
    updateContentAccessCode,
    pushAdminNotification,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    clearAdminNotifications,
  };

  return (
    <RuangSosmedContext.Provider value={value}>
      {children}
    </RuangSosmedContext.Provider>
  );
}

export function useRuangSosmedStore() {
  const ctx = useContext(RuangSosmedContext);
  if (!ctx) {
    throw new Error(
      "useRuangSosmedStore must be used within a RuangSosmedProvider"
    );
  }
  return ctx;
}
