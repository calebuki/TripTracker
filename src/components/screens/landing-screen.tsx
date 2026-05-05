"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Compass, Lock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDemoMode } from "@/lib/env";

export function LandingScreen() {
  const router = useRouter();
  const [shareInput, setShareInput] = useState("");

  function handleOpenSharedTrip() {
    if (!shareInput.trim()) {
      router.push("/t/paris-maymester-private");
      return;
    }

    try {
      const parsedUrl = new URL(shareInput.trim());
      const slug = parsedUrl.pathname.split("/").filter(Boolean).pop();

      if (slug) {
        router.push(`/t/${slug}`);
        return;
      }
    } catch {
      router.push(`/t/${shareInput.trim().replace(/^\/?t\//, "")}`);
      return;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="relative overflow-hidden rounded-[36px] bg-[#f9f5ee]">
          <CardHeader className="relative z-10 max-w-2xl space-y-4 p-8 sm:p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <Compass className="h-3.5 w-3.5" />
              Private travel journal
            </div>
            <CardTitle className="max-w-xl text-5xl leading-none sm:text-6xl">
              TripTrace
            </CardTitle>
            <CardDescription className="max-w-lg text-lg leading-8 text-slate-600">
              A private map of the moments that made the trip.
            </CardDescription>
            <div className="flex flex-wrap gap-3 pt-3">
              <Button asChild size="lg">
                <Link href="/trips/new">
                  Create a Trip
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={handleOpenSharedTrip}
                type="button"
              >
                Open Shared Trip
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-8 pt-0 sm:p-10">
            <div className="max-w-md space-y-3">
              <label className="text-sm font-medium text-[var(--ink)]">
                Shared link or code
              </label>
              <Input
                onChange={(event) => setShareInput(event.target.value)}
                placeholder="Paste a TripTrace link or a share code"
                value={shareInput}
              />
              <p className="text-sm leading-6 text-slate-600">
                If you just want to see the experience first, open the Paris
                demo trip.
              </p>
            </div>
          </CardContent>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] lg:block">
            <div className="absolute right-8 top-10 h-56 w-56 rounded-full bg-white/70 blur-3xl" />
            <div className="absolute inset-10 rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.72))] shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
              <div className="absolute left-6 top-6 right-6 h-44 rounded-[26px] bg-[url('/demo/landing-map.svg')] bg-cover bg-center" />
              <div className="absolute bottom-6 left-6 right-6 rounded-[24px] bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <p className="font-serif text-2xl text-[var(--ink)]">
                  Paris Maymester
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Follow each day, photo by photo, without the noise of a feed.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-[32px]">
            <CardHeader>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                Calm by design
              </div>
              <CardTitle className="text-3xl">
                Built for one traveler and the people back home
              </CardTitle>
              <CardDescription>
                Open the page, see the route, tap a thumbnail, and understand the
                day immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <p>TripTrace keeps the map front and center.</p>
              <p>Photos use EXIF GPS when available, with simple fallback tools when they do not.</p>
              <p>Viewers never need an account or a tutorial.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle className="text-3xl">
                {isDemoMode ? "Ready in demo mode" : "Connect Supabase when you're ready"}
              </CardTitle>
              <CardDescription>
                TripTrace ships with a seeded Paris trip so the full interface can
                be tested before any backend setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/t/paris-maymester-private">Open the Paris demo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
