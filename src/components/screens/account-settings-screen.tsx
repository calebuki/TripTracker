"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { LoadingShell } from "@/components/loading-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { maxDisplayNameLength, normalizeDisplayName, validateDisplayName } from "@/lib/display-name";
import { getTripRepository } from "@/lib/repositories";

export function AccountSettingsScreen() {
  const { user, loading, isDemoMode } = useCrumbsAuth();

  if (loading) {
    return <LoadingShell label="Checking your account..." />;
  }

  if (!user && !isDemoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
        <Card className="w-full max-w-lg rounded-[34px]">
          <CardHeader>
            <CardTitle className="text-4xl">Sign in to manage your account</CardTitle>
            <CardDescription>
              Your display name is saved with your account.
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

  return (
    <DisplayNameForm
      key={`${user.id}:${user.displayName ?? ""}`}
      user={user}
    />
  );
}

function DisplayNameForm({ user }: { user: NonNullable<ReturnType<typeof useCrumbsAuth>["user"]> }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateDisplayName(displayName);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    try {
      await getTripRepository().updateCurrentUserDisplayName(displayName);
      setDisplayName(normalizeDisplayName(displayName));
      toast.success("Display name saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Crumbs could not save your display name.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[var(--paper)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Button asChild variant="ghost">
          <Link href="/">Back to your Crumbs</Link>
        </Button>

        <Card className="rounded-[34px]">
          <CardHeader className="space-y-3">
            <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Personal settings
            </div>
            <CardTitle className="text-4xl">Your public display name</CardTitle>
            <CardDescription className="text-base leading-7">
              This is the name shown when you comment on a friend&apos;s trip. Display
              names can repeat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-5" onSubmit={(event) => void handleSave(event)}>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  maxLength={maxDisplayNameLength}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  value={displayName}
                />
                <p className="text-sm leading-6 text-slate-600">
                  Your comment label will appear as @{normalizeDisplayName(displayName) || "name"}.
                  Hovering or focusing it currently reveals your email address.
                </p>
              </div>
              <Button disabled={saving} type="submit">
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save display name"
                )}
              </Button>
            </form>

            <div className="rounded-[24px] bg-[var(--paper)] px-4 py-3 text-sm text-slate-600">
              Signed in as {user.email}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
