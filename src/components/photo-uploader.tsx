"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Images,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  Sparkles,
  VideoOff,
  Zap,
  ZoomIn,
} from "lucide-react";
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
  previewUrl: string;
}

interface SavedMomentEntry {
  id: string;
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

interface ZoomRange {
  min: number;
  max: number;
  step: number;
  value: number;
}

type CameraStatus = "starting" | "ready" | "error" | "unsupported";

function rememberObjectUrl(registry: { current: string[] }, url: string) {
  registry.current.push(url);
  return url;
}

function getZoomRange(value: unknown): ZoomRange | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    min?: number;
    max?: number;
    step?: number;
  };

  if (typeof candidate.min !== "number" || typeof candidate.max !== "number") {
    return null;
  }

  return {
    min: candidate.min,
    max: candidate.max,
    step:
      typeof candidate.step === "number" && candidate.step > 0
        ? candidate.step
        : 0.1,
    value: candidate.min,
  };
}

async function captureVideoFrame(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("Camera preview is still warming up.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("TripTrace could not read the camera frame.");
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("TripTrace could not capture that frame."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function PhotoUploader({
  trip,
  active = true,
  cameraFirst = false,
  libraryOnly = false,
  onSaved,
  onClose,
}: PhotoUploaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [recentMoments, setRecentMoments] = useState<SavedMomentEntry[]>([]);
  const [pickerMomentId, setPickerMomentId] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const currentVideo = videoRef.current;

    if (!active || libraryOnly) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      trackRef.current = null;
      if (currentVideo) {
        currentVideo.srcObject = null;
      }
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraStatus("unsupported");
          setCameraError(
            "Live camera preview is not available here, but you can still use the device camera or photo library.",
          );
        }
        return;
      }

      if (streamRef.current) {
        return;
      }

      setCameraStatus("starting");
      setCameraError(null);
      setTorchEnabled(false);
      setTorchSupported(false);
      setZoomRange(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;

        const capabilities = track?.getCapabilities?.() as Record<string, unknown> | undefined;
        const settings = track?.getSettings?.() as Record<string, unknown> | undefined;
        const detectedZoom = getZoomRange(capabilities?.zoom);

        setTorchSupported(capabilities?.torch === true);
        setZoomRange(
          detectedZoom
            ? {
                ...detectedZoom,
                value:
                  typeof settings?.zoom === "number"
                    ? settings.zoom
                    : detectedZoom.min,
              }
            : null,
        );

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        setCameraStatus("ready");
      } catch (error) {
        setCameraStatus("error");
        setCameraError(
          error instanceof Error
            ? error.message
            : "TripTrace could not open the camera right now.",
        );
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      trackRef.current = null;
      if (currentVideo) {
        currentVideo.srcObject = null;
      }
    };
  }, [active, libraryOnly]);

  const pickerMoment =
    recentMoments.find((entry) => entry.id === pickerMomentId) ?? null;

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

  async function enrichPlaceName(momentId: string, latitude: number | null, longitude: number | null) {
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

  async function handleLibrarySelection(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const requests = await Promise.all(
      Array.from(fileList).map(async (file) => {
        const metadata = await extractPhotoMetadata(file);
        const previewUrl = rememberObjectUrl(
          objectUrlsRef,
          URL.createObjectURL(file),
        );

        return {
          file,
          previewUrl,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          locationSource:
            metadata.latitude !== null && metadata.longitude !== null
              ? "exif"
              : "none",
          accuracyMeters: null,
          takenAt:
            metadata.takenAt ?? new Date().toISOString(),
          metadataError: metadata.metadataError,
        } satisfies UploadRequest;
      }),
    );

    await saveUploadRequests(requests);
  }

  async function handleCapturePhoto() {
    if (cameraStatus !== "ready" || !videoRef.current) {
      fallbackCameraInputRef.current?.click();
      return;
    }

    setCapturing(true);

    try {
      const [blob, currentLocation] = await Promise.all([
        captureVideoFrame(videoRef.current),
        requestCurrentLocationDraft().catch(() => null),
      ]);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new File([blob], `triptrace-${timestamp}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      const previewUrl = rememberObjectUrl(objectUrlsRef, URL.createObjectURL(file));

      await saveUploadRequests([
        {
          file,
          previewUrl,
          latitude: currentLocation?.latitude ?? null,
          longitude: currentLocation?.longitude ?? null,
          locationSource: currentLocation?.locationSource ?? "none",
          accuracyMeters: currentLocation?.accuracyMeters ?? null,
          takenAt: new Date().toISOString(),
          metadataError:
            currentLocation === null
              ? "Saved without GPS because current location was unavailable."
              : null,
        },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not capture that photo.",
      );
    } finally {
      setCapturing(false);
    }
  }

  async function toggleTorch() {
    const track = trackRef.current;

    if (!track || !torchSupported) {
      return;
    }

    const nextEnabled = !torchEnabled;

    try {
      await track.applyConstraints({
        advanced: [{ torch: nextEnabled } as MediaTrackConstraintSet],
      });
      setTorchEnabled(nextEnabled);
    } catch {
      toast.error("This camera could not change flash mode.");
    }
  }

  async function applyZoom(nextValue: number) {
    const track = trackRef.current;

    if (!track || !zoomRange) {
      return;
    }

    try {
      await track.applyConstraints({
        advanced: [{ zoom: nextValue } as MediaTrackConstraintSet],
      });
      setZoomRange((current) =>
        current
          ? {
              ...current,
              value: nextValue,
            }
          : current,
      );
    } catch {
      toast.error("This camera could not change zoom.");
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
      toast.success("Photo pinned on the map.");
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
        accept="image/*"
        className="sr-only"
        multiple
        onChange={(event) => {
          void handleLibrarySelection(event.target.files);
          event.target.value = "";
        }}
        type="file"
      />
      <input
        ref={fallbackCameraInputRef}
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          void handleLibrarySelection(event.target.files);
          event.target.value = "";
        }}
        type="file"
      />

      <Card className="overflow-hidden rounded-[30px] border-black/5 p-0">
        <div className="relative bg-[var(--ink)] text-white">
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <Badge variant="subtle" className="bg-white/12 text-white">
              <Sparkles className="mr-1 h-3 w-3" />
              {libraryOnly
                ? "Past trip upload"
                : cameraFirst
                  ? "Camera-first traveler flow"
                  : "Quick photo posting"}
            </Badge>
            <Badge variant="subtle" className="bg-white/12 text-white/80">
              <VideoOff className="mr-1 h-3 w-3" />
              {libraryOnly ? "Camera roll only" : "Photo mode live"}
            </Badge>
          </div>

          <div className="aspect-[4/5] w-full bg-black sm:aspect-[16/10]">
            {!libraryOnly && cameraStatus === "ready" ? (
              <video
                ref={videoRef}
                autoPlay
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                {libraryOnly ? (
                  <>
                    <Images className="h-6 w-6 text-white/80" />
                    <p className="max-w-sm text-sm text-white/80">
                      Pick photos from your camera roll to add moments to this past trip.
                    </p>
                  </>
                ) : cameraStatus === "starting" ? (
                  <>
                    <LoaderCircle className="h-6 w-6 animate-spin" />
                    <p className="max-w-sm text-sm text-white/80">
                      Opening the rear camera so the traveler can post right away.
                    </p>
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6 text-white/80" />
                    <p className="max-w-sm text-sm text-white/80">
                      {cameraError ??
                        "Live camera preview is unavailable, but you can still use the device camera or photo library."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              {!libraryOnly ? (
                <>
                  <Button
                    disabled={!torchSupported}
                    onClick={() => void toggleTorch()}
                    size="sm"
                    type="button"
                    variant={torchEnabled ? "secondary" : "ghost"}
                  >
                    <Zap className="h-4 w-4" />
                    {torchSupported ? (torchEnabled ? "Flash on" : "Flash off") : "Flash unavailable"}
                  </Button>

                  {zoomRange ? (
                    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm">
                      <ZoomIn className="h-4 w-4" />
                      <input
                        className="w-28 accent-white"
                        max={zoomRange.max}
                        min={zoomRange.min}
                        onChange={(event) =>
                          void applyZoom(Number(event.target.value))
                        }
                        step={zoomRange.step}
                        type="range"
                        value={zoomRange.value}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-white/70">
                  The timeline stays editable, but new additions come from real photos in your library.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => libraryInputRef.current?.click()}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Images className="h-4 w-4" />
                {libraryOnly ? "Open camera roll" : "Photo library"}
              </Button>
              {!libraryOnly ? (
                <>
                  <Button
                    onClick={() => fallbackCameraInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Camera className="h-4 w-4" />
                    Device camera
                  </Button>
                  <Button
                    disabled={capturing || pendingUploads.length > 0}
                    onClick={() => void handleCapturePhoto()}
                    type="button"
                  >
                    {capturing ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Snap photo
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </div>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={upload.fileName}
                    className="h-24 w-full rounded-[18px] object-cover"
                    src={upload.previewUrl}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="line-clamp-1 text-sm font-medium text-[var(--ink)]">
                        {upload.fileName}
                      </p>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={entry.moment.caption ?? "Trip moment photo"}
                      className="h-36 w-full rounded-[22px] object-cover"
                      src={entry.previewUrl}
                    />
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={hasLocation ? "accent" : "default"}>
                            {hasLocation
                              ? entry.moment.locationSource === "exif"
                                ? "Placed from photo metadata"
                                : entry.moment.locationSource === "browser_gps"
                                  ? "Placed from current location"
                                  : "Pinned manually"
                              : "Saved without location"}
                          </Badge>
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
                Tap the map to place this photo
              </p>
              <p className="text-sm text-slate-600">
                Choose the exact spot for this moment, then keep posting.
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
