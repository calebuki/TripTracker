"use client";

import Link from "next/link";

import { AccountDashboardScreen } from "@/components/screens/account-dashboard-screen";
import { LoadingShell } from "@/components/loading-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";

export function ProfileScreen() {
  const { user, loading, isDemoMode } = useCrumbsAuth();

  if (loading) {
    return <LoadingShell label="Checking your account..." />;
  }

  if (!user && !isDemoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Sign in to view your trips</CardTitle>
            <CardDescription>
              Your dashboard keeps Watching, active trips, and past trips in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth">Go to sign-in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <AccountDashboardScreen isDemoMode={isDemoMode} user={user} />;
}
