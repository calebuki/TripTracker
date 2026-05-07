"use client";

import { MessageSquareText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Moment } from "@/types/triptrace";

interface MomentMarkerProps {
  moment: Moment;
  order: number;
  selected?: boolean;
  onClick?: () => void;
}

export function MomentMarker({
  moment,
  order,
  selected = false,
  onClick,
}: MomentMarkerProps) {
  const isPhoto = moment.type === "photo" && moment.imageUrl;

  return (
    <button
      className={cn(
        "group relative rounded-full transition-transform hover:scale-[1.03]",
        selected && "scale-[1.04]",
      )}
      onClick={onClick}
      type="button"
    >
      {isPhoto ? (
        <div
          className={cn(
            "h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-[0_16px_40px_rgba(15,23,42,0.24)] ring-4 ring-transparent transition",
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
      ) : (
        <div
          className={cn(
            "flex min-h-12 min-w-12 items-center justify-center rounded-[18px] border border-white/60 bg-[var(--ink)] px-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] ring-4 ring-transparent transition",
            selected && "ring-[var(--accent)]",
          )}
        >
          <MessageSquareText className="h-4 w-4" />
        </div>
      )}
      <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-white/90 bg-[var(--accent)] px-1 text-[11px] font-semibold leading-none text-[var(--ink)] shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
        {order}
      </span>
    </button>
  );
}
