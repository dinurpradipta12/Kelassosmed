"use client";

import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";
import { type DiscussionThread } from "@/lib/phase2-data";

interface AdminMentorInboxProps {
  currentUser?: AuthenticatedUser | null;
  onShowToast: (msg: string) => void;
}

function isMentorOrAdminRole(role?: string): boolean {
  const r = (role || "").toLowerCase();
  return r.includes("mentor") || r.includes("admin");
}

function isThreadAwaitingReply(thread: DiscussionThread): boolean {
  if (!thread.replies || thread.replies.length === 0) return false;
  const lastReply = thread.replies[thread.replies.length - 1];
  return !isMentorOrAdminRole(lastReply.authorRole);
}

export function AdminMentorInbox({
  currentUser,
  onShowToast,
}: AdminMentorInboxProps) {
  const {
    discussionThreads,
    postDiscussionMessage,
    deleteDiscussionThread,
    deleteDiscussionReply,
    reportedIssues,
    toggleReportedIssueStatus,
    resolveUserAvatar,
  } = useRuangSosmedStore();

  const [activeTab, setActiveTab] = useState<"messages" | "issues">("messages");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "needs-reply" | "replied"
  >("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDeleteThreadId, setConfirmDeleteThreadId] = useState<
    string | null
  >(null);

  const [issueFilter, setIssueFilter] = useState<"all" | "Open" | "Resolved">(
    "all"
  );

  const awaitingReplyCount = useMemo(
    () => (discussionThreads || []).filter(isThreadAwaitingReply).length,
    [discussionThreads]
  );

  const openIssuesCount = useMemo(
    () => (reportedIssues || []).filter((i) => i.status === "Open").length,
    [reportedIssues]
  );

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (discussionThreads || []).filter((thread) => {
      const awaiting = isThreadAwaitingReply(thread);
      if (statusFilter === "needs-reply" && !awaiting) return false;
      if (statusFilter === "replied" && awaiting) return false;

      if (!q) return true;
      const inTitle = thread.title.toLowerCase().includes(q);
      const inChapter = thread.chapterBadge.toLowerCase().includes(q);
      const inReplies = thread.replies.some(
        (r) =>
          r.message.toLowerCase().includes(q) ||
          r.authorName.toLowerCase().includes(q)
      );
      return inTitle || inChapter || inReplies;
    });
  }, [discussionThreads, searchQuery, statusFilter]);

  const activeThread = useMemo(() => {
    if (filteredThreads.length === 0) return null;
    if (selectedThreadId) {
      const found = filteredThreads.find((t) => t.id === selectedThreadId);
      if (found) return found;
    }
    return filteredThreads[0];
  }, [filteredThreads, selectedThreadId]);

  const filteredIssues = useMemo(() => {
    return (reportedIssues || []).filter((iss) => {
      if (issueFilter === "all") return true;
      return iss.status === issueFilter;
    });
  }, [reportedIssues, issueFilter]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread) return;
    const trimmed = replyText.trim();
    if (!trimmed) return;

    const mentorName = currentUser?.name || "Dinur M. Pradipta";
    const initials =
      mentorName
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "DP";

    postDiscussionMessage({
      threadId: activeThread.id,
      chapterTitle: activeThread.chapterBadge,
      authorName: mentorName,
      authorRole: "Lead Mentor",
      authorInitials: initials,
      avatarBg: "#FEF3C7",
      avatarText: "#92400E",
      message: trimmed,
    });

    setReplyText("");
    onShowToast("Balasan mentor terkirim ke siswa & tersinkronisasi.");
  };

  return (
    <div className="w-full px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header & Summary Metrics */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Inbox Pesan &amp; Konsultasi Siswa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola seluruh pesan dari tombol &ldquo;Hubungi Mentor&rdquo;,
            diskusi bab kelas, dan laporan kendala materi siswa.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">
              Total Percakapan
            </p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {discussionThreads.length}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">
              Menunggu Balasan
            </p>
            <p className="text-lg font-bold text-amber-600 tabular-nums">
              {awaitingReplyCount}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">
              Kendala Terbuka
            </p>
            <p className="text-lg font-bold text-rose-600 tabular-nums">
              {openIssuesCount}
            </p>
          </div>
        </div>
      </header>

      {/* 2. Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("messages")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "messages"
              ? "bg-[#4F39F6] text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <MessageSquare size={14} />
          <span>Pesan &amp; Diskusi Siswa ({discussionThreads.length})</span>
          {awaitingReplyCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                activeTab === "messages"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {awaitingReplyCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("issues")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "issues"
              ? "bg-[#4F39F6] text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <AlertCircle size={14} />
          <span>Laporan Kendala Materi ({reportedIssues.length})</span>
          {openIssuesCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                activeTab === "issues"
                  ? "bg-white/20 text-white"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {openIssuesCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: INBOX PESAN & DISKUSI SISWA */}
      {activeTab === "messages" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Conversation List */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, topik, atau kelas..."
                  className="w-full rounded-xl bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: "all" as const, label: "Semua" },
                  {
                    id: "needs-reply" as const,
                    label: `Perlu Dibalas (${awaitingReplyCount})`,
                  },
                  { id: "replied" as const, label: "Sudah Dibalas" },
                ].map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setStatusFilter(flt.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      statusFilter === flt.id
                        ? "bg-indigo-50 text-[#4F39F6]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Inbox size={26} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">
                    Belum ada pesan masuk
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Pesan dari tombol &ldquo;Hubungi Mentor&rdquo; atau diskusi
                    bab kelas siswa akan langsung muncul di sini.
                  </p>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = activeThread?.id === thread.id;
                  const awaiting = isThreadAwaitingReply(thread);
                  const lastMsg = thread.replies[thread.replies.length - 1];
                  const firstLearnerMsg =
                    thread.replies.find(
                      (r) => !isMentorOrAdminRole(r.authorRole)
                    ) || lastMsg;

                  const isConfirmingListDelete =
                    confirmDeleteThreadId === `list:${thread.id}`;

                  return (
                    <div
                      key={thread.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedThreadId(thread.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedThreadId(thread.id);
                        }
                      }}
                      className={`w-full text-left p-4 transition-colors cursor-pointer space-y-2 ${
                        isSelected
                          ? "bg-indigo-50/60"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const senderAvatar = resolveUserAvatar(
                              firstLearnerMsg?.authorName
                            );
                            if (senderAvatar) {
                              return (
                                <img
                                  src={senderAvatar}
                                  alt={firstLearnerMsg?.authorName || "Siswa"}
                                  className="h-7 w-7 shrink-0 rounded-full object-cover border border-slate-200"
                                />
                              );
                            }
                            return (
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                style={{
                                  backgroundColor:
                                    firstLearnerMsg?.avatarBg || "#EEF2FF",
                                  color: firstLearnerMsg?.avatarText || "#4F39F6",
                                }}
                              >
                                {firstLearnerMsg?.authorInitials || "S"}
                              </span>
                            );
                          })()}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {firstLearnerMsg?.authorName || "Siswa"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {thread.lastReplyLabel}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                              awaiting
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {awaiting ? (
                              <>
                                <Clock size={10} />
                                <span>Perlu Balasan</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={10} />
                                <span>Sudah Dibalas</span>
                              </>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteThreadId(
                                isConfirmingListDelete
                                  ? null
                                  : `list:${thread.id}`
                              );
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus diskusi ini (Admin Studio)"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {isConfirmingListDelete && (
                        <div
                          className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] font-semibold text-rose-700">
                            Hapus permanen dari sistem &amp; siswa?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDiscussionThread(thread.id);
                                setConfirmDeleteThreadId(null);
                                if (selectedThreadId === thread.id) {
                                  setSelectedThreadId(null);
                                }
                                onShowToast(
                                  "Diskusi berhasil dihapus permanen dan disembunyikan dari siswa."
                                );
                              }}
                              className="rounded-md bg-rose-600 hover:bg-rose-700 px-2 py-0.5 text-[10px] font-bold text-white cursor-pointer"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteThreadId(null);
                              }}
                              className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 max-w-full truncate">
                          {thread.chapterBadge}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {thread.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {lastMsg?.message || thread.excerpt}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Thread Conversation & Reply Form */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl bg-white border border-slate-200 flex flex-col min-h-[540px]">
            {!activeThread ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-2">
                <MessageSquare size={28} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">
                  Pilih percakapan untuk melihat detail
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Semua pertanyaan siswa dari halaman kelas maupun bab materi
                  dapat dibalas langsung dari panel ini.
                </p>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-[#4F39F6]">
                      {activeThread.chapterBadge}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {activeThread.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {activeThread.replies.length} pesan
                    </span>

                    {confirmDeleteThreadId === `header:${activeThread.id}` ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1">
                        <span className="text-[11px] font-semibold text-rose-700">
                          Yakin hapus?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const delId = activeThread.id;
                            deleteDiscussionThread(delId);
                            setConfirmDeleteThreadId(null);
                            if (selectedThreadId === delId) {
                              setSelectedThreadId(null);
                            }
                            onShowToast(
                              "Diskusi berhasil dihapus permanen dan disembunyikan dari siswa."
                            );
                          }}
                          className="rounded-md bg-rose-600 hover:bg-rose-700 px-2 py-0.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteThreadId(null)}
                          className="rounded-md bg-white border border-slate-200 hover:bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteThreadId(`header:${activeThread.id}`)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus diskusi ini (Admin Studio)"
                      >
                        <Trash2 size={13} />
                        <span>Hapus Diskusi</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 p-4 sm:p-5 bg-slate-50/50 space-y-3 overflow-y-auto max-h-[360px]">
                  {activeThread.replies.map((rep) => {
                    const isMentor = isMentorOrAdminRole(rep.authorRole);
                    const repAvatar = resolveUserAvatar(rep.authorName);
                    return (
                      <div
                        key={rep.id}
                        className={`flex flex-col ${
                          isMentor ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs space-y-1 ${
                            isMentor
                              ? "bg-[#4F39F6] text-white rounded-tr-xs"
                              : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between gap-3 text-[10px] font-semibold ${
                              isMentor ? "text-indigo-100" : "text-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {repAvatar ? (
                                <img
                                  src={repAvatar}
                                  alt={rep.authorName}
                                  className="h-5 w-5 rounded-full object-cover border border-white/40 shrink-0"
                                />
                              ) : (
                                <span
                                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                                  style={{
                                    backgroundColor: isMentor
                                      ? "rgba(255,255,255,0.2)"
                                      : rep.avatarBg || "#EEF2FF",
                                    color: isMentor
                                      ? "#FFFFFF"
                                      : rep.avatarText || "#4F39F6",
                                  }}
                                >
                                  {rep.authorInitials || "U"}
                                </span>
                              )}
                              <span>{rep.authorName}</span>
                              <span>•</span>
                              <span>{rep.authorRole}</span>
                              <span>•</span>
                              <span>{rep.timestamp}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const deletingWholeThread =
                                  activeThread.replies.length <= 1;
                                deleteDiscussionReply(activeThread.id, rep.id);
                                if (
                                  deletingWholeThread &&
                                  selectedThreadId === activeThread.id
                                ) {
                                  setSelectedThreadId(null);
                                }
                                onShowToast(
                                  deletingWholeThread
                                    ? "Diskusi berhasil dihapus permanen dan disembunyikan dari siswa."
                                    : "Pesan berhasil dihapus dari diskusi."
                                );
                              }}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded transition-colors cursor-pointer ${
                                isMentor
                                  ? "text-indigo-200 hover:bg-white/20 hover:text-white"
                                  : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              }`}
                              title="Hapus pesan ini (Admin Studio)"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {rep.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Composer */}
                <form
                  onSubmit={handleSendReply}
                  className="p-4 border-t border-slate-100 bg-white space-y-3"
                >
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tulis balasan mentor untuk siswa..."
                    className="w-full rounded-xl bg-slate-50 p-3 text-xs text-slate-900 border border-slate-200 focus:bg-white focus:border-[#4F39F6] focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">
                      Balasan otomatis muncul di modal &ldquo;Hubungi
                      Mentor&rdquo; &amp; notifikasi siswa.
                    </span>
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white cursor-pointer shrink-0"
                    >
                      <Send size={13} />
                      <span>Kirim Balasan</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: LAPORAN KENDALA MATERI */
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Kendala Dilaporkan Siswa
            </h2>
            <div className="flex items-center gap-1.5">
              {[
                { id: "all" as const, label: `Semua (${reportedIssues.length})` },
                { id: "Open" as const, label: `Open (${openIssuesCount})` },
                {
                  id: "Resolved" as const,
                  label: `Resolved (${Math.max(
                    0,
                    reportedIssues.length - openIssuesCount
                  )})`,
                },
              ].map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => setIssueFilter(flt.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    issueFilter === flt.id
                      ? "bg-indigo-50 text-[#4F39F6]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 size={26} className="mx-auto text-emerald-400" />
              <p className="text-xs font-semibold text-slate-700">
                Tidak ada laporan kendala materi
              </p>
              <p className="text-[11px] text-slate-400">
                Laporan kendala dari fitur &ldquo;Laporkan Kendala&rdquo; di
                ruang belajar siswa akan tampil di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          issue.status === "Open"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {issue.status === "Open" ? "Open" : "Resolved"}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Bab: {issue.chapter}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Pelapor: {issue.reporter} • {issue.reportedAt}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-900">
                      {issue.title}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toggleReportedIssueStatus(issue.id);
                      onShowToast(
                        issue.status === "Open"
                          ? "Laporan ditandai selesai (Resolved)."
                          : "Laporan dibuka kembali (Open)."
                      );
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                      issue.status === "Open"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {issue.status === "Open" ? (
                      <>
                        <Check size={13} />
                        <span>Tandai Selesai</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw size={13} />
                        <span>Buka Kembali</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
