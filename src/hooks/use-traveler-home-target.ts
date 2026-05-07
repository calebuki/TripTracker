"use client";

import { useEffect, useState } from "react";

import { useTripTraceAuth } from "@/hooks/use-triptrace-auth";
import { getTripRepository } from "@/lib/repositories";
import type { Trip } from "@/types/triptrace";

type TravelerHomeStatus = "active" | "latest" | "new";

interface TravelerHomeTargetState {
  error: string | null;
  trip: Trip | null;
  status: TravelerHomeStatus;
  targetPath: string | null;
}

interface LoadedTravelerHomeTargetState extends TravelerHomeTargetState {
  userId: string;
}

const initialState: TravelerHomeTargetState = {
  error: null,
  trip: null,
  status: "new",
  targetPath: null,
};

export function useTravelerHomeTarget() {
  const { user, loading: authLoading, isDemoMode } = useTripTraceAuth();
  const [state, setState] = useState<LoadedTravelerHomeTargetState | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const repository = getTripRepository();
        const activeTrip = await repository.getActiveTripForCurrentUser();

        if (cancelled) {
          return;
        }

        if (activeTrip) {
          setState({
            userId: user.id,
            error: null,
            trip: activeTrip,
            status: "active",
            targetPath: `/trips/${activeTrip.id}?capture=1`,
          });
          return;
        }

        const latestTrip = await repository.getLatestOwnedTripForCurrentUser();

        if (cancelled) {
          return;
        }

        setState({
          userId: user.id,
          error: null,
          trip: latestTrip,
          status: latestTrip ? "latest" : "new",
          targetPath: latestTrip ? "/profile" : "/trips/new",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          userId: user.id,
          error:
            error instanceof Error
              ? error.message
              : "TripTrace could not load your traveler dashboard.",
          trip: null,
          status: "new",
          targetPath: "/trips/new",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const hasFreshState = Boolean(user && state?.userId === user.id);
  const resolvedState =
    authLoading || !user
      ? initialState
      : hasFreshState
        ? state
        : initialState;

  return {
    ...resolvedState,
    loading: Boolean(user) && !authLoading && !hasFreshState,
    authLoading,
    isDemoMode,
    user,
  };
}
