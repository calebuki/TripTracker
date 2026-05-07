import type { FeatureCollection, LineString } from "geojson";
import { DateTime } from "luxon";

import type { Moment, Trip, TripLocationPrivacyMode } from "@/types/triptrace";
import { sortMomentsChronologically } from "@/lib/time";

const defaultParisCenter = {
  latitude: 48.8566,
  longitude: 2.3522,
};

export function hasCoordinates(moment: Pick<Moment, "latitude" | "longitude">) {
  return typeof moment.latitude === "number" && typeof moment.longitude === "number";
}

export function getMomentsWithCoordinates(moments: Moment[]) {
  return sortMomentsChronologically(moments).filter(hasCoordinates);
}

export function getMapCenter(trip: Trip, moments: Moment[]) {
  const firstMoment = getMomentsWithCoordinates(moments)[0];

  if (
    firstMoment?.latitude !== null &&
    firstMoment?.latitude !== undefined &&
    firstMoment.longitude !== null &&
    firstMoment.longitude !== undefined
  ) {
    return {
      latitude: firstMoment.latitude,
      longitude: firstMoment.longitude,
    };
  }

  if (
    trip.coverLatitude !== null &&
    trip.coverLatitude !== undefined &&
    trip.coverLongitude !== null &&
    trip.coverLongitude !== undefined
  ) {
    return {
      latitude: trip.coverLatitude,
      longitude: trip.coverLongitude,
    };
  }

  return defaultParisCenter;
}

export function getMapBounds(moments: Moment[]) {
  const points = getMomentsWithCoordinates(moments);

  if (points.length === 0) {
    return null;
  }

  const latitudes = points.map((moment) => moment.latitude as number);
  const longitudes = points.map((moment) => moment.longitude as number);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ] as [number, number, number, number];
}

export function buildTrailGeoJson(
  moments: Moment[],
): FeatureCollection<LineString> {
  const points = getMomentsWithCoordinates(moments);

  if (points.length < 2) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: points.map((moment) => [
            moment.longitude as number,
            moment.latitude as number,
          ]),
        },
      },
    ],
  };
}

export function applyLocationPrivacy(
  trip: Trip,
  moments: Moment[],
  mode: TripLocationPrivacyMode,
) {
  if (mode === "exact") {
    return moments;
  }

  const publishCutoff = DateTime.now()
    .minus({ hours: trip.publishDelayHours })
    .toMillis();

  return moments.filter((moment) => {
    return DateTime.fromISO(moment.postedAt, { setZone: true }).toMillis() <= publishCutoff;
  });
}
