"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  Star,
  Target,
  LayoutGrid,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { OfficialCertificateModal } from "@/components/certificate/OfficialCertificateModal";

interface LearnerQuizRunnerProps {
  quizTitle?: string;
  learnerName?: string;
  onExitQuiz: () => void;
  onAwardQuizPoints?: (points: number) => void;
  onShowToast: (msg: string) => void;
}

export function LearnerQuizRunner({
  quizTitle = "Social Media Analytics & Campaign Fundamentals",
  learnerName = "Learner",
  onExitQuiz,
  onShowToast,
}: LearnerQuizRunnerProps) {
  const { quizQuestions: questions, submitLearnerQuizOrAssignment } =
    useRuangSosmedStore();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(105); // 01:45 countdown timer
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [certModalOpen, setCertModalOpen] = useState(false);

  // Trenning Quiz Runner Upgrades (ref_21, ref_21b): Quiz Nav Popover, Focus Mode, Submit Confirmation Modal, Picture Matching, 80th Percentile Curve
  const [quizNavOpen, setQuizNavOpen] = useState(false);
  const [quizNavTab, setQuizNavTab] = useState<
    "All Question" | "Answered" | "Not Answered" | "Not Sure"
  >("All Question");
  const [focusMode, setFocusMode] = useState(false);
  const [submitConfirmModalOpen, setSubmitConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!submitConfirmModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSubmitConfirmModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitConfirmModalOpen]);
  const [visualResponderMode, setVisualResponderMode] = useState<
    "standard" | "image-mc" | "picture-matching"
  >("standard");
  const [selectedImageCardIdx, setSelectedImageCardIdx] = useState(0);
  const [matchedPuzzleLabels, setMatchedPuzzleLabels] = useState<string[]>([
    "Onboarding Screen",
    "Checkout Flow",
    "Profile Settings",
  ]);
  const [reviewFilterType, setReviewFilterType] = useState("All quiz type");
  const [reviewFilterAnswer, setReviewFilterAnswer] = useState("All answers");

  // Learner Answers state
  const [mcSelection, setMcSelection] = useState<string>("opt-1");
  const [blankInputs, setBlankInputs] = useState<{
    b1: string;
    b2: string;
    b3: string;
    b4: string;
  }>({
    b1: "ROAS",
    b2: "Revenue",
    b3: "Ad Spend",
    b4: "7-day click",
  });
  const [hotspotClick, setHotspotClick] = useState<{
    x: number;
    y: number;
  }>({ x: 74, y: 48 });
  const [essayAnswer, setEssayAnswer] = useState(
    "Because the 3-second Thumbstop Ratio remained strong at 41%, the bottleneck is post-click conversion or mid-video hold rate. I would test 2 new mid-roll social proof segments and inspect Landing Page View rate."
  );

  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const currentQuestion = questions[currentIdx] ?? questions[0];

  const toggleFlagCurrent = () => {
    setFlaggedIds((prev) =>
      prev.includes(currentQuestion.id)
        ? prev.filter((id) => id !== currentQuestion.id)
        : [...prev, currentQuestion.id]
    );
    onShowToast("Flagged question to revisit before submitting.");
  };

  // Calculate score across the 5 questions
  const evaluateResults = () => {
    const q1Correct = mcSelection === "opt-1";
    const q2Correct =
      blankInputs.b1.trim().toLowerCase() === "roas" &&
      blankInputs.b2.trim().toLowerCase() === "revenue";
    const q3Correct = hotspotClick.x >= 55 && hotspotClick.y >= 25;
    const q4Correct = true; // Categorization pre-sorted
    const q5Correct = essayAnswer.trim().length > 20;

    const breakdown = [
      {
        id: "q-1",
        title: "Q1: Meta Ads 3-Second Hook Metric (Multiple Choice)",
        correct: q1Correct,
        explanation:
          "Thumbstop Ratio (3-Second Video Plays ÷ Impressions) measures initial hook resonance.",
      },
      {
        id: "q-2",
        title: "Q2: Ruang Sosmed 2.0 ROAS Formula (Fill in the Blank)",
        correct: q2Correct,
        explanation:
          "ROAS = Conversion Revenue ÷ Ad Spend within the 7-day click window.",
      },
      {
        id: "q-3",
        title: "Q3: Creative Fatigue Hotspot Diagnostic (Hotspot)",
        correct: q3Correct,
        explanation:
          "Ad Set B shows Frequency 4.2 and CTR 0.48% in the right-hand column.",
      },
      {
        id: "q-4",
        title: "Q4: Organic Reach vs Conversion Formats (Categorization)",
        correct: q4Correct,
        explanation:
          "Trial Reels drive non-follower discovery while 10-slide Case Study Carousels drive high-intent trust.",
      },
      {
        id: "q-5",
        title: "Q5: Q4 Beauty Brand CPA Spike Diagnostic (Open-Ended Essay)",
        correct: q5Correct,
        explanation:
          "Strong 41% Thumbstop with rising CPA points to mid-roll drop-off or landing page friction.",
      },
    ];

    const correctCount = breakdown.filter((b) => b.correct).length;
    const scorePct = Math.round((correctCount / breakdown.length) * 100);
    return { breakdown, correctCount, scorePct, passed: scorePct >= 80 };
  };

  const handleSubmitQuiz = () => {
    const res = evaluateResults();
    setSubmitted(true);
    // Sync submission into Admin Dashboard's Ungraded Quiz Table & Trainer Grading Center
    submitLearnerQuizOrAssignment({
      title: quizTitle,
      submissionType: "Quiz",
      openEndedAnswer: essayAnswer,
      autoScorePct: res.scorePct,
      learnerName,
    });
    onShowToast(
      `Quiz submitted (${res.scorePct}%) — pushed to Admin Ungraded Quiz Table & Grading Center!`
    );
  };

  const handleRetryQuiz = () => {
    if (attemptsLeft <= 1) {
      onShowToast("No attempts remaining for this assessment.");
      return;
    }
    setAttemptsLeft((a) => a - 1);
    setSubmitted(false);
    setCurrentIdx(0);
    setSecondsLeft(105);
  };

  const results = evaluateResults();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {!submitted ? (
        /* ACTIVE QUIZ RUNNER WORKSPACE */
        <div className="rounded-xl bg-[#FFFFFF] p-6 sm:p-8 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-6">
          {/* Top Runner Header: Quiz Title, Countdown Timer (⏱ 01:45), [Flag / Skip for Later] */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EAECEF]">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onExitQuiz}
                aria-label="Exit Quiz"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <ContentBadge type="Quiz" size="sm" />
              <h1 className="text-sm font-bold text-[#121215]">{quizTitle}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Countdown Timer (⏱ 01:45) */}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-1.5 text-xs font-bold text-[#EF4444] tabular-nums">
                <Clock size={13} />
                <span>⏱ {formatTimer(secondsLeft)}</span>
              </span>

              {/* Trenning Quiz Nav Popover Button (ref_21, ref_21b) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setQuizNavOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#121215] border border-[#EAECEF] cursor-pointer"
                >
                  <LayoutGrid size={13} className="text-[#4F39F6]" />
                  <span>Quiz Nav</span>
                </button>

                {quizNavOpen && (
                  <div className="absolute right-0 top-10 z-40 w-80 rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#121215]">
                        Question Navigator (1–20)
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuizNavOpen(false)}
                        className="text-xs font-semibold text-[#5E5E5E] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* 4 Filter Tabs: All Question | Answered | Not Answered | Not Sure */}
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF] text-[10px] font-bold">
                      {(
                        [
                          "All Question",
                          "Answered",
                          "Not Answered",
                          "Not Sure",
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setQuizNavTab(tab)}
                          className={`rounded py-1 cursor-pointer ${
                            quizNavTab === tab
                              ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                              : "text-[#5E5E5E]"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* 1–20 Numbered Grid with Yellow ? Badge */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(
                        (num) => {
                          const qMatch = questions[(num - 1) % questions.length];
                          const isNotSure =
                            (qMatch && flaggedIds.includes(qMatch.id)) ||
                            num === 4 ||
                            num === 12;
                          const isNotAnswered = num === 18 || num === 19;
                          if (quizNavTab === "Not Sure" && !isNotSure)
                            return null;
                          if (quizNavTab === "Not Answered" && !isNotAnswered)
                            return null;
                          if (
                            quizNavTab === "Answered" &&
                            (isNotAnswered || isNotSure)
                          )
                            return null;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setCurrentIdx((num - 1) % questions.length);
                                setQuizNavOpen(false);
                              }}
                              className={`relative h-8 rounded-lg text-xs font-bold border cursor-pointer ${
                                (num - 1) % questions.length === currentIdx
                                  ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                                  : isNotSure
                                  ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]"
                                  : isNotAnswered
                                  ? "bg-[#F8F9FB] text-[#9CA3AF] border-[#EAECEF]"
                                  : "bg-[#10B981]/15 text-[#059669] border-[#10B981]/30"
                              }`}
                            >
                              {num}
                              {isNotSure && (
                                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#F59E0B] text-[9px] font-extrabold text-white flex items-center justify-center">
                                  ?
                                </span>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Focus Mode Toggle (ref_21, ref_21b) */}
              <button
                type="button"
                onClick={() => setFocusMode((f) => !f)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                  focusMode
                    ? "bg-[#121215] text-white border-[#121215]"
                    : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF] hover:text-[#121215]"
                }`}
              >
                {focusMode ? (
                  <Minimize2 size={12} />
                ) : (
                  <Maximize2 size={12} />
                )}
                <span>Focus Mode</span>
              </button>

              {/* [Flag / Skip for Later] Button */}
              <button
                type="button"
                onClick={() => {
                  toggleFlagCurrent();
                  if (currentIdx < questions.length - 1) {
                    setCurrentIdx((i) => i + 1);
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                  flaggedIds.includes(currentQuestion.id)
                    ? "bg-[#FEF3C7] border-[#F59E0B] text-[#B45309]"
                    : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                <Flag size={12} />
                <span>Skip for Later</span>
              </button>
            </div>
          </div>

          {/* Progress Bar (Question X of 5) + Quick Question Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#4F39F6]">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-[#5E5E5E] font-medium">
                Pass Mark: 80% • Reward: +100 ⭐
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#4F39F6] transition-all duration-300"
                style={{
                  width: `${((currentIdx + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                    idx === currentIdx
                      ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                      : flaggedIds.includes(q.id)
                      ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]"
                      : "bg-[#F8F9FB] text-[#5E5E5E] border-[#EAECEF]"
                  }`}
                >
                  Q{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question Prompt & Interactive Responder */}
          <div className="rounded-xl bg-[#F8F9FB] p-6 border border-[#EAECEF] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#10B981]/10 border border-[#10B981]/25 px-2.5 py-0.5 text-xs font-bold text-[#059669]">
                  {currentQuestion.type}
                </span>
                {/* Trenning Visual Question Modes Switcher (ref_21b) */}
                <div className="inline-flex rounded-lg bg-[#FFFFFF] p-0.5 border border-[#EAECEF] text-[10px] font-bold">
                  {(
                    [
                      { id: "standard", label: "Standard" },
                      { id: "image-mc", label: "Image Cards (6)" },
                      { id: "picture-matching", label: "Picture Matching" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setVisualResponderMode(mode.id)}
                      className={`rounded-md px-2 py-0.5 cursor-pointer ${
                        visualResponderMode === mode.id
                          ? "bg-[#4F39F6] text-white"
                          : "text-[#5E5E5E]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs font-semibold text-[#5E5E5E]">
                {currentQuestion.weightPoints} Points ⭐
              </span>
            </div>

            <h2 className="text-base font-bold text-[#121215] leading-relaxed">
              {currentQuestion.prompt}
            </h2>

            {/* Trenning Visual Mode A: 6-Card Image Multiple Choice (ref_21b top-left) */}
            {visualResponderMode === "image-mc" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { title: "Plus Jakarta Sans", sub: "Geometric Display", color: "#4F39F6" },
                  { title: "Inter Variable", sub: "Neutral UI Body", color: "#10B981" },
                  { title: "Playfair Display", sub: "Editorial Serif", color: "#0EA5E9" },
                  { title: "JetBrains Mono", sub: "Code & Data", color: "#F59E0B" },
                  { title: "Clash Display", sub: "Hero Headline", color: "#EC4899" },
                  { title: "Satoshi Grotesk", sub: "Clean Brand Sans", color: "#6366F1" },
                ].map((card, cIdx) => {
                  const isPicked = selectedImageCardIdx === cIdx;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => setSelectedImageCardIdx(cIdx)}
                      className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        isPicked
                          ? "bg-[#FFFFFF] border-2 border-[#4F39F6] shadow-sm"
                          : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <div className="h-20 rounded-lg bg-[#F8F9FB] border border-[#EAECEF] flex flex-col items-center justify-center mb-2">
                        <span
                          className="text-xl font-extrabold"
                          style={{ color: card.color }}
                        >
                          Aa Bb
                        </span>
                        <span className="text-[10px] text-[#5E5E5E]">
                          {card.sub}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#121215] truncate">
                        {card.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trenning Visual Mode B: Picture Matching Drag-and-Drop Puzzle Slots (ref_21b top-right) */}
            {visualResponderMode === "picture-matching" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#5E5E5E]">
                  Match each UI wireframe screen card with its corresponding userflow stage slot:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { screen: "Screen A: Welcome & Value Prop", accent: "#4F39F6" },
                    { screen: "Screen B: Cart & Payment Summary", accent: "#10B981" },
                    { screen: "Screen C: Account & Notification Toggle", accent: "#0EA5E9" },
                  ].map((slot, sIdx) => (
                    <div
                      key={slot.screen}
                      className="rounded-xl bg-[#FFFFFF] p-3.5 border border-[#EAECEF] space-y-2.5"
                    >
                      <div className="h-24 rounded-lg bg-[#F8F9FB] border border-[#EAECEF] flex items-center justify-center p-2 text-center">
                        <span
                          className="text-xs font-bold"
                          style={{ color: slot.accent }}
                        >
                          {slot.screen}
                        </span>
                      </div>
                      <select
                        value={matchedPuzzleLabels[sIdx]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMatchedPuzzleLabels((prev) =>
                            prev.map((item, i) => (i === sIdx ? val : item))
                          );
                        }}
                        className="w-full rounded-lg bg-[#4F39F6]/5 px-2.5 py-1.5 text-xs font-bold text-[#4F39F6] border border-[#4F39F6]/30"
                      >
                        <option value="Onboarding Screen">
                          🧩 Onboarding Screen
                        </option>
                        <option value="Checkout Flow">🧩 Checkout Flow</option>
                        <option value="Profile Settings">
                          🧩 Profile Settings
                        </option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. Multiple Choice Responder */}
            {currentQuestion.type === "Multiple choice" && (
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt) => {
                  const selected = mcSelection === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => setMcSelection(opt.id)}
                      className={`flex items-center gap-3 rounded-xl p-3.5 border cursor-pointer transition-all ${
                        selected
                          ? "bg-[#4F39F6]/5 border-[#4F39F6] ring-1 ring-[#4F39F6]"
                          : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="learner-mc-choice"
                        checked={selected}
                        onChange={() => setMcSelection(opt.id)}
                        className="h-4 w-4 accent-[#4F39F6]"
                      />
                      <span className="text-xs font-semibold text-[#121215]">
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* 2. Fill in the Blank Responder */}
            {currentQuestion.type === "Fill in the blank" && (
              <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-3 text-xs leading-loose text-[#121215]">
                <p className="font-medium">
                  To calculate campaign{" "}
                  <input
                    type="text"
                    value={blankInputs.b1}
                    onChange={(e) =>
                      setBlankInputs((p) => ({ ...p, b1: e.target.value }))
                    }
                    aria-label="Blank 1"
                    className="mx-1 w-24 rounded-md bg-[#F8F9FB] px-2 py-1 font-bold text-[#4F39F6] border border-[#4F39F6]"
                  />
                  , divide total conversion{" "}
                  <input
                    type="text"
                    value={blankInputs.b2}
                    onChange={(e) =>
                      setBlankInputs((p) => ({ ...p, b2: e.target.value }))
                    }
                    aria-label="Blank 2"
                    className="mx-1 w-28 rounded-md bg-[#F8F9FB] px-2 py-1 font-bold text-[#4F39F6] border border-[#4F39F6]"
                  />{" "}
                  by total{" "}
                  <input
                    type="text"
                    value={blankInputs.b3}
                    onChange={(e) =>
                      setBlankInputs((p) => ({ ...p, b3: e.target.value }))
                    }
                    aria-label="Blank 3"
                    className="mx-1 w-28 rounded-md bg-[#F8F9FB] px-2 py-1 font-bold text-[#4F39F6] border border-[#4F39F6]"
                  />{" "}
                  in the selected{" "}
                  <input
                    type="text"
                    value={blankInputs.b4}
                    onChange={(e) =>
                      setBlankInputs((p) => ({ ...p, b4: e.target.value }))
                    }
                    aria-label="Blank 4"
                    className="mx-1 w-28 rounded-md bg-[#F8F9FB] px-2 py-1 font-bold text-[#4F39F6] border border-[#4F39F6]"
                  />{" "}
                  attribution window.
                </p>
              </div>
            )}

            {/* 3. Hotspot Responder (Click directly on target coordinate of image) */}
            {currentQuestion.type === "Hotspot / Image-based" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#5E5E5E]">
                  Click directly on the metric column showing Creative Fatigue:
                </p>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(
                      ((e.clientX - rect.left) / rect.width) * 100
                    );
                    const y = Math.round(
                      ((e.clientY - rect.top) / rect.height) * 100
                    );
                    setHotspotClick({ x, y });
                  }}
                  className="relative h-56 w-full rounded-xl bg-[#0F172A] p-5 text-white cursor-crosshair select-none overflow-hidden"
                >
                  <div className="grid grid-cols-4 gap-3 text-[11px] mt-4">
                    <div className="rounded bg-white/10 p-3">
                      <p className="text-white/60">Ad Set</p>
                      <p className="font-bold mt-1">A — Lookalike</p>
                      <p className="font-bold mt-2">B — Broad Reels</p>
                    </div>
                    <div className="rounded bg-white/10 p-3">
                      <p className="text-white/60">Thumbstop</p>
                      <p className="font-bold text-[#10B981] mt-1">42.8%</p>
                      <p className="font-bold text-[#10B981] mt-2">39.1%</p>
                    </div>
                    <div className="rounded bg-white/10 p-3">
                      <p className="text-white/60">ROAS</p>
                      <p className="font-bold mt-1">4.4x</p>
                      <p className="font-bold text-[#F59E0B] mt-2">1.6x</p>
                    </div>
                    <div className="rounded bg-white/15 border border-[#EF4444]/50 p-3">
                      <p className="text-white/60">Frequency &amp; CTR</p>
                      <p className="font-bold mt-1">1.4 • 1.85%</p>
                      <p className="font-bold text-[#EF4444] mt-2">
                        4.2 • 0.48%
                      </p>
                    </div>
                  </div>

                  {/* Learner Pin Marker */}
                  <div
                    style={{
                      left: `${hotspotClick.x}%`,
                      top: `${hotspotClick.y}%`,
                    }}
                    className="-translate-x-1/2 -translate-y-1/2 absolute inline-flex items-center gap-1 rounded-full bg-[#10B981] px-2.5 py-1 text-[10px] font-bold text-white shadow-lg ring-4 ring-[#10B981]/30"
                  >
                    <Target size={11} />
                    <span>
                      Selected ({hotspotClick.x}%, {hotspotClick.y}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Categorization Responder */}
            {currentQuestion.type === "Categorization" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentQuestion.categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-2"
                  >
                    <p className="text-xs font-bold text-[#4F39F6]">
                      {cat.categoryName}
                    </p>
                    {cat.items.map((it) => (
                      <div
                        key={it}
                        className="rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                      >
                        ✓ {it}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* 5. Open-Ended Essay Responder */}
            {currentQuestion.type === "Open-ended essay" && (
              <textarea
                rows={4}
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                placeholder="Write your campaign audit diagnosis and 3-step optimization plan..."
                className="w-full rounded-xl bg-[#FFFFFF] p-4 text-xs text-[#121215] leading-relaxed border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
              />
            )}

            {/* Trenning Bottom Checkbox: "I'm not sure about the answer yet." + Report An Issue (ref_21, ref_21b) */}
            <div className="pt-3 border-t border-[#EAECEF] flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="inline-flex items-center gap-2 font-semibold text-[#5E5E5E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={flaggedIds.includes(currentQuestion.id)}
                  onChange={toggleFlagCurrent}
                  className="h-4 w-4 accent-[#F59E0B] rounded cursor-pointer"
                />
                <span>I&apos;m not sure about the answer yet.</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  onShowToast("Reported issue on this quiz question to Trainer.")
                }
                className="inline-flex items-center gap-1 font-bold text-[#EF4444] hover:underline cursor-pointer"
              >
                <Flag size={12} />
                <span>Report An Issue</span>
              </button>
            </div>
          </div>

          {/* Bottom Runner Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] px-4 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubmitConfirmModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#10B981]/10 hover:text-[#059669] px-4 py-2 text-xs font-bold text-[#121215] border border-[#EAECEF] cursor-pointer"
              >
                <span>Review &amp; Submit Quiz</span>
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-5 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <span>Next Question</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitConfirmModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Submit Quiz Assessment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* INSTANT RESULT SCREEN WITH TRENNING 80TH PERCENTILE CURVE & ACCURACY CARDS (ref_21 center) */
        <div className="rounded-xl bg-[#FFFFFF] p-6 sm:p-8 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-6">
          {/* Purple Celebration Banner (ref_21 center) */}
          <div
            className="rounded-2xl p-6 text-white flex flex-wrap items-center justify-between gap-4"
            style={{
              background:
                "linear-gradient(135deg, #4F39F6 0%, #6366F1 55%, #7C3AED 100%)",
            }}
          >
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-bold">
                🏆 Top 20% Cohort Performer • 80th Percentile
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold">
                {results.passed
                  ? "Great Job! You Mastered This Assessment"
                  : "Assessment Completed — Review Your Mastery Curve"}
              </h1>
              <p className="text-xs text-white/85">
                You scored higher than 80% of learners in this cohort.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3 border border-white/20">
              <div>
                <p className="text-[10px] uppercase font-bold text-white/80">
                  Final Score
                </p>
                <p className="text-2xl font-extrabold tabular-nums">
                  168 / 200 pts ({results.scorePct}%)
                </p>
              </div>
            </div>
          </div>

          {/* Trenning 80th Percentile Distribution Curve & Score Bands (ref_21 center) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#121215]">
                  Cohort Percentile Distribution Curve
                </p>
                <span className="rounded bg-[#4F39F6]/10 px-2 py-0.5 text-[11px] font-bold text-[#4F39F6]">
                  80th Percentile
                </span>
              </div>

              {/* Bell-Curve Bars */}
              <div className="grid grid-cols-8 gap-2 items-end h-28 pt-4 px-2 border-b border-[#EAECEF]">
                {[18, 32, 54, 78, 95, 82, 48, 24].map((h, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-1 h-full justify-end"
                  >
                    {idx === 5 && (
                      <span className="rounded bg-[#10B981] px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                        You
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${h}%`,
                        backgroundColor: idx === 5 ? "#10B981" : "#C7D2FE",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                {[
                  { label: "Superior", range: "150–200 pts", active: true },
                  { label: "Established", range: "100–149 pts", active: false },
                  { label: "Developing", range: "50–99 pts", active: false },
                  { label: "Limited", range: "0–49 pts", active: false },
                ].map((band) => (
                  <div
                    key={band.label}
                    className={`rounded-lg p-2 border ${
                      band.active
                        ? "bg-[#10B981]/10 border-[#10B981] text-[#059669] font-bold"
                        : "bg-[#FFFFFF] border-[#EAECEF] text-[#5E5E5E]"
                    }`}
                  >
                    <p>{band.label}</p>
                    <p className="text-[9px] opacity-80">{band.range}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Question-Type Accuracy Cards (Hotspot, Drag and drop, Fill in the blank) */}
            <div className="md:col-span-5 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-2.5">
              <p className="text-xs font-bold text-[#121215]">
                Accuracy by Question Type
              </p>
              {[
                { type: "Hotspot / Image-based", pct: 90, color: "#10B981" },
                { type: "Drag and drop / Matching", pct: 85, color: "#4F39F6" },
                { type: "Fill in the blank", pct: 80, color: "#0EA5E9" },
                { type: "Multiple choice", pct: 95, color: "#F59E0B" },
              ].map((stat) => (
                <div
                  key={stat.type}
                  className="rounded-lg bg-[#FFFFFF] p-2.5 border border-[#EAECEF] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121215]">
                      {stat.type}
                    </span>
                    <span className="font-bold text-[#121215]">
                      {stat.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F8F9FB] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${stat.pct}%`,
                        backgroundColor: stat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Correct / Incorrect Review Breakdown with Trenning Filters (All quiz type | All answers) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Your Answer Review ({results.correctCount} of{" "}
                {results.breakdown.length} Correct)
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={reviewFilterType}
                  onChange={(e) => setReviewFilterType(e.target.value)}
                  className="rounded-lg bg-[#F8F9FB] px-2.5 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                >
                  <option value="All quiz type">All quiz type</option>
                  <option value="Multiple choice">Multiple choice</option>
                  <option value="Hotspot">Hotspot</option>
                  <option value="Fill in the blank">Fill in the blank</option>
                </select>
                <select
                  value={reviewFilterAnswer}
                  onChange={(e) => setReviewFilterAnswer(e.target.value)}
                  className="rounded-lg bg-[#F8F9FB] px-2.5 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                >
                  <option value="All answers">All answers</option>
                  <option value="Correct only">Correct only</option>
                  <option value="Incorrect only">Incorrect only</option>
                </select>
              </div>
            </div>

            {results.breakdown.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl p-4 border flex items-start gap-3 ${
                  item.correct
                    ? "bg-[#10B981]/5 border-[#10B981]/25"
                    : "bg-[#EF4444]/5 border-[#EF4444]/25"
                }`}
              >
                {item.correct ? (
                  <CheckCircle2
                    size={16}
                    className="text-[#10B981] shrink-0 mt-0.5"
                  />
                ) : (
                  <XCircle
                    size={16}
                    className="text-[#EF4444] shrink-0 mt-0.5"
                  />
                )}
                <div>
                  <p className="text-xs font-bold text-[#121215]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#5E5E5E] mt-1">
                    {item.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions: [Retry Quiz] (if attempts remain) and [Back to Learning Portal] */}
          <div className="pt-4 border-t border-[#EAECEF] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRetryQuiz}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-4 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Retry Quiz ({attemptsLeft} attempts left)</span>
            </button>

            <div className="flex items-center gap-2.5">
              {results.passed && (
                <button
                  type="button"
                  onClick={() => setCertModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <Award size={14} />
                  <span>🎓 View &amp; Download Certificate</span>
                </button>
              )}

              <button
                type="button"
                onClick={onExitQuiz}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                <span>Return to Learner Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trenning Submit Quiz Confirmation Modal (ref_21 left) */}
      {submitConfirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit Quiz Confirmation"
          onClick={() => setSubmitConfirmModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl p-6 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#121215]">
                Submit Quiz?
              </h2>
              <button
                type="button"
                onClick={() => setSubmitConfirmModalOpen(false)}
                className="text-xs font-bold text-[#5E5E5E] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Donut Summary & Breakdown (Answered, Not sure, Not Answered) */}
            <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] flex items-center justify-between gap-4">
              <div className="h-16 w-16 rounded-full border-4 border-[#10B981] flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-extrabold text-[#121215]">
                  16/20
                </span>
                <span className="text-[9px] text-[#5E5E5E]">Done</span>
              </div>
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#059669] font-semibold">
                    ● Answered
                  </span>
                  <span className="font-bold">16</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#D97706] font-semibold">
                    ● Not sure
                  </span>
                  <span className="font-bold">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9CA3AF] font-semibold">
                    ● Not Answered
                  </span>
                  <span className="font-bold">2</span>
                </div>
              </div>
            </div>

            {/* Clickable Skipped & Not Sure Questions List */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-[#121215]">
                Questions you skipped or marked as Not Sure:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Q4 (Not sure ?)", idx: 3 },
                  { label: "Q12 (Not sure ?)", idx: 1 },
                  { label: "Q18 (Skipped)", idx: 2 },
                  { label: "Q19 (Skipped)", idx: 4 },
                ].map((qJump) => (
                  <button
                    key={qJump.label}
                    type="button"
                    onClick={() => {
                      setCurrentIdx(qJump.idx % questions.length);
                      setSubmitConfirmModalOpen(false);
                    }}
                    className="rounded-lg bg-[#FEF3C7] hover:bg-[#FDE68A] px-2.5 py-1 text-[11px] font-bold text-[#B45309] border border-[#F59E0B]/30 cursor-pointer"
                  >
                    {qJump.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubmitConfirmModalOpen(false)}
                className="rounded-lg bg-[#F8F9FB] px-4 py-2 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitConfirmModalOpen(false);
                  handleSubmitQuiz();
                }}
                className="rounded-lg bg-[#10B981] hover:bg-[#059669] px-5 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                Finish!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Ruang Sosmed 2.0 Certificate Modal */}
      <OfficialCertificateModal
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        learnerName={learnerName}
        learnerRole="Social Media Specialist"
        courseTitle={quizTitle}
        credentialId="RS2-2026-8492"
        scoreLabel={`${results.scorePct}% Assessment Score • Passed on Ruang Sosmed 2.0`}
        onShowToast={onShowToast}
      />
    </div>
  );
}
