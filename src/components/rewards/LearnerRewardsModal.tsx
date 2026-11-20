"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Gift,
  Award,
  Sparkles,
  CheckCircle2,
  Lock,
  ExternalLink,
  Copy,
  ShoppingBag,
  X,
  BookOpen,
  FileText,
  Users,
  Ticket,
  Star,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import {
  REWARD_CATEGORY_CONFIG,
  type RewardCategory,
  type RewardItem,
  type ClaimedRewardRecord,
} from "@/lib/rewards-data";

interface LearnerRewardsModalProps {
  open: boolean;
  onClose: () => void;
  learnerName: string;
  learnerEmail?: string;
  onShowToast: (msg: string) => void;
}

export function LearnerRewardsModal({
  open,
  onClose,
  learnerName,
  learnerEmail,
  onShowToast,
}: LearnerRewardsModalProps) {
  const { learnerPoints, rewardsCatalog, claimedRewards, redeemReward } =
    useRuangSosmedStore();

  const [activeTab, setActiveTab] = useState<"catalog" | "my-claims">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [confirmingReward, setConfirmingReward] = useState<RewardItem | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (confirmingReward) {
          setConfirmingReward(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, confirmingReward]);

  if (!open) return null;

  // Fallback instant reading from local storage if store is still hydrating
  const effectiveCatalog: RewardItem[] =
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

  const availableRewards = (effectiveCatalog ?? []).filter((r) => r.active);

  const filteredRewards = availableRewards.filter((r) => {
    if (selectedCategory !== "All" && r.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Filter user's claimed rewards
  const myClaims = (claimedRewards ?? []).filter(
    (c) =>
      c.claimedByName.toLowerCase() === learnerName.toLowerCase() ||
      (learnerEmail &&
        c.claimedByEmail.toLowerCase() === learnerEmail.toLowerCase())
  );

  const handleConfirmRedeem = () => {
    if (!confirmingReward) return;

    const result = redeemReward(
      confirmingReward.id,
      learnerName,
      learnerEmail
    );

    if (result.success) {
      onShowToast(result.message);
      setConfirmingReward(null);
      setActiveTab("my-claims");
    } else {
      onShowToast(result.message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    try {
      void navigator.clipboard.writeText(text);
      onShowToast(`Berhasil menyalin ${label} ke clipboard!`);
    } catch {
      onShowToast(`Salin: ${text}`);
    }
  };

  const renderCategoryIcon = (category: RewardCategory | string) => {
    switch (category) {
      case "Ebook":
        return <BookOpen size={16} />;
      case "Discount":
        return <Ticket size={16} />;
      case "Mentoring":
        return <Users size={16} />;
      case "Merchandise":
        return <ShoppingBag size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const earnTipsCard = (isGridTile: boolean) => (
    <div
      className={`rounded-2xl bg-gradient-to-br from-[#EEF2FF]/90 via-white to-[#F5F3FF]/80 border border-[#C7D2FE]/70 p-4 flex flex-col justify-between gap-3 ${
        isGridTile ? "" : "sm:col-span-2"
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4F39F6]/10 text-[#4F39F6]">
            <Star size={16} className="text-[#4F39F6]" fill="currentColor" />
          </span>
          <div>
            <p className="text-xs font-extrabold text-[#121215]">
              Cara Cepat Kumpulkan Poin
            </p>
            <p className="text-[11px] text-[#5E5E5E]">
              Kejar target hadiah favoritmu dengan aktif belajar
            </p>
          </div>
        </div>

        <div
          className={`grid gap-2 ${
            isGridTile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
          {[
            {
              title: "Selesaikan Bab Materi",
              desc: "Tandai bab selesai setelah menyimak video & panduan.",
              pts: "+2–15 pts",
            },
            {
              title: "Lulus Kuis & Tugas",
              desc: "Raih nilai terbaik di evaluasi modul & praktik.",
              pts: "+50–120 pts",
            },
            {
              title: "Bonus Apresiasi Mentor",
              desc: "Aktif berdiskusi & konsisten menyelesaikan batch.",
              pts: "Bonus pts",
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="rounded-xl bg-white/90 border border-[#EAECEF] px-3 py-2 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#121215]">
                  {tip.title}
                </p>
                <p className="text-[10px] text-[#64748B] leading-snug mt-0.5">
                  {tip.desc}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30 px-1.5 py-0.5 text-[9px] font-extrabold">
                {tip.pts}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewards-shop-modal-title"
      onClick={onClose}
      className="fixed inset-0 !m-0 w-screen h-dvh z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/55 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-[0_20px_60px_rgba(15,23,42,0.28)] flex flex-col max-h-[88dvh] overflow-hidden cursor-default"
      >
        {/* Top Header Banner */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-[#4F39F6] via-[#5B4DF7] to-[#7C3AED] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/18 backdrop-blur-md border border-white/25 text-white shadow-inner">
              <Gift size={22} />
            </span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                <Sparkles size={10} />
                <span>Ruang Sosmed Rewards Shop</span>
              </div>
              <h2
                id="rewards-shop-modal-title"
                className="text-base sm:text-xl font-extrabold tracking-tight truncate mt-1"
              >
                Tukar Poin Prestasi dengan Hadiah Eksklusif
              </h2>
            </div>
          </div>

          {/* User Current Points Wallet & Close Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            <div className="rounded-xl bg-white/18 backdrop-blur-md px-3.5 py-2 border border-white/25 text-right">
              <p className="text-[10px] font-semibold text-white/85 uppercase tracking-wider leading-none">
                Saldo Poin Anda
              </p>
              <p className="text-base sm:text-lg font-black text-[#FEF3C7] flex items-center gap-1 justify-end leading-none mt-1 tabular-nums">
                <Award size={15} className="text-[#FBBF24]" />
                <span>{learnerPoints.toLocaleString()}</span>
                <span className="text-[11px] font-semibold text-white/90">pts</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Rewards Shop"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/28 border border-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sub-Tabs: Katalog vs Hadiah Saya */}
        <div className="px-5 pt-3 border-b border-[#EAECEF] bg-[#FFFFFF] flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "border-[#4F39F6] text-[#4F39F6]"
                  : "border-transparent text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              Katalog Hadiah ({availableRewards.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my-claims")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "my-claims"
                  ? "border-[#4F39F6] text-[#4F39F6]"
                  : "border-transparent text-[#5E5E5E] hover:text-[#121215]"
              }`}
            >
              Hadiah Saya ({myClaims.length})
            </button>
          </div>

          {/* Category Filter Pills (Only on catalog tab) */}
          {activeTab === "catalog" && (
            <div className="flex items-center gap-1.5 pb-2 overflow-x-auto text-[11px]">
              {[
                { id: "All", label: "Semua" },
                { id: "Template", label: "Template" },
                { id: "Ebook", label: "E-Book" },
                { id: "Discount", label: "Voucher" },
                { id: "Mentoring", label: "Mentoring" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1 font-semibold border transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-[#4F39F6] border-[#4F39F6] text-white shadow-2xs"
                      : "bg-[#F8F9FB] border-[#EAECEF] text-[#5E5E5E] hover:bg-[#EAECEF]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#F8FAFC] space-y-4">
          {activeTab === "catalog" ? (
            filteredRewards.length === 0 ? (
              <div className="space-y-4">
                <div className="p-8 text-center rounded-2xl bg-white border border-[#EAECEF] space-y-2">
                  <Gift size={32} className="mx-auto text-[#9CA3AF]" />
                  <p className="text-sm font-bold text-[#121215]">
                    Tidak ada hadiah di kategori ini
                  </p>
                  <p className="text-xs text-[#5E5E5E]">
                    Coba pilih kategori lain untuk melihat reward yang tersedia.
                  </p>
                </div>
                {earnTipsCard(false)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRewards.map((reward) => {
                  const catCfg =
                    REWARD_CATEGORY_CONFIG[reward.category as RewardCategory] ||
                    REWARD_CATEGORY_CONFIG.Template;
                  const hasEnoughPoints = learnerPoints >= reward.pointsCost;
                  const isOutOfStock =
                    reward.stock !== -1 && reward.stock <= 0;
                  const targetCost = Math.max(1, reward.pointsCost);
                  const progressTowardPct = Math.min(
                    100,
                    Math.round((learnerPoints / targetCost) * 100)
                  );

                  return (
                    <div
                      key={reward.id}
                      className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_20px_rgba(79,57,246,0.08)] hover:border-[#4F39F6]/40 transition-all flex flex-col justify-between gap-3.5"
                    >
                      <div className="space-y-2.5">
                        {/* Top Category Icon + Label + Stock / Promo Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
                              style={{
                                backgroundColor: catCfg.bgTint,
                                color: catCfg.textHex,
                                borderColor: catCfg.borderTint,
                              }}
                            >
                              {renderCategoryIcon(reward.category)}
                            </span>
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border truncate"
                              style={{
                                backgroundColor: catCfg.bgTint,
                                color: catCfg.textHex,
                                borderColor: catCfg.borderTint,
                              }}
                            >
                              {catCfg.label}
                            </span>
                          </div>

                          {reward.badge ? (
                            <span className="rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-bold shrink-0">
                              {reward.badge}
                            </span>
                          ) : (
                            <span className="rounded-md bg-[#F8FAFC] text-[#64748B] border border-[#EAECEF] px-2 py-0.5 text-[10px] font-semibold shrink-0">
                              {reward.stock === -1
                                ? "Stok Tersedia"
                                : `Sisa ${reward.stock}`}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-sm font-bold text-[#121215] leading-snug">
                            {reward.title}
                          </h3>
                          <p className="mt-1 text-xs text-[#5E5E5E] leading-relaxed line-clamp-3">
                            {reward.description}
                          </p>
                        </div>

                        {/* Points Progress Bar toward Reward */}
                        <div className="rounded-xl bg-[#F8FAFC] border border-[#EAECEF]/80 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className="text-[#64748B]">
                              Progres Poin Anda
                            </span>
                            <span
                              className={`tabular-nums font-bold ${
                                hasEnoughPoints
                                  ? "text-emerald-600"
                                  : "text-[#4F39F6]"
                              }`}
                            >
                              {Math.min(learnerPoints, reward.pointsCost).toLocaleString()} /{" "}
                              {reward.pointsCost.toLocaleString()} pts ({progressTowardPct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                hasEnoughPoints
                                  ? "bg-emerald-500"
                                  : "bg-[#4F39F6]"
                              }`}
                              style={{ width: `${progressTowardPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Price & Redeem Button */}
                      <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <Award size={16} className="text-[#F59E0B] shrink-0" />
                          <span className="text-base font-black text-[#B45309] tabular-nums">
                            {reward.pointsCost.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-[#5E5E5E]">
                            pts
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!hasEnoughPoints || isOutOfStock}
                          onClick={() => setConfirmingReward(reward)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                            isOutOfStock
                              ? "bg-[#EAECEF] text-[#9CA3AF] cursor-not-allowed"
                              : hasEnoughPoints
                              ? "bg-[#4F39F6] hover:bg-[#3B28CC] text-white shadow-xs"
                              : "bg-[#F8F9FB] text-[#64748B] border border-[#EAECEF] cursor-not-allowed"
                          }`}
                        >
                          {isOutOfStock ? (
                            <span>Stok Habis</span>
                          ) : hasEnoughPoints ? (
                            <>
                              <Gift size={13} />
                              <span>Tukar Hadiah</span>
                            </>
                          ) : (
                            <>
                              <Lock size={12} />
                              <span>
                                Kurang{" "}
                                {(reward.pointsCost - learnerPoints).toLocaleString()}{" "}
                                pts
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Companion Earn-Points Card to balance odd/single grids */}
                {earnTipsCard(filteredRewards.length % 2 === 1)}
              </div>
            )
          ) : myClaims.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-[#EAECEF] space-y-2">
              <ShoppingBag size={32} className="mx-auto text-[#9CA3AF]" />
              <p className="text-sm font-bold text-[#121215]">
                Belum ada hadiah yang ditukarkan
              </p>
              <p className="text-xs text-[#5E5E5E] max-w-sm mx-auto">
                Kumpulkan poin dengan menyelesaikan chapter dan kuis, lalu tukarkan dengan reward di tab Katalog Hadiah!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myClaims.map((claim) => {
                const catCfg = REWARD_CATEGORY_CONFIG[claim.category];
                const isUrl =
                  claim.rewardValue.startsWith("http://") ||
                  claim.rewardValue.startsWith("https://");

                return (
                  <div
                    key={claim.id}
                    className="rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
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
                          <span className="text-[11px] text-[#9CA3AF]">
                            Ditukar pada{" "}
                            {new Date(claim.claimedAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#121215] mt-1">
                          {claim.rewardTitle}
                        </h3>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">
                        <CheckCircle2 size={12} />
                        <span>Berhasil Diklaim</span>
                      </span>
                    </div>

                    {/* Reward Value Display & Actions */}
                    <div className="p-3 rounded-xl bg-[#F8F9FB] border border-[#EAECEF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                          Akses Hadiah Anda
                        </p>
                        <p className="text-xs font-mono font-bold text-[#121215] truncate mt-0.5">
                          {claim.rewardValue}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isUrl ? (
                          <a
                            href={claim.rewardValue}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#3B28CC] transition-colors"
                          >
                            <span>Buka Link Download</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(claim.rewardValue, "Kode Hadiah")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F39F6] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#3B28CC] transition-colors cursor-pointer"
                          >
                            <Copy size={12} />
                            <span>Salin Kode</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmingReward && (
          <div
            onClick={() => setConfirmingReward(null)}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#EAECEF] shadow-2xl p-6 text-center space-y-4 cursor-default"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#B45309]">
                <Gift size={24} />
              </span>

              <div>
                <h3 className="text-base font-bold text-[#121215]">
                  Konfirmasi Penukaran Hadiah
                </h3>
                <p className="mt-1 text-xs text-[#5E5E5E]">
                  Apakah Anda yakin ingin menukarkan{" "}
                  <strong className="text-[#B45309]">
                    {confirmingReward.pointsCost.toLocaleString()} ★ pts
                  </strong>{" "}
                  untuk mendapatkan:
                </p>
                <p className="mt-2 text-sm font-extrabold text-[#4F39F6] p-2 bg-[#EEF2FF] rounded-xl border border-[#C7D2FE]">
                  {confirmingReward.title}
                </p>
                <p className="mt-2 text-[11px] text-[#9CA3AF]">
                  Sisa poin Anda setelah penukaran:{" "}
                  <strong className="text-[#121215]">
                    {(learnerPoints - confirmingReward.pointsCost).toLocaleString()} pts
                  </strong>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReward(null)}
                  className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF] px-4 py-2 text-xs font-bold text-[#5E5E5E] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedeem}
                  className="rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Ya, Tukar Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clean Modal Footer Bar */}
        <div className="px-5 py-3 bg-white border-t border-[#EAECEF] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#64748B]">
            {availableRewards.length} hadiah tersedia •{" "}
            <strong className="text-[#121215]">{myClaims.length}</strong> sudah ditukar
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF] border border-[#EAECEF] px-4 py-1.5 text-xs font-bold text-[#121215] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
