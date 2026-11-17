"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Upload,
  Search,
  Star,
  Award,
  Eye,
  CheckCircle2,
  Shield,
  Mail,
  Zap,
  Plus,
  Edit3,
  Coins,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { type ExplorerContentItem } from "@/lib/phase2-data";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { OfficialCertificateModal } from "@/components/certificate/OfficialCertificateModal";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";

interface AdminLearnersDirectoryProps {
  onShowToast: (msg: string) => void;
  onOpenCertificateStudio?: () => void;
  currentUser?: AuthenticatedUser | null;
  onUpdateCurrentUserRole?: (newRole: "Learner" | "Mentor" | "Admin") => void;
}

interface DirectoryMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  jobTitle: string;
  cohort: string;
  accessRole: "Learner" | "Mentor" | "Admin";
  assignedCount: number;
  completedChapters: number;
  totalChapters: number;
  avgQuizScore: number;
  points: number;
  credentialId: string;
}

const INITIAL_DIRECTORY_EXTRA: DirectoryMember[] = [
  {
    id: "dir-extra-1",
    name: "Dinur M. Pradipta",
    email: "dinurm.pradipta@gmail.com",
    initials: "DP",
    avatarBg: "#FEF3C7",
    avatarText: "#92400E",
    jobTitle: "Founder & Dev Admin",
    cohort: "Ruang Sosmed Class",
    accessRole: "Admin",
    assignedCount: 0,
    completedChapters: 0,
    totalChapters: 0,
    avgQuizScore: 0,
    points: 0,
    credentialId: "RS2-2026-0001",
  },
];

export function AdminLearnersDirectory({
  onShowToast,
  onOpenCertificateStudio,
  currentUser,
  onUpdateCurrentUserRole,
}: AdminLearnersDirectoryProps) {
  const {
    leaderboard,
    assignees,
    learnerAssignedItems,
    courseSections,
    learnerIsPro,
    learnerSubscriptions,
    toggleStudentProByAdmin,
    cohortProjects,
    registerLearnerProfile,
    workspaceCollaborators,
    updateMemberAccessRole,
    explorerItems,
    assignContentToLearners,
    resolveUserAvatar,
    unassignLearnerFromContent,
  } = useRuangSosmedStore();

  const [cohortFilter, setCohortFilter] = useState("All Cohorts");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [supabaseMembers, setSupabaseMembers] = useState<DirectoryMember[]>([]);
  const [supabaseProMap, setSupabaseProMap] = useState<Record<string, "PRO" | "Free">>({});

  // Manual Points Adjustment State
  const [adjustPointsTarget, setAdjustPointsTarget] = useState<DirectoryMember | null>(null);
  const [adjustPointsMode, setAdjustPointsMode] = useState<"add" | "set">("add");
  const [adjustPointsValue, setAdjustPointsValue] = useState<number>(100);
  const [adjustPointsReason, setAdjustPointsReason] = useState<string>("Bonus Keaktifan");
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);

  // Local state for role overrides & newly invited students
  const [roleOverrides, setRoleOverrides] = useState<
    Record<string, "Learner" | "Mentor" | "Admin">
  >(() => {
    const initial: Record<string, "Learner" | "Mentor" | "Admin"> = {};
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith("ruang_sosmed_role_override_")) {
            const rawRole = window.localStorage.getItem(k);
            if (rawRole === "Learner" || rawRole === "Mentor" || rawRole === "Admin") {
              const targetKey = k.replace("ruang_sosmed_role_override_", "").trim().toLowerCase();
              initial[targetKey] = rawRole;
            }
          }
        }
      } catch {}
    }
    return initial;
  });
  const [invitedMembers, setInvitedMembers] = useState<DirectoryMember[]>(
    INITIAL_DIRECTORY_EXTRA
  );

  // Fetch registered learners directly from Supabase (`profiles` & `user_profiles`)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadSupabaseDirectory = async () => {
      try {
        const [profilesRes, userProfilesRes, enrollmentsRes, submissionsRes] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("user_profiles")
              .select("*")
              .order("updated_at", { ascending: false }),
            supabase
              .from("enrollments")
              .select("learner_id, completed_chapter_ids, progress_percent"),
            supabase
              .from("submissions")
              .select("learner_id, score_percent"),
          ]);

        const merged: DirectoryMember[] = [];
        const totalChCount = courseSections.flatMap((s) => s.chapters).length;

        if (Array.isArray(profilesRes.data)) {
          profilesRes.data.forEach((p: any, idx: number) => {
            if (!p.email) return;
            const isOwner =
              p.email.toLowerCase().includes("dinur") ||
              p.email.toLowerCase() === "admin@ruangsosmed.id";
            if (isOwner) return;

            const name = p.full_name || p.email.split("@")[0];
            const initials =
              name
                .split(" ")
                .filter(Boolean)
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "LN";

            const rawDbRole: "Admin" | "Mentor" | "Learner" =
              p.role === "admin"
                ? "Admin"
                : p.role === "mentor"
                ? "Mentor"
                : "Learner";

            const userEnrollments = Array.isArray(enrollmentsRes.data)
              ? enrollmentsRes.data.filter((e: any) => e.learner_id === p.id)
              : [];
            const userSubmissions = Array.isArray(submissionsRes.data)
              ? submissionsRes.data.filter((s: any) => s.learner_id === p.id)
              : [];

            let completedCh = 0;
            userEnrollments.forEach((e: any) => {
              if (Array.isArray(e.completed_chapter_ids)) {
                completedCh += e.completed_chapter_ids.length;
              }
            });

            let avgQuiz = 0;
            if (userSubmissions.length > 0) {
              const totalScore = userSubmissions.reduce(
                (acc: number, curr: any) =>
                  acc + (Number(curr.score_percent) || 0),
                0
              );
              avgQuiz = Math.round(totalScore / userSubmissions.length);
            }

            merged.push({
              id: p.id || `sb-prof-${idx}`,
              name,
              email: p.email,
              initials,
              avatarUrl:
                typeof p.avatar_url === "string" && p.avatar_url.trim()
                  ? p.avatar_url.trim()
                  : undefined,
              avatarBg: "#EEF2FF",
              avatarText: "#4F39F6",
              jobTitle: p.job_title || (rawDbRole === "Admin" ? "Admin Collaborator" : rawDbRole === "Mentor" ? "Mentor Collaborator" : "Social Media Specialist"),
              cohort: "Batch Oktober 2026",
              accessRole: rawDbRole,
              assignedCount: learnerAssignedItems.length,
              completedChapters: completedCh,
              totalChapters: totalChCount,
              avgQuizScore: avgQuiz,
              points: Number(p.total_points || 0),
              credentialId: `RS2-2026-850${idx + 1}`,
            });
          });
        }

        if (Array.isArray(userProfilesRes.data)) {
          const nextProMap: Record<string, "PRO" | "Free"> = {};
          userProfilesRes.data.forEach((up: any, idx: number) => {
            if (!up.email) return;
            const name = up.name || up.username || up.email.split("@")[0];
            const tierVal: "PRO" | "Free" = up.perks?.is_pro ? "PRO" : "Free";
            nextProMap[name] = tierVal;
            nextProMap[name.toLowerCase()] = tierVal;
            nextProMap[up.email.toLowerCase()] = tierVal;
            const isOwner =
              up.username === "dinur" ||
              up.username === "admin" ||
              up.email.toLowerCase().includes("dinur") ||
              up.email.toLowerCase() === "admin@ruangsosmed.id";
            if (isOwner) return;

            if (
              merged.some(
                (m) => m.email.toLowerCase() === up.email.toLowerCase()
              )
            ) {
              return;
            }

            const initials =
              name
                .split(" ")
                .filter(Boolean)
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "LN";

            const rawUpRole: "Admin" | "Mentor" | "Learner" =
              up.role === "admin"
                ? "Admin"
                : up.role === "mentor"
                ? "Mentor"
                : "Learner";

            merged.push({
              id: `sb-uprof-${up.username || idx}`,
              name,
              email: up.email,
              initials,
              avatarUrl:
                typeof up.avatar_url === "string" && up.avatar_url.trim()
                  ? up.avatar_url.trim()
                  : undefined,
              avatarBg: "#EEF2FF",
              avatarText: "#4F39F6",
              jobTitle: up.job_title || (rawUpRole === "Admin" ? "Admin Collaborator" : rawUpRole === "Mentor" ? "Mentor Collaborator" : "Social Media Specialist"),
              cohort: "Batch Oktober 2026",
              accessRole: rawUpRole,
              assignedCount: learnerAssignedItems.length,
              completedChapters: 0,
              totalChapters: totalChCount,
              avgQuizScore: 0,
              points: 0,
              credentialId: `RS2-2026-860${idx + 1}`,
            });
          });
          setSupabaseProMap(nextProMap);
        }

        setSupabaseMembers(merged);
      } catch {
        // Ignore fetch errors
      }
    };

    void loadSupabaseDirectory();

    const intervalId = window.setInterval(() => {
      void loadSupabaseDirectory();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [courseSections, learnerAssignedItems.length]);

  // Invite Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCohort, setInviteCohort] = useState("Batch Oktober 2026");
  const [inviteRole, setInviteRole] = useState<"Learner" | "Mentor" | "Admin">(
    "Learner"
  );

  // Available learning materials for initial assignment during student registration
  const availableMaterials: ExplorerContentItem[] = useMemo(() => {
    return (explorerItems || []).filter(
      (item: ExplorerContentItem) => item.type !== "Folder" && !item.isArchived
    );
  }, [explorerItems]);

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  const handleOpenInviteModal = () => {
    // Pre-select all available materials by default for convenience, admin can uncheck/customize
    setSelectedMaterialIds(availableMaterials.map((m: ExplorerContentItem) => m.id));
    setInviteModalOpen(true);
  };

  // Portfolio Inspector Modal state
  const [inspectedMember, setInspectedMember] =
    useState<DirectoryMember | null>(null);
  const [profileTab, setProfileTab] = useState<"activity" | "assigned" | "review">("activity");
  const [certificateMember, setCertificateMember] =
    useState<DirectoryMember | null>(null);

  // List of materials assigned to the currently inspected member
  const memberAssignedItems = useMemo(() => {
    if (!inspectedMember) return [];
    const emailKey = (inspectedMember.email || "").toLowerCase().trim();
    const nameKey = (inspectedMember.name || "").toLowerCase().trim();
    const nameParts = nameKey.split(" ").filter(Boolean);
    const firstLast =
      nameParts.length >= 3
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
        : "";
    const cohortWildcards = new Set([
      "all learners",
      "batch oktober 2026",
      "ruang sosmed class",
      "creator growth lab",
    ]);

    return (explorerItems || []).filter((exp: ExplorerContentItem) => {
      if (exp.type === "Folder") return false;
      const assignedList = Array.isArray(exp.assignedLearners)
        ? exp.assignedLearners
        : [];
      if (assignedList.length === 0) return false;
      return assignedList.some((entry) => {
        const norm = String(entry || "").toLowerCase().trim();
        if (!norm) return false;
        if (cohortWildcards.has(norm)) return true;
        if (emailKey && norm === emailKey) return true;
        if (nameKey && norm === nameKey) return true;
        if (firstLast && norm === firstLast) return true;
        return false;
      });
    });
  }, [inspectedMember, explorerItems]);

  const handleRevokeMemberAccess = (
    member: DirectoryMember,
    contentId: string,
    contentTitle: string
  ) => {
    unassignLearnerFromContent(contentTitle, {
      id: member.id,
      name: member.name,
      email: member.email,
    });
    // Also trigger Supabase unassign if configured
    if (isSupabaseConfigured && member.id && contentId) {
      import("@/lib/supabase/services").then(({ enrollmentsService }) => {
        enrollmentsService.unassignLearner(contentId, member.id).catch(() => {});
      });
    }
    onShowToast(`Akses ke "${contentTitle}" untuk ${member.name} berhasil dicabut & otomatis hilang dari halaman siswa.`);
  };

  const currentTargetPoints = adjustPointsTarget ? adjustPointsTarget.points : 0;
  const finalCalculatedPoints =
    adjustPointsMode === "add"
      ? Math.max(0, currentTargetPoints + (Number(adjustPointsValue) || 0))
      : Math.max(0, Number(adjustPointsValue) || 0);

  const handleSaveAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPointsTarget) return;

    setIsAdjustingPoints(true);
    const newPoints = finalCalculatedPoints;
    try {
      if (isSupabaseConfigured && adjustPointsTarget.email) {
        const { error } = await supabase
          .from("profiles")
          .update({ total_points: newPoints })
          .ilike("email", adjustPointsTarget.email);

        if (error) {
          console.error("Supabase points update error:", error);
        }
      }

      // Update local Supabase directory state immediately
      setSupabaseMembers((prev) =>
        prev.map((m) =>
          m.email.toLowerCase() === adjustPointsTarget.email.toLowerCase() ||
          m.name.toLowerCase() === adjustPointsTarget.name.toLowerCase()
            ? { ...m, points: newPoints }
            : m
        )
      );

      // Also update inspected member if currently open
      if (
        inspectedMember &&
        (inspectedMember.email.toLowerCase() === adjustPointsTarget.email.toLowerCase() ||
          inspectedMember.name.toLowerCase() === adjustPointsTarget.name.toLowerCase())
      ) {
        setInspectedMember((prev) => (prev ? { ...prev, points: newPoints } : null));
      }

      // Simpan pending notification & dispatch event perayaan agar Learner Portal langsung memunculkan popup
      const diff =
        adjustPointsMode === "add"
          ? adjustPointsValue
          : Math.max(0, newPoints - currentTargetPoints);

      if (typeof window !== "undefined") {
        try {
          const targetKey = adjustPointsTarget.email.toLowerCase().trim();
          const pendingKey = `ruang_sosmed_pending_notif_${targetKey}`;
          const notifPayload = {
            id: `pts-award-${Date.now()}`,
            title: `⭐ +${diff.toLocaleString()} Poin Bintang Diterima!`,
            body: `Admin telah memberikan poin (Alasan: ${adjustPointsReason}). Total saldo Anda sekarang: ${newPoints.toLocaleString()} pts.`,
            addedPoints: diff,
            newTotal: newPoints,
            learnerEmail: adjustPointsTarget.email,
            learnerName: adjustPointsTarget.name,
            reason: adjustPointsReason,
            timestamp: Date.now(),
          };
          window.localStorage.setItem(pendingKey, JSON.stringify(notifPayload));

          // Also trigger general pending notif if learner is logged in
          const rawSess = window.localStorage.getItem("ruang_sosmed_session_user_v1");
          if (rawSess) {
            const parsedSess = JSON.parse(rawSess);
            if (
              parsedSess?.email &&
              parsedSess.email.toLowerCase().trim() === targetKey
            ) {
              window.localStorage.setItem(
                "ruang_sosmed_active_points_popup",
                JSON.stringify(notifPayload)
              );
            }
          }
        } catch {}

        window.dispatchEvent(
          new CustomEvent("ruang_sosmed_points_awarded", {
            detail: {
              addedPoints: diff,
              newTotal: newPoints,
              learnerEmail: adjustPointsTarget.email,
              learnerName: adjustPointsTarget.name,
              reason: adjustPointsReason,
            },
          })
        );
      }

      onShowToast(
        `⭐ Poin ${adjustPointsTarget.name} berhasil diatur ke ${newPoints.toLocaleString()} pts (${
          adjustPointsMode === "add"
            ? `${adjustPointsValue >= 0 ? "+" : ""}${adjustPointsValue}`
            : `Set ${newPoints}`
        }).`
      );
      setAdjustPointsTarget(null);
    } catch (err: any) {
      onShowToast(`Gagal menyimpan poin: ${err.message || "Error"}`);
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  // Build unified directory from Supabase profiles + live store assignees + invited members
  const totalCourseChapters = courseSections.flatMap((s) => s.chapters).length;

  const storeMembers: DirectoryMember[] = assignees.map((asg, idx) => {
    const lbMatch = leaderboard.find(
      (l) => l.name.toLowerCase() === asg.name.toLowerCase()
    );
    const sbMatch = supabaseMembers.find(
      (s) => s.name.toLowerCase() === asg.name.toLowerCase()
    );
    const slug = asg.name.toLowerCase().replace(/[^a-z0-9]/g, ".");
    return {
      id: asg.id,
      name: asg.name,
      email: sbMatch?.email ?? `${slug}@ruangsosmed.id`,
      initials: asg.initials,
      avatarBg: asg.avatarBg,
      avatarText: asg.avatarText,
      jobTitle: sbMatch?.jobTitle ?? lbMatch?.role ?? `${asg.roleBadge} Specialist`,
      cohort: sbMatch?.cohort ?? "Batch Oktober 2026",
      accessRole: roleOverrides[asg.id] ?? "Learner",
      assignedCount: learnerAssignedItems.length,
      completedChapters: asg.completedChapters,
      totalChapters: totalCourseChapters,
      avgQuizScore: 0,
      points: lbMatch?.points ?? sbMatch?.points ?? 0,
      credentialId: `RS2-2026-849${idx + 2}`,
    };
  });

  const nonDuplicateSupabaseMembers = supabaseMembers.filter(
    (sb) =>
      !storeMembers.some(
        (sm) =>
          sm.email.toLowerCase() === sb.email.toLowerCase() ||
          sm.name.toLowerCase() === sb.name.toLowerCase()
      )
  );

  const collabDirectoryMembers: DirectoryMember[] = (
    workspaceCollaborators || []
  )
    .filter(
      (c) =>
        c.email.toLowerCase() !== "dinur@ruangsosmed.id" &&
        !storeMembers.some(
          (sm) => sm.name.toLowerCase() === c.name.toLowerCase()
        )
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      initials: c.initials,
      avatarBg: c.avatarBg,
      avatarText: c.avatarText,
      jobTitle: `${c.role} Collaborator`,
      cohort: c.cohort,
      accessRole: (c.role as "Admin" | "Mentor" | "Learner") || "Admin",
      assignedCount: learnerAssignedItems.length,
      completedChapters: 0,
      totalChapters: totalCourseChapters,
      avgQuizScore: 100,
      points: 500,
      credentialId: `RS2-COLLAB-${c.initials}`,
    }));

  // Gabungkan seluruh sumber data dan satukan (deduplicate & merge) akun yang memiliki email sama
  const rawList = [
    ...collabDirectoryMembers,
    ...nonDuplicateSupabaseMembers,
    ...storeMembers,
    ...invitedMembers,
  ];

  const mergedByEmail = new Map<string, DirectoryMember>();

  rawList.forEach((m) => {
    const key = (m.email || m.name).toLowerCase().trim();
    const existing = mergedByEmail.get(key);

    const mKey = (m.email || m.name || m.id).toLowerCase().trim();
    const mEmailKey = (m.email || "").toLowerCase().trim();
    const mNameKey = (m.name || "").toLowerCase().trim();
    const mOverride =
      roleOverrides[mKey] ||
      roleOverrides[mEmailKey] ||
      roleOverrides[mNameKey] ||
      roleOverrides[m.id];

    if (!existing) {
      const initialRole = mOverride || m.accessRole;
      const initialJob =
        m.email?.toLowerCase().includes("dinur")
          ? "Founder & Dev Admin"
          : initialRole === "Admin"
          ? "Admin Collaborator"
          : initialRole === "Mentor"
          ? "Mentor Collaborator"
          : m.jobTitle.includes("Collaborator")
          ? "Social Media Specialist"
          : m.jobTitle;

      mergedByEmail.set(key, {
        ...m,
        accessRole: initialRole,
        jobTitle: initialJob,
      });
      return;
    }

    // Explicit admin override always takes precedence over automatic merge
    const existingOverride =
      roleOverrides[key] ||
      roleOverrides[existing.email?.toLowerCase().trim() || ""] ||
      roleOverrides[existing.name?.toLowerCase().trim() || ""] ||
      roleOverrides[existing.id];

    const activeOverride = mOverride || existingOverride;

    const rolePriority: Record<string, number> = { Admin: 3, Mentor: 2, Learner: 1 };
    const currentRole = mOverride ?? m.accessRole;
    const existingRole = existingOverride ?? existing.accessRole;
    const resolvedRole =
      activeOverride ||
      ((rolePriority[currentRole] || 1) >= (rolePriority[existingRole] || 1)
        ? currentRole
        : existingRole);

    const preferredName =
      m.name.trim().length >= existing.name.trim().length
        ? m.name.trim()
        : existing.name.trim();

    const preferredInitials =
      m.name.trim().length >= existing.name.trim().length
        ? m.initials
        : existing.initials;

    const preferredCohort =
      m.cohort !== "Batch Oktober 2026" ? m.cohort : existing.cohort;

    const resolvedJob =
      m.email?.toLowerCase().includes("dinur") || existing.email?.toLowerCase().includes("dinur")
        ? "Founder & Dev Admin"
        : resolvedRole === "Admin"
        ? "Admin Collaborator"
        : resolvedRole === "Mentor"
        ? "Mentor Collaborator"
        : "Social Media Specialist";

    const sbMatch = supabaseMembers.find(
      (s) =>
        s.email.toLowerCase() === key ||
        s.name.toLowerCase() === key
    );

    const actualAssignedCount = (explorerItems || []).filter((exp) => {
      if (exp.type === "Folder") return false;
      const list = exp.assignedLearners || [];
      if (list.length === 0) return false;
      return list.some((entry) => {
        const norm = String(entry || "").toLowerCase().trim();
        return (
          norm === "all learners" ||
          norm === "batch oktober 2026" ||
          norm === "ruang sosmed class" ||
          norm === "creator growth lab" ||
          (key && norm === key) ||
          (preferredName && norm === preferredName.toLowerCase()) ||
          (existing.email && norm === existing.email.toLowerCase())
        );
      });
    }).length;

    mergedByEmail.set(key, {
      ...existing,
      ...m,
      name: preferredName,
      initials: preferredInitials,
      assignedCount: actualAssignedCount,
      avatarUrl:
        resolveUserAvatar(m.email, existing.email, preferredName, m.id) ||
        sbMatch?.avatarUrl ||
        m.avatarUrl ||
        existing.avatarUrl,
      jobTitle: resolvedJob,
      accessRole: resolvedRole,
      cohort: preferredCohort,
      points: sbMatch ? sbMatch.points : Math.max(existing.points || 0, m.points || 0),
      completedChapters: sbMatch && sbMatch.completedChapters > 0
        ? sbMatch.completedChapters
        : Math.max(existing.completedChapters || 0, m.completedChapters || 0),
      avgQuizScore: sbMatch && sbMatch.avgQuizScore > 0
        ? sbMatch.avgQuizScore
        : Math.max(existing.avgQuizScore || 0, m.avgQuizScore || 0),
    });
  });

  const allDirectoryMembers = Array.from(mergedByEmail.values());

  const filteredMembers = allDirectoryMembers.filter((m) => {
    if (cohortFilter !== "All Cohorts" && m.cohort !== cohortFilter) {
      return false;
    }
    if (roleFilter !== "All Roles" && m.accessRole !== roleFilter) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !m.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !m.cohort.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleRoleChange = async (
    member: DirectoryMember,
    nextRole: "Learner" | "Mentor" | "Admin"
  ) => {
    const key = (member.email || member.name || member.id).toLowerCase().trim();
    const emailKey = (member.email || "").toLowerCase().trim();
    const idKey = member.id;
    const nameKey = (member.name || "").toLowerCase().trim();
    const firstName = nameKey.split(" ")[0];

    // 1. Update local state immediately so UI updates with 0 latency
    setRoleOverrides((prev) => ({
      ...prev,
      [key]: nextRole,
      [emailKey]: nextRole,
      [idKey]: nextRole,
      [nameKey]: nextRole,
    }));

    // 2. Persist to localStorage across all alias keys
    const allAliases = Array.from(
      new Set(
        [
          key,
          emailKey,
          idKey,
          nameKey,
          firstName,
          emailKey.includes("afterlance") || nameKey.includes("allisha") ? "afterlance@gmail.com" : null,
          emailKey.includes("afterlance") || nameKey.includes("allisha") ? "allisha fathya" : null,
          emailKey.includes("afterlance") || nameKey.includes("allisha") ? "allisha" : null,
        ].filter(Boolean) as string[]
      )
    );

    if (typeof window !== "undefined") {
      try {
        allAliases.forEach((alias) => {
          window.localStorage.setItem(`ruang_sosmed_role_override_${alias}`, nextRole);
        });

        // Also sync active session user if matches this member
        const rawSession = window.localStorage.getItem("ruang_sosmed_session_user_v1");
        if (rawSession) {
          const s = JSON.parse(rawSession);
          const sEmail = (s.email || "").toLowerCase().trim();
          const sName = (s.name || "").toLowerCase().trim();
          const sUsername = (s.username || "").toLowerCase().trim();
          const isSessionMatch =
            (sEmail && (sEmail === emailKey || emailKey.includes(sEmail) || sEmail.includes(emailKey))) ||
            (sName && (sName === nameKey || nameKey.includes(sName) || sName.includes(nameKey))) ||
            (sUsername && (emailKey.includes(sUsername) || nameKey.includes(sUsername))) ||
            ((sEmail.includes("afterlance") || sName.includes("allisha")) &&
              (emailKey.includes("afterlance") || nameKey.includes("allisha")));

          if (isSessionMatch) {
            s.role = nextRole === "Learner" ? "learner" : "admin";
            window.localStorage.setItem(
              "ruang_sosmed_session_user_v1",
              JSON.stringify(s)
            );
            window.localStorage.setItem(
              "ruang_sosmed_role_mode_v1",
              nextRole === "Learner" ? "learner" : "admin"
            );
          }
        }

        // Live broadcast across open browser tabs & windows
        if ("BroadcastChannel" in window) {
          try {
            const bc = new BroadcastChannel("ruang_sosmed_channel");
            bc.postMessage({
              type: "ROLE_OVERRIDE_BROADCAST",
              targetEmail: member.email,
              targetName: member.name,
              nextRole: nextRole,
            });
            setTimeout(() => bc.close(), 300);
          } catch {}
        }

        window.dispatchEvent(
          new CustomEvent("ruang_sosmed_role_updated", {
            detail: { target: member, nextRole },
          })
        );
        window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
        window.dispatchEvent(new Event("ruang_sosmed_role_mode_changed"));
        window.dispatchEvent(new Event("storage"));
      } catch {}
    }

    // 3. Notify parent app if current active user is demoted or changed
    const isTargetCurrentUser = Boolean(
      currentUser &&
        ((currentUser.email && emailKey && currentUser.email.toLowerCase().trim() === emailKey) ||
         (currentUser.name && nameKey && currentUser.name.toLowerCase().trim() === nameKey) ||
         (currentUser.name && nameKey && (nameKey.includes(currentUser.name.toLowerCase().trim()) || currentUser.name.toLowerCase().trim().includes(nameKey))) ||
         (currentUser.username && emailKey && emailKey.includes(currentUser.username.toLowerCase().trim())) ||
         ((currentUser.name?.toLowerCase().includes("allisha") || currentUser.email?.toLowerCase().includes("afterlance")) &&
          (nameKey.includes("allisha") || emailKey.includes("afterlance"))))
    );

    if (isTargetCurrentUser && onUpdateCurrentUserRole) {
      onUpdateCurrentUserRole(nextRole);
    }

    // 4. Persist to RuangSosmedStore and Supabase
    try {
      await updateMemberAccessRole(member.email || member.name || member.id, nextRole);
    } catch {
      // ignore
    }

    onShowToast(
      `Updated access role for ${member.name} to "${nextRole}" in Ruang Sosmed 2.0.`
    );
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = inviteName.trim();
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedName || !trimmedEmail) return;

    const initials = trimmedName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newMember: DirectoryMember = {
      id: `invited-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      initials: initials || "RS",
      avatarBg: "#EEF2FF",
      avatarText: "#4F39F6",
      jobTitle: "Social Media Specialist",
      cohort: inviteCohort,
      accessRole: inviteRole,
      assignedCount: selectedMaterialIds.length,
      completedChapters: 0,
      totalChapters: totalCourseChapters,
      avgQuizScore: 0,
      points: 0,
      credentialId: `RS2-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    if (inviteRole === "Learner") {
      registerLearnerProfile({
        name: trimmedName,
        email: trimmedEmail,
        jobTitle: "Social Media Specialist",
      });
    }

    // Assign selected materials to this student
    if (selectedMaterialIds.length > 0) {
      selectedMaterialIds.forEach((matId) => {
        const mat = availableMaterials.find((m: ExplorerContentItem) => m.id === matId);
        if (mat) {
          assignContentToLearners(
            mat,
            [trimmedName, trimmedEmail],
            "2026-11-30",
            "Individual"
          );
        }
      });
    }

    // Persist assigned material IDs for this user
    try {
      if (typeof window !== "undefined") {
        const keyEmail = trimmedEmail.toLowerCase().trim();
        const keyName = trimmedName.toLowerCase().trim();
        const assignedJson = JSON.stringify(selectedMaterialIds);
        window.localStorage.setItem(`ruang_sosmed_user_assignments_${keyEmail}`, assignedJson);
        window.localStorage.setItem(`ruang_sosmed_user_assignments_${keyName}`, assignedJson);
        window.localStorage.setItem(`ruang_sosmed_user_cohort_${keyEmail}`, inviteCohort);
        window.localStorage.setItem(`ruang_sosmed_user_cohort_${keyName}`, inviteCohort);
      }
    } catch {}

    setInvitedMembers((prev) => [newMember, ...prev]);
    setInviteName("");
    setInviteEmail("");
    setInviteModalOpen(false);
    onShowToast(
      `Invited ${trimmedName} (${trimmedEmail}) to ${inviteCohort} dengan ${selectedMaterialIds.length} materi yang di-assign.`
    );
  };

  const handleCsvBatchImport = () => {
    const batchStudents: DirectoryMember[] = [
      {
        id: `csv-1-${Date.now()}`,
        name: "Alya Zahra",
        email: "alya.zahra@creatorlab.id",
        initials: "AZ",
        avatarBg: "#FDF2F8",
        avatarText: "#DB2777",
        jobTitle: "TikTok Growth Strategist",
        cohort: cohortProjects[0]?.name || "Ruang Sosmed Class",
        accessRole: "Learner",
        assignedCount: learnerAssignedItems.length,
        completedChapters: 0,
        totalChapters: totalCourseChapters,
        avgQuizScore: 0,
        points: 0,
        credentialId: "RS2-2026-9104",
      },
      {
        id: `csv-2-${Date.now()}`,
        name: "Reza Mahendra",
        email: "reza.mahendra@agency.id",
        initials: "RM",
        avatarBg: "#ECFDF5",
        avatarText: "#059669",
        jobTitle: "Paid Social Buyer",
        cohort: cohortProjects[1]?.name || cohortProjects[0]?.name || "Ruang Sosmed Class",
        accessRole: "Learner",
        assignedCount: learnerAssignedItems.length,
        completedChapters: 0,
        totalChapters: totalCourseChapters,
        avgQuizScore: 0,
        points: 0,
        credentialId: "RS2-2026-9105",
      },
    ];
    batchStudents.forEach((s) =>
      registerLearnerProfile({
        name: s.name,
        email: s.email,
        jobTitle: s.jobTitle,
      })
    );
    setInvitedMembers((prev) => [...batchStudents, ...prev]);
    setInviteModalOpen(false);
    onShowToast(
      "Imported 2 cohort learners from CSV into Ruang Sosmed 2.0 Directory."
    );
  };

  return (
    <div className="w-full px-4 sm:px-5 pt-5 pb-14 space-y-6">
      {/* Header Row */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6] mb-1.5">
            <Users size={12} />
            <span>Cohort &amp; Access Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121215]">
            Learners &amp; Cohort Directory
          </h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">
            Manage student cohorts, invite learners via email/CSV, inspect
            individual portfolios, and configure access roles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
          >
            <Upload size={14} className="text-[#4F39F6]" />
            <span>Import CSV Roster</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInviteModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,57,246,0.25)] transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            <span>+ Invite Student</span>
          </button>
        </div>
      </header>

      {/* Cohort Summary Strip (Compact Filter Bar) */}
      <section
        aria-label="Cohort Batches Overview"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-semibold text-[#5E5E5E] mr-1">
          Cohort:
        </span>
        {[
          {
            name: "All Cohorts",
            count: allDirectoryMembers.length,
            accent: "#4F39F6",
          },
          ...(cohortProjects || []).map((cp) => ({
            name: cp.name,
            count: allDirectoryMembers.filter(
              (m) => m.cohort?.toLowerCase() === cp.name.toLowerCase()
            ).length,
            accent: cp.color,
          })),
        ].map((batch) => {
          const isSelected = cohortFilter === batch.name;
          return (
            <button
              key={batch.name}
              type="button"
              onClick={() => setCohortFilter(batch.name)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#FFFFFF] border-[#4F39F6] text-[#4F39F6] shadow-2xs ring-1 ring-[#4F39F6]/30 font-bold"
                  : "bg-[#FFFFFF] border-[#EAECEF] text-[#5E5E5E] hover:text-[#121215] hover:border-[#D1D5DB]"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: batch.accent }}
              />
              <span>{batch.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected
                    ? "bg-[#EEF2FF] text-[#4F39F6]"
                    : "bg-[#F8F9FB] text-[#71717A] border border-[#EAECEF]"
                }`}
              >
                {batch.count}
              </span>
            </button>
          );
        })}
      </section>

      {/* Filter & Search Toolbar + Responsive Learners Directory Table */}
      <section className="rounded-xl bg-[#FFFFFF] p-6 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, email, or cohort..."
              aria-label="Search learners directory"
              className="w-full rounded-lg bg-[#F8F9FB] pl-8 pr-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#5E5E5E]">
              Access Role:
            </span>
            {(["All Roles", "Learner", "Mentor", "Admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === r
                    ? "bg-[#4F39F6] text-white"
                    : "bg-[#F8F9FB] text-[#5E5E5E] hover:text-[#121215] border border-[#EAECEF]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table per modern-web-guidance */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Ruang Sosmed 2.0 Learners Directory"
          className="table-wrapper"
        >
          <table
            style={
              {
                "--label-2": '"Cohort Batch"',
                "--label-3": '"Assigned Progress"',
                "--label-4": '"Points & Quiz Avg"',
                "--label-5": '"Access Role"',
                "--label-6": '"Portfolio"',
              } as React.CSSProperties
            }
          >
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#F8F9FB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <th className="py-3 px-4 rounded-tl-lg">Student / Member</th>
                <th className="py-3 px-4">Cohort Batch</th>
                <th className="py-3 px-4">Assigned Progress</th>
                <th className="py-3 px-4">Points &amp; Quiz Avg</th>
                <th className="py-3 px-4">Access Role</th>
                <th className="py-3 px-4 text-right rounded-tr-lg">
                  Portfolio &amp; Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 px-4 text-center text-xs text-[#5E5E5E]"
                  >
                    <div className="space-y-2">
                      <p className="font-bold text-[#121215]">
                        No learners match your current search or cohort filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCohortFilter("All Cohorts");
                          setRoleFilter("All Roles");
                          setSearchQuery("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-3 py-1.5 text-xs font-semibold text-[#4F39F6] border border-[#EAECEF] cursor-pointer"
                      >
                        Reset Directory Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                const pct =
                  member.totalChapters > 0
                    ? Math.round(
                        (member.completedChapters / member.totalChapters) * 100
                      )
                    : 0;
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-[#F8F9FB]/80 transition-colors"
                  >
                    <th
                      scope="row"
                      className="py-3.5 px-4 font-semibold text-[#121215] text-left"
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const memberAvatar =
                            resolveUserAvatar(member.email, member.name, member.id) ||
                            member.avatarUrl;
                          if (memberAvatar) {
                            return (
                              <img
                                src={memberAvatar}
                                alt={member.name}
                                className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#E2E8F0]"
                              />
                            );
                          }
                          return (
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: member.avatarBg,
                                color: member.avatarText,
                              }}
                            >
                              {member.initials}
                            </span>
                          );
                        })()}
                        <div>
                          <p className="font-bold text-[#121215]">
                            {member.name}
                          </p>
                          <p className="text-[11px] font-normal text-[#5E5E5E]">
                            {member.email} • {member.jobTitle}
                          </p>
                        </div>
                      </div>
                    </th>

                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#121215]">
                        {member.cohort}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 h-2 rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#4F39F6]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[#121215] tabular-nums">
                          {member.completedChapters}/{member.totalChapters} ({pct}
                          %)
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustPointsTarget(member);
                            setAdjustPointsMode("add");
                            setAdjustPointsValue(100);
                            setAdjustPointsReason("Bonus Keaktifan");
                          }}
                          title={`Klik untuk ubah / tambah poin manual untuk ${member.name}`}
                          className="group/pts inline-flex items-center gap-1 font-bold text-[#B45309] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] border border-[#F59E0B]/30 hover:border-[#F59E0B]/60 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs"
                        >
                          <Star
                            size={12}
                            className="text-[#F59E0B]"
                            fill="#F59E0B"
                          />
                          <span className="tabular-nums">{member.points.toLocaleString()}</span>
                          <Edit3
                            size={10}
                            className="text-[#B45309] opacity-40 group-hover/pts:opacity-100 transition-opacity ml-0.5"
                          />
                        </button>
                        <span className="text-[#9CA3AF]">•</span>
                        <span className="font-semibold text-[#059669]">
                          {member.avgQuizScore}% avg
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5">
                        <Shield size={12} className="text-[#4F39F6]" />
                        <select
                          aria-label={`Access role for ${member.name}`}
                          value={member.accessRole}
                          onChange={(e) =>
                            handleRoleChange(
                              member,
                              e.target.value as "Learner" | "Mentor" | "Admin"
                            )
                          }
                          className="rounded-md bg-[#F8F9FB] px-2 py-1 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
                        >
                          <option value="Learner">Learner</option>
                          <option value="Mentor">Mentor</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {member.accessRole === "Learner" && (() => {
                          const emailKey = member.email.toLowerCase();
                          const resolvedTier =
                            learnerSubscriptions?.[emailKey] ??
                            learnerSubscriptions?.[member.name] ??
                            supabaseProMap[emailKey] ??
                            supabaseProMap[member.name] ??
                            "Free";
                          const isMemberPro = resolvedTier === "PRO";
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                toggleStudentProByAdmin(member.name, member.email);
                                setSupabaseProMap((prev) => ({
                                  ...prev,
                                  [member.name]: isMemberPro ? "Free" : "PRO",
                                  [emailKey]: isMemberPro ? "Free" : "PRO",
                                }));
                                onShowToast(
                                  `Updated ${member.name} subscription to ${
                                    isMemberPro ? "Free Tier" : "Learner PRO"
                                  }.`
                                );
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                                isMemberPro
                                  ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/40 hover:bg-[#FDE68A]"
                                  : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF] hover:border-[#F59E0B] hover:text-[#B45309]"
                              }`}
                            >
                              <Zap size={12} fill="currentColor" />
                              <span>
                                {isMemberPro ? "PRO Member" : "Free • Set PRO"}
                              </span>
                            </button>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => setInspectedMember(member)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Inspect Portfolio</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal 1: Invite Student via Email / CSV Upload */}
      <ModalDialog
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        titleId="invite-learner-modal-title"
        title="Invite Students to Ruang Sosmed 2.0"
        subtitle="Add an individual student by email or batch-import a cohort CSV roster."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-student-name"
              className="block text-xs font-semibold text-[#121215] mb-1"
            >
              Student Full Name
            </label>
            <input
              id="invite-student-name"
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g., Putri Maharani"
              className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="invite-student-email"
              className="block text-xs font-semibold text-[#121215] mb-1"
            >
              Email Address
            </label>
            <input
              id="invite-student-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="putri.maharani@brand.id"
              className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="invite-student-cohort"
                className="block text-xs font-semibold text-[#121215] mb-1"
              >
                Assign Cohort Batch
              </label>
              <select
                id="invite-student-cohort"
                value={inviteCohort}
                onChange={(e) => setInviteCohort(e.target.value)}
                className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
              >
                {(cohortProjects || []).map((cp) => (
                  <option key={cp.id || cp.name} value={cp.name}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-student-role"
                className="block text-xs font-semibold text-[#121215] mb-1"
              >
                Access Role
              </label>
              <select
                id="invite-student-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(
                    e.target.value as "Learner" | "Mentor" | "Admin"
                  )
                }
                className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#121215] border border-[#EAECEF]"
              >
                <option value="Learner">Learner (Student Portal)</option>
                <option value="Mentor">Mentor (Authoring &amp; Grading)</option>
                <option value="Admin">Admin (Full Workspace)</option>
              </select>
            </div>
          </div>

          {/* Checklist: Assign Initial Learning Materials */}
          <div className="space-y-2 pt-2 border-t border-[#EAECEF]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#121215]">
                Pilih Materi Pembelajaran yang Boleh Dilihat Siswa
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMaterialIds(
                      availableMaterials.map((m: ExplorerContentItem) => m.id)
                    )
                  }
                  className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-[#D1D5DB]">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedMaterialIds([])}
                  className="text-[11px] font-semibold text-[#5E5E5E] hover:underline cursor-pointer"
                >
                  Batal Semua
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#5E5E5E]">
              Centang materi mana saja yang langsung dapat diakses dan dilihat oleh siswa saat pertama kali membuka aplikasi.
            </p>

            <div className="max-h-44 overflow-y-auto divide-y divide-[#EAECEF] rounded-lg border border-[#EAECEF] bg-[#FFFFFF]">
              {availableMaterials.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#5E5E5E]">
                  Belum ada konten pembelajaran yang dipublikasikan.
                </div>
              ) : (
                availableMaterials.map((mat: ExplorerContentItem) => {
                  const isChecked = selectedMaterialIds.includes(mat.id);
                  return (
                    <label
                      key={mat.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#F8F9FB] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedMaterialIds((prev) =>
                              prev.includes(mat.id)
                                ? prev.filter((id) => id !== mat.id)
                                : [...prev, mat.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-[#D1D5DB] text-[#4F39F6] focus:ring-[#4F39F6] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#121215] truncate">
                            {mat.title}
                          </p>
                          <p className="text-[10px] text-[#5E5E5E]">
                            {mat.type} • {mat.category}
                          </p>
                        </div>
                      </div>
                      <ContentBadge type={mat.type} size="sm" />
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#4F39F6] font-semibold">
                ✓ {selectedMaterialIds.length} dari {availableMaterials.length} materi dipilih untuk di-assign
              </span>
              {selectedMaterialIds.length === 0 && (
                <span className="text-[#EF4444] font-medium">
                  (Jika 0 materi, siswa belum bisa melihat kelas apa pun)
                </span>
              )}
            </div>
          </div>

          {/* CSV Quick Batch Import Box */}
          <div className="rounded-xl bg-[#F8F9FB] p-4 border border-dashed border-[#D1D5DB] flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#121215]">
                Have a Cohort CSV Roster?
              </p>
              <p className="text-[11px] text-[#5E5E5E]">
                Import columns: `full_name, email, cohort, role`
              </p>
            </div>
            <button
              type="button"
              onClick={handleCsvBatchImport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/50 px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
            >
              <Upload size={13} className="text-[#4F39F6]" />
              <span>Import Sample CSV (2 Students)</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-[#5E5E5E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Mail size={13} />
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal 2: Individual Learner Portfolio Inspector */}
      <ModalDialog
        open={Boolean(inspectedMember)}
        onClose={() => setInspectedMember(null)}
        titleId="learner-portfolio-inspector-title"
        title={
          inspectedMember
            ? `${inspectedMember.name} — Learner Portfolio`
            : "Learner Portfolio"
        }
        subtitle={
          inspectedMember
            ? `${inspectedMember.email} • ${inspectedMember.cohort} • Role: ${inspectedMember.accessRole}`
            : ""
        }
        maxWidthClass="max-w-3xl"
      >
        {inspectedMember && (
          <div className="space-y-5">
            {/* Profile Avatar Header */}
            <div className="flex items-center gap-3.5 rounded-xl bg-[#F8F9FB] px-4 py-3 border border-[#EAECEF]">
              {(() => {
                const inspectedAvatar =
                  resolveUserAvatar(
                    inspectedMember.email,
                    inspectedMember.name,
                    inspectedMember.id
                  ) || inspectedMember.avatarUrl;
                if (inspectedAvatar) {
                  return (
                    <img
                      src={inspectedAvatar}
                      alt={inspectedMember.name}
                      className="h-12 w-12 shrink-0 rounded-full object-cover border border-[#E2E8F0]"
                    />
                  );
                }
                return (
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: inspectedMember.avatarBg,
                      color: inspectedMember.avatarText,
                    }}
                  >
                    {inspectedMember.initials}
                  </span>
                );
              })()}
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#121215] truncate">
                  {inspectedMember.name}
                </p>
                <p className="text-xs text-[#64748B] truncate">
                  {inspectedMember.email} • {inspectedMember.jobTitle}
                </p>
              </div>
            </div>

            {/* Top Summary Banner */}
            <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                    Mastery Points
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustPointsTarget(inspectedMember);
                      setAdjustPointsMode("add");
                      setAdjustPointsValue(100);
                      setAdjustPointsReason("Bonus Keaktifan");
                    }}
                    className="text-[10px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Edit3 size={10} />
                    <span>Ubah</span>
                  </button>
                </div>
                <p className="text-base font-extrabold text-[#B45309] mt-0.5 flex items-center gap-1">
                  <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                  {inspectedMember.points.toLocaleString()} pts
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                  Chapters Completed
                </p>
                <p className="text-base font-extrabold text-[#121215] mt-0.5">
                  {inspectedMember.completedChapters} /{" "}
                  {inspectedMember.totalChapters}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                  Average Quiz Score
                </p>
                <p className="text-base font-extrabold text-[#10B981] mt-0.5">
                  {inspectedMember.avgQuizScore}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                  Credential ID
                </p>
                <p className="text-xs font-bold text-[#4F39F6] mt-1">
                  {inspectedMember.credentialId}
                </p>
              </div>
            </div>

            {/* Trenning 3-Tab Profile Switcher: Activity | Assigned (2) | Need to review (ref_13b) */}
            <div className="flex items-center gap-1 rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
              {(
                [
                  { id: "activity", label: "Activity" },
                  {
                    id: "assigned",
                    label: `Assigned (${memberAssignedItems.length})`,
                  },
                  { id: "review", label: "Need to review (2)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProfileTab(tab.id)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    profileTab === tab.id
                      ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs"
                      : "text-[#5E5E5E] hover:text-[#121215]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {profileTab === "activity" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Trending contents progress bars (ref_13b) */}
                <div className="md:col-span-5 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                    Trending Contents
                  </h3>
                  {[
                    { title: "Creating Engaging Learning Journeys", pct: 92, color: "#4F39F6" },
                    { title: "Mastering UI Heuristics & Tokens", pct: 78, color: "#10B981" },
                    { title: "Social Media Hook Retention Lab", pct: 64, color: "#0EA5E9" },
                  ].map((tc) => (
                    <div key={tc.title} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#121215] truncate pr-2">
                          {tc.title}
                        </span>
                        <span className="font-bold text-[#5E5E5E]">
                          {tc.pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${tc.pct}%`, backgroundColor: tc.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chronological Log Timeline (ref_13b) */}
                <div className="md:col-span-7 rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                    Activity Log
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        time: "Today, 14:20",
                        action: "Completed Quiz: Heuristic Evaluation Principles",
                        detail: "Scored 92/100 pts (Passed on 1st attempt)",
                        dot: "#10B981",
                      },
                      {
                        time: "Today, 11:05",
                        action: "Uploaded assignment attachment",
                        detail: "Instagram-Carousel-Audit-Worksheet.pdf (2.4 MB)",
                        dot: "#4F39F6",
                      },
                      {
                        time: "Yesterday, 16:40",
                        action: "Started Course: Creating Engaging Learning Journeys",
                        detail: "Completed Chapter 1 & Chapter 2",
                        dot: "#0EA5E9",
                      },
                      {
                        time: "2 days ago",
                        action: "Submitted learning path feedback",
                        detail: "Rated 5.0 ★ — 'Very clear framework and examples'",
                        dot: "#F59E0B",
                      },
                    ].map((log, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-2.5 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: log.dot }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-[#121215]">{log.action}</p>
                            <span className="text-[10px] text-[#9CA3AF] shrink-0">
                              {log.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                            {log.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {profileTab === "assigned" && (
              /* Assigned Courses & Assessments Breakdown */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                    Assigned Courses &amp; Modules ({memberAssignedItems.length})
                  </h3>
                  <span className="text-[11px] text-[#5E5E5E]">
                    Klik &quot;Cabut Akses&quot; untuk menghapus hak akses siswa dari kelas
                  </span>
                </div>

                <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] bg-[#FFFFFF] max-h-64 overflow-y-auto">
                  {memberAssignedItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#5E5E5E]">
                      Belum ada materi pembelajaran yang di-assign untuk siswa ini.
                    </div>
                  ) : (
                    memberAssignedItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ContentBadge type={item.type} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#121215] truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[#5E5E5E]">
                              {item.category} • {item.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 h-2 rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#10B981]"
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#121215] w-8 text-right tabular-nums">
                            {item.progressPercent}%
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleRevokeMemberAccess(
                                inspectedMember,
                                item.id,
                                item.title
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#EF4444] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5]/40 transition-colors cursor-pointer"
                            title="Cabut akses kelas ini untuk siswa"
                          >
                            <UserMinus size={12} />
                            <span>Cabut Akses</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {profileTab === "review" && (
              <div className="rounded-xl border border-[#EAECEF] bg-[#F8F9FB] p-4 space-y-2.5">
                <p className="text-xs font-bold text-[#121215]">
                  Open-Ended Quiz Submissions Awaiting Mentor Review
                </p>
                {[
                  {
                    qTitle: "Q4: Explain the 10 Usability Heuristics in UI Design",
                    submittedAt: "Submitted 3 hours ago",
                    pointsLabel: "Needs Score (Max 20 pts)",
                  },
                  {
                    qTitle: "Q9: Audit Brand Typography Hierarchy Case Study",
                    submittedAt: "Submitted yesterday",
                    pointsLabel: "Needs Score (Max 15 pts)",
                  },
                ].map((rev) => (
                  <div
                    key={rev.qTitle}
                    className="rounded-lg bg-[#FFFFFF] p-3 border border-[#EAECEF] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#121215]">
                        {rev.qTitle}
                      </p>
                      <p className="text-[11px] text-[#5E5E5E]">
                        {rev.submittedAt}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-bold text-[#B45309]">
                      {rev.pointsLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Portfolio Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAECEF]">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                <CheckCircle2 size={14} />
                <span>Eligible for Official Ruang Sosmed 2.0 Certificate</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedMember;
                    setInspectedMember(null);
                    setCertificateMember(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Award size={14} />
                  <span>
                    🎓 View &amp; Download Certificate (
                    {inspectedMember.credentialId})
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Official Certificate Generator Modal for Selected Learner */}
      <OfficialCertificateModal
        open={Boolean(certificateMember)}
        onClose={() => setCertificateMember(null)}
        learnerName={certificateMember?.name}
        learnerRole={certificateMember?.jobTitle}
        credentialId={certificateMember?.credentialId}
        scoreLabel={`${
          certificateMember?.avgQuizScore ?? 92
        }% Mastery Score • ${certificateMember?.cohort ?? "Batch Oktober 2026"}`}
        onShowToast={onShowToast}
        onOpenStudio={onOpenCertificateStudio}
      />

      {/* Modal 3: Manual Points Adjustment Modal */}
      <ModalDialog
        open={Boolean(adjustPointsTarget)}
        onClose={() => setAdjustPointsTarget(null)}
        titleId="adjust-points-modal-title"
        title={
          adjustPointsTarget
            ? `Atur Poin Member: ${adjustPointsTarget.name}`
            : "Atur Poin Member"
        }
        subtitle={
          adjustPointsTarget
            ? `${adjustPointsTarget.email} • Saldo Saat Ini: ⭐ ${adjustPointsTarget.points.toLocaleString()} pts`
            : ""
        }
        maxWidthClass="max-w-md"
      >
        {adjustPointsTarget && (
          <form onSubmit={handleSaveAdjustPoints} className="space-y-4">
            {/* Member Info Card */}
            <div className="rounded-xl bg-[#F8FAFC] p-3 border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: adjustPointsTarget.avatarBg,
                    color: adjustPointsTarget.avatarText,
                  }}
                >
                  {adjustPointsTarget.initials}
                </span>
                <div>
                  <p className="text-xs font-bold text-[#121215]">
                    {adjustPointsTarget.name}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {adjustPointsTarget.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase">Saldo Saat Ini</p>
                <p className="text-sm font-extrabold text-[#B45309] flex items-center gap-1 justify-end">
                  <Star size={12} className="text-[#F59E0B]" fill="#F59E0B" />
                  {adjustPointsTarget.points.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Mode Switcher: Tambah Poin (+) vs Set Total (=) */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                Metode Pengaturan
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustPointsMode("add")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustPointsMode === "add"
                      ? "bg-white text-[#4F39F6] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  + Tambah Poin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustPointsMode("set");
                    setAdjustPointsValue(adjustPointsTarget.points);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustPointsMode === "set"
                      ? "bg-white text-[#4F39F6] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  = Atur Saldo Total
                </button>
              </div>
            </div>

            {/* Quick Presets (Only in "add" mode) */}
            {adjustPointsMode === "add" && (
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Pilihan Cepat (+pts)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[25, 50, 100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustPointsValue(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        adjustPointsValue === preset
                          ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                          : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#4F39F6] hover:text-[#4F39F6]"
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Value */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1">
                {adjustPointsMode === "add" ? "Jumlah Poin Ditambahkan" : "Total Saldo Poin Baru"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={adjustPointsMode === "add" ? -adjustPointsTarget.points : 0}
                  value={adjustPointsValue}
                  onChange={(e) => setAdjustPointsValue(Number(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#121215] border border-[#CBD5E1] focus:border-[#4F39F6] focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">
                  pts
                </span>
              </div>
            </div>

            {/* Reason / Note */}
            <div>
              <label className="block text-xs font-semibold text-[#121215] mb-1">
                Alasan / Catatan Penyesuaian
              </label>
              <select
                value={adjustPointsReason}
                onChange={(e) => setAdjustPointsReason(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-xs font-medium text-[#121215] border border-[#CBD5E1] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
              >
                <option value="Bonus Keaktifan">Bonus Keaktifan Diskusi</option>
                <option value="Tugas Portofolio Terbaik">Tugas Portofolio Terbaik</option>
                <option value="Lulus Kuis Sempurna">Lulus Kuis Sempurna</option>
                <option value="Apresiasi Komunitas">Apresiasi Komunitas / Event</option>
                <option value="Penyesuaian Manual Admin">Penyesuaian Manual Admin</option>
                <option value="Koreksi Sistem">Koreksi Sistem</option>
              </select>
            </div>

            {/* Calculation Result Summary Card */}
            <div className="rounded-xl bg-[#FEF3C7]/40 border border-[#F59E0B]/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                  Hasil Perhitungan
                </p>
                <p className="text-xs text-[#78350F] mt-0.5">
                  {adjustPointsTarget.points.toLocaleString()} pts{" "}
                  {adjustPointsMode === "add"
                    ? `${adjustPointsValue >= 0 ? "+" : ""}${adjustPointsValue}`
                    : `→ ${finalCalculatedPoints}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                  Saldo Baru
                </p>
                <p className="text-base font-black text-[#B45309] flex items-center gap-1 justify-end">
                  <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                  {finalCalculatedPoints.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setAdjustPointsTarget(null)}
                disabled={isAdjustingPoints}
                className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#121215] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isAdjustingPoints}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors"
              >
                <Star size={13} fill="currentColor" />
                <span>{isAdjustingPoints ? "Menyimpan..." : "Simpan & Sinkronkan"}</span>
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}
