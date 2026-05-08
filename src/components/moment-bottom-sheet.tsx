"use client";

import { useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  MoreHorizontal,
  EyeOff,
  Trash2,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isMomentVideo } from "@/lib/media";
import { formatMomentTimes } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Moment, Trip } from "@/types/crumbs";

interface MomentBottomSheetProps {
  trip: Trip;
  moments: Moment[];
  selectedMomentId: string | null;
  open: boolean;
  canManage?: boolean;
  onClose: () => void;
  onSelectMoment?: (momentId: string) => void;
  onEdit?: (moment: Moment) => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}

function MomentSheetSlide({
  moment,
  trip,
  canManage,
  onClose,
  onEdit,
  onHide,
  onDelete,
}: {
  moment: Moment;
  trip: Trip;
  canManage: boolean;
  onClose: () => void;
  onEdit?: (moment: Moment) => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}) {
  const times = formatMomentTimes(moment, trip.timezone);
  const isVideoMoment = isMomentVideo(moment);
  const tripTimeLabel =
    trip.coverLocationName?.split(",")[0]?.trim() ||
    trip.timezone.split("/").at(-1)?.replace(/_/g, " ") ||
    "Trip";

  return (
    <article className="w-full shrink-0 snap-center px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="accent">
              {moment.type === "photo"
                ? isVideoMoment
                  ? "Video"
                  : "Photo"
                : "Thought"}
            </Badge>
            {isVideoMoment ? (
              <Badge variant="subtle">
                <Film className="mr-1 h-3 w-3" />
                Captured media
              </Badge>
            ) : null}
            {moment.placeName ? (
              <Badge variant="subtle">{moment.placeName}</Badge>
            ) : null}
          </div>
          <div>
            <p className="text-base font-medium text-[var(--ink)]">
              {moment.caption ??
                moment.thoughtText?.slice(0, 96) ??
                "Trip moment"}
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>{tripTimeLabel} time: {times.tripLabel}</p>
              {times.viewerLabel ? <p>Your time: {times.viewerLabel}</p> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canManage && onHide && onDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-10 w-10">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Moment options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onClick={() => onEdit(moment)}>
                    Edit details
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => onHide(moment)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide from viewers
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[#7f1d1d]"
                  onClick={() => onDelete(moment)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete moment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button size="icon" variant="ghost" className="h-10 w-10" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close moment</span>
          </Button>
        </div>
      </div>

      {moment.type === "photo" && moment.imageUrl ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[26px] bg-[var(--paper)]">
            {isVideoMoment ? (
              <video
                className="h-64 w-full bg-black object-cover sm:h-80"
                controls
                playsInline
                preload="metadata"
                src={moment.imageUrl}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={moment.caption ?? moment.placeName ?? "Trip photo"}
                className="h-64 w-full object-cover sm:h-80"
                src={moment.imageUrl}
              />
            )}
          </div>
          {moment.thoughtText ? (
            <div className="rounded-[24px] bg-[var(--paper)] p-4 text-sm leading-7 text-[var(--ink)]">
              {moment.thoughtText}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[26px] bg-[var(--paper)] p-5 text-base leading-7 text-[var(--ink)]">
          {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
        </div>
      )}
    </article>
  );
}

export function MomentBottomSheet({
  trip,
  moments,
  selectedMomentId,
  open,
  canManage = false,
  onClose,
  onSelectMoment,
  onEdit,
  onHide,
  onDelete,
}: MomentBottomSheetProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const selectedIndex = Math.max(
    0,
    moments.findIndex((moment) => moment.id === selectedMomentId),
  );
  const activeMoment = moments[selectedIndex] ?? null;
  const hasMultipleMoments = moments.length > 1;

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || !open || moments.length === 0) {
      return;
    }

    const width = scroller.clientWidth;

    if (!width) {
      return;
    }

    const currentIndex = Math.round(scroller.scrollLeft / width);

    if (currentIndex === selectedIndex) {
      return;
    }

    scroller.scrollTo({
      left: width * selectedIndex,
      behavior: "smooth",
    });
  }, [moments.length, open, selectedIndex]);

  function selectMomentAtIndex(nextIndex: number) {
    const moment = moments[nextIndex];

    if (!moment) {
      return;
    }

    onSelectMoment?.(moment.id);
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 transition duration-300 sm:p-4",
        open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
      )}
    >
      <div className="pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        {activeMoment ? (
          <>
            {hasMultipleMoments ? (
              <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {moments.length} moments in this spot
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Swipe left or right to follow them in chronological order.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    className="h-9 w-9"
                    disabled={selectedIndex === 0}
                    onClick={() => selectMomentAtIndex(selectedIndex - 1)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous moment</span>
                  </Button>
                  <span className="min-w-16 text-center text-sm font-medium text-[var(--ink)]">
                    {selectedIndex + 1} / {moments.length}
                  </span>
                  <Button
                    className="h-9 w-9"
                    disabled={selectedIndex === moments.length - 1}
                    onClick={() => selectMomentAtIndex(selectedIndex + 1)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next moment</span>
                  </Button>
                </div>
              </div>
            ) : null}

            <div
              ref={scrollerRef}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                if (!hasMultipleMoments) {
                  return;
                }

                const target = event.currentTarget;
                const width = target.clientWidth;

                if (!width) {
                  return;
                }

                const nextIndex = Math.max(
                  0,
                  Math.min(
                    moments.length - 1,
                    Math.round(target.scrollLeft / width),
                  ),
                );
                const nextMoment = moments[nextIndex];

                if (
                  nextMoment &&
                  nextMoment.id !== selectedMomentId
                ) {
                  onSelectMoment?.(nextMoment.id);
                }
              }}
            >
              {moments.map((moment) => (
                <MomentSheetSlide
                  key={moment.id}
                  canManage={canManage}
                  moment={moment}
                  onClose={onClose}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHide={onHide}
                  trip={trip}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
