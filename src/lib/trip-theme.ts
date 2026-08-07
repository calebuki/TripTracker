import type { CSSProperties } from "react";

import type { TripTheme } from "@/types/crumbs";

type ThemeVariable =
  | "--paper"
  | "--paper-strong"
  | "--surface"
  | "--ink"
  | "--ink-strong"
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
    description: "The original warm paper and ink palette.",
    swatches: ["#f6f1e8", "#e6c98f", "#1d2736"],
    variables: {
      "--paper": "#f6f1e8",
      "--paper-strong": "#efe7da",
      "--surface": "#fffdf9",
      "--ink": "#1d2736",
      "--ink-strong": "#101827",
      "--accent": "#e6c98f",
      "--accent-soft": "#f3e8ce",
      "--ring": "#d6b978",
    },
  },
  {
    value: "blush",
    label: "Blush",
    description: "Lavender blush, pastel pink, and watermelon accents.",
    swatches: ["#FFE5EC", "#FFB3C6", "#FB6F92"],
    variables: {
      "--paper": "#FFE5EC",
      "--paper-strong": "#FFC2D1",
      "--surface": "#FFF8FA",
      "--ink": "#3B1624",
      "--ink-strong": "#260B17",
      "--accent": "#FF8FAB",
      "--accent-soft": "#FFB3C6",
      "--ring": "#FB6F92",
    },
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "A high-contrast dark theme with rose accents.",
    swatches: ["#201922", "#513042", "#F2A0C0"],
    variables: {
      "--paper": "#201922",
      "--paper-strong": "#2B202D",
      "--surface": "#2A202C",
      "--ink": "#FCEBF2",
      "--ink-strong": "#FFF8FB",
      "--accent": "#C97495",
      "--accent-soft": "#513042",
      "--ring": "#F2A0C0",
    },
  },
];

export function getTripTheme(theme: TripTheme | null | undefined) {
  return tripThemeOptions.find((option) => option.value === theme) ?? tripThemeOptions[0];
}

export function getTripThemeStyle(theme: TripTheme | null | undefined): CSSProperties {
  return getTripTheme(theme).variables as CSSProperties;
}
