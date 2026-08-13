import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createError(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function createCountResponse(uniqueViewerCount: number) {
  return NextResponse.json(
    { uniqueViewerCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return null;
  }

  const { data, error } = await getSupabaseServerClient().auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

async function getTripAndUser(request: Request, tripId: string) {
  const [tripResult, userId] = await Promise.all([
    getSupabaseServerClient()
      .from("trips")
      .select("id, owner_id, privacy_mode")
      .eq("id", tripId)
      .maybeSingle(),
    getAuthenticatedUserId(request),
  ]);

  if (tripResult.error) {
    throw new Error(tripResult.error.message);
  }

  return { trip: tripResult.data, userId };
}

async function countTripViewers(tripId: string) {
  const [anonymousResult, userResult] = await Promise.all([
    getSupabaseServerClient()
      .from("trip_anonymous_views")
      .select("trip_id", { count: "exact", head: true })
      .eq("trip_id", tripId),
    getSupabaseServerClient()
      .from("trip_user_views")
      .select("trip_id", { count: "exact", head: true })
      .eq("trip_id", tripId),
  ]);

  if (anonymousResult.error || userResult.error) {
    throw new Error(
      anonymousResult.error?.message ??
        userResult.error?.message ??
        "Could not count trip viewers.",
    );
  }

  return (anonymousResult.count ?? 0) + (userResult.count ?? 0);
}

async function resolveAccessibleTrip(request: Request, tripId: string) {
  if (!uuidPattern.test(tripId)) {
    return null;
  }

  const { trip, userId } = await getTripAndUser(request, tripId);

  if (
    !trip ||
    (trip.privacy_mode !== "private_link" && trip.owner_id !== userId)
  ) {
    return null;
  }

  return { trip, userId };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    const access = await resolveAccessibleTrip(request, tripId);

    if (!access) {
      return createError("Trip not found.", 404);
    }

    return createCountResponse(await countTripViewers(tripId));
  } catch (error) {
    return createError(
      error instanceof Error ? error.message : "Could not load this viewer count.",
      500,
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await params;
    const access = await resolveAccessibleTrip(request, tripId);

    if (!access) {
      return createError("Trip not found.", 404);
    }

    if (access.trip.owner_id === access.userId) {
      return createCountResponse(await countTripViewers(tripId));
    }

    const payload = (await request.json().catch(() => null)) as
      | { visitorId?: unknown }
      | null;
    const visitorId =
      typeof payload?.visitorId === "string" ? payload.visitorId : "";

    if (!access.userId && !uuidPattern.test(visitorId)) {
      return createError("Could not identify this browser.");
    }

    const { error } = access.userId
      ? await getSupabaseServerClient().from("trip_user_views").insert({
          trip_id: tripId,
          user_id: access.userId,
        })
      : await getSupabaseServerClient().from("trip_anonymous_views").insert({
          trip_id: tripId,
          visitor_id: visitorId,
        });

    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }

    return createCountResponse(await countTripViewers(tripId));
  } catch (error) {
    return createError(
      error instanceof Error ? error.message : "Could not record this trip view.",
      500,
    );
  }
}
