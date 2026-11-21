import { NextResponse } from "next/server";
import { API_SECURITY_HEADERS } from "@/lib/supabase/server-auth";
import {
  answerTelegramCallback,
  buildPaymentInlineKeyboard,
  buildPaymentNotificationCaption,
  buildResolvedPaymentSummary,
  createTelegramServiceClient,
  editTelegramResolvedMessage,
  escapeTelegramHtml,
  isAuthorizedAdminChat,
  loadTelegramBotConfig,
  resolveUpgradeRequestOnServer,
  sendTelegramMessage,
  sendTelegramPhoto,
  timingSafeSecretMatch,
  type UpgradeRequestRecord,
} from "@/lib/telegram/server";

export const dynamic = "force-dynamic";

interface TelegramUpdatePayload {
  callback_query?: {
    id: string;
    from?: { id: number; first_name?: string; username?: string };
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
      photo?: unknown[];
    };
  };
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
}

export async function POST(request: Request) {
  const serviceClient = createTelegramServiceClient();
  const config = await loadTelegramBotConfig(serviceClient);

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!timingSafeSecretMatch(config.webhookSecret, providedSecret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized webhook signature." },
      { status: 401, headers: API_SECURITY_HEADERS }
    );
  }

  if (!config.botToken || !serviceClient) {
    return NextResponse.json(
      { ok: false, error: "Telegram service role or bot token not configured." },
      { status: 503, headers: API_SECURITY_HEADERS }
    );
  }

  try {
    const update = (await request.json()) as TelegramUpdatePayload;

    // 1. Handle Inline Button Clicks (✅ Konfirmasi & Aktifkan / ❌ Tolak Pembayaran)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id ?? cq.from?.id;
      const messageId = cq.message?.message_id;
      const hasPhoto = Boolean(cq.message?.photo && cq.message.photo.length > 0);

      if (!chatId || !isAuthorizedAdminChat(config, chatId)) {
        await answerTelegramCallback(
          config.botToken,
          cq.id,
          "⛔ Hanya Admin terdaftar yang dapat mengonfirmasi pembayaran.",
          true
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      const rawData = String(cq.data || "").trim();
      const match = /^(approve|reject):([0-9a-f-]{8,})$/i.exec(rawData);
      if (!match) {
        await answerTelegramCallback(
          config.botToken,
          cq.id,
          "Perintah tombol tidak dikenali.",
          false
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      const action = match[1].toLowerCase() as "approve" | "reject";
      const requestId = match[2];
      const actorHandle = cq.from?.username
        ? `Telegram (@${cq.from.username})`
        : `Telegram (${cq.from?.first_name || "Admin"})`;

      const resolved = await resolveUpgradeRequestOnServer({
        serviceClient,
        requestId,
        action,
        actorLabel: actorHandle,
      });

      if (!resolved.ok || !resolved.req) {
        await answerTelegramCallback(
          config.botToken,
          cq.id,
          `⚠️ ${resolved.error || "Gagal memproses pembayaran."}`,
          true
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      if (resolved.alreadyResolved) {
        await answerTelegramCallback(
          config.botToken,
          cq.id,
          `ℹ️ Permintaan ini sudah berstatus "${resolved.req.status}".`,
          false
        );
        if (messageId) {
          const alreadyAction =
            resolved.req.status === "approved" ? "approve" : "reject";
          await editTelegramResolvedMessage(
            config.botToken,
            chatId,
            messageId,
            hasPhoto,
            buildResolvedPaymentSummary({
              req: resolved.req,
              action: alreadyAction,
              actorLabel: "Sudah diproses sebelumnya",
              proofDeleted: true,
            })
          );
        }
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      await answerTelegramCallback(
        config.botToken,
        cq.id,
        action === "approve"
          ? `✅ ${resolved.req.user_name} aktif! Bukti bayar otomatis dihapus.`
          : "❌ Pembayaran ditolak & bukti bayar dihapus.",
        false
      );

      if (messageId) {
        await editTelegramResolvedMessage(
          config.botToken,
          chatId,
          messageId,
          hasPhoto,
          buildResolvedPaymentSummary({
            req: resolved.req,
            action,
            actorLabel: actorHandle,
            dueLabel: resolved.dueLabel,
            proofDeleted: resolved.proofDeleted,
          })
        );
      }

      return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
    }

    // 2. Handle Bot Commands
    const msg = update.message;
    if (msg?.text && msg.chat?.id) {
      const chatId = msg.chat.id;
      const command = msg.text.trim().split(/\s+/)[0].toLowerCase().split("@")[0];

      if (command === "/id" || command === "/myid") {
        await sendTelegramMessage(
          config.botToken,
          chatId,
          [
            "🆔 <b>Chat ID Telegram Anda:</b>",
            `<code>${chatId}</code>`,
            "",
            "Tempel angka di atas ke menu <b>Pengaturan → Bot Telegram &amp; Notifikasi</b> di Admin Studio.",
          ].join("\n")
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      if (!isAuthorizedAdminChat(config, chatId)) {
        await sendTelegramMessage(
          config.botToken,
          chatId,
          [
            "👋 <b>Bot Ruang Sosmed 2.0 Terhubung!</b>",
            "",
            "Chat ini belum terdaftar sebagai <b>Admin Chat ID</b>.",
            "",
            "🆔 <b>Chat ID Telegram Anda:</b>",
            `<code>${chatId}</code>`,
            "",
            "Salin angka di atas lalu tempel di <b>Admin Studio → Pengaturan → Bot Telegram &amp; Notifikasi → Admin Chat ID</b>, kemudian klik <b>Simpan Pengaturan Bot</b>.",
          ].join("\n")
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      if (command === "/start" || command === "/help") {
        await sendTelegramMessage(
          config.botToken,
          chatId,
          [
            "🤖 <b>Bot Admin Ruang Sosmed 2.0 Aktif!</b>",
            "",
            "Perintah tersedia:",
            "• /pending — Lihat &amp; konfirmasi pembayaran tertunda",
            "• /stats — Ringkasan member &amp; antrean PRO",
            "• /myid atau /id — Tampilkan Chat ID saat ini",
            "• /help — Tampilkan panduan ini",
          ].join("\n")
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      if (command === "/stats") {
        const [{ count: totalUsers }, { count: pendingCount }, { count: approvedCount }] =
          await Promise.all([
            serviceClient
              .from("profiles")
              .select("id", { count: "exact", head: true }),
            serviceClient
              .from("pro_upgrade_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
            serviceClient
              .from("pro_upgrade_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "approved"),
          ]);

        await sendTelegramMessage(
          config.botToken,
          chatId,
          [
            "📊 <b>STATISTIK RUANG SOSMED 2.0</b>",
            "",
            `👥 Total Akun Terdaftar: <b>${totalUsers ?? 0}</b>`,
            `⏳ Antrean Pembayaran Pending: <b>${pendingCount ?? 0}</b>`,
            `✅ Total Pembayaran Terverifikasi: <b>${approvedCount ?? 0}</b>`,
          ].join("\n")
        );
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      if (command === "/pending") {
        const { data: pendingRows } = await serviceClient
          .from("pro_upgrade_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        const rows = (pendingRows || []) as UpgradeRequestRecord[];
        if (rows.length === 0) {
          await sendTelegramMessage(
            config.botToken,
            chatId,
            "✨ Tidak ada antrean pembayaran yang menunggu verifikasi saat ini."
          );
          return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
        }

        await sendTelegramMessage(
          config.botToken,
          chatId,
          `📋 Menampilkan <b>${rows.length}</b> pembayaran menunggu konfirmasi:`
        );

        for (const reqRow of rows) {
          const caption = buildPaymentNotificationCaption(reqRow);
          const markup = buildPaymentInlineKeyboard(reqRow.id);
          if (reqRow.proof_url) {
            await sendTelegramPhoto(
              config.botToken,
              chatId,
              reqRow.proof_url,
              caption,
              markup
            );
          } else {
            await sendTelegramMessage(config.botToken, chatId, caption, markup);
          }
        }
        return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
      }

      await sendTelegramMessage(
        config.botToken,
        chatId,
        `Perintah <code>${escapeTelegramHtml(command)}</code> tidak dikenal. Ketik /help untuk melihat daftar perintah.`
      );
    }

    return NextResponse.json({ ok: true }, { headers: API_SECURITY_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: API_SECURITY_HEADERS }
    );
  }
}
