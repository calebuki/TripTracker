"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DateTime } from "luxon";
import { LoaderCircle, LogOut, Play, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTripTraceAuth } from "@/hooks/use-triptrace-auth";
import { getTripRepository } from "@/lib/repositories";
import type { Trip } from "@/types/triptrace";

function formatEndedOn(date: string, timezone: string) {
  return DateTime.fromISO(date, { zone: timezone }).toFormat("LLL d, yyyy");
}

export function ProfileScreen() {
  const router = useRouter();
  const { user, loading: authLoading, isDemoMode } = useTripTraceAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingTripId, setWorkingTripId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingTrips(true);
    setError(null);

    try {
      const nextTrips = await getTripRepository().listTripsForCurrentUser();
      setTrips(nextTrips);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "TripTrace could not load your trips.",
      );
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user && !isDemoMode) {
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });
  }, [authLoading, isDemoMode, refresh, user]);

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.endDate === null) ?? null,
    [trips],
  );
  const pastTrips = useMemo(
    () => trips.filter((trip) => trip.endDate !== null),
    [trips],
  );
  const tripsLoading = authLoading || loadingTrips;

  async function handleResumeTrip(trip: Trip) {
    setWorkingTripId(trip.id);

    try {
      await getTripRepository().updateTripSettings(trip.id, {
        endDate: null,
      });
      toast.success("Trip resumed.");
      await refresh();
      router.push(`/trips/${trip.id}?capture=1`);
    } catch (resumeError) {
      toast.error(
        resumeError instanceof Error
          ? resumeError.message
          : "TripTrace could not resume this trip.",
      );
    } finally {
      setWorkingTripId(null);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await getTripRepository().signOut();
      router.push("/");
    } catch (signOutError) {
      toast.error(
        signOutError instanceof Error
          ? signOutError.message
          : "TripTrace could not sign you out.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (!authLoading && !user && !isDemoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Sign in to view your trips</CardTitle>
            <CardDescription>
              Your profile keeps active and past trips in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth">Go to sign-in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Traveler profile
            </p>
            <h1 className="font-serif text-5xl tracking-tight text-[var(--ink)]">
              {user?.displayName ?? "Your trips"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {user?.email ?? "Signed in traveler"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!tripsLoading && !activeTrip ? (
              <Button asChild variant="secondary">
                <Link href="/trips/new">Create trip</Link>
              </Button>
            ) : null}
            {!authLoading && user && !isDemoMode ? (
              <Button
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                type="button"
                variant="ghost"
              >
                {signingOut ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <Card className="rounded-[30px]">
            <CardContent className="p-5 text-sm text-slate-600">
              {error}
            </CardContent>
          </Card>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-medium text-[var(--ink)]">Active trip</h2>
          </div>

          {tripsLoading ? (
            <TripCardSkeleton />
          ) : activeTrip ? (
            <TripCard
              trip={activeTrip}
              primaryActionHref={`/trips/${activeTrip.id}?capture=1`}
              primaryActionLabel="Open trip"
              secondaryActionHref={`/trips/${activeTrip.id}/settings`}
              secondaryActionLabel="Edit settings"
            />
          ) : (
            <Card className="rounded-[30px]">
              <CardContent className="p-5 text-sm text-slate-600">
                No active trip right now.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-medium text-[var(--ink)]">Past trips</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ended trips stay editable. You can open them, update settings, and add new moments from the camera roll.
            </p>
          </div>

          {tripsLoading ? (
            <div className="grid gap-4">
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          ) : pastTrips.length > 0 ? (
            <div className="grid gap-4">
              {pastTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  primaryActionHref={`/trips/${trip.id}`}
                  primaryActionLabel={activeTrip ? "View trip" : "Open trip"}
                  secondaryActionHref={`/trips/${trip.id}/settings`}
                  secondaryActionLabel="Edit settings"
                  extraAction={
                    activeTrip ? (
                      <div className="text-sm text-slate-500">
                        <p>New moments are blocked here while your active trip is running.</p>
                        <p className="mt-1">End your active trip before resuming this one.</p>
                      </div>
                    ) : (
                      <Button
                        disabled={workingTripId === trip.id}
                        onClick={() => void handleResumeTrip(trip)}
                        type="button"
                        variant="soft"
                      >
                        {workingTripId === trip.id ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Resuming...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Resume trip
                          </>
                        )}
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-[30px]">
              <CardContent className="p-5 text-sm text-slate-600">
                No past trips yet.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}

function TripCardSkeleton() {
  return (
    <Card aria-hidden className="rounded-[30px]">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="w-full max-w-sm space-y-3">
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-11 w-32 animate-pulse rounded-full bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  );
}

interface TripCardProps {
  trip: Trip;
  primaryActionHref: string;
  primaryActionLabel: string;
  secondaryActionHref: string;
  secondaryActionLabel: string;
  extraAction?: ReactNode;
}

function TripCard({
  trip,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionHref,
  secondaryActionLabel,
  extraAction,
}: TripCardProps) {
  return (
    <Card className="rounded-[30px]">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <User className="h-3.5 w-3.5" />
            {trip.endDate === null ? "Active" : "Past trip"}
          </div>
          <div>
            <p className="text-xl font-medium text-[var(--ink)]">{trip.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              {trip.coverLocationName ?? trip.timezone}
            </p>
            {trip.endDate ? (
              <p className="mt-1 text-sm text-slate-500">
                Ended on {formatEndedOn(trip.endDate, trip.timezone)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={primaryActionHref}>{primaryActionLabel}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={secondaryActionHref}>
              <Settings className="h-4 w-4" />
              {secondaryActionLabel}
            </Link>
          </Button>
          {extraAction}
        </div>
      </CardContent>
    </Card>
  );
}
