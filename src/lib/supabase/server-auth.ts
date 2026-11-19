import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/database.types";

export const API_SECURITY_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Vary": "Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site",
  "X-Content-Type-Options": "nosniff",
};

function resolveSupabaseCredentials(): { url: string; anonKey: string } {
  const clientAny = supabasePublic as unknown as {
    supabaseUrl?: string;
    supabaseKey?: string;
  };
  const url =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() ||
    (clientAny.supabaseUrl || "").trim();
  const anonKey =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim() ||
    (clientAny.supabaseKey || "").trim();

  return { url, anonKey };
}

/**
 * Validasi Fetch Metadata & Origin sebelum pemeriksaan autentikasi/otorisasi
 * agar endpoint API tidak rentan terhadap CSRF maupun timing leak lintas origin.
 */
export function checkFetchMetadata(request: Request): NextResponse | null {
  const secFetchSite = (request.headers.get("sec-fetch-site") || "")
    .trim()
    .toLowerCase();

  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "same-site" &&
    secFetchSite !== "none"
  ) {
    return NextResponse.json(
      { error: "Cross-site API request rejected." },
      { status: 403, headers: API_SECURITY_HEADERS }
    );
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = (request.headers.get("origin") || "").trim();
    const host = (
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      ""
    )
      .trim()
      .toLowerCase();

    if (origin && host) {
      try {
        const originHost = new URL(origin).host.toLowerCase();
        if (originHost !== host) {
          return NextResponse.json(
            { error: "Origin mismatch rejected." },
            { status: 403, headers: API_SECURITY_HEADERS }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403, headers: API_SECURITY_HEADERS }
        );
      }
    }
  }

  return null;
}

export type VerifiedCallerSuccess = {
  ok: true;
  user: User;
  role: UserRole;
  email: string;
  fullName: string;
  supabase: SupabaseClient;
};

export type VerifiedCallerFailure = {
  ok: false;
  response: NextResponse;
};

/**
 * Verifikasi JWT Supabase Bearer milik pemanggil dan ambil role resmi dari tabel `public.profiles`.
 */
export async function verifyApiCaller(
  request: Request,
  options?: { requiredRoles?: UserRole[] }
): Promise<VerifiedCallerSuccess | VerifiedCallerFailure> {
  const authHeader = (request.headers.get("authorization") || "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  const token = match?.[1]?.trim() || "";

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Autentikasi diperlukan untuk mengakses endpoint ini." },
        { status: 401, headers: API_SECURITY_HEADERS }
      ),
    };
  }

  const { url, anonKey } = resolveSupabaseCredentials();
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Layanan autentikasi belum terkonfigurasi." },
        { status: 503, headers: API_SECURITY_HEADERS }
      ),
    };
  }

  const scopedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userData, error: userErr } = await scopedClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sesi autentikasi tidak valid atau telah berakhir." },
        { status: 401, headers: API_SECURITY_HEADERS }
      ),
    };
  }

  const user = userData.user;
  const { data: profileRow } = await scopedClient
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const rawRole = String(profileRow?.role || "learner").toLowerCase();
  const role: UserRole =
    rawRole === "admin" || rawRole === "mentor" ? rawRole : "learner";

  if (options?.requiredRoles && !options.requiredRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki izin yang diperlukan." },
        { status: 403, headers: API_SECURITY_HEADERS }
      ),
    };
  }

  return {
    ok: true,
    user,
    role,
    email: String(profileRow?.email || user.email || ""),
    fullName: String(
      profileRow?.full_name ||
        user.user_metadata?.full_name ||
        (user.email ? user.email.split("@")[0] : "Pengguna")
    ),
    supabase: scopedClient,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
