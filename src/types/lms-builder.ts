export type LmsSpaceType = "product_tutorial" | "recorded_class";

export interface CategoryTag {
  label: string;
  color: string;
}

export interface MaterialItem {
  id: string;
  type: "video" | "text";
  title: string;
  youtubeUrl?: string;
  duration?: string;
  content?: string;
  notes?: string;
  order: number;
}

export interface AssetResource {
  id: string;
  name: string;
  type: "PDF" | "Link" | "Template" | "File";
  url: string;
}

export interface MentorProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  website?: string;
}

export type PostTestQuestionType = "multiple_choice" | "true_false" | "essay";

export interface PostTestQuestion {
  id: string;
  type: PostTestQuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

export interface PostTestConfig {
  enabled: boolean;
  passingScore: number;
  maxAttempts: number;
  questions: PostTestQuestion[];
}

export interface CourseBuilderItem {
  id: string;
  shortCode: string;
  spaceType: LmsSpaceType;
  title: string;
  description: string;
  categories: CategoryTag[];
  coverUrl: string;
  coverPosition: string;
  coverZoom: number;
  coverTextMode: "light" | "dark";
  published: boolean;
  overallFeedbackEnabled: boolean;
  postTestMode: "tab" | "per_material";
  materials: MaterialItem[];
  assets: AssetResource[];
  mentor: MentorProfile;
  postTest: PostTestConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ClassResultSubmission {
  id: string;
  courseId: string;
  participantName: string;
  participantEmail: string;
  score: number;
  passed: boolean;
  attempt: number;
  feedback?: string;
  answers: Record<string, string>;
  submittedAt: string;
}

export function generateShortCode(seed?: number): string {
  const num = seed ?? Date.now();
  return num.toString(36).toLowerCase();
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

export function createEmptyCourse(
  spaceType: LmsSpaceType = "product_tutorial",
  idOverride?: string
): CourseBuilderItem {
  const now = Date.now();
  const id = idOverride || `course-${now}`;
  const shortCode = generateShortCode(now);
  return {
    id,
    shortCode,
    spaceType,
    title:
      spaceType === "recorded_class"
        ? "Kelas Rekaman Baru"
        : "Kursus Baru Ruang Sosmed",
    description:
      "Pelajari strategi praktis langkah demi langkah lengkap dengan studi kasus dan aset siap pakai.",
    categories: [{ label: "Social Media", color: "#4F39F6" }],
    coverUrl: "",
    coverPosition: "50% 50%",
    coverZoom: 1,
    coverTextMode: "light",
    published: true,
    overallFeedbackEnabled: spaceType === "recorded_class",
    postTestMode: "tab",
    materials: [
      {
        id: `mat-${now}-1`,
        type: "video",
        title: "Pengenalan & Kerangka Materi",
        youtubeUrl: "",
        duration: "10:00",
        notes: "Ringkasan poin utama yang akan dibahas pada sesi ini.",
        order: 0,
      },
    ],
    assets: [],
    mentor: {
      id: "mentor-default-1",
      name: "Dinur Pradipta",
      role: "Social Media Strategist & Mentor",
      bio: "Praktisi social media & growth marketing yang membantu kreator dan brand membangun sistem konten berdampak.",
      avatarUrl: "",
      instagram: "https://instagram.com",
      linkedin: "https://linkedin.com",
      tiktok: "",
      website: "https://ruangsosmed.id",
    },
    postTest: {
      enabled: spaceType === "recorded_class",
      passingScore: 70,
      maxAttempts: 3,
      questions: [],
    },
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}
