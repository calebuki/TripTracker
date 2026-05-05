"use client";

import { useEffect, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";

import { MomentMarker } from "@/components/moment-marker";
import { publicEnv } from "@/lib/env";
import {
  buildTrailGeoJson,
  getMapBounds,
  getMapCenter,
  hasCoordinates,
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
}: TripMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const center = getMapCenter(trip, moments);
  const trail = buildTrailGeoJson(moments);

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
    }
  }, [moments, draftLocation, fitKey]);

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
        mapLib={maplibregl}
        initialViewState={{
          longitude: center.longitude,
          latitude: center.latitude,
          zoom: 11.5,
        }}
        mapStyle={publicEnv.mapStyleUrl}
        reuseMaps
        attributionControl={false}
        cursor={allowPick ? "crosshair" : "grab"}
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
      >
        <Source id="triptrace-route-source" type="geojson" data={trail}>
          <Layer {...routeGlowLayer} />
          <Layer {...routeLineLayer} />
        </Source>

        {moments.filter(hasCoordinates).map((moment) => (
          <Marker
            key={moment.id}
            latitude={moment.latitude as number}
            longitude={moment.longitude as number}
            anchor="bottom"
          >
            <MomentMarker
              moment={moment}
              selected={selectedMomentId === moment.id}
              onClick={() => onSelectMoment?.(moment.id)}
            />
          </Marker>
        ))}

        {draftLocation ? (
          <Marker
            latitude={draftLocation.latitude}
            longitude={draftLocation.longitude}
            anchor="bottom"
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
