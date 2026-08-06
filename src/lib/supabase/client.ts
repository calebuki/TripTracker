import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient:
  | ReturnType<typeof createClient<Database>>
  | null = null;

const rememberMeStorageKey = "crumbs-remember-me";

function getSelectedAuthStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(rememberMeStorageKey) === "false"
      ? window.sessionStorage
      : window.localStorage;
  } catch {
    return null;
  }
}

function getAlternateAuthStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(rememberMeStorageKey) === "false"
      ? window.localStorage
      : window.sessionStorage;
  } catch {
    return null;
  }
}

const browserAuthStorage = {
  getItem(key: string) {
    try {
      return getSelectedAuthStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      getSelectedAuthStorage()?.setItem(key, value);
      getAlternateAuthStorage()?.removeItem(key);
    } catch {
      // Storage can be unavailable in a restricted browser context.
    }
  },
  removeItem(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in a restricted browser context.
    }
  },
};

export function getRememberMePreference() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(rememberMeStorageKey) !== "false";
  } catch {
    return true;
  }
}

export function setRememberMePreference(rememberMe: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(rememberMeStorageKey, String(rememberMe));
  } catch {
    // Supabase will continue with in-browser storage when persistence is unavailable.
  }
}

export function getSupabaseBrowserClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) {
    throw new Error("Supabase is not configured.");
  }

  if (!browserClient) {
    browserClient = createClient<Database>(
      publicEnv.supabaseUrl,
      publicEnv.supabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: browserAuthStorage,
        },
      },
    );
  }

  return browserClient;
}
