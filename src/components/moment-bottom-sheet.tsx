"use client";

import { MoreHorizontal, EyeOff, Trash2, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMomentTimes } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Moment, Trip } from "@/types/triptrace";

interface MomentBottomSheetProps {
  trip: Trip;
  moment: Moment | null;
  open: boolean;
  canManage?: boolean;
  onClose: () => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}

export function MomentBottomSheet({
  trip,
  moment,
  open,
  canManage = false,
  onClose,
  onHide,
  onDelete,
}: MomentBottomSheetProps) {
  const times = moment ? formatMomentTimes(moment, trip.timezone) : null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 transition duration-300 sm:p-4",
        open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
      )}
    >
      <div className="pointer-events-auto mx-auto max-w-xl rounded-[30px] border border-black/5 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        {moment ? (
          <div className="relative p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="accent">
                    {moment.type === "photo" ? "Photo" : "Thought"}
                  </Badge>
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
                    <p>Paris time: {times?.tripLabel}</p>
                    {times?.viewerLabel ? (
                      <p>Your time: {times.viewerLabel}</p>
                    ) : null}
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
              <div className="overflow-hidden rounded-[26px] bg-[var(--paper)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={moment.caption ?? moment.placeName ?? "Trip photo"}
                  className="h-64 w-full object-cover sm:h-80"
                  src={moment.imageUrl}
                />
              </div>
            ) : (
              <div className="rounded-[26px] bg-[var(--paper)] p-5 text-base leading-7 text-[var(--ink)]">
                {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
