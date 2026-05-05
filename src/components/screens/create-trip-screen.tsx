"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTripTraceAuth } from "@/hooks/use-triptrace-auth";
import { getTripRepository } from "@/lib/repositories";
import type { TripLocationPrivacyMode, TripPrivacyMode } from "@/types/triptrace";

export function CreateTripScreen() {
  const router = useRouter();
  const { user, loading, isDemoMode } = useTripTraceAuth();
  const parisToday = DateTime.now().setZone("Europe/Paris").toISODate() ?? "";
  const parisEnd =
    DateTime.now().setZone("Europe/Paris").plus({ days: 28 }).toISODate() ?? "";
  const [title, setTitle] = useState("Paris Maymester");
  const [description, setDescription] = useState(
    "A quiet map of the moments that made the trip.",
  );
  const [startDate, setStartDate] = useState(parisToday);
  const [endDate, setEndDate] = useState(parisEnd);
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [coverLocationName, setCoverLocationName] = useState("Paris, France");
  const [privacyMode, setPrivacyMode] = useState<TripPrivacyMode>("private_link");
  const [locationPrivacyMode, setLocationPrivacyMode] =
    useState<TripLocationPrivacyMode>("exact");
  const [passcode, setPasscode] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateTrip() {
    if (!title.trim()) {
      toast.error("Give the trip a name first.");
      return;
    }

    setCreating(true);

    try {
      const trip = await getTripRepository().createTrip({
        title: title.trim(),
        description: description.trim() || null,
        startDate,
        endDate,
        timezone,
        coverLocationName: coverLocationName.trim() || null,
        privacyMode,
        passcode: passcode.trim() || null,
        locationPrivacyMode,
      });
      toast.success("Trip created.");
      router.push(`/trips/${trip.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "TripTrace could not create this trip.",
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
      <div className="mx-auto max-w-4xl">
        <Card className="rounded-[36px]">
          <CardHeader className="p-8 sm:p-10">
            <CardTitle className="text-5xl">Create a trip</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Keep the setup calm. The map stays front and center once the trip
              exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 p-8 pt-0 sm:p-10 sm:pt-0">
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
              <div className="space-y-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  onChange={(event) => setStartDate(event.target.value)}
                  type="date"
                  value={startDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End date</Label>
                <Input
                  id="end-date"
                  onChange={(event) => setEndDate(event.target.value)}
                  type="date"
                  value={endDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Primary timezone</Label>
                <Input
                  id="timezone"
                  onChange={(event) => setTimezone(event.target.value)}
                  value={timezone}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover-location">Cover location</Label>
                <Input
                  id="cover-location"
                  onChange={(event) => setCoverLocationName(event.target.value)}
                  value={coverLocationName}
                />
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
              <Label>Location precision</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["exact", "Exact", "Show locations as-is."],
                  ["approximate", "Approximate", "Soften locations slightly."],
                  [
                    "hide_current_day",
                    "Hide today",
                    "Keep the current day off the viewer map.",
                  ],
                ].map(([value, label, description]) => (
                  <button
                    key={value}
                    className={`rounded-[26px] border p-4 text-left transition ${
                      locationPrivacyMode === value
                        ? "border-transparent bg-[var(--accent-soft)] shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                        : "border-black/6 bg-white hover:bg-[var(--paper)]"
                    }`}
                    onClick={() =>
                      setLocationPrivacyMode(value as TripLocationPrivacyMode)
                    }
                    type="button"
                  >
                    <p className="font-medium text-[var(--ink)]">{label}</p>
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button asChild variant="secondary">
                <Link href="/">Cancel</Link>
              </Button>
              <Button disabled={creating} onClick={() => void handleCreateTrip()}>
                {creating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating trip…
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
