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
  redeemAccessCodeAction,
  syncUserPointsAction,
} from "@/app/actions/lms-actions";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const { searchParams } = new URL(request.url);
  const courseKey = searchParams.get("courseKey") ?? undefined;

  const lessons = await rsLearning26BridgeService.fetchLessonsWithAssets(
    courseKey
  );

  return NextResponse.json(
    {
      ok: true,
      brand: "Ruang Sosmed 2.0",
      sourceArchitecture: "rs-learning-26",
      courses: RS_LEARNING_26_COURSES_SEED,
      lessons: lessons.length > 0 ? lessons : RS_LEARNING_26_LESSONS_SEED,
      reviews: RS_LEARNING_26_REVIEWS_SEED,
    },
    { headers: API_SECURITY_HEADERS }
  );
}

export async function POST(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  try {
    const caller = await verifyApiCaller(request);
    if (!caller.ok) {
      return caller.response;
    }

    const body = await request.json();
    const { action, payload } = body as {
      action:
        | "publish_content"
        | "evaluate_quiz"
        | "grade_submission"
        | "post_discussion"
        | "save_lesson_note_review"
        | "redeem_access_code"
        | "sync_user_points";
      payload: Record<string, unknown>;
    };

    if (
      (action === "publish_content" || action === "grade_submission") &&
      caller.role !== "admin" &&
      caller.role !== "mentor"
    ) {
      return NextResponse.json(
        { ok: false, error: "Akses ditolak: hanya Admin atau Mentor yang diizinkan." },
        { status: 403, headers: API_SECURITY_HEADERS }
      );
    }

    switch (action) {
      case "publish_content": {
        const res = await publishContentAction(
          payload as unknown as Parameters<typeof publishContentAction>[0]
        );
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      case "evaluate_quiz": {
        const res = await evaluateQuizAttemptAction(
          payload as unknown as Parameters<typeof evaluateQuizAttemptAction>[0]
        );
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      case "grade_submission": {
        const res = await gradeSubmissionAction(
          payload as unknown as Parameters<typeof gradeSubmissionAction>[0]
        );
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      case "post_discussion": {
        const res = await postChapterDiscussionAction(
          payload as unknown as Parameters<typeof postChapterDiscussionAction>[0]
        );
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      case "save_lesson_note_review": {
        const res = await saveLessonNoteAndReviewAction(
          payload as unknown as Parameters<
            typeof saveLessonNoteAndReviewAction
          >[0]
        );
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      case "redeem_access_code": {
        const rawPayload = (payload || {}) as Record<string, unknown>;
        const res = await redeemAccessCodeAction({
          code: String(rawPayload.code || ""),
          targetTitles: Array.isArray(rawPayload.targetTitles)
            ? rawPayload.targetTitles.map((t) => String(t || ""))
            : undefined,
          learnerId: caller.user.id,
          learnerEmail: caller.email || String(rawPayload.learnerEmail || ""),
          learnerName: caller.fullName || String(rawPayload.learnerName || ""),
          learnerUsername:
            typeof rawPayload.learnerUsername === "string"
              ? rawPayload.learnerUsername
              : undefined,
        });
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      case "sync_user_points": {
        const rawPayload = (payload || {}) as Record<string, unknown>;
        const isStaff = caller.role === "admin" || caller.role === "mentor";
        const res = await syncUserPointsAction({
          targetId: isStaff
            ? typeof rawPayload.targetId === "string"
              ? rawPayload.targetId
              : undefined
            : caller.user.id,
          targetEmail: isStaff
            ? typeof rawPayload.targetEmail === "string"
              ? rawPayload.targetEmail
              : caller.email
            : caller.email,
          targetName: isStaff
            ? typeof rawPayload.targetName === "string"
              ? rawPayload.targetName
              : caller.fullName
            : caller.fullName,
          targetUsername: isStaff
            ? typeof rawPayload.targetUsername === "string"
              ? rawPayload.targetUsername
              : undefined
            : undefined,
          newPoints: Number(rawPayload.newPoints ?? 0),
        });
        return NextResponse.json(res, { headers: API_SECURITY_HEADERS });
      }
      default:
        return NextResponse.json(
          { ok: false, error: "Aksi LMS tidak didukung." },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Terjadi kesalahan saat memproses permintaan LMS.",
      },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }
}
