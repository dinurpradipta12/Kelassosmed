// =============================================================================
// RUANG SOSMED 2.0 LMS — LEARNER REDEEM KODE AKSES PREMIUM (`/api/pro-vouchers/redeem`)
// File: src/app/api/pro-vouchers/redeem/route.ts
// =============================================================================

import { NextResponse } from "next/server";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function isMissingVoucherInfraError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42883" ||
    code === "42P01" ||
    code === "PGRST202" ||
    msg.includes("redeem_pro_voucher_code") ||
    msg.includes("pro_voucher_codes")
  );
}

function isDuplicateRedemptionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "23505" ||
    msg.includes("duplicate key") ||
    msg.includes("unique constraint") ||
    msg.includes("pro_voucher_redemptions")
  );
}

function isMissingSchemaColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

export async function POST(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const caller = await verifyApiCaller(request);
  if (!caller.ok) return caller.response;

  try {
    const body = (await request.json()) as { code?: string };
    const cleanCode = String(body.code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");

    if (!cleanCode) {
      return NextResponse.json(
        { ok: false, error: "Masukkan kode akses premium terlebih dahulu." },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    const { data, error } = await caller.supabase.rpc(
      "redeem_pro_voucher_code",
      { p_code: cleanCode }
    );

    if (error) {
      if (isMissingVoucherInfraError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Sistem kode akses premium belum aktif di database. Hubungi Admin untuk menjalankan migration SQL.",
          },
          { status: 503, headers: API_SECURITY_HEADERS }
        );
      }
      if (isMissingSchemaColumnError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Skema kolom database belum diperbarui. Hubungi Admin untuk menjalankan migration SQL 029_fix_voucher_redeem_and_once_per_user.sql.",
          },
          { status: 503, headers: API_SECURITY_HEADERS }
        );
      }
      if (isDuplicateRedemptionError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Kode akses premium ini hanya bisa digunakan 1× per akun. Anda sudah pernah menukarkannya sebelumnya.",
          },
          { status: 409, headers: API_SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    const resObj = (data && typeof data === "object" ? data : {}) as {
      ok?: boolean;
      error?: string;
      code?: string;
      duration_value?: number;
      duration_unit?: "days" | "months";
      granted_days?: number;
      extended?: boolean;
      package_id?: string;
      package_name?: string;
      billing_cycle?: string;
      pro_started_at?: string;
      pro_expires_at?: string;
      due_date?: string;
    };

    if (!resObj.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            resObj.error || "Kode akses premium tidak valid atau sudah habis.",
        },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        redemption: {
          code: resObj.code || cleanCode,
          durationValue: Number(resObj.duration_value || 1),
          durationUnit: resObj.duration_unit === "months" ? "months" : "days",
          grantedDays: Number(resObj.granted_days || 1),
          extended: Boolean(resObj.extended),
          packageId: resObj.package_id || "pkg-pro",
          packageName: resObj.package_name || "Creator Academy Plan",
          billingCycle: resObj.billing_cycle || "30d_voucher",
          startedAt: resObj.pro_started_at || null,
          expiresAt: resObj.pro_expires_at || null,
          dueDate: resObj.due_date || null,
        },
      },
      { headers: API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memproses kode akses premium.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400, headers: API_SECURITY_HEADERS }
    );
  }
}
