import {
  getMomentTimestamp,
  getTripDayKey,
  sortMomentsChronologically,
} from "@/lib/time";
import type { Moment } from "@/types/crumbs";

export const routeColors = [
  "var(--route-tomato)",
  "var(--route-cobalt)",
  "var(--route-jade)",
  "var(--route-sun)",
  "var(--route-magenta)",
  "var(--route-sky)",
  "var(--route-tangerine)",
  "var(--route-plum)",
] as const;

export function getRouteColor(index: number) {
  const count = routeColors.length;
  return routeColors[((index % count) + count) % count];
}

// A trip keeps the same line colour everywhere it is listed.
export function getRouteColorForKey(key: string) {
  let hash = 0;

  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return getRouteColor(Math.abs(hash));
}

export interface RouteStation {
  id: string;
  x: number;
  y: number;
  label: string | null;
  caption: string | null;
  dayIndex: number;
  isDayStart: boolean;
  isLast: boolean;
  color: string;
  // 0–1 position along its day's leg, used to time the station's entrance.
  legProgress: number;
}

export interface RouteLeg {
  dayIndex: number;
  color: string;
  d: string;
  // Every corner of the drawn line, so labels can steer around it.
  points: Point[];
}

export interface RouteDiagramLayout {
  width: number;
  height: number;
  legs: RouteLeg[];
  stations: RouteStation[];
  dayCount: number;
  path: string;
}

export interface Point {
  x: number;
  y: number;
}

interface RouteDiagramOptions {
  width: number;
  height: number;
  padding?: number;
  minGap?: number;
  maxStations?: number;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function pointString({ x, y }: Point) {
  return `${round(x)} ${round(y)}`;
}

type Direction = readonly [number, number];

// Joins two stations the way a transit map would: straight runs and 45° turns.
// The bend sits in the middle unless that would double back over the line we
// just drew, in which case the turn comes first.
function octilinearSegment(from: Point, to: Point, arrivedFrom: Direction | null) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const horizontal = adx >= ady;
  const straight: Direction = horizontal ? [sx, 0] : [0, sy];
  const diagonal: Direction = [sx, sy];
  const reverses =
    arrivedFrom !== null &&
    straight[0] === -arrivedFrom[0] &&
    straight[1] === -arrivedFrom[1];
  const run = (horizontal ? adx - ady : ady - adx) / (reverses ? 1 : 2);
  const turn = horizontal ? ady : adx;
  const points: Point[] = [];

  if (!reverses) {
    points.push({ x: from.x + straight[0] * run, y: from.y + straight[1] * run });
  }

  const corner = points[points.length - 1] ?? from;
  points.push({ x: corner.x + diagonal[0] * turn, y: corner.y + diagonal[1] * turn });
  points.push(to);

  // Both shapes end on the straight run whenever there is one.
  const lastMove: Direction = run > 0 ? straight : turn > 0 ? diagonal : straight;

  return {
    points,
    direction: lastMove,
  };
}

function octilinearPath(stops: Point[]) {
  const corners: Point[] = [stops[0]];
  let direction: Direction | null = null;

  for (let index = 1; index < stops.length; index += 1) {
    const segment = octilinearSegment(stops[index - 1], stops[index], direction);
    corners.push(...segment.points);
    direction = segment.direction;
  }

  return {
    d: corners
      .map((point, index) => `${index === 0 ? "M" : " L"}${pointString(point)}`)
      .join(""),
    points: corners.map((point) => ({ x: round(point.x), y: round(point.y) })),
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Lays a trip's located moments out as a schematic line. Distances from the
 * trip's centre are square-root compressed, so a city cluster stays readable
 * when one stop (an airport, a day trip) sits far away.
 */
export function buildRouteDiagram(
  moments: Moment[],
  timezone: string,
  {
    width,
    height,
    padding = 24,
    minGap = 28,
    maxStations = 14,
  }: RouteDiagramOptions,
): RouteDiagramLayout {
  const located = sortMomentsChronologically(moments).filter(
    (moment): moment is Moment & { latitude: number; longitude: number } =>
      moment.latitude !== null && moment.longitude !== null,
  );
  const empty = { width, height, legs: [], stations: [], dayCount: 0, path: "" };

  if (located.length === 0) {
    return empty;
  }

  const centreLat = median(located.map((moment) => moment.latitude));
  const centreLng = median(located.map((moment) => moment.longitude));
  const lngScale = Math.cos((centreLat * Math.PI) / 180);
  const projected = located.map((moment) => {
    const dx = (moment.longitude - centreLng) * lngScale;
    const dy = moment.latitude - centreLat;
    const distance = Math.hypot(dx, dy);
    const compression = distance > 0 ? Math.sqrt(distance) / distance : 0;
    return { x: dx * compression, y: -dy * compression };
  });

  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const rangeX = Math.max(...xs) - minX;
  const rangeY = Math.max(...ys) - minY;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const isPointLike = rangeX < 1e-9 && rangeY < 1e-9;
  // Transit maps stretch geography to fill the sheet; cap it so shapes stay recognisable.
  const maxStretch = 2.2;
  const fitX = rangeX > 1e-9 ? innerWidth / rangeX : Infinity;
  const fitY = rangeY > 1e-9 ? innerHeight / rangeY : Infinity;
  const baseScale = Math.min(fitX, fitY);
  const scaleX = Math.min(fitX, baseScale * maxStretch);
  const scaleY = Math.min(fitY, baseScale * maxStretch);

  const dayKeys: string[] = [];
  const placed = located.map((moment, index) => {
    const dayKey = getTripDayKey(getMomentTimestamp(moment), timezone) ?? "";
    let dayIndex = dayKeys.indexOf(dayKey);

    if (dayIndex === -1) {
      dayKeys.push(dayKey);
      dayIndex = dayKeys.length - 1;
    }

    // Every stop shares one spot: lay them out left to right instead.
    const point = isPointLike
      ? {
          x:
            located.length === 1
              ? width / 2
              : padding + (innerWidth * index) / (located.length - 1),
          y: height / 2 + (index % 2 === 0 ? -1 : 1) * Math.min(18, innerHeight / 4),
        }
      : {
          x: padding + (projected[index].x - minX) * scaleX + (innerWidth - rangeX * scaleX) / 2,
          y: padding + (projected[index].y - minY) * scaleY + (innerHeight - rangeY * scaleY) / 2,
        };

    return { moment, dayIndex, ...point };
  });

  // Merge stops that would sit on top of each other, keeping each day's start.
  const kept: typeof placed = [];

  for (const entry of placed) {
    const lastKept = kept[kept.length - 1];

    if (
      !lastKept ||
      entry.dayIndex !== lastKept.dayIndex ||
      Math.hypot(entry.x - lastKept.x, entry.y - lastKept.y) >= minGap
    ) {
      kept.push(entry);
    }
  }

  let stationsSource = kept;

  if (kept.length > maxStations) {
    const required = new Set<number>([0, kept.length - 1]);
    kept.forEach((entry, index) => {
      if (index > 0 && entry.dayIndex !== kept[index - 1].dayIndex) {
        required.add(index);
      }
    });
    const slots = Math.max(0, maxStations - required.size);
    for (let slot = 1; slot <= slots; slot += 1) {
      required.add(Math.round((slot * (kept.length - 1)) / (slots + 1)));
    }
    stationsSource = kept.filter((_, index) => required.has(index));
  }

  const legs: RouteLeg[] = [];
  const stations: RouteStation[] = [];
  let previousEnd: Point | null = null;

  for (let dayIndex = 0; dayIndex < dayKeys.length; dayIndex += 1) {
    const dayStops = stationsSource.filter((entry) => entry.dayIndex === dayIndex);

    if (dayStops.length === 0) {
      continue;
    }

    const legPoints: Point[] = previousEnd ? [previousEnd, ...dayStops] : dayStops;
    const color = getRouteColor(dayIndex);
    const offset = previousEnd ? 1 : 0;

    if (legPoints.length > 1) {
      legs.push({ dayIndex, color, ...octilinearPath(legPoints) });
    }

    dayStops.forEach((entry, index) => {
      const moment = entry.moment;
      stations.push({
        id: moment.id,
        x: round(entry.x),
        y: round(entry.y),
        label: moment.placeName,
        caption: moment.caption ?? moment.thoughtText,
        dayIndex,
        isDayStart: index === 0 && dayIndex > 0,
        isLast: false,
        color,
        legProgress:
          legPoints.length > 1 ? (index + offset) / (legPoints.length - 1) : 0,
      });
    });

    previousEnd = dayStops[dayStops.length - 1];
  }

  if (stations.length > 0) {
    stations[stations.length - 1].isLast = true;
  }

  return {
    width,
    height,
    legs,
    stations,
    dayCount: dayKeys.length,
    path: legs.map((leg) => leg.d).join(" "),
  };
}
