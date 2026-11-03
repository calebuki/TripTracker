import type { CSSProperties } from "react";

import type { TripTheme } from "@/types/crumbs";

type ThemeVariable =
  | "--paper"
  | "--paper-strong"
  | "--surface"
  | "--ink"
  | "--ink-strong"
  | "--ink-soft"
  | "--line"
  | "--accent"
  | "--accent-soft"
  | "--ring";

interface TripThemeOption {
  value: TripTheme;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
  variables: Record<ThemeVariable, string>;
}

export const tripThemeOptions: readonly TripThemeOption[] = [
  {
    value: "classic",
    label: "Classic",
    description: "Light ground, ink type, bold route colours.",
    swatches: ["#f4f4f0", "#ffc629", "#15161c"],
    variables: {
      "--paper": "#f4f4f0",
      "--paper-strong": "#e6e6df",
      "--surface": "#ffffff",
      "--ink": "#15161c",
      "--ink-strong": "#000000",
      "--ink-soft": "#555863",
      "--line": "#d6d6ce",
      "--accent": "#ffc629",
      "--accent-soft": "#fff1c4",
      "--ring": "#2d5bff",
    },
  },
  {
    value: "blush",
    label: "Blush",
    description: "Pink ground with hot-pink accents.",
    swatches: ["#ffe4ec", "#ff4f8b", "#2b0f1d"],
    variables: {
      "--paper": "#ffe4ec",
      "--paper-strong": "#ffc9d9",
      "--surface": "#fff6f9",
      "--ink": "#2b0f1d",
      "--ink-strong": "#170510",
      "--ink-soft": "#6e3a50",
      "--line": "#f2a9c0",
      "--accent": "#ff4f8b",
      "--accent-soft": "#ffc9d9",
      "--ring": "#b5175a",
    },
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Dark ground for viewing at night.",
    swatches: ["#121319", "#ffc629", "#f2f2f5"],
    variables: {
      "--paper": "#121319",
      "--paper-strong": "#20222b",
      "--surface": "#1b1d25",
      "--ink": "#f2f2f5",
      "--ink-strong": "#ffffff",
      "--ink-soft": "#a9abb8",
      "--line": "#353845",
      "--accent": "#ffc629",
      "--accent-soft": "#3b3422",
      "--ring": "#7d9bff",
    },
  },
];

export function getTripTheme(theme: TripTheme | null | undefined) {
  return tripThemeOptions.find((option) => option.value === theme) ?? tripThemeOptions[0];
}

export function getTripThemeStyle(theme: TripTheme | null | undefined): CSSProperties {
  return getTripTheme(theme).variables as CSSProperties;
}
