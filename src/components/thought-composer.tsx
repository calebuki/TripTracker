"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MapPinned, Navigation } from "lucide-react";
import { toast } from "sonner";

import { TripMap } from "@/components/trip-map";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTripRepository } from "@/lib/repositories";
import type { LocationDraft, Trip } from "@/types/crumbs";

interface ThoughtComposerProps {
  trip: Trip;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

function requestCurrentLocation() {
  return new Promise<LocationDraft>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location access."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          locationSource: "browser_gps",
        });
      },
      () => reject(new Error("Location access was denied.")),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  });
}

export function ThoughtComposer({
  trip,
  onSaved,
  onClose,
}: ThoughtComposerProps) {
  const [thoughtText, setThoughtText] = useState("");
  const [location, setLocation] = useState<LocationDraft | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [locating, setLocating] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void requestCurrentLocation()
      .then((currentLocation) => {
        setLocation(currentLocation);
        setLocationError(null);
      })
      .catch((error) => {
        setLocationError(
          error instanceof Error
            ? error.message
            : "Crumbs could not access your location.",
        );
      })
      .finally(() => setLocating(false));
  }, []);

  async function handleSave() {
    if (!thoughtText.trim()) {
      toast.error("Write a quick note before saving.");
      return;
    }

    setSaving(true);

    try {
      await getTripRepository().createMoment({
        tripId: trip.id,
        type: "thought",
        thoughtText: thoughtText.trim(),
        caption: thoughtText.trim().slice(0, 72),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        placeName: location?.placeName ?? null,
        locationSource: location?.locationSource ?? "none",
        accuracyMeters: location?.accuracyMeters ?? null,
        timezone: trip.timezone,
      });
      toast.success("Note saved.");
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs couldn't save this note.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Textarea
        aria-label="Note"
        onChange={(event) => setThoughtText(event.target.value)}
        placeholder="What's happening here?"
        value={thoughtText}
      />

      <div className="rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="font-bold text-[var(--ink)]">Location</p>
            <p className="text-[15px] font-medium leading-6 text-[var(--ink-soft)]">
              {locating
                ? "Trying your current location…"
                : location
                  ? "The note will sit exactly where you pin it."
                  : locationError ??
                    "No location yet. You can still save the note."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setLocating(true);
                void requestCurrentLocation()
                  .then((currentLocation) => {
                    setLocation(currentLocation);
                    setLocationError(null);
                    toast.success("Current location attached.");
                  })
                  .catch((error) => {
                    setLocationError(
                      error instanceof Error
                        ? error.message
                        : "Crumbs could not access your location.",
                    );
                  })
                  .finally(() => setLocating(false));
              }}
              type="button"
            >
              <Navigation className="h-4 w-4" />
              Use current location
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPicking((current) => !current)}
              type="button"
            >
              <MapPinned className="h-4 w-4" />
              {isPicking ? "Done picking" : "Pick on map"}
            </Button>
          </div>
        </div>

        {(location || isPicking) ? (
          <div className="mt-4">
            <TripMap
              trip={trip}
              moments={[]}
              draftLocation={location ?? undefined}
              allowPick={isPicking}
              onPickLocation={(pickedLocation) => {
                setLocation({
                  ...pickedLocation,
                  locationSource: "manual",
                });
                setIsPicking(false);
                setLocationError(null);
                toast.success("Note pinned on the map.");
              }}
              heightClassName="h-56"
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => void handleSave()}>
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving note…
            </>
          ) : (
            "Save note"
          )}
        </Button>
      </div>
    </div>
  );
}
