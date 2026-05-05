"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MapPinned, Navigation, Upload, X } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { TripMap } from "@/components/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractPhotoMetadata } from "@/lib/exif";
import { getTripRepository } from "@/lib/repositories";
import { fileToOptimizedDataUrl } from "@/lib/storage";
import type { LocationDraft, LocationSource, Trip } from "@/types/triptrace";

interface PhotoUploaderProps {
  trip: Trip;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  locationSource: LocationSource;
  accuracyMeters: number | null;
  takenAt: string | null;
  metadataError: string | null;
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

export function PhotoUploader({ trip, onSaved, onClose }: PhotoUploaderProps) {
  const [drafts, setDrafts] = useState<PhotoDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [pickerDraftId, setPickerDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      drafts.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
    };
  }, [drafts]);

  async function handleFileSelection(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const files = Array.from(fileList);
    const nextDrafts = await Promise.all(
      files.map(async (file) => {
        const metadata = await extractPhotoMetadata(file);
        return {
          id: nanoid(),
          file,
          previewUrl: URL.createObjectURL(file),
          caption: "",
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          placeName: null,
          locationSource: metadata.latitude && metadata.longitude ? "exif" : "none",
          accuracyMeters: null,
          takenAt:
            metadata.takenAt ?? new Date(file.lastModified).toISOString(),
          metadataError: metadata.metadataError,
        } satisfies PhotoDraft;
      }),
    );

    setDrafts((current) => [...current, ...nextDrafts]);
    setActiveDraftId((current) => current ?? nextDrafts[0]?.id ?? null);
  }

  function updateDraft(
    draftId: string,
    patch: Partial<Omit<PhotoDraft, "id" | "file" | "previewUrl">>,
  ) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ...patch,
            }
          : draft,
      ),
    );
  }

  async function attachCurrentLocationToDraft(draftId: string) {
    try {
      const location = await requestCurrentLocation();
      updateDraft(draftId, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters ?? null,
        locationSource: location.locationSource,
      });
      setActiveDraftId(draftId);
      toast.success("Current location attached.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not read your location.",
      );
    }
  }

  async function saveDrafts() {
    if (drafts.length === 0) {
      toast.error("Choose at least one photo first.");
      return;
    }

    setSaving(true);

    try {
      const repository = getTripRepository();

      for (const draft of drafts) {
        await repository.createMoment({
          tripId: trip.id,
          type: "photo",
          file: draft.file,
          imagePreviewUrl:
            repository.mode === "demo"
              ? await fileToOptimizedDataUrl(draft.file)
              : null,
          caption: draft.caption || null,
          latitude: draft.latitude,
          longitude: draft.longitude,
          placeName: draft.placeName,
          locationSource: draft.locationSource,
          accuracyMeters: draft.accuracyMeters,
          takenAt: draft.takenAt,
          timezone: trip.timezone,
        });
      }

      toast.success(
        drafts.length === 1
          ? "Photo moment saved."
          : `${drafts.length} photo moments saved.`,
      );
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "TripTrace could not save the photo.",
      );
    } finally {
      setSaving(false);
    }
  }

  const activeDraft =
    drafts.find((draft) => draft.id === pickerDraftId) ??
    drafts.find((draft) => draft.id === activeDraftId) ??
    null;

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-[var(--paper)] px-6 py-10 text-center transition hover:border-black/20 hover:bg-[#f7f1e5]">
        <Upload className="mb-3 h-5 w-5 text-slate-500" />
        <p className="text-base font-medium text-[var(--ink)]">
          Upload one or more photos
        </p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          TripTrace reads GPS and capture time from each image when the metadata
          is available.
        </p>
        <input
          className="sr-only"
          multiple
          accept="image/*"
          onChange={(event) => void handleFileSelection(event.target.files)}
          type="file"
        />
      </label>

      {drafts.length > 0 ? (
        <div className="space-y-3">
          {drafts.map((draft) => {
            const hasLocation =
              typeof draft.latitude === "number" &&
              typeof draft.longitude === "number";

            return (
              <Card
                key={draft.id}
                className="overflow-hidden rounded-[28px] border-black/5 p-0"
              >
                <div className="grid gap-4 p-4 sm:grid-cols-[140px_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={draft.file.name}
                    className="h-36 w-full rounded-[22px] object-cover"
                    src={draft.previewUrl}
                  />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-2">
                        <p className="line-clamp-1 text-sm font-medium text-[var(--ink)]">
                          {draft.file.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={hasLocation ? "accent" : "default"}>
                            {hasLocation
                              ? draft.locationSource === "exif"
                                ? "Mapped from photo"
                                : draft.locationSource === "browser_gps"
                                  ? "Current location"
                                  : "Pinned on map"
                              : "No location found"}
                          </Badge>
                          {draft.metadataError ? (
                            <span className="text-xs text-slate-500">
                              {draft.metadataError}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        className="rounded-full p-2 text-slate-400 transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                        onClick={() => {
                          URL.revokeObjectURL(draft.previewUrl);
                          setDrafts((current) =>
                            current.filter((entry) => entry.id !== draft.id),
                          );
                          if (activeDraftId === draft.id) {
                            setActiveDraftId(null);
                          }
                        }}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove photo</span>
                      </button>
                    </div>
                    <Input
                      onChange={(event) =>
                        updateDraft(draft.id, { caption: event.target.value })
                      }
                      onFocus={() => setActiveDraftId(draft.id)}
                      placeholder="Optional caption"
                      value={draft.caption}
                    />
                    {!hasLocation ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void attachCurrentLocationToDraft(draft.id)}
                          type="button"
                        >
                          <Navigation className="h-4 w-4" />
                          Use current location
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPickerDraftId(draft.id);
                            setActiveDraftId(draft.id);
                          }}
                          type="button"
                        >
                          <MapPinned className="h-4 w-4" />
                          Pick on map
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateDraft(draft.id, { locationSource: "none" })
                          }
                          type="button"
                        >
                          Save without location
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-left text-sm text-slate-600 transition hover:text-[var(--ink)]"
                        onClick={() => {
                          setPickerDraftId(draft.id);
                          setActiveDraftId(draft.id);
                        }}
                        type="button"
                      >
                        Fine-tune location on the map
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {activeDraft ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {pickerDraftId ? "Tap the map to place this photo" : "Detected location"}
              </p>
              <p className="text-sm text-slate-600">
                {pickerDraftId
                  ? "Choose the exact spot for this moment."
                  : "A quick preview of where this photo will land on the map."}
              </p>
            </div>
            {pickerDraftId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPickerDraftId(null)}
                type="button"
              >
                Done
              </Button>
            ) : null}
          </div>
          <TripMap
            trip={trip}
            moments={[]}
            draftLocation={
              activeDraft.latitude !== null && activeDraft.longitude !== null
                ? {
                    latitude: activeDraft.latitude,
                    longitude: activeDraft.longitude,
                    locationSource: activeDraft.locationSource,
                  }
                : undefined
            }
            allowPick={Boolean(pickerDraftId)}
            onPickLocation={(location) => {
              if (!pickerDraftId) {
                return;
              }

              updateDraft(pickerDraftId, {
                latitude: location.latitude,
                longitude: location.longitude,
                locationSource: "manual",
              });
              setPickerDraftId(null);
              toast.success("Photo pinned on the map.");
            }}
            heightClassName="h-56"
          />
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={saving || drafts.length === 0} onClick={() => void saveDrafts()}>
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving moments…
            </>
          ) : (
            `Save ${drafts.length || ""} ${drafts.length === 1 ? "moment" : "moments"}`
          )}
        </Button>
      </div>
    </div>
  );
}
