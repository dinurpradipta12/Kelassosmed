"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Upload,
  ArrowUp,
  ArrowDown,
  Lock,
  Coins,
  QrCode,
  Zap,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  AppWindow,
} from "lucide-react";
import { ModalDialog } from "@/components/ui/ModalDialog";
import {
  WebAppIconBadge,
  WEBAPP_ICON_OPTIONS,
  WEBAPP_ACCENT_COLORS,
} from "@/components/learner/WebAppIconBadge";
import { formatIdr } from "@/context/RuangSosmedStore";
import {
  supabase,
  isSupabaseConfigured,
  STORAGE_BUCKETS,
} from "@/lib/supabase/client";
import { uploadOptimizedImageToStorage } from "@/lib/supabase/media-upload";
import {
  isSafeHttpUrl,
  mapRpcWebAppRow,
  type LearnerWebApp,
  type WebAppAccessMode,
  type WebAppIconPreset,
} from "@/types/webapp";

interface AdminWebAppsManagerProps {
  onShowToast: (msg: string) => void;
}

const CATEGORY_SUGGESTIONS = [
  "Content AI",
  "Copywriting",
  "Analytics",
  "Ads & ROAS",
  "Design",
  "Productivity",
  "Agency Kit",
];

export function AdminWebAppsManager({ onShowToast }: AdminWebAppsManagerProps) {
  const [apps, setApps] = useState<LearnerWebApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Tools");
  const [formDescription, setFormDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formIconUrl, setFormIconUrl] = useState<string | null>(null);
  const [formIconPreset, setFormIconPreset] =
    useState<WebAppIconPreset>("sparkles");
  const [formAccentColor, setFormAccentColor] = useState<string>("#4F39F6");
  const [formAccessMode, setFormAccessMode] = useState<WebAppAccessMode>("free");
  const [formPriceIdr, setFormPriceIdr] = useState<number>(49000);
  const [formPointsCost, setFormPointsCost] = useState<number>(50);
  const [formIsActive, setFormIsActive] = useState(true);

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteApp, setConfirmDeleteApp] =
    useState<LearnerWebApp | null>(null);

  const loadApps = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("learner_web_apps")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (
          error.code === "42P01" ||
          error.code === "PGRST205" ||
          msg.includes("learner_web_apps")
        ) {
          setMigrationMissing(true);
          setApps([]);
        } else {
          onShowToast(`Gagal memuat Tools You Need: ${error.message}`);
        }
        return;
      }

      setMigrationMissing(false);
      const mapped = (data || []).map((row) =>
        mapRpcWebAppRow({
          ...(row as Record<string, unknown>),
          has_access: true,
        })
      );
      setApps(mapped);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory("Content AI");
    setFormDescription("");
    setFormUrl("https://");
    setFormIconUrl(null);
    setFormIconPreset("sparkles");
    setFormAccentColor("#4F39F6");
    setFormAccessMode("free");
    setFormPriceIdr(49000);
    setFormPointsCost(50);
    setFormIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (app: LearnerWebApp) => {
    setEditingId(app.id);
    setFormName(app.name);
    setFormCategory(app.category || "Tools");
    setFormDescription(app.description || "");
    setFormUrl(app.url || "https://");
    setFormIconUrl(app.iconUrl || null);
    setFormIconPreset(app.iconPreset || "sparkles");
    setFormAccentColor(app.accentColor || "#4F39F6");
    setFormAccessMode(app.accessMode);
    setFormPriceIdr(app.priceIdr || 49000);
    setFormPointsCost(app.pointsCost || 0);
    setFormIsActive(app.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingIcon(true);
    setFormError(null);
    try {
      const res = await uploadOptimizedImageToStorage(file, {
        bucket: STORAGE_BUCKETS.MEDIA,
        folderPath: "webapps",
        fileName: file.name,
        maxWidth: 256,
        maxHeight: 256,
        quality: 0.85,
      });
      if (!res.uploadedToStorage || res.url.startsWith("data:")) {
        setFormError(
          "Gagal mengunggah icon ke Storage Supabase. Pastikan Anda login Admin lalu coba lagi."
        );
        return;
      }
      setFormIconUrl(res.url);
      onShowToast("Icon Web App berhasil dikompresi WebP & diunggah ke Storage.");
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanUrl = formUrl.trim();
    const cleanDesc = formDescription.trim();
    const cleanCat = formCategory.trim() || "Tools";

    if (!cleanName) {
      setFormError("Nama Web App wajib diisi.");
      return;
    }
    if (!isSafeHttpUrl(cleanUrl)) {
      setFormError("Link URL harus valid dan diawali https:// atau http://.");
      return;
    }

    const finalPriceIdr =
      formAccessMode === "paid"
        ? Math.max(0, Math.round(Number(formPriceIdr) || 0))
        : 0;
    const finalPointsCost =
      formAccessMode === "paid"
        ? Math.max(0, Math.round(Number(formPointsCost) || 0))
        : 0;

    if (formAccessMode === "paid" && finalPriceIdr <= 0 && finalPointsCost <= 0) {
      setFormError(
        "Untuk mode Berbayar Terpisah, isi minimal Harga QRIS (Rp) atau Biaya Poin Bintang ★."
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        category: cleanCat,
        description: cleanDesc,
        url: cleanUrl,
        icon_url: formIconUrl,
        icon_preset: formIconPreset,
        accent_color: formAccentColor,
        access_mode: formAccessMode,
        price_idr: finalPriceIdr,
        points_cost: finalPointsCost,
        is_active: formIsActive,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("learner_web_apps")
          .update(payload)
          .eq("id", editingId);
        if (error) {
          setFormError(error.message);
          return;
        }
        onShowToast(`Web App "${cleanName}" berhasil diperbarui.`);
      } else {
        const maxOrder = apps.reduce(
          (max, item) => Math.max(max, item.sortOrder || 0),
          0
        );
        const { data: sess } = await supabase.auth.getSession();
        const { error } = await supabase.from("learner_web_apps").insert({
          ...payload,
          sort_order: apps.length === 0 ? 0 : maxOrder + 1,
          created_by: sess?.session?.user?.id || null,
        });
        if (error) {
          setFormError(error.message);
          return;
        }
        onShowToast(`Web App "${cleanName}" ditambahkan ke Tools You Need.`);
      }

      setModalOpen(false);
      await loadApps();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (app: LearnerWebApp) => {
    const nextVal = !app.isActive;
    const { error } = await supabase
      .from("learner_web_apps")
      .update({ is_active: nextVal, updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) {
      onShowToast(`Gagal mengubah status: ${error.message}`);
      return;
    }
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, isActive: nextVal } : a))
    );
    onShowToast(
      nextVal
        ? `"${app.name}" ditampilkan ke siswa.`
        : `"${app.name}" disembunyikan dari siswa.`
    );
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= apps.length) return;

    const current = apps[index];
    const target = apps[swapIdx];
    const currentOrder = index;
    const targetOrder = swapIdx;

    await Promise.all([
      supabase
        .from("learner_web_apps")
        .update({ sort_order: targetOrder })
        .eq("id", current.id),
      supabase
        .from("learner_web_apps")
        .update({ sort_order: currentOrder })
        .eq("id", target.id),
    ]);

    const reordered = [...apps];
    reordered[index] = { ...target, sortOrder: currentOrder };
    reordered[swapIdx] = { ...current, sortOrder: targetOrder };
    setApps(reordered);
  };

  const handleDeleteApp = async () => {
    if (!confirmDeleteApp) return;
    const { error } = await supabase
      .from("learner_web_apps")
      .delete()
      .eq("id", confirmDeleteApp.id);
    if (error) {
      onShowToast(`Gagal menghapus: ${error.message}`);
      return;
    }
    onShowToast(`"${confirmDeleteApp.name}" dihapus dari Tools You Need.`);
    setConfirmDeleteApp(null);
    await loadApps();
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900">
            Kelola &ldquo;Tools You Need&rdquo; ({apps.length} Web App)
          </h3>
          <p className="text-xs text-slate-500">
            Tambahkan icon, nama, deskripsi, dan link web app lain milik Anda.
            Atur apakah gratis, khusus PRO, atau berbayar terpisah (QRIS / Poin
            Bintang).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadApps()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3.5 py-2 text-xs font-bold text-white cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Tambah Web App</span>
          </button>
        </div>
      </div>

      {migrationMissing ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-1.5">
          <p className="text-xs font-bold text-amber-900">
            Tabel Database Belum Terpasang
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Jalankan file migrasi{" "}
            <code className="font-mono font-semibold">
              supabase/migrations/028_learner_web_apps.sql
            </code>{" "}
            di Supabase SQL Editor terlebih dahulu, lalu klik Refresh di atas.
          </p>
        </div>
      ) : loading && apps.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center text-xs text-slate-500">
          Memuat daftar Web App...
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200/80 p-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <AppWindow size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900">
              Belum Ada Web App di Tools You Need
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Klik tombol &ldquo;+ Tambah Web App&rdquo; untuk menampilkan web
              app pendukung lainnya di Portal Siswa.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2 text-xs font-bold text-white cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Web App Pertama</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
          {apps.map((app, index) => {
            const accessSummary =
              app.accessMode === "free"
                ? "Gratis Semua Siswa"
                : app.accessMode === "pro"
                ? "Khusus Member PRO"
                : [
                    app.priceIdr > 0 ? formatIdr(app.priceIdr) : null,
                    app.pointsCost > 0 ? `${app.pointsCost} ★ Poin` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ");

            return (
              <div
                key={app.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <WebAppIconBadge
                    iconUrl={app.iconUrl}
                    iconPreset={app.iconPreset}
                    accentColor={app.accentColor}
                    name={app.name}
                    size="sm"
                  />

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {app.name}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {app.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          app.accessMode === "free"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : app.accessMode === "pro"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {app.accessMode === "pro" && <Zap size={10} />}
                        {app.accessMode === "paid" && <Lock size={10} />}
                        {app.accessMode === "free" && <CheckCircle2 size={10} />}
                        <span>{accessSummary}</span>
                      </span>
                      {!app.isActive && (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Tersembunyi
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {app.description}
                    </p>

                    {app.url && (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#4F39F6] hover:underline truncate max-w-full"
                      >
                        <span className="truncate">{app.url}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => void handleMoveOrder(index, -1)}
                    title="Naikkan urutan"
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={index === apps.length - 1}
                    onClick={() => void handleMoveOrder(index, 1)}
                    title="Turunkan urutan"
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(app)}
                    title={app.isActive ? "Sembunyikan" : "Tampilkan"}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {app.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(app)}
                    title="Edit"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteApp(app)}
                    title="Hapus"
                    className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="admin-webapp-form-title"
        title={editingId ? "Edit Web App" : "Tambah Web App ke Tools You Need"}
        subtitle="Icon dikompresi WebP ke Storage CDN; link app berbayar dilindungi server."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={(e) => void handleSaveApp(e)} className="space-y-4">
          {/* Icon Preview + Upload + Preset */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <WebAppIconBadge
                  iconUrl={formIconUrl}
                  iconPreset={formIconPreset}
                  accentColor={formAccentColor}
                  name={formName || "Preview"}
                  size="lg"
                />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Icon Web App
                  </p>
                  <p className="text-xs text-slate-500">
                    Unggah logo Web App atau pilih icon preset di bawah.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#4F39F6] hover:bg-indigo-50 cursor-pointer">
                  <Upload size={13} />
                  <span>{uploadingIcon ? "Mengunggah..." : "Upload Icon"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleIconUpload(e)}
                    className="hidden"
                  />
                </label>
                {formIconUrl && (
                  <button
                    type="button"
                    onClick={() => setFormIconUrl(null)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 cursor-pointer"
                  >
                    Pakai Preset
                  </button>
                )}
              </div>
            </div>

            {!formIconUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-200/70">
                <div className="flex flex-wrap gap-1.5">
                  {WEBAPP_ICON_OPTIONS.map((opt) => {
                    const IconComp = opt.Icon;
                    const active = formIconPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormIconPreset(opt.id)}
                        title={opt.label}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer ${
                          active
                            ? "border-[#4F39F6] bg-indigo-50 text-[#4F39F6]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <IconComp size={13} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    Warna Aksen:
                  </span>
                  {WEBAPP_ACCENT_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setFormAccentColor(hex)}
                      aria-label={`Pilih warna ${hex}`}
                      className={`h-5 w-5 rounded-full border-2 cursor-pointer ${
                        formAccentColor === hex
                          ? "border-slate-900 scale-110"
                          : "border-white"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800">
                Nama Web App *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="cth: AI Hook & Script Generator"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800">
                Kategori
              </label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="cth: Content AI"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {CATEGORY_SUGGESTIONS.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800">
              Link URL Web App * (dibuka langsung di tab baru)
            </label>
            <input
              type="url"
              required
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://app-anda.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-800">
              Deskripsi Singkat *
            </label>
            <textarea
              rows={3}
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Jelaskan manfaat dan fitur utama web app ini untuk siswa..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#4F39F6] focus:outline-none"
            />
          </div>

          {/* Access Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">
              Mode Akses Siswa
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    id: "free" as const,
                    title: "Gratis",
                    desc: "Semua siswa langsung bisa buka",
                    icon: CheckCircle2,
                  },
                  {
                    id: "pro" as const,
                    title: "Khusus PRO",
                    desc: "Terbuka otomatis untuk member PRO",
                    icon: Zap,
                  },
                  {
                    id: "paid" as const,
                    title: "Berbayar Terpisah",
                    desc: "Buka pakai Poin ★ dan/atau QRIS",
                    icon: QrCode,
                  },
                ]
              ).map((opt) => {
                const Icon = opt.icon;
                const active = formAccessMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormAccessMode(opt.id)}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      active
                        ? "border-[#4F39F6] bg-indigo-50/70"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Icon
                        size={14}
                        className={active ? "text-[#4F39F6]" : "text-slate-500"}
                      />
                      <span>{opt.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {formAccessMode === "paid" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                  <QrCode size={12} />
                  <span>Harga QRIS / Transfer (Rp)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={formPriceIdr}
                  onChange={(e) => setFormPriceIdr(Number(e.target.value || 0))}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-900"
                />
                <p className="text-[11px] text-slate-500">
                  Isi 0 jika hanya ingin pakai Poin Bintang.
                </p>
              </div>

              <div className="space-y-1">
                <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                  <Coins size={12} />
                  <span>Biaya Tukar Poin Bintang ★</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={formPointsCost}
                  onChange={(e) =>
                    setFormPointsCost(Number(e.target.value || 0))
                  }
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-900"
                />
                <p className="text-[11px] text-slate-500">
                  Isi 0 jika hanya ingin bayar QRIS / Transfer.
                </p>
              </div>
            </div>
          )}

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 cursor-pointer">
            <span className="text-xs font-semibold text-slate-800">
              Tampilkan di halaman Tools You Need siswa
            </span>
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="h-4 w-4 accent-[#4F39F6] cursor-pointer"
            />
          </label>

          {formError && (
            <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploadingIcon}
              className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] disabled:opacity-50 px-5 py-2 text-xs font-bold text-white cursor-pointer"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                ? "Simpan Perubahan"
                : "Terbitkan Web App"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        open={Boolean(confirmDeleteApp)}
        onClose={() => setConfirmDeleteApp(null)}
        titleId="delete-webapp-confirm-title"
        title="Hapus Web App?"
        subtitle={
          confirmDeleteApp
            ? `Hapus "${confirmDeleteApp.name}" dari direktori Tools You Need?`
            : ""
        }
        maxWidthClass="max-w-sm"
      >
        {confirmDeleteApp && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteApp(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteApp()}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              Ya, Hapus
            </button>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
