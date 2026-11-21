import { NextResponse } from "next/server";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";
import { deletePaymentProofFromStorage } from "@/lib/supabase/proof-cleanup";
import {
  buildPaymentInlineKeyboard,
  buildPaymentNotificationCaption,
  buildResolvedPaymentSummary,
  createTelegramServiceClient,
  editTelegramResolvedMessage,
  escapeTelegramHtml,
  loadTelegramBotConfig,
  sendTelegramMessage,
  sendTelegramPhoto,
  type UpgradeRequestRecord,
} from "@/lib/telegram/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  try {
    const body = (await request.json()) as {
      eventType?:
        | "payment_request"
        | "payment_resolved_web"
        | "user_registered"
        | "content_issue"
        | "quiz_submitted";
      requestId?: string;
      action?: "approve" | "reject";
      proofUrl?: string | null;
      dueLabel?: string;
      userName?: string;
      userEmail?: string;
      folderCode?: string;
      chapterTitle?: string;
      issueDescription?: string;
      quizTitle?: string;
      submissionType?: string;
      scorePct?: number;
    };

    const eventType = body.eventType;
    const serviceClient = createTelegramServiceClient();

    if (eventType === "payment_resolved_web") {
      const caller = await verifyApiCaller(request, { requiredRoles: ["admin"] });
      if (!caller.ok) return caller.response;

      const dbClient = serviceClient || caller.supabase;
      const proofDeletedStorage = await deletePaymentProofFromStorage(
        dbClient,
        body.proofUrl
      );

      let reqRow: UpgradeRequestRecord | null = null;
      if (body.requestId) {
        const { data } = await dbClient
          .from("pro_upgrade_requests")
          .select("*")
          .eq("id", body.requestId)
          .maybeSingle();
        reqRow = (data as UpgradeRequestRecord) || null;
      }

      if (reqRow?.proof_url) {
        await deletePaymentProofFromStorage(dbClient, reqRow.proof_url);
        await dbClient
          .from("pro_upgrade_requests")
          .update({
            proof_url: null,
            proof_deleted_at: new Date().toISOString(),
          })
          .eq("id", reqRow.id);
      }

      const config = await loadTelegramBotConfig(dbClient);
      if (
        config.enabled &&
        config.botToken &&
        reqRow?.telegram_chat_id &&
        reqRow?.telegram_message_id
      ) {
        const summaryHtml = buildResolvedPaymentSummary({
          req: reqRow,
          action: body.action === "reject" ? "reject" : "approve",
          actorLabel: `Admin Web (${caller.fullName})`,
          dueLabel: body.dueLabel,
          proofDeleted: Boolean(body.proofUrl || reqRow.proof_url || proofDeletedStorage),
        });
        await editTelegramResolvedMessage(
          config.botToken,
          reqRow.telegram_chat_id,
          reqRow.telegram_message_id,
          Boolean(body.proofUrl || reqRow.proof_url),
          summaryHtml
        );
      }

      return NextResponse.json(
        { ok: true, proofDeletedStorage },
        { headers: API_SECURITY_HEADERS }
      );
    }

    if (eventType === "user_registered") {
      const authHeader = (request.headers.get("authorization") || "").trim();
      let cleanEmail = String(body.userEmail || "").trim().toLowerCase();
      let displayName = String(body.userName || "").trim();

      if (authHeader) {
        const caller = await verifyApiCaller(request);
        if (!caller.ok) return caller.response;
        cleanEmail = caller.email.toLowerCase();
        displayName = displayName || caller.fullName;
      } else {
        if (!serviceClient || !cleanEmail) {
          return NextResponse.json(
            { ok: true, skipped: "no_service_role_or_email" },
            { headers: API_SECURITY_HEADERS }
          );
        }
        // Verify recent registration in profiles (within last 15 minutes) to prevent spoofed pings
        const { data: recentProf } = await serviceClient
          .from("profiles")
          .select("id, full_name, email, created_at")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (!recentProf) {
          return NextResponse.json(
            { ok: false, error: "Akun belum ditemukan." },
            { status: 403, headers: API_SECURITY_HEADERS }
          );
        }
        const createdMs = Date.parse(String(recentProf.created_at || ""));
        if (!Number.isNaN(createdMs) && Date.now() - createdMs > 15 * 60 * 1000) {
          return NextResponse.json(
            { ok: true, skipped: "stale_registration" },
            { headers: API_SECURITY_HEADERS }
          );
        }
        displayName = displayName || recentProf.full_name || cleanEmail.split("@")[0];
      }

      const config = await loadTelegramBotConfig(serviceClient);
      if (!config.enabled || !config.notifyNewUsers) {
        return NextResponse.json(
          { ok: true, skipped: "disabled" },
          { headers: API_SECURITY_HEADERS }
        );
      }

      const text = [
        "🎉 <b>MEMBER BARU BERGABUNG</b>",
        "",
        `👤 Nama: <b>${escapeTelegramHtml(displayName || "Learner Baru")}</b>`,
        `📧 Email: <code>${escapeTelegramHtml(cleanEmail)}</code>`,
        body.folderCode
          ? `🔑 Kode Kelas: <code>${escapeTelegramHtml(body.folderCode)}</code>`
          : null,
        "📱 Sumber: Portal Belajar Ruang Sosmed 2.0",
      ]
        .filter(Boolean)
        .join("\n");

      await Promise.all(
        config.adminChatIds.map((chatId) =>
          sendTelegramMessage(config.botToken, chatId, text)
        )
      );

      return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
    }

    // All remaining events require an authenticated caller
    const caller = await verifyApiCaller(request);
    if (!caller.ok) return caller.response;

    const dbClient = serviceClient || caller.supabase;
    const config = await loadTelegramBotConfig(dbClient);
    if (!config.enabled) {
      return NextResponse.json(
        { ok: true, skipped: "telegram_disabled" },
        { headers: API_SECURITY_HEADERS }
      );
    }

    if (eventType === "payment_request") {
      if (!config.notifyPayments) {
        return NextResponse.json(
          { ok: true, skipped: "payment_notifications_disabled" },
          { headers: API_SECURITY_HEADERS }
        );
      }

      let reqRow: UpgradeRequestRecord | null = null;
      if (body.requestId) {
        const { data } = await dbClient
          .from("pro_upgrade_requests")
          .select("*")
          .eq("id", body.requestId)
          .maybeSingle();
        reqRow = (data as UpgradeRequestRecord) || null;
      }

      if (!reqRow) {
        const { data } = await dbClient
          .from("pro_upgrade_requests")
          .select("*")
          .ilike("user_email", caller.email)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        reqRow = (data as UpgradeRequestRecord) || null;
      }

      if (!reqRow) {
        return NextResponse.json(
          { ok: false, error: "Data konfirmasi pembayaran tidak ditemukan." },
          { status: 404, headers: API_SECURITY_HEADERS }
        );
      }

      const caption = buildPaymentNotificationCaption(reqRow);
      const markup = buildPaymentInlineKeyboard(reqRow.id);

      let firstChatId: string | null = null;
      let firstMessageId: number | null = null;

      for (const chatId of config.adminChatIds) {
        const res = reqRow.proof_url
          ? await sendTelegramPhoto(
              config.botToken,
              chatId,
              reqRow.proof_url,
              caption,
              markup
            )
          : await sendTelegramMessage(config.botToken, chatId, caption, markup);

        if (res.ok && res.result?.message_id && !firstMessageId) {
          firstChatId = chatId;
          firstMessageId = res.result.message_id;
        }
      }

      if (firstChatId && firstMessageId && serviceClient) {
        await serviceClient
          .from("pro_upgrade_requests")
          .update({
            telegram_chat_id: firstChatId,
            telegram_message_id: firstMessageId,
          })
          .eq("id", reqRow.id);
      }

      return NextResponse.json(
        { ok: true, sentTo: config.adminChatIds.length },
        { headers: API_SECURITY_HEADERS }
      );
    }

    if (eventType === "content_issue") {
      if (!config.notifyContentIssues) {
        return NextResponse.json(
          { ok: true, skipped: "issue_notifications_disabled" },
          { headers: API_SECURITY_HEADERS }
        );
      }
      const msg = [
        "🛠️ <b>LAPORAN MASALAH MATERI</b>",
        "",
        `👤 Pelapor: <b>${escapeTelegramHtml(caller.fullName)}</b> (<code>${escapeTelegramHtml(
          caller.email
        )}</code>)`,
        `📚 Bab: <b>${escapeTelegramHtml(body.chapterTitle || "-")}</b>`,
        `📝 Kendala: ${escapeTelegramHtml(body.issueDescription || "-")}`,
      ].join("\n");

      await Promise.all(
        config.adminChatIds.map((chatId) =>
          sendTelegramMessage(config.botToken, chatId, msg)
        )
      );
      return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
    }

    if (eventType === "quiz_submitted") {
      if (!config.notifyQuizSubmissions) {
        return NextResponse.json(
          { ok: true, skipped: "quiz_notifications_disabled" },
          { headers: API_SECURITY_HEADERS }
        );
      }
      const msg = [
        "📝 <b>SUBMISSION KUIS / TUGAS BARU</b>",
        "",
        `👤 Learner: <b>${escapeTelegramHtml(caller.fullName)}</b>`,
        `📘 Judul: <b>${escapeTelegramHtml(body.quizTitle || "Kuis")}</b>`,
        typeof body.scorePct === "number"
          ? `📊 Skor Otomatis: <b>${body.scorePct}%</b>`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      await Promise.all(
        config.adminChatIds.map((chatId) =>
          sendTelegramMessage(config.botToken, chatId, msg)
        )
      );
      return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
    }

    return NextResponse.json(
      { ok: false, error: "eventType tidak dikenali." },
      { status: 400, headers: API_SECURITY_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal mengirim notifikasi Telegram." },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }
}
