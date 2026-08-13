import { nanoid } from "nanoid";

import { getAnonymousCommenterToken } from "@/lib/commenter-token";
import { hashPasscode } from "@/lib/crypto";
import { normalizeDisplayName, validateDisplayName } from "@/lib/display-name";
import { publicEnv } from "@/lib/env";
import type { TripRepository } from "@/lib/repositories/types";
import { generateShareCode } from "@/lib/share-code";
import { sortMomentsChronologically } from "@/lib/time";
import { clampPublishDelayHours } from "@/lib/trip-sharing";
import { getAnonymousViewerId } from "@/lib/viewer-token";
import {
  getRememberMePreference,
  getSupabaseBrowserClient,
  setRememberMePreference,
} from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type {
  CreateMomentInput,
  CreateMomentCommentInput,
  CreateTripInput,
  Moment,
  MomentComment,
  Trip,
  TripRecord,
  CrumbsUser,
  UpdateMomentInput,
  UpdateTripSettingsInput,
  WatchedTrip,
} from "@/types/crumbs";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type MomentRow = Database["public"]["Tables"]["moments"]["Row"];
type TripWatchRow = Database["public"]["Tables"]["trip_watches"]["Row"];
type TripWithMomentsRow = TripRow & {
  moments?: MomentRow[] | null;
};

const authRequestTimeoutMs = 8_000;
const queryRequestTimeoutMs = 8_000;
const requestTimeoutMessage =
  "Crumbs took too long to reach Supabase. Please try again.";
const tripRecordSelect = `
  *,
  moments (*)
`;

function formatSupabaseError(error: { code?: string; message?: string } | null) {
  if (
    error?.code === "PGRST205" &&
    error.message?.includes("schema cache")
  ) {
    return "Crumbs' Supabase schema has not been applied to this project yet.";
  }

  if (
    error?.code === "23503" &&
    error.message?.includes("owner_id")
  ) {
    return "Crumbs couldn't finish setting up your traveler profile yet. Please refresh and try again.";
  }

  if (
    error?.message?.includes("AbortError") ||
    error?.message?.includes("The user aborted a request")
  ) {
    return requestTimeoutMessage;
  }

  return error?.message ?? "Crumbs could not reach Supabase.";
}

function mapUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: { display_name?: string };
  created_at?: string;
}): CrumbsUser {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: user.user_metadata?.display_name ?? null,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}

function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    timezone: row.timezone,
    shareSlug: row.share_slug,
    shareCode: row.share_code,
    viewerPasscodeHash: row.viewer_passcode_hash,
    privacyMode: row.privacy_mode,
    locationPrivacyMode: row.location_privacy_mode,
    publishDelayHours: row.publish_delay_hours,
    theme: row.theme,
    coverLocationName: row.cover_location_name,
    coverLatitude: row.cover_latitude,
    coverLongitude: row.cover_longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMoment(row: MomentRow): Moment {
  return {
    id: row.id,
    tripId: row.trip_id,
    authorId: row.author_id,
    type: row.type,
    caption: row.caption,
    thoughtText: row.thought_text,
    imageUrl: row.image_url,
    imageStoragePath: row.image_storage_path,
    latitude: row.latitude,
    longitude: row.longitude,
    placeName: row.place_name,
    locationSource: row.location_source,
    accuracyMeters: row.accuracy_meters,
    takenAt: row.taken_at,
    postedAt: row.posted_at,
    timezone: row.timezone,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTripRecord(row: TripWithMomentsRow): TripRecord {
  return {
    trip: mapTrip(row),
    moments: sortMomentsChronologically((row.moments ?? []).map(mapMoment)),
  };
}

function mapWatchedTrip(row: TripWatchRow, trip: Trip): WatchedTrip {
  return {
    trip,
    watchedAt: row.created_at,
    lastViewedAt: row.last_viewed_at,
  };
}

async function withTimeout<T>(
  action: () => PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

function createQueryAbortSignal(timeoutMs = queryRequestTimeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear() {
      window.clearTimeout(timeoutId);
    },
  };
}

async function withQueryTimeout<T>(
  action: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMessage = requestTimeoutMessage,
) {
  const { signal, clear } = createQueryAbortSignal();

  try {
    return await action(signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    clear();
  }
}

function createClientUuid() {
  const browserCrypto = globalThis.crypto;

  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  if (!browserCrypto) {
    throw new Error("Crumbs could not access secure random values.");
  }

  const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const segments = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  );

  return [
    segments.slice(0, 4).join(""),
    segments.slice(4, 6).join(""),
    segments.slice(6, 8).join(""),
    segments.slice(8, 10).join(""),
    segments.slice(10, 16).join(""),
  ].join("-");
}

async function getAuthenticatedUser() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await withTimeout(
    () => supabase.auth.getUser(),
    authRequestTimeoutMs,
    "Crumbs took too long to verify your sign-in. Please refresh and try again.",
  );

  if (error || !data.user) {
    throw new Error("Please sign in to continue.");
  }

  return data.user;
}

async function requireUser() {
  return getAuthenticatedUser();
}

function isActiveTripConflict(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "23505" &&
    error.message?.includes("trips_one_active_trip_per_owner_idx")
  );
}

async function getActiveTripForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await withQueryTimeout((signal) =>
    supabase
      .from("trips")
      .select("*")
      .eq("owner_id", userId)
      .is("end_date", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .abortSignal(signal)
      .maybeSingle(),
  );

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return data ? mapTrip(data) : null;
}

async function getLatestOwnedTripForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await withQueryTimeout((signal) =>
    supabase
      .from("trips")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .abortSignal(signal)
      .maybeSingle(),
  );

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return data ? mapTrip(data) : null;
}

async function getOwnedTripForUser(userId: string, tripId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await withQueryTimeout((signal) =>
    supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("owner_id", userId)
      .abortSignal(signal)
      .maybeSingle(),
  );

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return data ? mapTrip(data) : null;
}

async function listOwnedTripsForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await withQueryTimeout((signal) =>
    supabase
      .from("trips")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .abortSignal(signal),
  );

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (data ?? []).map(mapTrip);
}

async function touchTripUpdatedAt(tripId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await withQueryTimeout((signal) =>
    supabase
      .from("trips")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId)
      .abortSignal(signal),
  );

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

async function listWatchedTripsForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data: watchRows, error: watchError } = await withQueryTimeout((signal) =>
    supabase
      .from("trip_watches")
      .select("trip_id, user_id, created_at, last_viewed_at")
      .eq("user_id", userId)
      .order("last_viewed_at", { ascending: false })
      .abortSignal(signal),
  );

  if (watchError) {
    throw new Error(formatSupabaseError(watchError));
  }

  const watches = (watchRows ?? []) as TripWatchRow[];

  if (watches.length === 0) {
    return [];
  }

  const { data: tripRows, error: tripError } = await withQueryTimeout((signal) =>
    supabase
      .from("trips")
      .select("*")
      .in(
        "id",
        watches.map((watch) => watch.trip_id),
      )
      .abortSignal(signal),
  );

  if (tripError) {
    throw new Error(formatSupabaseError(tripError));
  }

  const tripsById = new Map(
    (tripRows ?? []).map((trip) => [trip.id, mapTrip(trip)]),
  );

  return watches.flatMap((watch) => {
    const trip = tripsById.get(watch.trip_id);
    return trip ? [mapWatchedTrip(watch, trip)] : [];
  });
}

async function getOptionalAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await getSupabaseBrowserClient().auth.getSession();

    if (!data.session?.access_token) {
      return {};
    }

    return {
      Authorization: `Bearer ${data.session.access_token}`,
    };
  } catch {
    return {};
  }
}

async function parseViewerCountApiResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; uniqueViewerCount?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Crumbs could not load this viewer count.");
  }

  if (typeof payload?.uniqueViewerCount !== "number") {
    throw new Error("Crumbs could not read this viewer count.");
  }

  return payload.uniqueViewerCount;
}

async function parseCommentApiResponse<T>(
  response: Response,
  key: "comments" | "comment",
) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; comments?: MomentComment[]; comment?: MomentComment }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Crumbs could not reach comments.");
  }

  const value = payload?.[key];

  if (!value) {
    throw new Error("Crumbs could not read the comment response.");
  }

  return value as T;
}

export function createSupabaseRepository(): TripRepository {
  return {
    mode: "supabase",
    async getSessionUser() {
      const { data, error } = await withTimeout(
        () => getSupabaseBrowserClient().auth.getUser(),
        authRequestTimeoutMs,
        "Crumbs took too long to verify your sign-in. Please refresh and try again.",
      );

      if (error || !data.user) {
        return null;
      }

      return mapUser(data.user);
    },
    async signInWithPassword(email: string, password: string, rememberMe: boolean) {
      const supabase = getSupabaseBrowserClient();
      const previousRememberMe = getRememberMePreference();

      setRememberMePreference(rememberMe);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        setRememberMePreference(previousRememberMe);
        throw new Error(formatSupabaseError(error));
      }
    },
    async signOut() {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    },
    async updateCurrentUserDisplayName(displayName: string) {
      const validationError = validateDisplayName(displayName);

      if (validationError) {
        throw new Error(validationError);
      }

      const normalizedDisplayName = normalizeDisplayName(displayName);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: normalizedDisplayName },
      });

      if (error || !data.user) {
        throw new Error(formatSupabaseError(error));
      }

      const { error: profileError } = await supabase
        .from("users")
        .update({ display_name: normalizedDisplayName })
        .eq("id", data.user.id);

      if (profileError) {
        throw new Error(formatSupabaseError(profileError));
      }

      return mapUser(data.user);
    },
    async createTrip(input: CreateTripInput) {
      const user = await requireUser();
      const shareSlug = nanoid(18);
      const supabase = getSupabaseBrowserClient();
      const activeTrip = await getActiveTripForUser(user.id);

      if (activeTrip) {
        throw new Error("You already have an active trip. End it before starting another one.");
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const shareCode = generateShareCode();
        const viewerPasscodeHash = input.passcode
          ? await hashPasscode(shareSlug, input.passcode)
          : null;
        const { data, error } = await withQueryTimeout((signal) =>
          supabase
            .from("trips")
            .insert({
              owner_id: user.id,
              title: input.title,
              description: input.description ?? null,
              start_date: input.startDate,
              end_date: input.endDate ?? null,
              timezone: input.timezone,
              share_slug: shareSlug,
              share_code: shareCode,
              viewer_passcode_hash: viewerPasscodeHash,
              privacy_mode: input.privacyMode,
              location_privacy_mode: input.locationPrivacyMode,
              publish_delay_hours: clampPublishDelayHours(input.publishDelayHours),
              theme: input.theme ?? "classic",
              cover_location_name: input.coverLocationName ?? null,
              cover_latitude: input.coverLatitude ?? null,
              cover_longitude: input.coverLongitude ?? null,
            })
            .select("*")
            .abortSignal(signal)
            .single(),
          "Crumbs took too long to create your trip. Please try again.",
        );

        if (!error && data) {
          return mapTrip(data);
        }

        const isDuplicateCode = error?.code === "23505" && error.message.includes("share_code");

        if (isActiveTripConflict(error)) {
          throw new Error(
            "You already have an active trip. End it before starting another one.",
          );
        }

        if (!isDuplicateCode) {
          throw new Error(formatSupabaseError(error));
        }
      }

      throw new Error("Could not generate a unique crumb code. Please try again.");
    },
    async getActiveTripForCurrentUser() {
      const user = await requireUser();
      return getActiveTripForUser(user.id);
    },
    async getLatestOwnedTripForCurrentUser() {
      const user = await requireUser();
      return getLatestOwnedTripForUser(user.id);
    },
    async listTripsForCurrentUser() {
      const user = await requireUser();
      return listOwnedTripsForUser(user.id);
    },
    async listWatchedTripsForCurrentUser() {
      const user = await requireUser();
      return listWatchedTripsForUser(user.id);
    },
    async watchTrip(tripId: string) {
      const user = await requireUser();
      const { error } = await withQueryTimeout((signal) =>
        getSupabaseBrowserClient()
          .from("trip_watches")
          .upsert(
            {
              trip_id: tripId,
              user_id: user.id,
              last_viewed_at: new Date().toISOString(),
            },
            { onConflict: "trip_id,user_id" },
          )
          .abortSignal(signal),
      );

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    },
    async unwatchTrip(tripId: string) {
      const user = await requireUser();
      const { error } = await withQueryTimeout((signal) =>
        getSupabaseBrowserClient()
          .from("trip_watches")
          .delete()
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .abortSignal(signal),
      );

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    },
    async getTripUniqueViewerCount(tripId: string) {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/viewers`,
        {
          cache: "no-store",
          headers: await getOptionalAuthHeaders(),
        },
      );

      return parseViewerCountApiResponse(response);
    },
    async recordTripView(tripId: string) {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/viewers`,
        {
          body: JSON.stringify({
            visitorId: getAnonymousViewerId(tripId),
          }),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(await getOptionalAuthHeaders()),
          },
          method: "POST",
        },
      );

      return parseViewerCountApiResponse(response);
    },
    async getTripById(tripId: string) {
      const user = await requireUser();
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await withQueryTimeout((signal) =>
        supabase
          .from("trips")
          .select(tripRecordSelect)
          .eq("id", tripId)
          .eq("owner_id", user.id)
          .abortSignal(signal)
          .single(),
        "Crumbs took too long to load this trip. Please try again.",
      );

      if (error || !data) {
        return null;
      }

      return mapTripRecord(data as TripWithMomentsRow);
    },
    async getTripByShareSlug(shareSlug: string) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await withQueryTimeout((signal) =>
        supabase
          .from("trips")
          .select(tripRecordSelect)
          .eq("share_slug", shareSlug)
          .abortSignal(signal)
          .single(),
      );

      if (error || !data) {
        return null;
      }

      return mapTripRecord(data as TripWithMomentsRow);
    },
    async getTripByShareCode(shareCode: string) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await withQueryTimeout((signal) =>
        supabase
          .from("trips")
          .select(tripRecordSelect)
          .eq("share_code", shareCode.toUpperCase())
          .abortSignal(signal)
          .single(),
      );

      if (error || !data) {
        return null;
      }

      return mapTripRecord(data as TripWithMomentsRow);
    },
    async getShareSlugByCode(shareCode: string) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await withQueryTimeout((signal) =>
        supabase
          .from("trips")
          .select("share_slug")
          .eq("share_code", shareCode.toUpperCase())
          .abortSignal(signal)
          .maybeSingle(),
      );

      if (error || !data) {
        return null;
      }

      return data.share_slug;
    },
    async listMomentComments(momentId: string) {
      const headers = await getOptionalAuthHeaders();
      const response = await fetch(`/api/moments/${momentId}/comments`, {
        headers,
      });

      return parseCommentApiResponse<MomentComment[]>(response, "comments");
    },
    async createMomentComment(input: CreateMomentCommentInput) {
      const headers = {
        "Content-Type": "application/json",
        ...(await getOptionalAuthHeaders()),
      };
      const response = await fetch(`/api/moments/${input.momentId}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          authorKind: input.authorKind,
          body: input.body,
          commenterToken: getAnonymousCommenterToken(input.tripId),
        }),
      });

      return parseCommentApiResponse<MomentComment>(response, "comment");
    },
    async createMoment(input: CreateMomentInput) {
      const user = await requireUser();
      const trip = await getOwnedTripForUser(user.id, input.tripId);

      if (!trip) {
        throw new Error("Trip not found.");
      }

      if (trip.endDate !== null) {
        const activeTrip = await getActiveTripForUser(user.id);

        if (activeTrip && activeTrip.id !== trip.id) {
          throw new Error(
            "End your active trip before adding new moments to a past trip.",
          );
        }
      }

      const supabase = getSupabaseBrowserClient();
      const momentId = createClientUuid();
      let imageUrl: string | null = input.imagePreviewUrl ?? null;
      let imageStoragePath: string | null = null;

      if (input.type === "photo" && input.file) {
        const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const storagePath = `${user.id}/${input.tripId}/${momentId}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(publicEnv.storageBucket)
          .upload(storagePath, input.file, {
            upsert: false,
            contentType: input.file.type || "image/jpeg",
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data } = supabase.storage
          .from(publicEnv.storageBucket)
          .getPublicUrl(storagePath);

        imageUrl = data.publicUrl;
        imageStoragePath = storagePath;
      }

      const { data, error } = await supabase
        .from("moments")
        .insert({
          id: momentId,
          trip_id: input.tripId,
          author_id: user.id,
          type: input.type,
          caption: input.caption ?? null,
          thought_text: input.thoughtText ?? null,
          image_url: imageUrl,
          image_storage_path: imageStoragePath,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          place_name: input.placeName ?? null,
          location_source: input.locationSource,
          accuracy_meters: input.accuracyMeters ?? null,
          taken_at: input.takenAt ?? null,
          timezone: input.timezone,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error ? formatSupabaseError(error) : "Could not save moment.");
      }

      await touchTripUpdatedAt(input.tripId);

      return mapMoment(data);
    },
    async updateMoment(momentId, input: UpdateMomentInput) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("moments")
        .update({
          caption: input.caption,
          thought_text: input.thoughtText,
          latitude: input.latitude,
          longitude: input.longitude,
          place_name: input.placeName,
          location_source: input.locationSource,
          accuracy_meters: input.accuracyMeters,
          taken_at: input.takenAt,
        })
        .eq("id", momentId)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error ? formatSupabaseError(error) : "Could not update moment.");
      }

      await touchTripUpdatedAt(data.trip_id);

      return mapMoment(data);
    },
    async updateMomentVisibility(momentId, visibility) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("moments")
        .update({ visibility })
        .eq("id", momentId)
        .select("trip_id")
        .single();

      if (error || !data) {
        throw new Error(formatSupabaseError(error));
      }

      await touchTripUpdatedAt(data.trip_id);
    },
    async deleteMoment(momentId) {
      const supabase = getSupabaseBrowserClient();
      const { data: moment, error: readError } = await supabase
        .from("moments")
        .select("trip_id")
        .eq("id", momentId)
        .single();

      if (readError || !moment) {
        throw new Error(readError ? formatSupabaseError(readError) : "Moment not found.");
      }

      const { error } = await supabase.from("moments").delete().eq("id", momentId);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await touchTripUpdatedAt(moment.trip_id);
    },
    async updateTripSettings(tripId: string, input: UpdateTripSettingsInput) {
      const supabase = getSupabaseBrowserClient();
      const current = await this.getTripById(tripId);

      if (!current) {
        throw new Error("Trip not found.");
      }

      const isResumingTrip =
        input.endDate === null &&
        current.trip.endDate !== null;

      if (isResumingTrip) {
        const activeTrip = await getActiveTripForUser(current.trip.ownerId);

        if (activeTrip && activeTrip.id !== tripId) {
          throw new Error("End your current active trip before reopening another one.");
        }
      }

      const { data, error } = await supabase
        .from("trips")
        .update({
          title: input.title,
          description:
            input.description === undefined ? undefined : input.description,
          start_date: input.startDate,
          end_date: input.endDate,
          timezone: input.timezone,
          publish_delay_hours:
            input.publishDelayHours === undefined
              ? undefined
              : clampPublishDelayHours(input.publishDelayHours),
          cover_location_name:
            input.coverLocationName === undefined
              ? undefined
              : input.coverLocationName,
          privacy_mode: input.privacyMode,
          location_privacy_mode: input.locationPrivacyMode,
          theme: input.theme,
          viewer_passcode_hash:
            input.passcode === undefined
              ? undefined
              : input.passcode
                ? await hashPasscode(current.trip.shareSlug, input.passcode)
                : null,
        })
        .eq("id", tripId)
        .select("*")
        .single();

      if (error || !data) {
        if (isActiveTripConflict(error)) {
          throw new Error("End your current active trip before reopening another one.");
        }

        throw new Error(error ? formatSupabaseError(error) : "Could not update trip.");
      }

      return mapTrip(data);
    },
  };
}
