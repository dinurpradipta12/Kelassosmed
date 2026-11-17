"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  FolderOpen,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Search,
  Upload,
  Move,
  Clock,
  Award,
  RefreshCw,
  Sparkles,
  Star,
  Users,
  SlidersHorizontal,
  X,
  FileText,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { type ContentType } from "@/lib/design-tokens";
import {
  INITIAL_PATH_STAGES,
  LIBRARY_CATALOG_ITEMS,
  type LearningPathStage,
  type LearningPathStageItem,
} from "@/lib/phase3-data";
import { ContentBadge, ContentIconBox } from "@/components/ui/ContentBadge";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import {
  ThumbnailPickerModal,
  type SelectedThumbnailValue,
} from "@/components/ui/ThumbnailPickerModal";

interface LearningPathBuilderProps {
  onBack: () => void;
  onPublishPath: (
    title: string,
    description: string,
    urgency: "Urgent" | "Not Urgent"
  ) => void;
  onShowToast: (msg: string) => void;
}

export interface LearningPathThumbnail {
  id: string;
  label: string;
  gradient?: string;
  imageUrl?: string;
  accent: string;
}

const PRESET_THUMBNAILS: LearningPathThumbnail[] = [
  {
    id: "thumb-1",
    label: "Creator Growth Gradient",
    gradient: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 50%, #FBCFE8 100%)",
    accent: "#EC4899",
  },
  {
    id: "thumb-2",
    label: "Indigo Performance Track",
    gradient: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)",
    accent: "#4F39F6",
  },
  {
    id: "thumb-3",
    label: "Meta & TikTok Cyan",
    gradient: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)",
    accent: "#0EA5E9",
  },
];

const AVAILABLE_CATEGORIES = [
  "Social Media",
  "Meta Ads",
  "Analytics",
  "Copywriting",
  "Creator Economy",
];

interface CandidateLearner {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: "Design" | "Marketing" | "Growth" | "Product" | "HR";
  avatarBg: string;
  avatarText: string;
}

interface AutoAssignCondition {
  id: string;
  field: "Department" | "Job Role" | "Employment Type";
  operator: "is" | "is not";
  value: string;
}

export function LearningPathBuilder({
  onBack,
  onPublishPath,
  onShowToast,
}: LearningPathBuilderProps) {
  const { explorerItems, assignees, leaderboard, workspaceCollaborators } =
    useRuangSosmedStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Profile sync & Trainer Author dynamic state
  const [activeAdminName, setActiveAdminName] = useState("Dinur M. Pradipta");
  const [customTrainers, setCustomTrainers] = useState<string[]>([]);
  const [isAddingCustomTrainer, setIsAddingCustomTrainer] = useState(false);
  const [newTrainerInput, setNewTrainerInput] = useState("");

  useEffect(() => {
    const syncAdminName = () => {
      try {
        const raw = window.localStorage.getItem("ruang_sosmed_profile_admin_v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.name) {
            setActiveAdminName(parsed.name);
            setMentorOwner((prev) =>
              prev.startsWith("Dinur") ? `${parsed.name} (Lead Mentor)` : prev
            );
            setCertSignatureBy((prev) =>
              prev.startsWith("Dinur") ? `${parsed.name} — Lead Mentor` : prev
            );
          }
        }
      } catch {
        // ignore storage errors
      }
    };
    syncAdminName();
    window.addEventListener("ruang_sosmed_profile_updated", syncAdminName);
    return () =>
      window.removeEventListener("ruang_sosmed_profile_updated", syncAdminName);
  }, []);

  // Step 1 Metadata state
  const [selectedThumb, setSelectedThumb] =
    useState<LearningPathThumbnail>(PRESET_THUMBNAILS[0]);
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [bannerOffsetY, setBannerOffsetY] = useState(50);
  const [repositioningBanner, setRepositioningBanner] = useState(false);
  const [pathTitle, setPathTitle] = useState(
    "Full-Stack Social Media Strategist Track"
  );
  const [description, setDescription] = useState(
    "A structured 8-week milestone learning path guiding creators and marketers from organic content pillar architecture to profitable Meta & TikTok Shop ad scaling."
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Social Media",
    "Meta Ads",
    "Analytics",
  ]);
  const [urgency, setUrgency] = useState<"Urgent" | "Not Urgent">("Not Urgent");
  const [durationValue, setDurationValue] = useState("24");
  const [durationUnit, setDurationUnit] = useState<"Hours" | "Days">("Hours");
  const [pointsReward, setPointsReward] = useState("100");
  const [mentorOwner, setMentorOwner] = useState(
    "Dinur M. Pradipta (Lead Mentor)"
  );

  // Step 2 Stages & Sequencer state - Bersih tanpa dummy item
  const [stages, setStages] = useState<LearningPathStage[]>(() => [
    {
      id: "stage-1",
      title: "Stage 1: Tahap Pembelajaran Awal",
      subtitle: "Kombinasikan Course, Page, Quiz, atau Tugas untuk tahap ini",
      items: [],
    },
  ]);
  const [enforceSequential, setEnforceSequential] = useState(true);

  // Inline Create Item state per stage
  const [creatingStageId, setCreatingStageId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemType, setNewItemType] = useState<ContentType>("Course");
  const [newItemDuration, setNewItemDuration] = useState("1h 30m");

  // Select from Library Modal state
  const [libraryModalStageId, setLibraryModalStageId] = useState<string | null>(
    null
  );
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);

  // Step 3 Assign Learners & Auto Assign Rules state
  const [learnerSearch, setLearnerSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("All Department");
  const [assignedLearnerIds, setAssignedLearnerIds] = useState<string[]>([]);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [autoAssignConditions, setAutoAssignConditions] = useState<
    AutoAssignCondition[]
  >([
    {
      id: "cond-1",
      field: "Department",
      operator: "is",
      value: "All Department",
    },
    {
      id: "cond-2",
      field: "Job Role",
      operator: "is",
      value: "Social Media & UI/UX",
    },
  ]);

  // Step 4 Completion settings state
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [certRefNumber, setCertRefNumber] = useState("CERT-RS-2026-089");
  const [certValidity, setCertValidity] = useState("2 Years");
  const [certSignatureBy, setCertSignatureBy] = useState(
    "Dinur M. Pradipta — Lead Mentor"
  );
  const [certPassMark, setCertPassMark] = useState("80%");
  const [selectedCertTemplate, setSelectedCertTemplate] = useState<
    "classic" | "indigo" | "minimal"
  >("indigo");
  const [reEnrollmentEnabled, setReEnrollmentEnabled] = useState(false);
  const [reEnrollmentPeriod, setReEnrollmentPeriod] = useState(
    "Automatically re-enroll every 6 months"
  );
  const [gamificationEnabled, setGamificationEnabled] = useState(true);
  const [pathReviewEnabled, setPathReviewEnabled] = useState(true);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddStage = () => {
    const nextNum = stages.length + 1;
    const newStage: LearningPathStage = {
      id: `stage-${Date.now()}`,
      title: `Stage ${nextNum}: Analytics, Attribution & Capstone`,
      subtitle: "Final campaign audit and graduation certification",
      items: [],
    };
    setStages((prev) => [...prev, newStage]);
    onShowToast(`Added "${newStage.title}".`);
  };

  const handleQuickAddBottomBar = (type: ContentType) => {
    const targetStageId = stages[stages.length - 1]?.id;
    if (!targetStageId) return;
    setNewItemType(type);
    setCreatingStageId(targetStageId);
  };

  const handleInlineCreateItem = (stageId: string, e: React.FormEvent) => {
    e.preventDefault();
    const title =
      newItemTitle.trim() || `New ${newItemType} Module — Ruang Sosmed 2.0`;
    const newItem: LearningPathStageItem = {
      id: `lpi-${Date.now()}`,
      title,
      type: newItemType,
      duration: newItemDuration || "45 mins",
    };

    setStages((prev) =>
      prev.map((st) =>
        st.id === stageId ? { ...st, items: [...st.items, newItem] } : st
      )
    );
    setNewItemTitle("");
    setCreatingStageId(null);
    onShowToast(`Created and added "${title}" to stage.`);
  };

  const handleMoveStageItem = (
    stageId: string,
    index: number,
    direction: "up" | "down"
  ) => {
    setStages((prev) =>
      prev.map((st) => {
        if (st.id !== stageId) return st;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= st.items.length) return st;
        const nextItems = [...st.items];
        const [moved] = nextItems.splice(index, 1);
        nextItems.splice(target, 0, moved);
        return { ...st, items: nextItems };
      })
    );
  };

  const handleRemoveStageItem = (stageId: string, itemId: string) => {
    setStages((prev) =>
      prev.map((st) =>
        st.id === stageId
          ? { ...st, items: st.items.filter((i) => i.id !== itemId) }
          : st
      )
    );
  };

  const availableLibraryItems: LearningPathStageItem[] = React.useMemo(() => {
    return (explorerItems || [])
      .filter((exp) => exp.type !== "Folder" && exp.type !== "Learning Path")
      .map((exp) => ({
        id: exp.id,
        title: exp.title,
        type: exp.type as ContentType,
        duration:
          exp.type === "Course"
            ? "45 mins"
            : exp.type === "Quiz"
            ? "15 mins"
            : exp.type === "Assignment"
            ? "30 mins"
            : "20 mins",
      }));
  }, [explorerItems]);

  const candidateLearners: CandidateLearner[] = React.useMemo(() => {
    const list: CandidateLearner[] = [];
    const seen = new Set<string>();

    for (const a of assignees || []) {
      const nameKey = a.name.trim().toLowerCase();
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        list.push({
          id: a.id,
          name: a.name,
          initials: a.initials,
          role: a.roleBadge || "Learner",
          department: "Marketing",
          avatarBg: a.avatarBg || "#EEF2FF",
          avatarText: a.avatarText || "#4F39F6",
        });
      }
    }

    for (const l of leaderboard || []) {
      const nameKey = l.name.trim().toLowerCase();
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        list.push({
          id: `cand-${l.rank}-${l.name}`,
          name: l.name,
          initials: l.initials,
          role: l.role || "Learner",
          department: "Growth",
          avatarBg: l.avatarBg || "#EEF2FF",
          avatarText: l.avatarText || "#4F39F6",
        });
      }
    }
    return list;
  }, [assignees, leaderboard]);

  const handleBulkInsertFromLibrary = () => {
    if (!libraryModalStageId) return;
    const chosen = availableLibraryItems
      .filter((lib) => selectedLibraryIds.includes(lib.id))
      .map((lib) => ({
        ...lib,
        id: `lpi-${Date.now()}-${lib.id}`,
      }));

    setStages((prev) =>
      prev.map((st) =>
        st.id === libraryModalStageId
          ? { ...st, items: [...st.items, ...chosen] }
          : st
      )
    );
    onShowToast(`Inserted ${chosen.length} items from Ruang Sosmed Library.`);
    setSelectedLibraryIds([]);
    setLibraryModalStageId(null);
  };

  const filteredLibraryItems = availableLibraryItems.filter(
    (item) =>
      item.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      item.type.toLowerCase().includes(librarySearch.toLowerCase())
  );

  const filteredCandidates = candidateLearners.filter((c) => {
    if (deptFilter !== "All Department" && c.department !== deptFilter) {
      return false;
    }
    if (
      learnerSearch.trim() &&
      !c.name.toLowerCase().includes(learnerSearch.toLowerCase()) &&
      !c.role.toLowerCase().includes(learnerSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const toggleLearnerAssigned = (id: string) => {
    setAssignedLearnerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const STEPS = [
    { id: 1, label: "Learning Path Overview" },
    { id: 2, label: "Add Content" },
    { id: 3, label: "Assign Learners" },
    { id: 4, label: "Completion" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24">
      {/* Top 4-Step Wizard Header (Matches ref_03 & ref_04) */}
      <header className="sticky top-10 z-20 bg-[#FFFFFF] border-b border-[#EAECEF] px-6 py-3.5">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to workspace"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <ContentBadge type="Learning Path" size="sm" />
            <h1 className="text-sm font-bold text-[#121215] truncate max-w-xs sm:max-w-sm">
              {pathTitle || "Untitled Learning Path"}
            </h1>
          </div>

          {/* 4-Step Guided Stepper Indicator */}
          <nav
            aria-label="Learning Path Builder Steps"
            className="flex flex-wrap items-center gap-1.5"
          >
            {STEPS.map((st, idx) => {
              const isCurrent = step === st.id;
              const isDone = step > st.id;
              return (
                <React.Fragment key={st.id}>
                  <button
                    type="button"
                    onClick={() => setStep(st.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#4F39F6] text-white shadow-xs"
                        : isDone
                        ? "bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20"
                        : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215]"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        isCurrent
                          ? "bg-white/20 text-white"
                          : isDone
                          ? "bg-[#10B981] text-white"
                          : "bg-black/10 text-[#5E5E5E]"
                      }`}
                    >
                      {isDone ? <Check size={10} strokeWidth={3} /> : st.id}
                    </span>
                    <span className="hidden sm:inline">
                      Step {st.id}: {st.label}
                    </span>
                    <span className="sm:hidden">Step {st.id}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight size={13} className="text-[#9CA3AF]" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPublishPath(pathTitle, description, urgency)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>Publish Path</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* =========================================================
            STEP 1: LEARNING PATH OVERVIEW
           ========================================================= */}
        {step === 1 && (
          <div className="rounded-xl bg-[#FFFFFF] p-6 sm:p-8 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-6">
            {/* Interactive Cover Banner with Update Thumbnail & Reposition */}
            <div
              className="relative h-44 w-full rounded-xl overflow-hidden border border-[#EAECEF] bg-[#F8F9FB]"
              style={
                selectedThumb.gradient
                  ? { background: selectedThumb.gradient }
                  : undefined
              }
            >
              {selectedThumb.imageUrl && (
                <img
                  src={selectedThumb.imageUrl}
                  alt={selectedThumb.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
                  style={{
                    transform: `translateY(${(bannerOffsetY - 50) * 0.6}px)`,
                  }}
                />
              )}

              {/* Reposition Slider Overlay when active */}
              {repositioningBanner && (
                <div className="absolute inset-x-4 top-3 z-20 flex items-center justify-between gap-3 rounded-xl bg-[#121215]/85 backdrop-blur-xs px-3.5 py-2 text-white shadow-lg">
                  <span className="text-[11px] font-semibold">
                    Geser posisi vertikal banner:
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={bannerOffsetY}
                    onChange={(e) => setBannerOffsetY(Number(e.target.value))}
                    className="w-36 accent-[#4F39F6] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setRepositioningBanner(false);
                      onShowToast("Posisi cover banner disimpan.");
                    }}
                    className="rounded-md bg-[#4F39F6] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              )}

              {/* Bottom-Right Floating Action Buttons */}
              <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThumbnailPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 hover:bg-white px-3 py-1.5 text-xs font-semibold text-[#121215] shadow-sm border border-[#EAECEF] cursor-pointer"
                >
                  <Upload size={12} />
                  <span>Update thumbnail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRepositioningBanner((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border shadow-sm transition-all cursor-pointer ${
                    repositioningBanner
                      ? "bg-[#121215] text-white border-[#121215]"
                      : "bg-white/95 hover:bg-white text-[#121215] border-[#EAECEF]"
                  }`}
                >
                  <Move size={12} />
                  <span>Reposition</span>
                </button>
              </div>
            </div>

            {/* Preset Selector Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESET_THUMBNAILS.map((preset) => {
                const active = selectedThumb.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedThumb(preset)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 border text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "border-[#4F39F6] bg-[#4F39F6]/5 text-[#4F39F6]"
                        : "border-[#EAECEF] bg-[#F8F9FB] text-[#5E5E5E] hover:text-[#121215]"
                    }`}
                  >
                    <span>{preset.label}</span>
                    {active && <Check size={13} />}
                  </button>
                );
              })}
            </div>

            {/* Path Title Input */}
            <div>
              <label
                htmlFor="lp-title-input"
                className="block text-xs font-semibold text-[#121215] mb-1.5"
              >
                Learning Path Title
              </label>
              <input
                id="lp-title-input"
                type="text"
                value={pathTitle}
                onChange={(e) => setPathTitle(e.target.value)}
                placeholder="e.g., Full-Stack Social Media Strategist Track"
                className="w-full rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 text-sm font-bold text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            {/* Category Multi-Select Tags */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-2">
                Category Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                          : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215]"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={2.5} />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid: Urgency, Estimation, Points, Mentor */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="lp-urgency"
                  className="block text-xs font-semibold text-[#121215] mb-1.5"
                >
                  Urgency Level
                </label>
                <select
                  id="lp-urgency"
                  value={urgency}
                  onChange={(e) =>
                    setUrgency(e.target.value as "Urgent" | "Not Urgent")
                  }
                  className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                >
                  <option value="Not Urgent">Not Urgent</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="lp-duration"
                  className="block text-xs font-semibold text-[#121215] mb-1.5"
                >
                  Estimation Time
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="lp-duration"
                    type="number"
                    min={1}
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="w-16 rounded-lg bg-[#F8F9FB] px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  />
                  <select
                    aria-label="Duration unit"
                    value={durationUnit}
                    onChange={(e) =>
                      setDurationUnit(e.target.value as "Hours" | "Days")
                    }
                    className="flex-1 rounded-lg bg-[#F8F9FB] px-2 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  >
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="lp-points"
                  className="block text-xs font-semibold text-[#121215] mb-1.5"
                >
                  Completion Points
                </label>
                <div className="relative">
                  <input
                    id="lp-points"
                    type="number"
                    value={pointsReward}
                    onChange={(e) => setPointsReward(e.target.value)}
                    className="w-full rounded-lg bg-[#F8F9FB] pl-3 pr-14 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#F59E0B]">
                    ⭐ Points
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="lp-mentor"
                    className="block text-xs font-semibold text-[#121215]"
                  >
                    Trainer / Author
                  </label>
                  {!isAddingCustomTrainer && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomTrainer(true)}
                      className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                    >
                      + Tambah Trainer Baru
                    </button>
                  )}
                </div>

                {isAddingCustomTrainer ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nama Mentor / Posisi..."
                      value={newTrainerInput}
                      onChange={(e) => setNewTrainerInput(e.target.value)}
                      className="flex-1 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#4F39F6] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newTrainerInput.trim();
                        if (trimmed) {
                          setCustomTrainers((prev) => [...prev, trimmed]);
                          setMentorOwner(trimmed);
                          setNewTrainerInput("");
                          setIsAddingCustomTrainer(false);
                          onShowToast(`Trainer "${trimmed}" ditambahkan.`);
                        }
                      }}
                      className="rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomTrainer(false);
                        setNewTrainerInput("");
                      }}
                      className="rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF] px-2 py-1.5 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <select
                    id="lp-mentor"
                    value={mentorOwner}
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setIsAddingCustomTrainer(true);
                      } else {
                        setMentorOwner(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  >
                    {/* Active profile owner */}
                    <option value={`${activeAdminName} (Lead Mentor)`}>
                      {activeAdminName} (Lead Mentor)
                    </option>

                    {/* Workspace Collaborators */}
                    {(workspaceCollaborators || [])
                      .filter(
                        (c) =>
                          !c.name
                            .toLowerCase()
                            .includes(activeAdminName.toLowerCase()) &&
                          !c.name.toLowerCase().includes("dinur")
                      )
                      .map((c) => {
                        const label = `${c.name} (${
                          c.role === "Admin" ? "Lead Mentor" : c.role
                        })`;
                        return (
                          <option key={c.id} value={label}>
                            {label}
                          </option>
                        );
                      })}

                    {/* Custom added trainers */}
                    {customTrainers.map((tr) => (
                      <option key={tr} value={tr}>
                        {tr}
                      </option>
                    ))}

                    <option value="__add_new__">
                      + Tambah Nama Trainer Baru...
                    </option>
                  </select>
                )}
              </div>
            </div>

            {/* Description Textarea with character count */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="lp-desc-input"
                  className="block text-xs font-semibold text-[#121215]"
                >
                  Description
                </label>
                <span className="text-[11px] font-medium text-[#9CA3AF]">
                  {description.length}/400
                </span>
              </div>
              <textarea
                id="lp-desc-input"
                rows={3}
                maxLength={400}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-[#F8F9FB] p-3.5 text-xs text-[#121215] leading-relaxed border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] cursor-pointer"
              >
                <span>Continue to Step 2: Add Content</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 2: ADD CONTENT (STAGES + BOTTOM FLOATING DOCK)
           ========================================================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#121215]">
                  Step 2: Add Content &amp; Stage Structure
                </h2>
                <p className="text-xs text-[#5E5E5E]">
                  Build stages and combine Courses, Pages, Quizzes, Uploads, or
                  Library items.
                </p>
              </div>

              <label className="inline-flex items-center gap-2.5 rounded-lg bg-[#F8F9FB] px-3.5 py-2 border border-[#EAECEF] text-xs font-semibold text-[#121215] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceSequential}
                  onChange={(e) => setEnforceSequential(e.target.checked)}
                  className="h-4 w-4 accent-[#4F39F6] rounded cursor-pointer"
                />
                <span>Enforce sequential stage completion</span>
              </label>
            </div>

            <div className="space-y-5">
              {stages.map((stage, sIdx) => (
                <section
                  key={stage.id}
                  aria-label={stage.title}
                  className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAECEF]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#4F39F6]/10 text-xs font-bold text-[#4F39F6]">
                          {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={stage.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStages((prev) =>
                              prev.map((s) =>
                                s.id === stage.id ? { ...s, title: val } : s
                              )
                            );
                          }}
                          aria-label="Stage title"
                          className="text-sm font-bold text-[#121215] bg-transparent focus:outline-none focus:underline"
                        />
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5 pl-8">
                        {stage.subtitle}
                      </p>
                    </div>

                    <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-xs font-semibold text-[#5E5E5E]">
                      {stage.items.length} Materials
                    </span>
                  </div>

                  <div className="space-y-2">
                    {stage.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F9FB] p-6 text-center space-y-1.5">
                        <FolderOpen
                          size={24}
                          className="mx-auto text-[#9CA3AF]"
                        />
                        <p className="text-xs font-semibold text-[#121215]">
                          Belum ada materi di stage ini
                        </p>
                        <p className="text-[11px] text-[#5E5E5E]">
                          Klik &quot;+ Create New Item&quot; atau &quot;Select from Library&quot; di bawah untuk menambahkan materi.
                        </p>
                      </div>
                    ) : (
                      stage.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF] hover:bg-[#FFFFFF] hover:border-[#D1D5DB] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <GripVertical
                            size={15}
                            className="text-[#9CA3AF] shrink-0 cursor-grab"
                          />
                          <span className="text-xs font-bold text-[#9CA3AF] w-4 tabular-nums">
                            {idx + 1}.
                          </span>
                          <ContentBadge type={item.type} size="sm" />
                          <span className="text-xs font-semibold text-[#121215] truncate">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5E5E5E]">
                            <Clock size={11} className="text-[#9CA3AF]" />
                            {item.duration}
                          </span>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveStageItem(stage.id, idx, "up")
                              }
                              disabled={idx === 0}
                              title="Move up"
                              className="p-1 rounded hover:bg-[#F8F9FB] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveStageItem(stage.id, idx, "down")
                              }
                              disabled={idx === stage.items.length - 1}
                              title="Move down"
                              className="p-1 rounded hover:bg-[#F8F9FB] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveStageItem(stage.id, item.id)
                              }
                              title="Remove from stage"
                              className="p-1 text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )))}
                  </div>

                  {creatingStageId === stage.id && (
                    <form
                      onSubmit={(e) => handleInlineCreateItem(stage.id, e)}
                      className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#4F39F6]/40 space-y-3"
                    >
                      <p className="text-xs font-bold text-[#121215]">
                        Add {newItemType} to {stage.title}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <select
                          aria-label="New item content type"
                          value={newItemType}
                          onChange={(e) =>
                            setNewItemType(e.target.value as ContentType)
                          }
                          className="rounded-lg bg-[#FFFFFF] px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                        >
                          <option value="Course">Course</option>
                          <option value="Page">Page</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Assignment">Assignment</option>
                          <option value="Wiki">Wiki</option>
                        </select>
                        <input
                          type="text"
                          value={newItemTitle}
                          onChange={(e) => setNewItemTitle(e.target.value)}
                          placeholder="Enter item title..."
                          className="sm:col-span-2 rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
                        />
                        <input
                          type="text"
                          value={newItemDuration}
                          onChange={(e) => setNewItemDuration(e.target.value)}
                          placeholder="Duration (e.g. 45m)"
                          className="rounded-lg bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCreatingStageId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#4F39F6] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          Add Item
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setCreatingStageId(stage.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:border-[#4F39F6] hover:text-[#4F39F6] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={2.4} />
                      <span>Create New Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLibraryModalStageId(stage.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:border-[#4F39F6] hover:text-[#4F39F6] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-all cursor-pointer"
                    >
                      <FolderOpen size={14} className="text-[#4F39F6]" />
                      <span>Select from Library</span>
                    </button>
                  </div>
                </section>
              ))}
            </div>

            {/* Trenning Step 2 Bottom Toolbar: [+ Stage | Course | Page | Quiz | Upload | Library] (ref_03) */}
            <div className="rounded-2xl bg-[#FFFFFF] p-3 border border-[#EAECEF] shadow-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#121215] hover:bg-[#27272A] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Stage</span>
                </button>
                <span className="h-5 w-px bg-[#EAECEF]" />
                <button
                  type="button"
                  onClick={() => handleQuickAddBottomBar("Course")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EEF2FF] hover:text-[#4F39F6] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                >
                  <BookOpen size={13} className="text-[#0EA5E9]" />
                  <span>Course</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddBottomBar("Page")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EEF2FF] hover:text-[#4F39F6] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                >
                  <FileText size={13} className="text-[#F97316]" />
                  <span>Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddBottomBar("Quiz")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EEF2FF] hover:text-[#4F39F6] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                >
                  <HelpCircle size={13} className="text-[#F59E0B]" />
                  <span>Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onShowToast(
                      "Uploaded SCORM / PDF material to current stage."
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EEF2FF] hover:text-[#4F39F6] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                >
                  <Upload size={13} className="text-[#6366F1]" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLibraryModalStageId(stages[stages.length - 1]?.id || null)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EEF2FF] hover:text-[#4F39F6] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                >
                  <FolderOpen size={13} className="text-[#10B981]" />
                  <span>Library</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
                >
                  ← Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <span>Continue to Step 3: Assign Learners</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 3: ASSIGN LEARNERS + AUTO ASSIGN RULES MODAL (ref_04)
           ========================================================= */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Select Learners Grid + Auto Assign Banner */}
            <div className="lg:col-span-2 rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EAECEF]">
                <div>
                  <h2 className="text-base font-bold text-[#121215]">
                    Select learners
                  </h2>
                  <p className="text-xs text-[#5E5E5E]">
                    Assign team members or configure automated enrollment rules
                    by department.
                  </p>
                </div>

                {/* Auto Assign Toggle + Rules Trigger (Exact match to ref_04) */}
                <div className="flex items-center gap-2.5 rounded-xl bg-[#F8F9FB] px-3.5 py-2 border border-[#EAECEF]">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#121215] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAssignEnabled}
                      onChange={(e) => setAutoAssignEnabled(e.target.checked)}
                      className="h-4 w-4 accent-[#4F39F6] rounded cursor-pointer"
                    />
                    <span>Auto Assign</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoAssignModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:border-[#4F39F6] px-2.5 py-1 text-[11px] font-semibold text-[#4F39F6] border border-[#EAECEF] shadow-2xs cursor-pointer"
                  >
                    <SlidersHorizontal size={11} />
                    <span>Auto Assign Rules</span>
                  </button>
                </div>
              </div>

              {/* Search & Department Filter Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                  />
                  <input
                    type="search"
                    value={learnerSearch}
                    onChange={(e) => setLearnerSearch(e.target.value)}
                    placeholder="Search learner name or job title..."
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      "All Department",
                      "Design",
                      "Marketing",
                      "Growth",
                      "HR",
                    ] as const
                  ).map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDeptFilter(dept)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        deptFilter === dept
                          ? "bg-[#4F39F6] text-white"
                          : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215]"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Learners Grid */}
              {filteredCandidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F8F9FB] p-8 text-center space-y-2">
                  <Users size={28} className="mx-auto text-[#9CA3AF]" />
                  <p className="text-xs font-semibold text-[#121215]">
                    Belum ada siswa / learner yang terdaftar
                  </p>
                  <p className="text-[11px] text-[#5E5E5E] max-w-sm mx-auto">
                    Learner yang mendaftar atau ditugaskan melalui portal akan otomatis muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCandidates.map((learner) => {
                    const isSelected = assignedLearnerIds.includes(learner.id);
                    return (
                      <button
                        key={learner.id}
                        type="button"
                        onClick={() => toggleLearnerAssigned(learner.id)}
                        className={`flex items-center justify-between gap-3 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#4F39F6]/5 border-[#4F39F6] ring-1 ring-[#4F39F6]/20"
                            : "bg-[#FFFFFF] border-[#EAECEF] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: learner.avatarBg,
                              color: learner.avatarText,
                            }}
                          >
                            {learner.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-[#121215] truncate">
                                {learner.name}
                              </p>
                              <span className="rounded bg-[#F8F9FB] border border-[#EAECEF] px-1.5 py-0.2 text-[10px] font-semibold text-[#5E5E5E]">
                                {learner.department}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5E5E5E] truncate mt-0.5">
                              {learner.role}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected
                              ? "bg-[#4F39F6] border-[#4F39F6] text-white"
                              : "bg-[#FFFFFF] border-[#D1D5DB]"
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Assigned Learner Summary Sidebar (ref_04) */}
            <div className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-[#4F39F6]" />
                    <h3 className="text-sm font-bold text-[#121215]">
                      Assigned Learner
                    </h3>
                    <span className="rounded-full bg-[#4F39F6]/10 px-2 py-0.5 text-[11px] font-bold text-[#4F39F6]">
                      {assignedLearnerIds.length}
                    </span>
                  </div>
                  {assignedLearnerIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAssignedLearnerIds([])}
                      className="text-[11px] font-semibold text-[#EF4444] hover:underline cursor-pointer"
                    >
                      Remove all
                    </button>
                  )}
                </div>

                {autoAssignEnabled && (
                  <div className="rounded-xl bg-[#EEF2FF] p-3 border border-[#C7D2FE] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#4F39F6]">
                        ⚡ Auto Assign Rule Active
                      </span>
                      <button
                        type="button"
                        onClick={() => setAutoAssignModalOpen(true)}
                        className="text-[11px] font-semibold text-[#4F39F6] underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-[11px] text-[#4338CA]">
                      When learner added to{" "}
                      <strong>
                        {autoAssignConditions[0]?.value || "All Department"}
                      </strong>{" "}
                      ({autoAssignConditions.length} conditions)
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {assignedLearnerIds.length === 0 ? (
                    <p className="text-center text-xs text-[#9CA3AF] py-6">
                      Belum ada learner yang dipilih
                    </p>
                  ) : (
                    candidateLearners
                      .filter((c) => assignedLearnerIds.includes(c.id))
                      .map((learner) => (
                        <div
                          key={learner.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[#F8F9FB] px-3 py-2 border border-[#EAECEF]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{
                                backgroundColor: learner.avatarBg,
                                color: learner.avatarText,
                              }}
                            >
                              {learner.initials}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#121215] truncate">
                                {learner.name}
                              </p>
                              <p className="text-[10px] text-[#5E5E5E] truncate">
                                {learner.role}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleLearnerAssigned(learner.id)}
                            className="p-1 text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
                >
                  ← Step 2
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <span>Continue to Step 4: Completion</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 4: COMPLETION (CERTIFICATE, RE-ENROLLMENT, GAMIFICATION, REVIEW — ref_04)
           ========================================================= */}
        {step === 4 && (
          <div className="rounded-xl bg-[#FFFFFF] p-6 sm:p-8 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#121215]">
                Completion Settings
              </h2>
              <p className="text-xs text-[#5E5E5E] mt-0.5">
                Configure certificates, re-enrollment cycles, gamification
                rewards, and learner reviews upon finishing this path.
              </p>
            </div>

            {/* 1. Certificate Configuration Card */}
            <div className="rounded-xl border border-[#EAECEF] p-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F39F6]/10 text-[#4F39F6]">
                    <Award size={20} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#121215]">
                      Certificate
                    </h3>
                    <p className="text-xs text-[#5E5E5E]">
                      Issue an official verifiable certificate when learners
                      complete all stages.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={certificateEnabled}
                  onChange={(e) => setCertificateEnabled(e.target.checked)}
                  className="h-5 w-5 accent-[#4F39F6] rounded cursor-pointer"
                />
              </div>

              {certificateEnabled && (
                <div className="pt-4 border-t border-[#EAECEF] space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#121215] mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={certRefNumber}
                        onChange={(e) => setCertRefNumber(e.target.value)}
                        className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#121215] mb-1">
                        Validity Period
                      </label>
                      <select
                        value={certValidity}
                        onChange={(e) => setCertValidity(e.target.value)}
                        className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                      >
                        <option>1 Year</option>
                        <option>2 Years</option>
                        <option>Lifetime (No Expiration)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#121215] mb-1">
                        Signature By
                      </label>
                      <input
                        type="text"
                        value={certSignatureBy}
                        onChange={(e) => setCertSignatureBy(e.target.value)}
                        className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#121215] mb-1">
                        Passed Marked
                      </label>
                      <input
                        type="text"
                        value={certPassMark}
                        onChange={(e) => setCertPassMark(e.target.value)}
                        className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                      />
                    </div>
                  </div>

                  {/* Preview Templates */}
                  <div>
                    <label className="block text-xs font-semibold text-[#121215] mb-2">
                      Preview Templates
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          {
                            id: "indigo",
                            name: "Executive Indigo Certificate",
                            badge: "Recommended",
                            accent: "#4F39F6",
                          },
                          {
                            id: "classic",
                            name: "Classic Academic Gold",
                            badge: "Formal",
                            accent: "#D97706",
                          },
                          {
                            id: "minimal",
                            name: "Modern Minimalist Slate",
                            badge: "Clean",
                            accent: "#0F172A",
                          },
                        ] as const
                      ).map((tpl) => {
                        const active = selectedCertTemplate === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedCertTemplate(tpl.id)}
                            className={`rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                              active
                                ? "border-[#4F39F6] bg-[#4F39F6]/5 ring-2 ring-[#4F39F6]/20"
                                : "border-[#EAECEF] bg-[#F8F9FB] hover:bg-[#FFFFFF]"
                            }`}
                          >
                            <div className="h-20 rounded-lg bg-[#FFFFFF] border border-[#EAECEF] p-2.5 flex flex-col justify-between mb-2.5">
                              <div className="flex items-center justify-between">
                                <span
                                  className="h-2 w-12 rounded-full"
                                  style={{ backgroundColor: tpl.accent }}
                                />
                                <Award
                                  size={14}
                                  style={{ color: tpl.accent }}
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 w-24 rounded bg-[#E5E7EB]" />
                                <div className="h-1.5 w-16 rounded bg-[#F3F4F6]" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#121215]">
                                {tpl.name}
                              </span>
                              <span className="text-[10px] font-semibold text-[#4F39F6]">
                                {tpl.badge}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Re-Enrollment Toggle Card */}
            <div className="rounded-xl border border-[#EAECEF] p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9]">
                    <RefreshCw size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#121215]">
                      Re-Enrollment
                    </h3>
                    <p className="text-xs text-[#5E5E5E]">
                      {reEnrollmentEnabled
                        ? reEnrollmentPeriod
                        : "Learners will not be re-enrolled after completing this learning path."}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reEnrollmentEnabled}
                  onChange={(e) => setReEnrollmentEnabled(e.target.checked)}
                  className="h-5 w-5 accent-[#4F39F6] rounded cursor-pointer"
                />
              </div>
              {reEnrollmentEnabled && (
                <div className="pl-13 pt-2">
                  <select
                    value={reEnrollmentPeriod}
                    onChange={(e) => setReEnrollmentPeriod(e.target.value)}
                    className="rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF]"
                  >
                    <option>Automatically re-enroll every 6 months</option>
                    <option>Automatically re-enroll every 12 months</option>
                    <option>Re-enroll when major version is updated</option>
                  </select>
                </div>
              )}
            </div>

            {/* 3. Gamification Toggle Card */}
            <div className="rounded-xl border border-[#EAECEF] p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Gamification
                  </h3>
                  <p className="text-xs text-[#5E5E5E]">
                    Award +{pointsReward} ⭐ Points and unlock Leaderboard
                    Mastery Badges upon completion.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={gamificationEnabled}
                onChange={(e) => setGamificationEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#4F39F6] rounded cursor-pointer"
              />
            </div>

            {/* 4. Learning Path Review Toggle Card */}
            <div className="rounded-xl border border-[#EAECEF] p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
                  <Star size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Learning Path Review
                  </h3>
                  <p className="text-xs text-[#5E5E5E]">
                    Prompt learners to submit a star rating &amp; qualitative
                    feedback after completing the path.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pathReviewEnabled}
                onChange={(e) => setPathReviewEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#4F39F6] rounded cursor-pointer"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                ← Back to Step 3: Assign Learners
              </button>
              <button
                type="button"
                onClick={() => onPublishPath(pathTitle, description, urgency)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-6 py-2.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] cursor-pointer"
              >
                <Check size={14} strokeWidth={2.5} />
                <span>Publish Learning Path</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUTO ASSIGN RULES MODAL (Exact match to ref_04) */}
      <ModalDialog
        open={autoAssignModalOpen}
        onClose={() => setAutoAssignModalOpen(false)}
        titleId="auto-assign-rules-title"
        title="Auto Assign Rules"
        subtitle="Automatically enroll new learners into this Learning Path when they match these conditions"
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="space-y-2.5">
            {autoAssignConditions.map((cond, idx) => (
              <div
                key={cond.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F9FB] p-3 border border-[#EAECEF]"
              >
                <span className="text-xs font-semibold text-[#5E5E5E]">
                  {idx === 0 ? "When the learner was added to" : "AND"}
                </span>
                <select
                  value={cond.field}
                  onChange={(e) => {
                    const val = e.target
                      .value as AutoAssignCondition["field"];
                    setAutoAssignConditions((prev) =>
                      prev.map((c) =>
                        c.id === cond.id ? { ...c, field: val } : c
                      )
                    );
                  }}
                  className="rounded-lg bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#121215] border border-[#EAECEF]"
                >
                  <option value="Department">Department</option>
                  <option value="Job Role">Job Role</option>
                  <option value="Employment Type">Employment Type</option>
                </select>
                <span className="text-xs font-semibold text-[#5E5E5E]">is</span>
                <select
                  value={cond.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAutoAssignConditions((prev) =>
                      prev.map((c) =>
                        c.id === cond.id ? { ...c, value: val } : c
                      )
                    );
                  }}
                  className="flex-1 rounded-lg bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#4F39F6] border border-[#EAECEF]"
                >
                  <option value="All Department">All Department</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Growth">Growth</option>
                  <option value="HR">HR</option>
                  <option value="Social Media & UI/UX">
                    Social Media &amp; UI/UX
                  </option>
                </select>
                {autoAssignConditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAutoAssignConditions((prev) =>
                        prev.filter((c) => c.id !== cond.id)
                      )
                    }
                    className="p-1 text-[#9CA3AF] hover:text-[#EF4444] cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setAutoAssignConditions((prev) => [
                ...prev,
                {
                  id: `cond-${Date.now()}`,
                  field: "Department",
                  operator: "is",
                  value: "Design",
                },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:border-[#4F39F6] px-3 py-1.5 text-xs font-semibold text-[#4F39F6] border border-[#EAECEF] cursor-pointer"
          >
            <Plus size={13} />
            <span>Add condition</span>
          </button>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setAutoAssignModalOpen(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoAssignEnabled(true);
                setAutoAssignModalOpen(false);
                onShowToast("Auto Assign Rules saved for this Learning Path.");
              }}
              className="rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Save Rules
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* [📁 Select from Library] Searchable Bulk-Insert Modal */}
      <ModalDialog
        open={Boolean(libraryModalStageId)}
        onClose={() => setLibraryModalStageId(null)}
        titleId="select-from-library-modal-title"
        title="Select Content from Ruang Sosmed 2.0 Library"
        subtitle="Check existing Courses, Pages, Quizzes, Assignments, or Wikis to bulk-insert into this stage"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              type="search"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search library by title or content type..."
              className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#EAECEF] rounded-lg border border-[#EAECEF]">
            {filteredLibraryItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5E5E5E] space-y-1">
                <p className="font-semibold text-[#121215]">
                  Belum ada materi di Library
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  Buat materi terlebih dahulu di Content Studio atau buat item langsung di stage.
                </p>
              </div>
            ) : (
              filteredLibraryItems.map((lib) => {
                const checked = selectedLibraryIds.includes(lib.id);
                return (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={() =>
                      setSelectedLibraryIds((prev) =>
                        prev.includes(lib.id)
                          ? prev.filter((id) => id !== lib.id)
                          : [...prev, lib.id]
                      )
                    }
                    className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors cursor-pointer ${
                      checked ? "bg-[#4F39F6]/5" : "hover:bg-[#F8F9FB]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ContentIconBox type={lib.type} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#121215] truncate">
                          {lib.title}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {lib.type} • {lib.duration}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "bg-[#4F39F6] border-[#4F39F6] text-white"
                          : "border-[#D1D5DB] bg-[#FFFFFF]"
                      }`}
                    >
                      {checked && <Check size={10} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#EAECEF]">
            <span className="text-xs font-medium text-[#5E5E5E]">
              {selectedLibraryIds.length} items selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLibraryModalStageId(null)}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkInsertFromLibrary}
                className="rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Insert Selected ({selectedLibraryIds.length})
              </button>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* Thumbnail Picker Modal with 16 Default Thumbnails from src/thumbnail */}
      <ThumbnailPickerModal
        open={thumbnailPickerOpen}
        onClose={() => setThumbnailPickerOpen(false)}
        currentValue={selectedThumb.imageUrl || selectedThumb.gradient}
        onSelectThumbnail={(val) => {
          if (val.type === "image") {
            setSelectedThumb({
              id: `thumb-custom-${Date.now()}`,
              label: val.label || "Custom Thumbnail",
              imageUrl: val.value,
              accent: "#4F39F6",
            });
          } else {
            setSelectedThumb({
              id: `thumb-custom-${Date.now()}`,
              label: val.label || "Color Preset",
              gradient: val.value,
              accent: "#4F39F6",
            });
          }
        }}
        onRemoveThumbnail={() => {
          setSelectedThumb(PRESET_THUMBNAILS[0]);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
}
