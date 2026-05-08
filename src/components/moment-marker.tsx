"use client";

import { Film, MessageSquareText } from "lucide-react";

import { isMomentVideo } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Moment } from "@/types/crumbs";

interface MomentMarkerProps {
  moment: Moment;
  order: number;
  endOrder?: number;
  clusterSize?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function MomentMarker({
  moment,
  order,
  endOrder,
  clusterSize = 1,
  selected = false,
  onClick,
}: MomentMarkerProps) {
  const hasMedia = moment.type === "photo" && moment.imageUrl;
  const isVideo = hasMedia && isMomentVideo(moment);
  const orderLabel =
    clusterSize > 1 && endOrder && endOrder !== order
      ? `${order}-${endOrder}`
      : order.toString();

  return (
    <button
      className={cn(
        "group relative rounded-full transition-transform hover:scale-[1.03]",
        selected && "scale-[1.04]",
      )}
      onClick={onClick}
      type="button"
    >
      {hasMedia && !isVideo ? (
        <div
          className={cn(
            "h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-[0_16px_40px_rgba(15,23,42,0.24)] ring-4 ring-transparent transition",
            clusterSize > 1 && "shadow-[0_0_0_4px_rgba(255,248,234,0.85),0_16px_40px_rgba(15,23,42,0.24)]",
            selected && "ring-[var(--accent)]",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={moment.caption ?? moment.placeName ?? "Trip moment photo"}
            className="h-full w-full object-cover"
            src={moment.imageUrl ?? ""}
          />
        </div>
      ) : hasMedia ? (
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[var(--ink)] text-white shadow-[0_16px_40px_rgba(15,23,42,0.24)] ring-4 ring-transparent transition",
            clusterSize > 1 && "shadow-[0_0_0_4px_rgba(255,248,234,0.85),0_16px_40px_rgba(15,23,42,0.24)]",
            selected && "ring-[var(--accent)]",
          )}
        >
          <Film className="h-5 w-5" />
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-12 min-w-12 items-center justify-center rounded-[18px] border border-white/60 bg-[var(--ink)] px-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] ring-4 ring-transparent transition",
            clusterSize > 1 && "shadow-[0_0_0_4px_rgba(255,248,234,0.85),0_16px_40px_rgba(15,23,42,0.22)]",
            selected && "ring-[var(--accent)]",
          )}
        >
          <MessageSquareText className="h-4 w-4" />
        </div>
      )}
      <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-white/90 bg-[var(--accent)] px-1.5 text-[11px] font-semibold leading-none text-[var(--ink)] shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
        {orderLabel}
      </span>
      {clusterSize > 1 ? (
        <span className="pointer-events-none absolute -bottom-1 -left-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-white/90 bg-white px-1.5 text-[11px] font-semibold leading-none text-[var(--ink)] shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
          {clusterSize}
        </span>
      ) : null}
    </button>
  );
}
