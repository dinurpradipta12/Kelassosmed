import {
  BookOpen,
  FileText,
  ClipboardCheck,
  HelpCircle,
  Route,
  Library,
  type LucideIcon,
} from "lucide-react";

export type ContentType =
  | "Course"
  | "Page"
  | "Assignment"
  | "Quiz"
  | "Learning Path"
  | "Wiki";

export interface ContentBadgeConfig {
  type: ContentType;
  colorHex: string;
  bgTint: string;
  borderTint: string;
  textTint: string;
  icon: LucideIcon;
  description: string;
}

export const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentBadgeConfig> = {
  Course: {
    type: "Course",
    colorHex: "#0EA5E9",
    bgTint: "rgba(14, 165, 233, 0.10)",
    borderTint: "rgba(14, 165, 233, 0.22)",
    textTint: "#0284C7",
    icon: BookOpen,
    description: "Structured multi-module curriculum with lessons and media",
  },
  Page: {
    type: "Page",
    colorHex: "#6366F1",
    bgTint: "rgba(99, 102, 241, 0.10)",
    borderTint: "rgba(99, 102, 241, 0.22)",
    textTint: "#4F46E5",
    icon: FileText,
    description: "Single rich-media article, playbook, or reference guide",
  },
  Assignment: {
    type: "Assignment",
    colorHex: "#F97316",
    bgTint: "rgba(249, 115, 22, 0.10)",
    borderTint: "rgba(249, 115, 22, 0.22)",
    textTint: "#EA580C",
    icon: ClipboardCheck,
    description: "Practical project submission with rubric & mentor grading",
  },
  Quiz: {
    type: "Quiz",
    colorHex: "#10B981",
    bgTint: "rgba(16, 185, 129, 0.10)",
    borderTint: "rgba(16, 185, 129, 0.22)",
    textTint: "#059669",
    icon: HelpCircle,
    description: "Timed assessment with multiple-choice & open-ended prompts",
  },
  "Learning Path": {
    type: "Learning Path",
    colorHex: "#EC4899",
    bgTint: "rgba(236, 72, 153, 0.10)",
    borderTint: "rgba(236, 72, 153, 0.22)",
    textTint: "#DB2777",
    icon: Route,
    description: "Sequential milestone track combining courses & quizzes",
  },
  Wiki: {
    type: "Wiki",
    colorHex: "#8B5CF6",
    bgTint: "rgba(139, 92, 246, 0.10)",
    borderTint: "rgba(139, 92, 246, 0.22)",
    textTint: "#7C3AED",
    icon: Library,
    description: "Collaborative SOP repository and agency knowledge base",
  },
};

export const CONTENT_TYPES_LIST: ContentType[] = [
  "Course",
  "Page",
  "Assignment",
  "Quiz",
  "Learning Path",
  "Wiki",
];

export interface LeaderboardLearner {
  rank: number;
  name: string;
  role: string;
  points: number;
  initials: string;
  avatarBg: string;
  avatarText: string;
}

export const TOP_LEARNERS_DATA: LeaderboardLearner[] = [
  {
    rank: 1,
    name: "Raka Pratama",
    role: "Social Media Specialist",
    points: 100,
    initials: "RP",
    avatarBg: "#EEF2FF",
    avatarText: "#4F39F6",
  },
  {
    rank: 2,
    name: "Nadia Putri",
    role: "Social Media Specialist",
    points: 80,
    initials: "NP",
    avatarBg: "#FDF2F8",
    avatarText: "#DB2777",
  },
  {
    rank: 3,
    name: "Bima Sakti",
    role: "Social Media Specialist",
    points: 80,
    initials: "BS",
    avatarBg: "#ECFDF5",
    avatarText: "#059669",
  },
];

export interface UngradedQuizItem {
  id: string;
  index: number;
  title: string;
  questionsLabel: string;
  submittedAt: string;
  learner: {
    name: string;
    initials: string;
    avatarBg: string;
    avatarText: string;
    role: string;
  };
  graded?: boolean;
}

export const INITIAL_UNGRADED_QUIZZES: UngradedQuizItem[] = [
  {
    id: "uq-1",
    index: 1,
    title: "Meta Ads Campaign Audit",
    questionsLabel: "4 open ended",
    submittedAt: "18 mins ago",
    learner: {
      name: "Raka Pratama",
      initials: "RP",
      avatarBg: "#EEF2FF",
      avatarText: "#4F39F6",
      role: "Social Media Specialist",
    },
  },
  {
    id: "uq-2",
    index: 2,
    title: "TikTok Shop Hook & Retention Strategy",
    questionsLabel: "3 open ended",
    submittedAt: "1 hour ago",
    learner: {
      name: "Nadia Putri",
      initials: "NP",
      avatarBg: "#FDF2F8",
      avatarText: "#DB2777",
      role: "Content Creator",
    },
  },
  {
    id: "uq-3",
    index: 3,
    title: "Instagram Reels Algorithm & Analytics",
    questionsLabel: "5 open ended",
    submittedAt: "3 hours ago",
    learner: {
      name: "Bima Sakti",
      initials: "BS",
      avatarBg: "#ECFDF5",
      avatarText: "#059669",
      role: "Performance Marketer",
    },
  },
  {
    id: "uq-4",
    index: 4,
    title: "KOL & Influencer Brief Negotiation",
    questionsLabel: "2 open ended",
    submittedAt: "5 hours ago",
    learner: {
      name: "Siti Aminah",
      initials: "SA",
      avatarBg: "#FFF7ED",
      avatarText: "#EA580C",
      role: "Brand Strategist",
    },
  },
];

export interface TodoTask {
  id: string;
  title: string;
  subtitle: string;
  dueLabel: "Today" | "Tomorrow" | "This Friday";
  priority: "high" | "medium" | "low";
  completed: boolean;
}

export const INITIAL_TODOS: TodoTask[] = [
  {
    id: "todo-1",
    title: "Review Batch 14 Meta Ads Capstones",
    subtitle: "12 final campaign ad sets awaiting mentor rubric scores",
    dueLabel: "Today",
    priority: "high",
    completed: false,
  },
  {
    id: "todo-2",
    title: "Publish TikTok Affiliate Creative Playbook",
    subtitle: "Update Q4 hook templates in Creator Growth Learning Path",
    dueLabel: "Tomorrow",
    priority: "high",
    completed: false,
  },
  {
    id: "todo-3",
    title: "Verify Certificate Sign-off for Cohort 8",
    subtitle: "Check passing threshold (84%) for 38 graduating learners",
    dueLabel: "Tomorrow",
    priority: "medium",
    completed: true,
  },
];

export const CONTENT_STATUS_DATA = [
  { label: "Passed", percentage: 84, color: "#4F39F6", count: 116 },
  { label: "Failed", percentage: 4, color: "#F59E0B", count: 6 },
  { label: "Overdue", percentage: 4, color: "#EF4444", count: 6 },
  { label: "In Progress", percentage: 4, color: "#14B8A6", count: 6 },
  { label: "Not Started", percentage: 4, color: "#D1D5DB", count: 6 },
];
