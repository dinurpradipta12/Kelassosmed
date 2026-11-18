"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
  type ExplorerContentItem,
  type ExplorerItemType,
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
  type LearnerAssignedItem,
  type CourseSectionAccordion,
  type CourseChapterItem,
  type LearnerNotification,
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
  INITIAL_REWARDS_CATALOG,
  type RewardItem,
  type ClaimedRewardRecord,
} from "@/lib/rewards-data";

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
}

export interface LearnerProPackageItem {
  id: string;
  name: string;
  badge: string;
  priceLabel: string;
  periodLabel: string;
  description: string;
  ctaButtonLabel: string;
  featuresHeading: string;
  features: string[];
  highlighted?: boolean;
  qrCodeUrl?: string;
}

export interface LearnerProPlanConfig {
  modalTitle: string;
  modalSubtitle: string;
  badgeText: string;
  planName: string;
  priceLabel: string;
  periodLabel: string;
  planSummary: string;
  featuresHeading: string;
  features: string[];
  footerNote: string;
  ctaButtonLabel: string;
  bannerBadge: string;
  bannerHeading: string;
  bannerDescription: string;
  bannerPeriodLabel: string;
  bannerCtaLabel: string;
  qrCodeUrl: string;
  merchantName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  whatsappNumber: string;
  paymentInstructions: string;
  packages?: LearnerProPackageItem[];
}

export const DEFAULT_LEARNER_PRO_FEATURES = [
  "Akses Kelas & Materi Lanjutan (Advance Courses & Section 2–3)",
  "Download File Template & Resource Kelas (PDF, Notion, ZIP, Hook Sheet)",
  "Direktori Wiki & SOP Agency (Kalender Konten, 120 Hook Script, SOP Meta Ads)",
  "Klaim & Download Sertifikat Resmi HD (Official Certificate PDF/PNG)",
  "Review Tugas Praktik / Audit Akun 1-on-1 oleh Mentor",
  "Tanya Jawab & Diskusi Bab langsung dengan Mentor (Chapter Q&A)",
  "Fitur Catatan Pribadi & Simpan Favorit (Personal Lesson Notes & Favorites)",
];

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

export const DEFAULT_LEARNER_PRO_CONFIG: LearnerProPlanConfig = {
  modalTitle: "Upgrade to Ruang Sosmed 2.0 Learner PRO",
  modalSubtitle:
    "Unlock all 7 premium learning features, templates, mentor reviews, and verified certificates",
  badgeText: "LEARNER PRO MEMBERSHIP",
  planName: "Creator Academy Plan",
  priceLabel: "Rp 149.000",
  periodLabel: "/ month (or $14/mo)",
  planSummary:
    "Full access to every advanced social media track, downloadable agency SOP, and 1-on-1 mentor review.",
  featuresHeading: "7 Premium Learner Features Included",
  features: [...DEFAULT_LEARNER_PRO_FEATURES],
  footerNote: "Instant activation • Cancel anytime",
  ctaButtonLabel: "Activate Learner PRO",
  bannerBadge: "KHUSUS LEARNER • PRO PASS",
  bannerHeading: "Upgrade ke Learner PRO — Buka Semua 7 Fitur Eksklusif",
  bannerDescription:
    "Akses Bab Lanjutan (Advance Modules), Download Template & Hook Sheet, Direktori Wiki & SOP Agency, Klaim Sertifikat HD, Review Tugas 1-on-1 bersama Mentor, Q&A Diskusi Bab, serta Catatan Pribadi & Simpan Favorit.",
  bannerPeriodLabel: "/ bulan",
  bannerCtaLabel: "Upgrade ke Learner PRO",
  qrCodeUrl: "",
  merchantName: "Ruang Sosmed 2.0",
  bankName: "BCA / Mandiri",
  accountNumber: "123-456-7890",
  accountHolder: "PT Ruang Sosmed Indonesia",
  whatsappNumber: "6281234567890",
  paymentInstructions:
    "Scan kode QRIS di atas melalui aplikasi m-Banking atau e-Wallet (GoPay, OVO, DANA, ShopeePay), lalu konfirmasi pembayaran Anda.",
  packages: [
    {
      id: "pkg-creator-academy",
      name: "Creator Academy Plan",
      badge: "LEARNER PRO MEMBERSHIP",
      priceLabel: "Rp 149.000",
      periodLabel: "/ month (or $14/mo)",
      description:
        "Full access to every advanced social media track, downloadable agency SOP, and 1-on-1 mentor review.",
      ctaButtonLabel: "Activate Learner PRO",
      featuresHeading: "7 Premium Learner Features Included",
      features: [...DEFAULT_LEARNER_PRO_FEATURES],
      highlighted: true,
      qrCodeUrl: "",
    },
  ],
};

export function getNormalizedProPackages(
  cfg?: Partial<LearnerProPlanConfig> | null
): LearnerProPackageItem[] {
  const merged = {
    ...DEFAULT_LEARNER_PRO_CONFIG,
    ...(cfg || {}),
  };
  if (Array.isArray(merged.packages) && merged.packages.length > 0) {
    return merged.packages;
  }
  return [
    {
      id: "pkg-creator-academy",
      name: merged.planName || "Creator Academy Plan",
      badge: merged.badgeText || "LEARNER PRO MEMBERSHIP",
      priceLabel: merged.priceLabel || "Rp 149.000",
      periodLabel: merged.periodLabel || "/ month (or $14/mo)",
      description: merged.planSummary || "",
      ctaButtonLabel: merged.ctaButtonLabel || "Activate Learner PRO",
      featuresHeading:
        merged.featuresHeading || "7 Premium Learner Features Included",
      features:
        Array.isArray(merged.features) && merged.features.length > 0
          ? merged.features
          : [...DEFAULT_LEARNER_PRO_FEATURES],
      highlighted: true,
      qrCodeUrl: "",
    },
  ];
}

export const INITIAL_COHORT_PROJECTS: CohortProjectItem[] = [
  { id: "cohort-1", name: "Ruang Sosmed Class", color: "#EC4899", description: "Batch Utama Ruang Sosmed" },
  { id: "cohort-2", name: "Creator Growth Lab", color: "#10B981", description: "Short-Form Video Track" },
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

  // Global Synchronized User Avatars map (keyed by lowercase email / name / username / id)
  userAvatars: Record<string, string>;
}

const STORAGE_KEY = "ruang_sosmed_2_0_clean_store_v6";

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
    if (!dbId) {
      // Cek apakah konten dengan title ini sudah tersimpan di Supabase
      const { data: existing } = await supabase
        .from("contents")
        .select("id, settings_json")
        .ilike("title", item.title.trim())
        .limit(1)
        .maybeSingle();
      if (existing?.id && isUuid(existing.id)) {
        dbId = existing.id;
      } else {
        dbId = newUuid();
      }
      if (Array.isArray(existing?.settings_json?.reviews)) {
        preservedReviews = existing.settings_json.reviews;
      }
      if (Array.isArray(existing?.settings_json?.explorer_meta?.assignedLearners)) {
        preservedAssignedLearners = existing.settings_json.explorer_meta.assignedLearners;
      }
    } else {
      const { data: existing } = await supabase
        .from("contents")
        .select("settings_json")
        .eq("id", dbId)
        .maybeSingle();
      if (Array.isArray(existing?.settings_json?.reviews)) {
        preservedReviews = existing.settings_json.reviews;
      }
      if (Array.isArray(existing?.settings_json?.explorer_meta?.assignedLearners)) {
        preservedAssignedLearners = existing.settings_json.explorer_meta.assignedLearners;
      }
    }
    const resolvedAssignedLearners: string[] = Array.isArray(item.assignedLearners)
      ? item.assignedLearners
      : preservedAssignedLearners;

    const { error } = await supabase.from("contents").upsert(
      {
        id: dbId,
        type: toDbContentType(item.type),
        title: item.title,
        description: item.description || "",
        thumbnail_url: item.thumbnailUrl || null,
        folder_name: item.folderName || null,
        points_reward: 100,
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
          curriculum: curriculum ?? [],
          explorer_meta: {
            category: item.category,
            bannerGradient: item.bannerGradient,
            bannerAccent: item.bannerAccent || (item.type === "Folder" ? "blue" : undefined),
            bannerPattern: item.bannerPattern,
            language: item.language,
            cohort: item.cohort,
            thumbnailUrl: item.thumbnailUrl,
            folderName: item.folderName,
            accessCode:
              item.accessCode ||
              (item.type === "Folder"
                ? getDefaultFolderAccessCode(item.title)
                : undefined),
            assignedLearners: resolvedAssignedLearners,
            assignedCount: resolvedAssignedLearners.length,
          },
        },
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("[RuangSosmed] Gagal sync konten ke Supabase:", error.message);
      return null;
    }
    return dbId;
  } catch (e) {
    console.warn("[RuangSosmed] Gagal sync konten ke Supabase:", e);
    return null;
  } finally {
    inFlightPushTitles.delete(titleKey);
  }
}

async function syncRewardsToSupabase(catalog: RewardItem[]): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data: existing } = await supabase
      .from("contents")
      .select("id")
      .eq("title", "__SYSTEM_REWARDS_CATALOG__")
      .maybeSingle();

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
    console.warn("[RuangSosmed] Failed to sync rewards to Supabase:", err);
  }
}

async function syncCertificateConfigToSupabase(
  globalConfig: CertificateDesignConfig,
  courseConfigs?: Record<string, CertificateDesignConfig>
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data: existing } = await supabase
      .from("contents")
      .select("id")
      .eq("title", "__SYSTEM_CERTIFICATE_CONFIG__")
      .maybeSingle();

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
    console.warn("[RuangSosmed] Failed to sync certificate config to Supabase:", err);
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
    const { data: existing } = await supabase
      .from("contents")
      .select("id")
      .eq("title", "__SYSTEM_LEARNER_PRO_CONFIG__")
      .maybeSingle();

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
    console.warn(
      "[RuangSosmed] Failed to sync learnerProConfig to Supabase:",
      err
    );
  }
}

async function syncMaintenanceConfigToSupabase(config: MaintenanceConfig) {
  if (!isSupabaseConfigured) return;

  try {
    const { data: existing } = await supabase
      .from("contents")
      .select("id")
      .eq("title", "__SYSTEM_MAINTENANCE_CONFIG__")
      .maybeSingle();

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
    console.warn(
      "[RuangSosmed] Failed to sync maintenanceConfig to Supabase:",
      err
    );
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

async function syncUserAvatarsToSupabase(
  userAvatars: Record<string, string>
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data: existing } = await supabase
      .from("contents")
      .select("id, settings_json")
      .eq("title", "__SYSTEM_USER_AVATARS__")
      .maybeSingle();

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
    console.warn("[RuangSosmed] Failed to sync userAvatars to Supabase:", err);
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
        isPro: l.isPro !== undefined ? l.isPro : (c.isPro ?? false),
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

function isLegacyDummyItem(item: { id?: string; title?: string }): boolean {
  if (!item) return true;
  if (item.id && LEGACY_DUMMY_IDS.has(item.id)) return true;
  if (item.title && LEGACY_DUMMY_TITLES.has(item.title.trim().toLowerCase())) {
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
    const visibleChapters = Array.isArray(curr)
      ? curr
          .filter((s) => !s.hidden)
          .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden))
      : [];
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

    return {
      id: existing?.id || `lc-sync-${exp.id}`,
      title: exp.title,
      type: mappedType,
      urgencyBadge:
        existing?.urgencyBadge ||
        (exp.urgency === "Urgent" ? "Urgent" : "Due in 3 days"),
      isUrgentRed: existing?.isUrgentRed ?? exp.urgency === "Urgent",
      progressPercent: computedPct,
      pointsReward: existing?.pointsReward ?? 100,
      duration:
        existing?.duration ||
        (visibleChapters.length > 0
          ? `${Math.max(15, visibleChapters.length * 15)} Mins`
          : exp.type === "Quiz"
          ? "15 Mins"
          : "45 Mins"),
      skillTags:
        existing?.skillTags && existing.skillTags.length > 0
          ? existing.skillTags
          : [exp.category || "Social Media Strategy", exp.type],
      description: exp.description || existing?.description || "",
      isFavorite: existing?.isFavorite ?? false,
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

  rewardsCatalog: INITIAL_REWARDS_CATALOG,
  claimedRewards: [],
  cohortProjects: INITIAL_COHORT_PROJECTS,
  certificateConfig: DEFAULT_CERTIFICATE_CONFIG,
  courseCertificateConfigs: {},
  learnerProConfig: DEFAULT_LEARNER_PRO_CONFIG,
  maintenanceConfig: DEFAULT_MAINTENANCE_CONFIG,
  userAvatars: {},
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

  rewardsCatalog: INITIAL_REWARDS_CATALOG,
  claimedRewards: [],
  cohortProjects: INITIAL_COHORT_PROJECTS,
  certificateConfig: DEFAULT_CERTIFICATE_CONFIG,
  courseCertificateConfigs: {},
  learnerProConfig: DEFAULT_LEARNER_PRO_CONFIG,
  maintenanceConfig: DEFAULT_MAINTENANCE_CONFIG,
  userAvatars: {},
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
    accessCode?: string
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
  addLearnerNotification: (notification: {
    title: string;
    body: string;
    time?: string;
    unread?: boolean;
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
  setLearnerProStatus: (
    isPro: boolean,
    user?: { name?: string; email?: string } | null
  ) => void;
  toggleStudentProByAdmin: (studentName: string, studentEmail?: string) => void;
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
  addCohortProject: (name: string, color?: string, description?: string) => void;
  updateCohortProject: (
    idOrName: string,
    updates: { name?: string; color?: string; description?: string }
  ) => void;
  deleteCohortProject: (idOrName: string) => void;

  // 10. Multi-Course Curriculum Lookup & Live Sync
  getCourseCurriculum: (courseTitle: string) => CourseSectionAccordion[] | null;
  saveCourseCurriculumLive: (
    courseTitle: string,
    sections: CourseSectionAccordion[]
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
    folderTitle?: string;
    courseCount?: number;
    message: string;
  };
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
  const stateRef = useRef(state);
  stateRef.current = state;
  const curriculumPushTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const recentAvatarLocksRef = useRef<
    Map<string, { value: string; expiresAt: number }>
  >(new Map());
  const recentAssignmentLocksRef = useRef<
    Map<string, { assignedLearners: string[]; expiresAt: number }>
  >(new Map());

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
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
        // Bersihkan semua dummy data lama dan pastikan 100% sinkron antara Admin Explorer & Learner Portal
        const rawExplorer = Array.isArray(parsed.explorerItems)
          ? parsed.explorerItems.filter((i) => !isLegacyDummyItem(i))
          : [];

        const rawAssigned = Array.isArray(parsed.learnerAssignedItems)
          ? parsed.learnerAssignedItems.filter((i) => !isLegacyDummyItem(i))
          : [];

        const mergedCurriculums: Record<string, CourseSectionAccordion[]> = {};
        if (
          parsed.courseCurriculums &&
          typeof parsed.courseCurriculums === "object"
        ) {
          Object.entries(parsed.courseCurriculums).forEach(([k, secs]) => {
            if (
              !LEGACY_DUMMY_TITLES.has(k.trim().toLowerCase()) &&
              Array.isArray(secs) &&
              !isLegacyDummySections(secs)
            ) {
              mergedCurriculums[k.trim().toLowerCase()] = secs;
            }
          });
        }

        // Pastikan kurikulum yang tersimpan per-course di localStorage ikut termuat
        // dan jika ada course yang dibuat admin di localStorage, pastikan masuk ke rawExplorer
        if (typeof window !== "undefined") {
          try {
            for (let i = 0; i < window.localStorage.length; i++) {
              const k = window.localStorage.key(i);
              if (k && k.startsWith("ruang_sosmed_curriculum_")) {
                const titleKey = k.replace("ruang_sosmed_curriculum_", "").trim();
                if (titleKey && !LEGACY_DUMMY_TITLES.has(titleKey.toLowerCase())) {
                  const val = window.localStorage.getItem(k);
                  if (val) {
                    try {
                      const parsedSecs = JSON.parse(val);
                      if (
                        Array.isArray(parsedSecs) &&
                        !isLegacyDummySections(parsedSecs)
                      ) {
                        mergedCurriculums[titleKey.toLowerCase()] = parsedSecs;
                        if (
                          !rawExplorer.some(
                            (e) =>
                              e.title.trim().toLowerCase() ===
                              titleKey.toLowerCase()
                          )
                        ) {
                          const niceTitle = titleKey
                            .split(" ")
                            .map(
                              (w) => w.charAt(0).toUpperCase() + w.slice(1)
                            )
                            .join(" ");
                          rawExplorer.unshift({
                            id: `exp-${Date.now()}`,
                            title: niceTitle,
                            type: "Course",
                            assignedCount: 0,
                            category: "Social Media Strategy",
                            urgency: "Not Urgent",
                            editedLabel: "Published",
                            statusLabel: "Completed",
                            progressPercent: 100,
                            language: "Bahasa / English",
                            editedDate: "Edited Recently",
                            bannerGradient:
                              "linear-gradient(135deg, rgba(14, 165, 233, 0.10) 0%, #FFFFFF 100%)",
                            bannerAccent: "#0EA5E9",
                            bannerPattern: "carousel",
                            description: `Materi pembelajaran ${niceTitle} Ruang Sosmed 2.0.`,
                          });
                        }
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
            return {
              ...item,
              thumbnailUrl: item.thumbnailUrl || cachedThumb || undefined,
              cohort:
                !item.cohort ||
                item.cohort.toLowerCase() === "ruang sosmed core"
                  ? "Ruang Sosmed Class"
                  : item.cohort,
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

        const rawCohorts =
          parsed.cohortProjects && parsed.cohortProjects.length > 0
            ? parsed.cohortProjects
            : INITIAL_COHORT_PROJECTS;

        const mergedCohorts = rawCohorts
          .map((c: CohortProjectItem) => {
            if (c.name.toLowerCase() === "ruang sosmed core") {
              return { ...c, name: "Ruang Sosmed Class" };
            }
            return c;
          })
          .filter(
            (c: CohortProjectItem) =>
              c.name.toLowerCase() !== "meta ads bootcamp"
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
            ? parsed.discussionThreads.filter(
                (t) => !["thread-1", "thread-2", "thread-3"].includes(t.id)
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
            const raw = Array.isArray(parsed.learnerNotifications)
              ? parsed.learnerNotifications.filter(
                  (n) => !["notif-1", "notif-2", "notif-3"].includes(n.id)
                )
              : [];

            // Deduplicate by ID to eliminate any prior duplicate keys in storage
            const dedupedMap = new Map<string, (typeof raw)[0]>();
            raw.forEach((n) => {
              if (n && n.id) {
                dedupedMap.set(n.id, n);
              }
            });
            const deduped = Array.from(dedupedMap.values());

            const hasInviteOrJoined = deduped.some(
              (n) =>
                n.id === "notif-invite-allisha-active" ||
                n.title.toLowerCase().includes("undangan") ||
                n.title.toLowerCase().includes("resmi bergabung")
            );

            return hasInviteOrJoined
              ? deduped
              : [
                  {
                    id: "notif-invite-allisha-active",
                    title: "🤝 Undangan Kolaborasi: Admin di Ruang Sosmed Class",
                    body: 'Halo Allisha Fathya! Anda telah diundang bergabung sebagai Admin pada cohort "Ruang Sosmed Class". Pesan: "tes coba gabung"',
                    time: "Baru saja",
                    unread: true,
                  },
                  ...deduped,
                ];
          })(),
          workspaceCollaborators:
            Array.isArray(parsed.workspaceCollaborators) &&
            parsed.workspaceCollaborators.length > 0
              ? parsed.workspaceCollaborators.map((c: WorkspaceCollaborator) => {
                  const cEmail = (c.email || "").toLowerCase();
                  const cName = (c.name || "").toLowerCase();
                  if (cEmail.includes("afterlance") || cName.includes("allisha")) {
                    const isExplicitAdmin =
                      typeof window !== "undefined" &&
                      (window.localStorage.getItem(`ruang_sosmed_role_override_${cEmail}`) === "Admin" ||
                       window.localStorage.getItem("ruang_sosmed_role_override_allisha") === "Admin" ||
                       window.localStorage.getItem("ruang_sosmed_role_override_allisha fathya") === "Admin");
                    return {
                      ...c,
                      role: isExplicitAdmin ? "Admin" : "Learner",
                    };
                  }
                  return c;
                })
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
          setState((prev) => ({
            ...prev,
            ...nextParsed,
          }));
        } catch {
          // Ignore parse errors
        }
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

    const syncRegisteredLearners = async () => {
      try {
        const [
          profilesRes,
          userProfilesRes,
          contentsRes,
          authRes,
          inboxThreadsRes,
          reportedIssuesRes,
          learnerProSettingsRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("user_profiles").select("*"),
          supabase
            .from("contents")
            .select("*")
            .in("status", ["published", "archived"])
            .order("created_at", { ascending: true }),
          supabase.auth.getUser(),
          supabase
            .from("mentor_inbox_threads")
            .select("*")
            .order("updated_at", { ascending: false }),
          supabase
            .from("mentor_reported_issues")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("learner_pro_settings")
            .select("*")
            .eq("id", "default")
            .maybeSingle(),
        ]);

        const authUserId = authRes?.data?.user?.id;
        const isStaffSession = Boolean(
          authUserId &&
            Array.isArray(profilesRes.data) &&
            profilesRes.data.some(
              (p: any) =>
                p.id === authUserId &&
                (p.role === "admin" || p.role === "mentor")
            )
        );

        // 1) Admin/Mentor: dorong konten lokal yang belum pernah tersimpan ke Supabase
        if (isStaffSession && !contentsRes.error) {
          const dbTitles = new Set(
            (contentsRes.data || []).map((r: any) =>
              String(r.title).trim().toLowerCase()
            )
          );
          const pending = stateRef.current.explorerItems.filter(
            (i) =>
              i.type !== "Folder" &&
              !isLegacyDummyItem(i) &&
              !dbTitles.has(i.title.trim().toLowerCase())
          );
          for (const item of pending) {
            const key = item.title.trim().toLowerCase();
            const dbId = await pushContentToSupabase(
              item,
              stateRef.current.courseCurriculums?.[key] ?? null
            );
            if (dbId && dbId !== item.id) {
              setState((prev) => ({
                ...prev,
                explorerItems: prev.explorerItems.map((e) =>
                  e.id === item.id ? { ...e, id: dbId } : e
                ),
              }));
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

        if (Array.isArray(profilesRes.data)) {
          profilesRes.data.forEach((p: any) => {
            const rawAvatar =
              typeof p.avatar_url === "string" ? p.avatar_url.trim() : "";
            if (rawAvatar) {
              normalizeAvatarKeys({
                id: p.id,
                email: p.email,
                name: p.full_name || p.name,
                username: p.username,
              }).forEach((k) => {
                dbAvatarsFromTables[k] = rawAvatar;
              });
            }
            if (p.email) {
              combinedLearners.push({
                id: p.id || `prof-${p.email}`,
                name: p.full_name || p.email.split("@")[0],
                email: p.email,
                role: p.role || "learner",
                jobTitle: p.job_title || "Social Media Specialist",
                points: Number(p.total_points || 0),
                avatarUrl: rawAvatar || undefined,
              });
            }
          });
        }

        const proMapFromDb: Record<string, "PRO" | "Free"> = {};

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
            const isProInDb = Boolean(up.perks?.is_pro);
            const tierValue: "PRO" | "Free" = isProInDb ? "PRO" : "Free";
            const resolvedName =
              up.full_name ||
              up.name ||
              up.username ||
              (up.email ? up.email.split("@")[0] : "");
            if (resolvedName) {
              proMapFromDb[resolvedName] = tierValue;
              proMapFromDb[resolvedName.toLowerCase()] = tierValue;
            }
            if (up.email) {
              proMapFromDb[up.email.toLowerCase()] = tierValue;
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
                points: 0,
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

          // Strictly sync currentUser's learnerIsPro and learnerPoints from Supabase DB
          let activeUserPro = prev.learnerIsPro;
          let activeUserPoints = prev.learnerPoints;
          let activeLearnerEmail = "";
          let activeLearnerName = "";
          try {
            const cachedUserRaw = window.localStorage.getItem(
              "ruang_sosmed_session_user_v1"
            );
            if (cachedUserRaw) {
              const parsedU = JSON.parse(cachedUserRaw);
              const emailLower = parsedU?.email
                ? String(parsedU.email).toLowerCase().trim()
                : "";
              const nameStr = parsedU?.name ? String(parsedU.name).trim() : "";
              activeLearnerEmail = emailLower;
              activeLearnerName = nameStr;

              // Check points from Supabase profiles
              const matchProfile = Array.isArray(profilesRes.data)
                ? profilesRes.data.find(
                    (p: any) =>
                      (p.email && emailLower && p.email.toLowerCase().trim() === emailLower) ||
                      (p.full_name && nameStr && p.full_name.toLowerCase().trim() === nameStr.toLowerCase())
                  )
                : null;

              if (matchProfile && typeof matchProfile.total_points === "number") {
                activeUserPoints = Number(matchProfile.total_points);
              }

              const dbTier =
                (emailLower ? proMapFromDb[emailLower] : undefined) ??
                (nameStr
                  ? proMapFromDb[nameStr] ?? proMapFromDb[nameStr.toLowerCase()]
                  : undefined);

              if (dbTier !== undefined) {
                activeUserPro = dbTier === "PRO";
                if (nameStr) {
                  nextSubs[nameStr] = dbTier;
                  nextSubs[nameStr.toLowerCase()] = dbTier;
                }
                if (emailLower) {
                  nextSubs[emailLower] = dbTier;
                }
              } else {
                const fallbackTier =
                  (emailLower ? nextSubs[emailLower] : undefined) ??
                  (nameStr
                    ? nextSubs[nameStr] ?? nextSubs[nameStr.toLowerCase()]
                    : undefined);
                if (fallbackTier !== undefined) {
                  activeUserPro = fallbackTier === "PRO";
                }
              }
            }
          } catch {}

          const pointsChanged = prev.learnerPoints !== activeUserPoints;
          let nextNotifications = [...(prev.learnerNotifications ?? [])];
          if (pointsChanged && activeUserPoints > prev.learnerPoints) {
            const diff = activeUserPoints - prev.learnerPoints;
            const notifId = `pts-award-${Date.now()}-${activeUserPoints}`;
            const notifTitle = `⭐ +${diff} Poin Bintang Diterima!`;
            const notifBody = `Admin telah menambahkan ${diff} ★ pts ke akun Anda. Total saldo poin Anda sekarang ${activeUserPoints.toLocaleString()} pts.`;

            if (!nextNotifications.some((n) => n.id === notifId || (n.title === notifTitle && n.unread))) {
              nextNotifications = [
                {
                  id: notifId,
                  title: notifTitle,
                  body: notifBody,
                  time: "Baru saja",
                  unread: true,
                },
                ...nextNotifications,
              ];
            }

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

          learnerOnly.forEach((lrn) => {
            const initials =
              lrn.name
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "LN";

            if (
              !nextAssignees.some(
                (a) => a.name.toLowerCase() === lrn.name.toLowerCase()
              )
            ) {
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

            if (
              !nextLeaderboard.some(
                (l) => l.name.toLowerCase() === lrn.name.toLowerCase()
              )
            ) {
              nextLeaderboard.push({
                rank: nextLeaderboard.length + 1,
                name: lrn.name,
                role: lrn.jobTitle,
                points: lrn.points,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
              });
            }
          });

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

          // Ambil row __SYSTEM_REWARDS_CATALOG__ untuk sinkronisasi katalog hadiah lintas user
          const systemRewardsRow = Array.isArray(contentsRes.data)
            ? (contentsRes.data as any[]).find(
                (r) => r?.title === "__SYSTEM_REWARDS_CATALOG__"
              )
            : null;
          let remoteRewards: RewardItem[] | null = null;
          if (Array.isArray(systemRewardsRow?.settings_json?.rewards)) {
            remoteRewards = systemRewardsRow.settings_json.rewards;
          }

          // Ambil row __SYSTEM_CERTIFICATE_CONFIG__ untuk sinkronisasi desain sertifikat (global & per-kursus)
          const systemCertRow = Array.isArray(contentsRes.data)
            ? (contentsRes.data as any[]).find(
                (r) => r?.title === "__SYSTEM_CERTIFICATE_CONFIG__"
              )
            : null;
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
          const systemUserAvatarsRow = Array.isArray(contentsRes.data)
            ? (contentsRes.data as any[]).find(
                (r) => r?.title === "__SYSTEM_USER_AVATARS__"
              )
            : null;
          const remoteSystemAvatars: Record<string, string> =
            systemUserAvatarsRow?.settings_json?.userAvatars &&
            typeof systemUserAvatarsRow.settings_json.userAvatars === "object"
              ? (systemUserAvatarsRow.settings_json.userAvatars as Record<
                  string,
                  string
                >)
              : {};

          const systemLearnerProRow = Array.isArray(contentsRes.data)
            ? (contentsRes.data as any[]).find(
                (r) => r?.title === "__SYSTEM_LEARNER_PRO_CONFIG__"
              )
            : null;
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

          const systemMaintenanceRow = Array.isArray(contentsRes.data)
            ? (contentsRes.data as any[]).find(
                (r) => r?.title === "__SYSTEM_MAINTENANCE_CONFIG__"
              )
            : null;
          const remoteMaintenanceConfig: MaintenanceConfig | null =
            systemMaintenanceRow?.settings_json?.maintenanceConfig
              ? {
                  ...DEFAULT_MAINTENANCE_CONFIG,
                  ...systemMaintenanceRow.settings_json.maintenanceConfig,
                }
              : null;

          if (!contentsRes.error && Array.isArray(contentsRes.data)) {
            const dbRows = (contentsRes.data as any[]).filter(
              (r) =>
                r &&
                r.title &&
                r.title !== "__SYSTEM_REWARDS_CATALOG__" &&
                r.title !== "__SYSTEM_CERTIFICATE_CONFIG__" &&
                r.title !== "__SYSTEM_LEARNER_PRO_CONFIG__" &&
                r.title !== "__SYSTEM_MAINTENANCE_CONFIG__" &&
                r.title !== "__SYSTEM_USER_AVATARS__" &&
                !isLegacyDummyItem({ id: r.id, title: r.title })
            );
            const dbIds = new Set(dbRows.map((r) => r.id));
            const dbTitles = new Set(
              dbRows.map((r) => String(r.title).trim().toLowerCase())
            );

            const dbExplorer: ExplorerContentItem[] = dbRows.map((r) => {
              const type = fromDbContentType(r.type);
              const isFolder = type === "Folder";
              const cfg = isFolder
                ? {
                    colorHex: "#4F39F6",
                    bgTint: "rgba(79, 57, 246, 0.10)",
                    borderTint: "rgba(79, 57, 246, 0.22)",
                    description: "Folder materi pembelajaran",
                  }
                : CONTENT_TYPE_CONFIGS[type as ContentType];
              const meta = r.settings_json?.explorer_meta || {};
              const local = prev.explorerItems.find(
                (e) =>
                  e.id === r.id ||
                  e.title.trim().toLowerCase() ===
                    String(r.title).trim().toLowerCase()
              );
              const key = String(r.title).trim().toLowerCase();
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

              const cachedThumb =
                typeof window !== "undefined"
                  ? window.localStorage.getItem(`ruang_sosmed_thumb_${r.id}`) ||
                    window.localStorage.getItem(`ruang_sosmed_thumb_${key}`)
                  : null;

              if (Array.isArray(dbCurr) && dbCurr.length > 0) {
                const merged = overlayLocalProgress(dbCurr, localCurr);
                nextCurriculums[key] = merged;

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
              } else if (localCurr) {
                nextCurriculums[key] = localCurr;
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
                cohort: (() => {
                  const raw = r.cohort || meta.cohort || local?.cohort;
                  if (!raw || raw.toLowerCase() === "ruang sosmed core") {
                    return "Ruang Sosmed Class";
                  }
                  return raw;
                })(),
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
                accessCode:
                  meta.accessCode ||
                  local?.accessCode ||
                  (isFolder ? getDefaultFolderAccessCode(r.title) : undefined),
              };
            });

            // Item lokal yang belum pernah di-push (id non-UUID) tetap dipertahankan;
            // item ber-UUID yang tidak ada lagi di DB berarti sudah dihapus admin.
            const localOnly = nextExplorer.filter(
              (i) =>
                !dbIds.has(i.id) &&
                !dbTitles.has(i.title.trim().toLowerCase()) &&
                !isUuid(i.id)
            );
            nextExplorer = deduplicateExplorerItems([
              ...localOnly,
              ...dbExplorer,
            ]);
          } else {
            nextExplorer = deduplicateExplorerItems(nextExplorer);
          }

          const nextCatalog = syncLearnerCatalogWithExplorer(
            nextExplorer,
            prev.learnerAssignedItems,
            nextCurriculums
          );

          const firstKey = nextExplorer[0]?.title?.trim().toLowerCase();

          // Hindari trigger re-render / flicker jika data sama persis dengan state sekarang
          const proChanged = prev.learnerIsPro !== activeUserPro;
          const subsChanged =
            JSON.stringify(prev.learnerSubscriptions) !==
            JSON.stringify(nextSubs);
          const assigneesChanged =
            prev.assignees.length !== nextAssignees.length ||
            prev.assignees.some(
              (a, idx) =>
                a.id !== nextAssignees[idx]?.id ||
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
                pi.cohort !== ni.cohort ||
                pi.folderName !== ni.folderName ||
                pi.accessCode !== ni.accessCode ||
                pi.assignedCount !== ni.assignedCount ||
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

          // Jika ada pembaruan kurikulum materi, beri tahu learner via sistem Pemberitahuan (bell)
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
              const notifTitle = `📚 Materi Diperbarui: ${courseTitle}`;
              if (!nextNotifications.some((n) => n.title === notifTitle && n.unread)) {
                nextNotifications = [
                  {
                    id: `notif-curriculum-sync-${Date.now()}`,
                    title: notifTitle,
                    body: `Mentor telah memperbarui isi materi pada kelas "${courseTitle}". Silakan cek modul terbaru Anda.`,
                    time: "Baru saja",
                    unread: true,
                  },
                  ...nextNotifications,
                ];
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

          // 5) Sinkronisasi Inbox Pesan Mentor & Laporan Kendala dari Supabase
          let nextThreads = prev.discussionThreads ?? [];
          let threadsChanged = false;
          if (!inboxThreadsRes.error && Array.isArray(inboxThreadsRes.data)) {
            const threadMap = new Map<string, DiscussionThread>();
            nextThreads.forEach((t) => threadMap.set(t.id, t));

            (inboxThreadsRes.data as any[]).forEach((row) => {
              if (!row?.id) return;
              const remoteReplies = Array.isArray(row.replies) ? row.replies : [];
              const remoteParticipants = Array.isArray(row.participants)
                ? row.participants
                : [];
              const existing = threadMap.get(row.id);

              if (!existing) {
                threadMap.set(row.id, {
                  id: row.id,
                  chapterBadge: row.chapter_badge || "",
                  title: row.title || "",
                  excerpt: row.excerpt || "",
                  repliesCount: Number(row.replies_count ?? remoteReplies.length),
                  viewsCount: Number(row.views_count ?? 1),
                  lastReplyLabel: row.last_reply_label || "Baru saja",
                  participants: remoteParticipants,
                  replies: remoteReplies,
                });
              } else {
                // Gabungkan replies unik berdasarkan id agar tidak ada pesan lokal/remote yang hilang
                const replyIds = new Set(existing.replies.map((r) => r.id));
                const mergedReplies = [...existing.replies];
                remoteReplies.forEach((rr: any) => {
                  if (rr?.id && !replyIds.has(rr.id)) {
                    mergedReplies.push(rr);
                    replyIds.add(rr.id);
                  }
                });
                const lastReplyMsg =
                  mergedReplies[mergedReplies.length - 1]?.message ||
                  row.excerpt ||
                  existing.excerpt;
                threadMap.set(row.id, {
                  ...existing,
                  title: row.title || existing.title,
                  chapterBadge: row.chapter_badge || existing.chapterBadge,
                  excerpt: lastReplyMsg,
                  repliesCount: mergedReplies.length,
                  lastReplyLabel: row.last_reply_label || existing.lastReplyLabel,
                  participants:
                    remoteParticipants.length >= existing.participants.length
                      ? remoteParticipants
                      : existing.participants,
                  replies: mergedReplies,
                });
              }
            });

            const candidateThreads = Array.from(threadMap.values());
            if (
              JSON.stringify(candidateThreads) !==
              JSON.stringify(prev.discussionThreads ?? [])
            ) {
              nextThreads = candidateThreads;
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

          if (
            !proChanged &&
            !subsChanged &&
            !assigneesChanged &&
            !lbChanged &&
            !explorerChanged &&
            !catalogChanged &&
            !curriculumsChanged &&
            !collabsChanged &&
            !reviewsChanged &&
            !pointsChanged &&
            !rewardsChanged &&
            !certChanged &&
            !proConfigChanged &&
            !maintenanceConfigChanged &&
            !threadsChanged &&
            !issuesChanged &&
            !avatarsChanged
          ) {
            // Data tidak berubah: pertahankan referensi state sebelumnya agar tidak ada glitch / flicker cover
            return prev;
          }

          return {
            ...prev,
            userAvatars: nextUserAvatars,
            rewardsCatalog: nextRewards,
            certificateConfig: nextCertConfig,
            courseCertificateConfigs: nextCourseCertConfigs,
            learnerProConfig: nextLearnerProConfig,
            maintenanceConfig: nextMaintenanceConfig,
            learnerPoints: activeUserPoints,
            learnerNotifications: nextNotifications,
            learnerIsPro: activeUserPro,
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
      }
    };

    void syncRegisteredLearners();

    // Real-time subscription + lightweight 3s polling & window focus sync so Admin <-> Learner tier changes sync automatically
    const intervalId = window.setInterval(() => {
      void syncRegisteredLearners();
    }, 3000);

    const handleWindowFocus = () => {
      void syncRegisteredLearners();
    };
    window.addEventListener("focus", handleWindowFocus);

    const handlePointsAwarded = () => {
      void syncRegisteredLearners();
    };
    window.addEventListener("ruang_sosmed_points_awarded", handlePointsAwarded);
    window.addEventListener("ruang_sosmed_profile_updated", handlePointsAwarded);

    const realtimeChannel = supabase
      .channel("realtime-user-profiles-pro")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        () => {
          void syncRegisteredLearners();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void syncRegisteredLearners();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contents" },
        () => {
          void syncRegisteredLearners();
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("ruang_sosmed_points_awarded", handlePointsAwarded);
      window.removeEventListener("ruang_sosmed_profile_updated", handlePointsAwarded);
      void supabase.removeChannel(realtimeChannel);
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
      accessCode?: string
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
      const normalizedAccessCode = isFolder
        ? (
            accessCode?.trim() ||
            existingSameTitle?.accessCode ||
            getDefaultFolderAccessCode(title)
          )
            .toUpperCase()
            .replace(/\s+/g, "-")
        : existingSameTitle?.accessCode;

      const newExplorerItem: ExplorerContentItem = {
        id: existingSameTitle?.id || (isFolder ? `folder-${nowId}` : `exp-${nowId}`),
        title,
        type,
        assignedCount: inheritedLearners.length,
        assignedLearners: inheritedLearners,
        category: isFolder ? "Folder" : "Social Media Strategy",
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
        description: finalDesc,
        cohort: parentFolder?.cohort || cohort || existingSameTitle?.cohort,
        folderName: effectiveFolderName,
        accessCode: normalizedAccessCode,
      };

      const newCatalogItem: LearnerAssignedItem | null = isFolder
        ? null
        : {
            id: `lc-${nowId}`,
            title,
            type: type as ContentType,
            urgencyBadge: urgency === "Urgent" ? "Urgent" : "Due in 3 days",
            isUrgentRed: urgency === "Urgent",
            progressPercent: 0,
            pointsReward: 100,
            duration: type === "Quiz" ? "15 Mins" : "2 Hours",
            skillTags: [type, "Ruang Sosmed 2.0", "New Release"],
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
            console.warn(
              "[RuangSosmed] Konten hanya tersimpan lokal. Pastikan akun admin login via Supabase dengan role admin/mentor."
            );
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
          learnerNotifications: [
            {
              id: `notif-${nowId}`,
              title: `New ${type} Published in Catalog`,
              body: `Mentor published "${title}" in Ruang Sosmed 2.0.`,
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });
    },
    [state.versions.length]
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
            console.warn(
              "[RuangSosmed] Gagal sinkronisasi update folder ke Supabase:",
              err
            );
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
    if (isSupabaseConfigured && targetForDb) {
      void (async () => {
        try {
          if (isUuid(targetForDb.id)) {
            await supabase.from("contents").delete().eq("id", targetForDb.id);
          } else {
            await supabase
              .from("contents")
              .delete()
              .eq("title", targetForDb.title);
          }
        } catch {}
      })();
    }
    setState((prev) => {
      const target = prev.explorerItems.find((i) => i.id === id);
      const nextExplorer = prev.explorerItems.filter((i) => i.id !== id);
      const nextCurriculums = { ...(prev.courseCurriculums || {}) };
      if (target) {
        const key = target.title.trim().toLowerCase();
        delete nextCurriculums[key];
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(`ruang_sosmed_curriculum_${key}`);
          } catch {}
        }
      }
      const nextCatalog = syncLearnerCatalogWithExplorer(
        nextExplorer,
        prev.learnerAssignedItems.filter(
          (l) =>
            !target ||
            l.title.trim().toLowerCase() !== target.title.trim().toLowerCase()
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
          console.warn("[RuangSosmed] Gagal update status arsip di Supabase:", e);
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
          console.warn("[RuangSosmed] Gagal update share status di Supabase:", e);
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
      };

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
        } catch {}
      }

      setState((prev) => {
        const nextExplorer = prev.explorerItems.map((item) =>
          item.id === target.id ? updatedItem : item
        );
        const nextCatalog = prev.learnerAssignedItems.map((item) =>
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
              }
            : item
        );

        let nextCurriculums = prev.courseCurriculums;
        if (isRenamed && prev.courseCurriculums?.[oldKey]) {
          nextCurriculums = { ...prev.courseCurriculums };
          nextCurriculums[newKey] = nextCurriculums[oldKey];
          delete nextCurriculums[oldKey];
        }

        return {
          ...prev,
          explorerItems: nextExplorer,
          learnerAssignedItems: nextCatalog,
          courseCurriculums: nextCurriculums,
        };
      });

      const currentCurr =
        stateRef.current.courseCurriculums?.[newKey] ??
        stateRef.current.courseCurriculums?.[oldKey] ??
        null;
      void pushContentToSupabase(updatedItem, currentCurr);
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
        const newAssignedCard: LearnerAssignedItem = {
          id: `lc-assigned-${nowId}`,
          title: contentItem.title,
          type: validType,
          urgencyBadge:
            contentItem.urgency === "Urgent" ? "Urgent" : "Due in 3 days",
          isUrgentRed: contentItem.urgency === "Urgent",
          progressPercent: 0, // Initial status: Not Started (0%)
          pointsReward: 100,
          duration: "2 Hours",
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
          learnerNotifications: [
            {
              id: `notif-assign-${nowId}`,
              title: `New Assignment: ${contentItem.title}`,
              body: `Mentor assigned "${contentItem.title}" to you (Not Started • 0% • Due ${dueDate}).`,
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
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
    []
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
          message: "Masukkan kode akses folder terlebih dahulu.",
        };
      }

      const matchedFolder = stateRef.current.explorerItems.find((item) => {
        if (item.type !== "Folder" || item.isArchived) return false;
        const folderCode = (
          item.accessCode || getDefaultFolderAccessCode(item.title)
        )
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "-");
        return folderCode === cleanCode;
      });

      if (!matchedFolder) {
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

      const folderTitleLower = matchedFolder.title.trim().toLowerCase();
      const childCourses = stateRef.current.explorerItems.filter(
        (item) =>
          item.type !== "Folder" &&
          !item.isArchived &&
          item.folderName?.trim().toLowerCase() === folderTitleLower
      );

      const itemsToPush: ExplorerContentItem[] = [];
      const lockExpires = Date.now() + 15000;

      [matchedFolder, ...childCourses].forEach((entry) => {
        const nextList = Array.from(
          new Set([...(entry.assignedLearners || []), ...learnerTokens])
        );
        const updated: ExplorerContentItem = {
          ...entry,
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

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
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
          (a) => a.name.toLowerCase() === displayName.toLowerCase()
        )
          ? prev.assignees
          : [
              {
                id: learner.id || `asg-code-${Date.now()}`,
                name: displayName,
                initials,
                avatarBg: "#EEF2FF",
                avatarText: "#4F39F6",
                roleBadge: "Folder Code",
                completedChapters: 0,
                totalChapters: Math.max(
                  1,
                  prev.courseSections.flatMap((s) => s.chapters).length
                ),
                assignedDate: "Joined via Code",
              },
              ...prev.assignees,
            ];

        return {
          ...prev,
          assignees: nextAssignees,
          explorerItems: prev.explorerItems.map((exp) => {
            const updatedMatch = itemsToPush.find(
              (u) =>
                u.id === exp.id ||
                u.title.trim().toLowerCase() === exp.title.trim().toLowerCase()
            );
            return updatedMatch ? updatedMatch : exp;
          }),
          learnerNotifications: [
            {
              id: `notif-folder-code-${Date.now()}`,
              title: `🔓 Akses Folder "${matchedFolder.title}" Terbuka`,
              body: `Berhasil bergabung ke seri folder "${matchedFolder.title}" (${childCourses.length} materi) menggunakan kode ${cleanCode}.`,
              time: "Baru saja",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });

      itemsToPush.forEach((pushedItem) => {
        void pushContentToSupabase(
          pushedItem,
          stateRef.current.courseCurriculums?.[
            pushedItem.title.trim().toLowerCase()
          ] ?? null
        );
      });

      return {
        success: true,
        folderTitle: matchedFolder.title,
        courseCount: childCourses.length,
        message: `Berhasil masuk folder "${matchedFolder.title}" (${childCourses.length} materi terbuka)!`,
      };
    },
    []
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
    },
    []
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

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      learnerNotifications: prev.learnerNotifications.map((n) => ({
        ...n,
        unread: false,
      })),
    }));
  }, []);

  const addLearnerNotification = useCallback(
    (notification: {
      title: string;
      body: string;
      time?: string;
      unread?: boolean;
    }) => {
      setState((prev) => ({
        ...prev,
        learnerNotifications: [
          {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: notification.title,
            body: notification.body,
            time: notification.time || "Baru saja",
            unread: notification.unread ?? true,
          },
          ...prev.learnerNotifications,
        ],
      }));
    },
    []
  );

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
              console.warn("[RuangSosmed] Gagal hapus member dari DB:", e);
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
            console.warn(
              "[RuangSosmed] Failed to sync review to Supabase contents:",
              err
            );
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
    async (isPro: boolean, studentName?: string, studentEmail?: string) => {
      if (!isSupabaseConfigured) return;
      try {
        const cleanEmail = studentEmail?.trim().toLowerCase();
        const cleanName = studentName?.trim();

        if (cleanEmail) {
          const { data } = await supabase
            .from("user_profiles")
            .select("username, perks")
            .ilike("email", cleanEmail);

          if (Array.isArray(data) && data.length > 0) {
            for (const row of data) {
              await supabase
                .from("user_profiles")
                .update({
                  perks: { ...(row.perks || {}), is_pro: isPro },
                  updated_at: new Date().toISOString(),
                })
                .eq("username", row.username);
            }
            return;
          }
        }

        if (cleanName) {
          const { data } = await supabase
            .from("user_profiles")
            .select("username, perks")
            .ilike("name", cleanName);

          if (Array.isArray(data) && data.length > 0) {
            for (const row of data) {
              await supabase
                .from("user_profiles")
                .update({
                  perks: { ...(row.perks || {}), is_pro: isPro },
                  updated_at: new Date().toISOString(),
                })
                .eq("username", row.username);
            }
            return;
          }
        }

        // If user only had a `profiles` row, create/upsert a matching `user_profiles` row
        if (cleanEmail || cleanName) {
          const fallbackUsername =
            (cleanEmail ? cleanEmail.split("@")[0] : cleanName || "learner")
              .toLowerCase()
              .replace(/[^a-z0-9._-]/g, "_") + "_pro";
          await supabase.from("user_profiles").upsert(
            {
              username: fallbackUsername,
              email: cleanEmail || null,
              name: cleanName || cleanEmail || "Learner",
              role: "learner",
              perks: { is_pro: isPro },
              updated_at: new Date().toISOString(),
            },
            { onConflict: "username" }
          );
        }
      } catch {
        // Ignore network errors
      }
    },
    []
  );

  const setLearnerProStatus = useCallback(
    (isPro: boolean, user?: { name?: string; email?: string } | null) => {
      let targetName = user?.name?.trim() || "";
      let targetEmail = user?.email?.trim().toLowerCase() || "";

      if (!targetName && typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("ruang_sosmed_session_user_v1");
          if (raw) {
            const parsed = JSON.parse(raw);
            targetName = parsed?.name || "";
            targetEmail = (parsed?.email || "").toLowerCase();
          }
        } catch {}
      }

      void persistProTierToSupabase(isPro, targetName, targetEmail);

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
          learnerNotifications: [
            {
              id: `notif-pro-${Date.now()}`,
              title: isPro
                ? "⚡ Learner PRO Membership Activated!"
                : "Subscription Switched to Free Tier",
              body: isPro
                ? "All 7 Premium features (Advance Courses, Resource Downloads, Agency Wiki & SOPs, HD Certificates, 1-on-1 Assignment Grading, Chapter Discussion Q&A, Personal Notes & Favorites) are now unlocked."
                : "Your account is currently on the Free Learner plan.",
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });
    },
    [persistProTierToSupabase]
  );

  const toggleStudentProByAdmin = useCallback(
    (studentName: string, studentEmail?: string) => {
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
          learnerIsPro: isNextPro,
          learnerSubscriptions: nextMap,
          learnerNotifications: [
            {
              id: `notif-admin-pro-${Date.now()}`,
              title: isNextPro
                ? `⚡ Admin Activated Learner PRO for ${studentName}`
                : `Subscription Updated to Free Tier (${studentName})`,
              body: isNextPro
                ? "Admin has unlocked all 7 Learner PRO features for your account."
                : "Admin switched your account tier to Free.",
              time: "Just now",
              unread: true,
            },
            ...prev.learnerNotifications,
          ],
        };
      });
    },
    [persistProTierToSupabase]
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

      // 1. Update localStorage immediate cache
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_role_override_${cleanKey}`,
            nextRole
          );
          const rawSession = window.localStorage.getItem(
            "ruang_sosmed_session_user_v1"
          );
          if (rawSession) {
            const s = JSON.parse(rawSession);
            const sEmail = (s.email || "").toLowerCase().trim();
            const sName = (s.name || "").toLowerCase().trim();
            const isMatch =
              (sEmail && (sEmail === cleanKey || cleanKey.includes(sEmail))) ||
              (sName && (sName === cleanKey || cleanKey.includes(sName) || sName.includes(cleanKey)));

            if (isMatch) {
              s.role = nextRole === "Learner" ? "learner" : "admin";
              window.localStorage.setItem(
                "ruang_sosmed_session_user_v1",
                JSON.stringify(s)
              );
              if (nextRole === "Learner") {
                window.localStorage.setItem("ruang_sosmed_role_mode_v1", "learner");
              }
              window.dispatchEvent(new Event("storage"));
              window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
            }
          }
        } catch {}
      }

      // 2. Update store state (workspaceCollaborators & assignees)
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

      // 3. Persist to Supabase `profiles` & `user_profiles`
      if (isSupabaseConfigured) {
        try {
          const dbRole = nextRole.toLowerCase();
          if (isUuid(emailOrId)) {
            await supabase
              .from("profiles")
              .update({ role: dbRole })
              .eq("id", emailOrId);
          } else {
            await supabase
              .from("profiles")
              .update({ role: dbRole })
              .ilike("email", cleanKey);
          }

          // Also update user_profiles if available
          try {
            await supabase
              .from("user_profiles")
              .update({ role: dbRole })
              .ilike("email", cleanKey);
          } catch {}
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

      // Update Supabase profiles total_points if user is authenticated
      if (isSupabaseConfigured && (learnerEmail || learnerName)) {
        void (async () => {
          try {
            if (learnerEmail) {
              await supabase
                .from("profiles")
                .update({ total_points: newPoints })
                .ilike("email", learnerEmail);
            }
          } catch {}
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
          rewardsCatalog: nextCatalog,
          claimedRewards: [claimRecord, ...(prev.claimedRewards ?? [])],
          leaderboard: nextLeaderboard,
          learnerNotifications: [notif, ...prev.learnerNotifications],
        };
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
  const addCohortProject = useCallback(
    (name: string, color = "#4F39F6", description?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setState((prev) => {
        if (
          prev.cohortProjects.some(
            (c) => c.name.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          return prev;
        }
        const newCohort: CohortProjectItem = {
          id: `cohort-${Date.now()}`,
          name: trimmed,
          color,
          description: description || "Custom Cohort / Track",
        };
        return {
          ...prev,
          cohortProjects: [...prev.cohortProjects, newCohort],
        };
      });
    },
    []
  );

  const updateCohortProject = useCallback(
    (
      idOrName: string,
      updates: { name?: string; color?: string; description?: string }
    ) => {
      setState((prev) => {
        const nextCohorts = prev.cohortProjects.map((c) => {
          if (c.id === idOrName || c.name === idOrName) {
            return {
              ...c,
              name: updates.name?.trim() || c.name,
              color: updates.color || c.color,
              description:
                updates.description !== undefined
                  ? updates.description
                  : c.description,
            };
          }
          return c;
        });
        return {
          ...prev,
          cohortProjects: nextCohorts,
        };
      });
    },
    []
  );

  const deleteCohortProject = useCallback((idOrName: string) => {
    setState((prev) => {
      const nextCohorts = prev.cohortProjects.filter(
        (c) => c.id !== idOrName && c.name !== idOrName
      );
      return {
        ...prev,
        cohortProjects:
          nextCohorts.length > 0 ? nextCohorts : INITIAL_COHORT_PROJECTS,
      };
    });
  }, []);

  const getCourseCurriculum = useCallback(
    (courseTitle: string): CourseSectionAccordion[] | null => {
      const key = courseTitle.toLowerCase().trim();
      const inStore = state.courseCurriculums?.[key] || null;

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
    [state.courseCurriculums]
  );

  const saveCourseCurriculumLive = useCallback(
    (courseTitle: string, sections: CourseSectionAccordion[]) => {
      const key = courseTitle.toLowerCase().trim();
      if (!key) return;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `ruang_sosmed_curriculum_${key}`,
            JSON.stringify(sections)
          );
        } catch {}
      }
      setState((prev) => {
        const updateNotifTitle = `📚 Materi Diperbarui: ${courseTitle}`;
        const updateNotif: LearnerNotification = {
          id: `notif-curriculum-live-${Date.now()}`,
          title: updateNotifTitle,
          body: `Mentor telah memperbarui isi materi pada kelas "${courseTitle}". Buka My Learning untuk mempelajari modul terbaru.`,
          time: "Baru saja",
          unread: true,
        };
        const filteredNotifs = (prev.learnerNotifications || []).filter(
          (n) => n.title !== updateNotifTitle
        );

        return {
          ...prev,
          courseSections:
            key === "fundamental social media specialist"
              ? sections
              : prev.courseSections,
          courseCurriculums: {
            ...(prev.courseCurriculums || {}),
            [key]: sections,
          },
          learnerNotifications: [updateNotif, ...filteredNotifs],
        };
      });

      // Sinkronkan perubahan kurikulum (termasuk videoUrl & hide/show) ke Supabase HANYA jika course sudah terdaftar di explorerItems
      const target = stateRef.current.explorerItems.find(
        (e) => e.title.trim().toLowerCase() === key
      );
      if (target) {
        if (curriculumPushTimer.current) {
          clearTimeout(curriculumPushTimer.current);
        }
        curriculumPushTimer.current = setTimeout(() => {
          void pushContentToSupabase(target, sections).then((dbId) => {
            if (dbId && dbId !== target.id) {
              setState((prev) => ({
                ...prev,
                explorerItems: prev.explorerItems.map((e) =>
                  e.id === target.id ? { ...e, id: dbId } : e
                ),
              }));
            }
          });
        }, 800);
      }
    },
    []
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

  const resolveUserAvatar = useCallback(
    (...identifiers: (string | undefined | null)[]): string => {
      const map = state.userAvatars || stateRef.current.userAvatars || {};
      for (const rawId of identifiers) {
        if (!rawId) continue;
        const clean = rawId.trim().toLowerCase().replace(/\s+/g, " ");
        if (!clean) continue;
        if (map[clean]) return map[clean];
        const noAt = clean.replace(/^@+/, "");
        if (map[noAt]) return map[noAt];
        if (map[`@${noAt}`]) return map[`@${noAt}`];
        const parts = clean.split(" ").filter(Boolean);
        if (parts.length >= 3) {
          const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
          if (map[firstLast]) return map[firstLast];
        }
      }
      return "";
    },
    [state.userAvatars]
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
        void syncUserAvatarsToSupabase(mergedMap);
      }
    },
    []
  );

  const value: RuangSosmedStoreContextValue = {
    ...state,
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
    reportContentIssueFromLearner,
    toggleReportedIssueStatus,
    setTodos,
    restoreContentVersion,
    markAllNotificationsRead,
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
    toggleStudentProByAdmin,
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
    updateUserAvatarInStore,
    resolveUserAvatar,
    unassignLearnerFromContent,
    redeemFolderAccessCode,
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
