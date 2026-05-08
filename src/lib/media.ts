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
