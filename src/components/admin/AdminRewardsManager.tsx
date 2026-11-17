"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Users,
  Search,
  Filter,
  Flame,
  Award,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import {
  REWARD_CATEGORY_CONFIG,
  type RewardCategory,
  type RewardItem,
} from "@/lib/rewards-data";

interface AdminRewardsManagerProps {
  onShowToast: (msg: string) => void;
}

export function AdminRewardsManager({ onShowToast }: AdminRewardsManagerProps) {
  const {
    rewardsCatalog,
    claimedRewards,
    createReward,
    updateReward,
    deleteReward,
  } = useRuangSosmedStore();

  const [activeTab, setActiveTab] = useState<"catalog" | "claims">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fallback instant reading from local storage if store is still hydrating
  const effectiveRewardsCatalog: RewardItem[] =
    Array.isArray(rewardsCatalog) && rewardsCatalog.length > 0
      ? rewardsCatalog
      : (() => {
          try {
            if (typeof window !== "undefined") {
              const raw = window.localStorage.getItem(
                "ruang_sosmed_rewards_catalog_v2"
              );
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed as RewardItem[];
              }
            }
          } catch {}
          return [];
        })();

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] =
    useState<RewardCategory>("Template");
  const [formPoints, setFormPoints] = useState<number>(250);
  const [formDescription, setFormDescription] = useState("");
  const [formRewardValue, setFormRewardValue] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formStock, setFormStock] = useState<number>(-1);
  const [formIsUnlimited, setFormIsUnlimited] = useState<boolean>(true);
  const [formActive, setFormActive] = useState<boolean>(true);

  const openCreateModal = () => {
    setEditingReward(null);
    setFormTitle("");
    setFormCategory("Template");
    setFormPoints(250);
    setFormDescription("");
    setFormRewardValue("https://");
    setFormBadge("");
    setFormStock(-1);
    setFormIsUnlimited(true);
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (reward: RewardItem) => {
    setEditingReward(reward);
    setFormTitle(reward.title);
    setFormCategory(reward.category);
    setFormPoints(reward.pointsCost);
    setFormDescription(reward.description);
    setFormRewardValue(reward.rewardValue);
    setFormBadge(reward.badge || "");
    setFormStock(reward.stock);
    setFormIsUnlimited(reward.stock === -1);
    setFormActive(reward.active);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onShowToast("Judul reward wajib diisi.");
      return;
    }
    if (formPoints <= 0) {
      onShowToast("Poin reward harus lebih besar dari 0.");
      return;
    }

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      pointsCost: Number(formPoints),
      description: formDescription.trim(),
      rewardValue: formRewardValue.trim() || "-",
      badge: formBadge.trim() || undefined,
      stock: formIsUnlimited ? -1 : Math.max(0, Number(formStock)),
      active: formActive,
    };

    if (editingReward) {
      updateReward(editingReward.id, payload);
      onShowToast(`Berhasil memperbarui reward "${payload.title}".`);
    } else {
      createReward(payload);
      onShowToast(`Berhasil menambahkan reward baru "${payload.title}".`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (reward: RewardItem) => {
    if (confirm(`Yakin ingin menghapus reward "${reward.title}"?`)) {
      deleteReward(reward.id);
      onShowToast(`Reward "${reward.title}" berhasil dihapus.`);
    }
  };

  // Metrics
  const totalActiveRewards = (effectiveRewardsCatalog ?? []).filter((r) => r.active).length;
  const totalClaimsCount = (claimedRewards ?? []).length;
  const totalPointsRedeemed = (claimedRewards ?? []).reduce(
    (acc, c) => acc + (c.pointsSpent || 0),
    0
  );

  const filteredCatalog = (effectiveRewardsCatalog ?? []).filter((r) => {
    if (selectedCategory !== "All" && r.category !== selectedCategory) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !r.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredClaims = (claimedRewards ?? []).filter((c) => {
    if (
      searchQuery.trim() &&
      !c.rewardTitle.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.claimedByName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.claimedByEmail.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F39F6]/10 text-[#4F39F6]">
              <Gift size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#121215]">
                Rewards &amp; Points Management
              </h1>
              <p className="text-xs text-[#5E5E5E]">
                Kelola katalog hadiah penukaran poin siswa, atur nominal poin, kuota stok, dan pantau riwayat klaim.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>+ Tambah Reward Baru</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#5E5E5E] uppercase tracking-wider">
              Hadiah Aktif
            </p>
            <p className="text-2xl font-bold text-[#121215] mt-0.5">
              {totalActiveRewards}{" "}
              <span className="text-xs font-normal text-[#9CA3AF]">
                / {effectiveRewardsCatalog.length} item
              </span>
            </p>
          </div>
          <span className="h-10 w-10 rounded-xl bg-[#EEF2FF] text-[#4F39F6] flex items-center justify-center">
            <Gift size={20} />
          </span>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#5E5E5E] uppercase tracking-wider">
              Total Penukaran Siswa
            </p>
            <p className="text-2xl font-bold text-[#10B981] mt-0.5">
              {totalClaimsCount}{" "}
              <span className="text-xs font-normal text-[#9CA3AF]">klaim</span>
            </p>
          </div>
          <span className="h-10 w-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
            <ShoppingBag size={20} />
          </span>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#5E5E5E] uppercase tracking-wider">
              Total Poin Ditukarkan
            </p>
            <p className="text-2xl font-bold text-[#B45309] mt-0.5">
              {totalPointsRedeemed.toLocaleString()}{" "}
              <span className="text-xs font-normal text-[#9CA3AF]">★ pts</span>
            </p>
          </div>
          <span className="h-10 w-10 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
            <Award size={20} />
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EAECEF] pb-3">
        <div className="inline-flex items-center gap-1 rounded-xl bg-[#F8F9FB] p-1 border border-[#EAECEF]">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "catalog"
                ? "bg-[#FFFFFF] text-[#121215] shadow-2xs"
                : "text-[#5E5E5E] hover:text-[#121215]"
            }`}
          >
            <Gift size={14} />
            <span>Katalog Hadiah ({effectiveRewardsCatalog.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "claims"
                ? "bg-[#FFFFFF] text-[#121215] shadow-2xs"
                : "text-[#5E5E5E] hover:text-[#121215]"
            }`}
          >
            <Users size={14} />
            <span>Riwayat Penukaran Siswa ({claimedRewards.length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "catalog" && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg bg-[#FFFFFF] border border-[#EAECEF] px-2.5 py-1.5 text-xs font-semibold text-[#121215] focus:outline-none focus:border-[#4F39F6]"
            >
              <option value="All">Semua Kategori</option>
              <option value="Template">Template &amp; Asset</option>
              <option value="Ebook">E-Book &amp; Guide</option>
              <option value="Discount">Voucher Diskon</option>
              <option value="Mentoring">1-on-1 Mentoring</option>
              <option value="Merchandise">Official Merch</option>
            </select>
          )}

          <div className="relative min-w-[200px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari hadiah atau siswa..."
              className="w-full rounded-lg bg-[#FFFFFF] border border-[#EAECEF] pl-8 pr-3 py-1.5 text-xs font-medium text-[#121215] focus:outline-none focus:border-[#4F39F6]"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Katalog Hadiah Grid */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {filteredCatalog.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-12 text-center space-y-3">
              <Gift size={32} className="mx-auto text-[#9CA3AF]" />
              <p className="text-sm font-bold text-[#121215]">
                Belum ada hadiah yang sesuai kriteria
              </p>
              <p className="text-xs text-[#5E5E5E] max-w-sm mx-auto">
                Silakan tambahkan reward baru untuk siswa atau ubah filter pencarian Anda.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] text-white px-3.5 py-2 text-xs font-bold hover:bg-[#3B28CC] cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Reward Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map((reward) => {
                const catCfg =
                  REWARD_CATEGORY_CONFIG[reward.category as RewardCategory] ||
                  REWARD_CATEGORY_CONFIG.Template;
                return (
                  <div
                    key={reward.id}
                    className={`rounded-2xl bg-[#FFFFFF] border p-5 flex flex-col justify-between transition-all ${
                      reward.active
                        ? "border-[#EAECEF] shadow-2xs hover:border-[#4F39F6]/40"
                        : "border-[#EAECEF] opacity-60 bg-[#FAFAFA]"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border"
                          style={{
                            backgroundColor: catCfg.bgTint,
                            color: catCfg.textHex,
                            borderColor: catCfg.borderTint,
                          }}
                        >
                          {catCfg.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {reward.badge && (
                            <span className="rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-bold">
                              {reward.badge}
                            </span>
                          )}
                          <span
                            className={`h-2 w-2 rounded-full ${
                              reward.active ? "bg-[#10B981]" : "bg-[#9CA3AF]"
                            }`}
                            title={reward.active ? "Reward Aktif" : "Non-aktif"}
                          />
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-[#121215] leading-snug">
                        {reward.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#5E5E5E] line-clamp-3">
                        {reward.description}
                      </p>

                      {/* Value / Link Display */}
                      <div className="mt-3 p-2 rounded-lg bg-[#F8F9FB] border border-[#EAECEF] text-[11px] font-mono text-[#5E5E5E] truncate">
                        <span className="text-[#9CA3AF] font-sans mr-1">Akses:</span>
                        {reward.rewardValue}
                      </div>
                    </div>

                    {/* Bottom Stats & Controls */}
                    <div className="mt-4 pt-4 border-t border-[#EAECEF] flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-extrabold text-[#B45309]">
                          <Award size={15} className="text-[#F59E0B]" />
                          <span>{reward.pointsCost.toLocaleString()} ★ pts</span>
                        </div>
                        <p className="text-[10px] text-[#9CA3AF]">
                          Stok:{" "}
                          <strong className="text-[#121215]">
                            {reward.stock === -1 ? "Tak Terbatas" : reward.stock}
                          </strong>{" "}
                          • Ditukar:{" "}
                          <strong className="text-[#121215]">
                            {reward.claimedCount}x
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(reward)}
                          title="Edit Reward"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAECEF] text-[#5E5E5E] hover:text-[#4F39F6] hover:bg-[#EEF2FF] transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(reward)}
                          title="Hapus Reward"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAECEF] text-[#EF4444] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Riwayat Penukaran Siswa Table */}
      {activeTab === "claims" && (
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden shadow-2xs">
          {filteredClaims.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShoppingBag size={28} className="mx-auto text-[#9CA3AF]" />
              <p className="text-sm font-bold text-[#121215]">
                Belum ada penukaran hadiah dari siswa
              </p>
              <p className="text-xs text-[#5E5E5E]">
                Saat siswa menukarkan poin mereka dengan hadiah, daftarnya akan tercatat rapi di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9FB] text-[#5E5E5E] border-b border-[#EAECEF]">
                    <th className="py-3 px-4 font-semibold">Nama Siswa</th>
                    <th className="py-3 px-4 font-semibold">Hadiah yang Ditukar</th>
                    <th className="py-3 px-4 font-semibold">Kategori</th>
                    <th className="py-3 px-4 font-semibold">Poin Digunakan</th>
                    <th className="py-3 px-4 font-semibold">Waktu Penukaran</th>
                    <th className="py-3 px-4 font-semibold">Nilai / Akses Hadiah</th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF]">
                  {filteredClaims.map((claim) => {
                    const catCfg = REWARD_CATEGORY_CONFIG[claim.category];
                    return (
                      <tr key={claim.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#121215]">{claim.claimedByName}</p>
                          <p className="text-[11px] text-[#5E5E5E]">{claim.claimedByEmail}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#121215]">
                          {claim.rewardTitle}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border"
                            style={{
                              backgroundColor: catCfg.bgTint,
                              color: catCfg.textHex,
                              borderColor: catCfg.borderTint,
                            }}
                          >
                            {catCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-[#B45309]">
                          -{claim.pointsSpent.toLocaleString()} ★ pts
                        </td>
                        <td className="py-3 px-4 text-[#5E5E5E]">
                          {new Date(claim.claimedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#121215] max-w-xs truncate">
                          {claim.rewardValue}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#059669]">
                            <CheckCircle2 size={11} />
                            <span>{claim.status}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Tambah / Edit Reward */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-[#4F39F6]" />
                <h2 className="text-base font-bold text-[#121215]">
                  {editingReward ? "Edit Hadiah Reward" : "Tambah Hadiah Reward Baru"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#121215] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-4 text-xs">
              {/* Judul Hadiah */}
              <div>
                <label className="block font-bold text-[#121215] mb-1">
                  Judul Hadiah <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Misal: Carousel Master Figma Kit v2"
                  className="w-full rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-medium text-[#121215] focus:outline-none focus:border-[#4F39F6]"
                />
              </div>

              {/* Kategori & Biaya Poin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#121215] mb-1">
                    Kategori Hadiah
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as RewardCategory)}
                    className="w-full rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-semibold text-[#121215] focus:outline-none focus:border-[#4F39F6]"
                  >
                    <option value="Template">Template &amp; Asset</option>
                    <option value="Ebook">E-Book &amp; Guide</option>
                    <option value="Discount">Voucher Diskon</option>
                    <option value="Mentoring">1-on-1 Mentoring</option>
                    <option value="Merchandise">Official Merch</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#121215] mb-1">
                    Biaya Poin (★ pts) <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    className="w-full rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-extrabold text-[#B45309] focus:outline-none focus:border-[#4F39F6]"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-bold text-[#121215] mb-1">
                  Deskripsi Singkat Hadiah
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan manfaat dan apa saja yang didapat siswa setelah menukarkan hadiah ini..."
                  className="w-full rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-medium text-[#121215] focus:outline-none focus:border-[#4F39F6]"
                />
              </div>

              {/* Nilai / Akses Hadiah */}
              <div>
                <label className="block font-bold text-[#121215] mb-1">
                  Akses / Link Download / Kode Kupon Hadiah <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formRewardValue}
                  onChange={(e) => setFormRewardValue(e.target.value)}
                  placeholder="Misal: Link Google Drive, Link Figma, Kode Kupon 'DISKON50', dsb."
                  className="w-full rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-mono text-[#121215] focus:outline-none focus:border-[#4F39F6]"
                />
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  Nilai ini akan langsung diberikan kepada siswa begitu mereka berhasil menukarkan poin.
                </p>
              </div>

              {/* Badge Promo & Kuota Stok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#121215] mb-1">
                    Badge Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="Misal: Popular 🔥, Terbatas ⚡"
                    className="w-full rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-medium text-[#121215] focus:outline-none focus:border-[#4F39F6]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#121215] mb-1">
                    Kuota Stok Hadiah
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      disabled={formIsUnlimited}
                      min={0}
                      value={formIsUnlimited ? "" : formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      placeholder="Stok"
                      className="w-24 rounded-lg bg-[#F8F9FB] border border-[#EAECEF] px-3 py-2 font-bold text-[#121215] disabled:opacity-40 focus:outline-none focus:border-[#4F39F6]"
                    />
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#5E5E5E]">
                      <input
                        type="checkbox"
                        checked={formIsUnlimited}
                        onChange={(e) => setFormIsUnlimited(e.target.checked)}
                        className="rounded accent-[#4F39F6]"
                      />
                      <span>Tanpa Batas</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Status Aktif */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-[#121215]">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded accent-[#4F39F6]"
                  />
                  <span>Tampilkan dan aktifkan hadiah ini di Reward Shop siswa</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF] px-4 py-2 font-bold text-[#5E5E5E] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] text-white px-5 py-2 font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {editingReward ? "Simpan Perubahan" : "Buat Reward Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
