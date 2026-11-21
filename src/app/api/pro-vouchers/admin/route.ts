// =============================================================================
// RUANG SOSMED 2.0 LMS — ADMIN API: KODE AKSES PREMIUM BERJANGKA WAKTU
// File: src/app/api/pro-vouchers/admin/route.ts
// CRUD Admin-only untuk membuat/mengatur kode akses PRO berdurasi hari / bulan.
// =============================================================================

import { NextResponse } from "next/server";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";
import { createTelegramServiceClient } from "@/lib/telegram/server";

export const dynamic = "force-dynamic";

type DurationUnit = "days" | "months";

function isMissingVoucherTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("pro_voucher_codes") ||
    msg.includes("pro_voucher_redemptions")
  );
}

function normalizeVoucherCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-");
}

function parseValidUntilIso(raw?: string | null): string | null {
  const val = String(raw || "").trim();
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return `${val}T23:59:59+07:00`;
  }
  const ts = Date.parse(val);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
}

export async function GET(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const caller = await verifyApiCaller(request, { requiredRoles: ["admin"] });
  if (!caller.ok) return caller.response;

  const db = createTelegramServiceClient() || caller.supabase;

  const [codesRes, redemptionsRes] = await Promise.all([
    db
      .from("pro_voucher_codes")
      .select(
        "id, code, label, duration_value, duration_unit, package_id, package_name, max_uses, used_count, is_active, valid_until, created_at, updated_at"
      )
      .order("created_at", { ascending: false }),
    db
      .from("pro_voucher_redemptions")
      .select(
        "id, voucher_id, code, user_email, user_name, duration_value, duration_unit, granted_days, package_id, package_name, previous_expires_at, new_expires_at, redeemed_at"
      )
      .order("redeemed_at", { ascending: false })
      .limit(30),
  ]);

  if (
    isMissingVoucherTableError(codesRes.error) ||
    isMissingVoucherTableError(redemptionsRes.error)
  ) {
    return NextResponse.json(
      { ok: true, tableReady: false, codes: [], redemptions: [] },
      { headers: API_SECURITY_HEADERS }
    );
  }

  if (codesRes.error) {
    return NextResponse.json(
      { ok: false, error: codesRes.error.message },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      tableReady: true,
      codes: codesRes.data || [],
      redemptions: redemptionsRes.data || [],
    },
    { headers: API_SECURITY_HEADERS }
  );
}

export async function POST(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const caller = await verifyApiCaller(request, { requiredRoles: ["admin"] });
  if (!caller.ok) return caller.response;

  try {
    const body = (await request.json()) as {
      action?: "create" | "update" | "toggle" | "delete";
      id?: string;
      code?: string;
      label?: string | null;
      durationValue?: number;
      durationUnit?: DurationUnit;
      packageId?: string;
      packageName?: string;
      maxUses?: number | null;
      isActive?: boolean;
      validUntil?: string | null;
    };

    const action = body.action || "create";
    const db = createTelegramServiceClient() || caller.supabase;

    if (action === "toggle") {
      if (!body.id) {
        return NextResponse.json(
          { ok: false, error: "ID kode wajib diisi." },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      const { data, error } = await db
        .from("pro_voucher_codes")
        .update({
          is_active: Boolean(body.isActive),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .select(
          "id, code, label, duration_value, duration_unit, package_id, package_name, max_uses, used_count, is_active, valid_until, created_at, updated_at"
        )
        .single();

      if (isMissingVoucherTableError(error)) {
        return NextResponse.json(
          {
            ok: false,
            tableReady: false,
            error:
              "Tabel pro_voucher_codes belum dibuat di Supabase. Jalankan migration 021 terlebih dahulu.",
          },
          { status: 503, headers: API_SECURITY_HEADERS }
        );
      }
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, tableReady: true, item: data },
        { headers: API_SECURITY_HEADERS }
      );
    }

    if (action === "delete") {
      if (!body.id) {
        return NextResponse.json(
          { ok: false, error: "ID kode wajib diisi." },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      const { error } = await db
        .from("pro_voucher_codes")
        .delete()
        .eq("id", body.id);

      if (isMissingVoucherTableError(error)) {
        return NextResponse.json(
          {
            ok: false,
            tableReady: false,
            error:
              "Tabel pro_voucher_codes belum dibuat di Supabase. Jalankan migration 021 terlebih dahulu.",
          },
          { status: 503, headers: API_SECURITY_HEADERS }
        );
      }
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, tableReady: true, deletedId: body.id },
        { headers: API_SECURITY_HEADERS }
      );
    }

    const normalizedCode = normalizeVoucherCode(body.code || "");
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalizedCode)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kode harus terdiri dari 3–40 karakter huruf, angka, tanda hubung (-), atau garis bawah (_).",
        },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    const durationValue = Math.trunc(Number(body.durationValue));
    if (!Number.isFinite(durationValue) || durationValue < 1 || durationValue > 3650) {
      return NextResponse.json(
        { ok: false, error: "Durasi harus antara 1 sampai 3650." },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    const durationUnit: DurationUnit =
      body.durationUnit === "months" ? "months" : "days";

    let maxUses: number | null = null;
    if (body.maxUses !== null && body.maxUses !== undefined && String(body.maxUses) !== "") {
      const parsedMax = Math.trunc(Number(body.maxUses));
      if (!Number.isFinite(parsedMax) || parsedMax < 1) {
        return NextResponse.json(
          {
            ok: false,
            error: "Batas kuota pemakaian minimal 1 (atau kosongkan untuk Unlimited).",
          },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      maxUses = parsedMax;
    }

    const validUntilIso = parseValidUntilIso(body.validUntil);
    const packageId = String(body.packageId || "pkg-pro").trim() || "pkg-pro";
    const packageName =
      String(body.packageName || "Creator Academy Plan").trim() ||
      "Creator Academy Plan";
    const label = body.label ? String(body.label).trim() : null;

    if (action === "update") {
      if (!body.id) {
        return NextResponse.json(
          { ok: false, error: "ID kode wajib diisi saat memperbarui." },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      const { data, error } = await db
        .from("pro_voucher_codes")
        .update({
          code: normalizedCode,
          label,
          duration_value: durationValue,
          duration_unit: durationUnit,
          package_id: packageId,
          package_name: packageName,
          max_uses: maxUses,
          is_active: body.isActive ?? true,
          valid_until: validUntilIso,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .select(
          "id, code, label, duration_value, duration_unit, package_id, package_name, max_uses, used_count, is_active, valid_until, created_at, updated_at"
        )
        .single();

      if (isMissingVoucherTableError(error)) {
        return NextResponse.json(
          {
            ok: false,
            tableReady: false,
            error:
              "Tabel pro_voucher_codes belum dibuat di Supabase. Jalankan migration 021 terlebih dahulu.",
          },
          { status: 503, headers: API_SECURITY_HEADERS }
        );
      }
      if (error) {
        const isDuplicate =
          error.code === "23505" ||
          error.message.toLowerCase().includes("duplicate");
        return NextResponse.json(
          {
            ok: false,
            error: isDuplicate
              ? "Kode tersebut sudah ada. Gunakan kode lain."
              : error.message,
          },
          { status: isDuplicate ? 409 : 400, headers: API_SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, tableReady: true, item: data },
        { headers: API_SECURITY_HEADERS }
      );
    }

    const { data, error } = await db
      .from("pro_voucher_codes")
      .insert({
        code: normalizedCode,
        label,
        duration_value: durationValue,
        duration_unit: durationUnit,
        package_id: packageId,
        package_name: packageName,
        max_uses: maxUses,
        is_active: body.isActive ?? true,
        valid_until: validUntilIso,
        created_by: caller.user.id,
      })
      .select(
        "id, code, label, duration_value, duration_unit, package_id, package_name, max_uses, used_count, is_active, valid_until, created_at, updated_at"
      )
      .single();

    if (isMissingVoucherTableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          tableReady: false,
          error:
            "Tabel pro_voucher_codes belum dibuat di Supabase. Jalankan migration 021 terlebih dahulu.",
        },
        { status: 503, headers: API_SECURITY_HEADERS }
      );
    }
    if (error) {
      const isDuplicate =
        error.code === "23505" ||
        error.message.toLowerCase().includes("duplicate");
      return NextResponse.json(
        {
          ok: false,
          error: isDuplicate
            ? "Kode tersebut sudah ada. Gunakan kode lain."
            : error.message,
        },
        { status: isDuplicate ? 409 : 400, headers: API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, tableReady: true, item: data },
      { headers: API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Permintaan tidak valid.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400, headers: API_SECURITY_HEADERS }
    );
  }
}
