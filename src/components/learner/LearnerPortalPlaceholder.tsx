"use client";

import React from "react";
import { GraduationCap, ArrowLeft, BookOpen, Award, CheckCircle2 } from "lucide-react";
import { CONTENT_TYPES_LIST } from "@/lib/design-tokens";
import { ContentBadge } from "@/components/ui/ContentBadge";

interface LearnerPortalPlaceholderProps {
  onBackToAdmin: () => void;
}

export function LearnerPortalPlaceholder({
  onBackToAdmin,
}: LearnerPortalPlaceholderProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FB] px-6 py-16 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl rounded-xl bg-[#FFFFFF] p-8 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.04)]">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#EAECEF]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden border border-[#EAECEF] bg-white p-0.5">
              <img src="/favicon.png" alt="rs." className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#4F39F6]">
                <GraduationCap size={12} />
                Learner Portal Preview
              </span>
              <h1 className="text-lg font-bold text-[#121215] mt-1">
                Ruang Sosmed 2.0 — Learner Experience
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToAdmin}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Admin Studio</span>
          </button>
        </div>

        <div className="py-6 space-y-5">
          <p className="text-xs text-[#5E5E5E] leading-relaxed">
            You are currently viewing the{" "}
            <strong className="text-[#121215]">Learner Portal</strong> mode via
            the Global Role Switcher. Full learner course player, interactive
            quizzes, assignment uploads, and personal mastery paths will be
            populated in <strong className="text-[#121215]">Phase 5</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF]">
              <BookOpen size={16} className="text-[#0EA5E9] mb-2" />
              <p className="text-xs font-semibold text-[#121215]">
                Enrolled Tracks
              </p>
              <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                Meta Ads, TikTok Shop &amp; Creator Growth
              </p>
            </div>
            <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF]">
              <CheckCircle2 size={16} className="text-[#10B981] mb-2" />
              <p className="text-xs font-semibold text-[#121215]">
                 Quizzes &amp; Capstones
              </p>
              <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                Real-time rubric grading &amp; feedback
              </p>
            </div>
            <div className="rounded-xl bg-[#F8F9FB] p-4 border border-[#EAECEF]">
              <Award size={16} className="text-[#F59E0B] mb-2" />
              <p className="text-xs font-semibold text-[#121215]">
                Mastery Leaderboard
              </p>
              <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                Earn ★ points &amp; verified certificates
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2.5">
              Supported Learning Content Badges
            </p>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES_LIST.map((type) => (
                <ContentBadge key={type} type={type} size="md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
