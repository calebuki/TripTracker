import { DateTime } from "luxon";

import type { DayFilter, DayOption, Moment, Trip } from "@/types/triptrace";

export function getMomentTimestamp(moment: Moment) {
  return moment.takenAt ?? moment.postedAt;
}

export function sortMomentsChronologically(moments: Moment[]) {
  return [...moments].sort((left, right) => {
    return (
      DateTime.fromISO(getMomentTimestamp(left)).toMillis() -
      DateTime.fromISO(getMomentTimestamp(right)).toMillis()
    );
  });
}

export function getTripDayKey(timestamp: string, timezone: string) {
  return DateTime.fromISO(timestamp, { setZone: true })
    .setZone(timezone)
    .toISODate();
}

export function formatTripDayLabel(dayKey: string, timezone: string) {
  return DateTime.fromISO(dayKey, { zone: timezone }).toFormat("cccc, LLL d");
}

export function getTripTodayKey(timezone: string) {
  return DateTime.now().setZone(timezone).toISODate();
}

export function getTripYesterdayKey(timezone: string) {
  return DateTime.now().setZone(timezone).minus({ days: 1 }).toISODate();
}

export function getAvailableTripDays(moments: Moment[], timezone: string) {
  return [...new Set(moments.map((moment) => getTripDayKey(getMomentTimestamp(moment), timezone)))]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left));
}

export function getDayOptions(trip: Trip, moments: Moment[]): DayOption[] {
  const today = getTripTodayKey(trip.timezone) ?? undefined;
  const yesterday = getTripYesterdayKey(trip.timezone) ?? undefined;
  const dates = getAvailableTripDays(moments, trip.timezone);

  return [
    { kind: "today", label: "Today", value: today },
    { kind: "yesterday", label: "Yesterday", value: yesterday },
    { kind: "all", label: "All Days" },
    ...dates.map((value) => ({
      kind: "date" as const,
      label: DateTime.fromISO(value, { zone: trip.timezone }).toFormat(
        "LLL d",
      ),
      value,
    })),
  ];
}

export function resolveInitialDayFilter(trip: Trip, moments: Moment[]): DayFilter {
  const today = getTripTodayKey(trip.timezone);
  const dates = getAvailableTripDays(moments, trip.timezone);

  if (today && dates.includes(today)) {
    return { kind: "today", value: today };
  }

  if (dates[0]) {
    return { kind: "date", value: dates[0] };
  }

  return { kind: "all" };
}

export function filterMomentsByDay(
  moments: Moment[],
  tripTimezone: string,
  dayFilter: DayFilter,
) {
  if (dayFilter.kind === "all") {
    return sortMomentsChronologically(moments);
  }

  const targetDay =
    dayFilter.value ??
    (dayFilter.kind === "today"
      ? getTripTodayKey(tripTimezone)
      : getTripYesterdayKey(tripTimezone));

  if (!targetDay) {
    return [];
  }

  return sortMomentsChronologically(
    moments.filter(
      (moment) => getTripDayKey(getMomentTimestamp(moment), tripTimezone) === targetDay,
    ),
  );
}

export function formatMomentTimes(moment: Moment, tripTimezone: string) {
  const eventTime = DateTime.fromISO(getMomentTimestamp(moment), {
    setZone: true,
  });
  const viewerTimezone =
    typeof window === "undefined"
      ? "America/Los_Angeles"
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tripLocal = eventTime.setZone(tripTimezone);
  const viewerLocal = eventTime.setZone(viewerTimezone);

  return {
    tripLabel: tripLocal.toFormat("ccc, LLL d 'at' h:mm a"),
    viewerLabel:
      viewerTimezone === tripTimezone
        ? null
        : viewerLocal.toFormat("ccc, LLL d 'at' h:mm a"),
    viewerTimezone,
  };
}

export function formatLastUpdated(timestamp: string) {
  return (
    DateTime.fromISO(timestamp, { setZone: true }).toRelative({
      style: "short",
    }) ?? "just now"
  );
}

export function getLatestUpdatedAt(trip: Trip, moments: Moment[]) {
  const latestMoment = sortMomentsChronologically(moments).at(-1);
  return latestMoment?.updatedAt ?? trip.updatedAt;
}
