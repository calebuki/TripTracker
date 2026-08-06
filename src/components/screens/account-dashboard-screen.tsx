"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DateTime } from "luxon";
import {
  Eye,
  LoaderCircle,
  LogOut,
  Play,
  Settings,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { TripCodeEntry } from "@/components/trip-code-entry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTripRepository } from "@/lib/repositories";
import type { CrumbsUser, Trip, WatchedTrip } from "@/types/crumbs";

interface AccountDashboardScreenProps {
  user: CrumbsUser;
  isDemoMode: boolean;
}

function formatEndedOn(date: string, timezone: string) {
  return DateTime.fromISO(date, { zone: timezone }).toFormat("LLL d, yyyy");
}

function formatLastViewed(date: string) {
  return DateTime.fromISO(date).toRelative() ?? "recently";
}

export function AccountDashboardScreen({
  user,
  isDemoMode,
}: AccountDashboardScreenProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [watchedTrips, setWatchedTrips] = useState<WatchedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingTripId, setWorkingTripId] = useState<string | null>(null);
  const [unwatchingTripId, setUnwatchingTripId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextTrips, nextWatchedTrips] = await Promise.all([
        getTripRepository().listTripsForCurrentUser(),
        getTripRepository().listWatchedTripsForCurrentUser(),
      ]);
      setTrips(nextTrips);
      setWatchedTrips(nextWatchedTrips);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Crumbs could not load your dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh, user.id]);

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.endDate === null) ?? null,
    [trips],
  );
  const pastTrips = useMemo(
    () => trips.filter((trip) => trip.endDate !== null),
    [trips],
  );

  async function handleResumeTrip(trip: Trip) {
    setWorkingTripId(trip.id);

    try {
      await getTripRepository().updateTripSettings(trip.id, { endDate: null });
      toast.success("Trip resumed.");
      await refresh();
      router.push(`/trips/${trip.id}?capture=1`);
    } catch (resumeError) {
      toast.error(
        resumeError instanceof Error
          ? resumeError.message
          : "Crumbs could not resume this trip.",
      );
    } finally {
      setWorkingTripId(null);
    }
  }

  async function handleUnwatchTrip(tripId: string) {
    setUnwatchingTripId(tripId);

    try {
      await getTripRepository().unwatchTrip(tripId);
      setWatchedTrips((currentTrips) =>
        currentTrips.filter((watchedTrip) => watchedTrip.trip.id !== tripId),
      );
      toast.success("Trip removed from Watching.");
    } catch (unwatchError) {
      toast.error(
        unwatchError instanceof Error
          ? unwatchError.message
          : "Crumbs could not update your watchlist.",
      );
    } finally {
      setUnwatchingTripId(null);
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
          : "Crumbs could not sign you out.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Your Crumbs
            </p>
            <h1 className="font-serif text-5xl tracking-tight text-[var(--ink)]">
              {user.displayName ?? "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!loading && !activeTrip ? (
              <Button asChild variant="secondary">
                <Link href="/trips/new">Create trip</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Account settings
              </Link>
            </Button>
            {!isDemoMode ? (
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
        </header>

        {error ? (
          <Card className="rounded-[30px]">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-slate-600">
              <p>{error}</p>
              <Button onClick={() => void refresh()} size="sm" type="button" variant="secondary">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[30px] bg-[#f9f5ee]">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-medium text-[var(--ink)]">
                Follow a friend&apos;s trip
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Enter their crumb code or open a shared link. Trips you open are saved in Watching.
              </p>
            </div>
            <TripCodeEntry compact />
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-medium text-[var(--ink)]">Watching</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Friends&apos; trips you&apos;ve opened while signed in.
            </p>
          </div>
          {loading ? (
            <div className="grid gap-4">
              <TripCardSkeleton />
            </div>
          ) : watchedTrips.length > 0 ? (
            <div className="grid gap-4">
              {watchedTrips.map((watchedTrip) => (
                <WatchedTripCard
                  key={watchedTrip.trip.id}
                  watchedTrip={watchedTrip}
                  isUnwatching={unwatchingTripId === watchedTrip.trip.id}
                  onUnwatch={handleUnwatchTrip}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-[30px]">
              <CardContent className="p-5 text-sm text-slate-600">
                Open a friend&apos;s shared trip and it will appear here.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-medium text-[var(--ink)]">Your active trip</h2>
          </div>
          {loading ? (
            <TripCardSkeleton />
          ) : activeTrip ? (
            <OwnedTripCard
              primaryActionHref={`/trips/${activeTrip.id}?capture=1`}
              primaryActionLabel="Open trip"
              trip={activeTrip}
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
            <h2 className="text-2xl font-medium text-[var(--ink)]">Your past trips</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Ended trips stay editable and can be resumed when you have no active trip.
            </p>
          </div>
          {loading ? (
            <div className="grid gap-4">
              <TripCardSkeleton />
              <TripCardSkeleton />
            </div>
          ) : pastTrips.length > 0 ? (
            <div className="grid gap-4">
              {pastTrips.map((trip) => (
                <OwnedTripCard
                  key={trip.id}
                  primaryActionHref={`/trips/${trip.id}`}
                  primaryActionLabel="View trip"
                  trip={trip}
                  extraAction={
                    activeTrip ? (
                      <p className="text-sm text-slate-500">
                        End your active trip before resuming this one.
                      </p>
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
        <div className="h-11 w-24 animate-pulse rounded-full bg-slate-200" />
      </CardContent>
    </Card>
  );
}

function OwnedTripCard({
  trip,
  primaryActionHref,
  primaryActionLabel,
  extraAction,
}: {
  trip: Trip;
  primaryActionHref: string;
  primaryActionLabel: string;
  extraAction?: ReactNode;
}) {
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
            <Link href={`/trips/${trip.id}/settings`}>
              <Settings className="h-4 w-4" />
              Trip settings
            </Link>
          </Button>
          {extraAction}
        </div>
      </CardContent>
    </Card>
  );
}

function WatchedTripCard({
  watchedTrip,
  isUnwatching,
  onUnwatch,
}: {
  watchedTrip: WatchedTrip;
  isUnwatching: boolean;
  onUnwatch: (tripId: string) => void;
}) {
  const { trip } = watchedTrip;

  return (
    <Card className="rounded-[30px]">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <Eye className="h-3.5 w-3.5" />
            Watching
          </div>
          <div>
            <p className="text-xl font-medium text-[var(--ink)]">{trip.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              {trip.coverLocationName ?? trip.timezone}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Last opened {formatLastViewed(watchedTrip.lastViewedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/t/${trip.shareSlug}`}>Open trip</Link>
          </Button>
          <Button
            disabled={isUnwatching}
            onClick={() => onUnwatch(trip.id)}
            type="button"
            variant="outline"
          >
            {isUnwatching ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Unwatch
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
