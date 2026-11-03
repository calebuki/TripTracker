"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Eye, Images, User } from "lucide-react";
import { toast } from "sonner";

import { TripThemeContext } from "@/components/trip-theme-provider";
import { useConfirmDelete } from "@/components/confirm-action-dialog";
import { TimeOfDayLegend } from "@/components/time-of-day-legend";
import { AddMomentButton } from "@/components/add-moment-button";
import { DaySelector } from "@/components/day-selector";
import { EmptyDayState } from "@/components/empty-day-state";
import { MomentBottomSheet } from "@/components/moment-bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTravelerHomeTarget } from "@/hooks/use-traveler-home-target";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import {
  applyLocationPrivacy,
  hasCoordinates,
  type MomentMarkerGroup,
} from "@/lib/map";
import { getTripRepository } from "@/lib/repositories";
import { getTripThemeStyle } from "@/lib/trip-theme";
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
  uniqueViewerCount?: number | null;
  autoOpenCapture?: boolean;
  onAutoOpenCaptureConsumed?: () => void;
}

export function TripExperience({
  record,
  role,
  isDemoMode,
  onRefresh,
  uniqueViewerCount = null,
  autoOpenCapture = false,
  onAutoOpenCaptureConsumed,
}: TripExperienceProps) {
  const { confirmDelete, confirmationDialog } = useConfirmDelete();
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
  const [offMapMomentsOpen, setOffMapMomentsOpen] = useState(false);
  const offMapListFadeRef = useScrollFade<HTMLUListElement>();
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
      ? "All days"
      : dayFilter.kind === "today"
        ? "Today"
        : dayFilter.kind === "yesterday"
          ? "Yesterday"
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
    if (!(await confirmDelete("Delete this moment?"))) {
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
    setOffMapMomentsOpen(false);
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

  const tripMeta = (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[15px] font-semibold text-[var(--ink-soft)]">
        <span>{dayHeadline}</span>
        <span
          aria-label={`Crumb code ${record.trip.shareCode}`}
          className="rounded-md border-2 border-[var(--ink)] px-1.5 text-sm font-extrabold leading-5 tracking-[0.12em] text-[var(--ink)]"
        >
          {record.trip.shareCode}
        </span>
        {uniqueViewerCount !== null ? (
          <span className="tabular inline-flex items-center gap-1.5">
            <Eye aria-hidden className="h-4 w-4" />
            {uniqueViewerCount} {uniqueViewerCount === 1 ? "viewer" : "viewers"}
          </span>
        ) : null}
        {isDemoMode ? <Badge variant="accent">Demo</Badge> : null}
      </div>
      {postingLockedToActiveTrip ? (
        <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">
          Read-only while {activeOwnerTrip?.title ?? "your current trip"} is running.
        </p>
      ) : null}
    </>
  );

  const backLink = (
    <Button asChild className="shrink-0 bg-[var(--surface)]" size="icon" variant="outline">
      <Link aria-label="Back to Crumbs home" href="/" title="Back to Crumbs home">
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </Link>
    </Button>
  );

  const profileLink =
    role === "owner" ? (
      <Button asChild className="shrink-0 bg-[var(--surface)]" size="icon" variant="outline">
        <Link aria-label="Open profile" href="/profile" title="Open profile">
          <User aria-hidden className="h-5 w-5" />
        </Link>
      </Button>
    ) : null;

  const tripSidebarHeader = (
    <div className="crumbs-trip-header px-6 pb-5 pt-6 sm:px-8">
      <div className="flex items-start gap-3 lg:mx-auto lg:max-w-[34rem]">
        {backLink}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl leading-none text-[var(--ink)] xl:text-5xl">
            {record.trip.title}
          </h1>
          {tripMeta}
          <TimeOfDayLegend className="mt-4" />
        </div>
        {profileLink}
      </div>
    </div>
  );

  return (
    <TripThemeContext value={record.trip.theme}>
      <div
        className="h-[100dvh] overflow-hidden bg-[var(--paper)]"
        data-trip-theme={record.trip.theme}
        style={getTripThemeStyle(record.trip.theme)}
      >
        <div className="h-full w-full">
          <div className="relative h-full w-full overflow-hidden bg-[var(--surface)]">
            <TripMap
              trip={record.trip}
              moments={mapMoments}
              selectedMomentId={activeSelectedMomentId}
              onSelectMoment={selectSpotMoment}
              onMomentGroupsChange={setMarkerGroups}
              heightClassName="h-[100dvh] min-h-[100dvh]"
              className="rounded-none border-0 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[clamp(24rem,34vw,38rem)] lg:rounded-none"
            />

            <div className="pointer-events-none absolute inset-0">
              <div className="pointer-events-auto absolute inset-x-0 top-0 p-3 sm:p-4 lg:hidden">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 sm:gap-3">
                  {backLink}
                  <div className="min-w-0 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 sm:max-w-2xl">
                    <h1 className="font-display text-[1.6rem] leading-none text-[var(--ink)] sm:text-[2.2rem]">
                      {record.trip.title}
                    </h1>
                    {tripMeta}
                  </div>
                  {profileLink ?? <div aria-hidden className="h-11 w-11" />}
                </div>
              </div>

              {filteredMoments.length === 0 ? (
                <div className="pointer-events-auto absolute inset-x-4 top-1/2 -translate-y-1/2 lg:left-[calc(clamp(24rem,34vw,38rem)+1rem)]">
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
                <div className="pointer-events-auto absolute left-3 top-32 z-20 w-[min(92vw,320px)] overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] sm:left-4 sm:top-36 lg:left-[calc(clamp(24rem,34vw,38rem)+1rem)] lg:top-4">
                  <button
                    aria-controls="off-map-moments-list"
                    aria-expanded={offMapMomentsOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--paper-strong)]"
                    onClick={() => setOffMapMomentsOpen((open) => !open)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[var(--ink)]">
                        Not on the map
                      </span>
                      <span className="tabular block text-sm font-medium text-[var(--ink-soft)]">
                        {offMapMoments.length}{" "}
                        {offMapMoments.length === 1 ? "moment" : "moments"} without a
                        location
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={`h-5 w-5 shrink-0 text-[var(--ink)] transition-transform duration-200 ${
                        offMapMomentsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {offMapMomentsOpen ? (
                    <ul
                      className="no-scrollbar scroll-fade max-h-[min(50dvh,24rem)] divide-y-2 divide-[var(--line)] overflow-y-auto border-t-2 border-[var(--line)]"
                      id="off-map-moments-list"
                      ref={offMapListFadeRef}
                    >
                      {offMapMoments.map((moment) => (
                        <li key={moment.id}>
                          <button
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-[var(--paper-strong)]"
                            onClick={() => selectSpotMoment(moment.id)}
                            type="button"
                          >
                            <p className="font-semibold text-[var(--ink)]">
                              {moment.caption ?? moment.thoughtText ?? "Untitled moment"}
                            </p>
                            {moment.type === "thought" && moment.caption ? (
                              <p className="mt-0.5 line-clamp-2 text-sm text-[var(--ink-soft)]">
                                {moment.thoughtText}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="pointer-events-auto absolute inset-x-0 bottom-4 flex justify-center px-3 lg:left-[clamp(24rem,34vw,38rem)] lg:right-0 lg:justify-center">
                <DaySelector
                  options={dayOptions}
                  moments={displayMoments}
                  timezone={record.trip.timezone}
                  value={dayFilter}
                  onChange={setDayFilter}
                />
              </div>

              {filteredMoments.length > 0 ? (
                <Button
                  aria-label="Browse moments in order"
                  className="pointer-events-auto absolute right-3 top-1/2 z-20 h-12 w-12 -translate-y-1/2 bg-[var(--surface)] sm:right-4"
                  onClick={openTimelineMoments}
                  size="icon"
                  title="Browse moments in order"
                  type="button"
                  variant="outline"
                >
                  <Images aria-hidden className="h-5 w-5" />
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
                sidebarEmptyState={
                  <p className="max-w-64 text-center text-lg font-semibold text-[var(--ink-soft)]">
                    Pick a stop on the map to open its photo or note.
                  </p>
                }
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

        {confirmationDialog}
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
    </TripThemeContext>
  );
}
