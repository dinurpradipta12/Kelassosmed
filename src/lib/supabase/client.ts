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

export const DEFAULT_SITE_URL = "https://ruangsosmedid.com";

function isLocalHostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return true;
  }
}

/**
 * Resolves the canonical public redirect URL for Supabase auth emails
 * (signup confirmation & password recovery), avoiding localhost redirects
 * unless explicitly requested when no public origin exists.
 */
export function getAuthRedirectUrl(path = ""): string {
  const envSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const browserOrigin =
    typeof window !== "undefined" ? (window.location.origin || "").trim() : "";

  let base = DEFAULT_SITE_URL;
  if (/^https?:\/\//i.test(envSiteUrl) && !isLocalHostUrl(envSiteUrl)) {
    base = envSiteUrl;
  } else if (
    /^https?:\/\//i.test(browserOrigin) &&
    !isLocalHostUrl(browserOrigin)
  ) {
    base = browserOrigin;
  }

  const normalizedBase = base.replace(/\/+$/, "");
  if (!path || path === "/") {
    return normalizedBase;
  }
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

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

const PROXIED_SUPABASE_PREFIXES = [
  "/auth/v1/",
  "/rest/v1/",
  "/storage/v1/",
  "/functions/v1/",
] as const;

const SB_PROXY_SESSION_KEY = "rs_use_sb_proxy_v1";

let preferSameOriginProxy = false;
if (typeof window !== "undefined") {
  try {
    preferSameOriginProxy =
      window.sessionStorage.getItem(SB_PROXY_SESSION_KEY) === "1";
  } catch {}
}

/**
 * Resilient browser `fetch` wrapper for Supabase calls:
 * - Never intercepts SSR / Node server requests (`typeof window === "undefined"`).
 * - Tries direct request to SUPABASE_URL first (with a 4.5s timeout on non-storage calls).
 * - On network/carrier/timeout failure, transparently retries via same-origin `/api/sb/...`
 *   and pins proxy mode in sessionStorage for the rest of the tab session.
 */
function createResilientSupabaseFetch(): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    if (typeof window === "undefined") {
      return nativeFetch(input, init);
    }

    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const baseUrl = SUPABASE_URL.replace(/\/+$/, "");
    if (!rawUrl.startsWith(`${baseUrl}/`)) {
      return nativeFetch(input, init);
    }

    const relativePathAndQuery = rawUrl.slice(baseUrl.length);
    const pathnameOnly = relativePathAndQuery.split("?")[0];
    const shouldProxyPrefix = PROXIED_SUPABASE_PREFIXES.some(
      (prefix) =>
        relativePathAndQuery.startsWith(prefix) ||
        pathnameOnly === prefix.slice(0, -1)
    );
    if (!shouldProxyPrefix) {
      return nativeFetch(input, init);
    }

    const proxyUrl = `${window.location.origin}/api/sb${relativePathAndQuery}`;
    const proxyRequestClone = input instanceof Request ? input.clone() : null;

    const fetchViaProxy = async (): Promise<Response> => {
      if (input instanceof Request) {
        const headers = new Headers(input.headers);
        if (init?.headers) {
          new Headers(init.headers).forEach((value, key) =>
            headers.set(key, value)
          );
        }
        const method = (init?.method || input.method || "GET").toUpperCase();
        const hasBody = method !== "GET" && method !== "HEAD";
        const body =
          init?.body !== undefined
            ? init.body
            : hasBody && proxyRequestClone
            ? await proxyRequestClone.arrayBuffer()
            : undefined;
        return nativeFetch(proxyUrl, {
          ...init,
          method,
          headers,
          body,
          signal: init?.signal,
        });
      }
      return nativeFetch(proxyUrl, init);
    };

    if (preferSameOriginProxy) {
      return fetchViaProxy();
    }

    const isStorageRequest = relativePathAndQuery.startsWith("/storage/v1/");
    let timeoutController: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!isStorageRequest && !init?.signal) {
      timeoutController = new AbortController();
      timeoutId = setTimeout(() => {
        timeoutController?.abort();
      }, 4500);
    }

    try {
      const directInit: RequestInit | undefined = timeoutController
        ? { ...init, signal: timeoutController.signal }
        : init;
      return await nativeFetch(input, directInit);
    } catch (err) {
      if (init?.signal?.aborted) {
        throw err;
      }
      preferSameOriginProxy = true;
      try {
        window.sessionStorage.setItem(SB_PROXY_SESSION_KEY, "1");
      } catch {}
      return await fetchViaProxy();
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  };
}

const resilientSupabaseFetch = createResilientSupabaseFetch();

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
      global: {
        fetch: resilientSupabaseFetch,
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
      global: {
        fetch: resilientSupabaseFetch,
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
      emailRedirectTo: getAuthRedirectUrl(),
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
      cacheControl: "31536000",
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
