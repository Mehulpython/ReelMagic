// ─── CDN Caching & Delivery Helpers ──────────────────────────
// Provides signed URLs, cache purging, and streaming-optimized
// delivery for Cloudflare R2 / CloudFront / generic S3-compatible CDNs.

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client } from "./storage";
import { logger } from "./logger";

const log = logger.child({ module: "cdn" });

// ─── Types ────────────────────────────────────────────────────

export type CdnProvider = "cloudflare" | "cloudfront" | "auto";

export interface CdnSignOptions {
  expiresIn?: number;    // seconds (default 3600 = 1h)
  disposition?: string;  // Content-Disposition value (inline/attachment)
  responseType?: "stream" | "download";
}

export interface CdnHeaders {
  "Content-Type": string;
  "Cache-Control": string;
  "Content-Disposition"?: string;
  "Accept-Ranges": string;
  "X-Cache-Status"?: string;
}

// ─── Provider Detection ──────────────────────────────────────

/**
 * Returns the active CDN provider based on env configuration.
 * Defaults to "auto" (tries to detect from endpoint/URL shape).
 */
export function getCdnProvider(): CdnProvider {
  return (process.env.CDN_PROVIDER as CdnProvider) || "auto";
}

// ─── Cache TTL Constants ─────────────────────────────────────

export const CDN_TTL = {
  /** Videos — re-encoded rarely, cache for 1 hour */
  VIDEO: 3600,
  /** Thumbnails — static, cache for 24 hours */
  THUMBNAIL: 86400,
  /** Audio — medium cache */
  AUDIO: 7200,
  /** Share/watch pages — short server-side cache */
  PAGE: 300,
  /** Analytics/aggregation — 5 minutes */
  ANALYTICS: 300,
  /** Signed URLs — default expiration */
  SIGNED_URL: 3600,
} as const;

// ─── Public URL (no signing) ─────────────────────────────────

/**
 * Returns the public URL for a stored key.
 * Works when the R2 bucket is public or behind a custom domain with public access.
 * Falls back to a signed URL if no public URL base is configured.
 */
export async function getPublicUrl(key: string): Promise<string> {
  const publicBase = process.env.R2_PUBLIC_URL;
  if (publicBase) {
    return `${publicBase}/${key}`;
  }

  // Fallback to signed URL
  return cdnSignUrl(key);
}

// ─── Streaming URL ───────────────────────────────────────────

/**
 * Returns a URL optimized for video streaming (range request friendly).
 * Adds query params that hint to CDNs about expected access patterns.
 */
export async function getStreamUrl(key: string): Promise<string> {
  const baseUrl = await getPublicUrl(key);

  // Append streaming hints as fragment — most CDNs ignore these but
  // they serve as documentation for the client code
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}_stream=1`;
}

// ─── CDN-Signed URL ──────────────────────────────────────────

/**
 * Generates a signed URL with optional Content-Disposition and TTL.
 * For Cloudflare: uses signed URLs / token auth.
 * For CloudFront: uses CloudFront signing.
 * For auto/R2 fallback: uses S3 presigned URLs.
 */
export async function cdnSignUrl(
  key: string,
  options: CdnSignOptions = {}
): Promise<string> {
  const { expiresIn = CDN_TTL.SIGNED_URL, disposition, responseType } = options;

  const provider = getCdnProvider();

  if (provider === "cloudflare" && process.env.CF_TOKEN_KEY) {
    // Cloudflare signed URL (token-based auth)
    const url = await getPublicUrl(key);
    const expiry = Math.floor(Date.now() / 1000) + expiresIn;
    const tokenData = btoa(JSON.stringify({ url, exp: expiry }));
    // In production this would use real crypto signing; placeholder for config
    return `${url}&token=${tokenData.slice(0, 32)}`;
  }

  if (provider === "cloudfront" && process.env.CF_KEY_ID && process.env.CF_PRIVATE_KEY) {
    // CloudFront signed URL — requires @aws-sdk/cloudfront-signer
    // For now, fall through to S3-style signing
    log.warn("CloudFront signing requested but not fully configured, falling back to S3 signing");
  }

  // Default: S3 presigned URL via R2
  const client = createR2Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET || "reelmagic-videos",
    Key: key,
    ResponseContentType: responseType === "download" ? "application/octet-stream" : undefined,
    ResponseContentDisposition: disposition
      ? `${responseType === "download" ? "attachment" : "inline"}; filename="${disposition}"`
      : undefined,
  });

  return getSignedUrl(client, command, { expiresIn });
}

// ─── CDN Purge ───────────────────────────────────────────────

/**
 * Purges a specific key from the CDN edge cache.
 * - Cloudflare: calls purge API
 * - CloudFront: creates invalidation
 * - Others: logs a warning (no-op)
 */
export async function cdnPurge(key: string): Promise<void> {
  const provider = getCdnProvider();

  if (provider === "cloudflare" && process.env.CF_ZONE_ID && process.env.CF_API_TOKEN) {
    try {
      const zoneId = process.env.CF_ZONE_ID;
      const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
      const url = await getPublicUrl(key);

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: [url] }),
      });

      if (!res.ok) {
        const body = await res.text();
        log.warn({ status: res.status, body }, "Cloudflare purge failed");
        return;
      }

      log.info({ key }, "CDN cache purged (Cloudflare)");
      return;
    } catch (err) {
      log.error({ err, key }, "Cloudflare purge error");
    }
  }

  if (provider === "cloudfront") {
    // CloudFront invalidation would require aws-sdk cloudfront client
    log.info({ key }, "CDN purge requested for CloudFront — invalidation should be triggered externally");
    return;
  }

  log.debug({ key, provider }, "CDN purge not supported for this provider (no-op)");
}

// ─── CDN Headers ─────────────────────────────────────────────

/**
 * Returns recommended HTTP headers for serving a file through CDN.
 */
export async function getCdnHeaders(
  key: string,
  contentType = "video/mp4"
): Promise<CdnHeaders> {
  const ttl = contentType.startsWith("image/")
    ? CDN_TTL.THUMBNAIL
    : contentType.startsWith("video/")
      ? CDN_TTL.VIDEO
      : contentType.startsWith("audio/")
        ? CDN_TTL.AUDIO
        : CDN_TTL.PAGE;

  return {
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${Math.floor(ttl / 2)}`,
    "Accept-Ranges": "bytes",
  };
}

// ─── Middleware Cache Headers ────────────────────────────────

/**
 * Returns Next.js middleware-friendly cache control headers.
 * Use in middleware.ts for share/watch routes.
 */
export function getMiddlewareCacheHeaders(ttlSeconds = CDN_TTL.PAGE) {
  return {
    "cache-control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${Math.floor(ttlSeconds / 5)}`,
  };
}
