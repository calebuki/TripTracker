"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTripTraceAuth } from "@/hooks/use-triptrace-auth";
import { getTripRepository } from "@/lib/repositories";
import { resolveSiteUrl } from "@/lib/utils";

export function AuthScreen() {
  const router = useRouter();
  const { user, isDemoMode } = useTripTraceAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSendLink() {
    if (!email.trim()) {
      toast.error("Enter an email address first.");
      return;
    }

    setSending(true);

    try {
      await getTripRepository().signInWithEmail(
        email.trim(),
        `${resolveSiteUrl()}/auth`,
      );
      toast.success("Magic link sent. Check your inbox.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not send the sign-in link.",
      );
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
              TripTrace can run without Supabase while you shape the experience.
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
            {user ? "You’re signed in" : "Traveler sign-in"}
          </CardTitle>
          <CardDescription>
            {user
              ? "Keep building your trip or head straight to the dashboard."
              : "Use a simple email magic link so the traveler can add moments quickly from a phone."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => router.push("/trips/new")}>
                <WandSparkles className="h-4 w-4" />
                Create a trip
              </Button>
            </div>
          ) : (
            <>
              <Input
                onChange={(event) => setEmail(event.target.value)}
                placeholder="traveler@example.com"
                type="email"
                value={email}
              />
              <Button disabled={sending} onClick={() => void handleSendLink()}>
                {sending ? "Sending magic link…" : "Send magic link"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
