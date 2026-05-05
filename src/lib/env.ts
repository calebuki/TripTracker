const fallbackMapStyle = "https://demotiles.maplibre.org/style.json";

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  mapStyleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim() || fallbackMapStyle,
  siteUrl: process.env.NEXT_PUBLIC_TRIPTRACE_SITE_URL?.trim() ?? "",
  storageBucket:
    process.env.NEXT_PUBLIC_TRIPTRACE_STORAGE_BUCKET?.trim() ||
    "trip-moments",
};

export const hasSupabase = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseAnonKey,
);

export const isDemoMode = !hasSupabase;
