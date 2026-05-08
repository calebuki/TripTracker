"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";
import { Copy, LoaderCircle, User } from "lucide-react";
import { toast } from "sonner";

import { LoadingShell } from "@/components/loading-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTripRecord } from "@/hooks/use-trip-record";
import { getTripRepository } from "@/lib/repositories";
import {
  clampPublishDelayHours,
  locationPrivacyChoices,
} from "@/lib/trip-sharing";
import { resolveSiteUrl } from "@/lib/utils";
import type { Moment, TripLocationPrivacyMode } from "@/types/crumbs";

interface TripSettingsScreenProps {
  tripId: string;
}

export function TripSettingsScreen({ tripId }: TripSettingsScreenProps) {
  const { record, loading, error, refresh } = useTripRecord({
    role: "owner",
    tripId,
  });

  async function restoreMoment(moment: Moment) {
    try {
      await getTripRepository().updateMomentVisibility(moment.id, "visible");
      toast.success("Moment restored.");
      await refresh();
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Crumbs could not restore the moment.",
      );
    }
  }

  async function deleteMoment(moment: Moment) {
    if (!window.confirm("Delete this hidden moment permanently?")) {
      return;
    }

    try {
      await getTripRepository().deleteMoment(moment.id);
      toast.success("Moment deleted.");
      await refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Crumbs could not delete the moment.",
      );
    }
  }

  if (loading) {
    return <LoadingShell label="Loading trip settings..." />;
  }

  if (!record) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Trip not available</CardTitle>
            <CardDescription>
              {error ?? "We couldn't load these settings."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Back to Crumbs</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const hiddenMoments = record.moments.filter(
    (moment) => moment.visibility === "hidden",
  );
  const shareUrl = `${resolveSiteUrl()}/t/${record.trip.shareSlug}`;

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Trip settings
            </p>
            <h1 className="font-serif text-5xl tracking-tight text-[var(--ink)]">
              {record.trip.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="icon" variant="secondary">
              <Link href="/profile">
                <User className="h-4 w-4" />
                <span className="sr-only">Open profile</span>
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/trips/${record.trip.id}`}>Back to map</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <TripSettingsPanel
            key={`${record.trip.id}:${record.trip.updatedAt}`}
            shareUrl={shareUrl}
            shareCode={record.trip.shareCode}
            tripId={record.trip.id}
            hasExistingPasscode={Boolean(record.trip.viewerPasscodeHash)}
            initialLocationPrivacyMode={record.trip.locationPrivacyMode}
            initialPublishDelayHours={record.trip.publishDelayHours}
            initialEndDate={record.trip.endDate}
            tripTimezone={record.trip.timezone}
            onSaved={refresh}
          />

          <Card className="rounded-[34px]">
            <CardHeader>
              <CardTitle className="text-3xl">Hidden moments</CardTitle>
              <CardDescription>
                Restore something to the map or remove it for good.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hiddenMoments.length > 0 ? (
                <div className="space-y-3">
                  {hiddenMoments.map((moment) => (
                    <div
                      key={moment.id}
                      className="rounded-[24px] border border-black/5 bg-[var(--paper)] p-4"
                    >
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {moment.caption ?? moment.thoughtText ?? "Untitled moment"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {moment.placeName ?? "Saved without a map pin"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void restoreMoment(moment)}
                        >
                          Show again
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => void deleteMoment(moment)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-black/5 bg-[var(--paper)] p-5 text-sm leading-6 text-slate-600">
                  No hidden moments right now.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

interface TripSettingsPanelProps {
  shareUrl: string;
  shareCode: string;
  tripId: string;
  hasExistingPasscode: boolean;
  initialLocationPrivacyMode: TripLocationPrivacyMode;
  initialPublishDelayHours: number;
  initialEndDate: string | null;
  tripTimezone: string;
  onSaved: () => Promise<void> | void;
}

function TripSettingsPanel({
  shareUrl,
  shareCode,
  tripId,
  hasExistingPasscode,
  initialLocationPrivacyMode,
  initialPublishDelayHours,
  initialEndDate,
  tripTimezone,
  onSaved,
}: TripSettingsPanelProps) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [passcodeTouched, setPasscodeTouched] = useState(false);
  const [locationPrivacyMode, setLocationPrivacyMode] =
    useState<TripLocationPrivacyMode>(initialLocationPrivacyMode);
  const [publishDelayHours, setPublishDelayHours] = useState(
    initialPublishDelayHours,
  );
  const [workingAction, setWorkingAction] = useState<"save" | "status" | null>(
    null,
  );
  const tripEnded = Boolean(initialEndDate);
  const endedLabel = initialEndDate
    ? DateTime.fromISO(initialEndDate, { zone: tripTimezone }).toFormat("LLL d, yyyy")
    : null;

  async function saveSettings() {
    setWorkingAction("save");

    try {
      await getTripRepository().updateTripSettings(tripId, {
        locationPrivacyMode,
        publishDelayHours: clampPublishDelayHours(publishDelayHours),
        passcode: passcodeTouched ? passcode : undefined,
      });
      toast.success("Settings saved.");
      await onSaved();
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Crumbs could not save the settings.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function toggleTripStatus() {
    setWorkingAction("status");

    try {
      const nextEndDate = tripEnded
        ? null
        : DateTime.now().setZone(tripTimezone).toISODate() ??
          new Date().toISOString().slice(0, 10);

      await getTripRepository().updateTripSettings(tripId, {
        endDate: nextEndDate,
      });
      toast.success(tripEnded ? "Trip resumed." : "Trip ended.");
      await onSaved();

      if (!tripEnded) {
        router.push("/profile");
      }
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Crumbs could not update the trip status.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  return (
    <Card className="rounded-[34px]">
      <CardHeader>
        <CardTitle className="text-3xl">Sharing and privacy</CardTitle>
        <CardDescription>
          Fine-tune what viewers can see without cluttering the main map.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-[28px] border border-black/5 bg-[var(--paper)] p-4">
          <Label>Private share link</Label>
          <p className="text-sm text-slate-600">{shareUrl}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied.");
              } catch {
                toast.error("Crumbs couldn't copy the link.");
              }
            }}
            type="button"
          >
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
        </div>

        <div className="space-y-3 rounded-[28px] border border-black/5 bg-white p-4">
          <Label>Crumb code</Label>
          <p className="font-mono text-2xl tracking-[0.32em] text-[var(--ink)]">
            {shareCode}
          </p>
          <p className="text-sm text-slate-600">
            Anyone can type this code on the Crumbs home page to follow the trail.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareCode);
                toast.success("Crumb code copied.");
              } catch {
                toast.error("Crumbs couldn't copy the code.");
              }
            }}
            type="button"
          >
            <Copy className="h-4 w-4" />
            Copy code
          </Button>
        </div>

        <div className="space-y-3">
          <Label>Viewer passcode</Label>
          <Input
            onChange={(event) => {
              setPasscodeTouched(true);
              setPasscode(event.target.value);
            }}
            placeholder={
              hasExistingPasscode
                ? "Leave blank to clear the passcode"
                : "Add a passcode"
            }
            value={passcode}
          />
        </div>

        <div className="space-y-3">
          <Label>Viewer publishing</Label>
          <div className="grid gap-3">
            {locationPrivacyChoices.map((choice) => (
              <button
                key={choice.value}
                className={`rounded-[24px] border px-4 py-3 text-left transition ${
                  locationPrivacyMode === choice.value
                    ? "border-transparent bg-[var(--accent-soft)]"
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
              <Label htmlFor="settings-delay-hours">Publish new moments after</Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="settings-delay-hours"
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
                New moments stay private until the delay expires, then appear on
                the viewer map at their exact location.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-black/5 bg-[var(--paper)] p-4">
          <Label>Trip status</Label>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {tripEnded
              ? `This trip was ended on ${endedLabel}. You can resume it as long as you do not already have another active trip.`
              : "This trip is active. End it here when the trip is over instead of setting an end date up front."}
          </p>
          <div className="mt-4">
            <Button
              disabled={workingAction !== null}
              onClick={() => void toggleTripStatus()}
              type="button"
              variant={tripEnded ? "secondary" : "danger"}
            >
              {workingAction === "status" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : tripEnded ? (
                "Resume trip"
              ) : (
                "End trip"
              )}
            </Button>
          </div>
        </div>

        <Button
          disabled={workingAction !== null}
          onClick={() => void saveSettings()}
        >
          {workingAction === "save" ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving settings...
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
