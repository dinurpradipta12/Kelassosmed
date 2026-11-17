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
}

export interface CourseSectionAccordion {
  id: string;
  sectionTitle: string;
  shortTitle: string;
  hidden?: boolean;
  chapters: CourseChapterItem[];
}

export const COURSE_OVERVIEW_SECTIONS: CourseSectionAccordion[] = [];

export interface LearnerNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

export const INITIAL_LEARNER_NOTIFICATIONS: LearnerNotification[] = [
  {
    id: "notif-invite-allisha-active",
    title: "🤝 Undangan Kolaborasi: Admin di Ruang Sosmed Class",
    body: 'Halo Allisha Fathya! Anda telah diundang bergabung sebagai Admin pada cohort "Ruang Sosmed Class". Pesan: "tes coba gabung"',
    time: "Baru saja",
    unread: true,
  },
];
