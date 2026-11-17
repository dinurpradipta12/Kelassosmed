"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  Star,
  CheckCircle2,
} from "lucide-react";
import { type UngradedQuizItem } from "@/lib/design-tokens";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { ContentBadge, ContentIconBox } from "@/components/ui/ContentBadge";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";

interface LeftColumnWidgetsProps {
  quizzes: UngradedQuizItem[];
  onGradeQuiz: (quiz: UngradedQuizItem) => void;
  onOpenGradingCenter?: (initialQuizTitle?: string) => void;
  onShowToast: (msg: string) => void;
  currentUser?: AuthenticatedUser | null;
}

export function LeftColumnWidgets({
  quizzes,
  onGradeQuiz,
  onOpenGradingCenter,
  onShowToast,
  currentUser,
}: LeftColumnWidgetsProps) {
  const {
    reportedIssues,
    gradingSubmissions,
    assignees,
    leaderboard,
    explorerItems,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const liveIssuedCount = reportedIssues.length;
  const mostIssuedItem = explorerItems[0];
  const assignmentItems = explorerItems.filter((i) => i.type === "Assignment");
  const totalAssignmentsCount = assignmentItems.length;
  const submittedAssignmentsCount = gradingSubmissions.length;
  const gradedAssignmentsCount = gradingSubmissions.filter(
    (s) => s.status === "Passed"
  ).length;
  const assignmentCompletionRate =
    submittedAssignmentsCount > 0
      ? Math.round((gradedAssignmentsCount / submittedAssignmentsCount) * 100)
      : 0;

  const [statusFilter, setStatusFilter] = useState<
    "By status" | "By cohort" | "By module"
  >("By status");
  const [filterOpen, setFilterOpen] = useState(false);

  const totalContentsCount = explorerItems.length;
  const completedAssignees = assignees.filter(
    (a) => a.totalChapters > 0 && a.completedChapters >= a.totalChapters
  ).length;
  const inProgressAssignees = assignees.filter(
    (a) => a.completedChapters > 0 && a.completedChapters < a.totalChapters
  ).length;
  const notStartedAssignees = Math.max(
    0,
    assignees.length - completedAssignees - inProgressAssignees
  );
  const totalAssigneePool = assignees.length;

  const livePassedPct =
    totalContentsCount === 0
      ? 0
      : totalAssigneePool > 0
      ? Math.round((completedAssignees / totalAssigneePool) * 100)
      : 100;
  const liveInProgressPct =
    totalContentsCount === 0 || totalAssigneePool === 0
      ? 0
      : Math.round((inProgressAssignees / totalAssigneePool) * 100);
  const liveNotStartedPct =
    totalContentsCount === 0
      ? 0
      : Math.max(0, 100 - livePassedPct - liveInProgressPct);

  const liveContentStatusData = [
    { label: "Passed", percentage: livePassedPct, color: "#4F39F6" },
    { label: "Failed", percentage: 0, color: "#F59E0B" },
    { label: "Overdue", percentage: 0, color: "#EF4444" },
    { label: "In Progress", percentage: liveInProgressPct, color: "#14B8A6" },
    { label: "Not Started", percentage: liveNotStartedPct, color: "#D1D5DB" },
  ];

  const passedArcLength = Math.round((livePassedPct / 100) * 232);
  const inProgressArcLength = Math.round((liveInProgressPct / 100) * 232);
  const notStartedArcLength = Math.round((liveNotStartedPct / 100) * 232);

  return (
    <div className="space-y-5">
      {/* ROW 1: 2 Cards Side-by-Side (Most Issued Content + Assignment Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Most Issued Content Card */}
        <article className="flex flex-col justify-between rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#121215]">
                  Most Issued Content
                </h2>
                <p className="text-xs text-[#9CA3AF]">This week</p>
              </div>
              <ContentBadge type={mostIssuedItem?.type ?? "Course"} />
            </div>

            <div className="flex items-center justify-between gap-2 mb-4">
              <h3
                className="text-sm font-semibold text-[#121215] truncate"
                title={mostIssuedItem?.title ?? "Belum ada konten"}
              >
                {mostIssuedItem ? `${mostIssuedItem.title.slice(0, 36)}...` : "Belum ada materi dibuat"}
              </h3>
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                liveIssuedCount > 0
                  ? "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                  : "bg-[#F8F9FB] border-[#EAECEF] text-[#9CA3AF]"
              }`}>
                <TrendingUp size={11} strokeWidth={2.4} />
                {liveIssuedCount > 0 ? `+${liveIssuedCount} active issues` : "0 active issues"}
              </span>
            </div>

            {/* Large metric issues + sparkline */}
            <div className="flex items-end justify-between gap-4 pt-1 pb-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-[#121215] tabular-nums">
                    {liveIssuedCount}
                  </span>
                  <span className="text-sm font-semibold text-[#5E5E5E]">
                    Issues
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Synced with Learner Classroom Issue Tracker
                </p>
              </div>

              {/* Sparkline: Active wave if issues > 0, flat dashed if 0 */}
              <div className="w-32 h-12 shrink-0">
                <svg
                  viewBox="0 0 130 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full overflow-visible"
                  role="img"
                  aria-label={`Sparkline showing ${liveIssuedCount} issues trend this week`}
                >
                  {liveIssuedCount > 0 ? (
                    <>
                      <defs>
                        <linearGradient
                          id="sparklineGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="44"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M2 34 C 18 32, 26 24, 40 27 C 54 30, 66 15, 82 18 C 96 20, 108 7, 126 5 L 126 42 L 2 42 Z"
                        fill="url(#sparklineGradient)"
                      />
                      <path
                        d="M2 34 C 18 32, 26 24, 40 27 C 54 30, 66 15, 82 18 C 96 20, 108 7, 126 5"
                        stroke="#10B981"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="126"
                        cy="5"
                        r="3.5"
                        fill="#FFFFFF"
                        stroke="#10B981"
                        strokeWidth="2.2"
                      />
                    </>
                  ) : (
                    <path
                      d="M2 38 L 126 38"
                      stroke="#EAECEF"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                onShowToast(
                  `Viewing all ${liveIssuedCount} issued content reports in Ruang Sosmed 2.0.`
                )
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E5E5E] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <span>See all issued contents</span>
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
            <span className="text-[11px] text-[#9CA3AF]">Live Sync</span>
          </div>
        </article>

        {/* Card 2: Assignment Summary Card */}
        <article className="flex flex-col justify-between rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#121215]">
                  Assignment Summary
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Active creator &amp; marketing cohorts
                </p>
              </div>
              <ContentBadge type="Assignment" />
            </div>

            {/* Metric: submitted / remaining */}
            <div className="my-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-3xl font-bold tracking-tight text-[#121215]">
                  {submittedAssignmentsCount} submitted
                </span>
                <span className="text-sm font-medium text-[#9CA3AF]">
                  / {Math.max(0, totalAssignmentsCount - submittedAssignmentsCount)} remaining
                </span>
              </div>
            </div>

            {/* Horizontal progress bar */}
            <div className="mt-4 mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#4F39F6]">
                  <span className="h-2 w-2 rounded-full bg-[#4F39F6]" />
                  {totalAssignmentsCount} Assignment
                </span>
                <span className="text-[#5E5E5E] font-medium">
                  {assignmentCompletionRate}% completion rate
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#4F39F6] transition-all duration-500"
                  style={{ width: `${assignmentCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (onOpenGradingCenter) {
                  onOpenGradingCenter();
                } else {
                  onShowToast(
                    `Opening Assignment Submissions Manager (${totalAssignmentsCount} active).`
                  );
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E5E5E] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <span>See all assignment</span>
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
            <span className="text-[11px] text-[#9CA3AF] font-medium">
              {submittedAssignmentsCount > 0
                ? `${gradedAssignmentsCount} graded`
                : "0 submissions"}
            </span>
          </div>
        </article>
      </div>

      {/* ROW 2: 2 Cards Side-by-Side (Learning Content Status + Top Learner Leaderboard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Learning Content Status Card */}
        <article className="flex flex-col justify-between rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#121215]">
                Learning Content Status
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Completion breakdown across studio
              </p>
            </div>

            {/* Filter dropdown: By status v */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] px-2.5 py-1.5 text-xs font-medium text-[#121215] border border-[#EAECEF] hover:border-[#D1D5DB] transition-colors cursor-pointer"
              >
                <span>{statusFilter}</span>
                <ChevronDown size={13} className="text-[#5E5E5E]" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-1 w-32 rounded-lg bg-[#FFFFFF] py-1 border border-[#EAECEF] shadow-lg z-20">
                  {(["By status", "By cohort", "By module"] as const).map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setStatusFilter(opt);
                          setFilterOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#F8F9FB] cursor-pointer ${
                          statusFilter === opt
                            ? "font-semibold text-[#4F39F6]"
                            : "text-[#5E5E5E]"
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left half: SVG semi-circle gauge chart (140 Contents) | Right half: Custom legend */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 my-auto py-2">
            {/* Left half: SVG Semi-Circle Gauge */}
            <div className="sm:col-span-6 flex flex-col items-center justify-center">
              <div className="relative w-44 h-28 flex items-end justify-center">
                <svg
                  viewBox="0 0 180 100"
                  className="w-full h-full overflow-visible"
                  role="img"
                  aria-label={`Semi-circle gauge showing ${totalContentsCount} Contents`}
                >
                  {/* Background track */}
                  <path
                    d="M 16 90 A 74 74 0 0 1 164 90"
                    fill="none"
                    stroke="#F3F4F6"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {totalContentsCount > 0 && passedArcLength > 0 && (
                    <path
                      d="M 16 90 A 74 74 0 0 1 164 90"
                      fill="none"
                      stroke="#4F39F6"
                      strokeWidth="16"
                      strokeDasharray={`${passedArcLength} 240`}
                      strokeDashoffset="0"
                      strokeLinecap="butt"
                    />
                  )}
                  {totalContentsCount > 0 && inProgressArcLength > 0 && (
                    <path
                      d="M 16 90 A 74 74 0 0 1 164 90"
                      fill="none"
                      stroke="#14B8A6"
                      strokeWidth="16"
                      strokeDasharray={`${inProgressArcLength} 240`}
                      strokeDashoffset={`-${passedArcLength}`}
                    />
                  )}
                  {totalContentsCount > 0 && notStartedArcLength > 0 && (
                    <path
                      d="M 16 90 A 74 74 0 0 1 164 90"
                      fill="none"
                      stroke="#D1D5DB"
                      strokeWidth="16"
                      strokeDasharray={`${notStartedArcLength} 240`}
                      strokeDashoffset={`-${passedArcLength + inProgressArcLength}`}
                    />
                  )}
                </svg>

                {/* Center text inside Semi-Circle */}
                <div className="absolute bottom-1 flex flex-col items-center text-center">
                  <span className="text-2xl font-bold tracking-tight text-[#121215] leading-none tabular-nums">
                    {totalContentsCount}
                  </span>
                  <span className="text-[11px] font-medium text-[#5E5E5E] mt-1">
                    Contents
                  </span>
                </div>
              </div>
            </div>

            {/* Right half: Custom Legend with colored dots & exact percentages */}
            <div className="sm:col-span-6 space-y-2">
              {liveContentStatusData.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[#5E5E5E] font-medium">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-semibold text-[#121215] tabular-nums">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Card 2: Top Learner Leaderboard Card (Live Synced with Learner Portal Points!) */}
        <article className="flex flex-col justify-between rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#121215]">
                  Top Learner Leaderboard
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Highest mastery points this month
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onShowToast("Opening full Learner Leaderboard directory.")
                }
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#5E5E5E] hover:text-[#4F39F6] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <span>View all</span>
                <ArrowUpRight size={13} strokeWidth={2.2} />
              </button>
            </div>

            {/* Ranked Rows (#1, #2, #3) */}
            <div className="space-y-2.5">
              {leaderboard.map((learner) => (
                <div
                  key={learner.name}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FB]/70 px-3 py-2.5 border border-[#EAECEF] hover:bg-[#F8F9FB] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 text-xs font-bold tabular-nums ${
                        learner.rank === 1
                          ? "text-[#4F39F6]"
                          : "text-[#5E5E5E]"
                      }`}
                    >
                      #{learner.rank}
                    </span>

                    {(() => {
                      const lbAvatar = resolveUserAvatar(learner.name);
                      if (lbAvatar) {
                        return (
                          <img
                            src={lbAvatar}
                            alt={learner.name}
                            className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                          />
                        );
                      }
                      return (
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: learner.avatarBg,
                            color: learner.avatarText,
                          }}
                        >
                          {learner.initials}
                        </div>
                      );
                    })()}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-xs font-semibold text-[#121215]">
                          {learner.name}
                        </p>
                        {currentUser &&
                          (learner.name.toLowerCase() === currentUser.name.toLowerCase() ||
                            learner.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
                            currentUser.name.toLowerCase().includes(learner.name.toLowerCase())) && (
                            <span className="shrink-0 rounded bg-[#4F39F6]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#4F39F6]">
                              You
                            </span>
                          )}
                      </div>
                      <p className="truncate text-[11px] text-[#5E5E5E]">
                        {learner.role}
                      </p>
                    </div>
                  </div>

                  {/* Gold Star Pill (★ 100pts, ★ 80pts) */}
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] border border-[#F59E0B]/30 px-2 py-1 text-xs font-semibold text-[#B45309] tabular-nums">
                    <Star
                      size={12}
                      className="text-[#F59E0B]"
                      fill="#F59E0B"
                    />
                    <span>{learner.points}pts</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      {/* ROW 3: Full Width Table Card (Ungraded Quiz Table) */}
      <article className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-[#121215]">
              Ungraded Quiz
            </h2>
            <span className="inline-flex items-center rounded-md bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
              {quizzes.filter((q) => !q.graded).length} Pending
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenGradingCenter) {
                onOpenGradingCenter();
              } else {
                onShowToast(
                  "Viewing all quiz submissions in Ruang Sosmed 2.0."
                );
              }
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E5E5E] hover:text-[#4F39F6] transition-colors cursor-pointer"
          >
            <span>See all</span>
            <ChevronRight size={14} strokeWidth={2.2} />
          </button>
        </div>

        {/* Accessible Responsive Table per modern-web-guidance (responsive-table) */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Ungraded Quiz submissions"
          className="table-wrapper"
        >
          <table>
            <thead>
              <tr className="border-b border-[#EAECEF] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <th className="py-2.5 pl-2 pr-3 w-10 bg-[#FFFFFF]">#</th>
                <th className="py-2.5 px-3 bg-[#FFFFFF]">Quiz title</th>
                <th className="py-2.5 px-3 bg-[#FFFFFF]">Questions</th>
                <th className="py-2.5 px-3 bg-[#FFFFFF]">Learner</th>
                <th className="py-2.5 pl-3 pr-2 text-right bg-[#FFFFFF]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {quizzes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-xs text-[#5E5E5E] bg-[#FFFFFF]"
                  >
                    Belum ada kuis atau tugas yang menunggu penilaian.
                  </td>
                </tr>
              ) : (
                quizzes.map((quiz) => (
                <tr
                  key={quiz.id}
                  className="group hover:bg-[#F8F9FB]/80 transition-colors"
                >
                  <td className="py-3 pl-2 pr-3 font-medium text-[#9CA3AF] tabular-nums">
                    {quiz.index}
                  </td>
                  <th
                    scope="row"
                    className="py-3 px-3 font-semibold text-[#121215] text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <ContentIconBox type="Quiz" size="sm" />
                      <div>
                        <span className="block text-xs font-semibold text-[#121215]">
                          {quiz.title}
                        </span>
                        <span className="block text-[11px] font-normal text-[#9CA3AF]">
                          Submitted {quiz.submittedAt}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="py-3 px-3 text-[#5E5E5E] font-medium">
                    <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-xs text-[#5E5E5E]">
                      {quiz.questionsLabel}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const quizAvatar = resolveUserAvatar(quiz.learner.name);
                        if (quizAvatar) {
                          return (
                            <img
                              src={quizAvatar}
                              alt={quiz.learner.name}
                              className="h-6 w-6 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                            />
                          );
                        }
                        return (
                          <span
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: quiz.learner.avatarBg,
                              color: quiz.learner.avatarText,
                            }}
                          >
                            {quiz.learner.initials}
                          </span>
                        );
                      })()}
                      <span className="font-medium text-[#121215]">
                        {quiz.learner.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pl-3 pr-2 text-right">
                    {quiz.graded ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 px-3 py-1.5 text-xs font-semibold text-[#059669]">
                        <CheckCircle2 size={13} />
                        Graded
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onGradeQuiz(quiz)}
                        className="inline-flex items-center justify-center rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] shadow-[0_1px_2px_rgba(16,15,17,0.03)] transition-all cursor-pointer"
                      >
                        Grade Now
                      </button>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
