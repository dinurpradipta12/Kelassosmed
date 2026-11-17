"use client";

import React from "react";
import { BookOpen, Calendar, User, ArrowRight } from "lucide-react";
import type { ClassBlock } from "@/types/landing";

interface ClassBlockRendererProps {
  block: ClassBlock;
}

export function ClassBlockRenderer({ block }: ClassBlockRendererProps) {
  const sectionTitle = block.sectionTitle || block.title || (block.data && block.data.heading) || "Daftar Kelas & Jadwal Belajar";
  const classes = Array.isArray(block.classes) && block.classes.length > 0
    ? block.classes
    : [
        {
          id: "class-1",
          title: "Fundamental Social Media Specialist",
          instructor: "Dimas Suryo (Lead Specialist)",
          schedule: "Setiap Sabtu, 19:30 WIB",
          badge: "Batch Baru",
          level: "Pemula / Fundamental",
          price: "Rp 149.000",
        },
        {
          id: "class-2",
          title: "Content System & Creative Workflow",
          instructor: "Sarah Wijaya (Content Lead)",
          schedule: "Setiap Minggu, 14:00 WIB",
          badge: "Popular",
          level: "Intermediate",
          price: "Rp 199.000",
        },
      ];

  return (
    <div className="py-8 sm:py-12 border-t border-slate-100">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {sectionTitle}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Pilih kelas sesuai kebutuhan roadmap dan jadwal luang Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {classes.map((c, idx) => (
          <div
            key={c.id || idx}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-600">
                  {c.badge || "Kelas Live"}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {c.level || "Semua Level"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                {c.title}
              </h3>
              <div className="space-y-1 pt-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  <span>Pemateri: {c.instructor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Jadwal: {c.schedule}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">
                {c.price || "Gratis"}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold pointer-events-none"
              >
                <span>Daftar</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
