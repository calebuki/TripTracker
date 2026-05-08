"use client";

import { useCallback, useEffect, useState } from "react";

import { getTripRepository } from "@/lib/repositories";
import { useTripTraceAuth } from "@/hooks/use-triptrace-auth";
import type { RouteRole, TripRecord } from "@/types/triptrace";

interface UseTripRecordOptions {
  role: RouteRole;
  tripId?: string;
  shareSlug?: string;
}

const tripRecordTimeoutMs = 8_000;

export function useTripRecord({
  role,
  tripId,
  shareSlug,
}: UseTripRecordOptions) {
  const { user, loading: authLoading, isDemoMode } = useTripTraceAuth();
  const [record, setRecord] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const repository = getTripRepository();
      let timeoutId: number | undefined;
      try {
        const nextRecord = await Promise.race([
          role === "owner"
            ? repository.getTripById(tripId ?? "")
            : repository.getTripByShareSlug(shareSlug ?? ""),
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              reject(
                new Error("TripTrace took too long to load this trip. Please try again."),
              );
            }, tripRecordTimeoutMs);
          }),
        ]);

        setRecord(nextRecord);

        if (!nextRecord) {
          setError(
            role === "owner"
              ? "Trip not found or you do not have access."
              : "We couldn't find that shared trip.",
          );
        }
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "TripTrace could not load this trip.",
      );
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [role, shareSlug, tripId]);

  useEffect(() => {
    if (role === "owner" && authLoading) {
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });
  }, [authLoading, refresh, role, user?.id]);

  return {
    record,
    loading: loading || (role === "owner" && authLoading),
    error,
    refresh,
    user,
    isDemoMode,
  };
}
