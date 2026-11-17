"use client";

// =============================================================================
// RUANG SOSMED 2.0 LMS — DATA-FETCHING & MUTATION HOOKS FOR SUPABASE
// File: src/hooks/useRuangSosmedSupabase.ts
// Bridges the Supabase Client Service Layer (`src/lib/supabase/services.ts`)
// with `useRuangSosmedStore()` so components get instant optimistic updates
// plus live Supabase persistence & Realtime Postgres subscriptions.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  isSupabaseConfigured,
  getCurrentAuthProfile,
  uploadCourseOrQuizMedia,
  uploadAttachmentTemplate,
  uploadUserAvatar,
} from "@/lib/supabase/client";
import {
  profilesService,
  contentsService,
  curriculumService,
  enrollmentsService,
  submissionsService,
  discussionsAndIssuesService,
  versionsService,
} from "@/lib/supabase/services";
import type {
  ProfileRow,
  ContentRow,
  DbContentType,
  DbContentUrgency,
  SubmissionAnswerJson,
} from "@/lib/supabase/database.types";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import type { ContentType } from "@/lib/design-tokens";

const UI_TO_DB_CONTENT_TYPE: Record<ContentType, DbContentType> = {
  Course: "course",
  Page: "page",
  Quiz: "quiz",
  Assignment: "assignment",
  "Learning Path": "learning_path",
  Wiki: "wiki",
};

// -----------------------------------------------------------------------------
// 1. Hook: Auth Profile & Top Learner Leaderboard (`useSupabaseProfile`)
// -----------------------------------------------------------------------------

export function useSupabaseProfile() {
  const { leaderboard, learnerPoints } = useRuangSosmedStore();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    getCurrentAuthProfile()
      .then((res) => {
        if (mounted) setProfile(res);
      })
      .catch((err: unknown) => {
        if (mounted)
          setError(err instanceof Error ? err.message : "Auth profile error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return {
    profile,
    leaderboard,
    learnerPoints: profile?.total_points ?? learnerPoints,
    loading,
    error,
    isSupabaseConfigured,
  };
}

// -----------------------------------------------------------------------------
// 2. Hook: Learning Contents Catalog & Authoring Mutations (`useSupabaseContents`)
// -----------------------------------------------------------------------------

export function useSupabaseContents() {
  const store = useRuangSosmedStore();
  const [remoteContents, setRemoteContents] = useState<ContentRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContents = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const rows = await contentsService.listContents();
      setRemoteContents(rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch contents");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const publishContentMutation = useCallback(
    async (params: {
      type: ContentType;
      title: string;
      description?: string;
      urgency?: "Urgent" | "Not Urgent";
      estimatedMinutes?: number;
      pointsReward?: number;
    }) => {
      // 1. Optimistic update in unified store
      store.publishContentToStudioAndCatalog(
        params.type,
        params.title,
        params.description,
        params.urgency
      );

      // 2. Persist to Supabase `contents` + `content_versions` if configured
      if (!isSupabaseConfigured) return null;

      setIsSyncing(true);
      try {
        const saved = await contentsService.upsertContent({
          type: UI_TO_DB_CONTENT_TYPE[params.type],
          title: params.title,
          description: params.description ?? "",
          urgency:
            params.urgency === "Urgent"
              ? ("urgent" as DbContentUrgency)
              : ("not_urgent" as DbContentUrgency),
          estimated_minutes: params.estimatedMinutes ?? 60,
          points_reward: params.pointsReward ?? 100,
          status: "published",
        });

        await versionsService.createVersionSnapshot({
          content_id: saved.id,
          version_number: `v1.${store.versions.length + 1}`,
          snapshot_json: {
            title: saved.title,
            description: saved.description,
            change_summary: `Published ${params.type} "${params.title}" to Catalog`,
          },
        });

        await fetchContents();
        return saved;
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to publish content"
        );
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [store, fetchContents]
  );

  const deleteContentMutation = useCallback(
    async (contentId: string) => {
      store.deleteExplorerItem(contentId);
      if (!isSupabaseConfigured) return;
      try {
        await contentsService.deleteContent(contentId);
        await fetchContents();
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to delete content"
        );
      }
    },
    [store, fetchContents]
  );

  return {
    explorerItems: store.explorerItems,
    learnerCatalogItems: store.learnerAssignedItems,
    remoteContents,
    isSyncing,
    error,
    publishContentMutation,
    deleteContentMutation,
    refetchContents: fetchContents,
  };
}

// -----------------------------------------------------------------------------
// 3. Hook: Enrollments, Assigning Learners & Chapter Progress (`useSupabaseEnrollments`)
// -----------------------------------------------------------------------------

export function useSupabaseEnrollments() {
  const store = useRuangSosmedStore();
  const [isMutating, setIsMutating] = useState(false);

  const assignLearnersMutation = useCallback(
    async (params: {
      contentItem: (typeof store.explorerItems)[number];
      learnerNames: string[];
      learnerUuids?: string[];
      dueDate: string;
      batchMode: string;
    }) => {
      // Optimistic store update
      store.assignContentToLearners(
        params.contentItem,
        params.learnerNames,
        params.dueDate,
        params.batchMode
      );

      if (!isSupabaseConfigured || !params.learnerUuids?.length) return;

      setIsMutating(true);
      try {
        await enrollmentsService.assignLearnersToContent({
          contentId: params.contentItem.id,
          learnerIds: params.learnerUuids,
          dueDate: params.dueDate,
        });
      } finally {
        setIsMutating(false);
      }
    },
    [store]
  );

  const completeChapterMutation = useCallback(
    async (params: {
      contentId?: string;
      chapterId: string;
      pointsReward: number;
      learnerId?: string;
    }) => {
      const newlyCompleted = store.markLearnerChapterComplete(
        params.chapterId,
        params.pointsReward
      );

      if (
        isSupabaseConfigured &&
        newlyCompleted &&
        params.contentId &&
        params.learnerId
      ) {
        setIsMutating(true);
        try {
          await enrollmentsService.markChapterCompletedRpc({
            contentId: params.contentId,
            chapterId: params.chapterId,
            learnerId: params.learnerId,
          });
        } finally {
          setIsMutating(false);
        }
      }

      return newlyCompleted;
    },
    [store]
  );

  return {
    assignees: store.assignees,
    learnerAssignedItems: store.learnerAssignedItems,
    courseSections: store.courseSections,
    isMutating,
    assignLearnersMutation,
    completeChapterMutation,
    manageAssigneeAction: store.manageAssigneeAction,
  };
}

// -----------------------------------------------------------------------------
// 4. Hook: Quiz / Assignment Submissions & Mentor Grading (`useSupabaseSubmissions`)
// -----------------------------------------------------------------------------

export function useSupabaseSubmissions() {
  const store = useRuangSosmedStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAssessmentMutation = useCallback(
    async (params: {
      contentId?: string;
      learnerId?: string;
      title: string;
      submissionType: "Quiz" | "Assignment";
      openEndedAnswer: string;
      autoScorePct: number;
      structuredAnswers?: SubmissionAnswerJson[];
    }) => {
      // 1. Optimistic sync to Admin Dashboard Ungraded Quiz Table & Grading Center
      store.submitLearnerQuizOrAssignment({
        title: params.title,
        submissionType: params.submissionType,
        openEndedAnswer: params.openEndedAnswer,
        autoScorePct: params.autoScorePct,
      });

      // 2. Persist to Supabase `submissions` table if configured
      if (!isSupabaseConfigured || !params.contentId || !params.learnerId) {
        return;
      }

      setIsSubmitting(true);
      try {
        await submissionsService.submitQuizOrAssignmentAttempt({
          content_id: params.contentId,
          learner_id: params.learnerId,
          score_percent: params.autoScorePct,
          grading_status: "pending_review",
          answers_json: params.structuredAnswers ?? [
            {
              question_id: "q-5",
              question_title: "Open-Ended Campaign Diagnostic",
              essay_response: params.openEndedAnswer,
              max_points: 50,
            },
          ],
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [store]
  );

  const evaluateSubmissionMutation = useCallback(
    async (params: {
      submissionId: string;
      decision: "Passed" | "Revision Requested";
      scorePercent?: number;
      updatedScores?: { id: string; awardedPoints: number }[];
      overallFeedback?: string;
    }) => {
      // 1. Optimistic store update (unlocks certificate & updates gauge)
      store.evaluateSubmissionInGradingCenter(
        params.submissionId,
        params.decision,
        params.updatedScores,
        params.overallFeedback
      );

      // 2. Call transactional Postgres RPC `grade_submission_and_update_enrollment`
      if (!isSupabaseConfigured) return;

      setIsSubmitting(true);
      try {
        await submissionsService.gradeSubmissionRpc({
          submissionId: params.submissionId,
          gradingStatus: params.decision === "Passed" ? "passed" : "failed",
          scorePercent: params.scorePercent ?? 90,
          mentorFeedback: params.overallFeedback ?? "",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [store]
  );

  return {
    ungradedQuizzes: store.ungradedQuizzes,
    gradingSubmissions: store.gradingSubmissions,
    certificateUnlocked: store.certificateUnlocked,
    isSubmitting,
    submitAssessmentMutation,
    evaluateSubmissionMutation,
  };
}

// -----------------------------------------------------------------------------
// 5. Hook: Discussions & Content Issue Tracker (`useSupabaseDiscussionsAndIssues`)
// -----------------------------------------------------------------------------

export function useSupabaseDiscussionsAndIssues() {
  const store = useRuangSosmedStore();

  const postDiscussionMutation = useCallback(
    async (params: {
      contentId?: string;
      chapterId?: string;
      threadId?: string;
      chapterTitle: string;
      authorId?: string;
      authorName: string;
      authorRole: string;
      authorInitials: string;
      avatarBg: string;
      avatarText: string;
      message: string;
    }) => {
      store.postDiscussionMessage(params);

      if (isSupabaseConfigured && params.contentId && params.authorId) {
        await discussionsAndIssuesService.createDiscussionPostOrReply({
          content_id: params.contentId,
          chapter_id: params.chapterId ?? null,
          parent_id: params.threadId ?? null,
          author_id: params.authorId,
          title: params.chapterTitle,
          body: params.message,
        });
      }
    },
    [store]
  );

  const reportIssueMutation = useCallback(
    async (params: {
      contentId?: string;
      chapterId?: string;
      reporterId?: string;
      chapterTitle: string;
      issueDescription: string;
    }) => {
      store.reportContentIssueFromLearner(
        params.chapterTitle,
        params.issueDescription
      );

      if (isSupabaseConfigured && params.contentId && params.reporterId) {
        await discussionsAndIssuesService.reportContentIssue({
          content_id: params.contentId,
          chapter_id: params.chapterId ?? null,
          reporter_id: params.reporterId,
          title: params.issueDescription,
          description: `Reported in ${params.chapterTitle}`,
        });
      }
    },
    [store]
  );

  return {
    discussionThreads: store.discussionThreads,
    reportedIssues: store.reportedIssues,
    mostIssuedCount: store.mostIssuedCount,
    postDiscussionMutation,
    reportIssueMutation,
    toggleReportedIssueStatus: store.toggleReportedIssueStatus,
  };
}

// -----------------------------------------------------------------------------
// 6. Hook: Supabase Storage Media & Template Upload (`useSupabaseStorageUpload`)
// -----------------------------------------------------------------------------

export function useSupabaseStorageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMedia = useCallback(async (contentId: string, file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      if (!isSupabaseConfigured) {
        return URL.createObjectURL(file);
      }
      return await uploadCourseOrQuizMedia(contentId, file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Media upload failed";
      setUploadError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadTemplate = useCallback(async (ownerId: string, file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      if (!isSupabaseConfigured) {
        return URL.createObjectURL(file);
      }
      return await uploadAttachmentTemplate(ownerId, file);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Attachment upload failed";
      setUploadError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadAvatar = useCallback(async (userId: string, file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      if (!isSupabaseConfigured) {
        return URL.createObjectURL(file);
      }
      return await uploadUserAvatar(userId, file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Avatar upload failed";
      setUploadError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isUploading,
    uploadError,
    uploadMedia,
    uploadTemplate,
    uploadAvatar,
    curriculumService,
    profilesService,
  };
}

// -----------------------------------------------------------------------------
// 7. Hook: Supabase Realtime Postgres Channel (`useRuangSosmedRealtimeSync`)
// -----------------------------------------------------------------------------

export function useRuangSosmedRealtimeSync(onRealtimeEvent?: (table: string) => void) {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("ruang-sosmed-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contents",
        },
        () => onRealtimeEvent?.("contents")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
        },
        () => onRealtimeEvent?.("enrollments")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => onRealtimeEvent?.("submissions")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussions",
        },
        () => onRealtimeEvent?.("discussions")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_issues",
        },
        () => onRealtimeEvent?.("content_issues")
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRealtimeEvent]);
}
