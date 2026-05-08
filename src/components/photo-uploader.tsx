"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Film, Images, LoaderCircle, LocateFixed, MapPinned, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { TripMap } from "@/components/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { extractPhotoMetadata } from "@/lib/exif";
import {
  requestCurrentLocationDraft,
  resolvePlaceNameForCoordinates,
} from "@/lib/location";
import { isMomentVideo, isVideoMimeType } from "@/lib/media";
import { getTripRepository } from "@/lib/repositories";
import { fileToOptimizedDataUrl } from "@/lib/storage";
import type { LocationDraft, Moment, Trip } from "@/types/triptrace";

interface PhotoUploaderProps {
  trip: Trip;
  active?: boolean;
  cameraFirst?: boolean;
  libraryOnly?: boolean;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

interface PendingUpload {
  id: string;
  fileName: string;
  fileType: string;
  previewUrl: string;
}

interface SavedMomentEntry {
  id: string;
  fileType: string;
  previewUrl: string;
  metadataError: string | null;
  moment: Moment;
}

interface UploadRequest {
  file: File;
  previewUrl: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: Moment["locationSource"];
  accuracyMeters: number | null;
  takenAt: string | null;
  metadataError: string | null;
}

type UploadOrigin = "camera" | "library";

function rememberObjectUrl(registry: { current: string[] }, url: string) {
  registry.current.push(url);
  return url;
}

function MediaPreview({
  alt,
  className,
  fileType,
  src,
}: {
  alt: string;
  className: string;
  fileType: string;
  src: string;
}) {
  if (isVideoMimeType(fileType)) {
    return (
      <video
        aria-label={alt}
        className={className}
        muted
        playsInline
        preload="metadata"
        src={src}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      src={src}
    />
  );
}

function getMomentLabel(moment: Moment) {
  if (moment.type !== "photo") {
    return "Thought";
  }

  return isMomentVideo(moment) ? "Video" : "Photo";
}

export function PhotoUploader({
  trip,
  cameraFirst = false,
  libraryOnly = false,
  onSaved,
  onClose,
}: PhotoUploaderProps) {
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [recentMoments, setRecentMoments] = useState<SavedMomentEntry[]>([]);
  const [pickerMomentId, setPickerMomentId] = useState<string | null>(null);
  const [preparingOrigin, setPreparingOrigin] = useState<UploadOrigin | null>(null);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const pickerMoment =
    recentMoments.find((entry) => entry.id === pickerMomentId) ?? null;
  const isBusy = preparingOrigin !== null || pendingUploads.length > 0;

  function updateRecentMoment(momentId: string, patch: Partial<Moment>) {
    setRecentMoments((current) =>
      current.map((entry) =>
        entry.moment.id === momentId
          ? {
              ...entry,
              moment: {
                ...entry.moment,
                ...patch,
              },
            }
          : entry,
      ),
    );
  }

  async function enrichPlaceName(
    momentId: string,
    latitude: number | null,
    longitude: number | null,
  ) {
    const placeName = await resolvePlaceNameForCoordinates(latitude, longitude);

    if (!placeName) {
      return;
    }

    try {
      const updatedMoment = await getTripRepository().updateMoment(momentId, {
        placeName,
      });
      updateRecentMoment(momentId, updatedMoment);
      await onSaved();
    } catch {
      // Quiet background enrichment. The moment still exists even if the place label misses.
    }
  }

  async function saveUploadRequests(requests: UploadRequest[]) {
    if (requests.length === 0) {
      return;
    }

    const repository = getTripRepository();
    let savedCount = 0;

    for (const request of requests) {
      const pendingId = nanoid();

      setPendingUploads((current) => [
        {
          id: pendingId,
          fileName: request.file.name,
          fileType: request.file.type,
          previewUrl: request.previewUrl,
        },
        ...current,
      ]);

      try {
        const createdMoment = await repository.createMoment({
          tripId: trip.id,
          type: "photo",
          file: request.file,
          imagePreviewUrl:
            repository.mode === "demo"
              ? await fileToOptimizedDataUrl(request.file)
              : null,
          caption: null,
          thoughtText: null,
          latitude: request.latitude,
          longitude: request.longitude,
          placeName: null,
          locationSource: request.locationSource,
          accuracyMeters: request.accuracyMeters,
          takenAt: request.takenAt,
          timezone: trip.timezone,
        });

        setRecentMoments((current) => [
          {
            id: nanoid(),
            fileType: request.file.type,
            moment: createdMoment,
            previewUrl: request.previewUrl,
            metadataError: request.metadataError,
          },
          ...current,
        ]);
        savedCount += 1;

        if (request.latitude !== null && request.longitude !== null) {
          void enrichPlaceName(
            createdMoment.id,
            request.latitude,
            request.longitude,
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `TripTrace could not save ${request.file.name}.`,
        );
      } finally {
        setPendingUploads((current) =>
          current.filter((entry) => entry.id !== pendingId),
        );
      }
    }

    if (savedCount > 0) {
      toast.success(
        savedCount === 1
          ? "Moment saved."
          : `${savedCount} moments saved.`,
      );
      await onSaved();
    }
  }

  async function buildUploadRequest(file: File, origin: UploadOrigin) {
    const metadata = await extractPhotoMetadata(file);
    const previewUrl = rememberObjectUrl(
      objectUrlsRef,
      URL.createObjectURL(file),
    );

    let fallbackLocation: LocationDraft | null = null;

    if (
      origin === "camera" &&
      metadata.latitude === null &&
      metadata.longitude === null
    ) {
      fallbackLocation = await requestCurrentLocationDraft().catch(() => null);
    }

    return {
      file,
      previewUrl,
      latitude: metadata.latitude ?? fallbackLocation?.latitude ?? null,
      longitude: metadata.longitude ?? fallbackLocation?.longitude ?? null,
      locationSource:
        metadata.latitude !== null && metadata.longitude !== null
          ? "exif"
          : fallbackLocation?.locationSource ?? "none",
      accuracyMeters: fallbackLocation?.accuracyMeters ?? null,
      takenAt: metadata.takenAt ?? new Date().toISOString(),
      metadataError:
        metadata.metadataError ??
        (fallbackLocation === null &&
        origin === "camera" &&
        metadata.latitude === null &&
        metadata.longitude === null
          ? "Saved without GPS because current location was unavailable."
          : null),
    } satisfies UploadRequest;
  }

  async function handleFileSelection(
    fileList: FileList | null,
    origin: UploadOrigin,
  ) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setPreparingOrigin(origin);

    try {
      const requests = await Promise.all(
        Array.from(fileList).map((file) => buildUploadRequest(file, origin)),
      );
      await saveUploadRequests(requests);
    } finally {
      setPreparingOrigin(null);
    }
  }

  async function attachCurrentLocationToMoment(entry: SavedMomentEntry) {
    try {
      const location = await requestCurrentLocationDraft();
      const updatedMoment = await getTripRepository().updateMoment(entry.moment.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        locationSource: location.locationSource,
        accuracyMeters: location.accuracyMeters ?? null,
        placeName: null,
      });
      updateRecentMoment(entry.moment.id, updatedMoment);
      void enrichPlaceName(
        entry.moment.id,
        location.latitude,
        location.longitude,
      );
      toast.success("Current location attached.");
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not update the location.",
      );
    }
  }

  async function updateMomentLocation(momentId: string, location: LocationDraft) {
    try {
      const updatedMoment = await getTripRepository().updateMoment(momentId, {
        latitude: location.latitude,
        longitude: location.longitude,
        locationSource: location.locationSource,
        accuracyMeters: location.accuracyMeters ?? null,
        placeName: null,
      });
      updateRecentMoment(momentId, updatedMoment);
      setPickerMomentId(null);
      void enrichPlaceName(momentId, location.latitude, location.longitude);
      toast.success("Moment pinned on the map.");
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not save that map pin.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <input
        ref={libraryInputRef}
        accept="image/*,video/*"
        className="sr-only"
        multiple
        onChange={(event) => {
          void handleFileSelection(event.target.files, "library");
          event.target.value = "";
        }}
        type="file"
      />
      <input
        ref={captureInputRef}
        accept="image/*,video/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          void handleFileSelection(event.target.files, "camera");
          event.target.value = "";
        }}
        type="file"
      />

      <Card className="overflow-hidden rounded-[30px] border-black/5 p-0">
        <div className="bg-[var(--ink)] px-5 py-6 text-white sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="subtle" className="bg-white/12 text-white">
              <Sparkles className="mr-1 h-3 w-3" />
              {libraryOnly
                ? "Past trip upload"
                : cameraFirst
                  ? "Camera-first traveler flow"
                  : "Quick media posting"}
            </Badge>
            <Badge variant="subtle" className="bg-white/12 text-white/85">
              {libraryOnly ? "Camera library only" : "Native iPhone capture"}
            </Badge>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10">
              {libraryOnly ? (
                <Images className="h-8 w-8 text-white" />
              ) : (
                <Camera className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium text-white">
                {libraryOnly
                  ? "Add moments from your camera library"
                  : "Post straight from your phone"}
              </p>
              <p className="max-w-xl text-sm leading-6 text-white/75">
                {libraryOnly
                  ? "Past trips stay editable, but new additions come from your camera library so the timeline stays grounded in real captured media."
                  : "TripTrace now hands off directly to the native camera or camera library. There is no web camera preview or warm-up step in between."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {!libraryOnly ? (
              <Button
                className="h-14 rounded-full bg-white text-[var(--ink)] hover:bg-white/95"
                disabled={isBusy}
                onClick={() => captureInputRef.current?.click()}
                type="button"
                variant="secondary"
              >
                <Camera className="h-5 w-5" />
                {preparingOrigin === "camera"
                  ? "Saving capture..."
                  : "Snap photo/video"}
              </Button>
            ) : null}
            <Button
              className="h-14 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/14"
              disabled={isBusy}
              onClick={() => libraryInputRef.current?.click()}
              type="button"
              variant="ghost"
            >
              <Images className="h-5 w-5" />
              {preparingOrigin === "library"
                ? "Loading selection..."
                : "Open camera library"}
            </Button>
          </div>
        </div>
      </Card>

      {pendingUploads.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--ink)]">Saving now</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingUploads.map((upload) => (
              <Card
                key={upload.id}
                className="overflow-hidden rounded-[26px] border-black/5 p-0"
              >
                <div className="grid gap-4 p-4 sm:grid-cols-[100px_1fr]">
                  <MediaPreview
                    alt={upload.fileName}
                    className="h-24 w-full rounded-[18px] bg-slate-100 object-cover"
                    fileType={upload.fileType}
                    src={upload.previewUrl}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-[var(--ink)]">
                          {upload.fileName}
                        </p>
                        {isVideoMimeType(upload.fileType) ? (
                          <Badge variant="subtle">
                            <Film className="mr-1 h-3 w-3" />
                            Video
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Uploading this moment now.
                      </p>
                    </div>
                    <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {recentMoments.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Recently added</p>
              <p className="text-sm text-slate-600">
                Moments are saved right away. You can fine-tune location now and
                edit titles or descriptions later from the map.
              </p>
            </div>
            <Button onClick={onClose} type="button" variant="ghost">
              Done
            </Button>
          </div>

          <div className="space-y-3">
            {recentMoments.map((entry) => {
              const hasLocation =
                typeof entry.moment.latitude === "number" &&
                typeof entry.moment.longitude === "number";

              return (
                <Card
                  key={entry.id}
                  className="overflow-hidden rounded-[28px] border-black/5 p-0"
                >
                  <div className="grid gap-4 p-4 sm:grid-cols-[140px_1fr]">
                    <MediaPreview
                      alt={entry.moment.caption ?? "Trip media moment"}
                      className="h-36 w-full rounded-[22px] bg-slate-100 object-cover"
                      fileType={entry.fileType}
                      src={entry.previewUrl}
                    />
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={hasLocation ? "accent" : "default"}>
                            {hasLocation
                              ? entry.moment.locationSource === "exif"
                                ? "Placed from media metadata"
                                : entry.moment.locationSource === "browser_gps"
                                  ? "Placed from current location"
                                  : "Pinned manually"
                              : "Saved without location"}
                          </Badge>
                          <Badge variant="subtle">{getMomentLabel(entry.moment)}</Badge>
                          {entry.moment.placeName ? (
                            <Badge variant="subtle">{entry.moment.placeName}</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600">
                          {entry.metadataError ??
                            (hasLocation
                              ? "Ready on the map. Tap the marker later to add a title or description."
                              : "Add a map point now, or leave it for later from the trip view.")}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!hasLocation && !libraryOnly ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void attachCurrentLocationToMoment(entry)}
                            type="button"
                          >
                            <LocateFixed className="h-4 w-4" />
                            Use current location
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPickerMomentId(entry.id)}
                          type="button"
                        >
                          <MapPinned className="h-4 w-4" />
                          {hasLocation ? "Adjust on map" : "Pick on map"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {pickerMoment ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                Tap the map to place this moment
              </p>
              <p className="text-sm text-slate-600">
                Choose the exact spot for this upload, then keep posting.
              </p>
            </div>
            <Button
              onClick={() => setPickerMomentId(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Done
            </Button>
          </div>
          <TripMap
            trip={trip}
            moments={[]}
            allowPick
            draftLocation={
              pickerMoment.moment.latitude !== null &&
              pickerMoment.moment.longitude !== null
                ? {
                    latitude: pickerMoment.moment.latitude,
                    longitude: pickerMoment.moment.longitude,
                    locationSource: pickerMoment.moment.locationSource,
                  }
                : undefined
            }
            heightClassName="h-56"
            onPickLocation={(location) => {
              void updateMomentLocation(pickerMoment.moment.id, location);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
