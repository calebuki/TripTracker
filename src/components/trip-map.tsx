"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";

import { MomentMarker } from "@/components/moment-marker";
import { publicEnv } from "@/lib/env";
import {
  buildMomentMarkerGroups,
  buildTrail,
  getMapBounds,
  getMapCenter,
  hasCoordinates,
  type MomentMarkerGroup,
} from "@/lib/map";
import { getMomentTimeColor } from "@/lib/time-of-day";
import { cn } from "@/lib/utils";
import type { LocationDraft, Moment, Trip } from "@/types/crumbs";

type LineLayerPaint = NonNullable<Extract<LayerProps, { type: "line" }>["paint"]>;

// An ink edge keeps the yellow daytime stretches readable on a light basemap.
const routeCasingLayer: LayerProps = {
  id: "crumbs-route-casing",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#15161c",
    "line-width": ["interpolate", ["linear"], ["zoom"], 10, 7, 16, 11],
  },
};

interface TripMapProps {
  trip: Trip;
  moments: Moment[];
  selectedMomentId?: string | null;
  onSelectMoment?: (momentId: string) => void;
  draftLocation?: LocationDraft | null;
  allowPick?: boolean;
  onPickLocation?: (location: LocationDraft) => void;
  fitKey?: number | string;
  heightClassName?: string;
  className?: string;
  onMomentGroupsChange?: (groups: MomentMarkerGroup[]) => void;
}

function getViewportTuning(map: MapRef | null) {
  const width =
    map?.getMap().getContainer().clientWidth ??
    (typeof window === "undefined" ? 1024 : window.innerWidth);
  const isCompact = width < 640;

  return {
    draftZoom: isCompact ? 12.25 : 13,
    fitMaxZoom: isCompact ? 12.75 : 14,
    fitPadding: isCompact
      ? { top: 96, bottom: 180, left: 48, right: 48 }
      : 64,
    initialZoom: isCompact ? 10.5 : 11.5,
  };
}

function getDistanceInKilometers(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const latitudeARadians = toRadians(latitudeA);
  const latitudeBRadians = toRadians(latitudeB);
  const distanceFactor =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(distanceFactor), Math.sqrt(1 - distanceFactor));
}

function getSelectedMomentZoom(map: MapRef, moment: Moment, moments: Moment[]) {
  const latitude = moment.latitude as number;
  const longitude = moment.longitude as number;
  const nearestDistance = moments
    .filter((entry) => entry.id !== moment.id && hasCoordinates(entry))
    .reduce((closestDistance, entry) => {
      const distance = getDistanceInKilometers(
        latitude,
        longitude,
        entry.latitude as number,
        entry.longitude as number,
      );

      return Math.min(closestDistance, distance);
    }, Number.POSITIVE_INFINITY);
  const viewportWidth = map.getMap().getContainer().clientWidth;
  const isCompact = viewportWidth < 640;
  const zoom =
    nearestDistance <= 0.1
      ? 17
      : nearestDistance <= 0.5
        ? 16.25
        : nearestDistance <= 2
          ? 15.5
          : nearestDistance <= 10
            ? 14.5
            : 13.75;

  return isCompact ? Math.min(15.75, zoom) : zoom;
}

function areMomentMarkerGroupsEqual(
  left: MomentMarkerGroup[],
  right: MomentMarkerGroup[],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftGroup, index) => {
    const rightGroup = right[index];

    return (
      rightGroup &&
      leftGroup.id === rightGroup.id &&
      leftGroup.latitude === rightGroup.latitude &&
      leftGroup.longitude === rightGroup.longitude &&
      leftGroup.startOrder === rightGroup.startOrder &&
      leftGroup.endOrder === rightGroup.endOrder &&
      leftGroup.momentIds.length === rightGroup.momentIds.length &&
      leftGroup.momentIds.every(
        (momentId, momentIndex) => momentId === rightGroup.momentIds[momentIndex],
      )
    );
  });
}

export function TripMap({
  trip,
  moments,
  selectedMomentId,
  onSelectMoment,
  draftLocation,
  allowPick = false,
  onPickLocation,
  fitKey = 0,
  heightClassName = "h-[calc(100vh-1.5rem)]",
  className,
  onMomentGroupsChange,
}: TripMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const didFitInitialViewRef = useRef(false);
  const latestMomentGroupsRef = useRef<MomentMarkerGroup[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [momentGroups, setMomentGroups] = useState<MomentMarkerGroup[]>([]);
  const center = useMemo(() => getMapCenter(trip, moments), [trip, moments]);
  const bounds = useMemo(() => getMapBounds(moments), [moments]);
  const trail = useMemo(() => buildTrail(moments, trip.timezone), [moments, trip.timezone]);
  const routeLineLayer = useMemo<LayerProps>(
    () => ({
      id: "crumbs-route",
      type: "line",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 7],
        "line-gradient": (trail.gradient ??
          "#15161c") as unknown as LineLayerPaint["line-gradient"],
      },
    }),
    [trail.gradient],
  );

  const publishMomentGroups = useCallback(
    (nextGroups: MomentMarkerGroup[]) => {
      if (areMomentMarkerGroupsEqual(latestMomentGroupsRef.current, nextGroups)) {
        return;
      }

      latestMomentGroupsRef.current = nextGroups;
      setMomentGroups(nextGroups);
      onMomentGroupsChange?.(nextGroups);
    },
    [onMomentGroupsChange],
  );

  const recomputeMomentGroups = useCallback(() => {
    const map = mapRef.current?.getMap();

    if (!map) {
      return;
    }

    const nextGroups = buildMomentMarkerGroups(
      moments,
      (coordinates) => map.project(coordinates),
    );

    publishMomentGroups(nextGroups);
  }, [moments, publishMomentGroups]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    if (draftLocation) {
      const tuning = getViewportTuning(map);

      map.flyTo({
        center: [draftLocation.longitude, draftLocation.latitude],
        zoom: tuning.draftZoom,
        duration: 900,
      });
      return;
    }

    if (bounds) {
      const fitDuration = didFitInitialViewRef.current ? 900 : 0;
      const tuning = getViewportTuning(map);

      map.fitBounds(bounds, {
        padding: tuning.fitPadding,
        duration: fitDuration,
        maxZoom: tuning.fitMaxZoom,
      });
      didFitInitialViewRef.current = true;

      if (fitDuration === 0) {
        window.requestAnimationFrame(() => {
          recomputeMomentGroups();
        });
      }

      return;
    }

    didFitInitialViewRef.current = true;
    recomputeMomentGroups();
  }, [bounds, draftLocation, fitKey, mapReady, recomputeMomentGroups]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !selectedMomentId) {
      return;
    }

    const moment = moments.find((entry) => entry.id === selectedMomentId);

    if (!moment || !hasCoordinates(moment)) {
      return;
    }

    map.flyTo({
      center: [moment.longitude as number, moment.latitude as number],
      zoom: getSelectedMomentZoom(map, moment, moments),
      duration: 800,
    });
  }, [selectedMomentId, moments]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 border-[var(--line)] bg-[var(--paper-strong)]",
        heightClassName,
        className,
      )}
    >
      <Map
        ref={mapRef}
        attributionControl={false}
        cursor={allowPick ? "crosshair" : "grab"}
        initialViewState={{
          longitude: center.longitude,
          latitude: center.latitude,
          zoom: getViewportTuning(null).initialZoom,
        }}
        mapLib={maplibregl}
        mapStyle={publicEnv.mapStyleUrl}
        reuseMaps
        onLoad={() => {
          setMapReady(true);
          recomputeMomentGroups();
        }}
        onClick={(event) => {
          if (!allowPick || !onPickLocation) {
            return;
          }

          onPickLocation({
            latitude: event.lngLat.lat,
            longitude: event.lngLat.lng,
            locationSource: "manual",
          });
        }}
        onMoveEnd={() => {
          recomputeMomentGroups();
        }}
      >
        <Source data={trail.data} id="crumbs-route-source" lineMetrics type="geojson">
          <Layer {...routeCasingLayer} />
          <Layer {...routeLineLayer} />
        </Source>

        {momentGroups.map((group) => {
          const activeMoment =
            group.moments.find((moment) => moment.id === selectedMomentId) ??
            group.moments[0];

          return (
            <Marker
              key={group.id}
              anchor="bottom"
              latitude={group.latitude}
              longitude={group.longitude}
            >
              <MomentMarker
                color={getMomentTimeColor(activeMoment, trip.timezone)}
                moment={activeMoment}
                onClick={() => onSelectMoment?.(activeMoment.id)}
                order={group.startOrder}
                endOrder={group.endOrder}
                clusterSize={group.moments.length}
                selected={
                  selectedMomentId ? group.momentIds.includes(selectedMomentId) : false
                }
              />
            </Marker>
          );
        })}

        {draftLocation ? (
          <Marker
            anchor="bottom"
            latitude={draftLocation.latitude}
            longitude={draftLocation.longitude}
          >
            <div className="crumbs-map-pin grid h-11 w-11 place-items-center rounded-full border-[6px] border-[#15161c] bg-white">
              <div className="h-3 w-3 rounded-full bg-[var(--route-tomato)]" />
            </div>
          </Marker>
        ) : null}
      </Map>
    </div>
  );
}
