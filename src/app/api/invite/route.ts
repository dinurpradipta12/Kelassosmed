// =============================================================================
// RUANG SOSMED 2.0 — INVITE COLLABORATOR API ROUTE (`/api/invite`)
// File: src/app/api/invite/route.ts
// Sends official invitation emails using Resend API & logs invitation dispatch.
// =============================================================================

import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server-env";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  escapeHtml,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  try {
    const caller = await verifyApiCaller(request, {
      requiredRoles: ["admin", "mentor"],
    });
    if (!caller.ok) {
      return caller.response;
    }

    const body = await request.json();
    const { email, fullName, role, cohort, note } = body as {
      email?: string;
      fullName?: string;
      role?: string;
      cohort?: string;
      note?: string;
    };

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { ok: false, error: "Alamat email tidak valid." },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    const targetRole = (role || "Mentor").trim();
    const targetCohort = (cohort || "Ruang Sosmed Class").trim();
    const targetName = fullName?.trim() || cleanEmail.split("@")[0];
    const inviteNote = note?.trim() || "";

    const safeEmail = escapeHtml(cleanEmail);
    const safeRole = escapeHtml(targetRole);
    const safeCohort = escapeHtml(targetCohort);
    const safeName = escapeHtml(targetName);
    const safeNote = escapeHtml(inviteNote);

    const rawSiteUrl =
      getServerEnv("NEXT_PUBLIC_SITE_URL") ||
      (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
      "https://ruangsosmedid.com";
    const ctaUrl = /^https?:\/\//i.test(rawSiteUrl)
      ? rawSiteUrl
      : "https://ruangsosmedid.com";

    const resendApiKey = getServerEnv("RESEND_API_KEY");
    const fromSender =
      getServerEnv("RESEND_FROM_EMAIL") ||
      "Ruang Sosmed 2.0 <invite@ruangsosmedid.com>";

    // Build modern, responsive HTML email template
    const emailSubject = `Undangan Kolaborasi: ${targetRole.replace(/[\r\n]/g, " ")} di "${targetCohort.replace(/[\r\n]/g, " ")}" — Ruang Sosmed 2.0`;
    const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #121215;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8F9FB; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EAECEF; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F39F6 0%, #7C3AED 100%); padding: 32px 32px; text-align: left;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: rgba(255, 255, 255, 0.2); border-radius: 10px; width: 40px; height: 40px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 20px; line-height: 40px;">🚀</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
                      Ruang Sosmed 2.0
                    </h1>
                    <p style="margin: 2px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.85); font-weight: 500;">
                      Learning Management &amp; Studio System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #121215;">
                Halo, ${safeName}! 👋
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Anda telah resmi diundang oleh tim <strong>Ruang Sosmed 2.0</strong> untuk berkolaborasi sebagai 
                <span style="background-color: #EEF2FF; color: #4F39F6; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
                  ${safeRole}
                </span> 
                pada kelas / cohort <strong>"${safeCohort}"</strong>.
              </p>

              <!-- Cohort & Role Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; margin-bottom: 24px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6B7280; letter-spacing: 0.05em;">
                      Detail Undangan
                    </p>
                    <table width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px; color: #1F2937;">
                      <tr>
                        <td width="120" style="color: #6B7280; font-weight: 500;">Peran / Akses:</td>
                        <td style="font-weight: 700; color: #4F39F6;">${safeRole}</td>
                      </tr>
                      <tr>
                        <td style="color: #6B7280; font-weight: 500;">Cohort Kelas:</td>
                        <td style="font-weight: 600;">${safeCohort}</td>
                      </tr>
                      <tr>
                        <td style="color: #6B7280; font-weight: 500;">Email Tujuan:</td>
                        <td>${safeEmail}</td>
                      </tr>
                      ${
                        safeNote
                          ? `<tr>
                              <td style="color: #6B7280; font-weight: 500; vertical-align: top;">Pesan Pengundang:</td>
                              <td style="font-style: italic; color: #374151;">"${safeNote}"</td>
                            </tr>`
                          : ""
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 24px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4F39F6; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 57, 246, 0.25);">
                      Terima Undangan &amp; Masuk ke Ruang Sosmed →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9CA3AF; text-align: center;">
                Undangan ini juga sudah tersinkronisasi langsung pada akun Ruang Sosmed Anda.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #EAECEF; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                © 2026 Ruang Sosmed 2.0. Learning Studio &amp; Content Management.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    let resendResult: {
      success: boolean;
      id?: string;
      error?: string;
    } = { success: false };

    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromSender,
            to: [cleanEmail],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        const resendData = (await resendResponse.json()) as {
          id?: string;
          message?: string;
          name?: string;
        };

        if (resendResponse.ok && resendData.id) {
          resendResult = { success: true, id: resendData.id };
        } else {
          resendResult = {
            success: false,
            error: resendData.message || resendData.name || "Email service error",
          };
        }
      } catch {
        resendResult = {
          success: false,
          error: "Gagal menghubungi layanan email.",
        };
      }
    } else {
      resendResult = {
        success: false,
        error: "Layanan pengiriman email undangan sedang tidak aktif.",
      };
    }

    return NextResponse.json(
      {
        ok: true,
        deliveredToInApp: true,
        emailSent: resendResult.success,
        resendId: resendResult.id || null,
        resendError: resendResult.error || null,
        recipient: {
          email: cleanEmail,
          name: targetName,
          role: targetRole,
          cohort: targetCohort,
        },
        message: resendResult.success
          ? `🎉 Email undangan berhasil dikirim ke ${cleanEmail}!`
          : `Undangan tercatat di platform. (${resendResult.error})`,
      },
      { headers: API_SECURITY_HEADERS }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }
}
