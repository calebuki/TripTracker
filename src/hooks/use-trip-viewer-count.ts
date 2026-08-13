"use client";

import { useEffect, useState } from "react";

import { getTripRepository } from "@/lib/repositories";

interface UseTripViewerCountOptions {
  tripId: string | null;
  enabled: boolean;
  recordView: boolean;
}

export function useTripViewerCount({
  tripId,
  enabled,
  recordView,
}: UseTripViewerCountOptions) {
  const [result, setResult] = useState<{
    tripId: string | null;
    count: number | null;
  }>({ tripId: null, count: null });

  useEffect(() => {
    if (!enabled || !tripId) {
      return;
    }

    let cancelled = false;
    const repository = getTripRepository();
    const request = recordView
      ? repository.recordTripView(tripId)
      : repository.getTripUniqueViewerCount(tripId);

    void request
      .then((count) => {
        if (!cancelled) {
          setResult({ tripId, count });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ tripId, count: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, recordView, tripId]);

  return result.tripId === tripId ? result.count : null;
}
