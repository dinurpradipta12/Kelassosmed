import { type ContentType } from "@/lib/design-tokens";

export type ExplorerItemType = ContentType | "Folder";

export interface ExplorerContentItem {
  id: string;
  title: string;
  type: ExplorerItemType;
  assignedCount: number;
  category: string;
  urgency: "Not Urgent" | "Urgent" | "High Priority";
  editedLabel: string;
  statusLabel: "Completed" | "In Progress" | "Draft";
  progressPercent: number;
  language: string;
  editedDate: string;
  bannerGradient: string;
  bannerAccent: string;
  bannerPattern: "carousel" | "persona" | "reels" | "ads" | "audit" | "wiki";
  description: string;
  isFavorite?: boolean;
  isPro?: boolean;
  cohort?: string;
  thumbnailUrl?: string;
  isArchived?: boolean;
  isShared?: boolean;
  isTemplate?: boolean;
  assignedLearners?: string[];
  folderName?: string;
  folderId?: string;
  accessCode?: string;
}

export function getDefaultFolderAccessCode(folderTitle: string): string {
  const clean = (folderTitle || "").trim();
  if (!clean) return "SERIES-2026";
  const words = clean
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let prefix = "";
  if (words.length >= 2) {
    prefix = words
      .map((w) => w[0])
      .join("")
      .slice(0, 5)
      .toUpperCase();
  } else if (words.length === 1) {
    prefix = words[0].slice(0, 6).toUpperCase();
  }
  return `${prefix || "SERIES"}-2026`;
}

export const INITIAL_EXPLORER_ITEMS: ExplorerContentItem[] = [];

export interface DiscussionReply {
  id: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  avatarBg: string;
  avatarText: string;
  timestamp: string;
  message: string;
}

export interface DiscussionThread {
  id: string;
  chapterBadge: string;
  title: string;
  excerpt: string;
  repliesCount: number;
  viewsCount: number;
  lastReplyLabel: string;
  participants: {
    initials: string;
    bg: string;
    text: string;
  }[];
  replies: DiscussionReply[];
}

export const INITIAL_DISCUSSION_THREADS: DiscussionThread[] = [];

export interface ReportedIssueItem {
  id: string;
  chapter: string;
  title: string;
  reporter: string;
  reportedAt: string;
  status: "Open" | "Resolved";
  category?: string;
}

export const INITIAL_REPORTED_ISSUES: ReportedIssueItem[] = [];

export interface AssigneeLearner {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  roleBadge: string;
  completedChapters: number;
  totalChapters: number;
  assignedDate: string;
}

export const INITIAL_ASSIGNEES: AssigneeLearner[] = [];

export interface ContentVersionItem {
  id: string;
  versionTag: string;
  label: string;
  author: string;
  notes: string;
  isCurrent?: boolean;
}

export const INITIAL_VERSIONS: ContentVersionItem[] = [];

export interface WorkspaceCollaborator {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "Admin" | "Mentor" | "Course Author" | "Learner";
  cohort: string;
  status: "invited" | "accepted";
  avatarBg: string;
  avatarText: string;
  joinedAt?: string;
}

export const INITIAL_WORKSPACE_COLLABORATORS: WorkspaceCollaborator[] = [
  {
    id: "collab-owner",
    name: "Dinur Pradipta",
    email: "dinur@ruangsosmed.id",
    initials: "DP",
    role: "Admin",
    cohort: "Ruang Sosmed Class",
    status: "accepted",
    avatarBg: "#FEF3C7",
    avatarText: "#92400E",
    joinedAt: "Owner",
  },
];
