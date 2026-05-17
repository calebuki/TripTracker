import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { MomentComment, MomentCommentAuthorKind } from "@/types/crumbs";

export const runtime = "nodejs";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type MomentRow = Pick<
  Database["public"]["Tables"]["moments"]["Row"],
  "id" | "trip_id" | "visibility"
>;
type CommenterRow = Pick<
  Database["public"]["Tables"]["trip_commenters"]["Row"],
  "id" | "display_number"
>;
type CommentRow = Database["public"]["Tables"]["moment_comments"]["Row"] & {
  trip_commenters?: CommenterRow | CommenterRow[] | null;
};

const maxCommentLength = 1000;

function createError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function hashCommenterToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeBody(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+\n/g, "\n");
}

function getCommenterNumber(row: CommentRow) {
  const commenter = Array.isArray(row.trip_commenters)
    ? row.trip_commenters[0]
    : row.trip_commenters;

  return commenter?.display_number ?? null;
}

function mapComment(row: CommentRow, trip: TripRow): MomentComment {
  const isTraveler = row.author_id === trip.owner_id;
  const commenterNumber = isTraveler ? null : getCommenterNumber(row);

  return {
    id: row.id,
    tripId: row.trip_id,
    momentId: row.moment_id,
    body: row.body,
    authorKind: isTraveler ? "traveler" : "viewer",
    authorLabel: isTraveler ? "OP" : `#${commenterNumber ?? "?"}`,
    commenterNumber,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getMomentAndTrip(momentId: string) {
  const supabase = getSupabaseServerClient();
  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("id, trip_id, visibility")
    .eq("id", momentId)
    .maybeSingle();

  if (momentError) {
    throw new Error(momentError.message);
  }

  if (!moment) {
    return null;
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", moment.trip_id)
    .maybeSingle();

  if (tripError) {
    throw new Error(tripError.message);
  }

  if (!trip) {
    return null;
  }

  return {
    moment: moment as MomentRow,
    trip: trip as TripRow,
  };
}

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

async function canAccessMoment(
  request: Request,
  moment: MomentRow,
  trip: TripRow,
) {
  if (trip.privacy_mode === "private_link" && moment.visibility === "visible") {
    return true;
  }

  const userId = await getAuthenticatedUserId(request);
  return userId === trip.owner_id;
}

async function claimCommenter(tripId: string, token: string) {
  const supabase = getSupabaseServerClient();
  const tokenHash = hashCommenterToken(token);
  const existing = await supabase
    .from("trip_commenters")
    .select("id, display_number")
    .eq("trip_id", tripId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as CommenterRow;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: latest, error: latestError } = await supabase
      .from("trip_commenters")
      .select("display_number")
      .eq("trip_id", tripId)
      .order("display_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      throw new Error(latestError.message);
    }

    const displayNumber = ((latest?.display_number as number | undefined) ?? 0) + 1;
    const inserted = await supabase
      .from("trip_commenters")
      .insert({
        trip_id: tripId,
        token_hash: tokenHash,
        display_number: displayNumber,
      })
      .select("id, display_number")
      .single();

    if (!inserted.error && inserted.data) {
      return inserted.data as CommenterRow;
    }

    if (inserted.error.code !== "23505") {
      throw new Error(inserted.error.message);
    }

    const retryExisting = await supabase
      .from("trip_commenters")
      .select("id, display_number")
      .eq("trip_id", tripId)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (retryExisting.error) {
      throw new Error(retryExisting.error.message);
    }

    if (retryExisting.data) {
      return retryExisting.data as CommenterRow;
    }
  }

  throw new Error("Could not assign this commenter number yet.");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ momentId: string }> },
) {
  try {
    const { momentId } = await params;
    const context = await getMomentAndTrip(momentId);

    if (!context) {
      return createError("Moment not found.", 404);
    }

    const { moment, trip } = context;

    if (!(await canAccessMoment(request, moment, trip))) {
      return createError("Comments are not available for this moment.", 403);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("moment_comments")
      .select("*, trip_commenters (id, display_number)")
      .eq("moment_id", moment.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      comments: ((data ?? []) as CommentRow[]).map((row) => mapComment(row, trip)),
    });
  } catch (error) {
    return createError(
      error instanceof Error ? error.message : "Could not load comments.",
      500,
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ momentId: string }> },
) {
  try {
    const { momentId } = await params;
    const payload = (await request.json().catch(() => null)) as {
      authorKind?: MomentCommentAuthorKind;
      body?: unknown;
      commenterToken?: unknown;
    } | null;
    const body = normalizeBody(payload?.body);

    if (!body) {
      return createError("Write a comment before posting.");
    }

    if (body.length > maxCommentLength) {
      return createError(`Comments can be up to ${maxCommentLength} characters.`);
    }

    const context = await getMomentAndTrip(momentId);

    if (!context) {
      return createError("Moment not found.", 404);
    }

    const { moment, trip } = context;
    const requestedAuthorKind = payload?.authorKind ?? "viewer";
    const supabase = getSupabaseServerClient();
    let authorId: string | null = null;
    let commenterId: string | null = null;

    if (requestedAuthorKind === "traveler") {
      const userId = await getAuthenticatedUserId(request);

      if (userId !== trip.owner_id) {
        return createError("Only the traveler can post as OP.", 403);
      }

      authorId = trip.owner_id;
    } else {
      if (trip.privacy_mode !== "private_link" || moment.visibility !== "visible") {
        return createError("Comments are not available for this moment.", 403);
      }

      if (typeof payload?.commenterToken !== "string" || payload.commenterToken.length < 12) {
        return createError("Could not identify this anonymous commenter.");
      }

      const commenter = await claimCommenter(trip.id, payload.commenterToken);
      commenterId = commenter.id;
    }

    const { data, error } = await supabase
      .from("moment_comments")
      .insert({
        trip_id: trip.id,
        moment_id: moment.id,
        commenter_id: commenterId,
        author_id: authorId,
        body,
      })
      .select("*, trip_commenters (id, display_number)")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not save this comment.");
    }

    return NextResponse.json({
      comment: mapComment(data as CommentRow, trip),
    });
  } catch (error) {
    return createError(
      error instanceof Error ? error.message : "Could not save this comment.",
      500,
    );
  }
}
