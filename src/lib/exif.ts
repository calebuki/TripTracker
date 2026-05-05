import exifr from "exifr";

export interface ExtractedPhotoMetadata {
  latitude: number | null;
  longitude: number | null;
  takenAt: string | null;
  metadataError: string | null;
}

export async function extractPhotoMetadata(
  file: File,
): Promise<ExtractedPhotoMetadata> {
  try {
    const [gps, details] = await Promise.all([
      exifr.gps(file).catch(() => null),
      exifr.parse(file, ["DateTimeOriginal"]).catch(() => null),
    ]);

    const rawTakenAt = details?.DateTimeOriginal;
    const takenAt =
      rawTakenAt instanceof Date ? rawTakenAt.toISOString() : null;

    return {
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      takenAt,
      metadataError: null,
    };
  } catch {
    return {
      latitude: null,
      longitude: null,
      takenAt: null,
      metadataError:
        "TripTrace could not read location metadata from this photo.",
    };
  }
}
