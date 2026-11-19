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

export function getDefaultContentAccessCode(
  title: string,
  folderName?: string,
  id?: string
): string {
  const clean = (title || "").trim();
  if (!clean) return "MTR-01";

  const tokenMatch =
    /\b(batch|modul|module|part|sesi|session|week|minggu|tahap|level|ep|episode|bab|kelas)\s*#?0*(\d{1,3})\b/i.exec(
      clean
    ) || /#\s*0*(\d{1,3})\b/.exec(clean);

  let batchToken = "";
  if (tokenMatch) {
    if (tokenMatch.length >= 3 && tokenMatch[2]) {
      const keyword = tokenMatch[1].toUpperCase();
      const num = tokenMatch[2].padStart(2, "0");
      batchToken = `${keyword[0]}${num}`;
    } else if (tokenMatch[1]) {
      batchToken = tokenMatch[1].padStart(2, "0");
    }
  } else {
    const trailingNumMatch = /\b0*(\d{1,3})\s*$/.exec(
      clean.replace(/\s*\(copy\)\s*$/i, "")
    );
    if (trailingNumMatch?.[1]) {
      batchToken = trailingNumMatch[1].padStart(2, "0");
    }
  }

  const ignoredWords = new Set([
    "batch",
    "modul",
    "module",
    "part",
    "sesi",
    "session",
    "week",
    "minggu",
    "tahap",
    "level",
    "ep",
    "episode",
    "bab",
    "kelas",
    "copy",
  ]);

  const rawWords = clean
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const meaningfulWords = rawWords.filter(
    (w) => !ignoredWords.has(w.toLowerCase()) && !/^\d+$/.test(w)
  );
  const sourceWords = meaningfulWords.length > 0 ? meaningfulWords : rawWords;

  let prefix = "";
  if (sourceWords.length >= 2) {
    prefix = sourceWords
      .map((w) => w[0])
      .join("")
      .slice(0, 4)
      .toUpperCase();
  } else if (sourceWords.length === 1) {
    prefix = sourceWords[0].slice(0, 4).toUpperCase();
  }
  prefix = prefix || "MTR";

  const hashAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const hashSeed = `${clean.toLowerCase()}|${(folderName || "").trim().toLowerCase()}`;
  let hashVal = 2166136261;
  for (let i = 0; i < hashSeed.length; i += 1) {
    hashVal ^= hashSeed.charCodeAt(i);
    hashVal = Math.imul(hashVal, 16777619) >>> 0;
  }
  const c1 = hashAlphabet[hashVal % hashAlphabet.length];
  const c2 = hashAlphabet[(hashVal >>> 5) % hashAlphabet.length];
  const hash2 = `${c1}${c2}`;

  if (batchToken) {
    if (/\(copy\)/i.test(clean)) {
      const idHash = (id || clean).slice(-2).toUpperCase().replace(/[^A-Z0-9]/g, "X");
      return `${prefix}-${batchToken}-C${idHash || "1"}`;
    }
    return `${prefix}-${batchToken}`;
  }

  return `${prefix}-${hash2}`;
}

export function getItemAccessCode(item: {
  title: string;
  type?: ExplorerItemType;
  folderName?: string;
  id?: string;
  accessCode?: string;
}): string {
  if (item.accessCode && item.accessCode.trim()) {
    return item.accessCode.trim().toUpperCase().replace(/\s+/g, "-");
  }
  if (item.type === "Folder") {
    return getDefaultFolderAccessCode(item.title);
  }
  return getDefaultContentAccessCode(item.title, item.folderName, item.id);
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
