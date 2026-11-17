"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Settings,
  Play,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Clock,
  Star,
  Image as ImageIcon,
  Video,
  Volume2,
  Check,
  Flag,
  Award,
  Move,
  Upload,
  Bold,
  Italic,
  List,
  Link2,
  Target,
  ArrowUp,
  ArrowDown,
  Zap,
  Sparkles,
  FileText,
  Globe,
  X,
} from "lucide-react";
import {
  INITIAL_QUIZ_QUESTIONS,
  type QuizQuestionItem,
  type QuestionType,
} from "@/lib/phase4-data";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { ThumbnailPickerModal } from "@/components/ui/ThumbnailPickerModal";

interface ModularQuizBuilderProps {
  initialTitle?: string;
  onBack: () => void;
  onPublishQuiz: (title: string) => void;
  onShowToast: (msg: string) => void;
}

const QUESTION_TYPES: QuestionType[] = [
  "Multiple choice",
  "Fill in the blank",
  "Hotspot / Image-based",
  "Categorization",
  "Open-ended essay",
];

function EmeraldSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        {...({ switch: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        style={{ accentColor: "#10B981" }}
        className="h-4 w-4 accent-[#10B981] rounded cursor-pointer"
      />
    </label>
  );
}

export function ModularQuizBuilder({
  initialTitle = "Social Media Analytics & Campaign Fundamentals",
  onBack,
  onPublishQuiz,
  onShowToast,
}: ModularQuizBuilderProps) {
  // Active View: "settings" (View 1: Overview & Settings) or "studio" (View 2: Question Authoring Studio)
  const [activeView, setActiveView] = useState<"settings" | "studio">("studio");
  const [previewMode, setPreviewMode] = useState(false);

  // View 1: Quiz Overview & Question Settings State
  const [quizTitle, setQuizTitle] = useState(initialTitle || "Kuis Baru");
  const [bannerOffsetY, setBannerOffsetY] = useState(50);
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [quizBannerUrl, setQuizBannerUrl] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Assessment",
  ]);
  const [estimatedDuration, setEstimatedDuration] = useState("30 Menit");
  const [instructions, setInstructions] = useState("");

  // Right Column Question Settings toggles (Emerald #10B981 when active)
  const [shuffleQuestion, setShuffleQuestion] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState(true);
  const [skipAndAttemptLater, setSkipAndAttemptLater] = useState(true);
  const [adaptiveBankMode, setAdaptiveBankMode] = useState(false);
  const [passMarkEnabled, setPassMarkEnabled] = useState(true);
  const [passMarkValue, setPassMarkValue] = useState(80);
  const [passMarkUnit, setPassMarkUnit] = useState<"%" | "Point">("%");
  const [maxAttemptsEnabled, setMaxAttemptsEnabled] = useState(true);
  const [maxAttemptsCount, setMaxAttemptsCount] = useState(3);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);

  // View 2: Question Authoring Studio State
  const [questions, setQuestions] = useState<QuizQuestionItem[]>(() => [
    {
      id: "q-1",
      type: "Multiple choice",
      prompt: "",
      required: true,
      choiceOrder: "Keep choices in current order",
      timerMins: 2,
      weightPoints: 1,
      stemMediaType: "none",
      multipleCorrect: false,
      answerWithImage: false,
      options: [
        { id: "opt-1", text: "", isCorrect: true },
        { id: "opt-2", text: "", isCorrect: false },
      ],
      fillBlankSentence: "",
      hotspotZone: {
        xPercent: 50,
        yPercent: 40,
        widthPercent: 25,
        heightPercent: 28,
        label: "Target Area",
      },
      categories: [],
      rubricGuidelines: "",
    },
  ]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<
    string | "result-screen"
  >("q-1");

  // Result Screen Configuration State
  const [passMessage, setPassMessage] = useState(
    "Selamat! Kamu telah berhasil menyelesaikan kuis ini dan mencapai batas kelulusan."
  );
  const [failMessage, setFailMessage] = useState(
    "Nilai kamu belum mencapai batas kelulusan. Silakan pelajari kembali materi sebelum mencoba lagi."
  );
  const [issueCertificate, setIssueCertificate] = useState(true);

  // Trenning Reference Upgrades: Create with AI Modal (ref_10b) & Fill in the Blank Incorrect distractors (ref_11a)
  const [aiModalOpen, setAiModalOpen] = useState(false);

  useEffect(() => {
    if (!aiModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAiModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiModalOpen]);
  const [aiSourceMode, setAiSourceMode] = useState<"text" | "url" | "document">("text");
  const [aiTopicInput, setAiTopicInput] = useState("");
  const [aiQuestionType, setAiQuestionType] = useState("Multiple choice");
  const [aiDifficulty, setAiDifficulty] = useState<"Beginner" | "Intermediate" | "Expert">("Intermediate");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [incorrectDistractorChips, setIncorrectDistractorChips] = useState<string[]>([]);
  const [newBlankOptionInput, setNewBlankOptionInput] = useState("");
  const [newBlankOptionIsCorrect, setNewBlankOptionIsCorrect] = useState(false);

  // Render visual sentence with inline numbered pink/purple blank boxes (matches Image 3)
  const renderVisualFillBlankSentence = (sentence: string) => {
    const defaultText =
      sentence.trim() ||
      "A design system for enterprise products is a collection of reusable components, guided by clear [Direction] that can be assembled together to build any number of [Corporate] applications.";
    const parts = defaultText.split(/(\[[^\]]+\])/g);
    let blankCounter = 0;
    return parts.map((part, idx) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        blankCounter += 1;
        const word = part.slice(1, -1);
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 mx-1 rounded-md bg-[#FCE7F3] border border-[#F472B6] px-2 py-0.5 text-xs font-bold text-[#121215] align-baseline"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#EC4899] text-[10px] font-bold text-white">
              {blankCounter}
            </span>
            <span>{word}</span>
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const activeQuestion = questions.find((q) => q.id === selectedQuestionId);

  const updateActiveQuestion = (patch: Partial<QuizQuestionItem>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === selectedQuestionId ? { ...q, ...patch } : q))
    );
  };

  const handleAddQuestion = () => {
    const newId = `q-${Date.now()}`;
    const newQ: QuizQuestionItem = {
      id: newId,
      type: "Multiple choice",
      prompt: "",
      required: true,
      choiceOrder: "Keep choices in current order",
      timerMins: 2,
      weightPoints: 1,
      stemMediaType: "none",
      multipleCorrect: false,
      answerWithImage: false,
      options: [
        {
          id: `opt-${Date.now()}-1`,
          text: "",
          isCorrect: true,
        },
        {
          id: `opt-${Date.now()}-2`,
          text: "",
          isCorrect: false,
        },
      ],
      fillBlankSentence: "",
      hotspotZone: {
        xPercent: 50,
        yPercent: 40,
        widthPercent: 25,
        heightPercent: 28,
        label: "Target Area",
      },
      categories: [
        {
          id: `cat-${Date.now()}-1`,
          categoryName: "Kategori 1",
          items: [],
        },
      ],
      rubricGuidelines: "",
    };
    setQuestions((prev) => [...prev, newQ]);
    setSelectedQuestionId(newId);
    onShowToast("Added new question to Quiz Studio.");
  };

  const handleDuplicateQuestion = (question: QuizQuestionItem) => {
    const copyId = `q-copy-${Date.now()}`;
    const copy: QuizQuestionItem = {
      ...question,
      id: copyId,
      prompt: `${question.prompt} (Copy)`,
    };
    setQuestions((prev) => [...prev, copy]);
    setSelectedQuestionId(copyId);
    onShowToast("Duplicated question.");
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      onShowToast("A quiz must have at least 1 question.");
      return;
    }
    const nextList = questions.filter((q) => q.id !== id);
    setQuestions(nextList);
    setSelectedQuestionId(nextList[0].id);
    onShowToast("Deleted question from quiz.");
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;
    const copy = [...questions];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setQuestions(copy);
  };

  // Extract bracketed words for Fill in the Blank
  const extractBracketChips = (sentence: string): string[] => {
    const matches = sentence.match(/\[([^\]]+)\]/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(1, -1));
  };

  // Handle clicking on the Hotspot canvas to reposition the target box
  const handleHotspotCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeQuestion || previewMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(72, Math.round(clickX - 13)));
    const clampedY = Math.max(5, Math.min(64, Math.round(clickY - 15)));
    updateActiveQuestion({
      hotspotZone: {
        ...activeQuestion.hotspotZone,
        xPercent: clampedX,
        yPercent: clampedY,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
      {/* TOP NAVBAR: Back <, status "Edited 3m ago", Quiz title, collaborator avatars, [⚙ Settings], [▷ Preview Quiz], [Publish] */}
      <header className="sticky top-10 z-20 flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-3 border-b border-[#EAECEF]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to workspace"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>

          <ContentBadge type="Quiz" size="sm" />

          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            aria-label="Quiz Title"
            className="min-w-0 flex-1 max-w-md rounded-lg bg-transparent px-2 py-1 text-sm font-bold text-[#121215] hover:bg-[#F8F9FB] focus:bg-[#FFFFFF] focus:border focus:border-[#4F39F6] focus:outline-none truncate"
          />

          <span className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-medium text-[#5E5E5E]">
            Edited 3m ago
          </span>

          {/* Collaborator Avatars */}
          <div className="hidden sm:flex -space-x-1.5 pl-1">
            {[
              { initials: "DP", bg: "#FEF3C7", text: "#92400E" },
            ].map((av) => (
              <span
                key={av.initials}
                title={`Author ${av.initials}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#FFFFFF] text-[10px] font-bold"
                style={{ backgroundColor: av.bg, color: av.text }}
              >
                {av.initials}
              </span>
            ))}
          </div>
        </div>

        {/* Right Top Navbar Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveView((v) => (v === "settings" ? "studio" : "settings"))
            }
            aria-pressed={activeView === "settings"}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
              activeView === "settings"
                ? "bg-[#10B981]/10 border-[#10B981] text-[#059669]"
                : "bg-[#FFFFFF] border-[#EAECEF] text-[#121215] hover:bg-[#F8F9FB]"
            }`}
          >
            <Settings size={13} />
            <span>
              {activeView === "settings" ? "Question Studio" : "Settings"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("studio");
              setPreviewMode((p) => !p);
            }}
            aria-pressed={previewMode}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
              previewMode
                ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                : "bg-[#FFFFFF] border-[#EAECEF] text-[#121215] hover:bg-[#F8F9FB]"
            }`}
          >
            <Play size={12} />
            <span>{previewMode ? "Exit Preview" : "Preview Quiz"}</span>
          </button>

          <button
            type="button"
            onClick={() => onPublishQuiz(quizTitle)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
          >
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* VIEW 1: QUIZ OVERVIEW & QUESTION SETTINGS (2-COLUMN LAYOUT)           */}
      {/* ===================================================================== */}
      {activeView === "settings" ? (
        <div className="w-full px-4 sm:px-5 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#121215]">
                Quiz Overview &amp; Question Settings
              </h1>
              <p className="text-xs text-[#5E5E5E]">
                Configure assessment metadata, instructions, scoring rules, and
                passing thresholds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView("studio")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <span>Open Question Authoring Studio ({questions.length}) →</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (7 cols): Quiz Overview Form */}
            <div className="lg:col-span-7 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
              {/* Banner Thumbnail Preview with [Update thumbnail] and [Reposition] overlay buttons on hover */}
              <div
                className="group relative h-44 w-full overflow-hidden rounded-xl border border-[#EAECEF]"
                style={{
                  background: quizBannerUrl
                    ? "#121215"
                    : `linear-gradient(${bannerOffsetY + 85}deg, #ECFDF5 0%, #D1FAE5 45%, #A7F3D0 100%)`,
                }}
              >
                {quizBannerUrl && (
                  <img
                    src={quizBannerUrl}
                    alt="Quiz Banner"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
                    style={{
                      transform: `translateY(${(bannerOffsetY - 50) * 0.5}px)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/20">
                  <span className="rounded-lg bg-[#FFFFFF]/90 border border-[#10B981]/30 px-3 py-1 text-xs font-bold text-[#059669] shadow-2xs">
                    rs. Assessment Cover • {quizTitle}
                  </span>
                  <span className="mt-1.5 text-[11px] font-semibold text-white drop-shadow-sm">
                    {questions.length} Questions • {estimatedDuration} • Pass
                    Mark {passMarkValue}
                    {passMarkUnit}
                  </span>
                </div>

                {/* Hover Overlay Buttons: [Update thumbnail] and [Reposition] */}
                <div className="absolute inset-0 bg-[#121215]/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setThumbnailModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] shadow-md hover:bg-[#F8F9FB] cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Update thumbnail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerOffsetY((y) => (y === 50 ? 90 : 50));
                      onShowToast("Repositioned banner thumbnail focal point.");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] shadow-md hover:bg-[#F8F9FB] cursor-pointer"
                  >
                    <Move size={13} />
                    <span>Reposition</span>
                  </button>
                </div>
              </div>

              {/* Quiz Icon Badge + Editable Quiz Title */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ContentBadge type="Quiz" size="sm" />
                  <span className="text-[11px] text-[#9CA3AF]">
                    Ruang Sosmed 2.0 Official Assessment
                  </span>
                </div>
                <label
                  htmlFor="quiz-overview-title"
                  className="block text-xs font-semibold text-[#121215] mb-1"
                >
                  Quiz Title
                </label>
                <input
                  id="quiz-overview-title"
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 text-sm font-bold text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                />
              </div>

              {/* Category Tag Selector (Analytics, Assessment) + Estimated Duration Input (1 Hours) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                    Category Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Analytics", "Assessment", "Meta Ads", "Retention"].map(
                      (tag) => {
                        const active = selectedCategories.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setSelectedCategories((prev) =>
                                prev.includes(tag)
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag]
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                              active
                                ? "bg-[#10B981]/10 border-[#10B981] text-[#059669]"
                                : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E]"
                            }`}
                          >
                            {active && <Check size={11} strokeWidth={2.5} />}
                            <span>{tag}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quiz-est-duration"
                    className="block text-xs font-semibold text-[#121215] mb-1.5"
                  >
                    Estimated Duration
                  </label>
                  <div className="relative flex items-center">
                    <Clock
                      size={14}
                      className="pointer-events-none absolute left-3 text-[#9CA3AF]"
                    />
                    <input
                      id="quiz-est-duration"
                      type="text"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rich-Text Quiz Instructions Editor with Character Counter (500/500) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="quiz-instructions-textarea"
                    className="text-xs font-semibold text-[#121215]"
                  >
                    Quiz Instructions
                  </label>
                  <span className="text-[11px] font-semibold text-[#5E5E5E] tabular-nums">
                    {instructions.length}/500
                  </span>
                </div>

                <div className="rounded-xl border border-[#EAECEF] overflow-hidden bg-[#FFFFFF]">
                  <div className="flex items-center gap-1 bg-[#F8F9FB] px-2.5 py-1.5 border-b border-[#EAECEF]">
                    <button
                      type="button"
                      onClick={() =>
                        setInstructions((prev) =>
                          `${prev} **Important:**`.slice(0, 500)
                        )
                      }
                      aria-label="Bold instruction text"
                      className="p-1 rounded hover:bg-[#FFFFFF] text-[#5E5E5E] cursor-pointer"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInstructions((prev) =>
                          `${prev} *Note:*`.slice(0, 500)
                        )
                      }
                      aria-label="Italic instruction text"
                      className="p-1 rounded hover:bg-[#FFFFFF] text-[#5E5E5E] cursor-pointer"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInstructions((prev) =>
                          `${prev}\n• Check attribution window`.slice(0, 500)
                        )
                      }
                      aria-label="Bullet list in instructions"
                      className="p-1 rounded hover:bg-[#FFFFFF] text-[#5E5E5E] cursor-pointer"
                    >
                      <List size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInstructions((prev) =>
                          `${prev} [Formula Reference]`.slice(0, 500)
                        )
                      }
                      aria-label="Insert link in instructions"
                      className="p-1 rounded hover:bg-[#FFFFFF] text-[#5E5E5E] cursor-pointer"
                    >
                      <Link2 size={13} />
                    </button>
                  </div>
                  <textarea
                    id="quiz-instructions-textarea"
                    rows={4}
                    maxLength={500}
                    value={instructions}
                    onChange={(e) =>
                      setInstructions(e.target.value.slice(0, 500))
                    }
                    placeholder="Tuliskan instruksi kuis untuk siswa di sini..."
                    className="w-full p-3.5 text-xs text-[#121215] leading-relaxed focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (5 cols): Question Settings Configuration Panel */}
            <div className="lg:col-span-5 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
              <div>
                <h2 className="text-sm font-bold text-[#121215]">
                  Question Settings
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Delivery behavior, adaptive retries, and passing thresholds
                </p>
              </div>

              {/* Clean Card with Toggle Switches (Emerald Green #10B981 when active) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]">
                  <div>
                    <p className="text-xs font-semibold text-[#121215]">
                      Shuffle question
                    </p>
                    <p className="text-[11px] text-[#5E5E5E]">
                      Randomize question sequence for each learner
                    </p>
                  </div>
                  <EmeraldSwitch
                    checked={shuffleQuestion}
                    onChange={setShuffleQuestion}
                    label="Shuffle question"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]">
                  <div>
                    <p className="text-xs font-semibold text-[#121215]">
                      Expanded the question
                    </p>
                    <p className="text-[11px] text-[#5E5E5E]">
                      Display full question stem &amp; media expanded by default
                    </p>
                  </div>
                  <EmeraldSwitch
                    checked={expandedQuestion}
                    onChange={setExpandedQuestion}
                    label="Expanded the question"
                  />
                </div>
              </div>

              {/* Advanced Scoring Box (Improve test scores [PRO] badge) */}
              <div className="rounded-xl bg-[#FFFBEB]/70 p-4 border border-[#FDE68A] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#121215]">
                    Improve test scores
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#121215]">
                    <Zap size={10} fill="currentColor" />
                    PRO
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-semibold text-[#121215]">
                      Skip Question &amp; Attempt Later
                    </p>
                    <p className="text-[11px] text-[#5E5E5E]">
                      Allow learners to flag and revisit skipped prompts
                    </p>
                  </div>
                  <EmeraldSwitch
                    checked={skipAndAttemptLater}
                    onChange={setSkipAndAttemptLater}
                    label="Skip Question & Attempt Later"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#FDE68A]/60">
                  <div>
                    <p className="text-xs font-semibold text-[#121215]">
                      Adaptive question bank mode
                    </p>
                    <p className="text-[11px] text-[#5E5E5E]">
                      Randomizes questions from pool on retry
                    </p>
                  </div>
                  <EmeraldSwitch
                    checked={adaptiveBankMode}
                    onChange={setAdaptiveBankMode}
                    label="Adaptive question bank mode"
                  />
                </div>
              </div>

              {/* Answer & Passing Rules Section */}
              <div className="pt-2 border-t border-[#EAECEF] space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Answer &amp; Passing Rules
                </h3>

                {/* Pass Mark toggle + numeric input (80) + unit selector (% vs Point) */}
                <div className="rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#121215]">
                      Pass Mark
                    </span>
                    <EmeraldSwitch
                      checked={passMarkEnabled}
                      onChange={setPassMarkEnabled}
                      label="Enable Pass Mark"
                    />
                  </div>
                  {passMarkEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={passMarkValue}
                        onChange={(e) =>
                          setPassMarkValue(Number(e.target.value))
                        }
                        aria-label="Pass mark threshold"
                        className="w-24 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#121215] border border-[#EAECEF]"
                      />
                      <select
                        aria-label="Pass mark unit"
                        value={passMarkUnit}
                        onChange={(e) =>
                          setPassMarkUnit(e.target.value as "%" | "Point")
                        }
                        className="rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                      >
                        <option value="%">% (Percentage)</option>
                        <option value="Point">Point</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Max Attempts toggle + counter input (3 attempts) */}
                <div className="rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#121215]">
                      Max Attempts
                    </span>
                    <EmeraldSwitch
                      checked={maxAttemptsEnabled}
                      onChange={setMaxAttemptsEnabled}
                      label="Enable Max Attempts"
                    />
                  </div>
                  {maxAttemptsEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={maxAttemptsCount}
                        onChange={(e) =>
                          setMaxAttemptsCount(Number(e.target.value))
                        }
                        aria-label="Max attempts count"
                        className="w-20 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#121215] border border-[#EAECEF]"
                      />
                      <span className="text-xs font-medium text-[#5E5E5E]">
                        attempts allowed per learner
                      </span>
                    </div>
                  )}
                </div>

                {/* Show correct answers after submission toggle */}
                <div className="flex items-center justify-between rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]">
                  <span className="text-xs font-semibold text-[#121215]">
                    Show correct answers after submission
                  </span>
                  <EmeraldSwitch
                    checked={showCorrectAnswers}
                    onChange={setShowCorrectAnswers}
                    label="Show correct answers after submission"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* VIEW 2: QUESTION AUTHORING STUDIO (3-PART WORKSPACE)                */
        /* =================================================================== */
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Sidebar (Questions (5) - 260px width) */}
          <aside
            aria-label="Quiz Questions Navigator"
            className="w-full lg:w-[260px] shrink-0 bg-[#F9FAFB] border-b lg:border-b-0 lg:border-r border-[#EAECEF] p-3.5 flex flex-col justify-between"
          >
            <div className="space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                  Questions ({questions.length})
                </h2>
                <span className="text-[11px] font-semibold text-[#10B981]">
                  {questions.reduce((sum, q) => sum + q.weightPoints, 0)} pts
                  total
                </span>
              </div>

              {/* Scrollable, Draggable List of Question Cards */}
              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const isSelected = selectedQuestionId === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={`group rounded-xl p-2.5 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFFFFF] border-[#4F39F6] ring-1 ring-[#4F39F6] shadow-xs"
                          : "bg-[#FFFFFF] border-[#EAECEF] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <GripVertical
                            size={13}
                            className="text-[#9CA3AF] shrink-0 cursor-grab"
                          />
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold ${
                              isSelected
                                ? "bg-[#4F39F6] text-white"
                                : "bg-[#F8F9FB] text-[#5E5E5E]"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="rounded-md bg-[#10B981]/10 border border-[#10B981]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#059669]">
                            {q.type === "Hotspot / Image-based"
                              ? "Hotspot"
                              : q.type}
                          </span>
                        </div>

                        <div
                          className="hidden group-hover:flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-[#F8F9FB] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, "down")}
                            disabled={idx === questions.length - 1}
                            className="p-0.5 rounded hover:bg-[#F8F9FB] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown size={11} />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs font-medium text-[#121215] line-clamp-2 leading-snug">
                        {q.prompt}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* [+ Create from Scratch] Button */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:border-[#4F39F6] hover:text-[#4F39F6] py-2 text-xs font-semibold text-[#121215] border border-dashed border-[#D1D5DB] transition-colors cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span>Add New Question</span>
                </button>
              </div>
            </div>

            {/* Pinned Bottom Item: 🏁 Result Screen */}
            <div className="pt-3 mt-4 border-t border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setSelectedQuestionId("result-screen")}
                className={`w-full flex items-center justify-between rounded-xl p-3 text-left border transition-all cursor-pointer ${
                  selectedQuestionId === "result-screen"
                    ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                    : "bg-[#FFFFFF] border-[#EAECEF] text-[#121215] hover:bg-[#F8F9FB]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
                    <Flag size={14} />
                  </span>
                  <div>
                    <p className="text-xs font-bold">🏁 Result Screen</p>
                    <p className="text-[10px] text-[#5E5E5E]">
                      Pass/Fail &amp; Certificate
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </aside>

          {/* Center Question Editor Canvas */}
          <div className="flex-1 min-w-0 px-6 sm:px-10 py-7 overflow-y-auto">
            {selectedQuestionId === "result-screen" ? (
              /* Pinned Result Screen Editor */
              <div className="w-full rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAECEF]">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
                      <Award size={18} />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-[#121215]">
                        🏁 Quiz Result Screen &amp; Certificate Issuance
                      </h2>
                      <p className="text-xs text-[#5E5E5E]">
                        Customize completion messaging and Ruang Sosmed 2.0
                        verified credential delivery
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#10B981] mb-1.5">
                    Passing Message (≥ {passMarkValue}
                    {passMarkUnit})
                  </label>
                  <textarea
                    rows={3}
                    value={passMessage}
                    onChange={(e) => setPassMessage(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] p-3 text-xs text-[#121215] border border-[#EAECEF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#EF4444] mb-1.5">
                    Retry / Below Threshold Message (&lt; {passMarkValue}
                    {passMarkUnit})
                  </label>
                  <textarea
                    rows={3}
                    value={failMessage}
                    onChange={(e) => setFailMessage(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] p-3 text-xs text-[#121215] border border-[#EAECEF]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF]">
                  <div>
                    <p className="text-xs font-bold text-[#121215]">
                      Auto-Issue Ruang Sosmed 2.0 Verified Certificate
                    </p>
                    <p className="text-[11px] text-[#5E5E5E]">
                      Generates a downloadable PDF certificate signed by Lead
                      Mentor upon passing
                    </p>
                  </div>
                  <EmeraldSwitch
                    checked={issueCertificate}
                    onChange={setIssueCertificate}
                    label="Auto-Issue Ruang Sosmed 2.0 Certificate"
                  />
                </div>
              </div>
            ) : (
              activeQuestion && (
                <div className="w-full space-y-4">
                  {/* 1. Question Top Meta Bar: Choice ordering dropdown, Question Timer (2 Mins ⏱), Question Weight (1 Points ⭐) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] px-4 py-3 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
                    <select
                      aria-label="Choice ordering"
                      value={activeQuestion.choiceOrder}
                      onChange={(e) =>
                        updateActiveQuestion({
                          choiceOrder: e.target
                            .value as QuizQuestionItem["choiceOrder"],
                        })
                      }
                      className="rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:outline-none cursor-pointer"
                    >
                      <option value="Keep choices in current order">
                        Keep choices in current order
                      </option>
                      <option value="Randomize choices">
                        Randomize choices
                      </option>
                    </select>

                    <div className="flex items-center gap-2.5">
                      {/* Question Timer Input: 2 Mins ⏱ */}
                      <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF]">
                        <Clock size={13} className="text-[#4F39F6]" />
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={activeQuestion.timerMins}
                          onChange={(e) =>
                            updateActiveQuestion({
                              timerMins: Number(e.target.value),
                            })
                          }
                          aria-label="Question timer in minutes"
                          className="w-10 bg-transparent text-center font-bold text-[#121215] focus:outline-none"
                        />
                        <span className="text-[#5E5E5E]">Mins ⏱</span>
                      </label>

                      {/* Question Weight Input: 1 Points ⭐ */}
                      <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEF3C7]/60 px-3 py-1.5 text-xs font-semibold text-[#92400E] border border-[#F59E0B]/30">
                        <Star
                          size={13}
                          className="text-[#F59E0B]"
                          fill="#F59E0B"
                        />
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={activeQuestion.weightPoints}
                          onChange={(e) =>
                            updateActiveQuestion({
                              weightPoints: Number(e.target.value),
                            })
                          }
                          aria-label="Question weight in points"
                          className="w-10 bg-transparent text-center font-bold text-[#B45309] focus:outline-none"
                        />
                        <span>Points ⭐</span>
                      </label>
                    </div>
                  </div>

                  {/* 2. Main Question Card */}
                  <div className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
                    {/* Header Row: Question Type Dropdown, Required green toggle switch, Duplicate icon, Delete trash icon */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EAECEF]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[#9CA3AF]">
                          Q
                          {questions.findIndex(
                            (q) => q.id === activeQuestion.id
                          ) + 1}
                        </span>
                        <select
                          aria-label="Question Type"
                          value={activeQuestion.type}
                          onChange={(e) =>
                            updateActiveQuestion({
                              type: e.target.value as QuestionType,
                            })
                          }
                          className="rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-bold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#121215]">
                          <span>Required</span>
                          <EmeraldSwitch
                            checked={activeQuestion.required}
                            onChange={(val) =>
                              updateActiveQuestion({ required: val })
                            }
                            label="Required question"
                          />
                        </div>

                        <span className="h-4 w-[1px] bg-[#EAECEF]" />

                        <button
                          type="button"
                          onClick={() =>
                            handleDuplicateQuestion(activeQuestion)
                          }
                          title="Duplicate question"
                          aria-label="Duplicate question"
                          className="p-1.5 rounded-lg text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215] cursor-pointer"
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteQuestion(activeQuestion.id)
                          }
                          title="Delete question"
                          aria-label="Delete question"
                          className="p-1.5 rounded-lg text-[#5E5E5E] hover:bg-[#EF4444]/10 hover:text-[#EF4444] cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt Input with Inline Attachment Buttons for Image, Video, or Audio */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-semibold text-[#121215]">
                        Question Prompt Stem
                      </label>
                      <div className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] overflow-hidden focus-within:bg-[#FFFFFF] focus-within:border-[#4F39F6] transition-colors">
                        <textarea
                          rows={3}
                          disabled={previewMode}
                          value={activeQuestion.prompt}
                          onChange={(e) =>
                            updateActiveQuestion({ prompt: e.target.value })
                          }
                          placeholder="Type your question prompt here..."
                          className="w-full bg-transparent p-3.5 text-sm font-medium text-[#121215] focus:outline-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFFFFF] px-3.5 py-2 border-t border-[#EAECEF]">
                          <span className="text-[11px] font-medium text-[#9CA3AF]">
                            Attach reference media to question stem:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {(
                              [
                                {
                                  id: "image",
                                  label: "Image",
                                  icon: ImageIcon,
                                },
                                { id: "video", label: "Video", icon: Video },
                                { id: "audio", label: "Audio", icon: Volume2 },
                              ] as const
                            ).map((media) => {
                              const Icon = media.icon;
                              const isAttached =
                                activeQuestion.stemMediaType === media.id;
                              return (
                                <button
                                  key={media.id}
                                  type="button"
                                  onClick={() => {
                                    updateActiveQuestion({
                                      stemMediaType: isAttached
                                        ? "none"
                                        : media.id,
                                      stemMediaLabel: `reference-${media.id}-asset`,
                                    });
                                    onShowToast(
                                      isAttached
                                        ? `Removed stem ${media.label}.`
                                        : `Attached reference ${media.label} to question stem.`
                                    );
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    isAttached
                                      ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                                      : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215]"
                                  }`}
                                >
                                  <Icon size={12} />
                                  <span>{media.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ========================================================= */}
                    {/* DYNAMIC ANSWER CONFIGURATOR (ADAPTS BY QUESTION TYPE)     */}
                    {/* ========================================================= */}

                    {/* CASE 1: MULTIPLE CHOICE */}
                    {activeQuestion.type === "Multiple choice" && (
                      <div className="space-y-4 pt-2">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#121215] cursor-pointer">
                            <EmeraldSwitch
                              checked={activeQuestion.multipleCorrect}
                              onChange={(val) =>
                                updateActiveQuestion({ multipleCorrect: val })
                              }
                              label="Multiple correct answers"
                            />
                            <span>Multiple correct answers</span>
                          </label>

                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#121215] cursor-pointer">
                            <EmeraldSwitch
                              checked={activeQuestion.answerWithImage}
                              onChange={(val) =>
                                updateActiveQuestion({ answerWithImage: val })
                              }
                              label="Answer with image"
                            />
                            <span>Answer with image</span>
                          </label>
                        </div>

                        {/* Visual Image Card Grid when Answer with image is ON (ref_11, ref_11b) */}
                        {activeQuestion.answerWithImage && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            {activeQuestion.options.map((opt, oIdx) => {
                              const sampleStyles = [
                                { title: " hierarchy", sub: "Sans-serif Clean UI", accent: "#4F39F6" },
                                { title: "Editorial", sub: "Serif Display Hook", accent: "#10B981" },
                                { title: "Monospace", sub: "Code & Data Metrics", accent: "#0EA5E9" },
                                { title: "Condensed", sub: "Bold Impact Title", accent: "#F59E0B" },
                              ];
                              const cardStyle = sampleStyles[oIdx % sampleStyles.length];
                              return (
                                <div
                                  key={`img-card-${opt.id}`}
                                  onClick={() => {
                                    const nextOpts = activeQuestion.options.map((o) =>
                                      activeQuestion.multipleCorrect
                                        ? o.id === opt.id
                                          ? { ...o, isCorrect: !o.isCorrect }
                                          : o
                                        : { ...o, isCorrect: o.id === opt.id }
                                    );
                                    updateActiveQuestion({ options: nextOpts });
                                  }}
                                  className={`rounded-xl p-3 border transition-all cursor-pointer ${
                                    opt.isCorrect
                                      ? "bg-[#10B981]/5 border-2 border-[#10B981]"
                                      : "bg-[#F8F9FB] border-[#EAECEF] hover:border-[#4F39F6]"
                                  }`}
                                >
                                  <div className="h-24 rounded-lg bg-[#FFFFFF] border border-[#EAECEF] flex flex-col items-center justify-center p-2 text-center mb-2">
                                    <span
                                      className="text-lg font-extrabold tracking-tight"
                                      style={{ color: cardStyle.accent }}
                                    >
                                      Aa Bb
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#5E5E5E] mt-0.5">
                                      {cardStyle.sub}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-[#121215] truncate">
                                      {opt.text}
                                    </span>
                                    {opt.isCorrect && (
                                      <span className="h-4 w-4 rounded-full bg-[#10B981] text-white inline-flex items-center justify-center shrink-0">
                                        <Check size={10} strokeWidth={3} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Answer Option Rows */}
                        <div className="space-y-2.5">
                          {activeQuestion.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2.5 rounded-xl p-3 border transition-all ${
                                opt.isCorrect
                                  ? "bg-[#10B981]/5 border-[#10B981]"
                                  : "bg-[#FFFFFF] border-[#EAECEF]"
                              }`}
                            >
                              <GripVertical
                                size={15}
                                className="text-[#9CA3AF] shrink-0 cursor-grab"
                              />

                              {/* Radio / Checkbox to mark correct answer in green */}
                              <input
                                type={
                                  activeQuestion.multipleCorrect
                                    ? "checkbox"
                                    : "radio"
                                }
                                name={`correct-opt-${activeQuestion.id}`}
                                checked={opt.isCorrect}
                                onChange={() => {
                                  const nextOpts = activeQuestion.options.map(
                                    (o) => {
                                      if (activeQuestion.multipleCorrect) {
                                        return o.id === opt.id
                                          ? { ...o, isCorrect: !o.isCorrect }
                                          : o;
                                      }
                                      return {
                                        ...o,
                                        isCorrect: o.id === opt.id,
                                      };
                                    }
                                  );
                                  updateActiveQuestion({ options: nextOpts });
                                }}
                                aria-label={`Mark option "${opt.text}" as correct`}
                                style={{ accentColor: "#10B981" }}
                                className="h-4 w-4 shrink-0 accent-[#10B981] cursor-pointer"
                              />

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateActiveQuestion({
                                    options: activeQuestion.options.map((o) =>
                                      o.id === opt.id ? { ...o, text: val } : o
                                    ),
                                  });
                                }}
                                className="flex-1 bg-transparent text-xs font-semibold text-[#121215] focus:outline-none"
                              />

                              {opt.isCorrect && (
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#10B981] px-2 py-0.5 text-[10px] font-bold text-white">
                                  <Check size={10} strokeWidth={3} />
                                  Correct
                                </span>
                              )}

                              {/* Image upload button on option */}
                              <button
                                type="button"
                                onClick={() =>
                                  onShowToast(
                                    `Uploaded option image for "${opt.text}".`
                                  )
                                }
                                title="Attach image to answer choice"
                                aria-label="Attach image to answer choice"
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  activeQuestion.answerWithImage
                                    ? "bg-[#4F39F6]/10 border-[#4F39F6]/30 text-[#4F39F6]"
                                    : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215]"
                                }`}
                              >
                                <ImageIcon size={13} />
                              </button>

                              {/* Red delete icon */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeQuestion.options.length <= 2) {
                                    onShowToast(
                                      "Keep at least 2 answer choices."
                                    );
                                    return;
                                  }
                                  updateActiveQuestion({
                                    options: activeQuestion.options.filter(
                                      (o) => o.id !== opt.id
                                    ),
                                  });
                                }}
                                aria-label={`Delete option ${opt.text}`}
                                className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateActiveQuestion({
                              options: [
                                ...activeQuestion.options,
                                {
                                  id: `opt-${Date.now()}`,
                                  text: `New answer option ${
                                    activeQuestion.options.length + 1
                                  }`,
                                  isCorrect: false,
                                },
                              ],
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:border-[#4F39F6] hover:text-[#4F39F6] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Add answer option</span>
                        </button>
                      </div>
                    )}

                    {/* CASE 2: FILL IN THE BLANK (matches Image 3) */}
                    {activeQuestion.type === "Fill in the blank" && (
                      <div className="space-y-4 pt-2">
                        {/* Visual Inline Sentence Box with Numbered Pink Blank Pills (matches Image 3) */}
                        <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 space-y-3">
                          <div className="text-xs sm:text-sm text-[#121215] leading-7">
                            {renderVisualFillBlankSentence(
                              activeQuestion.fillBlankSentence
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={activeQuestion.fillBlankSentence}
                            onChange={(e) =>
                              updateActiveQuestion({
                                fillBlankSentence: e.target.value,
                              })
                            }
                            placeholder="Ketik kalimat soal dan gunakan kurung siku [kata] untuk membuat kotak jawaban rumpang (contoh: [Direction] dan [Corporate])..."
                            className="w-full rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs text-[#5E5E5E] border border-[#EAECEF] focus:border-[#4F39F6] focus:text-[#121215] focus:outline-none"
                          />
                        </div>

                        {/* Two Dashed Action Buttons Below Sentence: [+ Add answers correct] & [+ Add answers incorrect] (matches Image 3) */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setNewBlankOptionIsCorrect(true);
                              const base =
                                activeQuestion.fillBlankSentence.trim() ||
                                "A design system for enterprise products is guided by clear [Direction] to build [Corporate] applications.";
                              updateActiveQuestion({
                                fillBlankSentence: `${base} [Answer]`,
                              });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#D1D5DB] hover:border-[#EC4899] bg-[#FFFFFF] hover:bg-[#FDF2F8] px-3 py-1.5 text-xs font-semibold text-[#121215] transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add answers correct</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNewBlankOptionIsCorrect(false);
                              setIncorrectDistractorChips((prev) => [
                                ...prev,
                                `Distractor ${prev.length + 1}`,
                              ]);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#D1D5DB] hover:border-[#4F39F6] bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add answers incorrect</span>
                          </button>
                        </div>

                        {/* Answer Options* Box with "ⓘ Students will see shuffled answer options" & Inline Input (matches Image 3) */}
                        <div className="space-y-2 pt-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#121215]">
                              Answer Options<span className="text-[#EF4444]">*</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                              <span>ⓘ</span>
                              <span>Students will see shuffled answer options</span>
                            </span>
                          </div>

                          <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 flex flex-wrap items-center gap-2">
                            {/* Correct Numbered Pink Chips */}
                            {(extractBracketChips(activeQuestion.fillBlankSentence)
                              .length > 0
                              ? extractBracketChips(
                                  activeQuestion.fillBlankSentence
                                )
                              : ["Direction", "Corporate"]
                            ).map((chip, idx) => (
                              <span
                                key={`correct-${chip}-${idx}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FCE7F3] border border-[#F472B6] px-2.5 py-1.5 text-xs font-bold text-[#121215]"
                              >
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#EC4899] text-[10px] font-bold text-white">
                                  {idx + 1}
                                </span>
                                <span>{chip}</span>
                              </span>
                            ))}

                            {/* Incorrect Gray Distractor Chips */}
                            {incorrectDistractorChips.map((dChip, dIdx) => (
                              <span
                                key={`dist-${dChip}-${dIdx}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] border border-[#EAECEF] px-3 py-1.5 text-xs font-medium text-[#121215]"
                              >
                                <span>{dChip}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIncorrectDistractorChips((prev) =>
                                      prev.filter((_, i) => i !== dIdx)
                                    )
                                  }
                                  className="text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                                  title="Remove distractor"
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            ))}

                            {/* Inline Input Box with [↵] and [🗑] (matches Image 3) */}
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] border border-[#D1D5DB] focus-within:border-[#4F39F6] px-2.5 py-1">
                              <input
                                type="text"
                                value={newBlankOptionInput}
                                onChange={(e) =>
                                  setNewBlankOptionInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    newBlankOptionInput.trim()
                                  ) {
                                    e.preventDefault();
                                    const val = newBlankOptionInput.trim();
                                    if (newBlankOptionIsCorrect) {
                                      updateActiveQuestion({
                                        fillBlankSentence: `${activeQuestion.fillBlankSentence} [${val}]`,
                                      });
                                    } else {
                                      setIncorrectDistractorChips((prev) => [
                                        ...prev,
                                        val,
                                      ]);
                                    }
                                    setNewBlankOptionInput("");
                                  }
                                }}
                                placeholder={
                                  newBlankOptionIsCorrect
                                    ? "Add correct blank..."
                                    : "Add distractor..."
                                }
                                className="w-28 sm:w-32 bg-transparent text-xs text-[#121215] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = newBlankOptionInput.trim();
                                  if (!val) return;
                                  if (newBlankOptionIsCorrect) {
                                    updateActiveQuestion({
                                      fillBlankSentence: `${activeQuestion.fillBlankSentence} [${val}]`,
                                    });
                                  } else {
                                    setIncorrectDistractorChips((prev) => [
                                      ...prev,
                                      val,
                                    ]);
                                  }
                                  setNewBlankOptionInput("");
                                }}
                                title="Confirm option (Enter)"
                                className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#F8F9FB] hover:bg-[#4F39F6] text-[#5E5E5E] hover:text-white text-[10px] font-bold border border-[#EAECEF] cursor-pointer"
                              >
                                ↵
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewBlankOptionInput("")}
                                title="Clear input"
                                className="text-[#9CA3AF] hover:text-[#EF4444] p-0.5 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASE 3: HOTSPOT / IMAGE-BASED */}
                    {activeQuestion.type === "Hotspot / Image-based" && (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#5E5E5E]">
                            Click anywhere on the Ads Manager screenshot below
                            to position the correct target hotspot zone:
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/10 px-2 py-0.5 font-bold text-[#059669]">
                            <Target size={12} />
                            Zone: ({activeQuestion.hotspotZone.xPercent}%,{" "}
                            {activeQuestion.hotspotZone.yPercent}%)
                          </span>
                        </div>

                        {/* Interactive Hotspot Image Canvas */}
                        <div
                          onClick={handleHotspotCanvasClick}
                          className="relative h-64 w-full rounded-xl bg-[#0F172A] border border-[#EAECEF] overflow-hidden cursor-crosshair select-none p-5 text-white"
                        >
                          {/* Simulated Meta Ads Dashboard Table inside Canvas */}
                          <div className="text-[11px] font-bold text-white/80 mb-3 flex items-center justify-between border-b border-white/15 pb-2">
                            <span>
                              Meta Ads Manager — Q4 Campaign Breakdown
                            </span>
                            <span className="text-[#10B981]">
                              Click to place target box
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-[11px]">
                            <div className="rounded bg-white/10 p-2.5">
                              <p className="text-white/60">Ad Set Name</p>
                              <p className="font-bold mt-1">
                                A — Lookalike 1%
                              </p>
                              <p className="font-bold mt-2">
                                B — Broad Reels
                              </p>
                            </div>
                            <div className="rounded bg-white/10 p-2.5">
                              <p className="text-white/60">Thumbstop (3s)</p>
                              <p className="font-bold text-[#10B981] mt-1">
                                42.8%
                              </p>
                              <p className="font-bold text-[#10B981] mt-2">
                                39.1%
                              </p>
                            </div>
                            <div className="rounded bg-white/10 p-2.5">
                              <p className="text-white/60">ROAS</p>
                              <p className="font-bold mt-1">4.4x</p>
                              <p className="font-bold text-[#F59E0B] mt-2">
                                1.6x
                              </p>
                            </div>
                            <div className="rounded bg-white/10 p-2.5">
                              <p className="text-white/60">
                                Frequency &amp; CTR
                              </p>
                              <p className="font-bold mt-1">1.4 • 1.85%</p>
                              <p className="font-bold text-[#EF4444] mt-2">
                                4.2 • 0.48%
                              </p>
                            </div>
                          </div>

                          {/* Target Hotspot Box */}
                          <div
                            style={{
                              left: `${activeQuestion.hotspotZone.xPercent}%`,
                              top: `${activeQuestion.hotspotZone.yPercent}%`,
                              width: `${activeQuestion.hotspotZone.widthPercent}%`,
                              height: `${activeQuestion.hotspotZone.heightPercent}%`,
                            }}
                            className="absolute rounded-lg border-2 border-[#10B981] bg-[#10B981]/25 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] flex items-start justify-start p-1.5 transition-all duration-150"
                          >
                            <span className="rounded bg-[#10B981] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              ✓ Correct Target Area
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASE 4: CATEGORIZATION */}
                    {activeQuestion.type === "Categorization" && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-semibold text-[#5E5E5E]">
                          Define category buckets and the matching items
                          learners must sort into each bucket:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {activeQuestion.categories.map((cat) => (
                            <div
                              key={cat.id}
                              className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-2.5"
                            >
                              <input
                                type="text"
                                value={cat.categoryName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateActiveQuestion({
                                    categories: activeQuestion.categories.map(
                                      (c) =>
                                        c.id === cat.id
                                          ? { ...c, categoryName: val }
                                          : c
                                    ),
                                  });
                                }}
                                className="w-full rounded-lg bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#4F39F6] border border-[#EAECEF]"
                              />
                              <ul className="space-y-1.5">
                                {cat.items.map((it, iIdx) => (
                                  <li
                                    key={`${cat.id}-${iIdx}`}
                                    className="rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#121215] border border-[#EAECEF]"
                                  >
                                    {it}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CASE 5: OPEN-ENDED ESSAY */}
                    {activeQuestion.type === "Open-ended essay" && (
                      <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-[#121215]">
                          Mentor Grading Rubric &amp; Evaluation Guidelines
                        </label>
                        <p className="text-[11px] text-[#5E5E5E]">
                          Shown to trainers in the Ruang Sosmed 2.0 Grading
                          Center when scoring learner essay responses.
                        </p>
                        <textarea
                          rows={4}
                          value={activeQuestion.rubricGuidelines}
                          onChange={(e) =>
                            updateActiveQuestion({
                              rubricGuidelines: e.target.value,
                            })
                          }
                          className="w-full rounded-xl bg-[#F8F9FB] p-3.5 text-xs text-[#121215] leading-relaxed border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Bottom Question Card Row: Estimation time [ 2 ] Mins ⏱ & Mark as point [ 1 ] Points ⭐ (matches Image 3) */}
                    <div className="pt-4 border-t border-[#EAECEF] flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-[#5E5E5E]">
                        <span className="font-medium">Estimation time</span>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={activeQuestion.timerMins}
                          onChange={(e) =>
                            updateActiveQuestion({
                              timerMins: Number(e.target.value),
                            })
                          }
                          aria-label="Estimation time in minutes"
                          className="w-12 rounded-lg bg-[#FFFFFF] px-2 py-1 text-center font-bold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                        />
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] px-2.5 py-1 font-semibold text-[#121215] border border-[#EAECEF]">
                          <span>Mins</span>
                          <Clock size={12} className="text-[#5E5E5E]" />
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#5E5E5E]">
                        <span className="font-medium">Mark as point</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={activeQuestion.weightPoints}
                          onChange={(e) =>
                            updateActiveQuestion({
                              weightPoints: Number(e.target.value),
                            })
                          }
                          aria-label="Mark as point"
                          className="w-12 rounded-lg bg-[#FFFFFF] px-2 py-1 text-center font-bold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                        />
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] px-2.5 py-1 font-semibold text-[#121215] border border-[#EAECEF]">
                          <span>Points</span>
                          <Star
                            size={12}
                            className="text-[#F59E0B]"
                            fill="#F59E0B"
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Bottom "Create new Question" Section: [Create from Scratch] & [Create with AI] (matches Image 3) */}
                  {!previewMode && (
                    <div className="pt-2 space-y-2.5">
                      <p className="text-xs font-semibold text-[#5E5E5E]">
                        Create new Question
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F8F9FB] px-4 py-2.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] shadow-2xs transition-all cursor-pointer"
                        >
                          <FileText size={14} className="text-[#5E5E5E]" />
                          <span>Create from Scratch</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAiModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#FFFFFF] hover:bg-[#EEF2FF]/60 px-4 py-2.5 text-xs font-semibold text-[#4F39F6] border border-[#EAECEF] hover:border-[#4F39F6] shadow-2xs transition-all cursor-pointer"
                        >
                          <Sparkles size={14} className="text-[#4F39F6]" />
                          <span>Create with AI</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* CREATE WITH AI QUESTION GENERATOR MODAL (matches Image 3 "Create with AI") */}
      {aiModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create Quiz Questions with AI"
          onClick={() => setAiModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#121215]/60 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl p-6 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6]">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Create Question with AI
                  </h3>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Generate quiz questions automatically from topic, URL, or document
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="p-1 rounded-lg text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Source Mode Tabs */}
            <div className="grid grid-cols-3 rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]">
              {(
                [
                  { id: "text", label: "Topic / Brief" },
                  { id: "url", label: "From URL" },
                  { id: "document", label: "Document" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAiSourceMode(tab.id)}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    aiSourceMode === tab.id
                      ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                      : "text-[#5E5E5E]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1">
                  {aiSourceMode === "url"
                    ? "Reference URL"
                    : aiSourceMode === "document"
                    ? "Document Summary / Notes"
                    : "Topic or Learning Objective"}
                </label>
                <textarea
                  rows={3}
                  value={aiTopicInput}
                  onChange={(e) => setAiTopicInput(e.target.value)}
                  placeholder="Contoh: Prinsip Design System Enterprise, struktur komponen UI, dan metrik konversi konten..."
                  className="w-full rounded-xl bg-[#F8F9FB] p-3 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#121215] mb-1">
                    Question Type
                  </label>
                  <select
                    value={aiQuestionType}
                    onChange={(e) => setAiQuestionType(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#121215] mb-1">
                    Difficulty
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) =>
                      setAiDifficulty(
                        e.target.value as "Beginner" | "Intermediate" | "Expert"
                      )
                    }
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="rounded-xl bg-[#F8F9FB] px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const topic =
                    aiTopicInput.trim() || "Enterprise Design System & Content Strategy";
                  const qType = aiQuestionType as QuestionType;
                  const newId = `q-ai-${Date.now()}`;
                  const generatedQ: QuizQuestionItem = {
                    id: newId,
                    type: qType,
                    prompt:
                      qType === "Fill in the blank"
                        ? `Complete the following statement about ${topic}:`
                        : `Manakah pernyataan yang paling tepat mengenai ${topic} (${aiDifficulty})?`,
                    required: true,
                    choiceOrder: "Randomize choices",
                    timerMins: 2,
                    weightPoints: 1,
                    stemMediaType: "none",
                    multipleCorrect: false,
                    answerWithImage: false,
                    options: [
                      {
                        id: `opt-${Date.now()}-1`,
                        text: `Menerapkan standar komponen terstruktur untuk ${topic}`,
                        isCorrect: true,
                      },
                      {
                        id: `opt-${Date.now()}-2`,
                        text: "Mengabaikan konsistensi visual antar platform",
                        isCorrect: false,
                      },
                      {
                        id: `opt-${Date.now()}-3`,
                        text: "Menghapus dokumentasi pedoman tim",
                        isCorrect: false,
                      },
                    ],
                    fillBlankSentence:
                      "A design system for enterprise products is a collection of reusable components, guided by clear [Direction] that can be assembled together to build any number of [Corporate] applications.",
                    hotspotZone: {
                      xPercent: 50,
                      yPercent: 40,
                      widthPercent: 25,
                      heightPercent: 28,
                      label: "Target Area",
                    },
                    categories: [
                      {
                        id: `cat-${Date.now()}-1`,
                        categoryName: "Core Principles",
                        items: ["Consistency", "Scalability"],
                      },
                    ],
                    rubricGuidelines: `Evaluasi pemahaman peserta terhadap ${topic}.`,
                  };
                  setQuestions((prev) => [...prev, generatedQ]);
                  setSelectedQuestionId(newId);
                  setAiModalOpen(false);
                  setAiTopicInput("");
                  onShowToast(`✨ Soal "${qType}" berhasil dibuat dengan AI!`);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Generate Question</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Thumbnail Picker Modal for Quiz Banner */}
      <ThumbnailPickerModal
        open={thumbnailModalOpen}
        onClose={() => setThumbnailModalOpen(false)}
        currentValue={quizBannerUrl || undefined}
        onSelectThumbnail={(val) => {
          setThumbnailModalOpen(false);
          if (val.type === "image") {
            setQuizBannerUrl(val.value);
          } else {
            setQuizBannerUrl(null);
          }
          onShowToast("Cover thumbnail kuis berhasil diperbarui.");
        }}
        onRemoveThumbnail={() => {
          setQuizBannerUrl(null);
          setThumbnailModalOpen(false);
          onShowToast("Cover thumbnail kuis dihapus.");
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
}
