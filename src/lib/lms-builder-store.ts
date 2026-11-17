import {
  supabaseAdmin,
  supabasePublic,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  type CourseBuilderItem,
  type ClassResultSubmission,
  type LmsSpaceType,
  createEmptyCourse,
} from "@/types/lms-builder";

const COURSES_STORAGE_KEY = "ruang_sosmed_lms_builder_courses_v1";
const RESULTS_STORAGE_KEY = "ruang_sosmed_lms_builder_results_v1";
const THEME_STORAGE_KEY = "ruang_sosmed_lms_builder_theme_v1";

export function getSavedBuilderTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveBuilderTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function getLocalCourses(spaceType?: LmsSpaceType): CourseBuilderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COURSES_STORAGE_KEY);
    let list: CourseBuilderItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) {
      const seedProduct = createEmptyCourse("product_tutorial", "course-seed-1");
      seedProduct.title = "Fundamental Social Media Growth";
      seedProduct.description =
        "Panduan lengkap membangun konten organik, hook viral, dan analitik akun dari nol.";
      seedProduct.categories = [
        { label: "Content Strategy", color: "#4F39F6" },
        { label: "Beginner", color: "#10B981" },
      ];
      list = [seedProduct];
      window.localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(list));
    }
    return spaceType ? list.filter((c) => c.spaceType === spaceType) : list;
  } catch {
    return [];
  }
}

export function saveLocalCourses(courses: CourseBuilderItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
  } catch {}
}

export function upsertLocalCourse(course: CourseBuilderItem): CourseBuilderItem[] {
  const all = getLocalCourses();
  const idx = all.findIndex((c) => c.id === course.id);
  const next =
    idx >= 0
      ? all.map((c) => (c.id === course.id ? course : c))
      : [course, ...all];
  saveLocalCourses(next);
  return next;
}

export function removeLocalCourse(id: string): CourseBuilderItem[] {
  const next = getLocalCourses().filter((c) => c.id !== id);
  saveLocalCourses(next);
  return next;
}

function mapRowToCourse(row: any): CourseBuilderItem {
  return {
    id: row.id,
    shortCode: row.short_code || row.id,
    spaceType: (row.space_type as LmsSpaceType) || "product_tutorial",
    title: row.title || "Untitled Course",
    description: row.description || "",
    categories: Array.isArray(row.categories) ? row.categories : [],
    coverUrl: row.cover_url || "",
    coverPosition: row.cover_position || "50% 50%",
    coverZoom: Number(row.cover_zoom) || 1,
    coverTextMode: row.cover_text_mode === "dark" ? "dark" : "light",
    published: Boolean(row.published),
    overallFeedbackEnabled: Boolean(row.overall_feedback_enabled),
    postTestMode: row.post_test_mode === "per_material" ? "per_material" : "tab",
    materials: Array.isArray(row.materials) ? row.materials : [],
    assets: Array.isArray(row.assets) ? row.assets : [],
    mentor: row.mentor ||
      row.mentor_data || {
        id: row.mentor_id || "mentor-default-1",
        name: "Dinur Pradipta",
        role: "Mentor",
        bio: "",
        avatarUrl: "",
      },
    postTest: row.post_test || {
      enabled: false,
      passingScore: 70,
      maxAttempts: 3,
      questions: [],
    },
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function fetchAdminCourses(
  spaceType?: LmsSpaceType
): Promise<CourseBuilderItem[]> {
  const local = getLocalCourses(spaceType);
  if (!isSupabaseConfigured) return local;

  try {
    let query = supabaseAdmin
      .from("lms_courses")
      .select("*, mentor:mentor_id(*)")
      .order("updated_at", { ascending: false });
    if (spaceType) {
      query = query.eq("space_type", spaceType);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map(mapRowToCourse);
      if (!spaceType) saveLocalCourses(mapped);
      return mapped;
    }
  } catch {}

  return local;
}

export async function fetchAdminCourseById(
  id: string
): Promise<CourseBuilderItem | null> {
  const local = getLocalCourses().find(
    (c) => c.id === id || c.shortCode === id
  );
  if (!isSupabaseConfigured) return local || null;

  try {
    const { data, error } = await supabaseAdmin
      .from("lms_courses")
      .select("*, mentor:mentor_id(*)")
      .or(`id.eq.${id},short_code.eq.${id}`)
      .maybeSingle();
    if (!error && data) {
      return mapRowToCourse(data);
    }
  } catch {}

  return local || null;
}

export async function saveAdminCourse(
  course: CourseBuilderItem
): Promise<CourseBuilderItem> {
  const updated: CourseBuilderItem = {
    ...course,
    updatedAt: new Date().toISOString(),
  };
  upsertLocalCourse(updated);

  if (isSupabaseConfigured) {
    try {
      const mentorId = updated.mentor.id || "mentor-default-1";
      await supabaseAdmin.from("mentor").upsert({
        id: mentorId,
        name: updated.mentor.name,
        role: updated.mentor.role,
        bio: updated.mentor.bio,
        avatar_url: updated.mentor.avatarUrl || null,
        instagram: updated.mentor.instagram || null,
        linkedin: updated.mentor.linkedin || null,
        tiktok: updated.mentor.tiktok || null,
        website: updated.mentor.website || null,
        updated_at: updated.updatedAt,
      });

      await supabaseAdmin.from("lms_courses").upsert({
        id: updated.id,
        short_code: updated.shortCode,
        space_type: updated.spaceType,
        title: updated.title,
        description: updated.description,
        categories: updated.categories,
        cover_url: updated.coverUrl || null,
        cover_position: updated.coverPosition,
        cover_zoom: updated.coverZoom,
        cover_text_mode: updated.coverTextMode,
        published: updated.published,
        overall_feedback_enabled: updated.overallFeedbackEnabled,
        post_test_mode: updated.postTestMode,
        materials: updated.materials,
        assets: updated.assets,
        post_test: updated.postTest,
        mentor_id: mentorId,
        updated_at: updated.updatedAt,
      });

      await supabaseAdmin.from("public_content_revisions").upsert(
        {
          course_id: updated.id,
          revision_token: `${Date.now()}`,
          updated_at: updated.updatedAt,
        },
        { onConflict: "course_id" }
      );
    } catch {}
  }

  return updated;
}

export async function deleteAdminCourse(id: string): Promise<CourseBuilderItem[]> {
  const next = removeLocalCourse(id);
  if (isSupabaseConfigured) {
    try {
      await supabaseAdmin.from("lms_courses").delete().eq("id", id);
    } catch {}
  }
  return next;
}

export async function fetchPublicCourse(
  idOrCode: string
): Promise<CourseBuilderItem | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabasePublic
        .from("lms_courses")
        .select("*, mentor:mentor_id(*)")
        .eq("published", true)
        .or(`id.eq.${idOrCode},short_code.eq.${idOrCode}`)
        .maybeSingle();
      if (!error && data) {
        return mapRowToCourse(data);
      }
    } catch {}
  }

  const local = getLocalCourses().find(
    (c) => (c.id === idOrCode || c.shortCode === idOrCode) && c.published
  );
  return local || null;
}

export async function logCourseVisitEvent(courseId: string) {
  if (!isSupabaseConfigured || typeof window === "undefined") return;
  try {
    let visitorId = window.localStorage.getItem("rs_visitor_id");
    if (!visitorId) {
      visitorId = `vis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem("rs_visitor_id", visitorId);
    }
    const ua = navigator.userAgent.toLowerCase();
    const deviceType = /mobile|android|iphone|ipad/.test(ua)
      ? "mobile"
      : "desktop";
    const source = document.referrer ? new URL(document.referrer).hostname : "direct";

    await supabasePublic.from("events").insert({
      visitor_id: visitorId,
      course_id: courseId,
      device_type: deviceType,
      source,
    });
  } catch {}
}

export async function fetchClassResults(
  courseId: string
): Promise<ClassResultSubmission[]> {
  let local: ClassResultSubmission[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(RESULTS_STORAGE_KEY);
      const all: ClassResultSubmission[] = raw ? JSON.parse(raw) : [];
      local = all.filter((r) => r.courseId === courseId);
    } catch {}
  }

  if (!isSupabaseConfigured) return local;

  try {
    const { data, error } = await supabaseAdmin
      .from("lms_class_results")
      .select("*")
      .eq("course_id", courseId)
      .order("submitted_at", { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        courseId: r.course_id,
        participantName: r.participant_name,
        participantEmail: r.participant_email,
        score: r.score,
        passed: Boolean(r.passed),
        attempt: r.attempt || 1,
        feedback: r.feedback || "",
        answers: r.answers || {},
        submittedAt: r.submitted_at,
      }));
    }
  } catch {}

  return local;
}

export async function submitPublicClassResult(
  submission: ClassResultSubmission
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(RESULTS_STORAGE_KEY);
      const all: ClassResultSubmission[] = raw ? JSON.parse(raw) : [];
      window.localStorage.setItem(
        RESULTS_STORAGE_KEY,
        JSON.stringify([submission, ...all])
      );
    } catch {}
  }

  if (isSupabaseConfigured) {
    try {
      await supabasePublic.from("lms_class_results").insert({
        id: submission.id,
        course_id: submission.courseId,
        participant_name: submission.participantName,
        participant_email: submission.participantEmail,
        score: submission.score,
        passed: submission.passed,
        attempt: submission.attempt,
        feedback: submission.feedback || null,
        answers: submission.answers,
        submitted_at: submission.submittedAt,
      });
    } catch {}
  }
}
