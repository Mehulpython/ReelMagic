import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "clerk-webhook" });

// ─── Svix Webhook Verification (Web Crypto API) ──────────────

async function verifySignature(
  payload: string,
  headerMap: Record<string, string>
): Promise<boolean> {
  const svixId = headerMap["svix-id"];
  const svixTimestamp = headerMap["svix-timestamp"];
  const svixSignature = headerMap["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    log.warn("Missing CLERK_WEBHOOK_SECRET");
    return false;
  }

  // Decode the base64 secret
  const keyBytes = Buffer.from(secret, "base64");

  // Construct the signed content
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

  // Compute HMAC-SHA256
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(signedContent)
  );

  // Convert to hex
  const computedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Compare with the provided signatures
  const signatures = svixSignature.split(" ").map((sig) => {
    const parts = sig.split(",");
    return parts.length > 1 ? parts[1] : parts[0];
  });

  return signatures.some((sig) => {
    try {
      return (
        computedHex.length === sig.length &&
        computedHex.split("").every((c, i) => c === sig[i])
      );
    } catch {
      return false;
    }
  });
}

export async function POST(req: Request) {
  const body = await req.text();

  // Collect headers for verification
  const hdrs = headers();
  const headerMap: Record<string, string> = {};
  hdrs.forEach((value, key) => {
    headerMap[key] = value;
  });

  const isValid = await verifySignature(body, headerMap);
  if (!isValid) {
    log.warn("Invalid Clerk webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { type, id: eventId, data } = event;

  const supabase = createServerClient();

  // ── Idempotency check ──
  try {
    const { count } = await supabase
      .from("processed_events")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("source", "clerk");

    if ((count ?? 0) > 0) {
      log.info({ eventId, type }, "Clerk event already processed, skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err, eventId }, "Failed to check Clerk idempotency — continuing anyway");
  }

  // ── Process ──
  if (type === "user.created") {
    const { error } = await supabase.from("profiles").upsert({
      id: data.id,
      email: data.email_addresses?.[0]?.email_address ?? "",
      full_name:
        `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
        data.username ||
        "",
      plan: "free",
      credits_remaining: 5,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "id",
    });

    if (error) {
      log.error({ err: error.message, eventId }, "Failed to create profile from Clerk webhook");
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    log.info({ userId: data.id, email: data.email_addresses?.[0]?.email_address }, "Profile created from Clerk webhook");
  }

  // ── Mark processed ──
  try {
    await supabase.from("processed_events").insert({
      event_id: eventId,
      event_type: type,
      source: "clerk",
      payload_json: data,
    });
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err, eventId }, "Failed to mark Clerk event as processed");
  }

  return NextResponse.json({ received: true });
}
