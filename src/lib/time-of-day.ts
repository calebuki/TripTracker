import { DateTime } from "luxon";

import { getMomentTimestamp } from "@/lib/time";
import type { Moment } from "@/types/crumbs";

// Trail colours follow the light at the trip's local time: deep blue at
// night, orange at sunrise, yellow through the day, red at sunset, purple at
// dusk.
const timeOfDayKeyframes = [
  { hour: 0, color: "#172069" },
  { hour: 4, color: "#25308f" },
  { hour: 5.5, color: "#5b48b0" },
  { hour: 6.5, color: "#ff7a2f" },
  { hour: 8, color: "#ffa12b" },
  { hour: 10, color: "#ffc629" },
  { hour: 13, color: "#ffd43d" },
  { hour: 16, color: "#ffa12b" },
  { hour: 18.5, color: "#f0502f" },
  { hour: 20, color: "#b5338d" },
  { hour: 21.5, color: "#4d3aa6" },
  { hour: 23, color: "#25308f" },
  { hour: 24, color: "#172069" },
] as const;

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
}

function rgbToHex(channels: readonly number[]) {
  return `#${channels
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getTimeOfDayColor(hour: number) {
  const wrapped = ((hour % 24) + 24) % 24;
  const nextIndex = timeOfDayKeyframes.findIndex((frame) => frame.hour >= wrapped);
  const next = timeOfDayKeyframes[Math.max(1, nextIndex)];
  const previous = timeOfDayKeyframes[Math.max(1, nextIndex) - 1];
  const progress = (wrapped - previous.hour) / (next.hour - previous.hour);
  const from = hexToRgb(previous.color);
  const to = hexToRgb(next.color);

  return rgbToHex(from.map((channel, index) => channel + (to[index] - channel) * progress));
}

function getLocalTime(timestamp: string, timezone: string) {
  return DateTime.fromISO(timestamp, { setZone: true }).setZone(timezone);
}

export function getMomentTimeColor(moment: Moment, timezone: string) {
  const local = getLocalTime(getMomentTimestamp(moment), timezone);
  return getTimeOfDayColor(local.hour + local.minute / 60);
}

export function formatMomentLocalTime(moment: Moment, timezone: string) {
  return getLocalTime(getMomentTimestamp(moment), timezone).toFormat("h:mm a");
}

export interface TimeGradientStop {
  offset: number;
  color: string;
}

/**
 * Colours along the stretch of trail between two moments, one stop per hour
 * that passed, so an overnight gap fades through dusk, night and dawn.
 */
export function getTimeGradientStops(
  fromTimestamp: string,
  toTimestamp: string,
  timezone: string,
): TimeGradientStop[] {
  const from = getLocalTime(fromTimestamp, timezone);
  const to = getLocalTime(toTimestamp, timezone);
  const elapsedMs = Math.max(0, to.toMillis() - from.toMillis());
  const steps = Math.min(48, Math.max(1, Math.ceil(elapsedMs / 3_600_000)));

  return Array.from({ length: steps + 1 }, (_, step) => {
    const at = from.plus({ milliseconds: (elapsedMs * step) / steps });
    return {
      offset: step / steps,
      color: getTimeOfDayColor(at.hour + at.minute / 60),
    };
  });
}

// A whole day left to right, for legends.
export const timeOfDayCssGradient = `linear-gradient(to right, ${timeOfDayKeyframes
  .map((frame) => `${frame.color} ${((frame.hour / 24) * 100).toFixed(2)}%`)
  .join(", ")})`;
