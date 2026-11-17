export type RewardCategory =
  | "Template"
  | "Ebook"
  | "Mentoring"
  | "Discount"
  | "Merchandise";

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: RewardCategory;
  badge?: string;
  stock: number; // -1 for unlimited
  claimedCount: number;
  rewardValue: string; // download link, promo coupon, or claim instruction
  active: boolean;
  createdAt: string;
}

export interface ClaimedRewardRecord {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  claimedAt: string;
  claimedByName: string;
  claimedByEmail: string;
  rewardValue: string;
  category: RewardCategory;
  status: "Completed" | "Pending";
}

export const REWARD_CATEGORY_CONFIG: Record<
  RewardCategory,
  { label: string; bgTint: string; textHex: string; borderTint: string }
> = {
  Template: {
    label: "Template & Asset",
    bgTint: "#EEF2FF",
    textHex: "#4F39F6",
    borderTint: "#C7D2FE",
  },
  Ebook: {
    label: "E-Book & Guide",
    bgTint: "#ECFDF5",
    textHex: "#059669",
    borderTint: "#A7F3D0",
  },
  Discount: {
    label: "Voucher Diskon",
    bgTint: "#FEF3C7",
    textHex: "#B45309",
    borderTint: "#FDE68A",
  },
  Mentoring: {
    label: "1-on-1 Mentoring",
    bgTint: "#FDF2F8",
    textHex: "#DB2777",
    borderTint: "#FBCFE8",
  },
  Merchandise: {
    label: "Official Merch",
    bgTint: "#F3E8FF",
    textHex: "#7E22CE",
    borderTint: "#E9D5FF",
  },
};

export const INITIAL_REWARDS_CATALOG: RewardItem[] = [];
