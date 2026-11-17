// =============================================================================
// RUANG SOSMED 2.0 LMS — "rs-learning-26" ARCHITECTURE BRIDGE & UTILITIES
// File: src/lib/supabase/rs-learning-26-bridge.ts
// Ports database helpers, asset resolvers, image compression, lesson notes,
// lesson reviews, and seed catalog data from `dinurpradipta12/rs-learning-26`.
// =============================================================================

import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from "@/lib/supabase/client";
import type {
  RsCourseRow,
  RsLessonRow,
  RsLessonAssetRow,
  RsLessonReviewRow,
  RsLessonNoteRow,
  RsForumThreadRow,
  RsForumReplyRow,
} from "@/lib/supabase/database.types";

// -----------------------------------------------------------------------------
// 1. PORTED TYPES FROM `rs-learning-26`
// -----------------------------------------------------------------------------

export interface RsLessonAssetItem {
  assetKey: string;
  lessonKey: string;
  title: string;
  type: "pdf" | "sheet" | "zip" | "srt" | "file" | "link" | string;
  note: string;
  href: string;
  links: { label: string; href: string }[];
  externalUrl?: string;
  storagePath?: string;
  sortOrder: number;
}

export interface RsLessonItem {
  id: string; // lesson_key (`content-planning`, `asset-reels`, etc.)
  courseKey: string;
  sortOrder: number;
  title: string;
  duration: string;
  meta: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  comingSoon?: boolean;
  availableAt?: string;
  linkedChapterId?: string;
  stats: string[];
  assets: RsLessonAssetItem[];
}

export interface RsLessonReviewItem {
  id: string;
  lessonKey: string;
  reviewerName: string;
  reviewerUsername?: string | null;
  rating: number;
  feedback: string;
  createdAt: string;
}

export interface RsLessonNoteItem {
  username: string;
  lessonKey: string;
  courseKey: string;
  content: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 2. PORTED HELPER UTILITIES FROM `rs-learning-26`
// -----------------------------------------------------------------------------

/**
 * Generates an inline downloadable data URL for placeholder/seeded lesson assets
 * when no external URL or Supabase Storage object is attached.
 */
export function assetDownloadUrl(title: string, type: string): string {
  const content = [
    `RUANG SOSMED 2.0 — LEARNING ASSET PACK`,
    `=======================================`,
    `Asset Title : ${title}`,
    `Asset Format: ${type.toUpperCase()}`,
    `Downloaded  : ${new Date().toISOString()}`,
    ``,
    `This learning resource is provided by Ruang Sosmed 2.0 Learning Center.`,
  ].join("\n");
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * Ported client-side image compression utility from `rs-learning-26`
 * (`compressImage` in `src/App.tsx`) to reduce storage & egress before upload.
 */
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<File> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    let { width, height } = img;
    if (width <= maxDim && height <= maxDim && file.size < 300 * 1024) {
      return file;
    }

    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

export function resolveLessonAssetHref(
  asset: Pick<RsLessonAssetRow, "storage_path" | "external_url" | "title" | "type">
): string {
  if (asset.external_url) {
    return asset.external_url;
  }
  if (asset.storage_path) {
    return supabase.storage
      .from(STORAGE_BUCKETS.LESSON_ASSETS)
      .getPublicUrl(asset.storage_path).data.publicUrl;
  }
  return assetDownloadUrl(asset.title, asset.type);
}

function resolveAssetLinkToken(
  token: string,
  fallbackLabel: string,
  index: number
): { label: string; href: string } | null {
  const trimmedToken = token.trim();
  if (!trimmedToken) return null;

  const [labelPart, hrefPart] = trimmedToken.includes("::")
    ? trimmedToken.split("::").map((part) => part.trim())
    : ["", trimmedToken];

  if (!hrefPart) return null;

  if (hrefPart.startsWith("storage:")) {
    const storagePath = hrefPart.replace(/^storage:/, "");
    return {
      label: labelPart || `${fallbackLabel} ${index + 1}`,
      href: supabase.storage
        .from(STORAGE_BUCKETS.LESSON_ASSETS)
        .getPublicUrl(storagePath).data.publicUrl,
    };
  }

  return {
    label: labelPart || `${fallbackLabel} ${index + 1}`,
    href: hrefPart,
  };
}

export function resolveLessonAssetLinks(
  asset: Pick<RsLessonAssetRow, "storage_path" | "external_url" | "title" | "type">
): { label: string; href: string }[] {
  const rawLinkTokens = [
    ...(asset.storage_path ? [`storage:${asset.storage_path}`] : []),
    ...(asset.external_url
      ? asset.external_url
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : []),
  ];

  const links = rawLinkTokens
    .map((token, index) => resolveAssetLinkToken(token, "Download", index))
    .filter((link): link is { label: string; href: string } => Boolean(link));

  if (links.length > 0) return links;

  return [{ label: "Download", href: assetDownloadUrl(asset.title, asset.type) }];
}

export function mapLessonRowsToLessons(
  lessonRows: RsLessonRow[],
  assetRows: RsLessonAssetRow[]
): RsLessonItem[] {
  const assetsByLesson = new Map<string, RsLessonAssetItem[]>();

  assetRows.forEach((assetRow) => {
    const lessonAssets = assetsByLesson.get(assetRow.lesson_key) ?? [];
    const assetLinks = resolveLessonAssetLinks(assetRow);
    lessonAssets.push({
      assetKey: assetRow.asset_key,
      lessonKey: assetRow.lesson_key,
      title: assetRow.title,
      type: assetRow.type,
      note: assetRow.note,
      href: assetLinks[0]?.href ?? resolveLessonAssetHref(assetRow),
      links: assetLinks,
      externalUrl: assetRow.external_url ?? undefined,
      storagePath: assetRow.storage_path ?? undefined,
      sortOrder: assetRow.sort_order,
    });
    assetsByLesson.set(assetRow.lesson_key, lessonAssets);
  });

  return [...lessonRows]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((lessonRow) => ({
      id: lessonRow.lesson_key,
      courseKey: lessonRow.course_key || "lms",
      sortOrder: lessonRow.sort_order,
      title: lessonRow.title,
      duration: lessonRow.duration,
      meta: lessonRow.meta,
      description: lessonRow.description,
      videoUrl: lessonRow.video_url,
      thumbnailUrl: lessonRow.thumbnail_url ?? undefined,
      comingSoon: lessonRow.coming_soon ?? false,
      availableAt: lessonRow.available_at ?? undefined,
      linkedChapterId: lessonRow.linked_chapter_id ?? undefined,
      stats: [],
      assets:
        assetsByLesson
          .get(lessonRow.lesson_key)
          ?.sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    }));
}

// -----------------------------------------------------------------------------
// 3. SEEDED CATALOG & LESSONS FROM `rs-learning-26`
// -----------------------------------------------------------------------------

export const RS_LEARNING_26_COURSES_SEED: RsCourseRow[] = [
  {
    key: "lms",
    title: "Fundamental Social Media Specialist",
    subtitle: "Batch Aktif",
    description:
      "Pelajari dasar strategi konten, cara kerja algoritma, penyusunan content pillar, produksi Reels, hingga membaca insight mingguan secara terstruktur.",
    level: "Beginner – Intermediate",
    thumbnail_url: "",
    lesson_count: 5,
    sort_order: 1,
    status: "open",
    linked_content_id: "item-course-sm101",
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    key: "advance-sm",
    title: "Advance Social Media Strategy",
    subtitle: "Next Level",
    description:
      "Pendalaman strategi pertumbuhan akun, eksperimen kreatif, funnel konten, analisis kompetitor, dan optimasi konversi organik untuk brand maupun kreator.",
    level: "Intermediate – Advanced",
    thumbnail_url: "",
    lesson_count: 6,
    sort_order: 2,
    status: "open",
    linked_content_id: "item-course-reels",
    created_at: "2026-10-05T08:00:00Z",
  },
  {
    key: "content-system",
    title: "Content System & Workflow",
    subtitle: "Production System",
    description:
      "Bangun sistem produksi konten dari riset ide, bank hook, penjadwalan, delegasi tim, hingga template SOP agar publikasi konsisten tanpa burnout.",
    level: "All Level",
    thumbnail_url: "",
    lesson_count: 5,
    sort_order: 3,
    status: "open",
    linked_content_id: "item-wiki-hooks",
    created_at: "2026-10-10T08:00:00Z",
  },
];

export const RS_LEARNING_26_LESSONS_SEED: RsLessonItem[] = [
  {
    id: "content-planning",
    courseKey: "lms",
    sortOrder: 1,
    title: "01: learn the basics",
    duration: "18 menit",
    meta: "video class",
    description:
      "Membahas cara menyusun ide konten, menentukan angle, dan membangun ritme posting yang konsisten.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    linkedChapterId: "cch-1",
    stats: ["4.9 rating", "Batch Oktober 2026", "18m video duration"],
    assets: [
      {
        assetKey: "asset-content-brief",
        lessonKey: "content-planning",
        title: "content brief template",
        type: "pdf",
        note: "Outline singkat untuk content planning mingguan",
        href: assetDownloadUrl("content brief template", "pdf"),
        links: [{ label: "Download PDF", href: assetDownloadUrl("content brief template", "pdf") }],
        sortOrder: 1,
      },
      {
        assetKey: "asset-hook-bank",
        lessonKey: "content-planning",
        title: "hook bank sheet",
        type: "sheet",
        note: "List hook 3 detik pertama yang siap dipakai",
        href: assetDownloadUrl("hook bank sheet", "sheet"),
        links: [{ label: "Download Sheet", href: assetDownloadUrl("hook bank sheet", "sheet") }],
        sortOrder: 2,
      },
    ],
  },
  {
    id: "asset-reels",
    courseKey: "lms",
    sortOrder: 2,
    title: "02: content asset workflow",
    duration: "12 file",
    meta: "download asset",
    description:
      "Menjelaskan struktur asset kelas yang dipakai untuk Reels, termasuk cover visual, subtitle preset, dan format file.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    linkedChapterId: "cch-2",
    stats: ["Downloadable assets", "Reels Production Kit"],
    assets: [
      {
        assetKey: "asset-reel-pack",
        lessonKey: "asset-reels",
        title: "reel cover pack",
        type: "zip",
        note: "Cover visual safe-zone siap edit",
        href: assetDownloadUrl("reel cover pack", "zip"),
        links: [{ label: "Download ZIP", href: assetDownloadUrl("reel cover pack", "zip") }],
        sortOrder: 1,
      },
      {
        assetKey: "asset-subtitle-preset",
        lessonKey: "asset-reels",
        title: "subtitle preset",
        type: "srt",
        note: "Format subtitle dasar retensi tinggi",
        href: assetDownloadUrl("subtitle preset", "srt"),
        links: [{ label: "Download SRT", href: assetDownloadUrl("subtitle preset", "srt") }],
        sortOrder: 2,
      },
    ],
  },
  {
    id: "weekly-review",
    courseKey: "lms",
    sortOrder: 3,
    title: "03: weekly performance review",
    duration: "9 menit",
    meta: "case study",
    description:
      "Menunjukkan cara membaca insight mingguan, menemukan pola performa, dan menentukan next action.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    linkedChapterId: "cch-3",
    stats: ["Weekly review", "Mentor guided"],
    assets: [
      {
        assetKey: "asset-insight-sheet",
        lessonKey: "weekly-review",
        title: "insight tracking sheet",
        type: "sheet",
        note: "Rekap performa mingguan & matriks evaluasi",
        href: assetDownloadUrl("insight tracking sheet", "sheet"),
        links: [{ label: "Download Sheet", href: assetDownloadUrl("insight tracking sheet", "sheet") }],
        sortOrder: 1,
      },
    ],
  },
  {
    id: "practice-recap",
    courseKey: "lms",
    sortOrder: 4,
    title: "04: practice and recap",
    duration: "11 menit",
    meta: "exercise",
    description:
      "Latihan penerapan materi sebelumnya lalu merangkum poin penting agar mudah diulang kembali.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    linkedChapterId: "cch-4",
    stats: ["Practice round", "Recap notes"],
    assets: [
      {
        assetKey: "asset-practice-checklist",
        lessonKey: "practice-recap",
        title: "practice checklist",
        type: "pdf",
        note: "Panduan latihan mandiri sebelum audit akun",
        href: assetDownloadUrl("practice checklist", "pdf"),
        links: [{ label: "Download PDF", href: assetDownloadUrl("practice checklist", "pdf") }],
        sortOrder: 1,
      },
    ],
  },
  {
    id: "platform-shift",
    courseKey: "lms",
    sortOrder: 5,
    title: "05: platform trend shift",
    duration: "14 menit",
    meta: "trend update",
    description:
      "Membahas perubahan pola konsumsi konten di platform dan implikasinya ke strategi berikutnya.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    linkedChapterId: "cch-6",
    stats: ["Trend update", "Platform analysis"],
    assets: [
      {
        assetKey: "asset-trend-notes",
        lessonKey: "platform-shift",
        title: "trend notes",
        type: "pdf",
        note: "Catatan update tren algoritma platform terbaru",
        href: assetDownloadUrl("trend notes", "pdf"),
        links: [{ label: "Download PDF", href: assetDownloadUrl("trend notes", "pdf") }],
        sortOrder: 1,
      },
    ],
  },
];

export const RS_LEARNING_26_REVIEWS_SEED: RsLessonReviewItem[] = [
  {
    id: "rev-seed-1",
    lessonKey: "content-planning",
    reviewerName: "Nisa Amelia",
    reviewerUsername: "nisa",
    rating: 5,
    feedback:
      "Materinya jelas, contoh yang dipakai gampang diikuti untuk menyusun content pillar dan jadwal mingguan.",
    createdAt: "2026-10-24T10:15:00Z",
  },
  {
    id: "rev-seed-2",
    lessonKey: "content-planning",
    reviewerName: "Dimas Prakoso",
    reviewerUsername: "dimas",
    rating: 5,
    feedback:
      "Alur videonya enak dan template content brief langsung kepakai di tim sosmed kami.",
    createdAt: "2026-10-25T14:30:00Z",
  },
  {
    id: "rev-seed-3",
    lessonKey: "asset-reels",
    reviewerName: "Siti Sarah",
    reviewerUsername: "siti",
    rating: 5,
    feedback:
      "Preset subtitle dan reel cover pack sangat menghemat waktu editing harian.",
    createdAt: "2026-10-26T09:20:00Z",
  },
];

// -----------------------------------------------------------------------------
// 4. SUPABASE DATA FETCH & MUTATION SERVICES FOR `rs-learning-26` TABLES
// -----------------------------------------------------------------------------

export const rsLearning26BridgeService = {
  /**
   * Fetch all lessons and their downloadable assets from `public.lessons` & `public.lesson_assets`,
   * falling back to `RS_LEARNING_26_LESSONS_SEED` when offline.
   */
  async fetchLessonsWithAssets(courseKey?: string): Promise<RsLessonItem[]> {
    if (!isSupabaseConfigured) {
      return courseKey
        ? RS_LEARNING_26_LESSONS_SEED.filter((l) => l.courseKey === courseKey)
        : RS_LEARNING_26_LESSONS_SEED;
    }

    let lessonsQuery = supabase
      .from("lessons")
      .select("*")
      .order("sort_order", { ascending: true });

    if (courseKey) {
      lessonsQuery = lessonsQuery.eq("course_key", courseKey);
    }

    const [{ data: lessonRows, error: lErr }, { data: assetRows, error: aErr }] =
      await Promise.all([
        lessonsQuery,
        supabase
          .from("lesson_assets")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);

    if (lErr || aErr || !lessonRows || lessonRows.length === 0) {
      return courseKey
        ? RS_LEARNING_26_LESSONS_SEED.filter((l) => l.courseKey === courseKey)
        : RS_LEARNING_26_LESSONS_SEED;
    }

    return mapLessonRowsToLessons(
      lessonRows as RsLessonRow[],
      (assetRows ?? []) as RsLessonAssetRow[]
    );
  },

  /**
   * Upsert personal lesson notes (`public.lesson_notes`) for a learner.
   */
  async saveLessonNote(params: {
    username: string;
    lessonKey: string;
    courseKey?: string;
    content: string;
  }): Promise<RsLessonNoteItem> {
    const updatedAt = new Date().toISOString();
    const item: RsLessonNoteItem = {
      username: params.username,
      lessonKey: params.lessonKey,
      courseKey: params.courseKey ?? "lms",
      content: params.content,
      updatedAt,
    };

    if (isSupabaseConfigured) {
      await supabase.from("lesson_notes").upsert(
        {
          username: item.username,
          lesson_key: item.lessonKey,
          course_key: item.courseKey,
          content: item.content,
          updated_at: item.updatedAt,
        } satisfies Omit<RsLessonNoteRow, "id">,
        { onConflict: "username,lesson_key" }
      );
    }

    return item;
  },

  /**
   * Submit a 1–5 star lesson review (`public.lesson_reviews`).
   */
  async submitLessonReview(params: {
    lessonKey: string;
    reviewerName: string;
    reviewerUsername?: string;
    rating: number;
    feedback: string;
  }): Promise<RsLessonReviewItem> {
    const clampedRating = Math.max(1, Math.min(5, Math.round(params.rating)));
    const fallbackItem: RsLessonReviewItem = {
      id: `rev-${Date.now()}`,
      lessonKey: params.lessonKey,
      reviewerName: params.reviewerName,
      reviewerUsername: params.reviewerUsername ?? null,
      rating: clampedRating,
      feedback: params.feedback,
      createdAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) return fallbackItem;

    const { data, error } = await supabase
      .from("lesson_reviews")
      .insert({
        lesson_key: params.lessonKey,
        reviewer_name: params.reviewerName,
        reviewer_username: params.reviewerUsername ?? null,
        rating: clampedRating,
        feedback: params.feedback,
      })
      .select("*")
      .single();

    if (error || !data) return fallbackItem;
    const row = data as RsLessonReviewRow;
    return {
      id: row.id,
      lessonKey: row.lesson_key,
      reviewerName: row.reviewer_name,
      reviewerUsername: row.reviewer_username,
      rating: row.rating,
      feedback: row.feedback,
      createdAt: row.created_at,
    };
  },

  /**
   * Record or remove lesson completion (`public.lesson_progress`).
   */
  async setLessonProgress(params: {
    sessionUsername: string;
    lessonKey: string;
    completed: boolean;
  }): Promise<void> {
    if (!isSupabaseConfigured) return;

    if (params.completed) {
      await supabase.from("lesson_progress").upsert(
        {
          session_username: params.sessionUsername,
          lesson_key: params.lessonKey,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "session_username,lesson_key" }
      );
    } else {
      await supabase
        .from("lesson_progress")
        .delete()
        .eq("session_username", params.sessionUsername)
        .eq("lesson_key", params.lessonKey);
    }
  },

  /**
   * Fetch community Q&A forum threads & replies (`public.forum_threads` + `public.forum_replies`).
   */
  async fetchForumThreads(): Promise<
    (RsForumThreadRow & { replies: RsForumReplyRow[] })[]
  > {
    if (!isSupabaseConfigured) return [];

    const [{ data: threads, error: tErr }, { data: replies, error: rErr }] =
      await Promise.all([
        supabase
          .from("forum_threads")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("forum_replies")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);

    if (tErr || rErr || !threads) return [];

    const replyMap = new Map<string, RsForumReplyRow[]>();
    for (const r of (replies ?? []) as RsForumReplyRow[]) {
      const list = replyMap.get(r.thread_id) ?? [];
      list.push(r);
      replyMap.set(r.thread_id, list);
    }

    return (threads as RsForumThreadRow[]).map((t) => ({
      ...t,
      replies: replyMap.get(t.id) ?? [],
    }));
  },
};
