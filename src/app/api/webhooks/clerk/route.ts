import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// ─── Svix Webhook Verification (Web Crypto API) ──────────────
async function verifySignature(
  payload: string,
  headerMap: Record<string, string>
): Promise<boolean> {
  const svixId = headerMap["svix-id"];
  const svixTimestamp = headerMap["svix-timestamp"];
  const svixSignature = headerMap["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return false;

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
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const { type, data } = event;

  if (type === "user.created") {
    const supabase = createServerClient();

    const { error } = await supabase.from("profiles").upsert({
      id: data.id,
      email: data.email_addresses?.[0]?.email_address ?? "",
      full_name:
        `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
        data.username ||
        "",
      plan: "free",
      credits: 10,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Clerk Webhook] Failed to create profile:", error);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    console.log("[Clerk Webhook] Profile created for user:", data.id);
  }

  return NextResponse.json({ received: true });
}
