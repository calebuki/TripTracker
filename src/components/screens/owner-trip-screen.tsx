"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CenteredPage } from "@/components/centered-page";
import { LoadingShell } from "@/components/loading-shell";
import { TripExperience } from "@/components/trip-experience";
import { Button } from "@/components/ui/button";
import { useTripRecord } from "@/hooks/use-trip-record";
import { useTripViewerCount } from "@/hooks/use-trip-viewer-count";

interface OwnerTripScreenProps {
  tripId: string;
  autoOpenCapture?: boolean;
}

export function OwnerTripScreen({
  tripId,
  autoOpenCapture = false,
}: OwnerTripScreenProps) {
  const [pendingAutoOpenCapture, setPendingAutoOpenCapture] =
    useState(autoOpenCapture);
  const { record, loading, error, refresh, isDemoMode } = useTripRecord({
    role: "owner",
    tripId,
  });
  const uniqueViewerCount = useTripViewerCount({
    tripId: record?.trip.id ?? null,
    enabled: Boolean(record),
    recordView: false,
  });
  const handleAutoOpenCaptureConsumed = useCallback(() => {
    setPendingAutoOpenCapture(false);
  }, []);

  useEffect(() => {
    if (!autoOpenCapture) {
      return;
    }

    const url = new URL(window.location.href);

    if (!url.searchParams.has("capture")) {
      return;
    }

    url.searchParams.delete("capture");
    window.history.replaceState({}, document.title, url.toString());
  }, [autoOpenCapture]);

  if (loading) {
    return <LoadingShell />;
  }

  if (!record) {
    return (
      <CenteredPage>
        <h1 className="font-display text-5xl">Trip not available</h1>
        <p className="mt-3 text-lg font-medium text-[var(--ink-soft)]">
          {error ?? "Crumbs couldn't load this trip."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => void refresh()} type="button">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to your trips</Link>
          </Button>
        </div>
      </CenteredPage>
    );
  }

  return (
    <TripExperience
      record={record}
      role="owner"
      isDemoMode={isDemoMode}
      onRefresh={refresh}
      uniqueViewerCount={uniqueViewerCount}
      autoOpenCapture={pendingAutoOpenCapture}
      onAutoOpenCaptureConsumed={handleAutoOpenCaptureConsumed}
    />
  );
}
