"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Images, User } from "lucide-react";
import { toast } from "sonner";

import { AddMomentButton } from "@/components/add-moment-button";
import { DaySelector } from "@/components/day-selector";
import { EmptyDayState } from "@/components/empty-day-state";
import { MomentBottomSheet } from "@/components/moment-bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTravelerHomeTarget } from "@/hooks/use-traveler-home-target";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import {
  applyLocationPrivacy,
  hasCoordinates,
  type MomentMarkerGroup,
} from "@/lib/map";
import { getTripRepository } from "@/lib/repositories";
import {
  filterMomentsByDay,
  formatTripDayLabel,
  getDayOptions,
  resolveInitialDayFilter,
} from "@/lib/time";
import type { DayFilter, Moment, RouteRole, TripRecord } from "@/types/crumbs";

type MomentSheetMode = "spot" | "timeline";

const AddMomentDialog = dynamic(
  () =>
    import("@/components/add-moment-dialog").then(
      (module) => module.AddMomentDialog,
    ),
  { ssr: false },
);

const EditMomentDetailsDialog = dynamic(
  () =>
    import("@/components/edit-moment-details-dialog").then(
      (module) => module.EditMomentDetailsDialog,
    ),
  { ssr: false },
);

const TripMap = dynamic(
  () => import("@/components/trip-map").then((module) => module.TripMap),
  {
    loading: () => <TripMapFallback />,
    ssr: false,
  },
);

function TripMapFallback() {
  return (
    <div
      aria-hidden
      className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#dfe7ef]"
    />
  );
}

interface TripExperienceProps {
  record: TripRecord;
  role: RouteRole;
  isDemoMode: boolean;
  onRefresh: () => Promise<void> | void;
  autoOpenCapture?: boolean;
  onAutoOpenCaptureConsumed?: () => void;
}

export function TripExperience({
  record,
  role,
  isDemoMode,
  onRefresh,
  autoOpenCapture = false,
  onAutoOpenCaptureConsumed,
}: TripExperienceProps) {
  const { user, loading: authLoading, isDemoMode: authIsDemoMode } =
    useCrumbsAuth();
  const travelerHome = useTravelerHomeTarget({
    user,
    authLoading,
    isDemoMode: authIsDemoMode,
  });
  const shouldAutoOpenCapture =
    autoOpenCapture &&
    role === "owner" &&
    !record.trip.endDate;
  const visibleMoments = useMemo(
    () => record.moments.filter((moment) => moment.visibility === "visible"),
    [record.moments],
  );
  const displayMoments = useMemo(
    () =>
      role === "viewer"
        ? applyLocationPrivacy(
            record.trip,
            visibleMoments,
            record.trip.locationPrivacyMode,
          )
        : visibleMoments,
    [record.trip, role, visibleMoments],
  );
  const [dayFilter, setDayFilter] = useState<DayFilter>(() =>
    resolveInitialDayFilter(record.trip, displayMoments),
  );
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [momentSheetMode, setMomentSheetMode] =
    useState<MomentSheetMode>("spot");
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(shouldAutoOpenCapture);
  const [cameraFirstCapture, setCameraFirstCapture] =
    useState(shouldAutoOpenCapture);
  const [markerGroups, setMarkerGroups] = useState<MomentMarkerGroup[]>([]);
  const filteredMoments = useMemo(
    () => filterMomentsByDay(displayMoments, record.trip.timezone, dayFilter),
    [dayFilter, displayMoments, record.trip.timezone],
  );
  const mapMoments = useMemo(
    () => filteredMoments.filter(hasCoordinates),
    [filteredMoments],
  );
  const offMapMoments = useMemo(
    () => filteredMoments.filter((moment) => !hasCoordinates(moment)),
    [filteredMoments],
  );
  const activeSelectedMomentId =
    selectedMomentId &&
    filteredMoments.some((moment) => moment.id === selectedMomentId)
      ? selectedMomentId
      : null;
  const selectedMoment =
    filteredMoments.find((moment) => moment.id === activeSelectedMomentId) ?? null;
  const selectedMomentGroup =
    activeSelectedMomentId && momentSheetMode === "spot"
      ? markerGroups.find((group) =>
          group.momentIds.includes(activeSelectedMomentId),
        ) ?? null
      : null;
  const selectedSheetMoments = activeSelectedMomentId
    ? momentSheetMode === "timeline"
      ? filteredMoments
      : selectedMomentGroup?.moments ?? (selectedMoment ? [selectedMoment] : [])
    : [];
  const editingMoment =
    record.moments.find((moment) => moment.id === editingMomentId) ?? null;
  const dayOptions = getDayOptions(record.trip, displayMoments);
  const activeOwnerTrip =
    role === "owner" && travelerHome.status === "active"
      ? travelerHome.trip
      : null;
  const postingLockedToActiveTrip =
    role === "owner" &&
    Boolean(record.trip.endDate) &&
    Boolean(activeOwnerTrip && activeOwnerTrip.id !== record.trip.id);
  const canAddMoments =
    role === "owner" &&
    (!record.trip.endDate ||
      (!travelerHome.loading && !postingLockedToActiveTrip));

  useEffect(() => {
    if (!shouldAutoOpenCapture) {
      return;
    }

    onAutoOpenCaptureConsumed?.();
  }, [onAutoOpenCaptureConsumed, shouldAutoOpenCapture]);

  const dayHeadline =
    dayFilter.kind === "all"
      ? "All recorded days"
      : dayFilter.kind === "today"
        ? "Today's trail"
        : dayFilter.kind === "yesterday"
          ? "Yesterday's trail"
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
        error instanceof Error ? error.message : "Crumbs could not hide this moment.",
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
        error instanceof Error ? error.message : "Crumbs could not delete this moment.",
      );
    }
  }

  function selectSpotMoment(momentId: string) {
    setMomentSheetMode("spot");
    setSelectedMomentId(momentId);
  }

  function openTimelineMoments() {
    const nextMoment = filteredMoments[0];

    if (!nextMoment) {
      return;
    }

    setMomentSheetMode("timeline");
    setSelectedMomentId(nextMoment.id);
  }

  function openAddMomentDialog() {
    setCameraFirstCapture(false);
    setAddMomentOpen(true);
  }

  function updateAddMomentOpen(open: boolean) {
    setAddMomentOpen(open);

    if (!open) {
      setCameraFirstCapture(false);
    }
  }

  const tripSidebarHeader = (
    <div className="border-b border-black/5 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <Link
          aria-label="Back to Crumbs home"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--paper)] text-[var(--ink)] transition hover:bg-[#f6efdf]"
          href="/"
          title="Back to Crumbs home"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 font-serif text-3xl leading-tight tracking-tight text-[var(--ink)]">
              {record.trip.title}
            </h1>
            {isDemoMode ? <Badge variant="accent">Demo mode</Badge> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm leading-6 text-slate-600">{dayHeadline}</p>
            <Badge className="font-mono uppercase tracking-[0.12em]" variant="subtle">
              {record.trip.shareCode}
            </Badge>
          </div>
          {postingLockedToActiveTrip ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This past trip is view-only for new moments while {activeOwnerTrip?.title ?? "your active trip"} is running.
            </p>
          ) : null}
        </div>
        {role === "owner" ? (
          <Button asChild className="shrink-0" size="icon" variant="secondary">
            <Link href="/profile">
              <User className="h-4 w-4" />
              <span className="sr-only">Open profile</span>
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-[var(--paper)]">
      <div className="h-full w-full">
        <div className="relative h-full w-full overflow-hidden bg-white">
          <TripMap
            trip={record.trip}
            moments={mapMoments}
            selectedMomentId={activeSelectedMomentId}
            onSelectMoment={selectSpotMoment}
            onMomentGroupsChange={setMarkerGroups}
            heightClassName="h-[100dvh] min-h-[100dvh]"
            className="rounded-none border-0 lg:absolute lg:inset-y-3 lg:right-3 lg:left-[calc(clamp(20rem,29vw,28rem)+1.5rem)] lg:rounded-[24px] lg:border"
          />

          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute inset-x-0 top-0 p-3 sm:p-4 lg:hidden">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 sm:gap-3">
                <Link
                  aria-label="Back to Crumbs home"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/92 text-[var(--ink)] shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm transition hover:bg-white"
                  href="/"
                  title="Back to Crumbs home"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>

                <div className="min-w-0 rounded-[28px] border border-black/5 bg-white/92 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:max-w-2xl">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="min-w-0 font-serif text-[1.45rem] leading-tight tracking-tight text-[var(--ink)] sm:text-[2.2rem]">
                      {record.trip.title}
                    </h1>
                    {isDemoMode ? <Badge variant="accent">Demo mode</Badge> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm leading-6 text-slate-600">
                      {dayHeadline}
                    </p>
                    <Badge
                      className="font-mono uppercase tracking-[0.12em]"
                      variant="subtle"
                    >
                      {record.trip.shareCode}
                    </Badge>
                  </div>
                  {postingLockedToActiveTrip ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This past trip is view-only for new moments while{" "}
                      {activeOwnerTrip?.title ?? "your active trip"} is running.
                    </p>
                  ) : null}
                </div>

                {role === "owner" ? (
                  <Button
                    asChild
                    className="bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm"
                    size="icon"
                    variant="secondary"
                  >
                    <Link href="/profile">
                      <User className="h-4 w-4" />
                      <span className="sr-only">Open profile</span>
                    </Link>
                  </Button>
                ) : (
                  <div aria-hidden className="h-11 w-11" />
                )}
              </div>
            </div>

            {filteredMoments.length === 0 ? (
              <div className="pointer-events-auto absolute inset-x-4 top-1/2 -translate-y-1/2">
                <EmptyDayState
                  label={
                    dayFilter.kind === "all"
                      ? "this trip"
                      : dayFilter.kind === "date" && dayFilter.value
                        ? formatTripDayLabel(dayFilter.value, record.trip.timezone)
                        : dayFilter.kind
                  }
                  canAdd={canAddMoments}
                  onAdd={openAddMomentDialog}
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
                      onClick={() => selectSpotMoment(moment.id)}
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

            {filteredMoments.length > 0 ? (
              <Button
                aria-label="View all moments"
                className="pointer-events-auto absolute right-3 top-1/2 z-20 h-12 w-12 -translate-y-1/2 border border-black/5 bg-white/92 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-sm hover:bg-white sm:right-4"
                onClick={openTimelineMoments}
                size="icon"
                title="View all moments"
                type="button"
                variant="secondary"
              >
                <Images className="h-5 w-5" />
                <span className="sr-only">View all moments</span>
              </Button>
            ) : null}

            {canAddMoments ? (
              <AddMomentButton onClick={openAddMomentDialog} />
            ) : null}

            <MomentBottomSheet
              trip={record.trip}
              moments={selectedSheetMoments}
              navigationMoments={filteredMoments}
              fullscreenMoments={filteredMoments}
              sidebarHeader={tripSidebarHeader}
              selectedMomentId={activeSelectedMomentId}
              open={Boolean(activeSelectedMomentId)}
              canManage={role === "owner"}
              carouselTitle={
                momentSheetMode === "timeline"
                  ? `${selectedSheetMoments.length} moments in this view`
                  : undefined
              }
              onClose={() => setSelectedMomentId(null)}
              onSelectMoment={setSelectedMomentId}
              onEdit={(moment) => setEditingMomentId(moment.id)}
              onHide={hideMoment}
              onDelete={deleteMoment}
            />
          </div>
        </div>
      </div>

      {role === "owner" ? (
        <>
          {canAddMoments && addMomentOpen ? (
            <AddMomentDialog
              trip={record.trip}
              open
              onOpenChange={updateAddMomentOpen}
              onSaved={onRefresh}
              cameraFirst={cameraFirstCapture}
            />
          ) : null}
          {editingMoment ? (
            <EditMomentDetailsDialog
              key={editingMoment.id}
              moment={editingMoment}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setEditingMomentId(null);
                }
              }}
              onSaved={onRefresh}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
