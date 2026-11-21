"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  getAuthRedirectUrl,
} from "@/lib/supabase/client";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: (userProfile: {
    name: string;
    email: string;
    role: "admin" | "learner";
    username?: string;
    avatarUrl?: string;
  }) => void;
  onShowToast: (msg: string) => void;
  initialTab?: "login" | "register";
}

export function AuthModal({
  open,
  onClose,
  onAuthSuccess,
  onShowToast,
  initialTab = "login",
}: AuthModalProps) {
  const { maintenanceConfig, pushAdminNotification } = useRuangSosmedStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);

  // Sync tab whenever modal opens or initialTab prop changes
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setErrorMessage(null);
      setSuccessMessage(null);
      setPendingConfirmEmail(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [folderAccessCode, setFolderAccessCode] = useState("");

  // Loading & Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(
    null
  );
  const [resendingConfirm, setResendingConfirm] = useState(false);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingConfirmEmail(null);
    setLoading(true);

    const cleanId = identifier.trim().toLowerCase();
    let emailToUse = identifier.trim();
    if (!emailToUse.includes("@")) {
      if (cleanId === "arunika") {
        emailToUse = "contact.dinurpradipta@gmail.com";
      } else {
        emailToUse = `${emailToUse}@ruangsosmed.id`;
      }
    }

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Layanan autentikasi belum terkonfigurasi.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (error || !data.user) {
        throw error || new Error("Email atau kata sandi salah.");
      }

      const user = data.user;
      const userMeta = user.user_metadata || {};

      const { data: prof } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url, job_title")
        .eq("id", user.id)
        .maybeSingle();

      const dbRole = String(prof?.role || "learner").toLowerCase();
      const userRole: "admin" | "learner" =
        dbRole === "admin" || dbRole === "mentor" ? "admin" : "learner";

      if (maintenanceConfig?.enabled && userRole !== "admin") {
        await supabase.auth.signOut().catch(() => {});
        setErrorMessage(
          "Website sedang dalam tahap pemeliharaan. Hanya Admin terverifikasi yang dapat masuk saat ini."
        );
        return;
      }

      const displayName =
        prof?.full_name ||
        userMeta.full_name ||
        userMeta.username ||
        emailToUse.split("@")[0] ||
        "Pengguna";

      const uname =
        (userMeta.username || emailToUse.split("@")[0] || "learner")
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, "");

      await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: user.id,
            username: uname,
            name: displayName,
            email: user.email || emailToUse,
            job_title: prof?.job_title || userMeta.job_title || "Social Media Specialist",
          },
          { onConflict: "username" }
        )
        .then(() => {});

      if (
        userMeta?.folder_access_code &&
        typeof window !== "undefined"
      ) {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_pending_folder_code",
            String(userMeta.folder_access_code).trim().toUpperCase()
          );
        } catch {}
      }

      onAuthSuccess({
        name: displayName,
        email: user.email || emailToUse,
        role: userRole,
        username: userMeta.username || uname,
        avatarUrl: prof?.avatar_url || undefined,
      });

      onShowToast(
        `Berhasil login sebagai ${displayName} (${
          userRole === "admin" ? "Admin Studio" : "Learner"
        })!`
      );
      onClose();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid login credentials")) {
        setErrorMessage(
          "Email, username, atau kata sandi tidak sesuai. Hubungi Admin jika Anda lupa password."
        );
      } else if (msg.includes("Email not confirmed")) {
        setPendingConfirmEmail(emailToUse);
        setErrorMessage(
          "Email belum dikonfirmasi. Silakan periksa inbox email Anda untuk memverifikasi."
        );
      } else {
        setErrorMessage(msg || "Gagal masuk. Silakan coba beberapa saat lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingConfirmEmail(null);

    if (maintenanceConfig?.enabled) {
      setErrorMessage(
        "Website sedang dalam tahap pengembangan (Under Construction). Pendaftaran akun sementara ditutup."
      );
      return;
    }

    setLoading(true);

    const cleanFolderCode = folderAccessCode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");

    try {
      const emailToUse = identifier.trim();
      if (!emailToUse.includes("@")) {
        setErrorMessage("Format email tidak valid. Harap masukkan alamat email.");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setErrorMessage("Kata sandi minimal 6 karakter.");
        setLoading(false);
        return;
      }

      if (cleanFolderCode && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "ruang_sosmed_pending_folder_code",
            cleanFolderCode
          );
        } catch {}
      }

      if (!isSupabaseConfigured) {
        throw new Error("Layanan pendaftaran belum terkonfigurasi.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: emailToUse,
        password: password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            full_name: fullName.trim() || emailToUse.split("@")[0],
            job_title: "Social Media Specialist",
            folder_access_code: cleanFolderCode || undefined,
          },
        },
      });

      if (error) {
        throw error;
      }

      const displayName = fullName.trim() || emailToUse.split("@")[0];
      if (data.session && data.user) {
        const uname = emailToUse
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, "");
        await supabase
          .from("user_profiles")
          .upsert(
            {
              user_id: data.user.id,
              username: uname || `learner_${Date.now()}`,
              name: displayName,
              email: emailToUse,
              job_title: "Social Media Specialist",
            },
            { onConflict: "username" }
          )
          .then(() => {});
      }

      if (data.user) {
        const regHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (data.session?.access_token) {
          regHeaders.Authorization = `Bearer ${data.session.access_token}`;
        }
        void fetch("/api/telegram/notify", {
          method: "POST",
          headers: regHeaders,
          body: JSON.stringify({
            eventType: "user_registered",
            userName: displayName,
            userEmail: emailToUse,
            folderCode: cleanFolderCode || undefined,
          }),
        }).catch(() => {});
      }

      if (data.user && !data.session) {
        setPendingConfirmEmail(emailToUse);
        setSuccessMessage(
          `Tautan verifikasi telah dikirim ke ${emailToUse}. Silakan periksa inbox/spam Anda untuk mengonfirmasi akun.`
        );
        onShowToast(`Email konfirmasi dikirim ke ${emailToUse}`);
      } else {
        onAuthSuccess({
          name: displayName,
          email: emailToUse,
          role: "learner",
        });
        onShowToast(`Pendaftaran berhasil! Selamat datang di Ruang Sosmed 2.0.`);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Terjadi kesalahan saat mendaftar. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmEmail || !isSupabaseConfigured || resendingConfirm) {
      return;
    }
    setResendingConfirm(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingConfirmEmail,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
      setErrorMessage(null);
      setSuccessMessage(
        `Email verifikasi baru telah dikirim ke ${pendingConfirmEmail}. Pastikan Anda membuka link dari email terbaru.`
      );
      onShowToast(`Email verifikasi dikirim ulang ke ${pendingConfirmEmail}`);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const lower = msg.toLowerCase();
      if (
        lower.includes("rate limit") ||
        lower.includes("too many") ||
        lower.includes("seconds")
      ) {
        setErrorMessage(
          "Terlalu sering mengirim ulang email verifikasi. Mohon tunggu 60 detik sebelum mencoba lagi."
        );
      } else {
        setErrorMessage(
          msg || "Gagal mengirim ulang email verifikasi. Silakan coba lagi nanti."
        );
      }
    } finally {
      setResendingConfirm(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121215]/60 backdrop-blur-xs transition-opacity cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_20px_50px_rgba(16,15,17,0.18)] overflow-hidden cursor-default"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-[#EAECEF]">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo1.png"
              alt="Ruang Sosmed 2.0"
              className="h-8 w-auto max-w-[170px] object-contain"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F8F9FB] hover:text-[#121215] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Context Title (Differentiated for Login vs Register) */}
        <div className="px-6 pt-5 pb-1">
          <h2 id="auth-modal-title" className="text-lg font-bold text-[#121215]">
            {activeTab === "login" ? "Masuk ke Akun" : "Daftar Akun Baru"}
          </h2>
          <p className="text-xs text-[#5E5E5E] mt-1 leading-relaxed">
            {activeTab === "login"
              ? "Lanjutkan akses materi pembelajaran & pantau progress belajar kamu."
              : "Mulai perjalanan belajar strategi konten organik & roadmap specialist dari nol."}
          </p>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mx-5 mt-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 p-3 flex items-start gap-2.5 text-xs text-[#EF4444]">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="leading-relaxed">{errorMessage}</p>
              {pendingConfirmEmail && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendingConfirm}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EF4444]/30 bg-white/70 dark:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#DC2626] dark:text-[#FCA5A5] hover:bg-[#EF4444]/10 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {resendingConfirm
                    ? "Mengirim ulang..."
                    : "Kirim ulang email verifikasi"}
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 p-3 flex items-start gap-2.5 text-xs text-[#059669]">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="leading-relaxed">{successMessage}</p>
              {pendingConfirmEmail && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendingConfirm}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-white/70 dark:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#047857] dark:text-[#6EE7B7] hover:bg-[#10B981]/10 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {resendingConfirm
                    ? "Mengirim ulang..."
                    : "Kirim ulang email verifikasi"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5">
          {activeTab === "login" ? (
            /* TAB 1: LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Email atau Username
                </label>
                <div className="relative flex items-center">
                  <Mail
                    size={15}
                    className="absolute left-3 text-[#9CA3AF] pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="nama@email.com atau username"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={15}
                    className="absolute left-3 text-[#9CA3AF] pointer-events-none"
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2.5 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-3 text-xs font-bold text-white shadow-[0_4px_12px_rgba(79,57,246,0.25)] transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? "Memproses Masuk..." : "Masuk ke Akun"}</span>
              </button>

              <div className="pt-3 text-center text-xs text-[#5E5E5E] border-t border-[#EAECEF]/80">
                Belum memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setPendingConfirmEmail(null);
                  }}
                  className="font-bold text-[#4F39F6] hover:underline cursor-pointer ml-1"
                >
                  Daftar Akun Baru
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative flex items-center">
                  <User
                    size={15}
                    className="absolute left-3 text-[#9CA3AF] pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Alamat Email
                </label>
                <div className="relative flex items-center">
                  <Mail
                    size={15}
                    className="absolute left-3 text-[#9CA3AF] pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="email.aktif@gmail.com"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Kata Sandi (Min. 6 Karakter)
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={15}
                    className="absolute left-3 text-[#9CA3AF] pointer-events-none"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Buat kata sandi aman"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs text-[#121215] placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121215] mb-1.5">
                  Kode Akses Folder / Kelas Series{" "}
                  <span className="font-normal text-[#9CA3AF]">(Opsional)</span>
                </label>
                <div className="relative flex items-center">
                  <KeyRound
                    size={15}
                    className="absolute left-3 text-[#9CA3AF] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={folderAccessCode}
                    onChange={(e) =>
                      setFolderAccessCode(e.target.value.toUpperCase())
                    }
                    placeholder="Contoh: MBI-2026"
                    className="w-full rounded-lg bg-[#F8F9FB] pl-9 pr-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#121215] placeholder:normal-case placeholder:font-normal placeholder:text-[#9CA3AF] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#4F39F6] focus:outline-none transition-colors"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#64748B]">
                  Jika punya kode akses folder dari mentor, akun Anda langsung membuka semua materinya setelah mendaftar.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-3 text-xs font-bold text-white shadow-[0_4px_12px_rgba(79,57,246,0.25)] transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? "Mendaftarkan Akun..." : "Buat Akun Sekarang"}</span>
              </button>

              <div className="pt-3 text-center text-xs text-[#5E5E5E] border-t border-[#EAECEF]/80">
                Sudah memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setPendingConfirmEmail(null);
                  }}
                  className="font-bold text-[#4F39F6] hover:underline cursor-pointer ml-1"
                >
                  Masuk di sini
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
