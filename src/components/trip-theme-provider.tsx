"use client";

import { createContext, useContext } from "react";
import { getTripThemeStyle } from "@/lib/trip-theme";
import type { TripTheme } from "@/types/crumbs";

export const TripThemeContext = createContext<TripTheme>("classic");

// Portaled menus keep the same palette as the trip that opened them.
export function useTripSurfaceTheme() {
  const theme = useContext(TripThemeContext);
  return { "data-trip-theme": theme, style: getTripThemeStyle(theme) };
}
