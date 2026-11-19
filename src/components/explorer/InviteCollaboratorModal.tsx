"use client";

import React, { useState } from "react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { supabase } from "@/lib/supabase/client";
import { Mail, Shield, User, Send, CheckCircle2, Trash2, Users, UserPlus } from "lucide-react";

interface InviteCollaboratorModalProps {
  open: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  initialTab?: "members" | "invite";
}

export function InviteCollaboratorModal({
  open,
  onClose,
  onShowToast,
  initialTab = "members",
}: InviteCollaboratorModalProps) {
  const {
    cohortProjects,
    sendCollaboratorInvitation,
    workspaceCollaborators,
    removeWorkspaceCollaborator,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const [activeTab, setActiveTab] = useState<"members" | "invite">(initialTab);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"Mentor" | "Course Author" | "Admin">("Mentor");
  const [selectedCohort, setSelectedCohort] = useState(
    cohortProjects?.[0]?.name || "Ruang Sosmed Class"
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync tab when modal opens
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      onShowToast("Mohon masukkan alamat email yang valid.");
      return;
    }

    setIsSubmitting(true);

    sendCollaboratorInvitation({
      email: trimmedEmail,
      fullName: fullName.trim() || undefined,
      role,
      cohort: selectedCohort,
      note: note.trim() || undefined,
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/invite", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: trimmedEmail,
          fullName: fullName.trim() || undefined,
          role,
          cohort: selectedCohort,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.emailSent) {
        onShowToast(
          `✉️ Email undangan resmi berhasil dikirim ke ${trimmedEmail}!`
        );
      } else {
        onShowToast(
          `🎉 Undangan berhasil dikirim ke ${trimmedEmail} sebagai ${role} pada cohort "${selectedCohort}"!`
        );
      }
    } catch {
      onShowToast(
        `🎉 Undangan berhasil dikirim ke ${trimmedEmail} sebagai ${role} pada cohort "${selectedCohort}"!`
      );
    } finally {
      setIsSubmitting(false);
      setEmail("");
      setFullName("");
      setNote("");
      setActiveTab("members");
    }
  };

  const currentMembers =
    workspaceCollaborators && workspaceCollaborators.length > 0
      ? workspaceCollaborators
      : [
          {
            id: "collab-owner",
            name: "Dinur Pradipta",
            email: "dinur@ruangsosmed.id",
            initials: "DP",
            role: "Admin" as const,
            cohort: "Ruang Sosmed Class",
            status: "accepted" as const,
            avatarBg: "#FEF3C7",
            avatarText: "#92400E",
            joinedAt: "Owner",
          },
        ];

  const handleRemoveMember = (memberId: string, memberName: string) => {
    removeWorkspaceCollaborator(memberId);
    onShowToast(`Member "${memberName}" berhasil dihapus dari workspace.`);
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="invite-collaborator-title"
      title="Kelola Tim & Anggota Workspace"
      subtitle="Atur kolaborator yang memiliki akses ke materi dan cohort ini"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs: Anggota Aktif vs Undang Member */}
        <div className="flex items-center gap-1 p-1 bg-[#F8F9FB] rounded-xl border border-[#EAECEF]">
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "members"
                ? "bg-[#FFFFFF] text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                : "text-[#5E5E5E] hover:text-[#121215]"
            }`}
          >
            <Users size={14} />
            <span>Anggota Aktif ({currentMembers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invite")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "invite"
                ? "bg-[#FFFFFF] text-[#4F39F6] shadow-xs border border-[#EAECEF]"
                : "text-[#5E5E5E] hover:text-[#121215]"
            }`}
          >
            <UserPlus size={14} />
            <span>+ Undang Member Baru</span>
          </button>
        </div>

        {/* TAB 1: DAFTAR ANGGOTA WORKSPACE */}
        {activeTab === "members" ? (
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-[#5E5E5E]">
              Berikut adalah instruktur, mentor, dan anggota yang terdaftar di workspace ini. Anda dapat menghapus anggota yang tidak lagi aktif.
            </p>

            <div className="divide-y divide-[#EAECEF] rounded-xl border border-[#EAECEF] bg-[#FFFFFF] max-h-72 overflow-y-auto">
              {currentMembers.map((member) => {
                const isOwner =
                  member.id === "collab-owner" || member.joinedAt === "Owner";
                return (
                  <div
                    key={member.id || member.email}
                    className="flex items-center justify-between p-3.5 hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const memberAvatar = resolveUserAvatar(
                          member.name,
                          member.email,
                          member.id
                        );
                        if (memberAvatar) {
                          return (
                            <img
                              src={memberAvatar}
                              alt={member.name}
                              className="h-9 w-9 shrink-0 rounded-full object-cover shadow-2xs border border-white"
                            />
                          );
                        }
                        return (
                          <span
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs border border-white"
                            style={{
                              backgroundColor: member.avatarBg || "#FEF3C7",
                              color: member.avatarText || "#92400E",
                            }}
                          >
                            {member.initials || "MB"}
                          </span>
                        );
                      })()}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#121215] truncate">
                            {member.name}
                          </p>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              isOwner
                                ? "bg-[#4F39F6]/10 text-[#4F39F6] border border-[#4F39F6]/20"
                                : "bg-[#F8F9FB] text-[#5E5E5E] border border-[#EAECEF]"
                            }`}
                          >
                            {isOwner ? "Owner" : member.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] truncate">
                          {member.email} • {member.cohort}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isOwner ? (
                        <span className="text-[11px] font-semibold text-[#9CA3AF] pr-2">
                          Utama
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveMember(member.id, member.name)
                          }
                          title={`Hapus ${member.name} dari workspace`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444]/20 hover:border-[#EF4444]/40 transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] border border-[#EAECEF] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* TAB 2: FORM UNDANG MEMBER BARU */
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-[#121215] mb-1.5">
                Alamat Email Mentor / Kolaborator <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mentor@ruangsosmed.id"
                  className="w-full rounded-xl bg-[#FFFFFF] pl-9 pr-3.5 py-2.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#121215] mb-1.5">
                Nama Lengkap (Opsional)
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Sarah Azhari"
                  className="w-full rounded-xl bg-[#FFFFFF] pl-9 pr-3.5 py-2.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-[#121215] mb-1.5">
                Peran &amp; Hak Akses
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Mentor", "Course Author", "Admin"] as const).map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? "bg-[#4F39F6]/5 border-[#4F39F6] text-[#4F39F6] font-bold ring-1 ring-[#4F39F6]"
                          : "bg-[#FFFFFF] border-[#EAECEF] text-[#5E5E5E] hover:bg-[#F8F9FB]"
                      }`}
                    >
                      <Shield
                        size={16}
                        className={active ? "text-[#4F39F6]" : "text-[#9CA3AF]"}
                      />
                      <span className="text-xs mt-1">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cohort Assignment */}
            <div>
              <label className="block text-xs font-bold text-[#121215] mb-1.5">
                Cohort / Project yang Ditugaskan
              </label>
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="w-full rounded-xl bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
              >
                {(cohortProjects || []).map((cp) => (
                  <option key={cp.id} value={cp.name}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Invitation Note */}
            <div>
              <label className="block text-xs font-bold text-[#121215] mb-1.5">
                Pesan Undangan (Opsional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hai, silakan bergabung untuk mengajar materi Social Media Specialist di Ruang Sosmed 2.0..."
                className="w-full rounded-xl bg-[#FFFFFF] p-3 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none transition-colors"
              />
            </div>

            {/* Information box */}
            <div className="rounded-xl bg-[#EEF2FF] border border-[#4F39F6]/20 p-3 text-[11px] text-[#4F39F6] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-[#312E81]">
                <CheckCircle2 size={13} className="text-[#4F39F6]" />
                Sistem Notifikasi &amp; Akses Terintegrasi:
              </p>
              <p className="text-[#4338CA] leading-snug">
                Undangan ini otomatis masuk ke{" "}
                <strong>Lonceng Notifikasi akun penerima</strong> di Ruang Sosmed
                dan dapat langsung dikonfirmasi oleh pengguna.
              </p>
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#EAECEF]">
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#5E5E5E] hover:bg-[#F8F9FB] border border-[#EAECEF] cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] text-white px-5 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Mengirim Undangan...</span>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Kirim Undangan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalDialog>
  );
}
