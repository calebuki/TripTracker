import { nanoid } from "nanoid";

import { hashPasscode } from "@/lib/crypto";
import { createDemoDatabase, demoOwner, type DemoDatabase } from "@/lib/demo-data";
import type { TripRepository } from "@/lib/repositories/types";
import type {
  CreateMomentInput,
  CreateTripInput,
  Moment,
  Trip,
  TripRecord,
  UpdateTripSettingsInput,
} from "@/types/triptrace";

const storageKey = "triptrace-demo-db-v1";

function loadDatabase(): DemoDatabase {
  if (typeof window === "undefined") {
    return createDemoDatabase();
  }

  const saved = window.localStorage.getItem(storageKey);

  if (!saved) {
    const seeded = createDemoDatabase();
    window.localStorage.setItem(storageKey, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(saved) as DemoDatabase;
  } catch {
    const seeded = createDemoDatabase();
    window.localStorage.setItem(storageKey, JSON.stringify(seeded));
    return seeded;
  }
}

function saveDatabase(database: DemoDatabase) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(database));
  } catch {
    // Ignore quota failures in demo mode. The current session still renders from memory.
  }
}

function withDatabase<T>(mutator: (database: DemoDatabase) => T): T {
  const database = loadDatabase();
  const result = mutator(database);
  saveDatabase(database);
  return result;
}

function buildTripRecord(database: DemoDatabase, trip: Trip): TripRecord {
  return {
    trip,
    moments: database.moments.filter((moment) => moment.tripId === trip.id),
  };
}

export function createDemoRepository(): TripRepository {
  return {
    mode: "demo",
    async getSessionUser() {
      return demoOwner;
    },
    async signInWithEmail() {
      return;
    },
    async signOut() {
      return;
    },
    async createTrip(input: CreateTripInput) {
      const now = new Date().toISOString();
      const shareSlug = nanoid(18);
      const trip: Trip = {
        id: nanoid(),
        ownerId: demoOwner.id,
        title: input.title,
        description: input.description ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        timezone: input.timezone,
        shareSlug,
        viewerPasscodeHash: input.passcode
          ? await hashPasscode(shareSlug, input.passcode)
          : null,
        privacyMode: input.privacyMode,
        locationPrivacyMode: input.locationPrivacyMode,
        coverLocationName: input.coverLocationName ?? null,
        coverLatitude: null,
        coverLongitude: null,
        createdAt: now,
        updatedAt: now,
      };

      withDatabase((database) => {
        database.trips.unshift(trip);
      });

      return trip;
    },
    async getTripById(tripId: string) {
      const database = loadDatabase();
      const trip = database.trips.find((entry) => entry.id === tripId);
      return trip ? buildTripRecord(database, trip) : null;
    },
    async getTripByShareSlug(shareSlug: string) {
      const database = loadDatabase();
      const trip = database.trips.find((entry) => entry.shareSlug === shareSlug);
      return trip ? buildTripRecord(database, trip) : null;
    },
    async createMoment(input: CreateMomentInput) {
      const now = new Date().toISOString();
      const moment: Moment = {
        id: nanoid(),
        tripId: input.tripId,
        authorId: demoOwner.id,
        type: input.type,
        caption: input.caption ?? null,
        thoughtText: input.thoughtText ?? null,
        imageUrl: input.imagePreviewUrl ?? null,
        imageStoragePath: null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        placeName: input.placeName ?? null,
        locationSource: input.locationSource,
        accuracyMeters: input.accuracyMeters ?? null,
        takenAt: input.takenAt ?? null,
        postedAt: now,
        timezone: input.timezone,
        visibility: "visible",
        createdAt: now,
        updatedAt: now,
      };

      withDatabase((database) => {
        database.moments.push(moment);
        const trip = database.trips.find((entry) => entry.id === input.tripId);

        if (trip) {
          trip.updatedAt = now;
        }
      });

      return moment;
    },
    async updateMomentVisibility(momentId, visibility) {
      withDatabase((database) => {
        const moment = database.moments.find((entry) => entry.id === momentId);

        if (moment) {
          moment.visibility = visibility;
          moment.updatedAt = new Date().toISOString();
        }
      });
    },
    async deleteMoment(momentId) {
      withDatabase((database) => {
        database.moments = database.moments.filter((moment) => moment.id !== momentId);
      });
    },
    async updateTripSettings(tripId: string, input: UpdateTripSettingsInput) {
      const database = loadDatabase();
      const trip = database.trips.find((entry) => entry.id === tripId);

      if (!trip) {
        throw new Error("Trip not found.");
      }

      trip.title = input.title ?? trip.title;
      trip.description =
        input.description === undefined ? trip.description : input.description;
      trip.startDate = input.startDate ?? trip.startDate;
      trip.endDate = input.endDate ?? trip.endDate;
      trip.timezone = input.timezone ?? trip.timezone;
      trip.coverLocationName =
        input.coverLocationName === undefined
          ? trip.coverLocationName
          : input.coverLocationName;
      trip.privacyMode = input.privacyMode ?? trip.privacyMode;
      trip.locationPrivacyMode =
        input.locationPrivacyMode ?? trip.locationPrivacyMode;
      trip.viewerPasscodeHash =
        input.passcode === undefined
          ? trip.viewerPasscodeHash
          : input.passcode
            ? await hashPasscode(trip.shareSlug, input.passcode)
            : null;
      trip.updatedAt = new Date().toISOString();

      saveDatabase(database);
      return trip;
    },
  };
}
