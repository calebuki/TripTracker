import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let serverClient:
  | ReturnType<typeof createClient<Database>>
  | null = null;

function getSupabaseSecretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function getSupabaseServerClient() {
  const secretKey = getSupabaseSecretKey();

  if (!publicEnv.supabaseUrl || !secretKey) {
    throw new Error(
      "Supabase server access is not configured. Add SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!serverClient) {
    serverClient = createClient<Database>(publicEnv.supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serverClient;
}
