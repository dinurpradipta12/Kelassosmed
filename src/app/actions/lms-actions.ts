"use server";

// =============================================================================
// RUANG SOSMED 2.0 LMS — NEXT.JS SERVER ACTIONS
// File: src/app/actions/lms-actions.ts
// Handles server-side content publishing, quiz evaluation, assignment grading,
// chapter discussions, and `rs-learning-26` lesson notes & reviews sync.
// =============================================================================

import { revalidatePath } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ContentType } from "@/lib/design-tokens";

export interface PublishContentPayload {
  id?: string;
  title: string;
  type: ContentType;
  project: string;
  urgency: "Urgent" | "Not Urgent";
  estimatedDuration?: string;
  points?: number;
  categoryTags?: string[];
  description?: string;
}

export async function publishContentAction(payload: PublishContentPayload) {
  const contentId = payload.id ?? `item-${payload.type}-${Date.now()}`;
  const updatedAt = new Date().toISOString();

  if (isSupabaseConfigured) {
    await supabase.from("contents").upsert({
      id: contentId,
      title: payload.title,
      type: payload.type,
      description: payload.description ?? "",
      category_tags: payload.categoryTags ?? ["Ruang Sosmed 2.0"],
      urgency: payload.urgency === "Urgent" ? "urgent" : "not_urgent",
      points_reward: payload.points ?? 100,
      status: "published",
      updated_at: updatedAt,
    });
  }

  revalidatePath("/");
  return {
    ok: true,
    contentId,
    publishedAt: updatedAt,
  };
}

export interface EvaluateQuizPayload {
  quizId: string;
  learnerId: string;
  correctCount: number;
  totalQuestions: number;
  passMarkPercent?: number;
}

export async function evaluateQuizAttemptAction(payload: EvaluateQuizPayload) {
  const passMark = payload.passMarkPercent ?? 80;
  const scorePercent =
    payload.totalQuestions > 0
      ? Math.round((payload.correctCount / payload.totalQuestions) * 100)
      : 0;
  const passed = scorePercent >= passMark;
  const pointsEarned = passed ? 120 : 0;

  if (isSupabaseConfigured) {
    await supabase.from("submissions").insert({
      content_id: payload.quizId,
      learner_id: payload.learnerId,
      score_percent: scorePercent,
      grading_status: passed ? "passed" : "failed",
      submitted_at: new Date().toISOString(),
    });
  }

  revalidatePath("/");
  return {
    ok: true,
    scorePercent,
    passed,
    pointsEarned,
  };
}

export interface GradeSubmissionPayload {
  submissionId: string;
  contentId: string;
  learnerId: string;
  scorePercent: number;
  status: "passed" | "failed";
  feedback: string;
}

export async function gradeSubmissionAction(payload: GradeSubmissionPayload) {
  const gradedAt = new Date().toISOString();

  if (isSupabaseConfigured) {
    await supabase
      .from("submissions")
      .update({
        score_percent: payload.scorePercent,
        grading_status: payload.status,
        mentor_feedback: payload.feedback,
        graded_at: gradedAt,
      })
      .eq("id", payload.submissionId);
  }

  revalidatePath("/");
  return {
    ok: true,
    submissionId: payload.submissionId,
    gradedAt,
  };
}

export interface PostChapterDiscussionPayload {
  contentId: string;
  chapterId?: string;
  authorName: string;
  authorUsername: string;
  title: string;
  body: string;
}

export async function postChapterDiscussionAction(
  payload: PostChapterDiscussionPayload
) {
  const discussionId = `disc-${Date.now()}`;
  const createdAt = new Date().toISOString();

  if (isSupabaseConfigured) {
    await Promise.allSettled([
      supabase.from("discussions").insert({
        id: discussionId,
        content_id: payload.contentId,
        chapter_id: payload.chapterId ?? null,
        title: payload.title,
        body: payload.body,
        created_at: createdAt,
      }),
      supabase.from("forum_threads").upsert({
        id: discussionId,
        author_username: payload.authorUsername,
        author_display_name: payload.authorName,
        category: "Course Q&A",
        title: payload.title,
        body: payload.body,
        view_count: 1,
        created_at: createdAt,
      }),
    ]);
  }

  revalidatePath("/");
  return {
    ok: true,
    discussionId,
    createdAt,
  };
}

export async function saveLessonNoteAndReviewAction(payload: {
  username: string;
  reviewerName: string;
  lessonKey: string;
  courseKey?: string;
  noteContent?: string;
  rating?: number;
  feedback?: string;
}) {
  const updatedAt = new Date().toISOString();

  if (isSupabaseConfigured) {
    if (typeof payload.noteContent === "string") {
      await supabase.from("lesson_notes").upsert(
        {
          username: payload.username,
          lesson_key: payload.lessonKey,
          course_key: payload.courseKey ?? "lms",
          content: payload.noteContent,
          updated_at: updatedAt,
        },
        { onConflict: "username,lesson_key" }
      );
    }

    if (payload.rating && payload.feedback?.trim()) {
      await supabase.from("lesson_reviews").insert({
        lesson_key: payload.lessonKey,
        reviewer_name: payload.reviewerName,
        reviewer_username: payload.username,
        rating: payload.rating,
        feedback: payload.feedback.trim(),
      });
    }
  }

  revalidatePath("/");
  return {
    ok: true,
    updatedAt,
  };
}
