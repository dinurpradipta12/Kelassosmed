// =============================================================================
// RUANG SOSMED 2.0 LMS — REST API ROUTE HANDLER (`/api/lms`)
// File: src/app/api/lms/route.ts
// Provides JSON endpoints for lessons, assets, reviews, notes, and evaluations
// bridging Ruang Sosmed 2.0 with `rs-learning-26`.
// =============================================================================

import { NextResponse } from "next/server";
import {
  rsLearning26BridgeService,
  RS_LEARNING_26_COURSES_SEED,
  RS_LEARNING_26_LESSONS_SEED,
  RS_LEARNING_26_REVIEWS_SEED,
} from "@/lib/supabase/rs-learning-26-bridge";
import {
  publishContentAction,
  evaluateQuizAttemptAction,
  gradeSubmissionAction,
  postChapterDiscussionAction,
  saveLessonNoteAndReviewAction,
} from "@/app/actions/lms-actions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseKey = searchParams.get("courseKey") ?? undefined;

  const lessons = await rsLearning26BridgeService.fetchLessonsWithAssets(
    courseKey
  );

  return NextResponse.json({
    ok: true,
    brand: "Ruang Sosmed 2.0",
    sourceArchitecture: "rs-learning-26",
    courses: RS_LEARNING_26_COURSES_SEED,
    lessons: lessons.length > 0 ? lessons : RS_LEARNING_26_LESSONS_SEED,
    reviews: RS_LEARNING_26_REVIEWS_SEED,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body as {
      action:
        | "publish_content"
        | "evaluate_quiz"
        | "grade_submission"
        | "post_discussion"
        | "save_lesson_note_review";
      payload: Record<string, unknown>;
    };

    switch (action) {
      case "publish_content": {
        const res = await publishContentAction(
          payload as unknown as Parameters<typeof publishContentAction>[0]
        );
        return NextResponse.json(res);
      }
      case "evaluate_quiz": {
        const res = await evaluateQuizAttemptAction(
          payload as unknown as Parameters<typeof evaluateQuizAttemptAction>[0]
        );
        return NextResponse.json(res);
      }
      case "grade_submission": {
        const res = await gradeSubmissionAction(
          payload as unknown as Parameters<typeof gradeSubmissionAction>[0]
        );
        return NextResponse.json(res);
      }
      case "post_discussion": {
        const res = await postChapterDiscussionAction(
          payload as unknown as Parameters<typeof postChapterDiscussionAction>[0]
        );
        return NextResponse.json(res);
      }
      case "save_lesson_note_review": {
        const res = await saveLessonNoteAndReviewAction(
          payload as unknown as Parameters<
            typeof saveLessonNoteAndReviewAction
          >[0]
        );
        return NextResponse.json(res);
      }
      default:
        return NextResponse.json(
          { ok: false, error: "Unsupported LMS action" },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
