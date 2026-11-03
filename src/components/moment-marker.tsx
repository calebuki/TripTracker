"use client";

import { Film, MessageSquareText } from "lucide-react";

import { getSupabaseImageTransformUrl, isMomentVideo } from "@/lib/media";
import type { Moment } from "@/types/crumbs";

interface MomentMarkerProps {
  moment: Moment;
  order: number;
  // Time-of-day colour of the moment, matching the trail.
  color: string;
  endOrder?: number;
  clusterSize?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function MomentMarker({
  moment,
  order,
  color,
  endOrder,
  clusterSize = 1,
  selected = false,
  onClick,
}: MomentMarkerProps) {
  const hasMedia = moment.type === "photo" && moment.imageUrl;
  const isVideo = hasMedia && isMomentVideo(moment);
  const markerImageUrl = getSupabaseImageTransformUrl(moment.imageUrl, {
    width: 112,
    height: 112,
  });
  const orderLabel =
    clusterSize > 1 && endOrder && endOrder !== order
      ? `${order}–${endOrder}`
      : order.toString();
  const label = moment.caption ?? moment.placeName ?? (hasMedia ? "Photo" : "Note");

  return (
    <button
      aria-label={`${label}, stop ${orderLabel}${clusterSize > 1 ? `, ${clusterSize} moments here` : ""}`}
      aria-pressed={selected}
      className="crumbs-marker group relative rounded-full"
      data-selected={selected}
      onClick={onClick}
      type="button"
    >
      {hasMedia ? (
        <span
          className="block h-14 w-14 rounded-full p-1 ring-2 ring-[#15161c]"
          style={{ background: color }}
        >
          <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-white bg-[#15161c] text-white">
            {isVideo ? (
              <Film aria-hidden className="h-5 w-5" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                decoding="async"
                fetchPriority={selected ? "high" : "low"}
                loading="lazy"
                onError={(event) => {
                  const originalUrl = moment.imageUrl ?? "";

                  if (originalUrl && event.currentTarget.src !== originalUrl) {
                    event.currentTarget.src = originalUrl;
                  }
                }}
                src={markerImageUrl}
              />
            )}
          </span>
        </span>
      ) : (
        <span
          className="grid h-12 w-12 place-items-center rounded-full border-[5px] bg-white text-[#15161c] ring-2 ring-[#15161c]"
          style={{ borderColor: color }}
        >
          <MessageSquareText aria-hidden className="h-4 w-4" />
        </span>
      )}
      <span className="tabular pointer-events-none absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#15161c] px-1.5 text-xs font-bold leading-none text-white">
        {orderLabel}
      </span>
      {clusterSize > 1 ? (
        <span className="tabular pointer-events-none absolute -bottom-1.5 -left-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#15161c] bg-white px-1.5 text-xs font-bold leading-none text-[#15161c]">
          {clusterSize}
        </span>
      ) : null}
    </button>
  );
}
