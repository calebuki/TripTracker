import type { TripLocationPrivacyMode } from "@/types/triptrace";

export const DEFAULT_PUBLISH_DELAY_HOURS = 6;
export const MIN_PUBLISH_DELAY_HOURS = 1;
export const MAX_PUBLISH_DELAY_HOURS = 168;

export const locationPrivacyChoices: Array<{
  value: TripLocationPrivacyMode;
  label: string;
  description: string;
}> = [
  {
    value: "exact",
    label: "Exact",
    description: "Show moments exactly where they happened.",
  },
  {
    value: "delayed",
    label: "Delayed",
    description:
      "Keep new moments private for a few hours, then publish them at their exact location.",
  },
];

export function clampPublishDelayHours(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_PUBLISH_DELAY_HOURS;
  }

  return Math.min(
    MAX_PUBLISH_DELAY_HOURS,
    Math.max(MIN_PUBLISH_DELAY_HOURS, Math.round(value)),
  );
}
