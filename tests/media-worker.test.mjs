import test from "node:test";
import assert from "node:assert/strict";
import worker, { parseRange } from "../cloudflare/media-worker.mjs";

test("video ranges support bounded, open-ended and suffix requests", () => {
  assert.deepEqual(parseRange("bytes=2-5", 10), { offset: 2, length: 4 });
  assert.deepEqual(parseRange("bytes=5-", 10), { offset: 5, length: 5 });
  assert.deepEqual(parseRange("bytes=-3", 10), { offset: 7, length: 3 });
  assert.deepEqual(parseRange("bytes=5-100", 10), { offset: 5, length: 5 });
  for (const value of ["bytes=10-", "bytes=5-2", "bytes=-0", "bytes=-", "bytes=0-1,4-5"]) assert.equal(parseRange(value, 10), null);
});

const bytes = new TextEncoder().encode("0123456789");
const metadata = { size: 10, etag: "test", httpEtag: '"test"', writeHttpMetadata: (headers) => headers.set("Content-Type", "video/mp4") };
const env = { MEDIA: {
  head: async () => metadata,
  get: async (_key, options) => ({ ...metadata, body: options.range ? bytes.slice(options.range.offset, options.range.offset + options.range.length) : bytes }),
} };

test("delivery returns correct video bytes and conditional responses", async () => {
  const result = await worker.fetch(new Request("https://media.example.com/file.mp4", { headers: { Range: "bytes=2-5" } }), env);
  assert.equal(result.status, 206);
  assert.equal(result.headers.get("Content-Range"), "bytes 2-5/10");
  assert.equal(result.headers.get("Content-Length"), "4");
  assert.equal(await result.text(), "2345");
  const cached = await worker.fetch(new Request("https://media.example.com/file.mp4", { headers: { "If-None-Match": '"test"' } }), env);
  assert.equal(cached.status, 304);
  assert.equal(await cached.text(), "");
  const head = await worker.fetch(new Request("https://media.example.com/file.mp4", { method: "HEAD" }), env);
  assert.equal(head.headers.get("Content-Length"), "10");
  assert.equal(await head.text(), "");
  const full = await worker.fetch(new Request("https://media.example.com/file.mp4", { headers: { Range: "bytes=2-5", "If-Range": '"old"' } }), env);
  assert.equal(full.status, 200);
  assert.equal(await full.text(), "0123456789");
});

test("delivery never exposes writes or bucket listing", async () => {
  assert.equal((await worker.fetch(new Request("https://media.example.com/file", { method: "PUT", body: "bad" }), env)).status, 405);
  assert.equal((await worker.fetch(new Request("https://media.example.com/"), env)).status, 404);
  assert.equal((await worker.fetch(new Request("https://media.example.com/file"), { MEDIA: { head: async () => null } })).status, 404);
});
