"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LoadingShell } from "@/components/loading-shell";
import { TripExperience } from "@/components/trip-experience";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTripRecord } from "@/hooks/use-trip-record";

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
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Trip not available</CardTitle>
            <CardDescription>
              {error ?? "We couldn't load this dashboard."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/trips/new">Create a new trip</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <TripExperience
      record={record}
      role="owner"
      isDemoMode={isDemoMode}
      onRefresh={refresh}
      autoOpenCapture={pendingAutoOpenCapture}
      onAutoOpenCaptureConsumed={handleAutoOpenCaptureConsumed}
    />
  );
}
