"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Sun,
  Moon,
  BookOpen,
  Video,
  Files,
  BarChart2,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/SaasUI";
import {
  fetchAdminCourses,
  saveAdminCourse,
  deleteAdminCourse,
  getSavedBuilderTheme,
  saveBuilderTheme,
} from "@/lib/lms-builder-store";
import {
  type CourseBuilderItem,
  type LmsSpaceType,
  createEmptyCourse,
  generateShortCode,
} from "@/types/lms-builder";
import { CourseEditorView } from "./CourseEditorView";
import { ClassResultsView } from "./ClassResultsView";

interface LmsBuilderDashboardProps {
  initialSpaceType?: LmsSpaceType;
  initialCourseId?: string;
  initialViewMode?: "list" | "editor" | "results";
  onShowToast?: (msg: string) => void;
  topActionSlot?: React.ReactNode;
}

export function LmsBuilderDashboard({
  initialSpaceType = "product_tutorial",
  initialCourseId,
  initialViewMode = "list",
  onShowToast,
  topActionSlot,
}: LmsBuilderDashboardProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [spaceType, setSpaceType] = useState<LmsSpaceType>(initialSpaceType);
  const [courses, setCourses] = useState<CourseBuilderItem[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "editor" | "results">(
    initialViewMode
  );
  const [activeCourse, setActiveCourse] = useState<CourseBuilderItem | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  useEffect(() => {
    setTheme(getSavedBuilderTheme());
  }, []);

  useEffect(() => {
    fetchAdminCourses().then((list) => {
      setCourses(list);
      if (initialCourseId) {
        const found = list.find(
          (c) => c.id === initialCourseId || c.shortCode === initialCourseId
        );
        if (found) {
          setActiveCourse(found);
          setSpaceType(found.spaceType);
        }
      }
    });
  }, [initialCourseId]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      saveBuilderTheme(next);
      return next;
    });
  };

  const handleCreateCourse = async () => {
    const newCourse = createEmptyCourse(spaceType);
    const saved = await saveAdminCourse(newCourse);
    setCourses((prev) => [saved, ...prev]);
    setActiveCourse(saved);
    setViewMode("editor");
    notify(
      spaceType === "recorded_class"
        ? "Kelas rekaman baru dibuat."
        : "Kursus baru dibuat."
    );
  };

  const handleDuplicateClass = async (course: CourseBuilderItem) => {
    const now = Date.now();
    const copy: CourseBuilderItem = {
      ...JSON.parse(JSON.stringify(course)),
      id: `course-${now}`,
      shortCode: generateShortCode(now),
      title: `${course.title} (Copy)`,
      published: false,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
    const saved = await saveAdminCourse(copy);
    setCourses((prev) => [saved, ...prev]);
    notify(`Berhasil menduplikasi "${course.title}" beserta post-test.`);
  };

  const handleCopyLink = (course: CourseBuilderItem) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/c/${course.shortCode}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedId(course.id);
    setTimeout(() => setCopiedId((cur) => (cur === course.id ? null : cur)), 2000);
    notify(`Link disalin: /c/${course.shortCode}`);
  };

  const handleDelete = async (id: string) => {
    const next = await deleteAdminCourse(id);
    setCourses(next);
    notify("Kursus dihapus permanen.");
  };

  if (viewMode === "editor" && activeCourse) {
    return (
      <CourseEditorView
        initialCourse={activeCourse}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSave={async (updated) => {
          const saved = await saveAdminCourse(updated);
          setActiveCourse(saved);
          setCourses((prev) => {
            const exists = prev.some((c) => c.id === saved.id);
            return exists
              ? prev.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...prev];
          });
        }}
        onBack={() => setViewMode("list")}
        onShowToast={notify}
      />
    );
  }

  if (viewMode === "results" && activeCourse) {
    return (
      <ClassResultsView
        course={activeCourse}
        theme={theme}
        onBack={() => setViewMode("list")}
      />
    );
  }

  const filteredCourses = courses.filter((c) => c.spaceType === spaceType);

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] transition-colors pb-16"
    >
      {/* Top SaaS Header */}
      <header className="sticky top-10 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[var(--text)]">
                LMS &amp; Landing Page Builder
              </h1>
              <p className="text-xs text-[var(--muted)]">
                Kelola halaman kursus publik, materi video/teks, mentor, dan kelas rekaman.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {topActionSlot}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleTheme}
              title="Toggle Light / Dark Mode"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </Button>
            <Button variant="primary" size="md" onClick={handleCreateCourse}>
              <Plus size={15} />
              <span>
                {spaceType === "recorded_class"
                  ? "Tambah Kelas"
                  : "Tambah Kursus"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Space Type Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 gap-1">
            <button
              type="button"
              onClick={() => setSpaceType("product_tutorial")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                spaceType === "product_tutorial"
                  ? "bg-[var(--accent)] text-white shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <BookOpen size={14} />
              <span>Daftar Kursus (/admin/products)</span>
            </button>
            <button
              type="button"
              onClick={() => setSpaceType("recorded_class")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                spaceType === "recorded_class"
                  ? "bg-[var(--accent)] text-white shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Video size={14} />
              <span>Kelas Rekaman (/admin/classes)</span>
            </button>
          </div>

          <Badge variant="accent">{filteredCourses.length} Item</Badge>
        </div>

        {/* Responsive 1 / 2 / 3 Column Grid */}
        {filteredCourses.length === 0 ? (
          <Card padded className="py-14 text-center space-y-3">
            <p className="text-sm font-bold text-[var(--text)]">
              Belum ada{" "}
              {spaceType === "recorded_class" ? "kelas rekaman" : "kursus"}
            </p>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
              Klik tombol di atas untuk membuat{" "}
              {spaceType === "recorded_class" ? "kelas rekaman" : "kursus"} baru
              dan langsung mengedit materinya.
            </p>
            <Button variant="primary" onClick={handleCreateCourse}>
              <Plus size={14} />
              <span>
                {spaceType === "recorded_class"
                  ? "Tambah Kelas"
                  : "Tambah Kursus"}
              </span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="overflow-hidden flex flex-col justify-between hover:border-[var(--accent)]/50 transition-all"
              >
                <div>
                  {/* 16:9 Thumbnail */}
                  <div className="relative aspect-video w-full bg-[var(--surface-muted)] border-b border-[var(--border)] overflow-hidden">
                    {course.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.coverUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
                        style={{
                          objectPosition: course.coverPosition || "50% 50%",
                        }}
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center text-white font-bold text-sm px-4 text-center"
                        style={{
                          background:
                            "linear-gradient(135deg, #4F39F6 0%, #7C3AED 55%, #EC4899 100%)",
                        }}
                      >
                        {course.title}
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant={course.published ? "success" : "default"}>
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    {/* Colored Category Chips */}
                    {course.categories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {course.categories.map((cat, idx) => (
                          <span
                            key={`${cat.label}-${idx}`}
                            className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: cat.color }}
                          >
                            {cat.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="text-sm font-bold text-[var(--text)] line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-soft)] flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveCourse(course);
                      setViewMode("editor");
                    }}
                  >
                    <Edit3 size={12} />
                    <span>Edit Content</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(course)}
                  >
                    {copiedId === course.id ? (
                      <>
                        <Check size={12} className="text-[#10B981]" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>

                  <a
                    href={`/c/${course.shortCode}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Buka halaman publik di tab baru"
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] p-1.5 text-[var(--text)] transition-colors"
                  >
                    <ExternalLink size={13} />
                  </a>

                  {course.spaceType === "recorded_class" && (
                    <>
                      <Button
                        variant="yellow"
                        size="sm"
                        onClick={() => handleDuplicateClass(course)}
                        title="Duplicate Class & Post-Test"
                      >
                        <Files size={12} />
                      </Button>
                      <Button
                        variant="green"
                        size="sm"
                        onClick={() => {
                          setActiveCourse(course);
                          setViewMode("results");
                        }}
                        title="Hasil & Review Peserta"
                      >
                        <BarChart2 size={12} />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(course.id)}
                    title="Hapus permanen"
                    className="ml-auto"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
