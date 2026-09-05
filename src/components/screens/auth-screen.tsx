"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { CrumbsBrand } from "@/components/crumbs-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { getTripRepository } from "@/lib/repositories";

export function AuthScreen() {
  const { user, loading: authLoading, isDemoMode, processingCallback, error: authError, retry } =
    useCrumbsAuth();
  const router = useRouter();
  const isCheckingSignIn = Boolean(processingCallback || authLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const error = authError ?? signInError;

  async function handleSignIn() {
    if (!email.trim()) {
      toast.error("Enter an email address first.");
      return;
    }

    if (!password) {
      toast.error("Enter your password first.");
      return;
    }

    setSigningIn(true);
    setSignInError(null);

    try {
      await getTripRepository().signInWithPassword(
        email.trim(),
        password,
        rememberMe,
      );
      toast.success("Signed in.");
      router.replace("/");
    } catch (passwordSignInError) {
      const message =
        passwordSignInError instanceof Error
          ? passwordSignInError.message
          : "Crumbs could not sign you in.";

      setSignInError(message);
      toast.error(message);
    } finally {
      setSigningIn(false);
    }
  }

  if (isDemoMode) {
    return (
      <main className="crumbs-page flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-xl rounded-[34px]">
          <CardHeader>
            <Link href="/" aria-label="Crumbs home" className="mb-5 inline-flex"><CrumbsBrand /></Link>
            <CardTitle className="text-4xl">Demo mode is already open</CardTitle>
            <CardDescription>
              Crumbs can run without Supabase while you shape the experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/trips/new">Create a demo trip</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/t/paris-maymester-private">View the sample trip</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="crumbs-page flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
      <Card className="w-full max-w-xl rounded-[34px]">
        <CardHeader>
            <Link href="/" aria-label="Crumbs home" className="mb-5 inline-flex"><CrumbsBrand /></Link>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <KeyRound className="h-3.5 w-3.5" />
            Password sign-in
          </div>
          <CardTitle className="text-4xl">
            {isCheckingSignIn ? "Checking your sign-in" : "Traveler sign-in"}
          </CardTitle>
          {isCheckingSignIn ? null : (
            <CardDescription>
              Sign in with the email address and password for your traveler
              account.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isCheckingSignIn ? (
            <div className="flex items-center gap-3 rounded-[24px] bg-[var(--paper)] px-4 py-4 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--ink)]" />
              {error ?? "Checking your sign-in..."}
            </div>
          ) : (
            <>
              {user ? (
                <p className="rounded-[24px] bg-[var(--paper)] px-4 py-3 text-sm leading-6 text-slate-600">
                  You&apos;re currently signed in as {user.email}. Enter another
                  email below to switch accounts, or return home to follow a
                  trip as a viewer.
                </p>
              ) : null}
              {error ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p>{error}</p>
                  <Button
                    disabled={signingIn}
                    onClick={() => {
                      if (authError) {
                        retry();
                        return;
                      }

                      void handleSignIn();
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
              <Input
                onChange={(event) => setEmail(event.target.value)}
                placeholder="traveler@example.com"
                type="email"
                value={email}
              />
              <Input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
                value={password}
              />
              <label className="flex cursor-pointer items-center gap-2 px-1 text-sm text-slate-600">
                <input
                  checked={rememberMe}
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--ink)]"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                Remember me on this device
              </label>
              <Button
                className="w-full bg-[var(--ink)] text-white hover:bg-[var(--ink-strong)]"
                disabled={signingIn}
                onClick={() => void handleSignIn()}
              >
                {signingIn ? "Signing in..." : "Sign in"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
