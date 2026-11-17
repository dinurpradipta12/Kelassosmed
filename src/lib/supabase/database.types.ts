// =============================================================================
// RUANG SOSMED 2.0 LMS — SUPABASE DATABASE & JSONB TYPESCRIPT DEFINITIONS
// File: src/lib/supabase/database.types.ts
// Matches: supabase/migrations/001_ruang_sosmed_schema.sql
// =============================================================================

export type UserRole = "admin" | "mentor" | "learner";

export type DbContentType =
  | "course"
  | "page"
  | "quiz"
  | "assignment"
  | "learning_path"
  | "wiki";

export type DbContentUrgency = "urgent" | "not_urgent";
export type DbContentStatus = "draft" | "published" | "archived";

export type DbQuizQuestionType =
  | "multiple_choice"
  | "fill_blank"
  | "hotspot"
  | "open_ended"
  | "categorization";

export type DbEnrollmentStatus =
  | "not_started"
  | "in_progress"
  | "passed"
  | "failed"
  | "overdue";

export type DbGradingStatus = "pending_review" | "passed" | "failed";
export type DbIssueStatus = "open" | "resolved";

// -----------------------------------------------------------------------------
// JSONB Payload Schemas
// -----------------------------------------------------------------------------

export interface QuizSettingsJson {
  pass_mark: number;
  pass_unit: "percent" | "point";
  shuffle_questions: boolean;
  expanded_question: boolean;
  skip_and_attempt_later: boolean;
  adaptive_question_bank: boolean;
  max_attempts: number;
  timer_seconds: number;
  show_correct_answers: boolean;
}

export interface ChapterBodyBlockJson {
  id: string;
  block_type:
    | "paragraph"
    | "heading"
    | "callout"
    | "video"
    | "image"
    | "attachment";
  text?: string;
  media_url?: string;
  caption?: string;
  file_name?: string;
  file_size?: string;
}

export interface QuizOptionsJson {
  choices?: {
    id: string;
    text: string;
    is_correct: boolean;
  }[];
  blank_tokens?: string[];
  hotspot_target?: {
    x_percent: number;
    y_percent: number;
    radius_percent?: number;
    label: string;
  };
  categories?: {
    id: string;
    category_name: string;
    items: string[];
  }[];
  rubric_notes?: string;
}

export interface VersionSnapshotJson {
  title: string;
  description: string;
  sections_count?: number;
  chapters_count?: number;
  questions_count?: number;
  change_summary: string;
}

export interface SubmissionAnswerJson {
  question_id: string;
  question_title: string;
  selected_option_id?: string;
  blank_values?: Record<string, string>;
  hotspot_click?: { x: number; y: number };
  essay_response?: string;
  awarded_points?: number;
  max_points: number;
}

// -----------------------------------------------------------------------------
// Relational Table Row Interfaces (1–10)
// -----------------------------------------------------------------------------

/** 1. `profiles` */
export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  job_title: string;
  total_points: number;
  created_at: string;
}

/** 2. `projects` */
export interface ProjectRow {
  id: string;
  name: string;
  color_hex: string;
  created_by: string | null;
  created_at: string;
}

/** 3. `contents` */
export interface ContentRow {
  id: string;
  project_id: string | null;
  type: DbContentType;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category_tags: string[];
  urgency: DbContentUrgency;
  estimated_minutes: number;
  points_reward: number;
  status: DbContentStatus;
  settings_json: QuizSettingsJson;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 4A. `course_sections` */
export interface CourseSectionRow {
  id: string;
  content_id: string;
  section_title: string;
  order_index: number;
  created_at: string;
}

/** 4B. `course_chapters` */
export interface CourseChapterRow {
  id: string;
  content_id: string;
  section_id: string | null;
  section_title: string;
  chapter_title: string;
  order_index: number;
  body_blocks: ChapterBodyBlockJson[];
  video_url: string | null;
  estimated_minutes: number;
  points: number;
  created_at: string;
  updated_at: string;
}

/** 5. `learning_path_items` */
export interface LearningPathItemRow {
  id: string;
  learning_path_id: string;
  content_id: string;
  stage_name: string;
  order_index: number;
  created_at: string;
  content?: ContentRow;
}

/** 6. `quiz_questions` */
export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  question_type: DbQuizQuestionType;
  prompt_text: string;
  media_url: string | null;
  timer_seconds: number;
  points: number;
  options_json: QuizOptionsJson;
  order_index: number;
  created_at: string;
}

/** 7. `content_versions` */
export interface ContentVersionRow {
  id: string;
  content_id: string;
  version_number: string;
  snapshot_json: VersionSnapshotJson;
  edited_by: string | null;
  created_at: string;
  editor?: Pick<ProfileRow, "id" | "full_name" | "avatar_url">;
}

/** 8. `enrollments` (Assignees) */
export interface EnrollmentRow {
  id: string;
  content_id: string;
  learner_id: string;
  status: DbEnrollmentStatus;
  progress_percent: number;
  completed_chapter_ids: string[];
  due_date: string | null;
  assigned_at: string;
  updated_at: string;
  learner?: ProfileRow;
  content?: ContentRow;
}

/** 9. `submissions` (Quiz & Assignment Attempts) */
export interface SubmissionRow {
  id: string;
  content_id: string;
  learner_id: string;
  answers_json: SubmissionAnswerJson[];
  score_percent: number;
  grading_status: DbGradingStatus;
  mentor_feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  graded_by: string | null;
  learner?: ProfileRow;
  content?: Pick<ContentRow, "id" | "title" | "type" | "points_reward">;
}

/** 10A. `discussions` */
export interface DiscussionRow {
  id: string;
  content_id: string;
  chapter_id: string | null;
  parent_id: string | null;
  author_id: string;
  title: string | null;
  body: string;
  views_count: number;
  created_at: string;
  author?: Pick<ProfileRow, "id" | "full_name" | "role" | "job_title" | "avatar_url">;
  replies?: DiscussionRow[];
}

/** 10B. `content_issues` */
export interface ContentIssueRow {
  id: string;
  content_id: string;
  chapter_id: string | null;
  reporter_id: string;
  title: string;
  description: string;
  status: DbIssueStatus;
  created_at: string;
  resolved_at: string | null;
  reporter?: Pick<ProfileRow, "id" | "full_name" | "job_title">;
  chapter?: Pick<CourseChapterRow, "id" | "chapter_title">;
}

// -----------------------------------------------------------------------------
// Relational Table Row Interfaces Ported from `rs-learning-26` (002_rs_learning_26_integration.sql)
// -----------------------------------------------------------------------------

export interface RsCourseRow {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  thumbnail_url: string;
  lesson_count: number;
  sort_order: number;
  status: "open" | "coming_soon";
  linked_content_id: string | null;
  created_at: string;
}

export interface RsLessonRow {
  lesson_key: string;
  course_key: string;
  sort_order: number;
  title: string;
  duration: string;
  meta: string;
  description: string;
  video_url: string;
  thumbnail_url?: string | null;
  coming_soon?: boolean | null;
  available_at?: string | null;
  unlock_event_id?: string | null;
  linked_chapter_id?: string | null;
  updated_at?: string;
}

export interface RsLessonAssetRow {
  asset_key: string;
  lesson_key: string;
  sort_order: number;
  title: string;
  type: string;
  note: string;
  storage_path: string | null;
  external_url: string | null;
  updated_at?: string;
}

export interface RsLessonReviewRow {
  id: string;
  lesson_key: string;
  reviewer_name: string;
  reviewer_username: string | null;
  rating: number;
  feedback: string;
  created_at: string;
}

export interface RsLessonProgressRow {
  session_username: string;
  lesson_key: string;
  completed_at: string;
}

export interface RsLessonNoteRow {
  id: string;
  username: string;
  lesson_key: string;
  course_key: string;
  content: string;
  updated_at: string;
}

export interface RsSharedAssetRow {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  type: string;
  coin_cost: number;
  feature_claimable: boolean;
  sort_order: number;
  created_at: string;
}

export interface RsForumThreadRow {
  id: string;
  author_username: string;
  author_display_name: string;
  category: string;
  title: string;
  body: string;
  image_url: string | null;
  view_count: number;
  edited?: boolean;
  created_at: string;
}

export interface RsForumReplyRow {
  id: string;
  thread_id: string;
  author_username: string;
  author_display_name: string;
  body: string;
  image_url: string | null;
  upvotes: number;
  parent_reply_id: string | null;
  answered?: boolean;
  created_at: string;
}

export interface RsUserProfileRow {
  username: string;
  name: string;
  email: string;
  job_title: string;
  birth_date: string | null;
  show_birthday?: boolean | null;
  joined_at: string;
  avatar_path: string | null;
  checkin_streak?: number;
  last_checkin?: string | null;
}

export interface RsUserSubscriptionRow {
  username: string;
  status: string;
  started_at: string;
  due_at: string;
  payment_method: string;
  renewal_status: string;
}
