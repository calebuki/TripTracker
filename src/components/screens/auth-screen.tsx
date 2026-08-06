"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { getTripRepository } from "@/lib/repositories";
import { resolveSiteUrl } from "@/lib/utils";

export function AuthScreen() {
  const { user, loading: authLoading, isDemoMode, processingCallback, error: authError, retry } =
    useCrumbsAuth();
  const isCheckingSignIn = Boolean(processingCallback || authLoading);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const error = authError ?? sendError;

  async function handleSendLink() {
    if (!email.trim()) {
      toast.error("Enter an email address first.");
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      await getTripRepository().signInWithEmail(
        email.trim(),
        `${resolveSiteUrl()}/auth`,
      );
      toast.success("Magic link sent. Check your inbox.");
    } catch (sendLinkError) {
      const message =
        sendLinkError instanceof Error
          ? sendLinkError.message
          : "Crumbs could not send the sign-in link.";

      setSendError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  if (isDemoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-xl rounded-[34px]">
          <CardHeader>
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
      <Card className="w-full max-w-xl rounded-[34px]">
        <CardHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <Mail className="h-3.5 w-3.5" />
            Magic link sign-in
          </div>
          <CardTitle className="text-4xl">
            {isCheckingSignIn ? "Checking your sign-in" : "Traveler sign-in"}
          </CardTitle>
          {isCheckingSignIn ? null : (
            <CardDescription>
              Use a simple email magic link to sign in, or switch to another
              traveler account.
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
                    disabled={sending}
                    onClick={() => {
                      if (authError) {
                        retry();
                        return;
                      }

                      void handleSendLink();
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
              <Button
                className="w-full bg-[var(--ink)] text-white hover:bg-[var(--ink-strong)]"
                disabled={sending}
                onClick={() => void handleSendLink()}
              >
                {sending ? "Sending magic link..." : "Send magic link"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
