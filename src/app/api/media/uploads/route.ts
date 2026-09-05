import "server-only";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client, getR2Config, getR2PublicUrl, parseMediaUpload } from "@/lib/r2-config.mjs";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Please sign in to upload." }, 401);
  if (process.env.NEXT_PUBLIC_CRUMBS_MEDIA_STORAGE !== "r2") {
    return json({ error: "Media uploads are not configured for Cloudflare yet." }, 503);
  }

  let upload;
  try {
    upload = parseMediaUpload(await request.json());
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid upload." }, 400);
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Please sign in to upload." }, 401);
    const { data: trip, error: tripError } = await supabase.from("trips")
      .select("id, end_date").eq("id", upload.tripId).eq("owner_id", auth.user.id).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return json({ error: "Trip not found." }, 404);
    if (trip.end_date) {
      const { data: activeTrips, error } = await supabase.from("trips").select("id")
        .eq("owner_id", auth.user.id).is("end_date", null).neq("id", trip.id).limit(1);
      if (error) throw error;
      if (activeTrips?.length) return json({ error: "End your active trip before adding to a past trip." }, 409);
    }

    const config = getR2Config();
    const key = `${auth.user.id}/${trip.id}/${randomUUID()}.${upload.extension}`;
    const headers = { "Content-Type": upload.contentType, "Cache-Control": "public, max-age=31536000, immutable", "If-None-Match": "*" };
    const url = await getSignedUrl(createR2Client(config), new PutObjectCommand({
      Bucket: config.bucket, Key: key, ContentType: upload.contentType,
      ContentLength: upload.size, CacheControl: headers["Cache-Control"], IfNoneMatch: "*",
    }), {
      expiresIn: 900,
      signableHeaders: new Set(["content-type", "content-length", "cache-control", "if-none-match"]),
    });
    return json({ uploadUrl: url, headers, imageUrl: getR2PublicUrl(config, key), imageStoragePath: `r2:${key}` });
  } catch (error) {
    console.error("Could not prepare media upload", error instanceof Error ? error.name : "Storage error");
    return json({ error: "Could not prepare your upload. Please try again." }, 503);
  }
}
