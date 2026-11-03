"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AccountDashboardScreen } from "@/components/screens/account-dashboard-screen";
import { LoadingShell } from "@/components/loading-shell";
import { RouteDiagram } from "@/components/route-diagram";
import { TripCodeEntry } from "@/components/trip-code-entry";
import { CrumbsBrand } from "@/components/crumbs-brand";
import { Button } from "@/components/ui/button";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { useDevPreview } from "@/hooks/use-dev-preview";
import { getDemoTripRecord } from "@/lib/demo-data";
import { TimeOfDayLegend } from "@/components/time-of-day-legend";
import { buildRouteDiagram } from "@/lib/route-diagram";

export function LandingScreen() {
  const { user, loading, isDemoMode } = useCrumbsAuth();
  const previewWelcome = useDevPreview("welcome");

  if (previewWelcome) {
    return <WelcomeScreen />;
  }

  if (loading && !isDemoMode) {
    return <LoadingShell label="Opening your Crumbs…" />;
  }

  if (user || isDemoMode) {
    if (!user) {
      return null;
    }

    return <AccountDashboardScreen isDemoMode={isDemoMode} user={user} />;
  }

  return <WelcomeScreen />;
}

export function WelcomeScreen() {
  const sample = useMemo(() => getDemoTripRecord(), []);
  const layout = useMemo(
    () =>
      buildRouteDiagram(sample.moments, sample.trip.timezone, {
        width: 560,
        height: 470,
        padding: 52,
        minGap: 30,
        startDate: sample.trip.startDate,
      }),
    [sample],
  );
  // Phones get their own sheet so station names stay legible at small sizes.
  const narrowLayout = useMemo(
    () =>
      buildRouteDiagram(sample.moments, sample.trip.timezone, {
        width: 360,
        height: 330,
        padding: 28,
        minGap: 24,
        startDate: sample.trip.startDate,
      }),
    [sample],
  );
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const activeStation =
    layout.stations.find((station) => station.id === activeStationId) ??
    layout.stations[layout.stations.length - 1];

  return (
    <main className="landscape-backdrop flex min-h-dvh flex-col px-4 pt-5 sm:px-8">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4"
      >
        <Link aria-label="Crumbs home" href="/">
          <CrumbsBrand />
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link href="/auth">Sign in</Link>
        </Button>
      </nav>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pt-0">
        <section aria-labelledby="landing-title" className="max-w-xl">
          <h1
            className="font-display text-[clamp(3.25rem,8.5vw,6rem)] leading-[0.92] text-balance"
            id="landing-title"
          >
            Got a crumb code?
          </h1>
          <p className="mt-5 max-w-md text-lg font-medium leading-7 text-[var(--ink-soft)]">
            Travelers share a 5-character code. Type it here to follow their
            trip on a map, photo by photo.
          </p>
          <div className="mt-9">
            <TripCodeEntry autoFocus hideLabel />
          </div>
          <p className="mt-10 text-[15px] font-semibold text-[var(--ink-soft)]">
            Traveling yourself?{" "}
            <Link
              className="text-[var(--ink)] underline decoration-[var(--route-tomato)] decoration-[3px] underline-offset-4 transition-colors hover:decoration-[var(--ink)]"
              href="/auth"
            >
              Sign in to post your trip
            </Link>
          </p>
        </section>

        <figure className="min-w-0">
          <RouteDiagram
            activeStationId={activeStation?.id}
            className="hidden sm:block"
            label={`Sample trip through ${sample.trip.coverLocationName ?? "Paris"}`}
            labelSize={17}
            layout={layout}
            onStationSelect={setActiveStationId}
            showLabels
            stationRadius={11}
            strokeWidth={14}
            train
          />
          <RouteDiagram
            activeStationId={activeStation?.id}
            className="sm:hidden"
            label={`Sample trip through ${sample.trip.coverLocationName ?? "Paris"}`}
            labelSize={13}
            layout={narrowLayout}
            onStationSelect={setActiveStationId}
            showLabels
            stationRadius={8}
            strokeWidth={9}
            train
          />
          <figcaption className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 sm:max-w-xs">
              {activeStation ? (
                <div className="crumbs-station-note" key={activeStation.id}>
                  <p className="text-sm font-bold text-[var(--ink-soft)]">
                    Day {activeStation.dayIndex + 1} · {activeStation.timeLabel} ·{" "}
                    {activeStation.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-snug">
                    {activeStation.caption}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="shrink-0">
              <p className="mb-3 text-sm font-semibold text-[var(--ink-soft)]">
                Sample trip, {new Set(layout.stations.map((station) => station.dayIndex)).size}{" "}
                days in {sample.trip.coverLocationName?.split(",")[0] ?? "Paris"}
              </p>
              <TimeOfDayLegend />
            </div>
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
