"use client";

import React, { useEffect, useState } from "react";
import {
  PlayCircle,
  FileText,
  Clock,
  Paperclip,
  ExternalLink,
  AtSign,
  Briefcase,
  Globe,
  Sun,
  Moon,
  CheckCircle2,
  Award,
} from "lucide-react";
import { Card, Button, Badge, Input, Textarea } from "@/components/ui/SaasUI";
import {
  fetchPublicCourse,
  logCourseVisitEvent,
  submitPublicClassResult,
} from "@/lib/lms-builder-store";
import {
  supabasePublic,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  type CourseBuilderItem,
  getYouTubeEmbedUrl,
} from "@/types/lms-builder";

interface PublicCoursePlayerProps {
  courseIdOrCode: string;
}

export function PublicCoursePlayer({
  courseIdOrCode,
}: PublicCoursePlayerProps) {
  const [course, setCourse] = useState<CourseBuilderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMatId, setActiveMatId] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState<"materials" | "posttest">(
    "materials"
  );

  // Post-test & feedback state
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbackText, setFeedbackText] = useState("");
  const [submittedResult, setSubmittedResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchPublicCourse(courseIdOrCode);
      if (!active) return;
      setCourse(data);
      if (data?.materials?.[0]) {
        setActiveMatId((prev) => prev || data.materials[0].id);
      }
      setLoading(false);
      if (data?.id) {
        logCourseVisitEvent(data.id);
      }
    };
    load();

    if (isSupabaseConfigured) {
      const channel = supabasePublic
        .channel(`public_revisions_${courseIdOrCode}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "public_content_revisions" },
          () => {
            load();
          }
        )
        .subscribe();
      return () => {
        active = false;
        supabasePublic.removeChannel(channel);
      };
    }

    return () => {
      active = false;
    };
  }, [courseIdOrCode]);

  if (loading) {
    return (
      <div
        data-theme={theme}
        className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] flex items-center justify-center p-6"
      >
        <p className="text-sm font-medium text-[var(--muted)]">
          Memuat materi kursus...
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <div
        data-theme={theme}
        className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] flex items-center justify-center p-6"
      >
        <Card padded className="max-w-md w-full text-center space-y-3">
          <h1 className="text-base font-bold text-[var(--text)]">
            Kursus Tidak Ditemukan atau Belum Dipublikasikan
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Pastikan link benar dan kursus berstatus published = true.
          </p>
        </Card>
      </div>
    );
  }

  const activeMaterial =
    course.materials.find((m) => m.id === activeMatId) || course.materials[0];
  const embedUrl =
    activeMaterial?.type === "video" && activeMaterial.youtubeUrl
      ? getYouTubeEmbedUrl(activeMaterial.youtubeUrl)
      : null;

  const handleSubmitPostTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const qs = course.postTest.questions;
    let earned = 0;
    let total = 0;
    qs.forEach((q) => {
      total += q.points || 20;
      if (q.type === "essay") {
        if ((answers[q.id] || "").trim().length > 0) earned += q.points || 20;
      } else if (answers[q.id] === q.correctAnswer) {
        earned += q.points || 20;
      }
    });
    const score = total > 0 ? Math.round((earned / total) * 100) : 100;
    const passed = score >= (course.postTest.passingScore || 70);

    await submitPublicClassResult({
      id: `res-${Date.now()}`,
      courseId: course.id,
      participantName: participantName.trim() || "Peserta",
      participantEmail: participantEmail.trim() || "peserta@ruangsosmed.id",
      score,
      passed,
      attempt: 1,
      feedback: feedbackText.trim() || undefined,
      answers,
      submittedAt: new Date().toISOString(),
    });
    setSubmittedResult({ score, passed });
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] transition-colors pb-16"
    >
      {/* Sticky Brand Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.png"
              alt="Ruang Sosmed"
              className="h-8 w-8 rounded-lg border border-[var(--border)] object-contain bg-white p-0.5"
            />
            <div>
              <p className="text-xs font-bold text-[var(--text)] leading-tight">
                Ruang Sosmed 2.0
              </p>
              <p className="text-[10px] text-[var(--muted)]">Learning Space</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="accent">
              {course.materials.length} Materi
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area (2/3) */}
        <div className="lg:col-span-8 space-y-5">
          <Card padded className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {course.categories.map((cat, idx) => (
                <span
                  key={`${cat.label}-${idx}`}
                  className="rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.label}
                </span>
              ))}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
                {course.title}
              </h1>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                {course.description}
              </p>
            </div>

            {course.spaceType === "recorded_class" &&
              course.postTest.enabled && (
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                  <Button
                    variant={activeTab === "materials" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setActiveTab("materials")}
                  >
                    Materi Kelas
                  </Button>
                  <Button
                    variant={activeTab === "posttest" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setActiveTab("posttest")}
                  >
                    Post-Test &amp; Feedback
                  </Button>
                </div>
              )}
          </Card>

          {activeTab === "materials" && activeMaterial ? (
            <Card padded className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">
                  {activeMaterial.title}
                </h2>
                {activeMaterial.duration && (
                  <Badge>
                    <Clock size={11} />
                    {activeMaterial.duration}
                  </Badge>
                )}
              </div>

              {activeMaterial.type === "video" ? (
                embedUrl ? (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                    <iframe
                      src={embedUrl}
                      title={activeMaterial.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] flex items-center justify-center text-xs text-[var(--muted)]">
                    Video YouTube belum ditautkan pada materi ini.
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm leading-relaxed whitespace-pre-wrap text-[var(--text)]">
                  {activeMaterial.content || "Belum ada konten teks."}
                </div>
              )}

              {activeMaterial.notes && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 space-y-1">
                  <p className="text-xs font-bold text-[var(--text)]">
                    Deskripsi Materi
                  </p>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    {activeMaterial.notes}
                  </p>
                </div>
              )}
            </Card>
          ) : activeTab === "posttest" ? (
            <Card padded className="space-y-4">
              <h2 className="text-base font-bold text-[var(--text)]">
                Post-Test &amp; Feedback Kelas
              </h2>
              {submittedResult ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center space-y-2">
                  <Award
                    size={28}
                    className={
                      submittedResult.passed
                        ? "mx-auto text-[var(--success-text)]"
                        : "mx-auto text-[#F59E0B]"
                    }
                  />
                  <p className="text-base font-bold text-[var(--text)]">
                    Skor Anda: {submittedResult.score}%
                  </p>
                  <Badge variant={submittedResult.passed ? "success" : "danger"}>
                    {submittedResult.passed ? "Lulus" : "Belum Mencapai Passing Score"}
                  </Badge>
                </div>
              ) : (
                <form onSubmit={handleSubmitPostTest} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      required
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="Nama Lengkap"
                    />
                    <Input
                      required
                      type="email"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                  {course.postTest.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 space-y-2"
                    >
                      <p className="text-xs font-bold text-[var(--text)]">
                        {idx + 1}. {q.question}
                      </p>
                      {q.type === "essay" ? (
                        <Textarea
                          rows={3}
                          value={answers[q.id] || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          placeholder="Jawaban Anda..."
                        />
                      ) : (
                        <div className="space-y-1.5">
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`ans-${q.id}`}
                                checked={answers[q.id] === opt}
                                onChange={() =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: opt,
                                  }))
                                }
                                className="accent-[var(--accent)]"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {course.overallFeedbackEnabled && (
                    <Textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Bagikan feedback atau review Anda tentang kelas ini..."
                    />
                  )}
                  <Button type="submit" variant="primary">
                    <CheckCircle2 size={14} />
                    <span>Kirim Jawaban</span>
                  </Button>
                </form>
              )}
            </Card>
          ) : null}
        </div>

        {/* Right Sidebar (1/3) */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Profil Mentor */}
          <Card padded className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--accent-soft)] flex items-center justify-center font-bold text-sm text-[var(--accent)] shrink-0">
                {course.mentor.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.mentor.avatarUrl}
                    alt={course.mentor.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  course.mentor.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text)] truncate">
                  {course.mentor.name}
                </h3>
                <p className="text-xs text-[var(--muted)] truncate">
                  {course.mentor.role}
                </p>
              </div>
            </div>
            {course.mentor.bio && (
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {course.mentor.bio}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {course.mentor.website && (
                <a
                  href={course.mentor.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Globe size={12} />
                  <span>Website</span>
                </a>
              )}
              {course.mentor.instagram && (
                <a
                  href={course.mentor.instagram}
                  target="_blank"
                  rel="noreferrer"
                  title="Instagram"
                  className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] hover:border-[var(--accent)]"
                >
                  <AtSign size={13} />
                </a>
              )}
              {course.mentor.linkedin && (
                <a
                  href={course.mentor.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  title="LinkedIn"
                  className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text)] hover:border-[var(--accent)]"
                >
                  <Briefcase size={13} />
                </a>
              )}
            </div>
          </Card>

          {/* Daftar Kurikulum Materi */}
          <Card padded className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text)]">
              Kurikulum Materi
            </h3>
            <ul className="space-y-1.5">
              {course.materials.map((mat, idx) => {
                const isActive = mat.id === activeMaterial?.id;
                return (
                  <li key={mat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMatId(mat.id);
                        setActiveTab("materials");
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold border border-[var(--accent)]/25"
                          : "bg-[var(--surface-soft)] text-[var(--text)] hover:bg-[var(--surface-muted)] border border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {mat.type === "video" ? (
                          <PlayCircle size={14} className="shrink-0" />
                        ) : (
                          <FileText size={14} className="shrink-0" />
                        )}
                        <span className="truncate">
                          {idx + 1}. {mat.title}
                        </span>
                      </span>
                      {mat.duration && (
                        <span className="text-[10px] text-[var(--muted)] shrink-0">
                          {mat.duration}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Asset Pendukung */}
          {course.assets.length > 0 && (
            <Card padded className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text)]">
                Asset Pendukung
              </h3>
              <ul className="space-y-2">
                {course.assets.map((asset) => (
                  <li key={asset.id}>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--accent)] px-3 py-2 text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Paperclip size={13} className="text-[var(--accent)] shrink-0" />
                        <span className="font-semibold text-[var(--text)] truncate">
                          {asset.name}
                        </span>
                      </span>
                      <ExternalLink size={12} className="text-[var(--muted)] shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </main>
    </div>
  );
}
