"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { RouteDiagramLayout, RouteSegment } from "@/lib/route-diagram";
import { cn } from "@/lib/utils";

// The line draws one stretch at a time and eases into each station.
const segmentDrawMs = 420;

interface LabelPlacement {
  x: number;
  y: number;
  anchor: "start" | "end" | "middle";
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function overlaps(a: Box, b: Box) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Small boxes along every drawn line, so labels never sit on a route.
function lineBoxes(segments: RouteSegment[], strokeWidth: number) {
  const half = strokeWidth / 2;
  const boxes: Box[] = [];

  for (const segment of segments) {
    for (let index = 1; index < segment.points.length; index += 1) {
      const from = segment.points[index - 1];
      const to = segment.points[index];
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / half));

      for (let step = 0; step <= steps; step += 1) {
        const x = from.x + ((to.x - from.x) * step) / steps;
        const y = from.y + ((to.y - from.y) * step) / steps;
        boxes.push({ left: x - half, right: x + half, top: y - half, bottom: y + half });
      }
    }
  }

  return boxes;
}

// Tries each side of a station in turn and keeps the first spot that clears
// the lines, every station and earlier labels.
function placeLabels(
  layout: RouteDiagramLayout,
  stationRadius: number,
  strokeWidth: number,
  labelSize: number,
) {
  const { stations, width, height } = layout;
  const placed = new Map<string, LabelPlacement>();
  const stationBoxes: Box[] = stations.map((station) => ({
    left: station.x - stationRadius * 1.3,
    right: station.x + stationRadius * 1.3,
    top: station.y - stationRadius * 1.3,
    bottom: station.y + stationRadius * 1.3,
  }));
  const routeBoxes = lineBoxes(layout.segments, strokeWidth);
  const labelBoxes: Box[] = [];

  for (const station of stations) {
    if (!station.label) {
      continue;
    }

    const textWidth = station.label.length * labelSize * 0.56;
    const gap = stationRadius * 1.25 + 8;
    const sideways = (anchor: "start" | "end"): LabelPlacement => ({
      anchor,
      x: station.x + (anchor === "start" ? gap : -gap),
      y: station.y + labelSize * 0.34,
    });
    const preferRight = station.x + gap + textWidth <= width;
    const candidates: LabelPlacement[] = [
      sideways(preferRight ? "start" : "end"),
      sideways(preferRight ? "end" : "start"),
      { anchor: "middle", x: station.x, y: station.y - gap },
      { anchor: "middle", x: station.x, y: station.y + gap + labelSize * 0.7 },
    ];
    const boxFor = (placement: LabelPlacement): Box => {
      const left =
        placement.anchor === "start"
          ? placement.x
          : placement.anchor === "end"
            ? placement.x - textWidth
            : placement.x - textWidth / 2;
      return {
        left,
        right: left + textWidth,
        top: placement.y - labelSize * 0.8,
        bottom: placement.y + labelSize * 0.25,
      };
    };
    const ownStation = stations.indexOf(station);
    const count = (boxes: Box[], box: Box, skip = -1) =>
      boxes.filter((other, index) => index !== skip && overlaps(box, other)).length;
    // Cheapest spot wins. The SVG doesn't clip, so a label may hang a little
    // past the sheet, but never far enough to push the page sideways.
    const cost = (placement: LabelPlacement) => {
      const box = boxFor(placement);
      const sideOverhang = Math.max(0, -box.left) + Math.max(0, box.right - width);
      return (
        (sideOverhang > 16 ? 1000 : sideOverhang > 0 ? 4 + sideOverhang * 0.25 : 0) +
        (box.top < 0 || box.bottom > height ? 3 : 0) +
        count(labelBoxes, box) * 20 +
        count(stationBoxes, box, ownStation) * 20 +
        // Labels keep clear of the line rather than sitting on it.
        count(routeBoxes, box) * 20
      );
    };
    const choice = candidates.reduce((best, candidate) =>
      cost(candidate) < cost(best) ? candidate : best,
    );

    placed.set(station.id, choice);
    labelBoxes.push(boxFor(choice));
  }

  return placed;
}

interface RouteDiagramProps {
  layout: RouteDiagramLayout;
  label: string;
  animate?: boolean;
  train?: boolean;
  showLabels?: boolean;
  strokeWidth?: number;
  stationRadius?: number;
  labelSize?: number;
  activeStationId?: string | null;
  onStationSelect?: (stationId: string) => void;
  className?: string;
}

export function RouteDiagram({
  layout,
  label,
  animate = true,
  train = false,
  showLabels = false,
  strokeWidth = 10,
  stationRadius = 9,
  labelSize = 15,
  activeStationId = null,
  onStationSelect,
  className,
}: RouteDiagramProps) {
  const pathId = `route-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const reducedMotion = usePrefersReducedMotion();
  const drawsIn = animate && !reducedMotion;
  const drawnMs = Math.max(1, layout.segments.length) * segmentDrawMs;
  const [trainReady, setTrainReady] = useState(false);
  const [inView, setInView] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const showTrain = train && trainReady && !reducedMotion && layout.path !== "";
  const labels = useMemo(
    () =>
      showLabels
        ? placeLabels(layout, stationRadius, strokeWidth, labelSize)
        : new Map<string, LabelPlacement>(),
    [labelSize, layout, showLabels, stationRadius, strokeWidth],
  );

  // The line draws when it scrolls into view, not while it is still offscreen.
  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!train || reducedMotion || !inView) {
      return;
    }

    const timeout = window.setTimeout(
      () => setTrainReady(true),
      drawsIn ? drawnMs : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [drawnMs, drawsIn, inView, reducedMotion, train]);

  // SMIL clocks start with the document, so start the train explicitly.
  useLayoutEffect(() => {
    if (showTrain) {
      motionRef.current?.beginElement();
    }
  }, [showTrain]);

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, stationId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onStationSelect?.(stationId);
    }
  }

  return (
    <svg
      aria-label={label}
      className={cn("route-diagram", className)}
      data-animate={drawsIn ? (inView ? "true" : "waiting") : "false"}
      ref={svgRef}
      role={onStationSelect ? "group" : "img"}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
    >
      <defs>
        {layout.segments.map((segment) => (
          // Runs from one station to the next, so the colour follows the time
          // that passed between them.
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={`${pathId}-${segment.index}`}
            key={segment.index}
            x1={segment.from.x}
            x2={segment.to.x}
            y1={segment.from.y}
            y2={segment.to.y}
          >
            {segment.stops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        ))}
      </defs>
      {layout.path ? <path d={layout.path} fill="none" id={pathId} /> : null}
      {layout.segments.map((segment) => {
        const timing = {
          "--delay": `${segment.index * segmentDrawMs}ms`,
          "--draw": `${segmentDrawMs}ms`,
        } as CSSProperties;

        // An ink edge under each stretch, as on the map, so yellow daytime
        // stretches hold up on the light page.
        return (
          <g key={segment.index}>
            <path
              className="route-diagram-path"
              d={segment.d}
              pathLength={1}
              stroke="var(--ink)"
              strokeWidth={strokeWidth + 4}
              style={timing}
            />
            <path
              className="route-diagram-path"
              d={segment.d}
              pathLength={1}
              stroke={`url(#${pathId}-${segment.index})`}
              strokeWidth={strokeWidth}
              style={timing}
            />
          </g>
        );
      })}
      {layout.stations.map((station) => {
        const delay = { "--delay": `${station.order * segmentDrawMs}ms` } as CSSProperties;
        const placement = labels.get(station.id);
        const radius = station.isDayStart ? stationRadius * 1.25 : stationRadius;
        const marker = (
          <>
            <circle
              className="route-diagram-station"
              cx={station.x}
              cy={station.y}
              fill={station.isLast ? "var(--ink)" : "var(--surface)"}
              r={radius}
              stroke={station.isDayStart ? "var(--ink)" : station.color}
              strokeWidth={strokeWidth * 0.55}
              style={delay}
            />
            {placement && station.label ? (
              <text
                className="route-diagram-label"
                fontSize={labelSize}
                style={delay}
                textAnchor={placement.anchor}
                x={placement.x}
                y={placement.y}
              >
                {station.label}
              </text>
            ) : null}
          </>
        );

        if (!onStationSelect) {
          return <g key={station.id}>{marker}</g>;
        }

        return (
          <g
            aria-label={station.label ?? "Unnamed stop"}
            aria-pressed={activeStationId === station.id}
            className="route-diagram-hit"
            data-active={activeStationId === station.id}
            key={station.id}
            onClick={() => onStationSelect(station.id)}
            onFocus={() => onStationSelect(station.id)}
            onKeyDown={(event) => handleKeyDown(event, station.id)}
            onMouseEnter={() => onStationSelect(station.id)}
            role="button"
            tabIndex={0}
          >
            <circle cx={station.x} cy={station.y} fill="transparent" r={radius * 2.4} />
            {marker}
          </g>
        );
      })}
      {showTrain ? (
        <circle
          aria-hidden
          fill="var(--ink)"
          r={strokeWidth * 0.5}
          stroke="var(--surface)"
          strokeWidth={strokeWidth * 0.3}
        >
          <animateMotion
            begin="indefinite"
            dur={`${Math.max(4, layout.stations.length * 0.9)}s`}
            ref={motionRef}
            repeatCount="indefinite"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ) : null}
    </svg>
  );
}
