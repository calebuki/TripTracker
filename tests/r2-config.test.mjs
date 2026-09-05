import assert from "node:assert/strict";
import test from "node:test";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client, getR2Config, getR2PublicUrl, parseMediaUpload } from "../src/lib/r2-config.mjs";

const env = {
  R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET_NAME: "test-media", R2_PUBLIC_URL: "https://media.example.com",
  R2_ACCESS_KEY_ID: "test-key", R2_SECRET_ACCESS_KEY: "test-secret",
};
const upload = { tripId: "4d4b7dfe-3722-4c96-921e-4af9e8e4f762", contentType: "video/quicktime", size: 100 };

test("configuration fails closed and requires production HTTPS delivery", () => {
  assert.throws(() => getR2Config({}), /Missing/);
  for (const url of ["http://media.example.com", "https://test.r2.dev", "https://user:pass@media.example.com", "https://media.example.com/path"]) {
    assert.throws(() => getR2Config({ ...env, R2_PUBLIC_URL: url }));
  }
});

test("media URL encoding preserves filenames and rejects ambiguous paths", () => {
  const config = getR2Config(env);
  assert.equal(getR2PublicUrl(config, "owner/trip/café + photo.jpg"), "https://media.example.com/owner/trip/caf%C3%A9%20%2B%20photo.jpg");
  for (const key of ["../secret", "owner/./file", "/file", "owner//file"]) assert.throws(() => getR2PublicUrl(config, key));
});

test("upload validation prevents active content, traversal, and invalid sizes", () => {
  assert.equal(parseMediaUpload(upload).extension, "mov");
  for (const contentType of ["text/html", "image/svg+xml", "__proto__", "video/unknown"]) {
    assert.throws(() => parseMediaUpload({ ...upload, contentType }));
  }
  for (const size of [0, -1, 1.2, "100", 501 * 1024 * 1024]) assert.throws(() => parseMediaUpload({ ...upload, size }));
  assert.throws(() => parseMediaUpload({ ...upload, tripId: "../../other-owner" }));
});

test("signed uploads bind content type, size, cache policy, and overwrite protection", async () => {
  const config = getR2Config(env);
  const url = new URL(await getSignedUrl(createR2Client(config), new PutObjectCommand({
    Bucket: config.bucket, Key: "owner/trip/file.mov", ContentType: "video/quicktime", ContentLength: 100,
    CacheControl: "public, max-age=31536000, immutable", IfNoneMatch: "*",
  }), { expiresIn: 900, signableHeaders: new Set(["content-type", "content-length", "cache-control", "if-none-match"]) }));
  const headers = url.searchParams.get("X-Amz-SignedHeaders").split(";");
  for (const header of ["content-type", "content-length", "cache-control", "if-none-match"]) assert.ok(headers.includes(header));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "900");
  assert.ok(!url.href.includes(env.R2_SECRET_ACCESS_KEY));
});
