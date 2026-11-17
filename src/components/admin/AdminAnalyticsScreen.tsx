"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Star,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { OfficialCertificateModal } from "@/components/certificate/OfficialCertificateModal";

interface AdminAnalyticsScreenProps {
  onOpenGradingCenter: () => void;
  onShowToast: (msg: string) => void;
  onOpenCertificateStudio?: () => void;
}

const COMPLETION_TIME_SERIES = [
  { label: "May '26", completionPct: 61, enrolled: 94 },
  { label: "Jun '26", completionPct: 66, enrolled: 108 },
  { label: "Jul '26", completionPct: 70, enrolled: 116 },
  { label: "Aug '26", completionPct: 74, enrolled: 125 },
  { label: "Sep '26", completionPct: 79, enrolled: 134 },
  { label: "Oct '26", completionPct: 84, enrolled: 142 },
];

const QUIZ_SCORE_DISTRIBUTION = [
  {
    band: "90% – 100% (Distinction)",
    learnersCount: 54,
    percentage: 38,
    color: "#10B981",
  },
  {
    band: "80% – 89% (Passed)",
    learnersCount: 61,
    percentage: 43,
    color: "#4F39F6",
  },
  {
    band: "70% – 79% (Near Threshold)",
    learnersCount: 17,
    percentage: 12,
    color: "#F59E0B",
  },
  {
    band: "< 70% (Retake Scheduled)",
    learnersCount: 10,
    percentage: 7,
    color: "#EF4444",
  },
];

export function AdminAnalyticsScreen({
  onOpenGradingCenter,
  onShowToast,
  onOpenCertificateStudio,
}: AdminAnalyticsScreenProps) {
  const {
    leaderboard,
    assignees,
    explorerItems,
    gradingSubmissions,
    cohortProjects,
    certificateUnlocked,
  } = useRuangSosmedStore();

  const hasData = leaderboard.length > 0;

  const [selectedCohort, setSelectedCohort] = useState("All Cohorts");
  const [certPreviewLearner, setCertPreviewLearner] = useState<{
    name: string;
    role: string;
    credentialId: string;
    scoreLabel: string;
  } | null>(null);

  // Trenning Reference Quiz Report Matrix & Individual Quiz Result Modal (ref_14, ref_14a, ref_14b)
  const [quizReportTab, setQuizReportTab] = useState<"overview" | "questions">("overview");
  const [selectedQuizResultLearner, setSelectedQuizResultLearner] = useState<{
    name: string;
    role: string;
    accuracy: number;
    points: number;
  } | null>(null);
  const [selectedGridQuestionNum, setSelectedGridQuestionNum] = useState<number>(4);

  useEffect(() => {
    if (!selectedQuizResultLearner) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedQuizResultLearner(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedQuizResultLearner]);

  // Merge leaderboard & assignees for Most Active Learners table
  const mostActiveLearners = leaderboard.map((learner, idx) => {
    const matchedAssignee = assignees.find(
      (a) => a.name.toLowerCase() === learner.name.toLowerCase()
    );
    const completedCh = matchedAssignee?.completedChapters ?? 0;
    const totalCh = matchedAssignee?.totalChapters ?? (completedCh > 0 ? completedCh : 1);
    const learnerSubs = gradingSubmissions.filter(
      (s) =>
        s.learner.name.toLowerCase() === learner.name.toLowerCase() &&
        s.status === "Passed"
    );
    const avgQuizScore =
      learnerSubs.length > 0
        ? Math.round(
            learnerSubs.reduce((acc, s) => {
              const totMax =
                s.questionsAndAnswers.reduce((m, q) => m + q.maxPoints, 0) || 1;
              const totAw = s.questionsAndAnswers.reduce(
                (m, q) => m + q.awardedPoints,
                0
              );
              return acc + Math.round((totAw / totMax) * 100);
            }, 0) / learnerSubs.length
          )
        : 0;
    const credentialId = `RS2-2026-849${idx + 2}`;
    const defaultCohortName =
      cohortProjects[idx % Math.max(1, cohortProjects.length)]?.name ||
      "Ruang Sosmed Class";

    return {
      ...learner,
      completedChapters: completedCh,
      totalChapters: totalCh,
      completionPct: totalCh > 0 ? Math.min(100, Math.round((completedCh / totalCh) * 100)) : 0,
      avgQuizScore,
      credentialId,
      cohort: defaultCohortName,
    };
  });

  const liveAvgCompletionPct =
    mostActiveLearners.length > 0
      ? Math.round(
          mostActiveLearners.reduce((sum, l) => sum + l.completionPct, 0) /
            mostActiveLearners.length
        )
      : 0;

  const liveAvgQuizScorePct =
    mostActiveLearners.length > 0
      ? Math.round(
          mostActiveLearners.reduce((sum, l) => sum + l.avgQuizScore, 0) /
            mostActiveLearners.length
        )
      : 0;

  const activeProgressingCount = mostActiveLearners.filter(
    (l) => l.completedChapters > 0
  ).length;

  const hasProgressHistory = mostActiveLearners.some(
    (l) => l.completedChapters > 0
  );
  const hasQuizSubmissions = gradingSubmissions.length > 0 || liveAvgQuizScorePct > 0;

  const handleExportCsvReport = () => {
    const headers = [
      "Rank",
      "Learner Name",
      "Job Title",
      "Cohort",
      "Completed Chapters",
      "Completion Rate (%)",
      "Average Quiz Score (%)",
      "Mastery Points",
      "Credential ID",
    ];

    const rows = mostActiveLearners.map((l) => [
      l.rank,
      `"${l.name}"`,
      `"${l.role}"`,
      `"${l.cohort}"`,
      `${l.completedChapters}/${l.totalChapters}`,
      `${l.completionPct}%`,
      `${l.avgQuizScore}%`,
      l.points,
      l.credentialId,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ruang_sosmed_2_0_analytics_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast(
      "Exported learner analytics report (ruang_sosmed_2_0_analytics.csv)."
    );
  };

  return (
    <div className="w-full px-4 sm:px-5 pt-5 pb-14 space-y-6">
      {/* Top Header Row */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6] mb-1.5">
            <BarChart3 size={12} />
            <span>Ruang Sosmed 2.0 Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121215]">
            Learning Analytics &amp; Cohort Performance
          </h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">
            Track course completion velocity, quiz score distributions, and
            verified certificate issuance across cohorts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter analytics by cohort"
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
          >
            <option value="All Cohorts">All Cohorts ({leaderboard.length} Learners)</option>
            {cohortProjects.map((proj) => (
              <option key={proj.id} value={proj.name}>
                {proj.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenGradingCenter}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
          >
            <ClipboardCheck size={14} className="text-[#F97316]" />
            <span>Open Grading Center</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsvReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.25)] transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </header>

      {/* 4 Summary Metric KPI Cards */}
      <section
        aria-label="Key Performance Indicators"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E5E5E]">
              Course Completion Rate
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/10 text-[#10B981]">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#121215] tabular-nums">
            {liveAvgCompletionPct}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#10B981] flex items-center gap-1">
            <TrendingUp size={12} />
            <span>
              {hasData
                ? `${activeProgressingCount} of ${leaderboard.length} learners progressing`
                : "Belum ada data cohort"}
            </span>
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E5E5E]">
              Average Quiz Score
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
              <BarChart3 size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#121215] tabular-nums">
            {liveAvgQuizScorePct}%
          </p>
          <p className="mt-1 text-[11px] text-[#5E5E5E]">
            {explorerItems.length > 0 ? (
              <>
                Pass threshold: <strong className="text-[#121215]">80%</strong> across{" "}
                {explorerItems.length} item{explorerItems.length !== 1 ? "s" : ""}
              </>
            ) : (
              "Belum ada data nilai kuis"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E5E5E]">
              Active Cohort Learners
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
              <Users size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#121215] tabular-nums">
            {leaderboard.length}
          </p>
          <p className="mt-1 text-[11px] text-[#5E5E5E]">
            {hasData
              ? `Terdaftar di ${cohortProjects.length} project / cohort`
              : "Belum ada murid aktif terdaftar"}
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E5E5E]">
              Verified Certificates Issued
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706]">
              <Award size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#121215] tabular-nums">
            {certificateUnlocked ? 1 : 0}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#D97706]">
            {certificateUnlocked ? "Credential Series: RS2-2026-0001" : "Belum ada sertifikat terbit"}
          </p>
        </div>
      </section>

      {/* 2-Column Charts: Course Completion Rate Over Time & Average Quiz Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Course Completion Rate Over Time */}
        <section
          aria-label="Course Completion Rate Over Time"
          className="lg:col-span-7 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-col justify-between"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-sm font-bold text-[#121215]">
                Course Completion Rate Over Time
              </h2>
              <p className="text-xs text-[#5E5E5E]">
                6-month completion progression across {selectedCohort}
              </p>
            </div>
            <span className="rounded-md bg-[#10B981]/10 border border-[#10B981]/25 px-2.5 py-1 text-xs font-bold text-[#059669]">
              Peak: {liveAvgCompletionPct}%
            </span>
          </div>

          {/* Interactive Bar + Trendline Chart */}
          {hasProgressHistory ? (
            <>
              <div className="grid grid-cols-6 gap-3 items-end h-48 pt-6 px-2 border-b border-[#EAECEF]">
                {COMPLETION_TIME_SERIES.map((point) => (
                  <div
                    key={point.label}
                    className="flex flex-col items-center gap-2 h-full justify-end group"
                  >
                    <span className="text-[11px] font-bold text-[#4F39F6] tabular-nums">
                      {point.completionPct}%
                    </span>
                    <div
                      className="w-full max-w-[44px] rounded-t-lg transition-all duration-300 group-hover:opacity-90"
                      style={{
                        height: `${point.completionPct}%`,
                        background:
                          point.label === "Oct '26"
                            ? "linear-gradient(180deg, #4F39F6 0%, #6366F1 100%)"
                            : "linear-gradient(180deg, #C7D2FE 0%, #E0E7FF 100%)",
                      }}
                      title={`${point.label}: ${point.completionPct}% completion (${point.enrolled} learners)`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-6 gap-3 pt-2.5 text-center">
                {COMPLETION_TIME_SERIES.map((point) => (
                  <div key={point.label}>
                    <p className="text-xs font-semibold text-[#121215]">
                      {point.label}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {point.enrolled} enrolled
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAECEF] rounded-lg">
              <BarChart3 size={24} className="text-[#9CA3AF] mb-2" />
              <p className="text-xs font-semibold text-[#121215]">Belum Ada Riwayat Progres Cohort</p>
              <p className="text-[11px] text-[#5E5E5E] mt-1 max-w-sm">
                Grafik progres akan aktif secara otomatis seiring peserta menyelesaikan bab dan modul pembelajaran.
              </p>
            </div>
          )}
        </section>

        {/* Right 5 Cols: Average Quiz Score Distribution */}
        <section
          aria-label="Average Quiz Score Distribution"
          className="lg:col-span-5 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-col justify-between"
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#121215]">
              Average Quiz Score Distribution
            </h2>
            <p className="text-xs text-[#5E5E5E]">
              {hasQuizSubmissions
                ? `Breakdown of ${gradingSubmissions.length} quiz submissions across Ruang Sosmed 2.0`
                : "Belum ada submission kuis dari murid"}
            </p>
          </div>

          {hasQuizSubmissions ? (
            <div className="space-y-4 my-auto">
              {QUIZ_SCORE_DISTRIBUTION.map((item) => (
                <div key={item.band} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121215]">
                      {item.band}
                    </span>
                    <span className="font-bold text-[#5E5E5E] tabular-nums">
                      {item.learnersCount} learners ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#EAECEF] rounded-lg my-auto">
              <ClipboardCheck size={24} className="text-[#9CA3AF] mb-2" />
              <p className="text-xs font-semibold text-[#121215]">Belum Ada Submission Kuis</p>
              <p className="text-[11px] text-[#5E5E5E] mt-1">
                Distribusi nilai akan terakumulasi otomatis saat kuis pertama selesai dinilai.
              </p>
            </div>
          )}

          <div className="mt-5 pt-3.5 border-t border-[#EAECEF] flex items-center justify-between text-xs">
            <span className="text-[#5E5E5E]">First-Attempt Pass Rate</span>
            <span className="font-bold text-[#10B981]">
              {hasQuizSubmissions
                ? `${liveAvgQuizScorePct}% (${gradingSubmissions.filter((s) => s.status === "Passed").length} / ${gradingSubmissions.length})`
                : "0.0% (0 / 0)"}
            </span>
          </div>
        </section>
      </div>

      {/* Most Active Learners Table (Responsive Table per modern-web-guidance) */}
      <section className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2
              id="most-active-learners-caption"
              className="text-base font-bold text-[#121215]"
            >
              Most Active Learners &amp; Certificate Eligibility
            </h2>
            <p className="text-xs text-[#5E5E5E]">
              Live-synced with Learner Portal classroom completions and quiz
              scores.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsvReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
          >
            <Download size={13} />
            <span>Download Table CSV</span>
          </button>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="most-active-learners-caption"
          className="table-wrapper"
        >
          <table
            style={
              {
                "--label-2": '"Cohort"',
                "--label-3": '"Chapter Progress"',
                "--label-4": '"Avg Quiz Score"',
                "--label-5": '"Mastery Points"',
                "--label-6": '"Certificate"',
              } as React.CSSProperties
            }
          >
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#F8F9FB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <th className="py-3 px-4 rounded-tl-lg">Learner</th>
                <th className="py-3 px-4">Cohort</th>
                <th className="py-3 px-4">Course Progress</th>
                <th className="py-3 px-4">Avg Quiz Score</th>
                <th className="py-3 px-4">Mastery Points</th>
                <th className="py-3 px-4 text-right rounded-tr-lg">
                  Official Certificate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {mostActiveLearners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#9CA3AF]">
                    Belum ada data learner terdaftar di cohort. Silakan undang murid atau mulai terbitkan kursus.
                  </td>
                </tr>
              ) : (
                mostActiveLearners.map((learner) => (
                <tr
                  key={learner.name}
                  className="hover:bg-[#F8F9FB]/80 transition-colors"
                >
                  <th
                    scope="row"
                    className="py-3.5 px-4 font-semibold text-[#121215] text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-xs font-bold text-[#9CA3AF]">
                        #{learner.rank}
                      </span>
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: learner.avatarBg,
                          color: learner.avatarText,
                        }}
                      >
                        {learner.initials}
                      </span>
                      <div>
                        <p className="font-bold text-[#121215]">
                          {learner.name}
                        </p>
                        <p className="text-[11px] font-normal text-[#5E5E5E]">
                          {learner.role}
                        </p>
                      </div>
                    </div>
                  </th>

                  <td className="py-3.5 px-4 text-[#5E5E5E] font-medium">
                    <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#121215]">
                      {learner.cohort}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5 min-w-[140px]">
                      <div className="flex-1 h-2 rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#10B981]"
                          style={{ width: `${learner.completionPct}%` }}
                        />
                      </div>
                      <span className="font-bold text-[#121215] tabular-nums">
                        {learner.completedChapters}/{learner.totalChapters} (
                        {learner.completionPct}%)
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-[#10B981]/10 border border-[#10B981]/25 px-2 py-0.5 text-xs font-bold text-[#059669] tabular-nums">
                      {learner.avgQuizScore}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-[#B45309] tabular-nums">
                      <Star
                        size={12}
                        className="text-[#F59E0B]"
                        fill="#F59E0B"
                      />
                      {learner.points.toLocaleString()} pts
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setCertPreviewLearner({
                          name: learner.name,
                          role: learner.role,
                          credentialId: learner.credentialId,
                          scoreLabel: `${learner.avgQuizScore}% Mastery Score • Rank #${learner.rank}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEF3C7]/70 hover:bg-[#FEF3C7] border border-[#F59E0B]/40 px-3 py-1.5 text-xs font-bold text-[#B45309] transition-colors cursor-pointer"
                    >
                      <Award size={13} />
                      <span>View Certificate ({learner.credentialId})</span>
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trenning Quiz Report Analytics & Question Matrix (ref_14, ref_14a, ref_14b) */}
      <section className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#121215]">
              Quiz Report Matrix — Social Media &amp; Design Heuristics Assessment
            </h2>
            <p className="text-xs text-[#5E5E5E]">
              Inspect per-question accuracy across learners or click any learner row to open their 1–20 Question Grid &amp; Grading Modal.
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setQuizReportTab("overview")}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                quizReportTab === "overview"
                  ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                  : "text-[#5E5E5E]"
              }`}
            >
              Overview Matrix
            </button>
            <button
              type="button"
              onClick={() => setQuizReportTab("questions")}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                quizReportTab === "questions"
                  ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                  : "text-[#5E5E5E]"
              }`}
            >
              Questions Breakdown
            </button>
          </div>
        </div>

        {quizReportTab === "overview" ? (
          <div className="overflow-x-auto rounded-xl border border-[#EAECEF]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FB] text-[#5E5E5E] border-b border-[#EAECEF]">
                  <th className="py-3 px-4 font-bold">Learner</th>
                  <th className="py-3 px-3 font-bold">Accuracy</th>
                  <th className="py-3 px-3 text-center font-bold">No.1 (100%)</th>
                  <th className="py-3 px-3 text-center font-bold">No.2 (0%)</th>
                  <th className="py-3 px-3 text-center font-bold">No.3 (70%)</th>
                  <th className="py-3 px-3 text-center font-bold">No.4 (65%)</th>
                  <th className="py-3 px-3 text-center font-bold">No.5 (75%)</th>
                  <th className="py-3 px-4 text-right font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF]">
                {mostActiveLearners.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-[#9CA3AF]">
                      Belum ada data laporan kuis dari peserta.
                    </td>
                  </tr>
                ) : (
                  mostActiveLearners.map((learner) => {
                    const cells = ["ok", "ok", "ok", "rev", "ok"];
                    return (
                      <tr
                        key={`qm-${learner.name}`}
                        onClick={() =>
                          setSelectedQuizResultLearner({
                            name: learner.name,
                            role: learner.role,
                            accuracy: learner.avgQuizScore,
                            points: learner.points,
                          })
                        }
                        className="hover:bg-[#F8F9FB] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-[#121215]">
                          {learner.name}
                          <span className="block text-[10px] font-normal text-[#5E5E5E]">
                            {learner.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#10B981]">
                          {learner.avgQuizScore}%
                        </td>
                        {cells.map((c, cIdx) => (
                          <td key={cIdx} className="py-3 px-3 text-center">
                            {c === "ok" && (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#10B981]/15 text-[#059669] font-bold">
                                ✓
                              </span>
                            )}
                            {c === "rev" && (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#0EA5E9]/15 text-[#0284C7] font-bold">
                                ?
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right">
                          <span className="rounded-lg bg-[#4F39F6]/10 px-2.5 py-1 text-[11px] font-bold text-[#4F39F6]">
                            Inspect 1–20 Grid
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[
              { no: "No. 1", title: "What is the primary purpose of a Design System?", type: "Multiple choice", acc: 100 },
              { no: "No. 2", title: "Identify the anomalous retention drop in Ads Manager", type: "Hotspot", acc: 35 },
              { no: "No. 3", title: "Fill in the Blank: Usability Heuristics Principles", type: "Fill in the blank", acc: 70 },
              { no: "No. 4", title: "Explain the 10 Usability Heuristics in UI Design", type: "Open-ended essay", acc: 65 },
              { no: "No. 5", title: "Select the highest-contrast typography hierarchy card", type: "Image Multiple Choice", acc: 75 },
            ].map((qItem) => (
              <div
                key={qItem.no}
                className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[11px] font-bold text-[#4F39F6]">
                    {qItem.no} • {qItem.type}
                  </span>
                  <p className="text-xs font-bold text-[#121215] mt-0.5">
                    {qItem.title}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#10B981]"
                      style={{ width: `${qItem.acc}%` }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-[#121215] w-12 text-right">
                    {qItem.acc}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Individual Learner Quiz Result & 1–20 Question Grid Modal (ref_14a, ref_14b) */}
      {selectedQuizResultLearner && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Individual Learner Quiz Result"
          onClick={() => setSelectedQuizResultLearner(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECEF]">
              <div>
                <h2 className="text-base font-bold text-[#121215]">
                  {selectedQuizResultLearner.name} — Quiz Result &amp; Question Matrix
                </h2>
                <p className="text-xs text-[#5E5E5E]">
                  {selectedQuizResultLearner.role} • Accuracy:{" "}
                  <strong className="text-[#10B981]">
                    {selectedQuizResultLearner.accuracy}%
                  </strong>{" "}
                  ({selectedQuizResultLearner.points} / 200 pts)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuizResultLearner(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left 5 Cols: 1–20 Colored Question Grid + Legend (ref_14a) */}
              <div className="md:col-span-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                  Question Navigator (1–20)
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
                    const status =
                      num === 2 || num === 14
                        ? "incorrect"
                        : num === 4 || num === 9
                        ? "review"
                        : num === 7 || num === 15
                        ? "half"
                        : num === 19
                        ? "skipped"
                        : "correct";
                    const colorClasses =
                      status === "correct"
                        ? "bg-[#10B981]/15 text-[#059669] border-[#10B981]/40"
                        : status === "half"
                        ? "bg-[#F59E0B]/15 text-[#D97706] border-[#F59E0B]/40"
                        : status === "review"
                        ? "bg-[#0EA5E9]/15 text-[#0284C7] border-[#0EA5E9]/40"
                        : status === "incorrect"
                        ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40"
                        : "bg-[#F8F9FB] text-[#9CA3AF] border-[#EAECEF]";
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedGridQuestionNum(num)}
                        className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${colorClasses} ${
                          selectedGridQuestionNum === num
                            ? "ring-2 ring-[#4F39F6]"
                            : ""
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                {/* Color Legend */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] grid grid-cols-2 gap-2 text-[11px] font-semibold text-[#5E5E5E]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />
                    Correct (13)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" />
                    Half Correct (2)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#0EA5E9]" />
                    Need Review (2)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />
                    Incorrect (2)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#9CA3AF]" />
                    Skipped (1)
                  </span>
                </div>
              </div>

              {/* Right 7 Cols: Question Response & Open-Ended Grading Card (ref_14b) */}
              <div className="md:col-span-7 space-y-4">
                <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#0EA5E9]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0284C7]">
                      Question #{selectedGridQuestionNum} • Open-Ended / Visual Review
                    </span>
                    <span className="text-xs font-bold text-[#121215]">
                      Max 20 Points
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[#121215]">
                    Explain the 10 Usability Heuristics in UI Design and how they reduce cognitive load in mobile interfaces.
                  </p>

                  <div className="rounded-lg bg-[#FFFFFF] p-3 border border-[#EAECEF] text-xs text-[#121215] leading-relaxed">
                    <p className="text-[10px] font-bold uppercase text-[#9CA3AF] mb-1">
                      Learner Response ({selectedQuizResultLearner.name}):
                    </p>
                     Jakob Nielsen&apos;s 10 usability heuristics act as foundational rules of thumb—specifically visibility of system status, match between system and real world, and error prevention—ensuring users never have to memorize state across screens.
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EAECEF]">
                    <span className="text-xs font-semibold text-[#5E5E5E]">
                      Trainer Evaluation &amp; Score:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onShowToast(
                            `Marked Q#${selectedGridQuestionNum} as Correct (+20 pts) for ${selectedQuizResultLearner.name}.`
                          );
                        }}
                        className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        ✓ Mark Correct (20 pts)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuizResultLearner(null);
                          onOpenGradingCenter();
                        }}
                        className="rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
                      >
                        Add Feedback in Grading Center
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Certificate Modal */}
      <OfficialCertificateModal
        open={Boolean(certPreviewLearner)}
        onClose={() => setCertPreviewLearner(null)}
        learnerName={certPreviewLearner?.name}
        learnerRole={certPreviewLearner?.role}
        credentialId={certPreviewLearner?.credentialId}
        scoreLabel={certPreviewLearner?.scoreLabel}
        onShowToast={onShowToast}
        onOpenStudio={onOpenCertificateStudio}
      />
    </div>
  );
}
