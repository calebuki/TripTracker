// Public, read-only delivery matches the existing public Supabase media bucket.
// Uploads use owner-authorized, short-lived S3 signatures from the Next.js API.
const mediaWorker = {
  async fetch(request, env) {
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    let key;
    try {
      key = decodeURIComponent(new URL(request.url).pathname.slice(1));
      if (!key || key.split("/").some((part) => !part || part === "." || part === "..")) throw new Error();
    } catch {
      return new Response("Not found", { status: 404 });
    }
    const metadata = await env.MEDIA.head(key);
    if (!metadata) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    metadata.writeHttpMetadata(headers);
    headers.set("ETag", metadata.httpEtag);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(metadata.size));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Content-Type-Options", "nosniff");
    // Media lives on its own origin, and active document formats cannot execute.
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    const noneMatch = request.headers.get("If-None-Match");
    if (noneMatch?.split(",").some((etag) => etag.trim() === metadata.httpEtag || etag.trim() === "*")) {
      headers.delete("Content-Length");
      return new Response(null, { status: 304, headers });
    }
    if (request.method === "HEAD") return new Response(null, { headers });

    let range;
    const requestedRange = request.headers.get("Range");
    const ifRange = request.headers.get("If-Range");
    if (requestedRange && (!ifRange || ifRange === metadata.httpEtag)) {
      range = parseRange(requestedRange, metadata.size);
      if (range === null) {
        headers.set("Content-Range", `bytes */${metadata.size}`);
        headers.set("Content-Length", "0");
        return new Response(null, { status: 416, headers });
      }
    }
    const object = await env.MEDIA.get(key, { range, onlyIf: { etagMatches: metadata.etag } });
    if (!object || !("body" in object)) {
      return new Response("Media changed. Please retry.", { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    if (range) {
      headers.set("Content-Length", String(range.length));
      headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`);
    }
    return new Response(object.body, { status: range ? 206 : 200, headers });
  },
};

export default mediaWorker;

export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  const suffix = !match[1];
  const offset = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= size || end < offset) return null;
  return { offset, length: end - offset + 1 };
}
