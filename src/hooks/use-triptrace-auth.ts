"use client";

import { useEffect, useState } from "react";

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

export function useTripTraceAuth() {
  const [user, setUser] = useState<TripTraceUser | null>(
    isDemoMode ? demoOwner : null,
  );
  const [loading, setLoading] = useState(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setUser(data.user ? mapAuthUser(data.user) : null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      setUser(data.user ? mapAuthUser(data.user) : null);
      setLoading(false);
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
  };
}
