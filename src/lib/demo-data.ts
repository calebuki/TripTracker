import { DateTime } from "luxon";

import type { Moment, Trip, TripRecord, TripTraceUser } from "@/types/triptrace";

export interface DemoDatabase {
  users: TripTraceUser[];
  trips: Trip[];
  moments: Moment[];
}

export const demoOwner: TripTraceUser = {
  id: "demo-owner",
  email: "clara@triptrace.local",
  displayName: "Clara",
  createdAt: "2026-05-01T09:00:00.000Z",
};

export function createDemoDatabase(): DemoDatabase {
  const tripTimezone = "Europe/Paris";
  const today = DateTime.now().setZone(tripTimezone).startOf("day");
  const dayOne = today.minus({ days: 2 });
  const dayTwo = today.minus({ days: 1 });
  const dayThree = today;
  const tripId = "demo-paris-maymester";

  const trip: Trip = {
    id: tripId,
    ownerId: demoOwner.id,
    title: "Paris Maymester",
    description: "A quiet map of a month in Paris.",
    startDate: dayOne.toISODate() ?? "2026-05-02",
    endDate: dayThree.plus({ days: 14 }).toISODate() ?? "2026-05-18",
    timezone: tripTimezone,
    shareSlug: "paris-maymester-private",
    viewerPasscodeHash: null,
    privacyMode: "private_link",
    locationPrivacyMode: "exact",
    coverLocationName: "Paris, France",
    coverLatitude: 48.8566,
    coverLongitude: 2.3522,
    createdAt: dayOne.toUTC().toISO() ?? new Date().toISOString(),
    updatedAt: dayThree.plus({ hours: 1 }).toUTC().toISO() ?? new Date().toISOString(),
  };

  const moments: Moment[] = [
    {
      id: "moment-cdg",
      tripId,
      authorId: demoOwner.id,
      type: "photo",
      caption: "Touched down and finally heard French all around me.",
      thoughtText: null,
      imageUrl: "/demo/cdg.svg",
      imageStoragePath: null,
      latitude: 49.0097,
      longitude: 2.5479,
      placeName: "Charles de Gaulle Airport",
      locationSource: "manual",
      accuracyMeters: 18,
      takenAt: dayOne.plus({ hours: 8, minutes: 15 }).toUTC().toISO(),
      postedAt: dayOne.plus({ hours: 8, minutes: 20 }).toUTC().toISO() ?? "",
      timezone: tripTimezone,
      visibility: "visible",
      createdAt: dayOne.plus({ hours: 8, minutes: 20 }).toUTC().toISO() ?? "",
      updatedAt: dayOne.plus({ hours: 8, minutes: 20 }).toUTC().toISO() ?? "",
    },
    {
      id: "moment-montmartre",
      tripId,
      authorId: demoOwner.id,
      type: "thought",
      caption: "The stairs were brutal but the view felt like a reward.",
      thoughtText:
        "Stopped for espresso below Sacre-Coeur and watched the neighborhood wake up.",
      imageUrl: null,
      imageStoragePath: null,
      latitude: 48.8867,
      longitude: 2.3431,
      placeName: "Montmartre",
      locationSource: "manual",
      accuracyMeters: 22,
      takenAt: dayOne.plus({ hours: 12, minutes: 5 }).toUTC().toISO(),
      postedAt: dayOne.plus({ hours: 12, minutes: 10 }).toUTC().toISO() ?? "",
      timezone: tripTimezone,
      visibility: "visible",
      createdAt: dayOne.plus({ hours: 12, minutes: 10 }).toUTC().toISO() ?? "",
      updatedAt: dayOne.plus({ hours: 12, minutes: 10 }).toUTC().toISO() ?? "",
    },
    {
      id: "moment-louvre",
      tripId,
      authorId: demoOwner.id,
      type: "photo",
      caption: "The courtyard light was even better than the postcards.",
      thoughtText: null,
      imageUrl: "/demo/louvre.svg",
      imageStoragePath: null,
      latitude: 48.8606,
      longitude: 2.3376,
      placeName: "Louvre",
      locationSource: "manual",
      accuracyMeters: 15,
      takenAt: dayTwo.plus({ hours: 10, minutes: 30 }).toUTC().toISO(),
      postedAt: dayTwo.plus({ hours: 10, minutes: 40 }).toUTC().toISO() ?? "",
      timezone: tripTimezone,
      visibility: "visible",
      createdAt: dayTwo.plus({ hours: 10, minutes: 40 }).toUTC().toISO() ?? "",
      updatedAt: dayTwo.plus({ hours: 10, minutes: 40 }).toUTC().toISO() ?? "",
    },
    {
      id: "moment-luxembourg",
      tripId,
      authorId: demoOwner.id,
      type: "thought",
      caption: "The chairs were full of people doing absolutely nothing.",
      thoughtText:
        "Sat beside the fountain and let the afternoon stretch for a while.",
      imageUrl: null,
      imageStoragePath: null,
      latitude: 48.8462,
      longitude: 2.3371,
      placeName: "Luxembourg Gardens",
      locationSource: "manual",
      accuracyMeters: 20,
      takenAt: dayTwo.plus({ hours: 15, minutes: 20 }).toUTC().toISO(),
      postedAt: dayTwo.plus({ hours: 15, minutes: 25 }).toUTC().toISO() ?? "",
      timezone: tripTimezone,
      visibility: "visible",
      createdAt: dayTwo.plus({ hours: 15, minutes: 25 }).toUTC().toISO() ?? "",
      updatedAt: dayTwo.plus({ hours: 15, minutes: 25 }).toUTC().toISO() ?? "",
    },
    {
      id: "moment-latin-quarter",
      tripId,
      authorId: demoOwner.id,
      type: "photo",
      caption: "Found a tiny bookstore and lost all sense of time.",
      thoughtText: null,
      imageUrl: "/demo/latin-quarter.svg",
      imageStoragePath: null,
      latitude: 48.8493,
      longitude: 2.347,
      placeName: "Latin Quarter",
      locationSource: "manual",
      accuracyMeters: 14,
      takenAt: dayThree.plus({ hours: 11, minutes: 10 }).toUTC().toISO(),
      postedAt: dayThree.plus({ hours: 11, minutes: 18 }).toUTC().toISO() ?? "",
      timezone: tripTimezone,
      visibility: "visible",
      createdAt: dayThree.plus({ hours: 11, minutes: 18 }).toUTC().toISO() ?? "",
      updatedAt: dayThree.plus({ hours: 11, minutes: 18 }).toUTC().toISO() ?? "",
    },
    {
      id: "moment-eiffel",
      tripId,
      authorId: demoOwner.id,
      type: "photo",
      caption: "Ended the day with the river glowing under the tower.",
      thoughtText: null,
      imageUrl: "/demo/eiffel.svg",
      imageStoragePath: null,
      latitude: 48.8584,
      longitude: 2.2945,
      placeName: "Eiffel Tower",
      locationSource: "manual",
      accuracyMeters: 12,
      takenAt: dayThree.plus({ hours: 20, minutes: 5 }).toUTC().toISO(),
      postedAt: dayThree.plus({ hours: 20, minutes: 12 }).toUTC().toISO() ?? "",
      timezone: tripTimezone,
      visibility: "visible",
      createdAt: dayThree.plus({ hours: 20, minutes: 12 }).toUTC().toISO() ?? "",
      updatedAt: dayThree.plus({ hours: 20, minutes: 12 }).toUTC().toISO() ?? "",
    },
  ];

  return {
    users: [demoOwner],
    trips: [trip],
    moments,
  };
}

export function getDemoTripRecord(): TripRecord {
  const database = createDemoDatabase();

  return {
    trip: database.trips[0],
    moments: database.moments.filter(
      (moment) => moment.tripId === database.trips[0].id,
    ),
  };
}
