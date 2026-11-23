import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  addDaysToIsoDate,
  formatIndoDate,
  getTodayIsoDate,
} from "@/lib/subscription-utils";
import { deletePaymentProofFromStorage } from "@/lib/supabase/proof-cleanup";
import { getServerEnv } from "@/lib/server-env";

const DEFAULT_SUPABASE_URL = "https://wdmfxlrdyqxnycbebwpv.supabase.co";

export interface TelegramBotConfig {
  enabled: boolean;
  rawEnabled: boolean;
  botToken: string;
  adminChatId: string;
  adminChatIds: string[];
  webhookSecret: string;
  notifyPayments: boolean;
  notifyNewUsers: boolean;
  notifyQuizSubmissions: boolean;
  notifyContentIssues: boolean;
  tableReady: boolean;
}

export interface UpgradeRequestRecord {
  id: string;
  user_id?: string | null;
  user_email: string;
  user_name: string;
  package_id?: string | null;
  package_name: string;
  price_label: string;
  payment_method?: string | null;
  buyer_contact?: string | null;
  proof_url?: string | null;
  status: string;
  billing_cycle?: string | null;
  duration_days?: number | null;
  request_type?: string | null;
  target_item_key?: string | null;
  target_item_title?: string | null;
  telegram_chat_id?: string | null;
  telegram_message_id?: number | null;
  created_at?: string | null;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: Array<
    Array<{
      text: string;
      callback_data?: string;
      url?: string;
    }>
  >;
}

export function resolveSupabaseUrl(): string {
  return (
    getServerEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() ||
    getServerEnv("VITE_SUPABASE_URL") ||
    (process.env.VITE_SUPABASE_URL || "").trim() ||
    DEFAULT_SUPABASE_URL
  );
}

export function hasServiceRoleKey(): boolean {
  return Boolean(getServerEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function createTelegramServiceClient(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const serviceKey = getServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function parseAdminChatIds(raw?: string | null): string[] {
  return Array.from(
    new Set(
      String(raw || "")
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => /^-?\d+$/.test(s))
    )
  );
}

export function isMissingTelegramTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "42703" ||
    msg.includes("telegram_bot_settings") ||
    msg.includes("telegram_chat_id") ||
    msg.includes("telegram_message_id")
  );
}

export async function loadTelegramBotConfig(
  client: SupabaseClient | null
): Promise<TelegramBotConfig> {
  const envToken = getServerEnv("TELEGRAM_BOT_TOKEN");
  const envChatId = getServerEnv("TELEGRAM_ADMIN_CHAT_ID");
  const envSecret = getServerEnv("TELEGRAM_WEBHOOK_SECRET");

  if (!client) {
    const adminChatIds = parseAdminChatIds(envChatId);
    const isEnabled = Boolean(envToken && adminChatIds.length > 0);
    return {
      enabled: isEnabled,
      rawEnabled: isEnabled,
      botToken: envToken,
      adminChatId: envChatId,
      adminChatIds,
      webhookSecret: envSecret,
      notifyPayments: true,
      notifyNewUsers: true,
      notifyQuizSubmissions: false,
      notifyContentIssues: true,
      tableReady: false,
    };
  }

  try {
    const { data, error } = await client
      .from("telegram_bot_settings")
      .select(
        "enabled, bot_token, admin_chat_id, webhook_secret, notify_payments, notify_new_users, notify_quiz_submissions, notify_content_issues"
      )
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      const adminChatIds = parseAdminChatIds(envChatId);
      const isEnabled = Boolean(envToken && adminChatIds.length > 0);
      return {
        enabled: isEnabled,
        rawEnabled: isEnabled,
        botToken: envToken,
        adminChatId: envChatId,
        adminChatIds,
        webhookSecret: envSecret,
        notifyPayments: true,
        notifyNewUsers: true,
        notifyQuizSubmissions: false,
        notifyContentIssues: true,
        tableReady: !isMissingTelegramTableError(error),
      };
    }

    const botToken = String(data?.bot_token || envToken || "").trim();
    const adminChatId = String(data?.admin_chat_id || envChatId || "").trim();
    const webhookSecret = String(data?.webhook_secret || envSecret || "").trim();
    const adminChatIds = parseAdminChatIds(adminChatId);

    return {
      enabled: Boolean(data?.enabled) && Boolean(botToken && adminChatIds.length > 0),
      rawEnabled: Boolean(data?.enabled),
      botToken,
      adminChatId,
      adminChatIds,
      webhookSecret,
      notifyPayments: data?.notify_payments ?? true,
      notifyNewUsers: data?.notify_new_users ?? true,
      notifyQuizSubmissions: data?.notify_quiz_submissions ?? false,
      notifyContentIssues: data?.notify_content_issues ?? true,
      tableReady: true,
    };
  } catch {
    const adminChatIds = parseAdminChatIds(envChatId);
    const isEnabled = Boolean(envToken && adminChatIds.length > 0);
    return {
      enabled: isEnabled,
      rawEnabled: isEnabled,
      botToken: envToken,
      adminChatId: envChatId,
      adminChatIds,
      webhookSecret: envSecret,
      notifyPayments: true,
      notifyNewUsers: true,
      notifyQuizSubmissions: false,
      notifyContentIssues: true,
      tableReady: false,
    };
  }
}

export function maskBotToken(token: string): string {
  const clean = token.trim();
  if (!clean) return "";
  if (clean.length <= 12) return "••••••••";
  return `${clean.slice(0, 6)}••••••${clean.slice(-4)}`;
}

export function escapeTelegramHtml(value?: string | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 3))}...`;
}

export function isAuthorizedAdminChat(
  config: TelegramBotConfig,
  chatId: string | number
): boolean {
  const clean = String(chatId).trim();
  return config.adminChatIds.includes(clean);
}

export function timingSafeSecretMatch(
  expected: string,
  actual: string | null | undefined
): boolean {
  const cleanExpected = expected.trim();
  const cleanActual = String(actual || "").trim();
  if (!cleanExpected || !cleanActual) return false;
  const bufA = Buffer.from(cleanExpected, "utf8");
  const bufB = Buffer.from(cleanActual, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function telegramApiRequest<T = any>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
        cache: "no-store",
      }
    );
    const json = (await res.json()) as {
      ok?: boolean;
      result?: T;
      description?: string;
    };
    return {
      ok: Boolean(json?.ok),
      result: json?.result,
      description: json?.description,
    };
  } catch (err: any) {
    return {
      ok: false,
      description: err?.message || "Gagal menghubungi Telegram API.",
    };
  }
}

export async function registerTelegramBotCommands(botToken: string) {
  return telegramApiRequest(botToken, "setMyCommands", {
    commands: [
      { command: "start", description: "Cek status bot & Chat ID Anda" },
      { command: "myid", description: "Tampilkan Chat ID Telegram Anda" },
      { command: "id", description: "Tampilkan Chat ID Telegram Anda" },
      { command: "pending", description: "Lihat & konfirmasi pembayaran tertunda" },
      { command: "stats", description: "Ringkasan member & antrean PRO" },
      { command: "help", description: "Panduan perintah bot" },
    ],
  });
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  htmlText: string,
  replyMarkup?: TelegramInlineKeyboardMarkup
) {
  return telegramApiRequest<{ message_id: number; chat: { id: number } }>(
    botToken,
    "sendMessage",
    {
      chat_id: chatId,
      text: truncateText(htmlText, 3900),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }
  );
}

async function sendTelegramPhotoMultipart(
  botToken: string,
  chatId: string | number,
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
  captionHtml: string,
  replyMarkup?: TelegramInlineKeyboardMarkup
) {
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("caption", truncateText(captionHtml, 1000));
    form.append("parse_mode", "HTML");
    if (replyMarkup) {
      form.append("reply_markup", JSON.stringify(replyMarkup));
    }
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    form.append("photo", new Blob([arrayBuffer], { type: mimeType }), fileName);

    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendPhoto`,
      {
        method: "POST",
        body: form,
        cache: "no-store",
      }
    );
    const json = (await res.json()) as {
      ok?: boolean;
      result?: { message_id: number; chat: { id: number } };
      description?: string;
    };
    return {
      ok: Boolean(json?.ok),
      result: json?.result,
      description: json?.description,
    };
  } catch (err: any) {
    return {
      ok: false,
      description: err?.message || "Gagal mengunggah foto ke Telegram.",
    };
  }
}

export async function sendTelegramPhoto(
  botToken: string,
  chatId: string | number,
  photoSource: string,
  captionHtml: string,
  replyMarkup?: TelegramInlineKeyboardMarkup
): Promise<{
  ok: boolean;
  hasPhoto: boolean;
  result?: { message_id: number; chat: { id: number } };
  description?: string;
}> {
  const cleanPhoto = photoSource.trim();
  const safeCaption = truncateText(captionHtml, 1000);

  if (cleanPhoto.startsWith("data:image/")) {
    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(cleanPhoto);
    if (match) {
      const mimeType = match[1];
      const ext = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
      const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
      const up = await sendTelegramPhotoMultipart(
        botToken,
        chatId,
        bytes,
        mimeType,
        `bukti-bayar.${ext}`,
        safeCaption,
        replyMarkup
      );
      if (up.ok) {
        return { ok: true, hasPhoto: true, result: up.result };
      }
    }
  } else if (/^https?:\/\//i.test(cleanPhoto)) {
    const direct = await telegramApiRequest<{
      message_id: number;
      chat: { id: number };
    }>(botToken, "sendPhoto", {
      chat_id: chatId,
      photo: cleanPhoto,
      caption: safeCaption,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
    if (direct.ok) {
      return { ok: true, hasPhoto: true, result: direct.result };
    }

    // Fallback: download image bytes from URL and upload via multipart
    try {
      const imgRes = await fetch(cleanPhoto, { cache: "no-store" });
      if (imgRes.ok) {
        const mime = imgRes.headers.get("content-type") || "image/webp";
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        const up = await sendTelegramPhotoMultipart(
          botToken,
          chatId,
          buf,
          mime,
          "bukti-bayar.webp",
          safeCaption,
          replyMarkup
        );
        if (up.ok) {
          return { ok: true, hasPhoto: true, result: up.result };
        }
      }
    } catch {}
  }

  // Fallback to text message if photo upload failed
  const textFallback = await sendTelegramMessage(
    botToken,
    chatId,
    captionHtml,
    replyMarkup
  );
  return {
    ok: textFallback.ok,
    hasPhoto: false,
    result: textFallback.result,
    description: textFallback.description,
  };
}

export async function editTelegramResolvedMessage(
  botToken: string,
  chatId: string | number,
  messageId: number,
  hasPhoto: boolean,
  nextHtml: string
) {
  const safeCaption = truncateText(nextHtml, 1000);
  if (hasPhoto) {
    const capRes = await telegramApiRequest(botToken, "editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: safeCaption,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    });
    if (capRes.ok) return capRes;
  }

  const textRes = await telegramApiRequest(botToken, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: truncateText(nextHtml, 3900),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [] },
  });
  if (textRes.ok) return textRes;

  if (!hasPhoto) {
    return telegramApiRequest(botToken, "editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: safeCaption,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    });
  }
  return textRes;
}

export async function answerTelegramCallback(
  botToken: string,
  callbackQueryId: string,
  text: string,
  showAlert = false
) {
  return telegramApiRequest(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: truncateText(text, 190),
    show_alert: showAlert,
  });
}

export function formatRequestDurationText(req: UpgradeRequestRecord): string {
  if (req.request_type === "item_unlock") {
    return "Buka Materi Satuan (Sekali Bayar)";
  }
  if (req.billing_cycle === "3d_trial") return "Trial 3 Hari (1×)";
  if (req.billing_cycle === "7d_trial") return "Trial 7 Hari (1×)";
  const days = Number(req.duration_days) || 30;
  return `Langganan ${days} Hari`;
}

export function buildPaymentInlineKeyboard(
  requestId: string
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "✅ Konfirmasi & Aktifkan",
          callback_data: `approve:${requestId}`,
        },
        {
          text: "❌ Tolak Pembayaran",
          callback_data: `reject:${requestId}`,
        },
      ],
    ],
  };
}

export function buildPaymentNotificationCaption(
  req: UpgradeRequestRecord
): string {
  const isUnlock = req.request_type === "item_unlock";
  const header = isUnlock
    ? "🔓 <b>KONFIRMASI BUKA MATERI SATUAN</b>"
    : "⚡ <b>KONFIRMASI PEMBAYARAN PAKET BARU</b>";
  const targetLabel = isUnlock
    ? `Materi: <b>${escapeTelegramHtml(
        req.target_item_title || req.package_name
      )}</b>`
    : `Paket: <b>${escapeTelegramHtml(req.package_name)}</b>`;

  const lines = [
    header,
    "",
    `👤 Nama: <b>${escapeTelegramHtml(req.user_name)}</b>`,
    `📧 Email: <code>${escapeTelegramHtml(req.user_email)}</code>`,
    req.buyer_contact
      ? `📱 Kontak/WA: ${escapeTelegramHtml(req.buyer_contact)}`
      : null,
    `📦 ${targetLabel}`,
    `⏳ Durasi: <b>${escapeTelegramHtml(formatRequestDurationText(req))}</b>`,
    `💰 Nominal: <b>${escapeTelegramHtml(req.price_label)}</b>`,
    `💳 Metode: ${escapeTelegramHtml(req.payment_method || "QRIS / Transfer")}`,
    req.proof_url
      ? "🖼️ Bukti transfer terlampir (otomatis terhapus dari server setelah dikonfirmasi)."
      : "⚠️ Pembeli belum melampirkan gambar bukti transfer.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildResolvedPaymentSummary(params: {
  req: UpgradeRequestRecord;
  action: "approve" | "reject";
  actorLabel: string;
  dueLabel?: string;
  proofDeleted: boolean;
}): string {
  const { req, action, actorLabel, dueLabel, proofDeleted } = params;
  const statusLine =
    action === "approve"
      ? "✅ <b>DISETUJUI &amp; DIAKTIFKAN</b>"
      : "❌ <b>PEMBAYARAN DITOLAK</b>";

  const lines = [
    statusLine,
    "",
    `👤 ${escapeTelegramHtml(req.user_name)} (<code>${escapeTelegramHtml(
      req.user_email
    )}</code>)`,
    req.request_type === "item_unlock"
      ? `🔓 Materi: <b>${escapeTelegramHtml(
          req.target_item_title || req.package_name
        )}</b>`
      : `📦 Paket: <b>${escapeTelegramHtml(
          req.package_name
        )}</b> (${escapeTelegramHtml(formatRequestDurationText(req))})`,
    `💰 Nominal: <b>${escapeTelegramHtml(req.price_label)}</b>`,
    dueLabel ? `📅 Berlaku s/d: <b>${escapeTelegramHtml(dueLabel)}</b>` : null,
    `👮 Diverifikasi via: ${escapeTelegramHtml(actorLabel)}`,
    proofDeleted
      ? "🗑️ Bukti pembayaran telah otomatis dihapus dari server."
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function resolveUpgradeRequestOnServer(params: {
  serviceClient: SupabaseClient;
  requestId: string;
  action: "approve" | "reject";
  actorLabel: string;
}): Promise<{
  ok: boolean;
  alreadyResolved?: boolean;
  error?: string;
  req?: UpgradeRequestRecord;
  dueIso?: string;
  dueLabel?: string;
  proofDeleted: boolean;
}> {
  const { serviceClient, requestId, action, actorLabel } = params;

  const { data: reqRow, error: fetchErr } = await serviceClient
    .from("pro_upgrade_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchErr || !reqRow) {
    return {
      ok: false,
      error: fetchErr?.message || "Permintaan pembayaran tidak ditemukan.",
      proofDeleted: false,
    };
  }

  const req = reqRow as UpgradeRequestRecord;
  if (req.status && req.status !== "pending") {
    return {
      ok: true,
      alreadyResolved: true,
      req,
      proofDeleted: false,
    };
  }

  const cleanEmail = String(req.user_email || "").trim().toLowerCase();
  const cleanName =
    String(req.user_name || "").trim() ||
    cleanEmail.split("@")[0] ||
    "Learner";
  const originalProofUrl = req.proof_url || null;
  const isItemUnlock = req.request_type === "item_unlock" && Boolean(req.target_item_key);

  let dueIso: string | undefined;
  let dueLabel: string | undefined;

  if (action === "approve") {
    if (isItemUnlock && req.target_item_key) {
      let targetUid = req.user_id || null;
      if (!targetUid && cleanEmail) {
        const { data: prof } = await serviceClient
          .from("profiles")
          .select("id")
          .ilike("email", cleanEmail)
          .maybeSingle();
        targetUid = prof?.id || null;
      }

      const { error: unlockErr } = await serviceClient
        .from("learner_unlocked_items")
        .upsert(
          {
            user_id: targetUid,
            user_email: cleanEmail,
            item_key: req.target_item_key,
            course_title: req.target_item_title || req.package_name || "Materi Satuan",
            chapter_id: null,
            unlock_method: "purchase",
            points_spent: 0,
            price_paid_idr: 0,
            request_id: req.id,
          },
          { onConflict: "user_email,item_key" }
        );

      if (unlockErr) {
        // Fallback insert when composite expression index doesn't match ON CONFLICT target
        const { data: existingUnlock } = await serviceClient
          .from("learner_unlocked_items")
          .select("id")
          .ilike("user_email", cleanEmail)
          .eq("item_key", req.target_item_key)
          .maybeSingle();

        if (!existingUnlock) {
          const { error: insertErr } = await serviceClient
            .from("learner_unlocked_items")
            .insert({
              user_id: targetUid,
              user_email: cleanEmail,
              item_key: req.target_item_key,
              course_title:
                req.target_item_title || req.package_name || "Materi Satuan",
              chapter_id: null,
              unlock_method: "purchase",
              points_spent: 0,
              price_paid_idr: 0,
              request_id: req.id,
            });
          if (insertErr) {
            return {
              ok: false,
              error: insertErr.message,
              proofDeleted: false,
            };
          }
        }
      }
    } else {
      const todayIso = getTodayIsoDate();
      const durationDays = Math.max(
        1,
        Number(req.duration_days) ||
          (req.billing_cycle === "3d_trial"
            ? 3
            : req.billing_cycle === "7d_trial"
            ? 7
            : 30)
      );
      dueIso = addDaysToIsoDate(todayIso, durationDays);
      dueLabel = formatIndoDate(dueIso);

      const cycle =
        req.billing_cycle ||
        (durationDays <= 4
          ? "3d_trial"
          : durationDays <= 8
          ? "7d_trial"
          : "30d");
      const isTrial = cycle === "3d_trial" || cycle === "7d_trial";
      const pkgName = req.package_name || "Pro";
      const pkgId =
        req.package_id ||
        (pkgName.toLowerCase().includes("basic")
          ? "pkg-basic"
          : pkgName.toLowerCase().includes("free")
          ? "pkg-free"
          : "pkg-pro");

      const startTs = `${todayIso}T00:00:00+07:00`;
      const expiresTs = `${dueIso}T23:59:59+07:00`;

      const profilePatch: Record<string, unknown> = {
        subscription_tier: "pro",
        pro_started_at: startTs,
        pro_expires_at: expiresTs,
        pro_package_name: pkgName,
        pro_package_id: pkgId,
        pro_billing_cycle: cycle,
      };
      if (isTrial) {
        profilePatch.has_used_trial = true;
        profilePatch.trial_used_at = new Date().toISOString();
      }

      const { error: profErr } = await serviceClient
        .from("profiles")
        .update(profilePatch)
        .ilike("email", cleanEmail);

      if (profErr) {
        return {
          ok: false,
          error: profErr.message,
          proofDeleted: false,
        };
      }

      // Sync optional legacy tables (`user_profiles` & `user_subscriptions`) best-effort
      try {
        const { data: upRow } = await serviceClient
          .from("user_profiles")
          .select("id, username, perks")
          .ilike("email", cleanEmail)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (upRow) {
          const prevPerks =
            upRow.perks && typeof upRow.perks === "object" ? upRow.perks : {};
          await serviceClient
            .from("user_profiles")
            .update({
              perks: {
                ...prevPerks,
                is_pro: true,
                pro_started_at: startTs,
                pro_expires_at: expiresTs,
                pro_package_name: pkgName,
                pro_package_id: pkgId,
                pro_billing_cycle: cycle,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", upRow.id);

          if (upRow.username) {
            await serviceClient.from("user_subscriptions").upsert(
              {
                username: upRow.username,
                plan_tier: "PRO",
                status: "aktif",
                started_at: todayIso,
                due_at: dueIso,
                payment_method: actorLabel,
                renewal_status: "siap diperpanjang",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "username" }
            );
          }
        }
      } catch {}
    }
  }

  // Delete proof image from Supabase Storage AND clear `proof_url` on DB record
  const storageDeleted = await deletePaymentProofFromStorage(
    serviceClient,
    originalProofUrl
  );
  const nowIso = new Date().toISOString();

  await serviceClient
    .from("pro_upgrade_requests")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      proof_url: null,
      proof_deleted_at: originalProofUrl ? nowIso : null,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", req.id);

  // Append Admin in-app notification for visibility in web portal
  if (action === "approve") {
    try {
      const { data: notifRow } = await serviceClient
        .from("contents")
        .select("id, settings_json")
        .eq("title", "__SYSTEM_ADMIN_NOTIFICATIONS__")
        .maybeSingle();

      if (notifRow) {
        const settings =
          notifRow.settings_json && typeof notifRow.settings_json === "object"
            ? (notifRow.settings_json as Record<string, unknown>)
            : {};
        const prevItems = Array.isArray(settings.items) ? settings.items : [];
        const newNotif = {
          id: `notif-tg-${Date.now()}`,
          eventType: "pro_subscribed",
          title: "Yuhuu! ⚡ Paket Berbayar Aktif",
          body: `${cleanName} aktif pada paket ${req.package_name}${
            dueLabel ? ` (berlaku s/d ${dueLabel})` : ""
          } • Dikonfirmasi via ${actorLabel}.`,
          userName: cleanName,
          userEmail: cleanEmail,
          packageName: req.package_name,
          priceLabel: req.price_label,
          read: false,
          createdAt: nowIso,
        };
        await serviceClient
          .from("contents")
          .update({
            settings_json: {
              ...settings,
              items: [newNotif, ...prevItems].slice(0, 60),
            },
          })
          .eq("id", notifRow.id);
      }
    } catch {}
  }

  return {
    ok: true,
    alreadyResolved: false,
    req,
    dueIso,
    dueLabel,
    proofDeleted: Boolean(
      originalProofUrl && (storageDeleted || originalProofUrl.startsWith("data:"))
    ),
  };
}
