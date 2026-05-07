import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient:
  | ReturnType<typeof createClient<Database>>
  | null = null;

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
        },
      },
    );
  }

  return browserClient;
}
