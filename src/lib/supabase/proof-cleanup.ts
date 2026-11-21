import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_PROOF_BUCKETS = new Set([
  "ruang-sosmed-attachments",
  "ruang-sosmed-media",
]);

const ALLOWED_PROOF_FOLDER_FRAGMENTS = [
  "pro-proofs/",
  "item-unlock-proofs/",
  "checkout-proofs/",
];

/**
 * Extracts Supabase Storage bucket & object path from a payment proof URL.
 * Strictly allowlists payment-proof folders so unrelated assets are never deleted.
 */
export function extractPaymentProofStorageTarget(
  proofUrl?: string | null
): { bucket: string; path: string } | null {
  const raw = String(proofUrl || "").trim();
  if (!raw || raw.startsWith("data:")) return null;

  try {
    const parsed = new URL(raw);
    const match =
      /\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/.exec(
        parsed.pathname
      );
    if (!match) return null;

    const bucket = decodeURIComponent(match[1] || "").trim();
    const objectPath = decodeURIComponent(match[2] || "").replace(/^\/+/, "");

    if (!ALLOWED_PROOF_BUCKETS.has(bucket) || !objectPath) {
      return null;
    }

    const lowerPath = objectPath.toLowerCase();
    const isPaymentProofPath = ALLOWED_PROOF_FOLDER_FRAGMENTS.some((frag) =>
      lowerPath.includes(frag)
    );
    if (!isPaymentProofPath) {
      return null;
    }

    return { bucket, path: objectPath };
  } catch {
    return null;
  }
}

/**
 * Deletes an uploaded payment proof file from Supabase Storage.
 * Safe no-op if the proof is a data URL or non-storage URL.
 */
export async function deletePaymentProofFromStorage(
  client: SupabaseClient,
  proofUrl?: string | null
): Promise<boolean> {
  const target = extractPaymentProofStorageTarget(proofUrl);
  if (!target) return false;

  try {
    const { error } = await client.storage
      .from(target.bucket)
      .remove([target.path]);
    return !error;
  } catch {
    return false;
  }
}
