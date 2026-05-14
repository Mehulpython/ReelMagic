import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── R2 Client ───────────────────────────────────────────────

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

const BUCKET = process.env.R2_BUCKET || "reelmagic-videos";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// ─── Upload ──────────────────────────────────────────────────

export async function uploadToR2(
  key: string,
  data: Buffer | Uint8Array,
  contentType: string = "video/mp4"
): Promise<string> {
  const client = createR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  // Return public URL if configured, else signed URL
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }

  return await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}

export async function uploadFromUrl(
  url: string,
  key: string,
  contentType: string = "video/mp4"
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadToR2(key, buffer, contentType);
}

// ─── Signed URLs ─────────────────────────────────────────────

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = createR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

// ─── Delete ──────────────────────────────────────────────────

export async function deleteFromR2(key: string): Promise<void> {
  const client = createR2Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  );
}

// ─── Key Helpers ─────────────────────────────────────────────

export function videoKey(userId: string, jobId: string) {
  return `videos/${userId}/${jobId}.mp4`;
}

export function thumbnailKey(userId: string, jobId: string) {
  return `thumbnails/${userId}/${jobId}.jpg`;
}

export function audioKey(userId: string, jobId: string, type: "voiceover" | "bgm") {
  return `audio/${userId}/${jobId}-${type}.mp3`;
}
