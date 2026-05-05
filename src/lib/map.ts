import type { FeatureCollection, LineString } from "geojson";
import { DateTime } from "luxon";

import type { Moment, Trip, TripLocationPrivacyMode } from "@/types/triptrace";
import { getMomentTimestamp, getTripDayKey, sortMomentsChronologically } from "@/lib/time";

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

function stringToSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function jitterCoordinate(momentId: string, latitude: number, longitude: number) {
  const seed = stringToSeed(momentId);
  const meters = 120;
  const angle = (seed % 360) * (Math.PI / 180);
  const distance = 30 + (seed % 90);
  const latOffset = (distance * Math.cos(angle)) / 111_111;
  const lngOffset =
    (distance * Math.sin(angle)) /
    (111_111 * Math.cos((latitude * Math.PI) / 180));

  return {
    latitude: latitude + latOffset,
    longitude: longitude + lngOffset,
    meters,
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

  const today = DateTime.now().setZone(trip.timezone).toISODate();

  return moments.map((moment) => {
    if (!hasCoordinates(moment)) {
      return moment;
    }

    if (
      mode === "hide_current_day" &&
      today &&
      getTripDayKey(getMomentTimestamp(moment), trip.timezone) === today
    ) {
      return {
        ...moment,
        latitude: null,
        longitude: null,
      };
    }

    if (mode === "approximate") {
      const jittered = jitterCoordinate(
        moment.id,
        moment.latitude as number,
        moment.longitude as number,
      );

      return {
        ...moment,
        latitude: jittered.latitude,
        longitude: jittered.longitude,
      };
    }

    return moment;
  });
}
