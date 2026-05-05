"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { TripExperience } from "@/components/trip-experience";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTripRecord } from "@/hooks/use-trip-record";
import { hashPasscode } from "@/lib/crypto";

interface ViewerTripScreenProps {
  shareSlug: string;
}

export function ViewerTripScreen({ shareSlug }: ViewerTripScreenProps) {
  const { record, loading, error, refresh, isDemoMode } = useTripRecord({
    role: "viewer",
    shareSlug,
  });
  const [passcode, setPasscode] = useState("");
  const [verifiedOverride, setVerifiedOverride] = useState(false);

  if (loading) {
    return null;
  }

  if (!record) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Shared trip not found</CardTitle>
            <CardDescription>
              {error ?? "The link may have changed or expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/">Back to TripTrace</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const storedVerification =
    typeof window !== "undefined" && record.trip.viewerPasscodeHash
      ? window.sessionStorage.getItem(
          `triptrace-passcode:${record.trip.shareSlug}`,
        ) === record.trip.viewerPasscodeHash
      : false;
  const verified =
    !record.trip.viewerPasscodeHash || storedVerification || verifiedOverride;

  if (!verified && record.trip.viewerPasscodeHash) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              Protected trip
            </div>
            <CardTitle className="text-4xl">{record.trip.title}</CardTitle>
            <CardDescription>
              This shared trip uses a simple viewer passcode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
              type="password"
              value={passcode}
            />
            <Button
              onClick={async () => {
                const hashed = await hashPasscode(record.trip.shareSlug, passcode);

                if (hashed === record.trip.viewerPasscodeHash) {
                  const key = `triptrace-passcode:${record.trip.shareSlug}`;
                  window.sessionStorage.setItem(key, hashed ?? "");
                  setVerifiedOverride(true);
                  return;
                }

                toast.error("That passcode doesn't match.");
              }}
            >
              Open trip
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <TripExperience
      record={record}
      role="viewer"
      isDemoMode={isDemoMode}
      onRefresh={refresh}
    />
  );
}
