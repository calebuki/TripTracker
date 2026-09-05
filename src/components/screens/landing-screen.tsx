"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { AccountDashboardScreen } from "@/components/screens/account-dashboard-screen";
import { LoadingShell } from "@/components/loading-shell";
import { TripCodeEntry } from "@/components/trip-code-entry";
import { CrumbsBrand, TravelTrail } from "@/components/crumbs-brand";
import { Button } from "@/components/ui/button";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";

export function LandingScreen() {
  const { user, loading, isDemoMode } = useCrumbsAuth();

  if (loading && !isDemoMode) {
    return <LoadingShell label="Opening your Crumbs..." />;
  }

  if (user || isDemoMode) {
    if (!user) {
      return null;
    }

    return <AccountDashboardScreen isDemoMode={isDemoMode} user={user} />;
  }

  return <WelcomeScreen />;
}

export function WelcomeScreen() {
  return (
    <main className="crumbs-page crumbs-landing">
      <nav aria-label="Main navigation" className="crumbs-landing-nav">
        <Link aria-label="Crumbs home" href="/">
          <CrumbsBrand />
        </Link>
        <Button asChild variant="secondary">
          <Link href="/auth">
            Traveler login <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
      </nav>
      <div className="crumbs-landing-body">
        <div>
          <p className="crumbs-eyebrow mb-5">
            Little moments. A world of memories.
          </p>
          <h1 className="crumbs-landing-heading">
            Every trip
            <br />
            leaves a <em>trail.</em>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-slate-600">
            Follow a private trail of crumbs from the moments that made the
            trip.
          </p>
          <TravelTrail className="mt-4 max-w-sm" />
        </div>
        <section aria-labelledby="follow-trip-title" className="crumbs-ticket">
          <div className="crumbs-ticket-top">
            <div className="flex items-center justify-between text-[var(--sea-ink)]">
              <span className="crumbs-eyebrow">Your ticket to the trip</span>
              <MapPin aria-hidden className="h-5 w-5" />
            </div>
            <h2 id="follow-trip-title">Follow their crumbs.</h2>
            <p className="mt-2 text-sm text-[var(--sea-ink)]">
              A little closer, wherever they go.
            </p>
          </div>
          <div className="crumbs-ticket-body">
            <TripCodeEntry />
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Ask your traveler for their crumb code.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
