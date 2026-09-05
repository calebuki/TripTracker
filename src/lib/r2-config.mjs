import { S3Client } from "@aws-sdk/client-s3";

export function getR2Config(env = process.env) {
  const required = (name) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing ${name}.`);
    return value;
  };
  const accountId = required("R2_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("Invalid R2_ACCOUNT_ID.");
  const publicUrl = new URL(required("R2_PUBLIC_URL"));
  if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password ||
      publicUrl.search || publicUrl.hash || publicUrl.pathname !== "/" ||
      publicUrl.hostname.endsWith(".r2.dev")) {
    throw new Error("R2_PUBLIC_URL must be an HTTPS production media origin without a path.");
  }
  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    bucket: required("R2_BUCKET_NAME"),
    publicUrl: publicUrl.origin,
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  };
}

export function createR2Client(config) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function getR2PublicUrl(config, key) {
  // Encode each segment so spaces, plus signs, and Unicode survive migration.
  if (!key || key.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid media object key.");
  }
  return `${config.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

const mediaTypes = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/avif": "avif", "image/heic": "heic",
  "image/heif": "heif", "image/tiff": "tif", "image/bmp": "bmp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
  "video/x-m4v": "m4v", "video/ogg": "ogv", "video/x-msvideo": "avi",
};

export function parseMediaUpload(value) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!value || typeof value !== "object" || !uuid.test(value.tripId ?? "")) {
    throw new Error("A valid trip is required.");
  }
  const contentType = typeof value.contentType === "string" ? value.contentType.toLowerCase() : "";
  if (!Object.hasOwn(mediaTypes, contentType)) throw new Error("Choose a supported photo or video.");
  if (!Number.isSafeInteger(value.size) || value.size <= 0 || value.size > 500 * 1024 * 1024) {
    throw new Error("Choose a photo or video smaller than 500 MB.");
  }
  return { tripId: value.tripId, contentType, size: value.size, extension: mediaTypes[contentType] };
}
