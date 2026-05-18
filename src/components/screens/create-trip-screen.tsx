"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DateTime } from "luxon";
import { LoaderCircle, LocateFixed, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTravelerHomeTarget } from "@/hooks/use-traveler-home-target";
import {
  requestCurrentCoordinates,
  reverseGeocodeCoordinates,
} from "@/lib/location";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { getTripRepository } from "@/lib/repositories";
import {
  clampPublishDelayHours,
  DEFAULT_PUBLISH_DELAY_HOURS,
  locationPrivacyChoices,
} from "@/lib/trip-sharing";
import { getBrowserTimeZone } from "@/lib/utils";
import type { TripLocationPrivacyMode, TripPrivacyMode } from "@/types/crumbs";

type SetupStatus = "idle" | "locating" | "ready" | "error";

const createTripLocationTimeoutMs = 2_500;

interface TripSetupLocation {
  coverLocationName: string | null;
  coverLatitude: number | null;
  coverLongitude: number | null;
}

export function CreateTripScreen() {
  const router = useRouter();
  const { user, loading, isDemoMode } = useCrumbsAuth();
  const travelerHome = useTravelerHomeTarget({
    user,
    authLoading: loading,
    isDemoMode,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(() => getBrowserTimeZone());
  const [privacyMode, setPrivacyMode] = useState<TripPrivacyMode>("private_link");
  const [locationPrivacyMode, setLocationPrivacyMode] =
    useState<TripLocationPrivacyMode>("exact");
  const [publishDelayHours, setPublishDelayHours] = useState(
    DEFAULT_PUBLISH_DELAY_HOURS,
  );
  const [passcode, setPasscode] = useState("");
  const [setupLocation, setSetupLocation] = useState<TripSetupLocation>({
    coverLocationName: null,
    coverLatitude: null,
    coverLongitude: null,
  });
  const [setupStatus, setSetupStatus] = useState<SetupStatus>("idle");
  const [setupMessage, setSetupMessage] = useState(
    "We'll grab your current location when you create the trip.",
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (travelerHome.status !== "active" || !travelerHome.targetPath) {
      return;
    }

    router.replace(travelerHome.targetPath);
  }, [router, travelerHome.status, travelerHome.targetPath]);

  const resolveTripSetupLocation = useCallback(async (force = false) => {
    const alreadyResolved =
      setupLocation.coverLatitude !== null && setupLocation.coverLongitude !== null;

    if (alreadyResolved && !force) {
      return setupLocation;
    }

    setSetupStatus("locating");
    setSetupMessage("Looking up your current location.");

    try {
      const coordinates = await requestCurrentCoordinates();
      let coverLocationName: string | null = null;

      try {
        coverLocationName = await reverseGeocodeCoordinates(
          coordinates.latitude,
          coordinates.longitude,
        );
      } catch {
        coverLocationName = null;
      }

      const nextLocation = {
        coverLocationName,
        coverLatitude: coordinates.latitude,
        coverLongitude: coordinates.longitude,
      };

      setSetupLocation(nextLocation);
      setSetupStatus("ready");
      setSetupMessage(
        coverLocationName
          ? `Using ${coverLocationName}.`
          : "Using your current map position.",
      );

      return nextLocation;
    } catch (error) {
      setSetupStatus("error");
      setSetupMessage(
        error instanceof Error
          ? error.message
          : "We couldn't read your current location yet.",
      );

      return setupLocation;
    }
  }, [setupLocation]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTimezone(getBrowserTimeZone());
      void resolveTripSetupLocation();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [resolveTripSetupLocation]);

  async function resolveTripSetupLocationForCreate() {
    const fallbackLocation = setupLocation;

    const fallbackPromise = new Promise<{
      location: TripSetupLocation;
      timedOut: boolean;
    }>((resolve) => {
      window.setTimeout(() => {
        resolve({
          location: fallbackLocation,
          timedOut: true,
        });
      }, createTripLocationTimeoutMs);
    });

    const resolvedPromise = resolveTripSetupLocation().then((location) => ({
      location,
      timedOut: false,
    }));

    return Promise.race([resolvedPromise, fallbackPromise]);
  }

  async function handleCreateTrip() {
    if (!title.trim()) {
      toast.error("Give the trip a name first.");
      return;
    }

    setCreating(true);

    try {
      const currentTimezone = timezone || getBrowserTimeZone();
      const {
        location: resolvedLocation,
        timedOut: locationTimedOut,
      } = await resolveTripSetupLocationForCreate();
      const startDate =
        DateTime.now().setZone(currentTimezone).toISODate() ??
        new Date().toISOString().slice(0, 10);
      const delayHours = clampPublishDelayHours(publishDelayHours);
      const trip = await getTripRepository().createTrip({
        title: title.trim(),
        description: description.trim() || null,
        startDate,
        endDate: null,
        timezone: currentTimezone,
        coverLocationName: resolvedLocation.coverLocationName,
        coverLatitude: resolvedLocation.coverLatitude,
        coverLongitude: resolvedLocation.coverLongitude,
        privacyMode,
        passcode: passcode.trim() || null,
        locationPrivacyMode,
        publishDelayHours: delayHours,
      });

      if (locationTimedOut) {
        toast.success("Trip created. We can fill in the current location later.");
      } else if (
        resolvedLocation.coverLatitude === null ||
        resolvedLocation.coverLongitude === null
      ) {
        toast.success("Trip created. Current location can be added later.");
      } else {
        toast.success("Trip created.");
      }

      router.push(`/trips/${trip.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs could not create this trip.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (!loading && !user && !isDemoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Sign in to create a trip</CardTitle>
            <CardDescription>
              Magic-link sign-in keeps the traveler dashboard private while viewers
              still use a shared link.
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
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex justify-end">
          <Button asChild size="icon" variant="secondary">
            <Link href="/profile">
              <User className="h-4 w-4" />
              <span className="sr-only">Open profile</span>
            </Link>
          </Button>
        </div>
        <Card className="rounded-[36px]">
          <CardHeader className="p-8 sm:p-10">
            <CardTitle className="text-5xl">Create a trip</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Built for quick posting on your phone. We&apos;ll use the trip creation
              moment as the start date and keep the rest of the setup light.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 p-8 pt-0 sm:p-10 sm:pt-0">
            {travelerHome.status === "active" ? (
              <div className="rounded-[28px] border border-black/5 bg-[var(--paper)] p-5">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <LoaderCircle className="h-4 w-4 animate-spin text-[var(--ink)]" />
                  You already have an active trip, so Crumbs is taking you back there.
                </div>
              </div>
            ) : null}

            {travelerHome.status === "latest" && travelerHome.trip?.endDate ? (
              <div className="rounded-[28px] border border-black/5 bg-[var(--paper)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      Most recent trip
                    </p>
                    <p className="text-base text-[var(--ink)]">
                      {travelerHome.trip.title}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      You can reopen this trip from its settings page if you want to
                      keep posting there instead of starting a brand-new one.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push(`/trips/${travelerHome.trip?.id}`)}
                    type="button"
                    variant="secondary"
                  >
                    Open recent trip
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="trip-title">Trip name</Label>
                <Input
                  id="trip-title"
                  onChange={(event) => setTitle(event.target.value)}
                  value={title}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="trip-description">Short description</Label>
                <Textarea
                  id="trip-description"
                  onChange={(event) => setDescription(event.target.value)}
                  value={description}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-black/5 bg-[var(--paper)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    Automatic setup
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    Start date is set the moment you create the trip. Timezone comes
                    from your device, and the map starts from your current location.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void resolveTripSetupLocation(true)}
                  type="button"
                >
                  <LocateFixed className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-[22px] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Timezone
                  </p>
                  <p className="mt-1 font-medium text-[var(--ink)]">{timezone}</p>
                </div>
                <div className="rounded-[22px] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Location
                  </p>
                  <p className="mt-1 font-medium text-[var(--ink)]">
                    {setupLocation.coverLocationName ?? "Current position"}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {setupStatus === "locating" ? "Looking up location..." : setupMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label>Trip privacy</Label>
                <button
                  className="w-full rounded-[26px] border border-transparent bg-[var(--accent-soft)] p-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                  onClick={() => setPrivacyMode("private_link")}
                  type="button"
                >
                  <p className="font-medium text-[var(--ink)]">Private link only</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Anyone with the share link can view the trip.
                  </p>
                </button>
              </div>
              <div className="space-y-3">
                <Label>Viewer passcode</Label>
                <Input
                  onChange={(event) => setPasscode(event.target.value)}
                  placeholder="Optional passcode"
                  value={passcode}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Viewer publishing</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {locationPrivacyChoices.map((choice) => (
                  <button
                    key={choice.value}
                    className={`rounded-[26px] border p-4 text-left transition ${
                      locationPrivacyMode === choice.value
                        ? "border-transparent bg-[var(--accent-soft)] shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                        : "border-black/6 bg-white hover:bg-[var(--paper)]"
                    }`}
                    onClick={() => setLocationPrivacyMode(choice.value)}
                    type="button"
                  >
                    <p className="font-medium text-[var(--ink)]">{choice.label}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {choice.description}
                    </p>
                  </button>
                ))}
              </div>

              {locationPrivacyMode === "delayed" ? (
                <div className="rounded-[24px] border border-black/5 bg-white p-4">
                  <Label htmlFor="publish-delay-hours">Publish new moments after</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Input
                      id="publish-delay-hours"
                      min={1}
                      onChange={(event) =>
                        setPublishDelayHours(
                          clampPublishDelayHours(Number(event.target.value) || 0),
                        )
                      }
                      type="number"
                      value={publishDelayHours}
                    />
                    <span className="text-sm text-slate-600">hours</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Viewers on desktop will only see fresh moments after this delay,
                    and they&apos;ll appear at the exact saved location once published.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button asChild variant="secondary">
                <Link href="/">Cancel</Link>
              </Button>
              <Button disabled={creating} onClick={() => void handleCreateTrip()}>
                {creating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating trip...
                  </>
                ) : (
                  "Create trip"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
