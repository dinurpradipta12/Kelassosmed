"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Link2,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Unlink,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface AdminTelegramSettingsPanelProps {
  onShowToast: (msg: string) => void;
}

interface TelegramAdminConfigPayload {
  enabled: boolean;
  rawEnabled?: boolean;
  hasBotToken: boolean;
  botTokenPreview: string;
  adminChatId: string;
  webhookSecret: string;
  notifyPayments: boolean;
  notifyNewUsers: boolean;
  notifyQuizSubmissions: boolean;
  notifyContentIssues: boolean;
  tableReady: boolean;
}

export function AdminTelegramSettingsPanel({
  onShowToast,
}: AdminTelegramSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hooking, setHooking] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [botTokenInput, setBotTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [botTokenPreview, setBotTokenPreview] = useState("");
  const [adminChatId, setAdminChatId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyNewUsers, setNotifyNewUsers] = useState(true);
  const [notifyContentIssues, setNotifyContentIssues] = useState(true);
  const [notifyQuizSubmissions, setNotifyQuizSubmissions] = useState(false);

  const [tableReady, setTableReady] = useState(true);
  const [hasServiceRoleKey, setHasServiceRoleKey] = useState(true);
  const [webhookActive, setWebhookActive] = useState(false);
  const [webhookStatusText, setWebhookStatusText] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/telegram/webhook`);
    }
  }, []);

  const getBearerHeader = useCallback(async () => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, []);

  const loadConfig = useCallback(
    async (checkWebhook = false) => {
      const authHeader = await getBearerHeader();
      if (!authHeader) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/telegram/admin${checkWebhook ? "?checkWebhook=1" : ""}`,
          {
            method: "GET",
            headers: { Authorization: authHeader },
          }
        );
        const json = await res.json();
        if (json?.ok && json.config) {
          const cfg = json.config as TelegramAdminConfigPayload;
          setEnabled(Boolean(cfg.rawEnabled ?? cfg.enabled));
          setHasSavedToken(Boolean(cfg.hasBotToken));
          setBotTokenPreview(cfg.botTokenPreview || "");
          setAdminChatId(cfg.adminChatId || "");
          setWebhookSecret(cfg.webhookSecret || "");
          setNotifyPayments(Boolean(cfg.notifyPayments));
          setNotifyNewUsers(Boolean(cfg.notifyNewUsers));
          setNotifyContentIssues(Boolean(cfg.notifyContentIssues));
          setNotifyQuizSubmissions(Boolean(cfg.notifyQuizSubmissions));
          setTableReady(Boolean(cfg.tableReady));
          setHasServiceRoleKey(Boolean(json.hasServiceRoleKey));

          if (checkWebhook) {
            const info = (json.webhookInfo || {}) as {
              url?: string;
              pending_update_count?: number;
              last_error_message?: string;
            };
            if (info.url) {
              setWebhookActive(true);
              setWebhookStatusText(
                `Aktif: ${info.url} (Pending: ${info.pending_update_count ?? 0})${
                  info.last_error_message
                    ? ` • Last error: ${info.last_error_message}`
                    : ""
                }`
              );
            } else {
              setWebhookActive(false);
              setWebhookStatusText("Webhook belum terpasang di server Telegram.");
            }
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [getBearerHeader]
  );

  useEffect(() => {
    void loadConfig(true);
  }, [loadConfig]);

  const callAdminAction = async (payload: Record<string, unknown>) => {
    const authHeader = await getBearerHeader();
    if (!authHeader) {
      onShowToast("Login sebagai Admin Supabase diperlukan.");
      return null;
    }
    const res = await fetch("/api/telegram/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanWebhookUrl = webhookUrl.trim();
      const autoWebhookUrl = /^https:\/\/(?!localhost\b|127\.0\.0\.1\b).+/i.test(
        cleanWebhookUrl
      )
        ? cleanWebhookUrl
        : undefined;
      const res = await callAdminAction({
        action: "save",
        enabled,
        botToken: botTokenInput.trim() || undefined,
        adminChatId,
        webhookSecret,
        autoWebhookUrl,
        notifyPayments,
        notifyNewUsers,
        notifyContentIssues,
        notifyQuizSubmissions,
      });
      if (!res?.ok) {
        onShowToast(res?.error || "Gagal menyimpan pengaturan Bot Telegram.");
        return;
      }
      setBotTokenInput("");
      if (res.config) {
        setEnabled(Boolean(res.config.rawEnabled ?? res.config.enabled));
        setHasSavedToken(Boolean(res.config.hasBotToken));
        setBotTokenPreview(res.config.botTokenPreview || "");
        setWebhookSecret(res.config.webhookSecret || "");
        setTableReady(Boolean(res.config.tableReady));
      }
      if (res.webhookAutoRegistered && cleanWebhookUrl) {
        setWebhookActive(true);
        setWebhookStatusText(`Aktif: ${cleanWebhookUrl}`);
      } else if (res.webhookInfo?.url) {
        setWebhookActive(true);
        setWebhookStatusText(
          `Aktif: ${res.webhookInfo.url} (Pending: ${
            res.webhookInfo.pending_update_count ?? 0
          })`
        );
      }
      onShowToast(
        res.message
          ? `✅ ${res.message}`
          : "✅ Pengaturan Bot Telegram berhasil disimpan!"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await callAdminAction({
        action: "test",
        botToken: botTokenInput.trim() || undefined,
        adminChatId,
      });
      if (!res?.ok) {
        onShowToast(res?.error || "Gagal mengirim pesan tes ke Telegram.");
        return;
      }
      onShowToast(`✅ ${res.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setHooking(true);
    try {
      // Save latest token/chatId/secret first so webhook handler reads the exact values
      await callAdminAction({
        action: "save",
        enabled,
        botToken: botTokenInput.trim() || undefined,
        adminChatId,
        webhookSecret,
        notifyPayments,
        notifyNewUsers,
        notifyContentIssues,
        notifyQuizSubmissions,
      });
      const res = await callAdminAction({
        action: "register_webhook",
        botToken: botTokenInput.trim() || undefined,
        adminChatId,
        webhookSecret,
        webhookUrl,
      });
      if (!res?.ok) {
        onShowToast(res?.error || "Gagal memasang webhook Telegram.");
        return;
      }
      if (res.webhookSecret) {
        setWebhookSecret(res.webhookSecret);
      }
      setWebhookActive(true);
      setWebhookStatusText(`Aktif: ${webhookUrl}`);
      onShowToast("✅ Webhook 2-arah Telegram berhasil dipasang!");
    } finally {
      setHooking(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setHooking(true);
    try {
      const res = await callAdminAction({
        action: "delete_webhook",
        botToken: botTokenInput.trim() || undefined,
      });
      if (!res?.ok) {
        onShowToast(res?.error || "Gagal menghapus webhook.");
        return;
      }
      setWebhookActive(false);
      setWebhookStatusText("Webhook dihapus.");
      onShowToast("Webhook Telegram dinonaktifkan.");
    } finally {
      setHooking(false);
    }
  };

  return (
    <div className="space-y-4">
      {!tableReady && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-xs text-[#991B1B]">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#DC2626]" />
          <div>
            <p className="font-bold">
              SQL Migration 020 belum dijalankan di Supabase
            </p>
            <p className="text-[11px] mt-0.5 leading-relaxed">
              Jalankan <code>supabase/migrations/020_telegram_bot_and_proof_cleanup.sql</code> di Supabase SQL Editor agar pengaturan Bot Telegram &amp; penghapusan bukti otomatis aktif.
            </p>
          </div>
        </div>
      )}

      {!hasServiceRoleKey && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3 text-xs text-[#92400E]">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-[#D97706]" />
          <div className="flex-1 space-y-1.5">
            <p className="font-bold">
              Environment Server <code>SUPABASE_SERVICE_ROLE_KEY</code> Belum Terbaca di Runtime
            </p>
            <p className="text-[11px] leading-relaxed">
              Agar server dapat menerima tombol Konfirmasi/Tolak langsung dari Webhook Telegram dan mengirim notif member baru:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
              <li>
                <strong>Cloudflare Workers:</strong> tambahkan <code>SUPABASE_SERVICE_ROLE_KEY</code> di <strong>Settings → Variables and Secrets</strong> (bagian Runtime, di atas menu <em>Bindings</em>) — <strong>bukan</strong> di <strong>Settings → Builds → Variables and secrets</strong> (karena Builds hanya aktif saat build, tidak terbaca saat server berjalan), lalu deploy ulang.
              </li>
              <li>
                <strong>Lokal:</strong> pastikan key ada di <code>.env.local</code> lalu restart server <code>npm run dev</code>.
              </li>
            </ul>
            <div>
              <button
                type="button"
                onClick={() => void loadConfig(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-amber-50 border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-[#92400E] cursor-pointer"
              >
                <RefreshCw size={11} />
                <span>Cek Ulang Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {hasSavedToken && hasServiceRoleKey && !loading && !webhookActive && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3 text-xs text-[#1E3A8A]">
          <Link2 size={16} className="shrink-0 mt-0.5 text-[#2563EB]" />
          <div className="flex-1 space-y-1.5">
            <p className="font-bold">
              Webhook Telegram Belum Terpasang — Bot Belum Bisa Membalas <code>/start</code> atau <code>/myid</code>
            </p>
            <p className="text-[11px] leading-relaxed">
              Token bot sudah tersimpan, tetapi Telegram belum terhubung ke URL webhook server Anda. Klik tombol di bawah untuk memasang webhook, lalu ketik <code>/start</code> atau <code>/myid</code> ke bot Anda di Telegram.
            </p>
            <div>
              <button
                type="button"
                disabled={hooking}
                onClick={() => void handleRegisterWebhook()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
              >
                <Link2 size={11} />
                <span>{hooking ? "Memasang..." : "Pasang Webhook Otomatis Sekarang"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bot Credentials Card */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Koneksi Bot &amp; Admin Chat ID
          </p>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              enabled && hasSavedToken && adminChatId.trim()
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : hasSavedToken && !adminChatId.trim()
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Bot size={11} />
            <span>
              {loading
                ? "Memuat..."
                : enabled && hasSavedToken && adminChatId.trim()
                ? "Bot Aktif"
                : hasSavedToken && !adminChatId.trim()
                ? "Butuh Admin Chat ID"
                : "Belum Aktif"}
            </span>
          </span>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Aktifkan Integrasi Bot Telegram
              </p>
              <p className="text-[11px] text-slate-500">
                Kirim bukti transfer &amp; tombol approve langsung ke Telegram Admin
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#4F39F6] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-4.5" />
            </label>
          </div>

          <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <div className="sm:col-span-4">
              <label
                htmlFor="tg-bot-token"
                className="block text-xs font-medium text-slate-800"
              >
                Bot Token (@BotFather)
              </label>
              <p className="text-[11px] text-slate-500">
                {hasSavedToken
                  ? `Tersimpan: ${botTokenPreview}`
                  : "Didapat dari /newbot di @BotFather"}
              </p>
            </div>
            <div className="sm:col-span-8 flex items-center gap-2">
              <input
                id="tg-bot-token"
                type={showToken ? "text" : "password"}
                value={botTokenInput}
                onChange={(e) => setBotTokenInput(e.target.value)}
                placeholder={
                  hasSavedToken
                    ? "Kosongkan bila tidak ingin mengganti token"
                    : "1234567890:ABCDefghIJKlmnoPQRstuVWxyz"
                }
                className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                aria-label="Lihat atau sembunyikan token"
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <div className="sm:col-span-4">
              <label
                htmlFor="tg-admin-chat-id"
                className="block text-xs font-medium text-slate-800"
              >
                Admin Chat ID
              </label>
              <p className="text-[11px] text-slate-500">
                Ketik <code>/myid</code> atau <code>/id</code> di bot setelah webhook aktif (pisahkan koma jika &gt;1 admin)
              </p>
            </div>
            <div className="sm:col-span-8">
              <input
                id="tg-admin-chat-id"
                type="text"
                value={adminChatId}
                onChange={(e) => setAdminChatId(e.target.value)}
                placeholder="Mis. 512345678 atau -1001234567890"
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Toggles */}
      <div className="space-y-1.5">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Jenis Notifikasi ke Telegram Admin
        </p>
        <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
          {[
            {
              key: "payments",
              title: "Pembayaran PRO & Buka Materi (+ Bukti Transfer)",
              desc: "Kirim foto bukti bayar, rincian paket, serta tombol Konfirmasi & Tolak langsung di Telegram.",
              checked: notifyPayments,
              onChange: setNotifyPayments,
            },
            {
              key: "users",
              title: "Akun Member Baru Bergabung",
              desc: "Notifikasi instan setiap ada learner baru mendaftar di portal.",
              checked: notifyNewUsers,
              onChange: setNotifyNewUsers,
            },
            {
              key: "issues",
              title: "Laporan Masalah Materi dari Learner",
              desc: "Laporan error/kendala video atau materi yang dikirim siswa.",
              checked: notifyContentIssues,
              onChange: setNotifyContentIssues,
            },
            {
              key: "quiz",
              title: "Submission Kuis & Tugas Baru",
              desc: "Pemberitahuan setiap kali learner mengumpulkan kuis atau tugas.",
              checked: notifyQuizSubmissions,
              onChange: setNotifyQuizSubmissions,
            },
          ].map((item) => (
            <label
              key={item.key}
              className="px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="h-4 w-4 accent-[#4F39F6] cursor-pointer shrink-0"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Save & Test Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
        >
          <Save size={13} />
          <span>{saving ? "Menyimpan..." : "Simpan Pengaturan Bot"}</span>
        </button>

        <button
          type="button"
          disabled={testing}
          onClick={() => void handleTest()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 cursor-pointer"
        >
          <Send size={13} className="text-[#4F39F6]" />
          <span>{testing ? "Mengirim Tes..." : "Kirim Pesan Tes"}</span>
        </button>
      </div>

      {/* 2-Way Webhook Section */}
      <div className="space-y-1.5 pt-2">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Webhook 2-Arah (Untuk Approve Langsung di Telegram &amp; /pending)
        </p>
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="tg-webhook-url"
              className="block text-xs font-medium text-slate-800"
            >
              URL Webhook HTTPS Publik
            </label>
            <input
              id="tg-webhook-url"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://domain-anda.com/api/telegram/webhook"
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">
              Telegram mewajibkan domain <strong>HTTPS publik</strong> (contoh URL deploy Cloudflare Workers / domain aktif Anda + <code>/api/telegram/webhook</code>).
            </p>
          </div>

          {webhookStatusText && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-700 break-all">
              {webhookStatusText}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={hooking}
              onClick={() => void handleRegisterWebhook()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Link2 size={13} />
              <span>
                {hooking ? "Memasang..." : "Pasang Webhook Otomatis"}
              </span>
            </button>

            <button
              type="button"
              disabled={hooking}
              onClick={() => void loadConfig(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Cek Status Webhook</span>
            </button>

            <button
              type="button"
              disabled={hooking}
              onClick={() => void handleDeleteWebhook()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 cursor-pointer"
            >
              <Unlink size={12} />
              <span>Lepas Webhook</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Setup Guide */}
      <div className="rounded-2xl bg-[#EEF2FF]/70 border border-[#C7D2FE] p-4 space-y-2 text-xs text-[#312E81]">
        <div className="flex items-center gap-1.5 font-bold">
          <Sparkles size={14} className="text-[#4F39F6]" />
          <span>Panduan Singkat Menghubungkan Bot Telegram</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-slate-700">
          <li>
            Buat bot baru via <strong>@BotFather</strong> di Telegram dengan perintah <code>/newbot</code>, lalu salin <strong>Bot Token</strong>.
          </li>
          <li>
            Buka bot baru Anda lalu tekan <strong>Start</strong>. Untuk melihat <strong>Admin Chat ID</strong>, Anda bisa cek via <strong>@userinfobot</strong> atau ketik <code>/myid</code> / <code>/id</code> setelah webhook terpasang.
          </li>
          <li>
            Centang <strong>Aktifkan Integrasi Bot Telegram</strong>, masukkan Token &amp; Chat ID, klik <strong>Simpan Pengaturan Bot</strong>, lalu tes dengan <strong>Kirim Pesan Tes</strong>.
          </li>
          <li>
            Tambahkan <code>SUPABASE_SERVICE_ROLE_KEY</code> di Cloudflare Workers (<strong>Settings → Variables and Secrets</strong> pada bagian Runtime, bukan <em>Builds</em>) / <code>.env.local</code>, lalu klik <strong>Pasang Webhook Otomatis</strong> menggunakan domain HTTPS publik agar Anda bisa langsung klik <strong>Konfirmasi / Tolak</strong> dan pakai perintah <code>/pending</code> &amp; <code>/stats</code> dari Telegram!
          </li>
        </ol>
        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck size={13} />
          <span>
            Token tersimpan di tabel Admin-only RLS &amp; foto bukti transfer otomatis terhapus dari server setelah dikonfirmasi.
          </span>
        </div>
      </div>
    </div>
  );
}
