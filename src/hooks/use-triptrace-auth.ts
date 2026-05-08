"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";

import { demoOwner } from "@/lib/demo-data";
import { hasSupabase, isDemoMode } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TripTraceUser } from "@/types/triptrace";

function mapAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: { display_name?: string };
  created_at?: string;
}): TripTraceUser {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: user.user_metadata?.display_name ?? null,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}

const authCallbackRetryDelayMs = 250;
const authCallbackRetryCount = 12;
const authBootstrapTimeoutMs = 8_000;

function getAuthCallbackState() {
  if (typeof window === "undefined") {
    return {
      hasCallbackParams: false,
      code: null as string | null,
      tokenHash: null as string | null,
      type: null as EmailOtpType | null,
      hasImplicitTokens: false,
      errorDescription: null as string | null,
    };
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = url.searchParams;
  const type = searchParams.get("type");

  return {
    hasCallbackParams:
      hashParams.has("access_token") ||
      hashParams.has("refresh_token") ||
      searchParams.has("code") ||
      searchParams.has("token_hash") ||
      searchParams.has("error") ||
      hashParams.has("error"),
    code: searchParams.get("code"),
    tokenHash: searchParams.get("token_hash"),
    type:
      type === "email" ||
      type === "recovery" ||
      type === "invite" ||
      type === "email_change"
        ? type
        : null,
    hasImplicitTokens:
      hashParams.has("access_token") || hashParams.has("refresh_token"),
    errorDescription:
      searchParams.get("error_description") ??
      hashParams.get("error_description") ??
      null,
  };
}

function clearAuthCallbackUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");

  window.history.replaceState({}, document.title, url.toString());
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withTimeout<T>(
  action: () => PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function useTripTraceAuth() {
  const [user, setUser] = useState<TripTraceUser | null>(
    isDemoMode ? demoOwner : null,
  );
  const [loading, setLoading] = useState(hasSupabase);
  const [processingCallback, setProcessingCallback] = useState(
    hasSupabase && getAuthCallbackState().hasCallbackParams,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabase) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    async function resolveCurrentUser(retryForCallback: boolean) {
      for (let attempt = 0; attempt <= authCallbackRetryCount; attempt += 1) {
        const { data, error: getUserError } = await withTimeout(
          () => supabase.auth.getUser(),
          authBootstrapTimeoutMs,
          "TripTrace took too long to verify your sign-in. Please refresh and try again.",
        );

        if (getUserError) {
          throw getUserError;
        }

        if (data.user) {
          return data.user;
        }

        if (!retryForCallback || attempt === authCallbackRetryCount) {
          return null;
        }

        await delay(authCallbackRetryDelayMs);
      }

      return null;
    }

    async function bootstrapAuth() {
      const callbackState = getAuthCallbackState();

      setProcessingCallback(callbackState.hasCallbackParams);
      setError(callbackState.errorDescription);

      try {
        if (callbackState.code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(callbackState.code);

          if (exchangeError) {
            throw exchangeError;
          }
        } else if (callbackState.tokenHash && callbackState.type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: callbackState.tokenHash,
            type: callbackState.type,
          });

          if (verifyError) {
            throw verifyError;
          }
        }

        const resolvedUser = await resolveCurrentUser(
          callbackState.hasCallbackParams,
        );

        if (!mounted) {
          return;
        }

        if (callbackState.hasCallbackParams) {
          clearAuthCallbackUrl();
        }

        setUser(resolvedUser ? mapAuthUser(resolvedUser) : null);
        setError(
          callbackState.hasCallbackParams && !resolvedUser
            ? "TripTrace couldn't finish signing you in. Try the magic link again."
            : null,
        );
      } catch (authError) {
        if (!mounted) {
          return;
        }

        setUser(null);
        setError(
          authError instanceof Error
            ? authError.message
            : "TripTrace couldn't finish signing you in.",
        );
      } finally {
        if (!mounted) {
          return;
        }

        setProcessingCallback(false);
        setLoading(false);
      }
    }

    void bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      try {
        const { data } = await withTimeout(
          () => supabase.auth.getUser(),
          authBootstrapTimeoutMs,
          "TripTrace took too long to refresh your sign-in. Please refresh and try again.",
        );

        if (!mounted) {
          return;
        }

        if (data.user) {
          clearAuthCallbackUrl();
        }

        setUser(data.user ? mapAuthUser(data.user) : null);
        setError(null);
        setProcessingCallback(false);
        setLoading(false);
      } catch (authError) {
        if (!mounted) {
          return;
        }

        setUser(null);
        setError(
          authError instanceof Error
            ? authError.message
            : "TripTrace couldn't refresh your sign-in.",
        );
        setProcessingCallback(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    isDemoMode,
    processingCallback,
    error,
  };
}
