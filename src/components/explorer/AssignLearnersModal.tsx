"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Calendar,
  UserCheck,
  Check,
  CheckCircle2,
  UserMinus,
  Clock,
  BookOpen,
  KeyRound,
  Copy,
} from "lucide-react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { getDefaultFolderAccessCode } from "@/lib/phase2-data";

interface AssignLearnersModalProps {
  open: boolean;
  contentTitle: string;
  onClose: () => void;
  onAssign: (assignedNames: string[], dueDate: string, batchMode: string) => void;
}

export function AssignLearnersModal({
  open,
  contentTitle,
  onClose,
  onAssign,
}: AssignLearnersModalProps) {
  const {
    assignees,
    leaderboard,
    cohortProjects,
    explorerItems,
    resolveUserAvatar,
    unassignLearnerFromContent,
  } = useRuangSosmedStore();

  const liveCourse = useMemo(
    () =>
      (explorerItems || []).find(
        (e) =>
          e.title.trim().toLowerCase() === contentTitle.trim().toLowerCase()
      ),
    [explorerItems, contentTitle]
  );

  const liveAssignedLearners = useMemo(() => {
    const raw = liveCourse?.assignedLearners || [];
    return raw.filter((n) => Boolean(n && n.trim()));
  }, [liveCourse]);

  const [copiedFolderCode, setCopiedFolderCode] = useState(false);
  const folderAccessCode =
    liveCourse?.type === "Folder"
      ? liveCourse.accessCode || getDefaultFolderAccessCode(liveCourse.title)
      : "";

  const folderChildCount = useMemo(() => {
    if (liveCourse?.type !== "Folder") return 0;
    const fTitle = liveCourse.title.trim().toLowerCase();
    return (explorerItems || []).filter(
      (i) =>
        i.type !== "Folder" &&
        !i.isArchived &&
        i.folderName?.trim().toLowerCase() === fTitle
    ).length;
  }, [explorerItems, liveCourse]);

  const candidateLearners = useMemo(() => {
    const list: {
      id: string;
      name: string;
      role: string;
      initials: string;
      bg: string;
      text: string;
      batch: string;
    }[] = [];
    const seen = new Set<string>();

    for (const a of assignees || []) {
      const nameKey = a.name.trim().toLowerCase();
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        list.push({
          id: a.id,
          name: a.name,
          role: a.roleBadge || "Learner",
          initials: a.initials,
          bg: a.avatarBg || "#EEF2FF",
          text: a.avatarText || "#4F39F6",
          batch: "Registered Learners",
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
          role: l.role || "Learner",
          initials: l.initials,
          bg: l.avatarBg || "#EEF2FF",
          text: l.avatarText || "#4F39F6",
          batch: "Registered Learners",
        });
      }
    }

    return list;
  }, [assignees, leaderboard]);

  const cohortOptions = useMemo(() => {
    const list: { id: string; name: string; count: number }[] = [];
    const seenNames = new Set<string>();

    // Add cohorts from cohortProjects
    (cohortProjects || []).forEach((cp) => {
      const name = cp.name.trim();
      if (!seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        list.push({
          id: cp.id || name,
          name,
          count: cp.count ?? candidateLearners.length,
        });
      }
    });

    // Fallback: If Batch Oktober 2026 isn't in cohortProjects, add it
    if (!seenNames.has("batch oktober 2026")) {
      list.push({
        id: "cohort-batch-okt-2026",
        name: "Batch Oktober 2026",
        count: candidateLearners.length,
      });
    }

    return list;
  }, [cohortProjects, candidateLearners]);

  const [assignMode, setAssignMode] = useState<"individual" | "batch">(
    "individual"
  );
  const [selectedBatch, setSelectedBatch] = useState(
    cohortProjects?.[0]?.name || "Batch Oktober 2026"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("2026-11-05");
  const [submittedSummary, setSubmittedSummary] = useState<{
    names: string[];
    dueDate: string;
    batchMode: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmittedSummary(null);
      setSelectedIds([]);
    }
  }, [open, contentTitle]);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignMode === "batch") {
      const batchTargets = Array.from(
        new Set([selectedBatch, ...candidateLearners.map((c) => c.name)])
      );
      onAssign(batchTargets, dueDate, "Batch Cohort");
      setSubmittedSummary({
        names:
          candidateLearners.length > 0
            ? candidateLearners.map((c) => c.name)
            : [selectedBatch],
        dueDate,
        batchMode: "Batch Cohort",
      });
    } else {
      const names = candidateLearners
        .filter((c) => selectedIds.includes(c.id))
        .map((c) => c.name);
      const finalNames = names.length > 0 ? names : ["Learner"];
      onAssign(finalNames, dueDate, "Individual Selection");
      setSubmittedSummary({
        names: finalNames,
        dueDate,
        batchMode: "Individual Selection",
      });
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="assign-learners-modal-title"
      title={submittedSummary ? "Status Assignment Materi" : "Assign Learners"}
      subtitle={`Target Content: "${contentTitle}"`}
      maxWidthClass="max-w-lg"
    >
      {submittedSummary ? (
        <div className="space-y-4">
          {/* Header Banner Konfirmasi Assignment */}
          <div className="rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white shadow-xs">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-[#065F46]">
                Materi Berhasil Di-assign ke Siswa
              </p>
              <p className="text-xs text-[#047857] leading-relaxed">
                Siswa terpilih langsung menerima akses materi{" "}
                <strong>&ldquo;{contentTitle}&rdquo;</strong> di halaman Learner Portal mereka.
              </p>
            </div>
          </div>

          {/* Detail Ringkasan Status & Deadline */}
          <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Status Awal
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-[#121215]">
                <Clock size={12} className="text-[#4F39F6]" />
                <span>Not Started • 0%</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Batas Waktu (Due)
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-[#121215]">
                <Calendar size={12} className="text-[#4F39F6]" />
                <span>{submittedSummary.dueDate}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Mode Assign
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-[#4F39F6]">
                <BookOpen size={12} />
                <span>{submittedSummary.batchMode}</span>
              </p>
            </div>
          </div>

          {/* Daftar Siswa yang Baru Saja / Sedang Di-assign beserta tombol Putuskan Akses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#121215]">
                Siswa Terhubung ({liveAssignedLearners.length})
              </p>
              <span className="text-[11px] text-[#5E5E5E]">
                Putuskan akses akan otomatis menghapus kelas dari akun siswa
              </span>
            </div>

            {liveAssignedLearners.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#EAECEF] p-4 text-center text-xs text-[#5E5E5E]">
                Semua akses siswa pada materi ini telah diputuskan.
              </div>
            ) : (
              <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] max-h-48 overflow-y-auto bg-white">
                {liveAssignedLearners.map((learnerName) => {
                  const avatarUrl = resolveUserAvatar(learnerName);
                  const initials =
                    learnerName
                      .split(" ")
                      .filter(Boolean)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "S";
                  return (
                    <div
                      key={learnerName}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={learnerName}
                            className="h-7 w-7 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                          />
                        ) : (
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F39F6] text-[10px] font-bold">
                            {initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#121215] truncate">
                            {learnerName}
                          </p>
                          <p className="text-[10px] text-[#10B981] font-medium">
                            Aktif • Not Started (0%)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          unassignLearnerFromContent(contentTitle, learnerName)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5]/40 px-2.5 py-1 text-[11px] font-semibold text-[#EF4444] transition-colors cursor-pointer shrink-0"
                      >
                        <UserMinus size={12} />
                        <span>Putuskan Akses</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EAECEF]">
            <button
              type="button"
              onClick={() => setSubmittedSummary(null)}
              className="rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF] px-3.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
            >
              + Kelola / Assign Lainnya
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kode Akses Otomatis Khusus Folder Series */}
        {liveCourse?.type === "Folder" && folderAccessCode && (
          <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <KeyRound size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-950">
                    Kode Akses Otomatis Folder Series ({folderChildCount} materi)
                  </p>
                  <p className="text-[10px] text-amber-800">
                    Siswa yang input kode ini otomatis masuk &amp; membuka seluruh kelas di folder ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof navigator !== "undefined" &&
                    navigator.clipboard
                  ) {
                    void navigator.clipboard.writeText(folderAccessCode);
                  }
                  setCopiedFolderCode(true);
                  setTimeout(() => setCopiedFolderCode(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 px-2.5 py-1.5 text-xs font-extrabold tracking-wider text-amber-900 cursor-pointer shrink-0"
              >
                <span>{folderAccessCode}</span>
                {copiedFolderCode ? (
                  <Check size={12} className="text-emerald-600" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Daftar Peserta yang Sudah Terhubung + Tombol Putuskan Akses */}
        {liveAssignedLearners.length > 0 && (
          <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#121215]">
                Sudah Di-assign ({liveAssignedLearners.length})
              </span>
              <span className="text-[10px] text-[#5E5E5E]">
                Klik Putuskan Akses untuk mencabut kelas dari siswa
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {liveAssignedLearners.map((learnerName) => {
                const av = resolveUserAvatar(learnerName);
                return (
                  <span
                    key={learnerName}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#EAECEF] pl-1.5 pr-2 py-0.5 text-[11px] font-semibold text-[#121215]"
                  >
                    {av ? (
                      <img
                        src={av}
                        alt={learnerName}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-4 w-4 rounded-full bg-[#EEF2FF] text-[#4F39F6] text-[9px] font-bold inline-flex items-center justify-center">
                        {learnerName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{learnerName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        unassignLearnerFromContent(contentTitle, learnerName)
                      }
                      title={`Putuskan akses ${learnerName} dari "${contentTitle}"`}
                      className="text-[#EF4444] hover:text-[#B91C1C] font-bold ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {/* Batch / Individual Selection Segmented Toggle */}
        <div
          role="group"
          aria-label="Assignment selection mode"
          className="grid grid-cols-2 gap-1.5 rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]"
        >
          <button
            type="button"
            onClick={() => setAssignMode("individual")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              assignMode === "individual"
                ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs border border-[#EAECEF]"
                : "text-[#5E5E5E] hover:text-[#121215]"
            }`}
          >
            <UserCheck size={13} />
            <span>Individual Learners</span>
          </button>
          <button
            type="button"
            onClick={() => setAssignMode("batch")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              assignMode === "batch"
                ? "bg-[#FFFFFF] text-[#4F39F6] shadow-2xs border border-[#EAECEF]"
                : "text-[#5E5E5E] hover:text-[#121215]"
            }`}
          >
            <Users size={13} />
            <span>Entire Batch / Cohort</span>
          </button>
        </div>

        {assignMode === "batch" ? (
          <div>
            <label
              htmlFor="batch-cohort-select"
              className="block text-xs font-semibold text-[#121215] mb-1.5"
            >
              Select Class Cohort
            </label>
            <select
              id="batch-cohort-select"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs font-medium text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            >
              {cohortOptions.map((cohort) => (
                <option key={cohort.id} value={cohort.name}>
                  {cohort.name} ({cohort.count} Learners)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#121215]">
                Select Learners ({selectedIds.length} chosen)
              </label>
              {candidateLearners.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(candidateLearners.map((c) => c.id))
                  }
                  className="text-[11px] font-semibold text-[#4F39F6] hover:underline cursor-pointer"
                >
                  Select All
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-[#EAECEF] rounded-lg border border-[#EAECEF]">
              {candidateLearners.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#5E5E5E] space-y-1">
                  <p className="font-semibold text-[#121215]">
                    Belum ada learner yang terdaftar
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Learner yang mendaftar atau login di portal akan otomatis muncul di sini.
                  </p>
                </div>
              ) : (
                candidateLearners.map((learner) => {
                const checked = selectedIds.includes(learner.id);
                return (
                  <button
                    key={learner.id}
                    type="button"
                    onClick={() => toggleCandidate(learner.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                      checked ? "bg-[#4F39F6]/5" : "hover:bg-[#F8F9FB]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {(() => {
                        const learnerAvatar = resolveUserAvatar(
                          learner.name,
                          learner.id
                        );
                        if (learnerAvatar) {
                          return (
                            <img
                              src={learnerAvatar}
                              alt={learner.name}
                              className="h-7 w-7 shrink-0 rounded-full object-cover border border-[#EAECEF]"
                            />
                          );
                        }
                        return (
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: learner.bg,
                              color: learner.text,
                            }}
                          >
                            {learner.initials}
                          </span>
                        );
                      })()}
                      <div>
                        <p className="text-xs font-semibold text-[#121215]">
                          {learner.name}
                        </p>
                        <p className="text-[10px] text-[#5E5E5E]">
                          {learner.role} • {learner.batch}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        checked
                          ? "bg-[#4F39F6] border-[#4F39F6] text-white"
                          : "border-[#D1D5DB] bg-[#FFFFFF]"
                      }`}
                    >
                      {checked && <Check size={10} strokeWidth={3} />}
                    </span>
                  </button>
                );
              }))}
            </div>
          </div>
        )}

        {/* Due Date Picker */}
        <div>
          <label
            htmlFor="assign-due-date"
            className="block text-xs font-semibold text-[#121215] mb-1.5"
          >
            Completion Due Date
          </label>
          <div className="relative flex items-center">
            <Calendar
              size={14}
              className="pointer-events-none absolute left-3 text-[#5E5E5E]"
            />
            <input
              id="assign-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs font-medium text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Users size={13} />
            <span>Confirm Assignment</span>
          </button>
        </div>
      </form>
      )}
    </ModalDialog>
  );
}
