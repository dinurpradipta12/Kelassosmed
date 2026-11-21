const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

interface CloudflareContextShape {
  env?: Record<string, unknown>;
}

/**
 * Resolves a server-side environment variable or secret across both Cloudflare
 * Workers (`@opennextjs/cloudflare` AsyncLocalStorage request context) and
 * standard Node.js (`process.env`).
 */
export function getServerEnv(key: string): string {
  try {
    const globalObj = globalThis as Record<PropertyKey, unknown>;
    const cfContext = globalObj[CLOUDFLARE_CONTEXT_SYMBOL] as
      | CloudflareContextShape
      | undefined;
    const cfValue = cfContext?.env?.[key];
    if (typeof cfValue === "string") {
      const trimmed = cfValue.trim();
      if (trimmed) return trimmed;
    }
  } catch {
    // Ignore errors outside Cloudflare Workers request context
  }

  try {
    const nodeValue = process.env[key];
    if (typeof nodeValue === "string") {
      const trimmed = nodeValue.trim();
      if (trimmed) return trimmed;
    }
  } catch {
    // Ignore errors if process.env is unavailable
  }

  return "";
}
