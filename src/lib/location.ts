import type { LocationDraft } from "@/types/crumbs";

export function requestCurrentCoordinates() {
  return new Promise<{ latitude: number; longitude: number; accuracyMeters: number }>(
    (resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("This browser does not support location access."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
          });
        },
        () => reject(new Error("Location access was denied.")),
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 60_000,
        },
      );
    },
  );
}

export async function requestCurrentLocationDraft(): Promise<LocationDraft> {
  const coordinates = await requestCurrentCoordinates();

  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracyMeters: coordinates.accuracyMeters,
    locationSource: "browser_gps",
  };
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
) {
  const search = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });
  const response = await fetch(`/api/reverse-geocode?${search.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not look up your current place.");
  }

  const payload = (await response.json()) as { placeName?: string | null };
  return payload.placeName ?? null;
}

export async function resolvePlaceNameForCoordinates(
  latitude: number | null,
  longitude: number | null,
) {
  if (latitude === null || longitude === null) {
    return null;
  }

  try {
    return await reverseGeocodeCoordinates(latitude, longitude);
  } catch {
    return null;
  }
}
