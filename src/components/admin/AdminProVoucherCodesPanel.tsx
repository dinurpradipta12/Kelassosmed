"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  History,
  Plus,
  RefreshCw,
  Shuffle,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { LearnerProPackageItem } from "@/context/RuangSosmedStore";
import { formatIndoDate, getTodayIsoDate, toIsoDateString } from "@/lib/subscription-utils";

export interface ProVoucherRecord {
  id: string;
  code: string;
  label: string | null;
  duration_value: number;
  duration_unit: "days" | "months";
  package_id: string;
  package_name: string;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProVoucherRedemptionRecord {
  id: string;
  voucher_id: string;
  code: string;
  user_email: string;
  user_name: string | null;
  duration_value: number;
  duration_unit: "days" | "months";
  granted_days: number;
  package_id: string | null;
  package_name: string | null;
  previous_expires_at: string | null;
  new_expires_at: string;
  redeemed_at: string;
}

interface AdminProVoucherCodesPanelProps {
  onShowToast: (msg: string) => void;
  packages: LearnerProPackageItem[];
}

const DURATION_PRESETS: {
  label: string;
  value: number;
  unit: "days" | "months";
}[] = [
  { label: "3 Hari", value: 3, unit: "days" },
  { label: "7 Hari", value: 7, unit: "days" },
  { label: "14 Hari", value: 14, unit: "days" },
  { label: "1 Bulan", value: 1, unit: "months" },
  { label: "3 Bulan", value: 3, unit: "months" },
  { label: "6 Bulan", value: 6, unit: "months" },
  { label: "12 Bulan", value: 12, unit: "months" },
];

function generateRandomVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PRO-${suffix}`;
}

export function AdminProVoucherCodesPanel({
  onShowToast,
  packages,
}: AdminProVoucherCodesPanelProps) {
  const paidPackages = packages.filter(
    (p) => !p.isFreeTier && p.tierKind !== "free"
  );
  const defaultPkg =
    paidPackages.find((p) => p.highlighted) ||
    paidPackages[paidPackages.length - 1] ||
    paidPackages[0];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableReady, setTableReady] = useState(true);
  const [codes, setCodes] = useState<ProVoucherRecord[]>([]);
  const [redemptions, setRedemptions] = useState<ProVoucherRedemptionRecord[]>(
    []
  );

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [durationValueInput, setDurationValueInput] = useState<string>("30");
  const [durationUnit, setDurationUnit] = useState<"days" | "months">("days");
  const [packageIdInput, setPackageIdInput] = useState<string>(
    defaultPkg?.id || "pkg-pro"
  );
  const [maxUsesInput, setMaxUsesInput] = useState<string>("");
  const [validUntilInput, setValidUntilInput] = useState<string>("");
  const [isActiveInput, setIsActiveInput] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId && defaultPkg && !paidPackages.some((p) => p.id === packageIdInput)) {
      setPackageIdInput(defaultPkg.id);
    }
  }, [defaultPkg, editingId, packageIdInput, paidPackages]);

  const getBearerHeader = useCallback(async () => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, []);

  const loadData = useCallback(async () => {
    const authHeader = await getBearerHeader();
    if (!authHeader) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pro-vouchers/admin", {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      const json = await res.json();
      if (json?.ok) {
        setTableReady(json.tableReady !== false);
        setCodes(Array.isArray(json.codes) ? json.codes : []);
        setRedemptions(Array.isArray(json.redemptions) ? json.redemptions : []);
      }
    } catch {
      onShowToast("Gagal memuat daftar kode akses premium.");
    } finally {
      setLoading(false);
    }
  }, [getBearerHeader, onShowToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setCodeInput("");
    setLabelInput("");
    setDurationValueInput("30");
    setDurationUnit("days");
    setPackageIdInput(defaultPkg?.id || "pkg-pro");
    setMaxUsesInput("");
    setValidUntilInput("");
    setIsActiveInput(true);
  };

  const selectedPackageObj =
    paidPackages.find((p) => p.id === packageIdInput) ||
    defaultPkg || {
      id: "pkg-pro",
      name: "Creator Academy Plan",
    };

  const numericDuration = Math.max(
    1,
    Math.min(3650, Math.trunc(Number(durationValueInput) || 1))
  );

  const handleSaveCode = async () => {
    const normalizedCode = codeInput.trim().toUpperCase().replace(/\s+/g, "-");
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalizedCode)) {
      onShowToast(
        "Kode harus 3–40 karakter (huruf, angka, tanda '-' atau '_')."
      );
      return;
    }
    const authHeader = await getBearerHeader();
    if (!authHeader) {
      onShowToast("Sesi Admin tidak ditemukan. Silakan masuk kembali.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pro-vouchers/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          id: editingId || undefined,
          code: normalizedCode,
          label: labelInput.trim() || null,
          durationValue: numericDuration,
          durationUnit,
          packageId: selectedPackageObj.id,
          packageName: selectedPackageObj.name,
          maxUses:
            maxUsesInput.trim() === "" ? null : Number(maxUsesInput.trim()),
          validUntil: validUntilInput.trim() || null,
          isActive: isActiveInput,
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        if (json?.tableReady === false) setTableReady(false);
        onShowToast(json?.error || "Gagal menyimpan kode akses premium.");
        return;
      }
      onShowToast(
        editingId
          ? `Kode "${normalizedCode}" berhasil diperbarui.`
          : `Kode akses premium "${normalizedCode}" berhasil dibuat!`
      );
      resetForm();
      await loadData();
    } catch {
      onShowToast("Terjadi kesalahan jaringan saat menyimpan kode.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCode = async (item: ProVoucherRecord) => {
    const authHeader = await getBearerHeader();
    if (!authHeader) return;
    try {
      const res = await fetch("/api/pro-vouchers/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          action: "toggle",
          id: item.id,
          isActive: !item.is_active,
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        onShowToast(json?.error || "Gagal mengubah status kode.");
        return;
      }
      setCodes((prev) =>
        prev.map((c) => (c.id === item.id ? json.item : c))
      );
      onShowToast(
        !item.is_active
          ? `Kode "${item.code}" diaktifkan.`
          : `Kode "${item.code}" dinonaktifkan.`
      );
    } catch {
      onShowToast("Gagal memperbarui status kode.");
    }
  };

  const handleDeleteCode = async (item: ProVoucherRecord) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Hapus permanen kode "${item.code}" beserta catatan penukarannya?`
      )
    ) {
      return;
    }
    const authHeader = await getBearerHeader();
    if (!authHeader) return;
    try {
      const res = await fetch("/api/pro-vouchers/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ action: "delete", id: item.id }),
      });
      const json = await res.json();
      if (!json?.ok) {
        onShowToast(json?.error || "Gagal menghapus kode.");
        return;
      }
      setCodes((prev) => prev.filter((c) => c.id !== item.id));
      if (editingId === item.id) resetForm();
      onShowToast(`Kode "${item.code}" dihapus.`);
    } catch {
      onShowToast("Gagal menghapus kode.");
    }
  };

  const handleStartEdit = (item: ProVoucherRecord) => {
    setEditingId(item.id);
    setCodeInput(item.code);
    setLabelInput(item.label || "");
    setDurationValueInput(String(item.duration_value));
    setDurationUnit(item.duration_unit === "months" ? "months" : "days");
    setPackageIdInput(item.package_id || defaultPkg?.id || "pkg-pro");
    setMaxUsesInput(item.max_uses !== null ? String(item.max_uses) : "");
    setValidUntilInput(
      item.valid_until ? toIsoDateString(item.valid_until) || "" : ""
    );
    setIsActiveInput(item.is_active);
  };

  const handleCopyCode = (item: ProVoucherRecord) => {
    try {
      navigator.clipboard?.writeText(item.code);
    } catch {}
    setCopiedId(item.id);
    onShowToast(`Kode "${item.code}" disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const todayWib = getTodayIsoDate();

  return (
    <div className="space-y-5">
      {!tableReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold">
              Tabel Database Kode Akses Premium Belum Terpasang
            </p>
            <p className="leading-relaxed">
              Jalankan file migrasi{" "}
              <code className="font-mono font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                supabase/migrations/021_pro_voucher_codes.sql
              </code>{" "}
              di Supabase SQL Editor lalu muat ulang halaman ini agar fitur pembuatan dan penukaran kode aktif.
            </p>
          </div>
        </div>
      )}

      {/* CARD 1: CREATE / EDIT KODE AKSES PREMIUM */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center">
              <Ticket size={14} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {editingId
                  ? `Edit Kode Premium: ${codeInput}`
                  : "Buat Kode Akses Premium Baru"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Atur kode khusus agar member langsung membuka paket PRO dalam durasi Hari atau Bulan pilihan Anda.
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <X size={12} />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Code + Target Package */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Kode Voucher Premium
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) =>
                    setCodeInput(
                      e.target.value.toUpperCase().replace(/\s+/g, "-")
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSaveCode();
                    }
                  }}
                  placeholder="Contoh: VIP-30HARI atau BATCH1"
                  className="flex-1 rounded-xl bg-slate-50/80 focus:bg-white px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border border-slate-200/80 focus:border-[#4F39F6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCodeInput(generateRandomVoucherCode())}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700 cursor-pointer shrink-0"
                >
                  <Shuffle size={12} />
                  <span>Acak</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-6 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Paket Premium yang Dibuka
              </label>
              <select
                value={packageIdInput}
                onChange={(e) => setPackageIdInput(e.target.value)}
                className="w-full rounded-xl bg-slate-50/80 focus:bg-white px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200/80 focus:border-[#4F39F6] focus:outline-none"
              >
                {paidPackages.length === 0 ? (
                  <option value="pkg-pro">Creator Academy Plan</option>
                ) : (
                  paidPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.badge || "PRO"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Flexible Duration: Value + Hari/Bulan + Presets */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Clock size={14} className="text-[#4F39F6]" />
                <span>Durasi Akses Premium</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] border border-[#4F39F6]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#4F39F6]">
                Member mendapat akses {selectedPackageObj.name} selama{" "}
                {numericDuration}{" "}
                {durationUnit === "months" ? "Bulan" : "Hari"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-5 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={durationValueInput}
                  onChange={(e) => setDurationValueInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSaveCode();
                    }
                  }}
                  className="w-24 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 focus:border-[#4F39F6] focus:outline-none tabular-nums"
                />
                <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setDurationUnit("days")}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                      durationUnit === "days"
                        ? "bg-[#4F39F6] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationUnit("months")}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                      durationUnit === "months"
                        ? "bg-[#4F39F6] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bulan
                  </button>
                </div>
              </div>

              <div className="sm:col-span-7 flex flex-wrap items-center gap-1.5">
                {DURATION_PRESETS.map((preset) => {
                  const active =
                    numericDuration === preset.value &&
                    durationUnit === preset.unit;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setDurationValueInput(String(preset.value));
                        setDurationUnit(preset.unit);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? "bg-[#4F39F6]/10 border-[#4F39F6] text-[#4F39F6]"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Optional Quota, Valid Until, Label */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Kuota Pemakaian Total
              </label>
              <input
                type="number"
                min={1}
                value={maxUsesInput}
                onChange={(e) => setMaxUsesInput(e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-xl bg-slate-50/80 focus:bg-white px-3 py-2 text-xs text-slate-900 border border-slate-200/80 focus:border-[#4F39F6] focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">
                Otomatis dibatasi maks. <strong>1× per akun siswa</strong>.
              </p>
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Batas Tanggal Penukaran (Opsional)
              </label>
              <input
                type="date"
                value={validUntilInput}
                onChange={(e) => setValidUntilInput(e.target.value)}
                className="w-full rounded-xl bg-slate-50/80 focus:bg-white px-3 py-2 text-xs text-slate-900 border border-slate-200/80 focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Catatan Admin (Opsional)
              </label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Misal: Bonus Alumni Webinar / Partner"
                className="w-full rounded-xl bg-slate-50/80 focus:bg-white px-3 py-2 text-xs text-slate-900 border border-slate-200/80 focus:border-[#4F39F6] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActiveInput}
                onChange={(e) => setIsActiveInput(e.target.checked)}
                className="rounded border-slate-300 text-[#4F39F6] focus:ring-[#4F39F6]"
              />
              <span>Kode langsung aktif dan dapat ditukarkan siswa</span>
            </label>

            <button
              type="button"
              disabled={saving || !codeInput.trim()}
              onClick={() => void handleSaveCode()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              {editingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
              <span>
                {saving
                  ? "Menyimpan..."
                  : editingId
                  ? "Simpan Perubahan Kode"
                  : "Buat Kode Premium"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* CARD 2: DAFTAR KODE AKSES PREMIUM */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900">
              Daftar Kode Akses Premium ({codes.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Memuat kode akses premium...
          </div>
        ) : codes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Belum ada kode akses premium. Buat kode pertama Anda pada formulir di atas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {codes.map((item) => {
              const validIso = item.valid_until
                ? toIsoDateString(item.valid_until)
                : null;
              const isExpiredByDate = Boolean(validIso && validIso < todayWib);
              const isQuotaFull =
                item.max_uses !== null && item.used_count >= item.max_uses;

              let statusText = "Aktif";
              let statusClass =
                "bg-emerald-50 text-emerald-700 border-emerald-200";
              if (!item.is_active) {
                statusText = "Nonaktif";
                statusClass = "bg-slate-100 text-slate-600 border-slate-200";
              } else if (isExpiredByDate) {
                statusText = "Kedaluwarsa";
                statusClass = "bg-rose-50 text-rose-700 border-rose-200";
              } else if (isQuotaFull) {
                statusText = "Kuota Habis";
                statusClass = "bg-amber-50 text-amber-700 border-amber-200";
              }

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] border border-[#4F39F6]/25 px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider text-[#4F39F6]">
                        {item.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item)}
                        title="Salin kode"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check size={10} className="text-emerald-600" />
                            <span>Disalin</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>Salin</span>
                          </>
                        )}
                      </button>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}
                      >
                        {statusText}
                      </span>

                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        +{item.duration_value}{" "}
                        {item.duration_unit === "months" ? "Bulan" : "Hari"}
                      </span>

                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {item.package_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>
                        Dipakai:{" "}
                        <strong className="text-slate-700 tabular-nums">
                          {item.used_count}
                        </strong>{" "}
                        /{" "}
                        {item.max_uses !== null ? (
                          <strong className="text-slate-700 tabular-nums">
                            {item.max_uses}
                          </strong>
                        ) : (
                          "Unlimited"
                        )}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                        1× / user
                      </span>
                      {validIso && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          <span>Berlaku s/d {formatIndoDate(validIso)}</span>
                        </span>
                      )}
                      {item.label && (
                        <span className="text-slate-600">• {item.label}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleToggleCode(item)}
                      className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      <Edit3 size={11} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCode(item)}
                      title="Hapus kode"
                      className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 p-1.5 text-rose-600 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CARD 3: RIWAYAT PENUKARAN TERBARU */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
          <History size={14} className="text-slate-600" />
          <h3 className="text-xs font-bold text-slate-900">
            Riwayat Penukaran Terbaru ({redemptions.length})
          </h3>
        </div>

        {redemptions.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-500">
            Belum ada member yang menukarkan kode akses premium.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {redemptions.map((rec) => (
              <div
                key={rec.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {rec.user_name || rec.user_email}{" "}
                    <span className="font-normal text-slate-500">
                      ({rec.user_email})
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kode{" "}
                    <span className="font-mono font-bold text-[#4F39F6]">
                      {rec.code}
                    </span>{" "}
                    • +{rec.duration_value}{" "}
                    {rec.duration_unit === "months" ? "Bulan" : "Hari"} (
                    {rec.package_name || "PRO"})
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <p className="font-semibold text-emerald-700">
                    Aktif s/d {formatIndoDate(rec.new_expires_at)}
                  </p>
                  <p>{formatIndoDate(rec.redeemed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
