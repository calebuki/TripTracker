import type { FeatureCollection, LineString } from "geojson";
import { DateTime } from "luxon";

import type { Moment, Trip, TripLocationPrivacyMode } from "@/types/crumbs";
import { sortMomentsChronologically } from "@/lib/time";

const defaultParisCenter = {
  latitude: 48.8566,
  longitude: 2.3522,
};

export interface MomentMarkerGroup {
  id: string;
  moments: Moment[];
  momentIds: string[];
  latitude: number;
  longitude: number;
  startOrder: number;
  endOrder: number;
}

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

  const coordinates = points.map((moment) => [
    moment.longitude as number,
    moment.latitude as number,
  ]);

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  };
}

export function buildMomentMarkerGroups(
  moments: Moment[],
  project: (coordinates: [number, number]) => { x: number; y: number },
  pixelThreshold = 52,
) {
  const orderedMoments = getMomentsWithCoordinates(moments);
  const workingGroups: Array<
    MomentMarkerGroup & {
      centroidX: number;
      centroidY: number;
      latitudeTotal: number;
      longitudeTotal: number;
    }
  > = [];

  orderedMoments.forEach((moment, index) => {
    const latitude = moment.latitude as number;
    const longitude = moment.longitude as number;
    const projected = project([longitude, latitude]);
    const order = index + 1;

    const existingGroup = workingGroups.find((group) => {
      const deltaX = projected.x - group.centroidX;
      const deltaY = projected.y - group.centroidY;

      return Math.hypot(deltaX, deltaY) <= pixelThreshold;
    });

    if (!existingGroup) {
      workingGroups.push({
        id: moment.id,
        moments: [moment],
        momentIds: [moment.id],
        latitude,
        longitude,
        startOrder: order,
        endOrder: order,
        centroidX: projected.x,
        centroidY: projected.y,
        latitudeTotal: latitude,
        longitudeTotal: longitude,
      });
      return;
    }

    existingGroup.moments.push(moment);
    existingGroup.momentIds.push(moment.id);
    existingGroup.endOrder = order;
    existingGroup.latitudeTotal += latitude;
    existingGroup.longitudeTotal += longitude;
    existingGroup.latitude =
      existingGroup.latitudeTotal / existingGroup.moments.length;
    existingGroup.longitude =
      existingGroup.longitudeTotal / existingGroup.moments.length;
    existingGroup.centroidX =
      (existingGroup.centroidX * (existingGroup.moments.length - 1) + projected.x) /
      existingGroup.moments.length;
    existingGroup.centroidY =
      (existingGroup.centroidY * (existingGroup.moments.length - 1) + projected.y) /
      existingGroup.moments.length;
    existingGroup.id = existingGroup.momentIds.join(":");
  });

  return workingGroups.map((group) => ({
    id: group.id,
    moments: group.moments,
    momentIds: group.momentIds,
    latitude: group.latitude,
    longitude: group.longitude,
    startOrder: group.startOrder,
    endOrder: group.endOrder,
  }));
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
