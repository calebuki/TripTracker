import type { Moment } from "@/types/crumbs";

function normalizeMediaPath(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
}

export function isVideoMimeType(value: string | null | undefined) {
  return typeof value === "string" && value.toLowerCase().startsWith("video/");
}

export function isVideoPath(value: string | null | undefined) {
  const normalized = normalizeMediaPath(value);

  return (
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".mov") ||
    normalized.endsWith(".m4v") ||
    normalized.endsWith(".webm") ||
    normalized.endsWith(".ogg") ||
    normalized.endsWith(".ogv") ||
    normalized.endsWith(".avi") ||
    normalized.endsWith(".hevc")
  );
}

export function isMomentVideo(moment: Pick<Moment, "type" | "imageUrl" | "imageStoragePath">) {
  if (moment.type !== "photo") {
    return false;
  }

  return isVideoPath(moment.imageStoragePath) || isVideoPath(moment.imageUrl);
}

interface ImageTransformOptions {
  width: number;
  height: number;
  quality?: number;
}

export function getSupabaseImageTransformUrl(
  value: string | null | undefined,
  { width, height, quality = 72 }: ImageTransformOptions,
) {
  if (!value || !/^https?:\/\//i.test(value)) {
    return value ?? "";
  }

  if (isVideoPath(value) || normalizeMediaPath(value).endsWith(".svg")) {
    return value;
  }

  try {
    const url = new URL(value);
    const publicObjectPrefix = "/storage/v1/object/public/";

    if (!url.pathname.includes(publicObjectPrefix)) {
      return value;
    }

    url.pathname = url.pathname.replace(
      publicObjectPrefix,
      "/storage/v1/render/image/public/",
    );
    url.searchParams.set("width", width.toString());
    url.searchParams.set("height", height.toString());
    url.searchParams.set("resize", "cover");
    url.searchParams.set("quality", quality.toString());

    return url.toString();
  } catch {
    return value;
  }
}
