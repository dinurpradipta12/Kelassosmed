"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Users, Award } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/SaasUI";
import { fetchClassResults } from "@/lib/lms-builder-store";
import type { CourseBuilderItem, ClassResultSubmission } from "@/types/lms-builder";

interface ClassResultsViewProps {
  course: CourseBuilderItem;
  theme: "light" | "dark";
  onBack: () => void;
}

export function ClassResultsView({
  course,
  theme,
  onBack,
}: ClassResultsViewProps) {
  const [results, setResults] = useState<ClassResultSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassResults(course.id)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [course.id]);

  const passedCount = results.filter((r) => r.passed).length;
  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] pb-16 transition-colors"
    >
      <header className="sticky top-10 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack}>
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </Button>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[var(--text)]">
                Hasil &amp; Review Peserta
              </h1>
              <p className="text-[11px] text-[var(--muted)]">{course.title}</p>
            </div>
          </div>
          <Badge variant="accent">Passing Score: {course.postTest.passingScore}%</Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padded className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Users size={18} />
            </span>
            <div>
              <p className="text-lg font-extrabold text-[var(--text)]">{results.length}</p>
              <p className="text-xs text-[var(--muted)]">Total Pengumpulan</p>
            </div>
          </Card>
          <Card padded className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-text)]">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <p className="text-lg font-extrabold text-[var(--text)]">{passedCount}</p>
              <p className="text-xs text-[var(--muted)]">Lulus Post-Test</p>
            </div>
          </Card>
          <Card padded className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
              <Award size={18} />
            </span>
            <div>
              <p className="text-lg font-extrabold text-[var(--text)]">{avgScore}%</p>
              <p className="text-xs text-[var(--muted)]">Rata-rata Skor</p>
            </div>
          </Card>
        </div>

        <Card padded className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--text)]">
            Daftar Hasil Peserta
          </h2>

          {loading ? (
            <p className="text-xs text-[var(--muted)] py-6 text-center">
              Memuat hasil peserta...
            </p>
          ) : results.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-8 text-center">
              Belum ada peserta yang mengumpulkan post-test atau review pada kelas ini.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[var(--text)]">
                        {res.participantName}
                      </p>
                      <Badge variant={res.passed ? "success" : "danger"}>
                        {res.passed ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <XCircle size={11} />
                        )}
                        {res.passed ? "Lulus" : "Belum Lulus"} ({res.score}%)
                      </Badge>
                      <Badge>Attempt #{res.attempt}</Badge>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      {res.participantEmail} •{" "}
                      {new Date(res.submittedAt).toLocaleString("id-ID")}
                    </p>
                    {res.feedback && (
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)]">
                        <MessageSquare size={13} className="text-[var(--accent)] mt-0.5 shrink-0" />
                        <span>{res.feedback}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
