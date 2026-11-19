#!/usr/bin/env node
/**
 * Script Migrasi Base64 (`data:image/...`) -> Supabase Storage CDN (`cacheControl: 31536000`)
 * Memindahkan gambar Base64 lama yang membengkak di tabel Postgres ke Storage Bucket publik
 * untuk menurunkan Database Size & Egress Supabase secara permanen.
 *
 * Penggunaan:
 *   node scripts/migrate-base64-to-storage.mjs --dry-run
 *   node scripts/migrate-base64-to-storage.mjs
 *
 * Membutuhkan di `.env.local` (atau env):
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://nigxfryaobokkvfefond.supabase.co";
const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/;

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

function extFromMime(mime) {
  const m = mime.toLowerCase();
  if (m.includes("webp")) return "webp";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("svg")) return "svg";
  if (m.includes("gif")) return "gif";
  return "png";
}

function parseDataImageUrl(str) {
  if (typeof str !== "string" || !str.startsWith("data:image/")) return null;
  const match = DATA_URL_REGEX.exec(str.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const base64Clean = match[2].replace(/[\r\n\s]/g, "");
  const buffer = Buffer.from(base64Clean, "base64");
  return {
    mimeType,
    ext: extFromMime(mimeType),
    buffer,
    originalBytes: str.length,
  };
}

function safePathSegment(val) {
  return String(val || "item")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 64);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Penggunaan:
  node scripts/migrate-base64-to-storage.mjs --dry-run   # Cek berapa data Base64 tanpa mengubah DB
  node scripts/migrate-base64-to-storage.mjs             # Upload ke Storage & update DB URL
`);
    process.exit(0);
  }

  const fileEnv = loadEnvLocal();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!serviceRoleKey) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY diperlukan di `.env.local` (atau env) agar dapat membaca & memperbarui seluruh baris database secara aman.\n" +
        "Tambahkan `SUPABASE_SERVICE_ROLE_KEY=...` ke `.env.local`, lalu jalankan ulang script ini."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats = {
    mode: dryRun ? "DRY RUN" : "LIVE MIGRATION",
    imagesFound: 0,
    imagesMigrated: 0,
    rowsUpdated: 0,
    totalBase64BytesSaved: 0,
  };

  async function convertDataUrl(dataUrl, bucket, folderPath) {
    const parsed = parseDataImageUrl(dataUrl);
    if (!parsed) return { changed: false, value: dataUrl };

    stats.imagesFound += 1;
    stats.totalBase64BytesSaved += parsed.originalBytes;

    if (dryRun) {
      return { changed: true, value: `[dry-run:${bucket}/${folderPath}]` };
    }

    const hash = crypto
      .createHash("sha1")
      .update(parsed.buffer)
      .digest("hex")
      .slice(0, 12);
    const storagePath = `${folderPath}/${hash}.${parsed.ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, parsed.buffer, {
        cacheControl: "31536000",
        contentType: parsed.mimeType,
        upsert: true,
      });

    if (error || !data?.path) {
      console.warn(`Gagal upload ke ${bucket}/${storagePath}:`, error?.message);
      return { changed: false, value: dataUrl };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    if (!publicUrl) return { changed: false, value: dataUrl };
    stats.imagesMigrated += 1;
    return { changed: true, value: publicUrl };
  }

  async function walkJson(node, bucket, folderPath) {
    if (typeof node === "string") {
      return convertDataUrl(node, bucket, folderPath);
    }
    if (Array.isArray(node)) {
      let anyChanged = false;
      const nextArr = [];
      for (const item of node) {
        const res = await walkJson(item, bucket, folderPath);
        if (res.changed) anyChanged = true;
        nextArr.push(res.value);
      }
      return { changed: anyChanged, value: anyChanged ? nextArr : node };
    }
    if (node && typeof node === "object") {
      let anyChanged = false;
      const nextObj = { ...node };
      for (const [k, v] of Object.entries(node)) {
        const res = await walkJson(v, bucket, folderPath);
        if (res.changed) {
          anyChanged = true;
          nextObj[k] = res.value;
        }
      }
      return { changed: anyChanged, value: anyChanged ? nextObj : node };
    }
    return { changed: false, value: node };
  }

  async function processTable({ table, pkCol, bucket, columns }) {
    const selectCols = [pkCol, ...columns].join(", ");
    const { data: rows, error } = await supabase.from(table).select(selectCols);
    if (error) {
      console.log(`- Lewati ${table}: ${error.message}`);
      return;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`- ${table}: 0 baris`);
      return;
    }

    let tableChangedRows = 0;
    for (const row of rows) {
      const pkVal = row[pkCol];
      const folder = `migrated/${table}/${safePathSegment(pkVal)}`;
      const patch = {};
      let rowHasChange = false;

      for (const col of columns) {
        if (row[col] == null) continue;
        const res = await walkJson(row[col], bucket, folder);
        if (res.changed) {
          patch[col] = res.value;
          rowHasChange = true;
        }
      }

      if (rowHasChange) {
        tableChangedRows += 1;
        if (!dryRun) {
          const { error: updErr } = await supabase
            .from(table)
            .update(patch)
            .eq(pkCol, pkVal);
          if (updErr) {
            console.warn(`Gagal update ${table} (${pkVal}):`, updErr.message);
          } else {
            stats.rowsUpdated += 1;
          }
        }
      }
    }

    console.log(
      `- ${table}: ${rows.length} baris diperiksa, ${tableChangedRows} baris mengandung Base64 image`
    );
  }

  console.log(`=== Mulai Scan Base64 Images [${stats.mode}] ===`);
  await processTable({
    table: "contents",
    pkCol: "id",
    bucket: "ruang-sosmed-media",
    columns: ["thumbnail_url", "settings_json"],
  });
  await processTable({
    table: "landing_pages",
    pkCol: "id",
    bucket: "ruang-sosmed-media",
    columns: ["header_image_url", "blocks", "header_config", "payment_config"],
  });
  await processTable({
    table: "learner_pro_settings",
    pkCol: "id",
    bucket: "ruang-sosmed-media",
    columns: ["qr_code_url", "packages", "config"],
  });
  await processTable({
    table: "profiles",
    pkCol: "id",
    bucket: "ruang-sosmed-avatars",
    columns: ["avatar_url", "header_url"],
  });
  await processTable({
    table: "user_profiles",
    pkCol: "username",
    bucket: "ruang-sosmed-avatars",
    columns: ["avatar_url", "header_url"],
  });

  const savedMb = (stats.totalBase64BytesSaved / (1024 * 1024)).toFixed(2);
  console.log("\n=== Ringkasan ===");
  console.log(`Mode                 : ${stats.mode}`);
  console.log(`Gambar Base64 ditemui: ${stats.imagesFound}`);
  console.log(`Ukuran Base64 total  : ${savedMb} MB`);
  if (!dryRun) {
    console.log(`Gambar diunggah CDN  : ${stats.imagesMigrated}`);
    console.log(`Baris DB diperbarui  : ${stats.rowsUpdated}`);
  } else {
    console.log("Jalankan tanpa `--dry-run` untuk mengeksekusi migrasi ke Supabase Storage.");
  }
}

main().catch((err) => {
  console.error("Error menjalankan migrasi Base64:", err);
  process.exit(1);
});
