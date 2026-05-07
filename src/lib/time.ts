import { DateTime } from "luxon";

import type { DayFilter, DayOption, Moment, Trip } from "@/types/triptrace";

function parseTimestamp(timestamp: string) {
  return DateTime.fromISO(timestamp, {
    setZone: true,
  });
}

export function getMomentTimestamp(moment: Moment) {
  return moment.takenAt ?? moment.postedAt;
}

export function sortMomentsChronologically(moments: Moment[]) {
  return [...moments].sort((left, right) => {
    return parseTimestamp(getMomentTimestamp(left)).toMillis() -
      parseTimestamp(getMomentTimestamp(right)).toMillis();
  });
}

export function getTripDayKey(timestamp: string, timezone: string) {
  return parseTimestamp(timestamp)
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
  const eventTime = parseTimestamp(getMomentTimestamp(moment));
  const viewerTimezone =
    typeof window === "undefined"
      ? "America/Los_Angeles"
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tripLocal = eventTime.setZone(tripTimezone);
  const viewerLocal = eventTime.setZone(viewerTimezone);
  const tripDay = tripLocal.toISODate();
  const viewerDay = viewerLocal.toISODate();
  const tripSuffix =
    tripDay && viewerDay && tripDay > viewerDay ? "+" : "";
  const viewerSuffix =
    tripDay && viewerDay && viewerDay > tripDay ? "+" : "";

  return {
    tripLabel: `${tripLocal.toFormat("h:mm a")}${tripSuffix}`,
    viewerLabel:
      viewerTimezone === tripTimezone
        ? null
        : `${viewerLocal.toFormat("h:mm a")}${viewerSuffix}`,
    viewerTimezone,
  };
}

export function formatLastUpdated(timestamp: string) {
  const updatedAt = parseTimestamp(timestamp);

  if (!updatedAt.isValid || updatedAt.toMillis() > DateTime.now().toMillis()) {
    return "just now";
  }

  return updatedAt.toRelative({
    style: "short",
  }) ?? "just now";
}

export function getLatestUpdatedAt(trip: Trip, moments: Moment[]) {
  const timestamps = [trip.updatedAt, ...moments.map((moment) => moment.updatedAt)];

  return timestamps.sort((left, right) => {
    return parseTimestamp(right).toMillis() - parseTimestamp(left).toMillis();
  })[0] ?? trip.updatedAt;
}
