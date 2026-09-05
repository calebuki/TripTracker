// Node 22+. Run with --env-file=.env.vercel.production --env-file=.env.r2.local.
// Defaults to a read-only inventory. --copy copies and verifies, --switch changes
// only verified moment links. Supabase objects are never deleted by this script.
import { createHash } from "node:crypto";
import { mkdir, writeFile, appendFile, readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, getR2Config, getR2PublicUrl } from "../src/lib/r2-config.mjs";

const flags = new Set(process.argv.slice(2));
const manifestFlag = [...flags].find((flag) => flag.startsWith("--manifest="));
if (manifestFlag) flags.delete(manifestFlag);
if ([...flags].some((flag) => !["--copy", "--switch"].includes(flag))) {
  throw new Error("Usage: migrate-media-to-r2.mjs [--manifest=path] [--copy] [--switch]");
}
// A manifest exported through the authorized Supabase SQL connector lets a
// public bucket be copied without retrieving a production service secret.
const manifest = manifestFlag ? JSON.parse(await readFile(manifestFlag.slice(11), "utf8")) : null;
const sourceUrl = manifest?.sourceUrl || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!sourceUrl || (!secret && !manifest) || secret === "[SENSITIVE]") throw new Error("Provide a connector manifest or valid Supabase server credentials.");
if (manifest && flags.has("--switch")) throw new Error("Manifest mode only copies files. Apply verified link changes through the authenticated Supabase connector.");
const supabase = secret ? createClient(sourceUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const bucketName = manifest?.bucketName || process.env.NEXT_PUBLIC_CRUMBS_STORAGE_BUCKET || process.env.NEXT_PUBLIC_TRIPTRACE_STORAGE_BUCKET || "trip-moments";
const bucket = supabase?.storage.from(bucketName);
const objects = manifest?.objects ?? [];

async function listFolder(prefix = "") {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    for (const item of data) {
      const key = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) objects.push({ key, size: Number(item.metadata?.size ?? 0), contentType: item.metadata?.mimetype });
      else await listFolder(key);
    }
    if (data.length < 100) break;
  }
}

async function listMoments() {
  const result = [];
  let lastId;
  for (;;) {
    let query = supabase.from("moments").select("id,image_url,image_storage_path").order("id").limit(500);
    if (lastId) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...data);
    if (data.length < 500) break;
    lastId = data.at(-1).id;
  }
  return result;
}

function sourceKey(moment) {
  if (moment.image_storage_path?.startsWith("r2:")) return null;
  const publicPrefix = `${sourceUrl}/storage/v1/object/public/${bucketName}/`;
  if (!moment.image_url?.startsWith(publicPrefix)) return null;
  const urlKey = decodeURIComponent(new URL(moment.image_url).pathname.slice(new URL(publicPrefix).pathname.length));
  if (moment.image_storage_path && moment.image_storage_path !== urlKey) {
    throw new Error(`Mismatched source URL and path for moment ${moment.id}.`);
  }
  return urlKey;
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (!manifest) await listFolder();
const moments = manifest?.moments ?? await listMoments();
const objectKeys = new Set(objects.map((object) => object.key));
const pending = moments.map((moment) => ({ moment, key: sourceKey(moment) })).filter((item) => item.key);
const missing = pending.filter((item) => !objectKeys.has(item.key));
const directory = new URL("../.media-migration/", import.meta.url);
await mkdir(directory, { recursive: true });
const runId = new Date().toISOString().replaceAll(":", "-");
const report = new URL(`${runId}.jsonl`, directory);
await writeFile(new URL(`${runId}-inventory.json`, directory), JSON.stringify({ sourceUrl, bucketName, objects, moments }, null, 2));
console.log(JSON.stringify({ objects: objects.length, bytes: objects.reduce((sum, item) => sum + item.size, 0), moments: moments.length, pendingLinks: pending.length, missingSources: missing.length }));
if (missing.length) throw new Error("Referenced source files are missing. See the local inventory; no links changed.");
if (!flags.size) process.exit(0);

const config = getR2Config();
const r2 = createR2Client(config);
const verified = new Map();
for (const [index, object] of objects.entries()) {
  // Bound memory even if a different bucket is accidentally selected.
  if (object.size > 500 * 1024 * 1024) throw new Error("Object exceeds migration's 500 MB memory limit.");
  let data;
  if (manifest) {
    const source = `${sourceUrl}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${object.key.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(source, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Source download failed: ${response.status}.`);
    data = await response.blob();
  } else {
    const result = await bucket.download(object.key);
    if (result.error) throw result.error;
    data = result.data;
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length !== object.size) throw new Error(`Source size changed for object ${index + 1}. Rerun inventory.`);
  const sha256 = digest(bytes);
  let existing;
  try {
    existing = await r2.send(new HeadObjectCommand({ Bucket: config.bucket, Key: object.key }));
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw error;
  }
  if (!existing) {
    if (!flags.has("--copy")) throw new Error("Copy all objects before switching links.");
    await r2.send(new PutObjectCommand({
      Bucket: config.bucket, Key: object.key, Body: bytes, ContentLength: bytes.length,
      ContentType: object.contentType || data.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable", IfNoneMatch: "*",
      Metadata: { "source-sha256": sha256 },
    }));
  } else if (existing.ContentLength !== bytes.length) {
    throw new Error("Destination key already exists with a different size; refusing to overwrite.");
  }
  const copied = await r2.send(new GetObjectCommand({ Bucket: config.bucket, Key: object.key }));
  if (!copied.Body || digest(await copied.Body.transformToByteArray()) !== sha256) {
    throw new Error("R2 checksum mismatch; no links switched.");
  }
  const imageUrl = getR2PublicUrl(config, object.key);
  const publicResult = await fetch(imageUrl, { signal: AbortSignal.timeout(120_000) });
  if (!publicResult.ok || digest(Buffer.from(await publicResult.arrayBuffer())) !== sha256) {
    throw new Error("Public media delivery verification failed; no links switched.");
  }
  verified.set(object.key, { imageUrl, sha256, bytes: bytes.length });
  await appendFile(report, JSON.stringify({ action: "verified", key: object.key, sha256, bytes: bytes.length, imageUrl }) + "\n");
  console.log(`Verified ${index + 1}/${objects.length}`);
}

if (flags.has("--switch")) {
  // Refresh after copying: new uploads may have arrived during the transfer.
  const current = await listMoments();
  for (const moment of current) {
    const key = sourceKey(moment);
    if (key && !verified.has(key)) throw new Error("New media arrived during migration. Rerun copy before switching.");
  }
  for (const moment of current) {
    const key = sourceKey(moment);
    if (!key) continue;
    const copy = verified.get(key);
    // The inventory and intent are durable before the write, for rollback.
    await appendFile(report, JSON.stringify({ action: "switch-intent", id: moment.id, previous: moment, next: copy.imageUrl }) + "\n");
    let query = supabase.from("moments").update({ image_url: copy.imageUrl, image_storage_path: `r2:${key}` })
      .eq("id", moment.id).eq("image_url", moment.image_url);
    query = moment.image_storage_path === null ? query.is("image_storage_path", null) : query.eq("image_storage_path", moment.image_storage_path);
    const { data, error } = await query.select("id");
    if (error) throw error;
    if (data.length !== 1) throw new Error("A moment changed while switching links. Rerun to reconcile.");
    await appendFile(report, JSON.stringify({ action: "switched", id: moment.id, key }) + "\n");
  }
  const remaining = (await listMoments()).filter((moment) => sourceKey(moment));
  if (remaining.length) throw new Error("Some links still use Supabase. Rerun migration to reconcile.");
}
console.log(JSON.stringify({ verifiedObjects: verified.size, switchedLinks: flags.has("--switch"), sourceFilesDeleted: 0 }));
await writeFile(new URL(`${runId}-verified.json`, directory), JSON.stringify({
  sourceUrl, bucketName, destinationBucket: config.bucket, publicUrl: config.publicUrl,
  objects: [...verified].map(([key, value]) => ({ key, ...value })),
  links: pending.map(({ moment, key }) => ({ ...moment, key, nextUrl: verified.get(key).imageUrl })),
}, null, 2));
