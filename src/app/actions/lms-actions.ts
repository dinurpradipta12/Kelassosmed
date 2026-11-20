"use server";

// =============================================================================
// RUANG SOSMED 2.0 LMS — NEXT.JS SERVER ACTIONS
// File: src/app/actions/lms-actions.ts
// Handles server-side content publishing, quiz evaluation, assignment grading,
// chapter discussions, and `rs-learning-26` lesson notes & reviews sync.
// =============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ContentType } from "@/lib/design-tokens";
import { getItemAccessCode, type ExplorerItemType } from "@/lib/phase2-data";

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

export interface RedeemAccessCodePayload {
  code: string;
  targetTitles?: string[];
  learnerId?: string;
  learnerEmail?: string;
  learnerName?: string;
  learnerUsername?: string;
}

function createServiceRoleClient() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function mapDbRowTypeToExplorer(
  dbType: string | null | undefined,
  metaItemType?: string | null,
  isFolderMeta?: boolean
): ExplorerItemType {
  if (isFolderMeta || String(dbType || "").toLowerCase() === "folder") {
    return "Folder";
  }
  if (
    metaItemType === "Course" ||
    metaItemType === "Page" ||
    metaItemType === "Quiz" ||
    metaItemType === "Learning Path" ||
    metaItemType === "Wiki" ||
    metaItemType === "Folder"
  ) {
    return metaItemType;
  }
  switch (String(dbType || "").toLowerCase()) {
    case "quiz":
      return "Quiz";
    case "page":
      return "Page";
    case "learning_path":
      return "Learning Path";
    case "wiki":
      return "Wiki";
    default:
      return "Course";
  }
}

export async function redeemAccessCodeAction(payload: RedeemAccessCodePayload) {
  const cleanCode = (payload.code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");

  if (!cleanCode) {
    return {
      ok: false,
      error: "Kode akses tidak boleh kosong.",
      updatedCount: 0,
      matchedTitles: [] as string[],
    };
  }

  const adminClient = createServiceRoleClient();
  if (!adminClient) {
    return {
      ok: false,
      error: "Service role client belum tersedia.",
      updatedCount: 0,
      matchedTitles: [] as string[],
    };
  }

  const { data: rows, error: fetchErr } = await adminClient
    .from("contents")
    .select(
      "id, title, type, status, folder_name, access_code, settings_json"
    )
    .not("title", "ilike", "__SYSTEM_%");

  if (fetchErr || !Array.isArray(rows)) {
    return {
      ok: false,
      error: fetchErr?.message || "Gagal memuat data materi.",
      updatedCount: 0,
      matchedTitles: [] as string[],
    };
  }

  const activeRows = rows.filter((row: any) => {
    const meta = row?.settings_json?.explorer_meta || {};
    const statusLower = String(row?.status || "").toLowerCase();
    return statusLower !== "archived" && !meta.isArchived;
  });

  const targetTitleSet = new Set(
    (payload.targetTitles || [])
      .map((t) => String(t || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const directMatches = activeRows.filter((row: any) => {
    const meta = row?.settings_json?.explorer_meta || {};
    const resolvedType = mapDbRowTypeToExplorer(
      row.type,
      meta.itemType,
      Boolean(meta.isFolder)
    );
    const resolvedFolderName = row.folder_name || meta.folderName || undefined;
    const explicitCode = String(row.access_code || meta.accessCode || "").trim();
    const resolvedCode = getItemAccessCode({
      title: row.title,
      type: resolvedType,
      folderName: resolvedFolderName,
      id: row.id,
      accessCode: explicitCode || undefined,
    });
    if (resolvedCode === cleanCode) return true;
    // Allow title match fallback ONLY when the DB row has no conflicting explicit code
    if (
      !explicitCode &&
      targetTitleSet.has(String(row.title || "").trim().toLowerCase())
    ) {
      return true;
    }
    return false;
  });

  if (directMatches.length === 0) {
    return {
      ok: false,
      error: `Kode akses "${cleanCode}" tidak ditemukan di database.`,
      updatedCount: 0,
      matchedTitles: [] as string[],
    };
  }

  const expandedMap = new Map<string, any>();
  for (const row of directMatches) {
    expandedMap.set(row.id, row);
    const meta = row?.settings_json?.explorer_meta || {};
    const isFolderRow =
      String(row.type || "").toLowerCase() === "folder" ||
      Boolean(meta.isFolder);
    if (isFolderRow) {
      const folderLower = String(row.title || "").trim().toLowerCase();
      for (const candidate of activeRows) {
        if (candidate.id === row.id) continue;
        const cMeta = candidate?.settings_json?.explorer_meta || {};
        const cIsFolder =
          String(candidate.type || "").toLowerCase() === "folder" ||
          Boolean(cMeta.isFolder);
        if (cIsFolder) continue;
        const cFolderName = String(
          candidate.folder_name || cMeta.folderName || ""
        )
          .trim()
          .toLowerCase();
        if (cFolderName && cFolderName === folderLower) {
          expandedMap.set(candidate.id, candidate);
        }
      }
    }
  }

  const tokensToAdd = Array.from(
    new Set(
      [payload.learnerName, payload.learnerEmail, payload.learnerUsername]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    )
  );

  const matchedTitles: string[] = [];
  let updatedCount = 0;

  for (const row of expandedMap.values()) {
    const existingSettings =
      row?.settings_json && typeof row.settings_json === "object"
        ? row.settings_json
        : {};
    const existingMeta =
      existingSettings.explorer_meta &&
      typeof existingSettings.explorer_meta === "object"
        ? existingSettings.explorer_meta
        : {};
    const existingLearners: string[] = Array.isArray(
      existingMeta.assignedLearners
    )
      ? existingMeta.assignedLearners
      : [];

    const dedupMap = new Map<string, string>();
    [...existingLearners, ...tokensToAdd].forEach((entry) => {
      const clean = String(entry || "").trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!dedupMap.has(key)) dedupMap.set(key, clean);
    });
    const nextLearners = Array.from(dedupMap.values());

    const resolvedType = mapDbRowTypeToExplorer(
      row.type,
      existingMeta.itemType,
      Boolean(existingMeta.isFolder)
    );
    const resolvedAccessCode = getItemAccessCode({
      title: row.title,
      type: resolvedType,
      folderName: row.folder_name || existingMeta.folderName,
      id: row.id,
      accessCode: row.access_code || existingMeta.accessCode,
    });

    const nextSettings = {
      ...existingSettings,
      explorer_meta: {
        ...existingMeta,
        accessCode: resolvedAccessCode,
        assignedLearners: nextLearners,
        assignedCount: nextLearners.length,
      },
    };

    const { error: updateErr } = await adminClient
      .from("contents")
      .update({
        access_code: resolvedAccessCode,
        settings_json: nextSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateErr && String(updateErr.message || "").includes("access_code")) {
      await adminClient
        .from("contents")
        .update({
          settings_json: nextSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }

    const isFolderRow = resolvedType === "Folder";
    const isUuidCaller =
      typeof payload.learnerId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.learnerId
      );

    if (!isFolderRow && isUuidCaller) {
      await adminClient.from("enrollments").upsert(
        {
          content_id: row.id,
          learner_id: payload.learnerId,
          status: "not_started",
          progress_percent: 0,
          completed_chapter_ids: [],
        },
        {
          onConflict: "content_id,learner_id",
          ignoreDuplicates: true,
        }
      );
    }

    updatedCount += 1;
    matchedTitles.push(row.title);
  }

  revalidatePath("/");
  return {
    ok: updatedCount > 0,
    updatedCount,
    matchedTitles,
  };
}

export interface SyncUserPointsPayload {
  targetId?: string;
  targetEmail?: string;
  targetName?: string;
  targetUsername?: string;
  newPoints: number;
}

export async function syncUserPointsAction(payload: SyncUserPointsPayload) {
  const cleanPoints = Math.max(0, Math.round(Number(payload.newPoints) || 0));
  const adminClient = createServiceRoleClient();
  if (!adminClient) {
    return {
      ok: false,
      error: "Service role client belum tersedia.",
      points: cleanPoints,
    };
  }

  const targetId = (payload.targetId || "").trim();
  const targetEmail = (payload.targetEmail || "").trim();
  const targetName = (payload.targetName || "").trim();
  const targetUsername = (payload.targetUsername || "").trim().replace(/^@+/, "");
  const isUuidId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      targetId
    );

  let updatedProfiles = 0;
  let updatedUserProfiles = 0;

  try {
    if (isUuidId) {
      const { data } = await adminClient
        .from("profiles")
        .update({ total_points: cleanPoints })
        .eq("id", targetId)
        .select("id");
      if (Array.isArray(data)) updatedProfiles += data.length;
    }

    if (updatedProfiles === 0 && targetEmail) {
      const { data } = await adminClient
        .from("profiles")
        .update({ total_points: cleanPoints })
        .ilike("email", targetEmail)
        .select("id");
      if (Array.isArray(data)) updatedProfiles += data.length;
    }

    if (updatedProfiles === 0 && targetName) {
      const { data } = await adminClient
        .from("profiles")
        .update({ total_points: cleanPoints })
        .ilike("full_name", targetName)
        .select("id");
      if (Array.isArray(data)) updatedProfiles += data.length;
    }
  } catch {}

  try {
    const matchedRows: any[] = [];
    if (isUuidId) {
      const { data } = await adminClient
        .from("user_profiles")
        .select("username, email, perks")
        .eq("user_id", targetId);
      if (Array.isArray(data)) matchedRows.push(...data);
    }
    if (matchedRows.length === 0 && targetEmail) {
      const { data } = await adminClient
        .from("user_profiles")
        .select("username, email, perks")
        .ilike("email", targetEmail);
      if (Array.isArray(data)) matchedRows.push(...data);
    }
    if (matchedRows.length === 0 && targetUsername) {
      const { data } = await adminClient
        .from("user_profiles")
        .select("username, email, perks")
        .ilike("username", targetUsername);
      if (Array.isArray(data)) matchedRows.push(...data);
    }
    if (matchedRows.length === 0 && targetName) {
      const { data } = await adminClient
        .from("user_profiles")
        .select("username, email, perks")
        .ilike("full_name", targetName);
      if (Array.isArray(data)) matchedRows.push(...data);
    }

    const seenUsernames = new Set<string>();
    for (const row of matchedRows) {
      const uname = String(row?.username || "").trim();
      const rowEmail = String(row?.email || "").trim();
      const dedupKey = (uname || rowEmail).toLowerCase();
      if (!dedupKey || seenUsernames.has(dedupKey)) continue;
      seenUsernames.add(dedupKey);

      const nextPerks = {
        ...(row?.perks && typeof row.perks === "object" ? row.perks : {}),
        total_points: cleanPoints,
        points: cleanPoints,
      };

      if (uname) {
        const { error } = await adminClient
          .from("user_profiles")
          .update({
            perks: nextPerks,
            updated_at: new Date().toISOString(),
          })
          .eq("username", uname);
        if (!error) updatedUserProfiles += 1;
      } else if (rowEmail) {
        const { error } = await adminClient
          .from("user_profiles")
          .update({
            perks: nextPerks,
            updated_at: new Date().toISOString(),
          })
          .ilike("email", rowEmail);
        if (!error) updatedUserProfiles += 1;
      }
    }
  } catch {}

  revalidatePath("/");
  return {
    ok: updatedProfiles > 0 || updatedUserProfiles > 0,
    points: cleanPoints,
    updatedProfiles,
    updatedUserProfiles,
  };
}

export interface DeleteDiscussionPayload {
  threadId: string;
  replyId?: string;
}

export async function deleteDiscussionAction(
  payload: DeleteDiscussionPayload,
  scopedClient?: any
) {
  const threadId = (payload.threadId || "").trim();
  const replyId = (payload.replyId || "").trim() || undefined;

  if (!threadId) {
    return {
      ok: false,
      error: "ID diskusi tidak valid.",
      threadId: "",
      replyId,
    };
  }

  const client =
    createServiceRoleClient() ??
    scopedClient ??
    (isSupabaseConfigured ? supabase : null);
  if (!client) {
    revalidatePath("/");
    return {
      ok: true,
      threadId,
      replyId,
      localOnly: true,
    };
  }

  const tombstoneAndDeleteThread = async () => {
    try {
      await client
        .from("mentor_inbox_threads")
        .update({
          title: "__DELETED__",
          excerpt: "__DELETED__",
          replies: [],
          replies_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);
    } catch {}

    await Promise.allSettled([
      client.from("mentor_inbox_threads").delete().eq("id", threadId),
      client.from("discussions").delete().eq("id", threadId),
      client.from("forum_threads").delete().eq("id", threadId),
    ]);
  };

  try {
    if (!replyId) {
      await tombstoneAndDeleteThread();
    } else {
      const { data: row } = await client
        .from("mentor_inbox_threads")
        .select("id, replies")
        .eq("id", threadId)
        .maybeSingle();

      const currentReplies = Array.isArray(row?.replies) ? row.replies : [];
      const filteredReplies = currentReplies.filter(
        (r: any) => String(r?.id || "") !== replyId
      );

      if (filteredReplies.length === 0) {
        await tombstoneAndDeleteThread();
      } else {
        const lastReply = filteredReplies[filteredReplies.length - 1];
        await client
          .from("mentor_inbox_threads")
          .update({
            replies: filteredReplies,
            replies_count: filteredReplies.length,
            excerpt: String(lastReply?.message || ""),
            updated_at: new Date().toISOString(),
          })
          .eq("id", threadId);
      }
    }
  } catch {
    // Ignore optional table errors
  }

  revalidatePath("/");
  return {
    ok: true,
    threadId,
    replyId,
  };
}
