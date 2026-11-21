import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
  verifyApiCaller,
} from "@/lib/supabase/server-auth";
import { deletePaymentProofFromStorage } from "@/lib/supabase/proof-cleanup";
import {
  createTelegramServiceClient,
  hasServiceRoleKey,
  isMissingTelegramTableError,
  loadTelegramBotConfig,
  maskBotToken,
  parseAdminChatIds,
  sendTelegramMessage,
  telegramApiRequest,
} from "@/lib/telegram/server";

export async function GET(request: Request) {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const caller = await verifyApiCaller(request, { requiredRoles: ["admin"] });
  if (!caller.ok) return caller.response;

  const serviceClient = createTelegramServiceClient();
  const dbClient = serviceClient || caller.supabase;
  const config = await loadTelegramBotConfig(dbClient);

  let webhookInfo: unknown = null;
  const urlObj = new URL(request.url);
  if (urlObj.searchParams.get("checkWebhook") === "1" && config.botToken) {
    const infoRes = await telegramApiRequest(config.botToken, "getWebhookInfo");
    if (infoRes.ok) {
      webhookInfo = infoRes.result;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      config: {
        enabled: config.enabled,
        hasBotToken: Boolean(config.botToken),
        botTokenPreview: maskBotToken(config.botToken),
        adminChatId: config.adminChatId,
        webhookSecret: config.webhookSecret,
        notifyPayments: config.notifyPayments,
        notifyNewUsers: config.notifyNewUsers,
        notifyQuizSubmissions: config.notifyQuizSubmissions,
        notifyContentIssues: config.notifyContentIssues,
        tableReady: config.tableReady,
      },
      hasServiceRoleKey: hasServiceRoleKey(),
      webhookInfo,
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
      action?:
        | "save"
        | "test"
        | "register_webhook"
        | "delete_webhook"
        | "cleanup_proof";
      enabled?: boolean;
      botToken?: string;
      adminChatId?: string;
      webhookSecret?: string;
      webhookUrl?: string;
      notifyPayments?: boolean;
      notifyNewUsers?: boolean;
      notifyQuizSubmissions?: boolean;
      notifyContentIssues?: boolean;
      proofUrl?: string;
    };

    const action = body.action || "save";
    const serviceClient = createTelegramServiceClient();
    const dbClient = serviceClient || caller.supabase;

    if (action === "cleanup_proof") {
      const deleted = await deletePaymentProofFromStorage(
        dbClient,
        body.proofUrl
      );
      return NextResponse.json(
        { ok: true, deleted },
        { headers: API_SECURITY_HEADERS }
      );
    }

    const existing = await loadTelegramBotConfig(dbClient);

    if (action === "save") {
      const nextToken =
        typeof body.botToken === "string" && body.botToken.trim()
          ? body.botToken.trim()
          : existing.botToken;
      const nextChatId =
        typeof body.adminChatId === "string"
          ? body.adminChatId.trim()
          : existing.adminChatId;
      const nextSecret =
        typeof body.webhookSecret === "string" && body.webhookSecret.trim()
          ? body.webhookSecret.trim()
          : existing.webhookSecret || crypto.randomBytes(24).toString("hex");

      const payload = {
        id: "default",
        enabled: Boolean(body.enabled),
        bot_token: nextToken || null,
        admin_chat_id: nextChatId || null,
        webhook_secret: nextSecret,
        notify_payments: body.notifyPayments ?? existing.notifyPayments,
        notify_new_users: body.notifyNewUsers ?? existing.notifyNewUsers,
        notify_quiz_submissions:
          body.notifyQuizSubmissions ?? existing.notifyQuizSubmissions,
        notify_content_issues:
          body.notifyContentIssues ?? existing.notifyContentIssues,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await dbClient
        .from("telegram_bot_settings")
        .upsert(payload, { onConflict: "id" });

      if (upsertErr) {
        return NextResponse.json(
          {
            ok: false,
            error: isMissingTelegramTableError(upsertErr)
              ? "Tabel telegram_bot_settings belum ada di Supabase. Jalankan SQL Migration 020 terlebih dahulu."
              : upsertErr.message,
          },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          message: "Pengaturan Bot Telegram tersimpan.",
          config: {
            enabled: payload.enabled && Boolean(nextToken && parseAdminChatIds(nextChatId).length > 0),
            hasBotToken: Boolean(nextToken),
            botTokenPreview: maskBotToken(nextToken),
            adminChatId: nextChatId,
            webhookSecret: nextSecret,
            notifyPayments: payload.notify_payments,
            notifyNewUsers: payload.notify_new_users,
            notifyQuizSubmissions: payload.notify_quiz_submissions,
            notifyContentIssues: payload.notify_content_issues,
            tableReady: true,
          },
          hasServiceRoleKey: hasServiceRoleKey(),
        },
        { headers: API_SECURITY_HEADERS }
      );
    }

    const activeToken =
      typeof body.botToken === "string" && body.botToken.trim()
        ? body.botToken.trim()
        : existing.botToken;
    const activeChatIds = parseAdminChatIds(
      typeof body.adminChatId === "string" && body.adminChatId.trim()
        ? body.adminChatId.trim()
        : existing.adminChatId
    );
    const activeSecret =
      typeof body.webhookSecret === "string" && body.webhookSecret.trim()
        ? body.webhookSecret.trim()
        : existing.webhookSecret || crypto.randomBytes(24).toString("hex");

    if (!activeToken) {
      return NextResponse.json(
        { ok: false, error: "Bot Token belum diisi." },
        { status: 400, headers: API_SECURITY_HEADERS }
      );
    }

    if (action === "test") {
      if (activeChatIds.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Admin Chat ID Telegram belum diisi atau tidak valid." },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      const me = await telegramApiRequest<{ username?: string; first_name?: string }>(
        activeToken,
        "getMe"
      );
      if (!me.ok) {
        return NextResponse.json(
          { ok: false, error: `Bot Token tidak valid: ${me.description || "Unauthorized"}` },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      const sendRes = await sendTelegramMessage(
        activeToken,
        activeChatIds[0],
        [
          "✅ <b>Koneksi Bot Ruang Sosmed 2.0 Berhasil!</b>",
          "",
          `🤖 Bot: @${me.result?.username || me.result?.first_name || "RuangSosmedBot"}`,
          `👮 Diuji oleh: ${caller.fullName}`,
          "",
          "Notifikasi pembayaran PRO, bukti transfer (dengan tombol Konfirmasi/Tolak), & member baru siap dikirim ke chat ini.",
        ].join("\n")
      );
      if (!sendRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `Gagal mengirim pesan tes ke Chat ID ${activeChatIds[0]}: ${sendRes.description || "Pastikan Anda sudah menekan Start pada bot"}`,
          },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        {
          ok: true,
          botUsername: me.result?.username,
          message: `Pesan tes terkirim ke Chat ID ${activeChatIds[0]} via @${me.result?.username || "bot"}.`,
        },
        { headers: API_SECURITY_HEADERS }
      );
    }

    if (action === "register_webhook") {
      const targetUrl = String(body.webhookUrl || "").trim();
      if (!/^https:\/\/.+/i.test(targetUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "URL Webhook wajib menggunakan HTTPS publik (mis. https://domain-anda.com/api/telegram/webhook).",
          },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }

      if (!existing.webhookSecret) {
        await dbClient
          .from("telegram_bot_settings")
          .upsert(
            {
              id: "default",
              webhook_secret: activeSecret,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
      }

      const hookRes = await telegramApiRequest(activeToken, "setWebhook", {
        url: targetUrl,
        secret_token: activeSecret,
        allowed_updates: ["message", "callback_query"],
      });

      if (!hookRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `Gagal mendaftarkan webhook: ${hookRes.description || "Unknown error"}`,
          },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          webhookSecret: activeSecret,
          message: "Webhook Telegram 2-arah berhasil dipasang!",
        },
        { headers: API_SECURITY_HEADERS }
      );
    }

    if (action === "delete_webhook") {
      const delRes = await telegramApiRequest(activeToken, "deleteWebhook");
      if (!delRes.ok) {
        return NextResponse.json(
          { ok: false, error: delRes.description || "Gagal menghapus webhook." },
          { status: 400, headers: API_SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, message: "Webhook Telegram dihapus." },
        { headers: API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Aksi tidak dikenali." },
      { status: 400, headers: API_SECURITY_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal memproses permintaan Telegram." },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }
}
