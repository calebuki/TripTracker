"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

import { AccountDashboardScreen } from "@/components/screens/account-dashboard-screen";
import { TripCodeEntry } from "@/components/trip-code-entry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";

export function LandingScreen() {
  const { user, isDemoMode } = useCrumbsAuth();

  if (user || isDemoMode) {
    if (!user) {
      return null;
    }

    return <AccountDashboardScreen isDemoMode={isDemoMode} user={user} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4 py-10 sm:px-6">
      <Card className="relative w-full max-w-xl overflow-hidden rounded-[36px] bg-[#f9f5ee]">
        <Link
          aria-label="Traveler login"
          className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-[0_18px_45px_rgba(15,23,42,0.16),inset_0_0_0_1px_rgba(15,23,42,0.08)] transition hover:bg-[var(--paper)] sm:right-6 sm:top-6"
          href="/auth"
          title="Traveler login"
        >
          <LogIn className="h-4 w-4" />
          Traveler login
        </Link>

        <CardHeader className="relative z-10 space-y-4 p-8 pt-24 sm:p-10 sm:pt-24">
          <CardTitle className="text-5xl leading-none sm:text-6xl">
            Crumbs
          </CardTitle>
          <CardDescription className="text-lg leading-8 text-slate-600">
            Follow a private trail of crumbs from the moments that made the trip.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 p-8 pt-0 sm:p-10">
          <TripCodeEntry />
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ask the traveler for the crumb code, or use a shared link to skip this step.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
