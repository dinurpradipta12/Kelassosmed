import { type ContentType } from "@/lib/design-tokens";

export interface LearnerAssignedItem {
  id: string;
  title: string;
  type: ContentType;
  urgencyBadge: "Urgent" | "Due in 3 days" | "Due this Friday" | "Self-paced";
  isUrgentRed?: boolean;
  progressPercent: number;
  pointsReward: number;
  duration: string;
  skillTags: string[];
  description: string;
  isFavorite?: boolean;
  isPro?: boolean;
  unlockPriceIdr?: number;
  unlockPointsCost?: number;
  cohort?: string;
  thumbnailUrl?: string;
  bannerGradient?: string;
  bannerAccent?: string;
  folderName?: string;
}

export const INITIAL_LEARNER_ASSIGNED_ITEMS: LearnerAssignedItem[] = [];

export interface CourseChapterItem {
  id: string;
  title: string;
  type: "Lesson" | "Quiz" | "Assignment";
  duration: string;
  completed: boolean;
  locked: boolean;
  points: number;
  videoTitle: string;
  videoDuration: string;
  videoUrl?: string;
  videoMode?: "upload" | "embed";
  contentParagraphs: string[];
  calloutTip: string;
  imageCaption?: string;
  imageZoomEnabled?: boolean;
  attachments: { name: string; size: string }[];
  embeddedBlocks?: {
    id: string;
    provider: string;
    title: string;
    url: string;
    displayMode: "Thumbnail" | "Mention" | "Link";
  }[];
  databaseRows?: {
    id: string;
    name: string;
    category: string;
    status: string;
    owner: string;
    deliverable?: string;
    pillar?: string;
    platform?: string;
    kpi?: string;
  }[];
  hidden?: boolean;
  hideTextBlock?: boolean;
  hideCallout?: boolean;
  hideVideoBlock?: boolean;
  hideImageBlock?: boolean;
  hideAttachmentBlock?: boolean;
  hideEmbeddedBlock?: boolean;
  hideDatabaseBlock?: boolean;
  isPro?: boolean;
  unlockPriceIdr?: number;
  unlockPointsCost?: number;
}

export interface CourseSectionAccordion {
  id: string;
  sectionTitle: string;
  shortTitle: string;
  hidden?: boolean;
  chapters: CourseChapterItem[];
}

export const COURSE_OVERVIEW_SECTIONS: CourseSectionAccordion[] = [];

export type LearnerNotificationEventType =
  | "pro_activated"
  | "material_added"
  | "mentor_reply"
  | "general";

export interface LearnerNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  eventType?: LearnerNotificationEventType;
  createdAt?: string;
  targetLearner?: string;
  meta?: {
    contentTitle?: string;
    chapterTitle?: string;
    packageName?: string;
    mentorName?: string;
  };
}

export const INITIAL_LEARNER_NOTIFICATIONS: LearnerNotification[] = [];

export function extractVisibleChapters(
  sections?: CourseSectionAccordion[] | null
): CourseChapterItem[] {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter((s) => !s.hidden)
    .flatMap((s) => (s.chapters || []).filter((c) => !c.hidden));
}

export function parseChapterMinutes(durationRaw?: string): number {
  const s = (durationRaw || "").trim().toLowerCase();
  if (!s) return 15;
  const hourMatch = /(\d+)\s*(?:h|hr|hrs|hour|hours|jam)\b/.exec(s);
  const minMatch = /(\d+)\s*(?:m|min|mins|minute|minutes|menit)\b/.exec(s);
  const plainNumMatch = /^(\d+)$/.exec(s);
  let total = 0;
  if (hourMatch) total += Number(hourMatch[1]) * 60;
  if (minMatch) total += Number(minMatch[1]);
  if (!hourMatch && !minMatch && plainNumMatch) total = Number(plainNumMatch[1]);
  return total > 0 ? total : 15;
}

export function summarizeCurriculumStats(
  chapters: CourseChapterItem[],
  options?: {
    fallbackPoints?: number;
    fallbackDuration?: string;
    contentType?: string;
  }
): { totalPoints: number; durationLabel: string; totalMinutes: number } {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return {
      totalPoints: options?.fallbackPoints ?? 15,
      durationLabel:
        options?.fallbackDuration ||
        (options?.contentType === "Quiz" ? "15 Mins" : "45 Mins"),
      totalMinutes: options?.contentType === "Quiz" ? 15 : 45,
    };
  }
  const totalPoints = chapters.reduce(
    (sum, ch) => sum + (Number(ch.points) > 0 ? Number(ch.points) : 5),
    0
  );
  const totalMinutes = chapters.reduce(
    (sum, ch) => sum + parseChapterMinutes(ch.duration),
    0
  );
  return {
    totalPoints,
    durationLabel: `${totalMinutes} Mins`,
    totalMinutes,
  };
}
