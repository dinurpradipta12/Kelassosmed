"use client";

import {
  supabase,
  isSupabaseConfigured,
  type StorageBucketName,
} from "@/lib/supabase/client";

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  preferPng?: boolean;
}

export interface CompressedImageResult {
  blob: Blob;
  mimeType: string;
  ext: string;
  previewDataUrl: string;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Empty file data"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}

function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Resize & kompres gambar di browser ke WebP (atau PNG jika butuh transparansi)
 * sebelum diunggah ke Supabase Storage agar database & Egress tetap hemat.
 */
export async function compressImageToBlob(
  file: File | Blob,
  options?: CompressImageOptions
): Promise<CompressedImageResult> {
  const originalType = (file.type || "image/png").toLowerCase();

  if (originalType === "image/svg+xml" || typeof window === "undefined") {
    const previewDataUrl = await readBlobAsDataUrl(file);
    return {
      blob: file,
      mimeType: originalType || "application/octet-stream",
      ext: originalType === "image/svg+xml" ? "svg" : "png",
      previewDataUrl,
    };
  }

  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 720;
  const quality = options?.quality ?? 0.82;
  const preferPng = options?.preferPng ?? false;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const naturalW = img.naturalWidth || img.width || maxWidth;
    const naturalH = img.naturalHeight || img.height || maxHeight;

    let targetW = naturalW;
    let targetH = naturalH;
    if (targetW > maxWidth || targetH > maxHeight) {
      const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
      targetW = Math.max(1, Math.round(targetW * ratio));
      targetH = Math.max(1, Math.round(targetH * ratio));
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallbackUrl = await readBlobAsDataUrl(file);
      return {
        blob: file,
        mimeType: originalType,
        ext: originalType.includes("png") ? "png" : "jpg",
        previewDataUrl: fallbackUrl,
      };
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);

    let outBlob: Blob | null = null;
    let outMime = preferPng ? "image/png" : "image/webp";
    let outExt = preferPng ? "png" : "webp";

    if (!preferPng) {
      const webpBlob = await canvasToBlobAsync(canvas, "image/webp", quality);
      if (webpBlob && webpBlob.type === "image/webp") {
        outBlob = webpBlob;
      } else {
        outMime = "image/jpeg";
        outExt = "jpg";
        outBlob = await canvasToBlobAsync(canvas, "image/jpeg", quality);
      }
    } else {
      outBlob = await canvasToBlobAsync(canvas, "image/png");
    }

    if (!outBlob) {
      const fallbackUrl = await readBlobAsDataUrl(file);
      return {
        blob: file,
        mimeType: originalType,
        ext: originalType.includes("png") ? "png" : "jpg",
        previewDataUrl: fallbackUrl,
      };
    }

    const previewDataUrl = await readBlobAsDataUrl(outBlob);
    return {
      blob: outBlob,
      mimeType: outMime,
      ext: outExt,
      previewDataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface UploadOptimizedImageOptions extends CompressImageOptions {
  bucket: StorageBucketName;
  folderPath: string;
  fileName?: string;
  upsert?: boolean;
}

/**
 * Mengompresi gambar di browser lalu mengunggahnya ke Supabase Storage CDN (`cacheControl: 31536000`).
 * Mengembalikan URL CDN pendek untuk disimpan di database (fallback ke previewDataUrl terkompresi jika gagal).
 */
export async function uploadOptimizedImageToStorage(
  fileOrBlob: File | Blob,
  options: UploadOptimizedImageOptions
): Promise<{ url: string; uploadedToStorage: boolean }> {
  const compressed = await compressImageToBlob(fileOrBlob, options);

  if (!isSupabaseConfigured) {
    return { url: compressed.previewDataUrl, uploadedToStorage: false };
  }

  try {
    const rawBaseName = (
      options.fileName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : "image")
    )
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 48);

    const safeBaseName = rawBaseName || "asset";
    const cleanFolder = options.folderPath.replace(/^\/+|\/+$/g, "");
    const randomSuffix = Math.random().toString(36).slice(2, 7);
    const storagePath = `${cleanFolder}/${Date.now()}_${randomSuffix}_${safeBaseName}.${compressed.ext}`;

    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(storagePath, compressed.blob, {
        cacheControl: "31536000",
        contentType: compressed.mimeType,
        upsert: options.upsert ?? false,
      });

    if (error || !data?.path) {
      return { url: compressed.previewDataUrl, uploadedToStorage: false };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(options.bucket).getPublicUrl(data.path);

    if (!publicUrl) {
      return { url: compressed.previewDataUrl, uploadedToStorage: false };
    }

    return { url: publicUrl, uploadedToStorage: true };
  } catch {
    return { url: compressed.previewDataUrl, uploadedToStorage: false };
  }
}
