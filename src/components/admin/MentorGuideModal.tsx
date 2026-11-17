"use client";

import React, { useState } from "react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import {
  BookOpen,
  Award,
  Users,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  FolderOpen,
  Zap,
} from "lucide-react";

interface MentorGuideModalProps {
  open: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export function MentorGuideModal({
  open,
  onClose,
  onShowToast,
}: MentorGuideModalProps) {
  const [activeTab, setActiveTab] = useState<
    "curriculum" | "grading" | "cohorts" | "support"
  >("curriculum");

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId="mentor-guide-modal-title"
      title="Ruang Sosmed 2.0 — Mentor Guide & Support"
      subtitle="Panduan komprehensif authoring konten, grading center, dan bantuan mentor Ruang Sosmed"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#EAECEF] pb-2 overflow-x-auto">
          {[
            { id: "curriculum", label: "Authoring Konten", icon: BookOpen },
            { id: "grading", label: "Grading Center", icon: Award },
            { id: "cohorts", label: "Cohorts & Siswa", icon: Users },
            { id: "support", label: "Hubungi Support", icon: HelpCircle },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-[#4F39F6] text-white shadow-2xs"
                    : "text-[#5E5E5E] hover:bg-[#F8F9FB] hover:text-[#121215]"
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Authoring Konten */}
        {activeTab === "curriculum" && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#10B981]" />
                <span>Membuat Course &amp; Page Modular</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Gunakan tombol ungu <strong>[+]</strong> pada sidebar kiri atau tombol <strong>[+ New Content]</strong> di Learning Content Explorer untuk mulai menulis bab. Anda dapat menyusun blok teks, paragraf, callout tips, dan kuis secara visual.
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#10B981]" />
                <span>Carousel Lesson &amp; Rich Media</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Materi jenis Carousel mendukung penataan slide gambar dan drag-and-drop urutan paragraf (⋮⋮). Siswa dapat membuka slide pembelajaran secara interaktif di Learner Classroom.
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#10B981]" />
                <span>Upload SCORM / PDF / Video Asset</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Gunakan tombol <strong>[Upload]</strong> di baris atas untuk mengimpor paket SCORM (.zip), dokumen panduan PDF, atau video tutorial langsung ke katalog konten.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Grading Center */}
        {activeTab === "grading" && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <Award size={13} className="text-[#F59E0B]" />
                <span>Pemeriksaan Esai &amp; Tugas Praktik</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Tugas praktik audiens persona dan esai kuis yang dikirimkan siswa akan masuk ke antrean <strong>Trainer Grading Center</strong>. Mentor dapat memberikan nilai skor poin per nomor dan umpan balik personal.
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <Award size={13} className="text-[#10B981]" />
                <span>Penerbitan Sertifikat Otomatis</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Saat mentor menandai tugas berstatus <strong>Passed</strong>, sistem secara otomatis membuka kunci e-sertifikat terverifikasi bagi siswa dan memperbarui gauge kelulusan di dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Cohorts & Siswa */}
        {activeTab === "cohorts" && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <Users size={13} className="text-[#4F39F6]" />
                <span>Manajemen Project / Cohort</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Anda dapat membuat dan mengganti nama cohort (misalnya <em>Ruang Sosmed Class</em> atau <em>Creator Growth Lab</em>) melalui tombol <strong>[+]</strong> di bawah seksi Projects / Cohorts pada sidebar sekunder.
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-1.5">
              <h4 className="text-xs font-bold text-[#121215] flex items-center gap-1.5">
                <Users size={13} className="text-[#0D9488]" />
                <span>Learners Directory</span>
              </h4>
              <p className="text-[11px] text-[#5E5E5E] leading-relaxed">
                Daftar siswa, status PRO, dan poin gamifikasi dapat dipantau secara real-time pada menu <strong>Learners</strong> di bilah navigasi kiri.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Hubungi Support */}
        {activeTab === "support" && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            <div className="rounded-xl bg-[#4F39F6]/5 border border-[#4F39F6]/20 p-4 space-y-2">
              <h4 className="text-xs font-bold text-[#4F39F6] flex items-center gap-1.5">
                <HelpCircle size={14} />
                <span>Pusat Bantuan &amp; Tim Dev Admin</span>
              </h4>
              <p className="text-xs text-[#121215] leading-relaxed">
                Butuh bantuan teknis atau ingin menambahkan fitur baru pada Studio LMS Ruang Sosmed 2.0? Silakan hubungi tim kami:
              </p>
              <div className="pt-1 space-y-1 text-xs text-[#5E5E5E]">
                <p>📧 Email: <strong className="text-[#121215]">admin@ruangsosmed.id</strong> / <strong className="text-[#121215]">dinurm.pradipta@gmail.com</strong></p>
                <p>💬 Community Discord &amp; Telegram: Ruang Sosmed Core Team</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#121215] hover:bg-[#27272A] text-white px-5 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
