"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  Plus,
  Minus,
  Check,
  Eye,
  EyeOff,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  LayoutGrid,
  List,
  Search,
  UserPlus,
  MoreHorizontal,
  X,
  Users,
  Edit3,
  Copy,
  Folder,
  FolderPlus,
  FolderOpen,
  ArrowLeft,
  FolderInput,
  Archive,
  Trash2,
  Image as ImageIcon,
  Share2,
  Clock,
  LayoutTemplate,
  RotateCcw,
  BookOpen,
  KeyRound,
} from "lucide-react";
import {
  CONTENT_TYPES_LIST,
  CONTENT_TYPE_CONFIGS,
  type ContentType,
} from "@/lib/design-tokens";
import {
  getDefaultFolderAccessCode,
  type ExplorerContentItem,
  type ExplorerItemType,
} from "@/lib/phase2-data";
import { ContentBadge, ContentIconBox } from "@/components/ui/ContentBadge";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { InviteCollaboratorModal } from "@/components/explorer/InviteCollaboratorModal";
import { UploadAssetModal } from "@/components/explorer/UploadAssetModal";
import { ThumbnailPickerModal } from "@/components/ui/ThumbnailPickerModal";

interface LearningContentExplorerProps {
  items: ExplorerContentItem[];
  onSelectContentItem: (item: ExplorerContentItem) => void;
  onCreateNewContent: (type: ExplorerItemType, targetFolder?: string) => void;
  onDuplicateItem: (item: ExplorerContentItem) => void;
  onDeleteItem: (id: string) => void;
  onOpenAssignModal: (item: ExplorerContentItem) => void;
  onShowToast: (msg: string) => void;
  activeProjectName?: string;
  activeSubView?: "recents" | "shared" | "archived" | "templates";
  showProjectPicker?: boolean;
  onSelectProject?: (projectName: string) => void;
  onBackToProjects?: () => void;
}

const FILTER_TABS: ("All" | ExplorerItemType)[] = [
  "All",
  "Folder",
  "Page",
  "Course",
  "Quiz",
  "Assignment",
  "Learning Path",
  "Wiki",
];

function IllustratedCardBanner({
  item,
  assignedCount,
  onEditThumbnail,
}: {
  item: ExplorerContentItem;
  assignedCount: number;
  onEditThumbnail?: () => void;
}) {
  const effectiveThumbnailUrl =
    item.thumbnailUrl ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem(`ruang_sosmed_thumb_${item.id}`) ||
        window.localStorage.getItem(
          `ruang_sosmed_thumb_${item.title.trim().toLowerCase()}`
        )
      : null) ||
    undefined;

  const isImage =
    Boolean(effectiveThumbnailUrl) &&
    (effectiveThumbnailUrl!.startsWith("/") ||
      effectiveThumbnailUrl!.startsWith("http") ||
      effectiveThumbnailUrl!.startsWith("data:") ||
      effectiveThumbnailUrl!.includes(".png") ||
      effectiveThumbnailUrl!.includes(".jpg") ||
      effectiveThumbnailUrl!.includes(".webp"));

  return (
    <div
      className="relative h-44 sm:h-52 w-full overflow-hidden border-b border-[#EAECEF] bg-[#F8F9FB]"
      style={
        !effectiveThumbnailUrl
          ? { background: item.bannerGradient }
          : !isImage
          ? { background: effectiveThumbnailUrl }
          : undefined
      }
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveThumbnailUrl}
          alt={item.title}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        /* Clean geometric SVG illustration inside banner */
        <svg
          viewBox="0 0 320 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          aria-hidden="true"
        >
          <circle
            cx="275"
            cy="24"
            r="46"
            fill={item.bannerAccent}
            fillOpacity="0.12"
          />
        <circle
          cx="240"
          cy="98"
          r="34"
          fill={item.bannerAccent}
          fillOpacity="0.08"
        />
        {/* Minimalist UI Card Illustration */}
        <rect
          x="96"
          y="22"
          width="128"
          height="84"
          rx="10"
          fill="#FFFFFF"
          fillOpacity="0.92"
          stroke={item.bannerAccent}
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />
        <rect
          x="110"
          y="36"
          width="48"
          height="8"
          rx="4"
          fill={item.bannerAccent}
          fillOpacity="0.75"
        />
        <rect
          x="110"
          y="52"
          width="96"
          height="6"
          rx="3"
          fill="#CBD5E1"
        />
        <rect
          x="110"
          y="64"
          width="76"
          height="6"
          rx="3"
          fill="#E2E8F0"
        />
        <rect
          x="110"
          y="80"
          width="36"
          height="14"
          rx="4"
          fill={item.bannerAccent}
          fillOpacity="0.18"
        />
        <circle
          cx="198"
          cy="87"
          r="9"
          fill={item.bannerAccent}
          fillOpacity="0.24"
        />
      </svg>
      )}

      {/* Top-Left Translucent Dark Badge: Live Assigned Count */}
      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-[#121215]/75 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs">
        <Users size={11} className="text-white/90" />
        <span>{assignedCount} Assigned</span>
      </div>

      {/* Top-Right Hover Action: Quick Change Cover Thumbnail */}
      {onEditThumbnail && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditThumbnail();
          }}
          title="Ganti cover thumbnail"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 rounded-lg bg-white/95 hover:bg-white text-[#121215] text-[11px] font-semibold px-2.5 py-1 shadow-sm border border-[#EAECEF] hover:border-[#4F39F6] cursor-pointer z-10"
        >
          <ImageIcon size={12} className="text-[#4F39F6]" />
          <span>Ganti Cover</span>
        </button>
      )}
    </div>
  );
}

function CircularProgressRing({ percent }: { percent: number }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#121215]">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className="-rotate-90"
        aria-label={`${percent}% completed`}
      >
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="#EAECEF"
          strokeWidth="2.5"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="#14B8A6"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[11px] font-semibold text-[#0F766E] tabular-nums">
        {percent}%
      </span>
    </span>
  );
}

export const MAC_FOLDER_COLORS: Record<
  string,
  {
    name: string;
    backGrad: [string, string];
    frontGrad: [string, string, string];
    shadow: string;
    swatchHex: string;
  }
> = {
  blue: {
    name: "Biru macOS",
    backGrad: ["#4A9BF5", "#1972DE"],
    frontGrad: ["#67B6FF", "#3F9BFF", "#0D68DF"],
    shadow: "#0B4086",
    swatchHex: "#2563EB",
  },
  purple: {
    name: "Ungu",
    backGrad: ["#A855F7", "#7E22CE"],
    frontGrad: ["#C084FC", "#9333EA", "#6B21A8"],
    shadow: "#581C87",
    swatchHex: "#9333EA",
  },
  pink: {
    name: "Pink",
    backGrad: ["#F472B6", "#DB2777"],
    frontGrad: ["#F9A8D4", "#EC4899", "#BE185D"],
    shadow: "#9D174D",
    swatchHex: "#EC4899",
  },
  red: {
    name: "Merah",
    backGrad: ["#F87171", "#DC2626"],
    frontGrad: ["#FCA5A5", "#EF4444", "#B91C1C"],
    shadow: "#991B1B",
    swatchHex: "#EF4444",
  },
  orange: {
    name: "Orange",
    backGrad: ["#FB923C", "#EA580C"],
    frontGrad: ["#FDBA74", "#F97316", "#C2410C"],
    shadow: "#9A3412",
    swatchHex: "#F97316",
  },
  yellow: {
    name: "Kuning",
    backGrad: ["#FBBF24", "#D97706"],
    frontGrad: ["#FDE047", "#EAB308", "#B45309"],
    shadow: "#854D0E",
    swatchHex: "#EAB308",
  },
  green: {
    name: "Hijau",
    backGrad: ["#34D399", "#059669"],
    frontGrad: ["#6EE7B7", "#10B981", "#047857"],
    shadow: "#065F46",
    swatchHex: "#10B981",
  },
  graphite: {
    name: "Graphite",
    backGrad: ["#94A3B8", "#475569"],
    frontGrad: ["#CBD5E1", "#64748B", "#334155"],
    shadow: "#1E293B",
    swatchHex: "#64748B",
  },
};

export function resolveMacFolderColor(input?: string): string {
  if (!input) return "blue";
  const low = input.toLowerCase().trim();
  if (MAC_FOLDER_COLORS[low]) return low;
  for (const [k, v] of Object.entries(MAC_FOLDER_COLORS)) {
    if (v.swatchHex.toLowerCase() === low) return k;
  }
  if (
    low.includes("purple") ||
    low.includes("ungu") ||
    low.includes("9333ea") ||
    low.includes("a855f7") ||
    low.includes("4f39f6")
  )
    return "purple";
  if (low.includes("pink") || low.includes("ec4899") || low.includes("f472b6"))
    return "pink";
  if (low.includes("red") || low.includes("merah") || low.includes("ef4444") || low.includes("dc2626"))
    return "red";
  if (low.includes("orange") || low.includes("f97316") || low.includes("ea580c"))
    return "orange";
  if (low.includes("yellow") || low.includes("kuning") || low.includes("eab308") || low.includes("d97706"))
    return "yellow";
  if (low.includes("green") || low.includes("hijau") || low.includes("10b981") || low.includes("059669"))
    return "green";
  if (low.includes("graphite") || low.includes("gray") || low.includes("grey") || low.includes("64748b"))
    return "graphite";
  return "blue";
}

function MacOsFolderIcon({
  color = "blue",
  className = "w-20 h-16",
  style,
}: {
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const colorKey = resolveMacFolderColor(color);
  const palette = MAC_FOLDER_COLORS[colorKey] || MAC_FOLDER_COLORS.blue;
  const backId = `finderBack-${colorKey}`;
  const frontId = `finderFront-${colorKey}`;
  const shadowId = `finderShadow-${colorKey}`;

  return (
    <svg
      viewBox="0 0 96 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Back flap gradient */}
        <linearGradient
          id={backId}
          x1="48"
          y1="6"
          x2="48"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.backGrad[0]} />
          <stop offset="100%" stopColor={palette.backGrad[1]} />
        </linearGradient>

        {/* Front flap gradient */}
        <linearGradient
          id={frontId}
          x1="48"
          y1="18"
          x2="48"
          y2="74"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.frontGrad[0]} />
          <stop offset="14%" stopColor={palette.frontGrad[1]} />
          <stop offset="100%" stopColor={palette.frontGrad[2]} />
        </linearGradient>

        {/* Top edge highlight reflection */}
        <linearGradient id="finderSheenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>

        {/* Drop shadow */}
        <filter
          id={shadowId}
          x="-10%"
          y="-10%"
          width="120%"
          height="130%"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2.5"
            floodColor={palette.shadow}
            floodOpacity="0.32"
          />
        </filter>
      </defs>

      {/* 1. Back Tab & Body */}
      <path
        d="M8 14C8 9.58172 11.5817 6 16 6H34.5C38.0772 6 41.3411 8.24156 42.618 11.5708L44.882 17.4292C45.3076 18.539 46.3956 19.2857 47.588 19.2857H80C84.4183 19.2857 88 22.8674 88 27.2857V64C88 68.4183 84.4183 72 80 72H16C11.5817 72 8 68.4183 8 64V14Z"
        fill={`url(#${backId})`}
      />

      {/* 2. Paper/Document Peek inside with smooth hover slide up */}
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-3">
        <rect
          x="18"
          y="13"
          width="60"
          height="23"
          rx="3"
          fill="#E2E8F0"
          fillOpacity="0.9"
        />
        <rect
          x="14"
          y="17"
          width="68"
          height="24"
          rx="3"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
        <line
          x1="20"
          y1="22"
          x2="44"
          y2="22"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="27"
          x2="56"
          y2="27"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* 3. Front Flap with smooth hover flap opening effect */}
      <g className="origin-bottom transition-all duration-300 ease-out group-hover:scale-y-[0.84]">
        <path
          d="M5 26C5 21.5817 8.58172 18 13 18H83C87.4183 18 91 21.5817 91 26V66C91 70.4183 87.4183 74 83 74H13C8.58172 74 5 70.4183 5 66V26Z"
          fill={`url(#${frontId})`}
          filter={`url(#${shadowId})`}
        />

        {/* 4. Top Rim Specular Sheen (macOS glossy reflection) */}
        <path
          d="M6.5 25.5C6.5 22.1863 9.18629 19.5 12.5 19.5H83.5C86.8137 19.5 89.5 22.1863 89.5 25.5V31C89.5 31 65 24 6.5 31V25.5Z"
          fill="url(#finderSheenGrad)"
        />

        {/* 5. Subtle Inner Edge Highlight */}
        <rect
          x="13"
          y="19"
          width="70"
          height="1"
          fill="#FFFFFF"
          fillOpacity="0.4"
        />
      </g>
    </svg>
  );
}

export function LearningContentExplorer({
  items,
  onSelectContentItem,
  onCreateNewContent,
  onDuplicateItem,
  onDeleteItem,
  onOpenAssignModal,
  onShowToast,
  activeProjectName = "Ruang Sosmed Class",
  activeSubView = "recents",
  showProjectPicker = false,
  onSelectProject,
  onBackToProjects,
}: LearningContentExplorerProps) {
  const { assignees, cohortProjects, addCohortProject } = useRuangSosmedStore();
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#4F39F6");
  const getItemAssignedCount = (item: ExplorerContentItem) => {
    const raw = item.assignedLearners;
    if (Array.isArray(raw)) {
      if (raw.length === 0) return 0;
      const hasCohortWide = raw.some((n) =>
        [
          "all learners",
          "batch oktober 2026",
          "ruang sosmed class",
          "creator growth lab",
        ].includes(String(n || "").trim().toLowerCase())
      );
      return hasCohortWide ? assignees.length : raw.length;
    }
    return item.assignedCount ?? 0;
  };
  const liveAvgProgress =
    assignees.length > 0
      ? Math.round(
          assignees.reduce(
            (sum, a) =>
              sum +
              (a.totalChapters > 0
                ? (a.completedChapters / a.totalChapters) * 100
                : 0),
            0
          ) / assignees.length
        )
      : 0;

  const [selectedTab, setSelectedTab] = useState<"All" | ExplorerItemType>(
    "All"
  );
  const [showCategoryTabs, setShowCategoryTabs] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"Date Created" | "Title A-Z" | "Assigned">(
    "Date Created"
  );
  const [newContentMenuOpen, setNewContentMenuOpen] = useState(false);
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [thumbnailTargetItem, setThumbnailTargetItem] =
    useState<ExplorerContentItem | null>(null);
  const {
    workspaceCollaborators,
    updateExplorerItemThumbnail,
    toggleArchiveContent,
    toggleShareContent,
    createFolder,
    updateFolder,
    moveToFolder,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [openingFolderId, setOpeningFolderId] = useState<string | null>(null);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");
  const [newFolderCode, setNewFolderCode] = useState("");
  const [moveModalItem, setMoveModalItem] = useState<ExplorerContentItem | null>(null);
  const [editFolderTarget, setEditFolderTarget] = useState<ExplorerContentItem | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [editFolderColor, setEditFolderColor] = useState("blue");
  const [editFolderCode, setEditFolderCode] = useState("");
  const [folderIconScale, setFolderIconScale] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = Number(
          window.localStorage.getItem("ruang_sosmed_folder_icon_scale_v1")
        );
        if (!Number.isNaN(saved) && saved >= 52 && saved <= 140) {
          return saved;
        }
      } catch {}
    }
    return 72;
  });

  const updateFolderScale = (next: number) => {
    const clamped = Math.min(140, Math.max(52, Math.round(next)));
    setFolderIconScale(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "ruang_sosmed_folder_icon_scale_v1",
          String(clamped)
        );
      } catch {}
    }
  };

  // Reset folder navigation when changing cohort/subview
  useEffect(() => {
    setCurrentFolder(null);
  }, [activeProjectName, activeSubView]);

  const availableFolders = React.useMemo(() => {
    return items.filter((i) => i.type === "Folder");
  }, [items]);

  const getFolderItemCount = (folderTitle: string) => {
    const target = folderTitle.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.type !== "Folder" &&
        !i.isArchived &&
        !i.isTemplate &&
        i.folderName?.toLowerCase().trim() === target
    ).length;
  };

  const handleOpenFolder = (folderTitle: string, folderId: string) => {
    setOpeningFolderId(folderId);
    // Smooth macOS zoom into folder
    setTimeout(() => {
      setCurrentFolder(folderTitle);
      setSelectedTab("All");
      setOpeningFolderId(null);
    }, 240);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const resolvedCode =
      newFolderCode.trim().toUpperCase().replace(/\s+/g, "-") ||
      getDefaultFolderAccessCode(trimmed);
    createFolder(
      trimmed,
      newFolderDesc.trim(),
      activeProjectName,
      newFolderColor,
      resolvedCode
    );
    onShowToast(
      `Folder "${trimmed}" dibuat (Kode Akses: ${resolvedCode}).`
    );
    setNewFolderName("");
    setNewFolderDesc("");
    setNewFolderColor("blue");
    setNewFolderCode("");
    setCreateFolderModalOpen(false);
    setSelectedTab("Folder");
  };

  const handleUpdateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolderTarget) return;
    const trimmed = editFolderName.trim();
    if (!trimmed) return;
    const resolvedCode =
      editFolderCode.trim().toUpperCase().replace(/\s+/g, "-") ||
      getDefaultFolderAccessCode(trimmed);
    updateFolder(
      editFolderTarget.id,
      editFolderTarget.title,
      trimmed,
      editFolderDesc.trim(),
      editFolderColor,
      resolvedCode
    );
    onShowToast(
      `Folder "${trimmed}" diperbarui (Kode Akses: ${resolvedCode}).`
    );
    setEditFolderTarget(null);
  };

  const handleExecuteMoveToFolder = (targetFolderName: string | null) => {
    if (!moveModalItem) return;
    moveToFolder(moveModalItem.id, targetFolderName);
    onShowToast(
      targetFolderName
        ? `"${moveModalItem.title}" berhasil dipindahkan ke folder "${targetFolderName}".`
        : `"${moveModalItem.title}" berhasil dipindahkan ke Root.`
    );
    setMoveModalItem(null);
  };

  // Close card menus / new content menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuCardId(null);
        setNewContentMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    if (!openMenuCardId && !newContentMenuOpen) return;
    const handleDocumentClick = () => {
      setOpenMenuCardId(null);
      setNewContentMenuOpen(false);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [openMenuCardId, newContentMenuOpen]);

  const removeFilter = (id: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const resetFilters = () => {
    setActiveFilters([]);
    setSelectedTab("All");
    setSearchQuery("");
  };

  const addSampleFilter = () => {
    const exists = activeFilters.some((f) => f.id === "f-cat");
    if (!exists) {
      setActiveFilters((prev) => [
        ...prev,
        { id: "f-cat", key: "Category", value: "Social Media Strategy" },
      ]);
    } else if (!activeFilters.some((f) => f.id === "f-urg")) {
      setActiveFilters((prev) => [
        ...prev,
        { id: "f-urg", key: "Urgency", value: "Not Urgent" },
      ]);
    } else {
      onShowToast("All preset filters are currently active.");
    }
  };

  // Cohort-scoped items: each cohort/project only sees its own contents!
  const cohortScopedItems = React.useMemo(() => {
    const activeP = activeProjectName.trim().toLowerCase();
    const primaryName = (
      cohortProjects?.[0]?.name || "Ruang Sosmed Class"
    ).trim().toLowerCase();
    const isActivePrimary =
      activeP === primaryName ||
      (activeP.includes("ruang sosmed") && primaryName.includes("ruang sosmed"));

    return items.filter((item) => {
      // Jika sedang membuka folder tertentu, tampilkan semua materi di dalam folder tersebut
      if (
        currentFolder &&
        item.type !== "Folder" &&
        item.folderName?.trim().toLowerCase() ===
          currentFolder.trim().toLowerCase()
      ) {
        if (activeSubView === "archived") return Boolean(item.isArchived);
        if (activeSubView === "shared")
          return Boolean(item.isShared) && !item.isArchived;
        return !item.isArchived && !item.isTemplate;
      }

      // Untuk tab "shared", tampilkan kelas yang memiliki flag isShared === true
      if (activeSubView === "shared") {
        return Boolean(item.isShared) && !item.isArchived;
      }
      // Untuk tab "archived", tampilkan kelas yang memiliki flag isArchived === true
      if (activeSubView === "archived") {
        return Boolean(item.isArchived);
      }

      const itemC = (item.cohort || "").trim().toLowerCase();
      if (itemC === activeP) return true;
      if (isActivePrimary && (!itemC || itemC.includes("ruang sosmed"))) {
        return true;
      }
      return false;
    });
  }, [items, activeProjectName, activeSubView, cohortProjects, currentFolder]);

  // Filter items based on tab + sub-view + search query + currentFolder
  const filteredItems = cohortScopedItems
    .filter((item) => {
      // 1. Recents: apa yang baru dibuat / aktif (BUKAN archived, BUKAN template)
      if (activeSubView === "recents") {
        if (item.isArchived) return false;
        if (item.isTemplate) return false;
      }

      // 2. Shared Content: kelas yang di-share saja (BUKAN archived)
      if (activeSubView === "shared") {
        if (!item.isShared) return false;
        if (item.isArchived) return false;
      }

      // 3. Archived: kelas yang diarsipkan saja
      if (activeSubView === "archived") {
        if (!item.isArchived) return false;
      }

      // 4. Templates: template saja
      if (activeSubView === "templates") {
        if (item.isArchived) return false;
        if (!item.isTemplate && item.type !== "Wiki" && item.type !== "Page") {
          return false;
        }
      }

      // 5. Folder Hierarchy:
      if (currentFolder) {
        // Didalam folder: hanya tampilkan konten yang berada di dalam folder ini
        const matchesFolder =
          item.folderName?.trim().toLowerCase() === currentFolder.trim().toLowerCase();
        if (!matchesFolder) return false;
        if (item.type === "Folder") return false;
      } else {
        // Di Root workspace:
        if (selectedTab === "All") {
          // Di halaman Recents (root), hanya tampilkan Project Folder saja agar bersih (kecuali sedang mencari)
          if (activeSubView === "recents" && !searchQuery.trim()) {
            if (item.type !== "Folder") return false;
          } else {
            // Di tab lain (Shared/Archived/Templates) atau saat mencari, sembunyikan item yang sudah ada di dalam folder
            if (item.folderName && item.type !== "Folder") return false;
          }
        } else if (selectedTab === "Folder") {
          if (item.type !== "Folder") return false;
        } else {
          // Jika tab spesifik dipilih (misal: Course), tampilkan semua konten berjenis tersebut
          if (item.type !== selectedTab) return false;
        }
      }

      if (selectedTab !== "All" && selectedTab !== "Folder" && item.type !== selectedTab) {
        return false;
      }

      if (
        searchQuery.trim() &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Folder diletakkan di bagian bawah saat di root view (agar materi utama tampil di atas)
      if (!currentFolder && selectedTab === "All") {
        if (a.type === "Folder" && b.type !== "Folder") return 1;
        if (a.type !== "Folder" && b.type === "Folder") return -1;
      }
      if (sortBy === "Title A-Z") return a.title.localeCompare(b.title);
      if (sortBy === "Assigned") return b.assignedCount - a.assignedCount;
      return 0;
    });

  const subViewTitleMap: Record<NonNullable<LearningContentExplorerProps["activeSubView"]>, string> = {
    recents: "Ruang Sosmed 2.0 Workspace",
    shared: "Shared Cohort Content",
    archived: "Archived & Completed Curriculum",
    templates: "Reusable SOPs & Templates",
  };

  const activeCohortColor =
    (cohortProjects || []).find(
      (c) => c.name.trim().toLowerCase() === activeProjectName.trim().toLowerCase()
    )?.color || "#EC4899";

  const showAlwaysFolderView =
    !currentFolder &&
    activeSubView === "recents" &&
    viewMode === "grid" &&
    (selectedTab === "All" || selectedTab === "Folder");

  if (showProjectPicker && !currentFolder) {
    const primaryProjectName = (
      cohortProjects[0]?.name || "Ruang Sosmed Class"
    )
      .trim()
      .toLowerCase();

    return (
      <div className="w-full px-4 sm:px-5 pt-5 pb-24 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[22px] sm:text-2xl font-bold tracking-tight text-[#121215]">
              Pilih Project / Cohort
            </h1>
            <p className="text-xs text-[#64748B]">
              Pilih salah satu project di bawah ini untuk melihat direktori folder dan materi di dalamnya.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNewProjectModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-colors cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Buat Project Baru</span>
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(cohortProjects || []).map((proj) => {
            const pName = proj.name.trim().toLowerCase();
            const isPrimary =
              pName === primaryProjectName ||
              (pName.includes("ruang sosmed") &&
                primaryProjectName.includes("ruang sosmed"));

            const projItems = items.filter((it) => {
              if (it.isArchived || it.isTemplate) return false;
              const itemC = (it.cohort || "").trim().toLowerCase();
              if (itemC === pName) return true;
              if (isPrimary && (!itemC || itemC.includes("ruang sosmed"))) {
                return true;
              }
              return false;
            });

            const projFolders = projItems.filter((i) => i.type === "Folder");
            const projCourses = projItems.filter((i) => i.type !== "Folder");

            return (
              <button
                key={proj.id || proj.name}
                type="button"
                onClick={() => onSelectProject?.(proj.name)}
                className="group relative flex flex-col justify-between rounded-2xl bg-white border border-[#EAECEF] hover:border-[#4F39F6]/60 p-5 text-left shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:shadow-[0_10px_28px_rgba(79,57,246,0.10)] transition-all cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-[4px] shrink-0 shadow-2xs"
                        style={{ backgroundColor: proj.color || "#4F39F6" }}
                      />
                      <h2 className="text-base font-bold text-[#121215] group-hover:text-[#4F39F6] truncate transition-colors">
                        {proj.name}
                      </h2>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                      <Folder size={11} className="text-[#4F39F6]" />
                      {projFolders.length} Folder
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                    {projFolders.length > 0 ? (
                      projFolders.slice(0, 3).map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-medium text-[#475569]"
                        >
                          <Folder size={10} className="text-[#64748B]" />
                          <span className="truncate max-w-[160px]">{f.title}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#94A3B8] italic">
                        Belum ada folder materi
                      </span>
                    )}
                    {projFolders.length > 3 && (
                      <span className="inline-flex items-center rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
                        +{projFolders.length - 3} lagi
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                  <span className="text-[#64748B] font-medium">
                    {projCourses.length} materi pembelajaran
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#4F39F6] group-hover:translate-x-0.5 transition-transform">
                    <span>Buka Project</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <ModalDialog
          open={newProjectModalOpen}
          onClose={() => setNewProjectModalOpen(false)}
          titleId="new-project-modal-title"
          title="Buat Project / Cohort Baru"
          subtitle="Kelompokkan folder dan kurikulum ke dalam project atau batch kelas terpisah."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newProjectTitle.trim();
              if (!trimmed) return;
              addCohortProject(trimmed, newProjectColor);
              setNewProjectTitle("");
              setNewProjectModalOpen(false);
              onShowToast(`Project "${trimmed}" berhasil dibuat.`);
              onSelectProject?.(trimmed);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                Nama Project / Cohort
              </label>
              <input
                type="text"
                required
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Contoh: Batch 2 Intensive"
                className="w-full rounded-xl border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                Warna Label
              </label>
              <div className="flex items-center gap-2">
                {["#4F39F6", "#EC4899", "#10B981", "#0EA5E9", "#F59E0B", "#8B5CF6"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewProjectColor(c)}
                      className={`h-7 w-7 rounded-lg transition-transform cursor-pointer ${
                        newProjectColor === c
                          ? "ring-2 ring-offset-2 ring-[#4F39F6] scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewProjectModalOpen(false)}
                className="rounded-xl border border-[#EAECEF] px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Buat &amp; Buka Project
              </button>
            </div>
          </form>
        </ModalDialog>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-5 pt-5 pb-14">
      {/* 1. Workspace Header (Hanya tampil di level utama workspace) */}
      {!currentFolder && (
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#EAECEF]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            {onBackToProjects && !currentFolder && (
              <button
                type="button"
                onClick={onBackToProjects}
                className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#EAECEF] px-2.5 py-1 text-xs font-semibold text-[#475569] hover:text-[#4F39F6] transition-colors cursor-pointer"
                title="Kembali pilih Project / Cohort"
              >
                <ChevronLeft size={13} />
                <span>Semua Projects</span>
              </button>
            )}
            <span
              className="h-3 w-3 rounded-sm shrink-0 shadow-2xs"
              style={{ backgroundColor: activeCohortColor }}
            />
            <h1 className="text-[22px] sm:text-2xl font-bold tracking-tight text-[#121215]">
              {activeProjectName}
            </h1>
          </div>

          <span className="inline-flex items-center rounded-md bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#475569]">
            {subViewTitleMap[activeSubView]}
          </span>

          {/* Overlapping Member Avatar Stack + Invite Button */}
          <div className="flex items-center pl-1">
            <div className="flex -space-x-2">
              {(workspaceCollaborators && workspaceCollaborators.length > 0
                ? workspaceCollaborators
                : [
                    {
                      id: "collab-owner",
                      name: "Dinur Pradipta",
                      initials: "DP",
                      avatarBg: "#FEF3C7",
                      avatarText: "#92400E",
                      role: "Admin",
                      cohort: "Ruang Sosmed Class",
                      status: "accepted",
                    },
                  ]
              ).map((av) => {
                const collabAvatar = resolveUserAvatar(
                  av.name,
                  (av as { email?: string }).email,
                  av.id
                );
                return (
                  <button
                    key={av.id || av.initials}
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    title={`${av.name} (${av.role} - ${av.cohort}) • Klik untuk kelola / hapus member`}
                    className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                      av.status === "accepted"
                        ? "border-[#FFFFFF]"
                        : "border-dashed border-[#4F39F6] opacity-80"
                    }`}
                    style={
                      collabAvatar
                        ? undefined
                        : { backgroundColor: av.avatarBg, color: av.avatarText }
                    }
                  >
                    {collabAvatar ? (
                      <img
                        src={collabAvatar}
                        alt={av.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      av.initials
                    )}
                    {av.status === "accepted" && (
                      <span
                        title="Aktif di Workspace"
                        className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#10B981] border border-white"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              title="Invite member to Ruang Sosmed 2.0 Workspace"
              aria-label="Invite member"
              className="ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFFFFF] border border-dashed border-[#D1D5DB] text-[#5E5E5E] hover:border-[#4F39F6] hover:text-[#4F39F6] transition-colors cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Right Actions: [↑ Upload] outlined button and [+ New Content] primary indigo button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] hover:border-[#D1D5DB] shadow-[0_1px_2px_rgba(16,15,17,0.03)] transition-all cursor-pointer"
          >
            <Upload size={14} strokeWidth={2.2} />
            <span>Upload</span>
          </button>

          {/* [+ New Content] Primary Indigo Button with Content-Type Selector Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNewContentMenuOpen((prev) => !prev)}
              aria-expanded={newContentMenuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.28)] transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Content</span>
            </button>

            {newContentMenuOpen && (
              <div
                role="menu"
                aria-label="Select content type to create"
                className="absolute right-0 mt-2 w-64 rounded-xl bg-[#FFFFFF] p-2 border border-[#EAECEF] shadow-[0_10px_28px_rgba(16,15,17,0.12)] z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2.5 py-1.5 border-b border-[#F0F2F5] mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    {currentFolder ? `Tambah ke 📁 ${currentFolder}` : `Create in ${activeProjectName}`}
                  </p>
                </div>

                {/* 1. Folder Creator */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setNewContentMenuOpen(false);
                    setCreateFolderModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#F8F9FB] transition-colors cursor-pointer group"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4F39F6]/10 text-[#4F39F6] group-hover:bg-[#4F39F6] group-hover:text-white transition-colors">
                    <FolderPlus size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#121215]">Folder</p>
                    <p className="truncate text-[10px] text-[#5E5E5E]">
                      Organisir materi (misal: Mini Bootcamp)
                    </p>
                  </div>
                </button>

                <div className="my-1 border-t border-[#F0F2F5]" />

                {/* 2. All Standard Content Types */}
                {CONTENT_TYPES_LIST.map((type) => {
                  const cfg = CONTENT_TYPE_CONFIGS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setNewContentMenuOpen(false);
                        onCreateNewContent(type, currentFolder || undefined);
                      }}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                    >
                      <ContentIconBox type={type} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#121215]">
                          {type}
                        </p>
                        <p className="truncate text-[10px] text-[#9CA3AF]">
                          {cfg.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {/* 2. Top Navigation Bar (Tabs on Left, Search + Filter Toggle + Sort + View on Right) */}
      {!currentFolder && (
        <div className="pt-1 pb-1 space-y-3">
          <div
            className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
              showCategoryTabs ? "border-b border-[#EAECEF]" : ""
            }`}
          >
            {/* Left: Category Selector (Simple Dropdown OR Clean Text Tabs) */}
            {!showCategoryTabs ? (
              /* Simple Mode (Default): Single compact dropdown pill with count and expand button */
              <div className="flex items-center gap-2 pb-2.5 lg:pb-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="text-[#64748B] font-normal">Kategori:</span>
                    <strong className="text-[#4F39F6]">{selectedTab === "All" ? "Semua Konten" : selectedTab}</strong>
                    <span className="rounded-md bg-[#4F39F6]/10 text-[#4F39F6] px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                      {(() => {
                        const base = currentFolder
                          ? cohortScopedItems.filter(
                              (i) =>
                                i.type !== "Folder" &&
                                i.folderName?.trim().toLowerCase() ===
                                  currentFolder.trim().toLowerCase()
                            )
                          : activeSubView === "recents"
                          ? cohortScopedItems.filter(
                              (i) => !i.isArchived && !i.isTemplate
                            )
                          : cohortScopedItems;

                        if (selectedTab === "All") {
                          if (!currentFolder && activeSubView === "recents") {
                            return base.filter((i) => i.type === "Folder")
                              .length;
                          }
                          return base.length;
                        }
                        return base.filter((i) => i.type === selectedTab).length;
                      })()}
                    </span>
                    <ChevronDown size={12} className="text-[#94A3B8]" />
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white border border-[#EAECEF] shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                      {FILTER_TABS.map((tab) => {
                        const base = currentFolder
                          ? cohortScopedItems.filter(
                              (i) =>
                                i.type !== "Folder" &&
                                i.folderName?.trim().toLowerCase() ===
                                  currentFolder.trim().toLowerCase()
                            )
                          : activeSubView === "recents"
                          ? cohortScopedItems.filter(
                              (i) => !i.isArchived && !i.isTemplate
                            )
                          : cohortScopedItems;

                        const count =
                          tab === "All"
                            ? !currentFolder && activeSubView === "recents"
                              ? base.filter((i) => i.type === "Folder").length
                              : base.length
                            : base.filter((i) => i.type === tab).length;
                        const isSelected = selectedTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => {
                              setSelectedTab(tab);
                              setCategoryDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#4F39F6]/10 text-[#4F39F6] font-bold"
                                : "text-[#1E293B] hover:bg-[#F8F9FB] font-medium"
                            }`}
                          >
                            <span>{tab === "All" ? "Semua Konten" : tab}</span>
                            <span className="text-[10px] text-[#94A3B8] tabular-nums">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCategoryTabs(true)}
                  title="Buka semua tab kategori materi"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B] hover:text-[#4F39F6] px-2 py-1.5 rounded-lg hover:bg-black/[0.03] transition-colors cursor-pointer"
                >
                  <Eye size={12} />
                  <span className="hidden sm:inline">Tampilkan Tab</span>
                </button>
              </div>
            ) : (
              /* Expanded Mode: Clean, sleek typography tabs WITHOUT chunky icon boxes */
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                <nav
                  aria-label="Content type filter tabs"
                  className="flex items-center gap-1"
                >
                  {FILTER_TABS.map((tab) => {
                    const isActive = selectedTab === tab;
                    const subViewItems = cohortScopedItems.filter((item) => {
                      if (activeSubView === "recents") {
                        if (item.isArchived || item.isTemplate) return false;
                      } else if (activeSubView === "shared") {
                        if (!item.isShared || item.isArchived) return false;
                      } else if (activeSubView === "archived") {
                        if (!item.isArchived) return false;
                      } else if (activeSubView === "templates") {
                        if (
                          item.isArchived ||
                          (!item.isTemplate && item.type !== "Wiki" && item.type !== "Page")
                        ) {
                          return false;
                        }
                      }
                      return true;
                    });
                    const count =
                      tab === "All"
                        ? subViewItems.length
                        : subViewItems.filter((i) => i.type === tab).length;

                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSelectedTab(tab)}
                        className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-1 text-xs font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? "text-[#4F39F6]"
                            : "text-[#5E5E5E] hover:text-[#121215]"
                        }`}
                      >
                        <span>{tab}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                            isActive
                              ? "bg-[#4F39F6]/10 text-[#4F39F6]"
                              : "bg-[#F8F9FB] text-[#9CA3AF]"
                          }`}
                        >
                          {count}
                        </span>
                        {isActive && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4F39F6]" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                <button
                  type="button"
                  onClick={() => setShowCategoryTabs(false)}
                  title="Sembunyikan tab (kembali ke mode simple)"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#94A3B8] hover:text-[#4F39F6] px-2 pb-2.5 pt-0.5 rounded-md hover:bg-black/[0.03] transition-colors cursor-pointer ml-1"
                >
                  <EyeOff size={12} />
                  <span>Simple</span>
                </button>
              </div>
            )}

            {/* Right: Quick Search + Filter (Expand/Hide) + Sort + View */}
            <div className="flex items-center gap-2 pb-2.5 lg:pb-0 shrink-0">
              {/* Search */}
              <div className="relative w-40 sm:w-52 focus-within:w-60 transition-all">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari materi..."
                  aria-label="Cari materi"
                  className="w-full rounded-lg bg-[#FFFFFF] pl-7.5 pr-2.5 py-1.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none shadow-[0_1px_2px_rgba(16,15,17,0.03)]"
                />
              </div>

              {/* Filter Expand/Hide Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFilterExpanded((prev) => !prev)}
                aria-expanded={isFilterExpanded}
                title={isFilterExpanded ? "Sembunyikan panel filter" : "Buka panel filter lanjutan"}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                  isFilterExpanded || activeFilters.length > 0
                    ? "bg-[#4F39F6]/10 text-[#4F39F6] border-[#4F39F6]/30 hover:bg-[#4F39F6]/15"
                    : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:bg-[#F8F9FB] hover:text-[#121215]"
                }`}
              >
                <SlidersHorizontal size={12} />
                <span>Filter</span>
                {activeFilters.length > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#4F39F6] text-white text-[10px] font-bold">
                    {activeFilters.length}
                  </span>
                )}
                {isFilterExpanded ? (
                  <ChevronUp size={12} className="text-current" />
                ) : (
                  <ChevronDown size={12} className="text-current" />
                )}
              </button>

              {/* Sort Dropdown */}
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "Date Created"
                      ? "Title A-Z"
                      : prev === "Title A-Z"
                      ? "Assigned"
                      : "Date Created"
                  )
                }
                title={`Urutkan: ${sortBy}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <ArrowUpDown size={12} className="text-[#5E5E5E]" />
                <span className="hidden sm:inline">{sortBy}</span>
              </button>

              {/* Grid / List View Toggle */}
              <div
                role="group"
                aria-label="Toggle Explorer view mode"
                className="inline-flex items-center rounded-lg bg-[#FFFFFF] p-0.5 border border-[#EAECEF]"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  title="Grid View"
                  className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-md transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[#4F39F6] text-white"
                      : "text-[#5E5E5E] hover:text-[#121215]"
                  }`}
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  title="List View"
                  className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-md transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#4F39F6] text-white"
                      : "text-[#5E5E5E] hover:text-[#121215]"
                  }`}
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Collapsible Filter Drawer (Only visible when user expands it) */}
          {isFilterExpanded && (
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mr-1">
                  Filter Tambahan:
                </span>

                {activeFilters.length === 0 ? (
                  <span className="text-xs text-[#94A3B8] italic">
                    Belum ada filter khusus diterapkan.
                  </span>
                ) : (
                  activeFilters.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#CBD5E1] shadow-2xs px-2.5 py-1 text-xs font-medium text-[#1E293B]"
                    >
                      <span className="text-[#64748B]">{f.key}:</span>
                      <strong className="font-semibold text-[#4F39F6]">{f.value}</strong>
                      <button
                        type="button"
                        onClick={() => removeFilter(f.id)}
                        aria-label={`Remove filter ${f.key}: ${f.value}`}
                        className="ml-0.5 rounded hover:bg-[#EF4444]/10 hover:text-[#EF4444] p-0.5 cursor-pointer text-[#94A3B8] transition-colors"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </span>
                  ))
                )}

                {activeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-2 py-1 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}

                <button
                  type="button"
                  onClick={addSampleFilter}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#4F39F6] border border-[#CBD5E1] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Tambah Filter</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterExpanded(false)}
                className="text-xs font-medium text-[#64748B] hover:text-[#1E293B] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Sembunyikan</span>
                <ChevronUp size={12} />
              </button>
            </div>
          )}

          {/* Subtle item counter indicator when searching */}
          {searchQuery.trim() && (
            <p className="text-xs font-medium text-[#5E5E5E] pt-1">
              Ditemukan <strong className="text-[#121215] font-semibold">{filteredItems.length}</strong> hasil untuk &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Clean Unboxed Breadcrumb Navigation when inside a Folder */}
      {currentFolder && (
        <div className="pb-5 pt-1 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCurrentFolder(null);
                setSelectedTab("All");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-black/[0.04] px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Workspace</span>
            </button>
            <span className="text-xs text-[#CBD5E1]">/</span>
            <div className="inline-flex items-center gap-2">
              <MacOsFolderIcon
                color={resolveMacFolderColor(
                  items.find(
                    (i) =>
                      i.type === "Folder" &&
                      i.title.toLowerCase() === currentFolder.toLowerCase()
                  )?.bannerAccent
                )}
                className="w-5 h-4"
              />
              <span className="text-sm font-bold text-[#0F172A]">
                {currentFolder}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#EF4444] px-1.5 py-0.2 text-[10px] font-bold text-white shadow-2xs">
                {getFolderItemCount(currentFolder)} materi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-44 sm:w-60">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari di ${currentFolder}...`}
                aria-label={`Cari di ${currentFolder}`}
                className="w-full rounded-lg bg-white pl-8 pr-2.5 py-1.5 text-xs text-[#1E293B] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={() => onCreateNewContent("Course", currentFolder)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_2px_6px_rgba(79,57,246,0.25)] transition-all cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Buat Course di {currentFolder}</span>
            </button>

            {(() => {
              const activeFolderItem = items.find(
                (i) =>
                  i.type === "Folder" &&
                  i.title.trim().toLowerCase() === currentFolder.trim().toLowerCase()
              );
              if (!activeFolderItem) return null;
              const fCode =
                activeFolderItem.accessCode ||
                getDefaultFolderAccessCode(activeFolderItem.title);
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        void navigator.clipboard.writeText(fCode);
                      }
                      onShowToast(
                        `Kode akses folder "${fCode}" disalin! Bagikan kode ini ke siswa untuk gabung otomatis ke semua materi di ${activeFolderItem.title}.`
                      );
                    }}
                    title="Salin kode akses otomatis folder ini"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors cursor-pointer"
                  >
                    <KeyRound size={12} />
                    <span>{fCode}</span>
                    <Copy size={11} className="opacity-70" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(activeFolderItem)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-[#F8F9FB] border border-[#EAECEF] px-3 py-1.5 text-xs font-semibold text-[#121215] transition-colors cursor-pointer"
                  >
                    <UserPlus size={13} className="text-[#4F39F6]" />
                    <span>Assign Folder</span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 5. Content Cards Grid (3 Columns in Grid View, Table in List View) */}
      {filteredItems.length === 0 && !showAlwaysFolderView ? (
        <div className="rounded-xl bg-[#FFFFFF] p-12 border border-[#EAECEF] text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8F9FB] border border-[#EAECEF] text-[#4F39F6]">
            {currentFolder ? (
              <FolderOpen size={22} />
            ) : selectedTab === "Folder" ? (
              <FolderPlus size={22} />
            ) : activeSubView === "shared" ? (
              <Share2 size={22} />
            ) : activeSubView === "archived" ? (
              <Archive size={22} />
            ) : activeSubView === "templates" ? (
              <LayoutTemplate size={22} />
            ) : (
              <Clock size={22} />
            )}
          </div>
          <h3 className="text-sm font-bold text-[#121215]">
            {currentFolder
              ? `Folder "${currentFolder}" Masih Kosong`
              : selectedTab === "Folder"
              ? "Belum Ada Folder di Workspace Ini"
              : activeSubView === "shared"
              ? "Belum Ada Kelas yang Dibagikan (Shared Content)"
              : activeSubView === "archived"
              ? "Belum Ada Kelas yang Diarsipkan (Archived)"
              : activeSubView === "templates"
              ? "Belum Ada Template Modul atau SOP"
              : `Belum Ada Konten ${selectedTab !== "All" ? selectedTab : "Terbaru"}`}
          </h3>
          <p className="text-xs text-[#5E5E5E] max-w-md mx-auto leading-relaxed">
            {currentFolder
              ? `Belum ada materi pembelajaran yang dimasukkan ke dalam folder "${currentFolder}". Klik tombol di bawah untuk mulai menambahkan course atau konten ke folder ini.`
              : selectedTab === "Folder"
              ? "Gunakan folder untuk mengelompokkan materi, seperti 'Mini Bootcamp', 'Batch Khusus', atau 'Intensive Workshop'."
              : activeSubView === "shared"
              ? "Kelas atau materi yang Anda bagikan secara publik/lintas cohort akan muncul di sini. Buka tab Recents lalu klik tombol titik tiga (•••) pada kartu kelas dan pilih 'Share ke Shared Content'."
              : activeSubView === "archived"
              ? "Kelas atau kurikulum yang telah selesai dan diarsipkan akan tersimpan rapi di sini. Buka tab Recents dan pilih 'Arsipkan' untuk memindahkan kelas ke arsip."
              : activeSubView === "templates"
              ? "Simpan modul panduan, format SOP, atau template kurikulum agar instruktur lain dapat menduplikasinya dengan mudah."
              : `Cohort "${activeProjectName}" belum memiliki konten ${selectedTab !== "All" ? selectedTab : "aktif"}. Klik tombol di bawah untuk membuat kelas atau modul baru.`}
          </p>
          {activeSubView === "recents" && (
            <div className="pt-1 flex justify-center gap-2">
              {currentFolder ? (
                <button
                  type="button"
                  onClick={() => onCreateNewContent("Course", currentFolder)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Buat Course di {currentFolder}</span>
                </button>
              ) : selectedTab === "Folder" ? (
                <button
                  type="button"
                  onClick={() => setCreateFolderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <FolderPlus size={14} />
                  <span>+ Buat Folder Baru</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onCreateNewContent(
                      selectedTab === "All" ? "Course" : selectedTab
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>
                    Buat {selectedTab === "All" ? "Course" : selectedTab} di{" "}
                    {activeProjectName}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        (() => {
          const folderItems = filteredItems.filter((i) => i.type === "Folder");
          const contentItems = filteredItems.filter((i) => i.type !== "Folder");

          const renderMacFolderIconTile = (item: ExplorerContentItem) => {
            const menuOpen = openMenuCardId === item.id;
            const insideCount = getFolderItemCount(item.title);
            const isOpening = openingFolderId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenFolder(item.title, item.id)}
                style={{ width: `${Math.round(folderIconScale * 1.4)}px` }}
                className={`group relative flex flex-col items-center justify-start p-1.5 rounded-xl transition-all duration-200 cursor-pointer text-center select-none ${
                  menuOpen ? "z-40" : "z-0"
                } ${isOpening ? "scale-110 opacity-30" : "hover:bg-black/[0.04]"}`}
              >
                {/* Top-Right Menu Trigger */}
                <div
                  className={`absolute top-0.5 right-0.5 ${menuOpen ? "z-50" : "z-10"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setOpenMenuCardId(menuOpen ? null : item.id)}
                    aria-label={`Opsi untuk folder ${item.title}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[#9CA3AF] opacity-0 group-hover:opacity-100 hover:bg-white hover:text-[#121215] shadow-xs transition-all cursor-pointer"
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-7 w-48 rounded-xl bg-[#FFFFFF] p-2 border border-[#EAECEF] shadow-[0_12px_32px_rgba(16,15,17,0.18)] z-[60] text-left animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuCardId(null);
                          handleOpenFolder(item.title, item.id);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] cursor-pointer"
                      >
                        <FolderOpen size={14} />
                        <span>Buka Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuCardId(null);
                          setEditFolderTarget(item);
                          setEditFolderName(item.title);
                          setEditFolderDesc(item.description || "");
                          setEditFolderColor(resolveMacFolderColor(item.bannerAccent));
                          setEditFolderCode(
                            item.accessCode ||
                              getDefaultFolderAccessCode(item.title)
                          );
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                      >
                        <Edit3 size={14} className="text-[#5E5E5E]" />
                        <span>Edit Nama, Info &amp; Kode</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuCardId(null);
                          onOpenAssignModal(item);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-[#4F39F6] hover:bg-[#4F39F6]/10 cursor-pointer"
                      >
                        <KeyRound size={14} />
                        <span>Assign Folder &amp; Kode Akses</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuCardId(null);
                          onCreateNewContent("Course", item.title);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                      >
                        <Plus size={14} className="text-[#5E5E5E]" />
                        <span>+ Buat Course di Sini</span>
                      </button>

                      {/* Quick Color Palette Tag Selector */}
                      <div className="px-2 py-1.5 border-t border-[#F0F2F5] my-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                          Ubah Warna Folder
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {Object.entries(MAC_FOLDER_COLORS).map(([cKey, cVal]) => {
                            const isCur = resolveMacFolderColor(item.bannerAccent) === cKey;
                            return (
                              <button
                                key={cKey}
                                type="button"
                                onClick={() => {
                                  setOpenMenuCardId(null);
                                  updateFolder(
                                    item.id,
                                    item.title,
                                    item.title,
                                    item.description || "",
                                    cKey
                                  );
                                  onShowToast(`Warna folder diubah ke ${cVal.name}.`);
                                }}
                                title={cVal.name}
                                className={`h-5 w-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  isCur
                                    ? "ring-2 ring-offset-1 ring-[#4F39F6] scale-110 shadow-2xs"
                                    : "hover:scale-115 border border-black/10"
                                }`}
                                style={{ backgroundColor: cVal.swatchHex }}
                              >
                                {isCur && <Check size={10} className="text-white stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="my-1 h-[1px] bg-[#EAECEF]" />
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuCardId(null);
                          onDeleteItem(item.id);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>Hapus Folder</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* macOS Folder Icon with smooth hover animation & Red Notification Badge */}
                <div className="relative pt-0.5 pb-0.5 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                  <MacOsFolderIcon
                    color={resolveMacFolderColor(item.bannerAccent)}
                    className="drop-shadow-[0_3px_8px_rgba(0,0,0,0.08)]"
                    style={{
                      width: `${folderIconScale}px`,
                      height: `${Math.round(folderIconScale * 0.82)}px`,
                    }}
                  />

                  {/* Red Notification Badge with item count */}
                  {insideCount > 0 && (
                    <span
                      title={`${insideCount} materi`}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-bold shadow-md ring-2 ring-white select-none transition-transform duration-200 group-hover:scale-110"
                    >
                      {insideCount}
                    </span>
                  )}
                </div>

                {/* Folder Title (macOS Typography scaled cleanly with Finder slider) */}
                <p
                  className={`mt-1 font-normal text-[#334155] group-hover:text-[#2563EB] line-clamp-2 leading-tight transition-colors px-0.5 w-full break-words ${
                    folderIconScale >= 104
                      ? "text-xs font-medium"
                      : folderIconScale <= 58
                      ? "text-[10px]"
                      : "text-[11px]"
                  }`}
                >
                  {item.title}
                </p>

                {/* Folder Series Access Code Pill (click to copy) */}
                {(() => {
                  const fCode =
                    item.accessCode || getDefaultFolderAccessCode(item.title);
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          typeof navigator !== "undefined" &&
                          navigator.clipboard
                        ) {
                          void navigator.clipboard.writeText(fCode);
                        }
                        onShowToast(
                          `Kode folder "${fCode}" disalin! Siswa bisa masukkan kode ini saat daftar / di Learner Portal.`
                        );
                      }}
                      title={`Klik untuk salin Kode Akses Folder: ${fCode}`}
                      className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 transition-colors cursor-pointer"
                    >
                      <KeyRound size={9} />
                      <span>{fCode}</span>
                    </button>
                  );
                })()}
              </div>
            );
          };

          const renderStandardCard = (item: ExplorerContentItem) => {
            const menuOpen = openMenuCardId === item.id;

            return (
              <article
                key={item.id}
                onClick={() => onSelectContentItem(item)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] hover:border-[#4F39F6]/50 hover:shadow-[0_6px_20px_rgba(79,57,246,0.08)] transition-all cursor-pointer"
              >
                <div>
                  {/* Top Custom Illustrated Banner with Live Assigned 👤 badge */}
                  <IllustratedCardBanner
                    item={item}
                    assignedCount={getItemAssignedCount(item)}
                    onEditThumbnail={() => setThumbnailTargetItem(item)}
                  />

                  {/* Card Body */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <ContentBadge type={item.type} size="sm" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAssignModal(item);
                        }}
                        title="Quick-assign learners"
                        aria-label={`Quick-assign learners to ${item.title}`}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF] hover:bg-[#4F39F6] hover:text-white hover:border-[#4F39F6] transition-colors cursor-pointer"
                      >
                        <UserPlus size={12} strokeWidth={2.2} />
                      </button>
                    </div>

                    <h3 className="text-[13px] font-bold text-[#121215] group-hover:text-[#4F39F6] transition-colors line-clamp-1 leading-tight">
                      {item.title}
                    </h3>

                    {/* Category, Urgency & Folder Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {item.folderName && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#4F39F6]/10 border border-[#4F39F6]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#4F39F6]">
                          <Folder size={10} />
                          <span>{item.folderName}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-1.5 py-0.5 text-[10px] font-medium text-[#5E5E5E]">
                        {item.category}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                          item.urgency === "Urgent"
                            ? "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                            : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E]"
                        }`}
                      >
                        {item.urgency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Slimmer height (py-2 px-3.5) */}
                <div className="px-3.5 py-2 border-t border-[#EAECEF] bg-[#F9FAFB]/50 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#5E5E5E] truncate">
                    {item.editedLabel} •{" "}
                    <strong className="font-semibold text-[#121215]">
                      {item.statusLabel}
                    </strong>
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <CircularProgressRing percent={liveAvgProgress} />

                    {/* ••• Context Menu */}
                    <div
                      className="relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuCardId(menuOpen ? null : item.id)
                        }
                        aria-label={`Actions for ${item.title}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#5E5E5E] hover:bg-[#FFFFFF] hover:text-[#121215] border border-transparent hover:border-[#EAECEF] transition-colors cursor-pointer"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {menuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 bottom-8 w-44 rounded-xl bg-[#FFFFFF] p-1.5 border border-[#EAECEF] shadow-[0_8px_24px_rgba(16,15,17,0.12)] z-30"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCardId(null);
                              onSelectContentItem(item);
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            <Edit3 size={13} className="text-[#5E5E5E]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCardId(null);
                              setThumbnailTargetItem(item);
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            <ImageIcon size={13} className="text-[#5E5E5E]" />
                            <span>Ganti Thumbnail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCardId(null);
                              onDuplicateItem(item);
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            <Copy size={13} className="text-[#5E5E5E]" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCardId(null);
                              setMoveModalItem(item);
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            <FolderInput size={13} className="text-[#4F39F6]" />
                            <span>Pindahkan ke Folder...</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCardId(null);
                              toggleShareContent(item.id);
                              onShowToast(
                                item.isShared
                                  ? `Berhenti membagikan "${item.title}". Sekarang berstatus privat.`
                                  : `"${item.title}" berhasil dibagikan ke Shared Content.`
                              );
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            <Share2
                              size={13}
                              className={
                                item.isShared
                                  ? "text-[#4F39F6]"
                                  : "text-[#5E5E5E]"
                              }
                            />
                            <span>
                              {item.isShared
                                ? "Batalkan Share (Privat)"
                                : "Share ke Shared Content"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCardId(null);
                              toggleArchiveContent(item.id);
                              onShowToast(
                                item.isArchived
                                  ? `"${item.title}" dipulihkan ke Recents.`
                                  : `"${item.title}" berhasil diarsipkan.`
                              );
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            {item.isArchived ? (
                              <RotateCcw size={13} className="text-[#10B981]" />
                            ) : (
                              <Archive size={13} className="text-[#5E5E5E]" />
                            )}
                            <span>
                              {item.isArchived
                                ? "Pulihkan dari Arsip"
                                : "Arsipkan (Archive)"}
                            </span>
                          </button>
                          <div className="my-1 h-[1px] bg-[#EAECEF]" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCardId(null);
                              onDeleteItem(item.id);
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          };

          const renderFinderSizeControls = () => (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => updateFolderScale(folderIconScale - 12)}
                disabled={folderIconScale <= 52}
                title="Perkecil ukuran ikon folder"
                aria-label="Perkecil ukuran folder"
                className="flex h-5 w-5 items-center justify-center rounded bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#4F39F6] hover:border-[#4F39F6]/40 disabled:opacity-40 cursor-pointer"
              >
                <Minus size={11} />
              </button>
              <input
                type="range"
                min={52}
                max={140}
                step={4}
                value={folderIconScale}
                onChange={(e) => updateFolderScale(Number(e.target.value))}
                aria-label="Atur ukuran folder ala macOS Finder"
                className="w-20 sm:w-24 h-1.5 accent-[#4F39F6] cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateFolderScale(folderIconScale + 12)}
                disabled={folderIconScale >= 140}
                title="Perbesar ukuran ikon folder"
                aria-label="Perbesar ukuran folder"
                className="flex h-5 w-5 items-center justify-center rounded bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#4F39F6] hover:border-[#4F39F6]/40 disabled:opacity-40 cursor-pointer"
              >
                <Plus size={11} />
              </button>
              <button
                type="button"
                onClick={() => updateFolderScale(72)}
                title="Reset ke ukuran standar (100%)"
                className="ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] hover:bg-white hover:text-[#121215] tabular-nums cursor-pointer"
              >
                {Math.round((folderIconScale / 72) * 100)}%
              </button>
            </div>
          );

          return (
            <div className="space-y-6">
              {/* TAMPILAN PER KATEGORI (MATERI DI ATAS, DIREKTORI FOLDER KECIL DI BAWAH) */}
              {!currentFolder && selectedTab === "All" ? (
                <>
                  {/* SEKSI 1: KURSUS & MATERI MANDIRI (UTAMA / ATAS) */}
                  {contentItems.length > 0 && (
                    <section aria-labelledby="section-contents" className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {contentItems.map(renderStandardCard)}
                      </div>
                    </section>
                  )}

                  {/* SEKSI 2: DIREKTORI FOLDER (FINDER ICON VIEW WITH SIZE SLIDER) */}
                  {(folderItems.length > 0 || activeSubView === "recents") && (
                    <section
                      aria-labelledby="section-folders"
                      className={`${
                        contentItems.length > 0
                          ? "pt-6 border-t border-[#F1F3F5]"
                          : ""
                      } space-y-3`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Folder size={14} className="text-[#94A3B8]" />
                          <h2
                            id="section-folders"
                            className="text-xs font-semibold text-[#64748B]"
                          >
                            Direktori Folder ({folderItems.length})
                          </h2>
                          <span className="text-[11px] text-[#94A3B8] hidden sm:inline">
                            — Akses materi per kelompok kurikulum
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          {renderFinderSizeControls()}
                          <button
                            type="button"
                            onClick={() => setCreateFolderModalOpen(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F39F6] hover:text-[#3B28CC] transition-colors cursor-pointer"
                          >
                            <Plus size={12} strokeWidth={2.2} />
                            <span>Buat Folder Baru</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start gap-3 sm:gap-4 py-1">
                        {folderItems.map(renderMacFolderIconTile)}
                        <button
                          type="button"
                          onClick={() => setCreateFolderModalOpen(true)}
                          style={{
                            width: `${Math.round(folderIconScale * 1.4)}px`,
                            height: `${Math.max(84, Math.round(folderIconScale * 1.12))}px`,
                          }}
                          className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#4F39F6] bg-[#F8FAFC]/50 hover:bg-[#EFF6FF]/50 transition-all cursor-pointer p-2 text-center"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#4F39F6] text-[#94A3B8] group-hover:text-[#4F39F6] shadow-2xs group-hover:scale-105 transition-all mb-1">
                            <FolderPlus size={15} />
                          </div>
                          <span className="text-[10px] font-medium text-[#64748B] group-hover:text-[#4F39F6] transition-colors">
                            + Buat Folder
                          </span>
                        </button>
                      </div>
                    </section>
                  )}
                </>
              ) : selectedTab === "Folder" ? (
                /* JIKA TAB FOLDER TERPILIH: TAMPILKAN GRID FINDER ICONS */
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#64748B]">
                      Direktori Folder ({filteredItems.length})
                    </span>
                    {renderFinderSizeControls()}
                  </div>
                  <div className="flex flex-wrap items-start gap-3 sm:gap-4 py-2">
                    {filteredItems.map(renderMacFolderIconTile)}
                    <button
                      type="button"
                      onClick={() => setCreateFolderModalOpen(true)}
                      style={{
                        width: `${Math.round(folderIconScale * 1.4)}px`,
                        height: `${Math.max(84, Math.round(folderIconScale * 1.12))}px`,
                      }}
                      className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#4F39F6] bg-[#F8FAFC]/50 hover:bg-[#EFF6FF]/50 transition-all cursor-pointer p-2 text-center"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E2E8F0] group-hover:border-[#4F39F6] text-[#94A3B8] group-hover:text-[#4F39F6] shadow-2xs group-hover:scale-105 transition-all mb-1">
                        <FolderPlus size={15} />
                      </div>
                      <span className="text-[10px] font-medium text-[#64748B] group-hover:text-[#4F39F6] transition-colors">
                        + Buat Folder
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* JIKA SEDANG DI DALAM FOLDER ATAU TAB FILTER LAIN */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredItems.map((item) =>
                    item.type === "Folder"
                      ? renderMacFolderIconTile(item)
                      : renderStandardCard(item)
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        /* Table in List View */
        <div className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] overflow-hidden">
          <div
            tabIndex={0}
            role="region"
            aria-label="Learning Content Table View"
            className="table-wrapper"
          >
            <table>
              <thead>
                <tr className="border-b border-[#EAECEF] bg-[#F9FAFB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <th className="py-3 pl-4 pr-3">Content Title</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Category &amp; Urgency</th>
                  <th className="py-3 px-3">Assigned</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF] text-xs">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (item.type === "Folder") {
                        setCurrentFolder(item.title);
                        setSelectedTab("All");
                      } else {
                        onSelectContentItem(item);
                      }
                    }}
                    className="hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                  >
                    <th
                      scope="row"
                      className="py-3.5 pl-4 pr-3 font-semibold text-[#121215] text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <ContentIconBox type={item.type} size="sm" />
                        <div>
                          <p className="font-semibold text-[#121215]">
                            {item.title}
                          </p>
                          <p className="text-[11px] font-normal text-[#9CA3AF]">
                            {item.type === "Folder"
                              ? `${getFolderItemCount(item.title)} materi di dalam`
                              : `${item.editedLabel} • ${item.statusLabel}`}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td className="py-3.5 px-3">
                      <ContentBadge type={item.type} />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {item.folderName && (
                          <span className="rounded-md bg-[#4F39F6]/10 border border-[#4F39F6]/20 px-2 py-0.5 text-[11px] font-semibold text-[#4F39F6]">
                            📁 {item.folderName}
                          </span>
                        )}
                        <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] text-[#5E5E5E]">
                          {item.category}
                        </span>
                        <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2 py-0.5 text-[11px] text-[#5E5E5E]">
                          {item.urgency}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[#121215]">
                      {item.type === "Folder"
                        ? "-"
                        : `${getItemAssignedCount(item)} Assigned`}
                    </td>
                    <td className="py-3.5 px-3">
                      {item.type === "Folder" ? (
                        <span className="text-[11px] font-medium text-[#9CA3AF]">-</span>
                      ) : (
                        <CircularProgressRing percent={liveAvgProgress} />
                      )}
                    </td>
                    <td
                      className="py-3.5 pl-3 pr-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.type === "Folder" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentFolder(item.title);
                              setSelectedTab("All");
                            }}
                            className="rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1 text-xs font-semibold text-white cursor-pointer shadow-2xs"
                          >
                            Buka Folder
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditFolderTarget(item);
                              setEditFolderName(item.title);
                              setEditFolderDesc(item.description || "");
                            }}
                            className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onCreateNewContent("Course", item.title)}
                            className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#121215] border border-[#EAECEF] hover:bg-[#F8F9FB] cursor-pointer"
                          >
                            + Course
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#EF4444] border border-[#EAECEF] hover:bg-[#EF4444]/10 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenAssignModal(item)}
                            className="rounded-lg bg-[#F8F9FB] px-2.5 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF] hover:border-[#4F39F6] hover:text-[#4F39F6] cursor-pointer"
                          >
                            Assign
                          </button>
                          <button
                            type="button"
                            onClick={() => setMoveModalItem(item)}
                            title="Pindahkan ke folder lain"
                            className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#5E5E5E] border border-[#EAECEF] hover:text-[#4F39F6] hover:border-[#4F39F6] cursor-pointer"
                          >
                            Pindahkan
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateItem(item)}
                            className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#5E5E5E] border border-[#EAECEF] hover:text-[#121215] cursor-pointer"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleShareContent(item.id);
                              onShowToast(
                                item.isShared
                                  ? `Berhenti membagikan "${item.title}". Sekarang berstatus privat.`
                                  : `"${item.title}" berhasil dibagikan ke Shared Content.`
                              );
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                              item.isShared
                                ? "bg-[#4F39F6]/10 text-[#4F39F6] border-[#4F39F6]/30"
                                : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:text-[#121215]"
                            }`}
                          >
                            {item.isShared ? "Shared" : "Share"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleArchiveContent(item.id);
                              onShowToast(
                                item.isArchived
                                  ? `"${item.title}" dipulihkan ke Recents.`
                                  : `"${item.title}" berhasil diarsipkan.`
                              );
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                              item.isArchived
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:text-[#121215]"
                            }`}
                          >
                            {item.isArchived ? "Restore" : "Archive"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
      <InviteCollaboratorModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onShowToast={onShowToast}
      />

      <UploadAssetModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onShowToast={onShowToast}
        activeProjectName={activeProjectName}
      />

      {/* Modal: Buat Folder Baru */}
      <ModalDialog
        open={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        titleId="create-folder-dialog"
        title="Buat Folder Baru"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1">
              Nama Folder <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Contoh: Mini Bootcamp, Batch Khusus, Intensive Track"
              className="w-full rounded-lg border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1">
              Deskripsi Folder (Opsional)
            </label>
            <textarea
              rows={2}
              value={newFolderDesc}
              onChange={(e) => setNewFolderDesc(e.target.value)}
              placeholder="Keterangan singkat tentang materi dalam folder ini..."
              className="w-full rounded-lg border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] focus:border-[#4F39F6] focus:outline-none resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#121215]">
                Kode Akses Otomatis Folder Series
              </label>
              <button
                type="button"
                onClick={() =>
                  setNewFolderCode(
                    getDefaultFolderAccessCode(newFolderName || "SERIES")
                  )
                }
                className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Auto-Generate
              </button>
            </div>
            <input
              type="text"
              value={newFolderCode}
              onChange={(e) => setNewFolderCode(e.target.value.toUpperCase())}
              placeholder={`Otomatis: ${getDefaultFolderAccessCode(newFolderName || "Mini Bootcamp")}`}
              className="w-full rounded-lg border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2 text-xs font-bold tracking-wider text-[#121215] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-[#9CA3AF] focus:bg-white focus:border-[#4F39F6] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-[#64748B]">
              Siswa yang memasukkan kode ini saat daftar / di portal belajar otomatis mendapatkan semua materi dalam folder ini.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1.5">
              Warna Folder macOS
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {Object.entries(MAC_FOLDER_COLORS).map(([cKey, cVal]) => {
                const isSelected = newFolderColor === cKey;
                return (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => setNewFolderColor(cKey)}
                    title={cVal.name}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[#4F39F6] scale-110 shadow-xs"
                        : "hover:scale-105 border border-black/10"
                    }`}
                    style={{ backgroundColor: cVal.swatchHex }}
                  >
                    {isSelected && (
                      <Check size={13} className="text-white stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
              Warna terpilih:{" "}
              <strong className="text-[#121215]">
                {MAC_FOLDER_COLORS[newFolderColor]?.name || "Biru macOS"}
              </strong>
            </p>
          </div>

          <div className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] p-3 text-xs text-[#5E5E5E] space-y-1">
            <p className="font-semibold text-[#121215]">
              Folder akan dibuat di workspace:{" "}
              <span className="text-[#4F39F6]">{activeProjectName}</span>
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              Setelah folder dibuat, Anda bisa menambahkan kelas, quiz, page, atau memindahkan materi yang sudah ada ke dalamnya.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateFolderModalOpen(false)}
              className="rounded-lg border border-[#EAECEF] px-4 py-2 text-xs font-medium text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white cursor-pointer shadow-xs"
            >
              <FolderPlus size={14} />
              <span>Buat Folder</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal: Pindahkan Materi ke Folder */}
      <ModalDialog
        open={Boolean(moveModalItem)}
        onClose={() => setMoveModalItem(null)}
        titleId="move-to-folder-dialog"
        title={`Pindahkan "${moveModalItem?.title || ""}" ke Folder`}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5E5E5E]">
            Pilih folder tujuan untuk materi ini, atau letakkan kembali di Root workspace:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {/* Root Option */}
            <button
              type="button"
              onClick={() => handleExecuteMoveToFolder(null)}
              className={`w-full flex items-center justify-between rounded-lg p-3 text-left border transition-all cursor-pointer ${
                !moveModalItem?.folderName
                  ? "bg-[#4F39F6]/5 border-[#4F39F6] text-[#4F39F6]"
                  : "bg-white border-[#EAECEF] hover:bg-[#F8F9FB] text-[#121215]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder size={16} className="text-[#9CA3AF]" />
                <div>
                  <p className="text-xs font-bold">Root (Tanpa Folder)</p>
                  <p className="text-[10px] text-[#9CA3AF]">Tampil di halaman utama workspace</p>
                </div>
              </div>
              {!moveModalItem?.folderName && (
                <span className="text-[10px] font-bold text-[#4F39F6]">Saat Ini</span>
              )}
            </button>

            {/* Folder Options */}
            {availableFolders.length === 0 ? (
              <div className="rounded-lg bg-[#F8F9FB] p-4 text-center border border-[#EAECEF]">
                <p className="text-xs text-[#9CA3AF]">Belum ada folder yang dibuat.</p>
                <button
                  type="button"
                  onClick={() => {
                    setMoveModalItem(null);
                    setCreateFolderModalOpen(true);
                  }}
                  className="mt-2 text-xs font-bold text-[#4F39F6] hover:underline"
                >
                  + Buat Folder Baru Dulu
                </button>
              </div>
            ) : (
              availableFolders.map((folder) => {
                const isCurrent =
                  moveModalItem?.folderName?.trim().toLowerCase() ===
                  folder.title.trim().toLowerCase();
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleExecuteMoveToFolder(folder.title)}
                    className={`w-full flex items-center justify-between rounded-lg p-3 text-left border transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#4F39F6]/5 border-[#4F39F6] text-[#4F39F6]"
                        : "bg-white border-[#EAECEF] hover:bg-[#F8F9FB] text-[#121215]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder size={16} className="text-[#4F39F6]" />
                      <div>
                        <p className="text-xs font-bold">{folder.title}</p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {getFolderItemCount(folder.title)} materi di dalam
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-[#4F39F6]">Saat Ini</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setMoveModalItem(null)}
              className="rounded-lg border border-[#EAECEF] px-4 py-2 text-xs font-medium text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Modal: Edit Folder */}
      <ModalDialog
        open={Boolean(editFolderTarget)}
        onClose={() => setEditFolderTarget(null)}
        titleId="edit-folder-dialog"
        title={`Edit Folder: ${editFolderTarget?.title || ""}`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleUpdateFolderSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1">
              Nama Folder <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              placeholder="Contoh: Mini Bootcamp Intensif"
              className="w-full rounded-lg border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1">
              Deskripsi &amp; Info Folder
            </label>
            <textarea
              rows={3}
              value={editFolderDesc}
              onChange={(e) => setEditFolderDesc(e.target.value)}
              placeholder="Keterangan kurikulum atau materi yang ada di dalam folder ini..."
              className="w-full rounded-lg border border-[#EAECEF] bg-[#FFFFFF] px-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] focus:border-[#4F39F6] focus:outline-none resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#121215]">
                Kode Akses Otomatis Folder Series
              </label>
              <button
                type="button"
                onClick={() =>
                  setEditFolderCode(
                    getDefaultFolderAccessCode(editFolderName || "SERIES")
                  )
                }
                className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
              >
                Reset ke Default
              </button>
            </div>
            <input
              type="text"
              value={editFolderCode}
              onChange={(e) => setEditFolderCode(e.target.value.toUpperCase())}
              placeholder={getDefaultFolderAccessCode(editFolderName || "SERIES")}
              className="w-full rounded-lg border border-[#EAECEF] bg-[#F8F9FB] px-3 py-2 text-xs font-bold tracking-wider text-[#121215] uppercase focus:bg-white focus:border-[#4F39F6] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-[#64748B]">
              Bagikan kode ini ke siswa agar bisa membuka seluruh course di folder &ldquo;{editFolderName || "ini"}&rdquo; secara otomatis.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#121215] mb-1.5">
              Warna Folder macOS
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {Object.entries(MAC_FOLDER_COLORS).map(([cKey, cVal]) => {
                const isSelected = editFolderColor === cKey;
                return (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => setEditFolderColor(cKey)}
                    title={cVal.name}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[#4F39F6] scale-110 shadow-xs"
                        : "hover:scale-105 border border-black/10"
                    }`}
                    style={{ backgroundColor: cVal.swatchHex }}
                  >
                    {isSelected && (
                      <Check size={13} className="text-white stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
              Warna terpilih:{" "}
              <strong className="text-[#121215]">
                {MAC_FOLDER_COLORS[editFolderColor]?.name || "Biru macOS"}
              </strong>
            </p>
          </div>

          <div className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] p-3 text-xs text-[#5E5E5E] space-y-1">
            <p className="font-semibold text-[#121215]">
              Informasi Pembaruan
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              Mengubah nama folder otomatis memperbarui tautan seluruh materi dan kelas yang berada di dalamnya serta tersinkronisasi ke database.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setEditFolderTarget(null)}
              className="rounded-lg border border-[#EAECEF] px-4 py-2 text-xs font-medium text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!editFolderName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white cursor-pointer shadow-xs"
            >
              <Edit3 size={14} />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Thumbnail Picker Modal for Content Card */}
      <ThumbnailPickerModal
        open={Boolean(thumbnailTargetItem)}
        onClose={() => setThumbnailTargetItem(null)}
        currentValue={thumbnailTargetItem?.thumbnailUrl}
        onSelectThumbnail={(val) => {
          if (thumbnailTargetItem) {
            updateExplorerItemThumbnail(thumbnailTargetItem.id, val.value);
            setThumbnailTargetItem(null);
            onShowToast(
              `Thumbnail untuk "${thumbnailTargetItem.title}" berhasil diubah.`
            );
          }
        }}
        onRemoveThumbnail={() => {
          if (thumbnailTargetItem) {
            updateExplorerItemThumbnail(thumbnailTargetItem.id, "");
            setThumbnailTargetItem(null);
            onShowToast(
              `Thumbnail untuk "${thumbnailTargetItem.title}" dihapus.`
            );
          }
        }}
        onShowToast={onShowToast}
        title={`Ganti Thumbnail: ${thumbnailTargetItem?.title || ""}`}
      />
    </div>
  );
}
