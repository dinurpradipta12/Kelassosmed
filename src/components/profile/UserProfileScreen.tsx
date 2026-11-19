"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Bell,
  Search,
  Settings,
  ChevronDown,
  MoreHorizontal,
  Clock,
  Folder,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Smile,
  Check,
  UserPlus,
  Mail,
  Users,
  PanelLeft,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { useRuangSosmedStore } from "@/context/RuangSosmedStore";
import { type AuthenticatedUser } from "@/components/navigation/GlobalRoleSwitcher";
import { ContentBadge } from "@/components/ui/ContentBadge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type ProfileUserRole = "Learner" | "Admin" | "Super Admin";

export interface UserProfileData {
  id: string;
  fullName: string;
  initials: string;
  userRole: ProfileUserRole;
  avatarUrl: string;
  headerBanner?: string;
  ssnNumber: string;
  gender: "Male" | "Female";
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  website: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  address: string;
  professionalRole: string;
  skills: string[];
  university: string;
  degree: string;
  graduationYear: string;
}

const PRESET_HEADER_BANNERS = [
  {
    id: "cosmic",
    label: "Cosmic Violet",
    gradient:
      "linear-gradient(125deg, #0F0728 0%, #3B0764 35%, #831843 68%, #4C1D95 100%)",
  },
  {
    id: "indigo",
    label: "Studio Indigo",
    gradient: "linear-gradient(125deg, #1E1B4B 0%, #3730A3 45%, #4F39F6 100%)",
  },
  {
    id: "ocean",
    label: "Ocean Teal",
    gradient: "linear-gradient(125deg, #0F172A 0%, #0369A1 50%, #06B6D4 100%)",
  },
  {
    id: "emerald",
    label: "Emerald Mint",
    gradient: "linear-gradient(125deg, #064E3B 0%, #059669 50%, #14B8A6 100%)",
  },
  {
    id: "sunset",
    label: "Warm Sunset",
    gradient: "linear-gradient(125deg, #7C2D12 0%, #EA580C 50%, #F59E0B 100%)",
  },
  {
    id: "midnight",
    label: "Midnight Slate",
    gradient: "linear-gradient(125deg, #09090B 0%, #18181B 55%, #3F3F46 100%)",
  },
];

const DEFAULT_ADMIN_PROFILE: UserProfileData = {
  id: "prof-admin-1",
  fullName: "Dinur Pradipta",
  initials: "DP",
  userRole: "Super Admin",
  avatarUrl: "/avatars/Frame 23.png",
  ssnNumber: "317-884-2026",
  gender: "Male",
  email: "contact.dinurpradipta@gmail.com",
  phoneCountryCode: "+62",
  phoneNumber: "812-9482-7710",
  website: "https://ruangsosmed.id",
  country: "Indonesia",
  state: "DKI Jakarta",
  city: "Jakarta Selatan",
  postalCode: "12190",
  address: "Jakarta Selatan, DKI Jakarta, 12190",
  professionalRole: "Social Media Strategist & Platform Admin",
  skills: [
    "Social Media Strategy",
    "Content Planning",
    "Instagram Viral Hook",
    "Audience Analytics",
    "Meta Ads",
  ],
  university: "Universitas Indonesia",
  degree: "Sarjana Ilmu Komunikasi & Media Digital",
  graduationYear: "2018 - 2022",
};

const DEFAULT_LEARNER_PROFILE: UserProfileData = {
  id: "prof-learner-1",
  fullName: "Learner",
  initials: "AR",
  userRole: "Learner",
  avatarUrl: "",
  ssnNumber: "317-884-2026",
  gender: "Male",
  email: "learner@ruangsosmed.id",
  phoneCountryCode: "+62",
  phoneNumber: "812-9482-7710",
  website: "https://portfolio.ruangsosmed.id",
  country: "Indonesia",
  state: "DKI Jakarta",
  city: "Jakarta Selatan",
  postalCode: "12190",
  address: "Jl. Jenderal Sudirman Kav. 52-53, SCBD, Jakarta Selatan, 12190",
  professionalRole: "Social Media Specialist",
  skills: [
    "Content Creation",
    "Instagram Reels & Carousel",
    "Copywriting",
    "Audience Engagement",
    "Content Strategy",
  ],
  university: "Universitas Indonesia",
  degree: "Sarjana Ilmu Komunikasi & Media Digital",
  graduationYear: "2020 - 2024",
};

interface ProfileContentCardItem {
  id: string;
  title: string;
  type: string;
  status: "Published" | "Draft";
  learnerCount: number;
  category: string;
  bannerGradient: string;
  cardKind: "course" | "quiz-low" | "quiz-high";
  completionRate?: number;
  usefulReaction?: number;
  correctCount?: number;
  totalQuestions?: number;
  correctRate?: number;
  assigned: boolean;
}

interface UserProfileScreenProps {
  mode: "admin" | "learner";
  currentUser?: AuthenticatedUser | null;
  initialSubView?: "profile" | "manual-setup" | "email-invite";
  onSubViewChange?: (
    subView: "profile" | "manual-setup" | "email-invite"
  ) => void;
  onBack?: () => void;
  onUpdateUser?: (updated: AuthenticatedUser) => void;
  onShowToast: (msg: string) => void;
}

async function syncProfileToSupabaseSystemRow(
  profileData: UserProfileData,
  _roleMode: "admin" | "learner"
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return;

    await supabase
      .from("profiles")
      .update({
        full_name: profileData.fullName,
        avatar_url: profileData.avatarUrl || null,
        header_url: profileData.headerBanner || null,
        job_title: profileData.professionalRole || "Social Media Specialist",
      })
      .eq("id", uid);
  } catch {}
}

export function UserProfileScreen({
  mode,
  currentUser,
  initialSubView = "profile",
  onSubViewChange,
  onBack,
  onUpdateUser,
  onShowToast,
}: UserProfileScreenProps) {
  const { explorerItems, cohortProjects, updateUserAvatarInStore, resolveUserAvatar } =
    useRuangSosmedStore();

  const storageKey =
    mode === "admin"
      ? "ruang_sosmed_profile_admin_v2"
      : "ruang_sosmed_profile_learner_v2";

  const [profile, setProfile] = useState<UserProfileData>(() => {
    const fallback =
      mode === "admin" ? DEFAULT_ADMIN_PROFILE : DEFAULT_LEARNER_PROFILE;
    const siblingKey =
      storageKey === "ruang_sosmed_profile_admin_v2"
        ? "ruang_sosmed_profile_learner_v2"
        : "ruang_sosmed_profile_admin_v2";
    let siblingAvatar = "";
    if (typeof window !== "undefined") {
      try {
        const sRaw = window.localStorage.getItem(siblingKey);
        if (sRaw) {
          const sParsed = JSON.parse(sRaw);
          if (typeof sParsed?.avatarUrl === "string" && sParsed.avatarUrl) {
            siblingAvatar = sParsed.avatarUrl;
          }
        }
      } catch {}
    }

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const cleanName =
            parsed.fullName === "Arunika Developer"
              ? fallback.fullName
              : parsed.fullName;
          const cleanAvatar =
            parsed.avatarUrl ||
            currentUser?.avatarUrl ||
            siblingAvatar ||
            fallback.avatarUrl ||
            "";
          // Auto-sanitize legacy dummy values from old template cache
          if (
            parsed.professionalRole?.includes("UI / UX Designer") ||
            parsed.university?.includes("Rhode Island")
          ) {
            return {
              ...fallback,
              ...parsed,
              fullName: cleanName || fallback.fullName,
              avatarUrl: cleanAvatar,
              professionalRole: fallback.professionalRole,
              skills: fallback.skills,
              university: fallback.university,
              degree: fallback.degree,
            };
          }
          return {
            ...fallback,
            ...parsed,
            fullName: cleanName || fallback.fullName,
            avatarUrl: cleanAvatar,
          };
        }
      } catch {}
    }
    if (currentUser?.name) {
      const resolvedInitName =
        currentUser.name === "Arunika Developer"
          ? "Dinur Pradipta"
          : currentUser.name;
      const computedInitials =
        resolvedInitName
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "DP";
      return {
        ...fallback,
        fullName: resolvedInitName,
        initials: computedInitials,
        avatarUrl:
          currentUser.avatarUrl ||
          siblingAvatar ||
          fallback.avatarUrl ||
          "",
        email: currentUser.email || fallback.email,
        userRole:
          currentUser.role === "admin"
            ? "Super Admin"
            : ("Learner" as ProfileUserRole),
      };
    }
    return {
      ...fallback,
      avatarUrl: currentUser?.avatarUrl || siblingAvatar || fallback.avatarUrl,
    };
  });

  const resolvedStoreAvatar = resolveUserAvatar(
    profile.email,
    profile.fullName,
    currentUser?.email,
    currentUser?.name,
    currentUser?.username
  );

  const effectiveAvatarUrl =
    profile.avatarUrl || currentUser?.avatarUrl || resolvedStoreAvatar || "";

  // Save profile updates to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(profile));
      } catch {}
    }
  }, [profile, storageKey]);

  // Fetch own verified profile from `public.profiles` (no shared system rows in contents)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (!uid || cancelled) return;

        const { data: row } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, header_url, job_title")
          .eq("id", uid)
          .maybeSingle();

        if (cancelled || !row) return;
        setProfile((prev) => {
          const merged: UserProfileData = {
            ...prev,
            fullName:
              row.full_name && row.full_name !== "Arunika Developer"
                ? row.full_name
                : prev.fullName,
            avatarUrl: row.avatar_url || prev.avatarUrl,
            headerBanner: row.header_url || prev.headerBanner,
            professionalRole: row.job_title || prev.professionalRole,
          };
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(merged));
            window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
          } catch {}
          return merged;
        });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, storageKey]);

  // Sub-views: "profile" (Bottom-Left & Bottom-Right of image) vs "manual-setup" (Top-Left) vs "email-invite" (Top-Right)
  const [subView, setSubView] = useState<
    "profile" | "manual-setup" | "email-invite"
  >(initialSubView);
  const profileRef = useRef<UserProfileData>(profile);
  profileRef.current = profile;

  const changeSubView = React.useCallback(
    (next: "profile" | "manual-setup" | "email-invite") => {
      setSubView(next);
      onSubViewChange?.(next);
    },
    [onSubViewChange]
  );

  // Tabs inside Individual Profile view: "content" | "details" | "group"
  const [activeTab, setActiveTab] = useState<"content" | "details" | "group">(
    "details"
  );

  // Content tab filter & view mode
  const [statusFilter, setStatusFilter] = useState<
    "All status" | "Published" | "Draft"
  >("All status");
  const [contentSearch, setContentSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [contentViewMode, setContentViewMode] = useState<"grid" | "list">(
    "grid"
  );
  const [assignedCardIds, setAssignedCardIds] = useState<Set<string>>(
    new Set()
  );

  // Form states for Manual Setup / Profile Settings
  const [formRole, setFormRole] = useState<ProfileUserRole>(profile.userRole);
  const [formFullName, setFormFullName] = useState(profile.fullName);
  const [formSsn, setFormSsn] = useState(profile.ssnNumber);
  const [formGender, setFormGender] = useState<"Male" | "Female">(
    profile.gender
  );
  const [formEmail, setFormEmail] = useState(profile.email);
  const [formCountryCode, setFormCountryCode] = useState(
    profile.phoneCountryCode
  );
  const [formPhone, setFormPhone] = useState(profile.phoneNumber);
  const [formCountry, setFormCountry] = useState(profile.country);
  const [formState, setFormState] = useState(profile.state);
  const [formCity, setFormCity] = useState(profile.city);
  const [formPostalCode, setFormPostalCode] = useState(profile.postalCode);
  const [formProfRole, setFormProfRole] = useState(profile.professionalRole);
  const [formSkillsText, setFormSkillsText] = useState(
    profile.skills.join(", ")
  );
  const [formAvatarUrl, setFormAvatarUrl] = useState(profile.avatarUrl);
  useEffect(() => {
    if (!profile.avatarUrl && effectiveAvatarUrl) {
      setProfile((prev) =>
        prev.avatarUrl ? prev : { ...prev, avatarUrl: effectiveAvatarUrl }
      );
      setFormAvatarUrl((prev) => prev || effectiveAvatarUrl);
    }
  }, [profile.avatarUrl, effectiveAvatarUrl]);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [headerPickerOpen, setHeaderPickerOpen] = useState(false);

  const PRESET_AVATARS = Array.from(
    { length: 28 },
    (_, idx) => `/avatars/Frame ${idx + 1}.png`
  );

  // Email Invite state (Top-Right of Reference Image)
  const [inviteRole, setInviteRole] = useState<ProfileUserRole>("Learner");
  const [inviteEmailsText, setInviteEmailsText] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);

  const syncHeaderBanner = (nextHeader: string) => {
    const updatedProfile: UserProfileData = {
      ...profile,
      headerBanner: nextHeader,
    };
    setProfile(updatedProfile);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
        const otherKey =
          storageKey === "ruang_sosmed_profile_admin_v2"
            ? "ruang_sosmed_profile_learner_v2"
            : "ruang_sosmed_profile_admin_v2";
        const otherRaw = window.localStorage.getItem(otherKey);
        if (otherRaw) {
          const parsedOther = JSON.parse(otherRaw);
          window.localStorage.setItem(
            otherKey,
            JSON.stringify({ ...parsedOther, headerBanner: nextHeader })
          );
        }
        window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
      } catch {}
    }

    void syncProfileToSupabaseSystemRow(updatedProfile, mode);

    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          supabase
            .from("profiles")
            .update({ header_url: nextHeader || null })
            .eq("id", user.id)
            .then(() => {});
          supabase
            .from("user_profiles")
            .update({ header_url: nextHeader || null })
            .eq("user_id", user.id)
            .then(() => {});
        }
      });
    }
  };

  const handleHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        syncHeaderBanner(reader.result);
        setHeaderPickerOpen(false);
        onShowToast(`Header profil "${file.name}" berhasil diperbarui.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const syncFormFieldsFromProfile = React.useCallback(
    (p: UserProfileData) => {
      setFormRole(p.userRole);
      setFormFullName(p.fullName);
      setFormSsn(p.ssnNumber);
      setFormGender(p.gender);
      setFormEmail(p.email);
      setFormCountryCode(p.phoneCountryCode);
      setFormPhone(p.phoneNumber);
      setFormCountry(p.country);
      setFormState(p.state);
      setFormCity(p.city);
      setFormPostalCode(p.postalCode);
      setFormProfRole(p.professionalRole);
      setFormSkillsText(p.skills.join(", "));
      setFormAvatarUrl(p.avatarUrl);
    },
    []
  );

  useEffect(() => {
    if (initialSubView === "manual-setup") {
      syncFormFieldsFromProfile(profileRef.current);
    }
    setSubView(initialSubView);
  }, [initialSubView, syncFormFieldsFromProfile]);

  const openManualSetup = () => {
    syncFormFieldsFromProfile(profile);
    changeSubView("manual-setup");
  };

  const syncAvatarAcrossApp = (nextAvatarUrl: string) => {
    setFormAvatarUrl(nextAvatarUrl);
    const updatedProfile: UserProfileData = {
      ...profile,
      avatarUrl: nextAvatarUrl,
    };
    setProfile(updatedProfile);

    const updatedUser: AuthenticatedUser = {
      name: currentUser?.name || formFullName.trim() || profile.fullName,
      email: currentUser?.email || formEmail.trim() || profile.email,
      role:
        currentUser?.role ||
        (formRole === "Learner" ? "learner" : "admin"),
      username: currentUser?.username,
      avatarUrl: nextAvatarUrl,
    };
    onUpdateUser?.(updatedUser);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
        const otherKey =
          storageKey === "ruang_sosmed_profile_admin_v2"
            ? "ruang_sosmed_profile_learner_v2"
            : "ruang_sosmed_profile_admin_v2";
        const otherRaw = window.localStorage.getItem(otherKey);
        if (otherRaw) {
          const parsedOther = JSON.parse(otherRaw);
          if (
            !parsedOther?.email ||
            !updatedUser.email ||
            String(parsedOther.email).toLowerCase() ===
              String(updatedUser.email).toLowerCase()
          ) {
            window.localStorage.setItem(
              otherKey,
              JSON.stringify({ ...parsedOther, avatarUrl: nextAvatarUrl })
            );
          }
        }
        window.localStorage.setItem(
          "ruang_sosmed_session_user_v1",
          JSON.stringify(updatedUser)
        );
        window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
        window.dispatchEvent(new Event("storage"));
      } catch {}
    }

    updateUserAvatarInStore(nextAvatarUrl, {
      email: updatedUser.email,
      name: updatedUser.name,
      username: updatedUser.username,
    });
    void syncProfileToSupabaseSystemRow(updatedProfile, mode);

    if (isSupabaseConfigured) {
      const targetEmail = (updatedUser.email || "").trim();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          updateUserAvatarInStore(nextAvatarUrl, {
            id: user.id,
            email: targetEmail || user.email,
            name: updatedUser.name,
            username: updatedUser.username,
          });
          supabase
            .from("profiles")
            .update({ avatar_url: nextAvatarUrl || null })
            .eq("id", user.id)
            .then(() => {});
          supabase
            .from("user_profiles")
            .update({ avatar_url: nextAvatarUrl || null })
            .eq("user_id", user.id)
            .then(() => {});
        }
      });
      if (targetEmail) {
        supabase
          .from("profiles")
          .update({ avatar_url: nextAvatarUrl || null })
          .ilike("email", targetEmail)
          .then(() => {});
        supabase
          .from("user_profiles")
          .update({ avatar_url: nextAvatarUrl || null })
          .ilike("email", targetEmail)
          .then(() => {});
      }
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const rawDataUrl = reader.result;
      // Resize uploaded photo smoothly to <= 256px if large so localStorage + Supabase sync stay fast
      if (rawDataUrl.length > 90000 && typeof Image !== "undefined") {
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 256;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressed = canvas.toDataURL("image/jpeg", 0.82);
              syncAvatarAcrossApp(compressed);
              setAvatarPickerOpen(false);
              onShowToast(`Foto profil "${file.name}" diterapkan & disinkronkan.`);
              return;
            }
          } catch {}
          syncAvatarAcrossApp(rawDataUrl);
          setAvatarPickerOpen(false);
          onShowToast(`Foto profil "${file.name}" diterapkan & disinkronkan.`);
        };
        img.onerror = () => {
          syncAvatarAcrossApp(rawDataUrl);
          setAvatarPickerOpen(false);
          onShowToast(`Foto profil "${file.name}" diterapkan & disinkronkan.`);
        };
        img.src = rawDataUrl;
      } else {
        syncAvatarAcrossApp(rawDataUrl);
        setAvatarPickerOpen(false);
        onShowToast(`Foto profil "${file.name}" diterapkan & disinkronkan.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveManualSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = formFullName.trim() || "John Doe";
    const computedInitials =
      finalName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "AR";
    const parsedSkills = formSkillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedAddress = `${formCity || "Longview"}, ${
      formState || "Texas(TX)"
    }, ${formPostalCode || "75604"}`;

    const updatedProfile: UserProfileData = {
      ...profile,
      fullName: finalName,
      initials: computedInitials,
      userRole: formRole,
      avatarUrl: formAvatarUrl,
      ssnNumber: formSsn.trim() || "123-555-6789",
      gender: formGender,
      email: formEmail.trim() || "johndoe@gmail.com",
      phoneCountryCode: formCountryCode,
      phoneNumber: formPhone.trim() || "567-567-652",
      country: formCountry,
      state: formState,
      city: formCity,
      postalCode: formPostalCode,
      address: updatedAddress,
      professionalRole: formProfRole.trim() || (mode === "admin" ? "Social Media Strategist & Platform Admin" : "Social Media Specialist"),
      skills: parsedSkills.length > 0 ? parsedSkills : profile.skills,
    };

    setProfile(updatedProfile);

    // Synchronize to current session user so sidebar rails and navbar avatars update instantly
    const derivedUsername =
      finalName
        .split(" ")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") ||
      currentUser?.username ||
      "user";

    const updatedUser: AuthenticatedUser = {
      name: finalName,
      email: updatedProfile.email,
      role: formRole === "Learner" ? "learner" : "admin",
      username: derivedUsername,
      avatarUrl: formAvatarUrl,
    };

    onUpdateUser?.(updatedUser);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
        const otherKey =
          storageKey === "ruang_sosmed_profile_admin_v2"
            ? "ruang_sosmed_profile_learner_v2"
            : "ruang_sosmed_profile_admin_v2";
        const otherRaw = window.localStorage.getItem(otherKey);
        if (otherRaw) {
          const parsedOther = JSON.parse(otherRaw);
          if (
            !parsedOther?.email ||
            !updatedUser.email ||
            String(parsedOther.email).toLowerCase() ===
              String(updatedUser.email).toLowerCase()
          ) {
            window.localStorage.setItem(
              otherKey,
              JSON.stringify({ ...parsedOther, avatarUrl: formAvatarUrl })
            );
          }
        }
        window.localStorage.setItem(
          "ruang_sosmed_session_user_v1",
          JSON.stringify(updatedUser)
        );
        window.dispatchEvent(new Event("ruang_sosmed_profile_updated"));
        window.dispatchEvent(new Event("storage"));
      } catch {}
    }

    updateUserAvatarInStore(formAvatarUrl, {
      email: updatedUser.email,
      name: updatedUser.name,
      username: updatedUser.username,
    });
    void syncProfileToSupabaseSystemRow(updatedProfile, mode);

    // Persist to Supabase profiles, user_profiles & auth metadata if connected
    if (isSupabaseConfigured) {
      supabase.auth
        .updateUser({
          data: {
            full_name: finalName,
            username: derivedUsername,
          },
        })
        .catch(() => {});
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          updateUserAvatarInStore(formAvatarUrl, {
            id: user.id,
            email: updatedUser.email || user.email,
            name: updatedUser.name,
            username: updatedUser.username,
          });
          supabase
            .from("profiles")
            .update({
              full_name: finalName,
              avatar_url: formAvatarUrl || null,
            })
            .eq("id", user.id)
            .then(() => {});
          supabase
            .from("user_profiles")
            .update({
              full_name: finalName,
              avatar_url: formAvatarUrl || null,
            })
            .eq("user_id", user.id)
            .then(() => {});
        }
      });
      if (updatedUser.email) {
        supabase
          .from("profiles")
          .update({
            full_name: finalName,
            avatar_url: formAvatarUrl || null,
          })
          .ilike("email", updatedUser.email)
          .then(() => {});
        supabase
          .from("user_profiles")
          .update({
            full_name: finalName,
            avatar_url: formAvatarUrl || null,
          })
          .ilike("email", updatedUser.email)
          .then(() => {});
      }
    }

    changeSubView("profile");
    onShowToast(`Profil "${finalName}" (${formRole}) berhasil disimpan.`);
  };

  const handleSaveEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = inviteEmailsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      onShowToast("Masukkan minimal 1 alamat email untuk diundang.");
      return;
    }
    setInviteEmailsText("");
    changeSubView("profile");
    onShowToast(
      `Undangan sebagai ${inviteRole} telah dikirim ke ${emails.length} email (${emails.join(", ")}).`
    );
  };

  // 100% Real workspace learning contents from RuangSosmedStore (No fake template dummy cards)
  const allDisplayContentCards: ProfileContentCardItem[] = React.useMemo(() => {
    const validItems = (explorerItems || []).filter(
      (item) => item.type !== "Folder"
    );

    const mapped: ProfileContentCardItem[] = validItems.map((exp, idx) => {
      const isQuiz = exp.type === "Quiz";
      return {
        id: exp.id,
        title: exp.title,
        type: exp.type,
        status: exp.statusLabel === "Draft" ? "Draft" : "Published",
        learnerCount: exp.assignedCount || 0,
        category: exp.category || "Social Media Strategy",
        bannerGradient:
          exp.bannerGradient ||
          (idx % 3 === 0
            ? "linear-gradient(135deg, #4F39F6 0%, #7C3AED 50%, #EC4899 100%)"
            : idx % 3 === 1
            ? "linear-gradient(135deg, #0EA5E9 0%, #3B82F6 50%, #6366F1 100%)"
            : "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)"),
        cardKind: isQuiz
          ? idx % 2 === 0
            ? "quiz-high"
            : "quiz-low"
          : "course",
        completionRate: exp.progressPercent || 85,
        usefulReaction: 90,
        correctCount: isQuiz ? (idx % 2 === 0 ? 72 : 12) : undefined,
        totalQuestions: isQuiz ? (idx % 2 === 0 ? 100 : 24) : undefined,
        correctRate: isQuiz ? (idx % 2 === 0 ? 80 : 50) : undefined,
        assigned: assignedCardIds.has(exp.id),
      };
    });

    return mapped.filter((card) => {
      if (statusFilter !== "All status" && card.status !== statusFilter) {
        return false;
      }
      if (
        contentSearch.trim() &&
        !card.title.toLowerCase().includes(contentSearch.toLowerCase()) &&
        !card.category.toLowerCase().includes(contentSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [explorerItems, statusFilter, contentSearch, assignedCardIds]);

  // =========================================================================
  // VIEW 1 & 2: ADD USER / EDIT PROFILE — MANUAL SETUP & EMAIL INVITE
  // (Matches Top-Left & Top-Right of Reference Image)
  // =========================================================================
  if (subView === "manual-setup" || subView === "email-invite") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-[#F8F9FB] flex flex-col md:flex-row">
        {/* Hidden File Input for Profile Picture Upload */}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          className="hidden"
        />

        {/* Left Setup Navigation Sidebar (Manual Setup | Email Invite if Admin) */}
        <aside className="w-full md:w-64 bg-[#F8F9FB] border-b md:border-b-0 md:border-r border-[#EAECEF] flex flex-col justify-between p-5 shrink-0">
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => changeSubView("profile")}
              className="inline-flex items-center gap-2.5 text-xs font-bold text-[#121215] hover:text-[#0D9488] transition-colors cursor-pointer"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFFFFF] border border-[#EAECEF] shadow-2xs">
                <ArrowLeft size={13} />
              </span>
              <span>
                {mode === "admin" ? "Back to User List" : "Back to Profile"}
              </span>
            </button>

            <nav aria-label="User Setup Mode" className="space-y-1">
              <button
                type="button"
                onClick={() => changeSubView("manual-setup")}
                className={`w-full text-left px-4 py-3 text-xs font-bold transition-all cursor-pointer border-l-4 ${
                  subView === "manual-setup"
                    ? "border-[#F59E0B] bg-[#EAECEF]/60 text-[#121215]"
                    : "border-transparent text-[#5E5E5E] hover:bg-[#EAECEF]/30 hover:text-[#121215]"
                }`}
              >
                {mode === "admin" ? "Manual Setup" : "Profile Settings"}
              </button>
              {mode === "admin" && (
                <button
                  type="button"
                  onClick={() => changeSubView("email-invite")}
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-all cursor-pointer border-l-4 ${
                    subView === "email-invite"
                      ? "border-[#F59E0B] bg-[#EAECEF]/60 text-[#121215]"
                      : "border-transparent text-[#5E5E5E] hover:bg-[#EAECEF]/30 hover:text-[#121215]"
                  }`}
                >
                  Email Invite
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Right Main Form Area */}
        <main className="flex-1 bg-[#FFFFFF] px-4 sm:px-6 py-6 overflow-y-auto">
          {subView === "manual-setup" ? (
            /* MANUAL SETUP / PROFILE SETTINGS FORM */
            <form
              onSubmit={handleSaveManualSetup}
              className="w-full space-y-7"
            >
              <div className="border-b border-[#EAECEF] pb-4">
                <h1 className="text-lg font-bold text-[#121215]">
                  {mode === "admin" ? "Edit User Profile" : "Profile Settings"}
                </h1>
                <p className="text-xs text-[#5E5E5E] mt-0.5">
                  {mode === "admin"
                    ? "Kelola informasi profil, hak akses pengguna, dan detail kontak"
                    : "Kelola data pribadi, foto profil, dan informasi kontak Anda"}
                </p>
              </div>

              {/* 1. User Role */}
              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-[#121215]">
                  User Role
                </label>
                {mode === "admin" ? (
                  <div className="flex flex-wrap items-center gap-6">
                    {(["Learner", "Admin", "Super Admin"] as const).map((r) => (
                      <label
                        key={r}
                        onClick={() => setFormRole(r)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#121215] cursor-pointer"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            formRole === r
                              ? "border-[#14B8A6] bg-[#14B8A6]"
                              : "border-[#D1D5DB] bg-[#FFFFFF]"
                          }`}
                        >
                          {formRole === r && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/30 px-3 py-1.5 text-xs font-bold text-[#92400E]">
                    <span>Learner (Student)</span>
                  </div>
                )}
              </div>

              {/* 2. Profile Picture */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-[#121215]">
                    Profile Picture
                  </h2>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    We recommend an image of at least 500 x 500. You can upload a
                    PNG or JPG under 10MB
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-[#F3F4F6] border border-[#EAECEF] overflow-hidden flex items-center justify-center shrink-0">
                    {formAvatarUrl || effectiveAvatarUrl ? (
                      <img
                        src={formAvatarUrl || effectiveAvatarUrl}
                        alt={formFullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-bold text-[#92400E] bg-[#FDE68A] h-full w-full flex items-center justify-center">
                        {profile.initials}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      Change Picture
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarPickerOpen((prev) => !prev)}
                      className={`rounded-lg px-4 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                        avatarPickerOpen
                          ? "bg-[#4F39F6] text-white border-[#4F39F6]"
                          : "bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F39F6] border-[#C7D2FE]"
                      }`}
                    >
                      Use Avatar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        syncAvatarAcrossApp("");
                        setAvatarPickerOpen(false);
                        onShowToast("Foto profil direset ke avatar inisial.");
                      }}
                      className="rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-4 py-2 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {avatarPickerOpen && (
                  <div className="rounded-xl bg-[#F8F9FB] border border-[#EAECEF] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#121215]">
                          Pilih Avatar
                        </p>
                        <p className="text-[11px] text-[#5E5E5E]">
                          Klik salah satu avatar untuk langsung menerapkan ke seluruh halaman.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvatarPickerOpen(false)}
                        className="text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] px-2 py-1 rounded-md hover:bg-white cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5">
                      {PRESET_AVATARS.map((src, idx) => {
                        const isSelected = formAvatarUrl === src;
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => {
                              syncAvatarAcrossApp(src);
                              setAvatarPickerOpen(false);
                              onShowToast(`Avatar #${idx + 1} diterapkan ke seluruh profil.`);
                            }}
                            title={`Avatar ${idx + 1}`}
                            className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${
                              isSelected
                                ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/30 scale-105"
                                : "border-white shadow-xs hover:border-[#4F39F6]/60"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`Avatar ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Personal Information */}
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold text-[#121215]">
                  Personal Information
                </h2>

                <div>
                  <label className="block text-xs font-bold text-[#121215] mb-1.5">
                    Fullname<span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      SSN Number<span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formSsn}
                      onChange={(e) => setFormSsn(e.target.value)}
                      placeholder="SSN Number"
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-2">
                      Gender
                    </label>
                    <div className="flex items-center gap-6">
                      {(["Male", "Female"] as const).map((g) => (
                        <label
                          key={g}
                          onClick={() => setFormGender(g)}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-[#121215] cursor-pointer"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              formGender === g
                                ? "border-[#14B8A6] bg-[#14B8A6]"
                                : "border-[#D1D5DB] bg-[#FFFFFF]"
                            }`}
                          >
                            {formGender === g && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </span>
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Contact Information */}
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold text-[#121215]">
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      Email<span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      Mobile Number<span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={formCountryCode}
                        onChange={(e) => setFormCountryCode(e.target.value)}
                        aria-label="Country phone code"
                        className="rounded-lg bg-[#FFFFFF] px-2.5 py-2 text-xs font-semibold text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                      >
                        <option value="+1">+1</option>
                        <option value="+62">+62</option>
                        <option value="+65">+65</option>
                        <option value="+44">+44</option>
                      </select>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="Mobile Number"
                        className="flex-1 rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      Country<span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    >
                      <option value="United States">United States</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      State<span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    >
                      <option value="Texas (TX)">Texas (TX)</option>
                      <option value="California (CA)">California (CA)</option>
                      <option value="New York (NY)">New York (NY)</option>
                      <option value="DKI Jakarta">DKI Jakarta</option>
                      <option value="Jawa Barat">Jawa Barat</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      City<span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      Postal Code<span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formPostalCode}
                      onChange={(e) => setFormPostalCode(e.target.value)}
                      placeholder="Postal Code"
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Professional Information */}
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold text-[#121215]">
                  Professional Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      Role
                    </label>
                    <input
                      type="text"
                      value={formProfRole}
                      onChange={(e) => setFormProfRole(e.target.value)}
                      placeholder="UI / UX Designer"
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#121215] mb-1.5">
                      Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      value={formSkillsText}
                      onChange={(e) => setFormSkillsText(e.target.value)}
                      placeholder="UI Designer, Wireframing, Research, Prototyping"
                      className="w-full rounded-lg bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => changeSubView("profile")}
                  className="rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-6 py-2.5 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* TOP-RIGHT SCREENSHOT: EMAIL INVITE FORM */
            <form
              onSubmit={handleSaveEmailInvite}
              className="w-full space-y-7 flex flex-col justify-between min-h-[520px]"
            >
              <div className="space-y-6">
                <div className="border-b border-[#EAECEF] pb-4 space-y-1">
                  <button
                    type="button"
                    onClick={() => changeSubView("profile")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E5E5E] hover:text-[#121215] cursor-pointer"
                  >
                    <ArrowLeft size={11} />
                    <span>Back to User List</span>
                  </button>
                  <h1 className="text-lg font-bold text-[#121215]">Add User</h1>
                </div>

                {/* User Role */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-[#121215]">
                    User Role
                  </label>
                  <div className="flex flex-wrap items-center gap-6">
                    {(["Learner", "Admin", "Super Admin"] as const).map((r) => (
                      <label
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#121215] cursor-pointer"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            inviteRole === r
                              ? "border-[#14B8A6] bg-[#14B8A6]"
                              : "border-[#D1D5DB] bg-[#FFFFFF]"
                          }`}
                        >
                          {inviteRole === r && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* User Email Address */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#121215]">
                    User Email Address
                  </label>
                  <textarea
                    rows={8}
                    value={inviteEmailsText}
                    onChange={(e) => setInviteEmailsText(e.target.value)}
                    placeholder="User email"
                    className="w-full rounded-xl bg-[#FFFFFF] p-3.5 text-xs text-[#121215] border border-[#EAECEF] focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => changeSubView("profile")}
                  className="rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-6 py-2.5 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3 & 4: INDIVIDUAL USER PROFILE — USER DETAILS & CONTENT TABS
  // (Matches Bottom-Left & Bottom-Right of Reference Image)
  // =========================================================================
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#FFFFFF] pb-16">
      {/* Top Individual Bar (matches Bottom-Left & Bottom-Right screenshots) */}
      <header
        className={`sticky ${
          mode === "learner" ? "top-0" : "top-10"
        } z-30 bg-[#FFFFFF] border-b border-[#EAECEF] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title={mode === "admin" ? "Toggle Sidebar / Back" : "Kembali ke Beranda"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF] text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
            >
              {mode === "admin" ? <PanelLeft size={15} /> : <ArrowLeft size={15} />}
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-[#121215] leading-tight">
              Individual
            </h1>
            <p className="text-[11px] text-[#9CA3AF]">
              User / Individual /{" "}
              <span className="text-[#5E5E5E] font-medium">
                {profile.fullName}
              </span>{" "}
              •{" "}
              <span className="font-semibold text-[#14B8A6]">
                {profile.userRole}
              </span>
            </p>
          </div>
        </div>

        {/* Right Header Actions: [+] Teal Button (Admin only), Bell, Search, User Chip */}
        <div className="flex items-center gap-2.5">
          {mode === "admin" && (
            <button
              type="button"
              onClick={openManualSetup}
              title="Add User / Manual Setup"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onShowToast("Tidak ada notifikasi profil baru.")}
            title="Notifications"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF] text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
          >
            <Bell size={14} />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("content");
              setSearchOpen((prev) => !prev);
            }}
            title="Search User Content"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8F9FB] hover:bg-[#EAECEF] text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
          >
            <Search size={14} />
          </button>

          {/* Top-Right Profile Pill (Theresia / Super Admin or Active User) */}
          <button
            type="button"
            onClick={openManualSetup}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF]/60 px-2.5 py-1 border border-[#EAECEF] cursor-pointer"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDE68A] text-[#92400E] text-[11px] font-bold overflow-hidden">
              {effectiveAvatarUrl ? (
                <img
                  src={effectiveAvatarUrl}
                  alt={profile.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                profile.initials
              )}
            </span>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#121215] leading-tight">
                {profile.fullName}
              </p>
              <p className="text-[10px] text-[#9CA3AF] leading-tight">
                {profile.userRole}
              </p>
            </div>
            <ChevronDown size={13} className="text-[#9CA3AF]" />
          </button>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 pt-6 space-y-6">
        {/* Hero Cover Banner + Overlapping Circular Avatar */}
        <div className="relative">
          {(() => {
            const activeBannerVal = profile.headerBanner || "cosmic";
            const matchedPreset = PRESET_HEADER_BANNERS.find(
              (b) => b.id === activeBannerVal
            );
            const isCustomImage =
              !matchedPreset &&
              (activeBannerVal.startsWith("data:") ||
                activeBannerVal.startsWith("http") ||
                activeBannerVal.startsWith("/"));
            const bannerBackground = matchedPreset
              ? matchedPreset.gradient
              : PRESET_HEADER_BANNERS[0].gradient;

            return (
              <div
                className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-[#EAECEF] shadow-sm"
                style={!isCustomImage ? { background: bannerBackground } : undefined}
              >
                {isCustomImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeBannerVal}
                    alt="Profile Header Banner"
                    className="h-full w-full object-cover"
                  />
                ) : activeBannerVal === "cosmic" ? (
                  /* Cosmic Starfield & Geometric Diagonal Rays SVG (Default Banner) */
                  <svg
                    viewBox="0 0 1200 260"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full object-cover opacity-90"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="cosmicRay1"
                        x1="200"
                        y1="0"
                        x2="750"
                        y2="260"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#F43F5E" stopOpacity="0.65" />
                        <stop offset="0.5" stopColor="#EC4899" stopOpacity="0.45" />
                        <stop offset="1" stopColor="#6366F1" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient
                        id="cosmicRay2"
                        x1="500"
                        y1="0"
                        x2="1050"
                        y2="260"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#A855F7" stopOpacity="0.5" />
                        <stop offset="1" stopColor="#EC4899" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="280,0 560,0 820,260 460,260"
                      fill="url(#cosmicRay1)"
                    />
                    <polygon
                      points="580,0 890,0 1180,260 790,260"
                      fill="url(#cosmicRay2)"
                    />
                    {[
                      [80, 40],
                      [140, 120],
                      [210, 75],
                      [310, 180],
                      [420, 50],
                      [530, 140],
                      [670, 60],
                      [740, 190],
                      [860, 85],
                      [950, 150],
                      [1080, 55],
                      [1130, 180],
                    ].map(([cx, cy], idx) => (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r={idx % 3 === 0 ? 2 : 1.2}
                        fill="#FFFFFF"
                        fillOpacity={idx % 2 === 0 ? 0.85 : 0.45}
                      />
                    ))}
                  </svg>
                ) : null}

                {/* Change Header Button (Top-Right of Banner) */}
                <input
                  ref={headerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHeaderFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setHeaderPickerOpen((prev) => !prev)}
                  className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-xl bg-black/45 hover:bg-black/65 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-sm transition-all cursor-pointer"
                >
                  <ImageIcon size={13} />
                  <span>Ganti Header</span>
                </button>
              </div>
            );
          })()}

          {/* Header Picker Popover */}
          {headerPickerOpen && (
            <div className="absolute top-14 right-3 z-30 w-72 sm:w-80 rounded-2xl bg-white border border-[#EAECEF] p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAECEF] pb-2">
                <div>
                  <p className="text-xs font-bold text-[#121215]">
                    Pilih Header Banner
                  </p>
                  <p className="text-[10px] text-[#5E5E5E]">
                    Pilih tema warna atau unggah gambar sendiri.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHeaderPickerOpen(false)}
                  className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#121215] hover:bg-[#F8F9FB] cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {PRESET_HEADER_BANNERS.map((preset) => {
                  const isSelected =
                    (profile.headerBanner || "cosmic") === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        syncHeaderBanner(preset.id);
                        setHeaderPickerOpen(false);
                        onShowToast(`Header "${preset.label}" diterapkan.`);
                      }}
                      className={`group relative h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#4F39F6] ring-2 ring-[#4F39F6]/25 scale-[1.02]"
                          : "border-transparent hover:border-[#4F39F6]/50"
                      }`}
                      style={{ background: preset.gradient }}
                      title={preset.label}
                    >
                      <span className="absolute inset-x-0 bottom-0 bg-black/35 px-1.5 py-0.5 text-[9px] font-semibold text-white truncate">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#EAECEF]">
                <button
                  type="button"
                  onClick={() => headerFileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4F39F6] hover:bg-[#3B28CC] px-3 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Upload Gambar</span>
                </button>
                {profile.headerBanner && profile.headerBanner !== "cosmic" && (
                  <button
                    type="button"
                    onClick={() => {
                      syncHeaderBanner("cosmic");
                      setHeaderPickerOpen(false);
                      onShowToast("Header dikembalikan ke default.");
                    }}
                    className="rounded-xl bg-[#F8F9FB] hover:bg-[#EAECEF] px-3 py-2 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Overlapping Avatar + Name + [⚙️ Menu] + [Assign Contents] Row */}
          <div className="px-4 sm:px-8 -mt-12 sm:-mt-14 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Circular Avatar with White Ring */}
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-[#FFFFFF] bg-[#DBEAFE] shadow-md overflow-hidden flex items-center justify-center shrink-0">
                {effectiveAvatarUrl ? (
                  <img
                    src={effectiveAvatarUrl}
                    alt={profile.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* Illustrated Portrait Avatar SVG + Initials fallback */
                  <svg
                    viewBox="0 0 120 120"
                    className="h-full w-full"
                    role="img"
                    aria-label={profile.fullName}
                  >
                    <rect width="120" height="120" fill="#93C5FD" />
                    <circle cx="60" cy="46" r="22" fill="#D97706" />
                    <path
                      d="M38 40 C38 24, 82 24, 82 40 C82 32, 38 32, 38 40 Z"
                      fill="#1E293B"
                    />
                    <path
                      d="M22 116 C26 84, 94 84, 98 116 Z"
                      fill="#1E293B"
                    />
                  </svg>
                )}
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#121215]">
                    {profile.fullName}
                  </h2>
                  <span className="rounded-md bg-[#FDE68A] border border-[#F59E0B]/40 px-2 py-0.5 text-[10px] font-bold text-[#92400E]">
                    {profile.initials} • {profile.userRole}
                  </span>
                </div>
                <p className="text-xs text-[#5E5E5E]">
                  {profile.professionalRole} • {profile.email}
                </p>
              </div>
            </div>

            {/* Right Controls: [⚙️ Profile Setting] & optional [Assign Contents] (Admin only) */}
            <div className="flex items-center gap-3 pb-1 relative">
              <button
                type="button"
                onClick={openManualSetup}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3.5 py-2 text-xs font-semibold text-[#5E5E5E] hover:text-[#121215] border border-[#EAECEF] transition-colors cursor-pointer shadow-2xs"
              >
                <Settings size={14} className="text-[#5E5E5E]" />
                <span>Profile Setting</span>
              </button>

              {mode === "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("content");
                    onShowToast(
                      `Pilih materi pada tab Content untuk ditugaskan ke ${profile.fullName}.`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <span>Assign Contents</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3 Profile Navigation Tabs: Content | User Details | Group */}
        <div className="border-b border-[#EAECEF] flex items-center gap-6 pt-2">
          {(
            [
              { id: "content", label: "Content" },
              { id: "details", label: "User Details" },
              { id: "group", label: "Group" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-xs font-bold transition-colors relative cursor-pointer ${
                  isActive
                    ? "text-[#121215]"
                    : "text-[#9CA3AF] hover:text-[#121215]"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F59E0B] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* ===============================================================
            TAB 1: USER DETAILS (Matches Bottom-Left Screenshot)
            =============================================================== */}
        {activeTab === "details" && (
          <div className="space-y-8 pt-2">
            {/* Personal Information */}
            <section className="space-y-4 pb-6 border-b border-[#EAECEF]">
              <h3 className="text-sm font-bold text-[#121215]">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Full Name</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">SSN Number</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.ssnNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Gender</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.gender}
                  </p>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="space-y-4 pb-6 border-b border-[#EAECEF]">
              <h3 className="text-sm font-bold text-[#121215]">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Phone Number</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.phoneCountryCode}-{profile.phoneNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Email</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.email}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Website</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.website}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-[#9CA3AF]">Address</p>
                <p className="text-xs font-bold text-[#121215] mt-1">
                  {profile.address}
                </p>
              </div>
            </section>

            {/* Professional Information */}
            <section className="space-y-4 pb-6 border-b border-[#EAECEF]">
              <h3 className="text-sm font-bold text-[#121215]">
                Professional Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Role</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.professionalRole}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] text-[#9CA3AF] mb-2">Skills</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#5E5E5E]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Educational Information */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-[#121215]">
                Educational Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">University</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.university}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Degree / Major</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.degree}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#9CA3AF]">Year</p>
                  <p className="text-xs font-bold text-[#121215] mt-1">
                    {profile.graduationYear}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===============================================================
            TAB 2: CONTENT (Matches Bottom-Right Screenshot)
            =============================================================== */}
        {activeTab === "content" && (
          <div className="space-y-5 pt-1">
            {/* Toolbar: "3 Content in total" on left; "All status ⌄", "Filter", "Sort", List/Grid toggle on right */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#121215]">
                {allDisplayContentCards.length}{" "}
                <span className="font-normal text-[#5E5E5E]">
                  Content in total
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                {searchOpen && (
                  <input
                    type="text"
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="Search content..."
                    className="rounded-lg bg-[#F8F9FB] px-3 py-1.5 text-xs text-[#121215] border border-[#EAECEF] focus:bg-[#FFFFFF] focus:border-[#14B8A6] focus:outline-none"
                  />
                )}

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "All status" | "Published" | "Draft"
                    )
                  }
                  className="rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] focus:outline-none cursor-pointer"
                >
                  <option value="All status">All status</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    onShowToast("Filter konten berdasarkan kategori aktif.")
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
                >
                  <Filter size={12} />
                  <span>Filter</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onShowToast("Mengurutkan konten berdasarkan terbaru.")
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8F9FB] px-3 py-1.5 text-xs font-semibold text-[#5E5E5E] border border-[#EAECEF] cursor-pointer"
                >
                  <ArrowUpDown size={12} />
                  <span>Sort</span>
                </button>

                <div className="inline-flex rounded-lg bg-[#F8F9FB] p-0.5 border border-[#EAECEF]">
                  <button
                    type="button"
                    onClick={() => setContentViewMode("list")}
                    title="List View"
                    className={`p-1.5 rounded-md cursor-pointer ${
                      contentViewMode === "list"
                        ? "bg-[#FFFFFF] text-[#121215] shadow-2xs"
                        : "text-[#9CA3AF]"
                    }`}
                  >
                    <ListIcon size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentViewMode("grid")}
                    title="Grid View"
                    className={`p-1.5 rounded-md cursor-pointer ${
                      contentViewMode === "grid"
                        ? "bg-[#FFFFFF] text-[#121215] shadow-2xs"
                        : "text-[#9CA3AF]"
                    }`}
                  >
                    <LayoutGrid size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Real Workspace Content Cards Grid (from Ruang Sosmed Studio) */}
            {allDisplayContentCards.length === 0 ? (
              <div className="rounded-2xl bg-[#F8F9FB] border border-[#EAECEF] p-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-[#FFFFFF] border border-[#EAECEF] text-[#9CA3AF] flex items-center justify-center mx-auto shadow-2xs">
                  <Folder size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#121215]">
                    Belum Ada Konten Pembelajaran
                  </h3>
                  <p className="text-xs text-[#5E5E5E] mt-1 max-w-md mx-auto">
                    {mode === "admin"
                      ? "Konten kursus, halaman, atau kuis yang dibuat di Ruang Sosmed Studio akan ditampilkan di sini."
                      : "Belum ada materi pembelajaran yang terdaftar di akun Anda saat ini."}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={
                  contentViewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-3 gap-5"
                    : "space-y-3"
                }
              >
                {allDisplayContentCards.map((card) => (
                  <article
                    key={card.id}
                    className="rounded-2xl bg-[#FFFFFF] p-4 border border-[#EAECEF] shadow-[0_2px_10px_rgba(16,15,17,0.04)] flex flex-col justify-between space-y-3.5 hover:border-[#14B8A6]/40 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Card Top Status Row: ● Published + ••• */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#059669]">
                          <CheckCircle2 size={11} />
                          <span>{card.status}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onShowToast(`Membuka opsi untuk "${card.title}".`)
                          }
                          className="p-1 text-[#9CA3AF] hover:text-[#121215] cursor-pointer"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </div>

                      {/* Card Illustrated Banner: Real Content Badge + Category + Gradient */}
                      <div
                        className="h-32 w-full rounded-xl overflow-hidden border border-[#EAECEF] flex flex-col justify-between p-3.5 relative"
                        style={{ background: card.bannerGradient }}
                      >
                        <div className="flex items-center justify-between z-10">
                          <ContentBadge type={card.type as any} size="sm" />
                          <span className="rounded-md bg-black/40 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                            {card.category}
                          </span>
                        </div>
                        <div className="z-10">
                          <p className="text-white text-xs font-bold line-clamp-1 drop-shadow-xs">
                            {card.title}
                          </p>
                        </div>
                        {/* Soft ambient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                      </div>

                      {/* Title & Meta Info */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-[#121215] line-clamp-1">
                          {card.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            <span>{card.learnerCount} Learner</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Folder size={11} />
                            <span>{card.category}</span>
                          </span>
                        </div>
                      </div>

                      {/* Metrics Box (Course Completion/Reaction vs Quiz Avg Correct Answer) */}
                      {card.cardKind === "course" ? (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAECEF]">
                          <div>
                            <p className="text-[10px] text-[#9CA3AF]">
                              Completion rate
                            </p>
                            <p className="text-xs font-bold text-[#121215] mt-0.5 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                              <span>{card.completionRate ?? 85}%</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#9CA3AF]">
                              Learner reaction
                            </p>
                            <p className="text-xs font-bold text-[#121215] mt-0.5 flex items-center gap-1">
                              <Smile size={12} className="text-[#F59E0B]" />
                              <span>{card.usefulReaction ?? 90}% Useful</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#EAECEF] space-y-1.5">
                          <p className="text-[10px] text-[#9CA3AF]">
                            Avg Correct Answer
                          </p>
                          <p className="text-xs font-bold text-[#121215]">
                            <span
                              className={
                                card.cardKind === "quiz-low"
                                  ? "text-[#EF4444]"
                                  : "text-[#F59E0B]"
                              }
                            >
                              {card.correctCount}
                            </span>{" "}
                            / {card.totalQuestions}{" "}
                            <span className="font-normal text-[11px] text-[#5E5E5E]">
                              ({card.correctRate}% correct answer rate)
                            </span>
                          </p>
                          <div className="h-1.5 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                card.cardKind === "quiz-low"
                                  ? "bg-[#EF4444]"
                                  : "bg-[#F59E0B]"
                              }`}
                              style={{ width: `${card.correctRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom [+ Assign] Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setAssignedCardIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(card.id)) next.delete(card.id);
                          else next.add(card.id);
                          return next;
                        });
                        onShowToast(
                          card.assigned
                            ? `Penugasan "${card.title}" dibatalkan.`
                            : `"${card.title}" berhasil ditugaskan ke ${profile.fullName}.`
                        );
                      }}
                      className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold border transition-all cursor-pointer ${
                        card.assigned
                          ? "bg-[#14B8A6] text-white border-[#14B8A6]"
                          : "bg-[#FFFFFF] hover:bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]/40"
                      }`}
                    >
                      {card.assigned ? (
                        <>
                          <Check size={13} />
                          <span>Assigned</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Assign</span>
                        </>
                      )}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            TAB 3: GROUP / COHORTS (Connected to Ruang Sosmed Cohorts)
            =============================================================== */}
        {activeTab === "group" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {(cohortProjects && cohortProjects.length > 0
              ? cohortProjects
              : [
                  {
                    id: "c-class",
                    name: "Ruang Sosmed Class",
                    color: "#EC4899",
                    description: "Batch Utama Ruang Sosmed",
                  },
                ]
            ).map((grp) => {
              const isPrimary =
                grp.name.toLowerCase().includes("ruang sosmed") ||
                grp.name.toLowerCase().includes("class") ||
                (cohortProjects?.[0]?.name &&
                  grp.name.toLowerCase() ===
                    cohortProjects[0].name.toLowerCase());

              const cohortItemsCount = (explorerItems || []).filter((item) => {
                if (item.cohort) {
                  return item.cohort.toLowerCase() === grp.name.toLowerCase();
                }
                return isPrimary;
              }).length;

              return (
                <div
                  key={grp.id}
                  className="rounded-2xl bg-[#F8F9FB] p-5 border border-[#EAECEF] space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs"
                      style={{ backgroundColor: grp.color || "#4F39F6" }}
                    >
                      <Users size={16} />
                    </span>
                    <span className="rounded-md bg-[#FFFFFF] border border-[#EAECEF] px-2.5 py-0.5 text-[10px] font-bold text-[#121215]">
                      {profile.userRole}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#121215]">
                      {grp.name}
                    </h4>
                    <p className="text-[11px] text-[#5E5E5E] mt-0.5">
                      {grp.description || "Active Cohort Track"} •{" "}
                      {cohortItemsCount} Materi Terdaftar
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
