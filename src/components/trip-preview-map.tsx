"use client";

import { useMemo } from "react";
import Map, { Layer, Source, type LayerProps } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";

import { publicEnv } from "@/lib/env";
import { buildTrail, getMapBounds, getMapCenter, getMomentsWithCoordinates } from "@/lib/map";
import { getMomentTimeColor } from "@/lib/time-of-day";
import { cn } from "@/lib/utils";
import type { Moment, Trip } from "@/types/crumbs";

type LineLayerPaint = NonNullable<Extract<LayerProps, { type: "line" }>["paint"]>;

const casingLayer: LayerProps = {
  id: "preview-route-casing",
  type: "line",
  layout: { "line-join": "round", "line-cap": "round" },
  paint: { "line-color": "#15161c", "line-width": 6 },
};

// Every stop as a small dot in its time-of-day colour; the latest one is ink.
const stopLayer: LayerProps = {
  id: "preview-stops",
  type: "circle",
  paint: {
    "circle-radius": ["case", ["get", "isLast"], 7, 4],
    "circle-color": ["case", ["get", "isLast"], "#15161c", "#ffffff"],
    "circle-stroke-color": ["case", ["get", "isLast"], "#ffffff", ["get", "color"]],
    "circle-stroke-width": ["case", ["get", "isLast"], 3, 2.5],
  },
};

interface TripPreviewMapProps {
  trip: Trip;
  moments: Moment[];
  label: string;
  className?: string;
}

/** A still, real map of the trip: basemap, time-of-day trail and stops. */
export function TripPreviewMap({ trip, moments, label, className }: TripPreviewMapProps) {
  const trail = useMemo(() => buildTrail(moments, trip.timezone), [moments, trip.timezone]);
  const bounds = useMemo(() => getMapBounds(moments), [moments]);
  const center = useMemo(() => getMapCenter(trip, moments), [trip, moments]);
  const stops = useMemo<FeatureCollection<Point>>(() => {
    const located = getMomentsWithCoordinates(moments);

    return {
      type: "FeatureCollection",
      features: located.map((moment, index) => ({
        type: "Feature",
        properties: {
          color: getMomentTimeColor(moment, trip.timezone),
          isLast: index === located.length - 1,
        },
        geometry: {
          type: "Point",
          coordinates: [moment.longitude as number, moment.latitude as number],
        },
      })),
    };
  }, [moments, trip.timezone]);
  const lineLayer = useMemo<LayerProps>(
    () => ({
      id: "preview-route",
      type: "line",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-width": 3.5,
        "line-gradient": (trail.gradient ??
          "#15161c") as unknown as LineLayerPaint["line-gradient"],
      },
    }),
    [trail.gradient],
  );
  const isSingleSpot =
    bounds !== null && bounds[0] === bounds[2] && bounds[1] === bounds[3];

  return (
    <div aria-label={label} className={cn("relative overflow-hidden", className)} role="img">
      <Map
        attributionControl={false}
        initialViewState={
          bounds && !isSingleSpot
            ? { bounds, fitBoundsOptions: { padding: 36, maxZoom: 15 } }
            : { longitude: center.longitude, latitude: center.latitude, zoom: 13 }
        }
        interactive={false}
        mapLib={maplibregl}
        mapStyle={publicEnv.mapStyleUrl}
        // The card may still be settling when the map starts; match its final size.
        onLoad={(event) => event.target.resize()}
        style={{ width: "100%", height: "100%" }}
      >
        <Source data={trail.data} id="preview-route-source" lineMetrics type="geojson">
          <Layer {...casingLayer} />
          <Layer {...lineLayer} />
        </Source>
        <Source data={stops} id="preview-stops-source" type="geojson">
          <Layer {...stopLayer} />
        </Source>
      </Map>
    </div>
  );
}
