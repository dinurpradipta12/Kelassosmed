// =============================================================================
// RUANG SOSMED 2.0 LMS — SUPABASE CLIENT, AUTH & STORAGE BUCKET HELPERS
// File: src/lib/supabase/client.ts
// =============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow, UserRole } from "@/lib/supabase/database.types";

const DEFAULT_SUPABASE_URL = "https://nigxfryaobokkvfefond.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZ3hmcnlhb2Jva2t2ZmVmb25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzI0MTMsImV4cCI6MjEwODY0ODQxM30.LWRL-PIPRgYUcY5l-emqI9TtG0HGQ2-T79PX-JMx-XU";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

/**
 * Indicates whether live Supabase credentials are configured in the environment.
 * Supports both Next.js (`NEXT_PUBLIC_SUPABASE_*`) and rs-learning-26 (`VITE_SUPABASE_*`).
 */
export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("your-project-ref") &&
    !SUPABASE_ANON_KEY.includes("placeholder")
);

const globalForSupabase = globalThis as unknown as {
  __ruangSosmedSupabase?: SupabaseClient;
  __ruangSosmedSupabasePublic?: SupabaseClient;
};

export const supabase: SupabaseClient =
  globalForSupabase.__ruangSosmedSupabase ??
  (globalForSupabase.__ruangSosmedSupabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  ));

/**
 * Admin Supabase client (persists authenticated admin session).
 */
export const supabaseAdmin: SupabaseClient = supabase;

/**
 * Public Supabase client (no session persistence, strictly respects public RLS).
 */
export const supabasePublic: SupabaseClient =
  globalForSupabase.__ruangSosmedSupabasePublic ??
  (globalForSupabase.__ruangSosmedSupabasePublic = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "sb-ruang-sosmed-public-anon",
      },
    }
  ));

// -----------------------------------------------------------------------------
// Storage Bucket Constants (Matches 001_ruang_sosmed_schema.sql & 002_rs_learning_26_integration.sql)
// -----------------------------------------------------------------------------

export const STORAGE_BUCKETS = {
  MEDIA: "ruang-sosmed-media",
  ATTACHMENTS: "ruang-sosmed-attachments",
  AVATARS: "ruang-sosmed-avatars",
  LESSON_ASSETS: "lesson-assets", // Ported from rs-learning-26
  PROFILE_AVATARS: "profile-avatars", // Ported from rs-learning-26
} as const;

export type StorageBucketName =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// -----------------------------------------------------------------------------
// Supabase Authentication Helpers
// -----------------------------------------------------------------------------

export async function signInWithEmailPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithRole(payload: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  jobTitle?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        role: payload.role,
        job_title: payload.jobTitle ?? "Social Media Specialist",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentAuthProfile(): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as ProfileRow;
}

// -----------------------------------------------------------------------------
// Supabase Storage Upload & Public URL Helpers
// -----------------------------------------------------------------------------

export async function uploadFileToRuangSosmedStorage(params: {
  bucket: StorageBucketName;
  folderPath: string;
  file: File;
  upsert?: boolean;
}): Promise<{ path: string; publicUrl: string }> {
  const sanitizedName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${params.folderPath}/${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(params.bucket)
    .upload(filePath, params.file, {
      cacheControl: "3600",
      upsert: params.upsert ?? false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(params.bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl,
  };
}

/**
 * Upload course video, thumbnail banner, or quiz hotspot diagram image
 */
export async function uploadCourseOrQuizMedia(
  contentId: string,
  file: File
): Promise<string> {
  const res = await uploadFileToRuangSosmedStorage({
    bucket: STORAGE_BUCKETS.MEDIA,
    folderPath: `contents/${contentId}`,
    file,
  });
  return res.publicUrl;
}

/**
 * Upload downloadable PDF/Notion/ZIP template or learner assignment file
 */
export async function uploadAttachmentTemplate(
  ownerFolderId: string,
  file: File
): Promise<string> {
  const res = await uploadFileToRuangSosmedStorage({
    bucket: STORAGE_BUCKETS.ATTACHMENTS,
    folderPath: ownerFolderId,
    file,
  });
  return res.publicUrl;
}

/**
 * Upload user avatar image and update `profiles.avatar_url`
 */
export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<string> {
  const res = await uploadFileToRuangSosmedStorage({
    bucket: STORAGE_BUCKETS.AVATARS,
    folderPath: userId,
    file,
    upsert: true,
  });

  await supabase
    .from("profiles")
    .update({ avatar_url: res.publicUrl })
    .eq("id", userId);

  return res.publicUrl;
}
