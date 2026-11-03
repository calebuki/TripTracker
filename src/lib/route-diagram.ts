import {
  getMomentTimestamp,
  getTripDayIndex,
  getTripDayKey,
  sortMomentsChronologically,
} from "@/lib/time";
import {
  formatMomentLocalTime,
  getMomentTimeColor,
  getTimeGradientStops,
  type TimeGradientStop,
} from "@/lib/time-of-day";
import type { Moment } from "@/types/crumbs";

const tripColors = [
  "var(--route-tomato)",
  "var(--route-cobalt)",
  "var(--route-jade)",
  "var(--route-sun)",
  "var(--route-magenta)",
  "var(--route-sky)",
  "var(--route-tangerine)",
  "var(--route-plum)",
] as const;

// A trip keeps the same marker colour everywhere it is listed.
export function getRouteColorForKey(key: string) {
  let hash = 0;

  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return tripColors[Math.abs(hash) % tripColors.length];
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
  // Time-of-day colour, matching the map.
  color: string;
  timeLabel: string;
  // Position along the line, used to time the station's entrance.
  order: number;
}

// The stretch of line between two neighbouring stations.
export interface RouteSegment {
  index: number;
  d: string;
  from: Point;
  to: Point;
  // Every corner of the drawn line, so labels can steer around it.
  points: Point[];
  stops: TimeGradientStop[];
}

export interface RouteDiagramLayout {
  width: number;
  height: number;
  segments: RouteSegment[];
  stations: RouteStation[];
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
  // When given, days are numbered from the trip's start, as on the trip page.
  startDate?: string;
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
    startDate,
  }: RouteDiagramOptions,
): RouteDiagramLayout {
  const located = sortMomentsChronologically(moments).filter(
    (moment): moment is Moment & { latitude: number; longitude: number } =>
      moment.latitude !== null && moment.longitude !== null,
  );
  const empty = { width, height, segments: [], stations: [], path: "" };

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
    const timestamp = getMomentTimestamp(moment);
    const dayKey = getTripDayKey(timestamp, timezone) ?? "";

    if (!dayKeys.includes(dayKey)) {
      dayKeys.push(dayKey);
    }

    const dayIndex = startDate
      ? getTripDayIndex(timestamp, timezone, startDate)
      : dayKeys.indexOf(dayKey);

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

  const segments: RouteSegment[] = [];
  let direction: Direction | null = null;

  for (let index = 1; index < stationsSource.length; index += 1) {
    const from = stationsSource[index - 1];
    const to = stationsSource[index];
    const segment = octilinearSegment(from, to, direction);
    const corners = [from, ...segment.points];

    direction = segment.direction;
    segments.push({
      index: index - 1,
      d: corners
        .map((point, cornerIndex) => `${cornerIndex === 0 ? "M" : " L"}${pointString(point)}`)
        .join(""),
      from: { x: round(from.x), y: round(from.y) },
      to: { x: round(to.x), y: round(to.y) },
      points: corners.map((point) => ({ x: round(point.x), y: round(point.y) })),
      stops: getTimeGradientStops(
        getMomentTimestamp(from.moment),
        getMomentTimestamp(to.moment),
        timezone,
      ),
    });
  }

  const stations: RouteStation[] = stationsSource.map((entry, index) => ({
    id: entry.moment.id,
    x: round(entry.x),
    y: round(entry.y),
    label: entry.moment.placeName,
    caption: entry.moment.caption ?? entry.moment.thoughtText,
    dayIndex: entry.dayIndex,
    isDayStart: index > 0 && entry.dayIndex !== stationsSource[index - 1].dayIndex,
    isLast: index === stationsSource.length - 1,
    color: getMomentTimeColor(entry.moment, timezone),
    timeLabel: formatMomentLocalTime(entry.moment, timezone),
    order: index,
  }));

  return {
    width,
    height,
    segments,
    stations,
    path: segments.map((segment) => segment.d).join(" "),
  };
}
