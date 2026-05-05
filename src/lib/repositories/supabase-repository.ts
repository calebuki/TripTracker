import { nanoid } from "nanoid";

import { hashPasscode } from "@/lib/crypto";
import { publicEnv } from "@/lib/env";
import type { TripRepository } from "@/lib/repositories/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type {
  CreateMomentInput,
  CreateTripInput,
  Moment,
  Trip,
  TripTraceUser,
  UpdateTripSettingsInput,
} from "@/types/triptrace";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type MomentRow = Database["public"]["Tables"]["moments"]["Row"];

function mapUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: { display_name?: string };
  created_at?: string;
}): TripTraceUser {
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
    viewerPasscodeHash: row.viewer_passcode_hash,
    privacyMode: row.privacy_mode,
    locationPrivacyMode: row.location_privacy_mode,
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

async function requireUser() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Please sign in to continue.");
  }

  return data.user;
}

async function loadMoments(tripId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("moments")
    .select("*")
    .eq("trip_id", tripId)
    .order("taken_at", { ascending: true, nullsFirst: false })
    .order("posted_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMoment);
}

export function createSupabaseRepository(): TripRepository {
  return {
    mode: "supabase",
    async getSessionUser() {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      return mapUser(data.user);
    },
    async signInWithEmail(email: string, redirectTo: string) {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    async signOut() {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }
    },
    async createTrip(input: CreateTripInput) {
      const user = await requireUser();
      const shareSlug = nanoid(18);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user.id,
          title: input.title,
          description: input.description ?? null,
          start_date: input.startDate,
          end_date: input.endDate,
          timezone: input.timezone,
          share_slug: shareSlug,
          viewer_passcode_hash: input.passcode
            ? await hashPasscode(shareSlug, input.passcode)
            : null,
          privacy_mode: input.privacyMode,
          location_privacy_mode: input.locationPrivacyMode,
          cover_location_name: input.coverLocationName ?? null,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Could not create trip.");
      }

      return mapTrip(data);
    },
    async getTripById(tripId: string) {
      const user = await requireUser();
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq("owner_id", user.id)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        trip: mapTrip(data),
        moments: await loadMoments(tripId),
      };
    },
    async getTripByShareSlug(shareSlug: string) {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("share_slug", shareSlug)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        trip: mapTrip(data),
        moments: await loadMoments(data.id),
      };
    },
    async createMoment(input: CreateMomentInput) {
      const user = await requireUser();
      const supabase = getSupabaseBrowserClient();
      const momentId = nanoid();
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
        throw new Error(error?.message ?? "Could not save moment.");
      }

      return mapMoment(data);
    },
    async updateMomentVisibility(momentId, visibility) {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("moments")
        .update({ visibility })
        .eq("id", momentId);

      if (error) {
        throw new Error(error.message);
      }
    },
    async deleteMoment(momentId) {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("moments").delete().eq("id", momentId);

      if (error) {
        throw new Error(error.message);
      }
    },
    async updateTripSettings(tripId: string, input: UpdateTripSettingsInput) {
      const supabase = getSupabaseBrowserClient();
      const current = await this.getTripById(tripId);

      if (!current) {
        throw new Error("Trip not found.");
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
          cover_location_name:
            input.coverLocationName === undefined
              ? undefined
              : input.coverLocationName,
          privacy_mode: input.privacyMode,
          location_privacy_mode: input.locationPrivacyMode,
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
        throw new Error(error?.message ?? "Could not update trip.");
      }

      return mapTrip(data);
    },
  };
}
