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
  EyeOff,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Mail,
  Zap,
  Plus,
  Edit3,
  Coins,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  Gift,
  Send,
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
    courseCurriculums,
    claimedRewards,
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

  const [userEnrollmentsMap, setUserEnrollmentsMap] = useState<
    Record<
      string,
      { contentId: string; completedCount: number; progressPercent: number }[]
    >
  >({});

  const [adminResetPasswordsMap, setAdminResetPasswordsMap] = useState<
    Record<string, { password: string; updatedAt: string; updatedBy?: string }>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(
          "ruang_sosmed_admin_reset_passwords_v1"
        );
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch {}
    }
    return {};
  });

  // Fetch registered learners directly from Supabase (`profiles`, `user_profiles`, & `__SYSTEM_USER_PASSWORDS__`)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadSupabaseDirectory = async () => {
      try {
        const [
          profilesRes,
          userProfilesRes,
          enrollmentsRes,
          submissionsRes,
          passwordsRes,
        ] = await Promise.all([
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
            .select("learner_id, content_id, completed_chapter_ids, progress_percent"),
          supabase
            .from("submissions")
            .select("learner_id, score_percent"),
          supabase
            .from("contents")
            .select("settings_json")
            .eq("title", "__SYSTEM_USER_PASSWORDS__")
            .order("updated_at", { ascending: false })
            .limit(1),
        ]);

        const nextEnrollMap: Record<
          string,
          { contentId: string; completedCount: number; progressPercent: number }[]
        > = {};
        if (Array.isArray(enrollmentsRes.data)) {
          enrollmentsRes.data.forEach((row: any) => {
            if (!row?.learner_id || !row?.content_id) return;
            const list = nextEnrollMap[row.learner_id] || [];
            list.push({
              contentId: row.content_id,
              completedCount: Array.isArray(row.completed_chapter_ids)
                ? row.completed_chapter_ids.length
                : 0,
              progressPercent: Number(row.progress_percent || 0),
            });
            nextEnrollMap[row.learner_id] = list;
          });
        }
        setUserEnrollmentsMap(nextEnrollMap);

        const pwRow =
          Array.isArray(passwordsRes.data) && passwordsRes.data.length > 0
            ? (passwordsRes.data[0] as any)
            : null;
        if (
          pwRow?.settings_json?.passwords &&
          typeof pwRow.settings_json.passwords === "object"
        ) {
          setAdminResetPasswordsMap((prev) => {
            const mergedPw = { ...prev, ...pwRow.settings_json.passwords };
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  "ruang_sosmed_admin_reset_passwords_v1",
                  JSON.stringify(mergedPw)
                );
              }
            } catch {}
            return mergedPw;
          });
        }

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

  // Portfolio & Security Inspector Modal state
  const [inspectedMember, setInspectedMember] =
    useState<DirectoryMember | null>(null);
  const [profileTab, setProfileTab] = useState<
    "activity" | "assigned" | "security"
  >("activity");
  const [certificateMember, setCertificateMember] =
    useState<DirectoryMember | null>(null);

  // Admin Direct Password Reset states
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

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

  const memberUnassignedMaterials = useMemo(() => {
    const assignedIds = new Set(memberAssignedItems.map((m) => m.id));
    return availableMaterials.filter((m) => !assignedIds.has(m.id));
  }, [availableMaterials, memberAssignedItems]);

  const memberClaimedRewards = useMemo(() => {
    if (!inspectedMember) return [];
    const emailKey = (inspectedMember.email || "").toLowerCase().trim();
    const nameKey = (inspectedMember.name || "").toLowerCase().trim();
    return (claimedRewards || []).filter((r) => {
      const rEmail = (r.claimedByEmail || "").toLowerCase().trim();
      const rName = (r.claimedByName || "").toLowerCase().trim();
      return (emailKey && rEmail === emailKey) || (nameKey && rName === nameKey);
    });
  }, [inspectedMember, claimedRewards]);

  const handleAssignMaterialToMember = (
    member: DirectoryMember,
    mat: ExplorerContentItem
  ) => {
    assignContentToLearners(
      mat,
      [member.name, member.email].filter(Boolean),
      "2026-12-31",
      "Individual"
    );
    onShowToast(`Materi "${mat.title}" berhasil ditambahkan ke ${member.name}.`);
  };

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

  const getMemberPasswordRecord = (member: DirectoryMember | null) => {
    if (!member) return null;
    const emailKey = (member.email || "").toLowerCase().trim();
    const usernameKey = emailKey.includes("@") ? emailKey.split("@")[0] : "";
    const nameKey = (member.name || "").toLowerCase().trim();
    return (
      adminResetPasswordsMap[emailKey] ||
      adminResetPasswordsMap[usernameKey] ||
      adminResetPasswordsMap[nameKey] ||
      null
    );
  };

  const handleGenerateResetPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    setResetPasswordInput(`RS-${suffix}`);
    setShowResetPassword(true);
  };

  const handleCopyResetPassword = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPassword(true);
      onShowToast("Password baru berhasil disalin ke clipboard.");
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      onShowToast("Gagal menyalin password.");
    }
  };

  const handleAdminDirectPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedMember) return;
    const nextPassword = resetPasswordInput.trim();
    if (nextPassword.length < 4) {
      onShowToast("Password minimal harus 4 karakter.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const emailKey = (inspectedMember.email || "").toLowerCase().trim();
      const usernameKey = emailKey.includes("@") ? emailKey.split("@")[0] : "";
      const nameKey = (inspectedMember.name || "").toLowerCase().trim();
      const entry = {
        password: nextPassword,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || "Admin",
      };

      const nextMap: Record<
        string,
        { password: string; updatedAt: string; updatedBy?: string }
      > = { ...adminResetPasswordsMap };
      if (emailKey) nextMap[emailKey] = entry;
      if (usernameKey) nextMap[usernameKey] = entry;
      if (nameKey) nextMap[nameKey] = entry;

      setAdminResetPasswordsMap(nextMap);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_admin_reset_passwords_v1",
            JSON.stringify(nextMap)
          );
        } catch {}
      }

      if (isSupabaseConfigured) {
        const { data: existingRows } = await supabase
          .from("contents")
          .select("id, settings_json")
          .eq("title", "__SYSTEM_USER_PASSWORDS__")
          .order("updated_at", { ascending: false })
          .limit(1);

        const existing =
          Array.isArray(existingRows) && existingRows.length > 0
            ? (existingRows[0] as any)
            : null;
        const remotePasswords =
          existing?.settings_json?.passwords &&
          typeof existing.settings_json.passwords === "object"
            ? existing.settings_json.passwords
            : {};
        const mergedPasswords = { ...remotePasswords, ...nextMap };
        const payload = {
          passwords: mergedPasswords,
          updatedAt: new Date().toISOString(),
        };

        if (existing?.id) {
          await supabase
            .from("contents")
            .update({
              settings_json: payload,
              status: "published",
            })
            .eq("id", existing.id);
        } else {
          const generatedId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : "00000000-0000-4000-8000-000000000101";
          await supabase.from("contents").insert({
            id: generatedId,
            title: "__SYSTEM_USER_PASSWORDS__",
            type: "page",
            status: "published",
            description: "System storage for admin-assisted password resets",
            urgency: "not_urgent",
            estimated_minutes: 0,
            points_reward: 0,
            settings_json: payload,
          });
        }
      }

      onShowToast(
        `🔑 Password untuk ${inspectedMember.name} berhasil direset dan langsung aktif untuk login.`
      );
      setResetPasswordInput("");
    } catch (err: any) {
      onShowToast(`Gagal mereset password: ${err?.message || "Error"}`);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSendSupabaseResetEmail = async () => {
    if (!inspectedMember?.email || !isSupabaseConfigured) return;
    setIsSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        inspectedMember.email,
        {
          redirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        }
      );
      if (error) throw error;
      onShowToast(
        `📧 Link reset password dikirim ke email ${inspectedMember.email}.`
      );
    } catch (err: any) {
      onShowToast(
        `Tidak dapat mengirim email reset Supabase: ${err?.message || "Gunakan Reset Password Langsung di sebelah kiri."}`
      );
    } finally {
      setIsSendingResetEmail(false);
    }
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
                    onClick={() => {
                      setInspectedMember(member);
                      setProfileTab("activity");
                      setResetPasswordInput("");
                      setShowResetPassword(false);
                    }}
                    title={`Klik baris untuk membuka profil, progress belajar, sisa koin & reset password ${member.name}`}
                    className="group transition-colors cursor-pointer"
                  >
                    <th
                      scope="row"
                      className="py-3.5 px-4 font-semibold text-[#121215] text-left transition-colors"
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
                          <p className="font-bold text-[#121215] group-hover:text-[#4F39F6] transition-colors">
                            {member.name}
                          </p>
                          <p className="text-[11px] font-normal text-[#5E5E5E]">
                            {member.email} • {member.jobTitle}
                          </p>
                        </div>
                      </div>
                    </th>

                    <td className="py-3.5 px-4 transition-colors">
                      <span className="rounded-md bg-[#F8F9FB] border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#121215]">
                        {member.cohort}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 transition-colors">
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

                    <td
                      className="py-3.5 px-4 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustPointsTarget(member);
                            setAdjustPointsMode("add");
                            setAdjustPointsValue(100);
                            setAdjustPointsReason("Bonus Keaktifan");
                          }}
                          title={`Klik untuk ubah / tambah koin manual untuk ${member.name}`}
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

                    <td
                      className="py-3.5 px-4 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
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

                    <td
                      className="py-3.5 px-4 text-right transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          onClick={() => {
                            setInspectedMember(member);
                            setProfileTab("activity");
                            setResetPasswordInput("");
                            setShowResetPassword(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#4F39F6] hover:text-white px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Lihat Profil</span>
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

      {/* Modal 2: Individual User Profile, Learning Progress, Coins & Password Reset */}
      <ModalDialog
        open={Boolean(inspectedMember)}
        onClose={() => {
          setInspectedMember(null);
          setResetPasswordInput("");
          setShowResetPassword(false);
        }}
        titleId="learner-portfolio-inspector-title"
        title={
          inspectedMember
            ? `Profil User — ${inspectedMember.name}`
            : "Profil User"
        }
        subtitle={
          inspectedMember
            ? `${inspectedMember.email} • ${inspectedMember.cohort} • Role: ${inspectedMember.accessRole}`
            : ""
        }
        maxWidthClass="max-w-3xl"
      >
        {inspectedMember && (() => {
          const activeMember =
            allDirectoryMembers.find(
              (m) =>
                m.email.toLowerCase() === inspectedMember.email.toLowerCase() ||
                m.id === inspectedMember.id
            ) || inspectedMember;
          const emailKey = activeMember.email.toLowerCase().trim();
          const resolvedTier =
            activeMember.accessRole === "Admin"
              ? "PRO"
              : learnerSubscriptions?.[emailKey] ??
                learnerSubscriptions?.[activeMember.name] ??
                supabaseProMap[emailKey] ??
                supabaseProMap[activeMember.name] ??
                "Free";
          const isMemberPro = resolvedTier === "PRO";
          const overallPct =
            activeMember.totalChapters > 0
              ? Math.min(
                  100,
                  Math.round(
                    (activeMember.completedChapters / activeMember.totalChapters) *
                      100
                  )
                )
              : 0;
          const totalCoinsSpent = memberClaimedRewards.reduce(
            (sum, item) => sum + (Number(item.pointsSpent) || 0),
            0
          );
          const pwRecord = getMemberPasswordRecord(activeMember);
          const memberEnrolls = userEnrollmentsMap[activeMember.id] || [];

          return (
            <div className="space-y-5">
              {/* Profile Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] px-4 py-3.5 border border-[#EAECEF]">
                <div className="flex items-center gap-3.5 min-w-0">
                  {(() => {
                    const inspectedAvatar =
                      resolveUserAvatar(
                        activeMember.email,
                        activeMember.name,
                        activeMember.id
                      ) || activeMember.avatarUrl;
                    if (inspectedAvatar) {
                      return (
                        <img
                          src={inspectedAvatar}
                          alt={activeMember.name}
                          className="h-12 w-12 shrink-0 rounded-full object-cover border border-[#E2E8F0]"
                        />
                      );
                    }
                    return (
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: activeMember.avatarBg,
                          color: activeMember.avatarText,
                        }}
                      >
                        {activeMember.initials}
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#121215] truncate">
                        {activeMember.name}
                      </p>
                      <span className="rounded-md bg-[#EEF2FF] border border-[#4F39F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#4F39F6]">
                        {activeMember.accessRole}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          isMemberPro
                            ? "bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/40"
                            : "bg-[#FFFFFF] text-[#5E5E5E] border-[#EAECEF]"
                        }`}
                      >
                        <Zap size={10} fill="currentColor" />
                        <span>{isMemberPro ? "PRO Member" : "Free Tier"}</span>
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] truncate mt-0.5">
                      {activeMember.email} • {activeMember.jobTitle} •{" "}
                      {activeMember.cohort}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeMember.accessRole === "Learner" && (
                    <button
                      type="button"
                      onClick={() => {
                        toggleStudentProByAdmin(
                          activeMember.name,
                          activeMember.email
                        );
                        setSupabaseProMap((prev) => ({
                          ...prev,
                          [activeMember.name]: isMemberPro ? "Free" : "PRO",
                          [emailKey]: isMemberPro ? "Free" : "PRO",
                        }));
                        onShowToast(
                          `Status paket ${activeMember.name} diubah ke ${
                            isMemberPro ? "Free Tier" : "Learner PRO"
                          }.`
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-2.5 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
                    >
                      <Zap size={12} className="text-[#F59E0B]" />
                      <span>{isMemberPro ? "Ubah ke Free" : "Set PRO"}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setProfileTab("security")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    <KeyRound size={12} />
                    <span>Reset Password</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Metric Cards: Sisa Koin, Progress Belajar, Skor Kuis, Status Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Remaining Coins */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                      <Coins size={11} className="text-[#F59E0B]" />
                      <span>Sisa Koin / Poin</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustPointsTarget(activeMember);
                        setAdjustPointsMode("add");
                        setAdjustPointsValue(100);
                        setAdjustPointsReason("Bonus Keaktifan");
                      }}
                      className="text-[10px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Edit3 size={10} />
                      <span>Ubah Saldo</span>
                    </button>
                  </div>
                  <p className="text-lg font-extrabold text-[#B45309] mt-1 flex items-center gap-1">
                    <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                    <span className="tabular-nums">
                      {activeMember.points.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold">Koin</span>
                  </p>
                  <p className="text-[11px] text-[#5E5E5E] mt-1">
                    Terpakai:{" "}
                    <span className="font-semibold">
                      {totalCoinsSpent.toLocaleString()} Koin
                    </span>{" "}
                    ({memberClaimedRewards.length} hadiah)
                  </p>
                </div>

                {/* 2. Learning Progress */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                    <BookOpen size={11} className="text-[#4F39F6]" />
                    <span>Progress Belajar</span>
                  </p>
                  <p className="text-lg font-extrabold text-[#121215] mt-1 tabular-nums">
                    {overallPct}%{" "}
                    <span className="text-xs font-semibold text-[#5E5E5E]">
                      ({activeMember.completedChapters}/
                      {activeMember.totalChapters} Bab)
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#4F39F6]"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#5E5E5E] mt-1">
                    {memberAssignedItems.length} Materi di-assign
                  </p>
                </div>

                {/* 3. Quiz Avg & Certificate */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">
                    Skor Kuis &amp; Sertifikat
                  </p>
                  <p className="text-lg font-extrabold text-[#10B981] mt-1">
                    {activeMember.avgQuizScore}%{" "}
                    <span className="text-xs font-semibold text-[#5E5E5E]">
                      Rata-rata
                    </span>
                  </p>
                  <p className="text-[11px] font-semibold text-[#4F39F6] mt-1 truncate">
                    ID: {activeMember.credentialId}
                  </p>
                </div>

                {/* 4. Password Security Status */}
                <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF]">
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                    <ShieldCheck size={11} className="text-[#10B981]" />
                    <span>Keamanan Akun</span>
                  </p>
                  <p className="text-xs font-bold text-[#121215] mt-1.5">
                    {pwRecord
                      ? "Password Admin Aktif"
                      : "Password Default / Auth"}
                  </p>
                  <p className="text-[11px] text-[#5E5E5E] mt-0.5 truncate">
                    {pwRecord
                      ? `Diperbarui ${new Date(pwRecord.updatedAt).toLocaleDateString("id-ID")}`
                      : "Belum direset manual"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setProfileTab("security")}
                    className="mt-1.5 text-[11px] font-bold text-[#4F39F6] hover:underline cursor-pointer"
                  >
                    Atur Password Baru &rarr;
                  </button>
                </div>
              </div>

              {/* 3-Tab Switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
                {(
                  [
                    { id: "activity", label: "Progress Belajar & Koin" },
                    {
                      id: "assigned",
                      label: `Kelola Materi (${memberAssignedItems.length})`,
                    },
                    { id: "security", label: "Reset Password" },
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
                  {/* Per-Course Learning Progress */}
                  <div className="md:col-span-7 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                        Progress Per Kelas ({memberAssignedItems.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setProfileTab("assigned")}
                        className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                      >
                        + Tambah / Cabut Materi
                      </button>
                    </div>

                    {memberAssignedItems.length === 0 ? (
                      <div className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] p-5 text-center space-y-2">
                        <p className="text-xs text-[#5E5E5E]">
                          Belum ada kelas/materi yang di-assign ke{" "}
                          <span className="font-semibold">{activeMember.name}</span>.
                        </p>
                        <button
                          type="button"
                          onClick={() => setProfileTab("assigned")}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Assign Materi Sekarang</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {memberAssignedItems.map((item) => {
                          const currSections =
                            courseCurriculums?.[item.title.trim().toLowerCase()] ||
                            [];
                          const totalCourseCh = currSections.reduce(
                            (acc, sec) => acc + (sec.chapters?.length || 0),
                            0
                          );
                          const enrollMatch = memberEnrolls.find(
                            (en) => en.contentId === item.id
                          );
                          const coursePct = enrollMatch
                            ? enrollMatch.progressPercent
                            : item.progressPercent || 0;
                          const completedChInCourse = enrollMatch
                            ? enrollMatch.completedCount
                            : Math.round((coursePct / 100) * totalCourseCh);

                          return (
                            <div
                              key={item.id}
                              className="rounded-lg bg-[#FFFFFF] p-3 border border-[#EAECEF] space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-[#121215] truncate">
                                  {item.title}
                                </span>
                                <span className="font-bold text-[#4F39F6] shrink-0 tabular-nums">
                                  {coursePct}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-[#F8F9FB] border border-[#EAECEF] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#4F39F6]"
                                  style={{ width: `${coursePct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-[#5E5E5E]">
                                <span>
                                  {item.folderName || item.cohort || item.category}
                                </span>
                                <span className="tabular-nums">
                                  {totalCourseCh > 0
                                    ? `${completedChInCourse}/${totalCourseCh} Bab selesai`
                                    : item.type}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Remaining Coins & Rewards History */}
                  <div className="md:col-span-5 rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215] flex items-center gap-1.5">
                        <Gift size={13} className="text-[#F59E0B]" />
                        <span>Koin &amp; Penukaran Hadiah</span>
                      </h3>
                    </div>

                    <div className="rounded-lg bg-[#FEF3C7]/40 border border-[#F59E0B]/30 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#B45309]">
                          Remaining Coins
                        </p>
                        <p className="text-base font-extrabold text-[#B45309] tabular-nums">
                          {activeMember.points.toLocaleString()} Koin
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustPointsTarget(activeMember);
                          setAdjustPointsMode("add");
                          setAdjustPointsValue(100);
                          setAdjustPointsReason("Bonus Keaktifan");
                        }}
                        className="rounded-lg bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-bold text-[#B45309] border border-[#F59E0B]/40 cursor-pointer"
                      >
                        + Atur Koin
                      </button>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {memberClaimedRewards.length === 0 ? (
                        <p className="text-xs text-[#5E5E5E] py-3 text-center">
                          Belum ada hadiah yang ditukarkan oleh user ini.
                        </p>
                      ) : (
                        memberClaimedRewards.map((rw) => (
                          <div
                            key={rw.id}
                            className="rounded-lg bg-[#F8F9FB] p-2.5 border border-[#EAECEF] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[#121215] truncate">
                                {rw.rewardTitle}
                              </p>
                              <p className="text-[10px] text-[#5E5E5E]">
                                {new Date(rw.claimedAt).toLocaleDateString("id-ID")} •{" "}
                                {rw.status}
                              </p>
                            </div>
                            <span className="shrink-0 font-bold text-[#EF4444] tabular-nums">
                              -{rw.pointsSpent} pts
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {profileTab === "assigned" && (
                /* Assigned Courses & Add/Revoke Access */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                        Materi yang Sudah Di-assign ({memberAssignedItems.length})
                      </h3>
                      <span className="text-[11px] text-[#5E5E5E]">
                        Klik &quot;Cabut Akses&quot; untuk menghapus hak akses
                      </span>
                    </div>

                    <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] bg-[#FFFFFF] max-h-48 overflow-y-auto">
                      {memberAssignedItems.length === 0 ? (
                        <div className="p-5 text-center text-xs text-[#5E5E5E]">
                          Belum ada materi pembelajaran yang di-assign untuk user ini.
                        </div>
                      ) : (
                        memberAssignedItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ContentBadge type={item.type} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#121215] truncate">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-[#5E5E5E]">
                                  {item.folderName || item.category} • {item.type}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRevokeMemberAccess(
                                  activeMember,
                                  item.id,
                                  item.title
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#EF4444] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5]/40 transition-colors cursor-pointer shrink-0"
                            >
                              <UserMinus size={12} />
                              <span>Cabut Akses</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {memberUnassignedMaterials.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                        Tambah Materi Baru untuk {activeMember.name}
                      </h3>
                      <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] bg-[#F8F9FB] max-h-40 overflow-y-auto">
                        {memberUnassignedMaterials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-2.5 px-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ContentBadge type={mat.type} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#121215] truncate">
                                  {mat.title}
                                </p>
                                <p className="text-[10px] text-[#5E5E5E] truncate">
                                  {mat.folderName || mat.cohort || mat.category}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleAssignMaterialToMember(activeMember, mat)
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer shrink-0"
                            >
                              <Plus size={12} />
                              <span>Assign</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {profileTab === "security" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Direct Admin Password Reset Form */}
                  <form
                    onSubmit={handleAdminDirectPasswordReset}
                    className="md:col-span-7 rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF] space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215] flex items-center gap-1.5">
                          <KeyRound size={13} className="text-[#4F39F6]" />
                          <span>Reset Password Langsung oleh Admin</span>
                        </h3>
                        <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                          Atur password baru untuk{" "}
                          <span className="font-semibold text-[#121215]">
                            {activeMember.email}
                          </span>
                          . User dapat langsung login menggunakan password ini.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="admin-reset-password-input"
                        className="block text-xs font-semibold text-[#121215]"
                      >
                        Password Baru
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            id="admin-reset-password-input"
                            type={showResetPassword ? "text" : "password"}
                            required
                            minLength={4}
                            value={resetPasswordInput}
                            onChange={(e) => setResetPasswordInput(e.target.value)}
                            placeholder="Masukkan minimal 4 karakter..."
                            className="w-full rounded-lg bg-[#FFFFFF] px-3 py-2 pr-9 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
                            title={
                              showResetPassword
                                ? "Sembunyikan password"
                                : "Tampilkan password"
                            }
                          >
                            {showResetPassword ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerateResetPassword}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/50 px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer shrink-0"
                          title="Buat password acak otomatis"
                        >
                          <RefreshCw size={12} className="text-[#4F39F6]" />
                          <span>Generate</span>
                        </button>

                        {resetPasswordInput && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyResetPassword(resetPasswordInput)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/50 px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer shrink-0"
                            title="Salin password"
                          >
                            {copiedPassword ? (
                              <Check size={12} className="text-[#10B981]" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>Salin</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSavingPassword || !resetPasswordInput.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                      >
                        <KeyRound size={13} />
                        <span>
                          {isSavingPassword
                            ? "Menyimpan..."
                            : "Simpan Password Baru (Langsung Aktif)"}
                        </span>
                      </button>
                    </div>
                  </form>

                  {/* Current Reset Record & Optional Email Reset */}
                  <div className="md:col-span-5 rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#121215]">
                        Info Password Terakhir
                      </h3>
                      {pwRecord ? (
                        <div className="rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase text-[#059669]">
                              Password Aktif (Admin Reset)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyResetPassword(pwRecord.password)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:underline cursor-pointer"
                            >
                              <Copy size={11} />
                              <span>Salin</span>
                            </button>
                          </div>
                          <p className="font-mono text-sm font-bold text-[#121215] select-all">
                            {pwRecord.password}
                          </p>
                          <p className="text-[10px] text-[#5E5E5E]">
                            Direset oleh {pwRecord.updatedBy || "Admin"} pada{" "}
                            {new Date(pwRecord.updatedAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-[#F8F9FB] border border-[#EAECEF] p-3 text-xs text-[#5E5E5E]">
                          Belum pernah dilakukan reset manual dari Admin untuk user
                          ini.
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#EAECEF] space-y-2">
                      <p className="text-[11px] text-[#5E5E5E]">
                        Alternatif: kirim link reset resmi ke email user via Supabase
                        Auth:
                      </p>
                      <button
                        type="button"
                        onClick={handleSendSupabaseResetEmail}
                        disabled={isSendingResetEmail}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                      >
                        <Send size={12} className="text-[#4F39F6]" />
                        <span>
                          {isSendingResetEmail
                            ? "Mengirim Email..."
                            : "Kirim Link Reset ke Email"}
                        </span>
                      </button>
                    </div>
                  </div>
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
                      const target = activeMember;
                      setInspectedMember(null);
                      setCertificateMember(target);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    <Award size={14} />
                    <span>
                      🎓 View &amp; Download Certificate (
                      {activeMember.credentialId})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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
