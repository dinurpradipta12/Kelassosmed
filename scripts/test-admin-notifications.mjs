#!/usr/bin/env node
/**
 * Script Simulasi Notifikasi Admin Ruang Sosmed 2.0
 * Menulis notifikasi Member Baru ("Say, Hi! ...") dan/atau Langganan PRO ("Yuhuu! ...")
 * langsung ke Supabase `public.contents` (__SYSTEM_ADMIN_NOTIFICATIONS__)
 * sehingga popup floating di kanan atas Admin Studio langsung muncul otomatis.
 *
 * Contoh penggunaan:
 *   node scripts/test-admin-notifications.mjs register "Dinur"
 *   node scripts/test-admin-notifications.mjs pro "Dinur" "Creator Academy Plan (PRO Bulanan)" "Rp 149.000 / bulan"
 *   node scripts/test-admin-notifications.mjs both "Dinur"
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://nigxfryaobokkvfefond.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZ3hmcnlhb2Jva2t2ZmVmb25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzI0MTMsImV4cCI6MjEwODY0ODQxM30.LWRL-PIPRgYUcY5l-emqI9TtG0HGQ2-T79PX-JMx-XU";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const envMap = {};
  if (!fs.existsSync(envPath)) return envMap;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    envMap[key] = val;
  }
  return envMap;
}

function buildNotif({ eventType, userName, userEmail, packageName, priceLabel }) {
  const cleanName = (userName || "").trim() || "Member Baru";
  const pkgLabel = (packageName || "").trim() || "Learner PRO Bulanan";
  const priceSuffix = priceLabel?.trim() ? ` (${priceLabel.trim()})` : "";
  const isRegister = eventType === "user_registered";

  return {
    id: `adm-${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    userName: cleanName,
    userEmail,
    packageName: isRegister ? undefined : pkgLabel,
    priceLabel: isRegister ? undefined : priceLabel?.trim() || undefined,
    title: isRegister
      ? "Say, Hi! 🎉 Member Baru Bergabung"
      : "Yuhuu! ⚡ Langganan PRO Baru",
    message: isRegister
      ? `Say, Hi! ${cleanName} telah bergabung ke Ruang Sosmed 2.0. Yuk sambut member baru dan bantu mereka memulai perjalanan belajarnya!`
      : `Yuhuu! ${cleanName} telah berlangganan dan mengambil paket ${pkgLabel}${priceSuffix}. Akses fitur eksklusifnya sudah aktif dan siap digunakan!`,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

function printHelp() {
  console.log(`
Penggunaan:
  node scripts/test-admin-notifications.mjs <register|pro|both> [nama] [namaPaket] [hargaLabel]

Contoh:
  node scripts/test-admin-notifications.mjs register "Dinur"
  node scripts/test-admin-notifications.mjs pro "Dinur" "Creator Academy Plan (PRO Bulanan)" "Rp 149.000 / bulan"
  node scripts/test-admin-notifications.mjs both "Dinur"
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const mode = (args[0] || "both").toLowerCase();
  if (!["register", "pro", "both"].includes(mode)) {
    console.error(`Mode tidak dikenal: "${mode}". Gunakan register, pro, atau both.`);
    printHelp();
    process.exit(1);
  }

  const userName = args[1] || "Dinur";
  const packageName = args[2] || "Creator Academy Plan (PRO Bulanan)";
  const priceLabel = args[3] || "Rp 149.000 / bulan";

  const fileEnv = loadEnvLocal();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  const adminEmail = (
    process.env.ADMIN_EMAIL ||
    fileEnv.ADMIN_EMAIL ||
    ""
  ).trim();
  const adminPassword = (
    process.env.ADMIN_PASSWORD ||
    fileEnv.ADMIN_PASSWORD ||
    ""
  ).trim();

  if (!serviceRoleKey && (!adminEmail || !adminPassword)) {
    console.error(
      "Autentikasi diperlukan karena tabel `contents` sudah diamankan dengan RLS!\n" +
        "Silakan isi salah satu di file `.env.local` (atau environment variable):\n" +
        "  1. SUPABASE_SERVICE_ROLE_KEY=...\n" +
        "  2. ADMIN_EMAIL=... dan ADMIN_PASSWORD=..."
    );
    process.exit(1);
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey || supabaseAnonKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  if (!serviceRoleKey) {
    const { data: authData, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
    if (signInErr || !authData?.user) {
      console.error(
        "Gagal login sebagai Admin:",
        signInErr?.message || "Kredensial tidak valid."
      );
      process.exit(1);
    }
  }

  const newItems = [];
  if (mode === "register" || mode === "both") {
    newItems.push(
      buildNotif({
        eventType: "user_registered",
        userName,
        userEmail: `${userName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
      })
    );
  }
  if (mode === "pro" || mode === "both") {
    newItems.push(
      buildNotif({
        eventType: "pro_subscribed",
        userName,
        userEmail: `${userName.toLowerCase().replace(/[^a-z0-9]/g, "")}.pro@example.com`,
        packageName,
        priceLabel,
      })
    );
  }

  const { data: rows, error: fetchError } = await supabase
    .from("contents")
    .select("id, settings_json")
    .eq("title", "__SYSTEM_ADMIN_NOTIFICATIONS__")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error("Gagal membaca __SYSTEM_ADMIN_NOTIFICATIONS__:", fetchError.message);
    process.exit(1);
  }

  const existingRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  const existingNotifs = Array.isArray(existingRow?.settings_json?.notifications)
    ? existingRow.settings_json.notifications
    : [];

  const merged = [...newItems, ...existingNotifs].slice(0, 50);
  const payload = {
    notifications: merged,
    updatedAt: new Date().toISOString(),
  };

  if (existingRow?.id) {
    const { error: updateErr } = await supabase
      .from("contents")
      .update({ settings_json: payload, status: "published" })
      .eq("id", existingRow.id);
    if (updateErr) {
      console.error("Gagal update __SYSTEM_ADMIN_NOTIFICATIONS__:", updateErr.message);
      process.exit(1);
    }
  } else {
    const { error: insertErr } = await supabase.from("contents").insert({
      id: crypto.randomUUID(),
      title: "__SYSTEM_ADMIN_NOTIFICATIONS__",
      type: "page",
      status: "published",
      description: "System storage for Admin activity notifications",
      urgency: "not_urgent",
      estimated_minutes: 0,
      points_reward: 0,
      settings_json: payload,
    });
    if (insertErr) {
      console.error("Gagal insert __SYSTEM_ADMIN_NOTIFICATIONS__:", insertErr.message);
      process.exit(1);
    }
  }

  console.log("Notifikasi uji coba berhasil dikirim ke Supabase:");
  for (const item of newItems) {
    console.log(`- [${item.eventType}] ${item.message}`);
  }
}

main().catch((err) => {
  console.error("Error menjalankan script:", err);
  process.exit(1);
});
