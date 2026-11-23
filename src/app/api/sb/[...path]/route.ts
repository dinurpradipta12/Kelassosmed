// =============================================================================
// RUANG SOSMED 2.0 LMS — SAME-ORIGIN SUPABASE PROXY (`/api/sb/[...path]`)
// File: src/app/api/sb/[...path]/route.ts
// Resilient browser failover proxy for networks that block or reset *.supabase.co
// Strict path allowlist + header allowlist; NEVER attaches service role credentials.
// =============================================================================

import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server-env";
import {
  API_SECURITY_HEADERS,
  checkFetchMetadata,
} from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

const DEFAULT_SUPABASE_URL = "https://wdmfxlrdyqxnycbebwpv.supabase.co";

const ALLOWED_SUPABASE_PREFIXES = [
  "auth/v1",
  "rest/v1",
  "storage/v1",
  "functions/v1",
] as const;

const SAFE_REQUEST_HEADERS = [
  "apikey",
  "authorization",
  "content-type",
  "accept",
  "accept-profile",
  "content-profile",
  "prefer",
  "range",
  "x-client-info",
  "x-supabase-api-version",
  "x-upsert",
  "cache-control",
  "if-none-match",
  "if-match",
  "x-region",
] as const;

const SAFE_RESPONSE_HEADERS = [
  "content-type",
  "content-range",
  "cache-control",
  "etag",
  "vary",
  "location",
  "x-total-count",
  "content-disposition",
  "sb-gateway-version",
  "sb-request-id",
] as const;

function resolveUpstreamSupabaseBase(): string {
  const raw =
    getServerEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    getServerEnv("VITE_SUPABASE_URL") ||
    getServerEnv("SUPABASE_URL");
  const base =
    raw && !raw.includes("your-project-ref") ? raw : DEFAULT_SUPABASE_URL;
  return base.replace(/\/+$/, "");
}

function isSafePathSegments(segments: string[]): boolean {
  if (segments.length < 2) return false;
  for (const seg of segments) {
    if (
      !seg ||
      seg === "." ||
      seg === ".." ||
      seg.includes("..") ||
      seg.includes("\\") ||
      seg.includes("/")
    ) {
      return false;
    }
  }
  return true;
}

async function handleProxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const fetchMetaErr = checkFetchMetadata(request);
  if (fetchMetaErr) return fetchMetaErr;

  const { path = [] } = await context.params;
  if (!isSafePathSegments(path)) {
    return NextResponse.json(
      { error: "Invalid proxy path." },
      { status: 400, headers: API_SECURITY_HEADERS }
    );
  }

  const joinedPath = path.join("/");
  const isAllowedPrefix = ALLOWED_SUPABASE_PREFIXES.some(
    (prefix) => joinedPath === prefix || joinedPath.startsWith(`${prefix}/`)
  );
  if (!isAllowedPrefix) {
    return NextResponse.json(
      { error: "Supabase proxy endpoint not permitted." },
      { status: 403, headers: API_SECURITY_HEADERS }
    );
  }

  const reqUrl = new URL(request.url);
  const targetBase = resolveUpstreamSupabaseBase();
  const upstreamUrl = `${targetBase}/${joinedPath}${reqUrl.search}`;

  const upstreamHeaders = new Headers();
  for (const headerName of SAFE_REQUEST_HEADERS) {
    const val = request.headers.get(headerName);
    if (val !== null && val !== "") {
      upstreamHeaders.set(headerName, val);
    }
  }

  const method = request.method.toUpperCase();
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const bodyBuf = await request.arrayBuffer();
    if (bodyBuf.byteLength > 0) {
      body = bodyBuf;
    }
  }

  const isPublicStorageAsset =
    method === "GET" &&
    joinedPath.startsWith("storage/v1/object/public/") &&
    !request.headers.get("authorization");

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method,
      headers: upstreamHeaders,
      body,
      ...(isPublicStorageAsset ? {} : { cache: "no-store" as const }),
      redirect: "manual",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Upstream connection error";
    return NextResponse.json(
      { error: "Upstream authentication/database service unreachable.", detail: message },
      { status: 502, headers: API_SECURITY_HEADERS }
    );
  }

  const outHeaders = new Headers();
  for (const headerName of SAFE_RESPONSE_HEADERS) {
    const val = upstreamRes.headers.get(headerName);
    if (val !== null) {
      outHeaders.set(headerName, val);
    }
  }
  if (isPublicStorageAsset && upstreamRes.status === 200) {
    outHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  outHeaders.set("X-Content-Type-Options", "nosniff");

  const hasEmptyBody =
    method === "HEAD" ||
    upstreamRes.status === 204 ||
    upstreamRes.status === 304;

  const responseBody = hasEmptyBody ? null : await upstreamRes.arrayBuffer();

  return new Response(responseBody, {
    status: upstreamRes.status,
    headers: outHeaders,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, context);
}
