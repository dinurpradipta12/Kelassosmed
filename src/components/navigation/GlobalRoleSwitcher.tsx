"use client";

import React from "react";
import {
  ShieldCheck,
  GraduationCap,
  Search,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";

export type AppRoleMode = "admin" | "learner";

export interface AuthenticatedUser {
  name: string;
  email: string;
  role: "admin" | "learner";
  username?: string;
  avatarUrl?: string;
}

interface GlobalRoleSwitcherProps {
  mode: AppRoleMode;
  onChange: (mode: AppRoleMode) => void;
  onOpenSearch?: () => void;
  leftOffsetClass?: string;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  currentUser?: AuthenticatedUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export function GlobalRoleSwitcher({
  mode,
  onChange,
  onOpenSearch,
  leftOffsetClass = "",
  sidebarOpen,
  onToggleSidebar,
  currentUser,
  onOpenAuth,
  onLogout,
}: GlobalRoleSwitcherProps) {
  const { resolveUserAvatar } = useRuangSosmedStore();

  // STRICT: Derive effective role ONLY from the server-verified authenticated user profile.
  // Never trust client-side localStorage role overrides or name/email string heuristics.
  const effectiveRole = (currentUser?.role || "learner").toLowerCase().trim();

  // STRICT: Only genuine Admins or Mentors can see or access Admin Studio. Learners NEVER see Admin Studio.
  const isAdmin = effectiveRole === "admin" || effectiveRole === "mentor";

  // Auto-switch to learner portal if user is no longer an Admin
  React.useEffect(() => {
    if (!isAdmin && mode === "admin") {
      onChange("learner");
    }
  }, [isAdmin, mode, onChange]);

  return (
    <div
      role="region"
      aria-label="Workspace navigation and user status"
      className={`sticky top-0 z-40 h-10 bg-[#FFFFFF]/95 backdrop-blur-xs border-b border-[#EAECEF] transition-[padding-left] duration-150 ease-out ${leftOffsetClass}`}
    >
      <div className="w-full h-full px-4 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: Workspace Mode Status Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#5E5E5E] min-w-0">
            <span className="h-2 w-2 rounded-full bg-[#10B981] shrink-0" />
            <span className="truncate">
              Ruang Sosmed 2.0 •{" "}
              <strong className="text-[#121215]">
                {mode === "admin" && isAdmin
                  ? "Admin & Mentor Studio"
                  : "Student Learner Portal"}
              </strong>
            </span>
          </span>
        </div>

        {/* Right: Role Switcher (Admin ONLY) + Global Search (⌘K) + User Profile / Logout */}
        <div
          role="group"
          aria-label="Navigasi dan status profil pengguna"
          className="flex items-center gap-1.5 shrink-0"
        >
          {/* Role Switcher Pill: HANYA tampil untuk role Admin Developer. Learner sama sekali TIDAK BISA melihat / mengakses Admin Studio */}
          {isAdmin && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]">
              <button
                type="button"
                onClick={() => onChange("admin")}
                aria-pressed={mode === "admin"}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  mode === "admin"
                    ? "bg-[#4F39F6] text-white shadow-2xs"
                    : "text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                <ShieldCheck size={12} strokeWidth={2.2} />
                <span>Admin Studio</span>
              </button>

              <button
                type="button"
                onClick={() => onChange("learner")}
                aria-pressed={mode === "learner"}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  mode === "learner"
                    ? "bg-[#4F39F6] text-white shadow-2xs"
                    : "text-[#5E5E5E] hover:text-[#121215]"
                }`}
              >
                <GraduationCap size={12} strokeWidth={2.2} />
                <span>Learner Portal</span>
              </button>
            </div>
          )}

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              title="Global Search (Cmd/Ctrl + K)"
              aria-label="Open Global Search (Cmd/Ctrl + K)"
              className="inline-flex items-center gap-1 rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF]/70 px-2.5 py-1 text-[11px] font-semibold text-[#5E5E5E] hover:text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
            >
              <Search size={11} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="rounded bg-[#FFFFFF] px-1 py-0.2 text-[10px] text-[#9CA3AF] border border-[#EAECEF]">
                ⌘K
              </kbd>
            </button>
          )}

          {/* User Auth Status / Login Button */}
          {currentUser ? (
            (() => {
              const effectiveAvatar =
                currentUser.avatarUrl ||
                resolveUserAvatar(
                  currentUser.email,
                  currentUser.name,
                  currentUser.username
                ) ||
                (isAdmin ? "/avatars/Frame 23.png" : "");
              return (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#EAECEF]">
              <span
                title={`Login aktif: ${currentUser.email} (${currentUser.role})`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6]/10 px-2 py-1 text-[11px] font-bold text-[#4F39F6]"
              >
                {effectiveAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={effectiveAvatar}
                    alt={currentUser.name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <User size={12} />
                )}
                <span className="max-w-[100px] truncate">
                  {currentUser.name
                    ? `@${currentUser.name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "")}`
                    : `@${currentUser.username || "user"}`}
                </span>
                {isAdmin && (
                  <span className="rounded bg-[#4F39F6] px-1 py-0.2 text-[9px] font-extrabold text-white">
                    DEV
                  </span>
                )}
              </span>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Keluar dari akun (Logout)"
                  aria-label="Logout"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2]/60 transition-colors cursor-pointer"
                >
                  <LogOut size={12} />
                </button>
              )}
            </div>
              );
            })()
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#121215] hover:bg-[#27272A] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <LogIn size={11} />
                <span>Masuk / Daftar</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
