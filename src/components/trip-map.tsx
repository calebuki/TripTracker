"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";

import { MomentMarker } from "@/components/moment-marker";
import { publicEnv } from "@/lib/env";
import {
  buildMomentMarkerGroups,
  buildTrailGeoJson,
  getMapBounds,
  getMapCenter,
  hasCoordinates,
  type MomentMarkerGroup,
} from "@/lib/map";
import { cn } from "@/lib/utils";
import type { LocationDraft, Moment, Trip } from "@/types/triptrace";

const routeGlowLayer = {
  id: "triptrace-route-glow",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#fff8ea",
    "line-width": 10,
    "line-opacity": 0.95,
  },
} as const;

const routeLineLayer = {
  id: "triptrace-route",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#273244",
    "line-width": 4,
    "line-opacity": 0.88,
  },
} as const;

const routeDirectionLayer = {
  id: "triptrace-route-direction",
  type: "symbol",
  layout: {
    "symbol-placement": "line",
    "symbol-spacing": 120,
    "text-field": ">",
    "text-size": 15,
    "text-keep-upright": false,
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  },
  paint: {
    "text-color": "#fff8ea",
    "text-halo-color": "#273244",
    "text-halo-width": 1.2,
    "text-opacity": 0.95,
  },
} as const;

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
  const latestMomentGroupsRef = useRef<MomentMarkerGroup[]>([]);
  const [momentGroups, setMomentGroups] = useState<MomentMarkerGroup[]>([]);
  const center = getMapCenter(trip, moments);
  const trail = buildTrailGeoJson(moments);

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

    if (!map) {
      return;
    }

    if (draftLocation) {
      map.flyTo({
        center: [draftLocation.longitude, draftLocation.latitude],
        zoom: 13,
        duration: 900,
      });
      return;
    }

    const bounds = getMapBounds(moments);

    if (bounds) {
      map.fitBounds(bounds, {
        padding: 64,
        duration: 900,
        maxZoom: 14,
      });
      return;
    }

    recomputeMomentGroups();
  }, [moments, draftLocation, fitKey, recomputeMomentGroups]);

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
      zoom: 14.5,
      duration: 800,
    });
  }, [selectedMomentId, moments]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[30px] border border-black/5 bg-[#dfe7ef]",
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
          zoom: 11.5,
        }}
        mapLib={maplibregl}
        mapStyle={publicEnv.mapStyleUrl}
        reuseMaps
        onLoad={() => {
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
        <Source data={trail} id="triptrace-route-source" type="geojson">
          <Layer {...routeGlowLayer} />
          <Layer {...routeLineLayer} />
          <Layer {...routeDirectionLayer} />
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[var(--accent)] shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
              <div className="h-4 w-4 rounded-full bg-[var(--ink)]" />
            </div>
          </Marker>
        ) : null}

        <div className="absolute right-3 top-3 hidden sm:block">
          <NavigationControl showCompass={false} visualizePitch={false} />
        </div>
      </Map>
    </div>
  );
}
