function buildPlaceName(address: Record<string, string | undefined>) {
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.municipality ??
    address.county ??
    address.state;
  const country = address.country;

  if (locality && country) {
    return `${locality}, ${country}`;
  }

  return locality ?? country ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json(
      { error: "Latitude and longitude are required." },
      { status: 400 },
    );
  }

  const search = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
    format: "jsonv2",
  });
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${search.toString()}`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": "Crumbs/1.0 (trip setup)",
        },
      },
    );

    if (!response.ok) {
      return Response.json(
        { error: "Could not look up this location." },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      address?: Record<string, string | undefined>;
      display_name?: string;
    };
    const placeName = buildPlaceName(payload.address ?? {});

    return Response.json({
      placeName: placeName ?? payload.display_name ?? null,
    });
  } catch {
    return Response.json(
      { error: "Could not look up this location." },
      { status: 502 },
    );
  }
}
