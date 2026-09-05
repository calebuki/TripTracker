"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DateTime } from "luxon";
import {
  Archive,
  Compass,
  MapPin,
  Menu,
  Route,
  type LucideIcon,
  Eye,
  LoaderCircle,
  LogOut,
  Play,
  Settings,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CrumbsBrand, TravelStamp } from "@/components/crumbs-brand";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { TripCodeEntry } from "@/components/trip-code-entry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTripRepository } from "@/lib/repositories";
import { cn } from "@/lib/utils";
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
    <main className="crumbs-page min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <nav
          aria-label="Main navigation"
          className="crumbs-dashboard-nav flex items-center justify-between gap-3"
        >
          <Link href="/" aria-label="Crumbs home">
            <CrumbsBrand />
          </Link>
          <div className="flex items-center gap-3">
            {!loading && !activeTrip ? (
              <Button asChild>
                <Link href="/trips/new">
                  <MapPin aria-hidden className="h-4 w-4" />
                  Create trip
                </Link>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Open account menu"
                  variant="secondary"
                  size="icon"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="crumbs-menu-label">
                  <p className="font-semibold">
                    {user.displayName ?? "Your account"}
                  </p>
                  <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                {!isDemoMode ? (
                  <DropdownMenuItem
                    disabled={signingOut}
                    onSelect={() => void handleSignOut()}
                  >
                    <LogOut className="h-4 w-4" />
                    {signingOut ? "Signing out..." : "Sign out"}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
        <header className="crumbs-dashboard-hero">
          <div>
            <p className="crumbs-eyebrow mb-3">Your travel journal</p>
            <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
              {user.displayName
                ? user.displayName + "’s crumbs."
                : "Your crumbs."}
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              The places you go. The moments you keep.
            </p>
          </div>
          <TravelStamp />
        </header>

        {error ? (
          <Card className="rounded-[30px]">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-slate-600">
              <p>{error}</p>
              <Button
                onClick={() => void refresh()}
                size="sm"
                type="button"
                variant="secondary"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="crumbs-dashboard-grid grid gap-5 lg:grid-cols-2 lg:items-start">
          <DashboardPanel
            icon={Route}
            description="Their crumb code. Your window into the journey."
            title="Follow a friend's trip"
          >
            <TripCodeEntry compact />
          </DashboardPanel>

          <DashboardPanel icon={Eye} title="Watching">
            {loading ? (
              <TripCardSkeleton />
            ) : watchedTrips.length > 0 ? (
              <div className="max-h-[21rem] space-y-3 overflow-y-auto pr-1">
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
              <PanelEmptyState>
                Open a friend&apos;s shared trip and it will appear here.
              </PanelEmptyState>
            )}
          </DashboardPanel>

          <DashboardPanel icon={Compass} title="Your active trip">
            {loading ? (
              <TripCardSkeleton />
            ) : activeTrip ? (
              <OwnedTripCard
                primaryActionHref={`/trips/${activeTrip.id}?capture=1`}
                primaryActionLabel="Open trip"
                trip={activeTrip}
              />
            ) : (
              <PanelEmptyState>No active trip right now.</PanelEmptyState>
            )}
          </DashboardPanel>

          <DashboardPanel icon={Archive} title="Your past trips">
            {loading ? (
              <div className="space-y-3">
                <TripCardSkeleton />
                <TripCardSkeleton />
              </div>
            ) : pastTrips.length > 0 ? (
              <div className="max-h-[21rem] space-y-3 overflow-y-auto pr-1">
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
              <PanelEmptyState>No past trips yet.</PanelEmptyState>
            )}
          </DashboardPanel>
        </div>
      </div>
    </main>
  );
}

function DashboardPanel({
  title,
  description,
  children,
  className,
  icon: Icon,
}: {
  title: ReactNode;
  icon: LucideIcon;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "crumbs-dashboard-panel flex min-h-[20rem] flex-col rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6",
        className,
      )}
    >
      <div>
        <div className="flex items-center gap-3">
          <span className="crumbs-panel-icon">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="text-2xl font-medium text-[var(--ink)]">{title}</h2>
        </div>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="mt-5 min-h-0 flex-1">{children}</div>
    </section>
  );
}

function PanelEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 items-center rounded-[24px] bg-[var(--paper)] p-5 text-sm leading-6 text-slate-600">
      {children}
    </div>
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
            <p className="text-xl font-medium text-[var(--ink)]">
              {trip.title}
            </p>
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
            <p className="text-xl font-medium text-[var(--ink)]">
              {trip.title}
            </p>
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
