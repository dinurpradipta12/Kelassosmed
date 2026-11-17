"use client";

import React from "react";
import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import type { MaintenanceConfig } from "@/context/RuangSosmedStore";

interface UnderConstructionViewProps {
  config: MaintenanceConfig;
  onOpenAdminLogin?: () => void;
  isNotFoundRoute?: boolean;
}

export function UnderConstructionView({
  config,
  onOpenAdminLogin,
  isNotFoundRoute = false,
}: UnderConstructionViewProps) {
  const rawImg = config.customImageUrl?.trim();
  const resolvedImageUrl = rawImg === "none" ? "" : rawImg || "/404.svg";
  const hasCustomImage = Boolean(resolvedImageUrl);
  const isFullscreen = hasCustomImage && config.displayMode === "fullscreen";

  const dotTriggerClass =
    "text-slate-300/60 hover:text-slate-400 text-sm font-bold leading-none select-none p-1.5 cursor-pointer transition-colors";

  if (isFullscreen) {
    return (
      <main className="relative min-h-screen w-full bg-[#0B0C10] flex items-center justify-center overflow-hidden">
        <img
          src={resolvedImageUrl}
          alt={config.title || "404 Web Under Construction"}
          className="w-full h-full min-h-screen max-h-screen object-contain select-none"
        />

        {onOpenAdminLogin ? (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            aria-label="Admin Login"
            className={`fixed top-3 right-3.5 z-30 ${dotTriggerClass}`}
          >
            .
          </button>
        ) : (
          isNotFoundRoute && (
            <Link
              href="/?admin=1"
              aria-label="Admin Login"
              className={`fixed top-3 right-3.5 z-30 ${dotTriggerClass}`}
            >
              .
            </Link>
          )
        )}
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-[#F8F9FB] text-[#121215] flex flex-col items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-[#EAECEF] shadow-[0_12px_40px_rgba(16,15,17,0.06)] overflow-hidden">
        {onOpenAdminLogin ? (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            aria-label="Admin Login"
            className={`absolute top-3 right-3.5 z-20 ${dotTriggerClass}`}
          >
            .
          </button>
        ) : (
          isNotFoundRoute && (
            <Link
              href="/?admin=1"
              aria-label="Admin Login"
              className={`absolute top-3 right-3.5 z-20 ${dotTriggerClass}`}
            >
              .
            </Link>
          )
        )}
        {hasCustomImage ? (
          <div className="w-full bg-slate-50 border-b border-[#EAECEF] flex items-center justify-center">
            <img
              src={resolvedImageUrl}
              alt={config.title || "404 Web Under Construction"}
              className="w-full max-h-[420px] object-contain"
            />
          </div>
        ) : (
          <div className="px-6 pt-10 pb-4 flex flex-col items-center justify-center bg-gradient-to-b from-[#4F39F6]/[0.05] to-transparent">
            <div className="h-14 w-14 rounded-2xl bg-[#4F39F6]/10 border border-[#4F39F6]/20 flex items-center justify-center text-[#4F39F6] mb-4">
              <Construction size={28} />
            </div>
            <div className="text-6xl sm:text-7xl font-black tracking-tighter text-[#121215]/90 leading-none select-none">
              404
            </div>
          </div>
        )}

        <div className="px-6 sm:px-10 py-8 text-center space-y-3">
          {config.badgeText?.trim() && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#4F39F6]/10 px-3 py-1 text-[11px] font-bold tracking-wide text-[#4F39F6]">
              <span>{config.badgeText}</span>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#121215]">
            {config.title || "Ruang Sosmed Sedang Dalam Pengembangan"}
          </h1>

          <p className="text-xs sm:text-sm text-[#5E5E5E] max-w-lg mx-auto leading-relaxed">
            {config.subtitle ||
              "Halaman ini sementara ditutup untuk persiapan peluncuran. Silakan kembali lagi dalam waktu dekat."}
          </p>

          {isNotFoundRoute && (
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        &copy; {new Date().getFullYear()} Ruang Sosmed
      </p>
    </main>
  );
}
