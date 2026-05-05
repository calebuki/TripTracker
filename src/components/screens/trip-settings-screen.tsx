"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTripRecord } from "@/hooks/use-trip-record";
import { getTripRepository } from "@/lib/repositories";
import { resolveSiteUrl } from "@/lib/utils";
import type { Moment, TripLocationPrivacyMode } from "@/types/triptrace";

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
          : "TripTrace could not restore the moment.",
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
          : "TripTrace could not delete the moment.",
      );
    }
  }

  if (loading) {
    return null;
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
              <Link href="/">Back to TripTrace</Link>
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
          <Button asChild variant="secondary">
            <Link href={`/trips/${record.trip.id}`}>Back to map</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <TripSettingsPanel
            key={`${record.trip.id}:${record.trip.updatedAt}`}
            shareUrl={shareUrl}
            tripId={record.trip.id}
            hasExistingPasscode={Boolean(record.trip.viewerPasscodeHash)}
            initialLocationPrivacyMode={record.trip.locationPrivacyMode}
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
  tripId: string;
  hasExistingPasscode: boolean;
  initialLocationPrivacyMode: TripLocationPrivacyMode;
  onSaved: () => Promise<void> | void;
}

function TripSettingsPanel({
  shareUrl,
  tripId,
  hasExistingPasscode,
  initialLocationPrivacyMode,
  onSaved,
}: TripSettingsPanelProps) {
  const [passcode, setPasscode] = useState("");
  const [passcodeTouched, setPasscodeTouched] = useState(false);
  const [locationPrivacyMode, setLocationPrivacyMode] =
    useState<TripLocationPrivacyMode>(initialLocationPrivacyMode);
  const [saving, setSaving] = useState(false);

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
                toast.error("TripTrace couldn't copy the link.");
              }
            }}
            type="button"
          >
            <Copy className="h-4 w-4" />
            Copy link
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
          <Label>Location privacy</Label>
          <div className="grid gap-3">
            {[
              ["exact", "Exact", "Show locations exactly as saved."],
              [
                "approximate",
                "Approximate",
                "Randomize within a small radius for a softer trail.",
              ],
              [
                "hide_current_day",
                "Hide current day",
                "Keep today's route off the viewer map.",
              ],
            ].map(([value, label, description]) => (
              <button
                key={value}
                className={`rounded-[24px] border px-4 py-3 text-left transition ${
                  locationPrivacyMode === value
                    ? "border-transparent bg-[var(--accent-soft)]"
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

        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);

            try {
              await getTripRepository().updateTripSettings(tripId, {
                locationPrivacyMode,
                passcode: passcodeTouched ? passcode : undefined,
              });
              toast.success("Settings saved.");
              await onSaved();
            } catch (updateError) {
              toast.error(
                updateError instanceof Error
                  ? updateError.message
                  : "TripTrace could not save the settings.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving settings…
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
