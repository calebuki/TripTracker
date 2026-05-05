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
      const nextRecord =
        role === "owner"
          ? await repository.getTripById(tripId ?? "")
          : await repository.getTripByShareSlug(shareSlug ?? "");

      setRecord(nextRecord);

      if (!nextRecord) {
        setError(
          role === "owner"
            ? "Trip not found or you do not have access."
            : "We couldn't find that shared trip.",
        );
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
    if (authLoading) {
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });
  }, [authLoading, refresh, user?.id]);

  return {
    record,
    loading: loading || authLoading,
    error,
    refresh,
    user,
    isDemoMode,
  };
}
