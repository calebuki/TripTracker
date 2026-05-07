import { publicEnv } from "@/lib/env";

const developmentSiteUrl = "http://localhost:3000";

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getConfiguredSiteUrl() {
  const candidate =
    publicEnv.siteUrl ||
    (process.env.NODE_ENV === "development" ? developmentSiteUrl : "");

  if (!candidate) {
    return null;
  }

  try {
    return normalizeSiteUrl(new URL(candidate).toString());
  } catch {
    return null;
  }
}

export function getConfiguredSiteOrigin() {
  const siteUrl = getConfiguredSiteUrl();

  return siteUrl ? new URL(siteUrl) : null;
}
