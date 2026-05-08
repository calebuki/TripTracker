"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, LoaderCircle, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTravelerHomeTarget } from "@/hooks/use-traveler-home-target";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { getTripRepository } from "@/lib/repositories";
import {
  TRIP_CODE_LENGTH,
  isValidShareCode,
  normalizeShareCode,
} from "@/lib/share-code";

export function LandingScreen() {
  const router = useRouter();
  const { user, loading: authLoading, isDemoMode } = useCrumbsAuth();
  const travelerHome = useTravelerHomeTarget({
    user,
    authLoading,
    isDemoMode,
  });
  const [code, setCode] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!travelerHome.user || travelerHome.loading || !travelerHome.targetPath) {
      return;
    }

    router.replace(travelerHome.targetPath);
  }, [router, travelerHome.loading, travelerHome.targetPath, travelerHome.user]);

  async function handleOpenTrip() {
    const normalized = normalizeShareCode(code);

    if (!isValidShareCode(normalized)) {
      toast.error(`Enter the ${TRIP_CODE_LENGTH}-character crumb code.`);
      return;
    }

    setOpening(true);

    try {
      const slugPromise = getTripRepository().getShareSlugByCode(normalized);
      const shareSlug = await Promise.race([
        slugPromise,
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 5_000);
        }),
      ]);

      if (!shareSlug) {
        toast.error("No crumbs match that code.");
        return;
      }

      router.push(`/t/${shareSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs could not open the trip.",
      );
    } finally {
      setOpening(false);
    }
  }

  if (travelerHome.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4 py-10 sm:px-6">
        <Card className="w-full max-w-xl rounded-[36px] bg-[#f9f5ee]">
          <CardHeader className="space-y-4 p-8 sm:p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Traveler mode
            </div>
            <CardTitle className="text-5xl leading-none sm:text-6xl">
              Reopening Crumbs
            </CardTitle>
            <CardDescription className="text-lg leading-8 text-slate-600">
              {travelerHome.error ??
                (travelerHome.status === "active"
                  ? "Your active trip is loading with the camera-first flow."
                  : travelerHome.status === "latest"
                    ? "Loading your most recent trip so you can resume or review it."
                    : "Getting a fresh trip ready for you.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 sm:p-10 sm:pt-0">
            <Button
              className="w-full"
              disabled={travelerHome.loading}
              onClick={() => {
                if (travelerHome.targetPath) {
                  router.replace(travelerHome.targetPath);
                }
              }}
              size="lg"
              type="button"
            >
              {travelerHome.loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading your trip...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4 py-10 sm:px-6">
      <Card className="relative w-full max-w-xl overflow-hidden rounded-[36px] bg-[#f9f5ee]">
        <Link
          aria-label="Traveler login"
          className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition hover:bg-[var(--ink-strong)]"
          href="/auth"
          title="Traveler login"
        >
          <LogIn className="h-4 w-4" />
          Traveler login
        </Link>

        <CardHeader className="relative z-10 space-y-4 p-8 sm:p-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <Compass className="h-3.5 w-3.5" />
            Private travel journal
          </div>
          <CardTitle className="text-5xl leading-none sm:text-6xl">
            Crumbs
          </CardTitle>
          <CardDescription className="text-lg leading-8 text-slate-600">
            Follow a private trail of crumbs from the moments that made the trip.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 p-8 pt-0 sm:p-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
                htmlFor="trip-code"
              >
                Crumb code
              </label>
              <Input
                autoComplete="off"
                autoFocus
                className="h-14 text-center font-mono text-2xl tracking-[0.5em] uppercase"
                id="trip-code"
                inputMode="text"
                maxLength={TRIP_CODE_LENGTH}
                onChange={(event) =>
                  setCode(normalizeShareCode(event.target.value))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleOpenTrip();
                  }
                }}
                placeholder="....."
                spellCheck={false}
                value={code}
              />
              <p className="text-sm leading-6 text-slate-600">
                Ask the traveler for the {TRIP_CODE_LENGTH}-character crumb code,
                or use a shared link to skip this step.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={opening}
              onClick={() => void handleOpenTrip()}
              size="lg"
              type="button"
            >
              {opening ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Opening trip...
                </>
              ) : (
                <>
                  Follow crumbs
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
