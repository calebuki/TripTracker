"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Lets local development show screens that demo mode normally skips,
 * e.g. `/?preview=welcome` or `/auth?preview=form`. Always off in production.
 */
export function useDevPreview(name: string) {
  return useSyncExternalStore(
    subscribe,
    () =>
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("preview") === name,
    () => false,
  );
}
