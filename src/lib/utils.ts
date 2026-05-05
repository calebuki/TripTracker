import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

export function resolveSiteUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function getBrowserTimeZone() {
  if (typeof window === "undefined") {
    return "America/Los_Angeles";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
