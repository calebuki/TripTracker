"use client";

import { useState } from "react";
import { Copy, LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getTripRepository } from "@/lib/repositories";
import { resolveSiteUrl } from "@/lib/utils";
import type { Trip, TripLocationPrivacyMode } from "@/types/triptrace";

interface ShareTripDialogProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (trip: Trip) => void;
}

const privacyModes: Array<{
  value: TripLocationPrivacyMode;
  label: string;
  description: string;
}> = [
  {
    value: "exact",
    label: "Exact",
    description: "Show moments exactly where they happened.",
  },
  {
    value: "approximate",
    label: "Approximate",
    description: "Soften pins within a small radius.",
  },
  {
    value: "hide_current_day",
    label: "Hide today",
    description: "Keep the current day off the public map.",
  },
];

export function ShareTripDialog({
  trip,
  open,
  onOpenChange,
  onUpdated,
}: ShareTripDialogProps) {
  const stateKey = `${trip.id}:${trip.updatedAt}:${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ShareTripDialogBody
          key={stateKey}
          trip={trip}
          onOpenChange={onOpenChange}
          onUpdated={onUpdated}
        />
      </DialogContent>
    </Dialog>
  );
}

function ShareTripDialogBody({
  trip,
  onOpenChange,
  onUpdated,
}: Omit<ShareTripDialogProps, "open">) {
  const [locationPrivacyMode, setLocationPrivacyMode] =
    useState<TripLocationPrivacyMode>(trip.locationPrivacyMode);
  const [passcode, setPasscode] = useState("");
  const [passcodeTouched, setPasscodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const shareUrl = `${resolveSiteUrl()}/t/${trip.shareSlug}`;

  async function handleSave() {
    setSaving(true);

    try {
      const updatedTrip = await getTripRepository().updateTripSettings(trip.id, {
        locationPrivacyMode,
        passcode: passcodeTouched ? passcode : undefined,
      });

      onUpdated(updatedTrip);
      toast.success("Share settings updated.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not update sharing.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Share Trip</DialogTitle>
        <DialogDescription>
          Anyone with this link can view the trip. Keep the experience simple
          and private.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-black/5 bg-[var(--paper)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                Private share link
              </p>
              <p className="mt-1 text-sm text-slate-600">{shareUrl}</p>
            </div>
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
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-medium text-[var(--ink)]">
              Viewer passcode
            </p>
            <Badge variant="subtle">Optional</Badge>
          </div>
          <Input
            onChange={(event) => {
              setPasscodeTouched(true);
              setPasscode(event.target.value);
            }}
            placeholder={
              trip.viewerPasscodeHash
                ? "Leave blank to clear the passcode"
                : "Add a simple passcode"
            }
            value={passcode}
          />
          <p className="text-xs leading-5 text-slate-500">
            This is a light privacy layer for shared trips, not a hardened
            security system.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--ink)]">
            Location privacy
          </p>
          <div className="grid gap-2">
            {privacyModes.map((mode) => {
              const active = mode.value === locationPrivacyMode;
              return (
                <button
                  key={mode.value}
                  className={`rounded-[24px] border px-4 py-3 text-left transition ${
                    active
                      ? "border-transparent bg-[var(--accent-soft)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                      : "border-black/6 bg-white hover:border-black/10 hover:bg-[var(--paper)]"
                  }`}
                  onClick={() => setLocationPrivacyMode(mode.value)}
                  type="button"
                >
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {mode.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button disabled={saving} onClick={() => void handleSave()}>
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
