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
  CircleAlert,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Play,
  Plus,
  Settings,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CrumbsBrand } from "@/components/crumbs-brand";
import { RouteDiagram } from "@/components/route-diagram";
import { TripCodeEntry } from "@/components/trip-code-entry";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTripRepository } from "@/lib/repositories";
import { buildRouteDiagram, getRouteColorForKey } from "@/lib/route-diagram";
import type { CrumbsUser, Trip, TripRecord, WatchedTrip } from "@/types/crumbs";

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

function getTripDayNumber(trip: Trip) {
  const start = DateTime.fromISO(trip.startDate, { zone: trip.timezone }).startOf("day");
  const today = DateTime.now().setZone(trip.timezone).startOf("day");
  return Math.max(1, Math.floor(today.diff(start, "days").days) + 1);
}

export function AccountDashboardScreen({
  user,
  isDemoMode,
}: AccountDashboardScreenProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [watchedTrips, setWatchedTrips] = useState<WatchedTrip[]>([]);
  const [activeRecord, setActiveRecord] = useState<TripRecord | null>(null);
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
          : "Crumbs couldn't load your trips.",
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
  const activeTripId = activeTrip?.id ?? null;

  useEffect(() => {
    if (!activeTripId) {
      return;
    }

    let cancelled = false;

    getTripRepository()
      .getTripById(activeTripId)
      .then((record) => {
        if (!cancelled) {
          setActiveRecord(record);
        }
      })
      .catch(() => {
        // The card still works without its route diagram.
      });

    return () => {
      cancelled = true;
    };
  }, [activeTripId]);

  async function handleResumeTrip(trip: Trip) {
    setWorkingTripId(trip.id);

    try {
      await getTripRepository().updateTripSettings(trip.id, { endDate: null });
      toast.success(`${trip.title} is back on.`);
      await refresh();
      router.push(`/trips/${trip.id}?capture=1`);
    } catch (resumeError) {
      toast.error(
        resumeError instanceof Error
          ? resumeError.message
          : "Crumbs couldn't resume this trip.",
      );
    } finally {
      setWorkingTripId(null);
    }
  }

  async function handleUnwatchTrip(trip: Trip) {
    setUnwatchingTripId(trip.id);

    try {
      await getTripRepository().unwatchTrip(trip.id);
      setWatchedTrips((currentTrips) =>
        currentTrips.filter((watchedTrip) => watchedTrip.trip.id !== trip.id),
      );
      toast.success(`Stopped following ${trip.title}.`);
    } catch (unwatchError) {
      toast.error(
        unwatchError instanceof Error
          ? unwatchError.message
          : "Crumbs couldn't update the trips you follow.",
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
          : "Crumbs couldn't sign you out.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  const firstName = user.displayName?.trim().split(/\s+/)[0] ?? null;
  const initial = (firstName ?? user.email).charAt(0).toUpperCase();

  return (
    <main className="min-h-dvh bg-[var(--paper)] px-4 pb-16 pt-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Main navigation"
          className="flex items-center justify-between gap-3"
        >
          <Link href="/" aria-label="Crumbs home">
            <CrumbsBrand />
          </Link>
          <div className="flex items-center gap-2">
            {!loading && !activeTrip ? (
              <Button asChild size="sm">
                <Link href="/trips/new">
                  <Plus aria-hidden className="h-4 w-4" />
                  New trip
                </Link>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Open account menu"
                  className="crumbs-button grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-lg font-extrabold text-[#15161c]"
                  type="button"
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="crumbs-menu-label">
                  <p className="font-bold">
                    {user.displayName ?? "Your account"}
                  </p>
                  <p className="mt-0.5 max-w-56 truncate text-sm text-[var(--ink-soft)]">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User aria-hidden className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings aria-hidden className="h-4 w-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                {!isDemoMode ? (
                  <DropdownMenuItem
                    disabled={signingOut}
                    onSelect={() => void handleSignOut()}
                  >
                    <LogOut aria-hidden className="h-4 w-4" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <h1 className="mt-12 font-display text-[clamp(2.75rem,7vw,4.5rem)] leading-none">
          {firstName ? `Hi, ${firstName}.` : "Your trips."}
        </h1>

        {error ? (
          <div
            className="mt-8 flex flex-wrap items-center gap-3 text-[15px] font-semibold"
            role="alert"
          >
            <CircleAlert aria-hidden className="h-5 w-5 text-[var(--danger)]" />
            <p>{error}</p>
            <Button onClick={() => void refresh()} size="sm" type="button" variant="outline">
              Try again
            </Button>
          </div>
        ) : null}

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-16">
          <div className="space-y-12">
            <DashboardSection title="Current trip">
              {loading ? (
                <div className="h-80 animate-pulse rounded-2xl bg-[var(--paper-strong)]" />
              ) : activeTrip ? (
                <ActiveTripCard
                  record={activeRecord?.trip.id === activeTrip.id ? activeRecord : null}
                  trip={activeTrip}
                />
              ) : (
                <div className="flex flex-col items-start gap-4 rounded-2xl border-2 border-dashed border-[var(--line)] p-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-lg font-semibold">No trip in progress.</p>
                  <Button asChild>
                    <Link href="/trips/new">
                      <Plus aria-hidden className="h-4 w-4" />
                      Start a trip
                    </Link>
                  </Button>
                </div>
              )}
            </DashboardSection>

            <DashboardSection title="Past trips">
              {loading ? (
                <RowSkeleton />
              ) : pastTrips.length > 0 ? (
                <TripList>
                  {pastTrips.map((trip) => (
                    <TripRow
                      color={getRouteColorForKey(trip.id)}
                      key={trip.id}
                      meta={`Ended ${formatEndedOn(trip.endDate ?? trip.updatedAt, trip.timezone)}${trip.coverLocationName ? ` · ${trip.coverLocationName}` : ""}`}
                      title={trip.title}
                    >
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/trips/${trip.id}`}>View</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`More options for ${trip.title}`}
                            className="h-9 w-9"
                            disabled={workingTripId === trip.id}
                            size="icon"
                            variant="ghost"
                          >
                            {workingTripId === trip.id ? (
                              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal aria-hidden className="h-5 w-5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={Boolean(activeTrip)}
                            onSelect={() => void handleResumeTrip(trip)}
                          >
                            <Play aria-hidden className="h-4 w-4" />
                            {activeTrip ? "End your current trip to resume" : "Resume trip"}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/trips/${trip.id}/settings`}>
                              <Settings aria-hidden className="h-4 w-4" />
                              Trip settings
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TripRow>
                  ))}
                </TripList>
              ) : (
                <EmptyNote>Trips you finish show up here.</EmptyNote>
              )}
            </DashboardSection>
          </div>

          <div className="space-y-12">
            <DashboardSection title="Follow a trip">
              <TripCodeEntry compact hideLabel label="Crumb code" />
            </DashboardSection>

            <DashboardSection title="Following">
              {loading ? (
                <RowSkeleton />
              ) : watchedTrips.length > 0 ? (
                <TripList>
                  {watchedTrips.map(({ trip, lastViewedAt }) => (
                    <TripRow
                      color={getRouteColorForKey(trip.id)}
                      key={trip.id}
                      meta={`Opened ${formatLastViewed(lastViewedAt)}`}
                      title={trip.title}
                    >
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/t/${trip.shareSlug}`}>Open</Link>
                      </Button>
                      <Button
                        aria-label={`Stop following ${trip.title}`}
                        className="h-9 w-9"
                        disabled={unwatchingTripId === trip.id}
                        onClick={() => void handleUnwatchTrip(trip)}
                        size="icon"
                        title="Stop following"
                        type="button"
                        variant="ghost"
                      >
                        {unwatchingTripId === trip.id ? (
                          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
                        ) : (
                          <X aria-hidden className="h-5 w-5" />
                        )}
                      </Button>
                    </TripRow>
                  ))}
                </TripList>
              ) : (
                <EmptyNote>Trips you open with a code show up here.</EmptyNote>
              )}
            </DashboardSection>
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 className="mb-4 font-display text-2xl" id={headingId}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ActiveTripCard({ trip, record }: { trip: Trip; record: TripRecord | null }) {
  const visibleMoments = useMemo(
    () => record?.moments.filter((moment) => moment.visibility === "visible") ?? [],
    [record],
  );
  const layout = useMemo(
    () =>
      buildRouteDiagram(visibleMoments, trip.timezone, {
        width: 640,
        height: 230,
        padding: 28,
        minGap: 26,
        maxStations: 12,
        startDate: trip.startDate,
      }),
    [trip.startDate, trip.timezone, visibleMoments],
  );
  const narrowLayout = useMemo(
    () =>
      buildRouteDiagram(visibleMoments, trip.timezone, {
        width: 340,
        height: 190,
        padding: 18,
        minGap: 22,
        maxStations: 9,
        startDate: trip.startDate,
      }),
    [trip.startDate, trip.timezone, visibleMoments],
  );
  const dayNumber = getTripDayNumber(trip);
  const momentCount = visibleMoments.length;

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)]">
      <div className="border-b-2 border-[var(--line)] bg-[var(--paper)] px-3 py-4">
        {!record ? (
          <div aria-hidden className="h-[clamp(120px,36vw,230px)] animate-pulse rounded-lg bg-[var(--paper-strong)]" />
        ) : layout.stations.length > 0 ? (
          <>
            <RouteDiagram
              className="hidden sm:block"
              label={`Route of ${trip.title}`}
              labelSize={14}
              layout={layout}
              showLabels={layout.stations.length <= 6}
              stationRadius={8}
              strokeWidth={9}
              train
            />
            <RouteDiagram
              className="sm:hidden"
              label={`Route of ${trip.title}`}
              labelSize={12}
              layout={narrowLayout}
              showLabels={narrowLayout.stations.length <= 6}
              stationRadius={6}
              strokeWidth={7}
              train
            />
          </>
        ) : (
          <div className="flex h-[clamp(120px,36vw,230px)] items-center justify-center gap-0 px-6">
            <span className="h-6 w-6 shrink-0 rounded-full border-[5px] border-[var(--ink)] bg-[var(--surface)]" />
            <span className="h-2 w-full max-w-64 border-t-[6px] border-dashed border-[var(--line)]" />
            <span className="ml-4 shrink-0 text-[15px] font-semibold text-[var(--ink-soft)]">
              No stops yet
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h3 className="font-display text-3xl leading-tight">{trip.title}</h3>
          <p className="mt-1 text-[15px] font-semibold text-[var(--ink-soft)]">
            <span className="tabular">Day {dayNumber}</span>
            {record ? (
              <span className="tabular">
                {" · "}
                {momentCount} {momentCount === 1 ? "moment" : "moments"}
              </span>
            ) : null}
            {trip.coverLocationName ? ` · ${trip.coverLocationName}` : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild>
            <Link href={`/trips/${trip.id}?capture=1`}>Open trip</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/settings`}>
              <Settings aria-hidden className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function TripList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y-2 divide-[var(--line)] border-y-2 border-[var(--line)]">
      {children}
    </ul>
  );
}

function TripRow({
  title,
  meta,
  color,
  children,
}: {
  title: string;
  meta: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <li className="crumbs-trip-row flex items-center gap-4 py-3.5">
      <span
        aria-hidden
        className="h-5 w-5 shrink-0 rounded-full border-[5px] bg-[var(--surface)]"
        style={{ borderColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold leading-tight">{title}</p>
        <p className="truncate text-sm font-medium text-[var(--ink-soft)]">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

function RowSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      {[0, 1].map((row) => (
        <div className="flex items-center gap-4 py-2" key={row}>
          <span className="h-5 w-5 rounded-full bg-[var(--paper-strong)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--paper-strong)]" />
            <div className="h-3 w-28 animate-pulse rounded bg-[var(--paper-strong)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="border-y-2 border-[var(--line)] py-4 text-[15px] font-medium text-[var(--ink-soft)]">
      {children}
    </p>
  );
}
