// =============================================================================
// RUANG SOSMED 2.0 LMS — ADMIN API: HAPUS AKUN SISWA PERMANEN
// File: src/app/api/admin/learners/delete/route.ts
// Menghapus user secara permanen di Supabase Auth (`auth.users`) dan semua tabel DB.
// =============================================================================

import { NextResponse } from "next/server";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";
import { createTelegramServiceClient } from "@/lib/telegram/server";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMissingDeleteRpcError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42883" ||
    code === "PGRST202" ||
    msg.includes("admin_delete_learner_account") ||
    msg.includes("could not find the function")
  );
}

export async function POST(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const caller = await verifyApiCaller(request, { requiredRoles: ["admin"] });
  if (!caller.ok) return caller.response;

  try {
    const body = (await request.json()) as {
      userId?: string;
      email?: string;
      name?: string;
    };

    const rawUserId = String(body.userId || "").trim();
    const cleanEmail = String(body.email || "").trim().toLowerCase();
    const cleanName = String(body.name || "").trim();
    const validUid = UUID_REGEX.test(rawUserId) ? rawUserId : null;

    if (!validUid && !cleanEmail) {
      return NextResponse.json(
        { ok: false, error: "Identitas siswa (ID atau email) diperlukan." },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    // Proteksi server-side: Admin tidak boleh menghapus diri sendiri atau akun Admin/Founder
    if (
      (validUid && validUid === caller.user.id) ||
      (cleanEmail && cleanEmail === caller.email.toLowerCase()) ||
      cleanEmail === "admin@ruangsosmed.id" ||
      cleanEmail.includes("dinur")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Akun Admin atau akun Anda sendiri tidak dapat dihapus.",
        },
        { status: 403, headers: API_SECURITY_HEADERS }
      );
    }

    const serviceDb = createTelegramServiceClient();

    // 1. Prioritas utama: jalankan RPC `admin_delete_learner_account` (membersihkan DB + auth.sessions + auth.users)
    const { data: rpcData, error: rpcErr } = await caller.supabase.rpc(
      "admin_delete_learner_account",
      {
        p_user_id: validUid,
        p_email: cleanEmail || null,
        p_name: cleanName || null,
      }
    );

    if (!rpcErr && rpcData) {
      const rpcResult = rpcData as {
        ok?: boolean;
        target_uid?: string | null;
        deleted_auth_user?: boolean;
        deleted_profile?: number;
        deleted_user_profiles?: number;
        cleaned_contents?: number;
      };

      // Bila service role tersedia dan auth user ternyata masih tersisa, pastikan terhapus via Admin API
      if (serviceDb && rpcResult.target_uid && !rpcResult.deleted_auth_user) {
        await serviceDb.auth.admin.deleteUser(rpcResult.target_uid).catch(() => {});
      }

      return NextResponse.json(
        {
          ok: true,
          via: "rpc",
          ...rpcResult,
        },
        { headers: API_SECURITY_HEADERS }
      );
    }

    const rpcErrMsg = String(rpcErr?.message || "");
    if (rpcErrMsg.toLowerCase().includes("forbidden")) {
      return NextResponse.json(
        { ok: false, error: rpcErrMsg },
        { status: 403, headers: API_SECURITY_HEADERS }
      );
    }

    // 2. Fallback via Service Role Admin API apabila migrasi 023 belum dijalankan di SQL Editor
    if (!serviceDb) {
      const status = isMissingDeleteRpcError(rpcErr) ? 503 : 500;
      const hint = isMissingDeleteRpcError(rpcErr)
        ? "Fungsi database `admin_delete_learner_account` belum terpasang. Jalankan migrasi SQL `023_admin_delete_learner.sql` di Supabase SQL Editor (atau pasang SUPABASE_SERVICE_ROLE_KEY)."
        : rpcErrMsg || "Gagal menghapus akun siswa di database.";
      return NextResponse.json(
        { ok: false, error: hint },
        { status, headers: API_SECURITY_HEADERS }
      );
    }

    // Cari target UID + role di profiles / user_profiles / auth.admin
    let resolvedUid: string | null = validUid;
    let resolvedRole = "";

    if (resolvedUid || cleanEmail) {
      const profQuery = resolvedUid
        ? serviceDb
            .from("profiles")
            .select("id, role, email")
            .eq("id", resolvedUid)
            .maybeSingle()
        : serviceDb
            .from("profiles")
            .select("id, role, email")
            .ilike("email", cleanEmail)
            .maybeSingle();

      const { data: profRow } = await profQuery;
      if (profRow) {
        resolvedUid = String(profRow.id || resolvedUid || "") || null;
        resolvedRole = String(profRow.role || "").toLowerCase();
      }
    }

    if (resolvedRole === "admin") {
      return NextResponse.json(
        { ok: false, error: "Akun Admin tidak dapat dihapus melalui menu siswa." },
        { status: 403, headers: API_SECURITY_HEADERS }
      );
    }

    if (!resolvedUid && cleanEmail) {
      try {
        const { data: usersList } = await serviceDb.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const matchedAuth = (usersList?.users || []).find(
          (u) => (u.email || "").trim().toLowerCase() === cleanEmail
        );
        if (matchedAuth?.id) {
          resolvedUid = matchedAuth.id;
        }
      } catch {}
    }

    if (resolvedUid === caller.user.id) {
      return NextResponse.json(
        { ok: false, error: "Tidak dapat menghapus akun Anda sendiri." },
        { status: 403, headers: API_SECURITY_HEADERS }
      );
    }

    // Bersihkan tabel terkait secara berurutan
    if (resolvedUid) {
      await serviceDb.from("pro_voucher_redemptions").delete().eq("user_id", resolvedUid);
      await serviceDb.from("learner_unlocked_items").delete().eq("user_id", resolvedUid);
      await serviceDb.from("pro_upgrade_requests").delete().eq("user_id", resolvedUid);
      await serviceDb.from("enrollments").delete().eq("learner_id", resolvedUid);
      await serviceDb.from("submissions").delete().eq("learner_id", resolvedUid);
      await serviceDb.from("discussions").delete().eq("author_id", resolvedUid);
      await serviceDb.from("content_issues").delete().eq("reporter_id", resolvedUid);
      await serviceDb.from("user_profiles").delete().eq("user_id", resolvedUid);
    }

    if (cleanEmail) {
      await serviceDb.from("pro_voucher_redemptions").delete().ilike("user_email", cleanEmail);
      await serviceDb.from("learner_unlocked_items").delete().ilike("user_email", cleanEmail);
      await serviceDb.from("pro_upgrade_requests").delete().ilike("user_email", cleanEmail);

      const { data: legacyProfiles } = await serviceDb
        .from("user_profiles")
        .select("username")
        .ilike("email", cleanEmail);
      const legacyUsernames = (legacyProfiles || [])
        .map((r) => String(r.username || "").trim())
        .filter(Boolean);

      if (legacyUsernames.length > 0) {
        await serviceDb.from("user_subscriptions").delete().in("username", legacyUsernames);
        await serviceDb.from("user_video_unlocks").delete().in("username", legacyUsernames);
        await serviceDb.from("user_asset_unlocks").delete().in("username", legacyUsernames);
        await serviceDb.from("lesson_progress").delete().in("session_username", legacyUsernames);
        await serviceDb.from("lesson_notes").delete().in("username", legacyUsernames);
      }

      await serviceDb.from("user_profiles").delete().ilike("email", cleanEmail);
      await serviceDb.from("profiles").delete().ilike("email", cleanEmail);
    }

    if (resolvedUid) {
      await serviceDb.from("profiles").delete().eq("id", resolvedUid);
      const { error: authDelErr } = await serviceDb.auth.admin.deleteUser(resolvedUid);
      if (
        authDelErr &&
        !String(authDelErr.message || "").toLowerCase().includes("not found")
      ) {
        return NextResponse.json(
          { ok: false, error: authDelErr.message },
          { status: 500, headers: API_SECURITY_HEADERS }
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        via: "service_role",
        target_uid: resolvedUid,
        email: cleanEmail,
        deleted_auth_user: Boolean(resolvedUid),
      },
      { headers: API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus siswa.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }
}
