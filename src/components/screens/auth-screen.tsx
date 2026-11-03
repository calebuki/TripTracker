"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { CenteredPage } from "@/components/centered-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { useDevPreview } from "@/hooks/use-dev-preview";
import { getTripRepository } from "@/lib/repositories";

export function AuthScreen() {
  const { user, loading: authLoading, isDemoMode, processingCallback, error: authError, retry } =
    useCrumbsAuth();
  const previewForm = useDevPreview("form");
  const router = useRouter();
  const isCheckingSignIn = Boolean(processingCallback || authLoading) && !previewForm;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const error = authError ?? signInError;

  async function handleSignIn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!email.trim()) {
      setSignInError("Enter your email address.");
      return;
    }

    if (!password) {
      setSignInError("Enter your password.");
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
      setSignInError(
        passwordSignInError instanceof Error
          ? passwordSignInError.message
          : "Crumbs couldn't sign you in.",
      );
    } finally {
      setSigningIn(false);
    }
  }

  if (isDemoMode && !previewForm) {
    return (
      <CenteredPage>
        <h1 className="font-display text-5xl">Demo mode</h1>
        <p className="mt-3 text-lg font-medium text-[var(--ink-soft)]">
          Supabase isn&apos;t configured, so there&apos;s nothing to sign in to.
          You can still try everything with sample data.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/trips/new">Create a demo trip</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/t/paris-maymester-private">Open the sample trip</Link>
          </Button>
        </div>
      </CenteredPage>
    );
  }

  if (isCheckingSignIn) {
    return (
      <CenteredPage>
        <h1 className="font-display text-5xl">Checking your sign-in</h1>
        <p
          className="mt-4 flex items-center gap-3 text-lg font-medium text-[var(--ink-soft)]"
          role="status"
        >
          <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-[var(--ink)]" />
          {error ?? "One moment…"}
        </p>
      </CenteredPage>
    );
  }

  return (
    <CenteredPage>
      <h1 className="font-display text-5xl">Sign in</h1>
      <p className="mt-3 text-lg font-medium text-[var(--ink-soft)]">
        For travelers posting a trip. Following someone?{" "}
        <Link
          className="font-semibold text-[var(--ink)] underline decoration-[var(--route-tomato)] decoration-[3px] underline-offset-4 transition-colors hover:decoration-[var(--ink)]"
          href="/"
        >
          Enter their code
        </Link>{" "}
        instead.
      </p>

      {user ? (
        <p className="mt-6 text-[15px] font-medium text-[var(--ink-soft)]">
          You&apos;re signed in as{" "}
          <span className="font-bold text-[var(--ink)]">{user.email}</span>. Sign
          in below to switch accounts.
        </p>
      ) : null}

      <form className="mt-8 space-y-5" noValidate onSubmit={(event) => void handleSignIn(event)}>
        <div className="space-y-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            aria-invalid={Boolean(error) && !email.trim()}
            autoComplete="email"
            id="auth-email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auth-password">Password</Label>
          <div className="relative">
            <Input
              aria-invalid={Boolean(error) && !password}
              autoComplete="current-password"
              className="pr-14"
              id="auth-password"
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-strong)] hover:text-[var(--ink)]"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="h-5 w-5" />
              ) : (
                <Eye aria-hidden className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-3 text-[15px] font-semibold">
          <input
            checked={rememberMe}
            className="crumbs-check"
            onChange={(event) => setRememberMe(event.target.checked)}
            type="checkbox"
          />
          Keep me signed in on this device
        </label>

        {error ? (
          <div
            className="flex items-start gap-3 text-[15px] font-semibold text-[var(--ink)]"
            role="alert"
          >
            <CircleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]" />
            <div className="min-w-0 flex-1">
              <p>{error}</p>
              {authError ? (
                <button
                  className="mt-1 font-bold underline underline-offset-4"
                  onClick={retry}
                  type="button"
                >
                  Try again
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <Button className="w-full" disabled={signingIn} size="lg" type="submit">
          {signingIn ? (
            <>
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </CenteredPage>
  );
}
