import { DateTime } from "luxon";
import { nanoid } from "nanoid";

import { getAnonymousCommenterToken } from "@/lib/commenter-token";
import { hashPasscode } from "@/lib/crypto";
import { normalizeDisplayName, validateDisplayName } from "@/lib/display-name";
import {
  createDemoDatabase,
  demoOwner,
  demoSeedMomentIds,
  demoTripId,
  type DemoDatabase,
} from "@/lib/demo-data";
import type { TripRepository } from "@/lib/repositories/types";
import { generateShareCode } from "@/lib/share-code";
import { clampPublishDelayHours } from "@/lib/trip-sharing";
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

const storageKey = "crumbs-demo-db-v2";

function normalizeDatabase(database: DemoDatabase): DemoDatabase {
  return {
    users: database.users,
    trips: database.trips.map((trip) => ({
      ...trip,
      endDate: trip.endDate ?? null,
      locationPrivacyMode:
        trip.locationPrivacyMode === "exact" ? "exact" : "delayed",
      publishDelayHours: clampPublishDelayHours(
        "publishDelayHours" in trip ? trip.publishDelayHours : 6,
      ),
    })),
    moments: database.moments,
    comments: "comments" in database ? database.comments : [],
    commenters: "commenters" in database ? database.commenters : [],
    watches: "watches" in database ? database.watches : [],
  };
}

function isSeedDataStale(database: DemoDatabase): boolean {
  const demoTrip = database.trips.find((trip) => trip.id === demoTripId);

  if (!demoTrip) {
    return false;
  }

  const seedMoments = database.moments.filter((moment) =>
    demoSeedMomentIds.has(moment.id),
  );

  if (seedMoments.length === 0) {
    return false;
  }

  const today = DateTime.now().setZone(demoTrip.timezone).toISODate();
  const latestSeedDay = seedMoments
    .map((moment) =>
      DateTime.fromISO(moment.takenAt ?? moment.postedAt, { setZone: true })
        .setZone(demoTrip.timezone)
        .toISODate(),
    )
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return latestSeedDay !== today;
}

function refreshSeedData(database: DemoDatabase): DemoDatabase {
  const fresh = createDemoDatabase();
  const userTrips = database.trips.filter((trip) => trip.id !== demoTripId);
  const userMoments = database.moments.filter(
    (moment) => !demoSeedMomentIds.has(moment.id),
  );

  return {
    users: fresh.users,
    trips: [...fresh.trips, ...userTrips],
    moments: [...fresh.moments, ...userMoments],
    comments: database.comments,
    commenters: database.commenters,
    watches: database.watches,
  };
}

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
    const parsed = normalizeDatabase(JSON.parse(saved) as DemoDatabase);

    if (isSeedDataStale(parsed)) {
      const refreshed = refreshSeedData(parsed);
      window.localStorage.setItem(storageKey, JSON.stringify(refreshed));
      return refreshed;
    }

    return parsed;
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

function sortCommentsChronologically(comments: MomentComment[]) {
  return [...comments].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

function getOrCreateDemoCommenter(database: DemoDatabase, tripId: string) {
  const token = getAnonymousCommenterToken(tripId);
  const existing = database.commenters.find(
    (commenter) => commenter.tripId === tripId && commenter.token === token,
  );

  if (existing) {
    return existing;
  }

  const displayNumber =
    Math.max(
      0,
      ...database.commenters
        .filter((commenter) => commenter.tripId === tripId)
        .map((commenter) => commenter.displayNumber),
    ) + 1;
  const commenter = {
    tripId,
    token,
    displayNumber,
  };

  database.commenters.push(commenter);
  return commenter;
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

function getActiveTripForOwner(
  database: DemoDatabase,
  ownerId: string,
  excludeTripId?: string,
) {
  return (
    database.trips.find(
      (trip) =>
        trip.ownerId === ownerId &&
        trip.endDate === null &&
        trip.id !== excludeTripId,
    ) ?? null
  );
}

function getLatestOwnedTrip(database: DemoDatabase, ownerId: string) {
  return (
    [...database.trips]
      .filter((trip) => trip.ownerId === ownerId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
    null
  );
}

function listOwnedTrips(database: DemoDatabase, ownerId: string) {
  return [...database.trips]
    .filter((trip) => trip.ownerId === ownerId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function listWatchedTrips(database: DemoDatabase, userId: string): WatchedTrip[] {
  const tripsById = new Map(database.trips.map((trip) => [trip.id, trip]));

  return database.watches
    .filter((watch) => watch.userId === userId)
    .sort((left, right) => right.lastViewedAt.localeCompare(left.lastViewedAt))
    .flatMap((watch) => {
      const trip = tripsById.get(watch.tripId);
      return trip
        ? [
            {
              trip,
              watchedAt: watch.createdAt,
              lastViewedAt: watch.lastViewedAt,
            },
          ]
        : [];
    });
}

export function createDemoRepository(): TripRepository {
  return {
    mode: "demo",
    async getSessionUser() {
      return demoOwner;
    },
    async signInWithPassword() {
      return;
    },
    async signOut() {
      return;
    },
    async updateCurrentUserDisplayName(displayName: string): Promise<CrumbsUser> {
      const validationError = validateDisplayName(displayName);

      if (validationError) {
        throw new Error(validationError);
      }

      const normalizedDisplayName = normalizeDisplayName(displayName);
      demoOwner.displayName = normalizedDisplayName;

      withDatabase((database) => {
        database.users = database.users.map((user) =>
          user.id === demoOwner.id
            ? { ...user, displayName: normalizedDisplayName }
            : user,
        );
      });

      return { ...demoOwner };
    },
    async createTrip(input: CreateTripInput) {
      const activeTrip = getActiveTripForOwner(loadDatabase(), demoOwner.id);

      if (activeTrip) {
        throw new Error("You already have an active trip. End it before starting another one.");
      }

      const now = new Date().toISOString();
      const shareSlug = nanoid(18);
      const existingDatabase = loadDatabase();
      const usedCodes = new Set(existingDatabase.trips.map((trip) => trip.shareCode));
      let shareCode = generateShareCode();

      while (usedCodes.has(shareCode)) {
        shareCode = generateShareCode();
      }

      const trip: Trip = {
        id: nanoid(),
        ownerId: demoOwner.id,
        title: input.title,
        description: input.description ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        timezone: input.timezone,
        shareSlug,
        shareCode,
        viewerPasscodeHash: input.passcode
          ? await hashPasscode(shareSlug, input.passcode)
          : null,
        privacyMode: input.privacyMode,
        locationPrivacyMode: input.locationPrivacyMode,
        publishDelayHours: clampPublishDelayHours(input.publishDelayHours),
        coverLocationName: input.coverLocationName ?? null,
        coverLatitude: input.coverLatitude ?? null,
        coverLongitude: input.coverLongitude ?? null,
        createdAt: now,
        updatedAt: now,
      };

      withDatabase((database) => {
        database.trips.unshift(trip);
      });

      return trip;
    },
    async getActiveTripForCurrentUser() {
      return getActiveTripForOwner(loadDatabase(), demoOwner.id);
    },
    async getLatestOwnedTripForCurrentUser() {
      return getLatestOwnedTrip(loadDatabase(), demoOwner.id);
    },
    async listTripsForCurrentUser() {
      return listOwnedTrips(loadDatabase(), demoOwner.id);
    },
    async listWatchedTripsForCurrentUser() {
      return listWatchedTrips(loadDatabase(), demoOwner.id);
    },
    async watchTrip(tripId: string) {
      withDatabase((database) => {
        const trip = database.trips.find((entry) => entry.id === tripId);

        if (!trip || trip.ownerId === demoOwner.id) {
          return;
        }

        const now = new Date().toISOString();
        const existing = database.watches.find(
          (watch) => watch.tripId === tripId && watch.userId === demoOwner.id,
        );

        if (existing) {
          existing.lastViewedAt = now;
          return;
        }

        database.watches.push({
          tripId,
          userId: demoOwner.id,
          createdAt: now,
          lastViewedAt: now,
        });
      });
    },
    async unwatchTrip(tripId: string) {
      withDatabase((database) => {
        database.watches = database.watches.filter(
          (watch) => !(watch.tripId === tripId && watch.userId === demoOwner.id),
        );
      });
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
    async getTripByShareCode(shareCode: string) {
      const database = loadDatabase();
      const trip = database.trips.find(
        (entry) => entry.shareCode.toUpperCase() === shareCode.toUpperCase(),
      );
      return trip ? buildTripRecord(database, trip) : null;
    },
    async getShareSlugByCode(shareCode: string) {
      const database = loadDatabase();
      const trip = database.trips.find(
        (entry) => entry.shareCode.toUpperCase() === shareCode.toUpperCase(),
      );
      return trip?.shareSlug ?? null;
    },
    async listMomentComments(momentId: string) {
      return sortCommentsChronologically(
        loadDatabase().comments.filter((comment) => comment.momentId === momentId),
      );
    },
    async createMomentComment(input: CreateMomentCommentInput) {
      const database = loadDatabase();
      const moment = database.moments.find((entry) => entry.id === input.momentId);
      const trip = database.trips.find((entry) => entry.id === input.tripId);

      if (!moment || !trip || moment.tripId !== trip.id) {
        throw new Error("Moment not found.");
      }

      const body = input.body.trim();

      if (!body) {
        throw new Error("Write a comment before posting.");
      }

      if (body.length > 1000) {
        throw new Error("Comments can be up to 1000 characters.");
      }

      const now = new Date().toISOString();
      const isTraveler = trip.ownerId === demoOwner.id;
      const commenter = isTraveler
        ? null
        : getOrCreateDemoCommenter(database, trip.id);
      const comment: MomentComment = {
        id: nanoid(),
        tripId: trip.id,
        momentId: moment.id,
        body,
        authorKind: isTraveler ? "traveler" : "viewer",
        authorLabel:
          isTraveler ? "OP" : `#${commenter?.displayNumber ?? "?"}`,
        authorEmail: null,
        commenterNumber: commenter?.displayNumber ?? null,
        createdAt: now,
        updatedAt: now,
      };

      database.comments.push(comment);
      saveDatabase(database);
      return comment;
    },
    async createMoment(input: CreateMomentInput) {
      const database = loadDatabase();
      const trip = database.trips.find((entry) => entry.id === input.tripId);

      if (!trip) {
        throw new Error("Trip not found.");
      }

      if (trip.endDate !== null) {
        const activeTrip = getActiveTripForOwner(database, demoOwner.id, trip.id);

        if (activeTrip) {
          throw new Error(
            "End your active trip before adding new moments to a past trip.",
          );
        }
      }

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

      withDatabase((nextDatabase) => {
        nextDatabase.moments.push(moment);
        const nextTrip = nextDatabase.trips.find((entry) => entry.id === input.tripId);

        if (nextTrip) {
          nextTrip.updatedAt = now;
        }
      });

      return moment;
    },
    async updateMoment(momentId, input: UpdateMomentInput) {
      const database = loadDatabase();
      const moment = database.moments.find((entry) => entry.id === momentId);

      if (!moment) {
        throw new Error("Moment not found.");
      }

      moment.caption = input.caption === undefined ? moment.caption : input.caption;
      moment.thoughtText =
        input.thoughtText === undefined ? moment.thoughtText : input.thoughtText;
      moment.latitude = input.latitude === undefined ? moment.latitude : input.latitude;
      moment.longitude =
        input.longitude === undefined ? moment.longitude : input.longitude;
      moment.placeName =
        input.placeName === undefined ? moment.placeName : input.placeName;
      moment.locationSource =
        input.locationSource === undefined
          ? moment.locationSource
          : input.locationSource;
      moment.accuracyMeters =
        input.accuracyMeters === undefined
          ? moment.accuracyMeters
          : input.accuracyMeters;
      moment.takenAt = input.takenAt === undefined ? moment.takenAt : input.takenAt;
      moment.updatedAt = new Date().toISOString();

      const trip = database.trips.find((entry) => entry.id === moment.tripId);

      if (trip) {
        trip.updatedAt = moment.updatedAt;
      }

      saveDatabase(database);
      return moment;
    },
    async updateMomentVisibility(momentId, visibility) {
      withDatabase((database) => {
        const moment = database.moments.find((entry) => entry.id === momentId);

        if (moment) {
          moment.visibility = visibility;
          moment.updatedAt = new Date().toISOString();
          const trip = database.trips.find((entry) => entry.id === moment.tripId);

          if (trip) {
            trip.updatedAt = moment.updatedAt;
          }
        }
      });
    },
    async deleteMoment(momentId) {
      withDatabase((database) => {
        const moment = database.moments.find((entry) => entry.id === momentId);
        database.moments = database.moments.filter((moment) => moment.id !== momentId);

        if (moment) {
          const trip = database.trips.find((entry) => entry.id === moment.tripId);

          if (trip) {
            trip.updatedAt = new Date().toISOString();
          }
        }
      });
    },
    async updateTripSettings(tripId: string, input: UpdateTripSettingsInput) {
      const database = loadDatabase();
      const trip = database.trips.find((entry) => entry.id === tripId);

      if (!trip) {
        throw new Error("Trip not found.");
      }

      const isResumingTrip =
        input.endDate === null &&
        trip.endDate !== null;

      if (isResumingTrip) {
        const activeTrip = getActiveTripForOwner(database, trip.ownerId, trip.id);

        if (activeTrip) {
          throw new Error("End your current active trip before reopening another one.");
        }
      }

      trip.title = input.title ?? trip.title;
      trip.description =
        input.description === undefined ? trip.description : input.description;
      trip.startDate = input.startDate ?? trip.startDate;
      trip.endDate = input.endDate === undefined ? trip.endDate : input.endDate;
      trip.timezone = input.timezone ?? trip.timezone;
      trip.coverLocationName =
        input.coverLocationName === undefined
          ? trip.coverLocationName
          : input.coverLocationName;
      trip.privacyMode = input.privacyMode ?? trip.privacyMode;
      trip.locationPrivacyMode =
        input.locationPrivacyMode ?? trip.locationPrivacyMode;
      trip.publishDelayHours =
        input.publishDelayHours === undefined
          ? trip.publishDelayHours
          : clampPublishDelayHours(input.publishDelayHours);
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
