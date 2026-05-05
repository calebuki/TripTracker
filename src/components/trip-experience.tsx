"use client";

import Link from "next/link";
import { useState } from "react";
import { Map, Share2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AddMomentButton } from "@/components/add-moment-button";
import { AddMomentDialog } from "@/components/add-moment-dialog";
import { DaySelector } from "@/components/day-selector";
import { EmptyDayState } from "@/components/empty-day-state";
import { MomentBottomSheet } from "@/components/moment-bottom-sheet";
import { ShareTripDialog } from "@/components/share-trip-dialog";
import { TripMap } from "@/components/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTripRepository } from "@/lib/repositories";
import { applyLocationPrivacy, hasCoordinates } from "@/lib/map";
import {
  filterMomentsByDay,
  formatLastUpdated,
  formatTripDayLabel,
  getDayOptions,
  getLatestUpdatedAt,
  resolveInitialDayFilter,
} from "@/lib/time";
import type { DayFilter, Moment, RouteRole, TripRecord } from "@/types/triptrace";

interface TripExperienceProps {
  record: TripRecord;
  role: RouteRole;
  isDemoMode: boolean;
  onRefresh: () => Promise<void> | void;
}

export function TripExperience({
  record,
  role,
  isDemoMode,
  onRefresh,
}: TripExperienceProps) {
  const [dayFilter, setDayFilter] = useState<DayFilter>(() =>
    resolveInitialDayFilter(record.trip, record.moments),
  );
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [addMomentOpen, setAddMomentOpen] = useState(false);
  const [manualFitCount, setManualFitCount] = useState(0);

  const visibleMoments = record.moments.filter(
    (moment) => moment.visibility === "visible",
  );
  const displayMoments =
    role === "viewer"
      ? applyLocationPrivacy(
          record.trip,
          visibleMoments,
          record.trip.locationPrivacyMode,
        )
      : visibleMoments;
  const filteredMoments = filterMomentsByDay(
    displayMoments,
    record.trip.timezone,
    dayFilter,
  );
  const mapMoments = filteredMoments.filter(hasCoordinates);
  const offMapMoments = filteredMoments.filter((moment) => !hasCoordinates(moment));
  const activeSelectedMomentId = filteredMoments.some(
    (moment) => moment.id === selectedMomentId,
  )
    ? selectedMomentId
    : filteredMoments[0]?.id ?? null;
  const selectedMoment =
    filteredMoments.find((moment) => moment.id === activeSelectedMomentId) ?? null;
  const dayOptions = getDayOptions(record.trip, visibleMoments);
  const latestUpdatedAt = getLatestUpdatedAt(record.trip, visibleMoments);
  const fitKey = `${dayFilter.kind}:${dayFilter.value ?? "none"}:${manualFitCount}`;

  const dayHeadline =
    dayFilter.kind === "all"
      ? "All recorded days"
      : dayFilter.kind === "today"
        ? "Today’s trail"
        : dayFilter.kind === "yesterday"
          ? "Yesterday’s trail"
          : dayFilter.value
            ? formatTripDayLabel(dayFilter.value, record.trip.timezone)
            : "Trip map";

  async function hideMoment(moment: Moment) {
    try {
      await getTripRepository().updateMomentVisibility(moment.id, "hidden");
      toast.success("Moment hidden from viewers.");
      setSelectedMomentId(null);
      await onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "TripTrace could not hide this moment.",
      );
    }
  }

  async function deleteMoment(moment: Moment) {
    if (!window.confirm("Delete this moment permanently?")) {
      return;
    }

    try {
      await getTripRepository().deleteMoment(moment.id);
      toast.success("Moment deleted.");
      setSelectedMomentId(null);
      await onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "TripTrace could not delete this moment.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto max-w-[1480px]">
        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
          <TripMap
            trip={record.trip}
            moments={mapMoments}
            selectedMomentId={activeSelectedMomentId}
            onSelectMoment={setSelectedMomentId}
            fitKey={fitKey}
            className="min-h-[calc(100vh-1.5rem)]"
          />

          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute inset-x-0 top-0 flex flex-col gap-3 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-xl rounded-[28px] border border-black/5 bg-white/92 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-serif text-[1.9rem] tracking-tight text-[var(--ink)] sm:text-[2.2rem]">
                      {record.trip.title}
                    </h1>
                    {isDemoMode ? <Badge variant="accent">Demo mode</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {dayHeadline}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Last updated {formatLastUpdated(latestUpdatedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setManualFitCount((current) => current + 1)}
                    type="button"
                  >
                    <Map className="h-4 w-4" />
                    Fit route
                  </Button>
                  {role === "owner" ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShareOpen(true)}
                        type="button"
                      >
                        <Share2 className="h-4 w-4" />
                        Share trip
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/trips/${record.trip.id}/settings`}>
                          <SlidersHorizontal className="h-4 w-4" />
                          Settings
                        </Link>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {filteredMoments.length === 0 ? (
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
                <EmptyDayState
                  label={
                    dayFilter.kind === "all"
                      ? "this trip"
                      : dayFilter.kind === "date" && dayFilter.value
                        ? formatTripDayLabel(dayFilter.value, record.trip.timezone)
                        : dayFilter.kind
                  }
                  canAdd={role === "owner"}
                  onAdd={() => setAddMomentOpen(true)}
                />
              </div>
            ) : null}

            {offMapMoments.length > 0 ? (
              <div className="pointer-events-auto absolute left-3 top-28 z-20 w-[min(92vw,320px)] rounded-[28px] border border-black/5 bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:left-4 sm:top-32">
                <p className="text-sm font-medium text-[var(--ink)]">
                  Saved off the map
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  These moments do not have coordinates yet.
                </p>
                <div className="mt-3 space-y-2">
                  {offMapMoments.map((moment) => (
                    <button
                      key={moment.id}
                      className="w-full rounded-[22px] bg-[var(--paper)] px-3 py-2 text-left transition hover:bg-[#f6efdf]"
                      onClick={() => setSelectedMomentId(moment.id)}
                      type="button"
                    >
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {moment.caption ?? moment.thoughtText ?? "Untitled moment"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {moment.type === "photo"
                          ? "Saved without a location."
                          : moment.thoughtText}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="pointer-events-auto absolute inset-x-0 bottom-4 flex justify-center px-3">
              <DaySelector
                options={dayOptions}
                value={dayFilter}
                onChange={setDayFilter}
              />
            </div>

            {role === "owner" ? (
              <AddMomentButton onClick={() => setAddMomentOpen(true)} />
            ) : null}

            <MomentBottomSheet
              trip={record.trip}
              moment={selectedMoment}
              open={Boolean(activeSelectedMomentId)}
              canManage={role === "owner"}
              onClose={() => setSelectedMomentId(null)}
              onHide={hideMoment}
              onDelete={deleteMoment}
            />
          </div>
        </div>
      </div>

      {role === "owner" ? (
        <>
          <ShareTripDialog
            trip={record.trip}
            open={shareOpen}
            onOpenChange={setShareOpen}
            onUpdated={() => {
              void onRefresh();
            }}
          />
          <AddMomentDialog
            trip={record.trip}
            open={addMomentOpen}
            onOpenChange={setAddMomentOpen}
            onSaved={onRefresh}
          />
        </>
      ) : null}
    </div>
  );
}
