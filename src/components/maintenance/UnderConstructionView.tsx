"use client";

import React from "react";
import Link from "next/link";
import { Construction, Lock, ArrowLeft } from "lucide-react";
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
  const hasCustomImage = Boolean(config.customImageUrl?.trim());
  const isFullscreen = hasCustomImage && config.displayMode === "fullscreen";

  if (isFullscreen) {
    return (
      <main className="relative min-h-screen w-full bg-[#0B0C10] flex items-center justify-center overflow-hidden">
        <img
          src={config.customImageUrl}
          alt={config.title || "404 Web Under Construction"}
          className="w-full h-full min-h-screen max-h-screen object-contain select-none"
        />

        <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2">
          {isNotFoundRoute && (
            <Link
              href="/?admin=1"
              className="inline-flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:text-white transition-colors"
            >
              <Lock size={11} />
              <span>Admin Access</span>
            </Link>
          )}
          {!isNotFoundRoute && onOpenAdminLogin && (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <Lock size={11} />
              <span>Admin Access</span>
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-[#F8F9FB] text-[#121215] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white border border-[#EAECEF] shadow-[0_12px_40px_rgba(16,15,17,0.06)] overflow-hidden">
        {hasCustomImage ? (
          <div className="w-full bg-slate-50 border-b border-[#EAECEF] flex items-center justify-center">
            <img
              src={config.customImageUrl}
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

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            {isNotFoundRoute && (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Beranda</span>
              </Link>
            )}

            {isNotFoundRoute ? (
              <Link
                href="/?admin=1"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAECEF] hover:border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Lock size={12} />
                <span>Admin Access</span>
              </Link>
            ) : (
              onOpenAdminLogin && (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAECEF] hover:border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <Lock size={12} />
                  <span>Admin Access</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        &copy; {new Date().getFullYear()} Ruang Sosmed
      </p>
    </main>
  );
}
