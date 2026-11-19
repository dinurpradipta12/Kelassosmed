"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  Layers,
  PieChart,
  RotateCw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  formatIndoDate,
  getTodayIsoDate,
  toIsoDateString,
  type SubscriptionStatusInfo,
} from "@/lib/subscription-utils";

export interface InsightsMemberRecord {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  avatarBg: string;
  avatarText: string;
  jobTitle: string;
  cohort: string;
  accessRole: "Learner" | "Mentor" | "Admin";
  assignedCount: number;
  completedChapters: number;
  totalChapters: number;
  avgQuizScore: number;
  points: number;
  credentialId: string;
  subscriptionTier?: "PRO" | "Free";
  proStartedAt?: string | null;
  proExpiresAt?: string | null;
  proPackageName?: string | null;
  createdAt?: string | null;
  paymentMethod?: string | null;
}

export interface InsightsProRequestRecord {
  id: string;
  user_email: string;
  user_name: string;
  package_name: string;
  price_label: string;
  payment_method: string;
  buyer_contact?: string;
  proof_url?: string | null;
  status?: string | null;
  created_at: string;
}

export interface InsightsConfiguredPackage {
  id: string;
  name: string;
  priceLabel: string;
  periodLabel: string;
}

interface AdminDirectoryInsightsModalProps {
  open: boolean;
  onClose: () => void;
  members: InsightsMemberRecord[];
  getMemberSubInfo: (member: any) => SubscriptionStatusInfo | null;
  proRequests: InsightsProRequestRecord[];
  configuredPackages: InsightsConfiguredPackage[];
  cohortNames: string[];
  totalCoinsRedeemed: number;
  totalRewardsClaimedCount: number;
  onQuickExtend30Days: (member: any) => void;
  onOpenRenewModal: (member: any) => void;
  onInspectMember: (member: any) => void;
  quickExtendingEmail: string | null;
}

type InsightsViewTab = "overview" | "revenue" | "lifecycle" | "cohorts";

const PACKAGE_COLORS = [
  "#4F39F6",
  "#10B981",
  "#F59E0B",
  "#0EA5E9",
  "#EC4899",
  "#8B5CF6",
];

function formatIdr(amount: number): string {
  try {
    return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
  } catch {
    return `Rp ${Math.round(amount)}`;
  }
}

function formatIdrCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `Rp ${val.toFixed(val >= 10 ? 1 : 2).replace(/\.00$/, "")} jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${Math.round(amount / 1_000)} rb`;
  }
  return `Rp ${Math.round(amount)}`;
}

function parseIdrAmount(label?: string | null): number {
  if (!label) return 0;
  const raw = String(label).trim();
  if (!raw) return 0;
  const rpMatch = raw.match(/rp\s*([0-9][0-9.,]*)/i);
  if (rpMatch && rpMatch[1]) {
    const digits = rpMatch[1].replace(/[.,]/g, "");
    const num = Number.parseInt(digits, 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  const firstBigGroup = raw.match(/([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,})/);
  if (firstBigGroup && firstBigGroup[1]) {
    const digits = firstBigGroup[1].replace(/[.,]/g, "");
    const num = Number.parseInt(digits, 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  return 0;
}

function inferPackageSpecs(
  packageName: string | null | undefined,
  configuredPackages: InsightsConfiguredPackage[],
  explicitPrice?: number
): { name: string; unitPrice: number; durationMonths: number; periodText: string } {
  const cleanName = (packageName || "").trim() || "Learner PRO Monthly";
  const lower = cleanName.toLowerCase();

  const cfgMatch = configuredPackages.find(
    (p) =>
      p.name.trim().toLowerCase() === lower ||
      lower.includes(p.name.trim().toLowerCase()) ||
      p.name.trim().toLowerCase().includes(lower)
  );

  let durationMonths = 1;
  let periodText = "Bulanan (30 Hari)";
  let fallbackPrice = 149_000;

  if (lower.includes("year") || lower.includes("tahun") || lower.includes("12")) {
    durationMonths = 12;
    periodText = "Tahunan (12 Bln)";
    fallbackPrice = 1_290_000;
  } else if (lower.includes("6 month") || lower.includes("6 bulan") || lower.includes("semester")) {
    durationMonths = 6;
    periodText = "6 Bulan (180 Hari)";
    fallbackPrice = 749_000;
  } else if (lower.includes("quarter") || lower.includes("3 bulan") || lower.includes("triwulan")) {
    durationMonths = 3;
    periodText = "3 Bulan (90 Hari)";
    fallbackPrice = 399_000;
  } else if (cfgMatch) {
    const cfgPeriod = `${cfgMatch.periodLabel || ""}`.toLowerCase();
    if (cfgPeriod.includes("year") || cfgPeriod.includes("tahun")) {
      durationMonths = 12;
      periodText = "Tahunan";
    } else if (cfgPeriod.includes("quarter") || cfgPeriod.includes("3")) {
      durationMonths = 3;
      periodText = "3 Bulan";
    }
  }

  const cfgPrice = cfgMatch ? parseIdrAmount(cfgMatch.priceLabel) : 0;
  const resolvedPrice =
    explicitPrice && explicitPrice > 0
      ? explicitPrice
      : cfgPrice > 0
      ? cfgPrice
      : fallbackPrice;

  return {
    name: cfgMatch?.name || cleanName,
    unitPrice: resolvedPrice,
    durationMonths,
    periodText,
  };
}

function getMonthKey(dateInput?: string | null): string | null {
  const iso = toIsoDateString(dateInput);
  if (!iso) return null;
  return iso.slice(0, 7);
}

function getLastSixMonths(): Array<{ key: string; label: string; shortLabel: string }> {
  const now = new Date();
  const res: Array<{ key: string; label: string; shortLabel: string }> = [];
  const monthNamesShort = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const mName = monthNamesShort[d.getMonth()] || mm;
    res.push({
      key: `${yyyy}-${mm}`,
      label: `${mName} ${yyyy}`,
      shortLabel: `${mName} '${String(yyyy).slice(-2)}`,
    });
  }
  return res;
}

export function AdminDirectoryInsightsModal({
  open,
  onClose,
  members,
  getMemberSubInfo,
  proRequests,
  configuredPackages,
  cohortNames,
  totalCoinsRedeemed,
  totalRewardsClaimedCount,
  onQuickExtend30Days,
  onOpenRenewModal,
  onInspectMember,
  quickExtendingEmail,
}: AdminDirectoryInsightsModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeTab, setActiveTab] = useState<InsightsViewTab>("overview");
  const [cohortScope, setCohortScope] = useState<string>("All Cohorts");
  const [trendMode, setTrendMode] = useState<"revenue" | "users">("revenue");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);

    // Light-dismiss fallback when `closedby="any"` is unsupported
    let cleanupOutsideDismiss: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          onClose();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupOutsideDismiss = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
      cleanupOutsideDismiss?.();
    };
  }, [onClose]);

  const analytics = useMemo(() => {
    const scopedMembers =
      cohortScope === "All Cohorts"
        ? members
        : members.filter(
            (m) => m.cohort.toLowerCase() === cohortScope.toLowerCase()
          );

    const learners = scopedMembers.filter((m) => m.accessRole === "Learner");
    const staff = scopedMembers.filter((m) => m.accessRole !== "Learner");

    const memberEmailSet = new Set(
      learners.map((l) => (l.email || "").toLowerCase().trim()).filter(Boolean)
    );

    const scopedRequests =
      cohortScope === "All Cohorts"
        ? proRequests
        : proRequests.filter((r) =>
            memberEmailSet.has((r.user_email || "").toLowerCase().trim())
          );

    const approvedReqByEmail = new Map<string, InsightsProRequestRecord[]>();
    const pendingRequests: InsightsProRequestRecord[] = [];
    scopedRequests.forEach((req) => {
      const st = String(req.status || "pending").toLowerCase();
      const emailLower = (req.user_email || "").toLowerCase().trim();
      if (st === "pending") {
        pendingRequests.push(req);
      } else if (st === "approved" && emailLower) {
        const list = approvedReqByEmail.get(emailLower) || [];
        list.push(req);
        approvedReqByEmail.set(emailLower, list);
      }
    });

    type EnrichedLearner = {
      member: InsightsMemberRecord;
      subInfo: SubscriptionStatusInfo;
      pkgName: string;
      unitPrice: number;
      durationMonths: number;
      mrrContribution: number;
      periodText: string;
      progressPct: number;
      paymentChannel: string;
    };

    const enrichedLearners: EnrichedLearner[] = learners.map((member) => {
      const subInfo = getMemberSubInfo(member) || {
        status: "free",
        daysRemaining: null,
        startedDateIso: null,
        dueDateIso: null,
        startedLabel: "—",
        dueLabel: "—",
        badgeLabel: "Free Plan",
        isEffectivelyPro: false,
      };
      const emailLower = (member.email || "").toLowerCase().trim();
      const approvedList = approvedReqByEmail.get(emailLower) || [];
      const latestApproved = approvedList[0];
      const explicitReqPrice = latestApproved
        ? parseIdrAmount(latestApproved.price_label)
        : 0;
      const spec = inferPackageSpecs(
        member.proPackageName || latestApproved?.package_name,
        configuredPackages,
        explicitReqPrice
      );
      const progressPct =
        member.totalChapters > 0
          ? Math.min(
              100,
              Math.round((member.completedChapters / member.totalChapters) * 100)
            )
          : 0;

      const rawMethod = String(
        latestApproved?.payment_method || member.paymentMethod || ""
      ).toLowerCase();
      let paymentChannel = "Aktivasi Manual Admin";
      if (subInfo.status === "free") {
        paymentChannel = "Free Tier";
      } else if (rawMethod.includes("qris") || rawMethod.includes("ewallet")) {
        paymentChannel = "QRIS / e-Wallet";
      } else if (rawMethod.includes("transfer") || rawMethod.includes("bank") || rawMethod.includes("bca") || rawMethod.includes("mandiri")) {
        paymentChannel = "Transfer Bank Manual";
      } else if (rawMethod.includes("admin verified") || latestApproved) {
        paymentChannel = "Checkout + Verifikasi Admin";
      }

      return {
        member,
        subInfo,
        pkgName: spec.name,
        unitPrice: spec.unitPrice,
        durationMonths: spec.durationMonths,
        mrrContribution: Math.round(spec.unitPrice / spec.durationMonths),
        periodText: spec.periodText,
        progressPct,
        paymentChannel,
      };
    });

    const proActiveHealthy = enrichedLearners.filter(
      (e) => e.subInfo.status === "active"
    );
    const proExpiringSoon = enrichedLearners.filter(
      (e) => e.subInfo.status === "expiring_soon"
    );
    const proExpired = enrichedLearners.filter(
      (e) => e.subInfo.status === "expired"
    );
    const freeLearners = enrichedLearners.filter(
      (e) => e.subInfo.status === "free"
    );
    const allProSubscribers = enrichedLearners.filter(
      (e) => e.subInfo.status !== "free"
    );
    const effectiveProNow = [...proActiveHealthy, ...proExpiringSoon];

    const conversionRate =
      learners.length > 0
        ? Math.round((effectiveProNow.length / learners.length) * 100)
        : 0;
    const retentionHealthPct =
      allProSubscribers.length > 0
        ? Math.round(
            (effectiveProNow.length / allProSubscribers.length) * 100
          )
        : 100;

    // Revenue by package
    const pkgAgg = new Map<
      string,
      {
        packageName: string;
        periodText: string;
        unitPrice: number;
        totalSubscribers: number;
        activeCount: number;
        expiringCount: number;
        expiredCount: number;
        grossRevenue: number;
        mrr: number;
        pendingCount: number;
        pendingValue: number;
      }
    >();

    // Seed configured packages so even 0-subscriber packages can be compared clearly if desired
    configuredPackages.forEach((cfg) => {
      const spec = inferPackageSpecs(cfg.name, configuredPackages);
      pkgAgg.set(spec.name, {
        packageName: spec.name,
        periodText: spec.periodText,
        unitPrice: spec.unitPrice,
        totalSubscribers: 0,
        activeCount: 0,
        expiringCount: 0,
        expiredCount: 0,
        grossRevenue: 0,
        mrr: 0,
        pendingCount: 0,
        pendingValue: 0,
      });
    });

    allProSubscribers.forEach((item) => {
      const existing = pkgAgg.get(item.pkgName) || {
        packageName: item.pkgName,
        periodText: item.periodText,
        unitPrice: item.unitPrice,
        totalSubscribers: 0,
        activeCount: 0,
        expiringCount: 0,
        expiredCount: 0,
        grossRevenue: 0,
        mrr: 0,
        pendingCount: 0,
        pendingValue: 0,
      };

      const emailLower = (item.member.email || "").toLowerCase().trim();
      const extraApprovedCount = Math.max(
        1,
        (approvedReqByEmail.get(emailLower) || []).length
      );

      existing.totalSubscribers += 1;
      if (item.subInfo.status === "active") existing.activeCount += 1;
      if (item.subInfo.status === "expiring_soon") existing.expiringCount += 1;
      if (item.subInfo.status === "expired") existing.expiredCount += 1;
      existing.grossRevenue += item.unitPrice * extraApprovedCount;
      if (item.subInfo.status !== "expired") {
        existing.mrr += item.mrrContribution;
      }
      pkgAgg.set(item.pkgName, existing);
    });

    pendingRequests.forEach((req) => {
      const spec = inferPackageSpecs(
        req.package_name,
        configuredPackages,
        parseIdrAmount(req.price_label)
      );
      const existing = pkgAgg.get(spec.name) || {
        packageName: spec.name,
        periodText: spec.periodText,
        unitPrice: spec.unitPrice,
        totalSubscribers: 0,
        activeCount: 0,
        expiringCount: 0,
        expiredCount: 0,
        grossRevenue: 0,
        mrr: 0,
        pendingCount: 0,
        pendingValue: 0,
      };
      existing.pendingCount += 1;
      existing.pendingValue += spec.unitPrice;
      pkgAgg.set(spec.name, existing);
    });

    const packageBreakdown = Array.from(pkgAgg.values())
      .filter((p) => p.totalSubscribers > 0 || p.pendingCount > 0 || configuredPackages.some((c) => c.name === p.packageName))
      .sort((a, b) => b.grossRevenue - a.grossRevenue || b.pendingValue - a.pendingValue);

    const totalGrossRevenue = packageBreakdown.reduce(
      (sum, p) => sum + p.grossRevenue,
      0
    );
    const totalMrr = packageBreakdown.reduce((sum, p) => sum + p.mrr, 0);
    const totalPendingRevenue = pendingRequests.reduce((sum, req) => {
      const pVal = parseIdrAmount(req.price_label);
      return (
        sum +
        (pVal > 0
          ? pVal
          : inferPackageSpecs(req.package_name, configuredPackages).unitPrice)
      );
    }, 0);
    const renewalAtRiskRevenue = [...proExpiringSoon, ...proExpired].reduce(
      (sum, e) => sum + e.unitPrice,
      0
    );
    const arpuPerPro =
      allProSubscribers.length > 0
        ? Math.round(totalGrossRevenue / allProSubscribers.length)
        : 0;

    // Academic & coin KPIs
    const avgProgressPct =
      learners.length > 0
        ? Math.round(
            enrichedLearners.reduce((s, e) => s + e.progressPct, 0) /
              learners.length
          )
        : 0;
    const quizTaken = enrichedLearners.filter((e) => e.member.avgQuizScore > 0);
    const avgQuizScore =
      quizTaken.length > 0
        ? Math.round(
            quizTaken.reduce((s, e) => s + e.member.avgQuizScore, 0) /
              quizTaken.length
          )
        : 0;
    const highPerformersCount = enrichedLearners.filter(
      (e) => e.progressPct >= 80 || e.member.avgQuizScore >= 85
    ).length;
    const totalPointsAll = learners.reduce(
      (s, l) => s + Number(l.points || 0),
      0
    );
    const avgPointsPerLearner =
      learners.length > 0 ? Math.round(totalPointsAll / learners.length) : 0;

    // Monthly 6-month trend
    const months = getLastSixMonths();
    const earliestKey = months[0]?.key || "2026-06";
    let priorUsers = 0;
    let priorPro = 0;

    const monthStats = months.map((m) => ({
      ...m,
      newUsers: 0,
      newPro: 0,
      revenue: 0,
      cumulativeUsers: 0,
      cumulativePro: 0,
    }));

    const monthIdxMap = new Map(monthStats.map((m, idx) => [m.key, idx]));

    enrichedLearners.forEach((item) => {
      const joinedKey =
        getMonthKey(item.member.createdAt) ||
        getMonthKey(item.subInfo.startedDateIso) ||
        months[months.length - 1].key;

      if (joinedKey < earliestKey) {
        priorUsers += 1;
      } else if (monthIdxMap.has(joinedKey)) {
        monthStats[monthIdxMap.get(joinedKey)!].newUsers += 1;
      } else {
        monthStats[monthStats.length - 1].newUsers += 1;
      }

      if (item.subInfo.status !== "free") {
        const proKey =
          getMonthKey(item.subInfo.startedDateIso) ||
          getMonthKey(item.member.createdAt) ||
          months[months.length - 1].key;
        if (proKey < earliestKey) {
          priorPro += 1;
        } else if (monthIdxMap.has(proKey)) {
          const idx = monthIdxMap.get(proKey)!;
          monthStats[idx].newPro += 1;
          monthStats[idx].revenue += item.unitPrice;
        } else {
          const last = monthStats[monthStats.length - 1];
          last.newPro += 1;
          last.revenue += item.unitPrice;
        }
      }
    });

    let runningUsers = priorUsers;
    let runningPro = priorPro;
    monthStats.forEach((ms) => {
      runningUsers += ms.newUsers;
      runningPro += ms.newPro;
      ms.cumulativeUsers = runningUsers;
      ms.cumulativePro = runningPro;
    });

    // Donut segments (Total Accounts = Learners + Staff)
    const donutTotal = Math.max(1, scopedMembers.length);
    const donutSegments = [
      {
        label: "PRO Aktif (> 7 Hari)",
        count: proActiveHealthy.length,
        pct: Math.round((proActiveHealthy.length / donutTotal) * 100),
        color: "#10B981",
      },
      {
        label: "Mau Habis (≤ 7 Hari)",
        count: proExpiringSoon.length,
        pct: Math.round((proExpiringSoon.length / donutTotal) * 100),
        color: "#F59E0B",
      },
      {
        label: "Jatuh Tempo (Expired)",
        count: proExpired.length,
        pct: Math.round((proExpired.length / donutTotal) * 100),
        color: "#EF4444",
      },
      {
        label: "Free Plan",
        count: freeLearners.length,
        pct: Math.round((freeLearners.length / donutTotal) * 100),
        color: "#94A3B8",
      },
      {
        label: "Staf (Admin & Mentor)",
        count: staff.length,
        pct: Math.round((staff.length / donutTotal) * 100),
        color: "#4F39F6",
      },
    ];

    // Funnel & Payment channels
    const engagedLearnersCount = enrichedLearners.filter(
      (e) => e.member.completedChapters > 0 || e.member.points > 0
    ).length;
    const funnelStages = [
      {
        label: "Total Learner Terdaftar",
        count: learners.length,
        pct: 100,
        color: "#6366F1",
      },
      {
        label: "Learner Aktif (Belajar / Poin > 0)",
        count: engagedLearnersCount,
        pct:
          learners.length > 0
            ? Math.round((engagedLearnersCount / learners.length) * 100)
            : 0,
        color: "#0EA5E9",
      },
      {
        label: "Riwayat Langganan / Request PRO",
        count: Math.min(
          learners.length,
          allProSubscribers.length + pendingRequests.length
        ),
        pct:
          learners.length > 0
            ? Math.min(
                100,
                Math.round(
                  ((allProSubscribers.length + pendingRequests.length) /
                    learners.length) *
                    100
                )
              )
            : 0,
        color: "#F59E0B",
      },
      {
        label: "PRO Aktif Berjalan",
        count: effectiveProNow.length,
        pct: conversionRate,
        color: "#10B981",
      },
    ];

    const channelMap = new Map<string, { label: string; count: number; revenue: number }>();
    allProSubscribers.forEach((e) => {
      const ch = channelMap.get(e.paymentChannel) || {
        label: e.paymentChannel,
        count: 0,
        revenue: 0,
      };
      ch.count += 1;
      ch.revenue += e.unitPrice;
      channelMap.set(e.paymentChannel, ch);
    });
    const paymentChannels = Array.from(channelMap.values()).sort(
      (a, b) => b.revenue - a.revenue || b.count - a.count
    );

    // Renewal Forecast Buckets
    const forecastBuckets = [
      { key: "overdue", label: "Lewat Tempo", color: "#EF4444", count: 0, value: 0 },
      { key: "d0_7", label: "0–7 Hari", color: "#F59E0B", count: 0, value: 0 },
      { key: "d8_14", label: "8–14 Hari", color: "#FBBF24", count: 0, value: 0 },
      { key: "d15_21", label: "15–21 Hari", color: "#0EA5E9", count: 0, value: 0 },
      { key: "d22_30", label: "22–30 Hari", color: "#4F39F6", count: 0, value: 0 },
      { key: "d31_plus", label: "> 30 Hari", color: "#10B981", count: 0, value: 0 },
    ];
    allProSubscribers.forEach((item) => {
      const dr = item.subInfo.daysRemaining;
      let targetIdx = 5;
      if (dr !== null) {
        if (dr < 0) targetIdx = 0;
        else if (dr <= 7) targetIdx = 1;
        else if (dr <= 14) targetIdx = 2;
        else if (dr <= 21) targetIdx = 3;
        else if (dr <= 30) targetIdx = 4;
        else targetIdx = 5;
      }
      forecastBuckets[targetIdx].count += 1;
      forecastBuckets[targetIdx].value += item.unitPrice;
    });

    // Follow-up list
    const urgentFollowUps = [...proExpired, ...proExpiringSoon].sort(
      (a, b) => (a.subInfo.daysRemaining ?? 999) - (b.subInfo.daysRemaining ?? 999)
    );
    const upsellCandidates = [...freeLearners].sort(
      (a, b) => b.member.points - a.member.points || b.progressPct - a.progressPct
    );

    // Cohort Comparison Matrix
    const uniqueCohorts = Array.from(
      new Set([
        ...cohortNames,
        ...learners.map((l) => l.cohort).filter(Boolean),
      ])
    );
    const cohortMatrix = uniqueCohorts
      .map((cohort) => {
        const list = enrichedLearners.filter(
          (e) => e.member.cohort.toLowerCase() === cohort.toLowerCase()
        );
        const proList = list.filter(
          (e) =>
            e.subInfo.status === "active" || e.subInfo.status === "expiring_soon"
        );
        const cohortRevenue = list
          .filter((e) => e.subInfo.status !== "free")
          .reduce((s, e) => s + e.unitPrice, 0);
        const avgProg =
          list.length > 0
            ? Math.round(
                list.reduce((s, e) => s + e.progressPct, 0) / list.length
              )
            : 0;
        const cQuiz = list.filter((e) => e.member.avgQuizScore > 0);
        const avgQ =
          cQuiz.length > 0
            ? Math.round(
                cQuiz.reduce((s, e) => s + e.member.avgQuizScore, 0) /
                  cQuiz.length
              )
            : 0;
        const pts = list.reduce((s, e) => s + Number(e.member.points || 0), 0);
        return {
          cohort,
          totalLearners: list.length,
          proActiveCount: proList.length,
          expiringCount: list.filter(
            (e) =>
              e.subInfo.status === "expiring_soon" ||
              e.subInfo.status === "expired"
          ).length,
          conversionPct:
            list.length > 0
              ? Math.round((proList.length / list.length) * 100)
              : 0,
          revenue: cohortRevenue,
          avgProgressPct: avgProg,
          avgQuizScore: avgQ,
          totalPoints: pts,
        };
      })
      .filter((c) => c.totalLearners > 0 || cohortNames.includes(c.cohort))
      .sort((a, b) => b.revenue - a.revenue || b.totalLearners - a.totalLearners);

    const topPackage =
      packageBreakdown.find((p) => p.grossRevenue > 0) ||
      packageBreakdown[0] ||
      null;
    const topCohort =
      [...cohortMatrix].sort(
        (a, b) => b.revenue - a.revenue || b.totalLearners - a.totalLearners
      )[0] || null;

    return {
      scopedMembersCount: scopedMembers.length,
      learnersCount: learners.length,
      staffCount: staff.length,
      proActiveHealthyCount: proActiveHealthy.length,
      proExpiringSoonCount: proExpiringSoon.length,
      proExpiredCount: proExpired.length,
      freeCount: freeLearners.length,
      effectiveProCount: effectiveProNow.length,
      allProCount: allProSubscribers.length,
      conversionRate,
      retentionHealthPct,
      totalGrossRevenue,
      totalMrr,
      totalPendingRevenue,
      pendingRequestsCount: pendingRequests.length,
      renewalAtRiskRevenue,
      arpuPerPro,
      avgProgressPct,
      avgQuizScore,
      highPerformersCount,
      totalPointsAll,
      avgPointsPerLearner,
      monthStats,
      donutSegments,
      packageBreakdown,
      funnelStages,
      paymentChannels,
      forecastBuckets,
      urgentFollowUps,
      upsellCandidates,
      cohortMatrix,
      topPackage,
      topCohort,
      enrichedLearners,
    };
  }, [
    members,
    cohortScope,
    proRequests,
    configuredPackages,
    cohortNames,
    getMemberSubInfo,
  ]);

  const handleExportCsv = () => {
    const todayIso = getTodayIsoDate();
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows: string[] = [];
    rows.push(
      [
        "Nama",
        "Email",
        "Role",
        "Cohort",
        "Status Langganan",
        "Paket PRO",
        "Estimasi Harga (Rp)",
        "Tanggal Mulai",
        "Jatuh Tempo",
        "Sisa Hari",
        "Progress (%)",
        "Rata-rata Kuis (%)",
        "Poin",
      ]
        .map(esc)
        .join(",")
    );

    analytics.enrichedLearners.forEach((item) => {
      rows.push(
        [
          item.member.name,
          item.member.email,
          item.member.accessRole,
          item.member.cohort,
          item.subInfo.badgeLabel,
          item.subInfo.status === "free" ? "Free Tier" : item.pkgName,
          item.subInfo.status === "free" ? 0 : item.unitPrice,
          item.subInfo.status === "free" ? "-" : item.subInfo.startedLabel,
          item.subInfo.status === "free" ? "-" : item.subInfo.dueLabel,
          item.subInfo.daysRemaining ?? "-",
          item.progressPct,
          item.member.avgQuizScore,
          item.member.points,
        ]
          .map(esc)
          .join(",")
      );
    });

    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ruang-sosmed-insights-${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Combo chart geometry (SVG viewBox 680 x 240)
  const chartW = 680;
  const chartH = 230;
  const padL = 56;
  const padR = 24;
  const padT = 22;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxRev = Math.max(
    150_000,
    ...analytics.monthStats.map((m) => m.revenue)
  );
  const maxUserCum = Math.max(
    4,
    ...analytics.monthStats.map((m) => m.cumulativeUsers)
  );
  const stepX = plotW / Math.max(1, analytics.monthStats.length);

  const trendPolylinePoints = analytics.monthStats
    .map((ms, idx) => {
      const cx = padL + stepX * idx + stepX / 2;
      const val =
        trendMode === "revenue" ? ms.revenue : ms.cumulativePro;
      const ceiling = trendMode === "revenue" ? maxRev : maxUserCum;
      const cy = padT + plotH - (val / Math.max(1, ceiling)) * plotH;
      return `${cx},${cy}`;
    })
    .join(" ");

  const firstTrendX = padL + stepX / 2;
  const lastTrendX =
    padL + stepX * Math.max(0, analytics.monthStats.length - 1) + stepX / 2;
  const trendAreaPath =
    analytics.monthStats.length > 0
      ? `M ${firstTrendX},${padT + plotH} L ${trendPolylinePoints} L ${lastTrendX},${padT + plotH} Z`
      : "";

  // Donut geometry
  const donutSize = 188;
  const donutStroke = 26;
  const donutR = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutR;
  let cumulativeArc = 0;
  const totalAccountsForDonut = Math.max(
    1,
    analytics.donutSegments.reduce((s, d) => s + d.count, 0)
  );

  const viewTabs: Array<{
    key: InsightsViewTab;
    id: string;
    label: string;
    accent: string;
  }> = [
    { key: "overview", id: "insight-tab-overview", label: "Semua Insight", accent: "#4F39F6" },
    { key: "revenue", id: "insight-tab-revenue", label: "Pemasukan & Paket", accent: "#10B981" },
    { key: "lifecycle", id: "insight-tab-lifecycle", label: "Siklus & Jatuh Tempo", accent: "#F59E0B" },
    { key: "cohorts", id: "insight-tab-cohorts", label: "Performa Cohort & User", accent: "#0EA5E9" },
  ];
  const activeTabObj =
    viewTabs.find((t) => t.key === activeTab) || viewTabs[0];

  const handleViewTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % viewTabs.length;
    else if (e.key === "ArrowLeft")
      nextIdx = (idx - 1 + viewTabs.length) % viewTabs.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = viewTabs.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      const targetTab = viewTabs[nextIdx];
      setActiveTab(targetTab.key);
      tabRefs.current[nextIdx]?.focus();
      tabRefs.current[nextIdx]?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  };

  const showRevenueSection = activeTab === "overview" || activeTab === "revenue";
  const showLifecycleSection = activeTab === "overview" || activeTab === "lifecycle";
  const showCohortSection = activeTab === "overview" || activeTab === "cohorts";

  const maxForecastCount = Math.max(
    1,
    ...analytics.forecastBuckets.map((b) => b.count)
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="directory-insights-modal-title"
      {...({ closedby: "any" } as any)}
      className="m-auto w-[calc(100vw-1rem)] sm:w-[calc(100vw-2.5rem)] max-w-[1480px] h-[calc(100vh-1.25rem)] sm:h-[calc(100vh-2.25rem)] max-h-[960px] rounded-2xl bg-[#F8F9FB] text-[#121215] border border-[#EAECEF] shadow-[0_24px_64px_rgba(16,15,17,0.22)] p-0 overflow-hidden open:animate-in open:fade-in open:zoom-in-95 duration-150 backdrop:bg-black/55 backdrop:backdrop-blur-xs"
    >
      <div className="h-full flex flex-col">
        {/* Sticky Top Header */}
        <header className="shrink-0 bg-[#FFFFFF] border-b border-[#EAECEF] px-4 sm:px-6 pt-4 pb-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[#4F39F6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4F39F6]">
                <BarChart3 size={12} />
                <span>Executive Business Intelligence</span>
              </div>
              <h2
                id="directory-insights-modal-title"
                className="text-lg sm:text-xl font-extrabold tracking-tight text-[#121215] mt-1"
              >
                Insight Pertumbuhan User, Langganan &amp; Pemasukan Paket PRO
              </h2>
              <p className="text-xs text-[#5E5E5E] mt-0.5">
                Analisis real-time dari {analytics.scopedMembersCount} akun • Pembaruan per{" "}
                {formatIndoDate(getTodayIsoDate())}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="Filter Cohort pada Insight"
                value={cohortScope}
                onChange={(e) => setCohortScope(e.target.value)}
                className="rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#4F39F6] focus:outline-none cursor-pointer"
              >
                <option value="All Cohorts">Semua Cohort ({members.length})</option>
                {Array.from(
                  new Set([
                    ...cohortNames,
                    ...members.map((m) => m.cohort).filter(Boolean),
                  ])
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
              >
                <Download size={13} className="text-[#4F39F6]" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                autoFocus
                onClick={onClose}
                aria-label="Tutup modal insight"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] text-[#5E5E5E] hover:bg-[#EAECEF] hover:text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Single-row View Tablist */}
          <div
            role="tablist"
            aria-label="Kategori grafik insight"
            className="directory-tablist -mx-1 px-1"
          >
            {viewTabs.map((tab, idx) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  id={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={(e) => {
                    setActiveTab(tab.key);
                    e.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                    });
                  }}
                  onKeyDown={(e) => handleViewTabKeyDown(e, idx)}
                  style={{ "--tab-accent": tab.accent } as React.CSSProperties}
                  className={`directory-tab px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? "text-[#121215]"
                      : "text-[#5E5E5E] hover:text-[#121215]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div
          role="tabpanel"
          aria-labelledby={activeTabObj.id}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        >
          {/* Section A: 6 Executive KPI Cards */}
          <section
            aria-label="Ringkasan KPI Utama"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5"
          >
            {/* 1. Gross Estimated Revenue */}
            <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>Total Pemasukan PRO</span>
                <Wallet size={14} className="text-[#10B981]" />
              </div>
              <p className="text-xl font-black text-[#121215] tabular-nums">
                {formatIdr(analytics.totalGrossRevenue)}
              </p>
              <p className="text-[11px] text-[#059669] font-semibold tabular-nums">
                MRR: {formatIdr(analytics.totalMrr)}/bln • ARPU:{" "}
                {formatIdr(analytics.arpuPerPro)}
              </p>
            </div>

            {/* 2. Pipeline & Renewal Risk Revenue */}
            <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>Potensi &amp; Perpanjangan</span>
                <CreditCard size={14} className="text-[#F59E0B]" />
              </div>
              <p className="text-xl font-black text-[#B45309] tabular-nums">
                {formatIdr(
                  analytics.totalPendingRevenue + analytics.renewalAtRiskRevenue
                )}
              </p>
              <p className="text-[11px] text-[#5E5E5E] tabular-nums">
                Pending ({analytics.pendingRequestsCount}):{" "}
                {formatIdrCompact(analytics.totalPendingRevenue)} • Perpanjang:{" "}
                {formatIdrCompact(analytics.renewalAtRiskRevenue)}
              </p>
            </div>

            {/* 3. Total Accounts & PRO Conversion */}
            <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>Konversi Akun PRO</span>
                <Users size={14} className="text-[#4F39F6]" />
              </div>
              <p className="text-xl font-black text-[#121215] tabular-nums">
                {analytics.conversionRate}%{" "}
                <span className="text-xs font-bold text-[#4F39F6]">
                  ({analytics.effectiveProCount}/{analytics.learnersCount} Learner)
                </span>
              </p>
              <p className="text-[11px] text-[#5E5E5E] tabular-nums">
                Free: {analytics.freeCount} • Staf Admin/Mentor:{" "}
                {analytics.staffCount}
              </p>
            </div>

            {/* 4. Subscription Retention Health */}
            <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>Retensi &amp; Jatuh Tempo</span>
                <Clock size={14} className="text-[#EF4444]" />
              </div>
              <p className="text-xl font-black text-[#121215] tabular-nums">
                {analytics.retentionHealthPct}%{" "}
                <span className="text-xs font-semibold text-[#059669]">Sehat</span>
              </p>
              <p className="text-[11px] tabular-nums text-[#5E5E5E]">
                Mau Habis:{" "}
                <strong className="text-[#B45309]">
                  {analytics.proExpiringSoonCount}
                </strong>{" "}
                • Lewat Tempo:{" "}
                <strong className="text-[#DC2626]">
                  {analytics.proExpiredCount}
                </strong>
              </p>
            </div>

            {/* 5. Academic Progress & Quiz */}
            <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>Performa Belajar</span>
                <Award size={14} className="text-[#0EA5E9]" />
              </div>
              <p className="text-xl font-black text-[#121215] tabular-nums">
                {analytics.avgProgressPct}%{" "}
                <span className="text-xs font-semibold text-[#5E5E5E]">
                  Avg Progress
                </span>
              </p>
              <p className="text-[11px] text-[#5E5E5E] tabular-nums">
                Rata-rata Kuis:{" "}
                <strong className="text-[#059669]">{analytics.avgQuizScore}%</strong>{" "}
                • Berprestasi: {analytics.highPerformersCount}
              </p>
            </div>

            {/* 6. Coin Economy */}
            <div className="rounded-xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>Ekonomi Poin Member</span>
                <Coins size={14} className="text-[#F59E0B]" />
              </div>
              <p className="text-xl font-black text-[#B45309] tabular-nums">
                {analytics.totalPointsAll.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-semibold">pts</span>
              </p>
              <p className="text-[11px] text-[#5E5E5E] tabular-nums">
                Avg {analytics.avgPointsPerLearner} pts • Ditukar:{" "}
                {totalCoinsRedeemed.toLocaleString("id-ID")} ({totalRewardsClaimedCount}x)
              </p>
            </div>
          </section>

          {/* Section B: 6-Month Growth/Revenue Trend + Subscription Donut */}
          {showRevenueSection && (
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left: 6-Month SVG Combo Chart */}
              <div className="xl:col-span-7 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
                      <TrendingUp size={15} className="text-[#4F39F6]" />
                      <span>
                        Tren 6 Bulan Terakhir (User, Member PRO &amp; Pemasukan)
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                      Berdasarkan tanggal pendaftaran user, aktivasi paket PRO, dan akumulasi pertumbuhan cohort.
                    </p>
                  </div>

                  <div className="inline-flex rounded-lg bg-[#F8F9FB] p-1 border border-[#EAECEF]">
                    <button
                      type="button"
                      onClick={() => setTrendMode("revenue")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                        trendMode === "revenue"
                          ? "bg-[#4F39F6] text-white"
                          : "text-[#5E5E5E] hover:text-[#121215]"
                      }`}
                    >
                      Pemasukan (Rp)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMode("users")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                        trendMode === "users"
                          ? "bg-[#4F39F6] text-white"
                          : "text-[#5E5E5E] hover:text-[#121215]"
                      }`}
                    >
                      User &amp; PRO
                    </button>
                  </div>
                </div>

                <div className="relative w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full min-w-[500px] h-56 select-none"
                    role="img"
                    aria-label="Grafik tren 6 bulan user, langganan PRO, dan pemasukan"
                  >
                    <defs>
                      <linearGradient id="insightsRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F39F6" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#4F39F6" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = padT + plotH - ratio * plotH;
                      const axisVal =
                        trendMode === "revenue"
                          ? Math.round(maxRev * ratio)
                          : Math.round(maxUserCum * ratio);
                      return (
                        <g key={ratio}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={chartW - padR}
                            y2={y}
                            stroke="#EAECEF"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="10"
                            fill="#64748B"
                            fontWeight="600"
                          >
                            {trendMode === "revenue"
                              ? formatIdrCompact(axisVal)
                              : axisVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area Fill */}
                    {trendAreaPath && (
                      <path d={trendAreaPath} fill="url(#insightsRevGrad)" />
                    )}

                    {/* Bars + Points */}
                    {analytics.monthStats.map((ms, idx) => {
                      const cx = padL + stepX * idx + stepX / 2;
                      const barWidth = Math.min(34, stepX * 0.44);
                      const barValue =
                        trendMode === "revenue" ? ms.revenue : ms.cumulativeUsers;
                      const ceiling = trendMode === "revenue" ? maxRev : maxUserCum;
                      const barH = Math.max(
                        barValue > 0 ? 4 : 0,
                        (barValue / Math.max(1, ceiling)) * plotH
                      );
                      const barY = padT + plotH - barH;
                      const isHovered = hoveredMonthIdx === idx;

                      return (
                        <g
                          key={ms.key}
                          onMouseEnter={() => setHoveredMonthIdx(idx)}
                          onMouseLeave={() => setHoveredMonthIdx(null)}
                          className="cursor-pointer"
                        >
                          <rect
                            x={cx - barWidth / 2}
                            y={barY}
                            width={barWidth}
                            height={barH}
                            rx={6}
                            fill={
                              trendMode === "revenue"
                                ? isHovered
                                  ? "#059669"
                                  : "#10B981"
                                : isHovered
                                ? "#6366F1"
                                : "#CBD5E1"
                            }
                            opacity={trendMode === "revenue" ? 0.85 : 0.75}
                          />

                          <text
                            x={cx}
                            y={chartH - 12}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isHovered ? "#4F39F6" : "#64748B"}
                            fontWeight={isHovered ? "700" : "600"}
                          >
                            {ms.shortLabel}
                          </text>
                        </g>
                      );
                    })}

                    {/* Overlay Line */}
                    {trendPolylinePoints && (
                      <polyline
                        fill="none"
                        stroke="#4F39F6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={trendPolylinePoints}
                      />
                    )}

                    {analytics.monthStats.map((ms, idx) => {
                      const cx = padL + stepX * idx + stepX / 2;
                      const val =
                        trendMode === "revenue" ? ms.revenue : ms.cumulativePro;
                      const ceiling = trendMode === "revenue" ? maxRev : maxUserCum;
                      const cy =
                        padT + plotH - (val / Math.max(1, ceiling)) * plotH;
                      const isHovered = hoveredMonthIdx === idx;
                      return (
                        <g key={`dot-${ms.key}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 6 : 4}
                            fill="#FFFFFF"
                            stroke="#4F39F6"
                            strokeWidth="2.5"
                          />
                          {(isHovered || idx === analytics.monthStats.length - 1) && (
                            <text
                              x={cx}
                              y={Math.max(12, cy - 9)}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="700"
                              fill="#4F39F6"
                            >
                              {trendMode === "revenue"
                                ? formatIdrCompact(val)
                                : `${val} PRO`}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Monthly Summary Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                  {analytics.monthStats.map((ms, idx) => (
                    <div
                      key={ms.key}
                      onMouseEnter={() => setHoveredMonthIdx(idx)}
                      onMouseLeave={() => setHoveredMonthIdx(null)}
                      className={`rounded-lg px-2.5 py-2 border text-[11px] transition-colors ${
                        hoveredMonthIdx === idx
                          ? "bg-[#EEF2FF] border-[#4F39F6]/40"
                          : "bg-[#F8F9FB] border-[#EAECEF]"
                      }`}
                    >
                      <p className="font-bold text-[#121215]">{ms.shortLabel}</p>
                      <p className="text-[10px] text-[#059669] font-bold tabular-nums mt-0.5">
                        {formatIdrCompact(ms.revenue)}
                      </p>
                      <p className="text-[10px] text-[#5E5E5E] tabular-nums">
                        +{ms.newUsers} user • {ms.cumulativePro} PRO
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: SVG Donut Chart */}
              <div className="xl:col-span-5 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
                    <PieChart size={15} className="text-[#10B981]" />
                    <span>Distribusi Status Siklus Langganan</span>
                  </h3>
                  <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                    Komposisi akun aktif, mendekati jatuh tempo, expired, free tier, dan staf.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative shrink-0">
                    <svg
                      width={donutSize}
                      height={donutSize}
                      viewBox={`0 0 ${donutSize} ${donutSize}`}
                      role="img"
                      aria-label="Donut chart komposisi langganan member"
                    >
                      <circle
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={donutR}
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth={donutStroke}
                      />
                      {analytics.donutSegments.map((seg, idx) => {
                        if (seg.count === 0) return null;
                        const fraction = seg.count / totalAccountsForDonut;
                        const dash = fraction * donutCircumference;
                        const offset = -cumulativeArc;
                        cumulativeArc += dash;
                        const isHovered = hoveredDonutIdx === idx;
                        return (
                          <circle
                            key={seg.label}
                            cx={donutSize / 2}
                            cy={donutSize / 2}
                            r={donutR}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={isHovered ? donutStroke + 5 : donutStroke}
                            strokeDasharray={`${dash} ${donutCircumference}`}
                            strokeDashoffset={offset}
                            transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                            onMouseEnter={() => setHoveredDonutIdx(idx)}
                            onMouseLeave={() => setHoveredDonutIdx(null)}
                            className="transition-all duration-150 cursor-pointer"
                          />
                        );
                      })}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        {hoveredDonutIdx !== null
                          ? analytics.donutSegments[hoveredDonutIdx]?.label.split(" ")[0]
                          : "Total Akun"}
                      </span>
                      <span className="text-2xl font-black text-[#121215] tabular-nums leading-tight">
                        {hoveredDonutIdx !== null
                          ? analytics.donutSegments[hoveredDonutIdx]?.count
                          : analytics.scopedMembersCount}
                      </span>
                      <span className="text-[11px] font-bold text-[#4F39F6] tabular-nums">
                        {hoveredDonutIdx !== null
                          ? `${analytics.donutSegments[hoveredDonutIdx]?.pct}%`
                          : `${analytics.effectiveProCount} PRO Aktif`}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {analytics.donutSegments.map((seg, idx) => (
                      <div
                        key={seg.label}
                        onMouseEnter={() => setHoveredDonutIdx(idx)}
                        onMouseLeave={() => setHoveredDonutIdx(null)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 border text-xs transition-colors cursor-pointer ${
                          hoveredDonutIdx === idx
                            ? "bg-[#F8FAFC] border-[#4F39F6]/40"
                            : "bg-[#F8F9FB] border-[#EAECEF]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="font-semibold text-[#121215] truncate">
                            {seg.label}
                          </span>
                        </div>
                        <span className="font-bold text-[#121215] tabular-nums shrink-0">
                          {seg.count}{" "}
                          <span className="text-[10px] font-semibold text-[#64748B]">
                            ({seg.pct}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section C: Revenue Per Package & Conversion Funnel + Payment Channels */}
          {showRevenueSection && (
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left: Revenue per Package Breakdown */}
              <div className="xl:col-span-7 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
                      <Layers size={15} className="text-[#4F39F6]" />
                      <span>Pemasukan &amp; Sebaran Member per Paket PRO</span>
                    </h3>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                      Komparasi performa setiap paket berlangganan: volume member, harga satuan, total revenue &amp; kontribusi MRR.
                    </p>
                  </div>
                  <span className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 text-xs font-extrabold text-[#059669] tabular-nums">
                    Total: {formatIdr(analytics.totalGrossRevenue)}
                  </span>
                </div>

                {/* Stacked Proportional Bar */}
                {analytics.totalGrossRevenue > 0 && (
                  <div className="h-3.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden flex">
                    {analytics.packageBreakdown
                      .filter((p) => p.grossRevenue > 0)
                      .map((pkg, idx) => {
                        const pct = Math.max(
                          3,
                          Math.round(
                            (pkg.grossRevenue / analytics.totalGrossRevenue) * 100
                          )
                        );
                        return (
                          <div
                            key={pkg.packageName}
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                PACKAGE_COLORS[idx % PACKAGE_COLORS.length],
                            }}
                            title={`${pkg.packageName}: ${formatIdr(
                              pkg.grossRevenue
                            )} (${pct}%)`}
                          />
                        );
                      })}
                  </div>
                )}

                <div className="space-y-2.5">
                  {analytics.packageBreakdown.length === 0 ? (
                    <p className="text-xs text-[#64748B] py-6 text-center">
                      Belum ada transaksi atau konfigurasi paket PRO yang tercatat.
                    </p>
                  ) : (
                    analytics.packageBreakdown.map((pkg, idx) => {
                      const sharePct =
                        analytics.totalGrossRevenue > 0
                          ? Math.round(
                              (pkg.grossRevenue / analytics.totalGrossRevenue) *
                                100
                            )
                          : 0;
                      const barColor =
                        PACKAGE_COLORS[idx % PACKAGE_COLORS.length];

                      return (
                        <div
                          key={pkg.packageName}
                          className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#EAECEF] space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-3 w-3 rounded-sm shrink-0"
                                style={{ backgroundColor: barColor }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#121215] truncate">
                                  {pkg.packageName}
                                </p>
                                <p className="text-[11px] text-[#5E5E5E]">
                                  {pkg.periodText} • Harga:{" "}
                                  <strong className="text-[#121215]">
                                    {formatIdr(pkg.unitPrice)}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-black text-[#121215] tabular-nums">
                                {formatIdr(pkg.grossRevenue)}
                              </p>
                              <p className="text-[10px] font-semibold text-[#059669] tabular-nums">
                                {sharePct}% share • MRR {formatIdr(pkg.mrr)}/bln
                              </p>
                            </div>
                          </div>

                          <div className="h-2 w-full rounded-full bg-[#FFFFFF] border border-[#EAECEF] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${sharePct}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5E5E5E]">
                            <span>
                              Total Pelanggan:{" "}
                              <strong className="text-[#121215]">
                                {pkg.totalSubscribers} user
                              </strong>{" "}
                              ({pkg.activeCount} sehat • {pkg.expiringCount} mau habis •{" "}
                              {pkg.expiredCount} jatuh tempo)
                            </span>
                            {pkg.pendingCount > 0 && (
                              <span className="rounded-md bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
                                +{pkg.pendingCount} pending (
                                {formatIdr(pkg.pendingValue)})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Funnel & Payment Channels */}
              <div className="xl:col-span-5 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-5">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
                      <Zap size={15} className="text-[#F59E0B]" fill="currentColor" />
                      <span>Funnel Konversi Learner → PRO</span>
                    </h3>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                      Perjalanan konversi dari pendaftaran akun hingga langganan berbayar aktif.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {analytics.funnelStages.map((stage) => (
                      <div key={stage.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#121215]">
                            {stage.label}
                          </span>
                          <span className="font-bold text-[#121215] tabular-nums">
                            {stage.count} user{" "}
                            <span className="text-[#64748B] font-semibold">
                              ({stage.pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(stage.count > 0 ? 4 : 0, stage.pct)}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EAECEF] space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                      Sumber Aktivasi &amp; Metode Pembayaran PRO
                    </h4>
                  </div>

                  {analytics.paymentChannels.length === 0 ? (
                    <p className="text-xs text-[#64748B] rounded-lg bg-[#F8F9FB] p-3 border border-[#EAECEF]">
                      Belum ada member PRO untuk menampilkan kanal pembayaran.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.paymentChannels.map((ch) => (
                        <div
                          key={ch.label}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[#F8F9FB] px-3 py-2 border border-[#EAECEF] text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#121215]">{ch.label}</p>
                            <p className="text-[10px] text-[#5E5E5E]">
                              {ch.count} transaksi / akun PRO
                            </p>
                          </div>
                          <span className="font-extrabold text-[#121215] tabular-nums">
                            {formatIdr(ch.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Section D: Renewal Timeline Forecast + Actionable Priority List */}
          {showLifecycleSection && (
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left: 30-Day Renewal Timeline Forecast */}
              <div className="xl:col-span-6 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
                    <Calendar size={15} className="text-[#F59E0B]" />
                    <span>Proyeksi Jatuh Tempo &amp; Nilai Perpanjangan</span>
                  </h3>
                  <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                    Distribusi member PRO berdasarkan rentang waktu menuju tanggal jatuh tempo.
                  </p>
                </div>

                <div className="grid grid-cols-6 gap-2 items-end h-44 pt-4 px-1 border-b border-[#EAECEF] pb-2">
                  {analytics.forecastBuckets.map((bucket) => {
                    const heightPct = Math.round(
                      (bucket.count / maxForecastCount) * 100
                    );
                    return (
                      <div
                        key={bucket.key}
                        className="h-full flex flex-col items-center justify-end gap-1.5 text-center"
                      >
                        <span className="text-[10px] font-bold text-[#121215] tabular-nums">
                          {bucket.count}
                        </span>
                        <div className="w-full max-w-[44px] flex-1 flex items-end justify-center">
                          <div
                            className="w-full rounded-t-lg transition-all"
                            style={{
                              height: `${bucket.count > 0 ? Math.max(12, heightPct) : 4}%`,
                              backgroundColor: bucket.count > 0 ? bucket.color : "#E2E8F0",
                            }}
                            title={`${bucket.label}: ${bucket.count} member (${formatIdr(
                              bucket.value
                            )})`}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-[#5E5E5E] leading-tight">
                          {bucket.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {analytics.forecastBuckets.map((bucket) => (
                    <div
                      key={`card-${bucket.key}`}
                      className="rounded-lg bg-[#F8F9FB] px-2.5 py-2 border border-[#EAECEF] text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: bucket.color }}
                        />
                        <span className="font-bold text-[#121215]">
                          {bucket.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#5E5E5E] mt-0.5 tabular-nums">
                        {bucket.count} user •{" "}
                        <strong className="text-[#121215]">
                          {formatIdrCompact(bucket.value)}
                        </strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Priority Action List */}
              <div className="xl:col-span-6 rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
                      {analytics.urgentFollowUps.length > 0 ? (
                        <AlertTriangle size={15} className="text-[#EF4444]" />
                      ) : (
                        <CheckCircle2 size={15} className="text-[#10B981]" />
                      )}
                      <span>
                        {analytics.urgentFollowUps.length > 0
                          ? `Prioritas Perpanjangan PRO (${analytics.urgentFollowUps.length})`
                          : "Kandidat Potensial Upgrade ke PRO"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                      {analytics.urgentFollowUps.length > 0
                        ? "Klik +30 Hr untuk memperpanjang langsung, atau Atur PRO untuk custom jatuh tempo."
                        : "Seluruh langganan PRO aktif aman (> 7 hari). Berikut user Free paling aktif untuk ditawarkan paket PRO:"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {(analytics.urgentFollowUps.length > 0
                    ? analytics.urgentFollowUps
                    : analytics.upsellCandidates.slice(0, 6)
                  ).map((item) => {
                    const emailKey = (item.member.email || "").toLowerCase().trim();
                    const isBusy = quickExtendingEmail === emailKey;
                    const isUrgent = analytics.urgentFollowUps.length > 0;
                    return (
                      <div
                        key={item.member.id}
                        className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-[#F8F9FB] px-3.5 py-2.5 border border-[#EAECEF]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-xs font-bold text-[#121215] truncate">
                              {item.member.name}
                            </p>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                                item.subInfo.status === "expired"
                                  ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                                  : item.subInfo.status === "expiring_soon"
                                  ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                                  : "bg-[#FFFFFF] text-[#64748B] border-[#EAECEF]"
                              }`}
                            >
                              {item.subInfo.badgeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5E5E5E] truncate mt-0.5">
                            {isUrgent
                              ? `${item.pkgName} • Tempo: ${item.subInfo.dueLabel} • Potensi ${formatIdr(
                                  item.unitPrice
                                )}`
                              : `${item.member.cohort} • ⭐ ${item.member.points.toLocaleString(
                                  "id-ID"
                                )} pts • Progress ${item.progressPct}%`}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUrgent ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void onQuickExtend30Days(item.member)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                            >
                              <RotateCw
                                size={11}
                                className={isBusy ? "animate-spin" : ""}
                              />
                              <span>+30 Hr</span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenRenewModal(item.member);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#FFFFFF] hover:bg-[#EEF2FF] hover:text-[#4F39F6] px-2.5 py-1 text-[11px] font-semibold text-[#121215] border border-[#EAECEF] cursor-pointer"
                          >
                            <Calendar size={11} />
                            <span>{isUrgent ? "Atur" : "Aktifkan PRO"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onInspectMember(item.member);
                            }}
                            aria-label={`Lihat profil ${item.member.name}`}
                            className="inline-flex items-center justify-center rounded-lg bg-[#FFFFFF] hover:bg-[#EAECEF]/70 p-1.5 text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {analytics.urgentFollowUps.length === 0 &&
                    analytics.upsellCandidates.length === 0 && (
                      <p className="text-xs text-[#64748B] py-6 text-center">
                        Belum ada data learner pada filter cohort ini.
                      </p>
                    )}
                </div>
              </div>
            </section>
          )}

          {/* Section E: Cohort Performance & Monetization Matrix */}
          {showCohortSection && (
            <section className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#121215]">
                  Matriks Performa Akademik &amp; Monetisasi per Cohort
                </h3>
                <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                  Membandingkan jumlah member, rasio konversi PRO, estimasi pemasukan, progres belajar, dan skor kuis antar cohort.
                </p>
              </div>

              <div
                tabIndex={0}
                role="region"
                aria-label="Matriks performa cohort"
                className="table-wrapper"
              >
                <table
                  style={
                    {
                      "--label-2": '"Member"',
                      "--label-3": '"PRO Aktif & Konversi"',
                      "--label-4": '"Estimasi Pemasukan"',
                      "--label-5": '"Avg Progress"',
                      "--label-6": '"Avg Kuis"',
                      "--label-7": '"Total Poin"',
                    } as React.CSSProperties
                  }
                >
                  <thead>
                    <tr className="border-b border-[#EAECEF] bg-[#F8F9FB] text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      <th className="py-2.5 px-3 rounded-tl-lg">Cohort Batch</th>
                      <th className="py-2.5 px-3">Learner</th>
                      <th className="py-2.5 px-3">PRO &amp; Konversi</th>
                      <th className="py-2.5 px-3">Estimasi Pemasukan</th>
                      <th className="py-2.5 px-3">Avg Progress</th>
                      <th className="py-2.5 px-3">Avg Kuis</th>
                      <th className="py-2.5 px-3 text-right rounded-tr-lg">
                        Total Poin
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECEF] text-xs">
                    {analytics.cohortMatrix.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 text-center text-xs text-[#64748B]"
                        >
                          Tidak ada data cohort untuk ditampilkan.
                        </td>
                      </tr>
                    ) : (
                      analytics.cohortMatrix.map((row) => (
                        <tr key={row.cohort}>
                          <th
                            scope="row"
                            className="py-3 px-3 font-bold text-[#121215] text-left"
                          >
                            {row.cohort}
                          </th>
                          <td className="py-3 px-3 font-semibold text-[#121215] tabular-nums">
                            {row.totalLearners} user
                          </td>
                          <td className="py-3 px-3 tabular-nums">
                            <span className="font-bold text-[#059669]">
                              {row.proActiveCount} PRO ({row.conversionPct}%)
                            </span>
                            {row.expiringCount > 0 && (
                              <span className="ml-1.5 text-[10px] font-bold text-[#B45309]">
                                • {row.expiringCount} perhatian
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-[#121215] tabular-nums">
                            {formatIdr(row.revenue)}
                          </td>
                          <td className="py-3 px-3 tabular-nums">
                            <div className="flex items-center gap-2 min-w-[110px]">
                              <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#4F39F6]"
                                  style={{ width: `${row.avgProgressPct}%` }}
                                />
                              </div>
                              <span className="font-semibold text-[#121215]">
                                {row.avgProgressPct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-[#059669] tabular-nums">
                            {row.avgQuizScore}%
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#B45309] tabular-nums">
                            {row.totalPoints.toLocaleString("id-ID")} pts
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section F: Executive Narrative Takeaways */}
          <section
            aria-label="Rekomendasi Strategis Otomatis"
            className="rounded-xl bg-[#FFFFFF] p-5 border border-[#EAECEF] shadow-[0_2px_8px_rgba(16,15,17,0.03)] space-y-3"
          >
            <h3 className="text-sm font-bold text-[#121215] flex items-center gap-2">
              <Sparkles size={15} className="text-[#4F39F6]" />
              <span>Ringkasan Insight &amp; Rekomendasi Aksi Admin</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] p-3.5 space-y-1">
                <p className="font-bold text-[#312E81]">Paket Kontributor Utama</p>
                <p className="text-[#4338CA] leading-relaxed">
                  {analytics.topPackage && analytics.topPackage.grossRevenue > 0
                    ? `${analytics.topPackage.packageName} menghasilkan ${formatIdr(
                        analytics.topPackage.grossRevenue
                      )} (${analytics.topPackage.totalSubscribers} user).`
                    : "Belum ada pemasukan PRO tercatat; gunakan tombol Aktifkan PRO atau bagikan promo paket bulanan."}
                </p>
              </div>

              <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3.5 space-y-1">
                <p className="font-bold text-[#92400E]">Menjaga Arus Retensi</p>
                <p className="text-[#78350F] leading-relaxed">
                  {analytics.urgentFollowUps.length > 0
                    ? `${analytics.urgentFollowUps.length} user PRO mendekati habis / lewat tempo senilai ${formatIdr(
                        analytics.renewalAtRiskRevenue
                      )}. Follow-up hari ini menjaga MRR.`
                    : "0 user PRO dalam zona risiko 7 hari ke depan. Kesehatan retensi sangat stabil."}
                </p>
              </div>

              <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3.5 space-y-1">
                <p className="font-bold text-[#065F46]">Peluang Upsell Free → PRO</p>
                <p className="text-[#047857] leading-relaxed">
                  {analytics.freeCount > 0
                    ? `Terdapat ${analytics.freeCount} learner di tier Free. Member Free paling aktif (${
                        analytics.upsellCandidates[0]?.member.name || "Learner"
                      }, ${
                        analytics.upsellCandidates[0]?.member.points || 0
                      } pts) siap ditawari paket PRO.`
                    : "Seluruh learner pada filter ini sudah mengaktifkan keanggotaan PRO."}
                </p>
              </div>

              <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-3.5 space-y-1">
                <p className="font-bold text-[#121215]">Cohort Paling Produktif</p>
                <p className="text-[#5E5E5E] leading-relaxed">
                  {analytics.topCohort
                    ? `${analytics.topCohort.cohort} memimpin dengan ${analytics.topCohort.totalLearners} learner, konversi ${analytics.topCohort.conversionPct}% PRO, dan avg progress ${analytics.topCohort.avgProgressPct}%.`
                    : "Belum ada data perbandingan cohort yang tersedia."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </dialog>
  );
}
