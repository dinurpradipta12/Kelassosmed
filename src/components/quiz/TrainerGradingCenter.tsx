"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  RotateCcw,
  FileText,
  ExternalLink,
  Download,
  Award,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { ContentBadge } from "@/components/ui/ContentBadge";

interface TrainerGradingCenterProps {
  initialSubmissionTitle?: string;
  onBack: () => void;
  onGradedSubmission?: (
    title: string,
    status: "Passed" | "Revision Requested"
  ) => void;
  onShowToast: (msg: string) => void;
}

export function TrainerGradingCenter({
  initialSubmissionTitle,
  onBack,
  onGradedSubmission,
  onShowToast,
}: TrainerGradingCenterProps) {
  const { gradingSubmissions, evaluateSubmissionInGradingCenter } =
    useRuangSosmedStore();

  const defaultSelected =
    gradingSubmissions.find(
      (s) =>
        initialSubmissionTitle &&
        s.title.toLowerCase() === initialSubmissionTitle.toLowerCase()
    ) ?? gradingSubmissions[0];

  const [selectedId, setSelectedId] = useState<string>(
    defaultSelected?.id ?? "sub-1"
  );
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [localFeedback, setLocalFeedback] = useState<Record<string, string>>(
    {}
  );

  const activeSub =
    gradingSubmissions.find((s) => s.id === selectedId) ??
    gradingSubmissions[0];

  if (!activeSub) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] pb-16">
        <header className="sticky top-10 z-20 bg-[#FFFFFF] border-b border-[#EAECEF] px-6 py-3.5">
          <div className="w-full flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Admin Dashboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#121215]">
                Trainer Grading Center
              </h1>
              <p className="text-xs text-[#5E5E5E]">
                Evaluasi tugas praktik &amp; kuis esai peserta Ruang Sosmed 2.0
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#121215]">
              Semua Tugas Telah Dinilai
            </h2>
            <p className="text-xs text-[#5E5E5E] mt-1 leading-relaxed">
              Tidak ada antrean tugas atau kuis yang perlu dinilai saat ini. Semua kiriman tugas peserta telah selesai diperiksa.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const getAwardedScore = (qaId: string, fallback: number) =>
    localScores[qaId] !== undefined ? localScores[qaId] : fallback;

  const currentFeedback =
    localFeedback[activeSub.id] !== undefined
      ? localFeedback[activeSub.id]
      : activeSub.overallFeedback;

  const handleScoreChange = (
    qaId: string,
    maxPoints: number,
    nextScore: number
  ) => {
    setLocalScores((prev) => ({
      ...prev,
      [qaId]: Math.max(0, Math.min(maxPoints, nextScore)),
    }));
  };

  const handleFeedbackChange = (text: string) => {
    setLocalFeedback((prev) => ({
      ...prev,
      [activeSub.id]: text,
    }));
  };

  const handleDecision = (decision: "Passed" | "Revision Requested") => {
    const updatedScores = activeSub.questionsAndAnswers.map((qa) => ({
      id: qa.id,
      awardedPoints: getAwardedScore(qa.id, qa.awardedPoints),
    }));

    evaluateSubmissionInGradingCenter(
      activeSub.id,
      decision,
      updatedScores,
      currentFeedback
    );
    onGradedSubmission?.(activeSub.title, decision);
    onShowToast(
      decision === "Passed"
        ? `Marked "${activeSub.title}" as Passed — Learner Certificate unlocked & Admin Status Gauge updated!`
        : `Requested revision on "${activeSub.title}" (${activeSub.learner.name}).`
    );
  };

  const totalMaxPoints = activeSub.questionsAndAnswers.reduce(
    (sum, q) => sum + q.maxPoints,
    0
  );
  const totalAwardedPoints = activeSub.questionsAndAnswers.reduce(
    (sum, q) => sum + getAwardedScore(q.id, q.awardedPoints),
    0
  );
  const percentageScore =
    totalMaxPoints > 0
      ? Math.round((totalAwardedPoints / totalMaxPoints) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-16">
      {/* Top Bar */}
      <header className="sticky top-10 z-20 bg-[#FFFFFF] border-b border-[#EAECEF] px-6 py-3.5">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Admin Dashboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#121215]">
                Trainer Grading Center
              </h1>
              <p className="text-xs text-[#5E5E5E]">
                Evaluate open-ended quiz answers &amp; practical assignment
                submissions in Ruang Sosmed 2.0
              </p>
            </div>
          </div>

          {/* Submission Queue Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {gradingSubmissions.map((sub) => {
              const isSelected = sub.id === activeSub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedId(sub.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#4F39F6] text-white border-[#4F39F6] shadow-2xs"
                      : "bg-[#FFFFFF] text-[#121215] border-[#EAECEF] hover:bg-[#F8F9FB]"
                  }`}
                >
                  <span>{sub.learner.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[#F8F9FB] text-[#5E5E5E]"
                    }`}
                  >
                    {sub.submissionType}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* SPLIT VIEW: Left Side (Learner Submitted Answers/Files) + Right Side (Point Score Inputs, Feedback, Action Buttons) */}
      <div className="w-full px-4 sm:px-5 pt-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDE (7 Columns): Learner's Submitted Answers / Files */}
          <div className="lg:col-span-7 space-y-5">
            {/* Learner & Submission Summary Banner */}
            <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: activeSub.learner.avatarBg,
                    color: activeSub.learner.avatarText,
                  }}
                >
                  {activeSub.learner.initials}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#121215]">
                      {activeSub.learner.name}
                    </h2>
                    <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] font-medium text-[#5E5E5E]">
                      {activeSub.learner.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    {activeSub.learner.cohort} • {activeSub.submittedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <ContentBadge type={activeSub.submissionType} size="md" />
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border ${
                    activeSub.status === "Passed"
                      ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#059669]"
                      : activeSub.status === "Revision Requested"
                      ? "bg-[#EF4444]/10 border-[#EF4444]/25 text-[#EF4444]"
                      : "bg-[#F59E0B]/10 border-[#F59E0B]/25 text-[#B45309]"
                  }`}
                >
                  <Clock size={12} />
                  <span>{activeSub.status}</span>
                </span>
              </div>
            </div>

            {/* Submitted Questions & Files Cards */}
            {activeSub.questionsAndAnswers.map((qa, index) => (
              <article
                key={qa.id}
                className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EAECEF]">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F39F6]">
                      Submitted Response #{index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[#121215] mt-1">
                      {qa.questionTitle}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-xs font-semibold text-[#5E5E5E]">
                    Max {qa.maxPoints} pts
                  </span>
                </div>

                {/* Learner Written Response */}
                <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                    Learner Answer ({activeSub.learner.name})
                  </p>
                  <p className="text-xs text-[#121215] leading-relaxed whitespace-pre-line">
                    {qa.learnerResponse}
                  </p>
                </div>

                {/* Attached File / External Link if Assignment */}
                {qa.attachmentFile && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#4F39F6]/5 p-3.5 border border-[#4F39F6]/20">
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-[#4F39F6]" />
                      <div>
                        <p className="text-xs font-bold text-[#121215]">
                          {qa.attachmentFile.name}
                        </p>
                        <p className="text-[10px] text-[#5E5E5E]">
                          PDF Portfolio &amp; Figma Link •{" "}
                          {qa.attachmentFile.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onShowToast(
                            `Downloading "${qa.attachmentFile?.name}"...`
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Download PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onShowToast(
                            `Opening external project link: ${qa.attachmentFile?.url}`
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>Open Link</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mentor Reference Rubric */}
                <div className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] p-3 border border-[#FDE68A] text-xs text-[#92400E]">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Mentor Rubric:</strong>{" "}
                    {qa.mentorRubric}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* RIGHT SIDE (5 Columns): Point Score Inputs per Question, Overall Feedback, [Mark as Passed] / [Request Revision] */}
          <aside className="lg:col-span-5 sticky top-20 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAECEF]">
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  Evaluation &amp; Rubric Scoring
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  {activeSub.title}
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-bold text-[#4F39F6] tabular-nums">
                  {totalAwardedPoints} / {totalMaxPoints}
                </span>
                <span className="block text-[11px] font-semibold text-[#10B981]">
                  {percentageScore}% Total Score
                </span>
              </div>
            </div>

            {/* Point Score Inputs per Question */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Question Point Breakdown
              </p>

              {activeSub.questionsAndAnswers.map((qa, idx) => (
                <div
                  key={qa.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#121215] truncate">
                      Question #{idx + 1} Score
                    </p>
                    <p className="text-[11px] text-[#5E5E5E] truncate">
                      {qa.questionTitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={qa.maxPoints}
                      value={getAwardedScore(qa.id, qa.awardedPoints)}
                      onChange={(e) =>
                        handleScoreChange(
                          qa.id,
                          qa.maxPoints,
                          Number(e.target.value)
                        )
                      }
                      aria-label={`Score for question ${idx + 1}`}
                      className="w-16 rounded-lg bg-[#FFFFFF] px-2.5 py-1.5 text-center text-xs font-bold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-[#9CA3AF]">
                      / {qa.maxPoints} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Feedback Comment Box */}
            <div>
              <label
                htmlFor="grading-overall-feedback"
                className="block text-xs font-bold text-[#121215] mb-1.5"
              >
                Overall Mentor Feedback
              </label>
              <textarea
                id="grading-overall-feedback"
                rows={4}
                value={currentFeedback}
                onChange={(e) => handleFeedbackChange(e.target.value)}
                placeholder="Write constructive feedback on campaign structure, hook retention, or next steps..."
                className="w-full rounded-xl bg-[#F8F9FB] p-3.5 text-xs text-[#121215] leading-relaxed border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            {/* Action Buttons: [Mark as Passed] and [Request Revision] */}
            <div className="pt-2 border-t border-[#EAECEF] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDecision("Revision Requested")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#EF4444]/10 hover:border-[#EF4444] hover:text-[#EF4444] px-4 py-2.5 text-xs font-bold text-[#121215] border border-[#EAECEF] transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Request Revision</span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision("Passed")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] px-4 py-2.5 text-xs font-bold text-white shadow-[0_2px_6px_rgba(16,185,129,0.28)] transition-all cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Mark as Passed</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF]">
              <Award size={13} className="text-[#F59E0B]" />
              <span>
                Passing awards +20 ★ Leaderboard Points to{" "}
                {activeSub.learner.name}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
