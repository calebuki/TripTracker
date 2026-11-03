"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

import { CrumbsBrand } from "@/components/crumbs-brand";
import { LoadingShell } from "@/components/loading-shell";
import { TripExperience } from "@/components/trip-experience";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { useTripRecord } from "@/hooks/use-trip-record";
import { useTripViewerCount } from "@/hooks/use-trip-viewer-count";
import { hashPasscode } from "@/lib/crypto";
import { getTripRepository } from "@/lib/repositories";

interface ViewerTripScreenProps {
  shareSlug: string;
}

export function ViewerTripScreen({ shareSlug }: ViewerTripScreenProps) {
  const { record, loading, error, refresh, isDemoMode } = useTripRecord({
    role: "viewer",
    shareSlug,
  });
  const [passcode, setPasscode] = useState("");
  const [verifiedOverride, setVerifiedOverride] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const { user, loading: authLoading } = useCrumbsAuth();
  const storedVerification =
    typeof window !== "undefined" && record?.trip.viewerPasscodeHash
      ? window.sessionStorage.getItem(
          `crumbs-passcode:${record.trip.shareSlug}`,
        ) === record.trip.viewerPasscodeHash
      : false;
  const verified = Boolean(
    record &&
      (!record.trip.viewerPasscodeHash || storedVerification || verifiedOverride),
  );
  const watchedTripId = record?.trip.id;
  const watchedTripOwnerId = record?.trip.ownerId;
  const currentUserId = user?.id;
  const uniqueViewerCount = useTripViewerCount({
    tripId: watchedTripId ?? null,
    enabled: verified && !authLoading,
    recordView: watchedTripOwnerId !== currentUserId,
  });

  useEffect(() => {
    if (
      authLoading ||
      !currentUserId ||
      !watchedTripId ||
      !verified ||
      watchedTripOwnerId === currentUserId
    ) {
      return;
    }

    void getTripRepository().watchTrip(watchedTripId).catch(() => {
      // Viewing a shared trip remains available even if saving the watchlist fails.
    });
  }, [authLoading, currentUserId, verified, watchedTripId, watchedTripOwnerId]);

  if (loading) {
    return <LoadingShell label="Opening the shared trip…" />;
  }

  if (!record) {
    return (
      <ViewerGate>
        <h1 className="font-display text-5xl">Trip not found</h1>
        <p className="mt-3 text-lg font-medium text-[var(--ink-soft)]">
          {error ?? "The link may have changed, or the trip was removed."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => void refresh()} type="button">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Enter a different code</Link>
          </Button>
        </div>
      </ViewerGate>
    );
  }

  if (!verified && record.trip.viewerPasscodeHash) {
    const trip = record.trip;

    return (
      <ViewerGate>
        <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--ink-soft)]">
          <Lock aria-hidden className="h-4 w-4" />
          Passcode required
        </p>
        <h1 className="mt-3 font-display text-5xl">{trip.title}</h1>
        <form
          className="mt-8 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const hashed = await hashPasscode(trip.shareSlug, passcode);

            if (hashed === trip.viewerPasscodeHash) {
              const key = `crumbs-passcode:${trip.shareSlug}`;
              window.sessionStorage.setItem(key, hashed ?? "");
              setVerifiedOverride(true);
              return;
            }

            setPasscodeError(true);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="viewer-passcode">Passcode from the traveler</Label>
            <Input
              aria-describedby={passcodeError ? "viewer-passcode-error" : undefined}
              aria-invalid={passcodeError}
              autoComplete="off"
              id="viewer-passcode"
              onChange={(event) => {
                setPasscode(event.target.value);
                setPasscodeError(false);
              }}
              type="password"
              value={passcode}
            />
            {passcodeError ? (
              <p
                className="text-sm font-semibold text-[var(--danger)]"
                id="viewer-passcode-error"
                role="alert"
              >
                That passcode doesn&apos;t match. Check it with the traveler.
              </p>
            ) : null}
          </div>
          <Button className="w-full" size="lg" type="submit">
            Open trip
          </Button>
        </form>
      </ViewerGate>
    );
  }

  return (
    <TripExperience
      record={record}
      role="viewer"
      isDemoMode={isDemoMode}
      onRefresh={refresh}
      uniqueViewerCount={uniqueViewerCount}
    />
  );
}

function ViewerGate({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-[var(--paper)] px-4 pb-12 pt-5 sm:px-8">
      <nav aria-label="Main navigation" className="mx-auto w-full max-w-6xl">
        <Link aria-label="Crumbs home" className="inline-flex" href="/">
          <CrumbsBrand />
        </Link>
      </nav>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-12">
        {children}
      </div>
    </main>
  );
}
