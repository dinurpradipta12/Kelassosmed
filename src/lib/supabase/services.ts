// =============================================================================
// RUANG SOSMED 2.0 LMS — SUPABASE CLIENT SERVICE LAYER (ALL 10 TABLE GROUPS)
// File: src/lib/supabase/services.ts
// =============================================================================

import { supabase } from "@/lib/supabase/client";
import type {
  ProfileRow,
  ProjectRow,
  ContentRow,
  CourseSectionRow,
  CourseChapterRow,
  LearningPathItemRow,
  QuizQuestionRow,
  ContentVersionRow,
  EnrollmentRow,
  SubmissionRow,
  DiscussionRow,
  ContentIssueRow,
  DbContentType,
  DbContentUrgency,
  DbContentStatus,
  DbGradingStatus,
  DbIssueStatus,
  QuizSettingsJson,
  VersionSnapshotJson,
  SubmissionAnswerJson,
} from "@/lib/supabase/database.types";

// -----------------------------------------------------------------------------
// 1. PROFILES & LEADERBOARD SERVICE (`profiles`)
// -----------------------------------------------------------------------------

export const profilesService = {
  async getTopLearnersLeaderboard(limit = 10): Promise<ProfileRow[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "learner")
      .order("total_points", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as ProfileRow[];
  },

  async getProfileById(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data as ProfileRow;
  },

  async updateProfilePoints(
    userId: string,
    deltaPoints: number
  ): Promise<ProfileRow> {
    const current = await this.getProfileById(userId);
    const nextPoints = Math.max(0, (current?.total_points ?? 0) + deltaPoints);

    const { data, error } = await supabase
      .from("profiles")
      .update({ total_points: nextPoints })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data as ProfileRow;
  },
};

// -----------------------------------------------------------------------------
// 2. PROJECTS / COHORT WORKSPACES SERVICE (`projects`)
// -----------------------------------------------------------------------------

export const projectsService = {
  async listProjects(): Promise<ProjectRow[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProjectRow[];
  },

  async createProject(payload: {
    name: string;
    color_hex: string;
    created_by?: string;
  }): Promise<ProjectRow> {
    const { data, error } = await supabase
      .from("projects")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as ProjectRow;
  },
};

// -----------------------------------------------------------------------------
// 3. LEARNING CONTENTS SERVICE (`contents`)
// -----------------------------------------------------------------------------

export const contentsService = {
  async listContents(filters?: {
    projectId?: string;
    type?: DbContentType;
    status?: DbContentStatus;
  }): Promise<ContentRow[]> {
    let query = supabase
      .from("contents")
      .select("*")
      .order("updated_at", { ascending: false });

    if (filters?.projectId) {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ContentRow[];
  },

  async getContentById(contentId: string): Promise<ContentRow | null> {
    const { data, error } = await supabase
      .from("contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (error) return null;
    return data as ContentRow;
  },

  async upsertContent(payload: {
    id?: string;
    project_id?: string | null;
    type: DbContentType;
    title: string;
    description?: string;
    thumbnail_url?: string | null;
    category_tags?: string[];
    urgency?: DbContentUrgency;
    estimated_minutes?: number;
    points_reward?: number;
    status?: DbContentStatus;
    settings_json?: Partial<QuizSettingsJson>;
    author_id?: string | null;
  }): Promise<ContentRow> {
    const { data, error } = await supabase
      .from("contents")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as ContentRow;
  },

  async deleteContent(contentId: string): Promise<void> {
    const { error } = await supabase
      .from("contents")
      .delete()
      .eq("id", contentId);
    if (error) throw error;
  },
};

// -----------------------------------------------------------------------------
// 4. HIERARCHICAL COURSE SECTIONS & CHAPTERS SERVICE (`course_sections` & `course_chapters`)
// -----------------------------------------------------------------------------

export const curriculumService = {
  async getSectionsAndChapters(contentId: string): Promise<{
    sections: CourseSectionRow[];
    chapters: CourseChapterRow[];
  }> {
    const [sectionsRes, chaptersRes] = await Promise.all([
      supabase
        .from("course_sections")
        .select("*")
        .eq("content_id", contentId)
        .order("order_index", { ascending: true }),
      supabase
        .from("course_chapters")
        .select("*")
        .eq("content_id", contentId)
        .order("order_index", { ascending: true }),
    ]);

    if (sectionsRes.error) throw sectionsRes.error;
    if (chaptersRes.error) throw chaptersRes.error;

    return {
      sections: (sectionsRes.data ?? []) as CourseSectionRow[],
      chapters: (chaptersRes.data ?? []) as CourseChapterRow[],
    };
  },

  async upsertSection(payload: {
    id?: string;
    content_id: string;
    section_title: string;
    order_index: number;
  }): Promise<CourseSectionRow> {
    const { data, error } = await supabase
      .from("course_sections")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as CourseSectionRow;
  },

  async upsertChapter(
    payload: Omit<CourseChapterRow, "id" | "created_at" | "updated_at"> & {
      id?: string;
    }
  ): Promise<CourseChapterRow> {
    const { data, error } = await supabase
      .from("course_chapters")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as CourseChapterRow;
  },
};

// -----------------------------------------------------------------------------
// 5. LEARNING PATH ITEMS SERVICE (`learning_path_items`)
// -----------------------------------------------------------------------------

export const learningPathsService = {
  async getPathItems(learningPathId: string): Promise<LearningPathItemRow[]> {
    const { data, error } = await supabase
      .from("learning_path_items")
      .select("*, content:contents(*)")
      .eq("learning_path_id", learningPathId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return (data ?? []) as LearningPathItemRow[];
  },

  async replacePathCurriculum(
    learningPathId: string,
    items: {
      content_id: string;
      stage_name: string;
      order_index: number;
    }[]
  ): Promise<LearningPathItemRow[]> {
    await supabase
      .from("learning_path_items")
      .delete()
      .eq("learning_path_id", learningPathId);

    if (items.length === 0) return [];

    const rows = items.map((item) => ({
      learning_path_id: learningPathId,
      ...item,
    }));

    const { data, error } = await supabase
      .from("learning_path_items")
      .insert(rows)
      .select("*");

    if (error) throw error;
    return (data ?? []) as LearningPathItemRow[];
  },
};

// -----------------------------------------------------------------------------
// 6. QUIZ QUESTIONS SERVICE (`quiz_questions`)
// -----------------------------------------------------------------------------

export const quizService = {
  async getQuestionsForQuiz(quizId: string): Promise<QuizQuestionRow[]> {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return (data ?? []) as QuizQuestionRow[];
  },

  async upsertQuizQuestion(
    payload: Omit<QuizQuestionRow, "id" | "created_at"> & { id?: string }
  ): Promise<QuizQuestionRow> {
    const { data, error } = await supabase
      .from("quiz_questions")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as QuizQuestionRow;
  },

  async deleteQuizQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("id", questionId);
    if (error) throw error;
  },
};

// -----------------------------------------------------------------------------
// 7. CONTENT VERSIONS SERVICE (`content_versions`)
// -----------------------------------------------------------------------------

export const versionsService = {
  async listVersions(contentId: string): Promise<ContentVersionRow[]> {
    const { data, error } = await supabase
      .from("content_versions")
      .select("*, editor:profiles(id, full_name, avatar_url)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ContentVersionRow[];
  },

  async createVersionSnapshot(payload: {
    content_id: string;
    version_number: string;
    snapshot_json: VersionSnapshotJson;
    edited_by?: string | null;
  }): Promise<ContentVersionRow> {
    const { data, error } = await supabase
      .from("content_versions")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as ContentVersionRow;
  },
};

// -----------------------------------------------------------------------------
// 8. ENROLLMENTS / ASSIGNEES SERVICE (`enrollments`)
// -----------------------------------------------------------------------------

export const enrollmentsService = {
  async listEnrollmentsByContent(contentId: string): Promise<EnrollmentRow[]> {
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, learner:profiles(*)")
      .eq("content_id", contentId)
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as EnrollmentRow[];
  },

  async listEnrollmentsForLearner(learnerId: string): Promise<EnrollmentRow[]> {
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, content:contents(*)")
      .eq("learner_id", learnerId)
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as EnrollmentRow[];
  },

  async assignLearnersToContent(params: {
    contentId: string;
    learnerIds: string[];
    dueDate?: string | null;
  }): Promise<EnrollmentRow[]> {
    const rows = params.learnerIds.map((learnerId) => ({
      content_id: params.contentId,
      learner_id: learnerId,
      status: "not_started" as const,
      progress_percent: 0,
      completed_chapter_ids: [] as string[],
      due_date: params.dueDate ?? null,
    }));

    const { data, error } = await supabase
      .from("enrollments")
      .upsert(rows, { onConflict: "content_id,learner_id" })
      .select("*");

    if (error) throw error;
    return (data ?? []) as EnrollmentRow[];
  },

  /**
   * Calls the Postgres RPC `complete_chapter_and_award_points` to atomically
   * append `chapterId`, recalculate `progress_percent`, and increment `profiles.total_points`.
   */
  async markChapterCompletedRpc(params: {
    contentId: string;
    chapterId: string;
    learnerId: string;
  }): Promise<EnrollmentRow> {
    const { data, error } = await supabase.rpc(
      "complete_chapter_and_award_points",
      {
        p_content_id: params.contentId,
        p_chapter_id: params.chapterId,
        p_learner_id: params.learnerId,
      }
    );

    if (error) throw error;
    return data as EnrollmentRow;
  },

  async resetLearnerProgress(
    contentId: string,
    learnerId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("enrollments")
      .update({
        status: "not_started",
        progress_percent: 0,
        completed_chapter_ids: [],
      })
      .eq("content_id", contentId)
      .eq("learner_id", learnerId);

    if (error) throw error;
  },

  async unassignLearner(contentId: string, learnerId: string): Promise<void> {
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("content_id", contentId)
      .eq("learner_id", learnerId);

    if (error) throw error;
  },
};

// -----------------------------------------------------------------------------
// 9. SUBMISSIONS & GRADING CENTER SERVICE (`submissions`)
// -----------------------------------------------------------------------------

export const submissionsService = {
  async listPendingAndGradedSubmissions(): Promise<SubmissionRow[]> {
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "*, learner:profiles(*), content:contents(id, title, type, points_reward)"
      )
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as SubmissionRow[];
  },

  async submitQuizOrAssignmentAttempt(payload: {
    content_id: string;
    learner_id: string;
    answers_json: SubmissionAnswerJson[];
    score_percent: number;
    grading_status?: DbGradingStatus;
  }): Promise<SubmissionRow> {
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        ...payload,
        grading_status: payload.grading_status ?? "pending_review",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as SubmissionRow;
  },

  /**
   * Calls the Postgres RPC `grade_submission_and_update_enrollment` so marking
   * a submission as `passed` atomically updates `enrollments.status = 'passed'`
   * and awards points to `profiles.total_points`.
   */
  async gradeSubmissionRpc(params: {
    submissionId: string;
    gradingStatus: DbGradingStatus;
    scorePercent: number;
    mentorFeedback: string;
  }): Promise<SubmissionRow> {
    const { data, error } = await supabase.rpc(
      "grade_submission_and_update_enrollment",
      {
        p_submission_id: params.submissionId,
        p_grading_status: params.gradingStatus,
        p_score_percent: params.scorePercent,
        p_mentor_feedback: params.mentorFeedback,
      }
    );

    if (error) throw error;
    return data as SubmissionRow;
  },
};

// -----------------------------------------------------------------------------
// 10. DISCUSSIONS & CONTENT ISSUES SERVICE (`discussions` & `content_issues`)
// -----------------------------------------------------------------------------

export const discussionsAndIssuesService = {
  async listDiscussionsForContent(
    contentId: string,
    chapterId?: string
  ): Promise<DiscussionRow[]> {
    let query = supabase
      .from("discussions")
      .select(
        "*, author:profiles(id, full_name, role, job_title, avatar_url)"
      )
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });

    if (chapterId) {
      query = query.eq("chapter_id", chapterId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const allRows = (data ?? []) as DiscussionRow[];
    const rootMap = new Map<string, DiscussionRow>();
    const roots: DiscussionRow[] = [];

    allRows.forEach((row) => {
      row.replies = [];
      rootMap.set(row.id, row);
    });

    allRows.forEach((row) => {
      if (row.parent_id && rootMap.has(row.parent_id)) {
        rootMap.get(row.parent_id)!.replies!.push(row);
      } else {
        roots.push(row);
      }
    });

    return roots;
  },

  async createDiscussionPostOrReply(payload: {
    content_id: string;
    chapter_id?: string | null;
    parent_id?: string | null;
    author_id: string;
    title?: string | null;
    body: string;
  }): Promise<DiscussionRow> {
    const { data, error } = await supabase
      .from("discussions")
      .insert(payload)
      .select(
        "*, author:profiles(id, full_name, role, job_title, avatar_url)"
      )
      .single();

    if (error) throw error;
    return data as DiscussionRow;
  },

  async listIssuesForContent(contentId?: string): Promise<ContentIssueRow[]> {
    let query = supabase
      .from("content_issues")
      .select(
        "*, reporter:profiles(id, full_name, job_title), chapter:course_chapters(id, chapter_title)"
      )
      .order("created_at", { ascending: false });

    if (contentId) {
      query = query.eq("content_id", contentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ContentIssueRow[];
  },

  async reportContentIssue(payload: {
    content_id: string;
    chapter_id?: string | null;
    reporter_id: string;
    title: string;
    description: string;
  }): Promise<ContentIssueRow> {
    const { data, error } = await supabase
      .from("content_issues")
      .insert({
        ...payload,
        status: "open",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as ContentIssueRow;
  },

  async updateIssueStatus(
    issueId: string,
    status: DbIssueStatus
  ): Promise<ContentIssueRow> {
    const { data, error } = await supabase
      .from("content_issues")
      .update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", issueId)
      .select("*")
      .single();

    if (error) throw error;
    return data as ContentIssueRow;
  },
};
